// Escolha de barras e ancoragem para blocos, sapatas e tubulões (NBR 6118). Unidades: m, m², MPa.
import { barArea, type Concrete } from './concrete';

export const PHI_FOUND = [8, 10, 12.5, 16, 20, 25];

export interface BarSet { phi: number; n: number; As: number; spacing: number }

/** Barras concentradas numa faixa de largura `width` (armadura principal sobre as estacas). */
export function bandBars(As: number, width: number, dmax: number, nMin = 2, phis = PHI_FOUND): BarSet[] {
  const out: BarSet[] = [];
  if (As <= 0) return out;
  for (const phi of phis) {
    const a = barArea(phi);
    const n = Math.max(nMin, Math.ceil(As / a - 1e-9));
    const smin = Math.max(0.02, phi / 1000, 1.2 * dmax);
    const need = n * (phi / 1000) + (n - 1) * smin;
    if (need > width + 1e-9) continue;
    out.push({ phi, n, As: n * a, spacing: n > 1 ? (width - phi / 1000) / (n - 1) : 0 });
  }
  return out;
}

/** Barras distribuídas numa largura útil `width`, com espaçamento entre smin e smax (malhas de sapata e bloco). */
export function spacedBars(As: number, width: number, smin = 0.1, smax = 0.2, phis = PHI_FOUND): BarSet[] {
  const out: BarSet[] = [];
  if (width <= 0) return out;
  for (const phi of phis) {
    const a = barArea(phi);
    const n = Math.max(2, Math.ceil(As / a - 1e-9), Math.ceil(width / smax - 1e-9) + 1);
    const s = width / (n - 1);
    if (s < smin - 1e-9) continue;
    out.push({ phi, n, As: n * a, spacing: s });
  }
  return out;
}

/** Sugestão: menor área de aço; empate, menos barras. */
export const bestBars = (opts: BarSet[]): BarSet | null => [...opts].sort((a, b) => a.As - b.As || a.n - b.n)[0] ?? null;

/**
 * Comprimento de ancoragem básico (NBR 6118, 9.4.2.4): lb = (φ/4)·fyd/fbd ≥ 25φ,
 * fbd = η1·η2·η3·fctd com η1 = 2,25 (CA-50 nervurada), η2 = 1,0 (boa aderência), η3 = 1,0 (φ < 32 mm).
 */
export function anchorageLength(phiMm: number, c: Concrete, fyd: number): number {
  const fbd = 2.25 * c.fctd;
  return Math.max(((phiMm / 1000) / 4) * (fyd / fbd), 25 * (phiMm / 1000));
}

export const ceil05 = (v: number) => Math.ceil(v / 0.05 - 1e-9) * 0.05;
