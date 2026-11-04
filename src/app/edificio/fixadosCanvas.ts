// Alfinete dos elementos fixados na planta (canvas da interação): uma cabeça redonda com a agulha, no centro do elemento.
import { ancoraDoElemento } from '../../core/building/fixacao';
import type { BuildingModel } from '../../core/building/types';

export function desenharFixados(ctx: CanvasRenderingContext2D, b: BuildingModel, grupo: string, paraTela: (x: number, y: number) => [number, number], cor: string): void {
  if (!b.fixados?.length) return;
  ctx.save();
  ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  for (const id of b.fixados) {
    const a = ancoraDoElemento(b, id, grupo);
    if (!a) continue;
    const [x, y] = paraTela(a[0], a[1]);
    // agulha para baixo e à esquerda; cabeça acima e à direita
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y - 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 8, y - 8, 3, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.restore();
}
