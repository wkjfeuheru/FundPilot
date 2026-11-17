import { useLayoutEffect } from 'react'
import type { ReactNode } from 'react'
import type { ShellMode } from './pages'
import useProductTheme from '../hooks/useProductTheme'
import '../styles/auth.css'

/** 双端左侧品牌区文案（自原型 auth.js ROLE_COPY 提取，站点内角色固定，AD-16） */
const ROLE_COPY: Record<ShellMode, {
  title: string
  desc: string
  points: [string, string][]
  previewTitle: string
  previewFoot: string
  stats: [string, string][]
}> = {
  investor: {
    title: '让每一笔投资，都有清晰的依据',
    desc: '从资产总览到智能配置，AI 解释每一个配置理由，所有建议由你自主确认。',
    points: [
      ['组合诊断与配置解释', '结合风险画像与持仓，用自然语言说明专业概念。'],
      ['适当性前置校验', '产品风险等级与你的测评结果匹配后才给出建议。'],
      ['自主决策、不自动交易', '所有调仓与申购均为模拟草案，需你主动确认。'],
    ],
    previewTitle: 'AI 组合健康检查 · 本周',
    previewFoot: '✓ 风险模型扫描完成 · 数据为模拟演示',
    stats: [['总资产', '¥1,286,420'], ['组合风险', 'R3 平衡型'], ['待确认', '1 项']],
  },
  advisor: {
    title: '让投顾决策更快、更有依据',
    desc: '客户 360、策略优化与报告起草集中在同一工作台，AI 只生成草案，审批权仍在人。',
    points: [
      ['客户 360 与 AI 简报', '聚合画像、持仓与风险限制，优先呈现待复核事项。'],
      ['量化策略与再平衡', '场景优化结果附约束检查摘要，可追溯、可复现。'],
      ['合规审批链路', 'AI 草案 → 规则校验 → 人工复核 → 合规审批 → 留痕。'],
    ],
    previewTitle: 'AI 今日扫描 · 客户工作台',
    previewFoot: '✓ 286 位客户扫描完成 · 数据为模拟演示',
    stats: [['在管客户', '286 人'], ['待复核风险', '4 项'], ['待审方案', '7 份']],
  },
}

interface AuthShellProps { mode: ShellMode; children: ReactNode }

/**
 * 登录/注册共享壳（原型 auth-shell 结构）：挂载 auth-body/advisor 主题类，
 * 左侧品牌视觉区由 mode 驱动文案，右侧为表单区 children。
 */
export default function AuthShell({ mode, children }: AuthShellProps) {
  useProductTheme(mode)
  useLayoutEffect(() => {
    document.body.classList.add('auth-body')
    return () => { document.body.classList.remove('auth-body') }
  }, [])
  const copy = ROLE_COPY[mode]

  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <div className="auth-brand">
          <div className="brand-logo">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M7 16l5-5 4 2 5-7"/></svg>
          </div>
          <div><strong>FundPilot</strong><small>INTELLIGENT WEALTH</small></div>
        </div>

        <div className="auth-hero">
          <div className="auth-kicker">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/></svg>
            AI WEALTH COPILOT
          </div>
          <h2>{copy.title}</h2>
          <p>{copy.desc}</p>
        </div>

        <div className="auth-points">
          {copy.points.map(([title, desc]) => (
            <div className="auth-point" key={title}>
              <div className="auth-point-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M12 3a9 9 0 0 1 9 9h-9z"/></svg>
              </div>
              <div><b>{title}</b><span>{desc}</span></div>
            </div>
          ))}
        </div>

        <div className="auth-preview">
          <div className="auth-preview-head"><b>{copy.previewTitle}</b><span>SIMULATED DATA</span></div>
          <div className="auth-preview-grid">
            {copy.stats.map(([label, value]) => (
              <div key={label}><label>{label}</label><strong>{value}</strong></div>
            ))}
          </div>
          <div className="auth-preview-foot">{copy.previewFoot}</div>
        </div>
      </aside>

      <section className="auth-form-wrap">{children}</section>
    </div>
  )
}
