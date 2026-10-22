// FU7b: sapata corrida de paredes e muros. Cargas por metro das reações da base da parede, momento e cortante do empuxo,
// deslizamento, base derivada de Parede.base, vínculo e base do muro de arrimo na fundação, contra cálculo manual.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { calcularBasesMuros } from './baseMuro';
import { cargasDosPilaresSobEixo, cargasLinearesDaParede, corridasEfetivas, pilaresSobEixo } from './corridaParede';
import { dimensionarEdificio } from './dimensionamento';
import { estabilidadeMuro } from './muroArrimo';
import { opcoesEmUso, perfilDe } from './opcoes';
import { calcularCorridas, flexaoTransversal, resumoCorrida } from './sapataCorrida';
import { classificar } from './revisao';
import type { BuildingModel } from './types';
import { montarPranchasFundacao, quantitativosFundacao } from '../sheets/fundacao';
import { escreverDxf } from '../sheets/dxf';
import { escreverPdf } from '../sheets/pdf';
import { montarConjunto } from '../sheets/conjunto';
import { concrete } from '../concrete';
import { defaultFoundationParams } from '../piles';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 1 }); // base da fundação em −1; topo no Tipo 1 (+3)
  for (const n of ['Cobertura', 'Tipo 3', 'Tipo 2']) s.executar('pavimento.remover', { id: s.modelo.pavimentos.find((p) => p.nome === n)!.id });
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const nomePav = (b: BuildingModel, nome: string) => b.pavimentos.find((p) => p.nome === nome)!.id;

/** Uma parede de 12 m (y = 0), 20 cm, da fundação (−1) ao Tipo 1 (+3): peso próprio 25·0,20·4 = 20 kN/m. */
function umaParede(extra: Record<string, unknown> = {}) {
  const s = padrao();
  ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
  ok(s, 'parede.criar', { pontos: [[0, 0], [12, 0]], espessura: 0.2, morre: nomePav(s.modelo, 'Tipo 1'), ...extra });
  return s;
}

