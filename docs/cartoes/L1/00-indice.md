# Cartões de implementação da L1 — Assistente de nova obra e gestão de obras (15 itens)

Spec: `docs/spec-frente-L.md`, fatia L1. Itens: C1.14, C1.15, C1.16, C1.24, C1.28, C1.29, C1.40, C1.41, C1.42, C1.43, C1.44, C1.45, C1.48, C3.12, K1.9.2.
Extras de `docs/checklist-extras.md` alocados à L (X3 copiloto de IA, X7 custo por m²): nenhum pertence à L1 (a spec da L1 não os cita); ficam para a fatia que os tratar.

## Como executar
Um cartão por agente, na ordem abaixo, cada um lendo só o cartão e os arquivos citados. O orquestrador confere o diff e roda a verificação do cartão antes de soltar o próximo. Falhou duas vezes: sobe de classe (regra de qualidade do `CLAUDE.md`). Ninguém commita dentro de um cartão; o commit é do orquestrador.
Sugestão de classe: cartões 01 a 12, 16, 19, 21, 22 e 24 são código que segue padrão existente (Haiku, esforço baixo). Os cartões 03, 06, 08 e 10 têm lógica com testes de valores exatos (Haiku; se falhar uma vez, Sonnet). Os cartões 13 a 15, 17, 18, 20 e 23 têm interface e seletores de e2e (Sonnet, esforço médio, por risco de integração).

## Ordem e dependências
| # | Cartão | Arquivos | Depende de |
|---|---|---|---|
| 01 | Descrição e origem da obra (`obra.definir`) | `types.ts`, `commands/obra.ts`, `commands.test.ts` | — |
| 02 | Categorias de uso por norma | `categoriasUso.ts` (+teste) | — |
| 03 | Especificação e `gerarObra` | `assistente.ts` (+teste) | 02 |
| 04 | Comando `obra.assistente` | `commands/obraAssistente.ts`, `commands/index.ts`, `commands.test.ts` | 01, 03 |
| 05 | Guia de etapas | `etapas.ts` (+teste) | — |
| 06 | Importação de texto (núcleo) | `importarArranques.ts` (+teste) | 03 |
| 07 | Comando `obra.importarArranques` | `commands/obraAssistente.ts`, `commands.test.ts` | 04, 06 |
| 08 | Obras de exemplo | `exemplos.ts` (+teste) | 01, 03, 04 |
| 09 | Recentes e biblioteca | `app/edificio/recentes.ts` (+teste), `app/storage.ts` | 01 |
| 10 | Arquivo com versões e resultados | `file.ts`, `file.versoes.test.ts`, `app/workspace.ts` | — |
| 11 | `TextArea`, `FilePick` e CSS | `app/ui/index.tsx`, `design/global.css` | — |
| 12 | Ações da loja | `app/edificio/store.ts` | 04, 07, 08, 09, 10 |
| 13 | Passos Obra, Normas, Pavimentos | `NovaObraPassos.tsx` | 02, 03, 11 |
| 14 | Passos Eixos, Cargas, Resumo | `NovaObraPassos.tsx` | 13 |
| 15 | Janela "Nova obra" | `NovaObra.tsx` | 08, 12, 13, 14 |
| 16 | Dados gerais da obra | `DadosGerais.tsx` | 01, 11 |
| 17 | Janela "Obras recentes" | `ObrasRecentes.tsx` | 08, 09, 11, 12 |
| 18 | Janela "Importar cargas de texto" | `ImportarTexto.tsx` | 06, 07, 11, 12 |
| 19 | Etapas e "Arquivo e versões" | `EtapasObra.tsx` | 05, 10, 11, 12 |
| 20 | Ligação na aba Edifício | `Edificio.tsx` | 15 a 19 |
| 21 | Premissa `assistente` e memorial | `premissas.ts`, `MemorialEdificio.tsx` | 01, 02 |
| 22 | Descrição no carimbo | `sheets/prancha.ts`, `prancha.test.ts` | 01 |
| 23 | Fluxo e2e `L1` | `e2e/flows.mjs` | 01 a 22 |
| 24 | Docs e checklists | `historico-fatias.md`, `plano-execucao.md`, `ia.md`, checklists | 01 a 23 |
(Arquivos de `src/core/building/`, `src/core/commands/`, `src/app/edificio/` sem prefixo.) Pares sem dependência entre si que podem ir em sequência rápida: 02/05/10/11; 21/22 depois do 01. Cartões que editam o mesmo arquivo nunca em paralelo (`commands.test.ts`: 01, 04, 07; `NovaObraPassos.tsx`: 13, 14).

## Verificação de cada cartão
Está no fim do próprio cartão (`npx tsc -b` mais o vitest do arquivo). Cartões de interface: `tsc` e `design.test.ts`; o comportamento é conferido pelo e2e do cartão 23.

## Verificação final da L1 (orquestrador, depois do cartão 24)
```bash
npx tsc -b && npm test && npm run build && npm run e2e
git diff --stat
```
Exigir: tsc limpo, `npm test` completo verde (inclui `checklists.test.ts` e `design.test.ts`), build, e2e completo verde (inclui `L1` e os fluxos antigos que usam "Novo vazio" e os rótulos do grupo Obra), baselines de detalhamento e `r70.test.ts` intactos (a L1 não muda cálculo). Anotar no `historico-fatias.md` o total de testes e o tamanho do `dist/index.html`.

## Pontos de atenção
- `obra.assistente` e `obra.importarArranques` não têm guarda de obra vazia (o teste genérico "aplicar + inverso" os aplica sobre o modelo base): o assistente usa `cotaBase` no exemplo para não colidir; a interface cria sempre uma `Sessao` nova.
- Os ids do assistente são previstos por simulação de `seq` (cartão 03, teste 2 compara com a sequência manual); se `pavimento.criar`/`repetir`/`grupo.criar` mudarem de consumo de `seq`, o teste acusa.
- Exemplos (cartão 08): o teste de revisão pode acusar erro de lançamento em algum exemplo; o cartão manda parar e relatar, não afrouxar o teste.
- Carimbo (cartão 22): a posição vertical da segunda linha da célula OBRA (5,2 mm) é estimada; conferir visualmente o PDF de uma prancha na revisão.
- Valores a confirmar (marcados na premissa `assistente`): 9 categorias adicionais da NBR 6120; limites de 120 caracteres, 500 aberturas, 20 versões, 3 MB e 5 MB; 30 × 30 cm e 5 m na importação de texto.
- Fora da L1: DXF/DWG (L2) e IFC (L3) aparecem como modos desabilitados; muros (E1c) e escadas (E4) como etapas indisponíveis; lajes nervuradas no exemplo (tipo ainda inexistente); reabrir obras recentes de arquivo depende do `.statikos` (só metadados são guardados).
