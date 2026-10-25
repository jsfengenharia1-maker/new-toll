// Punção e cortante das lajes (frente N2d), NBR 6118:2014, 19.4 e 19.5.
//
// Contornos críticos: C no perímetro do pilar (compressão diagonal, τRd2), C′ a 2d (tração diagonal, τRd1 sem
// armadura e τRd3 com) e C″ a 2d da última linha de armadura. Os contornos são o retângulo (ou círculo) afastado de
// "a" das faces, com cantos arredondados, recortado pela laje (bordas livres: pilares de borda e de canto) e sem o
// trecho coberto por furos a menos de 8d (retas tangentes ao furo pelo centro do pilar). A tensão solicitante é
//   τSd = FSd/(u·d) + Σ K·MSd1/(Wp·d),   MSd1 = máx(0, MSd − FSd·e*),
// com Wp = ∫|e| dℓ (módulo plástico do contorno, calculado sobre o contorno recortado, em torno do seu centroide) e
// e* a distância do centroide do contorno ao centro do pilar (pilares de borda e de canto: contorno reduzido u*).
// Armadura de punção em linhas radiais (estribos/grampos ou conectores), primeira linha a ≤ 0,5d e entre linhas
// ≤ 0,75d, até que o contorno C″ dispense armadura; varredura de cortante a cada 0,75d (19.4.1) com armadura
// transversal pela 19.4.2. Unidades: kN, m, MPa (tensões); áreas de aço em cm² nas saídas.
import { barArea, type Concrete } from '../concrete';
import { areaPoligono, dentroPoligono, type P } from '../geom/faces';
import { recorteConvexo } from '../geom/recorte';
import type { AnaliseEdificio, GrelhaPavimento } from './analitico';
import type { Resultado3 } from '../fe3d';
import { forcaBasePilar, type ResultadoRadier } from './baseElastica';
import type { CombinacaoEd } from './combinacoes';
import { casosHorizontais } from './desaprumo';
import { secaoBase } from './fundacao';
import type { ResultadoLaje } from './dimensionamento';
import type { OpcoesCalculo } from './opcoes';
import { origem, COMB_ELU_LAJE, type Origem } from './origem';
import { acoDe, cobrimentoFundacao, cobrimentoLaje, concretoDe, gamas } from './materiais';
import { GAMA_CONCRETO } from './lajes';
import { vrd1 } from './vigotas';
import { vigaTocaPilar } from './vigas';
import { fm, memoriaAtiva } from '../memoria/registrador';
import { registrarPuncaoRepetida, registrarSolicitacaoPuncao, registrarSolicitacaoRadier, registrarVerificacaoPuncao, type DetSolicitacaoRadier } from '../memoria/puncao';
import { anguloNoLance, casosDaObra, centroNoLance, centroPilar, dimsSecao, lancesDoPilar, secaoNoLance, trechosViga, type BuildingModel, type Laje, type Pilar, type Viga } from './types';

// ---------------------------------------------------------------- geometria

export interface Apoio { centro: P; c1: number; c2: number; circular: boolean; angulo: number }
export interface Regiao { poligonos: P[][]; furos: P[][] }
export type Seg = [P, P];
export type Lado = 'u+' | 'u-' | 'v+' | 'v-';

const eixos = (angulo: number): [P, P] => { const a = (angulo * Math.PI) / 180; return [[Math.cos(a), Math.sin(a)], [-Math.sin(a), Math.cos(a)]]; };

/** Curva fechada (anti-horária) afastada de `a` das faces do apoio: retângulo de cantos arredondados ou círculo. */
export function curvaAfastada(ap: Apoio, a: number): P[] {
  const [ux, vx] = eixos(ap.angulo), [cx, cy] = ap.centro;
  const g = (u: number, v: number): P => [cx + u * ux[0] + v * vx[0], cy + u * ux[1] + v * vx[1]];
  if (ap.circular) {
    const r = ap.c1 / 2 + a, n = 120;
    return Array.from({ length: n }, (_, k) => g(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n)));
  }
  const hu = ap.c1 / 2, hv = ap.c2 / 2;
  if (a <= 1e-9) return [g(hu, -hv), g(hu, hv), g(-hu, hv), g(-hu, -hv)];
  const N = 40, pts: P[] = [];
  for (const [cu, cv, t0] of [[hu, -hv, -90], [hu, hv, 0], [-hu, hv, 90], [-hu, -hv, 180]] as const)
    for (let i = 0; i <= N; i++) { const t = ((t0 + (90 * i) / N) * Math.PI) / 180; pts.push(g(cu + a * Math.cos(t), cv + a * Math.sin(t))); }
  return pts;
}

function distBorda(q: P, poly: P[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], z = poly[(i + 1) % poly.length], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)) : 0;
    d = Math.min(d, Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]));
  }
  return d;
}

/** O ponto está na laje (dentro de algum polígono, fora dos furos e fora das bordas, onde não há concreto de laje)? */
export function naLaje(q: P, reg: Regiao): boolean {
  if (!reg.poligonos.some((p) => dentroPoligono(q, p) && distBorda(q, p) > 1e-6)) return false;
  return !reg.furos.some((f) => dentroPoligono(q, f) || distBorda(q, f) <= 1e-6);
}

export function interseccao(a: P, z: P, p: P, q: P): number | null {
  const rx = z[0] - a[0], ry = z[1] - a[1], sx = q[0] - p[0], sy = q[1] - p[1], den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-14) return null;
  const t = ((p[0] - a[0]) * sy - (p[1] - a[1]) * sx) / den, u = ((p[0] - a[0]) * ry - (p[1] - a[1]) * rx) / den;
  return t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null;
}

/** Segmentos da curva fechada que estão na laje (cortados nas bordas e nos furos), na ordem do percurso. */
export function recortar(curva: P[], reg: Regiao): Seg[] {
  const out: Seg[] = [], arestas: Seg[] = [];
  for (const poly of [...reg.poligonos, ...reg.furos]) for (let i = 0; i < poly.length; i++) arestas.push([poly[i], poly[(i + 1) % poly.length]]);
  for (let i = 0; i < curva.length; i++) {
    const a = curva[i], z = curva[(i + 1) % curva.length], ts = [0, 1];
    for (const [p, q] of arestas) { const t = interseccao(a, z, p, q); if (t !== null) ts.push(t); }
    ts.sort((x, y) => x - y);
    const em = (t: number): P => [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])];
    for (let k = 0; k + 1 < ts.length; k++) {
      if (ts[k + 1] - ts[k] < 1e-9) continue;
      const m = em((ts[k] + ts[k + 1]) / 2);
      if (naLaje(m, reg)) out.push([em(ts[k]), em(ts[k + 1])]);
    }
  }
  return out;
}

const comp = (s: Seg) => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
const meio = (s: Seg): P => [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2];
const volta = (x: number) => { while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; };

/** Distância (m) de um ponto ao retângulo/círculo do apoio (0 dentro). */
function distAoApoio(q: P, ap: Apoio): number {
  const [ux, vx] = eixos(ap.angulo), dx = q[0] - ap.centro[0], dy = q[1] - ap.centro[1];
  const u = dx * ux[0] + dy * ux[1], v = dx * vx[0] + dy * vx[1];
  if (ap.circular) return Math.max(0, Math.hypot(u, v) - ap.c1 / 2);
  return Math.hypot(Math.max(0, Math.abs(u) - ap.c1 / 2), Math.max(0, Math.abs(v) - ap.c2 / 2));
}

/** Furos a menos de `dist` da face do pilar: retira os trechos do contorno entre as tangentes ao furo traçadas do centro do pilar. */
export function descontarFuros(pecas: Seg[], ap: Apoio, furos: P[][], dist: number): Seg[] {
  let out = pecas;
  for (const f of furos) {
    let perto = Infinity;
    for (let i = 0; i < f.length; i++) { const a = f[i], z = f[(i + 1) % f.length]; for (let k = 0; k <= 8; k++) perto = Math.min(perto, distAoApoio([a[0] + ((z[0] - a[0]) * k) / 8, a[1] + ((z[1] - a[1]) * k) / 8], ap)); }
    if (perto >= dist - 1e-9 || dentroPoligono(ap.centro, f)) continue;
    let cx = 0, cy = 0;
    for (const q of f) { cx += q[0]; cy += q[1]; }
    const ref = Math.atan2(cy / f.length - ap.centro[1], cx / f.length - ap.centro[0]);
    const rel = f.map((q) => volta(Math.atan2(q[1] - ap.centro[1], q[0] - ap.centro[0]) - ref)), lo = Math.min(...rel), hi = Math.max(...rel);
    // os segmentos são cortados nas duas tangentes (semirretas pelo centro) e o que fica entre elas sai
    const dentroCunha = (q: P) => { const r = volta(Math.atan2(q[1] - ap.centro[1], q[0] - ap.centro[0]) - ref); return r >= lo - 1e-9 && r <= hi + 1e-9; };
    const dirs: P[] = [lo, hi].map((r) => [Math.cos(ref + r), Math.sin(ref + r)] as P);
    const novos: Seg[] = [];
    for (const [a, z] of out) {
      const ts = [0, 1];
      for (const dr of dirs) {
        const rx = z[0] - a[0], ry = z[1] - a[1], den = rx * dr[1] - ry * dr[0];
        if (Math.abs(den) < 1e-14) continue;
        const t = ((ap.centro[0] - a[0]) * dr[1] - (ap.centro[1] - a[1]) * dr[0]) / den, w = ((ap.centro[0] - a[0]) * ry - (ap.centro[1] - a[1]) * rx) / den;
        if (t > 1e-9 && t < 1 - 1e-9 && w > 0) ts.push(t); // w > 0: a semirreta parte do centro no sentido de `dr`
      }
      ts.sort((x, y) => x - y);
      const em = (t: number): P => [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])];
      for (let k = 0; k + 1 < ts.length; k++) if (ts[k + 1] - ts[k] > 1e-9 && !dentroCunha(em((ts[k] + ts[k + 1]) / 2))) novos.push([em(ts[k]), em(ts[k + 1])]);
    }
    out = novos;
  }
  return out;
}

