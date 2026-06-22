import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data || [])
    setLoading(false)
  }

  async function addPlayer(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (players.length >= 16) { setError('Maximum 16 players allowed'); return }
    setAdding(true)
    setError('')
    const { error: err } = await supabase.from('players').insert({ name: trimmed })
    if (err) {
      setError(err.message.includes('unique') ? 'A player with that name already exists.' : err.message)
    } else {
      setName('')
      await load()
    }
    setAdding(false)
  }

  async function deletePlayer(id) {
    if (!confirm('Remove this player? This will also remove them from any sessions.')) return
    await supabase.from('players').delete().eq('id', id)
    setPlayers(p => p.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Players</h1>
      <p className="text-slate-500 text-sm mb-6">{players.length}/16 registered</p>

      <form onSubmit={addPlayer} className="flex gap-2 mb-6">
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder="Player name"
          maxLength={40}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700 transition-colors"
        >
          {adding ? '…' : 'Add'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : players.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-sm">No players yet. Add your first player above.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {players.map((player, i) => (
            <li key={player.id}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer"
              onClick={() => navigate(`/players/${player.id}`)}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="font-medium text-slate-800">{player.name}</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deletePlayer(player.id) }}
                className="text-slate-300 hover:text-red-400 transition-colors p-1"
                title="Remove player"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
