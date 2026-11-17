import { ApiError, http, isRecord } from '../http'
export interface AutoInvestFund { fundId: number; fundCode: string; fundName: string; monthlyAmount: string }
export interface AutoInvestPlan { id: number; userId: number; monthlyAmount: string; executeDay: number; status: 'ACTIVE' | 'PAUSED'; funds: AutoInvestFund[]; createdAt: string; updatedAt: string }
export interface AutoInvestRequest { monthlyAmount: string; executeDay: number; funds: { fundId: number; monthlyAmount: string }[] }
const amount = (v: unknown): v is string => typeof v === 'string' && /^\d+\.\d{2}$/.test(v)
function plan(v: unknown): v is AutoInvestPlan {
  return isRecord(v) && Number.isSafeInteger(v.id) && Number.isSafeInteger(v.userId) && amount(v.monthlyAmount) && typeof v.executeDay === 'number' && Number.isInteger(v.executeDay) && v.executeDay >= 1 && v.executeDay <= 28 && (v.status === 'ACTIVE' || v.status === 'PAUSED') && typeof v.createdAt === 'string' && typeof v.updatedAt === 'string' && Array.isArray(v.funds) && v.funds.every(f => isRecord(f) && Number.isSafeInteger(f.fundId) && typeof f.fundCode === 'string' && typeof f.fundName === 'string' && amount(f.monthlyAmount))
}
function parse(v: unknown) { if (!plan(v)) throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '定投计划格式异常，请重试'); return v }
export async function getAutoInvest(): Promise<AutoInvestPlan | null> {
  try { return parse(await http<unknown>('/api/v1/auto-invest-plans/current')) }
  catch (error) { if (error instanceof ApiError && error.status === 404 && error.code === 'COMMON_RESOURCE_NOT_FOUND') return null; throw error }
}
export async function saveAutoInvest(body: AutoInvestRequest, key: string) { return parse(await http<unknown>('/api/v1/auto-invest-plans/current', { method: 'PUT', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) })) }
