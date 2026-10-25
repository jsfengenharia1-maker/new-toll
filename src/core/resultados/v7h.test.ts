// V7h (C4.60, K1.4.x): esforços internos do pilar-parede numa seção horizontal (base e topo de cada lance), com o torçor, por
// caso, combinação e envoltória. As seis forças da seção são a soma das forças nodais dos elementos do lance nos nós do corte
// (equilíbrio do corpo livre, sem médias de painel). Verificações: (1) pilar-parede em L isolado sob força excêntrica: a seção
// em qualquer cota fecha o equilíbrio com as cargas acima dela a 1e-9 e coincide com o OpenSees em pavimento intermediário
// (validation/opensees/torcao_pp.py); (2) edifício só com o pilar-parede, vento: equilíbrio do corpo livre acima de cada
// cota com os lados em casca e em barra, e a base coincide com a carga da base de V7g; (3) hipóteses.
import { describe, expect, it } from 'vitest';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import type { ResultadoPilarParede } from '../building/pilarParedeEsforcos';
import { cargasProprias, forcasNosDosElementos, nosDeCorte, prepararElementos, resultanteDoCorte, secoesDoLance, type ForcasSecao } from '../building/pilarParedeSecoes';
import { modelo as modeloEmpuxo } from '../building/paredesEmpuxoFixture';
import refEmpuxo from '../../../validation/opensees/parede_empuxo.json';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { hipotesesDeEsforco } from './esforcosCaso';
import { baseDoPilarParede, secoesDoPilarParedePorHipotese, torsorDoPilarParede } from './pilarParedeHipotese';
import { linha, modeloL } from './fixturePPL';
import ref from '../../../validation/opensees/torcao_pp.json';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
const CH = ['N', 'Vx', 'Vy', 'Mx', 'My', 'Mz'] as const;

/** Resultante das cargas nodais `nodais` (apenas as de cota acima de `zc`) em torno de (O, zc), no sentido de ação sobre a parte de cima. */
function aplicadas(md: Modelo3, nodais: Caso3['nodais'], O: [number, number], zc: number, acima: (z: number) => boolean): ForcasSecao {
  const r: ForcasSecao = { N: 0, Vx: 0, Vy: 0, Mx: 0, My: 0, Mz: 0 };
  for (const { no, f } of nodais) {
    const [x, y, z] = md.nos[no];
    if (!acima(z)) continue;
    const dx = x - O[0], dy = y - O[1], dz = z - zc;
    r.Vx += f[0]; r.Vy += f[1]; r.N += f[2];
    r.Mx += (f[3] ?? 0) + dy * f[2] - dz * f[1]; r.My += (f[4] ?? 0) + dz * f[0] - dx * f[2]; r.Mz += (f[5] ?? 0) + dx * f[1] - dy * f[0];
  }
  return r;
}
const fecha = (sec: ForcasSecao, app: ForcasSecao, tol: number) => { for (const k of CH) expect(Math.abs(sec[k] + app[k]), k).toBeLessThan(tol); };

