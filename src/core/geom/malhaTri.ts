// Malha triangular (N2b, K1.3.35) para as cascas: Delaunay restrita de um polígono com aberturas e pontos obrigatórios.
// 1) contorno e aberturas divididos com o tamanho local; 2) pontos internos distribuídos com a mesma função de tamanho
// (mais finos junto a cantos, aberturas e pontos obrigatórios); 3) Delaunay por Bowyer-Watson; 4) lados do contorno
// recuperados por troca de diagonais; 5) triângulos fora do domínio removidos; 6) suavização de Laplace dos nós
// internos (só onde não inverte triângulo). `paraT6` acrescenta os nós dos meios dos lados. Código próprio.
import { areaPoligono, type P } from './faces';

export interface OpcoesMalhaTri {
  /** Tamanho alvo dos lados (m). */
  tamanho: number;
  furos?: P[][];
  /** Pontos que precisam ser nós (chegada de vigas, pilares, cargas). */
  obrigatorios?: P[];
  /** Tamanho junto a cantos e pontos obrigatórios, como fração do alvo (padrão 0,5). */
  refino?: number;
}
export interface MalhaTri { pontos: P[]; tris: [number, number, number][] }
export interface MalhaT6 { pontos: P[]; tris: [number, number, number, number, number, number][] }

const orient = (a: P, b: P, c: P) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function distSeg(p: P, a: P, b: P) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
}

/** Dentro do domínio (regra par-ímpar sobre contorno e aberturas). */
function dentro(p: P, aneis: P[][]) {
  let c = false;
  for (const r of aneis) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i], b = r[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

/** Segmentos (a, b) próprios se cruzam (sem contar pontas comuns). */
function cruzam(a: P, b: P, c: P, d: P) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  const e = 1e-12 * Math.max(1, dist(a, b) * dist(c, d));
  return ((o1 > e && o2 < -e) || (o1 < -e && o2 > e)) && ((o3 > e && o4 < -e) || (o3 < -e && o4 > e));
}

/** Delaunay de pontos (Bowyer-Watson com supertriângulo); triângulos anti-horários. */
export function delaunay(pts: P[]): [number, number, number][] {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const d = Math.max(x1 - x0, y1 - y0) || 1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const P2: P[] = [...pts, [cx - 20 * d, cy - 10 * d], [cx + 20 * d, cy - 10 * d], [cx, cy + 20 * d]];
  const n = pts.length;
  type T = { v: [number, number, number]; cx: number; cy: number; r2: number; ok: boolean };
  const circ = (v: [number, number, number]): T => {
    const [a, b, c] = v.map((i) => P2[i]);
    const D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    const a2 = a[0] ** 2 + a[1] ** 2, b2 = b[0] ** 2 + b[1] ** 2, c2 = c[0] ** 2 + c[1] ** 2;
    const ux = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / D, uy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / D;
    return { v, cx: ux, cy: uy, r2: (a[0] - ux) ** 2 + (a[1] - uy) ** 2, ok: true };
  };
  let tris: T[] = [circ([n, n + 1, n + 2])];
  // inserção na ordem de uma curva em zigue-zague (localidade) – a busca é linear, suficiente para alguns milhares de nós
  const linha = (i: number) => Math.floor((pts[i][1] - y0) / (d / 32));
  const ordem = pts.map((_, i) => i).sort((i, j) => linha(i) - linha(j) || (linha(i) % 2 ? pts[j][0] - pts[i][0] : pts[i][0] - pts[j][0]));
  for (const ip of ordem) {
    const p = P2[ip];
    const ruins = tris.filter((t) => t.ok && (p[0] - t.cx) ** 2 + (p[1] - t.cy) ** 2 < t.r2 * (1 + 1e-12));
    const cont = new Map<string, [number, number]>();
    for (const t of ruins) {
      t.ok = false;
      for (let k = 0; k < 3; k++) {
        const a = t.v[k], b = t.v[(k + 1) % 3], kk = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (cont.has(kk)) cont.delete(kk); else cont.set(kk, [a, b]);
      }
    }
    for (const [a, b] of cont.values()) tris.push(circ([a, b, ip]));
    if (tris.length > 4 * (n + 3) + 64) tris = tris.filter((t) => t.ok);
  }
  return tris.filter((t) => t.ok && t.v.every((i) => i < n)).map((t) => t.v);
}

