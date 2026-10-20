// Geometria plana de polígonos convexos.

type P = [number, number];

/** Polígonos convexos se sobrepõem (teste de eixo separador)? Encostar numa face não conta. */
export function sobrepoe(a: P[], b: P[], tol = 1e-6): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const nx = q[1] - p[1], ny = p[0] - q[0], L = Math.hypot(nx, ny);
      if (!L) continue;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const v of a) { const t = (v[0] * nx + v[1] * ny) / L; a0 = Math.min(a0, t); a1 = Math.max(a1, t); }
      for (const v of b) { const t = (v[0] * nx + v[1] * ny) / L; b0 = Math.min(b0, t); b1 = Math.max(b1, t); }
      if (a1 <= b0 + tol || b1 <= a0 + tol) return false;
    }
  }
  return true;
}
