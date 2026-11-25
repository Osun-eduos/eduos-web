import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDay } from '../components/ui';
import { ageFrom, isOversight } from '../roles';
import type { ClassArm, SchoolRef, StudentStatus, StudentSummary } from '../types';

export function StudentsTable({ students, showSchool }: { students: StudentSummary[]; showSchool?: boolean }) {
  return (
    <div className="tbl">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Learner ID</th>
            {!showSchool && <th>Adm. no.</th>}
            {showSchool && <th>School</th>}
            <th>Class</th>
            <th>Sex</th>
            <th>Date of birth</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td><Link to={`/students/${s.id}`}>{s.fullName}</Link></td>
              <td className="mono small">{s.learnerId}</td>
              {!showSchool && <td className="mono small">{s.admissionNumber ?? '–'}</td>}
              {showSchool && <td>{s.school?.name ?? <span className="muted">None</span>}</td>}
              <td>{s.currentClass?.name ?? <span className="pill p-warn">No class</span>}</td>
              <td>{s.sex}</td>
              <td className="small">{formatDay(s.dateOfBirth)} <span className="muted">({ageFrom(s.dateOfBirth)})</span></td>
            </tr>
          ))}
          {!students.length && <tr><td colSpan={7} className="muted">No students match.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Students() {
  const { user } = useAuth();
  const ministry = !!user && isOversight(user.role);
  const [params, setParams] = useSearchParams();
  const classId = params.get('class') ?? '';
  const unplaced = params.get('unplaced') === '1';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StudentStatus>('ACTIVE');
  const [schoolId, setSchoolId] = useState(params.get('school') ?? '');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [classes, setClasses] = useState<ClassArm[]>([]);
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ministry) api<SchoolRef[]>('/schools/directory').then(setSchools).catch(() => {});
    else api<ClassArm[]>('/classes').then(setClasses).catch(() => {});
  }, [ministry]);

  const load = useCallback(() => {
    setError(null);
    if (ministry && !schoolId && !q.trim()) {
      setStudents([]);
      return;
    }
    const qs = new URLSearchParams({ status });
    if (q.trim()) qs.set('q', q.trim());
    if (classId) qs.set('classId', classId);
    if (unplaced) qs.set('unplaced', 'true');
    if (schoolId) qs.set('schoolId', schoolId);
    api<StudentSummary[]>(`/students?${qs}`).then(setStudents).catch((e) => setError(e.message));
  }, [ministry, schoolId, q, status, classId, unplaced]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    setParams(p);
  };

  const cls = classes.find((c) => c.id === classId);

  return (
    <>
      <div className="head">
        <div>
          <h1>{cls ? `Students in ${cls.name}` : unplaced ? 'Students without a class' : 'Students'}</h1>
          <p>
            {ministry
              ? 'Search any student in the state by name or learner ID, or choose a school.'
              : 'Every student enrolled at your school. Learner IDs stay with a student for life, across schools.'}
          </p>
        </div>
        {user?.role === 'SCHOOL_ADMIN' && (
          <div className="row">
            <Link className="btn" to="/students/import">Import from a spreadsheet</Link>
            <Link className="btn pri" to="/students/new">Enrol a student</Link>
          </div>
        )}
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="field" style={{ flex: '1 1 220px' }}>
            Search
            <input id="studentSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, learner ID or admission number" />
          </label>
          {ministry ? (
            <label className="field">
              School
              <select id="schoolFilter" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                <option value="">All schools</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="field">
              Class
              <select id="classFilter" value={unplaced ? '__none' : classId} onChange={(e) => {
                const v = e.target.value;
                const p = new URLSearchParams();
                if (v === '__none') p.set('unplaced', '1');
                else if (v) p.set('class', v);
                setParams(p);
              }}>
                <option value="">All classes</option>
                <option value="__none">No class yet</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            Status
            <select id="statusFilter" value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)}>
              <option value="ACTIVE">Enrolled</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </label>
          {(classId || unplaced) && <button className="btn sm" style={{ alignSelf: 'end' }} onClick={() => { setFilter('class', ''); setFilter('unplaced', ''); setParams({}); }}>Clear</button>}
        </div>
        <ErrorAlert error={error} />
        {ministry && !schoolId && !q.trim() ? (
          <p className="muted">Type a name or learner ID, or choose a school.</p>
        ) : (
          <>
            <StudentsTable students={students} showSchool={ministry} />
            <p className="small muted mt">{students.length} student{students.length === 1 ? '' : 's'}</p>
          </>
        )}
      </div>
    </>
  );
}
