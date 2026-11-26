import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDay } from '../components/ui';
import { isOversight } from '../roles';
import type { AcademicSession, ClassArm, Term } from '../types';

type SchoolRef = { id: string; name: string; lga: string };

/** Past sessions, read-only: each class's results by term, its attendance, and the session's indicators. */
export function Archive() {
  const { user } = useAuth();
  const oversight = !!user && isOversight(user.role);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState<ClassArm[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AcademicSession[]>('/sessions')
      .then((all) => {
        const past = all.filter((s) => !s.isCurrent);
        setSessions(past);
        if (past.length) setSessionId(past[0].id);
      })
      .catch((e) => setError(e.message));
    if (oversight) api<SchoolRef[]>('/schools/directory').then(setSchools).catch(() => {});
  }, [oversight]);

  useEffect(() => {
    setClasses([]);
    if (!sessionId) return;
    api<Term[]>(`/terms?sessionId=${sessionId}`).then((t) => setTerms([...t].sort((a, b) => a.number - b.number))).catch(() => setTerms([]));
    if (oversight && !schoolId) return;
    api<ClassArm[]>(`/classes?sessionId=${sessionId}${oversight ? `&schoolId=${schoolId}` : ''}`).then(setClasses).catch((e) => setError(e.message));
  }, [sessionId, schoolId, oversight]);

  if (!user) return null;
  const session = sessions.find((s) => s.id === sessionId);
  const termLabel = (n: number) => ['First', 'Second', 'Third'][n - 1] ?? `Term ${n}`;

  return (
    <>
      <div className="head">
        <div>
          <h1>Archive</h1>
          <p>Past sessions as they were: classes, results, report cards and attendance. Closed sessions cannot be changed.</p>
        </div>
        {session && oversight && <Link className="btn" to={`/dashboard?session=${session.id}`}>Indicators for {session.name}</Link>}
      </div>
      <ErrorAlert error={error} />
      {!sessions.length ? (
        <div className="card muted">There are no past sessions yet. When the Ministry opens the next session, this one moves here.</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row">
              <label className="field">
                Session
                <select id="archiveSession" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              {oversight && (
                <label className="field" style={{ flex: '1 1 260px' }}>
                  School
                  <select id="archiveSchool" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                    <option value="">Choose a school</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.lga}</option>)}
                  </select>
                </label>
              )}
            </div>
            {session && <p className="small muted mt">{session.name}: {formatDay(session.startDate)} to {formatDay(session.endDate)} · {terms.length ? terms.map((t) => `${termLabel(t.number)} term`).join(', ') : 'no terms were set up'}</p>}
          </div>
          {oversight && !schoolId ? (
            <div className="card muted">Choose a school to see its classes in {session?.name}.</div>
          ) : (
            <div className="card">
              <div className="tbl">
                <table>
                  <thead><tr><th>Class</th><th>Class teacher</th><th className="num">Students</th><th>Results</th><th>Attendance</th></tr></thead>
                  <tbody>
                    {classes.map((c) => (
                      <tr key={c.id}>
                        <td><b>{c.name}</b></td>
                        <td>{c.classTeacher?.fullName ?? <span className="muted">–</span>}</td>
                        <td className="num">{c.students}</td>
                        <td className="row" style={{ gap: 6 }}>
                          {terms.map((t) => <Link key={t.id} className="btn sm" to={`/results/${c.id}?term=${t.id}`}>{termLabel(t.number)} term</Link>)}
                          {!terms.length && <span className="muted small">No terms</span>}
                        </td>
                        <td><Link className="btn sm" to={`/attendance?class=${c.id}&view=summary`}>Attendance</Link></td>
                      </tr>
                    ))}
                    {!classes.length && <tr><td colSpan={5} className="muted">No classes in this session.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="small muted mt">Each student's report cards from every past term stay on their record, under Students.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
