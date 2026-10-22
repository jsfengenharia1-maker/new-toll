# Pendências que dependem do usuário (material normativo, catálogo ou validação externa)

Só entra aqui o que exige texto, tabela, ábaco ou item de norma, catálogo de fabricante ou exemplo/validação externa que o ambiente não consegue verificar. Escolha de padrão "a confirmar" segue o CYPECAD e não entra (regra de 20/10/2026). Valores provisórios continuam marcados "a confirmar" no app e no memorial até chegar o material.

## Como enviar
PDF da norma, fotos legíveis das páginas (tabela inteira, com cabeçalho e notas) ou os números digitados (tabela em CSV/texto, indicando edição, item e número da tabela/figura). Para ábacos, os pontos lidos do gráfico (x, y) bastam. Para arquivos CAD, o resultado do AUDIT em texto. Não enviar material de obra real.

## O que mandar (ordem de impacto)
1. NBR 6123 (1988): ábacos de Ca (Figuras 4 a 10), fator de vizinhança e Tabela 1 de S2 — alteram as forças de vento de todo edifício.
2. NBR 6122:2019: Tabela 4 (estacas), majoração de σadm com vento, alívio de 50 % e travamento — alteram o dimensionamento das fundações.
3. NBR 15200:2012 (tabelas de lajes, vigas, pilares, 180 min) e NBR 14432 (TRRF) — base da frente N2g; o código existe (`fogo.ts`, `fogoTabelas.ts`) com as tabelas de 2004 e a fonte secundária da 2012, e as tabelas faltantes entram só por transcrição.
4. NBR 6118:2023 (numeração dos itens citados; ηc para fck > 40) e NBR 6120 (categorias novas de uso).
5. NBR 7481 (telas Q, L, T) e catálogo SCAC (pré-moldadas).
6. NBR 16752, 13142 e 16861 (prancha) e exemplos de prancha (laje, tubulão, radier, viga de equilíbrio).
7. AUDIT do DXF/DWG no AutoCAD.
8. NBR 16868-1 (alvenaria estrutural, 2020): fk e γm, esbeltez, tração e cisalhamento, alvenaria armada — base da E1e, escrita sem o texto da norma.

## NBR 6123 (vento)
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| Ábacos de Ca (Figuras 4 a 10: edificações de planta retangular, por relações h/l1 e l1/l2), pontos lidos | Coeficiente de arrasto automático por sentido | `src/core/building/abacosVento.ts` (tabelas vazias) | Ca 1,3 informado (`VENTO_PADRAO`); Ca automático desativado |
| Fator de vizinhança (item 6.4, Figura/Tabela) | Majoração por edificações vizinhas | `abacosVento.ts`, `vento.ts` | Valor informado pelo usuário, sem tabela |
| Tabela 1 de S2 (b, p, Fr por categoria I a V e classe A, B, C) e confirmação da edição (1988) | Fator S2 de rugosidade e altura | `S2_PARAM`, `FR` em `src/core/building/vento.ts` | b 1,10/1,00/0,94/0,86/0,74 e p sem o texto da norma |
| Item da norma para platibanda/largura corrigida b′ e excentricidade (7,5 %) | Vento por zona e torção | `vento.ts` | Excentricidade 0,075 e b′ por critério do app |

