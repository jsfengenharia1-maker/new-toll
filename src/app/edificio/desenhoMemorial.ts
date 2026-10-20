// Planta de fôrma esquemática de um grupo, em SVG estático (cores do papel: design/memorial.css).
import { contornoPilar, geometriaViga, lancesDoPilar, secaoNoLance, type BuildingModel } from '../../core/building/types';
import { memo } from '../design/tokens';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function svgPlantaGrupo(b: BuildingModel, grupo: string, falhas: Set<string> = new Set()): string {
  const pavs = b.pavimentos.filter((p) => p.grupo === grupo);
  if (!pavs.length || (!b.vigas.some((v) => v.grupo === grupo) && !b.lajes.some((l) => l.grupo === grupo))) return '';
  const pav = pavs[0].id;
  const lajes = b.lajes.filter((l) => l.grupo === grupo), vigas = b.vigas.filter((v) => v.grupo === grupo);
  const pilares = b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === pav));
  const pts = [...lajes.flatMap((l) => l.contorno), ...vigas.flatMap((v) => v.pontos), ...pilares.flatMap((p) => contornoPilar(p, secaoNoLance(p, pav)))];
  if (!pts.length) return '';
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 0.8, x1 = Math.max(...xs) + 0.8, y0 = Math.min(...ys) - 0.8, y1 = Math.max(...ys) + 0.8;
  const W = 640, s = Math.min(W / (x1 - x0), 520 / (y1 - y0)), H = (y1 - y0) * s;
  const X = (x: number) => ((x - x0) * s).toFixed(1), Y = (y: number) => ((y1 - y) * s).toFixed(1);
  const poly = (p: [number, number][]) => p.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
  const fs = Math.max(8, Math.min(11, s * 0.35));
  const out: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H.toFixed(0)}" width="100%" style="max-height:120mm" font-family="${memo('font-fig')}" font-size="${fs.toFixed(1)}">`];
  for (const l of lajes) {
    out.push(`<polygon points="${poly(l.contorno)}" fill="${memo('laje')}" stroke="${memo('laje-line')}" stroke-width="0.6"/>`);
    const cx = l.contorno.reduce((t, p) => t + p[0], 0) / l.contorno.length, cy = l.contorno.reduce((t, p) => t + p[1], 0) / l.contorno.length;
    const h = l.tipo.tipo === 'macica' ? `h=${Math.round(l.tipo.h * 100)}` : l.tipo.modelo;
    out.push(`<text x="${X(cx)}" y="${Y(cy)}" text-anchor="middle" fill="${memo('laje-ink')}">${esc(l.nome)} (${h})</text>`);
  }
  for (const v of vigas) {
    const g = geometriaViga(v), cor = falhas.has(v.id) ? memo('falha') : memo('ink');
    out.push(`<polygon points="${poly([...g.esq, ...[...g.dir].reverse()])}" fill="${memo('paper')}" stroke="${cor}" stroke-width="0.9"/>`);
    const m = Math.floor((v.pontos.length - 1) / 2), a = v.pontos[m], z = v.pontos[m + 1];
    const ang = (-Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI, rot = ang > 90 || ang < -90 ? ang + 180 : ang;
    const mx = (a[0] + z[0]) / 2, my = (a[1] + z[1]) / 2;
    out.push(`<text x="${X(mx)}" y="${Y(my)}" dy="${(-(v.secao.b / 2) * s - 3).toFixed(1)}" text-anchor="middle" fill="${cor}" transform="rotate(${rot.toFixed(1)} ${X(mx)} ${Y(my)})">${esc(v.nome)} ${Math.round(v.secao.b * 100)}×${Math.round(v.secao.h * 100)}</text>`);
  }
  for (const p of pilares) {
    const c = contornoPilar(p, secaoNoLance(p, pav)), cor = falhas.has(p.id) ? memo('falha') : memo('ink');
    out.push(`<polygon points="${poly(c)}" fill="${cor}"/>`);
    const mx = Math.max(...c.map((q) => q[0])), my = Math.max(...c.map((q) => q[1]));
    out.push(`<text x="${X(mx)}" y="${Y(my)}" dx="2" dy="-2" fill="${cor}" font-weight="bold">${esc(p.nome)}</text>`);
  }
  out.push('</svg>');
  return out.join('');
}
