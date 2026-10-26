// Comparação de deformadas lado a lado (V6b, C12.22): lógica pura da grade de 2 a 4 janelas, da escolha das hipóteses
// iniciais, da escala (comum, própria ou manual) e do controle de contextos WebGL. Sem DOM; a interface só desenha.
import { escalaAutomatica } from '../resultados/deformada';

export const MIN_JANELAS = 2;
export const MAX_JANELAS = 4;
/**
 * Limite de contextos WebGL simultâneos do aplicativo (a confirmar: os navegadores aceitam cerca de 16 por página e
 * descartam o mais antigo ao passar disso; 8 deixa folga para a vista 3D, as janelas isoladas e a captura de imagem).
 */
export const LIMITE_CONTEXTOS_WEBGL = 8;

export type ModoEscalaComparar = 'comum' | 'propria' | 'manual';

const limitar = (n: number) => Math.min(MAX_JANELAS, Math.max(MIN_JANELAS, Math.round(n)));

/** Colunas e linhas da grade: 2 janelas = 2×1, 3 = 3×1, 4 = 2×2. */
export function grade(n: number): { colunas: number; linhas: number } {
  const k = limitar(n);
  return k === 4 ? { colunas: 2, linhas: 2 } : { colunas: k, linhas: 1 };
}

/**
 * Hipóteses das janelas: a primeira é `atual` (ou a primeira da lista); as demais seguem a lista, sem repetir enquanto
 * houver hipóteses distintas. `anteriores` preserva as escolhas já feitas quando só muda o número de janelas.
 */
export function hipotesesIniciais(ids: readonly string[], n: number, atual = '', anteriores: readonly string[] = []): string[] {
  const k = limitar(n);
  if (!ids.length) return Array(k).fill('');
  const out: string[] = [];
  for (let i = 0; i < k; i++) out.push(ids.includes(anteriores[i]) ? anteriores[i] : '');
  if (!out[0]) out[0] = ids.includes(atual) ? atual : ids[0];
  for (let i = 1; i < k; i++) {
    if (out[i]) continue;
    out[i] = ids.find((id) => !out.includes(id)) ?? ids[i % ids.length];
  }
  return out;
}

/**
 * Escala de cada janela. `comum`: o maior deslocamento entre as janelas mede a fração da altura (mesma escala em todas,
 * logo comparáveis a olho); `propria`: cada janela com a sua escala automática; `manual`: a de `manuais[i]` (padrão 50).
 */
export function escalasDasJanelas(dmax: readonly number[], altura: number, modo: ModoEscalaComparar, manuais: readonly number[] = []): number[] {
  if (modo === 'manual') return dmax.map((_, i) => (manuais[i] > 0 ? manuais[i] : 50));
  if (modo === 'comum') { const e = escalaAutomatica(Math.max(0, ...dmax), altura); return dmax.map(() => e); }
  return dmax.map((d) => escalaAutomatica(d, altura));
}

/** Fundo da rampa de cores de cada janela (m): o máximo comum quando a escala é comum, senão o próprio. */
export function referenciaDaRampa(dmax: readonly number[], modo: ModoEscalaComparar): number[] {
  if (modo === 'comum') { const m = Math.max(0, ...dmax); return dmax.map(() => m); }
  return [...dmax];
}

/** Razão do deslocamento de cada janela pelo da primeira (1 = igual); 0 quando a primeira não desloca. */
export function razoesEmRelacao(dmax: readonly number[]): number[] {
  return dmax.map((d) => (dmax[0] > 1e-12 ? d / dmax[0] : 0));
}

/** Controle de contextos WebGL em uso: cada renderizador adquire um ao nascer e libera ao morrer. */
export class ContadorContextos {
  private n = 0;
  readonly limite: number;
  constructor(limite = LIMITE_CONTEXTOS_WEBGL) { this.limite = limite; }
  get ativos(): number { return this.n; }
  get livres(): number { return Math.max(0, this.limite - this.n); }
  /** Reserva um contexto; falso (sem reservar) quando o limite já foi atingido. */
  adquirir(): boolean { if (this.n >= this.limite) return false; this.n++; return true; }
  liberar(): void { this.n = Math.max(0, this.n - 1); }
}

/** Aviso quando pedidas mais janelas que contextos livres (`livres` = os disponíveis para a comparação). */
export function avisoContextos(janelas: number, livres: number, limite = LIMITE_CONTEXTOS_WEBGL): string {
  if (janelas <= livres) return '';
  return `Limite de ${limite} contextos WebGL do navegador: ${livres} de ${janelas} janelas podem ser desenhadas; feche outras vistas 3D ou reduza o número de janelas.`;
}
