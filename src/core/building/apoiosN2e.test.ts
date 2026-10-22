// N2e: apoios, limites e avisos de modelagem das vigas e lajes — arredondamento no apoio, viga apoiada em viga,
// suspensão, carga próxima ao apoio, barras curtas, rótulas em cruzamentos, vigotas biapoiadas, desnível entre
// panos, limites editáveis e aço por posição. Funções puras contra cálculo manual; o modelo contra equilíbrio e identidades.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { barArea } from '../concrete';
import { analisarEdificio } from './analitico';
import { armaduraSuspensao, avisoPilarCurto, avisosDoVao, cubicaNoApoio, deltaMApoio, estribosSuspensao, fatorCargaProxima, larguraSuspensao, parcelaAoApoio, reduzirNegativo } from './apoios';
import { acoDaBarraViga } from './detalhamento';
import { dimensionarEdificio } from './dimensionamento';
import { acoDe } from './materiais';
import { OPCOES_INFO, padraoDe } from './opcoes';
import { revisarEdificio } from './revisao';

function sessao() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('vento.definir', { ativo: false });
  return { s, ok };
}
const calc = (s: Sessao) => { const an = analisarEdificio(s.modelo); expect(an.erro).toBeUndefined(); return { an, d: dimensionarEdificio(s.modelo, an) }; };

/** Grade 2 × 1 vãos de 5 m (pilares 25 × 25, vigas 15 × 40, laje maciça 12 cm). */
function grade() {
  const { s, ok } = sessao();
  ok('lote', { comandos: [[0, 0], [5, 0], [10, 0], [0, 5], [5, 5], [10, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [[[0, 0], [10, 0]], [[0, 5], [10, 5]], [[0, 0], [0, 5]], [[5, 0], [5, 5]], [[10, 0], [10, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok, v1: (d: ReturnType<typeof calc>['d']) => d.vigas.find((v) => v.grupo === 'g_3' && v.L > 9)! };
}

/** Vigas A (y = 0) e C (y = 4) de 6 m em pilares nas pontas e B (x = 3) que se apoia nelas; sem lajes, só o peso próprio. */
function tres(secB = { b: 0.15, h: 0.4 }) {
  const { s, ok } = sessao();
  ok('lote', { comandos: [[0, 0], [6, 0], [0, 4], [6, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0, 0], [6, 0]], secao: { b: 0.15, h: 0.4 } } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0, 4], [6, 4]], secao: { b: 0.15, h: 0.4 } } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[3, 0], [3, 4]], secao: secB } },
  ] });
  const [A, C, B] = s.modelo.vigas.filter((v) => v.grupo === 'g_3');
  return { s, ok, A, B, C };
}

describe('N2e: arredondamento no apoio (funções puras)', () => {
  it('parábola cúbica com M e V das faces: coeficientes e valores (cálculo manual)', () => {
    // M(u) = 2u³ − 3u² + u − 5 em t = 0,5 m: M0 = −5, V0 = −M'(0) = −1; M1 = M(0,5) = −5; V1 = −M'(0,5) = −(1,5 − 3 + 1) = 0,5
    const t = 0.5, M = (u: number) => 2 * u ** 3 - 3 * u ** 2 + u - 5, V = (u: number) => -(6 * u ** 2 - 6 * u + 1);
    expect(M(0)).toBe(-5);
    expect(M(t)).toBeCloseTo(-5, 12);
    expect(V(t)).toBeCloseTo(0.5, 12);
    for (const u of [0, 0.1, 0.25, 0.4, 0.5]) {
      const c = cubicaNoApoio(-5, -1, M(t), V(t), t, u);
      expect(c.M).toBeCloseTo(M(u), 10);
      expect(c.V).toBeCloseTo(V(u), 10);
    }
    expect(cubicaNoApoio(-5, -1, -5, 0.5, 0.5, 0.25).M).toBeCloseTo(-4.90625, 10);
    expect(cubicaNoApoio(-5, -1, -5, 0.5, 0.5, 0.25).V).toBeCloseTo(0.125, 10);
  });
  it('apoio simétrico: M no meio = M da face − t·V/4 (Hermite)', () => {
    const t = 0.4, Mf = -30, Vf = 25; // V à esquerda +, à direita −
    expect(cubicaNoApoio(Mf, Vf, Mf, -Vf, t, t / 2).M).toBeCloseTo(Mf - (t * Vf) / 4, 12);
    expect(cubicaNoApoio(Mf, Vf, Mf, -Vf, t, t / 2).V).toBeCloseTo(0, 12); // pico do diagrama
  });
  it('ΔM = R·t/8 (NBR 6118, 14.6.3) e mínimo na face', () => {
    expect(deltaMApoio(200, 0.4)).toBeCloseTo(10, 12);
    expect(reduzirNegativo(-50, 10, -50, 0)).toBe(-40);
    expect(reduzirNegativo(-50, 10, -50, 90)).toBe(-45); // não menos que 90 % do momento do eixo
    expect(reduzirNegativo(-5, 10, -5, 0)).toBe(0); // nunca troca de sinal
    expect(reduzirNegativo(12, 10, 12, 0)).toBe(12); // positivo não muda
  });
});

