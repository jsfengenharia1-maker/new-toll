// Sapata com vários pilares (associada) e sapata aparada por limites (frente FU, fatia FU3).
// Base retangular centrada no ponto de referência do elemento (a resultante das cargas, ou o ponto informado), recortada
// pelos limites (polígono convexo), com tensões sem tração na região de contato (polígono) para cada combinação rara
// (e os dois sinais dos momentos dos pilares, que o módulo não distingue), altura rígida pelas relações balanço/altura e
// vão/altura, flexão por faixas pelo diagrama de momentos (pressão do solo menos as cargas dos pilares): positivo nas
// seções a 0,15·a dentro da face dos pilares extremos (CEB-70, como na sapata isolada) e negativo entre pilares, com
// malha superior só quando a tração do concreto simples passa de fctd. Compressão diagonal em cada pilar.
// Mesmo resultado (`FootingResult`) da sapata isolada. Unidades: kN, m, kPa; tensões de cálculo em MPa.
import { barArea, beamFlexure, concrete } from './concrete';
import { anchorageLength, bestBars, ceil05, spacedBars } from './rebar';
import { pesoMinimoImposto, polyPressure, sigmaProvider, type FlexDir, type FootingInput, type FootingResult, type Pt } from './footings';
import type { FCol, FCombo, FGroup, FoundationParams } from './piles';
import { memoriaAtiva } from './memoria/registrador';

type Seg = { a: Pt; b: Pt };

// ---------------------------------------------------------------- geometria

const cross = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area = (poly: Pt[]) => poly.reduce((s, a, i) => { const z = poly[(i + 1) % poly.length]; return s + a[0] * z[1] - z[0] * a[1]; }, 0) / 2;

/** Recorta o polígono (convexo) pelo semiplano `sinal·cross(a, b, p) ≥ 0`. */
function recortaSemiplano(poly: Pt[], a: Pt, b: Pt, sinal: number): Pt[] {
  const out: Pt[] = [];
  const f = (q: Pt) => sinal * cross(a, b, q);
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const fp = f(P), fq = f(Q);
    if (fp >= -1e-12) out.push(P);
    if ((fp > 1e-12 && fq < -1e-12) || (fp < -1e-12 && fq > 1e-12)) { const t = fp / (fp - fq); out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
  }
  return out;
}

/** O segmento atravessa o interior do polígono convexo (Cyrus-Beck; trecho interno > tol)? */
export function segmentoCortaPoligono(poly: Pt[], a: Pt, b: Pt, tol = 1e-6): boolean {
  const ccw = area(poly) > 0 ? 1 : -1;
  let t0 = 0, t1 = 1;
  const d: Pt = [b[0] - a[0], b[1] - a[1]];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    // interior: ccw·cross(P, Q, X) > 0
    const num = ccw * cross(P, Q, a), den = ccw * ((Q[0] - P[0]) * d[1] - (Q[1] - P[1]) * d[0]);
    if (Math.abs(den) < 1e-14) { if (num <= 0) return false; continue; }
    const t = -num / den;
    if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 >= t1) return false;
  }
  return (t1 - t0) * Math.hypot(d[0], d[1]) > tol;
}

const dentroTodo = (poly: Pt[], pts: Pt[], tol = 1e-6) => {
  const ccw = area(poly) > 0 ? 1 : -1;
  return pts.every((q) => poly.every((P, i) => ccw * cross(P, poly[(i + 1) % poly.length], q) >= -tol));
};

const retangulo = (A: number, B: number): Pt[] => [[-A / 2, -B / 2], [A / 2, -B / 2], [A / 2, B / 2], [-A / 2, B / 2]];
const cantos = (c: FCol): Pt[] => [[c.x - c.ap / 2, c.y - c.bp / 2], [c.x + c.ap / 2, c.y - c.bp / 2], [c.x + c.ap / 2, c.y + c.bp / 2], [c.x - c.ap / 2, c.y + c.bp / 2]];

/**
 * Retângulo recortado pelos limites que o atravessam, cada um pelo lado onde está o ponto de referência (a origem):
 * a parte com o(s) pilar(es) fica. Devolve o polígono e os índices dos limites que cortaram.
 */
export function recorteLimites(rect: Pt[], limits: Seg[], ignorar: Set<number> = new Set()): { poly: Pt[]; usados: number[] } {
  let poly = rect;
  const usados: number[] = [];
  limits.forEach((l, i) => {
    if (ignorar.has(i)) return;
    if (!segmentoCortaPoligono(poly, l.a, l.b)) return;
    const lado = cross(l.a, l.b, [0, 0]);
    if (Math.abs(lado) < 1e-9 * Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1])) return; // a referência sobre o limite
    const novo = recortaSemiplano(poly, l.a, l.b, lado > 0 ? 1 : -1);
    if (novo.length >= 3) { poly = novo; usados.push(i); }
  });
  return { poly, usados };
}

