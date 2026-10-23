// Campos escalares sobre malha triangular (V4): triangulação dos nós, níveis automáticos 1-2-5, isolinhas (marching
// triangles), bandas de cor entre níveis, limites mínimo e máximo, extremos, legenda e saídas (SVG, DXF e CSV).
// Núcleo puro: cores só por índice de token (--iso-0 … --iso-10); quem desenha traduz o índice na cor do tema.
export type P = [number, number];

/** Número de tokens da escala de cor (`--iso-0` … `--iso-10`, de global.css; classes `.iso-<n>`). */
export const N_TOKENS_ISO = 11;

export interface Campo {
  nos: P[];
  /** Valor em cada nó. */
  valores: number[];
  /** Triângulos (índices dos nós, três a três). */
  triangulos: number[];
  grandeza: string;
  unidade: string;
  /** Rótulo legível (ex.: "Mx — combinação ELU 1"). */
  rotulo?: string;
  /** Laje (ou radier) de cada triângulo, para o clique no mapa. */
  elementoDoTriangulo?: string[];
  /** Contornos dos elementos (anti-horários) e furos, para desenhar o limite do mapa. */
  contornos?: P[][];
}

export interface Limites { min?: number; max?: number }

const area2 = (a: P, b: P, c: P) => (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);

/** Área do triângulo i do campo. */
export function areaTriangulo(c: Campo, i: number): number {
  return Math.abs(area2(c.nos[c.triangulos[3 * i]], c.nos[c.triangulos[3 * i + 1]], c.nos[c.triangulos[3 * i + 2]])) / 2;
}
/** Soma das áreas dos triângulos do campo (m²). */
export function areaDoCampo(c: Campo): number {
  let s = 0;
  for (let i = 0; i < c.triangulos.length / 3; i++) s += areaTriangulo(c, i);
  return s;
}

// ------------------------------------------------------------------ triangulação

function dentroPoli(p: P, poly: P[]): boolean {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro;
  }
  return dentro;
}

/**
 * Triangulação de Delaunay dos nós (Bowyer-Watson) recortada pelo contorno e pelos furos: ficam os triângulos
 * cujo baricentro está dentro do contorno e fora dos furos. Triângulos degenerados são descartados.
 */
export function triangularNos(nos: P[], contorno?: P[], furos: P[][] = []): number[] {
  const n = nos.length;
  if (n < 3) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of nos) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const d = Math.max(x1 - x0, y1 - y0, 1e-9) * 20, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const pts: P[] = [...nos, [cx - d, cy - d], [cx + d, cy - d], [cx, cy + d]];
  type T = { a: number; b: number; c: number; ux: number; uy: number; r2: number };
  const circ = (a: number, b: number, c: number): T => {
    const [ax, ay] = pts[a], [bx, by] = pts[b], [cx2, cy2] = pts[c];
    const dd = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
    if (Math.abs(dd) < 1e-18) return { a, b, c, ux: 0, uy: 0, r2: Infinity };
    const ux = ((ax * ax + ay * ay) * (by - cy2) + (bx * bx + by * by) * (cy2 - ay) + (cx2 * cx2 + cy2 * cy2) * (ay - by)) / dd;
    const uy = ((ax * ax + ay * ay) * (cx2 - bx) + (bx * bx + by * by) * (ax - cx2) + (cx2 * cx2 + cy2 * cy2) * (bx - ax)) / dd;
    return { a, b, c, ux, uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };
  let tris: T[] = [circ(n, n + 1, n + 2)];
  // inserção por ordem espacial (varredura em x) para manter os triângulos ruins próximos
  const ordem = Array.from({ length: n }, (_, i) => i).sort((i, j) => nos[i][0] - nos[j][0] || nos[i][1] - nos[j][1]);
  for (const i of ordem) {
    const [px, py] = pts[i];
    const ruins: T[] = [], bons: T[] = [];
    for (const t of tris) ((px - t.ux) ** 2 + (py - t.uy) ** 2 < t.r2 * (1 - 1e-12) ? ruins : bons).push(t);
    const arestas = new Map<string, [number, number, number]>();
    for (const t of ruins) for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
      const k = u < v ? `${u}_${v}` : `${v}_${u}`, e = arestas.get(k);
      arestas.set(k, [u, v, (e ? e[2] : 0) + 1]);
    }
    for (const [u, v, q] of arestas.values()) if (q === 1) bons.push(circ(u, v, i));
    tris = bons;
  }
  const out: number[] = [];
  for (const t of tris) {
    if (t.a >= n || t.b >= n || t.c >= n) continue;
    const A = nos[t.a], B = nos[t.b], C = nos[t.c], ar = area2(A, B, C);
    if (Math.abs(ar) < 1e-12) continue;
    const g: P = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
    if (contorno && contorno.length >= 3 && !dentroPoli(g, contorno)) continue;
    if (furos.some((f) => f.length >= 3 && dentroPoli(g, f))) continue;
    if (ar > 0) out.push(t.a, t.b, t.c); else out.push(t.a, t.c, t.b);
  }
  return out;
}

