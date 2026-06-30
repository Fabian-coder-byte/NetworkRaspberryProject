import { useState } from 'react'
import { X, Cpu, Wifi, WifiOff, Clock, Tag, FileText, ScanSearch, CheckCircle } from 'lucide-react'
import { devices as devicesApi } from '../api/client.js'
import StatusBadge from './StatusBadge.jsx'

const TYPE_OPTIONS = ['unknown', 'router', 'server', 'pc', 'laptop', 'phone', 'tv', 'iot', 'nas', 'printer']

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function DevicePanel({ device, onClose, onUpdated }) {
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [form, setForm] = useState({
    display_name: device.display_name || '',
    device_type:  device.device_type  || 'unknown',
    notes:        device.notes        || '',
    trusted:      device.trusted      === 1,
  })

  async function save() {
    setSaving(true)
    try {
      const updated = await devicesApi.update(device.id, {
        display_name: form.display_name || null,
        device_type:  form.device_type,
        notes:        form.notes || null,
        trusted:      form.trusted,
      })
      onUpdated(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleScanPorts() {
    setScanning(true)
    try {
      await devicesApi.scanPorts(device.id)
      // Reload device to get new ports
      const fresh = await devicesApi.get(device.id)
      onUpdated(fresh)
    } finally {
      setScanning(false)
    }
  }

  const ports = device.ports || []

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div>
          <h2 className="font-semibold text-slate-100 truncate">
            {device.display_name || device.hostname || device.ip}
          </h2>
          <p className="text-xs text-slate-400 font-mono">{device.ip}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusBadge status={device.last_status} isNew={device.is_new === 1} />
          {device.is_gateway === 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-700/50">
              Gateway
            </span>
          )}
        </div>

        {/* Info grid */}
        <div className="space-y-2 text-sm">
          {[
            ['MAC',      device.mac],
            ['Vendor',   device.vendor],
            ['Hostname', device.hostname],
            ['Tipo',     device.device_type],
          ].map(([label, val]) => val ? (
            <div key={label} className="flex gap-2">
              <span className="text-slate-500 w-20 shrink-0">{label}</span>
              <span className="text-slate-200 font-mono text-xs break-all">{val}</span>
            </div>
          ) : null)}
        </div>

        {/* Times */}
        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            Prima vista: {fmt(device.first_seen)}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            Ultima vista: {fmt(device.last_seen)}
          </div>
        </div>

        {/* Open ports */}
        {ports.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Porte aperte ({ports.length})
            </h3>
            <div className="space-y-1">
              {ports.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-slate-700/50 rounded px-2 py-1">
                  <span className="font-mono text-orange-400">{p.port}/{p.protocol}</span>
                  <span className="text-slate-300">{p.service || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit form */}
        {editing ? (
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nome visualizzato</label>
              <input
                type="text"
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder={device.hostname || device.ip}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tipo dispositivo</label>
              <select
                value={form.device_type}
                onChange={e => setForm(f => ({ ...f, device_type: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Note</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.trusted}
                onChange={e => setForm(f => ({ ...f, trusted: e.target.checked }))}
                className="accent-blue-500"
              />
              Dispositivo trusted
            </label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded py-1.5 transition-colors"
              >
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded py-1.5 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-700 space-y-2">
            {device.notes && (
              <p className="text-xs text-slate-400 italic">{device.notes}</p>
            )}
            <button
              onClick={() => setEditing(true)}
              className="w-full flex items-center justify-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded py-1.5 transition-colors"
            >
              <Tag size={14} /> Rinomina / Modifica
            </button>
            <button
              onClick={handleScanPorts}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded py-1.5 transition-colors"
            >
              <ScanSearch size={14} />
              {scanning ? 'Scansione…' : 'Scansiona porte'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
