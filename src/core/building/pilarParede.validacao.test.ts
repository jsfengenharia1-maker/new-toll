// E1b: pilar-parede em L (duas cascas de 6 nós) contra o OpenSees (ShellMITC4, malha de 0,125 m).
// Referência: `python3 validation/opensees/pilar_parede.py` (fora do npm test) → validation/opensees/pilar_parede.json.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { torcaoRet } from './analitico';
import { geometriaParedes } from './pilarParede';
import { incluirParedes } from './pilarParedeModelo';
import { opcoesEmUso } from './opcoes';
import ref from '../../../validation/opensees/pilar_parede.json';

const E = ref.E, nu = ref.nu;

/** Cargas nodais de força linear q (kN/m) em `g` sobre os nós de uma linha de vértices e meios (ordem por `eixo`). */
function linha(pm: Modelo3, nos: number[], eixo: 0 | 1, q: number, g: 0 | 1 | 2): Caso3['nodais'] {
  const ord = [...nos].sort((a, c) => pm.nos[a][eixo] - pm.nos[c][eixo]), out: Caso3['nodais'] = [];
  for (let k = 0; k + 2 < ord.length; k += 2) {
    const Ls = Math.abs(pm.nos[ord[k + 2]][eixo] - pm.nos[ord[k]][eixo]);
    for (const [n, w] of [[ord[k], 1 / 6], [ord[k + 1], 4 / 6], [ord[k + 2], 1 / 6]] as const) { const f = [0, 0, 0, 0, 0, 0]; f[g] = q * Ls * w; out.push({ no: n, f }); }
  }
  return out;
}

function modeloL() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 3 }); // base em −3 m; topo no Tipo 1 (+3 m): H = 6 m
  s.executar('pilarParede.tipo', { vertices: [[0, 0], [ref.L1, 0], [ref.L1, ref.L2]], esq: ref.t / 2, dir: ref.t / 2 });
  const tp = s.modelo.tiposPilarParede![0].id, t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id;
  expect(s.executar('pilarParede.inserir', { tipo: tp, x: 0, y: 0, morre: t1 }).ok).toBe(true);
  const b = s.modelo, geo = geometriaParedes(b, opcoesEmUso(b.opcoes))!;
  const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() }, casos: Caso3[] = [{ nodais: [], distribuidas: [] }];
  const r0 = incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => E, Ev: E, Gv: E / 2.4, nu, gama: 0, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: () => {}, etiqueta: () => {}, hViga: 0.25, iG: 0 });
  const zTopo = 3, topo = pm.nos.map((n, i) => [n, i] as const).filter(([n]) => Math.abs(n[2] - zTopo) < 1e-9).map(([, i]) => i);
  const lado1 = topo.filter((i) => Math.abs(pm.nos[i][1]) < 1e-9), lado2 = topo.filter((i) => Math.abs(pm.nos[i][0] - ref.L1) < 1e-9);
  return { pm, casos, r0, lado1, lado2 };
}

// Malha de 1 m (padrão) contra 0,125 m do OpenSees; com 0,5 m a diferença cai para 0,1–0,5 % (conferido em 22/10/2026).
describe('pilar-parede em L contra o OpenSees', () => {
  for (const [caso, rotulo] of [[1, 'força linear em x'], [2, 'força linear em y'], [3, 'carga vertical']] as const) {
    it(`${rotulo}: deslocamentos do topo e reações da base`, () => {
      const m = modeloL(), q = ref.q, o = (ref.resultados as Record<string, { canto: number[]; ponta1: number[]; ponta2: number[]; Rz_x2: number; My: number; Mx: number }>)[String(caso)];
      const g = caso === 1 ? 0 : caso === 2 ? 1 : 2, qq = caso === 3 ? -2 * q : q;
      m.casos[0].nodais.push(...linha(m.pm, m.lado1, 0, qq, g), ...linha(m.pm, m.lado2, 1, qq, g));
      const r = resolver3(m.pm, m.casos);
      expect(r.erro).toBeUndefined();
      const busca = (x: number, y: number) => m.pm.nos.findIndex((n) => Math.abs(n[0] - x) < 1e-6 && Math.abs(n[1] - y) < 1e-6 && Math.abs(n[2] - 3) < 1e-9);
      const u = (x: number, y: number) => [0, 1, 2].map((k) => r.desloc[0][busca(x, y) * 6 + k]);
      const canto = u(ref.L1, 0), p1 = u(0, 0), p2 = u(ref.L1, ref.L2);
      const rel = (a: number, b: number, escala: number) => Math.abs(a - b) / Math.max(Math.abs(b), escala);
      const esc = Math.max(...[...o.canto, ...o.ponta1, ...o.ponta2].map(Math.abs));
      // deslocamentos: dentro de 4 % do maior deslocamento do caso (malha de 1 m contra 0,125 m)
      for (let k = 0; k < 3; k++) {
        expect(rel(canto[k], o.canto[k], esc), `canto ${k}`).toBeLessThan(0.04);
        expect(rel(p1[k], o.ponta1[k], esc), `ponta1 ${k}`).toBeLessThan(0.04);
        expect(rel(p2[k], o.ponta2[k], esc), `ponta2 ${k}`).toBeLessThan(0.04);
      }
      // reação vertical da parte do lado 1 com x ≤ 2 m (o nó de x = 2 m dividido ao meio)
      let Rz1 = 0;
      for (const [n, rr] of r.reacoes[0]) { const x = m.pm.nos[n][0]; if (m.pm.nos[n][1] > 1e-6) continue; if (x < 2 - 1e-6) Rz1 += rr[2]; else if (Math.abs(x - 2) < 1e-6) Rz1 += 0.5 * rr[2]; }
      expect(Math.abs(Rz1 - o.Rz_x2) / Math.max(Math.abs(o.Rz_x2), 100)).toBeLessThan(0.05);
    });
  }
});
