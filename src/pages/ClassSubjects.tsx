import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { ErrorAlert, SheetPill } from '../components/ui';
import type { ClassArm, ClassSubjectRow, User } from '../types';

export function ClassSubjects() {
  const { id } = useParams();
  const [cls, setCls] = useState<ClassArm | null>(null);
  const [rows, setRows] = useState<ClassSubjectRow[]>([]);
  const [catalogue, setCatalogue] = useState<{ code: string; name: string; core: boolean }[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [add, setAdd] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ClassSubjectRow[]>(`/classes/${id}/subjects`).then(setRows).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    api<ClassArm[]>('/classes').then((cs) => {
      const c = cs.find((x) => x.id === id) ?? null;
      setCls(c);
      if (c) api<{ code: string; name: string; core: boolean }[]>(`/subjects?level=${c.level}`).then(setCatalogue).catch(() => {});
    });
    api<User[]>('/users?role=TEACHER').then((t) => setTeachers(t.filter((x) => x.isActive))).catch(() => {});
    load();
  }, [id, load]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }

  const available = catalogue.filter((s) => !rows.some((r) => r.code === s.code));
  const unassigned = rows.filter((r) => !r.teacher).length;

  return (
    <>
      <p className="small"><Link to="/classes">← Classes</Link></p>
      <div className="head">
        <div>
          <h1>{cls?.name ?? 'Class'} subjects</h1>
          <p>The subjects this class takes and who teaches each one. Subject teachers enter scores; the class teacher sees every subject.</p>
        </div>
        {available.some((s) => s.core) && <button className="btn pri" onClick={() => run(() => api(`/classes/${id}/subjects/core`, { method: 'POST' }))}>Add the usual subjects</button>}
      </div>
      <ErrorAlert error={error} />
      {unassigned > 0 && <div className="alert info" style={{ marginBottom: 12 }}>{unassigned} subject{unassigned === 1 ? ' has' : 's have'} no teacher yet. Choose one so they can enter scores.</div>}
      <div className="card">
        <div className="tbl">
          <table>
            <thead><tr><th>Subject</th><th>Teacher</th><th>This term's scores</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b></td>
                  <td>
                    <select className="inline" aria-label={`Teacher for ${r.name}`} value={r.teacher?.id ?? ''} onChange={(e) => run(() => api(`/class-subjects/${r.id}`, { method: 'PATCH', json: { teacherId: e.target.value || null } }))}>
                      <option value="">No teacher</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                    </select>
                  </td>
                  <td>{r.sheet ? <Link to={`/scores/${r.id}`}><SheetPill status={r.sheet.status} /></Link> : <SheetPill status={null} />}</td>
                  <td style={{ textAlign: 'right' }}>{!r.sheet && <button className="btn sm danger" onClick={() => run(() => api(`/class-subjects/${r.id}`, { method: 'DELETE' }))}>Remove</button>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="muted">No subjects yet. Add the usual subjects for this level, or add them one at a time below.</td></tr>}
            </tbody>
          </table>
        </div>
        {available.length > 0 && (
          <div className="row mt">
            <select className="inline" aria-label="Subject to add" value={add} onChange={(e) => setAdd(e.target.value)}>
              <option value="">Add a subject…</option>
              {available.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <button className="btn sm" disabled={!add} onClick={() => run(async () => { await api(`/classes/${id}/subjects`, { method: 'POST', json: { subjectCode: add } }); setAdd(''); })}>Add</button>
          </div>
        )}
      </div>
    </>
  );
}
