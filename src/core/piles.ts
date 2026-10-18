// Fundações profundas: capacidade geotécnica (Décourt-Quaresma 1978 / Décourt 1996), limites executivos,
// blocos rígidos de 1 a 6 estacas, carga horizontal (Miche) e dimensionamento estrutural (NBR 6122:2019, Tabela 4).
// Unidades: kN, m, kN·m (internamente MPa/MN no cálculo de seção).
import { barArea, circleBars, circleWidth, concrete, momentCapacity, type Concrete } from './concrete';

export type SoilClass = 'argila' | 'silteArgiloso' | 'silteArenoso' | 'areia';
export type PileType = 'escavada' | 'helice' | 'premoldada';

export const SOIL_LABEL: Record<SoilClass, string> = {
  argila: 'Argila',
  silteArgiloso: 'Silte argiloso',
  silteArenoso: 'Silte arenoso',
  areia: 'Areia',
};
export const PILE_LABEL: Record<PileType, string> = {
  escavada: 'Escavada mecânica (sem fluido)',
  helice: 'Hélice contínua',
  premoldada: 'Pré-moldada de concreto',
};

export interface SptMeter { N: number; soil: SoilClass } // índice i ↔ profundidade (i + 1) m
/** Furo de sondagem. id e coordenadas (m, mesmo sistema dos apoios) são opcionais (arquivos antigos não têm). */
export interface Boring { id?: number; name: string; water: number | null; meters: SptMeter[]; endImpenetrable: boolean; x?: number; y?: number }

export type FoundationKind = 'estacas' | 'sapata' | 'tubulao';
export const KIND_LABEL: Record<FoundationKind, string> = { estacas: 'Estacas + bloco', sapata: 'Sapata', tubulao: 'Tubulão a céu aberto' };
/**
 * Cargas características por apoio, no topo do elemento de fundação (kN, kN·m).
 * Nk: máximo da envoltória rara; NkMin: mínimo da envoltória rara (negativo = tração);
 * NkPerm: parcela permanente (soma dos casos G). Sem NkPerm, adota-se NkPerm = Nk (a favor da segurança:
 * toda a diferença Nk − NkMin é tratada como variável que alivia a compressão).
 */
export interface FLoad {
  id: number; label: string; Nk: number; NkMin: number; NkPerm?: number; Hx: number; Hy: number; Mx: number; My: number; source?: string;
  /** Tipo de fundação do apoio (padrão: estacas + bloco). */
  kind?: FoundationKind;
  /** Furo de sondagem escolhido (id); sem escolha, o mais próximo (com coordenadas) ou o primeiro. */
  boringId?: number;
  /** Coordenadas do apoio em planta (m), para escolher o furo mais próximo. */
  x?: number; y?: number;
  /** Seção do pilar (m): a ao longo de x (plano do pórtico), b ao longo de y. Padrão: params.colA × colB. */
  ap?: number; bp?: number;
  /** Estaca adotada para o bloco (tipo e diâmetro em cm). Padrão: a recomendada do primeiro tipo. */
  pile?: { type: PileType; D: number };
}

