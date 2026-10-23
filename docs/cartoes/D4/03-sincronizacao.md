# D4 — cartão 03: seleção sincronizada entre a árvore e a planta

Classe: Sonnet baixo.

## Arquivos
- `src/app/edificio/Navegador.tsx`

## Regras
- Clicar num pilar, viga, laje, eixo ou elemento de fundação da árvore: vai para a vista Planta, seleciona o elemento e centraliza (o mesmo que a lista de erros e a paleta Ctrl+K fazem: `irParaElemento` de `Revisao.tsx`, que escolhe o pavimento certo e escreve `foco`).
- Selecionar na planta (clique, janela, paleta): o primeiro elemento selecionado fica marcado na árvore e seus ancestrais se expandem (a árvore rola até ele).
- Selecionar vários na planta: todos aparecem marcados (`selected`), só o primeiro é revelado.
- Nada disto altera a seleção da planta além do que o clique do usuário já faria.

## Mudanças em `Navegador.tsx`
1. Imports: `import { useEffect } from 'react'` (junto de `useMemo, useState`), `import { irParaElemento } from './Revisao'; import { caminhoAte, idDoNo, montarArvore, type NoArvore } from './arvore'; import { lancesDoPilar, pavimentosOrdenados } from '../../core/building/types';`.
2. Efeito que revela o elemento selecionado (depois de `alternar`):
```tsx
  const primeiro = [...selecao][0];
  useEffect(() => {
    if (!primeiro) return;
    for (const tipo of ['pilar', 'viga', 'laje', 'eixo', 'fundacao'] as const) {
      const c = caminhoAte(arvore, idDoNo(tipo, primeiro));
      if (c.length) {
        setAbertos((a) => new Set([...a, ...c.slice(0, -1)]));
        requestAnimationFrame(() => document.querySelector('[role="tree"] [role="treeitem"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
        return;
      }
    }
  }, [primeiro, arvore]);
```
3. `selecionar` ganha os elementos (substitui o corpo do cartão 02, mantendo vista e pavimento):
```tsx
  const selecionar = (n: NoArvore) => {
    const a = n.alvo;
    if (!a) return;
    const ui = useEdifUI.getState();
    if (a.tipo === 'vista') { ui.set({ aba: a.id as AbaEdificio }); return; }
    ui.set({ aba: 'planta' });
    const P = usePlanta.getState();
    if (a.tipo === 'pavimento') { P.set({ pavimento: a.id, selecao: new Set() }); return; }
    if (a.tipo === 'eixo') { P.set({ selecao: new Set([a.id]), foco: { id: a.id, n: Date.now() } }); return; }
    const ps = pavimentosOrdenados(b);
    if (a.tipo === 'pilar') {
      const p = b.pilares.find((x) => x.id === a.id);
      irParaElemento(b, 'pilar', a.id, p ? lancesDoPilar(b, p).at(-1)?.nome : undefined);
    } else if (a.tipo === 'laje') {
      const l = b.lajes.find((x) => x.id === a.id);
      irParaElemento(b, 'laje', a.id, ps.find((p) => p.grupo === l?.grupo)?.nome);
    } else irParaElemento(b, a.tipo, a.id); // viga e fundação
  };
```
4. `selecionado` já compara `selecao.has(n.alvo.id)` para elementos (cartão 02).

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo.
Manual (anotar no relatório do cartão): (1) clicar `P1` na árvore seleciona e centraliza o pilar na planta; (2) clicar um pilar na planta marca `P1` na árvore e expande Pilares; (3) clicar uma viga de outro grupo muda o pavimento da planta; (4) clicar `Planta`/`3D` em Vistas troca a vista do centro; (5) com a doca recolhida a árvore não perde o estado (o conteúdo fica montado).

## Teste novo de e2e (fluxo `D4`, faz parte do cartão D6-02)
Fluxo curto: obra de exemplo com 2 pilares e 1 viga → `getByRole('treeitem', { name: /^P1/ }).click()` → `assert` que `.planta-st` ou o painel de status mostra a seleção e que o item fica com `aria-selected="true"`; clicar na planta (`telaDe`) num segundo pilar e conferir `getByRole('treeitem', { name: /^P2/ })` com `aria-selected="true"`.
