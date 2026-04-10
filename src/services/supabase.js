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
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from('scoring_matrices')
    .select(`
      *,
      criteria (
        *,
        criterion_options (*)
      ),
      score_thresholds (*)
    `)
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('created_at')

  if (error) throw error

  // The caller (ScoringPage) expects an array of matrices directly as fetched.
  return data
}

/**
 * Guarda las matrices en Supabase (upsert) para este tenant.
 * Siempre guarda también en localStorage como respaldo.
 * @returns {boolean} true si Supabase OK, false si solo localStorage
 */
export async function saveMatrices(matrices) {
  // Mirror a localStorage siempre (respaldo offline)
  try { localStorage.setItem('gr_matrices', JSON.stringify(matrices)) } catch { /* noop */ }

  try {
    const tenantId = await getTenantId()

    const rows = matrices.map(m => ({
      tenant_id: tenantId,
      matrix_key: m.id,
      nombre: m.nombre,
      unidades: m.unidades,
      params: m.params,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('scoring_matrices')
      .upsert(rows, { onConflict: 'tenant_id,matrix_key' })

    if (error) throw error
    return true
  } catch (e) {
    console.warn('[Supabase] saveMatrices failed:', e.message, '— datos guardados solo en localStorage')
    return false
  }
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
