// Biblioteca de normas editável (frente N3): tipos. Toda tabela normativa do cálculo é dado, com a versão de fábrica
// (extraída das constantes que o código já usava) e, se o usuário alterar, a versão dele em `BuildingModel.normas`.
export type TipoColuna = 'numero' | 'texto' | 'lista';
/** Célula: número, texto, `null` (só colunas com `nulo`) ou lista de números (pares b/c1 achatados etc.). */
export type CelulaNorma = number | string | null | number[];
export type LinhaNorma = Record<string, CelulaNorma>;

export interface ColunaNorma {
  chave: string;
  rotulo: string;
  tipo: TipoColuna;
  unidade?: string;
  /** Número aceita `null` ("consultar a fonte"). */
  nulo?: boolean;
  /** Lista de números com quantidade par (pares). */
  pares?: boolean;
}

/** Quanto a tabela pesa no cálculo (define o `calculo` do comando): análise, só dimensionamento/detalhe, só fundações ou nada (referência). */
export type NivelNorma = 'analise' | 'detalhe' | 'fundacao' | 'referencia';

export interface TabelaNormaInfo {
  /** Identificador estável: `norma.assunto` (ex.: "nbr7481.telas-q"). */
  id: string;
  norma: string;
  /** Edição da norma de onde vieram os valores de fábrica (ex.: "NBR 15200:2004"). */
  edicao: string;
  titulo: string;
  fonte: string;
  /** Valores sem fonte conferida: aparece o selo "a confirmar". */
  aConfirmar: boolean;
  nivel: NivelNorma;
  colunas: ColunaNorma[];
  /** Coluna que identifica a linha (única). */
  chave: string;
  /** Se informado, a tabela tem exatamente estas chaves (tabelas de forma fixa). Senão, ao menos uma linha. */
  chavesFixas?: (string | number)[];
  linhas: LinhaNorma[];
}

export interface TabelaNormaUsuario {
  linhas: LinhaNorma[];
  /** Edição ou fonte que o usuário usou ao transcrever (substitui a de fábrica no memorial). */
  edicao?: string;
  nota?: string;
}
export type NormasModelo = Record<string, TabelaNormaUsuario>;
/** O que as funções de cálculo recebem para achar as tabelas: o modelo do edifício ou os parâmetros de fundação. */
export interface FonteNormas { normas?: NormasModelo }
