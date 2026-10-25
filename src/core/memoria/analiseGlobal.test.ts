// Memória detalhada (MD fase 9): vento por pavimento (NBR 6123), γz com M1,tot e ΔMtot,d por pavimento, P-Δ por iteração e
// desaprumo. As contas são refeitas a partir das `entradas` registradas (erro relativo ≤ 1e-9) e a análise com a memória
// ligada é idêntica à desligada.
import { beforeAll, describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio, gamaZDeCalculo, type AnaliseEdificio } from '../building/analitico';
import { FR, S2_PARAM } from '../building/vento';
import type { BuildingModel } from '../building/types';
import { Registrador, comMemoria, type PassoMemoria } from './registrador';
import { memoriaDetalhada, type MemoriaDetalhada } from './edificio';

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

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const sem = (an: AnaliseEdificio) => ({ ...an, ms: 0, ...(an.segundaOrdem ? { segundaOrdem: { ...an.segundaOrdem, ms: 0 } } : {}) });

let b: BuildingModel, an: AnaliseEdificio, mem: MemoriaDetalhada;
beforeAll(() => {
  b = predio({}, { platibanda: 0.8, v0: 40, s1: 1.1, s3: 1.05 });
  an = analisarEdificio(b);
  mem = memoriaDetalhada(b, { an }).memoria;
}, 180000);

const G = () => mem.passos.filter((p) => p.elemento === 'Edifício');
const tp = (pref: string) => G().filter((p) => p.topico.startsWith(pref));

describe('vento por pavimento (NBR 6123)', () => {
  it('S2, Vk e q refeitos das entradas e iguais aos da análise', () => {
    const s2 = tp('Vento – S2').filter((p) => p.formula.startsWith('S2'));
    const vk = tp('Vento – S2').filter((p) => p.formula.startsWith('Vk'));
    const q = tp('Vento – S2').filter((p) => p.formula.startsWith('q'));
    const pavs = new Set(an.vento!.casos[0].forcas.map((f) => f.pavimento));
    expect(s2).toHaveLength(pavs.size);
    expect(vk).toHaveLength(pavs.size);
    expect(q).toHaveLength(pavs.size);
    const k = ['A', 'B', 'C'].indexOf(an.vento!.classe), par = S2_PARAM[b.vento!.categoria];
    s2.forEach((p, i) => {
      const f = an.vento!.casos[0].forcas.find((x) => x.pavimento === [...pavs][i])!;
      expect(num(p, 'b')).toBe(par.b); expect(num(p, 'Fr')).toBe(FR[k]); expect(num(p, 'p')).toBe(par.p[k]);
      expect(rel(num(p, 'b') * num(p, 'Fr') * Math.pow(num(p, 'z') / 10, num(p, 'p')), p.resultado as number)).toBeLessThan(1e-9);
      expect(p.resultado).toBe(f.s2);
      const pk = vk[i], pq = q[i];
      expect(rel(num(pk, 'V0') * num(pk, 'S1') * num(pk, 'S2') * num(pk, 'S3'), pk.resultado as number)).toBeLessThan(1e-9);
      expect(num(pk, 'V0')).toBe(40); expect(num(pk, 'S1')).toBe(1.1); expect(num(pk, 'S3')).toBe(1.05);
      expect(rel(0.613 * num(pq, 'Vk') ** 2 / 1000, pq.resultado as number)).toBeLessThan(1e-9);
      expect(pq.resultado).toBe(f.q);
    });
  });

  it('largura corrigida pela platibanda, área e força F = Ca·fv·q·Ae; forças registradas = forças da análise', () => {
    for (const cv of an.vento!.casos.filter((c) => c.exc === 0)) {
      const T = `Vento – forças por pavimento (${cv.nome})`;
      const ps = G().filter((p) => p.topico === T);
      const bc = ps.filter((p) => p.formula.startsWith('b′')), ae = ps.filter((p) => p.formula.startsWith('Ae')), fp = ps.filter((p) => p.formula.startsWith('F = Ca'));
      const pavs = [...new Set(cv.forcas.map((f) => f.pavimento))];
      expect(bc).toHaveLength(pavs.length); expect(ae).toHaveLength(pavs.length); expect(fp).toHaveLength(pavs.length);
      pavs.forEach((pv, i) => {
        const a = num(bc[i], 'a'), h = num(bc[i], 'h'), bb = num(bc[i], 'b');
        expect(rel(a > 0 ? (bb * (2 * a + h)) / h : bb, bc[i].resultado as number)).toBeLessThan(1e-9);
        expect(rel((bc[i].resultado as number) * h / 2, ae[i].resultado as number)).toBeLessThan(1e-9);
        const F = num(fp[i], 'Ca') * num(fp[i], 'fv') * num(fp[i], 'fsentido') * num(fp[i], 'q') * num(fp[i], 'Ae');
        expect(rel(F, fp[i].resultado as number)).toBeLessThan(1e-9);
        const somaZ = cv.forcas.filter((f) => f.pavimento === pv).reduce((t, f) => t + f.F, 0);
        expect(rel(Math.abs(somaZ), fp[i].resultado as number)).toBeLessThan(1e-9);
      });
      const tot = ps.find((p) => p.formula === 'ΣF; M1 = Σ|F|·z')!;
      const M = cv.forcas.reduce((t, f) => t + Math.abs(f.F) * f.z, 0);
      expect(rel(tot.resultado as number, M)).toBeLessThan(1e-9);
      let m2 = 0;
      for (let i = 0; `F${i}` in tot.entradas; i++) m2 += Math.abs(num(tot, `F${i}`)) * num(tot, `z${i}`);
      expect(rel(m2, M)).toBeLessThan(1e-9);
    }
    // com platibanda, o último pavimento tem b′ > b
    const ult = tp('Vento – forças por pavimento (W0°)').filter((p) => p.formula.startsWith('b′')).at(-1)!;
    expect(num(ult, 'a')).toBe(0.8);
    expect(ult.resultado as number).toBeGreaterThan(num(ult, 'b'));
  });

  it('torção das excentricidades: Mz = −(linha − cy)·F (vento em X) e (linha − cx)·F (vento em Y)', () => {
    const ex = an.vento!.casos.filter((c) => c.exc !== 0);
    expect(ex.length).toBe(8);
    for (const cv of ex) {
      const ps = G().filter((p) => p.topico === `Vento – forças por pavimento (${cv.nome})`);
      expect(ps).toHaveLength(cv.forcas.length);
      ps.forEach((p, i) => {
        const e = p.entradas, linha = (e.meio as number) + (e.exc as number) * (e.e as number) * (e.largura as number);
        const Mz = e.emX ? -(linha - (e.c as number)) * (e.F as number) : (linha - (e.c as number)) * (e.F as number);
        expect(rel(Mz, cv.forcas[i].Mz) < 1e-9 || Math.abs(Mz - cv.forcas[i].Mz) < 1e-9).toBe(true);
        expect(p.resultado).toBe(cv.forcas[i].Mz);
      });
    }
  });
});

