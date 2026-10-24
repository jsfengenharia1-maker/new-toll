// Vigas de fundação (frente FU, fatia FU2): vigas de equilíbrio (alavanca) e de travamento entre elementos do nível de
// fundação. A viga não se apoia no solo: leva as cargas sobre ela (peso próprio e cargas do grupo "fundacao") às pontas,
// como viga biapoiada entre os pilares; a de equilíbrio centra o elemento excêntrico da ponta equilibrada (reação
// R = N·ℓ/(ℓ − e)) e alivia a outra ponta (ΔN = R·e/ℓ, com só uma parte considerada, NBR 6122); a de travamento recebe
// o momento da excentricidade de execução das estacas dos blocos de 1 e 2 estacas. Dimensionamento como as vigas do
// edifício (flexão com As,mín da 17.3.5.2.1, cortante modelo I, pele, ancoragem), pelas rotinas de `concrete.ts`.
// Unidades: kN, m.
import { barArea, beamAsMin, beamFlexure, beamShear, chooseBars, type BarChoice } from '../concrete';
import { dentroPoligono, type P } from '../geom/faces';
import { defaultFoundationParams } from '../piles';
import { lbBasico } from './detalhamento';
import { cortesVigaFundacao, textoCortesFace, type CortesVF } from './vigaFundacaoCortes';
import { fracaoPassante } from './tabelasArmadura';
import { geoSecaoVF, mesaEmBalanco, secoesFlexaoVF, textoSecaoVF, type MesaBalanco } from './secaoVF';
import { acoDe, cobrimentoFundacao, concretoDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { registrarVigaFundacao } from '../memoria/vigaFundacao';
import { memoriaAtiva } from '../memoria/registrador';
import { acharPilar } from './fundacaoPilarParede';
import { classificar } from './revisao';
import { casosDaObra, centroPilar, contornoPilar, lancesDoPilar, secaoNoLance, type BuildingModel, type Carga, type ElementoFundacao, type Pilar, type VigaFundacao } from './types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const dot = (a: P, z: P) => a[0] * z[0] + a[1] * z[1];

// ---------------- pontas e geometria ----------------

/** Ponta de uma viga de fundação: o elemento (se houver) e o pilar apoiado. */
export interface PontaVF { pilar: Pilar; elemento?: ElementoFundacao; nome: string }

/** Resolve a ponta (id de elemento ou de pilar que nasce na fundação). */
export function pontaVF(b: BuildingModel, id: string): PontaVF | null {
  const el = b.fundacao?.elementos.find((e) => e.id === id);
  if (el) { const p = acharPilar(b, el.pilares[0]); return p ? { pilar: p, elemento: el, nome: el.nome } : null; }
  const p = acharPilar(b, id);
  if (!p || p.nasce !== 'fundacao') return null;
  const e = b.fundacao?.elementos.find((x) => x.pilares.includes(p.id));
  return { pilar: p, elemento: e, nome: e ? e.nome : p.nome };
}

const secaoBase = (b: BuildingModel, p: Pilar) => { const l = lancesDoPilar(b, p)[0]; return l ? secaoNoLance(p, l.id) : p.secao; };
/** Centro do pilar na base (m). */
export const centroBase = (b: BuildingModel, p: Pilar): P => centroPilar(p, secaoBase(b, p));
/** Meia dimensão do pilar ao longo da direção u (face a partir do centro, m). */
export function meiaFace(b: BuildingModel, p: Pilar, u: P): number {
  const s = secaoBase(b, p), c = centroPilar(p, s);
  return Math.max(...contornoPilar(p, s).map((q) => dot([q[0] - c[0], q[1] - c[1]], u)));
}

export interface GeometriaVF {
  viga: VigaFundacao;
  ini: PontaVF | null; fim: PontaVF | null;
  /** Centros dos pilares das pontas (m), direção unitária ini → fim e distância entre eles. */
  a: P; z: P; u: P; L: number;
  /** Meias faces dos elementos das pontas ao longo da viga (m); ausente = as dos pilares (a cinta de sapata corrida, FU8a, informa as suas). */
  faces?: { ini: number; fim: number };
  erro?: string;
}

export function geometriaVF(b: BuildingModel, v: VigaFundacao): GeometriaVF {
  const ini = pontaVF(b, v.ini), fim = pontaVF(b, v.fim);
  const base = { viga: v, ini, fim, a: [0, 0] as P, z: [0, 0] as P, u: [1, 0] as P, L: 0 };
  if (!ini || !fim) return { ...base, erro: `Viga de fundação sem ponta: ${!ini ? v.ini : v.fim} não é elemento de fundação nem pilar que nasce na fundação.` };
  if (ini.pilar.id === fim.pilar.id) return { ...base, erro: 'Viga de fundação sem ponta: as duas pontas são o mesmo pilar.' };
  const a = centroBase(b, ini.pilar), z = centroBase(b, fim.pilar), L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  if (L < 0.5) return { ...base, a, z, L, erro: `Viga de fundação sem ponta: pilares a ${fmt(L)} m (mínimo 0,50 m).` };
  return { ...base, a, z, u: [(z[0] - a[0]) / L, (z[1] - a[1]) / L], L };
}

/** Ponta equilibrada? ('auto': a que chega a sapata ou bloco de divisa, canto ou posição livre.) */
export function pontasEquilibradas(v: VigaFundacao, g: Pick<GeometriaVF, 'ini' | 'fim'>): { ini: boolean; fim: boolean } {
  if (v.tipo !== 'equilibrio') return { ini: false, fim: false };
  const exc = (pt: PontaVF | null) => !!pt?.elemento && pt.elemento.pilares.length === 1 && pt.elemento.tipo !== 'tubulao' && pt.elemento.posicao !== 'centrada';
  const eq = v.equilibrio ?? 'auto';
  if (eq === 'auto') return { ini: exc(g.ini), fim: exc(g.fim) };
  const ok = (pt: PontaVF | null) => !!pt?.elemento && pt.elemento.pilares.length === 1 && pt.elemento.tipo !== 'tubulao';
  return { ini: eq.ini && ok(g.ini), fim: eq.fim && ok(g.fim) };
}

// ---------------- alavanca ----------------

/** Viga que equilibra um elemento: direção unitária do pilar à ponta oposta, distância (m) e rigidez relativa EI/ℓ. */
export interface VigaAlavanca { u: P; l: number; k: number }

export interface Alavanca {
  /** Reação no centro do elemento (kN) e fator R/N = 1/(1 − Σgᵢ/ℓᵢ). */
  R: number; fator: number;
  /** Momento de cada viga por unidade de R (m): ΔNᵢ = R·gᵢ/ℓᵢ é o alívio na ponta oposta. */
  g: number[]; dN: number[];
  /** Excentricidade que as vigas não equilibram (m, global): fica como momento R·e no elemento. */
  eRes: P;
}

/**
 * Alavanca de um elemento excêntrico equilibrado por vigas. N = carga do pilar; e = vetor do pilar ao centro do
 * elemento (m) a equilibrar. Equilíbrio de momentos no centro do elemento: Σ ΔNᵢ·ℓᵢ·uᵢ = R·e, com R = N + Σ ΔNᵢ.
 * Uma viga ao longo de e dá o caso clássico R = N·ℓ/(ℓ − e) e ΔN = N·e/(ℓ − e); duas vigas ortogonais (canto),
 * R = N/(1 − ex/ℓx − ey/ℓy). Várias vigas repartem o momento pela rigidez (EI/ℓ); com todas paralelas, a componente
 * perpendicular fica no elemento (eRes). null: alavanca impossível (ℓ ≤ e, viga curta demais).
 */
export function alavanca(N: number, e: P, vigas: VigaAlavanca[]): Alavanca | null {
  if (!vigas.length || Math.hypot(e[0], e[1]) < 1e-9) return { R: N, fator: 1, g: vigas.map(() => 0), dN: vigas.map(() => 0), eRes: [...e] as P };
  let m00 = 0, m01 = 0, m11 = 0;
  for (const v of vigas) { m00 += v.k * v.u[0] * v.u[0]; m01 += v.k * v.u[0] * v.u[1]; m11 += v.k * v.u[1] * v.u[1]; }
  const det = m00 * m11 - m01 * m01, tr = m00 + m11;
  let g: number[];
  if (Math.abs(det) > 1e-6 * tr * tr) {
    const l0 = (m11 * e[0] - m01 * e[1]) / det, l1 = (m00 * e[1] - m01 * e[0]) / det;
    g = vigas.map((v) => v.k * (v.u[0] * l0 + v.u[1] * l1));
  } else {
    // todas paralelas: só a componente de e na direção delas
    const u0 = vigas[0].u, proj = dot(e, u0), den = vigas.reduce((s, v) => s + v.k * dot(v.u, u0) ** 2, 0);
    g = vigas.map((v) => (v.k * dot(v.u, u0) * proj) / den);
  }
  const S = vigas.reduce((s, v, i) => s + g[i] / v.l, 0);
  if (S >= 0.9) return null;
  const fator = 1 / (1 - S), R = N * fator;
  const eRes: P = [e[0] - vigas.reduce((s, v, i) => s + g[i] * v.u[0], 0), e[1] - vigas.reduce((s, v, i) => s + g[i] * v.u[1], 0)];
  return { R, fator, g, dN: vigas.map((v, i) => (R * g[i]) / v.l), eRes: [Math.abs(eRes[0]) < 1e-9 ? 0 : eRes[0], Math.abs(eRes[1]) < 1e-9 ? 0 : eRes[1]] };
}

/**
 * Esforços característicos da alavanca ao longo da viga, a partir do pilar equilibrado (s = 0) até a ponta oposta
 * (s = ℓ): carga n do pilar em s = 0, reação r = n + ΔN uniforme sob o elemento (comprimento a ao longo da viga,
 * centro em s = eᵢ) e ΔN na ponta oposta. M > 0 traciona a face superior; V > 0 para baixo à esquerda da seção.
 * n = ΔN·(ℓ − eᵢ)/eᵢ (uma viga: n = N).
 */
export function diagramaAlavanca(dN: number, l: number, ei: number, a: number, xs: number[]): { M: number[]; V: number[]; n: number } {
  if (ei <= 1e-9 || dN === 0) return { M: xs.map(() => 0), V: xs.map(() => 0), n: 0 };
  const n = (dN * (l - ei)) / ei, r = n + dN, s0 = ei - a / 2, s1 = ei + a / 2, q = r / a;
  const M: number[] = [], V: number[] = [];
  for (const s of xs) {
    const t = Math.max(0, Math.min(s, s1) - s0);
    const col = s > 1e-12 ? 1 : 0;
    M.push(col * n * s - q * t * (s - (s0 + t / 2)));
    V.push(col * n - q * t + (s > l + 1e-12 ? dN : 0));
  }
  return { M, V, n };
}

// ---------------- cargas sobre as vigas e elementos ----------------

/** Carga concentrada característica de um caso numa viga (abscissa s a partir do pilar da ponta inicial). */
export interface CargaPontualVF { caso: string; s: number; P: number }

const PASSO = 0.05;

/** Uma carga do nível de fundação dividida em parcelas concentradas (ponto e valor em kN). */
export function parcelasDaCarga(c: Carga): { pt: P; P: number }[] {
  if (c.tipo === 'ponto') return [{ pt: c.pontos[0] as P, P: c.valor }];
  const out: { pt: P; P: number }[] = [];
  if (c.tipo === 'linha') {
    for (let i = 0; i + 1 < c.pontos.length; i++) {
      const a = c.pontos[i], z = c.pontos[i + 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]), n = Math.max(1, Math.ceil(L / PASSO));
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; out.push({ pt: [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])], P: (c.valor * L) / n }); }
    }
    return out;
  }
  // área: malha de PASSO dentro do contorno
  const poly = c.pontos as P[], xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const nx = Math.max(1, Math.ceil((x1 - x0) / PASSO)), ny = Math.max(1, Math.ceil((y1 - y0) / PASSO)), dx = (x1 - x0) / nx, dy = (y1 - y0) / ny;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const pt: P = [x0 + (i + 0.5) * dx, y0 + (j + 0.5) * dy];
    if (dentroPoligono(pt, poly)) out.push({ pt, P: c.valor * dx * dy });
  }
  return out;
}

