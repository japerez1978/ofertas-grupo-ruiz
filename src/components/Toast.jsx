import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const variants = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
  },
  error: {
    icon: AlertTriangle,
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
  },
  info: {
    icon: Info,
    bg: 'bg-accent-500/10 border-accent-500/30',
    text: 'text-accent-400',
  },
}

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(true)
  const variant = variants[type] || variants.info
  const Icon = variant.icon

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl transition-all duration-300 ${
        variant.bg
      } ${visible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-4'}`}
    >
      <Icon className={`w-5 h-5 ${variant.text} shrink-0`} />
      <span className="text-sm font-medium text-white">{message}</span>
      <button onClick={onClose} className="ml-2 text-steel-400 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
