export default function StatusBadge({ status, isNew }) {
  if (isNew) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/40 text-yellow-400 border border-yellow-700/50">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        Nuovo
      </span>
    )
  }

  const map = {
    online:  { dot: 'bg-green-400',  text: 'text-green-400',  bg: 'bg-green-900/40',  border: 'border-green-700/50',  label: 'Online'  },
    offline: { dot: 'bg-slate-500',  text: 'text-slate-400',  bg: 'bg-slate-700/40',  border: 'border-slate-600/50',  label: 'Offline' },
    unknown: { dot: 'bg-slate-600',  text: 'text-slate-500',  bg: 'bg-slate-800/40',  border: 'border-slate-700/50',  label: '—'       },
  }

  const s = map[status] || map.unknown

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text} border ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
