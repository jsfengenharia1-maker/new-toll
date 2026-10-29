// Fluxo do Edifício por etapas, na ordem da obra (8 etapas): o estado de cada etapa sai do modelo e do último cálculo, nada é guardado.
// Mapa das 11 etapas do guia antigo (L1) para as 8: obra + pavimentos -> obra; gabarito + pilares + pilares-parede -> pilares;
// muros + vigas + lajes + escadas -> vigasLajes; cargas -> cargas; (novo) fundação; cálculo -> calcular; (novo) resultados e pranchas.
import { ehArranque, qDoUso, type BuildingModel } from './types';

export type EtapaId = 'obra' | 'pilares' | 'vigasLajes' | 'cargas' | 'fundacao' | 'calcular' | 'resultados' | 'pranchas';
/** `erro`: a etapa tem problema que o usuário precisa corrigir; `indisponivel`: depende de uma etapa anterior (cálculo). */
export type EstadoEtapa = 'pendente' | 'feito' | 'erro' | 'indisponivel';
export interface Etapa { id: EtapaId; numero: number; rotulo: string; estado: EstadoEtapa; detalhe: string; /** Pode ficar de fora: não é a "próxima etapa". */ opcional: boolean }

/** O que o guia precisa saber além do modelo: o estado do último cálculo. */
export interface ContextoEtapas {
  /** Há cálculo (análise e dimensionamento) válido para o modelo atual. */
  calculado?: boolean;
  /** Erros de lançamento da Verificação (severidade erro). */
  erros?: number;
  /** Mensagem de falha da análise (cálculo que não fechou). */
  erroAnalise?: string;
  /** Elementos dimensionados que não atendem (status `fail`). */
  reprovados?: number;
  /** O carimbo das pranchas tem algum campo preenchido (calculado pela interface: o núcleo do cálculo não lê os dados das pranchas, ver commands.test.ts). */
  carimbo?: boolean;
}

/** Escadas e muros existem desde E4/E1c; mantidos para compatibilidade de importação. */
export const MUROS_DISPONIVEIS = true;
export const ESCADAS_DISPONIVEIS = true;

/** Ordem e rótulos das etapas (os mesmos nomes das abas da faixa). */
export const ETAPAS_ROTULO: Record<EtapaId, string> = {
  obra: 'Obra', pilares: 'Pilares', vigasLajes: 'Vigas e lajes', cargas: 'Cargas', fundacao: 'Fundação', calcular: 'Calcular', resultados: 'Resultados', pranchas: 'Pranchas e memorial',
};
export const ETAPAS_ORDEM: EtapaId[] = ['obra', 'pilares', 'vigasLajes', 'cargas', 'fundacao', 'calcular', 'resultados', 'pranchas'];

/** Elementos de `dim` com `status === 'fail'` (vigas, pilares, lajes e fundações). */
export function contarReprovados(dim: { vigas?: { status: string }[]; pilares?: { status: string }[]; lajes?: { status: string }[]; fundacoes?: { status: string }[] } | null | undefined): number {
  if (!dim) return 0;
  return [dim.vigas, dim.pilares, dim.lajes, dim.fundacoes].reduce((n, xs) => n + (xs ?? []).filter((x) => x.status === 'fail').length, 0);
}

/**
 * Cargas: feita quando há carga lançada (área, linha, ponto ou em pilar) OU a sobrecarga de algum grupo foi definida de propósito, isto é,
 * o `q` do grupo difere do valor padrão da categoria de uso (NBR 6120, Tabela 10). Só com os padrões das categorias a etapa fica pendente:
 * o app não sabe se o usuário revisou a sobrecarga, e uma obra sem nenhuma carga lançada raramente está completa.
 */
export function cargasDefinidas(b: BuildingModel): { lancadas: number; gruposEditados: number } {
  return { lancadas: b.cargas.length + (b.cargasPilar?.length ?? 0), gruposEditados: b.grupos.filter((g) => Math.abs(g.q - qDoUso(g.uso)) > 1e-9).length };
}

