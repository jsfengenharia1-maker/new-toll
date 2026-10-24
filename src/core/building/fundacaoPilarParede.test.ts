// FU7d: fundação do pilar-parede (sapata, bloco, vigas de equilíbrio), molas dos lados curtos em barra e iteração de B,
// contra cálculo manual. Reações fictícias (`reac`) isolam o dimensionamento da fundação da análise da estrutura.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio, type AnaliseEdificio } from './analitico';
import { analisarEdificioIterado } from './analiseIterada';
import { larguraDosLados, molasDaBarra } from './baseMolasPP';
import { calcularFundacaoEdificio, calcularFundacoes } from './fundacao';
import { acharPilar, referenciaDoPP } from './fundacaoPilarParede';
import { planejarFundacoes } from './fundacaoGerar';
import type { FootingResult } from '../footings';
import type { CapResult } from '../caps';
import type { BuildingModel } from './types';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };

function padrao(terreno: Record<string, unknown> = { sigmaAdm: 300 }): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 1 });
  for (const n of ['Cobertura', 'Tipo 3', 'Tipo 2']) s.executar('pavimento.remover', { id: s.modelo.pavimentos.find((p) => p.nome === n)!.id });
  ok(s, 'fundacao.terreno', terreno);
  return s;
}
const tipo1 = (b: BuildingModel) => b.pavimentos.find((p) => p.nome === 'Tipo 1')!.id;
function inserirPP(s: Sessao, vertices: number[][], t: number, extra: Record<string, unknown> = {}) {
  ok(s, 'pilarParede.tipo', { nome: 'PP', vertices, esq: t / 2, dir: t / 2 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0, angulo: 0, morre: tipo1(s.modelo), ...extra });
  return s.modelo.pilaresParede![0];
}
/** Reações fictícias (kN, kN·m; caso G, Q nulo) no lugar das da análise: isola o dimensionamento da fundação. */
const reac = (an: AnaliseEdificio, cargas: Record<string, { N: number; Vx?: number; Vy?: number; Mx?: number; My?: number }>): AnaliseEdificio => ({
  ...an,
  fundacao: Object.entries(cargas).flatMap(([id, c]) => [
    { pilar: id, caso: 'G', N: c.N, Vx: c.Vx ?? 0, Vy: c.Vy ?? 0, Mx: c.Mx ?? 0, My: c.My ?? 0 },
    { pilar: id, caso: 'Q', N: 0, Vx: 0, Vy: 0, Mx: 0, My: 0 },
  ]),
});
const footing = (r: { projeto: unknown }) => (r.projeto as { footing: FootingResult }).footing;
const cap = (r: { projeto: unknown }) => (r.projeto as { cap: CapResult }).cap;

describe('FU7d: pilar equivalente do pilar-parede', () => {
  it('lado único 3,0 × 0,30 m: retângulo envolvente 3,0 × 0,30 centrado no lado', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [3, 0]], 0.3);
    const ref = referenciaDoPP(s.modelo, pp)!;
    expect(ref.c).toEqual([1.5, 0]);
    expect([ref.ap, ref.bp]).toEqual([3, 0.3]);
    const p = acharPilar(s.modelo, pp.id)!;
    expect(p.nasce).toBe('fundacao');
    expect(p.secao).toEqual({ tipo: 'ret', b: 3, h: 0.3 });
  });

  it('pilar-parede em L (2,0 × 0,20 em x e 1,0 × 0,20 em y): centroide das áreas e envolvente simétrica à mão', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [2, 0], [2, 1]], 0.2);
    // lado 1: centro (1, 0), área 0,4; lado 2: centro (2, 0,5), área 0,2 → centroide (0,4·1 + 0,2·2)/0,6 = 4/3; y = 0,1/0,6 = 1/6
    // extensões: x de 0 a 2,1; y de −0,1 a 1,0 → semi-extensões máx(4/3; 2,1 − 4/3) = 4/3 e máx(1/6 + 0,1; 1 − 1/6) = 5/6
    const ref = referenciaDoPP(s.modelo, pp)!;
    expect(ref.c[0]).toBeCloseTo(4 / 3, 4);
    expect(ref.c[1]).toBeCloseTo(1 / 6, 4);
    expect(ref.ap).toBeCloseTo(8 / 3, 3);
    expect(ref.bp).toBeCloseTo(5 / 3, 3);
  });

  it('pilar-parede que não nasce na fundação não tem pilar equivalente', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [3, 0]], 0.3);
    ok(s, 'pilarParede.editar', { id: pp.id, nasce: s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!.id });
    expect(acharPilar(s.modelo, pp.id)).toBeUndefined();
  });
});

