import { ApiError, httpBlob, http, isRecord } from '../http'
import { FUND_TYPES, type FundType, type NavRange } from './funds'
export interface Allocation { assetClass: FundType; assetClassLabel: string; weight: string; marketValue: string }
export interface Holding {
  id: number; fundId: number; fundCode: string; fundName: string; fundType: FundType; riskLevel: string
  shares: string; costAmount: string; latestNav: string; navDate: string; marketValue: string; pnl: string; pnlRate: string; shareRatio: string
  asOfDate: string; purchaseStatus: string; redeemStatus: string
}
export interface Insight { type: string; title: string; description: string; tag: string; tagLevel: 'INFO' | 'WARNING' | 'DANGER'; sourceRuleCode: string | null }
export interface AssetOverview {
  totalAsset: string; holdingMarketValue: string; cashBalance: string; availableCash: string; cumulativePnl: string; cumulativePnlRate: string; last30dPnl: string
  portfolioRiskLevel: string | null; portfolioRiskLevelLabel: string; matchesProfile: boolean; allocation: Allocation[]; topHoldings: Holding[]; insights: Insight[]; asOfDate: string | null; updatedAt: string
}
export interface TrendPoint { date: string; totalAsset: string; portfolioReturnRate: string; benchmarkReturnRate: string }
export interface AssetTrend { range: string; points: TrendPoint[]; summary: { portfolioReturnRate: string; benchmarkReturnRate: string; excessReturnRate: string } }
const decimal = (v: unknown): v is string => typeof v === 'string' && /^-?\d+\.\d+$/.test(v)
const strings = (v: Record<string, unknown>, keys: string[]) => keys.every(k => typeof v[k] === 'string')
const decimals = (v: Record<string, unknown>, keys: string[]) => keys.every(k => decimal(v[k]))
function allocation(v: unknown): v is Allocation { return isRecord(v) && FUND_TYPES.some(t => t === v.assetClass) && typeof v.assetClassLabel === 'string' && decimals(v, ['weight', 'marketValue']) }
function holding(v: unknown): v is Holding { return isRecord(v) && Number.isSafeInteger(v.id) && Number.isSafeInteger(v.fundId) && FUND_TYPES.some(t => t === v.fundType) && strings(v, ['fundCode', 'fundName', 'riskLevel', 'navDate', 'asOfDate', 'purchaseStatus', 'redeemStatus']) && decimals(v, ['shares', 'costAmount', 'latestNav', 'marketValue', 'pnl', 'pnlRate', 'shareRatio']) }
function insight(v: unknown): v is Insight { return isRecord(v) && strings(v, ['type', 'title', 'description', 'tag']) && ['INFO', 'WARNING', 'DANGER'].some(t => t === v.tagLevel) && (v.sourceRuleCode === null || typeof v.sourceRuleCode === 'string') }
function overview(v: unknown): v is AssetOverview {
  return isRecord(v) && decimals(v, ['totalAsset', 'holdingMarketValue', 'cashBalance', 'availableCash', 'cumulativePnl', 'cumulativePnlRate', 'last30dPnl']) && strings(v, ['portfolioRiskLevelLabel', 'updatedAt']) && (v.portfolioRiskLevel === null || typeof v.portfolioRiskLevel === 'string') && typeof v.matchesProfile === 'boolean' && (v.asOfDate === null || typeof v.asOfDate === 'string') && Array.isArray(v.allocation) && v.allocation.every(allocation) && Array.isArray(v.topHoldings) && v.topHoldings.every(holding) && Array.isArray(v.insights) && v.insights.every(insight)
}
function trend(v: unknown): v is AssetTrend { return isRecord(v) && typeof v.range === 'string' && Array.isArray(v.points) && v.points.every(p => isRecord(p) && typeof p.date === 'string' && decimals(p, ['totalAsset', 'portfolioReturnRate', 'benchmarkReturnRate'])) && isRecord(v.summary) && decimals(v.summary, ['portfolioReturnRate', 'benchmarkReturnRate', 'excessReturnRate']) }
function invalid(): never { throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '资产数据格式异常，请重试') }
export async function getOverview() { const data = await http<unknown>('/api/v1/asset-overviews/current'); return overview(data) ? data : invalid() }
export async function getAssetTrend(range: NavRange) { const data = await http<unknown>(`/api/v1/asset-trends/current?range=${range}`); return trend(data) ? data : invalid() }
export async function getAssetReport() {
  const result = await httpBlob('/api/v1/asset-overviews/current/report')
  if (!result.contentType.startsWith('application/pdf')) throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '报告格式异常，请重试')
  const filename = result.disposition.match(/filename="?(FundPilot-asset-report-\d{8}\.pdf)"?/)?.[1] ?? 'FundPilot-asset-report.pdf'
  return { blob: result.blob, filename }
}
export interface Holdings {
  items: Holding[]
  summary: { marketValue: string; costAmount: string; pnl: string; pnlRate: string; holdingCount: number }
  asOfDate: string | null
}
function isHoldings(v: unknown): v is Holdings {
  return isRecord(v) && Array.isArray(v.items) && v.items.every(holding) && (v.asOfDate === null || typeof v.asOfDate === 'string') &&
    isRecord(v.summary) && decimals(v.summary, ['marketValue', 'costAmount', 'pnl', 'pnlRate']) && Number.isSafeInteger(v.summary.holdingCount)
}
export async function getHoldings(): Promise<Holdings> {
  const data = await http<unknown>('/api/v1/holdings')
  return isHoldings(data) ? data : invalid()
}
