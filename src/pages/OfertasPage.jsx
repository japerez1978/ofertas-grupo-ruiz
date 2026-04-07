import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

import { getAllOfertas, writeDealScoresBatch, patchOferta, getDealStagesMap, getPresupuestadores } from '../services/hubspot'
import { addToBacklog } from '../services/backlog'
import { useAuth } from '../context/AuthContext'
import { User, ChevronDown, Check, Search, ArrowUpDown, FileText, X, Briefcase, Layers, RefreshCw, ExternalLink, Zap, CloudUpload, Filter, ClipboardList, Send } from 'lucide-react'
import { getOfferStatusBadge, formatCurrency, OFFER_STATUSES } from '../utils/helpers'
import { loadMatrices } from '../services/supabase'
import { getMatrixForUnidad } from '../data/matrices'
import { calculateScore } from '../utils/scoring'
import Spinner from '../components/Spinner'

const HS_PORTAL = '147691795'
const HS_DOMAIN = 'https://app-eu1.hubspot.com'
const HS_OFFER_OBJECT = '2-198173351'

function hsOfertaUrl(id) {
  return `${HS_DOMAIN}/contacts/${HS_PORTAL}/record/${HS_OFFER_OBJECT}/${id}`
}
function hsDealUrl(dealId) {
  return `${HS_DOMAIN}/contacts/${HS_PORTAL}/deal/${dealId}`
}


/* ─── Clickable stat card ─── */
function StatCard({ label, count, color, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { boxShadow: '0 0 16px rgba(41,182,246,0.55), 0 0 4px rgba(41,182,246,0.3)' } : {}}
      className={`glass-card rounded-xl px-4 py-3 flex flex-col items-center min-w-[90px] transition-all cursor-pointer border ${active ? 'border-accent-500/70 bg-accent-500/10 scale-[1.03]' : 'border-transparent hover:border-white/10 hover:bg-white/3'}`}
    >
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{count}</span>
      <span className="text-[11px] text-steel-400 font-medium mt-0.5 text-center leading-tight">{label}</span>
    </button>
  )
}

