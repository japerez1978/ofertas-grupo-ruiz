const API_BASE = 'https://intranox-proxy-production.up.railway.app';

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const res = await fetch(url, config);

  if (!res.ok) {
    const errorBody = await res.text().catch(() => 'Unknown error');
    throw new Error(`Error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

/** Listar todos los negocios (legacy - simple) */
export async function getOfertas() {
  return request('/ofertas');
}

const OFERTA_PROPERTIES = [
  'n__de_oferta', 'numero_de_oferta_heredado', 'estado_de_la_oferta_presupuesto',
  'tipo_de_oferta', 'valor_oferta', 'empresa_vinculada_a_oferta',
  'unidad_de_negocio_oferta', 'presupuestador_asignado', 'createdate'
].join(',');

/**
 * Listar TODAS las ofertas con carga progresiva + batch-reads paralelos.
 * onProgress({ partial, loaded, phase: 'loading'|'enriching'|'done' })
 * se llama tras cada página y tras el enriquecimiento, permitiendo mostrar
 * datos parciales inmediatamente en la UI.
 */
export async function getAllOfertas({ onProgress } = {}) {
  let allResults = []
  let after = null

  // 1. Paginate sequentially (HubSpot uses cursor tokens, not offsets)
  //    Reportamos datos parciales (sin enriquecer) tras cada página
  for (let page = 0; page < 25; page++) {
    const afterParam = after ? `&after=${after}` : '';
    const data = await request(
      `/proxy/crm/v3/objects/2-198173351?limit=100&properties=${OFERTA_PROPERTIES}&associations=deals,companies${afterParam}`
    );
    allResults = [...allResults, ...(data.results || [])];

    // Emitir resultados parciales (sin enriquecer) → la UI los muestra ya
    onProgress?.({ partial: [...allResults], loaded: allResults.length, phase: 'loading' });

    // Cursor token from HubSpot (NOT a number - must use exactly as returned)
    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      break;  // no more pages
    }
  }

  // 2. Collect unique IDs
  const dealIds = new Set();
  const companyIds = new Set();
  allResults.forEach(o => {
    (o.associations?.deals?.results || []).forEach(a => dealIds.add(String(a.id)));
    (o.associations?.companies?.results || []).forEach(a => companyIds.add(String(a.id)));
  });

  // Señal: fase de enriquecimiento iniciada
  onProgress?.({ partial: [...allResults], loaded: allResults.length, phase: 'enriching' });

  // 3. Batch-read deals (with scoring props) + companies IN PARALLEL
  const DEAL_SCORING_PROPS = [
    'dealname',
    'unidad_de_negocio_deal',
    'prioridad_de_obra__proyecto',
    'ubicacion_provincia_obra__proyecto',
    'peso_total_cmr_toneladas',
    'madurez_en_adjudicacion_obra__proyecto',
    'tipo_de_obra__proyecto',
    'valor_actual',
    'amount',
    'numero_total_de_depositos',
    'sector_partida',
    'score_rcm',
  ];
  const [dealMap, companyMap] = await Promise.all([
    batchReadProps('deals', [...dealIds], DEAL_SCORING_PROPS),
    batchReadMap('companies', [...companyIds], 'name'),
  ]);

  // 4. Enrich in place
  allResults.forEach(o => {
    const firstDealId = (o.associations?.deals?.results || [])[0]?.id;
    const firstCompId = (o.associations?.companies?.results || [])[0]?.id;
    const dealProps = firstDealId ? (dealMap[firstDealId] || {}) : {};
    o._enriched = {
      dealId: firstDealId || null,
      dealName: dealProps.dealname || '',
      dealProps,                              // ← all deal props for scoring
      companyName: firstCompId
        ? (companyMap[firstCompId] || '')
        : (o.properties?.empresa_vinculada_a_oferta || ''),
    };
  });

  // 5. Emitir datos completamente enriquecidos
  onProgress?.({ partial: allResults, loaded: allResults.length, phase: 'done' });

  return { results: allResults };
}

async function batchReadProps(objectType, ids, properties) {
  // Returns a map: { [id]: { prop1: val, prop2: val, ... } }
  if (ids.length === 0) return {};
  const chunks = chunkArray(ids, 100);
  const responses = await Promise.all(
    chunks.map(chunk =>
      request(`/proxy/crm/v3/objects/${objectType}/batch/read`, {
        method: 'POST',
        body: JSON.stringify({ inputs: chunk.map(id => ({ id })), properties })
      }).catch(() => ({ results: [] }))
    )
  );
  const map = {};
  responses.forEach(res => {
    (res.results || []).forEach(item => { map[item.id] = item.properties || {}; });
  });
  return map;
}

async function batchReadMap(objectType, ids, propName) {
  if (ids.length === 0) return {};
  const chunks = chunkArray(ids, 100);
  const responses = await Promise.all(
    chunks.map(chunk =>
      request(`/proxy/crm/v3/objects/${objectType}/batch/read`, {
        method: 'POST',
        body: JSON.stringify({ inputs: chunk.map(id => ({ id })), properties: [propName] })
      }).catch(() => ({ results: [] }))
    )
  );
  const map = {};
  responses.forEach(res => {
    (res.results || []).forEach(item => { map[item.id] = item.properties?.[propName] || ''; });
  });
  return map;
}

/** Escribe el score calculado en la propiedad score_rcm del Deal en HubSpot */
export async function writeDealScore(dealId, score) {
  return patchDeal(dealId, { score_rcm: String(score) });
}


/** Actualiza propiedades de un Deal usando el endpoint de Batch V3 (POST) para evitar CORS con PATCH */
export async function patchDeal(id, properties) {
  // El endpoint correcto en v3 es crm/v3/objects/deals/batch/update
  return request(`/proxy/crm/v3/objects/deals/batch/update`, {
    method: 'POST',
    body: JSON.stringify({
      inputs: [{ id, properties }]
    }),
  });
}

/** Escribe scores en lote para múltiples deals */
export async function writeDealScoresBatch(scorePairs) {
  // scorePairs: [{ dealId, score }, ...]
  if (!scorePairs.length) return;
  return request('/proxy/crm/v1/objects/deals/batch/update', {
    method: 'POST',
    body: JSON.stringify({
      inputs: scorePairs.map(({ dealId, score }) => ({
        id: dealId,
        properties: { score_rcm: String(score) }
      }))
    })
  });
}

// ─── Propiedades a cargar para negocios sin oferta ───────────────────────────
const DEAL_WITHOUT_OFERTA_PROPS = [
  'dealname', 'dealstage', 'amount', 'unidad_de_negocio_deal',
  'peso_total_cmr_toneladas', 'fecha_limite_para_ofertar',
  'ubicacion_provincia_obra__proyecto', 'sector_partida',
  'tipo_de_obra__proyecto', 'madurez_en_adjudicacion_obra__proyecto',
  'prioridad_de_obra__proyecto', 'closedate',
].join(',');

// Etapas de pipeline a excluir de la vista "Negocios sin oferta"
const EXCLUDED_STAGE_LABELS = [
  'Oport. descartada (internamente)',
  'Oport. Perdida (por cliente)',
];

/**
 * Obtiene todos los deals (negocios) que NO tienen ninguna oferta asociada.
 *
 * Optimizaciones:
 *  - Reutiliza el caché de OfertasPage (gr_ofertas_cache) si está fresco (<20min)
 *    para saltarse la Fase 1 completamente.
 *  - Si no hay caché, ejecuta Fase 0 (pipeline stages) y Fase 1 (oferta IDs) EN PARALELO.
 */
export async function getDealsWithoutOfertas({ onProgress } = {}) {
  onProgress?.({ partial: [], loaded: 0, phase: 'scanning' });

  // ─── Intentar reutilizar caché de OfertasPage para saltar el escaneo de asociaciones ────
  let dealIdsFromOfertasCache = null;
  try {
    const cached = JSON.parse(localStorage.getItem('gr_ofertas_cache') || '{}');
    if (cached.data && cached.ts && Date.now() - cached.ts < 20 * 60 * 1000) {
      const ids = new Set();
      cached.data.forEach(o => { if (o._enriched?.dealId) ids.add(String(o._enriched.dealId)); });
      if (ids.size > 0) dealIdsFromOfertasCache = ids;
    }
  } catch { /* ignore */ }

  // ─── Helpers internos ────────────────────────────────────────────────────────
  async function _fetchExcludedStageIds() {
    const ids = new Set();
    try {
      const pipelines = await request('/proxy/crm/v3/pipelines/deals');
      (pipelines.results || []).forEach(pipeline =>
        (pipeline.stages || []).forEach(stage => {
          if (EXCLUDED_STAGE_LABELS.includes(stage.label)) ids.add(stage.id);
        })
      );
    } catch (e) {
      console.warn('[getDealsWithoutOfertas] No se pudieron obtener etapas del pipeline:', e.message);
    }
    return ids;
  }

  async function _fetchDealIdsWithOfertas() {
    const ids = new Set();
    let after = null;
    for (let page = 0; page < 30; page++) {
      const afterParam = after ? `&after=${after}` : '';
      const data = await request(
        `/proxy/crm/v3/objects/2-198173351?limit=100&properties=n__de_oferta&associations=deals${afterParam}`
      ).catch(() => ({ results: [] }));
      (data.results || []).forEach(o =>
        (o.associations?.deals?.results || []).forEach(a => ids.add(String(a.id)))
      );
      if (data.paging?.next?.after) after = data.paging.next.after;
      else break;
    }
    return ids;
  }

  // ─── Fase 0 + Fase 1 en paralelo ─────────────────────────────────────────────
  const [excludedStageIds, dealIdsWithOfertas] = await Promise.all([
    _fetchExcludedStageIds(),
    dealIdsFromOfertasCache
      ? Promise.resolve(dealIdsFromOfertasCache)   // ← caché disponible: 0 llamadas API
      : _fetchDealIdsWithOfertas(),
  ]);

  // ─── Fase 2: paginar todos los deals ─────────────────────────────────────────
  let allDeals = [];
  const companyIds = new Set();
  let after = null;
  for (let page = 0; page < 50; page++) {
    const afterParam = after ? `&after=${after}` : '';
    const data = await request(
      `/proxy/crm/v3/objects/deals?limit=100&properties=${DEAL_WITHOUT_OFERTA_PROPS}&associations=companies${afterParam}`
    ).catch(() => ({ results: [] }));
    const sinOferta = (data.results || []).filter(d =>
      !dealIdsWithOfertas.has(String(d.id)) &&
      (excludedStageIds.size === 0 || !excludedStageIds.has(d.properties?.dealstage))
    );
    sinOferta.forEach(d => {
      (d.associations?.companies?.results || []).forEach(a => companyIds.add(String(a.id)));
    });
    allDeals = [...allDeals, ...sinOferta];
    onProgress?.({ partial: [...allDeals], loaded: allDeals.length, phase: 'loading' });
    if (data.paging?.next?.after) after = data.paging.next.after;
    else break;
  }

  // ─── Fase 3: enriquecimiento con nombres de empresa ──────────────────────────
  const companyMap = await batchReadMap('companies', [...companyIds], 'name');
  allDeals.forEach(d => {
    const firstCompId = (d.associations?.companies?.results || [])[0]?.id;
    d._companyName = firstCompId ? (companyMap[firstCompId] || '') : '';
  });

  onProgress?.({ partial: allDeals, loaded: allDeals.length, phase: 'done' });
  return { results: allDeals };
}

/** Actualiza propiedades de una oferta (objeto custom 2-198173351) directamente en HubSpot */
/** Actualiza estado de una oferta usando Batch (POST) para evitar CORS con PATCH */
export async function patchOferta(id, properties) {
  return request(`/proxy/crm/v3/objects/2-198173351/batch/update`, {
    method: 'POST',
    body: JSON.stringify({
      inputs: [{ id, properties }]
    }),
  });
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/** Crear un nuevo negocio */
export async function createOferta(data) {
  return request('/ofertas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Asociar oferta a otro objeto (v4 API via wildcard proxy) */
export async function associateOferta(ofertaId, toObjectType, toObjectId) {
  return request(`/proxy/crm/v4/objects/2-198173351/${ofertaId}/associations/default/${toObjectType}/${toObjectId}`, {
    method: 'PUT'
  });
}

/** Actualizar un negocio existente */
export async function updateOferta(id, data) {
  return request(`/ofertas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Obtener una oferta por ID (filtrando del listado) */
export async function getOfertaById(id) {
  const ofertas = await getOfertas();
  const results = ofertas.results || ofertas;
  const list = Array.isArray(results) ? results : [];
  return list.find((o) => o.id === id) || null;
}

/** Obtener el último número de oferta disponible */
export async function getUltimoNumeroOferta() {
  try {
    const data = await request('/ofertas/search', {
      method: 'POST',
      body: JSON.stringify({
        limit: 1,
        sorts: [{ propertyName: 'n__de_oferta', direction: 'DESCENDING' }],
        properties: ['n__de_oferta']
      })
    });
    const maxVal = data?.results?.[0]?.properties?.n__de_oferta;
    return { numero: maxVal ? parseInt(maxVal, 10) : 0 };
  } catch (err) {
    console.warn('No se pudo obtener el último número de la API, devolviendo 0', err);
    return { numero: 0 };
  }
}

/** Obtener versiones de oferta para un deal específico */
export async function getVersionesOferta(dealId) {
  return request(`/ofertas/versiones/${dealId}`);
}

/** Buscar empresas por texto */
export async function searchCompanies(query) {
  if (!query) {
    return request('/proxy/crm/v3/objects/companies?limit=100&properties=name,domain');
  }
  return request('/proxy/crm/v3/objects/companies/search', {
    method: 'POST',
    body: JSON.stringify({
      query: query,
      properties: ["name", "domain"],
      limit: 100
    })
  });
}

/** Buscar negocios/deals filtrados por compañia y texto */
export async function searchDeals(query, companyId = null) {
  let associatedIds = null;
  
  if (companyId) {
    try {
      const assoc = await request(`/proxy/crm/v4/objects/companies/${companyId}/associations/deals`);
      associatedIds = assoc.results?.map(r => r.toObjectId) || [];
      if (associatedIds.length === 0) return { results: [] };
    } catch (e) {
      return { results: [] };
    }
  }

  const payload = {
    properties: ["dealname", "amount"],
    limit: 100,
    filterGroups: []
  };

  if (query) {
    payload.query = query;
  }

  if (associatedIds) {
    payload.filterGroups.push({
      filters: [{
        propertyName: "hs_object_id",
        operator: "IN",
        values: associatedIds.map(String)
      }]
    });
  }

  return request('/proxy/crm/v3/objects/deals/search', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/** Buscar contactos asociados a una compañia y texto */
export async function searchContacts(query, companyId) {
  let associatedIds = null;
  
  if (companyId) {
    try {
      const assoc = await request(`/proxy/crm/v4/objects/companies/${companyId}/associations/contacts`);
      associatedIds = assoc.results?.map(r => r.toObjectId) || [];
      if (associatedIds.length === 0) return { results: [] };
    } catch (e) {
      return { results: [] };
    }
  }

  const payload = {
    properties: ["firstname", "lastname", "email"],
    limit: 100,
    filterGroups: []
  };

  if (query) {
    payload.query = query;
  }

  if (associatedIds) {
    payload.filterGroups.push({
      filters: [{
        propertyName: "hs_object_id",
        operator: "IN",
        values: associatedIds.map(String)
      }]
    });
  }

  return request('/proxy/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/** Buscar Obras/Proyectos asociados a una compañia y texto */
export async function searchObras(query, companyId) {
  let associatedIds = null;
  
  // Custom object ID for Obra / Proyecto is 2-198784785
  if (companyId) {
    try {
      const assoc = await request(`/proxy/crm/v4/objects/companies/${companyId}/associations/2-198784785`);
      associatedIds = assoc.results?.map(r => r.toObjectId) || [];
      if (associatedIds.length === 0) return { results: [] };
    } catch (e) {
      return { results: [] };
    }
  }

  const payload = {
    properties: ["nombre_de_la_obra_o_proyecto_", "valor_obra___proyecto"],
    limit: 100,
    filterGroups: []
  };

  if (query) {
    payload.query = query;
  }

  if (associatedIds) {
    payload.filterGroups.push({
      filters: [{
        propertyName: "hs_object_id",
        operator: "IN",
        values: associatedIds.map(String)
      }]
    });
  }

  return request('/proxy/crm/v3/objects/2-198784785/search', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
