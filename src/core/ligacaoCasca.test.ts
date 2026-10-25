// Ligação rígida barra–casca no plano (25/10/2026): viga no plano de paredes (cascas de 6 nós) contra as soluções analíticas
// de viga em balanço engastada numa parede rígida e de viga biengastada entre duas paredes rígidas (M = qL²/12 nas faces),
// equilíbrio global de força e momento, comparação com a ligação antiga (só o giro no plano, quase rotulada) e com o OpenSees
// (ShellMITC4 de 0,125 m + elasticBeamColumn com rigidLink 'beam' nos nós da aresta dentro da altura da viga).
// Referência: `python3 validation/opensees/ligacao_barra_casca.py` → ligacao_barra_casca.json.
import { describe, expect, it } from 'vitest';
import { resolver3, type Caso3, type Modelo3, type V3 } from './fe3d';
import { ligacoesBarraCasca } from './ligacaoCasca';
import ref from '../../validation/opensees/ligacao_barra_casca.json';

const E = 3e7, b = 0.2, h = 0.5, I = (b * h ** 3) / 12, A = b * h;

/** Parede retangular no plano xz (y = 0), x de x0 a x1, z de 0 a H, malha nx × nz retângulos em 2 triângulos de 6 nós; base engastada. */
function parede(m: Modelo3, x0: number, x1: number, H: number, nx: number, nz: number, Ep: number, t = 0.2) {
  const mapa = new Map<string, number>();
  const no = (x: number, z: number) => {
    const k = `${Math.round(x * 1e6)}|${Math.round(z * 1e6)}`;
    let i = mapa.get(k);
    if (i === undefined) {
      i = m.nos.findIndex((p) => Math.abs(p[0] - x) < 1e-9 && Math.abs(p[1]) < 1e-9 && Math.abs(p[2] - z) < 1e-9);
      if (i < 0) { i = m.nos.length; m.nos.push([x, 0, z]); }
      mapa.set(k, i);
    }
    return i;
  };
  const dx = (x1 - x0) / nx, dz = H / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const xa = x0 + i * dx, za = j * dz;
    const tri = (p: [number, number][]) => {
      const mid = (a: [number, number], c: [number, number]) => no((a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
      m.cascas!.push({ nos: [no(...p[0]), no(...p[1]), no(...p[2]), mid(p[0], p[1]), mid(p[1], p[2]), mid(p[2], p[0])], E: Ep, nu: 0.2, h: t });
    };
    tri([[xa, za], [xa + dx, za], [xa + dx, za + dz]]);
    tri([[xa, za], [xa + dx, za + dz], [xa, za + dz]]);
  }
  for (const [k, i] of mapa) if (Math.abs(Number(k.split('|')[1])) < 1) m.apoios.set(i, [0, 1, 2, 3, 4, 5]);
}

const busca = (m: Modelo3, p: V3) => m.nos.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < 1e-9);

/** Resíduo de força e momento (origem) de cargas nodais + carga distribuída da viga + reações, relativo à carga. */
function residuo(m: Modelo3, r: ReturnType<typeof resolver3>, q: number, xi: number, xj: number, z: number) {
  const L = xj - xi, F = -q * L, t = [0, 0, F, 0, -((xi + xj) / 2) * F, 0];
  for (const [no, f] of r.reacoes[0]) {
    const [x, y, zz] = m.nos[no];
    for (let k = 0; k < 6; k++) t[k] += f[k];
    t[3] += y * f[2] - zz * f[1]; t[4] += zz * f[0] - x * f[2]; t[5] += x * f[1] - y * f[0];
  }
  void z;
  return Math.max(...t.map(Math.abs)) / Math.abs(F * Math.max(Math.abs(xi), Math.abs(xj), 1));
}

type Modo = 'rigida' | 'giro' | 'rbe2';
const RIGIDA = { E: E * 100, G: (E * 100) / 2.4, A: 10, Iz: 10, Iy: 10, J: 10 };

/** Liga a viga às paredes nos cantos: 'rigida' (padrão, ligacaoCasca.ts), 'giro' (antiga) ou 'rbe2' (barras rígidas do canto aos nós da aresta dentro da altura da viga, como o rigidLink do OpenSees). */
function ligar(m: Modelo3, cantos: number[], modo: Modo, H: number) {
  if (modo === 'rigida') m.ligacoesCasca = ligacoesBarraCasca(m, cantos, { raio: () => h, abaixo: true });
  if (modo === 'rbe2') for (const c of cantos) m.nos.forEach((p, k) => { if (k !== c && Math.abs(p[0] - m.nos[c][0]) < 1e-9 && Math.abs(p[1]) < 1e-9 && p[2] >= H - h - 1e-9 && p[2] < H - 1e-9) m.barras.push({ i: c, j: k, ...RIGIDA }); });
}

