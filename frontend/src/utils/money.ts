/** Money stays in decimal strings; comparisons use integer cents, never IEEE-754 amounts. */
export function normalizeAmount(value: string): string | null {
  if (!/^(?:0|[1-9]\d{0,15})(?:\.\d{0,2})?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}
export function cents(value: string): bigint {
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.')
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
  return negative ? -amount : amount
}
