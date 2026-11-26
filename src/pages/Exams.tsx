import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDay } from '../components/ui';
import { levelLabel } from '../roles';
import type { Term } from '../types';

interface Paper { subjectCode: string; subject?: string; date: string; startTime: string; minutes: number }
interface Timetable { term: { id: string; name: string; session: string; startDate: string; endDate: string }; level: string; levelName: string; papers: Paper[] }
type Row = { code: string; name: string; sit: boolean; date: string; startTime: string; minutes: number };

/** A class level's examination timetable for the term, with the score split the Ministry set. Schools edit; teachers view. */
export function Exams() {
  const { user } = useAuth();
  const admin = user?.role === 'SCHOOL_ADMIN';
  const [levels, setLevels] = useState<string[]>([]);
  const [level, setLevel] = useState('');
  const [term, setTerm] = useState<Term | null>(null);
  const [data, setData] = useState<Timetable | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Term | null>('/terms/current').then(setTerm).catch(() => {});
    if (admin) api<string[]>('/classes/levels').then((l) => { setLevels(l); setLevel(l[0] ?? ''); }).catch((e) => setError(e.message));
    else api<{ level: string }[]>('/classes').then((cs) => { const l = [...new Set(cs.map((c) => c.level))].sort(); setLevels(l); setLevel(l[0] ?? ''); }).catch((e) => setError(e.message));
  }, [admin]);

  useEffect(() => {
    if (!level) return;
    setNote(null);
    Promise.all([api<Timetable>(`/exam-papers?level=${level}`), api<{ code: string; name: string }[]>(`/subjects?level=${level}`)])
      .then(([t, subjects]) => {
        setData(t);
        const byCode = new Map(t.papers.map((p) => [p.subjectCode, p]));
        const list = subjects.map((s) => {
          const p = byCode.get(s.code);
          return { code: s.code, name: s.name, sit: !!p, date: p?.date ?? '', startTime: p?.startTime ?? '09:00', minutes: p?.minutes ?? 90 };
        });
        list.sort((a, b) => Number(b.sit) - Number(a.sit) || (a.date || '9').localeCompare(b.date || '9') || a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name));
        setRows(list);
      })
      .catch((e) => setError(e.message));
  }, [level]);

  const set = (code: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.code === code ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.sit);
  const dates = chosen.map((r) => r.date).filter(Boolean).sort();

  async function save() {
    setError(null);
    setNote(null);
    const missing = chosen.find((r) => !r.date || !r.startTime);
    if (missing) return setError(`Give ${missing.name} a date and start time.`);
    setBusy(true);
    try {
      const t = await api<Timetable>('/exam-papers', { method: 'PUT', json: { level, papers: chosen.map((r) => ({ subjectCode: r.code, date: r.date, startTime: r.startTime, minutes: Number(r.minutes) })) } });
      setData(t);
      setNote(`Saved. Parents of ${levelLabel(level)} students can see the timetable.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the timetable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Exam timetable{data ? ` · ${data.levelName}, ${data.term.name}` : ''}</h1>
          <p>The examination timetable for each class level. Parents see their child's timetable in the portal and the app.</p>
        </div>
        <label className="field">
          Class level
          <select id="examLevel" value={level} onChange={(e) => setLevel(e.target.value)}>
            {levels.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
          </select>
        </label>
      </div>
      <ErrorAlert error={error} />
      {note && <div className="alert ok" style={{ marginBottom: 12 }}>{note}</div>}
      <div className="grid g2">
        <div className="card">
          <h2>Assessment weighting</h2>
          <p className="small muted">Set by the Ministry for {term ? `the ${term.name.toLowerCase()} of ${term.session.name}` : 'the term'}. Score sheets, the mobile app and report cards use it.</p>
          <div className="tbl mt">
            <table>
              <thead><tr><th>Component</th><th className="num">Marks</th></tr></thead>
              <tbody>
                {term?.components.map((c) => <tr key={c.key}><td>{c.label}</td><td className="num">{c.max}</td></tr>)}
                <tr style={{ fontWeight: 700 }}><td>Total</td><td className="num">{term?.components.reduce((s, c) => s + c.max, 0) ?? '–'}</td></tr>
              </tbody>
            </table>
          </div>
          <h2 className="mt">Examination window</h2>
          <p>{dates.length ? `${formatDay(dates[0])} to ${formatDay(dates[dates.length - 1])}` : 'No papers set yet.'}</p>
          {data && <p className="small muted">The term runs {formatDay(data.term.startDate)} to {formatDay(data.term.endDate)}.</p>}
        </div>
        <div className="card">
          <h2>Timetable</h2>
          {!chosen.length && <p className="muted small">No papers yet.</p>}
          <ul className="items">
            {[...chosen].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).map((r) => (
              <li key={r.code}><b>{r.name}</b><span className="small muted">{r.date ? formatDay(r.date) : 'No date'} · {r.startTime} · {r.minutes} min</span></li>
            ))}
          </ul>
        </div>
      </div>
      {admin && (
        <div className="card mt">
          <h2>Subjects and papers</h2>
          <p className="small muted" style={{ marginBottom: 8 }}>Tick the subjects that sit a paper, then set the date, start time and length. Papers for the same class cannot overlap.</p>
          <div className="tbl">
            <table>
              <thead><tr><th>Sits</th><th>Subject</th><th>Date</th><th>Start</th><th>Minutes</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <td><input type="checkbox" aria-label={`${r.name} sits a paper`} checked={r.sit} onChange={(e) => set(r.code, { sit: e.target.checked })} /></td>
                    <td>{r.name}</td>
                    <td><input className="inline" type="date" aria-label={`${r.name} date`} disabled={!r.sit} min={data?.term.startDate} max={data?.term.endDate} value={r.date} onChange={(e) => set(r.code, { date: e.target.value })} /></td>
                    <td><input className="inline" type="time" aria-label={`${r.name} start`} disabled={!r.sit} value={r.startTime} onChange={(e) => set(r.code, { startTime: e.target.value })} /></td>
                    <td><input className="inline" style={{ width: 70 }} type="number" min={15} max={240} step={15} aria-label={`${r.name} minutes`} disabled={!r.sit} value={r.minutes} onChange={(e) => set(r.code, { minutes: Number(e.target.value) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row mt" style={{ justifyContent: 'flex-end' }}>
            <button className="btn pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save exam timetable'}</button>
          </div>
        </div>
      )}
    </>
  );
}
