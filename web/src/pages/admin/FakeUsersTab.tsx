import { useState } from 'react'
import { deleteFakeUser, FAKE_EMAIL, getFakeUsers, setHidden, type FakeUser } from '../../lib/admin'
import { errorText } from '../../lib/api'
import { EditIcon, EyeOffIcon, TrashIcon } from '../../components/Icons'
import Modal from '../../components/Modal'
import FakeProfileModal from './FakeProfileModal'
import { useAdminData } from './useAdminData'

export default function FakeUsersTab({ onExpired }: { onExpired: () => void }) {
  const { data: users, error, refresh } = useAdminData(getFakeUsers, 10000, onExpired)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [toDelete, setToDelete] = useState<FakeUser | null>(null)
  const [editing, setEditing] = useState<FakeUser | 'new' | null>(null)

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
    await act(toDelete.id, () => deleteFakeUser(toDelete.id))
    setToDelete(null)
  }

  return (
    <section>
      <h2>Fake users</h2>
      <div className="admin-fake-head">
        <div className="admin-stats">
          <div className="admin-stat"><span>Fake accounts</span><strong>{users?.length ?? '—'}</strong></div>
          <div className="admin-stat"><span>Active fake accounts</span><strong>{users?.filter((u) => !u.hidden).length ?? '—'}</strong></div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>Create fake profile</button>
      </div>
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
              return (
                <tr key={u.id} className={u.hidden ? 'is-hidden' : ''}>
                  <td className="mono">{u.personal_id ?? '—'}</td>
                  <td>{u.name}</td>
                  <td>{FAKE_EMAIL}</td>
                  <td>{u.phone || '—'}</td>
                  <td>{u.location}</td>
                  <td>{u.age}</td>
                  <td>Free</td>
                  <td>{u.reports}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="icon-btn"
                        title="Edit profile"
                        aria-label={`Edit ${u.name}`}
                        disabled={busy}
                        onClick={() => setEditing(u)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className={`icon-btn${u.hidden ? ' on' : ''}`}
                        title={u.hidden ? 'Unhide' : 'Hide'}
                        aria-label={u.hidden ? `Unhide ${u.name}` : `Hide ${u.name}`}
                        disabled={busy}
                        onClick={() => act(u.id, () => setHidden(u.id, !u.hidden))}
                      >
                        <EyeOffIcon />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Delete profile"
                        aria-label={`Delete ${u.name}`}
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
            {users && !users.length && <tr><td colSpan={9} className="muted">No fake users yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && (
        <FakeProfileModal
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void refresh()
          }}
        />
      )}
      {toDelete && (
        <Modal title="Delete this profile?" onClose={() => busyId === null && setToDelete(null)}>
          <p className="muted">
            {toDelete.name} — profile, photos, likes, messages and reports will be permanently deleted.
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
