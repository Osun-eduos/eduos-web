import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorAlert } from '../components/ui';

interface Analysis {
  class: { id: string; name: string; level: string; school: { id: string; name: string } };
  term: { id: string; name: string; session: string; showPositions: boolean };
  live: boolean;
  scale: { min: number; grade: string; remark: string }[];
  summary: { students: number; average: number | null; passRate: number | null; top: { id: string; fullName: string; average: number } | null; weakestSubject: { code: string; name: string; mean: number } | null };
  subjects: { code: string; name: string; teacher: string | null; status: string | null; scored: number; students: number; mean: number | null; highest: number | null; lowest: number | null; passRate: number | null; distribution: Record<string, number> }[];
  ranking: { id: string; fullName: string; average: number | null; position: string | null; grade: string | null }[];
  arms: { subjects: { code: string; name: string }[]; rows: { id: string; name: string; means: Record<string, number | null>; average: number | null }[] };
}

const f1 = (v: number | null | undefined) => (v === null || v === undefined ? '–' : String(v));

/** A grade's shade: the top grade is darkest, the lowest lightest, so the bar reads from best to worst. */
const shade = (i: number, n: number) => `color-mix(in srgb, var(--series-1) ${Math.round(100 - (i / Math.max(1, n - 1)) * 78)}%, var(--surface))`;

function Distribution({ dist, scale }: { dist: Record<string, number>; scale: Analysis['scale'] }) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (!total) return <span className="muted small">No scores yet</span>;
  return (
    <span className="dist" role="img" aria-label={scale.map((b) => `${b.grade}: ${dist[b.grade] ?? 0}`).join(', ')}>
      {scale.map((b, i) => (dist[b.grade] ? <span key={b.grade} title={`${b.grade} · ${dist[b.grade]}`} style={{ width: `${(dist[b.grade] / total) * 100}%`, background: shade(i, scale.length), color: i < scale.length / 2 ? '#fff' : 'var(--ink)' }}>{dist[b.grade]}</span> : null))}
    </span>
  );
}

/** How a class did this term, subject by subject, with the other arms of its level alongside. */
export function AnalysisPage() {
  const { classId } = useParams();
  const [search] = useSearchParams();
  const term = search.get('term');
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    api<Analysis>(`/results/analysis?classId=${classId}${term ? `&termId=${term}` : ''}`).then(setData).catch((e) => setError(e.message));
  }, [classId, term]);

  if (error) return <ErrorAlert error={error} />;
  if (!data) return <p className="muted">Loading…</p>;
  const s = data.summary;
  const best = (code: string) => Math.max(...data.arms.rows.map((r) => r.means[code] ?? -1));

  return (
    <>
      <div className="head">
        <div>
          <h1>{data.class.name} · class and subject analysis</h1>
          <p>{data.class.school.name} · {data.term.name}, {data.term.session}. {data.live ? 'Figures update as scores are entered, before approval.' : 'Released results.'}</p>
        </div>
        <Link className="btn" to={`/results/${data.class.id}${term ? `?term=${term}` : ''}`}>Broadsheet</Link>
      </div>
      <div className="grid g4">
        <div className="card kpi"><div className="k">Class average</div><div className="v">{f1(s.average)}</div><div className="small muted">{s.students} students</div></div>
        <div className="card kpi"><div className="k">Overall pass rate</div><div className="v">{s.passRate === null ? '–' : `${s.passRate}%`}</div><div className="small muted">term average 40 or more</div></div>
        <div className="card kpi"><div className="k">Top student</div><div className="v" style={{ fontSize: '1.1rem' }}>{s.top?.fullName ?? '–'}</div><div className="small muted">{s.top ? `${s.top.average} average` : ' '}</div></div>
        <div className="card kpi"><div className="k">Weakest subject</div><div className="v" style={{ fontSize: '1.1rem' }}>{s.weakestSubject?.name ?? '–'}</div><div className="small muted">{s.weakestSubject ? `mean ${s.weakestSubject.mean}` : ' '}</div></div>
      </div>

      <div className="card mt">
        <h2>{data.class.name} by subject</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Subject</th><th className="num">Scored</th><th className="num">Mean</th><th className="num">Highest</th><th className="num">Lowest</th><th className="num">Pass rate</th><th style={{ minWidth: 220 }}>Grade distribution</th></tr></thead>
            <tbody>
              {data.subjects.map((x) => (
                <tr key={x.code}>
                  <td><b>{x.name}</b>{x.teacher && <div className="small muted">{x.teacher}</div>}</td>
                  <td className="num">{x.scored}/{x.students}</td>
                  <td className="num">{f1(x.mean)}</td>
                  <td className="num">{f1(x.highest)}</td>
                  <td className="num">{f1(x.lowest)}</td>
                  <td className="num">{x.passRate === null ? '–' : `${x.passRate}%`}</td>
                  <td><Distribution dist={x.distribution} scale={data.scale} /></td>
                </tr>
              ))}
              {!data.subjects.length && <tr><td colSpan={7} className="muted">No subjects yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="small muted mt">
          Grades, darkest to lightest: {data.scale.map((b) => `${b.grade} ${b.remark.toLowerCase()}`).join(' · ')}
        </p>
      </div>

      <div className="grid g2 mt">
        {data.arms.rows.length > 1 && (
          <div className="card">
            <h2>{data.arms.rows.length} arms compared</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>Mean score by subject. The best arm in each subject is in bold.</p>
            <div className="tbl">
              <table>
                <thead><tr><th>Subject</th>{data.arms.rows.map((r) => <th key={r.id} className="num">{r.id === data.class.id ? <b>{r.name}</b> : <Link to={`/results/${r.id}/analysis${term ? `?term=${term}` : ''}`}>{r.name}</Link>}</th>)}</tr></thead>
                <tbody>
                  {data.arms.subjects.map((sub) => (
                    <tr key={sub.code}>
                      <td>{sub.name}</td>
                      {data.arms.rows.map((r) => {
                        const v = r.means[sub.code];
                        return <td key={r.id} className="num" style={v !== null && v !== undefined && v === best(sub.code) ? { fontWeight: 700, color: 'var(--good)' } : undefined}>{f1(v)}</td>;
                      })}
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}><td>Class average</td>{data.arms.rows.map((r) => <td key={r.id} className="num">{f1(r.average)}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="card">
          <h2>Class ranking</h2>
          <div className="tbl">
            <table>
              <thead><tr>{data.term.showPositions && <th>Pos.</th>}<th>Student</th><th className="num">Average</th><th>Grade</th></tr></thead>
              <tbody>
                {data.ranking.map((r) => (
                  <tr key={r.id}>
                    {data.term.showPositions && <td>{r.position}</td>}
                    <td><Link to={`/report-card/${r.id}?term=${data.term.id}`}>{r.fullName}</Link></td>
                    <td className="num">{f1(r.average)}</td>
                    <td>{r.grade}</td>
                  </tr>
                ))}
                {!data.ranking.length && <tr><td colSpan={4} className="muted">No scores yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
