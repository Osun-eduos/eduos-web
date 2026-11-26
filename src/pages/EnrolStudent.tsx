import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { CredentialsPanel, ErrorAlert, Field } from '../components/ui';
import { levelLabel } from '../roles';
import type { ClassArm, NewCredentials, Sex, StudentSummary, User } from '../types';

interface Duplicate {
  learnerId: string;
  school: string | null;
  sameSchool: boolean;
}

type GuardianMode = 'none' | 'existing' | 'new';
const today = () => new Date().toISOString().slice(0, 10);

/** Choosing or creating a parent account. Used on enrolment and on the student record. */
export function GuardianFields(props: {
  mode: GuardianMode;
  setMode: (m: GuardianMode) => void;
  value: { relationship: string; parentId: string; fullName: string; phone: string; email: string };
  set: (k: 'relationship' | 'parentId' | 'fullName' | 'phone' | 'email', v: string) => void;
  allowNone?: boolean;
}) {
  const [parents, setParents] = useState<User[]>([]);
  const [relationships, setRelationships] = useState<string[]>(['Mother', 'Father', 'Guardian']);
  useEffect(() => {
    api<User[]>('/users?role=PARENT').then((p) => setParents(p.filter((x) => x.isActive))).catch(() => {});
    api<string[]>('/students/relationships').then(setRelationships).catch(() => {});
  }, []);
  const { mode, value: v } = props;
  return (
    <>
      <div className="full tabs" role="tablist">
        {props.allowNone && <button type="button" className={mode === 'none' ? 'on' : ''} onClick={() => props.setMode('none')}>Add later</button>}
        <button type="button" className={mode === 'new' ? 'on' : ''} onClick={() => props.setMode('new')}>New parent account</button>
        <button type="button" className={mode === 'existing' ? 'on' : ''} onClick={() => props.setMode('existing')} disabled={!parents.length}>
          Existing parent{parents.length ? ` (${parents.length})` : ''}
        </button>
      </div>
      {mode !== 'none' && (
        <Field label="Relationship to the student">
          <select id="relationship" value={v.relationship} onChange={(e) => props.set('relationship', e.target.value)}>
            {relationships.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      )}
      {mode === 'existing' && (
        <Field label="Parent account">
          <select id="parentId" value={v.parentId} onChange={(e) => props.set('parentId', e.target.value)}>
            <option value="">Choose a parent</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.phone ?? p.email}</option>)}
          </select>
        </Field>
      )}
      {mode === 'new' && (
        <>
          <Field label="Parent's full name">
            <input id="parentName" value={v.fullName} onChange={(e) => props.set('fullName', e.target.value)} />
          </Field>
          <Field label="Parent's phone" hint="Used to sign in. Nigerian number.">
            <input id="parentPhone" inputMode="tel" value={v.phone} onChange={(e) => props.set('phone', e.target.value)} />
          </Field>
          <Field label="Parent's email (optional)">
            <input id="parentEmail" type="email" value={v.email} onChange={(e) => props.set('email', e.target.value)} />
          </Field>
        </>
      )}
    </>
  );
}

export function guardianPayload(mode: GuardianMode, v: { relationship: string; parentId: string; fullName: string; phone: string; email: string }) {
  if (mode === 'existing') return { relationship: v.relationship, parentId: v.parentId };
  if (mode === 'new') return { relationship: v.relationship, newParent: { fullName: v.fullName, phone: v.phone || undefined, email: v.email || undefined } };
  return undefined;
}

export function guardianProblem(mode: GuardianMode, v: { parentId: string; fullName: string; phone: string; email: string }) {
  if (mode === 'existing' && !v.parentId) return 'Choose the parent account.';
  if (mode === 'new' && v.fullName.trim().length < 3) return "Enter the parent's full name.";
  if (mode === 'new' && !v.phone.trim() && !v.email.trim()) return "Give the parent's phone number or email so they can sign in.";
  return null;
}

