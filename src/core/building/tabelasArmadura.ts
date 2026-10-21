// Tabelas de armadura editáveis (frente R7a): o usuário controla quais bitolas, espaçamentos e tipologias o cálculo
// pode usar em vigas, estribos, pilares e lajes. As tabelas de fábrica são geradas por regra a partir das bitolas
// comerciais (NBR 7480) e dos limites da NBR 6118, reproduzindo a escolha anterior; só o que o usuário altera ou cria
// vai para o modelo (`BuildingModel.tabelas`). Comprimentos das tabelas em cm (como o usuário lê), bitolas em mm.
import { barArea, chooseBars, PHI_L, PHI_T, type BarChoice } from '../concrete';
import type { BuildingModel } from './types';

export type TipoTabela = 'vigas' | 'estribos' | 'pilares' | 'lajes';
export const TIPOS_TABELA: { v: TipoTabela; rotulo: string }[] = [
  { v: 'vigas', rotulo: 'Vigas (barras)' }, { v: 'estribos', rotulo: 'Estribos de vigas' }, { v: 'pilares', rotulo: 'Pilares' }, { v: 'lajes', rotulo: 'Lajes' },
];
export const ID_PADRAO = 'padrao';

/** Bitolas comerciais (mm) que cada tipo de tabela aceita. */
export const BITOLAS_TABELA: Record<TipoTabela, number[]> = {
  vigas: PHI_L,
  estribos: PHI_T,
  pilares: PHI_L.filter((p) => p >= 10 && p <= 25),
  lajes: [5, 6.3, 8, 10, 12.5, 16],
};
/** Espaçamentos (cm) oferecidos nas disposições dos pilares. */
export const ESPACAMENTOS_PILAR = [30, 25, 20, 15, 12, 10];
/** Número de ramos do estribo: 2 = simples, 4 = duplo, 6 = triplo. */
export const RAMOS_ESTRIBO = [2, 4, 6];
/** Limite "sem limite" das faixas (cm). */
export const SEM_LIMITE = 999;

export interface GrupoBarras { bitolas: number[]; nMin: number; camadas: number }
/** Faixa de seção das vigas: primeira linha com b ≤ bAte e h ≤ hAte (cm). */
export interface LinhaVigas { bAte: number; hAte: number; pos: GrupoBarras; neg: GrupoBarras; passante: number }
export interface TabelaVigas { id: string; nome: string; linhas: LinhaVigas[] }
/** Faixa de largura dos estribos: bitolas, espaçamento mínimo e máximo (cm; 0 = só a norma) e ramos permitidos. */
export interface LinhaEstribos { bAte: number; bitolas: number[]; sMin: number; sMax: number; ramos: number[] }
export interface TabelaEstribos { id: string; nome: string; linhas: LinhaEstribos[] }
/** Estribo do pilar por bitola longitudinal: φt e espaçamento máximo (cm; 0 = só a norma). */
export interface LinhaEstriboPilar { phiAte: number; phiT: number; sMax: number }
export interface TabelaPilares { id: string; nome: string; bitolas: number[]; espacamentos: number[]; estribos: LinhaEstriboPilar[] }
/** Faixa de espessura das lajes: bitolas, espaçamentos mínimo e máximo (cm; 0 = pela opção/NBR). */
export interface LinhaLajes { hAte: number; bitolas: number[]; sMin: number; sMax: number }
export interface TabelaLajes { id: string; nome: string; linhas: LinhaLajes[] }

export interface TabelasArmadura { vigas?: TabelaVigas[]; estribos?: TabelaEstribos[]; pilares?: TabelaPilares[]; lajes?: TabelaLajes[] }
export type Tabela = TabelaVigas | TabelaEstribos | TabelaPilares | TabelaLajes;
type TabelasPorTipo = { vigas: TabelaVigas[]; estribos: TabelaEstribos[]; pilares: TabelaPilares[]; lajes: TabelaLajes[] };

