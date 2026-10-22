// Frente N2f: etapas de carga, flecha ativa, limites, Branson homogeneizado e fissuração das lajes.
import { describe, expect, it } from 'vitest';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { concrete } from '../concrete';
import { deltaXi } from '../design';
import type { AnaliseEdificio } from './analitico';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio, flechasVigaSets } from './dimensionamento';
import { bransonFlecha, composicaoEtapas, ETAPAS_PADRAO, inerciaMediaVao, lerEtapasColadas, limiteFlecha, limitesEmUso, linhasFlechas, memorialFlechas, mensagensFlechasNovas, resumoFlechas, textoLimite, validarEtapas, xiDias, xiNBR, type EtapaCarga } from './flechas';
import { opcoesEmUso } from './opcoes';
import { ANTES_N2F } from './antesN2f';
import { classificar } from './revisao';
import { sugestaoDe } from './sugestoes';
import { comandosEdificioPadrao, Sessao } from '../commands';

const E = 30e6, bw = 0.2, h = 0.5, I = (bw * h ** 3) / 12;
/** Pórtico mínimo de uma viga em x com nós a cada L/nb; `carga(k)` = q da barra k (caso G); Q = mesma carga × 0,5. */
function viga(L: number, nb: number, apoios: number[], carga: (k: number) => number) {
  const nos: [number, number, number][] = Array.from({ length: nb + 1 }, (_, k) => [(k * L) / nb, 0, 0]);
  const m: Modelo3 = { nos, barras: [], apoios: new Map() };
  for (let k = 0; k < nb; k++) m.barras.push({ i: k, j: k + 1, E, G: E / 2, A: bw * h, Iz: I, Iy: (h * bw ** 3) / 12, J: 1e-3 });
  for (const a of apoios) m.apoios.set(a, a === apoios[0] ? [0, 1, 2, 3] : [1, 2, 3]);
  const g: Caso3 = { nodais: [], distribuidas: m.barras.map((_, i) => ({ barra: i, q: [0, 0, -carga(i)] })) };
  const q: Caso3 = { nodais: [], distribuidas: m.barras.map((_, i) => ({ barra: i, q: [0, 0, -0.5 * carga(i)] })) };
  const res = resolver3(m, [g, q]);
  const an = { casos: ['G', 'Q'], vento: null, portico: { modelo: m, barras: m.barras.map(() => ({ tipo: 'viga', ref: 'v', pavimento: 'p' })), mestres: {}, zonas: {}, res, casos: [g, q] } } as unknown as AnaliseEdificio;
  const uso = new Map(nos.map((_, k) => [k, k === 0 || k === nb ? 1 : 2]));
  return { an, membros: m.barras.map((_, i) => i), noPilar: new Set(apoios), uso };
}
const SETS = [{ G: 1, Q: 0 }, { G: 0, Q: 1 }, { G: 0, Q: 0.3 }];

