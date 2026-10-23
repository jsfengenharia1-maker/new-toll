# D4 — cartão 02: Navegador em árvore na doca esquerda do Edifício

Classe: Sonnet baixo (integra layout).

## Arquivos
- `src/app/edificio/Navegador.tsx` (novo)
- `src/app/edificio/Edificio.tsx` (pilha de paletas dentro da doca esquerda)
- `src/app/design/global.css` (`.dock-stack`)

## `src/app/edificio/Navegador.tsx` (este cartão: árvore, expandir/recolher, pavimentos e vistas; a seleção de elementos vem no cartão 03)
```tsx
// Navegador da obra (doca esquerda): árvore Obra > Pavimentos, Pilares, Vigas e Lajes por grupo, Eixos, Fundação e Vistas.
import { useMemo, useState, type ReactNode } from 'react';
import { Button, Palette, Tree, TreeItem } from '../ui';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { useEdifUI, type AbaEdificio } from './uiStore';
import { montarArvore, type NoArvore } from './arvore';

export function Navegador() {
  const b = useBuilding((s) => s.sessao.modelo);
  const arvore = useMemo(() => montarArvore(b), [b]);
  const selecao = usePlanta((s) => s.selecao);
  const pavAtual = usePlanta((s) => s.pavimento);
  const aba = useEdifUI((s) => s.aba);
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(['obra', 'pavs']));
  const alternar = (id: string) => setAbertos((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const selecionado = (n: NoArvore): boolean | undefined => {
    if (!n.alvo) return undefined;
    if (n.alvo.tipo === 'vista') return aba === n.alvo.id;
    if (n.alvo.tipo === 'pavimento') return pavAtual === n.alvo.id && selecao.size === 0;
    return selecao.has(n.alvo.id);
  };
  const selecionar = (n: NoArvore) => {
    const a = n.alvo;
    if (!a) return;
    const ui = useEdifUI.getState();
    if (a.tipo === 'vista') { ui.set({ aba: a.id as AbaEdificio }); return; }
    ui.set({ aba: 'planta' });
    if (a.tipo === 'pavimento') usePlanta.getState().set({ pavimento: a.id, selecao: new Set() });
  };
  const desenhar = (n: NoArvore): ReactNode => (
    <TreeItem key={n.id} level={n.nivel} label={n.rotulo} count={n.contagem} expanded={n.filhos ? abertos.has(n.id) : undefined}
      onToggle={() => alternar(n.id)} selected={selecionado(n)} onSelect={n.alvo ? () => selecionar(n) : undefined}>
      {n.filhos?.map(desenhar)}
    </TreeItem>
  );
  return (
    <Palette titulo="Navegador" aside={<Button variant="mini" title="Recolhe todos os ramos" onClick={() => setAbertos(new Set(['obra']))}>Recolher</Button>}>
      <Tree label="Navegador da obra">{desenhar(arvore)}</Tree>
    </Palette>
  );
}
```
(O botão `Recolher` do cabeçalho tem texto único na tela; se algum fluxo buscar `getByRole('button', { name: 'Recolher' })`, o `Recolher painel lateral esquerdo` da doca também casa por substring: nesse caso trocar o texto para `Recolher ramos`.)

## `Edificio.tsx`
Dentro da doca esquerda (cartão D2-03), trocar `<aside className="fund-in edif-in"> … </aside>` por uma pilha:
```tsx
      <Dock id="edificio-esq" lado="esq" rotulo="painel lateral esquerdo" padrao={400}>
        <div className="dock-stack">
          <Navegador />
          <Palette titulo="Dados da obra" grow>
            <aside className="fund-in edif-in">
              …(conteúdo atual, inalterado)…
            </aside>
          </Palette>
        </div>
      </Dock>
```
com `Palette` no import de `'../ui'` e `import { Navegador } from './Navegador';`. A largura fica em 400 px até a D5 (as tabelas ainda moram aqui).

## `global.css`
```css
.dock-stack { display: flex; flex-direction: column; min-height: 0; }
.dock-stack > .pal:first-child { flex: none; max-height: 42%; }
.dock-stack > .pal.grow { flex: 1; border-bottom: 0; }
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo. Medida esperada: a altura útil de `.edif-in` cai (a árvore ocupa até 42% da doca); os fluxos rolam dentro de `.edif-in`, que continua sendo o contêiner dos grupos. Nenhuma `treeitem` colide com `getByRole('button')`: a árvore usa `role=treeitem`.

## Rótulos
`role=tree` de nome `Navegador da obra`; paleta `Navegador`; itens com o nome do elemento (`P1`, `V3`, `Tipo 1`…) e a contagem. Fluxos que usam `getByText('P1')` etc. passam a achar também o item da árvore: conferir com `grep -n "getByText(" e2e/flows.mjs | head -50` e, onde houver ambiguidade, escopar por `.edif-in` ou pelo diálogo.
