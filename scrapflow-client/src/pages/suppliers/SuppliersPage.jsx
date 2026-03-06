import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Search, RefreshCw, Users, ChevronRight, UserPlus, Loader2, AlertCircle } from 'lucide-react'
import { suppliersApi } from '@/lib/api'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency, formatWeight } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import { TableSkeleton } from '@/components/ui/Skeleton'

const ID_TYPES = [
  { value: '0', label: 'SA ID' },
  { value: '1', label: 'Passport' },
  { value: '2', label: 'Company Reg.' },
  { value: '3', label: 'Asylum Permit' },
]

function NewSupplierModal({ open, onClose, onCreated }) {
  const { toast } = useUiStore()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { idType: '0' },
  })
  const [serverError, setServerError] = useState(null)

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const res = await suppliersApi.create({
        fullName:            data.fullName,
        idNumber:            data.idNumber,
        idType:              parseInt(data.idType, 10),
        contactNumber:       data.contactNumber || null,
        email:               data.email || null,
        vehicleRegistration: data.vehicleReg || null,
        bankName:            data.bankName || null,
        accountNumber:       data.accountNumber || null,
        branchCode:          null,
        address:             null,
        isWastePicker:       false,
        wastePickerArea:     null,
      })
      toast('Supplier created successfully', 'success')
      reset()
      onCreated(res.data)
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Failed to create supplier.')
    }
  }

  return (
    <Modal open={open} onOpenChange={onClose} title="Add New Supplier" size="md">
      {serverError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20
                        border border-red-200 dark:border-red-800 mb-4">
          <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Full Name *</label>
            <input
              className="sf-input"
              placeholder="Thabo Molefe"
              {...register('fullName', { required: 'Full name is required' })}
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">ID Type *</label>
            <select className="sf-input" {...register('idType', { required: true })}>
              {ID_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">ID Number *</label>
            <input
              className="sf-input"
              placeholder="8801015009087"
              {...register('idNumber', { required: 'ID number is required' })}
            />
            {errors.idNumber && <p className="text-xs text-red-500 mt-1">{errors.idNumber.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Contact Number</label>
            <input className="sf-input" placeholder="082 000 0000" {...register('contactNumber')} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Vehicle Reg.</label>
            <input className="sf-input" placeholder="ABC 123 GP" {...register('vehicleReg')} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Bank Name</label>
            <input className="sf-input" placeholder="FNB" {...register('bankName')} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Account Number</label>
            <input className="sf-input" {...register('accountNumber')} />
          </div>
        </div>

        <ModalFooter>
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-brand text-sm flex items-center gap-2">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {isSubmitting ? 'Saving...' : 'Save Supplier'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [showNew, setShowNew]     = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await suppliersApi.getAll(debounced || undefined)
      setSuppliers(res.data ?? [])
    } catch {
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [debounced])

  useEffect(() => { load() }, [load])

  const handleCreated = (supplier) => {
    setSuppliers((prev) => [supplier, ...prev])
    setShowNew(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight">Suppliers</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="btn-brand self-start flex items-center gap-2"
        >
          <UserPlus size={16} /> New Supplier
        </button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, ID number, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sf-input pl-9"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : suppliers.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users size={36} className="mx-auto text-[var(--color-text-muted)]" />
            <p className="font-bold text-[var(--color-text)]">
              {search ? 'No suppliers match your search' : 'No suppliers yet'}
            </p>
            <button onClick={() => setShowNew(true)} className="btn-brand text-sm">
              <UserPlus size={15} /> Add First Supplier
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Supplier</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">ID / Type</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Contact</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Tickets</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Total Weight</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Total Value</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-full
                                          flex items-center justify-center text-emerald-700 dark:text-emerald-400
                                          text-sm font-black flex-shrink-0">
                            {s.fullName?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--color-text)]">{s.fullName}</p>
                            {s.vehicleRegistration && (
                              <p className="text-xs text-[var(--color-text-muted)]">{s.vehicleRegistration}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-[var(--color-text)]">{s.idNumber}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{s.idType}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-text-muted)]">
                        {s.contactNumber ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[var(--color-text)]">
                        {s.totalTickets}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[var(--color-text)]">
                        {formatWeight(s.totalWeight)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[var(--color-text)]">
                        {formatCurrency(s.totalValue)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`status-pill text-xs ${s.isVerified
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {s.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <Link to={`/suppliers/${s.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg
                                     text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                                     hover:bg-[var(--color-surface-2)] transition-colors">
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {suppliers.map((s) => (
                <Link key={s.id} to={`/suppliers/${s.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--color-surface-2)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center
                                    text-emerald-700 dark:text-emerald-400 font-black text-sm flex-shrink-0">
                      {s.fullName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{s.fullName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{s.idNumber} · {s.totalTickets} tickets</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--color-text)]">{formatCurrency(s.totalValue)}</p>
                    <ChevronRight size={16} className="text-[var(--color-text-muted)] mt-1 ml-auto" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>

      <NewSupplierModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
