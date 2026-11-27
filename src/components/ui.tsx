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
  if (user.twoStepRequired && !user.twoStepEnabled) return <span className="pill p-warn">Two-step not set up</span>;
  if (user.twoStepEnabled) return <span className="pill p-good">Active · two-step</span>;
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
  APPROVED: ['p-good', 'Approved'],
  REJECTED: ['p-bad', 'Declined'],
  CANCELLED: ['p-mut', 'Cancelled'],
};

export function TransferPill({ status }: { status: string }) {
  const [c, l] = TRANSFER_PILL[status] ?? ['p-mut', status];
  return <span className={`pill ${c}`}>{l}</span>;
}

export const ATTENDANCE: Record<string, { label: string; short: string; pill: string }> = {
  PRESENT: { label: 'Present', short: 'P', pill: 'p-good' },
  LATE: { label: 'Late', short: 'L', pill: 'p-warn' },
  ABSENT: { label: 'Absent', short: 'A', pill: 'p-bad' },
  EXCUSED: { label: 'Excused', short: 'E', pill: 'p-ind' },
};

export function AttendancePill({ status }: { status: string }) {
  const a = ATTENDANCE[status];
  return <span className={`pill ${a?.pill ?? 'p-mut'}`}>{a?.label ?? status}</span>;
}

/** Today's date in Nigeria (UTC+1), as YYYY-MM-DD. */
export const todayNG = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);

/** The school day (Monday to Friday) before or after a date. */
export function shiftSchoolDay(iso: string, dir: 1 | -1) {
  let d = new Date(iso + 'T00:00:00Z');
  do d = new Date(d.getTime() + dir * 86_400_000);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

/** The most recent school day on or before today. */
export function latestSchoolDay() {
  const t = todayNG();
  const day = new Date(t + 'T00:00:00Z').getUTCDay();
  return day === 0 || day === 6 ? shiftSchoolDay(t, -1) : t;
}

export function formatWeekday(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export const pct = (n: number | null) => (n === null ? '–' : `${n}%`);

const SHEET_PILL: Record<string, [string, string]> = {
  DRAFT: ['p-mut', 'Draft'],
  SUBMITTED: ['p-warn', 'Awaiting approval'],
  APPROVED: ['p-good', 'Approved'],
  RETURNED: ['p-bad', 'Returned'],
};

export function SheetPill({ status }: { status: string | null | undefined }) {
  const [c, l] = status ? SHEET_PILL[status] ?? ['p-mut', status] : ['p-mut', 'Not started'];
  return <span className={`pill ${c}`}>{l}</span>;
}

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};
