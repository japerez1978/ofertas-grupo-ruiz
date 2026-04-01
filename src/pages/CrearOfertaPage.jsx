import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  ArrowLeft,
  Hash,
  User,
  Tag,
  Wrench,
  Building2,
  Briefcase,
  Search,
  X,
  Loader2,
  CheckCircle2,
  DollarSign,
  Layers,
} from 'lucide-react'
import {
  createOferta,
  getUltimoNumeroOferta,
  searchCompanies,
  searchDeals,
  searchContacts,
  searchObras,
  getVersionesOferta,
  associateOferta,
  patchDeal,
  request, // Added to handle fetching single deal if needed
} from '../services/hubspot'
import { OFFER_STATUSES, PRESUPUESTADORES, TIPOS_OFERTA, UNIDADES_NEGOCIO } from '../utils/helpers'
import Toast from '../components/Toast'
import Spinner from '../components/Spinner'

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-white/8 text-white text-sm placeholder-steel-500 focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all'
const selectClass =
  'w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-white/8 text-white text-sm focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all cursor-pointer appearance-none'
const labelClass = 'flex items-center gap-2 text-sm font-medium text-steel-200'

/** Reusable search dropdown component */
function SearchDropdown({ id, icon: Icon, label, placeholder, onSearch, onSelect, displayKey, renderItem, selectedItem, onClear }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const debounceRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch results when requested
  const fetchResults = async (searchValue) => {
    setLoading(true)
    try {
      const data = await onSearch(searchValue.trim())
      const list = data?.results || data || []
      setResults(Array.isArray(list) ? list : [])
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Handle focus (open and load initial list if empty)
  function handleFocus() {
    if (!selectedItem) {
      setOpen(true)
      if (results.length === 0 && query.trim() === '') {
        fetchResults('')
      }
    }
  }

  function handleInput(e) {
    const value = e.target.value
    setQuery(value)
    setOpen(true)
    
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      fetchResults(value)
    }, 350)
  }

  function handleSelect(item) {
    onSelect(item)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClass}>
        <Icon className="w-4 h-4 text-accent-400" />
        {label}
      </label>

      {selectedItem ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-800/80 border border-accent-500/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-white text-sm font-medium flex-1 truncate">
            {typeof displayKey === 'function' ? displayKey(selectedItem) : selectedItem[displayKey]}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-steel-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative" ref={ref}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400 pointer-events-none" />
          <input
            id={id}
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={handleFocus}
            onClick={handleFocus}
            placeholder={placeholder}
            autoComplete="off"
            className={`${inputClass} pl-10 pr-10`}
          />
          {loading && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-400 animate-spin" />
          )}

          {open && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-surface-700 border border-white/10 shadow-2xl">
              {results.map((item, i) => (
                <button
                  key={item.id || i}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-2.5 text-sm text-steel-200 hover:bg-accent-500/10 hover:text-white transition-colors border-b border-white/4 last:border-0"
                >
                  {renderItem ? renderItem(item) : typeof displayKey === 'function' ? displayKey(item) : item[displayKey]}
                </button>
              ))}
            </div>
          )}

          {open && results.length === 0 && !loading && (
            <div className="absolute z-50 mt-1 w-full rounded-xl bg-surface-700 border border-white/10 shadow-2xl px-4 py-3">
              <p className="text-sm text-steel-400">No se encontraron resultados</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CrearOfertaPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    n_de_oferta_inicial_deal: '',
    numero_de_oferta_activa: '',
    presupuestador_asignado: '',
    estado_de_la_ultima_oferta: 'Solicitada',
    tipo_de_oferta: '',
    valor_oferta: '',
    unidad_de_negocio_oferta: '',
    empresa_vinculada_a_oferta: '',
    contacto_asociado: '',
    dealname: '',
  })
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [selectedObra, setSelectedObra] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [loadingNumber, setLoadingNumber] = useState(true)

  // Sync "Numero de oferta disponible" to HSA Deal
  const syncOfferNumberToDeal = useCallback(async (dealId, num) => {
    if (!dealId || !num) return
    try {
      await patchDeal(dealId, { numero_de_oferta_disponible: String(num) })
    } catch (err) { console.error('Error syncing number to deal:', err) }
  }, [])

  // When a deal is selected, fetch its versions to update the offer number
  const handleDealSelect = useCallback(async (deal, forcedNumber = null) => {
    setSelectedDeal(deal)
    const dealName = deal.properties?.dealname || deal.dealname || deal.name || ''
    setForm((prev) => ({ ...prev, dealname: dealName }))

    let numberToUse = forcedNumber
    if (!numberToUse) {
      try {
        const versiones = await getVersionesOferta(deal.id)
        numberToUse = (versiones?.siguiente || versiones?.next || versiones?.count + 1 || 1)
      } catch {
        numberToUse = 1
      }
    }

    setForm((prev) => ({
      ...prev,
      n_de_oferta_inicial_deal: String(numberToUse),
      numero_de_oferta_activa: String(numberToUse),
    }))

    // Sync to HubSpot deal property immediately
    syncOfferNumberToDeal(deal.id, numberToUse)
  }, [syncOfferNumberToDeal])

  // Load initial offer number on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlDealId = params.get('dealId')

    async function loadNumber() {
      let next = 1
      try {
        const data = await getUltimoNumeroOferta()
        next = (data?.ultimo || data?.numero || 0) + 1
      } catch (err) { console.error('Error fetching last number:', err) }

      setForm((prev) => ({
        ...prev,
        n_de_oferta_inicial_deal: String(next),
        numero_de_oferta_activa: String(next),
      }))

      // If we have a deal from URL, fetch it and select it
      if (urlDealId) {
        try {
          const deal = await request(`/proxy/crm/v3/objects/deals/${urlDealId}?properties=dealname`)
          handleDealSelect(deal, next)
        } catch (err) { console.error('Error fetching pre-selected deal:', err) }
      }
      setLoadingNumber(false)
    }
    loadNumber()
  }, [handleDealSelect])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    
    // Si cambia el número manual, sincronizamos con el negocio si hay uno seleccionado
    if (selectedDeal && (name === 'n_de_oferta_inicial_deal' || name === 'numero_de_oferta_activa')) {
      syncOfferNumberToDeal(selectedDeal.id, value)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.dealname?.trim() && !selectedDeal) {
      setToast({ message: 'Debes buscar y seleccionar un negocio asociado', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        n__de_oferta: String(form.n_de_oferta_inicial_deal),
        numero_de_oferta_heredado: String(form.numero_de_oferta_activa),
        presupuestador_asignado: form.presupuestador_asignado,
        estado_de_la_oferta_presupuesto: form.estado_de_la_ultima_oferta,
        tipo_de_oferta: form.tipo_de_oferta,
        valor_oferta: form.valor_oferta ? String(form.valor_oferta) : '',
        unidad_de_negocio_oferta: form.unidad_de_negocio_oferta,
        empresa_vinculada_a_oferta: form.empresa_vinculada_a_oferta
      }

      const created = await createOferta({ properties: payload })
      const ofertaId = created.id || created.results?.[0]?.id

      // ── Make associations securely using the v4 API ──
      if (ofertaId) {
        const joinPromises = []
        if (selectedDeal) {
          joinPromises.push(associateOferta(ofertaId, 'deals', selectedDeal.id).catch(() => null))
        }
        if (selectedCompany) {
          joinPromises.push(associateOferta(ofertaId, 'companies', selectedCompany.id).catch(() => null))
        }
        if (selectedContact) {
          joinPromises.push(associateOferta(ofertaId, 'contacts', selectedContact.id).catch(() => null))
        }
        if (selectedObra) {
          joinPromises.push(associateOferta(ofertaId, '2-198784785', selectedObra.id).catch(() => null))
        }
        await Promise.all(joinPromises)
      }

      setToast({ message: 'Oferta creada y registros asociados correctamente', type: 'success' })
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setToast({ message: `Error: ${err.message}`, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-steel-400 hover:text-white text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </button>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Crear <span className="text-accent-400">Nueva Oferta</span>
        </h2>
        <p className="text-steel-400 text-sm mt-1">
          Los datos se sincronizarán con HubSpot CRM automáticamente
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section: Numeración ── */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-5">
          <h3 className="text-sm font-semibold text-accent-400 uppercase tracking-wider flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Numeración de Oferta
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nº de oferta nuevo (readonly) */}
            <div className="space-y-2">
              <label htmlFor="field-n-oferta" className={labelClass}>
                <Hash className="w-4 h-4 text-accent-400" />
                Nº Oferta (auto)
              </label>
              <div className="relative">
                <input
                  id="field-n-oferta"
                  name="n_de_oferta_inicial_deal"
                  type="number"
                  value={form.n_de_oferta_inicial_deal}
                  onChange={handleChange}
                  className={`${inputClass} pr-10`}
                />
                {loadingNumber && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-400 animate-spin" />
                )}
              </div>
              <p className="text-xs text-steel-500">Precargado automáticamente</p>
            </div>

            {/* Nº de oferta heredado (editable) */}
            <div className="space-y-2">
              <label htmlFor="field-n-oferta-activa" className={labelClass}>
                <Hash className="w-4 h-4 text-accent-400" />
                Nº Oferta Heredado
              </label>
              <input
                id="field-n-oferta-activa"
                name="numero_de_oferta_activa"
                type="text"
                value={form.numero_de_oferta_activa}
                onChange={handleChange}
                placeholder="Ej: 1042"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* ── Section: Asignación ── */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-5">
          <h3 className="text-sm font-semibold text-accent-400 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" />
            Asignación y Estado
          </h3>

          {/* Presupuestador */}
          <div className="space-y-2">
            <label htmlFor="field-presupuestador" className={labelClass}>
              <User className="w-4 h-4 text-accent-400" />
              Presupuestador
            </label>
            <select
              id="field-presupuestador"
              name="presupuestador_asignado"
              value={form.presupuestador_asignado}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">— Seleccionar presupuestador —</option>
              {PRESUPUESTADORES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Estado de la oferta */}
            <div className="space-y-2">
              <label htmlFor="field-estado" className={labelClass}>
                <Tag className="w-4 h-4 text-accent-400" />
                Estado de la Oferta
              </label>
              <select
                id="field-estado"
                name="estado_de_la_ultima_oferta"
                value={form.estado_de_la_ultima_oferta}
                onChange={handleChange}
                className={selectClass}
              >
                {OFFER_STATUSES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de oferta */}
            <div className="space-y-2">
              <label htmlFor="field-tipo-oferta" className={labelClass}>
                <Tag className="w-4 h-4 text-accent-400" />
                Tipo de Oferta
              </label>
              <select
                id="field-tipo-oferta"
                name="tipo_de_oferta"
                value={form.tipo_de_oferta}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">— Seleccionar tipo —</option>
                {TIPOS_OFERTA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Valor oferta */}
            <div className="space-y-2">
              <label htmlFor="field-valor-oferta" className={labelClass}>
                <DollarSign className="w-4 h-4 text-accent-400" />
                Valor Oferta (€)
              </label>
              <input
                id="field-valor-oferta"
                name="valor_oferta"
                type="number"
                step="0.01"
                min="0"
                value={form.valor_oferta}
                onChange={handleChange}
                placeholder="Ej: 15000.00"
                className={inputClass}
              />
            </div>

            {/* Unidad de negocio */}
            <div className="space-y-2">
              <label htmlFor="field-unidad-negocio" className={labelClass}>
                <Layers className="w-4 h-4 text-accent-400" />
                Unidad de Negocio
              </label>
              <select
                id="field-unidad-negocio"
                name="unidad_de_negocio_oferta"
                value={form.unidad_de_negocio_oferta}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">— Seleccionar unidad —</option>
                {UNIDADES_NEGOCIO.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Section: Asociaciones ── */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-5">
          <h3 className="text-sm font-semibold text-accent-400 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Asociaciones CRM
          </h3>

          {/* Empresa asociada (buscador) */}
          <SearchDropdown
            id="search-company"
            icon={Building2}
            label="Empresa Asociada"
            placeholder="Buscar empresa por nombre..."
            onSearch={searchCompanies}
            onSelect={(item) => {
              setSelectedCompany(item)
              // Reset dependants
              setSelectedDeal(null)
              setSelectedContact(null)
              setSelectedObra(null)
              // Update hidden text field internally to send as value
              setForm((prev) => ({ 
                ...prev, 
                dealname: '',
                contacto_asociado: '',
                empresa_vinculada_a_oferta: item.properties?.name || item.name || ''
              }))
            }}
            displayKey={(item) => item.properties?.name || item.name || `ID: ${item.id}`}
            selectedItem={selectedCompany}
            onClear={() => {
              setSelectedCompany(null)
              setForm((prev) => ({ ...prev, empresa_vinculada_a_oferta: '' }))
            }}
            renderItem={(item) => (
              <div>
                <span className="font-medium">{item.properties?.name || item.name || 'Sin nombre'}</span>
                {item.properties?.domain && (
                  <span className="ml-2 text-xs text-steel-400">{item.properties.domain}</span>
                )}
              </div>
            )}
          />

          {/* Negocio asociado (buscador filtrado por empresa) */}
          <SearchDropdown
            id="search-deal"
            icon={Briefcase}
            label={`Negocio Asociado ${selectedCompany ? '(Filtrado)' : ''}`}
            placeholder={selectedCompany ? `Buscar en ${selectedCompany.properties?.name}...` : "Selecciona una empresa primero..."}
            onSearch={(q) => searchDeals(q, selectedCompany?.id)}
            onSelect={handleDealSelect}
            displayKey={(item) => item.properties?.dealname || item.dealname || item.name || `ID: ${item.id}`}
            selectedItem={selectedDeal}
            onClear={() => {
              setSelectedDeal(null)
              setForm((prev) => ({ ...prev, dealname: '' }))
            }}
            renderItem={(item) => (
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.properties?.dealname || item.dealname || 'Sin nombre'}</span>
                {item.properties?.amount && (
                  <span className="text-xs text-emerald-400 ml-2">
                    {parseFloat(item.properties.amount).toLocaleString('es-ES')} €
                  </span>
                )}
              </div>
            )}
          />

          {/* Contacto asociado (buscador filtrado por empresa) */}
          <SearchDropdown
            id="search-contact"
            icon={User}
            label={`Contacto Asociado ${selectedCompany ? '(Filtrado)' : ''}`}
            placeholder={selectedCompany ? `Buscar contacto en ${selectedCompany.properties?.name}...` : "Selecciona una empresa primero..."}
            onSearch={async (q) => {
              if (!selectedCompany) return []
              return await searchContacts(q, selectedCompany.id)
            }}
            onSelect={(item) => {
              setSelectedContact(item)
              setForm(prev => ({ ...prev, contacto_asociado: `${item.properties?.firstname || ''} ${item.properties?.lastname || ''}`.trim() }))
            }}
            displayKey={(item) => `${item.properties?.firstname || ''} ${item.properties?.lastname || ''}`.trim() || item.properties?.email || `ID: ${item.id}`}
            selectedItem={selectedContact}
            onClear={() => {
              setSelectedContact(null)
              setForm(prev => ({ ...prev, contacto_asociado: '' }))
            }}
            renderItem={(item) => (
              <div>
                <span className="font-medium">{`${item.properties?.firstname || ''} ${item.properties?.lastname || ''}`.trim() || 'Sin nombre'}</span>
                {item.properties?.email && (
                  <span className="ml-2 text-xs text-steel-400 block">{item.properties.email}</span>
                )}
              </div>
            )}
          />

          {/* Obra / Proyecto asociada (buscador filtrado por empresa) */}
          <SearchDropdown
            id="search-obra"
            icon={Wrench}
            label={`Obra / Proyecto Asociada ${selectedCompany ? '(Filtrada)' : ''}`}
            placeholder={selectedCompany ? `Buscar obra en ${selectedCompany.properties?.name}...` : "Selecciona una empresa primero..."}
            onSearch={async (q) => {
              if (!selectedCompany) return []
              return await searchObras(q, selectedCompany.id)
            }}
            onSelect={(item) => setSelectedObra(item)}
            displayKey={(item) => item.properties?.nombre_de_la_obra_o_proyecto_ || item.nombre_de_la_obra_o_proyecto_ || `ID: ${item.id}`}
            selectedItem={selectedObra}
            onClear={() => setSelectedObra(null)}
            renderItem={(item) => (
              <div>
                <span className="font-medium">{item.properties?.nombre_de_la_obra_o_proyecto_ || item.nombre_de_la_obra_o_proyecto_ || 'Sin nombre'}</span>
                {item.properties?.valor_obra___proyecto && (
                  <span className="ml-2 text-xs text-emerald-400 block">{parseFloat(item.properties.valor_obra___proyecto).toLocaleString('es-ES')} €</span>
                )}
              </div>
            )}
          />

          {selectedDeal && (
            <p className="text-xs text-steel-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Al seleccionar un negocio, el nº de oferta se actualiza con la siguiente versión disponible
            </p>
          )}
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={submitting}
          id="btn-submit-offer"
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold rounded-xl shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {submitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Crear Oferta
            </>
          )}
        </button>
      </form>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
