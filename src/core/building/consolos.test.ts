// Frente E2e, parte 1: dimensionamento dos consolos curtos contra o cálculo manual (bielas e tirantes, atrito-cisalhamento, viga em
// balanço), geometria, contato, armadura, ancoragem e relatório.
import { describe, expect, it } from 'vitest';
import { concrete } from '../concrete';
import { dimensionarConsolo, alturaUtil, barrasPorCamada, relatorioConsolo, type EntradaConsolo } from './consolos';

// fck 30, γc 1,4: fcd = 21,4286 MPa, αv2 = 0,88; CA-50, γs 1,15: fyd = 434,783 MPa
const c = concrete(30, 1.4), fyd = 500 / 1.15;
const OP = { consoloHMinimo: 0.16, consoloBraco: 0.8, consoloMu: 1.4, consoloCostura: 0.4, consoloTensaoApoio: 0.85 };
const base = (o: Partial<EntradaConsolo> = {}): EntradaConsolo => ({
  b: 0.3, h: 0.5, hp: 0.25, a: 0.3, c: 0.5, aparelho: { l: 0.2, b: 0.25 }, Vd: 300, concreto: c, fyd, fywk: 500, gamaS: 1.15, cob: 0.03, op: OP, ...o,
});
const arm4 = { tirante: { n: 4, phi: 16 }, horizontais: { n: 3, phi: 8 }, verticais: { phi: 6.3, s: 0.15 } };

describe('E2e: consolo curto (0,5·d ≤ a ≤ d): biela e tirante contra o cálculo manual', () => {
  it('tirante Rst = Vd·a/z + Hd·(1 + (h − d)/z) com Hd = 0,16·Vd e z = 0,8·d', () => {
    // 4φ16: d = 0,50 − 0,03 − 0,0063 − 0,008 = 0,4557 m; a/d = 0,658 (curto); z = 0,36456 m; Hd = 48 kN
    const r = dimensionarConsolo(base({ armadura: arm4 }));
    expect(alturaUtil(0.5, 0.03, 16)).toBeCloseTo(0.4557, 6);
    expect(r.d).toBeCloseTo(0.4557, 6);
    expect(r.tipo).toBe('curto');
    expect(r.ad).toBeCloseTo(0.3 / 0.4557, 6);
    expect(r.HdMin).toBeCloseTo(48, 9);
    expect(r.Hd).toBeCloseTo(48, 9);
    expect(r.z).toBeCloseTo(0.36456, 6);
    // 300·0,3/0,36456 = 246,874; 48·(1 + 0,0443/0,36456) = 53,833
    expect(r.Rst).toBeCloseTo(246.874 + 53.833, 2);
    expect(r.As.calc).toBeCloseTo(300.707 / (fyd * 1000), 7); // 6,917 cm²
    expect(r.As.ef).toBeCloseTo(4 * Math.PI * 0.016 ** 2 / 4, 9); // 8,04 cm²
    expect(r.As.min).toBeCloseTo(Math.max((0.04 * c.fcd * 0.3 * 0.4557) / fyd, 0.0015 * 0.3 * 0.5), 9);
  });
  it('biela sob o aparelho: θ, C, largura e tensão contra o limite 0,72·αv2·fcd', () => {
    const r = dimensionarConsolo(base({ armadura: arm4 }))!;
    // Ch = Rst − Hd = 252,707 kN; tan θ = 300/252,707 → θ = 49,87°; C = √(300² + 252,707²) = 392,25 kN
    const Ch = r.Rst - 48, th = Math.atan2(300, Ch);
    expect(r.biela!.theta).toBeCloseTo((th * 180) / Math.PI, 6);
    expect(r.biela!.theta).toBeCloseTo(49.87, 1);
    expect(r.biela!.C).toBeCloseTo(Math.hypot(300, Ch), 6);
    // largura = 0,20·sen θ + 2·(0,5 − 0,4557)·cos θ; σ = C/(0,3·largura)
    const w = 0.2 * Math.sin(th) + 2 * 0.0443 * Math.cos(th);
    expect(r.biela!.largura).toBeCloseTo(w, 9);
    expect(r.biela!.tensao).toBeCloseTo(r.biela!.C / (0.3 * w) / 1000, 6);
    expect(r.biela!.limite).toBeCloseTo(0.72 * 0.88 * (30 / 1.4), 6);
    expect(r.biela!.util).toBeLessThan(1);
  });
  it('contato no aparelho e cortante máximo', () => {
    const r = dimensionarConsolo(base({ armadura: arm4 }));
    expect(r.apoio.tensao).toBeCloseTo(300 / (0.2 * 0.25) / 1000, 9); // 6 MPa
    expect(r.apoio.limite).toBeCloseTo(0.85 * (30 / 1.4), 9);
    expect(r.cortante.VRd2).toBeCloseTo(0.27 * 0.88 * (30 / 1.4) * 0.3 * 0.4557 * 1000, 3);
    expect(r.status).toBe('ok');
  });
  it('sem armadura informada: menor bitola que cabe em uma camada, atendendo a área necessária', () => {
    const r = dimensionarConsolo(base());
    const { n, phi } = r.arranjo.tirante;
    expect(n * Math.PI * (phi / 1000) ** 2 / 4).toBeGreaterThanOrEqual(Math.max(r.As.calc, r.As.min) - 1e-12);
    expect(n).toBeLessThanOrEqual(barrasPorCamada(0.3, 0.03, phi));
    // a menor bitola da lista que cabe: φ12,5 com 6 barras (6,9 cm² → 5,6 barras) cabe em 7 por camada
    expect(phi).toBe(12.5);
    expect(n).toBe(6);
    expect(r.bloqueada).toBe(false);
    // costura: 40 % do tirante necessário em estribos horizontais fechados de 2 ramos
    expect(r.costura.nec).toBeCloseTo(0.4 * Math.max(r.As.calc, r.As.min), 12);
    expect(r.costura.ef).toBeGreaterThanOrEqual(r.costura.nec - 1e-12);
  });
  it('Hd informada acima da mínima prevalece; abaixo, vale a mínima', () => {
    expect(dimensionarConsolo(base({ armadura: arm4, Hd: 100 })).Hd).toBe(100);
    expect(dimensionarConsolo(base({ armadura: arm4, Hd: 10 })).Hd).toBeCloseTo(48, 9);
  });
});

