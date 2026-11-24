import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDate, ordinal, pct, SheetPill } from '../components/ui';
import { isMinistry } from '../roles';
import type { ClassArm, ClassResults, ResultsSummary, Term } from '../types';

function MinistrySummary() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState('');
  const [data, setData] = useState<ResultsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Term[]>('/terms').then((t) => { setTerms(t); setTermId(t.find((x) => x.isCurrent)?.id ?? t[0]?.id ?? ''); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!termId) return;
    setData(null);
    api<ResultsSummary>(`/results/summary?termId=${termId}`).then(setData).catch((e) => setError(e.message));
  }, [termId]);
  return (
    <>
      <div className="head">
        <div>
          <h1>Results</h1>
          <p>Results released by schools. A subject counts as a pass from 40 marks and a credit from 50.</p>
        </div>
        <label className="field">
          Term
          <select id="summaryTerm" value={termId} onChange={(e) => setTermId(e.target.value)}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}, {t.session.name}</option>)}
          </select>
        </label>
      </div>
      <ErrorAlert error={error} />
      {!terms.length && <p className="muted">No terms have been set up yet.</p>}
      {data && (
        <>
          <div className="grid g4">
            <div className="card kpi"><div className="k">Schools with results</div><div className="v">{data.schools.length}</div></div>
            <div className="card kpi"><div className="k">Classes released</div><div className="v">{data.schools.reduce((s, x) => s + x.classesReleased, 0)}</div></div>
            <div className="card kpi"><div className="k">Students</div><div className="v">{data.schools.reduce((s, x) => s + x.students, 0)}</div></div>
            <div className="card kpi"><div className="k">Subject entries</div><div className="v">{data.schools.reduce((s, x) => s + x.entries, 0)}</div></div>
          </div>
          <div className="grid g2 mt">
            <div className="card">
              <h2>By school</h2>
              <div className="tbl"><table>
                <thead><tr><th>School</th><th>Classes</th><th>Students</th><th>Average</th><th>Pass</th><th>Credit</th></tr></thead>
                <tbody>
                  {data.schools.map((s) => (
                    <tr key={s.id}><td><b>{s.name}</b><br /><span className="small muted">{s.lga}</span></td><td>{s.classesReleased}</td><td>{s.students}</td><td>{s.average ?? '–'}</td><td>{pct(s.passRate)}</td><td>{pct(s.creditRate)}</td></tr>
                  ))}
                  {!data.schools.length && <tr><td colSpan={6} className="muted">No school has released results for this term yet.</td></tr>}
                </tbody>
              </table></div>
            </div>
            <div className="card">
              <h2>By subject</h2>
              <div className="tbl"><table>
                <thead><tr><th>Subject</th><th>Entries</th><th>Average</th><th>Pass</th><th>Credit</th></tr></thead>
                <tbody>
                  {data.subjects.map((s) => (
                    <tr key={s.code}><td>{s.name}</td><td>{s.entries}</td><td>{s.average ?? '–'}</td><td>{pct(s.passRate)}</td><td>{pct(s.creditRate)}</td></tr>
                  ))}
                  {!data.subjects.length && <tr><td colSpan={5} className="muted">No results yet.</td></tr>}
                </tbody>
              </table></div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function Results() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassArm[] | null>(null);
  const [status, setStatus] = useState<Record<string, ClassResults | null>>({});
  const [error, setError] = useState<string | null>(null);
  const ministry = !!user && isMinistry(user.role);

  useEffect(() => {
    if (ministry) return;
    api<ClassArm[]>('/classes')
      .then((cs) => {
        setClasses(cs);
        cs.forEach((c) => api<ClassResults>(`/results/class?classId=${c.id}`).then((r) => setStatus((s) => ({ ...s, [c.id]: r }))).catch(() => setStatus((s) => ({ ...s, [c.id]: null }))));
      })
      .catch((e) => setError(e.message));
  }, [ministry]);

  if (ministry) return <MinistrySummary />;
  const term = Object.values(status).find(Boolean)?.term;
  return (
    <>
      <div className="head">
        <div>
          <h1>Results</h1>
          <p>{term ? `${term.name}, ${term.session}. ` : ''}Approve each subject's scores, add remarks, then release the class's results to parents and the Ministry.</p>
        </div>
      </div>
      <ErrorAlert error={error} />
      <div className="card">
        <div className="tbl"><table>
          <thead><tr><th>Class</th><th>Subjects approved</th><th>Waiting for you</th><th>Status</th><th /></tr></thead>
          <tbody>
            {(classes ?? []).map((c) => {
              const r = status[c.id];
              const approved = r?.subjects.filter((s) => s.status === 'APPROVED').length ?? 0;
              const waiting = r?.subjects.filter((s) => s.status === 'SUBMITTED').length ?? 0;
              return (
                <tr key={c.id}>
                  <td><b>{c.name}</b><br /><span className="small muted">{c.students} students</span></td>
                  <td>{r ? `${approved} of ${r.subjects.length}` : r === null ? '–' : '…'}</td>
                  <td>{waiting ? <span className="pill p-warn">{waiting} to approve</span> : <span className="muted">–</span>}</td>
                  <td>{r?.released ? <span className="pill p-good">Released</span> : r?.canRelease ? <span className="pill p-ind">Ready to release</span> : <span className="pill p-mut">In progress</span>}</td>
                  <td style={{ textAlign: 'right' }}><Link className="btn sm" to={`/results/${c.id}`}>Open</Link></td>
                </tr>
              );
            })}
            {classes && !classes.length && <tr><td colSpan={5} className="muted">No classes this session.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </>
  );
}

type RemarkDraft = Record<string, { teacherRemark: string; principalRemark: string }>;

export function ClassResultsPage() {
  const { classId } = useParams();
  const { user } = useAuth();
  const [r, setR] = useState<ClassResults | null>(null);
  const [remarks, setRemarks] = useState<RemarkDraft>({});
  const [dirty, setDirty] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const apply = useCallback((x: ClassResults) => {
    setR(x);
    setRemarks(Object.fromEntries(x.students.map((s) => [s.id, { teacherRemark: s.teacherRemark ?? '', principalRemark: s.principalRemark ?? '' }])));
    setDirty(false);
  }, []);

  useEffect(() => {
    api<ClassResults>(`/results/class?classId=${classId}`).then(apply).catch((e) => setError(e.message));
  }, [classId, apply]);

  async function run(fn: () => Promise<ClassResults>, done: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      apply(await fn());
      setMsg(done);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  if (!r) return error ? <ErrorAlert error={error} /> : <p className="muted">Loading…</p>;
  const editRemarks = r.canEditTeacherRemarks || r.canEditPrincipalRemarks;
  const setRemark = (id: string, k: 'teacherRemark' | 'principalRemark', v: string) => {
    setRemarks((x) => ({ ...x, [id]: { ...x[id], [k]: v } }));
    setDirty(true);
  };
  const saveRemarks = () =>
    run(
      () => api<ClassResults>('/results/remarks', {
        method: 'PUT',
        json: {
          classId,
          remarks: r.students.map((s) => ({
            studentId: s.id,
            teacherRemark: r.canEditTeacherRemarks ? remarks[s.id].teacherRemark : undefined,
            principalRemark: r.canEditPrincipalRemarks ? remarks[s.id].principalRemark : undefined,
          })),
        },
      }),
      'Remarks saved.',
    );

  return (
    <>
      {!isMinistry(user!.role) && <p className="small"><Link to="/results">← Results</Link></p>}
      <div className="head">
        <div>
          <h1>{r.class.name} results</h1>
          <p>{r.term.name}, {r.term.session} · {r.class.school.name}{r.class.classTeacher ? ` · class teacher ${r.class.classTeacher.fullName}` : ''}</p>
        </div>
        {r.released ? <span className="pill p-good">Released {formatDate(r.released.at)} by {r.released.by}</span> : null}
      </div>
      <ErrorAlert error={error} />
      {msg && <div className="alert ok" style={{ marginBottom: 12 }}>{msg}</div>}

      {!r.released && user?.role === 'SCHOOL_ADMIN' && (
        <div className={`alert ${r.canRelease ? 'ok' : 'info'}`} style={{ marginBottom: 12 }}>
          {r.canRelease ? (
            confirmRelease ? (
              <div className="row between">
                <span>Release {r.class.name}'s results? Parents will see report cards and the Ministry will see the results. Scores can't be changed afterwards.</span>
                <span className="row">
                  <button className="btn pri" disabled={busy} onClick={() => run(() => api<ClassResults>('/results/release', { method: 'POST', json: { classId } }), 'Results released. Parents can now see their children\'s report cards.')}>Release results</button>
                  <button className="btn" onClick={() => setConfirmRelease(false)}>Cancel</button>
                </span>
              </div>
            ) : (
              <div className="row between">
                <span>Every subject is approved. {dirty ? 'Save the remarks, then release.' : 'Check the remarks, then release the results.'}</span>
                <button className="btn pri" disabled={dirty} onClick={() => setConfirmRelease(true)}>Release results…</button>
              </div>
            )
          ) : (
            <>
              <b>Before these results can be released:</b>
              <ul style={{ margin: '4px 0 0' }}>{r.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h2>Subjects</h2>
        <div className="tbl"><table>
          <thead><tr><th>Subject</th><th>Teacher</th><th>Scores</th><th>Class average</th><th>Status</th><th /></tr></thead>
          <tbody>
            {r.subjects.map((s) => (
              <tr key={s.classSubjectId}>
                <td><b>{s.name}</b></td>
                <td>{s.teacher?.fullName ?? <span className="pill p-warn">No teacher</span>}</td>
                <td>{s.entered} of {r.students.length}</td>
                <td>{s.average ?? '–'}</td>
                <td><SheetPill status={s.status} /></td>
                <td style={{ textAlign: 'right' }}>{!isMinistry(user!.role) && <Link className={`btn sm${s.status === 'SUBMITTED' && user?.role === 'SCHOOL_ADMIN' ? ' pri' : ''}`} to={`/scores/${s.classSubjectId}`}>{s.status === 'SUBMITTED' && user?.role === 'SCHOOL_ADMIN' ? 'Review' : 'Open'}</Link>}</td>
              </tr>
            ))}
            {!r.subjects.length && <tr><td colSpan={6} className="muted">No subjects. {user?.role === 'SCHOOL_ADMIN' && <Link to={`/classes/${classId}/subjects`}>Add subjects</Link>}</td></tr>}
          </tbody>
        </table></div>
      </div>

      <div className="card mt">
        <div className="row between">
          <h2>Broadsheet{editRemarks ? ' and remarks' : ''}</h2>
          {editRemarks && <button className="btn pri" disabled={busy || !dirty} onClick={saveRemarks}>Save remarks</button>}
        </div>
        <div className="tbl mt"><table className="broadsheet">
          <thead>
            <tr>
              <th>Student</th>
              {r.subjects.map((s) => <th key={s.code} title={s.name} style={{ textAlign: 'center' }}>{s.code}</th>)}
              <th style={{ textAlign: 'center' }}>Average</th>
              {r.term.showPositions && <th style={{ textAlign: 'center' }}>Position</th>}
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {r.students.map((s) => (
              <tr key={s.id}>
                <td><Link to={`/report-card/${s.id}?term=${r.term.id}`}>{s.fullName}</Link></td>
                {r.subjects.map((sub) => <td key={sub.code} className="mono" style={{ textAlign: 'center' }}>{s.totals[sub.code] ?? '–'}</td>)}
                <td className="mono" style={{ textAlign: 'center' }}><b>{s.average ?? '–'}</b></td>
                {r.term.showPositions && <td style={{ textAlign: 'center' }}>{s.position ? ordinal(s.position) : '–'}</td>}
                <td style={{ minWidth: 220 }}>
                  {r.canEditTeacherRemarks ? (
                    <input className="inline" style={{ width: '100%' }} maxLength={300} aria-label={`Class teacher's remark for ${s.fullName}`} placeholder="Class teacher's remark" value={remarks[s.id]?.teacherRemark ?? ''} onChange={(e) => setRemark(s.id, 'teacherRemark', e.target.value)} />
                  ) : <span className="small">{s.teacherRemark ?? ''}</span>}
                  {r.canEditPrincipalRemarks ? (
                    <input className="inline" style={{ width: '100%', marginTop: 4 }} maxLength={300} aria-label={`Principal's remark for ${s.fullName}`} placeholder="Principal's remark" value={remarks[s.id]?.principalRemark ?? ''} onChange={(e) => setRemark(s.id, 'principalRemark', e.target.value)} />
                  ) : s.principalRemark ? <><br /><span className="small muted">Principal: {s.principalRemark}</span></> : null}
                </td>
              </tr>
            ))}
            {!r.students.length && <tr><td colSpan={r.subjects.length + 4} className="muted">No students.</td></tr>}
          </tbody>
        </table></div>
        <p className="small muted mt">Averages and positions use the scores entered so far{r.released ? '' : '; they are final once every subject is approved'}. Hover a subject code for its name.</p>
      </div>
    </>
  );
}
