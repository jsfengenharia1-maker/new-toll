import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { lbBasico } from './detalhamento';
import { gramposPorEstribo } from './detalhamentoPilares';
import { dimensionarEdificio } from './dimensionamento';
import { concrete } from '../concrete';
import { lancesDoPilar, pavimentosOrdenados } from './types';

function predio(vezes = 4) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('pavimento.repetir', { id: 'pav_6', vezes });
  ok('vento.definir', { ativo: false });
  ok('lote', { comandos: [[0, 0], [5, 0], [5, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
  ok('lote', { comandos: [[[0, 0], [5, 0]], [[0, 5], [5, 5]], [[0, 0], [0, 5]], [[5, 0], [5, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  const dim = () => dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
  return { s, ok, dim };
}

describe('detalhamento dos pilares (R3b)', () => {
  it('grampos: barras intermediárias a mais de 20φt do canto (NBR 6118, 18.2.4)', () => {
    // face de 60 cm com 4 barras, a = 4 cm: barras a 17,3 cm do canto > 20·5 mm = 10 cm → 2 por face larga
    expect(gramposPorEstribo(0.6, 0.2, 0.04, 4, 2, 5)).toBe(4);
    expect(gramposPorEstribo(0.6, 0.2, 0.04, 4, 2, 10)).toBe(0); // 20φt = 20 cm ≥ 17,3 cm: protegidas pelo estribo de canto
  });

  it('espera na fundação, emendas lb entre lances iguais, gancho no topo; continuidade de cima para baixo', () => {
    const { s, dim } = predio();
    const d = dim(), p = s.modelo.pilares[0], det = d.detalhesPilares!.find((x) => x.pilar === p.id)!;
    const ls = lancesDoPilar(s.modelo, p);
    expect(det.lances).toHaveLength(ls.length);
    const lb0 = det.lb[ls[0].id];
    const primeira = det.barras.find((x) => x.lances.includes(ls[0].id) && x.tipo === 'longitudinal')!;
    expect(primeira.ganchos[0]).toBe(true);
    const base = s.modelo.pavimentos.length ? Math.min(...s.modelo.pavimentos.map((x) => x.cota)) - s.modelo.obra.profundidadeFundacao : 0;
    expect(primeira.z0).toBeCloseTo(base - lb0, 9);
    const ultima = det.barras.filter((x) => x.tipo === 'longitudinal').at(-1)!;
    expect(ultima.ganchos[1]).toBe(true);
    expect(det.lances.at(-1)!.transicao).toBe('topo');
    expect(det.peso).toBeGreaterThan(0);
    // continuidade: abaixo do penúltimo lance, As e bitola não diminuem descendo
    const rs = ls.map((l) => d.pilares.find((r) => r.pilar === p.id && r.pavimentoId === l.id)!);
    for (let i = 0; i <= rs.length - 3; i++) {
      expect(rs[i].As).toBeGreaterThanOrEqual(rs[i + 1].As - 1e-12);
      expect(rs[i].arranjo!.phi).toBeGreaterThanOrEqual(rs[i + 1].arranjo!.phi);
    }
    expect(d.resumoAcoPilares!.reduce((t, x) => t + x.peso, 0)).toBeGreaterThan(0);
  });

  it('união de lances curtos com a mesma armadura e arranque na mudança grande de seção', () => {
    const { s, ok, dim } = predio(2);
    ok('opcoes.definir', { valores: { pilarUniaoLances: 8, continuidadePilares: 0 } });
    const p = s.modelo.pilares[0], ls = lancesDoPilar(s.modelo, p);
    const d = dim(), det = d.detalhesPilares!.find((x) => x.pilar === p.id)!;
    const rs = ls.map((l) => d.pilares.find((r) => r.pilar === p.id && r.pavimentoId === l.id)!);
    if (rs.length > 1 && JSON.stringify(rs[0].arranjo) === JSON.stringify(rs[1].arranjo)) expect(det.lances[0].transicao).toBe('continua');
    // seção do último lance bem menor: deslocamento das faces / altura da viga > 1/6 → arranque
    const ult = ls.at(-1)!, pen = ls.at(-2)!;
    ok('pilar.secaoLance', { id: p.id, pavimento: ult.id, secao: { tipo: 'ret', b: 0.2, h: 0.2 } });
    const det2 = dim().detalhesPilares!.find((x) => x.pilar === p.id)!;
    expect(det2.lances.find((l) => l.pavimento === pen.id)!.transicao).toBe('arranque');
    const arr = det2.barras.find((x) => x.tipo === 'arranque')!;
    const topo = pavimentosOrdenados(s.modelo).find((x) => x.id === pen.id)!.cota;
    const lb = lbBasico(arr.phi, concrete(30), 500 / 1.15, true);
    expect(arr.z0).toBeCloseTo(topo - lb, 9);
    expect(arr.z1).toBeCloseTo(topo + lb, 9);
  });
});
