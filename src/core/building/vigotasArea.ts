// Igualação das vigotas pela área de aço (frente E5e, C7.100): cada vigota tem a área de aço necessária (positiva e negativa)
// e a vizinha entra no mesmo grupo se a diferença entre as duas áreas é menor que o percentual, em cadeia por todo o pano.
// Dentro do grupo, o critério (máximo ou média) age sobre as áreas; o momento de cálculo do grupo é o que resulta dessa área.
// Núcleo puro; kN, m; áreas em cm².
import { beamFlexure, type BeamSection } from '../concrete';
import { RHO_MIN_LAJE } from './detalhamentoLajes';
import { acoDe, cobrimentoLaje, concretoDe } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { momentoResistenteT, type GeometriaNervurada } from './tiposLaje';
import type { BuildingModel, Laje } from './types';

/** Conversão entre momento (kN·m por nervura, módulo) e área de aço (cm² por nervura) de um dos sinais. */
export interface ConversaoMomentoArea { areaDe: (M: number) => number; momentoDe: (As: number) => number }
export interface ConversaoArea { pos: ConversaoMomentoArea; neg: ConversaoMomentoArea }

/**
 * Grupos de vizinhas em cadeia: a vigota i entra no grupo da anterior se |vi − vi−1| < dif·máx(vi, vi−1) (dif em %);
 * valores nulos entram no grupo. Critério 0 = cada uma sozinha. Diferente de `gruposIgualacao`, que compara com o extremo do grupo.
 */
export function gruposEmCadeia(vals: number[], difPct: number, criterio: number): number[][] {
  const out: number[][] = [];
  vals.forEach((v, i) => {
    const g = out.at(-1);
    if (g && criterio > 0) {
      const a = vals[i - 1], mx = Math.max(a, v);
      if (mx <= 1e-9 || Math.abs(v - a) < (difPct / 100) * mx - 1e-12) { g.push(i); return; }
    }
    out.push([i]);
  });
  return out;
}

/** Igualação sobre as áreas: máximo (critério 1, o mais negativo nos negativos) ou média das áreas (2), de volta em momento. */
export function igualarPorArea(conv: ConversaoArea) {
  return (vs: number[], criterio: number, negativo = false): number => {
    if (!vs.length) return 0;
    if (criterio !== 2) return negativo ? Math.min(...vs) : Math.max(...vs);
    const cv = negativo ? conv.neg : conv.pos, media = vs.reduce((t, v) => t + cv.areaDe(Math.abs(v)), 0) / vs.length;
    const M = cv.momentoDe(media);
    return negativo ? -M : M;
  };
}

/** Conversões da seção da laje: positivo em seção T com ρmín; negativo na seção retangular da nervura (a favor da segurança para a capa). */
export function conversaoDaLaje(b: BuildingModel, l: Laje, g: GeometriaNervurada, op: Pick<OpcoesCalculo, 'vigotaIgualacaoBase'>): ConversaoArea | undefined {
  if (!op.vigotaIgualacaoBase) return undefined;
  const c = concretoDe(b, 'laje'), aI = acoDe(b, 'lajeInf'), aS = acoDe(b, 'lajeSup'), cob = cobrimentoLaje(b, l.cobrimento);
  const { intereixo, bw, hEnch, capa, h } = g, dI = h - cob.inf - 0.005, dS = h - cob.sup - 0.005;
  const AsMin = RHO_MIN_LAJE * (intereixo * capa + bw * hEnch) * 1e4;
  const tee: BeamSection = { kind: 'tee', bw, h, bf: intereixo, hf: capa }, ret: BeamSection = { kind: 'rect', bw, h };
  return {
    pos: { areaDe: (M) => (M < 0.01 ? 0 : Math.max(beamFlexure(tee, true, M, dI, 0.03, c, aI.fyd).As * 1e4, AsMin)), momentoDe: (A) => momentoResistenteT(c, intereixo, capa, bw, dI, A / 1e4, aI.fyd) },
    neg: { areaDe: (M) => (M < 0.01 ? 0 : Math.max(beamFlexure(ret, false, M, dS, 0.03, c, aS.fyd).As * 1e4, AsMin)), momentoDe: (A) => momentoResistenteT(c, bw, h, bw, dS, A / 1e4, aS.fyd) },
  };
}