describe('sapata corrida de parede: cargas por metro das reações da base', () => {
  it('a soma das reações da base é conservada nas janelas (peso próprio 240 kN) e o peso por metro fecha em 20 kN/m', () => {
    const s = umaParede();
    const b = s.modelo, an = analisarEdificio(b), w = b.paredes![0];
    const ef = { pontos: w.pontos as [number, number][], bw: 0.2 };
    const lp = cargasLinearesDaParede(b, an, w, ef.pontos, 12, 12, 1);
    expect(lp.avisos).toEqual([]);
    expect(lp.total).toBeCloseTo(25 * 0.2 * 4 * 12, 6);
    const G = lp.N.get('G')!;
    expect(G.reduce((t, v) => t + v, 0)).toBeCloseTo(240, 6); // Σ q_j · 1 m
    // janelas interiores: 20 kN/m com a oscilação dos nós de canto e de meio de lado da casca de 6 nós (≤ 3 %)
    for (const v of G.slice(1, 11)) expect(Math.abs(v - 20) / 20).toBeLessThan(0.03);
    // sem empuxo, sem momento nem cortante na base
    expect(Math.max(...(lp.M.get('G') ?? [0]).map(Math.abs))).toBeLessThan(1e-6);
    expect(Math.max(...(lp.H.get('G') ?? [0]).map(Math.abs))).toBeLessThan(1e-6);
  });

  it('carga lançada 300 kN/m + parede 20 kN/m, σadm 200: B = 1,70 m, h = 50/20 cm e momento CEB-70 conferidos à mão', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida' } });
    ok(s, 'carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [12, 0]], valor: 300, caso: 'G' });
    const b = s.modelo;
    const ef = corridasEfetivas(b);
    expect(ef).toHaveLength(1);
    // a base da parede cria a sapata no mesmo passo do comando (id, nome SC-M1, B e h da base)
    expect(ef[0]).toMatchObject({ parede: b.paredes![0].id, aba: 'ambas', bw: 0.2, nome: 'SC-M1' });
    expect(ef[0].virtual).toBeUndefined();
    expect(b.fundacao!.corridas).toHaveLength(1);
    const an = analisarEdificio(b);
    const [r] = calcularCorridas(b, an);
    expect(r.mensagens).toEqual([]);
    expect(r.modo).toBe('parede');
    expect(r.parede).toMatchObject({ virtual: false, origem: 'reacoes' });
    // Nk = 300 + 20 (a janela de 1 m tem a oscilação dos nós: até 3 %)
    expect(Math.abs(r.carga!.Nk - 320) / 320).toBeLessThan(0.03);
    // B = 1,70: balanço 0,75, h rígida 0,50, seção 0,10 + 1,50·(0,50 + 0,20)/2 = 0,625 m², W = 15,6;
    // (320 + 15,6)/1,70 = 197,4 ≤ 200; B = 1,65 dá (320 + 15,2)/1,65 = 203,1 > 200
    expect(r.B).toBeCloseTo(1.7, 9);
    expect(r.h).toBeCloseTo(0.5, 9);
    expect(r.h0).toBeCloseTo(0.2, 9);
    // CEB-70: l = 0,75 + 0,15·0,20 = 0,78; Md = pd·l²/2 com pd = γf·Nk/B (Nd líquido do peso)
    const t = r.transversal!;
    expect(t.l).toBeCloseTo(0.78, 9);
    expect(t.Md).toBeCloseTo(((1.4 * r.carga!.Nk) / 1.7) * 0.78 ** 2 / 2, 6);
    expect(r.status).toBe('ok');
    // sem cortante nem momento: nada de deslizamento
    expect(r.parede!.deslizamento).toBeUndefined();
    expect(r.parede!.M).toBeLessThan(1e-6);
  });

  it('o pilar que nasce na fundação sobre o eixo vira sapata isolada equivalente (pilar + trecho da parede) e espalha a carga pelo lado dela', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida' } });
    ok(s, 'pilar.inserir', { x: 6, y: 0, nasce: 'fundacao', secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares.at(-1)!.id, caso: 'G', N: 700 });
    const b = s.modelo, an = analisarEdificio(b);
    const w = b.paredes![0], p = b.pilares.at(-1)!, pts = w.pontos as [number, number][];
    const Pk = an.fundacao.filter((f) => f.pilar === p.id && f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(Pk).toBeGreaterThan(700);
    // a parede sozinha continua sendo só a parede (240 kN) e os pilares sobre o eixo vêm à parte
    const lw = cargasLinearesDaParede(b, an, w, pts, 12, 12, 1);
    expect(lw.total).toBeCloseTo(240, 6);
    expect(pilaresSobEixo(b, pts, 0.2).map((x) => x.nome)).toEqual([p.nome]);
    // espalhada por 2 m em torno da projeção (x = 6): as janelas 5 e 6 levam a metade cada, N/2 kN/m
    const lp = cargasDosPilaresSobEixo(b, an, [p], pts, 12, 12, 1, () => 2);
    expect(lp.total).toBeCloseTo(Pk, 6);
    const G = lp.N.get('G')!;
    expect(G[5]).toBeCloseTo(Pk / 2, 6);
    expect(G[6]).toBeCloseTo(Pk / 2, 6);
    expect(G.reduce((t, v, j) => t + (j === 5 || j === 6 ? 0 : Math.abs(v)), 0)).toBeCloseTo(0, 9);
    // sapata corrida da parede (modo "parede"); lado a da sapata isolada equivalente: (Pk + q·a)(1,05) ≤ 200·a² com q = 20 kN/m
    const [r] = calcularCorridas(b, an);
    expect(r.modo).toBe('parede');
    expect(r.parede!.pilares).toEqual([p.nome]);
    const q = 20, t = (1.05 * q + Math.sqrt((1.05 * q) ** 2 + 4 * 200 * 1.05 * Pk)) / 400;
    const aEq = Math.ceil(t / 0.05 - 1e-9) * 0.05;
    const eq = r.parede!.pilaresEq![0];
    expect(eq.pilar).toBe(p.nome);
    expect(eq.a).toBeCloseTo(aEq, 9);
    expect(eq.Nk).toBeCloseTo(Pk, 6);
    // a largura única da sapata corrida cobre o lado equivalente
    expect(r.B).toBeGreaterThanOrEqual(eq.a - 1e-9);
    expect(eq.rege).toBe(true);
  });
});

/** Duas paredes de 12 m frente a frente (y = 0 e y = 6), da fundação ao Tipo 1, terreno por fora (K0 = 0,5, γ 18, aterro em +3) e laje no Tipo 1. */
function caixa(base: Record<string, unknown> = { tipo: 'sapataCorrida' }, laje = true, soUma = false) {
  const s = padrao();
  ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
  ok(s, 'empuxo.tipo', { nome: 'Aterro', metodo: 'repouso', estratos: [{ espessura: 20, gama: 18, phi: 30 }], cotaAterro: 3 });
  ok(s, 'caso.criar', { nome: 'Empuxo', natureza: 'H', empuxo: s.modelo.empuxos![0].id });
  const caso = s.modelo.casos!.find((c) => c.nome === 'Empuxo')!.id, t1 = nomePav(s.modelo, 'Tipo 1');
  const g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
  ok(s, 'parede.criar', { pontos: [[0, 0], [12, 0]], espessura: 0.2, morre: t1, base });
  if (!soUma) ok(s, 'parede.criar', { pontos: [[0, 6], [12, 6]], espessura: 0.2, morre: t1, base });
  const [a, z] = s.modelo.paredes!;
  ok(s, 'parede.empuxo', { parede: a.id, empuxos: [{ caso, lado: 'dir' }] }); // terreno em y < 0
  if (z) ok(s, 'parede.empuxo', { parede: z.id, empuxos: [{ caso, lado: 'esq' }] }); // terreno em y > 6
  if (laje) ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [12, 0], [12, 6], [0, 6]] });
  return { s, caso };
}

