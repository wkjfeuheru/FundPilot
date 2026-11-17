import { useEffect, useState } from 'react'
import { getQuestionnaire, type Questionnaire } from '../../../api/endpoints/risk'
import { useRemote } from '../../../hooks/useFunds'
import useRiskAssessment from '../../../hooks/useRiskAssessment'
import { assessmentDate, businessDate, riskConclusions } from '../../../utils/riskFormat'
import styles from '../ProfilePage.module.css'
interface Props { onClose: () => void }
export default function QuestionnairePage({ onClose }: Props) {
  const [revision, setRevision] = useState(0)
  const remote = useRemote(getQuestionnaire, revision)
  useEffect(() => { if (remote.status !== 'loading') document.getElementById('questionnaire-title')?.focus() }, [remote.status])
  return <section className={styles.questionnaire} aria-labelledby="questionnaire-title">
    {remote.status === 'loading' && <p role="status">正在加载测评问卷…</p>}
    {remote.status === 'error' && <div role="alert"><h1 tabIndex={-1} id="questionnaire-title">问卷加载失败</h1><p>{remote.message}</p><button className="btn btn-primary" onClick={() => setRevision(r => r + 1)}>重新加载问卷</button></div>}
    {remote.status === 'ready' ? <QuestionnaireForm questionnaire={remote.data} onClose={onClose} /> : <button className="btn btn-outline" onClick={onClose}>返回风险画像</button>}
  </section>
}
function QuestionnaireForm({ questionnaire, onClose }: Props & { questionnaire: Questionnaire }) {
  const state = useRiskAssessment(questionnaire)
  if (state.result) return <div className={styles.result}>
    <span className={styles.badge}>已保存</span><h1 tabIndex={-1} id="questionnaire-title">测评已完成</h1>
    <p className={styles.resultLevel}>{state.result.riskLevelLabel}</p><p>{riskConclusions[state.result.riskLevel]}</p>
    <dl className={styles.details}><div><dt>最近测评日期</dt><dd>{assessmentDate(state.result.evaluatedAt)}</dd></div><div><dt>有效期至</dt><dd>{businessDate(state.result.validUntil)}</dd></div></dl>
    <p className={styles.note}>本次测评已记录，风险等级将用于基金超市的适当性提示。</p>
    <button autoFocus className="btn btn-primary" onClick={onClose}>返回风险画像</button>
  </div>
  return <form onSubmit={event => { event.preventDefault(); void state.submit() }} noValidate>
    <div className={styles.cardHeader}><div><span className={styles.eyebrow}>RISK ASSESSMENT</span><h1 tabIndex={-1} id="questionnaire-title">{questionnaire.title}</h1></div><span className={styles.version}>{questionnaire.version}</span></div>
    <p className={styles.note}>请根据实际情况选择，每题单选。提交后更新风险等级，账户基础资料保持不变。</p>
    <div className={styles.progress}><span>已完成 {questionnaire.questionCount - state.missing.length} / {questionnaire.questionCount} 题</span><progress aria-label="作答进度" max={questionnaire.questionCount} value={questionnaire.questionCount - state.missing.length} /></div>
    {questionnaire.questions.map((question, index) => {
      const invalid = state.attempted && state.missing.includes(question.id)
      return <fieldset key={question.id} disabled={state.pending || state.locked} className={styles.question} aria-describedby={invalid ? `question-error-${question.id}` : undefined} aria-invalid={invalid}>
        <legend>{index + 1}. {question.title}</legend>
        <div className={styles.options}>{question.options.map(option => <label key={option.index} className={state.answers[question.id] === option.index ? styles.selected : undefined}>
          <input id={`question-${question.id}-${option.index}`} type="radio" name={`question-${question.id}`} value={option.index} checked={state.answers[question.id] === option.index} onChange={() => state.choose(question.id, option.index)} />
          <span>{option.text}</span>
        </label>)}</div>
        {invalid && <p id={`question-error-${question.id}`} className={styles.fieldError}>请选择一个选项</p>}
      </fieldset>
    })}
    {state.error && <div role="alert" className={styles.error}><p>{state.error}</p>{state.locked && <p>提交结果尚待确认。请重试原提交，或返回画像核对最新结果。</p>}</div>}
    <div className={styles.actions}><button type="submit" disabled={state.pending} className="btn btn-primary">{state.pending ? '正在提交…' : state.error ? '重试提交' : '提交测评'}</button><button type="button" disabled={state.pending} className="btn btn-outline" onClick={onClose}>{state.locked ? '返回画像核对结果' : '取消测评'}</button></div>
  </form>
}
