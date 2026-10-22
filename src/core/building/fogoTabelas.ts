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

/** TRRF tabelados (min) nas tabelas da NBR 15200:2004. */
export const TRRF_TABELADOS = [30, 60, 90, 120] as const;
export type TrrfTabelado = (typeof TRRF_TABELADOS)[number];

/** Par bmín/c1 (mm). */
export type ParBC = readonly [b: number, c1: number];

// ---------------- lajes ----------------

/**
 * Tabela 4 [A]: lajes apoiadas em vigas. h (mm) é a espessura mínima para a função corta-fogo; c1 (mm) por tipo de
 * armação: duas direções com ly/lx ≤ 1,5, duas direções com 1,5 < ly/lx ≤ 2 e uma direção (ly/lx > 2).
 */
export const LAJE_APOIADA = {
  h: [60, 80, 100, 120],
  c1: { duas15: [10, 10, 15, 20], duas20: [10, 15, 20, 25], uma: [10, 20, 30, 40] },
} as const;
/** Tabela 5 [A]: lajes lisas ou cogumelo (h e c1 em mm). */
export const LAJE_LISA = { h: [150, 180, 200, 200], c1: [10, 15, 25, 35] } as const;

/** Tabelas 6 e 7 [A][C]: nervuras (combinações bmín/c1, mm) e capa (h/c1, mm) das lajes nervuradas. */
export interface TabelaNervurada { nervuras: readonly (readonly ParBC[])[]; capa: readonly ParBC[] }
/** Tabela 6: nervuradas biapoiadas. */
export const NERVURADA_BIAPOIADA: TabelaNervurada = {
  nervuras: [[[80, 15]], [[100, 35], [120, 25], [190, 15]], [[120, 45], [160, 40], [250, 30]], [[160, 60], [190, 55], [300, 40]]],
  capa: [[80, 10], [80, 10], [100, 15], [120, 20]],
};
/** Tabela 7: nervuradas apoiadas em três ou quatro lados ou contínuas. */
export const NERVURADA_CONTINUA: TabelaNervurada = {
  nervuras: [[[80, 10]], [[100, 25], [120, 15], [190, 10]], [[120, 35], [160, 25], [250, 15]], [[160, 45], [190, 40], [300, 30]]],
  capa: [[80, 10], [80, 10], [100, 15], [120, 20]],
};

// ---------------- vigas ----------------

/** Tabelas 8 e 9 [A]: combinações bmín/c1 (mm) por TRRF e largura mínima da alma bw (mm). */
export interface TabelaViga { combinacoes: readonly (readonly ParBC[])[]; bw: readonly number[] }
/** Tabela 8: vigas biapoiadas. */
export const VIGA_BIAPOIADA: TabelaViga = {
  combinacoes: [[[80, 25], [120, 20], [160, 15], [190, 15]], [[120, 40], [160, 35], [190, 30], [300, 25]], [[140, 55], [190, 45], [300, 40], [400, 35]], [[190, 65], [240, 60], [300, 55], [500, 50]]],
  bw: [80, 100, 100, 120],
};
/** Tabela 9: vigas contínuas ou vigas de pórticos. */
export const VIGA_CONTINUA: TabelaViga = {
  combinacoes: [[[80, 15], [160, 12], [190, 12]], [[120, 25], [190, 12], [300, 12]], [[140, 35], [250, 25], [400, 25]], [[200, 45], [300, 35], [450, 35]]],
  bw: [80, 100, 100, 120],
};

// ---------------- pilares ----------------

/**
 * Tabela 10 [A] (edição 2004), mais de uma face exposta: bmín/c1 (mm) por TRRF para μfi = 0,2; 0,5 e 0,7. Só vale no
 * método tabular simplificado (opção `fogoPilarMetodo` = 1); a edição de 2012 a substituiu pelo método analítico e
 * por tabelas gerais que não foram transcritas.
 */
export const PILAR_TABELA_2004 = {
  muFi: [0.2, 0.5, 0.7],
  porTrrf: [
    [[190, 25], [190, 25], [190, 30]],
    [[190, 25], [190, 35], [250, 45]],
    [[190, 30], [300, 45], [450, 40]],
    [[250, 40], [350, 45], [450, 50]],
  ],
} as const;

/** Pilares com apenas uma face exposta, NBR 15200:2012 [B]: TRRF (min) → bmín/c1 (mm). */
export const PILAR_UMA_FACE: readonly { trrf: number; par: ParBC }[] = [
  { trrf: 30, par: [155, 25] }, { trrf: 60, par: [155, 25] }, { trrf: 90, par: [155, 25] }, { trrf: 120, par: [175, 35] }, { trrf: 180, par: [230, 55] },
];

// ---------------- revestimento ----------------

/** Eficiência relativa ao concreto dos revestimentos aderentes: [A] item 7.2 d) e [B] (2012). */
export const EFICIENCIA_REVESTIMENTO = { cal: 0.67, cimento: 1 } as const;
/**
 * Revestimento protetor (gesso, vermiculita, fibras): 250 % na edição de 2004 [A]; a de 2012 exige eficiência e
 * aderência demonstradas em ensaio [B]. O padrão de 2,5 é o da 2004 e deve ser confirmado (ensaio) pelo usuário.
 */
export const EFICIENCIA_PROTETOR_2004 = 2.5;

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
 * Tabela 5 da IT 06 do CBMMG (2005) [D], valores sem as reduções entre parênteses (subsolos pequenos e edificações com
 * pavimentos de até 750 m² compartimentados: a favor da segurança). Divisões F-9 e F-11, L e M: consultar o corpo técnico.
 * Acima de 54 m a fonte manda consultar o corpo técnico: a função devolve a classe P5 com aviso.
 */
