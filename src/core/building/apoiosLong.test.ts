// E5j: viga em parede (vão de cálculo limitado pela distância entre eixos, parede no meio da viga), rigidez axial própria das
// paredes e espessura por pavimento da alvenaria. Cálculo conferido com solução analítica; equilíbrio sempre.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { apoiosDaViga } from './detalhamento';
import type { BuildingModel } from './types';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const nomePav = (b: BuildingModel, nome: string) => b.pavimentos.find((p) => p.nome === nome)!.id;

/** Viga V1 de x = -3 a 7 em y = 0: pilar em x = -3, pilar-parede (contato `larg` m a partir de x = 0) e pilar em x = 7. */
function vigaComParedeNoMeio(larg: number, h = 0.5, esp = 0.1, bw = 0.2) {
  const xf = larg + 4;
  const s = padrao();
  const b0 = s.modelo, t1 = nomePav(b0, 'Tipo 1'), g = b0.pavimentos.find((p) => p.id === t1)!.grupo;
  ok(s, 'pilarParede.tipo', { nome: 'Reta', vertices: [[0, 0], [larg, 0]], esq: esp / 2, dir: esp / 2 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0 });
  ok(s, 'pilar.inserir', { x: -3, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  ok(s, 'pilar.inserir', { x: xf, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  ok(s, 'pilar.inserir', { x: -3, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  ok(s, 'pilar.inserir', { x: xf, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  ok(s, 'viga.tracar', { grupo: g, pontos: [[-3, 0], [xf, 0]], secao: { b: bw, h } });
  for (const pts of [[[-3, 5], [xf, 5]], [[-3, 0], [-3, 5]], [[xf, 0], [xf, 5]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
  ok(s, 'laje.criar', { grupo: g, contorno: [[-3, 0], [xf, 0], [xf, 5], [-3, 5]], tipo: { tipo: 'macica', h: 0.12 } });
  return s;
}

describe('viga em parede: vão de cálculo limitado à distância entre eixos (K1.12.21)', () => {
  it('Lc = menor entre vão livre + acréscimo e a distância entre os eixos dos apoios', () => {
    // contato curto (0,5 m, parede de 10 cm): acréscimo de h por apoio de parede (1,0 m para h = 0,5 m e fator 2) passa da distância entre eixos
    const s = vigaComParedeNoMeio(0.5, 0.8);
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const lcs = (op: Record<string, number>) => {
      ok(s, 'opcoes.definir', { valores: op });
      const a2 = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, a2, { fundacao: false });
      return d.vigas.find((x) => x.viga === s.modelo.vigas[0].id)!;
    };
    const com = lcs({ vigaApoioLongEixos: 1 }), sem = lcs({ vigaApoioLongEixos: 0 });
    const lc = (r: typeof com) => (r.vaosParede ?? []).map((v) => v.Lc);
    expect(lc(sem).length).toBeGreaterThan(0);
    expect(lc(com).length).toBe(lc(sem).length);
        for (let i = 0; i < lc(com).length; i++) expect(lc(com)[i]).toBeLessThanOrEqual(lc(sem)[i] + 1e-9);
    // vão entre as partes flexíveis 2,875 e 3,875 m + (2·h/2 − 0,3·h) = 0,56 m do lado da parede (h = 0,8 m) contra os eixos: pilar (x = -3) a parede
    // (centro do contato x = 0,25) = 3,25 m; parede ao pilar em x = 4,5 m = 4,25 m
    const unicos = (a: number[]) => [...new Set(a.map((x) => x.toFixed(4)))].map(Number).sort((p, q) => p - q);
    expect(unicos(lc(sem))).toEqual([3.435, 4.435]);
    expect(unicos(lc(com))).toEqual([3.25, 4.25]);
  }, 120000);
});

describe('viga com parede no meio (K1.3.59)', () => {
  it('parede estreita: apoios das duas bordas sem corte; larga (> 2 × 3h): aviso de armadura contínua sobre a parede', () => {
    const estreita = vigaComParedeNoMeio(2).modelo, larga = vigaComParedeNoMeio(8).modelo;
    expect(apoiosDaViga(estreita, estreita.vigas[0]).filter((a) => a.corta).length).toBe(0);
    const an = analisarEdificio(larga), d = dimensionarEdificio(larga, an, { fundacao: false });
    const det = d.detalhes!.find((x) => x.viga === larga.vigas[0].id)!;
    expect(det.avisos.join(' ')).toMatch(/parede/i);
    // o diagrama prossegue h = 0,5 m além de cada face da parede e não existe no trecho central
    const par = apoiosDaViga(larga, larga.vigas[0]).find((a) => a.pilar.includes(':'))!;
    const ss = d.vigas.find((x) => x.viga === larga.vigas[0].id)!.envoltoria.pontos.map((p) => p.s);
    expect(ss.some((x) => x > par.s0 + 0.2 && x <= par.s0 + 0.5 + 1e-6)).toBe(true);
    expect(ss.some((x) => x < par.s1 - 0.2 && x >= par.s1 - 0.5 - 1e-6)).toBe(true);
    expect(ss.filter((x) => x > par.s0 + 0.75 && x < par.s1 - 0.75)).toEqual([]);
  }, 120000);
});

describe('rigidez axial das paredes separada da flexão (K1.4.30)', () => {
  const reacoes = (s: Sessao, op: Record<string, number>) => {
    ok(s, 'opcoes.definir', { valores: op });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const rs = an.portico.res!.reacoes.map((m) => [...m.values()].reduce((t, r) => t + (r[2] ?? 0), 0));
    const casca = an.portico.modelo.cascas!.length;
    return { rs, casca, an };
  };
  it('equilíbrio vertical nas duas opções; com EA × 1 as opções coincidem; com EA × 2 as cargas totais não mudam', () => {
    const s = vigaComParedeNoMeio(2);
    const novo = reacoes(s, { axialPilares: 2, axialParedeSeparado: 1 }), antigo = reacoes(s, { axialPilares: 2, axialParedeSeparado: 0 });
    expect(novo.casca).toBeGreaterThan(0);
    // as cargas são as mesmas: a soma das reações verticais de cada caso não depende da rigidez
    novo.rs.forEach((v, i) => expect(Math.abs(v - antigo.rs[i])).toBeLessThan(1e-6 * (1 + Math.abs(v))));
    const a1 = reacoes(s, { axialPilares: 1, axialParedeSeparado: 1 }), a0 = reacoes(s, { axialPilares: 1, axialParedeSeparado: 0 });
    a1.rs.forEach((v, i) => expect(v).toBe(a0.rs[i]));
  }, 240000);
});

describe('espessura por pavimento da alvenaria e dos blocos (K1.3.31)', () => {
  it('parede de blocos de 20 cm no térreo e 15 cm no Tipo 1: a casca de cada lance usa a sua espessura e o peso acompanha', () => {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'bloco.tipo', { nome: 'B20', comprimento: 0.4, largura: 0.2, altura: 0.2, fbk: 8 });
    ok(s, 'alvenaria.tipo', { nome: 'Blocos B20', modelo: 'blocos', bloco: s.modelo.blocos![0].id, gama: 14 });
    const mat = s.modelo.tiposAlvenaria![0].id;
    ok(s, 'parede.criar', { pontos: [[0, 0], [4, 0]], espessura: 0.2, tipo: 'blocos', material: mat, morre: t1, porPavimento: [{ pavimento: t1, esq: 0.075, dir: 0.075 }] });
    ok(s, 'laje.criar', { grupo: s.modelo.pavimentos.find((p) => p.id === t1)!.grupo, contorno: [[-1, -1], [5, -1], [5, 3], [-1, 3]] });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const hs = new Set(an.portico.modelo.cascas!.map((c) => +c.h.toFixed(6)));
    expect([...hs].sort()).toEqual([0.15, 0.2]);
    // E e ν do tipo de alvenaria valem nos dois lances
    expect(new Set(an.portico.modelo.cascas!.map((c) => c.E)).size).toBe(1);
  }, 120000);
});

describe('viga e armadura partidas sobre a parede no meio (E6c, K1.3.59)', () => {
  const detalhe = (partir: number, h = 0.5, bw = 0.2) => {
    const s = vigaComParedeNoMeio(8, h, 0.1, bw);
    ok(s, 'opcoes.definir', { valores: { vigaPartirParede: partir } });
    const b = s.modelo, an = analisarEdificio(b), d = dimensionarEdificio(b, an, { fundacao: false });
    const v = b.vigas[0], det = d.detalhes!.find((x) => x.viga === v.id)!;
    const par = apoiosDaViga(b, v).find((a) => a.pilar.includes(':'))!;
    return { det, par, lim: (1 + 2) * v.secao.h, passo: 0.05, d };
  };
  it('contato de 8 m, h = 0,5 m: nenhuma barra entra em [face + 1,5 m; face oposta − 1,5 m]; as pontas internas terminam em 1,5 m da face, sem gancho', () => {
    const { det, par, lim } = detalhe(1);
    const g0 = par.s0 + lim, g1 = par.s1 - lim;
    expect(g1 - g0).toBeCloseTo(8 - 2 * lim, 6);
    for (const x of det.barras) {
      expect(x.s1 <= g0 + 1e-6 || x.s0 >= g1 - 1e-6, `${x.pos} ${x.tipo} ${x.s0}..${x.s1} cruza a partida`).toBe(true);
    }
    for (const face of ['inf', 'sup'] as const) {
      const corridas = det.barras.filter((x) => x.face === face && (x.tipo === 'passante' || x.tipo === 'montagem'));
      const esq = corridas.filter((x) => x.s1 <= g0 + 1e-6), dir = corridas.filter((x) => x.s0 >= g1 - 1e-6);
      expect(esq.length).toBeGreaterThan(0);
      expect(dir.length).toBeGreaterThan(0);
      for (const x of esq) { expect(x.s1).toBeCloseTo(g0, 6); expect(x.ganchos[1]).toBe(false); if (!x.ganchos[0]) expect(x.comprimento).toBeCloseTo(Math.ceil((x.s1 - x.s0) / 0.05 - 1e-9) * 0.05, 6); }
      for (const x of dir) { expect(x.s0).toBeCloseTo(g1, 6); expect(x.ganchos[0]).toBe(false); }
    }
    expect(det.avisos.join(' ')).toMatch(/partidas/);
  }, 240000);
  it('sem a opção (baseline anterior): as passantes cruzam a parede e o aviso pede a interrupção manual; com a opção o aço é menor', () => {
    const a = detalhe(0, 0.8, 0.4), p = detalhe(1, 0.8, 0.4);
    const g0 = a.par.s0 + a.lim, g1 = a.par.s1 - a.lim;
    const meio = (g0 + g1) / 2;
    expect(a.det.barras.some((x) => x.face === 'inf' && x.tipo === 'passante' && x.s0 < meio && x.s1 > meio)).toBe(true);
    expect(p.det.barras.some((x) => x.s0 < meio && x.s1 > meio)).toBe(false);
    expect(a.det.avisos.join(' ')).toMatch(/segue contínua/);
    // barra de comprimento nulo na ponta da viga junto à parede não gera NaN na envoltória (correção desta fatia)
    const rv = a.d.vigas[0];
    expect(Number.isFinite(rv.Mpos) && Number.isFinite(rv.Mneg) && Number.isFinite(rv.AsInf)).toBe(true);
    expect(rv.envoltoria.pontos.every((q) => Number.isFinite(q.Mmax) && Number.isFinite(q.Vmax))).toBe(true);
    expect(Number.isFinite(a.det.peso)).toBe(true);
    // peso: a economia é o trecho central (8 − 2·2,4 = 3,2 m com h = 0,8 m) das barras corridas (passantes, montagem, pele), menos nada nos estribos
    expect(p.det.peso).toBeLessThan(a.det.peso);
    const compCorridas = (det: typeof a.det) => det.barras.filter((x) => x.tipo === 'passante' || x.tipo === 'montagem' || x.tipo === 'pele').reduce((t, x) => t + x.n * (x.s1 - x.s0), 0);
    expect(compCorridas(a.det) - compCorridas(p.det)).toBeGreaterThan(3.2 * 2 - 1e-6);
    expect(p.det.estribos.length).toBe(a.det.estribos.length);
  }, 240000);
});
