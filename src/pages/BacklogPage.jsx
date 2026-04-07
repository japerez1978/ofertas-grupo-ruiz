import React, { useState, useEffect, useCallback, useRef } from 'react'
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

// --- Custom Components ---

/**
 * Custom Dropdown for Backlog Actions (Work to do)
 */
function ActionEditor({ item, currentAction, onUpdate }) {
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
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
          currentAction 
            ? 'bg-accent-500/10 border-accent-500/30 text-accent-300 shadow-lg shadow-accent-500/5' 
            : 'bg-white/5 border-white/10 text-steel-500'
        } hover:bg-white/10 hover:border-white/20`}
      >
        <span className="truncate">{selected ? selected.label : 'Seleccionar...'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[100] mt-1.5 w-64 rounded-xl bg-surface-700 border border-white/10 shadow-2xl py-1 left-0 top-full animate-scale-in">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onUpdate(item, opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-[10px] font-bold flex items-center gap-3 uppercase transition-colors ${
                opt.value === currentAction ? 'bg-accent-500/20 text-accent-300' : 'text-steel-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="flex-1">{opt.label}</span>
              {opt.value === currentAction && <Check className="w-3.5 h-3.5 text-accent-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Custom Dropdown for Presupuestador (Synced with HubSpot)
 */
function PresupuestadorEditor({ item, currentValue, options, onUpdate }) {
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
    setOpen(false)
    setSaving(true)
    try {
      // 1. Update HubSpot
      await patchOferta(item?.offer_id, { presupuestador_asignado: val })
      // 2. Update local state
      onUpdate(item, val)
    } catch (e) {
      console.error('Error updating presupuestador:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !saving && setOpen(!open)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
          saving ? 'opacity-50 cursor-wait' : 'hover:bg-white/5'
        } ${currentValue ? 'text-steel-300 border-white/5' : 'text-steel-600 border-dashed border-white/10'}`}
      >
        <User className={`w-3 h-3 ${currentValue ? 'text-steel-500' : 'text-steel-700'}`} />
        <span className="truncate max-w-[80px]">{currentValue || 'Sin asignar'}</span>
        {saving && <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />}
      </button>

      {open && (
        <div className="absolute z-[100] mt-1 w-56 max-h-60 overflow-y-auto rounded-xl bg-surface-700 border border-white/10 shadow-2xl py-1 left-1/2 -translate-x-1/2 top-full custom-scrollbar animate-scale-in">
          <p className="px-3 py-2 text-[9px] text-steel-500 font-black uppercase tracking-widest border-b border-white/5 mb-1">Presupuestadores</p>
          {options.length === 0 ? (
            <p className="px-4 py-3 text-[10px] text-steel-400 italic">No hay opciones cargadas</p>
          ) : options.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.label)}
              className={`w-full text-left px-3 py-2 text-[10px] font-bold flex items-center gap-2.5 transition-colors ${
                opt.label === currentValue ? 'bg-white/10 text-white' : 'text-steel-300 hover:bg-white/5 hover:text-white'
              }`}
            >
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

function DeleteButton({ onConfirm }) {
  const [confirming, setConfirming] = React.useState(false)
  const timerRef = React.useRef(null)

  const handleFirstClick = (e) => {
    e.stopPropagation()
    setConfirming(true)
    timerRef.current = setTimeout(() => setConfirming(false), 3000)
  }

  const handleConfirmClick = (e) => {
    e.stopPropagation()
    if (timerRef.current) clearTimeout(timerRef.current)
    setConfirming(false)
    onConfirm()
  }

  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  if (confirming) {
    return (
      <button
        onClick={handleConfirmClick}
        className="px-2 py-1 rounded-md bg-red-500 text-white text-[9px] font-black animate-pulse hover:bg-red-600 transition-colors uppercase tracking-tighter"
      >
        ¿BORRAR?
      </button>
    )
  }

  return (
    <button
      onClick={handleFirstClick}
      className="p-2 rounded-lg text-steel-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
      title="Eliminar"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}

const ScoreBadge = ({ score }) => {
  if (!score) return null
  const scoreLabel = typeof score === 'object' ? (score.label || '') : String(score)
  if (!scoreLabel) return null
  const cfg = {
    Alto:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    Medio: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: 'bg-amber-400' },
    Bajo:  { bg: 'bg-red-500/15',     text: 'text-red-400',     dot: 'bg-red-400' },
  }[scoreLabel] || { bg: 'bg-white/10', text: 'text-white/60', dot: 'bg-white/40' }
  
  return (
    <span className={`${cfg.bg} ${cfg.text} inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {scoreLabel}
    </span>
  )
}

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

  // Lógica de Filtrado por Columna Independiente
  const applyFilters = (data, filters) => {
    return data.filter(item => {
      const d = item.offer_data || {}
      const s = d.score
      const scoreLabel = (s && typeof s === 'object') ? (s.label || '') : String(s || '')

      return (
        (!filters.provincia || d.provincia === filters.provincia) &&
        (!filters.presupuestador || d.presupuestador === filters.presupuestador) &&
        (!filters.estado_oferta || d.estado_oferta === filters.estado_oferta) &&
        (!filters.tipo_oferta || d.tipo_oferta === filters.tipo_oferta) &&
        (!filters.score || scoreLabel === filters.score)
      )
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

  // --- Actions ---
  const handlePresupuestar = (item) => {
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
    try {
      await removeFromBacklog(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      showToast('🗑️ Eliminado del backlog')
    } catch (e) {
      showToast('❌ Error: ' + e.message, 'error')
    }
  }

  const handleClearCompleted = async () => {
    try {
      await clearCompleted()
      setItems(prev => prev.filter(i => i.status !== 'done'))
      showToast('🧹 Completados eliminados')
    } catch (e) {
      showToast('❌ Error: ' + e.message, 'error')
    }
  }

  const handleActionChange = async (item, selectedAction) => {
    const updatedData = { ...item.offer_data, selected_action: selectedAction }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, offer_data: updatedData } : i))
    try {
      await updateBacklogData(item.id, updatedData)
      showToast('💾 Acción técnica guardada')
    } catch (e) {
      showToast('❌ No se pudo guardar: ' + e.message, 'error')
    }
  }

  const handlePresupuestadorChange = async (item, selectedPresupuestador) => {
    const updatedData = { ...item.offer_data, presupuestador: selectedPresupuestador }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, offer_data: updatedData } : i))
    try {
      await updateBacklogData(item.id, updatedData)
      showToast('💾 Presupuestador actualizado')
    } catch (e) {
      showToast('❌ Error: ' + e.message, 'error')
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // --- Drag & Drop Table ---
  const moveItem = async (fromIdx, toIdx) => {
    const reordered = [...allPending]
    const [removed] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, removed)

    const updatedWithPriority = reordered.map((item, i) => ({ ...item, priority: i + 1 }))
    setItems([...updatedWithPriority, ...allDone])

    try {
      await reorderBacklog(updatedWithPriority.map((it, i) => ({ id: it.id, priority: i + 1 })))
    } catch (e) { console.warn('Error saving order:', e.message) }
  }

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

  const hasPendingFilters = Object.values(pendingFilters).some(v => v !== '')
  const hasDoneFilters = Object.values(doneFilters).some(v => v !== '')

  // Componente de Filtro de Cabecera
  const ColumnFilter = ({ data, field, label, currentFilters, setFilters }) => {
    let options = getUniqueOptions(data, field)
    
    // Forzamos opciones para Score si está vacío (para ofertas antiguas)
    if (field === 'score' && options.length === 0) {
      options = ['Alto', 'Medio', 'Bajo']
    }

    if (options.length === 0 && !currentFilters[field]) return <span>{label}</span>
    
    return (
      <div className="flex flex-col gap-1">
        <span className="opacity-60">{label}</span>
        <select
          value={currentFilters[field]}
          onChange={(e) => setFilters(prev => ({ ...prev, [field]: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[9px] font-bold text-accent-300 outline-none hover:bg-white/10 transition-colors cursor-pointer"
        >
          <option value="">TODOS</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  const renderTable = (tableItems, title, currentFilters, setFilters, rawData) => {
    return (
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5 text-[10px] font-black text-steel-500 uppercase tracking-widest">
                <th className="px-4 py-4 w-12 text-center">#</th>
                <th className="px-4 py-4 min-w-[280px] text-steel-300">Negocio / Empresa / Oferta</th>
                <th className="px-4 py-4 text-center">
                  <ColumnFilter data={rawData} field="score" label="Score" currentFilters={currentFilters} setFilters={setFilters} />
                </th>
                <th className="px-4 py-4 text-right">Importe</th>
                <th className="px-4 py-4 text-center">Peso (Tn)</th>
                <th className="px-4 py-4">
                  <ColumnFilter data={rawData} field="provincia" label="Provincia" currentFilters={currentFilters} setFilters={setFilters} />
                </th>
                <th className="px-4 py-4 text-center">
                  <ColumnFilter data={rawData} field="presupuestador" label="Presupuestador" currentFilters={currentFilters} setFilters={setFilters} />
                </th>
                <th className="px-4 py-4 text-center">Fecha Obj.</th>
                <th className="px-4 py-4 text-center">
                  <ColumnFilter data={rawData} field="estado_oferta" label="Estado HS" currentFilters={currentFilters} setFilters={setFilters} />
                </th>
                <th className="px-4 py-4">
                  <ColumnFilter data={rawData} field="tipo_oferta" label="Tipo Oferta" currentFilters={currentFilters} setFilters={setFilters} />
                </th>
                <th className="px-4 py-4 min-w-[180px] text-accent-500">Trabajo a realizar</th>
                <th className="px-4 py-4 w-[140px] text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span>Acción</span>
                    {Object.values(currentFilters).some(v => v !== '') && (
                      <button 
                        onClick={() => setFilters({ ...initialFilters })}
                        className="text-[8px] text-accent-400 hover:text-white transition-colors underline decoration-accent-500/30 underline-offset-2"
                      >
                        Limpiar todos
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableItems.map((item, idx) => {
                const d = item.offer_data || {}
                const isPending = item.status === 'pending'
                const displayIdx = isPending ? allPending.indexOf(item) + 1 : allDone.indexOf(item) + 1

                return (
                  <tr 
                    key={item.id}
                    draggable={isPending}
                    onDragStart={() => setDraggedItemIdx(allPending.indexOf(item))}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/[0.05]') }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('bg-white/[0.05]')}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('bg-white/[0.05]')
                      const targetIdx = allPending.indexOf(item)
                      if (draggedItemIdx !== null && targetIdx !== -1) moveItem(draggedItemIdx, targetIdx)
                    }}
                    className={`group border-b border-white/[0.05] transition-colors hover:bg-white/[0.03] ${!isPending ? 'opacity-70 grayscale-[0.2]' : ''}`}
                  >
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isPending && <GripVertical className="w-3.5 h-3.5 text-steel-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />}
                        <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded ${isPending ? 'bg-amber-500/10 text-amber-500/80' : 'bg-emerald-500/10 text-emerald-500/80'}`}>
                          {displayIdx}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 max-w-[280px]">
                        <a href={getHsDealUrl(d.dealId)} target="_blank" rel="noopener noreferrer" className="text-white font-bold text-xs leading-relaxed line-clamp-2 hover:text-accent-400 transition-colors">
                          {d.nombre || 'Sin nombre'}
                        </a>
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-steel-500 text-[10px] font-medium truncate max-w-[100px]">{d.empresa || '—'}</span>
                          <span className="text-white/10 shrink-0">·</span>
                          <div className="flex items-center gap-1 shrink-0 overflow-hidden text-[9px]">
                            <a href={getHsOfferUrl(d.id)} target="_blank" rel="noopener noreferrer" className="bg-amber-500/10 text-amber-400/70 px-1 py-0.5 rounded font-black hover:bg-amber-500/20 transition-all">
                              Nº {d.numero_oferta || '—'}
                            </a>
                            {d.numero_heredado && (
                              <a href={getHsOfferUrl(d.id)} target="_blank" rel="noopener noreferrer" className="text-steel-600 hover:text-steel-400 italic truncate ml-1 transition-all">
                                H: {d.numero_heredado}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <ScoreBadge score={d.score} />
                    </td>

                    <td className="px-4 py-4 text-right">
                      <span className="text-emerald-400 text-xs font-bold tabular-nums">
                        {formatCurrency(d.importe)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-steel-300 font-mono text-xs">
                        <Weight className="w-3 h-3 text-steel-600" />
                        {d.peso_tn || '0'}<span className="text-steel-600 text-[9px] font-bold uppercase ml-0.5">Tn</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {d.provincia ? (
                        <div className="flex items-center gap-1.5 text-steel-400 text-[10px] font-bold">
                          <MapPin className="w-3 h-3 text-accent-500/60" />
                          <span className="truncate max-w-[100px]">{d.provincia}</span>
                        </div>
                      ) : <span className="text-steel-700">—</span>}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <PresupuestadorEditor 
                        item={item} 
                        currentValue={d.presupuestador} 
                        options={presupuestadores} 
                        onUpdate={handlePresupuestadorChange} 
                      />
                    </td>

                    <td className="px-4 py-4 text-center">
                      {d.fecha_obj ? (
                        <div className="inline-flex items-center gap-1.5 text-steel-300 text-[10px] font-bold bg-white/5 px-2 py-1 rounded-md border border-white/5">
                          <Calendar className="w-3 h-3 text-amber-500/60" />
                          {formatDate(d.fecha_obj)}
                        </div>
                      ) : <span className="text-steel-700">—</span>}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="text-[10px] text-steel-400 font-bold uppercase truncate max-w-[100px] inline-block">
                        {d.estado_oferta || '—'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {d.tipo_oferta ? (
                        <div className="flex items-center gap-1.5 text-accent-300 text-[9px] font-black uppercase tracking-tighter bg-accent-500/5 py-1 px-2 rounded-md border border-accent-500/10 w-fit">
                          <Tag className="w-2.5 h-2.5 opacity-60" />
                          {d.tipo_oferta}
                        </div>
                      ) : <span className="text-steel-700">—</span>}
                    </td>

                    <td className="px-4 py-4">
                      <ActionEditor 
                        item={item} 
                        currentAction={d.selected_action} 
                        onUpdate={handleActionChange} 
                      />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePresupuestar(item)}
                          className="p-2 rounded-lg text-accent-500 hover:bg-accent-500/10 transition-all"
                          title="Presupuestar"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        
                        {isPending ? (
                          <button
                            onClick={() => handleMarkDone(item)}
                            className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-all"
                            title="Listo"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkPending(item)}
                            className="p-2 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-all"
                            title="Deshacer"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}

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
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up font-sans px-2 pb-20">
      {toast && (
        <div className={`fixed top-20 right-6 z-[100] px-5 py-3 rounded-xl text-sm font-bold shadow-2xl border animate-fade-in-up ${
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent-500/10 rounded-2xl border border-accent-500/20">
            <ClipboardList className="w-8 h-8 text-accent-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">BACKLOG TÉCNICO</h2>
            <p className="text-steel-500 text-[10px] tracking-[0.2em] font-bold uppercase mt-0.5">
              {allPending.length} por procesar · {allDone.length} realizados
            </p>
          </div>
        </div>

        <div className="flex items-center bg-surface-700/50 p-1.5 rounded-xl border border-white/5 shadow-xl">
           <p className="px-4 text-[10px] text-steel-500 font-bold uppercase tracking-widest mr-2 border-r border-white/10 hidden md:block">Ver sección:</p>
          {['all', 'pending', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                filter === f ? 'bg-accent-500/20 text-accent-400 shadow-lg border border-accent-500/30' : 'text-steel-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f === 'all' ? 'Todo' : f === 'pending' ? '🟡 En Espera' : '✅ Hechos'}
            </button>
          ))}
          
          {(hasPendingFilters || hasDoneFilters) && (
            <button 
              onClick={() => { setPendingFilters({ ...initialFilters }); setDoneFilters({ ...initialFilters }) }} 
              className="ml-4 px-3 py-2 rounded-lg text-[10px] font-black uppercase text-accent-400 bg-accent-500/10 hover:bg-accent-500/20 active:scale-95 transition-all border border-accent-500/20"
            >
              Limpiar Filtros ✖
            </button>
          )}

          {allDone.length > 0 && (
            <button onClick={handleClearCompleted} className="ml-4 px-3 py-2 rounded-lg text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10 active:scale-95 transition-all">
              Borrar Historial 🧹
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Pending Section */}
      {(filter === 'all' || filter === 'pending') && (
        <div className="space-y-4">
          {renderTable(filteredPending, 'EN ESPERA', pendingFilters, setPendingFilters, allPending)}
          {allPending.length === 0 && (
             <div className="py-20 text-center text-steel-500 bg-surface-700/30 rounded-2xl border border-dashed border-white/5">
                <ClipboardList className="w-12 h-12 opacity-10 mx-auto mb-4" />
                <p className="text-sm font-medium">Bandeja de entrada vacía</p>
             </div>
          )}
        </div>
      )}

      {/* Separator & Done Section */}
      {(filter === 'all' || filter === 'done') && allDone.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-4 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <h2 className="text-xs font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              Presupuestos Hechos
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          </div>
          {renderTable(filteredDone, 'LISTOS', doneFilters, setDoneFilters, allDone)}
        </div>
      )}
      
      {filter === 'done' && allDone.length === 0 && (
        <div className="py-20 text-center text-steel-500 bg-surface-700/30 rounded-2xl border border-dashed border-white/5">
          <Zap className="w-12 h-12 opacity-10 mx-auto mb-4" />
          <p className="text-sm font-medium">Aún no hay presupuestos marcados como hechos</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-900/80 backdrop-blur-md border-t border-white/5 px-6 py-2 flex justify-between items-center z-40">
        <p className="text-[9px] text-steel-600 font-bold uppercase tracking-[0.2em]">
          Arrastra <GripVertical className="inline w-3 h-3" /> para reordenar prioridades en tiempo real
        </p>
        <div className="flex items-center gap-4 opacity-70">
           <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[9px] text-steel-400 font-bold uppercase tracking-widest">Pendiente</span></div>
           <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] text-steel-400 font-bold uppercase tracking-widest">Hecho</span></div>
        </div>
      </div>
    </div>
  )
}
