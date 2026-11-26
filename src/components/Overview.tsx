import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { LineChart } from './charts';
import { formatDate, formatDay } from './ui';

type Status = 'ON_TRACK' | 'WATCH' | 'NEEDS_SUPPORT';
export const STATUS_LABEL: Record<Status, string> = { ON_TRACK: 'On track', WATCH: 'Watch', NEEDS_SUPPORT: 'Needs support' };

interface Overview {
  scope: { lga: string | null; label: string };
  trend: { termId: string; term: string; average: number | null; passRate: number | null; entries: number }[];
  lgas: { lga: string; status: Status; reasons: string[]; students: number; attendanceRate: number | null; passRate: number | null; pupilsPerTeacher: number | null }[];
  lgaCounts: Record<Status, number>;
  schoolsNeedingSupport: { id: string; name: string; code: string; lga: string; reasons: string[]; students: number; attendanceRate: number | null; passRate: number | null }[];
  schoolsNeedingSupportCount: number;
}
interface Submissions {
  term: { id: string; name: string; session: string; resultsDueOn: string | null; scoresClosed: boolean };
  summary: { schools: number; released: number; percent: number | null; partlyReleased: number; awaitingApproval: number; withTeachers: number; notStarted: number; overdue: boolean };
  latest: { at: string; school: { id: string; name: string; lga: string }; class: string; students: number }[];
}
interface Insights { attendance: { staff: number; marked: number; present: number; late: number; presentRate: number | null; schools: number; schoolsMarked: number }; training: { targetHours: number; teachers: number; metTarget: number; averageHours: number | null } }

