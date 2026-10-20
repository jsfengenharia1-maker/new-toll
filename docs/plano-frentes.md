# Plano por frentes (pós-Fase 2)

Base: `checklist-manual-cypecad.md` (manual do usuário, 763 itens) e `checklist-manual-calculo-cypecad.md` (manual de cálculo, 661 itens), ambos de 20/10/2026. Cada item pendente (Parcial ou Falta) tem uma frente dona. Cada frente ganha uma spec curta (até 2 páginas: itens do checklist que cobre, premissas a decidir, testes de aceite, referências visuais necessárias), aprovada antes de programar, e é entregue em fatias como na Fase 2. O checklist é atualizado a cada fatia; o avanço é medido em % de itens fechados por frente.

## Pendências por frente

| Frente | Manual do usuário | Manual de cálculo | Total |
|---|---|---|---|
| N — Cálculo e normas | 32 | 102 | 134 |
| R — Revisão de resultados e detalhamento (R1, R2 e R3a feitas em 20/10/2026) | 97 | 117 | 214 |
| E — Elementos estruturais | 200 | 141 | 341 |
| FU — Fundações integradas | 67 | 23 | 90 |
| L — Produtividade de lançamento | 71 | 5 | 76 |
| V — Visualização | 38 | 19 | 57 |

Os dois manuais se sobrepõem em parte (o de cálculo detalha critérios de funções descritas no do usuário); os totais não são somas de funcionalidades distintas.

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
3. **FU — Fundações no edifício.** Sapatas e blocos lançados na planta (centradas, de divisa, de canto, associadas), vigas de equilíbrio e de travamento, geração automática, verificação conjunta, planta de locação e cargas, plantas de armadura de fundação. Reaproveita o módulo Fundações.
4. **E1 a E4**, nessa ordem (pilar-parede e muros mudam o modelo; escadas são quase independentes).
5. **N2 — Verificações complementares.** Fogo (NBR 15200), punção completa com armadura, P-Δ 3D, demais itens de norma que sobrarem.
6. **L — Produtividade.** Assistente de nova obra, lançamento automático por DXF (camada → pilar, contorno, abertura) e IFC, copiar grupo inteiro, viga por clique na máscara, ajudas.
7. **V — Visualização.** Vista 3D do modelo (por pavimento e por tipo de elemento) e das armaduras, cortes do edifício, isovalores, deformada. Os diagramas entram antes, na frente R; a vista 3D simples pode ser antecipada se ajudar a conferir as frentes E.

## Fora do escopo (decidido)

Normas estrangeiras sem equivalente NBR, sismo, aço/misto/madeira/alumínio dentro do edifício (estruturas 3D integradas, vigas e pilares de aço, lajes mistas, ligações metálicas, placas de base), compactação e publicação de obras em servidor. O formato JSON da CYPE (só ligações metálicas) fica como possível exportação do Pórtico 2D, prioridade baixa.

## Referências visuais

Necessárias para R e FU (padrão de desenho brasileiro do escritório): armação de viga (elevação, cortes, lista de barras), pilares (quadro e detalhe de estribos), lajes (positivas e negativas), formas, locação e cargas, fundação, tabela/resumo de aço, carimbo. Recebidas até agora: vista 3D do modelo e das armaduras (referência de função para V). Ficam fora do repositório (público).