describe('ξ(t) e composição por etapas (NBR 6118, 17.3.2.1.2)', () => {
  it('ξ da Tabela 17.1 e coerência com o αf de uma idade só', () => {
    expect(xiNBR(1)).toBeCloseTo(0.68 * 0.996, 12);
    expect(xiNBR(71)).toBe(2);
    expect(2 - xiDias(30)).toBeCloseTo(deltaXi(1), 12);
    // tudo aplicado aos 30 dias, ρ′ = 0: total = (1 + αf)·instantânea
    const uma: EtapaCarga[] = [{ nome: 'tudo', dias: 30, pp: 1, alvenaria: 1, revestimento: 1, variavel: 1 }];
    const c = composicaoEtapas(uma, { pp: 4, alvenaria: 1, revestimento: 1, q: 2, qqp: 2 }, { qInstantanea: 'qp' });
    expect(c.total).toBeCloseTo(8 * (1 + deltaXi(1)), 12);
    expect(c.tParedes).toBe(30);
    expect(c.ativa).toBeCloseTo(c.total, 12); // tudo aplicado junto com as paredes
  });

  it('exemplo registrado: ξ médio ≈ 1,05, total 3,00·δi e ativa ≈ 1,965·δi com Ke = 1,5', () => {
    // ξ das idades do exemplo (28 d 0,7; 60 d 0,8; 120 d 1,0; 1 ano 1,4; ∞ 2,0); δ por kN/m² = 1 (δi da carga total 10,5)
    const tab = new Map([[28, 0.7], [60, 0.8], [120, 1.0], [365, 1.4]]);
    const xi = (d: number) => (Number.isFinite(d) ? tab.get(d)! : 2);
    const Ke = 1.5, di = 10.5;
    const c = composicaoEtapas(ETAPAS_PADRAO, { pp: 6.5 * Ke, alvenaria: 1 * Ke, revestimento: 1 * Ke, q: 2 * Ke, qqp: 0.6 * Ke }, { rho: 0.001, xi });
    expect(c.instantanea).toBeCloseTo(Ke * di, 12);
    expect(c.xiMedio).toBeCloseTo(11.01 / 10.5, 12); // 1,049
    expect(c.lambda).toBeCloseTo(11.01 / 10.5 / 1.05, 12); // ≈ 1,00
    expect(c.total / di).toBeCloseTo(3.0, 2);
    expect(c.xiMedioAtiva).toBeCloseTo(10.36 / 10.5, 12); // 0,987
    // ativa = (4/10,5 + 0,987/1,05)·1,5·δi = 1,981·δi; o texto registrado (λ arredondado para 0,93) dá 1,965
    expect(c.ativa / di).toBeCloseTo(1.5 * (4 / 10.5 + 10.36 / 10.5 / 1.05), 12);
    expect(Math.abs(c.ativa / di - 1.965)).toBeLessThan(0.02);
    expect(c.antes).toBeCloseTo(c.total - c.ativa, 12);
    // αg·fg + αq·fq = ativa
    expect(c.alfaG * (6.5 + 1 + 1) * Ke + c.alfaQ * 2 * Ke).toBeCloseTo(c.ativa, 12);
    expect(c.porEtapa.map((e) => +e.dXi.toFixed(2))).toEqual([1.3, 1.2, 1.0, 0.6]);
    expect(c.porEtapa.map((e) => +e.dXiAtiva.toFixed(2))).toEqual([1.2, 1.2, 1.0, 0.6]);
  });

  it('validação das etapas', () => {
    expect(validarEtapas(ETAPAS_PADRAO)).toBeNull();
    expect(validarEtapas([])).toMatch(/vazia/);
    expect(validarEtapas([{ nome: 'a', dias: 0, pp: 1, alvenaria: 0, revestimento: 0, variavel: 0 }])).toMatch(/idade/);
    expect(validarEtapas([{ nome: 'a', dias: 10, pp: 0.6, alvenaria: 0, revestimento: 0, variavel: 0 }, { nome: 'b', dias: 20, pp: 0.6, alvenaria: 0, revestimento: 0, variavel: 0 }])).toMatch(/soma/);
  });
});

describe('limites de flecha (ℓ/x, ℓ/x + cm, absoluto)', () => {
  it('formas e textos', () => {
    expect(limiteFlecha(4, { rel: 500, abs: 1 })).toBeCloseTo(0.008, 12);
    expect(limiteFlecha(6, { rel: 500, abs: 1 })).toBeCloseTo(0.01, 12);
    expect(limiteFlecha(5, { rel: 250, mais: 1 })).toBeCloseTo(0.03, 12);
    expect(limiteFlecha(2, { rel: 250 }, true)).toBeCloseTo(0.016, 12);
    expect(limiteFlecha(5, { rel: 0, abs: 2 })).toBeCloseTo(0.02, 12);
    expect(limiteFlecha(5, { rel: 0 })).toBe(Infinity);
    expect(textoLimite({ rel: 500, abs: 1 })).toBe('ℓ/500 e 1 cm');
    expect(textoLimite({ rel: 250, mais: 1.5 }, true)).toBe('2ℓ/250 + 1,5 cm');
  });
  it('limites em uso: opções gerais e os do tipo de elemento', () => {
    const op = opcoesEmUso();
    expect(limitesEmUso({}, op, 'viga')).toEqual({ total: { rel: 250 }, ativa: { rel: 500, abs: 1 }, variavel: { rel: 350 }, instantanea: { rel: 0 } });
    expect(limitesEmUso({ flechas: { limites: { macica: { ativa: { rel: 400 } } } } }, op, 'macica').ativa).toEqual({ rel: 400 });
  });
});

