// Rearmar (R7f): refaz o dimensionamento e o detalhamento sobre uma análise já feita, sem refazê-la.
//  - "todos": todos os elementos, com os esforços da análise vigente. Depois de mudar só detalhes (tabelas, armadura
//    bloqueada, opções de detalhamento), o resultado é igual ao de uma análise nova, só mais rápido.
//  - "alterados": só os elementos cuja entrada mudou desde o último dimensionamento (seção modificada, armadura
//    desbloqueada, tabela ou cobrimento próprios); os demais guardam o resultado anterior. Mudou algo global (opções,
//    tabelas, materiais, tramos, agrupamentos…), todos entram.
//  - Depois de mudar seções (`calculo: 'secao'`), os esforços guardados são da estrutura antiga: o elemento cuja inércia
//    variou além do limite recebe o aviso ESFORCO_ANTIGO, que pede nova análise.
import type { AnaliseEdificio } from './analitico';
import { dimensionarEdificio, type Dimensionamento } from './dimensionamento';
import { resumoAcoVigas } from './detalhamento';
import { resumoAcoPilares } from './detalhamentoPilares';
import { opcoesEmUso, perfilDe } from './opcoes';
import type { BuildingModel } from './types';
import { elementosAlterados, mesmosElementos, variacoesRigidez, type InfoRearme } from './rearmarAlterados';

export { elementosAlterados, mesmosElementos, variacoesRigidez, type ElementoAlterado, type InfoRearme } from './rearmarAlterados';

export interface OpcoesRearmar {
  modo: 'todos' | 'alterados';
  /** Dimensionamento anterior e o modelo para o qual foi feito (fundações e, no modo "alterados", os demais resultados saem dele). */
  anterior?: Dimensionamento | null;
  modeloAnterior?: BuildingModel | null;
  /** Modelo que foi analisado (para o aviso de esforços antigos) e a revisão de cálculo da análise. */
  modeloAnalise?: BuildingModel | null;
  esforcosRev?: number;
}

const pct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(0).replace('.', ',')} %`;

/**
 * Refaz o dimensionamento e o detalhamento de `b` com a análise `an` (que pode ser de um modelo com outras seções).
 * Devolve erro se a estrutura analisada não tem os mesmos elementos. As fundações e o que não é da estrutura vêm do
 * resultado anterior, quando existe.
 */
export function rearmar(b: BuildingModel, an: AnaliseEdificio, o: OpcoesRearmar): { dim: Dimensionamento } | { erro: string } {
  if (an.erro || !an.portico.res) return { erro: an.erro ?? 'A análise não tem resultados.' };
  if (o.modeloAnalise) { const motivo = mesmosElementos(o.modeloAnalise, b); if (motivo) return { erro: `Não dá para rearmar com os esforços guardados: ${motivo}. Refaça a análise.` }; }
  const todasVariacoes = o.modeloAnalise ? variacoesRigidez(o.modeloAnalise, b) : [];
  const antigo = todasVariacoes.length > 0;
  // as opções de dimensionamento e detalhamento vêm do modelo atual (a análise guardou as do momento em que foi feita)
  const op = { ...an.opcoes, ...opcoesEmUso(b.opcoes, perfilDe(b)) };
  const an2: AnaliseEdificio = { ...an, opcoes: op };
  const cheio = dimensionarEdificio(b, an2, { fundacao: false });
  let dim = cheio;
  const info: InfoRearme = { modo: o.modo, esforcosRev: o.esforcosRev ?? 0, antigos: antigo, refeitos: [], mantidos: 0, variacoes: [] };
  const mudancas = o.modeloAnterior ? elementosAlterados(o.modeloAnterior, b) : null;
  if (mudancas) info.refeitos = mudancas.elementos;
  if (o.modo === 'alterados') {
    if (!o.anterior || !mudancas) return { erro: 'Não há dimensionamento anterior: use "Rearmar todos".' };
    if (mudancas.globais.length) info.global = `mudou ${mudancas.globais.join(', ')}`;
    else dim = manter(b, cheio, o.anterior, new Set(mudancas.elementos.filter((x) => x.tipo === 'viga').map((x) => x.id)), new Set(mudancas.elementos.filter((x) => x.tipo === 'pilar').map((x) => x.id)), op, info);
  }
  if (antigo) {
    const lim = op.rearmarLimiteRigidez / 100;
    info.variacoes = todasVariacoes.filter((x) => Math.abs(x.variacao) > lim);
    for (const x of info.variacoes) {
      const msg = `Esforços antigos: a inércia de ${x.nome} variou ${pct(x.variacao)} desde a análise (revisão ${info.esforcosRev}); refaça a análise para esforços corretos.`;
      if (x.tipo === 'viga') dim.vigas.find((v) => v.viga === x.id)?.mensagens.push(msg);
      else for (const r of dim.pilares) if (r.pilar === x.id) r.mensagens.push(msg);
    }
  }
  // fundações e resultados que não dependem da estrutura nova: do resultado anterior
  if (o.anterior) for (const k of ['fundacoes', 'vigasFundacao', 'avisosFundacao', 'corridas'] as const) { if (o.anterior[k]) (dim as unknown as Record<string, unknown>)[k] = o.anterior[k]; }
  dim.rearme = info;
  return { dim };
}

/** Modo "alterados": vigas e pilares não alterados guardam o resultado anterior; os resumos de aço são refeitos. */
function manter(b: BuildingModel, novo: Dimensionamento, ant: Dimensionamento, vigas: Set<string>, pilares: Set<string>, op: AnaliseEdificio['opcoes'], info: InfoRearme): Dimensionamento {
  const dim = { ...novo };
  const vigasA = new Map(ant.vigas.map((v) => [v.viga, v]));
  dim.vigas = novo.vigas.map((v) => (vigas.has(v.viga) || !vigasA.has(v.viga) ? v : vigasA.get(v.viga)!));
  const detA = new Map((ant.detalhes ?? []).map((d) => [d.viga, d]));
  if (novo.detalhes) { dim.detalhes = novo.detalhes.map((d) => (vigas.has(d.viga) || !detA.has(d.viga) ? d : detA.get(d.viga)!)); dim.resumoAcoVigas = resumoAcoVigas(b, dim.detalhes, op.perdasAco); }
  const pilA = new Map(ant.pilares.map((p) => [`${p.pilar}|${p.pavimentoId ?? p.pavimento}`, p]));
  dim.pilares = novo.pilares.map((p) => { const a = pilA.get(`${p.pilar}|${p.pavimentoId ?? p.pavimento}`); return pilares.has(p.pilar) || !a ? p : a; });
  const dpA = new Map((ant.detalhesPilares ?? []).map((d) => [d.pilar, d]));
  if (novo.detalhesPilares) { dim.detalhesPilares = novo.detalhesPilares.map((d) => (pilares.has(d.pilar) || !dpA.has(d.pilar) ? d : dpA.get(d.pilar)!)); dim.resumoAcoPilares = resumoAcoPilares(b, dim.detalhesPilares, op.perdasAco); }
  info.mantidos = [...vigasA.keys()].filter((id) => !vigas.has(id)).length + new Set(ant.pilares.map((p) => p.pilar).filter((id) => !pilares.has(id))).size;
  return dim;
}
