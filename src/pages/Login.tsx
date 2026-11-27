import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { needsTwoStep, useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';
import type { User } from '../types';

export function Login() {
  const { user, ready, signIn, signInWithCode } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set after a correct password when the account uses two-step sign-in. */
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  const nextPage = (u: User) => (u.mustChangePassword ? '/change-password' : needsTwoStep(u) ? '/two-step' : from);

  if (ready && user) return <Navigate to={nextPage(user)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Enter your email or phone number and your password.');
      return;
    }
    setBusy(true);
    try {
      const r = await signIn(identifier, password);
      if ('mfaRequired' in r) {
        setMfaToken(r.mfaToken);
        setPassword('');
        return;
      }
      navigate(nextPage(r), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Try again.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mfaToken) return;
    const clean = code.trim();
    if (useRecovery ? clean.replace(/[^A-Za-z0-9]/g, '').length !== 10 : !/^\d{6}$/.test(clean.replace(/\s/g, ''))) {
      setError(useRecovery ? 'Enter one of your recovery codes, like ABCDE-FGHJK.' : 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    try {
      const u = await signInWithCode(mfaToken, clean);
      navigate(nextPage(u), { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign-in failed. Try again.';
      setError(message);
      setCode('');
      // The challenge has expired or run out of tries: start again from the password.
      if (err instanceof ApiError && /expired/i.test(message)) setMfaToken(null);
    } finally {
      setBusy(false);
    }
  }

  if (mfaToken) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <Link to="/" className="auth-back">← Back to home</Link>
          <Link to="/" className="brand" aria-label="Osun EduOS home">
            <b>Osun EduOS</b>
            <span>Ministry of Education, State of Osun</span>
          </Link>
          <div>
            <h1>Enter your code</h1>
            <p className="muted">
              {useRecovery ? 'Type one of the recovery codes you saved. Each one works once.' : 'Open your authenticator app and type the 6-digit code for Osun EduOS.'}
            </p>
          </div>
          <form onSubmit={submitCode} noValidate>
            <label className="field">
              {useRecovery ? 'Recovery code' : 'Code'}
              <input
                id="code"
                autoFocus
                inputMode={useRecovery ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                maxLength={useRecovery ? 11 : 7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={useRecovery ? 'ABCDE-FGHJK' : '123456'}
              />
            </label>
            <ErrorAlert error={error} />
            <button className="btn pri" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
              {busy ? 'Checking…' : 'Sign in'}
            </button>
          </form>
          <div className="row small">
            <button className="btn sm" type="button" onClick={() => { setUseRecovery(!useRecovery); setCode(''); setError(null); }}>
              {useRecovery ? 'Use my authenticator app' : 'Use a recovery code'}
            </button>
            <button className="btn sm" type="button" onClick={() => { setMfaToken(null); setCode(''); setError(null); }}>Start again</button>
          </div>
          <p className="small muted">Lost your phone and your recovery codes? Ask a Ministry administrator (or your school administrator) to reset two-step sign-in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="auth-back">← Back to home</Link>
        <Link to="/" className="brand" aria-label="Osun EduOS home">
          <b>Osun EduOS</b>
          <span>Ministry of Education, State of Osun</span>
        </Link>
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