/** Maior aresta da árvore geradora mínima dos centros (maior vão entre pilares vizinhos, m). */
export function maiorVao(cols: Pick<FCol, 'x' | 'y'>[]): number {
  if (cols.length < 2) return 0;
  const dentro = new Set([0]);
  let maior = 0;
  while (dentro.size < cols.length) {
    let best = Infinity, bj = -1;
    for (const i of dentro) cols.forEach((c, j) => { if (!dentro.has(j)) { const d = Math.hypot(c.x - cols[i].x, c.y - cols[i].y); if (d < best) { best = d; bj = j; } } });
    dentro.add(bj);
    maior = Math.max(maior, best);
  }
  return maior;
}

// ---------------------------------------------------------------- casos de carga

interface Caso { label: string; ic: number; sx: number; sy: number; N: number; Mx: number; My: number; combo: FCombo }

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

/**
 * Casos da verificação: as combinações determinantes (maior e menor N, maiores excentricidades) com os dois sinais dos
 * momentos dos pilares (o sinal da convenção de momentos não é distinguido: valem os dois, com os sinais relativos entre
 * pilares preservados). Momentos em relação à origem: M = ±ΣM_i + ΣN_i·posição_i.
 */
export function casosDoGrupo(cols: FCol[], combos: FCombo[]): Caso[] {
  const tot = combos.map((cb, ic) => {
    const N = sum(cb.cols.map((c) => c.N));
    const a = sum(cb.cols.map((c) => c.My)), b = sum(cb.cols.map((c, i) => c.N * cols[i].x));
    const a2 = sum(cb.cols.map((c) => c.Mx)), b2 = sum(cb.cols.map((c, i) => c.N * cols[i].y));
    const ex = N > 1e-9 ? (Math.abs(a) + Math.abs(b)) / N : 0, ey = N > 1e-9 ? (Math.abs(a2) + Math.abs(b2)) / N : 0;
    return { ic, N, a, b, a2, b2, ex, ey };
  });
  const pick = new Set<number>();
  const arg = (f: (t: (typeof tot)[number]) => number, dir: 1 | -1) => tot.reduce((bi, t, i) => (dir * f(t) > dir * f(tot[bi]) ? i : bi), 0);
  [arg((t) => t.N, 1), arg((t) => t.N, -1), arg((t) => t.ex, 1), arg((t) => t.ey, 1), arg((t) => t.ex + t.ey, 1)].forEach((i) => pick.add(i));
  const out: Caso[] = [];
  for (const i of [...pick].sort((p, q) => p - q)) {
    const t = tot[i], cb = combos[i];
    const sxs = Math.abs(t.a) > 1e-9 ? [1, -1] : [1], sys = Math.abs(t.a2) > 1e-9 ? [1, -1] : [1];
    for (const sx of sxs) for (const sy of sys) out.push({ label: cb.label, ic: i, sx, sy, N: t.N, My: sx * t.a + t.b, Mx: sy * t.a2 + t.b2, combo: cb });
  }
  return out;
}

// ---------------------------------------------------------------- diagrama de momentos por faixa

export interface Faixa { Mpos: number; xPos: number; Mneg: number; xNeg: number; larguraPos: number; larguraNeg: number; cPos: number }

/** Transpõe x ↔ y (para tratar a direção y com o mesmo código). */
const transp = (poly: Pt[]): Pt[] => poly.map(([x, y]) => [y, x]);

/**
 * Faixa ao longo do eixo u (x, ou y se transposto) de largura total w (perpendicular): q(u) = ∫σ dw; diagrama M(u) =
 * pressão à esquerda − cargas dos pilares à esquerda (distribuídas na largura do pilar) + conjugados.
 * `cols`: posição u, largura a, N, conjugado c já com sinal. v = plano de tensões de cálculo (σ = v0 + v1·u + v2·w).
 */
