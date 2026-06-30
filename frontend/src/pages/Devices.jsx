import { useEffect, useState } from 'react'
import { Search, RefreshCw, ChevronRight } from 'lucide-react'
import { devices as devicesApi, network as networkApi } from '../api/client.js'
import StatusBadge from '../components/StatusBadge.jsx'
import DevicePanel from '../components/DevicePanel.jsx'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Devices() {
  const [deviceList, setDeviceList] = useState([])
  const [selected, setSelected]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [scanning, setScanning]     = useState(false)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all') // all | online | offline | new

  async function load() {
    setLoading(true)
    const params = {}
    if (filter === 'online')  params.status   = 'online'
    if (filter === 'offline') params.status   = 'offline'
    if (filter === 'new')     params.is_new   = '1'
    if (search)               params.search   = search
    try {
      setDeviceList(await devicesApi.list(params))
    } finally {
      setLoading(false)
    }
  }

  async function scan() {
    setScanning(true)
    try {
      await networkApi.scan()
      await load()
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => { load() }, [filter, search])

  async function openDevice(d) {
    const detail = await devicesApi.get(d.id)
    setSelected(detail)
  }

  function handleUpdated(updated) {
    setDeviceList(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d))
    setSelected(updated)
  }

  const FILTERS = [
    { key: 'all',     label: 'Tutti' },
    { key: 'online',  label: 'Online' },
    { key: 'offline', label: 'Offline' },
    { key: 'new',     label: 'Nuovi' },
  ]

  return (
    <div className="max-w-screen-xl mx-auto flex gap-4 h-[calc(100vh-56px-48px)]">
      {/* List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cerca IP, MAC, nome…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={scan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 text-sm text-slate-400 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-slate-800 border border-slate-700 rounded-xl">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <RefreshCw size={16} className="animate-spin mr-2" /> Caricamento…
            </div>
          ) : deviceList.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
              Nessun dispositivo trovato
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/80 backdrop-blur">
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Dispositivo</th>
                  <th className="text-left px-4 py-3">IP</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">MAC</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Vendor</th>
                  <th className="text-left px-4 py-3">Stato</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Ultima vista</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {deviceList.map(d => (
                  <tr
                    key={d.id}
                    onClick={() => openDevice(d)}
                    className={`hover:bg-slate-700/30 cursor-pointer transition-colors ${
                      selected?.id === d.id ? 'bg-slate-700/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100 truncate max-w-[160px]">
                        {d.display_name || d.hostname || '—'}
                      </div>
                      {d.is_gateway === 1 && (
                        <span className="text-xs text-blue-400">Gateway</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{d.ip}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs hidden md:table-cell">
                      {d.mac || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell truncate max-w-[120px]">
                      {d.vendor || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.last_status} isNew={d.is_new === 1} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {fmt(d.last_seen)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <ChevronRight size={14} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-2">{deviceList.length} dispositivi</p>
      </div>

      {/* Side panel */}
      {selected && (
        <DevicePanel
          device={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