export interface FoundationParams {
  types: PileType[];
  diameters: number[]; // cm (moldadas in loco)
  precastDiameters: number[]; // cm
  cutoff: number; // m, profundidade da cota de arrasamento
  minLength: number; // m, comprimento mínimo da estaca
  blockWeightPct: number; // %
  spacingInSitu: number; // × D
  spacingPrecast: number; // × D
  hcMaxDepth: number; // m
  precastStopN: number; // N_SPT de parada estimada (nega)
  augerStopN: number; // N_SPT de parada do trado (escavada)
  caa: 'I-II' | 'III-IV';
  cover: number; // m
  stirrupPhi: number; // mm
  stirrupS: number; // m
  nhClay: number; // MN/m³ para argilas médias/rijas (estimativa)
  dmax: number; // m
  fyk: number; // MPa
  steelPerM3: number; // equivalência de custo: kg de aço que custam o mesmo que 1 m³ de estaca
  gammaF: number; // γf desfavorável (NBR 6118 Tab. 11.1 / NBR 6122)
  gammaFfav: number; // γf da parcela permanente favorável
  // pilar (quando o apoio não informa) e concreto de blocos/sapatas
  colA: number; colB: number; // m
  colPhi: number; // mm, bitola longitudinal do pilar (ancoragem no bloco/sapata)
  fckFound: number; // MPa, blocos e sapatas
  gammaC: number; gammaS: number;
  // blocos de coroamento (C1)
  capThetaMin: number; capThetaMax: number; // graus
  capKR: number; capK2: number; capK3: number; capK4: number; capK5: number; capK6: number;
  capEdge: number; // m, da face da estaca à borda do bloco
  capDprime: number; // m, do eixo do tirante à face inferior (mínimo)
  capBand: number; // × D, largura da faixa da armadura principal sobre as estacas
  capDistRatio: number; // fração da armadura principal na malha de distribuição
  capSuspFactor: number; // × D, espaçamento acima do qual se arma a suspensão
  capSkinRatio: number; // armadura de pele por face (bloco de 2 estacas)
  cap1Ratio: number; // h / lado do bloco sobre 1 estaca
  // sapatas (C2)
  ftSigmaMode: 'spt' | 'informada';
  ftSigmaAdm: number; // kPa
  ftDepth: number; // m, cota de apoio
  ftPP: number; // % de N, peso próprio da sapata + solo
  ftSptDiv: number; // σadm (MPa) = N̄/ftSptDiv
  ftNmaxEst: number; // N̄ máximo na estimativa
  ftBulb: number; // × menor lado: profundidade do bulbo para N̄
  ftEdgeFactor: number; // σmáx ≤ fator·σadm
  ftMinCompressed: number; // fração mínima da base comprimida
  ftMaxRatio: number; // A/B máximo
  ftKind: 'rigida' | 'flexivel';
  ftMethod: 'ceb70' | 'bielas';
  ftRhoMin: number;
  ftH0Min: number; // m, altura mínima da borda
  gammaSoil: number; // kN/m³, peso do solo sobre a sapata (conferência do peso próprio)
  // tubulões (C3)
  tbSigmaMode: 'spt' | 'informada';
  tbSigmaAdm: number; // kPa
  tbSptDiv: number; // σadm (MPa) = N̄/tbSptDiv
  tbNmaxEst: number;
  tbDepth: number; // m, cota da base (0 = automático)
  tbMinDepth: number; // m
  tbDfMin: number; // m, diâmetro mínimo do fuste
  tbFck: number; tbGc: number;
  tbDbMax: number; // m
  tbHmax: number; // m, altura máxima da base alargada
  tbRodape: number; // m
  tbWeight: boolean; // somar o peso próprio do tubulão na base
}

/** boring = primeiro furo (formato antigo, mantido em sincronia); borings = todos os furos (C4). */
export interface FoundationData { boring: Boring; borings?: Boring[]; loads: FLoad[]; params: FoundationParams }

/** Furos da obra com id garantido (arquivos antigos têm só `boring`). */
export function boringsOf(f: Pick<FoundationData, 'boring' | 'borings'>): Boring[] {
  const list = f.borings?.length ? f.borings : [f.boring];
  const used = new Set<number>();
  return list.map((b, i) => {
    let id = b.id ?? i + 1;
    while (used.has(id)) id++;
    used.add(id);
    return b.id === id ? b : { ...b, id };
  });
}

/** Furo usado por um apoio: o escolhido; senão o mais próximo (se apoio e furos têm coordenadas); senão o primeiro. */
export function boringFor(ld: FLoad, f: Pick<FoundationData, 'boring' | 'borings'>): Boring {
  const list = boringsOf(f);
  const chosen = ld.boringId !== undefined ? list.find((b) => b.id === ld.boringId) : undefined;
  if (chosen) return chosen;
  if (ld.x !== undefined && ld.y !== undefined) {
    const withXY = list.filter((b) => b.x !== undefined && b.y !== undefined);
    if (withXY.length) return withXY.reduce((a, b) => (Math.hypot(b.x! - ld.x!, b.y! - ld.y!) < Math.hypot(a.x! - ld.x!, a.y! - ld.y!) ? b : a));
  }
  return list[0];
}

/** Como o furo do apoio foi escolhido (para o memorial). */
export function boringChoice(ld: FLoad, f: Pick<FoundationData, 'boring' | 'borings'>): string {
  const list = boringsOf(f);
  if (ld.boringId !== undefined && list.some((b) => b.id === ld.boringId)) return 'escolhido';
  if (ld.x !== undefined && ld.y !== undefined && list.some((b) => b.x !== undefined && b.y !== undefined)) return 'mais próximo';
  return list.length > 1 ? 'primeiro furo (sem coordenadas)' : 'único furo';
}