describe('sapata corrida de muro de subsolo: momento e cortante do empuxo na base', () => {
  it('cortante entre 0,7 e 0,8 do empuxo (topo travado pela laje) e momento entre q0·H²/20 e q0·H²/15', () => {
    const { s } = caixa();
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const rs = calcularCorridas(b, an), r = rs[0];
    // q0 = K0·γ·H = 0,5·18·4 = 36 kN/m²; R = q0·H/2 = 72 kN/m; viga biengastada: V = 0,35·q0·H (0,7 R), M = q0·H²/20 = 28,8;
    // apoiada no topo: V = 0,4·q0·H (0,8 R), M = q0·H²/15 = 38,4 (a laje trava o topo e quase não restringe o giro)
    expect(r.parede!.origem).toBe('reacoes');
    expect(r.parede!.H / 72).toBeGreaterThan(0.69);
    expect(r.parede!.H / 72).toBeLessThan(0.81);
    expect(r.parede!.M).toBeGreaterThan(27);
    expect(r.parede!.M).toBeLessThan(40);
    // o momento deixa a pressão trapezoidal: e = M/N dentro do reportado (e ≤ eM), coerente com σmáx e σmín
    const p = r.pressao!;
    expect(p.e).toBeGreaterThan(0);
    expect(p.e).toBeLessThanOrEqual(r.parede!.eM + 1e-9);
    if (p.e <= r.B / 6) expect(p.e).toBeCloseTo((r.B / 6) * (p.sigmaMax - p.sigmaMin) / (p.sigmaMax + p.sigmaMin), 6);
    // deslizamento: FS = μ·(N + W)/H com μ = 0,4
    const d = r.parede!.deslizamento!;
    expect(d.mu).toBe(0.4);
    expect(d.FS).toBeCloseTo((0.4 * d.N) / d.H, 9);
    expect(d.FSmin).toBe(1.5);
  });

  it('subsolo travado pela laje: a reação da base de cada parede vale 0,7–0,8 do empuxo, mas as duas se anulam pela laje e o conjunto passa', () => {
    const { s } = caixa();
    const b = s.modelo, an = analisarEdificio(b), rs = calcularCorridas(b, an);
    expect(rs).toHaveLength(2);
    for (const r of rs) {
      // a força que o algoritmo usa por parede é a reação horizontal da análise (não o empuxo total q0·H/2 = 72 kN/m)
      expect(r.parede!.travada).toBe(true);
      expect(r.parede!.H / 72).toBeGreaterThan(0.69);
      expect(r.parede!.H / 72).toBeLessThan(0.81);
      const f = r.parede!.forcas!.find((x) => x.comb === 'Rara · Q principal')!;
      expect(Math.abs(f.Hy) / 12 / 72).toBeGreaterThan(0.69); // kN ao longo dos 12 m / 72 kN/m
      expect(Math.abs(f.Hy) / 12 / 72).toBeLessThan(0.81);
      // cada sapata sozinha reprovaria (FS ≈ 0,42), mas a reação de uma parede é a oposta da outra
      expect(r.parede!.conjunto!.isolado).toBeLessThan(0.5);
      expect(r.parede!.conjunto!.n).toBe(2);
      expect(r.parede!.deslizamento!.FS).toBeGreaterThan(1.5);
      expect(r.parede!.deslizamento!.ok).toBe(true);
      expect(r.mensagens.some((m) => /deslizamento/.test(m))).toBe(false);
      expect(r.status).toBe('ok');
    }
    // sinais opostos e soma líquida pequena (só o vento) contra a reação de cada uma
    const hy = (i: number) => rs[i].parede!.forcas!.find((x) => x.comb === 'Rara · Q principal')!.Hy;
    expect(hy(0) * hy(1)).toBeLessThan(0);
    expect(Math.abs(hy(0) + hy(1)) / Math.abs(hy(0))).toBeLessThan(1e-6);
    // sem o conjunto (opção 0), volta a verificar cada uma com a própria reação e reprova
    ok(s, 'opcoes.definir', { valores: { fundCorridaDeslizGrupo: 0 } });
    const r0 = calcularCorridas(s.modelo, an)[0];
    expect(r0.parede!.travada).toBeUndefined();
    expect(r0.parede!.deslizamento!.FS).toBeCloseTo(0.42, 2);
    expect(r0.status).toBe('fail');
    expect(classificar(r0.mensagens.find((t) => /deslizamento/.test(t))!).codigo).toBe('FUND_CORRIDA_DESLIZA');
  });

  it('travado por laje mas com uma parede só (terreno de um lado): o solo recebe a reação da base inteira e o deslizamento reprova', () => {
    const { s } = caixa({ tipo: 'sapataCorrida' }, true, true);
    const b = s.modelo, r = calcularCorridas(b, analisarEdificio(b))[0];
    expect(r.parede!.travada).toBe(true);
    expect(r.parede!.conjunto!.n).toBe(1);
    // FS do conjunto = μ·N/H médio ao longo dos 12 m (o isolado usa a janela de pico, até 3 % de oscilação dos nós): 0,76–0,84 < 1,5
    expect(r.parede!.deslizamento!.FS).toBeGreaterThanOrEqual(r.parede!.conjunto!.isolado - 1e-9);
    expect(r.parede!.deslizamento!.FS / r.parede!.conjunto!.isolado).toBeLessThan(1.15);
    expect(r.parede!.deslizamento!.FS).toBeLessThan(1);
    expect(r.parede!.conjunto!.Hliq / 12 / 72).toBeGreaterThan(0.69);
    expect(r.status).toBe('fail');
  });

  it('muro em balanço (sem laje no topo): a reação da base é o empuxo inteiro q0·H/2 = 72 kN/m e é ele que se verifica', () => {
    const { s } = caixa({ tipo: 'sapataCorrida' }, false);
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const rs = calcularCorridas(b, an);
    for (const r of rs) {
      expect(r.parede!.travada).toBeUndefined();
      expect(r.parede!.conjunto).toBeUndefined();
      // q0 = K0·γ·H = 0,5·18·4 = 36 kN/m²; R = q0·H/2 = 72 kN/m (engastado na base, topo livre)
      expect(r.parede!.deslizamento!.H / 72).toBeGreaterThan(0.97);
      expect(r.parede!.deslizamento!.H / 72).toBeLessThan(1.04); // janela de pico (oscilação dos nós da casca ≤ 3 %)
      expect(r.parede!.deslizamento!.FS).toBeCloseTo((0.4 * r.parede!.deslizamento!.N) / r.parede!.deslizamento!.H, 9);
      expect(r.status).toBe('fail');
      expect(classificar(r.mensagens.find((t) => /deslizamento/.test(t))!).codigo).toBe('FUND_CORRIDA_DESLIZA');
    }
  });

  it('atrito baixo reprova o deslizamento (FUND_CORRIDA_DESLIZA, erro); atrito próprio da sapata vale sobre a opção', () => {
    // cada sapata sozinha (conjunto travado desligado)
    const { s } = caixa();
    ok(s, 'opcoes.definir', { valores: { fundCorridaDeslizGrupo: 0 } });
    const w = s.modelo.paredes![0];
    ok(s, 'parede.sapata', { parede: w.id, atrito: 0.1 });
    const b = s.modelo, an = analisarEdificio(b);
    const r = calcularCorridas(b, an).find((x) => x.parede?.id === w.id)!;
    expect(r.parede!.deslizamento!.mu).toBe(0.1);
    expect(r.parede!.deslizamento!.ok).toBe(false);
    expect(r.status).toBe('fail');
    const m = r.mensagens.find((t) => /deslizamento/.test(t))!;
    expect(classificar(m)).toMatchObject({ codigo: 'FUND_CORRIDA_DESLIZA', nivel: 'erro' });
    // μ maior só muda o FS (proporcional); a opção de não reprovar deixa o FS informado e a sapata passa
    ok(s, 'parede.sapata', { parede: w.id, limpar: ['atrito'] });
    ok(s, 'opcoes.definir', { valores: { fundCorridaAtrito: 0.4 } });
    const r2 = calcularCorridas(s.modelo, an).find((x) => x.parede?.id === w.id)!;
    expect(r2.parede!.deslizamento!.mu).toBe(0.4);
    expect(r2.parede!.deslizamento!.FS / r.parede!.deslizamento!.FS).toBeCloseTo(4, 9);
    ok(s, 'opcoes.definir', { valores: { fundCorridaDeslizamento: 0 } });
    const r3 = calcularCorridas(s.modelo, an).find((x) => x.parede?.id === w.id)!;
    expect(r3.mensagens.some((t) => /deslizamento/.test(t))).toBe(false);
    expect(r3.status).toBe('ok');
    expect(r3.parede!.deslizamento!.ok).toBe(false); // FS continua informado
  });
});

