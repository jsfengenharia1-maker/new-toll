import { describe, expect, it } from 'vitest';
import { esforcosAoLongo, dimensionarEdificio, cargasParaFundacao, quantitativos } from './dimensionamento';
import { analisarEdificio } from './analitico';
import { resolver3, type Modelo3 } from '../fe3d';
import { comandosEdificioPadrao, Sessao } from '../commands';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('esforços ao longo da barra', () => {
  it('viga biapoiada: momento no meio e cortante com carga distribuída e concentrada', () => {
    const L = 6, q = -10, P = -20, a = 2;
    const m: Modelo3 = { nos: [[0, 0, 0], [L, 0, 0]], barras: [{ i: 0, j: 1, E: 30e6, G: 12e6, A: 0.06, Iz: 0.0008, Iy: 0.0001, J: 0.0002, libI: [4, 5], libJ: [4, 5] }],
      apoios: new Map([[0, [0, 1, 2, 3, 4, 5]], [1, [1, 2, 3, 4, 5]]]) };
    const caso = { nodais: [], distribuidas: [{ barra: 0, q: [0, 0, q] as [number, number, number] }], pontuais: [{ barra: 0, a, f: [0, 0, P, 0, 0, 0] }] };
    const r = resolver3(m, [caso]);
    const est = esforcosAoLongo(m, 0, r.esforcos[0][0], caso, [0, a, 3, L]);
    const Ra = (-q * L) / 2 + (-P * (L - a)) / L;
    expect(est[0].Mz).toBeCloseTo(0, 6);
    expect(est[2].Mz).toBeCloseTo(Ra * 3 + (q * 9) / 2 + P * (3 - a), 6); // M(3) = Ra·3 − q·3²/2 − P·1
    expect(est[3].Mz).toBeCloseTo(0, 6);
    expect(Math.abs(est[0].Vy)).toBeCloseTo(Ra, 6);
  });
});

describe('dimensionamento do edifício', () => {
  it('vigas, pilares e lajes atendem; quantitativos e cargas para Fundações', () => {
    const b = predio();
    const an = analisarEdificio(b);
    const d = dimensionarEdificio(b, an);
    expect(d.vigas).toHaveLength(4);
    for (const v of d.vigas) { expect(v.status).toBe('ok'); expect(v.Mpos).toBeGreaterThan(0); expect(v.AsInf).toBeGreaterThan(0); expect(v.barrasInf).toMatch(/φ/); }
    expect(d.pilares).toHaveLength(4 * 5);
    for (const p of d.pilares) expect(['ok', 'review']).toContain(p.status);
    const base = d.pilares.filter((p) => p.pavimento === 'Térreo').map((p) => p.Nd), topo = d.pilares.filter((p) => p.pavimento === 'Cobertura').map((p) => p.Nd);
    expect(Math.min(...base)).toBeGreaterThan(Math.max(...topo));
    expect(d.lajes).toHaveLength(3);
    for (const l of d.lajes) { expect(l.As.pos[0]).toBeGreaterThan(0); expect(l.flecha).toBeGreaterThan(0); }
    const q = quantitativos(b);
    const soma = (k: 'lajes' | 'vigas' | 'pilares') => q.reduce((s, x) => s + x.concreto[k], 0);
    expect(soma('vigas')).toBeCloseTo(3 * 0.15 * 0.4 * 22, 6);
    expect(soma('lajes')).toBeCloseTo(3 * 30 * 0.12, 6);
    expect(soma('pilares')).toBeCloseTo(4 * 0.0625 * 13.5, 6);
    const fl = cargasParaFundacao(b, an);
    expect(fl).toHaveLength(4);
    const nG = an.fundacao.filter((f) => f.caso === 'G'), nQ = an.fundacao.filter((f) => f.caso === 'Q');
    fl.forEach((f, i) => { expect(f.Nk).toBeGreaterThanOrEqual(nG[i].N + nQ[i].N - 1e-6); expect(f.NkPerm).toBeCloseTo(nG[i].N, 1); expect(f.ap).toBe(0.25); });
  });
});