/** Completa parâmetros e furos de dados antigos (retrocompatível). */
export function normalizeFoundation(f: FoundationData): FoundationData {
  const borings = boringsOf(f);
  return { ...f, borings, boring: borings[0], params: { ...defaultFoundationParams(), ...f.params } };
}

/** Seção do pilar do apoio (m). */
export const columnOf = (ld: FLoad, p: FoundationParams) => ({ ap: ld.ap ?? p.colA, bp: ld.bp ?? p.colB });

export const defaultFoundationParams = (): FoundationParams => ({
  types: ['helice', 'escavada', 'premoldada'],
  diameters: [25, 30, 40, 50, 60, 80, 100],
  precastDiameters: [26, 33, 38, 42, 50, 60, 70, 80],
  cutoff: 0,
  minLength: 3,
  blockWeightPct: 5,
  spacingInSitu: 3,
  spacingPrecast: 2.5,
  hcMaxDepth: 24,
  precastStopN: 30,
  augerStopN: 50,
  caa: 'I-II',
  cover: 0.05,
  stirrupPhi: 5,
  stirrupS: 0.2,
  nhClay: 0.5,
  dmax: 0.0095,
  fyk: 500,
  steelPerM3: 85,
  gammaF: 1.4,
  gammaFfav: 1.0,
  colA: 0.3, colB: 0.3, colPhi: 16,
  fckFound: 30, gammaC: 1.4, gammaS: 1.15,
  capThetaMin: 45, capThetaMax: 55,
  capKR: 0.9, capK2: 1.4, capK3: 1.75, capK4: 2.1, capK5: 2.1, capK6: 2.1,
  capEdge: 0.15, capDprime: 0.1, capBand: 1.2, capDistRatio: 0.2, capSuspFactor: 3, capSkinRatio: 0.001, cap1Ratio: 1,
  ftSigmaMode: 'spt', ftSigmaAdm: 200, ftDepth: 1.5, ftPP: 5, ftSptDiv: 50, ftNmaxEst: 20, ftBulb: 2,
  ftEdgeFactor: 1, ftMinCompressed: 2 / 3, ftMaxRatio: 2.5, ftKind: 'rigida', ftMethod: 'ceb70', ftRhoMin: 0.0015, ftH0Min: 0.2, gammaSoil: 18,
  tbSigmaMode: 'spt', tbSigmaAdm: 600, tbSptDiv: 30, tbNmaxEst: 40, tbDepth: 0, tbMinDepth: 3, tbDfMin: 0.7,
  tbFck: 25, tbGc: 1.6, tbDbMax: 4, tbHmax: 1.8, tbRodape: 0.2, tbWeight: true,
});

export const sampleFoundation = (): FoundationData => ({
  boring: {
    name: 'SP-01 (exemplo)',
    water: 9,
    endImpenetrable: false,
    meters: [
      [3, 'argila'], [4, 'argila'], [5, 'argila'], [6, 'silteArgiloso'], [8, 'silteArgiloso'], [9, 'silteArgiloso'],
      [11, 'silteArenoso'], [12, 'silteArenoso'], [14, 'silteArenoso'], [15, 'areia'], [17, 'areia'], [19, 'areia'],
      [21, 'areia'], [24, 'areia'], [26, 'silteArenoso'], [28, 'silteArenoso'], [31, 'silteArenoso'], [34, 'areia'],
      [38, 'areia'], [42, 'areia'], [45, 'areia'], [50, 'areia'],
    ].map(([N, soil]) => ({ N: N as number, soil: soil as SoilClass })),
  },
  loads: [
    { id: 1, label: 'P1', Nk: 650, NkMin: 420, NkPerm: 420, Hx: 18, Hy: 6, Mx: 12, My: 35, source: 'exemplo' },
    { id: 2, label: 'P2', Nk: 1350, NkMin: 900, NkPerm: 900, Hx: 25, Hy: 10, Mx: 20, My: 60, source: 'exemplo' },
  ],
  params: defaultFoundationParams(),
});

// ---------------------------------------------------------------- coeficientes
const C_TIP: Record<SoilClass, number> = { argila: 120, silteArgiloso: 200, silteArenoso: 250, areia: 400 };
type Group = 0 | 1 | 2; // argilas, intermediários, areias
const GROUP: Record<SoilClass, Group> = { argila: 0, silteArgiloso: 1, silteArenoso: 1, areia: 2 };
export const ALPHA: Record<PileType, [number, number, number]> = { premoldada: [1, 1, 1], escavada: [0.85, 0.6, 0.5], helice: [0.3, 0.3, 0.3] };
export const BETA: Record<PileType, [number, number, number]> = { premoldada: [1, 1, 1], escavada: [0.8, 0.65, 0.5], helice: [1, 1, 1] };

