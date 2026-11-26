import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert } from '../components/ui';

interface Population {
  year: number;
  years: number[];
  stages: { key: string; name: string; ages: string }[];
  rows: { lga: string; stage: string; male: number; female: number; source: string | null }[];
}
type Grid = Record<string, Record<string, { male: string; female: string }>>;

/** School-age population by LGA, used for enrolment ratios and out-of-school estimates. */
export function PopulationPage() {
  const { user } = useAuth();
  const admin = user?.role === 'MINISTRY_ADMIN';
  const [year, setYear] = useState<number | null>(null);
  const [data, setData] = useState<Population | null>(null);
  const [lgas, setLgas] = useState<string[]>([]);
  const [grid, setGrid] = useState<Grid>({});
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<string[]>('/schools/lgas').then((l) => setLgas(user?.lga ? [user.lga] : l)).catch(() => {});
  }, [user?.lga]);
  useEffect(() => {
    api<Population>(`/indicators/population${year ? `?year=${year}` : ''}`)
      .then((p) => {
        setData(p);
        if (!year) setYear(p.year);
        const g: Grid = {};
        for (const r of p.rows) (g[r.lga] ??= {})[r.stage] = { male: String(r.male), female: String(r.female) };
        setGrid(g);
        setSource(p.rows.find((r) => r.source)?.source ?? '');
      })
      .catch((e) => setError(e.message));
  }, [year]);

  const cell = (lga: string, stage: string) => grid[lga]?.[stage] ?? { male: '', female: '' };
  const set = (lga: string, stage: string, k: 'male' | 'female', v: string) => setGrid((g) => ({ ...g, [lga]: { ...g[lga], [stage]: { ...cell(lga, stage), [k]: v.replace(/\D/g, '') } } }));

  async function save() {
    if (!data || !year) return;
    setError(null);
    setNote(null);
    const rows = lgas.flatMap((lga) => data.stages.map((s) => ({ lga, stage: s.key, ...cell(lga, s.key) })))
      .filter((r) => r.male !== '' || r.female !== '')
      .map((r) => ({ lga: r.lga, stage: r.stage, male: Number(r.male || 0), female: Number(r.female || 0), ...(source ? { source } : {}) }));
    setBusy(true);
    try {
      await api('/indicators/population', { method: 'PUT', json: { year, rows } });
      setNote(`Saved ${rows.length} figures for ${year}. The dashboard's enrolment ratios now use them.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the estimates.');
    } finally {
      setBusy(false);
    }
  }

  const thisYear = new Date().getFullYear();
  const choices = [...new Set([...(data?.years ?? []), thisYear - 1, thisYear, thisYear + 1])].sort((a, b) => b - a);
  return (
    <>
      <div className="head">
        <div>
          <h1>School-age population</h1>
          <p>Estimates of children of school age in each LGA, for gross and net enrolment ratios and out-of-school figures. Use the National Population Commission's projections or the state's own figures. <Link to="/dashboard">Back to the dashboard</Link></p>
        </div>
        <label className="field">
          Year
          <select id="popYear" value={year ?? ''} onChange={(e) => setYear(Number(e.target.value))}>
            {choices.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>
      <ErrorAlert error={error} />
      {note && <div className="alert ok" style={{ marginBottom: 12 }}>{note}</div>}
      <div className="card">
        {admin && (
          <label className="field" style={{ maxWidth: 420, marginBottom: 12 }}>
            Source of the figures
            <input id="popSource" maxLength={120} placeholder="e.g. NPC 2006 census projected to 2026" value={source} onChange={(e) => setSource(e.target.value)} />
          </label>
        )}
        <div className="tbl">
          <table>
            <thead>
              <tr><th rowSpan={2}>LGA</th>{data?.stages.map((s) => <th key={s.key} colSpan={2} style={{ textAlign: 'center' }}>{s.name} (ages {s.ages})</th>)}</tr>
              <tr>{data?.stages.map((s) => <Fragment key={s.key}><th className="num">Boys</th><th className="num">Girls</th></Fragment>)}</tr>
            </thead>
            <tbody>
              {lgas.map((lga) => (
                <tr key={lga}>
                  <td>{lga}</td>
                  {data?.stages.map((s) => (['male', 'female'] as const).map((k) => (
                    <td key={s.key + k} className="num">
                      {admin ? <input className="inline" style={{ width: 90, textAlign: 'right' }} inputMode="numeric" aria-label={`${lga} ${s.name} ${k === 'male' ? 'boys' : 'girls'}`} value={cell(lga, s.key)[k]} onChange={(e) => set(lga, s.key, k, e.target.value)} /> : cell(lga, s.key)[k] ? Number(cell(lga, s.key)[k]).toLocaleString('en-NG') : '–'}
                    </td>
                  )))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {admin && (
          <div className="row mt" style={{ justifyContent: 'flex-end' }}>
            <button className="btn pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : `Save ${year} estimates`}</button>
          </div>
        )}
      </div>
    </>
  );
}