/** Lados do pilar sem laje logo além da face (borda livre a menos de 0,5d da face). */
export function ladosLivres(ap: Apoio, reg: Regiao, d: number): Lado[] {
  const [ux, vx] = eixos(ap.angulo), out: Lado[] = [];
  const sonda = (s: number, ax: P, ext: number): P => [ap.centro[0] + ax[0] * s * (ext / 2 + 0.5 * d), ap.centro[1] + ax[1] * s * (ext / 2 + 0.5 * d)];
  for (const [lado, ax, s, ext] of [['u+', ux, 1, ap.c1], ['u-', ux, -1, ap.c1], ['v+', vx, 1, ap.circular ? ap.c1 : ap.c2], ['v-', vx, -1, ap.circular ? ap.c1 : ap.c2]] as const)
    if (!naLaje(sonda(s, ax, ext), reg)) out.push(lado);
  return out;
}

/** Tipo do pilar pelo número de lados livres: nenhum = interno; um = de borda; dois ou mais = de canto. */
export const tipoApoio = (livres: Lado[]): 'interno' | 'borda' | 'canto' => (livres.length === 0 ? 'interno' : livres.length === 1 ? 'borda' : 'canto');

export interface PropsContorno { u: number; centroide: P; Wp: [number, number] }
/** Comprimento, centroide e módulos plásticos Wp = ∫|e| dℓ do contorno recortado, nas direções u e v (eixos do pilar). */
export function propriedadesContorno(pecas: Seg[], angulo: number): PropsContorno {
  const u = pecas.reduce((s, p) => s + comp(p), 0);
  if (u < 1e-9) return { u: 0, centroide: [0, 0], Wp: [0, 0] };
  const cent: P = [pecas.reduce((s, p) => s + comp(p) * meio(p)[0], 0) / u, pecas.reduce((s, p) => s + comp(p) * meio(p)[1], 0) / u];
  const ax = eixos(angulo);
  const Wp = ax.map((e) => pecas.reduce((s, p) => {
    const e1 = (p[0][0] - cent[0]) * e[0] + (p[0][1] - cent[1]) * e[1], e2 = (p[1][0] - cent[0]) * e[0] + (p[1][1] - cent[1]) * e[1], L = comp(p);
    return s + (e1 * e2 >= 0 ? (L * (Math.abs(e1) + Math.abs(e2))) / 2 : (L * (e1 * e1 + e2 * e2)) / (2 * (Math.abs(e1) + Math.abs(e2))));
  }, 0)) as [number, number];
  return { u, centroide: cent, Wp };
}

/** Polilinhas contínuas a partir dos segmentos (para desenhar). */
export function polilinhas(pecas: Seg[]): P[][] {
  const out: P[][] = [];
  for (const [a, z] of pecas) {
    const ult = out.at(-1);
    if (ult && Math.hypot(ult.at(-1)![0] - a[0], ult.at(-1)![1] - a[1]) < 1e-7) ult.push(z); else out.push([a, z]);
  }
  // o percurso fechado pode ter cortado a primeira polilinha: junta o fim ao começo
  if (out.length > 1) { const p0 = out[0], pn = out.at(-1)!; if (Math.hypot(pn.at(-1)![0] - p0[0][0], pn.at(-1)![1] - p0[0][1]) < 1e-7) { out[0] = [...pn, ...p0.slice(1)]; out.pop(); } }
  return out.map((l) => l.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)] as P));
}

/** Área de laje (m²) dentro da curva convexa (laje menos furos). */
export function areaDentro(curva: P[], reg: Regiao): number {
  const ccw = areaPoligono(curva) >= 0 ? curva : [...curva].reverse();
  const A = (polys: P[][]) => polys.reduce((s, p) => { const r = recorteConvexo(p, ccw); return s + (r.length >= 3 ? Math.abs(areaPoligono(r)) : 0); }, 0);
  return Math.max(0, A(reg.poligonos) - A(reg.furos));
}

// ---------------------------------------------------------------- resistências e coeficientes

/** K da Tabela 19.2 (fração do momento transmitida por cisalhamento) em função de C1/C2, interpolado. */
export function coefK(r: number): number {
  const T: [number, number][] = [[0.5, 0.45], [1, 0.6], [2, 0.7], [3, 0.8]];
  if (r <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (r <= T[i][0]) return T[i - 1][1] + ((r - T[i - 1][0]) / (T[i][0] - T[i - 1][0])) * (T[i][1] - T[i - 1][1]);
  return T.at(-1)![1];
}

/** K nas direções u e v do pilar: C1/C2 com C1 na direção da excentricidade; eixo paralelo a uma borda livre: C1/(2C2). Circular: 0,6. */
export function fatoresK(ap: Apoio, livres: Lado[]): [number, number] {
  if (ap.circular) return [0.6, 0.6];
  const livreU = livres.some((l) => l.startsWith('u')), livreV = livres.some((l) => l.startsWith('v'));
  return [coefK(ap.c1 / ap.c2 / (livreV ? 2 : 1)), coefK(ap.c2 / ap.c1 / (livreU ? 2 : 1))];
}

/** τRd2 = 0,27·αv2·fcd (MPa), NBR 6118, 19.5.3.1. */
export const tauRd2 = (c: Concrete) => 0.27 * c.av2 * c.fcd;
const base1 = (d: number, rho: number, fck: number) => (1 + Math.sqrt(20 / (d * 100))) * Math.cbrt(100 * rho * fck);
/** τRd1 = 0,13·(1 + √(20/d))·(100·ρ·fck)^(1/3) (MPa; d em cm), NBR 6118, 19.5.3.2. */
export const tauRd1 = (c: Concrete, d: number, rho: number) => 0.13 * base1(d, rho, c.fck);
/** Parcela do concreto de τRd3: 0,10·(1 + √(20/d))·(100·ρ·fck)^(1/3) (MPa), NBR 6118, 19.5.3.3. */
export const tauRd3c = (c: Concrete, d: number, rho: number) => 0.10 * base1(d, rho, c.fck);

// ---------------------------------------------------------------- verificação de um apoio

export interface EntradaPuncao {
  ap: Apoio; reg: Regiao;
  /** Altura útil média (m) e altura da laje (m). */
  d: number; h: number;
  /** Força de punção (kN) e momentos que a transmitem por excentricidade em u e em v (kN·m, módulos). */
  F: number; M: [number, number];
  /** Carga de cálculo da laje (kN/m²; radier: pressão do solo), para a varredura de cortante. */
  qd: number;
  /** Desconta de FSd a carga distribuída (qd) dentro de cada contorno (radier: reação do solo; NBR 6118, 19.5.2.1). */
  descontar?: boolean;
  /**
   * Cubetas da laje nervurada (E3d): polígonos em que só resta a capa; os trechos do contorno dentro deles saem (só as nervuras e
   * as zonas maciças resistem ao cisalhamento no contorno). Ausente = laje cheia.
   */
  excluir?: P[][];
  /** Memória detalhada (MD4): `verificarPuncao` devolve em `det` os intermediários que o cálculo não guarda. Só com a memória ligada. */
  detalhar?: boolean;
}

export interface ParametrosPuncao {
  c: Concrete; rho: number;
  /** fywd da armadura de punção (MPa), já limitado (250 estribos, 300 conectores). */
  fywd: number; tipoArm: 'estribo' | 'conector';
  /** Distância da primeira linha e entre linhas, em múltiplos de d (≤ 0,5 e ≤ 0,75). */
  s0f: number; srf: number;
  /** Passo da varredura de cortante em múltiplos de d (0 = sem varredura) e distância de furos (múltiplos de d). */
  passoCortante: number; furoDist: number;
  /** Armadura manual (grupos do usuário) do apoio: capacidade por anel (cm²) e número de anéis. */
  manual?: { Asw: number; aneis: number };
  /** Bitolas permitidas para a armadura de punção (mm), já limitadas a h/20. */
  bitolas: number[];
}

/** Caixas envolventes dos polígonos, guardadas por lista (a mesma lista de cubetas é consultada em cada contorno). */
const CAIXAS = new WeakMap<P[][], [number, number, number, number][]>();
const caixasDe = (polis: P[][]) => {
  let c = CAIXAS.get(polis);
  if (!c) {
    c = polis.map((poly) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1] as [number, number, number, number]; });
    CAIXAS.set(polis, c);
  }
  return c;
};

/**
 * Retira dos segmentos os trechos que estão dentro de algum dos polígonos (cortados nas suas arestas). Cada segmento só
 * consulta os polígonos cuja caixa envolvente toca a caixa do segmento (mesmo resultado, sem varrer todas as cubetas).
 */
export function tirarDentro(pecas: Seg[], polis: P[][]): Seg[] {
  const out: Seg[] = [], caixas = caixasDe(polis), m = 1e-6;
  for (const [a, z] of pecas) {
    const sx0 = Math.min(a[0], z[0]) - m, sx1 = Math.max(a[0], z[0]) + m, sy0 = Math.min(a[1], z[1]) - m, sy1 = Math.max(a[1], z[1]) + m;
    const perto: P[][] = [];
    for (let k = 0; k < polis.length; k++) { const c = caixas[k]; if (c[0] <= sx1 && c[2] >= sx0 && c[1] <= sy1 && c[3] >= sy0) perto.push(polis[k]); }
    const ts = [0, 1];
    for (const poly of perto) for (let i = 0; i < poly.length; i++) { const t = interseccao(a, z, poly[i], poly[(i + 1) % poly.length]); if (t !== null) ts.push(t); }
    ts.sort((x, y) => x - y);
    const em = (t: number): P => [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])];
    for (let k = 0; k + 1 < ts.length; k++) {
      if (ts[k + 1] - ts[k] < 1e-9) continue;
      const mp = em((ts[k] + ts[k + 1]) / 2);
      if (!perto.some((poly) => dentroPoligono(mp, poly))) out.push([em(ts[k]), em(ts[k + 1])]);
    }
  }
  return out;
}

