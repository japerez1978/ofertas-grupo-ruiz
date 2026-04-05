import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required environment variables.')
}

// ═══ SINGLE Supabase client for the entire app ═══
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ═══ Tenant resolution ═══
export const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'intranox'

let _tenantId = null

/** Resolve tenant_id from subdominio slug */
export async function getTenantId() {
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

/** Reset cached tenant (useful on logout) */
export function resetTenantCache() {
  _tenantId = null
}
