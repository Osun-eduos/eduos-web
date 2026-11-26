import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { ErrorAlert } from '../components/ui';
import { levelLabel } from '../roles';

interface Arm { id: string; name: string; capacity: number; students: number; girls: number; boys: number; roster: { id: string; fullName: string; sex: 'F' | 'M' }[] }
interface Waiting { id: string; fullName: string; sex: 'F' | 'M'; level: string | null; reason: string | null }
interface Allocation { session: string; levels: { level: string; arms: Arm[]; unplaced: Waiting[] }[]; unknown: Waiting[] }

/** New and returning students waiting for a class this session: place them one by one, or fill the arms evenly. */
export function Allocation() {
  const [data, setData] = useState<Allocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Allocation>('/classes/allocation').then(setData).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function auto(level: string) {
    setError(null);
    setNote(null);
    setBusy(level);
    try {
      const r = await api<{ placed: number; full: number }>('/classes/auto-allocate', { method: 'POST', json: { level } });
      setNote(`${r.placed} student${r.placed === 1 ? '' : 's'} placed in ${levelLabel(level)}.${r.full ? ` ${r.full} could not be placed because every arm is full: raise a class's capacity or add an arm.` : ''}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    } finally {
      setBusy(null);
    }
  }

  async function place(studentId: string, classArmId: string, from?: string) {
    setError(null);
    setNote(null);
    try {
      await api(`/students/${studentId}/placement`, { method: 'POST', json: { classArmId } });
      if (from) setNote(`Moved out of ${from}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Class allocation{data ? ` · ${data.session}` : ''}</h1>
          <p>Place students who have no class this session. Auto-allocation fills the smallest arm first and keeps girls and boys balanced. Returning students go up one class; new students join the class they were enrolled for.</p>
        </div>
        <Link className="btn" to="/classes">Manage classes</Link>
      </div>
      <ErrorAlert error={error} />
      {note && <div className="alert ok" style={{ marginBottom: 12 }}>{note}</div>}
      {data && !data.levels.length && !data.unknown.length && <div className="card muted">No classes yet. Add classes first.</div>}
      {data?.levels.map((l) => (
        <div className="card mt" key={l.level}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>{levelLabel(l.level)}</h2>
            {l.unplaced.length > 0 && <button className="btn pri" disabled={!!busy || !l.arms.length} onClick={() => auto(l.level)}>{busy === l.level ? 'Allocating…' : `Auto-allocate ${l.unplaced.length} student${l.unplaced.length === 1 ? '' : 's'}`}</button>}
          </div>
          <div className="grid g4">
            {l.arms.map((a) => (
              <div className="card kpi" key={a.id}>
                <div className="k">{a.name}</div>
                <div className="v">{a.students}/{a.capacity}</div>
                <div className="small muted">{a.girls} girl{a.girls === 1 ? '' : 's'} · {a.boys} boy{a.boys === 1 ? '' : 's'}</div>
                <div className="meter mt" aria-hidden><span style={{ width: `${Math.min(100, (a.students / a.capacity) * 100)}%` }} /></div>
                {l.arms.length > 1 && a.roster.length > 0 && (
                  <details className="mt">
                    <summary className="small" style={{ cursor: 'pointer' }}>Students and moves</summary>
                    <ul className="items">
                      {a.roster.map((st) => (
                        <li key={st.id} style={{ gridTemplateColumns: '1fr auto', alignItems: 'center', display: 'grid', gap: 6 }}>
                          <span className="small"><Link to={`/students/${st.id}`}>{st.fullName}</Link> <span className="muted">{st.sex}</span></span>
                          <select className="inline" aria-label={`Move ${st.fullName}`} value="" onChange={(e) => e.target.value && place(st.id, e.target.value, a.name)}>
                            <option value="">Move to…</option>
                            {l.arms.filter((o) => o.id !== a.id).map((o) => <option key={o.id} value={o.id} disabled={o.students >= o.capacity}>{o.name}{o.students >= o.capacity ? ' (full)' : ''}</option>)}
                          </select>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
            {!l.arms.length && <p className="muted small">No {levelLabel(l.level)} classes yet. <Link to="/classes">Add one</Link>.</p>}
          </div>
          {l.unplaced.length > 0 && (
            <div className="tbl mt">
              <table>
                <thead><tr><th>Not yet allocated</th><th>Sex</th><th>Choose a class</th></tr></thead>
                <tbody>
                  {l.unplaced.map((s) => (
                    <tr key={s.id}>
                      <td><Link to={`/students/${s.id}`}>{s.fullName}</Link></td>
                      <td>{s.sex}</td>
                      <td>
                        <select className="inline" aria-label={`Class for ${s.fullName}`} value="" onChange={(e) => e.target.value && place(s.id, e.target.value)}>
                          <option value="">Allocate…</option>
                          {l.arms.map((a) => <option key={a.id} value={a.id} disabled={a.students >= a.capacity}>{a.name} · {a.students}/{a.capacity}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
      {!!data?.unknown.length && (
        <div className="card mt">
          <h2>Needs a class chosen by hand</h2>
          <div className="tbl">
            <table>
              <thead><tr><th>Student</th><th>Why</th></tr></thead>
              <tbody>
                {data.unknown.map((s) => <tr key={s.id}><td><Link to={`/students/${s.id}`}>{s.fullName}</Link></td><td className="small muted">{s.reason}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
