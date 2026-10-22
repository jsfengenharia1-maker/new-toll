// E1d: dimensionamento das paredes no edifício (integração com a análise em casca) e pano contra cálculo manual.
import { describe, expect, it } from 'vitest';
import { concrete } from '../concrete';
import { analisarEdificio, type AnaliseEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { dimensionarAbertura, dimensionarPano, extrapolarBordas, type ElementoPano } from './paredesDim';
import { opcoesEmUso } from './opcoes';
import type { Forcas } from './paredesArmadura';
import { caixa, nomePav, ok, padrao } from './paredesFixtures';

const c30 = concrete(30, 1.4), fyd = 500 / 1.15;
const mat = { fck: 30, fcd: c30.fcd, fctd: c30.fctd, sigmaCd: c30.sigmaCd, fyd, d1: 0.043 };
const F0: Forcas = { nx: 0, ny: 0, nxy: 0, mx: 0, my: 0, mxy: 0, qx: 0, qy: 0 };

describe('pano (núcleo puro)', () => {
  // grade 4 colunas de 1 m × 3 linhas de 1 m; flexão fora do plano linear em z: my = 12·(1 − z/3) kN·m/m (balanço com apoio no topo)
  const els: ElementoPano[] = [];
  for (let i = 0; i < 4; i++) for (const z of [0.5, 1.5, 2.5]) els.push({ s: i + 0.5, z, area: 1, forcas: [{ ...F0, my: 12 * (1 - z / 3), ny: -100 }] });
  const op = opcoesEmUso(undefined);
  const base = { nome: 'p', t: 0.2, le: 3, d1: 0.043, mat, matH: mat, conc: c30, elementos: els, combos: ['C1'], colunas: [0, 1, 2, 3, 4], linhas: [0, 1, 2, 3], op, simples: false };
  it('flexão fora do plano: armadura vertical pelo ponto mais exigente com cumprimento de 100 %', () => {
    const r = dimensionarPano({ ...base, op: { ...op, paredeCumprimento: 100 } });
    const m1min = 100 * (0.015 + 0.03 * 0.2);
    expect(m1min).toBeLessThan(12 * (1 - 0.5 / 3));
    // ponto z = 0,5: my = 10 + 2ª ordem (λ = 52 > 35); camada = N/2 + M/z com z = 0,9d; N = −100 kN/m
    const z = 0.9 * (0.2 - 0.043);
    const m2 = ((100 * 9) / 10) * Math.min(0.005 / (0.2 * (100 / (0.2 * c30.fcd * 1000) + 0.5)), 0.005 / 0.2);
    const my = Math.max(12 * (1 - 0.5 / 3), m1min) + m2;
    const esperado = (Math.max(0, my / z - 50) / (fyd * 1000)) * 1e4;
    expect(r.req.vert).toBeCloseTo(esperado, 6);
    expect(r.status).toBe('ok');
    expect(r.cumprimento).toBeCloseTo(1, 9);
    expect(r.asVert).toBeGreaterThanOrEqual(r.req.vert - 1e-9);
    expect(r.pontos.length).toBe(0);
  });
  it('cumprimento menor: malha menor ou igual, pontos marcados e reforço local quando a malha é menor', () => {
    const r100 = dimensionarPano({ ...base, op: { ...op, paredeCumprimento: 100 } });
    const r60 = dimensionarPano({ ...base, op: { ...op, paredeCumprimento: 60 } });
    expect(r60.asVert).toBeLessThanOrEqual(r100.asVert);
    expect(r60.cumprimento).toBeGreaterThanOrEqual(0.6);
    if (r60.asVert < r100.asVert) { expect(r60.pontos.length).toBeGreaterThan(0); expect(r60.reforcos.length).toBeGreaterThan(0); }
  });
  it('armadura bloqueada insuficiente reprova com o cumprimento medido', () => {
    const r = dimensionarPano({ ...base, op: { ...op, paredeCumprimento: 100 }, bloqueio: { vert: { phi: 6.3, s: 0.4 }, hor: { phi: 6.3, s: 0.3 } } });
    expect(r.bloqueada).toBe(true);
    expect(r.status).toBe('fail');
    expect(r.mensagens.join(' ')).toMatch(/bloqueada insuficiente|vertical mínima/);
  });
  it('só horizontal: reprova se algum ponto exige vertical; armar só quando necessário deixa o pano sem armadura', () => {
    const r = dimensionarPano({ ...base, op: { ...op, paredeSoHorizontal: 1 } });
    expect(r.vert).toBeNull();
    expect(r.status).toBe('fail');
    expect(r.mensagens.join(' ')).toMatch(/Só armadura horizontal/);
    const leves = els.map((e) => ({ ...e, forcas: [{ ...F0, ny: -80 }] }));
    const s2 = dimensionarPano({ ...base, elementos: leves, op: { ...op, paredeArmarSempre: 0 } });
    expect(s2.armada).toBe(false);
    expect(s2.status).toBe('ok');
    const s3 = dimensionarPano({ ...base, elementos: leves, op });
    expect(s3.armada).toBe(true);
    expect(s3.asVert).toBeGreaterThanOrEqual(((op.paredeTaxaVertMin / 100) * 0.2 * 1e4) / 2 - 1e-9);
  });
  it('perfil NBR exige 100 % (todo ponto atende); sistema, 90 %', () => {
    expect(opcoesEmUso(undefined, 'sistema').paredeCumprimento).toBe(90);
    expect(opcoesEmUso(undefined, 'nbr').paredeCumprimento).toBe(100);
  });
  it('concreto simples: sem armadura e reprova quando a tração passa de fctd/1,2', () => {
    const f = dimensionarPano({ ...base, simples: true, elementos: els.map((e) => ({ ...e, forcas: [{ ...F0, ny: -100 }] })) });
    expect(f.armada).toBe(false);
    expect(f.status).toBe('ok');
    const r = dimensionarPano({ ...base, simples: true, elementos: els.map((e) => ({ ...e, forcas: [{ ...F0, ny: 400 }] })) });
    expect(r.status).toBe('fail');
  });
  it('extrapolação linear às bordas: my linear em z é reproduzido em z = 0 e z = H', () => {
    const e = extrapolarBordas(els, [0, 1, 2, 3, 4], 3);
    const base0 = e.find((x) => x.z === 0 && x.s === 0.5)!, topo = e.find((x) => x.z === 3 && x.s === 0.5)!;
    expect(base0.forcas[0].my).toBeCloseTo(12, 9);
    expect(topo.forcas[0].my).toBeCloseTo(0, 9);
    expect(base0.area).toBeCloseTo(0.5, 9);
  });
});

describe('abertura (núcleo puro)', () => {
  const baseA = { a: { id: 'a1', tipo: 'porta' as const, s: 3, largura: 1, peitoril: 0, altura: 2.1, pavimento: 'p' }, nomePav: 'T', lado: 0, lance: 'p', t: 0.2, conc: c30, fyd, fywk: 500, gammaS: 1.15, cobrimento: 0.03, hVerga: 0.9, hPeitoril: 0.05, peitoril: { combos: [{ N: 0, M: 0, V: 0 }] }, asVertVizinho: 4, canto: true };
  it('verga: T = N/2 + M/z; montantes = As vertical interrompida', () => {
    const r = dimensionarAbertura({ ...baseA, verga: { combos: [{ N: 20, M: 30, V: 40 }] } });
    const d = 0.9 - 0.03 - 0.01, z = 0.9 * d;
    expect(r.necessaria.verga).toBeCloseTo(((20 / 2 + 30 / z) / (fyd * 1000)) * 1e4, 6);
    expect(r.necessaria.montante).toBeCloseTo(4 * 1, 9);
    expect(r.armadura.verga.n * Math.PI * (r.armadura.verga.phi / 20) ** 2).toBeGreaterThanOrEqual(r.necessaria.verga - 1e-9);
    expect(r.status).toBe('ok');
    expect(r.armadura.canto).toBeDefined();
  });
  it('armadura padrão menor que a necessária reprova', () => {
    const r = dimensionarAbertura({ ...baseA, verga: { combos: [{ N: 20, M: 300, V: 40 }] }, padrao: { verga: { n: 2, phi: 8 }, estribo: { phi: 5, s: 0.2 }, montante: { n: 2, phi: 10 } } });
    expect(r.origem).toBe('padrao');
    expect(r.status).toBe('fail');
  });
});

describe('paredes: armadura no edifício', () => {
  let cx: ReturnType<typeof caixa>, an: AnaliseEdificio;
  it('muro de subsolo sob empuxo: panos por lance, mínimos e flexão fora do plano', () => {
    cx = caixa();
    an = analisarEdificio(cx.s.modelo);
    const d = dimensionarEdificio(cx.s.modelo, an), w = d.armaduraParedes!;
    expect(w.length).toBe(2);
    const m1 = w[0], m2 = w[1];
    expect(m1.status).toBe('ok');
    const terreo = m1.panos.find((p) => p.nomePav === 'Térreo')!, tipo = m1.panos.find((p) => p.nomePav === 'Tipo 1')!;
    // base do muro (apoiado no topo, engastado na base): M ≈ q0·H²/15 característico; a malha de 1 m e a laje flexível reduzem o pico
    expect(terreo.req.vert).toBeGreaterThan(5.5);
    expect(terreo.req.vert).toBeLessThan(10);
    expect(terreo.req.vert).toBeGreaterThan(tipo.req.vert);
    for (const p of m1.panos) {
      expect(p.asVert).toBeGreaterThanOrEqual(((0.4 / 100) * 0.2 * 1e4) / 2 - 1e-9);
      expect(p.asHor).toBeGreaterThanOrEqual(0.25 * p.asVert - 1e-9);
      expect(p.cumprimento).toBeGreaterThanOrEqual(0.9 - 1e-9);
    }
    // simetria entre as duas paredes
    expect(m2.panos[0].req.vert).toBeCloseTo(m1.panos[0].req.vert, 3);
    expect(m1.lados.every((l) => l.status === 'ok')).toBe(true);
    expect(d.resumoAcoParedes!.length).toBeGreaterThan(0);
    expect(d.detalhesParedes![0].barras.some((x) => x.tipo === 'vertical')).toBe(true);
  }, 120000);

  it('armadura horizontal em grampos: o detalhamento troca barras corridas por grampos', () => {
    const b = cx.s.modelo;
    const dg = dimensionarEdificio(b, { ...an, opcoes: { ...an.opcoes, paredeHorizontalGrampos: 1 } }), d0 = dimensionarEdificio(b, an);
    const tipos = (d: typeof d0) => new Set(d.detalhesParedes![0].barras.map((x) => x.tipo));
    expect(tipos(dg).has('grampo')).toBe(true);
    expect(tipos(dg).has('horizontal')).toBe(false);
    expect(tipos(d0).has('horizontal')).toBe(true);
    // mesma área por face: n de grampos = linhas de uma face; n de barras corridas = 2 × linhas
    const nG = dg.detalhesParedes![0].barras.filter((x) => x.tipo === 'grampo').reduce((t, x) => t + x.n, 0), nH = d0.detalhesParedes![0].barras.filter((x) => x.tipo === 'horizontal').reduce((t, x) => t + x.n, 0);
    expect(nH).toBeGreaterThanOrEqual(2 * nG - 1e-9);
  }, 120000);

  it('fator de cumprimento 90 % × 100 %: armadura menor e pontos marcados', () => {
    const b = cx.s.modelo;
    const r100 = dimensionarEdificio(b, { ...an, opcoes: { ...an.opcoes, paredeCumprimento: 100 } }).armaduraParedes![0];
    const r90 = dimensionarEdificio(b, an).armaduraParedes![0];
    const aco = (r: typeof r90) => r.panos.reduce((s, p) => s + p.asVert, 0);
    expect(aco(r90)).toBeLessThanOrEqual(aco(r100) + 1e-9);
    expect(r100.panos.every((p) => p.cumprimento >= 1 - 1e-9)).toBe(true);
  }, 120000);
});

describe('pilar-parede: armadura', () => {
  it('lado longo em casca (malha) e lado curto como pilar (fibras)', () => {
    const s = padrao(1), t1 = nomePav(s, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'pilarParede.tipo', { nome: 'L', vertices: [[0, 0], [4, 0], [4, 0.8]], esq: 0.1, dir: 0.1 });
    ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0, morre: t1 });
    ok(s, 'laje.criar', { grupo: g, contorno: [[-1, -1], [5, -1], [5, 2], [-1, 2]] });
    const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an), w = d.armaduraParedes!.find((x) => x.tipo === 'pilarParede')!;
    expect(w.status).toBe('ok');
    expect(w.panos.length).toBe(2);
    for (const p of w.panos) expect(p.asVert).toBeGreaterThanOrEqual(((0.4 / 100) * 0.2 * 1e4) / 2 - 1e-9);
    const curto = w.lados.filter((l) => l.modelo === 'barra'), longo = w.lados.filter((l) => l.modelo === 'casca');
    expect(curto.length).toBe(2);
    expect(longo.length).toBe(2);
    for (const l of curto) {
      expect(l.status).toBe('ok');
      expect(l.util).toBeLessThanOrEqual(1);
      // As ≥ 0,4 % de L·t (0,8 × 0,2 m)
      const bars = l.barra!;
      expect(bars.As).toBeGreaterThanOrEqual(0.004 * 0.8 * 0.2 - 1e-12);
    }
    for (const l of longo) expect(l.util).toBeLessThan(1);
    const det = d.detalhesParedes!.find((x) => x.tipo === 'pilarParede')!;
    expect(det.barras.some((x) => x.tipo === 'ladoCurto')).toBe(true);
    expect(det.barras.some((x) => x.tipo === 'estriboLadoCurto')).toBe(true);
  }, 120000);
});
