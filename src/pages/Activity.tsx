import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDate } from '../components/ui';
import type { AuditEntry } from '../types';

const LABEL: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.account_locked': 'Account locked after failed sign-ins',
  'auth.password_changed': 'Changed password',
  'auth.refresh_reuse_detected': 'Suspicious session reuse: signed out everywhere',
  'user.created': 'Created account',
  'user.updated': 'Updated account',
  'user.deactivated': 'Deactivated account',
  'user.reactivated': 'Reactivated account',
  'user.password_reset': 'Reset password',
  'school.created': 'Registered school',
  'school.updated': 'Updated school',
  'school.deactivated': 'Deactivated school',
  'school.reactivated': 'Reactivated school',
};

const SEVERE = new Set(['auth.account_locked', 'auth.refresh_reuse_detected']);

export function Activity() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AuditEntry[]>('/audit?take=200').then(setRows).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="head">
        <div>
          <h1>Activity</h1>
          <p>
            Sign-ins and account changes{user?.role === 'SCHOOL_ADMIN' ? ' at your school' : ' across the system'}. The latest 200 events are shown.
          </p>
        </div>
      </div>
      <ErrorAlert error={error} />
      <div className="card tbl">
        <table>
          <thead>
            <tr><th>When</th><th>Who</th><th>What</th><th>Account</th><th>IP address</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="small" style={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                <td>{r.actorName ?? <span className="muted">Unknown</span>}</td>
                <td>
                  {SEVERE.has(r.action) ? <span className="pill p-bad">{LABEL[r.action]}</span> : LABEL[r.action] ?? r.action}
                  {r.action === 'school.created' && r.meta?.code ? <span className="mono small"> {String(r.meta.code)}</span> : null}
                </td>
                <td>{r.targetName ?? ''}</td>
                <td className="mono small">{r.ip ?? ''}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="muted">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