describe('flexão transversal com o momento do pé da parede (eExtra)', () => {
  it('aba nos dois lados: pressão trapezoidal com e = 0,1 m, momento no lado mais carregado conferido por integral fechada', () => {
    const P = { ...defaultFoundationParams(), fckFound: 30, fyk: 500, gammaC: 1.4, gammaS: 1.15, cover: 0.05 };
    const op = opcoesEmUso(undefined, 'sistema');
    const base = { B: 2, bw: 0.2, aba: 'ambas' as const, equilibrio: false, alvenaria: false, h: 0.6, h0: 0.2, hRigido: 0.6, Nd: 490 };
    const msgs: string[] = [];
    const a = flexaoTransversal(base, P, op, msgs, 'SC1');
    const b = flexaoTransversal({ ...base, eExtra: 0.1 }, P, op, msgs, 'SC1');
    const l = 0.9 + 0.15 * 0.2; // balanço + 15 % de bw
    expect(a.l).toBeCloseTo(l, 9);
    // centrada: pd = 245 kN/m²; Md = 245·l²/2
    expect(a.Md).toBeCloseTo((245 * l * l) / 2, 6);
    // e = 0,1: σ = (N/B)(1 ± 6e/B) = 245·(1 ± 0,3); no lado carregado σ(t) = 318,5 − 73,5·t; Md = 318,5·l²/2 − 73,5·l³/6
    expect(b.Md).toBeCloseTo((318.5 * l * l) / 2 - (73.5 * l ** 3) / 6, 6);
    expect(b.Md).toBeGreaterThan(a.Md);
    void concrete;
  });
});

