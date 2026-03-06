import { useEffect, useState, useCallback } from 'react'
import { Package, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react'
import { inventoryApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useSignalR } from '@/hooks/useSignalR'
import Modal, { ModalFooter } from '@/components/ui/Modal'

const LOT_STATUS_COLORS = {
  InStock:             'status-pill bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300',
  PartiallyAllocated:  'status-pill bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300',
  Allocated:           'status-pill bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Sold:                'status-pill bg-gray-100   text-gray-600   dark:bg-gray-700      dark:text-gray-400',
  WrittenOff:          'status-pill bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
}

const CATEGORY_COLORS = {
  Ferrous:    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  NonFerrous: 'bg-cyan-100   text-cyan-800   dark:bg-cyan-900/30   dark:text-cyan-300',
  Precious:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Electronic: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
}

const STATUSES = ['All', 'InStock', 'PartiallyAllocated', 'Sold', 'WrittenOff']

function fmt(num, decimals = 0) {
  if (num == null) return '—'
  return Number(num).toLocaleString('en-ZA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ---------- Adjust Modal ----------
function AdjustModal({ lot, open, onClose, onSaved }) {
  const toast = useUiStore((s) => s.toast)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setQty(lot?.quantity ?? ''); setReason('') }
  }, [open, lot])

  async function handleSubmit(e) {
    e.preventDefault()
    const newQty = parseFloat(qty)
    if (isNaN(newQty) || newQty < 0) { toast('Enter a valid non-negative quantity', 'error'); return }
    if (!reason.trim()) { toast('Reason is required', 'error'); return }
    setSaving(true)
    try {
      const res = await inventoryApi.adjustLot(lot.id, { newQuantity: newQty, reason: reason.trim() })
      onSaved(res.data)
      toast('Lot quantity adjusted', 'success')
      onClose()
    } catch (err) {
      toast(err.response?.data?.message ?? err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onClose} title="Adjust Lot Quantity"
      description={`Lot: ${lot?.lotNumber} — Current: ${fmt(lot?.quantity)} kg`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="adj-qty" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            New Quantity (kg)
          </label>
          <input
            id="adj-qty"
            type="number"
            min="0"
            step="0.01"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="sf-input w-full"
            aria-label="New quantity in kilograms"
          />
        </div>
        <div>
          <label htmlFor="adj-reason" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="adj-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="sf-input w-full resize-none"
            placeholder="e.g. Stock recount, measurement error…"
            aria-label="Reason for adjustment"
          />
        </div>
        <ModalFooter>
          <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button type="submit" className="btn-brand" disabled={saving}>
            {saving ? 'Saving…' : 'Save Adjustment'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ---------- Write-Off Modal ----------
function WriteOffModal({ lot, open, onClose, onSaved }) {
  const toast = useUiStore((s) => s.toast)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setReason('') }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!reason.trim()) { toast('Reason is required', 'error'); return }
    setSaving(true)
    try {
      const res = await inventoryApi.writeOff(lot.id, { reason: reason.trim() })
      onSaved(res.data)
      toast('Lot written off', 'success')
      onClose()
    } catch (err) {
      toast(err.response?.data?.message ?? err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onClose} title="Write Off Lot"
      description={`Lot: ${lot?.lotNumber} — This will zero the quantity and mark it as Written Off.`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">
            This action cannot be undone. The lot will be permanently written off.
          </p>
        </div>
        <div>
          <label htmlFor="wo-reason" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="wo-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="sf-input w-full resize-none"
            placeholder="e.g. Contamination, theft, damage…"
            aria-label="Reason for write-off"
          />
        </div>
        <ModalFooter>
          <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button type="submit"
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
            disabled={saving}>
            {saving ? 'Processing…' : 'Write Off'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ---------- Lot Detail Modal ----------
function LotDrawer({ lot, open, onClose, isAdmin, onAdjust, onWriteOff }) {
  if (!lot) return null
  const canAction = isAdmin && lot.status !== 'WrittenOff'

  return (
    <Modal open={open} onOpenChange={onClose} title={`Lot ${lot.lotNumber}`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className={LOT_STATUS_COLORS[lot.status] ?? 'status-pill'}>{lot.status}</span>
          <span className={`status-pill ${CATEGORY_COLORS[lot.category] ?? 'bg-gray-100 text-gray-700'}`}>
            {lot.category}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ['Material',         `${lot.materialCode} — ${lot.materialName}`],
            ['Site',             lot.siteName],
            ['Current Qty',      `${fmt(lot.quantity, 2)} kg`],
            ['Original Qty',     `${fmt(lot.originalQuantity, 2)} kg`],
            ['Avg Buy Price',    `R ${fmt(lot.weightedAvgCost, 2)}/t`],
            ['Today Sell Price', `R ${fmt(lot.todaySellPrice, 2)}/t`],
            ['Est. Value',       `R ${fmt(lot.estimatedValue, 2)}`],
            ['Location',         lot.location || '—'],
            ['Received',         lot.receivedDate ? new Date(lot.receivedDate).toLocaleDateString('en-ZA') : '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[var(--color-text-muted)] font-medium">{label}</p>
              <p className="text-[var(--color-text)] mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {lot.notes && (
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Notes</p>
            <p className="text-sm text-[var(--color-text)] bg-[var(--color-surface-2)] rounded-lg px-3 py-2">
              {lot.notes}
            </p>
          </div>
        )}

        {canAction && (
          <div className="flex gap-3 pt-2">
            <button onClick={onAdjust} className="btn-brand flex-1" aria-label="Adjust lot quantity">
              Adjust Quantity
            </button>
            <button
              onClick={onWriteOff}
              className="flex-1 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold
                         hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              aria-label="Write off this lot"
            >
              Write Off
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ---------- Main Page ----------
export default function InventoryPage() {
  const user    = useAuthStore((s) => s.user)
  const hasRole = useAuthStore((s) => s.hasRole)
  const toast   = useUiStore((s) => s.toast)
  const isAdmin = hasRole('Owner', 'Manager')

  const [lots,         setLots]         = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [status,       setStatus]       = useState('All')
  const [loading,      setLoading]      = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [adjustOpen,   setAdjustOpen]   = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)

  const siteId = user?.siteId ?? null

  const load = useCallback(async (pg = 1, st = status) => {
    setLoading(true)
    try {
      const params = { page: pg, pageSize: 50 }
      if (siteId) params.siteId = siteId
      if (st !== 'All') params.status = st
      const res  = await inventoryApi.getLots(params)
      const data = res.data
      setLots(Array.isArray(data) ? data : (data?.items ?? []))
      setTotal(data?.totalCount ?? (Array.isArray(data) ? data.length : 0))
      setPage(pg)
    } catch (err) {
      toast(err.response?.data?.message ?? 'Failed to load inventory', 'error')
    } finally {
      setLoading(false)
    }
  }, [siteId, status, toast])

  useEffect(() => { load(1, status) }, [status])

  const onInventoryUpdated = useCallback(() => load(page, status), [page, status, load])
  useSignalR({ siteId, onInventoryUpdated })

  const inStockLots = lots.filter((l) => l.status === 'InStock' || l.status === 'PartiallyAllocated')
  const totalWeight = inStockLots.reduce((s, l) => s + (l.quantity ?? 0), 0)
  const totalValue  = inStockLots.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

  function openDrawer(lot) { setSelected(lot); setDrawerOpen(true) }

  function handleLotUpdate(updated) {
    setLots((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    setSelected(updated)
  }

  const pageCount = Math.ceil(total / 50)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Inventory</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {total} lot{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <button onClick={() => load(1, status)} disabled={loading}
          className="btn-ghost flex items-center gap-2" aria-label="Refresh inventory">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Summary bar */}
      <div className="glass-card p-3 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Available Stock</p>
          <p className="text-lg font-bold text-[var(--color-text)]">{fmt(totalWeight, 0)} kg</p>
        </div>
        <div className="w-px bg-[var(--color-border)] hidden sm:block" />
        <div>
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
            Est. Value (Today Prices)
          </p>
          <p className="text-lg font-bold text-[var(--color-text)]">R {fmt(totalValue, 2)}</p>
        </div>
        <div className="w-px bg-[var(--color-border)] hidden sm:block" />
        <div>
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Lots on Page</p>
          <p className="text-lg font-bold text-[var(--color-text)]">{lots.length}</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s
                ? 'gradient-brand text-white shadow-sm'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}>
            {s === 'All' ? 'All Lots' : s.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>

      {/* Table — desktop */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Inventory lots">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-semibold
                             text-[var(--color-text-muted)] uppercase tracking-wide">
                <th className="px-4 py-3">Lot #</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3 text-right">Qty (kg)</th>
                <th className="px-4 py-3 text-right">Avg Buy</th>
                <th className="px-4 py-3 text-right">Est. Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading && lots.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[var(--color-text-muted)]">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading…
                  </td>
                </tr>
              )}
              {!loading && lots.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[var(--color-text-muted)]">
                    <Package size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No inventory lots found</p>
                    <p className="text-xs mt-1">Complete inbound tickets to create inventory lots</p>
                  </td>
                </tr>
              )}
              {lots.map((lot) => (
                <tr key={lot.id} onClick={() => openDrawer(lot)}
                  className="cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors"
                  tabIndex={0} aria-label={`Open details for lot ${lot.lotNumber}`}
                  onKeyDown={(e) => e.key === 'Enter' && openDrawer(lot)}>
                  <td className="px-4 py-3 font-mono font-semibold text-[var(--color-text)]">{lot.lotNumber}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">
                    <span className="font-medium">{lot.materialCode}</span>
                    <span className="text-[var(--color-text-muted)] ml-1 hidden xl:inline">{lot.materialName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`status-pill text-xs ${CATEGORY_COLORS[lot.category] ?? 'bg-gray-100 text-gray-700'}`}>
                      {lot.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{lot.siteName}</td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--color-text)]">
                    {fmt(lot.quantity, 2)}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--color-text-muted)]">
                    R {fmt(lot.weightedAvgCost, 2)}/t
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--color-text)]">
                    R {fmt(lot.estimatedValue, 2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={LOT_STATUS_COLORS[lot.status] ?? 'status-pill'}>{lot.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                    {lot.receivedDate ? new Date(lot.receivedDate).toLocaleDateString('en-ZA') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards — mobile */}
      <div className="space-y-3 md:hidden">
        {loading && lots.length === 0 && (
          <div className="glass-card p-8 text-center text-[var(--color-text-muted)]">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />Loading…
          </div>
        )}
        {!loading && lots.length === 0 && (
          <div className="glass-card p-12 text-center text-[var(--color-text-muted)]">
            <Package size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No inventory lots found</p>
          </div>
        )}
        {lots.map((lot) => (
          <button key={lot.id} onClick={() => openDrawer(lot)}
            className="glass-card p-4 w-full text-left space-y-2 hover:ring-1
                       hover:ring-[var(--color-brand)] transition-all"
            aria-label={`Open details for lot ${lot.lotNumber}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[var(--color-text)]">{lot.lotNumber}</span>
              <span className={LOT_STATUS_COLORS[lot.status] ?? 'status-pill'}>{lot.status}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-[var(--color-text)]">{lot.materialCode}</span>
              <span className={`status-pill text-xs ${CATEGORY_COLORS[lot.category] ?? 'bg-gray-100 text-gray-700'}`}>
                {lot.category}
              </span>
            </div>
            <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
              <span>{fmt(lot.quantity, 2)} kg</span>
              <span className="font-medium text-[var(--color-text)]">R {fmt(lot.estimatedValue, 2)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => load(page - 1, status)} disabled={page <= 1 || loading}
            className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40" aria-label="Previous page">
            ← Prev
          </button>
          <span className="text-sm text-[var(--color-text-muted)]">Page {page} of {pageCount}</span>
          <button onClick={() => load(page + 1, status)} disabled={page >= pageCount || loading}
            className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40" aria-label="Next page">
            Next →
          </button>
        </div>
      )}

      {/* Modals */}
      <LotDrawer lot={selected} open={drawerOpen} onClose={() => setDrawerOpen(false)}
        isAdmin={isAdmin}
        onAdjust={() => { setDrawerOpen(false); setAdjustOpen(true) }}
        onWriteOff={() => { setDrawerOpen(false); setWriteOffOpen(true) }} />

      <AdjustModal lot={selected} open={adjustOpen} onClose={() => setAdjustOpen(false)}
        onSaved={(updated) => { handleLotUpdate(updated); setDrawerOpen(true) }} />

      <WriteOffModal lot={selected} open={writeOffOpen} onClose={() => setWriteOffOpen(false)}
        onSaved={(updated) => { handleLotUpdate(updated); setDrawerOpen(true) }} />
    </div>
  )
}
