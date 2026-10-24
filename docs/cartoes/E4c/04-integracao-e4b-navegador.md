# E4c — cartão 4: ligação com a ferramenta Escada (E4b), Navegador e Propriedades

Classe: Haiku. **Só aplicar depois** dos cartões da E4a (01 a 04), da E4b (01 a 06), da D7 e dos cartões 01 a 03 da E4c. **Não foi validado** (aplicar e reverter) porque `EscadaMenu.tsx`, `EscadaUI.tsx` e as entradas de escada no Navegador e nas Propriedades ainda não existiam no `main` de 24/10/2026: o agente que aplicar confere os pontos de inserção abaixo, que são descritos por texto a procurar, e valida com `npx tsc -b`, `design.test.ts` e o e2e `E4c` + `E4b`. Falhou duas vezes: parar e relatar.

## Pontos de inserção
1. `src/app/edificio/EscadaMenu.tsx` (E4b, cartão 1): os botões desabilitados "Ver esforços e deslocamentos" (dica "Disponível na frente E4c") e o menu ganham dois botões habilitados que abrem a janela do cartão 01:
   - "Ver esforços e deslocamentos": `onClick={() => useEscadaCalculoUI.getState().abrir()}` e sem `disabled`/`title` de indisponível (o botão "Ver detalhe de armadura" continua desabilitado com "Disponível na frente E4d");
   - novo `Button variant="mini"` "Calcular escada" com o mesmo `onClick` (C8.53: cálculo individual antes do da obra).
   `import { useEscadaCalculoUI } from './EscadaCalculoUI';` no topo.
2. Navegador (`src/app/edificio/Navegador.tsx`): onde o cartão 04 da E4a (`04-navegador-propriedades.md`) lista a escada como nó filho de "Escadas" (procurar o texto/ícone `escada`), acrescentar ao rótulo do nó um `Pill` "recalcular" quando `useAvisoRecalcular()` (de `EscadaCalculoUI.tsx`) devolver texto, e o clique duplo do nó continua abrindo a janela da escada.
3. Propriedades (`src/app/edificio/Propriedades.tsx`): na seção da escada selecionada (procurar o título "Escada" criado pelo cartão 04 da E4a), uma linha `KV` com "Reações (G / Q)" lida de `useBuilding().analise?.escadas?.lances` para o lance da escada (soma por apoio, em kN), "—" sem análise, e o botão "Calcular escada…" que abre a janela do cartão 01.
4. Guia de etapas (`src/core/building/etapas.ts` / `EtapasObra.tsx`): nada a fazer; a etapa "Escadas" já fica "feito" com ao menos uma escada.

## Fechamento
Se tudo passar: C8.5 deixa de depender da E4c (o menu passa a ter os dois resultados; o "detalhe de armadura" continua da E4d): atualizar a nota de C8.5 (`npm run checklist -- set C8.5 --acrescentar "[E4c] ver esforços e deslocamentos abre `EscadaCalculoUI`"`) e conferir se a situação já pode ir a Feito pelo critério do cartão 06 da E4b.