/** Campo sobre os nós dados com a função `f` (útil para campos analíticos): triangula e avalia nos nós. */
export function campoDeFuncao(nos: P[], f: (x: number, y: number) => number, grandeza = 'f', unidade = '', contorno?: P[], furos?: P[][]): Campo {
  return { nos, valores: nos.map(([x, y]) => f(x, y)), triangulos: triangularNos(nos, contorno, furos), grandeza, unidade, ...(contorno ? { contornos: [contorno, ...(furos ?? [])] } : {}) };
}

/** Nós de uma grade regular `nx × ny` células sobre o retângulo [x0,x1] × [y0,y1] (para campos analíticos e testes). */
export function gradeRetangular(x0: number, y0: number, x1: number, y1: number, nx: number, ny: number): P[] {
  const out: P[] = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) out.push([x0 + ((x1 - x0) * i) / nx, y0 + ((y1 - y0) * j) / ny]);
  return out;
}

// ------------------------------------------------------------------ níveis, extremos e limites

/** Faixa de valores do campo (mínimo e máximo dos nós usados pelos triângulos; sem triângulos, de todos). */
export function faixaDoCampo(c: Campo): { min: number; max: number } {
  const usados = new Set<number>(c.triangulos);
  let min = Infinity, max = -Infinity;
  const ids = usados.size ? [...usados] : c.valores.map((_, i) => i);
  for (const i of ids) { const v = c.valores[i]; if (Number.isFinite(v)) { min = Math.min(min, v); max = Math.max(max, v); } }
  return Number.isFinite(min) ? { min, max } : { min: 0, max: 0 };
}

/** Passo "agradável" (1, 2, 2,5 ou 5 × 10ⁿ) que dá cerca de `alvo` intervalos entre `min` e `max`. */
export function passoAgradavel(min: number, max: number, alvo = 10): number {
  const amp = max - min;
  if (!(amp > 0)) return 1;
  const bruto = amp / Math.max(1, alvo), pot = 10 ** Math.floor(Math.log10(bruto)), r = bruto / pot;
  return (r <= 1.2 ? 1 : r <= 2.2 ? 2 : r <= 3.5 ? 2.5 : r <= 7 ? 5 : 10) * pot;
}

/** Níveis automáticos (múltiplos do passo agradável) estritamente dentro de (min, max). */
export function niveisAutomaticos(min: number, max: number, alvo = 10): number[] {
  const passo = passoAgradavel(min, max, alvo), eps = passo * 1e-9, out: number[] = [];
  const dec = Math.max(0, 3 - Math.floor(Math.log10(passo)));
  for (let k = Math.ceil(min / passo - 1e-9); k * passo <= max + eps; k++) {
    const v = +(k * passo).toFixed(Math.min(12, dec + 2));
    if (v > min + eps && v < max - eps) out.push(v);
  }
  return out;
}

/** Níveis definidos pelo usuário: ordena, remove repetidos e não finitos. */
export function niveisDefinidos(v: number[]): number[] {
  return [...new Set(v.filter(Number.isFinite))].sort((a, b) => a - b);
}

export interface Extremo { no: number; valor: number; pos: P }

/**
 * Pontos de máximo e de mínimo do campo. Com `limites`, só entram os nós cujo valor está dentro deles
 * (um limite sozinho localiza o extremo do outro lado da faixa).
 */
export function extremos(c: Campo, lim: Limites = {}): { min: Extremo | null; max: Extremo | null } {
  const usados = new Set<number>(c.triangulos.length ? c.triangulos : c.valores.map((_, i) => i));
  let mn: Extremo | null = null, mx: Extremo | null = null;
  for (const i of usados) {
    const v = c.valores[i];
    if (!Number.isFinite(v) || (lim.min !== undefined && v < lim.min - 1e-12) || (lim.max !== undefined && v > lim.max + 1e-12)) continue;
    if (!mn || v < mn.valor) mn = { no: i, valor: v, pos: c.nos[i] };
    if (!mx || v > mx.valor) mx = { no: i, valor: v, pos: c.nos[i] };
  }
  return { min: mn, max: mx };
}

