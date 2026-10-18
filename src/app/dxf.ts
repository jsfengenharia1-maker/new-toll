// Exportação DXF R12 (AC1009) em texto, gerada à mão, sem dependências.
// Escala real: 1 unidade do desenho = 1 m, nas coordenadas do modelo.
// Símbolos, setas e textos têm tamanho proporcional à extensão do modelo, como no Canvas.
import type { Analysis, CaseResult } from '../core/solver';
import type { Load, Model, Support } from '../core/types';
import { memberSeries, globalDisp, fmt, type Eff } from './results';
import { makeUnits } from './units';
import { autoDims, dimSegments, levelText } from './dims';

export interface DxfLayer { name: string; color: number }

/** Camadas do desenho (cor ACI). */
export const DXF_LAYERS: DxfLayer[] = [
  { name: 'GEOMETRIA', color: 7 },
  { name: 'NOS', color: 8 },
  { name: 'APOIOS', color: 4 },
  { name: 'ROTULAS', color: 2 },
  { name: 'CARGAS', color: 30 },
  { name: 'COTAS', color: 9 },
  { name: 'TEXTOS', color: 7 },
  { name: 'DIAG_N', color: 3 },
  { name: 'DIAG_V', color: 5 },
  { name: 'DIAG_M', color: 1 },
  { name: 'DEFORMADA', color: 6 },
];

export interface DxfInput {
  model: Model;
  /** Análise do modelo; sem ela (ou com erro) o DXF sai sem diagramas. */
  analysis?: Analysis | null;
  /** Resultado ativo: um caso, uma combinação ou o conjunto de uma envoltória. */
  results?: CaseResult[];
  resultLabel?: string;
  /** Caso cujas cargas vão para a camada CARGAS. */
  caseId?: number;
  /** Multiplicador da escala dos diagramas (o mesmo controle do Canvas). */
  diagScale?: number;
  /** Momento no lado tracionado (padrão) ou no comprimido. */
  mTension?: boolean;
  /** Cotas automáticas (padrão: sim). */
  dims?: boolean;
}

type V2 = [number, number];

/** Número com ponto decimal, sem zeros sobrando. */
function num(v: number): string {
  if (!Number.isFinite(v) || Math.abs(v) < 1e-12) return '0.0';
  const s = v.toFixed(6).replace(/0+$/, '');
  return s.endsWith('.') ? `${s}0` : s;
}

/** DXF R12 só aceita texto de 8 bits; para não depender da página de código, sai em ASCII. */
export function dxfText(s: string): string {
  const map: Record<string, string> = { '·': '-', '−': '-', '–': '-', '—': '-', '×': 'x', 'δ': 'd', 'θ': 'teta', 'γ': 'gama', '→': '->', '±': '%%p', '°': '%%d', '²': '2', '³': '3', 'Ø': '%%c', 'ø': '%%c' };
  return s.replace(/[·−–—×δθγ→±°²³Øø]/g, (c) => map[c]).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?');
}