describe('Branson e Mr (NBR 6118, 17.3.1 e 17.3.2.1.1) contra cálculo manual', () => {
  const c = concrete(30);
  it('laje maciça h = 12 cm, As = 3,5 cm²/m, Ma = 15 kN·m/m (seção bruta)', () => {
    const hL = 0.12, d = 0.09, As = 3.5e-4, Ma = 15;
    const Ic = hL ** 3 / 12, Mr = ((1.5 * c.fctm * Ic) / (hL / 2)) * 1000;
    const ae = 210000 / c.Ecs, x = (-ae * As + Math.sqrt((ae * As) ** 2 + 2 * ae * As * d)) / 1; // b = 1: x²/2 = αe·As·(d − x)
    const III = x ** 3 / 3 + ae * As * (d - x) ** 2, k = (Mr / Ma) ** 3;
    const r = bransonFlecha({ kind: 'rect', bw: 1, h: hL }, false, As, d, Ma, c);
    expect(r.Mr).toBeCloseTo(Mr, 9);
    expect(Mr).toBeCloseTo(10.43, 2);
    expect(r.III).toBeCloseTo(III, 9);
    expect(r.Ie).toBeCloseTo(k * Ic + (1 - k) * III, 9);
  });
  it('seção homogeneizada (αe = Es/Ecs): inércia de estádio I e Mr maiores', () => {
    const b = 0.2, hv = 0.5, d = 0.45, As = 4e-4, Ac = 1e-4, dC = 0.04, ae = 210000 / c.Ecs, n = ae - 1;
    const A = b * hv + n * (As + Ac), yc = ((b * hv * hv) / 2 + n * (As * d + Ac * dC)) / A;
    const I1 = (b * hv ** 3) / 12 + b * hv * (hv / 2 - yc) ** 2 + n * (As * (d - yc) ** 2 + Ac * (yc - dC) ** 2);
    const r = bransonFlecha({ kind: 'rect', bw: b, h: hv }, false, As, d, 10, c, true, Ac, dC);
    expect(r.I1).toBeCloseTo(I1, 12);
    expect(r.I1).toBeGreaterThan((b * hv ** 3) / 12);
    expect(r.Mr).toBeCloseTo(((1.5 * c.fctm * I1) / (hv - yc)) * 1000, 9);
    expect(r.Ie).toBeCloseTo(I1, 12); // Ma < Mr: estádio I
    expect(inerciaMediaVao(1, 3, 5)).toBe(3.5);
  });
});

