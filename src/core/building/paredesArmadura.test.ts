// E1d: armadura de elemento de parede (sanduíche + chapa ortogonal) contra cálculo manual.
import { describe, expect, it } from 'vitest';
import { concrete, barArea } from '../concrete';
import { asMalha, atende, camadas, cortanteTransversal, escolherMalha, escolherMalhasPano, fracaoAtende, listaMalhas, membrana, requisitosElemento, reforcosLocais, verificaConcretoSimples, type MatParede, type PontoPano } from './paredesArmadura';

const c = concrete(30, 1.4), fyd = 500 / 1.15;
const mat: MatParede = { fck: 30, fcd: c.fcd, fctd: c.fctd, sigmaCd: c.sigmaCd, fyd, d1: 0.043 };
const F = (o: Partial<Record<'nx' | 'ny' | 'nxy' | 'mx' | 'my' | 'mxy' | 'qx' | 'qy', number>>) => ({ nx: 0, ny: 0, nxy: 0, mx: 0, my: 0, mxy: 0, qx: 0, qy: 0, ...o });

describe('membrana (chapa com armadura ortogonal)', () => {
  it('cisalhamento puro: ftx = fty = |nxy|, biela 2|nxy|', () => {
    expect(membrana(0, 0, 100)).toEqual({ ftx: 100, fty: 100, nc: 200 });
  });
  it('tração uniaxial e compressão uniaxial', () => {
    expect(membrana(100, 0, 0)).toEqual({ ftx: 100, fty: 0, nc: 0 });
    expect(membrana(0, -80, 0)).toEqual({ ftx: 0, fty: 0, nc: 80 });
  });
  it('compressão em x com cisalhamento: fty = ny + nxy²/|nx| e biela |nx|(1 + (nxy/nx)²)', () => {
    const m = membrana(-100, 20, 50);
    expect(m.ftx).toBe(0);
    expect(m.fty).toBeCloseTo(20 + 2500 / 100, 9);
    expect(m.nc).toBeCloseTo(100 * (1 + 0.25), 9);
  });
  it('compressão biaxial: sem armadura, biela = maior compressão principal', () => {
    const m = membrana(-100, -60, 10);
    expect(m.ftx).toBe(0);
    expect(m.fty).toBe(0);
    const p = -160 / 2 - Math.sqrt(20 ** 2 + 100);
    expect(m.nc).toBeCloseTo(-p, 9);
  });
  it('equilíbrio do traço: ftx + fty − nc = nx + ny quando há armadura', () => {
    for (const [nx, ny, nxy] of [[30, 10, 40], [-70, 50, 30], [20, -90, -45]]) {
      const m = membrana(nx, ny, nxy);
      expect(m.ftx + m.fty - m.nc).toBeCloseTo(nx + ny, 9);
    }
  });
  it('camadas: n/2 ± m/z', () => {
    const [a, z] = camadas(F({ nx: 10, ny: -20, my: 6 }), 0.12);
    expect(a.ny).toBeCloseTo(-10 + 50, 9);
    expect(z.ny).toBeCloseTo(-10 - 50, 9);
  });
});

describe('requisitos do elemento', () => {
  it('flexão fora do plano pura, t = 20 cm: As = M/(0,9d·fyd) por face', () => {
    const r = requisitosElemento(F({ my: 10 }), 0.2, 3, mat);
    const d = 0.2 - 0.043;
    expect(r.rv).toBeCloseTo((10 / (0.9 * d) / (fyd * 1000)) * 1e4, 6);
    expect(r.rh).toBe(0);
  });
  it('compressão alta cobre a flexão: sem armadura calculada, momento mínimo e 2ª ordem registrados', () => {
    const r = requisitosElemento(F({ ny: -800, my: 5 }), 0.2, 3, mat);
    expect(r.rv).toBe(0);
    expect(r.m1min).toBeCloseTo(800 * (0.015 + 0.03 * 0.2), 9);
    expect(r.lambda).toBeCloseTo((3 * Math.sqrt(12)) / 0.2, 9);
    expect(r.m2d).toBeGreaterThan(0);
  });
  it('tração vertical uniforme: As = N/2/fyd por face', () => {
    const r = requisitosElemento(F({ ny: 200 }), 0.2, 3, mat);
    expect(r.rv).toBeCloseTo((100 / (fyd * 1000)) * 1e4, 6);
  });
  it('cisalhamento no plano pede armadura nos dois sentidos', () => {
    const r = requisitosElemento(F({ nxy: 200 }), 0.2, 3, mat);
    expect(r.rv).toBeCloseTo(r.rh, 9);
    expect(r.rv).toBeGreaterThan(0);
  });
  it('biela esmagada reprova (util > 1)', () => {
    expect(requisitosElemento(F({ ny: -6000 }), 0.15, 3, mat).util).toBeGreaterThan(1);
    expect(requisitosElemento(F({ ny: -500 }), 0.2, 3, mat).util).toBeLessThan(1);
  });
});

