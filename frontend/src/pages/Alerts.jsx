import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Trash2, AlertTriangle, Info } from 'lucide-react'
import { alerts as alertsApi } from '../api/client.js'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

const SEVERITY_STYLE = {
  warning: 'border-yellow-700/50 bg-yellow-900/10',
  error:   'border-red-700/50   bg-red-900/10',
  info:    'border-slate-700    bg-slate-800/50',
}

const SEVERITY_ICON = {
  warning: <AlertTriangle size={16} className="text-yellow-400 shrink-0" />,
  error:   <AlertTriangle size={16} className="text-red-400    shrink-0" />,
  info:    <Info          size={16} className="text-blue-400   shrink-0" />,
}

export default function Alerts() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [unreadOnly, setUnread] = useState(false)

  async function load() {
    setLoading(true)
    try { setList(await alertsApi.list(unreadOnly)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [unreadOnly])

  async function markRead(id) {
    await alertsApi.markRead(id)
    setList(prev => prev.map(a => a.id === id ? { ...a, read_at: new Date().toISOString() } : a))
  }

  async function remove(id) {
    await alertsApi.remove(id)
    setList(prev => prev.filter(a => a.id !== id))
  }

  async function markAllRead() {
    await alertsApi.markAllRead()
    setList(prev => prev.map(a => ({ ...a, read_at: a.read_at || new Date().toISOString() })))
  }

  const unreadCount = list.filter(a => !a.read_at).length

  return (
    <div className="max-w-screen-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-100">Alert</h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full font-medium">
              {unreadCount} nuovi
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={e => setUnread(e.target.checked)}
              className="accent-blue-500"
            />
            Solo non letti
          </label>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 text-sm text-slate-400 rounded-lg transition-colors"
            >
              <CheckCheck size={13} /> Segna tutti letti
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          Caricamento…
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-500">
          <Bell size={32} className="mb-2 opacity-30" />
          <p className="text-sm">Nessun alert</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(a => (
            <div
              key={a.id}
              className={`border rounded-xl p-4 transition-opacity ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info} ${a.read_at ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {SEVERITY_ICON[a.severity] || SEVERITY_ICON.info}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{a.title}</p>
                    <span className="text-xs text-slate-500 shrink-0">{fmt(a.created_at)}</span>
                  </div>
                  {a.message && (
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{a.message}</p>
                  )}
                  {(a.display_name || a.hostname || a.ip) && (
                    <p className="text-xs text-slate-500 mt-1">
                      Dispositivo: {a.display_name || a.hostname || a.ip}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!a.read_at && (
                    <button
                      onClick={() => markRead(a.id)}
                      title="Segna come letto"
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <CheckCheck size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => remove(a.id)}
                    title="Elimina"
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
