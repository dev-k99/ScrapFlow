import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Shield, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { auditApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'

const ENTITY_TYPES = ['All', 'InboundTicket', 'OutboundTicket', 'InventoryLot', 'Supplier']

const ACTION_STYLES = {
  Created:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  Modified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Deleted:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-[var(--color-surface-2)]" />
      ))}
    </div>
  )
}

export default function AuditPage() {
  const { hasRole } = useAuthStore()
  const { toast } = useUiStore()

  if (!hasRole('Owner', 'Manager')) return <Navigate to="/dashboard" replace />

  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [entityFilter, setEntityFilter] = useState('All')
  const [userSearch, setUserSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        pageSize,
        ...(entityFilter !== 'All' && { entityName: entityFilter }),
        ...(userSearch.trim() && { userId: userSearch.trim() }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      }
      const res = await auditApi.getAll(params)
      setLogs(res.data.items ?? [])
      setTotal(res.data.totalCount ?? 0)
    } catch {
      toast('Failed to load audit logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, entityFilter, userSearch, dateFrom, dateTo, toast])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [entityFilter, userSearch, dateFrom, dateTo])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Shield size={18} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Audit Log</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Track every data change across the system</p>
        </div>
        <span className="ml-auto text-xs text-[var(--color-text-muted)] font-medium">
          {total} records
        </span>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        {/* Entity type */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="sf-input text-sm h-9 py-0 pr-8 min-w-[160px]"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'All' ? 'All Entities' : t}</option>
          ))}
        </select>

        {/* User search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by username…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="sf-input text-sm h-9 py-0 pl-8 w-full"
          />
        </div>

        {/* Date range */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="sf-input text-sm h-9 py-0"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="sf-input text-sm h-9 py-0"
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            <Shield size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No audit records found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Changes</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {logs.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className="hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'medium' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                          <span className="text-xs">{log.entityName}</span>
                          <span className="block text-[10px] text-[var(--color-text-muted)] font-mono truncate max-w-[120px]">
                            {log.entityId?.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_STYLES[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--color-text)]">{log.userName ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] max-w-xs truncate">{log.changes ?? '—'}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">
                          {expandedId === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expandedId === log.id && (
                        <tr key={`${log.id}-detail`} className="bg-[var(--color-surface-2)]">
                          <td colSpan={6} className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                            <div className="flex flex-wrap gap-4">
                              <div>
                                <span className="font-semibold text-[var(--color-text)]">Full ID:</span>{' '}
                                <span className="font-mono">{log.entityId}</span>
                              </div>
                              {log.ipAddress && (
                                <div>
                                  <span className="font-semibold text-[var(--color-text)]">IP:</span>{' '}
                                  {log.ipAddress}
                                </div>
                              )}
                              {log.changes && (
                                <div className="w-full">
                                  <span className="font-semibold text-[var(--color-text)]">Changes:</span>{' '}
                                  {log.changes}
                                </div>
                              )}
                            </div>
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
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_STYLES[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {new Date(log.timestamp).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{log.entityName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">by {log.userName ?? 'system'}</p>
                  {log.changes && <p className="text-xs text-[var(--color-text-muted)] truncate">{log.changes}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