const TRRF_OCUPACAO: LinhaTrrf[] = [
  { divisoes: ['A-1', 'A-2', 'A-3'], grupo: 'A', ocupacao: 'Residencial', v: [90, 60, 30, 30, 60, 90, 120] },
  { divisoes: ['B-1', 'B-2'], grupo: 'B', ocupacao: 'Serviços de hospedagem', v: [90, 60, 30, 60, 60, 90, 120] },
  { divisoes: ['C-1'], grupo: 'C', ocupacao: 'Comercial varejista (baixa carga de incêndio)', v: [90, 60, 60, 60, 60, 90, 120] },
  { divisoes: ['C-2', 'C-3'], grupo: 'C', ocupacao: 'Comercial varejista (média e alta carga, shopping)', v: [90, 60, 60, 60, 60, 90, 120] },
  { divisoes: ['D-1', 'D-2', 'D-3', 'D-4'], grupo: 'D', ocupacao: 'Serviços profissionais, pessoais e técnicos', v: [90, 60, 30, 60, 60, 90, 120] },
  { divisoes: ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6'], grupo: 'E', ocupacao: 'Educacional e cultura física', v: [90, 60, 30, 30, 60, 90, 120] },
  { divisoes: ['F-1', 'F-2', 'F-5', 'F-6', 'F-8', 'F-10'], grupo: 'F', ocupacao: 'Locais de reunião de público', v: [90, 60, 60, 60, 60, 90, 120] },
  { divisoes: ['F-3', 'F-4', 'F-7'], grupo: 'F', ocupacao: 'Locais de reunião de público (estádios, terminais, eventos)', v: [90, 60, 60, 60, 30, 30, null] },
  { divisoes: ['G-1', 'G-2', 'G-3', 'G-4', 'G-5', 'G-6'], grupo: 'G', ocupacao: 'Serviços automotivos (G-1 e G-2 não abertos lateralmente)', v: [90, 60, 30, 60, 60, 90, 120] },
  { divisoes: ['G-1 aberta', 'G-2 aberta'], grupo: 'G', ocupacao: 'Garagens abertas lateralmente', v: [90, 60, 30, 30, 30, 30, 60] },
  { divisoes: ['H-1', 'H-2', 'H-3', 'H-4', 'H-5', 'H-6'], grupo: 'H', ocupacao: 'Serviços de saúde e institucionais', v: [90, 60, 30, 60, 60, 90, 120] },
  { divisoes: ['I-1'], grupo: 'I', ocupacao: 'Industrial (baixo potencial de incêndio)', v: [90, 60, 30, 30, 30, 60, 120] },
  { divisoes: ['I-2'], grupo: 'I', ocupacao: 'Industrial (médio potencial de incêndio)', v: [120, 90, 30, 30, 60, 90, 120] },
  { divisoes: ['I-3'], grupo: 'I', ocupacao: 'Industrial (alto potencial de incêndio)', v: [120, 90, 60, 60, 90, 120, 120] },
  { divisoes: ['J-1'], grupo: 'J', ocupacao: 'Depósitos (incombustível)', v: [60, 30, 30, 30, 30, 30, 60] },
  { divisoes: ['J-2'], grupo: 'J', ocupacao: 'Depósitos (baixo risco)', v: [90, 60, 30, 30, 30, 30, 60] },
  { divisoes: ['J-3'], grupo: 'J', ocupacao: 'Depósitos (médio risco)', v: [90, 60, 30, 60, 60, 120, 120] },
  { divisoes: ['J-4'], grupo: 'J', ocupacao: 'Depósitos (alto risco)', v: [120, 90, 60, 60, 90, 120, 120] },
];

/** Divisões de ocupação com TRRF tabelado (rótulo para a interface). */
export const DIVISOES_OCUPACAO: { divisao: string; grupo: string; ocupacao: string }[] =
  TRRF_OCUPACAO.flatMap((l) => l.divisoes.map((d) => ({ divisao: d, grupo: l.grupo, ocupacao: l.ocupacao })));

export interface SugestaoTrrf { trrf: number | null; classe: ClasseTrrf; ocupacao: string; fonte: string; aviso?: string }

/**
 * TRRF sugerido (min) para a divisão de ocupação e a altura h (m acima do solo; negativo = profundidade do subsolo:
 * S1 até 10 m, S2 abaixo). `null` = a tabela manda consultar o corpo técnico dos bombeiros; divisão desconhecida = `null`.
 */
export function trrfSugerido(divisao: string, h: number): SugestaoTrrf | null {
  const chave = divisao.trim().toUpperCase().replace(/\s+/g, ' ').replace(' ABERTA', ' aberta');
  const linha = TRRF_OCUPACAO.find((l) => l.divisoes.some((d) => d.toUpperCase().replace(' ABERTA', ' aberta') === chave));
  if (!linha) return null;
  const classe: ClasseTrrf = h < 0 ? (-h > 10 ? 'S2' : 'S1') : classeDeAltura(h);
  const trrf = linha.v[CLASSES_TRRF.indexOf(classe)];
  const aviso = h > 54 ? 'Acima de 54 m a IT 06 manda consultar o corpo técnico dos bombeiros: valor da classe P5 apenas como referência.' : trrf === null ? 'Consultar o corpo técnico dos bombeiros.' : undefined;
  return { trrf, classe, ocupacao: `${linha.grupo}: ${linha.ocupacao}`, fonte: 'IT 06 CBMMG (2005), Tabela 5; a IT do estado da obra prevalece sobre a NBR 14432 [a confirmar]', ...(aviso ? { aviso } : {}) };
}
