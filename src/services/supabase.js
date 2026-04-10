// ═══ Scoring Matrices Service ═══
// Uses the unified Supabase client from lib/supabase.js

import { supabase, getTenantId } from '../lib/supabase'
import { ALL_MATRICES } from '../data/matrices'

// Re-export for backward compatibility
export { supabase, getTenantId }
export { TENANT_SLUG } from '../lib/supabase'

// ─── Matrices de Scoring ─────────────────────────────────────────────────────

/**
 * Carga las matrices de scoring desde Supabase para este tenant.
 * Si no existen, las crea con los valores por defecto.
 * Fallback: localStorage → defaults hardcodeados.
 */
export async function loadMatrices() {
  try {
    const tenantId = await getTenantId()
    if (!tenantId) return ALL_MATRICES

    const { data, error } = await supabase
      .from('scoring_matrices')
      .select(`
        id,
        name,
        description,
        hubspot_object_type,
        active,
        criteria (
          id,
          code,
          name,
          hubspot_property,
          weight,
          sort_order,
          active,
          criterion_options (
            id,
            label,
            hubspot_value,
            multiplier,
            sort_order
          )
        ),
        score_thresholds (
          label,
          min_score,
          max_score,
          color,
          emoji,
          action
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('created_at')

    if (error || !data || data.length === 0) return ALL_MATRICES

    // Adaptar al formato que espera ScoringPage
    return data.map(m => ({
      id: m.id,
      nombre: m.name,
      matrix_key: m.id,
      unidades: [m.name],
      params: (m.criteria || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({
          id: c.code,
          label: c.name,
          hubspot_field: c.hubspot_property,
          weight: c.weight,
          type: 'enum',
          default_multiplier: 0,
          options: (c.criterion_options || [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(o => ({
              value: o.hubspot_value,
              label: o.label,
              multiplier: o.multiplier
            }))
        })),
      thresholds: m.score_thresholds || []
    }))
  } catch (e) {
    console.warn('loadMatrices error:', e.message)
    return ALL_MATRICES
  }
}

export async function saveMatrices(matrices) {
  try {
    localStorage.setItem('gr_matrices', JSON.stringify(matrices))
  } catch { /* noop */ }
  return true
}

async function seedDefaultMatrices(tenantId) {
  const rows = ALL_MATRICES.map(m => ({
    tenant_id: tenantId,
    matrix_key: m.id,
    nombre: m.nombre,
    unidades: m.unidades,
    params: m.params,
  }))
  const { error } = await supabase.from('scoring_matrices').insert(rows)
  if (error) console.warn('[Supabase] seed matrices error:', error.message)
}

// ─── Events Logging ──────────────────────────────────────────────────────────

/**
 * Registra un evento en tenant_events (best-effort, no falla si hay error)
 * @param {string} evento - ej: 'score_calculado', 'score_guardado_hubspot'
 * @param {Object} metadata - datos adicionales
 */
export async function logEvent(evento, metadata = {}) {
  try {
    const tenantId = await getTenantId()
    await supabase.from('tenant_events').insert({
      tenant_id: tenantId,
      app_slug: 'ofertas_hubspot',
      evento,
      metadata,
    })
  } catch { /* fire and forget */ }
}