describe('N2e: arredondamento no apoio (viga contínua de 2 vãos)', () => {
  const val = (o: Record<string, number>) => {
    const { s, ok, v1 } = grade();
    ok('opcoes.definir', { valores: { redistribuicao: 0, ...o } });
    const d = calc(s).d;
    return v1(d);
  };
  const v0 = val({ arredondamentoApoio: 0 }), v1 = val({ arredondamentoApoio: 1 }), v2 = val({ arredondamentoApoio: 2 });
  it('o negativo do eixo diminui em módulo com a cúbica e com ΔM; o positivo não muda', () => {
    expect(v1.Mneg).toBeGreaterThan(v0.Mneg);
    expect(v2.Mneg).toBeGreaterThan(v0.Mneg);
    expect(v1.Mpos).toBeCloseTo(v0.Mpos, 9);
    expect(v2.Mpos).toBeCloseTo(v0.Mpos, 9);
    // ordem de grandeza (diferença medida e registrada na N2e): −28,29 → −26,83 (cúbica) e −26,72 kN·m (ΔM) no exemplo
    expect(v0.Mneg).toBeCloseTo(-28.29, 1);
    expect(v1.Mneg).toBeCloseTo(-26.83, 1);
    expect(v2.Mneg).toBeCloseTo(-26.72, 1);
  });
  it('ΔM = R·t/8 com R = 1,25·q·ℓ (dois vãos iguais: M = qℓ²/8 no eixo) a 20 % (R das faces não inclui a carga entre elas)', () => {
    const q = (-v0.Mneg * 8) / 25, R = 1.25 * q * 5, dM = (R * 0.25) / 8;
    expect(v2.Mneg - v0.Mneg).toBeGreaterThan(0.8 * dM);
    expect(v2.Mneg - v0.Mneg).toBeLessThan(1.2 * dM);
  });
  it('o dimensionamento não fica abaixo do momento nas faces; mínimo de 100 % do eixo desfaz o arredondamento', () => {
    for (const f of v1.facesPilar.slice(1, -1)) expect(f.Mmin).toBeGreaterThanOrEqual(v1.Mneg - 0.006);
    expect(val({ arredondamentoApoio: 1, momentoFaceMin: 100 }).Mneg).toBeCloseTo(v0.Mneg, 9);
    expect(val({ arredondamentoApoio: 2, momentoFaceMin: 100 }).Mneg).toBeCloseTo(v0.Mneg, 9);
  });
  it('mensagem informativa e padrões: cúbica no sistema, ΔM na NBR', () => {
    expect(v1.mensagens.some((m) => m.startsWith('Arredondamento do diagrama'))).toBe(true);
    expect(v0.mensagens.some((m) => m.startsWith('Arredondamento do diagrama'))).toBe(false);
    const o = OPCOES_INFO.find((x) => x.chave === 'arredondamentoApoio')!;
    expect([padraoDe(o, 'sistema'), padraoDe(o, 'nbr')]).toEqual([1, 2]);
  });
});

