import type { Allocation } from '../../../api/endpoints/assets'
import styles from '../OverviewPage.module.css'
const colors = ['var(--accent)', 'var(--success)', 'var(--warn)', 'var(--danger)']
export default function AssetAllocation({ items }: { items: Allocation[] }) {
  const hasHoldings = items.some(a => Number(a.marketValue) > 0)
  let offset = 0
  return <div className={styles.allocation}>
    <svg viewBox="0 0 200 200" role="img" aria-label={hasHoldings ? items.map(a => `${a.assetClassLabel}${a.weight}%`).join('，') : '暂无持仓配置'}>
      <circle cx="100" cy="100" r="72" fill="none" stroke="var(--line)" strokeWidth="22" />
      {hasHoldings && items.map((a, i) => { const weight = Number(a.weight), start = offset; offset += weight; return <circle key={a.assetClass} cx="100" cy="100" r="72" fill="none" stroke={colors[i]} strokeWidth="22" pathLength="100" strokeDasharray={`${weight} ${100 - weight}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" /> })}
      <text x="100" y="96" textAnchor="middle">基金配置</text><text x="100" y="119" textAnchor="middle" className={styles.donutTotal}>{hasHoldings ? '100%' : '暂无持仓'}</text>
    </svg>
    <ul>{items.map((a, i) => <li key={a.assetClass}><span><i style={{ background: colors[i] }} />{a.assetClassLabel}</span><b>{a.weight}%</b></li>)}</ul>
    <p className={styles.source}>{hasHoldings ? '按基金持仓市值计算，不包含现金。' : '当前为现金账户，成交登记后展示基金配置。'}</p>
  </div>
}