/** A parcela cai na faixa da viga (largura b, entre os pilares)? Devolve a abscissa ou null. */
export function abscissaNaViga(g: GeometriaVF, pt: P): number | null {
  if (g.erro) return null;
  const d: P = [pt[0] - g.a[0], pt[1] - g.a[1]], s = dot(d, g.u), t = d[0] * -g.u[1] + d[1] * g.u[0];
  return s >= -1e-9 && s <= g.L + 1e-9 && Math.abs(t) <= g.viga.b / 2 + 0.01 ? s : null;
}

/** Reações nas pontas (kN) de cargas concentradas numa viga biapoiada de vão L. */
export const reacoesBiapoiada = (L: number, cs: { s: number; P: number }[]) => {
  const fim = cs.reduce((t, c) => t + (c.P * c.s) / L, 0), tot = cs.reduce((t, c) => t + c.P, 0);
  return { ini: tot - fim, fim };
};

/** Momento (tração embaixo > 0) e cortante da viga biapoiada com cargas concentradas, nas abscissas xs. */
export function diagramaBiapoiada(L: number, cs: { s: number; P: number }[], xs: number[]): { M: number[]; V: number[] } {
  const { ini } = reacoesBiapoiada(L, cs);
  return {
    M: xs.map((x) => ini * x - cs.reduce((t, c) => t + (c.s < x ? c.P * (x - c.s) : 0), 0)),
    V: xs.map((x) => ini - cs.reduce((t, c) => t + (c.s < x ? c.P : 0), 0)),
  };
}

