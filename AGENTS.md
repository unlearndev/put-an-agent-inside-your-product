# Stockroom

The back office for small online shops. React front end in `src/`, Express API in `server/`, mounted inside Vite's dev server by `server/vite-plugin.ts`. SQLite through `node:sqlite`.

## Commands

- `npm run dev`: the whole app on http://localhost:5173
- `npm test`: Vitest
- `npm run typecheck`: TypeScript
- `npm run seed`: reset the demo database
- `npm run -s token -- <email>`: an MCP token for a demo account
- `npm run evals`: ask the assistant the staff questions and check the answers (uses the API)

## How the code fits together

- Every function in `server/services/` takes the signed-in `User` first and only touches that user's shop. Routes and anything else that reads data go through the services, never straight to SQL.
- Roles and their limits are in `server/permissions.ts`: owners do everything in their shop; support can refund up to £50 an order; warehouse staff can't see customer details or refund.
- The clock is fixed (`server/clock.ts`). Use `now()` and `today()`, never `new Date()`.
- Server files are TypeScript that Node runs directly, so imports end in `.ts` and only erasable syntax is allowed (no enums, no parameter properties).
- Money is whole pence in the database and the services.
- The MCP server (`server/mcp/`) is built for one user per request. Its tools call the services; they never take a shop or a user as an argument.
