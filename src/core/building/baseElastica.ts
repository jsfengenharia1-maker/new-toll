// Base elástica (frente FU, fatia FU6): radiers e vigas de fundação sobre molas de Winkler, na análise global.
// O nível de fundação flutuante entra no pórtico espacial (fe3d): grelha do radier (barras com a rigidez à flexão e à
// torção das lajes maciças) e barras das vigas sobre base elástica, com molas verticais k × área de influência em
// cada nó; o pilar que nasce sobre eles não tem vínculo externo (o pé do pilar é um nó da malha). Deslocamentos
// horizontais e giro em planta dos nós flutuantes presos [a confirmar]. Análise linear: mola tracionada (levantamento)
// não é iterada, vira erro. Verificações: tensão no solo σ = k·w nas combinações raras contra σadm e armadura do radier
// por Wood-Armer (regras das lajes maciças, R4) e da viga pelas regras das vigas de fundação.
// Unidades: kN, m, kN/m² (tensões), kN/m³ (k).
import { barArea, beamAsMin, beamFlexure, beamShear, chooseBars, crackLimit, crackWidth, type BarChoice, type BeamSection } from '../concrete';
import { defaultFoundationParams } from '../piles';
import { ceil05 } from '../rebar';
import { baseBarra, type Barra3, type Modelo3, type Resultado3 } from '../fe3d';
import { areaPoligono, dentroPoligono, type P } from '../geom/faces';
import type { AnaliseEdificio, BarraGrelha, GrelhaPavimento } from './analitico';
import { direcaoPrincipal, torcaoRet } from './analitico';
import type { CombinacaoEd } from './combinacoes';
import { alfa0t, lbBasico } from './detalhamento';
import { cortesLaje, escolherBarrasLaje, RHO_MIN_LAJE, type DetalheLaje, type PosicaoLaje } from './detalhamentoLajes';
import { GAMA_CONCRETO } from './lajes';
import { classificar } from './revisao';
import { acoDe, cobrimentoFundacao, concretoDe, gamas } from './materiais';
import { opcoesEmUso, perfilDe, type OpcoesCalculo } from './opcoes';
import { casosDaObra, centroPilar, contornoPilar, ehArranque, secaoNoLance, lancesDoPilar, type BuildingModel, type Pilar, type Radier, type SapataCorrida, type VigaElastica } from './types';

const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/**
 * Tabela orientativa do coeficiente de reação vertical (placa de 30 cm; kN/m³), Bowles, Foundation Analysis and
 * Design (1996), Tabela 9-1 [a confirmar: valores de referência; o k da obra deve vir do geotécnico e ser corrigido
 * pela dimensão da fundação].
 */
export const TABELA_K: { solo: string; min: number; max: number }[] = [
  { solo: 'Areia fofa', min: 4800, max: 16000 },
  { solo: 'Areia medianamente compacta', min: 9600, max: 80000 },
  { solo: 'Areia compacta', min: 64000, max: 128000 },
  { solo: 'Areia argilosa medianamente compacta', min: 32000, max: 80000 },
  { solo: 'Areia siltosa medianamente compacta', min: 24000, max: 48000 },
  { solo: 'Argila mole (qu ≤ 200 kPa)', min: 12000, max: 24000 },
  { solo: 'Argila média (200 < qu ≤ 800 kPa)', min: 24000, max: 48000 },
  { solo: 'Argila rija (qu > 800 kPa)', min: 48000, max: 96000 },
];

// ---------------- sapata corrida sob pilares (FU7a) como viga sobre base elástica ----------------

/**
 * Viga sobre base elástica equivalente de uma sapata corrida sob pilares (FU7a): largura da base `b` = B (molas), seção
 * de rigidez em T invertido (aba h0 × B e nervura bw × (h − h0)) e a largura do elemento apoiado `bApoio` (onde os
 * pilares nascem). O id e o nome são os da sapata corrida.
 */
export interface VigaElasticaEf extends VigaElastica {
  corrida?: true;
  bApoio?: number;
  /** Espessura da aba (m). */
  h0?: number;
  secao?: { A: number; Iz: number; Iy: number; J: number };
}

/** Largura da base, altura no eixo e espessura da aba da sapata corrida na análise (os valores informados ou os padrões das opções; a aba pela regra de rigidez). */
export function corridaEfetiva(b: BuildingModel, c: SapataCorrida, op: OpcoesCalculo = opcoesEmUso(b.opcoes, perfilDe(b))) {
  const B = c.B ?? Math.max(op.corridaBPadrao, c.bw + 0.2), bw = c.bw;
  const balanco = Math.max(0, c.aba === 'ambas' ? (B - bw) / 2 : B - bw);
  const hRig = ((2 * balanco) / 3) * (1.5 / op.fundBalancoAltura);
  const h = c.h ?? Math.max(op.corridaHPadrao, c.h0 ?? 0);
  const ftH0Min = b.fundacao?.params?.ftH0Min ?? defaultFoundationParams().ftH0Min;
  const h0 = Math.min(h, c.h0 ?? ceil05(Math.max(hRig, ftH0Min)));
  return { B, bw, h, h0, balanco, hRig };
}

/** Seção em T invertido da sapata corrida: área, inércia em torno da horizontal (pelo centroide), da vertical e torção. */
export function secaoCorrida(B: number, bw: number, h: number, h0: number, torcao: number) {
  const A1 = B * h0, A2 = bw * (h - h0), A = A1 + A2, y1 = h0 / 2, y2 = h0 + (h - h0) / 2, yc = (A1 * y1 + A2 * y2) / A;
  const Iz = (B * h0 ** 3) / 12 + A1 * (y1 - yc) ** 2 + (bw * (h - h0) ** 3) / 12 + A2 * (y2 - yc) ** 2;
  return { A, Iz, Iy: (h0 * B ** 3) / 12 + ((h - h0) * bw ** 3) / 12, J: torcao * (torcaoRet(B, h0) + (h > h0 ? torcaoRet(bw, h - h0) : 0)) };
}

/** Pilares que nascem na fundação sobre o eixo da sapata corrida (centro a menos de bw/2 + 5 cm do eixo, ou eixo passando pela seção). */
export function pilaresDaCorrida(b: BuildingModel, c: Pick<SapataCorrida, 'pontos' | 'bw'>): { pilar: Pilar; c: P }[] {
  const out: { pilar: Pilar; c: P }[] = [];
  for (const p of b.pilares) {
    if (p.nasce !== 'fundacao') continue;
    const sec = secaoBase(b, p), ct = centroPilar(p, sec), pr = projecaoNaViga(c, ct);
    if (pr.d <= c.bw / 2 + 0.05 || dentroPoligono(pr.q, contornoPilar(p, sec))) out.push({ pilar: p, c: ct });
  }
  return out;
}

/** O ponto de uma carga do nível de fundação cai sobre a sapata corrida (distância ao eixo ≤ meia largura do apoio + 5 cm; área: meia base)? */
export function pontoNaCorrida(c: Pick<SapataCorrida, 'pontos' | 'bw' | 'B'>, pt: P, tipo: 'ponto' | 'linha' | 'area' = 'linha'): boolean {
  const lim = tipo === 'area' ? (c.B ?? c.bw + 0.5) / 2 : Math.max(c.bw / 2, 0.1) + 0.05;
  return projecaoNaViga(c, pt).d <= lim + 1e-9;
}

/** Sapatas corridas que apoiam pilares (modo "pilares": entram na análise global como viga sobre base elástica). */
export const corridasSobPilares = (b: BuildingModel) => (b.fundacao?.corridas ?? []).filter((c) => pilaresDaCorrida(b, c).length > 0);

const CACHE_VIGAS = new WeakMap<BuildingModel, VigaElasticaEf[]>();
/** Vigas sobre base elástica da obra: as lançadas (FU6) e as equivalentes das sapatas corridas sob pilares (FU7a). */
export function vigasElasticasEf(b: BuildingModel): VigaElasticaEf[] {
  const reais: VigaElasticaEf[] = b.fundacao?.vigasElasticas ?? [];
  const cs = b.fundacao?.corridas ?? [];
  if (!cs.length) return reais;
  const c0 = CACHE_VIGAS.get(b);
  if (c0) return c0;
  const out = vigasElasticasEfCalc(b, reais, cs);
  CACHE_VIGAS.set(b, out);
  return out;
}

