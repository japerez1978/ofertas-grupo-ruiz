/**
 * Definición completa de las matrices de scoring.
 * Persistencia futura: Supabase (tabla scoring_matrices).
 * Por ahora: localStorage como fallback.
 */

const MULT = { 'Muy alta': 1.0, 'Alta': 0.5, 'Media': 0.0, 'Baja': -0.5, 'Muy baja': -1.0 }

// ── Mapa de provincias → multiplicador (compartido por ambas matrices) ──
export const PROVINCIA_MAP = {
  // Muy alta
  'Álava': 1.0, 'La Rioja': 1.0, 'Navarra': 1.0, 'Burgos': 1.0,
  // Alta
  'Guipúzcoa': 0.5, 'Vizcaya': 0.5, 'Cantabria': 0.5, 'Soria': 0.5, 'Zaragoza': 0.5,
  // Media
  'Madrid': 0.0, 'Valladolid': 0.0, 'Palencia': 0.0, 'Huesca': 0.0,
  'Lleida': 0.0, 'Barcelona': 0.0, 'Guadalajara': 0.0,
  // Baja
  'León': -0.5, 'Asturias': -0.5, 'Ourense': -0.5, 'Lugo': -0.5,
  'Pontevedra': -0.5, 'Salamanca': -0.5, 'Segovia': -0.5, 'Ávila': -0.5,
  'Toledo': -0.5, 'Cuenca': -0.5, 'Castellón': -0.5, 'Valencia': -0.5,
  'Tarragona': -0.5, 'Girona': -0.5,
  // Todo lo demás: Muy baja (-1.0) como default
}

// ── Mapa sector → multiplicador (Matriz Intranox) ──
export const SECTOR_MAP = {
  // Muy alta
  'Enológico': 1.0, 'Chocolatero': 1.0, 'Lácteo': 1.0, 'Químico': 1.0,
  'Industria plástica': 1.0, 'Piensos': 1.0, 'Farmacéutico': 1.0,
  'Bebidas y refrescos': 1.0, 'Productoras de aceite': 1.0,
  'Alimentación y bebidas': 1.0, 'Producción de alimentos': 1.0,
  'Vinos y espirituosos': 1.0,
  // Alta
  'Petróleo y energía': 0.5, 'Biotecnología': 0.5, 'Cosmética': 0.5,
  'Minería y metales': 0.5, 'Almacenamiento': 0.5,
  'Logística y cadena de suministro': 0.5, 'Industrial': 0.5,
  'Industria (generico)': 0.5, 'Automoción': 0.5, 'Astilleros': 0.5,
  'Construcción naval': 0.5, 'Ingeniería': 0.5,
  'Ingeniería mecánica e industrial': 0.5, 'Maquinaria': 0.5,
  'Suministros públicos': 0.5, 'Energías renovables y medio ambiente': 0.5,
  'Automatización industrial': 0.5, 'Ingeniería civil': 0.5,
  'Fabricación eléctrica y electrónica': 0.5, 'Aviación y aeroespacial': 0.5,
  'Defensa y espacio': 0.5, 'Semiconductores': 0.5, 'Nanotecnología': 0.5,
  'Suministros y equipos empresariales': 0.5,
  'Servicios de mantenimiento e instalaciones': 0.5, 'Granja': 0.5,
  // Media
  'Construcción': 0.0, 'Agricultura': 0.0, 'Ganadería': 0.0, 'Marítimo': 0.0,
  'Textil': 0.0, 'Papel y productos forestales': 0.0, 'Plásticos': 0.0,
  'Vidrio cerámica y hormigón': 0.0, 'Materiales de construcción': 0.0,
  'Envases y embalajes': 0.0, 'Servicios medioambientales': 0.0,
  'Ingeniería estructurista': 0.0, 'Inmobiliario comercial': 0.0,
  'Inmobiliario': 0.0, 'Importación y exportación': 0.0,
  'Transporte por carretera y ferrocarril': 0.0, 'Arquitectura': 0.0,
  'Pesca': 0.0, 'Fabricación ferroviaria': 0.0,
  'Electrónica de consumo': 0.0, 'Mensajería y paquetería': 0.0, 'Tabaco': 0.0,
  // Baja
  'Banca': -0.5, 'Seguros': -0.5, 'Servicios financieros': -0.5,
  'Salud/bienestar/fitness': -0.5, 'Hospitales': -0.5, 'Restauración': -0.5,
  'Hostelería': -0.5, 'Comercio minorista/mayorista': -0.5, 'Supermercados': -0.5,
  'Servicios al consumidor': -0.5, 'Dispositivos médicos': -0.5,
  'Práctica médica': -0.5, 'Salud mental': -0.5, 'Bienes de consumo': -0.5,
  'Veterinaria': -0.5, 'Deportes': -0.5, 'Ocio/turismo': -0.5,
  'Telecomunicaciones': -0.5, 'Particular': -0.5,
  // Muy baja
  'Software': -1.0, 'Internet': -1.0, 'TI': -1.0,
  'Seguridad informática': -1.0, 'Videojuegos': -1.0,
  'Medios de comunicación': -1.0, 'Marketing': -1.0, 'Diseño': -1.0,
  'Educación': -1.0, 'Administración pública': -1.0,
  'Despachos jurídicos': -1.0, 'Consultoría': -1.0,
  'Recursos humanos': -1.0, 'Investigación': -1.0,
}

