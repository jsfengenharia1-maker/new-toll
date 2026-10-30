// Ciclo calcular → corrigir → recalcular: classifica os diagnósticos de lançamento em pendências ANTES de calcular
// (impeditivas, que a análise recusa, e avisos, que não impedem) e os itens da revisão DEPOIS de calcular em erros de
// dimensionamento agrupados por tipo de elemento e pavimento, com texto claro e ação. Função pura: a interface só desenha.
import type { EtapaId } from './etapas';
import { ppDaObra } from './paredesBase';
import type { ItemRevisao, TipoRevisao } from './revisao';
import type { Diagnostico } from './verify';
import { ehArranque, pavimentosOrdenados, type BuildingModel } from './types';

export type ClassePendencia = 'impeditivo' | 'aviso';
export type GrupoPendencia = 'obra' | 'pilares' | 'vigas' | 'lajes' | 'fundacao' | 'outros';
export const GRUPO_ROTULO: Record<GrupoPendencia, string> = { obra: 'Obra', pilares: 'Pilares', vigas: 'Vigas', lajes: 'Lajes', fundacao: 'Fundação', outros: 'Outros' };
const GRUPO_ORDEM: GrupoPendencia[] = ['obra', 'pilares', 'vigas', 'lajes', 'fundacao', 'outros'];

export type TipoAlvo = 'viga' | 'pilar' | 'laje' | 'fundacao' | 'pilarParede' | 'parede';
/** O que o botão de uma pendência faz (a interface decide como). */
export type AcaoPendencia =
  /** Seleciona os elementos na planta e centraliza (troca pavimento e grupo). */
  | { tipo: 'ir'; rotulo: string; elemento: TipoAlvo; ids: string[] }
  /** Abre o seletor de tipo de pano com estas lajes selecionadas. */
  | { tipo: 'tipoLajes'; rotulo: string; ids: string[] }
  /** Correção direta por comando do registro. */
  | { tipo: 'comando'; rotulo: string; comando: string; params: Record<string, unknown> }
  /** Abre a aba da etapa na faixa. */
  | { tipo: 'etapa'; rotulo: string; etapa: EtapaId };

export interface Pendencia {
  /** Estável entre cálculos de uma mesma situação (chave de lista). */
  chave: string;
  classe: ClassePendencia;
  /** Dos diagnósticos de origem: `erro` pode ser um erro de lançamento que não impede o cálculo. */
  gravidade: 'erro' | 'aviso';
  grupo: GrupoPendencia;
  /** Texto claro, sem código bruto. */
  titulo: string;
  detalhe?: string;
  /** Código técnico, mostrado discreto. */
  codigo: string;
  ids: string[];
  acoes: AcaoPendencia[];
}

export interface PendenciasAntes { impeditivas: Pendencia[]; avisos: Pendencia[]; podeCalcular: boolean }

/** "L1, L2, L3, L5" → "L1–L3, L5" (prefixo igual e números seguidos); nomes fora do padrão ficam como estão. */
export function faixaDeNomes(nomes: string[]): string {
  const m = nomes.map((n) => /^(\D*?)(\d+)$/.exec(n.trim()));
  if (!nomes.length) return '';
  if (m.some((x) => !x) || new Set(m.map((x) => x![1])).size !== 1) return nomes.join(', ');
  const pre = m[0]![1], nums = [...new Set(m.map((x) => +x![2]))].sort((a, z) => a - z);
  const out: string[] = [];
  for (let i = 0; i < nums.length;) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(j - i >= 2 ? `${pre}${nums[i]}–${pre}${nums[j]}` : nums.slice(i, j + 1).map((n) => `${pre}${n}`).join(', '));
    i = j + 1;
  }
  return out.join(', ');
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);

/** Tipo do elemento de um id físico do modelo (para agrupar e para o "ir ao elemento"). */
export function tipoDoElemento(b: BuildingModel, id: string): TipoAlvo | null {
  if (b.lajes.some((x) => x.id === id)) return 'laje';
  if (b.vigas.some((x) => x.id === id)) return 'viga';
  if (b.pilares.some((x) => x.id === id)) return 'pilar';
  if (ppDaObra(b).some((x) => x.id === id)) return 'pilarParede';
  if ((b.paredes ?? []).some((x) => x.id === id)) return 'parede';
  const f = b.fundacao;
  if (f && ([...f.elementos, ...(f.radiers ?? []), ...(f.vigasElasticas ?? []), ...(f.corridas ?? [])] as { id: string }[]).some((x) => x.id === id)) return 'fundacao';
  return null;
}
const GRUPO_DO_ALVO: Record<TipoAlvo, GrupoPendencia> = { laje: 'lajes', viga: 'vigas', pilar: 'pilares', pilarParede: 'pilares', parede: 'vigas', fundacao: 'fundacao' };
const ROTULO_ALVO: Record<TipoAlvo, [string, string]> = { laje: ['à laje', 'às lajes'], viga: ['à viga', 'às vigas'], pilar: ['ao pilar', 'aos pilares'], pilarParede: ['ao pilar-parede', 'aos pilares-parede'], parede: ['à parede', 'às paredes'], fundacao: ['ao elemento', 'aos elementos'] };

