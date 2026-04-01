import { createClient } from '@supabase/supabase-js'
import { ALL_MATRICES } from '../data/matrices'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// El subdominio identifica al tenant (ej: 'intranox', 'saltoki')
// Configurable por variable de entorno por despliegue
export const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'intranox'

// Solo crear el cliente si las credenciales están presentes (evita crash en Vercel sin env vars)
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// Cache en memoria del tenant_id para no hacer múltiples queries
let _tenantId = null

/** Busca el tenant_id en Supabase por su subdominio */
async function getTenantId() {
  if (!supabase) throw new Error('Supabase no configurado (faltan variables de entorno)')
  if (_tenantId) return _tenantId

  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdominio', TENANT_SLUG)
    .single()

  if (error || !data) throw new Error(`Tenant '${TENANT_SLUG}' no encontrado en Supabase`)

  _tenantId = data.id
  return _tenantId
}

// ─── Matrices de Scoring ─────────────────────────────────────────────────────

/**
 * Carga las matrices de scoring desde Supabase para este tenant.
 * Si no existen, las crea con los valores por defecto.
 * Fallback: localStorage → defaults hardcodeados.
 */
export async function loadMatrices() {
  try {
    const tenantId = await getTenantId()

    const { data, error } = await supabase
      .from('scoring_matrices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    if (error) throw error

    if (!data || data.length === 0) {
      // Primera vez → seed con defaults
      await seedDefaultMatrices(tenantId)
      return ALL_MATRICES
    }

    return data.map(row => ({
      id: row.matrix_key,
      nombre: row.nombre,
      unidades: row.unidades,
      params: row.params,
    }))
  } catch (e) {
    console.warn('[Supabase] loadMatrices failed:', e.message, '— usando fallback')
    // Fallback 1: localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('gr_matrices') || 'null')
      if (stored?.length) return stored
    } catch { /* noop */ }
    // Fallback 2: defaults hardcodeados
    return ALL_MATRICES
  }
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
