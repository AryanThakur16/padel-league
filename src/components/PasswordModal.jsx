import { useState, useEffect, useRef } from 'react'

const PASSWORD = 'P123'

export default function PasswordModal({ message, onConfirm, onCancel }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (value === PASSWORD) {
      onConfirm()
    } else {
      setError(true)
      setValue('')
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="text-2xl mb-3 text-center">🔒</div>
        <h2 className="text-base font-semibold text-slate-800 text-center mb-1">Password required</h2>
        <p className="text-sm text-slate-500 text-center mb-5">{message}</p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Enter password"
            className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors mb-3 ${
              error ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-green-500'
            }`}
          />
          {error && <p className="text-red-500 text-xs text-center mb-3">Incorrect password</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value}
              className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-40"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
