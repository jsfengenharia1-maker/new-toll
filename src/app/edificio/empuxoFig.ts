// Diagrama de pressões de um tipo de empuxo de terra (SVG em texto): na interface com classes do design system
// (.emp-*), no memorial com os tokens do papel. Pressão horizontal × cota, solo e água empilhados, resultante.
import { diagramaEmpuxo } from '../../core/building/empuxo';
import type { TipoEmpuxo } from '../../core/building/types';
import { memo } from '../design/tokens';

const f1 = (v: number) => String(+v.toFixed(1)).replace('.', ',');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function svgEmpuxo(t: TipoEmpuxo, cotaTopo: number, cotaBase: number, modo: 'app' | 'papel'): string {
  const d = diagramaEmpuxo(t, cotaTopo, cotaBase);
  const W = 320, H = 210, L = 46, T = 16, B = 26, R = 20;
  const topo = Math.min(cotaTopo, t.cotaAterro);
  if (!d.pontos.length || topo <= cotaBase) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 40" class="emp-fig" width="100%"><text x="8" y="22" class="emp-txt">Sem pressão neste intervalo de cotas.</text></svg>`;
  const pmax = Math.max(...d.pontos.map((p) => p.total), 1e-6);
  const kx = (W - L - R - 40) / pmax, Y = (c: number) => T + ((topo - c) / (topo - cotaBase)) * (H - T - B);
  const X = (p: number) => L + p * kx;
  const sty = (cls: string, atr: string) => (modo === 'app' ? `class="${cls}"` : atr);
  const solo = d.pontos.map((p) => `${f1(X(p.solo))},${f1(Y(p.cota))}`);
  const tot = d.pontos.map((p) => `${f1(X(p.total))},${f1(Y(p.cota))}`);
  const parede = d.pontos.map((p) => `${f1(L)},${f1(Y(p.cota))}`);
  const polySolo = [...solo, ...[...parede].reverse()].join(' ');
  const polyAgua = [...tot, ...[...solo].reverse()].join(' ');
  const ink = memo('ink'), fig = memo('muted-fig'), cSolo = memo('m'), cAgua = memo('v'), cRes = memo('load');
  const o: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="emp-fig" width="100%"${modo === 'papel' ? ` font-family="${memo('font-fig')}" font-size="10"` : ''}>`];
  o.push(`<polygon points="${polySolo}" ${sty('emp-solo', `fill="${cSolo}" fill-opacity="0.22" stroke="${cSolo}" stroke-width="1.4"`)}/>`);
  if (d.pontos.some((p) => p.agua > 0)) o.push(`<polygon points="${polyAgua}" ${sty('emp-agua', `fill="${cAgua}" fill-opacity="0.22" stroke="${cAgua}" stroke-width="1.2"`)}/>`);
  o.push(`<line x1="${L}" y1="${f1(Y(topo))}" x2="${L}" y2="${f1(Y(cotaBase))}" ${sty('emp-parede', `stroke="${fig}" stroke-width="2.4"`)}/>`);
  // cotas: topo, base, nível d'água, resultante
  const marca = (c: number, rot: string, forte = false) => `<line x1="${L - 5}" y1="${f1(Y(c))}" x2="${L}" y2="${f1(Y(c))}" ${sty('emp-parede', `stroke="${fig}" stroke-width="1"`)}/><text x="${L - 7}" y="${f1(Y(c) + 3)}" text-anchor="end" ${sty(forte ? 'emp-txt forte' : 'emp-txt', `fill="${forte ? ink : fig}"`)}>${esc(rot)}</text>`;
  o.push(marca(topo, f1(topo)), marca(cotaBase, f1(cotaBase)));
  if (t.nivelAgua !== undefined && t.nivelAgua < topo && t.nivelAgua > cotaBase) o.push(marca(t.nivelAgua, `NA ${f1(t.nivelAgua)}`));
  const base = d.pontos[d.pontos.length - 1];
  o.push(`<text x="${f1(X(base.total) + 4)}" y="${f1(Y(base.cota) - 3)}" ${sty('emp-txt forte', `fill="${ink}"`)}>${f1(base.total)} kPa</text>`);
  if (d.resultante > 0) {
    const yr = Y(d.cotaResultante), x1 = L + 4, x0 = X(pmax) + 18;
    o.push(`<line x1="${f1(x0)}" y1="${f1(yr)}" x2="${f1(x1 + 6)}" y2="${f1(yr)}" ${sty('emp-resultante', `stroke="${cRes}" stroke-width="1.6"`)}/><polygon points="${f1(x1)},${f1(yr)} ${f1(x1 + 7)},${f1(yr - 3.5)} ${f1(x1 + 7)},${f1(yr + 3.5)}" ${sty('emp-resultante', `fill="${cRes}" stroke="${cRes}"`)}/>`);
    o.push(`<text x="${f1(x0 + 3)}" y="${f1(yr + 3)}" ${sty('emp-txt forte', `fill="${ink}"`)}>R = ${f1(d.resultante)} kN/m</text>`);
  }
  o.push('</svg>');
  return o.join('');
}
