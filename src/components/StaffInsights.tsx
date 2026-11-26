import { useEffect, useState } from 'react';
import { api } from '../api';

interface Insights {
  date: string;
  attendance: { staff: number; marked: number; present: number; late: number; absent: number; leave: number; presentRate: number | null; schools: number; schoolsMarked: number; byLga: { lga: string; staff: number; marked: number; presentRate: number | null; schoolsMarked: number; schools: number }[] };
  training: { targetHours: number; session: string | null; teachers: number; metTarget: number; averageHours: number | null; buckets: { label: string; count: number }[] };
  shortages: { pupilsPerTeacher: number; subjects: { code: string; name: string; pupils: number; teachers: number; needed: number; shortfall: number; pupilsPerTeacher: number | null; classesWithoutTeacher: number }[] };
}

const pc = (v: number | null) => (v === null ? '–' : `${v}%`);

/** Staff in today, training hours against the target, and subjects short of teachers. */
export function StaffInsights() {
  const [d, setD] = useState<Insights | null>(null);
  useEffect(() => {
    api<Insights>('/staff/insights').then(setD).catch(() => setD(null));
  }, []);
  if (!d) return null;
  const a = d.attendance, t = d.training;
  const short = d.shortages.subjects.filter((s) => s.shortfall > 0 || s.classesWithoutTeacher > 0);
  const maxBucket = Math.max(1, ...t.buckets.map((b) => b.count));
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <div className="card kpi"><div className="k">Present today</div><div className="v">{pc(a.presentRate)}</div><div className="small muted">{a.present + a.late} of {a.marked} marked ({a.late} late) · {a.schoolsMarked} of {a.schools} school{a.schools === 1 ? '' : 's'} took the register</div></div>
        <div className="card kpi"><div className="k">Absent or on leave today</div><div className="v">{a.absent + a.leave}</div><div className="small muted">{a.absent} absent · {a.leave} on leave</div></div>
        <div className="card kpi"><div className="k">Met the {t.targetHours}-hour training target</div><div className="v">{t.teachers ? `${t.metTarget} of ${t.teachers}` : '–'}</div><div className="small muted">Average {t.averageHours ?? 0} hours{t.session ? ` in ${t.session}` : ''}</div></div>
        <div className="card kpi"><div className="k">Subjects short of teachers</div><div className="v">{d.shortages.subjects.filter((s) => s.shortfall > 0).length}</div><div className="small muted">At one teacher per {d.shortages.pupilsPerTeacher} pupils</div></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <h2>Training hours this session</h2>
          <div className="barlist">
            {t.buckets.map((b) => (
              <div className="bl-row" key={b.label} title={`${b.label}: ${b.count} teachers`}>
                <span className="bl-name">{b.label}</span>
                <span className="bl-track"><span className="bl-bar" style={{ width: `${(b.count / maxBucket) * 100}%`, display: 'block' }} /></span>
                <span className="bl-val">{b.count}</span>
              </div>
            ))}
          </div>
          <p className="small muted mt">Teachers by hours of training recorded this session. Add training on each person's record.</p>
        </div>
        <div className="card">
          <h2>Subject shortages</h2>
          {!short.length && <p className="muted small">No subject is short of teachers at one per {d.shortages.pupilsPerTeacher} pupils.</p>}
          {!!short.length && (
            <div className="tbl">
              <table>
                <thead><tr><th>Subject</th><th className="num">Pupils</th><th className="num">Qualified teachers</th><th className="num">Needed</th><th className="num">Short</th></tr></thead>
                <tbody>
                  {short.slice(0, 12).map((s) => (
                    <tr key={s.code}>
                      <td>{s.name}{s.classesWithoutTeacher > 0 && <div className="small muted">{s.classesWithoutTeacher} class{s.classesWithoutTeacher === 1 ? '' : 'es'} with no teacher assigned</div>}</td>
                      <td className="num">{s.pupils.toLocaleString('en-NG')}</td>
                      <td className="num">{s.teachers}</td>
                      <td className="num">{s.needed}</td>
                      <td className={`num${s.shortfall ? ' lagging' : ''}`}>{s.shortfall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="small muted mt">Qualified teachers are staff whose record lists the subject.</p>
        </div>
      </div>
      {a.byLga.length > 1 && (
        <details className="card" style={{ marginBottom: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Staff attendance today by LGA</summary>
          <div className="tbl mt">
            <table>
              <thead><tr><th>LGA</th><th className="num">Staff</th><th className="num">Schools that took the register</th><th className="num">Present</th></tr></thead>
              <tbody>{a.byLga.map((l) => <tr key={l.lga}><td>{l.lga}</td><td className="num">{l.staff}</td><td className="num">{l.schoolsMarked} of {l.schools}</td><td className="num">{pc(l.presentRate)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}
