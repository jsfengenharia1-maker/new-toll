// Interpolação de um campo escalar disperso em planta (deslocamentos verticais dos nós da grelha da laje).
// Mínimos quadrados móveis: ajusta um polinômio de 2º grau (6 termos) aos vizinhos mais próximos, com peso
// decrescente na distância; cai para plano (3 termos) ou para o vizinho mais próximo quando a vizinhança é
// degenerada (nós alinhados, poucos nós). Reproduz exatamente campos de grau ≤ 2. Núcleo puro.
export type Ponto2 = [number, number];

export interface CampoDisperso {
  /** Valor interpolado em (x, y). */
  (x: number, y: number): number;
  /** Índice do nó mais próximo. */
  maisProximo(x: number, y: number): number;
}

/** Resolve A·x = b (A n×n, por linhas) por eliminação de Gauss com pivô parcial; null se singular. */
function resolverPequeno(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}

/**
 * Campo interpolado sobre `pts` (planta) com valores `val`. `vizinhos` = nós usados em cada ajuste (padrão 14).
 * Os nós são indexados numa grade uniforme para a busca dos vizinhos.
 */
export function campoDisperso(pts: Ponto2[], val: ArrayLike<number>, vizinhos = 14): CampoDisperso {
  const n = pts.length;
  if (!n) { const f = (() => 0) as unknown as CampoDisperso; f.maisProximo = () => -1; return f; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const lado = Math.max(1e-6, Math.sqrt(((x1 - x0 + 1e-9) * (y1 - y0 + 1e-9)) / Math.max(1, n / 3)), (Math.max(x1 - x0, y1 - y0)) / 200);
  const nx = Math.max(1, Math.ceil((x1 - x0) / lado) + 1), ny = Math.max(1, Math.ceil((y1 - y0) / lado) + 1);
  const cel: number[][] = Array.from({ length: nx * ny }, () => []);
  const ci = (x: number) => Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / lado)));
  const cj = (y: number) => Math.min(ny - 1, Math.max(0, Math.floor((y - y0) / lado)));
  pts.forEach(([x, y], i) => cel[cj(y) * nx + ci(x)].push(i));

  /** k vizinhos mais próximos (anéis crescentes de células até cobrir k e a distância do anel). */
  const knn = (x: number, y: number, k: number): { i: number; d: number }[] => {
    const i0 = ci(x), j0 = cj(y), alvo = Math.min(k, n);
    let achados: { i: number; d: number }[] = [];
    for (let r = 0; r <= Math.max(nx, ny); r++) {
      achados = [];
      for (let j = Math.max(0, j0 - r); j <= Math.min(ny - 1, j0 + r); j++) for (let i = Math.max(0, i0 - r); i <= Math.min(nx - 1, i0 + r); i++)
        for (const p of cel[j * nx + i]) achados.push({ i: p, d: Math.hypot(pts[p][0] - x, pts[p][1] - y) });
      if (achados.length >= alvo) {
        achados.sort((a, b) => a.d - b.d);
        // o k-ésimo vizinho só vale se está dentro do anel já varrido
        if (achados[alvo - 1].d <= r * lado) break;
      }
    }
    achados.sort((a, b) => a.d - b.d);
    return achados.slice(0, alvo);
  };

  const f = ((x: number, y: number) => {
    const viz = knn(x, y, vizinhos);
    if (viz[0].d < 1e-9) return val[viz[0].i];
    if (viz.length < 3) return val[viz[0].i];
    const h = Math.max(viz[viz.length - 1].d, 1e-9);
    const termos = (u: number, v: number, g: 2 | 1) => (g === 2 ? [1, u, v, u * u, u * v, v * v] : [1, u, v]);
    for (const g of [2, 1] as const) {
      const m = g === 2 ? 6 : 3;
      if (viz.length < (g === 2 ? 8 : 3)) continue;
      const A = Array.from({ length: m }, () => new Array<number>(m).fill(0)), B = new Array<number>(m).fill(0);
      for (const { i, d } of viz) {
        const w = 1 / (1e-3 + (d / h) ** 2); // peso decrescente; o ajuste fica quase interpolante nos nós vizinhos
        const t = termos((pts[i][0] - x) / h, (pts[i][1] - y) / h, g);
        for (let r = 0; r < m; r++) { B[r] += w * t[r] * val[i]; for (let c = 0; c < m; c++) A[r][c] += w * t[r] * t[c]; }
      }
      const sol = resolverPequeno(A, B);
      if (sol && Number.isFinite(sol[0])) return sol[0];
    }
    return val[viz[0].i];
  }) as CampoDisperso;
  f.maisProximo = (x, y) => knn(x, y, 1)[0].i;
  return f;
}