describe('N2e: avisos de modelagem (funções puras)', () => {
  it('viga-parede: ℓ/h < 2 biapoiada e < 3 contínua (NBR 6118, 22.4.1)', () => {
    const cod = (L: number, h: number, cont: boolean) => avisosDoVao(L, 0.2, h, h - 0.05, cont, false, 0).map((a) => a.codigo);
    expect(cod(1.0, 0.6, false)).toContain('VIGA_PAREDE'); // 1,67 < 2
    expect(cod(1.2, 0.6, false)).not.toContain('VIGA_PAREDE'); // 2,0 não é < 2
    expect(cod(2.0, 0.8, true)).toContain('VIGA_PAREDE'); // 2,5 < 3
    expect(cod(2.4, 0.8, true)).not.toContain('VIGA_PAREDE'); // 3,0
  });
  it('elemento não linear: ℓ < 3 × a maior dimensão (14.4.1) ou o critério da referência (ℓ > h/3 e > 4b)', () => {
    const cod = (L: number, crit: number) => avisosDoVao(L, 0.2, 0.5, 0.45, false, false, crit).map((a) => a.codigo);
    expect(cod(1.4, 0)).toContain('NAO_LINEAR'); // 1,4 < 3 × 0,5
    expect(cod(1.5, 0)).not.toContain('NAO_LINEAR');
    expect(cod(0.7, 1)).toContain('NAO_LINEAR'); // 0,7 ≤ 4b = 0,8
    expect(cod(0.9, 1)).not.toContain('NAO_LINEAR'); // > 4b e > h/3
  });
  it('viga-placa: largura > 2 × o vão; consolo: balanço ≤ d; pilar curto', () => {
    expect(avisosDoVao(1.2, 3, 0.3, 0.25, false, false, 1).map((a) => a.codigo)).toContain('VIGA_PLACA');
    expect(avisosDoVao(1.2, 2.4, 0.3, 0.25, false, false, 1).map((a) => a.codigo)).not.toContain('VIGA_PLACA'); // 2,4 = 2 × 1,2
    expect(avisosDoVao(0.3, 0.2, 0.5, 0.45, false, true, 0).map((a) => a.codigo)).toEqual(['CONSOLO']);
    expect(avisosDoVao(0.6, 0.2, 0.5, 0.45, false, true, 0)).toEqual([]);
    expect(avisoPilarCurto(0.8, 0.3, 0.3, 0)?.codigo).toBe('PILAR_CURTO'); // 0,8 < 0,9
    expect(avisoPilarCurto(3, 0.3, 0.3, 0)).toBeNull();
  });
});

describe('N2e: cargas próximas ao apoio e suspensão (funções puras)', () => {
  it('fator a/2d e parcela que vai ao apoio', () => {
    expect(fatorCargaProxima(0.2, 0.4)).toBeCloseTo(0.25, 12);
    expect(fatorCargaProxima(0.8, 0.4)).toBe(1);
    expect(fatorCargaProxima(1.5, 0.4)).toBe(1);
    expect(parcelaAoApoio(100, 0.5, 5)).toBeCloseTo(90, 12);
  });
  it('As,susp = fator·Rd/fywd e estribos adicionais (NBR 6118, 18.3.6)', () => {
    const fywd = 500 / 1.15, As = armaduraSuspensao(87, fywd);
    expect(As * 1e4).toBeCloseTo(2.0008, 3); // 87 kN / 434,78 MPa = 2,0008 cm²
    expect(armaduraSuspensao(87, fywd, 0.5) * 1e4).toBeCloseTo(1.0004, 3);
    expect(estribosSuspensao(As, 2, barArea(6.3))).toBe(4); // 2,0 / (2 × 0,3117) = 3,21 → 4
    expect(estribosSuspensao(0, 2, barArea(6.3))).toBe(0);
    expect(larguraSuspensao(0.15, 0.4)).toBeCloseTo(0.55, 12);
  });
});

