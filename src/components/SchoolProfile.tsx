import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { OVERALL } from '../roles';
import type { Overall, School } from '../types';
import { SchoolMap } from './SchoolMap';
import { ErrorAlert, Field, formatDay } from './ui';

export const FACILITIES: Record<string, string> = {
  WATER: 'Water supply', TOILETS: 'Toilets', POWER: 'Electricity', ICT: 'Computer room', LIBRARY: 'Library',
  LAB: 'Science laboratory', FENCE: 'Perimeter fence', SPORTS: 'Sports field', FIRST_AID: 'First aid',
};

/** The school's profile: where it is, its size and facilities, and its inspection status. */
export function SchoolProfile({ school, canEdit, onSaved }: { school: School; canEdit: boolean; onSaved: (s: School) => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(() => ({
    town: school.town ?? '', yearEstablished: school.yearEstablished?.toString() ?? '', classrooms: school.classrooms?.toString() ?? '',
    expectedEnrolment: school.expectedEnrolment?.toString() ?? '', facilities: school.facilities ?? [],
    latitude: school.latitude?.toString() ?? '', longitude: school.longitude?.toString() ?? '',
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const picked: [number, number] | null = f.latitude && f.longitude ? [Number(f.latitude), Number(f.longitude)] : null;

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const s = await api<School>(`/schools/${school.id}`, {
        method: 'PATCH',
        json: {
          town: f.town.trim() || undefined, yearEstablished: num(f.yearEstablished), classrooms: num(f.classrooms), expectedEnrolment: num(f.expectedEnrolment),
          facilities: f.facilities, latitude: num(f.latitude), longitude: num(f.longitude),
        },
      });
      onSaved({ ...school, ...s });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the profile.');
    } finally {
      setBusy(false);
    }
  }

  function here() {
    setError(null);
    navigator.geolocation?.getCurrentPosition(
      (p) => setF((x) => ({ ...x, latitude: p.coords.latitude.toFixed(6), longitude: p.coords.longitude.toFixed(6) })),
      () => setError('Could not read your location. Allow location access, or click the map instead.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const last = school.lastInspection;
  return (
    <div className="card mt">
      <div className="row between">
        <h2 style={{ margin: 0 }}>School profile</h2>
        {canEdit && !editing && <button className="btn sm" onClick={() => setEditing(true)}>Edit profile</button>}
      </div>
      <ErrorAlert error={error} />
      {!editing ? (
        <div className="grid g2 mt">
          <dl className="kv">
            <dt>Town</dt><dd>{school.town ?? '–'}</dd>
            <dt>Address</dt><dd>{school.address ?? '–'}</dd>
            <dt>Established</dt><dd>{school.yearEstablished ?? '–'}</dd>
            <dt>Students</dt><dd>{school.students ?? '–'}{school.expectedEnrolment ? ` (expected ${school.expectedEnrolment})` : ''}</dd>
            <dt>Classrooms</dt><dd>{school.classrooms ?? '–'}{last?.usableClassrooms != null ? ` · ${last.usableClassrooms} safe to use at the last inspection` : ''}</dd>
            <dt>Facilities</dt><dd>{school.facilities.length ? school.facilities.map((x) => FACILITIES[x] ?? x).join(', ') : '–'}</dd>
            <dt>Location</dt><dd>{school.latitude != null ? <span className="mono">{school.latitude}, {school.longitude}</span> : 'Not recorded'}</dd>
            <dt>Inspection</dt>
            <dd>
              {last ? <><span className={`pill ${OVERALL[last.overall as Overall].pill}`}>{OVERALL[last.overall as Overall].label}</span> at the visit on {formatDay(last.visitedOn)}{last.id && <> · <Link to={`/inspections/${last.id}`}>Report</Link></>}</> : <span className="pill p-warn">Pending inspection</span>}
            </dd>
          </dl>
          {school.latitude != null && school.longitude != null ? (
            <SchoolMap small schools={[{ id: school.id, name: school.name, code: school.code, latitude: school.latitude, longitude: school.longitude, overall: last?.overall }]} />
          ) : <p className="muted small">{canEdit ? 'Edit the profile to add the school\'s location.' : 'No location recorded yet.'}</p>}
        </div>
      ) : (
        <div className="mt">
          <div className="form">
            <Field label="Town"><input id="town" maxLength={80} value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} /></Field>
            <Field label="Year established"><input id="yearEstablished" inputMode="numeric" maxLength={4} value={f.yearEstablished} onChange={(e) => setF({ ...f, yearEstablished: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Classrooms"><input id="classrooms" inputMode="numeric" value={f.classrooms} onChange={(e) => setF({ ...f, classrooms: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Expected enrolment"><input id="expectedEnrolment" inputMode="numeric" value={f.expectedEnrolment} onChange={(e) => setF({ ...f, expectedEnrolment: e.target.value.replace(/\D/g, '') })} /></Field>
            <div className="full field">
              Facilities
              <div className="row" style={{ gap: 14 }}>
                {Object.entries(FACILITIES).map(([k, label]) => (
                  <label key={k} className="row small" style={{ gap: 4 }}>
                    <input type="checkbox" checked={f.facilities.includes(k)} onChange={(e) => setF({ ...f, facilities: e.target.checked ? [...f.facilities, k] : f.facilities.filter((x) => x !== k) })} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Latitude"><input id="latitude" inputMode="decimal" value={f.latitude} onChange={(e) => setF({ ...f, latitude: e.target.value })} placeholder="7.7719" /></Field>
            <Field label="Longitude"><input id="longitude" inputMode="decimal" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} placeholder="4.5624" /></Field>
          </div>
          <p className="small muted mt">Click the map to set the location, or <button type="button" className="linklike" onClick={here}>use this device's location</button> when you are at the school.</p>
          <SchoolMap schools={[]} picked={picked} onPick={(lat, lng) => setF((x) => ({ ...x, latitude: String(lat), longitude: String(lng) }))} />
          <div className="row mt" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save profile'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
