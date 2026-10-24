// R8b: estribos das vigas (ramos pelo espaçamento transversal da NBR 6118 18.3.3.2, grampos verticais abertos, bitola por
// zona) e ordem global por taxa na busca da armadura dos pilares. Valores esperados à mão.
import { describe, expect, it } from 'vitest';
import { barArea } from '../concrete';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { bitolaDaZona, estriboComprimento, ramosTransversais, resumoAcoVigas } from './detalhamento';
import { dimensionarEdificio } from './dimensionamento';
import { classificar } from './revisao';

describe('R8b: ramosTransversais (18.3.3.2, cálculo à mão)', () => {
  const base = { bw: 0.4, cobLat: 0.025, phiT: 5, d: 0.46, VRd2: 400, ramosCalc: 2, ramosMax: 6 };
  it('Vd > 0,20·VRd2: st,máx = mín(0,6d; 350 mm); bw 40: W = 0,345, st,máx = 0,276 → 3 ramos → 4 (st = 0,115)', () => {
    const r = ramosTransversais({ ...base, Vd: 100 });
    expect(r.stMax).toBeCloseTo(0.276, 12);
    expect(r.ramos).toBe(4);
    expect(r.st).toBeCloseTo(0.345 / 3, 12);
    expect(r.ok).toBe(true);
  });
  it('Vd ≤ 0,20·VRd2: st,máx = mín(d; 800 mm) = 0,46 ≥ W = 0,345: 2 ramos bastam', () => {
    const r = ramosTransversais({ ...base, Vd: 80 });
    expect(r.stMax).toBeCloseTo(0.46, 12);
    expect(r.ramos).toBe(2);
    expect(r.st).toBeCloseTo(0.345, 12);
  });
  it('bw 90: W = 0,845 / 0,276 = 3,06 → 4 vãos → 5 ramos → 6 (st = 0,169); limitado a 4 ramos, não atende', () => {
    const r6 = ramosTransversais({ ...base, bw: 0.9, Vd: 100 });
    expect(r6.ramos).toBe(6);
    expect(r6.st).toBeCloseTo(0.845 / 5, 12);
    expect(r6.ok).toBe(true);
    const r4 = ramosTransversais({ ...base, bw: 0.9, Vd: 100, ramosMax: 4 });
    expect(r4.ramos).toBe(4);
    expect(r4.st).toBeCloseTo(0.845 / 3, 12);
    expect(r4.ok).toBe(false);
  });
  it('nunca menos ramos que o cálculo; teto de 350 mm com d grande e de 800 mm com Vd baixo', () => {
    expect(ramosTransversais({ ...base, Vd: 80, ramosCalc: 4 }).ramos).toBe(4);
    // d = 0,9: 0,6d = 0,54 → 350 mm; bw 60: W = 0,545 → 1,56 → 2 vãos → 3 ramos → 4
    const alto = ramosTransversais({ ...base, bw: 0.6, d: 0.9, Vd: 100 });
    expect(alto.stMax).toBeCloseTo(0.35, 12);
    expect(alto.ramos).toBe(4);
    // Vd baixo e d = 1,2: st,máx = 0,8; bw 200: W = 1,945 → 2,43 → 3 vãos → 4 ramos
    const largo = ramosTransversais({ ...base, bw: 2, d: 1.2, Vd: 10 });
    expect(largo.stMax).toBeCloseTo(0.8, 12);
    expect(largo.ramos).toBe(4);
  });
});

describe('R8b: bitolaDaZona (bitola por zona, cálculo à mão)', () => {
  // φ8 c/20: A = 0,50265 cm²; φ6,3: 0,31172; φ5: 0,19635. Mesma densidade: s' = ⌊s·A/A8⌋
  it('φ5 daria c/7 (< 12): não serve; φ6,3 dá c/12 = ⌊20 × 0,6201⌋ e serve', () => {
    expect(barArea(8) * 1e4).toBeCloseTo(0.50265, 4);
    expect(bitolaDaZona({ s: 0.2, phiT: 8, candidatas: [5, 6.3], smax: 0.2, sTroca: 0.12 })).toEqual({ phi: 6.3, s: 0.12 });
  });
  it('mínimo de troca de 13 cm: nenhuma serve, fica φ8 c/20', () => {
    expect(bitolaDaZona({ s: 0.2, phiT: 8, candidatas: [5, 6.3], smax: 0.2, sTroca: 0.13 })).toEqual({ phi: 8, s: 0.2 });
  });
  it('mínimo de 7 cm: a menor bitola, φ5 c/7', () => {
    expect(bitolaDaZona({ s: 0.2, phiT: 8, candidatas: [6.3, 5], smax: 0.2, sTroca: 0.07 })).toEqual({ phi: 5, s: 0.07 });
  });
  it('candidatas iguais ou maiores que a da viga são ignoradas; o espaçamento nunca passa de smax', () => {
    expect(bitolaDaZona({ s: 0.2, phiT: 8, candidatas: [8, 10], smax: 0.2, sTroca: 0.05 })).toEqual({ phi: 8, s: 0.2 });
    // zona com s = 25 cm e smax = 20 cm (limite menor que o do cálculo): s' = mín(25 × 0,6201; 20) = 15,5 → 15 cm
    expect(bitolaDaZona({ s: 0.25, phiT: 8, candidatas: [6.3], smax: 0.2, sTroca: 0.1 })).toEqual({ phi: 6.3, s: 0.15 });
  });
});

