# Plano por frentes (pós-Fase 2)

Base: `checklist-manual-cypecad.md` (manual do usuário, 763 itens) e `checklist-manual-calculo-cypecad.md` (manual de cálculo, 661 itens), ambos de 20/10/2026. Cada item pendente (Parcial ou Falta) tem uma frente dona. Cada frente ganha uma spec curta (até 2 páginas: itens do checklist que cobre, premissas a decidir, testes de aceite, referências visuais necessárias), aprovada antes de programar, e é entregue em fatias como na Fase 2. O checklist é atualizado a cada fatia; o avanço é medido em % de itens fechados por frente.

## Pendências por frente

| Frente | Manual do usuário | Manual de cálculo | Total |
|---|---|---|---|
| N — Cálculo e normas (pendências na N2: `spec-frente-N2.md`, fatias N2a–N2g marcadas nas notas) | 2 | 7 | 9 |
| R — Revisão de resultados e detalhamento (R1–R6 concluídas em 20/10/2026; o resíduo é a R7, especificada em `spec-frente-R.md` com as subfatias R7-0 e R7a–R7g, depois da FU; auditada no código em 20/10/2026) | 0 | 0 | 0 |
| E — Elementos estruturais (E1 e E2 especificadas em `spec-frente-E1.md` e `spec-frente-E2.md`, fatias E1a–E1e e E2a–E2e marcadas nas notas; E3 e E4 em `spec-frente-E3.md` e `spec-frente-E4.md`, fatias E3a–E3f e E4a–E4e marcadas nas notas) | 1 | 0 | 1 |
| FU — Fundações integradas (spec: `spec-frente-FU.md`, aprovada em 20/10/2026; FU1 concluída, núcleo e interface, em 20/10/2026; FU2 concluída em 20/10/2026; FU3 concluída em 21/10/2026, núcleo e interface, e FU4 em 20/10/2026) | 0 | 0 | 0 |
| L — Produtividade de lançamento (spec: `spec-frente-L.md`, fatias L1–L5 marcadas nas notas) | 0 | 0 | 0 |
| V — Visualização (spec: `spec-frente-V.md`, fatias V1–V5 marcadas nas notas; V1 a V5 concluídas; V6 = correções da auditoria V, feita em 24/10/2026, e dona dos pendentes, subfatias V6a–V6f marcadas nas notas: V6a cortes nas pranchas, V6b várias janelas de deformada, V6c vista 3D da viga de fundação, V6d cliques na planta e na vista 3D, V6e vento e cargas por caso na planta, V6f folha Resultados e figuras de isovalores no memorial) | 6 | 3 | 9 |

Os dois manuais se sobrepõem em parte (o de cálculo detalha critérios de funções descritas no do usuário); os totais não são somas de funcionalidades distintas. Contagens conferidas em 20/10/2026 após a frente R (histórico no fim de cada checklist); `src/core/checklists.test.ts` reprova quando esta tabela ou os resumos dos checklists não batem com as linhas.

O resíduo da R (antes marcado `[resíduo R]`; agora cada item leva a subfatia R7a–R7g nas notas dos checklists) reúne o que a spec da R deixou de fora e não cabe em outra frente: tabelas de armadura editáveis, armadura base e tela das lajes, uniformização e linhas de dobra, edição fina das barras (comprimentos, ganchos, simetria, estribos múltiplos), cópias de armadura entre grupos, agrupar pórticos, rearmar só os alterados e opções de desenho das pranchas (máscara, ponto fixo). Decisão do usuário (20/10/2026): fatia R7 da frente R, especificada em `spec-frente-R.md` e feita depois da FU. Os demais itens deixados de fora pela R foram para E3 (vigotas de fabricante, protendidas, moldadas no local, duplas), E2 (vigas T, consolos, curvas e inclinadas), N (punção e cortante das lajes, avisos de viga-parede e elemento linear, suspensão, arredondamento no apoio) e V (vistas de esforços na planta, deslocamentos por caso e nó, mapas).

A frente E é grande demais para uma spec só e se divide em cinco (a E5 fecha os resíduos):