/** NBR 6122:2019, Tabela 4 (projeto de 2018 — conferir no texto publicado). */
export const STRUCT: Record<'escavada' | 'helice', { 'I-II': { fck: number; gc: number }; 'III-IV': { fck: number; gc: number }; Lmin: number; sigmaLim: number; rhoMin: number }> = {
  helice: { 'I-II': { fck: 30, gc: 2.7 }, 'III-IV': { fck: 40, gc: 3.6 }, Lmin: 4, sigmaLim: 6, rhoMin: 0.004 },
  escavada: { 'I-II': { fck: 25, gc: 3.1 }, 'III-IV': { fck: 40, gc: 5.0 }, Lmin: 2, sigmaLim: 5, rhoMin: 0.004 },
};

/** Carga estrutural e de tração de catálogo (SCAC, estacas centrifugadas; menor valor da faixa), kN. */
export const PRECAST_CATALOG: Record<number, { P: number; T: number }> = {
  26: { P: 500, T: 150 }, 33: { P: 800, T: 180 }, 38: { P: 1000, T: 210 }, 42: { P: 1250, T: 240 },
  50: { P: 1700, T: 270 }, 60: { P: 2350, T: 370 }, 70: { P: 3150, T: 480 }, 80: { P: 4000, T: 640 },
};

export const PHI_PILE = [6.3, 8, 10, 12.5, 16, 20, 25];

// ---------------------------------------------------------------- capacidade
export interface Capacity { L: number; Rp: number; Rl: number; RpUsed: number; Padm: number; Tadm: number; Np: number; Nl: number; governs: 'global' | 'parcial' | 'ponta' }

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function capacity(type: PileType, D: number, L: number, b: Boring, cutoff: number): Capacity | null {
  const m = b.meters;
  if (L < 1 || L > m.length) return null;
  const at = (i: number) => (i >= 1 && i <= m.length ? m[i - 1] : null); // N medido no metro i
  const tipVals: number[] = [];
  for (const i of [L - 1, L, L + 1]) { const s = at(i); if (s) tipVals.push(clampN(s.N, 0, 50)); else if (i > m.length && b.endImpenetrable) tipVals.push(50); }
  const Np = tipVals.reduce((s, v) => s + v, 0) / tipVals.length;
  const tipSoil = at(L)!.soil;
  const Ap = (Math.PI * D * D) / 4;
  const U = Math.PI * D;
  const Rp = ALPHA[type][GROUP[tipSoil]] * C_TIP[tipSoil] * Np * Ap;
  // fuste: metros entre o arrasamento e a ponta; os dois últimos usam a média do fuste (exclusão dos N da ponta)
  const shaft: { i: number; w: number }[] = [];
  for (let i = Math.floor(cutoff) + 1; i <= L; i++) { const w = Math.min(1, i - cutoff); if (w > 0) shaft.push({ i, w }); }
  const body = shaft.filter((s) => s.i <= L - 2);
  const Nl = body.length ? body.reduce((s, x) => s + clampN(at(x.i)!.N, 3, 50) * x.w, 0) / body.reduce((s, x) => s + x.w, 0) : clampN(at(Math.max(1, L - 2))!.N, 3, 50);
  let Rl = 0;
  for (const s of shaft) {
    const N = s.i <= L - 2 ? clampN(at(s.i)!.N, 3, 50) : Nl;
    Rl += BETA[type][GROUP[at(s.i)!.soil]] * 10 * (N / 3 + 1) * U * s.w;
  }
  const RpUsed = type === 'premoldada' ? Rp : Math.min(Rp, Rl);
  const pGlobal = (RpUsed + Rl) / 2, pPart = RpUsed / 4 + Rl / 1.3;
  let Padm = Math.min(pGlobal, pPart);
  let governs: Capacity['governs'] = pGlobal <= pPart ? 'global' : 'parcial';
  if (type === 'escavada' && Padm > 1.25 * Rl) { Padm = 1.25 * Rl; governs = 'ponta'; }
  const W = 25 * Ap * Math.max(0, L - cutoff);
  const Tadm = Rl / 2 + 0.9 * W;
  return { L, Rp, Rl, RpUsed, Padm, Tadm, Np, Nl, governs };
}

