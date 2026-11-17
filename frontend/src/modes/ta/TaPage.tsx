import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import usePageTitle from '../../hooks/usePageTitle'
import { useTa, useTaSubmission } from '../../hooks/useTa'
import type { BatchResult } from '../../api/endpoints/ta'
import { localTimestamp } from '../../utils/fundFormat'
import ReceiptDrawer from './ReceiptDrawer'
import styles from './TaPage.module.css'

export default function TaPage() {
  usePageTitle('TA 回执模拟台')
  const backgroundRef = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Math.min(100000, Math.floor(Number(params.get('page')) || 1)))
  const receiptPage = Math.max(1, Math.min(100000, Math.floor(Number(params.get('receipts')) || 1)))
  const data = useTa(page, receiptPage)
  const [modal, setModal] = useState<{ orderId: number | null } | null>(null)
  const [notice, setNotice] = useState('')
  const [batch, setBatch] = useState<BatchResult | null>(null)
  const submission = useTaSubmission(result => {
    setModal(null); setBatch(result); setNotice(result ? `批量处理完成：${result.total} 笔，成功 ${result.succeeded} 笔，失败 ${result.failed.length} 笔` : '回执已提交'); data.reload()
  })
  function changePage(key: string, next: number) { const p = new URLSearchParams(params); p.set(key, String(next)); setParams(p) }
  const count = data.summary.status === 'ready' ? data.summary.data.pendingCount : 0
  return <>
    <div ref={backgroundRef} className={styles.page}>
      <header className={styles.heading}><div><p className={styles.eyebrow}>TRANSFER AGENCY · 演示工具</p><h1>TA 回执模拟台</h1><p className={styles.muted}>登记交易终态，同步现金、持仓与在途状态。</p></div><button className="btn" onClick={data.reload}>刷新数据</button></header>
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {batch && batch.failed.length > 0 && <section className={styles.panel}><h2>未完成的回执</h2><ul>{batch.failed.map(f => <li key={f.orderId}>交易 #{f.orderId}：{f.message}（{f.code}）</li>)}</ul><p>成功交易已结算；请修复失败原因，再处理剩余待登记交易。</p></section>}
      {data.summary.status === 'loading' && <p role="status">正在读取账户状态…</p>}
      {data.summary.status === 'error' && <p role="alert">{data.summary.message}</p>}
      {data.summary.status === 'ready' && <>
        <div className={styles.metrics}>
          <article><span>待登记交易</span><strong>{count}<small> 笔</small></strong></article>
          <article><span>现金余额</span><strong>¥ {data.summary.data.cashBalance}</strong></article>
          <article><span>在途冻结</span><strong>¥ {data.summary.data.frozenAmount}</strong></article>
          <article><span>可用资金</span><strong>¥ {data.summary.data.availableCash}</strong></article>
        </div>
        {submission.attempt && <div className={styles.notice}><p>有一笔操作需要核对结果，凭证已保存在当前标签页。</p><button className="btn" onClick={() => setModal({ orderId: submission.attempt?.orderId ?? null })}>恢复待核对操作</button></div>}
        <section className={styles.panel}>
          <div className={styles['section-head']}><div><h2>待登记队列</h2><p className={styles.muted}>仅展示配置的演示客户 · 按申请时间排序</p></div><button className="btn primary" disabled={count === 0 || submission.attempt !== null} onClick={() => setModal({ orderId: null })}>全部确认成功</button></div>
          {data.orders.status === 'loading' && <p role="status">正在读取交易…</p>}
          {data.orders.status === 'error' && <p role="alert">{data.orders.message}<button className="btn" onClick={data.reload}>重试</button></p>}
          {data.orders.status === 'ready' && <>
            {data.orders.data.content.length === 0 && <p className={styles.empty}>暂无待登记交易</p>}
            <div className={styles.queue}>{data.orders.data.content.map(order => <article key={order.id} className={styles.order}>
              <div><strong>{order.targetLabel}</strong><p>{order.orderCode}</p><span className={styles.muted}>{order.customerName} · {order.tradeTypeLabel} · T 日 {order.tradeDate}</span><p className={styles.muted}>提交于 {localTimestamp(order.createdAt)} · T+1 确认</p></div>
              <dl><dt>买入 / 卖出金额</dt><dd>¥ {order.totalAmountIn} / {order.totalAmountOut}</dd><dt>冻结资金</dt><dd>¥ {order.freezeAmount}</dd></dl>
              <div><span className={styles.badge}>待登记确认</span><button className="btn" aria-label={`提交回执 ${order.orderCode}`} disabled={submission.attempt !== null} onClick={() => setModal({ orderId: order.id })}>提交回执</button></div>
            </article>)}</div>
            {data.orders.data.totalPages > 1 && <nav className={styles.pagination} aria-label="待登记交易分页"><button className="btn" disabled={page <= 1} onClick={() => changePage('page', page - 1)}>上一页</button><span>{page} / {data.orders.data.totalPages}</span><button className="btn" disabled={page >= data.orders.data.totalPages} onClick={() => changePage('page', page + 1)}>下一页</button></nav>}
          </>}
        </section>
        <section className={styles.panel}><h2>最近回执</h2>
          {data.receipts.status === 'loading' && <p role="status">正在读取回执…</p>}
          {data.receipts.status === 'error' && <p role="alert">{data.receipts.message}<button className="btn" onClick={data.reload}>重试</button></p>}
          {data.receipts.status === 'ready' && <>
            {data.receipts.data.content.length === 0 && <p className={styles.empty}>暂无回执记录</p>}
            {data.receipts.data.content.map(receipt => <article className={styles.receipt} key={receipt.id}><div><strong>{receipt.targetLabel}</strong><p>{receipt.receiptNo} · {receipt.orderCode}</p><span className={styles.muted}>{localTimestamp(receipt.receivedAt)}</span></div><div><b>{receipt.result === 'SUCCESS' ? '确认成功' : '确认失败'}</b><p>{receipt.result === 'SUCCESS' ? `确认金额 ¥ ${receipt.totalConfirmedAmount} · 费用 ¥ ${receipt.totalFee}` : receipt.failReasonLabel}</p><p>确认净值 {receipt.unitNav === '0.0000' ? '按标的分别结算' : receipt.unitNav}</p><span className={styles.muted}>确认日 {receipt.confirmDate} · 净值日 {receipt.navDate}</span></div></article>)}
            {data.receipts.data.totalPages > 1 && <nav className={styles.pagination} aria-label="最近回执分页"><button className="btn" disabled={receiptPage <= 1} onClick={() => changePage('receipts', receiptPage - 1)}>上一页</button><span>{receiptPage} / {data.receipts.data.totalPages}</span><button className="btn" disabled={receiptPage >= data.receipts.data.totalPages} onClick={() => changePage('receipts', receiptPage + 1)}>下一页</button></nav>}
          </>}
        </section>
        <p className={styles.muted}>账户数 {data.summary.data.accountCount} · 更新于 {localTimestamp(data.summary.data.generatedAt)} · 每 30 秒及返回页面时刷新</p>
      </>}
    </div>
    {modal && <ReceiptDrawer key={modal.orderId ?? 'batch'} orderId={modal.orderId} count={count} backgroundRef={backgroundRef} submission={submission} onClose={() => setModal(null)} />}
  </>
}
