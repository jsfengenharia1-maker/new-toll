// E1b: pilar-parede (tipos de seção composta, geometria dos lados, modelo por casca ou barra, ligação com vigas e lajes).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { analisarEdificio, torcaoRet } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { apoiosDaViga } from './detalhamento';
import { vaosDaViga } from './vigas';
import { opcoesEmUso } from './opcoes';
import { abscissasDoLado, cotasDaGrade, geometriaParedes, ladosDoPP, malhaDaGrade, todosPilares } from './pilarParede';
import { incluirParedes } from './pilarParedeModelo';
import type { BuildingModel } from './types';
import { verificar } from './verify';
import { montarPrancha } from '../sheets/prancha';
import { montarPranchaLocacao } from '../sheets/locacao';
import { escreverDxf } from '../sheets/dxf';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const nomePav = (b: BuildingModel, nome: string) => b.pavimentos.find((p) => p.nome === nome)!.id;

describe('pilar-parede: tipos e geometria', () => {
  it('tipo por vértices ou lados, com o primeiro vértice na origem; lados do mundo com ângulo e espessuras por pavimento', () => {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'pilarParede.tipo', { nome: 'L', vertices: [[5, 5], [8, 5], [8, 7]], esq: 0.1, dir: 0.1 });
    const tp = s.modelo.tiposPilarParede![0];
    expect(tp.lados.map((l) => [l.a, l.z])).toEqual([[[0, 0], [3, 0]], [[3, 0], [3, 2]]]);
    // espessura própria no Tipo 1 (0,15 + 0,05) no lado 1
    ok(s, 'pilarParede.tipo', { id: tp.id, lados: [{ ...tp.lados[0], porPavimento: [{ pavimento: t1, esq: 0.15, dir: 0.05 }] }, tp.lados[1]] });
    ok(s, 'pilarParede.inserir', { tipo: tp.id, x: 10, y: 20, angulo: 90 });
    const pp = s.modelo.pilaresParede![0];
    const lados = ladosDoPP(s.modelo, pp);
    expect(lados).toHaveLength(2);
    // girado de 90°: o lado 1 (3 m em x) vai para y; ponto de inserção em (10, 20)
    expect(lados[0].a[0]).toBeCloseTo(10, 9); expect(lados[0].z[1]).toBeCloseTo(23, 9);
    expect(lados[1].z[0]).toBeCloseTo(8, 9);
    expect(lados[0].esp(t1)).toMatchObject({ esq: 0.15, dir: 0.05 });
    expect(lados[0].esp(t1).t).toBeCloseTo(0.2, 9);
    expect(lados[0].esp(nomePav(s.modelo, 'Tipo 2')).t).toBeCloseTo(0.2, 9);
    // lado de 3 m e 2 m com 20 cm: ambos ≥ 5 × a espessura → casca; com limite maior, o curto vira barra
    expect(lados.map((l) => l.casca)).toEqual([true, true]);
    expect(ladosDoPP(s.modelo, pp, 16).map((l) => l.casca)).toEqual([false, false]);
    // pilares virtuais dos lados: contêm os retângulos (apoio de vigas)
    const v = todosPilares(s.modelo).filter((p) => p.id.startsWith(pp.id));
    expect(v).toHaveLength(2);
    expect(v[0].secao).toEqual({ tipo: 'ret', b: 3, h: 0.2 });
    expect(todosPilares(padrao().modelo)).toHaveLength(0);
  });

  it('validações: tipo em uso, lado de comprimento nulo, apoio em pilar e sobreposição', () => {
    const s = padrao();
    const b = s.modelo, t1 = nomePav(b, 'Tipo 1');
    expect(s.executar('pilarParede.tipo', { vertices: [[0, 0], [0.01, 0]], esq: 0.1, dir: 0.1 }).ok).toBe(false);
    expect(s.executar('pilarParede.tipo', { vertices: [[0, 0], [2, 0]], esq: 0.01, dir: 0.01 }).ok).toBe(false);
    ok(s, 'pilarParede.tipo', { vertices: [[0, 0], [2, 0]], esq: 0.1, dir: 0.1 });
    const tp = s.modelo.tiposPilarParede![0].id;
    ok(s, 'pilarParede.inserir', { tipo: tp, x: 0, y: 0, morre: t1 });
    expect(s.executar('pilarParede.tipo', { id: tp, remover: true }).ok).toBe(false); // em uso
    // pilar comum sobreposto à parede: o diagnóstico acusa
    expect(s.executar('pilar.inserir', { x: 1, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } }).ok).toBe(true);
    expect(verificar(s.modelo).some((d) => d.codigo === 'PPAREDE_SOBREPOSTO')).toBe(true);
    // parede nova sobre pilar existente
    expect(s.executar('pilarParede.inserir', { tipo: tp, x: 0.5, y: 0.1 }).ok).toBe(false);
    // pilar que nasce no pavimento em que a parede morre, sobre ela: a parede apoia pilar
    const s2 = padrao();
    ok(s2, 'pilarParede.tipo', { vertices: [[0, 0], [2, 0]], esq: 0.1, dir: 0.1 });
    ok(s2, 'pilarParede.inserir', { tipo: s2.modelo.tiposPilarParede![0].id, x: 0, y: 0, morre: t1 });
    ok(s2, 'pilar.inserir', { x: 1, y: 0, secao: { tipo: 'ret', b: 0.15, h: 0.15 }, nasce: t1 });
    expect(verificar(s2.modelo).some((d) => d.codigo === 'PPAREDE_APOIO' && d.severidade === 'erro')).toBe(true);
  });

  it('grade: abscissas com junções e cotas dos níveis', () => {
    expect(abscissasDoLado(4, 1)).toEqual([0, 1, 2, 3, 4]);
    expect(abscissasDoLado(4, 1, [1.9])).toEqual([0, 1, 1.9, 3, 4]); // 2 sai (a menos de h/4 da junção)
    const { Z, nivel } = cotasDaGrade([-1.5, 0, 3], 1);
    expect(Z).toEqual([-1.5, -0.75, 0, 1, 2, 3]);
    expect(nivel).toEqual([0, 2, 5]);
    const m = malhaDaGrade([0, 1, 2], [0, 1]);
    expect(m.tris).toHaveLength(4);
    for (const t of m.tris) { const [a, b, c] = t.map((i) => m.pontos[i]); expect((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])).toBeGreaterThan(0); } // anti-horário em (s, z)
  });
});