describe('vigas: integração da curvatura com etapas (cálculo manual)', () => {
  it('biapoiada elástica: 5qL⁴/384EI por conjunto de fatores e composição por etapas', () => {
    const L = 6, q = 10, v = viga(L, 6, [0, 6], () => q);
    const [cad] = flechasVigaSets(v.an, v.membros, v.noPilar, v.uso, () => E * I, SETS[0], SETS);
    const f0 = (5 * q * L ** 4) / (384 * E * I);
    expect(cad.d[0] / f0).toBeCloseTo(1, 3); // estações a cada 0,1 m (ponto médio)
    expect(cad.d[1] / cad.d[0]).toBeCloseTo(0.5, 12);
    expect(cad.d[2] / cad.d[0]).toBeCloseTo(0.15, 12);
    // G toda no peso próprio aos 28 d; ψ2·Q aos 365 d (sem paredes: ativa = total)
    const et: EtapaCarga[] = [{ nome: 'pp', dias: 28, pp: 1, alvenaria: 0, revestimento: 0, variavel: 0 }, { nome: 'uso', dias: 365, pp: 0, alvenaria: 0, revestimento: 0, variavel: 1 }];
    const c = composicaoEtapas(et, { pp: cad.d[0], alvenaria: 0, revestimento: 0, q: cad.d[1], qqp: cad.d[2] });
    const g = cad.d[0], manual = g + 0.5 * g + g * (2 - xiDias(28)) + 0.15 * g * (2 - xiDias(365));
    expect(c.total).toBeCloseTo(manual, 9);
  });

  it('biapoiada fissurada (Branson por seção) contra integração manual de M·m/EI(M)', () => {
    const L = 6, q = 20, c = concrete(30), As = 6e-4, d = 0.45, v = viga(L, 12, [0, 12], () => q);
    const EIb = (M: number) => c.Ecs * 1000 * bransonFlecha({ kind: 'rect', bw, h }, false, As, d, M, c).Ie;
    const [cad] = flechasVigaSets(v.an, v.membros, v.noPilar, v.uso, EIb, SETS[0], [SETS[0]]);
    // flecha no meio do vão por trabalho virtual: ∫ M(x)·m(x)/EI(M(x)) dx, m = x/2 até L/2 (simetria), 20 000 trechos
    const n = 20000; let w = 0;
    for (let k = 0; k < n; k++) { const x = ((k + 0.5) * L) / n, M = (q * x * (L - x)) / 2, m = x <= L / 2 ? x / 2 : (L - x) / 2; w += (M * m) / EIb(M) * (L / n); }
    expect(cad.d[0] / w).toBeCloseTo(1, 3);
    expect(cad.d[0]).toBeGreaterThan((5 * q * L ** 4) / (384 * c.Ecs * 1000 * I)); // fissurada > elástica com Ecs
  });

  it('contínua de dois vãos: qL⁴/185EI por vão e etapas com alvenaria (ativa < total)', () => {
    const L = 5, q = 10, v = viga(2 * L, 20, [0, 10, 20], () => q);
    const cads = flechasVigaSets(v.an, v.membros, v.noPilar, v.uso, () => E * I, SETS[0], SETS);
    expect(cads).toHaveLength(2);
    const fm = (q * L ** 4) / (185 * E * I);
    for (const cd of cads) expect(cd.d[0] / fm).toBeCloseTo(1, 2);
    const c = composicaoEtapas(ETAPAS_PADRAO, { pp: 0.6 * cads[0].d[0], alvenaria: 0.3 * cads[0].d[0], revestimento: 0.1 * cads[0].d[0], q: cads[0].d[1], qqp: cads[0].d[2] });
    const g = cads[0].d[0], qq = cads[0].d[1], qp = cads[0].d[2], X = (dd: number) => 2 - xiDias(dd);
    expect(c.total).toBeCloseTo(g + qq + 0.6 * g * X(28) + 0.3 * g * X(60) + 0.1 * g * X(120) + qp * X(365), 9);
    expect(c.ativa).toBeCloseTo(0.3 * g + 0.1 * g + qq + 0.6 * g * X(60) + 0.3 * g * X(60) + 0.1 * g * X(120) + qp * X(365), 9);
  });

  it('balanço com o giro do apoio: qa⁴/8EI + (qa²/2)·(L/3EI)·a', () => {
    const L = 6, a = 2, q = 10, nb = 16; // nós a cada 0,5 m; apoios em 0 e 6 m, balanço até 8 m
    const v = viga(L + a, nb, [0, 12], (k) => (k >= 12 ? q : 0));
    const cads = flechasVigaSets(v.an, v.membros, v.noPilar, v.uso, () => E * I, SETS[0], [SETS[0]], true);
    const bal = cads.find((x) => x.balanco)!;
    expect(bal.d[0]).toBeCloseTo((q * a ** 4) / (8 * E * I) + ((q * a * a) / 2) * (L / (3 * E * I)) * a, 6);
    const sem = flechasVigaSets(v.an, v.membros, v.noPilar, v.uso, () => E * I, SETS[0], [SETS[0]]).find((x) => x.balanco)!;
    expect(sem.d[0]).toBeCloseTo((q * a ** 4) / (8 * E * I), 6);
  });
});