/** Faixa efetivamente exibida: os limites onde existem, o mínimo e o máximo do campo nos demais. */
export function faixaExibida(c: Campo, lim: Limites = {}): { lo: number; hi: number } {
  const f = faixaDoCampo(c);
  const lo = lim.min !== undefined ? lim.min : f.min, hi = lim.max !== undefined ? lim.max : f.max;
  return { lo, hi: Math.max(lo, hi) };
}

// ------------------------------------------------------------------ isolinhas

export interface Isolinha { nivel: number; segmentos: [P, P][] }

/**
 * Isolinhas (marching triangles): para cada nível, os segmentos onde o campo linear por triângulo vale o nível.
 * Vértice com valor igual ao nível conta como "acima", por uma perturbação de 1e-9 (sem segmentos duplicados nem buracos).
 */
export function isolinhas(c: Campo, niveis: number[], lim: Limites = {}): Isolinha[] {
  const out: Isolinha[] = [];
  for (const nivel of niveis) {
    const eps = 1e-9 * (1 + Math.abs(nivel));
    if ((lim.min !== undefined && nivel < lim.min - 1e-12) || (lim.max !== undefined && nivel > lim.max + 1e-12)) continue;
    const segmentos: [P, P][] = [];
    for (let t = 0; t < c.triangulos.length; t += 3) {
      const id = [c.triangulos[t], c.triangulos[t + 1], c.triangulos[t + 2]];
      // nó exatamente no nível: perturbação mínima para cima (a isolinha passa a ser uma curva simples, sem nós de grau > 2)
      const v = id.map((i) => (c.valores[i] === nivel ? nivel + eps : c.valores[i])), acima = v.map((x) => x >= nivel);
      const q = acima.filter(Boolean).length;
      if (q === 0 || q === 3) continue;
      const pts: P[] = [];
      for (let k = 0; k < 3; k++) {
        const k2 = (k + 1) % 3;
        if (acima[k] === acima[k2]) continue;
        // ordem canônica (menor índice primeiro): os dois triângulos da aresta calculam exatamente o mesmo ponto
        const [ka, kb] = id[k] < id[k2] ? [k, k2] : [k2, k], u = (nivel - v[ka]) / (v[kb] - v[ka]), a = c.nos[id[ka]], b = c.nos[id[kb]];
        pts.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]);
      }
      if (pts.length === 2) segmentos.push([pts[0], pts[1]]);
    }
    out.push({ nivel, segmentos });
  }
  return out;
}

/** Une os segmentos de uma isolinha em polilinhas (pontas coincidentes a 1e-9). */
export function encadear(segmentos: [P, P][]): P[][] {
  const chave = (p: P) => `${p[0]}_${p[1]}`;
  const porPonta = new Map<string, number[]>();
  segmentos.forEach((s, i) => { for (const p of s) { const k = chave(p), l = porPonta.get(k); if (l) l.push(i); else porPonta.set(k, [i]); } });
  const usado = new Array<boolean>(segmentos.length).fill(false), out: P[][] = [];
  const estender = (linha: P[], fim: boolean) => {
    for (;;) {
      const ponta = fim ? linha[linha.length - 1] : linha[0];
      const prox = (porPonta.get(chave(ponta)) ?? []).find((i) => !usado[i]);
      if (prox === undefined) return;
      usado[prox] = true;
      const [a, b] = segmentos[prox], outro = chave(a) === chave(ponta) ? b : a;
      if (fim) linha.push(outro); else linha.unshift(outro);
    }
  };
  segmentos.forEach((s, i) => {
    if (usado[i]) return;
    usado[i] = true;
    const linha: P[] = [s[0], s[1]];
    estender(linha, true); estender(linha, false);
    out.push(linha);
  });
  return out;
}

// ------------------------------------------------------------------ bandas

export interface Banda {
  indice: number;
  /** Limites da banda (valores); o primeiro e o último vêm da faixa exibida. */
  de: number; ate: number;
  /** Índice do token de cor (0 … N_TOKENS_ISO − 1). */
  token: number;
  poligonos: P[][];
}

