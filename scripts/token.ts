// Prints a Stockroom MCP token for one of the demo accounts, for an MCP client like Claude Code.
//
//   npm run -s token -- tom@larkspur.test
//
import { getDb } from '../server/db.ts'
import { findUser } from '../server/auth.ts'
import { issueMcpToken } from '../server/mcp/tokens.ts'

const email = process.argv[2]
const row = email && (getDb().prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email) as { id: number } | undefined)
if (!row) {
  console.error('Usage: npm run -s token -- <email of a Stockroom user>')
  process.exit(1)
}
console.log(await issueMcpToken(findUser(row.id)!))
