import { useEffect, useState } from 'react';
import { api } from '../api';
import type { StaffRecord } from '../types';
import { useAuth } from '../auth';
import { formatDay, formatDate, signInId } from '../components/ui';
import { ROLE_LABEL } from '../roles';
import { PasswordForm } from './ChangePassword';

/** Read-only view of the signed-in person's own staff record, if the school has linked one. */
function MyStaffRecord() {
  const [s, setS] = useState<StaffRecord | null>(null);
  useEffect(() => {
    api<StaffRecord | null>('/my/staff-record').then(setS).catch(() => {});
  }, []);
  if (!s) return null;
  const current = s.postings.find((p) => !p.endDate);
  return (
    <div className="card mt">
      <h2>Your staff record</h2>
      <dl className="kv">
        <dt>Staff number</dt><dd className="mono">{s.staffNumber}</dd>
        <dt>Post</dt><dd>{s.rank ?? '–'}{s.gradeLevel ? ` · GL ${s.gradeLevel}${s.step ? `/${s.step}` : ''}` : ''}</dd>
        <dt>Current school</dt><dd>{current ? `${current.school.name}, since ${formatDay(current.startDate)}` : '–'}</dd>
        <dt>Years of service</dt><dd>{s.yearsOfService ?? '–'}</dd>
        <dt>Qualifications</dt><dd>{s.qualifications.map((q) => `${q.kind}${q.year ? ` (${q.year})` : ''}`).join(', ') || '–'}</dd>
        <dt>Training</dt><dd>{s.trainings.length ? `${s.trainings.length} recorded, latest: ${s.trainings[0].title}` : '–'}</dd>
      </dl>
      <p className="small muted mt">If something is wrong, ask your school administrator to correct it.</p>
    </div>
  );
}

export function Profile() {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  if (!user) return null;
  return (
    <>
      <div className="head">
        <div>
          <h1>My account</h1>
          <p>Your sign-in details. To change your name, email or phone, ask the administrator who created your account.</p>
        </div>
      </div>
      <div className="grid g2">
        <div className="card">
          <h2>Details</h2>
          <table>
            <tbody>
              <tr><td className="muted">Name</td><td>{user.fullName}</td></tr>
              <tr><td className="muted">Account type</td><td>{ROLE_LABEL[user.role]}</td></tr>
              {user.school && <tr><td className="muted">School</td><td>{user.school.name} <span className="mono small">{user.school.code}</span></td></tr>}
              <tr><td className="muted">Sign in with</td><td className="mono">{signInId(user)}</td></tr>
              {user.email && user.phone && <tr><td className="muted">Also</td><td className="mono">{signInId({ email: null, phone: user.phone })}</td></tr>}
              <tr><td className="muted">Last sign-in</td><td>{formatDate(user.lastLoginAt)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Change password</h2>
          {done ? (
            <div className="alert ok">Password changed. You have been signed out on your other devices.</div>
          ) : (
            <PasswordForm forced={false} onDone={() => setDone(true)} />
          )}
        </div>
      </div>
      <MyStaffRecord />
    </>
  );
}