class Writer {
  private out: string[] = [];
  x0 = Infinity; y0 = Infinity; x1 = -Infinity; y1 = -Infinity;
  pair(code: number, value: string | number) { this.out.push(String(code).padStart(3), typeof value === 'number' ? num(value) : value); }
  int(code: number, v: number) { this.out.push(String(code).padStart(3), String(Math.round(v))); }
  private grow(x: number, y: number) { this.x0 = Math.min(this.x0, x); this.y0 = Math.min(this.y0, y); this.x1 = Math.max(this.x1, x); this.y1 = Math.max(this.y1, y); }
  private xy(x: number, y: number, c = 0) { this.pair(10 + c, x); this.pair(20 + c, y); this.pair(30 + c, 0); this.grow(x, y); }
  line(layer: string, a: V2, b: V2) {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) return;
    this.pair(0, 'LINE'); this.pair(8, layer); this.xy(a[0], a[1]); this.xy(b[0], b[1], 1);
  }
  circle(layer: string, c: V2, r: number) {
    this.pair(0, 'CIRCLE'); this.pair(8, layer); this.xy(c[0], c[1]); this.pair(40, r);
    this.grow(c[0] - r, c[1] - r); this.grow(c[0] + r, c[1] + r);
  }
  /** h: 0 esquerda, 1 centro, 2 direita · v: 0 linha de base, 2 meio · rot em graus (anti-horário). */
  text(layer: string, p: V2, height: number, s: string, h: 0 | 1 | 2 = 0, v: 0 | 2 = 0, rot = 0) {
    const t = dxfText(s);
    if (!t.trim()) return;
    this.pair(0, 'TEXT'); this.pair(8, layer); this.xy(p[0], p[1]); this.pair(40, height); this.pair(1, t);
    if (rot) this.pair(50, rot);
    if (h || v) { this.int(72, h); this.xy(p[0], p[1], 1); this.int(73, v); }
  }
  poly(layer: string, pts: V2[], closed = false) {
    if (pts.length < 2) return;
    this.pair(0, 'POLYLINE'); this.pair(8, layer); this.int(66, 1); this.pair(10, 0); this.pair(20, 0); this.pair(30, 0); this.int(70, closed ? 1 : 0);
    for (const p of pts) { this.pair(0, 'VERTEX'); this.pair(8, layer); this.xy(p[0], p[1]); }
    this.pair(0, 'SEQEND'); this.pair(8, layer);
  }
  take(): string[] { const o = this.out; this.out = []; return o; }
}

