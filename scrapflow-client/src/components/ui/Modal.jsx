import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Accessible modal built on Radix Dialog with glass-style card.
 *
 * Usage:
 *   <Modal open={open} onOpenChange={setOpen} title="My Modal">
 *     <p>Content here</p>
 *   </Modal>
 */
export default function Modal({ open, onOpenChange, title, description, children, size = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{    opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                            w-full ${widths[size] ?? widths.md} mx-4
                            glass-card outline-none flex flex-col`}
                style={{ maxHeight: '90vh' }}
              >
                {/* Header */}
                <div className="flex-shrink-0 px-6 pt-6 pb-0">
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
                </div>

                {/* Close */}
                <Dialog.Close asChild>
                  <button className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center
                                     rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                                     hover:bg-[var(--color-surface-2)] transition-colors">
                    <X size={16} />
                  </button>
                </Dialog.Close>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

/**
 * Convenience component for modal footer with action buttons.
 */
export function ModalFooter({ children }) {
  return (
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
      {children}
    </div>
  )
}
