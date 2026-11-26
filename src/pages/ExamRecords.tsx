import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiDownload, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';
import { isOversight, levelLabel } from '../roles';

interface Options { sessions: { id: string; name: string }[]; subjects: { code: string; name: string }[]; levels: string[]; schools: { id: string; name: string; lga: string }[] }
interface Rec {
  id: string; session: string; term: string; school: { id: string; name: string; code: string }; class: string; studentId: string; student: string;
  learnerId: string; admissionNumber: string | null; subject: string; score: number; grade: string | null; status: 'FINAL' | 'PROVISIONAL';
}
interface Result { summary: { records: number; students: number; mean: number | null; passRate: number | null; passMark: number }; page: number; pages: number; pageSize: number; rows: Rec[] }

const EMPTY = { q: '', sessionId: '', term: '', schoolId: '', level: '', classId: '', subject: '' };

/**
 * Every approved score, searchable by session, term, school, class, subject or student. Records follow a student
 * when they change school.
 */
export function ExamRecords() {
  const { user } = useAuth();
  const oversight = !!user && isOversight(user.role);
  const [opts, setOpts] = useState<Options | null>(null);
  const [f, setF] = useState(EMPTY);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Options>('/records/options').then(setOpts).catch((e) => setError(e.message));
  }, []);
  // Typing in the search box waits a moment before searching.
  useEffect(() => {
    const t = setTimeout(() => setF((x) => (x.q === q ? x : { ...x, q })), 300);
    return () => clearTimeout(t);
  }, [q]);
  const schoolId = oversight ? f.schoolId : user?.school?.id ?? '';
  useEffect(() => {
    setClasses([]);
    if (!schoolId || !f.sessionId) return;
    api<{ id: string; name: string }[]>(`/classes?sessionId=${f.sessionId}${oversight ? `&schoolId=${schoolId}` : ''}`).then(setClasses).catch(() => {});
  }, [schoolId, f.sessionId, oversight]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
    return p.toString();
  }, [f]);
  useEffect(() => setPage(1), [qs]);
  useEffect(() => {
    setError(null);
    api<Result>(`/records?${qs}${qs ? '&' : ''}page=${page}`).then(setData).catch((e) => setError(e.message));
  }, [qs, page]);

  const set = (k: keyof typeof EMPTY, v: string) => setF((x) => ({ ...x, [k]: v, ...(k === 'schoolId' || k === 'sessionId' ? { classId: '' } : {}) }));
  async function download() {
    setBusy(true);
    try {
      await apiDownload(`/records/export?${qs}`, 'exam-records.csv');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The download did not work.');
    } finally {
      setBusy(false);
    }
  }

  const s = data?.summary;
  return (
    <>
      <div className="head">
        <div>
          <h1>Examination records</h1>
          <p>
            Every approved score, kept permanently and searchable by session, term, school, class, subject or student. Records follow a student when they change school.
            {oversight ? ' You see results schools have released.' : ' Your own scores are provisional until you release them.'}
          </p>
        </div>
        <div className="row">
          <Link className="btn" to="/archive">Past sessions</Link>
          <button className="btn pri" disabled={busy || !s?.records} onClick={download}>{busy ? 'Preparing…' : 'Download CSV'}</button>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row">
          <label className="field" style={{ flex: '2 1 220px' }}>
            Student
            <input id="recSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, learner ID or admission no." />
          </label>
          <label className="field">
            Session
            <select id="recSession" value={f.sessionId} onChange={(e) => set('sessionId', e.target.value)}>
              <option value="">All sessions</option>
              {opts?.sessions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <label className="field">
            Term
            <select id="recTerm" value={f.term} onChange={(e) => set('term', e.target.value)}>
              <option value="">All terms</option>
              <option value="1">First</option><option value="2">Second</option><option value="3">Third</option>
            </select>
          </label>
          {oversight && (
            <label className="field" style={{ flex: '2 1 200px' }}>
              School
              <select id="recSchool" value={f.schoolId} onChange={(e) => set('schoolId', e.target.value)}>
                <option value="">All schools</option>
                {opts?.schools.map((x) => <option key={x.id} value={x.id}>{x.name}{user?.lga ? '' : ` · ${x.lga}`}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            Class
            {classes.length ? (
              <select id="recClass" value={f.classId} onChange={(e) => set('classId', e.target.value)}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <select id="recLevel" value={f.level} onChange={(e) => set('level', e.target.value)}>
                <option value="">All classes</option>
                {opts?.levels.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
              </select>
            )}
          </label>
          <label className="field">
            Subject
            <select id="recSubject" value={f.subject} onChange={(e) => set('subject', e.target.value)}>
              <option value="">All subjects</option>
              {opts?.subjects.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
            </select>
          </label>
          <button className="btn" style={{ alignSelf: 'end' }} disabled={!qs && !q} onClick={() => { setQ(''); setF(EMPTY); }}>Clear</button>
        </div>
        {!classes.length && schoolId && !f.sessionId && <p className="small muted mt">Choose a session to pick a single class.</p>}
      </div>
      <ErrorAlert error={error} />
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <div className="card kpi"><div className="k">Records found</div><div className="v">{s ? s.records.toLocaleString('en-NG') : '–'}</div></div>
        <div className="card kpi"><div className="k">Mean score</div><div className="v">{s?.mean ?? '–'}</div></div>
        <div className="card kpi"><div className="k">Pass rate ({s?.passMark ?? 40}+)</div><div className="v">{s?.passRate == null ? '–' : `${s.passRate}%`}</div></div>
        <div className="card kpi"><div className="k">Students</div><div className="v">{s ? s.students.toLocaleString('en-NG') : '–'}</div></div>
      </div>
      <div className="card">
        <div className="tbl">
          <table>
            <thead><tr><th>Session</th><th>Term</th><th>School</th><th>Class</th><th>Adm. no.</th><th>Student</th><th>Subject</th><th className="num">Score</th><th>Grade</th><th>Record</th></tr></thead>
            <tbody>
              {data?.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.session}</td>
                  <td>{r.term.replace(' term', '')}</td>
                  <td className="small">{r.school.name}</td>
                  <td>{r.class}</td>
                  <td className="mono small">{r.admissionNumber ?? '–'}</td>
                  <td><Link to={`/students/${r.studentId}`}>{r.student}</Link></td>
                  <td>{r.subject}</td>
                  <td className="num">{r.score}</td>
                  <td>{r.grade}</td>
                  <td>{r.status === 'FINAL' ? <span className="pill p-good">Final</span> : <span className="pill p-warn">Provisional</span>}</td>
                </tr>
              ))}
              {data && !data.rows.length && <tr><td colSpan={10} className="muted">No records match.</td></tr>}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="row mt" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">Page {data.page} of {data.pages.toLocaleString('en-NG')} · {data.pageSize} records a page</span>
            <span className="row">
              <button className="btn sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </span>
          </div>
        )}
      </div>
    </>
  );
}
