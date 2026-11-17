import { useState } from 'react'
import type { ProductOutletContext } from '../../../layouts/AppShell'
import { useAutoInvest } from '../../../hooks/useAutoInvest'
import AutoInvestEditor from './AutoInvestEditor'
import styles from '../TransactionsPage.module.css'
export default function AutoInvestPanel({ backgroundRef }: Pick<ProductOutletContext, 'backgroundRef'>) {
  const s = useAutoInvest(), [editing, setEditing] = useState(false)
  const plan = s.saved ?? (s.remote.status === 'ready' ? s.remote.data : null)
  return <section className={styles.panel} aria-label="我的定投计划"><div className={styles.header}><div><h2>我的定投计划</h2><p>按月积累，让投资成为习惯。</p></div>{(s.remote.status === 'ready' || s.saved) && <button className={styles.button} onClick={() => setEditing(true)}>{plan ? '调整定投计划' : '创建定投计划'}</button>}</div>
    {s.saved && <p role="status" className={styles.success}>定投计划已保存</p>}
    {s.remote.status === 'loading' && !s.saved && <p role="status">正在加载定投计划…</p>}
    {s.remote.status === 'error' && !s.saved && <div role="alert"><p>{s.remote.message}</p><button className={styles.button} onClick={s.reload}>重试定投计划</button></div>}
    {plan ? <><div className={styles.planSummary}><strong>¥{plan.monthlyAmount}<small> / 月</small></strong><span>每月 {plan.executeDay} 日</span><span className={styles.badge}>{plan.status === 'ACTIVE' ? '计划启用' : '计划暂停'}</span></div><div className={styles.planFunds}>{plan.funds.map(f => <div key={f.fundId}><span>{f.fundName}<small>{f.fundCode}</small></span><b>¥{f.monthlyAmount} / 月</b></div>)}</div></> : s.remote.status === 'ready' && <p className={styles.empty}>尚未设置定投计划，可选择基金并安排每月金额。</p>}
    <p className={styles.notice}>定投为演示计划，保存不会立即扣款。未来委托与结果请在交易记录中核对。</p>
    {editing && <AutoInvestEditor plan={plan} backgroundRef={backgroundRef} onClose={() => setEditing(false)} onSaved={p => { s.accept(p); setEditing(false) }} />}
  </section>
}
