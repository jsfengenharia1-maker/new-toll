// Dimensionamento das nervuradas bidirecionais (E3c): equilíbrio, flexão em T contra cálculo manual, cortante (VRd1 e estribos a
// cada 0,75 d), base nas nervuras, uniformização, mesa, quantitativos e perfil NBR.
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { acoDe, cobrimentoLaje, concretoDe } from './materiais';
import { classificar } from './revisao';
import { verificar } from './verify';
import { arranjoNervuras, geometriaBidirecional } from './nervuradas';
import { montarPrancha, type Prim } from '../sheets/prancha';
import { montarPranchasLajes } from '../sheets/armacaoLajes';
import { barArea } from '../concrete';
import { larguraNecessaria, escolherBarras, extensaoNegativa, esforcosDaNervura } from './nervuradasDim';
import type { BuildingModel } from './types';

function padrao(): Sessao { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; }
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };

/** Pano 6 × 6 com pilares nos cantos e vigas 20 × 60; laje nervurada bidirecional. */
function predio(tipo: Record<string, unknown> = { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 }, q?: number, opcoes?: Record<string, number>, secao = { b: 0.2, h: 0.6 }) {
  const s = padrao(), a = 6;
  ok(s, 'lote', { comandos: [[0, 0], [a, 0], [0, a], [a, a]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao } });
  ok(s, 'lote', { comandos: [v([[0, 0], [a, 0]]), v([[0, a], [a, a]]), v([[0, 0], [0, a]]), v([[a, 0], [a, a]])] });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo });
  if (q !== undefined) ok(s, 'grupo.editar', { id: 'g_3', q });
  if (opcoes) ok(s, 'opcoes.definir', { valores: opcoes });
  return s;
}
function calcular(b: BuildingModel) {
  const an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  return { an, d: dimensionarEdificio(b, an) };
}

