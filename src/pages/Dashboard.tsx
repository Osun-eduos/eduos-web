import { MouseEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, apiDownload, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';
import type { AcademicSession } from '../types';

export interface Figures {
  schools: number; classes: number; students: number; girls: number; boys: number; girlsShare: number | null; gpi: number | null;
  byStage: { primary: number; jss: number; sss: number }; averageClassSize: number | null; teachers: number; nonTeachingStaff: number;
  pupilsPerTeacher: number | null; qualifiedTeachers: number | null; trcnTeachers: number | null; attendanceRate: number | null; registerMarks: number;
  resultEntries: number; average: number | null; passRate: number | null; creditRate: number | null; passRateGirls: number | null; passRateBoys: number | null;
  inspected: number; condition: { good: number; fair: number; poor: number; critical: number };
}
interface Indicators {
  scope: { lga: string | null; level: 'state' | 'lga'; label: string };
  session: { id: string; name: string; isCurrent: boolean };
  term: { id: string; name: string } | null;
  terms: { id: string; name: string }[];
  staffAsOf: string;
  totals: Figures;
  breakdown: { key: string; name: string; lga: string; code?: string; figures: Figures }[];
}
interface Trends {
  bySession: { session: string; students: number; girlsShare: number | null; gpi: number | null; pupilsPerTeacher: number | null; attendanceRate: number | null; passRate: number | null }[];
  attendanceByMonth: { month: string; attendanceRate: number | null; marks: number }[];
}

const fmt = (v: number | null | undefined, suffix = '') => (v === null || v === undefined ? '–' : `${v.toLocaleString('en-NG')}${suffix}`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The measure shown in the comparison chart, with an optional reference line (a benchmark). */
const METRICS: { key: string; label: string; get: (f: Figures) => number | null; suffix: string; max?: number; ref?: { value: number; label: string }; low?: boolean }[] = [
  { key: 'passRate', label: 'Pass rate', get: (f) => f.passRate, suffix: '%', max: 100 },
  { key: 'attendanceRate', label: 'Attendance rate', get: (f) => f.attendanceRate, suffix: '%', max: 100 },
  { key: 'pupilsPerTeacher', label: 'Pupils per teacher', get: (f) => f.pupilsPerTeacher, suffix: '', ref: { value: 35, label: 'Benchmark 35' }, low: true },
  { key: 'gpi', label: 'Gender parity index', get: (f) => f.gpi, suffix: '', max: 1.5, ref: { value: 1, label: 'Parity 1.00' } },
  { key: 'qualifiedTeachers', label: 'Qualified teachers', get: (f) => f.qualifiedTeachers, suffix: '%', max: 100 },
  { key: 'students', label: 'Students enrolled', get: (f) => f.students, suffix: '' },
  { key: 'average', label: 'Average score', get: (f) => f.average, suffix: '', max: 100 },
];

/** A tooltip that follows the pointer. */
function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; body: ReactNode } | null>(null);
  const show = (body: ReactNode) => (e: MouseEvent) => setTip({ x: e.clientX + 14, y: e.clientY + 14, body });
  const el = tip && <div className="chart-tip" role="tooltip" style={{ left: Math.min(tip.x, window.innerWidth - 250), top: tip.y }}>{tip.body}</div>;
  return { show, hide: () => setTip(null), el };
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card kpi">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {note && <div className="small muted">{note}</div>}
    </div>
  );
}

