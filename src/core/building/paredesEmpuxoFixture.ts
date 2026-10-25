// Parede com abertura sob empuxo de terra (E1c): modelo de cascas isolado para as validações contra o OpenSees
// (paredes.validacao.test.ts e, na V7h, as seções internas com cargas próprias nos nós do corte).
import { expect } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import type { Caso3, Modelo3 } from '../fe3d';
import { torcaoRet } from './analitico';
import { opcoesEmUso } from './opcoes';
import { geometriaParedes } from './pilarParede';
import { incluirParedes } from './pilarParedeModelo';
import ref from '../../../validation/opensees/parede_empuxo.json';

export function modelo(malha: number) {
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

