// Saída comum da memória de cálculo detalhada (edifício e pórtico): modelo de dados, índice por etapa e CSV.
import { ETAPAS_MEMORIA, type PassoMemoria } from './registrador';

export interface MemoriaDetalhada {
  versao: 1;
  obra: string;
  /** Escopo desta fase (o que a memória cobre e o que fica para as fases seguintes). */
  escopo: string;
  passos: PassoMemoria[];
  elementos: string[];
  truncado: boolean;
  /** Tempo do dimensionamento com a memória ligada (ms). */
  ms: number;
}

/** Índice das etapas presentes e dos elementos de cada etapa, na ordem. */
export function indiceMemoria(mem: MemoriaDetalhada) {
  return ETAPAS_MEMORIA.map((e) => ({ ...e, elementos: [...new Set(mem.passos.filter((p) => p.etapa === e.id).map((p) => p.elemento))] })).filter((e) => e.elementos.length);
}

/** CSV dos passos (um por linha). */
export function csvMemoria(mem: MemoriaDetalhada): string {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lin = [['id', 'etapa', 'elemento', 'topico', 'descricao', 'formula', 'expressao', 'resultado', 'unidade', 'norma', 'a_confirmar', 'entradas'].join(';')];
  for (const p of mem.passos) lin.push([p.id, p.etapa, p.elemento, p.topico, p.descricao, p.formula, p.expressao, typeof p.resultado === 'number' ? String(p.resultado) : p.resultado, p.unidade, p.norma ?? '', p.aConfirmar ? 'sim' : '', JSON.stringify(p.entradas)].map((x) => esc(String(x))).join(';'));
  return lin.join('\n') + '\n';
}
