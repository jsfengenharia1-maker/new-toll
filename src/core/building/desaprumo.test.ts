// Desaprumo global do edifício (NBR 6118, 11.3.3.4.1): θ1, θa e forças por pavimento conferidos à mão, regra dos 30 % do vento
// nas combinações ELU, equilíbrio das reações, comparação com o Pórtico 2D (mesmos θa, Md e decisões) e a opção desligada
// (comportamento anterior).
import { beforeAll, describe, expect, it } from 'vitest';
import { samplePortico } from '../../app/samples';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { THETA1_MAX, THETA1_MIN, anguloDesaprumo, decidirRegra30 } from '../desaprumo';
import { defaultDesign, emptyModel, type Model, type Support } from '../types';
import { addMember } from '../edit';
import { analyze } from '../solver';
import { memoriaPortico2D } from '../memoria/portico2D';
import { runDesign } from '../design';
import { imperfectionOf } from '../design';
import { analisarEdificio, type AnaliseEdificio } from './analitico';
import { calcularDesaprumo, casosHorizontais, momentoVento, nomeCasoDesaprumo } from './desaprumo';
import { combinacoesComRegras, combinacoesEdificio } from './combinacoes';
import { OPCOES_INFO } from './opcoes';
import type { BuildingModel } from './types';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));

describe('θ1 e θa (à mão)', () => {
  it('θ1 = 1/(100√H) limitado entre 1/300 e 1/200', () => {
    expect(anguloDesaprumo(6.25, 4).theta1).toBeCloseTo(1 / 250, 15); // interior: 1/(100·2,5)
    expect(anguloDesaprumo(1, 4).theta1).toBe(THETA1_MAX); // 1/100 → 1/200
    expect(anguloDesaprumo(100, 4).theta1).toBe(THETA1_MIN); // 1/1000 → 1/300
    expect(anguloDesaprumo(9, 4).theta1).toBeCloseTo(1 / 300, 15); // 1/(100·3): no limite
    expect(anguloDesaprumo(4, 4).theta1).toBeCloseTo(1 / 200, 15);
  });
  it('θa = θ1·√((1 + 1/n)/2): n = 4, H = 6,25 m → 0,0031622776601683794', () => {
    const a = anguloDesaprumo(6.25, 4);
    expect(a.thetaA).toBeCloseTo(0.0031622776601683794, 15);
    expect(anguloDesaprumo(9, 4).thetaA).toBeCloseTo(0.0026352313834736496, 15);
    expect(anguloDesaprumo(9, 1).thetaA).toBeCloseTo(1 / 300, 15); // n = 1: θa = θ1
    expect(anguloDesaprumo(9, 0).n).toBe(1);
  });
  it('regra dos 30 %: limites', () => {
    expect(decidirRegra30(0, 0, false)).toBe('sem-desaprumo');
    expect(decidirRegra30(0, 10, false)).toBe('sem-vento');
    expect(decidirRegra30(0, 10, true)).toBe('sem-vento');
    expect(decidirRegra30(100, 30, true)).toBe('so-vento'); // 0,3·100 = 30 ≥ 30
    expect(decidirRegra30(100, 30.1, true)).toBe('ambos');
    expect(decidirRegra30(8.9, 30, true)).toBe('so-desaprumo'); // 8,9 < 9
    expect(decidirRegra30(9, 30, true)).toBe('ambos');
    expect(decidirRegra30(-100, 30, true)).toBe('so-vento'); // valor absoluto
  });
});

// prédio de 3 pavimentos acima da base: cotas 0, 3, 6 e 9 m → H = 9 m, θ1 = 1/300; n = 4 prumadas
const PAVS = [{ id: 'B', cota: 0 }, { id: 'P1', cota: 3 }, { id: 'P2', cota: 6 }, { id: 'P3', cota: 9 }];
const CARGAS = { B: { G: 500, Q: 90 }, P1: { G: 1000, Q: 200 }, P2: { G: 1000, Q: 200 }, P3: { G: 800, Q: 100 } };
const ZONA = { x0: 0, x1: 10, y0: 0, y1: 8, cx: 5, cy: 4 };
const entrada = (zonas = (_: string) => [ZONA]) => ({ pavimentos: PAVS, zonas, cargas: CARGAS, casos: [{ id: 'G', natureza: 'G' }, { id: 'Q', natureza: 'Q' }, { id: 'W', natureza: 'W' }], nAuto: 4, nInformado: 0 });

