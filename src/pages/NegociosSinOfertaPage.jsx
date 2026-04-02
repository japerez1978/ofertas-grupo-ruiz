import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, X, Filter, RefreshCw, FileText,
  ExternalLink, Briefcase, AlertTriangle, ChevronDown
} from 'lucide-react'
import { getDealsWithoutOfertas, getDealStagesMap } from '../services/hubspot'
import { formatCurrency, formatDate } from '../utils/helpers'

/* ─── Skeleton de fila (UX mientras carga) ─── */
function SkeletonRow({ index = 0 }) {
  const d = (extra = 0) => ({ animationDelay: `${index * 60 + extra}ms` })
  const cell = (w, extra = 0, cls = '') =>
    <div className={`h-3 bg-white/6 rounded-md animate-pulse ${cls}`} style={{ width: w, ...d(extra) }} />
  return (
    <tr className="border-b border-white/4">
      <td className="px-4 py-4">
        <div className="space-y-2">
          <div className="h-3.5 bg-white/8 rounded-md animate-pulse" style={{ width: '72%', ...d() }} />
          <div className="h-2 bg-emerald-400/8 rounded-md animate-pulse" style={{ width: '28%', ...d(40) }} />
        </div>
      </td>
      <td className="px-4 py-4">{cell('80%', 20)}</td>
      <td className="px-4 py-4">{cell('55%', 40)}</td>
      <td className="px-4 py-4 text-right">{cell('45%', 60, 'ml-auto')}</td>
      <td className="px-4 py-4">{cell('50%', 0)}</td>
      <td className="px-4 py-4">{cell('65%', 30)}</td>
      <td className="px-4 py-4">
        <div className="h-5 bg-white/5 rounded-md animate-pulse" style={{ width: '70%', ...d(50) }} />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 bg-amber-500/8 rounded-full animate-pulse" style={{ width: '75%', ...d(70) }} />
      </td>
      <td />
    </tr>
  )
}

const HS_PORTAL = '147691795'
const HS_DOMAIN = 'https://app-eu1.hubspot.com'
const CACHE_KEY = 'gr_negocios_sin_oferta_cache'
const CACHE_TTL = 15 * 60 * 1000 // 15 minutos

function hsDealUrl(dealId) {
  return `${HS_DOMAIN}/contacts/${HS_PORTAL}/deal/${dealId}`
}

