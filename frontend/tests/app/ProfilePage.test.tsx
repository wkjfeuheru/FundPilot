import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import InvestorApp from '../../src/app/apps/InvestorApp'
import { sessionUser } from '../authFixtures'
import { setCsrfToken } from '../../src/api/http'
const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, data }))
const profile = { userId: 42, riskLevel: 'R3', riskLevelLabel: 'R3 平衡型', investmentGoal: '', goalCategory: 'NOT_SET', goalCategoryLabel: '未设置', horizonYears: 0, liquidityNeed: 'NOT_SET', liquidityNeedLabel: '未设置', experienceYears: 0, accountType: '', evaluatedAt: '2026-11-16T02:00:00Z', validUntil: '2027-11-16', isEffective: true, latestAssessmentId: 1 }
let assessed: boolean, expired: boolean, failLoad: boolean, failSubmit: boolean
let submitted: { body: string; key: string }[]
beforeEach(() => {
  assessed = false; expired = false; failLoad = false; failSubmit = false; submitted = []; setCsrfToken(null)
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (path.endsWith('/me')) return ok({ ...sessionUser(), riskLevel: assessed ? 'R3' : null, riskLevelLabel: assessed ? 'R3 平衡型' : null, isSecurityVerified: false })
    if (path.endsWith('/csrf')) return ok({ token: 'token', headerName: 'X-CSRF-Token' })
    if (path.endsWith('/risk-profiles/current')) {
      if (failLoad) return new Response(JSON.stringify({ detail: '画像暂不可用' }), { status: 503 })
      return assessed ? ok({ ...profile, isEffective: !expired }) : new Response(JSON.stringify({ code: 'COMMON_RESOURCE_NOT_FOUND' }), { status: 404 })
    }
    if (path.endsWith('/risk-questionnaires/active')) return ok({ id: 5, version: 'demo-v1', title: '演示风险测评问卷', questionCount: 2, questions: [1, 2].map(id => ({ id, sortNo: id, title: `第${id}题`, options: [{ index: 0, text: '稳健选择' }, { index: 1, text: '成长选择' }] })) })
    if (path.endsWith('/risk-assessments')) {
      submitted.push({ body: String(init?.body), key: new Headers(init?.headers).get('Idempotency-Key') ?? '' })
      if (failSubmit) throw new TypeError('网络中断')
      assessed = true
      return ok({ id: 1, userId: 42, questionnaireId: 5, totalScore: 10, riskLevel: 'R3', riskLevelLabel: 'R3 平衡型', evaluatedByUserId: null, evaluatedAt: profile.evaluatedAt, validUntil: profile.validUntil })
    }
    if (path.endsWith('/funds')) return ok({ items: [], total: 0 })
    throw new Error(`Unexpected endpoint ${path}`)
  }))
})
afterEach(() => vi.unstubAllGlobals())
function open() { window.history.replaceState({}, '', '/investor/profile'); render(<InvestorApp />) }
it('shows missing profile and honest readonly account values', async () => {
  open()
  await screen.findByRole('button', { name: '开始风险测评' })
  expect(screen.getByText('未测评')).toBeInTheDocument()
  expect(screen.getAllByText('待完善').length).toBeGreaterThanOrEqual(3)
  expect(screen.getByText('未验证')).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})
it('requires all answers, retries with the same key and refreshes profile and funds', async () => {
  open(); fireEvent.click(await screen.findByRole('button', { name: '开始风险测评' }))
  const submit = await screen.findByRole('button', { name: '提交测评' })
  fireEvent.click(submit)
  expect(await screen.findAllByText('请选择一个选项')).toHaveLength(2)
  expect(submitted).toHaveLength(0)
  screen.getAllByRole('radio', { name: '稳健选择' }).forEach(radio => fireEvent.click(radio))
  failSubmit = true; fireEvent.click(submit)
  await screen.findByRole('alert')
  failSubmit = false; fireEvent.click(screen.getByRole('button', { name: '重试提交' }))
  await screen.findByText('测评已完成')
  expect(submitted).toHaveLength(2)
  expect(submitted[0]).toEqual(submitted[1])
  expect(submitted[0].key).toMatch(/^[A-Za-z0-9_-]{16,64}$/)
  expect(JSON.parse(submitted[0].body)).toEqual({ questionnaireId: 5, answers: [{ questionId: 1, optionIndex: 0 }, { questionId: 2, optionIndex: 0 }] })
  fireEvent.click(screen.getByRole('button', { name: '返回风险画像' }))
  await screen.findByRole('button', { name: '重新风险测评' })
  fireEvent.click(screen.getByRole('link', { name: /基金超市/ }))
  await screen.findByText(/当前风险评级.*R3 平衡型/)
})
it('displays expiry and preserves assessment when cancelling', async () => {
  assessed = true; expired = true; open()
  await screen.findByText(/测评已过期/)
  fireEvent.click(screen.getByRole('button', { name: '重新风险测评' }))
  await screen.findAllByRole('radio', { name: '稳健选择' })
  fireEvent.click(screen.getByRole('button', { name: '取消测评' }))
  expect(await screen.findByText(/测评已过期/)).toBeInTheDocument()
  expect(submitted).toHaveLength(0)
  await waitFor(() => expect(screen.getByRole('button', { name: '重新风险测评' })).toHaveFocus())
})
it('retries profile failure without inventing a risk level', async () => {
  failLoad = true; open()
  await screen.findByText('画像暂不可用')
  failLoad = false; fireEvent.click(screen.getByRole('button', { name: '重新加载画像' }))
  await screen.findByText('未测评')
})
