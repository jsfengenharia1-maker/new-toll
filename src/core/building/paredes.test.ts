// E1c: paredes de concreto (modelo, aberturas, empuxo aplicado, diafragma, comandos) contra soluções conhecidas.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { analisarEdificio, torcaoRet } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { panosDoGrupo } from './lajes';
import { opcoesEmUso } from './opcoes';
import { cotasDaGrade, geometriaParedes, malhaDaGrade, todosPilares } from './pilarParede';
import { forcasPressaoT6, incluirParedes } from './pilarParedeModelo';
import { furosDaParede, ppDaObra, pressoesDaParede } from './paredesBase';
import type { BuildingModel } from './types';
import { verificar } from './verify';
import { estabilidadeMuro } from './muroArrimo';

function padrao(prof = 1): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: prof });
  // só Térreo (0) e Tipo 1 (+3): o grupo Tipo fica com um pavimento só
  for (const n of ['Cobertura', 'Tipo 3', 'Tipo 2']) s.executar('pavimento.remover', { id: s.modelo.pavimentos.find((p) => p.nome === n)!.id });
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const nomePav = (b: BuildingModel, nome: string) => b.pavimentos.find((p) => p.nome === nome)!.id;

/** Obra com um tipo de empuxo de repouso (γ 18, φ 30°: K0 = 0,5) com aterro na cota +3 e o caso H dele. */
function comEmpuxo(s: Sessao) {
  ok(s, 'empuxo.tipo', { nome: 'Aterro', metodo: 'repouso', estratos: [{ espessura: 20, gama: 18, phi: 30 }], cotaAterro: 3 });
  ok(s, 'caso.criar', { nome: 'Empuxo', natureza: 'H', empuxo: s.modelo.empuxos![0].id });
  return s.modelo.casos!.find((c) => c.nome === 'Empuxo')!.id;
}

describe('paredes: geometria, aberturas e pressões', () => {
  it('parede vira pilar-parede virtual com um lado por trecho; aberturas no plano (s, z) do trecho', () => {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 1'), terreo = nomePav(s.modelo, 'Térreo');
    ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0], [6, 4]], espessura: 0.2, morre: t1 });
    const w = s.modelo.paredes![0];
    expect(w.nome).toBe('M1');
    // porta no 1º trecho (lance fundação → Térreo, H = 1 m: não cabe) e janela no 2º trecho, no lance Térreo → Tipo 1
    expect(s.executar('parede.abertura', { parede: w.id, s: 1, largura: 0.9, altura: 2.1 }).ok).toBe(false);
    ok(s, 'parede.abertura', { parede: w.id, s: 7, largura: 1.5, peitoril: 1, altura: 1.2, pavimento: terreo });
    expect(s.executar('parede.abertura', { parede: w.id, s: 5.5, largura: 1, altura: 1, pavimento: terreo }).ok).toBe(false); // atravessa o vértice
    const f = furosDaParede(s.modelo, s.modelo.paredes![0]);
    expect(f.ruins).toEqual([]);
    expect(f.porTrecho[0]).toEqual([]);
    expect(f.porTrecho[1][0]).toMatchObject({ s0: 1, s1: 2.5, z0: 1, z1: 2.2 });
    const pp = ppDaObra(s.modelo);
    expect(pp.map((p) => p.id)).toEqual([w.id]);
    expect(todosPilares(s.modelo).length).toBe(2); // os dois trechos como pilares virtuais (regras de apoio das vigas)
  });

  it('cotas obrigatórias na grade e células removidas nos furos', () => {
    expect(cotasDaGrade([0, 3], 1, [1.2, 2.5]).Z).toEqual([0, 0.6, 1.2, 1.85, 2.5, 3].map((z) => expect.closeTo(z, 9)));
    expect(cotasDaGrade([0, 3], 1).Z).toEqual([0, 1, 2, 3]); // sem extras: igual à grade da E1b
    const m = malhaDaGrade([0, 1, 2, 3], [0, 1, 2], [{ s0: 1, s1: 2, z0: 0, z1: 1 }]);
    expect(m.tris.length).toBe(10); // 6 células − 1 furo = 5 células × 2 triângulos
  });

  it('pressão do empuxo de terra (K0) e de líquido por cota', () => {
    const s = padrao();
    const caso = comEmpuxo(s), t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: t1 });
    ok(s, 'parede.empuxo', { parede: s.modelo.paredes![0].id, empuxos: [{ caso, lado: 'esq', cotaTerreno: 2 }, { caso: 'Q', lado: 'dir', liquido: { cota: 1, gama: 10 } }] });
    const [terra, agua] = pressoesDaParede(s.modelo, s.modelo.paredes![0], -1, 3);
    expect(terra.sinal).toBe(-1);
    expect(terra.p(3)).toBe(0);
    expect(terra.p(0)).toBeCloseTo(0.5 * 18 * 2, 9); // K0·γ·(2 − 0)
    expect(terra.resultante).toBeCloseTo(0.5 * 0.5 * 18 * 3 * 3, 6); // K0·γ·h²/2 com h = 3 m
    expect(agua.sinal).toBe(1);
    expect(agua.p(-1)).toBeCloseTo(20, 9);
    expect(agua.resultante).toBeCloseTo(0.5 * 10 * 2 * 2, 9);
    expect(agua.cortes).toEqual([1]);
  });

  it('forças consistentes do T6 somam a resultante da pressão linear', () => {
    const f = forcasPressaoT6([[0, 0], [2, 0], [0, 3]], (z) => 10 * (3 - z));
    // ∫ p dA no triângulo = área × p(centroide) para p linear = 3 × 10 × 2
    expect(f.reduce((a, c) => a + c, 0)).toBeCloseTo(60, 9);
  });
});