describe('FU7d: sapata sob o pilar-parede (reações da base no centro)', () => {
  it('centrada: flexão CEB-70 pelo balanço da face do pilar-parede (seção a 0,15·ap para dentro), N = 900 kN', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [3, 0]], 0.3);
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata' });
    const an = reac(analisarEdificio(s.modelo), { [pp.id]: { N: 900 } });
    const [r] = calcularFundacoes(s.modelo, an), f = footing(r);
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    expect(r.pilares).toEqual(['PP1']);
    expect([r.ap, r.bp]).toEqual([3, 0.3]);
    expect(r.excentricidade).toEqual([0, 0]);
    // tensão de cálculo uniforme σd = 1,4·N/(A·B); momento por seção a x1 = 0,35·a0 do centro: Md = σd·L⊥·(L/2 − x1)²/2
    const sd = (1.4 * 900) / (f.A * f.B);
    const mx = (sd * f.B * (f.A / 2 - 0.35 * 3) ** 2) / 2, my = (sd * f.A * (f.B / 2 - 0.35 * 0.3) ** 2) / 2;
    expect(f.method).toBe('ceb70');
    expect(f.flex.x.Md).toBeCloseTo(mx, 3);
    expect(f.flex.y.Md).toBeCloseTo(my, 3);
    expect(f.flex.x.AsAdopt).toBeGreaterThanOrEqual(f.flex.x.AsMin - 1e-12);
    // σ sem excentricidade: (N + W)/(A·B) ≤ σadm = 300 kN/m² e área toda comprimida
    expect((900 + f.W) / (f.A * f.B)).toBeLessThanOrEqual(300 + 1e-6);
    expect(f.cases[0].compressed).toBe(1);
  });

  it('excêntrica (My = 300 kN·m ao longo do lado, N = 1000 kN): σmáx = N/(A·B)·(1 + 6e/A) e área comprimida ≥ 2/3', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [3, 0]], 0.3);
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata' });
    const an = reac(analisarEdificio(s.modelo), { [pp.id]: { N: 1000, My: 300 } });
    const [r] = calcularFundacoes(s.modelo, an), f = footing(r);
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    const N = 1000 + f.W, e = 300 / N, c = f.cases[0];
    expect(c.ex).toBeCloseTo(e, 6);
    expect(e).toBeLessThan(f.A / 6); // base toda comprimida
    expect(c.sigmaMax).toBeCloseTo((N / (f.A * f.B)) * (1 + (6 * e) / f.A), 3);
    expect(c.sigmaMin).toBeCloseTo((N / (f.A * f.B)) * (1 - (6 * e) / f.A), 3);
    expect(c.sigmaMax).toBeLessThanOrEqual(300 + 1e-6);
    // momento de cálculo no balanço do lado +x: pressão linear p(t) = Nd/A + 12·Md·t/A³ (por metro de x), seção em x1 = 0,35·ap
    const Nd = 1.4 * 1000, Mdy = 1.4 * 300, x1 = 0.35 * 3, h = f.A / 2;
    const m = (Nd / f.A) * (h - x1) ** 2 / 2 + ((12 * Mdy) / f.A ** 3) * ((h ** 3 - x1 ** 3) / 3 - (x1 * (h ** 2 - x1 ** 2)) / 2);
    expect(f.flex.x.Md).toBeCloseTo(m, 2);
  });

  it('excentricidade grande (N = 500, My = 600): contato parcial com ≥ 2/3 da base, σmáx = 2N/(3·B·(A/2 − e))', () => {
    const s = padrao({ sigmaAdm: 400 }), pp = inserirPP(s, [[0, 0], [3, 0]], 0.3);
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata' });
    const an = reac(analisarEdificio(s.modelo), { [pp.id]: { N: 500, My: 600 } });
    const [r] = calcularFundacoes(s.modelo, an), f = footing(r);
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    const c = f.cases[0], e = c.ex;
    expect(c.compressed).toBeGreaterThanOrEqual(2 / 3 - 1e-9);
    if (e > f.A / 6) {
      expect(c.compressed).toBeCloseTo((3 * (f.A / 2 - e)) / f.A, 6);
      expect(c.sigmaMax).toBeCloseTo((2 * c.N) / (3 * f.B * (f.A / 2 - e)), 3);
    } else expect(c.sigmaMax).toBeCloseTo((c.N / (f.A * f.B)) * (1 + (6 * e) / f.A), 3);
    expect(c.sigmaMax).toBeLessThanOrEqual(400 + 1e-6);
  });

  it('o equilíbrio vertical: a carga de cálculo da sapata é a reação da base do pilar-parede', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [3, 0]], 0.3);
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata' });
    const b = s.modelo, an = analisarEdificio(b);
    const N = an.fundacao.filter((x) => x.pilar === pp.id && x.caso === 'G').reduce((t, x) => t + x.N, 0);
    expect(N).toBeCloseTo(25 * 0.3 * 3 * 4, 0); // peso próprio: γc 25 · 0,30 · 3,0 · 4,0 m (um lance)
    const [r] = calcularFundacoes(b, an);
    expect(r.carga!.Nk).toBeCloseTo(N, 2);
  });
});

