# Cartões da E3c — nervuradas bidirecionais (interface, layout novo)

Executor: Haiku. Ordem obrigatória: 1 → 2 → 3 → 4. Cada cartão compila sozinho depois dos anteriores (`npx tsc -b`). O núcleo (`nervuradas.ts`, `nervuradasDim.ts`, comandos `forma.tipo`, `laje.nervurada`, `laje.copiarPanos`, `laje.armaduraBase`, `tipoLaje.importar`) está pronto e testado; estes cartões são só a interface. Revisão de 24/10/2026: reescritos para o layout novo.

**Aplicar depois da D7** (os cartões 2 e 3 tocam `Edificio.tsx`, onde ficam a doca Propriedades e a Configuração; o 1 toca o conteúdo da seção "Tipos de laje" da Configuração). As âncoras são trechos curtos de texto; se uma não casar, procure o trecho equivalente (mesmo rótulo) e não invente código.

## Onde cada coisa fica no layout novo
| Peça | Lugar |
|---|---|
| Editor de formas (cubetas) | Configuração da obra > seção **Tipos de laje** (grupo "Tipos de laje", abaixo dos enchimentos) |
| Tipo "Nervurada bidirecional" (forma, altura total, mesa) e coluna "Dir. (°)" | doca **Propriedades**, grupo "Lajes" |
| Grupo "Nervuradas bidirecionais" (camada na planta, ponto de passagem, zonas maciças, cópia entre panos, base, janela "Nervuras da laje") | doca **Propriedades**, logo abaixo do grupo "Lajes" |
| Camada "Nervuras e cubetas" e setas das nervuras | desenho da **Planta** (`camadaNervuras`, ligada pela caixa do grupo acima) |
| Seção de memorial e linha no resumo de aço | Memorial da obra e vista Dimensionamento (`Detalhamento.tsx`) |

## Como aplicar os blocos
- **Arquivo novo** `caminho`: crie o arquivo com o conteúdo do bloco, sem alterar.
- **Trocar em** `caminho`: o primeiro bloco aparece exatamente uma vez no arquivo; substitua-o pelo segundo bloco (depois da linha `por`).
- **Acrescentar ao fim de** `caminho`: cole o bloco no fim do arquivo.

## Regras desta frente (valem para todos os cartões)
- Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Rótulos únicos na tela. Sem CSS novo, sem cor literal, sem botão acima do canvas/barra da planta.
- Nos e2e, `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select`: regex ancorada (`/^Forma da nervurada/`). Grupos da Configuração: `grupoEdif(page, 'Tipos de laje')`; grupos da Propriedades: `grupoEdif(page, /^Lajes/)` (helpers de `e2e/flows/helpers.mjs`).
- Não altere `src/core/`. Nada de cálculo novo: só chamadas ao núcleo.
- **Não edite os checklists**: a frente fecha quando os quatro cartões estiverem executados e o e2e `E3c` verde; o orquestrador atualiza as linhas (C7.9, C7.42 a C7.46; K1.9.90, K1.9.91, K1.9.93, K1.9.101, K1.13.3.1-4, K1.13.4-2) e o histórico.

## Verificação final (depois do cartão 4)
```bash
npx tsc -b
npx vitest run src/app/design src/core/building
npm run e2e -- --workers 1 E3c
```