describe('vínculo da sapata com a parede', () => {
  it('parede.sapata cria a sapata presa à parede: segue o eixo e a espessura depois de mover e de editar a parede', () => {
    const s = umaParede();
    const w = s.modelo.paredes![0];
    ok(s, 'parede.sapata', { parede: w.id, B: 1.4, h: 0.5, aba: 'ambas' });
    let c = s.modelo.fundacao!.corridas![0];
    expect(c).toMatchObject({ parede: w.id, B: 1.4, h: 0.5, bw: 0.2, nome: 'SC-M1' });
    expect(s.modelo.paredes![0].base).toEqual({ tipo: 'sapataCorrida', largura: 1.4, altura: 0.5 });
    // movida a parede, o eixo do cálculo acompanha; espessura 30 (esq 0,2 e dir 0,1: corpo deslocado 5 cm à esquerda)
    ok(s, 'parede.mover', { ids: [w.id], dx: 0, dy: 2 });
    ok(s, 'parede.editar', { id: w.id, esq: 0.2, dir: 0.1 });
    const e = corridasEfetivas(s.modelo)[0];
    expect(e.bw).toBeCloseTo(0.3, 9);
    expect(e.pontos[0][1]).toBeCloseTo(2.05, 9);
    expect(e.pontos[1][0]).toBeCloseTo(12, 9);
    // remover a sapata devolve o apoio direto e some do cálculo
    ok(s, 'parede.sapata', { parede: w.id, remover: true });
    expect(s.modelo.fundacao!.corridas).toBeUndefined();
    expect(s.modelo.paredes![0].base).toBeUndefined();
    expect(corridasEfetivas(s.modelo)).toEqual([]);
    c = undefined as never;
  });

  it('parede que não nasce na fundação não recebe sapata (PAREDE_BASE_NASCE); B menor que a espessura é recusada', () => {
    const s = padrao();
    const terreo = nomePav(s.modelo, 'Térreo'), t1 = nomePav(s.modelo, 'Tipo 1');
    ok(s, 'parede.criar', { pontos: [[0, 0], [5, 0]], espessura: 0.2, nasce: terreo, morre: t1 });
    ok(s, 'parede.criar', { pontos: [[0, 4], [5, 4]], espessura: 0.2, morre: t1 });
    const [a, z] = s.modelo.paredes!;
    const r = s.executar('parede.sapata', { parede: a.id });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('PAREDE_BASE_NASCE');
    expect(s.executar('parede.sapata', { parede: z.id, B: 0.25 }).ok).toBe(false);
    expect(s.executar('parede.sapata', { parede: 'nada' }).erros[0].codigo).toBe('PAREDE_INEXISTENTE');
    // a derivada de uma parede que não nasce na fundação é ignorada
    ok(s, 'parede.editar', { id: a.id, base: { tipo: 'sapataCorrida' } });
    expect(corridasEfetivas(s.modelo)).toEqual([]);
  });

  it('remover a parede ou trocar a base dela para apoio remove a sapata no mesmo passo (e desfazer devolve); corrida.remover libera a base', () => {
    const s = umaParede();
    const w = s.modelo.paredes![0];
    ok(s, 'parede.sapata', { parede: w.id, B: 1.4, h: 0.5 });
    expect(s.modelo.fundacao!.corridas).toHaveLength(1);
    const r = ok(s, 'parede.remover', { ids: [w.id] });
    expect(r.mensagem).toMatch(/Sapata corrida SC-M1 removida: a parede vinculada foi removida/);
    expect(s.modelo.fundacao!.corridas).toBeUndefined();
    s.desfazer();
    expect(s.modelo.fundacao!.corridas).toHaveLength(1);
    expect(s.modelo.paredes).toHaveLength(1);
    ok(s, 'parede.editar', { id: w.id, base: { tipo: 'apoio' } });
    expect(s.modelo.fundacao!.corridas).toBeUndefined();
    // base em sapata de novo (parede.editar): a sapata volta com a largura e a altura da base
    ok(s, 'parede.editar', { id: w.id, base: { tipo: 'sapataCorrida', largura: 1.3, altura: 0.45 } });
    expect(s.modelo.fundacao!.corridas![0]).toMatchObject({ parede: w.id, B: 1.3, h: 0.45, nome: 'SC-M1' });
    // corrida.remover libera a base da parede (a derivada não ressurge)
    ok(s, 'corrida.remover', { ids: [s.modelo.fundacao!.corridas![0].id] });
    expect(s.modelo.paredes![0].base).toBeUndefined();
    expect(s.modelo.fundacao!.corridas).toBeUndefined();
  });

  it('modelo de arquivo sem a sincronização: a base derivada (virtual) e a sapata órfã entram no cálculo com aviso', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida' } });
    const b0 = s.modelo;
    // sem sapata gravada: a derivada de Parede.base
    const semSc: BuildingModel = { ...b0, fundacao: { ...b0.fundacao!, corridas: undefined } };
    const ef = corridasEfetivas(semSc);
    expect(ef).toHaveLength(1);
    expect(ef[0]).toMatchObject({ virtual: true, parede: b0.paredes![0].id, aba: 'ambas', nome: 'SC-M1' });
    // sapata gravada sem a parede: órfã, independente (só as cargas lançadas)
    const orfa: BuildingModel = { ...b0, paredes: [] };
    expect(corridasEfetivas(orfa)[0]).toMatchObject({ orfa: true });
    expect(corridasEfetivas(orfa)[0].parede).toBeUndefined();
    const lancada: BuildingModel = { ...orfa, cargas: [...b0.cargas, { id: 'c1', tipo: 'linha', grupo: 'fundacao', caso: 'G', valor: 100, pontos: [[0, 0], [12, 0]] } as BuildingModel['cargas'][number]] };
    const [r] = calcularCorridas(lancada, null);
    const m = r.mensagens.find((t) => /não existe mais/.test(t))!;
    expect(classificar(m)).toMatchObject({ codigo: 'FUND_CORRIDA_PAREDE', nivel: 'aviso' });
    expect(r.modo).toBe('parede');
    expect(r.carga!.Nk).toBeCloseTo(100, 6);
  });

  it('sem a análise, só as cargas lançadas entram e sai o aviso de reações ausentes', () => {
    const s = umaParede({ base: { tipo: 'sapataCorrida' } });
    ok(s, 'carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [12, 0]], valor: 100, caso: 'G' });
    const [r] = calcularCorridas(s.modelo, null);
    expect(r.parede!.origem).toBe('lancadas');
    expect(r.carga!.Nk).toBeCloseTo(100, 6);
    const m = r.mensagens.find((t) => /transmite a carga pelas reações/.test(t))!;
    expect(classificar(m).codigo).toBe('FUND_CORRIDA_PAREDE');
  });

  it('dimensionarEdificio calcula as sapatas das paredes e o resumo traz a parede', () => {
    const { s } = caixa();
    const b = s.modelo, an = analisarEdificio(b), d = dimensionarEdificio(b, an);
    expect(d.corridas).toHaveLength(2);
    const res = resumoCorrida(d.corridas![0]) as { parede?: { derivada: boolean; deslizamento?: { mu: number } } };
    expect(res.parede).toMatchObject({ derivada: false });
    expect(res.parede!.deslizamento!.mu).toBe(0.4);
  });
});

