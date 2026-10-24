// E6d (K1.4.30): parcela axial uniforme do pilar-parede em L (faixas de `incluirParedes`, EA × f só no modo uniforme)
// contra o OpenSees (ShellMITC4 de 0,125 m + balancins rígidos que tomam a média ponderada de uz em cada linha + treliça
// de (f − 1)·E·A entre linhas). Referência: `python3 validation/opensees/parede_axial.py` → parede_axial.json.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { torcaoRet } from './analitico';
import { geometriaParedes } from './pilarParede';
import { axiaisDasFaixas, incluirParedes } from './pilarParedeModelo';
import { opcoesEmUso } from './opcoes';
import ref from '../../../validation/opensees/parede_axial.json';

const E = ref.E, nu = ref.nu;
type Saida = { canto: number[]; ponta1: number[]; ponta2: number[]; uzMedio: number; Rz: number; Mx: number; My: number; Rz_x2: number };
const R = ref.resultados as Record<string, Saida>;

function linha(pm: Modelo3, nos: number[], eixo: 0 | 1, q: number, g: 0 | 1 | 2): Caso3['nodais'] {
  const ord = [...nos].sort((a, c) => pm.nos[a][eixo] - pm.nos[c][eixo]), out: Caso3['nodais'] = [];
  for (let k = 0; k + 2 < ord.length; k += 2) {
    const Ls = Math.abs(pm.nos[ord[k + 2]][eixo] - pm.nos[ord[k]][eixo]);
    for (const [n, w] of [[ord[k], 1 / 6], [ord[k + 1], 4 / 6], [ord[k + 2], 1 / 6]] as const) { const f = [0, 0, 0, 0, 0, 0]; f[g] = q * Ls * w; out.push({ no: n, f }); }
  }
  return out;
}

function resolveL(caso: 1 | 3 | 4, f: number) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 3 }); // base em −3 m; topo no Tipo 1 (+3 m): H = 6 m
  s.executar('pilarParede.tipo', { vertices: [[0, 0], [ref.L1, 0], [ref.L1, ref.L2]], esq: ref.t / 2, dir: ref.t / 2 });
  const tp = s.modelo.tiposPilarParede![0].id, t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id;
  expect(s.executar('pilarParede.inserir', { tipo: tp, x: 0, y: 0, morre: t1 }).ok).toBe(true);
  const b = s.modelo, geo = geometriaParedes(b, { ...opcoesEmUso(b.opcoes), malhaCasca: 0.5 })!;
  const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() }, casos: Caso3[] = [{ nodais: [], distribuidas: [] }];
  const r0 = incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => E, Ev: E, Gv: E / 2.4, nu, gama: 0, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: () => {}, etiqueta: () => {}, hViga: 0.25, iG: 0 });
  if (f !== 1) pm.axiaisMedios = axiaisDasFaixas(r0.faixasAxiais, f);
  const topo = pm.nos.map((n, i) => [n, i] as const).filter(([n]) => Math.abs(n[2] - 3) < 1e-9).map(([, i]) => i);
  const lado1 = topo.filter((i) => Math.abs(pm.nos[i][1]) < 1e-9), lado2 = topo.filter((i) => Math.abs(pm.nos[i][0] - ref.L1) < 1e-9);
  const g = caso === 1 ? 0 : 2, q = caso === 1 ? ref.q : -2 * ref.q;
  casos[0].nodais.push(...linha(pm, lado1, 0, q, g), ...(caso === 4 ? [] : linha(pm, lado2, 1, q, g)));
  const r = resolver3(pm, casos);
  expect(r.erro).toBeUndefined();
  const busca = (x: number, y: number) => pm.nos.findIndex((n) => Math.abs(n[0] - x) < 1e-6 && Math.abs(n[1] - y) < 1e-6 && Math.abs(n[2] - 3) < 1e-9);
  const u = (x: number, y: number) => [0, 1, 2].map((k) => r.desloc[0][busca(x, y) * 6 + k]);
  let Rz = 0, Mx = 0, My = 0, Rz_x2 = 0;
  for (const [n, rr] of r.reacoes[0]) {
    const [x, y] = pm.nos[n];
    Rz += rr[2]; Mx += rr[3] + y * rr[2]; My += rr[4] - (x - ref.L1) * rr[2];
    if (y < 1e-6) { if (x < 2 - 1e-6) Rz_x2 += rr[2]; else if (Math.abs(x - 2) < 1e-6) Rz_x2 += 0.5 * rr[2]; }
  }
  // uz médio do topo ponderado pela influência de cada nó (pesos das arestas quadráticas)
  let sw = 0, su = 0;
  for (const lado of [lado1, lado2]) {
    const eixo = lado === lado1 ? 0 : 1, ord = [...lado].sort((a, c) => pm.nos[a][eixo] - pm.nos[c][eixo]);
    for (let k = 0; k + 2 < ord.length; k += 2) {
      const Ls = Math.abs(pm.nos[ord[k + 2]][eixo] - pm.nos[ord[k]][eixo]);
      for (const [n, w] of [[ord[k], 1 / 6], [ord[k + 1], 4 / 6], [ord[k + 2], 1 / 6]] as const) { sw += Ls * w; su += Ls * w * r.desloc[0][n * 6 + 2]; }
    }
  }
  const nyMax = Math.max(...r.cascas![0].map((e) => Math.abs(e[1])));
  return { canto: u(ref.L1, 0), ponta1: u(0, 0), ponta2: u(ref.L1, ref.L2), uzMedio: su / sw, Rz, Mx, My, Rz_x2, nyMax, r, pm, r0 };
}