function vigasElasticasEfCalc(b: BuildingModel, reais: VigaElasticaEf[], cs: SapataCorrida[]): VigaElasticaEf[] {
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const reaisIds = new Set(reais.map((v) => v.id));
  const virtuais: VigaElasticaEf[] = cs.filter((c) => !reaisIds.has(c.id) && pilaresDaCorrida(b, c).length > 0).map((c) => {
    const g = corridaEfetiva(b, c, op);
    return { id: c.id, nome: c.nome, pontos: c.pontos, b: g.B, h: g.h, ...(c.k ? { k: c.k } : {}), ...(c.sigmaAdm ? { sigmaAdm: c.sigmaAdm } : {}),
      corrida: true as const, bApoio: g.bw, h0: g.h0, secao: secaoCorrida(g.B, g.bw, g.h, g.h0, op.torcaoViga) };
  });
  return [...reais, ...virtuais];
}

// ---------------- geometria: pilares sobre a base elástica ----------------

/** Pilar que nasce na fundação (com lances ou arranque) sobre um radier ou uma viga sobre base elástica. */
export interface PilarNaBase { pilar: string; tipo: 'radier' | 'viga'; ref: string; c: P }

const distSeg = (p: P, a: P, z: P): { d: number; q: P; t: number } => {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  const q: P = [a[0] + t * dx, a[1] + t * dy];
  return { d: Math.hypot(q[0] - p[0], q[1] - p[1]), q, t };
};

/** O ponto está no radier (dentro do contorno e fora dos furos)? */
export const noRadier = (r: Pick<Radier, 'contorno' | 'furos'>, p: P) => dentroPoligono(p, r.contorno) && !(r.furos ?? []).some((f) => dentroPoligono(p, f));

/** Ponto do eixo da viga mais próximo de p (distância e abscissa ao longo da polilinha). */
export function projecaoNaViga(v: Pick<VigaElastica, 'pontos'>, p: P): { d: number; q: P; s: number } {
  let best = { d: Infinity, q: v.pontos[0] as P, s: 0 }, s0 = 0;
  for (let i = 0; i + 1 < v.pontos.length; i++) {
    const a = v.pontos[i], z = v.pontos[i + 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]), r = distSeg(p, a, z);
    if (r.d < best.d - 1e-12) best = { d: r.d, q: r.q, s: s0 + r.t * L };
    s0 += L;
  }
  return best;
}

/** Seção da base do pilar (primeiro lance; arranque: a do pilar). */
const secaoBase = (b: BuildingModel, p: Pilar) => { const l = lancesDoPilar(b, p)[0]; return l ? secaoNoLance(p, l.id) : p.secao; };

/**
 * Pilares que nascem na fundação sobre a base elástica: centro dentro do radier, ou eixo da viga sobre base elástica
 * passando pela seção do pilar (ou a menos de b/2 do centro). O radier tem precedência.
 */
export function pilaresNaBase(b: BuildingModel): PilarNaBase[] {
  const fe = b.fundacao, out: PilarNaBase[] = [];
  const vigas = vigasElasticasEf(b);
  const radiers = fe?.radiers ?? [];
  if (!radiers.length && !vigas.length) return out;
  for (const p of b.pilares) {
    if (p.nasce !== 'fundacao') continue;
    const sec = secaoBase(b, p), c = centroPilar(p, sec);
    const r = radiers.find((x) => noRadier(x, c));
    if (r) { out.push({ pilar: p.id, tipo: 'radier', ref: r.id, c }); continue; }
    const cont = contornoPilar(p, sec);
    const v = vigas.find((x) => { const pr = projecaoNaViga(x, c); return pr.d <= (x.bApoio ?? x.b) / 2 + (x.bApoio !== undefined ? 0.05 : 1e-6) || dentroPoligono(pr.q, cont); });
    if (v) out.push({ pilar: p.id, tipo: 'viga', ref: v.id, c });
  }
  return out;
}

/** Há base elástica (radier ou viga sobre base elástica) no modelo? */
export const temBaseElastica = (b: BuildingModel) => !!(b.fundacao?.radiers?.length || vigasElasticasEf(b).length);

/** Carga no nível de fundação (ponto) sobre a base elástica? (as que caem nela não vão para vigas e elementos de fundação) */
export function pontoNaBase(b: BuildingModel, p: P): boolean {
  const fe = b.fundacao;
  return !!fe && ((fe.radiers ?? []).some((r) => noRadier(r, p)) || vigasElasticasEf(b).some((v) => projecaoNaViga(v, p).d <= v.b / 2 + 1e-6));
}

// ---------------- malha do radier ----------------

/**
 * Grade do radier: linhas paralelas às direções do radier (a da maior aresta e a perpendicular) com espaçamento ≤ s,
 * passando também pelos pilares (`pontos`), recortadas pelo contorno e pelos furos; largura de cada linha = metade da
 * distância entre as vizinhas; a faixa junto ao contorno (que as linhas não cobrem) vai para as bordas (como em
 * `malhaLaje`).
 */
export function gradeRadier(contorno: P[], furos: P[][], direcao: number, s: number, pontos: P[] = []) {
  const a = (direcao * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  const loc = (p: P): P => [p[0] * c + p[1] * sn, -p[0] * sn + p[1] * c];
  const glob = (p: P): P => [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c];
  const pol = contorno.map(loc);
  const aneis = [pol, ...furos.map((f) => f.map(loc))];
  const xs = pol.map((p) => p[0]), ys = pol.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pl = pontos.map(loc);
  /** Coordenadas internas das linhas: uniformes ≤ s mais as dos pilares (as uniformes muito próximas de um pilar saem). */
  const coords = (lo: number, hi: number, extras: number[]) => {
    const n = Math.max(2, Math.ceil((hi - lo) / s - 1e-9)), d = (hi - lo) / n;
    const ex = [...new Set(extras.filter((v) => v > lo + 1e-6 && v < hi - 1e-6).map((v) => +v.toFixed(6)))];
    const uni = Array.from({ length: n - 1 }, (_, i) => lo + (i + 1) * d).filter((v) => !ex.some((e) => Math.abs(e - v) < 0.35 * d));
    return [...uni, ...ex].sort((u, w) => u - w);
  };
  const X = coords(x0, x1, pl.map((p) => p[0])), Y = coords(y0, y1, pl.map((p) => p[1]));
  const larg = (L: number[], lo: number, hi: number) => L.map((_, i) => ((L[i + 1] ?? hi) - (L[i - 1] ?? lo)) / 2);
  const wx = larg(X, x0, x1), wy = larg(Y, y0, y1);
  const cortes = (eixo: 0 | 1, v: number): [number, number][] => {
    const t: number[] = [];
    for (const anel of aneis) for (let i = 0; i < anel.length; i++) {
      const p = anel[i], q = anel[(i + 1) % anel.length];
      if ((p[eixo] > v) !== (q[eixo] > v)) t.push(p[1 - eixo] + ((v - p[eixo]) * (q[1 - eixo] - p[1 - eixo])) / (q[eixo] - p[eixo]));
    }
    t.sort((u, w) => u - w);
    const out: [number, number][] = [];
    for (let k = 0; k + 1 < t.length; k += 2) if (t[k + 1] - t[k] > 1e-6) out.push([t[k], t[k + 1]]);
    return out;
  };
  const linhas: { dir: 0 | 1; largura: number; pontos: P[] }[] = [];
  Y.forEach((y, j) => { for (const [a0, a1] of cortes(1, y)) linhas.push({ dir: 0, largura: wy[j], pontos: [a0, ...X.filter((x) => x > a0 + 1e-9 && x < a1 - 1e-9), a1].map((x) => glob([x, y])) }); });
  X.forEach((x, i) => { for (const [a0, a1] of cortes(0, x)) linhas.push({ dir: 1, largura: wx[i], pontos: [a0, ...Y.filter((y) => y > a0 + 1e-9 && y < a1 - 1e-9), a1].map((y) => glob([x, y])) }); });
  const comp = (ps: P[]) => ps.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - ps[i][0], p[1] - ps[i][1]), 0);
  const A = Math.abs(areaPoligono(contorno)) - furos.reduce((t, f) => t + Math.abs(areaPoligono(f)), 0);
  const banda = [0, 1].map((d) => Math.max(0, A - linhas.filter((l) => l.dir === d).reduce((t, l) => t + l.largura * comp(l.pontos), 0)));
  const pontas = linhas.flatMap((l) => [l.pontos[0], l.pontos[l.pontos.length - 1]]);
  const bordas: { a: P; z: P }[] = [];
  for (const anel of [contorno, ...furos]) for (let i = 0; i < anel.length; i++) {
    const p0 = anel[i], p1 = anel[(i + 1) % anel.length], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (L < 1e-9) continue;
    const ts = [0, 1, ...pontas.map((p) => { const r = distSeg(p, p0, p1); return r.d < 1e-6 && r.t > 1e-9 && r.t < 1 - 1e-9 ? r.t : -1; }).filter((t) => t > 0)].sort((u, w) => u - w);
    for (let k = 0; k + 1 < ts.length; k++) if ((ts[k + 1] - ts[k]) * L > 1e-6)
      bordas.push({ a: [p0[0] + ts[k] * (p1[0] - p0[0]), p0[1] + ts[k] * (p1[1] - p0[1])], z: [p0[0] + ts[k + 1] * (p1[0] - p0[0]), p0[1] + ts[k + 1] * (p1[1] - p0[1])] });
  }
  const u = [[c, sn], [-sn, c]];
  const pesoBorda = [0, 1].map((d) => {
    const proj = (e: { a: P; z: P }) => Math.abs((e.z[0] - e.a[0]) * u[d][0] + (e.z[1] - e.a[1]) * u[d][1]);
    const soma = bordas.reduce((t, e) => t + proj(e), 0);
    return bordas.map((e) => { const L = Math.hypot(e.z[0] - e.a[0], e.z[1] - e.a[1]); return soma ? (banda[d] * proj(e)) / L / soma : 0; });
  });
  const passo = Math.min(...[...wx, ...wy, s]);
  return { linhas, bordas, pesoBorda, area: A, passo };
}