/* ─── Multi-chip filter ─── */
function ChipFilter({ icon: Icon, label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  function toggle(val) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all border ${selected.length > 0 ? 'bg-amber-500/15 border-amber-500/60 text-amber-300' : 'bg-surface-700/50 border-white/8 text-steel-400 hover:text-white hover:border-white/15'}`}
        style={selected.length > 0 ? { boxShadow: '0 0 14px rgba(251,191,36,0.4), 0 0 3px rgba(251,191,36,0.2)' } : {}}
      >
        <Icon className="w-4 h-4" />
        {label}
        {selected.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{selected.length}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {selected.length > 0 && (
        <button type="button" onClick={e => { e.stopPropagation(); onChange([]) }} className="ml-1 text-steel-500 hover:text-white transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-72 max-h-72 overflow-y-auto rounded-xl bg-surface-700 border border-white/10 shadow-2xl py-1">
          {options.length === 0 && <p className="px-4 py-3 text-xs text-steel-500">Sin opciones disponibles</p>}
          {options.map(opt => {
            const isChecked = selected.includes(opt)
            return (
              <label key={opt} className={`flex items-center gap-2.5 px-4 py-2 text-sm cursor-pointer transition-colors ${isChecked ? 'text-white bg-amber-500/10' : 'text-steel-300 hover:bg-white/5 hover:text-white'}`}>
                <input type="checkbox" checked={isChecked} onChange={() => toggle(opt)} className="w-3.5 h-3.5 rounded border-white/20 bg-surface-800 text-amber-500 focus:ring-0 cursor-pointer" />
                {opt}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Página principal ─── */
export default function NegociosSinOfertaPage() {
  const [deals, setDeals]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, phase: 'scanning' })
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [estadoFilter, setEstadoFilter] = useState([])
  const [tipoFilter, setTipoFilter] = useState([])
  const [stageFilter, setStageFilter] = useState([])
  const [stageMap, setStageMap] = useState({})

  useEffect(() => {
    let hasCachedData = false;
    getDealStagesMap().then(setStageMap).catch(() => {})
    
    // RESTAURAR LÓGICA DE CACHE: Solo cargar de HubSpot si no tenemos datos frescos
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      const CACHE_LONG_TTL = 60 * 60 * 1000 // 60 minutos de tranquilidad
      if (cached.data && cached.ts && Date.now() - cached.ts < CACHE_LONG_TTL) {
        setDeals(cached.data)
        setLoading(false)
        hasCachedData = true
        console.log('[CACHE] Cargando negocios desde memoria local')
      }
    } catch { /* ignore */ }
    
    // Solo cargamos automáticamente si NO hay caché fresco
    if (!hasCachedData) {
      fetchDeals(true)
    }
  }, [])

  async function fetchDeals(showSpinner = true) {
    if (showSpinner) setLoading(true)
    setError(null)
    setLoadingMore(true)
    setLoadProgress({ loaded: 0, phase: 'scanning' })
    try {
      await getDealsWithoutOfertas({
        onProgress: ({ partial, loaded, phase }) => {
          setDeals(partial)
          setLoading(false)
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

  // ── Opciones de filtro dinámicas (de los datos cargados) ──
  const estadoOptions = useMemo(() => {
    const s = new Set()
    deals.forEach(d => { const v = d.properties?.madurez_en_adjudicacion_obra__proyecto; if (v) s.add(v) })
    return [...s].sort()
  }, [deals])

  const stageOptions = useMemo(() => {
    const s = new Set()
    deals.forEach(d => { const v = d.properties?.dealstage; if (v) s.add(v) })
    return [...s].map(id => ({ value: id, label: stageMap[id] || id }))
      .sort((a,b) => a.label.localeCompare(b.label))
  }, [deals, stageMap])

  const tipoOptions = useMemo(() => {
    const s = new Set()
    deals.forEach(d => { const v = d.properties?.sector_partida; if (v) s.add(v) })
    return [...s].sort()
  }, [deals])

  // ── Filtrado ──
  const filtered = useMemo(() => {
    let list = [...deals]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d => {
        const p = d.properties || {}
        return [p.dealname, p.sector_partida, p.madurez_en_adjudicacion_obra__proyecto,
          p.ubicacion_provincia_obra__proyecto, p.unidad_de_negocio_deal]
          .some(f => (f || '').toLowerCase().includes(q))
      })
    }
    if (estadoFilter.length > 0)
      list = list.filter(d => estadoFilter.includes(d.properties?.madurez_en_adjudicacion_obra__proyecto))
    if (tipoFilter.length > 0)
      list = list.filter(d => tipoFilter.includes(d.properties?.sector_partida))
    if (stageFilter.length > 0)
      list = list.filter(d => stageFilter.includes(d.properties?.dealstage))
    return list
  }, [deals, search, estadoFilter, tipoFilter, stageFilter])

  const totalValue = useMemo(() =>
    filtered.reduce((s, d) => s + parseFloat(d.properties?.amount || 0), 0), [filtered])

  const hasFilters = search || estadoFilter.length || tipoFilter.length || stageFilter.length

  function clearAll() { setSearch(''); setEstadoFilter([]); setTipoFilter([]); setStageFilter([]) }

  // (sin spinner de página completa — usamos skeleton table en su lugar)

  // ── Render ──
  return (
    <div className="space-y-5 animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Negocios <span className="text-amber-400">sin Oferta</span>
            </h2>
          </div>
          <p className="text-steel-400 text-sm mt-1 ml-9">
            {hasFilters
              ? <><span className="text-white font-semibold">{filtered.length}</span> de {deals.length} negocios · Valor: <span className="text-emerald-400 font-semibold">{formatCurrency(totalValue)}</span></>
              : <>{deals.length} negocios pendientes de presupuestar · Valor total: <span className="text-emerald-400 font-semibold">{formatCurrency(totalValue)}</span></>
            }
          </p>
        </div>
        <button
          onClick={() => fetchDeals()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-700/50 border border-white/8 text-steel-300 text-sm font-medium rounded-xl hover:text-white hover:border-white/15 transition-all"
        >
          <RefreshCw className="w-4 h-4" />Recargar
        </button>
      </div>

      {/* Banner de progreso — visible durante toda la carga (inicial y paginación) */}
      {(loading || loadingMore) && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <div className="flex gap-1 items-center shrink-0">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: `${i * 130}ms` }} />
            ))}
          </div>
          <span className="text-amber-300 text-xs font-medium">
            {loadProgress.phase === 'scanning'
              ? 'Preparando análisis... (esto solo ocurre la primera vez)'
              : loadProgress.loaded > 0
                ? `${loadProgress.loaded} negocios sin oferta encontrados...`
                : 'Conectando con HubSpot...'}
          </span>
          <div className="ml-auto h-1 w-32 rounded-full bg-white/10 overflow-hidden shrink-0">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
              style={{ width: loadProgress.phase === 'scanning' ? '10%' : `${Math.min((loadProgress.loaded / 300) * 90, 90)}%` }}
            />
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nombre, provincia, tipo de partida..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface-700/50 border border-white/8 text-white text-sm placeholder-steel-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all"
        />
        {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-steel-500 hover:text-white"><X className="w-4 h-4" /></button>}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-start">
        <ChipFilter
          icon={FileText}
          label="Etapa"
          options={stageOptions.map(o => o.label)}
          selected={stageFilter.map(id => stageMap[id] || id)}
          onChange={(newLabels) => {
            const newIds = newLabels.map(lbl => stageOptions.find(o => o.label === lbl)?.value).filter(Boolean)
            setStageFilter(newIds)
          }}
        />
        <ChipFilter
          icon={Filter}
          label="Estado de partida"
          options={estadoOptions}
          selected={estadoFilter}
          onChange={setEstadoFilter}
        />
        <ChipFilter
          icon={Briefcase}
          label="Tipo de partida"
          options={tipoOptions}
          selected={tipoFilter}
          onChange={setTipoFilter}
        />
        {hasFilters && (
          <button onClick={clearAll} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs text-steel-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />Limpiar filtros
          </button>
        )}
      </div>

      {hasFilters && (
        <div className="flex items-center gap-3 text-xs text-steel-400">
          <Filter className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Mostrando <span className="text-white font-semibold">{filtered.length}</span> de {deals.length} negocios sin oferta</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
          Error: {error} <button onClick={() => fetchDeals()} className="ml-3 underline hover:text-red-300">Reintentar</button>
        </div>
      )}

      {/* Tabla */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" id="negocios-sin-oferta-table">
            <thead>
              <tr className="border-b border-white/6">
                {['Negocio / Partida', 'Empresa', 'Etapa', 'Unidad', 'Peso RCM (t)', 'Fecha Obj. Oferta', 'Provincia', 'Tipo Partida', 'Estado Partida', ''].map((col, i) => (
                  <th key={i} className="text-left px-5 py-4 text-steel-400 font-bold tracking-wide uppercase text-[11px] whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading
                /* ── Skeleton mientras carga la primera vez ── */
                ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} index={i} />)
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        {deals.length === 0
                          ? <span className="text-emerald-400 text-sm">¡Todos los negocios tienen oferta asociada! 🎉</span>
                          : <span className="text-steel-500 text-sm">{hasFilters ? 'No hay negocios con esos filtros.' : 'Sin resultados.'}</span>
                        }
                      </td>
                    </tr>
                  ) : filtered.map(deal => {
                const p = deal.properties || {}
                // Fecha obj: intentamos fecha_objetivo_para_ofertar, si no closedate
                const fechaRaw = p.fecha_objetivo_para_ofertar || p.closedate
                const fechaStr = fechaRaw ? formatDate(fechaRaw) : '—'

                // Urgencia de fecha
                const fechaDate = fechaRaw ? new Date(fechaRaw) : null
                const isUrgente = fechaDate && fechaDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                const isVencida = fechaDate && fechaDate < new Date()

                const stageName = String(stageMap[p.dealstage] || p.dealstage).toLowerCase()
                const isLostOrDiscarded = stageName.includes('perdid') || stageName.includes('descartad')
                const isWon = stageName.includes('ganad') || stageName.includes('won')

                let rowBg = 'hover:bg-white/4'
                if (isLostOrDiscarded) rowBg = 'bg-[#ff1a40]/15 hover:bg-[#ff1a40]/25 shadow-[inset_0_0_25px_rgba(255,26,64,0.25)] border-y border-[#ff1a40]/30'
                if (isWon) rowBg = 'bg-[#00e676]/15 hover:bg-[#00e676]/25 shadow-[inset_0_0_25px_rgba(0,230,118,0.25)] border-y border-[#00e676]/30'

                return (
                  <tr key={deal.id} className={`${rowBg} transition-colors group`}>
                    {/* Nombre del negocio */}
                    <td className="px-5 py-4 max-w-[420px]">
                      <a
                        href={hsDealUrl(deal.id)}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-start gap-1.5 font-medium text-white hover:text-amber-300 transition-colors group/link"
                      >
                        <span className="line-clamp-2 leading-snug text-[15px]" title={p.dealname}>{p.dealname || '—'}</span>
                        <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 text-amber-400 transition-opacity" />
                      </a>
                      {p.amount && (
                        <p className="text-emerald-400 text-xs font-semibold mt-1 tabular-nums">{formatCurrency(p.amount)}</p>
                      )}
                    </td>

                    {/* Empresa */}
                    <td className="px-5 py-4 text-steel-300 text-[13px] max-w-[200px]">
                      <span className="line-clamp-2 leading-snug" title={deal._companyName}>{deal._companyName || '—'}</span>
                    </td>

                    {/* Etapa */}
                    <td className="px-5 py-4 text-steel-400 text-xs max-w-[140px] truncate" title={stageMap[p.dealstage] || p.dealstage}>
                      {stageMap[p.dealstage] || p.dealstage || '—'}
                    </td>

                    {/* Unidad */}
                    <td className="px-5 py-4 text-steel-400 text-[13px] whitespace-nowrap">
                      {p.unidad_de_negocio_deal || '—'}
                    </td>

                    {/* Peso RCM */}
                    <td className="px-5 py-4 text-right tabular-nums text-[13px] whitespace-nowrap">
                      {p.peso_total_cmr_toneladas
                        ? <span className="text-steel-200 font-semibold">{parseFloat(p.peso_total_cmr_toneladas).toLocaleString('es-ES')} t</span>
                        : <span className="text-steel-600">—</span>}
                    </td>

                    {/* Fecha obj. oferta */}
                    <td className="px-5 py-4 text-[13px] whitespace-nowrap">
                      <span className={
                        isVencida ? 'text-red-400 font-bold' :
                        isUrgente ? 'text-amber-400 font-bold' :
                        'text-steel-400'
                      }>
                        {fechaStr}
                      </span>
                    </td>

                    {/* Provincia */}
                    <td className="px-5 py-4 text-steel-400 text-[13px] max-w-[120px] truncate" title={p.ubicacion_provincia_obra__proyecto}>
                      {p.ubicacion_provincia_obra__proyecto || '—'}
                    </td>

                    {/* Tipo Partida */}
                    <td className="px-5 py-4 text-steel-400 text-[13px] max-w-[140px] truncate" title={p.tipo_de_obra__proyecto}>
                      {p.tipo_de_obra__proyecto || '—'}
                    </td>

                    {/* Estado partida */}
                    <td className="px-5 py-4 text-[13px]">
                      {p.madurez_en_adjudicacion_obra__proyecto
                        ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/12 text-amber-300 border border-amber-500/30">
                            {p.madurez_en_adjudicacion_obra__proyecto}
                          </span>
                        : <span className="text-steel-600">—</span>}
                    </td>

                    {/* Acción */}
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/crear?dealId=${deal.id}&dealName=${encodeURIComponent(p.dealname || '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/12 border border-amber-500/40 text-amber-300 text-sm font-semibold rounded-lg hover:bg-amber-500/25 hover:border-amber-500/60 transition-all whitespace-nowrap opacity-0 group-hover:opacity-100"
                      >
                        <FileText className="w-4 h-4" />Crear Oferta
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="border-t border-white/6 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-steel-500">
              {filtered.length} negocio{filtered.length !== 1 ? 's' : ''} sin oferta
            </span>
            <span className="text-xs text-steel-500">
              Valor total filtrado: <span className="text-emerald-400 font-semibold">{formatCurrency(totalValue)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
