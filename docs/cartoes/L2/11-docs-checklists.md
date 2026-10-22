# Cartão L2-11 — Docs e checklists

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 01 a 10 executados e verificados.

## Objetivo
Marcar como feitos os 19 itens da L2 e registrar a conclusão da interface. Itens: C1.17, C1.18, C1.19, C1.20, C1.21, C2.3, C2.5, C2.6, C2.7, C2.8, C2.9, C2.11, C2.12, C2.13, C2.16, C2.18, C2.19, C2.21, C6.63.

## Arquivos
1. `docs/checklist-manual-cypecad.md` (editar)
2. `docs/historico-fatias.md` (editar)
3. `docs/plano-execucao.md` (editar)
Leia antes: `docs/cartoes/L2/00-indice.md` e as linhas dos 19 itens no checklist (já levam a nota “núcleo feito (L2): … interface: cartões …”).

## Edições
1. Em `docs/checklist-manual-cypecad.md`, para cada um dos 19 itens (C1.17, C1.18, C1.19, C1.20, C1.21, C2.3, C2.5, C2.6, C2.7, C2.8, C2.9, C2.11, C2.12, C2.13, C2.16, C2.18, C2.19, C2.21, C6.63): trocar a situação (`Falta` ou `Parcial`) por `Feito` e a frente (`L`) por `—`; na nota, trocar “núcleo feito (L2):” por “L2:” e “interface: cartões …” por o arquivo da interface (`LancamentoDxf.tsx`, `Gabaritos.tsx`, `PreviaCamadas.tsx`, `Planta.tsx`, `Edificio.tsx`, conforme o item); manter o “[L2]” do fim. Não mexer em mais nenhuma linha. Em C1.15 (modos de criação), acrescentar à nota “modo DXF/DWG feito na L2 (`NovaObra.tsx`); IFC na L3” e manter `Parcial` e a frente `L`.
2. Rodar `npm run checklists` (reescreve as tabelas de resumo e a de `docs/plano-frentes.md`) e conferir que a frente L passou de 61 para 42 itens abertos (19 a menos).
3. Em `docs/historico-fatias.md`, acrescentar ao fim a linha: `- <data>: L2, interface concluída (cartões docs/cartoes/L2/); e2e L2 verde. <N> testes; pacote <T> KB.` com a data do dia, o total de `npm test` e o tamanho de `dist/index.html` (`npm run build`).
4. Em `docs/plano-execucao.md`, no Andamento, acrescentar a linha `- <data>: L2, interface concluída (cartões docs/cartoes/L2/); e2e L2 verde. Próximo: L3 (IFC).`

## Verificação
```bash
npm run checklists && npx vitest run src/core/checklists.test.ts
```
