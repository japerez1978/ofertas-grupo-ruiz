import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBacklog, reorderBacklog, markAsDone, markAsPending, removeFromBacklog, clearCompleted } from '../services/backlog'
import { useAuth } from '../context/AuthContext'
import { GripVertical, FileText, Trash2, CheckCircle2, Undo2, ClipboardList, Zap, AlertTriangle } from 'lucide-react'

const formatCurrency = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function BacklogPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'done'
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const loadBacklog = useCallback(async () => {
    try {
      const data = await getBacklog()
      setItems(data)
    } catch (e) {
      setError('Error cargando backlog: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBacklog() }, [loadBacklog])

  const pending = items.filter(i => i.status === 'pending')
  const done = items.filter(i => i.status === 'done')

  const filtered = filter === 'pending' ? pending : filter === 'done' ? done : items

  // --- Drag & Drop ---
  const handleDragStart = (idx) => { dragItem.current = idx }
  const handleDragEnter = (idx) => { dragOverItem.current = idx }

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const reordered = [...pending]
    const [removed] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, removed)

    // Update local state immediately
    const updatedWithPriority = reordered.map((item, i) => ({ ...item, priority: i + 1 }))
    setItems([...updatedWithPriority, ...done])

    // Persist to Supabase
    try {
      await reorderBacklog(updatedWithPriority.map((it, i) => ({ id: it.id, priority: i + 1 })))
    } catch (e) {
      console.warn('Error guardando orden:', e.message)
    }

    dragItem.current = null
    dragOverItem.current = null
  }

  // --- Actions ---
  const handlePresupuestar = (item) => {
    // Open in new tab so user stays on Backlog
    window.open(`/crear?from_backlog=${item.id}`, '_blank')
  }

  const handleMarkDone = async (item) => {
    try {
      await markAsDone(item.id)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done', completed_at: new Date().toISOString() } : i))
      showToast('✅ Marcado como completado')
    } catch (e) {
      showToast('❌ Error: ' + e.message, 'error')
    }
  }

  const handleMarkPending = async (item) => {
    try {
      await markAsPending(item.id)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending', completed_at: null } : i))
      showToast('🔄 Devuelto a pendientes')
    } catch (e) {
      showToast('❌ Error: ' + e.message, 'error')
    }
  }

  const handleRemove = async (item) => {
    if (!confirm('¿Eliminar del backlog?')) return
    try {
      await removeFromBacklog(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      showToast('🗑️ Eliminado del backlog')
    } catch (e) {
      showToast('❌ Error: ' + e.message, 'error')
    }
  }

  const handleClearCompleted = async () => {
    if (!confirm(`¿Limpiar ${done.length} items completados?`)) return
    try {
      await clearCompleted()
      setItems(prev => prev.filter(i => i.status !== 'done'))
      showToast('🧹 Completados eliminados')
    } catch (e) {
      showToast('❌ Error: ' + e.message, 'error')
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // --- Score badge ---
  const ScoreBadge = ({ score }) => {
    if (!score) return null
    // Handle legacy object scores stored before the fix
    const scoreLabel = typeof score === 'object' ? (score.label || '') : String(score)
    if (!scoreLabel) return null
    const cfg = {
      Alto:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: '🟢' },
      Medio: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: '🟡' },
      Bajo:  { bg: 'bg-red-500/15',     text: 'text-red-400',     dot: '🔴' },
    }[scoreLabel] || { bg: 'bg-white/10', text: 'text-white/60', dot: '⚪' }
    return (
      <span className={`${cfg.bg} ${cfg.text} text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider`}>
        {cfg.dot} {scoreLabel}
      </span>
    )
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
          <p className="text-steel-400 text-sm animate-pulse tracking-widest uppercase">Cargando Backlog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-2xl border animate-fade-in-up ${
          toast.type === 'error' 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-accent-400" />
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">BACKLOG TÉCNICO</h2>
            <p className="text-steel-400 text-xs tracking-widest uppercase mt-0.5">
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''} · {done.length} completado{done.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggles */}
          {['all', 'pending', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                filter === f
                  ? 'bg-accent-500/15 text-accent-400 border border-accent-500/30'
                  : 'bg-white/5 text-steel-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? '🟡 Pendientes' : '✅ Completados'}
            </button>
          ))}

          {done.length > 0 && (
            <button
              onClick={handleClearCompleted}
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              🗑️ Limpiar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center gap-4 text-center">
          <ClipboardList className="w-16 h-16 text-steel-600" />
          <h3 className="text-xl font-bold text-white/80">Backlog vacío</h3>
          <p className="text-steel-400 text-sm max-w-md">
            Ve al Dashboard de Ofertas, activa el <strong>Modo Comité</strong>, selecciona las ofertas que quieres presupuestar y envíalas aquí.
          </p>
        </div>
      )}

      {/* Backlog Items */}
      <div className="flex flex-col gap-3">
        {(filter === 'all' || filter === 'pending') && pending.length > 0 && (
          <>
            {filter === 'all' && (
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2 mt-2 mb-1">
                <Zap className="w-4 h-4" /> PENDIENTES ({pending.length})
              </h3>
            )}
            {pending.map((item, idx) => {
              const d = item.offer_data || {}
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="glass-card rounded-xl px-4 py-4 flex items-center gap-4 group cursor-grab active:cursor-grabbing hover:border-amber-500/30 transition-all border border-white/5 hover:bg-white/[0.02]"
                >
                  {/* Drag handle + Priority */}
                  <div className="flex items-center gap-2 shrink-0">
                    <GripVertical className="w-5 h-5 text-steel-600 group-hover:text-steel-400 transition-colors" />
                    <span className="bg-amber-500/15 text-amber-400 text-xs font-black w-7 h-7 rounded-lg flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <div className="sm:col-span-2">
                      <p className="text-white font-bold text-sm truncate">{d.nombre || 'Sin nombre'}</p>
                      <p className="text-steel-500 text-xs truncate">{d.empresa || '—'} · {d.numero_oferta || 'Sin nº'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-sm font-bold tabular-nums">{formatCurrency(d.importe)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={d.score} />
                      {d.unidad && (
                        <span className="text-[10px] text-steel-500 bg-white/5 px-2 py-0.5 rounded truncate">{d.unidad}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePresupuestar(item)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-accent-500/10 text-accent-400 border border-accent-500/20 hover:bg-accent-500/20 transition-all uppercase tracking-wider"
                    >
                      <FileText className="w-3.5 h-3.5" /> Presupuestar
                    </button>
                    <button
                      onClick={() => handleMarkDone(item)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                      title="Marcar como hecho"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(item)}
                      className="px-2 py-2 rounded-lg text-steel-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* DONE section */}
        {(filter === 'all' || filter === 'done') && done.length > 0 && (
          <>
            {filter === 'all' && (
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2 mt-6 mb-1">
                <CheckCircle2 className="w-4 h-4" /> COMPLETADOS ({done.length})
              </h3>
            )}
            {done.map((item) => {
              const d = item.offer_data || {}
              return (
                <div
                  key={item.id}
                  className="glass-card rounded-xl px-4 py-4 flex items-center gap-4 border border-emerald-500/10 opacity-70 hover:opacity-100 transition-all"
                >
                  {/* Done icon */}
                  <div className="shrink-0">
                    <span className="bg-emerald-500/15 text-emerald-400 w-7 h-7 rounded-lg flex items-center justify-center text-sm">✅</span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <div className="sm:col-span-2">
                      <p className="text-white/70 font-bold text-sm truncate line-through decoration-emerald-500/40">{d.nombre || 'Sin nombre'}</p>
                      <p className="text-steel-600 text-xs truncate">{d.empresa || '—'} · {d.numero_oferta || 'Sin nº'}</p>
                    </div>
                    <div>
                      <span className="text-emerald-400/60 text-sm font-bold tabular-nums">{formatCurrency(d.importe)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.completed_at && (
                        <span className="text-[10px] text-steel-500">
                          {new Date(item.completed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePresupuestar(item)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-accent-500/10 text-accent-400 border border-accent-500/20 hover:bg-accent-500/20 transition-all uppercase tracking-wider"
                    >
                      <FileText className="w-3.5 h-3.5" /> Presupuestar
                    </button>
                    <button
                      onClick={() => handleMarkPending(item)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                      title="Devolver a pendientes"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(item)}
                      className="px-2 py-2 rounded-lg text-steel-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
