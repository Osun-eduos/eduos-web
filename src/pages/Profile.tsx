import { useState } from 'react';
import { useAuth } from '../auth';
import { formatDate, signInId } from '../components/ui';
import { ROLE_LABEL } from '../roles';
import { PasswordForm } from './ChangePassword';

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
    </>
  );
}
