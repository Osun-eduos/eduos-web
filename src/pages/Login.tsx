import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';

export function Login() {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && user) return <Navigate to={user.mustChangePassword ? '/change-password' : from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Enter your email or phone number and your password.');
      return;
    }
    setBusy(true);
    try {
      const u = await signIn(identifier, password);
      navigate(u.mustChangePassword ? '/change-password' : from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Try again.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <b>Osun EduOS</b>
          <span>Education Management &amp; Intelligence</span>
        </div>
        <div>
          <h1>Sign in</h1>
          <p className="muted">For the Ministry of Education, schools, teachers and parents.</p>
        </div>
        <form onSubmit={submit} noValidate>
          <label className="field">
            Email or phone number
            <input id="identifier" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or 0803 123 4567" autoFocus />
          </label>
          <label className="field">
            Password
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="row small muted" style={{ gap: 6 }}>
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
          </label>
          <ErrorAlert error={error} />
          <button className="btn pri" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small muted">
          Accounts are issued by your school or the Ministry. Forgot your password? Teachers and parents should ask their school
          administrator to reset it; school administrators should contact the Ministry.
        </p>
      </div>
    </div>
  );
}
