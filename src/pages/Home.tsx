import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatPhone } from '../components/ui';
import { ageFrom, ROLE_LABEL } from '../roles';
import type { Role, StudentSummary } from '../types';

interface Stats {
  accountsByRole: Record<Role, number>;
  schools: number | null;
  awaitingFirstSignIn: number;
  students: number;
  unplaced: number;
  classes: number;
  session: string | null;
  pendingTransfersIn: number;
}

interface MyClasses {
  session: string | null;
  classes: {
    id: string;
    name: string;
    capacity: number;
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

function ComingNext({ items }: { items: string[] }) {
  return (
    <div className="card mt">
      <h2>Coming next</h2>
      <p className="muted">These features from the prototype are being built into this app:</p>
      <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
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
      <div className="card">
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

function ParentHome() {
  const [kids, setKids] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Child[]>('/my/children').then(setKids).catch((e) => setError(e.message));
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
  return (
    <div className="grid g2">
      {kids.map((k) => (
        <Link key={k.id} to={`/students/${k.id}`} className="card child" style={{ textDecoration: 'none', color: 'inherit' }}>
          <b>{k.fullName}</b>
          <span className="small muted">You're listed as {k.relationship.toLowerCase()} · <span className="mono">{k.learnerId}</span></span>
          <span>{k.school?.name ?? 'Not enrolled in a school'}</span>
          <span>{k.currentClass ? <>Class <b>{k.currentClass.name}</b>{k.classTeacher && <> · class teacher {k.classTeacher}</>}</> : <span className="pill p-warn">No class yet</span>}</span>
        </Link>
      ))}
    </div>
  );
}

export function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manages = user && ['MINISTRY_ADMIN', 'MINISTRY_OFFICER', 'SCHOOL_ADMIN'].includes(user.role);

  useEffect(() => {
    if (!manages) return;
    api<Stats>('/stats').then(setStats).catch((e) => setError(e.message));
  }, [manages]);

  if (!user) return null;
  const first = user.fullName.split(' ')[0];
  const c = stats?.accountsByRole;
  const noSession = stats && !stats.session;

  if (user.role === 'MINISTRY_ADMIN' || user.role === 'MINISTRY_OFFICER') {
    return (
      <>
        <div className="head">
          <div>
            <h1>Good day, {first}</h1>
            <p>Ministry of Education · {ROLE_LABEL[user.role]}{stats?.session ? ` · ${stats.session} session` : ''}</p>
          </div>
          {user.role === 'MINISTRY_ADMIN' && (
            <div className="row">
              <Link className="btn" to="/accounts">Add a Ministry account</Link>
              <Link className="btn pri" to="/schools?new=1">Register a school</Link>
            </div>
          )}
        </div>
        <ErrorAlert error={error} />
        {noSession && user.role === 'MINISTRY_ADMIN' && (
          <div className="alert info" style={{ marginBottom: 14 }}>
            No academic session is open yet. Schools can't create classes until you <Link to="/sessions">open one</Link>.
          </div>
        )}
        <div className="grid g4">
          <Kpi label="Registered schools" value={stats?.schools ?? '–'} to="/schools" />
          <Kpi label="Students enrolled" value={stats?.students ?? '–'} to="/students" />
          <Kpi label="Classes this session" value={stats?.classes ?? '–'} />
          <Kpi label="Not yet in a class" value={stats?.unplaced ?? '–'} />
        </div>
        <div className="grid g4 mt">
          <Kpi label="School administrators" value={c?.SCHOOL_ADMIN ?? '–'} />
          <Kpi label="Teachers" value={c?.TEACHER ?? '–'} />
          <Kpi label="Parents" value={c?.PARENT ?? '–'} />
          <Kpi label="Awaiting first sign-in" value={stats?.awaitingFirstSignIn ?? '–'} note="Accounts on a temporary password" />
        </div>
        <ComingNext items={['Attendance register', 'Score entry, results and report cards', 'State dashboard and LGA comparison']} />
      </>
    );
  }

  if (user.role === 'SCHOOL_ADMIN') {
    return (
      <>
        <div className="head">
          <div>
            <h1>Good day, {first}</h1>
            <p>{user.school?.name} · <span className="mono">{user.school?.code}</span>{stats?.session ? ` · ${stats.session} session` : ''}</p>
          </div>
          <div className="row">
            <Link className="btn" to="/accounts?new=1">Add a teacher or parent</Link>
            <Link className="btn pri" to="/students/new">Enrol a student</Link>
          </div>
        </div>
        <ErrorAlert error={error} />
        {noSession && <div className="alert info" style={{ marginBottom: 14 }}>The Ministry hasn't opened an academic session yet, so classes can't be created. You can still enrol students.</div>}
        {!!stats?.pendingTransfersIn && (
          <div className="alert info" style={{ marginBottom: 14 }}>
            <b>{stats.pendingTransfersIn}</b> student{stats.pendingTransfersIn === 1 ? ' is' : 's are'} waiting to transfer into your school. <Link to="/transfers">Review transfers</Link>
          </div>
        )}
        <div className="grid g4">
          <Kpi label="Students" value={stats?.students ?? '–'} to="/students" />
          <Kpi label="Not yet in a class" value={stats?.unplaced ?? '–'} to="/students?unplaced=1" />
          <Kpi label="Classes" value={stats?.classes ?? '–'} to="/classes" />
          <Kpi label="Teachers" value={c?.TEACHER ?? '–'} to="/accounts" />
        </div>
        <div className="grid g4 mt">
          <Kpi label="Parents" value={c?.PARENT ?? '–'} />
          <Kpi label="Administrators" value={c?.SCHOOL_ADMIN ?? '–'} />
          <Kpi label="Awaiting first sign-in" value={stats?.awaitingFirstSignIn ?? '–'} />
          <Kpi label="Transfers waiting" value={stats?.pendingTransfersIn ?? '–'} to="/transfers" />
        </div>
        <ComingNext items={['Attendance register', 'Results approval and submission to the Ministry', 'Report cards']} />
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
      {user.role === 'TEACHER' ? <TeacherHome /> : <ParentHome />}
      <ComingNext
        items={user.role === 'TEACHER'
          ? ['Attendance register', 'Score entry (web and mobile app, works offline)', 'Report cards']
          : ['Results and report cards', 'Attendance', 'Announcements and SMS notifications']}
      />
    </>
  );
}