describe('V7h: seção do pilar-parede em L contra equilíbrio e OpenSees', () => {
  const O: [number, number] = [(ref.L1 * (ref.L1 / 2) + ref.L2 * ref.L1) / (ref.L1 + ref.L2), (ref.L2 * (ref.L2 / 2)) / (ref.L1 + ref.L2)];
  const R = ref.resultados as Record<string, { corte: Record<string, number> }>;
  for (const [caso, q1, q2] of [[1, 100, 0], [2, 0, 100], [3, 100, -60]] as const) {
    it(`caso ${caso} (qx ${q1}, qy ${q2} kN/m): corpo livre acima da base, do pavimento intermediário e do topo a 1e-9 e OpenSees a meia altura`, () => {
      const m = modeloL(), o = R[String(caso)].corte;
      m.casos[0].nodais.push(...linha(m.pm, m.lado1, 0, q1, 0), ...linha(m.pm, m.lado2, 1, q2, 1));
      const r = resolver3(m.pm, m.casos);
      expect(r.erro).toBeUndefined();
      const lances = new Map<string, number[]>();
      for (const e of m.paredes.info) lances.set(e.lance, [...(lances.get(e.lance) ?? []), e.k]);
      expect(lances.size).toBe(2); // Térreo (−3 a 0) e Tipo 1 (0 a 3)
      const escala = Math.max(q1, Math.abs(q2), 1) * 6 * 3;
      const secoes: { zb: number; zt: number; base: ForcasSecao; topo: ForcasSecao; f: Float64Array; corte: ReturnType<typeof nosDeCorte> }[] = [];
      for (const ks of lances.values()) {
        const el = { cascas: ks, axiais: [], barras: [] }, corte = nosDeCorte(m.pm, el), pr = prepararElementos(m.pm, el);
        const f = forcasNosDosElementos(m.pm, pr, r.desloc[0], m.casos[0], undefined);
        secoes.push({ zb: corte.zBase, zt: corte.zTopo, base: resultanteDoCorte(m.pm, f, corte.base, O), topo: resultanteDoCorte(m.pm, f, corte.topo, O, -1), f, corte });
      }
      secoes.sort((a, c) => a.zb - c.zb);
      expect(secoes.map((s) => [s.zb, s.zt])).toEqual([[-3, 0], [0, 3]]);
      for (const s of secoes) {
        fecha(s.base, aplicadas(m.pm, m.casos[0].nodais, O, s.zb, (z) => z > s.zb + 1e-6), 1e-9 * escala);
        fecha(s.topo, aplicadas(m.pm, m.casos[0].nodais, O, s.zt, (z) => z > s.zt - 1e-6), 1e-9 * escala);
      }
      // o torçor do conjunto é o mesmo em qualquer cota (a força é horizontal no topo) a menos do braço: Mz = −(torçor aplicado)
      expect(Math.abs(secoes[0].base.Mz - secoes[1].base.Mz)).toBeLessThan(1e-9 * escala);
      // OpenSees (meia altura = base do 2º lance): total e distribuição entre os lados (malha 0,25 m contra 0,125 m: até 2,5 % da força aplicada: a distribuição entre os lados varia com a malha, no OpenSees 0,25 m dá Ry do lado 1 de −14,9 kN e 0,125 m dá −8,0 kN)
      const meio = secoes[1], tot = meio.base, esc = Math.max(Math.abs(o.Rx), Math.abs(o.Ry), 1);
      expect(Math.abs(tot.Vx - o.Rx)).toBeLessThan(1e-6 * esc);
      expect(Math.abs(tot.Vy - o.Ry)).toBeLessThan(1e-6 * esc);
      expect(Math.abs(tot.N - o.Rz)).toBeLessThan(1e-6 * esc);
      expect(Math.abs(tot.My - (o.My0 - O[0] * o.Rz))).toBeLessThan(1e-6 * esc * 6);
      expect(Math.abs(tot.Mx - (o.Mx0 - O[1] * o.Rz))).toBeLessThan(1e-6 * esc * 6);
      expect(Math.abs(tot.Mz - (o.Mz0 + (0 - O[0]) * o.Ry - (0 - O[1]) * o.Rx))).toBeLessThan(1e-6 * esc * 6);
      const porLado = (lado: number) => {
        const el = { cascas: m.paredes.info.filter((e) => e.lance === m.paredes.info.find((x) => x.z > 0)!.lance && e.lado === lado).map((e) => e.k), axiais: [], barras: [] };
        const c = nosDeCorte(m.pm, el), f = forcasNosDosElementos(m.pm, prepararElementos(m.pm, el), r.desloc[0], m.casos[0], undefined);
        return resultanteDoCorte(m.pm, f, c.base, O);
      };
      const l1 = porLado(0), l2 = porLado(1);
      expect(Math.abs(l1.Vx - o.Rx_lado1) / esc).toBeLessThan(0.025);
      expect(Math.abs(l1.Vy - o.Ry_lado1) / esc).toBeLessThan(0.025);
      expect(Math.abs(l2.Vx - o.Rx_lado2) / esc).toBeLessThan(0.025);
      expect(Math.abs(l2.Vy - o.Ry_lado2) / esc).toBeLessThan(0.025);
      // a soma dos lados é a seção inteira (os elementos dos dois lados cobrem o conjunto)
      for (const k of CH) expect(Math.abs(l1[k] + l2[k] - tot[k])).toBeLessThan(1e-9 * escala);
    });
  }
});