## NBR 6122:2019 (fundações)
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| Tabela 4 (estacas moldadas: classe/γc, fck, σ sem armar, comprimento mínimo da armadura, As,mín) — só veio do projeto de 2018 | Dimensionamento estrutural de escavada e hélice | `STRUCT` em `src/core/piles.ts` | Hélice 30/2,7 e 40/3,6; escavada 25/3,1 e 40/5,0; Lmín 4/2 m; σ 6/5 MPa; ρmín 0,4 % |
| Majoração de σadm com vento (item e valor) | Verificação geotécnica com combinações de vento | `terreno.fatorVento` em `src/core/building/fundacao.ts` | 1,0 (sem majoração); campo editável |
| Itens do alívio de 50 % da viga de equilíbrio e do travamento de blocos | Vigas de fundação | `src/core/building/vigasFundacao.ts`, `fundacao.ts` | Alívio de 50 % e travamento do app, itens não conferidos |
| Padm das estacas (mín[(Rp+Rl)/2; Rp/4+Rl/1,3]) e limite 1,25·Rl da escavada: texto da edição vigente | Capacidade de carga das estacas | `src/core/piles.ts` | Fórmulas confirmadas pelo usuário; edição de 2010 mantida |
| Valores de σadm pelo SPT, nh e k do solo: nenhuma tabela da norma usada | Sapatas, tubulões, radier | `footings.ts`, `caissons.ts`, `baseElastica.ts` (`radierK`) | N̄/50 (sapata), N̄/30 (tubulão), k 100 000 kN/m³ — estimativas |
| Fatores do concreto simples e fuste do tubulão (γc 1,6; ×1,2 no simples) | Tubulão e sapata de concreto simples | `caissons.ts`, `footingsGroup.ts` | Valores do app |

## NBR 15200:2012 e NBR 14432 (fogo; frente N2g, código em `fogo.ts` e `fogoTabelas.ts`)
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| Tabelas tabulares de lajes maciças e nervuradas (h mín. e c1 por TRRF, incluindo 180 min) | Verificação de laje ao fogo | `src/core/building/fogo.ts` e `fogoTabelas.ts` | Edição de 2004 (até 120 min) e fórmula analítica |
| Tabelas de vigas biapoiadas e contínuas (bmín/c1, 180 min) | Verificação de viga ao fogo | `fogo.ts` | Idem |
| As nove tabelas gerais do método tabular de pilares (μfi, λ, e/b) | Pilares ao fogo | `fogo.ts` | Idem |
| NBR 14432: TRRF por ocupação, altura e área | Sugestão de TRRF por grupo | `fogo.ts`, `b.fogo.trrf` | IT 06 do CBMMG |
| Pilar com vento nas combinações determinantes: a NBR 15200 manda desprezar o vento na excentricidade de 1ª ordem (confirmar o texto e o item) | Limite e ≤ 0,15·b do método analítico | `fogo.ts` (`semVento`, `e` nulo vira aviso FOGO_LIMITES) | Combinações sem vento; se todas levam vento, sem verificação e aviso |

## NBR 6118:2023 e NBR 6120
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| Numeração de todos os itens citados (o código usa a edição de 2014) | Referências no memorial e nas mensagens | `src/core/building/premissas.ts`, `origem.ts`, `fonte` em `opcoes.ts` | Numeração de 2014 |
| ηc para fck > 40 (item 8.2.10.1) e demais mudanças de 2023 em diagrama tensão-deformação | Resistência de cálculo de C50 em diante | `src/core/concrete.ts` (linha de `etac`) | (40/fck)^(1/3) |
| Itens/fórmulas: Wp de borda e canto, K da Tabela 19.2, ψ do vento na punção | Punção | `src/core/building/puncao.ts` | Wp pela definição ∫\|e\|dℓ em torno do centroide de u* (conferido por integração independente em `puncao.test.ts`): borda 40×40, d = 20 cm, 0,5627 m² perpendicular à borda (51,6 % da fórmula fechada de 1,0913 m², que o app reproduz na direção paralela) e canto 0,3231 m² (29,6 %); critério, não erro de implementação; conservador (τ maior). Enviar o texto do item 19.5.2.3/19.5.2.4 para fechar; K do app |
| NBR 6120:2019 Tabela 10 completa (9 categorias novas da L1) | Cargas variáveis por uso e ψ por categoria | `src/core/building/categoriasUso.ts`, `USOS` em `types.ts` | 6 usos: 1,5; 2,0; 3,0; 2,5; 3,0; 1,0 kN/m² |
| NBR 6120: carga em planos inclinados e escadas (item) | Frentes E3 e E4 | `src/core/building/lajes.ts` (planos) | Projeção horizontal [a confirmar] |
| NBR 8681: γ de equilíbrio e do empuxo; controle de execução | Estados-limite de equilíbrio | `src/core/building/acoes.ts` (`GAMA_ORIGEM`) | 0,9/1,4 e 1,4 |
| NBR 8681 / NBR 6118:2023 (tabelas de γ): linhas de empuxo de terra e ações indiretas (retração, temperatura, recalque) de `GAMA_ORIGEM` | γ por origem da ação nas combinações | `src/core/building/acoes.ts` (`GAMA_ORIGEM`, `gamaDaOrigem`) | Valores provisórios do app por origem (empuxo 1,4 ELU; ações indiretas conforme a linha da tabela), sem tabela conferida |
| NBR 6118:2023, 15.8.3.3 / 8.2: 1,1·σcd na resistência do método geral dos pilares | Método geral (curva tensão-deformação do concreto) | `src/core/metodoGeral.ts` (constante comentada "[a confirmar]", linha 53) | 1,1·σcd do app |
| NBR 6118:2023, 8.2.11 e Tabela 8.2: coeficiente de fluência φ (valor de 2,5 usado no pilar com fluência) | Efeito da fluência no pilar (λ > 90) | opção `pilarFluencia` em `src/core/building/opcoes.ts` (~694), `metodoGeral.ts` | φ = 2,5, Tabela 8.2 não consultada |
| NBR 6118, 14.6.3 (e apoios): ΔM = R·t/8 do momento de ligação nos apoios extremos, divisor e item | Momento nos apoios (premissa `n2e-apoios`) | `src/core/building/apoios.ts` (`deltaMApoio`, ~16) | ΔM = R·t/8, divisor e item não conferidos com o texto |
| NBR 6118, Tabela 17.1 (ξ(t)): conversão de dias em meses com 30 d/mês no cálculo da flecha diferida e ativa | Flecha diferida e ativa por etapas | `src/core/building/flechas.ts` (`xiDias`, ~72) | 30 d/mês |

