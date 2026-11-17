import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import Drawer from '../../../components/Drawer'
import { getTrade } from '../../../api/endpoints/trades'
import { useRemote } from '../../../hooks/useFunds'
import { localTimestamp } from '../../../utils/fundFormat'
import type { ProductOutletContext } from '../../../layouts/AppShell'
import styles from '../TransactionsPage.module.css'
interface Props extends Pick<ProductOutletContext, 'backgroundRef'> { id: number; onClose: () => void }
export default function TradeDetailDrawer({ id, onClose, backgroundRef }: Props) {
  const [revision, setRevision] = useState(0)
  const load = useCallback(() => getTrade(id), [id])
  const remote = useRemote(load, revision)
  const order = remote.status === 'ready' ? remote.data : null
  return createPortal(<Drawer title="交易详情" onClose={onClose} backgroundRef={backgroundRef}>
    {remote.status === 'loading' && <p role="status">正在加载交易…</p>}
    {remote.status === 'error' && <div role="alert"><p>{remote.message}</p><button className={styles.button} onClick={() => setRevision(r => r + 1)}>重新加载交易</button></div>}
    {order && <div className={styles.form}>
      <div className={styles.product}><span className={styles.badge} data-status={order.status}>{order.statusLabel}</span><h3>{order.targetLabel}</h3><p>{order.orderCode}</p></div>
      <dl className={styles.facts}>
        <div><dt>交易类型</dt><dd>{order.tradeTypeLabel}</dd></div><div><dt>申请日（T 日）</dt><dd>{order.tradeDate}</dd></div>
        <div><dt>提交时间</dt><dd>{localTimestamp(order.createdAt)}</dd></div>
        <div><dt>申请调入 / 调出金额（元）</dt><dd>{order.totalAmountIn} / {order.totalAmountOut}</dd></div>
        <div><dt>预计费用（元）</dt><dd>{order.totalFee}</dd></div>
        <div><dt>本单当前冻结（元）</dt><dd>{order.status === 'PENDING_TA' ? order.freezeAmount : '0.00'}</dd></div>
      </dl>
      {order.remark && <p className={styles.notice}>{order.remark}</p>}
      <section><h3>交易明细</h3>{order.items.map(item => <div key={item.id} className={styles.item}>
        <strong>{item.fundName}</strong><small>{item.fundCode} · {item.direction === 'BUY' ? '买入' : '卖出'}</small>
        <p>申请金额 ¥{item.amount} · 申请份额 {item.shares} · 预计费用 ¥{item.fee}</p>
        <p>{order.status === 'CONFIRMED' ? `确认份额 ${item.confirmedShares} · 确认金额 ¥${item.confirmedAmount}` : order.status === 'FAILED' ? '确认失败，本明细未成交' : '确认份额 / 金额：尚未确认'}</p>
      </div>)}</section>
      <section><h3>TA 登记回执</h3>{order.taReceipt ? <dl className={styles.facts}>
        <div><dt>确认编号</dt><dd>{order.taReceipt.receiptNo}</dd></div>
        <div><dt>确认日期 / 净值日</dt><dd>{order.taReceipt.confirmDate} / {order.taReceipt.navDate}</dd></div>
        <div><dt>确认净值</dt><dd>{order.taReceipt.unitNav}</dd></div>
        <div><dt>确认金额 / 实际费用（元）</dt><dd>{order.taReceipt.totalConfirmedAmount} / {order.taReceipt.totalFee}</dd></div>
        <div><dt>回执结果</dt><dd>{order.taReceipt.result === 'SUCCESS' ? '成功' : `失败：${order.taReceipt.failReasonLabel}`}</dd></div>
        <div><dt>接收时间</dt><dd>{localTimestamp(order.taReceipt.receivedAt)}</dd></div>
      </dl> : <p className={styles.notice}>{order.status === 'PENDING_TA' ? '尚未收到 TA 回执。申购及净支出调仓冻结相应资金，现金余额与持仓不变；T+1 确认后才更新结果。' : '当前交易为终态，但暂无可用回执，请刷新或联系服务人员核对。'}</p>}</section>
      <button className={styles.button} onClick={() => setRevision(r => r + 1)}>刷新交易状态</button>
    </div>}
  </Drawer>, document.body)
}