/** Gera o DXF do modelo (geometria, apoios, rótulas, cargas, cotas) e dos diagramas do resultado ativo. */
export function buildDxf(inp: DxfInput): string {
  const m = inp.model;
  const U = makeUnits(m.units?.force);
  const w = new Writer();
  const xs = m.nodes.map((n) => n.x), ys = m.nodes.map((n) => n.y);
  const bx0 = xs.length ? Math.min(...xs) : 0, bx1 = xs.length ? Math.max(...xs) : 1;
  const by0 = ys.length ? Math.min(...ys) : 0, by1 = ys.length ? Math.max(...ys) : 1;
  const ext = Math.max(bx1 - bx0, by1 - by0, 1);
  // "pixel" equivalente do Canvas enquadrado (~560 px para a extensão do modelo)
  const px = ext / 560;
  const th = 10 * px;
  const node = new Map(m.nodes.map((n) => [n.id, n]));

  const arrow = (layer: string, tip: V2, dir: V2, len: number) => {
    const tail: V2 = [tip[0] - dir[0] * len, tip[1] - dir[1] * len];
    const hx = -dir[0] * 7 * px, hy = -dir[1] * 7 * px, qx = -dir[1] * 3.5 * px, qy = dir[0] * 3.5 * px;
    w.line(layer, tail, tip);
    w.poly(layer, [tip, [tip[0] + hx + qx, tip[1] + hy + qy], [tip[0] + hx - qx, tip[1] + hy - qy]], true);
  };
  const momentGlyph = (layer: string, c: V2, ccw: boolean, r: number) => {
    const a0 = -Math.PI * 0.75, a1 = Math.PI * 0.75, n = 18;
    const pts: V2[] = Array.from({ length: n + 1 }, (_, k) => { const a = a0 + ((a1 - a0) * k) / n; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; });
    w.poly(layer, pts);
    const a = ccw ? a1 : a0;
    const end: V2 = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    const dir: V2 = ccw ? [-Math.sin(a), Math.cos(a)] : [Math.sin(a), -Math.cos(a)];
    arrow(layer, end, dir, 0);
  };

  // ---------- geometria, nós e rótulas ----------
  for (const mem of m.members) {
    const p = node.get(mem.ni), q = node.get(mem.nj);
    if (!p || !q) continue;
    w.line('GEOMETRIA', [p.x, p.y], [q.x, q.y]);
    w.text('GEOMETRIA', [(p.x + q.x) / 2 + 6 * px, (p.y + q.y) / 2 + 6 * px], th * 0.9, String(mem.id));
    const L = Math.hypot(q.x - p.x, q.y - p.y) || 1, ux = (q.x - p.x) / L, uy = (q.y - p.y) / L;
    const ci: V2 = [p.x + ux * 7 * px, p.y + uy * 7 * px], cj: V2 = [q.x - ux * 7 * px, q.y - uy * 7 * px];
    if (mem.hingeI) w.circle('ROTULAS', ci, 3.6 * px);
    if (mem.hingeJ) w.circle('ROTULAS', cj, 3.6 * px);
    const semi = (h?: boolean, k?: number) => !h && !!k && k > 0;
    if (semi(mem.hingeI, mem.springI)) { w.circle('ROTULAS', ci, 3.6 * px); w.text('ROTULAS', [ci[0] + 5 * px, ci[1] - 12 * px], th * 0.8, `k=${fmt(U.k.to(mem.springI!), 0)} ${U.k.label}`); }
    if (semi(mem.hingeJ, mem.springJ)) { w.circle('ROTULAS', cj, 3.6 * px); w.text('ROTULAS', [cj[0] + 5 * px, cj[1] - 12 * px], th * 0.8, `k=${fmt(U.k.to(mem.springJ!), 0)} ${U.k.label}`); }
  }
  for (const n of m.nodes) {
    const h = 3 * px;
    w.poly('NOS', [[n.x - h, n.y - h], [n.x + h, n.y - h], [n.x + h, n.y + h], [n.x - h, n.y + h]], true);
    w.text('NOS', [n.x - 6 * px, n.y - 14 * px], th * 0.9, String(n.id), 2);
    if (n.support) supportGlyph(w, n.x, n.y, n.support, px);
  }

  // ---------- cargas do caso ----------
  const kase = m.cases.find((c) => c.id === inp.caseId) ?? m.cases[0];
  if (kase) drawLoads(w, m, kase.id, px, th, U, arrow, momentGlyph);

  // ---------- cotas ----------
  if (inp.dims !== false) {
    for (const c of autoDims(m, 56 * px, 26 * px)) {
      const s0 = c.stops[0].v, s1 = c.stops[c.stops.length - 1].v, t = 4 * px;
      if (c.dir === 'h') {
        const y = c.at;
        w.line('COTAS', [s0 - t, y], [s1 + t, y]);
        for (const p of c.stops) { w.line('COTAS', [p.v, p.from - 8 * px], [p.v, y - 5 * px]); w.line('COTAS', [p.v - t, y - t], [p.v + t, y + t]); }
        for (const sg of dimSegments(c)) if (sg.len >= 22 * px) w.text('COTAS', [(sg.a + sg.b) / 2, y + 4 * px], th, fmt(sg.len), 1);
      } else {
        const x = c.at;
        w.line('COTAS', [x, s0 - t], [x, s1 + t]);
        for (const p of c.stops) {
          w.line('COTAS', [p.from - 8 * px, p.v], [x + 5 * px, p.v]);
          w.line('COTAS', [x - t, p.v - t], [x + t, p.v + t]);
          if (c.kind === 'level') w.text('COTAS', [x + 5 * px, p.v + 4 * px], th * 0.9, levelText(p.v));
        }
        for (const sg of dimSegments(c)) if (sg.len >= 22 * px) w.text('COTAS', [x - 5 * px, (sg.a + sg.b) / 2], th, fmt(sg.len), 1, 0, 90);
      }
    }
  }

  // cotas manuais (sempre exportadas)
  for (const d of m.dims ?? []) {
    const len = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
    if (len < 1e-9) continue;
    const ux = (d.x2 - d.x1) / len, uy = (d.y2 - d.y1) / len, nx = -uy, ny = ux, sg = Math.sign(d.off) || 1, t = 4 * px;
    const A: V2 = [d.x1 + nx * d.off, d.y1 + ny * d.off], B: V2 = [d.x2 + nx * d.off, d.y2 + ny * d.off];
    w.line('COTAS', [d.x1, d.y1], [A[0] + nx * sg * t, A[1] + ny * sg * t]);
    w.line('COTAS', [d.x2, d.y2], [B[0] + nx * sg * t, B[1] + ny * sg * t]);
    w.line('COTAS', A, B);
    for (const P of [A, B]) w.line('COTAS', [P[0] - (ux - nx) * t, P[1] - (uy - ny) * t], [P[0] + (ux - nx) * t, P[1] + (uy - ny) * t]);
    let ang = (Math.atan2(uy, ux) * 180) / Math.PI;
    if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    w.text('COTAS', [(A[0] + B[0]) / 2 + nx * sg * 4 * px, (A[1] + B[1]) / 2 + ny * sg * 4 * px], th, fmt(len), 1, 0, ang);
  }

  // ---------- diagramas do resultado ativo ----------
  const a = inp.analysis, results = inp.results ?? [];
  const notes: string[] = [];
  if (a && !a.prep.error && results.length) {
    const scaleMul = inp.diagScale ?? 1;
    const env = results.length > 1;
    const nodesA = a.prep.model.nodes;
    for (const e of ['N', 'V', 'M'] as Eff[]) {
      const layer = `DIAG_${e}`;
      const series = a.prep.members.map((pm) => memberSeries(results, pm.index, pm.L, e));
      let maxAbs = 0;
      for (const s of series) s.xs.forEach((_, j) => { maxAbs = Math.max(maxAbs, Math.abs(s.max[j]), Math.abs(s.min[j])); });
      if (maxAbs < 1e-9) continue;
      const k = (0.11 * ext * scaleMul) / maxAbs;
      notes.push(`${layer}: 1 m do desenho = ${fmt(U.eff(e).to(1 / k))} ${U.eff(e).label}`);
      const sign = e === 'M' && inp.mTension !== false ? -1 : 1;
      const boxes: [number, number, number, number][] = [];
      a.prep.members.forEach((pm, i) => {
        const s = series[i], p0 = nodesA[pm.i], nx = -pm.s, ny = pm.c;
        const pt = (x: number, v: number): V2 => [p0.x + pm.c * x + nx * sign * v * k, p0.y + pm.s * x + ny * sign * v * k];
        const base = (x: number): V2 => [p0.x + pm.c * x, p0.y + pm.s * x];
        for (const arr of env ? [s.max, s.min] : [s.max]) {
          const pts = s.xs.map((x, j) => pt(x, arr[j]));
          w.poly(layer, pts);
          w.line(layer, base(0), pts[0]);
          w.line(layer, base(pm.L), pts[pts.length - 1]);
          let jm = 0; arr.forEach((v, j) => { if (Math.abs(v) > Math.abs(arr[jm])) jm = j; });
          for (const j of new Set([0, arr.length - 1, jm])) {
            const v = arr[j];
            if (Math.abs(v) < 1e-3 * maxAbs) continue;
            const [lx, ly] = pt(s.xs[j], v);
            const off = Math.sign(v * sign) || 1;
            const tx = lx + nx * off * 10 * px, ty = ly + ny * off * 10 * px;
            const txt = fmt(U.eff(e).to(v)), hw = txt.length * th * 0.35, hh = th * 0.6;
            if (boxes.some(([bx, by, bw, bh]) => Math.abs(bx - tx) < bw + hw && Math.abs(by - ty) < bh + hh)) continue;
            boxes.push([tx, ty, hw, hh]);
            w.text(layer, [tx, ty], th, txt, 1, 2);
          }
        }
      });
    }
    // deformada
    let maxD = 0;
    const samples = results.map((r) => a.prep.members.map((pm) => Array.from({ length: 21 }, (_, q) => {
      const x = (pm.L * q) / 20, d = globalDisp(a, r, pm.index, x);
      maxD = Math.max(maxD, Math.hypot(d[0], d[1]));
      return [x, d] as const;
    })));
    if (maxD > 0) {
      const amp = (0.07 * ext * scaleMul) / maxD;
      notes.push(`DEFORMADA: deslocamentos ampliados ${fmt(amp, 0)} vezes`);
      samples.forEach((perMember) => perMember.forEach((pts, i) => {
        const pm = a.prep.members[i], p0 = nodesA[pm.i];
        w.poly('DEFORMADA', pts.map(([x, d]): V2 => [p0.x + pm.c * x + d[0] * amp, p0.y + pm.s * x + d[1] * amp]));
      }));
      if (results.length === 1) {
        const r = results[0];
        nodesA.forEach((n, kk) => {
          const dx = r.u[kk * 3], dy = r.u[kk * 3 + 1];
          if (Math.hypot(dx, dy) < 1e-3 * maxD) return;
          w.text('DEFORMADA', [n.x + dx * amp + 8 * px, n.y + dy * amp + 8 * px], th, `${fmt(Math.hypot(dx, dy) * 1000)} mm`);
        });
      }
    }
  }

  // ---------- textos de identificação ----------
  const title = [
    m.name,
    `Unidades: comprimentos em m; forcas em ${U.F.label}, momentos em ${U.M.label}`,
    kase ? `Camada CARGAS: caso ${kase.name}` : '',
    notes.length ? `Diagramas: ${inp.resultLabel ?? 'resultado ativo'}${inp.mTension !== false ? ' (M no lado tracionado)' : ' (M no lado comprimido)'}` : '',
    ...notes,
  ].filter(Boolean);
  const ty0 = by1 + 80 * px + (title.length - 1) * th * 1.7;
  title.forEach((s, i) => w.text('TEXTOS', [bx0, ty0 - i * th * 1.7], i === 0 ? th * 1.4 : th, s));

  // ---------- montagem ----------
  const entities = w.take();
  const hasExt = Number.isFinite(w.x0);
  const e0: V2 = hasExt ? [w.x0, w.y0] : [0, 0], e1: V2 = hasExt ? [w.x1, w.y1] : [1, 1];
  const h = new Writer();
  h.pair(999, dxfText('Statikos - DXF R12, unidades em metros'));
  h.pair(0, 'SECTION'); h.pair(2, 'HEADER');
  h.pair(9, '$ACADVER'); h.pair(1, 'AC1009');
  h.pair(9, '$DWGCODEPAGE'); h.pair(3, 'ANSI_1252');
  h.pair(9, '$INSBASE'); h.pair(10, 0); h.pair(20, 0); h.pair(30, 0);
  h.pair(9, '$EXTMIN'); h.pair(10, e0[0]); h.pair(20, e0[1]); h.pair(30, 0);
  h.pair(9, '$EXTMAX'); h.pair(10, e1[0]); h.pair(20, e1[1]); h.pair(30, 0);
  h.pair(9, '$LIMMIN'); h.pair(10, e0[0]); h.pair(20, e0[1]);
  h.pair(9, '$LIMMAX'); h.pair(10, e1[0]); h.pair(20, e1[1]);
  h.pair(9, '$LUNITS'); h.int(70, 2);
  h.pair(9, '$LUPREC'); h.int(70, 3);
  h.pair(9, '$TEXTSIZE'); h.pair(40, th);
  h.pair(9, '$TEXTSTYLE'); h.pair(7, 'STANDARD');
  h.pair(9, '$CLAYER'); h.pair(8, '0');
  h.pair(0, 'ENDSEC');
  h.pair(0, 'SECTION'); h.pair(2, 'TABLES');
  h.pair(0, 'TABLE'); h.pair(2, 'LTYPE'); h.int(70, 1);
  h.pair(0, 'LTYPE'); h.pair(2, 'CONTINUOUS'); h.int(70, 0); h.pair(3, 'Solid line'); h.int(72, 65); h.int(73, 0); h.pair(40, 0);
  h.pair(0, 'ENDTAB');
  const layers = [{ name: '0', color: 7 }, ...DXF_LAYERS];
  h.pair(0, 'TABLE'); h.pair(2, 'LAYER'); h.int(70, layers.length);
  for (const l of layers) { h.pair(0, 'LAYER'); h.pair(2, l.name); h.int(70, 0); h.int(62, l.color); h.pair(6, 'CONTINUOUS'); }
  h.pair(0, 'ENDTAB');
  h.pair(0, 'TABLE'); h.pair(2, 'STYLE'); h.int(70, 1);
  h.pair(0, 'STYLE'); h.pair(2, 'STANDARD'); h.int(70, 0); h.pair(40, 0); h.pair(41, 1); h.pair(50, 0); h.int(71, 0); h.pair(42, th); h.pair(3, 'txt'); h.pair(4, '');
  h.pair(0, 'ENDTAB');
  h.pair(0, 'ENDSEC');
  h.pair(0, 'SECTION'); h.pair(2, 'ENTITIES');
  const head = h.take();
  h.pair(0, 'ENDSEC'); h.pair(0, 'EOF');
  return [...head, ...entities, ...h.take()].join('\r\n') + '\r\n';
}

