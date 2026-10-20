// Leitor de DXF (ASCII) para máscaras: LINE, LWPOLYLINE (com bulge), POLYLINE/VERTEX, ARC, CIRCLE, ELLIPSE,
// SPLINE (aproximada pelos pontos), TEXT, MTEXT e INSERT/DIMENSION (blocos aninhados, escala, rotação, matriz).
// Saída por camada, em unidades do desenho; a escala para metros vem de $INSUNITS ou da escolha do usuário.
import type { CamadaGeo } from '../building/types';

export interface DxfLido {
  /** $INSUNITS (0 = sem unidade, 4 = mm, 5 = cm, 6 = m). */
  insunits: number;
  camadas: Record<string, CamadaGeo>;
  /** Entidades não lidas, por tipo. */
  ignoradas: Record<string, number>;
  /** Entidades aproximadas (ex.: SPLINE pelos pontos), por tipo. */
  aproximadas: Record<string, number>;
  bbox: [number, number, number, number] | null;
  segmentos: number;
}

/** Metros por unidade do desenho segundo $INSUNITS (null = desconhecida). */
export function metrosPorUnidade(insunits: number): number | null {
  return ({ 1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1, 14: 0.1 } as Record<number, number>)[insunits] ?? null;
}

type Par = [number, string];
interface Ent { tipo: string; g: Par[]; vertices?: Par[][] }
type M = [number, number, number, number, number, number]; // x' = a x + c y + e ; y' = b x + d y + f
const ID: M = [1, 0, 0, 1, 0, 0];
const mul = (A: M, B: M): M => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const ap = (T: M, x: number, y: number): [number, number] => [T[0] * x + T[2] * y + T[4], T[1] * x + T[3] * y + T[5]];
const rot = (deg: number): M => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
const tr = (x: number, y: number): M => [1, 0, 0, 1, x, y];
const sc = (x: number, y: number): M => [x, 0, 0, y, 0, 0];

function pares(txt: string): Par[] {
  const l = txt.split(/\r?\n/);
  const out: Par[] = [];
  for (let i = 0; i + 1 < l.length; i += 2) {
    const c = parseInt(l[i].trim(), 10);
    if (Number.isNaN(c)) { i--; continue; } // linha solta: realinha
    out.push([c, l[i + 1].replace(/\s+$/, '')]);
  }
  return out;
}

/** Agrupa as entidades de uma seção (POLYLINE leva os VERTEX até o SEQEND). */
function entidades(p: Par[], i0: number, fim: (par: Par) => boolean): { ents: Ent[]; i: number } {
  const ents: Ent[] = [];
  let i = i0;
  while (i < p.length && !fim(p[i])) {
    if (p[i][0] !== 0) { i++; continue; }
    const e: Ent = { tipo: p[i][1].trim(), g: [] };
    i++;
    while (i < p.length && p[i][0] !== 0) e.g.push(p[i++]);
    if (e.tipo === 'POLYLINE') {
      e.vertices = [];
      while (i < p.length && p[i][0] === 0 && p[i][1].trim() === 'VERTEX') {
        const v: Par[] = [];
        i++;
        while (i < p.length && p[i][0] !== 0) v.push(p[i++]);
        e.vertices.push(v);
      }
      if (i < p.length && p[i][1].trim() === 'SEQEND') { i++; while (i < p.length && p[i][0] !== 0) i++; }
    }
    ents.push(e);
  }
  return { ents, i };
}

const num = (g: Par[], c: number, d = 0) => { const x = g.find((q) => q[0] === c); return x ? parseFloat(x[1]) : d; };
const str = (g: Par[], c: number, d = '') => g.find((q) => q[0] === c)?.[1].trim() ?? d;