function edificioParede(vertices: number[][], opcoes?: Record<string, number>) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  if (opcoes) ok(s, 'opcoes.definir', { valores: opcoes });
  const g = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.grupo;
  ok(s, 'pilarParede.tipo', { nome: 'Isolado', vertices, esq: 0.1, dir: 0.1 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0 });
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [3, 0], [3, 2], [0, 2]], tipo: { tipo: 'macica', h: 0.12 } });
  return s;
}
const calcular = (s: Sessao) => { const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an, { fundacao: false }); return { an, pp: dim.pilaresParede![0] as ResultadoPilarParede, b: s.modelo }; };

/** Equilíbrio do corpo livre acima de cada seção com as cargas nodais do vento (o pilar-parede é o único elemento vertical). */
function conferirVento(an: AnaliseEdificio, pp: ResultadoPilarParede, rel: number) {
  const md = an.portico.modelo, casos = an.portico.casosVento!, O = pp.centro;
  expect(casos.length).toBeGreaterThan(0);
  let maior = 0;
  for (const s of pp.secoes) {
    casos.forEach((c, iv) => {
      expect(c.distribuidas.length).toBe(0);
      const nome = an.vento!.casos[iv].nome, esc = c.nodais.reduce((t, n) => t + Math.abs(n.f[0]) + Math.abs(n.f[1]), 0) * 15 + 1;
      const app = aplicadas(md, c.nodais, O, s.cota, s.posicao === 'base' ? (z) => z > s.cota + 1e-6 : (z) => z > s.cota - 1e-6);
      fecha(s.casos[nome], app, rel * esc);
      maior = Math.max(maior, ...CH.map((k) => Math.abs(app[k])));
    });
  }
  expect(maior).toBeGreaterThan(100); // o vento carrega de fato o pilar-parede
}