export function maxDepth(type: PileType, b: Boring, p: FoundationParams): { L: number; reason: string } {
  const n = b.meters.length;
  const firstAbove = (lim: number) => { const k = b.meters.findIndex((s) => s.N >= lim); return k < 0 ? n : k + 1; };
  if (type === 'escavada') {
    const byN = firstAbove(p.augerStopN);
    const byNA = b.water !== null ? Math.floor(b.water) : n;
    if (byNA <= byN && byNA < n) return { L: byNA, reason: `nível d'água a ${b.water} m` };
    if (byN < n) return { L: byN, reason: `N ≥ ${p.augerStopN} (trado)` };
    return { L: n, reason: 'fim da sondagem' };
  }
  if (type === 'helice') {
    const L = Math.min(n, Math.floor(p.hcMaxDepth));
    return { L, reason: L < n ? `profundidade máxima do equipamento (${p.hcMaxDepth} m)` : 'fim da sondagem' };
  }
  const byN = firstAbove(p.precastStopN);
  return { L: byN, reason: byN < n ? `nega estimada (N ≥ ${p.precastStopN})` : 'fim da sondagem' };
}

// ---------------------------------------------------------------- bloco
export function blockCoords(n: number, s: number, rotate: boolean): [number, number][] {
  let pts: [number, number][];
  switch (n) {
    case 1: pts = [[0, 0]]; break;
    case 2: pts = [[-s / 2, 0], [s / 2, 0]]; break;
    case 3: { const h = s / Math.sqrt(3); pts = [[0, h], [-s / 2, -h / 2], [s / 2, -h / 2]]; break; }
    case 4: pts = [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]]; break;
    case 5: { const a = s / Math.SQRT2; pts = [[0, 0], [-a, -a], [a, -a], [a, a], [-a, a]]; break; }
    default: pts = [[-s, -s / 2], [0, -s / 2], [s, -s / 2], [-s, s / 2], [0, s / 2], [s, s / 2]];
  }
  return rotate ? pts.map(([x, y]) => [y, x]) : pts;
}

export interface PileLoads {
  n: number; coords: [number, number][]; Nmax: number; Nmin: number; H: number; M0: number; s: number;
  /** Binário do momento por estaca (característico), kN. */
  dN: number;
  /** Peso do bloco (característico), kN. */
  Wb: number;
  /** Nd,mín por estaca = γf,fav·(Gk + Wb)/n − γf·[(Gk − Nk,mín)/n + dN] (kN; negativo = tração). */
  NdMin: number;
  /** Parcela permanente usada e de onde veio. */
  Gk: number; GkSource: 'informada' | 'adotada = Nk (sem dado)';
}

/** Coeficientes de ponderação para Nd,mín: γf desfavorável e γf da parcela permanente favorável. */
export interface GammaF { unf: number; fav: number }

export function pileLoads(ld: FLoad, n: number, D: number, spacing: number, pct: number, gf: GammaF = { unf: 1.4, fav: 1.0 }): PileLoads {
  const s = spacing * D;
  const rotate = (n === 2 || n === 6) && Math.abs(ld.Mx) > Math.abs(ld.My);
  const c = blockCoords(n, s, rotate);
  const Sx = c.reduce((a, [x]) => a + x * x, 0), Sy = c.reduce((a, [, y]) => a + y * y, 0);
  const xmax = Math.max(...c.map(([x]) => Math.abs(x))), ymax = Math.max(...c.map(([, y]) => Math.abs(y)));
  const Wb = (ld.Nk * pct) / 100;
  // My gira em torno de y → varia com x; Mx gira em torno de x → varia com y
  let dN = 0, M0x = 0, M0y = 0;
  if (Sx > 1e-9) dN += (Math.abs(ld.My) * xmax) / Sx; else M0y = Math.abs(ld.My) / n;
  if (Sy > 1e-9) dN += (Math.abs(ld.Mx) * ymax) / Sy; else M0x = Math.abs(ld.Mx) / n;
  const known = typeof ld.NkPerm === 'number' && Number.isFinite(ld.NkPerm);
  const Gk = known ? ld.NkPerm! : Math.max(ld.Nk, ld.NkMin);
  const relief = Math.max(0, Gk - ld.NkMin); // parcela variável que reduz a compressão (vento de sucção etc.)
  return {
    n, coords: c, s, dN, Wb, Gk, GkSource: known ? 'informada' : 'adotada = Nk (sem dado)',
    Nmax: (ld.Nk + Wb) / n + dN,
    Nmin: (ld.NkMin + Wb) / n - dN,
    NdMin: (gf.fav * (Gk + Wb)) / n - gf.unf * (relief / n + dN),
    H: Math.hypot(ld.Hx, ld.Hy) / n,
    M0: Math.hypot(M0x, M0y),
  };
}

