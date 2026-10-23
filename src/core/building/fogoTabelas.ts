// Tabelas do método tabular da NBR 15200 (frente N2g) e TRRF por ocupação e altura (NBR 14432 / IT 06 dos bombeiros).
// Núcleo puro. Todo valor tem a fonte registrada ao lado; o que não foi verificado fica fora (não inventado).
//
// FONTES VERIFICADAS (texto lido em 22/10/2026):
//  [A] ABNT NBR 15200:2004, seção 7.2, tabelas 4 a 12 (texto da norma, cópia do Sinaprocim): TRRF de 30 a 120 min.
//  [B] Monografia da UFU (Verificação da segurança estrutural de pilares em situação de incêndio) que reproduz a
//      NBR 15200:2012: equações 3.5 a 3.18 do método analítico dos pilares e a tabela de pilares com uma face exposta
//      (TRRF 30 a 180 min).
//  [C] Trabalho do CONTECC 2017 (lajes nervuradas): reproduz as tabelas de nervuradas da NBR 15200:2012, idênticas às
//      tabelas 6 e 7 de [A] de 30 a 120 min.
//  [D] IT 06 do CBMMG (2005), Tabela 5 (TRRF por ocupação/uso e altura), conferida nas linhas A a D com a IT 08 (2018) dos
//      bombeiros do RS para h ≤ 30 m. As ITs estaduais prevalecem sobre a NBR 14432: a tabela serve só de sugestão.
// NÃO TRANSCRITO (sem fonte aberta verificada): tabelas da edição de 2012 de lajes maciças e vigas (a [A] é a edição de
// 2004; a 2012 acrescenta 180 min e pode alterar valores), tabelas gerais dos pilares da 2012 (nove tabelas por ω, e e
// νfi; só existem como imagem na fonte [B]), pilares-parede e tirantes. Tudo "a confirmar" em `premissas.ts`.

import { tabelaNorma, type FonteNormas, type LinhaNorma } from '../normas';

/** TRRF tabelados (min) nas tabelas da NBR 15200:2004. */
export const TRRF_TABELADOS = [30, 60, 90, 120] as const;
export type TrrfTabelado = (typeof TRRF_TABELADOS)[number];

/** Par bmín/c1 (mm). */
export type ParBC = readonly [b: number, c1: number];

// ---------------- lajes ----------------

export interface TabelaLajeApoiada { h: readonly number[]; c1: { duas15: readonly number[]; duas20: readonly number[]; uma: readonly number[] } }
/** Tabela 4 [A]: lajes apoiadas em vigas. h (mm) é a espessura mínima para a função corta-fogo; c1 (mm) por tipo de armação (duas direções ly/lx ≤ 1,5; 1,5 < ly/lx ≤ 2; uma direção). */
export type TabelaLajeLisa = { h: readonly number[]; c1: readonly number[] };
/** Tabelas 6 e 7 [A][C]: nervuras (combinações bmín/c1, mm) e capa (h/c1, mm) das lajes nervuradas. */
export interface TabelaNervurada { nervuras: readonly (readonly ParBC[])[]; capa: readonly ParBC[] }
/** Tabelas 8 e 9 [A]: combinações bmín/c1 (mm) por TRRF e largura mínima da alma bw (mm). */
export interface TabelaViga { combinacoes: readonly (readonly ParBC[])[]; bw: readonly number[] }
export interface TabelaPilar2004 { muFi: readonly number[]; porTrrf: readonly (readonly ParBC[])[] }

export interface TabelasFogo {
  LAJE_APOIADA: TabelaLajeApoiada; LAJE_LISA: TabelaLajeLisa; NERVURADA_BIAPOIADA: TabelaNervurada; NERVURADA_CONTINUA: TabelaNervurada;
  VIGA_BIAPOIADA: TabelaViga; VIGA_CONTINUA: TabelaViga; PILAR_TABELA_2004: TabelaPilar2004;
  PILAR_UMA_FACE: readonly { trrf: number; par: ParBC }[];
  EFICIENCIA_REVESTIMENTO: { cal: number; cimento: number }; EFICIENCIA_PROTETOR_2004: number;
}

