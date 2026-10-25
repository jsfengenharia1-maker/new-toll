// Armadura de paredes de concreto e pilares-parede em casca (E1d): modelo sanduíche (duas camadas externas que
// resistem à membrana e à flexão da placa; cada camada pelo critério de armadura de chapas ortogonais — o mesmo da
// Annex F da EN 1992-2, que é a solução de mínimo aço da condição de Nielsen) mais cortante transversal e
// segunda ordem local por faixa. Funções puras por elemento, sem dependência do modelo do edifício.
//
// Convenções (as da casca, `casca.ts`): tração > 0; forças em kN/m, momentos em kN·m/m; M > 0 traciona a face z−.
// nx, mx: direção horizontal do plano da parede (ao longo do eixo); ny, my: vertical; nxy, mxy: cisalhamento no plano e
// torção; qx, qy: cortantes transversais. A armadura vertical resiste a ny e ao momento my (faixa vertical); a
// horizontal, a nx e mx.
import { barArea } from '../concrete';

export interface Forcas { nx: number; ny: number; nxy: number; mx: number; my: number; mxy: number; qx: number; qy: number }
export const FORCAS_NULAS: Forcas = { nx: 0, ny: 0, nxy: 0, mx: 0, my: 0, mxy: 0, qx: 0, qy: 0 };

/** Forças de uma casca em Float64Array [nx, ny, nxy, mx, my, mxy, qx, qy] (ordem de `esforcosCasca`). */
export const forcasDe = (v: ArrayLike<number>): Forcas => ({ nx: v[0], ny: v[1], nxy: v[2], mx: v[3], my: v[4], mxy: v[5], qx: v[6], qy: v[7] });

// ---------------------------------------------------------------- membrana (chapa) com armadura ortogonal

export interface Membrana {
  /** Forças de tração a resistir pela armadura horizontal (x) e vertical (y), kN/m, ≥ 0. */
  ftx: number; fty: number;
  /** Força de compressão do concreto (biela), kN/m, ≥ 0. */
  nc: number;
}

/**
 * Armadura de uma chapa sob (nx, ny, nxy) com tração positiva: biela de compressão do concreto a θ do eixo x e barras
 * em x e y (EN 1992-2, Annex F). Sem tração nas duas direções: concreto em compressão biaxial, `nc` = maior compressão
 * principal. É a solução de mínimo ft = ftx + fty.
 */
export function membrana(nx: number, ny: number, nxy: number): Membrana {
  const t = Math.abs(nxy);
  const principal = () => Math.max(0, -((nx + ny) / 2 - Math.sqrt(((nx - ny) / 2) ** 2 + nxy * nxy)));
  if (nx >= -t && ny >= -t) return { ftx: nx + t, fty: ny + t, nc: 2 * t };
  if (nx < -t) {
    const fty = ny + (t * t) / -nx;
    return fty >= 0 ? { ftx: 0, fty, nc: -nx * (1 + (t * t) / (nx * nx)) } : { ftx: 0, fty: 0, nc: principal() };
  }
  const ftx = nx + (t * t) / -ny;
  return ftx >= 0 ? { ftx, fty: 0, nc: -ny * (1 + (t * t) / (ny * ny)) } : { ftx: 0, fty: 0, nc: principal() };
}

/** Camadas do sanduíche [face z−, face z+]: n/2 ± m/z em cada componente. */
export function camadas(f: Forcas, z: number): [{ nx: number; ny: number; nxy: number }, { nx: number; ny: number; nxy: number }] {
  return [
    { nx: f.nx / 2 + f.mx / z, ny: f.ny / 2 + f.my / z, nxy: f.nxy / 2 + f.mxy / z },
    { nx: f.nx / 2 - f.mx / z, ny: f.ny / 2 - f.my / z, nxy: f.nxy / 2 - f.mxy / z },
  ];
}

// ---------------------------------------------------------------- requisitos de um elemento

export interface MatParede {
  /** fck, fcd, fctd e resistência de cálculo à compressão do concreto (0,85·fcd), MPa; fyd, MPa. */
  fck: number; fcd: number; fctd: number; sigmaCd: number; fyd: number;
  /** Distância da face ao centro das barras (m): cobrimento + bitolas estimadas. */
  d1: number;
}

