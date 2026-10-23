import { describe, expect, it } from 'vitest';
// @ts-ignore módulo .mjs sem tipos
import { gerarMapa } from '../../scripts/mapa-codigo.mjs';

const docs = import.meta.glob('/docs/mapa-codigo.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('mapa do código', () => {
  it('docs/mapa-codigo.md está atualizado', () => {
    const atual = docs['/docs/mapa-codigo.md'];
    expect(gerarMapa() === atual, 'docs/mapa-codigo.md desatualizado: rode npm run mapa').toBe(true);
  });
});