export function faixa(poly: Pt[], v: [number, number, number], cols: { u: number; a: number; N: number; c: number }[], secE: number, secD: number): Faixa & { M: number[]; us: number[] } {
  const us0 = poly.map((q) => q[0]);
  const umin = Math.min(...us0), umax = Math.max(...us0);
  const n = 800, du = (umax - umin) / n;
  const corda = (u: number): [number, number] | null => {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], Q = poly[(i + 1) % poly.length];
      if ((P[0] - u) * (Q[0] - u) > 0) continue;
      if (Math.abs(Q[0] - P[0]) < 1e-12) { lo = Math.min(lo, P[1], Q[1]); hi = Math.max(hi, P[1], Q[1]); continue; }
      const t = (u - P[0]) / (Q[0] - P[0]), w = P[1] + t * (Q[1] - P[1]);
      lo = Math.min(lo, w); hi = Math.max(hi, w);
    }
    return hi > lo ? [lo, hi] : null;
  };
  const larg = (u: number) => { const c = corda(u); return c ? c[1] - c[0] : 0; };
  const q = (u: number) => {
    const c = corda(u);
    if (!c) return 0;
    let [w1, w2] = c;
    const a = v[0] + v[1] * u;
    if (Math.abs(v[2]) < 1e-14) return a > 0 ? a * (w2 - w1) : 0;
    const w0 = -a / v[2];
    if (v[2] > 0) w1 = Math.max(w1, w0); else w2 = Math.min(w2, w0);
    return w2 > w1 ? a * (w2 - w1) + (v[2] * (w2 * w2 - w1 * w1)) / 2 : 0;
  };
  const us: number[] = [], qs: number[] = [];
  for (let i = 0; i <= n; i++) { const u = umin + i * du; us.push(u); qs.push(q(u)); }
  // Q(u) = ∫q, Mp(u) = ∫Q (trapézios)
  const Q: number[] = [0], Mp: number[] = [0];
  for (let i = 1; i <= n; i++) { Q.push(Q[i - 1] + ((qs[i - 1] + qs[i]) / 2) * du); Mp.push(Mp[i - 1] + ((Q[i - 1] + Q[i]) / 2) * du); }
  const F1 = (u: number, c: { u: number; a: number }) => { const s = u - (c.u - c.a / 2); return s <= 0 ? 0 : s <= c.a ? (s * s) / (2 * c.a) : s - c.a / 2; };
  const ramp = (u: number, c: { u: number; a: number }) => Math.min(1, Math.max(0, (u - (c.u - c.a / 2)) / c.a));
  const M = us.map((u, i) => Mp[i] - cols.reduce((s, c) => s + c.N * F1(u, c) - c.c * ramp(u, c), 0));
  const at = (arr: number[], u: number) => { const x = Math.min(n, Math.max(0, (u - umin) / du)), i = Math.min(n - 1, Math.floor(x)), f = x - i; return arr[i] * (1 - f) + arr[i + 1] * f; };
  // balanços de pressão além das seções extremas: esquerda, Mp(secE); direita, ∫ q(t)·(t − secD) dt de secD ao fim
  const MesqSec = secE > umin ? at(Mp, secE) : 0;
  let dir = 0;
  if (secD < umax) for (let i = 0; i < n; i++) { const t0 = us[i], t1 = us[i + 1]; if (t1 <= secD) continue; const a0 = Math.max(t0, secD); const f0 = a0 === t0 ? qs[i] : at(qs, a0); dir += ((f0 * (a0 - secD) + qs[i + 1] * (t1 - secD)) / 2) * (t1 - a0); }
  let Mpos = Math.max(MesqSec, dir), xPos = MesqSec >= dir ? secE : secD;
  const cPos = MesqSec >= dir ? secE - umin : umax - secD;
  // vãos livres entre pilares vizinhos (ordenados por u): menor e maior M
  const ord = [...cols].sort((p, r) => p.u - r.u);
  let Mneg = 0, xNeg = 0;
  for (let i = 0; i + 1 < ord.length; i++) {
    const u0 = ord[i].u + ord[i].a / 2, u1 = ord[i + 1].u - ord[i + 1].a / 2;
    if (u1 <= u0) continue;
    for (let k = 0; k <= 40; k++) {
      const u = u0 + ((u1 - u0) * k) / 40, m = at(M, u);
      if (m < Mneg) { Mneg = m; xNeg = u; }
      if (m > Mpos) { Mpos = m; xPos = u; }
    }
  }
  return { Mpos: Math.max(0, Mpos), xPos, Mneg, xNeg, larguraPos: larg(xPos), larguraNeg: larg(xNeg || (umin + umax) / 2), cPos, M, us };
}

// ---------------------------------------------------------------- detalhe para a memória

/** Um diagrama de faixa (caso × direção) com a entrada e o resultado de `faixa`, guardado só com a memória ligada. */
export interface DetFaixa { caso: number; ax: 'x' | 'y'; Nd: number; v: [number, number, number]; col: { u: number; a: number; N: number; c: number }[]; secE: number; secD: number; Mpos: number; xPos: number; Mneg: number; xNeg: number; larguraPos: number; larguraNeg: number; cPos: number; residuo: number }
export interface DetGrupo {
  casos: { label: string; sx: number; sy: number; N: number; Mx: number; My: number }[]; faixas: DetFaixa[];
  env: Record<'x' | 'y', { Mpos: number; cPos: number; Wpos: number; Mneg: number; Wneg: number }>;
  hBal: number; hVao: number; balanco: number; vao: number; lbCol: number; W0: number;
}
/** Detalhes do último `FootingResult` de sapata associada (só com a memória ligada; o resultado não muda). */
export const detalheGrupo = new WeakMap<object, DetGrupo>();

// ---------------------------------------------------------------- dimensionamento

export const isGroup = (inp: Pick<FootingInput, 'group'>): inp is { group: FGroup } => !!inp.group;