describe('γz em detalhe', () => {
  it('M1,tot por pavimento, ΔMtot,d por pavimento e γz refeitos das entradas', () => {
    for (const gz of an.vento!.gamaZ) {
      const T = `Estabilidade global (γz) – vento a ${gz.direcao}°`;
      const ps = G().filter((p) => p.topico === T);
      const m1p = ps.filter((p) => p.formula === 'M1,pav = Σ |F|·z');
      const m1 = ps.find((p) => p.formula === 'M1,tot,k = Σ M1,pav')!;
      let soma = 0;
      for (const p of m1p) {
        let m = 0;
        for (let i = 0; `F${i}` in p.entradas; i++) m += Math.abs(num(p, `F${i}`)) * num(p, `z${i}`);
        expect(rel(m, p.resultado as number)).toBeLessThan(1e-9);
        soma += p.resultado as number;
      }
      expect(rel(soma, m1.resultado as number)).toBeLessThan(1e-9);
      expect(m1.resultado).toBe(gz.det!.M1);
      // 15.5.3: M1,tot,d e ΔMtot,d de cálculo (γq do vento principal; γq·ψ0,w do acompanhante), da mesma combinação
      const dd = gz.det!, m1V = ps.find((p) => p.formula === 'M1,tot,d = γq·M1,tot,k')!, m1U = ps.find((p) => p.formula === 'M1,tot,d = γq·ψ0,w·M1,tot,k')!;
      expect(rel(m1V.resultado as number, dd.gq * dd.M1)).toBeLessThan(1e-9); expect(rel(m1U.resultado as number, dd.gq * dd.psiW * dd.M1)).toBeLessThan(1e-9);
      expect(m1V.resultado).toBe(dd.M1dV); expect(m1U.resultado).toBe(dd.M1dU);
      // o γz refeito só com grandezas características (deslocamento do vento e M1 sem γf, verticais ponderadas) coincide: o γf do vento se cancela
      const pV = dd.pavimentos.reduce((t, q) => t + (dd.gg * q.G + dd.gq * q.Qpsi) * q.d, 0), pU = dd.pavimentos.reduce((t, q) => t + (dd.gg * q.G + dd.gq * q.Q) * q.d, 0);
      expect(rel(1 / (1 - pV / dd.M1), gz.ventoPrincipal)).toBeLessThan(1e-9); expect(rel(1 / (1 - pU / dd.M1), gz.usoPrincipal)).toBeLessThan(1e-9);
      const dm = ps.filter((p) => p.formula.startsWith('ΔM,pav'));
      expect(dm).toHaveLength(gz.det!.pavimentos.length);
      let sV = 0, sU = 0;
      for (const p of dm) {
        const v = (num(p, 'gg') * num(p, 'G') + num(p, 'gq') * num(p, 'Qpsi')) * num(p, 'fWV') * num(p, 'd'), u = (num(p, 'gg') * num(p, 'G') + num(p, 'gq') * num(p, 'Q')) * num(p, 'fWU') * num(p, 'd');
        expect(rel(v, p.resultado as number)).toBeLessThan(1e-9); expect(rel(u, num(p, 'aUso'))).toBeLessThan(1e-9);
        sV += v; sU += u;
      }
      const tV = ps.find((p) => p.descricao.startsWith('Acréscimo de momento ΔMtot,d com o vento'))!, tU = ps.find((p) => p.descricao.startsWith('Acréscimo de momento ΔMtot,d com o uso'))!;
      expect(rel(sV, tV.resultado as number)).toBeLessThan(1e-9); expect(rel(sU, tU.resultado as number)).toBeLessThan(1e-9);
      const gv = ps.find((p) => p.descricao === 'γz com o vento principal')!, gu = ps.find((p) => p.descricao === 'γz com o uso principal')!;
      expect(rel(1 / (1 - num(gv, 'dM') / num(gv, 'M1')), gv.resultado as number)).toBeLessThan(1e-9);
      expect(rel(1 / (1 - num(gu, 'dM') / num(gu, 'M1')), gu.resultado as number)).toBeLessThan(1e-9);
      expect(gv.resultado).toBe(gz.ventoPrincipal); expect(gu.resultado).toBe(gz.usoPrincipal);
      const fin = ps.find((p) => p.descricao.startsWith('γz da direção'))!;
      expect(fin.resultado).toBe(gz.max); expect(num(fin, 'ampliacao')).toBe(gz.ampliacao);
      expect(rel(gz.max > 1.1 ? 0.95 * gz.max : 1, gz.ampliacao)).toBeLessThan(1e-12);
    }
  });

  it('rigidez reduzida usada: pilares 0,8, vigas 0,4 e lajes 0,3 (Eci/Ecs registrado)', () => {
    const r = tp('Estabilidade global (γz) – rigidez');
    const por = Object.fromEntries(an.vento!.rigidez!.map((x) => [x.tipo, x]));
    expect(por.pilar.fator).toBe(0.8); expect(por['viga (grelha integrada)'].fator).toBe(0.4); expect(por['laje (grelha integrada)'].fator).toBe(0.3);
    expect(r).toHaveLength(an.vento!.rigidez!.length);
    for (const p of r) expect(p.entradas.fator).toBe(p.resultado);
  });

  it('desaprumo global: H, n, θ1 (1/300 a 1/200) e θa refeitos das entradas e iguais aos da análise', () => {
    const ps = tp('Desaprumo global (11.3.3.4.1)');
    expect(ps).toHaveLength(4);
    const [pH, pn, p1, pa] = ps, d = an.desaprumo!;
    expect(rel(num(pH, 'zTopo') - num(pH, 'zBase'), pH.resultado as number)).toBeLessThan(1e-9);
    expect(pH.resultado).toBe(d.H); expect(pH.resultado).toBe(an.vento!.altura);
    expect(pn.resultado).toBe(d.n); expect(num(pn, 'nAuto')).toBe(d.nAuto);
    const theta1 = Math.min(1 / 200, Math.max(1 / 300, 1 / (100 * Math.sqrt(num(p1, 'H')))));
    expect(rel(theta1, p1.resultado as number)).toBeLessThan(1e-9);
    expect(rel(num(pa, 'theta1') * Math.sqrt((1 + 1 / num(pa, 'n')) / 2), pa.resultado as number)).toBeLessThan(1e-9);
    expect(pa.resultado).toBe(d.thetaA);
    expect(p1.aConfirmar && pn.aConfirmar).toBe(true);
  });

  it('desaprumo global: F = θa·V por pavimento, Md,k = θa·ΣV·z e fração das zonas das entradas', () => {
    const d = an.desaprumo!;
    for (const k of d.verticais) {
      const ps = tp(`Desaprumo global – forças por pavimento (caso ${k})`);
      const forcas = ps.filter((p) => p.formula === 'F = θa·V'), md = ps.filter((p) => p.formula === 'Md,k = θa·Σ V·z');
      expect(forcas.length).toBeGreaterThan(0);
      for (const p of forcas) {
        expect(rel(num(p, 'thetaA') * num(p, 'V'), p.resultado as number)).toBeLessThan(1e-9);
        expect(num(p, 'thetaA')).toBe(d.thetaA);
        const pv = d.pavimentos.find((x) => x.z === num(p, 'z') && Math.abs(x.V[k] - num(p, 'V')) < 1e-9)!;
        expect(pv).toBeDefined();
        expect(num(p, 'V')).toBe(an.cargasPavimento[pv.pavimento][k]);
      }
      expect(md).toHaveLength(1);
      const soma = Object.keys(md[0].entradas).filter((q) => /^V\d+$/.test(q)).reduce((t, q) => t + num(md[0], q) * num(md[0], `z${q.slice(1)}`), 0);
      expect(rel(num(md[0], 'thetaA') * soma, md[0].resultado as number)).toBeLessThan(1e-9);
      expect(md[0].resultado).toBe(d.md[k]);
    }
  });

  it('desaprumo global: regra dos 30 % do vento por combinação ELU — Mw, Md e a decisão refeitos', () => {
    const ps = tp('Desaprumo global – regra dos 30 % do vento');
    let semVento = 0, soVento = 0, soDesap = 0, ambos = 0;
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps) {
      let Mw = 0, Md = 0, k = 0;
      while (`f${k}` in p.entradas) { Md += num(p, `f${k}`) * num(p, `Md${k}`); if (`Mw${k}` in p.entradas) Mw += num(p, `f${k}`) * num(p, `Mw${k}`); k++; }
      expect(Math.abs(Mw - num(p, 'Mw')) <= 1e-9 * Math.max(1, Math.abs(Mw))).toBe(true);
      expect(rel(Math.abs(Md), num(p, 'Md'))).toBeLessThan(1e-9);
      const sd = p.resultado as string, Mwa = Math.abs(num(p, 'Mw')), Mda = num(p, 'Md');
      if (Mda < 1e-9) continue;
      if (Mwa < 1e-9) { expect(sd).toMatch(/^sem vento/); semVento++; }
      else if (0.3 * Mwa >= Mda) { expect(sd).toMatch(/^só vento/); soVento++; }
      else if (Mwa < 0.3 * Mda) { expect(sd).toMatch(/^só desaprumo/); soDesap++; }
      else { expect(sd).toMatch(/^vento \+ desaprumo/); ambos++; }
    }
    expect(semVento).toBeGreaterThan(0);
    expect(semVento + soVento + soDesap + ambos).toBe(ps.length);
  });

  it('desaprumo global desligado: passo "não aplicado", a confirmar', () => {
    const bOff = predio({ desaprumoGlobal: 0 }), anOff = analisarEdificio(bOff);
    const m = memoriaDetalhada(bOff, { an: anOff }).memoria;
    const d = m.passos.filter((p) => p.elemento === 'Edifício' && p.topico.startsWith('Desaprumo'));
    expect(d).toHaveLength(1);
    expect(d[0].resultado).toBe('não aplicado'); expect(d[0].aConfirmar).toBe(true);
    expect(anOff.desaprumo).toBeUndefined();
  }, 120000);
});

