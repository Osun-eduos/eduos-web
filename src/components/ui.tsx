import { ReactNode, useState } from 'react';
import type { NewCredentials, User } from '../types';
import { ROLE_LABEL } from '../roles';

export function ErrorAlert({ error }: { error: string | null }) {
  return error ? (
    <div className="alert err" role="alert">
      {error}
    </div>
  ) : null;
}

export function Field(props: { label: string; hint?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`field${props.full ? ' full' : ''}`}>
      {props.label}
      {props.children}
      {props.hint && <span className="hint">{props.hint}</span>}
    </label>
  );
}

export function StatusPill({ user }: { user: User }) {
  if (!user.isActive) return <span className="pill p-mut">Deactivated</span>;
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return <span className="pill p-bad">Locked</span>;
  if (user.mustChangePassword) return <span className="pill p-warn">Awaiting first sign-in</span>;
  return <span className="pill p-good">Active</span>;
}

export const signInId = (u: Pick<User, 'email' | 'phone'>) => u.email ?? formatPhone(u.phone);

export function formatPhone(p: string | null) {
  if (!p) return '';
  const local = p.startsWith('+234') ? '0' + p.slice(4) : p;
  return local.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3');
}

export function formatDate(iso: string | null) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Shows a new account's sign-in details once, ready to hand over. */
export function CredentialsPanel({ creds, onDone, reset }: { creds: NewCredentials; onDone: () => void; reset?: boolean }) {
  const [copied, setCopied] = useState(false);
  const text = `Osun EduOS sign-in\nName: ${creds.user.fullName}\nSign in with: ${signInId(creds.user)}\nTemporary password: ${creds.tempPassword}\nYou will be asked to choose your own password when you first sign in.`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="creds" role="status">
      <h3>{reset ? 'New temporary password' : 'Account created'}: give these details to {creds.user.fullName}</h3>
      <dl>
        <dt>Account type</dt>
        <dd style={{ fontFamily: 'var(--body)' }}>{ROLE_LABEL[creds.user.role]}</dd>
        <dt>Sign in with</dt>
        <dd>{signInId(creds.user)}</dd>
        <dt>Temporary password</dt>
        <dd>{creds.tempPassword}</dd>
      </dl>
      <p className="small muted">
        This password is shown only once. They must choose their own password when they first sign in.
      </p>
      <div className="row">
        <button className="btn" type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy details'}
        </button>
        <button className="btn pri" type="button" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

export function formatDay(iso: string | null) {
  if (!iso) return '–';
  return new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const TRANSFER_PILL: Record<string, [string, string]> = {
  REQUESTED: ['p-warn', 'Awaiting decision'],
  ACCEPTED: ['p-good', 'Accepted'],
  REJECTED: ['p-bad', 'Declined'],
  CANCELLED: ['p-mut', 'Cancelled'],
};

export function TransferPill({ status }: { status: string }) {
  const [c, l] = TRANSFER_PILL[status] ?? ['p-mut', status];
  return <span className={`pill ${c}`}>{l}</span>;
}
