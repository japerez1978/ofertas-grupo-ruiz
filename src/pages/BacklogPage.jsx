import React from 'react'
import { useNavigate } from 'react-router-dom'
import { getBacklog, reorderBacklog, markAsDone, markAsPending, removeFromBacklog, clearCompleted, updateBacklogData } from '../services/backlog'
import { getPresupuestadores, patchOferta } from '../services/hubspot'
import { useAuth } from '../context/AuthContext'
import { GripVertical, FileText, Trash2, CheckCircle2, Undo2, ClipboardList, Zap, AlertTriangle, ExternalLink, Calendar, MapPin, Weight, Tag, Settings2, User, ChevronDown, Check } from 'lucide-react'

const formatCurrency = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

// HubSpot Config
const HS_PORTAL = '147691795'
const HS_DOMAIN = 'https://app-eu1.hubspot.com'
const HS_OFFER_OBJECT = '2-198173351'

const getHsDealUrl = (id) => id ? `${HS_DOMAIN}/contacts/${HS_PORTAL}/deal/${id}` : '#'
const getHsOfferUrl = (id) => id ? `${HS_DOMAIN}/contacts/${HS_PORTAL}/record/${HS_OFFER_OBJECT}/${id}` : '#'

export default function BacklogPage() {
  const [items, setItems] = React.useState([])
  const [presupuestadores, setPresupuestadores] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState('all') 
  const [error, setError] = React.useState(null)
  const [toast, setToast] = React.useState(null)
  const navigate = useNavigate()
  const [draggedItemIdx, setDraggedItemIdx] = React.useState(null)
  
  const initialFilters = {
    provincia: '',
    presupuestador: '',
    estado_oferta: '',
    tipo_oferta: '',
    score: ''
  }

  const [pendingFilters, setPendingFilters] = React.useState({ ...initialFilters })
  const [doneFilters, setDoneFilters] = React.useState({ ...initialFilters })

  const loadData = React.useCallback(async () => {
    try {
      const [backlogData, hsPresupuestadores] = await Promise.all([
        getBacklog(),
        getPresupuestadores()
      ])
      setItems(backlogData || [])
      setPresupuestadores(hsPresupuestadores || [])
    } catch (e) {
      setError('Error cargando datos: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])

  // --- Sub-Components (Moved Inside to ensure scope) ---

  const ActionEditor = ({ item, currentAction, onUpdate }) => {
    const [open, setOpen] = React.useState(false)
    const ref = React.useRef(null)
    const options = [
      { value: 'Crear oferta nueva', label: '✨ Crear oferta nueva' },
      { value: 'Ajustar oferta actual', label: '🛠️ Ajustar oferta actual' },
      { value: 'Nueva versión oferta actual', label: '🔄 Nueva versión' }
    ]
    React.useEffect(() => {
      function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
      document.addEventListener('mousedown', h)
      return () => document.removeEventListener('mousedown', h)
    }, [])
    const selected = options.find(o => o.value === currentAction)
    return (
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(!open)} className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${currentAction ? 'bg-accent-500/10 border-accent-500/30 text-accent-300 shadow-lg shadow-accent-500/5' : 'bg-white/5 border-white/10 text-steel-500'} hover:bg-white/10 hover:border-white/20`}>
          <span className="truncate">{selected ? selected.label : 'Seleccionar...'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-[100] mt-1.5 w-64 rounded-xl bg-surface-700 border border-white/10 shadow-2xl py-1 left-0 top-full animate-scale-in">
            {options.map(opt => (
              <button key={opt.value} onClick={() => { onUpdate(item, opt.value); setOpen(false) }} className={`w-full text-left px-4 py-2.5 text-[10px] font-bold flex items-center gap-3 uppercase transition-colors ${opt.value === currentAction ? 'bg-accent-500/20 text-accent-300' : 'text-steel-300 hover:bg-white/5 hover:text-white'}`}>
                <span className="flex-1">{opt.label}</span>
                {opt.value === currentAction && <Check className="w-3.5 h-3.5 text-accent-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const PresupuestadorEditor = ({ item, currentValue, options, onUpdate }) => {
    const [open, setOpen] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const ref = React.useRef(null)
    React.useEffect(() => {
      function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
      document.addEventListener('mousedown', h)
      return () => document.removeEventListener('mousedown', h)
    }, [])
    async function handleSelect(val) {
      if (val === currentValue) { setOpen(false); return }
      setOpen(false); setSaving(true)
      try {
        await patchOferta(item?.offer_id, { presupuestador_asignado: val })
        onUpdate(item, val)
      } catch (e) { console.error(e) } finally { setSaving(false) }
    }
    return (
      <div className="relative" ref={ref}>
        <button onClick={() => !saving && setOpen(!open)} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${saving ? 'opacity-50 cursor-wait' : 'hover:bg-white/5'} ${currentValue ? 'text-steel-300 border-white/5' : 'text-steel-600 border-dashed border-white/10'}`}>
          <User className={`w-3 h-3 ${currentValue ? 'text-steel-500' : 'text-steel-700'}`} />
          <span className="truncate max-w-[80px]">{currentValue || 'Sin asignar'}</span>
          {saving && <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />}
        </button>
        {open && (
          <div className="absolute z-[100] mt-1 w-56 max-h-60 overflow-y-auto rounded-xl bg-surface-700 border border-white/10 shadow-2xl py-1 left-1/2 -translate-x-1/2 top-full custom-scrollbar animate-scale-in">
            <p className="px-3 py-2 text-[9px] text-steel-500 font-black uppercase tracking-widest border-b border-white/5 mb-1">Presupuestadores</p>
            {options.map(opt => (
              <button key={opt.value} onClick={() => handleSelect(opt.label)} className={`w-full text-left px-3 py-2 text-[10px] font-bold flex items-center gap-2.5 transition-colors ${opt.label === currentValue ? 'bg-white/10 text-white' : 'text-steel-300 hover:bg-white/5 hover:text-white'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${opt.label === currentValue ? 'bg-accent-400' : 'bg-steel-600'}`} />
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.label === currentValue && <Check className="w-3 h-3 text-accent-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const DeleteButton = ({ onConfirm }) => {
    const [confirming, setConfirming] = React.useState(false)
    const timerRef = React.useRef(null)
    React.useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, [])
    const handleFirstClick = (e) => { e.stopPropagation(); setConfirming(true); timerRef.current = setTimeout(() => setConfirming(false), 3000) }
    const handleConfirmClick = (e) => { e.stopPropagation(); if (timerRef.current) clearTimeout(timerRef.current); setConfirming(false); onConfirm() }
    if (confirming) return <button onClick={handleConfirmClick} className="px-2 py-1 rounded-md bg-red-500 text-white text-[9px] font-black animate-pulse hover:bg-red-600 transition-colors uppercase tracking-tighter">¿BORRAR?</button>
    return <button onClick={handleFirstClick} className="p-2 rounded-lg text-steel-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
  }

  const ScoreBadge = ({ score }) => {
    if (!score) return null
    const scoreLabel = typeof score === 'object' ? (score.label || '') : String(score)
    if (!scoreLabel) return null
    const cfg = { Alto: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' }, Medio: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' }, Bajo: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' } }[scoreLabel] || { bg: 'bg-white/10', text: 'text-white/60', dot: 'bg-white/40' }
    return <span className={`${cfg.bg} ${cfg.text} inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{scoreLabel}</span>
  }

  // --- Logic ---

  const applyFilters = (data, filters) => {
    return data.filter(item => {
      const d = item.offer_data || {}
      const s = d.score
      const scoreLabel = (s && typeof s === 'object') ? (s.label || '') : String(s || '')
      return (!filters.provincia || d.provincia === filters.provincia) && (!filters.presupuestador || d.presupuestador === filters.presupuestador) && (!filters.estado_oferta || d.estado_oferta === filters.estado_oferta) && (!filters.tipo_oferta || d.tipo_oferta === filters.tipo_oferta) && (!filters.score || scoreLabel === filters.score)
    })
  }

  const allPending = items.filter(i => i.status === 'pending')
  const allDone = items.filter(i => i.status === 'done')
  const filteredPending = applyFilters(allPending, pendingFilters)
  const filteredDone = applyFilters(allDone, doneFilters)

  const getUniqueOptions = (data, field) => {
    const vals = data.map(it => {
      if (field === 'score') {
        const s = it.offer_data?.score
        return (s && typeof s === 'object') ? (s.label || '') : String(s || '')
      }
      return it.offer_data?.[field]
    }).filter(Boolean)
    return [...new Set(vals)].sort()
  }

  const handlePresupuestar = (item) => window.open(`/crear?from_backlog=${item.id}`, '_blank')
  const handleMarkDone = async (item) => {
    try { await markAsDone(item.id); setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done', completed_at: new Date().toISOString() } : i)); showToast('✅ Marcado como completado') } 
    catch (e) { showToast('❌ Error: ' + e.message, 'error') }
  }
  const handleMarkPending = async (item) => {
    try { await markAsPending(item.id); setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending', completed_at: null } : i)); showToast('🔄 Devuelto a pendientes') }
    catch (e) { showToast('❌ Error: ' + e.message, 'error') }
  }
  const handleRemove = async (item) => {
    try { await removeFromBacklog(item.id); setItems(prev => prev.filter(i => i.id !== item.id)); showToast('🗑️ Eliminado del backlog') }
    catch (e) { showToast('❌ Error: ' + e.message, 'error') }
  }
  const handleClearCompleted = async () => {
    try { await clearCompleted(); setItems(prev => prev.filter(i => i.status !== 'done')); showToast('Sweep completado') }
    catch (e) { showToast('❌ Error: ' + e.message, 'error') }
  }
  const handleActionChange = async (item, selectedAction) => {
    const updatedData = { ...item.offer_data, selected_action: selectedAction }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, offer_data: updatedData } : i))
    try { await updateBacklogData(item.id, updatedData); showToast('💾 Acción técnica guardada') }
    catch (e) { showToast('❌ Error: ' + e.message, 'error') }
  }
  const handlePresupuestadorChange = async (item, selectedPresupuestador) => {
    const updatedData = { ...item.offer_data, presupuestador: selectedPresupuestador }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, offer_data: updatedData } : i))
    try { await updateBacklogData(item.id, updatedData); showToast('💾 Presupuestador actualizado') }
    catch (e) { showToast('❌ Error: ' + e.message, 'error') }
  }
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }
  const moveItem = async (fromIdx, toIdx) => {
    const reordered = [...allPending]; const [removed] = reordered.splice(fromIdx, 1); reordered.splice(toIdx, 0, removed)
    const updatedWithPriority = reordered.map((item, i) => ({ ...item, priority: i + 1 }))
    setItems([...updatedWithPriority, ...allDone])
    try { await reorderBacklog(updatedWithPriority.map((it, i) => ({ id: it.id, priority: i + 1 }))) } catch (e) { console.warn(e.message) }
  }

  const ColumnFilter = ({ data, field, label, currentFilters, setFilters }) => {
    let options = getUniqueOptions(data, field)
    if (field === 'score' && options.length === 0) options = ['Alto', 'Medio', 'Bajo']
    if (options.length === 0 && !currentFilters[field]) return <span>{label}</span>
    return (
      <div className="flex flex-col gap-1">
        <span className="opacity-60">{label}</span>
        <select value={currentFilters[field]} onChange={(e) => setFilters(prev => ({ ...prev, [field]: e.target.value }))} className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[9px] font-bold text-accent-300 outline-none hover:bg-white/10 transition-colors cursor-pointer">
          <option value="">TODOS</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  const renderTable = (tableItems, title, currentFilters, setFilters, rawData) => (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1300px]">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/5 text-[10px] font-black text-steel-500 uppercase tracking-widest">
              <th className="px-4 py-4 w-12 text-center">#</th>
              <th className="px-4 py-4 min-w-[280px] text-steel-300">Negocio / Empresa</th>
              <th className="px-4 py-4 text-center"><ColumnFilter data={rawData} field="score" label="Score" currentFilters={currentFilters} setFilters={setFilters} /></th>
              <th className="px-4 py-4 text-right">Importe</th>
              <th className="px-4 py-4 text-center">Peso (Tn)</th>
              <th className="px-4 py-4"><ColumnFilter data={rawData} field="provincia" label="Provincia" currentFilters={currentFilters} setFilters={setFilters} /></th>
              <th className="px-4 py-4 text-center"><ColumnFilter data={rawData} field="presupuestador" label="Presupuestador" currentFilters={currentFilters} setFilters={setFilters} /></th>
              <th className="px-4 py-4 text-center">Fecha Obj.</th>
              <th className="px-4 py-4 text-center"><ColumnFilter data={rawData} field="estado_oferta" label="Estado HS" currentFilters={currentFilters} setFilters={setFilters} /></th>
              <th className="px-4 py-4"><ColumnFilter data={rawData} field="tipo_oferta" label="Tipo" currentFilters={currentFilters} setFilters={setFilters} /></th>
              <th className="px-4 py-4 min-w-[180px] text-accent-500">Trabajo</th>
              <th className="px-4 py-4 w-[140px] text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.map((item, idx) => {
              const d = item.offer_data || {}; const isPending = item.status === 'pending'
              const displayIdx = isPending ? allPending.indexOf(item) + 1 : allDone.indexOf(item) + 1
              return (
                <tr key={item.id} draggable={isPending} onDragStart={() => setDraggedItemIdx(allPending.indexOf(item))} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/[0.05]') }} onDragLeave={(e) => e.currentTarget.classList.remove('bg-white/[0.05]')} onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-white/[0.05]'); const targetIdx = allPending.indexOf(item); if (draggedItemIdx !== null && targetIdx !== -1) moveItem(draggedItemIdx, targetIdx) }} className={`group border-b border-white/[0.05] transition-colors hover:bg-white/[0.03] ${!isPending ? 'opacity-70 grayscale-[0.2]' : ''}`}>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {isPending && <GripVertical className="w-3.5 h-3.5 text-steel-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />}
                      <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded ${isPending ? 'bg-amber-500/10 text-amber-500/80' : 'bg-emerald-500/10 text-emerald-500/80'}`}>{displayIdx}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1.5 max-w-[280px]">
                      <a href={getHsDealUrl(d.dealId)} target="_blank" rel="noopener noreferrer" className="text-white font-bold text-xs hover:text-accent-400">{d.nombre || 'Sin nombre'}</a>
                      <div className="flex items-center gap-2 text-[9px] text-steel-500 uppercase">{d.empresa || '—'} · Nº {d.numero_oferta || '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center"><ScoreBadge score={d.score} /></td>
                  <td className="px-4 py-4 text-right"><span className="text-emerald-400 text-xs font-bold tabular-nums">{formatCurrency(d.importe)}</span></td>
                  <td className="px-4 py-4 text-center text-steel-300 font-mono text-xs">{d.peso_tn || '0'} Tn</td>
                  <td className="px-4 py-4 text-steel-400 text-[10px] font-bold">{d.provincia || '—'}</td>
                  <td className="px-4 py-4 text-center"><PresupuestadorEditor item={item} currentValue={d.presupuestador} options={presupuestadores} onUpdate={handlePresupuestadorChange} /></td>
                  <td className="px-4 py-4 text-center text-steel-300 text-[10px] font-bold">{formatDate(d.fecha_obj)}</td>
                  <td className="px-4 py-4 text-center text-[10px] text-steel-400 font-bold uppercase">{d.estado_oferta || '—'}</td>
                  <td className="px-4 py-4 text-accent-300 text-[9px] font-black uppercase">{d.tipo_oferta || '—'}</td>
                  <td className="px-4 py-4"><ActionEditor item={item} currentAction={d.selected_action} onUpdate={handleActionChange} /></td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handlePresupuestar(item)} className="p-2 rounded-lg text-accent-500 hover:bg-accent-500/10"><FileText className="w-4 h-4" /></button>
                      {isPending ? <button onClick={() => handleMarkDone(item)} className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10"><CheckCircle2 className="w-4 h-4" /></button> : <button onClick={() => handleMarkPending(item)} className="p-2 rounded-lg text-amber-500 hover:bg-amber-500/10"><Undo2 className="w-4 h-4" /></button>}
                      <DeleteButton onConfirm={() => handleRemove(item)} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" /></div>

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up font-sans px-2 pb-20">
      {toast && <div className={`fixed top-20 right-6 z-[100] px-5 py-3 rounded-xl text-sm font-bold shadow-2xl border animate-fade-in-up ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>{toast.message}</div>}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-accent-400" />
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic">BACKLOG TÉCNICO</h2>
            <p className="text-steel-600 text-[10px] font-bold uppercase tracking-widest">{allPending.length} pendientes · {allDone.length} hechos</p>
          </div>
        </div>
        <div className="flex items-center bg-surface-700/50 p-1 rounded-xl border border-white/5">
          {['all', 'pending', 'done'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-accent-500/20 text-accent-400' : 'text-steel-400 hover:text-white'}`}>{f === 'all' ? 'Todo' : f === 'pending' ? '🟡 Espera' : '✅ Hecho'}</button>
          ))}
          {(Object.values(pendingFilters).some(v => v !== '') || Object.values(doneFilters).some(v => v !== '')) && (
            <button onClick={() => { setPendingFilters({ ...initialFilters }); setDoneFilters({ ...initialFilters }) }} className="ml-4 text-[10px] font-black text-accent-400 px-3">Limpiar ✖</button>
          )}
        </div>
      </div>
      {(filter === 'all' || filter === 'pending') && renderTable(filteredPending, 'PENDIENTE', pendingFilters, setPendingFilters, allPending)}
      {(filter === 'all' || filter === 'done') && allDone.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-[10px] font-black text-emerald-400 tracking-widest uppercase text-center border-b border-emerald-500/10 pb-4">Realizados</h2>
          {renderTable(filteredDone, 'HECHO', doneFilters, setDoneFilters, allDone)}
        </div>
      )}
    </div>
  )
}