/** Horizontal bars, one per area, longest first. A single series, so the title names it and there is no legend. */
function BarList({ rows, metric }: { rows: Indicators['breakdown']; metric: (typeof METRICS)[number] }) {
  const tip = useTip();
  const data = rows.map((r) => ({ r, v: metric.get(r.figures) })).filter((d) => d.v !== null) as { r: Indicators['breakdown'][number]; v: number }[];
  data.sort((a, b) => (metric.low ? a.v - b.v : b.v - a.v));
  const max = Math.max(metric.max ?? 0, ...data.map((d) => d.v), metric.ref?.value ?? 0) || 1;
  if (!data.length) return <p className="muted small">No figures for this measure yet.</p>;
  return (
    <div className="barlist" onMouseLeave={tip.hide}>
      {data.map(({ r, v }) => (
        <div
          className="bl-row"
          key={r.key}
          onMouseMove={tip.show(
            <>
              <b>{r.name}</b>
              <br />
              {metric.label}: {fmt(v, metric.suffix)}
              <br />
              {fmt(r.figures.students)} students · {fmt(r.figures.schools)} school{r.figures.schools === 1 ? '' : 's'}
            </>,
          )}
        >
          <span className="bl-name" title={r.name}>{r.name}</span>
          <span className="bl-track">
            <span className="bl-bar" style={{ width: `${(v / max) * 100}%`, display: 'block' }} />
            {metric.ref && <span className="bl-ref" style={{ left: `${(metric.ref.value / max) * 100}%` }} />}
          </span>
          <span className="bl-val">{fmt(v, metric.suffix)}</span>
        </div>
      ))}
      {metric.ref && <p className="small muted" style={{ marginTop: 4 }}>Dashed line: {metric.ref.label}{metric.low ? '. Lower is better.' : ''}</p>}
      {tip.el}
    </div>
  );
}

/** Attendance month by month: one series of columns on a 0 to 100% scale. */
function MonthColumns({ months }: { months: Trends['attendanceByMonth'] }) {
  const tip = useTip();
  if (!months.length) return <p className="muted small">No registers taken yet this session.</p>;
  const W = Math.max(320, months.length * 56), H = 180, pad = { l: 34, b: 24, t: 8 };
  const bw = Math.min(28, (W - pad.l) / months.length - 10);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / 100);
  return (
    <div className="cols" onMouseLeave={tip.hide}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Attendance rate by month">
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line className="gridline" x1={pad.l} x2={W} y1={y(g)} y2={y(g)} />
            <text x={pad.l - 6} y={y(g) + 4} textAnchor="end">{g}%</text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = pad.l + (i + 0.5) * ((W - pad.l) / months.length);
          const v = m.attendanceRate ?? 0;
          const [yy, mm] = m.month.split('-');
          return (
            <g key={m.month} onMouseMove={tip.show(<><b>{MONTHS[Number(mm) - 1]} {yy}</b><br />Attendance {fmt(m.attendanceRate, '%')}<br />{fmt(m.marks)} register marks</>)}>
              <rect className="hit" x={cx - bw / 2 - 6} y={pad.t} width={bw + 12} height={H - pad.t - pad.b} fill="transparent" />
              <path className="col" d={`M${cx - bw / 2},${y(0)} V${y(v) + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${y(0)} Z`} />
              <text x={cx} y={H - 6} textAnchor="middle">{MONTHS[Number(mm) - 1]}</text>
            </g>
          );
        })}
      </svg>
      {tip.el}
    </div>
  );
}

const TABLE: { label: string; get: (f: Figures) => number | null; suffix?: string }[] = [
  { label: 'Schools', get: (f) => f.schools },
  { label: 'Students', get: (f) => f.students },
  { label: 'Girls %', get: (f) => f.girlsShare },
  { label: 'GPI', get: (f) => f.gpi },
  { label: 'Teachers', get: (f) => f.teachers },
  { label: 'Pupils / teacher', get: (f) => f.pupilsPerTeacher },
  { label: 'Qualified %', get: (f) => f.qualifiedTeachers },
  { label: 'Attendance %', get: (f) => f.attendanceRate },
  { label: 'Average', get: (f) => f.average },
  { label: 'Pass %', get: (f) => f.passRate },
  { label: 'Credit %', get: (f) => f.creditRate },
  { label: 'Inspected', get: (f) => f.inspected },
  { label: 'Poor or critical', get: (f) => f.condition.poor + f.condition.critical },
];

