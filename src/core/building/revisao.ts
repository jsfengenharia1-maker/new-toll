// Revisão de resultados (frente R1): erros e avisos por elemento com código do motivo, a partir das mensagens do
// dimensionamento e dos avisos da análise. Erro = o elemento não atende (vermelho na planta); aviso = atende, mas
// pede atenção (amarelo); informação (redistribuição aplicada, treliçada) fica só na linha do elemento.
import type { AnaliseEdificio } from './analitico';
import type { Dimensionamento } from './dimensionamento';
import type { BuildingModel } from './types';

export type NivelRevisao = 'erro' | 'aviso';
export type TipoRevisao = 'viga' | 'pilar' | 'laje' | 'obra';

export interface ItemRevisao {
  tipo: TipoRevisao;
  /** Id do elemento (ausente nos itens da obra). */
  id?: string;
  nome: string;
  /** Nome do pavimento (pilares: lance; lajes: pavimento); vigas valem para o grupo. */
  pavimento?: string;
  nivel: NivelRevisao;
  codigo: string;
  mensagem: string;
}

/** Códigos dos motivos, com nível e descrição curta (legenda da lista). */
export const CODIGOS_REVISAO: { codigo: string; nivel: NivelRevisao | 'info'; re: RegExp; descricao: string }[] = [
  { codigo: 'BIELA', nivel: 'erro', re: /^Biela comprimida/, descricao: 'Compressão diagonal (cortante e torção)' },
  { codigo: 'LARGURA', nivel: 'erro', re: /^Armadura inferior não cabe/, descricao: 'Armadura não cabe na largura' },
  { codigo: 'FLECHA', nivel: 'erro', re: /^Flecha total/, descricao: 'Flecha total acima do limite' },
  { codigo: 'FLECHA_Q', nivel: 'erro', re: /^Flecha das variáveis/, descricao: 'Flecha das cargas variáveis acima do limite' },
  { codigo: 'FISSURA', nivel: 'erro', re: /^Abertura de fissuras/, descricao: 'Abertura de fissuras acima do limite' },
  { codigo: 'ARM_BLOQ', nivel: 'erro', re: /^Armadura bloqueada (insuficiente|acima)/, descricao: 'Armadura bloqueada não atende' },
  { codigo: 'BLOQ_IGNORADO', nivel: 'aviso', re: /^Armadura bloqueada desconsiderada/, descricao: 'Bloqueio desconsiderado (vãos ou lances mudaram)' },
  { codigo: 'ARMADURA', nivel: 'erro', re: /^(Nenhuma armadura|Não atende com até 4)/, descricao: 'Seção insuficiente com a armadura máxima' },
  { codigo: 'ESBELTEZ', nivel: 'erro', re: /^λ > 200/, descricao: 'Esbeltez acima de 200' },
  { codigo: 'ESBELTEZ_90', nivel: 'aviso', re: /^λ > 90/, descricao: 'Esbeltez acima de 90 (método mais refinado)' },
  { codigo: 'ARM_DUPLA', nivel: 'aviso', re: /^Armadura dupla/, descricao: 'Armadura dupla (x limitado)' },
  { codigo: 'CA60', nivel: 'aviso', re: /^CA-60/, descricao: 'Bitola acima de φ10 em CA-60' },
  { codigo: 'TRACAO', nivel: 'aviso', re: /^Tração em/, descricao: 'Pilar tracionado' },
  { codigo: 'GAMA_N', nivel: 'aviso', re: /^γn/, descricao: 'Seção pequena (γn)' },
  { codigo: 'ARM_AUMENTADA', nivel: 'aviso', re: /^Armadura aumentada/, descricao: 'Armadura aumentada pela fissuração' },
  { codigo: 'TORCAO', nivel: 'aviso', re: /^Torção Td/, descricao: 'Torção: armadura longitudinal adicional' },
  { codigo: 'ESTRIBO_V', nivel: 'aviso', re: /^Estribos pelo cortante/, descricao: 'Estribo do pilar pelo cortante' },
  { codigo: 'REDISTRIB', nivel: 'info', re: /^Redistribuição/, descricao: 'Redistribuição aplicada' },
  { codigo: 'TRELICADA', nivel: 'info', re: /^Treliçada/, descricao: 'Conferir vigotas com o fabricante' },
  // avisos da análise (obra)
  { codigo: 'DESLOC', nivel: 'erro', re: /^Deslocamento lateral/, descricao: 'Deslocamento lateral acima do limite' },
  { codigo: 'GAMA_Z', nivel: 'erro', re: /^γz = .* acima do limite/, descricao: 'γz acima do limite' },
];

/** Código e nível de uma mensagem (sem regra conhecida: aviso genérico). */
export function classificar(msg: string): { codigo: string; nivel: NivelRevisao | 'info' } {
  const r = CODIGOS_REVISAO.find((c) => c.re.test(msg));
  return r ? { codigo: r.codigo, nivel: r.nivel } : { codigo: 'AVISO', nivel: 'aviso' };
}

/** Lista de erros e avisos da obra (erros primeiro) e o pior nível por elemento (`tipo|id`). */
export function revisarEdificio(b: BuildingModel, an: AnaliseEdificio | null, dim: Dimensionamento | null) {
  const itens: ItemRevisao[] = [];
  const add = (tipo: TipoRevisao, id: string | undefined, nome: string, pavimento: string | undefined, msgs: string[]) => {
    for (const m of msgs) { const c = classificar(m); if (c.nivel !== 'info') itens.push({ tipo, id, nome, pavimento, nivel: c.nivel, codigo: c.codigo, mensagem: m }); }
  };
  for (const a of an?.avisos ?? []) add('obra', undefined, b.obra?.nome || 'Obra', undefined, [a]);
  if (an?.erro) itens.push({ tipo: 'obra', nome: b.obra?.nome || 'Obra', nivel: 'erro', codigo: 'ANALISE', mensagem: an.erro });
  for (const v of dim?.vigas ?? []) add('viga', v.viga, v.nome, undefined, v.mensagens);
  for (const p of dim?.pilares ?? []) add('pilar', p.pilar, p.nome, p.pavimento, p.mensagens);
  for (const l of dim?.lajes ?? []) add('laje', l.laje, l.nome, l.pavimento, l.mensagens);
  // pilar reprovado pela utilização sem mensagem própria
  for (const p of dim?.pilares ?? []) if (p.status === 'fail' && !itens.some((x) => x.tipo === 'pilar' && x.id === p.pilar && x.pavimento === p.pavimento && x.nivel === 'erro'))
    itens.push({ tipo: 'pilar', id: p.pilar, nome: p.nome, pavimento: p.pavimento, nivel: 'erro', codigo: 'ARMADURA', mensagem: `Utilização ${p.util.toFixed(2).replace('.', ',')} > 1.` });
  itens.sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === 'erro' ? -1 : 1));
  const porElemento = new Map<string, NivelRevisao>();
  for (const i of itens) if (i.id) { const k = `${i.tipo}|${i.id}`; if (porElemento.get(k) !== 'erro') porElemento.set(k, i.nivel); }
  return { itens, porElemento, erros: itens.filter((x) => x.nivel === 'erro').length, avisos: itens.filter((x) => x.nivel === 'aviso').length };
}
