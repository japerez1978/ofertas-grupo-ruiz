import { supabase as coreSupabase } from 'core-saas'

// Re-export the core client
export const supabase = coreSupabase

// ═══ Tenant resolution (Legacy/Deprecated) ═══
// Use useTenant() hook in components instead.
export const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'intranox'

/** 
 * Resolve tenant_id from subdominio slug 
 * @deprecated Use useTenant() from core-saas in components.
 */
export async function getTenantId() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdominio', TENANT_SLUG)
    .single()

  if (error || !data) throw new Error(`Tenant '${TENANT_SLUG}' no encontrado en Supabase`)
  return data.id
}

export function resetTenantCache() {
  // No-op for now as we transition to hook-based identity
}