/**
 * Reações de uma viga com apoios intermediários rígidos (cruzamento com outra viga, C11.53): viga contínua de EI constante,
 * pelo método das forças (apoios intermediários como redundantes, flexibilidade da biapoiada). Devolve as reações nas pontas
 * e nos apoios `ss` (kN, mesma ordem).
 */
export function reacoesComApoios(L: number, cs: { s: number; P: number }[], ss: number[]): { ini: number; fim: number; R: number[] } {
  if (!ss.length) { const r = reacoesBiapoiada(L, cs); return { ini: r.ini, fim: r.fim, R: [] }; }
  const G = (x: number, a: number) => { const u = Math.min(x, a), v = Math.max(x, a); return ((L - v) * u * (L * L - (L - v) ** 2 - u * u)) / (6 * L); };
  const m = ss.length;
  const A = ss.map((sk) => ss.map((sl) => G(sk, sl)));
  const rhs = ss.map((sk) => cs.reduce((t, c) => t + c.P * G(sk, c.s), 0));
  const M = A.map((row, i) => [...row, rhs[i]]);
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < m; r++) { if (r === c || Math.abs(M[c][c]) < 1e-300) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= m; k++) M[r][k] -= f * M[c][k]; }
  }
  const R = M.map((row, i) => (Math.abs(row[i]) < 1e-300 ? 0 : row[m] / row[i]));
  const fim = cs.reduce((t, c) => t + (c.P * c.s) / L, 0) - R.reduce((t, r, k) => t + (r * ss[k]) / L, 0);
  const ini = cs.reduce((t, c) => t + c.P, 0) - R.reduce((t, r) => t + r, 0) - fim;
  return { ini, fim, R };
}

/** Cruzamento de duas vigas de fundação em planta: abscissas (m, a partir da ponta inicial de cada uma). */
export interface CruzamentoVF { apoiada: string; apoio: string; sApoiada: number; sApoio: number; ponto: P }

/**
 * Vigas que se cruzam fora das pontas (C11.53). A de maior prioridade serve de apoio à outra: equilíbrio sobre travamento;
 * mesmo tipo, a de maior seção; empate, a lançada antes. A apoiada passa a viga contínua com o apoio no cruzamento (suas
 * cargas vão em parte à viga cruzada). Cruzamentos a menos de 15 cm de uma ponta ou com ângulo menor que 10° não contam.
 */
