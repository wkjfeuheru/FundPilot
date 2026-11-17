import { ApiError, http, isRecord } from '../http'
export interface RiskProfile {
  userId: number; riskLevel: string; riskLevelLabel: string; accountType: string | null
  horizonYears: number; liquidityNeed: string; liquidityNeedLabel: string
  evaluatedAt: string | null; validUntil: string | null; isEffective: boolean
}
export interface RiskQuestion { id: number; sortNo: number; title: string; options: { index: number; text: string }[] }
export interface Questionnaire { id: number; version: string; title: string; questionCount: number; questions: RiskQuestion[] }
export interface AssessmentInput { questionnaireId: number; answers: { questionId: number; optionIndex: number }[] }
export interface AssessmentResult { id: number; userId: number; questionnaireId: number; totalScore: number; riskLevel: string; riskLevelLabel: string; evaluatedAt: string; validUntil: string }
function invalid(): never { throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '风险测评响应异常，请重试') }
function string(value: unknown): string { return typeof value === 'string' ? value : invalid() }
function number(value: unknown): number { return typeof value === 'number' && Number.isSafeInteger(value) ? value : invalid() }
function nullable(value: unknown): string | null { return value === null ? null : string(value) }
function level(value: unknown): string { const result = string(value); return /^R[1-5]$/.test(result) ? result : invalid() }
export async function getRiskProfile(): Promise<RiskProfile | null> {
  try {
    const d = await http<unknown>('/api/v1/risk-profiles/current')
    if (!isRecord(d) || typeof d.isEffective !== 'boolean') return invalid()
    return { userId: number(d.userId), riskLevel: level(d.riskLevel), riskLevelLabel: string(d.riskLevelLabel), accountType: nullable(d.accountType), horizonYears: number(d.horizonYears), liquidityNeed: string(d.liquidityNeed), liquidityNeedLabel: string(d.liquidityNeedLabel), evaluatedAt: nullable(d.evaluatedAt), validUntil: nullable(d.validUntil), isEffective: d.isEffective }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === 'COMMON_RESOURCE_NOT_FOUND') return null
    throw error
  }
}
export async function getQuestionnaire(): Promise<Questionnaire> {
  const d = await http<unknown>('/api/v1/risk-questionnaires/active')
  if (!isRecord(d) || !Array.isArray(d.questions)) return invalid()
  const questions = d.questions.map((q: unknown): RiskQuestion => {
    if (!isRecord(q) || !Array.isArray(q.options) || !q.options.length) return invalid()
    const options = q.options.map((o: unknown, index: number) => {
      if (!isRecord(o) || o.index !== index) return invalid()
      return { index, text: string(o.text) }
    })
    return { id: number(q.id), sortNo: number(q.sortNo), title: string(q.title), options }
  })
  if (!questions.length || questions.length !== d.questionCount || new Set(questions.map(q => q.id)).size !== questions.length) return invalid()
  return { id: number(d.id), version: string(d.version), title: string(d.title), questionCount: questions.length, questions }
}
export async function submitAssessment(input: AssessmentInput, key: string): Promise<AssessmentResult> {
  const d = await http<unknown>('/api/v1/risk-assessments', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(input) })
  if (!isRecord(d)) return invalid()
  return { id: number(d.id), userId: number(d.userId), questionnaireId: number(d.questionnaireId), totalScore: number(d.totalScore), riskLevel: level(d.riskLevel), riskLevelLabel: string(d.riskLevelLabel), evaluatedAt: string(d.evaluatedAt), validUntil: string(d.validUntil) }
}