type VP = { p: P; v: number };
/** Recorta o polígono (vértices com valor linear) mantendo v ≥ a (`acima`) ou v ≤ a. */
function recortar(poli: VP[], a: number, acima: boolean): VP[] {
  const out: VP[] = [], dentro = (x: VP) => (acima ? x.v >= a : x.v <= a);
  for (let i = 0; i < poli.length; i++) {
    const A = poli[i], B = poli[(i + 1) % poli.length];
    if (dentro(A)) out.push(A);
    if (dentro(A) !== dentro(B)) {
      const u = (a - A.v) / (B.v - A.v);
      out.push({ p: [A.p[0] + u * (B.p[0] - A.p[0]), A.p[1] + u * (B.p[1] - A.p[1])], v: a });
    }
  }
  return out;
}

export type ModoCor = 'sequencial' | 'divergente';
export const modoAutomatico = (lo: number, hi: number): ModoCor => (lo < 0 && hi > 0 ? 'divergente' : 'sequencial');

/** Token de cor (0 … N_TOKENS_ISO − 1) de um valor na faixa [lo, hi]; no modo divergente o zero cai no token central. */
export function tokenDoValor(v: number, lo: number, hi: number, modo: ModoCor = modoAutomatico(lo, hi)): number {
  let t: number;
  if (modo === 'divergente' && lo < 0 && hi > 0) t = v < 0 ? (0.5 * (v - lo)) / (0 - lo) : 0.5 + (0.5 * v) / hi;
  else t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
  return Math.round(Math.min(1, Math.max(0, t)) * (N_TOKENS_ISO - 1));
}

/** Limites das bandas: faixa exibida cortada pelos níveis que caem dentro dela. */
export function limitesDasBandas(c: Campo, niveis: number[], lim: Limites = {}): number[] {
  const { lo, hi } = faixaExibida(c, lim);
  return [lo, ...niveisDefinidos(niveis).filter((n) => n > lo + 1e-12 && n < hi - 1e-12), hi];
}

/**
 * Polígonos preenchidos entre níveis consecutivos. A faixa exibida vai do mínimo ao máximo (ou aos limites, e o que
 * está fora deles não é desenhado). A cor de cada banda vem do valor médio dela; a ordem das cores se mantém.
 */
export function bandas(c: Campo, niveis: number[], lim: Limites = {}, modo?: ModoCor): Banda[] {
  const lb = limitesDasBandas(c, niveis, lim), { lo, hi } = faixaExibida(c, lim), m = modo ?? modoAutomatico(lo, hi);
  const out: Banda[] = [];
  for (let b = 0; b + 1 < lb.length; b++) {
    const de = lb[b], ate = lb[b + 1], poligonos: P[][] = [];
    for (let t = 0; t < c.triangulos.length; t += 3) {
      const tri: VP[] = [0, 1, 2].map((k) => ({ p: c.nos[c.triangulos[t + k]], v: c.valores[c.triangulos[t + k]] }));
      const vmin = Math.min(tri[0].v, tri[1].v, tri[2].v), vmax = Math.max(tri[0].v, tri[1].v, tri[2].v);
      if (vmax < de || vmin > ate) continue;
      let poli = tri;
      if (vmin < de) poli = recortar(poli, de, true);
      if (poli.length && vmax > ate) poli = recortar(poli, ate, false);
      if (poli.length >= 3) {
        const q = poli.map((x) => x.p).filter((pt, i, a) => { const o = a[(i + a.length - 1) % a.length]; return Math.hypot(pt[0] - o[0], pt[1] - o[1]) > 1e-12; });
        if (q.length >= 3 && areaPoligono(q) > 1e-12) poligonos.push(q);
      }
    }
    out.push({ indice: b, de, ate, token: tokenDoValor((de + ate) / 2, lo, hi, m), poligonos });
  }
  return out;
}

export function areaPoligono(p: P[]): number {
  return Math.abs(p.reduce((s, a, i) => { const z = p[(i + 1) % p.length]; return s + a[0] * z[1] - z[0] * a[1]; }, 0)) / 2;
}
/** Soma das áreas dos polígonos das bandas. */
export const areaDasBandas = (bs: Banda[]) => bs.reduce((s, b) => s + b.poligonos.reduce((q, p) => q + areaPoligono(p), 0), 0);

// ------------------------------------------------------------------ legenda e rótulos

/** Número em português com até `dec` decimais (vírgula; sem zeros à direita). */
export function fmtIso(v: number, dec = 2): string {
  if (!Number.isFinite(v)) return '—';
  const t = (Math.abs(v) < 0.5 * 10 ** -dec ? 0 : v).toFixed(dec);
  return (t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t).replace('.', ',');
}

