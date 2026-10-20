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

## Premissas (decididas ou a decidir antes da fatia indicada)

Aprovada pelo usuário em 20/10/2026.

- R1: limites de deslocamento lateral (NBR 6118, Tabela 13.3: H/1700 no topo e h/850 entre pavimentos) e o que conta como erro (vermelho) e como aviso (amarelo).
- R3: barra máxima 12 m (padrão do programa de referência) e perdas de aço 10 %; comprimentos arredondados a 5 cm; ancoragem em boa/má aderência pela posição da barra (9.3.1).
- R5 (decidido em 20/10/2026): tensões sempre em MPa; vírgula decimal com duas casas; cargas características e de cálculo; eixos conforme o projeto. Referência visual: as 6 pranchas de exemplo enviadas pelo usuário (Drive; fora do repositório).
- R1 (aprovado em 20/10/2026): deslocamento lateral pela NBR 6118, Tabela 13.3 (H/1700 no topo e hi/850 entre pavimentos, vento na combinação frequente ψ1 = 0,3), limites editáveis; reprovação de cálculo = erro (vermelho), o resto = aviso (amarelo).

## Andamento

- **R1 feita em 20/10/2026.** Núcleo: `revisao.ts` (códigos), deslocamentos laterais, envoltória das vigas e combinações determinantes dos pilares. Interface: erros (vermelho) e avisos (amarelo) na planta com a chave "Mostrar erros" (mapa de níveis calculado uma vez por resultado, sem custo extra por quadro); lista de erros e avisos na aba Dimensionamento (contagem, filtros por nível e tipo, legenda dos códigos, clique centraliza o elemento na planta); janela de resultados por elemento (duplo clique nas tabelas ou na lista, botão "Resultados do elemento" na planta) com diagramas SVG de M, V e T, combinações determinantes de pilares e resultados de lajes; tabela de deslocamentos laterais na aba Análise e resumo no memorial, que também ganha a seção "Erros e avisos"; exportação CSV (vigas, pilares, lajes); fluxo e2e `R1`.
- Ficou de fora da R1: sugestões de correção por erro; envoltória por hipótese (só por combinação ELU); envoltórias de pilares como diagrama contínuo (só as combinações determinantes); deslocamento por caso simples e por pilar; capacidade resistente nos diagramas das vigas (vem com o detalhamento, R3); momento na face do pilar; relatórios por esforço; erros de vigotas (R6). Um clique numa linha das tabelas agora espera ~230 ms para distinguir do duplo clique.
- **R2 feita em 20/10/2026.** Núcleo: comandos `pilar.armadura`, `viga.armadura` e `armadura.desbloquear` (`src/core/commands/armaduras.ts`), `Pilar.armaduras` e `Viga.armadura`, armadura bloqueada só verificada no recálculo (vigas: área de aço, estribos, laterais, fissuração e flecha; pilares: verificação completa por fibras), código ARM_BLOQ (erro) e BLOQ_IGNORADO (aviso quando mudam lances ou vãos), `bloqueada` e `arranjo` nos resultados. Interface (`src/app/edificio/Armadura.tsx`): editor "Armadura" na janela do elemento (arranjo calculado pré-preenchido; As efetiva × necessária; "Aplicar e bloquear", "Desbloquear", "Restaurar calculada"; aplicar recalcula sozinho); coluna "Bloq." nas tabelas de vigas e pilares; marcador ▣ no rótulo do elemento na planta; bloqueio em lote (selecionados da planta ou todos, e desbloqueio equivalente) com contagem; seção "Armaduras bloqueadas" no memorial; fluxo e2e `R2`.
- Ficou de fora da R2: rearmar só os alterados sem recálculo geral (hoje todo recálculo é global); desbloqueio automático gravado no modelo (hoje o bloqueio é só desconsiderado no resultado, com aviso, e continua no modelo); comprimento das barras por posição e tipologias/tabelas de estribos e grampos (R3a/R3b); "Restaurar calculada" do pilar desbloqueia todos os lances do pilar (o comando atua por elemento); bloqueio por grupo, cores de seleção e janela de seleção própria; lajes (R4).
- **R3a feita em 20/10/2026.** Núcleo: `src/core/building/detalhamento.ts` (corte pela envoltória decalada, ancoragem lb, ganchos, emendas por traspasse, montagem, pele, estribos por zonas, resumo de aço), opções `barraMaxima`, `arredondamento`, `perdasAco` e `bitolaMontagem`, comando `viga.copiarArmadura` e premissa `detalhamento-vigas`. Interface: aba Detalhamento na janela da viga (`src/app/edificio/Detalhamento.tsx`: elevação SVG com escalas horizontal e vertical independentes, seção transversal, tabela de barras e estribos, lb com a aderência, avisos), resumo de aço com perdas e CSV (resumo + lista de barras de todas as vigas) na aba Dimensionamento, botão "Copiar para…" (vigas do grupo; pré-marcadas as de mesma seção e nº de vãos), seção "Detalhamento das vigas" no memorial, tokens `--det-*` no design system e fluxo e2e.
- Ficou de fora da R3a: tabelas de disposições e estribos editáveis pelo usuário, estribos múltiplos, em U e grampos, simetria de estribos e de negativas, mínimos de comprimento em % do vão, redução da ancoragem por As,calc/As,ef, edição do detalhamento (comprimentos por posição), agrupar pórticos e poliviga (C6.32, C6.34, C6.81–C6.83), cópia entre grupos diferentes pela interface (o comando aceita qualquer viga), referências-base de juntas, desenho nas pranchas (R5).

## Aceite por fatia

Testes numéricos contra cálculo manual (ancoragem, emendas, decalagem, corte de barras); fluxo e2e de cada tela; memorial e checklist atualizados; nenhuma regressão nos resultados das frentes N.

## Referências visuais (para R5)

As 6 pranchas de exemplo do usuário (Drive): armação de viga, pilares, lajes, tabela e resumo de aço. Pelo conector só vêm como texto; para vê-las como imagem é preciso liberar `drive.usercontent.google.com` na rede do ambiente ou receber prints. Sem dados de clientes no repositório.
