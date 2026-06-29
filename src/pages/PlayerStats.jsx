import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computePlayerStats } from '../utils/stats'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-slate-800">{value ?? '—'}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function PlayerStats() {
  const { leagueId, id } = useParams()
  const navigate = useNavigate()
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id, leagueId])

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: allPlayers }, { data: sessions }] = await Promise.all([
      supabase.from('players').select('*').eq('id', id).single(),
      supabase.from('players').select('*').eq('league_id', leagueId),
      supabase.from('sessions').select('*').eq('league_id', leagueId).order('session_number'),
    ])
    const sessionIds = (sessions || []).map(s => s.id)
    const [{ data: slots }, { data: matches }] = await Promise.all([
      sessionIds.length
        ? supabase.from('session_slots').select('*').in('session_id', sessionIds)
        : Promise.resolve({ data: [] }),
      sessionIds.length
        ? supabase.from('matches').select('*').in('session_id', sessionIds)
        : Promise.resolve({ data: [] }),
    ])
    setPlayer(p)
    if (p) {
      setStats(computePlayerStats(id, allPlayers || [], sessions || [], slots || [], matches || []))
    }
    setLoading(false)
  }

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>
  if (!player) return <div className="p-6 text-slate-400 text-sm">Player not found.</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate('../players')} className="text-sm text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1">
        ← Players
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-6">{player.name}</h1>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Points" value={stats.points} />
        <StatCard label="Win Rate" value={stats.winPct != null ? `${stats.winPct}%` : '—'} />
        <StatCard label="Sessions" value={stats.sessionsAttended} />
        <StatCard label="Matches" value={stats.matchesPlayed} />
        <StatCard label="Games Won" value={stats.gamesWon} />
        <StatCard label="Games Lost" value={stats.gamesLost} />
      </div>

      {/* Per-session */}
      {stats.sessionsAttended > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Points per Session</h2>
            <div className="flex gap-4 text-xs text-slate-400">
              {stats.bestSession && <span>🔥 Best: <strong className="text-green-700">{stats.bestSession.points} pts</strong> (S{stats.bestSession.session.session_number})</span>}
              {stats.worstSession && stats.bestSession?.session.id !== stats.worstSession?.session.id && (
                <span>📉 Worst: <strong>{stats.worstSession.points} pts</strong> (S{stats.worstSession.session.session_number})</span>
              )}
            </div>
          </div>
          {stats.bySession.filter(s => s.attended).map(({ session, gamesWon, gamesLost, points }) => (
            <div key={session.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-xs text-slate-400 w-20">Session {session.session_number}</span>
              <div className="flex-1">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: `${stats.gamesWon > 0 ? (points / stats.gamesWon * 100) : 0}%`, minWidth: points > 0 ? 8 : 0 }} />
              </div>
              <span className="text-xs text-slate-500 w-20 text-right">{gamesWon}W – {gamesLost}L</span>
              <span className="text-sm font-bold text-green-700 w-8 text-right">{points}</span>
            </div>
          ))}
        </div>
      )}

      {/* Partner Analysis */}
      {stats.partners.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Partner Analysis</h2>
            <p className="text-xs text-slate-400 mt-0.5">Win rate when playing together</p>
          </div>
          <div className="grid grid-cols-[1fr_4rem_4rem_4rem_4rem] gap-x-2 px-4 py-2 bg-slate-50 text-xs text-slate-400 font-semibold uppercase tracking-wide border-b border-slate-100">
            <div>Partner</div>
            <div className="text-center">Matches</div>
            <div className="text-center">Won</div>
            <div className="text-center">Lost</div>
            <div className="text-center">Win%</div>
          </div>
          {stats.partners.map(({ player: p, matches, won, lost, winPct }) => (
            <div key={p?.id ?? 'unk'} className="grid grid-cols-[1fr_4rem_4rem_4rem_4rem] gap-x-2 px-4 py-2.5 border-b border-slate-50 last:border-0 items-center text-sm">
              <div className="font-medium text-slate-700">{p?.name ?? '?'}</div>
              <div className="text-center text-slate-500">{matches}</div>
              <div className="text-center text-slate-500">{won}</div>
              <div className="text-center text-slate-500">{lost}</div>
              <div className={`text-center font-semibold ${parseFloat(winPct) >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                {winPct != null ? `${winPct}%` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Opponent Analysis */}
      {stats.opponents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Opponent Analysis</h2>
            <p className="text-xs text-slate-400 mt-0.5">Win rate when facing each opponent</p>
          </div>
          <div className="grid grid-cols-[1fr_4rem_4rem_4rem_4rem] gap-x-2 px-4 py-2 bg-slate-50 text-xs text-slate-400 font-semibold uppercase tracking-wide border-b border-slate-100">
            <div>Opponent</div>
            <div className="text-center">Matches</div>
            <div className="text-center">Won</div>
            <div className="text-center">Lost</div>
            <div className="text-center">Win%</div>
          </div>
          {stats.opponents.map(({ player: p, matches, won, lost, winPct }) => (
            <div key={p?.id ?? 'unk'} className="grid grid-cols-[1fr_4rem_4rem_4rem_4rem] gap-x-2 px-4 py-2.5 border-b border-slate-50 last:border-0 items-center text-sm">
              <div className="font-medium text-slate-700">{p?.name ?? '?'}</div>
              <div className="text-center text-slate-500">{matches}</div>
              <div className="text-center text-slate-500">{won}</div>
              <div className="text-center text-slate-500">{lost}</div>
              <div className={`text-center font-semibold ${parseFloat(winPct) >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                {winPct != null ? `${winPct}%` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {stats.matchesPlayed === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">No match data yet for this player.</p>
        </div>
      )}
    </div>
  )
}
