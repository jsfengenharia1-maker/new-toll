// Recorte de polígonos (Sutherland-Hodgman) para o núcleo: interseção com um polígono convexo anti-horário.
import { areaPoligono, type P } from './faces';

/** Recorte de Sutherland-Hodgman de `sujeito` por um polígono convexo anti-horário. */
export function recorteConvexo(sujeito: P[], clip: P[]): P[] {
  let saida = sujeito;
  for (let i = 0; i < clip.length && saida.length; i++) {
    const a = clip[i], z = clip[(i + 1) % clip.length], ent = saida;
    saida = [];
    const dentro = (p: P) => (z[0] - a[0]) * (p[1] - a[1]) - (z[1] - a[1]) * (p[0] - a[0]) >= -1e-12;
    const cruza = (p: P, q: P): P => {
      const dx = q[0] - p[0], dy = q[1] - p[1], den = (z[0] - a[0]) * dy - (z[1] - a[1]) * dx;
      const t = den ? ((z[0] - a[0]) * (a[1] - p[1]) - (z[1] - a[1]) * (a[0] - p[0])) / den : 0;
      return [p[0] + t * dx, p[1] + t * dy];
    };
    ent.forEach((p, k) => {
      const q = ent[(k + 1) % ent.length], dp = dentro(p), dq = dentro(q);
      if (dp && dq) saida.push(q);
      else if (dp && !dq) saida.push(cruza(p, q));
      else if (!dp && dq) { saida.push(cruza(p, q), q); }
    });
  }
  return saida;
}

/** O polígono é convexo (sem cantos reentrantes)? */
export function ehConvexo(poly: P[]): boolean {
  const n = poly.length;
  let sinal = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], c = poly[(i + 2) % n], cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) < 1e-12) continue;
    if (sinal === 0) sinal = Math.sign(cr); else if (Math.sign(cr) !== sinal) return false;
  }
  return true;
}

/**
 * Interseção de dois polígonos quando ao menos um é convexo (o recortado pode ser qualquer um); sem nenhum convexo devolve `a`
 * sem recorte. Resultado com menos de 3 vértices = vazio.
 */
export function intersecaoPoligonos(a: P[], b: P[]): P[] {
  const ccw = (p: P[]) => (areaPoligono(p) >= 0 ? p : [...p].reverse());
  const r = ehConvexo(b) ? recorteConvexo(a, ccw(b)) : ehConvexo(a) ? recorteConvexo(b, ccw(a)) : a;
  return r.length >= 3 ? r : [];
}
