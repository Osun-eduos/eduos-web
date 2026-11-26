import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { HolidaysPanel } from '../components/HolidaysPanel';
import { TermsPanel } from '../components/TermsPanel';
import { ErrorAlert, Field, formatDay, todayNG } from '../components/ui';
import type { AcademicSession } from '../types';

/** Term dates from the first day: each term runs Monday to Friday for its weeks, then the break (as the API does it). */
function planTerms(start: string, weeks: number[], breakWeeks: number) {
  const add = (iso: string, d: number) => new Date(Date.parse(iso) + d * 86_400_000).toISOString().slice(0, 10);
  let from = start;
  return weeks.map((w) => {
    const end = add(from, w * 7 - 3);
    const t: [string, string] = [from, end];
    from = add(end, 3 + breakWeeks * 7);
    return t;
  });
}

export function Sessions() {
  const { user } = useAuth();
  const admin = user?.role === 'MINISTRY_ADMIN';
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [withTerms, setWithTerms] = useState(true);
  const [weeks, setWeeks] = useState([13, 12, 12]);
  const [breakWeeks, setBreakWeeks] = useState(3);
  const [busy, setBusy] = useState(false);
  const plan = withTerms && start ? planTerms(start, weeks, breakWeeks) : null;

  const load = useCallback(() => {
    api<AcademicSession[]>('/sessions').then(setSessions).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}\/\d{4}$/.test(name)) return setError('Name the session like 2026/2027.');
    if (!start || (!end && !withTerms)) return setError(withTerms ? 'Enter the first day of the first term.' : 'Enter the start and end dates.');
    setBusy(true);
    try {
      await api('/sessions', { method: 'POST', json: { name, startDate: start, ...(end ? { endDate: end } : {}), ...(withTerms ? { terms: { weeks, breakWeeks } } : {}) } });
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
              <label className="full row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={withTerms} onChange={(e) => setWithTerms(e.target.checked)} /> Create the three terms as well
              </label>
              <Field label={withTerms ? 'First term starts' : 'First day'}>
                <input id="sessionStart" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Last day" hint={withTerms ? 'Optional: the session ends with the third term.' : undefined}>
                <input id="sessionEnd" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
              {withTerms && (
                <>
                  <div className="field">
                    Weeks per term
                    <span className="row" style={{ gap: 4 }}>
                      {weeks.map((w, i) => (
                        <input key={i} className="inline" style={{ width: 60 }} type="number" min={8} max={16} aria-label={`Weeks in term ${i + 1}`} value={w} onChange={(e) => setWeeks((ws) => ws.map((x, j) => (j === i ? Number(e.target.value) : x)))} />
                      ))}
                    </span>
                  </div>
                  <Field label="Break between terms (weeks)">
                    <input id="breakWeeks" type="number" min={1} max={8} value={breakWeeks} onChange={(e) => setBreakWeeks(Number(e.target.value))} />
                  </Field>
                  {plan && (
                    <ul className="full small muted" style={{ margin: 0, paddingLeft: 18 }}>
                      {plan.map((t, i) => <li key={i}>{['First', 'Second', 'Third'][i]} term: {formatDay(t[0])} to {formatDay(t[1])}</li>)}
                    </ul>
                  )}
                </>
              )}
              <div className="full">
                <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create session'}</button>
              </div>
              <p className="full small muted">The first session you create becomes current automatically.</p>
            </form>
          </div>
        )}
      </div>
      {sessions.filter((s) => s.isCurrent || s.startDate > todayNG()).map((s) => (
        <div key={s.id}>
          <TermsPanel session={s} admin={admin} />
          <HolidaysPanel session={s} admin={admin} />
        </div>
      ))}
    </>
  );
}
