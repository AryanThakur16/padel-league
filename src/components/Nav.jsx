import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Nav({ leagueId }) {
  const [leagueName, setLeagueName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!leagueId) return
    supabase.from('leagues').select('name').eq('id', leagueId).single()
      .then(({ data }) => setLeagueName(data?.name || ''))
  }, [leagueId])

  const base = `/leagues/${leagueId}`
  const links = [
    { to: base, label: 'Standings', icon: '🏆', end: true },
    { to: `${base}/sessions`, label: 'Sessions', icon: '🎾', end: false },
    { to: `${base}/players`, label: 'Players', icon: '👥', end: false },
  ]

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-slate-200 flex-col z-20">
        {/* League name + back */}
        <div className="px-5 py-4 border-b border-slate-200">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors mb-2 flex items-center gap-1"
          >
            ← All Leagues
          </button>
          <div className="font-bold text-slate-800 text-base leading-tight">🎾 {leagueName || '…'}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex z-20">
        {/* Back to leagues */}
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center justify-center py-2 px-3 gap-0.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="text-xl">‹</span>
          <span>Leagues</span>
        </button>
        <div className="flex-1 flex">
          {links.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-green-600' : 'text-slate-400'
                }`
              }
            >
              <span className="text-xl">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
