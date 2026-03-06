import { useEffect, useState, useCallback } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Users, MapPin, User, Plus, AlertTriangle, Eye, EyeOff, Copy, Check, Zap, Trash2, FlipHorizontal, ExternalLink } from 'lucide-react'
import { usersApi, sitesApi, authApi, webhooksApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import Modal, { ModalFooter } from '@/components/ui/Modal'

const ROLES = ['ScaleOp', 'Grader', 'Accountant', 'Manager', 'Owner']
const ROLE_COLORS = {
  Owner:      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Manager:    'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300',
  ScaleOp:    'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300',
  Grader:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Accountant: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
}
const SA_PROVINCES = ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape']

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({ open, onClose, onCreated, sites }) {
  const toast   = useUiStore((s) => s.toast)
  const hasRole = useAuthStore((s) => s.hasRole)
  const isOwner = hasRole('Owner')
  const TEMP_PASS = 'TempPass@1234'

  const [form, setForm]     = useState({ email:'', firstName:'', lastName:'', role:'ScaleOp', siteId:'' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (open) setForm({ email:'', firstName:'', lastName:'', role:'ScaleOp', siteId:'' }) }, [open])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.firstName || !form.lastName) { toast('All fields are required', 'error'); return }
    setSaving(true)
    try {
      await authApi.register({
        email:     form.email,
        password:  TEMP_PASS,
        firstName: form.firstName,
        lastName:  form.lastName,
        role:      form.role,
        siteId:    form.siteId || null,
      })
      toast(`${form.firstName} ${form.lastName} created. Temp password: ${TEMP_PASS}`, 'success')
      onCreated()
      onClose()
    } catch (err) {
      toast(err.response?.data?.message ?? err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function copyPass() {
    navigator.clipboard.writeText(TEMP_PASS)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const allowedRoles = isOwner ? ROLES : ROLES.filter((r) => r !== 'Owner')

  return (
    <Modal open={open} onOpenChange={onClose} title="Add New User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="u-first" className="block text-sm font-medium text-[var(--color-text)] mb-1">First Name</label>
            <input id="u-first" className="sf-input w-full" value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="u-last" className="block text-sm font-medium text-[var(--color-text)] mb-1">Last Name</label>
            <input id="u-last" className="sf-input w-full" value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)} required />
          </div>
        </div>
        <div>
          <label htmlFor="u-email" className="block text-sm font-medium text-[var(--color-text)] mb-1">Email</label>
          <input id="u-email" type="email" className="sf-input w-full" value={form.email}
            onChange={(e) => setField('email', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="u-role" className="block text-sm font-medium text-[var(--color-text)] mb-1">Role</label>
            <select id="u-role" className="sf-input w-full" value={form.role}
              onChange={(e) => setField('role', e.target.value)} aria-label="User role">
              {allowedRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="u-site" className="block text-sm font-medium text-[var(--color-text)] mb-1">Site (optional)</label>
            <select id="u-site" className="sf-input w-full" value={form.siteId}
              onChange={(e) => setField('siteId', e.target.value)} aria-label="Assigned site">
              <option value="">— None —</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-[var(--color-surface-2)] rounded-lg text-sm">
          <span className="text-[var(--color-text-muted)]">Temp password:</span>
          <code className="font-mono font-bold text-[var(--color-text)]">{TEMP_PASS}</code>
          <button type="button" onClick={copyPass} className="ml-auto btn-ghost p-1.5" aria-label="Copy password">
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        </div>
        <ModalFooter>
          <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button type="submit" className="btn-brand" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ─── Deactivate Confirm Modal ─────────────────────────────────────────────────
function DeactivateModal({ user, open, onClose, onDeactivated }) {
  const toast   = useUiStore((s) => s.toast)
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    setSaving(true)
    try {
      await usersApi.deactivate(user.id)
      toast(`${user.fullName} has been deactivated`, 'success')
      onDeactivated(user.id)
      onClose()
    } catch (err) {
      toast(err.response?.data?.message ?? err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onClose} title="Deactivate User" size="sm">
      <div className="space-y-4">
        <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">
            {user?.fullName} will lose access immediately.
          </p>
        </div>
        <ModalFooter>
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
            disabled={saving}>
            {saving ? 'Deactivating…' : 'Deactivate'}
          </button>
        </ModalFooter>
      </div>
    </Modal>
  )
}

// ─── Add Site Modal ───────────────────────────────────────────────────────────
function AddSiteModal({ open, onClose, onCreated }) {
  const toast   = useUiStore((s) => s.toast)
  const blank   = { name:'', address:'', city:'', province:'Gauteng', postalCode:'', phoneNumber:'' }
  const [form, setForm]     = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(blank) }, [open])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.city) { toast('Name and city are required', 'error'); return }
    setSaving(true)
    try {
      await sitesApi.create(form)
      toast(`Site "${form.name}" created`, 'success')
      onCreated()
      onClose()
    } catch (err) {
      toast(err.response?.data?.message ?? err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onClose} title="Add New Site">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="s-name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Site Name <span className="text-red-500">*</span>
          </label>
          <input id="s-name" className="sf-input w-full" value={form.name}
            onChange={(e) => setField('name', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="s-addr" className="block text-sm font-medium text-[var(--color-text)] mb-1">Address</label>
          <input id="s-addr" className="sf-input w-full" value={form.address}
            onChange={(e) => setField('address', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="s-city" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input id="s-city" className="sf-input w-full" value={form.city}
              onChange={(e) => setField('city', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="s-postal" className="block text-sm font-medium text-[var(--color-text)] mb-1">Postal Code</label>
            <input id="s-postal" className="sf-input w-full" value={form.postalCode}
              onChange={(e) => setField('postalCode', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="s-prov" className="block text-sm font-medium text-[var(--color-text)] mb-1">Province</label>
            <select id="s-prov" className="sf-input w-full" value={form.province}
              onChange={(e) => setField('province', e.target.value)} aria-label="Province">
              {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="s-phone" className="block text-sm font-medium text-[var(--color-text)] mb-1">Phone</label>
            <input id="s-phone" className="sf-input w-full" value={form.phoneNumber}
              onChange={(e) => setField('phoneNumber', e.target.value)} />
          </div>
        </div>
        <ModalFooter>
          <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button type="submit" className="btn-brand" disabled={saving}>{saving ? 'Creating…' : 'Create Site'}</button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const hasRole = useAuthStore((s) => s.hasRole)
  const isOwner = hasRole('Owner')
  const toast   = useUiStore((s) => s.toast)

  const [users,   setUsers]   = useState([])
  const [sites,   setSites]   = useState([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, sRes] = await Promise.all([usersApi.getAll(), sitesApi.getAll()])
      setUsers(uRes.data ?? [])
      setSites(sRes.data ?? [])
    } catch (err) {
      toast(err.response?.data?.message ?? 'Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  function handleDeactivated(id) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isActive: false } : u))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setAddOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
          <Plus size={15} /> Add User
        </button>
      </div>

      <div className="glass-card overflow-hidden hidden md:block">
        <table className="w-full text-sm" aria-label="Users">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs font-semibold
                           text-[var(--color-text-muted)] uppercase tracking-wide">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Status</th>
              {isOwner && <th className="px-4 py-3 w-24" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">No users found</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--color-text)]">{u.fullName}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`status-pill text-xs ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{u.siteName ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-ZA') : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <span className={`status-pill text-xs ${u.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    {u.isActive && (
                      <button onClick={() => setDeactivateTarget(u)}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                        aria-label={`Deactivate ${u.fullName}`}>
                        Deactivate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <div key={u.id} className="glass-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-[var(--color-text)]">{u.fullName}</p>
              <span className={`status-pill text-xs ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">{u.email}</p>
            <div className="flex items-center justify-between">
              <span className={`status-pill text-xs ${u.isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-500'}`}>
                {u.isActive ? 'Active' : 'Inactive'}
              </span>
              {isOwner && u.isActive && (
                <button onClick={() => setDeactivateTarget(u)}
                  className="text-xs text-red-600 font-medium" aria-label={`Deactivate ${u.fullName}`}>
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} sites={sites} />
      <DeactivateModal user={deactivateTarget} open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)} onDeactivated={handleDeactivated} />
    </div>
  )
}

// ─── Sites Tab ────────────────────────────────────────────────────────────────
function SitesTab() {
  const toast   = useUiStore((s) => s.toast)
  const [sites,   setSites]   = useState([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sitesApi.getAll()
      setSites(res.data ?? [])
    } catch (err) {
      toast(err.response?.data?.message ?? 'Failed to load sites', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">{sites.length} site{sites.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setAddOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Site
        </button>
      </div>

      {loading && <p className="text-center py-8 text-[var(--color-text-muted)]">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((s) => (
          <div key={s.id} className="glass-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-[var(--color-text)]">{s.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{s.city}, {s.province}</p>
              </div>
              <span className={`status-pill text-xs ${s.isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-500'}`}>
                {s.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {s.address && <p className="text-xs text-[var(--color-text-muted)]">{s.address}</p>}
            <div className="flex gap-4 text-xs pt-1 border-t border-[var(--color-border)]">
              <div>
                <p className="text-[var(--color-text-muted)]">Active Tickets</p>
                <p className="font-bold text-[var(--color-text)]">{s.activeTickets ?? 0}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-muted)]">Stock</p>
                <p className="font-bold text-[var(--color-text)]">
                  {s.totalInventoryWeight != null
                    ? `${Number(s.totalInventoryWeight).toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg`
                    : '—'}
                </p>
              </div>
              {s.phoneNumber && (
                <div>
                  <p className="text-[var(--color-text-muted)]">Phone</p>
                  <p className="font-bold text-[var(--color-text)]">{s.phoneNumber}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {!loading && sites.length === 0 && (
          <div className="col-span-full glass-card p-10 text-center text-[var(--color-text-muted)]">
            <MapPin size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No sites found</p>
          </div>
        )}
      </div>

      <AddSiteModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
    </div>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab() {
  const user  = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)
  const toast = useUiStore((s) => s.toast)

  const [form, setForm]       = useState({ firstName:'', lastName:'', currentPassword:'', newPassword:'' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    if (user) {
      const parts = (user.fullName ?? '').split(' ')
      setForm((f) => ({ ...f, firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }))
    }
  }, [user])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.currentPassword) { toast('Current password is required', 'error'); return }
    setSaving(true)
    try {
      const res = await usersApi.updateProfile({
        firstName:       form.firstName,
        lastName:        form.lastName,
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword || undefined,
      })
      const updated = res.data
      login(token, { ...user, fullName: updated.fullName ?? `${form.firstName} ${form.lastName}` })
      toast('Profile updated successfully', 'success')
      setForm((f) => ({ ...f, currentPassword:'', newPassword:'' }))
    } catch (err) {
      toast(err.response?.data?.message ?? err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="glass-card p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center
                        text-white font-bold text-xl flex-shrink-0">
          {user?.fullName?.charAt(0) ?? '?'}
        </div>
        <div>
          <p className="font-bold text-[var(--color-text)]">{user?.fullName}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{user?.email}</p>
          <span className={`status-pill text-xs mt-1 inline-block ${ROLE_COLORS[user?.role] ?? 'bg-gray-100 text-gray-700'}`}>
            {user?.role}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
        <h3 className="font-semibold text-[var(--color-text)]">Edit Profile</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="p-first" className="block text-sm font-medium text-[var(--color-text)] mb-1">First Name</label>
            <input id="p-first" className="sf-input w-full" value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="p-last" className="block text-sm font-medium text-[var(--color-text)] mb-1">Last Name</label>
            <input id="p-last" className="sf-input w-full" value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)} required />
          </div>
        </div>

        <div>
          <label htmlFor="p-current" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Current Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input id="p-current" type={showCurrent ? 'text' : 'password'} className="sf-input w-full pr-10"
              value={form.currentPassword} onChange={(e) => setField('currentPassword', e.target.value)}
              required aria-required="true" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-label={showCurrent ? 'Hide password' : 'Show password'}>
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="p-new" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            New Password
            <span className="text-[var(--color-text-muted)] font-normal text-xs ml-1">(optional)</span>
          </label>
          <div className="relative">
            <input id="p-new" type={showNew ? 'text' : 'password'} className="sf-input w-full pr-10"
              value={form.newPassword} onChange={(e) => setField('newPassword', e.target.value)}
              minLength={8} aria-describedby="p-new-hint" />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-label={showNew ? 'Hide password' : 'Show password'}>
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p id="p-new-hint" className="text-xs text-[var(--color-text-muted)] mt-1">
            Leave blank to keep current password. Min 8 characters.
          </p>
        </div>

        <button type="submit" className="btn-brand w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

// ─── Event filter options ─────────────────────────────────────────────────────
const EVENT_FILTERS = [
  { value: '*',                             label: 'All events' },
  { value: 'ticket.inbound.completed',      label: 'Inbound ticket completed' },
  { value: 'ticket.outbound.completed',     label: 'Outbound ticket completed' },
  { value: 'inventory.lot.written_off',     label: 'Lot written off' },
  { value: 'inventory.lot.adjusted',        label: 'Lot adjusted' },
  { value: 'supplier.registered',           label: 'Supplier registered' },
]

// ─── Add Webhook Modal ────────────────────────────────────────────────────────
function AddWebhookModal({ open, onClose, onCreated }) {
  const toast = useUiStore((s) => s.toast)
  const blank = { name: '', url: '', eventFilter: '*', secret: '' }
  const [form, setForm]     = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(blank) }, [open])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.url) { toast('Name and URL are required', 'error'); return }
    setSaving(true)
    try {
      await webhooksApi.create({ name: form.name, url: form.url, eventFilter: form.eventFilter, secret: form.secret || null })
      toast('Webhook created', 'success')
      onCreated()
      onClose()
    } catch (err) {
      toast(err.response?.data?.message ?? err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onClose} title="Add Webhook">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="wh-name" className="block text-sm font-medium text-[var(--color-text)] mb-1">Name</label>
          <input id="wh-name" className="sf-input w-full" placeholder="e.g. n8n Supplier Emails"
            value={form.name} onChange={(e) => setField('name', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="wh-url" className="block text-sm font-medium text-[var(--color-text)] mb-1">Webhook URL</label>
          <input id="wh-url" type="url" className="sf-input w-full" placeholder="https://n8n.yourdomain.com/webhook/..."
            value={form.url} onChange={(e) => setField('url', e.target.value)} required />
        </div>
        <div>
          <label htmlFor="wh-event" className="block text-sm font-medium text-[var(--color-text)] mb-1">Event Filter</label>
          <select id="wh-event" className="sf-input w-full" value={form.eventFilter}
            onChange={(e) => setField('eventFilter', e.target.value)} aria-label="Event filter">
            {EVENT_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="wh-secret" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Secret <span className="text-[var(--color-text-muted)] font-normal text-xs">(optional — HMAC-SHA256)</span>
          </label>
          <input id="wh-secret" className="sf-input w-full font-mono" placeholder="Leave blank to skip signature"
            value={form.secret} onChange={(e) => setField('secret', e.target.value)} />
        </div>
        <ModalFooter>
          <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>Cancel</button>
          <button type="submit" className="btn-brand" disabled={saving}>{saving ? 'Creating…' : 'Create Webhook'}</button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// ─── Automations Tab ──────────────────────────────────────────────────────────
function AutomationsTab() {
  const toast = useUiStore((s) => s.toast)
  const [webhooks, setWebhooks] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [addOpen,  setAddOpen]  = useState(false)
  const [testing,  setTesting]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await webhooksApi.getAll()
      setWebhooks(res.data ?? [])
    } catch (err) {
      toast(err.response?.data?.message ?? 'Failed to load webhooks', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleToggle(id) {
    try {
      const res = await webhooksApi.toggle(id)
      setWebhooks((prev) => prev.map((w) => w.id === id ? res.data : w))
    } catch (err) {
      toast(err.response?.data?.message ?? 'Failed to toggle webhook', 'error')
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete webhook "${name}"?`)) return
    try {
      await webhooksApi.remove(id)
      setWebhooks((prev) => prev.filter((w) => w.id !== id))
      toast('Webhook deleted', 'success')
    } catch (err) {
      toast(err.response?.data?.message ?? 'Failed to delete webhook', 'error')
    }
  }

  async function handleTest(id) {
    setTesting(id)
    try {
      await webhooksApi.test(id)
      toast('Test payload sent', 'success')
    } catch (err) {
      toast(err.response?.data?.message ?? 'Test failed', 'error')
    } finally {
      setTesting(null)
    }
  }

  const filterLabel = (v) => EVENT_FILTERS.find((f) => f.value === v)?.label ?? v

  return (
    <div className="space-y-5">
      {/* Info callout */}
      <div className="glass-card p-4 flex gap-3 border border-blue-200 dark:border-blue-800
                      bg-blue-50/50 dark:bg-blue-900/10">
        <Zap size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-[var(--color-text)]">Automate with n8n (or Zapier)</p>
          <p className="text-[var(--color-text-muted)]">
            n8n is running at{' '}
            <a href="http://localhost:5678" target="_blank" rel="noreferrer"
               className="text-blue-600 dark:text-blue-400 underline inline-flex items-center gap-1">
              localhost:5678 <ExternalLink size={11} />
            </a>
            {' '}— login: <code className="font-mono bg-[var(--color-surface-2)] px-1 rounded">admin</code> /
            {' '}<code className="font-mono bg-[var(--color-surface-2)] px-1 rounded">ScrapFlow@n8n</code>.
            Import workflows from <code className="font-mono bg-[var(--color-surface-2)] px-1 rounded">n8n-workflows/</code>.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setAddOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Webhook
        </button>
      </div>

      {loading && <p className="text-center py-8 text-[var(--color-text-muted)]">Loading…</p>}

      {!loading && webhooks.length === 0 && (
        <div className="glass-card p-10 text-center text-[var(--color-text-muted)]">
          <Zap size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No webhooks configured</p>
          <p className="text-sm mt-1">Add a webhook URL to start automating tasks with n8n or Zapier.</p>
        </div>
      )}

      <div className="space-y-3">
        {webhooks.map((w) => (
          <div key={w.id} className="glass-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[var(--color-text)]">{w.name}</p>
                  <span className={`status-pill text-xs ${w.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {w.isActive ? 'Active' : 'Paused'}
                  </span>
                  <span className="status-pill text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {filterLabel(w.eventFilter)}
                  </span>
                  {w.hasSecret && (
                    <span className="status-pill text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      HMAC signed
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">{w.url}</p>
                {w.lastFiredAt && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Last fired: {new Date(w.lastFiredAt).toLocaleString('en-ZA')}
                    {w.lastStatus && <span className="ml-2 font-mono">{w.lastStatus}</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleTest(w.id)} disabled={testing === w.id}
                  className="btn-ghost text-xs px-2 py-1" aria-label={`Test ${w.name}`}>
                  {testing === w.id ? 'Sending…' : 'Test'}
                </button>
                <button onClick={() => handleToggle(w.id)}
                  className="btn-ghost p-1.5" aria-label={w.isActive ? 'Pause webhook' : 'Activate webhook'}>
                  <FlipHorizontal size={15} />
                </button>
                <button onClick={() => handleDelete(w.id, w.name)}
                  className="btn-ghost p-1.5 text-red-500 hover:text-red-600" aria-label={`Delete ${w.name}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddWebhookModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const hasRole = useAuthStore((s) => s.hasRole)
  const isOwner = hasRole('Owner')
  const isAdmin = hasRole('Owner', 'Manager')

  const tabTrigger = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
    'text-[var(--color-text-muted)] hover:text-[var(--color-text)] ' +
    'data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text)] ' +
    'data-[state=active]:shadow-sm'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Manage users, sites and your profile</p>
      </div>

      <Tabs.Root defaultValue="profile" className="space-y-5">
        <Tabs.List className="flex gap-1 p-1 bg-[var(--color-surface-2)] rounded-xl w-fit"
          aria-label="Settings tabs">
          <Tabs.Trigger value="profile" className={tabTrigger}>
            <User size={15} /> Profile
          </Tabs.Trigger>
          {isAdmin && (
            <Tabs.Trigger value="users" className={tabTrigger}>
              <Users size={15} /> Users
            </Tabs.Trigger>
          )}
          {isOwner && (
            <Tabs.Trigger value="sites" className={tabTrigger}>
              <MapPin size={15} /> Sites
            </Tabs.Trigger>
          )}
          {isOwner && (
            <Tabs.Trigger value="automations" className={tabTrigger}>
              <Zap size={15} /> Automations
            </Tabs.Trigger>
          )}
        </Tabs.List>

        <Tabs.Content value="profile"><ProfileTab /></Tabs.Content>
        {isAdmin && <Tabs.Content value="users"><UsersTab /></Tabs.Content>}
        {isOwner && <Tabs.Content value="sites"><SitesTab /></Tabs.Content>}
        {isOwner && <Tabs.Content value="automations"><AutomationsTab /></Tabs.Content>}
      </Tabs.Root>
    </div>
  )
}
