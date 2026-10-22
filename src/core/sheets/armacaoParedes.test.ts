// E1d: prancha de armação das paredes e pilares-parede (montagem, tabela de aço, conjunto e DXF/PDF/SVG).
import { beforeAll, describe, expect, it } from 'vitest';
import { auditDrawing, readDxf } from 'nasjidwg';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { caixa, ok } from '../building/paredesFixtures';
import type { Sessao } from '../commands';
import { alvosDeParedes, quadroArmadura, montarPranchasParedes } from './armacaoParedes';
import { linhasQuadroPilares } from './armacaoPilares';
import { montarConjunto } from './conjunto';
import { escreverDxf } from './dxf';
import { escreverPdf } from './pdf';
import { svgPrancha } from './svg';
import type { Prancha } from './prancha';

let s: Sessao, an: AnaliseEdificio, dim: Dimensionamento;

beforeAll(() => {
  const c = caixa();
  s = c.s;
  const w0 = s.modelo.paredes![0].id, terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!.id;
  ok(s, 'parede.abertura', { parede: w0, s: 5, largura: 1, altura: 2.1, pavimento: terreo });
  // pilar-parede em L com lado curto, longe das paredes
  const t1 = c.t1;
  ok(s, 'pilarParede.tipo', { nome: 'L', vertices: [[20, 20], [24, 20], [24, 20.8]], esq: 0.1, dir: 0.1 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 20, y: 20, morre: t1 });
  ok(s, 'laje.criar', { grupo: s.modelo.pavimentos.find((p) => p.id === t1)!.grupo, contorno: [[19, 19], [25, 19], [25, 22], [19, 22]] });
  an = analisarEdificio(s.modelo);
  dim = dimensionarEdificio(s.modelo, an);
}, 240000);

const textos = (pr: Prancha) => [...pr.papel, ...pr.modelo].flatMap((q) => (q.t === 'txt' ? [q.s] : []));

describe('prancha de paredes (E1d)', () => {
  it('uma prancha com as três paredes/pilar-parede, sigla SCM e tipo paredes', () => {
    const alvos = alvosDeParedes(dim);
    expect(alvos.map((a) => a.res.nome).sort()).toEqual(['M1', 'M2', 'PP1']);
    const prs = montarPranchasParedes(s.modelo, an, dim);
    expect(prs.length).toBeGreaterThanOrEqual(1);
    expect(prs.every((p) => p.tipo === 'paredes')).toBe(true);
    const t = textos(prs[0]);
    expect(t).toContain('SCM');
    expect(prs.flatMap((p) => p.elementos ?? []).sort()).toEqual(['M1', 'M2', 'PP1']);
    expect(t.some((x) => /\(verga\)/.test(x))).toBe(true);
    expect(t.some((x) => /\(cantos\)/.test(x))).toBe(true);
    expect(t.some((x) => /\(pilar\)/.test(x))).toBe(true);
  });

  it('tabela de aço da prancha soma o aço do detalhamento (dentro do arredondamento em cm)', () => {
    const prs = montarPranchasParedes(s.modelo, an, dim);
    const pesoPrancha = prs.reduce((t, p) => t + p.aco!.peso, 0), pesoDet = dim.detalhesParedes!.reduce((t, d) => t + d.peso, 0);
    expect(pesoPrancha).toBeGreaterThan(0);
    expect(Math.abs(pesoPrancha - pesoDet) / pesoDet).toBeLessThan(0.002);
    // concreto e forma vêm do detalhamento
    expect(prs.reduce((t, p) => t + p.aco!.concreto, 0)).toBeCloseTo(dim.detalhesParedes!.reduce((t, d) => t + d.concreto, 0), 6);
    // posições numeradas em sequência por folha
    for (const p of prs) expect(p.aco!.tabela.map((l) => l.pos)).toEqual(p.aco!.tabela.map((_, i) => `N${i + 1}`));
  });

  it('quadro de armadura: uma linha por pano e por lado curto', () => {
    const a = alvosDeParedes(dim).find((x) => x.res.nome === 'M1')!, q = quadroArmadura(a);
    expect(q.length).toBe(a.res.panos.length);
    expect(q[0]).toHaveLength(6);
    const pp = alvosDeParedes(dim).find((x) => x.res.nome === 'PP1')!;
    expect(quadroArmadura(pp).some((l) => l[2] === 'pilar')).toBe(true);
    // pilares-parede também no quadro de pilares (C4.62)
    const qp = linhasQuadroPilares(dim, s.modelo);
    expect(qp.some((l) => l[0].startsWith('PP1.1') && /× 20/.test(l[2]))).toBe(true);
    expect(qp.some((l) => l[0] === 'PP1.2')).toBe(true);
  });

  it('conjunto: tipo paredes isolado e em "todas", depois dos pilares e antes das lajes; sem paredes, fica de fora', () => {
    const só = montarConjunto(s.modelo, an, dim, { tipos: 'paredes' });
    expect(só.pranchas.length).toBeGreaterThanOrEqual(1);
    expect(só.avisos).toEqual([]);
    const todas = montarConjunto(s.modelo, an, dim, { tipos: 'todas' });
    const tipos = todas.pranchas.map((p) => p.tipo);
    expect(tipos).toContain('paredes');
    const iPar = tipos.indexOf('paredes');
    expect(tipos.slice(0, iPar)).not.toContain('lajes');
    const vazio = caixa().s.modelo;
    expect(montarConjunto(vazio, null, null, { tipos: 'paredes' }).avisos.length).toBe(1);
  });

  it('DXF auditado, PDF e SVG de cada folha', () => {
    const { pranchas } = montarConjunto(s.modelo, an, dim, { tipos: 'paredes' });
    const pdf = Array.from(escreverPdf(pranchas), (c) => String.fromCharCode(c)).join('');
    expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBe(pranchas.length);
    for (const pr of pranchas) {
      const d = readDxf(escreverDxf(pr));
      expect(d.warnings).toEqual([]);
      expect(auditDrawing(d).filter((f) => f.severity === 'error')).toEqual([]);
      expect(svgPrancha(pr)).toMatch(/^<svg/);
    }
  });
});
