// Molas de Winkler da base do pilar-parede (frente FU, fatia FU7d): largura B de cada lado a partir da sapata calculada
// (retângulo A × B nos eixos do pilar-parede) e molas dos lados curtos em barra. Funções puras. Unidades: kN, m, rad.
import type { P } from '../geom/faces';

/** Lado do pilar-parede para a repartição da sapata: id, comprimento, direção do eixo e normal. */
export interface LadoMola { id: string; L: number; u: P; n: P }

/** Sapata sob o pilar-parede: A ao longo do eixo x local, B ao longo de y local, ângulo do pilar-parede (graus). */
export interface SapataMola { A: number; B: number; angulo: number }

/**
 * Largura B de cada lado (m): a extensão da sapata medida na normal do lado (A·|n·ex| + B·|n·ey|), reduzida pelo fator
 * min(1, A·B/Σ ℓᵢ·Bᵢ) quando os lados juntos cobririam mais que a área da sapata (lados paralelos que dividem a mesma
 * sapata, lados em ângulo que se cruzam): assim a rigidez vertical total Σ k·Bᵢ·ℓᵢ nunca passa de k·A·B.
 */
export function larguraDosLados(lados: LadoMola[], s: SapataMola): Map<string, number> {
  const t = (s.angulo * Math.PI) / 180, ex: P = [Math.cos(t), Math.sin(t)], ey: P = [-Math.sin(t), Math.cos(t)];
  const dot = (a: P, z: P) => Math.abs(a[0] * z[0] + a[1] * z[1]);
  const bruta = lados.map((l) => s.A * dot(l.n, ex) + s.B * dot(l.n, ey));
  const cobre = lados.reduce((acc, l, i) => acc + l.L * bruta[i], 0), f = cobre > s.A * s.B ? (s.A * s.B) / cobre : 1;
  return new Map(lados.map((l, i) => [l.id, bruta[i] * f]));
}

/**
 * Molas de um lado curto em barra (retângulo ℓ × B sobre o solo): vertical k·B·ℓ; rotação em torno do eixo do lado
 * k·ℓ·B³/12 e em torno da normal ao lado k·B·ℓ³/12, levadas aos eixos globais (x, y) sem o termo cruzado:
 * krx = kᵤ·uₓ² + kₙ·nₓ², kry = kᵤ·uᵧ² + kₙ·nᵧ² (a confirmar quando o lado não é paralelo a um eixo global).
 */
export function molasDaBarra(k: number, B: number, L: number, u: P): { kz: number; krx: number; kry: number } {
  const ku = (k * L * B ** 3) / 12, kn = (k * B * L ** 3) / 12, n: P = [-u[1], u[0]];
  return { kz: k * B * L, krx: ku * u[0] ** 2 + kn * n[0] ** 2 + 1e-9 * ku, kry: ku * u[1] ** 2 + kn * n[1] ** 2 + 1e-9 * ku };
}

/** Dimensões (m) da sapata sob um pilar-parede nos eixos dela (A ao longo de x) e o giro (graus). */
export interface DimsSapataPP { A: number; B: number; angulo: number }

/** Passo da iteração de B das molas (FU7d): dimensões usadas na análise, as calculadas a partir das reações e a variação. */
export interface PassoIteracaoB { iteracao: number; pilarParede: string; usadas: DimsSapataPP | null; calculadas: DimsSapataPP; variacao: number }

/** Resultado da iteração de B das molas dos pilares-parede (FU7d). */
export interface IteracaoBaseMolas {
  convergiu: boolean; iteracoes: number;
  /** Tolerância (m) da variação de A e B e o máximo de iterações. */
  tolerancia: number; maximo: number;
  /** Dimensões da última análise, por pilar-parede. */
  dims: Record<string, DimsSapataPP>;
  passos: PassoIteracaoB[];
}
