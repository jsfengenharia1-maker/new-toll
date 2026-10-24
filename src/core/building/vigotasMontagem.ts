// Flecha de montagem das vigotas (frente E5e, C7.102): a vigota sozinha, sobre escoras, antes de a capa endurecer, com o peso
// próprio da laje fresca e a carga de construção. Viga contínua de vãos iguais entre as escoras (equação dos três momentos);
// sem escora, viga biapoiada (5qℓ⁴/384EI). Só a flecha instantânea, rigidez da vigota isolada [a confirmar com o fabricante].
// Núcleo puro; kN, m.
import type { Concrete } from '../concrete';
import { barArea } from '../concrete';
import type { OpcoesCalculo } from './opcoes';
import type { GeometriaNervurada } from './tiposLaje';

/** Número de escoras intermediárias para que o vão entre elas não passe de `dist` (m); `dist` ≤ 0 = sem escora. */
export function escorasIntermediarias(L: number, dist: number): number {
  if (!(dist > 0) || L <= dist + 1e-9) return 0;
  return Math.ceil(L / dist - 1e-9) - 1;
}

/** Momentos nos apoios (kN·m, sagrante positivo) de n+1 vãos iguais ℓ com carga uniforme q: M0 = Mn+1 = 0 (três momentos). */
export function momentosApoiosIguais(n: number, ell: number, q: number): number[] {
  if (n <= 0) return [];
  // Mi−1 + 4Mi + Mi+1 = −qℓ²/2 (tridiagonal, Thomas)
  const a = new Array<number>(n).fill(1), b = new Array<number>(n).fill(4), cc = new Array<number>(n).fill(1), d = new Array<number>(n).fill(-q * ell * ell / 2);
  for (let i = 1; i < n; i++) { const w = a[i] / b[i - 1]; b[i] -= w * cc[i - 1]; d[i] -= w * d[i - 1]; }
  const M = new Array<number>(n);
  M[n - 1] = d[n - 1] / b[n - 1];
  for (let i = n - 2; i >= 0; i--) M[i] = (d[i] - cc[i] * M[i + 1]) / b[i];
  return M;
}

export interface FlechaMontagem {
  /** Escoras intermediárias, vão entre apoios (m), momentos nos apoios (kN·m) e flecha máxima (m, para baixo). */
  escoras: number; vao: number; momentos: number[]; flecha: number;
  /** Maior momento positivo no vão (kN·m) e reação máxima de uma escora (kN). */
  Mvao: number; reacaoEscora: number;
}

/**
 * Flecha máxima de n+1 vãos iguais (n escoras intermediárias) de comprimento total L, carga uniforme q (kN/m) e rigidez EI (kN·m²).
 * Em cada vão, M(x) = qx(ℓ−x)/2 + Ma(1−x/ℓ) + Mb·x/ℓ integrado duas vezes (EI·y'' = −M, y = 0 nos apoios); o maior valor entre os vãos.
 */
export function flechaMontagem(L: number, escoras: number, q: number, EI: number): FlechaMontagem {
  const n = Math.max(0, Math.floor(escoras)), ell = L / (n + 1), Mi = momentosApoiosIguais(n, ell, q), M = [0, ...Mi, 0];
  let flecha = 0, Mvao = 0;
  for (let v = 0; v <= n; v++) {
    const Ma = M[v], Mb = M[v + 1];
    // M(x) = a0 + a1·x + a2·x²
    const a0 = Ma, a1 = (q * ell) / 2 + (Mb - Ma) / ell, a2 = -q / 2;
    const y = (x: number) => -(a0 * x * x / 2 + a1 * x ** 3 / 6 + a2 * x ** 4 / 12);
    const c1 = -y(ell) / ell;
    for (let i = 0; i <= 400; i++) {
      const x = (ell * i) / 400;
      flecha = Math.max(flecha, (y(x) + c1 * x) / EI);
      Mvao = Math.max(Mvao, a0 + a1 * x + a2 * x * x);
    }
  }
  const reacoes = Mi.map((m, i) => { const Ml = i === 0 ? 0 : Mi[i - 1], Mr = i === Mi.length - 1 ? 0 : Mi[i + 1]; return q * ell + (Ml - m) / ell + (Mr - m) / ell; });
  return { escoras: n, vao: ell, momentos: Mi, flecha, Mvao, reacaoEscora: reacoes.length ? Math.max(...reacoes) : 0 };
}

