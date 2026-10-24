// Escadas (E4c): cálculo do lance por casca contra soluções analíticas (viga biapoiada inclinada com carga por projeção,
// lance com patamar, apoio elástico e rígido no patamar), equilíbrio, reações como cargas e integração com a análise do edifício.
// O L de três trechos contra o OpenSees fica em escadasCalculo.validacao.test.ts.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { assinaturaEscadas, calcularEscadas, cargasDasEscadas, comEscadas, diagnosticoRecalcular } from './escadasCalculo';
import { OPCOES_PADRAO_CALCULO } from './opcoes';
import { concretoDe, gamas } from './materiais';
import { classificar } from './revisao';
import type { BuildingModel } from './types';

const E = 0.5 / 3, PISO = 0.2967;
const novo = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((x) => x.mensagem).join(' ')}`).toBe(true); };

interface Ent { tipo: Record<string, unknown>; escada?: Record<string, unknown>; opcoes?: Record<string, number>; lance?: Record<string, unknown> }
function escada({ tipo, escada: esc = {}, opcoes, lance = {} }: Ent) {
  const s = novo();
  ok(s, 'tipoLance.criar', { id: 'T', tipo: { nome: 'T', ...tipo } });
  ok(s, 'escada.criar', { id: 'e1', grupo: 'g_3', origem: [0, 0], angulo: 0, piso: PISO, espelho: E, lances: [{ tipo: 'T', ...lance }], ...esc });
  if (opcoes) ok(s, 'opcoes.definir', { valores: opcoes });
  const b = s.modelo, res = calcularEscadas(b);
  return { s, b, res, l: res.lances[0], g: b.escadas![0] };
}
const soma = (a: number[]) => a.reduce((x, y) => x + y, 0);
const maxMx = (l: { elems: { G: number[]; Q: number[] }[] }, c: 'G' | 'Q') => Math.max(...l.elems.map((e) => e[c][3]));

describe('E4c: lance reto biapoiado contra a viga inclinada', () => {
  // espessura informada 15 cm; 17 pisos de 29,67 cm até o patamar (último degrau no piso de cima): ℓ = 5,0439 m na horizontal
  const r = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
  const l = r.l, geo = calcularEscadas(r.b).lances[0];
  const ell = 17 * PISO, w = 1.2, cosA = PISO / Math.hypot(PISO, E), sinA = E / Math.hypot(PISO, E);
  const pg = 25 * 0.15 / cosA + 25 * E / 2 + 1, pq = 2.5; // kN/m² da projeção: laje/cosα + degraus + revestimento
  const EI = concretoDe(r.b, 'laje').Ecs * 1000 * 0.15 ** 3 / 12;
  it('sem erro, 2 apoios, sem avisos', () => {
    expect(l.erro).toBeUndefined();
    expect(l.avisos).toEqual([]);
    expect(l.apoios.map((a) => a.id)).toEqual(['inf', 'sup']);
    expect(geo.elementos).toBeGreaterThan(100);
  });
  it('carga total = q·ℓ·largura e equilíbrio vertical em 1e-9', () => {
    expect(l.carga.G).toBeCloseTo(pg * ell * w, 8);
    expect(l.carga.Q).toBeCloseTo(pq * ell * w, 8);
    expect(Math.abs(l.equilibrio.G)).toBeLessThan(1e-9);
    expect(Math.abs(l.equilibrio.Q)).toBeLessThan(1e-9);
    expect(soma(l.apoios.map((a) => a.reacao.G))).toBeCloseTo(l.carga.G, 8);
  });
  it('reações iguais a q·ℓ/2 por apoio (carga por projeção) e sem reação horizontal', () => {
    for (const a of l.apoios) {
      expect(a.reacao.G).toBeCloseTo((pg * ell * w) / 2, 8);
      expect(a.reacao.Q).toBeCloseTo((pq * ell * w) / 2, 8);
      expect(a.horizontal.G).toBeLessThan(1e-7);
      expect(a.porMetro.G).toBeCloseTo((pg * ell) / 2, 8);
    }
  });
  it('momento no meio do vão = q·ℓ²/8 por metro (tolerância 1 %)', () => {
    expect(maxMx(l, 'G') / ((pg * ell * ell) / 8)).toBeGreaterThan(0.99);
    expect(maxMx(l, 'G') / ((pg * ell * ell) / 8)).toBeLessThan(1.005);
    expect(maxMx(l, 'Q') / ((pq * ell * ell) / 8)).toBeGreaterThan(0.99);
    expect(maxMx(l, 'Q') / ((pq * ell * ell) / 8)).toBeLessThan(1.005);
    // momento transversal e de torção desprezíveis
    expect(Math.abs(l.momentos.MyNeg)).toBeLessThan(0.05 * l.momentos.MxPos);
  });
  it('flecha vertical = 5qℓ⁴/(384EI·cosα), até 3 % (cortante e deformação axial)', () => {
    const d = (5 * pg * ell ** 4) / (384 * EI * cosA);
    expect(l.deslocamento.G / d).toBeGreaterThan(0.99);
    expect(l.deslocamento.G / d).toBeLessThan(1.03);
  });
  it('esforço normal no quarto do vão = −(q·ℓ/4)·senα (compressão ao longo do lance)', () => {
    // elemento mais próximo de x = ℓ/4 (comprimento inclinado ℓ/(cosα·4) a partir da borda inferior)
    const alvo = ell / 4;
    const el = [...l.elems].sort((a, b) => Math.abs(a.centro[0] - alvo) - Math.abs(b.centro[0] - alvo)).slice(0, 8);
    const Nx = soma(el.map((e) => e.G[0])) / el.length, x = soma(el.map((e) => e.centro[0])) / el.length;
    const esperado = -pg * (ell / 2 - x) * sinA;
    expect(Nx / esperado).toBeGreaterThan(0.95);
    expect(Nx / esperado).toBeLessThan(1.05);
  });
  it('cargas geradas: duas linhas uniformes G e Q de q·ℓ/2 kN/m nas bordas de apoio', () => {
    const c = l.cargas.filter((x) => x.tipo === 'linha');
    expect(c).toHaveLength(4);
    const inf = c.find((x) => x.apoio === 'inf' && x.caso === 'G')!;
    expect(inf.valor).toBeCloseTo((pg * ell) / 2, 8);
    expect(inf.pontos).toEqual([[0, -0.6], [0, 0.6]].map((q) => [expect.closeTo(q[0], 9), expect.closeTo(q[1], 9)]));
    expect(c.find((x) => x.apoio === 'sup' && x.caso === 'Q')!.valor).toBeCloseTo((pq * ell) / 2, 8);
    expect(c.every((x) => x.grupo === 'g_3')).toBe(true);
  });
  it('lance rotacionado (45°) e deslocado dá as mesmas reações (cálculo em coordenadas do modelo)', () => {
    const r2 = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 }, escada: { origem: [3.3, -1.2], angulo: 45 } });
    expect(r2.l.apoios[0].reacao.G).toBeCloseTo(l.apoios[0].reacao.G, 6);
    expect(r2.l.deslocamento.G).toBeCloseTo(l.deslocamento.G, 7);
  });
  it('malha mais fina converge: momento e flecha variam menos de 1 %', () => {
    const f = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 }, opcoes: { escadaMalha: 0.15 } }).l;
    expect(f.elementos).toBeGreaterThan(l.elementos * 2);
    expect(Math.abs(f.deslocamento.G / l.deslocamento.G - 1)).toBeLessThan(0.01);
    expect(Math.abs(maxMx(f, 'G') / maxMx(l, 'G') - 1)).toBeLessThan(0.01);
  });
  it('corrimão: carga de borda somada ao total', () => {
    const c = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 }, escada: { corrimao: 0.5 } }).l;
    const inclinado = Math.hypot(ell, 17 * E);
    expect(c.carga.G - l.carga.G).toBeCloseTo(0.5 * inclinado, 8);
    expect(Math.abs(c.equilibrio.G)).toBeLessThan(1e-9);
  });
  it('dois apoios fixos num lance reto: sem empuxo (a corda é o eixo), reações iguais às do apoio simples', () => {
    const f = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 }, opcoes: { escadaApoioFixoDois: 1 } }).l;
    expect(f.apoios[0].horizontal.G).toBeLessThan(0.05);
    expect(f.apoios[0].reacao.G).toBeCloseTo(l.apoios[0].reacao.G, 1);
    expect(Math.abs(f.equilibrio.G)).toBeLessThan(1e-9);
  });
  it('dois apoios fixos com patamar (eixo quebrado): empuxo horizontal igual nos dois apoios, aviso e momento diferente do apoio simples', () => {
    const t = { tipologia: 'consecutivos2', trechos: [12, 6], espessura: 0.15 };
    const a = escada({ tipo: t }).l, f = escada({ tipo: t, opcoes: { escadaApoioFixoDois: 1 } }).l;
    expect(a.apoios[0].horizontal.G).toBeLessThan(1e-6);
    expect(f.apoios[0].horizontal.G).toBeGreaterThan(0.5);
    expect(Math.abs(f.apoios[0].horizontal.G - f.apoios[1].horizontal.G)).toBeLessThan(1e-6);
    expect(Math.abs(maxMx(f, 'G') / maxMx(a, 'G') - 1)).toBeGreaterThan(0.01);
    expect(Math.abs(f.equilibrio.G)).toBeLessThan(1e-9);
    expect(f.avisos.some((x) => /reação horizontal/.test(x))).toBe(true);
  });
});

/** Momentos e reações de uma viga horizontal equivalente com cargas por trechos (vão horizontal). Tipo: biapoiada, ou com apoio no meio. */
function viga(trechos: { x0: number; x1: number; p: number; cos: number }[], ell: number, EI: number, apoio?: { x: number; k?: number }) {
  const N = 20000, dx = ell / N, xs = Array.from({ length: N }, (_, i) => (i + 0.5) * dx);
  const pAt = (x: number) => trechos.find((t) => x >= t.x0 - 1e-12 && x <= t.x1 + 1e-12)!;
  const RA0 = trechos.reduce((s, t) => s + t.p * (t.x1 - t.x0) * (ell - (t.x0 + t.x1) / 2), 0) / ell;
  const M0 = (x: number) => { let m = RA0 * x; for (const t of trechos) { const a = t.x0, c = Math.min(t.x1, x); if (c > a) m -= t.p * (c - a) * (x - (a + c) / 2); } return m; };
  let R = 0;
  if (apoio) {
    // reação do apoio intermediário por flexibilidade: δ0 = ∫M0·m ds/EI; f = ∫m² ds/EI (ds = dx/cosα), m = momento de uma carga unitária em xc
    const xc = apoio.x, mu = (x: number) => (x <= xc ? ((ell - xc) * x) / ell : (xc * (ell - x)) / ell);
    let d0 = 0, f = 0;
    for (const x of xs) { const ds = dx / pAt(x).cos; d0 += (M0(x) * mu(x) * ds) / EI; f += (mu(x) * mu(x) * ds) / EI; }
    R = d0 / (f + (apoio.k ? 1 / apoio.k : 0));
    const mu2 = mu;
    return { R, M: (x: number) => M0(x) - R * mu2(x), xs, RA0 };
  }
  return { R, M: M0, xs, RA0 };
}

describe('E4c: lance com patamar (consecutivos 9 + 9) contra a viga equivalente', () => {
  const tipo = { tipologia: 'consecutivos2', trechos: [9, 9], espessura: 0.15 };
  const livre = escada({ tipo });
  const l = livre.l, w = 1.2, cosA = PISO / Math.hypot(PISO, E);
  const R1 = 8 * PISO, Lp = 1.2, R3 = 8 * PISO, ell = R1 + Lp + R3;
  const pInc = 25 * 0.15 / cosA + 25 * E / 2 + 1, pPat = 25 * 0.15 + 1, q = 2.5;
  const EI = concretoDe(livre.b, 'laje').Ecs * 1000 * 0.15 ** 3 / 12;
  const trG = [{ x0: 0, x1: R1, p: pInc, cos: cosA }, { x0: R1, x1: R1 + Lp, p: pPat, cos: 1 }, { x0: R1 + Lp, x1: ell, p: pInc, cos: cosA }];
  it('geometria: 3 retângulos, equilíbrio e carga total pelas áreas da E4a', () => {
    expect(l.erro).toBeUndefined();
    const geo = livre.b.escadas!;
    expect(geo).toHaveLength(1);
    expect(l.carga.G).toBeCloseTo(w * (pInc * R1 + pPat * Lp + pInc * R3), 8);
    expect(l.carga.Q).toBeCloseTo(q * w * ell, 8);
    expect(Math.abs(l.equilibrio.G)).toBeLessThan(1e-9);
    expect(l.elems.filter((e) => e.tipo === 'patamar').length).toBeGreaterThan(10);
  });
  it('patamar livre: reações da viga determinada (apoio fixo embaixo e móvel em cima) e momento máximo', () => {
    const v = viga(trG, ell, EI);
    expect(l.apoios[0].reacao.G).toBeCloseTo(v.RA0 * w, 6);
    expect(l.apoios[1].reacao.G).toBeCloseTo(w * (trG.reduce((s, t) => s + t.p * (t.x1 - t.x0), 0) - v.RA0), 6);
    const Mmax = Math.max(...v.xs.map((x) => v.M(x)));
    expect(maxMx(l, 'G') / Mmax).toBeGreaterThan(0.985);
    expect(maxMx(l, 'G') / Mmax).toBeLessThan(1.01);
  });
  it('patamar apoiado em conectores na borda frontal: viga contínua de dois vãos (reação do apoio central, ≤ 2 %)', () => {
    const r = escada({ tipo, lance: { patamares: [{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'conector', largura: 0.15 }] }] } });
    const x = R1 + Lp, v = viga(trG, ell, EI, { x });
    const ap = r.l.apoios.find((a) => a.id.startsWith('p1'))!;
    expect(ap.rigido).toBe(true);
    // a borda frontal do patamar consecutivo está no fim do patamar (x = R1 + Lp)
    expect(ap.reacao.G / (v.R * w)).toBeGreaterThan(0.98);
    expect(ap.reacao.G / (v.R * w)).toBeLessThan(1.02);
    expect(Math.abs(r.l.equilibrio.G)).toBeLessThan(1e-9);
    expect(r.l.cargas.some((c) => c.apoio === ap.id)).toBe(true);
  });
  it('apoio elástico (parede de alvenaria): reação = δ0/(f + 1/k) da viga com mola, entre o livre e o rígido', () => {
    const r = escada({ tipo, lance: { patamares: [{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'alvenaria', largura: 0.15 }] }] } });
    const ap = r.l.apoios.find((a) => a.id.startsWith('p1'))!;
    expect(ap.rigido).toBe(false);
    // altura da parede: patamar - espessura - piso de partida = (3 + 9·E) − 0,15 − 3 do E4a (cota do patamar, sem o ajuste da malha)
    const alt = 9 * E - 0.15;
    const k = (2400e3 * 0.15 / alt) * w;
    const x = R1 + Lp, v = viga(trG, ell, EI, { x, k });
    expect(ap.kLinha).toBeCloseTo((2400e3 * 0.15) / alt, 6);
    expect(ap.reacao.G / (v.R * w)).toBeGreaterThan(0.97);
    expect(ap.reacao.G / (v.R * w)).toBeLessThan(1.03);
    const rig = viga(trG, ell, EI, { x }).R * w;
    expect(ap.reacao.G).toBeLessThan(rig);
    // peso da parede (alvenaria 15,7 kN/m³) somado à carga linear
    expect(ap.pesoProprio).toBeGreaterThan(0);
    expect(ap.porMetro.G).toBeCloseTo(ap.reacao.G / 1.2 + ap.pesoProprio, 9);
    k;
  });
  it('apoio de concreto usa o Ecs das lajes: mais rígido que a alvenaria e reação maior', () => {
    const ap = (t: string) => escada({ tipo, lance: { patamares: [{ apoiado: true, apoios: [{ borda: 'frontal', tipo: t, largura: 0.15 }] }] } }).l.apoios.find((a) => a.id.startsWith('p1'))!;
    expect(ap('concreto').kLinha!).toBeGreaterThan(ap('alvenaria').kLinha! * 5);
    expect(ap('concreto').reacao.G).toBeGreaterThan(ap('alvenaria').reacao.G);
  });
  it('tirante: apoio elástico que pende do piso de cima; carga no grupo do pavimento de chegada', () => {
    const r = escada({ tipo, lance: { patamares: [{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'tirante', largura: 0.15 }] }] } });
    const ap = r.l.apoios.find((a) => a.id.startsWith('p1'))!;
    expect(ap.tipoApoio).toBe('tirante');
    expect(ap.reacao.G).toBeGreaterThan(0);
    expect(Math.abs(r.l.equilibrio.G)).toBeLessThan(1e-9);
    expect(r.l.cargas.find((c) => c.apoio === ap.id && c.caso === 'G')!.valor).toBeCloseTo(ap.reacao.G / 1.2 + ap.pesoProprio, 9);
  });
  it('degraus do patamar: carga permanente adicional só na faixa dos degraus (total conferido pela E4a)', () => {
    const r = escada({ tipo: { ...tipo, degrausPatamar: 2 }, escada: {} });
    // 2 degraus de 29,67 cm no patamar de 1,20 m: faixa de 0,5934 × 1,20 m com 25·e/2 kN/m²
    const extra = 25 * (E / 2) * (2 * PISO) * 1.2;
    expect(r.l.erro).toBeUndefined();
    expect(r.l.carga.G).toBeCloseTo(l.carga.G + extra - 0 * 0, 3);
  });
});

describe('E4c: reações como cargas e ordem do cálculo', () => {
  it('sem escada: comEscadas devolve o próprio modelo e a análise não ganha o campo escadas', () => {
    const s = novo(), b = s.modelo;
    expect(comEscadas(b)).toBe(b);
    expect(calcularEscadas(b).lances).toEqual([]);
    expect(diagnosticoRecalcular(b, undefined)).toBeNull();
  });
  it('degraus iniciais viram carga de superfície G no grupo do piso', () => {
    const r = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15, degrausIniciais: 2, desnivelInicial: 0 } });
    const area = r.l.cargas.find((c) => c.tipo === 'area');
    // 2 degraus iniciais: 20 degraus × 1/6 m = 3,333 m (deixa de fechar o desnível; o erro da E4a aparece, o cálculo segue)
    expect(area).toBeDefined();
    expect(area!.caso).toBe('G');
    expect(area!.valor).toBeCloseTo((25 * E) / 2, 9);
    expect(area!.pontos).toHaveLength(4);
  });
  it('comEscadas é idempotente, não grava no modelo e marca as cargas geradas', () => {
    const r = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
    const a = comEscadas(r.b, r.res), c = comEscadas(a, r.res);
    expect(a.cargas.length).toBe(4);
    expect(c.cargas.length).toBe(4);
    expect(a.cargas.every((x) => !!x.escada)).toBe(true);
    expect(r.b.cargas).toEqual([]);
    expect(cargasDasEscadas(r.res).map((x) => x.id)).toEqual(['esc:e1:inf:G', 'esc:e1:inf:Q', 'esc:e1:sup:G', 'esc:e1:sup:Q']);
  });
  it('assinatura muda com a escada, o tipo, as cotas e as opções; ESCADA_RECALCULAR avisa', () => {
    const r = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
    const a0 = r.res.assinatura;
    expect(a0).toBe(assinaturaEscadas(r.b));
    expect(diagnosticoRecalcular(r.b, a0)).toBeNull();
    ok(r.s, 'escada.editar', { id: 'e1', largura: 1.3 });
    expect(assinaturaEscadas(r.s.modelo)).not.toBe(a0);
    expect(diagnosticoRecalcular(r.s.modelo, a0)!.codigo).toBe('ESCADA_RECALCULAR');
    const b2 = r.s.modelo;
    ok(r.s, 'opcoes.definir', { valores: { escadaMalha: 0.3 } });
    expect(assinaturaEscadas(r.s.modelo)).not.toBe(assinaturaEscadas(b2));
    // as opções das escadas e a obra sem escada
    expect(OPCOES_PADRAO_CALCULO.escadaMalha).toBe(0.25);
  });
  it('lance com erro de altura continua calculando e avisa (ESCADA_ALTURA da E4a)', () => {
    const r = escada({ tipo: { tipologia: 'reto', trechos: [17], espessura: 0.15 } });
    expect(r.res.avisos.some((a) => /não fecha o desnível/.test(a))).toBe(true);
    expect(r.res.lances).toHaveLength(1);
  });
  it('revisão: códigos ESCADA_CALCULO, ESCADA_TIRANTE e ESCADA_RECALCULAR classificados', () => {
    const msg = ['Escada E1, lance 1: cálculo por casca falhou: x', 'Escada E1, lance 1: o tirante do patamar 1 (p1-frontal-1) fica comprimido (reação -1,00 kN)', 'Escada E1, lance 1: reação horizontal de 3,00 kN no apoio inferior não é transmitida à estrutura', 'Escada E1: a escada mudou depois do último cálculo e as reações aplicadas na estrutura podem estar desatualizadas; recalcule a obra.'];
    expect(msg.map((m) => classificar(m).codigo)).toEqual(['ESCADA_CALCULO', 'ESCADA_TIRANTE', 'ESCADA_HORIZONTAL', 'ESCADA_RECALCULAR']);
  });
});

/** Edifício de um vão 6 × 5 (pilares nos cantos, vigas nos eixos, laje maciça no grupo Tipo) com uma escada entre as vigas y = 0 e y = 5. */
function predioComEscada(comEsc: boolean) {
  const s = novo();
  const xs = [0, 6], ys = [0, 5];
  ok(s, 'lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  ok(s, 'lote', { comandos: [...ys.map((y) => v([[0, y], [6, y]])), ...xs.map((x) => v([[x, 0], [x, 5]]))] });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  if (comEsc) {
    ok(s, 'tipoLance.criar', { id: 'T', tipo: { nome: 'T', tipologia: 'reto', trechos: [18], espessura: 0.15 } });
    ok(s, 'escada.criar', { id: 'e1', grupo: 'g_3', origem: [3, 0], angulo: 90, piso: 5 / 17, espelho: E, lances: [{ tipo: 'T' }] });
  }
  return s.modelo;
}
const reacaoG = (b: BuildingModel) => soma(analisarEdificio(b).fundacao.filter((f) => f.caso === 'G').map((f) => f.N));
const reacaoQ = (b: BuildingModel) => soma(analisarEdificio(b).fundacao.filter((f) => f.caso === 'Q').map((f) => f.N));

describe('E4c: análise do edifício com escada', () => {
  const sem = predioComEscada(false), com = predioComEscada(true);
  const esc = calcularEscadas(com);
  it('a escada é calculada antes: a análise guarda o resultado e os avisos da escada', () => {
    const a = analisarEdificio(com);
    expect(a.erro).toBeUndefined();
    expect(a.escadas?.lances).toHaveLength(1);
    expect(a.escadas?.assinatura).toBe(assinaturaEscadas(com));
    expect('escadas' in analisarEdificio(sem)).toBe(false);
  });
  it('reações da escada como cargas nas vigas de borda: soma das reações dos pilares aumenta de n·(R_inf + R_sup)', () => {
    const cg = cargasDasEscadas(esc);
    const nPav = com.pavimentos.filter((p) => p.grupo === 'g_3').length;
    const linha = (caso: string) => soma(cg.filter((c) => c.tipo === 'linha' && c.caso === caso && c.grupo === 'g_3').map((c) => c.valor * 1.2));
    expect(nPav).toBe(3);
    expect(reacaoG(com) - reacaoG(sem)).toBeCloseTo(nPav * linha('G'), 4);
    expect(reacaoQ(com) - reacaoQ(sem)).toBeCloseTo(nPav * linha('Q'), 4);
    // cada borda de apoio recebe metade do peso da escada (por projeção)
    expect(linha('G')).toBeCloseTo(esc.lances[0].carga.G, 4);
  });
  it('as linhas caem sobre os eixos das vigas y = 0 e y = 5 (a carga é absorvida pela viga)', () => {
    const cg = cargasDasEscadas(esc).filter((c) => c.tipo === 'linha');
    const ys = new Set(cg.map((c) => Math.abs(c.pontos[0][1]).toFixed(6)));
    expect([...ys].sort()).toEqual(['0.000000', '5.000000']);
  });
  it('mudar a escada muda a análise (largura maior → mais carga) e as opções de análise refazem o cálculo', () => {
    const s = new Sessao();
    void s;
    const m2 = { ...com, escadas: com.escadas!.map((e) => ({ ...e, largura: 1.4 })) };
    expect(reacaoG(m2)).toBeGreaterThan(reacaoG(com));
    const m3 = { ...com, opcoes: { ...com.opcoes, escadaEAlvenaria: 4800 } };
    expect(reacaoG(m3)).toBeCloseTo(reacaoG(com), 6); // sem apoio de patamar o E da alvenaria não entra
  });
  it('K1.3.41: a escada não entra no vento nem no γz: os casos de vento seguem os mesmos', () => {
    const a = analisarEdificio(com), a0 = analisarEdificio(sem);
    expect(a.vento?.gamaZ.length).toBe(a0.vento?.gamaZ.length);
    expect(a.casos).toEqual(a0.casos);
  });
});

describe('E4c: constantes', () => {
  it('γg e γq da obra entram na envoltória de cálculo', () => {
    const r = escada({ tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
    const gm = gamas(r.b);
    const el = r.l.elems.reduce((m, e) => (e.G[3] > m.G[3] ? e : m));
    expect(r.l.momentos.MxPos).toBeGreaterThanOrEqual(gm.g * el.G[3] + gm.q * el.Q[3] - 1e-9);
  });
});