export function cruzamentosVF(geos: GeometriaVF[]): CruzamentoVF[] {
  const prio = (g: GeometriaVF, i: number): [number, number, number] => [g.viga.tipo === 'equilibrio' ? 1 : 0, g.viga.b * g.viga.h, -i];
  const maior = (a: [number, number, number], z: [number, number, number]) => a[0] - z[0] || a[1] - z[1] || a[2] - z[2];
  const out: CruzamentoVF[] = [];
  for (let i = 0; i < geos.length; i++) for (let j = i + 1; j < geos.length; j++) {
    const g = geos[i], h = geos[j];
    if (g.erro || h.erro) continue;
    const den = g.u[0] * h.u[1] - g.u[1] * h.u[0];
    if (Math.abs(den) < Math.sin((10 * Math.PI) / 180)) continue;
    const dx = h.a[0] - g.a[0], dy = h.a[1] - g.a[1];
    const si = (dx * h.u[1] - dy * h.u[0]) / den, sj = (dx * g.u[1] - dy * g.u[0]) / den;
    if (si < 0.15 || si > g.L - 0.15 || sj < 0.15 || sj > h.L - 0.15) continue;
    const ponto: P = [g.a[0] + si * g.u[0], g.a[1] + si * g.u[1]];
    const gSup = maior(prio(g, i), prio(h, j)) > 0;
    out.push(gSup ? { apoiada: h.viga.id, apoio: g.viga.id, sApoiada: sj, sApoio: si, ponto } : { apoiada: g.viga.id, apoio: h.viga.id, sApoiada: si, sApoio: sj, ponto });
  }
  return out;
}

// ---------------- resultado e dimensionamento ----------------

export interface ArmaduraVF { As: number; AsMin: number; barras: BarChoice | null; dupla?: boolean }

export interface ResultadoVigaFundacao {
  id: string; nome: string; tipo: VigaFundacao['tipo'];
  /** Nomes das pontas (elemento ou pilar). */
  ini: string; fim: string;
  /** Distância entre os pilares das pontas (m). */
  L: number;
  /** Eixo em planta (centro da ponta inicial, centro da final; m) e meias faces das pontas ao longo da viga (m). */
  eixo?: [P, P]; faces?: { ini: number; fim: number };
  /** Seção do modelo e seção adotada (m). */
  b: number; h: number; bAdot: number; hAdot: number; fixa: boolean;
  equilibrio: { ini: boolean; fim: boolean };
  /** Alívio (característico, kN) que a viga leva a cada ponta pela alavanca da ponta oposta. */
  alivio: { ini: number; fim: number };
  /** Reações das cargas sobre a viga, com o peso próprio (características, soma dos casos, kN). */
  cargas: { ini: number; fim: number };
  /** Momento da excentricidade de execução das estacas em cada ponta (característico, kN·m). */
  travamento: { ini: number; fim: number };
  /** Cruzamentos com outras vigas (C11.53): a apoiada tem apoio intermediário no cruzamento; o apoio recebe a reação (kN, soma dos casos sem vento). */
  cruzamentos?: { com: string; papel: 'apoiada' | 'apoio'; s: number; R: number }[];
  /** Envoltória característica: momento que traciona a face superior e a inferior (kN·m) e cortante (kN). */
  Mk: { sup: number; inf: number }; Vk: number;
  Md: { sup: number; inf: number }; Vd: number;
  /** Diagramas característicos ao longo da viga (s a partir do pilar da ponta inicial). */
  diagrama: { s: number[]; Msup: number[]; Minf: number[]; V: number[] };
  /** Forma T, L ou plana (E5k) e a armadura da mesa em balanço (laje); `bAdot` é a largura da alma. */
  forma?: { tipo: 'T' | 'L' | 'plana'; mesa: 'inferior' | 'superior'; bf: number; hf: number };
  mesaBalanco?: MesaBalanco;
  armadura: { sup: ArmaduraVF; inf: ArmaduraVF; pele?: { AsFace: number; barras: BarChoice | null }; estribo: { phi: number; s: number; legs: number } | null; aswS: number; VRd2: number; lb: number; d: number;
    /** Ancoragem das barras superiores além da face do pilar de cada ponta (m): a adotada, e se foi editada (C11.45). */
    ancoragem: { ini: number; fim: number; editada: { ini: boolean; fim: boolean } };
    /** Cortes da armadura principal por face (opção `vigaFundCortes`, R8b); ausente = barras corridas. */
    cortes?: CortesVF };
  /** Concreto (m³, entre as faces dos pilares) e aço (kg, estimado pelas barras e estribos). */
  volume: number; aco: number;
  status: 'ok' | 'fail';
  mensagens: string[]; notas: string[]; resumo: string;
}

/** Contribuição de uma ponta equilibrada (da alavanca do elemento) para o diagrama da viga. */
export interface AlavancaNaViga { ponta: 'ini' | 'fim'; dN: number; ei: number; a: number; l: number }

export interface EntradaVF {
  g: GeometriaVF;
  equilibrio: { ini: boolean; fim: boolean };
  alavancas: AlavancaNaViga[];
  /** Cargas sobre a viga por caso (sem o peso próprio). */
  cargas: CargaPontualVF[];
  /** Momento de travamento característico em cada ponta (kN·m). */
  travamento: { ini: number; fim: number };
  /** Alívio levado a cada ponta (kN). */
  alivio: { ini: number; fim: number };
  /** Apoios intermediários (cruzamento com viga de maior prioridade): reação por caso (kN, para cima) na abscissa s. */
  apoios?: { caso: string; s: number; R: number; com: string }[];
  /** Cruzamentos para exibição. */
  cruzamentos?: ResultadoVigaFundacao['cruzamentos'];
  mensagens: string[]; notas: string[];
  /** Memória detalhada (MD5c): origem do travamento e da alavanca de cada ponta, preenchida pela fundação só com a memória ligada. */
  det?: { trav: { ponta: 'ini' | 'fim'; elemento: string; Nk: number; exc: number; nb: number }[]; alav: { ponta: 'ini' | 'fim'; elemento: string; N: number; R: number; fator: number }[] };
}

