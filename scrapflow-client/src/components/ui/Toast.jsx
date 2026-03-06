import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-500" />,
  error:   <AlertCircle  size={16} className="text-red-500" />,
  info:    <Info         size={16} className="text-blue-500" />,
  warning: <AlertCircle  size={16} className="text-amber-500" />,
}

const COLORS = {
  success: 'border-l-emerald-500',
  error:   'border-l-red-500',
  info:    'border-l-blue-500',
  warning: 'border-l-amber-500',
}

export default function Toast() {
  const { toasts, dismissToast } = useUiStore()

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{    opacity: 0, x: 60,  scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl
                        bg-[var(--color-surface)] border border-[var(--color-border)]
                        border-l-4 shadow-xl max-w-sm min-w-[260px]
                        ${COLORS[t.type] ?? COLORS.info}`}
          >
            <div className="flex-shrink-0 mt-0.5">{ICONS[t.type] ?? ICONS.info}</div>
            <p className="flex-1 text-sm font-medium text-[var(--color-text)]">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
