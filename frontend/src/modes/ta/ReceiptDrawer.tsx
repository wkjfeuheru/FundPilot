import { useState } from 'react'
import type { RefObject } from 'react'
import Drawer from '../../components/Drawer'
import { useReceiptPreview, useTaSubmission } from '../../hooks/useTa'
import styles from './TaPage.module.css'

interface ReceiptDrawerProps {
  orderId: number | null
  count: number
  backgroundRef: RefObject<HTMLDivElement>
  submission: ReturnType<typeof useTaSubmission>
  onClose: () => void
}
const REASONS = [
  ['PURCHASE_SUSPENDED', '暂停申购'], ['PURCHASE_LIMITED', '申购限额'], ['REDEMPTION_SUSPENDED', '暂停赎回'],
  ['REDEMPTION_RESTRICTED', '赎回受限'], ['TRADING_STATUS_ABNORMAL', '交易状态异常'],
]
export default function ReceiptDrawer({ orderId, count, backgroundRef, submission, onClose }: ReceiptDrawerProps) {
  const preview = useReceiptPreview(orderId)
  const [result, setResult] = useState<'SUCCESS' | 'FAILED'>(submission.attempt?.body.result ?? 'SUCCESS')
  const [reason, setReason] = useState(submission.attempt?.body.failReason ?? '')
  const [checked, setChecked] = useState(false)
  const recovery = submission.attempt !== null
  const blocked = submission.pending || (!recovery && result === 'SUCCESS' && orderId !== null && (preview.status !== 'ready' || preview.data === null)) || (result === 'FAILED' && !reason)
  const close = () => { if (!submission.pending) onClose() }
  return <Drawer title={orderId === null ? '批量确认回执' : '登记 TA 回执'} backgroundRef={backgroundRef} onClose={close}>
    {orderId === null ? <p>将对当前演示账户全部待登记交易尝试确认成功（当前 {count} 笔）。每笔独立结算；失败交易会保留待登记状态。提交后现金和持仓将同步更新。</p> : <>
      {preview.status === 'loading' && <p role="status">正在读取申请日净值…</p>}
      {preview.status === 'error' && <div role="alert"><p>{preview.message}</p><button className="btn" onClick={preview.reload}>重试预览</button></div>}
      {preview.status === 'ready' && preview.data && <>
        <h3>{preview.data.order.targetLabel}</h3><p className={styles.muted}>{preview.data.order.orderCode}</p>
        <dl className={styles.details}>
          <dt>净值日期（T 日）</dt><dd>{preview.data.navDate}</dd><dt>确认日期（T+1）</dt><dd>{preview.data.confirmDate}</dd>
          <dt>确认净值</dt><dd>{preview.data.unitNav === '0.0000' ? '按各标的 T 日净值结算' : preview.data.unitNav}</dd>
          <dt>成功确认金额</dt><dd>¥ {preview.data.totalConfirmedAmount}</dd><dt>手续费</dt><dd>¥ {preview.data.totalFee}</dd>
        </dl>
        {preview.data.items.map(item => <div className={styles.item} key={item.fundId}><strong>{item.fundName}</strong><span>确认份额</span><b>{item.confirmedShares}</b></div>)}
      </>}
      <fieldset className={styles.fieldset} disabled={recovery || submission.pending}>
        <legend>回执结果</legend>
        <label><input type="radio" name="receipt-result" checked={result === 'SUCCESS'} onChange={() => setResult('SUCCESS')} />确认成功</label>
        <label><input type="radio" name="receipt-result" checked={result === 'FAILED'} onChange={() => setResult('FAILED')} />确认失败</label>
        {result === 'FAILED' && <label className={styles.reason}>失败原因<select value={reason} onChange={e => setReason(e.target.value)} required><option value="">请选择失败原因</option>{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      </fieldset>
      <p className={styles.muted}>{result === 'FAILED' ? '失败回执将释放该笔冻结资金，现金余额和持仓保持原值。' : '成功回执将结算现金、份额和持仓成本。预览金额由服务端计算，提交时再次校验。'}</p>
    </>}
    {submission.error && <p role="alert" className={styles.error}>{submission.error}</p>}
    {recovery && !submission.pending && <p role="status">本次操作的结果需要核对。重试将沿用原凭证和原始内容，避免重复结算。</p>}
    <button className="btn primary" disabled={blocked} onClick={() => void submission.submit(orderId, { result, ...(result === 'FAILED' ? { failReason: reason } : {}) })}>
      {submission.pending ? '正在提交…' : recovery ? '沿用原凭证重试' : orderId === null ? '确认批量提交' : '确认提交回执'}
    </button>
    {recovery && !submission.pending && <div className={styles.reconcile}>
      <label><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />我已刷新并核对交易状态和最近回执</label>
      <button className="btn" disabled={!checked} onClick={() => { submission.clear(); onClose() }}>核对后结束本次操作</button>
    </div>}
  </Drawer>
}