describe('FU7d: bloco sobre estacas sob o pilar-parede (bielas e tirantes)', () => {
  it('2 estacas φ40 em linha com o lado: tirante T = Rd·(s/2 − ap/4)/d, ap = 1,20 m, N = 600 kN', () => {
    const s = padrao({ sigmaAdm: 300, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
    const pp = inserirPP(s, [[0, 0], [1.2, 0]], 0.2);
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'bloco', estaca: { id: 'e1' } });
    const an = reac(analisarEdificio(s.modelo), { [pp.id]: { N: 600 } });
    const [r] = calcularFundacoes(s.modelo, an), c = cap(r);
    expect(r.tipo).toBe('bloco');
    expect(c.n).toBe(2); // (600 + peso do bloco)/500 → 2 estacas
    expect(c.Nd).toBeCloseTo(1.4 * 600, 6);
    expect(c.R[0]).toBeCloseTo(420, 6);
    const sp = 3 * 0.4, arm = sp / 2 - 1.2 / 4; // espaçamento 3D; braço da biela até o centroide da metade do pilar-parede
    expect(c.arms[0]).toBeCloseTo(arm, 6);
    expect(c.ties[0].T).toBeCloseTo((420 * arm) / c.d, 6);
    expect(c.lx).toBeCloseTo(sp + 0.4 + 2 * 0.15, 6);
  });
});

