// Wood-Armer (lajes e escadas): armaduras ortogonais a partir de (mx, my, mxy). Núcleo puro.
/**
 * Wood-Armer (sinal: + traciona embaixo): armadura inferior mx* = mx + |mxy|, my* = my + |mxy|; se um sair
 * negativo, ele vira 0 e o outro = m + mxy²/|m do primeiro|. Superior análogo com sinais trocados (valores ≤ 0).
 */
export function woodArmer(mx: number, my: number, mxy: number): { inf: [number, number]; sup: [number, number] } {
  const t = Math.abs(mxy);
  let ax = mx + t, ay = my + t;
  if (ax < 0) { ax = 0; ay = Math.abs(mx) > 1e-12 ? my + (t * t) / Math.abs(mx) : my; }
  else if (ay < 0) { ay = 0; ax = Math.abs(my) > 1e-12 ? mx + (t * t) / Math.abs(my) : mx; }
  let bx = mx - t, by = my - t;
  if (bx > 0) { bx = 0; by = Math.abs(mx) > 1e-12 ? my - (t * t) / Math.abs(mx) : my; }
  else if (by > 0) { by = 0; bx = Math.abs(my) > 1e-12 ? mx - (t * t) / Math.abs(my) : mx; }
  return { inf: [Math.max(0, ax), Math.max(0, ay)], sup: [Math.min(0, bx), Math.min(0, by)] };
}