describe('forças por pavimento: prédio de 3 pavimentos à mão', () => {
  const d = calcularDesaprumo(entrada())!;
  it('H = 9 m, n = 4, θ1 = 1/300, θa = 0,0026352313834736496', () => {
    expect(d.H).toBe(9); expect(d.n).toBe(4); expect(d.informadoN).toBe(false);
    expect(d.theta1).toBeCloseTo(1 / 300, 15);
    expect(d.thetaA).toBeCloseTo(0.0026352313834736496, 15);
    expect(d.verticais).toEqual(['G', 'Q']); // o vento não é caso vertical
  });
  it('F = θa·V: G = 2,6352; 2,6352; 2,1082 kN e Q = 0,5270; 0,5270; 0,2635 kN (a base não recebe força)', () => {
    const G0 = d.casos.find((c) => c.nome === nomeCasoDesaprumo('G', 0))!, Q0 = d.casos.find((c) => c.nome === nomeCasoDesaprumo('Q', 0))!;
    expect(G0.forcas.map((f) => f.pavimento)).toEqual(['P1', 'P2', 'P3']);
    expect(G0.forcas.map((f) => f.F)).toEqual([expect.closeTo(2.6352313834736494, 12), expect.closeTo(2.6352313834736494, 12), expect.closeTo(2.1081851067789197, 12)]);
    expect(Q0.forcas.map((f) => f.F)).toEqual([expect.closeTo(0.5270462766947299, 12), expect.closeTo(0.5270462766947299, 12), expect.closeTo(0.26352313834736496, 12)]);
    // cisalhamento por pavimento = θa × carga acumulada acima: 7,3786 (térreo→P1), 4,7434, 2,1082
    const cis = G0.forcas.map((_, i) => G0.forcas.slice(i).reduce((t, f) => t + f.F, 0));
    expect(cis[0]).toBeCloseTo(0.0026352313834736496 * 2800, 12); expect(cis[1]).toBeCloseTo(0.0026352313834736496 * 1800, 12);
  });
  it('quatro direções: +x, +y positivas; −x, −y negativas', () => {
    const f = (dir: number) => d.casos.find((c) => c.nome === nomeCasoDesaprumo('G', dir))!.forcas[0].F;
    expect(f(0)).toBeGreaterThan(0); expect(f(90)).toBeGreaterThan(0); expect(f(180)).toBe(-f(0)); expect(f(270)).toBe(-f(90));
  });
  it('Md,k = θa·Σ V·z: G = 42,6907 kN·m e Q = 7,1151 kN·m', () => {
    expect(d.md.G).toBeCloseTo(42.69074841227312, 10);
    expect(d.md.Q).toBeCloseTo(7.115124735378854, 10);
  });
  it('n informado substitui o contado; zonas dividem a força pela área', () => {
    const di = calcularDesaprumo({ ...entrada(), nInformado: 2 })!;
    expect(di.n).toBe(2); expect(di.informadoN).toBe(true);
    expect(di.thetaA).toBeCloseTo((1 / 300) * Math.sqrt((1 + 1 / 2) / 2), 15);
    const zs = [{ ...ZONA, x1: 5 }, { ...ZONA, x0: 5, x1: 10 }, { ...ZONA, x0: 5, x1: 10 }]; // áreas 40, 40, 40
    const dz = calcularDesaprumo(entrada(() => zs))!;
    const fs = dz.casos.find((c) => c.nome === nomeCasoDesaprumo('G', 0))!.forcas.filter((f) => f.pavimento === 'P1');
    expect(fs).toHaveLength(3);
    for (const f of fs) expect(f.F).toBeCloseTo(2.6352313834736494 / 3, 12);
    expect(fs.reduce((t, f) => t + f.F, 0)).toBeCloseTo(2.6352313834736494, 12);
  });
  it('sem altura ou sem carga vertical: sem desaprumo', () => {
    expect(calcularDesaprumo({ ...entrada(), pavimentos: [PAVS[0]] })).toBeNull();
    expect(calcularDesaprumo({ ...entrada(), cargas: { B: {}, P1: {}, P2: {}, P3: {} } })).toBeNull();
  });
});

