// Memória detalhada (MD fase 5c): radier (casca sobre molas, Wood-Armer) e vigas de fundação de equilíbrio e travamento. As contas são
// refeitas a partir das `entradas` registradas e comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não
// muda o resultado (`toEqual`).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { comFundacao, dimensionarEdificio, woodArmer } from '../building/dimensionamento';
import { lbBasico } from '../building/detalhamento';
import { diagramaAlavanca, diagramaBiapoiada } from '../building/vigasFundacao';
import { edificioVazio } from '../building/types';
import { beamAsMin, beamFlexure, concrete } from '../concrete';
import { memoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import { Registrador, comMemoria, type PassoMemoria } from './registrador';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const igual = (a: number, b: number, msg = '') => expect(rel(a, b) < 1e-9 || Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`).toBe(true);
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const json = <T>(p: PassoMemoria, k: string) => JSON.parse(p.entradas[k] as string) as T;
const por = (ps: PassoMemoria[], topico: RegExp | string) => ps.filter((p) => (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico)));
const um = (ps: PassoMemoria[], topico: RegExp | string, desc: RegExp | string) => {
  const l = por(ps, topico).filter((p) => (typeof desc === 'string' ? p.descricao.startsWith(desc) : desc.test(p.descricao)));
  expect(l.length, `${String(topico)} · ${String(desc)}`).toBeGreaterThan(0);
  return l[0];
};

// ---------------------------------------------------------------------------------------------- radier
function radier() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  ok(s, 'lote', { comandos: [[1, 1], [7, 1], [7, 6], [1, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok(s, 'lote', { comandos: [[[1, 1], [7, 1]], [[1, 6], [7, 6]], [[1, 1], [1, 6]], [[7, 1], [7, 6]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
  ok(s, 'caso.criar', { nome: 'Piso', natureza: 'Q' });
  const caso = s.modelo.casos![0].id;
  ok(s, 'radier.criar', { contorno: [[0, 0], [8, 0], [8, 7], [0, 7]], h: 0.4, k: 40000, sigmaAdm: 300 });
  ok(s, 'carga.area', { grupo: 'fundacao', contorno: [[-1, -1], [9, -1], [9, 8], [-1, 8]], valor: 20, caso });
  for (const p of s.modelo.pilares) ok(s, 'carga.pilar', { pilar: p.id, caso: 'G', N: 400 + 50 * s.modelo.pilares.indexOf(p) });
  return s;
}

describe('MD5c · radier (casca sobre molas)', () => {
  const s = radier(), b = s.modelo, an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  const dim = dimensionarEdificio(b, an, { fundacao: false });
  const r = memoriaDetalhada(b, { an }), mem = r.memoria;
  const R = dim.radiers![0], det = dim.detalhesRadier![0];
  const ps = mem.passos.filter((p) => p.elemento === `Radier ${R.nome}`);

  it('a memória ligada não muda o dimensionamento do radier', () => {
    const lig = comMemoria(new Registrador(), () => dimensionarEdificio(b, an, { fundacao: false }));
    expect(lig.radiers).toEqual(dim.radiers);
    expect(lig.detalhesRadier).toEqual(dim.detalhesRadier);
    expect(lig.resumoAcoRadiers).toEqual(dim.resumoAcoRadiers);
    expect(r.dim.radiers).toEqual(dim.radiers);
    expect(ps.length).toBeGreaterThan(30);
  });

  it('tensões no solo: σ = −k·Σ f·uz refeita da decomposição por caso; recalque e razão σ/σadm', () => {
    for (const [desc, ref] of [['Tensão máxima', R.sigmaMax], ['Tensão mínima', R.sigmaMin]] as const) {
      const p = um(ps, 'Radier · tensões no solo', desc);
      const w = json<[string, number, number][]>(p, 'contrib').reduce((t, [, f, uz]) => t + f * uz, 0);
      igual(-num(p, 'k') * w, ref, desc); igual(p.resultado as number, ref, desc);
      expect(p.entradas.combinacao).toBe(desc === 'Tensão máxima' ? R.combMax : R.combMin);
    }
    const rc = um(ps, 'Radier · tensões no solo', 'Recalque máximo');
    igual(-json<[string, number, number][]>(rc, 'contrib').reduce((t, [, f, uz]) => t + f * uz, 0), R.recalque, 'recalque');
    const v = um(ps, 'Radier · tensões no solo', 'Verificação');
    igual(num(v, 'razao'), R.sigmaMax / 300, 'σ/σadm'); expect(R.sigmaAdm).toBe(300);
  });

  it('Wood-Armer por nó: mx, my e |mxy| somados dos casos, m* refeito e a envoltória igual a mPos/mNeg', () => {
    const ext = ps.filter((p) => /^Momento (positivo|negativo) máximo na direção/.test(p.descricao) && /^Momentos da grelha – ELU/.test(p.topico));
    expect(ext.length).toBeGreaterThan(0);
    const pos: [number, number] = [0, 0], neg: [number, number] = [0, 0];
    for (const e of ext) {
      const w = woodArmer(num(e, 'mx'), num(e, 'my'), num(e, 'mxy'));
      const dir = num(e, 'dir');
      igual(num(e, 'face') > 0 ? w.inf[dir] : w.sup[dir], e.resultado as number, e.descricao);
      if (num(e, 'face') > 0) pos[dir] = Math.max(pos[dir], e.resultado as number); else neg[dir] = Math.min(neg[dir], e.resultado as number);
      // mx = Σ γ·mx,k do mesmo nó
      const no = num(ps.find((q) => q.topico === e.topico && q.descricao.startsWith('Momento mx') && q.descricao.includes(`nó ${num(e, 'no')} `))!, 'no');
      expect(no).toBe(num(e, 'no'));
      const mxp = ps.find((q) => q.topico === e.topico && q.descricao.startsWith('Momento mx') && q.descricao.includes(`nó ${no} `))!;
      igual(Object.keys(mxp.entradas).filter((k) => k.startsWith('mxk_')).reduce((t, k) => t + num(mxp, k) * num(mxp, `γ_${k.slice(4)}`), 0), mxp.resultado as number, 'mx');
      igual(num(e, 'mx'), mxp.resultado as number, 'mx do extremo');
    }
    for (const k of [0, 1]) { igual(pos[k], R.mPos[k], `mPos${k}`); igual(neg[k], R.mNeg[k], `mNeg${k}`); }
  });

  it('flexão por face e direção: Md, As,flexão, As,mín e armadura necessária; armadura final; fissuração', () => {
    const dados = um(ps, 'Radier · dados', 'Resistências'), h = R.h;
    const c = concrete(num(dados, 'fcd') * 1.4, 1.4), fyd = num(dados, 'fyd'), d = num(dados, 'd'), cob = num(dados, 'cob');
    expect(d).toBeCloseTo(h - cob - 0.01, 12);
    for (const [face, nome, M, ref] of [['pos', 'inferior (positiva)', R.mPos, R.As.pos], ['neg', 'superior (negativa)', R.mNeg, R.As.neg]] as const) for (const k of [0, 1]) {
      const T = `Flexão – face ${nome}, direção ${k}`;
      igual(um(ps, T, 'Momento de dimensionamento').resultado as number, M[k], `Md ${face}${k}`);
      const nec = um(ps, T, 'Armadura necessária');
      const Asf = M[k] ? beamFlexure({ kind: 'rect', bw: 1, h }, false, Math.abs(M[k]), d, cob + 0.01, c, fyd).As : 0;
      igual(num(nec, 'AsFlexao'), Asf, 'As flexão'); igual(num(nec, 'amin'), 0.0015 * h, 'As,mín');
      igual(Math.max(num(nec, 'amin'), Asf) * 1e4, nec.resultado as number, 'As necessária');
      // armadura final = necessária × 1,1^n da fissuração
      const fiss = ps.filter((p) => p.topico === `Fissuração – armadura ${face === 'pos' ? 'positiva' : 'negativa'}, direção ${k}`);
      const aum = fiss.find((p) => p.descricao.startsWith('Aumento da armadura'));
      const final = aum ? num(aum, 'As0') * num(aum, 'fator') ** num(aum, 'passos') : (nec.resultado as number);
      igual(final, ref[k], `As final ${face}${k}`);
      if (aum) igual(num(aum, 'As0'), nec.resultado as number, 'As0 = necessária');
    }
    const fin = um(ps, 'Radier · armadura final', 'Armadura por metro');
    igual(num(fin, 'inf0'), R.As.pos[0]); igual(num(fin, 'inf1'), R.As.pos[1]); igual(num(fin, 'sup0'), R.As.neg[0]); igual(num(fin, 'sup1'), R.As.neg[1]);
    const wks = ps.filter((p) => /^Fissuração/.test(p.topico) && p.descricao.startsWith('Abertura característica')).map((p) => p.resultado as number);
    expect(wks.length).toBeGreaterThan(0);
    igual(Math.max(...wks), R.wk, 'wk'); igual(num(um(ps, 'Fissuração – resumo', 'Maior abertura'), 'wkLim'), R.wkLim);
  });

  it('barras adotadas, quantitativos e referência à punção', () => {
    for (const k of [0, 1]) {
      const pos = um(ps, `Barras – armadura positiva, direção ${k}`, 'Barras adotadas');
      igual(num(pos, 'phi'), det.positivas[k].phi); igual(num(pos, 's'), det.positivas[k].s); expect(Math.abs(num(pos, 'As') * 1e4 - det.positivas[k].AsNec)).toBeLessThan(5e-4); // o detalhe arredonda a 3 casas
      igual(num(pos, 'As') * 1e4, R.As.pos[k], 'As nec = armadura final');
      expect(um(ps, `Barras – armadura negativa, direção ${k}`, 'Barras adotadas').entradas.cabe).toBeDefined();
    }
    const q = um(ps, 'Radier · quantitativos', 'Volume');
    igual(num(q, 'peso'), det.peso, 'peso'); igual(num(q, 'volume'), num(q, 'area') * R.h, 'volume'); igual(num(q, 'area'), R.area, 'área');
    const pu = um(ps, 'Radier · punção', 'Punção e cortante');
    expect(R.puncao?.length).toBe(4);
    for (const x of R.puncao!) {
      expect(pu.descricao).toContain(`Punção ${x.nome} · Radier ${R.nome}`);
      expect(mem.elementos).toContain(`Punção ${x.nome} · Radier ${R.nome}`);
    }
  });

  it('filtro por elemento e HTML', () => {
    const so = memoriaDetalhada(b, { an, elementos: [`Radier ${R.nome}`] }).memoria;
    expect(so.elementos.filter((e) => e !== 'Edifício')).toEqual([`Radier ${R.nome}`]);
    const html = htmlMemoriaCorpo(so);
    expect(html).toContain('Wood-Armer'); expect(html).toContain('Radier · tensões no solo');
  });
});

// ---------------------------------------------------------------------------------------------- vigas de fundação
function obra(opcoes?: Record<string, number>, forma?: Record<string, unknown>) {
  const s = new Sessao(edificioVazio());
  ok(s, 'pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
  ok(s, 'pilar.inserir', { x: 5, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
  const [P1, P2] = s.modelo.pilares;
  ok(s, 'pilar.editar', { id: P1.id, ajuste: 'o' });
  ok(s, 'carga.pilar', { pilar: P1.id, caso: 'G', N: 600 });
  ok(s, 'carga.pilar', { pilar: P1.id, caso: 'Q', N: 150 });
  ok(s, 'carga.pilar', { pilar: P2.id, caso: 'G', N: 800 });
  ok(s, 'fundacao.terreno', { sigmaAdm: 200, cotaTerreno: 0, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
  ok(s, 'fundacao.criar', { pilar: P1.id, tipo: 'sapata', posicao: 'divisa', cota: -1.5 });
  ok(s, 'fundacao.criar', { pilar: P2.id, tipo: 'sapata', cota: -1.5 });
  const [S1, S2] = s.modelo.fundacao!.elementos;
  if (opcoes) ok(s, 'opcoes.definir', { valores: opcoes });
  ok(s, 'vigaFundacao.criar', { tipo: 'equilibrio', ini: S1.id, fim: S2.id, ...(forma ? { forma } : {}) });
  return { s, S1, S2, P1, P2 };
}

function conferirViga(s: Sessao) {
  const b = s.modelo, an = analisarEdificio(b);
  const desligada = comFundacao(b, an);
  const m = memoriaDetalhada(b, { an }).memoria;
  const ligada = comMemoria(new Registrador(), () => comFundacao(b, an));
  expect(ligada).toEqual(desligada);
  const v = desligada.vigasFundacao![0];
  const ps = m.passos.filter((p) => p.elemento === `Viga de fundação ${v.nome}`);
  expect(ps.length).toBeGreaterThan(20);
  return { b, v, ps, m };
}

describe('MD5c · vigas de fundação', () => {
  it('equilíbrio: alavanca + biapoiada no ponto governante refeitos das entradas; flexão, As,mín, cortante, ancoragem e quantitativos', () => {
    const { v, ps } = conferirViga(obra().s);
    const dados = um(ps, 'Viga de fundação · dados', 'Resistências');
    const c = concrete(30, 1.4), fyd = num(dados, 'fyd'), cob = num(dados, 'cob'), gf = num(dados, 'gf');
    igual(num(dados, 'fcd'), c.fcd);
    // esforços característicos no ponto governante
    const L = num(um(ps, 'Viga de fundação · dados', 'Viga'), 'L'); igual(L, v.L, 'L');
    for (const [desc, ref, tipo] of [['Momento que traciona a face superior', v.Mk.sup, 1], ['Momento que traciona a face inferior', v.Mk.inf, -1], ['Cortante', v.Vk, 0]] as const) {
      const p = um(ps, 'Viga de fundação · esforços característicos', desc);
      const x = num(p, 'x'), al = json<[string, number, number, number, number][]>(p, 'alavancas');
      const dg = al.map(([ponta, dN, ei, a, l]) => diagramaAlavanca(dN, l, ei, a, [ponta === 'ini' ? x : L - x]));
      const npp = num(p, 'npp'), cs = Array.from({ length: npp }, (_, k) => ({ s: ((k + 0.5) * L) / npp, P: num(p, 'ppP') })).concat(json<[string, number, number][]>(p, 'ext').map(([, s0, P]) => ({ s: s0, P })));
      const bi = diagramaBiapoiada(L, cs, [x]);
      if (tipo === 0) {
        const Vl = dg.reduce((t, q) => t + Math.abs(q.V[0]), 0);
        igual(Vl, num(p, 'Valav'), 'Valav'); igual(bi.V[0], num(p, 'Vbi'), 'Vbi');
        igual(Vl + Math.abs(bi.V[0]) + num(p, 'Vtr'), ref, 'Vk');
      } else {
        const Ml = dg.reduce((t, q) => t + q.M[0], 0);
        igual(Ml, num(p, 'Malav'), 'Malav'); igual(bi.M[0], num(p, 'Mbi'), 'Mbi');
        const val = tipo === 1 ? Math.max(0, Ml) + Math.max(0, -bi.M[0]) + num(p, 'Mtr') : Math.max(0, -Ml) + Math.max(0, bi.M[0]) + num(p, 'Mtr');
        igual(val, ref, desc);
      }
      igual(p.resultado as number, ref, desc);
    }
    const ec = um(ps, 'Viga de fundação · esforços de cálculo', 'Esforços');
    igual(gf * v.Mk.sup, v.Md.sup); igual(num(ec, 'MdSup'), v.Md.sup); igual(num(ec, 'MdInf'), v.Md.inf); igual(num(ec, 'Vd'), v.Vd);
    // seção e flexão
    const sec = um(ps, 'Viga de fundação · seção', 'Seção'), d = num(sec, 'd');
    igual(num(sec, 'bw'), v.bAdot); igual(num(sec, 'h'), v.hAdot); igual(d, v.hAdot - cob - 0.013, 'd');
    expect(num(sec, 'tentativas')).toBeGreaterThanOrEqual(1);
    const rect = { kind: 'rect' as const, bw: v.bAdot, h: v.hAdot };
    for (const [tp, M, arm, outra] of [['superior', v.Md.sup, v.armadura.sup, v.Md.inf], ['inferior', v.Md.inf, v.armadura.inf, v.Md.sup]] as const) {
      const T = `Viga de fundação · flexão ${tp}`, ar = um(ps, T, 'Armadura da face');
      const f = beamFlexure(rect, false, M, d, cob + 0.013, c, fyd), o = beamFlexure(rect, false, outra, d, cob + 0.013, c, fyd);
      igual(num(ar, 'AsFlex'), f.As); igual(num(ar, 'As2Outra'), o.As2);
      const mn = beamAsMin(rect, false, d, c, fyd);
      igual(num(um(ps, T, 'Armadura mínima'), 'AsMin'), mn, 'AsMin'); igual(arm.AsMin, mn);
      igual(Math.max(f.As + o.As2, mn), num(ar, 'As'), 'As'); igual(num(ar, 'As'), arm.As, 'As = resultado');
    }
    // cortante
    const ct = um(ps, 'Viga de fundação · cortante', 'Resistência da biela');
    igual(0.27 * num(ct, 'av2') * num(ct, 'fcd') * num(ct, 'bw') * num(ct, 'd') * 1000, v.armadura.VRd2, 'VRd2'); igual(num(ct, 'VRd2'), v.armadura.VRd2);
    const at = um(ps, 'Viga de fundação · cortante', 'Armadura transversal');
    igual(Math.max(((0.2 * num(at, 'fctm')) / num(at, 'fywk')) * num(at, 'bw'), Math.max(0, num(at, 'Vd') / 1000 - num(at, 'Vc') / 1000) / (0.9 * num(at, 'd') * num(at, 'fywd'))), v.armadura.aswS, 'Asw/s');
    expect(num(at, 'phi')).toBe(v.armadura.estribo!.phi); igual(num(at, 's'), v.armadura.estribo!.s);
    // ancoragem e quantitativos
    const an2 = um(ps, 'Viga de fundação · pele e ancoragem', 'Ancoragem');
    igual(lbBasico(num(an2, 'phi'), c, fyd, num(an2, 'boa') === 1), v.armadura.lb, 'lb'); igual(num(an2, 'lb'), v.armadura.lb);
    const q = um(ps, 'Viga de fundação · quantitativos', 'Volume');
    igual(num(q, 'V'), v.volume); igual(num(q, 'aco'), v.aco);
    expect(v.equilibrio.ini).toBe(true);
    igual(num(um(ps, 'Viga de fundação · alívio e travamento', 'Alívio'), 'fim'), v.alivio.fim, 'alívio');
    expect(por(ps, 'Viga de fundação · alavanca').length).toBe(2);
  });

  it('com cortes da armadura principal (R8b) e seção T: cortes registrados iguais ao resultado', () => {
    const { v, ps } = conferirViga(obra({ vigaFundCortes: 1 }, { tipo: 'T', bf: 0.9, hf: 0.18 }).s);
    expect(v.forma?.tipo).toBe('T');
    const sec = um(ps, 'Viga de fundação · seção', 'Seção');
    expect(sec.descricao).toMatch(/forma/);
    expect(v.armadura.cortes).toBeDefined();
    for (const f of [v.armadura.cortes!.inf, v.armadura.cortes!.sup]) {
      const p = um(ps, `Viga de fundação · cortes da armadura ${f.face === 'inf' ? 'inferior' : 'superior'}`, 'Face');
      igual(num(p, 'total'), f.comprimentoTotal); igual(num(p, 'semCortes'), f.comprimentoSemCortes);
      igual(f.passantes * num(p, 'ell') + json<number[][]>(p, 'grupos').reduce((t, [n, , , cmp]) => t + n * cmp, 0), f.comprimentoTotal, 'total refeito');
    }
    expect(por(ps, /pele e ancoragem/).length).toBeGreaterThan(0);
  });

  it('travamento de bloco de 1 estaca: Mtrav = Nk·e/100/nb refeito e somado no diagrama', () => {
    const s = new Sessao(edificioVazio());
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
    ok(s, 'pilar.inserir', { x: 4, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
    ok(s, 'pilar.inserir', { x: 0, y: 4, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: 'fundacao', morre: 'fundacao' });
    const [P1, P2, P3] = s.modelo.pilares;
    for (const p of [P1, P2, P3]) ok(s, 'carga.pilar', { pilar: p.id, caso: 'G', N: 300 });
    ok(s, 'fundacao.terreno', { sigmaAdm: 200, cotaTerreno: 0, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
    ok(s, 'fundacao.criar', { pilar: P1.id, tipo: 'bloco', cota: -1.5 });
    const B1 = s.modelo.fundacao!.elementos[0];
    ok(s, 'vigaFundacao.criar', { tipo: 'travamento', ini: B1.id, fim: P2.id });
    ok(s, 'vigaFundacao.criar', { tipo: 'travamento', ini: B1.id, fim: P3.id });
    const b = s.modelo, an = analisarEdificio(b), m = memoriaDetalhada(b, { an }).memoria, d = comFundacao(b, an);
    const v = d.vigasFundacao![0], ps = m.passos.filter((p) => p.elemento === `Viga de fundação ${v.nome}`);
    const t = um(ps, 'Viga de fundação · alívio e travamento', 'Momento de travamento');
    igual((num(t, 'Nk') * num(t, 'exc')) / 100 / num(t, 'nb'), t.resultado as number, 'Mtrav');
    igual(t.resultado as number, v.travamento.ini, 'travamento ini');
    const tr = um(ps, 'Viga de fundação · alívio e travamento', 'Momento e cortante');
    igual(Math.max(num(tr, 'ini'), num(tr, 'fim')), num(tr, 'Mtr')); igual((num(tr, 'ini') + num(tr, 'fim')) / v.L, num(tr, 'Vtr'));
    expect(por(ps, 'Viga de fundação · alavanca').length).toBe(0);
  });
});

describe('MD5c · custo com a memória desligada', () => {
  it('repetições do radier e das vigas de fundação sem memória (a medida de referência vai no relatório)', { timeout: 120000 }, () => {
    const s = radier(), b = s.modelo, an = analisarEdificio(b);
    const o = obra().s, bo = o.modelo, ao = analisarEdificio(bo);
    const t = (f: () => void) => { const t0 = performance.now(); for (let i = 0; i < 2; i++) f(); return performance.now() - t0; };
    const rad = () => dimensionarEdificio(b, an, { fundacao: false }), vig = () => comFundacao(bo, ao);
    t(rad); t(vig);
    const tr = Math.min(t(rad), t(rad), t(rad)), tv = Math.min(t(vig), t(vig), t(vig));
    const lig = (f: () => void) => t(() => comMemoria(new Registrador(), f));
    const trl = Math.min(lig(rad), lig(rad)), tvl = Math.min(lig(vig), lig(vig));
    console.log(`custo 2 repetições: radier desligada ${tr.toFixed(0)} ms, ligada ${trl.toFixed(0)} ms; vigas desligada ${tv.toFixed(1)} ms, ligada ${tvl.toFixed(1)} ms`);
    expect(tr).toBeGreaterThan(0); expect(tv).toBeGreaterThan(0);
  });
});