/** Troca diagonais até que o segmento (a, b) seja lado da triangulação (Sloan). */
function recuperar(pts: P[], tris: [number, number, number][], a: number, b: number) {
  const temLado = () => tris.some((t) => t.includes(a) && t.includes(b));
  for (let it = 0; it < 10 * tris.length && !temLado(); it++) {
    let feito = false;
    for (let ti = 0; ti < tris.length && !feito; ti++) for (let k = 0; k < 3 && !feito; k++) {
      const u = tris[ti][k], v = tris[ti][(k + 1) % 3];
      if (u === a || u === b || v === a || v === b || !cruzam(pts[a], pts[b], pts[u], pts[v])) continue;
      const tj = tris.findIndex((t, j) => j !== ti && t.includes(u) && t.includes(v));
      if (tj < 0) continue;
      const w = tris[ti].find((x) => x !== u && x !== v)!, z = tris[tj].find((x) => x !== u && x !== v)!;
      // quadrilátero u-z-v-w convexo: a nova diagonal w-z fica dentro
      if (!cruzam(pts[w], pts[z], pts[u], pts[v])) continue;
      tris[ti] = orient(pts[w], pts[u], pts[z]) > 0 ? [w, u, z] : [w, z, u];
      tris[tj] = orient(pts[w], pts[z], pts[v]) > 0 ? [w, z, v] : [w, v, z];
      feito = true;
    }
    if (!feito) break;
  }
}

/** Malha triangular de lineares (3 nós) do polígono com aberturas. */
export function malhaTriangular(contorno: P[], o: OpcoesMalhaTri): MalhaTri {
  const furos = o.furos ?? [], obr = o.obrigatorios ?? [], h = o.tamanho, fr = o.refino ?? 0.5;
  const aneis = [contorno, ...furos];
  const feicoes: P[] = [...aneis.flat(), ...obr];
  /** Tamanho local: fr·h nas feições, crescendo até h a uma distância de 2h. */
  const tam = (p: P) => { let dm = Infinity; for (const f of feicoes) dm = Math.min(dm, dist(p, f)); return Math.min(h, fr * h + ((1 - fr) * dm) / 2); };
  // 1) contorno e aberturas divididos pelo tamanho local (passo pela média nas pontas do trecho)
  const pts: P[] = [], segs: [number, number][] = [];
  const hash = new Map<string, number>();
  const tolH = h * 1e-6;
  const add = (p: P) => { const k = `${Math.round(p[0] / tolH)}:${Math.round(p[1] / tolH)}`; const j = hash.get(k); if (j !== undefined) return j; hash.set(k, pts.length); pts.push([p[0], p[1]]); return pts.length - 1; };
  for (const r of aneis) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], L = dist(a, b);
      if (L < tolH) continue;
      const ts = [0];
      for (let t = 0; t < 1;) { const p: P = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; const dt = Math.max(1e-3, tam(p) / L); t = Math.min(1, t + dt); ts.push(t); }
      // ajusta para passos uniformes entre as divisões (o último não fica muito curto)
      const n = Math.max(1, ts.length - 1), lista = ts.length > 2 && (ts[n] - ts[n - 1]) * L < 0.5 * tam(b) ? ts.slice(0, -2).concat([1]) : ts;
      const ids = lista.map((t) => add([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]));
      for (let k = 0; k + 1 < ids.length; k++) if (ids[k] !== ids[k + 1]) segs.push([ids[k], ids[k + 1]]);
    }
  }
  // pontos obrigatórios (dentro do domínio ou no contorno)
  for (const p of obr) {
    const naBorda = aneis.some((r) => r.some((a, i) => distSeg(p, a, r[(i + 1) % r.length]) < tolH));
    if (naBorda) {
      // divide o segmento do contorno que o contém
      const si = segs.findIndex(([u, v]) => distSeg(p, pts[u], pts[v]) < tolH);
      const id = add(p);
      if (si >= 0 && segs[si][0] !== id && segs[si][1] !== id) { const [u, v] = segs[si]; segs.splice(si, 1, [u, id], [id, v]); }
    } else if (dentro(p, aneis)) add(p);
  }
  const nFixos = pts.length;
  // 2) pontos internos: grade fina, aceitos à distância ≥ 0,9·tamanho local dos já aceitos (de dentro para fora das feições)
  const xs = contorno.map((p) => p[0]), ys = contorno.map((p) => p[1]);
  const passo = (fr * h) / 2, cel = h, grade = new Map<string, number[]>();
  const chave = (p: P) => `${Math.floor(p[0] / cel)}:${Math.floor(p[1] / cel)}`;
  const regist = (i: number) => { const k = chave(pts[i]); const l = grade.get(k); if (l) l.push(i); else grade.set(k, [i]); };
  for (let i = 0; i < pts.length; i++) regist(i);
  const longe = (p: P, r: number) => {
    const gx = Math.floor(p[0] / cel), gy = Math.floor(p[1] / cel), nc = Math.ceil(r / cel);
    for (let dx = -nc; dx <= nc; dx++) for (let dy = -nc; dy <= nc; dy++) for (const j of grade.get(`${gx + dx}:${gy + dy}`) ?? []) if (dist(p, pts[j]) < r) return false;
    return true;
  };
  const cand: { p: P; s: number }[] = [];
  for (let x = Math.min(...xs) + passo / 2; x < Math.max(...xs); x += passo) for (let y = Math.min(...ys) + passo / 2; y < Math.max(...ys); y += passo) {
    const p: P = [x + (((Math.round(y / passo) % 2) + 2) % 2) * passo * 0.5, y];
    if (!dentro(p, aneis)) continue;
    const s = tam(p);
    let db = Infinity;
    for (const r of aneis) for (let i = 0; i < r.length; i++) db = Math.min(db, distSeg(p, r[i], r[(i + 1) % r.length]));
    if (db < 0.7 * s) continue;
    cand.push({ p, s });
  }
  cand.sort((a, b) => a.s - b.s);
  for (const c of cand) if (longe(c.p, 0.9 * c.s)) { pts.push(c.p); regist(pts.length - 1); }
  // 3) Delaunay, 4) lados do contorno, 5) remoção do que está fora
  let tris = delaunay(pts);
  for (const [a, b] of segs) recuperar(pts, tris, a, b);
  tris = tris.filter((t) => { const c: P = [(pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3]; return dentro(c, aneis) && Math.abs(orient(pts[t[0]], pts[t[1]], pts[t[2]])) > 1e-14 * h * h; });
  // 6) Laplace nos nós internos (não fixos), aceitando só o que não inverte nem degenera
  const viz = new Map<number, Set<number>>(), triNo = new Map<number, number[]>();
  tris.forEach((t, ti) => { for (let k = 0; k < 3; k++) { const a = t[k]; if (!viz.has(a)) viz.set(a, new Set()); viz.get(a)!.add(t[(k + 1) % 3]); viz.get(a)!.add(t[(k + 2) % 3]); (triNo.get(a) ?? triNo.set(a, []).get(a)!).push(ti); } });
  for (let it = 0; it < 3; it++) for (let i = nFixos; i < pts.length; i++) {
    const vz = viz.get(i);
    if (!vz) continue;
    const ant = pts[i], novo: P = [0, 0];
    for (const j of vz) { novo[0] += pts[j][0] / vz.size; novo[1] += pts[j][1] / vz.size; }
    pts[i] = novo;
    if ((triNo.get(i) ?? []).some((ti) => orient(pts[tris[ti][0]], pts[tris[ti][1]], pts[tris[ti][2]]) <= 1e-12 * h * h)) pts[i] = ant;
  }
  // renumera só os pontos usados
  const usado = new Map<number, number>(), out: P[] = [];
  const id = (i: number) => { let j = usado.get(i); if (j === undefined) { j = out.length; usado.set(i, j); out.push(pts[i]); } return j; };
  return { pontos: out, tris: tris.map((t) => [id(t[0]), id(t[1]), id(t[2])] as [number, number, number]) };
}

