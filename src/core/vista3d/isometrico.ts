// Isométrico estático em SVG da mesma `Cena3D`: projeção ortográfica, descarte das faces de costas e ordenação das
// faces do fundo para a frente (algoritmo do pintor). É o plano B sem WebGL ou sem o vendor do three, e a figura do
// memorial. As cores vêm das classes `v3d-<tipo>` e `v3d-sh0…3` (global.css e memorial.css): nada de cor aqui.
import { eixosDaCamera, type Camera3D, type V3 } from './camera';
import type { Cena3D } from './registro';

export interface OpcoesIsometrico {
  azimute?: number;
  elevacao?: number;
  /** Elementos a realçar (ids de elemento, os mesmos da planta). */
  destaque?: Set<string>;
  /** Largura do SVG em px (a altura segue a proporção); omitido = só viewBox, para a figura se ajustar ao contêiner. */
  largura?: number;
  /** Cores por tipo (quatro tons, do mais claro ao mais escuro; chave `sel` para o destaque e `pendente`): o SVG sai com atributos fill/stroke em vez de classes, para o papel (memorial). */
  cores?: Record<string, string[]>;
  /** Limite de faces desenhadas (cenas enormes viram amostra com aviso no `title`). */
  maxFaces?: number;
}

export interface ResultadoIsometrico { svg: string; objetos: string[]; faces: number }

const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function isometricoSvg(c: Cena3D, o: OpcoesIsometrico = {}): ResultadoIsometrico {
  const cam: Camera3D = { alvo: [0, 0, 0], dist: 1, azimute: o.azimute ?? (-55 * Math.PI) / 180, elevacao: o.elevacao ?? (28 * Math.PI) / 180, fov: 45, projecao: 'isometrica' };
  const { direita, cima, frente } = eixosDaCamera(cam);
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // luz fixa na vista: de cima, da esquerda e de frente
  const luz: V3 = [0, 1, 2].map((k) => -0.45 * frente[k] + 0.7 * cima[k] - 0.35 * direita[k]) as V3;
  const nl = Math.hypot(...luz);

  interface Face { id: string; elemento: string; tipo: string; pendente: boolean; prof: number; k: number; pts: number[] }
  const faces: Face[] = [];
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  const proj = (x: number, y: number, z: number): [number, number, number] => {
    const p: V3 = [x, y, z];
    return [dot(p, direita) * 100, -dot(p, cima) * 100, dot(p, frente)]; // cm; y para baixo na tela
  };
  for (const ob of c.objetos) {
    const P = ob.pos, I = ob.idx;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, d = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[d] - P[a], vy = P[d + 1] - P[a + 1], vz = P[d + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const ln = Math.hypot(nx, ny, nz);
      if (ln < 1e-12) continue;
      nx /= ln; ny /= ln; nz /= ln;
      if (nx * frente[0] + ny * frente[1] + nz * frente[2] >= -1e-9) continue; // de costas
      const l = Math.max(0, (nx * luz[0] + ny * luz[1] + nz * luz[2]) / nl);
      const k = Math.min(3, Math.floor((1 - l) * 4));
      const p0 = proj(P[a], P[a + 1], P[a + 2]), p1 = proj(P[b], P[b + 1], P[b + 2]), p2 = proj(P[d], P[d + 1], P[d + 2]);
      for (const q of [p0, p1, p2]) { xmin = Math.min(xmin, q[0]); xmax = Math.max(xmax, q[0]); ymin = Math.min(ymin, q[1]); ymax = Math.max(ymax, q[1]); }
      faces.push({ id: ob.id, elemento: ob.elemento, tipo: ob.pendente ? 'pendente' : ob.tipo, pendente: !!ob.pendente, prof: (p0[2] + p1[2] + p2[2]) / 3, k, pts: [p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]] });
    }
  }
  const total = faces.length;
  let usadas = faces;
  if (o.maxFaces && total > o.maxFaces) usadas = faces.filter((_, i) => i % Math.ceil(total / o.maxFaces!) === 0);
  usadas.sort((p, q) => q.prof - p.prof); // mais longe primeiro
  if (!faces.length) { xmin = 0; xmax = 100; ymin = 0; ymax = 100; }
  const mg = 12, w = xmax - xmin + 2 * mg, h = ymax - ymin + 2 * mg;
  const partes: string[] = [];
  let atual: { cls: string; id: string; d: string; atr: string } | null = null;
  const fecha = () => { if (atual) partes.push(`<path ${atual.atr}data-id="${esc(atual.id)}" d="${atual.d}"/>`); atual = null; };
  for (const f of usadas) {
    const sel = !!o.destaque?.has(f.elemento);
    const cls = `v3d-f v3d-${f.tipo} v3d-sh${f.k}${f.pendente ? ' v3d-pend' : ''}${sel ? ' v3d-sel' : ''}`;
    const d = `M${f1(f.pts[0])} ${f1(f.pts[1])}L${f1(f.pts[2])} ${f1(f.pts[3])}L${f1(f.pts[4])} ${f1(f.pts[5])}Z`;
    let atr = `class="${cls}" `;
    if (o.cores) {
      const tons = (sel ? o.cores.sel : o.cores[f.tipo]) ?? o.cores.pilar, cor = tons[sel ? 0 : f.k] ?? tons[0];
      atr = `fill="${cor}" stroke="${cor}" stroke-width="0.5" stroke-linejoin="round"${f.pendente ? ' fill-opacity="0.35"' : ''} `;
    }
    if (atual && atual.atr === atr && atual.id === f.id) atual.d += d;
    else { fecha(); atual = { cls, id: f.id, d, atr }; }
  }
  fecha();
  // marcas "?" dos panos a definir (só os rótulos cujo objeto aparece)
  const rot = c.rotulos.map((r) => { const q = proj(r.x, r.y, r.z); return `<text ${o.cores ? `fill="${o.cores.pendente?.[0] ?? ''}" font-size="40" font-weight="bold"` : 'class="v3d-rotulo"'} x="${f1(q[0])}" y="${f1(q[1])}" text-anchor="middle">${esc(r.texto)}</text>`; });
  const dim = o.largura ? ` width="${o.largura}" height="${Math.round((o.largura * h) / w)}"` : '';
  const aviso = usadas.length < total ? `<title>Amostra de ${usadas.length} de ${total} faces</title>` : '';
  const svg = `<svg class="v3d-iso" xmlns="http://www.w3.org/2000/svg" viewBox="${f1(xmin - mg)} ${f1(ymin - mg)} ${f1(w)} ${f1(h)}"${dim} role="img" aria-label="Vista isométrica do edifício">${aviso}${partes.join('')}${rot.join('')}</svg>`;
  return { svg, objetos: [...new Set(usadas.map((f) => f.id))], faces: usadas.length };
}
