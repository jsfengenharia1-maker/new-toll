// Esforços das vigotas (frente E3b): tipo de vão, momentos mínimos por pano, igualação ponto a ponto da discretização
// (passo de 0,25 m), redistribuição dos negativos, posição das vigotas reais na laje (vigota a vigota, com as duplas e
// triplas) e amostragem do diagrama de cada vigota. Núcleo puro; kN, m. Os tipos do alinhamento (`FaixaVigota`) vêm de
// `vigotas.ts` (só tipos, sem ciclo em tempo de execução).
import type { P } from '../geom/faces';
import type { EsforcosVigota, FaixaVigota } from './vigotas';
import type { OpcoesCalculo } from './opcoes';
import type { Laje, TipoVao, VigotaMultipla } from './types';

/** Passo da discretização da vigota (m) [a confirmar: valor do Statikos]. */
export const PASSO_VIGOTA = 0.25;

/**
 * Tipo de vão da vigota pela continuidade das pontas: uma ponta é contínua quando a análise dá negativo de pelo menos 5 %
 * do momento isostático p·ℓ²/8 (e 0,02 kN·m); `vigotasBiapoiadas` = isolado. Balanço: sem positivo e com negativo
 * expressivo (o vão é só o apoio engastado) [a confirmar].
 */
export function tipoDeVao(f: Pick<FaixaVigota, 'L' | 'calc'>, l?: Pick<Laje, 'vigotasBiapoiadas'>): TipoVao {
  if (l?.vigotasBiapoiadas) return 'isolado';
  const p = (f.calc.v[0] + f.calc.v[1]) / (f.L || 1), m0 = (p * f.L * f.L) / 8, lim = Math.max(0.02, 0.05 * m0);
  const cont = f.calc.mNeg.map((m) => -m >= lim);
  const neg = Math.max(...f.calc.mNeg.map((m) => -m));
  if (f.calc.mPos < 0.02 * Math.max(neg, 1e-9) && neg >= lim) return 'balanco';
  return cont[0] && cont[1] ? 'intermediario' : cont[0] || cont[1] ? 'extremo' : 'isolado';
}

/** Continuidade (negativo de cálculo na análise) de cada ponta. */
export const pontasContinuas = (f: Pick<FaixaVigota, 'L' | 'calc'>): [boolean, boolean] => {
  const p = (f.calc.v[0] + f.calc.v[1]) / (f.L || 1), lim = Math.max(0.02, 0.05 * ((p * f.L * f.L) / 8));
  return [-f.calc.mNeg[0] >= lim, -f.calc.mNeg[1] >= lim];
};

/**
 * Momentos mínimos de uma vigota (p·ℓ²/x, p = (V1 + V2)/ℓ por nervura): o divisor é o do pano para o tipo de vão
 * (`Laje.momentosMin`) ou, sem ele, o da obra (`vigotaMomentoMin*`); 0 desliga. Os esforços saem com os mínimos já aplicados.
 */
export function minimosDaFaixa(f: Pick<FaixaVigota, 'L' | 'calc'>, op: Pick<OpcoesCalculo, 'vigotaMomentoMinPositivo' | 'vigotaMomentoMinNegativo'>, l?: Pick<Laje, 'momentosMin' | 'vigotasBiapoiadas'>): MinimosFaixa {
  const tipo = tipoDeVao(f, l), cfg = l?.momentosMin?.[tipo];
  const divisorPos = cfg?.pos ?? op.vigotaMomentoMinPositivo, divisorNeg = cfg?.neg ?? op.vigotaMomentoMinNegativo;
  const p = (f.calc.v[0] + f.calc.v[1]) / (f.L || 1), m0 = p * f.L * f.L;
  const mp = divisorPos > 0 ? m0 / divisorPos : 0, mn = divisorNeg > 0 ? -m0 / divisorNeg : 0;
  return {
    esforcos: { mPos: Math.max(f.calc.mPos, mp), mNeg: [Math.min(f.calc.mNeg[0], mn), Math.min(f.calc.mNeg[1], mn)], v: [...f.calc.v] as [number, number] },
    tipo, divisorPos, divisorNeg, pisoPos: mp, pisoNeg: mn,
  };
}

// ---------------------------------------------------------------- diagramas e igualação ponto a ponto (C7.97)

export interface DiagramaVigota { x: number[]; Mmax: number[]; Mmin: number[]; V: number[] }
const interp = (s: number[], v: number[], x: number): number | null => {
  const n = s.length - 1;
  if (x < -1e-9 || x > s[n] + 1e-9) return null;
  for (let i = 0; i < n; i++) if (x <= s[i + 1] + 1e-9) { const d = s[i + 1] - s[i]; return d < 1e-12 ? v[i] : v[i] + ((v[i + 1] - v[i]) * (x - s[i])) / d; }
  return v[n];
};
const uniq = (xs: number[]) => [...new Set(xs.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, z) => a - z);

