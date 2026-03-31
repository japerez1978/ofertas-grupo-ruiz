import { createClient } from '@supabase/supabase-js'
import { ALL_MATRICES } from '../data/matrices'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const PROJECT_SLUG = import.meta.env.VITE_PROJECT_SLUG || 'grupo-ruiz'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Obtiene o crea el registro del proyecto en Supabase */
async function getOrCreateProject() {
  const { data, error } = await supabase
    .from('proyectos')
    .select('id')
    .eq('slug', PROJECT_SLUG)
    .single()

  if (data) return data.id

  // No existe → crear
  const { data: created, error: createError } = await supabase
    .from('proyectos')
    .insert({ slug: PROJECT_SLUG, nombre: 'Grupo Ruiz Ofertas' })
    .select('id')
    .single()

  if (createError) throw createError
  return created.id
}

// ─── Matrices ────────────────────────────────────────────────────────────────

/**
 * Carga las matrices de scoring desde Supabase.
 * Si no existen para este proyecto, inserta los defaults.
 */
export async function loadMatrices() {
  try {
    const proyectoId = await getOrCreateProject()

    const { data, error } = await supabase
      .from('scoring_matrices')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .order('created_at', { ascending: true })

    if (error) throw error

    if (!data || data.length === 0) {
      // Primera vez → seed con matrices por defecto
      await seedDefaultMatrices(proyectoId)
      return ALL_MATRICES
    }

    // Reconstituir matrices desde Supabase
    return data.map(row => ({
      id: row.matrix_key,
      nombre: row.nombre,
      unidades: row.unidades,
      params: row.params,
    }))
  } catch (e) {
    console.warn('Supabase loadMatrices failed, using localStorage fallback:', e.message)
    // Fallback a localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('gr_matrices') || 'null')
      if (stored?.length) return stored
    } catch { /* noop */ }
    return ALL_MATRICES
  }
}

/** Guarda todas las matrices del proyecto en Supabase */
export async function saveMatrices(matrices) {
  try {
    const proyectoId = await getOrCreateProject()

    const rows = matrices.map(m => ({
      proyecto_id: proyectoId,
      matrix_key: m.id,
      nombre: m.nombre,
      unidades: m.unidades,
      params: m.params,
      updated_at: new Date().toISOString(),
    }))

    // Upsert (insert or update) by proyecto_id + matrix_key
    const { error } = await supabase
      .from('scoring_matrices')
      .upsert(rows, { onConflict: 'proyecto_id,matrix_key' })

    if (error) throw error

    // Mirror to localStorage as backup
    localStorage.setItem('gr_matrices', JSON.stringify(matrices))
    return true
  } catch (e) {
    console.warn('Supabase saveMatrices failed, saving to localStorage only:', e.message)
    localStorage.setItem('gr_matrices', JSON.stringify(matrices))
    return false
  }
}

async function seedDefaultMatrices(proyectoId) {
  const rows = ALL_MATRICES.map(m => ({
    proyecto_id: proyectoId,
    matrix_key: m.id,
    nombre: m.nombre,
    unidades: m.unidades,
    params: m.params,
  }))
  const { error } = await supabase.from('scoring_matrices').insert(rows)
  if (error) console.warn('Seed matrices error:', error.message)
}
