// Escadas (E4d): geometria dos desenhos da armadura de um lance (elevação desenvolvida e planta), sem estilo: a interface só mapeia
// os segmentos para SVG. Elevação: abscissa = comprimento horizontal acumulado dos trechos (como no corte da E4a), cota z do eixo da
// laje; as barras longitudinais correm a ±(h/2 − cobrimento) do eixo. Planta: cada trecho vira um retângulo (x = sentido do trecho,
// y = largura); as barras longitudinais aparecem em todas as posições da largura e as transversais ao longo do espaçamento.
import type { ResultadoArmaduraLance } from './escadasArmadura';

export interface TrechoDesenho { chave: string; tipo: 'lance' | 'patamar'; x0: number; x1: number; z0: number; z1: number; /** largura (m) */ y1: number }
export interface BarraDesenho {
  pos: string; trecho: string; tipo: string; face: 'inf' | 'sup'; direcao: 'L' | 'T'; rotulo: string;
  /** Elevação: segmentos [x, z]. Planta: segmentos [x, y]. Barras longitudinais: um segmento por posição na elevação; todas as barras na planta. */
  elevacao: [number, number][][];
  planta: [number, number][][];
  /** Ponta com gancho ou dobra (esquerda, direita). */
  ganchos: [boolean, boolean];
}
export interface DesenhoArmadura { largura: number; zMin: number; zMax: number; trechos: TrechoDesenho[]; barras: BarraDesenho[] }

const MAX_SEGMENTOS = 120;

/** Geometria do desenho da armadura de um lance (elevação e planta). Lance com erro: desenho vazio. */
export function desenhoArmaduraLance(l: ResultadoArmaduraLance): DesenhoArmadura {
  const trechos: TrechoDesenho[] = [], barras: BarraDesenho[] = [];
  let x = 0, zMin = Infinity, zMax = -Infinity;
  const h = l.espessura;
  for (const t of l.trechos) {
    const z0 = t.z0, z1 = t.z0 + t.declive * t.comprimento, x0 = x;
    trechos.push({ chave: t.chave, tipo: t.tipo, x0, x1: x0 + t.comprimento, z0, z1, y1: t.largura });
    zMin = Math.min(zMin, z0, z1); zMax = Math.max(zMax, z0, z1);
    const zc = (u: number) => t.z0 + t.declive * u;
    for (const b of t.barras) {
      const sinal = b.face === 'inf' ? -1 : 1, off = sinal * (h / 2 - 0.03);
      const rotulo = `${b.pos} φ${b.phi % 1 ? b.phi.toFixed(1).replace('.', ',') : b.phi} c/${(b.s * 100).toFixed(0)}`;
      const gan: [boolean, boolean] = [b.ganchos[0] > 0, b.ganchos[1] > 0];
      let elevacao: [number, number][][], planta: [number, number][][];
      if (b.direcao === 'L') {
        elevacao = [[[x0 + b.u[0], zc(b.u[0]) + off], [x0 + b.u[1], zc(b.u[1]) + off]]];
        const passo = b.n > 1 ? (t.largura - 0.05) / (b.n - 1) : 0;
        planta = Array.from({ length: Math.min(b.n, MAX_SEGMENTOS) }, (_, i) => [[x0 + b.u[0], 0.025 + i * passo], [x0 + b.u[1], 0.025 + i * passo]] as [number, number][]);
      } else {
        const n = Math.min(b.n, MAX_SEGMENTOS), comp = (b.u[1] - b.u[0]) / Math.max(1, b.n - 1);
        elevacao = Array.from({ length: n }, (_, i) => { const u = b.u[0] + i * comp; return [[x0 + u, zc(u) + off - 0.012], [x0 + u, zc(u) + off + 0.012]] as [number, number][]; });
        planta = Array.from({ length: n }, (_, i) => [[x0 + b.u[0] + i * comp, 0.025], [x0 + b.u[0] + i * comp, t.largura - 0.025]] as [number, number][]);
      }
      barras.push({ pos: b.pos, trecho: t.chave, tipo: b.tipo, face: b.face, direcao: b.direcao, rotulo, elevacao, planta, ganchos: gan });
    }
    x += t.comprimento;
  }
  if (!trechos.length) return { largura: 0, zMin: 0, zMax: 0, trechos, barras };
  return { largura: x, zMin: zMin - h, zMax: zMax + h, trechos, barras };
}
