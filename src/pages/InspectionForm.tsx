import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { ErrorAlert, Field, todayNG } from '../components/ui';
import type { Checklist, Inspection } from '../types';

type Answers = Record<string, Record<string, number | string | boolean | ''>>;
interface Photo { file: File; section: string; caption: string }

/**
 * An inspection report from the website, for inspectors at a desk or with a laptop on site. The mobile app is
 * better in the field (it works without a signal); both use the same checklist.
 */
export function InspectionForm() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [t, setT] = useState<Checklist | null>(null);
  const [schools, setSchools] = useState<{ id: string; name: string; code: string; lga: string }[]>([]);
  const [schoolId, setSchoolId] = useState(params.get('school') ?? '');
  const [visitedOn, setVisitedOn] = useState(todayNG());
  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const clientId = useMemo(() => `web-${crypto.randomUUID()}`, []);

  useEffect(() => {
    api<Checklist>('/inspections/template').then((c) => {
      setT(c);
      setAnswers(Object.fromEntries(c.sections.map((s) => [s.key, Object.fromEntries(s.items.map((i) => [i.key, '']))])));
    }).catch((e) => setError(e.message));
    api<typeof schools>('/schools/directory').then(setSchools).catch(() => {});
  }, []);

  const set = (sec: string, item: string, v: number | string | boolean | '') => setAnswers((a) => ({ ...a, [sec]: { ...a[sec], [item]: v } }));
  const missing = t ? t.sections.reduce((n, s) => n + s.items.filter((i) => answers[s.key]?.[i.key] === '').length, 0) : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setProblems([]);
    if (!schoolId) return setError('Choose the school you visited.');
    if (missing) return setError(`Answer every item: ${missing} still blank.`);
    setBusy('Saving the report…');
    try {
      const r = await api<Inspection>('/inspections', { method: 'POST', json: { clientId, schoolId, visitedOn, answers, notes: notes.trim() || undefined } });
      for (const [i, p] of photos.entries()) {
        setBusy(`Uploading photo ${i + 1} of ${photos.length}…`);
        const fd = new FormData();
        fd.append('photo', p.file);
        fd.append('clientId', `${clientId}-p${i}`);
        fd.append('section', p.section);
        if (p.caption.trim()) fd.append('caption', p.caption.trim());
        await api(`/inspections/${r.id}/photos`, { method: 'POST', body: fd });
      }
      nav(`/inspections/${r.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        const b = err.body as { problems?: string[] } | undefined;
        if (b?.problems) setProblems(b.problems);
      } else setError('Could not save the report.');
    } finally {
      setBusy(null);
    }
  }

  if (!t) return <ErrorAlert error={error} />;
  return (
    <>
      <p className="small"><Link to="/inspections">← Inspections</Link></p>
      <div className="head">
        <div>
          <h1>Inspection report</h1>
          <p>Record what you find on site. Submitting updates the school's facility record and the state infrastructure figures. In the field, the Osun EduOS app works without a signal.</p>
        </div>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="card">
          <div className="form">
            <Field label="School">
              <select id="inspSchool" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                <option value="">Choose a school</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.code}</option>)}
              </select>
            </Field>
            <Field label="Inspection date" hint="Within the last 60 days."><input id="inspDate" type="date" max={todayNG()} value={visitedOn} onChange={(e) => setVisitedOn(e.target.value)} /></Field>
          </div>
        </div>
        {t.sections.map((s) => (
          <div className="card mt" key={s.key}>
            <h2>{s.title}</h2>
            <div className="form">
              {s.items.map((i) => {
                const v = answers[s.key]?.[i.key] ?? '';
                const id = `${s.key}-${i.key}`;
                return (
                  <Field key={i.key} label={i.label} hint={i.hint}>
                    {i.type === 'count' && <input id={id} type="number" min={0} max={1000} inputMode="numeric" value={v === '' ? '' : String(v)} onChange={(e) => set(s.key, i.key, e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))))} />}
                    {i.type === 'yesno' && (
                      <select id={id} value={v === '' ? '' : v ? 'yes' : 'no'} onChange={(e) => set(s.key, i.key, e.target.value === '' ? '' : e.target.value === 'yes')}>
                        <option value="">Choose</option><option value="yes">Yes</option><option value="no">No</option>
                      </select>
                    )}
                    {(i.type === 'rating' || i.type === 'choice') && (
                      <select id={id} value={String(v)} onChange={(e) => set(s.key, i.key, e.target.value)}>
                        <option value="">Choose</option>
                        {(i.type === 'rating' ? t.ratings : i.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                  </Field>
                );
              })}
            </div>
          </div>
        ))}
        <div className="card mt">
          <h2>Findings and photos</h2>
          <Field label="Findings and action needed" full>
            <textarea id="inspNotes" rows={4} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Roof over the JSS 2 block leaks; two classrooms closed." />
          </Field>
          <div className="mt">
            <input
              type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Add photos"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].filter((f) => f.size <= 5 * 1024 * 1024);
                setPhotos((p) => [...p, ...files.map((file) => ({ file, section: 'general', caption: '' }))].slice(0, 30));
                e.target.value = '';
              }}
            />
            <p className="small muted">JPEG, PNG or WebP, up to 5 MB each and 30 in all.</p>
          </div>
          {photos.map((p, i) => (
            <div className="row mt" key={i}>
              <span className="small" style={{ minWidth: 160 }}>{p.file.name}</span>
              <select className="inline" aria-label="Section" value={p.section} onChange={(e) => setPhotos((ps) => ps.map((x, j) => (j === i ? { ...x, section: e.target.value } : x)))}>
                <option value="general">General</option>
                {t.sections.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}
              </select>
              <input className="inline" style={{ flex: 1 }} maxLength={200} placeholder="Caption" value={p.caption} onChange={(e) => setPhotos((ps) => ps.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
              <button type="button" className="btn sm" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
        </div>
        <div className="mt"><ErrorAlert error={error} /></div>
        {problems.length > 1 && <ul className="small">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        <div className="row mt" style={{ justifyContent: 'flex-end' }}>
          <span className="small muted">{missing ? `${missing} item${missing === 1 ? '' : 's'} to answer` : 'Every item answered'}</span>
          <button className="btn pri" disabled={!!busy}>{busy ?? 'Submit report'}</button>
        </div>
      </form>
    </>
  );
}
