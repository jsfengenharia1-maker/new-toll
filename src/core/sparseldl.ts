import { BandLDL, pivoNulo } from './math';

/**
 * Fatoração LDLᵀ esparsa (matriz simétrica, sem pivotamento) com reordenação por grau mínimo.
 *
 * A fatoração em banda (`BandLDL`) custa n·hb² e a banda de um modelo 3D com pavimento de muitos nós ou com
 * diafragma rígido (um nó mestre ligado a centenas de escravos) chega perto de n: dezenas de minutos para
 * poucos milhares de equações. Aqui o custo depende só do preenchimento: grau mínimo (grafo de eliminação)
 * para a ordem, árvore de eliminação e fatoração "up-looking" de Davis (pacote LDL, LGPL-2.1+ em C; o
 * algoritmo é público e foi reescrito aqui, sem copiar código).
 *
 * Mesma interface de `BandLDL` para o que o solver usa: `solve`, `singularRow` (índice na numeração de
 * entrada, o da posição em `fill`) e `negatives` (índice de inércia, que não depende da ordem pela lei de Sylvester).
 */
export interface FatoracaoLDL {
  n: number;
  singularRow: number;
  negatives: number;
  solve(b: ArrayLike<number>): Float64Array;
}

/** Custo n·hb² (operações da fatoração em banda) acima do qual `fatorarLDL` troca para a esparsa. */
export const LIMITE_BANDA = 4e8;
let limite = LIMITE_BANDA;
/** Troca o limite (testes: 0 força a esparsa, Infinity a banda); sem argumento volta ao padrão. */
export function definirLimiteBanda(v: number = LIMITE_BANDA) { limite = v; }

/** Fatoração em banda para modelos pequenos (resultados idênticos aos de sempre) e esparsa quando a banda custaria demais. */
export function fatorarLDL(n: number, hb: number, fill: (set: (i: number, j: number, v: number) => void) => void, scale?: number): FatoracaoLDL {
  return n * hb * hb > limite ? new SparseLDL(n, fill, scale) : new BandLDL(n, hb, fill, scale);
}

/**
 * Ordem de eliminação por grau mínimo (grafo de eliminação com conjuntos; desempate pelo índice, determinística).
 * Equações com a mesma vizinhança (os 6 gdl de um nó, por exemplo) viram um só vértice de peso igual ao seu número,
 * o que reduz o grafo e mantém os gdl do nó consecutivos na ordem.
 */
export function grauMinimo(n: number, ai: Int32Array, aj: Int32Array, nt: number): Int32Array {
  // a mesma esparsidade volta várias vezes (rigidez cheia, reduzida, vento): qualquer permutação é válida, então a ordem é reaproveitada
  let h = (2166136261 ^ n) >>> 0;
  for (let t = 0; t < nt; t++) { h = Math.imul(h ^ ai[t], 16777619); h = Math.imul(h ^ aj[t], 16777619); }
  const chaveCache = `${n}:${nt}:${h >>> 0}`, guardada = cacheOrdem.get(chaveCache);
  if (guardada) return guardada;
  const ordem = calcularGrauMinimo(n, ai, aj, nt);
  if (cacheOrdem.size >= 3) cacheOrdem.delete(cacheOrdem.keys().next().value!);
  cacheOrdem.set(chaveCache, ordem);
  return ordem;
}

const cacheOrdem = new Map<string, Int32Array>();