describe('cortante transversal', () => {
  it('VRd1 e VRd2 por metro contra a fórmula da NBR 6118, 19.4', () => {
    const t = 0.25, d = t - 0.043, cv = cortanteTransversal(t, 0.043, 5, 0, mat);
    const rho = 5 / (100 * d * 100), k = Math.max(1, 1.6 - d);
    expect(cv.VRd1).toBeCloseTo(0.25 * mat.fctd * 1000 * k * (1.2 + 40 * rho) * d, 6);
    expect(cv.VRd2).toBeCloseTo(0.27 * (1 - 30 / 250) * mat.fcd * 1000 * d, 6);
  });
});

describe('malhas e cumprimento', () => {
  const lim = { t: 0.2, bitolaMax: 16, espMin: 8, espMax: 40 };
  it('lista ordenada por área, bitola ≤ t/8 e espaçamento ≤ 2t', () => {
    const l = listaMalhas(lim);
    for (let i = 1; i < l.length; i++) expect(l[i].As).toBeGreaterThanOrEqual(l[i - 1].As);
    expect(Math.max(...l.map((m) => m.phi))).toBeLessThanOrEqual(16);
    expect(Math.max(...l.map((m) => m.s))).toBeLessThanOrEqual(0.4);
    expect(listaMalhas({ ...lim, t: 0.1 }).every((m) => m.phi <= 12.5)).toBe(true);
  });
  it('menor malha que atende', () => {
    const e = escolherMalha(3, listaMalhas(lim));
    expect(e.ok).toBe(true);
    expect(e.malha.As).toBeGreaterThanOrEqual(3);
    expect(e.malha.As).toBeCloseTo(asMalha(e.malha.phi, e.malha.s), 9);
    expect(asMalha(10, 0.1)).toBeCloseTo((barArea(10) * 1e4) / 0.1, 9);
  });
  it('fator de cumprimento 90 % × 80 %: armadura menor com o fator menor e pontos fora marcados', () => {
    // 20 pontos de 1 m²: 16 com necessidade 2, 2 com 6 e 2 com 12 (cm²/m)
    const pts: PontoPano[] = [];
    const add = (n: number, rv: number) => { for (let i = 0; i < n; i++) pts.push({ s: pts.length, z: 1, area: 1, rv, rh: 0, util: 0.1, V: 0, ncomp: 0 }); };
    add(16, 2); add(2, 6); add(2, 12);
    const base = { t: 0.2, d1: 0.043, mat, taxaVertMin: 0, taxaVertMax: 4, taxaHorMin: 0, horFracVert: 0, limites: lim, asMinMecanica: 0, soHorizontal: false };
    const e90 = escolherMalhasPano(pts, { ...base, cumprimento: 0.9 });
    const e80 = escolherMalhasPano(pts, { ...base, cumprimento: 0.8 });
    expect(e90.ok && e80.ok).toBe(true);
    expect(e90.fracao).toBeGreaterThanOrEqual(0.9);
    expect(e80.fracao).toBeGreaterThanOrEqual(0.8);
    expect(e90.vert.As).toBeGreaterThanOrEqual(6);
    expect(e80.vert.As).toBeLessThan(e90.vert.As);
    expect(e80.vert.As).toBeGreaterThanOrEqual(2);
    expect(fracaoAtende(pts, e80.vert.As, 0, 0.2, 0.043, mat)).toBeCloseTo(0.8, 9);
    expect(atende(pts[19], e80.vert.As, 0, 0.2, 0.043, mat)).toEqual({ ok: false, motivo: 'vertical' });
  });
  it('reforços locais agrupam faixas vizinhas com déficit', () => {
    const r = reforcosLocais('vertical', [[0, 1, 10], [1, 2, 9], [2, 3, 2], [3, 4, 8]], 4, 10);
    expect(r.length).toBe(2);
    expect(r[0].de).toBe(0);
    expect(r[0].ate).toBe(2);
    expect(r[0].As).toBeCloseTo(6 + 5, 9);
    expect(r[1].As).toBeCloseTo(4, 9);
    expect(r[0].n * barArea(r[0].phi) * 1e4).toBeGreaterThanOrEqual(r[0].As);
  });
});

describe('concreto simples', () => {
  it('compressão centrada pequena atende; tração acima de fctd/1,2 reprova', () => {
    expect(verificaConcretoSimples(F({ ny: -300 }), 0.2, mat).razao).toBeLessThan(1);
    expect(verificaConcretoSimples(F({ ny: 300 }), 0.2, mat).razao).toBeGreaterThan(1);
    expect(verificaConcretoSimples(F({ my: 2 }), 0.2, mat).sigmaT).toBeCloseTo(2 / ((0.2 * 0.2) / 6) / 1000, 9);
  });
});