## NBR 7481 e catálogos de fabricantes
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| Catálogo de telas soldadas: dimensões da série Q e séries L e T, painéis | Armadura base de lajes | `src/core/building/telasSoldadas.ts` | Série Q de catálogos de terceiros; painel 2,45 × 6,00 m; traspasse 20 cm; L/T ausentes |
| SCAC: cargas, tração e momento admissível das pré-moldadas centrifugadas | Estacas pré-moldadas | `PRECAST_CATALOG` em `src/core/piles.ts` | Menor valor da faixa; momento "com o fabricante" |
| Critério de nega pelo SPT das pré-moldadas (norma ou fabricante) | Comprimento da estaca | `precastStopN` em `piles.ts` | N = 30 ajustável |
| Catálogo de treliçadas (TR 8644 a TR 25856) e EPS | Vigotas e lajes treliçadas | `TRELICAS` em `src/core/building/vigotas.ts` | Geometria nominal; γ EPS 0,2 kN/m³ |
| Perfis soldados e propriedades W/HP contra catálogo | Aço (NBR 8800) | `src/core/profiles.ts` | Calculadas pela geometria |

## Representação de pranchas (NBR 16752, 13142, 16861) e exemplos
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| NBR 16752: margens e largura da legenda | Formato das pranchas | `src/core/sheets/prancha.ts`, `papel.ts` | Esq. 20 mm; 10 mm A0/A1; 7 mm A2 a A4; legenda 178 mm |
| NBR 13142: marcas e posição de dobra | Dobra das pranchas | `src/core/sheets/` | Marcas do app |
| NBR 16861: penas e alturas de texto por camada | Espessura de linha | `CAMADAS` em `src/core/sheets/prancha.ts` | Pilar 0,50; viga 0,35; texto 0,25; cota 0,18; eixo 0,13 |
| Exemplo de prancha: armação de lajes, tubulão, radier, viga de equilíbrio (PDF/foto) | Layout e simbologia dessas pranchas | `src/core/sheets/armacaoLajes.ts`, `fundacao*.ts` | Padrão da R5 aplicado por analogia |

