import type { FundSummary } from '../../../api/endpoints/funds'
import { percentage } from '../../../utils/fundFormat'
import styles from '../FundsPage.module.css'
interface FundCardProps { fund: FundSummary; pending: boolean; onOpen: () => void; onFavorite: () => void; onPurchase: () => void }
export default function FundCard({ fund, pending, onOpen, onFavorite, onPurchase }: FundCardProps) {
  const money = fund.fundType === 'MONEY'
  const performance = money ? fund.annualized7d : fund.return1y
  return <article className={styles.card} aria-label={fund.name}>
    <div className={styles.tags}><span className={styles[`type-${fund.fundType.toLowerCase()}`]}>{fund.fundTypeLabel}</span><span>{fund.riskLevelLabel}</span></div>
    <h2><button type="button" className={styles['name-button']} onClick={onOpen}>{fund.name}</button></h2>
    <p className={styles.secondary}>{fund.fundCode} · {fund.categoryLabel}</p>
    <div className={styles.performance}><strong className={performance === null ? styles.secondary : Number(performance) < 0 ? styles.negative : styles.positive}>{performance === null ? '暂无披露' : percentage(performance, !money)}</strong><span>{money ? '七日年化' : '近一年收益'}</span></div>
    <dl className={styles['card-facts']}><div><dt>{money ? '每万份收益' : '单位净值'}</dt><dd>{money ? fund.per10kIncome === null ? '暂无披露' : `${fund.per10kIncome} 元` : fund.latestNav}</dd></div><div><dt>净值日期</dt><dd>{fund.latestNavDate}</dd></div></dl>
    <div className={styles['card-bottom']}><span>{fund.purchaseStatusLabel}</span><div className={styles.actions}>
      <button type="button" className={styles.button} aria-label={`${fund.isFavorite ? '取消自选' : '自选'} ${fund.name}`} aria-pressed={fund.isFavorite} disabled={pending} onClick={onFavorite}>{pending ? '保存中…' : fund.isFavorite ? '✓ 已自选' : '+ 自选'}</button>
      <button type="button" className={styles.primary} aria-label={`申购 ${fund.name}`} onClick={onPurchase}>申购</button>
    </div></div>
  </article>
}