describe('nervurada bidirecional no edifício (E3c)', () => {
  const s = predio();
  const b = s.modelo;
  const { an, d } = calcular(b);
  const n = d.nervuradas![0];

  it('equilíbrio e pesos: reações = cargas; peso da laje = concreto das cubetas inteiras + maciço', () => {
    for (const g of an.grelhas.filter((x) => x.res)) expect(Object.values(g.reacoes).reduce((t, r) => t + r.G, 0)).toBeCloseTo(g.carga.G, 4);
    const grupo = b.grupos.find((x) => x.id === 'g_3')!;
    // 3 pavimentos: laje (195 kN de concreto + revestimento nos 36 m²) + vigas (24 m de 0,2 × 0,6) + pilares (4 × 0,09 × 13,5 m)
    const esperado = 3 * (195 + grupo.gRev * 36 + 24 * 0.2 * 0.6 * 25) + 4 * 0.09 * 25 * 13.5;
    expect(an.totais.G).toBeCloseTo(esperado, 4);
    expect(an.totais.Q).toBeCloseTo(3 * grupo.q * 36, 6);
    expect(n.quantitativo.volumeConcreto).toBeCloseTo(7.8, 9);
    expect(n.quantitativo.cubetas).toBe(64);
  });

  it('nervuras: 9 + 9, simétricas (momentos iguais para as nervuras espelhadas e para as duas direções)', () => {
    expect(n.nervuras).toHaveLength(18);
    const x = n.nervuras.filter((r) => r.dir === 0), y = n.nervuras.filter((r) => r.dir === 1);
    for (let i = 0; i < 9; i++) {
      expect(x[i].mPos).toBeCloseTo(x[8 - i].mPos, 3);
      expect(x[i].mPos).toBeCloseTo(y[i].mPos, 3);
      expect(x[i].Vmax).toBeCloseTo(y[i].Vmax, 3);
    }
    // a nervura central é a menos solicitada ao positivo da borda? o pano é apoiado em vigas flexíveis: a de borda pega o canto
    expect(Math.max(...x.map((r) => r.mPos))).toBeGreaterThan(0);
    expect(n.status).toBe('ok');
    expect(d.lajes[0].mensagens.some((m) => classificar(m).codigo === 'NERV_RESUMO')).toBe(true);
  });

  it('flexão positiva em T: armadura à mão (y = d − √(d² − 2M/(σcd·bf)), As = σcd·bf·y/fyd), barras cobrem e cabem', () => {
    const c = concretoDe(b, 'laje'), fyd = acoDe(b, 'lajeInf').fyd, g = geometriaBidirecional(b, b.lajes[0].tipo as never);
    const cob = cobrimentoLaje(b, undefined), dI = g.h - cob.inf - 0.01;
    for (const r of n.nervuras.slice(0, 3)) {
      const M = n.grupos.length ? Math.max(...n.nervuras.filter((z) => z.grupo === r.grupo).map((z) => z.mPos)) : r.mPos;
      const y = dI - Math.sqrt(dI * dI - (2 * M / 1000) / (c.sigmaCd * g.i[0]));
      const As = ((c.sigmaCd * g.i[0] * y) / fyd) * 1e4;
      expect(y).toBeLessThan(g.capa); // linha neutra na mesa
      expect(r.inf.AsNec).toBeCloseTo(Math.max(As, 0.0015 * (g.i[0] * g.capa + g.bw[0] * g.hEnch) * 1e4), 2);
      expect(r.inf.total).toBeGreaterThanOrEqual(r.inf.AsNec - 1e-9);
      expect(r.inf.cabe).toBe(true);
      expect(r.inf.Mu).toBeGreaterThanOrEqual(M - 1e-6);
    }
  });

  it('cortante a cada 0,75 d: passo, VRd1 de 19.4.1 à mão e sem estribo onde Vsd ≤ VRd1', () => {
    const c = concretoDe(b, 'laje'), g = geometriaBidirecional(b, b.lajes[0].tipo as never), cob = cobrimentoLaje(b, undefined), dd = g.h - cob.inf - 0.01;
    const r = n.nervuras[0];
    expect(r.cortante.passo).toBeCloseTo(0.75 * dd, 3);
    expect(r.cortante.secoes).toHaveLength(Math.ceil(r.L / (0.75 * dd) - 1e-9));
    const rho = Math.min(0.02, r.inf.total / 1e4 / (g.bw[0] * dd)), k = Math.max(1, 1.6 - dd);
    const vrd1 = 0.25 * c.fctd * k * (1.2 + 40 * rho) * g.bw[0] * dd * 1000;
    expect(r.cortante.VRd1).toBeCloseTo(vrd1, 6);
    expect(r.cortante.regime).toBe('laje');
    expect(r.Vmax).toBeLessThan(r.cortante.VRd1);
    expect(r.cortante.estribo).toBeNull();
    expect(r.cortante.secoes.every((x) => !x.estribo)).toBe(true);
  });

  it('uniformização: nervuras vizinhas próximas adotam a mesma armadura; 0 % dá um grupo por nervura', () => {
    expect(n.grupos.length).toBeLessThan(n.nervuras.length);
    for (const g of n.grupos) {
      const ref = n.nervuras[g.nervuras[0]];
      for (const i of g.nervuras) expect(n.nervuras[i].inf.reforco).toEqual(ref.inf.reforco);
    }
    const s0 = predio(undefined, undefined, { nervuradaIgualacaoDif: 0 });
    const r0 = calcular(s0.modelo).d.nervuradas![0];
    expect(r0.grupos).toHaveLength(r0.nervuras.length);
  });

  it('aço: o resumo soma as posições das nervuras, a malha da mesa e as repetições dos pavimentos', () => {
    expect(n.repeticoes).toBe(3);
    const total = d.resumoAcoNervuradas!.reduce((t, x) => t + x.peso, 0);
    expect(total).toBeCloseTo(n.peso * 3, 6);
    expect(n.posicoes.some((p) => p.tipo === 'mesa')).toBe(true);
    expect(n.mesa.exigida).toBe(false);
    expect(n.mesa.AsAdotada).toBeGreaterThanOrEqual(n.mesa.AsNec - 1e-9);
    // comprimento de uma posição inferior = vão + 2 ancoragens
    const inf = n.nervuras.find((r) => r.inf.reforco)!;
    expect(inf.inf.comprimento).toBeGreaterThanOrEqual(inf.L);
  });
});

