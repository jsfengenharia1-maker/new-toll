// Conjunto de pranchas (R5): locação e cargas, formas (uma por grupo), armação de vigas (por grupo), de pilares
// (com o quadro de pilares) e de lajes (por grupo), numeradas "folha n de N" na ordem do conjunto. Saem pelos
// mesmos escritores (PDF, DXF, DWG, SVG) da planta de formas.
import type { AnaliseEdificio } from '../building/analitico';
import type { Dimensionamento } from '../building/dimensionamento';
import type { BuildingModel, Formato } from '../building/types';
import { montarPranchas, type Prancha, type TipoPrancha } from './prancha';
import { numerarPrancha, type OpcoesCarimbo } from './armacao';
import { acharGrupo, montarPranchasVigas } from './armacaoVigas';
import { montarPranchasPilares } from './armacaoPilares';
import { montarPranchasLajes } from './armacaoLajes';
import { montarPranchasParedes } from './armacaoParedes';
import { montarPranchaLocacao } from './locacao';
import { montarPranchasFundacao } from './fundacao';
import { montarPranchaPerspectiva, montarPranchasCargas, montarPranchasResultados } from './folhasV5';
import { aplicarEstilo } from './estilo';
import { inserirDetalhes } from './saidas';

export type TipoSaida = TipoPrancha | 'todas';
export const TIPOS_PRANCHA: TipoSaida[] = ['formas', 'locacao', 'fundacao', 'vigas', 'pilares', 'paredes', 'lajes', 'cargas', 'perspectiva', 'resultados', 'todas'];
/** Ordem das pranchas no conjunto. */
export const ORDEM_CONJUNTO: TipoPrancha[] = ['locacao', 'fundacao', 'formas', 'vigas', 'pilares', 'paredes', 'lajes'];
/** Tipos que exigem análise e dimensionamento. */
export const PRECISA_CALCULO: TipoPrancha[] = ['vigas', 'pilares', 'paredes', 'lajes', 'fundacao', 'resultados'];

export interface OpcoesConjunto {
  /** Tipos de prancha (padrão: formas). 'todas' = o conjunto completo. */
  tipos?: TipoSaida | TipoSaida[];
  /** Só este grupo (id ou nome), nas pranchas por grupo (formas, vigas e lajes). */
  grupo?: string;
  /** Formato e escala das plantas de formas (as de armação seguem `b.prancha.armacao`). */
  formato?: Formato | 'auto'; escala?: number;
  carimbo?: OpcoesCarimbo;
  /** Armaduras para o quadro da planta de formas (padrão: as do dimensionamento). */
  armaduras?: Record<string, string>;
}

/** Folhas só pedidas por nome (fora do conjunto completo): cargas por caso e perspectiva (V5) e resultados (V6f). */
export const FOLHAS_AVULSAS: TipoPrancha[] = ['cargas', 'perspectiva', 'resultados'];
export const tiposDe = (t: OpcoesConjunto['tipos']): TipoPrancha[] => {
  const xs = Array.isArray(t) ? t : [t ?? 'formas'];
  return xs.includes('todas') ? ORDEM_CONJUNTO : [...ORDEM_CONJUNTO, ...FOLHAS_AVULSAS].filter((x) => xs.includes(x));
};

/** Armaduras dos pilares por `${pilar}|${pavimento}` para o quadro da planta de formas. */
export function armadurasDoDim(b: BuildingModel, dim: Dimensionamento): Record<string, string> {
  const idPav = new Map(b.pavimentos.map((p) => [p.nome, p.id]));
  return Object.fromEntries(dim.pilares.map((p) => [`${p.pilar}|${p.pavimentoId ?? idPav.get(p.pavimento)}`, p.armadura]));
}

/**
 * Monta as pranchas pedidas, na ordem do conjunto, e numera "n/N". Sem análise ou dimensionamento, as pranchas de
 * armação ficam de fora (aviso na primeira prancha) e a locação sai sem a tabela de cargas.
 */
export function montarConjunto(b: BuildingModel, an: AnaliseEdificio | null, dim: Dimensionamento | null, o: OpcoesConjunto = {}): { pranchas: Prancha[]; avisos: string[] } {
  const tipos = tiposDe(o.tipos), avisos: string[] = [];
  const out: Prancha[] = [];
  const oa = { grupo: o.grupo, carimbo: o.carimbo };
  const pedeTodas = (Array.isArray(o.tipos) ? o.tipos : [o.tipos]).includes('todas');
  for (const t of tipos) {
    if (t === 'fundacao' && pedeTodas && !b.fundacao?.elementos.length && !b.fundacao?.corridas?.length) continue;
    if (t === 'paredes' && pedeTodas && !dim?.armaduraParedes?.length) continue;
    if (PRECISA_CALCULO.includes(t) && !dim) { avisos.push(`Pranchas de ${t}: calcule e dimensione o edifício antes.`); continue; }
    if (t === 'fundacao' && !dim?.fundacoes?.length && !dim?.radiers?.length && !dim?.vigasElasticas?.length && !dim?.corridas?.length) { if (!pedeTodas) avisos.push('Pranchas de fundação: lance fundações no nível de fundação e calcule o edifício.'); continue; }
    if (t === 'locacao') { const pr = montarPranchaLocacao(b, an, oa); if (pr) out.push(pr); }
    else if (t === 'formas') {
      let prs = montarPranchas(b, { formato: o.formato, escala: o.escala, carimbo: o.carimbo, armaduras: o.armaduras ?? (dim ? armadurasDoDim(b, dim) : undefined) });
      const g = acharGrupo(b, o.grupo);
      if (g) { const nome = b.grupos.find((x) => x.id === g)?.nome; prs = prs.filter((p) => p.titulo === `Formas — ${nome}`); }
      out.push(...prs);
    } else if (t === 'fundacao') out.push(...montarPranchasFundacao(b, an, dim!, oa));
    else if (t === 'vigas') out.push(...montarPranchasVigas(b, an, dim!, oa));
    else if (t === 'pilares') out.push(...montarPranchasPilares(b, an, dim!, oa));
    else if (t === 'paredes') { const pr = montarPranchasParedes(b, an, dim!, oa); if (!pr.length && !pedeTodas) avisos.push('Pranchas de paredes: não há paredes ou pilares-parede calculados.'); out.push(...pr); }
    else if (t === 'lajes') out.push(...montarPranchasLajes(b, an, dim!, oa));
    else if (t === 'cargas') { const prs = montarPranchasCargas(b, oa); if (!prs.length) avisos.push('Pranchas de cargas: não há cargas lançadas.'); out.push(...prs); }
    else if (t === 'resultados') { const prs = montarPranchasResultados(b, an, dim, oa); if (!prs.length) avisos.push('Pranchas de resultados: não há pavimento com laje calculada.'); out.push(...prs); }
    else if (t === 'perspectiva') { const pr = montarPranchaPerspectiva(b, oa); if (pr) out.push(pr); else avisos.push('Perspectiva: não há elementos para desenhar.'); }
  }
  // V5: detalhes DXF inseridos e estilo de desenho (camadas, penas e textos) da obra
  const finais = out.map((pr) => aplicarEstilo(inserirDetalhes(pr, b.prancha?.detalhes, pr.tipo ?? 'formas'), b.prancha?.estilo));
  finais.forEach((pr, i) => numerarPrancha(pr, i + 1, finais.length));
  return { pranchas: finais, avisos };
}