| Subfrente | Conteúdo | Itens do manual do usuário |
|---|---|---|
| E1 | Pilares sobre pilares e transições, pilar-parede de verdade, muros e paredes estruturais (E1c: passo "Muros e paredes" do assistente, `etapas.ts`, C1.29), alvenaria estrutural, contenção com empuxo. Spec: `spec-frente-E1.md` (E1a–E1e; 80 itens: 40 do manual do usuário — cap. 4, cap. 5, C6.19 e C6.59 — e 40 do de cálculo) | cap. 4 (13) + cap. 5 (25) + 2 do cap. 6 |
| E2 | Vigas T, chatas, curvas e inclinadas; vigas entre pavimentos; diagonais; consolos; viga comum a dois grupos; vínculo externo; pré-moldadas. Spec: `spec-frente-E2.md` (E2a–E2e; 61 itens: 41 do manual do usuário e 20 do de cálculo) | cap. 6 (41) |
| E3 | Lajes nervuradas bidirecionais com ábacos, alveolares, inclinadas e rampas; vigotas completas (catálogo, igualação, erros). Spec: `spec-frente-E3.md` (E3a–E3f; 148 itens: 77 do manual do usuário, todos do cap. 7, e 71 do de cálculo) | cap. 7 (77) |
| E4 | Escadas, mais os itens gerais C0.1, C1.33, C1.34, C10.26 e K1.11.58. Spec: `spec-frente-E4.md` (E4a–E4e; 80 itens: 69 do manual do usuário e 11 do de cálculo) | cap. 8 (65) + 4 gerais |

| E5 | Fechamento dos resíduos da frente E (auditoria E, 24/10/2026): 49 linhas (44 restantes) Parcial ou Falta agrupadas por tema em E5a–E5l (E5f e E5g concluídas); cada nota traz `E5x:` e o que falta. Sem spec própria: o escopo é o texto das notas. Modelo e esforço em `plano-execucao.md` | 44 (E5a 6, E5b 7, E5c 5, E5d 5, E5e 4, E5f 0, E5g 0, E5h 2, E5i 5, E5j 5, E5k 1, E5l 4) |

Subfatias da E5: E5a pranchas das lajes inclinadas (núcleo); E5b ferramentas de planta com o mouse (interface); E5c botões, seletores e etapa Muros (interface); E5d ajuda F1, textos e exemplos dos planos (cartões); E5e vigotas: igualação, vista na planta, flecha de montagem e ômega (núcleo; C7.102 e C7.194 dependem de `pendencias-usuario.md`); E5f aço próprio e punção das nervuradas e ábacos (núcleo; concluída em 24/10/2026); E5g dimensionamento das nervuradas (núcleo); E5h inserção do pano e furos na grelha (núcleo); E5i saídas de paredes, alvenaria e consolos (núcleo e cartões); E5j apoios longitudinais, rigidez das paredes e pilar com desnível (núcleo); E5k vigas de fundação T, L e plana (núcleo e cartões); E5l vínculo externo no modelo integrado (núcleo; feita em 24/10/2026, as 4 linhas Feito).
Subfatias da E5: E5a pranchas das lajes inclinadas (núcleo); E5b ferramentas de planta com o mouse (interface); E5c botões, seletores e etapa Muros (interface); E5d ajuda F1, textos e exemplos dos planos (cartões); E5e vigotas: igualação, vista na planta, flecha de montagem e ômega (núcleo; C7.102 e C7.194 dependem de `pendencias-usuario.md`); E5f aço próprio e punção das nervuradas e ábacos (núcleo; concluída em 24/10/2026); E5g dimensionamento das nervuradas (núcleo; concluída em 24/10/2026); E5h inserção do pano e furos na grelha (núcleo); E5i saídas de paredes, alvenaria e consolos (núcleo e cartões); E5j apoios longitudinais, rigidez das paredes e pilar com desnível (núcleo); E5k vigas de fundação T, L e plana (núcleo e cartões); E5l vínculo externo no modelo integrado (núcleo).
| E5 | Fechamento dos resíduos da frente E (auditoria E, 24/10/2026): 53 linhas Parcial ou Falta agrupadas por tema em E5a–E5m; cada nota traz `E5x:` e o que falta. Sem spec própria: o escopo é o texto das notas. Modelo e esforço em `plano-execucao.md` | 53 (E5a 6, E5b 7, E5c 5, E5d 5, E5e 4, E5f 5, E5g 4, E5h 2, E5i 5, E5j 4, E5k 1, E5l 4, E5m 1) |