const pc = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${v}%`);
const short = (t: string) => t.replace('First', '1st').replace('Second', '2nd').replace('Third', '3rd');

/** The top of the dashboard: results submitted, staff in today, the score trend, and where support is needed. */
export function OverviewPanel({ lga }: { lga: string }) {
  const [o, setO] = useState<Overview | null>(null);
  const [sub, setSub] = useState<Submissions | null>(null);
  const [ins, setIns] = useState<Insights | null>(null);
  useEffect(() => {
    const q = lga ? `?lga=${encodeURIComponent(lga)}` : '';
    api<Overview>(`/indicators/overview${q}`).then(setO).catch(() => setO(null));
  }, [lga]);
  useEffect(() => {
    api<Submissions>('/results/submissions').then(setSub).catch(() => setSub(null));
    api<Insights>('/staff/insights').then(setIns).catch(() => setIns(null));
  }, []);

  const s = sub?.summary;
  return (
    <>
      <div className="grid g4">
        <div className="card kpi">
          <div className="k">Results submitted · {sub ? short(`${sub.term.name}`) : ''}</div>
          <div className="v">{pc(s?.percent)}</div>
          <div className="small muted">
            {s ? `${s.released} of ${s.schools} schools released all classes` : ' '}
            {sub?.term.resultsDueOn && <> · due {formatDay(sub.term.resultsDueOn)}{s?.overdue && <b style={{ color: 'var(--bad)' }}> · overdue</b>}</>}
          </div>
          <div className="meter mt" aria-hidden><span style={{ width: `${s?.percent ?? 0}%` }} /></div>
        </div>
        <div className="card kpi">
          <div className="k">Awaiting school approval</div>
          <div className="v">{s?.awaitingApproval ?? '–'}</div>
          <div className="small muted">{s ? `${s.withTeachers} with teachers · ${s.notStarted} not started · ${s.partlyReleased} part released` : ' '}</div>
        </div>
        <div className="card kpi">
          <div className="k">Staff present today</div>
          <div className="v">{pc(ins?.attendance.presentRate)}</div>
          <div className="small muted">{ins ? `${ins.attendance.present + ins.attendance.late} of ${ins.attendance.marked} marked · ${ins.attendance.schoolsMarked} of ${ins.attendance.schools} schools took the register` : ' '}</div>
        </div>
        <div className="card kpi">
          <div className="k">Teachers at {ins?.training.targetHours ?? 40} training hours</div>
          <div className="v">{ins && ins.training.teachers ? `${Math.round((ins.training.metTarget / ins.training.teachers) * 100)}%` : '–'}</div>
          <div className="small muted">{ins ? `${ins.training.metTarget} of ${ins.training.teachers} teachers · average ${ins.training.averageHours ?? 0} hours this session` : ' '}</div>
        </div>
      </div>

      <div className="grid g2 mt">
        <div className="card">
          <h2>Average score by term</h2>
          <p className="small muted" style={{ marginBottom: 6 }}>{o?.scope.label}: mean subject total (out of 100) in released results.</p>
          {o && (
            <LineChart
              label="Average score by term"
              labels={o.trend.map((t) => short(t.term).replace(/ \d{4}\//, ' '))}
              lines={[{ name: 'Average', color: 'var(--series-1)', values: o.trend.map((t) => t.average) }]}
              max={100}
            />
          )}
        </div>
        <div className="card">
          <h2>Latest result submissions</h2>
          {!sub?.latest.length && <p className="muted small">No class has released results this term yet.</p>}
          <ul className="items">
            {sub?.latest.map((r, i) => (
              <li key={i}>
                <b>{r.school.name}</b>
                <span className="small muted">{r.class} · {r.students} students · {r.school.lga} · {formatDate(r.at)}</span>
              </li>
            ))}
          </ul>
          <Link className="small" to="/results">All schools' submission status</Link>
        </div>
      </div>

      {o && !o.scope.lga && (
        <div className="card mt">
          <div className="row between">
            <h2 style={{ margin: 0 }}>LGA status</h2>
            <span className="small muted">{o.lgaCounts.ON_TRACK} on track · {o.lgaCounts.WATCH} to watch · {o.lgaCounts.NEEDS_SUPPORT} need support</span>
          </div>
          <div className="tbl mt">
            <table>
              <thead><tr><th>LGA</th><th>Status</th><th className="num">Students</th><th className="num">Attendance</th><th className="num">Pass rate</th><th className="num">Pupils / teacher</th><th>Why</th></tr></thead>
              <tbody>
                {o.lgas.map((l) => (
                  <tr key={l.lga}>
                    <td>{l.lga}</td>
                    <td><span className={`pill status-${l.status}`}>{STATUS_LABEL[l.status]}</span></td>
                    <td className="num">{l.students.toLocaleString('en-NG')}</td>
                    <td className="num">{pc(l.attendanceRate)}</td>
                    <td className="num">{pc(l.passRate)}</td>
                    <td className="num">{l.pupilsPerTeacher ?? '–'}</td>
                    <td className="small muted">{l.reasons.join(' · ') || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {o && (
        <div className="card mt">
          <h2>Schools needing support{o.schoolsNeedingSupportCount > o.schoolsNeedingSupport.length ? ` (top ${o.schoolsNeedingSupport.length} of ${o.schoolsNeedingSupportCount})` : ''}</h2>
          {!o.schoolsNeedingSupport.length && <p className="muted small">No school is below the support thresholds this session.</p>}
          {!!o.schoolsNeedingSupport.length && (
            <div className="tbl">
              <table>
                <thead><tr><th>School</th><th>LGA</th><th className="num">Students</th><th className="num">Attendance</th><th className="num">Pass rate</th><th>Why</th></tr></thead>
                <tbody>
                  {o.schoolsNeedingSupport.map((x) => (
                    <tr key={x.id}>
                      <td><Link to={`/schools/${x.id}`}>{x.name}</Link><div className="small muted mono">{x.code}</div></td>
                      <td>{x.lga}</td>
                      <td className="num">{x.students}</td>
                      <td className="num">{pc(x.attendanceRate)}</td>
                      <td className="num">{pc(x.passRate)}</td>
                      <td className="small">{x.reasons.join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

interface Compare {
  terms: { id: string; name: string; session: string }[];
  state: { name: string; points: Point[] };
  lgas: { name: string; points: Point[] }[];
}
interface Point { term: string; attendanceRate: number | null; average: number | null; passRate: number | null; students: number }
const COLOURS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const MEASURES: { key: keyof Point; label: string; suffix: string }[] = [
  { key: 'passRate', label: 'Pass rate', suffix: '%' },
  { key: 'average', label: 'Average score', suffix: '' },
  { key: 'attendanceRate', label: 'Attendance rate', suffix: '%' },
];

/** Up to three LGAs against the state, term by term. */
export function CompareLgas({ lgas, initial }: { lgas: string[]; initial: string[] }) {
  const [chosen, setChosen] = useState<string[]>(initial);
  const [measure, setMeasure] = useState(MEASURES[0]);
  const [data, setData] = useState<Compare | null>(null);
  useEffect(() => {
    api<Compare>(`/indicators/compare?lgas=${encodeURIComponent(chosen.join(','))}`).then(setData).catch(() => setData(null));
  }, [chosen]);
  const pick = (p: Point[]) => p.map((x) => x[measure.key] as number | null);
  return (
    <div className="card mt">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Compare LGAs, term by term</h2>
        <select className="inline" aria-label="Measure to compare" value={measure.key} onChange={(e) => setMeasure(MEASURES.find((m) => m.key === e.target.value)!)}>
          {MEASURES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>
      {lgas.length > 0 && (
        <div className="row small mt" style={{ gap: 8 }}>
          <span className="muted">Compare up to three LGAs with the state:</span>
          {[0, 1, 2].map((i) => (
            <select key={i} className="inline" aria-label={`LGA ${i + 1}`} value={chosen[i] ?? ''} onChange={(e) => setChosen((c) => { const n = [...c]; n[i] = e.target.value; return n.filter(Boolean).filter((x, j, a) => a.indexOf(x) === j); })}>
              <option value="">{i === 0 ? 'Choose an LGA' : 'None'}</option>
              {lgas.filter((l) => l === chosen[i] || !chosen.includes(l)).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          ))}
        </div>
      )}
      {data && (
        <div className="mt">
          <LineChart
            label={`${measure.label} by term`}
            labels={data.terms.map((t) => `${short(t.name).replace(' term', '')} ${t.session.slice(2, 4)}/${t.session.slice(7)}`)}
            suffix={measure.suffix}
            max={measure.suffix === '%' || measure.key === 'average' ? 100 : undefined}
            lines={[{ name: data.state.name, color: 'var(--muted)', values: pick(data.state.points), reference: true }, ...data.lgas.map((l, i) => ({ name: l.name, color: COLOURS[i], values: pick(l.points) }))]}
          />
        </div>
      )}
    </div>
  );
}

interface Access {
  scope: { lga: string | null; label: string };
  session: { name: string };
  populationYear: number | null;
  previousSession: string | null;
  totals: AccessRow;
  byLga: (AccessRow & { lga: string })[];
}
interface AccessRow {
  stages: { stage: string; name: string; ages: string; enrolled: number; officialAge: number; population: number | null; ger: number | null; ner: number | null; completion: number | null }[];
  population: number | null;
  outOfSchool: number | null;
  outOfSchoolRate: number | null;
  transition: { primaryToJss: number | null; jssToSss: number | null };
}

/** Enrolment against population: GER, NER, out of school, transition and completion. */
export function AccessPanel({ lga, sessionId, canEdit }: { lga: string; sessionId: string; canEdit: boolean }) {
  const [a, setA] = useState<Access | null>(null);
  useEffect(() => {
    const q = new URLSearchParams();
    if (lga) q.set('lga', lga);
    if (sessionId) q.set('sessionId', sessionId);
    api<Access>(`/indicators/access?${q}`).then(setA).catch(() => setA(null));
  }, [lga, sessionId]);
  if (!a) return null;
  const t = a.totals;
  const stage = (row: AccessRow, k: string) => row.stages.find((s) => s.stage === k)!;
  const worst = (k: string, field: 'ger' | 'ner') => {
    const v = stage(t, k)[field];
    return (x: number | null) => v !== null && x !== null && x < v * 0.9;
  };
  return (
    <div className="card mt">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Access and participation</h2>
        <span className="small muted">
          {a.populationYear ? `Population estimates for ${a.populationYear}` : 'No population estimates yet'} · <Link to="/population">{canEdit ? 'Enter estimates' : 'See estimates'}</Link>
        </span>
      </div>
      {!a.populationYear && <div className="alert info mt">Enrolment ratios and out-of-school figures need the school-age population for each LGA. {canEdit ? 'Enter the estimates to see them.' : 'The Ministry administrator enters these.'}</div>}
      <div className="grid g4 mt">
        {t.stages.map((s) => (
          <div className="card kpi" key={s.stage}>
            <div className="k">{s.name} GER</div>
            <div className="v">{pc(s.ger)}</div>
            <div className="small muted">NER {pc(s.ner)} · ages {s.ages} · {s.enrolled.toLocaleString('en-NG')} enrolled</div>
          </div>
        ))}
        <div className="card kpi">
          <div className="k">Out of school (estimate)</div>
          <div className="v">{t.outOfSchool === null ? '–' : t.outOfSchool.toLocaleString('en-NG')}</div>
          <div className="small muted">{t.outOfSchoolRate !== null ? `${t.outOfSchoolRate}% of children aged 6 to 17` : ' '}</div>
        </div>
      </div>
      <p className="small muted mt">
        Transition {a.previousSession ? `from ${a.previousSession}` : ''}: Primary 6 to JSS 1 {pc(t.transition.primaryToJss)} · JSS 3 to SSS 1 {pc(t.transition.jssToSss)}. Completion (proxy): {t.stages.map((s) => `${s.name.toLowerCase()} ${pc(s.completion)}`).join(' · ')}.
        Only schools on EduOS are counted, so out-of-school figures are an upper bound.
      </p>
      {!!a.byLga.length && !!a.populationYear && (
        <div className="tbl mt">
          <table>
            <thead><tr><th>LGA</th>{t.stages.map((s) => <th key={s.stage} className="num">{s.name} GER / NER</th>)}<th className="num">Out of school</th><th className="num">P6 → JSS 1</th><th className="num">JSS 3 → SSS 1</th></tr></thead>
            <tbody>
              {a.byLga.map((r) => (
                <tr key={r.lga}>
                  <td>{r.lga}</td>
                  {r.stages.map((s) => (
                    <td key={s.stage} className={`num${worst(s.stage, 'ner')(s.ner) ? ' lagging' : ''}`}>{pc(s.ger)} / {pc(s.ner)}</td>
                  ))}
                  <td className="num">{r.outOfSchool === null ? '–' : r.outOfSchool.toLocaleString('en-NG')}</td>
                  <td className="num">{pc(r.transition.primaryToJss)}</td>
                  <td className="num">{pc(r.transition.jssToSss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted mt">Shaded cells: net enrolment more than 10% below the state figure.</p>
        </div>
      )}
    </div>
  );
}
