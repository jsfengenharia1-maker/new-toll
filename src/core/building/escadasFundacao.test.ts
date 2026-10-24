// Escada apoiada no nível de fundação (E4e, C11.26): as reações viram cargas do grupo "fundacao", que a fundação do edifício
// (fundacao.ts, baseElastica.ts, sapataCorrida.ts) já lê por `comEscadas`.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { calcularEscadas, comEscadas } from './escadasCalculo';

const E = 0.5 / 3, PISO = 0.2967;
function escadaNaFundacao() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((x) => x.mensagem).join(' ')}`).toBe(true); };
  ok('tipoLance.criar', { id: 'T', tipo: { nome: 'T', tipologia: 'reto', trechos: [18], espessura: 0.15, desnivelInicial: 1.0 } });
  const pav = s.modelo.pavimentos.slice().sort((a, b) => a.cota - b.cota)[0];
  // a base da escada fica 1,0 m abaixo do piso do primeiro pavimento (desnível inicial): apoia no nível de fundação
  ok('escada.criar', { id: 'e1', grupo: pav.grupo, origem: [0, 0], angulo: 0, piso: PISO, espelho: E, lances: [{ tipo: 'T' }] });
  return s.modelo;
}

describe('E4e: reações da escada no nível de fundação', () => {
  const b = escadaNaFundacao();
  const res = calcularEscadas(b);
  const fund = comEscadas(b, res).cargas.filter((c) => c.escada && c.grupo === 'fundacao');
  it('o apoio inferior da escada que parte abaixo do piso gera cargas lineares G e Q no grupo "fundacao", com a reação do cálculo', () => {
    expect(res.lances[0].erro).toBeUndefined();
    expect(fund.some((c) => c.caso === 'G')).toBe(true);
    expect(fund.some((c) => c.caso === 'Q')).toBe(true);
    const inf = res.lances[0].apoios.find((a) => a.id === 'inf')!;
    for (const caso of ['G', 'Q'] as const) {
      const total = fund.filter((c) => c.caso === caso && c.escada!.apoio === 'inf').reduce((s, c) => s + c.valor * Math.hypot(c.pontos[1][0] - c.pontos[0][0], c.pontos[1][1] - c.pontos[0][1]), 0);
      expect(Math.abs(total / (inf.porMetro[caso] * inf.comprimento) - 1)).toBeLessThan(1e-6);
    }
  });
});
