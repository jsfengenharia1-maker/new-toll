import { describe, expect, it } from 'vitest';
import { autoDims, dimSegments, levelText } from './dims';
import { samplePortico, sampleTrelica, sampleViga } from './samples';

const lens = (c: { stops: { v: number }[] }) => dimSegments(c as never).map((s) => +s.len.toFixed(6));

describe('cotas automáticas', () => {
  it('pórtico: vãos entre pilares/apoios, balanço e níveis', () => {
    const d = autoDims(samplePortico(), 1, 0.5);
    const span = d.find((c) => c.kind === 'span')!;
    expect(span.dir).toBe('h');
    expect(span.at).toBeCloseTo(-1, 12);
    expect(lens(span)).toEqual([8, 2]);
    // a extremidade do balanço (x = 10) parte do nó em y = 5
    expect(span.stops[2].from).toBeCloseTo(5, 12);
    const total = d.find((c) => c.kind === 'total')!;
    expect(total.at).toBeCloseTo(-1.5, 12);
    expect(lens(total)).toEqual([10]);
    const lvl = d.find((c) => c.kind === 'level')!;
    expect(lvl.dir).toBe('v');
    expect(lvl.at).toBeCloseTo(-1, 12);
    expect(lens(lvl)).toEqual([5, 1.2]);
    expect(lvl.stops.map((s) => s.from)).toEqual([0, 0, 4]);
    expect(lens(d.find((c) => c.kind === 'height')!)).toEqual([6.2]);
  });
  it('viga contínua: vãos pelos apoios, sem cota de nível', () => {
    const d = autoDims(sampleViga(), 2);
    expect(lens(d.find((c) => c.kind === 'span')!)).toEqual([10, 12, 10]);
    expect(lens(d.find((c) => c.kind === 'total')!)).toEqual([32]);
    expect(d.some((c) => c.dir === 'v')).toBe(false);
  });
  it('treliça: montantes contam como pilares; níveis distintos', () => {
    const d = autoDims(sampleTrelica(), 1);
    expect(lens(d.find((c) => c.kind === 'span')!)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(lens(d.find((c) => c.kind === 'level')!)).toEqual([1, 1, 1]);
  });
  it('texto de nível', () => {
    expect(levelText(5)).toBe('+5,00');
    expect(levelText(-1.2)).toBe('−1,20');
    expect(levelText(0.001)).toBe('±0,00');
  });
});