// combinações com o vento sintético: M1 = F·9 kN·m (uma força no último pavimento)
function sintetico(M1: number) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const b = s.modelo;
  const vento = { classe: 'A', altura: 9, casos: [{ nome: 'W0°', direcao: 0, exc: 0, forcas: [{ pavimento: 'P3', zona: 0, z: 9, F: M1 / 9, Mz: 0 }] }], gamaZ: [{ direcao: 0, ampliacao: 1, max: 1, ventoPrincipal: 1, usoPrincipal: 1 }] };
  const an = { vento, desaprumo: calcularDesaprumo(entrada()), opcoes: { segundaOrdem: 0 } } as unknown as AnaliseEdificio;
  return { b, an };
}

describe('regra dos 30 % do vento nas combinações ELU (valores à mão)', () => {
  it('sem vento: ELU "1,4G + 1,4Q" → Md = 1,4·(42,6907 + 7,1151) = 69,7282 kN·m, quatro combinações (uma por direção)', () => {
    const { b, an } = sintetico(100);
    const { combinacoes, regras } = combinacoesComRegras(b, an);
    const r = regras.find((x) => !x.hasW && x.termos.length === 2)!;
    expect(r).toBeDefined();
    expect(r.Md).toBeCloseTo(69.72822240671276, 9);
    expect(r.decisao).toBe('sem-vento');
    expect(r.saida).toHaveLength(4);
    for (const dir of [0, 90, 180, 270]) {
      const c = combinacoes.find((x) => x.nome === `${r.combo} · desaprumo ${dir}°`)!;
      expect(c.tipo).toBe('ELU');
      expect(c.fatores[nomeCasoDesaprumo('G', dir)]).toBe(c.fatores.G);
      expect(c.fatores[nomeCasoDesaprumo('Q', dir)]).toBe(c.fatores.Q);
    }
  });
  it('M1 = 1000: 0,3·Mw ≥ Md → só vento; as combinações com vento não mudam', () => {
    const { b, an } = sintetico(1000);
    const { regras } = combinacoesComRegras(b, an);
    const comVento = regras.filter((x) => x.hasW);
    expect(comVento.length).toBeGreaterThan(0);
    for (const r of comVento) { expect(r.decisao).toBe('so-vento'); expect(r.saida).toEqual([r.combo]); }
    // vento principal: Mw = 1,4·1000
    expect(Math.max(...comVento.map((r) => r.Mw))).toBeCloseTo(1400, 9);
  });
  it('M1 = 40: vento principal Mw = 56, Md = 1,4·42,6907 + 0,7·7,1151 = 64,7482 → 0,3·Md = 19,42 < 56 → vento + desaprumo a 0°', () => {
    const { b, an } = sintetico(40);
    const { combinacoes, regras } = combinacoesComRegras(b, an);
    const r = regras.find((x) => x.hasW && Math.abs(x.Mw - 56) < 1e-9 && Math.abs(x.Md - 64.7482) < 1e-3)!;
    expect(r).toBeDefined();
    expect(r.Md).toBeCloseTo(1.4 * 42.69074841227312 + 0.7 * 7.115124735378854, 9);
    expect(r.decisao).toBe('ambos');
    const c = combinacoes.find((x) => x.nome === r.saida[0])!;
    expect(c.nome).toMatch(/\+ desaprumo 0°$/);
    expect(c.fatores['W0°']).toBeDefined(); expect(c.fatores[nomeCasoDesaprumo('G', 0)]).toBe(c.fatores.G);
  });
  it('M1 = 10: Mw = 14 < 0,3·Md = 19,42 → só desaprumo a 0° (o vento sai da combinação)', () => {
    const { b, an } = sintetico(10);
    const { combinacoes, regras } = combinacoesComRegras(b, an);
    const r = regras.find((x) => x.hasW && Math.abs(x.Mw - 14) < 1e-9 && Math.abs(x.Md - 64.7482) < 1e-3)!;
    expect(r.decisao).toBe('so-desaprumo');
    const c = combinacoes.find((x) => x.nome === r.saida[0])!;
    expect(c.nome).toMatch(/só desaprumo 0° \(vento < 30%\)$/);
    expect(c.fatores['W0°']).toBeUndefined();
    expect(c.fatores[nomeCasoDesaprumo('G', 0)]).toBe(c.fatores.G);
  });
  it('só as ELU recebem o desaprumo (raras, quase permanentes e frequentes iguais às anteriores)', () => {
    const { b, an } = sintetico(40);
    const sem = combinacoesEdificio(b, { ...an, desaprumo: undefined } as AnaliseEdificio);
    const com = combinacoesEdificio(b, an);
    for (const t of ['RARA', 'QP', 'FREQ'] as const) expect(com.filter((c) => c.tipo === t)).toEqual(sem.filter((c) => c.tipo === t));
    expect(com.filter((c) => c.tipo === 'ELU' && !/desaprumo/.test(c.nome)).every((c) => sem.some((s) => s.nome === c.nome))).toBe(true);
    expect(sem.some((c) => /desaprumo/.test(c.nome))).toBe(false);
  });
  it('o desaprumo não recebe a ampliação 0,95·γz do vento', () => {
    const { b, an } = sintetico(40);
    const anAmp = { ...an, vento: { ...an.vento!, gamaZ: [{ ...an.vento!.gamaZ[0], ampliacao: 1.1 }] } } as AnaliseEdificio;
    const c = combinacoesEdificio(b, anAmp).find((x) => / \+ desaprumo 0°$/.test(x.nome) && x.fatores['W0°'])!;
    expect([1.54, 0.924]).toContain(+c.fatores['W0°'].toFixed(3)); // 1,4·1,1 (vento principal) ou 0,84·1,1 (acompanhante)
    expect(c.fatores[nomeCasoDesaprumo('G', 0)]).toBe(c.fatores.G); // sem ampliação
  });
  it('momento do vento Σ|F|·z', () => {
    expect(momentoVento({ forcas: [{ F: 10, z: 3 }, { F: -20, z: 6 }] })).toBe(150);
  });
});

