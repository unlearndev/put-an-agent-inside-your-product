// Stockroom's clock is fixed so the seeded data, the tests and the lessons always agree.
// Set STOCKROOM_NOW (an ISO date) to move it.
export function now(): Date {
  return new Date(process.env.STOCKROOM_NOW ?? '2026-11-16T09:30:00Z')
}

export function today(): string {
  return now().toISOString().slice(0, 10)
}
