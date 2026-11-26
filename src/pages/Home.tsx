import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { LineChart } from '../components/charts';
import { ClockIn } from './StaffRegister';
import { AttendancePill, ErrorAlert, formatDay, formatPhone, pct, SheetPill, todayNG } from '../components/ui';
import { ageFrom, isMinistry, isOversight, ROLE_LABEL } from '../roles';
import type { AttendanceToday, MySubjects, ReportCardTerm, Role, StudentAttendance, StudentSummary } from '../types';

interface Stats {
  accountsByRole: Record<Role, number>;
  schools: number | null;
  awaitingFirstSignIn: number;
  students: number;
  unplaced: number;
  classes: number;
  session: string | null;
  pendingTransfersIn: number;
  attendanceToday: AttendanceToday | null;
  term: { id: string; name: string; session: string } | null;
  scoresAwaitingApproval: number;
  staff: { teaching: number; nonTeaching: number } | null;
  pupilsPerTeacher: number | null;
  pendingStaffTransfers: number;
}

interface MyClasses {
  session: string | null;
  today?: { isSchoolDay: boolean; holiday: string | null };
  classes: {
    id: string;
    name: string;
    capacity: number;
    registerTakenToday: boolean;
    students: (StudentSummary & { guardians: { relationship: string; fullName: string; phone: string | null; email: string | null }[] })[];
  }[];
}

type Child = StudentSummary & { relationship: string; classTeacher: string | null };

function Kpi({ label, value, note, to }: { label: string; value: number | string; note?: string; to?: string }) {
  const body = (
    <>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {note && <div className="small muted">{note}</div>}
    </>
  );
  return to ? <Link className="card kpi" to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{body}</Link> : <div className="card kpi">{body}</div>;
}

function TodayAttendance({ a, ministry }: { a: AttendanceToday | null | undefined; ministry?: boolean }) {
  if (!a) return null;
  const marked = a.counts.PRESENT + a.counts.LATE + a.counts.ABSENT + a.counts.EXCUSED;
  return (
    <div className="card mt">
      <div className="row between">
        <h2>Attendance today</h2>
        <Link className="btn sm" to="/attendance">{ministry ? 'Registers by school' : 'See registers'}</Link>
      </div>
      {!a.isSchoolDay ? (
        <p className="muted">{a.holiday ? `Today is a holiday (${a.holiday}). No registers are expected.` : 'Today is not a school day.'}</p>
      ) : (
        <div className="grid g4 mt">
          <div className="kpi"><div className="k">Registers taken</div><div className="v">{a.taken} / {a.classes}</div>{a.classes > a.taken && <div className="small muted">{a.classes - a.taken} class{a.classes - a.taken === 1 ? '' : 'es'} still to take it</div>}</div>
          <div className="kpi"><div className="k">In school</div><div className="v">{pct(a.rate)}</div><div className="small muted">of {marked} students marked</div></div>
          <div className="kpi"><div className="k">Absent</div><div className="v">{a.counts.ABSENT}</div><div className="small muted">{a.counts.EXCUSED} more excused</div></div>
          <div className="kpi"><div className="k">Late</div><div className="v">{a.counts.LATE}</div></div>
        </div>
      )}
    </div>
  );
}


