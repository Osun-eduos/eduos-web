import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';
import type { User } from '../types';

interface Setup { secret: string; otpauthUrl: string; qrSvg: string }
interface Status { enabled: boolean; required: boolean; enabledAt: string | null; recoveryCodesLeft: number }
interface Session { accessToken: string; user: User }

/** Groups a secret in fours so it is easier to type into an authenticator app by hand. */
const grouped = (s: string) => s.replace(/(.{4})/g, '$1 ').trim();

/** One-time recovery codes, shown once, with ways to keep them. */
export function RecoveryCodes({ codes, onDone, doneLabel }: { codes: string[]; onDone: () => void; doneLabel: string }) {
  const [saved, setSaved] = useState(false);
  const text = `Osun EduOS recovery codes\nEach code works once, if you cannot use your authenticator app.\n\n${codes.join('\n')}\n`;
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'osun-eduos-recovery-codes.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="alert info">
        Save these recovery codes somewhere safe, such as a password manager or printed and locked away. Each one works once if you
        lose your phone. <b>They will not be shown again.</b>
      </div>
      <ol className="grid g2 mono" style={{ margin: 0, paddingLeft: 22 }}>
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ol>
      <div className="row">
        <button className="btn" type="button" onClick={download}>Download</button>
        <button className="btn" type="button" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}>Copy</button>
        <button className="btn" type="button" onClick={() => window.print()}>Print</button>
      </div>
      <label className="row small" style={{ gap: 6 }}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I have saved my recovery codes
      </label>
      <button className="btn pri" type="button" disabled={!saved} onClick={onDone} style={{ justifyContent: 'center' }}>{doneLabel}</button>
    </div>
  );
}

/** Scan the QR code, type the first code, keep the recovery codes. */
export function TwoStepSetup({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { adoptSession } = useAuth();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Setup>('/auth/two-step/setup', { method: 'POST' }).then(setSetup).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not start set-up.'));
  }, []);

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) return setError('Enter the 6-digit code your app shows.');
    setBusy(true);
    try {
      const r = await api<Session & { recoveryCodes: string[] }>('/auth/two-step/confirm', { method: 'POST', json: { code } });
      adoptSession(r);
      setCodes(r.recoveryCodes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (codes) return <RecoveryCodes codes={codes} onDone={onDone} doneLabel="Done" />;
  return (
    <form onSubmit={confirm} noValidate style={{ display: 'grid', gap: 12 }}>
      <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        <li>Install an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.</li>
        <li>In the app, add an account and scan this code.</li>
        <li>Type the 6-digit code the app shows.</li>
      </ol>
      {setup ? (
        <>
          <img
            src={`data:image/svg+xml;base64,${btoa(setup.qrSvg)}`}
            alt="QR code to add Osun EduOS to your authenticator app"
            width={200}
            height={200}
            style={{ background: '#fff', padding: 8, borderRadius: 8, justifySelf: 'start' }}
          />
          <p className="small muted">
            Can't scan? Choose "enter a setup key" in the app and type <span className="mono">{grouped(setup.secret)}</span> (time-based).
          </p>
        </>
      ) : (
        !error && <p className="muted">Preparing…</p>
      )}
      <label className="field">
        Code from the app
        <input id="totp" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
      </label>
      <ErrorAlert error={error} />
      <div className="row">
        <button className="btn pri" type="submit" disabled={busy || !setup}>{busy ? 'Checking…' : 'Turn on two-step sign-in'}</button>
        {onCancel && <button className="btn" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

/** Full-page set-up for Ministry accounts, which cannot use the system until two-step sign-in is on. */
export function TwoStepRequired() {
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
          <h1>Set up two-step sign-in</h1>
          <p className="muted">
            {user?.fullName ? `${user.fullName}, your` : 'Your'} account can see information about every school, so it needs a code from your
            phone as well as your password. This takes about two minutes.
          </p>
        </div>
        <TwoStepSetup onDone={() => navigate('/', { replace: true })} />
        <button className="btn" type="button" onClick={signOut} style={{ justifySelf: 'start' }}>Sign out</button>
      </div>
    </div>
  );
}

/** The two-step sign-in card on "My account". */
export function TwoStepCard() {
  const { user, adoptSession } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<'idle' | 'setup' | 'off' | 'codes'>('idle');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<Status>('/auth/two-step').then(setStatus).catch(() => {});
  useEffect(() => {
    load();
  }, [user?.twoStepEnabled]);

  async function run(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'off') {
        adoptSession(await api<Session>('/auth/two-step/disable', { method: 'POST', json: { password, code } }));
        setMode('idle');
      } else {
        setCodes((await api<{ recoveryCodes: string[] }>('/auth/two-step/recovery-codes', { method: 'POST', json: { code } })).recoveryCodes);
      }
      setCode('');
      setPassword('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;
  return (
    <div className="card mt">
      <h2>Two-step sign-in</h2>
      {codes ? (
        <RecoveryCodes codes={codes} doneLabel="Done" onDone={() => { setCodes(null); setMode('idle'); }} />
      ) : mode === 'setup' ? (
        <TwoStepSetup onDone={() => { setMode('idle'); load(); }} onCancel={() => setMode('idle')} />
      ) : mode === 'off' || mode === 'codes' ? (
        <form onSubmit={run} noValidate style={{ display: 'grid', gap: 12 }}>
          {mode === 'off' && (
            <label className="field">
              Your password
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          <label className="field">
            {mode === 'off' ? 'Code from your app, or a recovery code' : 'Code from your app'}
            <input inputMode={mode === 'codes' ? 'numeric' : 'text'} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <ErrorAlert error={error} />
          <div className="row">
            <button className={`btn ${mode === 'off' ? 'danger' : 'pri'}`} type="submit" disabled={busy}>
              {busy ? 'Working…' : mode === 'off' ? 'Turn off two-step sign-in' : 'Make new recovery codes'}
            </button>
            <button className="btn" type="button" onClick={() => { setMode('idle'); setError(null); }}>Cancel</button>
          </div>
        </form>
      ) : status.enabled ? (
        <>
          <p>
            <span className="pill p-good">On</span> You sign in with your password and a code from your authenticator app.
            {status.required && ' It is required for Ministry accounts.'}
          </p>
          <p className={`small ${status.recoveryCodesLeft <= 3 ? '' : 'muted'}`}>
            {status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1 ? '' : 's'} left.
            {status.recoveryCodesLeft <= 3 && ' Make new ones soon.'}
          </p>
          <div className="row">
            <button className="btn" onClick={() => setMode('codes')}>New recovery codes</button>
            {!status.required && <button className="btn danger" onClick={() => setMode('off')}>Turn off</button>}
          </div>
          <p className="small muted mt">New phone? {status.required ? 'Ask a Ministry administrator to reset two-step sign-in, then set it up again.' : 'Turn it off, then set it up again on the new phone.'}</p>
        </>
      ) : (
        <>
          <p>Protect your account with a code from your phone as well as your password, so a stolen password alone is not enough.</p>
          <button className="btn pri" onClick={() => setMode('setup')}>Set up two-step sign-in</button>
        </>
      )}
    </div>
  );
}
