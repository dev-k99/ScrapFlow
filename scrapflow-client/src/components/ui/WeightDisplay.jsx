import { Scale, Wifi, WifiOff, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Large outdoor-readable weight display.
 *
 * Props:
 *   weight       – number|null    current weight in kg
 *   isConnected  – bool           whether Web Serial is active
 *   isLocked     – bool           weight has been locked for submission
 *   unit         – 'kg'|'t'       display unit
 *   onConnect    – fn             connect scale handler
 *   onDisconnect – fn             disconnect scale handler
 *   onLock       – fn             lock reading handler
 *   isSupported  – bool           Web Serial API feature flag
 */
export default function WeightDisplay({
  weight = null,
  isConnected = false,
  isLocked = false,
  unit = 'kg',
  onConnect,
  onDisconnect,
  onLock,
  isSupported = false,
}) {
  const displayWeight = weight !== null
    ? (unit === 't' ? (weight / 1000).toFixed(3) : weight.toFixed(1))
    : '—'

  return (
    <div className={`relative rounded-3xl border-2 p-8 flex flex-col items-center gap-4
      ${isLocked
        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
        : isConnected
          ? 'border-emerald-300 bg-[var(--color-surface-2)]'
          : 'border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]'
      }`}>

      {/* Status label */}
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest
        ${isLocked ? 'text-emerald-600' : isConnected ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`}>
        {isLocked
          ? <><Lock size={12} /> Locked</>
          : isConnected
            ? <><Wifi size={12} /><span className="animate-pulse">Live</span></>
            : <><WifiOff size={12} /> Manual</>
        }
      </div>

      {/* Main weight number */}
      <AnimatePresence mode="wait">
        <motion.div
          key={displayWeight}
          initial={{ opacity: 0.5, scale: 0.97 }}
          animate={{ opacity: 1,   scale: 1 }}
          className="flex items-baseline gap-2"
        >
          <span className="weight-display text-5xl md:text-6xl font-black tabular-nums
                           text-[var(--color-brand)] dark:text-emerald-400">
            {displayWeight}
          </span>
          <span className="text-2xl font-bold text-[var(--color-text-muted)]">{unit}</span>
        </motion.div>
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3 mt-2">
        {!isLocked && !isConnected && isSupported && (
          <button onClick={onConnect} className="btn-brand">
            <Scale size={16} /> Connect Scale
          </button>
        )}
        {!isLocked && isConnected && (
          <>
            <button onClick={onDisconnect} className="btn-ghost text-sm">
              Disconnect
            </button>
            {weight !== null && (
              <button onClick={onLock} className="btn-brand">
                <Lock size={16} /> Lock Weight
              </button>
            )}
          </>
        )}
        {isLocked && (
          <button
            onClick={() => { onLock?.(null) }}
            className="btn-ghost text-sm text-red-500 border-red-200 hover:border-red-400"
          >
            Unlock
          </button>
        )}
        {!isSupported && !isLocked && (
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Web Serial not supported — enter weight manually.
          </p>
        )}
      </div>
    </div>
  )
}
