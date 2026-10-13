import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useLiveSession } from '../hooks/useLiveSession'
import SeatMap from '../components/SeatMap'

/* ------------------------------------------------------------------ */
/*  Lecturer actions                                                   */
/* ------------------------------------------------------------------ */

// Push a question to every trainee
const pushQuestion = (sessionId, questionId) =>
  supabase
    .from('sessions')
    .update({
      status: 'question',
      current_question_id: questionId,
      question_started_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

// End the question early (skip) and reveal the correct answer
const endQuestion = (sessionId) =>
  supabase.from('sessions').update({ status: 'reveal' }).eq('id', sessionId)

const finishSession = (sessionId) =>
  supabase.from('sessions').update({ status: 'finished' }).eq('id', sessionId)

const releaseSeat = (sessionId, seat) =>
  supabase.rpc('release_seat', { p_session: sessionId, p_seat: seat })

// Live answers for the current question
function subscribeAnswers(sessionId, questionId, onChange) {
  const load = async () => {
    const { data } = await supabase
      .from('answers')
      .select('seat_number, choice, is_correct')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
    onChange(data || [])
  }
  load()
  const ch = supabase
    .channel(`answers-${sessionId}-${questionId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` },
      load
    )
    .subscribe()
  return () => supabase.removeChannel(ch)
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminLive() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { session, seats, question, connected } = useLiveSession(code)

  const [authChecked, setAuthChecked] = useState(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [correctIndex, setCorrectIndex] = useState(null)
  const [busy, setBusy] = useState(false)

  // 1) Only the logged-in lecturer may see this page
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate('/admin/login')
      else setAuthChecked(true)
    })
  }, [navigate])

  // 2) Load the questions of this session's section
  useEffect(() => {
    if (!session?.section_id) return
    supabase
      .from('questions')
      .select('*')
      .eq('section_id', session.section_id)
      .order('position')
      .then(({ data }) => setQuestions(data || []))
  }, [session?.section_id])

  // 3) Live answers for the active question
  useEffect(() => {
    if (!session?.id || !session?.current_question_id) {
      setAnswers([])
      return
    }
    return subscribeAnswers(session.id, session.current_question_id, setAnswers)
  }, [session?.id, session?.current_question_id])

  // 4) Correct answer (the lecturer is allowed to read question_keys)
  useEffect(() => {
    if (!session?.current_question_id) {
      setCorrectIndex(null)
      return
    }
    supabase
      .from('question_keys')
      .select('correct_index')
      .eq('question_id', session.current_question_id)
      .maybeSingle()
      .then(({ data }) => setCorrectIndex(data ? data.correct_index : null))
  }, [session?.current_question_id])

  if (!session || !authChecked) {
    return (
      <div className="grid h-dvh place-items-center text-ink">
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-5xl">
          🐝
        </motion.div>
      </div>
    )
  }

  const run = async (fn) => {
    setBusy(true)
    const { error } = await fn()
    setBusy(false)
    if (error) alert(error.message)
  }

  const joinUrl = `${window.location.origin}/join/${session.code}`
  const claimed = seats.filter((s) => s.claimed).length
  const counts = question ? question.options.map((_, i) => answers.filter((a) => a.choice === i).length) : []
  const maxCount = Math.max(1, ...counts)
  const everyoneAnswered = claimed > 0 && answers.length >= claimed
  const revealed = session.status === 'reveal' || session.status === 'finished'

  const currentIdx = questions.findIndex((q) => q.id === session.current_question_id)
  const nextQuestion = questions[currentIdx + 1]

  const onSeatClick = async (n) => {
    if (window.confirm(`Release seat ${n}? That trainee will be able to claim a seat again.`)) {
      await run(() => releaseSeat(session.id, n))
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white to-bee/10 p-4 md:p-8">
      {!connected && (
        <div className="fixed inset-x-0 top-0 z-50 bg-bee py-1 text-center text-sm font-semibold text-white">
          Reconnecting…
        </div>
      )}

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <img src="/logo.png" alt="BeeOrder" className="h-12" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{session.title}</h1>
          <p className="text-sm text-ink/60">
            Status: <b className="text-bee">{session.status}</b>
          </p>
        </div>
        <Link
          to={`/admin/analytics/${session.id}`}
          className="rounded-xl border-2 border-ink px-4 py-2 text-sm font-bold transition hover:bg-ink hover:text-white"
        >
          View analytics
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* LEFT: QR + join info */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-fit rounded-3xl bg-white p-6 text-center shadow-xl"
        >
          <h2 className="mb-1 font-bold">Scan to join</h2>
          <p className="mb-4 text-sm text-ink/60">
            Code: <b className="tracking-widest">{session.code}</b>
          </p>

          <div className="inline-block rounded-2xl border-4 border-bee p-3">
            <QRCodeSVG value={joinUrl} size={220} fgColor="#31434b" />
          </div>

          <p className="mt-3 break-all text-xs text-ink/50">{joinUrl}</p>
          <p className="mt-4 text-3xl font-bold text-bee">
            {claimed} / {seats.length}
          </p>
          <p className="text-sm text-ink/60">seats claimed</p>
        </motion.aside>

        {/* RIGHT: controls */}
        <main className="space-y-6">
          {/* Seat map: click a taken seat to release it */}
          <section className="rounded-3xl bg-white p-4 shadow-xl">
            <p className="mb-3 text-center text-xs text-ink/50">Click a taken seat to release it</p>
            <SeatMap seats={seats} onAdminClick={onSeatClick} />
          </section>

          {/* Live results */}
          <AnimatePresence>
            {question && session.status !== 'lobby' && (
              <motion.section
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl bg-white p-6 shadow-xl"
              >
                {question.image_url && (
                  <img src={question.image_url} alt="" className="mb-4 max-h-56 rounded-2xl object-contain" />
                )}
                <h2 className="mb-1 text-lg font-bold">{question.text}</h2>
                <p className="mb-4 text-sm text-ink/60">
                  {answers.length} / {claimed} answered
                  {everyoneAnswered && (
                    <span className="ml-2 font-semibold text-green-600">Everyone answered</span>
                  )}
                </p>

                <div className="space-y-3">
                  {question.options.map((opt, i) => {
                    const isRight = revealed && i === correctIndex
                    return (
                      <div key={i}>
                        <div className="mb-1 flex justify-between text-sm font-medium">
                          <span className={isRight ? 'font-bold text-green-600' : ''}>
                            {opt} {isRight && '✓'}
                          </span>
                          <span>{counts[i]}</span>
                        </div>
                        <div className="h-4 overflow-hidden rounded-full bg-ink/10">
                          <motion.div
                            className={`h-full rounded-full ${isRight ? 'bg-green-500' : 'bg-bee'}`}
                            animate={{ width: `${(counts[i] / maxCount) * 100}%` }}
                            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {session.status === 'question' && (
                    <button
                      disabled={busy}
                      onClick={() => run(() => endQuestion(session.id))}
                      className="rounded-xl bg-ink px-5 py-3 font-bold text-white transition hover:bg-ink-light disabled:opacity-50"
                    >
                      {everyoneAnswered ? 'Reveal answer' : 'Skip and reveal answer'}
                    </button>
                  )}
                  {session.status === 'reveal' && nextQuestion && (
                    <button
                      disabled={busy}
                      onClick={() => run(() => pushQuestion(session.id, nextQuestion.id))}
                      className="rounded-xl bg-bee px-5 py-3 font-bold text-white transition hover:bg-bee-dark disabled:opacity-50"
                    >
                      Push next question
                    </button>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Question list */}
          <section className="rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Questions</h2>

            {questions.length === 0 && (
              <p className="text-sm text-ink/60">
                This section has no questions yet. Add some in the dashboard, then come back.
              </p>
            )}

            <ul className="space-y-2">
              {questions.map((q, i) => {
                const active = q.id === session.current_question_id
                return (
                  <li
                    key={q.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 transition ${
                      active ? 'border-bee bg-bee/10' : 'border-ink/10'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {i + 1}. {q.text}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => run(() => pushQuestion(session.id, q.id))}
                      className="shrink-0 rounded-lg bg-bee px-4 py-2 text-sm font-bold text-white transition hover:bg-bee-dark disabled:opacity-50"
                    >
                      {active ? 'Push again' : 'Push'}
                    </button>
                  </li>
                )
              })}
            </ul>

            <button
              disabled={busy || session.status === 'finished'}
              onClick={() => {
                if (window.confirm('Finish the session for everyone?')) run(() => finishSession(session.id))
              }}
              className="mt-5 rounded-xl border-2 border-ink px-5 py-3 font-bold transition hover:bg-ink hover:text-white disabled:opacity-50"
            >
              {session.status === 'finished' ? 'Session finished' : 'Finish session'}
            </button>
          </section>
        </main>
      </div>
    </div>
  )
}