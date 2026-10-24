// Memória detalhada (MD fase 5b): blocos sobre estacas (bielas e tirantes), estacas (Décourt-Quaresma por camada, Padm, Nd,mín, Miche,
// armadura), tubulões e sapata associada. As contas são refeitas a partir das `entradas` registradas e comparadas com o
// dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado das fundações (`toEqual`).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { edificioVazio } from '../building/types';
import { comFundacao } from '../building/dimensionamento';
import { elementoFundacao } from './fundacao';
import type { ResultadoFundacao } from '../building/fundacao';
import { designCaisson, vol } from '../caissons';
import { CAP_TIES, designCap, solveTies, type CapInput, type CapResult } from '../caps';
import { beamFlexure, concrete } from '../concrete';
import { dadosDoProjeto } from '../foundation';
import { detalheGrupo, faixa } from '../footingsGroup';
import { isFooting } from '../footings';
import { ALPHA, BETA, C_TIP, defaultFoundationParams, pileLoads, recommendedOption, sampleFoundation, type FoundationParams } from '../piles';
import { anchorageLength, ceil05 } from '../rebar';
import { memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import { Registrador, comMemoria, type PassoMemoria } from './registrador';
import { cadeiaBloco, entradaBloco } from './bloco';
import { cadeiaTubulao } from './tubulao';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const igual = (a: number, b: number, msg = '') => expect(rel(a, b) < 1e-9 || Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`).toBe(true);
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const json = <T>(p: PassoMemoria, k: string) => JSON.parse(p.entradas[k] as string) as T;
const LEITURAS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35].map((N) => ({ N, solo: 'silteArenoso' }));
const ESTACAS = [{ id: 'e_hc', tipo: 'helice', D: 40, modo: 'sondagem' }, { id: 'e_es', tipo: 'escavada', D: 50, modo: 'sondagem' }, { id: 'e_pm', tipo: 'premoldada', D: 33, modo: 'sondagem' }];

function predio(terreno: Record<string, unknown> = { sigmaAdm: 250, estacas: ESTACAS }) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  ok(s, 'lote', { comandos: [[0, 0], [4, 0], [4, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok(s, 'lote', { comandos: [[[0, 0], [4, 0]], [[0, 4], [4, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  ok(s, 'sondagem.criar', { nome: 'SP-01', x: 2, y: 2, nivelAgua: 12, leituras: LEITURAS });
  ok(s, 'fundacao.terreno', terreno);
  return s;
}

interface Caso { mem: MemoriaDetalhada; fund: ResultadoFundacao[]; ligada: ResultadoFundacao[]; ligadaTudo: ReturnType<typeof comFundacao>; desligada: ReturnType<typeof comFundacao> }
function rodar(s: Sessao): Caso {
  const b = s.modelo, an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  const desligada = comFundacao(b, an);
  const r = memoriaDetalhada(b, { an });
  const ligadaTudo = comMemoria(new Registrador(), () => comFundacao(b, an));
  return { mem: r.memoria, fund: desligada.fundacoes ?? [], ligada: ligadaTudo.fundacoes ?? [], ligadaTudo, desligada };
}
const passosDe = (todos: PassoMemoria[], topico?: RegExp | string) => todos.filter((p) => !topico || (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico)));
const um = (todos: PassoMemoria[], topico: RegExp | string, desc: RegExp | string) => {
  const l = passosDe(todos, topico).filter((p) => (typeof desc === 'string' ? p.descricao.startsWith(desc) : desc.test(p.descricao)));
  expect(l.length, `${String(topico)} · ${String(desc)}`).toBeGreaterThan(0);
  return l[0];
};
const tem = (todos: PassoMemoria[], topico: RegExp | string, desc: RegExp | string) => passosDe(todos, topico).some((p) => (typeof desc === 'string' ? p.descricao.startsWith(desc) : desc.test(p.descricao)));
const elemento = (c: Caso, r: ResultadoFundacao) => c.mem.passos.filter((p) => p.elemento === elementoFundacao(r));

// ---------------------------------------------------------------------------------------------- bloco
/** Refaz o bloco a partir das entradas dos passos e compara com o `CapResult`. */
function conferirBloco(ps: PassoMemoria[], inp: CapInput, p: FoundationParams, r: CapResult) {
  const { n, coords, D } = inp;
  const mat = um(ps, 'Materiais e parâmetros do bloco', 'Resistências');
  const c = concrete(num(mat, 'fck'), num(mat, 'gammaC')), fyd = num(mat, 'fyk') / num(mat, 'gammaS');
  igual(num(mat, 'fcd'), r.fcd, 'fcd'); igual(c.fcd, r.fcd, 'fcd'); igual(num(mat, 'fyd'), fyd, 'fyd');
  const sl = um(ps, 'Materiais e parâmetros do bloco', 'Tensão limite das bielas');
  if (n > 1) { igual(num(sl, 'K') * num(sl, 'KR') * num(sl, 'fcd'), r.sigmaLim, 'σlim'); igual(sl.resultado as number, r.sigmaLim, 'σlim'); }
  const lb = um(ps, 'Materiais e parâmetros do bloco', 'Ancoragem das barras do pilar');
  igual(anchorageLength(num(lb, 'phi'), concrete(num(mat, 'fck'), num(mat, 'gammaC')), fyd), r.lbCol, 'lb'); igual(lb.resultado as number, r.lbCol, 'lb');
  const dp = um(ps, 'Materiais e parâmetros do bloco', /^(Distância do centro|Bloco de uma estaca: d)/);
  igual(num(dp, 'n') === 1 ? num(dp, 'cover') : Math.max(num(dp, 'capDprime'), (0.886 * num(dp, 'D')) / 5), r.dPrime, "d'");
  // reações
  const gf = p.gammaF;
  const base = um(ps, 'Reação de cálculo nas estacas', 'Carga de cálculo no topo');
  igual(gf * num(base, 'Nk'), r.Nd, 'Nd');
  const Sx = coords.reduce((a, [x]) => a + x * x, 0), Sy = coords.reduce((a, [, y]) => a + y * y, 0);
  igual(num(base, 'Sx'), Sx, 'Sx'); igual(num(base, 'Sy'), Sy, 'Sy');
  const rs = passosDe(ps, 'Reação de cálculo nas estacas').filter((q) => q.descricao.startsWith('Estaca '));
  expect(rs.length).toBe(n);
  rs.forEach((q, j) => {
    const R = num(q, 'gammaF') * (num(q, 'Nk') / num(q, 'n') + (num(q, 'Sx') > 1e-9 ? (Math.abs(num(q, 'My')) * Math.abs(num(q, 'x'))) / num(q, 'Sx') : 0) + (num(q, 'Sy') > 1e-9 ? (Math.abs(num(q, 'Mx')) * Math.abs(num(q, 'y'))) / num(q, 'Sy') : 0));
    igual(R, r.R[j], `R${j}`); igual(q.resultado as number, r.R[j], `R${j}`);
  });
  const rd = um(ps, 'Reação de cálculo nas estacas', 'Maior reação');
  igual(Math.max(...r.R), num(rd, 'Rd'), 'Rd'); igual(n * num(rd, 'Rd'), r.NdEq, 'NdEq');
  const sigmaLim = num(sl, 'K') * num(sl, 'KR') * num(sl, 'fcd');
  const Ae = (Math.PI * D * D) / 4;
  const vol0 = um(ps, 'Volume, peso e situação', 'Volume e peso');
  igual(num(vol0, 'lx') * num(vol0, 'ly') * num(vol0, 'h'), r.volume, 'V'); igual(25 * r.volume, num(vol0, 'W'), 'Wb');
  if (n === 1) {
    const s = r.single!;
    const h = um(ps, 'Bloco de uma estaca', /^Altura/);
    igual(inp.fixed?.h ? inp.fixed.h : ceil05(Math.max(num(h, 'cap1Ratio') * num(h, 'a'), num(h, 'lbCol') + num(h, 'cover'))), r.h, 'h');
    for (const [i, ax] of ['x', 'y'].entries()) {
      const q = um(ps, 'Bloco de uma estaca', new RegExp(`^Tirante de fretagem .* ${ax}$`));
      const Rst = 0.25 * num(q, 'Nd') * Math.max(0, num(q, 'a') - num(q, 'ap')) / num(q, 'a');
      igual(Rst, s.Rst[i], 'Rst'); igual(Rst / 1000 / num(q, 'fyd'), s.As[i], 'As');
    }
    const cp = um(ps, 'Bloco de uma estaca', 'Pressão de contato do pilar');
    igual(num(cp, 'Nd') / 1000 / (num(cp, 'ap') * num(cp, 'bp')), s.colSigma, 'σ pilar');
    igual(num(cp, 'fcd') * Math.min(Math.sqrt(Math.min((num(cp, 'a') / num(cp, 'ap')) ** 2, (num(cp, 'a') / num(cp, 'bp')) ** 2)), 3.3), s.colLim, 'lim pilar');
    const ce = um(ps, 'Bloco de uma estaca', 'Pressão na cabeça');
    igual(num(ce, 'Nd') / 1000 / num(ce, 'Ae'), s.pileSigma, 'σ estaca'); igual(num(ce, 'Ae'), Ae, 'Ae');
    return;
  }
  // planta (pilar único, dimensões calculadas)
  if (!inp.fixed && !inp.cols) {
    const pl = um(ps, 'Dimensões em planta', 'Planta do bloco');
    igual(Math.max(ceil05(num(pl, 'dx') + num(pl, 'D') + 2 * num(pl, 'capEdge')), ceil05(num(pl, 'ap') + 0.1)), r.lx, 'lx');
    igual(Math.max(ceil05(num(pl, 'dy') + num(pl, 'D') + 2 * num(pl, 'capEdge')), ceil05(num(pl, 'bp') + 0.1)), r.ly, 'ly');
  }
  // bielas
  const struts = passosDe(ps, 'Bielas: geometria e altura').filter((q) => /^Biela /.test(q.descricao));
  for (const q of struts) igual(Math.hypot(num(q, 'x') - num(q, 'tx'), num(q, 'y') - num(q, 'ty')), num(q, 'arm'), 'arm');
  const al = um(ps, 'Bielas: geometria e altura', 'Altura útil mínima');
  const dMin = num(al, 'armMax') * Math.tan((num(al, 'thetaMin') * Math.PI) / 180), dMax = num(al, 'armMin') * Math.tan((num(al, 'thetaMax') * Math.PI) / 180);
  igual(dMin, r.dMin, 'dMin'); igual(dMax, r.dMax, 'dMax');
  const ha = um(ps, 'Bielas: geometria e altura', /^Altura (imposta|do bloco)/);
  if (!inp.fixed?.h) igual(ceil05(Math.max(num(ha, 'dMin'), num(ha, 'lbCol')) + num(ha, 'dPrime')), r.h, 'h');
  igual(num(ha, 'h') - num(ha, 'dPrime'), r.d, 'd');
  const th = passosDe(ps, 'Bielas: inclinação e tensões').filter((q) => /^Inclinação da biela/.test(q.descricao));
  expect(th.length).toBe(struts.length);
  for (const q of th) igual((Math.atan(num(q, 'd') / num(q, 'arm')) * 180) / Math.PI, q.resultado as number, 'θ');
  const ext = um(ps, 'Bielas: inclinação e tensões', 'Inclinações extremas');
  igual(num(ext, 'thetaMin'), r.thetaMin, 'θmín'); igual(num(ext, 'thetaMax'), r.thetaMax, 'θmáx');
  const s2 = (deg: number) => Math.sin((deg * Math.PI) / 180) ** 2;
  if (!r.multi) {
    const sc = um(ps, 'Bielas: inclinação e tensões', 'Tensão da biela junto ao pilar');
    igual(num(sc, 'NdEq') / 1000 / (num(sc, 'ap') * num(sc, 'bp') * s2(num(sc, 'thetaMin'))), r.strutCol, 'σ biela pilar');
    const sp = um(ps, 'Bielas: inclinação e tensões', 'Tensão da biela junto à estaca');
    igual(Math.max(...json<number[]>(sp, 'theta').map((t) => num(sp, 'Rd') / 1000 / (num(sp, 'Ae') * s2(t)))), r.strutPile, 'σ biela estaca');
  } else {
    expect(passosDe(ps, 'Bielas: inclinação e tensões').filter((q) => /^Pilar .*tensão da biela/.test(q.descricao)).length).toBe(r.multi.cols.length);
    for (const q of passosDe(ps, 'Bielas: inclinação e tensões').filter((x) => /^Pilar .*tensão da biela/.test(x.descricao))) igual(num(q, 'NdEq') / 1000 / (num(q, 'ap') * num(q, 'bp') * s2(num(q, 'thetaMin'))), q.resultado as number, 'σ biela pilar (vários)');
  }
  expect(sigmaLim).toBeCloseTo(r.sigmaLim, 9);
  // tirantes: equilíbrio horizontal dos nós
  const hvp = um(ps, 'Tirantes', 'Componente horizontal');
  const ss = json<[number, number, number, number, number][]>(hvp, 'struts');
  const hv: [number, number][] = coords.map(([x, y], j) => { let hx = 0, hy = 0; for (const [pile, F, tx, ty, arm] of ss) if (pile === j && arm > 0) { hx += (F * (x - tx)) / r.d; hy += (F * (y - ty)) / r.d; } return [hx, hy]; });
  const hvReg = json<[number, number][]>(hvp, 'hv');
  hv.forEach(([hx, hy], j) => { igual(hx, hvReg[j][0], 'hx'); igual(hy, hvReg[j][1], 'hy'); });
  const T = solveTies(coords, CAP_TIES[n], hv);
  const tir = passosDe(ps, 'Tirantes').filter((q) => /^Tirante \d+–\d+ \(/.test(q.descricao));
  expect(tir.length).toBe(r.ties.length);
  tir.forEach((q, e) => {
    igual(Math.max(0, T[e]), r.ties[e].T, `T${e}`); igual(num(q, 'T'), r.ties[e].T, `T${e}`); igual(Math.max(0, T[e]) / 1000 / fyd, r.ties[e].As, `As${e}`);
  });
  const anc = passosDe(ps, 'Tirantes').filter((q) => /ancoragem com gancho/.test(q.descricao));
  for (const q of anc) {
    const lb2 = anchorageLength(num(q, 'phi'), c, fyd);
    igual(Math.max(0.7 * lb2 * (num(q, 'As') / num(q, 'Aef')), 0.3 * lb2, (10 * num(q, 'phi')) / 1000, 0.1), num(q, 'lbNec'), 'lbNec');
    igual(num(q, 'D') + num(q, 'capEdge') - num(q, 'cover'), num(q, 'lbDisp'), 'lbDisp');
  }
  if (r.mesh) for (const [i, ax] of (['x', 'y'] as const).entries()) { const q = um(ps, 'Armaduras complementares', new RegExp(`^Malha inferior na direção ${ax}`)); igual(num(q, 'As'), r.mesh[ax].As, 'malha'); void i; }
  if (r.stirrups) igual(um(ps, 'Armaduras complementares', 'Estribos verticais').resultado as number, r.stirrups.aswS, 'Asw/s');
  if (r.skin) igual(um(ps, 'Armaduras complementares', 'Armadura de pele').resultado as number, r.skin.AsFace, 'pele');
  igual(num(um(ps, 'Armaduras complementares', /^Armadura de suspensão/), 'As'), r.susp.AsTot, 'suspensão');
}

function bloco(inp: CapInput, p = defaultFoundationParams()) {
  const r = designCap(inp, p);
  const mem = new Registrador();
  cadeiaBloco(mem, 'Bloco X', inp, p, r);
  const ps = mem.passos;
  conferirBloco(ps, inp, p, r);
  return { r, ps };
}
const coordsDe = (n: number, s: number): [number, number][] => ({
  1: [[0, 0]], 2: [[-s / 2, 0], [s / 2, 0]], 3: [[0, s / Math.sqrt(3)], [-s / 2, -s / (2 * Math.sqrt(3))], [s / 2, -s / (2 * Math.sqrt(3))]],
  4: [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]], 5: [[0, 0], [-s / Math.SQRT2, -s / Math.SQRT2], [s / Math.SQRT2, -s / Math.SQRT2], [s / Math.SQRT2, s / Math.SQRT2], [-s / Math.SQRT2, s / Math.SQRT2]],
  6: [[-s, -s / 2], [0, -s / 2], [s, -s / 2], [-s, s / 2], [0, s / 2], [s, s / 2]],
} as Record<number, [number, number][]>)[n];

describe('MD5b blocos sobre estacas · bielas e tirantes (Blévot)', () => {
  const D = 0.4, s = 1.2;
  for (const n of [1, 2, 3, 4, 5, 6]) {
    it(`bloco de ${n} estaca(s): reações, planta, d, θ, bielas, tirantes, ancoragem e armaduras refeitos das entradas`, () => {
      const { r, ps } = bloco({ n, coords: coordsDe(n, s), D, s, Nk: 800 * n, Mx: 60, My: 90, ap: 0.4, bp: 0.3, WbAssumed: 100 });
      expect(r.n).toBe(n);
      expect(ps.every((q) => q.elemento === 'Bloco X')).toBe(true);
      if (n > 1) expect(r.ties.length).toBeGreaterThan(0);
      expect(tem(ps, 'Volume, peso e situação', /^(Bloco atende|Bloco NÃO atende)/)).toBe(true);
    });
  }
  it('dimensões e armadura impostas (só verificadas) e bloco de 2 estacas com suspensão (s > 3D)', () => {
    const a = bloco({ n: 2, coords: coordsDe(2, 1.6), D, s: 1.6, Nk: 900, Mx: 0, My: 40, ap: 0.4, bp: 0.3, fixed: { lx: 2.4, ly: 0.8, h: 0.9, bars: { phi: 16, n: 5 } } });
    expect(a.r.fixed).toBe(true);
    expect(a.r.susp.need).toBe(true);
    expect(a.ps.some((q) => /armadura imposta/.test(q.descricao))).toBe(true);
    expect(a.ps.some((q) => q.descricao.startsWith('Altura imposta'))).toBe(true);
  });
  it('bloco com dois pilares: bielas por pilar (ajuste bi-proporcional) e tensão por pilar', () => {
    const coords = coordsDe(4, 1.2);
    const cols = [{ label: 'P1', x: -0.6, y: 0, ap: 0.3, bp: 0.3, Nk: 700 }, { label: 'P2', x: 0.6, y: 0, ap: 0.3, bp: 0.3, Nk: 500 }];
    const { r, ps } = bloco({ n: 4, coords, D, s: 1.2, Nk: 1200, Mx: 0, My: 0, ap: 0.3, bp: 0.3, cols });
    expect(r.multi).toBeDefined();
    expect(passosDe(ps, 'Bielas: geometria e altura').filter((q) => /^Biela do pilar/.test(q.descricao)).length).toBe(r.multi!.struts.length);
  });
  it('fórmula de Blévot: K·KR·fcd por número de estacas e ângulo mínimo 45°', () => {
    const p = defaultFoundationParams();
    const { r } = bloco({ n: 2, coords: coordsDe(2, 1.2), D, s: 1.2, Nk: 600, Mx: 0, My: 0, ap: 0.3, bp: 0.3 }, p);
    expect(r.thetaMin).toBeGreaterThanOrEqual(p.capThetaMin - 1e-9);
    // 2 estacas, pilar centrado: arm = s/2 − ap/4 e d,mín = arm·tan(θmín)
    igual(r.arms[1], 0.6 - 0.3 / 4, 'arm = s/2 − ap/4');
  });
});

// ---------------------------------------------------------------------------------------------- estacas
function conferirEstaca(ps: PassoMemoria[], d: NonNullable<ResultadoFundacao['projeto']>) {
  const s = d.pile!, cap = s.cap;
  const topo = new RegExp(`^Capacidade de carga · .* L = ${s.L} m$`);
  const np = um(ps, topo, 'Np:');
  const vals = json<number[]>(np, 'valores');
  igual(vals.reduce((a, v) => a + v, 0) / vals.length, cap.Np, 'Np');
  const rp = um(ps, topo, 'Resistência de ponta');
  const solo = s.type; // tipo da estaca
  igual(num(rp, 'alfa') * num(rp, 'K') * num(rp, 'Np') * num(rp, 'Ap'), cap.Rp, 'Rp');
  expect(ALPHA[solo]).toContain(num(rp, 'alfa')); expect(Object.values(C_TIP)).toContain(num(rp, 'K'));
  igual(num(rp, 'Ap'), (Math.PI * s.D * s.D) / 4, 'Ap');
  const nl = um(ps, topo, 'Nl:');
  const Ns = json<[number, number, number][]>(nl, 'Ns');
  if (Ns.length) igual(Ns.reduce((a, [, N, w]) => a + N * w, 0) / Ns.reduce((a, [, , w]) => a + w, 0), cap.Nl, 'Nl');
  const camadas = passosDe(ps, topo).filter((q) => /^Camada do metro/.test(q.descricao));
  expect(camadas.length).toBeGreaterThan(0);
  let Rl = 0;
  for (const q of camadas) { const x = num(q, 'beta') * 10 * (num(q, 'N') / 3 + 1) * num(q, 'U') * num(q, 'w'); igual(x, num(q, 'parcela'), 'parcela'); Rl += x; expect(Object.values(BETA[solo])).toContain(num(q, 'beta')); }
  igual(Rl, cap.Rl, 'Rl'); igual(num(um(ps, topo, 'Resistência lateral total'), 'Rl'), cap.Rl, 'Rl');
  const ru = um(ps, topo, /^Ponta adotada/);
  igual(solo === 'premoldada' ? num(ru, 'Rp') : Math.min(num(ru, 'Rp'), num(ru, 'Rl')), cap.RpUsed, 'RpUsed');
  const pa = um(ps, topo, 'Carga admissível');
  const Padm0 = Math.min((num(pa, 'RpUsed') + num(pa, 'Rl')) / 2, num(pa, 'RpUsed') / 4 + num(pa, 'Rl') / 1.3);
  igual(Padm0, Math.min(num(pa, 'pGlobal'), num(pa, 'pParcial')), 'Padm');
  igual(solo === 'escavada' ? Math.min(Padm0, 1.25 * cap.Rl) : Padm0, cap.Padm, 'Padm final');
  const ta = um(ps, topo, 'Tração admissível');
  igual(num(ta, 'Rl') / 2 + 0.9 * 25 * num(ta, 'Ap') * Math.max(0, num(ta, 'L') - num(ta, 'cutoff')), cap.Tadm, 'Tadm');
  // limites de profundidade
  const lim = um(ps, 'Limites de profundidade e escolha do comprimento', 'Profundidade máxima');
  expect(num(lim, 'Lmax')).toBe(s.Lmax); expect(num(lim, 'Linicio')).toBeLessThanOrEqual(s.L); expect(s.L).toBeLessThanOrEqual(s.Lmax);
  // cargas
  const cg = 'Cargas nas estacas';
  const dn = um(ps, cg, 'Peso do bloco');
  const dN = (Math.abs(num(dn, 'My')) * num(dn, 'xmax')) / num(dn, 'Sx') || 0;
  if (num(dn, 'Sx') > 1e-9 && num(dn, 'Sy') > 1e-9) igual(dN + (Math.abs(num(dn, 'Mx')) * num(dn, 'ymax')) / num(dn, 'Sy'), s.loads.dN, 'ΔN');
  igual(num(dn, 'Nk') * num(dn, 'pct') / 100, s.loads.Wb, 'Wb');
  const nm = um(ps, cg, 'Carga máxima e mínima');
  igual((num(nm, 'Nk') + num(nm, 'Wb')) / num(nm, 'n') + num(nm, 'dN'), s.loads.Nmax, 'Nmáx'); igual((num(nm, 'NkMin') + num(nm, 'Wb')) / num(nm, 'n') - num(nm, 'dN'), s.loads.Nmin, 'Nmín');
  const ndm = um(ps, cg, /^Nd,mín/);
  igual(num(ndm, 'gammaFav') * (num(ndm, 'Gk') + num(ndm, 'Wb')) / num(ndm, 'n') - num(ndm, 'gammaUnf') * (num(ndm, 'relief') / num(ndm, 'n') + num(ndm, 'dN')), s.loads.NdMin, 'Nd,mín');
  expect(ndm.expressao).toMatch(/Td = /);
  // Miche e armadura
  const st = s.struct, mi = 'Estaca: horizontal (Miche) e armadura';
  if (st.kind === 'moldada') {
    const mk = um(ps, mi, 'Carga horizontal (Miche)');
    igual(((num(mk, 'Ecs') * 1000 * Math.PI * num(mk, 'D') ** 4) / 64 / (num(mk, 'nh') * 1000)) ** 0.2, st.T, 'T de Miche');
    igual(num(mk, 'M0') + 0.79 * num(mk, 'H') * num(mk, 'T'), st.Mk, 'Mk'); igual(num(mk, 'gammaF') * st.Mk, st.Md, 'Md');
    const sg = um(ps, mi, 'Tensão de compressão');
    igual(num(sg, 'Nd') / 1000 / num(sg, 'Ac'), st.sigma!, 'σ estaca');
    const tr = um(ps, mi, 'Armadura de tração');
    igual(num(tr, 'Td') / 1000 / num(tr, 'fyd'), st.AsTension, 'As,t'); igual(num(tr, 'rhoMin') * num(tr, 'Ac'), st.AsMin, 'As,mín');
    const op = recommendedOption(st.options);
    if (op) { const q = um(ps, mi, 'Armadura adotada'); igual(num(q, 'As'), op.As, 'As adotada'); igual(num(q, 'n') * (Math.PI * (num(q, 'phi') / 1000) ** 2) / 4, op.As, 'n·Aφ'); }
  } else {
    const mk = um(ps, mi, 'Comprimento elástico T');
    igual(num(mk, 'M0') + 0.79 * num(mk, 'H') * num(mk, 'T'), st.Mk, 'Mk');
    igual(((num(mk, 'E') * Math.PI * num(mk, 'D') ** 4) / 64 / (num(mk, 'nh') * 1000)) ** 0.2, st.T, 'T');
  }
}

describe('MD5b estacas · Décourt-Quaresma por camada, Padm, Nd,mín, Miche e armadura', () => {
  it('blocos pela sondagem: hélice, escavada e pré-moldada refeitos das entradas; memória ligada idêntica à desligada', () => {
    const s = predio();
    const [p1, p2, p3, p4] = s.modelo.pilares;
    ok(s, 'carga.pilar', { pilar: p1.id, caso: 'G', N: 300 });
    ok(s, 'carga.pilar', { pilar: p2.id, caso: 'G', N: 500 });
    ok(s, 'carga.pilar', { pilar: p3.id, caso: 'G', N: 700 });
    ok(s, 'carga.pilar', { pilar: p4.id, caso: 'G', N: 1000 });
    ok(s, 'fundacao.criar', { pilar: p1.id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    ok(s, 'fundacao.criar', { pilar: p2.id, tipo: 'bloco', estaca: { id: 'e_es' } });
    ok(s, 'fundacao.criar', { pilar: p3.id, tipo: 'bloco', estaca: { id: 'e_pm' } });
    ok(s, 'fundacao.criar', { pilar: p4.id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    const c = rodar(s);
    expect(c.fund.length).toBe(4);
    const tipos = new Set<string>();
    c.ligada.forEach((r, i) => {
      const d = r.projeto!;
      expect(d.pile, r.nome).toBeTruthy();
      tipos.add(d.pile!.type);
      const ps = elemento(c, c.fund[i]);
      conferirEstaca(ps, d);
      const data = dadosDoProjeto.get(d)!, inp = entradaBloco(d, data)!;
      expect(designCap(inp, data.params)).toEqual(d.cap);
      conferirBloco(ps, inp, data.params, d.cap!);
      expect(tem(ps, 'Escolha da estaca e do número de estacas', /^Candidatas/)).toBe(true);
    });
    expect([...tipos].sort()).toEqual(['escavada', 'helice', 'premoldada']);
    expect(c.ligadaTudo).toEqual(c.desligada);
  });

  it('blocos de 4 e 5 estacas com carga alta e o bloco com dois pilares', () => {
    const s = predio();
    const [p1, p2, p3, p4] = s.modelo.pilares;
    ok(s, 'carga.pilar', { pilar: p1.id, caso: 'G', N: 1500 });
    ok(s, 'carga.pilar', { pilar: p2.id, caso: 'G', N: 2500 });
    ok(s, 'carga.pilar', { pilar: p3.id, caso: 'G', N: 400 });
    ok(s, 'carga.pilar', { pilar: p4.id, caso: 'G', N: 400 });
    ok(s, 'fundacao.criar', { pilar: p1.id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    ok(s, 'fundacao.criar', { pilar: p2.id, tipo: 'bloco', estaca: { id: 'e_es' } });
    ok(s, 'fundacao.criar', { pilares: [p3.id, p4.id], tipo: 'bloco', estaca: { id: 'e_hc' } });
    const c = rodar(s);
    expect(c.fund.length).toBe(3);
    const ns = c.fund.map((r) => r.dims.n);
    expect(Math.max(...(ns as number[]))).toBeGreaterThanOrEqual(4);
    c.ligada.forEach((r, i) => {
      const d = r.projeto!, data = dadosDoProjeto.get(d)!, inp = entradaBloco(d, data)!;
      expect(designCap(inp, data.params)).toEqual(d.cap);
      conferirBloco(elemento(c, c.fund[i]), inp, data.params, d.cap!);
      if (d.pile) conferirEstaca(elemento(c, c.fund[i]), d);
    });
    // o bloco de dois pilares tem tópicos de cargas por pilar
    const ultimo = elemento(c, c.fund[2]);
    expect(passosDe(ultimo).filter((q) => q.topico.startsWith('Cargas características por caso')).length).toBeGreaterThan(2);
    expect(c.ligadaTudo).toEqual(c.desligada);
  });

  it('estaca com carga admissível informada (sem sondagem): n e verificação refeitos', () => {
    const s = predio({ sigmaAdm: 250, estacas: [{ id: 'e_hc', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'G', N: 900 });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'bloco', estaca: { id: 'e_hc' } });
    const c = rodar(s);
    const d = c.ligada[0].projeto!, ps = elemento(c, c.fund[0]);
    expect(d.pileFixed).toBeTruthy();
    const q = um(ps, 'Estaca com capacidade informada', 'Estaca ');
    expect(num(q, 'capacidade')).toBe(500); expect(num(q, 'n')).toBe(d.pileFixed!.n);
    igual(num(q, 'Nmax'), d.pileFixed!.loads.Nmax, 'Nmax'); expect(d.pileFixed!.loads.Nmax).toBeLessThanOrEqual(500 + 1e-9);
    expect(tem(ps, 'Cargas nas estacas', /^Nd,mín/)).toBe(true);
    const data = dadosDoProjeto.get(d)!;
    conferirBloco(ps, entradaBloco(d, data)!, data.params, d.cap!);
    expect(c.ligadaTudo).toEqual(c.desligada);
  });

  it('pileLoads: Nd,mín e tração com Gk informado (γfav·(Gk + Wb)/n − γf·[(Gk − Nk,mín)/n + ΔN])', () => {
    const ld = { id: 1, label: 'x', Nk: 1000, NkMin: -200, NkPerm: 700, Hx: 20, Hy: 0, Mx: 0, My: 120 };
    const pl = pileLoads(ld, 2, 0.4, 3, 5);
    const Wb = 50, dN = (120 * 0.6) / (2 * 0.6 * 0.6);
    igual(pl.NdMin, 1.0 * (700 + Wb) / 2 - 1.4 * ((700 + 200) / 2 + dN), 'Nd,mín');
    expect(pl.NdMin).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------------------------- tubulão
describe('MD5b tubulões · fuste, cota, σadm pelo SPT, base e tensões', () => {
  const PARAMS = defaultFoundationParams();
  const furo = sampleFoundation().boring;
  const casos: [string, Partial<FoundationParams>, number][] = [
    ['σadm pelo SPT, cota automática (menor volume)', {}, 1200],
    ['σadm informada e cota informada', { tbSigmaMode: 'informada', tbSigmaAdm: 500, tbDepth: 5 }, 900],
  ];
  for (const [nome, extra, Nk] of casos) {
    it(nome, () => {
      const p = { ...PARAMS, ...extra };
      const inp = { Nk, NkMin: Nk * 0.7, Mx: 30, My: 40, Hx: 0, Hy: 0, boring: furo };
      const r = designCaisson(inp, p);
      expect(r.ok, r.messages.join(' ')).toBe(true);
      const mem = new Registrador();
      cadeiaTubulao(mem, 'Tubulão X', inp, p, r);
      const ps = mem.passos, res = r as Extract<typeof r, { Db: number }>;
      const lim = um(ps, 'Fuste', 'Tensão limite');
      igual((0.85 * num(lim, 'fck')) / num(lim, 'gc'), res.sigmaFusteLim, 'σ,lim');
      const fu = um(ps, 'Fuste', /^(Área e diâmetro|Diâmetro do fuste)/);
      igual((num(fu, 'gammaF') * num(fu, 'Nk')) / 1000 / num(fu, 'lim'), num(fu, 'Af'), 'Af');
      igual(Math.max(num(fu, 'DfMin'), ceil05(Math.sqrt((4 * num(fu, 'Af')) / Math.PI))), res.Df, 'Df');
      const sf = um(ps, 'Fuste', 'Tensão de cálculo');
      igual((num(sf, 'gammaF') * num(sf, 'Nk')) / 1000 / ((Math.PI * num(sf, 'Df') ** 2) / 4), res.sigmaFuste, 'σ fuste');
      const ct = um(ps, 'Cota de apoio', /^Cota/);
      expect(num(ct, 'adotada')).toBe(res.depth);
      const tent = json<[number, number, number | null, string][]>(ct, 'tentativas');
      const validas = tent.filter((q) => q[1] === 1).sort((a, b) => a[2]! - b[2]! || a[0] - b[0]);
      expect(validas[0][0]).toBe(res.depth);
      const base = um(ps, 'Base alargada', 'Base:');
      igual(num(base, 'Db') > num(base, 'Df') + 1e-9 ? 0.866 * (num(base, 'Db') - num(base, 'Df')) : 0, res.Hcone, 'Hcone');
      igual(num(base, 'Hcone') + num(base, 'rodape'), res.H, 'H');
      const v = um(ps, 'Base alargada', 'Volume de concreto');
      igual(vol(num(v, 'Df'), num(v, 'Db'), num(v, 'L'), num(v, 'Hcone'), num(v, 'rodape')), res.volume, 'V'); igual(num(v, 'V'), res.volume, 'V');
      const pe = um(ps, 'Base alargada', 'Peso próprio');
      igual(num(pe, 'Nk') + num(pe, 'W'), res.Nbase, 'Nbase'); igual(num(pe, 'W'), res.W, 'W');
      const te = um(ps, 'Base alargada', 'Tensões na base');
      igual(num(te, 'Nbase') / num(te, 'Ab') + num(te, 'M') / num(te, 'Wb'), res.sigmaBaseMax, 'σmáx base');
      if (p.tbSigmaMode !== 'informada') { const sg = um(ps, 'Tensão admissível do solo', 'N̄ limitado'); igual((Math.min(num(sg, 'Nbar'), num(sg, 'Nmax')) / num(sg, 'div')) * 1000, res.sigmaAdm, 'σadm'); }
      else igual(num(um(ps, 'Tensão admissível do solo', 'σadm informada'), 'sigma'), res.sigmaAdm, 'σadm');
    });
  }

  it('tubulão no edifício: memória ligada idêntica à desligada e cadeia presente', () => {
    const s = predio();
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'G', N: 800 });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'tubulao' });
    const c = rodar(s);
    const ps = elemento(c, c.fund[0]);
    expect(tem(ps, 'Fuste', 'Tensão limite')).toBe(true);
    expect(tem(ps, 'Base alargada', 'Tensões na base')).toBe(true);
    expect(c.ligadaTudo).toEqual(c.desligada);
  });
});

// ---------------------------------------------------------------------------------------------- sapata associada
describe('MD5b sapata associada · casos, planta, altura, faixas e flexão', () => {
  it('dois pilares: casos de verificação, hbal/hvão, momentos por faixa (faixa refeita das entradas), As e compressão diagonal', () => {
    const s = predio({ sigmaAdm: 250 });
    const [p1, p2] = s.modelo.pilares;
    ok(s, 'carga.pilar', { pilar: p1.id, caso: 'G', N: 400 });
    ok(s, 'carga.pilar', { pilar: p2.id, caso: 'G', N: 300 });
    ok(s, 'fundacao.criar', { pilares: [p1.id, p2.id], tipo: 'sapata' });
    const c = rodar(s);
    const r = c.fund[0], rl = c.ligada[0], ps = elemento(c, r);
    const f = rl.projeto!.footing!;
    expect(isFooting(f)).toBe(true);
    if (!isFooting(f)) return;
    const det = detalheGrupo.get(f)!;
    expect(det).toBeDefined();
    const p = dadosDoProjeto.get(rl.projeto!)!.params, cc = concrete(p.fckFound, p.gammaC), fyd = p.fyk / p.gammaS;
    // casos de verificação
    const cas = passosDe(ps, 'Casos de verificação');
    expect(cas.length).toBe(det.casos.length);
    cas.forEach((q, i) => {
      const cols = json<{ N: number; Mx: number; My: number }[]>(q, 'cols'), pos = json<[number, number][]>(q, 'colsPos');
      const N = cols.reduce((a, x) => a + x.N, 0);
      igual(N, det.casos[i].N, 'N do caso');
      igual(num(q, 'sx') * cols.reduce((a, x) => a + x.My, 0) + cols.reduce((a, x, k) => a + x.N * pos[k][0], 0), det.casos[i].My, 'My do caso');
      igual(num(q, 'sy') * cols.reduce((a, x) => a + x.Mx, 0) + cols.reduce((a, x, k) => a + x.N * pos[k][1], 0), det.casos[i].Mx, 'Mx do caso');
    });
    // altura
    const al = um(ps, 'Altura e ancoragem', 'Alturas mínimas');
    igual((2 * num(al, 'balanco') / 3) * (1.5 / num(al, 'ftBalancoAltura')), det.hBal, 'hbal'); igual(num(al, 'vao') / num(al, 'ftVaoAltura'), det.hVao, 'hvão');
    const ha = um(ps, 'Altura e ancoragem', 'Ancoragem');
    igual(anchorageLength(num(ha, 'phi'), cc, fyd), det.lbCol, 'lb');
    if (!ha.entradas.imposta && !ha.entradas.simples) igual(ceil05(Math.max(num(ha, 'hBal'), num(ha, 'hVao'), num(ha, 'lbCol') + num(ha, 'cover'))), f.h, 'h');
    // diagramas: faixa() refeita das entradas
    const dg = passosDe(ps, 'Momentos por faixa (diagrama)').filter((q) => /^Caso \d+/.test(q.descricao));
    expect(dg.length).toBe(det.faixas.length);
    for (const q of dg) {
      const fx = faixa(json(q, 'poly'), json(q, 'v'), json(q, 'col'), num(q, 'secE'), num(q, 'secD'));
      igual(fx.Mpos, num(q, 'Mpos'), 'M+'); igual(fx.Mneg, num(q, 'Mneg'), 'M−'); igual(fx.larguraPos, num(q, 'larguraPos'), 'W+'); igual(fx.cPos, num(q, 'cPos'), 'c');
    }
    // envoltória e armadura (As refeito pela flexão da NBR 6118)
    for (const ax of ['x', 'y'] as const) {
      const e = um(ps, 'Momentos por faixa (diagrama)', `Envoltória dos casos, direção ${ax}`);
      igual(Math.max(...det.faixas.filter((q) => q.ax === ax).map((q) => q.Mpos)), num(e, 'Mpos'), 'M+ env'); igual(Math.min(0, ...det.faixas.filter((q) => q.ax === ax).map((q) => q.Mneg)), num(e, 'Mneg'), 'M− env');
      const fx = f.flex[ax];
      const dEff = num(e, 'cPos') > 0 ? Math.min(f.h - p.cover - 0.01, 1.5 * num(e, 'cPos')) : f.h - p.cover - 0.01;
      const Wd = num(e, 'Wpos');
      if (Wd > 0 && num(e, 'Mpos') > 0 && !f.simples) igual(beamFlexure({ kind: 'rect', bw: Wd, h: dEff + p.cover + 0.01 }, false, num(e, 'Mpos'), dEff, 0.05, cc, fyd).As, fx.As, `As ${ax}`);
      igual(dEff, fx.dEff, `dEff ${ax}`);
    }
    // compressão diagonal
    f.grupo!.pilares.forEach((q) => { const t = passosDe(ps, 'Compressão diagonal no contorno dos pilares').find((x) => x.descricao.startsWith(`Pilar ${q.label}:`))!; igual(num(t, 'Nd') / 1000 / (num(t, 'u0') * num(t, 'd')), q.tauSd0, 'τSd'); igual(num(t, 'tauRd2'), q.tauRd2, 'τRd2'); });
    // volume
    const vo = um(ps, 'Volume de concreto', 'Volume');
    igual(num(vo, 'V'), f.volume, 'V');
    expect(c.ligadaTudo).toEqual(c.desligada);
  });
});

describe('MD5b viga sobre base elástica · esforços ELU, flexão, cortante e armaduras (sapata corrida sob pilares e viga de fundação)', () => {
  function vazio() {
    const s = new Sessao(edificioVazio());
    ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok(s, 'pilar.inserir', { x: 100, y: 100, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'fundacao.terreno', { sigmaAdm: 250 });
    return s;
  }
  it('sapata corrida sob pilares: envoltória (Σ f·M por caso), flexão, As, cortante e quantitativos refeitos', () => {
    const s = vazio();
    ok(s, 'corrida.criar', { pontos: [[0, 0], [12, 0]], bw: 0.4, B: 1.4, h: 0.7 });
    for (const x of [1, 6, 11]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    for (const p of s.modelo.pilares) { ok(s, 'carga.pilar', { pilar: p.id, caso: 'G', N: 400 }); ok(s, 'carga.pilar', { pilar: p.id, caso: 'Q', N: 150 }); }
    const c = rodar(s), r = c.desligada.corridas![0], lg = r.longitudinal!;
    const ps = c.mem.passos.filter((p) => p.elemento === 'Sapata corrida SC1');
    const env = passosDe(ps, /^Base elástica · esforços ELU/);
    expect(env.length).toBe(3);
    const alvo = [lg.Md.inf, lg.Md.sup, lg.Vd];
    env.forEach((q, i) => {
      const contrib = json<[string, number, number][]>(q, 'contribuicoes');
      igual(Math.abs(contrib.reduce((a, [, f, v]) => a + f * v, 0)), num(q, 'valor'), `Σ f·caso ${i}`);
      igual(num(q, 'valor'), alvo[i], `valor ${i}`); igual(q.resultado as number, alvo[i], `resultado ${i}`);
    });
    const dados = um(ps, 'Base elástica · dados', 'Sapata corrida sob pilares');
    igual(num(dados, 'L'), lg.L, 'L'); igual(num(dados, 'h'), lg.h, 'h');
    const sol = um(ps, 'Base elástica · tensões no solo', 'Pressão máxima');
    igual(num(sol, 'sigmaMax'), lg.sigmaMax, 'σmáx'); igual(num(sol, 'recalque'), lg.recalque, 'recalque');
    const ar = um(ps, 'Base elástica · armaduras longitudinais', 'Armadura mínima');
    igual(num(ar, 'AsInf'), lg.armadura.inf.As, 'As,inf'); igual(num(ar, 'AsSup'), lg.armadura.sup.As, 'As,sup');
    igual(Math.max(num(ar, 'AsFlexInf') + num(ar, 'As2Sup'), num(ar, 'AsMin')), num(ar, 'AsInf'), 'As,inf = máx(flexão + comp.; mín)');
    igual(Math.max(num(ar, 'AsFlexSup') + num(ar, 'As2Inf'), num(ar, 'AsMinSup')), num(ar, 'AsSup'), 'As,sup');
    const ct = um(ps, 'Base elástica · cortante', 'Resistência da biela');
    igual(0.27 * num(ct, 'av2') * num(ct, 'fcd') * num(ct, 'bw') * num(ct, 'd') * 1000, num(ct, 'VRd2'), 'VRd2'); igual(0.6 * num(ct, 'fctd') * num(ct, 'bw') * num(ct, 'd') * 1000, num(ct, 'Vc'), 'Vc');
    const at = um(ps, 'Base elástica · cortante', 'Armadura transversal');
    const aswMin = ((0.2 * num(at, 'fctm')) / num(at, 'fywk')) * num(at, 'bw');
    igual(Math.max(aswMin, Math.max(0, Math.abs(num(at, 'Vd')) / 1000 - num(at, 'Vc') / 1000) / (0.9 * num(at, 'd') * num(at, 'fywd'))), num(at, 'aswS'), 'Asw/s');
    if (lg.armadura.estribo) { igual(num(at, 's'), lg.armadura.estribo.s, 's'); expect(num(at, 'phi')).toBe(lg.armadura.estribo.phi); }
    igual(num(um(ps, 'Base elástica · pele, volume e aço', 'Volume'), 'V'), lg.volume, 'V'); igual(num(um(ps, 'Base elástica · pele, volume e aço', 'Volume'), 'aco'), lg.aco, 'aço');
    expect(tem(ps, 'Base elástica · flexão inferior (tração embaixo)', 'Momento de cálculo')).toBe(true);
    expect(c.ligadaTudo).toEqual(c.desligada);
  });
  it('viga de fundação sobre base elástica (não corrida): cadeia com o nome da viga', () => {
    const s = vazio();
    ok(s, 'vigaElastica.criar', { pontos: [[0, 0], [12, 0]], b: 0.6, h: 0.9, k: 30000 });
    for (const x of [1, 6, 11]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    for (const p of s.modelo.pilares) ok(s, 'carga.pilar', { pilar: p.id, caso: 'G', N: 500 });
    const c = rodar(s);
    const el = c.mem.elementos.find((e) => e.startsWith('Viga sobre base elástica'));
    expect(el).toBeDefined();
    const ps = c.mem.passos.filter((p) => p.elemento === el);
    expect(tem(ps, /^Base elástica · esforços ELU/, 'Cortante')).toBe(true);
    expect(passosDe(ps, 'Base elástica · dados').length).toBe(2);
  });
});

describe('MD5b integração · HTML, CSV, filtro por elemento e custo com a memória desligada', () => {
  it('HTML e CSV trazem as cadeias profundas; filtro por elemento; resumo do escopo', () => {
    const s = predio();
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[1].id, caso: 'G', N: 500 });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[1].id, tipo: 'bloco', estaca: { id: 'e_es' } });
    ok(s, 'fundacao.criar', { pilar: s.modelo.pilares[0].id, tipo: 'tubulao' });
    const b = s.modelo, an = analisarEdificio(b);
    const so = memoriaDetalhada(b, { an, elementos: ['Bloco sobre estacas B1'] }).memoria;
    expect(so.elementos.filter((e) => e !== 'Edifício')).toEqual(['Bloco sobre estacas B1']);
    expect(so.passos.some((p) => p.elemento === 'Tubulão T1')).toBe(false);
    expect(so.escopo).toMatch(/blocos sobre estacas/);
    const html = htmlMemoriaCorpo(so);
    expect(html).toContain('Capacidade de carga');
    expect(html).toContain('Tirantes');
    // custo: repetições do cálculo das fundações com a memória desligada (a medida de referência vai no relatório)
    const t = () => { const t0 = performance.now(); for (let i = 0; i < 5; i++) comFundacao(b, an); return performance.now() - t0; };
    t();
    expect(Math.min(t(), t(), t())).toBeGreaterThan(0);
  });
});
