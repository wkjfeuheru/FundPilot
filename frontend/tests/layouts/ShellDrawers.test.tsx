import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSessionApi } from '../authFixtures'
beforeEach(() => mockSessionApi())
afterEach(() => vi.unstubAllGlobals())
import InvestorApp from '../../src/app/apps/InvestorApp'
import AdvisorApp from '../../src/app/apps/AdvisorApp'

describe('shell drawers', async () => {
  it('opens notifications, closes with Escape, and restores the trigger focus and scroll', async () => {
    window.history.replaceState({}, '', '/investor/overview')
    render(<InvestorApp />)
    const trigger = await screen.findByRole('button', { name: '打开通知' })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: '通知中心' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('button', { name: '关闭抽屉' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('lets both AI entry points open the same drawer and close via button or backdrop', async () => {
    window.history.replaceState({}, '', '/advisor/overview')
    render(<AdvisorApp />)
    fireEvent.click(await screen.findByRole('button', { name: '开启 AI 对话' }))
    expect(screen.getByRole('dialog', { name: 'AI 研究助手' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭抽屉' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '打开 AI 对话' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '关闭抽屉遮罩' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
