# Cartões de implementação da interface da L2 — Lançamento por DXF/DWG por camada e gabaritos (19 itens)

Spec: `docs/spec-frente-L.md`, fatia L2. Itens: C1.17, C1.18, C1.19, C1.20, C1.21, C2.3, C2.5, C2.6, C2.7, C2.8, C2.9, C2.11, C2.12, C2.13, C2.16, C2.18, C2.19, C2.21, C6.63.
Extras de `docs/checklist-extras.md` alocados à L (X3 copiloto de IA, X7 custo por m²): nenhum pertence à L2 (a spec da L2 não os cita); ficam para a fatia que os tratar.

O núcleo da L2 já está no repositório (commit do núcleo): `src/core/building/lancamentoDxf.ts`, `src/core/geom/cadeias.ts`, `src/core/dxf/dwgLeitor.ts`, `src/core/commands/lancamento.ts` (`lancamento.aplicar`, `viga.daMascara`), os comandos `mascara.copiar/regras/origemOriginal/configurar` e os parâmetros novos de `mascara.importar/editar/camadas` (`src/core/commands/planta.ts`), os campos novos do modelo (`Mascara.grupos/regras/arquivo/original/visivel`, `CamadaMascara.apelido/espessura/textos`, `origemLancamento`), `geometriaPorCamada` (`pilares.ts`) e o vendor `public/vendor/nasjidwg-leitor-0.18.0.mjs`. Nenhum cartão edita o núcleo. A interface foi escrita e validada pelo orquestrador: os cartões 01 a 10 foram aplicados em ordem a partir de uma árvore sem a interface (`tsc -b` limpo depois de cada um; ao final `design.test.ts` verde e `npm run e2e -- L2` verde) e a interface foi revertida; o conteúdo dos cartões é exatamente o que foi aplicado.

## Como executar
Um cartão por agente, na ordem abaixo, cada um lendo só o cartão e os arquivos citados. O orquestrador confere o diff e roda a verificação do cartão antes de soltar o próximo. Falhou duas vezes: sobe de classe. Ninguém commita dentro de um cartão; o commit é do orquestrador. As edições são “troque este trecho por este” (o trecho aparece uma vez no arquivo) e os arquivos novos vêm por inteiro: copiar exatamente.
Sugestão de classe: todos os cartões são código dado quase por inteiro (Haiku, esforço baixo). Os cartões 04, 05, 06, 07, 08 e 10 mexem em integração (planta, janelas, e2e): se o Haiku falhar uma vez, Sonnet.

## Ordem e dependências
| # | Cartão | Arquivos | Depende de |
|---|---|---|---|
| 01 | Leitura de gabaritos DXF e DWG | `lancamentoLeitura.ts` (novo), `Edificio.tsx` | núcleo |
| 02 | Classes CSS | `design/global.css` | — |
| 03 | Prévia das camadas | `PreviaCamadas.tsx` (novo) | 02 |
| 04 | Assistente de lançamento (4 passos) | `LancamentoDxf.tsx` (novo) | 01, 02, 03 |
| 05 | Ferramenta Viga pelo gabarito e F3 | `plantaStore.ts`, `Planta.tsx` | núcleo |
| 06 | Planta: vistas, textos, cor e espessura | `Planta.tsx` | 05 |
| 07 | Gabaritos, vistas por pavimento e janela de capturas | `Gabaritos.tsx` (novo) | 01, 02, 03, 05 |
| 08 | Ligação na aba Edifício e na Nova obra | `Edificio.tsx`, `NovaObra.tsx`, `ParedesUI.tsx` | 01, 04, 05, 07 |
| 09 | Memorial | `MemorialGabaritos.tsx` (novo), `MemorialEdificio.tsx` | núcleo |
| 10 | Fluxo e2e `L2` | `e2e/flows.mjs` | 01 a 09 |
| 11 | Docs e checklists | `docs/checklist-manual-cypecad.md`, `historico-fatias.md`, `plano-execucao.md` | 01 a 10 |
(Arquivos de `src/app/edificio/` sem prefixo.) Cartões que editam o mesmo arquivo nunca em paralelo (`Planta.tsx`: 05 e 06; `Edificio.tsx`: 01 e 08).

## Verificação de cada cartão
Está no fim do próprio cartão (`npx tsc -b` e `design.test.ts`; o 10 também roda `npm run e2e -- L2`).

## Verificação final da L2 (orquestrador, depois do cartão 11)
```bash
npx tsc -b && npm test && npm run build && npm run e2e
git diff --stat
```
Exigir: tsc limpo, `npm test` completo verde (inclui `checklists.test.ts` e `design.test.ts`), build, e2e completo verde (inclui `L1`, os fluxos `planta:` e `L2`), baselines de detalhamento e `r70.test.ts` intactos (a L2 não muda cálculo). Anotar no `historico-fatias.md` o total de testes e o tamanho do `dist/index.html`. Depois, auditoria independente da frente (regra do projeto).

## Pontos de atenção
- Rótulos únicos nos componentes (o nome do gabarito ou da camada entra no rótulo), porque o e2e usa `getByLabel`/`getByRole` com `exact: true`; só `NumField` e `Select` pedem regex ancorada no início.
- Nenhum botão novo na barra da planta: a ferramenta Viga pelo gabarito não tem tecla (as letras estão em uso) e é ligada pelo grupo Máscara; F3 liga e desliga as capturas.
- O DWG só abre com `public/vendor/nasjidwg-leitor-0.18.0.mjs` (gerado por `node scripts/vendor-nasjidwg.mjs`); no artifact do claude.ai o arquivo não existe e o assistente avisa e sugere o DXF.
- Valores a confirmar (premissa `lancamento-dxf`): nomes de camada e heurísticas de geometria, viga por eixo 15 × 40 cm, faces de 8 a 60 cm, tolerância de 1 cm, pilar até 2 m, nome por texto (letras + número) a até 1 m, laje de 10 cm, vigas e lajes no primeiro grupo da vista, corpo da viga do lado do cursor.
- Fora da L2: IFC (L3); o modo “Importação de IFC” da janela Nova obra continua desabilitado; pilar-parede de polígono não retangular (fica como ignorado na proposta; E1b exige tipo por lados); viga curva (E2b).
