import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveSession } from '../hooks/useLiveSession'
import { useTraineeSeat } from '../hooks/useTraineeSeat'
import SeatMap from '../components/SeatMap'
import QuestionCard from '../components/QuestionCard'

export default function Join() {
  const { code } = useParams()
  const { session, seats, question, connected } = useLiveSession(code)
  const { me, loading, claim, answer } = useTraineeSeat(session?.id)
  const [pending, setPending] = useState(null) // seat number awaiting name
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  if (!session || loading) return <div className="grid h-dvh place-items-center animate-pulse">🐝 Loading…</div>

  const submitName = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const res = await claim(pending, name)
    if (!res.ok) setErr(res.error === 'seat_taken' ? 'Someone just took that seat — pick another.' : 'Error, try again.')
    else { setPending(null); setErr('') }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white to-bee/10 pb-10">
      {!connected && (
        <div className="bg-bee text-white text-center text-sm py-1">Reconnecting…</div>
      )}
      <header className="flex items-center gap-3 p-4">
        <img src="/logo.png" alt="BeeOrder" className="h-10" />
        <span className="font-semibold">{session.title}</span>
      </header>

      <AnimatePresence mode="wait">
        {/* 1. No seat yet → pick one */}
        {!me && (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2 className="text-center text-xl font-bold mb-4">Choose your seat</h2>
            <SeatMap seats={seats} onPick={(n) => { setPending(n); setErr('') }} />
          </motion.div>
        )}

        {/* 2. Seated + lobby → waiting */}
        {me && session.status === 'lobby' && (
          <motion.div key="wait" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center mt-10 px-4">
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-6xl">🐝</motion.div>
            <h2 className="text-2xl font-bold mt-4">Welcome, {me.name}!</h2>
            <p className="text-ink/70">Seat {me.seat} • Waiting for the lecturer to start…</p>
            <div className="mt-8"><SeatMap seats={seats} mySeat={me.seat} /></div>
          </motion.div>
        )}

        {/* 3. Question / reveal */}
        {me && ['question', 'reveal'].includes(session.status) && question && (
          <QuestionCard key={question.id} session={session} question={question} onAnswer={answer} />
        )}

        {me && session.status === 'finished' && (
          <motion.h2 key="done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                     className="text-center text-3xl font-bold mt-20">Thank you! 🎉</motion.h2>
        )}
      </AnimatePresence>

      {/* Name modal */}
      <AnimatePresence>
        {pending && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 backdrop-blur-sm p-4"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.form onSubmit={submitName}
              initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-bold">Seat {pending}</h3>
              <p className="text-sm text-ink/60 mb-4">Enter your name to claim it</p>
              <input autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="Your name"
                     className="w-full rounded-xl border-2 border-ink/20 px-4 py-3 outline-none focus:border-bee" />
              {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setPending(null)}
                        className="flex-1 rounded-xl border-2 border-ink/20 py-3 font-semibold">Cancel</button>
                <button className="flex-1 rounded-xl bg-bee py-3 font-bold text-white hover:bg-bee-dark">Claim seat</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}