const viga = (i: number, j: number) => ({ i, j, E, G: E / 2.4, A, Iz: I, Iy: (h * b ** 3) / 12, J: 1e-3 });

function biengastada(Ep: number, modo: Modo, malha = 0.5, L = 6, q = 20) {
  const m: Modelo3 = { nos: [], barras: [], apoios: new Map(), cascas: [] };
  const H = 3;
  parede(m, -2, 0, H, Math.round(2 / malha), Math.round(H / malha), Ep);
  parede(m, L, L + 2, H, Math.round(2 / malha), Math.round(H / malha), Ep);
  const i = busca(m, [0, 0, H]), j = busca(m, [L, 0, H]);
  m.nos.push([L / 2, 0, H]);
  const meio = m.nos.length - 1;
  m.barras.push(viga(i, meio), viga(meio, j));
  ligar(m, [i, j], modo, H);
  const caso: Caso3 = { nodais: [], distribuidas: [{ barra: 0, q: [0, 0, -q] }, { barra: 1, q: [0, 0, -q] }] };
  const r = resolver3(m, [caso]);
  expect(r.erro).toBeUndefined();
  return { m, r, Mi: Math.abs(r.esforcos[0][0][5]), Mj: Math.abs(r.esforcos[0][1][11]), uz: -r.desloc[0][meio * 6 + 2], res: residuo(m, r, q, 0, L, H) };
}

function balanco(Ep: number, modo: Modo, malha = 0.5, L = 3, q = 10) {
  const m: Modelo3 = { nos: [], barras: [], apoios: new Map(), cascas: [] };
  const H = 3;
  parede(m, -2, 0, H, Math.round(2 / malha), Math.round(H / malha), Ep);
  const i = busca(m, [0, 0, H]);
  m.nos.push([L, 0, H]);
  m.barras.push(viga(i, m.nos.length - 1));
  ligar(m, [i], modo, H);
  const r = resolver3(m, [{ nodais: [], distribuidas: [{ barra: 0, q: [0, 0, -q] }] }]);
  expect(r.erro).toBeUndefined();
  const u = r.desloc[0], ip = m.nos.length - 1;
  return { m, r, Mi: Math.abs(r.esforcos[0][0][5]), flecha: -u[ip * 6 + 2], giroBase: u[i * 6 + 4], uzBase: -u[i * 6 + 2], res: residuo(m, r, q, 0, L, H) };
}

describe('ligação rígida barra–casca no plano: soluções analíticas', () => {
  it('viga biengastada entre duas paredes rígidas: M = qL²/12 nas faces (0,5 %); a ligação antiga fica quase rotulada', () => {
    const q = 20, L = 6, Mref = (q * L * L) / 12;
    const rig = biengastada(E * 1000, 'rigida');
    expect(rig.Mi / Mref).toBeGreaterThan(0.995);
    expect(rig.Mi / Mref).toBeLessThan(1.001);
    expect(rig.Mj / Mref).toBeGreaterThan(0.995);
    expect(rig.res).toBeLessThan(1e-7);
    // parede de concreto real: a estabilização do giro (∝ E·h) é fraca e a ligação antiga fica quase rotulada
    const giro = biengastada(E, 'giro');
    expect(giro.Mi / Mref).toBeLessThan(0.2);
    expect(giro.res).toBeLessThan(1e-9);
  });

  it('viga em balanço engastada numa parede rígida: flecha qL⁴/8EI (+ giro e recalque da ponta da parede) e M = qL²/2', () => {
    const q = 10, L = 3, f0 = (q * L ** 4) / (8 * E * I);
    const rig = balanco(E * 1000, 'rigida');
    // com a parede rígida a flecha é a da viga engastada (o resto é o giro θ·L e o recalque da ponta da parede, ínfimos)
    expect(rig.flecha / f0).toBeGreaterThan(0.999);
    expect(rig.flecha / f0).toBeLessThan(1.002);
    expect(Math.abs(rig.flecha - f0 - Math.abs(rig.giroBase) * L - rig.uzBase) / f0).toBeLessThan(1e-6);
    expect(rig.Mi).toBeCloseTo((q * L * L) / 2, 6);
    expect(rig.res).toBeLessThan(1e-7);
    // ligação antiga: o giro da ponta só tem a estabilização fraca da casca → flecha dezenas de vezes maior
    const giro = balanco(E, 'giro');
    expect(giro.flecha / f0).toBeGreaterThan(5);
  });

  it('parede de concreto (E real): a ligação fica entre a rótula e o engaste e converge com a malha', () => {
    const q = 20, L = 6, Mref = (q * L * L) / 12;
    const ms = [1, 0.5, 0.25].map((mh) => biengastada(E, 'rigida', mh).Mi / Mref);
    for (const v of ms) { expect(v).toBeGreaterThan(0.85); expect(v).toBeLessThan(1); }
    expect(Math.abs(ms[2] - ms[1])).toBeLessThan(Math.abs(ms[1] - ms[0]) + 0.01);
  });

  it('a ligação não enrijece a casca nem prende ao chão: sem barra (só cargas na parede), os deslocamentos não mudam', () => {
    const m: Modelo3 = { nos: [], barras: [], apoios: new Map(), cascas: [] };
    parede(m, 0, 2, 3, 4, 6, E);
    const top = m.nos.map((p, i) => [p, i] as const).filter(([p]) => Math.abs(p[2] - 3) < 1e-9).map(([, i]) => i);
    const caso: Caso3 = { nodais: top.map((n) => ({ no: n, f: [10, 0, -30, 0, 0, 0] })), distribuidas: [] };
    const r0 = resolver3(m, [caso]);
    // ligação num nó do topo com momento nulo aplicado: só o giro do nó muda (segue a vizinhança), os deslocamentos não
    const c = busca(m, [1, 0, 3]);
    const r1 = resolver3({ ...m, ligacoesCasca: ligacoesBarraCasca(m, [c], { abaixo: true }) }, [caso]);
    for (let d = 0; d < m.nos.length * 6; d++) if (d % 6 < 3) expect(Math.abs(r1.desloc[0][d] - r0.desloc[0][d])).toBeLessThan(1e-6 * Math.max(...r0.desloc[0].map(Math.abs)));
  });
});