// ---------------- montagem no pórtico ----------------

/** Nó da base elástica no pórtico: índice, elemento, área de influência (m²), k (kN/m³) e rigidez da mola (kN/m). */
export interface NoBase { no: number; tipo: 'radier' | 'viga'; ref: string; x: number; y: number; area: number; k: number; kMola: number }
/** Barra da base elástica no pórtico: índice, elemento e, no radier, direção e largura da faixa. */
export interface BarraBase { bi: number; tipo: 'radier' | 'viga'; ref: string; dir?: 0 | 1; largura?: number; borda?: boolean }

export interface BaseElasticaAnalise {
  cota: number;
  nos: NoBase[];
  barras: BarraBase[];
  /** Pilares sem vínculo externo: id → nó do pé do pilar e elemento. */
  pilares: Record<string, { no: number; ref: string; tipo: 'radier' | 'viga' }>;
  /** Carga vertical característica aplicada direto na base elástica por caso (kN; peso próprio e cargas do nível de fundação). */
  cargas: Record<string, number>;
  /** Cargas do nível de fundação aplicadas na base elástica (ids). */
  cargasUsadas: string[];
}

export interface MontagemBase {
  info: BaseElasticaAnalise;
  /** Trecho rígido do primeiro lance dos pilares sobre a base (centro do pilar − nó da malha), global. */
  offsets: Map<string, [number, number, number]>;
  /** Cargas nodais por caso (id) a somar aos casos verticais do pórtico. */
  nodais: { caso: string; no: number; f: number[] }[];
  avisos: string[];
}

/**
 * Monta a base elástica no pórtico (muta `pm`: nós, barras, apoios e molas) na cota da fundação `z`. Os nós ficam com
 * ux, uy e rz presos [a confirmar] e mola vertical k × área; a viga também ganha mola de giro em torno do eixo
 * (k·b³/12 por metro) para não girar livre. Barras: E do concreto da fundação; radier com I = largura·h³/12 e
 * J = (fator de torção das lajes)·2I; viga com a seção b × h e o fator de torção das vigas.
 */
