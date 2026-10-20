import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { barArea, concrete } from '../concrete';
import { analisarEdificio } from './analitico';
import { alfa0t, ganchoNoventa, lbBasico } from './detalhamento';
import { dimensionarEdificio } from './dimensionamento';

function viga3(vaos: number[]) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
  return { s, d };
}

describe('detalhamento das vigas (R3a)', () => {
  it('ancoragem básica, gancho de 90° e α0t pela NBR 6118 (cálculo manual)', () => {
    const c = concrete(30);
    // fctd = 0,7·0,3·30^(2/3)/1,4 = 1,448 MPa; fbd = 2,25·fctd = 3,258; lb = (10/4)·434,8/3,258 = 333,6 mm
    expect(lbBasico(10, c, 500 / 1.15, true)).toBeCloseTo(0.3336, 3);
    expect(lbBasico(10, c, 500 / 1.15, false)).toBeCloseTo(0.3336 / 0.7, 3);
    expect(lbBasico(8, concrete(50), 500 / 1.15, true)).toBeCloseTo(0.2, 3); // mínimo 25φ governa
    // φ10: 8φ + π(D + φ)/4 − (D/2 + φ), D = 5φ
    expect(ganchoNoventa(10)).toBeCloseTo(0.08 + (Math.PI * 0.06) / 4 - 0.035, 9);
    expect([0.2, 0.25, 0.33, 0.5, 1].map(alfa0t)).toEqual([1.2, 1.4, 1.6, 1.8, 2.0]);
  });

  it('viga contínua de 2 vãos: passantes com ganchos, reforço positivo, negativo no apoio interno, estribos e peso', () => {
    const { s, d } = viga3([5, 5]);
    const v = s.modelo.vigas[0], r = d.vigas.find((x) => x.viga === v.id)!, det = d.detalhes!.find((x) => x.viga === v.id)!;
    expect(det.apoios).toHaveLength(3);
    const pass = det.barras.filter((x) => x.tipo === 'passante');
    expect(pass).toHaveLength(1);
    expect(pass[0].ganchos).toEqual([true, true]);
    // capacidade inferior no meio do vão ≥ As necessária
    const meio = 2.5, inf = det.barras.filter((x) => x.face === 'inf' && x.s0 <= meio && x.s1 >= meio).reduce((t, x) => t + x.n * barArea(x.phi), 0);
    expect(inf).toBeGreaterThanOrEqual(r.AsNec[0] - 1e-9);
    // negativo sobre o pilar do meio, cobrindo as duas faces
    const apoio = det.apoios[1], neg = det.barras.filter((x) => x.tipo === 'negativo' && x.s0 < apoio.s0 && x.s1 > apoio.s1);
    expect(neg.length).toBeGreaterThan(0);
    const sup = det.barras.filter((x) => x.face === 'sup' && x.s0 < apoio.s0 && x.s1 > apoio.s1).reduce((t, x) => t + x.n * barArea(x.phi), 0);
    expect(sup).toBeGreaterThanOrEqual(r.AsNec[1] - 1e-9);
    // comprimentos múltiplos de 5 cm e estribos fora dos pilares
    for (const x of det.barras) expect(Math.abs(x.comprimento / 0.05 - Math.round(x.comprimento / 0.05))).toBeLessThan(1e-6);
    expect(det.estribos.length).toBeGreaterThan(0);
    for (const z of det.estribos) for (const a of det.apoios) expect(z.s1 <= a.s0 + 1e-6 || z.s0 >= a.s1 - 1e-6).toBe(true);
    expect(det.peso).toBeGreaterThan(0);
    expect(d.resumoAcoVigas!.reduce((t, x) => t + x.pesoComPerdas, 0)).toBeCloseTo(1.1 * d.resumoAcoVigas!.reduce((t, x) => t + x.peso, 0), 9);
  });

  it('viga de 15 m: passante dividida com emenda sobre apoio interno, peças ≤ 12 m', () => {
    const { s, d } = viga3([5, 5, 5]);
    const det = d.detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)!;
    const pass = det.barras.filter((x) => x.tipo === 'passante');
    expect(pass.length).toBeGreaterThanOrEqual(2);
    for (const x of pass) expect(x.comprimento).toBeLessThanOrEqual(12 + 1e-9);
    const e = det.emendas.find((x) => x.face === 'inf')!;
    expect(det.apoios.slice(1, -1).some((a) => Math.abs((a.s0 + a.s1) / 2 - e.s) < 1e-6)).toBe(true);
    // traspasse: α0t = 2,0 (todas as passantes emendadas na seção) × lb
    expect(e.l0).toBeCloseTo(2 * det.lb.inf, 6);
  });
});
