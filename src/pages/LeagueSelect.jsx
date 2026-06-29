import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const EMOJI_POOL = ['🎾', '🏆', '⚡', '🔥', '🌍', '🌟', '🏅', '⚽', '🎯', '🏄']

function leagueEmoji(name) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return EMOJI_POOL[Math.abs(hash) % EMOJI_POOL.length]
}

export default function LeagueSelect() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('leagues').select('*').order('created_at')
    setLeagues(data || [])
    setLoading(false)
  }

  async function createLeague(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    setError('')
    const { data, error: err } = await supabase
      .from('leagues')
      .insert({ name: trimmed })
      .select()
      .single()
    if (err) {
      setError('Could not create league. Try again.')
      setCreating(false)
      return
    }
    navigate(`/leagues/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center gap-3">
        <span className="text-2xl">🎾</span>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Padel League</h1>
          <p className="text-xs text-slate-400">Select a league to get started</p>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        {/* Create new league */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">Create a new league</h2>
          <form onSubmit={createLeague} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. UK League, Abu Dhabi League…"
              maxLength={50}
              className="flex-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              {creating ? '…' : '+ Create'}
            </button>
          </form>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>

        {/* League list */}
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Your Leagues</h2>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : leagues.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-sm">No leagues yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leagues.map(league => (
              <button
                key={league.id}
                onClick={() => navigate(`/leagues/${league.id}`)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 flex items-center gap-4 hover:border-green-300 hover:shadow-sm transition-all text-left group"
              >
                <span className="text-3xl">{leagueEmoji(league.name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 group-hover:text-green-700 transition-colors">{league.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Created {new Date(league.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span className="text-slate-300 text-lg group-hover:text-green-400 transition-colors">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
