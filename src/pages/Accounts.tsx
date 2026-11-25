import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { CredentialsPanel, ErrorAlert, Field, formatDate, formatPhone, StatusPill } from '../components/ui';
import { CAN_CREATE, isMinistry, LGA_ROLES, ROLE_LABEL } from '../roles';
import type { NewCredentials, Role, School, User } from '../types';

const SCHOOL_LEVEL_ROLES: Role[] = ['SCHOOL_ADMIN', 'TEACHER', 'PARENT'];

/** Form for creating an account. `fixedSchoolId` locks it to one school (school pages). */
export function NewAccountForm(props: {
  roles: Role[];
  schools?: School[];
  fixedSchoolId?: string;
  onCreated: (c: NewCredentials) => void;
  onCancel: () => void;
}) {
  const [role, setRole] = useState<Role>(props.roles[0]);
  const [schoolId, setSchoolId] = useState(props.fixedSchoolId ?? '');
  const [lga, setLga] = useState('');
  const [lgas, setLgas] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsSchool = SCHOOL_LEVEL_ROLES.includes(role) && !props.fixedSchoolId && !!props.schools;
  const hasLga = LGA_ROLES.includes(role);
  useEffect(() => {
    if (props.roles.some((r) => LGA_ROLES.includes(r))) api<string[]>('/schools/lgas').then(setLgas).catch(() => {});
  }, [props.roles]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 3) return setError('Enter the full name.');
    if (!email.trim() && !phone.trim()) return setError('Give an email address or a phone number so they can sign in.');
    if (needsSchool && !schoolId) return setError('Choose the school.');
    if (role === 'LGA_OFFICER' && !lga) return setError('Choose the LGA this officer oversees.');
    setBusy(true);
    try {
      const res = await api<NewCredentials>('/users', {
        method: 'POST',
        json: {
          role,
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          schoolId: SCHOOL_LEVEL_ROLES.includes(role) ? schoolId || undefined : undefined,
          lga: hasLga ? lga || undefined : undefined,
        },
      });
      props.onCreated(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Account type">
        <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {props.roles.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
      </Field>
      {needsSchool ? (
        <Field label="School">
          <select id="school" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">Choose a school</option>
            {props.schools!.filter((s) => s.isActive).map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.code}</option>
            ))}
          </select>
        </Field>
      ) : hasLga ? (
        <Field label="LGA" hint={role === 'INSPECTOR' ? 'Leave as state-wide for an inspector who covers every LGA' : 'They see only the schools in this LGA'}>
          <select id="lga" value={lga} onChange={(e) => setLga(e.target.value)}>
            <option value="">{role === 'INSPECTOR' ? 'State-wide (all LGAs)' : 'Choose LGA'}</option>
            {lgas.map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
      ) : (
        <span />
      )}
      <Field label="Full name" full>
        <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Email address" hint="Optional if a phone number is given">
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Phone number" hint="Nigerian number, e.g. 0803 123 4567">
        <input id="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
      </Field>
      <div className="full">
        <ErrorAlert error={error} />
      </div>
      <div className="full row">
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <button className="btn" type="button" onClick={props.onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** Table of accounts with reset and deactivate actions where the signed-in user is allowed. */
export function AccountsTable({ users, onChanged, showSchool }: { users: User[]; onChanged: () => void; showSchool: boolean }) {
  const { user: me } = useAuth();
  const [creds, setCreds] = useState<NewCredentials | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: 'reset' | 'deactivate' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;
  const canManage = (u: User) => CAN_CREATE[me.role].includes(u.role) && u.id !== me.id;

  async function act(u: User, action: 'reset' | 'deactivate' | 'reactivate') {
    setError(null);
    try {
      if (action === 'reset') setCreds(await api<NewCredentials>(`/users/${u.id}/reset-password`, { method: 'POST' }));
      else await api(`/users/${u.id}`, { method: 'PATCH', json: { isActive: action === 'reactivate' } });
      setConfirm(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    }
  }

  return (
    <>
      {creds && <div className="mt" style={{ marginBottom: 14 }}><CredentialsPanel creds={creds} reset onDone={() => setCreds(null)} /></div>}
      <ErrorAlert error={error} />
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              {showSchool && <th>School or area</th>}
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Last sign-in</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}{u.id === me.id && <span className="muted small"> (you)</span>}</td>
                <td>{ROLE_LABEL[u.role]}</td>
                {showSchool && <td>{u.school?.name ?? (u.lga ? `${u.lga} LGA` : u.role === 'INSPECTOR' ? <span className="muted">State-wide</span> : <span className="muted">Ministry</span>)}</td>}
                <td className="mono small">{u.email ?? '–'}</td>
                <td className="mono small" style={{ whiteSpace: 'nowrap' }}>{formatPhone(u.phone) || '–'}</td>
                <td><StatusPill user={u} /></td>
                <td className="small">{formatDate(u.lastLoginAt)}</td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {canManage(u) &&
                    (confirm?.id === u.id ? (
                      <span className="row actions">
                        <span className="small">{confirm.action === 'reset' ? 'Issue a new temporary password?' : 'Deactivate this account?'}</span>
                        <button className={`btn sm ${confirm.action === 'deactivate' ? 'danger' : 'pri'}`} onClick={() => act(u, confirm.action)}>Yes</button>
                        <button className="btn sm" onClick={() => setConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <span className="row actions">
                        <button className="btn sm" onClick={() => setConfirm({ id: u.id, action: 'reset' })}>Reset password</button>
                        {u.isActive ? (
                          <button className="btn sm danger" onClick={() => setConfirm({ id: u.id, action: 'deactivate' })}>Deactivate</button>
                        ) : (
                          <button className="btn sm" onClick={() => act(u, 'reactivate')}>Reactivate</button>
                        )}
                      </span>
                    ))}
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={8} className="muted">No accounts match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Accounts() {
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [role, setRole] = useState<Role | ''>('');
  const [q, setQ] = useState('');
  const [creds, setCreds] = useState<NewCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creating = params.get('new') === '1';
  const ministry = !!me && isMinistry(me.role);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (role) qs.set('role', role);
    if (q.trim()) qs.set('q', q.trim());
    api<User[]>(`/users?${qs}`).then(setUsers).catch((e) => setError(e.message));
  }, [role, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (ministry) api<School[]>('/schools').then(setSchools).catch(() => {});
  }, [ministry]);

  if (!me) return null;
  const creatable = CAN_CREATE[me.role];
  const roleFilters: Role[] = ministry ? ['MINISTRY_ADMIN', 'MINISTRY_OFFICER', 'LGA_OFFICER', 'INSPECTOR', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'] : ['SCHOOL_ADMIN', 'TEACHER', 'PARENT'];

  return (
    <>
      <div className="head">
        <div>
          <h1>Accounts</h1>
          <p>
            {ministry
              ? 'Every account in the system. Ministry administrators create Ministry, LGA, inspector and school accounts.'
              : `Accounts for ${me.school?.name}. You can add teachers and parents and reset their passwords.`}
          </p>
        </div>
        {creatable.length > 0 && !creating && (
          <button className="btn pri" onClick={() => { setCreds(null); setParams({ new: '1' }); }}>Add an account</button>
        )}
      </div>

      {creds && <div style={{ marginBottom: 14 }}><CredentialsPanel creds={creds} onDone={() => setCreds(null)} /></div>}

      {creating && creatable.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>New account</h2>
          <p className="muted small" style={{ marginBottom: 12 }}>
            A temporary password is generated. Give it to the person; they choose their own at first sign-in.
          </p>
          <NewAccountForm
            roles={creatable}
            schools={ministry ? schools : undefined}
            onCreated={(c) => { setCreds(c); setParams({}); load(); }}
            onCancel={() => setParams({})}
          />
        </div>
      )}

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="field" style={{ flex: '1 1 220px' }}>
            Search
            <input id="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" />
          </label>
          <label className="field">
            Account type
            <select id="roleFilter" value={role} onChange={(e) => setRole(e.target.value as Role | '')}>
              <option value="">All types</option>
              {roleFilters.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
        </div>
        <ErrorAlert error={error} />
        <AccountsTable users={users} onChanged={load} showSchool={ministry} />
        <p className="small muted mt">{users.length} account{users.length === 1 ? '' : 's'}</p>
      </div>
    </>
  );
}