// ---- edifício completo: 3 pavimentos, 9 pilares ----
function predio(valores?: Record<string, unknown>, vento?: Record<string, unknown>): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('pavimento.repetir', { id: 'pav_6', vezes: 2 });
  const xs = [0, 5, 10], ys = [0, 4.5, 9];
  ok('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
  ok('lote', { comandos: [...ys.map((y) => v([[0, y], [10, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  if (valores) ok('opcoes.definir', { valores });
  if (vento) ok('vento.definir', vento);
  return s.modelo;
}

describe('edifício completo', () => {
  let b: BuildingModel, an: AnaliseEdificio, bOff: BuildingModel, anOff: AnaliseEdificio;
  beforeAll(() => {
    b = predio({}, { v0: 40, s1: 1.1, s3: 1.05 });
    an = analisarEdificio(b);
    bOff = predio({ desaprumoGlobal: 0 }, { v0: 40, s1: 1.1, s3: 1.05 });
    anOff = analisarEdificio(bOff);
  }, 240000);

  it('padrão ligado nos dois perfis; desligada reproduz o comportamento anterior (sem casos nem combinações de desaprumo)', () => {
    const o = OPCOES_INFO.find((x) => x.chave === 'desaprumoGlobal')!;
    expect(o.padrao).toBe(1); expect(o.aConfirmar).toBe(true); expect(o.padraoNBR).toBeUndefined();
    expect(an.desaprumo).toBeDefined(); expect(anOff.desaprumo).toBeUndefined();
    expect(casosHorizontais(anOff).every((c) => !c.desaprumo)).toBe(true);
    expect(combinacoesEdificio(bOff, anOff).some((c) => /desaprumo/.test(c.nome))).toBe(false);
    expect(combinacoesEdificio(b, an).some((c) => /desaprumo/.test(c.nome))).toBe(true);
  });

  it('θa, H e n da análise; forças = θa × carga vertical característica do pavimento', () => {
    const d = an.desaprumo!;
    expect(d.H).toBe(an.vento!.altura);
    expect(d.n).toBe(9); expect(d.nAuto).toBe(9);
    const ang = anguloDesaprumo(d.H, d.n);
    expect(d.thetaA).toBe(ang.thetaA);
    for (const cd of d.casos) {
      const sinal = cd.direcao === 0 || cd.direcao === 90 ? 1 : -1;
      for (const f of cd.forcas) expect(rel(f.F, sinal * d.thetaA * an.cargasPavimento[f.pavimento][cd.caso] * f.fracao)).toBeLessThan(1e-12);
    }
    const G0 = d.casos.find((c) => c.nome === nomeCasoDesaprumo('G', 0))!;
    expect(rel(G0.forcas.reduce((t, f) => t + f.F, 0), d.thetaA * Object.entries(an.cargasPavimento).filter(([, c]) => c.G).reduce((t, [pv, c]) => t + (d.pavimentos.find((p) => p.pavimento === pv)!.z > 0 ? c.G : 0), 0))).toBeLessThan(1e-12);
  });

  it('equilíbrio: reações dos casos de desaprumo equilibram as forças aplicadas (forças e momento na origem)', () => {
    const pm = an.portico, r = pm.resVento!, cs = pm.casosVento!, hs = casosHorizontais(an);
    expect(r.erro).toBeUndefined();
    for (const nome of [nomeCasoDesaprumo('G', 0), nomeCasoDesaprumo('Q', 90), nomeCasoDesaprumo('G', 180), nomeCasoDesaprumo('Q', 270)]) {
      const ic = hs.findIndex((h) => h.nome === nome);
      expect(ic).toBeGreaterThanOrEqual(0);
      let Fx = 0, Fy = 0, Fz = 0, Mx = 0, My = 0, Mz = 0, escala = 0;
      for (const nd of cs[ic].nodais) {
        const p = pm.modelo.nos[nd.no], f = nd.f;
        Fx += f[0]; Fy += f[1]; Fz += f[2]; escala += Math.abs(f[0]) + Math.abs(f[1]);
        Mx += f[3] + p[1] * f[2] - p[2] * f[1]; My += f[4] + p[2] * f[0] - p[0] * f[2]; Mz += f[5] + p[0] * f[1] - p[1] * f[0];
      }
      const zBase = Math.min(...pm.modelo.nos.map((q) => q[2]));
      for (const [no, R] of r.reacoes[ic]) {
        const p = pm.modelo.nos[no];
        if (p[2] > zBase + 1e-9) continue; // só os apoios da base (os nós mestres dos diafragmas não são apoios de verdade)
        Fx += R[0]; Fy += R[1]; Fz += R[2];
        Mx += (R[3] ?? 0) + p[1] * R[2] - p[2] * R[1]; My += (R[4] ?? 0) + p[2] * R[0] - p[0] * R[2]; Mz += (R[5] ?? 0) + p[0] * R[1] - p[1] * R[0];
      }
      const tol = 1e-6 * escala * 10;
      expect(escala).toBeGreaterThan(0);
      for (const v of [Fx, Fy, Fz, Mx, My, Mz]) expect(Math.abs(v)).toBeLessThan(tol);
    }
  });

  it('a reação horizontal total dos apoios é −Σ F (sentido oposto) e a vertical é nula', () => {
    const d = an.desaprumo!, c = d.casos.find((x) => x.nome === nomeCasoDesaprumo('G', 0))!;
    const soma = c.forcas.reduce((t, f) => t + f.F, 0);
    const reac = an.fundacao.filter((f) => f.caso === c.nome);
    expect(reac.length).toBe(9);
    expect(rel(reac.reduce((t, f) => t + f.Vx, 0), -soma)).toBeLessThan(1e-6);
    expect(Math.abs(reac.reduce((t, f) => t + f.Vy, 0))).toBeLessThan(1e-6 * soma);
    expect(Math.abs(reac.reduce((t, f) => t + f.N, 0))).toBeLessThan(1e-6 * soma);
  });

  it('o vento, o γz e as cargas verticais não mudam com o desaprumo ligado', () => {
    expect(an.vento!.casos.map((c) => c.nome)).toEqual(anOff.vento!.casos.map((c) => c.nome));
    expect(an.vento!.gamaZ.map((g) => g.max)).toEqual(anOff.vento!.gamaZ.map((g) => g.max));
    const nW = an.vento!.casos.length;
    for (let ic = 0; ic < nW; ic++) expect(Array.from(an.portico.resVento!.desloc[ic])).toEqual(Array.from(anOff.portico.resVento!.desloc[ic]));
    for (let ic = 0; ic < an.casos.length; ic++) expect(Array.from(an.portico.res!.desloc[ic])).toEqual(Array.from(anOff.portico.res!.desloc[ic]));
    expect(an.totais).toEqual(anOff.totais);
  });

  it('regra dos 30 % por combinação: Mw e Md refeitos dos termos e decisão coerente com as combinações geradas', () => {
    const { combinacoes, regras } = combinacoesComRegras(b, an);
    const nomes = new Set(combinacoes.map((c) => c.nome));
    const cont: Record<string, number> = { 'sem-desaprumo': 0, 'sem-vento': 0, 'so-vento': 0, 'so-desaprumo': 0, ambos: 0 };
    for (const r of regras) {
      const Md = Math.abs(r.termos.reduce((t, x) => t + x.f * x.Md, 0)), Mw = r.termos.reduce((t, x) => t + x.f * (x.Mw ?? 0), 0);
      expect(Math.abs(Md - r.Md)).toBeLessThan(1e-9 * Math.max(1, Md)); expect(Math.abs(Mw - r.Mw)).toBeLessThan(1e-9 * Math.max(1, Math.abs(Mw)));
      expect(r.decisao).toBe(decidirRegra30(r.Mw, r.Md, r.hasW));
      cont[r.decisao]++;
      if (r.decisao === 'sem-vento') expect(r.saida).toHaveLength(4);
      if (r.decisao === 'so-vento' || r.decisao === 'sem-desaprumo') expect(r.saida).toEqual([r.combo]);
      for (const n of r.saida) expect(nomes.has(n)).toBe(true);
    }
    expect(cont['sem-vento']).toBeGreaterThan(0);
    expect(cont['so-vento'] + cont['so-desaprumo'] + cont.ambos).toBeGreaterThan(0);
    // cada combinação com desaprumo usa os casos de desaprumo de uma só direção, com o fator do caso vertical
    for (const c of combinacoes.filter((x) => /desaprumo/.test(x.nome))) {
      const dirs = new Set(Object.keys(c.fatores).filter((k) => /^D\d+°\[/.test(k)).map((k) => k.slice(1, k.indexOf('°'))));
      expect(dirs.size).toBe(1);
      for (const [k, f] of Object.entries(c.fatores)) { const m = /^D\d+°\[(.+)\]$/.exec(k); if (m) expect(f).toBe(c.fatores[m[1]]); }
    }
  });

  it('esforços da combinação "sem vento · desaprumo 0°": reação horizontal total = −1,4·ΣF(G) − 1,4·ΣF(Q)', () => {
    const { combinacoes } = combinacoesComRegras(b, an);
    const c = combinacoes.find((x) => /desaprumo 0°$/.test(x.nome) && !x.fatores['W0°'] && !x.fatores['W90°'] && x.fatores.G && x.fatores.Q)!;
    expect(c).toBeDefined();
    const d = an.desaprumo!;
    const esperado = ['G', 'Q'].reduce((t, k) => t + c.fatores[k] * d.casos.find((x) => x.nome === nomeCasoDesaprumo(k, 0))!.forcas.reduce((s, f) => s + f.F, 0), 0);
    let Rx = 0;
    for (const [nome, f] of Object.entries(c.fatores)) if (/^D0°\[/.test(nome)) Rx += f * an.fundacao.filter((x) => x.caso === nome).reduce((t, x) => t + x.Vx, 0);
    expect(rel(Rx, -esperado)).toBeLessThan(1e-6);
  });
});

describe('comparação com o Pórtico 2D (mesmos θa, Md e decisões)', () => {
  it('θ1, θa e n do 2D = anguloDesaprumo(H, n); a função de decisão é a mesma', () => {
    const m = samplePortico();
    const imp = imperfectionOf(m, defaultDesign())!;
    const a = anguloDesaprumo(imp.H, imp.n);
    expect(imp.theta1).toBe(a.theta1); expect(imp.thetaA).toBe(a.thetaA);
    // os mesmos H e n no Edifício: pavimentos nas cotas dos andares do pórtico equivalente
    const d = calcularDesaprumo({ pavimentos: [{ id: 'B', cota: 0 }, { id: 'T', cota: imp.H }], zonas: () => [ZONA], cargas: { B: { G: 0 }, T: { G: 100 } }, casos: [{ id: 'G', natureza: 'G' }], nAuto: imp.n, nInformado: 0 })!;
    expect(d.thetaA).toBe(imp.thetaA); expect(d.theta1).toBe(imp.theta1); expect(d.n).toBe(imp.n);
    // força de um pavimento: θa·V (o 2D aplica θa·V no nó, V = carga vertical do nó) e Md = θa·V·H
    expect(d.casos[0].forcas[0].F).toBe(imp.thetaA * 100);
    expect(rel(d.md.G, imp.thetaA * 100 * imp.H)).toBeLessThan(1e-14);
  });

  it('pórtico 2D de 3 andares: Md por caso (θa·ΣV·z), θa e a decisão da regra dos 30 % iguais aos do Edifício (mesmas funções)', () => {
    const FIX: Support = { ux: 'fixed', uy: 'fixed', rz: 'fixed' };
    const m: Model = emptyModel();
    m.cases = [{ id: 1, name: 'G', nature: 'G' }, { id: 2, name: 'Q', nature: 'Q' }, { id: 3, name: 'W', nature: 'W' }];
    const andares = [3, 6, 9], PG = [1000, 1000, 800], PQ = [200, 200, 100], FW = [10, 20, 30];
    for (const y of andares) { addMember(m, 0, y - 3, 0, y, 1, 1); addMember(m, 5, y - 3, 5, y, 1, 1); addMember(m, 0, y, 5, y, 1, 1); }
    for (const n of m.nodes) if (n.y === 0) n.support = { ...FIX };
    const no = (x: number, y: number) => m.nodes.find((n) => n.x === x && n.y === y)!.id;
    let id = 1;
    andares.forEach((y, i) => {
      for (const x of [0, 5]) {
        m.loads.push({ kind: 'nodal', id: id++, caseId: 1, node: no(x, y), fx: 0, fy: -PG[i] / 2, mz: 0 });
        m.loads.push({ kind: 'nodal', id: id++, caseId: 2, node: no(x, y), fx: 0, fy: -PQ[i] / 2, mz: 0 });
      }
      m.loads.push({ kind: 'nodal', id: id++, caseId: 3, node: no(0, y), fx: FW[i], fy: 0, mz: 0 });
    });
    const a = analyze(m);
    const imp = imperfectionOf(m, defaultDesign())!;
    expect(imp.H).toBe(9); expect(imp.n).toBe(2);
    const d = calcularDesaprumo({
      pavimentos: [{ id: 'B', cota: 0 }, ...andares.map((y, i) => ({ id: `A${i}`, cota: y }))], zonas: () => [ZONA],
      cargas: Object.fromEntries([['B', {}], ...andares.map((_, i) => [`A${i}`, { G: PG[i], Q: PQ[i] }])]), casos: [{ id: 'G', natureza: 'G' }, { id: 'Q', natureza: 'Q' }],
      nAuto: imp.n, nInformado: 0,
    })!;
    expect(d.thetaA).toBe(imp.thetaA);
    const { passos } = memoriaPortico2D(m, a);
    const regra = passos.filter((p) => p.elemento === 'Pórtico 2D' && p.topico === 'Desaprumo global – regra dos 30 % do vento');
    expect(regra.length).toBeGreaterThan(0);
    const lista = runDesign(m, a).elu.length;
    expect(lista).toBeGreaterThan(0);
    let decididos = 0;
    for (const p of regra) {
      // por caso: Md,k do 2D (θa·Σ V·z) = Md,k do Edifício
      for (let k = 0; `f${k}` in p.entradas; k++) {
        const md2 = p.entradas[`Md${k}`] as number;
        if (md2 > 0) expect([d.md.G, d.md.Q].some((v) => rel(v, md2) < 1e-12)).toBe(true);
      }
      const Mw = p.entradas.Mw as number, Md = p.entradas.Md as number;
      const dec = decidirRegra30(Mw, Md, Math.abs(Mw) > 0);
      const s = p.resultado as string;
      const prefixo = { 'sem-desaprumo': /^sem desaprumo/, 'sem-vento': /^sem vento/, 'so-vento': /^só vento/, 'so-desaprumo': /^só desaprumo/, ambos: /^vento \+ desaprumo/ }[dec];
      expect(s).toMatch(prefixo);
      decididos++;
    }
    expect(decididos).toBe(regra.length);
    // a força de cada andar do 2D (θa·V no nó) somada = a do Edifício (θa·V do pavimento)
    const G = d.casos.find((c) => c.nome === nomeCasoDesaprumo('G', 0))!.forcas.map((f) => f.F);
    G.forEach((F, i) => expect(F).toBeCloseTo(imp.thetaA * PG[i], 12));
  });
});

describe('P-Δ e situações do usuário com o desaprumo', () => {
  it('com P-Δ (sem a ampliação 0,95·γz) as combinações com desaprumo têm caso de 2ª ordem próprio e convergem', () => {
    const b = predio({ segundaOrdem: 1 }), an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const so = an.segundaOrdem!;
    const comD = so.combinacoes.filter((c) => /desaprumo/.test(c.nome));
    expect(comD.length).toBeGreaterThan(0);
    for (const c of comD) { expect(c.convergiu).toBe(true); expect(c.amplificacao).toBeGreaterThanOrEqual(1); expect(c.caso).toBeDefined(); }
    // o caso de 2ª ordem entra só na combinação a que pertence (fator 1)
    const cb = combinacoesEdificio(b, an).filter((c) => c.tipo === 'ELU' && /desaprumo/.test(c.nome));
    for (const c of cb) expect(Object.keys(c.fatores).filter((k) => /^PΔ /.test(k))).toHaveLength(1);
  }, 240000);

  it('situacao.importar aceita os casos de desaprumo da lista da análise', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const r0 = s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    expect(r0.ok).toBe(true);
    const { an } = sintetico(40);
    const lista = combinacoesEdificio(s.modelo, an).filter((c) => c.tipo === 'ELU').map((c) => ({ nome: c.nome, fatores: c.fatores }));
    expect(lista.some((c) => Object.keys(c.fatores).some((k) => /^D\d+°\[/.test(k)))).toBe(true);
    const r = s.executar('situacao.importar', { estado: 'concreto', combinacoes: lista });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect((s.modelo.situacoes ?? []).some((x) => Object.keys(x.fatores ?? {}).some((k) => /^D\d+°\[/.test(k)))).toBe(true);
  });
});