describe('E2e: consolo muito curto (a < 0,5·d): atrito-cisalhamento', () => {
  it('As = Vd/(μ·fyd) + Hd/fyd', () => {
    const r = dimensionarConsolo(base({ a: 0.15, armadura: arm4 }));
    expect(r.tipo).toBe('muito curto');
    expect(r.biela).toBeNull();
    expect(r.atrito!.mu).toBe(1.4);
    // 300/(1,4·434,783e3) = 4,929e-4; 48/434,783e3 = 1,104e-4
    expect(r.atrito!.As).toBeCloseTo(300 / (1.4 * fyd * 1000), 9);
    expect(r.As.calc).toBeCloseTo(300 / (1.4 * fyd * 1000) + 48 / (fyd * 1000), 9);
    expect(r.As.calc * 1e4).toBeCloseTo(6.033, 2);
  });
  it('o coeficiente μ é editável', () => {
    const r = dimensionarConsolo(base({ a: 0.15, armadura: arm4, op: { ...OP, consoloMu: 1 } }));
    expect(r.As.calc).toBeCloseTo(300 / (1 * fyd * 1000) + 48 / (fyd * 1000), 9);
  });
});

describe('E2e: consolo longo (a > d): viga em balanço', () => {
  it('flexão com Md = Vd·a + Hd·(h − d) e aviso de modelo', () => {
    const r = dimensionarConsolo(base({ a: 0.6, c: 0.8, Vd: 100, armadura: { ...arm4, tirante: { n: 4, phi: 20 } } }));
    expect(r.tipo).toBe('longo');
    expect(r.mensagens.some((m) => /viga em balanço/.test(m))).toBe(true);
    // d = 0,5 − 0,03 − 0,0063 − 0,01 = 0,4537; Hd = 16; Md = 100·0,6 + 16·0,0463 = 60,74 kN·m
    const d = 0.4537, Md = 60 + 16 * (0.5 - d);
    // x = 1,25·d·(1 − √(1 − Md/(0,425·b·d²·fcd))) com fcd em kN/m²
    const x = 1.25 * d * (1 - Math.sqrt(1 - Md / (0.425 * 0.3 * d * d * (30 / 1.4) * 1000)));
    const As = (0.68 * 0.3 * x * (30 / 1.4) * 1000) / (fyd * 1000) + 16 / (fyd * 1000);
    expect(r.As.calc).toBeCloseTo(As, 7);
  });
});

