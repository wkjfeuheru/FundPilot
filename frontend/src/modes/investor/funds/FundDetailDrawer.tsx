import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import Drawer from '../../../components/Drawer'
import { getFund, getFundNavs, NAV_RANGES } from '../../../api/endpoints/funds'
import type { NavRange } from '../../../api/endpoints/funds'
import { useRemote } from '../../../hooks/useFunds'
import { fundSize, localTimestamp, percentage } from '../../../utils/fundFormat'
import type { ProductOutletContext } from '../../../layouts/AppShell'
import NavChart from './NavChart'
import styles from '../FundsPage.module.css'
interface FundDetailDrawerProps extends ProductOutletContext { id: number; range: NavRange; onRange: (range: NavRange) => void; onClose: () => void; onPurchase: () => void }
export default function FundDetailDrawer({ id, range, onRange, onClose, backgroundRef, openAi, onPurchase }: FundDetailDrawerProps) {
  const [retry, setRetry] = useState(0)
  const load = useCallback(() => getFund(id), [id])
  const loadNavs = useCallback(() => getFundNavs(id, range), [id, range])
  const detail = useRemote(load, retry)
  const navs = useRemote(loadNavs, retry)
  const fund = detail.status === 'ready' ? detail.data : null
  return createPortal(<Drawer title={fund?.name ?? '基金详情'} backgroundRef={backgroundRef} onClose={onClose}
    footer={fund && <div className={styles.actions}><button type="button" className={styles.primary} onClick={onPurchase}>申购该基金</button><button type="button" className={styles.button} onClick={() => { onClose(); openAi(`请解读 ${fund.name} 的风险收益特征`) }}>AI 解读该基金</button></div>}>
    {detail.status === 'loading' && <p role="status">正在加载基金详情…</p>}
    {detail.status === 'error' && <div role="alert"><p>{detail.message}</p><button className={styles.button} onClick={() => setRetry(r => r + 1)}>重新加载详情</button></div>}
    {fund && <div className={styles.detail}>
      <div className={styles.tags}><span>{fund.fundCode}</span><span>{fund.categoryLabel}</span><span>{fund.riskLevelLabel}</span></div>
      <section><h3>产品说明</h3><p>本产品属于{fund.categoryLabel}。{fund.styleTags.length > 0 && `风格标签：${fund.styleTags.join('、')}。`}</p><dl className={styles.facts}>
        <div><dt>基金公司</dt><dd>{fund.company || '未披露'}</dd></div><div><dt>基金经理</dt><dd>{fund.manager || '未披露'}</dd></div>
        <div><dt>基金规模</dt><dd>{fundSize(fund.fundSize)}<small>截至 {fund.fundSizeAsOfDate ?? '未披露'}</small></dd></div>
        <div><dt>成立日期</dt><dd>{fund.inceptionDate ?? '未披露'}</dd></div>
        <div><dt>业绩比较基准</dt><dd>{fund.benchmark || '未披露'}</dd></div>
        <div><dt>交易状态</dt><dd>{fund.purchaseStatusLabel} / {fund.redeemStatusLabel}</dd></div>
      </dl></section>
      <section><h3>{fund.fundType === 'MONEY' ? '七日年化走势' : '历史净值走势'}</h3><div className={styles.choices} aria-label="净值区间">{NAV_RANGES.map(r => <button type="button" key={r} aria-pressed={range === r} onClick={() => onRange(r)}>{{ '1M': '近一月', '3M': '近三月', '6M': '近六月', '1Y': '近一年' }[r]}</button>)}</div>
        {navs.status === 'loading' && <p role="status">正在加载历史数据…</p>}
        {navs.status === 'error' && <div role="alert"><p>{navs.message}</p><button className={styles.button} onClick={() => setRetry(r => r + 1)}>重新加载净值</button></div>}
        {navs.status === 'ready' && <NavChart points={navs.data.points} money={fund.fundType === 'MONEY'} />}
        <p className={styles.secondary}>截至 {fund.latestNavDate}；区间以最新披露日为准，最多展示 250 点。</p>
      </section>
      <section><h3>费率说明</h3><dl className={styles.facts}>
        <div><dt>申购费率（优惠档）</dt><dd>{percentage(fund.fees.purchase)}</dd></div><div><dt>赎回费率（演示档）</dt><dd>{percentage(fund.fees.redeem)}</dd></div>
        <div><dt>管理费 / 年</dt><dd>{percentage(fund.fees.manage)}</dd></div><div><dt>托管费 / 年</dt><dd>{percentage(fund.fees.custodian)}</dd></div><div><dt>销售服务费 / 年</dt><dd>{percentage(fund.fees.salesService)}</dd></div>
      </dl><p className={styles.secondary}>赎回展示持有 30 天普通适用档，不含短期持有或特殊流动性情形下的强制费用；申购为来源优惠档。实际费率以销售机构及基金公告为准。</p></section>
      <section><h3>风险指标 · 近一年</h3><dl className={styles.facts}><div><dt>年化波动率</dt><dd>{percentage(fund.riskMetrics.annualizedVolatility)}</dd></div><div><dt>最大回撤</dt><dd>{percentage(fund.riskMetrics.maxDrawdown)}</dd></div></dl>
        <p className={styles.secondary}>{fund.fundType === 'MONEY' ? '货币基金按设计不计算单位净值波动与回撤；零值不代表无风险。' : '按可用未复权单位净值计算；分红除息会影响指标，历史表现不代表未来收益。数据不足时不计算。'}</p></section>
      <div className={styles.source}><p>数据来源：{fund.dataSource === 'EASTMONEY' ? '天天基金公开数据' : '演示数据'} · 同步时间 {localTimestamp(fund.dataSyncedAt)}</p>
        {fund.dataSource === 'EASTMONEY' && /^\d{6}$/.test(fund.fundCode) && <a href={`https://fund.eastmoney.com/${fund.fundCode}.html`} target="_blank" rel="noreferrer">查看来源页面 ↗</a>}
        <p>风险等级与四大类为系统映射，非来源机构的适当性结论。</p></div>
    </div>}
  </Drawer>, document.body)
}