/** Abscissas da discretização: a grade de `passo` até o maior comprimento, mais os nós dos alinhamentos (os picos ficam representados). */
export function abscissas(fs: Pick<FaixaVigota, 's' | 'L'>[], passo = PASSO_VIGOTA): number[] {
  const Lmax = Math.max(...fs.map((f) => f.L), 0), xs: number[] = [];
  for (let x = 0; x < Lmax - 1e-9; x += passo) xs.push(x);
  xs.push(Lmax);
  for (const f of fs) xs.push(...f.s);
  return uniq(xs);
}

/** Diagrama da vigota amostrado nas abscissas dadas (interpolação linear entre os nós; fora do comprimento, null). */
export function amostrar(f: Pick<FaixaVigota, 's' | 'Mmax' | 'Mmin' | 'V'>, xs: number[]): { Mmax: (number | null)[]; Mmin: (number | null)[]; V: (number | null)[] } {
  return { Mmax: xs.map((x) => interp(f.s, f.Mmax, x)), Mmin: xs.map((x) => interp(f.s, f.Mmin, x)), V: xs.map((x) => interp(f.s, f.V, x)) };
}

/**
 * Diagrama igualado do grupo, ponto a ponto: em cada abscissa, o maior (critério 1; nos negativos o mais negativo) ou a média
 * (critério 2) dos valores das vigotas do grupo que chegam até ali; o cortante é sempre o maior.
 */
export function diagramaIgualado(fs: Pick<FaixaVigota, 's' | 'L' | 'Mmax' | 'Mmin' | 'V'>[], criterio: number, passo = PASSO_VIGOTA): DiagramaVigota {
  const xs = abscissas(fs, passo), am = fs.map((f) => amostrar(f, xs));
  const pega = (k: 'Mmax' | 'Mmin' | 'V', j: number) => am.map((a) => a[k][j]).filter((v): v is number => v !== null);
  const comb = (vs: number[], neg = false) => (!vs.length ? 0 : criterio === 2 ? vs.reduce((t, v) => t + v, 0) / vs.length : neg ? Math.min(...vs) : Math.max(...vs));
  return {
    x: xs,
    Mmax: xs.map((_, j) => comb(pega('Mmax', j))), Mmin: xs.map((_, j) => comb(pega('Mmin', j), true)),
    V: xs.map((_, j) => { const vs = pega('V', j); return vs.length ? Math.max(...vs) : 0; }),
  };
}

export interface MinimosFaixa { esforcos: EsforcosVigota; tipo: TipoVao; divisorPos: number; divisorNeg: number; pisoPos: number; pisoNeg: number }
/**
 * Esforços de cálculo do grupo. Ponto a ponto (`ponto`): positivo = pico do diagrama igualado, nunca menos que o piso do
 * momento mínimo igualado; negativos = pontas igualadas entre as vigotas, com o piso do mínimo; por pico: igualam-se os
 * valores de cada vigota já com os mínimos (R6). Pelo máximo (critério 1) os dois coincidem. O cortante é sempre o maior.
 */
export function esforcosDoGrupo(ids: number[], fs: FaixaVigota[], mins: MinimosFaixa[], criterio: number, ponto: boolean, igual: (vs: number[], c: number, neg?: boolean) => number): { esforcos: EsforcosVigota; diagrama: DiagramaVigota } {
  const diagrama = diagramaIgualado(ids.map((i) => fs[i]), criterio);
  const v = [0, 1].map((k) => Math.max(...ids.map((i) => mins[i].esforcos.v[k]))) as [number, number];
  if (!ponto) {
    return { esforcos: { mPos: igual(ids.map((i) => mins[i].esforcos.mPos), criterio), mNeg: [0, 1].map((k) => igual(ids.map((i) => mins[i].esforcos.mNeg[k]), criterio, true)) as [number, number], v }, diagrama };
  }
  // pelo máximo o pico do diagrama igualado é o maior pico das vigotas (valor exato, sem o arredondamento do diagrama exibido)
  const pico = criterio === 2 ? Math.max(0, ...diagrama.Mmax) : Math.max(0, ...ids.map((i) => fs[i].calc.mPos));
  const mPos = Math.max(pico, igual(ids.map((i) => mins[i].pisoPos), criterio));
  const mNeg = [0, 1].map((k) => Math.min(igual(ids.map((i) => fs[i].calc.mNeg[k]), criterio, true), igual(ids.map((i) => mins[i].pisoNeg), criterio, true))) as [number, number];
  return { esforcos: { mPos, mNeg, v }, diagrama };
}

