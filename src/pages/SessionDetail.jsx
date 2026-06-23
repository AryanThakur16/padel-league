import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateMatches } from '../utils/americano'

function ScoreInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, (value ?? 0) - 1))}
        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
      >−</button>
      <input
        type="number"
        value={value ?? ''}
        min={0} max={9}
        onChange={e => {
          const v = parseInt(e.target.value)
          onChange(isNaN(v) ? null : Math.min(9, Math.max(0, v)))
        }}
        className="w-12 h-10 text-center text-xl font-bold border-2 border-slate-200 rounded-lg focus:outline-none focus:border-green-500 bg-white"
        placeholder="—"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(9, (value ?? 0) + 1))}
        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
      >+</button>
    </div>
  )
}

function MatchCard({ match, playerById, onSave }) {
  const [scoreA, setScoreA] = useState(match.score_a)
  const [scoreB, setScoreB] = useState(match.score_b)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef(null)

  const p1a = playerById[match.team_a_p1]?.name ?? '?'
  const p2a = playerById[match.team_a_p2]?.name ?? '?'
  const p1b = playerById[match.team_b_p1]?.name ?? '?'
  const p2b = playerById[match.team_b_p2]?.name ?? '?'

  function triggerSave(a, b) {
    if (a == null || b == null) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      const { error } = await supabase
        .from('matches')
        .update({ score_a: a, score_b: b })
        .eq('id', match.id)
      if (!error) {
        setSaved(true)
        onSave(match.id, a, b)
        setTimeout(() => setSaved(false), 2000)
      }
      setSaving(false)
    }, 800)
  }

  function handleA(v) { setScoreA(v); setSaved(false); triggerSave(v, scoreB) }
  function handleB(v) { setScoreB(v); setSaved(false); triggerSave(scoreA, v) }

  const result = scoreA != null && scoreB != null
    ? scoreA > scoreB ? '🟩 A wins' : scoreA < scoreB ? '🟥 B wins' : '🟨 Draw'
    : null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Round {match.round} · Court {match.court}
        </span>
        {saving && <span className="text-xs text-slate-400">Saving…</span>}
        {saved && <span className="text-xs text-green-600">✓ Saved</span>}
      </div>

      {/* Team A row */}
      <div className="flex items-center justify-between py-2 border-b border-slate-100">
        <div className="flex-1 min-w-0 mr-3">
          <span className="text-xs font-semibold text-green-600 uppercase">A</span>
          <div className="font-semibold text-slate-800 text-sm truncate">{p1a} &amp; {p2a}</div>
        </div>
        <ScoreInput value={scoreA} onChange={handleA} />
      </div>

      {/* Team B row */}
      <div className="flex items-center justify-between py-2">
        <div className="flex-1 min-w-0 mr-3">
          <span className="text-xs font-semibold text-slate-400 uppercase">B</span>
          <div className="font-semibold text-slate-800 text-sm truncate">{p1b} &amp; {p2b}</div>
        </div>
        <ScoreInput value={scoreB} onChange={handleB} />
      </div>

      {result && (
        <div className="mt-3 text-center text-xs text-slate-500">{result}</div>
      )}
    </div>
  )
}

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [slots, setSlots] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedPlayers, setSelectedPlayers] = useState(Array(8).fill(''))
  const [playerPoints, setPlayerPoints] = useState({})
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: sess }, { data: allPlayers }, { data: sl }, { data: mt }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', id).single(),
      supabase.from('players').select('*').order('name'),
      supabase.from('session_slots').select('*, players(id, name)').eq('session_id', id).order('slot'),
      supabase.from('matches').select('*').eq('session_id', id).order('round').order('court'),
    ])
    setSession(sess)
    setPlayers(allPlayers || [])
    setSlots(sl || [])
    setMatches(mt || [])

    if (sl && sl.length === 8) {
      const arr = Array(8).fill('')
      sl.forEach(s => { arr[s.slot - 1] = s.player_id })
      setSelectedPlayers(arr)
    }

    // compute points tally from matches
    if (mt) computePoints(mt)
    setLoading(false)
  }

  function computePoints(mt) {
    const pts = {}
    for (const m of mt) {
      if (m.score_a == null || m.score_b == null) continue
      for (const [pid, s] of [[m.team_a_p1, m.score_a],[m.team_a_p2, m.score_a],[m.team_b_p1, m.score_b],[m.team_b_p2, m.score_b]]) {
        pts[pid] = (pts[pid] || 0) + s
      }
    }
    setPlayerPoints(pts)
  }

  function handleSave(matchId, a, b) {
    setMatches(prev => {
      const updated = prev.map(m => m.id === matchId ? { ...m, score_a: a, score_b: b } : m)
      computePoints(updated)
      return updated
    })
  }

  async function startSession() {
    const filled = selectedPlayers.filter(Boolean)
    if (filled.length !== 8) return alert('Please select all 8 players.')
    const unique = new Set(filled)
    if (unique.size !== 8) return alert('Each player can only appear once.')
    setStarting(true)

    // Delete existing slots/matches if any
    await supabase.from('session_slots').delete().eq('session_id', id)
    await supabase.from('matches').delete().eq('session_id', id)

    // Insert slots
    const slotRows = selectedPlayers.map((pid, i) => ({
      session_id: id, player_id: pid, slot: i + 1,
    }))
    await supabase.from('session_slots').insert(slotRows)

    // Generate + insert matches
    const playerObjs = selectedPlayers.map(pid => players.find(p => p.id === pid))
    const matchRows = generateMatches(id, playerObjs)
    await supabase.from('matches').insert(matchRows)

    await load()
    setStarting(false)
  }

  async function resetSession() {
    if (!confirm('Reset this session? All player selections and scores will be deleted.')) return
    await supabase.from('session_slots').delete().eq('session_id', id)
    await supabase.from('matches').delete().eq('session_id', id)
    setSlots([])
    setMatches([])
    setSelectedPlayers(Array(8).fill(''))
    setPlayerPoints({})
  }

  async function deleteSession() {
    if (!confirm('Delete this entire session? This cannot be undone.')) return
    await supabase.from('sessions').delete().eq('id', id)
    navigate('/sessions')
  }

  const playerById = Object.fromEntries(players.map(p => [p.id, p]))
  const sessionReady = slots.length === 8

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>
  if (!session) return <div className="p-6 text-slate-400 text-sm">Session not found.</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate('/sessions')} className="text-sm text-slate-400 hover:text-slate-600 mb-1 flex items-center gap-1">
            ← Sessions
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Session {session.session_number}</h1>
          {session.date && (
            <p className="text-slate-500 text-sm mt-0.5">
              {new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        {sessionReady && (
          <button onClick={resetSession} className="text-xs text-slate-400 hover:text-red-500 transition-colors mt-2">
            Reset
          </button>
        )}
      </div>

      {/* Player Selection */}
      {!sessionReady ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-slate-800 mb-1">Select 8 Players</h2>
          <p className="text-xs text-slate-400 mb-4">The Americano rotation will be auto-generated from these slots.</p>
          <div className="grid grid-cols-2 gap-3">
            {Array(8).fill(null).map((_, i) => (
              <div key={i}>
                <label className="block text-xs text-slate-500 mb-1">Slot {i + 1}</label>
                <select
                  value={selectedPlayers[i]}
                  onChange={e => {
                    const arr = [...selectedPlayers]
                    arr[i] = e.target.value
                    setSelectedPlayers(arr)
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">— pick player —</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id} disabled={selectedPlayers.includes(p.id) && selectedPlayers[i] !== p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {players.length < 8 && (
            <p className="text-amber-600 text-xs mt-3">⚠️ You need at least 8 players registered. Go to the Players tab to add more.</p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={startSession}
              disabled={starting || selectedPlayers.filter(Boolean).length !== 8}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {starting ? 'Generating…' : '🎾 Start Session & Generate Matches'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Players attending */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Players This Session</h2>
            <div className="flex flex-wrap gap-2">
              {slots.map(s => (
                <span key={s.id} className="bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {playerById[s.player_id]?.name}
                </span>
              ))}
            </div>
          </div>

          {/* Points tally */}
          {Object.keys(playerPoints).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Points Tally</h2>
              <div className="space-y-1.5">
                {slots
                  .map(s => ({ name: playerById[s.player_id]?.name, pts: playerPoints[s.player_id] ?? 0, id: s.player_id }))
                  .sort((a, b) => b.pts - a.pts)
                  .map((row, i) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${Math.max(4, (row.pts / Math.max(...Object.values(playerPoints), 1)) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 w-16 text-right">{row.name}</span>
                      <span className="text-sm font-bold text-green-700 w-6 text-right">{row.pts}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Match cards */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Match Scores</h2>
            {matches.map(m => (
              <MatchCard key={m.id} match={m} playerById={playerById} onSave={handleSave} />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 text-center">
        <button onClick={deleteSession} className="text-xs text-slate-300 hover:text-red-400 transition-colors">
          Delete session
        </button>
      </div>
    </div>
  )
}
