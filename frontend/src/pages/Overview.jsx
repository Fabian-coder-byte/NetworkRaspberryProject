import { useEffect, useState } from 'react'
import { RefreshCw, Globe, Wifi, Server, Bell, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { network } from '../api/client.js'

function StatCard({ icon: Icon, label, value, sub, color = 'text-slate-100' }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
        <Icon size={15} />
        {label}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function StatusRow({ label, status, detail }) {
  const ok = status === 'ok' || status === 'online'
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-slate-500">{detail}</span>}
        {ok
          ? <CheckCircle size={16} className="text-green-400" />
          : <XCircle    size={16} className="text-red-400" />
        }
      </div>
    </div>
  )
}

export default function Overview() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setData(await network.overview())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function scan() {
    setScanning(true)
    try {
      await network.scan()
      await load()
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw size={20} className="animate-spin mr-2" /> Caricamento…
      </div>
    )
  }

  const s = data?.stats || {}

  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Overview Rete</h1>
        <button
          onClick={scan}
          disabled={scanning}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scansione…' : 'Scansiona ora'}
        </button>
      </div>

      {/* Network info banner */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-slate-500">Host IP</span>
          <p className="font-mono font-medium text-slate-100">{data?.hostIp || '—'}</p>
        </div>
        <div>
          <span className="text-slate-500">Gateway</span>
          <p className="font-mono font-medium text-slate-100">{data?.gateway || '—'}</p>
        </div>
        <div>
          <span className="text-slate-500">Subnet</span>
          <p className="font-mono font-medium text-slate-100">{data?.subnet || '—'}</p>
        </div>
        <div>
          <span className="text-slate-500">Interfaccia</span>
          <p className="font-mono font-medium text-slate-100">{data?.interface || '—'}</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Server}        label="Totale dispositivi" value={s.total}   />
        <StatCard icon={Wifi}          label="Online"             value={s.online}  color="text-green-400" />
        <StatCard icon={Server}        label="Offline"            value={s.offline} color="text-slate-400" />
        <StatCard icon={Bell}          label="Alert aperti"       value={s.alerts}  color={s.alerts > 0 ? 'text-yellow-400' : 'text-slate-100'} />
      </div>

      {/* Status checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Connettività</h2>
          <StatusRow
            label="Internet"
            status={data?.internet?.status}
            detail={data?.internet?.latencyMs != null ? `${data.internet.latencyMs.toFixed(1)} ms` : null}
          />
          <StatusRow
            label="Gateway"
            status={data?.gateway_ping?.reachable ? 'online' : 'offline'}
            detail={data?.gateway_ping?.latencyMs != null ? `${data.gateway_ping.latencyMs.toFixed(1)} ms` : null}
          />
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">DNS</h2>
          <StatusRow
            label="Risoluzione DNS"
            status={data?.dns?.status}
            detail={data?.dns?.responseMs != null ? `${data.dns.responseMs} ms` : null}
          />
          {(data?.dns?.servers || []).map(s => (
            <div key={s} className="text-xs text-slate-500 py-1">
              Server: <span className="font-mono text-slate-400">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {s.new > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">
              {s.new} nuovo/i dispositivo/i rilevato/i
            </p>
            <p className="text-xs text-yellow-600">
              Controlla la sezione Dispositivi per identificarli
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