/** Símbolos de apoio em linhas (mesma geometria do Canvas, em "pixels" convertidos para metros). */
function supportGlyph(w: Writer, x: number, y: number, s: Support, px: number) {
  const outer = -(s.angle ?? 0);
  // rotação no sentido do SVG (y para baixo), depois conversão para o mundo (y para cima)
  const rot = (p: V2, deg: number): V2 => { const r = (deg * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r); return [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c]; };
  const T = (inner: number) => (p: V2): V2 => { const q = rot(rot(p, inner), outer); return [x + q[0] * px, y - q[1] * px]; };
  const L = 'APOIOS';
  const seg = (t: (p: V2) => V2, a: V2, b: V2) => w.line(L, t(a), t(b));
  if (s.ux === 'fixed' && s.uy === 'fixed' && s.rz === 'fixed') {
    const t = T(0);
    seg(t, [-14, 0], [14, 0]);
    for (let k = -12; k <= 12; k += 6) seg(t, [k, 0], [k - 5, 7]);
    return;
  }
  const tri = (inner: number, roller: boolean) => {
    const t = T(inner);
    w.poly(L, ([[0, 0], [-8, 13], [8, 13]] as V2[]).map(t), true);
    if (roller) seg(t, [-11, 17], [11, 17]);
    else { seg(t, [-11, 13], [11, 13]); for (const k of [-8, -3, 2, 7]) seg(t, [k, 13], [k - 4, 18]); }
  };
  const spring = (inner: number) => {
    const t = T(inner);
    w.poly(L, ([[0, 0], [0, 4], [-5, 6], [5, 10], [-5, 14], [5, 18], [0, 20], [0, 24]] as V2[]).map(t));
    seg(t, [-8, 24], [8, 24]);
  };
  if (s.ux === 'fixed' && s.uy === 'fixed') tri(0, false);
  else { if (s.uy === 'fixed') tri(0, true); if (s.ux === 'fixed') tri(90, true); }
  if (s.uy === 'spring') spring(0);
  if (s.ux === 'spring') spring(90);
  const t0 = T(0);
  if (s.rz === 'fixed') w.poly(L, ([[-6, -6], [6, -6], [6, 6], [-6, 6]] as V2[]).map(t0), true);
  if (s.rz === 'spring') w.poly(L, Array.from({ length: 19 }, (_, k): V2 => { const a = Math.PI + (1.5 * Math.PI * k) / 18; return [9 * Math.cos(a), 9 * Math.sin(a)]; }).map(t0));
}

