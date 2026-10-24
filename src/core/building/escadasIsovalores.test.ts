// Isovalores do lance (E4e, C8.51): lance reto biapoiado contra o cálculo à mão (M = q·ℓ²/8; flecha pela solução analítica do E4c) e propriedades do campo.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { calcularEscadas } from './escadasCalculo';
import { campoLance, projetarCampo, GRANDEZAS_ESCADA } from './escadasIsovalores';
import { gamas } from './materiais';

const E = 0.5 / 3, PISO = 0.2967;
function lanceReto() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const r1 = s.executar('tipoLance.criar', { id: 'T', tipo: { nome: 'T', tipologia: 'reto', trechos: [18], espessura: 0.15 } });
  const r2 = s.executar('escada.criar', { id: 'e1', grupo: 'g_3', origem: [0, 0], angulo: 0, piso: PISO, espelho: E, lances: [{ tipo: 'T' }] });
  expect(r1.ok && r2.ok).toBe(true);
  return s.modelo;
}

describe('E4e: isovalores do lance', () => {
  const b = lanceReto(), gm = gamas(b);
  const sem = calcularEscadas(b).lances[0], res = calcularEscadas(b, { detalhe: true }).lances[0];
  const ell = 17 * PISO, cosA = PISO / Math.hypot(PISO, E), h = 0.15;
  const pg = (25 * h) / cosA + (25 * E) / 2 + 1, pq = 2.5;
  const Md = (gm.g * pg * ell * ell) / 8 + (gm.q * pq * ell * ell) / 8;

  it('sem o detalhe não há campo; com o detalhe, 4 triângulos por elemento', () => {
    expect(campoLance(sem, 'Mx', 'comb', gm)).toBeUndefined();
    const c = campoLance(res, 'Mx', 'comb', gm)!;
    expect(c.tris.length).toBe(4 * res.elementos);
    expect(res.triangulosDetalhe).toHaveLength(res.elementos);
    expect(res.triangulosDetalhe![0]).toHaveLength(6);
  });

  it('Mx de cálculo: máximo do campo perto de q·ℓ²/8 por metro (≤ 6 %) e nunca acima do máximo dos elementos', () => {
    const c = campoLance(res, 'Mx', 'comb', gm)!;
    expect(Md).toBeCloseTo(44.007, 2);
    expect(Math.abs(c.max / Md - 1)).toBeLessThan(0.06);
    expect(c.max).toBeLessThanOrEqual(res.momentos.MxPos + 1e-9);
    expect(c.unidade).toBe('kN·m/m');
    expect(c.titulo).toContain('γg·G + γq·Q (ELU)');
  });

  it('deslocamento vertical: G e Q, para baixo positivo, máximo do campo ≤ o do cálculo e ≥ 90 % dele; G + Q soma', () => {
    const g = campoLance(res, 'uz', 'G', gm)!, q = campoLance(res, 'uz', 'Q', gm)!, t = campoLance(res, 'uz', 'comb', gm)!;
    expect(g.unidade).toBe('mm');
    expect(g.max).toBeLessThanOrEqual(res.deslocamento.G * 1000 + 1e-9);
    expect(g.max).toBeGreaterThan(0.9 * res.deslocamento.G * 1000);
    expect(q.max).toBeGreaterThan(0.9 * res.deslocamento.Q * 1000);
    expect(t.max).toBeGreaterThan(g.max);
    expect(t.max).toBeLessThanOrEqual((res.deslocamento.G + res.deslocamento.Q) * 1000 + 1e-9);
    expect(g.min).toBeGreaterThanOrEqual(-1e-9);
  });

  it('todas as grandezas geram campo; caixa cobre os nós; a projeção isométrica ordena do fundo para a frente', () => {
    for (const x of GRANDEZAS_ESCADA) {
      const c = campoLance(res, x.v, 'comb', gm)!;
      expect(c.tris.length).toBeGreaterThan(0);
      expect(c.max).toBeGreaterThanOrEqual(c.min);
      expect(c.caixa[2]).toBeGreaterThan(c.caixa[0]);
    }
    const c = campoLance(res, 'Mx', 'G', gm)!, p = projetarCampo(c);
    expect(p).toHaveLength(c.tris.length);
    expect(p.caixa![2]).toBeGreaterThan(p.caixa![0]);
    expect(p.every((t) => t.pts.length === 3 && t.pts.every((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])))).toBe(true);
  });
});
