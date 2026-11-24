import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDate, SheetPill } from '../components/ui';
import type { MySubjects, ScoreSheet as Sheet } from '../types';

type Band = { min: number; grade: string; remark: string };
type Grading = { scales: { BASIC: Band[]; SSS: Band[] }; passMark: number };

export function MyScores() {
  const [data, setData] = useState<MySubjects | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<MySubjects>('/my/subjects').then(setData).catch((e) => setError(e.message));
  }, []);
  if (!data) return error ? <ErrorAlert error={error} /> : <p className="muted">Loading…</p>;
  return (
    <>
      <div className="head">
        <div>
          <h1>Scores</h1>
          <p>{data.term ? `${data.term.name}, ${data.term.session}. Enter each subject's scores, then submit them to your school administrator for approval.` : 'The Ministry has not set the current term yet.'}</p>
        </div>
      </div>
      {!data.subjects.length && <div className="card"><p className="muted">You have not been given any subjects to teach this session. Your school administrator assigns subjects from the Classes page.</p></div>}
      <div className="grid g2">
        {data.subjects.map((s) => (
          <div className="card" key={s.id} style={{ display: 'grid', gap: 8 }}>
            <div className="row between">
              <div><h2>{s.name}</h2><p className="small muted">{s.class.name} · {s.students} students</p></div>
              <SheetPill status={s.sheet?.status} />
            </div>
            {s.sheet?.status === 'RETURNED' && s.sheet.returnNote && <div className="alert err">Returned: {s.sheet.returnNote}</div>}
            <div><Link className={`btn${!s.sheet || s.sheet.status === 'DRAFT' || s.sheet.status === 'RETURNED' ? ' pri' : ''}`} to={`/scores/${s.id}`}>{!s.sheet ? 'Enter scores' : s.sheet.status === 'DRAFT' || s.sheet.status === 'RETURNED' ? 'Continue' : 'View scores'}</Link></div>
          </div>
        ))}
      </div>
    </>
  );
}

