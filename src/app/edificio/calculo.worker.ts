// Cálculo do edifício fora da linha principal (a planta não trava durante a análise e o dimensionamento).
import { analisarEdificio } from '../../core/building/analitico';
import { cargasParaFundacao, dimensionarEdificio } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';

self.onmessage = (e: MessageEvent<{ id: number; modelo: BuildingModel }>) => {
  try {
    const b = e.data.modelo, r = analisarEdificio(b);
    const t0 = performance.now();
    const dim = r.erro || !r.portico.res ? null : { ...dimensionarEdificio(b, r), fundacao: cargasParaFundacao(b, r), ms: 0 };
    if (dim) dim.ms = performance.now() - t0;
    (self as unknown as Worker).postMessage({ id: e.data.id, r, dim });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: e.data.id, erro: (err as Error).message });
  }
};
