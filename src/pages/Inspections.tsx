import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, apiObjectUrl } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDate, formatDay } from '../components/ui';
import { OVERALL } from '../roles';
import type { Checklist, Inspection, InspectionSummary, Overall } from '../types';

export function OverallPill({ overall }: { overall: Overall }) {
  return <span className={`pill ${OVERALL[overall].pill}`} style={overall === 'CRITICAL' ? { fontWeight: 700 } : undefined}>{OVERALL[overall].label}</span>;
}

/** Inspections of school buildings and facilities, recorded on the mobile app by inspectors and LGA officers. */
export function Inspections() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<InspectionSummary[]>([]);
  const [overall, setOverall] = useState<Overall | ''>('');
  const [error, setError] = useState<string | null>(null);
  const schoolId = params.get('school') ?? '';
  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (overall) qs.set('overall', overall);
    if (schoolId) qs.set('schoolId', schoolId);
    api<InspectionSummary[]>(`/inspections?${qs}`).then(setRows).catch((e) => setError(e.message));
  }, [overall, schoolId]);
  useEffect(load, [load]);
  if (!user) return null;
  const count = (o: Overall) => rows.filter((r) => r.overall === o).length;
  // Each school's latest visit, for the summary counts.
  const latest = [...new Map(rows.map((r) => [r.school.id, r] as const)).values()];

  return (
    <>
      <div className="head">
        <div>
          <h1>Inspections</h1>
          <p>
            {user.role === 'SCHOOL_ADMIN'
              ? 'Visits to your school by inspectors and LGA officers, with what they found.'
              : 'Visits recorded on the mobile app: classrooms, toilets, water, power and safety, with photos.'}
            {(user.role === 'INSPECTOR' || user.role === 'LGA_OFFICER') && ' Record new visits on the Osun EduOS app; it works without a signal.'}
          </p>
        </div>
        <label className="field">
          Condition
          <select id="overallFilter" value={overall} onChange={(e) => setOverall(e.target.value as Overall | '')}>
            <option value="">All</option>
            {(Object.keys(OVERALL) as Overall[]).map((o) => <option key={o} value={o}>{OVERALL[o].label}</option>)}
          </select>
        </label>
      </div>
      <ErrorAlert error={error} />
      {!overall && rows.length > 0 && (
        <div className="grid g4" style={{ marginBottom: 14 }}>
          {(['CRITICAL', 'POOR', 'FAIR', 'GOOD'] as Overall[]).map((o) => (
            <div className="card kpi" key={o}><div className="k">{OVERALL[o].label}</div><div className="v">{latest.filter((r) => r.overall === o).length}</div><div className="small muted">schools at their latest visit · {count(o)} visits</div></div>
          ))}
        </div>
      )}
      <div className="card">
        <div className="tbl">
          <table>
            <thead><tr><th>Visited</th><th>School</th><th>Condition</th><th>Main issues</th><th>Photos</th><th>Inspector</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><Link to={`/inspections/${r.id}`}>{formatDay(r.visitedOn)}</Link></td>
                  <td><b>{r.school.name}</b><br /><span className="small muted">{r.school.lga}</span></td>
                  <td><OverallPill overall={r.overall} /></td>
                  <td className="small">{r.issues.map((i) => i.text).join('; ') || <span className="muted">None</span>}{r.issueCount > r.issues.length && <span className="muted"> and {r.issueCount - r.issues.length} more</span>}</td>
                  <td>{r.photoCount}</td>
                  <td className="small">{r.inspector.fullName}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="muted">No inspections yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Photo({ id, caption }: { id: string; caption: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let u: string | null = null;
    apiObjectUrl(`/inspections/photos/${id}`).then((x) => setUrl((u = x))).catch(() => setFailed(true));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return (
    <figure className="photo">
      {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={caption ?? 'Inspection photo'} /></a> : <div className="ph muted small">{failed ? 'Could not load' : 'Loading…'}</div>}
      {caption && <figcaption className="small">{caption}</figcaption>}
    </figure>
  );
}

export function InspectionDetail() {
  const { id } = useParams();
  const [r, setR] = useState<Inspection | null>(null);
  const [t, setT] = useState<Checklist | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Inspection>(`/inspections/${id}`).then(setR).catch((e) => setError(e.message));
    api<Checklist>('/inspections/template').then(setT).catch(() => {});
  }, [id]);
  if (!r || !t) return <ErrorAlert error={error} />;

  const show = (type: string, v: unknown, options?: { value: string; label: string }[]) => {
    if (type === 'yesno') return v ? 'Yes' : 'No';
    if (type === 'rating') return t.ratings.find((o) => o.value === v)?.label ?? String(v);
    if (type === 'choice') return options?.find((o) => o.value === v)?.label ?? String(v);
    return String(v);
  };
  const general = r.photos.filter((p) => !t.sections.some((s) => s.key === p.section));

  return (
    <>
      <p className="small"><Link to="/inspections">← Inspections</Link></p>
      <div className="head">
        <div>
          <h1>{r.school.name}</h1>
          <p>{r.school.lga} LGA · visited {formatDay(r.visitedOn)} by {r.inspector.fullName} · recorded {formatDate(r.createdAt)}</p>
        </div>
        <div style={{ fontSize: '1.1rem' }}><OverallPill overall={r.overall} /></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <h2>What needs attention</h2>
          {r.issues.length ? (
            <ul className="plain">
              {r.issues.map((i) => <li key={i.text}><OverallPill overall={i.level} /> {i.text}</li>)}
            </ul>
          ) : <p className="muted">Nothing. The school is in good condition.</p>}
        </div>
        <div className="card">
          <h2>Inspector's notes</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{r.notes || <span className="muted">None.</span>}</p>
        </div>
      </div>
      {t.sections.map((s) => {
        const photos = r.photos.filter((p) => p.section === s.key);
        return (
          <div className="card" key={s.key} style={{ marginBottom: 14 }}>
            <h2>{s.title}</h2>
            <dl className="kv">
              {s.items.map((i) => (
                <div key={i.key} style={{ display: 'contents' }}>
                  <dt>{i.label}</dt>
                  <dd>{r.answers[s.key]?.[i.key] === undefined ? '–' : show(i.type, r.answers[s.key][i.key], i.options)}</dd>
                </div>
              ))}
            </dl>
            {photos.length > 0 && <div className="photos mt">{photos.map((p) => <Photo key={p.id} id={p.id} caption={p.caption} />)}</div>}
          </div>
        );
      })}
      {general.length > 0 && (
        <div className="card"><h2>Other photos</h2><div className="photos">{general.map((p) => <Photo key={p.id} id={p.id} caption={p.caption} />)}</div></div>
      )}
    </>
  );
}