describe('base do muro de arrimo na fundação', () => {
  const muro = { nome: 'MA1', H: 3, tTopo: 0.2, tBase: 0.3, B: 2, ponta: 0.5, hBase: 0.4, solo: { gama: 18, phi: 30, metodo: 'rankine' as const }, sobrecarga: 10, atrito: Math.tan((20 * Math.PI) / 180) };

  it('σadm do terreno, sigmaMax da estabilidade, folga e quantitativos da base por metro e totais', () => {
    const s = padrao();
    ok(s, 'fundacao.terreno', { sigmaAdm: 150 });
    ok(s, 'muro.arrimo', { ...muro, comprimento: 20 });
    const b = s.modelo, [r] = calcularBasesMuros(b, opcoesEmUso(b.opcoes, perfilDe(b)));
    expect(r.sigmaFonte).toBe('terreno');
    expect(r.sigmaAdm).toBe(150);
    const est = estabilidadeMuro({ ...muro, sigmaAdm: 150 });
    expect(r.sigmaMax).toBeCloseTo(est.sigmaMax, 9);
    expect(r.folga).toBeCloseTo(150 - est.sigmaMax, 9);
    expect(r.atende).toBe(est.sigmaMax <= 150);
    // cota da obra −1, terreno 0: 1 m abaixo; concreto da base 2·0,4 = 0,8 m³/m e forma 2·0,4 = 0,8 m²/m
    expect(r.cota).toBe(-1);
    expect(r.profundidade).toBe(1);
    expect(r.porMetro.concreto).toBeCloseTo(0.8, 9);
    expect(r.porMetro.forma).toBeCloseTo(0.8, 9);
    expect(r.porMetro.aco).toBeGreaterThan(5);
    expect(r.total!.concreto).toBeCloseTo(16, 9);
    expect(r.total!.aco).toBeCloseTo(r.porMetro.aco * 20, 6);
  });

  it('σadm própria vale sobre a do terreno; sem nenhuma, aviso FUND_MURO_SIGMA; tensão acima da do terreno é erro FUND_MURO_TENSAO', () => {
    const s = padrao();
    ok(s, 'muro.arrimo', { ...muro });
    let b = s.modelo, op = opcoesEmUso(b.opcoes, perfilDe(b));
    let [r] = calcularBasesMuros(b, op);
    expect(r.sigmaFonte).toBe('nenhuma');
    expect(classificar(r.mensagens[0]).codigo).toBe('FUND_MURO_SIGMA');
    expect(r.total).toBeNull();
    // terreno fraco: a tensão máxima da estabilidade passa da σadm
    ok(s, 'fundacao.terreno', { sigmaAdm: 40 });
    b = s.modelo; op = opcoesEmUso(b.opcoes, perfilDe(b));
    [r] = calcularBasesMuros(b, op);
    expect(r.atende).toBe(false);
    expect(r.status).toBe('fail');
    expect(classificar(r.mensagens.find((t) => /tensão máxima/.test(t))!)).toMatchObject({ codigo: 'FUND_MURO_TENSAO', nivel: 'erro' });
    // própria 300 kN/m² prevalece e atende
    ok(s, 'muro.arrimo', { ...muro, id: s.modelo.murosArrimo![0].id, sigmaAdm: 300 });
    [r] = calcularBasesMuros(s.modelo, op);
    expect(r.sigmaFonte).toBe('propria');
    expect(r.atende).toBe(true);
    expect(r.status).toBe('ok');
  });

  it('SPT das sondagens da obra: menor σadm entre os furos e cota própria mais profunda', () => {
    const s = padrao();
    ok(s, 'fundacao.terreno', { sigmaModo: 'sondagem' });
    ok(s, 'sondagem.criar', { nome: 'SP-1', x: 0, y: 0, leituras: Array.from({ length: 10 }, () => ({ N: 20, solo: 'areia' })) });
    ok(s, 'sondagem.criar', { nome: 'SP-2', x: 5, y: 0, leituras: Array.from({ length: 10 }, () => ({ N: 8, solo: 'areia' })) });
    ok(s, 'muro.arrimo', { ...muro, cota: -2 });
    const b = s.modelo, [r] = calcularBasesMuros(b, opcoesEmUso(b.opcoes, perfilDe(b)));
    expect(r.sigmaFonte).toBe('spt');
    expect(r.cota).toBe(-2);
    expect(r.profundidade).toBe(2);
    expect(r.sigmaAdm!).toBeGreaterThan(0);
    // o furo mais fraco governa: com só o SP-2 o valor é o mesmo
    const s2 = padrao();
    ok(s2, 'fundacao.terreno', { sigmaModo: 'sondagem' });
    ok(s2, 'sondagem.criar', { nome: 'SP-2', x: 5, y: 0, leituras: Array.from({ length: 10 }, () => ({ N: 8, solo: 'areia' })) });
    ok(s2, 'muro.arrimo', { ...muro, cota: -2 });
    const [r2] = calcularBasesMuros(s2.modelo, opcoesEmUso(s2.modelo.opcoes, perfilDe(s2.modelo)));
    expect(r.sigmaAdm).toBeCloseTo(r2.sigmaAdm!, 9);
  });

  it('cota de assentamento no terreno ou acima dele é erro FUND_MURO_COTA; dimensionarEdificio traz basesMuros', () => {
    const s = padrao();
    ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
    ok(s, 'muro.arrimo', { ...muro, cota: 0.5 });
    const [r] = calcularBasesMuros(s.modelo, opcoesEmUso(s.modelo.opcoes, perfilDe(s.modelo)));
    expect(r.status).toBe('fail');
    expect(classificar(r.mensagens.find((t) => /cota de assentamento/.test(t))!)).toMatchObject({ codigo: 'FUND_MURO_COTA', nivel: 'erro' });
    ok(s, 'muro.arrimo', { ...muro, id: s.modelo.murosArrimo![0].id });
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
    expect(d.basesMuros).toHaveLength(1);
    expect(d.basesMuros![0].nome).toBe('MA1');
    expect(d.muros).toHaveLength(1);
  });
});