// ---------------------------------------------------------------- horizontal (Miche)
export function nhFor(b: Boring, p: FoundationParams): { nh: number; label: string } {
  const top = Math.floor(p.cutoff);
  const zone = b.meters.slice(top, top + 3);
  if (!zone.length) return { nh: 2.2, label: 'sem dados' };
  const N = zone.reduce((s, x) => s + x.N, 0) / zone.length;
  const clay = zone.filter((x) => x.soil === 'argila').length > zone.length / 2;
  const submerged = b.water !== null && b.water <= p.cutoff + 1.5;
  if (clay) return N <= 4 ? { nh: 0.08, label: 'argila mole (estimativa)' } : { nh: p.nhClay, label: 'argila média/rija (valor informado)' };
  const tab = N <= 10 ? [2.2, 1.3, 'fofa'] : N <= 30 ? [6.6, 4.4, 'média'] : [17.6, 10.7, 'compacta'];
  return { nh: (submerged ? tab[1] : tab[0]) as number, label: `areia/silte ${tab[2]}${submerged ? ' submersa' : ''} (Terzaghi)` };
}

// ---------------------------------------------------------------- estrutural
export interface SteelOption { phi: number; n: number; As: number; spacing: number; notes: string[] }

export interface PileStructure {
  kind: 'moldada' | 'catalogo';
  fck?: number; gc?: number; sigma?: number; sigmaLim?: number; NkConc?: number;
  Pcat?: number; Tcat?: number;
  needComp: boolean; AsComp: number; AsTension: number; AsMin: number; Md: number; Mk: number; T: number; nh: number; nhLabel: string;
  /** Nd máx e mín por estaca (kN) e tração de cálculo Td = máx(0, −Nd,mín). */
  Nd: number; NdMin: number; Td: number;
  longPile: boolean; armedLength: number; armedReason: string;
  options: SteelOption[];
  ok: boolean; messages: string[];
}

function pileConcrete(type: 'escavada' | 'helice', caa: FoundationParams['caa']): { c: Concrete; fck: number; gc: number } {
  const t = STRUCT[type][caa];
  return { c: concrete(t.fck, t.gc), fck: t.fck, gc: t.gc };
}

