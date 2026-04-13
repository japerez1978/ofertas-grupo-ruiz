// ═══ Scoring Matrices Service ═══
// Uses the unified Supabase client from lib/supabase.js

import { supabase } from '../lib/supabase'
import { ALL_MATRICES } from '../data/matrices'

// ─── Matrices de Scoring ─────────────────────────────────────────────────────

/**
 * Carga las matrices de scoring desde Supabase para un tenant específico.
 * @param {number} tenantId - El ID de la empresa activa.
 */
export async function loadMatrices(tenantId) {
  if (!tenantId) return ALL_MATRICES

  try {
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

    if (error || !data || data.length === 0) {
       console.log(`[Supabase] No hay matrices remotas para tenant ${tenantId}, usando defaults.`);
       return ALL_MATRICES
    }

    // Adaptar al formato que espera la UI
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

// ─── Events Logging ──────────────────────────────────────────────────────────

/**
 * Registra un evento en tenant_events
 * @param {string} evento - ej: 'score_calculado'
 * @param {number} tenantId - El ID de la empresa activa.
 * @param {Object} metadata - datos adicionales
 */
export async function logEvent(evento, tenantId, metadata = {}) {
  if (!tenantId) return 
  try {
    await supabase.from('tenant_events').insert({
      tenant_id: tenantId,
      app_slug: 'ofertas_hubspot',
      evento,
      metadata,
    })
  } catch { /* fire and forget */ }
}
