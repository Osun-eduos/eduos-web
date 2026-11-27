import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';

/** Mirrors the API's password rules so people see problems before submitting. */
export function passwordProblem(pw: string) {
  if ([...pw].length < 12) return 'Use at least 12 characters. A short phrase of three or four words is easy to remember.';
  if ([...pw].length > 128) return 'Use 128 characters or fewer.';
  return null;
}

export function PasswordForm({ forced, onDone }: { forced: boolean; onDone: () => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    try {
      await changePassword(current, next);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 12 }}>
      <label className="field">
        {forced ? 'Temporary password' : 'Current password'}
        <input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="field">
        New password
        <input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        <span className="hint">At least 12 characters. A phrase of three or four words works well, for example <em>mango river blue chair</em>. Don't reuse a password from another site.</span>
      </label>
      <label className="field">
        Confirm new password
        <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <ErrorAlert error={error} />
      <button className="btn pri" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
        {busy ? 'Saving…' : forced ? 'Set my password' : 'Change password'}
      </button>
    </form>
  );
}

export function ChangePassword() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <b>Osun EduOS</b>
          <span>Education Management &amp; Intelligence</span>
        </div>
        <div>
          <h1>{user?.mustChangePassword ? 'Choose your password' : 'Change password'}</h1>
          <p className="muted">
            {user?.mustChangePassword
              ? `Welcome, ${user.fullName}. Replace the temporary password you were given with one only you know.`
              : 'Enter your current password and a new one.'}
          </p>
        </div>
        <PasswordForm forced={!!user?.mustChangePassword} onDone={() => navigate('/', { replace: true })} />
        <button className="btn" type="button" onClick={signOut} style={{ justifySelf: 'start' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
