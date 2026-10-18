import { it, expect } from 'vitest';
import { analyze } from './solver';
import { runDesign } from './design';
import { SAMPLES } from '../app/samples';

it('todos os exemplos são estáveis e dimensionáveis', () => {
  for (const s of SAMPLES) {
    const m = s.make();
    const a = analyze(m);
    expect(a.prep.error, s.key).toBeUndefined();
    const rep = runDesign(m, a);
    expect(rep.members.length).toBe(m.members.length);
    console.log(s.key, rep.ok, rep.members.map((x) => `${x.id}:${x.status}:${(x.util * 100).toFixed(0)}% ${x.summary}`).join(' | '));
  }
});
