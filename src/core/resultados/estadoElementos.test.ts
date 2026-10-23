import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import { estadoDoPilar, estadoDaViga, estadosDasVigas } from './estadoElementos';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.4 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('estado da seção dos elementos dimensionados', () => {
  const b = predio(), an = analisarEdificio(b), dim = dimensionarEdificio(b, an);

  it('viga: a armadura adotada resiste ao momento positivo (util ≤ 1), domínio 2 ou 3, ∫σ = N', () => {
    const r = dim.vigas[0], e = estadoDaViga(b, r)!;
    expect(e).toBeTruthy();
    expect(e.estado.resolvido).toBe(true);
    expect(e.estado.util).toBeLessThanOrEqual(1.02);
    expect(['2', '3']).toContain(e.estado.dominio);
    expect(Math.abs(e.estado.erroEquilibrio.N)).toBeLessThan(1e-8);
    expect(e.estado.barras.length).toBeGreaterThanOrEqual(2);
    expect(e.rotulo).toContain(r.nome);
    expect(estadosDasVigas(b, dim).length).toBe(dim.vigas.filter((v) => v.Mpos > 0 && v.arranjo.inf).length);
  });

  it('pilar retangular: estado do lance da base com a combinação determinante', () => {
    const r = dim.pilares.find((p) => p.pavimento === 'Térreo' && p.arranjo && p.determinantes?.length)!;
    const e = estadoDoPilar(b, r)!;
    expect(e).toBeTruthy();
    expect(e.estado.resolvido).toBe(true);
    expect(e.estado.integrados.N * 1000).toBeCloseTo(r.determinantes![0].Nd, 3);
    const a = r.arranjo!, nb = a.nb ?? 2, nh = a.nh ?? 2;
    expect(e.barras.length).toBe(nb + (a.nbS ?? nb) + (nh - 2) + ((a.nhD ?? nh) - 2));
  });
});
