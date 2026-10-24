// V7c: estado da seção circular (cálculo à mão por faixas), distorção e vento por direção, vento na malha e
// esforços do pilar-parede por hipótese.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import { fiberSigmaC } from '../fiber';
import { concretoDe } from '../building/materiais';
import { estadoDoPilar } from './estadoElementos';
import { barrasDoCirculo, estadoDaSecao, secaoArmada, secaoCircularArmada, secaoRetangularArmada } from './estadoSecao';

function predio(secao: Record<string, unknown>, vento = false) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  if (!vento) s.executar('vento.definir', { ativo: false });
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('V7c: estado da seção circular (K1.11.30)', () => {
  const b = predio({ tipo: 'circ', d: 0.4 }), an = analisarEdificio(b), dim = dimensionarEdificio(b, an);

  it('pilar circular do dimensionamento: n barras, ∫σ = Nd e integral por faixas independente confere N e M', () => {
    const r = dim.pilares.find((p) => p.pavimento === 'Térreo' && p.arranjo?.n !== undefined && p.determinantes?.length)!;
    expect(r).toBeTruthy();
    const e = estadoDoPilar(b, r)!;
    expect(e.forma).toBe('circ');
    expect(e.estado.resolvido).toBe(true);
    expect(e.barras.length).toBe(r.arranjo!.n);
    expect(Math.abs(e.estado.erroEquilibrio.N)).toBeLessThan(1e-8);
    expect(e.estado.integrados.N * 1000).toBeCloseTo(r.determinantes![0].Nd, 3);
    expect(e.estado.util).toBeLessThanOrEqual(1.02);
    // cálculo à mão: faixas perpendiculares à normal da linha neutra, largura da corda 2·√(R² − (R − prof)²)
    const s = e.estado, R = e.b / 2, c = concretoDe(b, 'pilar', undefined, b.pilares[0]), n = 4000;
    const eps = (prof: number) => s.epsTopo - ((s.epsTopo - s.epsBase) * prof) / s.h;
    let Rc = 0, Mc = 0;
    for (let k = 0; k < n; k++) {
      const prof = ((k + 0.5) * s.h) / n, ep = eps(prof);
      if (ep <= 0) continue;
      const w = 2 * Math.sqrt(Math.max(0, R * R - (R - prof) ** 2)), dA = (w * s.h) / n;
      Rc += fiberSigmaC(ep, c) * dA; Mc += fiberSigmaC(ep, c) * dA * (R - prof);
    }
    const Fs = s.barras.reduce((t, q) => t + q.F, 0), Ms = s.barras.reduce((t, q) => t + q.F * (R - q.prof), 0);
    expect(Math.abs((Rc + Fs) / s.integrados.N - 1)).toBeLessThan(0.02);
    expect(Math.abs((Mc + Ms) / (s.MRd / 1000) - 1)).toBeLessThan(0.02);
    expect(Math.abs(s.concreto.Rc / Rc - 1)).toBeLessThan(0.02);
  });

  it('seção circular direta: bloco retangular equivalente = segmento circular × σcd (solução analítica)', () => {
    const c = concretoDe(b, 'pilar', undefined, b.pilares[0]);
    const S = secaoCircularArmada(0.5, barrasDoCirculo(0.5, 0.05, 8, 16), c, 435, 120);
    const e = estadoDaSecao(S, 800, 0, 120);
    expect(e.resolvido).toBe(true);
    const R = 0.25, hx = Math.min(e.h, c.lambda * e.x!);
    const seg = R * R * Math.acos((R - hx) / R) - (R - hx) * Math.sqrt(2 * R * hx - hx * hx);
    expect(Math.abs(e.concreto.retangular.Rc / (seg * c.sigmaCd) - 1)).toBeLessThan(0.015); // polígono de 48 lados e faixas de 4 mm
  });
});

describe('V7c: seção poligonal genérica', () => {
  it('quadrado como polígono = seção retangular; hexágono regular equilibra ∫σ = N', () => {
    const bb = predio({ tipo: 'ret', b: 0.3, h: 0.3 });
    const c = concretoDe(bb, 'pilar', undefined, bb.pilares[0]);
    const barras = [{ x: 0.05, y: 0.05, A: 3e-4 }, { x: 0.25, y: 0.05, A: 3e-4 }, { x: 0.05, y: 0.25, A: 3e-4 }, { x: 0.25, y: 0.25, A: 3e-4 }];
    const a = estadoDaSecao(secaoArmada([[0, 0], [0.3, 0], [0.3, 0.3], [0, 0.3]], barras, c, 435), 500, 0, 60);
    const r = estadoDaSecao(secaoRetangularArmada(0.3, 0.3, barras, c, 435), 500, 0, 60);
    expect(a.MRd).toBeCloseTo(r.MRd, 6);
    const hex = Array.from({ length: 6 }, (_, k) => [0.2 + 0.2 * Math.cos((Math.PI * k) / 3), 0.2 + 0.2 * Math.sin((Math.PI * k) / 3)] as [number, number]);
    const h = estadoDaSecao(secaoArmada(hex, barrasDoCirculo(0.4, 0.05, 6, 16), c, 435), 600, 0, 80);
    expect(h.resolvido).toBe(true);
    expect(Math.abs(h.erroEquilibrio.N)).toBeLessThan(1e-8);
  });
});