describe('E2e: verificações de geometria, contato, biela e ancoragem', () => {
  it('altura na ponta menor que h/2, aparelho fora do balanço e aparelho mais largo que o consolo', () => {
    expect(dimensionarConsolo(base({ armadura: arm4, hp: 0.2 })).mensagens.some((m) => /menor que h\/2/.test(m))).toBe(true);
    expect(dimensionarConsolo(base({ armadura: arm4, c: 0.35 })).mensagens.some((m) => /não cabe no balanço/.test(m))).toBe(true);
    expect(dimensionarConsolo(base({ armadura: arm4, aparelho: { l: 0.2, b: 0.4 } })).mensagens.some((m) => /mais largo/.test(m))).toBe(true);
    expect(dimensionarConsolo(base({ armadura: arm4, hp: 0.2 })).status).toBe('fail');
  });
  it('contato acima de 0,85·fcd reprova', () => {
    const r = dimensionarConsolo(base({ armadura: arm4, aparelho: { l: 0.1, b: 0.1 } })); // 300/(0,01) = 30 MPa
    expect(r.apoio.util).toBeGreaterThan(1);
    expect(r.mensagens.some((m) => /tensão de contato/.test(m))).toBe(true);
    expect(r.status).toBe('fail');
  });
  it('cortante acima de VRd2 e biela esgotada reprovam', () => {
    const r = dimensionarConsolo(base({ armadura: arm4, Vd: 900, aparelho: { l: 0.3, b: 0.3 } }));
    expect(r.cortante.util).toBeGreaterThan(1);
    expect(r.mensagens.some((m) => /cortante de cálculo/.test(m))).toBe(true);
    const e = dimensionarConsolo(base({ armadura: { ...arm4, tirante: { n: 7, phi: 25 } }, b: 0.3, h: 0.45, hp: 0.25, Vd: 800, a: 0.28, c: 0.5, aparelho: { l: 0.3, b: 0.3 } }));
    expect(e.status).toBe('fail');
  });
  it('armadura informada menor que a necessária reprova e a ancoragem curta avisa', () => {
    const r = dimensionarConsolo(base({ armadura: { ...arm4, tirante: { n: 2, phi: 12.5 } } }));
    expect(r.mensagens.some((m) => /armadura informada do tirante/.test(m))).toBe(true);
    expect(r.util).toBeGreaterThan(1);
    expect(r.status).toBe('fail');
    const an = dimensionarConsolo(base({ armadura: arm4, c: 0.43 }));
    // balanço curto: a ancoragem sob o aparelho (laço) não cabe; é aviso, não erro
    expect(an.ancoragem.ok).toBe(false);
    expect(an.mensagens.some((m) => /^Consolo: ancoragem/.test(m))).toBe(true);
    expect(an.status).toBe('ok');
  });
  it('relatório com geometria, esforços, tirante, biela, contato e armadura', () => {
    const txt = relatorioConsolo({ ...dimensionarConsolo(base({ armadura: arm4 })), consolo: 'cs_1', nome: 'C1', pilar: 'p', nomePilar: 'P1', viga: 'v', nomeViga: 'V1', ponta: 'fim', combinacao: 'ELU 1' }).join(' ');
    expect(txt).toMatch(/Consolo C1 \(curto\)/);
    expect(txt).toMatch(/Rst = 300,7 kN/);
    expect(txt).toMatch(/Biela: θ = 49,9°/);
    expect(txt).toMatch(/4φ16/);
  });
});