const num = (l: LinhaNorma, k: string) => l[k] as number;
const pares = (l: LinhaNorma, k: string): ParBC[] => { const v = l[k] as number[]; const o: ParBC[] = []; for (let i = 0; i + 1 < v.length; i += 2) o.push([v[i], v[i + 1]]); return o; };
const col = (rows: LinhaNorma[], k: string) => rows.map((l) => num(l, k));
const ord = (rows: LinhaNorma[]) => [...rows].sort((a, z) => num(a, 'trrf') - num(z, 'trrf'));

const CACHE = new WeakMap<LinhaNorma[], unknown>();
const memo = <T,>(rows: LinhaNorma[], f: (r: LinhaNorma[]) => T): T => { if (!CACHE.has(rows)) CACHE.set(rows, f(rows)); return CACHE.get(rows) as T; };

/** Tabelas do método tabular em uso (versão do usuário ou de fábrica, N3), na forma que `fogo.ts` consome. */
export function tabelasFogo(b?: FonteNormas): TabelasFogo {
  const ner = (id: string): TabelaNervurada => memo(tabelaNorma(b, id), (r0) => { const r = ord(r0); return { nervuras: r.map((l) => pares(l, 'pares')), capa: r.map((l) => [num(l, 'capaH'), num(l, 'capaC1')] as ParBC) }; });
  const vig = (id: string): TabelaViga => memo(tabelaNorma(b, id), (r0) => { const r = ord(r0); return { combinacoes: r.map((l) => pares(l, 'pares')), bw: col(r, 'bw') }; });
  const rev = (m: string) => (tabelaNorma(b, 'nbr15200.revestimento').find((l) => l.material === m)?.eficiencia as number);
  return {
    LAJE_APOIADA: memo(tabelaNorma(b, 'nbr15200.laje-apoiada'), (r0) => { const r = ord(r0); return { h: col(r, 'h'), c1: { duas15: col(r, 'duas15'), duas20: col(r, 'duas20'), uma: col(r, 'uma') } }; }),
    LAJE_LISA: memo(tabelaNorma(b, 'nbr15200.laje-lisa'), (r0) => { const r = ord(r0); return { h: col(r, 'h'), c1: col(r, 'c1') }; }),
    NERVURADA_BIAPOIADA: ner('nbr15200.nervurada-biapoiada'), NERVURADA_CONTINUA: ner('nbr15200.nervurada-continua'),
    VIGA_BIAPOIADA: vig('nbr15200.viga-biapoiada'), VIGA_CONTINUA: vig('nbr15200.viga-continua'),
    PILAR_TABELA_2004: memo(tabelaNorma(b, 'nbr15200.pilar-2004'), (r0) => { const r = ord(r0); return { muFi: [0.2, 0.5, 0.7], porTrrf: r.map((l) => [pares(l, 'mu02')[0], pares(l, 'mu05')[0], pares(l, 'mu07')[0]]) }; }),
    PILAR_UMA_FACE: memo(tabelaNorma(b, 'nbr15200.pilar-uma-face'), (r0) => ord(r0).map((l) => ({ trrf: num(l, 'trrf'), par: [num(l, 'b'), num(l, 'c1')] as ParBC }))),
    EFICIENCIA_REVESTIMENTO: { cal: rev('cal'), cimento: rev('cimento') }, EFICIENCIA_PROTETOR_2004: rev('protetor'),
  };
}

const F0 = tabelasFogo();
export const LAJE_APOIADA = F0.LAJE_APOIADA;
export const LAJE_LISA = F0.LAJE_LISA;
export const NERVURADA_BIAPOIADA = F0.NERVURADA_BIAPOIADA;
export const NERVURADA_CONTINUA = F0.NERVURADA_CONTINUA;
export const VIGA_BIAPOIADA = F0.VIGA_BIAPOIADA;
export const VIGA_CONTINUA = F0.VIGA_CONTINUA;
export const PILAR_TABELA_2004 = F0.PILAR_TABELA_2004;
export const PILAR_UMA_FACE = F0.PILAR_UMA_FACE;

// ---------------- revestimento ----------------

/** Eficiência relativa ao concreto dos revestimentos aderentes: [A] item 7.2 d) e [B] (2012). */
export const EFICIENCIA_REVESTIMENTO = F0.EFICIENCIA_REVESTIMENTO;
/**
 * Revestimento protetor (gesso, vermiculita, fibras): 250 % na edição de 2004 [A]; a de 2012 exige eficiência e
 * aderência demonstradas em ensaio [B]. O padrão de 2,5 é o da 2004 e deve ser confirmado (ensaio) pelo usuário.
 */
