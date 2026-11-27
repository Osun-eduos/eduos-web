import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export interface MapSchool { id: string; name: string; code: string; latitude: number; longitude: number; overall?: string | null }

/** Osun State, roughly: used when no school has a location yet. */
const OSUN: L.LatLngBoundsExpression = [[7.05, 4.05], [8.1, 5.1]];
const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const colour = (overall?: string | null) =>
  overall === 'CRITICAL' || overall === 'POOR' ? css('--bad', '#b3261e') : overall === 'FAIR' ? css('--warn', '#9a6408') : overall === 'GOOD' ? css('--good', '#1e7a4c') : css('--muted', '#5b6385');

/**
 * Schools on an OpenStreetMap map, coloured by their latest inspection (grey: not yet inspected). With `onPick`,
 * clicking the map sets a location instead.
 */
export function SchoolMap({ schools, onPick, picked, small, onOpen }: { schools: MapSchool[]; onPick?: (lat: number, lng: number) => void; picked?: [number, number] | null; small?: boolean; onOpen?: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
    m.fitBounds(OSUN);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !onPick) return;
    const h = (e: L.LeafletMouseEvent) => onPick(Math.round(e.latlng.lat * 1e6) / 1e6, Math.round(e.latlng.lng * 1e6) / 1e6);
    m.on('click', h);
    return () => {
      m.off('click', h);
    };
  }, [onPick]);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [];
    for (const s of schools) {
      const p: L.LatLngExpression = [s.latitude, s.longitude];
      pts.push(p);
      const mk = L.circleMarker(p, { radius: 7, color: css('--surface', '#fff'), weight: 2, fillColor: colour(s.overall), fillOpacity: 0.95 });
      mk.bindTooltip(`${s.name} · ${s.code}${s.overall ? '' : ' · awaiting inspection'}`);
      if (onOpen) mk.on('click', () => onOpen(s.id));
      mk.addTo(g);
    }
    if (picked) {
      L.circleMarker(picked, { radius: 9, color: css('--surface', '#fff'), weight: 2, fillColor: css('--series-1', '#7b5229'), fillOpacity: 1 }).addTo(g);
      pts.push(picked);
    }
    if (pts.length === 1) m.setView(pts[0], 14);
    else if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [24, 24], maxZoom: 14 });
  }, [schools, picked, onOpen]);

  return <div ref={el} className={`map${small ? ' small' : ''}`} role="region" aria-label="Map of schools" />;
}
