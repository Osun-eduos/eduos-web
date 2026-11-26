import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { ErrorAlert, formatDate, formatWeekday, todayNG } from '../components/ui';
import { CATEGORY_LABEL } from '../roles';

type Mark = 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE';
const MARKS: { key: Mark; short: string; label: string }[] = [
  { key: 'PRESENT', short: 'P', label: 'Present' },
  { key: 'LATE', short: 'L', label: 'Late' },
  { key: 'ABSENT', short: 'A', label: 'Absent' },
  { key: 'LEAVE', short: 'Lv', label: 'On leave' },
];
interface Register {
  date: string; holiday: string | null; weekend: boolean; editable: boolean; lateAfter: string;
  summary: { staff: number; marked: number } & Record<Mark, number>;
  staff: { staffId: string; staffNumber: string; fullName: string; category: 'TEACHING' | 'NON_TEACHING'; rank: string | null; onLeave: boolean; status: Mark | null; clockedInAt: string | null }[];
}

/** The school's daily staff register. Teachers who clock in from the app or the website are already marked. */
export function StaffRegister() {
  const [date, setDate] = useState(todayNG());
  const [data, setData] = useState<Register | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setNote(null);
    api<Register>(`/staff-attendance?date=${date}`)
      .then((r) => {
        setData(r);
        setMarks(Object.fromEntries(r.staff.filter((s) => s.status).map((s) => [s.staffId, s.status!])));
      })
      .catch((e) => setError(e.message));
  }, [date]);
  useEffect(load, [load]);

  const unmarked = data?.staff.filter((s) => !marks[s.staffId]) ?? [];
  const changed = data?.staff.some((s) => (marks[s.staffId] ?? null) !== s.status);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const r = await api<Register>('/staff-attendance', { method: 'PUT', json: { date, marks: Object.entries(marks).map(([staffId, status]) => ({ staffId, status })) } });
      setData(r);
      setNote('Staff register saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the register.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Staff register</h1>
          <p>Mark who is in each school day. Teachers who clock in from the app or the website are marked present, or late after {data?.lateAfter ?? '08:00'}. You can correct the last 14 days.</p>
        </div>
        <label className="field">
          Day
          <input id="staffDay" type="date" max={todayNG()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <ErrorAlert error={error} />
      {note && <div className="alert ok" style={{ marginBottom: 12 }}>{note}</div>}
      {data && (data.holiday || data.weekend) && <div className="alert info" style={{ marginBottom: 12 }}>{formatWeekday(date)} is {data.holiday ? `a public holiday (${data.holiday})` : 'a weekend'}.</div>}
      <div className="grid g4">
        {MARKS.map((m) => <div key={m.key} className="card kpi"><div className="k">{m.label}</div><div className="v">{Object.values(marks).filter((x) => x === m.key).length}</div></div>)}
      </div>
      <div className="card mt">
        <div className="row between" style={{ marginBottom: 8 }}>
          <span className="small muted">{data ? `${data.staff.length - unmarked.length} of ${data.staff.length} marked` : ''}</span>
          {data?.editable && unmarked.length > 0 && <button className="btn sm" onClick={() => setMarks((m) => ({ ...m, ...Object.fromEntries(unmarked.map((s) => [s.staffId, s.onLeave ? 'LEAVE' : 'PRESENT'])) }))}>Mark the rest present</button>}
        </div>
        <div className="tbl">
          <table>
            <thead><tr><th>Name</th><th>Staff no.</th><th>Role</th><th>Clocked in</th><th>Mark</th></tr></thead>
            <tbody>
              {data?.staff.map((s) => (
                <tr key={s.staffId}>
                  <td>{s.fullName}{s.onLeave && <span className="pill p-mut" style={{ marginLeft: 6 }}>On leave</span>}</td>
                  <td className="mono small">{s.staffNumber}</td>
                  <td className="small">{s.rank ?? CATEGORY_LABEL[s.category]}</td>
                  <td className="small">{s.clockedInAt ? formatDate(s.clockedInAt) : '–'}</td>
                  <td>
                    <div className="seg" role="group" aria-label={`Attendance for ${s.fullName}`}>
                      {MARKS.map((m) => (
                        <button key={m.key} type="button" className={m.key === 'LEAVE' ? 'EXCUSED' : m.key} title={m.label} aria-pressed={marks[s.staffId] === m.key} disabled={!data.editable} onClick={() => setMarks((x) => ({ ...x, [s.staffId]: m.key }))}>{m.short}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {data && !data.staff.length && <tr><td colSpan={5} className="muted">No staff in the registry yet.</td></tr>}
            </tbody>
          </table>
        </div>
        {data?.editable && (
          <div className="row mt" style={{ justifyContent: 'flex-end' }}>
            <button className="btn pri" disabled={busy || !changed} onClick={save}>{busy ? 'Saving…' : 'Save staff register'}</button>
          </div>
        )}
      </div>
    </>
  );
}

/** Clock-in for a signed-in teacher or administrator with a staff record. */
export function ClockIn() {
  const [state, setState] = useState<{ linked: boolean; today: { status: Mark; clockedInAt: string | null } | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<typeof state>('/staff-attendance/me').then(setState).catch(() => {});
  }, []);
  if (!state?.linked) return null;
  async function clockIn() {
    setError(null);
    try {
      const r = await api<{ status: Mark; clockedInAt: string | null }>('/staff-attendance/clock-in', { method: 'POST' });
      setState({ linked: true, today: r });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not clock in.');
    }
  }
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="clock">
        <b>Today</b>
        {state.today ? (
          <span>You are marked <b>{MARKS.find((m) => m.key === state.today!.status)?.label.toLowerCase()}</b>{state.today.clockedInAt ? ` · clocked in ${formatDate(state.today.clockedInAt)}` : ''}.</span>
        ) : (
          <>
            <span className="muted">You have not clocked in yet.</span>
            <button className="btn pri sm" onClick={clockIn}>Clock in</button>
          </>
        )}
      </div>
      <ErrorAlert error={error} />
    </div>
  );
}