function viga(vaos: number[], valores: Record<string, number> = {}, h = 0.4, bw = 0.6, prof = 6) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, prof].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, prof], [L, prof]], ...xs.map((x) => [[x, 0], [x, prof]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: bw, h } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  if (Object.keys(valores).length) ok('opcoes.definir', { valores });
  const calc = () => { const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)); return { d, det: d.detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)!, res: d.vigas.find((x) => x.viga === s.modelo.vigas[0].id)! }; };
  return { s, ok, calc };
}
const arred = (x: number) => Math.ceil(x / 0.05 - 1e-9) * 0.05;

describe('R8b: viga larga (60 × 40, d = 35,4 cm): ramos pelo espaçamento transversal', () => {
  // cobrimento 3 cm: d = 0,40 − 0,03 − φt − 0,008 (φt = 8 mm: d = 0,354); W = 0,60 − 0,06 − 0,008 = 0,532 > 0,354 → 4 ramos
  it('desligada: 2 ramos (comportamento anterior); ligada: 4 ramos, s = ⌊0,6d⌋ = 21 cm e n = (⌊L/s⌋ + 1)·2', () => {
    const antes = viga([8, 8], { vigaEstriboRamosTransv: 0 }).calc().det;
    expect(antes.estribos.every((z) => (z.ramos ?? 2) === 2)).toBe(true);
    const x = viga([8, 8], { vigaEstriboRamosTransv: 1 }).calc();
    expect(x.res.arranjo.estribo!.phi).toBe(8);
    const d = 0.4 - 0.03 - 0.008 - 0.008;
    for (const z of x.det.estribos) {
      expect(z.ramos).toBe(4);
      expect(z.s).toBeCloseTo(Math.floor(0.6 * d * 100) / 100, 9); // 0,21
      expect(z.n).toBe((Math.floor((z.s1 - z.s0) / z.s + 1e-9) + 1) * 2);
      // st entre ramos = 0,532/3 = 0,177 ≤ 0,6d = 0,2124
      expect(0.532 / 3).toBeLessThanOrEqual(0.6 * d + 1e-12);
      // armadura transversal: 4·A/s ≥ ρsw,mín·bw = 0,2·fct,m/fywk·bw (fct,m = 0,3·30^(2/3) = 2,896 MPa): 6,95 cm²/m
      expect((4 * barArea(8)) / z.s).toBeGreaterThanOrEqual((0.2 * 2.8965) / 500 * 0.6 - 1e-6);
    }
  });

  it('largura que atende com 2 ramos (20 cm) não muda com a opção', () => {
    const a = viga([8, 8], { vigaEstriboRamosTransv: 0 }, 0.4, 0.2).calc().det, z = viga([8, 8], { vigaEstriboRamosTransv: 1 }, 0.4, 0.2).calc().det;
    expect(z.estribos).toEqual(a.estribos);
    expect(z.peso).toBe(a.peso);
  });

  it('grampos: 1 estribo fechado + 1 grampo aberto (n e comprimentos à mão); menos aço que o estribo duplo', () => {
    const duplo = viga([8, 8], { vigaEstriboRamosTransv: 1, vigaEstriboGrampos: 0 }).calc().det;
    const g = viga([8, 8], { vigaEstriboRamosTransv: 1, vigaEstriboGrampos: 1 }).calc().det;
    const fechadas = g.estribos.filter((z) => !z.grampo), abertas = g.estribos.filter((z) => z.grampo);
    expect(fechadas).toHaveLength(2);
    expect(abertas).toHaveLength(2);
    // grampo entre ramos internos: largura (0,532/3) = 0,1773; altura 0,40 − 0,06 = 0,34; ganchos de 135° de φ8
    const compGrampo = arred(estriboComprimento(0.532 / 3, 0.34, 8, 135, true));
    const compFechado = arred(estriboComprimento(0.54, 0.34, 8, 135, false));
    fechadas.forEach((z, i) => {
      expect(z.ramos).toBe(4);
      expect(z.grampos).toBe(1);
      expect(z.comprimento).toBeCloseTo(compFechado, 9);
      expect(z.n).toBe(Math.floor((z.s1 - z.s0) / z.s + 1e-9) + 1); // 1 estribo por posição
      const a = abertas[i];
      expect([a.s0, a.s1, a.s, a.phi]).toEqual([z.s0, z.s1, z.s, z.phi]);
      expect(a.n).toBe(z.n); // 1 grampo por posição
      expect(a.comprimento).toBeCloseTo(compGrampo, 9);
      expect(a.u).toBe(true);
      expect(a.largura).toBeCloseTo(0.532 / 3, 9);
    });
    // duplo: 2 estribos fechados por posição; grampos: 1 fechado + 1 grampo mais curto
    const kg = (d: typeof g) => d.estribos.reduce((t, z) => t + z.n * z.comprimento * barArea(z.phi) * 7850, 0);
    expect(kg(g)).toBeLessThan(kg(duplo));
    expect(kg(g)).toBeCloseTo(fechadas.reduce((t, z) => t + z.n * (compFechado + compGrampo) * barArea(z.phi) * 7850, 0), 6);
    expect(g.peso).toBeLessThan(duplo.peso);
  });

  it('edição por zona: ramos 6 com 2 grampos; a zona companheira acompanha; mais grampos que o possível é recusado', () => {
    const { s, ok, calc } = viga([8, 8], { vigaEstriboRamosTransv: 1, vigaEstriboGrampos: 0 });
    const id = s.modelo.vigas[0].id;
    ok('viga.detalhe', { id, zonas: [{ zona: 0, ramos: 6, grampos: 2 }] });
    const det = calc().det, z = det.estribos[0];
    expect(z.ramos).toBe(6);
    expect(z.grampos).toBe(2);
    const comp = det.estribos.filter((q) => q.grampo);
    expect(comp).toHaveLength(1);
    expect(comp[0].n).toBe(2 * (Math.floor((z.s1 - z.s0) / z.s + 1e-9) + 1));
    expect(comp[0].largura).toBeCloseTo((0.6 - 0.06 - z.phi / 1000) / 5, 9);
    const r = s.executar('viga.detalhe', { id, zonas: [{ zona: 0, ramos: 4, grampos: 2 }] });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('GRAMPOS_EXCESSO');
  });
});

