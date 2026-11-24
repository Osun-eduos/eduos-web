import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { ErrorAlert, Field } from '../components/ui';
import { levelLabel } from '../roles';
import type { AcademicSession, ClassArm, ClassLevel, User } from '../types';

export function Classes() {
  const [session, setSession] = useState<AcademicSession | null | undefined>(undefined);
  const [classes, setClasses] = useState<ClassArm[]>([]);
  const [levels, setLevels] = useState<ClassLevel[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<ClassLevel | ''>('');
  const [arm, setArm] = useState('A');
  const [capacity, setCapacity] = useState('40');
  const [teacherId, setTeacherId] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editCap, setEditCap] = useState('');

  const load = useCallback(() => {
    api<ClassArm[]>('/classes').then(setClasses).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    api<AcademicSession | null>('/sessions/current').then(setSession).catch((e) => setError(e.message));
    api<ClassLevel[]>('/classes/levels').then((l) => { setLevels(l); setLevel(l[0] ?? ''); }).catch(() => {});
    api<User[]>('/users?role=TEACHER').then((t) => setTeachers(t.filter((x) => x.isActive))).catch(() => {});
    load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!level) return setError('Choose a class level.');
    setBusy(true);
    try {
      await api('/classes', { method: 'POST', json: { level, arm, capacity: Number(capacity) || 40, classTeacherId: teacherId || undefined } });
      const letters = 'ABCDEFGHIJ';
      const i = letters.indexOf(arm.toUpperCase());
      if (i >= 0 && i < letters.length - 1) setArm(letters[i + 1]);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the class.');
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, body: object) {
    setError(null);
    try {
      await api(`/classes/${id}`, { method: 'PATCH', json: body });
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the class.');
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api(`/classes/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove the class.');
    }
  }

  const total = classes.reduce((n, c) => n + c.students, 0);

  return (
    <>
      <div className="head">
        <div>
          <h1>Classes</h1>
          <p>
            {session === null
              ? 'The Ministry has not set the current academic session yet, so classes cannot be created.'
              : `Class arms for the ${session?.name ?? ''} session, their class teachers and how full they are.`}
          </p>
        </div>
        <Link className="btn" to="/students?unplaced=1">Students without a class</Link>
      </div>
      <ErrorAlert error={error} />
      <div className="grid g2 mt" style={{ gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)' }}>
        <div className="card">
          <div className="row between">
            <h2>{classes.length} class{classes.length === 1 ? '' : 'es'}</h2>
            <span className="small muted">{total} students placed</span>
          </div>
          <div className="tbl mt">
            <table>
              <thead><tr><th>Class</th><th>Class teacher</th><th>Students</th><th /></tr></thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/students?class=${c.id}`}><b>{c.name}</b></Link></td>
                    <td>
                      <select className="inline" aria-label={`Class teacher for ${c.name}`} value={c.classTeacher?.id ?? ''} onChange={(e) => update(c.id, { classTeacherId: e.target.value || null })}>
                        <option value="">No class teacher</option>
                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                      </select>
                    </td>
                    <td style={{ minWidth: 150 }}>
                      {editing === c.id ? (
                        <span className="row actions" style={{ justifyContent: 'flex-start' }}>
                          {c.students} of <input className="inline" style={{ width: 64 }} aria-label="Capacity" inputMode="numeric" value={editCap} onChange={(e) => setEditCap(e.target.value)} />
                          <button className="btn sm pri" onClick={() => update(c.id, { capacity: Number(editCap) })}>Save</button>
                        </span>
                      ) : (
                        <button className="linklike" onClick={() => { setEditing(c.id); setEditCap(String(c.capacity)); }} title="Change capacity">
                          <span className="mono">{c.students} / {c.capacity}</span>
                          <span className="meter"><i style={{ width: `${Math.min(100, (c.students / c.capacity) * 100)}%`, background: c.students >= c.capacity ? 'var(--bad)' : undefined }} /></span>
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="row actions">
                        <Link className="btn sm" to={`/classes/${c.id}/subjects`}>Subjects</Link>
                        {c.students === 0 && <button className="btn sm danger" onClick={() => remove(c.id)}>Remove</button>}
                      </span>
                    </td>
                  </tr>
                ))}
                {!classes.length && <tr><td colSpan={4} className="muted">No classes yet for this session.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {session && (
          <div className="card">
            <h2>Add a class</h2>
            <form className="form" onSubmit={create} noValidate>
              <Field label="Level">
                <select id="level" value={level} onChange={(e) => setLevel(e.target.value as ClassLevel)}>
                  {levels.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
                </select>
              </Field>
              <Field label="Arm" hint="e.g. A, B or Gold">
                <input id="arm" value={arm} onChange={(e) => setArm(e.target.value)} />
              </Field>
              <Field label="Capacity">
                <input id="capacity" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </Field>
              <Field label="Class teacher (optional)">
                <select id="classTeacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                  <option value="">None yet</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
              </Field>
              <div className="full">
                <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Adding…' : `Add ${level ? levelLabel(level) : ''}${arm.length === 1 ? '' : ' '}${arm.toUpperCase()}`}</button>
              </div>
              {!teachers.length && <p className="full small muted">Add teacher accounts under Accounts to assign class teachers.</p>}
            </form>
          </div>
        )}
      </div>
    </>
  );
}