## Validação externa
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| AUDIT do DXF (R2000) e DWG no AutoCAD, incluindo o aviso de arquivo não Autodesk | Garantir abertura sem erro | `src/core/sheets/dxf.ts`, `dwg.ts`; `validation/dxf/auditar.py` | Só ezdxf; AutoCAD não testado |
| Bloco de várias estacas sob pilares com cargas diferentes: exemplo resolvido ou pelo programa de referência | Tirantes (hoje Rmáx em todas as estacas, conservador) | `src/core/caps.ts` (`cols`) | Até +132 % contra OpenSees |
| Gabarito de IFC exportado dos programas de referência (passo I0) | Exportação para Revit/CYPECAD/TQS/Eberick | Frente de exportação | Nenhum |

## Paredes e muros (E1d)

| Fatia | Norma e edição | Tabela ou item | O que falta conferir | Onde é usado no código |
|---|---|---|---|---|
| E1d | NBR 6118:2014 (e 2023) | 18.4 e 18.5 (pilares-parede), 15.9 | Taxas mínima e máxima da armadura vertical e horizontal, espaçamentos e bitola máxima das malhas de paredes e pilares-parede; ℓe do processo aproximado por faixas | opções `paredeTaxaVertMin/Max`, `paredeTaxaHorMin`, `paredeHorFracVert`, `paredeEspMin/Max`, `paredeBitolaMax`, `paredeFlambagem` em `opcoes.ts`; `paredesArmadura.ts` (`listaMalhas`, `minimosPano`, `requisitosElemento`) |
| E1d | NBR 16055:2012 | armadura mínima e de aberturas | Paredes de concreto moldadas no local: armadura mínima, reforço de aberturas (verga, peitoril, montantes, cantos) | `paredesDim.ts` (`dimensionarAbertura`, `CANTO_PADRAO`) |
| E1d | NBR 6118:2014 | 19.4.1 e 19.4.2 | Espessura de 35 cm para armadura transversal de cortante em lajes, estendida às paredes (cortante fora do plano) | `paredesArmadura.ts` (`atende`, `cortanteTransversal`) e `paredesDim.ts` (`dimensionarPano`) |
| E1d | NBR 6118:2014 | 9.5.2 (emendas por traspasse) e Tabela 9.4 (α0t) | Item do acréscimo da distância livre entre barras emendadas (> 4φ) e proporção de barras emendadas por seção em paredes | `detalhamentoParedes.ts` (`comprimentoEmenda`), opções `paredeEmendaProp` e `paredeEmendaAmpliar` |
| E1d | NBR 6118:2014 | 24 (concreto simples) | Limites de tração e compressão do concreto simples (γc × 1,2 usado como nas fundações) | `paredesArmadura.ts` (`verificaConcretoSimples`), `Parede.armar === false` |
| E1d | EN 1992-2 (referência) e NBR 6118:2014 | Annex F e Annex LL (sanduíche); 17.2 | Equivalência do modelo sanduíche com z = 0,9d e das camadas de concreto (t/2 sem tração, t/3 com tração) aos critérios da NBR 6118 para chapas | `paredesArmadura.ts` (`membrana`, `camadas`, `requisitosElemento`) |
| E1d | NBR 11682:2009 | 5 (muros de arrimo) | Fatores de segurança ao tombamento e ao deslizamento, empuxo passivo e dente; dispensa de estribos no fuste e na base | `muroArrimo.ts`, `muroArrimoDim.ts` |