describe('V7h: edifício só com o pilar-parede: corpo livre acima de cada cota, base de V7g e pesos', () => {
  for (const [rotulo, vertices, modelo, rel] of [['L em casca', [[0, 0], [3, 0], [3, 2]], 'casca', 1e-9], ['L com lado curto em barra', [[0, 0], [3, 0], [3, 0.5]], 'misto', 1e-6]] as const) {
    it(`${rotulo}: equilíbrio por caso de vento em todas as seções (${rel}); base do 1º lance = carga da base (todos os casos)`, () => {
      const { an, pp } = calcular(edificioParede(vertices as unknown as number[][]));
      expect(pp.modelo).toBe(modelo);
      expect(pp.secoes.length).toBe(2 * 5);
      expect(pp.secoes.map((s) => s.posicao)).toEqual(['base', 'topo', 'base', 'topo', 'base', 'topo', 'base', 'topo', 'base', 'topo']);
      conferirVento(an, pp, rel);
      // base do 1º lance = reações dos nós da base (V7g), para G, Q e cada vento
      const b0 = pp.secoes[0];
      expect(Object.keys(b0.casos).sort()).toEqual(Object.keys(pp.base).sort());
      const tol = modelo === 'casca' ? 1e-9 : 1e-6;
      for (const [nome, base] of Object.entries(pp.base)) for (const k of CH) expect(Math.abs(b0.casos[nome][k] - base[k]), `${nome} ${k}`).toBeLessThan(tol * (1 + Math.abs(base[k])));
    });
  }

  for (const axialParedeSeparado of [0, 1]) {
    it(`axialParedeSeparado ${axialParedeSeparado} (sem faixas axiais; vento com as cascas brutas): equilíbrio do vento a 1e-9 e peso do lance`, () => {
      const { an, pp } = calcular(edificioParede([[0, 0], [3, 0], [3, 2]], { axialParedeSeparado }));
      conferirVento(an, pp, 1e-9);
      const info = an.paredes!.info;
      [...new Set(pp.secoes.map((x) => x.lance))].forEach((id, k) => expect(pp.secoes[2 * k].casos.G.N - pp.secoes[2 * k + 1].casos.G.N).toBeCloseTo(info.filter((e) => e.lance === id).reduce((t, e) => t + e.peso, 0), 8));
    });
  }

  it('pesos: N(G) cai do topo ao seguinte pelo peso do lance (Σ γ·t·A dos elementos); no topo da cobertura N = 0; a base fecha o equilíbrio vertical global', () => {
    const s = edificioParede([[0, 0], [3, 0], [3, 2]]), { an, pp } = calcular(s);
    const info = an.paredes!.info, pesoLance = (id: string) => info.filter((e) => e.lance === id).reduce((t, e) => t + e.peso, 0);
    const lances = [...new Set(pp.secoes.map((x) => x.lance))];
    expect(lances.length).toBe(5);
    lances.forEach((id, k) => {
      const base = pp.secoes[2 * k].casos.G.N, topo = pp.secoes[2 * k + 1].casos.G.N;
      expect(pesoLance(id)).toBeGreaterThan(30);
      expect(base - topo).toBeCloseTo(pesoLance(id), 8);
    });
    expect(Math.abs(pp.secoes[9].casos.G.N)).toBeLessThan(1e-8);
    // equilíbrio vertical global: a carga vertical da base (G e Q) é a soma das reações de todos os apoios (sem contar a reação do vértice entre os lados duas vezes)
    const md = an.portico.modelo, r = an.portico.res!, nBase = an.paredes!.base[pp.id];
    expect(new Set(nBase).size).toBe(nBase.length);
    an.casos.forEach((c, ic) => { let somaApoios = 0; for (const [n] of md.apoios) somaApoios += r.reacoes[ic].get(n)?.[2] ?? 0; expect(pp.base[c].N).toBeCloseTo(somaApoios, 8); });
  });

  it('o primeiro lance coincide com a base para a hipótese: combinação, envoltória e polo (transporte exato do torçor por combinação)', () => {
    const { an, pp, b } = calcular(edificioParede([[0, 0], [3, 0], [3, 2]])), hs = hipotesesDeEsforco(b, an);
    const env = hs.find((h) => h.id === 'env:ELU')!, comb = hs.find((h) => h.tipo === 'combinacao' && Object.keys(h.fatores).some((n) => n.startsWith('W')))!;
    if (env.tipo !== 'envoltoria' || comb.tipo !== 'combinacao') throw new Error('hipóteses esperadas');
    const bs = baseDoPilarParede(pp, comb).max, sc = secoesDoPilarParedePorHipotese(pp, comb);
    expect(sc.length).toBe(pp.secoes.length);
    for (const k of CH) { expect(sc[0].max[k]).toBeCloseTo(bs[k], 8); expect(sc[0].min[k]).toBe(sc[0].max[k]); }
    // superposição exata em qualquer seção
    const k5 = 5, esperado = Object.entries(comb.fatores).reduce((t, [n, f]) => t + f * (pp.secoes[k5].casos[n]?.Vx ?? 0), 0);
    expect(sc[k5].max.Vx).toBeCloseTo(esperado, 9);
    // o torçor da seção da base é o torçor de V7g (centroide e polo deslocado)
    const P: [number, number] = [pp.centro[0] + 1.3, pp.centro[1] - 0.7];
    expect(secoesDoPilarParedePorHipotese(pp, comb, P)[0].max.Mz).toBeCloseTo(torsorDoPilarParede(pp, comb, P).max, 8);
    // envoltória: extremos entre as combinações, seção a seção, com a determinante; polo transportado por combinação
    for (const polo of [undefined, P]) {
      const e = secoesDoPilarParedePorHipotese(pp, env, polo);
      [0, 3, 6, 9].forEach((i) => {
        const vals = env.combinacoes.map((c) => {
          let Mz = 0, Vx = 0, Vy = 0;
          for (const [n, f] of Object.entries(c.fatores)) { const q = pp.secoes[i].casos[n]; if (q) { Mz += f * q.Mz; Vx += f * q.Vx; Vy += f * q.Vy; } }
          const Pp = polo ?? pp.centro;
          return [c.nome, Mz + (pp.centro[0] - Pp[0]) * Vy - (pp.centro[1] - Pp[1]) * Vx] as const;
        });
        expect(e[i].max.Mz).toBeCloseTo(Math.max(...vals.map((v) => v[1])), 8);
        expect(e[i].min.Mz).toBeCloseTo(Math.min(...vals.map((v) => v[1])), 8);
        expect(vals.find((v) => v[0] === e[i].porMax.Mz)![1]).toBeCloseTo(e[i].max.Mz, 8);
      });
      expect(e[0].max.Mz).toBeCloseTo(torsorDoPilarParede(pp, env, polo).max, 8);
      expect(e[0].min.Mz).toBeCloseTo(torsorDoPilarParede(pp, env, polo).min, 8);
      expect(e[3].max.Mz).toBeGreaterThan(e[3].min.Mz);
    }
  });
});

