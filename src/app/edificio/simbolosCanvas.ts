// Símbolos do pilar que passa, nasce ou morre na planta do aplicativo (V7d, K1.4.57): o mesmo símbolo escolhido para as
// pranchas (`b.prancha.simbolos`) desenhado no canvas. As primitivas vêm de src/core/sheets/simbolos.ts.
import { primitivasDoSimbolo, tracoDaPrimitiva } from '../../core/sheets/simbolos';
import type { SimboloPilar } from '../../core/building/types';

type Ponto = [number, number];

/** Desenha o símbolo sobre o contorno do pilar (coordenadas de tela). O contorno do pilar em si é traçado por quem chama. */
export function desenharSimboloPilar(ctx: CanvasRenderingContext2D, pts: Ponto[], simbolo: SimboloPilar, cor: string) {
  const caminho = (p: Ponto[], fechado: boolean) => {
    const path = new Path2D();
    p.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1])));
    if (fechado) path.closePath();
    return path;
  };
  for (const prim of primitivasDoSimbolo(simbolo, pts)) {
    const traco = tracoDaPrimitiva(prim);
    if (prim.t === 'hach') {
      const path = caminho(prim.pts as Ponto[], true);
      if (traco === 'preenchido') { ctx.fillStyle = cor; ctx.fill(path); continue; }
      ctx.save(); ctx.clip(path); ctx.strokeStyle = cor; ctx.lineWidth = 1;
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      ctx.beginPath();
      for (let x = x0 - (y1 - y0); x < x1; x += 5) { ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); }
      ctx.stroke(); ctx.restore();
    } else if (traco === 'fino' && prim.t === 'pl') {
      ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = 1; ctx.stroke(caminho(prim.pts as Ponto[], false)); ctx.restore();
    }
  }
}
