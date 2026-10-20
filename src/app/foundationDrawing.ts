// Croquis SVG estáticos (cores do papel: design/memorial.css) de blocos, sapatas e tubulões — usados no módulo e no memorial.
import type { CapResult } from '../core/caps';
import type { FootingResult } from '../core/footings';
import type { CaissonResult } from '../core/caissons';
import { fmt } from './results';
import { memo } from './design/tokens';

const C = { ink: memo('ink'), muted: memo('muted-fig'), conc: memo('conc'), pile: memo('pile'), pileLine: memo('accent'), tie: memo('m'), strut: memo('v'), col: memo('col'), soil: memo('soil'), water: memo('v'), press: memo('load'), paper: memo('paper'), fontNum: memo('font-num').replace(/'/g, '') };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const t = (x: number, y: number, s: string, anchor = 'middle', color = C.ink, size = 10) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${color}" font-size="${size}" font-family="${C.fontNum}" text-anchor="${anchor}">${esc(s)}</text>`;
const line = (x1: number, y1: number, x2: number, y2: number, color = C.ink, w = 1, dash = '') =>
  `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, stroke = C.ink, sw = 1) =>
  `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const cm = (v: number) => fmt(v * 100, 0);
const wrap = (W: number, H: number, body: string, label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;background:${C.paper}" role="img" aria-label="${esc(label)}"><rect width="${W}" height="${H}" fill="${C.paper}"/>${body}</svg>`;

/** Bloco de coroamento: planta (estacas, pilar e tirantes) e corte (bielas e tirante). */
export function svgCap(cap: CapResult, coords: [number, number][], D: number, ap: number, bp: number): string {
  const W = 600, H = 270;
  let s = '';
  // planta
  const pw = 270, k = Math.min((pw - 50) / cap.lx, (H - 70) / cap.ly);
  const cx = 20 + pw / 2, cy = 30 + (H - 60) / 2;
  const X = (x: number) => cx + x * k, Y = (y: number) => cy - y * k;
  s += t(cx, 16, 'Planta', 'middle', C.muted, 10);
  s += rect(X(-cap.lx / 2), Y(cap.ly / 2), cap.lx * k, cap.ly * k, C.conc, C.ink, 1.4);
  for (const tie of cap.ties) {
    const [a, b] = [coords[tie.a], coords[tie.b]];
    s += line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), C.tie, 2.2);
  }
  coords.forEach(([x, y], i) => {
    s += `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="${((D / 2) * k).toFixed(1)}" fill="${C.pile}" fill-opacity="0.7" stroke="${C.pileLine}" stroke-dasharray="4 2"/>`;
    s += t(X(x), Y(y) + 3, `E${i + 1}`, 'middle', C.pileLine, 9);
  });
  s += rect(X(-ap / 2), Y(bp / 2), ap * k, bp * k, C.col, C.ink, 1.2);
  s += t(cx, Y(-cap.ly / 2) + 14, `${cm(cap.lx)} × ${cm(cap.ly)} cm`, 'middle', C.ink, 10);
  // corte ao longo de x
  const x0 = 20 + pw + 30, sw = W - x0 - 50;
  const stub = 0.5, colH = 0.4;
  const kv = Math.min((sw - 40) / cap.lx, (H - 70) / (cap.h + stub + colH));
  const ccx = x0 + sw / 2, top = 34 + colH * kv;
  const SX = (x: number) => ccx + x * kv, SY = (z: number) => top + z * kv; // z para baixo a partir do topo do bloco
  s += t(ccx, 16, 'Corte', 'middle', C.muted, 10);
  s += rect(SX(-ap / 2), SY(-colH), ap * kv, colH * kv, C.col, C.ink, 1.2);
  s += rect(SX(-cap.lx / 2), SY(0), cap.lx * kv, cap.h * kv, C.conc, C.ink, 1.4);
  const xsSec = [...new Set(coords.map(([x]) => Math.round(x * 1000) / 1000))];
  for (const x of xsSec) s += rect(SX(x - D / 2), SY(cap.h - Math.min(0.1, cap.dPrime)), D * kv, (stub + Math.min(0.1, cap.dPrime)) * kv, C.pile, C.pileLine, 1);
  const zt = cap.h - cap.dPrime;
  if (cap.n > 1) {
    s += line(SX(Math.min(...xsSec)), SY(zt), SX(Math.max(...xsSec)), SY(zt), C.tie, 2.4);
    coords.forEach(([x], i) => {
      const g = cap.tops[i];
      if (!g) { s += line(SX(0), SY(0), SX(0), SY(zt), C.strut, 1.6, '5 3'); return; }
      s += line(SX(g[0]), SY(0), SX(x), SY(zt), C.strut, 1.6, '5 3');
    });
    s += t(SX(cap.lx / 2) + 2, SY(zt) - 4, `θ ≥ ${fmt(cap.thetaMin, 0)}°`, 'end', C.strut, 9);
  } else {
    s += line(SX(0), SY(0), SX(0), SY(cap.h), C.strut, 1.6, '5 3');
  }
  s += line(SX(cap.lx / 2) + 8, SY(0), SX(cap.lx / 2) + 8, SY(cap.h), C.muted, 0.8);
  s += t(SX(cap.lx / 2) + 11, SY(cap.h / 2) + 3, `h ${cm(cap.h)}`, 'start', C.ink, 9);
  s += t(ccx, H - 8, `d = ${cm(cap.d)} cm · d′ = ${cm(cap.dPrime)} cm`, 'middle', C.muted, 9);
  return wrap(W, H, s, 'Croqui do bloco de coroamento');
}

/** Sapata: planta e corte ao longo de A, com diagrama de tensões no solo (característico, N máx). */
export function svgFooting(r: FootingResult, ap: number, bp: number): string {
  const W = 600, H = 280;
  let s = '';
  const pw = 260, k = Math.min((pw - 40) / r.A, (H - 70) / r.B);
  const cx = 20 + pw / 2, cy = 30 + (H - 60) / 2;
  s += t(cx, 16, 'Planta', 'middle', C.muted, 10);
  s += rect(cx - (r.A / 2) * k, cy - (r.B / 2) * k, r.A * k, r.B * k, C.conc, C.ink, 1.4);
  if (r.kind === 'rigida') s += rect(cx - ((ap + 0.05) / 2) * k, cy - ((bp + 0.05) / 2) * k, (ap + 0.05) * k, (bp + 0.05) * k, 'none', C.muted, 0.8);
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) if (r.kind === 'rigida') s += line(cx + sx * (r.A / 2) * k, cy + sy * (r.B / 2) * k, cx + sx * ((ap + 0.05) / 2) * k, cy + sy * ((bp + 0.05) / 2) * k, C.muted, 0.6);
  s += rect(cx - (ap / 2) * k, cy - (bp / 2) * k, ap * k, bp * k, C.col, C.ink, 1.2);
  s += t(cx, cy + (r.B / 2) * k + 14, `A ${cm(r.A)} × B ${cm(r.B)} cm`, 'middle', C.ink, 10);
  const x0 = 20 + pw + 30, sw = W - x0 - 50, colH = 0.4, pz = 0.5;
  const kv = Math.min((sw - 20) / r.A, (H - 90) / (r.h + colH + pz));
  const ccx = x0 + sw / 2, top = 30 + colH * kv;
  const SX = (x: number) => ccx + x * kv, SY = (z: number) => top + z * kv;
  s += t(ccx, 16, 'Corte (direção A)', 'middle', C.muted, 10);
  s += rect(SX(-ap / 2), SY(-colH), ap * kv, colH * kv, C.col, C.ink, 1.2);
  const a2 = (ap + 0.05) / 2;
  const pts = [[-r.A / 2, r.h], [r.A / 2, r.h], [r.A / 2, r.h - r.h0], [a2, 0], [-a2, 0], [-r.A / 2, r.h - r.h0]];
  s += `<polygon points="${pts.map(([x, z]) => `${SX(x).toFixed(1)},${SY(z).toFixed(1)}`).join(' ')}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
  s += line(SX(-r.A / 2), SY(r.h - p0(r)), SX(r.A / 2), SY(r.h - p0(r)), C.tie, 2.2);
  s += line(SX(r.A / 2) + 8, SY(0), SX(r.A / 2) + 8, SY(r.h), C.muted, 0.8);
  s += t(SX(r.A / 2) + 11, SY(r.h / 2) + 3, `h ${cm(r.h)}`, 'start', C.ink, 9);
  if (r.kind === 'rigida') s += t(SX(-r.A / 2) - 3, SY(r.h - r.h0 / 2) + 3, `h0 ${cm(r.h0)}`, 'end', C.ink, 9);
  const c0 = r.cases[0];
  const smax = c0.sigmaMax, smin = c0.sigmaMin;
  const kp = (pz * kv) / Math.max(smax, 1e-9);
  const zb = SY(r.h) + 2;
  const xc = r.A / 2 - (c0.compressed < 1 ? c0.compressed * r.A : r.A);
  s += `<polygon points="${SX(-r.A / 2).toFixed(1)},${zb} ${SX(r.A / 2).toFixed(1)},${zb} ${SX(r.A / 2).toFixed(1)},${(zb + smax * kp).toFixed(1)} ${SX(c0.compressed < 1 ? xc : -r.A / 2).toFixed(1)},${(zb + (c0.compressed < 1 ? 0 : smin * kp)).toFixed(1)}" fill="${C.press}" fill-opacity="0.25" stroke="${C.press}"/>`;
  s += t(SX(r.A / 2), zb + smax * kp + 12, `σmáx ${fmt(smax, 0)} kPa`, 'end', C.press, 9);
  s += t(ccx, H - 6, `σadm ${fmt(r.sigmaAdm, 0)} kPa · ${r.kind === 'rigida' ? 'rígida' : 'flexível'}`, 'middle', C.muted, 9);
  return wrap(W, H, s, 'Croqui da sapata');
}
const p0 = (r: FootingResult) => r.h - r.d;

/** Tubulão: elevação com fuste, base alargada, terreno e nível d'água. */
export function svgCaisson(r: CaissonResult, water: number | null, cutoff: number): string {
  const W = 360, H = 320;
  let s = '';
  const depth = r.depth;
  const kv = (H - 60) / Math.max(depth + 0.5, 1);
  const kh = Math.min(kv, (W - 140) / r.Db);
  const cx = W / 2 - 20, top = 26;
  const Y = (z: number) => top + z * kv, X = (x: number) => cx + x * kh;
  s += line(20, Y(0), W - 20, Y(0), C.soil, 1.6);
  s += t(24, Y(0) - 4, 'terreno', 'start', C.soil, 9);
  if (water !== null && water <= depth + 0.5) { s += line(20, Y(water), W - 20, Y(water), C.water, 1.2, '6 3'); s += t(W - 22, Y(water) - 4, `NA ${fmt(water, 1)} m`, 'end', C.water, 9); }
  const zf = depth - r.H;
  const pts: [number, number][] = [[-r.Df / 2, cutoff], [r.Df / 2, cutoff], [r.Df / 2, zf], [r.Db / 2, depth - r.rodape], [r.Db / 2, depth], [-r.Db / 2, depth], [-r.Db / 2, depth - r.rodape], [-r.Df / 2, zf]];
  s += `<polygon points="${pts.map(([x, z]) => `${X(x).toFixed(1)},${Y(z).toFixed(1)}`).join(' ')}" fill="${C.conc}" stroke="${C.ink}" stroke-width="1.4"/>`;
  s += t(X(r.Df / 2) + 6, Y((cutoff + zf) / 2), `Df ${cm(r.Df)}`, 'start', C.ink, 9);
  s += t(cx, Y(depth) + 14, `Db ${cm(r.Db)} cm`, 'middle', C.ink, 10);
  if (r.H > 0) { s += line(X(r.Db / 2) + 10, Y(zf), X(r.Db / 2) + 10, Y(depth), C.muted, 0.8); s += t(X(r.Db / 2) + 13, Y(depth - r.H / 2) + 3, `H ${cm(r.H)}`, 'start', C.ink, 9); }
  s += t(W - 22, Y(depth) - 4, `base a ${fmt(depth, 1)} m`, 'end', C.muted, 9);
  return wrap(W, H, s, 'Croqui do tubulão');
}