describe('pilar-parede em L: rigidez axial separada da flexão contra o OpenSees (E6d, K1.4.30)', () => {
  for (const [caso, rotulo] of [[3, 'carga vertical nos dois lados'], [4, 'carga vertical só no lado 1 (excêntrica)'], [1, 'força linear em x']] as const) {
    it(`${rotulo}: f = 3 contra o OpenSees; equilíbrio`, () => {
      const o = R[`f3_c${caso}`], o1 = R[`f1_c${caso}`], m = resolveL(caso, 3), m1 = resolveL(caso, 1);
      const esc = Math.max(...[...o.canto, ...o.ponta1, ...o.ponta2].map(Math.abs));
      const rel = (a: number, b: number) => Math.abs(a - b) / esc;
      // deslocamentos do topo: dentro de 3 % do maior deslocamento do caso (malha de 0,5 m contra 0,125 m)
      for (let k = 0; k < 3; k++) {
        expect(rel(m.canto[k], o.canto[k]), `canto ${k}`).toBeLessThan(0.03);
        expect(rel(m.ponta1[k], o.ponta1[k]), `ponta1 ${k}`).toBeLessThan(0.03);
        expect(rel(m.ponta2[k], o.ponta2[k]), `ponta2 ${k}`).toBeLessThan(0.03);
      }
      if (caso !== 1) {
        // encurtamento médio: razão f3/f1 do Statikos igual à do OpenSees (1 %) e próxima de 1/3
        expect(Math.abs(m.uzMedio / m1.uzMedio - o.uzMedio / o1.uzMedio)).toBeLessThan(0.01);
        expect(m.uzMedio / m1.uzMedio).toBeGreaterThan(0.3);
        expect(m.uzMedio / m1.uzMedio).toBeLessThan(0.36);
      }
      // equilíbrio global com a parcela axial (as forças da faixa entram nas reações da base)
      const P = caso === 1 ? 0 : 2 * ref.q * (caso === 4 ? ref.L1 : ref.L1 + ref.L2);
      expect(Math.abs(m.Rz - P)).toBeLessThan(1e-6 * Math.max(P, 1));
      // momentos da base: 0,2 % (o giro no plano da casca tem mola própria, já presente com f = 1); a faixa não muda o momento
      expect(Math.abs(m.Mx - o.Mx) / Math.abs(o.My)).toBeLessThan(0.002);
      expect(Math.abs(m.My - o.My) / Math.abs(o.My)).toBeLessThan(0.002);
      expect(Math.abs(m.My - m1.My) / Math.abs(o.My)).toBeLessThan(1e-5);
      expect(Math.abs(m.Rz_x2 - o.Rz_x2) / Math.max(Math.abs(o.Rz_x2), 100)).toBeLessThan(0.05);
    });
  }

  it('flexão no plano: na força lateral, f = 3 fica a 0,5 % de f = 1 (no OpenSees também), sem a majoração da membrana ortótropa', () => {
    const m3 = resolveL(1, 3), m1 = resolveL(1, 1), o3 = R.f3_c1, o1 = R.f1_c1;
    expect(Math.abs(m3.canto[0] / m1.canto[0] - 1)).toBeLessThan(0.005);
    expect(Math.abs(o3.canto[0] / o1.canto[0] - 1)).toBeLessThan(0.005);
  });

  it('esforços por elemento: o excedente axial volta às cascas como tensão uniforme (sem pico): Ny máximo da carga uniforme ≈ o de f = 1', () => {
    const m3 = resolveL(3, 3), m1 = resolveL(3, 1);
    // a força total é a mesma; a parcela uniforme não cria concentração: o pico de Ny muda menos de 5 %
    expect(Math.abs(m3.nyMax / m1.nyMax - 1)).toBeLessThan(0.05);
    // sem a correção de Ny (só a casca), o pico cairia para ≈ 1/3
    const semCorrecao = Math.max(...m3.r.cascas![0].map((e, k) => {
      let extra = 0;
      for (const ax of m3.pm.axiaisMedios ?? []) for (const c of ax.cascas ?? []) if (c.casca === k) { let d = 0; ax.dofs.forEach((g, a) => (d += ax.c[a] * m3.r.desloc[0][g])); extra += c.fator * ax.k * d; }
      return Math.abs(e[1] - extra);
    }));
    expect(semCorrecao / m1.nyMax).toBeLessThan(0.5);
    expect(m3.r0.faixasAxiais!.length).toBe(12); // 6 m em linhas de 0,5 m, os dois lados juntos em cada linha
  });
});
