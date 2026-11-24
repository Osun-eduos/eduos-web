import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorAlert, formatDay, ordinal, pct } from '../components/ui';
import { ageFrom, SEX_LABEL } from '../roles';
import type { ReportCard as Card } from '../types';

export function ReportCard() {
  const { studentId } = useParams();
  const [params] = useSearchParams();
  const term = params.get('term');
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCard(null);
    api<Card>(`/report-cards/${studentId}${term ? `?termId=${term}` : ''}`).then(setCard).catch((e) => setError(e.message));
  }, [studentId, term]);

  if (!card) return error ? <ErrorAlert error={error} /> : <p className="muted">Loading…</p>;
  const { student: s, term: t, summary, attendance: a } = card;
  const comps = t.components;

  return (
    <>
      <div className="row between noprint" style={{ marginBottom: 12 }}>
        <Link className="small" to={`/students/${s.id}`}>← {s.fullName}</Link>
        <button className="btn pri" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      {!card.released && <div className="alert info noprint" style={{ marginBottom: 12 }}>Preview. Parents will see this report card once the school releases the class's results.</div>}

      <article className="report">
        <header className="report-head">
          <div>
            <div className="small muted">Osun State · Ministry of Education</div>
            <h1>{card.school.name}</h1>
            <div className="small muted">{card.school.address ? `${card.school.address} · ` : ''}{card.school.lga} LGA · <span className="mono">{card.school.code}</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="report-title">Report card</div>
            <div>{t.name}, {t.session}</div>
            {!card.released && <span className="pill p-warn">Not yet released</span>}
          </div>
        </header>

        <dl className="report-info">
          <div><dt>Student</dt><dd><b>{s.fullName}</b></dd></div>
          <div><dt>Learner ID</dt><dd className="mono">{s.learnerId}</dd></div>
          <div><dt>Admission no.</dt><dd className="mono">{s.admissionNumber ?? '–'}</dd></div>
          <div><dt>Class</dt><dd>{card.class.name} ({card.class.students} students)</dd></div>
          <div><dt>Sex · Age</dt><dd>{SEX_LABEL[s.sex]} · {ageFrom(s.dateOfBirth)} years</dd></div>
          <div><dt>Class teacher</dt><dd>{card.class.classTeacher ?? '–'}</dd></div>
          <div><dt>Term</dt><dd>{formatDay(t.startDate)} to {formatDay(t.endDate)}</dd></div>
          <div><dt>Next term begins</dt><dd>{card.nextTermBegins ? formatDay(card.nextTermBegins) : '–'}</dd></div>
        </dl>

        <div className="tbl">
          <table className="report-table">
            <thead>
              <tr>
                <th>Subject</th>
                {comps.map((c) => <th key={c.key} className="num">{c.label}<br /><span className="small">{c.max}</span></th>)}
                <th className="num">Total<br /><span className="small">100</span></th>
                <th>Grade</th>
                <th>Remark</th>
                <th className="num">Class avg.</th>
                <th className="num">Highest</th>
                <th className="num">Lowest</th>
                {t.showPositions && <th className="num">Position</th>}
              </tr>
            </thead>
            <tbody>
              {card.subjects.map((x) => (
                <tr key={x.code}>
                  <td>{x.name}</td>
                  {comps.map((c) => <td key={c.key} className="num">{x.marks[c.key] ?? '–'}</td>)}
                  <td className="num"><b>{x.total ?? '–'}</b></td>
                  <td><b>{x.grade ?? '–'}</b></td>
                  <td>{x.remark ?? ''}</td>
                  <td className="num">{x.classAverage ?? '–'}</td>
                  <td className="num">{x.highest ?? '–'}</td>
                  <td className="num">{x.lowest ?? '–'}</td>
                  {t.showPositions && <td className="num">{x.position ? ordinal(x.position) : '–'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="report-grid">
          <section>
            <h3>Summary</h3>
            <dl className="kv">
              <dt>Subjects</dt><dd>{summary.subjects}</dd>
              <dt>Total score</dt><dd>{summary.total ?? '–'}</dd>
              <dt>Average</dt><dd><b>{summary.average ?? '–'}</b></dd>
              <dt>Class average</dt><dd>{summary.classAverage ?? '–'}</dd>
              {t.showPositions && <><dt>Position</dt><dd><b>{summary.position ?? '–'}</b> of {summary.outOf}</dd></>}
            </dl>
          </section>
          <section>
            <h3>Attendance this term</h3>
            {a.marked ? (
              <dl className="kv">
                <dt>Days marked</dt><dd>{a.marked}</dd>
                <dt>Present</dt><dd>{a.PRESENT}</dd>
                <dt>Late</dt><dd>{a.LATE}</dd>
                <dt>Absent</dt><dd>{a.ABSENT}{a.EXCUSED ? ` (+${a.EXCUSED} excused)` : ''}</dd>
                <dt>Attendance</dt><dd><b>{pct(a.rate)}</b></dd>
              </dl>
            ) : <p className="muted small">No registers were taken.</p>}
          </section>
        </div>

        <div className="report-remarks">
          <div><h3>Class teacher's remark</h3><p>{card.remarks.teacher ?? '–'}</p></div>
          <div><h3>Principal's remark</h3><p>{card.remarks.principal ?? '–'}</p></div>
        </div>

        <footer className="report-foot small muted">
          Grades: {card.gradingScale.map((b, i, all) => `${b.grade} ${b.min === 0 ? `below ${all[i - 1]?.min ?? 40}` : `${b.min}+`} ${b.remark}`).join(' · ')}
        </footer>
      </article>
    </>
  );
}
