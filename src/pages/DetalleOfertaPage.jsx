import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Download,
  Briefcase,
  Euro,
  Calendar,
  Tag,
  FileText,
  Clock,
  Pencil,
  Hash,
  User,
  Wrench,
  Building2,
} from 'lucide-react'
import { getOfertaById, updateOferta } from '../services/hubspot'
import {
  getOfferStatusBadge,
  formatCurrency,
  formatDate,
  OFFER_STATUSES,
} from '../utils/helpers'
import { generatePDF } from '../utils/pdfGenerator'
import Spinner from '../components/Spinner'
import Toast from '../components/Toast'

export default function DetalleOfertaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [oferta, setOferta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchOferta()
  }, [id])

  async function fetchOferta() {
    setLoading(true)
    try {
      const data = await getOfertaById(id)
      if (data) {
        setOferta(data)
        setEditAmount(data.properties?.amount || '')
        setEditStatus(data.properties?.estado_de_la_oferta_presupuesto || '')
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateOferta(id, {
        amount: editAmount,
        estado_de_la_oferta_presupuesto: editStatus,
      })
      setOferta((prev) => ({
        ...prev,
        properties: {
          ...prev.properties,
          amount: editAmount,
          estado_de_la_oferta_presupuesto: editStatus,
        },
      }))
      setEditing(false)
      setToast({ message: 'Oferta actualizada correctamente', type: 'success' })
    } catch (err) {
      setToast({ message: `Error: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function handleDownloadPDF() {
    if (!oferta) return
    try {
      generatePDF(oferta)
      setToast({ message: 'PDF generado correctamente', type: 'success' })
    } catch (err) {
      setToast({ message: `Error generando PDF: ${err.message}`, type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!oferta) {
    return (
      <div className="text-center py-24 animate-fade-in-up">
        <h3 className="text-xl font-semibold text-white mb-2">Oferta no encontrada</h3>
        <p className="text-steel-400 text-sm mb-6">No se pudo localizar la oferta con ID: {id}</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-500/15 text-accent-400 rounded-xl text-sm font-medium hover:bg-accent-500/25 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </button>
      </div>
    )
  }

  const p = oferta.properties || {}
  const statusBadge = getOfferStatusBadge(p.estado_de_la_oferta_presupuesto)

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-steel-400 hover:text-white text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </button>

      {/* Header card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 mb-6 gradient-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-500 to-navy-600 flex items-center justify-center shadow-lg shadow-accent-500/20">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {p.dealname || 'Sin nombre'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                  {p.n__de_oferta && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-navy-900/50 text-accent-400">
                      <Hash className="w-3 h-3" />
                      {p.n__de_oferta}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(!editing)}
              id="btn-edit-toggle"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                editing
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-steel-300 border border-white/8 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              {editing ? 'Editando' : 'Editar'}
            </button>
            <button
              onClick={handleDownloadPDF}
              id="btn-download-pdf"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Importe */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Euro className="w-4 h-4 text-accent-400" />
            <span className="text-steel-400 text-sm font-medium">Importe</span>
          </div>
          {editing ? (
            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              step="0.01"
              min="0"
              id="edit-amount"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-800/80 border border-accent-500/30 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent-500/25 transition-all"
            />
          ) : (
            <p className="text-2xl font-bold text-white">{formatCurrency(p.amount)}</p>
          )}
        </div>

        {/* Estado */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-accent-400" />
            <span className="text-steel-400 text-sm font-medium">Estado</span>
          </div>
          {editing ? (
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              id="edit-status"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-800/80 border border-accent-500/30 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent-500/25 transition-all cursor-pointer appearance-none"
            >
              {OFFER_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          )}
        </div>

        {/* Presupuestador */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-accent-400" />
            <span className="text-steel-400 text-sm font-medium">Presupuestador</span>
          </div>
          <p className="text-lg font-semibold text-white">{p.presupuestador_asignado || '—'}</p>
        </div>

        {/* Tipo de obra */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-accent-400" />
            <span className="text-steel-400 text-sm font-medium">Tipo de Obra</span>
          </div>
          <p className="text-lg font-semibold text-white">{p.tipo_de_obra__proyecto || '—'}</p>
        </div>

        {/* Nº Oferta */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-accent-400" />
            <span className="text-steel-400 text-sm font-medium">Nº Oferta</span>
          </div>
          <p className="text-lg font-semibold text-white tabular-nums">
            {p.n__de_oferta || '—'}
            {p.numero_de_oferta_heredado && p.numero_de_oferta_heredado !== p.n__de_oferta && (
              <span className="text-sm text-steel-400 ml-2">(Heredado: {p.numero_de_oferta_heredado})</span>
            )}
          </p>
        </div>

        {/* Creación */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-accent-400" />
            <span className="text-steel-400 text-sm font-medium">Fecha de Creación</span>
          </div>
          <p className="text-lg font-semibold text-white">{formatDate(p.createdate)}</p>
        </div>
      </div>

      {/* Description */}
      {p.description && (
        <div className="glass-card rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-accent-400" />
            <span className="text-steel-400 text-sm font-medium">Descripción</span>
          </div>
          <p className="text-steel-200 text-sm leading-relaxed whitespace-pre-wrap">
            {p.description}
          </p>
        </div>
      )}

      {/* Save button (edit mode) */}
      {editing && (
        <button
          onClick={handleSave}
          disabled={saving}
          id="btn-save-changes"
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Cambios
            </>
          )}
        </button>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
