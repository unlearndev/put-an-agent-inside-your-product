import Anthropic from '@anthropic-ai/sdk'
import { mcpTools, type MCPClientLike } from '@anthropic-ai/sdk/helpers/beta/mcp'
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages'
import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { stockroomMcpServer } from '../mcp/server.ts'
import { systemPrompt } from './prompt.ts'
import { addUsage, emptyUsage, MAX_STEPS, type Usage } from './costs.ts'
import type { User } from '../permissions.ts'

export const MODEL = process.env.ASSISTANT_MODEL ?? 'claude-sonnet-5-5'

export type AssistantEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; id: string; title: string; input: unknown }
  | { type: 'tool_done'; id: string; ok: boolean }
  | { type: 'proposal'; proposal: { id: string; orderNumber: number; customer: string; amount: string; reason: string } }
  | { type: 'usage'; usage: Usage }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; message: string }

// Connects to Stockroom's own MCP server, built for this one user, in this process.
async function connectAs(user: User) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await stockroomMcpServer(user).connect(serverTransport)
  const client = new Client({ name: 'stockroom-assistant', version: '1.0.0' })
  await client.connect(clientTransport)
  return client
}

let anthropic: Anthropic | undefined

// One question: Claude calls the tools it needs, through the SDK's tool runner, until it has an answer.
// Returns the new messages (the question, the tool calls and results, the answer) to add to the conversation,
// and what it used.
export async function runAssistant(
  user: User,
  history: BetaMessageParam[],
  question: string,
  send: (event: AssistantEvent) => void,
): Promise<{ messages: BetaMessageParam[]; usage: Usage }> {
  anthropic ??= new Anthropic()
  const mcp = await connectAs(user)
  try {
    const { tools } = await mcp.listTools()
    const titles = new Map(tools.map((t) => [t.name, t.title ?? t.name]))

    // Each MCP tool becomes a tool Claude can call. We wrap run() to tell the browser when it starts and finishes.
    // (The cast: MCP SDK v2 types structuredContent as unknown, where the helper expects an object.)
    const runnable = mcpTools(tools, mcp as MCPClientLike).map((tool) => ({
      ...tool,
      run: async (input: Record<string, unknown>, context?: { toolUse: { id: string } }) => {
        const id = context?.toolUse.id ?? tool.name
        send({ type: 'tool', id, title: titles.get(tool.name)!, input })
        try {
          const result = await tool.run(input, context as any)
          send({ type: 'tool_done', id, ok: true })
          // A proposed refund shows as a card the person confirms or declines.
          const text = Array.isArray(result) && result[0]?.type === 'text' ? result[0].text : ''
          if (text.startsWith('{"proposal"')) send({ type: 'proposal', proposal: JSON.parse(text).proposal })
          return result
        } catch (error) {
          send({ type: 'tool_done', id, ok: false })
          throw error
        }
      },
    }))

    const runner = anthropic.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: 'low' },
      system: systemPrompt(user),
      tools: runnable,
      messages: [...history, { role: 'user', content: question }],
      thread: false, // the conversation lives in our database, and we send it each time
      cache_control: { type: 'ephemeral' }, // cache everything up to the newest message, so repeats cost less
      max_iterations: MAX_STEPS,
      stream: true,
    })

    let usage = emptyUsage()
    let wrote = false
    for await (const turn of runner) {
      let first = true
      turn.on('text', (text) => {
        if (first && wrote) send({ type: 'text', text: '\n\n' }) // a new paragraph for each turn
        first = false
        wrote = true
        send({ type: 'text', text })
      })
      const reply = await turn.finalMessage()
      usage = addUsage(usage, MODEL, reply.usage)
    }
    const answer = await runner.done()
    if (answer.stop_reason === 'refusal') send({ type: 'text', text: 'Sorry, I can’t help with that one.' })
    if (answer.stop_reason === 'tool_use') {
      // It hit MAX_STEPS and was still calling tools.
      send({ type: 'text', text: `\n\nI stopped after ${MAX_STEPS} steps without an answer. Try asking about fewer orders at once.` })
    }
    send({ type: 'usage', usage })
    // runner.params.messages now holds the whole conversation, ending with the answer.
    return { messages: runner.params.messages.slice(history.length), usage }
  } finally {
    await mcp.close()
  }
}