export interface Requisito {
  /** Armadura necessária por face, cm²/m: vertical e horizontal (a maior das duas faces e das variantes). */
  rv: number; rh: number;
  /** Utilização do concreto na biela (σc/σRd), cortante transversal (kN/m) e esforços que governam. */
  util: number; V: number;
  /** Compressão por metro (kN/m, ≥ 0) usada na segunda ordem local e na armadura mínima de pilar. */
  ncomp: number;
  /** Esbeltez do pano e momentos adicionais (kN·m/m): mínimo de 1ª ordem e 2ª ordem local. */
  lambda: number; m1min: number; m2d: number;
  /** Estado fissurado (alguma camada traciona). */
  fissurado: boolean;
}

/**
 * Armadura necessária de um elemento sob um conjunto de forças. Faixa vertical: momento mínimo de 1ª ordem
 * N·(0,015 + 0,03t) (NBR 6118, 11.3.3.4.3) nos dois sentidos e, para λ > 35, o momento de 2ª ordem do pilar-padrão de
 * curvatura aproximada N·ℓe²/10·0,005/(t(ν + 0,5)) (15.8.3.3.2; 15.9 por faixas) — a favor da segurança, αb = 1.
 * `le` = comprimento de flambagem (m). Braço de alavanca z = 0,9d entre as camadas; espessura da camada comprimida t/2
 * sem tração e t/3 (mín. 2d1) com tração.
 */
export function requisitosElemento(f: Forcas, t: number, le: number, m: MatParede): Requisito {
  const z = 0.9 * (t - m.d1); // braço de alavanca como na flexão de seção retangular (z ≈ 0,9d)
  const ncomp = Math.max(0, -f.ny);
  const lambda = (le * Math.sqrt(12)) / t;
  let m1min = 0, m2d = 0;
  let variantes: number[] = [f.my];
  if (ncomp > 0) {
    m1min = ncomp * (0.015 + 0.03 * t);
    if (lambda > 35) { const nu = ncomp / (t * m.fcd * 1000); m2d = ((ncomp * le * le) / 10) * Math.min(0.005 / (t * (nu + 0.5)), 0.005 / t); }
    variantes = [Math.max(f.my, m1min) + m2d, Math.min(f.my, -m1min) - m2d];
  }
  let ftxM = 0, ftyM = 0, util = 0, fissurado = false;
  for (const my of variantes) {
    const cs = camadas({ ...f, my }, z).map((c) => membrana(c.nx, c.ny, c.nxy));
    const fiss = cs.some((c) => c.ftx > 1e-9 || c.fty > 1e-9);
    const hs = fiss ? Math.max(t / 3, 2 * m.d1) : t / 2, lim = fiss ? 0.6 * (1 - m.fck / 250) * m.fcd : m.sigmaCd;
    for (const c of cs) { ftxM = Math.max(ftxM, c.ftx); ftyM = Math.max(ftyM, c.fty); util = Math.max(util, c.nc / hs / 1000 / lim); }
    fissurado = fissurado || fiss;
  }
  const cm2 = 10 / m.fyd; // kN/m → cm²/m: ft/(fyd·1000) × 1e4
  return { rv: ftyM * cm2, rh: ftxM * cm2, util, V: Math.hypot(f.qx, f.qy), ncomp, lambda, m1min, m2d, fissurado };
}

// ---------------------------------------------------------------- cortante transversal (laje, NBR 6118, 19.4)

export interface CortanteTransversal { VRd1: number; VRd2: number }

/**
 * Resistência ao cortante fora do plano por metro (kN/m), sem armadura transversal (VRd1 = [τRd·k·(1,2 + 40ρ1) +
 * 0,15σcp]·d, τRd = 0,25 fctd, k = |1,6 − d| ≥ 1, ρ1 ≤ 0,02) e limite da biela VRd2 = 0,27·αv2·fcd·d. `asCm2` = armadura
 * de tração da faixa (cm²/m); `ncomp` = compressão por metro (kN/m).
 */
export function cortanteTransversal(t: number, d1: number, asCm2: number, ncomp: number, m: MatParede): CortanteTransversal {
  const d = t - d1, rho = Math.min(0.02, asCm2 / (100 * d * 100)), k = Math.max(1, Math.abs(1.6 - d)), tauRd = 0.25 * m.fctd * 1000;
  const sigmaCp = ncomp / t; // kN/m²
  const VRd1 = (tauRd * k * (1.2 + 40 * rho) + 0.15 * sigmaCp) * d;
  const VRd2 = 0.27 * (1 - m.fck / 250) * m.fcd * 1000 * d;
  return { VRd1, VRd2 };
}

