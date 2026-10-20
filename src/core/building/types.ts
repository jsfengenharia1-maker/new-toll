// Modelo físico do edifício (lançamento por pavimentos). Editado só por comandos (src/core/commands).
// Unidades: m, kN, graus. Ids são strings curtas estáveis; o nome visível é campo separado e renumerável.

export const BUILDING_VERSION = 1;

/** Categorias de uso (NBR 6120:2019, Tabela 10) com a carga variável padrão em kN/m² [a confirmar]. */
export type CategoriaUso = 'residencial' | 'servico' | 'comum' | 'escritorio' | 'garagem' | 'cobertura';

export interface Obra {
  nome: string;
  cidade?: string;
  /** Profundidade do nível de fundação abaixo do pavimento mais baixo (m). */
  profundidadeFundacao: number;
}

export interface Norma {
  fck: number; // MPa
  aco: 'CA-50' | 'CA-60';
  caa: 'I' | 'II' | 'III' | 'IV';
  /** Cobrimentos nominais (cm). */
  cobrimento: { laje: number; viga: number; pilar: number };
}

export interface Pavimento {
  id: string;
  nome: string;
  /** Cota do topo da laje estrutural (m). */
  cota: number;
  grupo: string;
}

/** Grupo de pavimentos iguais: todos compartilham a mesma planta (pavimento-tipo vinculado). */
export interface Grupo {
  id: string;
  nome: string;
  uso: CategoriaUso;
  /** Revestimento e piso (kN/m²). */
  gRev: number;
  /** Carga variável (kN/m²). */
  q: number;
}

/** Eixo de referência: reta pelos pontos p1 e p2, com rótulo (A, B, 1, 2...). */
export interface Eixo {
  id: string;
  nome: string;
  p1: [number, number];
  p2: [number, number];
}

export interface BuildingModel {
  version: typeof BUILDING_VERSION;
  /** Contador para ids determinísticos (o replay do log gera os mesmos ids). */
  seq: number;
  obra: Obra;
  norma: Norma;
  pavimentos: Pavimento[]; // de baixo para cima
  grupos: Grupo[];
  eixos: Eixo[];
}

export const USOS: { v: CategoriaUso; label: string; q: number }[] = [
  { v: 'residencial', label: 'Residencial (dormitórios, sala, cozinha)', q: 1.5 },
  { v: 'servico', label: 'Área de serviço e lavanderia', q: 2.0 },
  { v: 'comum', label: 'Áreas comuns, corredores e escadas', q: 3.0 },
  { v: 'escritorio', label: 'Escritórios', q: 2.5 },
  { v: 'garagem', label: 'Garagem (veículos leves)', q: 3.0 },
  { v: 'cobertura', label: 'Cobertura sem acesso (manutenção)', q: 1.0 },
];

export const qDoUso = (u: CategoriaUso) => USOS.find((x) => x.v === u)?.q ?? 1.5;

/** Cobrimentos nominais por classe de agressividade (NBR 6118, Tabela 7.2), em cm. */
export const COBRIMENTOS: Record<Norma['caa'], Norma['cobrimento']> = {
  I: { laje: 2.0, viga: 2.5, pilar: 2.5 },
  II: { laje: 2.5, viga: 3.0, pilar: 3.0 },
  III: { laje: 3.5, viga: 4.0, pilar: 4.0 },
  IV: { laje: 4.5, viga: 5.0, pilar: 5.0 },
};

export function edificioVazio(): BuildingModel {
  return {
    version: BUILDING_VERSION,
    seq: 0,
    obra: { nome: 'Edifício sem nome', profundidadeFundacao: 1.5 },
    norma: { fck: 30, aco: 'CA-50', caa: 'II', cobrimento: { ...COBRIMENTOS.II } },
    pavimentos: [],
    grupos: [],
    eixos: [],
  };
}

export const pavimentosOrdenados = (b: BuildingModel) => [...b.pavimentos].sort((a, z) => a.cota - z.cota);

/** Pé-direito (m): distância até o pavimento de baixo; no mais baixo, a profundidade da fundação. */
export function peDireito(b: BuildingModel, id: string): number {
  const ps = pavimentosOrdenados(b);
  const i = ps.findIndex((p) => p.id === id);
  if (i < 0) return NaN;
  return i === 0 ? b.obra.profundidadeFundacao : ps[i].cota - ps[i - 1].cota;
}

export const cotaFundacao = (b: BuildingModel) => (b.pavimentos.length ? Math.min(...b.pavimentos.map((p) => p.cota)) : 0) - b.obra.profundidadeFundacao;
