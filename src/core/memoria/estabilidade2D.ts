// Memória detalhada (MD fase 9): estabilidade global do módulo Pórtico 2D — desaprumo θa (11.3.3.4.1) com a regra dos 30 % do
// vento por combinação, γz por combinação (M1, ΔM, rigidez reduzida) e P-Δ (iterações e amplificação). Chamada por `runDesign`
// (core/design.ts) só com a memória ligada; os valores são os do próprio cálculo. A memória completa do pórtico 2D é da fase MD8.
import { fm, type Registrador } from './registrador';

export const ELEMENTO_2D = 'Pórtico 2D';
const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa'>;

export interface DetImperfeicao2D { H: number; n: number; nAuto: number; theta1: number; thetaA: number }

/** θ1 e θa do desaprumo global. */
export function registrarDesaprumo2D(reg: Registrador, imp: DetImperfeicao2D, informadoN: boolean) {
  const P = (p: Chave) => reg.passo({ etapa: 'analise', elemento: ELEMENTO_2D, ...p });
  const T = 'Desaprumo global (11.3.3.4.1)', t1b = 1 / (100 * Math.sqrt(imp.H));
  P({ topico: T, descricao: 'Altura total da estrutura (maior diferença de cota entre os nós)', formula: 'H', expressao: `H = ${fm(imp.H)} m`, resultado: imp.H, unidade: 'm', norma: `${NBR}, 11.3.3.4.1`, entradas: {} });
  P({ topico: T, descricao: `Número de prumadas de pilares${informadoN ? ' (informado)' : ' (contado: pilares ligados a apoios)'}`, formula: 'n', expressao: `n = ${imp.n}${informadoN ? ` (automático: ${imp.nAuto})` : ''}`, resultado: imp.n, unidade: '', norma: `${NBR}, 11.3.3.4.1`, entradas: { n: imp.n, nAuto: imp.nAuto } });
  P({ topico: T, descricao: 'Ângulo básico de desaprumo, limitado entre 1/300 e 1/200', formula: 'θ1 = 1/(100·√H); 1/300 ≤ θ1 ≤ 1/200', expressao: `θ1 = 1/(100·√${fm(imp.H)}) = ${fm(t1b)} → ${fm(imp.theta1)}`, resultado: imp.theta1, unidade: 'rad', norma: `${NBR}, 11.3.3.4.1`, entradas: { H: imp.H } });
  P({ topico: T, descricao: 'Ângulo de desaprumo de cálculo', formula: 'θa = θ1·√((1 + 1/n)/2)', expressao: `θa = ${fm(imp.theta1)}·√((1 + 1/${imp.n})/2) = ${fm(imp.thetaA)} = 1/${fm(1 / imp.thetaA, 4)}`, resultado: imp.thetaA, unidade: 'rad', norma: `${NBR}, 11.3.3.4.1`, entradas: { theta1: imp.theta1, n: imp.n } });
}

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

export interface LinhaGamaZ2D { combo: string; M1: number; dM: number; gz: number }
export function registrarGamaZ2D(reg: Registrador, linhas: LinhaGamaZ2D[], modulo: string) {
  reg.passo({ etapa: 'analise', elemento: ELEMENTO_2D, topico: 'Estabilidade global (γz)', descricao: `Rigidez reduzida: vigas 0,4 e pilares 0,8 (aço 0,8) × ${modulo === 'Eci' ? 'Eci·Ic' : 'Ecs·Ic'} (15.7.3)`, formula: 'EI,sec = fator·E·I', expressao: `módulo de referência: ${modulo}`, resultado: modulo, unidade: '', norma: `${NBR}, 15.7.3`, entradas: {} });
  for (const l of linhas) reg.passo({ etapa: 'analise', elemento: ELEMENTO_2D, topico: 'Estabilidade global (γz)', descricao: `Combinação "${l.combo}": M1,tot,d (momento de tombamento das forças horizontais) e ΔMtot,d (cargas verticais × deslocamentos horizontais)`, formula: 'γz = 1/(1 − ΔMtot,d/M1,tot,d)', expressao: `γz = 1/(1 − ${fm(l.dM)}/${fm(l.M1)}) = ${fm(l.gz)}`, resultado: l.gz, unidade: '', norma: `${NBR}, 15.5.3`, entradas: { M1: l.M1, dM: l.dM } });
}

export interface LinhaPDelta2D { combo: string; amplification: number; iterations: number; converged: boolean; error?: string }
export function registrarPDelta2D(reg: Registrador, linhas: LinhaPDelta2D[]) {
  for (const l of linhas) reg.passo({ etapa: 'analise', elemento: ELEMENTO_2D, topico: '2ª ordem global (P-Δ)', descricao: `Combinação "${l.combo}": ${l.converged ? `convergiu em ${l.iterations} iterações` : `não convergiu${l.error ? ` (${l.error})` : ''}`}; amplificação dos deslocamentos horizontais`, formula: 'u(2ª ordem)/u(1ª ordem)', expressao: `amplificação = ${fm(l.amplification)}`, resultado: l.amplification, unidade: '', norma: `${NBR}, 15.7.3`, aConfirmar: true, entradas: { iteracoes: l.iterations, convergiu: l.converged ? 1 : 0 } });
}