Subfatias da E5: E5a pranchas das lajes inclinadas (núcleo); E5b ferramentas de planta com o mouse (interface); E5c botões, seletores e etapa Muros (interface); E5d ajuda F1, textos e exemplos dos planos (cartões); E5e vigotas: igualação, vista na planta, flecha de montagem e ômega (núcleo; C7.102 e C7.194 dependem de `pendencias-usuario.md`); E5f aço próprio e punção das nervuradas e ábacos (núcleo); E5g dimensionamento das nervuradas (núcleo); E5h inserção do pano e furos na grelha (núcleo); E5i saídas de paredes, alvenaria e consolos (núcleo e cartões); E5j apoios longitudinais, rigidez das paredes e alvenaria por pavimento (núcleo; o pilar com desnível passou à E5m); E5k vigas de fundação T, L e plana (núcleo e cartões); E5l vínculo externo no modelo integrado (núcleo; feita em 24/10/2026, as 4 linhas Feito); E5m pilar com vigas em desnível (K1.12.4-19, separada da E5j; núcleo e interface mínima; feita em 24/10/2026).

Os itens E que não estão nas specs da E1 e da E2 (228) foram alocados em 20/10/2026 às specs da E3 (148, fatias E3a–E3f) e da E4 (80, fatias E4a–E4e); os gerais C0.1, C1.34, C10.26, K1.11.58 ficam na E4e (fechamento da frente E) e K1.1.1 na E3f.

## Ordem proposta

0. **Correções imediatas** (lacunas achadas na conferência): fyk fixo em 500 MPa mesmo com CA-60; pilar tracionado sem verificação; furos das lajes ignorados na grelha. Mais a decisão do usuário sobre as divergências de premissa listadas no checklist de cálculo (manter, tornar editável ou adotar o critério do manual).
1. **N1 — Modelo e premissas.** O que muda os esforços vem antes do detalhamento: coeficientes de engaste por lance e por borda, comprimento de flambagem por pilar e direção (altura livre × α), torção e rigidez axial editáveis, trecho rígido, malha da grelha configurável, redistribuição e momentos mínimos, Wood-Armer nas lajes maciças, flecha relativa com fatores por tipo, hipóteses adicionais e categorias de uso nas combinações, lista de combinações visível, fissuração no edifício.
2. **R — Revisão e detalhamento.** O que fecha o ciclo até a entrega: elemento com erro na planta, janela de dimensionamento por elemento, editor de armaduras (vigas, pilares, lajes), bloqueio de armadura no recálculo, agrupar pórticos e copiar armadura, diagramas e envoltórias por clique, flecha de vigas, cortante e torção verificados; pranchas de armação de vigas, pilares e lajes, tabela e resumo de aço reais, relatórios. Precisa de referências visuais do padrão de desenho.
3. **FU — Fundações no edifício.** Sapatas e blocos lançados na planta (centradas, de divisa, de canto, associadas), vigas de equilíbrio e de travamento, geração automática, verificação conjunta, planta de locação e cargas, plantas de armadura de fundação. Reaproveita o módulo Fundações. Spec: `docs/spec-frente-FU.md` (fatias FU1–FU7; a FU7, sapata corrida, depois da E1).
3a. **R7 — Resíduo da R.** R7-0 (pendências das fatias já executadas, achadas na auditoria de 20/10/2026: ferramentas da planta para dividir, unir, prolongar e copiar, quadro de vigas colado, momento na face na janela, logo do carimbo, regressão e desempenho, entre outras), depois tabelas de armadura editáveis, opções de detalhamento de vigas e pilares, armadura base, tela, uniformização e linhas de dobra das lajes, cópia e agrupamento de armaduras, rearmar só os alterados e opções de desenho das pranchas. Spec: seção R7 de `docs/spec-frente-R.md` (R7-0, R7a–R7g).
4. **E1 a E4**, nessa ordem (pilar-parede e muros mudam o modelo; escadas são quase independentes). Specs da E1 (`spec-frente-E1.md`, E1a–E1e), da E2 (`spec-frente-E2.md`, E2a–E2e), da E3 (`spec-frente-E3.md`, E3a–E3f) e da E4 (`spec-frente-E4.md`, E4a–E4e) escritas em 20/10/2026.
5. **N2 — Verificações complementares.** Spec: `spec-frente-N2.md` (N2a–N2g, todos os 119 itens N): ações e combinações (categorias de uso como casos, estados-limite, situações do usuário, empuxo), modelo integrado e casca, pilares e P-Δ 3D, punção e cortante das lajes, vigas e lajes (arredondamento, suspensão, avisos de modelagem), flechas por etapas e ativa, fogo (NBR 15200). N2a–N2c vêm antes da E1, que usa o empuxo, a casca e os trechos rígidos dos pilares.
6. **L — Produtividade.** Assistente de nova obra, lançamento automático por DXF (camada → pilar, contorno, abertura) e IFC, copiar grupo inteiro, viga por clique na máscara, ajudas. Spec: `spec-frente-L.md` (L1–L5; 75 itens), escrita em 20/10/2026; o IFC usa o web-ifc (decisão do usuário de 20/10/2026), vendorizado e sob demanda.
7. **V — Visualização.** Vista 3D do modelo (por pavimento e por tipo de elemento) e das armaduras, cortes do edifício, isovalores, deformada. Os diagramas entram antes, na frente R; a vista 3D simples pode ser antecipada se ajudar a conferir as frentes E. Spec: `spec-frente-V.md` (V1–V5; 62 itens), escrita em 20/10/2026; three.js (decisão do usuário de 20/10/2026), vendorizado e sob demanda.