describe('tabela de flechas por tipo', () => {
  it('linhasFlechas: mm, limites e situação', () => {
    const inst = { pp: 0.002, alvenaria: 0.001, revestimento: 0.001, q: 0.002, qqp: 0.0006 };
    const f = resumoFlechas({ metodo: 'etapas', instantaneas: inst, instantanea: 0.006, diferida: 0.005, total: 0.011, ativa: 0.0125, variavel: 0.002, vao: 5, balanco: false, rho: 0 }, limitesEmUso({}, opcoesEmUso(), 'viga'));
    expect(linhasFlechas(f)).toEqual([
      { tipo: 'total', rotulo: 'Total a longo prazo', mm: 11, limiteMm: 20, texto: 'ℓ/250', ok: true },
      { tipo: 'ativa', rotulo: 'Ativa (após as paredes)', mm: 12.5, limiteMm: 10, texto: 'ℓ/500 e 1 cm', ok: false },
      { tipo: 'variavel', rotulo: 'Instantânea da variável', mm: 2, limiteMm: (5 / 350) * 1000, texto: 'ℓ/350', ok: true },
      { tipo: 'instantanea', rotulo: 'Instantânea total', mm: 6, limiteMm: null, texto: '—', ok: true },
    ]);
    expect(mensagensFlechasNovas(f)).toEqual(['Flecha ativa 12,5 mm > ℓ/500 e 1 cm = 10,0 mm (após as paredes).']);
  });
});

describe('colagem de etapas', () => {
  it('lê tabulação ou ponto e vírgula, vírgula decimal, % e cabeçalho', () => {
    const r = lerEtapasColadas('Etapa\tDias\tPP\tAlv\tRev\tQ\nDesforma\t28\t1\t0\t0\t0\nAlvenaria;60;0;100%;0;0\nUso\t365\t0\t0\t1\t0,5');
    expect(r).toEqual([
      { nome: 'Desforma', dias: 28, pp: 1, alvenaria: 0, revestimento: 0, variavel: 0 },
      { nome: 'Alvenaria', dias: 60, pp: 0, alvenaria: 1, revestimento: 0, variavel: 0 },
      { nome: 'Uso', dias: 365, pp: 0, alvenaria: 0, revestimento: 1, variavel: 0.5 },
    ]);
    expect(lerEtapasColadas('A\t10\t0,7\nB\t20\t0,7')).toMatch(/soma/);
    expect(lerEtapasColadas('A\t10\t1\nB\tx\t0')).toMatch(/Linha 2/);
  });
});

describe('revisão e memorial', () => {
  it('códigos FLECHA_ATIVA (erro) e FLECHA_INST (aviso) com sugestão', () => {
    expect(classificar('Flecha ativa 12,0 mm > ℓ/500 e 1 cm = 10,0 mm (após as paredes).')).toEqual({ codigo: 'FLECHA_ATIVA', nivel: 'erro' });
    expect(classificar('Flecha instantânea 9,0 mm > ℓ/600 = 8,0 mm.')).toEqual({ codigo: 'FLECHA_INST', nivel: 'aviso' });
    expect(sugestaoDe('FLECHA_ATIVA')).toBeTruthy();
    expect(sugestaoDe('FLECHA_INST')).toBeTruthy();
  });
  it('dados do memorial: etapas com ξ e Δξ por tipo de elemento', () => {
    const m = memorialFlechas({ flechas: { etapas: { macica: [{ nome: 'x', dias: 30, pp: 1, alvenaria: 1, revestimento: 1, variavel: 1 }] } } } as never, opcoesEmUso());
    expect(m.map((x) => x.tipo)).toEqual(['viga', 'macica', 'trelicada']);
    expect(m[0].etapas).toHaveLength(4);
    expect(m[0].tParedes).toBe(60);
    expect(m[1].proprias).toBe(true);
    expect(m[1].etapas[0].dXi).toBeCloseTo(deltaXi(1), 12);
    expect(m[0].limites.ativa).toBe('ℓ/500 e 1 cm');
  });
});