// ---------------------------------------------------------------- redistribuição (K1.4.2, K1.4.40)

export interface ResultadoRedistribuicao { esforcos: EsforcosVigota; delta: number; aplicada: boolean }
/**
 * Redistribuição dos negativos das pontas contínuas pela opção das vigas, limitada por δ ≥ `deltaMin` (0,75; 0,90 em nós
 * móveis, NBR 6118, 14.6.4.3): cada negativo é multiplicado por δ e o positivo cresce da metade da soma das reduções
 * (equilíbrio do vão). O limite de 30 % do programa de referência não é adotado: a NBR prevalece.
 */
export function redistribuirNegativos(esf: EsforcosVigota, continuas: [boolean, boolean], pct: number, deltaMin = 0.75): ResultadoRedistribuicao {
  const delta = Math.max(1 - pct / 100, deltaMin);
  if (pct <= 0 || delta >= 1 - 1e-12) return { esforcos: esf, delta: 1, aplicada: false };
  const mNeg = esf.mNeg.map((m, k) => (continuas[k] && m < -1e-9 ? m * delta : m)) as [number, number];
  const dm = esf.mNeg.reduce((t, m, k) => t + (continuas[k] && m < -1e-9 ? -m * (1 - delta) : 0), 0);
  if (dm <= 0) return { esforcos: esf, delta: 1, aplicada: false };
  return { esforcos: { mPos: esf.mPos + dm / 2, mNeg, v: esf.v }, delta, aplicada: true };
}

// ---------------------------------------------------------------- vigotas reais (K1.12.5-1, K1.3.18, K1.5.5, C7.14)

export interface VigotaPosicionada {
  /** Índice da vigota na numeração do pano (0 = a primeira, a partir da borda do ponto de inserção). */
  indice: number;
  /** Posição transversal do eixo (m, a mesma origem de `FaixaVigota.t`). */
  t: number;
  /** Alinhamento da grelha de onde saem os esforços (o mais próximo) e vigotas lado a lado (1, 2 ou 3). */
  faixa: number; multipla: 1 | 2 | 3;
}
/**
 * Posição das vigotas reais da laje: `n` vigotas igualmente espaçadas na largura transversal `B` (intereixo ajustado ao
 * pano), a partir da borda do ponto de inserção (`Laje.insercao`; ausente = a menor posição transversal). Cada vigota recebe
 * os esforços do alinhamento da grelha mais próximo. Vigotas duplas/triplas ocupam o lugar da marcada mais as seguintes, que
 * são apagadas (C7.14); marcas fora do pano ou repetidas são ignoradas.
 */
export function posicionarVigotas(l: Pick<Laje, 'contorno' | 'insercao' | 'vigotasMultiplas'>, faixas: Pick<FaixaVigota, 't'>[], n: number, B: number, u: P, multiplasMax = 3): VigotaPosicionada[] {
  const v: P = [-u[1], u[0]], ts = l.contorno.map((p) => p[0] * v[0] + p[1] * v[1]);
  const tmin = Math.min(...ts), tmax = Math.max(...ts), larg = Math.min(B, tmax - tmin) || B;
  const iv = l.insercao !== undefined && l.contorno[l.insercao] ? ts[l.insercao] : tmin;
  const desce = Math.abs(iv - tmax) < Math.abs(iv - tmin), passo = larg / n, centro = (tmin + tmax) / 2;
  const tIni = Math.abs(larg - (tmax - tmin)) < 1e-9 ? (desce ? tmax : tmin) : centro + (desce ? 1 : -1) * (larg / 2);
  const marcas = new Map<number, 2 | 3>();
  for (const m of [...(l.vigotasMultiplas ?? [])].sort((a, z) => a.indice - z.indice)) if (m.indice >= 0 && m.indice < n && Math.min(m.n, multiplasMax) >= 2) marcas.set(m.indice, Math.min(m.n, multiplasMax) as 2 | 3);
  const out: VigotaPosicionada[] = [];
  for (let k = 0; k < n; k++) {
    const t = tIni + (desce ? -1 : 1) * (k + 0.5) * passo;
    const q = Math.min(marcas.get(k) ?? 1, n - k) as 1 | 2 | 3;
    const faixa = faixas.reduce((best, f, i) => (Math.abs(f.t - t) < Math.abs(faixas[best].t - t) ? i : best), 0);
    out.push({ indice: k, t, faixa, multipla: q });
    k += q - 1;
  }
  return out;
}

/** Marcações de duplas/triplas ainda válidas para a ficha (n no máximo o da ficha). */
export function multiplasValidas(marcas: VigotaMultipla[] | undefined, max: number): VigotaMultipla[] {
  return (marcas ?? []).filter((m) => m.n <= max);
}
