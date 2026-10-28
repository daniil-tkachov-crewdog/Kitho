import { useEffect, useState } from 'react'
import { AdminAuthError, getReportConfig, getReports, saveReportConfig, type ReportConfig } from '../../lib/admin'
import { REPORT_REASONS, errorText } from '../../lib/api'
import { formatDateTime, useAdminData } from './useAdminData'

const reasonLabel = (code: string) => REPORT_REASONS.find((r) => r.code === code)?.label ?? code

export default function ReportsTab({ onExpired }: { onExpired: () => void }) {
  const { data: reports, error } = useAdminData(getReports, 10000, onExpired)

  return (
    <section>
      <h2>Reports</h2>
      <ReportSettingsForm onExpired={onExpired} />
      <h3>All reports</h3>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date & time</th><th>Reason</th><th>Comment</th><th>Reported profile ID</th>
              <th>Reported by (ID)</th><th>Points</th>
            </tr>
          </thead>
          <tbody>
            {reports?.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">{formatDateTime(r.created_at)}</td>
                <td>{reasonLabel(r.reason)}</td>
                <td className="admin-comment">{r.details || <span className="muted">—</span>}</td>
                <td><span className="mono">{r.reported_personal_id ?? '—'}</span> <span className="muted">{r.reported_name}</span></td>
                <td><span className="mono">{r.reporter_personal_id ?? '—'}</span> <span className="muted">{r.reporter_name}</span></td>
                <td>{r.points}</td>
              </tr>
            ))}
            {reports && !reports.length && <tr><td colSpan={6} className="muted">No reports yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ReportSettingsForm({ onExpired }: { onExpired: () => void }) {
  const [config, setConfig] = useState<ReportConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const fail = (e: unknown) => {
    if (e instanceof AdminAuthError) onExpired()
    else setMessage({ ok: false, text: errorText(e) })
  }

  useEffect(() => {
    getReportConfig().then(setConfig, fail)
  }, [])

  if (!config) return message ? <div className="alert alert-error">{message.text}</div> : null

  const setReason = (code: string, points: number) => setConfig({ ...config, reasons: { ...config.reasons, [code]: points } })
  const setSetting = (key: keyof ReportConfig['settings'], value: number) =>
    setConfig({ ...config, settings: { ...config.settings, [key]: value } })

  async function save() {
    if (!config) return
    setBusy(true)
    setMessage(null)
    try {
      setConfig(await saveReportConfig(config))
      setMessage({ ok: true, text: 'Saved.' })
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-card">
      <h3>Report system</h3>
      <p className="muted">Points each report adds to the reported user (1–3).</p>
      <div className="admin-grid">
        {REPORT_REASONS.map((r) => (
          <div className="field" key={r.code}>
            <label htmlFor={`pts-${r.code}`}>{r.label}</label>
            <select id={`pts-${r.code}`} className="input" value={config.reasons[r.code] ?? 1} onChange={(e) => setReason(r.code, Number(e.target.value))}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'point' : 'points'}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="admin-grid">
        <div className="field">
          <label htmlFor="restrict-points">Points to get restricted</label>
          <input id="restrict-points" className="input" type="number" min={1} value={config.settings.restrict_points} onChange={(e) => setSetting('restrict_points', Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="ban-points">Points to get banned</label>
          <input id="ban-points" className="input" type="number" min={1} value={config.settings.ban_points} onChange={(e) => setSetting('ban_points', Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="decay-days">Days for 1 point to go down</label>
          <input id="decay-days" className="input" type="number" min={1} value={config.settings.decay_days} onChange={(e) => setSetting('decay_days', Number(e.target.value))} />
        </div>
      </div>
      {message && <div className={`alert ${message.ok ? 'alert-ok' : 'alert-error'}`}>{message.text}</div>}
      <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  )
}
