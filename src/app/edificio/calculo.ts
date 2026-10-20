// Cliente do worker de cálculo. O código da análise só existe dentro do worker (não pesa duas vezes no pacote).
import CalculoWorker from './calculo.worker?worker&inline';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { FLoad } from '../../core/piles';

/** Dimensionamento + cargas para o módulo Fundações (null se a análise falhou). */
export type DimEdificio = Dimensionamento & { fundacao: FLoad[]; ms: number };
type Msg = { id: number; r?: AnaliseEdificio; dim?: DimEdificio | null; erro?: string };
import type { BuildingModel } from '../../core/building/types';

let w: Worker | null = null;
let seq = 0;
const pendentes = new Map<number, (r: Msg) => void>();

export function calcular(modelo: BuildingModel): Promise<{ analise: AnaliseEdificio; dim: DimEdificio | null }> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Este navegador não executa Web Workers.'));
  if (!w) {
    try {
      w = new CalculoWorker();
      w.onmessage = (e: MessageEvent<Msg>) => { pendentes.get(e.data.id)?.(e.data); pendentes.delete(e.data.id); };
    } catch { return Promise.reject(new Error('Não foi possível iniciar o cálculo em segundo plano neste ambiente.')); }
  }
  const id = ++seq;
  return new Promise((ok, falha) => {
    pendentes.set(id, (m) => (m.r ? ok({ analise: m.r, dim: m.dim ?? null }) : falha(new Error(m.erro ?? 'Falha no cálculo.'))));
    w!.postMessage({ id, modelo });
  });
}
