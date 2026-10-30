export function pounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}
