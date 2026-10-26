// Memória detalhada (MD fase 9): regra dos 30 % do vento por combinação no desaprumo global (11.3.3.4.1), compartilhada pelo
// Pórtico 2D (`design.ts`) e pelo Edifício (`analiseGlobal.ts`). O θa, o γz e o P-Δ do pórtico 2D são registrados uma só vez,
// por `registrarGlobalPortico` (porticoGlobal.ts, MD8); só com a memória ligada, com os valores do próprio cálculo.
import { fm, type Registrador } from './registrador';

/** Mesmo nome de `GLOBAL` (porticoGlobal.ts): todos os passos globais do pórtico 2D ficam num só elemento. */
export const ELEMENTO_2D = 'Pórtico';
const NBR = 'NBR 6118:2023';

export interface DetRegra30 {
  combo: string; hasW: boolean; Mw: number; Md: number; saida: string;
  /** Elemento da memória (padrão: Pórtico 2D; o Edifício registra no seu). */
  elemento?: string;
  termos: { caso: string; f: number; Md: number; Mw?: number }[];
}
/** Regra dos 30 % do vento por combinação ELU: momentos de tombamento do vento e do desaprumo e a decisão. */
export function registrarRegra30(reg: Registrador, r: DetRegra30) {
  const ent: Record<string, number> = { Mw: r.Mw, Md: r.Md };
  r.termos.forEach((t, i) => { ent[`f${i}`] = t.f; ent[`Md${i}`] = t.Md; if (t.Mw !== undefined) ent[`Mw${i}`] = t.Mw; });
  reg.passo({ etapa: 'analise', elemento: r.elemento ?? ELEMENTO_2D, topico: 'Desaprumo global – regra dos 30 % do vento', descricao: `Combinação "${r.combo}": momento de tombamento na base do vento (Mw) e do desaprumo (Md = Σ f·θa·V·h); decisão`, formula: 'Mw = Σ f·F·h (vento); Md = |Σ f·θa·V·h|; 0,3·|Mw| ≥ Md → só vento; |Mw| < 0,3·Md → só desaprumo; senão ambos no mesmo sentido; sem vento → desaprumo nos dois sentidos', expressao: `Mw = ${fm(r.Mw)} kN·m; Md = ${fm(r.Md)} kN·m; 0,3·|Mw| = ${fm(0.3 * Math.abs(r.Mw))} → ${r.saida}`, resultado: r.saida, unidade: '', norma: `${NBR}, 11.3.3.4.1`, entradas: ent });
}
