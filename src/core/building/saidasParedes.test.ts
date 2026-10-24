// E5i (C4.63, K1.11.44): relatório de esforços e armaduras de pilares-parede, paredes e muros, e paredes na listagem geral.
import { beforeAll, describe, expect, it } from 'vitest';
import type { Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio, type Dimensionamento } from './dimensionamento';
import { caixa, ok } from './paredesFixtures';
import { relatorioParedes } from './relatorioParedes';
import { listagemGeral } from './relatorios';

let s: Sessao, dim: Dimensionamento, t1: string;

beforeAll(() => {
  const c = caixa();
  s = c.s; t1 = c.t1;
  const terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!.id;
  ok(s, 'parede.abertura', { parede: s.modelo.paredes![0].id, s: 5, largura: 1, altura: 2.1, pavimento: terreo });
  ok(s, 'pilarParede.tipo', { nome: 'L', vertices: [[20, 20], [24, 20], [24, 20.8]], esq: 0.1, dir: 0.1 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 20, y: 20, morre: t1 });
  ok(s, 'laje.criar', { grupo: s.modelo.pavimentos.find((p) => p.id === t1)!.grupo, contorno: [[19, 19], [25, 19], [25, 22], [19, 22]] });
  ok(s, 'muro.arrimo', { nome: 'MA1', H: 3, tTopo: 0.2, tBase: 0.3, B: 2.6, ponta: 0.5, hBase: 0.4, solo: { gama: 18, phi: 30, metodo: 'rankine' }, sobrecarga: 10, atrito: 0.6 });
  dim = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
}, 240000);

describe('relatório de esforços e armaduras de pilares-parede, paredes e muros (C4.63)', () => {
  it('tabelas: esforços por lado, cargas na base, armadura por pano com cortante, lados curtos e muros', () => {
    const r = relatorioParedes(s.modelo, dim);
    const por = (t: string) => r.tabelas.find((x) => x.titulo.startsWith(t))!;
    const esf = por('Esforços resultantes'), base = por('Cargas na base'), arm = por('Armadura por pano'), curtos = por('Lados curtos'), muros = por('Muros de arrimo');
    for (const t of [esf, base, arm, curtos, muros]) { expect(t).toBeDefined(); for (const l of t.linhas) expect(l).toHaveLength(t.cabecalho.length); }
    // M1 e M2 (um trecho, um lance cada em 2 lances) e PP1 (L com 2 lados): uma linha por lado e lance
    const lados = [...dim.pilaresParede!, ...dim.paredes!].flatMap((x) => x.lados);
    expect(esf.linhas).toHaveLength(lados.length);
    expect(new Set(esf.linhas.map((l) => l[0]))).toEqual(new Set(['M1', 'M2', 'PP1']));
    // uma linha de armadura por pano, com V, VRd1 e VRd2 do pano
    const panos = dim.armaduraParedes!.flatMap((w) => w.panos);
    expect(arm.linhas).toHaveLength(panos.length);
    const p0 = dim.armaduraParedes![0].panos[0], l0 = arm.linhas[0];
    expect(l0[7]).toBe(p0.cortante.V.toFixed(1).replace('.', ','));
    expect(l0[8]).toBe(p0.cortante.VRd1.toFixed(1).replace('.', ','));
    expect(l0[9]).toBe(p0.cortante.VRd2.toFixed(1).replace('.', ','));
    // cargas na base: N,máx do M1 igual ao do dimensionamento
    const m1 = dim.paredes!.find((x) => x.nome === 'M1')!;
    expect(base.linhas.find((l) => l[0] === 'M1')![2]).toBe(m1.baseElu.Nmax.toFixed(1).replace('.', ','));
    // lados curtos do PP1 em barra
    expect(curtos.linhas.some((l) => l[0] === 'PP1')).toBe(true);
    // muro: uma linha com os fatores de segurança do cálculo
    expect(muros.linhas).toHaveLength(1);
    expect(muros.linhas[0][0]).toBe('MA1');
    expect(muros.linhas[0][2]).toBe(dim.muros![0].estabilidade.FSt.toFixed(2).replace('.', ','));
  });
  it('sem paredes, pilares-parede nem muros: nenhuma tabela', () => {
    expect(relatorioParedes(s.modelo, {}).tabelas).toEqual([]);
  });
});

describe('listagem geral com paredes e pilares-parede (K1.11.44)', () => {
  it('coordenadas dos lados, comprimento, ângulo, espessura por lance, nasce/morre e vínculo', () => {
    const g = listagemGeral(s.modelo);
    expect(g.paredes.map((w) => `${w.nome}:${w.categoria}`)).toEqual(['PP1:pilar-parede', 'M1:parede', 'M2:parede']);
    const m1 = g.paredes.find((w) => w.nome === 'M1')!;
    expect(m1).toMatchObject({ descricao: 'concreto', nasce: 'Fundação', morre: 'Tipo 1', vinculo: 'engastado na base', aberturas: 1 });
    expect(m1.lados).toHaveLength(1);
    expect(m1.lados[0]).toMatchObject({ a: [0, 0], z: [12, 0], L: 12, angulo: 0, modelo: 'casca' });
    expect(m1.lados[0].espessuras.every((e) => e.t === 0.2)).toBe(true);
    expect(m1.lados[0].espessuras.map((e) => e.pavimento)).toEqual(['Térreo', 'Tipo 1']);
    const m2 = g.paredes.find((w) => w.nome === 'M2')!;
    expect(m2.lados[0]).toMatchObject({ a: [0, 6], z: [12, 6] });
    // PP1: tipo L com 2 lados (4 m e 0,8 m), cada um com 0,2 m de espessura (0,1 + 0,1)
    const pp = g.paredes.find((w) => w.nome === 'PP1')!;
    expect(pp.descricao).toBe('L');
    expect(pp.lados.map((l) => l.L)).toEqual([4, 0.8]);
    expect(pp.lados.map((l) => l.angulo)).toEqual([0, 90]);
    expect(pp.lados[0].a).toEqual([20, 20]);
    expect(pp.lados[0].espessuras.at(-1)!.t).toBeCloseTo(0.2, 9);
  });
});
