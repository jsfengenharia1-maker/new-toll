# D6 — cartão 03: guarda do mapa no `design.test`, documentação e contagens

Classe: Haiku (teste validado + texto).

## Arquivos
- `src/app/design/mapaLayout.test.ts` (novo)
- `src/app/design/design.test.ts` (3 asserções novas)
- `docs/design-system.md`, `docs/mapa-codigo.md` (gerado), `CLAUDE.md` (contagem de testes)

## `src/app/design/mapaLayout.test.ts` (validado: 3 testes verdes)
```ts
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

  it('as 40 ferramentas da planta têm linha no mapa, com a tecla quando existe', () => {
    expect(rotulos.length).toBe(40);
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
```
O teste lê o mapa e o `Planta.tsx` como texto (sem importar React): reprova ferramenta nova (ou rótulo ou tecla mudados) sem linha `T<n>` no mapa e aba de vista fora da seção V.

## `src/app/design/design.test.ts`: acrescentar ao fim do `describe`
```ts
  it('layout BIMCraft: token da faixa e classes dos componentes novos definidos', () => {
    const g = semComentarios(GLOBAL);
    expect(g).toMatch(/--h-ribbon:\s*56px/);
    for (const c of ['ribbon-wrap', 'rtabs', 'rtab', 'ribbon', 'rgrp', 'rbtn', 'rl', 'dock', 'dock-grip', 'dock-toggle', 'pal', 'phead', 'pbody', 'tree', 'tn', 'vtabs', 'modtabs', 'work', 'typecard', 'cfg'])
      expect(g, `.${c}`).toMatch(new RegExp(`\\.${c}[\\s,.{:\\[]`));
  });

  it('faixa de comandos: nenhum botão da ui/Ribbon sem rótulo textual', () => {
    const r = codigo['/src/app/ui/Ribbon.tsx'];
    expect(r).toContain('<span className="rbl">{label}</span>');
  });

  it('docas: largura sempre em px (porcentagem numa coluna auto do grid zera o desenho)', () => {
    const d = codigo['/src/app/ui/Dock.tsx'];
    expect(d).toMatch(/const largura = `\$\{w\}px`/);
    expect(d).not.toMatch(/min\(\$\{w\}px, 100%\)/);
  });
```
(As barras invertidas já vêm duplicadas para o arquivo `.ts`; copie como está.)

## `docs/design-system.md`
Acrescentar a seção "Layout" com a tabela de componentes novos da `ui` e a regra de nomes:

| Componente | Uso | Classes |
|---|---|---|
| `Ribbon`, `RibbonTab`, `RibbonGroup`, `RibbonButton`, `RibbonHint` | faixa de comandos (abas por tarefa, grupos rotulados) | `ribbon-wrap`, `rtabs`, `rtab`, `ribbon`, `rgrp`, `rbtns`, `rl`, `rbtn`, `rbl`, `rhint` |
| `Dock`, `Palette` | docas laterais redimensionáveis e paletas | `dock`, `dock-in`, `dock-grip`, `dock-toggle`, `pal`, `phead`, `pbody`, `dock-stack` |
| `Tree`, `TreeItem` | Navegador da obra | `tree`, `tn`, `tl`, `chev`, `cnt`, `l1` a `l5` |
| `ViewTabs`, `StatusBar` | abas de vista acima do desenho; barra de status | `vtabs`, `statusbar`, `msg` |
| `TypeCard` | cartão do tipo da paleta Propriedades | `typecard`, `ico`, `psel` |
| (tela) | casca do módulo | `work`, `modtabs`, `qbar`, `optbar`, `cfg`, `cfg-ind`, `cfg-item`, `cfg-corpo` |

Regras: (1) um botão de comando só existe num lugar; atalhos de vista na faixa levam rótulo diferente; (2) formulários com campos não ficam na faixa (abrem janela ou seção da Configuração da obra); (3) larguras de doca em px, guardadas em `localStorage` (`statikos:layout`); (4) abas da faixa têm `role=tab` em `tablist` de `aria-label="Faixa de comandos"`; os testes de interface escopam por ele.

## `CLAUDE.md`
Atualizar a contagem de testes do comando `npm test` (soma dos testes novos: `layout.test.ts` 3, `icone.test.ts` 2, `arvore.test.ts` 4, `mapaLayout.test.ts` 3 e as 3 asserções acima = 15 testes novos; conferir o total com `npm test`) e, em "Arquitetura › `src/app/`", acrescentar uma linha: `layout.ts` (estado do layout), `FaixaModulo.tsx`/`FaixaArquivo.tsx`/`FaixaPortico.tsx`/`FaixaFundacoes.tsx` e `edificio/FaixaEdificio.tsx` (faixa de comandos), `edificio/Navegador.tsx`/`Propriedades.tsx`/`Configuracao.tsx` (docas e configuração).

## `docs/historico-fatias.md`
Uma linha por fatia D1 a D6 (o que entregou, quantos fluxos de e2e ajustou). `docs/checklist-manual-cypecad.md`: sem linha tocada (nenhum comando mudou); registrar no histórico de conferência "layout: nenhuma função alterada".

## Verificação
`npx tsc -b`; `npm test` completo; `npm run build`; `npm run e2e -- --workers 4` completo; `npm run mapa` (e commit do `docs/mapa-codigo.md`).