const grupo = (): GrupoBarras => ({ bitolas: [...PHI_L], nMin: 2, camadas: 3 });
const FAIXAS_B = [20, 30, SEM_LIMITE];
const nomeFaixa = (a: number, i: number) => (a >= SEM_LIMITE ? `Grupo ${i + 1} (demais larguras)` : `Grupo ${i + 1} (b ≤ ${a} cm)`);

/** Tabelas de fábrica (uma por tipo, id "padrao"): todas as bitolas, as faixas de largura e os limites que o cálculo já usava. */
export function tabelasPadrao(): TabelasPorTipo {
  return {
    vigas: [{ id: ID_PADRAO, nome: 'Padrão', linhas: FAIXAS_B.map((bAte) => ({ bAte, hAte: SEM_LIMITE, pos: grupo(), neg: grupo(), passante: 1 / 3 })) }],
    estribos: [{ id: ID_PADRAO, nome: 'Padrão', linhas: FAIXAS_B.map((bAte) => ({ bAte, bitolas: [...PHI_T], sMin: 10, sMax: 0, ramos: [2] })) }],
    pilares: [{ id: ID_PADRAO, nome: 'Padrão', bitolas: [...BITOLAS_TABELA.pilares], espacamentos: [...ESPACAMENTOS_PILAR], estribos: [] }],
    lajes: [{ id: ID_PADRAO, nome: 'Padrão', linhas: [{ hAte: SEM_LIMITE, bitolas: [...BITOLAS_TABELA.lajes], sMin: 0, sMax: 0 }] }],
  };
}
export const nomeFaixaViga = nomeFaixa;

let PADRAO: TabelasPorTipo | null = null;
/** Tabelas de fábrica compartilhadas (não alterar). */
export const padraoCompartilhado = (): TabelasPorTipo => (PADRAO ??= tabelasPadrao());

const copia = <T,>(t: T): T => JSON.parse(JSON.stringify(t)) as T;
/** Tabela de fábrica de um tipo (cópia editável). */
export const tabelaDeFabrica = <T extends TipoTabela>(tipo: T): TabelasPorTipo[T][number] => copia(padraoCompartilhado()[tipo][0]);

/** Tabelas de um tipo em uso: as de fábrica (com a "padrao" substituída se o usuário a alterou) e as criadas. */
export function tabelasDoTipo<T extends TipoTabela>(b: { tabelas?: TabelasArmadura }, tipo: T): TabelasPorTipo[T] {
  const fab = padraoCompartilhado()[tipo] as Tabela[], user = (b.tabelas?.[tipo] ?? []) as Tabela[];
  const out: Tabela[] = fab.map((f) => user.find((u) => u.id === f.id) ?? f);
  for (const u of user) if (!fab.some((f) => f.id === u.id)) out.push(u);
  return out as TabelasPorTipo[T];
}

/** Tabela por id (ausente ou inexistente: a "padrao" da obra). */
export function tabelaDe<T extends TipoTabela>(b: { tabelas?: TabelasArmadura }, tipo: T, id?: string): TabelasPorTipo[T][number] {
  const ts = tabelasDoTipo(b, tipo) as Tabela[];
  return (ts.find((t) => t.id === id) ?? ts.find((t) => t.id === ID_PADRAO)!) as TabelasPorTipo[T][number];
}

/** Tabelas alteradas ou criadas pelo usuário (memorial e interface). */
export function tabelasAlteradas(b: { tabelas?: TabelasArmadura }): { tipo: TipoTabela; tabela: Tabela; criada: boolean }[] {
  const out: { tipo: TipoTabela; tabela: Tabela; criada: boolean }[] = [];
  for (const { v } of TIPOS_TABELA) for (const t of (b.tabelas?.[v] ?? []) as Tabela[]) out.push({ tipo: v, tabela: t, criada: t.id !== ID_PADRAO });
  return out.sort((a, z) => TIPOS_TABELA.findIndex((x) => x.v === a.tipo) - TIPOS_TABELA.findIndex((x) => x.v === z.tipo) || Number(a.criada) - Number(z.criada));
}

