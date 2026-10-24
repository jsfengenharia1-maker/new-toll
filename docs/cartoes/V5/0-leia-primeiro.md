# Cartões da V5 — esforços por hipótese, estado da seção, vigotas e saídas (interface, layout novo)

Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4 → 5. Cada cartão compila sozinho depois dos anteriores (`npx tsc -b`). O núcleo da V5 está pronto e testado; estes cartões são só a interface. Revisão de 24/10/2026: reescritos para o layout novo (faixa de comandos por módulo, Navegador em árvore, Propriedades, Configuração da obra, abas de vista `.edif-tabs`).

**Aplicar depois da D7** (os cartões 3 e 4 tocam `FaixaEdificio.tsx`; o 3 toca também `arvore.ts`, dados do Navegador). As âncoras são trechos curtos de texto; se uma não casar, procure o trecho equivalente (mesmo rótulo) e não invente código.

| Cartão | O que entrega | Arquivos |
|---|---|---|
| 1 | Tokens e classes das cargas por caso, dos diagramas, da seção e das vigotas | `global.css` |
| 2 | Estado das janelas de esforços | `esforcosStore.ts` (novo) |
| 3 | Vista "Esforços": aba de vista, nó "Esforços" em Vistas do Navegador, botão "Ver Esforços" na faixa Análise | `AbaEsforcos.tsx` (novo), `Edificio.tsx`, `uiStore.ts`, `arvore.ts`, `arvore.test.ts`, `FaixaEdificio.tsx` |
| 4 | Estilo de desenho, símbolos dos pilares, detalhes e moldura DXF na vista Pranchas + botão na faixa Pranchas | `EstiloPranchas.tsx` (novo), `Pranchas.tsx`, `FaixaEdificio.tsx` |
| 5 | Fluxo e2e `V5` | `e2e/flows/V.mjs`, `e2e/flows/index.mjs` |

## Como aplicar os blocos
- **Arquivo novo** `caminho`: crie o arquivo com o conteúdo do bloco, sem alterar.
- **Trocar em** `caminho`: o primeiro bloco aparece exatamente uma vez no arquivo; substitua-o pelo segundo bloco (depois da linha `por`).
- **Acrescentar ao fim de** `caminho`: cole o bloco no fim do arquivo.

## Regras desta frente (valem para todos os cartões)
- Só `src/app/ui` para controles (`Button`, `Check`, `Select`, `NumField`, `TextField`, `Group`, `Hint`, `RibbonButton`); `<button>`, `<select>`, `<input>` crus reprovam em `design.test.ts` (o `<input type="file" hidden>` do cartão 4 é o padrão já usado em `FaixaEdificio.tsx`/`Pranchas.tsx`).
- Nenhuma cor literal em TS/TSX, nenhum CSS fora de `src/app/design`, toda classe usada existe em `global.css`. Estilo inline só para valores calculados.
- Rótulos únicos: cada controle da vista leva o número da janela no nome, por exemplo `Hipótese (janela 1)`. Nos e2e, `getByLabel`/`getByRole` com `{ exact: true }`, **exceto** `NumField`, `OptNumField`, `TextField`, `Select` e `Slider`: regex ancorada no início, por exemplo `getByLabel(/^Hipótese \(janela 1\)/)`.
- Não altere `src/core/`. Nada de cálculo novo: só chamadas às funções do núcleo.
- Comandos da faixa: o botão "Ver Esforços" fica no grupo "Resultados" da aba Análise; não crie botões acima do canvas/barra da planta.

## Núcleo usado (já existe)
`src/core/resultados/esforcosCaso.ts`, `estadoSecao.ts`, `estadoElementos.ts`, `vigotasVista.ts`, `cargasCaso.ts`; `src/core/sheets/estilo.ts`, `simbolos.ts`, `saidas.ts`, `folhasV5.ts`; `prancha.definir` ampliado.

Pendente fora destes cartões (outra fatia): cargas coloridas por caso e vento por pavimento na planta (`Planta.tsx`: `classeDoCaso`/`legendaDeCargas`, `ventoPorPavimento`/`setasDeVento`, cor lida de `--carga-caso-*`); camada de vigotas da planta com a chave de esforços; seletor Envoltória/Combinação/Caso nas janelas de `Revisao.tsx`; tabela de vento e esforços por caso no memorial; formato do usuário e margens da moldura; figura de isolinhas na prancha.

## Verificação final (depois do cartão 5)
```bash
npx tsc -b
npx vitest run src/app/design src/app/edificio/arvore.test.ts src/core/resultados src/core/sheets
npm run e2e -- --workers 1 V5
```
