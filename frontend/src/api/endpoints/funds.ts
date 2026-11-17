import { ApiError, http, isRecord } from '../http'
export const FUND_TYPES = ['EQUITY', 'BOND', 'MONEY', 'GOLD'] as const
export type FundType = typeof FUND_TYPES[number]
export const NAV_RANGES = ['1M', '3M', '6M', '1Y'] as const
export type NavRange = typeof NAV_RANGES[number]
export interface FundSummary {
  id: number; fundCode: string; name: string; fundType: FundType; fundTypeLabel: string
  riskLevel: string; riskLevelLabel: string; categoryLabel: string; styleTags: string[]
  company: string; manager: string; fundSize: string; fundSizeAsOfDate: string | null
  latestNav: string; latestNavDate: string; return1y: string; per10kIncome: string | null; annualized7d: string | null
  purchaseStatus: string; purchaseStatusLabel: string; redeemStatus: string; redeemStatusLabel: string
  poolRating: string; poolRatingLabel: string; isFavorite: boolean; isPoolEligible: boolean
}
export interface FundDetail extends FundSummary {
  benchmark: string; inceptionDate: string | null; dataSource: string; dataSyncedAt: string | null
  fees: { purchase: string; redeem: string; manage: string; custodian: string; salesService: string }
  riskMetrics: { annualizedVolatility: string | null; maxDrawdown: string | null; window: string; asOfDate: string }
}
export interface NavPoint { navDate: string; unitNav: string; accumNav: string; per10kIncome: string; annualized7d: string }
export interface NavSeries { fundId: number; fundCode: string; range: string; points: NavPoint[] }
export interface Suitability { riskLevelLabel: string; isEffective: boolean; validUntil: string | null }
const numeric = (v: unknown): v is string => typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && Number.isFinite(Number(v))
const nullableString = (v: unknown) => v === null || typeof v === 'string'
export function isFundType(v: string): v is FundType { return FUND_TYPES.some(t => t === v) }
export function isNavRange(v: string): v is NavRange { return NAV_RANGES.some(r => r === v) }
function invalid(): never { throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '基金数据格式异常，请重试') }
function isSummary(v: unknown): v is FundSummary {
  return isRecord(v) && Number.isSafeInteger(v.id) && typeof v.id === 'number' && v.id > 0 &&
    typeof v.fundType === 'string' && isFundType(v.fundType) &&
    ['fundCode', 'name', 'fundTypeLabel', 'riskLevel', 'riskLevelLabel', 'categoryLabel', 'company', 'manager', 'latestNavDate', 'purchaseStatus', 'purchaseStatusLabel', 'redeemStatus', 'redeemStatusLabel', 'poolRating', 'poolRatingLabel'].every(k => typeof v[k] === 'string') &&
    ['fundSize', 'latestNav', 'return1y'].every(k => numeric(v[k])) &&
    ['per10kIncome', 'annualized7d'].every(k => v[k] === null || numeric(v[k])) &&
    nullableString(v.fundSizeAsOfDate) && typeof v.isFavorite === 'boolean' && typeof v.isPoolEligible === 'boolean' &&
    Array.isArray(v.styleTags) && v.styleTags.every(t => typeof t === 'string')
}
function isDetail(v: unknown): v is FundDetail {
  if (!isRecord(v) || !isSummary(v)) return false
  const data: Record<string, unknown> = v
  return typeof data.benchmark === 'string' && nullableString(data.inceptionDate) && typeof data.dataSource === 'string' && nullableString(data.dataSyncedAt) &&
    isRecord(data.fees) && ['purchase', 'redeem', 'manage', 'custodian', 'salesService'].every(k => isRecord(data.fees) && numeric(data.fees[k])) &&
    isRecord(data.riskMetrics) && (data.riskMetrics.annualizedVolatility === null || numeric(data.riskMetrics.annualizedVolatility)) &&
    (data.riskMetrics.maxDrawdown === null || numeric(data.riskMetrics.maxDrawdown)) && typeof data.riskMetrics.window === 'string' && typeof data.riskMetrics.asOfDate === 'string'
}
function isPoint(v: unknown): v is NavPoint { return isRecord(v) && typeof v.navDate === 'string' && ['unitNav', 'accumNav', 'per10kIncome', 'annualized7d'].every(k => numeric(v[k])) }
export async function listFunds(favorites = false): Promise<FundSummary[]> {
  const value = await http<unknown>(favorites ? '/api/v1/favorites' : '/api/v1/funds')
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isSummary) || value.total !== value.items.length) invalid()
  return value.items
}
export async function getFund(id: number): Promise<FundDetail> {
  const value = await http<unknown>(`/api/v1/funds/${id}`)
  if (!isDetail(value)) invalid()
  return value
}
export async function getFundNavs(id: number, range: NavRange): Promise<NavSeries> {
  const value = await http<unknown>(`/api/v1/funds/${id}/navs?range=${range}`)
  if (!isRecord(value) || value.fundId !== id || typeof value.fundCode !== 'string' || typeof value.range !== 'string' || !Array.isArray(value.points) || !value.points.every(isPoint)) invalid()
  return { fundId: id, fundCode: value.fundCode, range: value.range, points: value.points }
}
export async function updateFavorite(id: number, favorite: boolean) {
  const value = await http<unknown>(`/api/v1/favorites/${id}`, { method: favorite ? 'PUT' : 'DELETE' })
  if (favorite && (!isRecord(value) || value.fundId !== id || value.isFavorite !== true)) invalid()
}
export async function getSuitability(): Promise<Suitability | null> {
  try {
    const value = await http<unknown>('/api/v1/risk-profiles/current')
    if (!isRecord(value) || typeof value.riskLevelLabel !== 'string' || typeof value.isEffective !== 'boolean' || !nullableString(value.validUntil)) invalid()
    return { riskLevelLabel: value.riskLevelLabel, isEffective: value.isEffective, validUntil: typeof value.validUntil === 'string' ? value.validUntil : null }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === 'COMMON_RESOURCE_NOT_FOUND') return null
    throw error
  }
}