describe('N2e: viga apoiada em viga — suspensão, trecho rígido, barras curtas e rótulas', () => {
  it('suspensão: Rd = reação da apoiada (q·ℓ/2 do peso próprio) nas duas vigas de apoio', () => {
    const { s, A, B, C } = tres();
    const { d } = calc(s);
    const qB = 1.4 * 25 * 0.15 * 0.4, Rd = (qB * 4) / 2; // ELU 1,4·G: 2,1 kN/m em 4 m → 4,2 kN
    const fywd = 500 / 1.15;
    for (const apoio of [A, C]) {
      const r = d.vigas.find((x) => x.viga === apoio.id)!;
      expect(r.suspensoes, apoio.nome).toHaveLength(1);
      const q = r.suspensoes![0];
      expect(q.viga).toBe(B.id);
      expect(q.s).toBeCloseTo(3, 6);
      expect(q.Rd).toBeGreaterThan(0.9 * Rd);
      expect(q.Rd).toBeLessThan(1.02 * Rd);
      expect(q.As).toBeCloseTo(q.Rd / (1000 * fywd), 12);
      expect(q.n).toBe(estribosSuspensao(q.As, 2, barArea(q.phi)));
      expect(q.largura).toBeCloseTo(0.15 + 0.4, 12);
      expect(r.mensagens.some((m) => m.startsWith('Suspensão: '))).toBe(true);
      // estribos no detalhamento: zona própria com n estribos
      const det = d.detalhes!.find((x) => x.viga === apoio.id)!;
      const z = det.estribos.find((e) => e.suspensao)!;
      expect(z).toBeDefined();
      expect(z.n).toBe(q.n);
      expect((z.s0 + z.s1) / 2).toBeCloseTo(3, 6);
    }
    // a viga apoiada (nas pontas sobre vigas) não recebe suspensão
    expect(d.vigas.find((x) => x.viga === B.id)!.suspensoes).toBeUndefined();
  });
  it('suspensão desligada (opção) e fator editável', () => {
    const { s, ok, A } = tres();
    ok('opcoes.definir', { valores: { vigaSuspensao: 0 } });
    expect(calc(s).d.vigas.find((x) => x.viga === A.id)!.suspensoes).toBeUndefined();
    ok('opcoes.definir', { valores: { vigaSuspensao: 1 } });
    const q1 = calc(s).d.vigas.find((x) => x.viga === A.id)!.suspensoes![0];
    ok('opcoes.definir', { valores: { vigaSuspensaoFator: 0.5 } });
    expect(calc(s).d.vigas.find((x) => x.viga === A.id)!.suspensoes![0].As).toBeCloseTo(0.5 * q1.As, 12);
  });
  it('trecho rígido da viga apoiada até a face da viga de apoio (b/2 = 7,5 cm), no pórtico e no modelo integrado', () => {
    for (const mg of [1, 0]) {
      const { s, ok, B } = tres();
      ok('opcoes.definir', { valores: { modeloGlobal: mg } });
      const barrasB = (an: ReturnType<typeof analisarEdificio>) => an.portico.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === 'viga' && t.ref === B.id).map(([, i]) => an.portico.modelo.barras[i]);
      const on = barrasB(analisarEdificio(s.modelo)).flatMap((x) => [x.offI, x.offJ]).filter(Boolean) as number[][];
      expect(on.length, `modeloGlobal ${mg}`).toBe(6); // duas pontas em cada um dos 3 pavimentos do grupo
      for (const o of on) expect(Math.hypot(o[0], o[1])).toBeCloseTo(0.075, 9); // b da viga de apoio / 2, perpendicular
      ok('opcoes.definir', { valores: { vigaApoiadaRigida: 0 } });
      expect(barrasB(analisarEdificio(s.modelo)).flatMap((x) => [x.offI, x.offJ]).filter(Boolean)).toHaveLength(0);
    }
  });
  it('barra curta: multiplicador de rigidez só nos trechos com comprimento ≤ limite', () => {
    const { s, ok, A, B } = tres();
    const barra = (an: ReturnType<typeof analisarEdificio>, id: string) => an.portico.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === 'viga' && t.ref === id).map(([, i]) => an.portico.modelo.barras[i])[0];
    const I0 = { A: barra(analisarEdificio(s.modelo), A.id).Iz, B: barra(analisarEdificio(s.modelo), B.id).Iz };
    ok('opcoes.definir', { valores: { modeloGlobal: 0, barraCurtaLimite: 3.5, barraCurtaFator: 100 } }); // trechos de A: 3 m (cruzamento com B); B: 4 m
    const an = analisarEdificio(s.modelo);
    expect(barra(an, A.id).Iz).toBeCloseTo(100 * I0.A, 9);
    expect(barra(an, A.id).A).toBeCloseTo(100 * 0.15 * 0.4, 9);
    expect(barra(an, B.id).Iz).toBeCloseTo(I0.B, 12);
    ok('opcoes.definir', { valores: { barraCurtaLimite: 0 } });
    expect(barra(analisarEdificio(s.modelo), B.id).Iz).toBeCloseTo(I0.B, 12);
  });
  it('rótula no cruzamento: a viga articulada sobre a cruzada tem momento nulo ali', () => {
    const { s, ok, A, B } = tres();
    const antes = calc(s).d.vigas.find((x) => x.viga === A.id)!;
    // sem a rótula, o meio do vão de A (apoio vertical flexível em B) tem momento
    const mMeio = (r: typeof antes) => r.envoltoria.pontos.filter((p) => Math.abs(p.s - 3) < 0.3).map((p) => Math.max(Math.abs(p.Mmax), Math.abs(p.Mmin)));
    ok('viga.editar', { id: A.id, articulacoes: [B.id] });
    expect(s.modelo.vigas.find((x) => x.id === A.id)!.articulacoes).toEqual([B.id]);
    const depois = calc(s).d.vigas.find((x) => x.viga === A.id)!;
    expect(Math.max(...mMeio(depois))).toBeLessThan(0.05 * Math.max(...antes.envoltoria.pontos.map((p) => Math.abs(p.Mmin)), 1e-9) + 0.2);
    // pilar inexistente é recusado, viga inexistente também
    const r = s.executar('viga.editar', { id: A.id, articulacoes: ['xx'] });
    expect(r.ok).toBe(false);
  });
});