export const tabelaIgual = (a: unknown, z: unknown) => JSON.stringify(a) === JSON.stringify(z);

/** O pilar tem uma tabela com bitolas ou espaçamentos diferentes dos de fábrica? (a busca própria vira reserva) */
export const pilarRestrito = (t: TabelaPilares) => !tabelaIgual(t.bitolas, BITOLAS_TABELA.pilares) || !tabelaIgual(t.espacamentos, ESPACAMENTOS_PILAR);

// ---------------------------------------------------------------- validação

const subconjunto = (xs: number[], ref: number[]) => xs.every((x) => ref.includes(x));
const ordenadas = (xs: number[], ref: number[]) => ref.filter((r) => xs.includes(r));

/** Erros da tabela (lista vazia = válida). */
export function validarTabela(tipo: TipoTabela, t: Tabela): string[] {
  const e: string[] = [];
  if (!t.id || /\s/.test(t.id)) e.push('id inválido');
  if (!t.nome?.trim()) e.push('nome vazio');
  const ref = BITOLAS_TABELA[tipo];
  const bit = (xs: number[], onde: string) => {
    if (!xs.length) e.push(`${onde}: nenhuma bitola`);
    else if (!subconjunto(xs, ref)) e.push(`${onde}: bitolas fora de ${ref.join(', ')}`);
  };
  if (tipo === 'vigas') {
    const l = (t as TabelaVigas).linhas;
    if (!l?.length) e.push('sem linhas');
    l?.forEach((x, i) => {
      if (!(x.bAte > 0) || !(x.hAte > 0)) e.push(`linha ${i + 1}: limites de seção inválidos`);
      for (const k of ['pos', 'neg'] as const) {
        bit(x[k].bitolas, `linha ${i + 1} ${k === 'pos' ? 'positivos' : 'negativos'}`);
        if (!(x[k].nMin >= 1 && x[k].nMin <= 10)) e.push(`linha ${i + 1}: nº mínimo de barras entre 1 e 10`);
        if (!(x[k].camadas >= 1 && x[k].camadas <= 4)) e.push(`linha ${i + 1}: camadas entre 1 e 4`);
      }
      if (!(x.passante > 0 && x.passante <= 1)) e.push(`linha ${i + 1}: fração passante entre 0 e 1`);
    });
  } else if (tipo === 'estribos') {
    const l = (t as TabelaEstribos).linhas;
    if (!l?.length) e.push('sem linhas');
    l?.forEach((x, i) => {
      if (!(x.bAte > 0)) e.push(`linha ${i + 1}: limite de largura inválido`);
      bit(x.bitolas, `linha ${i + 1}`);
      if (!(x.sMin >= 3 && x.sMin <= 30)) e.push(`linha ${i + 1}: espaçamento mínimo entre 3 e 30 cm`);
      if (x.sMax !== 0 && !(x.sMax >= x.sMin && x.sMax <= 60)) e.push(`linha ${i + 1}: espaçamento máximo 0 (norma) ou entre o mínimo e 60 cm`);
      if (!x.ramos.length || !subconjunto(x.ramos, RAMOS_ESTRIBO)) e.push(`linha ${i + 1}: ramos 2, 4 ou 6`);
    });
  } else if (tipo === 'pilares') {
    const p = t as TabelaPilares;
    bit(p.bitolas, 'bitolas');
    if (!p.espacamentos.length || !subconjunto(p.espacamentos, ESPACAMENTOS_PILAR)) e.push(`espaçamentos dentro de ${ESPACAMENTOS_PILAR.join(', ')} cm`);
    p.estribos.forEach((x, i) => {
      if (!BITOLAS_TABELA.estribos.includes(x.phiT)) e.push(`estribo ${i + 1}: φt fora de ${PHI_T.join(', ')}`);
      if (!(x.phiAte > 0)) e.push(`estribo ${i + 1}: limite de bitola inválido`);
      if (x.sMax !== 0 && !(x.sMax >= 5 && x.sMax <= 30)) e.push(`estribo ${i + 1}: espaçamento máximo 0 (norma) ou entre 5 e 30 cm`);
    });
  } else {
    const l = (t as TabelaLajes).linhas;
    if (!l?.length) e.push('sem linhas');
    l?.forEach((x, i) => {
      if (!(x.hAte > 0)) e.push(`linha ${i + 1}: limite de espessura inválido`);
      bit(x.bitolas, `linha ${i + 1}`);
      if (x.sMin !== 0 && !(x.sMin >= 5 && x.sMin <= 20)) e.push(`linha ${i + 1}: espaçamento mínimo 0 (opção) ou entre 5 e 20 cm`);
      if (x.sMax !== 0 && !(x.sMax >= 5 && x.sMax <= 33)) e.push(`linha ${i + 1}: espaçamento máximo 0 (norma) ou entre 5 e 33 cm`);
      if (x.sMin && x.sMax && x.sMax < x.sMin) e.push(`linha ${i + 1}: máximo menor que o mínimo`);
    });
  }
  return e;
}

