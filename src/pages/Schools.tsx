import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { CredentialsPanel, ErrorAlert, Field } from '../components/ui';
import { LEVEL_LABEL } from '../roles';
import type { NewCredentials, Ownership, School, SchoolLevel } from '../types';

interface Created {
  school: School;
  admin: NewCredentials | null;
}

function NewSchoolForm({ lgas, onCreated, onCancel }: { lgas: string[]; onCreated: (c: Created) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [lga, setLga] = useState('');
  const [level, setLevel] = useState<SchoolLevel>('JUNIOR_AND_SENIOR');
  const [ownership, setOwnership] = useState<Ownership>('PUBLIC');
  const [address, setAddress] = useState('');
  const [withAdmin, setWithAdmin] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 3) return setError('Enter the school name.');
    if (!lga) return setError('Choose the LGA.');
    if (withAdmin && adminName.trim().length < 3) return setError("Enter the school administrator's full name.");
    if (withAdmin && !adminEmail.trim() && !adminPhone.trim()) return setError("Give the administrator's email or phone number.");
    setBusy(true);
    try {
      const res = await api<Created>('/schools', {
        method: 'POST',
        json: {
          name, lga, level, ownership, address: address || undefined,
          admin: withAdmin ? { fullName: adminName, email: adminEmail || undefined, phone: adminPhone || undefined } : undefined,
        },
      });
      onCreated(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not register the school.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="School name" full>
        <input id="schoolName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Osogbo Model Secondary School" />
      </Field>
      <Field label="LGA">
        <select id="lga" value={lga} onChange={(e) => setLga(e.target.value)}>
          <option value="">Choose LGA</option>
          {lgas.map((l) => <option key={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Level">
        <select id="level" value={level} onChange={(e) => setLevel(e.target.value as SchoolLevel)}>
          {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Ownership">
        <select id="ownership" value={ownership} onChange={(e) => setOwnership(e.target.value as Ownership)}>
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
      </Field>
      <Field label="Address (optional)">
        <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <label className="row full small" style={{ gap: 6 }}>
        <input type="checkbox" checked={withAdmin} onChange={(e) => setWithAdmin(e.target.checked)} /> Create the school administrator's account now
      </label>
      {withAdmin && (
        <>
          <Field label="Administrator's full name" full>
            <input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Usually the principal or head teacher" />
          </Field>
          <Field label="Administrator's email">
            <input id="adminEmail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </Field>
          <Field label="Administrator's phone">
            <input id="adminPhone" inputMode="tel" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
          </Field>
        </>
      )}
      <div className="full"><ErrorAlert error={error} /></div>
      <div className="full row">
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Registering…' : 'Register school'}</button>
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export function Schools() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [schools, setSchools] = useState<School[]>([]);
  const [lgas, setLgas] = useState<string[]>([]);
  const [lga, setLga] = useState('');
  const [q, setQ] = useState('');
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creating = params.get('new') === '1' && user?.role === 'MINISTRY_ADMIN';

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (lga) qs.set('lga', lga);
    if (q.trim()) qs.set('q', q.trim());
    api<School[]>(`/schools?${qs}`).then(setSchools).catch((e) => setError(e.message));
  }, [lga, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    api<string[]>('/schools/lgas').then(setLgas).catch(() => {});
  }, []);

  return (
    <>
      <div className="head">
        <div>
          <h1>Schools</h1>
          <p>Registered schools and their Osun school numbers. Each school's administrator manages its teacher and parent accounts.</p>
        </div>
        {user?.role === 'MINISTRY_ADMIN' && !creating && (
          <button className="btn pri" onClick={() => { setCreated(null); setParams({ new: '1' }); }}>Register a school</button>
        )}
      </div>

      {created && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="alert ok" style={{ marginBottom: 12 }}>
            Registered <b>{created.school.name}</b> as <span className="mono">{created.school.code}</span>.
          </div>
          {created.admin ? (
            <CredentialsPanel creds={created.admin} onDone={() => setCreated(null)} />
          ) : (
            <button className="btn" onClick={() => setCreated(null)}>Done</button>
          )}
        </div>
      )}

      {creating && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>Register a school</h2>
          <NewSchoolForm lgas={lgas} onCreated={(c) => { setCreated(c); setParams({}); load(); }} onCancel={() => setParams({})} />
        </div>
      )}

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="field" style={{ flex: '1 1 220px' }}>
            Search
            <input id="schoolSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or school number" />
          </label>
          <label className="field">
            LGA
            <select id="lgaFilter" value={lga} onChange={(e) => setLga(e.target.value)}>
              <option value="">All LGAs</option>
              {lgas.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <ErrorAlert error={error} />
        <div className="tbl">
          <table>
            <thead>
              <tr><th>School no.</th><th>Name</th><th>LGA</th><th>Level</th><th>Owner</th><th>Accounts</th><th>Status</th></tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td className="mono small">{s.code}</td>
                  <td><Link to={`/schools/${s.id}`}>{s.name}</Link></td>
                  <td>{s.lga}</td>
                  <td>{LEVEL_LABEL[s.level]}</td>
                  <td>{s.ownership === 'PUBLIC' ? 'Public' : 'Private'}</td>
                  <td className="mono">{s.accounts ?? 0}</td>
                  <td>{s.isActive ? <span className="pill p-good">Active</span> : <span className="pill p-mut">Deactivated</span>}</td>
                </tr>
              ))}
              {!schools.length && <tr><td colSpan={7} className="muted">No schools yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