describe('cortante com estribos, regime de viga e base nas nervuras', () => {
  it('carga alta: estribos nas zonas de apoio, com espaçamento ≤ 0,75 d e V ≤ VRd2', () => {
    const s = predio(undefined, 25);
    const b = s.modelo, { d } = calcular(b);
    const n = d.nervuradas![0];
    const g = geometriaBidirecional(b, b.lajes[0].tipo as never);
    const cob = cobrimentoLaje(b, undefined), dd = g.h - cob.inf - 0.01;
    const com = n.nervuras.filter((r) => r.cortante.estribo);
    expect(com.length).toBeGreaterThan(0);
    for (const r of com) {
      expect(r.cortante.estribo!.s).toBeLessThanOrEqual(0.75 * dd + 1e-9);
      expect(r.cortante.zonas.length).toBeGreaterThan(0);
      // as zonas ficam nas seções onde V passa do VRd1
      for (const sc of r.cortante.secoes) if (sc.V > r.cortante.VRd1 + 1e-9) expect(sc.estribo).toBe(true);
      expect(r.cortante.estribo!.barras).toBeGreaterThan(0);
      expect(r.Vmax).toBeLessThanOrEqual(r.cortante.VRd2);
    }
    expect(n.posicoes.some((p) => p.tipo === 'estribo')).toBe(true);
  });

  it('intereixo de 80 cm com nervura de 10 cm: flexão da mesa exigida e cisalhamento como viga (estribos em todo o vão)', () => {
    const s = predio();
    ok(s, 'forma.tipo', { acao: 'criar', id: 'f80', forma: { nome: 'Cubeta 80', tipo: 'recuperavel', altura: 0.3, intereixo: [0.8, 0.8], bw: [0.1, 0.1] } });
    ok(s, 'laje.nervurada', { ids: [s.modelo.lajes[0].id], forma: 'f80', hTotal: 0.36, capa: 0.06 });
    const { d } = calcular(s.modelo);
    const n = d.nervuradas![0];
    expect(n.regime).toEqual(['viga', 'viga']);
    expect(n.mesa.exigida).toBe(true);
    // vão livre 70 cm; Md = qd·a²/12
    expect(n.mesa.livre).toBeCloseTo(0.7, 9);
    expect(n.mesa.Md).toBeCloseTo((n.mesa.qd * 0.49) / 12, 6);
    expect(d.lajes[0].mensagens.some((m) => classificar(m).codigo === 'NERV_ESPACAMENTO')).toBe(true);
    for (const r of n.nervuras) { expect(r.cortante.estribo).not.toBeNull(); expect(r.cortante.zonas).toEqual([[0, r.L]].map(([a, z]) => [a, +z.toFixed(3)])); }
  });

  it('base nas nervuras só entra no dimensionamento quando considerada', () => {
    const s = predio();
    const id = s.modelo.lajes[0].id;
    ok(s, 'laje.armaduraBase', { ids: [id], nervuras: [{ dir: 0, inf: { n: 2, phi: 8 } }, { dir: 1, inf: { n: 2, phi: 8 } }] });
    const sem = calcular(s.modelo).d.nervuradas![0];
    expect(sem.nervuras.every((r) => r.inf.base === null)).toBe(true);
    ok(s, 'laje.armaduraBase', { ids: [id], nervuras: [{ dir: 0, considerar: true }] });
    const com = calcular(s.modelo).d.nervuradas![0];
    for (const r of com.nervuras) {
      if (r.dir === 0) { expect(r.inf.base).toMatchObject({ n: 2, phi: 8 }); expect(r.inf.total).toBeGreaterThanOrEqual(r.inf.AsNec - 1e-9); expect(r.inf.reforco?.As ?? 0).toBeLessThan(sem.nervuras[0].inf.reforco!.As + 1e-9); }
      else expect(r.inf.base).toBeNull();
    }
    // base não detalhada: só a descrição (fora das posições e do aço); detalhada: desenhada e medida, considerada ou não
    expect(com.baseDetalhada).toBe(false);
    expect(com.posicoes.some((p) => p.tipo === 'base' || p.tipo === 'baseSup')).toBe(false);
    ok(s, 'laje.armaduraBase', { ids: [id], detalhada: true, nervuras: [{ dir: 1, sup: { n: 1, phi: 8 } }] });
    const det = calcular(s.modelo).d.nervuradas![0];
    expect(det.baseDetalhada).toBe(true);
    const x = det.posicoes.find((p) => p.tipo === 'base')!;
    expect(x).toMatchObject({ phi: 8, n: 2 });
    expect(det.posicoes.filter((p) => p.tipo === 'base')).toHaveLength(18); // base inferior informada nas 9 + 9 nervuras (considerada só na direção X)
    expect(det.posicoes.filter((p) => p.tipo === 'baseSup')).toHaveLength(9); // 9 nervuras Y
    expect(det.peso).toBeGreaterThan(com.peso);
  });
});

