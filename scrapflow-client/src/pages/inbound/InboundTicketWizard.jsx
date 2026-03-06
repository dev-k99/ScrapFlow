import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, useFieldArray } from 'react-hook-form'
import { QRCodeSVG } from 'qrcode.react'
import {
  Truck, Scale, ClipboardList, Camera, CreditCard, CheckCircle2,
  ChevronLeft, ChevronRight, Plus, Trash2, Loader2, AlertCircle,
  Check, ArrowLeft, Printer
} from 'lucide-react'
import { inboundApi, suppliersApi, materialsApi } from '@/lib/api'
import { saveDraft } from '@/offline/db'
import { useTicketStore } from '@/store/ticketStore'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useWeighbridge } from '@/hooks/useWeighbridge'
import { formatCurrency, formatWeight } from '@/lib/utils'
import WeightDisplay from '@/components/ui/WeightDisplay'
import { CameraModal } from '@/components/ui/CameraModal'
import { Card } from '@/components/ui/Card'

// ─── Step metadata ────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'Supplier',  icon: Truck },
  { id: 1, label: 'Gross Wt', icon: Scale },
  { id: 2, label: 'Grading',  icon: ClipboardList },
  { id: 3, label: 'Photos',   icon: Camera },
  { id: 4, label: 'Payment',  icon: CreditCard },
  { id: 5, label: 'Complete', icon: CheckCircle2 },
]

const STATUS_STEP = {
  Created: 0, GrossWeighed: 1, Graded: 2,
  TareWeighed: 3, PaymentRecorded: 4, Completed: 5, Cancelled: -1,
}