export function EnrolStudent() {
  const [classes, setClasses] = useState<ClassArm[]>([]);
  const [lgas, setLgas] = useState<string[]>([]);
  const [f, setF] = useState({ surname: '', firstName: '', middleName: '', sex: '' as Sex | '', dateOfBirth: '', stateOfOrigin: 'Osun', lgaOfOrigin: '', homeAddress: '', previousSchool: '', admittedOn: today(), classArmId: '', entryLevel: '' });
  const [levels, setLevels] = useState<string[]>([]);
  const [gMode, setGMode] = useState<GuardianMode>('new');
  const [g, setG] = useState({ relationship: 'Mother', parentId: '', fullName: '', phone: '', email: '' });
  const [dups, setDups] = useState<Duplicate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ student: StudentSummary; parent: NewCredentials | null } | null>(null);

  useEffect(() => {
    api<ClassArm[]>('/classes').then(setClasses).catch(() => {});
    api<string[]>('/schools/lgas').then(setLgas).catch(() => {});
    api<string[]>('/classes/levels').then((l) => { setLevels(l); setF((x) => ({ ...x, entryLevel: x.entryLevel || l[0] || '' })); }).catch(() => {});
  }, []);

  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e?: FormEvent, confirmDuplicate = false) {
    e?.preventDefault();
    setError(null);
    if (f.surname.trim().length < 2 || f.firstName.trim().length < 2) return setError('Enter the surname and first name.');
    if (!f.sex) return setError('Choose the sex.');
    if (!f.dateOfBirth) return setError('Enter the date of birth.');
    const gp = guardianProblem(gMode, g);
    if (gp) return setError(gp);
    setBusy(true);
    try {
      const res = await api<{ student: StudentSummary; parent: NewCredentials | null }>('/students', {
        method: 'POST',
        json: {
          surname: f.surname, firstName: f.firstName, middleName: f.middleName || undefined, sex: f.sex, dateOfBirth: f.dateOfBirth,
          stateOfOrigin: f.stateOfOrigin || undefined, lgaOfOrigin: f.lgaOfOrigin || undefined, homeAddress: f.homeAddress || undefined, previousSchool: f.previousSchool || undefined,
          entryLevel: !f.classArmId && f.entryLevel ? f.entryLevel : undefined,
          admittedOn: f.admittedOn || undefined, classArmId: f.classArmId || undefined, confirmDuplicate: confirmDuplicate || undefined,
          guardian: guardianPayload(gMode, g),
        },
      });
      setDone(res);
      setDups(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'POSSIBLE_DUPLICATE') {
        setDups((err.body as { matches: Duplicate[] }).matches);
      } else setError(err instanceof ApiError ? err.message : 'Could not enrol the student.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(null);
    setF((x) => ({ ...x, surname: '', firstName: '', middleName: '', sex: '', dateOfBirth: '', homeAddress: '' }));
    setG({ relationship: 'Mother', parentId: '', fullName: '', phone: '', email: '' });
    api<ClassArm[]>('/classes').then(setClasses).catch(() => {});
  }

  if (done) {
    const s = done.student;
    return (
      <>
        <div className="head"><div><h1>Enrolled</h1></div></div>
        <div className="card" style={{ display: 'grid', gap: 14 }}>
          <div className="alert ok">
            <b>{s.fullName}</b> is enrolled{s.currentClass ? ` in ${s.currentClass.name}` : ''}.
          </div>
          <dl className="kv">
            <dt>Learner ID</dt><dd className="mono">{s.learnerId}</dd>
            <dt>Admission number</dt><dd className="mono">{s.admissionNumber}</dd>
          </dl>
          {done.parent && <CredentialsPanel creds={done.parent} onDone={() => setDone({ ...done, parent: null })} />}
          <div className="row">
            <Link className="btn" to={`/students/${s.id}`}>Open student record</Link>
            <button className="btn pri" onClick={reset}>Enrol another student</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Enrol a student</h1>
          <p>The student gets an Osun learner ID that stays with them for life, and an admission number for your school. The parent or guardian gets both by text and in the app.</p>
        </div>
        <Link className="btn" to="/students">Back to students</Link>
      </div>
      <form className="card form" onSubmit={submit} noValidate style={{ maxWidth: 900 }}>
        <h2 className="full">Student</h2>
        <Field label="Surname"><input id="surname" value={f.surname} onChange={(e) => set('surname', e.target.value)} /></Field>
        <Field label="First name"><input id="firstName" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
        <Field label="Middle name (optional)"><input id="middleName" value={f.middleName} onChange={(e) => set('middleName', e.target.value)} /></Field>
        <Field label="Sex">
          <select id="sex" value={f.sex} onChange={(e) => set('sex', e.target.value)}>
            <option value="">Choose</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
          </select>
        </Field>
        <Field label="Date of birth"><input id="dob" type="date" value={f.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
        <Field label="State of origin"><input id="stateOfOrigin" value={f.stateOfOrigin} onChange={(e) => set('stateOfOrigin', e.target.value)} /></Field>
        <Field label="LGA of origin">
          {f.stateOfOrigin.trim().toLowerCase() === 'osun' ? (
            <select id="lgaOfOrigin" value={f.lgaOfOrigin} onChange={(e) => set('lgaOfOrigin', e.target.value)}>
              <option value="">Choose LGA</option>
              {lgas.map((l) => <option key={l}>{l}</option>)}
            </select>
          ) : (
            <input id="lgaOfOrigin" value={f.lgaOfOrigin} onChange={(e) => set('lgaOfOrigin', e.target.value)} />
          )}
        </Field>
        <Field label="Home address" full><input id="homeAddress" value={f.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} /></Field>
        <Field label="Previous school (if any)" full><input id="previousSchool" maxLength={120} value={f.previousSchool} onChange={(e) => set('previousSchool', e.target.value)} /></Field>

        <h2 className="full" style={{ marginTop: 8 }}>Admission</h2>
        <Field label="Admission date"><input id="admittedOn" type="date" value={f.admittedOn} onChange={(e) => set('admittedOn', e.target.value)} /></Field>
        <Field label="Class" hint={classes.length ? undefined : 'Create classes first, or place the student later.'}>
          <select id="classArmId" value={f.classArmId} onChange={(e) => set('classArmId', e.target.value)}>
            <option value="">Allocate later</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id} disabled={c.students >= c.capacity}>
                {c.name} · {c.students}/{c.capacity}{c.students >= c.capacity ? ' (full)' : ''}
              </option>
            ))}
          </select>
        </Field>

        {!f.classArmId && (
          <Field label="Entry class" hint="Used to allocate the student to an arm later.">
            <select id="entryLevel" value={f.entryLevel} onChange={(e) => set('entryLevel', e.target.value)}>
              {levels.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
            </select>
          </Field>
        )}

        <h2 className="full" style={{ marginTop: 8 }}>Parent or guardian</h2>
        <GuardianFields mode={gMode} setMode={setGMode} value={g} set={(k, v) => setG((x) => ({ ...x, [k]: v }))} allowNone />

        {dups && (
          <div className="full alert info" role="alert">
            <b>Possible duplicate.</b> A student with the same name and date of birth is already enrolled:
            <ul style={{ margin: '6px 0' }}>
              {dups.map((d) => (
                <li key={d.learnerId}><span className="mono">{d.learnerId}</span> at {d.sameSchool ? 'your school' : d.school ?? 'no school'}</li>
              ))}
            </ul>
            If this is the same child, ask {dups.some((d) => !d.sameSchool) ? 'their current school to transfer them to you' : 'yourself whether they are already enrolled'} instead.
            <div className="row mt">
              <button type="button" className="btn" onClick={() => submit(undefined, true)} disabled={busy}>It's a different child: enrol anyway</button>
              <button type="button" className="btn" onClick={() => setDups(null)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="full"><ErrorAlert error={error} /></div>
        <div className="full"><button className="btn pri" type="submit" disabled={busy}>{busy ? 'Enrolling…' : 'Enrol student'}</button></div>
      </form>
    </>
  );
}