/**
 * Rigidez à flexão (kN·m²) da vigota isolada: base de concreto b × hs (Ecs) mais, com treliça, os banzos de aço (Es) em torno do
 * centroide do aço: banzo inferior (2 barras) no meio da base e o superior (1 barra) a `Htr − (φsup+φinf)/2` acima.
 */
export function rigidezVigotaIsolada(c: Concrete, base: { b: number; hs: number }, trelica?: { h: number; sup: number; inf: number }): number {
  const EIc = (c.Ecs * 1000 * base.b * base.hs ** 3) / 12;
  if (!trelica) return EIc;
  const Ai = 2 * barArea(trelica.inf), As = barArea(trelica.sup), yi = base.hs / 2, ys = yi + trelica.h - (trelica.sup + trelica.inf) / 2000;
  const yg = (Ai * yi + As * ys) / (Ai + As), I = Ai * (yi - yg) ** 2 + As * (ys - yg) ** 2;
  return EIc + 2.1e8 * I;
}

export interface VerificacaoMontagem extends FlechaMontagem {
  /** Carga linear (kN/m): peso próprio da laje fresca por vigota + construção; rigidez (kN·m²); limite (m) e situação. */
  q: number; EI: number; limite: number; ok: boolean; L: number;
}
/** Verifica a flecha de montagem de uma vigota de comprimento L: limite = vão entre apoios/`divisor`. */
export function verificarMontagem(p: { L: number; dist: number; pp: number; construcao: number; intereixo: number; EI: number; divisor: number }): VerificacaoMontagem {
  const q = (p.pp + p.construcao) * p.intereixo, f = flechaMontagem(p.L, escorasIntermediarias(p.L, p.dist), q, p.EI), limite = f.vao / Math.max(1, p.divisor);
  return { ...f, q, EI: p.EI, limite, ok: f.flecha <= limite + 1e-12, L: p.L };
}

/** Verificação da laje: pior vigota (maior comprimento), peso próprio da geometria, rigidez da vigota isolada e as opções de montagem. */
export function montagemDaLaje(c: Concrete, g: GeometriaNervurada, trelica: { h: number; sup: number; inf: number } | undefined, Lmax: number, op: Pick<OpcoesCalculo, 'vigotaEscoraDist' | 'vigotaCargaConstrucao' | 'vigotaMontagemLimite' | 'vigotaMontagemSapata'>): VerificacaoMontagem {
  const EI = rigidezVigotaIsolada(c, { b: g.bw, hs: op.vigotaMontagemSapata / 100 }, trelica);
  return verificarMontagem({ L: Lmax, dist: op.vigotaEscoraDist, pp: g.pp, construcao: op.vigotaCargaConstrucao, intereixo: g.intereixo, EI, divisor: op.vigotaMontagemLimite });
}
/** Mensagem do erro de flecha de montagem (sugere mais escoras, C7.102). */
export function mensagemMontagem(v: VerificacaoMontagem): string {
  const f = (x: number, n = 1) => x.toFixed(n).replace('.', ',');
  return `Vigotas: flecha de montagem de ${f(v.flecha * 1000)} mm acima do limite de ${f(v.limite * 1000)} mm (vigota de ${f(v.L, 2)} m com ${v.escoras} escora(s) intermediária(s), vão de ${f(v.vao, 2)} m, ${f(v.q, 2)} kN/m); reduza a distância entre escoras ou aumente a rigidez da vigota.`;
}