export interface Tensao { a: number; u: number; tau: number; Wp: [number, number]; K: [number, number]; M1: [number, number]; e: [number, number]; pecas: Seg[] }

/** Tensão de cisalhamento de cálculo (MPa) no contorno afastado de `a`. */
export function tensaoNoContorno(ent: EntradaPuncao, livres: Lado[], a: number, furoDist: number): Tensao {
  const { ap, reg, d } = ent;
  let pecas = recortar(curvaAfastada(ap, a), reg);
  const F = ent.descontar ? Math.max(0, ent.F - ent.qd * areaDentro(curvaAfastada(ap, a), reg)) : ent.F;
  pecas = descontarFuros(pecas, ap, reg.furos, furoDist * d);
  if (ent.excluir?.length) pecas = tirarDentro(pecas, ent.excluir);
  const pr = propriedadesContorno(pecas, ap.angulo);
  const K = fatoresK(ap, livres);
  const [ux, vx] = eixos(ap.angulo);
  const dc: P = [pr.centroide[0] - ap.centro[0], pr.centroide[1] - ap.centro[1]];
  const e: [number, number] = pr.u ? [Math.abs(dc[0] * ux[0] + dc[1] * ux[1]), Math.abs(dc[0] * vx[0] + dc[1] * vx[1])] : [0, 0];
  const M = ap.circular ? ([Math.hypot(ent.M[0], ent.M[1]), 0] as [number, number]) : ent.M;
  const M1: [number, number] = [Math.max(0, M[0] - F * e[0]), Math.max(0, M[1] - F * e[1])];
  if (pr.u < 1e-6) return { a, u: 0, tau: 0, Wp: pr.Wp, K, M1, e, pecas };
  let tau = F / (pr.u * d);
  for (let i = 0; i < 2; i++) if (pr.Wp[i] > 1e-9) tau += (K[i] * M1[i]) / (pr.Wp[i] * d);
  return { a, u: pr.u, tau: tau / 1000, Wp: pr.Wp, K, M1, e, pecas };
}

export interface ArmaduraPuncao {
  tipo: 'estribo' | 'conector'; phi: number;
  /** Linhas radiais e barras (estribos ou conectores) por linha. */
  linhas: number; barras: number;
  /** Distância da primeira barra à face e entre barras (m). */
  s0: number; sr: number;
  /** Pernas verticais por barra (estribo/grampo = 2; conector = 1). */
  pernas: number;
  /** Área por anel (cm²) e número total de barras. */
  AswAnel: number; total: number;
  /** Posições em planta: uma lista por linha radial, uma posição por barra. */
  posicoes: P[][];
}

export interface SuperficieCortante { a: number; u: number; A: number; V: number; v: number; vRd1: number; ok: boolean; Asw: number }

export interface ResultadoVerificacao {
  tipo: 'interno' | 'borda' | 'canto'; livres: Lado[];
  C: Tensao; C2: Tensao; C3?: Tensao;
  tauRd2: number; tauRd1: number; tauRd3c: number; tauRd3?: number;
  armadura?: ArmaduraPuncao;
  cortante: { superficies: SuperficieCortante[]; falha: boolean; aFalha: number; vRd2: number };
  status: 'ok' | 'armadura' | 'fail';
  mensagens: string[];
  /** Intermediários da verificação (só com `EntradaPuncao.detalhar`; memória detalhada MD4). */
  det?: DetVerificacao;
}

/** Como a verificação terminou (memória detalhada). */
export type DesfechoPuncao = 'ok' | 'biela' | 'bielaCortante' | 'semSolucaoC3' | 'semSolucaoCortante' | 'vcCobre' | 'informadaAtende' | 'semBitola' | 'armadura';

/** Intermediários de `verificarPuncao` que o resultado não traz: limites de cortante, passos da armadura e escolha da bitola. */
export interface DetVerificacao {
  vRd2: number; vc: number; vR1: number; s0: number; sr: number; pernas: number;
  /** Contornos C″ tentados na busca do número de linhas (C′ → n-ésimo anel + 2d): n, a, u, τSd. */
  tentativas: { n: number; a: number; u: number; tau: number }[];
  precisaPunc: boolean; nb: number; nbCort: number;
  /** máx(nb; nbCort), antes da reverificação do contorno C″ final. */
  nbMax: number;
  /** Número final de anéis (nbMax mais os acrescentados pela reverificação de C″). */
  nbTot: number;
  /** Reverificação de C″ a 2d da última linha (19.5.3.4) com nbMax, nbMax+1, … anéis: n, a, u, τSd (a última é a adotada). */
  verifC3: { n: number; a: number; u: number; tau: number }[];
  AswPunc: number; AswCort: number; AswReq: number; manAsw: number; manAneis: number; AswAuto: number;
  u1: number; aUlt: number; sT: number; nMinT: number; nCap: number;
  /** Número de barras por linha de cada bitola permitida, o limite para preferir poucas linhas e a bitola escolhida. */
  bitolas: { phi: number; n: number }[]; limiteLinhas: number; escolha?: { phi: number; n: number; poucasLinhas: boolean };
  AswEf: number;
  desfecho: DesfechoPuncao;
}

const arred = (x: number, p = 0.005) => Math.floor(x / p + 1e-9) * p;

/** Posições em planta das barras de punção: linhas radiais a partir do centro, com `barras` posições cada. */
export function posicoesPuncao(ent: EntradaPuncao, arm: Pick<ArmaduraPuncao, 'linhas' | 'barras' | 's0' | 'sr'>, furoDist = 8): P[][] {
  const { ap, reg } = ent;
  const anel = (a: number) => descontarFuros(recortar(curvaAfastada(ap, a), reg), ap, reg.furos, furoDist * ent.d);
  const p1 = anel(arm.s0), u1 = p1.reduce((s, x) => s + comp(x), 0);
  if (u1 < 1e-6 || !arm.linhas) return [];
  const alvos: P[] = [];
  for (let j = 0; j < arm.linhas; j++) {
    let s = ((j + 0.5) * u1) / arm.linhas;
    for (const seg of p1) { const L = comp(seg); if (s <= L + 1e-12) { const t = L ? s / L : 0; alvos.push([seg[0][0] + t * (seg[1][0] - seg[0][0]), seg[0][1] + t * (seg[1][1] - seg[0][1])]); break; } s -= L; }
  }
  const aneis = Array.from({ length: arm.barras }, (_, k) => (k === 0 ? p1 : anel(arm.s0 + k * arm.sr)));
  return alvos.map((al) => {
    const dir: P = [al[0] - ap.centro[0], al[1] - ap.centro[1]];
    const pts: P[] = [];
    aneis.forEach((pecas, k) => {
      if (k === 0) { pts.push([+al[0].toFixed(4), +al[1].toFixed(4)]); return; }
      let melhor: P | null = null, tm = Infinity;
      for (const [p, q] of pecas) {
        const sx = q[0] - p[0], sy = q[1] - p[1], den = dir[0] * sy - dir[1] * sx;
        if (Math.abs(den) < 1e-12) continue;
        const t = ((p[0] - ap.centro[0]) * sy - (p[1] - ap.centro[1]) * sx) / den, w = ((p[0] - ap.centro[0]) * dir[1] - (p[1] - ap.centro[1]) * dir[0]) / den;
        if (t > 0 && w >= -1e-9 && w <= 1 + 1e-9 && t < tm) { tm = t; melhor = [ap.centro[0] + t * dir[0], ap.centro[1] + t * dir[1]]; }
      }
      if (melhor) pts.push([+melhor[0].toFixed(4), +melhor[1].toFixed(4)]);
    });
    return pts;
  });
}

/**
 * Verificação completa do apoio: τSd em C, C′ e (com armadura) C″, armadura de punção, varredura de cortante em
 * superfícies afastadas de `passoCortante·d` a partir de C′ e a armadura transversal que ela exige.
 */
