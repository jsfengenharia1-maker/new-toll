// Frente E2b: vigas curvas (poligonal de cordas, torção de equilíbrio da curvatura), poliviga, viga comum a dois grupos e
// ajuste a planos inclinados. A viga curva é validada contra a solução analítica do arco circular biapoiado em planta
// (apoios com flexão livre e torção impedida) sob carga uniforme vertical.
import { describe, expect, it } from 'vitest';
import { resolver3, type Barra3, type Modelo3 } from '../fe3d';
import { Sessao } from '../commands';
import {
  ajustarAoPlano, arcoPor3, arcoValido, circuloDoArco, comprimentoDesenvolvido, controleDaViga, dadosDosArcos, decomporPoligonal, discretizarArco,
  montarPoligonal, numeroDeCordas, passosDoArco, planoPor3Pontos, pontosDoArco, resumoVigasCurvas,
} from './curvas';
import { torcaoRet } from './analitico';
import { montarPranchasVigas } from '../sheets/armacaoVigas';
import type { Prancha } from '../sheets/prancha';

type P = [number, number];
const ok = (s: Sessao, nome: string, p: Record<string, unknown>) => { const r = s.executar(nome, p); if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };

describe('arco por três pontos e discretização', () => {
  it('círculo, raio e sentido pelos três pontos (início, passagem, fim)', () => {
    // semicírculo de raio 2 centrado em (1, 0): início (−1, 0), passagem (1, 2)... percurso horário
    const c = arcoPor3([-1, 0], [1, 2], [3, 0])!;
    expect(c.c[0]).toBeCloseTo(1, 9);
    expect(c.c[1]).toBeCloseTo(0, 9);
    expect(c.R).toBeCloseTo(2, 9);
    expect(c.varredura).toBeCloseTo(-Math.PI, 9); // horário
    const c2 = arcoPor3([3, 0], [1, 2], [-1, 0])!;
    expect(c2.varredura).toBeCloseTo(Math.PI, 9); // anti-horário
    expect(arcoPor3([0, 0], [1, 1], [2, 2])).toBeNull(); // colineares
    expect(arcoPor3([0, 0], [0, 0], [2, 2])).toBeNull();
  });
  it('cordas de no máximo `corda`, vértices sobre o círculo e pontas exatas', () => {
    const a: P = [3, 0], z: P = [-3, 0], p: P = [0, 3]; // semicírculo R = 3
    for (const corda of [1, 0.5, 0.25]) {
      const pts = discretizarArco(a, p, z, corda)!;
      expect(pts[0]).toEqual(a);
      expect(pts[pts.length - 1]).toEqual(z);
      expect(pts.length - 1).toBe(numeroDeCordas(3, Math.PI, corda));
      for (let i = 0; i + 1 < pts.length; i++) expect(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])).toBeLessThanOrEqual(corda + 1e-5);
      for (const q of pts) expect(Math.hypot(q[0], q[1])).toBeCloseTo(3, 5);
    }
    expect(discretizarArco([0, 0], [1, 1], [2, 2])).toBeNull();
  });
  it('mínimo de 3 cordas (duas de ponta menores) e pontos de controle recuperados da poligonal', () => {
    const r = montarPoligonal([[0, 0], [4, 0], [4, 4]], [[2, -1], null], 10);
    if ('degenerado' in r) throw new Error('degenerado');
    expect(r.arcos).toEqual([{ ini: 0, fim: 3 }]);
    const v = { pontos: r.pontos, arcos: r.arcos };
    const ctl = controleDaViga(v);
    expect(ctl.pontos).toEqual([[0, 0], [4, 0], [4, 4]]);
    // a passagem devolvida é um vértice do arco: o mesmo círculo (centro e raio) que o das três pontas originais
    const orig = arcoPor3([0, 0], [2, -1], [4, 0])!, volta = arcoPor3(ctl.pontos[0], ctl.passagens[0]!, ctl.pontos[1])!;
    expect(volta.R).toBeCloseTo(orig.R, 5);
    expect(volta.c[0]).toBeCloseTo(orig.c[0], 5);
    expect(volta.c[1]).toBeCloseTo(orig.c[1], 5);
    expect(ctl.passagens[1]).toBeNull();
    expect(arcoValido(v, v.arcos[0])).toBe(true);
    expect('degenerado' in montarPoligonal([[0, 0], [4, 0]], [[2, 0]])).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Arco circular biapoiado em planta (raio R, meio ângulo α), carga vertical uniforme q (kN/m ao longo do arco). Apoios
// com flexão vertical livre e torção impedida: por simetria é isostático. Medido a partir do meio (θ = 0):
//   V = q·R·α;  T_e = q·R²·(sen α − α·cos α)/cos α   (torção nos apoios)
//   T(θ) = V·R·(cos(α−θ) − 1) − q·R²·(sen(α−θ) − (α−θ)) + T_e·cos(α−θ)
//   M(θ) = −V·R·sen(α−θ) + q·R²·(1 − cos(α−θ)) − T_e·sen(α−θ)      (M(0) = −q·R²·(1 − cos α)/cos α)
// ---------------------------------------------------------------------------------------------------------------
const arcoAnalitico = (q: number, R: number, alfa: number) => {
  const V = q * R * alfa, Te = (q * R * R * (Math.sin(alfa) - alfa * Math.cos(alfa))) / Math.cos(alfa);
  return {
    V, Te,
    T: (th: number) => V * R * (Math.cos(alfa - th) - 1) - q * R * R * (Math.sin(alfa - th) - (alfa - th)) + Te * Math.cos(alfa - th),
    M: (th: number) => -V * R * Math.sin(alfa - th) + q * R * R * (1 - Math.cos(alfa - th)) - Te * Math.sin(alfa - th),
    Mmeio: (q * R * R * (1 - Math.cos(alfa))) / Math.cos(alfa),
  };
};

/** Resolve o arco como poligonal de `nCordas` cordas (par) num `Modelo3` (nós em z = 0, flexão vertical livre e torção presa nas pontas). */
function arcoBiapoiado(R: number, alfa: number, nCordas: number, secao = { b: 0.2, h: 0.5 }) {
  const a: P = [R * Math.sin(-alfa), R * Math.cos(alfa)], z: P = [R * Math.sin(alfa), R * Math.cos(alfa)], p: P = [0, R];
  const pts = pontosDoArco(a, z, arcoPor3(a, p, z)!, nCordas);
  const E = 30e6, G = E / 2.4, A = secao.b * secao.h, Iz = (secao.b * secao.h ** 3) / 12, Iy = (secao.h * secao.b ** 3) / 12, J = torcaoRet(secao.b, secao.h);
  const q = 25 * A; // peso próprio (kN/m)
  const n = pts.length - 1;
  const m: Modelo3 = { nos: pts.map(([x, y]) => [x, y, 0]), barras: [], apoios: new Map() };
  for (let i = 0; i < n; i++) {
    const br: Barra3 = { i, j: i + 1, E, G, A, Iy, Iz, J };
    if (i === 0) br.libI = [5];
    if (i === n - 1) br.libJ = [5];
    m.barras.push(br);
  }
  for (const k of [0, n]) m.apoios.set(k, [0, 1, 2, 3, 4, 5]);
  for (let i = 1; i < n; i++) m.apoios.set(i, [0, 1, 5]); // grelha: só uz, rx, ry livres (como o modelo da laje)
  const res = resolver3(m, [{ nodais: [], distribuidas: m.barras.map((_, bi) => ({ barra: bi, q: [0, 0, -q] as [number, number, number] })) }]);
  if (res.erro) throw new Error(res.erro);
  // esforços nos vértices: fim de cada barra (j)
  const esf = res.esforcos[0];
  // ângulo de cada vértice a partir do meio (θ = 0) e esforços no vértice: média dos valores das duas cordas vizinhas (o vetor
  // momento é contínuo, mas cada corda o projeta nos seus eixos locais, girados de ±metade do ângulo da corda)
  const passos = passosDoArco(n);
  let acc = 0;
  const vertices = pts.map((_, k) => {
    if (k > 0) acc += passos[k - 1];
    const tAnt = k === 0 ? null : -esf[k - 1][9], tPos = k === n ? null : esf[k][3];
    const mAnt = k === 0 ? null : esf[k - 1][11], mPos = k === n ? null : -esf[k][5];
    const media = (a: number | null, z: number | null) => (a === null ? z! : z === null ? a : (a + z) / 2);
    return { th: -alfa + 2 * alfa * acc, T: media(tAnt, tPos), M: media(mAnt, mPos) };
  });
  return { q, vertices, n, bars: esf.map((e, bi) => ({ T: e[3], thMeio: -alfa + 2 * alfa * (passos.slice(0, bi).reduce((u, x) => u + x, 0) + passos[bi] / 2) })) };
}

describe('viga curva: arco biapoiado em planta sob carga uniforme (solução analítica)', () => {
  const R = 3, alfa = Math.PI / 3, secao = { b: 0.2, h: 0.5 };
  it('momento no meio, torção nos apoios e flexão livre nas pontas dentro de 3 % com 32 cordas', () => {
    const r = arcoBiapoiado(R, alfa, 32, secao), an = arcoAnalitico(r.q, R, alfa);
    const meio = r.vertices[r.n / 2];
    expect(Math.abs(meio.th)).toBeLessThan(1e-9);
    expect(Math.abs(Math.abs(meio.M) - an.Mmeio) / an.Mmeio).toBeLessThan(0.02);
    expect(Math.abs(meio.T)).toBeLessThan(0.02 * an.Te); // torção nula no meio (simetria)
    const apoio = r.vertices[0];
    expect(Math.abs(Math.abs(apoio.T) - an.Te) / an.Te).toBeLessThan(0.03);
    expect(Math.abs(apoio.M)).toBeLessThan(1e-6 * an.Mmeio); // flexão livre nas pontas
  });
  it('diagramas de M e T ao longo de todo o arco acompanham a solução analítica', () => {
    const r = arcoBiapoiado(R, alfa, 32, secao), an = arcoAnalitico(r.q, R, alfa);
    // T antissimétrico e M simétrico em torno do meio
    for (let k = 1; k < r.n / 2; k++) {
      expect(r.vertices[k].T).toBeCloseTo(-r.vertices[r.n - k].T, 6);
      expect(r.vertices[k].M).toBeCloseTo(r.vertices[r.n - k].M, 6);
    }
    const sM = Math.sign(r.vertices[r.n / 2].M) * Math.sign(-an.Mmeio), sT = Math.sign(r.bars[0].T) * Math.sign(an.T(-alfa));
    // M nos vértices (a direção da corda difere da tangente de metade do ângulo da corda: erro de segunda ordem no meio)
    for (const v of r.vertices) expect(Math.abs(v.M - sM * an.M(v.th)) / an.Mmeio).toBeLessThan(0.03);
    // T em cada corda contra a torção analítica no ângulo do meio da corda
    for (const b of r.bars) expect(Math.abs(b.T - sT * an.T(b.thMeio)) / an.Te).toBeLessThan(0.03);
  });
  it('convergência com a discretização: o erro do momento no meio cai ao refinar (ordem ≥ 1)', () => {
    const erros = [8, 16, 32, 64].map((nc) => {
      const r = arcoBiapoiado(R, alfa, nc, secao), a = arcoAnalitico(r.q, R, alfa);
      return Math.abs(Math.abs(r.vertices[r.n / 2].M) - a.Mmeio) / a.Mmeio;
    });
    for (let k = 1; k < erros.length; k++) expect(erros[k]).toBeLessThan(erros[k - 1]);
    expect(erros[0] / erros[3]).toBeGreaterThan(6); // cordas 8 vezes menores
    expect(erros[3]).toBeLessThan(0.007);
  });
  it('viga reta limite: arco de ângulo pequeno tende a q·L²/8 e torção nula', () => {
    const alfa0 = 0.02, r = arcoBiapoiado(100, alfa0, 8, secao);
    const L = 2 * 100 * Math.sin(alfa0);
    expect(Math.abs(r.vertices[r.n / 2].M)).toBeCloseTo((r.q * L * L) / 8, 0);
    expect(Math.max(...r.bars.map((b) => Math.abs(b.T)))).toBeLessThan(0.1); // torção do arco de 2,3° (T_e ≈ q·R²·α³/3 ≈ 0,03)
  });
});

// ---------------------------------------------------------------------------------------------------------------
// No edifício: mesma viga entre dois pilares, pela análise completa (grelha + pórtico), com a flexão livre nas pontas
// ---------------------------------------------------------------------------------------------------------------
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';

function edificioArco(corda?: number, R = 3, alfa = Math.PI / 3, pilar = 0.3) {
  const s = new Sessao();
  for (const c of [
    { nome: 'obra.definir', params: { nome: 'Arco' } },
    { nome: 'pavimento.criar', params: { nome: 'Térreo', cota: 0, uso: 'comum' } },
    { nome: 'grupo.criar', params: { nome: 'Tipo', uso: 'residencial' } },
    { nome: 'pavimento.criar', params: { nome: 'Tipo 1', cota: 3, grupo: 'g_3' } },
  ]) ok(s, c.nome, c.params);
  if (corda) ok(s, 'opcoes.definir', { valores: { curvaSegmento: corda * 100 } });
  const a: P = [-R * Math.sin(alfa), R * Math.cos(alfa)], z: P = [R * Math.sin(alfa), R * Math.cos(alfa)];
  for (const p of [a, z]) ok(s, 'pilar.inserir', { x: +p[0].toFixed(6), y: +p[1].toFixed(6), secao: { tipo: 'ret', b: pilar, h: pilar } });
  ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [a, z], passagens: [[0, R]], secao: { b: 0.2, h: 0.5 }, nome: 'V1' });
  ok(s, 'viga.editar', { id: s.modelo.vigas[0].id, engasteIni: 0, engasteFim: 0 });
  return { s, R, alfa };
}

