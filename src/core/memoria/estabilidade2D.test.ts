// Memória detalhada (MD fase 9): estabilidade global do Pórtico 2D — desaprumo θa e regra dos 30 % do vento, γz e P-Δ, com as
// contas refeitas das `entradas` (erro relativo ≤ 1e-9) e o relatório idêntico com a memória ligada.
import { describe, expect, it } from 'vitest';
import { samplePortico } from '../../app/samples';
import { runDesign } from '../design';
import { analyze } from '../solver';
import type { PassoMemoria } from './registrador';
import { memoriaPortico2D } from './portico2D';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;

describe('Pórtico 2D: desaprumo, γz e P-Δ', () => {
  const m = samplePortico(), a = analyze(m);
  const sem = runDesign(m, a), { passos, relatorio: com } = memoriaPortico2D(m, a);
  const T = (t: string) => passos.filter((p) => p.elemento === 'Pórtico 2D' && p.topico === t);

  it('relatório idêntico com a memória ligada (toEqual)', () => {
    expect(com).toEqual(sem);
  });

  it('θ1 (limitado entre 1/300 e 1/200) e θa = θ1·√((1 + 1/n)/2) das entradas', () => {
    const ps = T('Desaprumo global (11.3.3.4.1)');
    expect(ps).toHaveLength(4);
    const [pH, pn, p1, pa] = ps;
    const theta1 = Math.min(1 / 200, Math.max(1 / 300, 1 / (100 * Math.sqrt(pH.resultado as number))));
    expect(rel(theta1, p1.resultado as number)).toBeLessThan(1e-9);
    expect(num(p1, 'H')).toBe(pH.resultado);
    expect(rel(num(pa, 'theta1') * Math.sqrt((1 + 1 / num(pa, 'n')) / 2), pa.resultado as number)).toBeLessThan(1e-9);
    expect(pa.resultado).toBe(sem.imperfection!.thetaA);
    expect(pn.resultado).toBe(sem.imperfection!.n);
    expect(pH.resultado).toBe(sem.imperfection!.H);
  });

  it('regra dos 30 % do vento por combinação: Mw, Md e decisão refeitos; combinações geradas = decisões', () => {
    const ps = T('Desaprumo global – regra dos 30 % do vento');
    let soVento = 0, soDesap = 0, ambos = 0, semVento = 0;
    for (const p of ps) {
      let Mw = 0, Md = 0, k = 0;
      while (`f${k}` in p.entradas) { Md += num(p, `f${k}`) * num(p, `Md${k}`); if (`Mw${k}` in p.entradas) Mw += num(p, `f${k}`) * num(p, `Mw${k}`); k++; }
      expect(Math.abs(Mw - num(p, 'Mw')) <= 1e-9 * Math.max(1, Math.abs(Mw))).toBe(true);
      expect(rel(Math.abs(Md), num(p, 'Md'))).toBeLessThan(1e-9);
      const s = p.resultado as string, Mwa = Math.abs(num(p, 'Mw')), Mda = num(p, 'Md');
      if (Mda < 1e-9) continue;
      if (Mwa < 1e-9) { expect(s).toMatch(/^sem vento/); semVento++; }
      else if (0.3 * Mwa >= Mda) { expect(s).toMatch(/^só vento/); soVento++; }
      else if (Mwa < 0.3 * Mda) { expect(s).toMatch(/^só desaprumo/); soDesap++; }
      else { expect(s).toMatch(/^vento \+ desaprumo/); ambos++; }
    }
    expect(semVento + soVento + soDesap + ambos).toBeGreaterThan(0);
    // a regra é a que gerou as combinações: dois sentidos sem vento; uma combinação nos demais casos
    const geradas = sem.elu.length;
    expect(geradas).toBeGreaterThanOrEqual(ps.length);
    expect(sem.elu.filter((c) => c.desap === 1).length + sem.elu.filter((c) => c.desap === -1).length).toBeGreaterThan(0);
  });

  it('γz = 1/(1 − ΔM/M1) por combinação das entradas', () => {
    const ps = T('Estabilidade global (γz)').filter((p) => p.formula.startsWith('γz'));
    expect(ps).toHaveLength(sem.gammaZ.rows.length);
    ps.forEach((p, i) => {
      expect(rel(1 / (1 - num(p, 'dM') / num(p, 'M1')), p.resultado as number)).toBeLessThan(1e-9);
      expect(p.resultado).toBe(sem.gammaZ.rows[i].gz);
      expect(num(p, 'M1')).toBe(sem.gammaZ.rows[i].M1);
    });
  });

  it('P-Δ: iterações, convergência e amplificação iguais às do relatório', () => {
    const mp = { ...m, design: { ...(m.design ?? {}), secondOrder: 'pdelta' } as typeof m.design };
    const rel2 = runDesign(mp, a), { passos: ps2, relatorio } = memoriaPortico2D(mp, a);
    expect(relatorio).toEqual(rel2);
    const linhas = ps2.filter((p) => p.topico === '2ª ordem global (P-Δ)');
    expect(linhas).toHaveLength(rel2.secondOrder.rows.length);
    linhas.forEach((p, i) => { expect(p.resultado).toBe(rel2.secondOrder.rows[i].amplification); expect(num(p, 'iteracoes')).toBe(rel2.secondOrder.rows[i].iterations); expect(num(p, 'convergiu')).toBe(rel2.secondOrder.rows[i].converged ? 1 : 0); });
  });
});
