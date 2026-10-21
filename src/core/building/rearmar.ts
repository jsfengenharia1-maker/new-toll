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
import type { BuildingModel, Pilar, SecaoPilar, Viga } from './types';

export interface ElementoAlterado { tipo: 'viga' | 'pilar' | 'laje'; id: string; nome: string; motivo: string }

/** O que foi feito no rearme: vai para o memorial ("elementos rearmados com os esforços da revisão n"). */
export interface InfoRearme {
  modo: 'todos' | 'alterados';
  /** `Sessao.revCalculo` da análise cujos esforços foram usados. */
  esforcosRev: number;
  /** Os esforços são de uma estrutura com seções diferentes das atuais? */
  antigos: boolean;
  /** Elementos refeitos (modo "alterados"; em "todos", os que mudaram desde o último dimensionamento). */
  refeitos: ElementoAlterado[];
  /** Elementos que guardaram o resultado anterior (só no modo "alterados"). */
  mantidos: number;
  /** Motivo de todos terem entrado no modo "alterados" (mudança global), quando for o caso. */
  global?: string;
  /** Variação de inércia desde a análise, dos elementos acima do limite. */
  variacoes: { tipo: 'viga' | 'pilar'; id: string; nome: string; variacao: number }[];
}

const iguais = (a: unknown, z: unknown) => a === z || JSON.stringify(a) === JSON.stringify(z);

/** Campos do modelo que valem para a obra toda: se mudaram, todos os elementos precisam ser refeitos. */
const GLOBAIS = ['opcoes', 'perfilOpcoes', 'norma', 'tabelas', 'tramos', 'zonasLaje', 'linhasDobra', 'casos', 'compat', 'estados', 'situacoes', 'empuxos', 'agrupamentos'] as const;

/** Elementos cuja entrada mudou entre dois modelos, e os campos globais que mudaram. */
export function elementosAlterados(antes: BuildingModel, agora: BuildingModel) {
  const out: ElementoAlterado[] = [];
  const motivoViga = (a: Viga, z: Viga) => (!iguais(a.secao, z.secao) ? 'seção modificada' : !iguais(a.armadura, z.armadura) ? (z.armadura ? 'armadura editada' : 'armadura desbloqueada') : !iguais(a.detalhe, z.detalhe) ? 'detalhe editado' : a.tabela !== z.tabela || a.tabelaEstribo !== z.tabelaEstribo ? 'tabela' : a.cobrimento !== z.cobrimento ? 'cobrimento' : 'dados da viga');
  const A = new Map(antes.vigas.map((v) => [v.id, v]));
  for (const v of agora.vigas) { const a = A.get(v.id); if (!a) out.push({ tipo: 'viga', id: v.id, nome: v.nome, motivo: 'nova' }); else if (!iguais(a, v)) out.push({ tipo: 'viga', id: v.id, nome: v.nome, motivo: motivoViga(a, v) }); }
  const P = new Map(antes.pilares.map((p) => [p.id, p]));
  for (const p of agora.pilares) {
    const a = P.get(p.id);
    if (!a) out.push({ tipo: 'pilar', id: p.id, nome: p.nome, motivo: 'novo' });
    else if (!iguais(a, p)) out.push({ tipo: 'pilar', id: p.id, nome: p.nome, motivo: !iguais(a.secao, p.secao) || !iguais(a.secoes, p.secoes) ? 'seção modificada' : !iguais(a.armaduras, p.armaduras) ? (p.armaduras?.length ? 'armadura editada' : 'armadura desbloqueada') : !iguais(a.detalhe, p.detalhe) ? 'detalhe editado' : 'dados do pilar' });
  }
  const L = new Map(antes.lajes.map((l) => [l.id, l]));
  for (const l of agora.lajes) { const a = L.get(l.id); if (!a) out.push({ tipo: 'laje', id: l.id, nome: l.nome, motivo: 'nova' }); else if (!iguais(a, l)) out.push({ tipo: 'laje', id: l.id, nome: l.nome, motivo: 'dados da laje' }); }
  const globais = GLOBAIS.filter((k) => !iguais(antes[k], agora[k]));
  return { elementos: out, globais: globais as string[] };
}

/** A estrutura analisada e a atual têm os mesmos elementos? (rearmar com esforços antigos exige isso). */
export function mesmosElementos(analise: BuildingModel, agora: BuildingModel): string | null {
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort().join('|');
  for (const [rot, k] of [['vigas', 'vigas'], ['pilares', 'pilares'], ['lajes', 'lajes'], ['pavimentos', 'pavimentos']] as const)
    if (ids(analise[k]) !== ids(agora[k])) return `os ${rot} mudaram depois da análise`;
  return null;
}

const inercia = (s: SecaoPilar) => (s.tipo === 'circ' ? Math.PI * s.d ** 4 / 64 : Math.min(s.b * s.h ** 3, s.h * s.b ** 3) / 12);
const secaoPilar = (p: Pilar, pav: string) => p.secoes?.find((x) => x.pavimento === pav)?.secao ?? p.secao;

/** Variação relativa da inércia (b·h³/12) de cada viga e pilar entre o modelo analisado e o atual (só os que variaram). */
export function variacoesRigidez(analise: BuildingModel, agora: BuildingModel) {
  const out: InfoRearme['variacoes'] = [];
  const A = new Map(analise.vigas.map((v) => [v.id, v]));
  for (const v of agora.vigas) {
    const a = A.get(v.id);
    if (!a) continue;
    const I0 = a.secao.b * a.secao.h ** 3, I1 = v.secao.b * v.secao.h ** 3;
    if (Math.abs(I1 / I0 - 1) > 1e-9) out.push({ tipo: 'viga', id: v.id, nome: v.nome, variacao: I1 / I0 - 1 });
  }
  const P = new Map(analise.pilares.map((p) => [p.id, p]));
  for (const p of agora.pilares) {
    const a = P.get(p.id);
    if (!a) continue;
    const pavs = new Set(['', ...(p.secoes ?? []).map((x) => x.pavimento), ...(a.secoes ?? []).map((x) => x.pavimento)]);
    let pior = 0;
    for (const pav of pavs) { const r = inercia(secaoPilar(p, pav)) / inercia(secaoPilar(a, pav)) - 1; if (Math.abs(r) > Math.abs(pior)) pior = r; }
    if (Math.abs(pior) > 1e-9) out.push({ tipo: 'pilar', id: p.id, nome: p.nome, variacao: pior });
  }
  return out;
}

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
