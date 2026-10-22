// N2c: efeitos locais de 2ª ordem dos pilares contra cálculo manual de um pilar isolado (auditoria N2, 22/10/2026).
// Pilar 20 × 40 cm, fck 30, γc 1,4, da fundação ao Térreo, só com carga axial G (sem momento de 1ª ordem: M1d = M1d,mín).
// - λ ≤ 90 e 90 < λ ≤ 140: pilar-padrão com curvatura aproximada (15.8.3.3.2), sem e com fluência e_cc (15.8.4), conta à mão abaixo.
// - 140 < λ ≤ 200: método geral (15.8.3.2) contra (a) a fórmula da secante e (b) um solucionador independente em Python
//   (`validation/pilar/metodo_geral.py`: lâminas finas de concreto, aço bilinear, M–1/r tabelada e equilíbrio por tiro com RK4).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { concrete } from '../concrete';
import { fiberMesh, polyProps, type FiberSection, type Pt } from '../fiber';
import { metodoGeral, relacaoMCurvatura } from '../metodoGeral';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';

const B = 0.2, H = 0.4, AC = B * H, FCD = 30 / 1.4, C = concrete(30, 1.4); // fcd em MPa

/** Pilar isolado 20 × 40 com `L` m de altura e carga axial G de `NG` kN; armadura opcional bloqueada (6 φ16: nb = 2, nh = 3). */
function pilar(L: number, NG: number, bloquear = false) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('obra.definir', { profundidadeFundacao: L });
  const terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!;
  ok('pilar.inserir', { x: 0, y: 0, secao: { tipo: 'ret', b: B, h: H }, morre: terreo.id });
  const p = s.modelo.pilares[0];
  ok('carga.pilar', { pilar: p.id, caso: 'G', N: NG });
  if (bloquear) ok('pilar.armadura', { id: p.id, pavimento: terreo.id, phi: 16, nb: 2, nh: 3, estribo: { phi: 5, s: 0.15 } });
  const r = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).pilares[0];
  const det = r.determinantes!.reduce((m, x) => (x.Nd > m.Nd ? x : m));
  return { r, det };
}

/** Pilar-padrão com curvatura aproximada (NBR 6118, 15.8.3.3.2), à mão: Md,tot para M1d,A = 0 (então M1d,mín e αb = 1). Nd em kN. */
function mdTotManual(Nd: number, h: number, le: number, ecc = 0) {
  const M1min = Nd * (0.015 + 0.03 * h);
  const base = M1min + Nd * ecc;
  const nu = Nd / 1000 / (AC * FCD); // ν = Nd/(Ac·fcd), Nd em MN
  const invR = Math.min(0.005 / (h * (nu + 0.5)), 0.005 / h); // 1/r aproximada
  const M2 = ((Nd * le * le) / 10) * invR;
  return { M1min, base, nu, M2, tot: base + M2 };
}

describe('pilar-padrão com curvatura aproximada e fluência (pilar isolado 20 × 40, cálculo à mão)', () => {
  it('Eci = 5600·√fck usado nas contas à mão', () => {
    expect(C.Eci).toBeCloseTo(5600 * Math.sqrt(30), 6);
  });

  it('λ = 86,6 (L = 5 m, direção da menor dimensão): sem fluência; Md,tot = M1d,mín + M2 = 17,9 + 53,4 = 71,3 kN·m e a outra direção (λ = 43,3) à mão', () => {
    const { r, det } = pilar(5, 600);
    const Nd = 1.4 * (600 + 25 * AC * 5); // γg·(G + peso próprio) = 854 kN
    expect(det.Nd).toBeCloseTo(Nd, 6);
    expect(r.lambda[0]).toBeCloseTo(5 / (B / Math.sqrt(12)), 6);
    expect(r.lambda[1]).toBeCloseTo(5 / (H / Math.sqrt(12)), 6);
    expect(r.local!.metodo).toEqual(['curvatura', 'curvatura']);
    expect(r.local!.ecc).toEqual([0, 0]);
    // u (ao longo de b = 0,20): M1min = Nd·0,021; ν = Nd/(Ac·fcd); 1/r = 0,005/(h(ν + 0,5)); M2 = Nd·le²/10·(1/r); λ1 = 35 < λ
    const u = mdTotManual(det.Nd, B, 5), v = mdTotManual(det.Nd, H, 5);
    expect(u.M1min).toBeCloseTo(det.Nd * 0.021, 9);
    expect(u.nu).toBeCloseTo(0.498, 3);
    expect(Math.abs(det.MuTot / u.tot - 1)).toBeLessThan(2e-3);
    expect(Math.abs(det.MvTot / v.tot - 1)).toBeLessThan(2e-3);
    expect(u.M2).toBeCloseTo(53.35, 1); // 854·25/10·0,025
    expect(det.MuTot).toBeCloseTo(71.3, 1);
    expect(det.MvTot).toBeGreaterThan(det.Nd * 0.027 * 1.5);
  });

  it('λ = 110 (L = 6,35 m): fluência — e_cc = (MSg/NSg + ea)(e^(φ·NSg/(Ne − NSg)) − 1) = 2,46 cm somado ao momento de 1ª ordem', () => {
    const L = 6.35;
    const { r, det } = pilar(L, 600);
    expect(r.lambda[0]).toBeGreaterThan(109.9);
    expect(r.lambda[0]).toBeLessThan(110.1);
    expect(r.local!.metodo).toEqual(['curvaturaFluencia', 'curvatura']);
    // à mão: NSg = G + peso próprio (quase permanente; sem variável); MSg = 0 (isolado, sem momento); φ = 2,5 (opção pilarFluencia)
    const NSg = 600 + 25 * AC * L; // 612,7 kN
    const Eci = 5600 * Math.sqrt(30) * 1000; // kN/m²
    const Ic = (H * B ** 3) / 12; // inércia da direção u (b = 0,20)
    const Ne = (10 * Eci * Ic) / (L * L);
    expect(Ne).toBeCloseTo(2028.6, 0);
    const theta1 = Math.min(1 / 200, Math.max(1 / 300, 1 / (100 * Math.sqrt(L)))); // 1/(100√6,35) = 0,003968
    const ea = (theta1 * L) / 2; // le = l = 6,35 m
    const ecc = ea * (Math.exp((2.5 * NSg) / (Ne - NSg)) - 1);
    expect(ecc).toBeCloseTo(0.02457, 4);
    expect(r.local!.ecc[0]).toBeCloseTo(ecc, 4);
    expect(r.local!.ecc[1]).toBe(0); // v: λ = 55 ≤ 90
    // Md,tot: base = M1d,mín + Nd·e_cc; αb = 1; M2 com a curvatura aproximada
    const Nd = 1.4 * NSg;
    const u = mdTotManual(Nd, B, L, ecc);
    expect(det.Nd).toBeCloseTo(Nd, 6);
    expect(Math.abs(det.MuTot / u.tot - 1)).toBeLessThan(2e-3);
    // com a fluência o momento total é maior que sem ela (mesma carga, e_cc = 0) em Nd·e_cc
    expect(det.MuTot - mdTotManual(Nd, B, L, 0).tot).toBeCloseTo(Nd * ecc, 0);
  });
});