// ---------------------------------------------------------------- malhas (bitola × espaçamento)

export const BITOLAS_PAREDE = [6.3, 8, 10, 12.5, 16, 20, 25];
export const ESPACAMENTOS_PAREDE = [0.075, 0.1, 0.125, 0.15, 0.175, 0.2, 0.25, 0.3, 0.35, 0.4];

export interface Malha { phi: number; s: number; /** cm²/m por face. */ As: number }
export const asMalha = (phi: number, s: number) => (barArea(phi) * 1e4) / s;

export interface LimitesMalha { t: number; bitolaMax: number; espMin: number; espMax: number }

/** Malhas permitidas pela espessura e pelas opções, da menor para a maior área (empate: o maior espaçamento). */
export function listaMalhas(l: LimitesMalha): Malha[] {
  const phiMax = Math.min(l.bitolaMax, (l.t * 1000) / 8), sMax = Math.min(2 * l.t, l.espMax / 100), sMin = l.espMin / 100;
  const out: Malha[] = [];
  for (const phi of BITOLAS_PAREDE) if (phi <= phiMax + 1e-9) for (const s of ESPACAMENTOS_PAREDE) if (s >= sMin - 1e-9 && s <= sMax + 1e-9) out.push({ phi, s, As: asMalha(phi, s) });
  return out.sort((a, z) => a.As - z.As || z.s - a.s);
}

/** Menor malha com área ≥ `req` (cm²/m por face); a maior da lista (e `ok` falso) quando nenhuma atende. */
export function escolherMalha(req: number, lista: Malha[]): { malha: Malha; ok: boolean } {
  const m = lista.find((x) => x.As >= req - 1e-9);
  return m ? { malha: m, ok: true } : { malha: lista[lista.length - 1], ok: false };
}

// ---------------------------------------------------------------- cumprimento (fração da área que atende)

export interface PontoPano { s: number; z: number; area: number; rv: number; rh: number; util: number; V: number; ncomp: number }

/** Atende com as malhas dadas (cm²/m por face)? Concreto (util ≤ 1) e cortante (V ≤ VRd1 com a malha vertical, ou VRd2 com grampos se t ≥ 35 cm). */
export function atende(p: PontoPano, pv: number, ph: number, t: number, d1: number, m: MatParede): { ok: boolean; motivo?: 'vertical' | 'horizontal' | 'concreto' | 'cortante' } {
  if (p.util > 1 + 1e-9) return { ok: false, motivo: 'concreto' };
  if (p.rv > pv + 1e-9) return { ok: false, motivo: 'vertical' };
  if (p.rh > ph + 1e-9) return { ok: false, motivo: 'horizontal' };
  if (p.V > 1e-9) {
    const c = cortanteTransversal(t, d1, pv, p.ncomp, m);
    if (p.V > c.VRd1 + 1e-9 && (t < 0.35 - 1e-9 || p.V > c.VRd2)) return { ok: false, motivo: 'cortante' };
  }
  return { ok: true };
}

/** Fração (0 a 1) da área dos pontos que atende com as malhas pv e ph (cm²/m por face). */
export function fracaoAtende(pts: PontoPano[], pv: number, ph: number, t: number, d1: number, m: MatParede): number {
  let a = 0, ok = 0;
  for (const p of pts) { a += p.area; if (atende(p, pv, ph, t, d1, m).ok) ok += p.area; }
  return a > 0 ? ok / a : 1;
}

export interface EscolhaPano {
  vert: Malha; hor: Malha;
  /** Falso quando nem a maior malha chega à fração pedida ou a taxa máxima é excedida. */
  ok: boolean; fracao: number; motivo?: string;
}

export interface ParamsPano {
  t: number; d1: number; mat: MatParede;
  /** Fração exigida (0 a 1). */
  cumprimento: number;
  taxaVertMin: number; taxaVertMax: number; taxaHorMin: number; horFracVert: number;
  limites: LimitesMalha;
  /** Armadura mínima de pilar, 0,15·Nd/fyd, cm²/m (as duas faces): maior compressão por metro do pano. */
  asMinMecanica: number;
  soHorizontal: boolean;
}