describe('FU7d: viga de equilíbrio entre sapata de divisa do pilar-parede e pilar', () => {
  it('R = N·ℓ/(ℓ − e) e R·e = ΔN·ℓ, com ℓ = 4,40 m (centro do pilar-parede em x = 0,6 até o pilar em x = 5,0)', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [1.2, 0]], 0.2);
    ok(s, 'pilar.inserir', { x: 5, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    const pil = s.modelo.pilares[0];
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata', posicao: 'divisa', lado: [-1, 0] });
    ok(s, 'fundacao.criar', { pilar: pil.id, tipo: 'sapata' });
    const [e1, e2] = s.modelo.fundacao!.elementos;
    ok(s, 'vigaFundacao.criar', { tipo: 'equilibrio', ini: e1.id, fim: e2.id, b: 0.2, h: 0.5 });
    const an = reac(analisarEdificio(s.modelo), { [pp.id]: { N: 600 }, [pil.id]: { N: 800 } });
    const calc = calcularFundacaoEdificio(s.modelo, an), [r1, r2] = calc.elementos, v = calc.vigas[0];
    expect(r1.status, r1.mensagens.join(' ')).toBe('ok');
    expect(r2.status, r2.mensagens.join(' ')).toBe('ok');
    expect(v.L).toBeCloseTo(4.4, 6);
    expect(v.equilibrio).toEqual({ ini: true, fim: false });
    const A = r1.dims.A!, ap = 1.2, e = (A - ap) / 2, l = 4.4, a = r1.alavanca!;
    expect(a.e[0]).toBeCloseTo(e, 6);
    // N = carga do pilar-parede + peso próprio da viga até a ponta; fator e reação
    expect(a.R).toBeCloseTo((a.N * l) / (l - e), 6);
    expect(a.fator).toBeCloseTo(l / (l - e), 6);
    expect(a.R * e).toBeCloseTo(a.vigas[0].dN * l, 6);
    expect(v.alivio.fim).toBeCloseTo(a.vigas[0].dN, 6);
    // centro da sapata a e do pilar-parede: o elemento fica centrado na reação
    expect(r1.centro[0]).toBeCloseTo(0.6 + e, 6);
    expect(r2.alivio!.total).toBeCloseTo(a.vigas[0].dN, 6);
  });

  it('viga de travamento entre o bloco do pilar-parede e o de um pilar: comprimento entre centros e sem erro', () => {
    const s = padrao({ sigmaAdm: 300, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
    const pp = inserirPP(s, [[0, 0], [1.2, 0]], 0.2);
    ok(s, 'pilar.inserir', { x: 4, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    const pil = s.modelo.pilares[0];
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'bloco', estaca: { id: 'e1' } });
    ok(s, 'fundacao.criar', { pilar: pil.id, tipo: 'bloco', estaca: { id: 'e1' } });
    const [e1, e2] = s.modelo.fundacao!.elementos;
    ok(s, 'vigaFundacao.criar', { tipo: 'travamento', ini: e1.id, fim: e2.id, b: 0.2, h: 0.4 });
    const an = reac(analisarEdificio(s.modelo), { [pp.id]: { N: 600 }, [pil.id]: { N: 400 } });
    const calc = calcularFundacaoEdificio(s.modelo, an), v = calc.vigas[0];
    expect(v.L).toBeCloseTo(3.4, 6);
    expect(v.status, v.mensagens.join(' ')).toBe('ok');
    // peso próprio da viga biapoiada entre as faces: reações iguais nas duas pontas
    expect(v.cargas.ini).toBeCloseTo(v.cargas.fim, 6);
  });

  it('o pilar-parede entra na geração automática (opção fundPilarParede) e fica de fora quando desligada', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [3, 0]], 0.3);
    ok(s, 'pilar.inserir', { x: 8, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    const ligado = planejarFundacoes(s.modelo, { tipo: 'sapata', associadas: false });
    const ids = ligado.passos.filter((p) => p.nome === 'fundacao.criar').flatMap((p) => (p.params.pilares as string[] | undefined) ?? [p.params.pilar as string]);
    expect(ids).toContain(pp.id);
    ok(s, 'opcoes.definir', { valores: { fundPilarParede: 0 } });
    const desligado = planejarFundacoes(s.modelo, { tipo: 'sapata', associadas: false });
    const ids2 = desligado.passos.filter((p) => p.nome === 'fundacao.criar').flatMap((p) => (p.params.pilares as string[] | undefined) ?? [p.params.pilar as string]);
    expect(ids2).not.toContain(pp.id);
  });
});