/** Acrescenta os nós dos meios dos lados (lados retos): [v1, v2, v3, m12, m23, m31]. */
export function paraT6(m: MalhaTri): MalhaT6 {
  const pontos = m.pontos.map((p) => [p[0], p[1]] as P), meio = new Map<string, number>();
  const mid = (a: number, b: number) => {
    const k = a < b ? `${a}:${b}` : `${b}:${a}`;
    let j = meio.get(k);
    if (j === undefined) { j = pontos.length; meio.set(k, j); pontos.push([(m.pontos[a][0] + m.pontos[b][0]) / 2, (m.pontos[a][1] + m.pontos[b][1]) / 2]); }
    return j;
  };
  return { pontos, tris: m.tris.map(([a, b, c]) => [a, b, c, mid(a, b), mid(b, c), mid(c, a)]) };
}

/** Qualidade: menor ângulo interno (graus) e área total. */
export function qualidadeMalha(m: MalhaTri): { anguloMin: number; area: number } {
  let amin = 180, area = 0;
  for (const t of m.tris) {
    const p = t.map((i) => m.pontos[i]);
    area += Math.abs(areaPoligono(p as P[]));
    for (let k = 0; k < 3; k++) {
      const a = p[k], b = p[(k + 1) % 3], c = p[(k + 2) % 3];
      const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - a[0], c[1] - a[1]];
      amin = Math.min(amin, (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))))) * 180) / Math.PI);
    }
  }
  return { anguloMin: amin, area };
}
