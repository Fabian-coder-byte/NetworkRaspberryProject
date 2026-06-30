import { useEffect, useState, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { RefreshCw } from 'lucide-react'
import { network as networkApi, devices as devicesApi } from '../api/client.js'
import DeviceNode from '../components/DeviceNode.jsx'
import DevicePanel from '../components/DevicePanel.jsx'

const nodeTypes = { deviceNode: DeviceNode }

// Compute a simple radial layout: gateway at top center, others below in rows.
function computeLayout(rawNodes, rawEdges) {
  if (!rawNodes.length) return { nodes: rawNodes, edges: rawEdges }

  const COL_W   = 200
  const ROW_H   = 130
  const COLS    = 5

  const gateway = rawNodes.find(n => n.data.is_gateway)
  const others  = rawNodes.filter(n => !n.data.is_gateway)

  const positioned = rawNodes.map(n => ({ ...n }))

  // Place gateway at center-top
  if (gateway) {
    const gIdx = positioned.findIndex(n => n.id === gateway.id)
    const centerX = Math.floor(COLS / 2) * COL_W
    positioned[gIdx] = { ...positioned[gIdx], position: { x: centerX, y: 40 } }
  }

  // Place others in a grid below
  others.forEach((n, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const idx = positioned.findIndex(p => p.id === n.id)
    positioned[idx] = {
      ...positioned[idx],
      position: { x: col * COL_W, y: ROW_H + row * ROW_H },
    }
  })

  return { nodes: positioned, edges: rawEdges }
}

export default function NetworkMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selected, setSelected]          = useState(null)
  const [loading, setLoading]            = useState(true)
  const [scanning, setScanning]          = useState(false)

  async function loadGraph() {
    setLoading(true)
    try {
      const { nodes: rawNodes, edges: rawEdges } = await networkApi.graph()
      const { nodes: positioned, edges } = computeLayout(rawNodes, rawEdges)
      setNodes(positioned)
      setEdges(edges.map(e => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
        style: { stroke: '#475569', strokeWidth: 1.5 },
        animated: false,
      })))
    } catch (e) {
      console.error('graph load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function scan() {
    setScanning(true)
    try {
      await networkApi.scan()
      await loadGraph()
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => { loadGraph() }, [])

  const onNodeClick = useCallback(async (_, node) => {
    // Load full device detail (with ports, history)
    const detail = await devicesApi.get(node.data.id)
    setSelected(detail)
  }, [])

  function handleDeviceUpdated(updated) {
    // Sync updated data back into React Flow node
    setNodes(prev => prev.map(n =>
      n.data.id === updated.id
        ? { ...n, data: { ...n.data, ...updated } }
        : n
    ))
    setSelected(updated)
  }

  return (
    <div className="flex h-[calc(100vh-56px-48px)] -m-6 overflow-hidden">
      {/* Graph area */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <button
            onClick={scan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 border border-slate-600 hover:border-slate-500 text-sm text-slate-300 rounded-lg backdrop-blur transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scansione…' : 'Aggiorna'}
          </button>
          {loading && (
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded-lg backdrop-blur">
              Caricamento…
            </span>
          )}
          <span className="text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded-lg backdrop-blur">
            {nodes.length} dispositivi
          </span>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
          className="bg-slate-900"
        >
          <Background color="#334155" gap={24} size={1} />
          <Controls className="!bg-slate-800 !border-slate-700 !text-slate-300" />
          <MiniMap
            nodeColor={n => {
              if (n.data?.is_gateway)       return '#3b82f6'
              if (n.data?.status === 'online')  return '#22c55e'
              return '#475569'
            }}
            maskColor="rgba(15,23,42,0.7)"
            className="!bg-slate-800 !border-slate-700"
          />
        </ReactFlow>
      </div>

      {/* Side panel */}
      {selected && (
        <DevicePanel
          device={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleDeviceUpdated}
        />
      )}
    </div>
  )
}
