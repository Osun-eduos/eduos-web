import { ChangeEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatPhone } from '../components/ui';
import { buildTemplateCsv, readRows, type ImportRow } from '../spreadsheet';

interface RowReport {
  row: number;
  ok: boolean;
  errors: string[];
  warnings: string[];
  student: { fullName: string; sex: 'F' | 'M'; dateOfBirth: string; className: string | null } | null;
  parent: { fullName: string; relationship: string; account: 'new' | 'existing' } | null;
}
interface ImportResult {
  dryRun: boolean;
  total: number;
  ready: number;
  withProblems: number;
  imported: number;
  rows: RowReport[];
  parents: { fullName: string; phone: string | null; email: string | null; tempPassword: string; children: string[] }[];
}

const MAX_ROWS = 500;

function downloadTemplate() {
  const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'osun-eduos-students-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Enrol many students at once from an Excel or CSV file: check first, then import the rows that are ready. */
export function ImportStudents() {
  const { user } = useAuth();
  const [file, setFile] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [check, setCheck] = useState<ImportResult | null>(null);
  const [done, setDone] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);

  async function send(dryRun: boolean, data = rows) {
    return api<ImportResult>('/students/import', { method: 'POST', json: { rows: data, dryRun } });
  }

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError(null);
    setCheck(null);
    setDone(null);
    setRows([]);
    setFile(f.name);
    setBusy(true);
    try {
      const parsed = await readRows(f);
      if (!parsed.rows.length) throw new Error('The file has no students in it. Put the column names in the first row and one student per row below.');
      if (parsed.rows.length > MAX_ROWS) throw new Error(`The file has ${parsed.rows.length} students. Import at most ${MAX_ROWS} at a time: split it into smaller files, for example one per class.`);
      if (!parsed.recognised.includes('surname') || !parsed.recognised.includes('firstName')) {
        throw new Error('Could not find the Surname and First name columns. Use the template, or name the columns as it does.');
      }
      setRows(parsed.rows);
      setUnknown(parsed.unknown);
      setCheck(await send(true, parsed.rows));
    } catch (err) {
      setFile(null);
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setError(null);
    setBusy(true);
    try {
      setDone(await send(false));
      setCheck(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The import did not finish. Nothing was saved. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (user?.role !== 'SCHOOL_ADMIN') return null;
  const shown = check ? check.rows.filter((r) => !onlyProblems || !r.ok || r.warnings.length) : [];

  return (
    <>
      <p className="small noprint"><Link to="/students">← Students</Link></p>
      <div className="head noprint">
        <div>
          <h1>Import students</h1>
          <p>Enrol a whole class or school at once from an Excel (.xlsx) or CSV file. Nothing is saved until you check the rows and press Import.</p>
        </div>
      </div>

      {!done && (
        <div className="card noprint" style={{ marginBottom: 14 }}>
          <h2>1. Prepare the file</h2>
          <p className="small" style={{ marginBottom: 10 }}>
            One student per row, with the column names in the first row. Required: <b>Surname</b>, <b>First name</b>, <b>Sex</b> (F or M) and <b>Date of birth</b> (day first, e.g. 03/02/2014).
            Optional: Middle name, Class (as named on your Classes page, e.g. JSS 1A), Admission date, State of origin, LGA of origin, Home address, and the parent's name, phone, email and relationship.
            A parent who already has an account at your school is linked by phone or email. Brothers and sisters with the same parent phone share one new parent account.
          </p>
          <div className="row">
            <button className="btn" type="button" onClick={downloadTemplate}>Download the template</button>
            <span className="small muted">Up to {MAX_ROWS} students per file. Create the classes first if you want students placed in them.</span>
          </div>
          <h2 className="mt">2. Choose the file</h2>
          <label className="btn pri" style={{ display: 'inline-block', cursor: busy ? 'wait' : 'pointer' }}>
            {busy && !check ? 'Reading…' : file ? 'Choose another file' : 'Choose a file'}
            <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={choose} disabled={busy} style={{ display: 'none' }} />
          </label>
          {file && <span className="small" style={{ marginLeft: 10 }}>{file}</span>}
        </div>
      )}

      <ErrorAlert error={error} />

      {check && (
        <div className="card noprint">
          <div className="row between">
            <h2>3. Check and import</h2>
            <label className="small row" style={{ gap: 6 }}>
              <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} /> Show only rows with problems or notes
            </label>
          </div>
          <div className={`alert ${check.withProblems ? 'info' : 'ok'}`} style={{ margin: '10px 0' }}>
            {check.ready} of {check.total} student{check.total === 1 ? '' : 's'} ready to import.
            {check.withProblems > 0 && ` ${check.withProblems} row${check.withProblems === 1 ? ' has' : 's have'} problems and will be skipped. Fix them in the file and choose it again, or import the ready rows now and enrol the rest later.`}
          </div>
          {unknown.length > 0 && <p className="small muted" style={{ marginBottom: 10 }}>Columns ignored: {unknown.join(', ')}.</p>}
          <div className="tbl">
            <table>
              <thead><tr><th>Row</th><th>Student</th><th>Class</th><th>Parent</th><th>Check</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.row}>
                    <td className="mono small">{r.row}</td>
                    <td>{r.student ? <><b>{r.student.fullName}</b><br /><span className="small muted">{r.student.sex === 'F' ? 'Female' : 'Male'} · born {r.student.dateOfBirth}</span></> : <span className="muted">{[rows[r.row - 2]?.surname, rows[r.row - 2]?.firstName].filter(Boolean).join(' ') || '–'}</span>}</td>
                    <td>{r.student?.className ?? (r.ok ? <span className="muted small">No class</span> : '')}</td>
                    <td className="small">{r.parent ? <>{r.parent.fullName} ({r.parent.relationship})<br /><span className="muted">{r.parent.account === 'new' ? 'New account' : 'Existing account'}</span></> : ''}</td>
                    <td className="small">
                      {r.ok ? <span className="pill p-good">Ready</span> : <span className="pill p-bad">Skipped</span>}
                      {r.errors.map((m) => <div key={m} style={{ color: 'var(--bad, #b42318)' }}>{m}</div>)}
                      {r.warnings.map((m) => <div key={m} className="muted">{m}</div>)}
                    </td>
                  </tr>
                ))}
                {!shown.length && <tr><td colSpan={5} className="muted">No rows with problems.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="row mt">
            <button className="btn pri" disabled={busy || !check.ready} onClick={runImport}>
              {busy ? 'Importing…' : `Import ${check.ready} student${check.ready === 1 ? '' : 's'}`}
            </button>
            <button className="btn" disabled={busy} onClick={() => { setCheck(null); setFile(null); setRows([]); }}>Cancel</button>
          </div>
        </div>
      )}

      {done && (
        <>
          <div className="alert ok noprint" style={{ marginBottom: 14 }}>
            Imported {done.imported} student{done.imported === 1 ? '' : 's'}.{done.withProblems > 0 && ` ${done.withProblems} row${done.withProblems === 1 ? ' was' : 's were'} skipped.`}
            {' '}<Link to="/students">See the students</Link> · <button className="linklike" onClick={() => { setDone(null); setFile(null); setRows([]); }}>Import another file</button>
          </div>
          {done.parents.length > 0 && (
            <div className="card">
              <div className="row between noprint">
                <h2>New parent accounts</h2>
                <button className="btn pri" onClick={() => window.print()}>Print sign-in slips</button>
              </div>
              <p className="small noprint" style={{ marginBottom: 10 }}>
                These passwords are shown only once. Print the slips or copy them now and give each parent theirs. Parents choose their own password when they first sign in.
              </p>
              <div className="slips">
                {done.parents.map((p) => (
                  <div className="slip" key={p.tempPassword + p.fullName}>
                    <b>Osun EduOS · parent sign-in</b>
                    <div>{p.fullName}</div>
                    <div className="small">Parent of {p.children.join(', ')}</div>
                    <div className="small">Sign in with: <span className="mono">{p.email ?? formatPhone(p.phone)}</span></div>
                    <div className="small">Temporary password: <span className="mono">{p.tempPassword}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {done.withProblems > 0 && (
            <div className="card mt noprint">
              <h2>Skipped rows</h2>
              <ul className="small">
                {done.rows.filter((r) => !r.ok).map((r) => <li key={r.row}>Row {r.row}: {r.errors.join(' ')}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}