describe('N2e: cargas concentradas próximas ao apoio', () => {
  /** Painel 6 × 4 m (pilares 25 × 25, vigas 15 × 40, laje de 12 cm) com uma carga de 100 kN na viga y = 0, a `x` m do eixo do apoio. */
  function carregada(x: number, mg: number, extra: Record<string, number> = {}) {
    const { s, ok } = sessao();
    ok('lote', { comandos: [[0, 0], [6, 0], [0, 4], [6, 4]].map(([px, py]) => ({ nome: 'pilar.inserir', params: { x: px, y: py, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    ok('lote', { comandos: [[[0, 0], [6, 0]], [[0, 4], [6, 4]], [[0, 0], [0, 4]], [[6, 0], [6, 4]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
    ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    ok('carga.ponto', { grupo: 'g_3', ponto: [x, 0], valor: 100, caso: 'G' });
    ok('opcoes.definir', { valores: { modeloGlobal: mg, ...extra } });
    const { an, d } = calc(s);
    return { s, an, d, r: d.vigas.find((v) => v.grupo === 'g_3' && Math.abs(v.L - 6) < 0.1 && v.nome === s.modelo.vigas[0].nome)! };
  }
  for (const mg of [1, 0]) {
    it(`cortante reduzido por a/2d entre a face e a carga (modeloGlobal ${mg}); cálculo manual`, () => {
      // carga no nó da malha a 0,50 m do eixo: a = 0,50 − 0,125 = 0,375 (d < a < 2d)
      const sem = carregada(0.5, mg, { cargaProximaApoio: 0 }), com = carregada(0.5, mg);
      // d = h − c − φt − φ/2 = 0,40 − 0,03 − 0,005 − 0,008 = 0,357; a/2d = 0,525; parcela que vai ao apoio ≈ F(ℓ − a)/ℓ com ℓ ≈ 5,99
      const d = 0.4 - 0.03 - 0.005 - 0.008, a = 0.375, L = 5.99;
      const esperado = 1.4 * (1 - a / (2 * d)) * (100 * (L - a)) / L;
      const red = sem.r.V - com.r.V;
      expect(red).toBeGreaterThan(0.85 * esperado);
      expect(red).toBeLessThan(1.15 * esperado);
      expect(com.r.mensagens.some((m) => m.startsWith('Carga próxima ao apoio') && m.includes('a/2d'))).toBe(true);
    });
  }
  it('a ≤ d: aviso de biela-tirante (consolo curto) e código na revisão', () => {
    const { s, an, d, r } = carregada(0.25, 1); // a = 0,125 ≤ d = 0,357
    expect(r.mensagens.some((m) => m.startsWith('Carga próxima ao apoio') && m.includes('consolo curto'))).toBe(true);
    expect(revisarEdificio(s.modelo, an, d).itens.some((i) => i.codigo === 'CARGA_PROXIMA_APOIO' && i.nivel === 'aviso')).toBe(true);
  });
  it('carga a mais de 2d do apoio não reduz nem avisa', () => {
    const sem = carregada(1.5, 1, { cargaProximaApoio: 0 }), com = carregada(1.5, 1);
    expect(com.r.V).toBeCloseTo(sem.r.V, 9);
    expect(com.r.mensagens.some((m) => m.startsWith('Carga próxima ao apoio'))).toBe(false);
  });
});

describe('N2e: avisos de modelagem no edifício', () => {
  it('viga-parede e elemento não linear: vão de 1,0 m com h = 60 cm', () => {
    const { s, ok } = sessao();
    ok('lote', { comandos: [[0, 0], [1, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [1, 0]], secao: { b: 0.15, h: 0.6 } });
    const { an, d } = calc(s);
    const r = d.vigas[0];
    expect(r.mensagens.some((m) => m.startsWith('Viga-parede'))).toBe(true);
    const cods = revisarEdificio(s.modelo, an, d).itens.map((i) => i.codigo);
    expect(cods).toContain('VIGA_PAREDE');
  });
  it('viga-placa: largura 3 m com vão de 1 m', () => {
    const { s, ok } = sessao();
    ok('lote', { comandos: [[0, 0], [1, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [1, 0]], secao: { b: 3, h: 0.3 } });
    expect(calc(s).d.vigas[0].mensagens.some((m) => m.startsWith('Elemento de placa'))).toBe(true);
  });
  it('consolo curto: balanço de 0,3 m; pilar curto: lance de 0,8 m', () => {
    const { s, ok } = sessao();
    ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.25, h: 0.25 } });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [0.3, 0]], secao: { b: 0.2, h: 0.5 } });
    // o balanço só tem apoio em uma ponta
    expect(calc(s).d.vigas[0].mensagens.some((m) => m.startsWith('Consolo curto'))).toBe(true);
  });
  it('pilar curto: lance de 0,8 m com seção 30 × 30', () => {
    const { s, ok } = sessao();
    ok('pavimento.editar', { id: s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id, cota: 0.8 }); // lance Térreo → Tipo 1 com 0,8 m
    ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    const d = calc(s).d;
    expect(d.pilares.some((p) => p.mensagens.some((m) => m.startsWith('Pilar curto')))).toBe(true);
  });
});

describe('N2e: limites editáveis e aço por posição', () => {
  it('taxa mínima das vigas substitui a da norma', () => {
    const { s, ok, v1 } = grade();
    const a0 = v1(calc(s).d);
    ok('opcoes.definir', { valores: { vigaTaxaMin: 1 } });
    const a1 = v1(calc(s).d);
    expect(a1.AsInf).toBeGreaterThanOrEqual(0.01 * 0.15 * 0.4 - 1e-12);
    expect(a1.AsInf).toBeGreaterThan(a0.AsInf);
  });
  it('taxa mínima das lajes maciças substitui 0,15 %', () => {
    const { s, ok } = grade();
    const l0 = calc(s).d.lajes[0];
    ok('opcoes.definir', { valores: { lajeTaxaMin: 0.5 } });
    const l1 = calc(s).d.lajes[0];
    expect(Math.min(...l1.As.pos)).toBeGreaterThanOrEqual(0.005 * 0.12 * 1e4 - 1e-9); // 6 cm²/m
    expect(Math.min(...l1.As.pos)).toBeGreaterThan(Math.min(...l0.As.pos));
  });
  it('momentos mínimos das lajes maciças p·ℓ²/x (padrão desligado)', () => {
    const { s, ok } = grade();
    const l0 = calc(s).d.lajes[0];
    ok('opcoes.definir', { valores: { lajeMomentoMinPositivo: 4 } }); // exagerado de propósito
    const l1 = calc(s).d.lajes[0];
    // p = 1,4·(25·0,12 + gRev) + 1,4·q; ℓ = menor vão; M ≥ p·ℓ²/4
    const grupo = s.modelo.grupos.find((g) => g.id === 'g_3')!, p = 1.4 * (25 * 0.12 + grupo.gRev) + 1.4 * grupo.q, ml = (p * 5 * 5) / 4;
    expect(Math.min(...l1.mPos)).toBeGreaterThanOrEqual(ml - 1e-6);
    expect(Math.min(...l1.mPos)).toBeGreaterThan(Math.min(...l0.mPos));
  });
  it('espaçamento máximo dos estribos limita o s adotado', () => {
    const { s, ok, v1 } = grade();
    const e0 = v1(calc(s).d).arranjo.estribo!;
    ok('opcoes.definir', { valores: { vigaEstriboSmax: 10 } });
    const r = v1(calc(s).d);
    expect(r.arranjo.estribo!.s).toBeLessThanOrEqual(0.1 + 1e-9);
    expect(r.estriboSmax).toBeCloseTo(0.1, 12);
    expect(e0.s).toBeGreaterThan(0.1);
    // o detalhamento respeita o mesmo limite em todas as zonas
    const det = calc(s).d.detalhes!.find((x) => x.viga === r.viga)!;
    for (const z of det.estribos) expect(z.s).toBeLessThanOrEqual(0.1 + 1e-9);
  });
  it('envoltória de cortante descontínua: patamares por zona (¼ do vão), mesmo extremo global', () => {
    const { s, ok, v1 } = grade();
    const cont = v1(calc(s).d).envoltoria;
    ok('opcoes.definir', { valores: { envoltoriaCortante: 1 } });
    const desc = v1(calc(s).d).envoltoria;
    const nv = (e: typeof cont) => new Set(e.pontos.map((p) => `${p.Vmax}|${p.Vmin}`)).size;
    expect(nv(desc)).toBeLessThan(nv(cont));
    const mx = (e: typeof cont) => Math.max(...e.pontos.map((p) => Math.max(Math.abs(p.Vmax), Math.abs(p.Vmin))));
    expect(mx(desc)).toBeCloseTo(mx(cont), 9);
    // cada ponto fica ≥ o da contínua (patamar = máximo da zona)
    cont.pontos.forEach((p, i) => { expect(desc.pontos[i].Vmax).toBeGreaterThanOrEqual(p.Vmax - 1e-9); expect(desc.pontos[i].Vmin).toBeLessThanOrEqual(p.Vmin + 1e-9); });
  });
  it('aço por posição: montagem e pele seguem a positiva até terem aço próprio', () => {
    const { s, ok } = grade();
    ok('materiais.definir', { aco: { vigaPos: 'CA-60' } });
    expect(acoDe(s.modelo, 'vigaMontagem').aco).toBe('CA-60');
    expect(acoDe(s.modelo, 'vigaPele').aco).toBe('CA-60');
    ok('materiais.definir', { aco: { vigaMontagem: 'CA-50', vigaPele: 'CA-50' } });
    expect(acoDe(s.modelo, 'vigaMontagem').aco).toBe('CA-50');
    expect(acoDe(s.modelo, 'vigaPele').aco).toBe('CA-50');
    expect(acoDe(s.modelo, 'vigaPos').aco).toBe('CA-60');
    expect(acoDaBarraViga(s.modelo, 'montagem')).toBe('CA-50');
    expect(acoDaBarraViga(s.modelo, 'pele')).toBe('CA-50');
    expect(acoDaBarraViga(s.modelo, 'passante')).toBe('CA-60');
    expect(acoDaBarraViga(s.modelo, 'negativo')).toBe('CA-50'); // vigaNeg: aço da obra
    // o resumo de aço separa por aço
    const d = calc(s).d;
    expect(new Set(d.resumoAcoVigas!.map((x) => x.aco)).size).toBeGreaterThan(1);
  });
});

describe('N2e: lajes — vigotas biapoiadas e desnível entre panos', () => {
  /** Duas lajes treliçadas lado a lado entre vigas 15 × 45; vigotas em x (vão de 4 m). */
  function trel() {
    const { s, ok } = sessao();
    ok('lote', { comandos: [0, 4, 8].flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
    ok('lote', { comandos: [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]], [[8, 0], [8, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
    ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
    return { s, ok };
  }
  const extremos = (s: Sessao) => {
    const f = calc(s).d.vigotas![0].faixas.find((x) => x.L > 3.5)!;
    return f;
  };
  it('biapoiadas: momento nulo nas pontas e positivo em todo o vão; contínuas têm negativo nos apoios e menos momento no meio', () => {
    const { s, ok } = trel();
    const cont = extremos(s);
    for (const l of s.modelo.lajes.filter((x) => x.tipo.tipo === 'trelicada')) ok('laje.editar', { id: l.id, vigotasBiapoiadas: true });
    expect(s.modelo.lajes.every((l) => l.vigotasBiapoiadas)).toBe(true);
    const f = extremos(s), n = f.s.length, Mmeio = Math.max(...f.Mmax);
    expect(Math.abs(f.Mmax[0])).toBeLessThan(1e-9);
    expect(Math.abs(f.Mmax[n - 1])).toBeLessThan(1e-9);
    expect(Math.min(...f.Mmin)).toBeGreaterThan(-1e-9); // biapoiada: sem negativo
    // contínua: negativo nos apoios e positivo menor que o isostático (aqui 0,82 contra 1,06 kN·m por nervura)
    expect(Math.min(...cont.Mmin)).toBeLessThan(-0.5);
    expect(Math.max(...cont.Mmax)).toBeLessThan(0.85 * Mmeio);
    // desfazer volta às contínuas
    for (const l of s.modelo.lajes) if (l.vigotasBiapoiadas) s.desfazer();
    expect(s.modelo.lajes.every((l) => !l.vigotasBiapoiadas)).toBe(true);
  });
  it('desnível entre panos maior que ½ da menor espessura: a borda deixa de ser contínua', () => {
    const { s, ok } = trel();
    ok('opcoes.definir', { valores: { lajeDesnivelFator: 0.5 } });
    const [l1, l2] = s.modelo.lajes.filter((x) => x.tipo.tipo === 'trelicada');
    const livres = (an: ReturnType<typeof analisarEdificio>) => an.grelhas.flatMap((g) => g.modelo.barras).filter((b) => b.engI?.some(([, a]) => a === 0) || b.engJ?.some(([, a]) => a === 0)).length;
    const base = livres(analisarEdificio(s.modelo));
    ok('laje.editar', { id: l2.id, nivel: 0.04 }); // abaixo de ½ × (capa + enchimento ≈ 16 cm) = 8 cm: continua
    expect(livres(analisarEdificio(s.modelo))).toBe(base);
    ok('laje.editar', { id: l2.id, nivel: 0.2 }); // acima: sem continuidade na borda comum
    expect(livres(analisarEdificio(s.modelo))).toBeGreaterThan(base);
    ok('opcoes.definir', { valores: { lajeDesnivelFator: 0 } });
    expect(livres(analisarEdificio(s.modelo))).toBe(base);
    expect(l1.id).not.toBe(l2.id);
  });
});
