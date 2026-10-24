// Croqui do pavimento nas formas (E5a; C7.76, C7.195). Arquivo à parte para a prancha de formas não importar `armacao.ts` (ciclo).
import type { Croqui } from '../building/planos';
import type { P, Prim } from './prancha';

export interface CroquiDesenhado { prims: Prim[]; largura: number; altura: number }
/**
 * Croqui do pavimento no papel (mm): quadro do tamanho do croqui mais 2 mm de folga e o título; pilares, eixos das vigas e setas
 * de inclinação com o percentual. O canto inferior direito do quadro fica em (`xD`, `yB`).
 */
export function primitivasCroqui(c: Croqui, xD: number, yB: number): CroquiDesenhado {
  const folga = 2, W = c.largura + 2 * folga, H = c.altura + 2 * folga, x0 = xD - W, ox = x0 + folga, oy = yB + folga;
  const T = (p: P): P => [ox + p[0], oy + p[1]];
  const prims: Prim[] = [{ t: 'pl', c: 'QUADRO', pts: [[x0, yB], [xD, yB], [xD, yB + H], [x0, yB + H]], fechada: true }];
  prims.push({ t: 'txt', c: 'TEXTO', p: [x0, yB + H + 1], h: 1.8, s: 'CROQUI DO PAVIMENTO', ah: 'e', av: 'base' });
  for (const p of c.pilares) prims.push({ t: 'pl', c: 'PILAR', pts: p.map(T), fechada: true });
  for (const [a, z] of c.vigas) prims.push({ t: 'pl', c: 'VIGA', pts: [T(a), T(z)] });
  for (const s of c.setas) {
    const a = T(s.origem), z = T(s.fim), L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1, u: P = [(z[0] - a[0]) / L, (z[1] - a[1]) / L], h = 1.2;
    prims.push({ t: 'pl', c: 'LAJE', pts: [a, z] }, { t: 'pl', c: 'LAJE', pts: [[z[0] - u[0] * h - u[1] * h * 0.5, z[1] - u[1] * h + u[0] * h * 0.5], z, [z[0] - u[0] * h + u[1] * h * 0.5, z[1] - u[1] * h - u[0] * h * 0.5]] });
    prims.push({ t: 'txt', c: 'TEXTO', p: [z[0] + u[0] * 0.8, z[1] + u[1] * 0.8], h: 1.4, s: s.texto, ah: 'c', av: 'meio' });
  }
  return { prims, largura: W, altura: H + 4 };
}
