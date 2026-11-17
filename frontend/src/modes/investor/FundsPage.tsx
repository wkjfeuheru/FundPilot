import { useCallback } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { FUND_TYPES, isFundType, isNavRange } from '../../api/endpoints/funds'
import useFunds from '../../hooks/useFunds'
import type { ProductOutletContext } from '../../layouts/AppShell'
import Icon from '../../components/Icon'
import FundCard from './funds/FundCard'
import FundDetailDrawer from './funds/FundDetailDrawer'
import PurchaseDrawer from './trades/PurchaseDrawer'
import styles from './FundsPage.module.css'

export default function FundsPage() {
  const shell = useOutletContext<ProductOutletContext>()
  const [params, setParams] = useSearchParams()
  const { remote, suitability, funds, pending, notice, toggle, reload } = useFunds()
  const keyword = params.get('keyword') ?? ''
  const type = params.get('type') ?? ''
  const favorites = params.get('view') === 'favorites'
  const rawRange = params.get('range') ?? '1Y'
  const range = isNavRange(rawRange) ? rawRange : '1Y'
  const id = Number(params.get('fundId'))
  const visible = funds.filter(f => (!isFundType(type) || f.fundType === type) && (!favorites || f.isFavorite) &&
    `${f.name} ${f.fundCode}`.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase()))
  const change = useCallback((key: string, value: string) => setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); return next }, { replace: true }), [setParams])
  const close = useCallback(() => setParams(current => { const next = new URLSearchParams(current); next.delete('fundId'); next.delete('purchase'); return next }, { replace: true }), [setParams])
  function open(id: number, purchase = false) { setParams(current => { const next = new URLSearchParams(current); next.set('fundId', String(id)); if (purchase) next.set('purchase', '1'); else next.delete('purchase'); return next }) }
  const profile = suitability.status === 'ready' ? suitability.data : null
  const riskText = suitability.status === 'loading' ? '正在核验风险评级…' : suitability.status === 'error' ? '风险评级暂不可用' : !profile ? '未测评，建议先测评' : profile.isEffective ? `当前风险评级：${profile.riskLevelLabel}` : `${profile.riskLevelLabel} · 已过期，建议先测评`
  return <div className={styles.page}>
    <header className={styles.welcome}><div><p className={styles.eyebrow}>FUND MARKETPLACE</p><h1>基金超市</h1><p>了解真实基金数据，寻找适合自己的投资方向。</p></div>
      <button type="button" className={styles.primary} onClick={() => shell.openAi(`${profile?.isEffective ? `我的风险等级是${profile.riskLevelLabel}` : '我尚未完成有效风险测评'}，帮我分析如何筛选基金`)}><Icon name="sparkles" /> AI 帮我选基金</button></header>
    <section className={styles.hero} aria-label="适当性提示"><div><h2>从产品搜索，到适当性匹配</h2><p>先了解产品类型、波动与投资期限。浏览基金不受测评状态限制。</p></div><div className={styles['risk-note']}><span>{riskText}</span>{suitability.status === 'error' ? <button className={styles.button} onClick={reload}>重试风险评级</button> : !profile?.isEffective && <Link to="/investor/profile">查看风险画像</Link>}</div></section>
    <div className={styles.toolbar}><label className={styles.search}><Icon name="search" /><input type="search" aria-label="搜索基金名称或代码" placeholder="搜索基金名称或代码" maxLength={128} value={keyword} onChange={e => change('keyword', e.target.value)} /></label>
      <div className={styles.choices} aria-label="基金类型"><button type="button" aria-pressed={!isFundType(type)} onClick={() => change('type', '')}>全部</button>{FUND_TYPES.map(t => <button type="button" key={t} aria-pressed={type === t} onClick={() => change('type', t)}>{{ EQUITY: '权益', BOND: '债券', MONEY: '货币', GOLD: '黄金' }[t]}</button>)}</div></div>
    <div className={styles['results-bar']}><span>{remote.status === 'ready' ? `共 ${visible.length} 只基金` : '基金产品'}</span><button type="button" className={styles.button} aria-pressed={favorites} onClick={() => change('view', favorites ? '' : 'favorites')}>我的自选</button></div>
    {notice && <p role={notice.kind === 'error' ? 'alert' : 'status'} className={styles.notice}>{notice.text}</p>}
    {remote.status === 'loading' && <div role="status" aria-label="正在加载基金" className={styles.grid}>{[1, 2, 3].map(i => <div key={i} className={styles.skeleton}>正在加载基金…</div>)}</div>}
    {remote.status === 'error' && <div className={styles.empty} role="alert"><p>{remote.message}</p><button className={styles.button} onClick={reload}>重新加载基金</button></div>}
    {remote.status === 'ready' && (visible.length ? <div className={styles.grid}>{visible.map(f => <FundCard key={f.id} fund={f} pending={pending.has(f.id)} onOpen={() => open(f.id)} onFavorite={() => void toggle(f)} onPurchase={() => open(f.id, true)} />)}</div> : <div className={styles.empty} role="status"><h2>没有找到匹配的基金产品</h2><p>{favorites ? '可以先将感兴趣的基金加入自选。' : '试试其他名称、代码或基金类型。'}</p><button className={styles.button} onClick={() => setParams({})}>重置筛选</button></div>)}
    <p className={styles.footnote}>数据来自公开披露，非实时行情。风险等级与资产大类为系统映射；历史收益不代表未来表现。本系统仅用于演示，不构成投资建议。</p>
    {Number.isSafeInteger(id) && id > 0 && (params.get('purchase') === '1'
      ? <PurchaseDrawer key={`purchase-${id}`} fundId={id} onClose={close} backgroundRef={shell.backgroundRef} />
      : <FundDetailDrawer key={id} id={id} range={range} onRange={r => change('range', r)} onClose={close} {...shell} onPurchase={() => open(id, true)} />)}
  </div>
}