describe('FU7d: largura B das molas e molas dos lados curtos em barra', () => {
  it('um lado de 3,0 m na sapata 3,1 × 1,25: B = 1,25 (extensão da sapata na normal do lado)', () => {
    const m = larguraDosLados([{ id: 'a', L: 3, u: [1, 0], n: [0, 1] }], { A: 3.1, B: 1.25, angulo: 0 });
    expect(m.get('a')).toBeCloseTo(1.25, 9);
  });

  it('lado ao longo de y local: B = A; sapata girada 90°: o lado ao longo de x recebe A', () => {
    expect(larguraDosLados([{ id: 'a', L: 2, u: [0, 1], n: [-1, 0] }], { A: 3, B: 2, angulo: 0 }).get('a')).toBeCloseTo(3, 9);
    expect(larguraDosLados([{ id: 'a', L: 2, u: [1, 0], n: [0, 1] }], { A: 3, B: 2, angulo: 90 }).get('a')).toBeCloseTo(3, 9);
  });

  it('dois lados paralelos de 3 m dividem a mesma sapata 3 × 2: B de cada um = 1,0 e Σ ℓ·B = A·B = 6 m²', () => {
    const m = larguraDosLados([{ id: 'a', L: 3, u: [1, 0], n: [0, 1] }, { id: 'z', L: 3, u: [1, 0], n: [0, 1] }], { A: 3, B: 2, angulo: 0 });
    expect(m.get('a')).toBeCloseTo(1, 9);
    expect(m.get('z')).toBeCloseTo(1, 9);
    expect(3 * m.get('a')! + 3 * m.get('z')!).toBeCloseTo(6, 9);
  });

  it('molas da barra ℓ = 0,60, B = 0,80, k = 1e5, eixo em y: kz = k·B·ℓ = 48 000; krx = k·B·ℓ³/12 = 1 440; kry = k·ℓ·B³/12 = 2 560', () => {
    const m = molasDaBarra(1e5, 0.8, 0.6, [0, 1]);
    expect(m.kz).toBeCloseTo(48000, 6);
    expect(m.krx).toBeCloseTo(1440, 3);
    expect(m.kry).toBeCloseTo(2560, 3);
    const h = molasDaBarra(1e5, 0.8, 0.6, [1, 0]); // eixo em x: trocam
    expect(h.krx).toBeCloseTo(2560, 3);
    expect(h.kry).toBeCloseTo(1440, 3);
  });

  /** Pilar-parede em L: lado de 3,0 m (casca) e lado de 0,60 m em y (barra, 0,60 < 5 × 0,20), base sobre molas. */
  function emL(opcoes: Record<string, number> = {}) {
    const s = padrao();
    ok(s, 'opcoes.definir', { valores: { fundParedeK: 1e5, ...opcoes } });
    const pp = inserirPP(s, [[0, 0], [3, 0], [3, 0.6]], 0.2, { vinculoBase: 'molas' });
    return { s, pp };
  }

  it('o nó da base do lado curto recebe as molas: kz = 1e5·0,80·0,60 (B = 0,20 + 2 × 0,30), krx = 1 440 e kry = 2 560', () => {
    const { s, pp } = emL();
    const an = analisarEdificio(s.modelo), md = an.portico.modelo;
    expect(an.erro).toBeUndefined();
    const nosBase = an.paredes!.base[pp.id];
    const comKz = nosBase.filter((n) => (md.molas ?? []).some((m) => m.no === n && m.gdl === 2 && Math.abs(m.k - 48000) < 1e-3));
    expect(comKz).toHaveLength(1);
    const n = comKz[0], k = (g: number) => md.molas!.find((m) => m.no === n && m.gdl === g)!.k;
    expect(k(3)).toBeCloseTo(1440, 2);
    expect(k(4)).toBeCloseTo(2560, 2);
    expect(md.apoios.get(n)).toEqual([0, 1, 5]);
  });

  it('com fundParedeBarraMola = 0 o lado curto fica engastado (comportamento da FU7c)', () => {
    const { s, pp } = emL({ fundParedeBarraMola: 0 });
    const an = analisarEdificio(s.modelo), md = an.portico.modelo;
    const nosBase = an.paredes!.base[pp.id];
    expect(nosBase.some((n) => (md.molas ?? []).some((m) => m.no === n && Math.abs(m.k - 48000) < 1e-3))).toBe(false);
    expect(nosBase.some((n) => md.apoios.get(n)?.length === 6)).toBe(true);
  });

  it('assentamento do lado curto: w = N/(k·B·ℓ) e equilíbrio vertical: Σ reações = peso (25·0,2·(3,0 + 0,6)·4,0 = 72 kN)', () => {
    const { s, pp } = emL();
    const an = analisarEdificio(s.modelo), iG = an.casos.indexOf('G');
    const N = an.fundacao.filter((f) => f.pilar === pp.id && f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(N).toBeCloseTo(25 * 0.2 * 3.6 * 4, 0);
    // as molas das cascas e da barra têm a mesma pressão sob carga uniforme: w ≈ N/(k·Σ B·ℓ) com B = 0,80 nos dois lados (aprox.: o engaste do topo e a viga fictícia redistribuem pouco)
    const nosBase = an.paredes!.base[pp.id];
    const w = nosBase.map((n) => -an.portico.res!.desloc[iG][n * 6 + 2]);
    expect(Math.min(...w)).toBeGreaterThan(0);
    const wMed = N / (1e5 * 0.8 * 3.6);
    expect(Math.max(...w)).toBeLessThan(1.6 * wMed);
    expect(Math.min(...w)).toBeGreaterThan(0.4 * wMed);
  });
});

describe('FU7d: iteração de B das molas com a sapata calculada', () => {
  function umaParede(opcoes: Record<string, number> = {}) {
    const s = padrao();
    ok(s, 'opcoes.definir', { valores: { fundParedeK: 1e5, ...opcoes } });
    const pp = inserirPP(s, [[0, 0], [3, 0]], 0.3, { vinculoBase: 'molas' });
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata' });
    return { s, pp };
  }

  it('B passa de espessura + 2 × 30 cm = 0,90 m para o da sapata calculada (1,25 m) e w = N/(k·B·ℓ) com N = 90 kN', () => {
    const { s, pp } = umaParede();
    const an = analisarEdificioIterado(s.modelo), it = an.baseIterada!;
    expect(it.convergiu).toBe(true);
    expect(it.iteracoes).toBe(2); // reação resultante independe de B numa parede isolada: converge na 2ª análise
    expect(it.passos[0].usadas).toBeNull();
    expect(it.passos.at(-1)!.variacao).toBeLessThanOrEqual(0.05 + 1e-9);
    const { A, B } = it.dims[pp.id];
    expect([A, B]).toEqual([3.1, 1.25]);
    const md = an.portico.modelo, iG = an.casos.indexOf('G');
    const nos = an.paredes!.base[pp.id].filter((n) => md.nos[n][0] > 0.6 && md.nos[n][0] < 2.4);
    expect(nos.length).toBeGreaterThanOrEqual(3);
    for (const n of nos) expect(an.portico.res!.desloc[iG][n * 6 + 2]).toBeCloseTo(-90 / (1e5 * 1.25 * 3), 6);
    // sem a iteração: B = 0,30 + 0,60
    const sem = analisarEdificio(s.modelo);
    for (const n of nos) expect(sem.portico.res!.desloc[iG][n * 6 + 2]).toBeCloseTo(-90 / (1e5 * 0.9 * 3), 6);
  });

  it('a sapata recalculada com a análise final reproduz A e B usados (ponto fixo)', () => {
    const { s, pp } = umaParede();
    const an = analisarEdificioIterado(s.modelo), [r] = calcularFundacoes(s.modelo, an);
    expect([r.dims.A, r.dims.B]).toEqual([an.baseIterada!.dims[pp.id].A, an.baseIterada!.dims[pp.id].B]);
  });

  it('opção desligada (fundBaseIterada = 0): análise idêntica à comum e sem registro de iteração', () => {
    const { s } = umaParede({ fundBaseIterada: 0 });
    const an = analisarEdificioIterado(s.modelo), ref = analisarEdificio(s.modelo);
    expect(an.baseIterada).toBeUndefined();
    expect(an.portico.res!.desloc[0]).toEqual(ref.portico.res!.desloc[0]);
  });

  it('sem sapata sob o pilar-parede ou sem molas não há iteração', () => {
    const s = padrao(), pp = inserirPP(s, [[0, 0], [3, 0]], 0.3, { vinculoBase: 'molas' });
    expect(analisarEdificioIterado(s.modelo).baseIterada).toBeUndefined(); // sem sapata
    ok(s, 'pilarParede.editar', { id: pp.id, vinculoBase: 'engaste' });
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata' });
    expect(analisarEdificioIterado(s.modelo).baseIterada).toBeUndefined(); // engastado
  });

  /** Pilar-parede de 1,2 m e dois pilares com vigas e laje (hiperestático): as reações dependem da rigidez das molas. */
  function porticos(opcoes: Record<string, number> = {}) {
    const s = padrao();
    const g = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.grupo;
    ok(s, 'opcoes.definir', { valores: { fundParedeK: 2e4, ...opcoes } });
    ok(s, 'pilarParede.tipo', { vertices: [[0, 0], [1.2, 0]], esq: 0.1, dir: 0.1 });
    const pp = (ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0.1, vinculoBase: 'molas' }), s.modelo.pilaresParede![0]);
    ok(s, 'pilar.inserir', { x: 6, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'pilar.inserir', { x: 3, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    for (const pts of [[[0.4, 0], [6, 0]], [[6, 0], [3, 5]], [[3, 5], [0.4, 0]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.2, h: 0.5 } });
    ok(s, 'laje.criar', { grupo: g, ponto: [3, 1.5], tipo: { tipo: 'macica', h: 0.12 } });
    ok(s, 'fundacao.criar', { pilar: pp.id, tipo: 'sapata' });
    return { s, pp };
  }

  it('hiperestático: converge dentro do máximo, variação final ≤ tolerância e o equilíbrio vertical não depende de B', () => {
    const { s, pp } = porticos();
    const an = analisarEdificioIterado(s.modelo), ref = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const it = an.baseIterada!;
    expect(it.iteracoes).toBeGreaterThanOrEqual(2);
    expect(it.iteracoes).toBeLessThanOrEqual(it.maximo);
    expect(it.convergiu, JSON.stringify(it.passos)).toBe(true);
    expect(it.passos.at(-1)!.variacao).toBeLessThanOrEqual(it.tolerancia + 1e-9);
    const soma = (a: AnaliseEdificio) => a.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(soma(an) / soma(ref)).toBeCloseTo(1, 6);
    // B calculado ≠ B inicial (0,20 + 0,60 = 0,80): as molas mudaram a reação do pilar-parede
    expect(it.dims[pp.id].B).not.toBeCloseTo(0.8, 2);
  });

  it('tolerância de 0 cm esgota as iterações (máximo 3) e avisa; com tolerância folgada converge em menos', () => {
    const { s: s1 } = porticos({ fundBaseIterTol: 0, fundBaseIterMax: 1 });
    const a1 = analisarEdificioIterado(s1.modelo);
    expect(a1.baseIterada!.iteracoes).toBe(1);
    expect(a1.baseIterada!.convergiu).toBe(false);
    expect(a1.avisos.some((x) => x.includes('sem convergência'))).toBe(true);
    const { s: s2 } = porticos({ fundBaseIterTol: 50 });
    const a2 = analisarEdificioIterado(s2.modelo);
    expect(a2.baseIterada!.convergiu).toBe(true);
    expect(a2.baseIterada!.iteracoes).toBe(2);
  });
});