/** Cargas nodais de uma força linear uniforme q (kN/m) na direção `g` ao longo dos nós da linha (vértice-meio-vértice). */
function linhaCarregada(pm: Modelo3, nosLinha: number[], eixoOrdem: 0 | 1, q: number, g: 0 | 1 | 2): Caso3['nodais'] {
  const ord = [...nosLinha].sort((a, c) => pm.nos[a][eixoOrdem] - pm.nos[c][eixoOrdem]), out: Caso3['nodais'] = [];
  for (let k = 0; k + 2 < ord.length; k += 2) {
    const Ls = Math.abs(pm.nos[ord[k + 2]][eixoOrdem] - pm.nos[ord[k]][eixoOrdem]);
    for (const [n, w] of [[ord[k], 1 / 6], [ord[k + 1], 4 / 6], [ord[k + 2], 1 / 6]] as const) { const f = [0, 0, 0, 0, 0, 0]; f[g] = q * Ls * w; out.push({ no: n, f }); }
  }
  return out;
}

describe('pilar-parede por casca: solução conhecida', () => {
  it('parede em balanço sob carga linear no topo: flecha e momento na base contra a viga de Timoshenko', () => {
    const s = padrao();
    ok(s, 'pilarParede.tipo', { vertices: [[0, 0], [4, 0]], esq: 0.1, dir: 0.1 });
    ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0, morre: nomePav(s.modelo, 'Tipo 2') });
    const b = s.modelo, op = opcoesEmUso(b.opcoes);
    const geo = geometriaParedes(b, op)!;
    const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() };
    const E = 25e6, nu = 0.2, G = E / (2 * (1 + nu)), casos: Caso3[] = [{ nodais: [], distribuidas: [] }];
    const r0 = incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => E, Ev: E, Gv: E / 2.4, nu, gama: 0, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: () => {}, etiqueta: () => {}, hViga: 0.25, iG: 0 });
    expect(r0.info.length).toBeGreaterThan(30);
    const zs = geo.niveisZ[b.pilaresParede![0].id], zTopo = zs.at(-1)!, H = zTopo - zs[0];
    const topo = pm.nos.map((n, i) => [n, i] as const).filter(([n]) => Math.abs(n[2] - zTopo) < 1e-9).map(([, i]) => i);
    const q = 100, L = 4, t = 0.2, P = q * L, I = (t * L ** 3) / 12, A = t * L;
    casos[0].nodais.push(...linhaCarregada(pm, topo, 0, q, 0)); // força em x, no plano da parede (que está em x)
    const r = resolver3(pm, casos);
    expect(r.erro).toBeUndefined();
    const ref = (P * H ** 3) / (3 * E * I) + (P * H) / ((5 / 6) * G * A);
    const ux = topo.reduce((s2, n) => s2 + r.desloc[0][n * 6], 0) / topo.length;
    expect(Math.abs(ux / ref - 1)).toBeLessThan(0.02);
    // equilíbrio: Σ Rx = −P e momento em torno de y na base (r4 − x·Rz) = −P·H
    let Rx = 0, My = 0;
    for (const [n, rr] of r.reacoes[0]) { Rx += rr[0]; My += rr[4] - pm.nos[n][0] * rr[2]; }
    expect(Rx).toBeCloseTo(-P, 5);
    expect(Math.abs(My / (P * H) + 1)).toBeLessThan(1e-9); // giro no plano relativo (24/10/2026): equilíbrio exato (antes a mola presa ao chão desequilibrava ≈ 0,2 %)
  });
});

