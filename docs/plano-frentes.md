# Plano por frentes (pós-Fase 2)

Base: `checklist-manual-cypecad.md` (manual do usuário, 763 itens) e `checklist-manual-calculo-cypecad.md` (manual de cálculo, 661 itens), ambos de 20/10/2026. Cada item pendente (Parcial ou Falta) tem uma frente dona. Cada frente ganha uma spec curta (até 2 páginas: itens do checklist que cobre, premissas a decidir, testes de aceite, referências visuais necessárias), aprovada antes de programar, e é entregue em fatias como na Fase 2. O checklist é atualizado a cada fatia; o avanço é medido em % de itens fechados por frente.

## Pendências por frente

| Frente | Manual do usuário | Manual de cálculo | Total |
|---|---|---|---|
| N — Cálculo e normas | 26 | 93 | 119 |
| R — Revisão de resultados e detalhamento (R1–R6 concluídas em 20/10/2026; o resíduo é a R7, especificada em `spec-frente-R.md` com as subfatias R7-0 e R7a–R7g, depois da FU; auditada no código em 20/10/2026) | 41 | 68 | 109 |
| E — Elementos estruturais | 227 | 142 | 369 |
| FU — Fundações integradas (spec: `spec-frente-FU.md`, aprovada em 20/10/2026; FU1 concluída, núcleo e interface, em 20/10/2026) | 58 | 23 | 81 |
| L — Produtividade de lançamento | 71 | 4 | 75 |
| V — Visualização | 42 | 20 | 62 |

Os dois manuais se sobrepõem em parte (o de cálculo detalha critérios de funções descritas no do usuário); os totais não são somas de funcionalidades distintas. Contagens conferidas em 20/10/2026 após a frente R (histórico no fim de cada checklist); `src/core/checklists.test.ts` reprova quando esta tabela ou os resumos dos checklists não batem com as linhas.

O resíduo da R (antes marcado `[resíduo R]`; agora cada item leva a subfatia R7a–R7g nas notas dos checklists) reúne o que a spec da R deixou de fora e não cabe em outra frente: tabelas de armadura editáveis, armadura base e tela das lajes, uniformização e linhas de dobra, edição fina das barras (comprimentos, ganchos, simetria, estribos múltiplos), cópias de armadura entre grupos, agrupar pórticos, rearmar só os alterados e opções de desenho das pranchas (máscara, ponto fixo). Decisão do usuário (20/10/2026): fatia R7 da frente R, especificada em `spec-frente-R.md` e feita depois da FU. Os demais itens deixados de fora pela R foram para E3 (vigotas de fabricante, protendidas, moldadas no local, duplas), E2 (vigas T, consolos, curvas e inclinadas), N (punção e cortante das lajes, avisos de viga-parede e elemento linear, suspensão, arredondamento no apoio) e V (vistas de esforços na planta, deslocamentos por caso e nó, mapas).

A frente E é grande demais para uma spec só e se divide em quatro:

| Subfrente | Conteúdo | Itens do manual do usuário |
|---|---|---|
| E1 | Pilar-parede de verdade, muros e paredes estruturais, contenção com empuxo | cap. 4 (12) + cap. 5 (25) |
| E2 | Vigas T, chatas, curvas e inclinadas; vigas entre pavimentos; diagonais; consolos; viga comum a dois grupos; vínculo externo | cap. 6 (40) |
| E3 | Lajes nervuradas bidirecionais com ábacos, alveolares, inclinadas e rampas; vigotas completas (catálogo, igualação, erros) | cap. 7 (56) |
| E4 | Escadas | cap. 8 (65) |

## Ordem proposta

0. **Correções imediatas** (lacunas achadas na conferência): fyk fixo em 500 MPa mesmo com CA-60; pilar tracionado sem verificação; furos das lajes ignorados na grelha. Mais a decisão do usuário sobre as divergências de premissa listadas no checklist de cálculo (manter, tornar editável ou adotar o critério do manual).
1. **N1 — Modelo e premissas.** O que muda os esforços vem antes do detalhamento: coeficientes de engaste por lance e por borda, comprimento de flambagem por pilar e direção (altura livre × α), torção e rigidez axial editáveis, trecho rígido, malha da grelha configurável, redistribuição e momentos mínimos, Wood-Armer nas lajes maciças, flecha relativa com fatores por tipo, hipóteses adicionais e categorias de uso nas combinações, lista de combinações visível, fissuração no edifício.
2. **R — Revisão e detalhamento.** O que fecha o ciclo até a entrega: elemento com erro na planta, janela de dimensionamento por elemento, editor de armaduras (vigas, pilares, lajes), bloqueio de armadura no recálculo, agrupar pórticos e copiar armadura, diagramas e envoltórias por clique, flecha de vigas, cortante e torção verificados; pranchas de armação de vigas, pilares e lajes, tabela e resumo de aço reais, relatórios. Precisa de referências visuais do padrão de desenho.
3. **FU — Fundações no edifício.** Sapatas e blocos lançados na planta (centradas, de divisa, de canto, associadas), vigas de equilíbrio e de travamento, geração automática, verificação conjunta, planta de locação e cargas, plantas de armadura de fundação. Reaproveita o módulo Fundações. Spec: `docs/spec-frente-FU.md` (fatias FU1–FU7; a FU7, sapata corrida, depois da E1).
3a. **R7 — Resíduo da R.** R7-0 (pendências das fatias já executadas, achadas na auditoria de 20/10/2026: ferramentas da planta para dividir, unir, prolongar e copiar, quadro de vigas colado, momento na face na janela, logo do carimbo, regressão e desempenho, entre outras), depois tabelas de armadura editáveis, opções de detalhamento de vigas e pilares, armadura base, tela, uniformização e linhas de dobra das lajes, cópia e agrupamento de armaduras, rearmar só os alterados e opções de desenho das pranchas. Spec: seção R7 de `docs/spec-frente-R.md` (R7-0, R7a–R7g).
4. **E1 a E4**, nessa ordem (pilar-parede e muros mudam o modelo; escadas são quase independentes).
5. **N2 — Verificações complementares.** Fogo (NBR 15200), punção completa com armadura, P-Δ 3D, demais itens de norma que sobrarem.
6. **L — Produtividade.** Assistente de nova obra, lançamento automático por DXF (camada → pilar, contorno, abertura) e IFC, copiar grupo inteiro, viga por clique na máscara, ajudas.
7. **V — Visualização.** Vista 3D do modelo (por pavimento e por tipo de elemento) e das armaduras, cortes do edifício, isovalores, deformada. Os diagramas entram antes, na frente R; a vista 3D simples pode ser antecipada se ajudar a conferir as frentes E.

## Fora do escopo (decidido)

Normas estrangeiras sem equivalente NBR, sismo, aço/misto/madeira/alumínio dentro do edifício (estruturas 3D integradas, vigas e pilares de aço, lajes mistas, ligações metálicas, placas de base), compactação e publicação de obras em servidor. O formato JSON da CYPE (só ligações metálicas) fica como possível exportação do Pórtico 2D, prioridade baixa.

## Referências visuais

Necessárias para R e FU (padrão de desenho brasileiro do escritório): armação de viga (elevação, cortes, lista de barras), pilares (quadro e detalhe de estribos), lajes (positivas e negativas), formas, locação e cargas, fundação, tabela/resumo de aço, carimbo. Recebidas até agora: vista 3D do modelo e das armaduras (referência de função para V). Ficam fora do repositório (público).
