import { MouseEvent, ReactNode, useState } from 'react';

/** A tooltip that follows the pointer. */
export function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; body: ReactNode } | null>(null);
  const show = (body: ReactNode) => (e: MouseEvent) => setTip({ x: e.clientX + 14, y: e.clientY + 14, body });
  const el = tip && <div className="chart-tip" role="tooltip" style={{ left: Math.min(tip.x, window.innerWidth - 250), top: tip.y }}>{tip.body}</div>;
  return { show, hide: () => setTip(null), el };
}

export interface Line {
  name: string;
  /** A CSS colour, normally a --series-N token. */
  color: string;
  values: (number | null)[];
  /** The reference line (e.g. the state) is drawn dashed and grey. */
  reference?: boolean;
}

/**
 * Lines over a handful of labelled points (terms), on one 0-based scale. Each line is labelled at its last point
 * as well as in the legend; hovering a column shows every line's value there.
 */
export function LineChart({ labels, lines, suffix = '', max, label }: { labels: string[]; lines: Line[]; suffix?: string; max?: number; label: string }) {
  const tip = useTip();
  const [hover, setHover] = useState<number | null>(null);
  const all = lines.flatMap((l) => l.values).filter((v): v is number => v !== null);
  if (!all.length) return <p className="muted small">No figures for these terms yet.</p>;
  const top = max ?? Math.max(10, Math.ceil(Math.max(...all) / 10) * 10);
  const W = 640, H = 220, pad = { l: 36, r: 110, t: 10, b: 28 };
  const x = (i: number) => pad.l + (labels.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (labels.length - 1));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const fmt = (v: number | null) => (v === null ? '–' : `${v}${suffix}`);
  const step = labels.length > 1 ? x(1) - x(0) : W;
  return (
    <div className="cols" onMouseLeave={() => { tip.hide(); setHover(null); }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, top / 2, top].map((g) => (
          <g key={g}>
            <line className="gridline" x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} />
            <text x={pad.l - 6} y={y(g) + 4} textAnchor="end">{g}{suffix}</text>
          </g>
        ))}
        {labels.map((l, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{l}</text>)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeWidth={1} />}
        {lines.map((ln) => {
          const pts = ln.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const));
          const d = pts.reduce((acc, p, i) => (p ? `${acc}${acc && pts[i - 1] ? 'L' : 'M'}${p[0]},${p[1]}` : acc), '');
          const lastI = ln.values.map((v, i) => (v === null ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
          return (
            <g key={ln.name}>
              <path d={d} fill="none" stroke={ln.reference ? 'var(--muted)' : ln.color} strokeWidth={2} strokeDasharray={ln.reference ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5 : 4} fill={ln.reference ? 'var(--muted)' : ln.color} stroke="var(--surface)" strokeWidth={2} />)}
              {lastI >= 0 && <text x={x(lastI) + 10} y={y(ln.values[lastI]!) + 4} style={{ fill: 'var(--ink)' }}>{ln.name.length > 14 ? `${ln.name.slice(0, 13)}…` : ln.name}</text>}
            </g>
          );
        })}
        {labels.map((l, i) => (
          <rect
            key={i}
            x={x(i) - step / 2}
            y={pad.t}
            width={step}
            height={H - pad.t - pad.b}
            fill="transparent"
            onMouseMove={(e) => {
              setHover(i);
              tip.show(<><b>{l}</b>{lines.map((ln) => <div key={ln.name}>{ln.name}: {fmt(ln.values[i])}</div>)}</>)(e);
            }}
          />
        ))}
      </svg>
      {lines.length > 1 && (
        <div className="legend mt">
          {lines.map((ln) => <span key={ln.name}><i style={{ background: ln.reference ? 'var(--muted)' : ln.color }} />{ln.name}{ln.reference ? ' (dashed)' : ''}</span>)}
        </div>
      )}
      {tip.el}
    </div>
  );
}