/** Peso específico do concreto armado (kN/m³). */
const GAMA_CONCRETO = 25;

/** Cargas da viga por caso: peso próprio (G) entre os pilares e as cargas do nível de fundação na faixa da viga. */
export function cargasDaViga(g: GeometriaVF, cs: CargaPontualVF[]): CargaPontualVF[] {
  if (g.erro) return [];
  const n = Math.max(1, Math.ceil(g.L / PASSO)), gf = g.viga.forma ? geoSecaoVF(g.viga.b, g.viga.h, g.viga.forma, 'superior') : null, area = gf && !gf.erro ? gf.A : g.viga.b * g.viga.h, pp = GAMA_CONCRETO * area * (g.L / n);
  return [...Array.from({ length: n }, (_, k) => ({ caso: 'G', s: ((k + 0.5) * g.L) / n, P: pp })), ...cs];
}

/** Dimensiona (ou só verifica, com a seção fixa) uma viga de fundação. */
export function dimensionarVigaFundacao(b: BuildingModel, ent: EntradaVF, op: OpcoesCalculo): ResultadoVigaFundacao {
  const { g } = ent, v = g.viga;
  const msgs = [...ent.mensagens], notas = [...ent.notas];
  const vazio: ResultadoVigaFundacao = {
    id: v.id, nome: v.nome, tipo: v.tipo, ini: g.ini?.nome ?? v.ini, fim: g.fim?.nome ?? v.fim, L: g.L, b: v.b, h: v.h, bAdot: v.b, hAdot: v.h, fixa: !!v.fixa,
    equilibrio: ent.equilibrio, alivio: ent.alivio, cargas: { ini: 0, fim: 0 }, travamento: ent.travamento, Mk: { sup: 0, inf: 0 }, Vk: 0, Md: { sup: 0, inf: 0 }, Vd: 0,
    diagrama: { s: [], Msup: [], Minf: [], V: [] },
    armadura: { sup: { As: 0, AsMin: 0, barras: null }, inf: { As: 0, AsMin: 0, barras: null }, estribo: null, aswS: 0, VRd2: 0, lb: 0, d: 0, ancoragem: { ini: 0, fim: 0, editada: { ini: false, fim: false } } },
    volume: 0, aco: 0, status: 'fail', mensagens: msgs, notas, resumo: `${v.nome}: não calculada`,
  };
  if (g.erro) { msgs.unshift(g.erro); vazio.status = 'fail'; return vazio; }
  const L = g.L;
  // ---- esforços característicos ----
  const n = Math.max(40, Math.ceil(L / PASSO));
  const fi = g.faces?.ini ?? meiaFace(b, g.ini!.pilar, g.u), ff = g.faces?.fim ?? meiaFace(b, g.fim!.pilar, [-g.u[0], -g.u[1]]);
  // abscissas: malha, faces dos pilares e ponto de cortante nulo de cada alavanca (momento máximo)
  const extras = [fi, L - ff, ...ent.alavancas.flatMap((al) => {
    if (al.ei <= 1e-9 || !al.dN) return [];
    const nn = (al.dN * (al.l - al.ei)) / al.ei, s = al.ei - al.a / 2 + (nn * al.a) / (nn + al.dN);
    return [al.ponta === 'ini' ? s : L - s];
  })].filter((x) => x > 0 && x < L);
  const xs = [...new Set([...Array.from({ length: n + 1 }, (_, k) => (k * L) / n), ...extras].map((x) => +x.toFixed(9)))].sort((a, z) => a - z);
  // alavanca de cada ponta equilibrada (nas coordenadas da viga)
  const Mlev = xs.map(() => 0), Vlev = xs.map(() => 0);
  for (const al of ent.alavancas) {
    const loc = al.ponta === 'ini' ? xs : xs.map((x) => L - x);
    const dg = diagramaAlavanca(al.dN, al.l, al.ei, al.a, loc);
    dg.M.forEach((m, i) => { Mlev[i] += m; Vlev[i] += Math.abs(dg.V[i]); });
  }
  // cargas sobre a viga (biapoiada entre os pilares), soma dos casos sem vento
  const vento = new Set(casosDaObra(b).filter((c) => c.natureza === 'W').map((c) => c.id));
  const ap = (ent.apoios ?? []).filter((a) => !vento.has(a.caso)).map((a) => ({ s: a.s, P: -a.R }));
  const cs = [...cargasDaViga(g, ent.cargas).filter((c) => !vento.has(c.caso)), ...ap];
  const bi = diagramaBiapoiada(L, cs, xs), rq = reacoesBiapoiada(L, cs);
  const Mtr = Math.max(ent.travamento.ini, ent.travamento.fim), Vtr = (ent.travamento.ini + ent.travamento.fim) / L;
  const Msup = xs.map((_, i) => Math.max(0, Mlev[i]) + Math.max(0, -bi.M[i]) + Mtr);
  const Minf = xs.map((_, i) => Math.max(0, -Mlev[i]) + Math.max(0, bi.M[i]) + Mtr);
  const V = xs.map((_, i) => Vlev[i] + Math.abs(bi.V[i]) + Vtr);
  // cortante a partir das faces dos pilares
  const Vk = Math.max(0, ...V.filter((_, i) => xs[i] >= fi - 1e-9 && xs[i] <= L - ff + 1e-9));
  const Mk = { sup: Math.max(...Msup), inf: Math.max(...Minf) };
  const gf = gamas(b).g;
  const Md = { sup: gf * Mk.sup, inf: gf * Mk.inf }, Vd = gf * Vk;

  // ---- seção: dada (fixa) ou crescente até atender ----
  const c = concretoDe(b, 'fundacao'), aco = acoDe(b, 'fundacao'), fyd = aco.fyd, gs = gamas(b).s, cob = cobrimentoFundacao(b);
  const bMin = op.vigaFundBMin / 100, hMin = op.vigaFundHMin / 100;
  const calc = (bw: number, h: number) => {
    const d = h - cob - 0.013, sec = { kind: 'rect' as const, bw, h };
    // seção T, L ou plana (E5k): T onde a mesa está comprimida; barras da face da mesa na largura da mesa; cortante na alma
    const geo = v.forma ? geoSecaoVF(bw, h, v.forma, 'superior') : null;
    const fx = geo && !geo.erro ? secoesFlexaoVF(geo) : null;
    const secS = fx ? fx.sup.sec : sec, secI = fx ? fx.inf.sec : sec, fcS = fx?.sup.mesaComprimida ?? false, fcI = fx?.inf.mesaComprimida ?? false;
    const AsMinI = beamAsMin(secI, fcI, d, c, fyd), AsMinS = fx ? beamAsMin(secS, fcS, d, c, fyd) : AsMinI, AsMin = AsMinI;
    const fs = beamFlexure(secS, fcS, Md.sup, d, cob + 0.013, c, fyd), fi_ = beamFlexure(secI, fcI, Md.inf, d, cob + 0.013, c, fyd);
    const sup: ArmaduraVF = { As: Math.max(fs.As + fi_.As2, AsMinS), AsMin: AsMinS, barras: null, ...(fs.double ? { dupla: true } : {}) };
    const inf: ArmaduraVF = { As: Math.max(fi_.As + fs.As2, AsMin), AsMin, barras: null, ...(fi_.double ? { dupla: true } : {}) };
    sup.barras = chooseBars(sup.As, fx ? fx.sup.larguraBarras : bw, cob, 0.005, 0.019); inf.barras = chooseBars(inf.As, fx ? fx.inf.larguraBarras : bw, cob, 0.005, 0.019);
    const sh = beamShear(bw, d, Vd, c, aco.fyk, gs);
    const pele = h > 0.6 ? { AsFace: 0.001 * bw * h, barras: null as BarChoice | null } : undefined;
    const ok = !geo?.erro && !fs.double && !fi_.double && !!sup.barras && !!inf.barras && sh.ok && !!sh.stirrup;
    return { d, sup, inf, sh, pele, ok, geo, secS, secI, fcS, fcI };
  };
  let bw = v.fixa ? v.b : Math.max(v.b, bMin), h = v.fixa ? v.h : Math.max(v.h, hMin);
  let r = calc(bw, h);
  const r0 = r;
  let tentativas = 1;
  if (!v.fixa && !r.ok) {
    busca: for (let bb = bw; bb <= Math.max(bw, 0.6) + 1e-9; bb = Math.round((bb + 0.05) * 100) / 100)
      for (let hh = h; hh <= 1.6 + 1e-9; hh = Math.round((hh + 0.05) * 100) / 100) { const t = calc(bb, hh); tentativas++; if (t.ok) { bw = bb; h = hh; r = t; break busca; } }
  }
  if (r.geo?.erro) msgs.push(`Viga de fundação: forma da seção — ${r.geo.erro}`);
  for (const a of r.geo?.avisos ?? []) msgs.push(`Viga de fundação: ${a}`);
  // mesa em balanço (E5k): a viga não se apoia no solo, só a armadura mínima da mesa como laje
  const fpar = { ...defaultFoundationParams(), ...(b.fundacao?.params ?? {}) };
  const mesaB = r.geo && !r.geo.erro && r.geo.temMesa ? mesaEmBalanco({ g: r.geo, sigma: 0, gammaF: fpar.gammaF, cob, c, fyd, rhoMin: fpar.ftRhoMin }, msgs) : null;
  if (mesaB && r.geo) notas.push(`Seção ${textoSecaoVF(r.geo)}: rigidez e flexão em T onde a mesa está comprimida, cortante na alma (${Math.round(bw * 100)} cm); a mesa em balanço não recebe carga do solo e leva só a armadura mínima de laje (ρmín ${fmt(fpar.ftRhoMin * 100, 2)} %) [a confirmar].`);
  if (v.fixa && (v.b < bMin - 1e-9 || v.h < hMin - 1e-9)) msgs.push(`Viga de fundação: seção abaixo do mínimo (${Math.round(v.b * 100)}×${Math.round(v.h * 100)} < ${Math.round(bMin * 100)}×${Math.round(hMin * 100)} cm).`);
  if (!v.fixa && (bw > v.b + 1e-9 || h > v.h + 1e-9)) notas.push(`Seção aumentada de ${Math.round(v.b * 100)}×${Math.round(v.h * 100)} para ${Math.round(bw * 100)}×${Math.round(h * 100)} cm (mínimo ${Math.round(bMin * 100)}×${Math.round(hMin * 100)} cm e esforços).`);
  if (r.sup.dupla || r.inf.dupla) msgs.push(`Viga de fundação: flexão com armadura dupla (x limitado) na seção ${Math.round(bw * 100)}×${Math.round(h * 100)} cm; aumente a altura.`);
  if (!r.sup.barras || !r.inf.barras) msgs.push(`Viga de fundação: flexão — armadura não cabe na largura (${Math.round(bw * 100)} cm).`);
  if (!r.sh.ok) msgs.push(`Viga de fundação: biela comprimida, Vd = ${fmt(Vd, 1)} > VRd2 = ${fmt(r.sh.VRd2, 1)} kN.`);
  else if (!r.sh.stirrup) msgs.push('Viga de fundação: cortante — estribo não encontrado.');
  if (r.pele) { const nP = Math.max(2, Math.ceil(r.pele.AsFace / barArea(8) - 1e-9)); r.pele.barras = { phi: 8, n: nP, As: nP * barArea(8), layers: 1 }; }
  // ancoragem das barras superiores (posição de má aderência para h ≥ 60 cm, 9.3.1)
  const phiSup = r.sup.barras?.phi ?? 10;
  const lb = lbBasico(phiSup, c, fyd, h < 0.6);
  if (ent.equilibrio.ini || ent.equilibrio.fim) notas.push(`Barras superiores ancoradas além do pilar equilibrado: lb = ${fmt(lb * 100, 0)} cm (φ${String(phiSup).replace('.', ',')}, ${h < 0.6 ? 'boa' : 'má'} aderência), com gancho na face da divisa.`);
  const anc = { ini: v.ancoragem?.ini ?? lb, fim: v.ancoragem?.fim ?? lb, editada: { ini: v.ancoragem?.ini !== undefined, fim: v.ancoragem?.fim !== undefined } };
  for (const k of ['ini', 'fim'] as const) if (anc.editada[k] && anc[k] < lb - 1e-9) msgs.push(`Viga de fundação: ancoragem informada na ponta ${k === 'ini' ? g.ini?.nome : g.fim?.nome} (${fmt(anc[k] * 100, 0)} cm) menor que o lb necessário (${fmt(lb * 100, 0)} cm).`);
  if (anc.editada.ini || anc.editada.fim) notas.push(`Ancoragem editada: ${fmt(anc.ini * 100, 0)} cm na ponta inicial e ${fmt(anc.fim * 100, 0)} cm na final (lb = ${fmt(lb * 100, 0)} cm).`);
  // quantidades
  const Lc = Math.max(0, L - fi - ff);
  const Lest = op.vigaFundEstribosEsperas ? L : Lc;
  const est = r.sh.stirrup;
  const nEst = est ? Math.ceil(Lest / est.s) + 1 : 0, perim = 2 * (bw - 2 * cob + h - 2 * cob) + 0.2;
  const kg = (A: number, len: number) => A * len * 7850;
  // cortes da armadura principal (R8b, K1.12.12): a face de maior momento de cálculo faz o papel dos negativos (convenção invertida)
  let cortes: CortesVF | undefined;
  if (op.vigaFundCortes && r.sup.barras && r.inf.barras && L > 0) {
    const ca60 = aco.aco === 'CA-60';
    cortes = cortesVigaFundacao({
      s: xs, Minf, Msup, L, d: r.d, cobPonta: cob, passante: fracaoPassante(b, { secao: { b: bw, h } }), gruposNegativos: op.vigaGruposSup, gruposPositivos: op.vigaCortesInf, minPct: op.vigaGrupoMinPct,
      inf: { n: r.inf.barras.n, phi: r.inf.barras.phi, AsFlex: r.inf.As, AsMin: r.inf.AsMin, lb: lbBasico(r.inf.barras.phi, c, fyd, true, ca60) },
      sup: { n: r.sup.barras.n, phi: r.sup.barras.phi, AsFlex: r.sup.As, AsMin: r.sup.AsMin, lb: lbBasico(r.sup.barras.phi, c, fyd, h < 0.6, ca60) },
    });
    notas.push(`Cortes da armadura principal (convenção invertida: a face de maior momento faz o papel dos negativos; aℓ = d): ${textoCortesFace(cortes.inf)}; ${textoCortesFace(cortes.sup)}.`);
  }
  /** Aço de uma face: barras corridas (comprimento `inteiro`, com ancoragens) e, com cortes, os grupos escalonados. */
  const kgFace = (x: BarChoice | null, f: CortesVF['inf'] | undefined, inteiro: number) => (x ? (f ? kg(barArea(f.phi), f.passantes * inteiro + f.grupos.reduce((t, gr) => t + gr.n * gr.comprimento, 0)) : kg(x.As, inteiro)) : 0);
  const aco_ = kgFace(r.sup.barras, cortes?.sup, Lc + anc.ini + anc.fim) + kgFace(r.inf.barras, cortes?.inf, L)
    + (est ? kg(barArea(est.phi), perim) * nEst : 0) + (r.pele?.barras ? 2 * kg(r.pele.barras.As, L) : 0);
  const txt = (x: BarChoice | null) => (x ? `${x.n} φ${String(x.phi).replace('.', ',')}` : '—');
  const status = msgs.some((m) => classificar(m).nivel === 'erro') ? 'fail' : 'ok';
  const mem = memoriaAtiva(), elM = `Viga de fundação ${v.nome}`;
  if (mem && mem.aceita(elM)) {
    const vento2 = new Set(casosDaObra(b).filter((c0) => c0.natureza === 'W').map((c0) => c0.id));
    const ppAll = cargasDaViga(g, []), npp = ppAll.length, csAll = cs.slice(npp);
    const motivo0 = [r0.geo?.erro ? 'forma da seção' : '', r0.sup.dupla || r0.inf.dupla ? 'armadura dupla' : '', !r0.sup.barras || !r0.inf.barras ? 'armadura não cabe na largura' : '', !r0.sh.ok ? 'biela comprimida (Vd > VRd2)' : '', r0.sh.ok && !r0.sh.stirrup ? 'estribo não encontrado' : ''].filter(Boolean).join(', ');
    registrarVigaFundacao(mem, {
      el: elM, nome: v.nome, tipo: v.tipo, iniNome: g.ini?.nome ?? v.ini, fimNome: g.fim?.nome ?? v.fim, L, fi, ff, b0: v.b, h0: v.h, fixa: !!v.fixa, bMin, hMin, bw, h,
      forma: r.geo && !r.geo.erro && r.geo.tipo !== 'retangular' ? textoSecaoVF(r.geo) : undefined,
      equilibrio: ent.equilibrio, alavancas: ent.alavancas, alivio: ent.alivio, travamento: ent.travamento, det: ent.det, apoios: (ent.apoios ?? []).filter((a) => !vento2.has(a.caso)),
      xs, Mlev, Vlev, biM: bi.M, biV: bi.V, Mtr, Vtr, Msup, Minf, V, npp, ppP: ppAll[0]?.P ?? 0, areaSecao: ppAll[0] ? ppAll[0].P / (GAMA_CONCRETO * (L / npp)) : bw * h, ext: csAll, reacoes: rq,
      gf, Mk, Vk, Md, Vd, c, fyd, fyk: aco.fyk, gs, cob, d: r.d, secS: r.secS, secI: r.secI, fcS: r.fcS, fcI: r.fcI, sup: r.sup, inf: r.inf, sh: r.sh, pele: r.pele,
      tentativas, inicialOk: r0.ok, inicialMotivo: motivo0, lb, phiSup, boaAderencia: h < 0.6, ancoragem: anc, Lc, Lest, nEst, perim, cortes, mesa: mesaB,
      volume: (r.geo && !r.geo.erro ? r.geo.A : bw * h) * Lc, aco: aco_ + (mesaB && r.geo ? kg((mesaB.barras?.As ?? mesaB.AsAdot * 1e-4) + (mesaB.distribuicao.barras?.As ?? mesaB.distribuicao.As * 1e-4), mesaB.balanco * r.geo.lados * Lc) : 0), status, mensagens: msgs,
    });
  }
  return {
    ...vazio, bAdot: bw, hAdot: h, cargas: { ini: rq.ini, fim: rq.fim }, Mk, Vk, Md, Vd, eixo: [g.a, g.z], faces: { ini: fi, fim: ff },
    diagrama: { s: xs, Msup, Minf, V },
    armadura: { sup: r.sup, inf: r.inf, ...(r.pele ? { pele: r.pele } : {}), estribo: est, aswS: r.sh.aswS, VRd2: r.sh.VRd2, lb, d: r.d, ancoragem: anc, ...(cortes ? { cortes } : {}) },
    volume: (r.geo && !r.geo.erro ? r.geo.A : bw * h) * Lc, aco: aco_ + (mesaB && r.geo ? kg((mesaB.barras?.As ?? mesaB.AsAdot * 1e-4) + (mesaB.distribuicao.barras?.As ?? mesaB.distribuicao.As * 1e-4), mesaB.balanco * r.geo.lados * Lc) : 0),
    ...(r.geo && !r.geo.erro && r.geo.tipo !== 'retangular' ? { forma: { tipo: r.geo.tipo, mesa: r.geo.mesa, bf: r.geo.bf, hf: r.geo.hf } } : {}), ...(mesaB ? { mesaBalanco: mesaB } : {}), status, ...(ent.cruzamentos?.length ? { cruzamentos: ent.cruzamentos } : {}),
    resumo: `${v.nome} ${Math.round(bw * 100)}×${Math.round(h * 100)}: sup. ${txt(r.sup.barras)}, inf. ${txt(r.inf.barras)}${est ? `, estribo φ${String(est.phi).replace('.', ',')} c/${Math.round(est.s * 100)}` : ''} (Md ${fmt(Md.sup, 1)}/${fmt(Md.inf, 1)} kN·m; Vd ${fmt(Vd, 1)} kN)`,
  };
}

