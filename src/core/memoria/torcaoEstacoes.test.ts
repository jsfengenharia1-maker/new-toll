// Memória detalhada (MD fase 9): decomposição por estação do Asw/s de vigas com torção (cortante + 2·A90/s).
import { beforeAll, describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { BuildingModel } from '../building/types';
import { memoriaDetalhada, type MemoriaDetalhada } from './edificio';

function grade(): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  ok('lote', { comandos: [[0, 0], [5, 0], [10, 0], [0, 5], [5, 5], [10, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [[[0, 0], [10, 0]], [[0, 5], [10, 5]], [[0, 0], [0, 5]], [[5, 0], [5, 5]], [[10, 0], [10, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const num = (p: { entradas: Record<string, number | string> }, k: string) => p.entradas[k] as number;
let b: BuildingModel, an: AnaliseEdificio, dim: Dimensionamento, mem: MemoriaDetalhada, dimMem: Dimensionamento;
beforeAll(() => {
  b = grade();
  an = analisarEdificio(b);
  dim = dimensionarEdificio(b, an, { fundacao: false });
  const r = memoriaDetalhada(b, { an });
  mem = r.memoria; dimMem = r.dim;
}, 180000);

describe('torção das vigas: Asw/s por estação', () => {
  it('seção vazada, TRd2 e cada estação refeitos das entradas; determinante = Asw/s do dimensionamento', () => {
    const comT = dim.vigas.filter((v) => v.T > 0);
    expect(comT.length).toBeGreaterThan(0);
    for (const v of comT) {
      const el = `Viga ${v.nome}`, ps = mem.passos.filter((p) => p.elemento === el && p.topico === 'Torção – Asw/s por estação');
      expect(ps.length).toBeGreaterThan(3);
      const sec = ps[0], tr = ps[1];
      const A = num(sec, 'b') * num(sec, 'h'), u = 2 * (num(sec, 'b') + num(sec, 'h')), c1 = num(sec, 'c1');
      let he = A / u;
      if (he < 2 * c1 && 2 * c1 <= Math.min(num(sec, 'b'), num(sec, 'h')) / 2) he = 2 * c1;
      expect(rel(he, num(sec, 'he'))).toBeLessThan(1e-9);
      expect(rel((num(sec, 'b') - he) * (num(sec, 'h') - he), sec.resultado as number)).toBeLessThan(1e-9);
      expect(rel(0.5 * num(tr, 'av2') * num(tr, 'fcd') * num(tr, 'Ae') * num(tr, 'he') * 1000, tr.resultado as number)).toBeLessThan(1e-9);
      const est = ps.slice(2, -1), det = ps.at(-1)!;
      expect(est.length).toBeGreaterThan(0);
      let mx = 0;
      for (const e of est) {
        const aV = Math.max(0, num(e, 'VSd') - num(e, 'Vc')) / 1000 / (0.9 * num(e, 'd') * num(e, 'fywd'));
        const aT = 2 * (num(e, 'Td') / 1000 / (2 * num(e, 'Ae') * num(e, 'fywd')));
        expect(rel(aV, num(e, 'aV')) < 1e-9 || Math.abs(aV - num(e, 'aV')) < 1e-15).toBe(true);
        expect(rel(aT, num(e, 'aT')) < 1e-9 || Math.abs(aT - num(e, 'aT')) < 1e-15).toBe(true);
        expect(rel(aV + aT, e.resultado as number)).toBeLessThan(1e-9);
        mx = Math.max(mx, e.resultado as number);
      }
      expect(rel(mx, det.resultado as number)).toBeLessThan(1e-12);
      // o determinante é o Asw/s combinado do dimensionamento (mesma expressão da envoltória)
      const geral = mem.passos.find((p) => p.elemento === el && p.descricao.startsWith('Armadura transversal (cortante + 2·A90/s'))!;
      expect(rel(det.resultado as number, geral.resultado as number)).toBeLessThan(1e-9);
      expect(num(det, 'aswEnv')).toBe(geral.resultado);
      // pelo menos uma estação tem torção e outra a parcela do cortante
      expect(est.some((e) => num(e, 'aT') > 0)).toBe(true);
    }
  });

  it('dimensionamento idêntico com a memória ligada (toEqual)', () => {
    expect(dimMem.vigas).toEqual(dim.vigas);
  });
});
