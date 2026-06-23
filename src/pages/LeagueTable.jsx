import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeLeagueTable, sessionSummary } from '../utils/stats'

export default function LeagueTable() {
  const [table, setTable] = useState([])
  const [summary, setSummary] = useState([])
  const [playerById, setPlayerById] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: players }, { data: sessions }, { data: slots }, { data: matches }] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('sessions').select('*').order('session_number'),
      supabase.from('session_slots').select('*'),
      supabase.from('matches').select('*'),
    ])
    const p = players || []
    const s = sessions || []
    const sl = slots || []
    const m = matches || []

    setPlayerById(Object.fromEntries(p.map(x => [x.id, x])))
    setTable(computeLeagueTable(p, sl, m))
    setSummary(sessionSummary(s, sl, m))
    setLoading(false)
  }

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🏆 Standings</h1>
        <button onClick={load} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">↻ Refresh</button>
      </div>

      {table.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🎾</div>
          <p className="font-medium text-slate-600 mb-1">No data yet</p>
          <p className="text-sm">Add players, create a session, and enter scores to see the standings.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_4.5rem_3rem_3rem_3rem_3.5rem] gap-x-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <div>#</div>
                <div>Player</div>
                <div className="text-center">Sessions</div>
                <div className="text-center">Played</div>
                <div className="text-center">Won</div>
                <div className="text-center">Pts</div>
                <div className="text-center">Win%</div>
              </div>

              {/* Rows */}
              {table.map((row, i) => (
                <button
                  key={row.id}
                  onClick={() => navigate(`/players/${row.id}`)}
                  className="w-full grid grid-cols-[2rem_1fr_4.5rem_3rem_3rem_3rem_3.5rem] gap-x-2 px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-left items-center"
                >
                  <div className="text-sm font-bold text-slate-400">{i + 1}</div>
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-slate-200 text-slate-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                    <span className="font-semibold text-slate-800 text-sm truncate">{row.name}</span>
                  </div>
                  <div className="text-center text-sm text-slate-500">{row.sessions}</div>
                  <div className="text-center text-sm text-slate-500">{row.matchesPlayed}</div>
                  <div className="text-center text-sm text-slate-500">{row.gamesWon}</div>
                  <div className="text-center text-sm font-bold text-green-700">{row.points}</div>
                  <div className="text-center text-sm text-slate-500">{row.winPct != null ? `${row.winPct}%` : '—'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Session Summary */}
      {summary.some(s => s.matches > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Session History</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[540px]">
                <div className="grid grid-cols-[1.2fr_4.5rem_4.5rem_4.5rem_1.8fr] gap-x-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <div>Session</div>
                  <div>Date</div>
                  <div className="text-center">Players</div>
                  <div className="text-center">Matches</div>
                  <div>Session Winner</div>
                </div>
                {summary.filter(s => s.players > 0).map(({ session, players: numP, matches: numM, topPlayerId, topPoints }) => (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    className="w-full grid grid-cols-[1.2fr_4.5rem_4.5rem_4.5rem_1.8fr] gap-x-2 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-left items-center text-sm"
                  >
                    <div className="font-medium text-slate-700">Session {session.session_number}</div>
                    <div className="text-slate-400 text-xs">
                      {session.date ? new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                    <div className="text-center text-slate-500">{numP}</div>
                    <div className="text-center text-slate-500">{numM}</div>
                    <div className="text-slate-700">
                      {topPlayerId ? <><span className="font-medium">{playerById[topPlayerId]?.name}</span> <span className="text-slate-400 text-xs">({topPoints} pts)</span></> : '—'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