export interface ItemLegenda { de: number; ate: number; token: number; rotulo: string }
export interface Legenda { itens: ItemLegenda[]; grandeza: string; unidade: string; titulo: string; minimo: Extremo | null; maximo: Extremo | null; limites: Limites }

/** Legenda: um item por banda (do menor para o maior valor) com o rótulo "de … a …" e os pontos extremos. */
export function legenda(c: Campo, niveis: number[], lim: Limites = {}, modo?: ModoCor): Legenda {
  const f = faixaDoCampo(c), dec = f.max - f.min >= 20 ? 1 : f.max - f.min >= 2 ? 2 : 3;
  const itens = bandas(c, niveis, lim, modo).map((b) => ({ de: b.de, ate: b.ate, token: b.token, rotulo: `${fmtIso(b.de, dec)} a ${fmtIso(b.ate, dec)}` }));
  const ex = extremos(c, lim);
  return { itens, grandeza: c.grandeza, unidade: c.unidade, titulo: c.rotulo ?? c.grandeza, minimo: ex.min, maximo: ex.max, limites: lim };
}

/** Nós onde escrever o valor (C12.5): os de maior |valor| primeiro, a pelo menos `distMin` m uns dos outros, até `max`. */
export function nosParaRotulo(c: Campo, distMin: number, max = 60): number[] {
  const usados = [...new Set(c.triangulos)].sort((a, b) => Math.abs(c.valores[b]) - Math.abs(c.valores[a]));
  const out: number[] = [];
  for (const i of usados) {
    if (out.length >= max) break;
    if (out.every((j) => Math.hypot(c.nos[i][0] - c.nos[j][0], c.nos[i][1] - c.nos[j][1]) >= distMin)) out.push(i);
  }
  return out;
}

// ------------------------------------------------------------------ saídas

export interface OpcoesSvg {
  niveis: number[]; limites?: Limites; modo?: ModoCor;
  /** Cor de cada token; padrão `var(--iso-<n>)` (a folha de estilo do app ou do memorial define os tokens). */
  cor?: (token: number) => string;
  comIsolinhas?: boolean; comValores?: boolean; comLegenda?: boolean;
  largura?: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Transformação metros → pixels do mapa (y para cima): X, Y e a inversa, para o clique. */
export function enquadramento(c: Campo, W = 800) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of new Set(c.triangulos)) { const [x, y] = c.nos[i]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (!Number.isFinite(x0)) { x0 = y0 = 0; x1 = y1 = 1; }
  const k = (W - 20) / Math.max(1e-9, x1 - x0), H = (y1 - y0) * k + 20;
  return { x0, y0, x1, y1, k, W, H, X: (x: number) => 10 + (x - x0) * k, Y: (y: number) => H - 10 - (y - y0) * k, xm: (px: number) => x0 + (px - 10) / k, ym: (py: number) => y0 + (H - 10 - py) / k };
}