function limparMtext(t: string) {
  return t.replace(/\\P/g, ' ').replace(/\\[ACFHLOQTWfp][^;\\{}]*;/g, '').replace(/\\[LlOoKk]/g, '').replace(/\\S([^;]*)[#^/]([^;]*);/g, '$1/$2').replace(/[{}]/g, '').replace(/\\\\/g, '\\').trim();
}

export function lerDxf(txt: string): DxfLido {
  const p = pares(txt);
  const r: DxfLido = { insunits: 0, camadas: {}, ignoradas: {}, aproximadas: {}, bbox: null, segmentos: 0 };
  const blocos = new Map<string, { bx: number; by: number; ents: Ent[] }>();
  let ents: Ent[] = [];
  for (let i = 0; i < p.length; i++) {
    if (!(p[i][0] === 0 && p[i][1].trim() === 'SECTION' && p[i + 1]?.[0] === 2)) continue;
    const nome = p[i + 1][1].trim();
    i += 2;
    if (nome === 'HEADER') {
      for (; i < p.length && !(p[i][0] === 0 && p[i][1].trim() === 'ENDSEC'); i++)
        if (p[i][0] === 9 && p[i][1].trim() === '$INSUNITS' && p[i + 1]?.[0] === 70) r.insunits = parseInt(p[i + 1][1], 10) || 0;
    } else if (nome === 'BLOCKS') {
      while (i < p.length && !(p[i][0] === 0 && p[i][1].trim() === 'ENDSEC')) {
        if (p[i][0] === 0 && p[i][1].trim() === 'BLOCK') {
          const g: Par[] = [];
          i++;
          while (i < p.length && p[i][0] !== 0) g.push(p[i++]);
          const res = entidades(p, i, (q) => q[0] === 0 && q[1].trim() === 'ENDBLK');
          blocos.set(str(g, 2), { bx: num(g, 10), by: num(g, 20), ents: res.ents });
          i = res.i + 1;
        } else i++;
      }
    } else if (nome === 'ENTITIES') {
      const res = entidades(p, i, (q) => q[0] === 0 && q[1].trim() === 'ENDSEC');
      ents = res.ents;
      i = res.i;
    }
  }

  const camada = (n: string) => (r.camadas[n] ??= { linhas: [], arcos: [], textos: [] });
  const conta = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };
  const seg = (L: string, a: [number, number], b: [number, number]) => { camada(L).linhas.push(a[0], a[1], b[0], b[1]); r.segmentos++; };
  /** Arco no sistema local; com transformação de semelhança direta vira arco, senão vira segmentos. */
  const arco = (L: string, T: M, cx: number, cy: number, rr: number, a0: number, a1: number) => {
    const det = T[0] * T[3] - T[1] * T[2];
    const sx = Math.hypot(T[0], T[1]), sy = Math.hypot(T[2], T[3]);
    let sw = a1 - a0;
    while (sw <= 0) sw += 360;
    if (det > 0 && Math.abs(sx - sy) < 1e-9 * Math.max(sx, 1)) {
      const [x, y] = ap(T, cx, cy), th = (Math.atan2(T[1], T[0]) * 180) / Math.PI;
      camada(L).arcos.push(x, y, rr * sx, a0 + th, a0 + th + sw);
      return;
    }
    const n = Math.max(8, Math.ceil(sw / 10));
    let prev = ap(T, cx + rr * Math.cos((a0 * Math.PI) / 180), cy + rr * Math.sin((a0 * Math.PI) / 180));
    for (let k = 1; k <= n; k++) {
      const a = ((a0 + (sw * k) / n) * Math.PI) / 180;
      const q = ap(T, cx + rr * Math.cos(a), cy + rr * Math.sin(a));
      seg(L, prev, q);
      prev = q;
    }
  };
  /** Trecho de polilinha com bulge (arco de p1 a p2). */
  const trecho = (L: string, T: M, x1: number, y1: number, x2: number, y2: number, bulge: number) => {
    if (Math.abs(bulge) < 1e-12) { seg(L, ap(T, x1, y1), ap(T, x2, y2)); return; }
    const th = 4 * Math.atan(bulge), d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 1e-12) return;
    const rr = d / (2 * Math.sin(Math.abs(th) / 2));
    const al = Math.atan2(y2 - y1, x2 - x1), h = (d / 2) / Math.tan(th / 2);
    const cx = (x1 + x2) / 2 - h * Math.sin(al), cy = (y1 + y2) / 2 + h * Math.cos(al);
    const s = (Math.atan2(y1 - cy, x1 - cx) * 180) / Math.PI, e = (Math.atan2(y2 - cy, x2 - cx) * 180) / Math.PI;
    if (th > 0) arco(L, T, cx, cy, rr, s, e); else arco(L, T, cx, cy, rr, e, s);
  };
  const polilinha = (L: string, T: M, vs: { x: number; y: number; b: number }[], fechada: boolean) => {
    const n = vs.length;
    for (let k = 0; k < (fechada ? n : n - 1); k++) { const a = vs[k], z = vs[(k + 1) % n]; trecho(L, T, a.x, a.y, z.x, z.y, a.b); }
  };

  const emitir = (e: Ent, T: M, herda: string | null, prof: number) => {
    let L = str(e.g, 8, '0');
    if (L === '0' && herda) L = herda;
    switch (e.tipo) {
      case 'LINE': seg(L, ap(T, num(e.g, 10), num(e.g, 20)), ap(T, num(e.g, 11), num(e.g, 21))); break;
      case 'LWPOLYLINE': {
        const vs: { x: number; y: number; b: number }[] = [];
        for (const [c, v] of e.g) {
          if (c === 10) vs.push({ x: parseFloat(v), y: 0, b: 0 });
          else if (c === 20 && vs.length) vs[vs.length - 1].y = parseFloat(v);
          else if (c === 42 && vs.length) vs[vs.length - 1].b = parseFloat(v);
        }
        polilinha(L, T, vs, (num(e.g, 70) & 1) === 1);
        break;
      }
      case 'POLYLINE': {
        const fl = num(e.g, 70);
        if (fl & (16 | 64)) { conta(r.ignoradas, 'POLYLINE (malha 3D)'); break; }
        const vs = (e.vertices ?? []).filter((v) => !(num(v, 70) & 16)).map((v) => ({ x: num(v, 10), y: num(v, 20), b: num(v, 42) }));
        polilinha(L, T, vs, (fl & 1) === 1);
        break;
      }
      case 'ARC': arco(L, T, num(e.g, 10), num(e.g, 20), num(e.g, 40), num(e.g, 50), num(e.g, 51)); break;
      case 'CIRCLE': arco(L, T, num(e.g, 10), num(e.g, 20), num(e.g, 40), 0, 360); break;
      case 'ELLIPSE': {
        const cx = num(e.g, 10), cy = num(e.g, 20), mx = num(e.g, 11), my = num(e.g, 21), ra = num(e.g, 40, 1);
        let t0 = num(e.g, 41, 0), t1 = num(e.g, 42, 2 * Math.PI);
        if (t1 <= t0) t1 += 2 * Math.PI;
        const n = Math.max(12, Math.ceil(((t1 - t0) * 180) / Math.PI / 7.5));
        const pt = (t: number): [number, number] => ap(T, cx + mx * Math.cos(t) - my * ra * Math.sin(t), cy + my * Math.cos(t) + mx * ra * Math.sin(t));
        for (let k = 0; k < n; k++) seg(L, pt(t0 + ((t1 - t0) * k) / n), pt(t0 + ((t1 - t0) * (k + 1)) / n));
        break;
      }
      case 'SPLINE': {
        const fit = e.g.filter((q) => q[0] === 11).length ? [11, 21] : [10, 20];
        const xs = e.g.filter((q) => q[0] === fit[0]).map((q) => parseFloat(q[1])), ys = e.g.filter((q) => q[0] === fit[1]).map((q) => parseFloat(q[1]));
        for (let k = 0; k + 1 < Math.min(xs.length, ys.length); k++) seg(L, ap(T, xs[k], ys[k]), ap(T, xs[k + 1], ys[k + 1]));
        conta(r.aproximadas, 'SPLINE');
        break;
      }
      case 'TEXT': case 'MTEXT': {
        const [x, y] = ap(T, num(e.g, 10), num(e.g, 20));
        const s = Math.sqrt(Math.abs(T[0] * T[3] - T[1] * T[2]));
        const dirx = e.g.some((q) => q[0] === 11) && e.tipo === 'MTEXT' ? (Math.atan2(num(e.g, 21), num(e.g, 11)) * 180) / Math.PI : num(e.g, 50);
        const raw = e.tipo === 'MTEXT' ? limparMtext(e.g.filter((q) => q[0] === 3).map((q) => q[1]).join('') + str(e.g, 1)) : str(e.g, 1);
        if (raw) camada(L).textos.push({ x, y, h: num(e.g, 40, 0.2) * s, rot: dirx + (Math.atan2(T[1], T[0]) * 180) / Math.PI, t: raw });
        break;
      }
      case 'INSERT': case 'DIMENSION': {
        const b = blocos.get(str(e.g, 2));
        if (!b) { conta(r.ignoradas, `${e.tipo} sem bloco`); break; }
        if (prof > 12) { conta(r.ignoradas, 'bloco aninhado demais'); break; }
        const base = tr(-b.bx, -b.by);
        if (e.tipo === 'DIMENSION') { for (const x of b.ents) emitir(x, mul(T, base), L, prof + 1); break; }
        const ix = num(e.g, 10), iy = num(e.g, 20), fx = num(e.g, 41, 1), fy = num(e.g, 42, fx), ang = num(e.g, 50);
        const nc = Math.max(1, num(e.g, 70, 1)), nr = Math.max(1, num(e.g, 71, 1)), dc = num(e.g, 44), dr = num(e.g, 45);
        for (let ci = 0; ci < nc; ci++) for (let ri = 0; ri < nr; ri++) {
          const M1 = mul(T, mul(tr(ix, iy), mul(rot(ang), mul(tr(ci * dc, ri * dr), mul(sc(fx, fy), base)))));
          for (const x of b.ents) emitir(x, M1, L, prof + 1);
        }
        break;
      }
      default: conta(r.ignoradas, e.tipo);
    }
  };
  for (const e of ents) emitir(e, ID, null, 0);

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const bb = (x: number, y: number) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
  for (const c of Object.values(r.camadas)) {
    for (let k = 0; k < c.linhas.length; k += 2) bb(c.linhas[k], c.linhas[k + 1]);
    for (let k = 0; k < c.arcos.length; k += 5) { bb(c.arcos[k] - c.arcos[k + 2], c.arcos[k + 1] - c.arcos[k + 2]); bb(c.arcos[k] + c.arcos[k + 2], c.arcos[k + 1] + c.arcos[k + 2]); }
    for (const t of c.textos) bb(t.x, t.y);
  }
  if (Number.isFinite(x0)) r.bbox = [x0, y0, x1, y1];
  return r;
}