describe('V7h: parede com abertura sob empuxo (cargas próprias dos elementos nos nós do corte) contra equilíbrio e OpenSees', () => {
  it('seções de cada lance fecham o equilíbrio com o empuxo acima (inclusive o empuxo nos nós do corte) e a base coincide com a reação do OpenSees', () => {
    const m = modeloEmpuxo(0.5), r = resolver3(m.pm, m.casos);
    expect(r.erro).toBeUndefined();
    const O: [number, number] = [0, 0];
    expect(m.r0.cargasProprias.length).toBeGreaterThan(10);
    const lances = new Map<string, number[]>();
    for (const e of m.r0.info) lances.set(e.lance, [...(lances.get(e.lance) ?? []), e.k]);
    expect(lances.size).toBe(2);
    const secoes = [...lances.values()].map((ks) => {
      const el = { cascas: ks, axiais: [], barras: [] }, corte = nosDeCorte(m.pm, el), pr = prepararElementos(m.pm, el);
      return { ks, corte, ...secoesDoLance(m.pm, pr, corte, cargasProprias(m.r0, m.pm, new Set(ks)), O, r.desloc[0], m.casos[0], undefined) };
    }).sort((a, c) => a.corte.zBase - c.corte.zBase);
    expect(secoes.map((x) => [x.corte.zBase, x.corte.zTopo])).toEqual([[-1, 0], [0, 3]]);
    const esc = Math.abs(refEmpuxo.resultados.Ry) * 4 + 1;
    // base do 2º lance (z = 0): o empuxo aplicado nos nós de z > 0 mais o dos elementos do lance nos nós de z = 0
    const proprias2 = cargasProprias(m.r0, m.pm, new Set(secoes[1].ks)), zc = secoes[1].corte.zBase;
    const nodais = m.casos[0].nodais.filter((n) => m.pm.nos[n.no][2] > zc + 1e-6);
    const app = aplicadas(m.pm, [...nodais, ...proprias2.filter((c) => Math.abs(m.pm.nos[c.no][2] - zc) < 1e-6).map((c) => ({ no: c.no, f: [...c.f, 0, 0, 0] }))], O, zc, () => true);
    fecha(secoes[1].base, app, 1e-9 * esc);
    // topo do 2º lance: empuxo dos nós de z ≥ 3 menos o dos elementos do 2º lance nesses nós (pertence ao lance, abaixo da seção)
    const zt = secoes[1].corte.zTopo, aTopo = aplicadas(m.pm, m.casos[0].nodais, O, zt, (z) => z > zt - 1e-6);
    const propriasTopo = proprias2.filter((c) => Math.abs(m.pm.nos[c.no][2] - zt) < 1e-6).map((c) => ({ no: c.no, f: [...c.f, 0, 0, 0] }));
    const retirar = aplicadas(m.pm, propriasTopo, O, zt, () => true);
    for (const k of CH) expect(Math.abs(secoes[1].topo[k] + aTopo[k] - retirar[k]), k).toBeLessThan(1e-9 * esc);
    // OpenSees: reação total da base (Ry e Mx) = seção da base do 1º lance
    const b0 = secoes[0].base;
    expect(Math.abs(b0.Vy - refEmpuxo.resultados.Ry) / esc).toBeLessThan(1e-3);
    expect(b0.Mx / refEmpuxo.resultados.Mx).toBeCloseTo(1, 3);
  });
});