describe('erros e avisos da nervurada', () => {
  it('mesa abaixo do mínimo e nervura estreita: erros com código e sugestão', () => {
    const s = predio({ tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.33, capa: 0.03 });
    const { d } = calcular(s.modelo);
    const m = d.lajes[0].mensagens;
    expect(m.some((x) => classificar(x).codigo === 'NERV_MESA')).toBe(true);
    expect(d.lajes[0].status).toBe('fail');
    const s2 = predio();
    ok(s2, 'forma.tipo', { acao: 'criar', id: 'fe', forma: { nome: 'Estreita', tipo: 'recuperavel', altura: 0.3, intereixo: [0.6, 0.6], bw: [0.045, 0.045] } });
    ok(s2, 'laje.nervurada', { ids: [s2.modelo.lajes[0].id], forma: 'fe', hTotal: 0.35, capa: 0.05 });
    expect(calcular(s2.modelo).d.lajes[0].mensagens.some((x) => classificar(x).codigo === 'NERV_NERVURA')).toBe(true);
  });

  it('diagnóstico antes do cálculo (verify) acusa mesa e altura da cubeta; forma inexistente é erro do tipo', () => {
    const s = predio({ tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.4, capa: 0.03 });
    const c = verificar(s.modelo).map((x) => x.codigo);
    expect(c).toContain('NERV_MESA');
    expect(c).toContain('NERV_FORMA');
    const r = predio().executar('laje.nervurada', { ids: ['inexistente'], forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 });
    expect(r.ok).toBe(false);
    const s3 = predio();
    const r3 = s3.executar('laje.nervurada', { ids: [s3.modelo.lajes[0].id], forma: 'nao-existe', hTotal: 0.35, capa: 0.05 });
    expect(r3.ok).toBe(false);
    expect(r3.erros[0].codigo).toBe('FORMA_INEXISTENTE');
  });
});

describe('fissuração das nervuras (17.3.3.2)', () => {
  it('limite de 0,1 mm: armadura positiva aumenta com aviso; no padrão (0,3 mm, CAA II) nada muda', () => {
    const n0 = calcular(predio().modelo).d.nervuradas![0];
    expect(n0.mensagens.some((m) => classificar(m).codigo === 'NERV_FISSURA')).toBe(false);
    const { d } = calcular(predio(undefined, undefined, { limiteFissura: 0.1 }).modelo);
    const n1 = d.nervuradas![0];
    expect(n1.mensagens.some((m) => classificar(m).codigo === 'NERV_FISSURA')).toBe(true);
    expect(n1.nervuras.reduce((t, r) => t + r.inf.total, 0)).toBeGreaterThan(n0.nervuras.reduce((t, r) => t + r.inf.total, 0));
    expect(d.lajes[0].mensagens.some((m) => /^Nervuradas: fissuração/.test(m))).toBe(true);
  });
});

