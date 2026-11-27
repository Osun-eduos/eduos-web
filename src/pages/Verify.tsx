import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { ErrorAlert, formatDate } from '../components/ui';

interface Verified {
  code: string;
  student: { fullName: string; learnerId: string; admissionNumber: string | null };
  school: { name: string; code: string; lga: string };
  class: string;
  term: { name: string; session: string };
  releasedAt: string;
  average: number | null;
  overallGrade: string | null;
  position: string | null;
  subjects: { name: string; total: number | null; grade: string | null }[];
}

/** Public page: anyone holding a printed report card can check its code against EduOS. No sign-in. */
export function Verify() {
  const { code: param } = useParams();
  const nav = useNavigate();
  const [code, setCode] = useState(param ?? '');
  const [data, setData] = useState<Verified | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!param) return;
    setBusy(true);
    setError(null);
    setData(null);
    api<Verified>(`/verify/${encodeURIComponent(param)}`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not check the code. Try again.'))
      .finally(() => setBusy(false));
  }, [param]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) nav(`/verify/${c}`);
  }

  return (
    <div className="verify">
      <header className="verify-top">
        <Link to="/" className="brand" aria-label="Osun EduOS home"><b>Osun EduOS</b><span>Ministry of Education, State of Osun</span></Link>
        <Link to="/" className="auth-back">← Back to home</Link>
      </header>
      <h1>Check a report card</h1>
      <p className="muted">Enter the verification code printed at the bottom of a report card to confirm it matches the results the school released in EduOS.</p>
      <form className="row mt" onSubmit={submit}>
        <input className="inline" style={{ flex: 1, fontSize: '1.05rem', padding: '8px 10px' }} id="verifyCode" aria-label="Verification code" placeholder="OSE-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn pri" disabled={busy}>{busy ? 'Checking…' : 'Check'}</button>
      </form>
      <div className="mt"><ErrorAlert error={error} /></div>
      {data && (
        <div className="card mt">
          <div className="alert ok" style={{ marginBottom: 12 }}>This report card matches the results released on {formatDate(data.releasedAt)}.</div>
          <dl className="kv">
            <dt>Student</dt><dd><b>{data.student.fullName}</b> · <span className="mono">{data.student.learnerId}</span></dd>
            <dt>School</dt><dd>{data.school.name} ({data.school.code}), {data.school.lga} LGA</dd>
            <dt>Class and term</dt><dd>{data.class} · {data.term.name}, {data.term.session}</dd>
            <dt>Average</dt><dd><b>{data.average ?? '–'}</b>{data.overallGrade ? ` · grade ${data.overallGrade}` : ''}{data.position ? ` · ${data.position}` : ''}</dd>
          </dl>
          <div className="tbl mt">
            <table>
              <thead><tr><th>Subject</th><th className="num">Total</th><th>Grade</th></tr></thead>
              <tbody>{data.subjects.map((x) => <tr key={x.name}><td>{x.name}</td><td className="num">{x.total ?? '–'}</td><td>{x.grade ?? '–'}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="small muted mt">If any figure on the printed card differs from these, the card has been altered. Contact the school or the Ministry of Education.</p>
        </div>
      )}
    </div>
  );
}
