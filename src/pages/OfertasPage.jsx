import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Filter, ArrowUpDown, FileText, Euro,
  ChevronDown, X, Building2, Tag, Briefcase, Layers, RefreshCw,
  ExternalLink
} from 'lucide-react'
import { getAllOfertas } from '../services/hubspot'
import { getOfferStatusBadge, formatCurrency, OFFER_STATUSES, UNIDADES_NEGOCIO } from '../utils/helpers'
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

/* ─── Multi-select Filter ─── */
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
        className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all border ${selected.length > 0 ? 'bg-accent-500/15 border-accent-500/40 text-accent-300' : 'bg-surface-700/50 border-white/8 text-steel-400 hover:text-white hover:border-white/15'}`}
      >
        <Icon className="w-4 h-4" />
        {label}
        {selected.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-bold">{selected.length}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {selected.length > 0 && (
        <button type="button" onClick={e => { e.stopPropagation(); onChange([]) }} className="ml-1 text-steel-500 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-64 max-h-72 overflow-y-auto rounded-xl bg-surface-700 border border-white/10 shadow-2xl py-1">
          {options.map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value
            const lbl = typeof opt === 'string' ? opt : opt.label
            const isChecked = selected.includes(val)
            return (
              <label key={val} className={`flex items-center gap-2.5 px-4 py-2 text-sm cursor-pointer transition-colors ${isChecked ? 'text-white bg-accent-500/10' : 'text-steel-300 hover:bg-white/5 hover:text-white'}`}>
                <input type="checkbox" checked={isChecked} onChange={() => toggle(val)} className="w-3.5 h-3.5 rounded border-white/20 bg-surface-800 text-accent-500 focus:ring-0 cursor-pointer" />
                {lbl}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Clickable stat card ─── */
function StatCard({ label, count, color, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-card rounded-xl px-4 py-3 flex flex-col items-center min-w-[90px] transition-all cursor-pointer border ${active ? 'border-accent-500/50 bg-accent-500/10 scale-[1.03]' : 'border-transparent hover:border-white/10 hover:bg-white/3'}`}
    >
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{count}</span>
      <span className="text-[11px] text-steel-400 font-medium mt-0.5 text-center leading-tight">{label}</span>
    </button>
  )
}

