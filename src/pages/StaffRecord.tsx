import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, Field, formatDay, formatPhone, todayNG, TransferPill } from '../components/ui';
import { canEditStaff, CATEGORY_LABEL, ROLE_LABEL, STAFF_STATUS_LABEL } from '../roles';
import type { School, StaffRecord as Rec, StaffStatus, User } from '../types';
import { StaffForm } from './Staff';

type Subject = { code: string; name: string };

/** A small inline form that opens from a button. */
function Adder({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn sm" onClick={() => setOpen(true)}>{label}</button>;
  return <div className="card" style={{ marginTop: 10, background: 'var(--bg)' }}>{children(() => setOpen(false))}</div>;
}

export function StaffRecord() {
  const { id } = useParams();
  const { user } = useAuth();
  const [s, setS] = useState<Rec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string; lga: string }[]>([]);
  const [accounts, setAccounts] = useState<User[]>([]);

  const load = useCallback(() => {
    api<Rec>(`/staff/${id}`).then(setS).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    api<Subject[]>('/subjects').then(setSubjects).catch(() => {});
    api<string[]>('/staff/qualification-types').then(setKinds).catch(() => {});
  }, []);
  const edit = !!user && canEditStaff(user.role) && !!s && (user.role === 'MINISTRY_ADMIN' || s.school?.id === user.schoolId);
  useEffect(() => {
    if (!edit) return;
    api<{ id: string; name: string; lga: string }[]>(user!.role === 'MINISTRY_ADMIN' ? '/schools' : '/schools/directory').then(setSchools).catch(() => {});
    if (s?.school) api<User[]>(`/users?schoolId=${s.school.id}`).then((u) => setAccounts(u.filter((x) => x.isActive && (x.role === 'TEACHER' || x.role === 'SCHOOL_ADMIN')))).catch(() => {});
  }, [edit, user, s?.school]);

  async function run(fn: () => Promise<Rec | unknown>, done?: string) {
    setError(null);
    setNote(null);
    try {
      const r = await fn();
      if (r && typeof r === 'object' && 'staffNumber' in (r as object)) setS(r as Rec);
      else load();
      if (done) setNote(done);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.');
      throw err;
    }
  }
  const quiet = (p: Promise<unknown>) => p.catch(() => {});

  if (!s) return <ErrorAlert error={error} />;
  const subjectName = (c: string) => subjects.find((x) => x.code === c)?.name ?? c;
  const pending = s.requests.find((r) => r.status === 'REQUESTED');
  const current = s.status === 'ACTIVE' || s.status === 'ON_LEAVE';

  return (
    <>
      <p className="small"><Link to="/staff">← Staff</Link></p>
      <div className="head">
        <div>
          <h1>{s.fullName}</h1>
          <p>
            <span className="mono">{s.staffNumber}</span> · {CATEGORY_LABEL[s.category]}{s.rank ? ` · ${s.rank}` : ''}{s.gradeLevel ? ` · GL ${s.gradeLevel}${s.step ? `/${s.step}` : ''}` : ''}
            {' · '}<span className={`pill ${s.status === 'ACTIVE' ? 'p-good' : 'p-mut'}`}>{STAFF_STATUS_LABEL[s.status]}</span>
          </p>
        </div>
        {edit && !editing && <button className="btn" onClick={() => setEditing(true)}>Edit details</button>}
      </div>
      <ErrorAlert error={error} />
      {note && <div className="alert ok" style={{ marginBottom: 12 }}>{note}</div>}

      {editing ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>Edit details</h2>
          <StaffForm initial={s} submitLabel="Save changes" onCancel={() => setEditing(false)} onSubmit={async (body) => { await run(() => api<Rec>(`/staff/${s.id}`, { method: 'PATCH', json: body }), 'Saved.'); setEditing(false); }} />
        </div>
      ) : (
        <div className="grid g2" style={{ marginBottom: 14 }}>
          <div className="card">
            <h2>Details</h2>
            <dl className="kv">
              <dt>School</dt><dd>{s.school ? <>{s.school.name} <span className="muted small">· {s.school.lga}</span></> : <span className="muted">None</span>}</dd>
              <dt>Sex</dt><dd>{s.sex === 'F' ? 'Female' : 'Male'}</dd>
              <dt>Date of birth</dt><dd>{s.dateOfBirth ? `${formatDay(s.dateOfBirth)} (${s.age})` : '–'}</dd>
              <dt>First appointment</dt><dd>{s.firstAppointment ? `${formatDay(s.firstAppointment)} · ${s.yearsOfService} years of service` : '–'}</dd>
              <dt>TRCN number</dt><dd className="mono">{s.trcnNumber ?? '–'}</dd>
              <dt>Phone</dt><dd className="mono">{formatPhone(s.phone) || '–'}</dd>
              <dt>Email</dt><dd className="mono">{s.email ?? '–'}</dd>
              {s.category === 'TEACHING' && <><dt>Subjects</dt><dd>{s.subjects.length ? s.subjects.map(subjectName).join(', ') : '–'}</dd></>}
            </dl>
          </div>
          <div className="card">
            <h2>Sign-in account</h2>
            {s.account ? (
              <p>{s.account.fullName} <span className="muted small">· {ROLE_LABEL[s.account.role]}</span></p>
            ) : (
              <p className="muted small">Not linked. Linking lets a posting move their account to the new school.</p>
            )}
            {edit && s.school && (
              <div className="row mt">
                <select className="inline" aria-label="Account to link" value={s.account?.id ?? ''} onChange={(e) => quiet(run(() => api<Rec>(`/staff/${s.id}/account`, { method: 'PATCH', json: { userId: e.target.value || null } }), e.target.value ? 'Account linked.' : 'Account unlinked.'))}>
                  <option value="">Not linked</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.fullName} · {ROLE_LABEL[a.role]}</option>)}
                </select>
              </div>
            )}
            {edit && current && (
              <>
                <h2 className="mt">Status</h2>
                <div className="row">
                  <select className="inline" aria-label="Status" value={s.status} onChange={(e) => {
                    const v = e.target.value as StaffStatus;
                    if ((v === 'LEFT' || v === 'RETIRED') && !window.confirm(`Mark ${s.fullName} as ${STAFF_STATUS_LABEL[v].toLowerCase()}? Their posting at ${s.school?.name} ends today.`)) return;
                    quiet(run(() => api<Rec>(`/staff/${s.id}`, { method: 'PATCH', json: { status: v } }), 'Status updated.'));
                  }}>
                    {(Object.keys(STAFF_STATUS_LABEL) as StaffStatus[]).map((k) => <option key={k} value={k}>{STAFF_STATUS_LABEL[k]}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="row between"><h2>Qualifications</h2>
            {edit && (
              <Adder label="Add a qualification">{(close) => <QualificationForm kinds={kinds} onSubmit={async (b) => { await run(() => api(`/staff/${s.id}/qualifications`, { method: 'POST', json: b })); close(); }} onCancel={close} />}</Adder>
            )}
          </div>
          <ul className="plain">
            {s.qualifications.map((q) => (
              <li key={q.id} className="row between">
                <span><b>{q.kind}</b>{q.course ? `, ${q.course}` : ''}<span className="small muted">{q.institution ? ` · ${q.institution}` : ''}{q.year ? ` · ${q.year}` : ''}</span></span>
                {edit && <button className="linklike small" onClick={() => quiet(run(() => api(`/staff/${s.id}/qualifications/${q.id}`, { method: 'DELETE' })))}>Remove</button>}
              </li>
            ))}
            {!s.qualifications.length && <li className="muted small">None recorded.</li>}
          </ul>
        </div>
        <div className="card">
          <div className="row between"><h2>Training</h2>
            {edit && (
              <Adder label="Record training">{(close) => <TrainingForm onSubmit={async (b) => { await run(() => api(`/staff/${s.id}/trainings`, { method: 'POST', json: b })); close(); }} onCancel={close} />}</Adder>
            )}
          </div>
          <ul className="plain">
            {s.trainings.map((t) => (
              <li key={t.id} className="row between">
                <span><b>{t.title}</b><span className="small muted">{t.provider ? ` · ${t.provider}` : ''} · {formatDay(t.startDate)}{t.endDate && t.endDate !== t.startDate ? ` to ${formatDay(t.endDate)}` : ''}{t.hours ? ` · ${t.hours} hours` : ''}</span></span>
                {edit && <button className="linklike small" onClick={() => quiet(run(() => api(`/staff/${s.id}/trainings/${t.id}`, { method: 'DELETE' })))}>Remove</button>}
              </li>
            ))}
            {!s.trainings.length && <li className="muted small">None recorded.</li>}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h2>Postings</h2>
          {edit && current && !pending && user!.role === 'SCHOOL_ADMIN' && (
            <Adder label="Request a transfer">{(close) => <MoveForm schools={schools.filter((x) => x.id !== s.school?.id)} needsReason onCancel={close} onSubmit={async (b) => { await run(() => api('/staff-transfers', { method: 'POST', json: { staffId: s.id, toSchoolId: b.schoolId, reason: b.reason, effectiveDate: b.date } }), 'Transfer requested. The Ministry will decide.'); close(); }} />}</Adder>
          )}
          {edit && current && user!.role === 'MINISTRY_ADMIN' && (
            <Adder label="Post to another school">{(close) => <MoveForm schools={schools.filter((x) => x.id !== s.school?.id)} onCancel={close} onSubmit={async (b) => { await run(() => api<Rec>(`/staff/${s.id}/postings`, { method: 'POST', json: { schoolId: b.schoolId, reason: b.reason || undefined, startDate: b.date } }), 'Posted.'); close(); }} />}</Adder>
          )}
        </div>
        {pending && (
          <div className="alert info" style={{ margin: '10px 0' }}>
            Transfer to <b>{pending.to?.name}</b> requested, waiting for the Ministry. <span className="small">({pending.reason})</span>
            {user!.role === 'SCHOOL_ADMIN' && pending.from?.id === user!.schoolId && <> · <button className="linklike" onClick={() => quiet(run(() => api(`/staff-transfers/${pending.id}/cancel`, { method: 'POST' }), 'Request cancelled.'))}>Cancel request</button></>}
          </div>
        )}
        <div className="tbl">
          <table>
            <thead><tr><th>School</th><th>From</th><th>To</th><th>Reason</th></tr></thead>
            <tbody>
              {s.postings.map((p) => (
                <tr key={p.id}><td><b>{p.school.name}</b> <span className="small muted">· {p.school.lga}</span></td><td>{formatDay(p.startDate)}</td><td>{p.endDate ? formatDay(p.endDate) : <span className="pill p-good">Current</span>}</td><td className="small">{p.reason ?? ''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {s.requests.filter((r) => r.status !== 'REQUESTED').length > 0 && (
          <>
            <h3 className="mt">Earlier transfer requests</h3>
            <ul className="plain small">
              {s.requests.filter((r) => r.status !== 'REQUESTED').map((r) => <li key={r.id}><TransferPill status={r.status} /> To {r.to?.name} · {r.reason}{r.note ? ` · Ministry: ${r.note}` : ''}</li>)}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

function QualificationForm({ kinds, onSubmit, onCancel }: { kinds: string[]; onSubmit: (b: object) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({ kind: '', course: '', institution: '', year: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.kind) return;
    setBusy(true);
    try { await onSubmit({ kind: f.kind, course: f.course || undefined, institution: f.institution || undefined, year: f.year ? Number(f.year) : undefined }); } catch { /* shown above */ } finally { setBusy(false); }
  };
  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Qualification"><select id="qualKind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="">Choose</option>{kinds.map((k) => <option key={k}>{k}</option>)}</select></Field>
      <Field label="Year"><input id="qualYear" inputMode="numeric" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></Field>
      <Field label="Course"><input id="qualCourse" value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} /></Field>
      <Field label="Institution"><input id="qualInst" value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></Field>
      <div className="full row"><button className="btn pri" disabled={busy || !f.kind}>Add</button><button type="button" className="btn" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function TrainingForm({ onSubmit, onCancel }: { onSubmit: (b: object) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({ title: '', provider: '', startDate: '', endDate: '', hours: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 3 || !f.startDate) return;
    setBusy(true);
    try { await onSubmit({ title: f.title, provider: f.provider || undefined, startDate: f.startDate, endDate: f.endDate || undefined, hours: f.hours ? Number(f.hours) : undefined }); } catch { /* shown above */ } finally { setBusy(false); }
  };
  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Training" full><input id="trainTitle" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Teaching phonics" /></Field>
      <Field label="Run by"><input id="trainProvider" value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} placeholder="e.g. SUBEB, Ministry, TRCN" /></Field>
      <Field label="Hours"><input id="trainHours" inputMode="numeric" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value.replace(/\D/g, '') })} /></Field>
      <Field label="Started"><input id="trainStart" type="date" max={todayNG()} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
      <Field label="Ended"><input id="trainEnd" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
      <div className="full row"><button className="btn pri" disabled={busy}>Record</button><button type="button" className="btn" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function MoveForm({ schools, needsReason, onSubmit, onCancel }: { schools: Pick<School, 'id' | 'name' | 'lga'>[]; needsReason?: boolean; onSubmit: (b: { schoolId: string; reason: string; date?: string }) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({ schoolId: '', reason: '', date: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.schoolId || (needsReason && f.reason.trim().length < 3)) return;
    setBusy(true);
    try { await onSubmit({ schoolId: f.schoolId, reason: f.reason, date: f.date || undefined }); } catch { /* shown above */ } finally { setBusy(false); }
  };
  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="New school" full><select id="moveSchool" value={f.schoolId} onChange={(e) => setF({ ...f, schoolId: e.target.value })}><option value="">Choose a school</option>{schools.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.lga}</option>)}</select></Field>
      <Field label={needsReason ? 'Reason' : 'Reason (optional)'} full><input id="moveReason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      <Field label={needsReason ? 'From' : 'Starts'} hint="Leave empty for today"><input id="moveDate" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <div className="full row"><button className="btn pri" disabled={busy}>{needsReason ? 'Send request' : 'Post'}</button><button type="button" className="btn" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}