/** Normaliza uma tabela (ordena as bitolas pela lista comercial) para guardar. */
export function normalizarTabela(tipo: TipoTabela, t: Tabela): Tabela {
  const c = copia(t), ref = BITOLAS_TABELA[tipo];
  if (tipo === 'vigas') for (const l of (c as TabelaVigas).linhas) { l.pos.bitolas = ordenadas(l.pos.bitolas, ref); l.neg.bitolas = ordenadas(l.neg.bitolas, ref); }
  if (tipo === 'estribos' || tipo === 'lajes') for (const l of (c as TabelaEstribos | TabelaLajes).linhas) l.bitolas = ordenadas(l.bitolas, ref);
  if (tipo === 'pilares') { const p = c as TabelaPilares; p.bitolas = ordenadas(p.bitolas, ref); p.espacamentos = ESPACAMENTOS_PILAR.filter((x) => p.espacamentos.includes(x)); p.estribos.sort((a, z) => a.phiAte - z.phiAte); }
  if (tipo === 'vigas') (c as TabelaVigas).linhas.sort((a, z) => a.bAte - z.bAte || a.hAte - z.hAte);
  if (tipo === 'estribos') (c as TabelaEstribos).linhas.sort((a, z) => a.bAte - z.bAte);
  if (tipo === 'lajes') (c as TabelaLajes).linhas.sort((a, z) => a.hAte - z.hAte);
  return c;
}

// ---------------------------------------------------------------- escolha pelas tabelas

const NA = 1e-9;
/** Linha da tabela de vigas para a seção (m): a primeira que contém b e h; sem nenhuma, a última. */
export function linhaVigas(t: TabelaVigas, b: number, h: number): LinhaVigas {
  return t.linhas.find((l) => b * 100 <= l.bAte + NA && h * 100 <= l.hAte + NA) ?? t.linhas.at(-1)!;
}
export function linhaEstribos(t: TabelaEstribos, b: number): LinhaEstribos {
  return t.linhas.find((l) => b * 100 <= l.bAte + NA) ?? t.linhas.at(-1)!;
}
export function linhaLajes(t: TabelaLajes, h: number): LinhaLajes {
  return t.linhas.find((l) => h * 100 <= l.hAte + NA) ?? t.linhas.at(-1)!;
}
/** Fração das barras inferiores que passa de apoio a apoio, da tabela da viga. */
export function fracaoPassante(b: BuildingModel, v: { secao: { b: number; h: number }; tabela?: string }): number {
  return linhaVigas(tabelaDe(b, 'vigas', v.tabela), v.secao.b, v.secao.h).passante;
}

/**
 * Barras longitudinais de uma face pela tabela: a menor solução (camadas, depois área) entre as bitolas da linha.
 * Sem solução na tabela mas com solução livre, devolve a mesma quantidade em φ25 com `fora` (erro FORA_TABELA).
 */