export function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [lgas, setLgas] = useState<string[]>([]);
  const [search] = useSearchParams();
  const [sessionId, setSessionId] = useState(search.get('session') ?? '');
  const [termId, setTermId] = useState('');
  const [lga, setLga] = useState('');
  const [data, setData] = useState<Indicators | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [metric, setMetric] = useState(METRICS[0].key);
  const [sort, setSort] = useState<{ col: number; desc: boolean }>({ col: -1, desc: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<AcademicSession[]>('/sessions').then(setSessions).catch(() => {});
    if (!user?.lga) api<string[]>('/schools/lgas').then(setLgas).catch(() => {});
  }, [user?.lga]);

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    if (sessionId) q.set('sessionId', sessionId);
    if (termId) q.set('termId', termId);
    if (lga) q.set('lga', lga);
    return q.toString();
  }, [sessionId, termId, lga]);

  useEffect(() => {
    setError(null);
    api<Indicators>(`/indicators?${qs}`).then(setData).catch((e) => setError(e.message));
    const t = new URLSearchParams(qs);
    t.delete('termId');
    api<Trends>(`/indicators/trends?${t}`).then(setTrends).catch(() => setTrends(null));
  }, [qs]);

  async function download(format: 'csv' | 'xlsx' | 'pdf') {
    setBusy(format);
    try {
      await apiDownload(`/indicators/export?format=${format}&${qs}`, `indicators.${format}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The export did not work. Try again.');
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;
  const f = data?.totals;
  const m = METRICS.find((x) => x.key === metric)!;
  const area = data?.scope.level === 'lga' ? 'school' : 'LGA';
  const rows = [...(data?.breakdown ?? [])];
  if (sort.col >= 0) {
    const g = TABLE[sort.col].get;
    rows.sort((a, b) => ((g(a.figures) ?? -1) - (g(b.figures) ?? -1)) * (sort.desc ? -1 : 1));
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Dashboard</h1>
          <p>{data ? `${data.scope.label} · ${data.session.name} session${data.term ? `, ${data.term.name}` : ''}` : 'Education indicators'}. Figures come from the records schools keep in EduOS; results count only released classes.</p>
        </div>
        <div className="row">
          {(['xlsx', 'pdf', 'csv'] as const).map((x) => (
            <button key={x} className={`btn${x === 'xlsx' ? ' pri' : ''}`} disabled={!!busy || !data} onClick={() => download(x)}>
              {busy === x ? 'Preparing…' : x === 'xlsx' ? 'Excel' : x === 'pdf' ? 'PDF report' : 'CSV'}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row">
          <label className="field">
            Session
            <select id="dashSession" value={sessionId} onChange={(e) => { setSessionId(e.target.value); setTermId(''); }}>
              <option value="">Current session</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isCurrent ? ' (current)' : ''}</option>)}
            </select>
          </label>
          <label className="field">
            Term
            <select id="dashTerm" value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">Whole session</option>
              {data?.terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {!user.lga && (
            <label className="field">
              Area
              <select id="dashLga" value={lga} onChange={(e) => { setLga(e.target.value); setSort({ col: -1, desc: false }); }}>
                <option value="">Whole state, by LGA</option>
                {lgas.map((l) => <option key={l} value={l}>{l} LGA, by school</option>)}
              </select>
            </label>
          )}
        </div>
      </div>
      <ErrorAlert error={error} />

      <div className="grid g4">
        <Kpi label="Schools" value={fmt(f?.schools)} note={f ? `${fmt(f.classes)} classes · average ${fmt(f.averageClassSize)} per class` : undefined} />
        <Kpi label="Students enrolled" value={fmt(f?.students)} note={f ? `Primary ${fmt(f.byStage.primary)} · JSS ${fmt(f.byStage.jss)} · SSS ${fmt(f.byStage.sss)}` : undefined} />
        <Kpi label="Gender parity index" value={fmt(f?.gpi)} note={f ? `${fmt(f.girls)} girls, ${fmt(f.boys)} boys` : undefined} />
        <Kpi label="Pupils per teacher" value={fmt(f?.pupilsPerTeacher)} note={f ? `${fmt(f.teachers)} teachers in the registry` : undefined} />
      </div>
      <div className="grid g4 mt">
        <Kpi label="Qualified teachers" value={fmt(f?.qualifiedTeachers, '%')} note={f ? `TRCN-registered ${fmt(f.trcnTeachers, '%')}` : undefined} />
        <Kpi label="Attendance rate" value={fmt(f?.attendanceRate, '%')} note={f ? `${fmt(f.registerMarks)} register marks` : undefined} />
        <Kpi label="Pass rate" value={fmt(f?.passRate, '%')} note={f && f.resultEntries ? `Girls ${fmt(f.passRateGirls, '%')} · boys ${fmt(f.passRateBoys, '%')} · credit ${fmt(f.creditRate, '%')}` : 'No released results yet'} />
        <Kpi label="Schools inspected" value={fmt(f?.inspected)} note={f ? `${fmt(f.condition.critical)} critical, ${fmt(f.condition.poor)} poor at the latest visit` : undefined} />
      </div>

      <div className="grid g2 mt">
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>{m.label} by {area}</h2>
            <select className="inline" aria-label="Measure" value={metric} onChange={(e) => setMetric(e.target.value)}>
              {METRICS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </div>
          {data && <BarList rows={data.breakdown} metric={m} />}
        </div>
        <div className="card">
          <h2>Attendance rate by month</h2>
          {trends && <MonthColumns months={trends.attendanceByMonth} />}
          {trends && trends.bySession.length > 1 && (
            <>
              <h2 className="mt">Trend by session</h2>
              <div className="tbl">
                <table>
                  <thead><tr><th>Session</th><th className="num">Students</th><th className="num">Girls %</th><th className="num">Pupils / teacher</th><th className="num">Attendance %</th><th className="num">Pass %</th></tr></thead>
                  <tbody>
                    {trends.bySession.map((s) => (
                      <tr key={s.session}><td>{s.session}</td><td className="num">{fmt(s.students)}</td><td className="num">{fmt(s.girlsShare)}</td><td className="num">{fmt(s.pupilsPerTeacher)}</td><td className="num">{fmt(s.attendanceRate)}</td><td className="num">{fmt(s.passRate)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card mt">
        <h2>{data?.scope.level === 'lga' ? `Schools in ${data.scope.label}` : 'LGA comparison'}</h2>
        <p className="small muted" style={{ marginBottom: 8 }}>Click a column heading to sort. Teachers are counted as posted on {data?.staffAsOf ?? '…'}.</p>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>{data?.scope.level === 'lga' ? 'School' : 'LGA'}</th>
                {TABLE.map((c, i) => (
                  <th key={c.label} className="num sortable" aria-sort={sort.col === i ? (sort.desc ? 'descending' : 'ascending') : 'none'} onClick={() => setSort({ col: i, desc: sort.col === i ? !sort.desc : true })}>
                    {c.label}{sort.col === i ? (sort.desc ? ' ↓' : ' ↑') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {data?.scope.level === 'state' && !user.lga ? <button className="linklike" onClick={() => setLga(r.name)}>{r.name}</button> : <b>{r.name}</b>}
                    {r.code && <div className="small muted mono">{r.code}</div>}
                  </td>
                  {TABLE.map((c) => <td key={c.label} className="num">{fmt(c.get(r.figures))}</td>)}
                </tr>
              ))}
              {f && (
                <tr style={{ fontWeight: 700 }}>
                  <td>Total</td>
                  {TABLE.map((c) => <td key={c.label} className="num">{fmt(c.get(f))}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Definitions />
    </>
  );
}

function Definitions() {
  const [defs, setDefs] = useState<{ key: string; name: string; meaning: string }[]>([]);
  useEffect(() => {
    api<typeof defs>('/indicators/definitions').then(setDefs).catch(() => {});
  }, []);
  return (
    <details className="card mt">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>What the indicators mean</summary>
      <dl className="kv mt">
        {defs.map((d) => <div key={d.key} style={{ display: 'contents' }}><dt>{d.name}</dt><dd>{d.meaning}</dd></div>)}
      </dl>
    </details>
  );
}
