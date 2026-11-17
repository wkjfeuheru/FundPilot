import { useMemo, useState } from 'react'
import type { NavPoint } from '../../../api/endpoints/funds'
import styles from '../FundsPage.module.css'
interface NavChartProps { points: NavPoint[]; money: boolean }
export default function NavChart({ points, money }: NavChartProps) {
  const [table, setTable] = useState(false)
  const values = useMemo(() => points.map(p => Number(money ? p.annualized7d : p.unitNav)), [points, money])
  if (!points.length) return <p role="status" className={styles.empty}>当前区间暂无披露数据</p>
  const low = Math.min(...values), high = Math.max(...values), span = high - low || Math.max(high * 0.1, 0.01)
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${42 + i * 510 / Math.max(1, values.length - 1)},${180 - (v - low) / span * 150}`).join(' ')
  return <div className={styles.chart}>
    <svg viewBox="0 0 580 225" role="img" aria-label={`${money ? '七日年化' : '净值走势'}，${points[0].navDate} 至 ${points[points.length - 1].navDate}，${points.length} 个数据点`}>
      <line x1="42" x2="552" y1="180" y2="180" /><line x1="42" x2="552" y1="30" y2="30" />
      <text x="0" y="35">{high.toFixed(2)}</text><text x="0" y="180">{low.toFixed(2)}</text>
      <path d={path} /><text x="42" y="210">{points[0].navDate}</text><text x="552" y="210" textAnchor="end">{points[points.length - 1].navDate}</text>
    </svg>
    <button type="button" className={styles.button} aria-expanded={table} onClick={() => setTable(v => !v)}>{table ? '收起数据表' : '查看数据表'}</button>
    {table && <div className={styles['table-scroll']}><table><caption>历史披露数据</caption><thead><tr><th>日期</th><th>{money ? '七日年化（%）' : '单位净值'}</th><th>{money ? '每万份收益（元）' : '累计净值'}</th></tr></thead><tbody>{points.map(p => <tr key={p.navDate}><td>{p.navDate}</td><td>{money ? p.annualized7d : p.unitNav}</td><td>{money ? p.per10kIncome : p.accumNav}</td></tr>)}</tbody></table></div>}
  </div>
}