function calcularGrauMinimo(n: number, ai: Int32Array, aj: Int32Array, nt: number): Int32Array {
  const adj0: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  for (let t = 0; t < nt; t++) { const i = ai[t], j = aj[t]; if (i !== j) { adj0[i].add(j); adj0[j].add(i); } }
  // supervariáveis: vizinhança fechada idêntica
  const grupoDe = new Int32Array(n), grupos = new Map<string, number>(), membros: number[][] = [];
  for (let v = 0; v < n; v++) {
    const chave = [...adj0[v], v].sort((x, y) => x - y).join(',');
    let g = grupos.get(chave);
    if (g === undefined) { g = membros.length; grupos.set(chave, g); membros.push([]); }
    grupoDe[v] = g; membros[g].push(v);
  }
  const m = membros.length, peso = Int32Array.from(membros, (l) => l.length);
  const adj: Set<number>[] = Array.from({ length: m }, () => new Set<number>());
  for (let v = 0; v < n; v++) for (const u of adj0[v]) if (grupoDe[u] !== grupoDe[v]) adj[grupoDe[v]].add(grupoDe[u]);
  const grau = (v: number) => { let d = 0; for (const u of adj[v]) d += peso[u]; return d; };
  // fila de prioridade (chave = grau·(m+1) + vértice) com remoção preguiçosa
  let heap = new Float64Array(Math.max(16, m * 2)), hn = 0;
  const push = (k: number) => {
    if (hn === heap.length) { const h = new Float64Array(hn * 2); h.set(heap); heap = h; }
    let i = hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p] <= k) break; heap[i] = heap[p]; i = p; }
    heap[i] = k;
  };
  const pop = (): number => {
    const top = heap[0], k = heap[--hn];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= hn) break;
      if (c + 1 < hn && heap[c + 1] < heap[c]) c++;
      if (heap[c] >= k) break;
      heap[i] = heap[c]; i = c;
    }
    heap[i] = k;
    return top;
  };
  const M = m + 1, feito = new Uint8Array(m), gr = new Float64Array(m), ordem = new Int32Array(n);
  for (let v = 0; v < m; v++) { gr[v] = grau(v); push(gr[v] * M + v); }
  for (let k = 0, nv = 0; nv < m;) {
    const chave = pop(), v = chave % M, g = (chave - v) / M;
    if (feito[v] || g !== gr[v]) continue; // entrada velha
    feito[v] = 1; nv++;
    for (const e of membros[v]) ordem[k++] = e;
    const nb = [...adj[v]];
    // o que sobra é todo vizinho de v: depois da eliminação forma uma clique e a ordem do resto é indiferente
    if (nb.length === m - nv) {
      nb.sort((x, y) => gr[x] - gr[y] || x - y);
      for (const u of nb) for (const e of membros[u]) ordem[k++] = e;
      break;
    }
    for (const u of nb) adj[u].delete(v);
    for (let a = 0; a < nb.length; a++) {
      const sa = adj[nb[a]];
      for (let b = a + 1; b < nb.length; b++) if (!sa.has(nb[b])) { sa.add(nb[b]); adj[nb[b]].add(nb[a]); }
    }
    for (const u of nb) { gr[u] = grau(u); push(gr[u] * M + u); }
    adj[v].clear();
  }
  return ordem;
}

export class SparseLDL implements FatoracaoLDL {
  n: number;
  singularRow = -1;
  negatives = 0;
  /** Posição k da ordem de eliminação → índice de entrada, e o inverso. */
  private P: Int32Array;
  private Lp: Int32Array; private Li: Int32Array; private Lx: Float64Array; private Lnz: Int32Array;
  private D: Float64Array;
  /** Coeficientes não nulos de L (preenchimento incluído). */
  nnzL = 0;