// ─── Step indicator ───────────────────────────────────────
function StepBar({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = currentStep > s.id
        const active = currentStep === s.id
        return (
          <div key={s.id} className="flex flex-col items-center flex-1 relative">
            {/* Connector line */}
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
              ${active ? 'text-emerald-600' : done ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]'}`}>
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 0: Supplier & Vehicle ──────────────────────────
function StepSupplier({ onNext, ticketId }) {
  const { selectedSiteId } = useUiStore()
  const { user } = useAuthStore()
  const { setActiveTicket } = useTicketStore()
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm()
  const [suppliers, setSuppliers] = useState([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [serverError, setServerError] = useState(null)

  const loadSuppliers = useCallback(async (q) => {
    const res = await suppliersApi.getAll(q || undefined)
    setSuppliers(res.data ?? [])
  }, [])

  useEffect(() => { loadSuppliers(supplierSearch) }, [supplierSearch, loadSuppliers])

  const selectedSupplier = watch('supplierId')

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const siteId = selectedSiteId ?? user?.siteId
      if (!siteId) { setServerError('No site selected. Choose a site from the top bar.'); return }
      const res = await inboundApi.create({ supplierId: data.supplierId, siteId, notes: data.notes || null })
      setActiveTicket(res.data)
      onNext()
    } catch (err) {
      if (!navigator.onLine) {
        const siteId = selectedSiteId ?? user?.siteId
        await saveDraft({ id: `draft-${Date.now()}`, step: 0, formData: { ...data, siteId }, timestamp: Date.now() })
        setServerError('You are offline. Draft saved — will sync when connected.')
      } else {
        setServerError(err.response?.data?.message ?? 'Failed to create ticket.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Supplier & Vehicle</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Select the supplier and capture vehicle details.</p>
      </div>

      {serverError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
        </div>
      )}

      {/* Supplier search */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--color-text)]">Supplier *</label>
        <input
          type="text"
          placeholder="Search by name or ID number..."
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
          className="sf-input"
        />
        {/* Supplier list */}
        {suppliers.length > 0 && (
          <div className="border border-[var(--color-border)] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {suppliers.map((s) => (
              <label key={s.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                ${selectedSupplier === s.id
                  ? 'bg-emerald-50 dark:bg-emerald-900/30'
                  : 'hover:bg-[var(--color-surface-2)]'}`}>
                <input
                  type="radio"
                  value={s.id}
                  className="accent-emerald-600"
                  {...register('supplierId', { required: 'Please select a supplier' })}
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{s.fullName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">ID: {s.idNumber} · {s.idType}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        {errors.supplierId && <p className="text-xs text-red-500">{errors.supplierId.message}</p>}

        <button
          type="button"
          onClick={() => setShowNewSupplier((v) => !v)}
          className="text-sm text-emerald-600 font-semibold hover:underline flex items-center gap-1 mt-1"
        >
          <Plus size={14} /> Add new supplier
        </button>
      </div>

      {/* New supplier mini-form */}
      <AnimatePresence>
        {showNewSupplier && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{    height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <NewSupplierForm onCreated={(s) => {
              setValue('supplierId', s.id)
              setShowNewSupplier(false)
              setSuppliers((prev) => [s, ...prev])
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Notes (optional)</label>
        <textarea
          rows={2}
          placeholder="Any additional notes for this ticket..."
          className="sf-input resize-none"
          {...register('notes')}
        />
      </div>

      <WizardNav isSubmitting={isSubmitting} canBack={false} />
    </form>
  )
}

function NewSupplierForm({ onCreated }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [serverError, setServerError] = useState(null)

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const res = await suppliersApi.create({
        fullName:  data.fullName,
        idNumber:  data.idNumber,
        idType:    parseInt(data.idType, 10),
        contactNumber: data.contactNumber || null,
        email:     null, address: null,
        vehicleRegistration: data.vehicleReg || null,
        bankName:  data.bankName || null,
        accountNumber: data.accountNumber || null,
        branchCode: null,
        isWastePicker: false, wastePickerArea: null,
      })
      onCreated(res.data)
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Failed to create supplier.')
    }
  }

  return (
    <div className="bg-[var(--color-surface-2)] rounded-2xl p-5 space-y-4 mt-2">
      <p className="text-sm font-bold text-[var(--color-text)]">New Supplier</p>
      {serverError && <p className="text-xs text-red-500">{serverError}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">Full Name *</label>
            <input className="sf-input mt-1" {...register('fullName', { required: true })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">ID Number *</label>
            <input className="sf-input mt-1" {...register('idNumber', { required: true })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">ID Type *</label>
            <select className="sf-input mt-1" {...register('idType', { required: true })}>
              <option value="0">SA ID</option>
              <option value="1">Passport</option>
              <option value="2">Company Reg</option>
              <option value="3">Asylum Permit</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">Contact Number</label>
            <input className="sf-input mt-1" {...register('contactNumber')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">Vehicle Reg</label>
            <input className="sf-input mt-1" placeholder="ABC 123 GP" {...register('vehicleReg')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">Bank Name</label>
            <input className="sf-input mt-1" {...register('bankName')} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">Account Number</label>
            <input className="sf-input mt-1" {...register('accountNumber')} />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-brand text-sm">
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Save Supplier'}
        </button>
      </form>
    </div>
  )
}

// ─── Step 1: Gross Weight ────────────────────────────────
function StepGrossWeight({ onNext, onBack }) {
  const { activeTicket, updateActiveTicket } = useTicketStore()
  const { liveWeight, isConnected, isSupported, connect, disconnect } = useWeighbridge()
  const [lockedWeight, setLockedWeight] = useState(activeTicket?.grossWeight ?? null)
  const [manualWeight, setManualWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const effectiveWeight = lockedWeight ?? (manualWeight ? parseFloat(manualWeight) : null)

  const handleNext = async () => {
    if (!effectiveWeight || effectiveWeight <= 0) {
      setError('Enter or lock a valid gross weight.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await inboundApi.recordGrossWeight(activeTicket.id, { grossWeight: effectiveWeight })
      updateActiveTicket(res.data)
      onNext()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to record gross weight.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Gross Weight</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Ensure the vehicle is fully on the weighbridge before locking the reading.
        </p>
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
        onLock={(w) => setLockedWeight(w !== null ? (liveWeight ?? null) : null)}
      />

      {/* Manual entry fallback */}
      {!isConnected && !lockedWeight && (
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
            Manual Weight Entry (kg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="e.g. 12450.0"
            value={manualWeight}
            onChange={(e) => setManualWeight(e.target.value)}
            className="sf-input"
          />
        </div>
      )}

      <WizardNav
        onBack={onBack}
        onNext={handleNext}
        isSubmitting={loading}
        nextDisabled={!effectiveWeight || effectiveWeight <= 0}
      />
    </div>
  )
}

// ─── Step 2: Grading ─────────────────────────────────────
function StepGrading({ onNext, onBack }) {
  const { activeTicket, updateActiveTicket } = useTicketStore()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      lineItems: [{ materialGradeId: '', netWeight: '', gradeNotes: '', qualityScore: 100 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  useEffect(() => {
    materialsApi.getAll().then((r) => setMaterials(r.data ?? []))
  }, [])

  const watchedItems = watch('lineItems')
  const totalGraded = watchedItems.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0)
  const grossWeight = activeTicket?.grossWeight ?? 0

  const onSubmit = async (data) => {
    setLoading(true)
    setError(null)
    try {
      const lineItems = data.lineItems.map((item) => ({
        materialGradeId: item.materialGradeId,
        netWeight:       parseFloat(item.netWeight),
        gradeNotes:      item.gradeNotes || null,
        qualityScore:    parseInt(item.qualityScore, 10),
      }))
      const res = await inboundApi.recordGrading(activeTicket.id, { lineItems })
      updateActiveTicket(res.data)
      onNext()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to record grading.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Material Grading</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Break down the load by material grade.
            Gross weight: <span className="font-bold text-emerald-600">{formatWeight(grossWeight)}</span>
          </p>
        </div>
        {/* Running total */}
        <div className={`text-right px-4 py-2 rounded-xl text-sm font-bold
          ${totalGraded > grossWeight
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600'
            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
          }`}>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-0.5">Graded Total</p>
          {formatWeight(totalGraded)}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Line items */}
      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={field.id} className="grid grid-cols-12 gap-2 p-3 bg-[var(--color-surface-2)] rounded-2xl">
            {/* Material grade select */}
            <div className="col-span-12 sm:col-span-5">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">Grade *</label>
              <select
                className="sf-input mt-1 text-sm"
                {...register(`lineItems.${i}.materialGradeId`, { required: true })}
              >
                <option value="">Select material grade...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name} ({formatCurrency(m.todayBuyPrice)}/t)
                  </option>
                ))}
              </select>
            </div>
            {/* Weight */}
            <div className="col-span-5 sm:col-span-3">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">Weight (kg) *</label>
              <input
                type="number" step="0.1" min="0" placeholder="0.0"
                className="sf-input mt-1 text-sm"
                {...register(`lineItems.${i}.netWeight`, { required: true, min: 0.01 })}
              />
            </div>
            {/* Quality score */}
            <div className="col-span-5 sm:col-span-2">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">Quality %</label>
              <input
                type="number" min="0" max="100" placeholder="100"
                className="sf-input mt-1 text-sm"
                {...register(`lineItems.${i}.qualityScore`)}
              />
            </div>
            {/* Remove */}
            <div className="col-span-2 sm:col-span-2 flex items-end justify-end pb-0.5">
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({ materialGradeId: '', netWeight: '', gradeNotes: '', qualityScore: 100 })}
        className="btn-ghost text-sm flex items-center gap-2"
      >
        <Plus size={14} /> Add Material Grade
      </button>

      <WizardNav
        onBack={onBack}
        isSubmitting={loading}
        nextDisabled={totalGraded <= 0 || totalGraded > grossWeight * 1.05}
      />
    </form>
  )
}

// ─── Step 3: Compliance Photos ───────────────────────────
const PHOTO_TYPES = [
  { key: 'SellerFace',    label: 'Seller Face',    required: true },
  { key: 'MaterialLoad',  label: 'Material Load',  required: true },
  { key: 'IdDocument',    label: 'ID Document',    required: true },
]

function StepPhotos({ onNext, onBack }) {
  const { activeTicket, updateActiveTicket } = useTicketStore()
  const [photos, setPhotos] = useState({}) // key → { blob, url }
  const [cameraFor, setCameraFor] = useState(null)
  const [uploading, setUploading] = useState({})
  const [error, setError] = useState(null)

  const requiredDone = PHOTO_TYPES.filter((p) => p.required).every((p) => photos[p.key])

  const handleCapture = async (blob, key) => {
    const url = URL.createObjectURL(blob)
    setPhotos((prev) => ({ ...prev, [key]: { blob, url } }))
    setCameraFor(null)

    // Upload immediately
    setUploading((prev) => ({ ...prev, [key]: true }))
    try {
      const formData = new FormData()
      formData.append('file', blob, `${key}.jpg`)
      formData.append('photoType', key)
      await inboundApi.uploadPhoto(activeTicket.id, formData)
    } catch {
      // Photo stored locally; will be retried
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleNext = () => {
    if (!requiredDone) { setError('All 3 SAPS-mandatory photos are required.'); return }
    setError(null)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Compliance Photos</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          SAPS / Second-Hand Goods Act requires 3 mandatory photos for every inbound ticket.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PHOTO_TYPES.map((pt) => {
          const captured = photos[pt.key]
          const isUploading = uploading[pt.key]
          return (
            <div key={pt.key}>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                {pt.label}{pt.required ? ' *' : ''}
              </p>
              {captured ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-emerald-400">
                  <img src={captured.url} alt={pt.label} className="w-full h-full object-cover" />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                  <button
                    onClick={() => setCameraFor(pt.key)}
                    className="absolute bottom-2 right-2 btn-ghost text-xs py-1 px-2"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCameraFor(pt.key)}
                  className="w-full aspect-square rounded-2xl border-2 border-dashed border-[var(--color-border)]
                             hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10
                             transition-all flex flex-col items-center justify-center gap-3 bg-[var(--color-surface-2)]"
                >
                  <Camera size={28} className="text-[var(--color-text-muted)]" />
                  <span className="text-xs font-semibold text-[var(--color-text-muted)]">Tap to capture</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      <CameraModal
        isOpen={!!cameraFor}
        onClose={() => setCameraFor(null)}
        onCapture={(blob) => handleCapture(blob, cameraFor)}
        title={PHOTO_TYPES.find((p) => p.key === cameraFor)?.label ?? 'Capture Photo'}
      />

      <WizardNav
        onBack={onBack}
        onNext={handleNext}
        nextDisabled={!requiredDone}
      />
    </div>
  )
}

// ─── Step 4: Tare Weight & Payment ──────────────────────
function StepPayment({ onNext, onBack }) {
  const { activeTicket, updateActiveTicket } = useTicketStore()
  const { liveWeight, isConnected, isSupported, connect, disconnect } = useWeighbridge()
  const [lockedTare, setLockedTare] = useState(null)
  const [manualTare, setManualTare] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const effectiveTare = lockedTare ?? (manualTare ? parseFloat(manualTare) : null)
  const grossWeight = activeTicket?.grossWeight ?? 0
  const netWeight = effectiveTare && grossWeight ? Math.max(grossWeight - effectiveTare, 0) : null

  const onSubmit = async (data) => {
    if (!effectiveTare || effectiveTare <= 0) { setError('Enter or lock the tare weight.'); return }
    setLoading(true)
    setError(null)
    try {
      // Record tare weight
      const tareRes = await inboundApi.recordTareWeight(activeTicket.id, { tareWeight: effectiveTare })
      // Record payment
      const payRes = await inboundApi.recordPayment(activeTicket.id, {
        paymentReference: data.paymentRef,
        paymentProofPath: null,
      })
      updateActiveTicket(payRes.data)
      onNext()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to record payment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Tare Weight & Payment</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Weigh the empty vehicle, then record the EFT payment reference.
          Cash payments are <span className="font-bold text-red-500">PROHIBITED</span> under SAPS regulation.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Tare weight */}
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)] mb-3">Empty Vehicle (Tare) Weight</p>
        <WeightDisplay
          weight={lockedTare ?? liveWeight}
          isConnected={isConnected}
          isLocked={!!lockedTare}
          isSupported={isSupported}
          onConnect={connect}
          onDisconnect={disconnect}
          onLock={(w) => setLockedTare(w !== null ? (liveWeight ?? null) : null)}
        />
        {!isConnected && !lockedTare && (
          <input
            type="number" step="0.1" min="0" placeholder="Manual tare weight in kg"
            value={manualTare}
            onChange={(e) => setManualTare(e.target.value)}
            className="sf-input mt-3"
          />
        )}
      </div>

      {/* Net weight summary */}
      {netWeight !== null && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Gross Weight', value: formatWeight(grossWeight) },
            { label: 'Tare Weight',  value: formatWeight(effectiveTare) },
            { label: 'Net Weight',   value: formatWeight(netWeight), highlight: true },
          ].map((item) => (
            <div key={item.label} className={`rounded-2xl p-4 text-center
              ${item.highlight
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700'
                : 'bg-[var(--color-surface-2)]'
              }`}>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">{item.label}</p>
              <p className={`font-black tabular-nums ${item.highlight ? 'text-emerald-600 text-lg' : 'text-[var(--color-text)]'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* EFT Reference */}
      <div>
        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
          EFT Payment Reference *
        </label>
        <input
          type="text"
          placeholder="e.g. EFT-20260303-001"
          className="sf-input"
          {...register('paymentRef', { required: 'EFT reference is required — cash is not accepted' })}
        />
        {errors.paymentRef && <p className="text-xs text-red-500 mt-1">{errors.paymentRef.message}</p>}
      </div>

      <WizardNav
        onBack={onBack}
        isSubmitting={loading}
        nextDisabled={!effectiveTare || effectiveTare <= 0}
      />
    </form>
  )
}

// ─── Step 5: Review & Sign ───────────────────────────────
function StepComplete({ onBack }) {
  const { activeTicket, clearActiveTicket } = useTicketStore()
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const startDraw = (e) => {
    setDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) { ctx.beginPath(); ctx.moveTo(...getPos(e)) }
  }
  const draw = (e) => {
    if (!drawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) { ctx.lineTo(...getPos(e)); ctx.stroke(); setHasSig(true) }
  }
  const endDraw = () => setDrawing(false)

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const touch = e.touches?.[0] ?? e
    return [touch.clientX - rect.left, touch.clientY - rect.top]
  }

  const clearSig = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) { ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height) }
    setHasSig(false)
  }

  const handleComplete = async () => {
    setLoading(true)
    setError(null)
    try {
      const sigData = hasSig ? canvasRef.current?.toDataURL('image/png') : null
      await inboundApi.complete(activeTicket.id, { sellerSignatureData: sigData })
      setDone(true)
      clearActiveTicket()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to complete ticket.')
    } finally {
      setLoading(false)
    }
  }

  const t = activeTicket

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
          <h3 className="text-2xl font-black text-[var(--color-text)]">Ticket Complete!</h3>
          <p className="text-[var(--color-text-muted)] mt-1">The ticket has been finalised and is fully SAPS compliant.</p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap no-print">
          <button
            onClick={() => window.print()}
            className="btn-ghost flex items-center gap-2"
            aria-label="Print receipt"
          >
            <Printer size={16} /> Print Receipt
          </button>
          <button
            onClick={() => navigate('/tickets/inbound')}
            className="btn-brand text-base px-8 py-3"
          >
            Back to Tickets
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-1">Review & Finalise</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Confirm all details are correct before completing the ticket.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Summary card */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Ticket #',    value: t?.ticketNumber },
          { label: 'Supplier',    value: t?.supplier?.fullName },
          { label: 'Site',        value: t?.site?.name },
          { label: 'Gross Wt',   value: t?.grossWeight ? formatWeight(t.grossWeight) : '—' },
          { label: 'Tare Wt',    value: t?.tareWeight  ? formatWeight(t.tareWeight)  : '—' },
          { label: 'Net Wt',     value: t?.netWeight   ? formatWeight(t.netWeight)   : '—' },
          { label: 'Total Price', value: t?.totalPrice ? formatCurrency(t.totalPrice) : '—' },
          { label: 'EFT Ref',    value: t?.paymentReference ?? '—' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--color-surface-2)] rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">{item.label}</p>
            <p className="font-bold text-[var(--color-text)] text-sm mt-0.5 break-all">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Line items */}
      {t?.lineItems?.length > 0 && (
        <div>
          <p className="text-sm font-bold text-[var(--color-text)] mb-2">Materials Graded</p>
          <div className="space-y-1">
            {t.lineItems.map((li) => (
              <div key={li.id} className="flex justify-between items-center px-4 py-2 rounded-xl bg-[var(--color-surface-2)] text-sm">
                <span className="font-semibold text-[var(--color-text)]">{li.materialCode} — {li.materialName}</span>
                <div className="text-right">
                  <span className="font-bold text-emerald-600">{formatWeight(li.netWeight)}</span>
                  <span className="text-[var(--color-text-muted)] ml-2">{formatCurrency(li.lineTotal)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR code */}
      {t?.ticketNumber && (
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <QRCodeSVG value={t.ticketNumber} size={120} />
            <p className="text-center text-xs font-bold text-gray-600 mt-2">{t.ticketNumber}</p>
          </div>
        </div>
      )}

      {/* Signature pad */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[var(--color-text)]">Seller Signature</p>
          <button type="button" onClick={clearSig} className="text-xs text-[var(--color-text-muted)] hover:text-red-500">
            Clear
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={560}
          height={160}
          className="w-full h-40 border-2 border-dashed border-[var(--color-border)] rounded-2xl
                     touch-none cursor-crosshair bg-white dark:bg-slate-800"
          style={{ touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={(e) => { e.preventDefault(); startDraw(e) }}
          onTouchMove={(e) => { e.preventDefault(); draw(e) }}
          onTouchEnd={endDraw}
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Sign above with finger or mouse. Signature is optional but recommended.
        </p>
      </div>

      {/* Compliance check */}
      {t?.compliance && (
        <div className="bg-[var(--color-surface-2)] rounded-2xl p-4 space-y-2">
          <p className="text-sm font-bold text-[var(--color-text)] mb-3">Compliance Status</p>
          {[
            { label: 'Seller photo',        ok: t.compliance.hasSellerPhoto },
            { label: 'Material load photo', ok: t.compliance.hasLoadPhoto },
            { label: 'ID document photo',   ok: t.compliance.hasIdPhoto },
            { label: 'Electronic payment',  ok: t.compliance.hasElectronicPaymentProof },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.ok
                ? <CheckCircle2 size={14} className="text-emerald-500" />
                : <AlertCircle  size={14} className="text-amber-500" />}
              <span className={item.ok ? 'text-[var(--color-text)]' : 'text-amber-600 font-semibold'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between pt-4 border-t border-[var(--color-border)]">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={handleComplete}
          disabled={loading}
          className="btn-brand flex items-center gap-2 px-8 py-3 text-base"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Finalising...</>
            : <><CheckCircle2 size={16} /> Complete Ticket</>}
        </button>
      </div>
    </div>
  )
}

// ─── Shared wizard navigation buttons ────────────────────
function WizardNav({ onBack, onNext, isSubmitting = false, nextDisabled = false, canBack = true }) {
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
          : <>Continue <ChevronRight size={16} /></>
        }
      </button>
    </div>
  )
}

// ─── Main Wizard Page ─────────────────────────────────────
export default function InboundTicketWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeTicket, activeStep, setActiveTicket, advanceStep } = useTicketStore()
  const [initialLoading, setInitialLoading] = useState(!!id)

  // If editing existing ticket, load it
  useEffect(() => {
    if (!id) return
    inboundApi.getById(id).then((res) => {
      setActiveTicket(res.data)
    }).catch(() => {
      navigate('/tickets/inbound')
    }).finally(() => {
      setInitialLoading(false)
    })
  }, [id, setActiveTicket, navigate])

  const goNext = () => advanceStep()
  const goBack = () => useTicketStore.setState((s) => ({
    activeStep: Math.max(s.activeStep - 1, 0),
  }))

  if (initialLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/tickets/inbound')}
        className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <ArrowLeft size={16} /> Back to Tickets
      </button>

      <div className="glass-card p-6 md:p-8">
        <StepBar currentStep={activeStep} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{    opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeStep === 0 && <StepSupplier onNext={goNext} ticketId={id} />}
            {activeStep === 1 && <StepGrossWeight onNext={goNext} onBack={goBack} />}
            {activeStep === 2 && <StepGrading    onNext={goNext} onBack={goBack} />}
            {activeStep === 3 && <StepPhotos     onNext={goNext} onBack={goBack} />}
            {activeStep === 4 && <StepPayment    onNext={goNext} onBack={goBack} />}
            {activeStep === 5 && <StepComplete   onBack={goBack} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