/**
 * Sapata de vários pilares e/ou aparada por limites. O peso próprio entra como ftPP % de N (refeito com o peso do
 * concreto, até convergir), como na sapata isolada.
 */
export function designFootingGroup(inp: FootingInput, p: FoundationParams): FootingResult | { ok: false; messages: string[] } {
  const g = inp.group!;
  const Nk = Math.max(...g.combos.map((cb) => sum(cb.cols.map((c) => c.N))));
  const W0 = (p.ftPP / 100) * Nk;
  let r = sizeGroup(inp, p, W0);
  // dimensões impostas: o peso do concreto é conhecido; o percentual pode ser pouco (o peso também estabiliza a base)
  const Wi = pesoMinimoImposto(inp.fixed, p, !!inp.constH);
  if (!('A' in r) && Wi > W0 + 1e-6) r = sizeGroup(inp, p, Math.ceil(Wi));
  let ciclos = 0;
  for (let it = 0; it < 6 && 'A' in r && r.Wconc > r.W + 0.5; it++) { r = sizeGroup(inp, p, Math.ceil(r.Wconc)); ciclos++; }
  if (ciclos && !('A' in r)) r.messages.push('O peso do concreto da sapata cresce mais que a capacidade da base (balanços grandes e altura constante): o limite deixa pouca base; use viga de equilíbrio, sapata de altura variável ou desloque o limite.');
  if ('A' in r && r.W > W0 + 1e-6) r.messages.unshift(`Peso do concreto (${r.Wconc.toFixed(0)} kN) maior que ${p.ftPP}% de N (${W0.toFixed(0)} kN): usado o peso calculado, ${r.W.toFixed(0)} kN.`);
  return r;
}