export function escolherBarrasViga(t: TabelaVigas, face: 'pos' | 'neg', As: number, bw: number, h: number, cover: number, phiT: number, dmax: number): { barras: BarChoice | null; fora: boolean } {
  const g = linhaVigas(t, bw, h)[face];
  const dentro = chooseBars(As, bw, cover, phiT, dmax, { phis: g.bitolas, nMin: g.nMin, camadas: g.camadas });
  if (dentro || As <= 0) return { barras: dentro, fora: false };
  if (!chooseBars(As, bw, cover, phiT, dmax)) return { barras: null, fora: false }; // não cabe na largura de nenhum jeito
  const forcada = chooseBars(As, bw, cover, phiT, dmax, { phis: [25], nMin: g.nMin, camadas: 3 });
  return { barras: forcada, fora: !!forcada };
}

export interface EstriboEscolhido { phi: number; s: number; legs: number; fora: boolean }
/**
 * Estribo pela tabela: para cada número de ramos permitido (do menor ao maior), a menor bitola cujo espaçamento (m,
 * arredondado ao cm, limitado por `smax` e pelo máximo da tabela) fica a partir do mínimo da tabela. Sem solução: a
 * maior bitola e o maior número de ramos no espaçamento calculado, `fora` se ficar abaixo do mínimo.
 */
export function escolherEstribo(t: TabelaEstribos, bw: number, aswS: number, smax: number, phiMin = 0): EstriboEscolhido | null {
  const l = linhaEstribos(t, bw), sMin = l.sMin / 100, cap = l.sMax > 0 ? Math.min(smax, l.sMax / 100) : smax;
  const ramos = [...l.ramos].sort((a, z) => a - z), phis = l.bitolas.filter((p) => p >= phiMin - NA);
  if (!phis.length) return null;
  for (const legs of ramos) for (const phi of phis) {
    const s = (legs * barArea(phi)) / aswS, sAdopt = Math.floor(Math.min(s, cap) * 100) / 100;
    if (sAdopt >= sMin - NA) return { phi, s: sAdopt, legs, fora: false };
  }
  const legs = ramos.at(-1)!, phi = phis.at(-1)!, s = (legs * barArea(phi)) / aswS, sAdopt = Math.floor(Math.min(s, cap) * 100) / 100;
  return { phi, s: sAdopt, legs, fora: sAdopt < sMin - NA };
}

/** Bitolas (mm) e espaçamentos (m) das disposições do pilar, do mais esparso ao mais denso. */
export const espacamentosPilar = (t: TabelaPilares) => [...t.espacamentos].sort((a, z) => z - a).map((x) => x / 100);
export const bitolasPilar = (t: TabelaPilares) => [...t.bitolas].sort((a, z) => a - z);
/** Estribo do pilar definido pela tabela para a bitola longitudinal (mm), se houver linha; senão, só a norma. */
export function estriboDaTabelaPilar(t: TabelaPilares, phiLong: number): LinhaEstriboPilar | null {
  return [...t.estribos].sort((a, z) => a.phiAte - z.phiAte).find((x) => phiLong <= x.phiAte + NA) ?? null;
}

// ---------------------------------------------------------------- texto (interface e memorial)

const f1 = (x: number) => String(+x.toFixed(2)).replace('.', ',');
export const bitolasTxt = (xs: number[]) => xs.map(f1).join(' · ');
const lim = (x: number) => (x >= SEM_LIMITE ? '∞' : String(x));

