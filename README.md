# Stockroom

The back office for small online shops: orders, stock, customers and refunds. Two shops run on it, Larkspur Ceramics and Hollow Oak Candles, and each shop's staff only ever see their own shop.

It's the demo project for the Unlearn course "Put an Agent Inside Your Product". Every shop, person, email address and order in it is made up.

## Running it

Needs Node 22.18 or later.

```bash
npm install
npm run dev
```

Then open http://localhost:5173 and sign in with one of the demo accounts (the password for all of them is `stockroom`):

| Account | Shop | Role |
|---|---|---|
| tom@larkspur.test | Larkspur Ceramics | Support: orders, customers, refunds up to £50 an order |
| priya@larkspur.test | Larkspur Ceramics | Warehouse: orders and stock, no customer emails, no refunds |
| nadia@larkspur.test | Larkspur Ceramics | Owner: everything in her shop |
| owen@hollowoak.test | Hollow Oak Candles | Owner: everything in his shop |

`npm run dev` serves the whole app: the React front end and the API, which is mounted inside Vite's dev server (`server/vite-plugin.ts`).

## The data

The database is SQLite, in `data/stockroom.db`, created and seeded the first time the app starts. `npm run seed` resets it.

Stockroom's clock is fixed at 09:30 on Monday 16 November 2026 (`server/clock.ts`), so the seeded orders, the tests and the course always agree. Set `STOCKROOM_NOW` to an ISO date to move it.

## Commands

```bash
npm run dev        # the app on http://localhost:5173
npm test           # Vitest, against an in-memory copy of the demo data
npm run typecheck  # TypeScript
npm run seed       # reset data/stockroom.db
```

## The MCP server

Stockroom's MCP server is at `/mcp` (Streamable HTTP), in `server/mcp/`. It needs a token for one of the demo accounts, and every tool runs as that person, in their shop:

```bash
npm run -s token -- tom@larkspur.test
```

To use it from Claude Code, with the app running (Codex and Cursor take the same URL and bearer token in their own MCP settings):

```bash
export STOCKROOM_TOKEN=$(npm run -s token -- tom@larkspur.test)
claude mcp add --transport http stockroom http://localhost:5173/mcp --header "Authorization: Bearer $STOCKROOM_TOKEN"
```