export function verificarPuncao(ent: EntradaPuncao, par: ParametrosPuncao): ResultadoVerificacao {
  const { ap, reg, d, h, F } = ent, c = par.c, msgs: string[] = [];
  const livres = ladosLivres(ap, reg, d), tipo = tipoApoio(livres);
  const t2 = tauRd2(c), t1 = tauRd1(c, d, par.rho), t3c = tauRd3c(c, d, par.rho);
  const tens = (a: number) => tensaoNoContorno(ent, livres, a, par.furoDist);
  const C = tens(0), C2 = tens(2 * d);
  const fmt = (v: number) => v.toFixed(2).replace('.', ',');
  const vRd2 = 0.27 * c.av2 * c.fcd * 1000 * d; // kN/m (19.4.2, modelo I)
  const vc = vcLaje(c, h, d, par.rho); // kN/m
  const s0 = Math.max(0.02, arred(par.s0f * d)), sr = Math.max(0.03, arred(par.srf * d)), pernas = par.tipoArm === 'estribo' ? 2 : 1;
  // varredura de cortante a cada passo·d a partir de C′ (19.4.1)
  const sup: SuperficieCortante[] = [];
  const vR1 = vrd1(c, 1, d, par.rho * d);
  let aFalha = 0, falha = false, AswCort = 0;
  const D: DetVerificacao | undefined = ent.detalhar ? { vRd2, vc, vR1, s0, sr, pernas, tentativas: [], precisaPunc: false, nb: 0, nbCort: 0, nbMax: 0, nbTot: 0, verifC3: [], AswPunc: 0, AswCort: 0, AswReq: 0, manAsw: 0, manAneis: 0, AswAuto: 0, u1: 0, aUlt: 0, sT: 0, nMinT: 0, nCap: 0, bitolas: [], limiteLinhas: 0, AswEf: 0, desfecho: 'ok' } : undefined;
  if (par.passoCortante > 0 && F > 0) {
    for (let k = 0; k < 80; k++) {
      const a = 2 * d + k * par.passoCortante * d, t = k === 0 ? C2 : tens(a), A = areaDentro(curvaAfastada(ap, a), reg), V = F - ent.qd * A;
      if (t.u < 0.05 || V <= 0) break;
      const v = V / t.u, ok = v <= vR1 + 1e-9;
      // armadura transversal por anel (cm²): (V − Vc·u)·sr/(0,9·d·fywd)
      const Asw = ok ? 0 : (Math.max(0, V - vc * t.u) * sr * 1e4) / (0.9 * d * par.fywd * 1000);
      sup.push({ a, u: t.u, A, V, v, vRd1: vR1, ok, Asw });
      if (!ok) { falha = true; aFalha = a; AswCort = Math.max(AswCort, Asw); }
    }
  }
  const cortante = { superficies: sup, falha, aFalha, vRd2 };
  const sai = (status: ResultadoVerificacao['status'], extra: Partial<ResultadoVerificacao> = {}, desfecho: DesfechoPuncao = 'ok'): ResultadoVerificacao => {
    if (D) D.desfecho = desfecho;
    return { tipo, livres, C, C2, tauRd2: t2, tauRd1: t1, tauRd3c: t3c, cortante, status, mensagens: msgs, ...(D ? { det: D } : {}), ...extra };
  };
  if (C.tau > t2 + 1e-9) {
    msgs.push(`Punção: τSd = ${fmt(C.tau)} MPa > τRd2 = ${fmt(t2)} MPa no contorno C (compressão diagonal); aumente a espessura da laje, a seção do pilar ou o fck.`);
    return sai('fail', {}, 'biela');
  }
  const sRd2 = sup.find((x) => !x.ok && x.v > vRd2);
  if (sRd2) {
    msgs.push(`Cortante da laje: ${fmt(sRd2.v)} kN/m > VRd2 = ${fmt(vRd2)} kN/m na superfície a ${fmt(sRd2.a)} m do pilar; aumente a espessura ou o fck.`);
    return sai('fail', {}, 'bielaCortante');
  }
  const precisaPunc = C2.tau > t1 + 1e-9;
  if (D) D.precisaPunc = precisaPunc;
  if (!precisaPunc && !falha) return sai('ok');
  // ---- armadura de punção e de cortante (linhas radiais) ----
  let nb = 0;
  if (precisaPunc) {
    for (let n = 1; n <= 14; n++) {
      const tn = tens(s0 + (n - 1) * sr + 2 * d);
      D?.tentativas.push({ n, a: tn.a, u: tn.u, tau: tn.tau });
      if (tn.tau <= t1 + 1e-9) { nb = n; break; }
    }
    if (!nb) { msgs.push('Punção sem solução: a tensão no contorno C″ não cai a τRd1 com até 14 linhas de armadura; aumente a espessura da laje, a seção do pilar ou o fck.'); return sai('fail', {}, 'semSolucaoC3'); }
  }
  const AswPunc = precisaPunc ? (Math.max(0, C2.tau - t3c) * C2.u * sr * 1e4) / (1.5 * par.fywd) : 0; // cm² por anel
  const nbCort = falha ? Math.max(1, Math.ceil((aFalha - s0) / sr) + 1) : 0;
  const nbMax = Math.max(nb, nbCort), AswReq = Math.max(AswPunc, AswCort);
  let nbTot = nbMax;
  if (D) Object.assign(D, { nb, nbCort, nbMax, nbTot, AswPunc, AswCort, AswReq });
  if (nbTot > 14) { msgs.push('Cortante da laje sem solução: a armadura transversal exigiria mais de 14 linhas; aumente a espessura da laje.'); return sai('fail', {}, 'semSolucaoCortante'); }
  // armadura informada pelo usuário soma-se à calculada: se cobre todos os anéis, só falta a diferença
  const manAsw = par.manual?.Asw ?? 0, manAneis = par.manual?.aneis ?? 0;
  // C″ a 2d da última linha (19.5.3.4) na posição final: com mais anéis que a punção exige (cortante) ou com cubetas/aberturas
  // o contorno pode cair onde u é menor e τSd > τRd1; acrescentam-se anéis até atender (no máximo 14)
  let C3 = tens(s0 + (nbTot - 1) * sr + 2 * d);
  if (AswReq > 1e-9 || manAsw > 1e-9) {
    D?.verifC3.push({ n: nbTot, a: C3.a, u: C3.u, tau: C3.tau });
    while (C3.tau > t1 + 1e-9 && nbTot < 14) {
      nbTot++;
      C3 = tens(s0 + (nbTot - 1) * sr + 2 * d);
      D?.verifC3.push({ n: nbTot, a: C3.a, u: C3.u, tau: C3.tau });
    }
    if (D) D.nbTot = nbTot;
    if (C3.tau > t1 + 1e-9) {
      msgs.push(`Punção sem solução: o contorno C″ a 2d da última linha de armadura não atende a τRd1 (${fmt(C3.tau)} > ${fmt(t1)} MPa) com até 14 linhas, pelas descontinuidades do contorno (cubetas, aberturas ou bordas); aumente a espessura da laje, a seção do pilar ou o fck.`);
      return sai('fail', { C3 }, 'semSolucaoC3');
    }
    if (nbTot > nbMax) msgs.push(`Punção: o contorno C″ a 2d da última linha excedia τRd1 com ${nbMax} linhas; acrescentadas ${nbTot - nbMax} (${nbTot} linhas, C″ a ${fmt(C3.a)} m da face).`);
  }
  const AswAuto = manAneis >= nbTot ? Math.max(0, AswReq - manAsw) : AswReq;
  if (D) Object.assign(D, { manAsw, manAneis, AswAuto });
  if (AswAuto <= 1e-9) {
    if (manAsw <= 1e-9) {
      // nenhuma armadura exigida (a parcela Vc da laje cobre o cortante) e nenhuma informada: limite de C′ segue τRd1
      msgs.push(`Cortante da laje: a superfície a ${fmt(aFalha)} m do pilar excede VRd1, mas a parcela Vc da laje com armadura transversal (19.4.2) cobre a solicitação; nenhuma armadura é necessária e nenhuma foi informada.`);
      return sai('ok', {}, 'vcCobre');
    }
    msgs.push('Armadura de punção informada atende; nenhuma armadura calculada foi acrescentada.');
    return sai('armadura', { tauRd3: t3c + (1.5 * manAsw * par.fywd) / (sr * C2.u * 1e4) }, 'informadaAtende');
  }
  const aUlt = s0 + (nbTot - 1) * sr, u1 = tens(s0).u;
  const sT = C.tau <= 0.63 * t2 ? 2 * d : 1.5 * d; // espaçamento tangencial máximo no contorno C′ [a confirmar]
  const nMinT = Math.max(2, Math.ceil(C2.u / sT - 1e-9)), nCap = Math.max(nMinT, Math.floor(u1 / 0.05));
  // menor bitola que resolve com poucas linhas (até 16); senão a maior bitola permitida que cabe no perímetro da primeira linha
  const nrDe = (phi: number) => Math.max(nMinT, Math.ceil(AswAuto / (pernas * barArea(phi) * 1e4) - 1e-9));
  let escolha: { phi: number; n: number } | null = null;
  const pref = par.bitolas.find((phi) => nrDe(phi) <= Math.max(nMinT, 16));
  if (pref) escolha = { phi: pref, n: nrDe(pref) };
  else for (const phi of [...par.bitolas].reverse()) if (nrDe(phi) <= nCap) { escolha = { phi, n: nrDe(phi) }; break; }
  if (D) Object.assign(D, { u1, aUlt, sT, nMinT, nCap, bitolas: par.bitolas.map((phi) => ({ phi, n: nrDe(phi) })), limiteLinhas: Math.max(nMinT, 16), ...(escolha ? { escolha: { ...escolha, poucasLinhas: !!pref } } : {}) });
  if (!escolha) { msgs.push('Punção sem solução: a armadura necessária não cabe nas linhas radiais com as bitolas permitidas (φ ≤ h/20); aumente a espessura da laje.'); return sai('fail', {}, 'semBitola'); }
  const AswEf = escolha.n * pernas * barArea(escolha.phi) * 1e4 + (manAneis >= nbTot ? manAsw : 0);
  const arm: ArmaduraPuncao = { tipo: par.tipoArm, phi: escolha.phi, linhas: escolha.n, barras: nbTot, s0, sr, pernas, AswAnel: AswEf, total: escolha.n * nbTot, posicoes: [] };
  arm.posicoes = posicoesPuncao(ent, arm, par.furoDist);
  const tauRd3 = t3c + (1.5 * AswEf * par.fywd) / (sr * C2.u * 1e4);
  if (D) D.AswEf = AswEf;
  msgs.push(`${precisaPunc ? 'Punção' : 'Cortante da laje (armadura transversal)'}: armadura de ${arm.linhas} linhas radiais com ${arm.barras} ${par.tipoArm === 'estribo' ? 'estribos (grampos)' : 'conectores'} de φ${String(arm.phi).replace('.', ',')} (primeira a ${Math.round(s0 * 100)} cm da face, entre barras ${Math.round(sr * 100)} cm).`);
  return sai('armadura', { armadura: arm, C3, tauRd3 }, 'armadura');
}

/**
 * Parcela de cálculo do concreto na laje com armadura transversal (NBR 6118, 19.4.2): kN/m por metro de largura,
 * VRd1 até h = 15 cm e 0,6·fctd·d (viga, 17.4.2.2) a partir de h = 35 cm, com interpolação linear entre eles [a confirmar].
 */
