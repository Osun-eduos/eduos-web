import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { TermsPanel } from '../components/TermsPanel';
import { ErrorAlert, Field, formatDay } from '../components/ui';
import type { AcademicSession } from '../types';

export function Sessions() {
  const { user } = useAuth();
  const admin = user?.role === 'MINISTRY_ADMIN';
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<AcademicSession[]>('/sessions').then(setSessions).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}\/\d{4}$/.test(name)) return setError('Name the session like 2026/2027.');
    if (!start || !end) return setError('Enter the start and end dates.');
    setBusy(true);
    try {
      await api('/sessions', { method: 'POST', json: { name, startDate: start, endDate: end } });
      setName('');
      setStart('');
      setEnd('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the session.');
    } finally {
      setBusy(false);
    }
  }

  async function makeCurrent(id: string) {
    setError(null);
    try {
      await api(`/sessions/${id}/make-current`, { method: 'POST' });
      setConfirm(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Sessions and terms</h1>
          <p>Schools set up classes and place students in the current session. Changing the current session starts every school on a fresh set of classes.</p>
        </div>
      </div>
      <ErrorAlert error={error} />
      <div className="grid g2 mt">
        <div className="card">
          <h2>Sessions</h2>
          <div className="tbl">
            <table>
              <thead><tr><th>Session</th><th>Starts</th><th>Ends</th><th>Status</th><th /></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b></td>
                    <td>{formatDay(s.startDate)}</td>
                    <td>{formatDay(s.endDate)}</td>
                    <td>{s.isCurrent ? <span className="pill p-good">Current</span> : <span className="pill p-mut">Not current</span>}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {admin && !s.isCurrent &&
                        (confirm === s.id ? (
                          <span className="row actions">
                            <span className="small">Make {s.name} current for all schools?</span>
                            <button className="btn sm pri" onClick={() => makeCurrent(s.id)}>Yes</button>
                            <button className="btn sm" onClick={() => setConfirm(null)}>No</button>
                          </span>
                        ) : (
                          <button className="btn sm" onClick={() => setConfirm(s.id)}>Make current</button>
                        ))}
                    </td>
                  </tr>
                ))}
                {!sessions.length && <tr><td colSpan={5} className="muted">No sessions yet. Create the current one so schools can set up classes.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {admin && (
          <div className="card">
            <h2>New session</h2>
            <form className="form" onSubmit={create} noValidate>
              <Field label="Session" full hint="Two consecutive years, e.g. 2026/2027">
                <input id="sessionName" value={name} onChange={(e) => setName(e.target.value)} placeholder="2026/2027" />
              </Field>
              <Field label="First day">
                <input id="sessionStart" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Last day">
                <input id="sessionEnd" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
              <div className="full">
                <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create session'}</button>
              </div>
              <p className="full small muted">The first session you create becomes current automatically.</p>
            </form>
          </div>
        )}
      </div>
      {sessions.filter((s) => s.isCurrent).map((s) => <TermsPanel key={s.id} session={s} admin={admin} />)}
    </>
  );
}
