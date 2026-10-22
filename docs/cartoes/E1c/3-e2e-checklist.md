# Cartão E1c-3 — fluxo e2e `E1c` e linhas do checklist

Executor: Haiku. Depende dos cartões E1c-1 e E1c-2. Não altere `src/core/`.

## Arquivo
`e2e/flows.mjs`: novo fluxo logo depois do `E1b` (procure `name: 'E1b:`), copiando a estrutura dele (`newPage`, `cmd`, `livre`, `reenquadrarAte`, `telaDe`).

## Fluxo (nome exato)
`name: 'E1c: paredes de concreto (traçar na planta, abertura, empuxo de terra, fora do diafragma, janela com empuxo)'`

Passos e asserções:
1. Aba **Edifício**. Pela linha de comando (`#edcmd`):
   - `obra.definir {"profundidadeFundacao": 1}`
   - `empuxo.tipo {"nome": "Aterro", "metodo": "repouso", "estratos": [{"espessura": 20, "gama": 18, "phi": 30}], "cotaAterro": 3}`
   - o caso H precisa do id do tipo de empuxo; leia-o do modelo salvo automaticamente: `const idEmp = await page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building.empuxos[0].id);` e então `cmd('caso.criar {"nome": "Empuxo", "natureza": "H", "empuxo": "' + idEmp + '"}')` (espere a mensagem do comando como no fluxo `N2a`, linhas ~2513–2530, antes de ler o localStorage).
   - laje do grupo Tipo entre as paredes: `laje.criar {"grupo": "g_3", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}`.
2. Grupo **Paredes**: `NumField` "Espessura" = `20`; `Select` "Morre em" = `Tipo 3` (a laje do grupo Tipo aparece no Tipo 1, 2 e 3; as paredes precisam chegar ao Tipo 3 para apoiá-la nos três); clique **Traçar na planta**; `reenquadrarAte(page, [[0, 0], [12, 0], [12, 6], [0, 6]])`; clique em `telaDe(page, 0, 0)` e `telaDe(page, 12, 0)`; tecla `Enter`. Repita para `(0, 6)` → `(12, 6)`. Asserção: `table[data-pw-lista] tbody tr` tem 2 linhas, com `M1` e `M2`.
3. Selecione M1 (botão `aria-label="Selecionar M1"`), em **Aberturas**: `Seg` janela, "s" = `400`, "Largura" = `200`, "Peitoril" = `50`, "Altura" = `200`, "Pavimento da abertura" = `Térreo`, clique **Acrescentar abertura**. Asserção: `table[data-pw-aberturas] tbody tr` = 1 linha.
4. Em **Empuxo** de M1: "Caso do empuxo" = `Empuxo`, lado **terreno à direita**, **Aplicar empuxo**. Selecione M2 e aplique com **terreno à esquerda**. Asserção: coluna Empuxo das duas linhas = `sim`.
5. Aba **Verificação**: o texto contém `PAREDE_FORA_DIAFRAGMA` e `Térreo`; não contém `PAREDE_SOBREPOSTA` nem `PAREDE_ABERTURA`.
6. Aba **Dimensionamento** → **Calcular e dimensionar** (espera **Recalcular**, depois `livre()`). Asserção: `[data-pw-cartao]` contém `M1` e `M2`.
7. Clique `Resultados de M1`; espere o diálogo cujo nome casa `/M1/`; leia `table[data-pw-empuxo]`. Valor esperado da linha `Empuxo`: Fy = 9 · 4² / 2 · 12 − 2 · 2 · 9 · 1,5 = **810** kN (terreno em y < 0 empurra M1 para +y) e Fx = 0. Asserção: `assert.match(texto, /810/)`. Feche com **Fechar**.

## Checklist (depois do e2e verde)
- `docs/checklist-manual-cypecad.md`: C5.10, C5.21, C5.22 e C5.23 passam de Parcial a **Feito** (frente `—`), nota: troque "falta a interface (cartões E1c) [E1c-UI]" por "interface: grupo Paredes (`ParedesUI.tsx`), ferramenta Parede de concreto (Ctrl+K), janela e cartão; e2e `E1c` [E1c]". C5.2 e C5.9 continuam Parcial (FU7b; E1e), só tire "E1c-UI" da nota.
- Acrescente no fim do "Histórico de conferência" do mesmo arquivo: `- **<data> — fatia E1c, interface.** C5.10, C5.21, C5.22 e C5.23 passam a Feito (…).` com as duas sublinhas "Situação: ver o resumo (recontado por `npm run checklists`)." e "Pendências por frente: E reduz em 4 itens (manual do usuário)."
- Rode `npm run checklists`.

## Verificação
```bash
npx tsc -b
npx vitest run src/core/checklists.test.ts src/app/edificio/ParedesUI.test.ts src/app/design/design.test.ts
npm run e2e -- E1c
npm run e2e -- --no-build FU   # os fluxos de fundação não podem quebrar
```
