// Fundação de vários pilares (FU3, interface): monta os comandos que criam a sapata associada ou o bloco com vários
// pilares a partir de pilares escolhidos (na planta ou pela seleção), e as ações sobre sobreposições e limites.
import type { BuildingModel, TipoFundacao } from '../../core/building/types';
import { gruposSobrepostos, type ResultadoFundacao } from '../../core/building/fundacao';

export interface PlanoGrupo {
  cmds: { nome: string; params: Record<string, unknown> }[];
  erro?: string;
  /** O que o plano faz, em uma frase (confirmação e mensagem). */
  resumo: string;
}

/**
 * Comandos para ligar `pilares` num só elemento (≥ 2 pilares):
 *  - sapatas já lançadas e que cobrem exatamente os pilares escolhidos → `fundacao.unir` (mantém vigas e dimensões do primeiro);
 *  - senão, os elementos que já apoiam algum dos pilares são removidos (com as vigas de fundação deles) e um elemento novo é
 *    criado sob a união dos pilares, centrado na resultante (`fundacao.criar { pilares }`).
 */
export function planoGrupo(b: BuildingModel, pilares: string[], tipo: TipoFundacao, estaca?: string, simples?: boolean): PlanoGrupo {
  const vazio = (erro: string): PlanoGrupo => ({ cmds: [], erro, resumo: '' });
  if (tipo === 'tubulao') return vazio('Tubulão só sob um pilar: escolha sapata ou bloco para vários pilares.');
  const ids = [...new Set(pilares)];
  if (ids.length < 2) return vazio('Escolha ao menos dois pilares.');
  for (const id of ids) {
    const p = b.pilares.find((x) => x.id === id);
    if (!p) return vazio(`Pilar ${id} não existe.`);
    if (p.nasce !== 'fundacao') return vazio(`${p.nome} não nasce na fundação.`);
  }
  const els = b.fundacao?.elementos ?? [];
  const existentes = els.filter((e) => e.pilares.some((p) => ids.includes(p)));
  const uniao = [...new Set([...ids, ...existentes.flatMap((e) => e.pilares)])];
  const nome = (id: string) => b.pilares.find((x) => x.id === id)?.nome ?? id;
  if (tipo === 'bloco' && !estaca) return vazio('Bloco sobre estacas: cadastre e escolha um tipo de estaca no grupo Fundação.');
  const cobreExato = existentes.length >= 2 && uniao.length === ids.length && existentes.every((e) => e.tipo === 'sapata');
  if (tipo === 'sapata' && cobreExato) {
    return { cmds: [{ nome: 'fundacao.unir', params: { ids: existentes.map((e) => e.id) } }], resumo: `Sapata associada sob ${uniao.map(nome).join(', ')} (sapatas unidas).` };
  }
  const cmds: PlanoGrupo['cmds'] = [];
  if (existentes.length) cmds.push({ nome: 'fundacao.remover', params: { ids: existentes.map((e) => e.id) } });
  cmds.push({ nome: 'fundacao.criar', params: { pilares: uniao, tipo, posicao: 'centrada', ...(tipo === 'bloco' && estaca ? { estaca: { id: estaca } } : {}), ...(tipo === 'sapata' && simples ? { simples: true } : {}) } });
  return {
    cmds,
    resumo: `${tipo === 'sapata' ? 'Sapata associada' : 'Bloco com vários pilares'} sob ${uniao.map(nome).join(', ')}${existentes.length ? ` (substitui ${existentes.map((e) => e.nome).join(', ')})` : ''}.`,
  };
}

/** Grupos de elementos sobrepostos em planta (ids), a partir dos resultados do cálculo. */
export const sobreposicoesDe = (res: ResultadoFundacao[] | undefined): string[][] => (res ? gruposSobrepostos(res) : []);

/** Limite (nome) citado numa mensagem FUND_LIMITE_IGNORADO ("Limite L1 ignorado ..."). */
export const limiteDaMensagem = (m: string) => /^Limite (\S+) ignorado/.exec(m)?.[1] ?? null;