export function etapasDaObra(b: BuildingModel, ctx: ContextoEtapas | boolean = {}): Etapa[] {
  const c: ContextoEtapas = typeof ctx === 'boolean' ? { calculado: ctx } : ctx;
  const calculado = !!c.calculado;
  const carimbo = !!c.carimbo;
  const nPil = b.pilares.filter((p) => !ehArranque(p)).length;
  const nPP = b.pilaresParede?.length ?? 0;
  const nParedes = b.paredes?.length ?? 0, nArrimo = b.murosArrimo?.length ?? 0;
  const nEsc = b.escadas?.length ?? 0;
  const f = b.fundacao;
  const nFund = (f?.elementos.length ?? 0) + (f?.radiers?.length ?? 0) + (f?.vigasElasticas?.length ?? 0) + (f?.corridas?.length ?? 0);
  const nomeDado = !!b.obra.nome.trim() && b.obra.nome !== 'Edifício sem nome';
  const cg = cargasDefinidas(b);
  const e = (id: EtapaId, estado: EstadoEtapa, detalhe: string, opcional = false): Etapa => ({ id, numero: ETAPAS_ORDEM.indexOf(id) + 1, rotulo: ETAPAS_ROTULO[id], estado, detalhe, opcional });
  const pf = (feito: boolean): EstadoEtapa => (feito ? 'feito' : 'pendente');

  const nErros = c.erros ?? 0;
  const calcular: Etapa = c.erroAnalise
    ? e('calcular', 'erro', `A análise falhou: ${c.erroAnalise}`)
    : nErros > 0
      ? e('calcular', 'erro', `${nErros} erro(s) de lançamento na Verificação: corrija antes de confiar no cálculo.`)
      : e('calcular', pf(calculado), calculado ? 'Cálculo em vigor.' : 'Calcule a obra (com ou sem as fundações).');
  const nRep = c.reprovados ?? 0;
  const resultados: Etapa = !calculado
    ? e('resultados', 'indisponivel', 'Calcule a obra para ver esforços, deslocamentos e armaduras.')
    : nRep > 0
      ? e('resultados', 'erro', `${nRep} elemento(s) não atendem: revise a Verificação e o Dimensionamento.`)
      : e('resultados', 'feito', 'Todos os elementos dimensionados atendem.');
  const pranchas: Etapa = !calculado
    ? e('pranchas', 'indisponivel', 'Calcule a obra antes de gerar pranchas e memorial.')
    : e('pranchas', pf(carimbo), carimbo ? 'Carimbo preenchido.' : 'Preencha o carimbo e gere as pranchas e o memorial.');

  return [
    e('obra', pf(nomeDado && b.pavimentos.length > 0), nomeDado ? `${b.obra.nome}: ${b.pavimentos.length} pavimento(s) em ${b.grupos.length} grupo(s)` : 'Dê um nome à obra e lance os pavimentos.'),
    e('pilares', pf(nPil > 0 || nPP > 0), `${b.mascaras.length} gabarito(s), ${b.eixos.length} eixo(s); ${nPil} pilar(es), ${nPP} pilar(es)-parede`),
    e('vigasLajes', pf(b.vigas.length > 0 && b.lajes.length > 0),
      `${b.vigas.length} viga(s), ${b.lajes.length} laje(s); ${nParedes} parede(s), ${nArrimo} muro(s) de arrimo, ${nEsc} escada(s) (opcionais)`),
    e('cargas', pf(cg.lancadas > 0 || cg.gruposEditados > 0),
      cg.lancadas > 0 || cg.gruposEditados > 0 ? `${cg.lancadas} carga(s) lançada(s); sobrecarga editada em ${cg.gruposEditados} grupo(s)` : 'Só as sobrecargas padrão das categorias de uso: lance as cargas ou edite a sobrecarga dos grupos.'),
    e('fundacao', pf(nFund > 0), nFund > 0 ? `${nFund} elemento(s) de fundação` : 'Opcional: lance as fundações ou calcule a obra sem elas.', true),
    calcular,
    resultados,
    pranchas,
  ];
}

/** Primeira etapa obrigatória ainda por fazer (pendente ou com erro), ou `undefined` quando não há. */
export const proximaEtapa = (et: Etapa[]): Etapa | undefined => et.find((x) => (x.estado === 'pendente' || x.estado === 'erro') && !x.opcional);