function nomesDe(b: BuildingModel, ids: string[]): string[] {
  const todos = new Map<string, string>();
  for (const x of [...b.lajes, ...b.vigas, ...b.pilares, ...ppDaObra(b)]) todos.set(x.id, x.nome);
  return ids.map((i) => todos.get(i) ?? i);
}

/**
 * Pendências antes de calcular. Impeditivas: o que a análise recusa (panos a definir, obra sem pavimentos, obra sem pilares).
 * Avisos: os demais diagnósticos de lançamento (erros e avisos), que não impedem o cálculo. Informações ficam de fora.
 */
export function pendenciasAntesDeCalcular(b: BuildingModel, diags: Diagnostico[]): PendenciasAntes {
  const impeditivas: Pendencia[] = [], avisos: Pendencia[] = [];
  const semPav = pavimentosOrdenados(b).length === 0;
  // obra só de arranques (sem pavimentos): a análise calcula só a fundação, não há o que impedir
  if (semPav && b.pilares.some(ehArranque)) { /* calcula só a fundação */ }
  else if (semPav) impeditivas.push({
    chave: 'OBRA_SEM_PAVIMENTO', classe: 'impeditivo', gravidade: 'erro', grupo: 'obra', codigo: 'OBRA_SEM_PAVIMENTO', ids: [],
    titulo: 'A obra ainda não tem pavimentos.', detalhe: 'Crie os pavimentos da obra antes de calcular.',
    acoes: [{ tipo: 'etapa', rotulo: 'Ir à etapa Obra', etapa: 'obra' }],
  });
  else if (!b.pilares.length && !ppDaObra(b).length) impeditivas.push({
    chave: 'OBRA_SEM_PILAR', classe: 'impeditivo', gravidade: 'erro', grupo: 'pilares', codigo: 'OBRA_SEM_PILAR', ids: [],
    titulo: 'A obra ainda não tem pilares.', detalhe: 'Lance ao menos um pilar (ou pilar-parede) antes de calcular.',
    acoes: [{ tipo: 'etapa', rotulo: 'Ir à etapa Pilares', etapa: 'pilares' }],
  });
  // todos os panos a definir viram uma só pendência
  const aDefinir = [...new Set(diags.filter((d) => d.codigo === 'DEFINIR_PANO').flatMap((d) => d.elementos))];
  if (aDefinir.length) {
    const faixa = faixaDeNomes(nomesDe(b, aDefinir));
    impeditivas.push({
      chave: 'DEFINIR_PANO', classe: 'impeditivo', gravidade: 'erro', grupo: 'lajes', codigo: 'DEFINIR_PANO', ids: aDefinir,
      titulo: `${plural(aDefinir.length, 'laje', 'lajes')} sem tipo definido (${faixa}).`,
      detalhe: 'O pano está marcado como “a definir (?)”. Escolha o tipo da laje (vigotas, alveolar, nervurada ou maciça) para o cálculo poder rodar.',
      acoes: [
        { tipo: 'tipoLajes', rotulo: `Definir tipo das lajes ${faixa}`, ids: aDefinir },
        { tipo: 'ir', rotulo: aDefinir.length === 1 ? 'Ir ao elemento' : 'Ir às lajes', elemento: 'laje', ids: aDefinir },
      ],
    });
  }
  diags.forEach((d, i) => {
    if (d.codigo === 'DEFINIR_PANO' || d.codigo === 'OBRA_SEM_PAVIMENTO' || d.severidade === 'info') return;
    const alvo = d.elementos.length ? tipoDoElemento(b, d.elementos[0]) : null;
    const grupo: GrupoPendencia = alvo ? GRUPO_DO_ALVO[alvo] : d.codigo.startsWith('FUND') ? 'fundacao' : 'outros';
    const acoes: AcaoPendencia[] = [];
    if (alvo) acoes.push({ tipo: 'ir', rotulo: d.elementos.length > 1 ? `Ir ${ROTULO_ALVO[alvo][1]}` : 'Ir ao elemento', elemento: alvo, ids: d.elementos });
    if (d.sugestao) acoes.push({ tipo: 'comando', rotulo: d.sugestao.texto, comando: d.sugestao.comando, params: d.sugestao.params });
    avisos.push({ chave: `${d.codigo}|${d.elementos.join(',')}|${i}`, classe: 'aviso', gravidade: d.severidade === 'erro' ? 'erro' : 'aviso', grupo, titulo: d.mensagem, codigo: d.codigo, ids: d.elementos, acoes });
  });
  const ordem = (a: Pendencia, z: Pendencia) => GRUPO_ORDEM.indexOf(a.grupo) - GRUPO_ORDEM.indexOf(z.grupo) || (a.gravidade === z.gravidade ? 0 : a.gravidade === 'erro' ? -1 : 1);
  impeditivas.sort(ordem);
  avisos.sort(ordem);
  return { impeditivas, avisos, podeCalcular: impeditivas.length === 0 };
}