// ────────────────────────────────────────────────
// MATRIZ RCM
// ────────────────────────────────────────────────
export const MATRIZ_RCM = {
  id: 'rcm',
  nombre: 'Matriz RCM',
  unidades: ['RCM'],
  params: [
    {
      id: 'P1',
      label: 'Prioridad de la partida',
      hubspot_field: 'prioridad_de_obra__proyecto',
      weight: 20,
      type: 'enum',
      default_multiplier: 0,
      options: [
        { value: 'Muy Alta',    label: 'Muy Alta',    multiplier: 1.0 },
        { value: 'Alta',        label: 'Alta',        multiplier: 0.5 },
        { value: 'Media',       label: 'Media',       multiplier: 0.0 },
        { value: 'Baja',        label: 'Baja',        multiplier: -0.5 },
        { value: 'Descartada',  label: 'Descartada',  multiplier: -1.0 },
      ],
    },
    {
      id: 'P2',
      label: 'Ubicación Provincia',
      hubspot_field: 'ubicacion_provincia_obra__proyecto',
      weight: 15,
      type: 'province_map',
      default_multiplier: -1.0,
    },
    {
      id: 'P3',
      label: 'Peso Total RCM (Tn)',
      hubspot_field: 'peso_total_cmr_toneladas',
      weight: 20,
      type: 'range',
      default_multiplier: -1.0,
      ranges: [
        { min: 1000, max: null,  multiplier: -0.5 },
        { min: 500,  max: 1000,  multiplier: 1.0  },
        { min: 150,  max: 500,   multiplier: 0.5  },
        { min: 80,   max: 150,   multiplier: 0.0  },
        { min: 30,   max: 80,    multiplier: -0.5 },
        { min: 0,    max: 30,    multiplier: -1.0 },
      ],
    },
    {
      id: 'P4',
      label: 'Estado de la partida',
      hubspot_field: 'madurez_en_adjudicacion_obra__proyecto',
      weight: 10,
      type: 'enum',
      default_multiplier: 0,
      options: [
        { value: 'Licitada',                  label: 'Licitada',                  multiplier: -1.0 },
        { value: 'Fase final de decisión',     label: 'Fase final de decisión',     multiplier: -0.5 },
        { value: 'Adjudicada',                 label: 'Adjudicada',                 multiplier: 0.5  },
        { value: 'En ejecución nuestra',       label: 'En ejecución nuestra',       multiplier: 1.0  },
        { value: 'En ejecución tercero',       label: 'En ejecución tercero',       multiplier: 0.0  },
      ],
    },
    {
      id: 'P5',
      label: 'Tipo de partida',
      hubspot_field: 'tipo_de_obra__proyecto',
      weight: 15,
      type: 'enum',
      default_multiplier: 0,
      options: [
        { value: 'Nuevo',                      label: 'Nuevo',                       multiplier: 1.0  },
        { value: 'Ampliación',                 label: 'Ampliación',                  multiplier: 0.5  },
        { value: 'Sobre estructura de Hormigón', label: 'Sobre estructura Hormigón', multiplier: 0.0  },
        { value: 'Servicio',                   label: 'Servicio',                    multiplier: -0.5 },
        { value: 'Reforma',                    label: 'Reforma',                     multiplier: -1.0 },
        { value: 'Auxiliar / Cerrajería',      label: 'Auxiliar / Cerrajería',        multiplier: -1.0 },
      ],
    },
    {
      id: 'P6',
      label: 'Valor de la partida',
      hubspot_field: 'valor_actual',
      hubspot_field_alt: 'amount',
      weight: 20,
      type: 'range',
      default_multiplier: -1.0,
      ranges: [
        { min: 1000000, max: null,    multiplier: 1.0  },
        { min: 500000,  max: 1000000, multiplier: 0.5  },
        { min: 300000,  max: 500000,  multiplier: 0.0  },
        { min: 100000,  max: 300000,  multiplier: -0.5 },
        { min: 0,       max: 100000,  multiplier: -1.0 },
      ],
    },
  ],
}

