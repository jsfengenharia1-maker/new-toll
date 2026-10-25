import { describe, it } from 'vitest';
import { analyze } from '../solver';
import { samplePortico, sampleViga } from '../../app/samples';
import { memoriaPortico } from './portico';
import { htmlMemoriaCorpo } from './html';

describe('smoke', () => {
  it('x', () => {
    for (const m of [samplePortico(), sampleViga()]) {
      const r = memoriaPortico(m, analyze(m));
      const por = new Map<string, number>();
      for (const p of r.memoria.passos) por.set(p.elemento, (por.get(p.elemento) ?? 0) + 1);
      console.log(m.name, r.memoria.passos.length, Math.round(r.memoria.ms), [...por].map(([k, v]) => `${k}:${v}`).join(' | '));
      console.log(htmlMemoriaCorpo(r.memoria).length);
    }
  });
});