const TIPOS_OFERTA = ['Exploración', 'Oferta Matriz (Inicial)', 'Repetición', 'Revisión', 'Ampliación', 'Modificación']

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState([])
  const [tipoFilter, setTipoFilter] = useState([])
  const [empresaFilter, setEmpresaFilter] = useState([])
  const [unidadFilter, setUnidadFilter] = useState(null)  // single, from card
  const [activeStatCard, setActiveStatCard] = useState(null)
  const [sortField, setSortField] = useState('n__de_oferta')
  const [sortDir, setSortDir] = useState('desc')

  const CACHE_KEY = 'gr_ofertas_cache'
  const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

  useEffect(() => {
    // Load from cache instantly while fetching fresh data
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      if (cached.data && cached.ts && Date.now() - cached.ts < CACHE_TTL) {
        setOfertas(cached.data)
        setLoading(false)
      }
    } catch (e) { /* ignore */ }

    fetchOfertas()

    // Auto-refresh every 5 minutes in background
    const interval = setInterval(() => fetchOfertas(false), CACHE_TTL)
    return () => clearInterval(interval)
  }, [])

  async function fetchOfertas(showSpinner = true) {
    if (showSpinner) setLoading(true)
    setError(null)
    try {
      const data = await getAllOfertas()
      const results = Array.isArray(data.results) ? data.results : []
      setOfertas(results)
      // Save to localStorage cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: results, ts: Date.now() }))
    } catch (err) { setError(err.message) }
    finally { if (showSpinner) setLoading(false) }
  }

  // ── Unique empresas for filter ──
  const uniqueEmpresas = useMemo(() => {
    const names = new Set()
    ofertas.forEach(o => {
      const name = o._enriched?.companyName || o.properties?.empresa_vinculada_a_oferta || ''
      if (name.trim()) names.add(name.trim())
    })
    return [...names].sort((a, b) => a.localeCompare(b, 'es'))
  }, [ofertas])

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let list = [...ofertas]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o => {
        const p = o.properties || {}
        const e = o._enriched || {}
        return [p.n__de_oferta, p.numero_de_oferta_heredado, p.presupuestador_asignado, p.tipo_de_oferta,
          p.estado_de_la_oferta_presupuesto, p.unidad_de_negocio_oferta, e.dealName, e.companyName,
          p.empresa_vinculada_a_oferta].some(f => (f || '').toLowerCase().includes(q))
      })
    }
    if (statusFilter.length > 0) list = list.filter(o => statusFilter.includes(o.properties?.estado_de_la_oferta_presupuesto))
    if (tipoFilter.length > 0) list = list.filter(o => tipoFilter.includes(o.properties?.tipo_de_oferta))
    if (empresaFilter.length > 0) list = list.filter(o => empresaFilter.includes((o._enriched?.companyName || o.properties?.empresa_vinculada_a_oferta || '').trim()))
    if (activeStatCard && activeStatCard !== 'Total') list = list.filter(o => o.properties?.estado_de_la_oferta_presupuesto === activeStatCard)
    if (unidadFilter) list = list.filter(o => (o.properties?.unidad_de_negocio_oferta || 'Sin asignar') === unidadFilter)

    list.sort((a, b) => {
      let aVal, bVal
      if (sortField === '_dealName') { aVal = a._enriched?.dealName || ''; bVal = b._enriched?.dealName || '' }
      else if (sortField === '_companyName') { aVal = a._enriched?.companyName || a.properties?.empresa_vinculada_a_oferta || ''; bVal = b._enriched?.companyName || b.properties?.empresa_vinculada_a_oferta || '' }
      else { aVal = a.properties?.[sortField] || ''; bVal = b.properties?.[sortField] || '' }
      if (sortField === 'valor_oferta' || sortField === 'n__de_oferta') return sortDir === 'asc' ? parseFloat(aVal || 0) - parseFloat(bVal || 0) : parseFloat(bVal || 0) - parseFloat(aVal || 0)
      const cmp = String(aVal).localeCompare(String(bVal), 'es', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [ofertas, search, statusFilter, tipoFilter, empresaFilter, activeStatCard, unidadFilter, sortField, sortDir])

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function handleStatCard(label) {
    // Toggle stat card filter WITHOUT clearing unidad filter (stackable)
    setActiveStatCard(prev => prev === label ? null : label)
    setStatusFilter([])  // clear multi-select when using card (they're the same axis)
  }

  function handleUnidadCard(name) {
    // Toggle unidad filter WITHOUT clearing status card (stackable)
    setUnidadFilter(prev => prev === name ? null : name)
  }

  function clearAll() {
    setStatusFilter([]); setTipoFilter([]); setEmpresaFilter([])
    setActiveStatCard(null); setUnidadFilter(null); setSearch('')
  }

  const countByStatus = s => ofertas.filter(o => o.properties?.estado_de_la_oferta_presupuesto === s).length
  const totalValue = ofertas.reduce((s, o) => s + parseFloat(o.properties?.valor_oferta || 0), 0)

  // Unidad stats - computed from filtered so they react to active filters
  const unidadStats = useMemo(() => {
    const map = {}
    filtered.forEach(o => {
      const u = o.properties?.unidad_de_negocio_oferta
      if (!u) return  // skip blank entries
      if (!map[u]) map[u] = { count: 0, value: 0 }
      map[u].count++
      map[u].value += parseFloat(o.properties?.valor_oferta || 0)
    })
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value)
  }, [filtered])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-3">
      <Spinner size="lg" />
      <p className="text-steel-400 text-sm animate-pulse">Cargando ofertas de HubSpot...</p>
    </div>
  )

  const filteredValue = filtered.reduce((s, o) => s + parseFloat(o.properties?.valor_oferta || 0), 0)
  const filteredCountByStatus = (status) => filtered.filter(o => o.properties?.estado_de_la_oferta_presupuesto === status).length

  const statusCards = [
    { label: 'Total', count: filtered.length, color: 'text-white' },
    { label: 'Solicitada', count: filteredCountByStatus('Solicitada'), color: 'text-blue-400' },
    { label: 'Asignada', count: filteredCountByStatus('Asignada'), color: 'text-cyan-400' },
    { label: 'En revisión', count: filteredCountByStatus('En revisión'), color: 'text-pink-400' },
    { label: 'Ganada', count: filteredCountByStatus('Ganada'), color: 'text-emerald-400' },
    { label: 'Desestimada', count: filteredCountByStatus('Desestimada'), color: 'text-rose-400' },
    { label: 'Perdida', count: filteredCountByStatus('Perdida'), color: 'text-red-500' },
  ]

  const columns = [
    { field: 'n__de_oferta', label: 'Nº' },
    { field: 'numero_de_oferta_heredado', label: 'Heredado' },
    { field: '_dealName', label: 'Negocio' },
    { field: '_companyName', label: 'Empresa' },
    { field: 'tipo_de_oferta', label: 'Tipo' },
    { field: 'estado_de_la_oferta_presupuesto', label: 'Estado' },
    { field: 'valor_oferta', label: 'Valor' },
  ]

  const hasFilters = statusFilter.length || tipoFilter.length || empresaFilter.length || activeStatCard || unidadFilter || search

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Panel de <span className="text-accent-400">Ofertas</span></h2>
          <p className="text-steel-400 text-sm mt-1">
            {hasFilters
              ? <><span className="text-white font-semibold">{filtered.length}</span> de {ofertas.length} ofertas · Valor: <span className="text-emerald-400 font-semibold">{formatCurrency(filteredValue)}</span></>
              : <>{ofertas.length} ofertas · Valor total: <span className="text-emerald-400 font-semibold">{formatCurrency(totalValue)}</span></>
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchOfertas} className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-700/50 border border-white/8 text-steel-300 text-sm font-medium rounded-xl hover:text-white hover:border-white/15 transition-all">
            <RefreshCw className="w-4 h-4" />Recargar
          </button>
          <Link to="/crear" id="btn-create-offer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            <FileText className="w-4 h-4" />Nueva Oferta
          </Link>
        </div>
      </div>

      {/* Status summary cards – clickable */}
      <div className="flex flex-wrap gap-2">
        {statusCards.map(c => (
          <StatCard key={c.label} {...c} active={activeStatCard === c.label} onClick={() => handleStatCard(c.label)} />
        ))}
      </div>

      {/* Unidad de negocio breakdown – clickable */}
      {unidadStats.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-accent-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4" />Resumen por Unidad de Negocio <span className="text-steel-500 normal-case font-normal">(pincha para filtrar)</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {unidadStats.map(([name, stats]) => (
              <button
                key={name}
                type="button"
                onClick={() => handleUnidadCard(name)}
                className={`flex flex-col px-4 py-3 rounded-xl border text-left transition-all ${unidadFilter === name ? 'border-accent-500/50 bg-accent-500/10 scale-[1.02]' : 'border-white/5 bg-surface-800/60 hover:border-white/15 hover:bg-white/3'}`}
              >
                <p className="text-white text-sm font-medium truncate">{name}</p>
                <p className="text-steel-500 text-xs">{stats.count} oferta{stats.count !== 1 ? 's' : ''}</p>
                <p className="text-emerald-400 font-semibold text-xs mt-1 tabular-nums">{formatCurrency(stats.value)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400 pointer-events-none" />
          <input
            id="search-offers" type="text"
            placeholder="Buscar por nº, negocio, empresa, presupuestador..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface-700/50 border border-white/8 text-white text-sm placeholder-steel-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25 transition-all"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-steel-500 hover:text-white"><X className="w-4 h-4" /></button>}
        </div>
        <MultiFilter id="filter-estado" icon={Tag} label="Estado" options={OFFER_STATUSES} selected={statusFilter} onChange={v => { setStatusFilter(v); setActiveStatCard(null) }} />
        <MultiFilter id="filter-tipo" icon={Briefcase} label="Tipo" options={TIPOS_OFERTA} selected={tipoFilter} onChange={setTipoFilter} />
        <MultiFilter id="filter-empresa" icon={Building2} label="Empresa" options={uniqueEmpresas} selected={empresaFilter} onChange={setEmpresaFilter} />
      </div>

      {/* Active filter info */}
      {hasFilters && (
        <div className="flex items-center gap-3 text-xs text-steel-400">
          <Filter className="w-3.5 h-3.5 shrink-0" />
          <span>Mostrando <span className="text-white font-semibold">{filtered.length}</span> de {ofertas.length} ofertas</span>
          <button onClick={clearAll} className="text-accent-400 hover:text-accent-300 underline ml-1">Limpiar todo</button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm">
          Error: {error} <button onClick={fetchOfertas} className="ml-3 underline hover:text-red-300">Reintentar</button>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" id="offers-table">
            <thead>
              <tr className="border-b border-white/6">
                {columns.map(({ field, label }) => (
                  <th key={field} onClick={() => toggleSort(field)}
                    className="text-left px-4 py-3.5 text-steel-400 font-semibold tracking-wide uppercase text-xs cursor-pointer hover:text-white transition-colors select-none">
                    <span className="inline-flex items-center gap-1.5">
                      {label}
                      <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-accent-400' : 'text-steel-600'}`} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right text-steel-400 font-semibold uppercase text-xs">HS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-5 py-16 text-center text-steel-500">
                  {hasFilters ? 'No hay ofertas con esos filtros.' : 'No hay ofertas. ¡Crea la primera!'}
                </td></tr>
              ) : filtered.map((oferta, i) => {
                const p = oferta.properties || {}
                const e = oferta._enriched || {}
                const statusBadge = getOfferStatusBadge(p.estado_de_la_oferta_presupuesto)
                // Deal ID from associations
                const dealAssoc = oferta.associations?.deals?.results || []
                const dealId = dealAssoc[0]?.id

                return (
                  <tr key={oferta.id} className="hover:bg-white/3 transition-colors group" style={{ animationDelay: `${i * 15}ms` }}>
                    {/* Nº Nuevo */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy-900/50 text-accent-400 text-xs font-bold tabular-nums">{p.n__de_oferta || '—'}</span>
                    </td>
                    {/* Nº Heredado */}
                    <td className="px-4 py-3.5 font-medium text-steel-300 text-xs tabular-nums">{p.numero_de_oferta_heredado || '—'}</td>
                    {/* Negocio – con enlace a HubSpot */}
                    <td className="px-4 py-3.5 font-medium text-white max-w-[200px]">
                      {e.dealName ? (
                        dealId ? (
                          <a href={hsDealUrl(dealId)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-accent-300 transition-colors group/link">
                            <span className="truncate max-w-[160px]" title={e.dealName}>{e.dealName}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100 text-accent-400 transition-opacity" />
                          </a>
                        ) : <span className="truncate max-w-[180px] block" title={e.dealName}>{e.dealName}</span>
                      ) : '—'}
                    </td>
                    {/* Empresa */}
                    <td className="px-4 py-3.5 text-steel-300 text-xs max-w-[160px] truncate" title={e.companyName || p.empresa_vinculada_a_oferta}>
                      {e.companyName || p.empresa_vinculada_a_oferta || '—'}
                    </td>
                    {/* Tipo */}
                    <td className="px-4 py-3.5 text-steel-400 text-xs">{p.tipo_de_oferta || '—'}</td>
                    {/* Estado */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>{statusBadge.label}</span>
                    </td>
                    {/* Valor */}
                    <td className="px-4 py-3.5 font-semibold text-emerald-400 tabular-nums text-sm">{formatCurrency(p.valor_oferta)}</td>
                    {/* Enlace directo a HubSpot oferta */}
                    <td className="px-4 py-3.5 text-right">
                      <a
                        href={hsOfertaUrl(oferta.id)}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-steel-500 hover:text-accent-400 transition-colors"
                        title="Ver en HubSpot"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="border-t border-white/6 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-steel-500">{filtered.length} oferta{filtered.length !== 1 ? 's' : ''}</span>
            <span className="text-xs text-steel-500">
              Valor filtrado: <span className="text-emerald-400 font-semibold">{formatCurrency(filtered.reduce((s, o) => s + parseFloat(o.properties?.valor_oferta || 0), 0))}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
