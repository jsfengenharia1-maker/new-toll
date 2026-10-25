// Estações de amostragem ao longo de uma barra (vigas e pilares do pórtico plano): 20 divisões iguais e as raízes da derivada de M.
import { P } from './math';

export function sampleXs(L: number, polys: number[][]) {
  const xs = new Set<number>();
  for (let q = 0; q <= 20; q++) xs.add((L * q) / 20);
  for (const p of polys) for (const x of P.rootsIn(P.derive(p), 0, L)) xs.add(x);
  return [...xs].sort((p, q) => p - q);
}
