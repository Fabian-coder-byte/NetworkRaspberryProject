import { memo } from 'react'
import { Handle, Position } from 'reactflow'

const TYPE_ICONS = {
  router:  '🌐',
  server:  '🖥️',
  pc:      '💻',
  laptop:  '💻',
  phone:   '📱',
  tv:      '📺',
  iot:     '🔌',
  nas:     '🗄️',
  printer: '🖨️',
  unknown: '❓',
}

const STATUS_RING = {
  online:  'ring-green-500',
  offline: 'ring-slate-600',
  unknown: 'ring-slate-700',
}

const STATUS_DOT = {
  online:  'bg-green-400',
  offline: 'bg-slate-500',
  unknown: 'bg-slate-600',
}

function DeviceNode({ data, selected }) {
  const { label, ip, status, device_type, is_gateway, is_new, trusted } = data
  const icon   = TYPE_ICONS[device_type] || TYPE_ICONS.unknown
  const ring   = STATUS_RING[status]     || STATUS_RING.unknown
  const dot    = STATUS_DOT[status]      || STATUS_DOT.unknown

  return (
    <div
      className={`
        relative w-44 bg-slate-800 border rounded-xl px-3 py-2.5 cursor-pointer select-none
        transition-all duration-150
        ${selected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-700'}
        ${is_gateway ? 'ring-2 ring-blue-500/40' : ''}
        ${is_new ? 'ring-2 ring-yellow-500/60' : ''}
        hover:border-slate-500
      `}
    >
      {/* Top handles */}
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Header: icon + status dot */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xl leading-none">{icon}</span>
        <div className="flex items-center gap-1.5">
          {trusted === 1 && <span title="Trusted" className="text-xs text-blue-400">✓</span>}
          {is_new  === 1 && <span title="Nuovo"   className="text-xs text-yellow-400 animate-pulse">★</span>}
          <span className={`w-2 h-2 rounded-full ${dot}`} />
        </div>
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-slate-100 truncate leading-tight" title={label}>
        {label}
      </p>

      {/* IP */}
      <p className="text-xs text-slate-400 mt-0.5 font-mono">{ip}</p>

      {/* Status text */}
      <p className={`text-xs mt-1 font-medium ${status === 'online' ? 'text-green-400' : 'text-slate-500'}`}>
        {status === 'online' ? 'Online' : 'Offline'}
      </p>
    </div>
  )
}

export default memo(DeviceNode)