export function pileStructure(type: PileType, D: number, L: number, pl: PileLoads, b: Boring, p: FoundationParams): PileStructure {
  const messages: string[] = [];
  const Ac = (Math.PI * D * D) / 4;
  const { nh, label: nhLabel } = nhFor(b, p);
  if (type === 'premoldada') {
    const cat = PRECAST_CATALOG[Math.round(D * 100)];
    const ok = !!cat && pl.Nmax <= cat.P && Math.max(0, -pl.Nmin) <= cat.T;
    const E = 30000 * 1000; // kN/m², ordem de grandeza para concreto C40 (T de Miche)
    const T = ((E * Math.PI * D ** 4) / 64 / (nh * 1000)) ** 0.2;
    const Mk = pl.M0 + 0.79 * pl.H * T;
    if (Mk > 0.5) messages.push(`Momento na estaca Mk = ${Mk.toFixed(1)} kN·m (Miche): confirmar o momento admissível com o fabricante.`);
    if (!cat) messages.push('Diâmetro sem carga de catálogo cadastrada.');
    const gf = p.gammaF ?? 1.4;
    return { kind: 'catalogo', Pcat: cat?.P, Tcat: cat?.T, Nd: gf * pl.Nmax, NdMin: pl.NdMin, Td: Math.max(0, -pl.NdMin), needComp: false, AsComp: 0, AsTension: 0, AsMin: 0, Md: gf * Mk, Mk, T, nh, nhLabel, longPile: L - p.cutoff > 4 * T, armedLength: 0, armedReason: 'armadura de fábrica', options: [], ok, messages };
  }
  const st = STRUCT[type];
  const { c, fck, gc } = pileConcrete(type, p.caa);
  const fyd = p.fyk / 1.15;
  const GAMMA_F = p.gammaF ?? 1.4;
  const Nd = GAMMA_F * pl.Nmax;
  const sigma = Nd / 1000 / Ac;
  const fcd = fck / gc;
  const NkConc = (0.85 * fcd * Ac * 1000) / GAMMA_F;
  const needComp = sigma > st.sigmaLim;
  const ss2 = Math.min(fyd, 420);
  const AsComp = needComp ? Math.max(0, (Nd / 1000 - 0.85 * fcd * Ac) / ss2) : 0;
  const Td = Math.max(0, -pl.NdMin);
  const AsTension = Td / 1000 / fyd;
  const AsMin = st.rhoMin * Ac;
  const E = c.Ecs * 1000; // kN/m²
  const T = ((E * Math.PI * D ** 4) / 64 / (nh * 1000)) ** 0.2;
  const Mk = pl.M0 + 0.79 * pl.H * T;
  const Md = GAMMA_F * Mk;
  const Lp = L - p.cutoff;
  const longPile = Lp > 4 * T;
  if (Mk > 0 && !longPile) messages.push(`Estaca curta para Miche (L = ${Lp.toFixed(1)} m < 4T = ${(4 * T).toFixed(1)} m): momento indicativo.`);
  let armedLength = st.Lmin, armedReason = `mínimo da NBR 6122 (${st.Lmin} m)`;
  if (Mk > 0.01 && 4 * T > armedLength) { armedLength = Math.ceil(8 * T) / 2; armedReason = 'até 4T, onde o momento horizontal se anula'; }
  if (needComp) { armedLength = Lp; armedReason = `σ = ${sigma.toFixed(2)} MPa > ${st.sigmaLim} MPa: armadura em todo o comprimento`; }
  if (AsTension > 0) { armedLength = Lp; armedReason = 'tração: armadura em todo o comprimento'; }
  armedLength = Math.min(armedLength, Lp);

  const options: SteelOption[] = [];
  const phiT = p.stirrupPhi;
  const smin = (phi: number) => Math.max(0.02, phi / 1000, 1.2 * p.dmax);
  const MR = (bars: ReturnType<typeof circleBars>, NdKN: number) => {
    const v = momentCapacity(circleWidth(D), D, bars, NdKN / 1000, c, fyd);
    return v === null ? -1 : v * 1000;
  };
  for (const phi of PHI_PILE) {
    const rs = D / 2 - p.cover - phiT / 1000 - phi / 2000;
    if (rs <= 0.02) continue;
    const nMax = Math.floor((2 * Math.PI * rs) / (phi / 1000 + smin(phi)));
    let found: SteelOption | null = null;
    for (let n = 3; n <= nMax; n++) {
      const As = n * barArea(phi);
      if (As < AsMin || As < AsComp || As < AsTension || As > 0.04 * Ac) continue;
      if (Md > 0.01) {
        let ok = true;
        for (const N of [Nd, pl.NdMin]) {
          for (const rot of [0, Math.PI / n]) if (MR(circleBars(D, n, phi, rs, rot), N) < Md) ok = false;
        }
        if (!ok) continue;
      }
      const notes: string[] = [];
      const column = needComp || Md > 0.01;
      if (phi < 10 && column) notes.push('φ < 10 mm: abaixo do mínimo da NBR 6118 para pilares');
      if (phiT < phi / 4) notes.push(`estribo φ${phiT} < φl/4: usar φ${phi / 4 <= 6.3 ? '6,3' : '8'}`);
      if (column && p.stirrupS > 12 * phi / 1000 + 1e-9) notes.push(`espaçamento ${Math.round(p.stirrupS * 100)} cm > 12φl = ${Math.round(12 * phi / 10)} cm (NBR 6118, pilares)`);
      found = { phi, n, As, spacing: (2 * Math.PI * rs) / n, notes };
      break;
    }
    if (found) { options.push(found); if (found.n === 3) break; }
  }
  const ok = options.length > 0 && (Nd / 1000 <= 0.85 * fcd * Ac + 0.04 * Ac * ss2);
  if (!options.length) messages.push('Nenhuma armadura até 4% atende: aumente o diâmetro.');
  return { kind: 'moldada', fck, gc, sigma, sigmaLim: st.sigmaLim, NkConc, Nd, NdMin: pl.NdMin, Td, needComp, AsComp, AsTension, AsMin, Md, Mk, T, nh, nhLabel, longPile, armedLength, armedReason, options, ok, messages };
}

