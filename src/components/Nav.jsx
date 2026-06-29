import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, CalendarDays, Users, Settings, ChevronLeft } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'standings', label: 'Standings', Icon: Trophy,       end: true  },
  { key: 'sessions',  label: 'Sessions',  Icon: CalendarDays, end: false },
  { key: 'players',   label: 'Players',   Icon: Users,        end: false },
  { key: 'settings',  label: 'Settings',  Icon: Settings,     end: false },
]

export default function Nav({ leagueId }) {
  const [leagueName, setLeagueName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!leagueId) return
    supabase.from('leagues').select('name').eq('id', leagueId).single()
      .then(({ data }) => setLeagueName(data?.name || ''))
  }, [leagueId])

  const base = `/leagues/${leagueId}`
  function toPath(key) {
    return key === 'standings' ? base : `${base}/${key}`
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-slate-200 flex-col z-20">
        <div className="px-5 py-4 border-b border-slate-200">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors mb-2"
          >
            <ChevronLeft size={13} />
            All Leagues
          </button>
          <div className="font-bold text-slate-800 text-base leading-tight truncate">
            {leagueName || '…'}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ key, label, Icon, end }) => (
            <NavLink
              key={key}
              to={toPath(key)}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Mobile bottom bar ── */}
      {/* Outer wrapper carries the safe-area padding so the white bg fills behind the home indicator */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Icon row — fixed 56 px tall, items perfectly centred */}
        <div className="flex items-center h-14">

          {/* ← Leagues back button — same flex-1 width as every tab */}
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-slate-400 active:text-slate-600 transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={1.8} />
            <span className="text-[10px] font-medium tracking-tight">Leagues</span>
          </button>

          {/* Thin divider */}
          <div className="w-px h-6 bg-slate-100 flex-shrink-0" />

          {/* Page tabs */}
          {NAV_ITEMS.map(({ key, label, Icon, end }) => (
            <NavLink
              key={key}
              to={toPath(key)}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
                  isActive ? 'text-green-600' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="text-[10px] font-medium tracking-tight">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  )
}
