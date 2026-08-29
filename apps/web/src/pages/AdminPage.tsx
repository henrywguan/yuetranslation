import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoleBadge } from '../components/RoleBadge'
import '../components/RoleBadge.css'
import { AdminResetUsageModal } from '../components/AdminResetUsageModal'
import { AdminBugReportsDashboard } from '../components/AdminBugReportsDashboard'
import { AdminEmailHub } from '../components/AdminEmailHub'
import {
  adminPatchBugReportStatus,
  adminResetUsage,
  adminSetDisabled,
  adminSetPlan,
  adminSetRole,
  downloadAdminUsersCsv,
  fetchAdminAudit,
  fetchAdminBugReports,
  fetchAdminMe,
  fetchAdminUserUsage,
  fetchAdminUsers,
  formatLiveSeconds,
  syncResendAudience,
  type AdminAuditEntry,
  type AdminBugReport,
  type AdminListQuery,
  type AdminUser,
} from '../lib/adminApi'
import { openAuthScreen } from '../lib/auth'
import { navigate } from '../lib/useHashRoute'
import { USER_ROLE_OPTIONS, type UserRole } from '../lib/userRoles'
import './AdminPage.css'

type Tab = 'users' | 'audit' | 'reports' | 'email'

function currentMonthInput(): string {
  return new Date().toISOString().slice(0, 7)
}

function monthKeyFromInput(value: string): string {
  return value.replace('-', '_')
}