  constructor(n: number, fill: (set: (i: number, j: number, v: number) => void) => void, scale?: number) {
    this.n = n;
    // coeficientes (triângulo inferior) → matriz simétrica cheia em colunas (CSC), duplicatas somadas na fatoração
    let ti = new Int32Array(1024), tj = new Int32Array(1024), tv = new Float64Array(1024), nt = 0;
    fill((i, j, v) => {
      if (nt === ti.length) {
        const ni = new Int32Array(nt * 2), nj = new Int32Array(nt * 2), nv = new Float64Array(nt * 2);
        ni.set(ti); nj.set(tj); nv.set(tv); ti = ni; tj = nj; tv = nv;
      }
      ti[nt] = i; tj[nt] = j; tv[nt++] = v;
    });
    const P = (this.P = grauMinimo(n, ti, tj, nt));
    const Pinv = new Int32Array(n);
    for (let k = 0; k < n; k++) Pinv[P[k]] = k;
    const Ap = new Int32Array(n + 1);
    for (let t = 0; t < nt; t++) { Ap[tj[t] + 1]++; if (ti[t] !== tj[t]) Ap[ti[t] + 1]++; }
    for (let c = 0; c < n; c++) Ap[c + 1] += Ap[c];
    const Ai = new Int32Array(Ap[n]), Ax = new Float64Array(Ap[n]), cur = Ap.slice(0, n);
    for (let t = 0; t < nt; t++) {
      const i = ti[t], j = tj[t], v = tv[t];
      Ai[cur[j]] = i; Ax[cur[j]++] = v;
      if (i !== j) { Ai[cur[i]] = j; Ax[cur[i]++] = v; }
    }
    let maxDiag = 0;
    for (let c = 0; c < n; c++) { let d = 0; for (let p = Ap[c]; p < Ap[c + 1]; p++) if (Ai[p] === c) d += Ax[p]; maxDiag = Math.max(maxDiag, Math.abs(d)); }
    const tol = 1e-11 * (scale || maxDiag || 1);
    // simbólico: árvore de eliminação e contagem por coluna de L
    const parent = new Int32Array(n).fill(-1), flag = new Int32Array(n), Lnz = (this.Lnz = new Int32Array(n));
    for (let k = 0; k < n; k++) {
      flag[k] = k;
      const kk = P[k];
      for (let p = Ap[kk]; p < Ap[kk + 1]; p++) {
        let i = Pinv[Ai[p]];
        if (i < k) for (; flag[i] !== k; i = parent[i]) { if (parent[i] === -1) parent[i] = k; Lnz[i]++; flag[i] = k; }
      }
    }
    const Lp = (this.Lp = new Int32Array(n + 1));
    for (let k = 0; k < n; k++) Lp[k + 1] = Lp[k] + Lnz[k];
    this.nnzL = Lp[n];
    const Li = (this.Li = new Int32Array(Lp[n])), Lx = (this.Lx = new Float64Array(Lp[n])), D = (this.D = new Float64Array(n));
    // numérico (linha a linha)
    const Y = new Float64Array(n), pattern = new Int32Array(n);
    Lnz.fill(0);
    for (let k = 0; k < n; k++) {
      Y[k] = 0; flag[k] = k;
      let top = n;
      const kk = P[k];
      for (let p = Ap[kk]; p < Ap[kk + 1]; p++) {
        let i = Pinv[Ai[p]];
        if (i > k) continue;
        Y[i] += Ax[p];
        let len = 0;
        for (; flag[i] !== k; i = parent[i]) { pattern[len++] = i; flag[i] = k; }
        while (len > 0) pattern[--top] = pattern[--len];
      }
      let dk = Y[k];
      const d0 = dk;
      Y[k] = 0;
      for (; top < n; top++) {
        const i = pattern[top], yi = Y[i];
        Y[i] = 0;
        const p2 = Lp[i] + Lnz[i];
        for (let p = Lp[i]; p < p2; p++) Y[Li[p]] -= Lx[p] * yi;
        const lki = yi / D[i];
        dk -= lki * yi;
        Li[p2] = k; Lx[p2] = lki; Lnz[i]++;
      }
      if (pivoNulo(dk, d0, tol)) { this.singularRow = kk; return; }
      D[k] = dk;
      if (dk < 0) this.negatives++;
    }
  }

  solve(bIn: ArrayLike<number>): Float64Array {
    const { n, P, Lp, Li, Lx, Lnz, D } = this;
    const x = new Float64Array(n);
    for (let k = 0; k < n; k++) x[k] = bIn[P[k]];
    for (let j = 0; j < n; j++) { const xj = x[j], p2 = Lp[j] + Lnz[j]; for (let p = Lp[j]; p < p2; p++) x[Li[p]] -= Lx[p] * xj; }
    for (let j = 0; j < n; j++) x[j] /= D[j];
    for (let j = n - 1; j >= 0; j--) { let s = x[j]; const p2 = Lp[j] + Lnz[j]; for (let p = Lp[j]; p < p2; p++) s -= Lx[p] * x[Li[p]]; x[j] = s; }
    const out = new Float64Array(n);
    for (let k = 0; k < n; k++) out[P[k]] = x[k];
    return out;
  }
}
