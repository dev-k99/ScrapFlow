import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, RefreshCw, ChevronRight } from 'lucide-react'
import { inboundApi } from '@/lib/api'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency, formatWeight, formatDateTime, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

const STATUS_FILTERS = ['All', 'Created', 'GrossWeighed', 'Graded', 'TareWeighed', 'PaymentRecorded', 'Completed', 'Cancelled']

export default function InboundTicketsPage() {
  const { selectedSiteId } = useUiStore()
  const [tickets, setTickets]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage]               = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        siteId: selectedSiteId || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        page,
        pageSize: 25,
      }
      const res = await inboundApi.getAll(params)
      setTickets(res.data?.items ?? [])
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [selectedSiteId, statusFilter, page])

  useEffect(() => { load() }, [load])

  const filtered = tickets.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.ticketNumber?.toLowerCase().includes(q) ||
      t.supplier?.fullName?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight">Inbound Tickets</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link to="/tickets/inbound/new" className="btn-brand self-start flex items-center gap-2">
          <Plus size={16} /> New Ticket
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by ticket number or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sf-input pl-9"
            />
          </div>

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                  ${statusFilter === s
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
              >
                {s === 'All' ? 'All' : TICKET_STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>

          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm self-start md:self-auto">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--color-text-muted)] font-medium mb-3">No tickets found</p>
            <Link to="/tickets/inbound/new" className="btn-brand text-sm">
              <Plus size={15} /> Create First Ticket
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-5 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Ticket #</th>
                    <th className="text-left px-5 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Supplier</th>
                    <th className="text-left px-5 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Net Weight</th>
                    <th className="text-right px-5 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Total</th>
                    <th className="text-left px-5 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Created</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-emerald-600">{t.ticketNumber}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[var(--color-text)]">{t.supplier?.fullName ?? '—'}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{t.supplier?.idNumber ?? ''}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`status-pill ${TICKET_STATUS_COLORS[t.status]}`}>
                          {TICKET_STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[var(--color-text)]">
                        {t.netWeight != null ? formatWeight(t.netWeight) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[var(--color-text)]">
                        {t.totalPrice > 0 ? formatCurrency(t.totalPrice) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-text-muted)] text-xs">
                        {formatDateTime(t.createdAt)}
                      </td>
                      <td className="px-3 py-3.5">
                        <Link to={`/tickets/inbound/${t.id}`}
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

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {filtered.map((t) => (
                <Link key={t.id} to={`/tickets/inbound/${t.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--color-surface-2)] transition-colors">
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-600 text-sm">{t.ticketNumber}</p>
                    <p className="font-semibold text-[var(--color-text)] text-sm">{t.supplier?.fullName ?? '—'}</p>
                    <span className={`status-pill text-xs ${TICKET_STATUS_COLORS[t.status]}`}>
                      {TICKET_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-[var(--color-text)] text-sm">
                      {t.totalPrice > 0 ? formatCurrency(t.totalPrice) : '—'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t.netWeight != null ? formatWeight(t.netWeight) : '—'}
                    </p>
                    <ChevronRight size={16} className="text-[var(--color-text-muted)] ml-auto" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
