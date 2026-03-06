import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { QRCodeSVG } from 'qrcode.react'
import {
  Building2, Scale, PackageSearch, CheckCircle2,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  Check, ArrowLeft, Plus, Minus,
} from 'lucide-react'
import { outboundApi, customersApi, inventoryApi, materialsApi } from '@/lib/api'
import { useTicketStore } from '@/store/ticketStore'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useWeighbridge } from '@/hooks/useWeighbridge'
import { formatCurrency, formatWeight } from '@/lib/utils'
import WeightDisplay from '@/components/ui/WeightDisplay'
import { Card } from '@/components/ui/Card'

// ─── Step metadata ────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'Customer',  icon: Building2 },
  { id: 1, label: 'Gross Wt', icon: Scale },
  { id: 2, label: 'Grading',  icon: PackageSearch },
  { id: 3, label: 'Complete', icon: CheckCircle2 },
]

// ─── Step indicator ───────────────────────────────────────
function StepBar({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done   = currentStep > s.id
        const active = currentStep === s.id
        return (
          <div key={s.id} className="flex flex-col items-center flex-1 relative">
            {i < STEPS.length - 1 && (
              <div className={`absolute top-5 left-1/2 w-full h-[2px] z-0 transition-colors duration-500
                ${done ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />
            )}
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center z-10 transition-all duration-300 border-2
              ${done   ? 'bg-emerald-500 border-emerald-500 text-white'
              : active ? 'bg-[var(--color-surface)] border-emerald-500 text-emerald-600'
                       : 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]'
              }`}>
              {done ? <Check size={18} /> : <s.icon size={18} />}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 whitespace-nowrap
              ${active ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`}>
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 0: Customer & Vehicle ───────────────────────────
function StepCustomer({ onNext }) {
  const { selectedSiteId } = useUiStore()
  const { user } = useAuthStore()
  const { setActiveTicket } = useTicketStore()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [serverError, setServerError] = useState(null)

  const loadCustomers = useCallback(async (q) => {
    try {
      const res = await customersApi.getAll(q || undefined)
      setCustomers(res.data ?? [])
    } catch { setCustomers([]) }
  }, [])

  useEffect(() => { loadCustomers(customerSearch) }, [customerSearch, loadCustomers])

  const selectedCustomerId = watch('customerId')

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const siteId = selectedSiteId ?? user?.siteId
      if (!siteId) { setServerError('No site selected. Choose a site from the top bar.'); return }
      const res = await outboundApi.create({ customerId: data.customerId, siteId, notes: data.notes || null })
      setActiveTicket(res.data)
      onNext()
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Failed to create outbound ticket.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Customer / Buyer</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Select the buying company for this outbound dispatch.</p>
      </div>

      {serverError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--color-text)]">Search Buyer *</label>
        <input
          type="text"
          placeholder="Search by company name..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="sf-input"
        />
        {customers.length > 0 && (
          <div className="border border-[var(--color-border)] rounded-xl overflow-hidden max-h-52 overflow-y-auto">
            {customers.map((c) => (
              <label key={c.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                ${selectedCustomerId === c.id
                  ? 'bg-emerald-50 dark:bg-emerald-900/30'
                  : 'hover:bg-[var(--color-surface-2)]'}`}>
                <input
                  type="radio"
                  value={c.id}
                  className="accent-emerald-600"
                  {...register('customerId', { required: 'Please select a buyer' })}
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{c.companyName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {c.contactPerson} · {c.contactNumber ?? ''}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
        {errors.customerId && <p className="text-xs text-red-500">{errors.customerId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Notes (optional)</label>
        <textarea rows={2} placeholder="PO number, delivery instructions..."
          className="sf-input resize-none" {...register('notes')} />
      </div>

      <WizardNav isSubmitting={isSubmitting} canBack={false} />
    </form>
  )
}

// ─── Step 1: Gross Weight ─────────────────────────────────
function StepGrossWeight({ onNext, onBack }) {
  const { activeTicket, updateActiveTicket } = useTicketStore()
  const { liveWeight, isConnected, isSupported, connect, disconnect } = useWeighbridge()
  const [lockedWeight, setLockedWeight] = useState(activeTicket?.grossWeight ?? null)
  const [manualWeight, setManualWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const effectiveWeight = lockedWeight ?? (manualWeight ? parseFloat(manualWeight) : null)

  const handleNext = async () => {
    if (!effectiveWeight || effectiveWeight <= 0) { setError('Enter or lock a valid gross weight.'); return }
    setLoading(true); setError(null)
    try {
      const res = await outboundApi.recordGrossWeight(activeTicket.id, { grossWeight: effectiveWeight })
      updateActiveTicket(res.data)
      onNext()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to record gross weight.')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Gross Weight (Loaded)</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Weigh the fully loaded vehicle before dispatch.</p>
      </div>
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
        </div>
      )}
      <WeightDisplay
        weight={lockedWeight ?? liveWeight}
        isConnected={isConnected}
        isLocked={!!lockedWeight}
        isSupported={isSupported}
        onConnect={connect}
        onDisconnect={disconnect}
        onLock={() => setLockedWeight(liveWeight ?? null)}
      />
      {!isConnected && !lockedWeight && (
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Manual Weight Entry (kg)</label>
          <input type="number" step="0.1" min="0" placeholder="e.g. 22450.0"
            value={manualWeight} onChange={(e) => setManualWeight(e.target.value)} className="sf-input" />
        </div>
      )}
      <WizardNav onBack={onBack} onNext={handleNext} isSubmitting={loading}
        nextDisabled={!effectiveWeight || effectiveWeight <= 0} />
    </div>
  )
}

// ─── Step 2: Grading from Inventory ───────────────────────
function StepGrading({ onNext, onBack }) {
  const { activeTicket, updateActiveTicket } = useTicketStore()
  const [materials, setMaterials] = useState([])
  const [lineItems, setLineItems] = useState([{ materialGradeId: '', netWeight: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    materialsApi.getAll().then((r) => setMaterials(r.data ?? []))
  }, [])

  const grossWeight = activeTicket?.grossWeight ?? 0
  const totalGraded = lineItems.reduce((s, li) => s + (parseFloat(li.netWeight) || 0), 0)

  const updateItem = (i, field, value) =>
    setLineItems((prev) => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li))

  const handleNext = async () => {
    const valid = lineItems.filter((li) => li.materialGradeId && parseFloat(li.netWeight) > 0)
    if (valid.length === 0) { setError('Add at least one material grade with a weight.'); return }
    setLoading(true); setError(null)
    try {
      const dto = { lineItems: valid.map((li) => ({ materialGradeId: li.materialGradeId, netWeight: parseFloat(li.netWeight), qualityScore: 100 })) }
      const res = await outboundApi.recordGrading(activeTicket.id, dto)
      updateActiveTicket(res.data)
      onNext()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to record grading.')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Material Grading</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Specify the grades being dispatched. Gross:&nbsp;
            <span className="font-bold text-emerald-600">{formatWeight(grossWeight)}</span>
          </p>
        </div>
        <div className={`text-right px-4 py-2 rounded-xl text-sm font-bold
          ${totalGraded > grossWeight
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600'
            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
          }`}>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-0.5">Dispatch Total</p>
          {formatWeight(totalGraded)}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      <div className="space-y-3">
        {lineItems.map((li, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 p-3 bg-[var(--color-surface-2)] rounded-2xl">
            <div className="col-span-12 sm:col-span-7">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">Grade *</label>
              <select
                className="sf-input mt-1 text-sm"
                value={li.materialGradeId}
                onChange={(e) => updateItem(i, 'materialGradeId', e.target.value)}
              >
                <option value="">Select material grade...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name} ({formatCurrency(m.todaySellPrice ?? m.defaultSellPrice)}/t)
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-9 sm:col-span-4">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">Weight (kg) *</label>
              <input
                type="number" step="0.1" min="0" placeholder="0.0"
                className="sf-input mt-1 text-sm"
                value={li.netWeight}
                onChange={(e) => updateItem(i, 'netWeight', e.target.value)}
              />
            </div>
            <div className="col-span-3 sm:col-span-1 flex items-end justify-end pb-0.5">
              {lineItems.length > 1 && (
                <button type="button"
                  onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Minus size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLineItems((prev) => [...prev, { materialGradeId: '', netWeight: '' }])}
        className="btn-ghost text-sm flex items-center gap-2"
      >
        <Plus size={14} /> Add Grade
      </button>

      <WizardNav onBack={onBack} onNext={handleNext} isSubmitting={loading}
        nextDisabled={totalGraded <= 0} />
    </div>
  )
}

// ─── Step 3: Tare Weight & Complete ──────────────────────
function StepComplete({ onBack }) {
  const { activeTicket, updateActiveTicket, clearActiveTicket } = useTicketStore()
  const { liveWeight, isConnected, isSupported, connect, disconnect } = useWeighbridge()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const navigate = useNavigate()
  const [lockedTare, setLockedTare] = useState(null)
  const [manualTare, setManualTare] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const effectiveTare = lockedTare ?? (manualTare ? parseFloat(manualTare) : null)
  const grossWeight = activeTicket?.grossWeight ?? 0
  const netWeight   = effectiveTare && grossWeight ? Math.max(grossWeight - effectiveTare, 0) : null

  const onSubmit = async (data) => {
    if (!effectiveTare || effectiveTare <= 0) { setError('Enter or lock the tare weight.'); return }
    setError(null)
    try {
      await outboundApi.recordTareWeight(activeTicket.id, { tareWeight: effectiveTare })
      const res = await outboundApi.complete(activeTicket.id, {
        invoiceNumber: data.invoiceNumber || null,
        notes: data.notes || null,
      })
      updateActiveTicket(res.data)
      clearActiveTicket()
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to complete ticket.')
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10 space-y-6"
      >
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-[var(--color-text)]">Dispatch Complete!</h3>
          <p className="text-[var(--color-text-muted)] mt-1">Inventory has been updated via FIFO depletion.</p>
        </div>
        {activeTicket?.ticketNumber && (
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <QRCodeSVG value={activeTicket.ticketNumber} size={100} />
              <p className="text-center text-xs font-bold text-gray-600 mt-2">{activeTicket.ticketNumber}</p>
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2 text-sm no-print">
            Print Receipt
          </button>
          <button onClick={() => navigate('/tickets/outbound')} className="btn-brand px-8 py-3 no-print">
            Back to Tickets
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Tare Weight & Complete</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Weigh the empty vehicle, then confirm the invoice details.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-[var(--color-text)] mb-3">Empty Vehicle (Tare) Weight</p>
        <WeightDisplay
          weight={lockedTare ?? liveWeight}
          isConnected={isConnected}
          isLocked={!!lockedTare}
          isSupported={isSupported}
          onConnect={connect}
          onDisconnect={disconnect}
          onLock={() => setLockedTare(liveWeight ?? null)}
        />
        {!isConnected && !lockedTare && (
          <input
            type="number" step="0.1" min="0" placeholder="Manual tare weight in kg"
            value={manualTare} onChange={(e) => setManualTare(e.target.value)}
            className="sf-input mt-3"
          />
        )}
      </div>

      {netWeight !== null && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Gross Weight', value: formatWeight(grossWeight) },
            { label: 'Tare Weight',  value: formatWeight(effectiveTare) },
            { label: 'Net Weight',   value: formatWeight(netWeight), highlight: true },
          ].map((item) => (
            <div key={item.label} className={`rounded-2xl p-4 text-center
              ${item.highlight ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700' : 'bg-[var(--color-surface-2)]'}`}>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">{item.label}</p>
              <p className={`font-black tabular-nums ${item.highlight ? 'text-emerald-600 text-lg' : 'text-[var(--color-text)]'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Invoice Number</label>
        <input type="text" placeholder="e.g. INV-2026-0042"
          className="sf-input" {...register('invoiceNumber')} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Notes (optional)</label>
        <textarea rows={2} placeholder="Any additional dispatch notes..." className="sf-input resize-none" {...register('notes')} />
      </div>

      <WizardNav
        onBack={onBack}
        isSubmitting={isSubmitting}
        nextLabel="Complete Dispatch"
        nextDisabled={!effectiveTare || effectiveTare <= 0}
      />
    </form>
  )
}

// ─── Shared navigation buttons ────────────────────────────
function WizardNav({ onBack, onNext, isSubmitting = false, nextDisabled = false, canBack = true, nextLabel = 'Continue' }) {
  return (
    <div className="flex justify-between pt-6 border-t border-[var(--color-border)]">
      {canBack ? (
        <button type="button" onClick={onBack} className="btn-ghost flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      ) : <div />}
      <button
        type={onNext ? 'button' : 'submit'}
        onClick={onNext}
        disabled={isSubmitting || nextDisabled}
        className="btn-brand flex items-center gap-2 px-8"
      >
        {isSubmitting
          ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
          : <>{nextLabel} <ChevronRight size={16} /></>
        }
      </button>
    </div>
  )
}

// ─── Main Wizard Page ─────────────────────────────────────
export default function OutboundTicketWizard() {
  const navigate = useNavigate()
  const { setActiveTicket, advanceStep } = useTicketStore()
  const [step, setStep] = useState(0)

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  // Reset ticket store on unmount
  useEffect(() => {
    return () => useTicketStore.getState().clearActiveTicket()
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/tickets/outbound')}
        className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <ArrowLeft size={16} /> Back to Outbound Tickets
      </button>

      <div className="glass-card p-6 md:p-8">
        <StepBar currentStep={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{    opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && <StepCustomer onNext={goNext} />}
            {step === 1 && <StepGrossWeight onNext={goNext} onBack={goBack} />}
            {step === 2 && <StepGrading    onNext={goNext} onBack={goBack} />}
            {step === 3 && <StepComplete   onBack={goBack} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
