import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [matchCounts, setMatchCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [date, setDate] = useState('')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: sData }, { data: mData }] = await Promise.all([
      supabase.from('sessions').select('*').order('session_number'),
      supabase.from('matches').select('id, session_id, score_a, score_b'),
    ])
    setSessions(sData || [])
    const counts = {}
    for (const m of (mData || [])) {
      if (!counts[m.session_id]) counts[m.session_id] = { total: 0, scored: 0 }
      counts[m.session_id].total++
      if (m.score_a != null && m.score_b != null) counts[m.session_id].scored++
    }
    setMatchCounts(counts)
    setLoading(false)
  }

  async function createSession(e) {
    e.preventDefault()
    setCreating(true)
    const nextNumber = sessions.length > 0
      ? Math.max(...sessions.map(s => s.session_number)) + 1
      : 1
    const { data, error } = await supabase
      .from('sessions')
      .insert({ session_number: nextNumber, date: date || null })
      .select()
      .single()
    if (!error && data) {
      navigate(`/sessions/${data.id}`)
    }
    setCreating(false)
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Sessions</h1>

      <form onSubmit={createSession} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Date (optional)</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {creating ? '…' : '+ New Session'}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-2">🎾</div>
          <p className="text-sm">No sessions yet. Create your first session above.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map(session => {
            const mc = matchCounts[session.id]
            const done = mc?.scored ?? 0
            const total = mc?.total ?? 0
            const complete = total > 0 && done === total
            const inProgress = total > 0 && done < total
            const notStarted = total === 0

            return (
              <li key={session.id}>
                <button
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center justify-between hover:border-green-300 hover:shadow-sm transition-all text-left"
                >
                  <div>
                    <div className="font-semibold text-slate-800">Session {session.session_number}</div>
                    {session.date && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {complete && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Complete</span>}
                    {inProgress && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{done}/{total} scored</span>}
                    {notStarted && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Setup</span>}
                    <span className="text-slate-300">›</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