// ---------------------------------------------------------------- depois de calcular

export type GrupoErro = 'obra' | 'pilar' | 'viga' | 'laje' | 'puncao' | 'fundacao' | 'pilarParede' | 'parede' | 'escada' | 'inclinada' | 'diagonal' | 'consolo';
export const GRUPO_ERRO_ROTULO: Record<GrupoErro, string> = { obra: 'Obra e análise', pilar: 'Pilares', viga: 'Vigas', laje: 'Lajes', puncao: 'Punção', fundacao: 'Fundação', pilarParede: 'Pilares-parede', parede: 'Paredes', escada: 'Escadas', inclinada: 'Vigas inclinadas', diagonal: 'Diagonais', consolo: 'Consolos' };
const ORDEM_ERRO: GrupoErro[] = ['obra', 'pilar', 'viga', 'laje', 'puncao', 'fundacao', 'pilarParede', 'parede', 'escada', 'inclinada', 'diagonal', 'consolo'];

export interface ErroDoCalculo {
  tipo: TipoRevisao;
  id?: string;
  nome: string;
  pavimento?: string;
  codigo: string;
  /** Texto claro do problema. */
  mensagem: string;
  sugestao?: string;
  /** Tem janela de resultados (dimensionamento) do elemento. */
  temJanela: boolean;
}
export interface GrupoErrosCalculo { grupo: GrupoErro; rotulo: string; total: number; pavimentos: { pavimento: string | null; itens: ErroDoCalculo[] }[] }
export interface ErrosDoCalculo { total: number; grupos: GrupoErrosCalculo[] }

const COM_JANELA = new Set<TipoRevisao>(['viga', 'pilar', 'laje', 'fundacao', 'pilarParede', 'parede']);

/** Erros de dimensionamento (nível erro da revisão) por tipo de elemento e pavimento; avisos ficam de fora. */
export function errosDoCalculo(itens: ItemRevisao[]): ErrosDoCalculo {
  const porGrupo = new Map<GrupoErro, ErroDoCalculo[]>();
  for (const i of itens) {
    if (i.nivel !== 'erro') continue;
    const g: GrupoErro = i.codigo.startsWith('PUNCAO') ? 'puncao' : i.codigo === 'ANALISE' ? 'obra' : i.tipo;
    const e: ErroDoCalculo = {
      tipo: i.tipo, ...(i.id ? { id: i.id } : {}), nome: i.nome, ...(i.pavimento ? { pavimento: i.pavimento } : {}), codigo: i.codigo,
      mensagem: i.codigo === 'ANALISE' ? `A análise não fechou: ${i.mensagem}` : i.mensagem,
      ...(i.sugestao ? { sugestao: i.sugestao } : {}), temJanela: COM_JANELA.has(i.tipo) && !!i.id,
    };
    (porGrupo.get(g) ?? porGrupo.set(g, []).get(g)!).push(e);
  }
  const grupos: GrupoErrosCalculo[] = ORDEM_ERRO.filter((g) => porGrupo.has(g)).map((g) => {
    const xs = porGrupo.get(g)!, pavs = new Map<string | null, ErroDoCalculo[]>();
    for (const x of xs) (pavs.get(x.pavimento ?? null) ?? pavs.set(x.pavimento ?? null, []).get(x.pavimento ?? null)!).push(x);
    return { grupo: g, rotulo: GRUPO_ERRO_ROTULO[g], total: xs.length, pavimentos: [...pavs].map(([pavimento, itens]) => ({ pavimento, itens })) };
  });
  return { total: grupos.reduce((n, g) => n + g.total, 0), grupos };
}

/** O que mostrar ao fim do cálculo: o painel de erros (há erro de análise, de dimensionamento ou elemento reprovado) ou o aviso de conclusão. */
export function resultadoDoCalculo(itens: ItemRevisao[], reprovados: number): 'erros' | 'ok' {
  return reprovados > 0 || itens.some((i) => i.nivel === 'erro') ? 'erros' : 'ok';
}