export function vcLaje(c: Concrete, h: number, d: number, rho: number): number {
  const v1 = vrd1(c, 1, d, rho * d), v0 = 0.6 * c.fctd * d * 1000;
  if (h <= 0.15) return v1;
  if (h >= 0.35) return v0;
  return v1 + ((h - 0.15) / 0.2) * (v0 - v1);
}

// ---------------------------------------------------------------- cortante das lajes apoiadas em vigas

/** Barra, nó e ponta que dão o maior cortante da direção, com o cortante característico por caso (kN/m), para a memória detalhada. */
export interface DetCortanteBruto { barra: number; no: number; ponta: 1 | 7; larg: number; Vk: number[] }
export interface CortanteLaje {
  /** Maior cortante de cálculo por metro nas direções 0 e 1 da malha (kN/m), VRd1 (kN/m) e VRd2 (kN/m). */
  VSd: [number, number]; VRd1: [number, number]; VRd2: number;
  /** Armadura transversal necessária (cm²/m²; 0 = dispensada) e se a laje comporta armadura transversal (h ≥ 15 cm). */
  Asw: number; comArmadura: boolean;
  ok: boolean; mensagens: string[];
}

/**
 * Cortante de uma laje maciça: maior cortante ELU nas pontas das barras da malha (por metro de largura), sem o das
 * pontas junto a pilares sem viga (punção), contra VRd1 (19.4.1); acima de VRd1, armadura transversal (19.4.2) se
 * h ≥ 15 cm; acima de VRd2, erro.
 */
export function cortanteLaje(g: GrelhaPavimento, lajeId: string, fat: number[], c: Concrete, h: number, d: number, rho: [number, number], fywd: number, excluir: { p: P; r: number }[], det?: (DetCortanteBruto | undefined)[]): CortanteLaje | null {
  const m = g.modelo, res = g.res as Resultado3 | null;
  if (!res) return null;
  const VSd: [number, number] = [0, 0];
  // apoios nas vigas: nós onde chega barra de viga (no entorno de pilares sem viga vale a varredura da punção)
  const noViga = new Set<number>();
  m.barras.forEach((br, i) => { if (g.barras[i].tipo === 'viga') { noViga.add(br.i); noViga.add(br.j); } });
  let tem = false;
  m.barras.forEach((br, i) => {
    const t = g.barras[i];
    if (t.tipo !== 'laje' || t.ref !== lajeId || t.dir === undefined || !t.largura) return;
    tem = true;
    for (const [no, k] of [[br.i, 1], [br.j, 7]] as const) {
      if (!noViga.has(no)) continue;
      const q: P = [m.nos[no][0], m.nos[no][1]];
      if (excluir.some((x) => Math.hypot(q[0] - x.p[0], q[1] - x.p[1]) < x.r)) continue;
      const v = Math.abs(fat.reduce((s, f, ic) => s + f * res.esforcos[ic][i][k], 0)) / t.largura;
      if (det && v > VSd[t.dir]) det[t.dir] = { barra: i, no, ponta: k, larg: t.largura, Vk: fat.map((_, ic) => res.esforcos[ic][i][k] / t.largura!) }; // memória detalhada (MD)
      VSd[t.dir] = Math.max(VSd[t.dir], v);
    }
  });
  if (!tem) return null;
  const VRd1: [number, number] = [vrd1(c, 1, d, rho[0] * d), vrd1(c, 1, d, rho[1] * d)], VRd2 = 0.27 * c.av2 * c.fcd * 1000 * d;
  const msgs: string[] = [], fmt = (v: number) => v.toFixed(1).replace('.', ',');
  let Asw = 0;
  const comArmadura = h >= 0.15 - 1e-9;
  for (const k of [0, 1]) {
    if (VSd[k] <= VRd1[k] + 1e-9) continue;
    if (VSd[k] > VRd2) { msgs.push(`Cortante da laje: ${fmt(VSd[k])} kN/m > VRd2 = ${fmt(VRd2)} kN/m (compressão diagonal) na direção ${k}; aumente a espessura ou o fck.`); continue; }
    if (!comArmadura) { msgs.push(`Cortante da laje: ${fmt(VSd[k])} kN/m > VRd1 = ${fmt(VRd1[k])} kN/m na direção ${k}; laje com h < 15 cm não leva armadura transversal: aumente a espessura ou o fck.`); continue; }
    const vc = vcLaje(c, h, d, rho[k]);
    Asw = Math.max(Asw, (Math.max(0, VSd[k] - vc) * 1e4) / (0.9 * d * fywd * 1000));
    msgs.push(`Cortante da laje (armadura transversal): ${fmt(VSd[k])} kN/m > VRd1 = ${fmt(VRd1[k])} kN/m na direção ${k}; armadura transversal de ${Asw.toFixed(2).replace('.', ',')} cm²/m² (19.4.2).`);
  }
  return { VSd, VRd1, VRd2, Asw, comArmadura, ok: !msgs.some((s) => !s.includes('(armadura transversal)')), mensagens: msgs };
}

// ---------------------------------------------------------------- edifício

export interface ResultadoPuncao {
  id: string; pilar: string; nome: string; pavimento: string; pavimentoId: string; laje: string; lajeNome: string;
  origem: 'pilar' | 'viga' | 'radier'; viga?: string;
  /** Radier: combinação ELU determinante. */
  combinacao?: string;
  tipo: 'interno' | 'borda' | 'canto'; livres: Lado[];
  /** Dimensões do pilar nos eixos u (c1) e v (c2), m; circular: c1 = c2 = D. */
  c1: number; c2: number; circular: boolean; angulo: number; centro: P;
  h: number; d: number; rho: number; fck: number;
  /** Força de punção de cálculo (kN) e momentos que a transmitem por excentricidade em u e em v (kN·m). */
  F: number; M: [number, number];
  K: [number, number];
  contornos: { nome: 'C' | 'C′' | 'C″'; a: number; u: number; tau: number; limite: number; limiteNome: string; ok: boolean; Wp: [number, number]; e: [number, number]; M1: [number, number]; pontos: P[][] }[];
  tauRd1: number; tauRd2: number; tauRd3?: number;
  armadura?: ArmaduraPuncao;
  /** Grupos de armadura de punção informados pelo usuário nesse pilar. */
  manual: GrupoPuncaoInfo[];
  cortante: { superficies: SuperficieCortante[]; falha: boolean; aFalha: number; vRd2: number };
  status: 'ok' | 'armadura' | 'fail';
  mensagens: string[];
  origens: Origem[];
  /** Nervurada com ou sem ábaco (E3d): alturas por região, ábaco e a verificação fora dele (C″ a 2d da borda do ábaco). */
  abaco?: AbacoPuncaoInfo;
  /** Armadura de punção fora do ábaco (nas nervuras), quando o C″ a exige; a de `armadura` é a do ábaco. */
  armaduraExterna?: ArmaduraPuncao;
}
/**
 * Punção numa nervurada bidirecional (E3d): os contornos C e C′ (a 2·dAbaco da face do pilar) usam a altura do ábaco e o C″ (a 2·dLaje
 * da borda do ábaco) usa a da laje; só as nervuras e as zonas maciças resistem (trechos do contorno sobre cubetas saem).
 */
export interface AbacoPuncaoInfo {
  /** `undefined`: pilar sem ábaco (verificado nas nervuras com a altura da laje). */
  id?: string; hAbaco: number; hLaje: number; dAbaco: number; dLaje: number;
  /** Taxas de armadura negativa sobre o ábaco e fora dele. */
  rhoAbaco: number; rhoLaje: number;
  poligono?: P[]; retangulo?: { centro: P; c1: number; c2: number; angulo: number };
  /** Menor extensão (m) da face do pilar à borda do ábaco, nos lados com laje. */
  extensaoMin: number;
  /** C′ (a 2·dAbaco da face) cai dentro do ábaco? Senão a região interna usa a altura útil da laje. */
  c2NoAbaco: boolean;
  externa?: { status: 'ok' | 'armadura' | 'fail'; tauRd1: number; tauRd3?: number };
  /** Sugestão de aumentar o ábaco (armadura de punção além da borda do ábaco, ou C″ sem solução): extensão (m) da face e comando pronto. */
  sugestaoAbaco?: { extensao: number; poligono: P[]; comando: string };
}
export interface GrupoPuncaoInfo { id: string; linhas: number; barras: number; phi: number; s: number }

const NOMES_C = ['C', 'C′', 'C″'] as const;

/** Bitolas da armadura de punção (mm), até h/20 (NBR 6118, 19.5.3.5 [a confirmar]). */
export const BITOLAS_PUNCAO = [5, 6.3, 8, 10, 12.5, 16];

