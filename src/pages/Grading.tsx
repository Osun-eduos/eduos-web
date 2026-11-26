import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';

interface Band { min: number; grade: string; remark: string }
type Key = 'BASIC' | 'SSS';
interface Grading { scales: Record<Key, Band[]>; defaults: Record<Key, Band[]>; passMark: number; creditMark: number }

const SCALES: { key: Key; label: string; note: string }[] = [
  { key: 'BASIC', label: 'Basic education (primary and JSS) · A to F', note: 'Primary and junior secondary classes, and senior secondary when a term uses A to F.' },
  { key: 'SSS', label: 'Senior secondary · A1 to F9', note: 'Senior secondary classes in terms that use the WAEC scale.' },
];

/** The range each band covers, highest first: 70–100, 60–69 and so on. */
const ranges = (bands: Band[]) => {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return new Map(sorted.map((b, i) => [b, `${b.min}–${i === 0 ? 100 : sorted[i - 1].min - 1}`]));
};

/** The Ministry sets the grade boundaries every school uses. Changes apply at once everywhere grades appear. */
export function GradingPage() {
  const { user } = useAuth();
  const admin = user?.role === 'MINISTRY_ADMIN';
  const [data, setData] = useState<Grading | null>(null);
  const [key, setKey] = useState<Key>('BASIC');
  const [draft, setDraft] = useState<Record<Key, Band[]> | null>(null);
  const [check, setCheck] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Grading>('/grading').then((g) => { setData(g); setDraft(structuredClone(g.scales)); }).catch((e) => setError(e.message));
  }, []);

  if (!data || !draft) return <><ErrorAlert error={error} /><p className="muted">Loading…</p></>;
  const bands = draft[key];
  const changed = JSON.stringify(draft) !== JSON.stringify(data.scales);
  const setBand = (i: number, patch: Partial<Band>) => setDraft({ ...draft, [key]: bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  const range = ranges(bands);
  const n = Number(check);
  const hit = check !== '' && n >= 0 && n <= 100 ? sorted.find((b) => n >= b.min) : null;

  async function save(reset = false) {
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const g = reset ? await api<Grading>('/grading', { method: 'DELETE' }) : await api<Grading>('/grading', { method: 'PUT', json: draft });
      setData(g);
      setDraft(structuredClone(g.scales));
      setNote(reset ? 'The standard scales are back in use.' : 'Saved. Score sheets, report cards, class analysis and exam records now use these grades.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the grading system.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Grading system</h1>
          <p>The grade boundaries every school uses. Saved changes apply at once to score sheets, report cards, class analysis and exam records, including past terms. The pass mark stays at {data.passMark}.</p>
        </div>
      </div>
      <ErrorAlert error={error} />
      {note && <div className="alert ok" style={{ marginBottom: 12 }}>{note}</div>}
      <div className="grid g2">
        <div className="card">
          <div className="seg" role="tablist" style={{ marginBottom: 12 }}>
            {SCALES.map((s) => <button key={s.key} role="tab" aria-selected={key === s.key} className={key === s.key ? 'on' : ''} onClick={() => setKey(s.key)}>{s.label}</button>)}
          </div>
          <p className="small muted" style={{ marginBottom: 10 }}>{SCALES.find((s) => s.key === key)!.note}</p>
          <div className="tbl">
            <table>
              <thead><tr><th>Minimum score</th><th>Grade</th><th>Remark</th><th>Range</th>{admin && <th />}</tr></thead>
              <tbody>
                {bands.map((b, i) => (
                  <tr key={i}>
                    <td>{admin ? <input className="inline" style={{ width: 70 }} type="number" min={0} max={100} aria-label={`Minimum score for grade ${b.grade}`} value={b.min} onChange={(e) => setBand(i, { min: Number(e.target.value) })} /> : b.min}</td>
                    <td>{admin ? <input className="inline" style={{ width: 60 }} maxLength={3} aria-label="Grade" value={b.grade} onChange={(e) => setBand(i, { grade: e.target.value.toUpperCase() })} /> : <b>{b.grade}</b>}</td>
                    <td>{admin ? <input className="inline" maxLength={20} aria-label={`Remark for grade ${b.grade}`} value={b.remark} onChange={(e) => setBand(i, { remark: e.target.value })} /> : b.remark}</td>
                    <td className="small muted">{range.get(b)}</td>
                    {admin && <td><button className="btn sm" disabled={bands.length <= 2} onClick={() => setDraft({ ...draft, [key]: bands.filter((_, j) => j !== i) })}>Remove</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {admin && (
            <div className="row mt">
              <button className="btn" disabled={bands.length >= 12} onClick={() => setDraft({ ...draft, [key]: [...bands, { min: 0, grade: '', remark: '' }] })}>Add a grade</button>
              <span style={{ flex: 1 }} />
              <button className="btn" disabled={!changed || busy} onClick={() => setDraft(structuredClone(data.scales))}>Discard changes</button>
              <button className="btn pri" disabled={!changed || busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save grading system'}</button>
            </div>
          )}
        </div>
        <div className="card">
          <h2>Check a score</h2>
          <label className="field">
            Score out of 100, on the scale shown
            <input id="checkScore" type="number" min={0} max={100} value={check} onChange={(e) => setCheck(e.target.value)} />
          </label>
          <p className="mt" style={{ fontSize: '1.4rem', fontWeight: 700 }} aria-live="polite">{hit ? `${hit.grade} · ${hit.remark}` : '–'}</p>
          {admin && (
            <>
              <h2 className="mt">Standard scales</h2>
              <p className="small muted">The A to F and WAEC scales EduOS started with. Going back to them replaces both scales.</p>
              <button className="btn mt" disabled={busy} onClick={() => save(true)}>Use the standard scales</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
