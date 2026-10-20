import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { classificar, revisarEdificio } from './revisao';

function torre(vezes = 8, b = 0.2) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => expect(s.executar(n, p).ok, n).toBe(true);
  ok('pavimento.repetir', { id: 'pav_6', vezes });
  ok('vento.definir', { v0: 50 });
  ok('lote', { comandos: [[0, 0], [3, 0], [3, 3], [0, 3]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b, h: b } } })) });
  ok('lote', { comandos: [[[0, 0], [3, 0]], [[0, 3], [3, 3]], [[0, 0], [0, 3]], [[3, 0], [3, 3]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}

describe('revisão de resultados (R1)', () => {
  it('deslocamentos laterais: frequente ψ1 = 0,3, crescentes com a altura, limites H/1700 e hi/850', () => {
    const { s } = torre();
    const an = analisarEdificio(s.modelo);
    const d = an.vento!.deslocamentos!.find((x) => x.direcao === 0)!;
    expect(d.psi1).toBe(0.3);
    const u = d.pavimentos.map((p) => p.u);
    for (let i = 1; i < u.length; i++) expect(u[i]).toBeGreaterThanOrEqual(u[i - 1] - 1e-12);
    expect(d.limTopo).toBeCloseTo(d.H / 1700, 12);
    expect(d.pavimentos[1].limDrift).toBeCloseTo(d.pavimentos[1].hi / 850, 12);
    expect(d.topo).toBeCloseTo(u.at(-1)!, 12);
    // torre esbelta com pilares 20 × 20: passa do limite do topo → erro DESLOC na revisão
    expect(d.ok).toBe(false);
    const rv = revisarEdificio(s.modelo, an, null);
    expect(rv.itens.some((x) => x.codigo === 'DESLOC' && x.nivel === 'erro')).toBe(true);
  });

  it('classificação das mensagens e pior nível por elemento; envoltória da viga bate com o dimensionamento', () => {
    expect(classificar('Biela comprimida: Vsd 10 > VRd2 5 kN.')).toEqual({ codigo: 'BIELA', nivel: 'erro' });
    expect(classificar('Armadura dupla (x limitado): aumente a altura.').nivel).toBe('aviso');
    expect(classificar('Redistribuição nos apoios internos: δ = 0,85.').nivel).toBe('info');
    const { s } = torre(2, 0.3);
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    const v = dim.vigas[0];
    expect(Math.max(...v.envoltoria.pontos.map((p) => p.Mmax))).toBeCloseTo(v.Mpos, 1);
    expect(Math.min(...v.envoltoria.pontos.map((p) => p.Mmin))).toBeCloseTo(v.Mneg, 1);
    expect(v.envoltoria.determinantes.Mmax).toMatch(/ELU/);
    const p = dim.pilares[0];
    expect(p.determinantes!.length).toBeGreaterThan(0);
    // pilar forçado a reprovar: erro por elemento
    const falso = { ...dim, pilares: dim.pilares.map((x, i) => (i ? x : { ...x, status: 'fail' as const, util: 1.2, mensagens: [] })) };
    const rv = revisarEdificio(s.modelo, an, falso);
    expect(rv.porElemento.get(`pilar|${p.pilar}`)).toBe('erro');
    expect(rv.itens[0].nivel).toBe('erro');
  });
});
