import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Download, CheckCircle, Clock } from 'lucide-react'
import { suppliersApi, inboundApi } from '@/lib/api'
import { formatCurrency, formatWeight, formatDateTime, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, downloadBlob } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

function StatCard({ label, value, sub }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-2xl font-black text-[var(--color-text)]">{value}</p>
      {sub && <p className="text-xs font-semibold text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
      <p className="text-xs text-[var(--color-text-muted)] mt-1">{label}</p>
    </div>
  )
}

export default function SupplierDetailPage() {
  const { id } = useParams()
  const [supplier, setSupplier] = useState(null)
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      suppliersApi.getById(id),
      inboundApi.getAll({ supplierId: id, pageSize: 50 }).catch(() => ({ data: [] })),
    ]).then(([sRes, tRes]) => {
      setSupplier(sRes.data)
      setTickets(tRes.data ?? [])
    }).finally(() => setLoading(false))
  }, [id])

  const exportCsv = () => {
    const rows = [
      ['Ticket #', 'Date', 'Status', 'Net Weight (kg)', 'Total (ZAR)'].join(','),
      ...tickets.map((t) => [
        t.ticketNumber,
        formatDateTime(t.createdAt),
        TICKET_STATUS_LABELS[t.status] ?? t.status,
        t.netWeight ?? '',
        t.totalPrice ?? '',
      ].join(',')),
    ].join('\n')
    const blob = new Blob([rows], { type: 'text/csv' })
    downloadBlob(blob, `supplier-${supplier?.idNumber ?? id}-statement.csv`)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><RefreshCw size={24} className="animate-spin text-emerald-500" /></div>
  }

  if (!supplier) {
    return (
      <div className="text-center py-20">
        <p className="font-bold text-[var(--color-text)]">Supplier not found</p>
        <Link to="/suppliers" className="btn-brand mt-4">Back to Suppliers</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to="/suppliers"
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <ArrowLeft size={16} /> Suppliers
        </Link>
        <span className="text-[var(--color-border)]">/</span>
        <span className="text-sm font-semibold text-[var(--color-text)]">{supplier.fullName}</span>
      </div>

      {/* Header card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl
                            flex items-center justify-center text-emerald-700 dark:text-emerald-400
                            text-xl font-black flex-shrink-0">
              {supplier.fullName?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--color-text)]">{supplier.fullName}</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                {supplier.idType} · {supplier.idNumber}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`status-pill text-xs ${supplier.isVerified
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {supplier.isVerified ? <><CheckCircle size={10} /> Verified</> : <><Clock size={10} /> Unverified</>}
                </span>
                {supplier.isWastePicker && (
                  <span className="status-pill text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    Waste Picker
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={exportCsv} className="btn-ghost text-sm flex items-center gap-2 self-start">
            <Download size={14} /> Export Statement
          </button>
        </div>

        {/* Contact details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-[var(--color-border)]">
          {[
            { label: 'Contact',  value: supplier.contactNumber ?? '—' },
            { label: 'Email',    value: supplier.email ?? '—' },
            { label: 'Vehicle',  value: supplier.vehicleRegistration ?? '—' },
            { label: 'Bank',     value: supplier.bankName ?? '—' },
          ].map((r) => (
            <div key={r.label}>
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">{r.label}</p>
              <p className="font-semibold text-[var(--color-text)] text-sm mt-0.5">{r.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Tickets"      value={supplier.totalTickets} />
        <StatCard label="Total Weight"       value={formatWeight(supplier.totalWeight)} />
        <StatCard label="Total Value"        value={formatCurrency(supplier.totalValue)} />
      </div>

      {/* Ticket history */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
          <CardTitle>Ticket History</CardTitle>
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">{tickets.length} tickets</span>
        </CardHeader>

        {tickets.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <p className="font-medium">No tickets yet for this supplier.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  <th className="text-left px-5 py-2.5">Ticket #</th>
                  <th className="text-left px-5 py-2.5">Status</th>
                  <th className="text-right px-5 py-2.5">Net Weight</th>
                  <th className="text-right px-5 py-2.5">Total</th>
                  <th className="text-left px-5 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className="px-5 py-3 font-bold text-emerald-600">
                      <Link to={`/tickets/inbound/${t.id}`} className="hover:underline">{t.ticketNumber}</Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`status-pill ${TICKET_STATUS_COLORS[t.status]}`}>
                        {TICKET_STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                      {t.netWeight != null ? formatWeight(t.netWeight) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[var(--color-text)]">
                      {t.totalPrice > 0 ? formatCurrency(t.totalPrice) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--color-text-muted)]">
                      {formatDateTime(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
