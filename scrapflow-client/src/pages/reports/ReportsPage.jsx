import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FileText, Download, RefreshCw, Calendar, CheckCircle } from 'lucide-react'
import { reportsApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { downloadBlob } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export default function ReportsPage() {
  const { hasRole } = useAuthStore()
  const { toast } = useUiStore()

  if (!hasRole('Owner', 'Manager')) return <Navigate to="/dashboard" replace />
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(null) // 'itac' | 'saps' | null

  // ITAC: generate + download from backend
  const [itacYear, setItacYear]   = useState(() => new Date().getFullYear())
  const [itacMonth, setItacMonth] = useState(() => new Date().getMonth() + 1)

  const generateItac = async () => {
    setGenerating('itac')
    try {
      const gen = await reportsApi.generate(itacYear, itacMonth)
      const id  = gen.data.id
      const csv = await reportsApi.downloadCsv(id)
      downloadBlob(csv.data, `ITAC_${itacYear}_${String(itacMonth).padStart(2, '0')}.csv`)
      toast(`ITAC report generated and downloaded`, 'success')
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Export failed'
      // If already exists, download the existing one
      const existingId = err.response?.data?.reportId
      if (existingId) {
        try {
          const csv = await reportsApi.downloadCsv(existingId)
          downloadBlob(csv.data, `ITAC_${itacYear}_${String(itacMonth).padStart(2, '0')}.csv`)
          toast('Downloaded existing ITAC report', 'success')
        } catch {
          toast(msg, 'error')
        }
      } else {
        toast(typeof msg === 'string' ? msg : 'Export failed', 'error')
      }
    } finally {
      setGenerating(null)
    }
  }

  // SAPS: download from backend (proper SAPS register)
  const exportSaps = async () => {
    setGenerating('saps')
    try {
      const res = await reportsApi.downloadSaps(startDate, endDate)
      downloadBlob(res.data, `SAPS_Register_${startDate}_${endDate}.csv`)
      toast('SAPS register exported', 'success')
    } catch (err) {
      toast(err.response?.data?.message ?? 'Export failed', 'error')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight">Reports</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Generate ITAC and SAPS compliance exports</p>
      </div>

      {/* ITAC Report */}
      <Card>
        <CardHeader>
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <CardTitle>ITAC Monthly Report</CardTitle>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              International Trade Administration Commission — monthly scrap metal permit report
            </p>
          </div>
        </CardHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Year</label>
            <input
              type="number"
              min={2020}
              max={new Date().getFullYear() + 1}
              value={itacYear}
              onChange={(e) => setItacYear(Number(e.target.value))}
              className="sf-input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">Month</label>
            <select
              value={itacMonth}
              onChange={(e) => setItacMonth(Number(e.target.value))}
              className="sf-input"
            >
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generateItac}
          disabled={generating !== null}
          className="btn-brand mt-4 w-full justify-center"
        >
          {generating === 'itac'
            ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
            : <><Download size={14} /> Generate & Download CSV</>
          }
        </button>
      </Card>

      {/* SAPS Report */}
      <Card>
        <CardHeader>
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <FileText size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <CardTitle>SAPS Second-Hand Goods Register</CardTitle>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              South African Police Service compliance register — Second-Hand Goods Act 6 of 2009
            </p>
          </div>
        </CardHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2 flex items-center gap-2">
              <Calendar size={14} /> From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="sf-input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2 flex items-center gap-2">
              <Calendar size={14} /> To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="sf-input"
            />
          </div>
        </div>

        <button
          onClick={exportSaps}
          disabled={generating !== null}
          className="btn-brand mt-4 w-full justify-center"
        >
          {generating === 'saps'
            ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
            : <><Download size={14} /> Export SAPS Register</>
          }
        </button>
      </Card>

      {/* Compliance note */}
      <Card className="bg-[var(--color-surface-2)] flex items-start gap-3">
        <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-[var(--color-text-muted)]">
          Both reports are generated server-side from verified transaction data.
          ITAC reports include all acquisition and disposal line items.
          SAPS registers include seller ID verification, vehicle registration, and photo confirmation fields.
        </p>
      </Card>
    </div>
  )
}
