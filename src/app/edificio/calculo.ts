// Cliente do worker de cálculo. O código da análise só existe dentro do worker (não pesa duas vezes no pacote).
import CalculoWorker from './calculo.worker?worker&inline';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { BuildingModel } from '../../core/building/types';

let w: Worker | null = null;
let seq = 0;
const pendentes = new Map<number, (r: { r?: AnaliseEdificio; erro?: string }) => void>();

export function calcular(modelo: BuildingModel): Promise<AnaliseEdificio> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Este navegador não executa Web Workers.'));
  if (!w) {
    try {
      w = new CalculoWorker();
      w.onmessage = (e: MessageEvent<{ id: number; r?: AnaliseEdificio; erro?: string }>) => { pendentes.get(e.data.id)?.(e.data); pendentes.delete(e.data.id); };
    } catch { return Promise.reject(new Error('Não foi possível iniciar o cálculo em segundo plano neste ambiente.')); }
  }
  const id = ++seq;
  return new Promise((ok, falha) => {
    pendentes.set(id, (m) => (m.r ? ok(m.r) : falha(new Error(m.erro ?? 'Falha no cálculo.'))));
    w!.postMessage({ id, modelo });
  });
}
