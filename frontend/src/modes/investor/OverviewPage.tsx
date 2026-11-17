import { useCallback, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import type { ProductOutletContext } from '../../layouts/AppShell'
import { isNavRange, NAV_RANGES, type NavRange } from '../../api/endpoints/funds'
import useAssetOverview from '../../hooks/useAssetOverview'
import { localTimestamp } from '../../utils/fundFormat'
import FundDetailDrawer from './funds/FundDetailDrawer'
import AssetTrendChart from './overview/AssetTrendChart'
import AssetAllocation from './overview/AssetAllocation'
import styles from './OverviewPage.module.css'
export function formatMoney(value: string) { const [whole, fraction] = value.split('.'); return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}` }
export default function OverviewPage() { const id = useAuth(s => s.user?.id); return <OverviewContent key={id} /> }
function OverviewContent() {
  const user = useAuth(s => s.user), shell = useOutletContext<ProductOutletContext>(), navigate = useNavigate()
  const [params, setParams] = useSearchParams(), raw = params.get('range') ?? '1M', range = isNavRange(raw) ? raw : '1M'
  const [navRange, setNavRange] = useState<NavRange>('1M')
  const state = useAssetOverview(range), a = state.overview.status === 'ready' ? state.overview.data : null
  const fundId = Number(params.get('fundId'))
  const close = useCallback(() => setParams(p => { const next = new URLSearchParams(p); next.delete('fundId'); return next }, { replace: true }), [setParams])
  const change = (key: string, value: string) => setParams(p => { const next = new URLSearchParams(p); next.set(key, value); return next }, { replace: true })
  return <div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>MY PORTFOLIO</span><h1>资产总览</h1><p>你好，{user?.displayName ?? '投资者'}。从资产全貌出发，了解每一笔资金的状态。</p></div><button className={styles.button} disabled={state.downloading || !a} onClick={state.download}>{state.downloading ? '正在导出…' : '导出资产报告'}</button></header>
    {state.downloadError && <p role="alert">{state.downloadError} <button className={styles.button} onClick={state.download}>重试导出</button></p>}
    <section className={styles.hero}><div><span className={styles.eyebrow}>PORTFOLIO INSIGHTS</span><h2>让资产配置，更贴近你的目标</h2><p>{a ? `${a.insights.filter(i => i.tagLevel !== 'INFO').length} 项规则提醒待关注。结合风险画像、持仓分布和可用资金，定期检视投资安排。` : '载入账户数据后，查看持仓结构与规则提醒。'}</p><small>规则洞察仅供参考；AI 诊断服务尚未开放。</small></div><div className={styles.actions}><button className={styles.primary} onClick={() => shell.openAi('帮我诊断当前组合')}>查看 AI 组合诊断</button><Link className={styles.button} to="/investor/plan">查看调仓建议</Link></div></section>
    {state.overview.status === 'loading' && <p role="status">正在加载资产总览…</p>}
    {state.overview.status === 'error' && <section className={styles.panel} role="alert"><p>{state.overview.message}</p><button className={styles.button} onClick={state.reload}>重试资产总览</button></section>}
    {a && <section className={styles.metrics} aria-label="资产指标">
      <div className={styles.metric}><span>总资产（元）</span><strong>{formatMoney(a.totalAsset)}</strong><small>持仓 + 现金余额（包含冻结资金）</small><small>可用现金 ¥{formatMoney(a.availableCash)}</small></div>
      <div className={styles.metric}><span>累计收益（元）</span><strong>{formatMoney(a.cumulativePnl)}</strong><small>当前持仓收益率 {a.cumulativePnlRate}%</small></div>
      <div className={styles.metric}><span>近30日资产变化（元）</span><strong>{formatMoney(a.last30dPnl)}</strong><small>快照差额；不足两条时显示0</small></div>
      <div className={styles.metric}><span>组合风险等级</span><strong className={styles.risk}>{a.portfolioRiskLevelLabel}</strong><small>{a.matchesProfile ? '匹配客户画像 · 沿用测评评级' : '暂无有效画像，建议完成测评'}</small><Link to="/investor/profile">查看风险画像 →</Link></div>
    </section>}
    <div className={styles.columns}>
      <section className={styles.panel}><div className={styles.sectionHeader}><h2>资产趋势</h2><div className={styles.ranges} aria-label="趋势区间">{NAV_RANGES.map(r => <button key={r} aria-pressed={range === r} onClick={() => change('range', r)}>{r}</button>)}</div></div>
        {state.trend.status === 'loading' && <p role="status">正在加载资产趋势…</p>}
        {state.trend.status === 'error' && <div role="alert"><p>{state.trend.message}</p><button className={styles.button} onClick={state.reload}>重试资产趋势</button></div>}
        {state.trend.status === 'ready' && <AssetTrendChart data={state.trend.data} />}
        <p className={styles.source}>基于已有日快照，未剔除现金流影响。比较基准为演示配置，非真实市场指数；零基数时变化率显示0。</p>
      </section>
      <section className={styles.panel}><div className={styles.sectionHeader}><h2>资产配置</h2><Link to="/investor/plan">查看配置详情 →</Link></div>{a ? <AssetAllocation items={a.allocation} /> : <p className={styles.source}>配置数据随资产总览加载。</p>}</section>
    </div>
    {a && <>
      <section className={styles.panel}><div className={styles.sectionHeader}><h2>主要持仓</h2><Link to="/investor/holdings">查看全部 →</Link></div>
        {a.topHoldings.length ? <div className={styles.holdings}>{a.topHoldings.map(h => <button key={h.id} className={styles.holding} onClick={() => change('fundId', String(h.fundId))}><span><b>{h.fundName}</b><small>{h.fundCode} · {h.riskLevel} · 净值日 {h.navDate}</small></span><span><b>¥{formatMoney(h.marketValue)}</b><small>占总资产 {h.shareRatio}%</small></span><span><b>{h.pnlRate}%</b><small>持仓收益率 ↗</small></span></button>)}</div> : <div className={styles.empty}>暂无基金持仓。<Link to="/investor/funds">浏览基金超市</Link></div>}
      </section>
      <section aria-label="组合规则洞察"><div className={styles.sectionHeader}><h2>组合规则洞察</h2><button className={styles.textButton} onClick={() => shell.openAi('请结合当前组合规则洞察，说明还需关注哪些风险')}>更多建议 →</button></div><div className={styles.insights}>{a.insights.map((i, index) => <article className={styles.panel} key={`${i.type}-${index}`}><span className={styles.tag} data-level={i.tagLevel}>{i.tag}</span><h3>{i.title}</h3><p>{i.description}</p></article>)}</div></section>
      <p className={styles.source}>净值截至 {a.asOfDate ?? '暂无持仓净值'} · 更新于 {localTimestamp(a.updatedAt)} · <button className={styles.textButton} onClick={state.reload}>刷新数据</button></p>
    </>}
    {Number.isSafeInteger(fundId) && fundId > 0 && <FundDetailDrawer key={fundId} id={fundId} range={navRange} onRange={setNavRange} onClose={close} {...shell} onPurchase={() => navigate(`/investor/funds?fundId=${fundId}&purchase=1`)} />}
  </div>
}