function sizeGroup(inp: FootingInput, p: FoundationParams, W: number): FootingResult | { ok: false; messages: string[] } {
  const g = inp.group!;
  const cols = g.cols;
  const messages: string[] = [];
  const casos = casosDoGrupo(cols, g.combos);
  const Nmin = Math.min(...g.combos.map((cb) => sum(cb.cols.map((c) => c.N))));
  if (Nmin + W <= 0) return { ok: false, messages: ['N mín + peso próprio ≤ 0: a sapata não resiste à tração. Use estacas ou tubulão.'] };
  const sigmaFor = sigmaProvider(inp.boring, p);
  const minComp = p.ftLevantamento ? 0 : p.ftMinCompressed;
  const cantosCols = cols.flatMap(cantos);
  const limits = g.limits ?? [];

  // limites que cortam pilar ou isolam pilar são ignorados (com aviso)
  const ignorados: { indice: number; motivo: string }[] = [];
  const ignorar = new Set<number>();
  const ext = (f: (q: Pt) => number, m: (...v: number[]) => number) => m(...cantosCols.map(f));
  const xmin = ext((q) => q[0], Math.min), xmax = ext((q) => q[0], Math.max), ymin = ext((q) => q[1], Math.min), ymax = ext((q) => q[1], Math.max);
  const A0 = Math.max(0.6, ceil05(2 * Math.max(Math.abs(xmin), Math.abs(xmax)) + 0.1)), B0 = Math.max(0.6, ceil05(2 * Math.max(Math.abs(ymin), Math.abs(ymax)) + 0.1));
  const lmax = 14, step = 0.05;
  const grande = retangulo(Math.max(A0, 2 * lmax), Math.max(B0, 2 * lmax));
  limits.forEach((l, i) => {
    const corta = cols.find((c) => segmentoCortaPoligono(cantos(c), l.a, l.b));
    if (corta) { ignorar.add(i); ignorados.push({ indice: i, motivo: `corta o pilar ${corta.label}` }); return; }
    if (!segmentoCortaPoligono(grande, l.a, l.b)) return;
    const { poly, usados } = recorteLimites(grande, [l]);
    if (usados.length && !dentroTodo(poly, cantosCols)) { ignorar.add(i); ignorados.push({ indice: i, motivo: 'isola pilar da sapata' }); }
  });

  const regiao = (A: number, B: number) => (limits.length ? recorteLimites(retangulo(A, B), limits, ignorar) : { poly: retangulo(A, B), usados: [] as number[] });

  // casos de verificação: pressão no solo com N + W (o peso no centro da base)
  const avalia = (poly: Pt[], sg: { s: number }) => {
    const out: { label: string; N: number; ex: number; ey: number; sigmaMax: number; sigmaMin: number; compressed: number }[] = [];
    for (const c of casos) {
      const N = c.N + W;
      if (N <= 0) return null;
      const pr = polyPressure(poly, N, c.My / N, c.Mx / N);
      if (!pr || pr.sigmaMax > p.ftEdgeFactor * sg.s + 1e-6 || pr.compressed < minComp - 1e-6) return null;
      out.push({ label: c.label, N, ex: c.My / N, ey: c.Mx / N, sigmaMax: pr.sigmaMax, sigmaMin: pr.sigmaMin, compressed: pr.compressed });
    }
    return out;
  };

  const Nmax = Math.max(...casos.map((c) => c.N + W));
  type Cand = { A: number; B: number; poly: Pt[]; area: number; usados: number[]; bal: number };
  type Achado = Cand & { out: NonNullable<ReturnType<typeof avalia>>; sg: { s: number; spt?: { Nbar: number; Nused: number; from: number; to: number } } };
  const bbox = (poly: Pt[]) => ({ x0: Math.min(...poly.map((q) => q[0])), x1: Math.max(...poly.map((q) => q[0])), y0: Math.min(...poly.map((q) => q[1])), y1: Math.max(...poly.map((q) => q[1])) });
  const balancos = (poly: Pt[]) => { const b = bbox(poly); return [xmin - b.x0, b.x1 - xmax, ymin - b.y0, b.y1 - ymax]; };
  const dim = inp.fixed;
  const razao = cols.length === 1;
  const arr = (v: number) => Math.round(v * 100) / 100;
  /** Candidatos por área crescente (entre as de área até 3 % maior, a de menores balanços). `janela`: só B até `janela` m acima do primeiro que passa na verificação barata, por A. */
  const procurar = (janela: number | null): Achado | null => {
    const cand: Cand[] = [];
    const tenta = (A: number, B: number): boolean => {
      const sgc = dim ? null : sigmaFor(Math.min(A, B));
      if (!dim && sgc && Nmax / (A * B) > sgc.s + 1e-9) return false;
      const { poly, usados } = regiao(A, B);
      if (!dentroTodo(poly, cantosCols)) return false;
      const ar = Math.abs(area(poly));
      if (!dim && sgc && Nmax / ar > sgc.s + 1e-9) return false;
      cand.push({ A, B, poly, area: ar, usados, bal: Math.max(...balancos(poly).map((v) => Math.max(0, v))) });
      return true;
    };
    if (dim) tenta(dim.A, dim.B);
    else for (let A = A0; A <= lmax + 1e-9; A += step) {
      const a = arr(A);
      let primeiro = Infinity;
      for (let B = B0; B <= lmax + 1e-9; B += step) {
        const bb = arr(B);
        if (janela !== null && bb > primeiro + janela + 1e-9) break;
        if (razao && (a / bb > p.ftMaxRatio + 1e-9 || bb / a > p.ftMaxRatio + 1e-9)) continue;
        if (tenta(a, bb) && primeiro === Infinity) primeiro = bb;
      }
    }
    cand.sort((x, y) => x.area - y.area || x.bal - y.bal);
    let best: Achado | null = null;
    let first = Infinity;
    for (const c of cand) {
      if (c.area > first * 1.03) break;
      const sg = sigmaFor(Math.min(c.A, c.B));
      if (!sg) break;
      const out = avalia(c.poly, sg);
      if (!out) continue;
      if (first === Infinity) first = c.area;
      if (!best || c.bal < best.bal - 1e-9) best = { ...c, out, sg };
    }
    return best;
  };
  const best = dim ? procurar(null) : procurar(1.5) ?? procurar(null);
  if (!best) {
    const sg = sigmaFor(1);
    if (!sg) return { ok: false, messages: [`Sem SPT abaixo da cota de apoio (${p.ftDepth} m) para estimar σadm.`] };
    return { ok: false, messages: [dim ? `As dimensões impostas ${dim.A.toFixed(2)} × ${dim.B.toFixed(2)} m não atendem σadm, área comprimida e excentricidade.` : `Nenhuma sapata até ${lmax} × ${lmax} m atende σadm, área comprimida e excentricidade para os pilares ${cols.map((c) => c.label).join(', ')}.`] };
  }
  const { A, B, poly, sg } = best;
  const sigmaSrc = p.ftSigmaMode === 'informada' ? 'informada' : `estimada pelo SPT: N̄/${p.ftSptDiv} MPa (a confirmar)`;
  if (sg.spt && sg.spt.Nbar < 5) messages.push(`N̄ = ${sg.spt.Nbar.toFixed(1)} < 5 no bulbo: solo fraco para sapata (estimativa fora do campo usual).`);
  if (sg.spt && sg.spt.Nbar > p.ftNmaxEst) messages.push(`N̄ = ${sg.spt.Nbar.toFixed(1)} limitado a ${p.ftNmaxEst} na estimativa de σadm.`);

  // ---- altura rígida
  const c = concrete(p.fckFound, p.gammaC);
  const cSimples = concrete(p.fckFound, p.gammaC * p.ftSimplesGamma);
  const fyd = p.fyk / p.gammaS;
  const lbCol = anchorageLength(p.colPhi, c, fyd);
  const gf = p.gammaF;
  const [cL, cR, cB, cT] = balancos(poly).map((v) => Math.max(0, v));
  const balanco = Math.max(cL, cR, cB, cT);
  const vao = maiorVao(cols);
  const hBal = ((2 * balanco) / 3) * (1.5 / p.ftBalancoAltura);
  const hVao = vao / p.ftVaoAltura;

  // momentos de cálculo por faixa: envoltória dos casos (pressão sem o peso próprio, N e M sem majorar além de γf)
  const dOf = (h: number) => h - p.cover - 0.01;
  let residuo = 0;
  let detFaixas: DetFaixa[] = [];
  const memoria = !!memoriaAtiva();
  const flexao = () => {
    detFaixas = [];
    const env: Record<'x' | 'y', { Mpos: number; cPos: number; Wpos: number; Mneg: number; Wneg: number }> = { x: { Mpos: 0, cPos: 0, Wpos: 0, Mneg: 0, Wneg: 0 }, y: { Mpos: 0, cPos: 0, Wpos: 0, Mneg: 0, Wneg: 0 } };
    for (const cs of casos) {
      const icaso = casos.indexOf(cs);
      const Nd = gf * cs.N;
      const pr = polyPressure(poly, Nd, cs.My / cs.N, cs.Mx / cs.N);
      if (!pr) continue;
      const cb = cs.combo;
      for (const ax of ['x', 'y'] as const) {
        const T = ax === 'x';
        const pol = T ? poly : transp(poly);
        const v: [number, number, number] = T ? pr.v : [pr.v[0], pr.v[2], pr.v[1]];
        const col = cols.map((cl, i) => ({ u: T ? cl.x : cl.y, a: T ? cl.ap : cl.bp, N: gf * cb.cols[i].N, c: gf * (T ? cs.sx * cb.cols[i].My : cs.sy * cb.cols[i].Mx) }));
        const secE = Math.min(...col.map((q) => q.u - 0.35 * q.a)), secD = Math.max(...col.map((q) => q.u + 0.35 * q.a));
        const f = faixa(pol, v, col, secE, secD);
        // fechamento do diagrama (equilíbrio de momentos da faixa): resíduo no fim / maior momento
        const escala = Math.max(1, ...f.M.map((m) => Math.abs(m)));
        residuo = Math.max(residuo, Math.abs(f.M[f.M.length - 1]) / escala);
        if (memoria) detFaixas.push({ caso: icaso, ax, Nd, v, col, secE, secD, Mpos: f.Mpos, xPos: f.xPos, Mneg: f.Mneg, xNeg: f.xNeg, larguraPos: f.larguraPos, larguraNeg: f.larguraNeg, cPos: f.cPos, residuo: Math.abs(f.M[f.M.length - 1]) / escala });
        const e = env[ax];
        if (f.Mpos > e.Mpos) { e.Mpos = f.Mpos; e.cPos = Math.max(f.cPos, 0); e.Wpos = f.larguraPos; }
        if (f.Mneg < e.Mneg) { e.Mneg = f.Mneg; e.Wneg = f.larguraNeg; }
      }
    }
    return env;
  };
  const hTension = (env: ReturnType<typeof flexao>) => Math.max(...(['x', 'y'] as const).flatMap((ax) => [
    env[ax].Wpos > 0 ? Math.sqrt((6 * (env[ax].Mpos / 1000)) / (env[ax].Wpos * cSimples.fctd)) : 0,
    env[ax].Wneg > 0 ? Math.sqrt((6 * (Math.abs(env[ax].Mneg) / 1000)) / (env[ax].Wneg * cSimples.fctd)) : 0,
  ]));
  let h: number;
  if (dim?.h) h = dim.h;
  else {
    h = ceil05(Math.max(hBal, hVao, lbCol + p.cover));
    if (inp.simples) h = ceil05(Math.max(h, hTension(flexao())));
  }
  const env = flexao();
  const d = dOf(h);
  if (dim?.h) {
    if (h < lbCol + p.cover - 1e-9) messages.push(`Altura imposta ${h.toFixed(2)} m < lb + c = ${(lbCol + p.cover).toFixed(2)} m (ancoragem das barras do pilar).`);
  }
  const rigida = h >= hBal - 1e-9 && h >= hVao - 1e-9;

  const dir = (ax: 'x' | 'y'): FlexDir => {
    const e = env[ax];
    const Wd = e.Wpos > 0 ? e.Wpos : (ax === 'x' ? bbox(poly).y1 - bbox(poly).y0 : bbox(poly).x1 - bbox(poly).x0);
    const width = Wd - 2 * p.cover;
    const AsMin = p.ftRhoMin * Wd * h;
    const dEff = e.cPos > 0 ? Math.min(d, 1.5 * e.cPos) : d;
    const base: FlexDir = { Md: e.Mpos, T: 0, As: 0, AsMin: 0, AsAdopt: 0, dEff, bars: null, width };
    // malha superior: só se a tração do concreto simples (fctd × 1,2·γc) for passada pelo momento negativo
    const Wn = e.Wneg > 0 ? e.Wneg : Wd;
    const sigmaTn = Math.abs(e.Mneg) > 0 ? (6 * (Math.abs(e.Mneg) / 1000)) / (Wn * h * h) : 0;
    const needTop = !inp.simples && sigmaTn > cSimples.fctd + 1e-9;
    let top: FlexDir['top'];
    if (Math.abs(e.Mneg) > 0) {
      const AsTop = needTop ? beamFlexure({ kind: 'rect', bw: Wn, h }, false, Math.abs(e.Mneg), d, 0.05, c, fyd).As : 0;
      const AsTopAdopt = needTop ? Math.max(AsTop, p.ftRhoMin * Wn * h) : 0;
      top = { Md: e.Mneg, sigmaT: sigmaTn, fctd: cSimples.fctd, As: AsTop, AsMin: needTop ? p.ftRhoMin * Wn * h : 0, bars: needTop ? bestBars(spacedBars(AsTopAdopt, Wn - 2 * p.cover)) : null, needed: needTop };
    }
    if (inp.simples) {
      const sigmaT = e.Wpos > 0 ? (6 * (e.Mpos / 1000)) / (e.Wpos * h * h) : 0;
      return { ...base, dEff: h, sigmaT: Math.max(sigmaT, sigmaTn), fctd: cSimples.fctd, ...(top ? { top } : {}) };
    }
    const As = e.Mpos > 0 ? beamFlexure({ kind: 'rect', bw: Wd, h: dEff + p.cover + 0.01 }, false, e.Mpos, dEff, 0.05, c, fyd).As : 0;
    const AsAdopt = Math.max(As, p.ftRhoMinReduz ? Math.min(AsMin, (4 / 3) * As) : AsMin);
    const imp = dim?.bars?.[ax];
    if (imp) {
      const ab = barArea(imp.phi), s = imp.s ?? 0.15, n = imp.n ?? Math.max(2, Math.floor(width / s + 1e-9) + 1), Aprov = n * ab;
      return { ...base, As, AsMin, AsAdopt, bars: { phi: imp.phi, n, As: Aprov, spacing: n > 1 ? width / (n - 1) : 0 }, imposed: { phi: imp.phi, s, As: Aprov, ok: Aprov >= AsAdopt - 1e-9 }, ...(top ? { top } : {}) };
    }
    return { ...base, As, AsMin, AsAdopt, bars: bestBars(spacedBars(AsAdopt, width)), ...(top ? { top } : {}) };
  };
  const flex = { x: dir('x'), y: dir('y') };

  // ---- compressão diagonal por pilar
  const tauRd2 = 0.27 * (1 - p.fckFound / 250) * c.fcd;
  const pilares = cols.map((cl, i) => {
    const Ni = Math.max(...g.combos.map((cb) => cb.cols[i].N));
    const Nd = gf * Ni;
    const u0 = 2 * (cl.ap + cl.bp);
    return { label: cl.label, Nd, tauSd0: Nd / 1000 / (u0 * d), tauRd2 };
  });
  const pilarRuim = pilares.find((q) => q.tauSd0 > q.tauRd2 + 1e-9);
  if (pilarRuim) messages.push(`Compressão diagonal no contorno do pilar ${pilarRuim.label}: τSd = ${pilarRuim.tauSd0.toFixed(2)} > τRd2 = ${pilarRuim.tauRd2.toFixed(2)} MPa. Aumente h ou o pilar.`);
  if (!rigida) messages.push(`Sapata associada não rígida: h = ${h.toFixed(2)} m exige balanço ${balanco.toFixed(2)} m ≤ ${p.ftBalancoAltura}·h e vão ${vao.toFixed(2)} m ≤ ${p.ftVaoAltura}·h; o método de sapata flexível com vários pilares não está disponível. Aumente h.`);
  if (!inp.simples && (!flex.x.bars || !flex.y.bars)) messages.push('Armadura de flexão não coube com espaçamento entre 10 e 20 cm.');
  for (const [ax, f] of [['x', flex.x], ['y', flex.y]] as const) {
    if (f.imposed && !f.imposed.ok) messages.push(`Armadura imposta insuficiente na direção ${ax}: φ${String(f.imposed.phi).replace('.', ',')} c/${(f.imposed.s * 100).toFixed(0)} dá ${(f.imposed.As * 1e4).toFixed(2)} cm² < ${(f.AsAdopt * 1e4).toFixed(2)} cm² necessários.`);
    if (inp.simples && f.sigmaT! > f.fctd! + 1e-9) messages.push(`Concreto simples: tração na flexão ${f.sigmaT!.toFixed(2)} MPa > fctd = ${f.fctd!.toFixed(2)} MPa na direção ${ax}. Aumente h.`);
  }
  if (p.ftLevantamento) messages.push(`Descolamento permitido: área comprimida mínima dispensada (menor encontrada ${(Math.min(...best.out.map((o) => o.compressed)) * 100).toFixed(0)} %); a tensão máxima limita.`);
  const methodNotes: string[] = [
    ...(residuo > 0.03 ? [`Diagrama de momentos da faixa fecha com resíduo de ${(residuo * 100).toFixed(1)} % do maior momento (equilíbrio aproximado; verificar).`] : []),
    'Sapata de vários pilares/aparada: faixas pelo diagrama de momentos (pressão do solo menos as cargas dos pilares distribuídas na largura de cada um), seções a 0,15·a dentro da face dos pilares extremos e momento negativo entre pilares (a confirmar).',
    'Momentos dos pilares com os dois sinais (a convenção não é distinguida): vale a envoltória. Peso próprio no centro da base.',
  ];
  if (limits.length) methodNotes.push(`Limites: ${best.usados.length} atuando (${best.usados.map((i) => i + 1).join(', ') || 'nenhum'}); a base é o retângulo ${A.toFixed(2)} × ${B.toFixed(2)} m recortado pelos limites pelo lado dos pilares.`);
  for (const ig of ignorados) methodNotes.push(`Limite ${ig.indice + 1} ignorado: ${ig.motivo}.`);

  // volume: tronco entre a base (região) e o topo (envoltória dos pilares + 5 cm); altura constante: prisma
  const h0 = inp.constH ? h : dim?.h0 ? Math.min(h, dim.h0) : Math.min(h, ceil05(Math.max(h / 3, p.ftH0Min)));
  const A1 = Math.abs(area(poly)), A2 = Math.min(A1, (xmax - xmin + 0.05) * (ymax - ymin + 0.05));
  const volume = inp.constH || !rigida ? A1 * h : A1 * h0 + ((h - h0) / 3) * (A1 + A2 + Math.sqrt(A1 * A2));
  const Wconc = 25 * volume, Wsoil = p.gammaSoil * Math.max(0, A1 * p.ftDepth - volume);
  const anchOk = !dim?.h || h >= lbCol + p.cover - 1e-9;
  const impOk = [flex.x, flex.y].every((f) => !f.imposed || f.imposed.ok);
  const simplesOk = !inp.simples || [flex.x, flex.y].every((f) => f.sigmaT! <= f.fctd! + 1e-9);
  const ok = anchOk && impOk && simplesOk && !pilarRuim && rigida && (inp.simples || (!!flex.x.bars && !!flex.y.bars));
  // pressão de cálculo máxima/mínima (caso de maior pressão)
  const prs = casos.map((cs) => polyPressure(poly, gf * cs.N, cs.My / cs.N, cs.Mx / cs.N)).filter((x): x is NonNullable<typeof x> => !!x);
  const sigmaD = { max: Math.max(...prs.map((x) => x.sigmaMax)), min: Math.min(...prs.map((x) => x.sigmaMin)) };
  // casos: o pior sinal de cada combinação
  const casosOut: FootingResult['cases'] = [];
  for (const o of best.out) { const k = casosOut.findIndex((q) => q.label === o.label); if (k < 0) casosOut.push(o); else if (o.sigmaMax > casosOut[k].sigmaMax) casosOut[k] = o; }
  const out: FootingResult = {
    ok, messages, A, B, W, Wconc, Wsoil, sigmaAdm: sg.s, sigmaSrc, spt: sg.spt ? { Nbar: sg.spt.Nbar, Nused: sg.spt.Nused, from: sg.spt.from, to: sg.spt.to } : undefined,
    cases: casosOut, kind: 'rigida', h, h0, d, hRigid: Math.max(hBal, hVao), lbCol, method: 'ceb70', methodNotes, sigmaD, colOffset: [0, 0],
    ...(dim ? { fixed: true } : {}), ...(inp.simples ? { simples: true } : {}), ...(inp.constH ? { constH: true } : {}), ...(p.ftLevantamento ? { levantamento: true } : {}),
    grupo: {
      cols: cols.map((q) => ({ label: q.label, x: q.x, y: q.y, ap: q.ap, bp: q.bp })), contorno: poly.map((q) => [q[0], q[1]] as [number, number]),
      vao, vaoAltura: h > 0 ? vao / h : 0, balanco, balancoAltura: h > 0 ? balanco / h : 0, pilares, limitesUsados: best.usados, limitesIgnorados: ignorados,
      resultante: [0, 0],
    },
    flex, punch: { tauSd0: Math.max(...pilares.map((q) => q.tauSd0)), tauRd2, applies: false }, volume,
  };
  if (memoria) detalheGrupo.set(out, { casos: casos.map((q) => ({ label: q.label, sx: q.sx, sy: q.sy, N: q.N, Mx: q.Mx, My: q.My })), faixas: detFaixas, env, hBal, hVao, balanco, vao, lbCol, W0: W });
  return out;
}

