import { useCallback } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import type { ProductOutletContext } from '../../layouts/AppShell'
import { TRADE_STATUSES, TRADE_TYPES } from '../../api/endpoints/trades'
import useTransactions from '../../hooks/useTransactions'
import TradeDetailDrawer from './trades/TradeDetailDrawer'
import styles from './TransactionsPage.module.css'
import { useAuth } from '../../app/AuthProvider'
import { localTimestamp } from '../../utils/fundFormat'
import AutoInvestPanel from './trades/AutoInvestPanel'

export default function TransactionsPage() {
  const id = useAuth(s => s.user?.id)
  return <TransactionsContent key={id} />
}
function TransactionsContent() {
  const shell = useOutletContext<ProductOutletContext>()
  const [params, setParams] = useSearchParams()
  const query = new URLSearchParams()
  for (const key of ['tradeType', 'status', 'from', 'to', 'page', 'size']) { const value = params.get(key); if (value) query.set(key, value) }
  const { orders, cash, reload } = useTransactions(query.toString())
  const orderId = Number(params.get('orderId'))
  const close = useCallback(() => setParams(current => { const next = new URLSearchParams(current); next.delete('orderId'); return next }, { replace: true }), [setParams])
  function change(key: string, value: string) {
    setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== 'page' && key !== 'orderId') next.delete('page'); return next }, { replace: true })
  }
  return <div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>TRANSACTION CENTER</span><h1>交易记录</h1><p>跟踪委托与资金冻结，登记结果以 TA 回执为准。</p></div><Link className={styles.primary} to="/investor/funds">基金申购</Link></header>
    {cash.status === 'loading' && <p role="status">正在加载资金账户…</p>}
    {cash.status === 'error' && <div role="alert"><p>{cash.message}</p><button className={styles.button} onClick={reload}>重试资金账户</button></div>}
    {cash.status === 'ready' && <section className={styles.metrics} aria-label="资金账户">
      <div className={styles.metric}><span>现金余额（元）</span><strong>{cash.data.cashBalance}</strong><small>TA 确认成功后才结算</small></div>
      <div className={styles.metric}><span>待登记冻结（元）</span><strong>{cash.data.frozenAmount}</strong><small>已提交的在途委托占用资金</small></div>
      <div className={styles.metric}><span>可用现金（元）</span><strong>{cash.data.availableCash}</strong><small>现金余额 − 待登记冻结</small></div>
    </section>}
    <section className={styles.panel}><h2>委托流水</h2><div className={styles.filters}>
      <label className={styles.field}>交易类型<select value={params.get('tradeType') ?? ''} onChange={e => change('tradeType', e.target.value)}><option value="">全部类型</option>{TRADE_TYPES.map((type, i) => <option key={type} value={type}>{['基金申购', '基金赎回', '基金调仓', '基金定投', '基金分红'][i]}</option>)}</select></label>
      <label className={styles.field}>交易状态<select value={params.get('status') ?? ''} onChange={e => change('status', e.target.value)}><option value="">全部状态</option>{TRADE_STATUSES.map((status, i) => <option key={status} value={status}>{['待登记确认', '确认成功', '确认失败'][i]}</option>)}</select></label>
      <label className={styles.field}>开始日期<input type="date" value={params.get('from') ?? ''} onChange={e => change('from', e.target.value)} /></label>
      <label className={styles.field}>结束日期<input type="date" value={params.get('to') ?? ''} onChange={e => change('to', e.target.value)} /></label>
      <button className={styles.button} onClick={reload}>刷新</button><button className={styles.button} onClick={() => setParams({})}>重置筛选</button>
    </div>
      {orders.status === 'loading' && <p role="status">正在加载交易记录…</p>}
      {orders.status === 'error' && <div role="alert"><p>{orders.message}</p><button className={styles.button} onClick={reload}>重新加载记录</button></div>}
      {orders.status === 'ready' && <>
        {orders.data.content.length ? <div className={styles.orders}>{orders.data.content.map(order => <article className={styles.order} key={order.id}>
          <div><h3>{order.targetLabel}</h3><p>{order.tradeTypeLabel} · {order.orderCode}</p><small>申请日 {order.tradeDate}</small><p>提交于 {localTimestamp(order.createdAt)}</p></div>
          <div>{order.tradeType === 'REBALANCE' ? <><strong>调入 ¥{order.totalAmountIn}</strong><p>调出 ¥{order.totalAmountOut}</p></> : <strong>{order.tradeType === 'REDEMPTION' || order.tradeType === 'DIVIDEND' ? `收入 ¥${order.totalAmountOut}` : `支出 ¥${order.totalAmountIn}`}</strong>}<p>预计费用 ¥{order.totalFee}</p></div>
          <div><span className={styles.badge} data-status={order.status}>{order.statusLabel}</span><p>{order.taReceipt?.receiptNo ?? (order.status === 'PENDING_TA' ? '等待 TA 登记回执' : '暂无可用回执，请刷新核对')}</p>{order.taReceipt && <p>确认日 {order.taReceipt.confirmDate}</p>}{order.taReceipt?.result === 'FAILED' && <p>{order.taReceipt.failReasonLabel}</p>}</div>
          <button className={styles.button} aria-label={`查看 ${order.orderCode}`} onClick={() => change('orderId', String(order.id))}>查看详情</button>
        </article>)}</div> : <div className={styles.empty} role="status"><p>暂无符合条件的交易记录</p><Link to="/investor/funds">去基金超市浏览产品</Link></div>}
        <div className={styles.pagination}><span>共 {orders.data.totalElements} 笔 · 第 {orders.data.page} 页 / {Math.max(1, orders.data.totalPages)} 页</span><button className={styles.button} disabled={orders.data.page <= 1} onClick={() => change('page', String(orders.data.page - 1))}>上一页</button><button className={styles.button} disabled={orders.data.page >= orders.data.totalPages} onClick={() => change('page', String(orders.data.page + 1))}>下一页</button></div>
      </>}
    </section>
    <AutoInvestPanel backgroundRef={shell.backgroundRef} />
    <p className={styles.notice}>演示交易规则：申购及净支出调仓会冻结资金，待登记尚不代表成交；T+1 按 T 日净值模拟确认。TA 回执由独立登记流程产生，用户端仅可查看结果。{cash.status === 'ready' && cash.data.frozenAmount !== '0.00' && '存在在途冻结，请先核对待登记委托，再安排新的交易。'}<a href={import.meta.env.VITE_TA_SITE_URL || `${window.location.protocol}//${window.location.hostname}:5175/ta`} target="_blank" rel="noopener noreferrer">打开 TA 模拟台 ↗</a></p>
    {Number.isSafeInteger(orderId) && orderId > 0 && <TradeDetailDrawer key={orderId} id={orderId} onClose={close} backgroundRef={shell.backgroundRef} />}
  </div>
}
