// Cálculo do edifício fora da linha principal (a planta não trava durante a análise).
import { analisarEdificio } from '../../core/building/analitico';
import type { BuildingModel } from '../../core/building/types';

self.onmessage = (e: MessageEvent<{ id: number; modelo: BuildingModel }>) => {
  try {
    const r = analisarEdificio(e.data.modelo);
    (self as unknown as Worker).postMessage({ id: e.data.id, r });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: e.data.id, erro: (err as Error).message });
  }
};
