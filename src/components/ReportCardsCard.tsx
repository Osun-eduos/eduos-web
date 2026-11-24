import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { ReportCardTerm } from '../types';

/** Links to a student's report cards. Unreleased ones appear only for the school and class teacher, as previews. */
export function ReportCardsCard({ studentId }: { studentId: string }) {
  const [terms, setTerms] = useState<ReportCardTerm[] | null>(null);
  useEffect(() => {
    api<ReportCardTerm[]>(`/report-cards/${studentId}/terms`).then(setTerms).catch(() => setTerms([]));
  }, [studentId]);
  if (!terms) return null;
  return (
    <div className="card">
      <h2>Report cards</h2>
      {terms.length ? (
        <table><tbody>
          {terms.map((t) => (
            <tr key={t.termId}>
              <td><b>{t.name}</b>, {t.session}<br /><span className="small muted">{t.className}</span></td>
              <td>{t.released ? <span className="pill p-good">Released</span> : <span className="pill p-warn">Preview</span>}</td>
              <td style={{ textAlign: 'right' }}><Link className="btn sm" to={`/report-card/${studentId}?term=${t.termId}`}>Open</Link></td>
            </tr>
          ))}
        </tbody></table>
      ) : (
        <p className="muted">No report cards have been released yet.</p>
      )}
    </div>
  );
}
