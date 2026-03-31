import { useState, useEffect, useMemo } from 'react'
import { Save, ChevronDown, ChevronUp, Sliders, RotateCcw, Info } from 'lucide-react'
import { ALL_MATRICES, loadMatricesFromLocal, saveMatricesToLocal, MULT } from '../data/matrices'
import { calculateScore, getScoreLevel } from '../utils/scoring'

const MULT_OPTIONS = [
  { value: 1.0,  label: 'Muy alta', color: 'text-emerald-400' },
  { value: 0.5,  label: 'Alta',     color: 'text-teal-400' },
  { value: 0.0,  label: 'Media',    color: 'text-steel-300' },
  { value: -0.5, label: 'Baja',     color: 'text-amber-400' },
  { value: -1.0, label: 'Muy baja', color: 'text-red-400' },
]

function MultSelect({ value, onChange }) {
  const current = MULT_OPTIONS.find(o => o.value === value) || MULT_OPTIONS[2]
  return (
    <select
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className={`text-xs font-semibold px-2 py-1 rounded-lg bg-surface-800 border border-white/10 focus:outline-none focus:border-accent-500/50 ${current.color}`}
    >
      {MULT_OPTIONS.map(o => (
        <option key={o.value} value={o.value} className="text-white bg-surface-800">
          {o.label}
        </option>
      ))}
    </select>
  )
}

