// Categorias de uso e sobrecargas por norma (L1, C3.12). Cada categoria aponta para uma `CategoriaUso` do modelo
// (que fixa a classe de ψ). Valores da NBR 6120:2019, Tabela 10, [a confirmar] na conferência com a edição vigente.
import type { CategoriaUso } from './types';
import { tabelaNorma, type FonteNormas } from '../normas';

export interface CategoriaUsoInfo {
  /** Identificador estável (gravado na especificação do assistente). */
  id: string;
  rotulo: string;
  /** Sobrecarga (kN/m²). */
  q: number;
  /** Categoria do modelo usada no grupo (define a classe de ψ). */
  uso: CategoriaUso;
  aConfirmar: boolean;
}

/** Tabela de categorias (biblioteca de normas, `nbr6120.uso`): cópia nova a cada chamada, para a interface editar à vontade. */
export function categoriasDeUso(b?: FonteNormas): CategoriaUsoInfo[] {
  return tabelaNorma(b, 'nbr6120.uso').map((l) => ({ id: l.id as string, rotulo: l.rotulo as string, q: l.q as number, uso: l.uso as CategoriaUso, aConfirmar: l.aConfirmar === 1 }));
}

/** Categoria pelo id; desconhecido → `undefined`. */
export const categoriaPorId = (id: string, b?: FonteNormas): CategoriaUsoInfo | undefined => categoriasDeUso(b).find((c) => c.id === id);
