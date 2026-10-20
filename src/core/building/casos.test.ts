import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { combinacoesEdificio } from './combinacoes';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}
const casoId = (s: Sessao, nome: string) => s.modelo.casos!.find((c) => c.nome === nome)!.id;

describe('casos adicionais e cargas nos pilares (N1c)', () => {
  it('carga no pilar: N no topo e H ao longo do lance em casos adicionais, com equilíbrio na fundação', () => {
    const { s, ok } = predio();
    ok('caso.criar', { nome: 'Equipamento', natureza: 'Q' });
    ok('caso.criar', { nome: 'Empuxo', natureza: 'W' });
    const p0 = s.modelo.pilares[0], eq = casoId(s, 'Equipamento'), em = casoId(s, 'Empuxo');
    ok('carga.pilar', { pilar: p0.id, caso: eq, N: 80 });
    const lance1 = s.modelo.pavimentos[0].id;
    ok('carga.pilar', { pilar: p0.id, pavimento: lance1, caso: em, altura: 0.5, Hx: 12, My: 3 });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    expect(an.casos).toEqual(['G', 'Q', eq, em]);
    expect(an.totais[eq]).toBeCloseTo(80, 9);
    const soma = (c: string, k: 'N' | 'Vx') => an.fundacao.filter((f) => f.caso === c).reduce((t, f) => t + f[k], 0);
    expect(soma(eq, 'N')).toBeCloseTo(80, 3);
    expect(soma(em, 'Vx')).toBeCloseTo(-12, 3); // reações equilibram a força horizontal
    expect(an.fundacao.filter((f) => f.caso === em && f.pilar === p0.id)[0].Vx).toBeLessThan(0);
  });

  it('combinações: incompatíveis nunca juntos, simultâneo com o mesmo fator e excepcional com γg 1,2 e ψ2', () => {
    const { s, ok } = predio();
    ok('vento.definir', { ativo: false });
    ok('caso.criar', { nome: 'Água', natureza: 'Q', grupo: 'reservatório' });
    ok('caso.criar', { nome: 'Vazio', natureza: 'Q', grupo: 'reservatório' });
    ok('caso.criar', { nome: 'Divisórias', natureza: 'Q', simultaneo: 'Q' });
    ok('caso.criar', { nome: 'Impacto', natureza: 'E' });
    const ag = casoId(s, 'Água'), vz = casoId(s, 'Vazio'), dv = casoId(s, 'Divisórias'), im = casoId(s, 'Impacto');
    const combs = combinacoesEdificio(s.modelo, analisarEdificio(s.modelo));
    for (const c of combs) {
      expect(c.fatores[ag] && c.fatores[vz], c.nome).toBeFalsy();
      expect(c.fatores[dv], c.nome).toBe(c.fatores.Q);
    }
    expect(combs.some((c) => c.fatores[ag])).toBe(true);
    const exc = combs.filter((c) => c.nome.startsWith('ELU excepcional'));
    expect(exc.length).toBeGreaterThan(0);
    const e1 = exc.find((c) => c.nome.includes('G desf.'))!;
    expect(e1.fatores).toMatchObject({ G: 1.2, [im]: 1, Q: 0.3 });
    expect(combs.filter((c) => !c.nome.startsWith('ELU excepcional')).every((c) => !c.fatores[im])).toBe(true);
    // remover o caso leva as cargas junto
    ok('carga.pilar', { pilar: s.modelo.pilares[0].id, caso: ag, N: 10 });
    ok('caso.remover', { id: ag });
    expect(s.modelo.cargasPilar).toBeUndefined();
  });
});
