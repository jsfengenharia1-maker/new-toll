import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { nbrCombinations, transformSelection, xformPoint } from './edit';
import { analyze } from './solver';
import type { Model } from './types';

const FIX = { ux: 'fixed', uy: 'fixed', rz: 'fixed' } as const;

function portal(): Model {
  return {
    version: 1, name: 'p',
    nodes: [{ id: 1, x: 0, y: 0, support: { ...FIX } }, { id: 2, x: 0, y: 3 }, { id: 3, x: 5, y: 3 }, { id: 4, x: 5, y: 0, support: { ...FIX } }],
    members: [{ id: 1, ni: 1, nj: 2, material: 1, section: 1 }, { id: 2, ni: 2, nj: 3, material: 1, section: 1, hingeJ: true }, { id: 3, ni: 3, nj: 4, material: 1, section: 1 }],
    materials: [{ id: 1, name: 'm', E: 2.5e7, nu: 0.2, alpha: 1e-5, gamma: 25 }],
    sections: [{ id: 1, name: 's', shape: { kind: 'rect', b: 0.2, h: 0.4 } }],
    cases: [{ id: 1, name: 'c' }], combinations: [], trains: [],
    loads: [
      { kind: 'dist', id: 1, caseId: 1, member: 2, system: 'global', qxi: 0, qyi: -10, qxj: 0, qyj: -20 },
      { kind: 'nodal', id: 2, caseId: 1, node: 3, fx: 5, fy: 0, mz: 2 },
      { kind: 'thermal', id: 3, caseId: 1, member: 2, tTop: 10, tBot: 0 },
    ],
    options: { shearDeformation: false, axialDeformation: true },
  };
}
const all = (m: Model) => ({ n: new Set(m.nodes.map((x) => x.id)), b: new Set(m.members.map((x) => x.id)) });

describe('transformações da seleção', () => {
  it('ponto: rotação de 90° e espelhamento', () => {
    const r = xformPoint({ kind: 'rotate', cx: 1, cy: 1, deg: 90 }, 2, 1);
    expect(r[0]).toBeCloseTo(1, 12); expect(r[1]).toBeCloseTo(2, 12);
    const s = xformPoint({ kind: 'mirror', x1: 0, y1: 0, x2: 1, y2: 1 }, 3, 1);
    expect(s[0]).toBeCloseTo(1, 12); expect(s[1]).toBeCloseTo(3, 12);
  });

  it('copiar pórtico ao lado em série: reaproveita o pilar comum e não duplica carga nodal', () => {
    const m0 = portal();
    const sel = { n: new Set<number>(), b: new Set([2, 3]) }; // viga + pilar direito
    const m = produce(m0, (d) => { transformSelection(d, sel.n, sel.b, { kind: 'translate', dx: 5, dy: 0 }, { copy: true, copies: 2, loads: true, supports: true }); });
    expect(m.nodes.length).toBe(8); // 4 + 2 cópias × 2 nós novos (topo e base)
    expect(m.members.length).toBe(7);
    const beams = m.members.filter((x) => { const a = m.nodes.find((n) => n.id === x.ni)!, b = m.nodes.find((n) => n.id === x.nj)!; return a.y === 3 && b.y === 3; });
    expect(beams.length).toBe(3);
    expect(beams.filter((x) => x.hingeJ).length).toBe(3);
    expect(m.nodes.filter((n) => n.support).length).toBe(4);
    expect(m.loads.filter((l) => l.kind === 'dist').length).toBe(3);
    expect(m.loads.filter((l) => l.kind === 'nodal').length).toBe(3);
    expect(analyze(m).prep.error).toBeFalsy();
  });

  it('espelhar copiando: reações espelhadas', () => {
    const m0 = produce(portal(), (d) => { d.members[1].hingeJ = false; });
    const all0 = all(m0);
    const m = produce(m0, (d) => { transformSelection(d, all0.n, all0.b, { kind: 'mirror', x1: 10, y1: 0, x2: 10, y2: 1 }, { copy: true, copies: 3, loads: true, supports: true }); });
    expect(m.nodes.length).toBe(8);
    const a = analyze(m).cases.get(1)!;
    const idx = (x: number, y: number) => m.nodes.findIndex((n) => Math.abs(n.x - x) < 1e-9 && Math.abs(n.y - y) < 1e-9);
    const r1 = a.reactions.get(idx(0, 0))!, r1m = a.reactions.get(idx(20, 0))!;
    expect(r1m[0]).toBeCloseTo(-r1[0], 8);
    expect(r1m[1]).toBeCloseTo(r1[1], 8);
    expect(r1m[2]).toBeCloseTo(-r1[2], 8);
    const th = m.loads.filter((l) => l.kind === 'thermal');
    expect(th.map((l) => (l.kind === 'thermal' ? l.tTop : 0)).sort()).toEqual([0, 10]);
  });

  it('mover girando 90° em torno da base', () => {
    const m = produce(portal(), (d) => { transformSelection(d, new Set([1, 2, 3, 4]), new Set(), { kind: 'rotate', cx: 0, cy: 0, deg: 90 }, { copy: false, copies: 1, loads: true, supports: true }); });
    const n3 = m.nodes.find((n) => n.id === 3)!;
    expect(n3.x).toBeCloseTo(-3, 12); expect(n3.y).toBeCloseTo(5, 12);
    expect(m.nodes[0].support?.angle).toBe(90);
    expect(m.members.length).toBe(3);
  });
});

describe('combinações com grupos excludentes', () => {
  const cases = [
    { id: 1, name: 'G', nature: 'G' as const },
    { id: 2, name: 'Q', nature: 'Q' as const },
    { id: 3, name: 'V0', nature: 'W' as const },
    { id: 4, name: 'V90', nature: 'W' as const },
  ];
  const combos = nbrCombinations(cases, 1);
  it('ventos do mesmo grupo nunca atuam juntos', () => {
    for (const c of combos) expect(!!c.factors[3] && !!c.factors[4]).toBe(false);
  });
  it('principal Q acompanha um vento por vez, e há a Q sozinha', () => {
    const qp = combos.filter((c) => c.kind === 'ELU' && c.name.includes('G desf.') && c.factors[2] === 1.4);
    expect(qp.map((c) => [c.factors[3] ?? 0, c.factors[4] ?? 0])).toEqual([[0.84, 0], [0, 0.84], [0, 0]]);
  });
  it('vento principal acompanhado de Q × ψ0 e sozinho', () => {
    const w = combos.filter((c) => c.kind === 'ELU' && c.name.includes('G desf.') && c.factors[3] === 1.4);
    expect(w.map((c) => c.factors[2] ?? 0)).toEqual([0.7, 0]);
  });
  it('grupo vazio explícito libera a combinação conjunta', () => {
    const free = nbrCombinations(cases.map((c) => (c.nature === 'W' ? { ...c, group: '' } : c)), 1);
    expect(free.some((c) => c.factors[3] && c.factors[4])).toBe(true);
  });
});

describe('escalar seleção', () => {
  it('mover escalando ×2 a partir da base', () => {
    const m = produce(portal(), (d) => { transformSelection(d, new Set([1, 2, 3, 4]), new Set(), { kind: 'scale', cx: 0, cy: 0, f: 2 }, { copy: false, copies: 1, loads: true, supports: true }); });
    const n3 = m.nodes.find((n) => n.id === 3)!;
    expect(n3.x).toBeCloseTo(10, 12); expect(n3.y).toBeCloseTo(6, 12);
  });
});