describe('paredes: validação contra soluções analíticas', () => {
  it('muro em balanço sob empuxo triangular: flecha da faixa central e equilíbrio global', () => {
    const s = padrao(1); // base em −1, topo no Tipo 1 (+3): H = 4 m
    const caso = comEmpuxo(s), t1 = nomePav(s.modelo, 'Tipo 1');
    const L = 12, t = 0.2;
    ok(s, 'parede.criar', { pontos: [[0, 0], [L, 0]], espessura: t, morre: t1 });
    ok(s, 'parede.empuxo', { parede: s.modelo.paredes![0].id, empuxos: [{ caso, lado: 'esq' }] });
    const b = s.modelo, op = { ...opcoesEmUso(b.opcoes), malhaCasca: 0.5 };
    const geo = geometriaParedes(b, op)!;
    const E = 25e6, nu = 0.2, casos: Caso3[] = [{ nodais: [], distribuidas: [] }];
    const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() };
    const r0 = incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => E, Ev: E, Gv: E / 2.4, nu, gama: 0, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: () => {}, etiqueta: () => {}, hViga: 0.25, iG: 0, caso: (id) => (id === caso ? 0 : -1) });
    const H = 4, q0 = 0.5 * 18 * H, R = (q0 * H) / 2;
    // resultante aplicada: −y (terreno à esquerda do eixo +x, isto é, em +y)
    expect(r0.empuxo[0].F[1]).toBeCloseTo(-R * L, 6);
    const r = resolver3(pm, casos);
    expect(r.erro).toBeUndefined();
    // equilíbrio: Σ Ry = R·L; momento das reações em torno da linha da base = R·L·H/3
    let Ry = 0, Mx = 0;
    for (const [, rr] of r.reacoes[0]) { Ry += rr[1]; Mx += rr[3]; }
    expect(Ry).toBeCloseTo(R * L, 3);
    expect(Math.abs(Mx) / ((R * L * H) / 3)).toBeCloseTo(1, 2);
    // flecha no topo, no meio do muro: faixa em flexão cilíndrica, δ = q0·H⁴/(30·D), D = E·t³/(12(1 − ν²))
    const D = (E * t ** 3) / (12 * (1 - nu * nu)), ref = (q0 * H ** 4) / (30 * D);
    const meio = pm.nos.findIndex((p) => Math.abs(p[0] - L / 2) < 1e-6 && Math.abs(p[2] - 3) < 1e-9);
    const uy = r.desloc[0][meio * 6 + 1];
    expect(uy).toBeLessThan(0);
    expect(Math.abs(-uy / ref - 1)).toBeLessThan(0.03);
  });

  it('parede com abertura: sem nós soltos, peso descontado e mesma resultante de empuxo fora do vão', () => {
    const s = padrao(1);
    const caso = comEmpuxo(s), t1 = nomePav(s.modelo, 'Tipo 1'), terreo = nomePav(s.modelo, 'Térreo');
    ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: t1 });
    const id = s.modelo.paredes![0].id;
    ok(s, 'parede.abertura', { parede: id, s: 2, largura: 2, peitoril: 0.5, altura: 2, pavimento: terreo });
    ok(s, 'parede.empuxo', { parede: id, empuxos: [{ caso, lado: 'dir' }] });
    const b = s.modelo, op = opcoesEmUso(b.opcoes), geo = geometriaParedes(b, op)!;
    const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() }, casos: Caso3[] = [{ nodais: [], distribuidas: [] }, { nodais: [], distribuidas: [] }];
    let peso = 0;
    const r0 = incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => 25e6, Ev: 25e6, Gv: 25e6 / 2.4, nu: 0.2, gama: 25, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: (_, kN) => { peso += kN; }, etiqueta: () => {}, hViga: 0.25, iG: 0, caso: (c) => (c === caso ? 1 : -1) });
    expect(peso).toBeCloseTo(25 * 0.2 * (6 * 4 - 2 * 2), 6);
    // empuxo: p = 9·(3 − z) em toda a parede menos o vão (z de 0,5 a 2,5; x de 2 a 4)
    const total = 9 * (4 * 4) / 2 * 6, vao = 2 * 2 * 9 * (3 - 1.5);
    expect(r0.empuxo[0].F[1]).toBeCloseTo(total - vao, 6); // terreno à direita: empurra para +y
    const usados = new Set(pm.cascas!.flatMap((c) => c.nos));
    expect(usados.size).toBe(pm.nos.length);
    const r = resolver3(pm, casos);
    expect(r.erro).toBeUndefined();
    let Ry = 0;
    for (const [, rr] of r.reacoes[1]) Ry += rr[1];
    expect(Ry).toBeCloseTo(-(total - vao), 3);
  });
});

