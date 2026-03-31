/** Mapeo de dealstage codes a labels legibles (HubSpot pipeline stages) */
export const DEAL_STAGES = {
  appointmentscheduled: { label: 'Cita Programada', color: 'bg-blue-500/20 text-blue-400' },
  qualifiedtobuy: { label: 'Cualificado', color: 'bg-cyan-500/20 text-cyan-400' },
  presentationscheduled: { label: 'Presentación', color: 'bg-indigo-500/20 text-indigo-400' },
  decisionmakerboughtin: { label: 'En Decisión', color: 'bg-amber-500/20 text-amber-400' },
  contractsent: { label: 'Contrato Enviado', color: 'bg-purple-500/20 text-purple-400' },
  closedwon: { label: 'Ganada', color: 'bg-emerald-500/20 text-emerald-400' },
  closedlost: { label: 'Perdida', color: 'bg-red-500/20 text-red-400' },
}

export function getStageBadge(stage) {
  const s = DEAL_STAGES[stage]
  if (!s) return { label: stage || 'Sin estado', color: 'bg-steel-500/20 text-steel-300' }
  return s
}

/** Estados de la oferta (campo estado_de_la_ultima_oferta) */
export const OFFER_STATUSES = [
  { value: 'Solicitada', label: 'Solicitada', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'Asignada', label: 'Asignada', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'Calculada', label: 'Calculada', color: 'bg-indigo-500/20 text-indigo-400' },
  { value: 'Entregada', label: 'Entregada', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'Pte. de revisión', label: 'Pte. de revisión', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'En revisión', label: 'En revisión', color: 'bg-pink-500/20 text-pink-400' },
  { value: 'Revisada', label: 'Revisada', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'Entregada oferta revisada', label: 'Entregada oferta revisada', color: 'bg-teal-500/20 text-teal-400' },
  { value: 'Ganada', label: 'Ganada', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'Stand by', label: 'Stand by', color: 'bg-gray-500/20 text-gray-400' },
  { value: 'Obsoleta', label: 'Obsoleta', color: 'bg-stone-500/20 text-stone-400' },
  { value: 'Desestimada', label: 'Desestimada', color: 'bg-rose-500/20 text-rose-400' },
  { value: 'Perdida', label: 'Perdida', color: 'bg-red-500/20 text-red-500' },
]

export function getOfferStatusBadge(status) {
  const s = OFFER_STATUSES.find((o) => o.value === status)
  if (!s) return { label: status || 'Sin estado', color: 'bg-steel-500/20 text-steel-300' }
  return s
}

/** Lista de presupuestadores */
export const PRESUPUESTADORES = [
  'Aaron Rodriguez',
  'Alberto Gil',
  'Alejandro Marín',
  'Andres Mendoza',
  'Angel Montes',
  'Angel Roca',
  'Eduardo Zubiaur',
  'Hector Varea',
  'Javier Gil',
  'Jorge Martinez',
  'Jose Manuel Ruiz',
  'Maria Viguera',
  'Miguel Fernandez',
  'Roberto Ezquerro',
  'Rodrigo Frias',
  'Ruben Lopez',
  'Rubén Viguera',
  'Sandra Oses',
  'Sergio Gomez',
  'Sergio Mamolar',
]

/** Tipos de oferta (tipo_de_oferta) */
export const TIPOS_OFERTA = [
  'Exploración',
  'Oferta Matriz (Inicial)',
  'Repetición',
  'Revisión',
  'Ampliación',
  'Modificación'
]

/** Unidades de negocio (unidad_de_negocio_oferta) */
export const UNIDADES_NEGOCIO = [
  'RCM',
  'Intranox Rioja',
  'Intranox Norte',
  'Automatización',
  'Autom. Racpur'
]

/** Formatear importe en euros */
export function formatCurrency(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(num)
}

/** Formatear fecha */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
