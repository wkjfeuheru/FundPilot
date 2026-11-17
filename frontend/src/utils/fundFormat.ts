export function percentage(value: string | null, signed = false) {
  if (value === null) return '数据不足'
  const number = Number(value)
  return `${signed && number > 0 ? '+' : ''}${number.toFixed(2)}%`
}
export function fundSize(value: string) {
  // Formatting only; no monetary calculations or business decisions use floating point.
  return `${(Number(value) / 100000000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 亿元`
}
export function localTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '未同步'
}