export function montarBaseElastica(b: BuildingModel, op: OpcoesCalculo & { nu: number }, pm: Modelo3, z: number, casos: string[]): MontagemBase | null {
  const fe = b.fundacao;
  if (!temBaseElastica(b)) return null;
  const E = concretoDe(b, 'fundacao').Ecs * 1000, G = E / (2 * (1 + op.nu));
  const s = op.radierMalha;
  const info: BaseElasticaAnalise = { cota: z, nos: [], barras: [], pilares: {}, cargas: Object.fromEntries(casos.map((c) => [c, 0])), cargasUsadas: [] };
  const nodais: MontagemBase['nodais'] = [], avisos: string[] = [], offsets = new Map<string, [number, number, number]>();
  const naBase = pilaresNaBase(b);
  const cargasF = b.cargas.filter((c) => c.grupo === 'fundacao');
  const casoDe = (c: string) => (casos.includes(c) ? c : null);
  const somar = (caso: string, no: number, fz: number) => { const c = casoDe(caso); if (!c || !fz) return; nodais.push({ caso: c, no, f: [0, 0, -fz, 0, 0, 0] }); info.cargas[c] += fz; };
  const usadas = new Set<string>();

  // ---- radiers ----
  for (const r of fe!.radiers ?? []) {
    const k = r.k ?? op.radierK, h = r.h, furos = r.furos ?? [];
    const meus = naBase.filter((x) => x.tipo === 'radier' && x.ref === r.id);
    const gr = gradeRadier(r.contorno, furos, direcaoPrincipal(r.contorno), s, meus.map((x) => x.c));
    if (!gr.linhas.length) { avisos.push(`Radier ${r.nome}: malha vazia (contorno pequeno para a malha de ${fmt(s, 2)} m).`); continue; }
    const tol = 0.002, hash = new Map<string, number[]>(), loc: number[] = [], area: number[] = [];
    const achar = (p: P) => {
      const gx = Math.round(p[0] / tol), gy = Math.round(p[1] / tol);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const i of hash.get(`${gx + dx}:${gy + dy}`) ?? []) { const n = pm.nos[loc[i]]; if (Math.hypot(n[0] - p[0], n[1] - p[1]) <= tol) return i; }
      loc.push(pm.nos.length); area.push(0); pm.nos.push([p[0], p[1], z]);
      const key = `${gx}:${gy}`; const l = hash.get(key); if (l) l.push(loc.length - 1); else hash.set(key, [loc.length - 1]);
      return loc.length - 1;
    };
    const barra = (i: number, j: number, w: number, tag: Omit<BarraBase, 'bi'>) => {
      const I = (w * h ** 3) / 12;
      const br: Barra3 = { i: loc[i], j: loc[j], E, G, A: w * h, Iz: I, Iy: (h * w ** 3) / 12, J: op.torcaoLaje * 2 * I };
      pm.barras.push(br);
      info.barras.push({ bi: pm.barras.length - 1, ...tag });
    };
    for (const ln of gr.linhas) {
      const ids = ln.pontos.map(achar);
      for (let j = 0; j + 1 < ids.length; j++) {
        if (ids[j] === ids[j + 1]) continue;
        barra(ids[j], ids[j + 1], ln.largura, { tipo: 'radier', ref: r.id, dir: ln.dir, largura: ln.largura });
        const L = Math.hypot(ln.pontos[j + 1][0] - ln.pontos[j][0], ln.pontos[j + 1][1] - ln.pontos[j][1]);
        area[ids[j]] += (0.5 * ln.largura * L) / 2; area[ids[j + 1]] += (0.5 * ln.largura * L) / 2;
      }
    }
    gr.bordas.forEach((e, kb) => {
      const ia = achar(e.a), iz = achar(e.z), L = Math.hypot(e.z[0] - e.a[0], e.z[1] - e.a[1]);
      const lg = 0.5 * (gr.pesoBorda[0][kb] + gr.pesoBorda[1][kb]);
      area[ia] += (lg * L) / 2; area[iz] += (lg * L) / 2;
      if (ia !== iz) barra(ia, iz, gr.passo / 2, { tipo: 'radier', ref: r.id, largura: gr.passo / 2, borda: true });
    });
    // pilares: nó da malha no centro (as linhas passam por ele) ou o mais próximo, com trecho rígido
    for (const x of meus) {
      const i = achar(x.c), n = pm.nos[loc[i]];
      info.pilares[x.pilar] = { no: loc[i], ref: r.id, tipo: 'radier' };
      const off: [number, number, number] = [x.c[0] - n[0], x.c[1] - n[1], 0];
      if (Math.hypot(off[0], off[1]) > 1e-6) offsets.set(x.pilar, off);
    }
    // cargas: peso próprio e cargas de área por área de influência; linhas e pontos no nó mais próximo
    const maisProximo = (p: P) => { let best = 0, d = Infinity; loc.forEach((g, i) => { const dd = Math.hypot(pm.nos[g][0] - p[0], pm.nos[g][1] - p[1]); if (dd < d) { d = dd; best = i; } }); return best; };
    loc.forEach((g, i) => {
      const p: P = [pm.nos[g][0], pm.nos[g][1]];
      info.nos.push({ no: g, tipo: 'radier', ref: r.id, x: p[0], y: p[1], area: area[i], k, kMola: k * area[i] });
      pm.apoios.set(g, [0, 1, 5]);
      (pm.molas ??= []).push({ no: g, gdl: 2, k: k * area[i] });
      somar('G', g, GAMA_CONCRETO * h * area[i]);
      for (const c of cargasF) if (c.tipo === 'area' && dentroPoligono(p, c.pontos)) { somar(c.caso, g, c.valor * area[i]); usadas.add(c.id); }
    });
    for (const c of cargasF) {
      if (c.tipo === 'area') continue;
      for (const pc of parcelas(c)) if (noRadier(r, pc.p)) { somar(c.caso, loc[maisProximo(pc.p)], pc.P); usadas.add(c.id); }
    }
    // arranques sobre o radier: as cargas lançadas neles vão para o nó mais próximo
    for (const p of b.pilares) {
      if (!ehArranque(p)) continue;
      const cc = centroPilar(p, p.secao);
      if (!noRadier(r, cc)) continue;
      const g = loc[maisProximo(cc)];
      for (const cp of (b.cargasPilar ?? []).filter((x) => x.pilar === p.id)) { const cs = casoDe(cp.caso); if (!cs) continue; nodais.push({ caso: cs, no: g, f: [cp.Hx, cp.Hy, -cp.N, cp.Mx, cp.My, 0] }); info.cargas[cs] += cp.N; }
    }
  }

  // ---- vigas sobre base elástica ----
  for (const v of vigasElasticasEf(b)) {
    const k = v.k ?? op.radierK;
    const meus = naBase.filter((x) => x.tipo === 'viga' && x.ref === v.id);
    // abscissas: vértices, divisão ≤ s e projeções dos pilares
    const segs: { a: P; z: P; L: number; s0: number }[] = [];
    let tot = 0;
    for (let i = 0; i + 1 < v.pontos.length; i++) { const a = v.pontos[i], zz = v.pontos[i + 1], L = Math.hypot(zz[0] - a[0], zz[1] - a[1]); if (L > 1e-6) { segs.push({ a, z: zz, L, s0: tot }); tot += L; } }
    if (!segs.length) continue;
    const ss = new Set<number>([0, tot]);
    for (const sg of segs) { ss.add(sg.s0); const n = Math.max(1, Math.ceil(sg.L / s - 1e-9)); for (let j = 1; j < n; j++) ss.add(sg.s0 + (j * sg.L) / n); }
    const proj = meus.map((x) => ({ x, pr: projecaoNaViga(v, x.c) }));
    for (const { pr } of proj) ss.add(pr.s);
    const lista = [...ss].sort((a, zz) => a - zz).filter((t, j, arr) => j === 0 || t - arr[j - 1] > 0.02 || proj.some((q) => Math.abs(q.pr.s - t) < 1e-9));
    const ponto = (t: number): { p: P; u: P } => { const sg = segs.find((x) => t <= x.s0 + x.L + 1e-9) ?? segs.at(-1)!, f = Math.min(1, Math.max(0, (t - sg.s0) / sg.L)); return { p: [sg.a[0] + f * (sg.z[0] - sg.a[0]), sg.a[1] + f * (sg.z[1] - sg.a[1])], u: [(sg.z[0] - sg.a[0]) / sg.L, (sg.z[1] - sg.a[1]) / sg.L] }; };
    const nos = lista.map((t) => { const { p, u } = ponto(t); pm.nos.push([p[0], p[1], z]); return { g: pm.nos.length - 1, t, p, u }; });
    const sec = v.secao ?? { A: v.b * v.h, Iz: (v.b * v.h ** 3) / 12, Iy: (v.h * v.b ** 3) / 12, J: op.torcaoViga * torcaoRet(v.b, v.h) };
    for (let j = 0; j + 1 < nos.length; j++) {
      pm.barras.push({ i: nos[j].g, j: nos[j + 1].g, E, G, ...sec });
      info.barras.push({ bi: pm.barras.length - 1, tipo: 'viga', ref: v.id });
    }
    nos.forEach((n, j) => {
      const Lt = ((nos[j + 1]?.t ?? n.t) - (nos[j - 1]?.t ?? n.t)) / 2, A = v.b * Lt;
      info.nos.push({ no: n.g, tipo: 'viga', ref: v.id, x: n.p[0], y: n.p[1], area: A, k, kMola: k * A });
      pm.apoios.set(n.g, [0, 1, 5]);
      const kr = (k * v.b ** 3 * Lt) / 12; // giro em torno do eixo: molas distribuídas na largura
      (pm.molas ??= []).push({ no: n.g, gdl: 2, k: k * A }, { no: n.g, gdl: 3, k: kr * n.u[0] ** 2 + 1e-9 * kr }, { no: n.g, gdl: 4, k: kr * n.u[1] ** 2 + 1e-9 * kr });
      somar('G', n.g, GAMA_CONCRETO * sec.A * Lt);
      for (const c of cargasF) if (c.tipo === 'area' && dentroPoligono(n.p, c.pontos)) { somar(c.caso, n.g, c.valor * A); usadas.add(c.id); }
    });
    for (const c of cargasF) {
      if (c.tipo === 'area') continue;
      for (const pc of parcelas(c)) {
        const pr = projecaoNaViga(v, pc.p);
        if (pr.d > v.b / 2 + 1e-6) continue;
        let best = nos[0], d = Infinity;
        for (const n of nos) { const dd = Math.abs(n.t - pr.s); if (dd < d) { d = dd; best = n; } }
        somar(c.caso, best.g, pc.P); usadas.add(c.id);
      }
    }
    // arranques sobre a viga: as cargas lançadas neles vão para o nó mais próximo
    for (const p of b.pilares) {
      if (!ehArranque(p)) continue;
      const cc = centroPilar(p, p.secao), pr = projecaoNaViga(v, cc);
      if (pr.d > v.b / 2 + 1e-6 || (fe!.radiers ?? []).some((r) => noRadier(r, cc))) continue;
      const n = nos.reduce((m, q) => (Math.abs(q.t - pr.s) < Math.abs(m.t - pr.s) ? q : m), nos[0]);
      for (const cp of (b.cargasPilar ?? []).filter((x) => x.pilar === p.id)) { const cs = casoDe(cp.caso); if (!cs) continue; nodais.push({ caso: cs, no: n.g, f: [cp.Hx, cp.Hy, -cp.N, cp.Mx, cp.My, 0] }); info.cargas[cs] += cp.N; }
    }
    for (const { x, pr } of proj) {
      const n = nos.reduce((m, q) => (Math.abs(q.t - pr.s) < Math.abs(m.t - pr.s) ? q : m), nos[0]);
      info.pilares[x.pilar] = { no: n.g, ref: v.id, tipo: 'viga' };
      const off: [number, number, number] = [x.c[0] - n.p[0], x.c[1] - n.p[1], 0];
      if (Math.hypot(off[0], off[1]) > 1e-6) offsets.set(x.pilar, off);
    }
  }
  info.cargasUsadas = [...usadas];
  return { info, offsets, nodais, avisos };
}

