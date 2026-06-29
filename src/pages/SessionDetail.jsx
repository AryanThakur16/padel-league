import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateMatches } from '../utils/americano'
import { generateKingOfCourtMatches } from '../utils/kingOfCourt'
import PasswordModal from '../components/PasswordModal'

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

function MatchCard({ match, playerById, onSave, labelA = 'A', labelB = 'B' }) {
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
    ? scoreA > scoreB ? `🟩 ${labelA} wins`
    : scoreA < scoreB ? `🟥 ${labelB} wins`
    : '🟨 Draw'
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

      <div className="flex items-center justify-between py-2 border-b border-slate-100">
        <div className="flex-1 min-w-0 mr-3">
          <span className="text-xs font-semibold text-green-600 uppercase">{labelA}</span>
          <div className="font-semibold text-slate-800 text-sm truncate">{p1a} &amp; {p2a}</div>
        </div>
        <ScoreInput value={scoreA} onChange={handleA} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex-1 min-w-0 mr-3">
          <span className="text-xs font-semibold text-slate-400 uppercase">{labelB}</span>
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

const TEAM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const EMPTY_TEAMS = Array(6).fill(null).map(() => ['', ''])

export default function SessionDetail() {
  const { leagueId, id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [slots, setSlots] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedPlayers, setSelectedPlayers] = useState(Array(8).fill(''))
  const [teamPlayers, setTeamPlayers] = useState(EMPTY_TEAMS.map(t => [...t]))
  const [numTeams, setNumTeams] = useState(4)
  const [playerPoints, setPlayerPoints] = useState({})
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [modal, setModal] = useState(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: sess }, { data: allPlayers }, { data: sl }, { data: mt }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', id).single(),
      supabase.from('players').select('*').eq('league_id', leagueId).order('name'),
      supabase.from('session_slots').select('*, players(id, name)').eq('session_id', id).order('slot'),
      supabase.from('matches').select('*').eq('session_id', id).order('round').order('court'),
    ])
    setSession(sess)
    setPlayers(allPlayers || [])
    setSlots(sl || [])
    setMatches(mt || [])

    if (sess?.type === 'king_of_court') {
      if (sl && sl.length >= 6) {
        const numT = sl.length / 2
        setNumTeams(numT)
        const tp = EMPTY_TEAMS.map((_, t) => [
          sl.find(s => s.slot === t * 2 + 1)?.player_id || '',
          sl.find(s => s.slot === t * 2 + 2)?.player_id || '',
        ])
        setTeamPlayers(tp)
      }
    } else {
      if (sl && sl.length === 8) {
        const arr = Array(8).fill('')
        sl.forEach(s => { arr[s.slot - 1] = s.player_id })
        setSelectedPlayers(arr)
      }
    }

    if (mt) computePoints(mt)
    setLoading(false)
  }

  function computePoints(mt) {
    const pts = {}
    for (const m of mt) {
      if (m.score_a == null || m.score_b == null) continue
      for (const [pid, s] of [
        [m.team_a_p1, m.score_a], [m.team_a_p2, m.score_a],
        [m.team_b_p1, m.score_b], [m.team_b_p2, m.score_b],
      ]) {
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

  // Americano start
  async function startSession() {
    const filled = selectedPlayers.filter(Boolean)
    if (filled.length !== 8) return alert('Please select all 8 players.')
    if (new Set(filled).size !== 8) return alert('Each player can only appear once.')
    setStarting(true)
    await supabase.from('session_slots').delete().eq('session_id', id)
    await supabase.from('matches').delete().eq('session_id', id)
    const slotRows = selectedPlayers.map((pid, i) => ({ session_id: id, player_id: pid, slot: i + 1 }))
    await supabase.from('session_slots').insert(slotRows)
    const playerObjs = selectedPlayers.map(pid => players.find(p => p.id === pid))
    await supabase.from('matches').insert(generateMatches(id, playerObjs))
    await load()
    setStarting(false)
  }

  // King of Court start
  async function startKingOfCourt() {
    const teams = teamPlayers.slice(0, numTeams)
    const allPids = teams.flat()
    if (allPids.some(p => !p)) return alert('Please select all players for each team.')
    if (new Set(allPids).size !== allPids.length) return alert('Each player can only appear in one team.')
    setStarting(true)
    await supabase.from('session_slots').delete().eq('session_id', id)
    await supabase.from('matches').delete().eq('session_id', id)
    const slotRows = []
    teams.forEach((team, t) => {
      slotRows.push({ session_id: id, player_id: team[0], slot: t * 2 + 1 })
      slotRows.push({ session_id: id, player_id: team[1], slot: t * 2 + 2 })
    })
    await supabase.from('session_slots').insert(slotRows)
    const teamObjs = teams.map(([p1, p2]) => ({ p1, p2 }))
    await supabase.from('matches').insert(generateKingOfCourtMatches(id, teamObjs))
    await load()
    setStarting(false)
  }

  async function doReset() {
    setModal(null)
    await supabase.from('session_slots').delete().eq('session_id', id)
    await supabase.from('matches').delete().eq('session_id', id)
    setSlots([])
    setMatches([])
    setSelectedPlayers(Array(8).fill(''))
    setTeamPlayers(EMPTY_TEAMS.map(t => [...t]))
    setPlayerPoints({})
  }

  async function doDelete() {
    setModal(null)
    await supabase.from('sessions').delete().eq('id', id)
    navigate('../sessions')
  }

  // Derive team label for a player (King of Court only)
  function teamLabel(playerId) {
    const slot = slots.find(s => s.player_id === playerId)
    if (!slot) return '?'
    return TEAM_LETTERS[Math.floor((slot.slot - 1) / 2)]
  }

  const playerById = Object.fromEntries(players.map(p => [p.id, p]))
  const isKoC = session?.type === 'king_of_court'
  const sessionReady = isKoC ? (slots.length >= 6 && slots.length % 2 === 0) : slots.length === 8

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>
  if (!session) return <div className="p-6 text-slate-400 text-sm">Session not found.</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate('../sessions')} className="text-sm text-slate-400 hover:text-slate-600 mb-1 flex items-center gap-1">
            ← Sessions
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Session {session.session_number}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{isKoC ? '👑 King of Court' : '🎾 Americano'}</p>
          {session.date && (
            <p className="text-slate-500 text-sm mt-0.5">
              {new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        {sessionReady && (
          <button onClick={() => setModal('reset')} className="text-xs text-slate-400 hover:text-red-500 transition-colors mt-2">
            Reset
          </button>
        )}
      </div>

      {!sessionReady ? (
        isKoC ? (
          /* ── King of Court Setup ── */
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-slate-800 mb-1">👑 King of Court Setup</h2>
            <p className="text-xs text-slate-400 mb-4">Each team plays every other team twice. Scores feed into the league table.</p>

            {/* Number of teams */}
            <label className="block text-xs font-medium text-slate-500 mb-2">Number of Teams</label>
            <div className="flex gap-2 mb-5">
              {[3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumTeams(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    numTeams === n
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-slate-200 text-slate-500 hover:border-amber-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Team selectors */}
            <div className="space-y-4">
              {Array(numTeams).fill(null).map((_, t) => (
                <div key={t} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
                    Team {TEAM_LETTERS[t]}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1].map(p => (
                      <select
                        key={p}
                        value={teamPlayers[t][p]}
                        onChange={e => {
                          const next = teamPlayers.map((team, ti) =>
                            ti === t ? team.map((v, pi) => pi === p ? e.target.value : v) : team
                          )
                          setTeamPlayers(next)
                        }}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                      >
                        <option value="">— pick player —</option>
                        {players.map(pl => {
                          const usedElsewhere = teamPlayers.some((team, ti) =>
                            team.some((pid, pi) => pid === pl.id && !(ti === t && pi === p))
                          )
                          return (
                            <option key={pl.id} value={pl.id} disabled={usedElsewhere}>
                              {pl.name}
                            </option>
                          )
                        })}
                      </select>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startKingOfCourt}
              disabled={starting}
              className="w-full mt-5 bg-amber-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {starting ? 'Generating…' : '👑 Generate King of Court Schedule'}
            </button>
          </div>
        ) : (
          /* ── Americano Setup ── */
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
            <button
              onClick={startSession}
              disabled={starting || selectedPlayers.filter(Boolean).length !== 8}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {starting ? 'Generating…' : '🎾 Start Session & Generate Matches'}
            </button>
          </div>
        )
      ) : (
        <>
          {/* Players / Teams attending */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              {isKoC ? 'Teams This Session' : 'Players This Session'}
            </h2>
            {isKoC ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: slots.length / 2 }, (_, t) => {
                  const p1 = slots.find(s => s.slot === t * 2 + 1)
                  const p2 = slots.find(s => s.slot === t * 2 + 2)
                  return (
                    <div key={t} className="bg-amber-50 rounded-lg p-2.5">
                      <div className="text-xs font-bold text-amber-600 mb-1">Team {TEAM_LETTERS[t]}</div>
                      <div className="text-sm font-medium text-slate-700">{playerById[p1?.player_id]?.name}</div>
                      <div className="text-sm font-medium text-slate-700">{playerById[p2?.player_id]?.name}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map(s => (
                  <span key={s.id} className="bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {playerById[s.player_id]?.name}
                  </span>
                ))}
              </div>
            )}
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
              <MatchCard
                key={m.id}
                match={m}
                playerById={playerById}
                onSave={handleSave}
                labelA={isKoC ? `Team ${teamLabel(m.team_a_p1)}` : 'A'}
                labelB={isKoC ? `Team ${teamLabel(m.team_b_p1)}` : 'B'}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 text-center">
        <button onClick={() => setModal('delete')} className="text-xs text-slate-300 hover:text-red-400 transition-colors">
          Delete session
        </button>
      </div>

      {modal === 'reset' && (
        <PasswordModal
          message="Enter the password to reset this session and clear all scores."
          onConfirm={doReset}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'delete' && (
        <PasswordModal
          message="Enter the password to permanently delete this session."
          onConfirm={doDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