/** Edifício de teste: viga e laje apoiadas em dois pilares comuns e num apoio em (0, 0): pilar de 80 × 20 cm ou pilar-parede de 1,2 m. */
function cenario(apoio: 'pilar' | 'parede', opcoes: Record<string, number> = {}, comprimento = 0.8) {
  const s = padrao();
  const b0 = s.modelo, g = b0.pavimentos.find((p) => p.nome === 'Tipo 1')!.grupo;
  if (Object.keys(opcoes).length) ok(s, 'opcoes.definir', { valores: opcoes });
  if (apoio === 'pilar') ok(s, 'pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: comprimento, h: 0.2 }, ajuste: 'so' });
  else {
    ok(s, 'pilarParede.tipo', { vertices: [[0, 0], [comprimento, 0]], esq: 0.1, dir: 0.1 });
    ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0.1 });
  }
  ok(s, 'pilar.inserir', { x: 6, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  ok(s, 'pilar.inserir', { x: 3, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  for (const pts of [[[0.4, 0], [6, 0]], [[6, 0], [3, 5]], [[3, 5], [0.4, 0]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
  ok(s, 'laje.criar', { grupo: g, ponto: [3, 1.5], tipo: { tipo: 'macica', h: 0.12 } });
  return s;
}
const reacoes = (an: ReturnType<typeof analisarEdificio>, caso: string) => an.fundacao.filter((f) => f.caso === caso).map((f) => [f.pilar, f.N] as const);

describe('pilar-parede: lado em barra e lado em casca', () => {
  it('lado curto (barra): reações iguais às do pilar comum de mesma seção', () => {
    const a = analisarEdificio(cenario('pilar').modelo), b = analisarEdificio(cenario('parede').modelo);
    expect(a.erro).toBeUndefined(); expect(b.erro).toBeUndefined();
    const ra = reacoes(a, 'G').map((x) => x[1]), rb = reacoes(b, 'G').map((x) => x[1]).sort((x, y) => x - y);
    expect(rb).toHaveLength(ra.length);
    ra.sort((x, y) => x - y).forEach((v, i) => expect(Math.abs(rb[i] / v - 1)).toBeLessThan(0.001));
    expect(b.paredes?.info).toHaveLength(0); // sem casca: só barra
  });

  it('o mesmo lado de 1,2 m em casca ou em barra: reações verticais próximas', () => {
    const casca = analisarEdificio(cenario('parede', {}, 1.2).modelo), barra = analisarEdificio(cenario('parede', { pilarParedeLimite: 8 }, 1.2).modelo);
    expect(casca.erro).toBeUndefined(); expect(barra.erro).toBeUndefined();
    expect(casca.paredes!.info.length).toBeGreaterThan(0);
    expect(barra.paredes?.info.length ?? 0).toBe(0);
    const rc = reacoes(casca, 'G'), rb = reacoes(barra, 'G');
    const ppC = rc.find((x) => x[0].startsWith('pp'))![1], ppB = rb.find((x) => x[0].startsWith('pp'))![1];
    expect(Math.abs(ppC / ppB - 1)).toBeLessThan(0.05);
    // o equilíbrio vertical vale nos dois
    for (const an of [casca, barra]) expect(Math.abs(reacoes(an, 'G').reduce((t, x) => t + x[1], 0) / an.totais.G - 1)).toBeLessThan(0.005);
  });
});

describe('pilar-parede no edifício', () => {
  it('parede reta com viga e laje: equilíbrio vertical e cargas na base', () => {
    const s = padrao();
    const b0 = s.modelo, t1 = nomePav(b0, 'Tipo 1'), g = b0.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'pilarParede.tipo', { nome: 'Reta 4 m', vertices: [[0, 0], [4, 0]], esq: 0.1, dir: 0.1 });
    ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0 });
    ok(s, 'pilar.inserir', { x: 0, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'pilar.inserir', { x: 4, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    for (const pts of [[[0, 0], [4, 0]], [[0, 5], [4, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
    ok(s, 'laje.criar', { grupo: g, ponto: [2, 2.5], tipo: { tipo: 'macica', h: 0.12 } });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    // equilíbrio vertical: a soma das reações de G na base é o total de G da análise
    const somaG = an.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(Math.abs(somaG / an.totais.G - 1)).toBeLessThan(0.005);
    const pp = s.modelo.pilaresParede![0].id;
    const reaPP = an.fundacao.find((f) => f.pilar === pp && f.caso === 'G')!;
    expect(reaPP.N).toBeGreaterThan(0);
    expect(an.paredes!.info.length).toBeGreaterThan(30);
  });
});

describe('pilar-parede: esforços, vigas apoiadas ao longo e dimensionamento', () => {
  function edificio() {
    const s = padrao();
    const b0 = s.modelo, t1 = nomePav(b0, 'Tipo 1'), g = b0.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'pilarParede.tipo', { nome: 'Reta 4 m', vertices: [[0, 0], [4, 0]], esq: 0.1, dir: 0.1 });
    ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0 });
    ok(s, 'pilar.inserir', { x: 0, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'pilar.inserir', { x: 4, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'pilar.inserir', { x: 7, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'viga.tracar', { grupo: g, pontos: [[1, 0], [7, 0]], secao: { b: 0.2, h: 0.5 } }); // V1: 3 m sobre a parede (apoio longitudinal) e 3 m de vão até o pilar
    for (const pts of [[[0, 5], [4, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
    ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [4, 0], [4, 5], [0, 5]], tipo: { tipo: 'macica', h: 0.12 } });
    return s;
  }

  it('resultantes por lado e pavimento equilibram a carga da base; dimensionamento roda', () => {
    const s = edificio(), b = s.modelo;
    const an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const dim = dimensionarEdificio(b, an, { fundacao: false });
    const pp = dim.pilaresParede![0];
    expect(pp.modelo).toBe('casca');
    expect(pp.lados).toHaveLength(b.pavimentos.length);
    // N do primeiro lance (tração +) ≈ −N da base (compressão +), por caso
    const l0 = pp.lados.find((x) => x.pavimento === b.pavimentos[0].id)!;
    expect(Math.abs(l0.casos.G.N / -pp.base.G.N - 1)).toBeLessThan(0.05); // a média do painel descontando o meio peso próprio do painel
    expect(pp.baseElu.Nmax).toBeGreaterThan(pp.base.G.N);
    expect(l0.elu.N.min).toBeLessThan(0);
    // quantitativo de concreto dos pilares inclui a parede
    expect(dim.quantitativos[0].concreto.pilares).toBeGreaterThan(0.8);
  });

  it('base rotulada: sem momento de flexão no plano na base; a fundação do edifício calcula com o pilar-parede na obra', () => {
    const s = edificio();
    ok(s, 'pilarParede.editar', { id: s.modelo.pilaresParede![0].id, vinculoBase: 'rotula' });
    ok(s, 'fundacao.terreno', { sigmaAdm: 300, sigmaModo: 'informada' });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'sapata', posicao: 'centrada' });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    // rótula: os giros dos nós da base ficam livres (sem momento de reação neles)
    const nos = an.paredes!.base[s.modelo.pilaresParede![0].id];
    expect(nos.length).toBeGreaterThan(4);
    for (const n of nos) { const r = an.portico.res!.reacoes[0].get(n)!; expect(Math.abs(r[3] ?? 0) + Math.abs(r[4] ?? 0)).toBeLessThan(1e-9); }
    const dim = dimensionarEdificio(s.modelo, an);
    expect(dim.fundacoes?.length).toBe(1);
  });

  it('viga sobre a parede: apoio longitudinal cortado, diagrama prolongado e barras limitadas', () => {
    const s = edificio(), b = s.modelo, v1 = b.vigas[0];
    const ap = apoiosDaViga(b, v1);
    // o contato com a parede (s de 0 a 3 m) é cortado a (1 + 2) × h = 1,5 m da face do vão; o outro apoio é o pilar
    const par = ap.find((a) => a.pilar.includes(':'))!;
    expect(par.corta).toBe('ini');
    expect(par.s1 - par.s0).toBeCloseTo(1.5, 6);
    expect(ap).toHaveLength(2);
    expect(vaosDaViga(b, v1)).toBe(1);
    const an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false });
    const r = dim.vigas.find((x) => x.viga === v1.id)!;
    expect(r.envoltoria.pontos.length).toBeGreaterThan(0);
    // diagrama prolongado: há pontos da envoltória além da face (s menor que a do primeiro apoio do vão) até h = 0,5 m
    const sFace = Math.min(...r.envoltoria.pontos.map((p) => p.s));
    expect(sFace).toBeLessThan(par.s1 - 0.4 - 1e-9 + 0.5);
    const d = dim.detalhes!.find((x) => x.viga === v1.id)!;
    expect(d.barras.length).toBeGreaterThan(0);
    // as barras não saem do trecho cortado do apoio de parede nem passam do pilar
    expect(Math.min(...d.barras.map((x) => x.s0))).toBeGreaterThanOrEqual(par.s0 - 1e-9);
  });
});

describe('pilar-parede nas pranchas', () => {
  it('formas e locação desenham os lados, o quadro e as cargas somam o pilar-parede', () => {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'pilarParede.tipo', { nome: 'L', vertices: [[0, 0], [3, 0], [3, 2]], esq: 0.1, dir: 0.1 });
    ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0 });
    ok(s, 'pilar.inserir', { x: 0, y: 6, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'pilar.inserir', { x: 5, y: 6, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    for (const pts of [[[0, 0], [3, 0]], [[0, 6], [5, 6]], [[0, 0], [0, 6]], [[5, 6], [3, 2]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const pf = montarPrancha(b, g);
    const poli = pf.modelo.filter((x) => x.t === 'pl' && x.c === 'PILAR');
    expect(poli.length).toBeGreaterThanOrEqual(2 + 2); // 2 pilares comuns + 2 lados
    expect(pf.modelo.some((x) => x.t === 'txt' && x.s === 'PP1')).toBe(true);
    const loc = montarPranchaLocacao(b, an)!;
    expect(loc.elementos).toContain('PP1');
    // tabela de cargas: a linha do PP1 (com a seção "300×20 +1") no espaço do papel
    expect(loc.papel.filter((x) => x.t === 'txt' && x.s === 'PP1').length).toBeGreaterThanOrEqual(1);
    expect(loc.papel.some((x) => x.t === 'txt' && x.s === '300×20 +1')).toBe(true);
    expect(escreverDxf(pf).length).toBeGreaterThan(100);
  });
});