describe('γz de cálculo (NBR 6118, 15.5.3): prédio de 3 pavimentos à mão', () => {
  // vento 10, 20 e 30 kN a 3, 6 e 9 m: M1,k = 30 + 120 + 270 = 420 kN·m. d = 2, 5 e 8 mm (Σd = 0,015 m). G = 800, Q = 200 (Σψ0·Q = 100, ψ0 = 0,5) kN
  // por pavimento; γg = γq = 1,4; ψ0,w = 0,6.
  const pavs = [{ d: 0.002, G: 800, Q: 200, Qpsi: 100 }, { d: 0.005, G: 800, Q: 200, Qpsi: 100 }, { d: 0.008, G: 800, Q: 200, Qpsi: 100 }];
  it('vento principal: M1,tot,d = 1,4·420 = 588; ΔMtot,d = (1,4·800 + 1,4·100)·1,4·0,015 = 26,46; γz = 1/(1 − 0,045)', () => {
    const r = gamaZDeCalculo(420, pavs, 1.4, 1.4, 0.6);
    expect(r.M1dV).toBeCloseTo(588, 9);
    expect(r.dV).toBeCloseTo(26.46, 9);
    expect(r.ventoPrincipal).toBeCloseTo(1 / 0.955, 12);
  });
  it('uso principal (vento acompanhante γq·ψ0,w = 0,84): M1,tot,d = 352,8; ΔMtot,d = (1,4·800 + 1,4·200)·0,84·0,015 = 17,64; γz = 1/(1 − 0,05)', () => {
    const r = gamaZDeCalculo(420, pavs, 1.4, 1.4, 0.6);
    expect(r.M1dU).toBeCloseTo(352.8, 9);
    expect(r.dU).toBeCloseTo(17.64, 9);
    expect(r.usoPrincipal).toBeCloseTo(1 / 0.95, 12);
  });
  it('sem vento (M1 = 0): γz = 1; deslocamento que anula a rigidez (ΔM ≥ M1): infinito', () => {
    expect(gamaZDeCalculo(0, pavs, 1.4, 1.4, 0.6).ventoPrincipal).toBe(1);
    expect(gamaZDeCalculo(10, pavs, 1.4, 1.4, 0.6).ventoPrincipal).toBe(Infinity);
  });
});