describe('perfil NBR e opções', () => {
  it('perfil NBR: rigidez da seção T e torção geométrica; equilíbrio mantido e momentos positivos maiores que os da inércia média? (só a ordem de grandeza)', () => {
    const s = predio(), id = s.modelo.lajes[0].id;
    const sis = calcular(s.modelo).d.nervuradas![0];
    ok(s, 'opcoes.definir', { perfil: 'nbr' });
    const nb = calcular(s.modelo);
    const n = nb.d.nervuradas![0];
    for (const g of nb.an.grelhas.filter((x) => x.res)) expect(Object.values(g.reacoes).reduce((t, r) => t + r.G, 0)).toBeCloseTo(g.carga.G, 4);
    const mx = (r: typeof sis) => Math.max(...r.nervuras.map((z) => z.mPos));
    expect(mx(n)).toBeGreaterThan(0.5 * mx(sis));
    expect(mx(n)).toBeLessThan(2 * mx(sis));
    expect(s.modelo.lajes.find((l) => l.id === id)).toBeDefined();
  });
  it('engaste de borda 0–1 vale para a nervurada: borda articulada tem negativo nulo e positivo maior que a engastada', () => {
    const s = predio(undefined, undefined, undefined, { b: 0.4, h: 1 });
    const base = calcular(s.modelo).d.nervuradas![0];
    const central = (r: typeof base) => r.nervuras.find((z) => z.dir === 0 && z.indice === 4)!;
    expect(Math.abs(central(base).mNeg[0])).toBeGreaterThan(0.5); // com viga rígida a borda engastada recebe negativo
    ok(s, 'laje.nervurada', { ids: [s.modelo.lajes[0].id], engasteBordas: [0, 0, 0, 0] });
    const art = calcular(s.modelo).d.nervuradas![0];
    expect(Math.abs(central(art).mNeg[0])).toBeLessThan(1e-6);
    expect(Math.abs(central(art).mNeg[1])).toBeLessThan(1e-6);
    expect(central(art).mPos).toBeGreaterThan(central(base).mPos * 1.05);
  });
  it('faixa maciça junto às vigas: menos cubetas, mais concreto e peso', () => {
    const base = calcular(predio().modelo).d.nervuradas![0].quantitativo;
    const faixa = calcular(predio(undefined, undefined, { nervuradaMacicoViga: 1 }).modelo).d.nervuradas![0].quantitativo;
    expect(faixa.cubetas).toBeLessThan(base.cubetas);
    expect(faixa.volumeConcreto).toBeGreaterThan(base.volumeConcreto);
  });
  it('flecha: nervurada usa os fatores de laje maciça e sai com limite de vão/250', () => {
    const { d } = calcular(predio().modelo);
    expect(d.lajes[0].limite).toBeGreaterThan(0);
    expect(d.lajes[0].flecha).toBeGreaterThan(0);
    expect(d.lajes[0].flecha).toBeLessThan(d.lajes[0].limite * 2);
  });
});

describe('pranchas: formas com cubetas e armação das nervuras', () => {
  const s = predio(undefined, 25);
  const b = s.modelo;
  const { an, d } = calcular(b);
  it('planta de formas e de armação desenham as 64 cubetas de 50 × 50 cm em traço fino', () => {
    const cubetas = (m: Prim[]) => m.filter((p) => p.t === 'pl' && p.c === 'FORMA-FINA' && p.fechada && p.pts.length === 4 && p.pts.every((q, i) => Math.abs(Math.hypot(q[0] - p.pts[(i + 1) % 4][0], q[1] - p.pts[(i + 1) % 4][1]) - 0.5) < 1e-6));
    expect(cubetas(montarPrancha(b, 'g_3').modelo!)).toHaveLength(64);
    expect(cubetas(montarPranchasLajes(b, an, d)[0].modelo!)).toHaveLength(64);
  });
  it('armação: posições por grupo das nervuras nas folhas das positivas e das negativas, estribos e malha da mesa na tabela de aço', () => {
    const folhas = montarPranchasLajes(b, an, d);
    expect(folhas).toHaveLength(2);
    const [pos, neg] = folhas;
    const txt = (f: typeof pos) => f.modelo!.flatMap((p) => (p.t === 'txt' ? [p.s] : []));
    expect(txt(pos).some((t) => /^X1: .* N\d+ φ.* C=\d+/.test(t))).toBe(true);
    expect(txt(pos).some((t) => /estribos das nervuras/.test(t))).toBe(true);
    expect(txt(neg).some((t) => /^X\d: .* N\d+ φ.* C=\d+/.test(t))).toBe(true);
    expect(txt(neg).some((t) => /malha da mesa/.test(t))).toBe(true);
    // a tabela de aço fecha com o resumo do dimensionamento (3 pavimentos)
    const kg = [pos, neg].reduce((t, f) => t + (f.aco?.tabela ?? []).reduce((u, r) => u + (r.cTotal * barArea(r.phi) * 7850), 0), 0);
    expect(kg).toBeGreaterThan(0.9 * d.nervuradas![0].peso * 3);
    expect(kg).toBeLessThan(1.1 * d.nervuradas![0].peso * 3);
  });
});

