import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PasswordModal from '../components/PasswordModal'

function DangerCard({ icon, title, description, buttonLabel, buttonStyle, onClick }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{icon}</span>
        <div>
          <div className="font-semibold text-slate-800 text-sm">{title}</div>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${buttonStyle}`}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

export default function LeagueSettings() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const [leagueName, setLeagueName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [modal, setModal] = useState(null) // 'rename' | 'reset' | 'delete'

  useEffect(() => {
    supabase.from('leagues').select('name').eq('id', leagueId).single()
      .then(({ data }) => {
        setLeagueName(data?.name || '')
        setRenameValue(data?.name || '')
      })
  }, [leagueId])

  async function doRename() {
    setModal(null)
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === leagueName) return
    setSaving(true)
    const { error } = await supabase.from('leagues').update({ name: trimmed }).eq('id', leagueId)
    if (!error) {
      setLeagueName(trimmed)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function doReset() {
    setModal(null)
    // Delete all sessions — cascades to session_slots and matches
    await supabase.from('sessions').delete().eq('league_id', leagueId)
  }

  async function doDelete() {
    setModal(null)
    // Delete league — cascades to players, sessions, slots, matches
    await supabase.from('leagues').delete().eq('id', leagueId)
    navigate('/')
  }

  const nameChanged = renameValue.trim() !== leagueName && renameValue.trim().length > 0

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">League Settings</h1>
      <p className="text-sm text-slate-400 mb-8">{leagueName}</p>

      {/* Rename */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">League Name</h2>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <label className="block text-xs font-medium text-slate-500 mb-2">Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={renameValue}
              onChange={e => { setRenameValue(e.target.value); setSaved(false) }}
              maxLength={50}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={() => { if (nameChanged) setModal('rename') }}
              disabled={!nameChanged || saving}
              className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-green-700 transition-colors"
            >
              {saving ? '…' : saved ? '✓ Saved' : 'Rename'}
            </button>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Danger Zone</h2>
        <div className="space-y-3">
          <DangerCard
            icon="🔄"
            title="Reset League"
            description="Delete all sessions and scores. Players stay, league stays. This cannot be undone."
            buttonLabel="Reset"
            buttonStyle="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            onClick={() => setModal('reset')}
          />
          <DangerCard
            icon="🗑️"
            title="Delete League"
            description="Permanently delete this league and all its players, sessions, and scores."
            buttonLabel="Delete"
            buttonStyle="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            onClick={() => setModal('delete')}
          />
        </div>
      </section>

      {modal === 'rename' && (
        <PasswordModal
          message={`Enter the password to rename this league to "${renameValue.trim()}".`}
          onConfirm={doRename}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'reset' && (
        <PasswordModal
          message="Enter the password to reset this league. All sessions and scores will be deleted. Players will be kept."
          onConfirm={doReset}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'delete' && (
        <PasswordModal
          message="Enter the password to permanently delete this league and all its data."
          onConfirm={doDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
