import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { concrete, torsionRect } from '../concrete';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';

/** Grade 2 × 1 vãos de 5 m (pilares 25 × 25, vigas 15 × 40, laje maciça 12 cm); vento opcional. */
function grade(vento = false) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  if (!vento) ok('vento.definir', { ativo: false });
  ok('lote', { comandos: [[0, 0], [5, 0], [10, 0], [0, 5], [5, 5], [10, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [[[0, 0], [10, 0]], [[0, 5], [10, 5]], [[0, 0], [0, 5]], [[5, 0], [5, 5]], [[10, 0], [10, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  const dim = () => { const an = analisarEdificio(s.modelo); expect(an.erro).toBeUndefined(); return dimensionarEdificio(s.modelo, an); };
  /** Primeira viga contínua (y = 0) do primeiro pavimento-tipo. */
  const v1 = (d: ReturnType<typeof dim>) => d.vigas.find((v) => v.grupo === 'g_3' && v.L > 9)!;
  return { s, ok, dim, v1 };
}

describe('verificações das vigas e pilares (N1e)', () => {
  it('torção retangular: seção vazada equivalente e TRd2 (NBR 6118, 17.5.1.4–17.5.1.6)', () => {
    const c = concrete(30), b = 0.2, h = 0.5, c1 = 0.045, Td = 10;
    const r = torsionRect(b, h, c1, Td, c, 435, 435);
    const he = (b * h) / (2 * (b + h)); // A/u = 7,1 cm < 2c1 = 9 cm: he = 2c1 (cabe na parede)
    const heAdot = he < 2 * c1 ? 2 * c1 : he;
    expect(r.he).toBeCloseTo(heAdot, 9);
    const Ae = (b - heAdot) * (h - heAdot), ue = 2 * (b - heAdot + h - heAdot);
    expect(r.TRd2).toBeCloseTo(0.5 * (1 - 30 / 250) * (30 / 1.4) * Ae * heAdot * 1000, 6);
    expect(r.a90S).toBeCloseTo(Td / 1000 / (2 * Ae * 435), 12);
    expect(r.Asl).toBeCloseTo(((Td / 1000) * ue) / (2 * Ae * 435), 12);
  });

  it('redistribuição: negativo do apoio interno × δ, positivo aumenta; δ limitado a 0,75', () => {
    const { ok, dim, v1 } = grade();
    const r0 = v1(dim());
    expect(r0.delta).toBe(1);
    ok('opcoes.definir', { valores: { redistribuicao: 15 } });
    const r1 = v1(dim());
    expect(r1.delta).toBeGreaterThanOrEqual(0.85 - 1e-9);
    expect(r1.Mneg / r0.Mneg).toBeCloseTo(r1.delta, 1);
    expect(r1.Mpos).toBeGreaterThan(r0.Mpos);
    expect(r1.mensagens.some((m) => m.startsWith('Redistribuição'))).toBe(true);
    ok('opcoes.definir', { valores: { redistribuicao: 25 } });
    expect(v1(dim()).delta).toBeGreaterThanOrEqual(0.75 - 1e-9);
  });

  it('momentos mínimos p·ℓ²/x', () => {
    const { ok, dim, v1 } = grade();
    const r0 = v1(dim());
    ok('opcoes.definir', { valores: { momentoMinPositivo: 8 } }); // ≥ momento isostático do vão
    const r1 = v1(dim());
    expect(r1.Mpos).toBeGreaterThan(r0.Mpos * 1.2);
    ok('opcoes.definir', { valores: { momentoMinPositivo: 0, momentoMinNegativo: 4 } }); // 2 × isostático no apoio
    expect(v1(dim()).Mneg).toBeLessThan(r0.Mneg * 1.2);
  });

  it('cortante a partir da face e de d/2 da face', () => {
    const { ok, dim, v1 } = grade();
    const V0 = v1(dim()).V;
    ok('opcoes.definir', { valores: { cortanteApoio: 1 } });
    const V1 = v1(dim()).V;
    ok('opcoes.definir', { valores: { cortanteApoio: 2 } });
    const V2 = v1(dim()).V;
    expect(V1).toBeLessThanOrEqual(V0);
    expect(V2).toBeLessThan(V1);
  });

  it('fissuração: limite menor aumenta a armadura', () => {
    const { ok, dim, v1 } = grade();
    const dimL0 = dim(), r0 = v1(dimL0);
    expect(r0.wkLim).toBeCloseTo(0.3, 9); // CAA II
    expect(r0.wk[0]).toBeGreaterThan(0);
    ok('opcoes.definir', { valores: { limiteFissura: 0.05 } });
    const d1 = dim(), r1 = v1(d1);
    expect(r1.AsInf).toBeGreaterThan(r0.AsInf);
    expect(r1.mensagens.some((m) => m.includes('fissuras'))).toBe(true);
    // lajes maciças: wk na combinação frequente e armadura aumentada com o limite menor
    const l0 = dimL0.lajes[0], l1 = d1.lajes.find((x) => x.laje === l0.laje && x.pavimento === l0.pavimento)!;
    expect(l0.wk).toBeGreaterThan(0);
    expect(l1.As.pos[0] + l1.As.pos[1]).toBeGreaterThan(l0.As.pos[0] + l0.As.pos[1]);
  });

  it('torção de compatibilidade: verificada por padrão e desprezada com a opção', () => {
    const { ok, dim } = grade(true);
    const T = (d: ReturnType<typeof dim>) => Math.max(...d.vigas.map((v) => v.T));
    expect(T(dim())).toBeGreaterThan(0);
    ok('opcoes.definir', { valores: { verificarTorcao: 0 } });
    expect(T(dim())).toBe(0);
  });

  it('cortante nos pilares: carga horizontal grande reduz o espaçamento dos estribos', () => {
    const { s, ok, dim } = grade();
    const p0 = s.modelo.pilares[0], lance = s.modelo.pavimentos[0].id;
    const est0 = dim().pilares.find((x) => x.pilar === p0.id)!;
    ok('carga.pilar', { pilar: p0.id, pavimento: lance, caso: 'G', altura: 1, Hx: 150 });
    const est1 = dim().pilares.filter((x) => x.pilar === p0.id).find((x) => x.pavimento === est0.pavimento)!;
    expect(est1.Vd!).toBeGreaterThan(50);
    const sp = (e: string) => +e.split('c/')[1];
    expect(sp(est1.estribo) < sp(est0.estribo) || +est1.estribo.slice(1).split(' ')[0].replace(',', '.') > +est0.estribo.slice(1).split(' ')[0].replace(',', '.')).toBe(true);
  });
});