function monthInputFromKey(key: string): string {
  return key.replace('_', '-')
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [gate, setGate] = useState<'loading' | 'ok' | 'denied'>('loading')
  const [adminEmail, setAdminEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [monthInput, setMonthInput] = useState(currentMonthInput)
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [plan, setPlan] = useState('all')
  const [overQuota, setOverQuota] = useState(false)
  const [disabledOnly, setDisabledOnly] = useState(false)
  const [sort, setSort] = useState<AdminListQuery['sort']>('createdAt')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const [users, setUsers] = useState<AdminUser[]>([])
  const [count, setCount] = useState(0)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null)
  const [usageMonths, setUsageMonths] = useState<
    {
      month: string
      liveSeconds: number
      ttsChars: number
      translateCount: number
      cameraSeconds: number
      cameraTranslateCount: number
      docsPages: number
    }[]
  >([])
  const [audit, setAudit] = useState<AdminAuditEntry[]>([])
  const [reports, setReports] = useState<AdminBugReport[]>([])
  const [selectedReport, setSelectedReport] = useState<AdminBugReport | null>(null)
  const [resendSyncMsg, setResendSyncMsg] = useState('')
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 250)
    return () => window.clearTimeout(t)
  }, [q])

  useEffect(() => {
    let cancelled = false
    void fetchAdminMe()
      .then((me) => {
        if (cancelled) return
        setAdminEmail(me.email || '')
        setGate('ok')
      })
      .catch((e: { status?: number }) => {
        if (cancelled) return
        setGate(e.status === 401 ? 'denied' : 'denied')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const listParams = useMemo<AdminListQuery>(
    () => ({
      month: monthKeyFromInput(monthInput),
      q: qDebounced || undefined,
      plan,
      overQuota,
      disabled: disabledOnly,
      sort,
      dir,
    }),
    [monthInput, qDebounced, plan, overQuota, disabledOnly, sort, dir],
  )

  const reloadUsers = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const data = await fetchAdminUsers(listParams)
      setUsers(data.users)
      setCount(data.count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setBusy(false)
    }
  }, [listParams])

  const reloadAudit = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const data = await fetchAdminAudit(150)
      setAudit(data.entries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log')
    } finally {
      setBusy(false)
    }
  }, [])

  const reloadReports = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const data = await fetchAdminBugReports(150)
      setReports(data.reports)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bug reports')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (gate !== 'ok') return
    if (tab === 'users') void reloadUsers()
    else if (tab === 'audit') void reloadAudit()
    else if (tab === 'reports') void reloadReports()
  }, [gate, tab, reloadUsers, reloadAudit, reloadReports])

  const openUser = async (user: AdminUser) => {
    setSelected(user)
    setError('')
    try {
      const data = await fetchAdminUserUsage(user.id)
      setUsageMonths(data.months)
    } catch (e) {
      setUsageMonths([])
      setError(e instanceof Error ? e.message : 'Failed to load usage history')
    }
  }

  const onSetPlan = async (user: AdminUser, next: 'free' | 'pro' | 'max') => {
    if (next === user.plan) return
    if (!window.confirm(`Set ${user.email || user.id} to ${next}?`)) return
    setBusy(true)
    setError('')
    try {
      await adminSetPlan(user.id, next)
      await reloadUsers()
      if (selected?.id === user.id) {
        setSelected({ ...user, plan: next })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Plan update failed')
    } finally {
      setBusy(false)
    }
  }

  const onSetRole = async (user: AdminUser, next: UserRole | null) => {
    if (next === user.role) {
      setEditingRoleUserId(null)
      return
    }
    const label = next ? USER_ROLE_OPTIONS.find((o) => o.value === next)?.label ?? next : 'None'
    if (!window.confirm(`Set role for ${user.email || user.id} to ${label}?`)) return
    setBusy(true)
    setError('')
    try {
      await adminSetRole(user.id, next)
      setEditingRoleUserId(null)
      await reloadUsers()
      if (selected?.id === user.id) {
        setSelected({ ...user, role: next })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Role update failed')
    } finally {
      setBusy(false)
    }
  }

  const onSubmitResetUsage = async (patch: {
    liveSeconds?: number
    ttsChars?: number
    cameraSeconds?: number
    docsPages?: number
  }) => {
    if (!resetUser) return
    const month = monthKeyFromInput(monthInput)
    setBusy(true)
    setError('')
    try {
      await adminResetUsage(resetUser.id, { month, ...patch })
      setResetUser(null)
      await reloadUsers()
      if (selected?.id === resetUser.id) {
        await openUser({
          ...resetUser,
          liveSeconds: patch.liveSeconds ?? resetUser.liveSeconds,
          ttsChars: patch.ttsChars ?? resetUser.ttsChars,
          cameraSeconds: patch.cameraSeconds ?? resetUser.cameraSeconds,
          docsPages: patch.docsPages ?? resetUser.docsPages,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  const onToggleBan = async (user: AdminUser) => {
    const next = !user.disabled
    const verb = next ? 'Ban' : 'Unban'
    if (!window.confirm(`${verb} ${user.email || user.id}?`)) return
    setBusy(true)
    setError('')
    try {
      await adminSetDisabled(user.id, next)
      await reloadUsers()
      if (selected?.id === user.id) setSelected({ ...user, disabled: next, plan: next ? 'free' : user.plan })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ban update failed')
    } finally {
      setBusy(false)
    }
  }

  const onExport = async () => {
    setBusy(true)
    setError('')
    try {
      await downloadAdminUsersCsv(listParams)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  const onSyncResendAudience = async () => {
    if (
      !window.confirm(
        'Scan all Supabase users and add their emails to your Resend Audience? This may take a minute.',
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    setResendSyncMsg('')
    try {
      const result = await syncResendAudience()
      setResendSyncMsg(
        `Resend: ${result.synced} synced, ${result.skipped} skipped (no email), ${result.failed} failed (${result.scanned} scanned).`,
      )
      if (tab === 'audit') void reloadAudit()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resend sync failed')
    } finally {
      setBusy(false)
    }
  }

  const onSetReportStatus = async (report: AdminBugReport, status: AdminBugReport['status']) => {
    if (status === report.status) return
    setBusy(true)
    setError('')
    try {
      await adminPatchBugReportStatus(report.id, status)
      await reloadReports()
      if (selectedReport?.id === report.id) {
        // Closing a report collapses the detail panel.
        if (status === 'closed') setSelectedReport(null)
        else setSelectedReport({ ...report, status })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update report')
    } finally {
      setBusy(false)
    }
  }

  const onBulkSetReportStatus = async (
    batch: AdminBugReport[],
    status: AdminBugReport['status'],
  ) => {
    const targets = batch.filter((r) => r.status !== status)
    if (!targets.length) return
    setBusy(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        targets.map((r) => adminPatchBugReportStatus(r.id, status)),
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      await reloadReports()
      if (selectedReport && targets.some((r) => r.id === selectedReport.id)) {
        if (status === 'closed') setSelectedReport(null)
        else setSelectedReport({ ...selectedReport, status })
      }
      if (failed) {
        setError(`Updated ${targets.length - failed} of ${targets.length}; ${failed} failed.`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update reports')
    } finally {
      setBusy(false)
    }
  }

  const onSort = (key: NonNullable<AdminListQuery['sort']>) => {
    if (sort === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSort(key)
      setDir(key === 'email' || key === 'plan' ? 'asc' : 'desc')
    }
  }

  if (gate === 'loading') {
    return (
      <div className="admin-page">
        <p className="admin-muted">Checking admin access…</p>
      </div>
    )
  }

  if (gate === 'denied') {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <button type="button" className="admin-link-btn" onClick={() => navigate('home')}>
            ← Home
          </button>
          <h1>Admin</h1>
        </header>
        <p className="admin-error">Admin access required. Sign in with an allowlisted email.</p>
        <button type="button" className="admin-btn" onClick={() => openAuthScreen()}>
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-row">
          <button type="button" className="admin-link-btn" onClick={() => navigate('app')}>
            ← App
          </button>
          <p className="admin-muted">Signed in as {adminEmail || 'admin'}</p>
        </div>
        <h1>Admin</h1>
        <div className="admin-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'users'}
            className={`admin-tab${tab === 'users' ? ' is-active' : ''}`}
            onClick={() => setTab('users')}
          >
            Users
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'audit'}
            className={`admin-tab${tab === 'audit' ? ' is-active' : ''}`}
            onClick={() => setTab('audit')}
          >
            Audit log
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'reports'}
            className={`admin-tab${tab === 'reports' ? ' is-active' : ''}`}
            onClick={() => setTab('reports')}
          >
            Reports
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'email'}
            className={`admin-tab${tab === 'email' ? ' is-active' : ''}`}
            onClick={() => setTab('email')}
          >
            Email
          </button>
        </div>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}

      {tab === 'users' ? (
        <>
          <section className="admin-filters" aria-label="Filters">
            <label>
              Month
              <input
                type="month"
                value={monthInput}
                onChange={(e) => setMonthInput(e.target.value || currentMonthInput())}
              />
            </label>
            <label className="admin-grow">
              Search
              <input
                type="search"
                placeholder="Email, name, or id"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label>
              Plan
              <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="all">All</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="max">Max</option>
              </select>
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={overQuota}
                onChange={(e) => setOverQuota(e.target.checked)}
              />
              Over quota
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={disabledOnly}
                onChange={(e) => setDisabledOnly(e.target.checked)}
              />
              Banned
            </label>
            <button type="button" className="admin-btn" disabled={busy} onClick={() => void onExport()}>
              Export CSV
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={busy}
              onClick={() => void onSyncResendAudience()}
            >
              Sync Resend audience
            </button>
          </section>

          {resendSyncMsg ? <p className="admin-muted">{resendSyncMsg}</p> : null}

          <p className="admin-muted">
            {busy ? 'Loading…' : `${count} user${count === 1 ? '' : 's'}`} · month{' '}
            {monthKeyFromInput(monthInput)}
          </p>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="admin-sort" onClick={() => onSort('email')}>
                      User{sort === 'email' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="admin-sort" onClick={() => onSort('plan')}>
                      Plan{sort === 'plan' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="admin-sort" onClick={() => onSort('role')}>
                      Role{sort === 'role' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="admin-sort" onClick={() => onSort('liveSeconds')}>
                      Live{sort === 'liveSeconds' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="admin-sort" onClick={() => onSort('ttsChars')}>
                      TTS{sort === 'ttsChars' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="admin-sort"
                      onClick={() => onSort('translateCount')}
                    >
                      Translate{sort === 'translateCount' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="admin-sort" onClick={() => onSort('cameraSeconds')}>
                      Cam{sort === 'cameraSeconds' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="admin-sort" onClick={() => onSort('docsPages')}>
                      Docs{sort === 'docsPages' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="admin-sort" onClick={() => onSort('createdAt')}>
                      Joined{sort === 'createdAt' ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.disabled ? 'is-disabled' : u.overQuota ? 'is-over' : ''}>
                    <td>
                      <button type="button" className="admin-user-btn" onClick={() => void openUser(u)}>
                        <strong>{u.displayName || u.email || u.id.slice(0, 8)}</strong>
                        {u.email && u.displayName ? <span className="admin-sub">{u.email}</span> : null}
                        {u.disabled ? <span className="admin-badge">Banned</span> : null}
                        {u.overQuota && !u.disabled ? (
                          <span className="admin-badge admin-badge--warn">Over quota</span>
                        ) : null}
                      </button>
                    </td>
                    <td>
                      <select
                        value={u.plan}
                        disabled={busy || u.disabled}
                        onChange={(e) =>
                          void onSetPlan(u, e.target.value as 'free' | 'pro' | 'max')
                        }
                        aria-label={`Plan for ${u.email || u.id}`}
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="max">max</option>
                      </select>
                    </td>
                    <td className="admin-role-cell">
                      {u.role && editingRoleUserId !== u.id ? (
                        <RoleBadge role={u.role} onClick={() => setEditingRoleUserId(u.id)} />
                      ) : (
                        <span className="admin-role-edit">
                          {editingRoleUserId === u.id ? (
                            <button
                              type="button"
                              className="admin-plan-edit-cancel"
                              onClick={() => setEditingRoleUserId(null)}
                              aria-label="Cancel role edit"
                            >
                              ←
                            </button>
                          ) : null}
                          <select
                            value={u.role ?? ''}
                            disabled={busy}
                            autoFocus={editingRoleUserId === u.id}
                            onChange={(e) => {
                              const value = e.target.value
                              void onSetRole(
                                u,
                                value === '' ? null : (value as UserRole),
                              )
                            }}
                            aria-label={`Role for ${u.email || u.id}`}
                          >
                            {USER_ROLE_OPTIONS.map((opt) => (
                              <option key={opt.label} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </span>
                      )}
                    </td>
                    <td title={`${u.liveSeconds} / ${u.liveLimitSeconds} s`}>
                      {formatLiveSeconds(u.liveSeconds)}
                    </td>
                    <td>
                      {u.ttsChars.toLocaleString()}
                      <span className="admin-sub"> / {u.ttsLimitChars.toLocaleString()}</span>
                    </td>
                    <td>{u.translateCount.toLocaleString()}</td>
                    <td
                      title={
                        u.cameraLimitSeconds > 0
                          ? `${u.cameraSeconds} / ${u.cameraLimitSeconds} s · ${u.cameraTranslateCount} scans`
                          : `${u.cameraSeconds} s · ${u.cameraTranslateCount} scans`
                      }
                    >
                      {formatLiveSeconds(u.cameraSeconds)}
                      {u.cameraLimitSeconds > 0 ? (
                        <span className="admin-sub"> / {formatLiveSeconds(u.cameraLimitSeconds)}</span>
                      ) : null}
                      {u.cameraTranslateCount > 0 ? (
                        <span className="admin-sub"> · {u.cameraTranslateCount} scan{u.cameraTranslateCount === 1 ? '' : 's'}</span>
                      ) : null}
                    </td>
                    <td
                      title={
                        u.docsLimitPages > 0
                          ? `${u.docsPages} / ${u.docsLimitPages} pages`
                          : `${u.docsPages} pages (unlimited)`
                      }
                    >
                      {(u.docsPages ?? 0).toLocaleString()}
                      {u.docsLimitPages > 0 ? (
                        <span className="admin-sub"> / {u.docsLimitPages.toLocaleString()}</span>
                      ) : null}
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="admin-actions">
                      {u.stripeDashboardUrl ? (
                        <a
                          href={u.stripeDashboardUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-link-btn"
                        >
                          Stripe
                        </a>
                      ) : null}
                      <div className="admin-action-group">
                        <button
                          type="button"
                          className="admin-action-btn"
                          disabled={busy}
                          onClick={() => setResetUser(u)}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className={`admin-action-btn${u.disabled ? '' : ' admin-action-btn--danger'}`}
                          disabled={busy}
                          onClick={() => void onToggleBan(u)}
                        >
                          {u.disabled ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && !busy ? (
                  <tr>
                    <td colSpan={9} className="admin-muted">
                      No users match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {selected ? (
            <aside className="admin-detail" aria-label="User usage detail">
              <header className="admin-detail-header">
                <div>
                  <h2>{selected.displayName || selected.email || selected.id}</h2>
                  <p className="admin-muted">{selected.email}</p>
                </div>
                <button type="button" className="admin-link-btn" onClick={() => setSelected(null)}>
                  Close
                </button>
              </header>
              <ul className="admin-usage-list">
                {usageMonths.length ? (
                  usageMonths.map((m) => (
                    <li key={m.month}>
                      <strong>{monthInputFromKey(m.month)}</strong>
                      <span>Live {formatLiveSeconds(m.liveSeconds)}</span>
                      <span>TTS {m.ttsChars.toLocaleString()}</span>
                      <span>Translate {m.translateCount.toLocaleString()}</span>
                      <span>
                        Cam {formatLiveSeconds(m.cameraSeconds)}
                        {m.cameraTranslateCount
                          ? ` · ${m.cameraTranslateCount} scan${m.cameraTranslateCount === 1 ? '' : 's'}`
                          : ''}
                      </span>
                      <span>Docs {(m.docsPages ?? 0).toLocaleString()} pages</span>
                    </li>
                  ))
                ) : (
                  <li className="admin-muted">No usage months yet.</li>
                )}
              </ul>
            </aside>
          ) : null}

          <AdminResetUsageModal
            open={Boolean(resetUser)}
            user={resetUser}
            monthLabel={monthKeyFromInput(monthInput)}
            busy={busy}
            onClose={() => setResetUser(null)}
            onSubmit={(patch) => void onSubmitResetUsage(patch)}
          />
        </>
      ) : tab === 'reports' ? (
        <AdminBugReportsDashboard
          reports={reports}
          busy={busy}
          selectedId={selectedReport?.id ?? null}
          onSelect={setSelectedReport}
          onStatusChange={(report, status) => void onSetReportStatus(report, status)}
          onBulkStatusChange={(batch, status) => void onBulkSetReportStatus(batch, status)}
        />
      ) : tab === 'email' ? (
        <AdminEmailHub />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.created_at).toLocaleString()}</td>
                  <td>{e.actor_email || e.actor_id}</td>
                  <td>{e.action}</td>
                  <td>{e.target_email || e.target_user_id || '—'}</td>
                  <td className="admin-detail-json">
                    {e.detail ? JSON.stringify(e.detail) : '—'}
                  </td>
                </tr>
              ))}
              {!audit.length && !busy ? (
                <tr>
                  <td colSpan={5} className="admin-muted">
                    No audit entries yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
