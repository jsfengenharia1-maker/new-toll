import type { SectionShape } from './types';
import { polyProps } from './fiber';

export interface SectionProps {
  A: number; // m²
  I: number; // m⁴ (eixo de flexão no plano)
  h: number; // altura (m)
  As: number; // área efetiva ao cisalhamento (m²)
  yc: number; // centroide a partir da base (m)
}

/** Propriedades geométricas de seções compostas por retângulos empilhados (base → topo). */
function stacked(parts: { b: number; h: number }[]): { A: number; I: number; h: number; yc: number } {
  let A = 0, S = 0, y = 0;
  const geo = parts.map((p) => { const g = { ...p, y0: y }; y += p.h; return g; });
  for (const g of geo) { const a = g.b * g.h; A += a; S += a * (g.y0 + g.h / 2); }
  const yc = S / A;
  let I = 0;
  for (const g of geo) { const a = g.b * g.h; const d = g.y0 + g.h / 2 - yc; I += (g.b * g.h ** 3) / 12 + a * d * d; }
  return { A, I, h: y, yc };
}

export function sectionProps(s: SectionShape): SectionProps {
  switch (s.kind) {
    case 'generic':
      return { A: s.A, I: s.I, h: s.h, As: s.As ?? s.A / 1.2, yc: s.h / 2 };
    case 'rect': {
      const A = s.b * s.h;
      return { A, I: (s.b * s.h ** 3) / 12, h: s.h, As: A / 1.2, yc: s.h / 2 };
    }
    case 'circle': {
      const A = (Math.PI * s.d ** 2) / 4;
      return { A, I: (Math.PI * s.d ** 4) / 64, h: s.d, As: (0.9 * A), yc: s.d / 2 };
    }
    case 'tube': {
      const di = s.d - 2 * s.t;
      const A = (Math.PI * (s.d ** 2 - di ** 2)) / 4;
      return { A, I: (Math.PI * (s.d ** 4 - di ** 4)) / 64, h: s.d, As: A / 2, yc: s.d / 2 };
    }
    case 'tee': {
      const g = stacked([{ b: s.bw, h: s.h - s.tf }, { b: s.bf, h: s.tf }]);
      return { ...g, As: s.bw * s.h };
    }
    case 'ishape': {
      const g = stacked([{ b: s.bf, h: s.tf }, { b: s.tw, h: s.h - 2 * s.tf }, { b: s.bf, h: s.tf }]);
      return { ...g, As: s.tw * s.h };
    }
    case 'polygon': {
      const p = polyProps(s.pts);
      return { A: p.A, I: p.Ix, h: p.ymax - p.ymin, As: p.A / 1.2, yc: p.cy - p.ymin };
    }
    case 'box': {
      const g = stacked([{ b: s.b, h: s.t }, { b: 2 * s.t, h: s.h - 2 * s.t }, { b: s.b, h: s.t }]);
      return { ...g, As: 2 * s.t * s.h };
    }
  }
}