/** Pilar sem viga no pavimento (a laje se apoia direto) ou com viga chata larga: candidatos à punção. */
export function sitiosPuncao(b: BuildingModel, pavId: string, op: Pick<OpcoesCalculo, 'puncaoVigaChata'>, tipos: Laje['tipo']['tipo'][] = ['macica']): { p: Pilar; centro: P; viga?: Viga; avisoViga?: string }[] {
  const pav = b.pavimentos.find((x) => x.id === pavId);
  if (!pav) return [];
  const vigas = b.vigas.filter((v) => v.grupo === pav.grupo), lajes = b.lajes.filter((l) => l.grupo === pav.grupo && tipos.includes(l.tipo.tipo));
  const out: { p: Pilar; centro: P; viga?: Viga; avisoViga?: string }[] = [];
  for (const p of b.pilares) {
    if (!lancesDoPilar(b, p).some((x) => x.id === pavId)) continue;
    const s = secaoNoLance(p, pavId), centro = centroNoLance(p, pavId), [w, hh] = dimsSecao(s);
    const raio = Math.max(w, hh) / 2;
    if (!lajes.some((l) => dentroPoligono(centro, l.contorno) || distBorda(centro, l.contorno) <= raio)) continue;
    const tocam = vigas.filter((v) => vigaTocaPilar(v, p, pavId));
    if (!tocam.length) { out.push({ p, centro }); continue; }
    if (!op.puncaoVigaChata) continue;
    // viga chata mais larga que o apoio em mais de uma altura (largura perpendicular ao traçado)
    for (const v of tocam) {
      const k = (v.pontos.length > 1 ? Math.atan2(v.pontos[1][1] - v.pontos[0][1], v.pontos[1][0] - v.pontos[0][0]) : 0) - (anguloNoLance(p, pavId) * Math.PI) / 180;
      const ext = s.tipo === 'circ' ? s.d : s.b * Math.abs(Math.sin(k)) + s.h * Math.abs(Math.cos(k));
      if (v.secao.b > ext + v.secao.h + 1e-9) { out.push({ p, centro, viga: v, avisoViga: `Viga chata ${v.nome} (b = ${(v.secao.b * 100).toFixed(0)} cm) mais larga que o apoio (${(ext * 100).toFixed(0)} cm) em mais de uma altura (h = ${(v.secao.h * 100).toFixed(0)} cm): punção e estribos no apoio verificados.` }); break; }
    }
  }
  return out;
}

/** Grupos de armadura de punção do usuário por pilar (`Laje.puncao`). */
export function gruposDoPilar(b: BuildingModel, pilar: string): { id: string; linhas: number; barras: number; phi: number; s: number }[] {
  return b.lajes.flatMap((l) => (l.puncao ?? []).filter((g) => g.pilar === pilar).map((g) => ({ id: g.id, linhas: g.linhas, barras: g.barras, phi: g.phi, s: g.s ?? 0.15 })));
}

/**
 * Modelo integrado (N2b): momentos (kN·m) que a laje transmite ao pilar (S·ub − Pb do superelemento), combinados em
 * módulo caso a caso como no modelo separado e, com vento, a pior de duas combinações ELU: uso principal com o vento
 * acompanhante (ψ0 = 0,6) e vento principal com o uso reduzido por ψ0; o vento ampliado por 0,95·γz quando couber.
 */
function momentosIntegrado(mp: Record<string, [number, number]> | undefined, an: AnaliseEdificio, fat: number[], fatW: number[], gq: number, det?: DetSolicitacao): [number, number] {
  if (!mp) return [0, 0];
  const soma = (f: number[]) => [0, 1].map((k) => an.casos.reduce((t, id, ic) => t + Math.abs(f[ic] * (mp[id]?.[k] ?? 0)), 0)) as [number, number];
  const g1 = soma(fat);
  const W: [number, number] = [0, 0];
  const vento: { nome: string; amp: number; m: [number, number] }[] = [];
  for (const cv of an.vento?.casos ?? []) {
    const m = mp[cv.nome];
    if (!m) continue;
    // com P-Δ (N2c) a ampliação dos momentos do vento na laje é a maior amplificação dos deslocamentos das combinações
    const amp = an.segundaOrdem ? Math.max(1, an.segundaOrdem.amplificacaoMax) : Math.max(1, an.vento?.gamaZ.find((x) => x.direcao === cv.direcao)?.ampliacao ?? 1);
    if (det) vento.push({ nome: cv.nome, amp, m: [m[0], m[1]] });
    for (const k of [0, 1]) W[k] = Math.max(W[k], Math.abs(m[k]) * amp);
  }
  const casos = det ? an.casos.map((id, ic) => ({ caso: id, f: fat[ic], fW: fatW[ic], m: [mp[id]?.[0] ?? 0, mp[id]?.[1] ?? 0] as [number, number] })) : [];
  if (!W[0] && !W[1]) {
    if (det) det.integrado = { gq, g1, W, casos, vento, resultado: g1 };
    return g1;
  }
  const g2 = soma(fatW);
  const res = [0, 1].map((k) => Math.max(g1[k] + gq * 0.6 * W[k], g2[k] + gq * W[k])) as [number, number];
  if (det) det.integrado = { gq, g1, g2, W, casos, vento, resultado: res };
  return res;
}

/** Momentos (kN·m) transmitidos pelo pilar à laje na grelha (molas de rotação), combinados em módulo caso a caso. */
function momentosDoNo(g: GrelhaPavimento, centro: P, fat: number[], det?: DetSolicitacao): [number, number] | null {
  const m = g.modelo, res = g.res as Resultado3 | null;
  if (!res || !m.molas) return null;
  let melhor = -1, dm = Infinity;
  for (const mo of m.molas) if (mo.gdl === 3) { const d = Math.hypot(m.nos[mo.no][0] - centro[0], m.nos[mo.no][1] - centro[1]); if (d < dm) { dm = d; melhor = mo.no; } }
  if (melhor < 0 || dm > 0.6) return null;
  const kx = m.molas.find((x) => x.no === melhor && x.gdl === 3)?.k ?? 0, ky = m.molas.find((x) => x.no === melhor && x.gdl === 4)?.k ?? 0;
  let Mx = 0, My = 0;
  fat.forEach((f, ic) => { Mx += Math.abs(f * kx * res.desloc[ic][melhor * 6 + 3]); My += Math.abs(f * ky * res.desloc[ic][melhor * 6 + 4]); });
  if (det) det.molas = { no: melhor, dist: dm, kx, ky, casos: fat.map((f, ic) => ({ caso: '', f, rx: res.desloc[ic][melhor * 6 + 3], ry: res.desloc[ic][melhor * 6 + 4] })), resultado: [Mx, My] };
  return [Mx, My];
}

/** Fatores ELU por caso da análise (γg·G + γq·Q) e, com o vento principal, as variáveis reduzidas por ψ0 (modelo integrado). */
export function fatoresPuncao(b: BuildingModel, an: AnaliseEdificio): { fat: number[]; fatW: number[]; gq: number } {
  const gm = gamas(b), obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((x) => x.id === id)?.natureza ?? 'G');
  const fat = nat.map((n) => (n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0));
  const fatW = an.casos.map((id, ic) => (nat[ic] === 'Q' ? gm.q * (obra.find((x) => x.id === id)?.psi?.[0] ?? b.norma.psiQ?.[0] ?? 0.5) : fat[ic]));
  return { fat, fatW, gq: gm.q };
}

/**
 * Força de punção de cálculo (kN: reação do pilar na grelha do pavimento) e momentos (kN·m) que a laje transmite ao pilar, nos
 * eixos do pilar (u = ao longo de b; o momento em torno de u tem excentricidade ao longo de v e vice-versa). `null` sem reação ou
 * sem compressão. Compartilhado entre as maciças e as nervuradas com ábaco.
 */