/** Linhas de texto de uma tabela, para o memorial. */
export function descreverTabela(tipo: TipoTabela, t: Tabela): string[] {
  if (tipo === 'vigas') return (t as TabelaVigas).linhas.map((l, i) => `Grupo ${i + 1}: b ≤ ${lim(l.bAte)} cm, h ≤ ${lim(l.hAte)} cm — positivos φ ${bitolasTxt(l.pos.bitolas)} (≥ ${l.pos.nMin} barras, ${l.pos.camadas} camadas); negativos φ ${bitolasTxt(l.neg.bitolas)} (≥ ${l.neg.nMin}, ${l.neg.camadas} camadas); passante ≥ ${f1(l.passante * 100)} %`);
  if (tipo === 'estribos') return (t as TabelaEstribos).linhas.map((l, i) => `Grupo ${i + 1}: b ≤ ${lim(l.bAte)} cm — φ ${bitolasTxt(l.bitolas)}, s ≥ ${l.sMin} cm${l.sMax ? `, s ≤ ${l.sMax} cm` : ''}, ramos ${l.ramos.join('/')}`);
  if (tipo === 'pilares') { const p = t as TabelaPilares; return [`φ ${bitolasTxt(p.bitolas)}; espaçamentos ${p.espacamentos.join(' · ')} cm`, ...p.estribos.map((x) => `Estribo φt ${f1(x.phiT)} para φ ≤ ${f1(x.phiAte)}${x.sMax ? `, s ≤ ${x.sMax} cm` : ''}`)]; }
  return (t as TabelaLajes).linhas.map((l, i) => `Faixa ${i + 1}: h ≤ ${lim(l.hAte)} cm — φ ${bitolasTxt(l.bitolas)}${l.sMin ? `, s ≥ ${l.sMin} cm` : ''}${l.sMax ? `, s ≤ ${l.sMax} cm` : ''}`);
}

/** Texto de "alterada em relação à de fábrica" para a lista do memorial e da interface. */
export const rotuloTabela = (x: { tipo: TipoTabela; tabela: Tabela; criada: boolean }) =>
  `${TIPOS_TABELA.find((t) => t.v === x.tipo)!.rotulo}: ${x.tabela.nome}${x.criada ? ' (criada)' : ' (padrão alterada)'}`;

// ---------------------------------------------------------------- importar e exportar

const FORMATO_ARQUIVO = 'statikos-tabelas-armadura';

/** Arquivo JSON com as tabelas indicadas (ou todas as alteradas e criadas), para levar a outra obra. */
export function exportarTabelas(b: { tabelas?: TabelasArmadura }, itens?: { tipo: TipoTabela; tabela: Tabela }[]): string {
  const lista = (itens ?? tabelasAlteradas(b)).map((x) => ({ tipo: x.tipo, tabela: x.tabela }));
  return JSON.stringify({ formato: FORMATO_ARQUIVO, versao: 1, tabelas: lista }, null, 2);
}

/** Lê um arquivo de tabelas: as válidas e os erros (uma mensagem por tabela recusada). */
export function lerArquivoTabelas(texto: string): { itens: { tipo: TipoTabela; tabela: Tabela }[]; erros: string[] } {
  let j: unknown;
  try { j = JSON.parse(texto); } catch { return { itens: [], erros: ['Arquivo não é um JSON válido.'] }; }
  const o = j as { formato?: string; tabelas?: { tipo?: string; tabela?: Tabela }[] };
  if (!o || o.formato !== FORMATO_ARQUIVO || !Array.isArray(o.tabelas)) return { itens: [], erros: ['Arquivo não é de tabelas de armadura do Statikos.'] };
  const itens: { tipo: TipoTabela; tabela: Tabela }[] = [], erros: string[] = [];
  for (const [i, x] of o.tabelas.entries()) {
    const tipo = TIPOS_TABELA.find((t) => t.v === x?.tipo)?.v;
    if (!tipo || !x.tabela || typeof x.tabela !== 'object') { erros.push(`Item ${i + 1}: tipo ou tabela ausente.`); continue; }
    const e = validarTabela(tipo, x.tabela);
    if (e.length) erros.push(`Item ${i + 1} (${x.tabela.nome ?? x.tabela.id ?? '?'}): ${e.join('; ')}.`);
    else itens.push({ tipo, tabela: normalizarTabela(tipo, x.tabela) });
  }
  return { itens, erros };
}