describe('edifício: flechas por tipo no dimensionamento', () => {
  function edificio(opcoes: Record<string, number>, perfil?: 'nbr') {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
    s.executar('lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
    s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    if (perfil) s.executar('opcoes.definir', { perfil });
    if (Object.keys(opcoes).length) s.executar('opcoes.definir', { valores: opcoes });
    return s;
  }
  it('vigas e lajes com flechas por tipo; ANTES_N2F volta ao fator único', { timeout: 60000 }, () => {
    const s = edificio({}), an = analisarEdificio(s.modelo), d = dimensionarEdificio(s.modelo, an);
    const v = d.vigas[0].flechas!;
    expect(v.metodo).toBe('etapas');
    expect(v.total).toBeCloseTo(d.vigas[0].flecha, 12);
    expect(v.ativa).toBeLessThan(v.total);
    expect(v.ativa).toBeGreaterThan(0);
    expect(v.limites.ativa).toBeCloseTo(Math.min(6 / 500, 0.01), 3);
    expect(v.etapas!.porEtapa).toHaveLength(4);
    const l = d.lajes[0].flechas!;
    expect(l.metodo).toBe('simplificado');
    // perfil do sistema: ativa = (G + Q) elástica × 2,0; variável = Q × 1,5
    expect(l.ativa / (l.instantanea)).toBeCloseTo(2.0, 9);
    expect(l.variavel / l.instantaneas.q).toBeCloseTo(1.5, 9);
    // opções de antes da N2f: viga = (G + ψ2Q)·(1 + αf) e laje variável elástica
    const s0 = edificio(ANTES_N2F), d0 = dimensionarEdificio(s0.modelo, analisarEdificio(s0.modelo));
    const v0 = d0.vigas[0].flechas!;
    expect(v0.metodo).toBe('fator');
    expect(d0.vigas[0].flecha).toBeCloseTo((v0.instantaneas.pp + v0.instantaneas.alvenaria + v0.instantaneas.revestimento + v0.instantaneas.qqp) * (1 + deltaXi(1)), 12);
    expect(d0.lajes[0].flechaQ).toBeCloseTo(d0.lajes[0].flechas!.instantaneas.q, 12);
    expect(d0.vigas.every((x) => !x.mensagens.some((m) => m.startsWith('Flecha ativa')))).toBe(true);
  });
  it('perfil NBR: lajes pelo método por etapas com a grelha fissurada', { timeout: 60000 }, () => {
    const s = edificio({}, 'nbr'), d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    const l = d.lajes[0].flechas!;
    expect(l.metodo).toBe('etapas');
    expect(l.fissuracao ?? 1).toBeGreaterThanOrEqual(1);
    expect(l.total).toBeGreaterThan(l.instantanea);
    expect(l.ativa).toBeLessThanOrEqual(l.total + 1e-12);
    // sem fissuração, a instantânea cai para a elástica
    const s2 = edificio({ fissuracaoLajes: 0 }, 'nbr'), l2 = dimensionarEdificio(s2.modelo, analisarEdificio(s2.modelo)).lajes[0].flechas!;
    expect(l2.instantanea).toBeLessThanOrEqual(l.instantanea + 1e-15);
    expect(l.instantanea / l2.instantanea).toBeCloseTo(l.fissuracao ?? 1, 9);
  });
  it('comandos etapas.definir e flechas.limites', () => {
    const s = edificio({});
    expect(s.executar('etapas.definir', { etapas: [{ nome: 'a', dias: 10, pp: 0.7 }, { nome: 'b', dias: 20, pp: 0.7 }] }).erros[0].codigo).toBe('ETAPAS_INVALIDAS');
    expect(s.executar('etapas.definir', {}).erros[0].codigo).toBe('ETAPAS_VAZIAS');
    expect(s.executar('etapas.definir', { elemento: 'macica', etapas: [{ nome: 'Tudo', dias: 30, pp: 1, alvenaria: 1, revestimento: 1, variavel: 1 }] }).ok).toBe(true);
    expect(s.modelo.flechas?.etapas?.macica?.[0].revestimento).toBe(1);
    expect(s.modelo.flechas?.etapas?.viga).toBeUndefined();
    expect(s.executar('etapas.definir', { padrao: true }).ok).toBe(true);
    expect(s.modelo.flechas).toBeUndefined();
    expect(s.executar('flechas.limites', { elemento: 'viga', limite: { rel: 300 } }).erros[0].codigo).toBe('LIMITE_SEM_TIPO');
    expect(s.executar('flechas.limites', { elemento: 'viga', tipo: 'total', limite: { rel: 300, mais: 1 } }).ok).toBe(true);
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    expect(d.vigas[0].limite).toBeCloseTo(6 / 300 + 0.01, 3);
    expect(s.executar('flechas.limites', { elemento: 'viga', padrao: true }).ok).toBe(true);
    expect(s.modelo.flechas).toBeUndefined();
  });
});