describe('P-Δ por iteração', () => {
  let b2: BuildingModel, an2: AnaliseEdificio, mem2: MemoriaDetalhada;
  beforeAll(() => {
    b2 = predio({ segundaOrdem: 1 });
    an2 = analisarEdificio(b2);
    mem2 = memoriaDetalhada(b2, { an: an2 }).memoria;
  }, 180000);

  it('uma linha por iteração, convergência e amplificação iguais às da análise', () => {
    const so = an2.segundaOrdem!;
    expect(so.combinacoes.length).toBeGreaterThan(0);
    for (const c of so.combinacoes) {
      const ps = mem2.passos.filter((p) => p.elemento === 'Edifício' && p.topico === `2ª ordem global (P-Δ) – ${c.nome}`);
      const its = ps.filter((p) => p.formula.startsWith('Δu'));
      expect(its).toHaveLength(c.iteracoes);
      its.forEach((p, i) => { expect(num(p, 'iteracao')).toBe(i + 1); expect(p.resultado).toBe(c.historico![i].du); });
      const fim = its.at(-1)!;
      expect(c.convergiu).toBe(num(fim, 'du') <= num(fim, 'tol') * Math.max(num(fim, 'um'), 1e-12));
      const res = ps.at(-1)!;
      expect(rel(num(res, 'uh2') / num(res, 'uh1'), res.resultado as number)).toBeLessThan(1e-9);
      expect(res.resultado).toBe(c.amplificacao);
      expect(num(res, 'iteracoes')).toBe(c.iteracoes);
    }
  });

  it('sem o P-Δ não há passos de 2ª ordem global', () => {
    expect(mem.passos.some((p) => p.topico.startsWith('2ª ordem global'))).toBe(false);
  });
});

describe('análise com a memória ligada é idêntica à desligada', () => {
  it('analisarEdificio dentro de comMemoria dá o mesmo resultado (toEqual)', () => {
    const a0 = analisarEdificio(b);
    const a1 = comMemoria(new Registrador(), () => analisarEdificio(b));
    expect(sem(a1)).toEqual(sem(a0));
  }, 180000);
});
