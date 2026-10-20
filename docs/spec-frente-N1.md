# Spec — Frente N1: modelo e premissas configuráveis

Regra (decisão do usuário, 20/10/2026): seguir o CYPECAD em funcionalidade e opções; o padrão de cada opção é o da NBR 6118 (ou da NBR aplicável) e todo valor é editável. Onde a NBR não fixa valor, o padrão é o do CYPECAD, marcado "[a confirmar]". Itens de origem: frente N dos checklists (`checklist-manual-cypecad.md` e `checklist-manual-calculo-cypecad.md`), incluindo as divergências de premissa listadas no início do checklist de cálculo.

Fora desta frente (vão para N2): punção e cortante em lajes, fogo (NBR 15200), P-Δ 3D, empuxo de terra, elementos finitos de casca.

## Como fica no programa

- **Opções de cálculo do edifício** (novo grupo na barra lateral e no MCP): um objeto `opcoes` no modelo, alterado pelo comando `opcoes.definir`, com padrão NBR e botão "voltar ao padrão". Tudo entra no memorial (seção "Opções de cálculo", só o que difere do padrão em destaque).
- **Por elemento:** pilar, viga e laje ganham os campos que o manual permite ajustar por elemento (engaste, flambagem, bordas); editáveis no painel do elemento, no quadro de pilares e por `atribuir` em lote.
- Cada opção nova vira premissa em `premissas.ts`, com fonte (item da NBR) ou "[a confirmar]".

## Fatias

| Fatia | Conteúdo | Padrão (NBR) / opção |
|---|---|---|
| N1a Rigidezes e vínculos | Torção: redutor por tipo (vigas, lajes, pilares) e torção de equilíbrio com seção bruta. Rigidez axial dos pilares (multiplicador). Trecho rígido no nó: face − 0,3h (NBR 14.6.2.1) ou até a face. Engaste por lance de pilar (topo/base) e no topo do último lance. Engaste das lajes em cada borda e das bordas de viga (0–1, multiplicados). Rótulas em qualquer trecho de viga. Vigas livres (fora do diafragma) e zonas independentes como diafragmas separados. Malha da grelha configurável. | torção 15 % [a confirmar]; EA × 2 [a confirmar]; trecho face − 0,3h; engastes 1; topo do último lance 0,3 [a confirmar, valor do CYPECAD]; malha 0,25 m [a confirmar; hoje 0,5] |
| N1b Materiais e flambagem | fck por tipo de elemento e por pavimento nos pilares. Aço por posição (pilar: longitudinal/estribo; viga: negativo/positivo/montagem/pele/estribo; laje: superior/inferior/cortante). Cobrimentos por face e por elemento. γc, γs e γf editáveis. Comprimento de flambagem por pilar, por direção e por pavimento: ℓe = mín(ℓ0 + h; ℓ) (NBR 15.6) × α; α do pavimento × α do lance; pilar destravado em vários pavimentos. | aço: CA-50 nas barras, CA-60 em estribos e telas φ ≤ 10 [a confirmar]; cobrimentos da Tab. 7.2 pela CAA; α = 1 |
| N1c Ações e combinações | Casos adicionais com natureza (permanente, variável, vento, excepcional) e arranjos compatíveis, incompatíveis ou simultâneos. Categorias de uso por grupo como casos próprios nas combinações. Cargas no topo e ao longo dos pilares (N, M, H, por caso). Lista de combinações visível e exportável; escolha dos estados-limite a verificar. Vento: Ca por sentido, fator de vizinhança, platibanda, repartição entre zonas independentes. γz: limite editável, ampliação das ações horizontais por 0,95·γz (NBR 15.7.2). | combinações NBR 8681/6118; vento NBR 6123; limite γz 1,3 |
| N1d Lajes e flechas | Momentos de dimensionamento das lajes maciças por Wood-Armer (inclui o torçor) com média em faixa transversal de 1 m. Flecha relativa aos apoios (desconta o deslocamento dos apoios). Flechas de vigas no edifício (Branson, NBR 17.3.2.1.1, com integração ao longo do vão). Flecha diferida por αf (NBR 17.3.2.1.2) com etapas de carga (desforma, paredes, revestimento, uso) ou fator simplificado editável por tipo de laje. Limites editáveis por tipo (NBR Tab. 13.3: total L/250, ativa L/500 e 10 mm, sensorial L/350). | método da NBR por padrão; fator simplificado opcional |
| N1e Verificações e desempenho | Redistribuição de negativos (NBR 14.6.4.3, com os limites de δ) e momentos mínimos opcionais (pl²/x). Estribos a partir da face ou a d/2 (NBR 17.4.1.2.1). Torção em vigas (NBR 17.5) com biela conjunta. Cortante em pilares. Fissuração no edifício (NBR 17.3.3). Desempenho: dimensionamento de 13 pavimentos em ≤ 3 s (hoje 17 s). | redistribuição 0 % (desligada), mínimos desligados |

## Aceite por fatia

- Cada opção: comando com schema e exemplo no teste genérico; valor padrão igual ao de hoje quando a NBR não manda mudar (resultados atuais preservados, salvo correção declarada); teste numérico contra caso de livro-texto ou cálculo manual para cada critério novo (ex.: Wood-Armer, Branson, ℓe, redistribuição).
- Memorial e premissas atualizados; checklist com os itens fechados; fluxo e2e da aba de opções.
- MCP: opções acessíveis por `previa` e documentadas em `docs/ia.md`.

## Andamento

- **N1a, parte 1 (feita em 20/10/2026):** `opcoes` no modelo e comando `opcoes.definir` (padrão NBR, "voltar ao padrão"), grupo "Opções de cálculo" na barra lateral, tabela no memorial e premissa `opcoes`. Opções: malha da grelha (0,25 m), torção de vigas (15 %), lajes (15 % de 2I) e pilares (1), rigidez axial dos pilares (× 2), trecho rígido (face − 0,3h), engaste no topo do último lance (0,3). Engaste parcial no `fe3d` por interpolação K = α·Kee + (1 − α)·Ker (critério do manual de referência), sem efeito onde não há vigas no topo (evita mecanismo). Grelhas iguais no mesmo grupo resolvidas uma vez só.
- **N1a, parte 2 (feita em 20/10/2026):** por elemento — `pilar.engaste` (topo/base por lance; base 0 na fundação = pilar articulado), `viga.editar` com `engasteIni`/`engasteFim` (prevalecem sobre o vínculo), `articulacoes` (rótula da viga sobre pilares escolhidos), `torcaoEquilibrio` (GJ bruto), `engasteLajes` e `foraDiafragma`; `laje.editar` com `engasteBordas` (por aresta; × o da viga; bordas em pilares sempre engastadas). Grupo "Vínculos e engastes (seleção)" na barra lateral e lista no memorial. Na grelha, as pontas e rótulas das vigas valem só para a flexão vertical.
- **Zonas independentes como diafragmas separados:** passam para a N1c, junto com a repartição do vento entre zonas (o vento hoje entra no mestre único de cada pavimento).

## Decisões em aberto (marcadas [a confirmar])

Decididas pela regra geral do usuário (padrão do programa de referência onde a NBR não fixa, tudo editável): malha 0,25 m, engaste 0,3 no topo do último lance, torção 15 % e EA × 2. Continuam "a confirmar" no app e no memorial por não terem fonte normativa.

1. Malha da grelha passa a 0,25 m por padrão (CYPECAD) ou fica 0,5 m (desempenho)?
2. Engaste 0,3 no topo do último lance por padrão (CYPECAD; a NBR não fixa)?
3. Torção 15 % e EA × 2 continuam como padrão?