function drawLoads(
  w: Writer, m: Model, caseId: number, px: number, th: number, U: ReturnType<typeof makeUnits>,
  arrow: (layer: string, tip: V2, dir: V2, len: number) => void,
  momentGlyph: (layer: string, c: V2, ccw: boolean, r: number) => void,
) {
  const L = 'CARGAS';
  const node = new Map(m.nodes.map((n) => [n.id, n]));
  const memById = new Map(m.members.map((k) => [k.id, k]));
  const loads = m.loads.filter((l) => l.caseId === caseId);
  let qmax = 0;
  for (const l of loads) if (l.kind === 'dist') qmax = Math.max(qmax, Math.hypot(l.qxi, l.qyi), Math.hypot(l.qxj, l.qyj));
  const kq = qmax > 0 ? (34 * px) / qmax : 0;
  loads.forEach((l: Load) => {
    if (l.kind === 'nodal') {
      const n = node.get(l.node); if (!n) return;
      if (l.fx) { const d = Math.sign(l.fx); arrow(L, [n.x - d * 5 * px, n.y], [d, 0], 40 * px); w.text(L, [n.x - d * 48 * px, n.y + 6 * px], th, fmt(U.F.to(Math.abs(l.fx))), 1); }
      if (l.fy) { const d = -Math.sign(l.fy); arrow(L, [n.x, n.y + d * 5 * px], [0, -d], 40 * px); w.text(L, [n.x + 6 * px, n.y + d * 46 * px], th, fmt(U.F.to(Math.abs(l.fy))), 0, 2); }
      if (l.mz) { momentGlyph(L, [n.x, n.y], l.mz > 0, 16 * px); w.text(L, [n.x + 20 * px, n.y + 18 * px], th, fmt(U.M.to(Math.abs(l.mz)))); }
    } else if (l.kind === 'presc') {
      const n = node.get(l.node); if (!n) return;
      const parts = [l.dx ? `dx ${fmt(l.dx * 1000)} mm` : '', l.dy ? `dy ${fmt(l.dy * 1000)} mm` : '', l.rz ? `rot ${fmt(l.rz, 4)} rad` : ''].filter(Boolean);
      w.text(L, [n.x + 10 * px, n.y - 30 * px], th, `recalque ${parts.join(' ')}`);
    } else if (l.kind === 'selfWeight') {
      // anotado no título
    } else {
      const mem = memById.get(l.member); if (!mem) return;
      const p = node.get(mem.ni), q = node.get(mem.nj); if (!p || !q) return;
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1, c = (q.x - p.x) / len, s = (q.y - p.y) / len;
      if (l.kind === 'dist') {
        const tails: V2[] = [];
        const nArr = Math.max(4, Math.min(16, Math.round(len / (34 * px))));
        for (let k = 0; k <= nArr; k++) {
          const t = k / nArr;
          let qx = l.qxi + (l.qxj - l.qxi) * t, qy = l.qyi + (l.qyj - l.qyi) * t;
          if (l.system === 'local') { const gx = c * qx - s * qy, gy = s * qx + c * qy; qx = gx; qy = gy; }
          const b: V2 = [p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t];
          const v: V2 = [qx * kq, qy * kq], vl = Math.hypot(v[0], v[1]);
          tails.push([b[0] - v[0], b[1] - v[1]]);
          if (vl > 3 * px) arrow(L, b, [v[0] / vl, v[1] / vl], vl);
        }
        w.poly(L, tails);
        const mid = tails[Math.floor(tails.length / 2)];
        const same = l.qxi === l.qxj && l.qyi === l.qyj;
        const mag = (x: number, y: number) => fmt(U.q.to(Math.hypot(x, y)));
        const sys = l.system === 'projected' ? ' (proj.)' : l.system === 'local' ? ' (local)' : '';
        w.text(L, [mid[0], mid[1] + 6 * px], th, `${same ? mag(l.qxi, l.qyi) : `${mag(l.qxi, l.qyi)} -> ${mag(l.qxj, l.qyj)}`} ${U.q.label}${sys}`, 1);
      } else if (l.kind === 'thermal') {
        w.text(L, [(p.x + q.x) / 2, (p.y + q.y) / 2 - 16 * px], th, `DT sup ${fmt(l.tTop, 1)} / inf ${fmt(l.tBot, 1)} %%dC`, 1);
      } else if (l.kind === 'endMoment') {
        if (l.mi) { momentGlyph(L, [p.x + c * len * 0.12, p.y + s * len * 0.12], l.mi > 0, 11 * px); w.text(L, [p.x + c * len * 0.12 + 14 * px, p.y + s * len * 0.12 + 12 * px], th, fmt(U.M.to(Math.abs(l.mi)))); }
        if (l.mj) { momentGlyph(L, [q.x - c * len * 0.12, q.y - s * len * 0.12], l.mj > 0, 11 * px); w.text(L, [q.x - c * len * 0.12 + 14 * px, q.y - s * len * 0.12 + 12 * px], th, fmt(U.M.to(Math.abs(l.mj)))); }
      }
    }
  });
  const sw = loads.find((l) => l.kind === 'selfWeight');
  if (sw && sw.kind === 'selfWeight') {
    const ys = m.nodes.map((n) => n.y), xs = m.nodes.map((n) => n.x);
    w.text(L, [Math.min(...xs), Math.max(...ys) + 60 * px], th, `Peso proprio x ${fmt(sw.factor)} incluido neste caso`);
  }
}
