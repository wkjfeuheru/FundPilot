import { Link } from 'react-router-dom'
import useHoldings from '../../hooks/useHoldings'
import usePageTitle from '../../hooks/usePageTitle'
import styles from './HoldingsPage.module.css'

export default function HoldingsPage() {
  usePageTitle('我的持仓')
  const { holdings, reload } = useHoldings()
  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>我的持仓</h1><p>TA 确认后的基金份额与持仓成本 · 返回页面时自动刷新</p></div><button className="btn" onClick={reload}>刷新持仓</button></header>
    {holdings.status === 'loading' && <p role="status">正在读取持仓…</p>}
    {holdings.status === 'error' && <p role="alert">{holdings.message}<button className="btn" onClick={reload}>重试</button></p>}
    {holdings.status === 'ready' && <>
      <section className={styles.metrics} aria-label="持仓汇总"><article><span>持仓市值</span><strong>¥ {holdings.data.summary.marketValue}</strong></article><article><span>持仓成本</span><strong>¥ {holdings.data.summary.costAmount}</strong></article><article><span>持仓收益 / 收益率</span><strong>¥ {holdings.data.summary.pnl} / {holdings.data.summary.pnlRate}%</strong></article></section>
      {holdings.data.items.length === 0 ? <section className={styles.empty}><h2>暂无已确认持仓</h2><p>待 TA 确认的交易请在交易记录中查看。</p><Link className="btn" to="/investor/transactions">查看交易记录</Link></section> :
        <section className={styles.positions} aria-label="基金持仓">{holdings.data.items.map(h => <article className={styles.position} key={h.id}>
          <header><h2>{h.fundName}</h2><span>{h.fundCode} · {h.riskLevel}</span></header>
          <dl><dt>确认份额</dt><dd>{h.shares}</dd><dt>持仓市值</dt><dd>¥ {h.marketValue}</dd><dt>持仓成本</dt><dd>¥ {h.costAmount}</dd><dt>持仓收益</dt><dd>¥ {h.pnl}（{h.pnlRate}%）</dd><dt>占总资产</dt><dd>{h.shareRatio}%</dd><dt>最新净值</dt><dd>{h.latestNav}（{h.navDate}）</dd></dl>
          <Link className="btn" to={`/investor/funds?fundId=${h.fundId}`}>查看基金</Link>
        </article>)}</section>}
      <p className={styles.note}>净值日期：{holdings.data.asOfDate ?? '暂无'} · 市值按各基金最新净值计算，已清仓基金不在此列表中展示。</p>
    </>}
  </div>
}
