import { useState, useEffect, useCallback } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Users, ShoppingBag, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { outboundApi } from '@/lib/api'
import { useUiStore } from '@/store/uiStore'
import SuppliersPage from '../suppliers/SuppliersPage'

const STATUS_STYLES = {
  Completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  Created:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  GrossWeighed:'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  Graded:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  TareWeighed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  Cancelled:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

function RowSkeleton() {
  return (
    <div className="space-y-2 animate-pulse p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-[var(--color-surface-2)]" />
      ))}
    </div>
  )
}

function BuyerPortal() {
  const { toast } = useUiStore()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await outboundApi.getAll({ page, pageSize })
      setTickets(res.data.items ?? [])
      setTotal(res.data.totalCount ?? 0)
    } catch {
      toast('Failed to load outbound tickets', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, toast])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const filtered = search.trim()
    ? tickets.filter((t) =>
        t.customer?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
        t.ticketNumber?.toLowerCase().includes(search.toLowerCase())
      )
    : tickets

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Search customer or ticket…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sf-input text-sm h-9 py-0 pl-8 w-full"
        />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <RowSkeleton />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No outbound tickets found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Ticket #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Site</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Net Weight</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Total (ZAR)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filtered.map((t) => (
                    <>
                      <tr
                        key={t.id}
                        className="hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      >
                        <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                          {t.completedAt
                            ? new Date(t.completedAt).toLocaleDateString('en-ZA')
                            : new Date(t.createdAt).toLocaleDateString('en-ZA')}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--color-text)]">{t.ticketNumber}</td>
                        <td className="px-4 py-3 text-[var(--color-text)]">{t.customer?.companyName ?? '—'}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{t.site?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-[var(--color-text)]">
                          {t.netWeight != null ? `${(t.netWeight / 1000).toFixed(3)} t` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--color-text)]">
                          {t.totalPrice > 0 ? `R ${t.totalPrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">
                          {expandedId === t.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expandedId === t.id && t.lineItems?.length > 0 && (
                        <tr key={`${t.id}-detail`} className="bg-[var(--color-surface-2)]">
                          <td colSpan={8} className="px-6 py-3">
                            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                              Line Items
                            </p>
                            <div className="space-y-1.5">
                              {t.lineItems.map((li) => (
                                <div key={li.id} className="flex justify-between text-xs text-[var(--color-text)]">
                                  <span className="font-medium">{li.materialName || li.materialCode}</span>
                                  <span className="text-[var(--color-text-muted)]">
                                    {(li.netWeight / 1000).toFixed(3)} t × R{li.pricePerTon?.toLocaleString('en-ZA')} ={' '}
                                    <strong>R{li.lineTotal?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</strong>
                                  </span>
                                </div>
                              ))}
                            </div>
                            {t.invoiceNumber && (
                              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                Invoice: <span className="font-semibold text-[var(--color-text)]">{t.invoiceNumber}</span>
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="p-4 space-y-2 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[var(--color-text)]">{t.ticketNumber}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[t.status] ?? ''}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-[var(--color-text)]">{t.customer?.companyName ?? '—'}</p>
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                    <span>{t.netWeight != null ? `${(t.netWeight / 1000).toFixed(3)} t` : '—'}</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {t.totalPrice > 0 ? `R ${t.totalPrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  </div>
                  {expandedId === t.id && t.lineItems?.length > 0 && (
                    <div className="pt-2 space-y-1 border-t border-[var(--color-border)]">
                      {t.lineItems.map((li) => (
                        <div key={li.id} className="flex justify-between text-xs text-[var(--color-text-muted)]">
                          <span>{li.materialName || li.materialCode}</span>
                          <span>R{li.lineTotal?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">
              Previous
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PortalsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight">Portals</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Self-service views for suppliers and buyers</p>
      </div>

      <Tabs.Root defaultValue="supplier">
        <Tabs.List className="flex gap-1 p-1 bg-[var(--color-surface-2)] rounded-2xl w-fit mb-5">
          {[
            { value: 'supplier', icon: Users, label: 'Supplier Portal' },
            { value: 'buyer',    icon: ShoppingBag, label: 'Buyer Portal' },
          ].map(({ value, icon: Icon, label }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                         text-[var(--color-text-muted)]
                         data-[state=active]:bg-[var(--color-surface)]
                         data-[state=active]:text-[var(--color-text)]
                         data-[state=active]:shadow-sm"
            >
              <Icon size={15} /> {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="supplier">
          <SuppliersPage />
        </Tabs.Content>

        <Tabs.Content value="buyer">
          <BuyerPortal />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
