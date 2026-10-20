import { describe, expect, it } from 'vitest';
import { s2, classeVento } from './vento';
import { analisarEdificio } from './analitico';
import { combinacoesEdificio, combinar } from './combinacoes';
import { resumoAnalise } from './resumo';
import { comandosEdificioPadrao, Sessao } from '../commands';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s;
}

describe('vento (NBR 6123)', () => {
  it('S2 pela Tabela 1 e classe pela maior dimensão', () => {
    expect(s2('IV', 'B', 10)).toBeCloseTo(0.86 * 0.98, 10);
    expect(s2('II', 'A', 30)).toBeCloseTo(3 ** 0.085, 10);
    expect([classeVento(20), classeVento(20.1), classeVento(51)]).toEqual(['A', 'B', 'C']);
  });

  it('forças por pavimento, equilíbrio da base e torção das excentricidades', () => {
    const an = analisarEdificio(predio().modelo);
    expect(an.erro).toBeUndefined();
    const v = an.vento!;
    expect(v.casos).toHaveLength(12);
    expect(v.classe).toBe('A'); // altura 12 m, planta 6 × 5
    const w0 = v.casos.find((c) => c.nome === 'W0°')!;
    const t2 = w0.forcas.find((f) => f.pavimento === 'pav_5')!; // Tipo 2, z = 6 m
    const vk = 35 * s2('IV', 'A', 6), q = (0.613 * vk * vk) / 1000;
    expect(t2.largura).toBeCloseTo(5.25, 9); // pilares 25 × 25 cm nos cantos
    expect(t2.altura).toBeCloseTo(3, 9);
    expect(t2.F).toBeCloseTo(1.3 * q * 5.25 * 3, 9);
    const base = (caso: string, g: 'Vx' | 'Vy') => an.fundacao.filter((f) => f.caso === caso).reduce((s, f) => s + f[g], 0);
    const total = w0.forcas.reduce((s, f) => s + f.F, 0);
    expect(base('W0°', 'Vx')).toBeCloseTo(-total, 6);
    const w90 = v.casos.find((c) => c.nome === 'W90°+e')!;
    expect(base('W90°+e', 'Vy')).toBeCloseTo(-w90.forcas.reduce((s, f) => s + f.F, 0), 6);
    expect(Math.abs(w90.forcas[1].Mz)).toBeGreaterThan(0);
  });

  it('γz por direção com rigidez reduzida; combinações e envoltórias na fundação', () => {
    const b = predio().modelo;
    const an = analisarEdificio(b);
    const gz = an.vento!.gamaZ;
    expect(gz).toHaveLength(4);
    for (const g of gz) { expect(g.max).toBeGreaterThan(1); expect(g.usoPrincipal).toBeGreaterThanOrEqual(g.ventoPrincipal); }
    expect(gz[0].max).toBeCloseTo(gz[2].max, 9); // 0° e 180° simétricos
    const combs = combinacoesEdificio(b, an);
    // Q sozinha + Q com cada vento; cada vento sozinho (N mínimo na fundação) e com ψ1·Q
    expect(combs.filter((c) => c.tipo === 'RARA')).toHaveLength(1 + 12 + 2 * 12);
    const elu = combs.filter((c) => c.tipo === 'ELU');
    expect(elu.some((c) => c.fatores.G === 1.4 && c.fatores.Q === 1.4 && Object.keys(c.fatores).length === 2)).toBe(true);
    const r = resumoAnalise(b, an);
    for (const f of r.fundacao) {
      expect(f.NdMax).toBeGreaterThanOrEqual(1.4 * (f.NG + f.NQ) - 1e-6);
      expect(f.NraraMax).toBeGreaterThanOrEqual(f.NG + f.NQ - 1e-6);
    }
    expect(combinar({ G: 10, Q: 5 }, { nome: 'x', tipo: 'ELU', fatores: { G: 1.4, Q: 1.4 } })).toBeCloseTo(21);
  });

  it('γz > 1,1 amplia o vento das ELU por 0,95 γz', () => {
    const s = predio();
    // pilares esbeltos: 15 × 15 cm deixam a estrutura flexível
    for (const p of s.modelo.pilares) s.executar('pilar.editar', { id: p.id, secao: { tipo: 'ret', b: 0.15, h: 0.15 } });
    s.executar('vento.definir', { v0: 45 });
    const an = analisarEdificio(s.modelo);
    const g0 = an.vento!.gamaZ.find((g) => g.direcao === 0)!;
    if (g0.max > 1.1) {
      const c = combinacoesEdificio(s.modelo, an).find((x) => x.tipo === 'ELU' && x.fatores['W0°'] && x.nome.includes('W0° principal'))!;
      expect(c.fatores['W0°']).toBeCloseTo(1.4 * 0.95 * g0.max, 3);
    } else expect.fail(`γz ${g0.max} não passou de 1,1 no exemplo`);
  });
});