function ParamCard({ param, paramIdx, matrixIdx, onWeightChange, onOptionChange, onRangeChange }) {
  const [expanded, setExpanded] = useState(false)
  const weightPct = `${param.weight}%`

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <input
              type="number"
              min={0} max={100}
              value={param.weight}
              onClick={e => e.stopPropagation()}
              onChange={e => onWeightChange(matrixIdx, paramIdx, parseInt(e.target.value) || 0)}
              className="w-14 text-center text-lg font-bold text-accent-400 bg-surface-800 border border-white/10 rounded-lg focus:outline-none focus:border-accent-500/50 py-1"
            />
            <span className="text-[10px] text-steel-500 mt-0.5">puntos</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{param.label}</p>
            <p className="text-steel-500 text-xs font-mono mt-0.5">{param.hubspot_field}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Weight bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: weightPct }} />
            </div>
            <span className="text-xs text-steel-400 w-8">{param.weight}%</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-steel-400" /> : <ChevronDown className="w-4 h-4 text-steel-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/6 px-5 py-4 space-y-3">
          {param.type === 'enum' && (param.options || []).map((opt, oi) => (
            <div key={opt.value} className="flex items-center justify-between gap-3">
              <span className="text-sm text-steel-300 flex-1">{opt.label || opt.value}</span>
              <MultSelect
                value={opt.multiplier}
                onChange={v => onOptionChange(matrixIdx, paramIdx, oi, v)}
              />
            </div>
          ))}
          {param.type === 'range' && (param.ranges || []).map((range, ri) => (
            <div key={ri} className="flex items-center justify-between gap-3">
              <span className="text-sm text-steel-300 flex-1 font-mono text-xs">
                {range.min === null ? `< ${range.max}` : range.max === null ? `≥ ${range.min}` : `${range.min} – ${range.max}`}
              </span>
              <MultSelect
                value={range.multiplier}
                onChange={v => onRangeChange(matrixIdx, paramIdx, ri, v)}
              />
            </div>
          ))}
          {(param.type === 'province_map' || param.type === 'sector_map') && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-800/60 border border-white/5">
              <Info className="w-4 h-4 text-accent-400 shrink-0" />
              <p className="text-xs text-steel-400">
                {param.type === 'province_map'
                  ? 'Mapa de provincias configurado en código (50 provincias → 5 niveles).'
                  : 'Mapa de sectores configurado en código (70+ sectores → 5 niveles).'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ScoringPage() {
  const [matrices, setMatrices] = useState(() => loadMatricesFromLocal())
  const [activeTab, setActiveTab] = useState(0)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Preview: simulate a deal to show example scores
  const previewDeal = {
    prioridad_de_obra__proyecto: 'Alta',
    ubicacion_provincia_obra__proyecto: 'La Rioja',
    peso_total_cmr_toneladas: 250,
    madurez_en_adjudicacion_obra__proyecto: 'Adjudicada',
    tipo_de_obra__proyecto: 'Nuevo',
    valor_actual: 750000,
    numero_total_de_depositos: 45,
    sector_partida: 'Lácteo',
    amount: 750000,
  }

  function setMatrix(matrixIdx, updater) {
    setMatrices(prev => {
      const next = prev.map((m, i) => i === matrixIdx ? updater(m) : m)
      return next
    })
    setDirty(true)
  }

  function handleWeightChange(mi, pi, val) {
    setMatrix(mi, m => ({
      ...m,
      params: m.params.map((p, i) => i === pi ? { ...p, weight: val } : p)
    }))
  }

  function handleOptionChange(mi, pi, oi, multiplier) {
    setMatrix(mi, m => ({
      ...m,
      params: m.params.map((p, i) => i !== pi ? p : {
        ...p,
        options: p.options.map((o, j) => j === oi ? { ...o, multiplier } : o)
      })
    }))
  }

  function handleRangeChange(mi, pi, ri, multiplier) {
    setMatrix(mi, m => ({
      ...m,
      params: m.params.map((p, i) => i !== pi ? p : {
        ...p,
        ranges: p.ranges.map((r, j) => j === ri ? { ...r, multiplier } : r)
      })
    }))
  }

  function handleSave() {
    saveMatricesToLocal(matrices)
    setSaved(true)
    setDirty(false)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleReset() {
    if (confirm('¿Restaurar la matriz a los valores por defecto? Se perderán los cambios guardados.')) {
      setMatrices(ALL_MATRICES)
      saveMatricesToLocal(ALL_MATRICES)
      setDirty(false)
    }
  }

  const matrix = matrices[activeTab]
  const totalWeight = matrix?.params.reduce((s, p) => s + p.weight, 0) || 0
  const preview = matrix ? calculateScore(previewDeal, matrix) : null

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sliders className="w-7 h-7 text-accent-400" />
            Configuración de <span className="text-accent-400">Scoring</span>
          </h2>
          <p className="text-steel-400 text-sm mt-1">
            Ajusta los pesos y multiplicadores de cada criterio de valoración
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-surface-700/50 border border-white/8 text-steel-400 text-sm font-medium rounded-xl hover:text-white hover:border-white/15 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
              saved
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : dirty
                  ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40 hover:scale-[1.02]'
                  : 'bg-surface-700/30 border border-white/5 text-steel-600 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Matrix tabs */}
      <div className="flex gap-2">
        {matrices.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === i
                ? 'bg-accent-500/15 border border-accent-500/40 text-accent-300'
                : 'bg-surface-700/50 border border-white/8 text-steel-400 hover:text-white'
            }`}
          >
            {m.nombre}
          </button>
        ))}
      </div>

      {matrix && (
        <>
          {/* Info bar */}
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 rounded-xl bg-surface-800/60 border border-white/5 text-sm">
            <div>
              <span className="text-steel-500">Unidades: </span>
              <span className="text-white font-medium">{matrix.unidades.join(', ')}</span>
            </div>
            <div>
              <span className="text-steel-500">Total pesos: </span>
              <span className={`font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalWeight} pts {totalWeight !== 100 && '⚠️ debe sumar 100'}
              </span>
            </div>
            {preview && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-steel-500 text-xs">Preview score (Alta/Rioja/750k€):</span>
                <span className={`text-lg font-bold ${preview.color}`}>{preview.score}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${preview.badge}`}>{preview.dot} {preview.label}</span>
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="space-y-3">
            {matrix.params.map((param, pi) => (
              <ParamCard
                key={param.id}
                param={param}
                paramIdx={pi}
                matrixIdx={activeTab}
                onWeightChange={handleWeightChange}
                onOptionChange={handleOptionChange}
                onRangeChange={handleRangeChange}
              />
            ))}
          </div>

          {/* Formula info */}
          <div className="glass-card rounded-xl px-5 py-4">
            <h3 className="text-xs font-semibold text-accent-400 uppercase tracking-wider mb-3">📐 Fórmula de cálculo</h3>
            <div className="font-mono text-sm text-steel-300 space-y-1">
              <p>Score = <span className="text-accent-300">((Σ(peso × multiplicador) + {totalWeight}) / ({totalWeight} × 2))</span> × 100</p>
              <p className="text-steel-500 text-xs mt-2">
                Multiplicadores: Muy alta=+1 · Alta=+0.5 · Media=0 · Baja=-0.5 · Muy baja=-1
              </p>
              <p className="text-steel-500 text-xs">
                Semáforo: 🟢 ≥70 Alto · 🟡 45–69 Medio · 🔴 &lt;45 Bajo
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
