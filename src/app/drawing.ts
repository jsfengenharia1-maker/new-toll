// Figuras SVG estáticas usadas no memorial (cores do papel: design/memorial.css).
import type { Analysis, CaseResult } from '../core/solver';
import type { DesignReport } from '../core/design';
import type { Model, Support } from '../core/types';
import { P } from '../core/math';
import { memberSeries, globalDisp, fmt, type Eff } from './results';
import { memo } from './design/tokens';

const C = { ink: memo('ink'), muted: memo('muted-fig'), load: memo('load'), N: memo('n'), V: memo('v'), M: memo('m'), def: memo('def'), react: memo('react'), ok: memo('ok'), bad: memo('bad'), warn: memo('warn'), grid: memo('grid'), paper: memo('paper'), support: memo('support'), faint: memo('faint'), spring: memo('spring'), id: memo('id'), na: memo('na'), fontNum: memo('font-num') };

interface Frame { X: (x: number) => number; Y: (y: number) => number; w: number; h: number; ext: number; scale: number }

function frame(m: Model, W = 680, maxH = 400, pad = 70): Frame {
  const xs = m.nodes.map((n) => n.x), ys = m.nodes.map((n) => n.y);
  const x0 = Math.min(...xs, 0), x1 = Math.max(...xs, 1), y0 = Math.min(...ys, 0), y1 = Math.max(...ys, 1);
  const dx = Math.max(x1 - x0, 1), dy = Math.max(y1 - y0, 0.5);
  const scale = Math.min((W - 2 * pad) / dx, (maxH - 2 * pad) / dy);
  const h = Math.max(220, dy * scale + 2 * pad);
  const ox = (W - dx * scale) / 2 - x0 * scale, oy = h / 2 + ((y0 + y1) / 2) * scale;
  return { X: (x) => x * scale + ox, Y: (y) => oy - y * scale, w: W, h, ext: Math.max(dx, dy), scale };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const txt = (x: number, y: number, s: string, color = C.ink, anchor = 'middle', size = 10) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${color}" font-size="${size}" font-family="${C.fontNum.replace(/'/g, '')}" text-anchor="${anchor}" paint-order="stroke" stroke="${C.paper}" stroke-width="3">${esc(s)}</text>`;

function arrow(x: number, y: number, dx: number, dy: number, len: number, color: string, w = 1.4) {
  const tx = x - dx * len, ty = y - dy * len, hx = -dx * 7, hy = -dy * 7, px = -dy * 3.5, py = dx * 3.5;
  return `<line x1="${tx}" y1="${ty}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="${w}"/><polygon points="${x},${y} ${x + hx + px},${y + hy + py} ${x + hx - px},${y + hy - py}" fill="${color}"/>`;
}

function support(x: number, y: number, s: Support) {
  const ang = -(s.angle ?? 0);
  let g = '';
  if (s.ux === 'fixed' && s.uy === 'fixed' && s.rz === 'fixed') {
    g += `<line x1="-14" y1="0" x2="14" y2="0" stroke="${C.ink}" stroke-width="2"/>`;
    for (let k = -12; k <= 12; k += 6) g += `<line x1="${k}" y1="0" x2="${k - 5}" y2="7" stroke="${C.ink}"/>`;
  } else {
    const tri = (rot: number, roller: boolean) => `<g transform="rotate(${rot})"><polygon points="0,0 -8,13 8,13" fill="${C.support}" stroke="${C.ink}"/><line x1="-11" y1="${roller ? 17 : 13}" x2="11" y2="${roller ? 17 : 13}" stroke="${C.ink}" stroke-width="1.4"/></g>`;
    if (s.ux === 'fixed' && s.uy === 'fixed') g += tri(0, false);
    else { if (s.uy === 'fixed') g += tri(0, true); if (s.ux === 'fixed') g += tri(90, true); }
    if (s.uy === 'spring') g += `<polyline points="0,0 0,4 -5,6 5,10 -5,14 5,18 0,20 0,24" fill="none" stroke="${C.ink}"/>`;
    if (s.ux === 'spring') g += `<g transform="rotate(90)"><polyline points="0,0 0,4 -5,6 5,10 -5,14 5,18 0,20 0,24" fill="none" stroke="${C.ink}"/></g>`;
    if (s.rz === 'fixed') g += `<rect x="-6" y="-6" width="12" height="12" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`;
  }
  return `<g transform="translate(${x},${y}) rotate(${ang})">${g}</g>`;
}

function skeleton(m: Model, f: Frame, opts: { ids?: boolean; color?: (id: number) => string; faint?: boolean } = {}) {
  let s = '';
  const node = new Map(m.nodes.map((n) => [n.id, n]));
  for (const mem of m.members) {
    const p = node.get(mem.ni)!, q = node.get(mem.nj)!;
    const col = opts.color?.(mem.id) ?? (opts.faint ? C.faint : C.ink);
    s += `<line x1="${f.X(p.x)}" y1="${f.Y(p.y)}" x2="${f.X(q.x)}" y2="${f.Y(q.y)}" stroke="${col}" stroke-width="${opts.color ? 3.2 : 2.2}" stroke-linecap="round"/>`;
    const L = Math.hypot(q.x - p.x, q.y - p.y) * f.scale, ux = (f.X(q.x) - f.X(p.x)) / L, uy = (f.Y(q.y) - f.Y(p.y)) / L;
    if (mem.hingeI) s += `<circle cx="${f.X(p.x) + ux * 7}" cy="${f.Y(p.y) + uy * 7}" r="3.4" fill="${C.paper}" stroke="${C.ink}"/>`;
    if (mem.hingeJ) s += `<circle cx="${f.X(q.x) - ux * 7}" cy="${f.Y(q.y) - uy * 7}" r="3.4" fill="${C.paper}" stroke="${C.ink}"/>`;
    if (!mem.hingeI && mem.springI) s += `<circle cx="${f.X(p.x) + ux * 7}" cy="${f.Y(p.y) + uy * 7}" r="3.4" fill="${C.spring}" stroke="${C.ink}"/>`;
    if (!mem.hingeJ && mem.springJ) s += `<circle cx="${f.X(q.x) - ux * 7}" cy="${f.Y(q.y) - uy * 7}" r="3.4" fill="${C.spring}" stroke="${C.ink}"/>`;
    if (opts.ids) s += txt((f.X(p.x) + f.X(q.x)) / 2 + 8, (f.Y(p.y) + f.Y(q.y)) / 2 - 6, String(mem.id), C.id);
  }
  for (const n of m.nodes) {
    if (n.support) s += support(f.X(n.x), f.Y(n.y), n.support);
    s += `<rect x="${f.X(n.x) - 2.5}" y="${f.Y(n.y) - 2.5}" width="5" height="5" fill="${C.paper}" stroke="${C.ink}"/>`;
    if (opts.ids) s += txt(f.X(n.x) - 7, f.Y(n.y) + 15, String(n.id), C.muted, 'end', 9);
  }
  return s;
}

const wrap = (f: Frame, body: string, caption?: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.w} ${f.h.toFixed(0)}" width="100%" style="max-width:${f.w}px;background:${C.paper}">${body}${caption ? txt(10, 16, caption, C.muted, 'start', 10) : ''}</svg>`;

export function svgGeometry(m: Model) {
  const f = frame(m);
  // cotas gerais
  const xs = [...new Set(m.nodes.map((n) => +n.x.toFixed(4)))].sort((a, b) => a - b);
  const ymin = Math.min(...m.nodes.map((n) => n.y));
  let dims = '';
  const yd = f.Y(ymin) + 42;
  for (let i = 0; i + 1 < xs.length; i++) {
    const a = f.X(xs[i]), b = f.X(xs[i + 1]);
    if (b - a < 18) continue;
    dims += `<line x1="${a}" y1="${yd}" x2="${b}" y2="${yd}" stroke="${C.muted}"/><line x1="${a}" y1="${yd - 4}" x2="${a}" y2="${yd + 4}" stroke="${C.muted}"/><line x1="${b}" y1="${yd - 4}" x2="${b}" y2="${yd + 4}" stroke="${C.muted}"/>`;
    dims += txt((a + b) / 2, yd - 4, fmt(xs[i + 1] - xs[i]), C.muted, 'middle', 9);
  }
  return wrap(f, skeleton(m, f, { ids: true }) + dims, 'Geometria (m) · numeração de nós e barras');
}

export function svgLoads(m: Model, caseId: number, caseName: string) {
  const f = frame(m);
  let s = skeleton(m, f, { faint: true });
  const node = new Map(m.nodes.map((n) => [n.id, n]));
  const loads = m.loads.filter((l) => l.caseId === caseId);
  let qmax = 0;
  for (const l of loads) if (l.kind === 'dist') qmax = Math.max(qmax, Math.hypot(l.qxi, l.qyi), Math.hypot(l.qxj, l.qyj));
  const kq = qmax > 0 ? 30 / qmax : 0;
  for (const l of loads) {
    if (l.kind === 'nodal') {
      const n = node.get(l.node); if (!n) continue;
      const x = f.X(n.x), y = f.Y(n.y);
      if (l.fx) { const d = Math.sign(l.fx); s += arrow(x - d * 4, y, d, 0, 36, C.load) + txt(x - d * 44, y - 5, fmt(Math.abs(l.fx)), C.load); }
      if (l.fy) { const d = -Math.sign(l.fy); s += arrow(x, y - d * 4, 0, d, 36, C.load) + txt(x + 5, y - d * 42, fmt(Math.abs(l.fy)), C.load, 'start'); }
      if (l.mz) s += txt(x + 12, y - 12, `M ${fmt(l.mz)}`, C.load, 'start');
    } else if (l.kind === 'dist') {
      const mem = m.members.find((k) => k.id === l.member); if (!mem) continue;
      const p = node.get(mem.ni)!, q = node.get(mem.nj)!;
      const L = Math.hypot(q.x - p.x, q.y - p.y), c = (q.x - p.x) / L, sn = (q.y - p.y) / L;
      const tails: [number, number][] = [];
      const nA = 8;
      for (let k = 0; k <= nA; k++) {
        const t = k / nA;
        let qx = l.qxi + (l.qxj - l.qxi) * t, qy = l.qyi + (l.qyj - l.qyi) * t;
        if (l.system === 'local') { const gx = c * qx - sn * qy, gy = sn * qx + c * qy; qx = gx; qy = gy; }
        const bx = f.X(p.x + (q.x - p.x) * t), by = f.Y(p.y + (q.y - p.y) * t);
        const vx = qx * kq, vy = -qy * kq, len = Math.hypot(vx, vy);
        tails.push([bx - vx, by - vy]);
        if (len > 3) s += arrow(bx, by, vx / len, vy / len, len, C.load, 1);
      }
      s += `<polyline points="${tails.map((t) => t.join(',')).join(' ')}" fill="none" stroke="${C.load}"/>`;
      const mid = tails[4];
      const same = l.qxi === l.qxj && l.qyi === l.qyj;
      s += txt(mid[0], mid[1] - 5, same ? `${fmt(Math.hypot(l.qxi, l.qyi))} kN/m` : `${fmt(Math.hypot(l.qxi, l.qyi))}→${fmt(Math.hypot(l.qxj, l.qyj))} kN/m`, C.load);
    } else if (l.kind === 'thermal') {
      const mem = m.members.find((k) => k.id === l.member); if (!mem) continue;
      const p = node.get(mem.ni)!, q = node.get(mem.nj)!;
      s += txt(f.X((p.x + q.x) / 2), f.Y((p.y + q.y) / 2) + 14, `ΔT ${fmt(l.tTop, 0)}/${fmt(l.tBot, 0)} °C`, C.load);
    }
  }
  const sw = loads.find((l) => l.kind === 'selfWeight');
  return wrap(f, s, `${caseName}${sw ? ' · inclui peso próprio' : ''} (kN, kN/m)`);
}

export function svgDiagram(m: Model, a: Analysis, results: CaseResult[], e: Eff, title: string, mTension = true) {
  const f = frame(m);
  let s = skeleton(m, f, { faint: true });
  const series = a.prep.members.map((pm) => memberSeries(results, pm.index, pm.L, e));
  let maxAbs = 0;
  series.forEach((sr) => sr.xs.forEach((_, j) => (maxAbs = Math.max(maxAbs, Math.abs(sr.max[j]), Math.abs(sr.min[j])))));
  const k = maxAbs > 1e-9 ? (0.1 * f.ext) / maxAbs : 0;
  const sign = e === 'M' && mTension ? -1 : 1;
  const env = results.length > 1;
  const used: [number, number][] = [];
  a.prep.members.forEach((pm, i) => {
    const sr = series[i], p0 = m.nodes[pm.i], nx = -pm.s, ny = pm.c;
    const pt = (x: number, v: number) => [f.X(p0.x + pm.c * x + nx * sign * v * k), f.Y(p0.y + pm.s * x + ny * sign * v * k)];
    const base = (x: number) => [f.X(p0.x + pm.c * x), f.Y(p0.y + pm.s * x)];
    for (const arr of env ? [sr.max, sr.min] : [sr.max]) {
      const pts = sr.xs.map((x, j) => pt(x, arr[j]));
      s += `<polygon points="${[...pts, base(pm.L), base(0)].map((q) => q.join(',')).join(' ')}" fill="${C[e]}" fill-opacity="0.16"/>`;
      s += `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${C[e]}" stroke-width="1.4"/>`;
      let jm = 0; arr.forEach((v, j) => { if (Math.abs(v) > Math.abs(arr[jm])) jm = j; });
      for (const j of new Set([0, arr.length - 1, jm])) {
        if (Math.abs(arr[j]) < 0.02 * maxAbs) continue;
        const [lx, ly] = pt(sr.xs[j], arr[j]);
        if (used.some(([ux, uy]) => Math.abs(ux - lx) < 34 && Math.abs(uy - ly) < 11)) continue;
        used.push([lx, ly]);
        s += txt(lx, ly + (ny * sign * arr[j] > 0 ? -5 : 12), fmt(arr[j]), C[e], 'middle', 9);
      }
    }
  });
  return wrap(f, s, title);
}

export function svgDeformed(m: Model, a: Analysis, r: CaseResult, title: string) {
  const f = frame(m);
  let s = skeleton(m, f, { faint: true });
  let maxD = 0;
  const pts = a.prep.members.map((pm) => Array.from({ length: 21 }, (_, q) => { const x = (pm.L * q) / 20; const d = globalDisp(a, r, pm.index, x); maxD = Math.max(maxD, Math.hypot(d[0], d[1])); return [x, d] as const; }));
  const amp = maxD > 0 ? (0.07 * f.ext) / maxD : 0;
  pts.forEach((arr, i) => {
    const pm = a.prep.members[i], p0 = m.nodes[pm.i];
    s += `<polyline points="${arr.map(([x, d]) => `${f.X(p0.x + pm.c * x + d[0] * amp)},${f.Y(p0.y + pm.s * x + d[1] * amp)}`).join(' ')}" fill="none" stroke="${C.def}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
  });
  m.nodes.forEach((n, k) => {
    const dx = r.u[k * 3], dy = r.u[k * 3 + 1], d = Math.hypot(dx, dy);
    if (d > 0.25 * maxD) s += txt(f.X(n.x + dx * amp) + 6, f.Y(n.y + dy * amp) - 6, `${fmt(d * 1000)} mm`, C.def, 'start', 9);
  });
  return wrap(f, s, `${title} · fator de ampliação ${fmt(amp, 0)}×`);
}

export function svgDesign(m: Model, rep: DesignReport) {
  const f = frame(m);
  const st = new Map(rep.members.map((d) => [d.id, d]));
  const color = (id: number) => { const d = st.get(id); return !d || d.status === 'na' ? C.na : d.status === 'ok' ? C.ok : d.status === 'review' ? C.warn : C.bad; };
  let s = skeleton(m, f, { color });
  const node = new Map(m.nodes.map((n) => [n.id, n]));
  for (const mem of m.members) {
    const d = st.get(mem.id); if (!d || d.status === 'na') continue;
    const p = node.get(mem.ni)!, q = node.get(mem.nj)!;
    s += txt((f.X(p.x) + f.X(q.x)) / 2 + 8, (f.Y(p.y) + f.Y(q.y)) / 2 - 7, `${mem.id}: ${d.util > 9.99 ? '>999' : (d.util * 100).toFixed(0)}%`, color(mem.id), 'start', 9);
  }
  return wrap(f, s, 'Taxa de utilização por barra (verde atende · vermelho não atende · laranja revisar)');
}

export function svgReactions(m: Model, r: CaseResult, title: string) {
  const f = frame(m);
  let s = skeleton(m, f, { faint: true });
  r.reactions.forEach((R, k) => {
    const n = m.nodes[k], x = f.X(n.x), y = f.Y(n.y);
    if (Math.abs(R[0]) > 1e-6) { const d = Math.sign(R[0]); s += arrow(x - d * 18, y + 26, d, 0, 28, C.react) + txt(x - d * 34, y + 20, fmt(Math.abs(R[0])), C.react); }
    if (Math.abs(R[1]) > 1e-6) { const d = Math.sign(R[1]); s += arrow(x + 16, y + 22 + (d > 0 ? 0 : 28), 0, -d, 28, C.react) + txt(x + 22, y + 60, fmt(Math.abs(R[1])), C.react, 'start'); }
    if (Math.abs(R[2]) > 1e-6) s += txt(x - 22, y - 16, `M ${fmt(R[2])}`, C.react, 'end');
  });
  return wrap(f, s, title);
}

export { P };
