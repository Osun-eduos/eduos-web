import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { AcademicSession, Component, SssGrading, Term } from '../types';
import { ErrorAlert, Field, formatDay } from './ui';

const DEFAULT: Component[] = [
  { key: 'CA1', label: 'CA 1', max: 20 },
  { key: 'CA2', label: 'CA 2', max: 20 },
  { key: 'EXAM', label: 'Exam', max: 60 },
];

export const SSS_GRADING_LABEL: Record<SssGrading, string> = { WAEC: 'WAEC (A1 to F9)', BASIC: 'A to F' };

const splitText = (c: Component[]) => c.map((x) => `${x.label} ${x.max}`).join(' · ');

/** Terms of the current session: dates, score split, positions on report cards, and which term is current. */
export function TermsPanel({ session, admin }: { session: AcademicSession; admin: boolean }) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState(1);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [components, setComponents] = useState<Component[]>(DEFAULT);
  const [showPositions, setShowPositions] = useState(true);
  const [sssGrading, setSssGrading] = useState<SssGrading>('WAEC');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Term[]>(`/terms?sessionId=${session.id}`)
      .then((t) => {
        setTerms(t);
        setNumber([1, 2, 3].find((n) => !t.some((x) => x.number === n)) ?? 1);
      })
      .catch((e) => setError(e.message));
  }, [session.id]);
  useEffect(load, [load]);

  const total = components.reduce((s, c) => s + (Number(c.max) || 0), 0);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!start || !end) return setError('Enter the first and last day of the term.');
    if (total !== 100) return setError(`The score split must add up to 100 (it adds up to ${total}).`);
    setBusy(true);
    try {
      await api('/terms', { method: 'POST', json: { sessionId: session.id, number, startDate: start, endDate: end, components, showPositions, sssGrading } });
      setStart('');
      setEnd('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the term.');
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, body?: object) {
    setError(null);
    try {
      await api(path, { method: body ? 'PATCH' : 'POST', json: body });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }

  const setComp = (i: number, patch: Partial<Component>) => setComponents((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <div className="card mt">
      <h2>Terms in {session.name}</h2>
      <p className="small muted" style={{ marginBottom: 10 }}>Teachers enter scores in the current term. The score split can change until scores are entered; senior secondary grading can change until SSS results are released.</p>
      <ErrorAlert error={error} />
      <div className="tbl">
        <table>
          <thead><tr><th>Term</th><th>Dates</th><th>Score split</th><th>Positions on report cards</th><th>Senior secondary grading</th><th>Status</th><th /></tr></thead>
          <tbody>
            {terms.map((t) => (
              <tr key={t.id}>
                <td><b>{t.name}</b></td>
                <td className="small">{formatDay(t.startDate)} to {formatDay(t.endDate)}</td>
                <td className="small">{splitText(t.components)}</td>
                <td>
                  {admin ? (
                    <label className="row small" style={{ gap: 6 }}>
                      <input type="checkbox" checked={t.showPositions} onChange={(e) => act(`/terms/${t.id}`, { showPositions: e.target.checked })} />
                      {t.showPositions ? 'Shown' : 'Hidden'}
                    </label>
                  ) : t.showPositions ? 'Shown' : 'Hidden'}
                </td>
                <td>
                  {admin ? (
                    <select className="inline" aria-label={`Senior secondary grading for ${t.name}`} value={t.sssGrading} onChange={(e) => act(`/terms/${t.id}`, { sssGrading: e.target.value })}>
                      <option value="WAEC">{SSS_GRADING_LABEL.WAEC}</option>
                      <option value="BASIC">{SSS_GRADING_LABEL.BASIC}</option>
                    </select>
                  ) : SSS_GRADING_LABEL[t.sssGrading]}
                </td>
                <td>{t.isCurrent ? <span className="pill p-good">Current</span> : <span className="pill p-mut">Not current</span>}</td>
                <td style={{ textAlign: 'right' }}>{admin && !t.isCurrent && session.isCurrent && <button className="btn sm" onClick={() => act(`/terms/${t.id}/make-current`)}>Make current</button>}</td>
              </tr>
            ))}
            {!terms.length && <tr><td colSpan={7} className="muted">No terms yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {admin && terms.length < 3 && (
        <form className="form mt" onSubmit={create} noValidate>
          <h3 className="full">Add a term</h3>
          <Field label="Term">
            <select id="termNumber" value={number} onChange={(e) => setNumber(Number(e.target.value))}>
              {[1, 2, 3].filter((n) => !terms.some((t) => t.number === n)).map((n) => <option key={n} value={n}>{['First', 'Second', 'Third'][n - 1]} term</option>)}
            </select>
          </Field>
          <span />
          <Field label="First day"><input id="termStart" type="date" value={start} min={session.startDate} max={session.endDate} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Last day"><input id="termEnd" type="date" value={end} min={session.startDate} max={session.endDate} onChange={(e) => setEnd(e.target.value)} /></Field>
          <div className="full field">
            Score split (must add up to 100)
            <div className="row">
              {components.map((c, i) => (
                <span key={i} className="row" style={{ gap: 4 }}>
                  <input className="inline" style={{ width: 70 }} aria-label={`Component ${i + 1} name`} value={c.label} onChange={(e) => setComp(i, { label: e.target.value, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || `C${i + 1}` })} />
                  <input className="inline" style={{ width: 56 }} type="number" min={1} max={100} aria-label={`${c.label} maximum`} value={c.max} onChange={(e) => setComp(i, { max: Number(e.target.value) })} />
                  {components.length > 1 && <button type="button" className="btn sm" aria-label={`Remove ${c.label}`} onClick={() => setComponents((cs) => cs.filter((_, j) => j !== i))}>×</button>}
                </span>
              ))}
              {components.length < 6 && <button type="button" className="btn sm" onClick={() => setComponents((cs) => [...cs.slice(0, -1), { key: `CA${cs.length}`, label: `CA ${cs.length}`, max: 10 }, cs[cs.length - 1]])}>Add a test</button>}
              <span className={`pill ${total === 100 ? 'p-good' : 'p-bad'}`}>Total {total}</span>
            </div>
          </div>
          <Field label="Senior secondary grading" hint="Primary and junior secondary always use A to F.">
            <select id="sssGrading" value={sssGrading} onChange={(e) => setSssGrading(e.target.value as SssGrading)}>
              <option value="WAEC">WAEC scale: A1, B2, B3, C4 to C6, D7, E8, F9</option>
              <option value="BASIC">A to F, the same as junior secondary</option>
            </select>
          </Field>
          <span />
          <label className="full row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={showPositions} onChange={(e) => setShowPositions(e.target.checked)} /> Show class positions on report cards
          </label>
          <div className="full"><button className="btn pri" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add term'}</button></div>
        </form>
      )}
    </div>
  );
}