/** Armadura mínima por face (cm²/m): vertical e horizontal dadas a vertical adotada. */
export const minimosPano = (p: Pick<ParamsPano, 't' | 'taxaVertMin' | 'taxaHorMin' | 'horFracVert' | 'asMinMecanica'>, pvAdotado: number) => ({
  vert: Math.max((p.taxaVertMin / 100) * p.t * 1e4, p.asMinMecanica) / 2,
  hor: Math.max(((p.taxaHorMin / 100) * p.t * 1e4) / 2, (p.horFracVert / 100) * pvAdotado),
});

/**
 * Escolhe as malhas vertical e horizontal (iguais nas duas faces) de menor aço que fazem a fração da área que atende
 * chegar ao cumprimento pedido, respeitando mínimos, espaçamentos e a taxa vertical máxima. A vertical cresce em ordem;
 * para cada uma, a horizontal é a menor que fecha a fração.
 */
export function escolherMalhasPano(pts: PontoPano[], p: ParamsPano): EscolhaPano {
  const lista = listaMalhas(p.limites);
  if (!lista.length) return { vert: { phi: 0, s: 0, As: 0 }, hor: { phi: 0, s: 0, As: 0 }, ok: false, fracao: 0, motivo: 'nenhuma malha cabe na espessura (bitola máx. t/8 e espaçamentos)' };
  const maxFace = ((p.taxaVertMax / 100) * p.t * 1e4) / 2;
  const mV = p.soHorizontal ? 0 : minimosPano(p, 0).vert;
  let melhor: EscolhaPano | null = null;
  const vs = p.soHorizontal ? [{ phi: 0, s: 0, As: 0 }] : lista.filter((m) => m.As >= mV - 1e-9);
  for (const v of vs) {
    if (v.As > maxFace + 1e-9) break;
    const mH = minimosPano(p, v.As).hor;
    // com a maior horizontal permitida a fração ainda não chega? então nenhuma horizontal serve a esta vertical
    const hMax = lista[lista.length - 1], frMax = fracaoAtende(pts, v.As, hMax.As, p.t, p.d1, p.mat);
    if (frMax < p.cumprimento - 1e-9) { if (!melhor || frMax > melhor.fracao + 1e-12) melhor = { vert: v, hor: hMax, ok: false, fracao: frMax }; continue; }
    for (const h of lista) {
      if (h.As < mH - 1e-9) continue;
      const fr = fracaoAtende(pts, v.As, h.As, p.t, p.d1, p.mat);
      if (!melhor || fr > melhor.fracao + 1e-12) melhor = { vert: v, hor: h, ok: false, fracao: fr };
      if (fr >= p.cumprimento - 1e-9) return { vert: v, hor: h, ok: true, fracao: fr };
    }
  }
  const e = melhor ?? { vert: vs[0], hor: lista[lista.length - 1], ok: false, fracao: 0 };
  return { ...e, ok: false, motivo: 'a fração exigida não é atingida com as malhas permitidas (taxa máxima, bitola máxima ou concreto): aumente a espessura ou o fck' };
}

// ---------------------------------------------------------------- reforços locais (onde a malha uniforme não basta)

export interface ReforcoLocal {
  direcao: 'vertical' | 'horizontal';
  /** Intervalo ao longo do eixo (vertical) ou da altura (horizontal), m, no sistema (s, z) do lado. */
  de: number; ate: number;
  /** Área adicional total a distribuir, cm². */
  As: number;
  /** Barras adotadas: n × φ (mm). */
  n: number; phi: number;
}

/**
 * Agrupa as faixas (colunas na vertical, linhas na horizontal) onde a necessidade excede a malha adotada. `faixas` =
 * [início, fim, necessidade máxima na faixa (cm²/m)], ordenadas; faixas vizinhas com déficit formam um reforço. Barras
 * de bitola `phiMin` ou maior que dão ao menos a área, em número mínimo de 2.
 */
