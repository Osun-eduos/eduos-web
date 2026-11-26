import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { ErrorAlert, Field, formatDate } from '../components/ui';
import type { ClassArm } from '../types';

interface Sent { id: string; title: string; body: string; sms: boolean; recipients: number; audience: string; sentBy: string | null; createdAt: string }
const SMS_MAX = 240;

/** A school's messages to parents: in their inbox on the web and the app, and by text if chosen. */
export function Notices() {
  const [rows, setRows] = useState<Sent[]>([]);
  const [classes, setClasses] = useState<ClassArm[]>([]);
  const [f, setF] = useState({ title: '', body: '', classArmId: '', sms: false });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    api<Sent[]>('/notices').then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    api<ClassArm[]>('/classes').then(setClasses).catch(() => {});
  }, [load]);
  const length = f.title.trim().length + f.body.trim().length + 2;

  async function send(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (f.title.trim().length < 3 || f.body.trim().length < 3) return setError('Write a title and a message.');
    if (f.sms && length > SMS_MAX) return setError(`A notice sent by text can be at most ${SMS_MAX} characters, title included.`);
    setBusy(true);
    try {
      const r = await api<{ audience: string; recipients: number; texts: number }>('/notices', { method: 'POST', json: { title: f.title, body: f.body, classArmId: f.classArmId || undefined, sms: f.sms } });
      setDone(`Sent to ${r.recipients} parent${r.recipients === 1 ? '' : 's'} (${r.audience.toLowerCase() === 'all parents' ? 'all parents' : `parents in ${r.audience}`})${r.texts ? `, ${r.texts} by text` : ''}.`);
      setF({ title: '', body: '', classArmId: '', sms: false });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The notice was not sent. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Notices to parents</h1>
          <p>Parents see notices in their inbox on the website and the EduOS app. Texts reach parents without smartphones; each school can text up to 3 notices a day.</p>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>New notice</h2>
        <form className="form" onSubmit={send} noValidate>
          <Field label="To" full>
            <select id="noticeClass" value={f.classArmId} onChange={(e) => setF({ ...f, classArmId: e.target.value })}>
              <option value="">All parents</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Parents in {c.name}</option>)}
            </select>
          </Field>
          <Field label="Title" full><input id="noticeTitle" maxLength={80} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Inter-house sports" /></Field>
          <Field label="Message" full hint={f.sms ? `${length} of ${SMS_MAX} characters` : undefined}>
            <textarea id="noticeBody" rows={4} maxLength={1000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          </Field>
          <label className="full row small" style={{ gap: 8 }}>
            <input type="checkbox" checked={f.sms} onChange={(e) => setF({ ...f, sms: e.target.checked })} /> Also send by text to parents with a phone number
          </label>
          <div className="full"><ErrorAlert error={error} />{done && <div className="alert ok">{done}</div>}</div>
          <div className="full"><button className="btn pri" disabled={busy}>{busy ? 'Sending…' : 'Send notice'}</button></div>
        </form>
      </div>
      <div className="card">
        <h2>Sent</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Sent</th><th>To</th><th>Notice</th><th className="num">Parents</th><th>Text</th></tr></thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td className="small" style={{ whiteSpace: 'nowrap' }}>{formatDate(n.createdAt)}<div className="muted">{n.sentBy}</div></td>
                  <td>{n.audience}</td>
                  <td><b>{n.title}</b><div className="small">{n.body}</div></td>
                  <td className="num">{n.recipients}</td>
                  <td>{n.sms ? <span className="pill p-ind">Texted</span> : <span className="pill p-mut">Inbox only</span>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="muted">No notices yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
