import { useEffect, useState } from 'react';
import { api } from '../api';
import type { StudentAttendance } from '../types';
import { ATTENDANCE, AttendancePill, formatDay, pct } from './ui';

/** A student's attendance this session: rate, totals and the days they were not present. */
export function AttendanceCard({ studentId }: { studentId: string }) {
  const [a, setA] = useState<StudentAttendance | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    api<StudentAttendance>(`/attendance/students/${studentId}`).then(setA).catch(() => setA(null));
  }, [studentId]);
  if (!a) return null;
  const marked = a.counts.PRESENT + a.counts.LATE + a.counts.ABSENT + a.counts.EXCUSED;
  const notPresent = a.records.filter((r) => r.status !== 'PRESENT');
  const shown = all ? notPresent : notPresent.slice(0, 8);
  return (
    <div className="card">
      <h2>Attendance this session</h2>
      {!marked ? (
        <p className="muted">No registers have been taken for this student yet.</p>
      ) : (
        <>
          <div className="row" style={{ gap: 18, alignItems: 'baseline' }}>
            <span className="kpi"><span className="v" style={{ display: 'inline' }}>{pct(a.rate)}</span></span>
            <span className="small muted">in school on {a.counts.PRESENT + a.counts.LATE} of {marked} school days since {formatDay(a.from)}</span>
          </div>
          <p className="row mt" style={{ gap: 6 }}>
            {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((s) => (
              <span key={s} className={`pill ${ATTENDANCE[s].pill}`}>{ATTENDANCE[s].label} {a.counts[s]}</span>
            ))}
          </p>
          {notPresent.length > 0 && (
            <>
              <h3 className="mt">Days not present</h3>
              <table className="mt"><tbody>
                {shown.map((r) => (
                  <tr key={r.date}>
                    <td className="small">{formatDay(r.date)}</td>
                    <td><AttendancePill status={r.status} /></td>
                    <td className="small muted">{r.note ?? ''}</td>
                  </tr>
                ))}
              </tbody></table>
              {notPresent.length > shown.length && <button className="btn sm mt" onClick={() => setAll(true)}>Show all {notPresent.length}</button>}
            </>
          )}
        </>
      )}
    </div>
  );
}
