import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({ open, onOpenChange, title, description, children, size = 'md' }) {
  const widths = { sm: '28rem', md: '32rem', lg: '42rem', xl: '56rem' }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Dimmed backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            {/* Scroll container — sits above backdrop */}
            <div
              className="fixed inset-0 z-50 overflow-y-auto"
              onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
            >
              {/* Centering wrapper */}
              <div className="flex min-h-full items-center justify-center p-4">
                <Dialog.Content asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="relative w-full glass-card p-6 outline-none"
                    style={{ maxWidth: widths[size] ?? widths.md }}
                  >
                    {/* Header */}
                    {(title || description) && (
                      <div className="mb-5 pr-8">
                        {title && (
                          <Dialog.Title className="text-lg font-bold text-[var(--color-text)] leading-tight">
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="text-sm text-[var(--color-text-muted)] mt-1">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                    )}

                    {/* Close button */}
                    <Dialog.Close asChild>
                      <button className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center
                                         rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                                         hover:bg-[var(--color-surface-2)] transition-colors">
                        <X size={16} />
                      </button>
                    </Dialog.Close>

                    {children}
                  </motion.div>
                </Dialog.Content>
              </div>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export function ModalFooter({ children }) {
  return (
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
      {children}
    </div>
  )
}
