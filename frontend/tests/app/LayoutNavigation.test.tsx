import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSessionApi } from '../authFixtures'
beforeEach(() => mockSessionApi())
afterEach(() => vi.unstubAllGlobals())
import InvestorApp from '../../src/app/apps/InvestorApp'
import AdvisorApp from '../../src/app/apps/AdvisorApp'

// 三站点拆分（AD-16）后按站点 App 断言：站点内角色固定、无跨端导航
function renderAt(node: React.ReactElement, path: string) {
  window.history.replaceState({}, '', path)
  return render(node)
}

describe('investor site navigation', async () => {
  it('opens every investor page from the sidebar with a matching heading and active link', async () => {
    renderAt(<InvestorApp />, '/investor/overview')
    const nav = await screen.findByRole('navigation', { name: '我的财富' })
    const labels = ['资产总览', '基金超市', '投顾调仓建议', '我的持仓', '交易记录', 'AI 理财助手', '风险画像与账户']
    expect(within(nav).getAllByRole('link')).toHaveLength(7)
    for (const label of labels) {
      const link = within(nav).getByRole('link', { name: label })
      fireEvent.click(link)
      expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument()
      expect(link).toHaveAttribute('aria-current', 'page')
      expect(within(nav).getAllByRole('link', { current: 'page' })).toHaveLength(1)
    }
  })

  it('does not expose advisor pages in the investor site', async () => {
    renderAt(<InvestorApp />, '/investor/overview')
    await screen.findByRole('heading', { name: '资产总览' })
    expect(screen.queryByRole('link', { name: '客户 360' })).not.toBeInTheDocument()
  })
})

describe('advisor site navigation', async () => {
  it('opens every advisor page from the sidebar with a matching heading and active link', async () => {
    renderAt(<AdvisorApp />, '/advisor/overview')
    const nav = await screen.findByRole('navigation', { name: '投顾业务' })
    const labels = ['工作台总览', '客户 360', '策略库', '组合管理', '风险监控', '投顾报告', 'AI 研究助手', '审批与合规']
    expect(within(nav).getAllByRole('link')).toHaveLength(8)
    for (const label of labels) {
      const link = within(nav).getByRole('link', { name: label })
      fireEvent.click(link)
      expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument()
      expect(link).toHaveAttribute('aria-current', 'page')
    }
    expect(within(nav).queryByRole('link', { name: /TA/ })).not.toBeInTheDocument()
  })

  it('restores a deep link without dropping query context', async () => {
    renderAt(<AdvisorApp />, '/advisor/strategy?tab=config&client=1007')
    expect(await screen.findByRole('heading', { level: 1, name: '策略库' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '策略库' })).toHaveAttribute('aria-current', 'page')
    expect(window.location.search).toBe('?tab=config&client=1007')
  })

  it('keeps the advisor site isolated from the TA route domain', async () => {
    // AD-16 站点隔离：advisor 站点内访问 /ta 不再可达（TA 为独立 5175 站点）
    renderAt(<AdvisorApp />, '/ta')
    expect(await screen.findByRole('heading', { name: '页面不存在' })).toBeInTheDocument()
    expect(document.body).not.toHaveClass('advisor')
  })

  it('shows a recoverable not-found page for an unknown product URL', async () => {
    renderAt(<AdvisorApp />, '/advisor/missing-page')
    expect(await screen.findByRole('heading', { name: '页面不存在' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '返回首页' }))
    expect(await screen.findByRole('heading', { name: '工作台总览' })).toBeInTheDocument()
  })
})
