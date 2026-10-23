// Diagonais de contraventamento entre pavimentos (E2d; C6.36 a C6.46): lista e resumo, cruzamentos (nó gerado no ponto em que duas
// diagonais se cruzam, sem reduzir o comprimento de flambagem), diagnósticos DIAGONAL_* e a divisão de uma diagonal múltipla
// quando se edita só o grupo atual. A barra, a análise (analitico.ts) e o dimensionamento (inclinadasDim.ts) são os das vigas
// inclinadas (E2c); aqui está só o que é próprio das diagonais.
import { barrasDaInclinada, diagnosticosDe, type BarraInclinada } from './inclinadas';
import type { Diagnostico } from './verify';
import type { BuildingModel, Diagonal } from './types';

/** Distância máxima (m) entre os eixos de duas diagonais para valer o cruzamento. */
export const TOL_CRUZAMENTO = 0.05;
/** Distância mínima (m) do cruzamento ao extremo da barra: abaixo disso é ligação, não cruzamento. */
export const DIST_MIN_EXTREMO = 0.05;

export type V3 = [number, number, number];
/** Cruzamento de duas ou mais diagonais: posição (m), as barras que o têm e a abscissa de cada uma sobre o eixo entre as pontas (m). */
export interface Cruzamento { chave: string; pos: V3; barras: { barra: string; s: number }[] }

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const eixo = (x: BarraInclinada): [V3, V3] => [[x.pIni[0], x.pIni[1], x.zIni], [x.pFim[0], x.pFim[1], x.zFim]];

/** Barras de todas as diagonais da obra (múltiplas expandidas). */
export const expandirDiagonais = (b: BuildingModel): BarraInclinada[] => (b.diagonais ?? []).flatMap((d) => barrasDaInclinada(b, d));

/** Pontos de menor distância entre dois segmentos do espaço: parâmetros (0 a 1) em cada um e a distância. null se paralelos. */
export function aproximacao(p0: V3, p1: V3, q0: V3, q1: V3): { s: number; t: number; dist: number; ponto: V3 } | null {
  const d1 = sub(p1, p0), d2 = sub(q1, q0), w = sub(p0, q0), a = dot(d1, d1), bb = dot(d1, d2), c = dot(d2, d2), d = dot(d1, w), e = dot(d2, w), den = a * c - bb * bb;
  if (den < 1e-12 * a * c) return null;
  const s = (bb * e - c * d) / den, t = (a * e - bb * d) / den;
  const P: V3 = [p0[0] + s * d1[0], p0[1] + s * d1[1], p0[2] + s * d1[2]], Q: V3 = [q0[0] + t * d2[0], q0[1] + t * d2[1], q0[2] + t * d2[2]];
  return { s, t, dist: Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]), ponto: [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2, (P[2] + Q[2]) / 2] };
}

/**
 * Cruzamentos entre as barras de diagonais (C6.43): dois eixos que passam a até TOL_CRUZAMENTO um do outro, longe dos extremos de
 * ambas. Cruzamentos no mesmo ponto (até 1 cm) viram um só. Cada barra guarda a abscissa sobre o eixo entre as pontas.
 */
export function cruzamentosDiagonais(b: BuildingModel): Cruzamento[] {
  const bs = expandirDiagonais(b), mapa = new Map<string, Cruzamento>();
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const [a0, a1] = eixo(bs[i]), [c0, c1] = eixo(bs[j]), r = aproximacao(a0, a1, c0, c1);
    if (!r || r.dist > TOL_CRUZAMENTO) continue;
    const sa = r.s * bs[i].L, sb = r.t * bs[j].L;
    if (sa < DIST_MIN_EXTREMO || bs[i].L - sa < DIST_MIN_EXTREMO || sb < DIST_MIN_EXTREMO || bs[j].L - sb < DIST_MIN_EXTREMO) continue;
    const chave = r.ponto.map((v) => Math.round(v * 100)).join('|'), c = mapa.get(chave) ?? { chave, pos: r.ponto, barras: [] };
    for (const [x, s] of [[bs[i], sa], [bs[j], sb]] as const) if (!c.barras.some((y) => y.barra === x.id)) c.barras.push({ barra: x.id, s });
    mapa.set(chave, c);
  }
  return [...mapa.values()];
}

export const cruzamentosDaBarra = (b: BuildingModel, id: string): Cruzamento[] => cruzamentosDiagonais(b).filter((c) => c.barras.some((x) => x.barra === id));

/** Diagnósticos do lançamento das diagonais (mesmas regras das vigas inclinadas, com código DIAGONAL_*). */
export const diagnosticosDiagonais = (b: BuildingModel): Diagnostico[] => diagnosticosDe(b, b.diagonais ?? [], 'DIAGONAL');

export interface LinhaDiagonal {
  id: string; nome: string; barras: number; pavimentoIni: string; pavimentoFim: string; secao: string; comprimento: number; angulo: number; multipla: boolean;
  ligacao: string; flambagem: string; cruzamentos: number;
}

const fmt = (v: number, c = 2) => String(+v.toFixed(c)).replace('.', ',');

/** Resumo para listas, informação (C6.45) e memorial: grupos, comprimento real, seção, ligações e flambagem. */
export function resumoDiagonais(b: BuildingModel, kV = 1, kT = 1): LinhaDiagonal[] {
  const cruz = cruzamentosDiagonais(b);
  return (b.diagonais ?? []).map((d) => {
    const bs = barrasDaInclinada(b, d), l = bs.find((x) => x.lancada) ?? bs[0], lig = (x?: string) => (x === 'articulada' ? 'articulada' : 'engastada');
    const nomePav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
    return {
      id: d.id, nome: d.nome, barras: bs.length, pavimentoIni: nomePav(d.pavIni), pavimentoFim: nomePav(d.pavFim), secao: `${fmt(d.secao.b * 100, 0)}×${fmt(d.secao.h * 100, 0)} cm`,
      comprimento: l?.L ?? 0, angulo: l?.angulo ?? 0, multipla: !!d.multipla, ligacao: `${lig(d.ligIni)} / ${lig(d.ligFim)}`,
      flambagem: `${fmt(d.flambagem?.vertical ?? kV)} / ${fmt(d.flambagem?.transversal ?? kT)}`,
      cruzamentos: cruz.filter((c) => c.barras.some((x) => bs.some((y) => y.id === x.barra))).length,
    };
  });
}

/** Barra da diagonal cujo pavimento inicial é `pavIni` (o "grupo atual" da edição). */
export const barraDoPavimento = (b: BuildingModel, d: Diagonal, pavIni: string): BarraInclinada | undefined => barrasDaInclinada(b, d).find((x) => x.pavIni === pavIni);
