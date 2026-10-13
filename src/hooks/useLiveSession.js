import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useLiveSession(code) {
  const [session, setSession] = useState(null)
  const [seats, setSeats] = useState([])
  const [question, setQuestion] = useState(null)
  const [connected, setConnected] = useState(true)

  // Full state fetch — used on mount AND after any reconnect/tab-return,
  // so a missed websocket event can never leave a trainee out of sync.
  const refresh = useCallback(async (sessionId) => {
    let id = sessionId
    let ses
    if (id) {
      ses = (await supabase.from('sessions').select('*').eq('id', id).single()).data
    } else {
      ses = (await supabase.from('sessions').select('*').eq('code', code.toUpperCase()).single()).data
    }
    if (!ses) return null
    setSession(ses)

    const { data: st } = await supabase.from('seats').select('*')
      .eq('session_id', ses.id).order('seat_number')
    setSeats(st || [])

    if (ses.current_question_id && ses.status !== 'lobby') {
      const { data: q } = await supabase.from('questions').select('*')
        .eq('id', ses.current_question_id).single()
      setQuestion(q)
    } else setQuestion(null)
    return ses
  }, [code])

  useEffect(() => {
    let channel
    let sid
    let cancelled = false

    ;(async () => {
      const ses = await refresh()
      if (!ses || cancelled) return
      sid = ses.id

      channel = supabase.channel(`session-${sid}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sid}` },
          () => refresh(sid))
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'seats', filter: `session_id=eq.${sid}` },
          (payload) => setSeats(prev =>
            prev.map(s => s.seat_number === payload.new?.seat_number ? payload.new : s)))
        .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    })()

    // Re-sync when the phone wakes up / tab becomes visible again
    const onVisible = () => { if (document.visibilityState === 'visible' && sid) refresh(sid) }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [refresh])

  return { session, seats, question, connected }
}