/** Duas paredes de 12 m frente a frente (y = 0 e y = 6), da fundação (−1) ao Tipo 1 (+3), com terreno por fora e a laje do Tipo 1 entre elas. */
function caixa() {
  const s = padrao(1);
  const caso = comEmpuxo(s), t1 = nomePav(s.modelo, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
  ok(s, 'parede.criar', { pontos: [[0, 0], [12, 0]], espessura: 0.2, morre: t1 });
  ok(s, 'parede.criar', { pontos: [[0, 6], [12, 6]], espessura: 0.2, morre: t1 });
  const [a, z] = s.modelo.paredes!;
  ok(s, 'parede.empuxo', { parede: a.id, empuxos: [{ caso, lado: 'dir' }] }); // terreno em y < 0
  ok(s, 'parede.empuxo', { parede: z.id, empuxos: [{ caso, lado: 'esq' }] }); // terreno em y > 6
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [12, 0], [12, 6], [0, 6]] });
  return { s, caso, t1, g };
}

describe('paredes no edifício', () => {
  it('muro travado no topo pela laje: topo quase parado e cortante na base entre o apoiado e o engastado no topo', () => {
    const { s, caso } = caixa();
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const res = an.portico.res!, ic = an.casos.indexOf(caso), m = an.portico.modelo;
    const H = 4, q0 = 0.5 * 18 * H, R = (q0 * H) / 2, L = 12;
    // equilíbrio global do caso H: as duas paredes se equilibram pela laje; Σ Ry das bases = 0
    let RyA = 0;
    for (const [n, rr] of res.reacoes[ic]) if (m.nos[n][1] < 3) RyA += rr[1];
    // parede de y = 0 (terreno em y < 0, empuxo para +y): a base recebe entre 0,7 R (topo engastado: 7/20·q0·H) e
    // 0,8 R (topo apoiado: 2/5·q0·H); a laje trava o topo e quase não restringe o giro
    expect(-RyA / (R * L)).toBeGreaterThan(0.69);
    expect(-RyA / (R * L)).toBeLessThan(0.81);
    // topo: deslocamento muito menor que o do balanço (q0·H⁴/(30·D) ≈ 17 mm com Ecs)
    const topo = m.nos.findIndex((p) => Math.abs(p[0] - 6) < 1e-6 && Math.abs(p[1]) < 1e-6 && Math.abs(p[2] - 3) < 1e-9);
    expect(Math.abs(res.desloc[ic][topo * 6 + 1])).toBeLessThan(5e-4);
  });

  it('parede fora do diafragma no nível em que não toca laje (Térreo) e dentro dele no Tipo 1', () => {
    const { s, caso } = caixa();
    const b = s.modelo, an = analisarEdificio(b);
    const res = an.portico.res!, ic = an.casos.indexOf(caso), m = an.portico.modelo;
    const terreo = nomePav(b, 'Térreo');
    expect(an.paredes!.foraDiafragma.some((x) => x.pavimento === terreo)).toBe(true);
    expect(an.paredes!.foraDiafragma.some((x) => x.pavimento === nomePav(b, 'Tipo 1'))).toBe(false);
    // no Térreo (z = 0) as duas paredes se aproximam (simétrico): se estivessem no diafragma ficariam paradas
    const no = (y: number) => m.nos.findIndex((p) => Math.abs(p[0] - 6) < 1e-6 && Math.abs(p[1] - y) < 1e-6 && Math.abs(p[2]) < 1e-9);
    const ua = res.desloc[ic][no(0) * 6 + 1], uz = res.desloc[ic][no(6) * 6 + 1];
    expect(ua).toBeGreaterThan(1e-4);
    expect(uz).toBeCloseTo(-ua, 6);
    expect(verificar(b).some((d) => d.codigo === 'PAREDE_FORA_DIAFRAGMA' && d.mensagem.includes('Térreo'))).toBe(true);
  });

  it('paredes fecham panos e apoiam a laje; esforços e cargas na base no dimensionamento', () => {
    const { s, g } = caixa();
    const b = s.modelo;
    ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [0, 6]], secao: { b: 0.2, h: 0.5 } });
    ok(s, 'viga.tracar', { grupo: g, pontos: [[12, 0], [12, 6]], secao: { b: 0.2, h: 0.5 } });
    const panos = panosDoGrupo(s.modelo, g);
    expect(panos.some((p) => Math.abs(Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2 - 72) < 1e-6)).toBe(true);
    const an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
    expect(an.erro).toBeUndefined();
    expect(d.paredes?.length).toBe(2);
    expect(d.pilaresParede).toBeUndefined();
    // vertical: peso das duas paredes + laje + revestimento + Q, tudo na base das paredes (as vigas apoiam nelas)
    const G = an.fundacao.filter((f) => f.caso === 'G').reduce((a, f) => a + f.N, 0);
    expect(G).toBeCloseTo(an.totais.G, 0);
    void b;
  });

  it('esbeltez: trecho com lado < 5 × a espessura vira pilar (barra)', () => {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'parede.criar', { pontos: [[0, 0], [4, 0], [4, 0.8]], espessura: 0.2, morre: t1 });
    const geo = geometriaParedes(s.modelo, opcoesEmUso(s.modelo.opcoes))!;
    expect(geo.grades.length).toBe(1);
    expect(geo.barras.length).toBe(1);
    expect(verificar(s.modelo).some((d) => d.codigo === 'PAREDE_TRECHO_CURTO')).toBe(true);
  });
});

