// Faixas das lajes treliçadas na interface (R6): por padrão uma faixa representativa por grupo de igualação
// (a de maior momento positivo da análise; a selecionada, se for do grupo) e, opcionalmente, todas.
import type { ResultadoVigotas } from '../../core/building/vigotas';

/** Índices das faixas a desenhar: todas, ou uma por grupo (a selecionada representa o seu grupo). */
export function faixasVisiveis(r: ResultadoVigotas, todas: boolean, sel = -1): number[] {
  if (todas) return r.faixas.map((_, i) => i);
  const rep = new Map<number, number>();
  r.faixas.forEach((f, i) => {
    const j = rep.get(f.grupo);
    if (j === undefined || f.calc.mPos > r.faixas[j].calc.mPos) rep.set(f.grupo, i);
  });
  if (sel >= 0 && r.faixas[sel]) rep.set(r.faixas[sel].grupo, sel);
  return [...rep.values()].sort((a, b) => a - b);
}

/** Largura total (m) das faixas de um grupo, perpendicular às vigotas. */
export const larguraGrupo = (r: ResultadoVigotas, g: number) => r.faixas.filter((f) => f.grupo === g).reduce((s, f) => s + f.largura, 0);
