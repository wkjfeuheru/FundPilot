import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { getRiskProfile, type RiskProfile } from '../../api/endpoints/risk'
import { useRemote } from '../../hooks/useFunds'
import Icon from '../../components/Icon'
import { assessmentDate, businessDate, riskConclusions } from '../../utils/riskFormat'
import QuestionnairePage from './profile/QuestionnairePage'
import styles from './ProfilePage.module.css'
export default function ProfilePage() {
  const userId = useAuth(state => state.user?.id)
  return <ProfileContent key={userId} />
}
function ProfileContent() {
  const user = useAuth(state => state.user)
  const [revision, setRevision] = useState(0)
  const [quiz, setQuiz] = useState(false)
  const restoreFocus = useRef<'reload' | 'ready' | null>(null)
  const assessmentButton = useRef<HTMLButtonElement>(null)
  const remote = useRemote(getRiskProfile, revision)
  useEffect(() => {
    const refresh = () => setRevision(r => r + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  useEffect(() => {
    if (!quiz && remote.status === 'loading' && restoreFocus.current === 'reload') restoreFocus.current = 'ready'
    if (!quiz && remote.status === 'ready' && restoreFocus.current === 'ready') {
      assessmentButton.current?.focus(); restoreFocus.current = null
    }
  }, [quiz, remote.status])
  const profile = remote.status === 'ready' ? remote.data : null
  const close = () => { restoreFocus.current = 'reload'; setQuiz(false); setRevision(r => r + 1) }
  if (quiz) return <QuestionnairePage onClose={close} />
  return <div className={styles.page}>
    <header className={styles.heading}><span className={styles.eyebrow}>RISK PROFILE & ACCOUNT</span><h1>风险画像与账户</h1><p>了解你的风险承受能力，为每一次投资选择提供依据。</p></header>
    <div className={styles.grid}>
      <section className={styles.card} aria-labelledby="risk-summary">
        <div className={styles.cardHeader}><h2 id="risk-summary"><Icon name="shield" />风险测评摘要</h2>{profile && <span className={profile.isEffective ? styles.badge : styles.warningBadge}>{profile.isEffective ? '当前评估有效' : '测评已过期'}</span>}</div>
        {remote.status === 'loading' && <p role="status">正在加载风险画像…</p>}
        {remote.status === 'error' && <div role="alert"><p>{remote.message}</p><button className="btn btn-outline" onClick={() => setRevision(r => r + 1)}>重新加载画像</button></div>}
        {remote.status === 'ready' && <>
          {profile ? <RiskSummary profile={profile} /> : <div className={styles.empty}><span className={styles.emptyIcon}><Icon name="shield" /></span><h3>未测评</h3><p>完成风险测评，了解你的风险承受能力。</p><p className={styles.note}>首次测评后将建立风险画像。</p></div>}
          <div className={styles.banner}>{profile && !profile.isEffective ? '上次测评结果已过期，请重新测评以更新适当性依据。' : '测评结果将同步至基金超市的适当性提示。'}</div>
          <button ref={assessmentButton} className="btn btn-primary" onClick={() => setQuiz(true)}><Icon name="refresh" />{profile ? '重新风险测评' : '开始风险测评'}</button>
        </>}
      </section>
      <section className={styles.card} aria-labelledby="account-title"><div className={styles.cardHeader}><h2 id="account-title"><Icon name="user" />账户基础信息</h2><span className={styles.version}>只读</span></div>
        <dl className={styles.details}>
          <div><dt>投资者姓名</dt><dd>{user?.displayName}</dd></div>
          <div><dt>账户类型</dt><dd>{remote.status === 'ready' ? profile?.accountType || '待完善' : '暂不可用'}</dd></div>
          <div><dt>投资期限偏好</dt><dd>{remote.status === 'ready' ? profile && profile.horizonYears > 0 ? `${profile.horizonYears} 年` : '待完善' : '暂不可用'}</dd></div>
          <div><dt>流动性需求</dt><dd>{remote.status === 'ready' ? profile && profile.liquidityNeed !== 'NOT_SET' ? profile.liquidityNeedLabel : '待完善' : '暂不可用'}</dd></div>
          <div><dt>安全认证</dt><dd><span className={user?.isSecurityVerified ? styles.badge : styles.warningBadge}>{user?.isSecurityVerified ? '已验证' : '未验证'}</span></dd></div>
          <div><dt>账户状态</dt><dd><span className={styles.badge}>{user?.status === 'NORMAL' ? '正常' : '停用'}</span></dd></div>
        </dl><p className={styles.note}>账户资料暂不支持自行修改。显示“待完善”的项目尚未登记，风险测评不会自动补全这些资料。</p>
      </section>
    </div>
    <section className={styles.card} aria-labelledby="suitability-title"><h2 id="suitability-title">适当性管理说明</h2><div className={styles.explanations}>
      <div><Icon name="shield" /><h3>了解风险承受能力</h3><p>根据问卷作答形成风险等级，保留测评日期和有效期。</p></div>
      <div><Icon name="layers" /><h3>辅助产品选择</h3><p>结合投资目标与流动性需求，关注产品风险是否与你匹配。</p></div>
      <div><Icon name="file" /><h3>保留测评记录</h3><p>每次提交独立留痕，重新测评后以最新结果更新风险画像。</p></div>
    </div></section>
  </div>
}
function RiskSummary({ profile }: { profile: RiskProfile }) {
  const percent = Number(profile.riskLevel.slice(1)) * 20
  return <><p className={styles.note}>最近测评日期：{assessmentDate(profile.evaluatedAt)}</p><div className={styles.summary}>
    <div className={styles.donut} role="img" aria-label={`风险等级 ${profile.riskLevelLabel}`} style={{ background: `conic-gradient(var(--accent) ${percent}%, var(--line) ${percent}% 100%)` }}><div><strong>{profile.riskLevel}</strong><span>{profile.riskLevelLabel.replace(/^R[1-5]\s*/, '')}</span></div></div>
    <div className={styles.conclusion}><h3>测评结论</h3><p>{riskConclusions[profile.riskLevel]}</p><dl className={styles.details}><div><dt>有效期至</dt><dd>{businessDate(profile.validUntil)}</dd></div></dl></div>
  </div></>
}