function TeacherSubjects() {
  const [data, setData] = useState<MySubjects | null>(null);
  useEffect(() => {
    api<MySubjects>('/my/subjects').then(setData).catch(() => {});
  }, []);
  if (!data?.subjects.length) return null;
  const todo = data.subjects.filter((s) => !s.sheet || s.sheet.status === 'DRAFT' || s.sheet.status === 'RETURNED');
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row between">
        <h2>Scores{data.term ? ` · ${data.term.name}` : ''}</h2>
        <Link className={`btn sm${todo.length ? ' pri' : ''}`} to="/scores">{todo.length ? `${todo.length} to finish` : 'Open scores'}</Link>
      </div>
      <table className="mt"><tbody>
        {data.subjects.map((s) => (
          <tr key={s.id}>
            <td><Link to={`/scores/${s.id}`}>{s.name}</Link> <span className="small muted">· {s.class.name}</span></td>
            <td style={{ textAlign: 'right' }}><SheetPill status={s.sheet?.status} /></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  );
}

function TeacherHome() {
  const [data, setData] = useState<MyClasses | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<MyClasses>('/my/classes').then(setData).catch((e) => setError(e.message));
  }, []);
  if (error) return <ErrorAlert error={error} />;
  if (!data) return <p className="muted">Loading your classes…</p>;
  if (!data.classes.length)
    return (
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>No class yet</h2>
        <p className="muted">Your school administrator hasn't made you a class teacher{data.session ? ` for ${data.session}` : ''} yet.</p>
      </div>
    );
  return (
    <>
      {data.classes.map((c) => (
        <div className="card" key={c.id} style={{ marginBottom: 14 }}>
          <div className="row between">
            <h2>{c.name}</h2>
            <span className="small muted">{data.session} · {c.students.length}/{c.capacity} students</span>
          </div>
          {c.students.length > 0 && data.today && !data.today.isSchoolDay && !c.registerTakenToday && (
            <p className="small muted" style={{ margin: '10px 0' }}>{data.today.holiday ? `Today is a holiday (${data.today.holiday}). No register is needed.` : 'Today is not a school day.'}</p>
          )}
          {c.students.length > 0 && (!data.today || data.today.isSchoolDay || c.registerTakenToday) && (
            <div className={`alert ${c.registerTakenToday ? 'ok' : 'info'} row between`} style={{ margin: '10px 0' }}>
              <span>{c.registerTakenToday ? "Today's register is taken." : "Today's register has not been taken yet."}</span>
              <Link className={`btn sm${c.registerTakenToday ? '' : ' pri'}`} to={`/attendance?class=${c.id}`}>{c.registerTakenToday ? 'Open register' : 'Take register'}</Link>
            </div>
          )}
          <div className="tbl">
            <table>
              <thead><tr><th>Name</th><th>Learner ID</th><th>Sex</th><th>Age</th><th>Parent</th></tr></thead>
              <tbody>
                {c.students.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/students/${s.id}`}>{s.fullName}</Link></td>
                    <td className="mono small">{s.learnerId}</td>
                    <td>{s.sex}</td>
                    <td>{ageFrom(s.dateOfBirth)}</td>
                    <td className="small">
                      {s.guardians[0] ? <>{s.guardians[0].fullName} <span className="mono muted">{formatPhone(s.guardians[0].phone) || s.guardians[0].email}</span></> : <span className="muted">–</span>}
                    </td>
                  </tr>
                ))}
                {!c.students.length && <tr><td colSpan={5} className="muted">No students placed in this class yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

function ChildAttendance({ id }: { id: string }) {
  const [a, setA] = useState<StudentAttendance | null>(null);
  useEffect(() => {
    api<StudentAttendance>(`/attendance/students/${id}`).then(setA).catch(() => {});
  }, [id]);
  if (!a || a.rate === null) return null;
  const lastAbsent = a.records.find((r) => r.status === 'ABSENT');
  return (
    <span className="small">
      Attendance this session <b>{pct(a.rate)}</b>
      {lastAbsent ? <> · last absent {formatDay(lastAbsent.date)}</> : <> · no absences</>}
    </span>
  );
}

function ChildReport({ id }: { id: string }) {
  const [terms, setTerms] = useState<ReportCardTerm[]>([]);
  useEffect(() => {
    api<ReportCardTerm[]>(`/report-cards/${id}/terms`).then(setTerms).catch(() => {});
  }, [id]);
  const latest = terms.find((t) => t.released);
  if (!latest) return null;
  return <span className="small">Report card: <b>{latest.name}, {latest.session}</b> is ready</span>;
}

interface Progress { termId: string; term: string; session: string; className: string; average: number | null; position: string | null }
interface Timetable { term: { name: string } | null; className: string | null; papers: { subjectCode: string; subject: string; date: string; startTime: string; minutes: number }[] }
interface SchoolNotice { id: string; title: string; body: string; school: string | null; createdAt: string }

/** One child's page in the parent portal: results, attendance, the exam timetable and progress over time. */
function ChildPortal({ child }: { child: Child }) {
  const [att, setAtt] = useState<StudentAttendance | null>(null);
  const [prog, setProg] = useState<Progress[]>([]);
  const [exams, setExams] = useState<Timetable | null>(null);
  useEffect(() => {
    api<StudentAttendance>(`/attendance/students/${child.id}`).then(setAtt).catch(() => setAtt(null));
    api<Progress[]>(`/report-cards/${child.id}/progress`).then(setProg).catch(() => setProg([]));
    api<Timetable>(`/exam-papers/student/${child.id}`).then(setExams).catch(() => setExams(null));
  }, [child.id]);
  const last = prog[prog.length - 1];
  const c = att?.counts;
  const upcoming = (exams?.papers ?? []).filter((p) => p.date >= todayNG());
  return (
    <>
      <div className="grid g4 mt">
        <div className="card kpi"><div className="k">Term average</div><div className="v">{last?.average ?? '–'}</div><div className="small muted">{last ? `${last.term}, ${last.session}` : 'No report card yet'}</div></div>
        <div className="card kpi"><div className="k">Attendance</div><div className="v">{pct(att?.rate ?? null)}</div><div className="small muted">{c ? `${c.LATE} late, ${c.ABSENT} absent this session` : ' '}</div></div>
        <div className="card kpi"><div className="k">Class position</div><div className="v">{last?.position?.split(' ')[0] ?? '–'}</div><div className="small muted">{last?.position ? `${last.position.split(' ').slice(1).join(' ')} in ${last.className}` : ' '}</div></div>
        <div className="card kpi"><div className="k">Results</div><div className="v" style={{ fontSize: '1.1rem' }}>{last ? 'Released' : 'Not yet'}</div><div className="small muted">{last ? <Link to={`/report-card/${child.id}?term=${last.termId}`}>View report card</Link> : 'Shown once the principal releases them'}</div></div>
      </div>
      <div className="grid g2 mt">
        <div className="card">
          <h2>Academic progress</h2>
          {prog.length ? (
            <LineChart label="Term average over time" labels={prog.map((p) => `${p.term.replace(' term', '')} ${p.className.split(' ').slice(0, 2).join(' ')}`)} lines={[{ name: 'Term average', color: 'var(--series-1)', values: prog.map((p) => p.average) }]} max={100} />
          ) : <p className="muted small">The chart appears after the first report card.</p>}
        </div>
        <div className="card">
          <h2>Exam timetable{exams?.term ? ` · ${exams.term.name}` : ''}</h2>
          {!exams?.papers.length && <p className="muted small">The school has not published an exam timetable for {exams?.className ?? 'this class'} yet.</p>}
          <ul className="items">
            {(upcoming.length ? upcoming : exams?.papers ?? []).map((p) => (
              <li key={p.subjectCode}><b>{p.subject}</b><span className="small muted">{formatDay(p.date)} · {p.startTime} · {p.minutes} min</span></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="card mt">
        <h2>Recent attendance</h2>
        {!att?.records.length && <p className="muted small">No registers yet this session.</p>}
        <div className="tbl">
          <table>
            <tbody>
              {att?.records.slice(0, 8).map((r) => <tr key={r.date}><td>{formatDay(r.date)}</td><td><AttendancePill status={r.status} /></td><td className="small muted">{r.note ?? ''}</td></tr>)}
            </tbody>
          </table>
        </div>
        <Link className="small" to={`/students/${child.id}`}>Full record</Link>
      </div>
    </>
  );
}

function ParentHome() {
  const [kids, setKids] = useState<Child[] | null>(null);
  const [pick, setPick] = useState(0);
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Child[]>('/my/children').then(setKids).catch((e) => setError(e.message));
    api<SchoolNotice[]>('/notices/mine').then(setNotices).catch(() => {});
  }, []);
  if (error) return <ErrorAlert error={error} />;
  if (!kids) return <p className="muted">Loading…</p>;
  if (!kids.length)
    return (
      <div className="card">
        <h2>No children linked yet</h2>
        <p className="muted">Ask your child's school to link your account to their record.</p>
      </div>
    );
  const child = kids[Math.min(pick, kids.length - 1)];
  return (
    <>
      <div className="grid g2">
        {kids.map((k, i) => (
          <button key={k.id} type="button" onClick={() => setPick(i)} className="card child" aria-pressed={i === pick} style={{ textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', outline: i === pick && kids.length > 1 ? '2px solid var(--series-1)' : undefined }}>
            <b>{k.fullName}</b>
            <span className="small muted">You're listed as {k.relationship.toLowerCase()} · <span className="mono">{k.learnerId}</span></span>
            <span>{k.school?.name ?? 'Not enrolled in a school'}</span>
            <span>{k.currentClass ? <>Class <b>{k.currentClass.name}</b>{k.classTeacher && <> · class teacher {k.classTeacher}</>}</> : <span className="pill p-warn">No class yet</span>}</span>
            <ChildAttendance id={k.id} />
            <ChildReport id={k.id} />
          </button>
        ))}
      </div>
      <ChildPortal child={child} key={child.id} />
      <div className="card mt">
        <div className="row between"><h2 style={{ margin: 0 }}>School announcements</h2><Link className="small" to="/notifications">All notifications</Link></div>
        {!notices.length && <p className="muted small mt">No announcements yet.</p>}
        <ul className="items mt">
          {notices.slice(0, 6).map((n) => <li key={n.id}><b>{n.title}</b><span>{n.body}</span><span className="small muted">{n.school} · {formatDay(n.createdAt.slice(0, 10))}</span></li>)}
        </ul>
      </div>
    </>
  );
}

export function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manages = user && (isOversight(user.role) || user.role === 'SCHOOL_ADMIN');

  useEffect(() => {
    if (!manages) return;
    api<Stats>('/stats').then(setStats).catch((e) => setError(e.message));
  }, [manages]);

  if (!user) return null;
  const first = user.fullName.split(' ')[0];
  const c = stats?.accountsByRole;
  const noSession = stats && !stats.session;

  if (isOversight(user.role)) {
    const area = user.lga ? `${user.lga} LGA` : user.role === 'INSPECTOR' ? 'State-wide' : 'Ministry of Education';
    const staffCounts = isMinistry(user.role);
    return (
      <>
        <div className="head">
          <div>
            <h1>Good day, {first}</h1>
            <p>{area} · {ROLE_LABEL[user.role]}{stats?.term ? ` · ${stats.term.name}, ${stats.term.session}` : stats?.session ? ` · ${stats.session} session` : ''}</p>
          </div>
          {user.role === 'MINISTRY_ADMIN' && (
            <div className="row">
              <Link className="btn" to="/accounts">Add a Ministry account</Link>
              <Link className="btn pri" to="/schools?new=1">Register a school</Link>
            </div>
          )}
        </div>
        <ErrorAlert error={error} />
        {stats?.session && !stats.term && user.role === 'MINISTRY_ADMIN' && (
          <div className="alert info" style={{ marginBottom: 14 }}>
            No term is current, so teachers can't enter scores. <Link to="/sessions">Set up the terms</Link>.
          </div>
        )}
        {noSession && user.role === 'MINISTRY_ADMIN' && (
          <div className="alert info" style={{ marginBottom: 14 }}>
            No academic session is open yet. Schools can't create classes until you <Link to="/sessions">open one</Link>.
          </div>
        )}
        <div className="grid g4">
          <Kpi label={user.lga ? `Schools in ${user.lga}` : 'Registered schools'} value={stats?.schools ?? '–'} to="/schools" />
          <Kpi label="Students enrolled" value={stats?.students ?? '–'} to="/students" />
          <Kpi label="Classes this session" value={stats?.classes ?? '–'} />
          <Kpi label="Not yet in a class" value={stats?.unplaced ?? '–'} />
        </div>
        <div className="grid g4 mt">
          <Kpi label="Teaching staff" value={stats?.staff?.teaching ?? '–'} to="/staff" />
          <Kpi label="Non-teaching staff" value={stats?.staff?.nonTeaching ?? '–'} to="/staff" />
          <Kpi label="Pupils per teacher" value={stats?.pupilsPerTeacher ?? '–'} note="Students enrolled for each teacher in the registry" />
          <Kpi label="Staff transfers waiting" value={stats?.pendingStaffTransfers ?? '–'} to="/staff-transfers" />
        </div>
        {staffCounts && <div className="grid g4 mt">
          <Kpi label="School administrators" value={c?.SCHOOL_ADMIN ?? '–'} />
          <Kpi label="Teachers" value={c?.TEACHER ?? '–'} />
          <Kpi label="Parents" value={c?.PARENT ?? '–'} />
          <Kpi label="Awaiting first sign-in" value={stats?.awaitingFirstSignIn ?? '–'} note="Accounts on a temporary password" />
        </div>}
        <TodayAttendance a={stats?.attendanceToday} ministry />
        <p className="mt"><Link className="btn pri" to="/dashboard">Open the dashboard</Link> <span className="small muted">Indicators by LGA and school, trends, and Excel, PDF and CSV reports.</span></p>
      </>
    );
  }

  if (user.role === 'SCHOOL_ADMIN') {
    return (
      <>
        <div className="head">
          <div>
            <h1>Good day, {first}</h1>
            <p>{user.school?.name} · <span className="mono">{user.school?.code}</span>{stats?.term ? ` · ${stats.term.name}, ${stats.term.session}` : stats?.session ? ` · ${stats.session} session` : ''}</p>
          </div>
          <div className="row">
            <Link className="btn" to="/accounts?new=1">Add a teacher or parent</Link>
            <Link className="btn pri" to="/students/new">Enrol a student</Link>
          </div>
        </div>
        <ErrorAlert error={error} />
        <ClockIn />
        {noSession && <div className="alert info" style={{ marginBottom: 14 }}>The Ministry hasn't opened an academic session yet, so classes can't be created. You can still enrol students.</div>}
        {!!stats?.scoresAwaitingApproval && (
          <div className="alert info" style={{ marginBottom: 14 }}>
            <b>{stats.scoresAwaitingApproval}</b> score sheet{stats.scoresAwaitingApproval === 1 ? ' is' : 's are'} waiting for your approval. <Link to="/results">Review results</Link>
          </div>
        )}
        {!!stats?.pendingTransfersIn && (
          <div className="alert info" style={{ marginBottom: 14 }}>
            <b>{stats.pendingTransfersIn}</b> student{stats.pendingTransfersIn === 1 ? ' is' : 's are'} waiting to transfer into your school. <Link to="/transfers">Review transfers</Link>
          </div>
        )}
        <div className="grid g4">
          <Kpi label="Students" value={stats?.students ?? '–'} to="/students" />
          <Kpi label="Not yet in a class" value={stats?.unplaced ?? '–'} to="/students?unplaced=1" />
          <Kpi label="Classes" value={stats?.classes ?? '–'} to="/classes" />
          <Kpi label="Teaching staff" value={stats?.staff?.teaching ?? '–'} to="/staff" note={stats?.pupilsPerTeacher ? `${stats.pupilsPerTeacher} pupils per teacher` : undefined} />
        </div>
        <div className="grid g4 mt">
          <Kpi label="Parents" value={c?.PARENT ?? '–'} />
          <Kpi label="Teacher accounts" value={c?.TEACHER ?? '–'} to="/accounts" />
          <Kpi label="Awaiting first sign-in" value={stats?.awaitingFirstSignIn ?? '–'} />
          <Kpi label="Transfers waiting" value={stats?.pendingTransfersIn ?? '–'} to="/transfers" />
        </div>
        <TodayAttendance a={stats?.attendanceToday} />
      </>
    );
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Good day, {first}</h1>
          <p>{ROLE_LABEL[user.role]}{user.school && user.role === 'TEACHER' ? ` · ${user.school.name}` : ''}</p>
        </div>
      </div>
      {user.role === 'TEACHER' ? <><ClockIn /><TeacherHome /><TeacherSubjects /></> : <ParentHome />}
    </>
  );
}
