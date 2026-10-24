// Desenho da escada na planta (E4b): contornos, degraus em traço fino, setas de subida e a referência, em canvas como as demais
// camadas da Planta. A geometria vem de `desenhoPlantaEscada` (núcleo); a mesma função serve a escada lançada, a selecionada e a
// prévia do cursor (tracejada; na cor de erro quando a geometria não fecha).
import type { DesenhoPlantaEscada } from '../../core/building/escadasEdicao';
import type { Paleta } from './plantaStore';

type P2 = [number, number];
export interface EstiloEscada { previa?: boolean; erro?: boolean; selecionada?: boolean; rotulo?: boolean }

export function desenharEscadaCanvas(ctx: CanvasRenderingContext2D, d: DesenhoPlantaEscada, paraTela: (x: number, y: number) => P2, cores: Paleta, o: EstiloEscada = {}): void {
  const traco = o.erro ? cores.erro : o.selecionada ? cores.selecao : cores.laje;
  ctx.save();
  ctx.strokeStyle = traco; ctx.fillStyle = traco;
  if (o.previa) ctx.setLineDash([6, 4]);
  // contornos (degraus iniciais, trechos e patamares)
  ctx.lineWidth = o.selecionada ? 2.4 : 1.6;
  for (const poli of d.contornos) {
    if (poli.length < 2) continue;
    ctx.beginPath();
    poli.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.globalAlpha = o.previa ? 0.12 : 0.1; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
  }
  // degraus em traço fino
  ctx.lineWidth = 0.8; ctx.globalAlpha = 0.85;
  ctx.beginPath();
  for (const [a, z] of d.degraus) { const [x0, y0] = paraTela(a[0], a[1]), [x1, y1] = paraTela(z[0], z[1]); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
  ctx.stroke(); ctx.globalAlpha = 1;
  // setas de subida (haste e pontas)
  ctx.lineWidth = 1.4; ctx.setLineDash([]);
  ctx.beginPath();
  for (const [a, z] of d.setas) { const [x0, y0] = paraTela(a[0], a[1]), [x1, y1] = paraTela(z[0], z[1]); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
  ctx.stroke();
  // referência (nome) no centro
  if (o.rotulo !== false && d.rotulo && d.nome) {
    const [x, y] = paraTela(d.rotulo[0], d.rotulo[1]);
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = cores.texto; ctx.fillText(d.nome, x, y);
  }
  ctx.restore();
}