/** Carga de linha ou ponto do nível de fundação em parcelas concentradas (kN). */
function parcelas(c: BuildingModel['cargas'][number]): { p: P; P: number }[] {
  if (c.tipo === 'ponto') return [{ p: c.pontos[0], P: c.valor }];
  const out: { p: P; P: number }[] = [];
  for (let k = 0; k + 1 < c.pontos.length; k++) {
    const a = c.pontos[k], z = c.pontos[k + 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.25));
    for (let s = 0; s < n; s++) { const t = (s + 0.5) / n; out.push({ p: [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])], P: (c.valor * L) / n }); }
  }
  return out;
}

/** Forças que o pé do pilar (barra do primeiro lance, ponta i) faz no nó da base, em eixos globais (convenção de reação). */
export function forcaBasePilar(m: Modelo3, bi: number, f: ArrayLike<number>): { N: number; Vx: number; Vy: number; Mx: number; My: number } {
  const br = m.barras[bi], { R, oi } = baseBarra(m, br);
  const F = [0, 1, 2].map((k) => R[0][k] * f[0] + R[1][k] * f[1] + R[2][k] * f[2]);
  const M = [0, 1, 2].map((k) => R[0][k] * f[3] + R[1][k] * f[4] + R[2][k] * f[5]);
  M[0] += oi[1] * F[2] - oi[2] * F[1]; M[1] += oi[2] * F[0] - oi[0] * F[2];
  return { N: F[2], Vx: F[0], Vy: F[1], Mx: M[0], My: M[1] };
}

// ---------------- verificações ----------------

/** Resultado por nó (envoltória das raras): tensão no solo máxima e mínima (kN/m²) e maior recalque (m, para baixo). */
export interface NoResultadoBase { x: number; y: number; sigma: number; sigmaMin: number; w: number }

export interface ResultadoRadier {
  id: string; nome: string; h: number; k: number; sigmaAdm: number | null; area: number;
  /** Envoltória das combinações raras: maior e menor tensão no solo (kN/m²) e maior recalque (m). */
  sigmaMax: number; sigmaMin: number; combMax: string; combMin: string; recalque: number;
  /** Momentos de cálculo por metro (Wood-Armer; kN·m/m) nas direções 0 (maior aresta) e 1; pos = traciona a face inferior. */
  mPos: [number, number]; mNeg: [number, number];
  /** Armadura por metro (cm²/m): inf (face em contato com o solo) e sup, por direção. */
  As: { pos: [number, number]; neg: [number, number] };
  wk: number; wkLim: number;
  /** Ângulo da direção 0 (graus). */
  angulo: number;
  nos: NoResultadoBase[];
  status: 'ok' | 'fail'; mensagens: string[]; notas: string[];
}

export interface ResultadoVigaElastica {
  id: string; nome: string; b: number; h: number; k: number; sigmaAdm: number | null; L: number;
  sigmaMax: number; sigmaMin: number; combMax: string; combMin: string; recalque: number;
  /** Envoltória ELU: momento que traciona a face inferior e a superior (kN·m) e cortante (kN). */
  Md: { inf: number; sup: number }; Vd: number;
  /** Diagramas de cálculo (envoltória ELU) ao longo do eixo (s a partir do primeiro ponto). */
  diagrama: { s: number[]; Minf: number[]; Msup: number[]; V: number[] };
  armadura: { inf: { As: number; barras: BarChoice | null }; sup: { As: number; barras: BarChoice | null }; AsMin: number; estribo: { phi: number; s: number; legs: number } | null; pele?: BarChoice | null };
  nos: NoResultadoBase[];
  volume: number; aco: number;
  status: 'ok' | 'fail'; mensagens: string[]; notas: string[];
}

/** Deslocamento vertical (uz) dos nós por nome de caso (casos verticais e de vento). */
function deslocPorCaso(an: AnaliseEdificio): Map<string, Float64Array> {
  const m = new Map<string, Float64Array>(), pm = an.portico;
  if (!pm.res) return m;
  an.casos.forEach((c, ic) => m.set(c, pm.res!.desloc[ic]));
  if (pm.resVento) (an.vento?.casos ?? []).forEach((cv, ic) => m.set(cv.nome, pm.resVento!.desloc[ic]));
  return m;
}

/** Combinação com vento (algum caso de vento da NBR 6123 ou de natureza W com fator não nulo)? */
function temVento(b: BuildingModel, an: AnaliseEdificio, c: CombinacaoEd) {
  const w = new Set([...(an.vento?.casos ?? []).map((x) => x.nome), ...casosDaObra(b).filter((x) => x.natureza === 'W').map((x) => x.id)]);
  return Object.entries(c.fatores).some(([k, f]) => f && w.has(k));
}

/** Tensões no solo nos nós de um elemento: envoltória das raras, levantamento e verificação contra σadm. */
export function tensoes(b: BuildingModel, an: AnaliseEdificio, raras: CombinacaoEd[], nos: NoBase[], sigmaAdm: number | null, nome: string, msgs: string[], notas: string[]) {
  const desl = deslocPorCaso(an), fv = b.fundacao?.terreno.fatorVento ?? 1;
  const out: NoResultadoBase[] = nos.map((n) => ({ x: n.x, y: n.y, sigma: -Infinity, sigmaMin: Infinity, w: 0 }));
  let max = -Infinity, min = Infinity, cMax = '', cMin = '', rec = 0, pior = 0, cPior = '';
  for (const c of raras) {
    const lim = sigmaAdm !== null ? sigmaAdm * (temVento(b, an, c) ? fv : 1) : Infinity;
    nos.forEach((n, i) => {
      let w = 0;
      for (const k in c.fatores) { const d = desl.get(k); if (d) w += c.fatores[k] * d[n.no * 6 + 2]; }
      const sg = -n.k * w;
      const o = out[i];
      if (sg > o.sigma) o.sigma = sg;
      if (sg < o.sigmaMin) o.sigmaMin = sg;
      if (-w > o.w) o.w = -w;
      if (sg > max) { max = sg; cMax = c.nome; }
      if (sg < min) { min = sg; cMin = c.nome; }
      if (-w > rec) rec = -w;
      if (sg / lim > pior) { pior = sg / lim; cPior = c.nome; }
    });
  }
  if (!raras.length || !nos.length) { max = 0; min = 0; }
  if (min < -1e-6) msgs.push(`Fundação: levantamento em ${nome} (${cMin}): k·w = ${fmt(min)} kN/m² de tração no solo; a análise é linear, sem iteração (aumente a rigidez, a carga permanente ou a área de apoio).`);
  if (sigmaAdm === null) msgs.push(`Fundação sem σadm: ${nome} (informe a σadm do terreno ou a do elemento).`);
  else if (pior > 1 + 1e-9) msgs.push(`Fundação: tensão no solo em ${nome} acima da admissível (${cPior}): σ = ${fmt(max)} kN/m² > σadm = ${fmt(sigmaAdm)} kN/m²${fv !== 1 ? ` (× ${fmt(fv, 2)} com vento)` : ''}.`);
  notas.push(`Tensão no solo σ = k·w nas combinações raras: máxima ${fmt(max)} kN/m² (${cMax || '—'}), mínima ${fmt(min)} kN/m²; maior recalque ${fmt(rec * 1000, 2)} mm.`);
  return { out: out.map((o) => ({ ...o, sigma: Number.isFinite(o.sigma) ? o.sigma : 0, sigmaMin: Number.isFinite(o.sigmaMin) ? o.sigmaMin : 0 })), max, min, cMax, cMin, rec };
}

/** σadm do elemento: a própria ou a informada do terreno (no modo pelo SPT sem valor do elemento: sem σadm). */
export const sigmaDe = (b: BuildingModel, s?: number) => s ?? (b.fundacao?.terreno.sigmaModo !== 'sondagem' ? b.fundacao?.terreno.sigmaAdm ?? null : null);

