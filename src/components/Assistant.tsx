import { useEffect, useRef, useState } from 'react'
import { Markdown } from './Markdown.tsx'
import { roleName, type User } from '../api.ts'

type ToolCall = { id: string; title: string; input: Record<string, unknown>; status: 'running' | 'done' | 'failed' }
type Turn = { question: string; tools: ToolCall[]; answer: string; working: boolean; error?: string }

type Event =
  | { type: 'text'; text: string }
  | { type: 'tool'; id: string; title: string; input: Record<string, unknown> }
  | { type: 'tool_done'; id: string; ok: boolean }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; message: string }

// Reads the server-sent events from POST /api/assistant as they arrive.
async function ask(question: string, conversationId: string | undefined, onEvent: (e: Event) => void) {
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, conversationId }),
  })
  if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? 'The assistant isn’t available.')
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const events = buffer.split('\n\n')
    buffer = events.pop()!
    for (const e of events) if (e.startsWith('data: ')) onEvent(JSON.parse(e.slice(6)))
  }
}

function describe(input: Record<string, unknown>) {
  return Object.entries(input)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => (k === 'amountPence' ? `£${(Number(v) / 100).toFixed(2)}` : String(v)))
    .join(', ')
}

export function Assistant({ user, onClose }: { user: User; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const [conversationId, setConversationId] = useState<string>()
  const working = turns.at(-1)?.working ?? false
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [turns])

  const update = (fn: (turn: Turn) => Turn) => setTurns((all) => [...all.slice(0, -1), fn(all.at(-1)!)])

  const send = async () => {
    const q = question.trim()
    if (!q || working) return
    setQuestion('')
    setTurns((all) => [...all, { question: q, tools: [], answer: '', working: true }])
    try {
      await ask(q, conversationId, (e) => {
        if (e.type === 'text') update((t) => ({ ...t, answer: t.answer + e.text }))
        if (e.type === 'tool') update((t) => ({ ...t, tools: [...t.tools, { id: e.id, title: e.title, input: e.input, status: 'running' }] }))
        if (e.type === 'tool_done') update((t) => ({ ...t, tools: t.tools.map((c) => (c.id === e.id ? { ...c, status: e.ok ? 'done' : 'failed' } : c)) }))
        if (e.type === 'done') setConversationId(e.conversationId)
        if (e.type === 'error') update((t) => ({ ...t, error: e.message }))
      })
    } catch (error) {
      update((t) => ({ ...t, error: (error as Error).message }))
    }
    update((t) => ({ ...t, working: false }))
  }

  return (
    <aside className="assistant">
      <header>
        <strong>
          Assistant
          <span className="as">{user.name}, {roleName[user.role]}</span>
        </strong>
        <div>
          <button className="link" onClick={() => { setTurns([]); setConversationId(undefined) }} disabled={working}>New chat</button>
          <button className="close" onClick={onClose} aria-label="Close the assistant">×</button>
        </div>
      </header>
      <div className="assistant-thread">
        {turns.length === 0 && <p className="muted hint">Ask about your shop’s orders, stock and customers.</p>}
        {turns.map((t, i) => (
          <div key={i} className="turn">
            <div className="question">{t.question}</div>
            {t.tools.length > 0 && (
              <ul className="tool-calls">
                {t.tools.map((c) => (
                  <li key={c.id} className={`tool-call ${c.status}`}>
                    <span className="tool-icon">{c.status === 'running' ? '…' : c.status === 'done' ? '✓' : '!'}</span>
                    {c.title}
                    {describe(c.input) && <span className="tool-input">{describe(c.input)}</span>}
                  </li>
                ))}
              </ul>
            )}
            {t.answer && <div className="answer"><Markdown text={t.answer} /></div>}
            {t.working && !t.answer && <div className="working">Working</div>}
            {t.error && <p className="error">{t.error}</p>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          value={question}
          placeholder="Ask the assistant"
          rows={2}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="primary" disabled={working || !question.trim()}>Send</button>
      </form>
    </aside>
  )
}
