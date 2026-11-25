import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import {
  ATTENDANCE, AttendancePill, ErrorAlert, formatDate, formatDay, formatWeekday, latestSchoolDay, pct, shiftSchoolDay, todayNG,
} from '../components/ui';
import { isOversight } from '../roles';
import type { AttendanceDay, AttendanceStatus, ClassArm, ClassAttendance, Register, SchoolRef } from '../types';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

function DateBar({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = todayNG();
  return (
    <div className="datebar">
      <button className="btn sm" onClick={() => onChange(shiftSchoolDay(date, -1))} aria-label="Previous school day">← Previous</button>
      <input type="date" aria-label="Date" value={date} max={today} onChange={(e) => e.target.value && onChange(e.target.value)} />
      <button className="btn sm" onClick={() => onChange(shiftSchoolDay(date, 1))} disabled={shiftSchoolDay(date, 1) > today} aria-label="Next school day">Next →</button>
      {date !== latestSchoolDay() && <button className="btn sm" onClick={() => onChange(latestSchoolDay())}>Latest school day</button>}
    </div>
  );
}

type Marks = Record<string, { status: AttendanceStatus | null; note: string }>;

function RegisterView({ classId, date, setDate }: { classId: string; date: string; setDate: (d: string) => void }) {
  const [reg, setReg] = useState<Register | null>(null);
  const [marks, setMarks] = useState<Marks>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const apply = (r: Register) => {
    setReg(r);
    setMarks(Object.fromEntries(r.students.map((s) => [s.id, { status: s.status, note: s.note ?? '' }])));
    setDirty(false);
  };

  useEffect(() => {
    setError(null);
    setMsg(null);
    setReg(null);
    api<Register>(`/attendance/register?classId=${classId}&date=${date}`).then(apply).catch((e) => setError(e.message));
  }, [classId, date]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setMark = (id: string, patch: Partial<Marks[string]>) => {
    setMarks((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
    setDirty(true);
    setMsg(null);
  };

  const inClass = reg?.students.filter((s) => s.inClass) ?? [];
  const unmarked = inClass.filter((s) => !marks[s.id]?.status).length;
  const totals = useMemo(() => {
    const t = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    Object.values(marks).forEach((m) => m.status && t[m.status]++);
    return t;
  }, [marks]);

  function markRestPresent() {
    setMarks((m) => Object.fromEntries(Object.entries(m).map(([id, v]) => [id, v.status ? v : { ...v, status: 'PRESENT' }])));
    setDirty(true);
  }

  async function save() {
    if (!reg) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<Register>('/attendance/register', {
        method: 'PUT',
        json: {
          classId,
          date,
          marks: reg.students.filter((s) => marks[s.id]?.status).map((s) => ({ studentId: s.id, status: marks[s.id].status, note: marks[s.id].note || undefined })),
        },
      });
      apply(r);
      setMsg(reg.register ? 'Register updated.' : 'Register saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the register.');
    } finally {
      setBusy(false);
    }
  }

  if (!reg) {
    return (
      <>
        <div className="head"><div><h1>Register</h1></div><DateBar date={date} onChange={setDate} /></div>
        {error ? <ErrorAlert error={error} /> : <p className="muted">Loading…</p>}
      </>
    );
  }

  const locked = !reg.editable;
  return (
    <>
      <div className="head">
        <div>
          <h1>{reg.class.name} register</h1>
          <p>{formatWeekday(date)} · {reg.class.school.name}{reg.class.classTeacher ? ` · class teacher ${reg.class.classTeacher.fullName}` : ''}</p>
        </div>
        <DateBar date={date} onChange={(d) => (!dirty || confirm('Leave without saving the register?')) && setDate(d)} />
      </div>
      {reg.register ? (
        <p className="small muted" style={{ marginBottom: 10 }}>
          Taken by {reg.register.takenBy} at {formatDate(reg.register.takenAt)}
          {reg.register.updatedBy && <> · last corrected by {reg.register.updatedBy} at {formatDate(reg.register.updatedAt)}</>}
          {' · '}<Link to={`/attendance?class=${classId}&view=summary`}>Class attendance so far</Link>
        </p>
      ) : (
        <div className="alert info" style={{ marginBottom: 10 }}>
          {locked ? 'No register was taken for this day.' : 'The register has not been taken for this day yet.'}{' '}
          <Link to={`/attendance?class=${classId}&view=summary`}>Class attendance so far</Link>
        </div>
      )}
      {locked && reg.lockedReason && <div className="alert info" style={{ marginBottom: 10 }}>{reg.lockedReason}</div>}
      <ErrorAlert error={error} />
      {msg && <div className="alert ok" style={{ marginBottom: 10 }}>{msg}</div>}

      <div className="card">
        {!locked && inClass.length > 0 && (
          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="small muted">P present · L late · A absent · E excused (absent with permission)</span>
            <button className="btn sm" onClick={markRestPresent} disabled={!unmarked}>Mark {unmarked === inClass.length ? 'everyone' : 'the rest'} present</button>
          </div>
        )}
        <div className="tbl">
          <table>
            <thead><tr><th>Student</th><th>Attendance</th></tr></thead>
            <tbody>
              {reg.students.map((s) => {
                const m = marks[s.id] ?? { status: null, note: '' };
                const readOnly = locked || !s.inClass;
                return (
                  <tr key={s.id} className={!m.status && s.inClass && !locked ? 'unmarked' : undefined}>
                    <td>
                      <Link to={`/students/${s.id}`}>{s.fullName}</Link>
                      <br /><span className="mono small muted nowrap">{s.learnerId}</span>
                      {!s.inClass && <><br /><span className="small muted">Moved to another class</span></>}
                    </td>
                    <td>
                      {readOnly ? (
                        <>{m.status ? <AttendancePill status={m.status} /> : <span className="muted">–</span>}{m.note && <span className="small muted"> · {m.note}</span>}</>
                      ) : (
                        <div style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
                          <div className="seg" role="group" aria-label={`Attendance for ${s.fullName}`}>
                            {STATUSES.map((st) => (
                              <button key={st} type="button" className={st} aria-pressed={m.status === st} title={ATTENDANCE[st].label} onClick={() => setMark(s.id, { status: st })}>
                                {ATTENDANCE[st].short}
                              </button>
                            ))}
                          </div>
                          {((m.status && m.status !== 'PRESENT') || m.note) && (
                            <input className="inline" style={{ width: 'min(260px, 100%)' }} aria-label={`Note for ${s.fullName}`} placeholder="Reason (optional)" maxLength={200} value={m.note} onChange={(e) => setMark(s.id, { note: e.target.value })} />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!reg.students.length && <tr><td colSpan={2} className="muted">No students are in this class yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {!locked && inClass.length > 0 && (
        <div className="savebar">
          <span className="row" style={{ gap: 6 }}>
            {STATUSES.map((st) => <span key={st} className={`pill ${ATTENDANCE[st].pill}`}>{ATTENDANCE[st].label} {totals[st]}</span>)}
            {unmarked > 0 && <span className="small muted">{unmarked} not marked</span>}
          </span>
          <button className="btn pri" onClick={save} disabled={busy || unmarked > 0 || (!dirty && !!reg.register)}>
            {busy ? 'Saving…' : reg.register ? 'Save changes' : 'Save register'}
          </button>
        </div>
      )}
    </>
  );
}

function ClassSummary({ classId }: { classId: string }) {
  const [data, setData] = useState<ClassAttendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<ClassAttendance>(`/attendance/class?classId=${classId}`).then(setData).catch((e) => setError(e.message));
  }, [classId]);
  if (!data) return error ? <ErrorAlert error={error} /> : <p className="muted">Loading…</p>;
  const sorted = [...data.students].sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101) || a.fullName.localeCompare(b.fullName));
  return (
    <>
      <div className="head">
        <div>
          <h1>{data.class.name} attendance</h1>
          <p>{data.class.session} session · {formatDay(data.from)} to {formatDay(data.to)} · {data.registers} register{data.registers === 1 ? '' : 's'} taken</p>
        </div>
        <Link className="btn pri" to={`/attendance?class=${classId}`}>Open today's register</Link>
      </div>
      <div className="grid g2">
        <div className="card">
          <h2>Students</h2>
          <p className="small muted" style={{ marginBottom: 8 }}>Lowest attendance first. Attendance counts days present or late.</p>
          <div className="tbl">
            <table>
              <thead><tr><th>Student</th><th>Present</th><th>Late</th><th>Absent</th><th>Excused</th><th>Attendance</th></tr></thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/students/${s.id}`}>{s.fullName}</Link>{!s.inClass && <><br /><span className="small muted">Moved class</span></>}</td>
                    <td>{s.counts.PRESENT}</td><td>{s.counts.LATE}</td><td>{s.counts.ABSENT}</td><td>{s.counts.EXCUSED}</td>
                    <td><span className={`pill ${s.rate === null ? 'p-mut' : s.rate < 80 ? 'p-bad' : s.rate < 90 ? 'p-warn' : 'p-good'}`}>{pct(s.rate)}</span></td>
                  </tr>
                ))}
                {!sorted.length && <tr><td colSpan={6} className="muted">No students.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Registers taken</h2>
          <div className="tbl">
            <table>
              <thead><tr><th>Day</th><th>Present</th><th>Late</th><th>Absent</th><th>Excused</th></tr></thead>
              <tbody>
                {[...data.days].reverse().map((d) => (
                  <tr key={d.date}>
                    <td><Link to={`/attendance?class=${classId}&date=${d.date}`}>{formatDay(d.date)}</Link></td>
                    <td>{d.PRESENT}</td><td>{d.LATE}</td><td>{d.ABSENT}</td><td>{d.EXCUSED}</td>
                  </tr>
                ))}
                {!data.days.length && <tr><td colSpan={5} className="muted">No registers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function DayOverview({ schoolId, date, setDate, readOnly }: { schoolId?: string; date: string; setDate: (d: string) => void; readOnly?: boolean }) {
  const [day, setDay] = useState<AttendanceDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDay(null);
    setError(null);
    api<AttendanceDay>(`/attendance/day?date=${date}${schoolId ? `&schoolId=${schoolId}` : ''}`).then(setDay).catch((e) => setError(e.message));
  }, [schoolId, date]);
  if (!day) return error ? <ErrorAlert error={error} /> : <p className="muted">Loading…</p>;
  const t = day.totals;
  const marked = t.PRESENT + t.LATE + t.ABSENT + t.EXCUSED;
  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2>{formatWeekday(date)}</h2>
        <DateBar date={date} onChange={setDate} />
      </div>
      {!day.session && <div className="alert info" style={{ marginBottom: 12 }}>No academic session is open.</div>}
      {day.session && !day.isSchoolDay && <div className="alert info" style={{ marginBottom: 12 }}>{day.holiday ? <>This is a holiday ({day.holiday}). No registers are expected.</> : <>This is not a school day in the {day.session} session.</>}</div>}
      <div className="grid g4">
        <div className="card kpi"><div className="k">Registers taken</div><div className="v">{t.taken} / {t.classes}</div></div>
        <div className="card kpi"><div className="k">In school</div><div className="v">{t.PRESENT + t.LATE}</div><div className="small muted">{marked ? `${Math.round(((t.PRESENT + t.LATE) / marked) * 1000) / 10}% of students marked` : 'No one marked yet'}</div></div>
        <div className="card kpi"><div className="k">Absent</div><div className="v">{t.ABSENT}</div><div className="small muted">{t.EXCUSED} excused</div></div>
        <div className="card kpi"><div className="k">Late</div><div className="v">{t.LATE}</div></div>
      </div>
      <div className="card mt">
        <div className="tbl">
          <table>
            <thead><tr><th>Class</th><th>Class teacher</th><th>Students</th><th>Register</th><th>Present</th><th>Late</th><th>Absent</th><th>Excused</th><th></th></tr></thead>
            <tbody>
              {day.classes.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.classTeacher?.fullName ?? <span className="muted">None</span>}</td>
                  <td>{c.students}</td>
                  <td>{c.taken ? <span className="pill p-good" title={`by ${c.takenBy}`}>Taken</span> : c.students ? <span className="pill p-warn">Not taken</span> : <span className="muted small">No students</span>}</td>
                  <td>{c.counts?.PRESENT ?? '–'}</td><td>{c.counts?.LATE ?? '–'}</td><td>{c.counts?.ABSENT ?? '–'}</td><td>{c.counts?.EXCUSED ?? '–'}</td>
                  <td style={{ textAlign: 'right' }}>{c.students > 0 && (c.taken || !readOnly) && <Link className="btn sm" to={`/attendance?class=${c.id}&date=${date}`}>{c.taken ? 'Open' : 'Take register'}</Link>}</td>
                </tr>
              ))}
              {!day.classes.length && <tr><td colSpan={9} className="muted">No classes this session.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function TeacherClasses() {
  const [classes, setClasses] = useState<ClassArm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<ClassArm[]>('/classes').then(setClasses).catch((e) => setError(e.message));
  }, []);
  if (!classes) return error ? <ErrorAlert error={error} /> : <p className="muted">Loading…</p>;
  if (classes.length === 1) return <Navigate to={`/attendance?class=${classes[0].id}`} replace />;
  return (
    <>
      <div className="head"><div><h1>Attendance</h1><p>Choose a class to take its register.</p></div></div>
      {!classes.length && <div className="card"><p className="muted">You are not the class teacher of any class this session.</p></div>}
      <div className="grid g2">
        {classes.map((c) => (
          <div className="card row between" key={c.id}>
            <div><h2>{c.name}</h2><p className="small muted">{c.students} students</p></div>
            <Link className="btn pri" to={`/attendance?class=${c.id}`}>Take register</Link>
          </div>
        ))}
      </div>
    </>
  );
}

export function Attendance() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const classId = params.get('class');
  const date = params.get('date') ?? latestSchoolDay();
  const view = params.get('view');
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [schoolId, setSchoolId] = useState(params.get('school') ?? '');
  const ministry = !!user && isOversight(user.role);

  useEffect(() => {
    if (ministry) api<SchoolRef[]>('/schools/directory').then(setSchools).catch(() => {});
  }, [ministry]);

  const setDate = useCallback(
    (d: string) => {
      const p = new URLSearchParams(params);
      p.set('date', d);
      setParams(p);
    },
    [params, setParams],
  );

  if (!user) return null;
  if (classId && view === 'summary') return <ClassSummary classId={classId} />;
  if (classId) return <RegisterView classId={classId} date={date} setDate={setDate} />;
  if (user.role === 'TEACHER') return <TeacherClasses />;

  return (
    <>
      <div className="head">
        <div>
          <h1>Attendance</h1>
          <p>{ministry ? 'Daily registers for any school.' : 'Which classes have taken the register, and who is absent.'}</p>
        </div>
        {ministry && (
          <label className="field">
            School
            <select id="attendanceSchool" value={schoolId} onChange={(e) => { setSchoolId(e.target.value); const p = new URLSearchParams(params); p.set('school', e.target.value); setParams(p); }}>
              <option value="">Choose a school</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.lga}</option>)}
            </select>
          </label>
        )}
      </div>
      {ministry && !schoolId ? <p className="muted">Choose a school to see its registers.</p> : <DayOverview schoolId={ministry ? schoolId : undefined} date={date} setDate={setDate} readOnly={ministry} />}
    </>
  );
}
