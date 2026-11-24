import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';
import { ROLE_LABEL } from '../roles';
import type { Role } from '../types';

interface Stats {
  accountsByRole: Record<Role, number>;
  schools: number | null;
  awaitingFirstSignIn: number;
}

function Kpi({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="card kpi">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {note && <div className="small muted">{note}</div>}
    </div>
  );
}

function ComingNext({ items }: { items: string[] }) {
  return (
    <div className="card mt">
      <h2>Coming next</h2>
      <p className="muted">These features from the prototype are being built into this app:</p>
      <ul>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
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

  if (user.role === 'MINISTRY_ADMIN' || user.role === 'MINISTRY_OFFICER') {
    return (
      <>
        <div className="head">
          <div>
            <h1>Good day, {first}</h1>
            <p>Ministry of Education · {ROLE_LABEL[user.role]}</p>
          </div>
          {user.role === 'MINISTRY_ADMIN' && (
            <div className="row">
              <Link className="btn" to="/accounts">Add a Ministry account</Link>
              <Link className="btn pri" to="/schools?new=1">Register a school</Link>
            </div>
          )}
        </div>
        <ErrorAlert error={error} />
        <div className="grid g4">
          <Kpi label="Registered schools" value={stats?.schools ?? '–'} />
          <Kpi label="School administrators" value={c?.SCHOOL_ADMIN ?? '–'} />
          <Kpi label="Teachers" value={c?.TEACHER ?? '–'} />
          <Kpi label="Parents" value={c?.PARENT ?? '–'} />
        </div>
        <div className="grid g2 mt">
          <Kpi label="Ministry accounts" value={c ? c.MINISTRY_ADMIN + c.MINISTRY_OFFICER : '–'} />
          <Kpi label="Awaiting first sign-in" value={stats?.awaitingFirstSignIn ?? '–'} note="Accounts still using a temporary password" />
        </div>
        <ComingNext items={['State dashboard, LGA comparison and indicators', 'Results submissions from schools', 'Teacher registry, infrastructure and inspections']} />
      </>
    );
  }

  if (user.role === 'SCHOOL_ADMIN') {
    return (
      <>
        <div className="head">
          <div>
            <h1>Good day, {first}</h1>
            <p>
              {user.school?.name} · <span className="mono">{user.school?.code}</span>
            </p>
          </div>
          <Link className="btn pri" to="/accounts?new=1">Add a teacher or parent</Link>
        </div>
        <ErrorAlert error={error} />
        <div className="grid g4">
          <Kpi label="Teachers" value={c?.TEACHER ?? '–'} />
          <Kpi label="Parents" value={c?.PARENT ?? '–'} />
          <Kpi label="Administrators" value={c?.SCHOOL_ADMIN ?? '–'} />
          <Kpi label="Awaiting first sign-in" value={stats?.awaitingFirstSignIn ?? '–'} />
        </div>
        <ComingNext items={['Students, enrolment and class allocation', 'Attendance register', 'Results approval and submission to the Ministry']} />
      </>
    );
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Good day, {first}</h1>
          <p>
            {ROLE_LABEL[user.role]}
            {user.school ? ` · ${user.school.name}` : ''}
          </p>
        </div>
      </div>
      <div className="card">
        <h2>You're signed in</h2>
        <p className="muted">
          {user.role === 'TEACHER'
            ? 'Your classes, score entry and attendance register will appear here as they are released.'
            : "Your children's results, attendance and school announcements will appear here as they are released."}
        </p>
      </div>
      <ComingNext
        items={
          user.role === 'TEACHER'
            ? ['Score entry (web and mobile app, works offline)', 'Attendance register', 'Report cards']
            : ['Results and report cards', 'Attendance', 'Announcements and SMS notifications']
        }
      />
    </>
  );
}
