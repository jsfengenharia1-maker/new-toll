import { describe, expect, it } from 'vitest';
import { DOCA_MAX, DOCA_MIN, limitaDoca, useLayout } from './layout';

describe('layout', () => {
  it('limita a largura da doca entre 140 e 640 px e arredonda', () => {
    expect(limitaDoca(50)).toBe(DOCA_MIN);
    expect(limitaDoca(9999)).toBe(DOCA_MAX);
    expect(limitaDoca(301.6)).toBe(302);
  });
  it('doca sem registro nasce aberta com a largura padrão; setDoca muda só o pedido', () => {
    const s = useLayout.getState();
    s.setDoca('t-esq', { w: 500 }, 400);
    expect(useLayout.getState().docas['t-esq']).toEqual({ w: 500, aberta: true });
    s.setDoca('t-esq', { aberta: false }, 400);
    expect(useLayout.getState().docas['t-esq']).toEqual({ w: 500, aberta: false });
    s.setDoca('t-nova', { aberta: false }, 380);
    expect(useLayout.getState().docas['t-nova']).toEqual({ w: 380, aberta: false });
  });
  it('aba da faixa por módulo e faixa recolhida', () => {
    const s = useLayout.getState();
    s.setAba('edificio', 'analise');
    s.setAba('portico', 'vista');
    expect(useLayout.getState().aba).toMatchObject({ edificio: 'analise', portico: 'vista' });
    s.setFaixaAberta(false);
    expect(useLayout.getState().faixaAberta).toBe(false);
    s.setFaixaAberta(true);
  });
});
