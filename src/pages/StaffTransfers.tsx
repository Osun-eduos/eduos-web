import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDate, formatDay, TransferPill } from '../components/ui';
import { CATEGORY_LABEL } from '../roles';
import type { StaffRequest } from '../types';

/** Requests to move staff between schools. Schools ask; the Ministry administrator approves or declines. */
export function StaffTransfers() {
  const { user } = useAuth();
  const [rows, setRows] = useState<StaffRequest[]>([]);
  const [status, setStatus] = useState('REQUESTED');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const load = useCallback(() => {
    api<StaffRequest[]>(`/staff-transfers${status ? `?status=${status}` : ''}`).then(setRows).catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function act(r: StaffRequest, action: 'approve' | 'reject' | 'cancel') {
    setError(null);
    setDone(null);
    try {
      await api(`/staff-transfers/${r.id}/${action}`, { method: 'POST', json: action === 'cancel' ? undefined : { note: notes[r.id] || undefined } });
      setDone(action === 'approve' ? `${r.staff?.fullName} now works at ${r.to?.name}.` : action === 'reject' ? 'Request declined.' : 'Request cancelled.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }

  if (!user) return null;
  const ministry = user.role === 'MINISTRY_ADMIN';
  return (
    <>
      <p className="small"><Link to="/staff">← Staff</Link></p>
      <div className="head">
        <div>
          <h1>Staff transfers</h1>
          <p>{ministry ? 'Schools ask to move staff; you approve or decline. Approving moves their record, and their sign-in account if linked, to the new school.' : user.role === 'SCHOOL_ADMIN' ? 'Ask for a transfer from a staff record. The Ministry approves it.' : 'Transfer requests in the schools you oversee.'}</p>
        </div>
        <label className="field">
          Show
          <select id="requestStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="REQUESTED">Waiting for a decision</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Declined</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="">All</option>
          </select>
        </label>
      </div>
      <ErrorAlert error={error} />
      {done && <div className="alert ok" style={{ marginBottom: 12 }}>{done}</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map((r) => (
          <div className="card" key={r.id} style={{ display: 'grid', gap: 8 }}>
            <div className="row between">
              <div>
                <h3><Link to={`/staff/${r.staff?.id}`}>{r.staff?.fullName}</Link></h3>
                <p className="small muted"><span className="mono">{r.staff?.staffNumber}</span> · {r.staff && CATEGORY_LABEL[r.staff.category]}{r.staff?.rank ? ` · ${r.staff.rank}` : ''}</p>
              </div>
              <TransferPill status={r.status} />
            </div>
            <p>From <b>{r.from?.name ?? '–'}</b> ({r.from?.lga}) to <b>{r.to?.name}</b> ({r.to?.lga}), from {formatDay(r.effectiveDate)}</p>
            <p className="small">{r.reason}</p>
            <p className="small muted">Requested {formatDate(r.requestedAt)} by {r.requestedBy}{r.decidedBy ? ` · decided by ${r.decidedBy}` : ''}{r.note ? ` · “${r.note}”` : ''}</p>
            {r.status === 'REQUESTED' && ministry && (
              <div className="row">
                <input className="inline" style={{ flex: '1 1 220px' }} aria-label="Note" placeholder="Note (optional)" value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                <button className="btn pri" onClick={() => act(r, 'approve')}>Approve transfer</button>
                <button className="btn danger" onClick={() => act(r, 'reject')}>Decline</button>
              </div>
            )}
            {r.status === 'REQUESTED' && user.role === 'SCHOOL_ADMIN' && r.from?.id === user.schoolId && (
              <div className="row"><button className="btn" onClick={() => act(r, 'cancel')}>Cancel request</button></div>
            )}
          </div>
        ))}
        {!rows.length && <div className="card muted">No transfer requests here.</div>}
      </div>
    </>
  );
}
