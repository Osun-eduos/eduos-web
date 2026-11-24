import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { CredentialsPanel, ErrorAlert, Field, formatDay, formatPhone, TransferPill } from '../components/ui';
import { ageFrom, SEX_LABEL } from '../roles';
import type { ClassArm, NewCredentials, SchoolRef, StudentRecord as Rec } from '../types';
import { AttendanceCard } from '../components/AttendanceCard';
import { ReportCardsCard } from '../components/ReportCardsCard';
import { GuardianFields, guardianPayload, guardianProblem } from './EnrolStudent';

function EditDetails({ s, onSaved, onCancel }: { s: Rec; onSaved: (r: Rec) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    surname: s.surname, firstName: s.firstName, middleName: s.middleName ?? '', sex: s.sex, dateOfBirth: s.dateOfBirth,
    stateOfOrigin: s.stateOfOrigin ?? '', lgaOfOrigin: s.lgaOfOrigin ?? '', homeAddress: s.homeAddress ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      onSaved(await api<Rec>(`/students/${s.id}`, { method: 'PATCH', json: f }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    }
  }
  return (
    <form className="form" onSubmit={save} noValidate>
      <Field label="Surname"><input id="eSurname" value={f.surname} onChange={(e) => set('surname', e.target.value)} /></Field>
      <Field label="First name"><input id="eFirstName" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
      <Field label="Middle name"><input value={f.middleName} onChange={(e) => set('middleName', e.target.value)} /></Field>
      <Field label="Sex">
        <select value={f.sex} onChange={(e) => set('sex', e.target.value)}><option value="F">Female</option><option value="M">Male</option></select>
      </Field>
      <Field label="Date of birth"><input type="date" value={f.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
      <Field label="State of origin"><input value={f.stateOfOrigin} onChange={(e) => set('stateOfOrigin', e.target.value)} /></Field>
      <Field label="LGA of origin"><input value={f.lgaOfOrigin} onChange={(e) => set('lgaOfOrigin', e.target.value)} /></Field>
      <Field label="Home address"><input value={f.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} /></Field>
      <div className="full"><ErrorAlert error={error} /></div>
      <div className="full row"><button className="btn pri" type="submit">Save</button><button className="btn" type="button" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export function StudentRecord() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'SCHOOL_ADMIN';
  const [s, setS] = useState<Rec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassArm[]>([]);
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [panel, setPanel] = useState<'edit' | 'guardian' | 'transfer' | 'withdraw' | null>(null);
  const [creds, setCreds] = useState<NewCredentials | null>(null);
  const [gMode, setGMode] = useState<'none' | 'existing' | 'new'>('new');
  const [g, setG] = useState({ relationship: 'Father', parentId: '', fullName: '', phone: '', email: '' });
  const [toSchool, setToSchool] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Rec>(`/students/${id}`).then(setS).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!isAdmin) return;
    api<ClassArm[]>('/classes').then(setClasses).catch(() => {});
    api<SchoolRef[]>('/schools/directory').then(setSchools).catch(() => {});
  }, [isAdmin]);

  const mine = isAdmin && s?.school?.id === user?.schoolId && s?.status === 'ACTIVE';

  async function run<T>(fn: () => Promise<T>, after?: (r: T) => void) {
    setError(null);
    setMsg(null);
    try {
      const r = await fn();
      after?.(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }

  if (!s) return <ErrorAlert error={error} />;
  const pending = s.transfers.find((t) => t.status === 'REQUESTED');

  return (
    <>
      <p className="small"><Link to={user?.role === 'TEACHER' || user?.role === 'PARENT' ? '/' : '/students'}>← Back</Link></p>
      <div className="head">
        <div>
          <h1>{s.fullName}</h1>
          <p>
            <span className="mono">{s.learnerId}</span>
            {s.school && <> · {s.school.name}</>}
            {s.admissionNumber && <> · Adm. no. <span className="mono">{s.admissionNumber}</span></>}
            {' · '}{s.currentClass ? s.currentClass.name : <span className="pill p-warn">No class</span>}
            {s.status !== 'ACTIVE' && <> · <span className="pill p-mut">{s.status === 'WITHDRAWN' ? 'Withdrawn' : 'Graduated'}</span></>}
          </p>
        </div>
        {mine && (
          <div className="row">
            <button className="btn" onClick={() => setPanel(panel === 'transfer' ? null : 'transfer')} disabled={!!pending}>Transfer to another school</button>
            <button className="btn danger" onClick={() => setPanel(panel === 'withdraw' ? null : 'withdraw')}>Withdraw</button>
          </div>
        )}
      </div>
      <ErrorAlert error={error} />
      {msg && <div className="alert ok" style={{ marginBottom: 14 }}>{msg}</div>}
      {pending && <div className="alert info" style={{ marginBottom: 14 }}>Transfer to <b>{pending.to}</b> is waiting for that school to accept.</div>}

      {panel === 'transfer' && mine && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>Transfer to another school</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>The receiving school must accept. The student's record, learner ID and history go with them; they get a new admission number there.</p>
          <form className="form" onSubmit={(e) => { e.preventDefault(); if (!toSchool) return setError('Choose the receiving school.'); if (reason.trim().length < 3) return setError('Give a reason.'); run(() => api('/transfers', { method: 'POST', json: { studentId: s.id, toSchoolId: toSchool, reason } }), () => { setPanel(null); setReason(''); setMsg('Transfer request sent.'); load(); }); }} noValidate>
            <Field label="Receiving school">
              <select id="toSchool" value={toSchool} onChange={(e) => setToSchool(e.target.value)}>
                <option value="">Choose a school</option>
                {schools.filter((x) => x.id !== user?.schoolId).map((x) => <option key={x.id} value={x.id}>{x.name} · {x.lga}</option>)}
              </select>
            </Field>
            <Field label="Reason"><input id="transferReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family relocated to Iwo" /></Field>
            <div className="full row"><button className="btn pri" type="submit">Send transfer request</button><button className="btn" type="button" onClick={() => setPanel(null)}>Cancel</button></div>
          </form>
        </div>
      )}

      {panel === 'withdraw' && mine && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>Withdraw {s.firstName}</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>Use this when the student leaves and is not moving to another Osun school. The record is kept.</p>
          <form className="form" onSubmit={(e) => { e.preventDefault(); if (reason.trim().length < 3) return setError('Give a reason.'); run(() => api(`/students/${s.id}/withdraw`, { method: 'POST', json: { reason } }), () => navigate('/students')); }} noValidate>
            <Field label="Reason" full><input id="withdrawReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Moved out of Osun State" /></Field>
            <div className="full row"><button className="btn danger" type="submit">Withdraw student</button><button className="btn" type="button" onClick={() => setPanel(null)}>Cancel</button></div>
          </form>
        </div>
      )}

      <div className="grid g2">
        <div className="card">
          <div className="row between"><h2>Details</h2>{mine && panel !== 'edit' && <button className="btn sm" onClick={() => setPanel('edit')}>Edit</button>}</div>
          {panel === 'edit' && mine ? (
            <EditDetails s={s} onSaved={(r) => { setS(r); setPanel(null); }} onCancel={() => setPanel(null)} />
          ) : (
            <dl className="kv mt">
              <dt>Sex</dt><dd>{SEX_LABEL[s.sex]}</dd>
              <dt>Date of birth</dt><dd>{formatDay(s.dateOfBirth)} ({ageFrom(s.dateOfBirth)} years)</dd>
              <dt>State / LGA of origin</dt><dd>{[s.stateOfOrigin, s.lgaOfOrigin].filter(Boolean).join(' · ') || '–'}</dd>
              {s.homeAddress !== undefined && <><dt>Home address</dt><dd>{s.homeAddress || '–'}</dd></>}
            </dl>
          )}
        </div>

        <div className="card">
          <h2>Class</h2>
          <p>{s.currentClass ? <>In <b>{s.currentClass.name}</b> this session.</> : 'Not in a class this session.'}</p>
          {mine && (
            <label className="field mt">
              {s.currentClass ? 'Move to' : 'Place in'}
              <select id="placeClass" value={s.currentClass?.id ?? ''} onChange={(e) => run(() => api<Rec>(`/students/${s.id}/placement`, { method: 'POST', json: { classArmId: e.target.value || null } }), (r) => { setS(r); setMsg(e.target.value ? `Moved to ${r.currentClass?.name}.` : 'Removed from class.'); })}>
                <option value="">No class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.students >= c.capacity && c.id !== s.currentClass?.id}>{c.name} · {c.students}/{c.capacity}</option>
                ))}
              </select>
            </label>
          )}
          {s.classHistory.length > 0 && (
            <>
              <h3 className="mt">Class history</h3>
              <table className="mt"><tbody>
                {s.classHistory.map((h, i) => <tr key={i}><td>{h.session}</td><td>{h.className}</td><td className="muted">{h.school}</td></tr>)}
              </tbody></table>
            </>
          )}
        </div>

        <div className="card">
          <div className="row between"><h2>Parents and guardians</h2>{mine && panel !== 'guardian' && <button className="btn sm" onClick={() => setPanel('guardian')}>Add</button>}</div>
          {creds && <div className="mt"><CredentialsPanel creds={creds} onDone={() => setCreds(null)} /></div>}
          <table className="mt"><tbody>
            {s.guardians.map((p) => (
              <tr key={p.id}>
                <td><b>{p.fullName}</b><br /><span className="small muted">{p.relationship}</span></td>
                <td className="mono small">{formatPhone(p.phone) || p.email}</td>
                <td style={{ textAlign: 'right' }}>{mine && <button className="btn sm" onClick={() => run(() => api<Rec>(`/students/${s.id}/guardians/${p.id}`, { method: 'DELETE' }), setS)}>Unlink</button>}</td>
              </tr>
            ))}
            {!s.guardians.length && <tr><td className="muted">No parent linked yet.</td></tr>}
          </tbody></table>
          {panel === 'guardian' && mine && (
            <form className="form mt" onSubmit={(e) => { e.preventDefault(); const p = guardianProblem(gMode, g); if (p) return setError(p); run(() => api<{ student: Rec; parent: NewCredentials | null }>(`/students/${s.id}/guardians`, { method: 'POST', json: guardianPayload(gMode, g) }), (r) => { setS(r.student); setCreds(r.parent); setPanel(null); }); }} noValidate>
              <GuardianFields mode={gMode} setMode={setGMode} value={g} set={(k, v) => setG((x) => ({ ...x, [k]: v }))} />
              <div className="full row"><button className="btn pri" type="submit">Link parent</button><button className="btn" type="button" onClick={() => setPanel(null)}>Cancel</button></div>
            </form>
          )}
        </div>

        <AttendanceCard studentId={s.id} />

        <ReportCardsCard studentId={s.id} />

        <div className="card">
          <h2>Schools attended</h2>
          <table><thead><tr><th>School</th><th>Adm. no.</th><th>From</th><th>To</th></tr></thead><tbody>
            {s.enrolments.map((e, i) => (
              <tr key={i}>
                <td>{e.school}{e.leftReason && <><br /><span className="small muted">{e.leftReason}</span></>}</td>
                <td className="mono small">{e.admissionNumber}</td>
                <td className="small">{formatDay(e.admittedOn)}</td>
                <td className="small">{e.leftOn ? formatDay(e.leftOn) : 'Now'}</td>
              </tr>
            ))}
          </tbody></table>
          {s.transfers.length > 0 && (
            <>
              <h3 className="mt">Transfers</h3>
              <table className="mt"><tbody>
                {s.transfers.map((t) => (
                  <tr key={t.id}><td className="small">{formatDay(t.requestedAt)}</td><td>{t.from} → {t.to}<br /><span className="small muted">{t.reason}{t.note ? ` · ${t.note}` : ''}</span></td><td><TransferPill status={t.status} /></td></tr>
                ))}
              </tbody></table>
            </>
          )}
        </div>
      </div>
    </>
  );
}
