import { useState } from 'react'
import { deleteUser, getUsers, setBanned, setRestricted, type AdminUser } from '../../lib/admin'
import { errorText } from '../../lib/api'
import { BanIcon, RestrictIcon, TrashIcon } from '../../components/Icons'
import Modal from '../../components/Modal'
import { useAdminData } from './useAdminData'

export default function UsersTab({ onExpired }: { onExpired: () => void }) {
  const { data: users, error, refresh } = useAdminData(getUsers, 10000, onExpired)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [toDelete, setToDelete] = useState<AdminUser | null>(null)

  async function act(id: string, action: () => Promise<unknown>) {
    setBusyId(id)
    setActionError('')
    try {
      await action()
      await refresh()
    } catch (e) {
      setActionError(errorText(e))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    await act(toDelete.id, () => deleteUser(toDelete.id))
    setToDelete(null)
  }

  return (
    <section>
      <h2>Users</h2>
      {(error || actionError) && <div className="alert alert-error">{actionError || error}</div>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID number</th><th>Name</th><th>Email</th><th>Phone</th><th>Location</th><th>Age</th>
              <th>Subscription</th><th>Reports</th><th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => {
              const busy = busyId === u.id
              const hasProfile = u.name !== null
              return (
                <tr key={u.id} className={u.banned ? 'is-banned' : u.restricted ? 'is-restricted' : ''}>
                  <td className="mono">{u.personal_id ?? '—'}</td>
                  <td>{u.name ?? <span className="muted">No profile yet</span>}</td>
                  <td>{u.email ?? '—'}</td>
                  <td>{u.phone || '—'}</td>
                  <td>{u.location ?? '—'}</td>
                  <td>{u.age ?? '—'}</td>
                  <td>Free</td>
                  <td>{u.reports}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className={`icon-btn${u.restricted ? ' on' : ''}`}
                        title={u.restricted ? 'Unrestrict' : 'Restrict'}
                        aria-label={u.restricted ? `Unrestrict ${u.name}` : `Restrict ${u.name}`}
                        disabled={busy || !hasProfile}
                        onClick={() => act(u.id, () => setRestricted(u.id, !u.restricted))}
                      >
                        <RestrictIcon />
                      </button>
                      <button
                        className={`icon-btn${u.banned ? ' on' : ''}`}
                        title={u.banned ? 'Unban' : 'Ban'}
                        aria-label={u.banned ? `Unban ${u.name}` : `Ban ${u.name}`}
                        disabled={busy || !hasProfile}
                        onClick={() => act(u.id, () => setBanned(u.id, !u.banned))}
                      >
                        <BanIcon />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Delete profile"
                        aria-label={`Delete ${u.name ?? u.email}`}
                        disabled={busy}
                        onClick={() => setToDelete(u)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {users && !users.length && <tr><td colSpan={9} className="muted">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {toDelete && (
        <Modal title="Delete this profile?" onClose={() => busyId === null && setToDelete(null)}>
          <p className="muted">
            {toDelete.name ?? toDelete.email} — profile, photos, likes, messages and reports will be permanently deleted.
          </p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setToDelete(null)} disabled={busyId !== null}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDelete} disabled={busyId !== null}>
              {busyId ? 'Deleting…' : 'Delete forever'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
