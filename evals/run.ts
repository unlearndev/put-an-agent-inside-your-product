// Asks the assistant every question in evals/questions.ts, as the right person, and checks each answer.
// Each question gets a fresh copy of the demo data, and nothing touches data/stockroom.db.
//
//   npm run evals
//
import { openDb, setDb } from '../server/db.ts'
import { seed } from '../server/seed.ts'
import { findUser } from '../server/auth.ts'
import { runAssistant, MODEL, type AssistantEvent } from '../server/assistant/run.ts'
import { QUESTIONS } from './questions.ts'

let passed = 0
let cost = 0
console.log(`Asking ${QUESTIONS.length} questions with ${MODEL}\n`)

for (const q of QUESTIONS) {
  const db = openDb(':memory:')
  seed(db)
  setDb(db)
  const id = (db.prepare('SELECT id FROM users WHERE email = ?').get(q.as) as { id: number }).id
  const user = findUser(id)!

  let answer = ''
  const tools: string[] = []
  const { messages, usage } = await runAssistant(user, [], q.question, (e: AssistantEvent) => {
    if (e.type === 'text') answer += e.text
    if (e.type === 'tool') tools.push(`${e.title} ${JSON.stringify(e.input)}`)
  })
  cost += usage.costUsd

  const result = q.check(answer, db)
  if (result.pass) passed++
  console.log(`${result.pass ? '✓' : '✗'} ${q.question}  (${user.name})`)
  if (!result.pass) {
    console.log(`    ${result.why}`)
    console.log(`    tools: ${tools.join('; ') || 'none'}`)
    // What each tool sent back, shortened, so you can see what the model was working from.
    for (const m of messages) {
      if (m.role !== 'user' || typeof m.content === 'string') continue
      for (const block of m.content) {
        if (block.type !== 'tool_result') continue
        const text = Array.isArray(block.content) ? block.content.map((c) => ('text' in c ? c.text : '')).join('') : String(block.content)
        let shown = text.slice(0, 160)
        try {
          const json = JSON.parse(text)
          if (Array.isArray(json)) shown = `${json.length} results`
        } catch {}
        console.log(`    result: ${shown}`)
      }
    }
    console.log(`    answer: ${answer.replace(/\s+/g, ' ').slice(0, 240)}`)
  }
}

console.log(`\n${passed} of ${QUESTIONS.length} passed · $${cost.toFixed(3)}`)
process.exit(passed === QUESTIONS.length ? 0 : 1)