export const EFICIENCIA_PROTETOR_2004 = F0.EFICIENCIA_PROTETOR_2004;

// ---------------- TRRF por ocupação e altura ----------------

/** Colunas da tabela de TRRF: subsolo > 10 m (S2), subsolo ≤ 10 m (S1) e as classes de altura P1 a P5 [D]. */
export const CLASSES_TRRF = ['S2', 'S1', 'P1', 'P2', 'P3', 'P4', 'P5'] as const;
export type ClasseTrrf = (typeof CLASSES_TRRF)[number];

/** Classe de altura da edificação (m acima do solo): P1 ≤ 6, P2 ≤ 12, P3 ≤ 23, P4 ≤ 30, P5 > 30 [D]. */
export function classeDeAltura(h: number): Exclude<ClasseTrrf, 'S1' | 'S2'> {
  return h <= 6 ? 'P1' : h <= 12 ? 'P2' : h <= 23 ? 'P3' : h <= 30 ? 'P4' : 'P5';
}

interface LinhaTrrf { divisoes: string[]; grupo: string; ocupacao: string; /** S2, S1, P1…P5 (null = consultar o corpo técnico). */ v: (number | null)[] }
/**
 * Tabela 5 da IT 06 do CBMMG (2005) [D] (biblioteca de normas, `nbr14432.trrf-ocupacao`), valores sem as reduções entre
 * parênteses (subsolos pequenos e edificações com pavimentos de até 750 m² compartimentados: a favor da segurança).
 * Divisões F-9 e F-11, L e M: consultar o corpo técnico. Acima de 54 m a fonte manda consultar o corpo técnico: a função
 * devolve a classe P5 com aviso.
 */
const linhasTrrf = (b?: FonteNormas): LinhaTrrf[] => memo(tabelaNorma(b, 'nbr14432.trrf-ocupacao'), (rows) => rows.map((l) => ({
  divisoes: (l.divisoes as string).split(',').map((d) => d.trim()).filter(Boolean), grupo: l.grupo as string, ocupacao: l.ocupacao as string, v: CLASSES_TRRF.map((c) => l[c] as number | null),
})));

/** Divisões de ocupação com TRRF tabelado (rótulo para a interface). */
export const divisoesOcupacao = (b?: FonteNormas): { divisao: string; grupo: string; ocupacao: string }[] =>
  linhasTrrf(b).flatMap((l) => l.divisoes.map((d) => ({ divisao: d, grupo: l.grupo, ocupacao: l.ocupacao })));
export const DIVISOES_OCUPACAO = divisoesOcupacao();

export interface SugestaoTrrf { trrf: number | null; classe: ClasseTrrf; ocupacao: string; fonte: string; aviso?: string }

/**
 * TRRF sugerido (min) para a divisão de ocupação e a altura h (m acima do solo; negativo = profundidade do subsolo:
 * S1 até 10 m, S2 abaixo). `null` = a tabela manda consultar o corpo técnico dos bombeiros; divisão desconhecida = `null`.
 */
export function trrfSugerido(divisao: string, h: number, norm?: FonteNormas): SugestaoTrrf | null {
  const chave = divisao.trim().toUpperCase().replace(/\s+/g, ' ').replace(' ABERTA', ' aberta');
  const linha = linhasTrrf(norm).find((l) => l.divisoes.some((d) => d.toUpperCase().replace(' ABERTA', ' aberta') === chave));
  if (!linha) return null;
  const classe: ClasseTrrf = h < 0 ? (-h > 10 ? 'S2' : 'S1') : classeDeAltura(h);
  const trrf = linha.v[CLASSES_TRRF.indexOf(classe)];
  const aviso = h > 54 ? 'Acima de 54 m a IT 06 manda consultar o corpo técnico dos bombeiros: valor da classe P5 apenas como referência.' : trrf === null ? 'Consultar o corpo técnico dos bombeiros.' : undefined;
  return { trrf, classe, ocupacao: `${linha.grupo}: ${linha.ocupacao}`, fonte: 'IT 06 CBMMG (2005), Tabela 5; a IT do estado da obra prevalece sobre a NBR 14432 [a confirmar]', ...(aviso ? { aviso } : {}) };
}
