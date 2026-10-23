// Dados do memorial (N3): tabelas normativas em uso, com edição, fonte e origem (de fábrica ou alterada pelo usuário).
import { normasEmUso } from '.';
import type { FonteNormas } from './tipos';

export interface LinhaMemorialNorma {
  id: string; norma: string; titulo: string; edicao: string; fonte: string;
  origem: 'de fábrica' | 'alterada pelo usuário';
  aConfirmar: boolean; nota?: string;
  /** Quantidade de linhas em uso. */
  linhas: number;
}

export function normasNoMemorial(b: FonteNormas | undefined): LinhaMemorialNorma[] {
  return normasEmUso(b).map((u) => ({
    id: u.info.id, norma: u.info.norma, titulo: u.info.titulo, edicao: u.edicao, fonte: u.info.fonte,
    origem: u.alterada ? 'alterada pelo usuário' : 'de fábrica',
    aConfirmar: u.info.aConfirmar, ...(u.nota ? { nota: u.nota } : {}), linhas: u.linhas.length,
  }));
}
