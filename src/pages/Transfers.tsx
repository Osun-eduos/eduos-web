import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDate, formatDay, TransferPill } from '../components/ui';
import { ageFrom } from '../roles';
import type { ClassArm, Transfer } from '../types';

function IncomingCard({ t, classes, onDone }: { t: Transfer; classes: ClassArm[]; onDone: (msg: string) => void }) {
  const [classId, setClassId] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function act(path: string, body: object, msg: string) {
    setError(null);
    try {
      await api(`/transfers/${t.id}/${path}`, { method: 'POST', json: body });
      onDone(msg);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }
  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <div className="row between">
        <div>
          <h3>{t.student.fullName}</h3>
          <p className="small muted">
            <span className="mono">{t.student.learnerId}</span> · {t.student.sex === 'F' ? 'Female' : 'Male'} · {ageFrom(t.student.dateOfBirth)} years
            {t.student.currentClass && <> · now in {t.student.currentClass}</>}
          </p>
        </div>
        <TransferPill status={t.status} />
      </div>
      <p>From <b>{t.fromSchool.name}</b> ({t.fromSchool.lga}) · {t.reason}</p>
      <p className="small muted">Requested {formatDate(t.requestedAt)} by {t.requestedBy}</p>
      <ErrorAlert error={error} />
      {rejecting ? (
        <div className="row">
          <input className="inline" style={{ flex: '1 1 220px' }} aria-label="Reason for declining" placeholder="Reason for declining (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn danger" onClick={() => act('reject', { note: note || undefined }, `Declined ${t.student.fullName}.`)}>Decline transfer</button>
          <button className="btn" onClick={() => setRejecting(false)}>Cancel</button>
        </div>
      ) : (
        <div className="row">
          <select className="inline" aria-label="Class to place the student in" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Place in a class later</option>
            {classes.map((c) => <option key={c.id} value={c.id} disabled={c.students >= c.capacity}>{c.name} · {c.students}/{c.capacity}</option>)}
          </select>
          <button className="btn pri" onClick={() => act('accept', { classArmId: classId || undefined }, `${t.student.fullName} has joined your school.`)}>Accept student</button>
          <button className="btn" onClick={() => setRejecting(true)}>Decline</button>
        </div>
      )}
    </div>
  );
}

export function Transfers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SCHOOL_ADMIN';
  const [rows, setRows] = useState<Transfer[]>([]);
  const [classes, setClasses] = useState<ClassArm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Transfer[]>('/transfers').then(setRows).catch((e) => setError(e.message));
    if (isAdmin) api<ClassArm[]>('/classes').then(setClasses).catch(() => {});
  }, [isAdmin]);
  useEffect(load, [load]);

  const incoming = rows.filter((t) => t.status === 'REQUESTED' && t.toSchool.id === user?.schoolId);
  const outgoing = rows.filter((t) => t.status === 'REQUESTED' && t.fromSchool.id === user?.schoolId);
  const history = isAdmin ? rows.filter((t) => !incoming.includes(t) && !outgoing.includes(t)) : rows;

  async function cancel(t: Transfer) {
    setError(null);
    try {
      await api(`/transfers/${t.id}/cancel`, { method: 'POST' });
      setMsg(`Cancelled the transfer of ${t.student.fullName}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Transfers</h1>
          <p>Students moving between Osun schools. The sending school starts a transfer from the student's record; the receiving school accepts it here.</p>
        </div>
      </div>
      <ErrorAlert error={error} />
      {msg && <div className="alert ok" style={{ marginBottom: 14 }}>{msg}</div>}

      {isAdmin && (
        <>
          <h2 style={{ margin: '6px 0 10px' }}>Waiting for you {incoming.length > 0 && <span className="pill p-warn">{incoming.length}</span>}</h2>
          {incoming.length ? (
            <div className="grid g2">{incoming.map((t) => <IncomingCard key={t.id} t={t} classes={classes} onDone={(m) => { setMsg(m); load(); }} />)}</div>
          ) : (
            <p className="muted">No students are waiting to join your school.</p>
          )}
          {outgoing.length > 0 && (
            <div className="card mt">
              <h2>Sent, waiting for the other school</h2>
              <table><tbody>
                {outgoing.map((t) => (
                  <tr key={t.id}>
                    <td><Link to={`/students/${t.student.id}`}>{t.student.fullName}</Link><br /><span className="mono small">{t.student.learnerId}</span></td>
                    <td>to <b>{t.toSchool.name}</b><br /><span className="small muted">{t.reason}</span></td>
                    <td className="small">{formatDay(t.requestedAt)}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn sm" onClick={() => cancel(t)}>Cancel</button></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </>
      )}

      <div className="card mt">
        <h2>{isAdmin ? 'History' : 'All transfers'}</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Requested</th><th>Student</th><th>From</th><th>To</th><th>Status</th><th>Decided</th></tr></thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id}>
                  <td className="small">{formatDay(t.requestedAt)}</td>
                  <td>{t.student.fullName}<br /><span className="mono small">{t.student.learnerId}</span></td>
                  <td>{t.fromSchool.name}</td>
                  <td>{t.toSchool.name}</td>
                  <td><TransferPill status={t.status} />{t.note && <><br /><span className="small muted">{t.note}</span></>}</td>
                  <td className="small">{t.decidedAt ? `${formatDay(t.decidedAt)}${t.decidedBy ? ` · ${t.decidedBy}` : ''}` : '–'}</td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={6} className="muted">No transfers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