describe('paredes: comandos', () => {
  it('prolongar até outra parede, atribuir de outra parede, mover com viga embutida, remover', () => {
    const s = padrao();
    const t1 = nomePav(s.modelo, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
    ok(s, 'parede.criar', { pontos: [[0, 0], [5, 0]], espessura: 0.2, morre: t1 });
    ok(s, 'parede.criar', { pontos: [[8, -2], [8, 4]], esq: 0.15, dir: 0.1, morre: t1, porPavimento: [{ pavimento: t1, esq: 0.1, dir: 0.1 }] });
    const [a, z] = s.modelo.paredes!;
    ok(s, 'parede.prolongar', { id: a.id, extremidade: 'fim', ate: { parede: z.id } });
    expect(s.modelo.paredes![0].pontos[1]).toEqual([8, 0]);
    ok(s, 'parede.atribuir', { ids: [a.id], de: z.id });
    expect(s.modelo.paredes![0]).toMatchObject({ esq: 0.15, dir: 0.1, porPavimento: [{ pavimento: t1, esq: 0.1, dir: 0.1 }] });
    ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [8, 0]], secao: { b: 0.2, h: 0.5 } });
    const v = s.modelo.vigas.at(-1)!;
    ok(s, 'viga.embutir', { viga: v.id, parede: a.id });
    ok(s, 'parede.mover', { ids: [a.id], dx: 0, dy: -1 });
    expect(s.modelo.vigas.at(-1)!.pontos).toEqual([[0, -1], [8, -1]]);
    expect(s.executar('parede.criar', { pontos: [[1, -1], [6, -1]], espessura: 0.2, morre: t1 }).ok).toBe(false); // sobreposta
    ok(s, 'parede.remover', { ids: [a.id] });
    expect(s.modelo.vigas.at(-1)!.embutida).toBeUndefined();
  });

  it('parede.daMascara gera as paredes da camada; pavimento.remover limpa espessuras e aberturas', () => {
    const s = padrao();
    const GEO = { MUROS: { linhas: [0, 0, 600, 0, 0, 20, 600, 20], arcos: [], textos: [] } };
    ok(s, 'mascara.importar', { grupo: 'g_3', nome: 'Arq', geo: GEO, escala: 0.01 });
    ok(s, 'parede.daMascara', { grupo: 'g_3', camada: 'MUROS' });
    const w = s.modelo.paredes![0];
    expect(w.esq + w.dir).toBeCloseTo(0.2, 9);
    expect(w.pontos.map((p) => p[1])).toEqual([0.1, 0.1]);
    const t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'parede.editar', { id: w.id, porPavimento: [{ pavimento: t1, esq: 0.05, dir: 0.05 }] });
    ok(s, 'pavimento.remover', { id: t1 });
    expect(s.modelo.paredes![0].porPavimento).toBeUndefined();
  });
});

