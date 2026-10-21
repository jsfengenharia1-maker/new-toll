// Cadeia de segmentos ligados (polilinha de uma máscara DXF explodida em segmentos): usada para capturar um limite
// de fundação (divisa, poço, reservatório) com um clique sobre o desenho.
export type Pt = [number, number];

export interface Cadeia { pontos: Pt[]; fechada: boolean }

const dist = (a: Pt, z: Pt) => Math.hypot(a[0] - z[0], a[1] - z[1]);

/** Distância do ponto ao segmento. */
function distSeg(p: Pt, a: Pt, z: Pt) {
  const dx = z[0] - a[0], dy = z[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
}

/**
 * Cadeia de segmentos ([x1, y1, x2, y2, ...], em m) que contém o segmento mais próximo do ponto `p` (a até `raio`).
 * Segue as pontas coincidentes (tolerância `tol`) nos dois sentidos e para num nó com mais de dois segmentos
 * ou na falta de continuação; se voltar ao início, a cadeia é fechada. Colineares consecutivos viram um só trecho.
 * Sem segmento no raio, devolve null.
 */
export function cadeiaDeSegmentos(segs: ArrayLike<number>, p: Pt, raio: number, tol = 1e-3): Cadeia | null {
  const n = Math.floor(segs.length / 4);
  const S = (i: number): [Pt, Pt] => [[segs[4 * i], segs[4 * i + 1]], [segs[4 * i + 2], segs[4 * i + 3]]];
  let ini = -1, melhor = raio;
  for (let i = 0; i < n; i++) { const [a, z] = S(i); if (dist(a, z) < tol / 2) continue; const d = distSeg(p, a, z); if (d <= melhor) { melhor = d; ini = i; } }
  if (ini < 0) return null;
  const chave = (q: Pt) => `${Math.round(q[0] / tol)},${Math.round(q[1] / tol)}`;
  const pontas = new Map<string, { i: number; fim: 0 | 1 }[]>();
  for (let i = 0; i < n; i++) {
    const s = S(i);
    if (dist(s[0], s[1]) < tol / 2) continue;
    for (const fim of [0, 1] as const) { const k = chave(s[fim]); const l = pontas.get(k) ?? []; l.push({ i, fim }); pontas.set(k, l); }
  }
  const vizinhos = (q: Pt) => {
    const out: { i: number; fim: 0 | 1 }[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) out.push(...(pontas.get(`${Math.round(q[0] / tol) + dx},${Math.round(q[1] / tol) + dy}`) ?? []));
    return out.filter((v) => dist(S(v.i)[v.fim], q) <= tol);
  };
  const usados = new Set<number>([ini]);
  const [a0, z0] = S(ini);
  /** Estende a partir de `q` (ponta livre da cadeia) até o nó, o fim ou o retorno a `alvo`. */
  const estender = (q: Pt, alvo: Pt): { pts: Pt[]; fechou: boolean } => {
    const pts: Pt[] = [];
    let atual = q;
    for (;;) {
      const todos = vizinhos(atual);
      const livres = todos.filter((x) => !usados.has(x.i));
      if (todos.length > 2) return { pts, fechou: false };
      if (livres.length === 0) return { pts, fechou: dist(atual, alvo) <= tol };
      const prox = livres[0];
      usados.add(prox.i);
      const s = S(prox.i), outra = s[prox.fim === 0 ? 1 : 0];
      pts.push(outra);
      atual = outra;
    }
  };
  const frente = estender(z0, a0);
  let pontos: Pt[] = [a0, z0, ...frente.pts];
  let fechada = frente.fechou;
  if (!fechada) {
    const tras = estender(a0, z0);
    pontos = [...tras.pts.reverse(), ...pontos];
    fechada = tras.fechou;
  }
  if (fechada && pontos.length > 1 && dist(pontos[0], pontos[pontos.length - 1]) <= tol) pontos.pop();
  const lim: Pt[] = [];
  for (const q of pontos) if (!lim.length || dist(lim[lim.length - 1], q) > tol / 2) lim.push(q);
  const col = (a: Pt, b: Pt, c: Pt) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-9 * (1 + dist(a, c));
  const out: Pt[] = [];
  for (let i = 0; i < lim.length; i++) {
    const ant = lim[(i - 1 + lim.length) % lim.length], prox = lim[(i + 1) % lim.length];
    const extremo = !fechada && (i === 0 || i === lim.length - 1);
    if (!extremo && col(ant, lim[i], prox)) continue;
    out.push(lim[i]);
  }
  return { pontos: out, fechada: fechada && out.length >= 3 };
}
