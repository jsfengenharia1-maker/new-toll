// Seletor de esforços das janelas do pilar e da viga (V7a, C4.60 e C6.105): filtra as hipóteses por tipo
// (envoltória, combinação ou caso) e por texto, e lê o diagrama da viga numa abscissa qualquer. Funções puras.
import type { Comp, DiagramaViga, HipoteseEsforco } from './esforcosCaso';

/** Filtro por tipo de hipótese: todas, só envoltórias, só combinações ou só casos simples. */
export type FiltroHipotese = 'todas' | HipoteseEsforco['tipo'];

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Hipóteses do tipo pedido cujo nome contém o texto (sem distinguir maiúsculas nem acentos); ordem preservada. */
export function filtrarHipoteses<H extends HipoteseEsforco>(hips: H[], tipo: FiltroHipotese = 'todas', busca = ''): H[] {
  const q = semAcento(busca.trim());
  return hips.filter((h) => (tipo === 'todas' || h.tipo === tipo) && (!q || semAcento(h.nome).includes(q)));
}

/** Hipótese escolhida dentro da lista filtrada: a do id, se passa no filtro; senão a primeira filtrada; sem nenhuma, a do id ou a primeira da lista toda. */
export function hipoteseSelecionada<H extends HipoteseEsforco>(hips: H[], id: string, tipo: FiltroHipotese = 'todas', busca = ''): H | undefined {
  const f = filtrarHipoteses(hips, tipo, busca);
  return f.find((h) => h.id === id) ?? f[0] ?? hips.find((h) => h.id === id) ?? hips[0];
}

/**
 * Esforços da viga na abscissa `s` (m ao longo do traçado): interpolação linear entre os pontos do diagrama;
 * fora do traçado fica no extremo mais próximo. Devolve máximo e mínimo (iguais em caso e combinação).
 */
export function esforcosVigaEmS(d: DiagramaViga, s: number): { s: number; max: Comp; min: Comp } {
  const z = d.s, n = z.length;
  if (n === 0) throw new Error('diagrama sem pontos');
  const h = Math.min(Math.max(s, z[0]), z[n - 1]);
  let i = 0;
  while (i < n - 2 && z[i + 1] < h) i++;
  const j = Math.min(i + 1, n - 1), t = n < 2 || z[j] === z[i] ? 0 : (h - z[i]) / (z[j] - z[i]);
  const mix = (k: 'max' | 'min'): Comp => {
    const a = d.pontos[i][k], b = d.pontos[j][k], o = { ...a };
    for (const c of Object.keys(o) as (keyof Comp)[]) o[c] = a[c] + t * (b[c] - a[c]);
    return o;
  };
  return { s: h, max: mix('max'), min: mix('min') };
}
