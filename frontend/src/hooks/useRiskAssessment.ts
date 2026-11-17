import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/http'
import { submitAssessment, type AssessmentInput, type AssessmentResult, type Questionnaire } from '../api/endpoints/risk'
import { useAuth } from '../app/AuthProvider'
import { errorMessage } from './useFunds'
export default function useRiskAssessment(questionnaire: Questionnaire) {
  const restore = useAuth(state => state.restore)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [attempted, setAttempted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const request = useRef<{ body: string; key: string } | null>(null)
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const missing = questionnaire.questions.filter(q => answers[q.id] === undefined).map(q => q.id)
  function choose(id: number, index: number) {
    if (busy.current || locked) return
    setAnswers(previous => ({ ...previous, [id]: index })); setError('')
  }
  async function submit() {
    if (busy.current) return
    setAttempted(true)
    if (missing.length) {
      document.getElementById(`question-${missing[0]}-0`)?.focus()
      return
    }
    const input: AssessmentInput = { questionnaireId: questionnaire.id, answers: questionnaire.questions.map(q => ({ questionId: q.id, optionIndex: answers[q.id] })) }
    const body = JSON.stringify(input)
    if (request.current?.body !== body) request.current = { body, key: crypto.randomUUID() }
    busy.current = true; setPending(true); setError('')
    try {
      const saved = await submitAssessment(input, request.current.key)
      if (mounted.current) { setResult(saved); void restore() }
    } catch (failure) {
      if (mounted.current) {
        setError(errorMessage(failure))
        // An uncertain response may already have committed. Keep the exact payload/key for recovery.
        setLocked(!(failure instanceof ApiError) || failure.status === 0 || failure.status >= 500 || failure.status === 409)
      }
    } finally { busy.current = false; if (mounted.current) setPending(false) }
  }
  return { answers, attempted, pending, error, locked, result, missing, choose, submit }
}
