# Spec — Frente R (revisão de resultados e detalhamento)

Base: 228 itens Parcial/Falta com frente R nos dois checklists (105 do manual do usuário, 123 do de cálculo), em 16 grupos. Regra: paridade de função com o programa de referência; padrões em dois perfis (sistema × NBR 6118) quando diferirem; premissas sem fonte marcadas "a confirmar".

## Fatias

| Fatia | Conteúdo (grupos) | Itens | Depende de referência visual |
|---|---|---|---|
| R1 Ver erros e revisar | Elemento reprovado em vermelho na planta com código do motivo e lista de erros clicável (1); janela por elemento ao clicar pilar/viga/laje: esforços, envoltórias de M, V, T e capacidade, combinações determinantes, 2ª ordem, momento na face (2); deslocamentos por caso, nó e pavimento, com aviso acima do limite (3); listagem geral, relatório de pilares e quantitativos (14) | ~48 | não |
| R2 Editar armadura com bloqueio | Editor de pilares (seção, armadura, estribo) e vigas (nº, bitola, comprimento por posição); bloqueio da armadura editada, verificada a cada recálculo, com desbloqueio quando reprova; redimensionar só o alterado (4, 5, 7) | 21 | não |
| R3a Detalhamento de vigas | Disposição em 3 grupos (passante, reforços), corte pela envoltória decalada (aℓ já calculada), ancoragem e ganchos (NBR 9.4), emendas por traspasse com barra máxima de 12 m, montagem, pele (17.3.5.2.3), estribos por zona; agrupar e copiar pórticos (9, 8) | ~45 | só o desenho |
| R3b Detalhamento de pilares | Emendas e arranques, união de lances curtos, continuidade entre lances, mudança de seção, ancoragem reduzida, estribos e grampos (18.2.4) (10) | 20 | só o desenho |
| R4 Lajes | Armadura base e reforços, linhas de dobra, comprimentos mínimos, edição e cópia (6, 11) | 35 | só o desenho |
| R5 Pranchas e aço | Pranchas de armação de vigas, pilares e lajes (PDF/DXF/DWG), tabela de barras, resumo de aço com perdas (12, 13) | 17 | **sim** |
| R6 Vigotas | Resultados, erros e edição de lajes treliçadas (15) | 42 | pouco |

O grupo 16 (itens gerais) fecha com o ciclo.

## Premissas a decidir (antes da fatia indicada)

- R1: limites de deslocamento lateral (NBR 6118, Tabela 13.3: H/1700 no topo e h/850 entre pavimentos) e o que conta como erro (vermelho) e como aviso (amarelo).
- R3: barra máxima 12 m (padrão do programa de referência) e perdas de aço 10 %; comprimentos arredondados a 5 cm; ancoragem em boa/má aderência pela posição da barra (9.3.1).
- R5: unidades e formatos nas pranchas (kgf/cm² ou MPa, vírgula decimal, cargas características ou de cálculo, estilo dos eixos) — pendentes desde a 6b.

## Aceite por fatia

Testes numéricos contra cálculo manual (ancoragem, emendas, decalagem, corte de barras); fluxo e2e de cada tela; memorial e checklist atualizados; nenhuma regressão nos resultados das frentes N.

## Referências visuais necessárias (para R5)

Armação de viga (elevação, cortes, lista de barras), pilares (quadro e detalhe de estribos), lajes (positivas e negativas), tabela e resumo de aço. Sem dados de clientes no repositório.