describe('muro de arrimo isolado (X6)', () => {
  it('estabilidade contra o cálculo manual (Rankine, φ 30°, sobrecarga 10 kN/m²)', () => {
    const r = estabilidadeMuro({ H: 3, tTopo: 0.2, tBase: 0.3, B: 2, ponta: 0.5, hBase: 0.4, solo: { gama: 18, phi: 30, metodo: 'rankine' }, sobrecarga: 10, atrito: Math.tan((20 * Math.PI) / 180), sigmaAdm: 150 });
    expect(r.K).toBeCloseTo(1 / 3, 9);
    expect(r.Ea).toBeCloseTo(34.68, 6);
    expect(r.Eq).toBeCloseTo(11.3333, 3);
    expect(r.Mtomb).toBeCloseTo(58.5707, 3);
    expect(r.V).toBeCloseTo(103.55, 6);
    expect(r.Mres).toBeCloseTo(123.345, 6);
    expect(r.FSt).toBeCloseTo(2.1059, 3);
    expect(r.FSd).toBeCloseTo(0.81909, 4);
    expect(r.e).toBeCloseTo(0.29404, 4);
    expect(r.sigmaMax).toBeCloseTo(108.74, 1);
    expect(r.sigmaMin).toBeCloseTo(6.81, 1);
    expect(r.fuste.M).toBeCloseTo(42, 9);
    expect(r.fuste.V).toBeCloseTo(37, 9);
    expect(r.atende).toEqual({ tombamento: true, deslizamento: false, tensao: true, nucleo: true });
    expect(r.mensagens[0]).toMatch(/^Deslizamento/);
  });
});
