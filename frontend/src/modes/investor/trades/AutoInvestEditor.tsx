import { createPortal } from 'react-dom'
import Drawer from '../../../components/Drawer'
import type { AutoInvestPlan } from '../../../api/endpoints/autoInvest'
import type { ProductOutletContext } from '../../../layouts/AppShell'
import { useAutoInvestEditor } from '../../../hooks/useAutoInvest'
import styles from '../TransactionsPage.module.css'
interface Props extends Pick<ProductOutletContext, 'backgroundRef'> { plan: AutoInvestPlan | null; onClose: () => void; onSaved: (p: AutoInvestPlan) => void }
export default function AutoInvestEditor({ plan, onClose, onSaved, backgroundRef }: Props) {
  const s = useAutoInvestEditor(plan, onSaved)
  const availableFunds = s.funds.status === 'ready' ? s.funds.data : []
  function update(index: number, field: 'fundId' | 'monthlyAmount', value: string) { s.setRows(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r)) }
  const fundName = (id: number) => s.funds.status === 'ready' ? s.funds.data.find(f => f.id === id)?.name ?? plan?.funds.find(f => f.fundId === id)?.fundName ?? `基金 ${id}` : `基金 ${id}`
  return createPortal(<Drawer title={s.confirmation ? '核对定投计划' : plan ? '调整定投计划' : '创建定投计划'} onClose={() => { if (!s.pending) onClose() }} backgroundRef={backgroundRef}>
    <div className={styles.form}>
      <p className={styles.notice}>每月按指定金额分配至各基金。保存计划不立即扣款；委托与成交以独立登记流程为准。本系统仅供演示。</p>
      {plan?.status === 'PAUSED' && <p className={styles.notice}>当前计划已暂停，本次调整将保留暂停状态。</p>}
      {s.error && <p role="alert">{s.error}</p>}
      {s.confirmation ? <>
        <h3>请确认以下安排</h3><dl className={styles.facts}><div><dt>每月总额</dt><dd>¥{s.confirmation.monthlyAmount}</dd></div><div><dt>执行日</dt><dd>每月 {s.confirmation.executeDay} 日</dd></div>{s.confirmation.funds.map(f => <div key={f.fundId}><dt>{fundName(f.fundId)}</dt><dd>¥{f.monthlyAmount}</dd></div>)}</dl>
        <p>确认后将保存当前计划，未来执行产生的交易仍需 TA 登记确认。</p>
        <button className={styles.primary} disabled={s.pending} onClick={s.save}>{s.pending ? '正在保存…' : '确认保存计划'}</button><button className={styles.button} disabled={s.pending} onClick={s.back}>返回修改</button>
      </> : <>
        <label className={styles.field}>每月定投总额（元）<input inputMode="decimal" value={s.amount} onChange={e => s.setAmount(e.target.value)} /></label>
        <label className={styles.field}>每月执行日<input type="number" min="1" max="28" value={s.day} onChange={e => s.setDay(e.target.value)} /></label>
        {s.funds.status === 'loading' && <p role="status">正在加载基金列表…</p>}
        {s.funds.status === 'error' && <div role="alert"><p>{s.funds.message}</p><button className={styles.button} onClick={s.reload}>重试基金列表</button></div>}
        {s.funds.status === 'ready' && <>
          {!s.funds.data.length && <p role="status">暂无可选基金，请稍后重试。</p>}
          {s.rows.map((r, index) => <fieldset className={styles.planFund} key={index}><legend>基金分配 {index + 1}</legend>
            <label className={styles.field}>基金 {index + 1}<select value={r.fundId} onChange={e => update(index, 'fundId', e.target.value)}><option value="">请选择基金</option>{availableFunds.map(f => <option key={f.id} value={f.id}>{f.name}（{f.fundCode} · {f.riskLevel}）</option>)}{r.fundId && !availableFunds.some(f => String(f.id) === r.fundId) && <option value={r.fundId}>原基金已不可选，请更换</option>}</select></label>
            <label className={styles.field}>基金 {index + 1} 每月金额（元）<input inputMode="decimal" value={r.monthlyAmount} onChange={e => update(index, 'monthlyAmount', e.target.value)} /></label>
            <button className={styles.button} disabled={s.rows.length <= 1} onClick={() => s.setRows(rows => rows.filter((_, i) => i !== index))}>移除基金 {index + 1}</button>
          </fieldset>)}
          <button className={styles.button} disabled={s.rows.length >= 10 || !s.funds.data.length} onClick={() => s.setRows(rows => [...rows, { fundId: '', monthlyAmount: '' }])}>添加基金</button>
          <button className={styles.primary} disabled={!s.funds.data.length} onClick={s.review}>核对定投计划</button>
        </>}
      </>}
    </div>
  </Drawer>, document.body)
}
