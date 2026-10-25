// Memória detalhada (MD fase 9): carga das lajes maciças nas vigas (reação por pano e apoio) e equilíbrio do pano.
import { beforeAll, describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { BuildingModel } from '../building/types';
import { memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { reacoesDaLaje } from './reacoesLajes';
import { areaPoligono } from '../geom/faces';

function predio(): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
let b: BuildingModel, an: AnaliseEdificio, mem: MemoriaDetalhada, dim: Dimensionamento, dimMem: Dimensionamento;
beforeAll(() => {
  b = predio();
  an = analisarEdificio(b);
  dim = dimensionarEdificio(b, an, { fundacao: false });
  const r = memoriaDetalhada(b, { an });
  mem = r.memoria; dimMem = r.dim;
}, 180000);

const nomeViga = (id: string) => b.vigas.find((v) => v.id === id)?.nome ?? id;

describe('carga das lajes nas vigas', () => {
  it('reações por apoio somam a carga distribuída do pano (equilíbrio) e a carga de cálculo de área × área', () => {
    const l = b.lajes[0], g = an.grelhas.find((x) => x.pavimento === 'pav_4')!;
    const r = reacoesDaLaje(g, l.id, nomeViga, an.casos.length)!;
    expect(r.apoios.length).toBeGreaterThanOrEqual(2);
    an.casos.forEach((c, ic) => {
      expect(Math.abs(r.residuo[ic]), `equilíbrio ${c}`).toBeLessThan(1e-6 * Math.max(1, r.carga[ic]));
      expect(rel(r.apoios.reduce((t, a) => t + a.R[ic], 0), r.total[ic])).toBeLessThan(1e-12);
    });
    // total de G = g·A: pp + revestimento; Q = q·A (área do contorno da laje)
    const gr = b.grupos.find((x) => x.id === b.pavimentos.find((p) => p.id === 'pav_4')!.grupo)!;
    const area = areaPoligono(l.contorno), gg = 25 * 0.12 + (gr.gRev ?? 0), q = gr.q ?? 0;
    const iG = an.casos.indexOf('G'), iQ = an.casos.indexOf('Q');
    expect(rel(r.total[iG], gg * area), `G=${r.total[iG]} esperado ${gg * area}`).toBeLessThan(0.06); // a grelha carrega a faixa entre eixos descontadas as meias larguras das barras de borda
    expect(rel(r.total[iQ], q * area), `Q=${r.total[iQ]} esperado ${q * area}`).toBeLessThan(0.06);
  });

  it('simetria: vigas opostas recebem o mesmo, e as vigas dos lados maiores recebem mais que as dos menores', () => {
    const l = b.lajes[0], g = an.grelhas.find((x) => x.pavimento === 'pav_4')!;
    const r = reacoesDaLaje(g, l.id, nomeViga, an.casos.length)!;
    const iQ = an.casos.indexOf('Q');
    const porViga = r.apoios.filter((a) => /^Viga [^+]+$/.test(a.apoio));
    expect(porViga.length).toBe(4);
    const rs = porViga.map((a) => a.R[iQ]).sort((x, y) => x - y);
    expect(rel(rs[0], rs[1])).toBeLessThan(1e-6); expect(rel(rs[2], rs[3])).toBeLessThan(1e-6);
    // lados de 6 m (vãos maiores) levam mais carga que os de 5 m
    const compr = porViga.map((a) => ({ a, L: a.Lc })).sort((x, y) => x.L - y.L);
    expect(compr[3].a.R[iQ]).toBeGreaterThan(compr[0].a.R[iQ]);
  });

  it('passos registrados: cada reação é a soma dos Fz dos nós; equilíbrio igual ao da conta; resultados idênticos com a memória', () => {
    const el = `Laje ${b.lajes[0].nome}`;
    const ps = mem.passos.filter((p) => p.elemento === el && p.topico === 'Carga da laje nas vigas');
    expect(ps.length).toBeGreaterThan(0);
    const reac = ps.filter((p) => p.formula.startsWith('R = Σ'));
    for (const p of reac) {
      let s = 0;
      for (let k = 0; k < (p.entradas.nNos as number); k++) s += p.entradas[`Fz${k}`] as number;
      expect(rel(s, p.resultado as number)).toBeLessThan(1e-9);
    }
    const eq = ps.filter((p) => p.formula.startsWith('Σ R'));
    expect(eq).toHaveLength(an.casos.length);
    eq.forEach((p, ic) => {
      expect(Math.abs((p.entradas.soma as number) - (p.entradas.carga as number) - (p.entradas.residuo as number))).toBeLessThan(1e-9);
      expect(rel(p.resultado as number, p.entradas.soma as number)).toBeLessThan(1e-9);
      const g = an.grelhas.find((x) => x.pavimento === 'pav_4')!;
      expect(rel(p.resultado as number, reacoesDaLaje(g, b.lajes[0].id, nomeViga, an.casos.length)!.total[ic])).toBeLessThan(1e-12);
    });
    const qm = ps.filter((p) => p.formula === 'q = R / Lc');
    expect(qm.length).toBeGreaterThan(0);
    for (const p of qm) expect(rel((p.entradas.R_G as number) / (p.entradas.Lc as number), p.resultado as number)).toBeLessThan(1e-9);
    expect(dimMem.lajes).toEqual(dim.lajes);
  });
});
