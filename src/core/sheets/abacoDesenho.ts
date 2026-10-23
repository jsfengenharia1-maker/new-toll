// Desenho dos ábacos das nervuradas bidirecionais (frente E3d) nas pranchas de formas e de armação: contorno da zona maciça efetiva,
// hachura a 45°, rótulo com a altura e cotas do retângulo envolvente (nos eixos das nervuras). Primitivas no sistema do modelo (m).
import { retanguloLocal, trechosDentro } from '../building/abacos';
import type { AbacoEfetivo } from '../building/nervuradas';
import { direcaoNervurada } from '../building/nervuradas';
import type { Laje } from '../building/types';
import type { P, Prim } from './prancha';

const cm = (m: number) => String(Math.round(m * 100));

/** Nome curto do ábaco na prancha (AB1, AB2…), pela ordem em que a laje os tem. */
export const nomeAbaco = (efs: AbacoEfetivo[], id: string): string => `AB${efs.findIndex((e) => e.abaco.id === id) + 1}`;

/**
 * Contorno do ábaco na camada `camada` (LAJE nas formas, FORMA-FINA na armação), hachura de 45° a cada `passoHachura` (m) na camada
 * FORMA-FINA, rótulo "AB1 h=35" no centro e as duas cotas do retângulo envolvente (camada COTA) com valores em cm.
 */
export function primitivasAbaco(laje: Pick<Laje, 'contorno' | 'direcao'>, ef: AbacoEfetivo, nome: string, k: number, camada: 'LAJE' | 'FORMA-FINA', passoHachura = 3 * k): Prim[] {
  const out: Prim[] = [{ t: 'pl', c: camada, pts: ef.poligono, fechada: true }];
  const r = retanguloLocal(laje, ef.poligono), a = (direcaoNervurada(laje) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const glob = (p: P): P => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  // hachura: retas a 45° (x + y = constante), recortadas pelo polígono
  const xs = ef.poligono.map((q) => q[0] + q[1]), lo = Math.min(...xs), hi = Math.max(...xs), ys = ef.poligono.map((q) => q[1]), y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
  for (let t = lo + passoHachura / 2; t < hi; t += passoHachura) {
    const A: P = [t - y0, y0], Z: P = [t - y1, y1];
    for (const [d0, d1] of trechosDentro(A, Z, ef.poligono)) {
      const L = Math.hypot(Z[0] - A[0], Z[1] - A[1]);
      out.push({ t: 'pl', c: 'FORMA-FINA', pts: [[A[0] + ((Z[0] - A[0]) * d0) / L, A[1] + ((Z[1] - A[1]) * d0) / L], [A[0] + ((Z[0] - A[0]) * d1) / L, A[1] + ((Z[1] - A[1]) * d1) / L]] });
    }
  }
  const cx = ef.poligono.reduce((t, q) => t + q[0], 0) / ef.poligono.length, cy = ef.poligono.reduce((t, q) => t + q[1], 0) / ef.poligono.length;
  out.push({ t: 'txt', c: camada === 'LAJE' ? 'LAJE' : 'TEXTO', p: [cx, cy], h: 2 * k, s: nome, ah: 'c', av: 'base' });
  // cotas do retângulo envolvente (eixos locais das nervuras), afastadas 4 mm do ábaco no papel
  const off = 4 * k, tk = 1 * k;
  const cota = (p0: P, p1: P, n: P, valor: number) => {
    const A: P = [p0[0] + n[0] * off, p0[1] + n[1] * off], Z: P = [p1[0] + n[0] * off, p1[1] + n[1] * off], M: P = [(A[0] + Z[0]) / 2 + n[0] * 0.8 * k, (A[1] + Z[1]) / 2 + n[1] * 0.8 * k];
    out.push({ t: 'pl', c: 'COTA', pts: [A, Z] }, { t: 'pl', c: 'COTA', pts: [p0, A] }, { t: 'pl', c: 'COTA', pts: [p1, Z] });
    const L = Math.hypot(Z[0] - A[0], Z[1] - A[1]) || 1, u: P = [(Z[0] - A[0]) / L, (Z[1] - A[1]) / L], d: P = [(u[0] + n[0]) * tk * 0.7, (u[1] + n[1]) * tk * 0.7];
    for (const q of [A, Z]) out.push({ t: 'pl', c: 'COTA', pts: [[q[0] - d[0], q[1] - d[1]], [q[0] + d[0], q[1] + d[1]]] });
    const ang = (Math.atan2(Z[1] - A[1], Z[0] - A[0]) * 180) / Math.PI;
    out.push({ t: 'txt', c: 'COTA', p: M, h: 1.8 * k, s: cm(valor), ang: ang > 90.01 ? ang - 180 : ang <= -89.99 ? ang + 180 : ang, ah: 'c', av: 'base' });
  };
  cota(glob([r.x0, r.y0]), glob([r.x1, r.y0]), glob([0, -1]), r.x1 - r.x0);
  cota(glob([r.x1, r.y0]), glob([r.x1, r.y1]), glob([1, 0]), r.y1 - r.y0);
  return out;
}

/**
 * Extremos (global) da linha da armadura base do ábaco na direção `dir` (0 = ao longo das nervuras da direção 0 da laje), pelo centro
 * do retângulo envolvente e deslocada `desl` (m) para a transversal; de borda a borda do ábaco.
 */
export function linhaBaseAbaco(laje: Pick<Laje, 'contorno' | 'direcao'>, ef: AbacoEfetivo, dir: 0 | 1, desl: number): [P, P] {
  const r = retanguloLocal(laje, ef.poligono), a = (direcaoNervurada(laje) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const glob = (p: P): P => [p[0] * c - p[1] * s, p[0] * s + p[1] * c], cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  return dir === 0 ? [glob([r.x0, cy + desl]), glob([r.x1, cy + desl])] : [glob([cx + desl, r.y0]), glob([cx + desl, r.y1])];
}
