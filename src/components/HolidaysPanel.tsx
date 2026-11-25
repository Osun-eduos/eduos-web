import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { AcademicSession, Holiday } from '../types';
import { ErrorAlert, Field, formatDay } from './ui';

/** Public holidays and other state-wide non-school days in a session. Registers are not expected on these days. */
export function HolidaysPanel({ session, admin }: { session: AcademicSession; admin: boolean }) {
  const [rows, setRows] = useState<Holiday[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Holiday[]>(`/holidays?sessionId=${session.id}`).then(setRows).catch((e) => setError(e.message));
  }, [session.id]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) return setError('Give the holiday a name.');
    if (!start) return setError('Choose the date.');
    run(async () => {
      const r = await api<Holiday & { registersAlreadyTaken: number }>('/holidays', { method: 'POST', json: { name: name.trim(), startDate: start, endDate: end || undefined } });
      setName('');
      setStart('');
      setEnd('');
      if (r.registersAlreadyTaken) setNote(`${r.registersAlreadyTaken} register${r.registersAlreadyTaken === 1 ? ' was' : 's were'} already taken on ${r.startDate === r.endDate ? 'that day' : 'those days'}. They are kept.`);
    });
  };

  const national = () =>
    run(async () => {
      const r = await api<{ added: string[] }>('/holidays/national', { method: 'POST', json: { sessionId: session.id } });
      setNote(r.added.length ? `Added ${r.added.join(', ')}.` : 'The national holidays for this session are already set.');
    });

  return (
    <div className="card mt">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Holidays in {session.name}</h2>
        {admin && <button className="btn sm" disabled={busy} onClick={national}>Add national holidays</button>}
      </div>
      <p className="muted small" style={{ marginBottom: 12 }}>
        Schools don't take registers on these days, on the teacher app or the web. {admin && 'National holidays adds the fixed-date federal holidays, Good Friday and Easter Monday. Add the Sallah and Maulud holidays, state holidays and any replacement days when they are announced.'}
      </p>
      <ErrorAlert error={error} />
      {note && <div className="alert info" style={{ marginBottom: 12 }}>{note}</div>}
      <div className="tbl">
        <table>
          <thead><tr><th>Holiday</th><th>Date</th><th /></tr></thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <td><b>{h.name}</b></td>
                <td>{formatDay(h.startDate)}{h.endDate !== h.startDate && <> to {formatDay(h.endDate)}</>}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {admin &&
                    (confirm === h.id ? (
                      <span className="row actions">
                        <span className="small">Remove {h.name}?</span>
                        <button className="btn sm danger" onClick={() => run(async () => { await api(`/holidays/${h.id}`, { method: 'DELETE' }); setConfirm(null); })}>Yes</button>
                        <button className="btn sm" onClick={() => setConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <button className="btn sm" onClick={() => setConfirm(h.id)}>Remove</button>
                    ))}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3} className="muted">No holidays set for this session.</td></tr>}
          </tbody>
        </table>
      </div>
      {admin && (
        <form className="form mt" onSubmit={add} noValidate>
          <Field label="Holiday" full hint="e.g. Eid al-Fitr, Isese Day, mid-term break">
            <input id="holidayName" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Date">
            <input id="holidayStart" type="date" value={start} min={session.startDate} max={session.endDate} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Last day" hint="Only for holidays longer than one day">
            <input id="holidayEnd" type="date" value={end} min={start || session.startDate} max={session.endDate} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <div className="full">
            <button className="btn pri" type="submit" disabled={busy}>Add holiday</button>
          </div>
        </form>
      )}
    </div>
  );
}
