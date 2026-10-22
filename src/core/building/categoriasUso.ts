// Categorias de uso e sobrecargas por norma (L1, C3.12). Cada categoria aponta para uma `CategoriaUso` do modelo
// (que fixa a classe de ψ). Valores da NBR 6120:2019, Tabela 10, [a confirmar] na conferência com a edição vigente.
import { USOS, type CategoriaUso } from './types';

export type NormaUso = 'NBR6120';
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

/** As 7 categorias do modelo (id = valor de `CategoriaUso`) seguidas das categorias adicionais da NBR 6120. */
const ADICIONAIS: CategoriaUsoInfo[] = [
  { id: 'sala-aula', rotulo: 'Escolas: salas de aula', q: 3.0, uso: 'escritorio', aConfirmar: true },
  { id: 'comercio', rotulo: 'Lojas e comércio', q: 4.0, uso: 'escritorio', aConfirmar: true },
  { id: 'reuniao', rotulo: 'Restaurantes, salões e locais de reunião', q: 3.0, uso: 'escritorio', aConfirmar: true },
  { id: 'auditorio', rotulo: 'Auditórios, cinemas e teatros com plateia fixa', q: 3.0, uso: 'escritorio', aConfirmar: true },
  { id: 'academia', rotulo: 'Academias e salões de dança', q: 4.0, uso: 'escritorio', aConfirmar: true },
  { id: 'hospital', rotulo: 'Hospitais: quartos e enfermarias', q: 2.0, uso: 'residencial', aConfirmar: true },
  { id: 'biblioteca', rotulo: 'Bibliotecas: salas de leitura', q: 3.0, uso: 'garagem', aConfirmar: true },
  { id: 'arquivo', rotulo: 'Arquivos e depósitos de livros', q: 6.0, uso: 'garagem', aConfirmar: true },
  { id: 'arquibancada', rotulo: 'Arquibancadas e tribunas', q: 5.0, uso: 'escritorio', aConfirmar: true },
];

/** Tabela de categorias da norma (cópia nova a cada chamada, para a interface editar à vontade). */
export function categoriasDeUso(norma: NormaUso = 'NBR6120'): CategoriaUsoInfo[] {
  if (norma !== 'NBR6120') return [];
  const base = USOS.map((u): CategoriaUsoInfo => ({ id: u.v, rotulo: u.label, q: u.q, uso: u.v, aConfirmar: true }));
  return [...base, ...ADICIONAIS].map((c) => ({ ...c }));
}

/** Categoria pelo id; desconhecido → `undefined`. */
export const categoriaPorId = (id: string, norma: NormaUso = 'NBR6120'): CategoriaUsoInfo | undefined => categoriasDeUso(norma).find((c) => c.id === id);
