import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Pencil, Save, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { materialsApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'

function MarginIcon({ pct }) {
  if (pct >= 20) return <TrendingUp size={14} className="text-emerald-500" />
  if (pct >= 5)  return <Minus       size={14} className="text-amber-500" />
  return               <TrendingDown size={14} className="text-red-500" />
}

function MarginBadge({ pct }) {
  const color = pct >= 20 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30'
    : pct >= 5  ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
    : 'text-red-600 bg-red-50 dark:bg-red-900/30'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      <MarginIcon pct={pct} /> {pct?.toFixed(1)}%
    </span>
  )
}

export default function MaterialsPage() {
  const { hasRole } = useAuthStore()
  const { toast } = useUiStore()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState({})     // id → { buyPrice, sellPrice }
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const canEdit = hasRole('Owner', 'Manager')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await materialsApi.getAll()
      setMaterials(res.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Group by category
  const byCategory = materials.reduce((acc, m) => {
    const cat = m.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(m)
    return acc
  }, {})

  const startEdit = (m) => {
    setEditingId(m.id)
    setEdits((prev) => ({
      ...prev,
      [m.id]: { buyPrice: m.todayBuyPrice, sellPrice: m.todaySellPrice },
    }))
  }

  const cancelEdit = () => setEditingId(null)

  const savePrice = async (materialId) => {
    setSaving(true)
    try {
      const e = edits[materialId]
      await materialsApi.updateDailyPrices([{
        materialGradeId: materialId,
        buyPricePerTon:  parseFloat(e.buyPrice),
        sellPricePerTon: parseFloat(e.sellPrice),
        notes: null,
      }])
      toast('Prices updated successfully', 'success')
      setEditingId(null)
      await load()
    } catch (err) {
      toast(err.response?.data?.message ?? 'Failed to update prices', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <TableSkeleton rows={10} cols={6} />

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight">Materials & Pricing</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Today's buy/sell prices per material grade
            {canEdit && <span className="text-emerald-600"> · Click <Pencil size={11} className="inline" /> to edit</span>}
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-sm flex items-center gap-2 self-start">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {Object.entries(byCategory).map(([category, items]) => (
        <Card key={category} className="p-0 overflow-hidden">
          <CardHeader className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
            <CardTitle>{category}</CardTitle>
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">{items.length} grades</span>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  <th className="text-left px-5 py-2.5">Code</th>
                  <th className="text-left px-5 py-2.5">Name</th>
                  <th className="text-right px-5 py-2.5">Buy Price / t</th>
                  <th className="text-right px-5 py-2.5">Sell Price / t</th>
                  <th className="text-right px-5 py-2.5">Margin</th>
                  {canEdit && <th className="w-20 px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((m) => {
                  const isEditing = editingId === m.id
                  const edit = edits[m.id]
                  return (
                    <tr key={m.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-emerald-600">{m.code}</td>
                      <td className="px-5 py-3 font-semibold text-[var(--color-text)]">{m.name}</td>

                      {/* Buy price */}
                      <td className="px-5 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number" step="10" min="0"
                            value={edit?.buyPrice ?? ''}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [m.id]: { ...prev[m.id], buyPrice: e.target.value } }))}
                            className="sf-input text-right w-28 py-1.5 text-xs"
                          />
                        ) : (
                          <span className="font-semibold text-[var(--color-text)]">{formatCurrency(m.todayBuyPrice)}</span>
                        )}
                      </td>

                      {/* Sell price */}
                      <td className="px-5 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number" step="10" min="0"
                            value={edit?.sellPrice ?? ''}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [m.id]: { ...prev[m.id], sellPrice: e.target.value } }))}
                            className="sf-input text-right w-28 py-1.5 text-xs"
                          />
                        ) : (
                          <span className="font-semibold text-[var(--color-text)]">{formatCurrency(m.todaySellPrice)}</span>
                        )}
                      </td>

                      {/* Margin */}
                      <td className="px-5 py-3 text-right">
                        <MarginBadge pct={m.marginPercent} />
                      </td>

                      {/* Edit actions */}
                      {canEdit && (
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => savePrice(m.id)}
                                disabled={saving}
                                className="w-7 h-7 flex items-center justify-center rounded-lg
                                           text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                              >
                                {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={13} />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="w-7 h-7 flex items-center justify-center rounded-lg
                                           text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(m)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg
                                         text-[var(--color-text-muted)] hover:text-emerald-600
                                         hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}
