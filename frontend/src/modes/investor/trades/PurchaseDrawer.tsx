import { createPortal } from 'react-dom'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Drawer from '../../../components/Drawer'
import type { ProductOutletContext } from '../../../layouts/AppShell'
import usePurchase from '../../../hooks/usePurchase'
import styles from '../TransactionsPage.module.css'
interface Props extends Pick<ProductOutletContext, 'backgroundRef'> { fundId: number; onClose: () => void }
export default function PurchaseDrawer({ fundId, backgroundRef, onClose }: Props) {
  const form = usePurchase(fundId)
  const [reviewed, setReviewed] = useState(false)
  const quote = form.current
  const result = form.submission
  return createPortal(<Drawer title="基金申购" backgroundRef={backgroundRef} onClose={onClose}>
    <div className={styles.form}>
      {result.status === 'success' ? <section className={styles.success} role="status">
        <h3>申购已提交，待登记确认</h3><p>{result.order.targetLabel}</p><strong>{result.order.orderCode}</strong>
        <p>本笔已冻结 ¥{result.order.freezeAmount}。现金余额与持仓尚未变动，实际份额以 TA 确认为准。</p>
        <Link className={styles.primary} to={`/investor/transactions?orderId=${result.order.id}`}>查看这笔交易</Link>
      </section> : <>
        <p className={styles.muted}>提交后冻结申购金额，T+1 由 TA 登记确认。此处为演示交易。</p>
        <label className={styles.field}>申购金额（元）<input type="text" inputMode="decimal" autoComplete="off" value={form.amount} disabled={form.locked} onChange={e => form.changeAmount(e.target.value)} aria-describedby="purchase-amount-help" /></label>
        <p id="purchase-amount-help" className={styles.muted}>最低 ¥100，最多两位小数。</p>
        {!form.valid && <p role="alert">请输入不少于100元、最多两位小数的有效金额。</p>}
        {form.valid && !quote && form.quote.status !== 'error' && <p role="status">正在试算…</p>}
        {form.quote.status === 'error' && <div role="alert"><p>{form.quote.message}</p><button className={styles.button} onClick={form.retryQuote}>重新试算</button></div>}
        {quote && <>
          <div className={styles.product}><h3>{quote.fundName}</h3><p>{quote.fundCode} · {quote.riskLevel} · {{ OPEN: '开放申购', LIMITED: '限购', SUSPENDED: '暂停申购' }[quote.purchaseStatus] ?? quote.purchaseStatus}</p></div>
          <dl className={styles.facts}>
            <div><dt>参考净值 / 披露日</dt><dd>{quote.unitNav}<small>{quote.navDate}</small></dd></div>
            <div><dt>申购费率</dt><dd>{quote.feeRate}%</dd></div><div><dt>预计手续费（元）</dt><dd>{quote.feeAmount}</dd></div>
            <div><dt>预计份额</dt><dd>{quote.estimatedShares}</dd></div><div><dt>当前可用现金（元）</dt><dd>{quote.availableCash}</dd></div>
          </dl>
          {quote.warnings.length > 0 && <ul className={styles.notice}>{quote.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
          {quote.riskAcknowledgmentRequired && <label className={styles.ack}><input type="checkbox" checked={form.acknowledged} disabled={form.locked} onChange={e => form.setAcknowledged(e.target.checked)} /><span>我已了解该基金风险等级高于我的有效风险评级，仍自愿申购并承担相应风险。</span></label>}
          {form.insufficient && <p role="alert">可用现金不足，请核对待登记冻结金额。</p>}
        </>}
        {(result.status === 'error' || result.status === 'uncertain') && <div role="alert" className={styles.notice}><p>{result.message}</p>{result.status === 'uncertain' && <p>结果尚未确定，请先核对交易记录。重试会沿用同一提交凭证，避免重复冻结。</p>}</div>}
        {result.status === 'uncertain'
          ? <button className={styles.primary} onClick={() => void form.submit()}>用原提交凭证重试</button>
          : <button className={styles.primary} disabled={!form.canSubmit} onClick={() => void form.submit()}>{result.status === 'submitting' ? '正在提交…' : '确认申购并冻结资金'}</button>}
        <Link to="/investor/transactions">查看交易记录与资金账户</Link>
        {result.status === 'uncertain' && <section className={styles.notice}>
          <label className={styles.ack}><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>我已核对交易记录和冻结资金，了解结束本次尝试不会撤销已提交订单；再次提交将创建另一笔委托。</span></label>
          <button className={styles.button} disabled={!reviewed} onClick={() => { form.finishReviewedAttempt(); setReviewed(false) }}>结束已核对的尝试</button>
        </section>}
      </>}
    </div>
  </Drawer>, document.body)
}
