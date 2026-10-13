import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function QuestionCard({ session, question, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const [correct, setCorrect] = useState(null)
  const revealed = session.status === 'reveal'

  useEffect(() => {
    if (revealed) supabase.rpc('get_reveal', { p_session: session.id }).then(({ data }) => setCorrect(data))
  }, [revealed, session.id])

  const pick = async (i) => {
    if (picked !== null || revealed) return
    setPicked(i)                       // optimistic
    const res = await onAnswer(i)
    if (!res?.ok) setPicked(null)      // closed / failed → allow retry
  }

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="px-4 max-w-xl mx-auto">
      {question.image_url && <img src={question.image_url} className="rounded-2xl mb-4 w-full max-h-64 object-contain" />}
      <h2 className="text-xl font-bold mb-5">{question.text}</h2>

      <div className="grid gap-3">
        {question.options.map((opt, i) => {
          const isRight = revealed && i === correct
          const isWrongPick = revealed && i === picked && i !== correct
          return (
            <motion.button key={i} whileTap={{ scale: 0.97 }} onClick={() => pick(i)}
              animate={isRight ? { scale: [1, 1.05, 1] } : {}}
              className={[
                'rounded-2xl p-4 text-left font-semibold border-2 transition-colors',
                isRight ? 'bg-green-500 border-green-500 text-white'
                : isWrongPick ? 'bg-red-500 border-red-500 text-white'
                : picked === i ? 'bg-bee border-bee text-white'
                : 'bg-white border-ink/20 hover:border-bee',
              ].join(' ')}>
              {opt}
            </motion.button>
          )
        })}
      </div>

      {picked !== null && !revealed && (
        <p className="mt-5 text-center text-ink/60 animate-pulse">Answer locked in. Waiting for the others…</p>
      )}
    </motion.div>
  )
}