type Cells = Record<string, Record<string, string>>;
const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function ScoreSheetPage() {
  const { classSubjectId } = useParams();
  const { user } = useAuth();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [grading, setGrading] = useState<Grading | null>(null);
  const [cells, setCells] = useState<Cells>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');
  const table = useRef<HTMLTableElement>(null);

  const apply = (s: Sheet) => {
    setSheet(s);
    setCells(Object.fromEntries(s.students.map((st) => [st.id, Object.fromEntries(s.term.components.map((c) => [c.key, fmt(st.marks[c.key])]))])));
    setDirty(new Set());
  };

  useEffect(() => {
    api<Sheet>(`/scoresheets?classSubjectId=${classSubjectId}`).then(apply).catch((e) => setError(e.message));
    api<Grading>('/grading').then(setGrading).catch(() => {});
  }, [classSubjectId]);

  useEffect(() => {
    if (!dirty.size) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const components = sheet?.term.components ?? [];
  const scale = sheet && grading ? (sheet.class.level.startsWith('SSS') ? grading.scales.SSS : grading.scales.BASIC) : null;

  const problem = (key: string, v: string) => {
    if (v.trim() === '') return null;
    const n = Number(v);
    const max = components.find((c) => c.key === key)?.max ?? 100;
    if (!Number.isFinite(n) || n < 0 || n > max) return `0 to ${max}`;
    if (Math.round(n * 2) !== n * 2) return 'Whole or half marks';
    return null;
  };

  const rowTotal = (id: string) => {
    const r = cells[id];
    if (!r) return null;
    let sum = 0;
    for (const c of components) {
      const v = r[c.key];
      if (v === undefined || v.trim() === '' || problem(c.key, v)) return null;
      sum += Number(v);
    }
    return Math.round(sum * 10) / 10;
  };
  const gradeOf = (t: number | null) => (t === null || !scale ? null : scale.find((b) => t >= b.min)?.grade ?? null);

  const invalid = useMemo(
    () => Object.entries(cells).some(([, r]) => Object.entries(r).some(([k, v]) => problem(k, v))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cells, components],
  );

  const setCell = (id: string, key: string, v: string) => {
    setCells((c) => ({ ...c, [id]: { ...c[id], [key]: v } }));
    setDirty((d) => new Set(d).add(id));
    setMsg(null);
  };

  function moveDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = [...(table.current?.querySelectorAll<HTMLInputElement>(`input[data-col="${e.currentTarget.dataset.col}"]`) ?? [])];
    const i = inputs.indexOf(e.currentTarget);
    inputs[i + 1]?.focus();
  }

  async function save(): Promise<Sheet | null> {
    if (!sheet || !dirty.size) return sheet;
    if (invalid) {
      setError('Fix the marks highlighted in red first.');
      return null;
    }
    const scores = [...dirty].map((id) => ({
      studentId: id,
      marks: Object.fromEntries(components.map((c) => [c.key, cells[id][c.key].trim() === '' ? null : Number(cells[id][c.key])])),
    }));
    const r = await api<Sheet>('/scoresheets', { method: 'PUT', json: { classSubjectId, scores } });
    apply(r);
    return r;
  }

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(done);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  if (!sheet) return error ? <ErrorAlert error={error} /> : <p className="muted">Loading…</p>;

  const isAdmin = user?.role === 'SCHOOL_ADMIN';
  const complete = sheet.students.filter((s) => s.inClass && rowTotal(s.id) !== null).length;
  const totals = sheet.students.filter((s) => s.inClass).map((s) => rowTotal(s.id)).filter((t): t is number => t !== null);
  const avg = totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : null;

  return (
    <>
      <p className="small"><Link to={user?.role === 'TEACHER' ? '/scores' : `/results/${sheet.class.id}`}>← Back</Link></p>
      <div className="head">
        <div>
          <h1>{sheet.classSubject.name} · {sheet.class.name}</h1>
          <p>{sheet.term.name}, {sheet.term.session} · {sheet.class.school.name}{sheet.classSubject.teacher ? ` · ${sheet.classSubject.teacher.fullName}` : ''}</p>
        </div>
        <SheetPill status={sheet.id ? sheet.status : null} />
      </div>
      {sheet.status === 'RETURNED' && sheet.returnNote && <div className="alert err" style={{ marginBottom: 10 }}>Returned by {sheet.decided?.by}: {sheet.returnNote}</div>}
      {sheet.lockedReason && <div className="alert info" style={{ marginBottom: 10 }}>{sheet.lockedReason}</div>}
      {sheet.submitted && sheet.status !== 'DRAFT' && (
        <p className="small muted" style={{ marginBottom: 10 }}>
          Submitted by {sheet.submitted.by} at {formatDate(sheet.submitted.at)}
          {sheet.decided && sheet.status === 'APPROVED' && <> · approved by {sheet.decided.by} at {formatDate(sheet.decided.at)}</>}
        </p>
      )}
      <ErrorAlert error={error} />
      {msg && <div className="alert ok" style={{ marginBottom: 10 }}>{msg}</div>}

      <div className="card">
        <div className="tbl">
          <table ref={table}>
            <thead>
              <tr>
                <th>Student</th>
                {components.map((c) => <th key={c.key} style={{ textAlign: 'center' }}>{c.label}<br /><span className="small">/ {c.max}</span></th>)}
                <th style={{ textAlign: 'center' }}>Total<br /><span className="small">/ 100</span></th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {sheet.students.map((s) => {
                const t = sheet.editable ? rowTotal(s.id) : s.total;
                return (
                  <tr key={s.id}>
                    <td>{s.fullName}<br /><span className="mono small muted nowrap">{s.learnerId}</span>{!s.inClass && <><br /><span className="small muted">No longer in this class</span></>}</td>
                    {components.map((c) => {
                      const v = cells[s.id]?.[c.key] ?? '';
                      const p = problem(c.key, v);
                      return (
                        <td key={c.key} style={{ textAlign: 'center' }}>
                          {sheet.editable && s.inClass ? (
                            <input
                              className="inline mark"
                              data-col={c.key}
                              inputMode="decimal"
                              aria-label={`${c.label} for ${s.fullName}`}
                              aria-invalid={!!p}
                              title={p ?? undefined}
                              value={v}
                              onChange={(e) => setCell(s.id, c.key, e.target.value)}
                              onKeyDown={moveDown}
                            />
                          ) : (
                            <span className="mono">{v || '–'}</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center' }} className="mono"><b>{t ?? '–'}</b></td>
                    <td>{gradeOf(t) ?? '–'}</td>
                  </tr>
                );
              })}
              {!sheet.students.length && <tr><td colSpan={components.length + 3} className="muted">No students in this class.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="small muted mt">Press Enter to move down a column. Marks can be whole or half marks.</p>
      </div>

      <div className="savebar">
        <span className="small">
          <b>{complete}</b> of {sheet.summary.students} complete{avg !== null && <> · class average <b>{avg}</b></>}
          {dirty.size > 0 && <> · <span className="pill p-warn">Unsaved changes</span></>}
        </span>
        <span className="row">
          {sheet.editable && (
            <>
              <button className="btn" disabled={busy || !dirty.size} onClick={() => run(save, 'Saved.')}>Save draft</button>
              <button
                className="btn pri"
                disabled={busy || complete < sheet.summary.students || invalid}
                title={complete < sheet.summary.students ? 'Enter every mark first' : undefined}
                onClick={() => run(async () => { const s = await save(); if (s?.id) apply(await api<Sheet>(`/scoresheets/${s.id}/submit`, { method: 'POST' })); }, 'Submitted for approval.')}
              >
                Submit for approval
              </button>
            </>
          )}
          {isAdmin && !sheet.released && sheet.term.isCurrent && sheet.id && (sheet.status === 'SUBMITTED' || sheet.status === 'APPROVED') && (
            returning ? (
              <>
                <input className="inline" style={{ width: 240 }} aria-label="What needs changing" placeholder="What needs changing?" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="btn danger" disabled={busy} onClick={() => run(async () => { apply(await api<Sheet>(`/scoresheets/${sheet.id}/return`, { method: 'POST', json: { note } })); setReturning(false); setNote(''); }, 'Returned to the teacher.')}>Return</button>
                <button className="btn" onClick={() => setReturning(false)}>Cancel</button>
              </>
            ) : (
              <>
                <button className="btn" onClick={() => setReturning(true)}>Return to teacher</button>
                {sheet.status === 'SUBMITTED' && <button className="btn pri" disabled={busy} onClick={() => run(async () => apply(await api<Sheet>(`/scoresheets/${sheet.id}/approve`, { method: 'POST' })), 'Approved.')}>Approve</button>}
              </>
            )
          )}
        </span>
      </div>
    </>
  );
}