/** Resumo para o MCP e a linha de comando (sem diagramas). */
export function resumoVigaFundacao(r: ResultadoVigaFundacao) {
  return {
    id: r.id, nome: r.nome, tipo: r.tipo, ini: r.ini, fim: r.fim, L: +r.L.toFixed(3), secao: [r.bAdot, r.hAdot], equilibrio: r.equilibrio,
    alivio: { ini: +r.alivio.ini.toFixed(1), fim: +r.alivio.fim.toFixed(1) }, Md: { sup: +r.Md.sup.toFixed(1), inf: +r.Md.inf.toFixed(1) }, Vd: +r.Vd.toFixed(1),
    ...(r.cruzamentos?.length ? { cruzamentos: r.cruzamentos.map((c) => ({ com: c.com, papel: c.papel, s: +c.s.toFixed(3), R: +c.R.toFixed(1) })) } : {}),
    status: r.status, mensagens: r.mensagens, resumo: r.resumo,
  };
}

/** Próximo nome livre (VF1, VF2…). */
export function nomeVigaFundacao(b: BuildingModel) {
  const n = Math.max(0, ...(b.fundacao?.vigas ?? []).map((v) => { const m = /^VF(\d+)$/.exec(v.nome); return m ? +m[1] : 0; })) + 1;
  return `VF${n}`;
}
