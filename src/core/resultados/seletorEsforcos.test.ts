import { describe, expect, it } from 'vitest';
import type { Comp, DiagramaViga, HipoteseEsforco } from './esforcosCaso';
import { esforcosVigaEmS, filtrarHipoteses, hipoteseSelecionada } from './seletorEsforcos';

const hips: HipoteseEsforco[] = [
  { id: 'env:ELU', nome: 'Envoltória ELU', tipo: 'envoltoria', familia: 'ELU', combinacoes: [] },
  { id: 'comb:ELU 1', nome: 'ELU 1 (G + Q)', tipo: 'combinacao', fatores: { G: 1.4, Q: 1.4 } },
  { id: 'comb:ELU 2', nome: 'ELU 2 (G + vento)', tipo: 'combinacao', fatores: { G: 1.4, W: 1.4 } },
  { id: 'caso:G', nome: 'G', tipo: 'caso', fatores: { G: 1 } },
  { id: 'caso:Q', nome: 'Q', tipo: 'caso', fatores: { Q: 1 } },
];

describe('seletor de hipóteses de esforços', () => {
  it('filtra por tipo preservando a ordem', () => {
    expect(filtrarHipoteses(hips, 'todas')).toHaveLength(5);
    expect(filtrarHipoteses(hips, 'envoltoria').map((h) => h.id)).toEqual(['env:ELU']);
    expect(filtrarHipoteses(hips, 'combinacao').map((h) => h.id)).toEqual(['comb:ELU 1', 'comb:ELU 2']);
    expect(filtrarHipoteses(hips, 'caso').map((h) => h.id)).toEqual(['caso:G', 'caso:Q']);
  });
  it('filtra por texto sem distinguir maiúsculas nem acentos', () => {
    expect(filtrarHipoteses(hips, 'todas', 'ENVOLTORIA').map((h) => h.id)).toEqual(['env:ELU']);
    expect(filtrarHipoteses(hips, 'combinacao', 'vento').map((h) => h.id)).toEqual(['comb:ELU 2']);
    expect(filtrarHipoteses(hips, 'caso', 'vento')).toEqual([]);
  });
  it('a seleção segue o id quando passa no filtro e cai na primeira filtrada quando não', () => {
    expect(hipoteseSelecionada(hips, 'comb:ELU 2', 'combinacao')?.id).toBe('comb:ELU 2');
    expect(hipoteseSelecionada(hips, 'comb:ELU 2', 'caso')?.id).toBe('caso:G');
    expect(hipoteseSelecionada(hips, 'x', 'todas')?.id).toBe('env:ELU');
    expect(hipoteseSelecionada(hips, 'caso:Q', 'combinacao', 'zzz')?.id).toBe('caso:Q');
    expect(hipoteseSelecionada([], 'x')).toBeUndefined();
  });
});

const comp = (Mz: number): Comp => ({ N: 0, Vy: 0, Vz: 0, My: 0, Mz, T: 0, Fx: 0, Fy: 0, Fz: 0 });

describe('esforços da viga numa abscissa', () => {
  const d = { s: [0, 2, 6], pontos: [0, 10, 2].map((m) => ({ max: comp(m), min: comp(m - 1) })) } as unknown as DiagramaViga;
  it('interpola linearmente e prende nas pontas', () => {
    expect(esforcosVigaEmS(d, 1).max.Mz).toBeCloseTo(5, 12);
    expect(esforcosVigaEmS(d, 1).min.Mz).toBeCloseTo(4, 12);
    expect(esforcosVigaEmS(d, 4).max.Mz).toBeCloseTo(6, 12);
    expect(esforcosVigaEmS(d, 2).max.Mz).toBeCloseTo(10, 12);
    expect(esforcosVigaEmS(d, -5)).toMatchObject({ s: 0 });
    expect(esforcosVigaEmS(d, 99).max.Mz).toBeCloseTo(2, 12);
  });
});
