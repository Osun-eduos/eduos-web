import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, ApiError, apiObjectUrl } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDate, formatDay } from '../components/ui';
import { OVERALL } from '../roles';
import type { Checklist, FollowUp, Inspection, InspectionSummary, Overall } from '../types';

export function OverallPill({ overall }: { overall: Overall }) {
  return <span className={`pill ${OVERALL[overall].pill}`} style={overall === 'CRITICAL' ? { fontWeight: 700 } : undefined}>{OVERALL[overall].label}</span>;
}

/** Inspections of school buildings and facilities, recorded on the mobile app by inspectors and LGA officers. */
export const FOLLOW_UP: Record<FollowUp, [string, string]> = { URGENT: ['p-bad', 'Urgent'], PLANNED: ['p-warn', 'Planned'], RESOLVED: ['p-good', 'Resolved'] };
export function FollowUpPill({ f }: { f: InspectionSummary['followUp'] }) {
  return f ? <span className={`pill ${FOLLOW_UP[f.status][0]}`}>{FOLLOW_UP[f.status][1]}</span> : <span className="pill p-mut">No action set</span>;
}

interface StandardsRow {
  lga: string; schools: number; inspected: number; classrooms: number; usable: number; pupils: number; needed: number; shortfall: number; schoolsShort: number;
  needsAction: number; urgent: number; planned: number; resolved: number; noFollowUp: number; pupilsPerClassroom: number | null;
  rates: Record<'water' | 'toilets' | 'power' | 'ict' | 'library' | 'lab', number | null>;
}
const STANDARDS: { key: keyof StandardsRow['rates']; label: string }[] = [
  { key: 'water', label: 'Water' }, { key: 'toilets', label: 'Toilets' }, { key: 'power', label: 'Power' },
  { key: 'ict', label: 'ICT' }, { key: 'library', label: 'Library' }, { key: 'lab', label: 'Science lab' },
];