describe('R8b: bitola do estribo por zona (opção)', () => {
  it('60 × 40, 4 ramos φ8 c/21: com 12 cm de troca vira φ6,3 c/13 (⌊21 × 0,6201⌋); com 14 cm fica φ8', () => {
    const base = viga([8, 8], { vigaEstriboRamosTransv: 1 }).calc().det;
    expect(base.estribos.every((z) => z.phi === 8 && z.s === 0.21)).toBe(true);
    const z12 = viga([8, 8], { vigaEstriboRamosTransv: 1, vigaEstriboPhiZona: 12 }).calc().det;
    for (const z of z12.estribos) {
      expect(z.phi).toBe(6.3);
      expect(z.s).toBeCloseTo(0.13, 9);
      expect(z.n).toBe((Math.floor((z.s1 - z.s0) / z.s + 1e-9) + 1) * 2);
      // mesma densidade de armadura (cm²/m): 4·A(6,3)/0,13 ≥ 4·A(8)/0,21
      expect((4 * barArea(6.3)) / z.s).toBeGreaterThanOrEqual((4 * barArea(8)) / 0.21 - 1e-9);
    }
    const z14 = viga([8, 8], { vigaEstriboRamosTransv: 1, vigaEstriboPhiZona: 14 }).calc().det;
    expect(z14.estribos.every((z) => z.phi === 8 && z.s === 0.21)).toBe(true);
  });

  it('o resumo de aço soma as peças das zonas (inclui grampos): total = peso do detalhe × repetições', () => {
    const { s, calc } = viga([8, 8], { vigaEstriboRamosTransv: 1, vigaEstriboGrampos: 1 });
    const { det } = calc();
    expect(det.estribos.some((z) => z.grampo)).toBe(true);
    const total = resumoAcoVigas(s.modelo, [det], 0).reduce((t, e) => t + e.peso, 0);
    expect(total).toBeCloseTo(det.peso * det.repeticoes, 6);
  });
});

describe('R8b: aviso quando nem o máximo de ramos atende', () => {
  it('viga de 2,4 m de largura e 40 cm de altura: ESTRIBO_RAMOS', () => {
    const msg = viga([8], { vigaEstriboRamosTransv: 1 }, 0.4, 2.4, 6).calc().det.avisos?.find((m) => m.startsWith('Estribos: espaçamento transversal'));
    expect(msg).toBeDefined();
    expect(classificar(msg!)).toEqual({ codigo: 'ESTRIBO_RAMOS', nivel: 'aviso' });
  });
});