export function solicitacaoPuncao(an: AnaliseEdificio, g: GrelhaPavimento, p: Pilar, pavId: string, centro: P, fat: number[], fatW: number[], gq: number, det?: DetSolicitacao): { F: number; M: [number, number]; angulo: number } | null {
  const reac = g.reacoes[p.id];
  if (!reac) return null;
  const F = an.casos.reduce((s, id, ic) => s + fat[ic] * (reac[id] ?? 0), 0);
  if (F <= 0) return null;
  const Mx = g.momentos ? momentosIntegrado(g.momentos[p.id], an, fat, fatW, gq, det) : momentosDoNo(g, centro, fat, det) ?? [0, 0];
  const angulo = anguloNoLance(p, pavId), a = (angulo * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const Mu = Math.abs(Mx[0] * co) + Math.abs(Mx[1] * si), Mv = Math.abs(Mx[0] * si) + Math.abs(Mx[1] * co);
  if (det) {
    det.casos = an.casos.map((id, ic) => ({ caso: id, f: fat[ic], R: reac[id] ?? 0 }));
    if (det.molas) det.molas.casos.forEach((c, ic) => { c.caso = an.casos[ic]; });
    Object.assign(det, { F, Mx: [Mx[0], Mx[1]], angulo, M: [Mv, Mu] });
  }
  return { F, M: [Mv, Mu], angulo };
}

/** Intermediários da solicitação de punção (memória detalhada): reações por caso, momentos do modelo integrado ou das molas de rotação e a rotação aos eixos do pilar. */
export interface DetSolicitacao {
  casos: { caso: string; f: number; R: number }[];
  F: number; Mx: [number, number]; angulo: number; M: [number, number];
  integrado?: { gq: number; g1: [number, number]; g2?: [number, number]; W: [number, number]; casos: { caso: string; f: number; fW: number; m: [number, number] }[]; vento: { nome: string; amp: number; m: [number, number] }[]; resultado: [number, number] };
  molas?: { no: number; dist: number; kx: number; ky: number; casos: { caso: string; f: number; rx: number; ry: number }[]; resultado: [number, number] };
}

const clona = (r: ResultadoPuncao, pav: { id: string; nome: string }): ResultadoPuncao => ({ ...r, pavimento: pav.nome, pavimentoId: pav.id, id: `${r.pilar}|${pav.id}`, mensagens: [...r.mensagens] });

/**
 * Punção dos pilares que apoiam a laje direto (sem viga) e das vigas chatas largas, por pavimento. FSd e os
 * momentos vêm da grelha do pavimento (reação vertical e molas de rotação dos pilares) na combinação ELU
 * γg·G + γq·Q; os momentos dos casos somam-se em módulo (a favor da segurança, vale para cargas alternadas).
 * No modelo integrado (N2b) os momentos são os que a laje transmite ao pilar no superelemento e incluem o vento.
 */
export function puncaoEdificio(b: BuildingModel, an: AnaliseEdificio, lajesRes: ResultadoLaje[], op: OpcoesCalculo): ResultadoPuncao[] {
  if (!op.puncaoVerificar) return [];
  const gm = gamas(b), obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((x) => x.id === id)?.natureza ?? 'G');
  const fat = nat.map((n) => (n === 'G' ? gm.g : n === 'H' ? gm.h : n === 'Q' ? gm.q : 0));
  // com o vento principal, as variáveis entram reduzidas por ψ0 (modelo integrado)
  const fatW = an.casos.map((id, ic) => (nat[ic] === 'Q' ? gm.q * (obra.find((x) => x.id === id)?.psi?.[0] ?? b.norma.psiQ?.[0] ?? 0.5) : fat[ic]));
  const c = concretoDe(b, 'laje'), fyP = acoDe(b, 'lajePuncao').fyd, fywd = Math.min(fyP, op.puncaoTipoArmadura ? 300 : 250);
  const out: ResultadoPuncao[] = [];
  const memo = new Map<unknown, Map<string, ResultadoPuncao>>();
  for (const g of an.grelhas) {
    if (!g.res) continue;
    const pav = b.pavimentos.find((p) => p.id === g.pavimento)!, grupo = b.grupos.find((x) => x.id === pav.grupo);
    const ja = memo.get(g.res) ?? new Map<string, ResultadoPuncao>();
    memo.set(g.res, ja);
    const lajes = b.lajes.filter((l) => l.grupo === pav.grupo && l.tipo.tipo === 'macica');
    for (const st of sitiosPuncao(b, pav.id, op)) {
      const p = st.p, sec = secaoNoLance(p, pav.id), chave = `${p.id}|${JSON.stringify(sec)}|${st.viga?.id ?? ''}`;
      const r0 = ja.get(chave);
      const elP = `Punção ${p.nome} · ${pav.nome}`, memP = memoriaAtiva(), regP = memP && memP.aceita(elP) ? memP : null; // memória detalhada (MD4)
      if (r0) { out.push(clona(r0, pav)); if (regP) registrarPuncaoRepetida(regP, elP, `Punção ${p.nome} · ${r0.pavimento}`); continue; }
      const detS: DetSolicitacao | undefined = regP ? ({} as DetSolicitacao) : undefined;
      const sol = solicitacaoPuncao(an, g, p, pav.id, st.centro, fat, fatW, gm.q, detS);
      if (!sol) continue;
      const { F, M, angulo: angP } = sol;
      const [w, hh] = dimsSecao(sec), circular = sec.tipo === 'circ';
      const ap: Apoio = { centro: st.centro, c1: w, c2: circular ? w : hh, circular, angulo: angP };
      const laje = lajes.find((l) => dentroPoligono(st.centro, l.contorno)) ?? lajes.find((l) => distBorda(st.centro, l.contorno) <= Math.max(w, hh)) ?? lajes[0];
      if (!laje) continue;
      let reg: Regiao, h: number, cob: number, rho: number, origemEl: 'pilar' | 'viga' = 'pilar';
      const rl = lajesRes.find((x) => x.laje === laje.id && x.pavimento === pav.nome);
      if (st.viga) {
        origemEl = 'viga';
        reg = { poligonos: trechosViga(st.viga).map((q) => q as P[]), furos: [] };
        h = st.viga.secao.h; cob = (st.viga.cobrimento ?? b.norma.cobrimento.viga) / 100;
        rho = 0;
      } else {
        reg = { poligonos: lajes.map((l) => l.contorno as P[]), furos: lajes.flatMap((l) => (l.furos ?? []) as P[][]) };
        h = laje.tipo.tipo === 'macica' ? laje.tipo.h : 0.1; cob = cobrimentoLaje(b, laje.cobrimento).sup;
        rho = 0;
      }
      const d = Math.max(0.05, h - cob - 0.01);
      if (!st.viga) {
        const As = rl?.As.neg ?? [0, 0], amin = 0.0015 * h * 1e4;
        rho = Math.sqrt((Math.max(As[0], amin) / (100 * d * 100)) * (Math.max(As[1], amin) / (100 * d * 100)));
      } else rho = 0.0015 * h / d;
      rho = Math.min(0.02, rho);
      const manual = gruposDoPilar(b, p.id), pernasM = op.puncaoTipoArmadura ? 1 : 2;
      const par: ParametrosPuncao = { c, rho, fywd, tipoArm: op.puncaoTipoArmadura ? 'conector' : 'estribo', s0f: Math.min(0.5, op.puncaoS0), srf: Math.min(0.75, op.puncaoSr), passoCortante: op.cortanteVarredura ? op.cortanteVarreduraPasso : 0, furoDist: op.puncaoFuroDist,
        bitolas: BITOLAS_PUNCAO.filter((x) => x <= h * 1000 / 20 + 1e-9),
        ...(manual.length ? { manual: { Asw: Math.max(...manual.map((q) => q.linhas * pernasM * barArea(q.phi) * 1e4)), aneis: Math.min(...manual.map((q) => q.barras)) } } : {}) };
      const qd = gm.g * (laje.tipo.tipo === 'macica' ? GAMA_CONCRETO * laje.tipo.h : 0) + gm.g * (grupo?.gRev ?? 0) + gm.q * (grupo?.q ?? 0);
      const ent: EntradaPuncao = { ap, reg, d, h, F, M, qd, ...(regP ? { detalhar: true } : {}) };
      const v = verificarPuncao(ent, par);
      if (regP && detS) {
        registrarSolicitacaoPuncao(regP, elP, detS);
        const hMac = laje.tipo.tipo === 'macica' ? laje.tipo.h : 0;
        registrarVerificacaoPuncao(regP, elP, {
          c, ent, par, v, cob, fyd: fyP, limFywd: op.puncaoTipoArmadura ? 300 : 250,
          rho: st.viga ? { h, viga: true } : { h, As: [rl?.As.neg[0] ?? 0, rl?.As.neg[1] ?? 0], b: [1, 1], faceTexto: 'armadura negativa (face superior) da laje' },
          carga: { descricao: 'Carga distribuída de cálculo da laje, para a varredura de cortante', formula: 'qd = γg·(γc,conc·h + grev) + γq·q', expressao: `qd = ${fm(gm.g)}·(${fm(GAMA_CONCRETO)}·${fm(hMac)} + ${fm(grupo?.gRev ?? 0)}) + ${fm(gm.q)}·${fm(grupo?.q ?? 0)} = ${fm(qd)} kN/m²`, entradas: { gg: gm.g, gq: gm.q, gammaConc: hMac ? GAMA_CONCRETO : 0, h: hMac, grev: grupo?.gRev ?? 0, q: grupo?.q ?? 0 } },
        });
      }
      const msgs = v.mensagens.map((m) => m.replace(/^(Punção|Cortante da laje)/, `$1 em ${p.nome}`));
      if (st.avisoViga) msgs.unshift(st.avisoViga);
      for (const g2 of manual) if (g2.s > 0.75 * d + 1e-9) msgs.push(`Punção em ${p.nome}: espaçamento informado de ${(g2.s * 100).toFixed(0)} cm maior que 0,75d = ${(0.75 * d * 100).toFixed(1).replace('.', ',')} cm (NBR 6118, 19.5.3.5).`);
      if (v.tipo !== 'interno' && !st.viga) { /* borda e canto: contorno reduzido u* */ }
      if (Math.max(w, hh) > 5 * Math.min(w, hh)) msgs.push(`Pilar-parede ${p.nome} (${(w * 100).toFixed(0)}×${(hh * 100).toFixed(0)} cm): a distribuição de tensões no contorno não é uniforme; punção verificada no contorno completo [a confirmar].`);
      const mk = (nome: 0 | 1 | 2, t: Tensao, lim: number, limNome: string) => ({ nome: NOMES_C[nome], a: t.a, u: t.u, tau: t.tau, limite: lim, limiteNome: limNome, ok: t.tau <= lim + 1e-9, Wp: t.Wp, e: t.e, M1: t.M1, pontos: polilinhas(t.pecas) });
      const r: ResultadoPuncao = {
        id: `${p.id}|${pav.id}`, pilar: p.id, nome: p.nome, pavimento: pav.nome, pavimentoId: pav.id, laje: laje.id, lajeNome: laje.nome, origem: origemEl, ...(st.viga ? { viga: st.viga.id } : {}),
        tipo: v.tipo, livres: v.livres, c1: ap.c1, c2: ap.c2, circular, angulo: angP, centro: st.centro, h, d, rho, fck: c.fck, F, M, K: v.C.K,
        contornos: [mk(0, v.C, v.tauRd2, 'τRd2'), mk(1, v.C2, v.tauRd3 ?? v.tauRd1, v.tauRd3 !== undefined ? 'τRd3' : 'τRd1'), ...(v.C3 ? [mk(2, v.C3, v.tauRd1, 'τRd1')] : [])],
        tauRd1: v.tauRd1, tauRd2: v.tauRd2, ...(v.tauRd3 !== undefined ? { tauRd3: v.tauRd3 } : {}), ...(v.armadura ? { armadura: v.armadura } : {}),
        manual: manual.map(({ id, linhas, barras, phi, s }) => ({ id, linhas, barras, phi, s })), cortante: v.cortante, status: v.status, mensagens: msgs,
        origens: [origem('Punção', COMB_ELU_LAJE, 'puncao'), origem('Cortante da laje no entorno do pilar', COMB_ELU_LAJE, 'cortanteLaje')],
      };
      ja.set(chave, r);
      out.push(r);
    }
  }
  return out;
}

/**
 * Punção do radier sob os pilares (FU6): mesma verificação das lajes, com FSd = N do pé do pilar, MSd = momentos no pé,
 * a reação do solo (pressão ELU k·w média nos nós próximos) descontada dentro de cada contorno (NBR 6118, 19.5.2.1) e a
 * armadura de flexão da face em contato com o solo. Vale a combinação ELU de maior τSd em C′; sem armadura informada.
 */
