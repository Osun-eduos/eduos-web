import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorAlert, formatDate, formatPhone, todayNG } from '../components/ui';
import type { SmsMessage, SmsStatus, SmsSummary } from '../types';

const STATUS: Record<SmsStatus, [string, string]> = {
  QUEUED: ['p-warn', 'Waiting'],
  SENDING: ['p-warn', 'Sending'],
  SENT: ['p-good', 'Sent'],
  FAILED: ['p-bad', 'Failed'],
  CANCELLED: ['p-mut', 'Not sent'],
};

/** Absence texts to parents: the school's on/off switch, today's counts and the message log. The Ministry also sees the provider and can send a test. */
export function TextMessages() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SmsSummary | null>(null);
  const [rows, setRows] = useState<SmsMessage[]>([]);
  const [date, setDate] = useState(todayNG());
  const [status, setStatus] = useState<SmsStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (date) qs.set('date', date);
    if (status) qs.set('status', status);
    api<SmsMessage[]>(`/sms?${qs}`).then(setRows).catch((e) => setError(e.message));
    api<SmsSummary>('/sms/summary').then(setSummary).catch((e) => setError(e.message));
  }, [date, status]);
  useEffect(load, [load]);

  async function toggle(on: boolean, which: 'absenceSms' | 'resultsSms' = 'absenceSms') {
    setError(null);
    try {
      await api('/sms/settings', { method: 'PATCH', json: { [which]: on } });
      const what = which === 'absenceSms' ? 'Absence texts' : 'Report card texts';
      setNote(on ? `${what} are on.` : `${what} are off. Texts waiting to go out were stopped.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    }
  }

  async function test(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; provider: string; error: string | null }>('/sms/test', { method: 'POST', json: { phone } });
      if (r.ok) setNote(r.provider === 'log' ? 'Recorded, but not sent: no SMS account is set up yet, so texts are only logged.' : 'Test message sent. It should arrive within a minute.');
      else setError(`The test failed: ${r.error}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  const school = user.role === 'SCHOOL_ADMIN';
  const t = summary?.today;
  return (
    <>
      <div className="head">
        <div>
          <h1>Text messages</h1>
          <p>
            When a child is marked absent, each parent with a phone number gets one text that day, about {summary?.delayMinutes ?? 15} minute{summary?.delayMinutes === 1 ? '' : 's'} after the register is saved.
            If the register is corrected before then, the text is not sent. Late and excused children are not texted.
          </p>
        </div>
      </div>
      <ErrorAlert error={error} />
      {note && <div className="alert ok" style={{ marginBottom: 12 }}>{note}</div>}
      {summary && !summary.sending && (
        <div className="alert info" style={{ marginBottom: 12 }}>
          No SMS account is set up yet, so texts are recorded here but not sent. {school ? 'The Ministry will switch sending on.' : 'Add the KudiSMS API token and sender ID to the API settings (KUDISMS_TOKEN and KUDISMS_SENDER_ID) to start sending.'}
        </div>
      )}
      <div className="grid g4" style={{ marginBottom: 14 }}>
        {school ? (
          <div className="card kpi">
            <div className="k">Absence texts</div>
            <div className="v" style={{ fontSize: '1.2rem' }}>{summary?.absenceSms ? 'On' : 'Off'}</div>
            <button className="btn sm mt" onClick={() => toggle(!summary?.absenceSms)}>{summary?.absenceSms ? 'Switch off' : 'Switch on'}</button>
            <div className="small muted mt">Report card texts: <b>{summary?.resultsSms ? 'on' : 'off'}</b> · <button className="linklike" onClick={() => toggle(!summary?.resultsSms, 'resultsSms')}>{summary?.resultsSms ? 'switch off' : 'switch on'}</button></div>
          </div>
        ) : (
          <div className="card kpi">
            <div className="k">Provider</div>
            <div className="v" style={{ fontSize: '1.2rem' }}>{summary?.sending ? 'KudiSMS' : 'Not set up'}</div>
            <div className="small muted">{summary?.balance ? `Balance ₦${summary.balance}` : summary?.schoolsOff ? `${summary.schoolsOff} school${summary.schoolsOff === 1 ? ' has' : 's have'} texts off` : ' '}</div>
          </div>
        )}
        <div className="card kpi"><div className="k">{summary?.sending === false ? 'Logged today' : 'Sent today'}</div><div className="v">{t?.SENT ?? '–'}</div></div>
        <div className="card kpi"><div className="k">Waiting</div><div className="v">{t ? t.QUEUED + t.SENDING : '–'}</div></div>
        <div className="card kpi"><div className="k">Failed today</div><div className="v">{t?.FAILED ?? '–'}</div><div className="small muted">{t?.CANCELLED ? `${t.CANCELLED} not needed` : ' '}</div></div>
      </div>

      {user.role === 'MINISTRY_ADMIN' && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h2>Send a test message</h2>
          <form className="row" onSubmit={test} noValidate>
            <input className="inline" id="testPhone" inputMode="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="btn" disabled={busy || !phone.trim()}>{busy ? 'Sending…' : 'Send test'}</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="field">Date<input id="smsDate" type="date" max={todayNG()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="field">
            Status
            <select id="smsStatus" value={status} onChange={(e) => setStatus(e.target.value as SmsStatus | '')}>
              <option value="">All</option>
              {(Object.keys(STATUS) as SmsStatus[]).map((s) => <option key={s} value={s}>{STATUS[s][1]}</option>)}
            </select>
          </label>
        </div>
        <div className="tbl">
          <table>
            <thead><tr><th>Time</th><th>Student</th><th>Parent</th>{!school && <th>School</th>}<th>Phone</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="small" style={{ whiteSpace: 'nowrap' }}>{formatDate(m.sentAt ?? m.createdAt)}</td>
                  <td>{m.kind === 'TEST' ? <span className="muted">Test message</span> : m.student}</td>
                  <td>{m.parent ?? '–'}</td>
                  {!school && <td className="small">{m.school ?? '–'}</td>}
                  <td className="mono small" style={{ whiteSpace: 'nowrap' }}>{formatPhone(m.to)}</td>
                  <td>
                    {m.status === 'SENT' && m.provider === 'log' ? <span className="pill p-mut" title="No SMS account was set up, so this was recorded but not sent">Logged only</span> : <span className={`pill ${STATUS[m.status][0]}`}>{STATUS[m.status][1]}</span>}
                    {m.error && <div className="small muted" style={{ maxWidth: 280 }}>{m.error}</div>}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="muted">No texts on this day.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
