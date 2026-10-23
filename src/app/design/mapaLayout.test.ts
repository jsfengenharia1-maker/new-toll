// Guarda do mapa de migração do layout (docs/analises/layout-bimcraft-mapa.md): toda ferramenta da planta, com seu rótulo e sua tecla, tem linha no mapa,
// e toda aba de vista do Edifício aparece na seção de vistas. Evita ferramenta nova sem destino na faixa.
import { describe, expect, it } from 'vitest';

const mapa = (import.meta.glob('/docs/analises/layout-bimcraft-mapa.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)['/docs/analises/layout-bimcraft-mapa.md'];
const planta = (import.meta.glob('/src/app/edificio/Planta.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)['/src/app/edificio/Planta.tsx'];

const rotulos = (() => {
  const bloco = /export const ROTULO_FERRAMENTA[^=]*=\s*\{([\s\S]*?)\n\};/.exec(planta)![1];
  return [...bloco.matchAll(/(\w+): '([^']+)'/g)].map((m) => ({ id: m[1], rotulo: m[2] }));
})();
const teclas = (() => {
  const bloco = /export const TECLA_FERRAMENTA[^=]*=\s*\{([^}]*)\}/.exec(planta)![1];
  return Object.fromEntries([...bloco.matchAll(/(\w+): '(\w)'/g)].map((m) => [m[1], m[2]]));
})();

describe('mapa de migração do layout', () => {
  it('existe e tem a contagem do cabeçalho', () => {
    expect(mapa).toBeTruthy();
    expect(mapa).toContain('**224 itens**');
  });

  it('as 41 ferramentas da planta têm linha no mapa, com a tecla quando existe', () => {
    expect(rotulos.length).toBe(41);
    for (const { id, rotulo } of rotulos) {
      const linha = mapa.split('\n').find((l) => /^\| T\d+ \|/.test(l) && l.includes(`| ${rotulo} |`));
      expect(linha, `ferramenta ${id} (${rotulo}) sem linha T no mapa`).toBeTruthy();
      if (teclas[id]) expect(linha, `tecla de ${id}`).toContain(`| ${teclas[id]}`);
    }
  });

  it('as 10 abas de vista do Edifício estão na seção de vistas do mapa', () => {
    for (const a of ['Planta', '3D', 'Elevação', 'Verificação', 'Análise', 'Deslocamentos', 'Isovalores', 'Dimensionamento', 'Pranchas', 'Premissas']) {
      expect(mapa, a).toMatch(new RegExp(`\\| V\\d+ \\| VT ${a}`));
    }
  });
});
