// Memória detalhada do módulo Pórtico 2D (por ora só a estabilidade global da fase MD9; o restante é a fase MD8).
import { runDesign, type DesignReport } from '../design';
import type { Analysis } from '../solver';
import type { Model } from '../types';
import { Registrador, comMemoria, type PassoMemoria } from './registrador';

/** Refaz o dimensionamento do pórtico com a memória ligada e devolve os passos e o relatório. */
export function memoriaPortico2D(model: Model, a: Analysis): { passos: PassoMemoria[]; relatorio: DesignReport } {
  const reg = new Registrador();
  const relatorio = comMemoria(reg, () => runDesign(model, a));
  return { passos: reg.passos, relatorio };
}
