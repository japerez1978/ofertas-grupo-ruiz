/**
 * Motor de cálculo de scoring.
 * Fórmula: ((suma_ponderada + maxPts) / (maxPts × 2)) × 100
 * Rango resultado: 0–100
 */
import { PROVINCIA_MAP, SECTOR_MAP } from '../data/matrices'

const MULTIPLIERS = {
  'Muy alta': 1.0, 'Alta': 0.5, 'Media': 0.0, 'Baja': -0.5, 'Muy baja': -1.0,
}

/**
 * Calcula el score de un Deal dado sus propiedades y una matriz.
 * @param {Object} dealProps - Propiedades del Deal de HubSpot
 * @param {Object} matrix    - Matriz de scoring (MATRIZ_RCM | MATRIZ_INTRANOX)
 * @returns {{ score: number, breakdown: Array, label: string, color: string }}
 */
export function calculateScore(dealProps, matrix) {
  if (!matrix || !dealProps) return null

  const matrixParams = matrix.criteria || matrix.params || []
  const maxPts = matrixParams.reduce((s, p) => s + (p.weight || 0), 0) || 100 // = 100
  let sumaPonderada = 0
  const breakdown = []

  for (const param of matrixParams) {
    // Resolve value (use alt field as fallback)
    const value = dealProps[param.hubspot_field] ?? dealProps[param.hubspot_field_alt] ?? null
    let multiplier = param.default_multiplier ?? 0
    let matchedLabel = 'Sin dato'

    if (param.type === 'enum') {
      const opt = (param.options || []).find(o =>
        String(o.value).toLowerCase() === String(value || '').toLowerCase()
      )
      if (opt) {
        multiplier = opt.multiplier
        matchedLabel = opt.label
      } else if (value) {
        matchedLabel = `${value} (no mapeado)`
      }
    } else if (param.type === 'range') {
      const num = parseFloat(value) || 0
      const range = (param.ranges || []).find(r =>
        (r.min === null || num >= r.min) && (r.max === null || num < r.max)
      )
      if (range) {
        multiplier = range.multiplier
        matchedLabel = formatRangeLabel(range, param.id)
      } else if (value !== null && value !== undefined) {
        matchedLabel = `${num} (fuera de rangos)`
      }
    } else if (param.type === 'province_map') {
      if (value && value in PROVINCIA_MAP) {
        multiplier = PROVINCIA_MAP[value]
        matchedLabel = value
      } else {
        multiplier = param.default_multiplier ?? -1.0
        matchedLabel = value ? `${value} (Muy baja)` : 'Sin dato'
      }
    } else if (param.type === 'sector_map') {
      if (value && value in SECTOR_MAP) {
        multiplier = SECTOR_MAP[value]
        matchedLabel = value
      } else {
        multiplier = param.default_multiplier ?? -1.0
        matchedLabel = value ? `${value} (Muy baja)` : 'Sin dato'
      }
    }

    const points = param.weight * multiplier
    sumaPonderada += points

    breakdown.push({
      id: param.id,
      label: param.label,
      weight: param.weight,
      multiplier,
      points: Math.round(points * 10) / 10,
      matchedLabel,
      qualitative: multiplierToLabel(multiplier),
    })
  }

  // Fórmula: ((suma + maxPts) / (maxPts * 2)) * 100
  const score = Math.round(((sumaPonderada + maxPts) / (maxPts * 2)) * 100)
  const bounded = Math.max(0, Math.min(100, score))

  return {
    score: bounded,
    breakdown,
    ...getScoreLevel(bounded),
  }
}

/** Devuelve label de semáforo y clases CSS */
export function getScoreLevel(score) {
  if (score >= 70) return { label: 'Alto', color: 'text-emerald-400', bg: 'bg-emerald-400', badge: 'bg-emerald-400/15 text-emerald-400', dot: '🟢' }
  if (score >= 45) return { label: 'Medio', color: 'text-amber-400', bg: 'bg-amber-400', badge: 'bg-amber-400/15 text-amber-400', dot: '🟡' }
  return { label: 'Bajo', color: 'text-red-400', bg: 'bg-red-400', badge: 'bg-red-400/15 text-red-400', dot: '🔴' }
}

function multiplierToLabel(m) {
  if (m >= 1.0)  return 'Muy alta'
  if (m >= 0.5)  return 'Alta'
  if (m >= 0.0)  return 'Media'
  if (m >= -0.5) return 'Baja'
  return 'Muy baja'
}

function formatRangeLabel(range, paramId) {
  const { min, max } = range
  if (min === null) return `< ${max}`
  if (max === null) return `> ${min}`
  return `${min} – ${max}`
}

export { MULTIPLIERS }
