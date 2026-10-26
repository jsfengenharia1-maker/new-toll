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

// ---------------------------------------------------------------- E6b: armadura superior em cadeia entre panos (C7.100)

/** Ponta de vigota com armadura superior (negativo) que entra na igualação entre panos. `M` ≤ 0 (kN·m por nervura). */
export interface PontaSuperior {
  laje: string; faixa: number; ponta: 0 | 1;
  /** Posição da ponta (m), direção das vigotas (unitária) e largura representada pelo alinhamento (m). */
  p: [number, number]; u: [number, number]; largura: number;
  M: number; conv: ConversaoMomentoArea;
}
export const chavePonta = (q: Pick<PontaSuperior, 'faixa' | 'ponta'>) => `${q.faixa}|${q.ponta}`;

/**
 * Igualação da armadura superior entre panos (E6b, C7.100: "segue em cadeia por todo o pano e por todos os panos"). As pontas com
 * negativo que chegam a um mesmo apoio (vigotas paralelas e coordenada longitudinal igual a menos de `tolApoio`, de um lado ou do
 * outro do apoio) formam uma linha; só as linhas com pontas de dois ou mais panos entram (dentro de um pano vale a E5e). Na linha,
 * ordenadas ao longo do apoio, cada ponta é comparada com a vizinha pela área de aço (`gruposEmCadeia`); um vão maior que a soma das
 * meias larguras + `folga` interrompe a cadeia. O grupo recebe a maior área (critério 1: só as menores sobem) ou a média das áreas
 * (critério 2), de volta em momento pela seção de cada pano. Devolve, por laje, o novo momento (≤ 0) de cada ponta alterada.
 */
export function igualarSuperiorEntrePanos(pontas: PontaSuperior[], difPct: number, criterio: number, tolApoio = 0.6, folga = 0.6): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  if (criterio <= 0 || pontas.length < 2) return out;
  // linhas de apoio (união das pontas paralelas na mesma coordenada longitudinal)
  const pai = pontas.map((_, i) => i), raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  for (let i = 0; i < pontas.length; i++) for (let j = i + 1; j < pontas.length; j++) {
    const a = pontas[i], z = pontas[j];
    if (Math.abs(a.u[0] * z.u[1] - a.u[1] * z.u[0]) > 1e-3) continue;
    if (Math.abs((z.p[0] - a.p[0]) * a.u[0] + (z.p[1] - a.p[1]) * a.u[1]) <= tolApoio) pai[raiz(j)] = raiz(i);
  }
  const linhas = new Map<number, PontaSuperior[]>();
  pontas.forEach((q, i) => linhas.set(raiz(i), [...(linhas.get(raiz(i)) ?? []), q]));
  for (const linha of linhas.values()) {
    if (new Set(linha.map((q) => q.laje)).size < 2) continue;
    const u = linha[0].u, n: [number, number] = [-u[1], u[0]], t = (q: PontaSuperior) => q.p[0] * n[0] + q.p[1] * n[1], s = (q: PontaSuperior) => q.p[0] * u[0] + q.p[1] * u[1];
    const ord = [...linha].sort((a, z) => t(a) - t(z) || s(a) - s(z) || (a.laje < z.laje ? -1 : a.laje > z.laje ? 1 : 0));
    // trechos contínuos ao longo do apoio
    const trechos: PontaSuperior[][] = [];
    ord.forEach((q, i) => {
      const ant = ord[i - 1];
      if (ant && t(q) - t(ant) <= (q.largura + ant.largura) / 2 + folga) trechos.at(-1)!.push(q); else trechos.push([q]);
    });
    for (const tr of trechos) {
      const areas = tr.map((q) => q.conv.areaDe(-q.M));
      for (const g of gruposEmCadeia(areas, difPct, criterio)) {
        if (g.length < 2) continue;
        const As = g.map((i) => areas[i]), alvo = criterio === 2 ? As.reduce((x, y) => x + y, 0) / As.length : Math.max(...As);
        for (const i of g) {
          const q = tr[i];
          if (criterio !== 2 && areas[i] >= alvo - 1e-9) continue;
          const M = criterio === 2 ? -q.conv.momentoDe(alvo) : Math.min(q.M, -q.conv.momentoDe(alvo));
          if (Math.abs(M - q.M) < 1e-9) continue;
          const m = out.get(q.laje) ?? new Map<string, number>();
          m.set(chavePonta(q), M);
          out.set(q.laje, m);
        }
      }
    }
  }
  return out;
}
