import { supabase } from '../lib/supabase'

/**
 * Fetch all backlog items, ordered: pending first (by priority), then done (by completed_at desc)
 */
export async function getBacklog() {
  const { data, error } = await supabase
    .from('backlog')
    .select('*')
    .order('status', { ascending: true })  // 'done' > 'pending' alphabetically, so pending first
    .order('priority', { ascending: true })
    .order('completed_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data || []
}

/**
 * Add multiple offers to the backlog
 * @param {Array} offers - Array of offer objects from the dashboard
 * @param {string} userEmail - Email of the user adding them
 */
export async function addToBacklog(offers, userEmail) {
  // Get current max priority
  const { data: existing } = await supabase
    .from('backlog')
    .select('priority')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(1)

  let nextPriority = (existing?.[0]?.priority ?? 0) + 1

  const rows = offers.map((offer) => ({
    offer_id: offer.id,
    offer_data: {
      id: offer.id,
      nombre: offer.properties?.dealname || offer._enriched?.dealName || '',
      empresa: offer._enriched?.companyName || '',
      importe: offer.properties?.amount || offer._enriched?.dealProps?.amount || 0,
      unidad: offer.properties?.unidad_de_negocio_oferta || offer._enriched?.dealProps?.unidad_de_negocio_deal || '',
      score: offer._score?.label || null,
      dealId: offer._enriched?.dealId || null,
      numero_oferta: offer.properties?.n_de_oferta || '',
      tipo_oferta: offer.properties?.tipo_de_oferta || '',
      estado_oferta: offer.properties?.estado_de_la_oferta || '',
      dealProps: offer._enriched?.dealProps || {},
    },
    priority: nextPriority++,
    status: 'pending',
    created_by: userEmail,
  }))

  const { data, error } = await supabase
    .from('backlog')
    .insert(rows)
    .select()

  if (error) throw error
  return data
}

/**
 * Check if an offer is already in the backlog
 */
export async function isInBacklog(offerId) {
  const { data } = await supabase
    .from('backlog')
    .select('id')
    .eq('offer_id', offerId)
    .limit(1)

  return (data?.length ?? 0) > 0
}

/**
 * Update priorities after drag & drop reorder
 * @param {Array} items - Array of { id, priority } objects
 */
export async function reorderBacklog(items) {
  // Use a transaction-like approach: update each item
  const promises = items.map(({ id, priority }) =>
    supabase
      .from('backlog')
      .update({ priority })
      .eq('id', id)
  )
  await Promise.all(promises)
}

/**
 * Mark a backlog item as done
 */
export async function markAsDone(id, hubspotNewOfferId = null) {
  const { error } = await supabase
    .from('backlog')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      hubspot_new_offer_id: hubspotNewOfferId,
    })
    .eq('id', id)

  if (error) throw error
}

/**
 * Mark a backlog item back as pending
 */
export async function markAsPending(id) {
  const { error } = await supabase
    .from('backlog')
    .update({
      status: 'pending',
      completed_at: null,
      hubspot_new_offer_id: null,
    })
    .eq('id', id)

  if (error) throw error
}

/**
 * Remove a backlog item
 */
export async function removeFromBacklog(id) {
  const { error } = await supabase
    .from('backlog')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Clear all completed items
 */
export async function clearCompleted() {
  const { error } = await supabase
    .from('backlog')
    .delete()
    .eq('status', 'done')

  if (error) throw error
}