// ---------------------------------------------------------------- solução por apoio
export interface PileSolution {
  type: PileType; D: number; n: number; L: number; cap: Capacity; loads: PileLoads; struct: PileStructure; volume: number; steelKg: number; blockVolume: number; cost: number; Lmax: number; LmaxReason: string;
}
export interface DiameterResult { type: PileType; D: number; best: PileSolution | null; reason?: string; Lmax: number; LmaxReason: string }
export interface SupportResult { load: FLoad; boring: Boring; byType: { type: PileType; diameters: DiameterResult[]; recommended: PileSolution | null }[] }

export function solveSupport(ld: FLoad, data: FoundationData): SupportResult {
  const p = data.params, b = boringFor(ld, data);
  const byType = p.types.map((type) => {
    const list = type === 'premoldada' ? p.precastDiameters : p.diameters.filter((d) => type !== 'helice' || d >= 30);
    const { L: Lmax, reason: LmaxReason } = maxDepth(type, b, p);
    const diameters: DiameterResult[] = list.map((dcm) => {
      const D = dcm / 100;
      let best: PileSolution | null = null;
      let reason = '';
      const Lstart = Math.max(1, Math.ceil(p.cutoff + p.minLength));
      for (let n = 1; n <= 6; n++) {
        const pl = pileLoads(ld, n, D, type === 'premoldada' ? p.spacingPrecast : p.spacingInSitu, p.blockWeightPct, { unf: p.gammaF ?? 1.4, fav: p.gammaFfav ?? 1 });
        for (let L = Lstart; L <= Lmax; L++) {
          const cap = capacity(type, D, L, b, p.cutoff);
          if (!cap) continue;
          if (cap.Padm < pl.Nmax || cap.Tadm < Math.max(0, -pl.Nmin)) continue;
          const st = pileStructure(type, D, L, pl, b, p);
          if (!st.ok) { reason = st.messages[0] ?? 'estrutural não atende'; break; }
          const vol = n * ((Math.PI * D * D) / 4) * (L - p.cutoff);
          const As = recommendedOption(st.options)?.As ?? 0;
          const steelKg = n * As * st.armedLength * 7850;
          const blockVolume = estimateBlock(pl, D);
          const cost = vol + blockVolume + steelKg / (p.steelPerM3 || 85);
          if (!best || cost < best.cost - 1e-9) best = { type, D, n, L, cap, loads: pl, struct: st, volume: vol, steelKg, blockVolume, cost, Lmax, LmaxReason };
          break;
        }
      }
      if (!best && !reason) reason = `capacidade insuficiente até ${Lmax} m (${LmaxReason})`;
      return { type, D: dcm, best, reason: best ? undefined : reason, Lmax, LmaxReason };
    });
    const recommended = diameters.map((d) => d.best).filter(Boolean).sort((x, y) => x!.cost - y!.cost || x!.n - y!.n)[0] ?? null;
    return { type, diameters, recommended };
  });
  return { load: ld, boring: b, byType };
}

/** Volume aproximado do bloco, só para comparar soluções: planta = envoltória das estacas + D + 2×15 cm; altura ≥ 0,6 m e ≥ 0,6·s. */
export function estimateBlock(pl: PileLoads, D: number) {
  const xs = pl.coords.map(([x]) => x), ys = pl.coords.map(([, y]) => y);
  const lx = Math.max(...xs) - Math.min(...xs) + D + 0.3, ly = Math.max(...ys) - Math.min(...ys) + D + 0.3;
  const h = pl.n === 1 ? Math.max(0.6, D) : Math.max(0.6, 0.6 * pl.s);
  return lx * ly * h;
}

export function capacityCurve(type: PileType, D: number, b: Boring, p: FoundationParams) {
  const out: { L: number; Padm: number; Rp: number; Rl: number }[] = [];
  for (let L = Math.max(1, Math.ceil(p.cutoff + 1)); L <= b.meters.length; L++) {
    const c = capacity(type, D, L, b, p.cutoff);
    if (c) out.push({ L, Padm: c.Padm, Rp: c.RpUsed, Rl: c.Rl });
  }
  return out;
}

/** Opção sugerida: menor área de aço entre as bitolas ≥ 10 mm (se houver), desempate por menos barras. */
export function recommendedOption(opts: SteelOption[]): SteelOption | null {
  const pool = opts.some((o) => o.phi >= 10) ? opts.filter((o) => o.phi >= 10) : opts;
  return [...pool].sort((a, b) => a.As - b.As || a.n - b.n)[0] ?? null;
}
