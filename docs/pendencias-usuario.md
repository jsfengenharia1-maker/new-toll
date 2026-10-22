# Pendências que dependem do usuário (material normativo, catálogo ou validação externa)

Só entra aqui o que exige texto, tabela, ábaco ou item de norma, catálogo de fabricante ou exemplo/validação externa que o ambiente não consegue verificar. Escolha de padrão "a confirmar" segue o CYPECAD e não entra (regra de 20/10/2026). Valores provisórios continuam marcados "a confirmar" no app e no memorial até chegar o material.

## Como enviar
PDF da norma, fotos legíveis das páginas (tabela inteira, com cabeçalho e notas) ou os números digitados (tabela em CSV/texto, indicando edição, item e número da tabela/figura). Para ábacos, os pontos lidos do gráfico (x, y) bastam. Para arquivos CAD, o resultado do AUDIT em texto. Não enviar material de obra real.

## O que mandar (ordem de impacto)
1. NBR 6123 (1988): ábacos de Ca (Figuras 4 a 10), fator de vizinhança e Tabela 1 de S2 — alteram as forças de vento de todo edifício.
2. NBR 6122:2019: Tabela 4 (estacas), majoração de σadm com vento, alívio de 50 % e travamento — alteram o dimensionamento das fundações.
3. NBR 15200:2012 (tabelas de lajes, vigas, pilares, 180 min) e NBR 14432 (TRRF) — base da frente N2g, ainda sem código.
4. NBR 6118:2023 (numeração dos itens citados; ηc para fck > 40) e NBR 6120 (categorias novas de uso).
5. NBR 7481 (telas Q, L, T) e catálogo SCAC (pré-moldadas).
6. NBR 16752, 13142 e 16861 (prancha) e exemplos de prancha (laje, tubulão, radier, viga de equilíbrio).
7. AUDIT do DXF/DWG no AutoCAD.

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

## NBR 15200:2012 e NBR 14432 (fogo; frente N2g, ainda sem código)
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| Tabelas tabulares de lajes maciças e nervuradas (h mín. e c1 por TRRF, incluindo 180 min) | Verificação de laje ao fogo | `src/core/building/fogo.ts` e `fogoTabelas.ts` | Tabelas da edição de 2004 (até 120 min); só a edição de 2004 e fórmula analítica |
| Tabelas de vigas biapoiadas e contínuas (bmín/c1, 180 min) | Verificação de viga ao fogo | `fogo.ts` | Idem |
| As nove tabelas gerais do método tabular de pilares (μfi, λ, e/b) | Pilares ao fogo | `fogo.ts` | Idem |
| NBR 14432: TRRF por ocupação, altura e área | Sugestão de TRRF por grupo | `fogo.ts`, `b.fogo.trrf` | IT 06 do CBMMG |

## NBR 6118:2023 e NBR 6120
| O que falta | Para que serve | Onde entra | Valor provisório |
|---|---|---|---|
| Numeração de todos os itens citados (o código usa a edição de 2014) | Referências no memorial e nas mensagens | `src/core/building/premissas.ts`, `origem.ts`, `fonte` em `opcoes.ts` | Numeração de 2014 |
| ηc para fck > 40 (item 8.2.10.1) e demais mudanças de 2023 em diagrama tensão-deformação | Resistência de cálculo de C50 em diante | `src/core/concrete.ts` (linha de `etac`) | (40/fck)^(1/3) |
| Itens/fórmulas: Wp de borda e canto, K da Tabela 19.2, ψ do vento na punção | Punção | `src/core/building/puncao.ts` | Wp ≈ metade da fórmula; K do app |
| NBR 6120:2019 Tabela 10 completa (9 categorias novas da L1) | Cargas variáveis por uso e ψ por categoria | `src/core/building/categoriasUso.ts`, `USOS` em `types.ts` | 6 usos: 1,5; 2,0; 3,0; 2,5; 3,0; 1,0 kN/m² |
| NBR 6120: carga em planos inclinados e escadas (item) | Frentes E3 e E4 | `src/core/building/lajes.ts` (planos) | Projeção horizontal [a confirmar] |
| NBR 8681: γ de equilíbrio e do empuxo; controle de execução | Estados-limite de equilíbrio | `src/core/building/acoes.ts` (`GAMA_ORIGEM`) | 0,9/1,4 e 1,4 |

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
