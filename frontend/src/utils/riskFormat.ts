export function assessmentDate(value: string | null): string {
  if (!value) return '尚未测评'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '日期暂不可用'
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export function businessDate(value: string | null): string { return value ? value.replaceAll('-', '/') : '待完善' }
export const riskConclusions: Record<string, string> = {
  R1: '优先关注本金安全，对投资波动的承受能力较低。',
  R2: '以稳健为主，能够接受较小的资产波动。',
  R3: '接受适度波动，关注风险与收益的平衡。',
  R4: '关注长期成长，能够承受较大的资产波动。',
  R5: '追求长期收益，能够承受较高的投资风险与波动。',
}