describe('funções auxiliares', () => {
  it('largura necessária e escolha de barras: menor área que cobre e cabe', () => {
    // 2φ10 com estribo φ5 e cobrimento 2,5 cm: 2·(0,025 + 0,005) + 2·0,010 + espaço livre máx(2 cm; φ; 1,2·19 mm = 2,28 cm) = 0,1028 m
    expect(larguraNecessaria(2, 10, 5, 0.025)).toBeCloseTo(0.1028, 9);
    expect(larguraNecessaria(1, 10, 5, 0.025)).toBeCloseTo(0.07, 9);
    const e = escolherBarras(1.1, 0.1, 5, 0.025)!;
    expect(e.As).toBeGreaterThanOrEqual(1.1);
    expect(e.cabe).toBe(true);
    // 3 barras de 20 mm não cabem em 10 cm: devolve a menor área com cabe = false
    const x = escolherBarras(9, 0.1, 5, 0.025)!;
    expect(x.cabe).toBe(false);
    expect(x.As).toBeGreaterThanOrEqual(9);
    expect(escolherBarras(0, 0.1, 5, 0.025)).toBeNull();
    expect(escolherBarras(500, 0.1, 5, 0.025)).toBeNull();
  });
  it('extensão do negativo até o momento nulo (interpolação)', () => {
    const e = { x: [0, 1, 2, 3], Mmax: [0, 0, 0, 0], Mmin: [-4, -2, 2, -1], V: [0, 0, 0, 0] };
    expect(extensaoNegativa(e, 0, 3)).toBeCloseTo(1.5, 9);
    expect(extensaoNegativa(e, 1, 3)).toBeCloseTo(1 / 3, 9); // do fim: de −1 a 2 cruza a 1/3 da barra
    expect(extensaoNegativa({ x: [0, 1], Mmax: [0, 0], Mmin: [1, 1], V: [0, 0] }, 0, 1)).toBe(0);
  });
  it('esforços da nervura: soma das faixas da grelha pela parte de cada faixa dentro da banda do intereixo', () => {
    const g = geometriaBidirecional(undefined, { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 });
    const arr = arranjoNervuras({ contorno: [[0, 0], [6, 0], [6, 6], [0, 6]] }, g);
    const rib = arr.nervuras.find((n) => n.dir === 0 && Math.abs(n.c - 3) < 1e-9)!; // eixo em y = 3,0
    const linha = (c: number, M: number, V: number) => ({ dir: 0 as const, c, w: 0.2, x: [0, 3, 6], Mmax: [0, M, 0], Mmin: [-M / 10, 0, -M / 10], V: [V, 0, V] });
    // faixas de 20 cm centradas em 2,8; 3,0; 3,2 e 3,4; a banda do eixo em 3,0 é [2,7; 3,3]
    const linhas = [linha(2.8, 10, 6), linha(3.0, 10, 6), linha(3.2, 10, 6), linha(3.4, 10, 6), linha(2.2, 99, 99)];
    const e = esforcosDaNervura(rib, linhas, 0.6, arr);
    // pesos: 2,8 → [2,7; 2,9] inteira (1); 3,0 (1); 3,2 → [3,1; 3,3] (1); 3,4 → [3,3; 3,5] fora (0): 3 faixas → 3 × 10
    expect(Math.max(...e.Mmax)).toBeCloseTo(30, 9);
    expect(e.V[0]).toBeCloseTo(18, 9);
    expect(e.Mmin[0]).toBeCloseTo(-3, 9);
    expect(e.x[0]).toBe(0);
    expect(e.x.at(-1)).toBeCloseTo(6, 9);
    // eixo em 3,05 → banda [2,75; 3,35]; sem a faixa de 3,4 (lacuna): 0,75 (2,8) + 1 (3,0) + 1 (3,2) = 2,75 faixas
    const e2 = esforcosDaNervura({ ...rib, c: 3.05 }, linhas.filter((l) => l.c !== 3.4), 0.6, arr);
    expect(Math.max(...e2.Mmax)).toBeCloseTo(27.5, 9);
  });
});
