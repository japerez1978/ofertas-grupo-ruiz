import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const DAYS_ES = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay()
  // Convert from Sunday=0 to Monday=0
  return day === 0 ? 6 : day - 1
}

function formatDisplay(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const monthName = MONTHS_ES[m - 1]
  return `${d} de ${monthName.slice(0, 3)}. de ${y}`
}

function toYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function DatePickerCustom({ value, onChange, id, label, icon: Icon = Calendar }) {
  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth()
  const todayD = today.getDate()

  // Parse selected date
  const selParts = value ? value.split('-').map(Number) : null
  const selY = selParts ? selParts[0] : null
  const selM = selParts ? selParts[1] - 1 : null
  const selD = selParts ? selParts[2] : null

  const [viewYear, setViewYear] = useState(selY ?? todayY)
  const [viewMonth, setViewMonth] = useState(selM ?? todayM)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // When value changes externally, sync the view month
  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number)
      setViewYear(y)
      setViewMonth(m - 1)
    }
  }, [value])

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function selectDay(day) {
    onChange(toYMD(viewYear, viewMonth, day))
    setOpen(false)
  }

  function selectToday() {
    onChange(toYMD(todayY, todayM, todayD))
    setViewYear(todayY)
    setViewMonth(todayM)
    setOpen(false)
  }

  function clear() {
    onChange('')
    setOpen(false)
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  // Previous month overflow days
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  )

  const cells = []

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, current: false })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true })
  }

  // Next month leading days (fill to 42 = 6 rows)
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false })
  }

  const labelClass = 'flex items-center gap-2 text-sm font-medium text-steel-200'

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className={labelClass}>
          <Icon className="w-4 h-4 text-accent-400" />
          {label}
        </label>
      )}

      <div className="relative" ref={ref}>
        {/* Input display */}
        <button
          type="button"
          id={id}
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-800/80 border border-white/8 text-sm focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all text-left"
        >
          <Calendar className="w-4 h-4 text-steel-400 shrink-0" />
          <span className={value ? 'text-white' : 'text-steel-500'}>
            {value ? formatDisplay(value) : 'Seleccionar fecha...'}
          </span>
        </button>

        {/* Calendar dropdown */}
        {open && (
          <div className="absolute z-50 mt-2 w-[310px] rounded-2xl bg-surface-700 border border-white/10 shadow-2xl p-4 animate-fade-in-up"
               style={{ animationDuration: '0.2s' }}>
            {/* Header: < month year > */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 text-steel-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-white capitalize">
                {MONTHS_ES[viewMonth]} de {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 text-steel-300 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day of week headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {DAYS_ES.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-steel-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0">
              {cells.map((cell, i) => {
                const isToday = cell.current && cell.day === todayD && viewMonth === todayM && viewYear === todayY
                const isSelected = cell.current && cell.day === selD && viewMonth === selM && viewYear === selY

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => cell.current && selectDay(cell.day)}
                    disabled={!cell.current}
                    className={`
                      relative w-full aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                      ${!cell.current
                        ? 'text-steel-600 cursor-default'
                        : isSelected
                          ? 'bg-accent-500 text-white font-semibold shadow-lg shadow-accent-500/25'
                          : 'text-steel-200 hover:bg-white/10 hover:text-white cursor-pointer'
                      }
                    `}
                  >
                    {cell.day}
                    {/* Today dot */}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer: Hoy / Borrar */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/8">
              <button
                type="button"
                onClick={selectToday}
                className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-surface-600 text-steel-200 hover:bg-surface-500 hover:text-white border border-white/8 transition-all"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={clear}
                className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-surface-600 text-steel-200 hover:bg-surface-500 hover:text-white border border-white/8 transition-all"
              >
                Borrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
