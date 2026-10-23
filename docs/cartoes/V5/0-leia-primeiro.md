# Cartões da V5 — esforços por hipótese, estado da seção, vigotas e saídas (interface)

Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4 → 5. Cada cartão compila sozinho depois dos anteriores (`npx tsc -b`).
O núcleo da V5 está pronto e testado; estes cartões são só a interface. Nenhum arquivo aparece em dois cartões.

| Cartão | O que entrega | Arquivos |
|---|---|---|
| 1 | Tokens e classes das cargas por caso, dos diagramas, da seção e das vigotas | `global.css` |
| 2 | Estado das janelas de esforços | `esforcosStore.ts` (novo) |
| 3 | Aba "Esforços": diagramas por hipótese, estado da seção e vistas das vigotas | `AbaEsforcos.tsx` (novo), `Edificio.tsx` |
| 4 | Estilo de desenho, símbolos dos pilares, detalhes e moldura DXF em Pranchas | `EstiloPranchas.tsx` (novo), `Pranchas.tsx` |
| 5 | Fluxo e2e `V5` | `e2e/flows.mjs` |

Pendente fora destes cartões (outra fatia): cargas coloridas por caso e vento por pavimento na planta (canvas de `Planta.tsx`: usar `classeDoCaso`/`legendaDeCargas` e `ventoPorPavimento`/`setasDeVento`, lendo a cor computada de `--carga-caso-*`); camada de vigotas da planta com a chave de esforços (hoje a vista está na aba Esforços); seletor Envoltória/Combinação/Caso nas janelas de elemento de `Revisao.tsx`; tabela de vento por pavimento e esforços por caso no memorial; formato do usuário e margens da moldura; figura de isolinhas na prancha (folha "Resultados", V4).

## Núcleo usado (já existe)
- `src/core/resultados/esforcosCaso.ts`: `hipotesesDeEsforco`, `diagramaBarras`, `diagramaViga`, `diagramaPilar`, `diagramaInclinada`, `desenharDiagrama`, `escalaAutomatica`, `estacoesDaBarra`.
- `src/core/resultados/estadoSecao.ts` e `estadoElementos.ts`: `estadoDaSecao`, `secaoRetangularArmada`, `barrasDaViga`, `barrasDoArranjo`, `curvaConcreto`, `estadoDaViga`, `estadoDoPilar`.
- `src/core/resultados/vigotasVista.ts`: `diagramaVigotas`, `textoVigota`, `rotulosDeVigotas`, `dadosDasVigotas`, `vistaDisponivel`.
- `src/core/resultados/cargasCaso.ts`: `classeDoCaso`, `legendaDeCargas`, `cargasPorGrupoECaso`, `ventoPorPavimento`, `tabelaVento`, `setasDeVento`.
- `src/core/sheets/estilo.ts`, `simbolos.ts`, `saidas.ts`, `folhasV5.ts`: estilo de desenho, símbolos, detalhes e moldura DXF, folhas de cargas e de perspectiva; `prancha.definir` ampliado.

## Verificação final (depois do cartão 5)
```bash
npx tsc -b
npx vitest run src/app/design src/core/resultados src/core/sheets
npm run e2e -- V5
npm run e2e -- V
```
