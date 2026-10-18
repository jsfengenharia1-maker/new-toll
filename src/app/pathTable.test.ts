import { describe, expect, it } from 'vitest';
import { buildPath } from '../core/influence';
import { analyze } from '../core/solver';
import { defaultPath, pathSamples, pathTable } from './pathTable';
import { sampleViga } from './samples';
import { makeUnits } from './units';

describe('resultados ao longo de uma cadeia de barras', () => {
  const m = sampleViga();
  const a = analyze(m);
  const r = a.cases.get(1)!;
  const path = buildPath(a.prep, defaultPath(m))!;

  it('abscissa acumulada contínua de 0 a 32 m, M nulo nas extremidades e δy nulo nos apoios', () => {
    expect(path.map((p) => p.L)).toEqual([10, 12, 10]);
    const smp = pathSamples(a, [r], path);
    for (let i = 1; i < smp.length; i++) expect(smp[i].s).toBeGreaterThanOrEqual(smp[i - 1].s - 1e-12);
    expect(smp[0].s).toBe(0);
    expect(smp[smp.length - 1].s).toBeCloseTo(32, 12);
    expect(smp[0].M[0]).toBeCloseTo(0, 6);
    expect(smp[smp.length - 1].M[0]).toBeCloseTo(0, 6);
    for (const s of [0, 10, 22, 32]) for (const p of smp.filter((q) => Math.abs(q.s - s) < 1e-9)) expect(p.dy! * 1000).toBeCloseTo(0, 6);
    // momento sobre o apoio interno igual dos dois lados
    const at10 = smp.filter((q) => Math.abs(q.s - 10) < 1e-9);
    expect(at10).toHaveLength(2);
    expect(at10[0].M[0]).toBeCloseTo(at10[1].M[0], 6);
    expect(at10[0].M[0]).toBeLessThan(0);
  });

  it('barra invertida no meio do caminho dá os mesmos valores', () => {
    const m2 = sampleViga();
    const mid = m2.members[1];
    [mid.ni, mid.nj] = [mid.nj, mid.ni];
    const a2 = analyze(m2);
    const p2 = buildPath(a2.prep, defaultPath(m2))!;
    expect(p2[1].forward).toBe(false);
    const s1 = pathSamples(a, [r], path), s2 = pathSamples(a2, [a2.cases.get(1)!], p2);
    const pick = (ss: typeof s1, s: number) => ss.filter((q) => Math.abs(q.s - s) < 1e-9).at(-1)!;
    for (const s of [11.2, 16, 20.8]) {
      const u = pick(s1, s), v = pick(s2, s);
      expect(v.M[0]).toBeCloseTo(u.M[0], 6);
      expect(v.V[0]).toBeCloseTo(u.V[0], 6);
      expect(v.N[0]).toBeCloseTo(u.N[0], 6);
      expect(v.dy!).toBeCloseTo(u.dy!, 9);
    }
  });

  it('tabela: colunas na unidade de exibição; envoltória com máx./mín.', () => {
    const t = pathTable(a, [r], path, makeUnits('tf'));
    expect(t.head).toEqual(['s (m)', 'Barra', 'x local (m)', 'N (tf)', 'V (tf)', 'M (tf·m)', 'δx (mm)', 'δy (mm)']);
    expect(t.body[0][0]).toBe('0,000');
    expect(t.body.every((row) => row.length === t.head.length)).toBe(true);
    const env = pathTable(a, [r, r], path, makeUnits('kN'));
    expect(env.head).toHaveLength(9);
    expect(env.body[5][7]).toBe(env.body[5][8]);
  });
});