## Fatias de resíduo (25/10/2026)

Itens Parcial ou Falta cujas notas só citavam fatias já encerradas (`node scripts/residuos.mjs` lista; a regra de "encerrada" está em `src/core/checklists-donos.test.ts`) ganharam uma fatia de resíduo; cada nota traz `Resíduo [xxx]`. Sem spec própria: o escopo é o texto da nota. Modelo e esforço em `plano-execucao.md`.

| Fatia | Frente | Itens | Conteúdo | Tipo |
|---|---|---|---|---|
| V7a | V | 2 | seletor de esforços nas janelas do pilar e da viga | interface |
| V7b | V | 5 | camada de esforços e armadura das vigotas na planta | interface |
| V7c | V | 4 | estado da seção circular/poligonal, diagramas de alveolares e mistas, esforços do pilar-parede por hipótese, distorção e vento por direção, vento na malha | núcleo |
| V7d | V | 4 | planta e editor de símbolos, estilo de pranchas, formato e margens livres, folha de resultados | núcleo + interface |
| V7e | V | 3 | radier por hipótese/combinação, limite por diâmetro, deslocamento por pano | núcleo + interface |
| V7f | V | 1 | interface das opções próprias da viga (e opções próprias de lajes e pilares) | interface |
| N4a | N | 4 | tabelas de fogo (2012, 180 min, NBR 14432), e ≤ 0,15·b; material do usuário | núcleo |
| N4b | N | 3 | ábacos da NBR 6123, Wp/K da punção; material do usuário | núcleo |
| N4c | N | 3 | redistribuição nas faces, opções por elemento, flecha ativa | núcleo |
| R8a | R | 4 | vigas: comprimentos de corte, grupos, ancoragem, montagem e adicional | núcleo + interface |
| E6a | E | 1 | tabela de aço da alvenaria armada na prancha | núcleo + interface |
| E6b | E | 1 | igualação das vigotas entre panos | núcleo |

## Fora do escopo (decidido)

Normas estrangeiras sem equivalente NBR, sismo, aço/misto/madeira/alumínio dentro do edifício (estruturas 3D integradas, vigas e pilares de aço, lajes mistas, ligações metálicas, placas de base), compactação e publicação de obras em servidor. O formato JSON da CYPE (só ligações metálicas) fica como possível exportação do Pórtico 2D, prioridade baixa.

## Referências visuais

Necessárias para R e FU (padrão de desenho brasileiro do escritório): armação de viga (elevação, cortes, lista de barras), pilares (quadro e detalhe de estribos), lajes (positivas e negativas), formas, locação e cargas, fundação, tabela/resumo de aço, carimbo. Recebidas até agora: vista 3D do modelo e das armaduras (referência de função para V). Ficam fora do repositório (público).