## Sapata corrida de paredes e muros (FU7b)
| Frente | Norma | Item | O que falta | Onde entra |
|---|---|---|---|---|
| FU7b | NBR 6122:2019 | Estabilidade ao deslizamento de sapatas (item e coeficiente) e atrito base-solo | Coeficiente de atrito μ da base de concreto moldada contra o solo (provisório 0,4 = tg(2φ/3) com φ ≈ 33°) e fator de segurança mínimo ao deslizamento (provisório 1,5, da NBR 11682 para muros de arrimo) aplicados à sapata corrida de parede com empuxo | opções `fundCorridaAtrito`, `fundCorridaFSDesliz`, `fundCorridaDeslizamento` (`sapataCorrida.ts`, `calcularParede`) |
| FU7b | NBR 6122:2019 | Excentricidade e área comprimida de sapatas sob momento | Limite de excentricidade (núcleo central, 2/3 da área comprimida) aplicado ao momento do pé da parede de subsolo, com o sinal do momento não distinguido (módulo, sentido desfavorável) | `sapataCorrida.ts` (`verifica`), `flexaoTransversal` (`eExtra`) |
| FU7b | NBR 6122:2019 e NBR 6118:2014 | Sapata sob parede: seção de referência do momento e dispersão da carga de pilar que nasce sobre a parede | Seção de referência a 15 % de bw (CEB-70) estendida à parede de concreto em contato com o solo e carga do pilar concentrada na janela de 1 m (a dispersão pela altura da sapata não é considerada) | `corridaParede.ts` (`cargasLinearesDaParede`), opções `corridaRefConcreto`, `corridaJanela` |
| FU7b | NBR 6122:2019 | σadm do muro de arrimo isolado pelo SPT | Muro sem posição em planta usa o menor σadm entre os furos da obra (N̄/50 MPa com a largura B do muro): confirmar o critério de furo representativo | `baseMuro.ts` (`sigmaDoMuro`) |
| FU7b | NBR 11682:2009 e NBR 6122:2019 | 5 (muros) e estabilidade ao deslizamento | Deslizamento de paredes de subsolo de topo travado por laje: o app usa a soma vetorial das reações horizontais da base de todas as paredes travadas contra Σ μ·N (empuxos opostos se anulam pela laje e pela ligação das bases); confirmar o critério (conjunto, pilares fora do somatório, ligação das sapatas por piso ou vigas de fundação) | opções `fundCorridaDeslizGrupo` e `fundCorridaDeslizamento`; `deslizamentoDoConjunto` em `sapataCorrida.ts` |
## Alvenaria estrutural e blocos de concreto (E1e)

Nenhum texto da NBR 16868 estava disponível: todas as fórmulas abaixo foram escritas de memória, marcadas "a confirmar" no app (opções `alvenaria*`) e no memorial (premissas `e1e-*`). O que o programa de referência define (cumprimento 80 %, tração 10 % da compressão, aviso no relatório) já está como padrão do sistema.

| Fatia | Norma e edição | Tabela ou item | O que falta conferir | Onde é usado no código |
|---|---|---|---|---|
| E1e | NBR 16868-1:2020 (e 16868-2/-3) | Resistência do prisma e da parede (fk = 0,7 fpk), razão fpk/fbk dos blocos de concreto vazados | Fator fk/fpk, razão de estimativa do prisma (0,8) e efeito do grauteamento (total, parcial) no fk | opções `alvenariaFkPrisma`, `alvenariaPrisma`; `resistenciaAlvenaria` em `src/core/building/alvenaria.ts` |
| E1e | NBR 16868-1:2020 | Coeficientes de ponderação da resistência (γm) por situação e por material (alvenaria, graute, aço) | γm da alvenaria (2,0 usado), eventual redução em ações especiais e γm do graute | opção `alvenariaGamaM`; `resistenciaAlvenaria` |
| E1e | NBR 16868-1:2020 | Módulo de elasticidade (800 fpk, teto 16 GPa) e de cisalhamento (0,4 E) | E em função do fpk (blocos de concreto e cerâmicos) e G | `resistenciaAlvenaria` (E e G da casca) |
| E1e | NBR 16868-1:2020 | Esbeltez efetiva (hef/tef) e redutor R = 1 − (λ/40)³; limites λ ≤ 24 (não armada) e 30 (armada); altura efetiva com lajes e paredes de travamento | Redutor, limites de esbeltez, hef para apoio topo/base e para enrijecedores | opções `alvenariaFlambagem`, `alvenariaLambdaMax`, `alvenariaLambdaMaxArmada`; `esbeltezAlvenaria` |
| E1e | NBR 16868-1:2020 | Excentricidade mínima / acidental (hef/500) e interação compressão-flexão da alvenaria não armada | Valor da excentricidade mínima e fórmula de interação (σN/(fd·R) + σM/fd) | opção `alvenariaExcMin`; `utilizacaoElemento` |
| E1e | NBR 16868-1:2020 | Resistência à tração na flexão (por direção, tabela) e ao cisalhamento (fvk = fv0 + 0,5σ ≤ 1,4 MPa; fv0 = 0,15; fvk da armada) | Tabelas de ftk (paralela e normal às juntas, com e sem graute) no lugar do 10 % do programa de referência; fvk nas juntas horizontais, verticais e na armada | opções `alvenariaTracao`, `alvenariaCisalhInicial`, `alvenariaCisalhMax`; `utilizacaoElemento`, `fvdDe` |
| E1e | NBR 16868-1:2020 | Alvenaria armada: diagrama de tensões na flexão, taxas mínimas vertical e horizontal, espaçamentos máximos, bitolas, limite superior do cisalhamento, comprimentos de ancoragem e de traspasse nos furos grauteados | Bloco retangular com tensão fd·R, taxas 0,05 %, espaçamentos 1,2 m e 0,6 m, limite 0,25 fd da biela | opções `alvenariaTaxaVertMin`, `alvenariaTaxaHorMin`; constantes `ESP_VERTICAL_MAX`, `ESP_HORIZONTAL_MAX`, `flexaoArmadaFaixa`, `verificarPanoAlvenaria` |
| E1e | NBR 16868-1:2020 (e prática de projeto) | Vergas, contravergas, apoios e canaletas; modulação, cantos e amarração (16868-3) | Apoio mínimo da verga (30 cm), altura em fiadas de canaleta, regras de peça de canto e de perda de módulo na contagem de blocos | opções `alvenariaVergaApoio`, `alvenariaVergaFiadas`; `dimensionarVerga`, `quantitativoParede` |
| E1e | Catálogos de fabricantes de blocos | Blocos de concreto estruturais (famílias 14 e 19 cm, 29, 39, canaleta, compensadores, canto) | Dimensões modulares e peças especiais para pré-cadastrar na biblioteca (hoje só o bloco que o usuário cria) | `bloco.tipo` (`TipoBloco` em `src/core/building/types.ts`) |

