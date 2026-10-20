// Combinações do edifício (NBR 6118/8681): G, Q e os casos de vento (grupo excludente "vento"),
// com o vento das ELU ampliado por 0,95·γz quando 1,1 < γz ≤ 1,3 (premissa do pórtico).
import { nbrCombinations } from '../edit';
import type { LoadCase } from '../types';
import type { AnaliseEdificio } from './analitico';
import type { BuildingModel } from './types';
import { gamas } from './materiais';

export interface CombinacaoEd { nome: string; tipo: 'ELU' | 'QP' | 'FREQ' | 'RARA'; fatores: Record<string, number> }

export function combinacoesEdificio(b: BuildingModel, an: AnaliseEdificio): CombinacaoEd[] {
  const [p0, p1, p2] = b.norma.psiQ ?? [0.5, 0.4, 0.3];
  const W = an.vento?.casos ?? [];
  const casos: LoadCase[] = [
    { id: 1, name: 'G', nature: 'G' },
    { id: 2, name: 'Q', nature: 'Q', psi0: p0, psi1: p1, psi2: p2 },
    ...W.map((c, i) => ({ id: 3 + i, name: c.nome, nature: 'W' as const, group: 'vento', psi0: 0.6, psi1: 0.3, psi2: 0 })),
  ];
  const nome = new Map(casos.map((c) => [c.id, c.name]));
  const amp = new Map(W.map((c) => [c.nome, an.vento?.gamaZ.find((g) => g.direcao === c.direcao)?.ampliacao ?? 1]));
  const gm = gamas(b);
  const out: CombinacaoEd[] = nbrCombinations(casos, 1, { g: gm.g, gFav: 1, q: gm.q }).map((c) => {
    const f: Record<string, number> = {};
    for (const [id, v] of Object.entries(c.factors)) { const n = nome.get(+id)!; f[n] = c.kind === 'ELU' && amp.has(n) ? +(v * amp.get(n)!).toFixed(4) : v; }
    return { nome: c.name, tipo: c.kind === 'ELU' ? 'ELU' : c.kind === 'QP' ? 'QP' : 'FREQ', fatores: f };
  });
  // raras (fundação, verificação geotécnica): principal integral + ψ1 das demais
  out.push({ nome: 'Rara · Q principal', tipo: 'RARA', fatores: { G: 1, Q: 1 } });
  for (const c of W) {
    out.push({ nome: `Rara · Q principal + ${c.nome}`, tipo: 'RARA', fatores: { G: 1, Q: 1, [c.nome]: 0.3 } });
    out.push({ nome: `Rara · ${c.nome} principal`, tipo: 'RARA', fatores: { G: 1, [c.nome]: 1, Q: p1 } });
  }
  return out;
}

/** Valor combinado de uma grandeza por caso. */
export const combinar = (por: Record<string, number>, c: CombinacaoEd) => Object.entries(c.fatores).reduce((s, [k, f]) => s + f * (por[k] ?? 0), 0);
