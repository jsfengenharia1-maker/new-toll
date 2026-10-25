// Desaprumo global (NBR 6118, 11.3.3.4.1): ângulo de cálculo e regra de comparação com o vento (30 %). Funções puras
// compartilhadas pelo Pórtico 2D (`design.ts`) e pelo módulo Edifícios (`building/desaprumo.ts`), para que os dois usem
// exatamente o mesmo critério.

/** Limites de θ1 (rad). O mínimo 1/300 vale a favor da segurança (a norma admite 1/400 para nós fixos: pendência normativa). */
export const THETA1_MIN = 1 / 300;
export const THETA1_MAX = 1 / 200;

export interface AnguloDesaprumo { H: number; n: number; theta1Basico: number; theta1: number; thetaA: number }

/** θ1 = 1/(100√H), 1/300 ≤ θ1 ≤ 1/200; θa = θ1·√((1 + 1/n)/2). H em m, n = número de prumadas (≥ 1). */
export function anguloDesaprumo(H: number, n: number): AnguloDesaprumo {
  const nn = Math.max(1, Math.round(n) || 1);
  const theta1Basico = 1 / (100 * Math.sqrt(H));
  const theta1 = Math.min(THETA1_MAX, Math.max(THETA1_MIN, theta1Basico));
  return { H, n: nn, theta1Basico, theta1, thetaA: theta1 * Math.sqrt((1 + 1 / nn) / 2) };
}

export type DecisaoRegra30 = 'sem-desaprumo' | 'sem-vento' | 'so-vento' | 'so-desaprumo' | 'ambos';

/**
 * Regra dos 30 % do vento (11.3.3.4.1), por combinação ELU, com os momentos de tombamento na base:
 * Mw do vento (valor absoluto) e Md do desaprumo (valor absoluto).
 * - Md ≈ 0: nada a aplicar; sem vento (ou Mw ≈ 0): desaprumo sozinho, nos dois sentidos/direções;
 * - 0,3·|Mw| ≥ Md: só o vento; |Mw| < 0,3·Md: só o desaprumo; senão, os dois no mesmo sentido.
 */
export function decidirRegra30(Mw: number, Md: number, hasW: boolean): DecisaoRegra30 {
  if (Md < 1e-9) return 'sem-desaprumo';
  if (!hasW || Math.abs(Mw) < 1e-9) return 'sem-vento';
  if (0.3 * Math.abs(Mw) >= Md) return 'so-vento';
  if (Math.abs(Mw) < 0.3 * Md) return 'so-desaprumo';
  return 'ambos';
}
