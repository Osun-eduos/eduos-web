import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { CredentialsPanel, ErrorAlert, formatDate } from '../components/ui';
import { LEVEL_LABEL, ROLE_LABEL } from '../roles';
import type { NewCredentials, Role, School, User } from '../types';
import { AccountsTable, NewAccountForm } from './Accounts';

export function SchoolDetail() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState<NewCredentials | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const admin = me?.role === 'MINISTRY_ADMIN';

  const load = useCallback(() => {
    api<School>(`/schools/${id}`).then(setSchool).catch((e) => setError(e.message));
    api<User[]>(`/users?schoolId=${id}`).then(setUsers).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  async function setActive(isActive: boolean) {
    try {
      await api(`/schools/${id}`, { method: 'PATCH', json: { isActive } });
      setConfirmOff(false);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That did not work.');
    }
  }

  if (!school) return <ErrorAlert error={error} />;
  const roles: Role[] = ['SCHOOL_ADMIN', 'TEACHER', 'PARENT'];

  return (
    <>
      <p className="small"><Link to="/schools">← All schools</Link></p>
      <div className="head">
        <div>
          <h1>{school.name}</h1>
          <p>
            <span className="mono">{school.code}</span> · {school.lga} LGA · {LEVEL_LABEL[school.level]} · {school.ownership === 'PUBLIC' ? 'Public' : 'Private'}
            {!school.isActive && <> · <span className="pill p-mut">Deactivated</span></>}
          </p>
        </div>
        {admin && (
          <div className="row">
            {school.isActive && !adding && <button className="btn pri" onClick={() => { setCreds(null); setAdding(true); }}>Add an account</button>}
            {school.isActive ? (
              confirmOff ? (
                <>
                  <span className="small">Deactivating signs out everyone at this school.</span>
                  <button className="btn danger" onClick={() => setActive(false)}>Deactivate</button>
                  <button className="btn" onClick={() => setConfirmOff(false)}>Cancel</button>
                </>
              ) : (
                <button className="btn danger" onClick={() => setConfirmOff(true)}>Deactivate school</button>
              )
            ) : (
              <button className="btn" onClick={() => setActive(true)}>Reactivate school</button>
            )}
          </div>
        )}
      </div>
      <ErrorAlert error={error} />

      <div className="grid g4" style={{ marginBottom: 14 }}>
        {roles.map((r) => (
          <div className="card kpi" key={r}>
            <div className="k">{ROLE_LABEL[r]}s</div>
            <div className="v">{school.accountsByRole?.[r] ?? 0}</div>
          </div>
        ))}
        <div className="card kpi">
          <div className="k">Registered</div>
          <div className="v" style={{ fontSize: '1rem', marginTop: 10 }}>{formatDate(school.createdAt)}</div>
        </div>
      </div>

      {creds && <div style={{ marginBottom: 14 }}><CredentialsPanel creds={creds} onDone={() => setCreds(null)} /></div>}
      {adding && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>New account at {school.name}</h2>
          <NewAccountForm roles={roles} fixedSchoolId={school.id} onCreated={(c) => { setCreds(c); setAdding(false); load(); }} onCancel={() => setAdding(false)} />
        </div>
      )}

      <div className="card">
        <h2>Accounts</h2>
        <AccountsTable users={users} onChanged={load} showSchool={false} />
      </div>
    </>
  );
}
