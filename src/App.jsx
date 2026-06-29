import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import Nav from './components/Nav'
import LeagueSelect from './pages/LeagueSelect'
import LeagueTable from './pages/LeagueTable'
import Players from './pages/Players'
import Sessions from './pages/Sessions'
import SessionDetail from './pages/SessionDetail'
import PlayerStats from './pages/PlayerStats'
import LeagueSettings from './pages/LeagueSettings'

const CONFIGURED =
  import.meta.env.VITE_SUPABASE_URL &&
  !import.meta.env.VITE_SUPABASE_URL.includes('your-project')

function SetupScreen() {
  const sql = `create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  league_id uuid references leagues(id) on delete cascade,
  created_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  session_number int not null,
  date date,
  type text not null default 'americano',
  league_id uuid references leagues(id) on delete cascade,
  created_at timestamptz default now()
);

create table session_slots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  player_id uuid references players(id),
  slot int not null
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  round int not null,
  court text not null,
  team_a_p1 uuid references players(id),
  team_a_p2 uuid references players(id),
  team_b_p1 uuid references players(id),
  team_b_p2 uuid references players(id),
  score_a int,
  score_b int
);

alter table leagues enable row level security;
alter table players enable row level security;
alter table sessions enable row level security;
alter table session_slots enable row level security;
alter table matches enable row level security;

create policy "public_all" on leagues for all using (true) with check (true);
create policy "public_all" on players for all using (true) with check (true);
create policy "public_all" on sessions for all using (true) with check (true);
create policy "public_all" on session_slots for all using (true) with check (true);
create policy "public_all" on matches for all using (true) with check (true);`

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-lg w-full">
        <div className="text-5xl text-center mb-3">🎾</div>
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">Padel League</h1>
        <p className="text-slate-500 text-sm text-center mb-6">One-time setup needed</p>
        <div className="space-y-4 text-sm">
          <Step n={1} title="Create a free Supabase project">
            Go to <strong>supabase.com</strong> → New project.
          </Step>
          <Step n={2} title="Run this SQL in the SQL Editor">
            <pre className="bg-slate-900 text-green-400 rounded-lg p-3 text-xs overflow-auto mt-2 whitespace-pre">{sql}</pre>
          </Step>
          <Step n={3} title="Create a .env.local file">
            <pre className="bg-slate-900 text-green-400 rounded-lg p-3 text-xs mt-2">{`VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`}</pre>
          </Step>
          <Step n={4} title="Restart the dev server">
            <pre className="bg-slate-900 text-green-400 rounded-lg p-3 text-xs mt-2">npm run dev</pre>
          </Step>
        </div>
      </div>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">{n}</span>
      <div>
        <p className="font-semibold text-slate-700">{title}</p>
        <div className="text-slate-500 mt-0.5">{children}</div>
      </div>
    </div>
  )
}

function LeagueShell() {
  const { leagueId } = useParams()
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav leagueId={leagueId} />
      <div className="md:pl-56 pb-20 md:pb-6">
        <Routes>
          <Route index element={<LeagueTable />} />
          <Route path="players" element={<Players />} />
          <Route path="players/:id" element={<PlayerStats />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="sessions/:id" element={<SessionDetail />} />
          <Route path="settings" element={<LeagueSettings />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  if (!CONFIGURED) return <SetupScreen />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LeagueSelect />} />
        <Route path="/leagues/:leagueId/*" element={<LeagueShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
