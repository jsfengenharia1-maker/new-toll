// E5i (C6.108): desenho dos consolos na prancha de pilares — barras detalhadas (tirante, costura e estribos verticais), vistas frontal e
// lateral (posições, cotas, quantidades), aço da prancha somado ao resumo dos pilares e quadro de pilares com as condições de estribos.
import { beforeAll, describe, expect, it } from 'vitest';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { estriboComprimento, ganchoNoventa } from '../building/detalhamento';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { acoDe, cobrimentoPilar } from '../building/materiais';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { cmInt, pesoLinear, Posicoes } from './armacao';
import { blocoConsolo, detalharConsolo } from './armacaoConsolos';
import { linhasQuadroPilares, montarPranchasPilares } from './armacaoPilares';
import type { Prancha, Prim } from './prancha';

let s: Sessao, an: AnaliseEdificio, dim: Dimensionamento;

beforeAll(() => {
  s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  ok('lote', { comandos: [[0, 0], [6, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.5 } });
  ok('consolo.criar', { viga: s.modelo.vigas[0].id, ponta: 'ini', pilar: s.modelo.pilares[0].id, a: 0.2 });
  const c = s.modelo.consolos![0];
  // consolo 30 × 50 cm, ponta 25 cm, a = 30 cm, projeção 50 cm, armadura fixada: tirante 4 φ16, costura 3 φ8, estribos verticais φ6,3 c/15
  ok('consolo.editar', { id: c.id, b: 0.3, h: 0.5, hp: 0.25, a: 0.3, c: 0.5, armadura: { tirante: { n: 4, phi: 16 }, horizontais: { n: 3, phi: 8 }, verticais: { phi: 6.3, s: 0.15 } } });
  an = analisarEdificio(s.modelo);
  dim = dimensionarEdificio(s.modelo, an);
}, 240000);

const textos = (ps: Prim[]) => ps.flatMap((q) => (q.t === 'txt' ? [q.s] : []));
const linhas = (ps: Prim[]) => ps.filter((q): q is Extract<Prim, { t: 'pl' }> => q.t === 'pl' && q.c === 'ARMADURA' && q.pts.length === 2);

describe('detalharConsolo', () => {
  it('quantidades e comprimentos das barras (tirante com laço, costura e estribos verticais) contra o cálculo manual', () => {
    const c = s.modelo.consolos![0], r = dim.consolos![0], d = detalharConsolo(s.modelo, c, r);
    const cob = cobrimentoPilar(s.modelo);
    expect(cob).toBeCloseTo(0.03, 9);
    expect(r.arranjo.tirante).toEqual({ n: 4, phi: 16 });
    // tirante: lb + c − cob + gancho a 90° (φ16: D = 5φ → gancho = 8φ + π(D+φ)/4 − (D/2+φ) = 0,147398 m)
    expect(ganchoNoventa(16)).toBeCloseTo(0.147398, 5);
    expect(d.tirante).toMatchObject({ n: 4, phi: 16 });
    expect(d.tirante.C).toBeCloseTo(r.ancoragem.lb + 0.5 - 0.03 + 0.147398, 5);
    // costura: estribo fechado (50 − 6) × (30 − 6) cm com ganchos de 135°
    expect(d.horizontais).toMatchObject({ n: 3, phi: 8 });
    expect(d.horizontais.C).toBeCloseTo(2 * 0.44 + 2 * 0.24 + (estriboComprimento(0.44, 0.24, 8, 135) - 1.36), 9);
    expect(d.horizontais.C).toBeGreaterThan(1.4);
    expect(d.horizontais.C).toBeLessThan(1.7);
    // verticais: ceil((50 − 6)/15) + 1 = 4 estribos de (30 − 6) × (altura média 37,5 − 6) cm
    expect(d.verticais).toMatchObject({ n: 4, phi: 6.3, s: 0.15 });
    expect(d.verticais.C).toBeCloseTo(estriboComprimento(0.24, 0.315, 6.3, 135), 9);
  });
});

describe('blocoConsolo: vistas frontal e lateral', () => {
  const desenho = () => {
    const c = s.modelo.consolos![0], r = dim.consolos![0], reg = new Posicoes();
    return { prims: blocoConsolo(s.modelo, c, r, (k, a, p, cc, q) => reg.pos(k, a, p, cc, q)), reg, c, r };
  };
  it('textos: título, escala, tirante, costura, estribos, aparelho e cotas em cm', () => {
    const { prims, c, r } = desenho(), t = textos(prims), d = detalharConsolo(s.modelo, c, r);
    expect(t).toContain('Consolo C1');
    expect(t.some((x) => x.startsWith('ESC 1:25 · pilar P1 · apoia a viga V1 (ponta inicial)'))).toBe(true);
    expect(t).toContain('VISTA LATERAL');
    expect(t).toContain('aparelho');
    expect(t).toContain(`4 N1 φ16,0 C=${cmInt(d.tirante.C)}`);
    expect(t).toContain(`3 N2 φ8,0 C=${cmInt(d.horizontais.C)}`);
    expect(t).toContain(`4 N3 φ6,3 c/15 C=${cmInt(d.verticais.C)}`);
    // cotas da frente: a = 30, c − a = 20, h = 50, hp = 25; lateral: b = 30, h = 50
    for (const x of ['30', '20', '50', '25']) expect(t).toContain(x);
    expect(t.filter((x) => x === '30').length).toBeGreaterThanOrEqual(2); // a e b
    expect(t.filter((x) => x === '50').length).toBeGreaterThanOrEqual(2); // h na frente e na lateral
    expect(t.some((x) => /^aparelho \d+(,\d)? × \d+(,\d)? · Vd .* kN · Hd .* kN$/.test(x))).toBe(true);
  });
  it('geometria da vista frontal: pilar de 30 cm, consolo de 50 × 50 cm afunilando para 25 cm (1:25, 40 mm por m)', () => {
    const { prims } = desenho(), k = 40, x0 = 0.3 * k, y0 = 6;
    const perfil = prims.find((q) => q.t === 'pl' && q.c === 'CONCRETO' && q.pts.length === 5);
    expect(perfil && perfil.t === 'pl' ? perfil.pts : null).toEqual([[x0, y0], [x0 + 0.5 * k, y0 + 0.25 * k], [x0 + 0.5 * k, y0 + 0.5 * k], [x0, y0 + 0.5 * k], [x0, y0]]);
    // faces do pilar: x = 0 e x = x0, interrompidas 4 mm abaixo e 6 mm acima do consolo
    const faces = prims.filter((q) => q.t === 'pl' && q.c === 'CONCRETO' && q.pts.length === 2);
    expect(faces.map((q) => (q.t === 'pl' ? q.pts : [])).filter((p) => p[0][0] === 0 || p[0][0] === x0)).toEqual([[[0, y0 - 4], [0, y0 + 0.5 * k + 6]], [[x0, y0 - 4], [x0, y0 + 0.5 * k + 6]]]);
  });
  it('armadura na frente: 4 estribos verticais espaçados (50 − 6 cm entre cobrimentos) e 3 linhas de costura em 2/3 de d', () => {
    const { prims, r } = desenho(), k = 40, x0 = 0.3 * k, cob = 0.03 * k;
    const ls = linhas(prims);
    const verticais = ls.filter((q) => q.pts[0][0] === q.pts[1][0]);
    expect(verticais).toHaveLength(4);
    const xs = verticais.map((q) => q.pts[0][0]);
    const passo = (0.5 * k - 2 * cob) / 3;
    xs.forEach((x, i) => expect(x).toBeCloseTo(x0 + cob + i * passo, 9));
    // topo dos verticais a cob da face superior; pé acompanha a face inclinada
    for (const q of verticais) expect(q.pts[1][1]).toBeCloseTo(6 + 0.5 * k - cob, 9);
    const horiz = ls.filter((q) => q.pts[0][1] === q.pts[1][1]);
    expect(horiz).toHaveLength(3); // só a costura: o tirante é uma polilinha de 3 pontos
    const costura = horiz.filter((q) => q.pts[0][0] === x0 + cob);
    expect(costura).toHaveLength(3);
    // espaçadas de (2/3·d)/3 em unidades do desenho
    const ys = costura.map((q) => q.pts[0][1]).sort((a, z) => z - a);
    expect(ys[0] - ys[1]).toBeCloseTo(((2 / 3) * r.d * k) / 3, 9);
    expect(ys[1] - ys[2]).toBeCloseTo(((2 / 3) * r.d * k) / 3, 9);
  });
  it('tirante: do interior do pilar (lb) até a ponta, com o laço descendo 8φ; 4 barras na seção lateral', () => {
    const { prims, r } = desenho(), k = 40, x0 = 0.3 * k, cob = 0.03 * k;
    const tir = prims.find((q) => q.t === 'pl' && q.c === 'ARMADURA' && q.pts.length === 3);
    expect(tir).toBeDefined();
    if (!tir || tir.t !== 'pl') return;
    expect(tir.pts[0][0]).toBeCloseTo(x0 - r.ancoragem.lb * k, 9);
    expect(tir.pts[1][0]).toBeCloseTo(x0 + 0.5 * k - cob, 9);
    expect(tir.pts[2][0]).toBeCloseTo(tir.pts[1][0], 9);
    expect(tir.pts[1][1] - tir.pts[2][1]).toBeCloseTo(8 * 0.016 * k, 9);
    // cota do tirante a cob + estribo (6,3 mm) + φ/2 da face superior
    expect(tir.pts[0][1]).toBeCloseTo(6 + 0.5 * k - (0.03 + 0.0063 + 0.008) * k, 9);
    // lateral: 4 pontos (hachuras) de tirante na altura do tirante, simétricos em x
    const pts = prims.filter((q) => q.t === 'hach' && q.c === 'ARMADURA' && q.pts.length === 12);
    expect(pts).toHaveLength(4);
    const cxs = pts.map((q) => (q.t === 'hach' ? q.pts.reduce((m, p) => m + p[0], 0) / 12 : 0));
    const xs = 0.3 * k + 0.5 * k + 24, W = 0.3 * k, al = (0.03 + 0.0063 + 0.008) * k;
    cxs.forEach((x, i) => expect(x).toBeCloseTo(xs + al + ((W - 2 * al) * i) / 3, 6));
  });
  it('tabela de posições do bloco: tirante, costura e verticais com as quantidades e comprimentos em cm', () => {
    const { reg, c, r } = desenho(), d = detalharConsolo(s.modelo, c, r);
    const acoL = acoDe(s.modelo, 'pilarLong').aco, acoE = acoDe(s.modelo, 'pilarEstribo').aco;
    expect(reg.tabela).toEqual([
      { pos: 'N1', aco: acoL, phi: 16, quant: 4, cUnit: cmInt(d.tirante.C), cTotal: (4 * cmInt(d.tirante.C)) / 100 },
      { pos: 'N2', aco: acoE, phi: 8, quant: 3, cUnit: cmInt(d.horizontais.C), cTotal: (3 * cmInt(d.horizontais.C)) / 100 },
      { pos: 'N3', aco: acoE, phi: 6.3, quant: 4, cUnit: cmInt(d.verticais.C), cTotal: (4 * cmInt(d.verticais.C)) / 100 },
    ]);
  });
});

describe('prancha de pilares com consolo', () => {
  let prs: Prancha[];
  beforeAll(() => { prs = montarPranchasPilares(s.modelo, an, dim); });
  it('o consolo é um elemento da prancha e o aço da prancha = resumo dos pilares + aço do consolo', () => {
    const arm = prs.filter((p) => p.aco);
    expect(arm.flatMap((p) => p.elementos ?? [])).toContain('Consolo C1');
    const c = s.modelo.consolos![0], r = dim.consolos![0], d = detalharConsolo(s.modelo, c, r);
    const barras: [number, number, number][] = [[d.tirante.n, d.tirante.phi, cmInt(d.tirante.C)], [d.horizontais.n, d.horizontais.phi, cmInt(d.horizontais.C)], [d.verticais.n, d.verticais.phi, cmInt(d.verticais.C)]];
    const pesoConsolo = barras.reduce((t, [n, phi, cc]) => t + (n * cc * pesoLinear(phi)) / 100, 0);
    expect(pesoConsolo).toBeGreaterThan(5);
    const pesoPilares = dim.resumoAcoPilares!.reduce((t, x) => t + x.peso, 0);
    expect(arm.reduce((t, p) => t + p.aco!.peso, 0)).toBeCloseTo(pesoPilares + pesoConsolo, 6);
    // as três posições do consolo estão na tabela de aço com as quantidades somadas às dos pilares quando iguais
    const tab = arm.flatMap((p) => p.aco!.tabela);
    for (const [n, phi, cc] of barras) expect(tab.some((l) => l.phi === phi && l.cUnit === cc && l.quant >= n)).toBe(true);
  });
  it('quadro de pilares: linha do consolo com tirante, estribos verticais e costura', () => {
    const q = linhasQuadroPilares(dim, s.modelo).find((l) => l[0] === 'Consolo C1');
    expect(q).toEqual(['Consolo C1', 'pilar P1', '30 × 50', '4 φ16,0 (tirante)', 'φ6,3 c/15 (vert.)', '3 φ8,0 (costura)']);
  });
});