export function puncaoRadier(b: BuildingModel, an: AnaliseEdificio, radiers: ResultadoRadier[], elu: CombinacaoEd[], op: OpcoesCalculo): Map<string, ResultadoPuncao[]> {
  const out = new Map<string, ResultadoPuncao[]>(), be = an.baseElastica, pm = an.portico;
  if (!op.puncaoVerificar || !be || !pm.res) return out;
  const nomes: string[] = [...an.casos], desl = [...pm.res.desloc], esf = [...pm.res.esforcos];
  if (pm.resVento) casosHorizontais(an).forEach((cv, ic) => { nomes.push(cv.nome); desl.push(pm.resVento!.desloc[ic]); esf.push(pm.resVento!.esforcos[ic]); });
  const c = concretoDe(b, 'fundacao'), fywd = Math.min(acoDe(b, 'lajePuncao').fyd, op.puncaoTipoArmadura ? 300 : 250), cob = cobrimentoFundacao(b);
  const combs = elu.filter((x) => x.tipo === 'ELU');
  for (const rr of radiers) {
    const rad = b.fundacao?.radiers?.find((x) => x.id === rr.id);
    if (!rad) continue;
    const nosR = be.nos.filter((n) => n.ref === rad.id), reg: Regiao = { poligonos: [rad.contorno as P[]], furos: (rad.furos ?? []) as P[][] };
    const d = Math.max(0.05, rad.h - cob - 0.01), lista: ResultadoPuncao[] = [];
    const amin = 0.0015 * rad.h * 1e4, rho = Math.min(0.02, Math.sqrt((Math.max(rr.As.pos[0], amin) / (1e4 * d)) * (Math.max(rr.As.pos[1], amin) / (1e4 * d))));
    for (const [pid, info] of Object.entries(be.pilares)) {
      if (info.tipo !== 'radier' || info.ref !== rad.id) continue;
      const p = b.pilares.find((x) => x.id === pid), bi = pm.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === pid);
      if (!p || bi < 0) continue;
      const sec = secaoBase(b, p), centro = centroPilar(p, sec), [w, hh] = dimsSecao(sec), circular = sec.tipo === 'circ';
      const ap: Apoio = { centro, c1: w, c2: circular ? w : hh, circular, angulo: p.angulo };
      const fb = nomes.map((_, ic) => forcaBasePilar(pm.modelo, bi, esf[ic][bi]));
      const perto = nosR.filter((n) => Math.hypot(n.x - centro[0], n.y - centro[1]) <= Math.max(w, hh) / 2 + 3 * d);
      const a = (p.angulo * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
      const livres = ladosLivres(ap, reg, d);
      const elR = `Punção ${p.nome} · Radier ${rad.nome}`, memR = memoriaAtiva(), regR = memR && memR.aceita(elR) ? memR : null; // memória detalhada (MD4)
      let melhor: { ent: EntradaPuncao; tau: number; nome: string; det?: DetSolicitacaoRadier } | null = null;
      const taus: { nome: string; tau: number }[] = [];
      for (const cb of combs) {
        const f = nomes.map((n) => cb.fatores[n] ?? 0);
        const F = f.reduce((s, fi, ic) => s + fi * fb[ic].N, 0), Mx = f.reduce((s, fi, ic) => s + fi * fb[ic].Mx, 0), My = f.reduce((s, fi, ic) => s + fi * fb[ic].My, 0);
        if (F <= 0) continue;
        const Mu = Mx * co + My * si, Mv = -Mx * si + My * co; // momento em torno de u tem excentricidade ao longo de v
        const q = perto.length ? perto.reduce((s, n) => s + f.reduce((t, fi, ic) => t - fi * n.k * desl[ic][n.no * 6 + 2], 0), 0) / perto.length : 0;
        const ent: EntradaPuncao = { ap, reg, d, h: rad.h, F, M: [Math.abs(Mv), Math.abs(Mu)], qd: Math.max(0, q), descontar: true };
        const tau = tensaoNoContorno(ent, livres, 2 * d, op.puncaoFuroDist).tau;
        if (regR) taus.push({ nome: cb.nome, tau });
        if (!melhor || tau > melhor.tau) {
          melhor = { ent, tau, nome: cb.nome };
          if (regR) melhor.det = { combinacao: cb.nome, angulo: p.angulo, casos: nomes.map((caso, ic) => ({ caso, f: f[ic], N: fb[ic].N, Mx: fb[ic].Mx, My: fb[ic].My })), F, Mx, My, Mu, Mv, M: ent.M, nos: perto.map((n) => ({ no: n.no, k: n.k, q: f.reduce((t, fi, ic) => t - fi * n.k * desl[ic][n.no * 6 + 2], 0) })), qd: ent.qd, tauC2: tau, candidatas: [] };
        }
      }
      if (!melhor) continue;
      if (regR && melhor.det) { melhor.det.candidatas = taus; melhor.ent.detalhar = true; }
      const par: ParametrosPuncao = { c, rho, fywd, tipoArm: op.puncaoTipoArmadura ? 'conector' : 'estribo', s0f: Math.min(0.5, op.puncaoS0), srf: Math.min(0.75, op.puncaoSr), passoCortante: op.cortanteVarredura ? op.cortanteVarreduraPasso : 0, furoDist: op.puncaoFuroDist, bitolas: BITOLAS_PUNCAO.filter((x) => x <= (rad.h * 1000) / 20 + 1e-9) };
      const v = verificarPuncao(melhor.ent, par), ent = melhor.ent;
      if (regR && melhor.det) {
        registrarSolicitacaoRadier(regR, elR, melhor.det);
        registrarVerificacaoPuncao(regR, elR, {
          c, ent, par, v, cob, fyd: acoDe(b, 'lajePuncao').fyd, limFywd: op.puncaoTipoArmadura ? 300 : 250,
          rho: { h: rad.h, As: [rr.As.pos[0], rr.As.pos[1]], b: [1, 1], faceTexto: 'armadura inferior do radier' },
          carga: { descricao: 'Reação do solo de cálculo sob o radier (pressão ELU k·w média nos nós próximos ao pilar), descontada de FSd dentro de cada contorno e na varredura de cortante', formula: 'qd = máx(0; média(Σ −γi·k·wi))', expressao: `qd = ${fm(ent.qd)} kN/m² (${perto.length} nós)`, entradas: { nNos: perto.length, qd: ent.qd } },
        });
      }
      const msgs = v.mensagens.map((m) => m.replace(/^(Punção|Cortante da laje)/, `$1 em ${p.nome}`));
      if (Math.max(w, hh) > 5 * Math.min(w, hh)) msgs.push(`Pilar-parede ${p.nome} (${(w * 100).toFixed(0)}×${(hh * 100).toFixed(0)} cm): a distribuição de tensões no contorno não é uniforme; punção verificada no contorno completo [a confirmar].`);
      const mk = (k: 0 | 1 | 2, t: Tensao, lim: number, limNome: string) => ({ nome: NOMES_C[k], a: t.a, u: t.u, tau: t.tau, limite: lim, limiteNome: limNome, ok: t.tau <= lim + 1e-9, Wp: t.Wp, e: t.e, M1: t.M1, pontos: polilinhas(t.pecas) });
      lista.push({
        id: `${pid}|fundacao`, pilar: pid, nome: p.nome, pavimento: 'Fundação', pavimentoId: 'fundacao', laje: rad.id, lajeNome: rad.nome, origem: 'radier', combinacao: melhor.nome,
        tipo: v.tipo, livres: v.livres, c1: ap.c1, c2: ap.c2, circular, angulo: p.angulo, centro, h: rad.h, d, rho, fck: c.fck, F: ent.F, M: ent.M, K: v.C.K,
        contornos: [mk(0, v.C, v.tauRd2, 'τRd2'), mk(1, v.C2, v.tauRd3 ?? v.tauRd1, v.tauRd3 !== undefined ? 'τRd3' : 'τRd1'), ...(v.C3 ? [mk(2, v.C3, v.tauRd1, 'τRd1')] : [])],
        tauRd1: v.tauRd1, tauRd2: v.tauRd2, ...(v.tauRd3 !== undefined ? { tauRd3: v.tauRd3 } : {}), ...(v.armadura ? { armadura: v.armadura } : {}),
        manual: [], cortante: v.cortante, status: v.status, mensagens: msgs,
        origens: [origem('Punção do radier', `${melhor.nome} (ELU; reação do solo descontada)`, 'puncao'), origem('Cortante no entorno do pilar', COMB_ELU_LAJE, 'cortanteLaje')],
      });
    }
    if (lista.length) out.set(rad.id, lista);
  }
  return out;
}

/** Envoltória dos pavimentos do grupo: pior caso de cada grandeza (C3.4). */
export function envoltoriaLajes(ls: ResultadoLaje[]): ResultadoLaje | null {
  if (!ls.length) return null;
  const mx = (f: (x: ResultadoLaje) => number) => Math.max(...ls.map(f)), mn = (f: (x: ResultadoLaje) => number) => Math.min(...ls.map(f));
  const msgs = [...new Set(ls.flatMap((x) => x.mensagens))];
  const r0 = ls[0];
  return {
    ...r0, pavimento: 'Envoltória', mensagens: msgs,
    mPos: [mx((x) => x.mPos[0]), mx((x) => x.mPos[1])], mNeg: [mn((x) => x.mNeg[0]), mn((x) => x.mNeg[1])],
    As: { pos: [mx((x) => x.As.pos[0]), mx((x) => x.As.pos[1])], neg: [mx((x) => x.As.neg[0]), mx((x) => x.As.neg[1])] },
    flecha: mx((x) => x.flecha), limite: mn((x) => x.limite), flechaQ: mx((x) => x.flechaQ), limiteQ: mn((x) => x.limiteQ), wk: mx((x) => x.wk),
    status: ls.some((x) => x.status === 'fail') ? 'fail' : 'ok',
  };
}

export type { Laje };