describe('ligação barra–casca no plano: comparação com o OpenSees (parede de concreto, malha de 0,25 m)', () => {
  const R = ref.resultados, mh = 0.25;
  it('mesma ligação do OpenSees (barras rígidas do canto aos nós da aresta, como o rigidLink): M na face, flecha e giro do canto', () => {
    const be = biengastada(ref.E, 'rbe2', mh), ba = balanco(ref.E, 'rbe2', mh);
    expect(Math.abs(be.Mi / R.biengastada_rigido.Mi - 1)).toBeLessThan(0.01);
    expect(Math.abs(be.Mj / R.biengastada_rigido.Mj - 1)).toBeLessThan(0.01);
    expect(Math.abs(be.uz / R.biengastada_rigido.uz - 1)).toBeLessThan(0.01);
    expect(Math.abs(ba.flecha / R.balanco_rigido.uz - 1)).toBeLessThan(0.02);
    expect(Math.abs(ba.giroBase / R.balanco_rigido.giroCanto - 1)).toBeLessThan(0.05);
    expect(ba.Mi).toBeCloseTo(R.balanco_rigido.Mi, 6);
    expect(be.res).toBeLessThan(1e-7);
    expect(ba.res).toBeLessThan(1e-6); // barras rígidas de 0,125 m (12·EI/ℓ³ ≈ 2e14): piso do arredondamento
  });
  it('ligação rígida padrão (giro médio da vizinhança de raio h): M na face a 2,5 % do OpenSees; balanço a 10 %', () => {
    const be = biengastada(ref.E, 'rigida', mh), ba = balanco(ref.E, 'rigida', mh);
    expect(Math.abs(be.Mi / R.biengastada_rigido.Mi - 1)).toBeLessThan(0.025);
    expect(Math.abs(be.uz / R.biengastada_rigido.uz - 1)).toBeLessThan(0.025);
    expect(Math.abs(ba.flecha / R.balanco_rigido.uz - 1)).toBeLessThan(0.1);
    // a vizinhança inteira (não só a aresta) acompanha o giro: um pouco mais rígida que o rigidLink na aresta
    expect(be.Mi).toBeGreaterThan(R.biengastada_rigido.Mi);
    expect(be.Mi).toBeLessThan((20 * 36) / 12);
  });
  it('sem a ligação (giro no plano só pela estabilização da casca) e no OpenSees com a viga só no nó do canto: quase rótula', () => {
    const Mref = (20 * 36) / 12;
    expect(biengastada(ref.E, 'giro', mh).Mi / Mref).toBeLessThan(0.15);
    expect(R.biengastada_direto.Mi / Mref).toBeLessThan(0.15);
  });
});
