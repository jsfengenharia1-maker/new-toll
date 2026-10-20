// Tipos da cena 3D e registro dos geradores de malha. Cada módulo de elemento (pilares, vigas, lajes, fundações e,
// quando existirem, paredes, escadas, inclinadas, diagonais e planos) registra o seu gerador; a vista não depende da
// ordem em que as frentes chegam, e um gerador que falha só deixa o seu tipo de fora (com um aviso).
import type { BuildingModel } from '../building/types';
import type { ResultadoFundacao } from '../building/fundacao';
import type { ResultadoVigaFundacao } from '../building/vigasFundacao';

/** Tipo de elemento para filtros e cor (`--v3d-<tipo>` em global.css). */
export type TipoElemento3D = 'pilar' | 'viga' | 'laje' | 'fundacao' | 'parede' | 'escada';
export const TIPOS_3D: { v: TipoElemento3D; label: string }[] = [
  { v: 'pilar', label: 'Pilares' }, { v: 'viga', label: 'Vigas' }, { v: 'laje', label: 'Lajes' },
  { v: 'parede', label: 'Paredes' }, { v: 'escada', label: 'Escadas' }, { v: 'fundacao', label: 'Fundações' },
];

/** Pavimento fictício das fundações nos filtros. */
export const PAV_FUNDACAO = 'fundacao';

export interface Objeto3D {
  /** Único na cena: `<tipo>:<elemento>:<pavimento>[:parte]`. */
  id: string;
  /** Id do elemento no modelo (pilar, viga, laje, elemento ou viga de fundação): o que a planta seleciona. */
  elemento: string;
  tipo: TipoElemento3D;
  /** Detalhe do tipo: sapata, bloco, estaca, tubulao, vigaFundacao, definir (laje sem tipo)... */
  subtipo?: string;
  /** Id e nome do pavimento (para fundações: 'fundacao'). */
  pavimento: string;
  pavimentoNome: string;
  grupo: string;
  nome: string;
  /** Texto da dica (seção, espessura...). */
  descricao: string;
  /** Vértices [x, y, z, ...] e triângulos. */
  pos: number[];
  idx: number[];
  /** Segmentos de contorno [x0, y0, z0, x1, y1, z1, ...]. */
  linhas: number[];
  /** Laje sem tipo (pano a definir): translúcida e tracejada. */
  pendente?: boolean;
  /** Volume de concreto (m³), quando é um sólido fechado. */
  volume?: number;
}

export interface Rotulo3D { objeto: string; x: number; y: number; z: number; texto: string }

export interface Cena3D {
  objetos: Objeto3D[];
  /** Linhas auxiliares sem malha (vigotas em detalhe alto): [x0, y0, z0, x1, y1, z1, ...] por objeto. */
  auxiliares: { objeto: string; linhas: number[] }[];
  /** Marcas de texto na cena (o "?" dos panos a definir). */
  rotulos: Rotulo3D[];
  limites: { min: [number, number, number]; max: [number, number, number] };
  contagens: { total: number; porTipo: Record<string, number>; porPavimento: Record<string, number> };
  /** Geradores que falharam ou entradas ignoradas. */
  avisos: string[];
}

export interface OpcoesCena {
  /** Só os pavimentos destes grupos. */
  grupos?: string[];
  /** Intervalo de pavimentos (ids), inclusive, pela cota. */
  de?: string;
  ate?: string;
  /** Pavimentos exatos (ids; `PAV_FUNDACAO` para as fundações). Prevalece sobre grupos e intervalo. */
  pavimentos?: string[];
  /** Tipos visíveis; ausente = todos. */
  tipos?: TipoElemento3D[];
  /** 'alto' desenha as vigotas das treliçadas; padrão 'baixo'. */
  detalhe?: 'baixo' | 'alto';
  /** Resultados das fundações (sem eles, as fundações ficam de fora). */
  fundacoes?: ResultadoFundacao[];
  vigasFundacao?: ResultadoVigaFundacao[];
}

export interface ContextoCena {
  b: BuildingModel;
  /** Pavimentos incluídos (ids; contém `PAV_FUNDACAO` quando as fundações entram). */
  pavimentos: Set<string>;
  detalhe: 'baixo' | 'alto';
  fundacoes: ResultadoFundacao[];
  vigasFundacao: ResultadoVigaFundacao[];
}

export interface Saida3D { objetos: Objeto3D[]; auxiliares?: { objeto: string; linhas: number[] }[]; rotulos?: Rotulo3D[] }
export type Gerador3D = (ctx: ContextoCena) => Saida3D;

/** Geradores por nome (a chave não importa à cena; registrar de novo com a mesma chave substitui). */
export const GERADORES_3D: Record<string, Gerador3D> = {};
export const registrarGerador3D = (nome: string, g: Gerador3D) => { GERADORES_3D[nome] = g; };
