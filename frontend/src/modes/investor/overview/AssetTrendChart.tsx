import type { AssetTrend } from '../../../api/endpoints/assets'
import styles from '../OverviewPage.module.css'
export default function AssetTrendChart({ data }: { data: AssetTrend }) {
  if (!data.points.length) return <div className={styles.empty} role="status">暂无资产日快照，日终快照生成后展示趋势。</div>
  const points = data.points, values = points.flatMap(p => [Number(p.portfolioReturnRate), Number(p.benchmarkReturnRate)])
  const low = Math.min(0, ...values), high = Math.max(1, ...values), span = high - low || 1
  const first = Date.parse(`${points[0].date}T00:00:00Z`), last = Date.parse(`${points[points.length - 1].date}T00:00:00Z`)
  const x = (date: string) => 56 + (last === first ? 0 : (Date.parse(`${date}T00:00:00Z`) - first) / (last - first)) * 620
  const y = (v: string) => 210 - ((Number(v) - low) / span) * 170
  const line = (key: 'portfolioReturnRate' | 'benchmarkReturnRate') => points.map(p => `${x(p.date)},${y(p[key])}`).join(' ')
  return <>
    <svg className={styles.chart} viewBox="0 0 730 250" role="img" aria-label={`资产变化趋势，共${points.length}条日快照，区间变化${data.summary.portfolioReturnRate}%`}>
      {[0, 0.5, 1].map(t => <g key={t}><line x1="56" x2="676" y1={210 - t * 170} y2={210 - t * 170} className={styles.grid} /><text x="47" y={214 - t * 170} textAnchor="end">{(low + span * t).toFixed(1)}%</text></g>)}
      <polyline points={line('benchmarkReturnRate')} fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="5 5" />
      <polyline points={line('portfolioReturnRate')} fill="none" stroke="var(--accent)" strokeWidth="3" />
      {points.length === 1 && <circle cx={x(points[0].date)} cy={y(points[0].portfolioReturnRate)} r="4" fill="var(--accent)" />}
      <text x="56" y="239">{points[0].date}</text><text x="676" y="239" textAnchor="end">{points[points.length - 1].date}</text>
    </svg>
    <div className={styles.legend}><span>● 我的组合</span><span>┄ 演示比较基准</span></div>
    <div className={styles.summary}><span>区间资产变化 <b>{data.summary.portfolioReturnRate}%</b></span><span>演示基准 <b>{data.summary.benchmarkReturnRate}%</b></span><span>差额 <b>{data.summary.excessReturnRate}%</b></span></div>
    <details className={styles.source}><summary>查看快照数据（{points.length} 条）</summary><div className={styles.tableScroll}><table><thead><tr><th>日期</th><th>总资产（元）</th><th>资产变化</th><th>演示基准</th></tr></thead><tbody>{points.map(p => <tr key={p.date}><td>{p.date}</td><td>{p.totalAsset}</td><td>{p.portfolioReturnRate}%</td><td>{p.benchmarkReturnRate}%</td></tr>)}</tbody></table></div></details>
    {points.length < 2 && <p className={styles.source}>只有一条快照，尚无法计算区间变化。</p>}
  </>
}