/** Editor de Presupuestador inline */
function PresupuestadorEditor({ ofertaId, currentValue, options, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleSelect(val) {
    if (val === currentValue) { setOpen(false); return }
    setOpen(false)
    setSaving(true)
    try {
      await patchOferta(ofertaId, { presupuestador_asignado: val })
      onUpdate(ofertaId, val)
    } catch (e) { console.error('Error actualizando presupuestador:', e) }
    finally { setSaving(false) }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !saving && setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
          saving ? 'opacity-50 cursor-wait' : 'hover:bg-white/5 active:scale-95'
        } ${currentValue ? 'text-steel-300 border-white/5 bg-white/3' : 'text-steel-600 border-dashed border-white/10'}`}
      >
        <User className={`w-3 h-3 ${currentValue ? 'text-steel-500' : 'text-steel-700'}`} />
        <span className="truncate max-w-[80px]">{currentValue || 'Sin asignar'}</span>
        {saving ? <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" /> : <ChevronDown className="w-2.5 h-2.5 opacity-40 shrink-0" />}
      </button>

      {open && (
        <div className="absolute z-[110] mt-1 w-52 max-h-60 overflow-y-auto rounded-xl bg-surface-700 border border-white/10 shadow-2xl py-1 left-0 top-full custom-scrollbar animate-scale-in">
          <p className="px-3 py-2 text-[9px] text-steel-500 font-black uppercase tracking-widest border-b border-white/5 mb-1">Presupuestadores</p>
          {options.length === 0 ? (
            <p className="px-4 py-3 text-[10px] text-steel-400 italic">Cargando...</p>
          ) : options.map(opt => (
            <button
              key={opt.value}
              type="button"
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

const TIPOS_OFERTA = ['Exploración', 'Oferta Matriz (Inicial)', 'Repetición', 'Revisión', 'Ampliación', 'Modificación']

const COLUMNS = [
  { field: 'n__de_oferta', label: 'Nº Oferta' },
  { field: 'numero_de_oferta_heredado', label: 'Heredado' },
  { field: '_unidad', label: 'Unidad' },
  { field: '_companyName', label: 'Empresa' },
  { field: '_dealName', label: 'Negocio / Partida' },
  { field: '_stage', label: 'Etapa del Negocio' },
  { field: 'peso_total_cmr_toneladas', label: 'Peso (Tn)' },
  { field: '_fechaObj', label: 'Fecha Obj.' },
  { field: '_provincia', label: 'Provincia' },
  { field: 'presupuestador_asignado', label: 'Presupuestador' },
  { field: '_tipoPartida', label: 'Tipo Partida' },
  { field: '_estadoPartida', label: 'Estado Partida' },
  { field: 'tipo_de_oferta', label: 'Tipo Oferta' },
  { field: 'estado_de_la_oferta_presupuesto', label: 'Estado Oferta' },
  { field: 'valor_oferta', label: 'Valor' },
  { field: '_score', label: 'Score' },
]

function MultiFilter({ id, icon: Icon, label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(val) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button" id={id}
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border min-w-[200px] ${selected.length > 0 ? 'bg-accent-500/20 border-accent-500/60 text-accent-300' : 'bg-surface-700/50 border-white/8 text-steel-400 hover:text-white hover:border-white/15'}`}
        style={selected.length > 0 ? { boxShadow: '0 0 15px rgba(41,182,246,0.25)' } : {}}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon className={`w-4 h-4 shrink-0 ${selected.length > 0 ? 'text-accent-400' : 'text-steel-600'}`} />
          <span className="truncate">{label}</span>
          {selected.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 rounded-full bg-accent-500 text-white text-[10px] font-black px-1">{selected.length}</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute z-[100] mt-1.5 w-64 max-h-[350px] overflow-hidden rounded-xl bg-surface-700 border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] flex flex-col left-1/2 -translate-x-1/2 animate-scale-in">
          <div className="sticky top-0 z-10 bg-surface-800/90 backdrop-blur-md px-4 py-3 border-b border-white/5 flex justify-between items-center">
            <span className="text-[10px] text-steel-500 uppercase font-black tracking-widest">{label}</span>
            <button 
              type="button"
              onMouseDown={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                onChange([]); 
              }}
              className="text-[10px] font-black text-accent-500 hover:text-accent-400 px-2.5 py-1 bg-accent-500/5 rounded-md transition-colors"
            >
              LIMPIAR
            </button>
          </div>
          <div className="overflow-y-auto flex-1 py-1 custom-scrollbar">
            {options.length === 0 ? (
              <p className="px-4 py-6 text-xs text-steel-500 italic text-center">Sin opciones...</p>
            ) : options.map(opt => {
              const val = typeof opt === 'string' ? opt : opt.value
              const lbl = typeof opt === 'string' ? opt : opt.label
              const isChecked = selected.includes(val)
              return (
                <label 
                  key={val} 
                  className={`flex items-center gap-3 px-4 py-3 text-[11px] font-bold border-l-2 transition-all cursor-pointer ${isChecked ? 'text-white bg-accent-500/10 border-accent-500' : 'text-steel-400 hover:bg-white/5 hover:text-white border-transparent'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => toggle(val)} 
                    className="w-4.5 h-4.5 rounded border-white/20 bg-surface-800 text-accent-500 focus:ring-0 cursor-pointer" 
                  />
                  <span className="uppercase tracking-tighter leading-tight break-words">{lbl}</span>
                  {isChecked && <Check className="w-4 h-4 ml-auto text-accent-400 shrink-0" />}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OfertasPage() {
  const [ofertas, setOfertas]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [search, setSearch]             = useState('')
  const [tipoFilter, setTipoFilter]     = useState([])
  const [unidadFilter, setUnidadFilter] = useState([])
  const [activeStatCard, setActiveStatCard] = useState([]) // array for multi-select
  const [sortField, setSortField]       = useState('n__de_oferta')
  const [sortDir, setSortDir]           = useState('desc')
  const [matrices, setMatrices]         = useState([])
  const [savingScores, setSavingScores] = useState(false)
  const [savedScores, setSavedScores]   = useState(false)
  const [syncProgress, setSyncProgress] = useState(null) // { current, total }
  const [scoreFilter, setScoreFilter]   = useState([]) // array for multi-select
  const [outcomeFilter, setOutcomeFilter] = useState([]) // array for Ganado/Vivo/Perdido
  const [estadoPartidaFilter, setEstadoPartidaFilter] = useState([])
  const [tipoPartidaFilter, setTipoPartidaFilter] = useState([])
  const [stageFilter, setStageFilter] = useState([])
  const [stageMap, setStageMap] = useState({})
  const [sendingToBacklog, setSendingToBacklog] = useState(false)
  const [presupuestadores, setPresupuestadores] = useState([])
  const { user } = useAuth()
  const navigateTo = useNavigate()

  const CACHE_KEY = 'gr_ofertas_cache'
  const CACHE_TTL = 20 * 60 * 1000  // 20 minutos
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, phase: 'loading' })

  useEffect(() => {
    loadMatrices().then(setMatrices).catch(() => {})
    getDealStagesMap().then(setStageMap).catch(() => {})
    getPresupuestadores().then(setPresupuestadores).catch(() => {})
    
    // RESTAURAR LÓGICA DE CACHE: Solo cargar de HubSpot si no tenemos datos frescos
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      const CACHE_TTL = 30 * 60 * 1000 // 30 minutos de paz sin recargas
      if (cached.data && cached.ts && Date.now() - cached.ts < CACHE_TTL) {
        setOfertas(cached.data)
        setLoading(false)
        return
      }
    } catch { /* ignore */ }

    fetchOfertas(true)
  }, [])

  async function fetchOfertas(showSpinner = true) {
    if (showSpinner) setLoading(true)
    setError(null)
    setLoadingMore(true)
    setLoadProgress({ loaded: 0, phase: 'loading' })
    try {
      await getAllOfertas({
        onProgress: ({ partial, loaded, phase }) => {
          setOfertas(partial)
          setLoading(false)  // En cuanto llegan datos, oculta spinner completo
          setLoadProgress({ loaded, phase })
          if (phase === 'done') {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data: partial, ts: Date.now() }))
            setLoadingMore(false)
          }
        }
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // ── All useMemo BEFORE any conditional return ──

  // tipoCounts: totals per tipo for the filter cards (from all offers, no filters)
  const tipoCounts = useMemo(() => {
    const map = {}
    ofertas.forEach(o => {
      const t = o.properties?.tipo_de_oferta
      if (t) map[t] = (map[t] || 0) + 1
    })
    return map
  }, [ofertas])

  const filtered = useMemo(() => {
    let list = [...ofertas]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o => {
        const p = o.properties || {}
        const e = o._enriched || {}
        return [p.n__de_oferta, p.numero_de_oferta_heredado, p.presupuestador_asignado, p.tipo_de_oferta,
          p.estado_de_la_oferta_presupuesto, p.unidad_de_negocio_oferta, e.dealName, e.companyName,
          p.empresa_vinculada_a_oferta, e.dealProps?.madurez_en_adjudicacion_obra__proyecto,
          e.dealProps?.tipo_de_obra__proyecto, e.dealProps?.ubicacion_provincia_obra__proyecto
        ].some(f => (f || '').toLowerCase().includes(q))
      })
    }
    if (tipoFilter.length > 0)   list = list.filter(o => tipoFilter.includes(o.properties?.tipo_de_oferta))
    if (estadoPartidaFilter.length > 0) {
      list = list.filter(o => {
        const val = o._enriched?.dealProps?.madurez_en_adjudicacion_obra__proyecto
        const isMatch = val && estadoPartidaFilter.some(selected => String(selected).trim().toLowerCase() === String(val).trim().toLowerCase())
        return isMatch
      })
    }
    if (tipoPartidaFilter.length > 0) {
      list = list.filter(o => {
        const val = o._enriched?.dealProps?.tipo_de_obra__proyecto
        const isMatch = val && tipoPartidaFilter.some(selected => String(selected).trim().toLowerCase() === String(val).trim().toLowerCase())
        return isMatch
      })
    }
    if (activeStatCard.length > 0 && !activeStatCard.includes('Total')) list = list.filter(o => activeStatCard.includes(o.properties?.estado_de_la_oferta_presupuesto))
    if (stageFilter.length > 0) {
      list = list.filter(o => stageFilter.includes(o._enriched?.dealProps?.dealstage))
    }
    // NOTE: unidadFilter is applied later in scoredFiltered so unidad cards always stay visible
    list.sort((a, b) => {
      let aVal, bVal
      if (sortField === '_dealName')    { aVal = a._enriched?.dealName || ''; bVal = b._enriched?.dealName || '' }
      else if (sortField === '_stage') { aVal = a._enriched?.dealProps?.dealstage || ''; bVal = b._enriched?.dealProps?.dealstage || '' }
      else if (sortField === '_companyName') { aVal = a._enriched?.companyName || a.properties?.empresa_vinculada_a_oferta || ''; bVal = b._enriched?.companyName || b.properties?.empresa_vinculada_a_oferta || '' }
      else if (sortField === '_score') { aVal = 0; bVal = 0 }
      else if (sortField === '_unidad') { aVal = a._enriched?.dealProps?.unidad_de_negocio_deal || ''; bVal = b._enriched?.dealProps?.unidad_de_negocio_deal || '' }
      else if (sortField === '_pesoRCM') { aVal = parseFloat(a._enriched?.dealProps?.score_rcm || 0); bVal = parseFloat(b._enriched?.dealProps?.score_rcm || 0) }
      else if (sortField === '_provincia') { aVal = a._enriched?.dealProps?.ubicacion_provincia_obra__proyecto || ''; bVal = b._enriched?.dealProps?.ubicacion_provincia_obra__proyecto || '' }
      else if (sortField === '_estadoPartida') { aVal = a._enriched?.dealProps?.madurez_en_adjudicacion_obra__proyecto || ''; bVal = b._enriched?.dealProps?.madurez_en_adjudicacion_obra__proyecto || '' }
      else if (sortField === '_tipoPartida') { aVal = a._enriched?.dealProps?.tipo_de_obra__proyecto || ''; bVal = b._enriched?.dealProps?.tipo_de_obra__proyecto || '' }
      else if (sortField === '_fechaObj') { aVal = a._enriched?.dealProps?.fecha_objetivo_para_ofertar || ''; bVal = b._enriched?.dealProps?.fecha_objetivo_para_ofertar || '' }
      else { aVal = a.properties?.[sortField] || ''; bVal = b.properties?.[sortField] || '' }
      
      if (sortField === 'valor_oferta' || sortField === 'n__de_oferta' || sortField === 'peso_total_cmr_toneladas' || sortField === 'numero_de_oferta_heredado')
        return sortDir === 'asc' ? parseFloat(aVal||0) - parseFloat(bVal||0) : parseFloat(bVal||0) - parseFloat(aVal||0)
      const cmp = String(aVal).localeCompare(String(bVal), 'es', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [ofertas, search, tipoFilter, activeStatCard, sortField, sortDir, estadoPartidaFilter, tipoPartidaFilter, stageFilter])


  // Score computation + final score-level filter
  const scoredOffers = useMemo(() => {
    return filtered.map(o => {
      try {
        if (!matrices.length) return { ...o, _score: null }
        const unidad = o._enriched?.dealProps?.unidad_de_negocio_deal
                    || o.properties?.unidad_de_negocio_oferta
        const matrix = getMatrixForUnidad(unidad)
        if (!matrix) return { ...o, _score: null }
        const scoreResult = calculateScore(o._enriched?.dealProps || {}, matrix)
        return { ...o, _score: scoreResult }
      } catch {
        return { ...o, _score: null }
      }
    })
  }, [filtered, matrices])

  // Apply score-level filter + unidadFilter (here, so unidad cards stats stay intact)
  const scoredFiltered = useMemo(() => {
    let list = scoreFilter.length > 0
      ? scoredOffers.filter(o => scoreFilter.includes(o._score?.label))
      : [...scoredOffers]

    if (outcomeFilter.length > 0) {
      list = list.filter(o => {
        const stageName = String(stageMap[o._enriched?.dealProps?.dealstage] || o._enriched?.dealProps?.dealstage).toLowerCase()
        const isWon = stageName.includes('ganad') || stageName.includes('won')
        const isLostOrDiscarded = stageName.includes('perdid') || stageName.includes('descartad')
        const label = isWon ? 'Ganado' : isLostOrDiscarded ? 'Perdido' : 'Vivo'
        return outcomeFilter.includes(label)
      })
    }

    if (unidadFilter.length > 0)
      list = list.filter(o => unidadFilter.includes(o.properties?.unidad_de_negocio_oferta || o._enriched?.dealProps?.unidad_de_negocio_deal || 'Sin asignar'))
    if (sortField === '_score') {
      list.sort((a, b) => {
        const aScore = a._score?.score ?? -1
        const bScore = b._score?.score ?? -1
        return sortDir === 'asc' ? aScore - bScore : bScore - aScore
      })
    }
    return list
  }, [scoredOffers, scoreFilter, outcomeFilter, stageMap, unidadFilter, sortField, sortDir])

  const scoreStats = useMemo(() => {
    const stats = { 
      Alto:  { count: 0, value: 0 }, 
      Medio: { count: 0, value: 0 }, 
      Bajo:  { count: 0, value: 0 } 
    }
    
    let list = scoredOffers.filter(o => String(o.properties?.estado_de_la_oferta_presupuesto).toLowerCase().trim() !== 'obsoleta')
    if (outcomeFilter.length > 0) {
      list = list.filter(o => {
        const stageName = String(stageMap[o._enriched?.dealProps?.dealstage] || o._enriched?.dealProps?.dealstage).toLowerCase()
        const isWon = stageName.includes('ganad') || stageName.includes('won')
        const isLostOrDiscarded = stageName.includes('perdid') || stageName.includes('descartad')
        const label = isWon ? 'Ganado' : isLostOrDiscarded ? 'Perdido' : 'Vivo'
        return outcomeFilter.includes(label)
      })
    }
    if (unidadFilter.length > 0) list = list.filter(o => unidadFilter.includes(o.properties?.unidad_de_negocio_oferta || o._enriched?.dealProps?.unidad_de_negocio_deal || 'Sin asignar'))

    list.forEach(o => {
      const label = o._score?.label
      if (label && stats[label]) {
        stats[label].count++
        stats[label].value += parseFloat(o.properties?.valor_oferta || 0)
      }
    })
    return stats
  }, [scoredOffers, outcomeFilter, unidadFilter, stageMap])

  const outcomeStats = useMemo(() => {
    let Ganado = { count: 0, value: 0 }
    let Perdido = { count: 0, value: 0 }
    let Vivo = { count: 0, value: 0 }

    let list = scoredOffers.filter(o => String(o.properties?.estado_de_la_oferta_presupuesto).toLowerCase().trim() !== 'obsoleta')
    if (scoreFilter.length > 0) list = list.filter(o => scoreFilter.includes(o._score?.label))
    if (unidadFilter.length > 0) list = list.filter(o => unidadFilter.includes(o.properties?.unidad_de_negocio_oferta || o._enriched?.dealProps?.unidad_de_negocio_deal || 'Sin asignar'))

    list.forEach(o => {
      const e = o._enriched || {}
      const dp = e.dealProps || {}
      const stageName = String(stageMap[dp.dealstage] || dp.dealstage).toLowerCase()
      
      const isWon = stageName.includes('ganad') || stageName.includes('won')
      const isLostOrDiscarded = stageName.includes('perdid') || stageName.includes('descartad')
      const val = parseFloat(o.properties?.valor_oferta || 0)

      if (isWon) {
        Ganado.count++
        Ganado.value += val
      } else if (isLostOrDiscarded) {
        Perdido.count++
        Perdido.value += val
      } else {
        Vivo.count++
        Vivo.value += val
      }
    })
    return { Ganado, Vivo, Perdido }
  }, [scoredOffers, scoreFilter, unidadFilter, stageMap])

  const { unidadStats } = useMemo(() => {
    const uMap = {}
    
    let list = scoredOffers.filter(o => String(o.properties?.estado_de_la_oferta_presupuesto).toLowerCase().trim() !== 'obsoleta')
    if (scoreFilter.length > 0) list = list.filter(o => scoreFilter.includes(o._score?.label))
    if (outcomeFilter.length > 0) {
      list = list.filter(o => {
        const stageName = String(stageMap[o._enriched?.dealProps?.dealstage] || o._enriched?.dealProps?.dealstage).toLowerCase()
        const isWon = stageName.includes('ganad') || stageName.includes('won')
        const isLostOrDiscarded = stageName.includes('perdid') || stageName.includes('descartad')
        const label = isWon ? 'Ganado' : isLostOrDiscarded ? 'Perdido' : 'Vivo'
        return outcomeFilter.includes(label)
      })
    }
    
    list.forEach(o => {
      const u = o.properties?.unidad_de_negocio_oferta || o._enriched?.dealProps?.unidad_de_negocio_deal || 'Sin asignar'
      if (!uMap[u]) uMap[u] = { count: 0, value: 0 }
      uMap[u].count++
      uMap[u].value += parseFloat(o.properties?.valor_oferta || 0)
    })
    return {
      unidadStats: Object.entries(uMap).sort((a, b) => {
        if (String(a[0]).trim().toUpperCase() === 'RCM') return -1
        if (String(b[0]).trim().toUpperCase() === 'RCM') return 1
        return b[1].value - a[1].value
      })
    }
  }, [scoredOffers, scoreFilter, outcomeFilter, stageMap])

  const { estadoPartidaOptions, tipoPartidaOptions, stageOptions } = useMemo(() => {
    // Keep options anchored to 'ofertas' (raw data) so they don't disappear
    const epSet = new Set()
    const tpSet = new Set()
    const sSet = new Set()

    ofertas.forEach(o => {
      const ep = o._enriched?.dealProps?.madurez_en_adjudicacion_obra__proyecto
      if (ep) epSet.add(ep)
      const tp = o._enriched?.dealProps?.tipo_de_obra__proyecto
      if (tp) tpSet.add(tp)
      const s = o._enriched?.dealProps?.dealstage
      if (s) sSet.add(s)
    })

    const sortedStages = [...sSet].map(id => ({
      value: id,
      label: stageMap[id] || id
    })).sort((a,b) => a.label.localeCompare(b.label))

    return {
      estadoPartidaOptions: [...epSet].sort(),
      tipoPartidaOptions: [...tpSet].sort(),
      stageOptions: sortedStages
    }
  }, [ofertas, stageMap])

  // ── Handlers ──

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }
  function handleStatCard(label) {
    if (label === 'Total') { setActiveStatCard([]); return }
    setActiveStatCard(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])
  }
  function handleUnidadCard(name) {
    setUnidadFilter(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }
  function handleOutcomeCard(label) {
    setOutcomeFilter(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])
  }
  function clearAll() {
    setSearch('')
    setTipoFilter([])
    setActiveStatCard([])
    setUnidadFilter([])
    setScoreFilter([])
    setOutcomeFilter([])
    setEstadoPartidaFilter([])
    setTipoPartidaFilter([])
    setStageFilter([])
  }
  function handleStatusUpdate(ofertaId, newStatus) {
    setOfertas(prev => {
      const updated = prev.map(o =>
        o.id === ofertaId
          ? { ...o, properties: { ...o.properties, estado_de_la_oferta_presupuesto: newStatus } }
          : o
      )
      // Actualizar el caché de localStorage para que persista tras recargar
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
        if (cached.data) {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cached, data: updated }))
        }
      } catch (e) { console.warn('Error al actualizar cache local:', e) }
      return updated
    })
  }

  function handlePresupuestadorUpdate(ofertaId, newValue) {
    setOfertas(prev => {
      const updated = prev.map(o =>
        o.id === ofertaId
          ? { ...o, properties: { ...o.properties, presupuestador_asignado: newValue } }
          : o
      )
      // Update local cache
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
        if (cached.data) {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cached, data: updated }))
        }
      } catch (e) { console.warn('Error al actualizar cache local:', e) }
      return updated
    })
  }

  async function handleSaveScores() {
    const pairs = scoredFiltered
      .filter(o => o._score && o._enriched?.dealId)
      .map(o => ({ dealId: o._enriched.dealId, score: o._score.score }))
    if (!pairs.length) return
    
    setSavingScores(true)
    setSyncProgress({ current: 0, total: pairs.length })
    try {
      await writeDealScoresBatch(pairs, (current, total) => {
        setSyncProgress({ current, total })
      })
      setSavedScores(true)
      setTimeout(() => {
        setSavedScores(false)
        setSyncProgress(null)
      }, 3500)
    } catch (e) { 
      console.error('Error saving scores:', e)
      alert(`Error al sincronizar: ${e.message}`)
    } finally { 
      setSavingScores(false) 
    }
  }

  // ── Derived values (non-hook, safe after all useMemos) ──
  const hasFilters = tipoFilter.length || activeStatCard.length || unidadFilter.length || search || scoreFilter.length

  // ── Derived values ──
  const totalValue  = ofertas.reduce((s, o) => s + parseFloat(o.properties?.valor_oferta || 0), 0)
  const filteredValue = scoredFiltered.reduce((s, o) => s + parseFloat(o.properties?.valor_oferta || 0), 0)
  const countStatusInFiltered = (status) => scoredFiltered.filter(o => o.properties?.estado_de_la_oferta_presupuesto === status).length
  const totalFiltered = scoredFiltered.length

  // ── Render ──
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <Spinner size="lg" />
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-steel-300 text-sm font-medium animate-pulse">
          {loadProgress.loaded > 0
            ? `${loadProgress.loaded} ofertas encontradas...`
            : 'Conectando con HubSpot...'}
        </p>
        {loadProgress.loaded > 0 && (
          <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-500"
              style={{ width: `${Math.min((loadProgress.loaded / 500) * 80, 80)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel de <span className="text-accent-400">Ofertas</span></h2>
          <p className="text-steel-400 text-sm mt-1">
            {hasFilters
              ? <><span className="text-white font-semibold">{filtered.length}</span> de {ofertas.length} ofertas · Valor: <span className="text-emerald-400 font-semibold">{formatCurrency(filteredValue)}</span></>
              : <>{ofertas.length} ofertas · Valor total: <span className="text-emerald-400 font-semibold">{formatCurrency(totalValue)}</span></>
            }
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchOfertas} className="inline-flex items-center gap-2 px-5 py-3 bg-surface-700/50 border border-white/8 text-steel-300 text-sm font-medium rounded-xl hover:text-white hover:border-white/15 transition-all">
            <RefreshCw className="w-4 h-4" />Recargar
          </button>
          {matrices.length > 0 && (
            <button
              onClick={handleSaveScores}
              disabled={savingScores}
              className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-xl transition-all border ${
                savedScores   ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : savingScores ? 'bg-surface-700/50 border-white/8 text-steel-500 cursor-wait'
                              : 'bg-surface-700/50 border-white/8 text-steel-300 hover:text-white hover:border-white/15'
              }`}
              title="Guardar scores al campo score_rcm de cada Negocio en HubSpot"
            >
              <CloudUpload className="w-4 h-4" />
              {savedScores ? '¡Guardado!' : savingScores ? 'Guardando...' : 'Scores → HubSpot'}
            </button>
          )}
          <Link to="/crear" id="btn-create-offer" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            <FileText className="w-4 h-4" />Nueva Oferta
          </Link>
          <button
            onClick={() => { setSelectionMode(!selectionMode); setSelectedOffers(new Set()) }}
            className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all border uppercase tracking-wider ${
              selectionMode
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-surface-700/50 border-white/8 text-steel-300 hover:text-white hover:border-white/15'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            {selectionMode ? '✕ Salir Comité' : '🎯 Modo Comité'}
          </button>
        </div>
      </div>

      {/* Barra de progreso de carga progresiva */}
      {loadingMore && !loading && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-accent-500/8 border border-accent-500/20">
          <div className="flex gap-1 items-center shrink-0">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce"
                style={{ animationDelay: `${i * 130}ms` }}
              />
            ))}
          </div>
          <span className="text-accent-300 text-xs font-medium">
            {loadProgress.phase === 'enriching'
              ? `Enriqueciendo datos de ${loadProgress.loaded} ofertas...`
              : `Cargando ofertas... ${loadProgress.loaded} encontradas`}
          </span>
          <div className="ml-auto h-1.5 w-40 rounded-full bg-white/10 overflow-hidden shrink-0">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-700"
              style={{
                width: loadProgress.phase === 'enriching'
                  ? '88%'
                  : `${Math.min((loadProgress.loaded / 500) * 70, 70)}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Search and Filters Area — Centered */}
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="relative w-full max-w-3xl group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-steel-500 group-focus-within:text-accent-400 transition-colors pointer-events-none" />
          <input
            id="search-offers" type="text"
            placeholder="Buscar por nº, negocio, empresa, presupuestador, provincia..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-14 py-5 rounded-2xl bg-surface-700/40 border border-white/10 text-white text-base placeholder-steel-500 focus:outline-none focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/10 transition-all shadow-xl"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-steel-500 hover:text-white p-1">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap justify-center items-center gap-4">
          <MultiFilter
            id="filter-stage"
            icon={FileText}
            label="Etapa"
            options={stageOptions}
            selected={stageFilter}
            onChange={setStageFilter}
          />
          <MultiFilter
            id="filter-tipo-partida"
            icon={Briefcase}
            label="Tipo Partida"
            options={tipoPartidaOptions}
            selected={tipoPartidaFilter}
            onChange={setTipoPartidaFilter}
          />
          <MultiFilter
            id="filter-estado-partida"
            icon={Zap}
            label="Estado Partida"
            options={estadoPartidaOptions}
            selected={estadoPartidaFilter}
            onChange={setEstadoPartidaFilter}
          />
          <MultiFilter
            id="filter-tipo-oferta"
            icon={Layers}
            label="Tipo Oferta"
            options={TIPOS_OFERTA}
            selected={tipoFilter}
            onChange={setTipoFilter}
          />
          <MultiFilter
            id="filter-estado-oferta"
            icon={Check}
            label="Estado Oferta"
            options={OFFER_STATUSES.map(s => ({ value: s.value, label: s.label }))}
            selected={activeStatCard}
            onChange={setActiveStatCard}
          />
          {(search || tipoFilter.length || estadoPartidaFilter.length || tipoPartidaFilter.length || activeStatCard.length || unidadFilter.length || scoreFilter.length || outcomeFilter.length) ? (
            <button 
              onClick={clearAll} 
              className="px-4 py-2 text-[10px] font-black text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 bg-red-500/5 hover:bg-red-500/10 rounded-xl border border-red-500/20"
            >
              <X className="w-4 h-4" /> LIMPIAR TODO
            </button>
          ) : null}
        </div>
      </div>

      {/* Unidad de negocio breakdown */}
      {unidadStats.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xs font-semibold text-accent-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4" />Unidad de Negocio <span className="text-steel-500 normal-case font-normal">(pincha para filtrar)</span>
            {unidadFilter.length > 0 && (
              <button onClick={() => setUnidadFilter([])} className="ml-auto text-steel-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5">
            {/* Grupo Ruiz — global "all units" card */}
            {(() => {
              const globalActive = unidadFilter.length === 0
              const globalCount = unidadStats.reduce((s, [, st]) => s + st.count, 0)
              const globalValue = unidadStats.reduce((s, [, st]) => s + st.value, 0)
              return (
                <button
                  key="unidad-total"
                  type="button"
                  onClick={() => setUnidadFilter([])}
                  style={{
                    background: 'linear-gradient(135deg, rgba(120,20,20,0.35) 0%, rgba(60,8,8,0.15) 100%)',
                    boxShadow: globalActive
                      ? '0 0 18px rgba(163,41,41,0.5), 0 0 6px rgba(163,41,41,0.25)'
                      : '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                  className={`flex flex-col items-center justify-center px-4 py-6 rounded-2xl border text-center transition-all duration-300 ${
                    globalActive ? 'border-red-700/60 scale-[1.01]' : 'border-red-900/30 hover:border-red-800/50 hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3 mb-4">
                    <img src="/logo.png" alt="" className="w-10 h-10 object-contain shrink-0 opacity-90 drop-shadow-xl" />
                    <p className={`text-lg font-black tracking-widest uppercase truncate ${globalActive ? 'text-red-300' : 'text-white/90'}`}>Grupo Ruiz</p>
                  </div>
                  <p className="text-emerald-400 font-black text-2xl tracking-tight">{formatCurrency(globalValue)}</p>
                  <p className="text-steel-400 text-sm mt-1 font-medium">{globalCount} Negocios {globalActive ? 'totales' : ''}</p>
                </button>
              )
            })()}
            {unidadStats.map(([name, stats]) => (
              <button
                key={name}
                type="button"
                onClick={() => handleUnidadCard(name)}
                style={unidadFilter.includes(name) ? { boxShadow: '0 0 16px rgba(41,182,246,0.55), 0 0 5px rgba(41,182,246,0.3)' } : {}}
                className={`flex flex-col items-center justify-center px-5 py-6 rounded-2xl border text-center transition-all ${unidadFilter.includes(name) ? 'border-accent-500/70 bg-accent-500/10 scale-[1.02]' : 'border-white/10 bg-surface-800/60 hover:border-white/20 hover:bg-white/5'}`}
              >
                <div className="flex flex-col items-center justify-center w-full mb-4 mt-auto">
                  <p className="text-white text-lg font-black truncate tracking-wider uppercase mb-1">{name}</p>
                </div>
                <div className="mt-auto flex flex-col items-center justify-center">
                  <p className="text-emerald-400 font-black text-2xl tracking-tight">{formatCurrency(stats.value)}</p>
                  <p className="text-steel-400 text-sm mt-1 font-medium">{stats.count} Negocios</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Score Summary Area (Centered & Enriched) */}
      {scoredOffers.some(o => o._score) && (
        <div className="glass-card rounded-2xl p-8 flex flex-col gap-8 w-full">
          <div className="flex flex-col lg:flex-row justify-center gap-16 lg:gap-[500px] w-full max-w-[1800px] mx-auto px-2 lg:px-8">
            {/* SCORE SUMMARY - LEFT */}
            <div className="w-full lg:w-[40%] max-w-[650px] flex flex-col">
              <h3 className="text-sm font-semibold text-accent-400 uppercase tracking-widest flex items-center justify-center gap-2 mb-6 relative">
                <Zap className="w-5 h-5 text-yellow-400" /> SCORE DE OFERTAS
                <button
                  disabled={scoreFilter.length === 0}
                  onClick={() => setScoreFilter([])}
                  className={`ml-3 flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${
                    scoreFilter.length > 0 
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)] cursor-pointer'
                      : 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed opacity-50'
                  }`}
                  title="Resetear filtros de Score"
                >
                  <span className={`text-[10px] ${scoreFilter.length > 0 ? "drop-shadow-md" : ""}`}>✖</span>
                  RESET
                </button>
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 h-full">
                {[
                  { label: 'Alto',  dot: '🟢', color: 'text-emerald-400', border: 'border-emerald-500/50', activeBg: 'bg-emerald-500/10', neon: '0 0 30px rgba(16,185,129,0.3)', hover: 'hover:border-emerald-500/30' },
                  { label: 'Medio', dot: '🟡', color: 'text-amber-400',   border: 'border-amber-500/50',   activeBg: 'bg-amber-500/10',   neon: '0 0 30px rgba(245,158,11,0.3)', hover: 'hover:border-amber-500/30' },
                  { label: 'Bajo',  dot: '🔴', color: 'text-red-400',     border: 'border-red-500/50',     activeBg: 'bg-red-500/10',     neon: '0 0 30px rgba(239,68,68,0.3)', hover: 'hover:border-red-500/30' },
                ].map(({ label, dot, color, border, activeBg, neon, hover }) => {
                  const isActive = scoreFilter.includes(label)
                  const stats = scoreStats[label] || { count: 0, value: 0 }
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setScoreFilter(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])}
                      className={`flex flex-col items-center px-4 py-5 rounded-2xl border transition-all duration-300 flex-1 group ${
                        isActive
                          ? `${activeBg} ${border} scale-[1.02] shadow-[${neon}]`
                          : `border-white/10 bg-surface-800/40 ${hover} hover:bg-white/5`
                      }`}
                      style={isActive ? { boxShadow: neon } : {}}
                    >
                      <div className="flex flex-col items-center justify-center w-full mb-4">
                        <span className="text-4xl mb-2 drop-shadow-xl group-hover:scale-110 transition-transform">{dot}</span>
                        <p className={`text-sm font-black tracking-widest uppercase ${color}`}>{label}</p>
                      </div>
                      <div className="text-center w-full mt-auto">
                        <div className="flex flex-col items-center justify-center mb-3">
                          <p className="text-xl xl:text-2xl font-black text-white whitespace-nowrap tracking-tight">{formatCurrency(stats.value)}</p>
                          <span className="text-xs text-steel-400 font-medium mt-1">{stats.count} Negocios</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden shadow-inner">
                          <div 
                            className={`h-full ${label === 'Alto' ? 'bg-emerald-500' : label === 'Medio' ? 'bg-amber-500' : 'bg-red-500'} transition-all duration-700 opacity-90`} 
                            style={{ width: `${Math.min((stats.count / (scoredOffers.length || 1)) * 100, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* OUTCOMES SUMMARY - RIGHT */}
            <div className="w-full lg:w-[40%] max-w-[650px] flex flex-col">
              <div className="w-full flex flex-col">
                <h3 className="text-sm font-semibold text-accent-400 uppercase tracking-widest flex items-center justify-center gap-2 mb-6 relative">
                  <Briefcase className="w-5 h-5 text-accent-400" /> ESTADO DE NEGOCIOS
                  <button
                    disabled={outcomeFilter.length === 0}
                    onClick={() => setOutcomeFilter([])}
                    className={`ml-3 flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${
                      outcomeFilter.length > 0 
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)] cursor-pointer'
                        : 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed opacity-50'
                    }`}
                    title="Resetear filtros de Estado"
                  >
                    <span className={`text-[10px] ${outcomeFilter.length > 0 ? "drop-shadow-md" : ""}`}>✖</span>
                    RESET
                  </button>
                </h3>
                <div className="flex flex-col sm:flex-row gap-3 h-full">
                {[
                  { label: 'Ganado', icon: '🏆', color: 'text-[#00e676]', border: 'border-[#00e676]/50', activeBg: 'bg-[#00e676]/15', bg: 'bg-[#00e676]/5', neon: '0 0 25px rgba(0,230,118,0.2)', hover: 'hover:border-[#00e676]/30' },
                  { label: 'Vivo',    icon: '🔥', color: 'text-amber-400', border: 'border-amber-400/50',  activeBg: 'bg-amber-400/15', bg: 'bg-amber-400/5', neon: '0 0 25px rgba(251,191,36,0.2)', hover: 'hover:border-amber-400/30' },
                  { label: 'Perdido', icon: '💀', color: 'text-[#ff1a40]', border: 'border-[#ff1a40]/50', activeBg: 'bg-[#ff1a40]/15', bg: 'bg-[#ff1a40]/5', neon: '0 0 25px rgba(255,26,64,0.2)', hover: 'hover:border-[#ff1a40]/30' },
                ].map(({ label, icon, color, border, bg, activeBg, neon, hover }) => {
                  const isActive = outcomeFilter.includes(label)
                  const stats = outcomeStats[label] || { count: 0, value: 0 }
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setOutcomeFilter(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])}
                      className={`flex flex-col items-center px-4 py-5 rounded-2xl border transition-all duration-300 flex-1 group ${
                        isActive
                          ? `${activeBg} ${border} scale-[1.02] shadow-[${neon}]`
                          : `border-white/10 ${bg} ${hover} hover:bg-white/5`
                      }`}
                      style={isActive ? { boxShadow: neon } : {}}
                    >
                      <div className="flex flex-col items-center justify-center w-full mb-4">
                        <span className="text-4xl mb-2 drop-shadow-xl group-hover:scale-110 transition-transform">{icon}</span>
                        <p className={`text-sm font-black tracking-widest uppercase ${color}`}>{label}</p>
                      </div>
                      <div className="text-center w-full mt-auto">
                        <div className="flex flex-col items-center justify-center mb-3">
                          <p className="text-xl xl:text-2xl font-black text-white whitespace-nowrap tracking-tight">{formatCurrency(stats.value)}</p>
                          <span className="text-xs text-steel-400 font-medium mt-1">{stats.count} Negocios</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/20 rounded-full mt-2 overflow-hidden shadow-inner">
                          <div 
                            className={`h-full ${label === 'Ganado' ? 'bg-[#00e676]' : label === 'Perdido' ? 'bg-[#ff1a40]' : 'bg-amber-400'} opacity-80 transition-all duration-700`} 
                            style={{ width: `${Math.min((stats.count / (scoredOffers.length || 1)) * 100, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasFilters && (
        <div className="flex items-center gap-3 text-xs text-steel-400">
          <Filter className="w-4 h-4 shrink-0" />
          <span>Mostrando <span className="text-white font-semibold">{scoredFiltered.length}</span> de {ofertas.length} ofertas</span>
          <button onClick={clearAll} className="text-accent-400 hover:text-accent-300 underline ml-1">Limpiar todo</button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-6 py-4 text-red-400 text-sm">
          Error: {error} <button onClick={fetchOfertas} className="ml-3 underline hover:text-red-300">Reintentar</button>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" id="offers-table">
            <thead>
              <tr className="border-b border-white/6 bg-white/5">
                {selectionMode && (
                  <th className="px-3 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedOffers.size > 0 && selectedOffers.size === scoredFiltered.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOffers(new Set(scoredFiltered.map(o => o.id)))
                        } else {
                          setSelectedOffers(new Set())
                        }
                      }}
                      className="w-4 h-4 rounded border-white/20 bg-surface-800 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                )}
                {COLUMNS.map(({ field, label }) => (
                  <th key={field} onClick={() => toggleSort(field)}
                    className="text-left px-5 py-4 text-steel-500 font-bold tracking-wider uppercase text-[11px] cursor-pointer hover:text-white transition-colors select-none">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      {label}
                      <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === field ? 'text-accent-400' : 'text-steel-800'}`} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {scoredFiltered.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} className="px-5 py-20 text-center text-steel-500">
                  {hasFilters ? 'No hay ofertas con esos filtros.' : 'No hay ofertas. ¡Crea la primera!'}
                </td></tr>
              ) : scoredFiltered.map((oferta, i) => {
                const p = oferta.properties || {}
                const e = oferta._enriched || {}
                const dp = e.dealProps || {}
                const dealId = e.dealId
                const scoreResult = oferta._score

                const stageName = String(stageMap[dp.dealstage] || dp.dealstage).toLowerCase()
                const isLostOrDiscarded = stageName.includes('perdid') || stageName.includes('descartad')
                const isWon = stageName.includes('ganad') || stageName.includes('won')

                let rowBg = 'hover:bg-white/4'
                if (isLostOrDiscarded) rowBg = 'bg-[#ff1a40]/15 hover:bg-[#ff1a40]/25 shadow-[inset_0_0_25px_rgba(255,26,64,0.25)] border-y border-[#ff1a40]/30'
                if (isWon) rowBg = 'bg-[#00e676]/15 hover:bg-[#00e676]/25 shadow-[inset_0_0_25px_rgba(0,230,118,0.25)] border-y border-[#00e676]/30'

                const isSelected = selectedOffers.has(oferta.id)

                return (
                  <tr key={oferta.id} className={`${rowBg} transition-colors group ${isSelected ? 'ring-1 ring-amber-500/40 bg-amber-500/5' : ''}`} style={{ animationDelay: `${i * 5}ms` }}>
                    {selectionMode && (
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedOffers(prev => {
                              const next = new Set(prev)
                              if (next.has(oferta.id)) next.delete(oferta.id)
                              else next.add(oferta.id)
                              return next
                            })
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-surface-800 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <a
                        href={hsOfertaUrl(oferta.id)}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-navy-900/50 border border-accent-500/30 text-accent-400 text-[12px] font-black hover:bg-accent-500/15 transition-all"
                      >
                        {p.n__de_oferta || '—'}
                      </a>
                    </td>
                    <td className="px-5 py-4 text-steel-400 text-[11px] tabular-nums font-medium">{p.numero_de_oferta_heredado || '—'}</td>
                    <td className="px-5 py-4 text-steel-300 text-[11px] font-bold truncate max-w-[120px]" title={dp.unidad_de_negocio_deal}>{dp.unidad_de_negocio_deal || '—'}</td>
                    <td className="px-5 py-4 text-steel-300 text-[11px] max-w-[160px] truncate" title={e.companyName}>{e.companyName || '—'}</td>
                    <td className="px-5 py-4 font-bold text-white max-w-[360px]">
                      {e.dealName ? (
                        dealId ? (
                          <a href={hsDealUrl(dealId)} target="_blank" rel="noopener noreferrer" className="hover:text-accent-300 transition-colors line-clamp-2 leading-tight text-[12px]">
                            {e.dealName}
                          </a>
                        ) : <span className="line-clamp-2 leading-tight text-[12px]">{e.dealName}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4 text-steel-400 text-[11px] truncate max-w-[160px]" title={stageMap[dp.dealstage] || dp.dealstage}>
                      {stageMap[dp.dealstage] || dp.dealstage || '—'}
                    </td>
                    <td className="px-5 py-4 text-center text-emerald-400 font-bold text-[12px]">
                      {dp.peso_total_cmr_toneladas || '—'}
                    </td>
                    <td className="px-5 py-4 text-steel-400 text-[11px] whitespace-nowrap">
                      {dp.fecha_objetivo_para_ofertar ? new Date(dp.fecha_objetivo_para_ofertar).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-4 text-steel-300 text-[11px] truncate max-w-[120px]" title={dp.ubicacion_provincia_obra__proyecto}>{dp.ubicacion_provincia_obra__proyecto || '—'}</td>
                    <td className="px-5 py-4">
                      <PresupuestadorEditor 
                        ofertaId={oferta.id}
                        currentValue={p.presupuestador_asignado}
                        options={presupuestadores}
                        onUpdate={handlePresupuestadorUpdate}
                      />
                    </td>
                    <td className="px-5 py-4 text-steel-400 text-[11px] truncate max-w-[140px]" title={dp.tipo_de_obra__proyecto}>{dp.tipo_de_obra__proyecto || '—'}</td>
                    <td className="px-5 py-4 text-steel-400 text-[11px] truncate max-w-[140px]" title={dp.madurez_en_adjudicacion_obra__proyecto}>{dp.madurez_en_adjudicacion_obra__proyecto || '—'}</td>
                    <td className="px-5 py-4 text-steel-500 text-[11px] truncate max-w-[140px]" title={p.tipo_de_oferta}>{p.tipo_de_oferta || '—'}</td>
                    <td className="px-5 py-4">
                      <StatusEditor
                        ofertaId={oferta.id}
                        currentStatus={p.estado_de_la_oferta_presupuesto}
                        onUpdate={handleStatusUpdate}
                      />
                    </td>
                    <td className="px-5 py-4 text-center text-emerald-400 font-semibold text-[11px] tabular-nums whitespace-nowrap">
                      {p.valor_oferta ? formatCurrency(p.valor_oferta) : '—'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {scoreResult ? (
                        <span className={`text-[12px] font-black ${scoreResult.color}`}>{scoreResult.score}%</span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {scoredFiltered.length > 0 && (
          <div className="border-t border-white/6 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-steel-500">{scoredFiltered.length} oferta{scoredFiltered.length !== 1 ? 's' : ''}</span>
            <span className="text-xs text-steel-500">
              Valor filtrado: <span className="text-emerald-400 font-semibold">{formatCurrency(filteredValue)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Floating Selection Bar — Modo Comité */}
      {selectionMode && selectedOffers.size > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-surface-800/95 backdrop-blur-xl border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2),0_25px_50px_rgba(0,0,0,0.5)]">
            <span className="text-amber-400 font-black text-sm tabular-nums">
              {selectedOffers.size} oferta{selectedOffers.size !== 1 ? 's' : ''} seleccionada{selectedOffers.size !== 1 ? 's' : ''}
            </span>
            <div className="w-px h-6 bg-white/10"></div>
            <button
              onClick={() => setSelectedOffers(new Set())}
              className="text-xs text-steel-400 hover:text-white transition-colors font-medium"
            >
              Deseleccionar
            </button>
            <button
              disabled={sendingToBacklog}
              onClick={async () => {
                setSendingToBacklog(true)
                try {
                  const selectedData = scoredFiltered.filter(o => selectedOffers.has(o.id))
                  await addToBacklog(selectedData, user?.email)
                  setSelectedOffers(new Set())
                  setSelectionMode(false)
                  navigateTo('/backlog')
                } catch (err) {
                  console.error('Error enviando al backlog:', err)
                  alert('Error enviando al backlog: ' + (err?.message || JSON.stringify(err)))
                } finally {
                  setSendingToBacklog(false)
                }
              }}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                sendingToBacklog
                  ? 'bg-amber-500/20 text-amber-400/60 cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02]'
              }`}
            >
              {sendingToBacklog ? (
                <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sendingToBacklog ? 'Enviando...' : 'Enviar al Backlog'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
