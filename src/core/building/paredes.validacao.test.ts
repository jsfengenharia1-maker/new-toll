// E1c: parede com abertura sob empuxo de terra contra o OpenSees (ShellMITC4, malha de 0,125 m).
// Referência: `python3 validation/opensees/parede_empuxo.py` (fora do npm test) → validation/opensees/parede_empuxo.json.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { torcaoRet } from './analitico';
import { opcoesEmUso } from './opcoes';
import { geometriaParedes } from './pilarParede';
import { incluirParedes } from './pilarParedeModelo';
import ref from '../../../validation/opensees/parede_empuxo.json';

function modelo(malha: number) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 1 }); // base em −1; topo no Tipo 1 (+3)
  const t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id, terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!.id;
  s.executar('empuxo.tipo', { nome: 'Aterro', metodo: 'repouso', estratos: [{ espessura: 20, gama: 18, phi: 30 }], cotaAterro: 3 });
  s.executar('caso.criar', { nome: 'Empuxo', natureza: 'H', empuxo: s.modelo.empuxos![0].id });
  const caso = s.modelo.casos!.find((c) => c.nome === 'Empuxo')!.id;
  expect(s.executar('parede.criar', { pontos: [[0, 0], [ref.L, 0]], espessura: ref.t, morre: t1 }).ok).toBe(true);
  const id = s.modelo.paredes![0].id;
  // janela de x = 2 a 4 m e z = 0,5 a 2,5 m: lançada no Térreo (cota 0), peitoril 0,5 m, altura 2 m
  expect(s.executar('parede.abertura', { parede: id, s: ref.furo[0], largura: ref.furo[1] - ref.furo[0], peitoril: ref.furo[2], altura: ref.furo[3] - ref.furo[2], pavimento: terreo }).ok).toBe(true);
  expect(s.executar('parede.empuxo', { parede: id, empuxos: [{ caso, lado: 'esq' }] }).ok).toBe(true);
  const b = s.modelo, geo = geometriaParedes(b, { ...opcoesEmUso(b.opcoes), malhaCasca: malha })!;
  const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() }, casos: Caso3[] = [{ nodais: [], distribuidas: [] }];
  const r0 = incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => ref.E, Ev: ref.E, Gv: ref.E / 2.4, nu: ref.nu, gama: 0, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: () => {}, etiqueta: () => {}, hViga: 0.25, iG: 0, caso: (c) => (c === caso ? 0 : -1) });
  return { pm, casos, r0 };
}

describe('parede com abertura sob empuxo contra o OpenSees', () => {
  for (const [malha, tol] of [[1, 0.02], [0.5, 0.01]] as const) {
    it(`malha de ${malha} m: deslocamentos fora do plano e reações da base`, () => {
      const m = modelo(malha), o = ref.resultados;
      expect(-m.r0.empuxo[0].F[1]).toBeCloseTo(o.F, 6);
      const r = resolver3(m.pm, m.casos);
      expect(r.erro).toBeUndefined();
      const uy = (x: number, z: number) => r.desloc[0][m.pm.nos.findIndex((p) => Math.abs(p[0] - x) < 1e-6 && Math.abs(p[1]) < 1e-6 && Math.abs(p[2] - z) < 1e-6) * 6 + 1];
      const esc = Math.abs(o.topo_canto);
      for (const [nome, x, z] of [['topo_meio', 3, 3], ['topo_canto', 0, 3], ['lintel_meio', 3, 2.5], ['peitoril_meio', 3, 0.5]] as const)
        expect(Math.abs(uy(x, z) - o[nome]) / esc, nome).toBeLessThan(tol);
      let Ry = 0, Mx = 0;
      for (const [, rr] of r.reacoes[0]) { Ry += rr[1]; Mx += rr[3]; }
      expect(Ry).toBeCloseTo(o.Ry, 3);
      expect(Mx / o.Mx).toBeCloseTo(1, 3);
    });
  }
});
