// Cotas automáticas do desenho (vãos e níveis), em coordenadas do modelo (m).
// Usadas no Canvas (e portanto no SVG exportado) e no DXF.
import type { Model } from '../core/types';

/** Ponto cotado: coordenada ao longo da linha de cota e origem da linha de chamada. */
export interface DimStop { v: number; from: number }

/**
 * Cadeia de cotas. dir 'h': linha horizontal em y = at, cotando valores de x.
 * dir 'v': linha vertical em x = at, cotando valores de y.
 */
export interface DimChain { dir: 'h' | 'v'; kind: 'span' | 'total' | 'level' | 'height'; at: number; stops: DimStop[] }

const TOL = 1e-4;
const key = (v: number) => Math.round(v / TOL);

/** Barra tratada como pilar: papel informado ou inclinação acima de 60° (mesmo critério do dimensionamento). */
function isColumn(dx: number, dy: number, role?: string) {
  if (role === 'column') return true;
  if (role === 'beam' || role === 'none') return false;
  return Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI > 60;
}

/** Valores distintos (tolerância de 0,1 mm), ordenados, com a menor coordenada transversal de cada um. */
function distinct(pairs: [number, number][]): DimStop[] {
  const mp = new Map<number, DimStop>();
  for (const [v, from] of pairs) {
    const k = key(v);
    const cur = mp.get(k);
    if (!cur) mp.set(k, { v, from });
    else cur.from = Math.min(cur.from, from);
  }
  return [...mp.values()].sort((a, b) => a.v - b.v);
}

/**
 * Cotas automáticas:
 * - vãos: projeção horizontal entre nós de apoio, nós de pilares e as extremidades da estrutura, abaixo do nó mais baixo;
 * - total horizontal, quando há mais de um vão;
 * - níveis: diferenças entre os níveis (y) distintos dos nós, à esquerda da estrutura;
 * - altura total, quando há mais de dois níveis.
 * first: distância da estrutura à primeira linha de cota; step: distância entre linhas sucessivas (m).
 */
export function autoDims(m: Model, first: number, step = first / 2): DimChain[] {
  if (m.nodes.length < 2) return [];
  const xs = m.nodes.map((n) => n.x), ys = m.nodes.map((n) => n.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  const out: DimChain[] = [];

  if (x1 - x0 > TOL) {
    const keyNodes = new Set<number>();
    for (const n of m.nodes) if (n.support) keyNodes.add(n.id);
    for (const mem of m.members) {
      const p = byId.get(mem.ni), q = byId.get(mem.nj);
      if (p && q && isColumn(q.x - p.x, q.y - p.y, mem.role)) { keyNodes.add(p.id); keyNodes.add(q.id); }
    }
    const pairs: [number, number][] = m.nodes.filter((n) => keyNodes.has(n.id)).map((n) => [n.x, n.y]);
    // extremidades da estrutura (nó mais baixo em cada uma)
    for (const xe of [x0, x1]) {
      const at = m.nodes.filter((n) => Math.abs(n.x - xe) < TOL).map((n) => n.y);
      pairs.push([xe, Math.min(...at)]);
    }
    const stops = distinct(pairs);
    let at = y0 - first;
    out.push({ dir: 'h', kind: 'span', at, stops });
    if (stops.length > 2) { at -= step; out.push({ dir: 'h', kind: 'total', at, stops: [stops[0], stops[stops.length - 1]] }); }
  }

  if (y1 - y0 > TOL) {
    const stops = distinct(m.nodes.map((n) => [n.y, n.x]));
    let at = x0 - first;
    out.push({ dir: 'v', kind: 'level', at, stops });
    if (stops.length > 2) { at -= step; out.push({ dir: 'v', kind: 'height', at, stops: [stops[0], stops[stops.length - 1]] }); }
  }
  return out;
}

/** Trechos cotados de uma cadeia (comprimento de cada intervalo). */
export function dimSegments(c: DimChain): { a: number; b: number; len: number }[] {
  const out: { a: number; b: number; len: number }[] = [];
  for (let i = 0; i + 1 < c.stops.length; i++) out.push({ a: c.stops[i].v, b: c.stops[i + 1].v, len: c.stops[i + 1].v - c.stops[i].v });
  return out;
}

/** Texto de nível com sinal (ex.: +5,00; −1,20; ±0,00). */
export function levelText(y: number): string {
  const r = Math.round(y * 100) / 100;
  if (Math.abs(r) < 0.005) return '±0,00';
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(2).replace('.', ',')}`;
}