describe('método geral (λ > 140)', () => {
  it('material linear, momento de 1ª ordem constante: fórmula da secante M = M1·sec(π/2·√(N/Ncr))', () => {
    const L = 6, EI = 2e4, Ncr = (Math.PI ** 2 * EI) / (L * L), M1 = 40;
    for (const [r, tol] of [[0.25, 2e-3], [0.5, 3e-3], [0.8, 8e-3]] as const) {
      const N = r * Ncr;
      const m = metodoGeral(L, N, () => M1, (M) => M / EI, { n: 100, tol: 1e-10, maxIter: 800 });
      expect(m.convergiu).toBe(true);
      const sec = M1 / Math.cos((Math.PI / 2) * Math.sqrt(r));
      expect(Math.abs(m.Mmax / sec - 1)).toBeLessThan(tol);
    }
  });

  // Referência: `python3 validation/pilar/metodo_geral.py 0.2338 0.00675453623709473 8.5` — 6 φ16 (a = 4,3 cm), M–1/r por lâminas de
  // 0,05 mm, concreto 1,1·σcd, aço bilinear fyd, ruptura εcu = 3,5 ‰ ou εs = −10 ‰, tiro com RK4: Mmax = 10,6665 kN·m, y(L/2) = 16,73 mm.
  // M1 = Nd·(0,015 + 0,03·0,20 + e_cc) com Nd = 233,8 kN (G = 150 kN + peso próprio 17 kN, γg = 1,4) e e_cc = 0,789 cm (à mão).
  const REF_MMAX = 10.6665, N_KN = 233.8, M1 = 6.75453623709473, LE = 8.5;
  const secao = (malha: number) => {
    const poly: Pt[] = [[0, 0], [B, 0], [B, H], [0, H]], P = polyProps(poly), Ab = Math.PI * 0.008 ** 2, a = 0.043;
    const bars = [a, H / 2, H - a].flatMap((y) => [{ x: a, y, A: Ab }, { x: B - a, y, A: Ab }]);
    return { mesh: fiberMesh(poly, malha), bars, cx: P.cx, cy: P.cy, c: C, fyd: 500 / 1.15, poly } as FiberSection;
  };

  it('M–N–1/r de 6 φ16 e o método geral com discretização fina reproduzem o solucionador independente (0,2 %)', () => {
    const rel = relacaoMCurvatura(secao(64), N_KN / 1000, 0, 400)!;
    // rigidez inicial: κ(1 kN·m) = 1,7420e-4 1/m no solucionador independente
    expect(rel(0.001)! / 1.7420e-4).toBeCloseTo(1, 2);
    const r = metodoGeral(LE, N_KN, () => M1, (m) => rel(m / 1000), { n: 200 });
    expect(r.convergiu).toBe(true);
    expect(Math.abs(r.Mmax / REF_MMAX - 1)).toBeLessThan(2e-3);
  });

  it('pipeline do edifício (malha de 16 fibras, tabela de 40 pontos, 20 trechos): MuTot 11,08 kN·m, de 0 a +6 % acima da referência (a favor da segurança)', () => {
    const { r, det } = pilar(LE, 150, true);
    expect(r.lambda[0]).toBeGreaterThan(147);
    expect(r.local!.metodo[0]).toBe('geral');
    expect(r.local!.ecc[0]).toBeCloseTo(0.00789, 4); // e_cc à mão: 0,789 cm
    expect(det.Nd).toBeCloseTo(N_KN, 6);
    expect(det.MuTot / REF_MMAX).toBeGreaterThan(1);
    expect(det.MuTot / REF_MMAX).toBeLessThan(1.06);
    expect(det.MuTot).toBeCloseTo(11.08, 1);
    // amplificação de 1ª para 2ª ordem de 1,58 (referência independente: 10,67/6,75)
    expect(det.MuTot / M1).toBeGreaterThan(1.5);
  });
});