/**
 * Verifica e dimensiona a base elástica: tensões no solo (raras), radier por Wood-Armer (ELU, faixa de 1 m; armadura
 * mínima 0,15 % por face e direção; fissuração na frequente) e viga sobre base elástica pela envoltória ELU das barras.
 * `momentosWA`: os momentos por Wood-Armer de uma grelha (dimensionamento.ts), passados para não criar dependência circular.
 */
export function dimensionarBaseElastica(b: BuildingModel, an: AnaliseEdificio, combs: { raras: CombinacaoEd[]; elu: CombinacaoEd[]; freq: CombinacaoEd[] },
  momentosWA: (g: GrelhaPavimento, ref: string, fat: number[]) => { pos: [number, number]; neg: [number, number] }): { radiers: ResultadoRadier[]; vigasElasticas: ResultadoVigaElastica[] } {
  const be = an.baseElastica, pm = an.portico;
  if (!be || !pm.res) return { radiers: [], vigasElasticas: [] };
  const raras = combs.raras.filter((c) => c.tipo === 'RARA'), elu = combs.elu.filter((c) => c.tipo === 'ELU'), freq = combs.freq.filter((c) => c.tipo === 'FREQ');
  // todos os casos (verticais e de vento) num resultado só, para combinar esforços com fatores por índice
  const nomes: string[] = [...an.casos], esforcos = [...pm.res.esforcos];
  if (pm.resVento) (an.vento?.casos ?? []).forEach((cv, ic) => { nomes.push(cv.nome); esforcos.push(pm.resVento!.esforcos[ic]); });
  const fat = (c: CombinacaoEd) => nomes.map((n) => c.fatores[n] ?? 0);
  const res = { ...pm.res, esforcos } as Resultado3;
  const tags: BarraGrelha[] = pm.modelo.barras.map(() => ({ tipo: 'viga', ref: '' }));
  for (const x of be.barras) if (x.tipo === 'radier' && x.dir !== undefined && !x.borda) tags[x.bi] = { tipo: 'laje', ref: x.ref, dir: x.dir, largura: x.largura };
  const grelha = { pavimento: 'fundacao', modelo: pm.modelo, barras: tags, res, reacoes: {}, carga: {} } as GrelhaPavimento;
  const c = concretoDe(b, 'fundacao'), aco = acoDe(b, 'fundacao'), cob = cobrimentoFundacao(b), op = an.opcoes;
  const caa = ({ I: 1, II: 2, III: 3, IV: 4 } as const)[b.norma.caa], wkLim = op.limiteFissura || crackLimit(caa);
  const radiers: ResultadoRadier[] = [];
  for (const r of b.fundacao?.radiers ?? []) {
    const nos = be.nos.filter((n) => n.ref === r.id);
    if (!nos.length) continue;
    const msgs: string[] = [], notas: string[] = [], sAdm = sigmaDe(b, r.sigmaAdm);
    const t = tensoes(b, an, raras, nos, sAdm, `radier ${r.nome}`, msgs, notas);
    // momentos ELU por Wood-Armer (envoltória das combinações)
    const mPos: [number, number] = [0, 0], mNeg: [number, number] = [0, 0];
    for (const cb of elu) { const m = momentosWA(grelha, r.id, fat(cb)); for (const k of [0, 1]) { mPos[k] = Math.max(mPos[k], m.pos[k]); mNeg[k] = Math.min(mNeg[k], m.neg[k]); } }
    const h = r.h, d = h - cob - 0.01, sec = { kind: 'rect' as const, bw: 1, h }, amin = RHO_MIN_LAJE * h;
    const As = (M: number) => Math.max(amin, M ? beamFlexure(sec, false, Math.abs(M), d, cob + 0.01, c, aco.fyd).As : 0) * 1e4;
    const AsR = { pos: [As(mPos[0]), As(mPos[1])] as [number, number], neg: [As(mNeg[0]), As(mNeg[1])] as [number, number] };
    for (const [lado, ms] of [['pos', mPos], ['neg', mNeg]] as const) for (const k of [0, 1]) { const f = beamFlexure(sec, false, Math.abs(ms[k]), d, cob + 0.01, c, aco.fyd); if (f.double) msgs.push(`Radier ${r.nome}: espessura insuficiente na flexão (${lado === 'pos' ? 'face inferior' : 'face superior'}, direção ${k}: md = ${fmt(Math.abs(ms[k]))} kN·m/m).`); }
    // fissuração na frequente
    let wk = 0, aumentou = false;
    for (const lado of ['pos', 'neg'] as const) for (const k of [0, 1]) {
      let Mk = 0;
      for (const cb of freq) { const m = momentosWA(grelha, r.id, fat(cb)); Mk = Math.max(Mk, Math.abs(lado === 'pos' ? m.pos[k] : m.neg[k])); }
      const w = () => { const br = escolherBarrasLaje(AsR[lado][k] / 1e4, h, Math.min(2 * h, 0.2), op.lajeEspacamentoMinimo / 100, 8, false); return Mk ? crackWidth(sec, false, br.As, br.phi, d, Mk, c, caa).wk : 0; };
      let wi = w();
      for (let it = 0; it < 20 && wi > wkLim; it++) { AsR[lado][k] *= 1.1; wi = w(); aumentou = true; }
      wk = Math.max(wk, wi);
    }
    if (aumentou) msgs.push(`Armadura aumentada para limitar a abertura de fissuras a ${fmt(wkLim, 2)} mm.`);
    if (wk > wkLim + 1e-9) msgs.push(`Abertura de fissuras ${fmt(wk, 2)} mm > ${fmt(wkLim, 2)} mm.`);
    notas.push(`Malha de ${fmt(op.radierMalha, 2)} m, k = ${fmt(r.k ?? op.radierK, 0)} kN/m³, molas k × área de influência; punção sob os pilares não verificada [a confirmar].`);
    const area = Math.abs(areaPoligono(r.contorno)) - (r.furos ?? []).reduce((s, f) => s + Math.abs(areaPoligono(f)), 0);
    radiers.push({
      id: r.id, nome: r.nome, h, k: r.k ?? op.radierK, sigmaAdm: sAdm, area, sigmaMax: t.max, sigmaMin: t.min, combMax: t.cMax, combMin: t.cMin, recalque: t.rec,
      mPos, mNeg, As: AsR, wk, wkLim, angulo: direcaoPrincipal(r.contorno), nos: t.out,
      status: msgs.some((m) => classificar(m).nivel === 'erro') ? 'fail' : 'ok', mensagens: msgs, notas,
    });
  }
  const vigasElasticas: ResultadoVigaElastica[] = [];
  for (const v of b.fundacao?.vigasElasticas ?? []) {
    const r = dimensionarVigaElastica(b, an, v, combs);
    if (r) vigasElasticas.push(r);
  }
  return { radiers, vigasElasticas };
}

/**
 * Viga sobre base elástica (ou sapata corrida sob pilares, FU7a): tensões no solo nas raras, envoltória ELU nas pontas
 * das barras, flexão, cortante e pele. Na sapata corrida a seção é um T invertido: o momento que traciona a face superior
 * (entre os pilares) comprime a aba (mesa de largura B) e o que traciona a inferior comprime a nervura (bw); cortante e
 * armadura superior pela nervura, armadura inferior na largura da aba [a confirmar]. `null`: elemento sem nós na análise.
 */