/** Minimum standards by LGA from each school's latest visit, classroom shortfall and report follow-up. */
function StandardsPanel() {
  const [d, setD] = useState<{ state: StandardsRow; lgas: StandardsRow[] } | null>(null);
  useEffect(() => {
    api<{ state: StandardsRow; lgas: StandardsRow[] }>('/inspections/standards').then(setD).catch(() => setD(null));
  }, []);
  if (!d || !d.state.schools) return null;
  const s = d.state;
  const pc = (v: number | null) => (v === null ? '–' : `${v}%`);
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <div className="card kpi"><div className="k">Schools inspected</div><div className="v">{s.inspected} of {s.schools}</div><div className="small muted">{s.schools - s.inspected} awaiting a first inspection</div></div>
        <div className="card kpi"><div className="k">Classrooms safe to use</div><div className="v">{s.usable.toLocaleString('en-NG')}</div><div className="small muted">{s.pupilsPerClassroom ?? '–'} pupils per classroom (benchmark 40)</div></div>
        <div className="card kpi"><div className="k">Classroom shortfall</div><div className="v">{s.shortfall.toLocaleString('en-NG')}</div><div className="small muted">in {s.schoolsShort} inspected school{s.schoolsShort === 1 ? '' : 's'}, at 40 pupils a room</div></div>
        <div className="card kpi"><div className="k">Reports needing action</div><div className="v">{s.needsAction}</div><div className="small muted">{s.urgent} urgent · {s.planned} planned · {s.resolved} resolved · {s.noFollowUp} not yet set</div></div>
      </div>
      {d.lgas.length > 1 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>Minimum standards by LGA</h2>
          <p className="small muted" style={{ marginBottom: 8 }}>Share of inspected schools meeting each standard at their latest visit: water on the day, working toilets including some for girls, a power source, a computer room, a library and a science laboratory. Shaded cells are under half.</p>
          <div className="tbl">
            <table>
              <thead><tr><th>LGA</th><th className="num">Inspected</th>{STANDARDS.map((x) => <th key={x.key} className="num">{x.label}</th>)}<th className="num">Pupils / classroom</th><th className="num">Classrooms short</th><th className="num">Urgent</th></tr></thead>
              <tbody>
                {d.lgas.map((l) => (
                  <tr key={l.lga}>
                    <td>{l.lga}</td>
                    <td className="num">{l.inspected} of {l.schools}</td>
                    {STANDARDS.map((x) => <td key={x.key} className={`num${l.rates[x.key] !== null && l.rates[x.key]! < 50 ? ' lagging' : ''}`}>{pc(l.rates[x.key])}</td>)}
                    <td className={`num${(l.pupilsPerClassroom ?? 0) > 40 ? ' lagging' : ''}`}>{l.pupilsPerClassroom ?? '–'}</td>
                    <td className="num">{l.shortfall}</td>
                    <td className="num">{l.urgent}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td>Osun State</td><td className="num">{s.inspected} of {s.schools}</td>
                  {STANDARDS.map((x) => <td key={x.key} className="num">{pc(s.rates[x.key])}</td>)}
                  <td className="num">{s.pupilsPerClassroom ?? '–'}</td><td className="num">{s.shortfall}</td><td className="num">{s.urgent}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export function Inspections() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<InspectionSummary[]>([]);
  const [overall, setOverall] = useState<Overall | ''>('');
  const [follow, setFollow] = useState<FollowUp | 'NONE' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const schoolId = params.get('school') ?? '';
  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (overall) qs.set('overall', overall);
    if (follow) qs.set('followUp', follow);
    if (schoolId) qs.set('schoolId', schoolId);
    api<InspectionSummary[]>(`/inspections?${qs}`).then(setRows).catch((e) => setError(e.message));
  }, [overall, follow, schoolId]);
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
              : 'Visits recorded on the mobile app or the website: classrooms, toilets, water, power, safety and facilities, with photos.'}
            {(user.role === 'INSPECTOR' || user.role === 'LGA_OFFICER') && ' The Osun EduOS app works without a signal and takes photos.'}
          </p>
        </div>
        <div className="row">
        {(user.role === 'INSPECTOR' || user.role === 'LGA_OFFICER') && <Link className="btn pri" to="/inspections/new" style={{ alignSelf: 'end' }}>New inspection report</Link>}
        <label className="field">
          Follow-up
          <select id="followFilter" value={follow} onChange={(e) => setFollow(e.target.value as FollowUp | 'NONE' | '')}>
            <option value="">All</option>
            {(Object.keys(FOLLOW_UP) as FollowUp[]).map((o) => <option key={o} value={o}>{FOLLOW_UP[o][1]}</option>)}
            <option value="NONE">No action set</option>
          </select>
        </label>
        <label className="field">
          Condition
          <select id="overallFilter" value={overall} onChange={(e) => setOverall(e.target.value as Overall | '')}>
            <option value="">All</option>
            {(Object.keys(OVERALL) as Overall[]).map((o) => <option key={o} value={o}>{OVERALL[o].label}</option>)}
          </select>
        </label>
        </div>
      </div>
      <ErrorAlert error={error} />
      {user.role !== 'SCHOOL_ADMIN' && !schoolId && <StandardsPanel />}
      {!overall && !follow && rows.length > 0 && (
        <div className="grid g4" style={{ marginBottom: 14 }}>
          {(['CRITICAL', 'POOR', 'FAIR', 'GOOD'] as Overall[]).map((o) => (
            <div className="card kpi" key={o}><div className="k">{OVERALL[o].label}</div><div className="v">{latest.filter((r) => r.overall === o).length}</div><div className="small muted">schools at their latest visit · {count(o)} visits</div></div>
          ))}
        </div>
      )}
      <div className="card">
        <div className="tbl">
          <table>
            <thead><tr><th>Visited</th><th>School</th><th>Condition</th><th>Main issues</th><th>Follow-up</th><th>Photos</th><th>Inspector</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><Link to={`/inspections/${r.id}`}>{formatDay(r.visitedOn)}</Link></td>
                  <td><b>{r.school.name}</b><br /><span className="small muted">{r.school.lga}</span></td>
                  <td><OverallPill overall={r.overall} /></td>
                  <td className="small">{r.issues.map((i) => i.text).join('; ') || <span className="muted">None</span>}{r.issueCount > r.issues.length && <span className="muted"> and {r.issueCount - r.issues.length} more</span>}</td>
                  <td>{r.overall === 'GOOD' && !r.followUp ? <span className="muted">–</span> : <FollowUpPill f={r.followUp} />}</td>
                  <td>{r.photoCount}</td>
                  <td className="small">{r.inspector.fullName}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="muted">No inspections match.</td></tr>}
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

function FollowUpEditor({ r, onSaved }: { r: Inspection; onSaved: (r: Inspection) => void }) {
  const { user } = useAuth();
  const can = user && ['MINISTRY_ADMIN', 'MINISTRY_OFFICER', 'LGA_OFFICER'].includes(user.role);
  const [status, setStatus] = useState<FollowUp>(r.followUp?.status ?? 'PLANNED');
  const [note, setNote] = useState(r.followUp?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api<Inspection>(`/inspections/${r.id}/follow-up`, { method: 'PATCH', json: { status, note: note.trim() || undefined } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p><FollowUpPill f={r.followUp} />{r.followUp?.note && <span> {r.followUp.note}</span>}{r.followUp && <span className="small muted"> · {formatDate(r.followUp.at)}</span>}</p>
      {can && (
        <div className="row mt">
          <select className="inline" aria-label="Follow-up status" value={status} onChange={(e) => setStatus(e.target.value as FollowUp)}>
            {(Object.keys(FOLLOW_UP) as FollowUp[]).map((o) => <option key={o} value={o}>{FOLLOW_UP[o][1]}</option>)}
          </select>
          <input className="inline" style={{ flex: 1, minWidth: 180 }} maxLength={500} aria-label="Follow-up note" placeholder="What will be done, and by when" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn sm pri" disabled={busy} onClick={save}>Save</button>
        </div>
      )}
      <ErrorAlert error={error} />
    </>
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
          <h2 className="mt">Follow-up</h2>
          <FollowUpEditor r={r} onSaved={setR} />
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
