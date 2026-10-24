// Prancha de detalhe das escadas (E4e, C8.55): montagem, tabela de aço somando com o resumo do dimensionamento, ordem no conjunto, DXF.
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import { lerDxf } from '../dxf/read';
import { montarConjunto, ORDEM_CONJUNTO } from './conjunto';
import { escreverDxf } from './dxf';
import { edificioExemplo } from './exemplo';
import { SIGLAS } from './prancha';

function comEscada() {
  const s = edificioExemplo();
  const r = s.executar('escada.criar', { id: 'e1', grupo: 'g_3', origem: [2, 1], angulo: 90, piso: 0.2967, espelho: 0.5 / 3, lances: [{ tipo: 'pre:meia-volta-9-9' }] });
  expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
  return s.modelo;
}

describe('E4e: prancha de detalhe das escadas', () => {
  const b = comEscada(), an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false });
  const { pranchas, avisos } = montarConjunto(b, an, dim, { tipos: 'escadas' });

  it('monta a prancha SCE com os cortes, o quadro de propriedades e os quadros de aço', () => {
    expect(avisos).toEqual([]);
    expect(pranchas.length).toBeGreaterThanOrEqual(1);
    const p = pranchas[0];
    expect(p.tipo).toBe('escadas');
    expect(SIGLAS.escadas).toBe('SCE');
    const textos = pranchas.flatMap((x) => x.papel.filter((q) => q.t === 'txt').map((q) => (q.t === 'txt' ? q.s : '')));
    expect(textos.some((s) => s.startsWith('PROPRIEDADES DOS LANCES'))).toBe(true);
    expect(textos.some((s) => s.startsWith('AÇO POR LANCE, POR ESCADA E TOTAL'))).toBe(true);
    expect(textos.some((s) => s.startsWith('TOTAL DAS ESCADAS DA OBRA'))).toBe(true);
    const nLances = dim.escadasArmadura!.length;
    expect(pranchas.reduce((s, x) => s + (x.elementos?.length ?? 0), 0)).toBe(nLances);
    // cada lance: um contorno fechado de concreto no corte longitudinal e outro no transversal
    const concreto = pranchas.flatMap((x) => x.papel.filter((q) => q.t === 'pl' && q.c === 'CONCRETO' && q.fechada));
    expect(concreto.length).toBe(2 * nLances);
  });

  it('a tabela de aço das folhas soma com o resumo de aço das escadas do dimensionamento', () => {
    const tabela = pranchas.reduce((s, x) => s + x.aco!.peso, 0), resumo = dim.resumoAcoEscadas!.reduce((s, x) => s + x.peso, 0);
    expect(resumo).toBeGreaterThan(10);
    expect(Math.abs(tabela / resumo - 1)).toBeLessThan(1e-9);
    const comPerdas = pranchas.reduce((s, x) => s + x.aco!.pesoComPerdas, 0), resumoP = dim.resumoAcoEscadas!.reduce((s, x) => s + x.pesoComPerdas, 0);
    expect(Math.abs(comPerdas / resumoP - 1)).toBeLessThan(1e-9);
    for (const r of dim.resumoAcoEscadas!) {
      const c = pranchas.flatMap((x) => x.aco!.resumo).filter((x) => x.aco === r.aco && x.phi === r.phi).reduce((s, x) => s + x.comprimento, 0);
      expect(Math.abs(c / r.comprimento - 1)).toBeLessThan(1e-9);
    }
  });

  it('entra no conjunto completo depois das lajes e só quando há escada armada', () => {
    expect(ORDEM_CONJUNTO.at(-1)).toBe('escadas');
    expect(ORDEM_CONJUNTO.indexOf('escadas')).toBe(ORDEM_CONJUNTO.indexOf('lajes') + 1);
    const todas = montarConjunto(b, an, dim, { tipos: 'todas' }).pranchas;
    expect(todas.at(-1)!.tipo).toBe('escadas');
    const s0 = edificioExemplo().modelo, an0 = analisarEdificio(s0), d0 = dimensionarEdificio(s0, an0, { fundacao: false });
    expect(montarConjunto(s0, an0, d0, { tipos: 'todas' }).pranchas.some((x) => x.tipo === 'escadas')).toBe(false);
  });

  it('sem dimensionamento, avisa; com grupo sem escada, não desenha nada', () => {
    expect(montarConjunto(b, null, null, { tipos: 'escadas' }).avisos[0]).toMatch(/escadas|calcule/i);
    expect(montarConjunto(b, an, dim, { tipos: 'escadas', grupo: 'g_1' }).pranchas).toHaveLength(0);
  });

  it('DXF: camadas de concreto e de armadura e o texto do corte', () => {
    const bytes = escreverDxf(pranchas[0]);
    const dx = lerDxf(Array.from(bytes, (c) => String.fromCharCode(c)).join(''));
    expect(dx.camadas.CONCRETO).toBeDefined();
    expect(dx.camadas.ARMADURA).toBeDefined();
    const todosTextos = Object.values(dx.camadas).flatMap((c) => c.textos.map((t) => t.t));
    expect(todosTextos.some((t) => t.startsWith('CORTE A-A'))).toBe(true);
    expect(todosTextos.some((t) => t.includes('N1'))).toBe(true);
  });
});