export function reforcosLocais(direcao: 'vertical' | 'horizontal', faixas: [number, number, number][], adotado: number, phiMin: number): ReforcoLocal[] {
  const out: ReforcoLocal[] = [];
  let atual: { de: number; ate: number; As: number } | null = null;
  const fecha = () => {
    if (!atual) return;
    // metade do reforço em cada face: n barras por face, número total par
    let escolha = { n: 4, phi: 25 };
    for (const phi of BITOLAS_PAREDE.filter((x) => x >= phiMin - 1e-9)) {
      const porFace = Math.max(1, Math.ceil(atual.As / (2 * barArea(phi) * 1e4) - 1e-9));
      if (porFace <= 6 || phi === 25) { escolha = { n: 2 * porFace, phi }; break; }
    }
    out.push({ direcao, de: atual.de, ate: atual.ate, As: atual.As, ...escolha });
    atual = null;
  };
  for (const [a, b, r] of faixas) {
    const falta = (r - adotado) * (b - a); // cm²/m × m = cm²
    if (r - adotado > 1e-9) {
      if (atual && Math.abs(atual.ate - a) < 1e-6) { atual.ate = b; atual.As += falta; } else { fecha(); atual = { de: a, ate: b, As: falta }; }
    } else fecha();
  }
  fecha();
  return out;
}

// ---------------------------------------------------------------- concreto simples (NBR 6118, 24)

/**
 * Verificação em concreto simples de um elemento: tensão normal máxima nas duas faces (membrana ± placa) contra
 * fctd/1,2 na tração e 0,85·fcd/1,2 na compressão (γc ×1,2, como nas fundações, a confirmar). Devolve a razão máxima
 * (≤ 1 atende), com tensões em MPa.
 */
export function verificaConcretoSimples(f: Forcas, t: number, m: MatParede): { razao: number; sigmaT: number; sigmaC: number } {
  const W = (t * t) / 6, A = t;
  // tensões na direção vertical e horizontal; cisalhamento via tensões principais
  const tens = (n: number, mo: number, sinal: 1 | -1) => (n / A + (sinal * mo) / W) / 1000;
  let sT = 0, sC = 0;
  for (const sg of [1, -1] as const) {
    const sx = tens(f.nx, f.mx, sg), sy = tens(f.ny, f.my, sg), txy = (f.nxy / A + (sg * f.mxy) / W) / 1000;
    const med = (sx + sy) / 2, r = Math.sqrt(((sx - sy) / 2) ** 2 + txy * txy);
    sT = Math.max(sT, med + r); sC = Math.max(sC, -(med - r));
  }
  const razao = Math.max(sT / (m.fctd / 1.2), sC / (m.sigmaCd / 1.2));
  return { razao, sigmaT: sT, sigmaC: sC };
}

// ---------------------------------------------------------------- entrada de elementos (avaliação por elemento da casca)

/** Elemento da casca com as forças em cada combinação (mesma ordem de `combos`). */
export interface ElementoPano { s: number; z: number; area: number; forcas: Forcas[] }

export interface AvaliacaoPano {
  pts: PontoPano[];
  /** Por elemento: combinação (índice) que governa a armadura vertical, horizontal, o concreto e o cortante. */
  governa: { vert: number; hor: number; util: number; V: number };
  /** Maior simples (razão de concreto simples) e esforços do ponto mais exigente. */
  simples: number;
  req: Requisito[];
}

/** Necessidades de cada elemento: envoltória das combinações. */
export function avaliarElementos(els: ElementoPano[], t: number, le: number, mat: MatParede, matH: MatParede, simples = false): AvaliacaoPano[] {
  return els.map((e) => {
    let rv = 0, rh = 0, util = 0, V = 0, ncomp = 0, lambda = 0, m1 = 0, m2 = 0, fiss = false, sim = 0;
    const g = { vert: 0, hor: 0, util: 0, V: 0 };
    e.forcas.forEach((f, ic) => {
      const r = requisitosElemento(f, t, le, mat), rH = matH.fyd === mat.fyd ? r : requisitosElemento(f, t, le, matH);
      if (r.rv > rv) { rv = r.rv; g.vert = ic; }
      if (rH.rh > rh) { rh = rH.rh; g.hor = ic; }
      if (r.util > util) { util = r.util; g.util = ic; }
      if (r.V > V) { V = r.V; g.V = ic; }
      ncomp = Math.max(ncomp, r.ncomp); lambda = r.lambda; m1 = Math.max(m1, r.m1min); m2 = Math.max(m2, r.m2d); fiss = fiss || r.fissurado;
      if (simples) sim = Math.max(sim, verificaConcretoSimples(f, t, mat).razao);
    });
    const req: Requisito = { rv, rh, util, V, ncomp, lambda, m1min: m1, m2d: m2, fissurado: fiss };
    return { pts: [{ s: e.s, z: e.z, area: e.area, rv, rh, util, V, ncomp }], governa: g, simples: sim, req: [req] };
  });
}