export function dimensionarVigaElastica(b: BuildingModel, an: AnaliseEdificio, v: VigaElasticaEf, combs: { raras: CombinacaoEd[]; elu: CombinacaoEd[]; freq: CombinacaoEd[] }): ResultadoVigaElastica | null {
  const be = an.baseElastica, pm = an.portico;
  if (!be || !pm.res) return null;
  const raras = combs.raras.filter((c) => c.tipo === 'RARA'), elu = combs.elu.filter((c) => c.tipo === 'ELU');
  const nomes: string[] = [...an.casos], esforcos = [...pm.res.esforcos];
  if (pm.resVento) (an.vento?.casos ?? []).forEach((cv, ic) => { nomes.push(cv.nome); esforcos.push(pm.resVento!.esforcos[ic]); });
  const fat = (c: CombinacaoEd) => nomes.map((n) => c.fatores[n] ?? 0);
  const c = concretoDe(b, 'fundacao'), aco = acoDe(b, 'fundacao'), cob = cobrimentoFundacao(b), op = an.opcoes, gs = gamas(b).s;
  const nos = be.nos.filter((n) => n.ref === v.id), barras = be.barras.filter((x) => x.ref === v.id);
  if (!nos.length) return null;
  const msgs: string[] = [], notas: string[] = [], sAdm = sigmaDe(b, v.sigmaAdm);
  const t = tensoes(b, an, raras, nos, sAdm, `${v.corrida ? 'sapata corrida' : 'viga'} ${v.nome}`, msgs, notas);
  // envoltória ELU nas pontas das barras (momento interno: + traciona embaixo)
  const s: number[] = [], Minf: number[] = [], Msup: number[] = [], V: number[] = [];
  let s0 = 0;
  for (const x of barras) {
    const br = pm.modelo.barras[x.bi], L = baseBarra(pm.modelo, br).L;
    for (const [k, sx] of [[0, s0], [6, s0 + L]] as const) {
      let mi = 0, ms = 0, vv = 0;
      for (const cb of elu) {
        const f = fat(cb);
        let M = 0, Vy = 0;
        f.forEach((fi, ic) => { if (fi) { const e = esforcos[ic][x.bi]; M += fi * (k === 0 ? -e[5] : e[11]); Vy += fi * e[k + 1]; } });
        mi = Math.max(mi, M); ms = Math.max(ms, -M); vv = Math.max(vv, Math.abs(Vy));
      }
      s.push(+sx.toFixed(4)); Minf.push(mi); Msup.push(ms); V.push(vv);
    }
    s0 += L;
  }
  const Md = { inf: Math.max(0, ...Minf), sup: Math.max(0, ...Msup) }, Vd = Math.max(0, ...V);
  const dd = v.h - cob - 0.013, bw = v.bApoio ?? v.b;
  // seção que comprime na face inferior (tração em cima: mesa = aba) e na superior (tração embaixo: nervura)
  const secSup: BeamSection = v.corrida && v.h0 && v.h0 < v.h ? { kind: 'tee', bw, h: v.h, bf: v.b, hf: v.h0 } : { kind: 'rect', bw, h: v.h };
  const secInf: BeamSection = { kind: 'rect', bw, h: v.h };
  const AsMin = beamAsMin(secInf, false, dd, c, aco.fyd);
  const fi = beamFlexure(secInf, false, Md.inf, dd, cob + 0.013, c, aco.fyd), fs = beamFlexure(secSup, secSup.kind === 'tee', Md.sup, dd, cob + 0.013, c, aco.fyd);
  const inf = { As: Math.max(fi.As + fs.As2, AsMin), barras: null as BarChoice | null }, sup = { As: Math.max(fs.As + fi.As2, AsMin), barras: null as BarChoice | null };
  inf.barras = chooseBars(inf.As, v.b, cob, 0.005, 0.019); sup.barras = chooseBars(sup.As, bw, cob, 0.005, 0.019);
  const sh = beamShear(bw, dd, Vd, c, aco.fyk, gs);
  const pele = v.h > 0.6 ? (() => { const n = Math.max(2, Math.ceil((0.001 * bw * v.h) / barArea(8) - 1e-9)); return { phi: 8, n, As: n * barArea(8), layers: 1 }; })() : undefined;
  if (fi.double || fs.double) msgs.push(`Viga de fundação: flexão com armadura dupla (x limitado) na seção ${Math.round(bw * 100)}×${Math.round(v.h * 100)} cm; aumente a altura.`);
  if (!inf.barras || !sup.barras) msgs.push(`Viga de fundação: flexão — armadura não cabe na largura (${Math.round(bw * 100)} cm).`);
  if (!sh.ok) msgs.push(`Viga de fundação: biela comprimida, Vd = ${fmt(Vd)} > VRd2 = ${fmt(sh.VRd2)} kN.`);
  else if (!sh.stirrup) msgs.push('Viga de fundação: cortante — estribo não encontrado.');
  const L = s0, est = sh.stirrup, perim = 2 * (bw - 2 * cob + v.h - 2 * cob) + 0.2;
  const kg = (A: number, len: number) => A * len * 7850;
  const acoKg = (inf.barras ? kg(inf.barras.As, L) : 0) + (sup.barras ? kg(sup.barras.As, L) : 0) + (est ? kg(barArea(est.phi), perim) * (Math.ceil(L / est.s) + 1) : 0) + (pele ? 2 * kg(pele.As, L) : 0);
  notas.push(`Molas k × b × comprimento de influência (k = ${fmt(v.k ?? op.radierK, 0)} kN/m³); giro em torno do eixo com k·b³/12 por metro; envoltória ELU nas pontas das barras.`);
  const volume = v.secao ? v.secao.A * L : v.b * v.h * L;
  return {
    id: v.id, nome: v.nome, b: v.b, h: v.h, k: v.k ?? op.radierK, sigmaAdm: sAdm, L, sigmaMax: t.max, sigmaMin: t.min, combMax: t.cMax, combMin: t.cMin, recalque: t.rec,
    Md, Vd, diagrama: { s, Minf, Msup, V }, armadura: { inf, sup, AsMin, estribo: est, ...(pele ? { pele } : {}) }, nos: t.out,
    volume, aco: acoKg, status: msgs.some((m) => classificar(m).nivel === 'erro') ? 'fail' : 'ok', mensagens: msgs, notas,
  };
}

/** Avisos de modelo da base elástica: apoios mistos e radier sem carga no nível de fundação. */
export function avisosBaseElastica(b: BuildingModel, info: BaseElasticaAnalise | undefined): string[] {
  if (!info) return [];
  const out: string[] = [];
  const flut = new Set(Object.keys(info.pilares));
  const fixos = b.pilares.filter((p) => p.nasce === 'fundacao' && !ehArranque(p) && !flut.has(p.id));
  if (flut.size && fixos.length) out.push(`Apoios mistos: ${flut.size} pilar(es) sobre base elástica e ${fixos.length} com vínculo externo (${fixos.slice(0, 6).map((p) => p.nome).join(', ')}${fixos.length > 6 ? '…' : ''}); os recalques diferenciais entre eles não são compatibilizados.`);
  if ((b.fundacao?.radiers ?? []).length && !b.cargas.some((c) => c.grupo === 'fundacao' && info.cargasUsadas.includes(c.id))) out.push('Radier sem cargas no nível de fundação: só o peso próprio e os pilares (lance as cargas do piso sobre o radier no nível de fundação).');
  for (const r of b.fundacao?.radiers ?? []) if (!Object.values(info.pilares).some((x) => x.ref === r.id)) out.push(`Radier ${r.nome} sem pilares: recebe só as cargas do nível de fundação.`);
  return out;
}

// ---------------- detalhamento do radier ----------------

const pesoLinear = (phi: number) => barArea(phi) * 7850;
const arred = (x: number, passo: number) => Math.ceil(x / passo - 1e-9) * passo;
const r4 = (p: P): P => [+p[0].toFixed(4), +p[1].toFixed(4)];

/**
 * Detalhamento do radier pelas regras das lajes maciças (R4): malha inferior e superior nas duas direções, cada uma com a
 * maior armadura por metro do radier (envoltória), barras corridas recortadas pelo contorno e pelos furos, com perna
 * vertical (h − 2c) nas bordas [a confirmar] e emenda por traspasse (α0t = 2) acima da barra máxima. Mesmo formato do
 * detalhamento das lajes (planta, tabela de aço e pranchas).
 */