// ────────────────────────────────────────────────
// MATRIZ INTRANOX & AUTOMATIZACIÓN
// ────────────────────────────────────────────────
export const MATRIZ_INTRANOX = {
  id: 'intranox',
  nombre: 'Matriz Intranox & Automatización',
  unidades: ['Intranox Rioja', 'Intranox Norte', 'Autom. Oresteo', 'Autom. Racpur', 'Automatización'],
  params: [
    {
      id: 'P1',
      label: 'Prioridad de la partida',
      hubspot_field: 'prioridad_de_obra__proyecto',
      weight: 15,
      type: 'enum',
      default_multiplier: 0,
      options: [
        { value: 'Muy Alta',   label: 'Muy Alta',   multiplier: 1.0 },
        { value: 'Alta',       label: 'Alta',       multiplier: 0.5 },
        { value: 'Media',      label: 'Media',      multiplier: 0.0 },
        { value: 'Baja',       label: 'Baja',       multiplier: -0.5 },
        { value: 'Descartada', label: 'Descartada', multiplier: -1.0 },
      ],
    },
    {
      id: 'P2',
      label: 'Ubicación Provincia',
      hubspot_field: 'ubicacion_provincia_obra__proyecto',
      weight: 10,
      type: 'province_map',
      default_multiplier: -1.0,
    },
    {
      id: 'P3',
      label: 'Nº Total de Depósitos',
      hubspot_field: 'numero_total_de_depositos',
      weight: 15,
      type: 'range',
      default_multiplier: -1.0,
      ranges: [
        { min: 70, max: null, multiplier: 1.0  },
        { min: 30, max: 70,   multiplier: 0.5  },
        { min: 11, max: 30,   multiplier: 0.0  },
        { min: 5,  max: 11,   multiplier: -0.5 },
        { min: 0,  max: 5,    multiplier: -1.0 },
      ],
    },
    {
      id: 'P4',
      label: 'Sector de la partida',
      hubspot_field: 'sector_partida',
      weight: 20,
      type: 'sector_map',
      default_multiplier: -1.0,
    },
    {
      id: 'P5',
      label: 'Valor de la partida',
      hubspot_field: 'valor_actual',
      hubspot_field_alt: 'amount',
      weight: 15,
      type: 'range',
      default_multiplier: -1.0,
      ranges: [
        { min: 1000000, max: null,    multiplier: 1.0  },
        { min: 500000,  max: 1000000, multiplier: 0.5  },
        { min: 300000,  max: 500000,  multiplier: 0.0  },
        { min: 100000,  max: 300000,  multiplier: -0.5 },
        { min: 0,       max: 100000,  multiplier: -1.0 },
      ],
    },
    {
      id: 'P6',
      label: 'Salud del negocio',
      hubspot_field: 'hs_deal_score',
      weight: 15,
      type: 'range',
      default_multiplier: 0,
      ranges: [
        { min: 70, max: null, multiplier: 1.0 },
        { min: 45, max: 70,   multiplier: 0.5 },
        { min: 0,  max: 45,   multiplier: -1.0 },
      ],
    },
    {
      id: 'P7',
      label: 'Nivel de cliente partida',
      hubspot_field: 'nivel_de_cliente_partida',
      weight: 10,
      type: 'enum',
      default_multiplier: 0,
      options: [
        { value: 'Tier 1', label: 'Tier 1', multiplier: 1.0 },
        { value: 'Tier 2', label: 'Tier 2', multiplier: 0.5 },
        { value: 'Tier 3', label: 'Tier 3', multiplier: -1.0 },
      ],
    },
  ],
}

// ── Conjunto de todas las matrices ──
export const ALL_MATRICES = [MATRIZ_RCM, MATRIZ_INTRANOX]

/** Devuelve la matriz aplicable según la unidad de negocio del deal */
export function getMatrixForUnidad(unidad) {
  if (!unidad) return null
  return ALL_MATRICES.find(m => m.unidades.includes(unidad)) || null
}

/** Graba matrices en localStorage (persistencia local hasta Supabase) */
export function saveMatricesToLocal(matrices) {
  try {
    localStorage.setItem('gr_matrices', JSON.stringify(matrices))
  } catch (e) { console.warn('Could not save matrices', e) }
}

/** Carga matrices desde localStorage, con fallback a defaults */
export function loadMatricesFromLocal() {
  try {
    const stored = JSON.parse(localStorage.getItem('gr_matrices') || 'null')
    if (stored && Array.isArray(stored) && stored.length > 0) return stored
  } catch (e) { /* fallback */ }
  return ALL_MATRICES
}

export { MULT }
