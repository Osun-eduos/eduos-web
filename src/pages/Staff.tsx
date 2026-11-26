import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, Field, formatPhone, todayNG } from '../components/ui';
import { StaffInsights } from '../components/StaffInsights';
import { canEditStaff, CATEGORY_LABEL, isOversight, STAFF_STATUS_LABEL } from '../roles';
import type { School, StaffCategory, StaffRecord, StaffStatus, StaffSummary } from '../types';

type Subject = { code: string; name: string };
const num = (v: string) => (v.trim() ? Number(v) : undefined);

/** The fields shared by the add and edit forms. */
export function StaffForm(props: {
  initial?: StaffRecord;
  schools?: School[];
  submitLabel: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const s = props.initial;
  const [f, setF] = useState({
    surname: s?.surname ?? '', firstName: s?.firstName ?? '', middleName: s?.middleName ?? '', sex: s?.sex ?? '',
    category: (s?.category ?? 'TEACHING') as StaffCategory, rank: s?.rank ?? '', gradeLevel: s?.gradeLevel?.toString() ?? '', step: s?.step?.toString() ?? '',
    dateOfBirth: s?.dateOfBirth ?? '', firstAppointment: s?.firstAppointment ?? '', phone: s?.phone ?? '', email: s?.email ?? '',
    trcnNumber: s?.trcnNumber ?? '', schoolId: '', postedOn: '',
  });
  const [subjects, setSubjects] = useState<string[]>(s?.subjects ?? []);
  const [catalogue, setCatalogue] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    api<Subject[]>('/subjects').then(setCatalogue).catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (f.surname.trim().length < 2 || f.firstName.trim().length < 2) return setError('Enter the surname and first name.');
    if (!f.sex) return setError('Choose the sex.');
    if (props.schools && !f.schoolId) return setError('Choose the school.');
    setBusy(true);
    try {
      await props.onSubmit({
        surname: f.surname, firstName: f.firstName, middleName: f.middleName || undefined, sex: f.sex, category: f.category,
        rank: f.rank || undefined, gradeLevel: num(f.gradeLevel), step: num(f.step), dateOfBirth: f.dateOfBirth || undefined,
        firstAppointment: f.firstAppointment || undefined, phone: s ? f.phone : f.phone || undefined, email: s ? f.email : f.email || undefined,
        trcnNumber: f.trcnNumber || undefined, subjects: f.category === 'TEACHING' ? subjects : [],
        ...(s ? {} : { schoolId: f.schoolId || undefined, postedOn: f.postedOn || undefined }),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      {props.schools && (
        <Field label="School" full>
          <select id="staffSchool" value={f.schoolId} onChange={(e) => set('schoolId', e.target.value)}>
            <option value="">Choose a school</option>
            {props.schools.filter((x) => x.isActive).map((x) => <option key={x.id} value={x.id}>{x.name} · {x.lga}</option>)}
          </select>
        </Field>
      )}
      <Field label="Surname"><input id="staffSurname" value={f.surname} onChange={(e) => set('surname', e.target.value)} /></Field>
      <Field label="First name"><input id="staffFirst" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
      <Field label="Middle name"><input id="staffMiddle" value={f.middleName} onChange={(e) => set('middleName', e.target.value)} /></Field>
      <Field label="Sex">
        <select id="staffSex" value={f.sex} onChange={(e) => set('sex', e.target.value)}>
          <option value="">Choose</option><option value="F">Female</option><option value="M">Male</option>
        </select>
      </Field>
      <Field label="Staff type">
        <select id="staffCategory" value={f.category} onChange={(e) => set('category', e.target.value)}>
          <option value="TEACHING">Teaching</option><option value="NON_TEACHING">Non-teaching</option>
        </select>
      </Field>
      <Field label="Job title or cadre" hint="e.g. Principal, Teacher II, Bursar">
        <input id="staffRank" value={f.rank} onChange={(e) => set('rank', e.target.value)} />
      </Field>
      <Field label="Grade level" hint="1 to 17"><input id="staffGL" inputMode="numeric" value={f.gradeLevel} onChange={(e) => set('gradeLevel', e.target.value.replace(/\D/g, ''))} /></Field>
      <Field label="Step"><input id="staffStep" inputMode="numeric" value={f.step} onChange={(e) => set('step', e.target.value.replace(/\D/g, ''))} /></Field>
      <Field label="Date of birth"><input id="staffDob" type="date" value={f.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
      <Field label="First appointment" hint="Used for years of service"><input id="staffAppointed" type="date" max={todayNG()} value={f.firstAppointment} onChange={(e) => set('firstAppointment', e.target.value)} /></Field>
      <Field label="Phone number"><input id="staffPhone" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      <Field label="Email address"><input id="staffEmail" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field label="TRCN number" hint="Teachers Registration Council"><input id="staffTrcn" value={f.trcnNumber} onChange={(e) => set('trcnNumber', e.target.value)} /></Field>
      {!s && <Field label="Started at this school" hint="Leave empty for today"><input id="staffPosted" type="date" max={todayNG()} value={f.postedOn} onChange={(e) => set('postedOn', e.target.value)} /></Field>}
      {f.category === 'TEACHING' && (
        <div className="full">
          <span className="small" style={{ fontWeight: 600 }}>Subjects they can teach</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {catalogue.map((c) => (
              <label key={c.code} className={`pill ${subjects.includes(c.code) ? 'p-ind' : 'p-mut'}`} style={{ cursor: 'pointer' }}>
                <input type="checkbox" style={{ display: 'none' }} checked={subjects.includes(c.code)} onChange={(e) => setSubjects((x) => (e.target.checked ? [...x, c.code] : x.filter((y) => y !== c.code)))} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="full"><ErrorAlert error={error} /></div>
      <div className="full row">
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Saving…' : props.submitLabel}</button>
        <button className="btn" type="button" onClick={props.onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export function Staff() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const oversight = !!user && isOversight(user.role);
  const [rows, setRows] = useState<StaffSummary[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState(params.get('school') ?? '');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<StaffCategory | ''>('');
  const [status, setStatus] = useState<StaffStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const adding = params.get('new') === '1' && !!user && canEditStaff(user.role);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (schoolId) qs.set('schoolId', schoolId);
    if (q.trim()) qs.set('q', q.trim());
    if (category) qs.set('category', category);
    if (status) qs.set('status', status);
    api<StaffSummary[]>(`/staff?${qs}`).then(setRows).catch((e) => setError(e.message));
  }, [schoolId, q, category, status]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    if (oversight) api<School[]>('/schools').then(setSchools).catch(() => {});
  }, [oversight]);

  if (!user) return null;
  const teaching = rows.filter((r) => r.category === 'TEACHING').length;
  return (
    <>
      <div className="head">
        <div>
          <h1>Staff</h1>
          <p>{oversight ? 'Teaching and non-teaching staff in the schools you oversee.' : `Teaching and non-teaching staff at ${user.school?.name}.`} Postings, qualifications and training are on each person's record.</p>
        </div>
        <div className="row">
          {user.role === 'SCHOOL_ADMIN' && <Link className="btn" to="/staff/register">Staff register</Link>}
          <Link className="btn" to="/staff-transfers">Staff transfers</Link>
          {canEditStaff(user.role) && !adding && <button className="btn pri" onClick={() => setParams({ new: '1' })}>Add staff</button>}
        </div>
      </div>

      {!adding && <StaffInsights />}
      {adding && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>Add a member of staff</h2>
          <p className="muted small" style={{ marginBottom: 12 }}>They get a state staff number. To let them sign in, create their account on the Accounts page and link it on their record.</p>
          <StaffForm
            schools={user.role === 'MINISTRY_ADMIN' ? schools : undefined}
            submitLabel="Add to the registry"
            onCancel={() => setParams({})}
            onSubmit={async (body) => {
              const r = await api<StaffRecord>('/staff', { method: 'POST', json: body });
              navigate(`/staff/${r.id}`);
            }}
          />
        </div>
      )}

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="field" style={{ flex: '1 1 200px' }}>
            Search
            <input id="staffSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, staff or TRCN number" />
          </label>
          {oversight && (
            <label className="field" style={{ flex: '1 1 200px' }}>
              School
              <select id="staffSchoolFilter" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                <option value="">All schools</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.lga}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            Type
            <select id="staffCategoryFilter" value={category} onChange={(e) => setCategory(e.target.value as StaffCategory | '')}>
              <option value="">All staff</option><option value="TEACHING">Teaching</option><option value="NON_TEACHING">Non-teaching</option>
            </select>
          </label>
          <label className="field">
            Status
            <select id="staffStatusFilter" value={status} onChange={(e) => setStatus(e.target.value as StaffStatus | '')}>
              <option value="">Current staff</option>
              {(Object.keys(STAFF_STATUS_LABEL) as StaffStatus[]).map((s) => <option key={s} value={s}>{STAFF_STATUS_LABEL[s]}</option>)}
            </select>
          </label>
        </div>
        <ErrorAlert error={error} />
        <div className="tbl">
          <table>
            <thead><tr><th>Name</th><th>Staff number</th><th>Type</th><th>Job title</th>{oversight && <th>School</th>}<th>Phone</th><th>Service</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/staff/${r.id}`}><b>{r.fullName}</b></Link>{r.account && <div className="small muted">Has a sign-in account</div>}</td>
                  <td className="mono small">{r.staffNumber}</td>
                  <td>{CATEGORY_LABEL[r.category]}</td>
                  <td>{r.rank ?? '–'}{r.gradeLevel ? <span className="small muted"> · GL {r.gradeLevel}{r.step ? `/${r.step}` : ''}</span> : ''}</td>
                  {oversight && <td className="small">{r.school?.name ?? '–'}</td>}
                  <td className="mono small" style={{ whiteSpace: 'nowrap' }}>{formatPhone(r.phone) || '–'}</td>
                  <td className="small">{r.yearsOfService !== null ? `${r.yearsOfService} yr${r.yearsOfService === 1 ? '' : 's'}` : '–'}</td>
                  <td><span className={`pill ${r.status === 'ACTIVE' ? 'p-good' : 'p-mut'}`}>{STAFF_STATUS_LABEL[r.status]}</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="muted">No staff match. {canEditStaff(user.role) && 'Add staff with the button above.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="small muted mt">{rows.length} shown · {teaching} teaching, {rows.length - teaching} non-teaching</p>
      </div>
    </>
  );
}