export function detalharRadier(b: BuildingModel, r: Radier, res: ResultadoRadier, op: OpcoesCalculo): DetalheLaje {
  const h = r.h, cob = cobrimentoFundacao(b), c = concretoDe(b, 'fundacao'), aco = acoDe(b, 'fundacao');
  const passo = op.arredondamento / 100, Lmax = op.barraMaxima, smin = op.lajeEspacamentoMinimo / 100, smax = Math.min(2 * h, 0.2);
  const th = (res.angulo * Math.PI) / 180, U: [P, P] = [[Math.cos(th), Math.sin(th)], [-Math.sin(th), Math.cos(th)]];
  const dot = (a: P, z: P) => a[0] * z[0] + a[1] * z[1];
  const avisos: string[] = [], posicoes: PosicaoLaje[] = [], emendas: DetalheLaje['emendas'] = [];
  const perna = Math.max(0, h - 2 * cob);
  const positivas: DetalheLaje['positivas'] = [];
  let np = 0, phiSup = 10;
  for (const face of ['inf', 'sup'] as const) for (const k of [0, 1] as const) {
    const nec = (face === 'inf' ? res.As.pos[k] : res.As.neg[k]) / 1e4;
    const br = escolherBarrasLaje(nec, h, smax, smin, 8, aco.aco === 'CA-60');
    if (!br.cabe) avisos.push(`Radier ${r.nome}: ${fmt(nec * 1e4, 2)} cm²/m (${face === 'inf' ? 'inferior' : 'superior'}, direção ${k}) não cabe com espaçamento ≥ ${fmt(smin * 100, 0)} cm.`);
    if (face === 'inf') positivas.push({ phi: br.phi, s: br.s, As: +(br.As * 1e4).toFixed(3), AsNec: +(nec * 1e4).toFixed(3), secundaria: false });
    else phiSup = br.phi;
    const ua = U[k], uc = U[1 - k];
    const loc = (p: P): P => [dot(p, ua), dot(p, uc)], glob = (a: number, cc: number): P => [ua[0] * a + uc[0] * cc, ua[1] * a + uc[1] * cc];
    const aneis = [r.contorno, ...(r.furos ?? [])].map((x) => x.map(loc));
    const cs = aneis[0].map((p) => p[1]), cmin = Math.min(...cs) + cob, W = Math.max(...cs) - cob - cmin;
    if (W <= 0) continue;
    const nL = Math.max(1, Math.ceil(W / br.s - 1e-9)), pc = W / nL;
    const lb = lbBasico(br.phi, c, aco.fyd, face === 'inf' || h - cob <= 0.3, aco.aco === 'CA-60'), l0 = alfa0t(1) * lb;
    type Peca = { a0: number; a1: number; g: [number, number]; L: number };
    const linhas: { cc: number; pecas: Peca[] }[] = [];
    for (let i = 0; i <= nL; i++) {
      const cc = cmin + i * pc, pecas: Peca[] = [];
      for (const ch of cortesLaje(aneis, cc)) {
        const g: [number, number] = [ch.ponta[0][0] === 0 ? perna : 0, ch.ponta[1][0] === 0 ? perna : 0];
        const a0 = ch.a0 + cob, a1 = ch.a1 - cob;
        if (a1 - a0 < 0.05) continue;
        const tot = a1 - a0 + g[0] + g[1];
        if (tot <= Lmax + 1e-9) { pecas.push({ a0, a1, g, L: arred(tot, passo) }); continue; }
        let nP = Math.ceil((tot - l0) / (Lmax - l0) - 1e-9);
        for (; nP < 50; nP++) if (arred((tot + (nP - 1) * l0) / nP, passo) <= Lmax + 1e-9) break;
        const Lp = (tot + (nP - 1) * l0) / nP;
        for (let j = 0; j < nP; j++) {
          const s0 = a0 + j * (Lp - l0) - (j > 0 ? g[0] : 0), s1 = j === nP - 1 ? a1 : s0 + Lp - (j === 0 ? g[0] : 0);
          const gg: [number, number] = [j === 0 ? g[0] : 0, j === nP - 1 ? g[1] : 0];
          pecas.push({ a0: Math.max(a0, s0), a1: Math.min(a1, s1), g: gg, L: arred(Math.min(a1, s1) - Math.max(a0, s0) + gg[0] + gg[1], passo) });
        }
        const em = emendas.find((x) => x.dir === k);
        if (em) em.linhas++; else emendas.push({ dir: k, l0, linhas: 1 });
      }
      linhas.push({ cc, pecas });
    }
    const chave = (x: { pecas: Peca[] }) => x.pecas.map((p) => `${p.L.toFixed(3)}|${p.g[0] > 0}|${p.g[1] > 0}`).join(';');
    let i0 = 0;
    for (let i = 1; i <= linhas.length; i++) {
      if (i < linhas.length && chave(linhas[i]) === chave(linhas[i0])) continue;
      const grupo = linhas.slice(i0, i), rep = grupo[Math.floor(grupo.length / 2)];
      for (const pcx of rep.pecas) {
        const a = glob(pcx.a0, rep.cc), z = glob(pcx.a1, rep.cc), mid = (pcx.a0 + pcx.a1) / 2;
        posicoes.push({ pos: `N${++np}`, face, tipo: face === 'inf' ? 'positiva' : 'negativa', angulo: +(((Math.atan2(ua[1], ua[0]) * 180) / Math.PI + 360) % 360).toFixed(3), dir: k, phi: br.phi, s: br.s, n: grupo.length,
          comprimento: pcx.L, ganchos: pcx.g, a: r4(a), z: r4(z), faixa: [r4(glob(mid, grupo[0].cc)), r4(glob(mid, grupo.at(-1)!.cc))] });
      }
      i0 = i;
    }
  }
  const peso = posicoes.reduce((t, x) => t + x.n * x.comprimento * pesoLinear(x.phi), 0);
  return {
    laje: r.id, nome: r.nome, repeticoes: 1, h, angulo: +res.angulo.toFixed(3), positivas, bordas: [], posicoes,
    lb: { inf: lbBasico(positivas[0]?.phi ?? 10, c, aco.fyd, true, aco.aco === 'CA-60'), sup: lbBasico(phiSup, c, aco.fyd, h - cob <= 0.3, aco.aco === 'CA-60'), supBoaAderencia: h - cob <= 0.3 },
    emendas, peso, avisos,
  };
}

/** Resumo para o MCP e a linha de comando (sem os nós). */
export function resumoBaseElastica(r: ResultadoRadier | ResultadoVigaElastica) {
  const base = { id: r.id, nome: r.nome, sigmaAdm: r.sigmaAdm, sigmaMax: +r.sigmaMax.toFixed(1), sigmaMin: +r.sigmaMin.toFixed(1), recalque_mm: +(r.recalque * 1000).toFixed(2), k: r.k, status: r.status, mensagens: r.mensagens };
  if ('As' in r) return { ...base, tipo: 'radier', h: r.h, As_cm2m: { inf: r.As.pos.map((x) => +x.toFixed(2)), sup: r.As.neg.map((x) => +x.toFixed(2)) } };
  return { ...base, tipo: 'viga', secao: [r.b, r.h], Md: { inf: +r.Md.inf.toFixed(1), sup: +r.Md.sup.toFixed(1) }, Vd: +r.Vd.toFixed(1) };
}

/** Próximos nomes livres (R1, R2…; VE1, VE2…). */
export function nomeRadier(b: BuildingModel) { return `R${Math.max(0, ...(b.fundacao?.radiers ?? []).map((x) => { const m = /^R(\d+)$/.exec(x.nome); return m ? +m[1] : 0; })) + 1}`; }
export function nomeVigaElastica(b: BuildingModel) { return `VE${Math.max(0, ...(b.fundacao?.vigasElasticas ?? []).map((x) => { const m = /^VE(\d+)$/.exec(x.nome); return m ? +m[1] : 0; })) + 1}`; }

/** Resumo do aço dos radiers por bitola (aço da fundação), com as perdas (%). */
export function resumoAcoRadiers(b: BuildingModel, dets: DetalheLaje[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const aco = acoDe(b, 'fundacao').aco, m = new Map<number, number>();
  for (const d of dets) for (const x of d.posicoes) m.set(x.phi, (m.get(x.phi) ?? 0) + x.n * x.comprimento);
  return [...m.entries()].sort((a, z) => a[0] - z[0]).map(([phi, comprimento]) => { const peso = comprimento * pesoLinear(phi); return { aco, phi, comprimento, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}
