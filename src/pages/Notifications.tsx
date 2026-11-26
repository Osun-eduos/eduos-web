import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ErrorAlert, formatDate } from '../components/ui';

export interface InboxItem { id: string; kind: string; title: string; body: string; link: string | null; read: boolean; at: string }
const KIND: Record<string, string> = { ABSENCE: 'Absence', RESULTS: 'Results', TRANSFER: 'Transfer', NOTICE: 'Notice', ENROLMENT: 'Enrolment' };

/** Tells the sidebar to refresh its unread count. */
export const inboxChanged = () => window.dispatchEvent(new Event('eduos:inbox'));

/** Everything EduOS has told the signed-in person: absences, report cards, transfers and school notices. */
export function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    api<{ unread: number; items: InboxItem[] }>('/notifications').then((r) => { setItems(r.items); setUnread(r.unread); }).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function open(n: InboxItem) {
    if (!n.read) {
      await api('/notifications/read', { method: 'POST', json: { ids: [n.id] } }).catch(() => {});
      inboxChanged();
    }
    if (n.link && n.link !== '/notifications') navigate(n.link);
    else load();
  }
  async function readAll() {
    await api('/notifications/read', { method: 'POST', json: {} });
    inboxChanged();
    load();
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Notifications</h1>
          <p>Absences, report cards, transfers and notices from your children's schools.</p>
        </div>
        {unread > 0 && <button className="btn" onClick={readAll}>Mark all as read</button>}
      </div>
      <ErrorAlert error={error} />
      <div className="card" style={{ padding: 0 }}>
        {items.map((n) => (
          <button key={n.id} className={`inbox-item${n.read ? '' : ' unread'}`} onClick={() => open(n)}>
            <span className="small muted">{KIND[n.kind] ?? n.kind} · {formatDate(n.at)}</span>
            <b>{n.title}</b>
            <span>{n.body}</span>
          </button>
        ))}
        {!items.length && <p className="muted" style={{ padding: 16 }}>Nothing yet. You will see absences, report cards and school notices here.</p>}
      </div>
    </>
  );
}