describe('viga curva no edifício', () => {
  it('traçado por três pontos: poligonal discretizada, arco registrado e mensagem', () => {
    const { s } = edificioArco();
    const v = s.modelo.vigas[0];
    expect(v.arcos).toEqual([{ ini: 0, fim: v.pontos.length - 1 }]);
    expect(v.pontos.length - 1).toBe(numeroDeCordas(3, (2 * Math.PI) / 3, 0.5));
    const ds = dadosDosArcos(v)[0];
    expect(ds.raio).toBeCloseTo(3, 4);
    expect(ds.angulo).toBeCloseTo(120, 3);
    expect(ds.cordaMax).toBeLessThanOrEqual(0.5 + 1e-5);
    expect(comprimentoDesenvolvido(v)).toBeCloseTo(3 * ((2 * Math.PI) / 3), 4);
    expect(resumoVigasCurvas(s.modelo)).toHaveLength(1);
  });
  it('torção da curvatura aparece na análise e a verificação à torção é feita', () => {
    const R = 6, alfa = (40 * Math.PI) / 180;
    const { s } = edificioArco(0.25, R, alfa, 0.2);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const pm = an.portico;
    const ic = an.casos.indexOf('G');
    let tMax = 0, mMax = 0;
    pm.barras.forEach((t, bi) => { if (t.tipo !== 'viga') return; const e = pm.res!.esforcos[ic][bi]; tMax = Math.max(tMax, Math.abs(e[3]), Math.abs(e[9])); mMax = Math.max(mMax, Math.abs(e[5]), Math.abs(e[11])); });
    const q = 25 * 0.2 * 0.5, a = arcoAnalitico(q, R, alfa);
    // as faces dos pilares (20 × 20 cm) encurtam um pouco o vão; torção máxima ≈ T_e (nos apoios) e momento máximo ≈ M no meio
    expect(Math.abs(tMax - a.Te) / a.Te).toBeLessThan(0.08);
    expect(Math.abs(mMax - a.Mmeio) / a.Mmeio).toBeLessThan(0.08);
    const dim = dimensionarEdificio(s.modelo, an);
    const r = dim.vigas.find((x) => x.viga === s.modelo.vigas[0].id)!;
    expect(r.T).toBeGreaterThan(0.5 * a.Te); // torção de cálculo (ELU) considerada
    expect(r.mensagens.some((m) => m.startsWith('Viga curva: '))).toBe(true);
  });
  it('a rigidez à torção da viga curva é a bruta (opção ligada) e a do redutor (desligada); a viga reta segue o redutor', () => {
    const { s: s1 } = edificioArco(0.25);
    const { s: s0 } = edificioArco(0.25);
    ok(s0, 'opcoes.definir', { valores: { curvaTorcaoEquilibrio: 0 } });
    const J = (s: Sessao) => { const an = analisarEdificio(s.modelo); const js = new Set<number>(); an.portico.barras.forEach((x, bi) => { if (x.tipo === 'viga') js.add(an.portico.modelo.barras[bi].J); }); return [...js]; };
    const Jbruto = torcaoRet(0.2, 0.5);
    expect(J(s1)).toHaveLength(1);
    expect(J(s1)[0]).toBeCloseTo(Jbruto, 12);
    expect(J(s0)[0]).toBeCloseTo(0.15 * Jbruto, 12); // torcaoViga padrão = 0,15
    // viga reta: sempre com o redutor
    ok(s1, 'viga.editar', { id: s1.modelo.vigas[0].id, pontos: [[-2.598, 1.5], [2.598, 1.5]] });
    expect(J(s1)[0]).toBeCloseTo(0.15 * Jbruto, 12);
  });
  it('mudar a corda máxima rediscretiza o arco (mesmo círculo) e desfazer devolve', () => {
    const { s } = edificioArco();
    const v0 = JSON.parse(JSON.stringify(s.modelo.vigas[0]));
    const n0 = v0.pontos.length;
    const r = ok(s, 'opcoes.definir', { valores: { curvaSegmento: 20 } });
    const v1 = s.modelo.vigas[0];
    expect(v1.pontos.length).toBeGreaterThan(n0);
    expect(v1.arcos).toEqual([{ ini: 0, fim: v1.pontos.length - 1 }]);
    const c0 = circuloDoArco(v0, v0.arcos[0])!, c1 = circuloDoArco(v1, v1.arcos![0])!;
    expect(c1.R).toBeCloseTo(c0.R, 4);
    expect(c1.c[0]).toBeCloseTo(c0.c[0], 4);
    expect(v1.pontos[0]).toEqual(v0.pontos[0]);
    expect(v1.pontos[v1.pontos.length - 1]).toEqual(v0.pontos[n0 - 1]);
    expect(r.mensagem ?? '').toContain('rediscretizado');
    expect(s.desfazer()).not.toBeNull();
    expect(s.modelo.vigas[0].pontos.length).toBe(n0);
  });
  it('editar os pontos sem passagens vira poligonal; mover leva o arco junto', () => {
    const { s } = edificioArco();
    const id = s.modelo.vigas[0].id;
    ok(s, 'viga.mover', { ids: [id], dx: 2, dy: -1 });
    const v = s.modelo.vigas[0];
    expect(v.arcos).toBeDefined();
    expect(arcoValido(v, v.arcos![0])).toBe(true);
    expect(circuloDoArco(v, v.arcos![0])!.c[0]).toBeCloseTo(2, 4);
    ok(s, 'viga.editar', { id, pontos: [[0, 0], [5, 0]] });
    expect(s.modelo.vigas[0].arcos).toBeUndefined();
  });
  it('erros: passagem alinhada, número de passagens e pontos sem passagens', () => {
    const { s } = edificioArco();
    const id = s.modelo.vigas[0].id;
    expect(s.executar('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [4, 0]], passagens: [[2, 0]], secao: { b: 0.2, h: 0.4 } }).ok).toBe(false);
    expect(s.executar('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [4, 0]], passagens: [[2, 1], null], secao: { b: 0.2, h: 0.4 } }).ok).toBe(false);
    expect(s.executar('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [4, 0]], passagens: ['x'], secao: { b: 0.2, h: 0.4 } }).ok).toBe(false);
    expect(s.executar('viga.editar', { id, passagens: [[1, 1]] }).ok).toBe(false);
  });
});

describe('trechos retos e curvos alternados, dividir, unir, compor e decompor (poliviga)', () => {
  const traco = () => {
    const s = new Sessao();
    ok(s, 'pavimento.criar', { nome: 'Tipo 1', cota: 3 });
    const g = s.modelo.grupos[0].id;
    // reto de (0,0) a (4,0), curva até (8,4) por (7,1), reto até (8,8)
    ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [4, 0], [8, 4], [8, 8]], passagens: [null, [7.2, 0.8], null], secao: { b: 0.2, h: 0.5 }, nome: 'V1' });
    return { s, g, id: s.modelo.vigas[0].id };
  };
  it('alternância reta / curva / reta no traçado contínuo', () => {
    const { s } = traco();
    const v = s.modelo.vigas[0];
    expect(v.arcos).toHaveLength(1);
    expect(v.arcos![0].ini).toBe(1);
    expect(v.pontos[1]).toEqual([4, 0]);
    expect(v.pontos[v.pontos.length - 2]).toEqual([8, 4]);
    expect(v.pontos[v.pontos.length - 1]).toEqual([8, 8]);
  });
  it('dividir no trecho curvo mantém os dois arcos (corte sobre o círculo) e unir devolve a viga', () => {
    const { s, id } = traco();
    const v0 = JSON.parse(JSON.stringify(s.modelo.vigas[0]));
    const c0 = circuloDoArco(v0, v0.arcos[0])!;
    // ponto de corte perto do meio do arco
    const pm = v0.pontos[v0.arcos[0].ini + Math.floor((v0.arcos[0].fim - v0.arcos[0].ini) / 2)];
    ok(s, 'viga.dividir', { id, ponto: [pm[0] + 0.05, pm[1] + 0.05] });
    expect(s.modelo.vigas).toHaveLength(2);
    for (const v of s.modelo.vigas) {
      expect(v.arcos).toBeDefined();
      const c = circuloDoArco(v, v.arcos![0])!;
      expect(c.R).toBeCloseTo(c0.R, 3);
      expect(arcoValido(v, v.arcos![0])).toBe(true);
    }
    const [a, z] = s.modelo.vigas;
    expect(a.pontos[a.pontos.length - 1][0]).toBeCloseTo(z.pontos[0][0], 6);
    const total = comprimentoDesenvolvido(a) + comprimentoDesenvolvido(z);
    expect(total).toBeCloseTo(comprimentoDesenvolvido(v0), 2);
    ok(s, 'viga.unir', { ids: [a.id, z.id] });
    expect(s.modelo.vigas).toHaveLength(1);
    expect(s.modelo.vigas[0].arcos).toHaveLength(2); // dois arcos consecutivos do mesmo círculo
  });
  it('decompor separa retos e curvos; compor reúne numa viga só (comprimento e geometria preservados)', () => {
    const { s, id } = traco();
    const v0 = JSON.parse(JSON.stringify(s.modelo.vigas[0]));
    expect(decomporPoligonal(v0).map((x) => x.arcos.length)).toEqual([0, 1, 0]);
    ok(s, 'viga.decompor', { id });
    expect(s.modelo.vigas).toHaveLength(3);
    expect(s.modelo.vigas.map((v) => (v.arcos?.length ?? 0))).toEqual([0, 1, 0]);
    expect(s.executar('viga.decompor', { id }).ok).toBe(false); // já é um trecho só
    const ids = s.modelo.vigas.map((v) => v.id);
    ok(s, 'viga.compor', { ids: [ids[0], ids[2], ids[1]] }); // ordem qualquer
    expect(s.modelo.vigas).toHaveLength(1);
    const v = s.modelo.vigas[0];
    expect(v.arcos).toHaveLength(1);
    expect(v.pontos.length).toBe(v0.pontos.length);
    expect(comprimentoDesenvolvido(v)).toBeCloseTo(comprimentoDesenvolvido(v0), 4);
    expect(s.executar('viga.compor', { ids: [v.id, v.id] }).ok).toBe(false);
  });
  it('compor recusa vigas que não formam cadeia', () => {
    const { s, g } = traco();
    ok(s, 'viga.tracar', { grupo: g, pontos: [[20, 0], [24, 0]], secao: { b: 0.2, h: 0.5 } });
    expect(s.executar('viga.compor', { ids: s.modelo.vigas.map((v) => v.id) }).ok).toBe(false);
  });
});

describe('ajuste a planos inclinados (C6.58)', () => {
  it('interseção de dois planos: pontos levados à projeção da linha de cumeeira', () => {
    // duas águas: z = 0,3·x (esquerda) e z = 3 − 0,3·x (direita) → cumeeira em x = 5
    const pl1 = planoPor3Pontos([[0, 0, 0], [10, 0, 3], [0, 10, 0]])!;
    const pl2 = planoPor3Pontos([[10, 0, 0], [0, 0, 3], [10, 10, 0]])!;
    expect(pl1.a).toBeCloseTo(0.3, 9);
    expect(pl2.a).toBeCloseTo(-0.3, 9);
    const novos = ajustarAoPlano([[4.8, 0], [5.3, 4], [5.1, 9]], 'interseccao', [pl1, pl2])!;
    for (const q of novos) expect(q[0]).toBeCloseTo(5, 5);
    expect(novos.map((q) => q[1])).toEqual([0, 4, 9]);
    expect(ajustarAoPlano([[0, 0], [1, 0]], 'interseccao', [pl1, pl1])).toBeNull(); // paralelos
  });
  it('linha de máxima declividade: direção (a, b) do plano a partir do primeiro ponto', () => {
    const pl = { a: 0.2, b: 0.2, c: 0 };
    const novos = ajustarAoPlano([[0, 0], [3, 1], [5, 5.3]], 'maximaDeclividade', [pl])!;
    for (const q of novos) expect(q[0]).toBeCloseTo(q[1], 5);
    expect(ajustarAoPlano([[0, 0], [1, 0]], 'maximaDeclividade', [{ a: 0, b: 0, c: 1 }])).toBeNull();
  });
  it('comando viga.ajustarPlano (planos por três pontos cotados) e desfazer', () => {
    const s = new Sessao();
    ok(s, 'pavimento.criar', { nome: 'Tipo 1', cota: 3 });
    const g = s.modelo.grupos[0].id;
    ok(s, 'viga.tracar', { grupo: g, pontos: [[4.8, 0], [5.3, 4], [5.1, 9]], secao: { b: 0.2, h: 0.4 } });
    const id = s.modelo.vigas[0].id;
    ok(s, 'viga.ajustarPlano', { id, modo: 'interseccao', planos: [{ pontos: [[0, 0, 0], [10, 0, 3], [0, 10, 0]] }, { pontos: [[10, 0, 0], [0, 0, 3], [10, 10, 0]] }] });
    for (const q of s.modelo.vigas[0].pontos) expect(q[0]).toBeCloseTo(5, 5);
    expect(s.executar('viga.ajustarPlano', { id, modo: 'interseccao', planos: [{ a: 0.3, b: 0, c: 0 }] }).ok).toBe(false); // um plano só
    expect(s.executar('viga.ajustarPlano', { id, modo: 'interseccao', planos: [{ a: 0.3, b: 0, c: 0 }, { a: 0.3, b: 0, c: 1 }] }).ok).toBe(false); // paralelos
    expect(s.executar('viga.ajustarPlano', { id, modo: 'maximaDeclividade', planos: [{ pontos: [[0, 0, 1], [1, 1, 2], [2, 2, 3]] }] }).ok).toBe(false); // pontos alinhados
    expect(s.desfazer()).not.toBeNull();
    expect(s.modelo.vigas[0].pontos[0]).toEqual([4.8, 0]);
  });
});

describe('viga curva: prancha de vigas e memorial', () => {
  const textos = (pr: Prancha) => [...pr.papel, ...pr.modelo].flatMap((q) => (q.t === 'txt' ? [q.s] : []));
  it('a prancha desenha a viga curva desenvolvida, com raio e ângulo no título e o aço do resumo', () => {
    const { s } = edificioArco(0.25, 6, (40 * Math.PI) / 180, 0.2);
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    const prs = montarPranchasVigas(s.modelo, an, dim);
    expect(prs.flatMap((p) => p.elementos ?? [])).toContain('V1');
    const t = prs.flatMap(textos);
    expect(t.some((x) => /VIGA CURVA DESENVOLVIDA \(R = 600 cm, 80°\)/.test(x))).toBe(true);
    // a elevação tem o comprimento desenvolvido do arco (R·θ = 8,38 m), não o da corda (7,71 m)
    const v = s.modelo.vigas[0];
    expect(comprimentoDesenvolvido(v)).toBeCloseTo(6 * ((80 * Math.PI) / 180), 3);
    const pesoPranchas = prs.reduce((tt, p) => tt + (p.aco?.peso ?? 0), 0), pesoResumo = dim.resumoAcoVigas!.reduce((tt, x) => tt + x.peso, 0);
    expect(pesoPranchas).toBeCloseTo(pesoResumo, 6);
  });
  it('quadro do memorial: raio, ângulo, cordas e comprimento desenvolvido', () => {
    const { s } = edificioArco(0.25, 6, (40 * Math.PI) / 180, 0.2);
    const q = resumoVigasCurvas(s.modelo);
    expect(q).toHaveLength(1);
    expect(q[0].raios[0]).toBeCloseTo(6, 3);
    expect(q[0].angulos[0]).toBeCloseTo(80, 3);
    expect(q[0].cordaMax).toBeLessThanOrEqual(0.25 + 1e-5);
    expect(q[0].cordas).toBe(s.modelo.vigas[0].pontos.length - 1);
  });
});