describe('pranchas da sapata de parede e quantitativos da base do muro', () => {
  it('locação e detalhe citam a parede, o momento e o deslizamento; DXF, PDF e conjunto saem; o muro com comprimento entra nos quantitativos', () => {
    const { s } = caixa();
    ok(s, 'muro.arrimo', { nome: 'MA1', H: 3, tTopo: 0.2, tBase: 0.3, B: 2, ponta: 0.5, hBase: 0.4, solo: { gama: 18, phi: 30, metodo: 'rankine' }, sobrecarga: 10, comprimento: 20 });
    const b = s.modelo, an = analisarEdificio(b), dim = dimensionarEdificio(b, an);
    const prs = montarPranchasFundacao(b, an, dim);
    const loc = prs.find((p) => /sapatas corridas — locação/.test(p.titulo))!;
    expect(JSON.stringify(loc.papel)).toContain('parede M1');
    expect(JSON.stringify(loc.papel)).toContain('Sapata de parede ou muro');
    const det = prs.filter((p) => /^Fundação — sapatas corridas/.test(p.titulo) && !/locação/.test(p.titulo));
    expect(JSON.stringify(det.map((p) => p.papel))).toContain('Base da parede M1');
    expect(JSON.stringify(det.map((p) => p.papel))).toContain('deslizamento FS');
    for (const p of prs) expect(escreverDxf(p).length).toBeGreaterThan(500);
    expect(escreverPdf(prs).length).toBeGreaterThan(1000);
    expect(montarConjunto(b, an, dim, { tipos: ['fundacao'] }).pranchas.some((p) => /sapatas corridas/.test(p.titulo))).toBe(true);
    const q = quantitativosFundacao(b, an, dim);
    const m = q.linhas.find((l) => l.tipo === 'Base de muro de arrimo')!;
    expect(m.nomes).toEqual(['MA1']);
    expect(m.concreto).toBeCloseTo(2 * 0.4 * 20, 9);
    expect(m.forma).toBeCloseTo(2 * 0.4 * 20, 9);
    expect(m.aco).toBeGreaterThan(100);
    expect(q.linhas.filter((l) => l.tipo === 'Sapata corrida').reduce((t, l) => t + l.quant, 0)).toBe(2);
  });

  it('só muro com comprimento (sem sapatas): a folha de quantitativos sai com a base do muro', () => {
    const s = padrao();
    ok(s, 'fundacao.terreno', { sigmaAdm: 200 });
    ok(s, 'muro.arrimo', { nome: 'MA1', H: 3, tTopo: 0.2, tBase: 0.3, B: 2, ponta: 0.5, hBase: 0.4, solo: { gama: 18, phi: 30, metodo: 'rankine' }, sobrecarga: 10, comprimento: 10 });
    const b = s.modelo, dim = dimensionarEdificio(b, analisarEdificio(b));
    const prs = montarPranchasFundacao(b, null, dim);
    expect(prs.some((p) => /quantitativos/.test(p.titulo))).toBe(true);
    expect(quantitativosFundacao(b, null, dim).linhas.map((l) => l.tipo)).toEqual(['Base de muro de arrimo']);
  });
});
