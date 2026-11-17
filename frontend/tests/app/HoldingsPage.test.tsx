import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import HoldingsPage from '../../src/modes/investor/HoldingsPage'
afterEach(() => vi.unstubAllGlobals())
it('reads confirmed positions and refreshes after returning from the TA site', async () => {
  let confirmed = false
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 0, data: {
    items: confirmed ? [{ id: 1, fundId: 1, fundCode: '000311', fundName: '测试基金', fundType: 'EQUITY', riskLevel: 'R4', shares: '399.5200', costAmount: '998.80', latestNav: '2.5000', navDate: '2026-11-13', marketValue: '998.80', pnl: '0.00', pnlRate: '0.00', shareRatio: '2.00', asOfDate: '2026-11-13', purchaseStatus: 'OPEN', redeemStatus: 'OPEN' }] : [],
    summary: { marketValue: confirmed ? '998.80' : '0.00', costAmount: confirmed ? '998.80' : '0.00', pnl: '0.00', pnlRate: '0.00', holdingCount: confirmed ? 1 : 0 }, asOfDate: '2026-11-13',
  } }))))
  render(<MemoryRouter><HoldingsPage /></MemoryRouter>)
  await screen.findByText('暂无已确认持仓')
  confirmed = true; fireEvent.focus(window)
  expect(await screen.findByText('399.5200')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '查看基金' })).toHaveAttribute('href', '/investor/funds?fundId=1')
})