## Conferências no CYPECAD (o usuário tem o programa)

| Item | O que conferir | Onde é usado no código | Critério provisório |
|---|---|---|---|
| Deslizamento da sapata corrida de parede de subsolo travada por laje | Num subsolo com duas paredes opostas sob empuxo, laje no topo e sapata corrida: o CYPECAD verifica deslizamento por sapata (com a reação horizontal da base) ou dispensa/considera o conjunto? Que FS e μ usa? | `sapataCorrida.ts` (`topoTravado`, deslizamento do conjunto), opção `fundCorridaDeslizGrupo` | Conjunto travado: FS = Σμ·N / |ΣH| (padrão 1); 0 = cada sapata |
## Seções de viga (E2a)
| Frente | Norma | Item | O que falta | Onde entra |
|---|---|---|---|---|
| E2a | NBR 6118:2014 | 14.6.2.2 e 14.6.2.2.1 (largura colaborante e distância a entre pontos de momento nulo) | Texto da norma não disponível: usados b1 ≤ 0,1·a e ≤ 0,5·b2 e a = 1,0ℓ, 0,75ℓ e 0,6ℓ (biapoiada, extremo e interno de contínua) de memória; conferir os coeficientes, o caso do balanço (2,0ℓ) e a regra de b3 (vigas de borda) | `secaoViga.ts` (`abaColaborante`, `distanciaMomentoNulo`) |
| E2a | NBR 6118:2014 | 17.3.5.2.1 (armadura mínima) na seção T com a mesa tracionada | W0 da seção T bruta também no momento negativo (mesa tracionada): confirmar se a norma pede o W0 da T ou da alma | `concrete.ts` (`beamAsMin`), usado com `mesaDimensionamento` = 1 |
| E2a | Programa de referência (manual de cálculo) | EI vertical × 10⁻¹⁵ das vigas de amarração | Fator numérico adotado igual ao do manual; confirmar o efeito sobre a torção (GJ × coeficiente) e a quantidade de barras de canto da mesa (K1.12.16) | `analitico.ts` (`FATOR_EI_AMARRACAO`), `detalhamento.ts` (`cantosMesa`) |
