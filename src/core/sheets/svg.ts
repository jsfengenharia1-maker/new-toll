// Prancha em SVG (prévia na interface): mesma geometria do PDF, com y para cima convertido.
import { CAMADAS, TRACOS, type Prancha } from './prancha';
import { dyBase, primitivasNoPapel } from './papel';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const n = (v: number) => +v.toFixed(2);

export function svgPrancha(pr: Prancha): string {
  const H = pr.H, Y = (y: number) => n(H - y);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pr.W} ${pr.H}" font-family="Helvetica, Arial, sans-serif" stroke-linecap="round" stroke-linejoin="round">`, `<rect width="${pr.W}" height="${pr.H}" fill="#fff"/>`];
  for (const q of primitivasNoPapel(pr)) {
    const cam = CAMADAS[q.c], w = cam.pena, tr = cam.tipo === 'cont' ? '' : ` stroke-dasharray="${TRACOS[cam.tipo].join(' ')}"`;
    const attr = `data-camada="${q.c}"`;
    if (q.t === 'pl') out.push(`<${q.fechada ? 'polygon' : 'polyline'} ${attr} points="${q.pts.map((p) => `${n(p[0])},${Y(p[1])}`).join(' ')}" fill="none" stroke="#000" stroke-width="${w}"${tr}/>`);
    else if (q.t === 'hach') out.push(`<polygon ${attr} points="${q.pts.map((p) => `${n(p[0])},${Y(p[1])}`).join(' ')}" fill="#9a9a9a" stroke="none"/>`);
    else if (q.t === 'circ') out.push(`<circle ${attr} cx="${n(q.centro[0])}" cy="${Y(q.centro[1])}" r="${n(q.r)}" fill="none" stroke="#000" stroke-width="${w}"/>`);
    else {
      const anchor = q.ah === 'c' ? 'middle' : q.ah === 'd' ? 'end' : 'start';
      const a = q.ang ?? 0, rad = (a * Math.PI) / 180, dy = dyBase(q.av, q.h);
      const x = q.p[0] - Math.sin(rad) * dy, y = q.p[1] + Math.cos(rad) * dy;
      out.push(`<text ${attr} x="${n(x)}" y="${Y(y)}" font-size="${n(q.h / 0.718)}" text-anchor="${anchor}"${a ? ` transform="rotate(${n(-a)} ${n(x)} ${Y(y)})"` : ''}>${esc(q.s)}</text>`);
    }
  }
  if (pr.logo) { const L = pr.logo; out.push(`<image data-camada="LOGO" x="${n(L.x0)}" y="${Y(L.y1)}" width="${n(L.x1 - L.x0)}" height="${n(L.y1 - L.y0)}" preserveAspectRatio="none" href="data:image/jpeg;base64,${L.dados}"/>`); }
  out.push('</svg>');
  return out.join('\n');
}
