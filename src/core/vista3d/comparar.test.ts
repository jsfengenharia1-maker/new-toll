// Comparação de deformadas (V6b): valores esperados da grade, hipóteses, escalas e contextos WebGL.
import { describe, expect, it } from 'vitest';
import { escalaAutomatica } from '../resultados/deformada';
import { ContadorContextos, avisoContextos, escalasDasJanelas, grade, hipotesesIniciais, razoesEmRelacao, referenciaDaRampa } from './comparar';

describe('grade', () => {
  it('2, 3 e 4 janelas', () => {
    expect(grade(2)).toEqual({ colunas: 2, linhas: 1 });
    expect(grade(3)).toEqual({ colunas: 3, linhas: 1 });
    expect(grade(4)).toEqual({ colunas: 2, linhas: 2 });
    expect(grade(9)).toEqual({ colunas: 2, linhas: 2 });
    expect(grade(0)).toEqual({ colunas: 2, linhas: 1 });
  });
});

describe('hipotesesIniciais', () => {
  const ids = ['caso:G', 'caso:Q', 'caso:W1', 'comb:C1'];
  it('começa pela atual e não repete', () => {
    expect(hipotesesIniciais(ids, 3, 'caso:Q')).toEqual(['caso:Q', 'caso:G', 'caso:W1']);
    expect(hipotesesIniciais(ids, 4)).toEqual(ids);
  });
  it('repete só quando faltam hipóteses', () => {
    expect(hipotesesIniciais(['a', 'b'], 4)).toEqual(['a', 'b', 'a', 'b']);
    expect(hipotesesIniciais(['a'], 2)).toEqual(['a', 'a']);
  });
  it('preserva escolhas anteriores válidas ao mudar o número de janelas', () => {
    expect(hipotesesIniciais(ids, 3, 'caso:G', ['caso:W1', 'caso:Q'])).toEqual(['caso:W1', 'caso:Q', 'caso:G']);
    expect(hipotesesIniciais(ids, 2, 'caso:G', ['inexistente', 'caso:Q'])).toEqual(['caso:G', 'caso:Q']);
  });
  it('sem hipóteses: vazias', () => { expect(hipotesesIniciais([], 2)).toEqual(['', '']); });
});

describe('escalas', () => {
  const dmax = [0.002, 0.01, 0.005], alt = 12;
  it('comum: o maior deslocamento mede 5 % da altura em todas', () => {
    const e = escalasDasJanelas(dmax, alt, 'comum');
    expect(e[0]).toBeCloseTo(60, 9); // 0,05 · 12 / 0,01
    expect(e).toEqual([e[0], e[0], e[0]]);
  });
  it('própria: cada janela com a sua; a de maior deslocamento tem a menor escala', () => {
    const e = escalasDasJanelas(dmax, alt, 'propria');
    expect(e[0]).toBeCloseTo(300, 9);
    expect(e[1]).toBeCloseTo(60, 9);
    expect(e[2]).toBeCloseTo(120, 9);
    expect(e[1]).toBe(escalaAutomatica(0.01, 12));
  });
  it('manual: valor de cada janela, 50 quando ausente', () => {
    expect(escalasDasJanelas(dmax, alt, 'manual', [10, 0, 200])).toEqual([10, 50, 200]);
  });
  it('sem deslocamento: escala 1', () => { expect(escalasDasJanelas([0, 0], alt, 'comum')).toEqual([1, 1]); });
  it('com escala comum, o deslocamento desenhado é proporcional ao real', () => {
    const e = escalasDasJanelas(dmax, alt, 'comum');
    const desenhado = dmax.map((d, i) => d * e[i]);
    [0.12, 0.6, 0.3].forEach((v, i) => expect(desenhado[i]).toBeCloseTo(v, 9));
  });
});

describe('rampa e razões', () => {
  it('rampa comum usa o máximo de todas', () => {
    expect(referenciaDaRampa([1, 4, 2], 'comum')).toEqual([4, 4, 4]);
    expect(referenciaDaRampa([1, 4, 2], 'propria')).toEqual([1, 4, 2]);
  });
  it('razões em relação à primeira', () => {
    expect(razoesEmRelacao([2, 4, 1])).toEqual([1, 2, 0.5]);
    expect(razoesEmRelacao([0, 4])).toEqual([0, 0]);
  });
});

describe('contextos WebGL', () => {
  it('adquire até o limite e libera', () => {
    const c = new ContadorContextos(3);
    expect([c.adquirir(), c.adquirir(), c.adquirir(), c.adquirir()]).toEqual([true, true, true, false]);
    expect(c.ativos).toBe(3);
    expect(c.livres).toBe(0);
    c.liberar();
    expect(c.livres).toBe(1);
    c.liberar(); c.liberar(); c.liberar();
    expect(c.ativos).toBe(0);
  });
  it('aviso só quando faltam contextos', () => {
    expect(avisoContextos(4, 4)).toBe('');
    expect(avisoContextos(4, 2, 8)).toContain('2 de 4 janelas');
    expect(avisoContextos(4, 2, 8)).toContain('8 contextos');
  });
});
