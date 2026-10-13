import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getDeviceToken } from '../lib/deviceToken'

export function useTraineeSeat(sessionId) {
  const [me, setMe] = useState(null)       // { seat, name } | null
  const [loading, setLoading] = useState(true)
  const token = getDeviceToken()

  // On every load/refresh: ask the server who this device is
  useEffect(() => {
    if (!sessionId) return
    supabase.rpc('my_seat', { p_session: sessionId, p_token: token })
      .then(({ data }) => { setMe(data); setLoading(false) })
  }, [sessionId, token])

  const claim = useCallback(async (seat, name) => {
    const { data, error } = await supabase.rpc('claim_seat', {
      p_session: sessionId, p_seat: seat, p_name: name, p_token: token,
    })
    if (error) return { ok: false, error: error.message }
    if (data.ok) setMe({ seat: data.seat, name: data.name })
    return data   // { ok:false, error:'seat_taken' } if someone was faster
  }, [sessionId, token])

  const answer = useCallback(async (choice) => {
    const { data } = await supabase.rpc('submit_answer', {
      p_session: sessionId, p_token: token, p_choice: choice,
    })
    return data
  }, [sessionId, token])

  return { me, loading, claim, answer }
}