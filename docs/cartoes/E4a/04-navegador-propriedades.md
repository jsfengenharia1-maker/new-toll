# E4a — cartão 4: escadas no Navegador e nas Propriedades (layout novo)

Classe: Haiku/Sonnet baixo. **Aplicar depois da D6** (depende do Navegador em árvore da D4 e do painel de Propriedades da D5; não compila antes disso). Depende dos cartões 1 a 3.

## O que fazer
1. **Navegador (D4)**: em `src/app/edificio/arvore.ts`, `TipoNo` ganha `'escada'`; `montarArvore` ganha, depois de "Lajes", o nó `{ id: 'escadas', rotulo: 'Escadas', nivel: 2, contagem: (b.escadas ?? []).length, filhos: (b.escadas ?? []).map((e) => folha('escada', 3, e, 'escada')) }` (a função `folha` já existe). Em `arvore.test.ts`, um caso com uma escada (comando `escada.criar` sobre o edifício padrão): o nó "Escadas" tem contagem 1 e o filho tem `alvo { tipo: 'escada', id }`. Clicar no filho no `Navegador.tsx` abre a janela: `useEscadaUI.getState().abrir(id)` (a seleção de pilar/viga/laje continua como está).
2. **Propriedades (D5)**: com a escada selecionada (a seleção da árvore guarda o id), o `CartaoTipo`/`TypeCard` mostra o ícone `escada`, o nome da escada, o tipo "Escada" e a contagem de lances; grupos recolhíveis (`Group`) "Geometria" (largura, piso, espelho, giro, último degrau — os mesmos `NumField`/`Select` do componente `DadosComuns` do cartão 2, extraído para um arquivo comum se necessário) e "Cargas" (execução, corrimão, revestimento, sobrecarga, acesso); botão "Editar tipo" abre a aba "Tipos de lance" da janela. Todo campo chama `escada.dados`.
3. **Revisão**: `Revisao.tsx` já lista o tipo `escada` (sem janela de resultados até a E4c); clicar no item abre a janela das escadas (`useEscadaUI.getState().abrir(i.id)`).

## Regras
Mesmas dos cartões 1 a 3. e2e: acrescentar ao fluxo `E4a` a seleção da escada pelo Navegador (`getByRole('treeitem', { name: 'E1', exact: true })`, conforme a D4) e a edição do espelho pelas Propriedades; atualizar `docs/mapa-codigo.md` com `npm run mapa`.
