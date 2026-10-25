// Fixture do pilar-parede em L isolado (V7g/V7h): modelo de cascas do pilar-parede sem o resto do edifício, para as
// verificações contra equilíbrio e contra o OpenSees (validation/opensees/torcao_pp.py).
import { expect } from 'vitest';
import { opcoesEmUso } from '../building/opcoes';
import { geometriaParedes } from '../building/pilarParede';
import { incluirParedes } from '../building/pilarParedeModelo';
import { torcaoRet } from '../building/analitico';
import { comandosEdificioPadrao, Sessao } from '../commands';
import type { Caso3, Modelo3 } from '../fe3d';
import ref from '../../../validation/opensees/torcao_pp.json';

const E = ref.E, nu = ref.nu;

/** Cargas nodais de força linear q (kN/m) em `g` sobre os nós de uma linha de vértices e meios (ordem por `eixo`). */
export function linha(pm: Modelo3, nos: number[], eixo: 0 | 1, q: number, g: 0 | 1 | 2): Caso3['nodais'] {
  const ord = [...nos].sort((a, c) => pm.nos[a][eixo] - pm.nos[c][eixo]), out: Caso3['nodais'] = [];
  for (let k = 0; k + 2 < ord.length; k += 2) {
    const Ls = Math.abs(pm.nos[ord[k + 2]][eixo] - pm.nos[ord[k]][eixo]);
    for (const [n, w] of [[ord[k], 1 / 6], [ord[k + 1], 4 / 6], [ord[k + 2], 1 / 6]] as const) { const f = [0, 0, 0, 0, 0, 0]; f[g] = q * Ls * w; out.push({ no: n, f }); }
  }
  return out;
}

export function modeloL() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 3 }); // base em −3 m; topo no Tipo 1 (+3 m): H = 6 m
  s.executar('pilarParede.tipo', { vertices: [[0, 0], [ref.L1, 0], [ref.L1, ref.L2]], esq: ref.t / 2, dir: ref.t / 2 });
  const tp = s.modelo.tiposPilarParede![0].id, t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id;
  expect(s.executar('pilarParede.inserir', { tipo: tp, x: 0, y: 0, morre: t1 }).ok).toBe(true);
  const b = s.modelo, geo = geometriaParedes(b, { ...opcoesEmUso(b.opcoes), malhaCasca: 0.25 })!;
  const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() }, casos: Caso3[] = [{ nodais: [], distribuidas: [] }];
  const paredes = incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => E, Ev: E, Gv: E / 2.4, nu, gama: 0, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: () => {}, etiqueta: () => {}, hViga: 0.25, iG: 0 });
  const topo = pm.nos.map((n, i) => [n, i] as const).filter(([n]) => Math.abs(n[2] - 3) < 1e-9).map(([, i]) => i);
  const lado1 = topo.filter((i) => Math.abs(pm.nos[i][1]) < 1e-9), lado2 = topo.filter((i) => Math.abs(pm.nos[i][0] - ref.L1) < 1e-9);
  return { pm, casos, lado1, lado2, base: [...pm.apoios.keys()], paredes, b, geo };
}