/** Mapa de isovalores em SVG (y para cima, em metros × escala). Classes: iso-banda, iso-linha, iso-contorno, iso-valor, iso-leg-*. */
export function svgIsovalores(c: Campo, o: OpcoesSvg): string {
  const cor = o.cor ?? ((t: number) => `var(--iso-${t})`), W = o.largura ?? 800;
  const E = enquadramento(c, W), { x0, x1 } = E, H = E.H;
  const X = (x: number) => E.X(x).toFixed(1), Y = (y: number) => E.Y(y).toFixed(1);
  const pts = (p: P[]) => p.map((q) => `${X(q[0])},${Y(q[1])}`).join(' ');
  const lim = o.limites ?? {}, leg = legenda(c, o.niveis, lim, o.modo), parts: string[] = [];
  for (const b of bandas(c, o.niveis, lim, o.modo))
    for (const p of b.poligonos) parts.push(`<polygon class="iso-banda" points="${pts(p)}" fill="${cor(b.token)}" stroke="${cor(b.token)}" stroke-width="0.6"/>`);
  if (o.comIsolinhas !== false)
    for (const il of isolinhas(c, o.niveis, lim)) for (const l of encadear(il.segmentos)) parts.push(`<polyline class="iso-linha" points="${pts(l)}" fill="none"/>`);
  for (const ct of c.contornos ?? []) parts.push(`<polygon class="iso-contorno" points="${pts(ct)}" fill="none"/>`);
  if (o.comValores) for (const i of nosParaRotulo(c, Math.max(0.5, (x1 - x0) / 12)))
    parts.push(`<text class="iso-valor" x="${X(c.nos[i][0])}" y="${Y(c.nos[i][1])}" font-size="9" text-anchor="middle">${esc(fmtIso(c.valores[i], 2))}</text>`);
  let altLeg = 0;
  if (o.comLegenda !== false) {
    const lw = Math.min(70, (W - 20) / Math.max(1, leg.itens.length)), y = H + 6;
    leg.itens.forEach((it, j) => {
      parts.push(`<rect class="iso-leg-cor" x="${(10 + j * lw).toFixed(1)}" y="${y}" width="${lw.toFixed(1)}" height="12" fill="${cor(it.token)}"/>`);
      parts.push(`<text class="iso-leg-txt" x="${(10 + j * lw + lw / 2).toFixed(1)}" y="${y + 24}" font-size="8" text-anchor="middle">${esc(fmtIso(it.de, 2))}</text>`);
    });
    const ex = (e: Extremo | null, nome: string) => (e ? `${nome} ${fmtIso(e.valor, 3)} ${c.unidade} em (${fmtIso(e.pos[0])}; ${fmtIso(e.pos[1])})` : '');
    parts.push(`<text class="iso-leg-tit" x="10" y="${y + 40}" font-size="10">${esc(`${leg.titulo} [${c.unidade}] — ${ex(leg.minimo, 'mín.')}; ${ex(leg.maximo, 'máx.')}`)}</text>`);
    altLeg = 52;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg" viewBox="0 0 ${W} ${(H + altLeg).toFixed(0)}" width="${W}">${parts.join('')}</svg>`;
}

/** CSV "x;y;valor" (vírgula decimal opcional) com um nó por linha. */
export function csvCampo(c: Campo, virgula = true): string {
  const f = (v: number) => (virgula ? String(+v.toFixed(6)).replace('.', ',') : String(+v.toFixed(6)));
  const usados = [...new Set(c.triangulos)].sort((a, b) => a - b);
  return `x (m);y (m);${c.grandeza} (${c.unidade})\n` + usados.map((i) => `${f(c.nos[i][0])};${f(c.nos[i][1])};${f(c.valores[i])}`).join('\n') + '\n';
}

/** DXF R12 com as isolinhas na camada ISOLINHAS (polilinhas) e os valores dos níveis em TEXTOS; unidade = metro. */
export function dxfIsolinhas(c: Campo, niveis: number[], lim: Limites = {}): string {
  const g = (cod: number, v: string | number) => `${cod}\n${v}\n`;
  let s = g(0, 'SECTION') + g(2, 'HEADER') + g(9, '$ACADVER') + g(1, 'AC1009') + g(0, 'ENDSEC');
  s += g(0, 'SECTION') + g(2, 'TABLES') + g(0, 'TABLE') + g(2, 'LAYER') + g(70, 3);
  for (const [nome, cor] of [['ISOLINHAS', 5], ['CONTORNO', 7], ['TEXTOS', 7]] as const) s += g(0, 'LAYER') + g(2, nome) + g(70, 0) + g(62, cor) + g(6, 'CONTINUOUS');
  s += g(0, 'ENDTAB') + g(0, 'ENDSEC') + g(0, 'SECTION') + g(2, 'ENTITIES');
  const linha = (pts: P[], camada: string, fechada: boolean) => {
    let t = g(0, 'POLYLINE') + g(8, camada) + g(66, 1) + g(70, fechada ? 1 : 0);
    for (const [x, y] of pts) t += g(0, 'VERTEX') + g(8, camada) + g(10, x.toFixed(4)) + g(20, y.toFixed(4)) + g(30, '0.0');
    return t + g(0, 'SEQEND') + g(8, camada);
  };
  for (const il of isolinhas(c, niveis, lim)) {
    for (const l of encadear(il.segmentos)) {
      s += linha(l, 'ISOLINHAS', false);
      const m = l[Math.floor(l.length / 2)];
      s += g(0, 'TEXT') + g(8, 'TEXTOS') + g(10, m[0].toFixed(4)) + g(20, m[1].toFixed(4)) + g(30, '0.0') + g(40, '0.08') + g(1, fmtIso(il.nivel, 3));
    }
  }
  for (const ct of c.contornos ?? []) s += linha(ct, 'CONTORNO', true);
  return s + g(0, 'ENDSEC') + g(0, 'EOF');
}
