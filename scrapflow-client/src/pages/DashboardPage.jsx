import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  TrendingUp, Package, AlertTriangle, Activity,
  ArrowUpRight, ArrowDownRight, RefreshCw, Users
} from 'lucide-react'
import { dashboardApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useSignalR } from '@/hooks/useSignalR'
import { formatCurrency, formatTons } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton'

const RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
]

function StatCard({ title, value, subtext, icon: Icon, trend, trendValue, color }) {
  return (
    <Card className="flex-1">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">{title}</p>
          <h3 className="text-2xl font-black text-[var(--color-text)] tabular-nums">{value}</h3>
          {subtext && <p className="text-xs text-[var(--color-text-muted)] mt-1">{subtext}</p>}
        </div>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ml-3 ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          {trend === 'up'
            ? <ArrowUpRight size={14} className="text-emerald-500" />
            : <ArrowDownRight size={14} className="text-red-500" />}
          <span className={`text-xs font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
            {trendValue}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wider">vs last week</span>
        </div>
      )}
    </Card>
  )
}

const GRADE_COLORS = ['#10B981', '#059669', '#3B82F6', '#60A5FA', '#8B5CF6', '#A78BFA', '#F59E0B']

function marginColor(pct) {
  if (pct >= 30) return '#10B981'
  if (pct >= 15) return '#F59E0B'
  return '#EF4444'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-sm shadow-xl">
      <p className="font-bold mb-1 text-[var(--color-text)]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatTons(p.value * 1000)}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { selectedSiteId } = useUiStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [range, setRange] = useState('7d')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dashboardApi.get(selectedSiteId, range)
      setData(res.data)
    } catch {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [selectedSiteId, range])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  useSignalR({
    siteId: selectedSiteId,
    onTicketCompleted: () => loadDashboard(),
    onInventoryUpdated: () => loadDashboard(),
  })

  if (loading) {
    return (
      <div className="space-y-5">
        <StatCardSkeleton />
        <ChartSkeleton height="h-72" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={28} className="text-amber-500" />
        <p className="text-sm text-[var(--color-text-muted)]">{error ?? 'No data available.'}</p>
        <button onClick={loadDashboard} className="btn-brand text-sm">Retry</button>
      </div>
    )
  }

  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? ''

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight">
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()}, {user?.fullName?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Here's your yard at a glance today.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {/* Range tabs */}
          <div className="flex gap-0.5 p-0.5 bg-[var(--color-surface-2)] rounded-xl">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r.value
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={loadDashboard} className="btn-ghost text-sm flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI cards — 5 cards: 2 cols mobile, 5 cols xl */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Today In"
          value={formatTons(data.todayTonnageIn * 1000)}
          subtext={`${formatTons(data.weekTonnageIn * 1000)} this week`}
          icon={TrendingUp}
          trend="up"
          trendValue="+8%"
          color="bg-emerald-500"
        />
        <StatCard
          title="Today Out"
          value={formatTons(data.todayTonnageOut * 1000)}
          subtext={`${formatTons(data.weekTonnageOut * 1000)} this week`}
          icon={ArrowDownRight}
          color="bg-blue-500"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(data.totalInventoryValue)}
          subtext={`${formatTons(data.totalInventoryWeight * 1000)} total`}
          icon={Package}
          trend="up"
          trendValue="+12%"
          color="bg-violet-500"
        />
        <StatCard
          title="Active Tickets"
          value={data.activeTickets}
          subtext="In progress"
          icon={Activity}
          color="bg-amber-500"
        />
        <StatCard
          title="Suppliers"
          value={data.suppliersCount ?? 0}
          subtext={data.complianceIssues > 0 ? `${data.complianceIssues} compliance issues` : 'All compliant ✓'}
          icon={Users}
          color={data.complianceIssues > 0 ? 'bg-red-500' : 'bg-emerald-500'}
        />
      </div>

      {/* Charts row 1: Tonnage + Stock by Grade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tonnage area chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tonnage Flow ({rangeLabel})</CardTitle>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-emerald-500 rounded-full inline-block" />Inbound</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-blue-500 rounded-full inline-block" />Outbound</span>
            </div>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTonnage} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="tonnageIn"  name="In"  stroke="#10B981" strokeWidth={2.5} fill="url(#gIn)" />
                <Area type="monotone" dataKey="tonnageOut" name="Out" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Inventory by grade */}
        <Card>
          <CardHeader>
            <CardTitle>Stock by Grade</CardTitle>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.inventoryByGrade} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" hide />
                <YAxis dataKey="gradeCode" type="category" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-text-muted)' }} width={50} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  formatter={(v) => [formatTons(v * 1000), 'Weight']}
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="weight" radius={[0, 6, 6, 0]} barSize={14}>
                  {data.inventoryByGrade.map((_, i) => (
                    <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row 2: Margin by Grade */}
      {data.marginByGrade?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Margin by Grade (Today's Prices)</CardTitle>
            <div className="flex items-center gap-4 text-xs font-semibold text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />&gt;30%</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />15–30%</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />&lt;15%</span>
            </div>
          </CardHeader>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.marginByGrade}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  domain={[0, 'dataMax + 5']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  dataKey="gradeCode"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-text-muted)' }}
                  width={50}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  formatter={(v) => [`${v.toFixed(1)}%`, 'Margin']}
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="marginPercent" radius={[0, 6, 6, 0]} barSize={16}>
                  {data.marginByGrade.map((entry, i) => (
                    <Cell key={i} fill={marginColor(entry.marginPercent)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {data.overallMarginPercent != null && (
            <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)] font-semibold">Overall blended margin</span>
              <span className={`text-lg font-black tabular-nums ${
                data.overallMarginPercent >= 30 ? 'text-emerald-600' :
                data.overallMarginPercent >= 15 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {data.overallMarginPercent.toFixed(1)}%
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers</CardTitle>
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">{rangeLabel}</span>
          </CardHeader>
          <div className="space-y-1 mt-1">
            {(data.topSuppliers ?? []).slice(0, 6).map((s, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl
                                      hover:bg-[var(--color-surface-2)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-full
                                  flex items-center justify-center text-emerald-700 dark:text-emerald-400
                                  text-xs font-black flex-shrink-0">
                    {s.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{s.name}</p>
                    <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
                      {formatTons(s.totalWeight * 1000)} · {s.ticketCount} tickets
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-[var(--color-text)]">{formatCurrency(s.totalValue)}</p>
              </div>
            ))}
            {data.topSuppliers?.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No supplier data yet.</p>
            )}
          </div>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </CardHeader>
          <div className="space-y-4 mt-2 relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--color-border)]" />
            {(data.recentActivity ?? []).slice(0, 6).map((a, i) => (
              <div key={i} className="flex gap-4 relative z-10">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40
                                border-4 border-[var(--color-surface)]
                                flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                </div>
                <div className="pb-2">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{a.description}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{a.time}</p>
                </div>
              </div>
            ))}
            {data.recentActivity?.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No recent activity.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
