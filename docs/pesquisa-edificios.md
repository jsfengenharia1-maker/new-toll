# Pesquisa — Módulo Edifícios (Fase 0)

Data: 19/10/2026. Sem código. Entregável da Fase 0 do prompt do módulo Edifícios (lançamento por pavimentos + pórtico espacial).

**Método e limitação.** Cinco pesquisas em paralelo (A–D, E–I, J–K, L e ferramenta de desenho). A rede desta sessão bloqueou os sites dos fabricantes, distribuidores e universidades (info.cype.com, downloads2.cype.com, docs.tqs.com.br, suporte.altoqi.com.br, UFV, UTFPR, UFMG, autodesk.com, bentley.com e outros). Por isso, o conteúdo sobre CYPECAD, Eberick e TQS veio dos trechos que o buscador extrai das páginas, e cada afirmação traz a marca da origem: (busca, oficial), (fórum), (versão antiga) ou **(não verificado)**. O GitHub abriu normalmente (especificação MCP, llms.txt, bibliotecas). Medições de desempenho (solver, Canvas × SVG, índice espacial, tamanhos de bundle) foram feitas aqui, com código próprio. **Antes da spec da Fase 1, as fontes oficiais devem ser reabertas numa sessão com rede liberada.**

**Reconstrução limpa.** Tudo descrito com palavras próprias. Nenhum texto de manual, nome de comando, parâmetro proprietário, ícone ou layout de tela foi copiado. Os termos técnicos genéricos (pavimento, pilar, viga, laje, pano, máscara) são livres.

---

## Resumo executivo

1. **Lançamento.** Os três programas trabalham com pavimentos e grupos de pavimentos iguais, máscara DXF/DWG com camadas e capturas, pilares com ponto fixo e seção por pavimento, e vigas por polilinha com alinhamento por face. Onde o Statikos pode ser melhor:
   - pavimento-tipo vinculado, com diff visual entre pavimentos;
   - máscara alinhada por 2 pares de pontos;
   - Tab para ciclar as capturas;
   - quadro de pilares e vigas em planilha (colar do Excel);
   - **verificação de lançamento contínua** (nos três programas é um comando à parte), com correção sugerida;
   - lançamento automático a partir do DXF como proposta revisável, aceita ou rejeitada por elemento.
2. **Lajes.** Os panos são detectados pelo contorno fechado de vigas, paredes e, no TQS, também de pilares. Eberick e TQS usam grelha (a treliçada vira barras T por nervura); o CYPECAD usa MEF de placa. Proposta: detecção ao vivo por faces de grafo planar (half-edge/DCEL), com o pano sombreado enquanto se desenha.
3. **Modelo analítico.** O solver atual (`BandLDL`, medido: 0,3–0,4 Gflop/s no Node) resolve um pórtico espacial de 20 pavimentos com diafragma mestre-escravo (~4.900 GL) em ~1 s, e a grelha de um pavimento com malha de 50 cm em ~0,3 s. O modelo integrado resolvido de uma vez (~150 mil GL) é inviável em banda. Por isso, **MVP com modelo separado**: grelha por pavimento → reações → pórtico espacial 6 GL com diafragma mestre-escravo e trechos rígidos exatos. Modelo integrado por condensação de pavimentos fica para a V2.
4. **Vento.** Proposta: largura de fachada calculada pela projeção do pavimento e casos gerados automaticamente em 4 direções × (centrado, +e, −e), no grupo excludente "vento" que já existe.
5. **Desenho.** Medido com 20 mil segmentos: SVG leva ~833 ms para montar e roda a ~10 fps no pan; Canvas 2D redesenha em ~35 ms, ~43 fps no pan com cache, sem GPU. Captura por índice espacial: ~17 µs. Proposta:
   - planta em **Canvas 2D com 3 camadas** (máscara em cache, modelo, interativa), redesenho só quando algo muda;
   - SVG fica para memorial e impressão;
   - RBush para os elementos e Flatbush para a máscara, ~5 KB gz no total;
   - coordenadas float64 com origem local automática no DXF;
   - tema escuro estilo CAD com paleta própria editável, cores reforçadas por forma e traço, preto e branco para impressão.
6. **IA-nativo.** Registro único de comandos (JSON Schema, `validar`, `aplicar` com `produceWithPatches` do immer, que já é dependência, para patch e inverso; risco; log). Esse registro serve à UI, aos atalhos, ao `.statikos` (replay), aos testes (aplicar + inverso = original) e ao MCP (annotations readOnly/destructive, prévia com diff e token de versão, nunca `execute_code`). CLI e MCP stdio rodam em Node com o mesmo `src/core`.
7. **Dependências.** Código próprio para DXF, IFC (saída), 3D simples e solver. Se aprovados, carregados sob demanda: pdf.js (PDF como máscara, Apache-2.0, ~0,5 MB gz), web-ifc (entrada IFC, MPL-2.0, ~0,96 MB gz) e acad-ts (DWG, MIT, ~200 KB gz, experimental). **Não embutir libredwg (GPL-3).** O `vite-plugin-singlefile` embute todo `import()`, então módulos sob demanda precisam ir à parte em `public/vendor`. O three.js (~130 KB gz) quase dobraria o HTML atual (659 KB); a alternativa é um visualizador WebGL próprio de prismas (~20 KB).
8. **Licença.** Apache-2.0 + CLA + marca "Statikos" (favorece adoção) × AGPL-3.0 + CLA (trava fork SaaS, mas pouco acrescenta enquanto tudo roda no navegador). Decisão do usuário.

---

## Proposta de escopo do MVP

Alvo: edifício residencial de até ~10 pavimentos, concreto armado, lajes maciças e treliçadas, vento NBR 6123.

| Bloco | Entra no MVP | Fica para V2/V3 |
|---|---|---|
| Obra | Pavimentos, grupos (pavimento-tipo vinculado), cotas e pé-direito, nível de fundação global, categoria de uso (NBR 6120), pavimento inferior esmaecido por baixo | Desvincular com diff, nível de fundação por pilar |
| Máscara | DXF (parser próprio: LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, TEXT/MTEXT, INSERT); escala/origem/rotação por 2 pontos; camadas visível/capturável por pavimento | PDF vetorial (pdf.js), DWG (acad-ts), IFC (web-ifc), lançamento automático por DXF/IA |
| Desenho | Canvas 2D em camadas; capturas com glifos e Tab; ortogonal/polar; distância/ângulo digitados durante o traço; eixos A-B-C × 1-2-3; seleção janela/cruzamento e filtro; mover/copiar/girar/espelhar no pavimento e entre pavimentos; desfazer/refazer; repetir último comando; painel de propriedades; linha de comando; temas escuro/claro/P&B | Rastreamento avançado, touch completo, renumeração em lote |
| Pilares | Retangulares e circulares; ponto fixo (centro, faces, cantos); ângulo; nasce/morre; seção por pavimento; quadro em tabela; numeração automática; aviso de pilar sem apoio | Pilar-parede, pilar nascendo em viga (transição) com modelo próprio, poligonais |
| Vigas | Polilinha; alinhamento por face com ajuste à face do pilar; invertida; balanço; vinculação nas extremidades; baldrame (sem solo elástico); dividir/unir; atribuir em lote | Chata (com punção), inclinada, baldrame sobre solo elástico |
| Lajes | Detecção automática de panos; maciça; treliçada unidirecional com catálogo editável; aberturas; balanço | Nervurada bidirecional, alveolar, lisa/cogumelo, rebaixo com efeito no cálculo, inclinada |
| Outros | — | Escadas (assistente que atualiza as cargas), reservatório, paredes de concreto, contenção com empuxo |
| Cargas | Por pavimento (G e Q por uso), pontuais, lineares, superficiais em região, alvenaria automática a partir de camada do DXF, vento NBR 6123 automático | Empuxo, sismo NBR 15421 (V3) |
| Verificação | Contínua: pilar sem viga, viga sem apoio, pano não fechado, sobreposição, viga em viga sem ligação, pilar morrendo sem apoio, viga fora da face do pilar | Correção automática em lote |
| Análise | Grelha por pavimento (malha 50 cm) + pórtico espacial 6 GL, diafragma mestre-escravo, trechos rígidos, multiplicador axial dos pilares nas verticais, γz com rigidez reduzida | P-Δ 3D, modelo integrado, molas viga-pilar, processo construtivo (V3), MEF de placa |
| Saídas | Esforços e deformada por pavimento, isovalores da grelha, dimensionamento de vigas e pilares com `concrete.ts`, cargas no módulo Fundações, quantitativos (concreto, fôrma, aço por taxa), memorial, DXF de formas | Detalhamento de armaduras, IFC de saída, pranchas |
| Vistas | Planta por pavimento; 3D simples (prismas, órbita) com visualizador próprio | Cortes do edifício, 3D com corte, three.js |
| IA | Registro de comandos tipados; CLI (`statikos calc`); MCP stdio com prévia → aplicar; diagnósticos estruturados; `docs/ia.md` e `llms.txt` | WebMCP na aba aberta |

---

## [confirmar] consolidado

Cada item vira premissa editável e entra no memorial depois do aceite.

**Organização e lançamento**
1. Agrupar pavimentos com pé-direito diferente no mesmo grupo?
2. Cota de referência do pavimento: topo da laje estrutural ou acabada (e espessura de revestimento a descontar)?
3. Profundidade padrão da fundação abaixo do térreo.
4. MVP aceita só DXF como máscara (PDF/DWG/IFC na V2)?
5. Numeração automática: P1 no canto superior esquerdo, da esquerda para a direita e de cima para baixo? Mesmo critério para vigas (horizontais primeiro)?
6. Ponto fixo padrão do pilar (centro?) e tolerância de desalinhamento entre pavimentos.
7. Limite entre pilar e pilar-parede (b ≥ 5h?) e modelo do pilar-parede (barra ou lâminas), V2.
8. Vínculo do pé do pilar sobre viga de transição (articulado ou engaste parcial), V2.
9. Vinculação padrão viga-viga (articulada?) e viga-pilar (engaste).
10. Viga chata e verificação de punção fora do MVP? Vigas inclinadas fora do MVP?
11. Baldrame: só apoiado nos blocos no MVP (sem solo elástico)?

**Lajes e cargas**
12. Contorno do pano pelo eixo ou pela face das vigas.
13. Catálogo de treliçadas (alturas, intereixo, capa, peso do EPS), rigidez à torção e critério unidirecional × bidirecional.
14. Direção padrão das vigotas: menor vão. Balanço com treliçada: erro ou aviso?
15. Desnível que interrompe a continuidade entre lajes (ex.: > h/2?).
16. Valores da NBR 6120:2019 (Tabela 10), carga de divisórias (1,0 kN/m²?) e revestimento padrão.
17. Alvenaria automática: peso por tipo de bloco, altura = pé-direito − h da viga, desconto de aberturas.
18. Vento: edição da NBR 6123 a usar (1988 ou 2023, que tem notícia de cancelamento), excentricidades (0,075a / 0,15a), categoria/classe/S1/S3 padrão.
19. Escadas (V2): lance engastado ou apoiado no patamar; carga variável de escada. Empuxo (V2): K0 ou Ka; permanente ou variável.

**Modelo analítico**
20. Modelo padrão do MVP: separado (grelha + pórtico espacial).
21. Nó mestre do diafragma: centro geométrico do pavimento ou centro de massa.
22. Trecho rígido viga-pilar: até a face do pilar ou face − 0,3h (NBR 6118, item a conferir).
23. Grelha: malha 50 cm; J = fator × 2I (fator de torção 15 % na grelha e 0 no ELU?).
24. Treliçadas: apoiadas ou engastadas nas vigas; capa colaborante.
25. Multiplicador da rigidez axial dos pilares (2?) só nas ações verticais.
26. Redistribuição padrão de negativos (0 % no MVP?).
27. γz como padrão de 2ª ordem; P-Δ 3D na V2.
28. Números dos itens da NBR 6118 citados (edição 2014 × 2023).

**Desenho e interface**
29. Tema padrão escuro (estilo CAD) e paleta hex proposta na seção "Ferramenta de desenho".
30. Mapa de atalhos de uma tecla (P pilar, V viga, L laje, E eixo, C carga, M mover, D cotar, 1–8 capturas).
31. Coordenadas digitadas com vírgula decimal e separador ";" (ex.: `@3,5;2,0`); ângulo anti-horário a partir de +x.
32. Raio de captura (px), prioridade entre capturas e passo polar padrão (15°).
33. 3D do MVP: visualizador WebGL próprio (~20 KB), three.js só no build do Netlify, ou adiar?
34. Metas de desempenho (≥ 55 fps no pan com 20 mil segmentos; captura ≤ 2 ms p99) e máquina de referência; limite de devicePixelRatio em 2.
35. Espessuras de traço do P&B pela NBR 8403.
36. Quantos passos de desfazer vão salvos no `.statikos`.

**IA, dependências e licença**
37. Licença do repositório (Apache-2.0 × AGPL-3.0 × MIT) e CLA/DCO.
38. Dependências sob demanda (pdf.js, web-ifc, acad-ts): aprovar uma a uma quando chegar a fatia correspondente.
39. Importar IFC ou só exportar.
40. Comportamento dentro do artifact do claude.ai (sem carregamento sob demanda: recursos pesados desativados lá?).
41. Uso de IA externa: o app roda no navegador; o MCP roda local (Node). No artifact, a capability de perguntar ao Claude pode servir à classificação de camadas do DXF.

**Saídas**
42. Taxas de aço para quantitativos (vigas 100, pilares 130, lajes 70 kg/m³?) e regras de fôrma.

---

# Inventário detalhado

## Módulo "Edifícios" — inventário A–D (organização, máscaras, pilares, vigas)

Pesquisa de comportamento observável (reconstrução limpa). Data: 19/10/2026.

**Limitação de método (importante):** nesta sessão, o acesso direto às páginas foi bloqueado: WebFetch não resolveu DNS e o proxy recusou o curl. Nenhum PDF ou página foi aberto diretamente. O conteúdo abaixo vem dos resumos e trechos do buscador (WebSearch), que citam páginas de info.cype.com, learning.cype.com, docs.tqs.com.br, suporte.altoqi.com.br, fóruns e TCCs. Por isso:
- Itens com uma única fonte de fórum ou de versão antiga estão marcados **(fórum)** ou **(versão antiga)**.
- O que não apareceu em nenhuma fonte está marcado **(não verificado)**.
- Antes de virar spec, convém abrir as fontes oficiais listadas ao final.

Legenda: MVP = edifício residencial até ~10 pavimentos em concreto armado, lajes maciças e treliçadas, vento NBR 6123; V2 e V3 = versões seguintes.

---

### A. Organização da obra

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Pavimentos e grupos iguais | Tabela de grupos: um grupo reúne pavimentos idênticos lançados uma vez só. Recomenda agrupar 3–4 e limita a 5 consecutivos; ao juntar grupos, pergunta de qual grupo manter vigas e cargas. | **TQS:** pavimento-tipo com número de repetições nos dados globais do edifício. **Eberick:** pavimentos individuais com cópia do croqui para outros pavimentos; repetição nativa (não verificado). | Pavimento-tipo × N repetições, sem limite artificial. Editar o tipo propaga para as repetições. Opção "desvincular" um pavimento que difere, com um diff visual entre pavimentos (o que mudou). | MVP | Agrupar pavimentos com pé-direito diferente: permitir com aviso ou proibir? O CYPE avisa (fórum). |
| Cotas e pé-direito | Altura de cada pavimento = da face superior da laje até a face superior da laje de cima; a tela de edição mostra as cotas acumuladas. | **TQS:** pé-direito por piso nos dados do edifício. Memoriais trazem a tabela piso a piso + cota + área. **Eberick:** altura por pavimento (detalhe não verificado). | Tabela editável com pé-direito ↔ cota absoluta (editar um recalcula o outro) e corte esquemático lateral atualizado ao vivo. Entra no memorial. | MVP | Referência de cota = topo da laje acabada ou estrutural? Origem 0,00 no térreo? |
| Nível da fundação | Pilar tem "arranque" com vínculo externo (sapata/bloco) ou sem (sobre viga/laje/muro). Cota de fundação por pilar (não verificado). | **TQS:** "altura da fundação" no 1º lance do pilar. **Eberick:** pavimento baldrame + pavimento fundação; altura do baldrame = altura de arranque; comando para converter pilares em fundações. | Nível de fundação global com desvio por pilar (terreno em desnível), ligado ao módulo Fundações que já existe (cota de apoio por apoio). | MVP (global), V2 (por pilar) | Profundidade padrão abaixo do térreo (hoje há "cota de apoio 1,5 m" a confirmar nas sapatas). |
| Categorias de uso (NBR 6120) | Categoria de uso por grupo, escolhida numa lista definida nos dados gerais. Sobrecarga e carga permanente (revestimento) por grupo valem para todo o pavimento; o peso próprio é automático. | **TQS:** cargas globais (vento, desaprumo) nos dados do edifício; carga por laje no modelador. **Eberick 2024:** importa ambientes do IFC (recurso divulgado). | Biblioteca NBR 6120:2019 por ambiente. Padrão por pavimento e sobreposição por laje ou ambiente. Ambientes reconhecidos da máscara (texto da camada de ambientes) sugerem a carga, e o usuário confirma. | MVP (pavimento), V2 (ambiente) | Valores da NBR 6120:2019 (Tab. 10) a adotar; revestimento padrão (1,0 kN/m² citado em TCC); alvenaria como carga linear ou distribuída. |
| Copiar de outro grupo | Copia elementos selecionados para outro grupo, inclusive com simetria. Cópia do grupo inteiro por categorias confirmada só no CYPECAD MEP (no CYPECAD, não verificado). | **Eberick:** "copiar para" pavimentos marcados, o croqui inteiro ou só parte; copiar pilares para outros pavimentos. | Copiar com filtro por tipo e por seleção, escolhendo entre "cópia vinculada" e "cópia independente", com prévia de conflitos (sobreposição com o que já existe). | MVP | — |
| Pavimento de referência ("fantasma") | Vista 3D com liga/desliga por planta desde a 2017.i. Vista 2D do pavimento inferior esmaecido (não verificado). | **TQS:** "referências 3D da planta" e camadas sobrepostas no modelador. **Eberick:** não verificado. | Pavimentos abaixo e acima esmaecidos, com captura opcional (pilares que chegam de baixo são captáveis). Destaque automático de pilar que nasce ou morre e de viga sem apoio embaixo. | MVP | — |
| Assistente de nova obra | O lançamento automático pede a composição: subsolos, térreo, tipos, cobertura, casa de máquinas, torre, com alturas e cargas; só térreo e cobertura obrigatórios (notas da versão 2005.1). | **TQS:** janela de dados do edifício (norma, modelo, pavimentos, materiais, cobrimentos, vento). | Assistente com o modelo "residencial" (térreo, tipo × N, cobertura, barrilete, caixa d'água), já com as premissas visíveis (fck, CAA, vento), que vão para o memorial. | MVP | Lista padrão de pavimentos de um residencial típico. |
| Vista 3D sincronizada | Vista 3D com grupos Projeto (por planta) e Elementos (por tipo). | **TQS** e **Eberick** têm 3D (detalhe não levantado). | 3D leve (wireframe e sólido), com seleção sincronizada com a planta e a tabela. | V2 | — |

### B. Máscaras e referências (prioridade máxima)

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Formatos | Gerenciador de vistas aceita DXF, DWG, DWF, imagens e PDF (escolhe a página no multipágina). A 2025.c lê até AutoCAD 2025. | **Eberick:** DWG/DXF como referência externa por pavimento; recomenda um arquivo por pavimento, perto da origem e limpo. **TQS:** DWG precisa ser convertido para o formato próprio; IFC/RTQ cria referências já posicionadas. | DXF lido nativamente no navegador (parser JS, sem conversão). PDF vetorial via pdf.js (extração de caminhos). Imagem com calibração. DWG por conversão em WASM. | DXF MVP; imagem MVP; PDF V2; DWG V3 | Aceitável exigir DXF no MVP (DWG → DXF no CAD do usuário)? |
| Escala e unidades | Escala por dois pontos de distância conhecida, útil em imagem sem escala. | **TQS:** pede para acertar a escala após inserir; unidades em cm. **Eberick:** não verificado. | Unidade lida do cabeçalho do DXF + heurística (largura típica de porta ~0,8 m) com sugestão. Calibração por 2 pontos e régua de conferência ("esta parede mede X m"). | MVP | — |
| Origem, rotação e recorte | Muda a origem, gira, escala e recorta a área visível. Um arquivo com vários pavimentos é importado várias vezes, recortado e amarrado num ponto comum (poço do elevador, pilar). | **Eberick:** origem comum em todas as plantas para não desalinhar (artigo do suporte). **TQS:** mesma origem e unidades da planta de fôrmas. | Alinhamento por 2 pares de pontos (translação + rotação + escala num passo). Recorte por janela para DXF multiplanta. Ponto de amarração do edifício com checagem de desalinhamento entre pavimentos (sobreposição + alerta). | MVP | — |
| Camadas | Por camada: visível, renomear, cor, espessura e "capturável". Opção de esmaecer a máscara. | **TQS:** colunas "visível" e "atual" por referência. **Eberick:** mapeamento de camadas não verificado. | Painel de camadas por máscara e por pavimento (visível, capturável, cor, opacidade). Predefinições ("só paredes + pilares") salvas na biblioteca e reaplicáveis a outros pavimentos. | MVP | — |
| Várias máscaras por pavimento | Várias vistas por grupo; uma tecla liga/desliga todas. | **TQS:** várias referências, uma "atual". | N máscaras por pavimento (arquitetura, hidráulica, elétrica) com opacidade e atalho de alternância. | MVP (2 máscaras), V2 | — |
| Revisão da arquitetura | Atualiza o arquivo de uma vista quando ele muda. | Não verificado. | Recarregar mantendo a transformação, com diff de revisão (linhas novas e removidas destacadas) e lista dos elementos estruturais afetados (pilar caiu numa porta, viga cruza janela nova). | V2 | — |
| Capturas (tipos) | Na máscara: ponto, aresta, ponto de inserção, centro, perpendicular, paralelo, mais meio, interseção, quadrante, próximo e prolongamento como rastreamento. Nos elementos: extremo, meio, perpendicular, próximo, interseção, interseção fictícia, mais prolongamento, perpendicular e ortogonal como rastreamento. Uma tecla liga/desliga todas. (As fontes divergem sobre o que é captura direta e o que é rastreamento.) | **TQS:** captura dinâmica no vértice da arquitetura; tecla que cicla o ponto de inserção do pilar e a face da viga. **Eberick:** não verificado. | Conjunto completo (extremo, meio, interseção, perpendicular, próximo, centro, quadrante, prolongamento, rastreamento por alinhamento, ortogonal, polar com incremento), com marcador e rótulo do tipo no cursor e Tab para ciclar os candidatos sob o cursor. | MVP (núcleo), V2 (polar e rastreamento) | Incremento polar padrão (15°? 45°?). |
| Prioridade entre capturas | Ajuste a eixo ou face de pilar só funciona com a captura de máscara desligada (manual citado em busca). | Não verificado. | Prioridade fixa e documentada: elemento estrutural > máscara > grade, configurável. Nunca exigir desligar capturas para ajustar a um pilar. | MVP | — |
| Eixos, malha e cotas | Linhas de referência de locação e cotas (detalhe não verificado). | Não verificado. | Eixos nomeados (A, B… / 1, 2…) gerados das fileiras de pilares, com cotas automáticas entre eixos (reaproveitar `dims.ts`) e grade com captura. | MVP (eixos manuais + cotas), V2 (eixos automáticos) | — |
| Coordenadas absolutas e relativas | Posição X,Y digitada em relação a um ponto de referência. | **TQS:** ponto de referência auxiliar + "relativo ao último ponto" com ΔX/ΔY. | Linha de comando com sintaxe de CAD (@dx,dy e @d<ângulo), distância digitada na direção do cursor e "relativo a elemento" (ex.: face do P3 + 15 cm). Unidades da interface (cm/m). | MVP | — |
| Lançamento automático por DXF | Módulo à parte, apresentado como processo "iniciador". O usuário define os pavimentos e escolhe as camadas de pilares, contorno externo e aberturas. Gera pilares (deduz o ponto fixo quando a seção muda entre pavimentos) e vigas de contorno com tipo e afastamento da linha (fachada ≠ borda estrutural). Não se combina com outros processos iniciais (versão antiga + página oficial). | **TQS:** sem comando automático encontrado; polilinha fechada vira pilar, uma a uma (sem seleção por janela). Alerta para poligonais abertas ou sobrepostas da arquitetura. **Eberick:** por DXF, não verificado. | Assistente reexecutável a qualquer momento (não só no início): mapear camadas → pilar (polilinha fechada/hachura), contorno, aberturas. Validar poligonais (abertas, duplicadas, minúsculas). Prévia com aceitar/rejeitar por elemento e relatório do que não foi reconhecido. | MVP-lite (pilares), V2 (vigas de contorno e aberturas) | — |
| Lançamento automático por IFC | O assistente IFC gera pavimentos, cargas, pilares, vigas de contorno e de aberturas, cargas lineares de paredes e máscaras por planta; o usuário escolhe os pilares e os tipos de laje que geram contornos. | **Eberick 2024:** cria o projeto a partir do IFC, importa ambientes, converte vigas e pilares em nativos (parcial), cria furos a partir de colisões. **TQS:** IFC/RTQ cria o edifício com referências por pavimento. | IFC via web-ifc (WASM): cria pavimentos pelos IfcBuildingStorey e máscaras 2D por corte, com paredes como carga linear sugerida. | V2 | — |
| Recurso de IA | Não tem (o automático é por regras e camadas). | **Eberick** e **TQS:** não encontrado. | (a) classificar camadas por nome e geometria; (b) sugerir posição de pilares e vigas (a pesquisa recente usa visão computacional e RL para isso), sempre como proposta revisável e justificada; (c) checagens: pilar em vão de porta, viga sobre janela, vão excessivo; (d) ler PDF raster. Nada é aplicado em silêncio. | V2 (a, c), V3 (b, d) | Pode usar IA externa? O app roda 100% no navegador; no artifact do claude.ai haveria a capability de perguntar ao Claude. |

### C. Pilares

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Inserir (ponto, coordenada, captura) | Clique, X,Y em relação a um ponto de referência, ou captura na máscara ou nas linhas de locação. | **TQS:** captura no vértice da arquitetura; polilinha fechada do desenho vira pilar (uma a uma). **Eberick:** não verificado. | Os três modos + "pilares das polilinhas da máscara" com seleção por janela em lote (o TQS não aceita janela), filtrando por camada e tamanho. | MVP | — |
| Ponto de ajuste | "Ponto fixo" (centro, meio das faces, cantos), comum a todos os pavimentos: a seção cresce ou diminui a partir dele. Segundo fórum, é definido na edição e não na inserção. Há um ajuste de pilar a face ou canto por captura. | **TQS:** uma tecla cicla o ponto de inserção entre vértices, meios de face e CG durante a inserção. | Separar dois conceitos explícitos: ponto de inserção (9 pontos, escolhidos na hora por tecla) e ponto fixo vertical (editável a qualquer momento), com prévia de como os lances acima crescem. | MVP | — |
| Ângulo | Ângulo em planta. Segundo fórum, gira em torno do ponto fixo, o que confunde. | **TQS:** ângulo anti-horário em torno do ponto de inserção (seções retangular, L, U). | Ângulo numérico + "alinhar a uma linha da máscara" (captura de direção). Mostrar o centro de giro antes de girar. | MVP | — |
| Pavimento onde nasce e morre | Grupo inicial e final por listas, com tabela de seção por pavimento. O pilar precisa nascer e morrer em grupos diferentes. Arranque com vínculo externo (sapata/bloco) ou sem (viga, laje, muro). | **TQS:** aba de plantas/seções define onde nasce, muda de seção e morre; nasce em fundação, viga ou outro pilar, desde que haja interseção física em planta. **Eberick:** lançado por pavimento, com cópia para outros. | Pilar como objeto vertical único, com tabela de lances (pavimento, seção, ponto fixo, material). Nascimento e morte editáveis; tipo de apoio no arranque detectado e mostrado. | MVP | — |
| Pilar nascendo em viga (transição) | Arranque sem vínculo externo. Recomenda engaste parcial 0,1–0,3 do pé do pilar na viga. Aviso de consolo curto perto do apoio. Fórum: centralizar o pilar na viga para evitar torção. | **Eberick:** viga de transição lançada no pavimento que recebe o pilar; aviso de pilar "nascendo no vazio"; pilar excêntrico à viga exige lançamento especial; desde 2023 o pilar pode nascer em laje maciça ou nervurada. **TQS:** exige interseção física; ponto de segmentação coerente (fonte terceira). | Detecção automática do apoio (pilar, viga, laje, vazio) pela posição, com transição marcada em cor. Avisos de excentricidade/torção na viga e de carga concentrada. Erro bloqueante para pilar no vazio. | MVP (detecção + avisos), V2 (pilar em laje) | Vínculo do pé do pilar na viga de transição: articulado ou engaste parcial (qual coeficiente)? |
| Copiar dados | Copiar todos os valores de outro pilar; comando de cópia. | Não verificado. | Conta-gotas de propriedades → aplicar à seleção, escolhendo quais campos e quais lances. | MVP | — |
| Quadro de pilares em tabela | Tabela de seções por pavimento dentro da edição do pilar. Quadro geral editável, não verificado. | **TQS:** editor de dados de pilares (detalhe não verificado). | Planilha editável (linhas = pilares, colunas = lances: seção, ponto fixo, ângulo), com colar do Excel, filtro e realce do pilar no desenho ao selecionar a linha. | MVP | — |
| Numeração automática | Comando de renumerar. No exemplo oficial, numera consecutivamente clicando nos pilares em ordem. | **TQS:** comando de renumerar no modelo. **Eberick:** não verificado. | Renumerar por ordem de leitura (tolerância de "mesma linha" configurável) ou por cliques, com prefixo. Nome estável entre pavimentos (mesmo pilar = mesmo nome) e lista de "de → para" antes de aplicar. | MVP | Convenção: P1 no canto superior esquerdo, linha a linha da esquerda para a direita? |
| Pilares-parede | Pilares-parede lançados no mesmo menu dos pilares: seção com um ou mais segmentos, discretizada em elementos finitos. | **TQS:** seções retangular, circular, L, U e poligonal (polilinha fechada); pilares-parede de seção qualquer no dimensionamento; V25 trouxe edição de faixas. **Eberick:** não verificado. | MVP: retangular com h/b > 5 identificado como pilar-parede, com aviso e verificação NBR 6118 própria. L, U e poligonal em V2 (reaproveitar `fiber.ts`/`columnGeneral.ts`). Casca/elementos finitos em V3. | MVP (aviso), V2, V3 | Modelo de pilar-parede no pórtico: barra única no CG ou lâminas discretizadas? Itens NBR 6118 aplicáveis. |

### D. Vigas

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Traçado por polilinha | Entrada simples ou contínua (cadeia de cliques, termina por menu). Com o módulo automático, captura um polígono/linha do DXF e atribui o tipo de viga. | **TQS:** a orientação início→fim define as faces esquerda e direita. | Polilinha contínua com quebra automática de trechos nos apoios (pilares e vigas cruzadas) e "viga a partir de linha/polilinha da máscara" incluída no MVP (no CYPE, só no módulo automático). | MVP | — |
| Alinhamento por face | Centro, esquerda ou direita da linha traçada. Faces ou eixos ajustáveis a eixos de pilares, extremos de vigas ou linhas do DXF, com afastamento. | **TQS:** uma tecla alterna face esquerda / eixo / face direita, já descontando o revestimento. | Igual, com revestimento por pavimento e indicação visual do lado da face durante o traçado. | MVP | Espessura padrão de revestimento/reboco a descontar. |
| Ajuste automático às faces dos pilares | Comando de ajuste viga ↔ face de pilar ou contorno da máscara. Manual sugere prolongar uma viga ajustada e usá-la de referência. | **Eberick:** aviso de viga apoiada fora da face do pilar + comandos de verificar alinhamento e alinhar elementos. | Ao traçar viga de borda, propor "alinhar face externa à face do pilar". Verificação contínua de desalinhamentos menores que a tolerância (ex.: 2 cm), com correção em lote e lista do que mudou. | MVP | Tolerância padrão de desalinhamento. |
| Vigas de borda | O automático gera vigas de contorno com afastamento da linha da fachada. | Não verificado. | Gerar vigas no contorno da laje/pavimento com afastamento (revestimento), tipo padrão e face externa alinhada aos pilares. | V2 | — |
| Invertidas, chatas e rebaixadas | Plana adota a espessura da laje. Invertida: face inferior alinhada à da laje, altura para cima. "Viga sob laje" com laje apoiada no topo. | **Eberick:** invertida = elevar a viga; cálculo automático da elevação em laje maciça; o pilar também precisa ser elevado. | Posição vertical como opção da viga (normal, invertida, semi-invertida, chata, desnível livre), com desnível calculado automaticamente da laje e ajuste automático do topo do pilar. | MVP | Viga chata: limites de largura/altura e verificação de punção junto ao pilar entram no MVP? |
| Inclinadas | Desníveis atribuídos a vigas. Fórum: precisa ser viga normal (não invertida). | **Eberick:** nós de apoio antes; restrito a dois pavimentos adjacentes; apoio intermediário em viga exige nível intermediário. **TQS:** tem doc de elementos inclinados (detalhe não verificado). | Cota própria nas extremidades i/j (relativa ao pavimento), sem criar nível intermediário; apoios intermediários detectados por interseção 3D. | V2 | MVP sem vigas inclinadas (escada/rampa à parte)? |
| Balanços | Procedimento específico não encontrado. | Não verificado. | Balanço detectado automaticamente (extremo sem apoio), com aviso quando engasta em viga sem rigidez à torção suficiente e verificação de flecha própria. | MVP | — |
| Prolongar / aparar | Prolonga o extremo ao longo do eixo (comprimento fixo ou até ponto). Aparar não verificado. | Não verificado. | Prolongar e aparar até um elemento (como no CAD) + "estender até o apoio mais próximo". | MVP | — |
| Dividir / unir | Dividir e unir vigas. "Unir alinhamentos" junta vãos consecutivos num só para a armadura contínua, sem mudar os esforços. | Não verificado. | Separar trecho de cálculo de "viga contínua" (nome V1, detalhamento). Unir e dividir a viga contínua sem mexer no modelo, com nomes atualizados. | MVP | — |
| Atribuir em lote | Aplica os dados da viga atual às selecionadas; pode pegar os dados de uma viga já lançada. | Não verificado. | Conta-gotas + seleção por filtro (ex.: todas as 14×40 do pavimento) + edição na tabela de vigas. | MVP | — |
| Vinculação nas extremidades | Coeficiente de engaste de 0 (articulado) a 1 nas faces; desconectar/conectar extremos. Fórum, em aço: chegando na alma = articulada, na mesa = 0,5. | Não verificado. | Rótula e engaste parcial por extremo (já existe ligação semirrígida em `element.ts`), com símbolo visível na planta e no memorial. | MVP | Padrão para viga apoiada em viga: engastada ou articulada? Coeficiente de engaste em pilar de extremidade? |
| Baldrames e vigas de fundação | Vigas de fundação, de travamento e centradoras (temário de curso; procedimento não verificado). | **Eberick:** pavimento baldrame com pilares de fundação lançados nele; comando para converter pilares em fundações; altura do baldrame = arranque. | Pavimento "baldrame" com vigas apoiadas nos pilares/blocos e viga de equilíbrio (centradora) ligada à sapata de divisa do módulo Fundações. | MVP (baldrame), V2 (equilíbrio) | Baldrame apoiado no solo (Winkler) ou só nos blocos? Carga de alvenaria do térreo no baldrame. |

---

### Fontes

**Não abriram** (WebFetch: DNS não resolvido; curl: proxy 403). Todas as fontes iniciais ficaram de fora:
- https://downloads2.cype.com/documenti_it/manuali/ccadmu05.pdf
- https://info.cype.com/en/product/cypecad-entering-the-structure/
- https://ecv.crp.ufv.br/wp-content/uploads/2017/08/131.pdf
- https://riut.utfpr.edu.br/jspui/bitstream/1/8390/1/CT_EPC_2015_2_07.pdf
- https://suporte.altoqi.com.br/hc/pt-br e https://docs.tqs.com.br/ (raízes)
- Multiplus/TOP Informática: nenhum material encontrado.

**Conteúdo obtido via resumos e trechos do buscador** (páginas citadas, não abertas):

CYPE (oficial):
- https://info.cype.com/en/product/cypecad-column-definition/
- https://info.cype.com/en/subject/cypecad-entering-columns/
- https://info.cype.com/en/product/cypecad-column-input/
- https://info.cype.com/es/tema/cypecad-introduccion-de-pilares-bim-de-arranques-y-de-pilares-con-el-arranque-sobre-otro/
- https://info.cype.com/es/novedad/nuevo-pilar-con-arranque-sobre-otro/
- https://info.cype.com/en/subject/cypecad-editing-drawings-and-groups/
- https://info.cype.com/en/new-feature/different-building-use-for-each-floor-group/
- https://info.cype.com/en/product/cypecad-general-data/
- https://info.cype.com/es/tema/cypecad-copiar-elementos-del-grupo/
- https://info.cype.com/es/tema/cypecad-mep-plantas-grupos/
- https://info.cype.com/en/subject/importing-dxf-dwg-pdf-and-jpg-files/
- https://info.cype.com/en/subject/importing-dxf-dwg-pdf-and-jpg-drawings/
- https://info.cype.com/en/new-feature/improved-management-of-dxf-and-dwg-templates/
- https://info.cype.com/en/product/general-interface-tools-in-cype-software/
- https://info.cype.com/en/subject/tools-to-assist-with-entering-elements/
- https://learning.cype.com/es/faq/como-se-introducen-plantillas-que-se-encuentran-en-un-mismo-fichero-dwg-o-dxf/
- https://info.cype.com/en/subject/automatic-entry/
- https://info.cype.com/es/novedad/introduccion-automatica-de-obras-nuevo-modulo/
- http://cypecad.cype.es/bim_ifc_dxf_dwg_cypecad.htm
- http://20051l.novedades.cype.es/novedades_C3D.htm (versão antiga)
- https://info.cype.com/en/subject/cypecad-adjustment-and-configuration-tools-in-the-beams-menu/
- https://info.cype.com/en/product/cypecad-options-in-the-beams-menu-in-the-beam-definition-tab/
- https://info.cype.com/en/subject/cypecad-beam-entry/
- https://info.cype.com/es/tema/cypecad-empotramiento-en-caras-de-vigas/
- https://info.cype.com/es/tema/cypecad-alineaciones-de-vigas/
- https://info.cype.com/en/new-feature/3d-view-of-the-structure/
- https://info.cype.com/en/new-features/2026-a-version/ , https://info.cype.com/en/new-features/2026-b-version/ , https://info.cype.com/en/new-features/2026-c-version/
- https://downloads2.cype.com/documentos_es/manuales/c3dejem01.pdf (exemplo prático)
- https://www.cype.net/documentos_es/manuales/ccadmc01.pdf (memória de cálculo)

CYPE (terceiros e fóruns):
- https://www.soloarquitectura.com/foros/threads/punto-fijo-de-una-columna.128673/
- https://www.soloarquitectura.com/foros/threads/pilares-exteriores-apeados-en-viga-de-canto.56775/
- https://www.soloarquitectura.com/foros/threads/articular-desconectar.98773/
- https://www.soloarquitectura.com/foros/threads/plantas-en-varios-niveles.3609/
- https://www.xyz-studio.com/wp-content/uploads/2018/10/Manual_CYPECAD.pdf
- https://academia.ingnova.es/recursos/apuntes_demo/Cypecad_hormigon.pdf

AltoQi Eberick:
- https://suporte.altoqi.com.br/hc/pt-br/articles/115001514973 (importar arquitetura)
- https://suporte.altoqi.com.br/hc/pt-br/articles/115001514893 (preparar arquitetura)
- https://suporte.altoqi.com.br/hc/pt-br/articles/115001534934 (origem da arquitetura)
- https://suporte.altoqi.com.br/hc/pt-br/articles/360003194274 (vigas de transição)
- https://suporte.altoqi.com.br/hc/pt-br/articles/360000149094 (pilar nascendo no vazio)
- https://suporte.altoqi.com.br/hc/pt-br/articles/13145832355479 (pilar nascendo em laje)
- https://suporte.altoqi.com.br/hc/pt-br/articles/115002275993-Como-lan%C3%A7ar-uma-viga-invertida
- https://suporte.altoqi.com.br/hc/pt-br/articles/360000721954 (vigas inclinadas)
- https://suporte.altoqi.com.br/hc/pt-br/articles/360000731734 (vigas inclinadas, apoios intermediários)
- https://suporte.altoqi.com.br/hc/pt-br/articles/360007183014 (viga fora da face do pilar)
- https://suporte.altoqi.com.br/hc/pt-br/articles/115001892834 (apoio inválido)
- https://suporte.altoqi.com.br/hc/pt-br/articles/360007457533-Como-lan%C3%A7ar-pilares-de-funda%C3%A7%C3%A3o
- https://suporte.altoqi.com.br/hc/pt-br/articles/360040783094 (arranque em fundações)
- https://www.altoqi.com.br/recursos/criacao-de-novo-projeto-a-partir-do-modelo-externo-ifc-e-importacao-dos-ambientes
- https://blog.altoqi.com.br/eberick-como-o-software-de-projeto-estrutural-evoluiu-em-duas-decadas

TQS:
- https://docs.tqs.com.br/Docs/Details?id=3134&language=pt-BR (definindo os elementos estruturais)
- https://docs.tqs.com.br/Docs/PrintAllReport/1991370857?language=pt-BR (dados do edifício)
- https://docs.tqs.com.br/Docs/Details?id=1737482652&language=pt-BR (modelador estrutural)
- https://docs.tqs.com.br/Docs/Details?id=3777&language=pt-br (pilares)
- https://docs.tqs.com.br/Docs/Details?id=3984&language=pt-br (teoria: nascer/morrer)
- https://docs.tqs.com.br/Docs/Details?id=3778&language=pt-BR (vigas)
- https://docs.tqs.com.br/Docs/Details?id=3691&language=pt-BR (pilares em cruzamento de vigas)
- https://docs.tqs.com.br/Docs/Details?id=27529441&language=ES-AR (editor de dados de pilares)
- https://docs.tqs.com.br/Docs/Details?id=1711244522&language=pt-BR (armaduras, pilar-parede)
- https://www.tqs.com.br/v25/
- https://www.masteremmodelagem.com.br/post/viga-de-transi%C3%A7%C3%A3o-como-modelar-pilares-apoiados-em-vigas-com-seguran%C3%A7a (terceiro)

TCCs e pesquisa:
- https://ecv.crp.ufv.br/wp-content/uploads/2020/06/Otavio-Leonardo-Mesquita.pdf (CYPECAD × Eberick × TQS; resumo apenas)
- https://repositorio.ufpe.br/bitstream/123456789/40481/1/MACEDO%2c%20Jos%c3%a9%20Eloim%20Silva%20de%20%281%29.pdf (10 pavimentos, Eberick × CYPECAD)
- https://www2.fag.edu.br/coopex/arquivos/producao/15117004075a1ab7b7ba7dd.pdf (Eberick × CYPECAD, residencial)
- https://arxiv.org/pdf/2608.17237 (detecção de componentes estruturais em plantas; IA)
- https://soffeh.sbu.ac.ir/article_106785_8547be9926722221e91f0e83aa4510d8.pdf (planta → BIM com sugestão de pilares)

---

## Módulo Edifícios — inventário E–I (lajes, outros elementos, cargas, edição, vistas)

Pesquisa de comportamento observável (reconstrução limpa). Nada de texto, layout ou nome de comando dos programas foi copiado; descrições resumidas.

**Como ler.** "(não verificado)" = não confirmado em fonte nesta pesquisa (vem de conhecimento geral ou é inferência). Restrição de acesso: nesta sessão o WebFetch falhou para todos os domínios (DNS) e o curl recebeu 403 do proxy. Nenhuma página foi aberta diretamente; o conteúdo atribuído às fontes vem dos trechos que o buscador extraiu de cada URL (lista no fim). Antes de implementar, vale reabrir as fontes marcadas com * numa sessão com rede.

MVP-alvo: residencial até ~10 pavimentos, concreto armado, lajes maciças e treliçadas, vento NBR 6123.

---

### E. Lajes

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Detecção de panos fechados | Pano = recinto fechado por vigas ou muros; uma marca em X indica recinto apto a receber laje; o usuário atribui o tipo ao recinto. | Eberick: clica-se dentro do contorno fechado por vigas; mensagem de erro se uma viga "não enxerga" a outra em que deveria apoiar; desde 2023 o contorno aceita pilar+viga. TQS: contornos detectados automaticamente pelas faces de vigas e pilares (mais linhas de fechamento de bordo), também marcados com X. | Detecção contínua por faces de grafo planar (algoritmo abaixo); panos candidatos sombreados ao vivo; clicar um pano ou "preencher todos" com o tipo padrão do pavimento; propriedades preservadas após edição (casamento por sobreposição de área). | MVP | Contorno pelo **eixo** das vigas (modelo) ou pela **face** (área de carga/desenho)? Proposta: eixo no modelo, face no desenho. |
| Pano que deixa de fechar após edição | (não verificado) | TQS: laje fica em vermelho e a verificação acusa laje sem contorno. Eberick: erro ao lançar/processar. | Laje "órfã" fica tracejada em vermelho, com sugestão automática: fechar o vão com borda livre, estender a viga até o apoio ou ajustar o snap. | MVP | — |
| Borda livre e balanço | (não verificado) | TQS: borda que não apoia em viga/pilar é livre; fecha-se o contorno com linha de fechamento sem rigidez. Eberick: aviso de bordo livre entre lajes contíguas sem viga; treliçada em balanço não engasta (dica de usuário). | Elemento "borda livre" (linha sem rigidez) para fechar o contorno; balanço de maciça engastado na laje vizinha; balanço de treliçada gera alerta e pede maciçamento ou laje maciça. | MVP | Balanço de treliçada: erro (bloqueia) ou aviso? |
| Maciça | Modelo de elementos finitos integrado à estrutura 3D (manual antigo cita malha de no máx. 25 cm). | Eberick e TQS: analogia de grelha (barras de laje) integrada ao pórtico/grelha. Eberick, num projeto da UFRJ: faixas de 50 cm, mín. 4 por direção, torção reduzida em 40%. | Grelha por pavimento com malha automática alinhada às vigas e aos furos, com espaçamento e redutor de torção editáveis e malha visível; V2: placa por MEF para comparar. | MVP | Modelo do pavimento: grelha (proposta MVP) × MEF; espaçamento (50 cm?) e redutor de torção. |
| Treliçada / vigotas com EPS | Laje de vigotas lançada pela geometria ou pela ficha do fabricante (rigidez total e fissurada, momentos último e de fissuração). Peso por m² × intereixo vira carga linear em cada vigota. | Eberick: treliçada 1D/2D e painel com enchimento; nervuras transversais opcionais redistribuem os picos; análise integrada à grelha 3D. TQS: grelha; as nervuras são inferidas da posição dos blocos de enchimento; vigotas justapostas viram uma barra equivalente. | Tipo "treliçada" com catálogo editável (altura do enchimento + capa, intereixo, bw, EPS ou cerâmica); barras T no eixo real de cada vigota + transversais opcionais; vigotas desenhadas em planta; quantitativo de vigotas e EPS; aviso se o vão passar do limite do catálogo. | MVP | Catálogo inicial (alturas, intereixos, capa 4 cm?), peso do EPS, rigidez à torção nula ou reduzida, critério 1D×2D. |
| Direção das nervuras/vigotas | Vigotas definidas no pano; pode-se forçar a posição de passagem de uma vigota (p. ex. para desviar de um shaft). | TQS: patamar/laje pede ponto e direção principal. Eberick: (não verificado). | Padrão = menor vão do pano; seta no desenho; girar 90° com um clique; opção de alinhar a um lado escolhido; "deslocar vigota" para desviar de furo. | MVP | Regra padrão "menor vão". |
| Nervurada moldada no local | Reticular com zonas maciças geradas automaticamente sobre pilares (mesma altura, saliência inferior opcional), ajustadas ao módulo das formas. | Eberick: módulo de nervuradas (EPS, cerâmico, cubetas). TQS: grelha de nervuras; nos capitéis, a inércia segue critérios próprios. | Grelha de nervuras reais; zona maciça automática ao redor dos pilares, arredondada ao módulo da forma; editável. | V2 | — |
| Lisa / cogumelo (ábaco, capitel) | Zonas maciças de pilar automáticas; capitel em maciça só por artifício (fórum, não oficial). | Eberick: módulo de lajes planas; capitel como propriedade do pilar; erro se o capitel for mais fino que a laje; exige ligar a verificação de punção; nervurada sem viga exige capitel. TQS: capitéis com inércia por critério. | Capitel/ábaco como propriedade do pilar (dimensões e espessura); punção NBR 6118 automática; espessuras mínimas de 13.2.4.1 verificadas no lançamento. | V3 | Itens da NBR 6118 citados (numeração 2014 × 2023). |
| Alveolar protendida | Faz parte dos unidirecionais (cursos citam alveolares). | Eberick: tipo alveolar disponível. TQS: (não verificado). | Biapoiada, catálogo do fabricante (vão × carga), reações nas vigas; sem continuidade. | V3 | — |
| Aberturas / furos | Para vazios grandes, apaga-se o pano; para furos pequenos, força-se a passagem da vigota. | TQS: furos poligonais na laje. Eberick: (não verificado). | Furo poligonal dentro do pano (remove barras da grelha, gera borda livre); "shaft" propagado a vários pavimentos de uma vez. | MVP | — |
| Rebaixos / desníveis | Desnível ± em cm por pano; afeta desenho e armadura, mas no cálculo todas as lajes do pavimento ficam na mesma cota. | (não verificado) | Desnível por pano; acima de um limite, a continuidade é interrompida (borda engastada → apoiada) e o desnível aparece na forma, com cota. | MVP (atributo) / V2 (efeito no cálculo) | Limite de desnível que interrompe a continuidade (p. ex. > h da laje?). |
| Lajes inclinadas / rampas | Cursos citam lajes inclinadas e desníveis num pavimento; recomenda-se verificar a geometria de todos os grupos quando há elementos inclinados. | TQS: aba própria de elementos inclinados; contorno não fechado em rampa gera mensagem. Eberick: barras inclinadas geradas automaticamente (escadas). | Pano inclinado definido por cotas nos vértices; vigas inclinadas seguem as cotas automaticamente. | V2 | — |

**Algoritmo proposto para detecção de panos.** (1) Coletar segmentos dos eixos de vigas, paredes e bordas livres do pavimento; pilares entram como nós (o eixo da viga passa pelo centro do pilar ou é estendido até ele). (2) Snap: fundir vértices a menos de tol = 5 mm (editável) e projetar extremidades "quase em cima" de outro segmento (distância < tol) sobre ele. (3) Arranjo: dividir todos os segmentos nas interseções; para a escala de um pavimento (centenas de segmentos), O(n²) com teste rápido de caixas basta; Bentley–Ottmann só se necessário. Usar predicados geométricos robustos (orientação com tolerância relativa). Fundir segmentos colineares sobrepostos. (4) Montar half-edges (DCEL): cada aresta vira duas semiarestas opostas; em cada vértice, ordenar as semiarestas de saída por ângulo. (5) Percurso: next(h) = a semiaresta que sai do destino de h e vem logo depois de twin(h) no sentido horário ("vira sempre à esquerda"); cada ciclo é uma face. (6) Classificar pela área com sinal: área > 0 é face limitada (pano candidato); em cada componente conexa, a única face com área < 0 é a externa e é descartada. (7) Furos e ilhas: componentes não conectadas dentro de uma face (pilar isolado, contorno de shaft) são aninhadas por ponto-em-polígono e viram furos. (8) Arestas pendentes (vigas em balanço, apoio faltando) aparecem duas vezes no mesmo ciclo: removê-las da face e marcá-las como "aresta solta", alimentando a verificação de lançamento. (9) Filtros: descartar faces com área < 0,05 m² ou muito alongadas (largura mínima < 10 cm) como lascas, que indicam erro de snap a reportar. (10) Incremental: recalcular só a componente afetada pela edição e manter a identidade das lajes por sobreposição de área (IoU > 0,5) para não perder tipo, cargas e direção. Referências: de Berg et al., *Computational Geometry* (DCEL e sobreposição de subdivisões, cap. 2); Mount, CMSC 754, aulas 10 (DCEL) e 13 (arranjos); ETH Zürich, notas *Plane Graphs and the DCEL*; JTS/GEOS *Polygonizer* e CGAL *Arrangement_2* como implementações de referência (não verificado nesta sessão: JTS/GEOS e CGAL citados de memória); Shewchuk, predicados robustos (não verificado).

---

### F. Outros elementos

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Paredes de concreto / pilar-parede | Muros de concreto armado podem ou não receber empuxo; muros de alvenaria só recebem e transmitem cargas. | Eberick: paredes estruturais, com erros quando a parede não tem apoio no pavimento inferior; sugere mostrar a projeção do pavimento superior. TQS: (não verificado). | Pilar-parede como elemento de seção alongada, discretizado em barras com vigas rígidas de ligação (V2); MVP aceita só pilares comuns e alerta quando a seção vira pilar-parede. | V2 | Limite pilar × pilar-parede (NBR 6118) e modelo de discretização. |
| Contenção com empuxo | Vários estratos, nível d'água, cota do aterro, % de alívio por drenagem, peso aparente e submerso, atrito, sobrecarga; empuxo hidrostático abaixo do NA; diagrama de empuxo; tipos de empuxo reutilizáveis entre muros. | Eberick: empuxo calculado pelo coeficiente, peso específico, cota do solo e sentido (seta no croqui); dados de empuxo copiáveis entre paredes; parede de contenção pode atravessar vários pavimentos. | Parede de subsolo com perfil de solo vindo das **sondagens do módulo Fundações** (reuso); K0/Ka à escolha; NA e sobrecarga; diagrama visível e no memorial; lajes como apoios (diafragma). | V2 | Coeficiente padrão (K0 = 1 − sen φ' para parede travada pelas lajes?). |
| Escadas | Módulo próprio: modelo de elementos finitos isolado; as reações viram cargas lineares/superficiais médias nos apoios da estrutura; lances retos, com patamar de meia-volta ou de quarto de volta, e curvos em versões recentes. | Eberick: níveis intermediários, patamares e lances (definidos por 3 linhas); barras inclinadas geradas sozinhas; escada limitada a 2 pavimentos adjacentes; lance pode ficar só apoiado no patamar. TQS: lances e patamares são lajes com propriedades; um identificador liga a prumada; processo refinado (no pórtico) ou simplificado (isolado, cargas lançadas à mão). | MVP: assistente de escada (reta, L, U) por espelho/piso/largura que calcula as reações e **lança e atualiza sozinho** as cargas nas vigas de apoio (sem lançamento manual, como no processo simplificado do TQS); V2: lances no modelo global. | MVP (cargas) / V2 (modelo) | Lance engastado ou apoiado no patamar; carga variável de escada (NBR 6120). |
| Reservatórios | Módulo opcional de cortinas/reservatórios (enterrado, semienterrado, elevado), com empuxo de água e de solo; a água entra como um "nível d'água" interno. | Eberick: reservatórios elevados e enterrados (o enterrado como grelha 3D sobre molas); paredes entre no máx. 2 pavimentos; empuxo de água considerado. | MVP: assistente pelo volume/lâmina d'água que lança a carga no fundo e o peso das paredes nas vigas; V2: paredes com pressão hidrostática triangular e verificação de fissuração. | MVP (cargas) / V2 | Lâmina d'água máxima e γ da água (10 kN/m³). |

---

### G. Cargas

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Permanente e variável por pavimento/uso | Por piso: sobrecarga de uso, revestimento e paredes divisórias, todos uniformes no piso; peso próprio por nó (área de influência) ou por vigota (× intereixo). | Eberick: variável e revestimento definidos ao lançar a laje. TQS: cargas por laje (não verificado). | Biblioteca de usos da NBR 6120:2019 (Tab. 10) atribuída por pano; revestimento por camadas (espessura × γ); valores padrão do pavimento-tipo propagados; tudo editável e listado no memorial. | MVP | Valores da Tab. 10 a adotar (dormitório/sala 1,5; serviço 2,0; corredor e escada de uso comum 3,0?) e carga de divisórias sem posição definida (≥ 1,0 kN/m²?). |
| Pontuais, lineares, superficiais em região | Lineares, pontuais e superficiais em área limitada, além das gerais do piso; até 8 conjuntos de cargas especiais por origem. | TQS: concentradas, lineares (por metro ou por m² × pé-direito) e parciais em laje. Eberick: carga linear e "carga extra" (só kN/m). | Cada carga ligada a um caso de carregamento do Statikos (G, Q, W…, grupos excludentes já existentes); região por polígono livre ou por pano inteiro; carga sobre elemento ou "solta" (repartida para o que estiver embaixo). | MVP | — |
| Alvenaria a partir das paredes da máscara | Importa paredes de IFC e calcula a carga linear pelas dimensões e por um peso superficial composto por camadas. | Eberick: carga de parede pelo material, extensão e altura, opcionalmente pelas camadas de revestimento; sobre laje, barra ou viga. TQS: carga linear por m² × pé-direito; com pé-direito zero, usa o do pavimento menos a altura da viga/laje (opção de critério). | Ler a camada de paredes do DXF, achar pares de linhas paralelas (espessura), gerar eixos e carga = peso superficial × (pé-direito − h da viga ou da laje) × (1 − % aberturas); vai para a viga se o eixo coincidir (tolerância = meia largura), senão para a laje; parede sobre treliçada paralela à vigota gera alerta (nervura reforçada). | MVP | Peso por tipo de bloco + revestimento; altura (pé-direito − h viga); desconto de aberturas (padrão 0%?). |
| Empuxo de solo/água | Ver F (estratos, NA, alívio, diagrama). | Ver F (coeficiente, γ, cota, sentido). | Caso de carga próprio "E" com γf da NBR 8681; diagrama no memorial. | V2 | Classificação do empuxo (permanente × variável) nas combinações. |
| Vento NBR 6123: área de exposição | "Largura de banda" por piso = fachada perpendicular ao vento, informada pelo usuário; área = largura × semissoma das alturas dos pisos; zonas independentes recebem parcela proporcional à largura calculada pelos pilares extremos; força no CG de cada piso (TCC UFRJ). | TQS: Ca calculado automaticamente pela altura e pelas áreas das faces; distribuição por pavimento pelo critério geométrico. Eberick: V0, S1, S2, S3, q = 0,613 Vk², Fa = Ca·q·Ae; cita NBR 6123:2023. | Largura por pavimento **calculada** pela projeção do contorno do pavimento (panos + vigas) perpendicular a cada direção, editável e visível em planta; Ca pela fig. 4 (h/l1, l1/l2, turbulência); tabela por pavimento (z, S2, q, Ae, F) no memorial. | MVP | Edição da NBR 6123 (1988 × 2023; um catálogo indica cancelamento da 2023); turbulência padrão. |
| Vento: direções e excentricidade | No CTE, excentricidade de 5% gera 8 hipóteses (±X, ±Y, cada uma com ±e), automáticas (fórum). | TQS: até 24 casos em qualquer direção, combinados automaticamente; casos com excentricidade (item 6.6 da NBR 6123) automáticos desde a V22. Eberick: (não verificado). | 4 direções × (centrado, +e, −e), todos no grupo excludente "vento" já existente; momento torsor e·F aplicado no diafragma; opção de omitir as excentricidades quando não se aplicam. | MVP | ea = 0,075a (sem vizinhança) / 0,15a (com vizinhança), item 6.6 — confirmar na edição adotada. |
| Desaprumo / imperfeição global | (não verificado) | (não verificado) | Reusar θa já implementado no Statikos, aplicado por pavimento (força = θa × carga vertical do pavimento), com a regra dos 30% do vento. | MVP | — |
| Sismo NBR 15421 | Análise modal espectral (cada modo como caso) com correção do cortante basal pela NBR 15421:2006. | (não verificado) | Zona 0: nada; zona 1: 1% do peso permanente por pavimento; zonas 2–4: forças horizontais equivalentes e depois espectral, reusando a vibração livre já existente (`secondorder.ts`). | V3 | Edição 2023 (novo mapa, 6 classes de terreno A–F). |

---

### H. Edição e produtividade

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Seleção janela / cruzamento / filtro | (não verificado) | TQS: modificadores para "totalmente dentro", "com pontos dentro", "parcialmente dentro" e cerca poligonal; filtro de tipos vale para o próximo comando. Eberick: (não verificado). | Convenção CAD: arrastar da esquerda para a direita = janela, da direita para a esquerda = cruzamento; laço livre; chips de filtro por tipo; "selecionar semelhantes" (mesma seção, mesmo tipo de laje). | MVP | — |
| Copiar / mover / girar / espelhar | Introdução em modo simples ou contínuo; captura de pontos da máscara DXF. | TQS: mover, copiar e apagar por teclas de função, com ortogonal liga/desliga; área de transferência. Eberick: (não verificado). | Transformações com ponto-base, entrada numérica e cópia em série (matriz); espelhar renomeia (V1 → V1'); pilares mantêm a continuidade vertical. | MVP | — |
| Copiar entre pavimentos / pavimento-tipo | Grupos de plantas (pisos iguais = um grupo); copiar elementos selecionados para outro grupo. | Eberick: copiar o pavimento inteiro só para pavimentos vazios (os existentes são apagados); copiar croqui para vários pavimentos; colar renumera pilares. TQS: copiar entre pavimentos filtrando pilares; copiar planta só para planta vazia. | "Pavimento-tipo × N" (edição vale para todos, como os grupos); colar em vários pavimentos **com mescla** (sem apagar), mostrando conflitos; aviso de pilar que ficou sem continuidade. | MVP | — |
| Atribuir / copiar propriedades | (não verificado) | Eberick: copiar dados de um elemento para outros semelhantes. TQS: (não verificado). | Pincel de propriedades + edição em lote no painel (valores diferentes aparecem como "variado"). | MVP | — |
| Desfazer / refazer | Fazer/desfazer semelhante ao do CAD (manual antigo). | TQS: qualquer comando do modelador pode ser desfeito/refeito. Eberick: (não verificado). | Desfazer ilimitado na sessão + histórico persistido no `.statikos` (reusar `history.ts`). | MVP | — |
| Repetir último comando | (não verificado) | (não verificado) | Enter ou espaço repete o último comando, como em CAD. | MVP | — |
| Painel de propriedades e consulta | (não verificado) | (não verificado) | Painel lateral fixo; passar o mouse mostra um resumo (seção, cargas, apoios, erros) sem clicar. | MVP | — |
| Visibilidade por tipo | (não verificado) | Eberick: recomenda ativar a projeção do pavimento superior sobre o inferior para achar paredes/pilares sem apoio. TQS: parâmetros de visualização definem o desenho. | Camadas por tipo; pavimento de cima e de baixo em transparência (liga/desliga); máscara DXF com camadas próprias. | MVP | — |
| Renumeração | (não verificado) | Eberick: colar renumera pilares automaticamente. TQS: (não verificado). | Numeração automática estável (esquerda → direita, cima → baixo), bloqueável por elemento; renumerar só sob comando, mostrando antes e depois. | MVP | Convenção: P1… global; vigas V1… por pavimento ou V101…? |
| Máscara DXF/DWG | DXF/DWG como máscara por grupo; recomenda escala 1:1, blocos decompostos e sem referências externas; captura de pontos. | Eberick: arquitetura no croqui (não é copiada junto com o croqui). TQS: (não verificado). | DXF por pavimento com camadas ligáveis, snap aos vértices e reconhecimento de paredes (ver G); DWG via conversão em V2. | MVP (DXF) | — |
| Verificação: pano não fechado | Verificação de geometria do grupo atual, do atual com os superiores ou de todos, antes de calcular. | Eberick: erro quando a área da laje não pode ser delimitada; aviso de bordo livre entre lajes. TQS: laje sem contorno na verificação de consistência. | Linter **contínuo** (não só sob comando), com lista clicável e zoom; correção sugerida (snap, estender viga, criar borda livre). | MVP | — |
| Verificação: pilar sem apoio / nascendo no vazio | Pilares com vínculo externo encostando em vigas que não são de equilíbrio: provável erro de lançamento (fórum). | Eberick: aviso de pilar nascendo sem viga de apoio ou sobre laje; carga negativa em pilar indica pilar "pendurado". TQS: pilar que nasce e morre no mesmo pavimento não é aceito; erro de pilar nascendo em viga larga excêntrica (V22.4). | Classificar o início de cada pilar (fundação, viga de transição, laje) e destacar as transições em planta e em 3D; pilar pendurado = erro; transição sem viga com rigidez suficiente = aviso. | MVP | — |
| Verificação: viga sem apoio / solta | Erros de vigas (compressão diagonal etc.) aparecem só no dimensionamento. | Eberick: aviso de viga ou conjunto sem ligação com pilares/paredes; viga com apoio inválido; apoio fora da seção do pilar. TQS: vigas em balanço com cor diferente (v14); cruzamentos de vigas não definidos impedem o processamento. | Detectar componente de vigas sem caminho de carga até um pilar (grafo); vão em balanço destacado; apoio fora do pilar com folga mostrada em cm. | MVP | — |
| Verificação: viga sobre viga sem nó | (não verificado) | TQS: cruzamentos precisam estar definidos. | Toda interseção de eixos vira nó ou "cruzamento sem ligação" explícito; nenhum caso silencioso. | MVP | Padrão do cruzamento: viga apoiada × passante sem ligação. |
| Verificação: sobreposição | (não verificado) | TQS: sobreposição de pilares checada só na verificação de consistência (não durante a edição). | Checagem imediata na edição (pilar × pilar, viga duplicada, carga duplicada). | MVP | — |
| Verificação: geometria NBR | (não verificado) | Eberick: capitel mais fino que a laje; espessura mínima para punção. TQS: compatibilidade de etapas construtivas. | Avisos de espessuras mínimas (NBR 6118, 13.2.4.1), dimensões mínimas de pilar e viga, L/h excessivo, laje sem carga variável atribuída. | MVP | Itens da NBR 6118 (numeração 2014 × 2023). |
| Atalhos e linha de comando | (não verificado) | TQS: teclas de função para editar; ortogonal por tecla. | Paleta de comandos (Ctrl+K) com busca; atalhos de 1–2 letras remapeáveis; barra de coordenadas (absoluta, relativa, polar); ortogonal e snap por tecla; Esc cancela. | MVP | — |

---

### I. Vistas

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos (o que fazer melhor) | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| Planta de formas por pavimento | (não verificado) | TQS: salvar a vista do modelador gera o desenho de formas; um grupo de parâmetros controla o que aparece. | Forma gerada ao vivo pelo modelo, com cotas automáticas (reusar `dims.ts`), níveis e desníveis, e exportação DXF (`dxf.ts`) e SVG/PDF. | MVP | Convenções de representação (NBR 6492/7191) a adotar. |
| 3D com órbita e corte | Vista 3D da estrutura (não verificado quanto à interação). | TQS: visualização 3D do modelo, câmera perspectiva ou ortográfica; cortes dinâmicos e corte renderizado desde a V22. Eberick: visualizador 3D (não verificado). | WebGL com órbita, isolamento de pavimento, plano de corte arrastável; clicar no 3D seleciona no 2D e vice-versa. | MVP (órbita) / V2 (corte) | — |
| Cortes do edifício | (não verificado) | TQS: cortes dinâmicos no modelador. | Linha de corte desenhada em planta gera elevação 2D com níveis, cotas e elementos cortados. | V2 | — |
| Isovalores em lajes | Mapas de cores e isolinhas de deslocamento, esforços e armadura (cm²/m) por pano, em maciças, nervuradas e de fundação. | TQS: visualizador da grelha com modos planta, isovalores e espacial; a documentação avisa que as faixas de cor podem não passar pelo máximo e pelo mínimo. | Mapa contínuo com isolinhas; **máximo e mínimo reais marcados no ponto** (corrige a limitação apontada pelo TQS); escala de cores fixável entre pavimentos; consulta em hover. | MVP | — |
| Deformada | Deformada 3D animada; consulta do deslocamento sob o cursor (2020.e); também por envoltória. | TQS: visualizador do pórtico com modelos ELU e ELS. | Deformada 3D por caso/combinação, escala ajustável, animação, hover com valor; flecha diferida por pano. | MVP | — |
| Destaque de erros | (não verificado) | TQS: laje sem contorno em vermelho; elementos com erro "brilham" (V22.1). Eberick: (não verificado). | Marca no elemento em planta e em 3D + lista lateral (erro/aviso) com zoom ao clicar; contador na barra de status antes de calcular. | MVP | — |

---

### Fontes

Nenhuma URL foi aberta diretamente (WebFetch: DNS ENOTFOUND para todos os domínios, inclusive wikipedia.org; curl: 403 do proxy). O conteúdo abaixo foi lido nos trechos que o buscador extraiu das páginas. * = fonte principal a reabrir.

**Não abriram (tentativa direta):** https://downloads2.cype.com/documenti_it/manuali/ccadmu05.pdf *, https://downloads2.cype.com/formacion/Odiseos_CYPECAD_N0.pdf, https://info.cype.com/en/product/cypecad-entering-the-structure/ *, https://learning.cype.com/br/documentos/cypecad-user-manual/ *, https://cypecad.cype.es/, https://suporte.altoqi.com.br/hc/pt-br, https://docs.tqs.com.br/, https://en.wikipedia.org/wiki/Doubly_connected_edge_list.

**CYPECAD (via trechos do buscador):**
- https://www.cype.net/documentos_es/manuales/c3dejem01.pdf (recinto fechado com X) *
- https://www.cype.net/documentos_es/manuales/ccadmc01.pdf (vigotas nos panos; largura de banda do vento por planta; zonas independentes) *
- https://academiapfc.es/ayuda-estudiantes-arquitectura/curso-cypecad-gratis/
- https://www.soloarquitectura.com/foros/threads/error-de-encuentro-de-vigas-bajo-forjado.29350/
- https://coamalaga.es/wp-content/uploads/2022/04/Curso-CYPECAD-COA_.pdf
- https://www.topinformatica.pt/FAQs/C3D-opcoes-de-lajes.pdf (zonas maciças de pilares)
- https://www.topinformatica.pt/manuais/cypecad-memoria-de-calculo.pdf
- http://faq.cype.pt/descargas/faqcypecad.pdf (desnível de lajes; muros) *
- https://multiplus.com/software/cypecad/modulos-e-recursos/lajes/lajes-de-vigotas-pre-fabricadas.html
- https://multiprojeto.com.br/perguntas-frequentes/cypecad/lajes/lajes-pre-fabricadas/faq-cypecad-lau-01/
- https://multiplus.com/cypecad/manual_cypecad/memoria_02.pdf e https://multiplus.com/cypecad/Manual_cypecad/Memoria_03.pdf (cargas especiais; muros; isovalores)
- https://multiprojeto.com.br/perguntas-frequentes/cypecad/cortina-e-alvenaria/cortinas-e-reservatorios-por-elementos-finitos/faq-cypecad-muu-01/
- https://info.cype.com/en/new-feature/curved-staircases/ (escadas: modelo isolado e reações)
- https://info.cype.com/en/product/cypecad-seismic-analysis/
- https://info.cype.com/en/new-feature/consult-displacements-in-the-3d-view-of-the-deformed-shape/
- https://multiplus.com/software/cypecad/modulos-e-recursos/lajes/lajes-macicas-e-cogumelo.html
- https://info.cype.com/es/tema/cypecad-copiar-elementos-del-grupo/
- https://multiprojeto.com.br/perguntas-frequentes/cypecad/nucleo-basico/faq-cypecad-cycu-08/ (máscara DXF/DWG)
- https://info.cype.com/es/tema/cypecad-herramientas-adicionales-del-menu-calcular/ (verificação de geometria) *
- https://www.soloarquitectura.com/foros/threads/comprobacion-de-geometria-de-todos-los-grupos-grupo-actual.64229/
- https://forum.ecivilnet.com/about5462.html (pilares com vínculo externo encostando em vigas)
- https://www.soloarquitectura.com/foros/threads/hipotesis-viento.53098/ (8 hipóteses com excentricidade)
- https://pantheon.ufrj.br/bitstream/11422/9690/1/monopoli10007046.pdf (vento no CG do piso)

**Eberick (AltoQi):**
- https://suporte.altoqi.com.br/hc/pt-br/articles/17563686156951 (área de preenchimento / contorno) *
- https://suporte.altoqi.com.br/hc/pt-br/articles/360001918854 (bordo livre entre lajes)
- https://suporte.altoqi.com.br/hc/pt-br/articles/360000068033 (tipos de lajes) *
- https://suporte.altoqi.com.br/hc/pt-br/articles/360020659653 (nervuras transversais)
- https://www.altoqi.com.br/recursos/lajes-pre-moldadas-convencionais
- https://pantheon.ufrj.br/bitstream/11422/9658/1/monopoli10006857.pdf (grelha 50 cm, torção −40%)
- https://pdfcoffee.com/dicas-eberickdocx-3-pdf-free.html (treliçada em balanço)
- https://suporte.altoqi.com.br/hc/pt-br/articles/360016103453 (capitel) e https://suporte.altoqi.com.br/hc/pt-br/articles/360038256053 (punção)
- https://suporte.altoqi.com.br/hc/pt-br/novo-conhe%C3%A7a-a-atualiza%C3%A7%C3%A3o-2025-11-do-altoqi-eberick
- https://suporte.altoqi.com.br/hc/pt-br/articles/360000149094 (pilar nascendo no vazio), https://suporte.altoqi.com.br/hc/pt-br/articles/115001261833 (carga negativa em pilar), https://suporte.altoqi.com.br/hc/pt-br/articles/360007183014 (apoio sobre pilar), https://suporte.altoqi.com.br/hc/pt-br/articles/360002539793 (paredes sem apoio) *
- https://pdfcoffee.com/avisos-de-erros-eberick-v8-5-pdf-free.html (viga sem ligação; versão antiga)
- https://suporte.altoqi.com.br/hc/pt-br/articles/360050715753-Cadastro-de-cargas-t%C3%ADpicas-de-paredes-no-Eberick, https://suporte.altoqi.com.br/hc/pt-br/articles/360058309854 (carga linear)
- https://suporte.altoqi.com.br/hc/pt-br/articles/115003832594 (empuxo), https://suporte.altoqi.com.br/hc/pt-br/articles/21410400601239 (contenção e reservatório), https://www.altoqi.com.br/recursos/reservatorios-enterrados
- https://suporte.altoqi.com.br/hc/pt-br/articles/115001700534 e https://suporte.altoqi.com.br/hc/pt-br/articles/115002312454 (escadas), https://suporte.altoqi.com.br/hc/pt-br/articles/360000143334 (lance × patamar)
- https://suporte.altoqi.com.br/hc/pt-br/articles/115004593633 e https://suporte.altoqi.com.br/hc/pt-br/articles/115004624694 (vento) *
- https://suporte.altoqi.com.br/hc/pt-br/articles/115004217733, https://suporte.altoqi.com.br/hc/pt-br/articles/360012136193, https://suporte.altoqi.com.br/hc/pt-br/articles/360014260893, https://suporte.altoqi.com.br/hc/pt-br/articles/360004611893 (cópias entre pavimentos)

**TQS:**
- https://docs.tqs.com.br/Docs/PrintAllReport/3779?language=pt-BR e https://docs.tqs.com.br/Docs/Details?id=3779&language=pt-br (lajes: contornos, fechamento de bordo, laje sem contorno) *
- https://www.tqs.com.br/QSG/QSG.pdf (verificação de consistência; visualização 3D)
- https://www.tqs.com.br/v14/modelador.html (cores de vigas em balanço)
- https://docs.tqs.com.br/Docs/Details?id=3747&language=pt-BR (consistência: consolos, V22.1, V22.4)
- https://docs.tqs.com.br/Docs/Details?id=1896785571&language=pt-BR (pilar que nasce e morre no mesmo pavimento)
- https://docs.tqs.com.br/Docs/PrintAllReport/3713?language=pt-BR (vigotas justapostas)
- https://docs.tqs.com.br/Docs/Details?id=3149&language=pt-br, https://docs.tqs.com.br/Docs/Details?id=3715&language=pt-BR, https://docs.tqs.com.br/Docs/Details?id=3361&language=pt-BR (grelha, nervuradas, torção)
- https://docs.tqs.com.br/Docs/PrintAllReport/3782?language=pt-BR (cargas; pé-direito zero) *
- https://docs.tqs.com.br/Docs/Details?id=3801&language=pt-br, https://docs.tqs.com.br/Docs/Details?id=3807&language=pt-br, https://www.tqs.com.br/v12/escadas.htm (escadas)
- https://docs.tqs.com.br/Docs/Details?id=1124526938&language=pt-br (V22: vento com excentricidade), https://docs.tqs.com.br/Docs/Details?id=3669&language=pt-br, https://docs.tqs.com.br/Docs/PrintAllReport/2144750538?language=pt-BR (ações do vento) *
- https://docs.tqs.com.br/Docs/PrintAllReport/3927?language=pt-BR (edição: seleção, teclas), https://docs.tqs.com.br/Docs/PrintAllReport/1737482652?language=pt-BR (cópia entre pavimentos, filtro, desfazer)
- https://www.tqs.com.br/v22/ (3D, câmeras, cortes dinâmicos), https://docs.tqs.com.br/Docs/Details?id=3662&language=pt-BR (planta de formas)
- https://docs.tqs.com.br/Docs/Details?id=3900&language=ES-AR (visualizador de grelha), https://docs.tqs.com.br/Docs/Details?id=396712721&language=pt-br

**Comparativos, normas e algoritmos:**
- https://ecv.crp.ufv.br/wp-content/uploads/2020/06/Otavio-Leonardo-Mesquita.pdf (CYPECAD × Eberick × TQS × manual)
- https://rangellage.com.br/wp-content/uploads/2019/06/TCC_An%C3%A1lise-Comparativa-dimensionamento-softwares.pdf (TQS/Eberick por pórtico de barras × CYPECAD por MEF)
- https://repositorio.ufu.br/handle/123456789/29591 (lajes no Eberick × TQS)
- https://calculistadeaco.com.br/tabela-de-cargas-variaveis-nbr6120-19/ (NBR 6120:2019, fonte secundária)
- https://isqbrasil.com.br/nbr-6123-principais-alteracoes-na-revisao-da-norma/ (NBR 6123:2023)
- https://www.researchgate.net/publication/373874967_Aplicacao_dos_criterios_e_metodos_da_NBR_154212023_Projeto_de_estruturas_resistentes_a_sismos
- https://www.cs.umd.edu/class/spring2020/cmsc754/Lects/lect10-dcel.pdf e https://www.cs.umd.edu/class/fall2023/cmsc754/Lects/lect13-arrangement.pdf (DCEL, arranjos)
- https://ti.inf.ethz.ch/ew/courses/CG13/lecture/Chapter%204.pdf (grafos planos e DCEL)

---

## Seção J/K: módulo Edifícios (modelo analítico e saídas)

Pesquisa de 19/10/2026. Só comportamento observável, documentação pública e literatura. Texto resumido com minhas palavras.

**Limitação da coleta.** Nesta sessão o WebFetch falhou para todos os domínios (DNS), e o proxy recusou o download direto (403) de cype.com, docs.tqs.com.br, suporte.altoqi.com.br, repositórios universitários, scielo e scribd. Por isso o conteúdo abaixo veio dos resumos do WebSearch, que leem as páginas indexadas. Só abri diretamente dois arquivos do GitHub: o README do milamin-web e o `RigidFrame3D.tcl` do OpenSees. Usei esta legenda:
- **(busca, oficial)**: o fato aparece no resumo da busca, atribuído à página do fabricante.
- **(busca, secundária)**: o fato aparece num TCC, num artigo ou numa apostila.
- **(não verificado)**: conhecimento de livro-texto ou inferência minha, sem fonte aberta nesta pesquisa.

---

### J. Modelo analítico

#### J.1 Tabela comparativa

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| **Modelo global** | Análise espacial 3D por rigidez direta, com 6 GL por nó, incluindo pilares, paredes, vigas e lajes (busca, oficial). | **Eberick:** dois modelos. O "grelha + pórtico espacial" passa as reações das lajes às vigas de um pórtico só de vigas e pilares. O "integrado" junta as barras de todos os pavimentos num único modelo. A troca exige reprocessar (busca, oficial). **TQS:** Modelo IV usa uma grelha isolada por pavimento e um pórtico de vigas e pilares sem lajes. Modelo VI é um pórtico de vigas, pilares e lajes (busca, oficial). | **MVP:** modelo "IV/separado". A grelha de cada pavimento é resolvida isoladamente e suas reações carregam um pórtico espacial de 6 GL com diafragma. **V2:** modelo integrado por subestruturação, descrita em J.2.3. | MVP / V2 | Escolha do modelo padrão. |
| **Nós e discretização de vigas** | Nós nas faces dos apoios (pilares, paredes) e nos cruzamentos com lajes e outras vigas (busca, secundária: memória da Multiplus). | TQS e Eberick: nós nos cruzamentos viga-viga e viga-pilar (não verificado). | Um nó por cruzamento de eixos (viga-pilar e viga-viga). Cargas da grelha entram como cargas de barra, sem criar nós extras. | MVP | |
| **Ligação viga-pilar** | Cria "nós rígidos de dimensão finita" na interseção pilar-viga (busca, secundária). Tem coeficiente de engastamento editável nas faces das vigas e outro no último pavimento (busca, oficial). | **Eberick:** cria trechos rígidos automáticos na ligação. Oferece opção de nós semirrígidos; um TCC cita redução de 15 % (busca, oficial e secundária). **TQS:** "flexibilização" por molas nas extremidades das barras, com k = 4EI/L de uma faixa do pilar. Os parâmetros são mola viga-pilar (padrão 3, faixa de 3× a largura da viga) e redutor da mola (padrão 1), segundo a UFMG. A doc da TQS diz que a mola equivale ao offset rígido, sem criar nós (busca, oficial e secundária). | **MVP:** trecho rígido por *offset* de extremidade, com transformação exata na matriz do elemento, sem penalidade e sem GL novo. Por padrão vai até a face do pilar. **V2:** mola viga-pilar opcional (k = 4EI/L de uma faixa do pilar). O `element.ts` já soma 1/k à flexibilidade. | MVP / V2 | Comprimento do trecho rígido (face × face − 0,3h, Fig. 14.7 da NBR 6118). Valores padrão de mola viga-pilar e redutor da mola. |
| **Excentricidade viga-pilar** | Resolvida pelo nó de dimensão finita: a viga liga-se ao pilar na face, fora do eixo (busca, secundária). | TQS e Eberick: barras rígidas ou trechos rígidos automáticos (busca, oficial). | O *offset* é o vetor que liga o nó do pilar (centroide) ao ponto onde o eixo da viga cruza a seção. Uma viga de fachada alinhada pela face gera braço perpendicular e, com isso, torção no pilar. Pilar que muda de seção entre pavimentos usa o mesmo *offset*. A excentricidade vertical (eixo da viga abaixo do plano do piso) fica de fora no MVP, com tudo no plano do pavimento. | MVP | Ignorar a excentricidade vertical no MVP. |
| **Diafragma rígido** | Plano de cada piso indeformável, com 3 GL de corpo rígido por piso. Zonas independentes viram diafragmas separados. Desde a 2012.a, vigas sem contato com laje podem sair do diafragma e ficar com 6 GL por extremidade (busca, oficial). A implementação (mestre-escravo ou outra) não está documentada; o "3 GL por piso" sugere mestre-escravo (não verificado). | **TQS IV:** simula o diafragma aumentando a inércia lateral das vigas que apoiam lajes e, quando preciso, cria barras rígidas ligando pilares. Só há diafragma onde há laje. **TQS VI:** o diafragma vem da própria malha de lajes (busca, oficial). **Eberick:** o modelo separado "permite considerar as lajes como diafragma rígido"; o método não foi encontrado (busca, oficial). | **MVP:** restrição mestre-escravo por transformação (Tᵀ K T), com um nó mestre por zona contínua de laje. **V2:** desligar vigas sem laje e lidar com zonas independentes. A discussão numérica está em J.2.2. | MVP | Centro do nó mestre: centro de massa ou centroide da área. |
| **Lajes maciças** | Uma versão da memória fala em barras com malha de até 25 cm e diafragma mantido. Outra fala em elemento de lâmina espessa com deformação por cortante e condensação estática. As fontes divergem conforme a versão (busca, secundária). A página "Envolventes" informa malha a cada 25 cm (busca, oficial). | **Eberick:** grelha com "espaçamento das faixas" e "número mínimo de faixas" configuráveis; o padrão em cm não foi encontrado. Tem editor de grelha e plastificação de apoios (engaste parcial) (busca, oficial). **TQS:** grelha por pavimento. O modelo padrão inclui os pilares como apoios elásticos (4EI/L), considerando pavimentos acima e abaixo (busca, oficial). | **MVP:** analogia de grelha com espaçamento padrão de 50 cm, editável de 20 a 50 cm. Barras de largura igual ao espaçamento, com I = b·h³/12 e J = 2I × fator de fissuração (Hambly). Pilar como apoio elástico 4EI/L ou rígido. **V2:** MEF de placa (DKT ou MITC4) para lajes lisas. | MVP / V2 | Espaçamento padrão. Fator de torção das barras da grelha (literatura: J/I de 1,5 a 2,5). |
| **Lajes treliçadas (vigotas)** | Calculadas como unidirecionais e isostáticas. Fornece momento por metro, cortante na borda e armadura negativa. Redistribuição padrão de 25 % nas vigotas; coeficiente de engastamento de 0 a 1 nas bordas (padrão 1); negativo mínimo de 1/4 do positivo do vão (busca, secundária: Multiplus e FAQ CYPE). | Eberick: grelha que substitui cada nervura por uma barra de seção T (busca, secundária). TQS: lajes nervuradas e treliçadas na grelha, com critérios próprios (busca, oficial; detalhe não visto). | **MVP:** na grelha do pavimento, uma barra de seção T (capa + nervura) por nervura, no entre-eixo real, só na direção das vigotas. Torção ≈ 0. Capa transversal opcional com rigidez da capa. Bordas engastadas ou rotuladas com coeficiente de engastamento editável. | MVP | Engastamento padrão nas bordas contínuas. Rigidez transversal da capa. |
| **Nervuradas e lisas (cogumelo)** | Malha com 1/3 do entre-eixo das nervuras, inércia média nas zonas maciça e nervurada, torção considerada (busca, oficial). | TQS VI recomendado para lajes lisas. Num TCC do IFPI (2026), γz caiu de 1,60 (IV) para 1,21 (VI) em laje lisa; com vigas a diferença foi marginal (busca, secundária). | Fora do MVP. Em V2, entrar com o modelo integrado ou com MEF de placa. | V2 / V3 | |
| **Apoios na fundação** | Fundação "fixa" (sapata ou bloco, com engaste) ou "flutuante" (radier e viga de fundação em Winkler com coeficiente de balasto). Um módulo de interação solo-estrutura aceita rigidez por coeficiente de reação na sapata e rigidez axial por estaca (busca, oficial). | TQS: documentação sobre interação solo-estrutura e processo construtivo (busca, oficial; título apenas). Eberick: não encontrado. | **MVP:** engaste na base, com mola por apoio opcional (o `solver.ts` já tem molas). **V3:** molas calculadas a partir do módulo de fundações (estaca: rigidez carga/recalque). | MVP / V3 | |
| **Efeito construtivo** | "Coeficiente de rigidez axial" de pilares, pilares-parede e muros, com padrão 2. É editável por pilar e por piso desde a 2014.d (busca, oficial). | **TQS:** Um multiplicador axial aumenta a área axial dos pilares só para as ações verticais (não para o vento). O "Efeito Incremental" (v17) faz análise sequencial com datas de carga e E(t) e substitui esse multiplicador (busca, oficial). **Eberick:** não encontrado. | **MVP:** multiplicador de EA dos pilares aplicado só aos casos verticais (G e Q), padrão 2, escrito no memorial. **V3:** análise incremental por etapas. | MVP / V3 | Valor padrão (2 no CYPE; padrão do multiplicador axial não confirmado). Aplicar ou não ao vento. |
| **Redistribuição e momentos mínimos** | Redistribuição de negativos feita após o cálculo, nas faces dos apoios: até 30 %, padrão 15 % em vigas e 25 % em vigotas. Envoltória deslocada para momentos mínimos (pl²/x) antes da redistribuição (busca, secundária e FAQ oficial). | TQS: plastificação de vigas e de apoios de lajes (doc 3692). Eberick: plastificação de apoios de lajes (busca, oficial). | **V2:** δ editável por viga dentro dos limites da NBR 6118 (14.6.4.3, com verificação de x/d), padrão sem redistribuição. | V2 | Limites de δ e x/d (2014 × 2023). Padrão: 0 ou 15 %. |
| **Rigidez à torção de vigas** | Coeficientes de redução da rigidez à torção em "Opções gerais" (concreto; aço e madeira desde 2019.a) (busca, oficial). | **NBR 6118:** 15 % da rigidez elástica em grelhas e pórticos; no ELU pode ser nula, para eliminar a torção de compatibilidade. **Eberick V6:** redução de 0 a 95 % (busca, secundária). **TQS:** na grelha, viga sem torção por padrão (divisor 100) (busca, oficial). | **MVP:** 15 % por padrão no pórtico e na grelha. Opção 0 para o ELU, com aviso sobre 17.5.1.2. | MVP | Item da NBR: 14.6.6.2 (2014) ou 14.6.7.2 (2003). |
| **Rigidez para estabilidade** | Não pesquisado em detalhe. | TQS: pórticos ELU e ELS separados, com redutores diferentes (busca, oficial). | Reaproveitar a premissa já confirmada: 0,4·EI nas vigas e 0,8·EI nos pilares para γz e P-Δ. As lajes no modelo IV não entram. | MVP | |
| **2ª ordem com diafragma** | P-Δ, citado por TCC (busca, secundária). | Eberick: P-Δ. TQS: P-Δ, γz e FAVt (busca, secundária). | γz por direção de vento. P-Δ com matriz geométrica dos pilares transformada (Tᵀ Kg T). Opção "P-Δ de pavimento" linearizado nos GL do mestre (não iterativo, Wilson & Habibullah 1987). | MVP | |
| **Vento NBR 6123** | Não encontrado em detalhe. | Não verificado. | Força por pavimento aplicada no nó mestre, com excentricidade de torção da NBR 6123. | MVP | Excentricidades da NBR 6123 (0,075a e 0,15a) e item. |
| **Pilares-parede** | Discretizados por elementos finitos. Um TCC da UFRN achou armaduras bem menores que no cálculo manual, no TQS e no Eberick. Vigas ligam-se às paredes por uma viga de 25 cm de altura (busca, secundária). | TQS: "Pilar-Parede Discretizado" (busca, oficial). | **V3.** No MVP, pilar-parede como barra com trecho rígido largo. | V3 | |

#### J.2 Propostas técnicas

##### J.2.1 Grelha × MEF de placa
- **Grelha (MVP).** É a prática brasileira em Eberick e TQS e reaproveita o elemento de barra 3D. A NBR 6118 permite reduzir a torção na grelha. A literatura dá bons resultados com espaçamento de 15 a 30 cm e J/I de 1,5 a 2,5 (UnB). Nas lajes treliçadas, a nervura vira barra de forma natural. Limitações: sensível a J e à malha; picos perto de pilares e vazios (o Eberick tem editor para suavizá-los); não dá Mxy direto.
- **MEF de placa (V2).** Necessário para lajes lisas e cogumelo, com punção e faixas. Usaria DKT ou MITC4, com 3 GL por nó: o mesmo número da grelha, e portanto o mesmo porte.
- **Teste de convergência no CI.** Placa quadrada apoiada e engastada contra as tabelas de Timoshenko, refinando a malha (50, 25 e 12,5 cm). Ver "Casos de validação".

##### J.2.2 Diafragma: mestre-escravo × penalidade
**Mestre-escravo (recomendado).** Cada nó do piso mantém uz, θx e θy próprios. Os GL ux, uy e θz passam a depender do mestre (Ux, Uy, Rz):
- ux = Ux − (y − ym)·Rz
- uy = Uy + (x − xm)·Rz

A montagem fica Kₑ* = Tᵀ Kₑ T por elemento.

Prós:
- A restrição é exata e não piora o condicionamento.
- A matriz continua simétrica positiva definida, então o LDLᵀ sem pivotamento continua válido.
- A contagem de pivôs negativos (índice de inércia), usada pela flambagem no `BandLDL`, não muda.
- Cerca de 3 GL a menos por nó, ou seja, metade dos GL do pórtico.
- Lugar natural para o vento por pavimento, para a massa (m e Iθ no mestre) e para o P-Δ de pavimento.

Contras:
- O mestre acopla todos os nós do piso. Por isso a ordenação deve ser feita pavimento a pavimento, com o mestre ao fim do bloco do piso. A meia banda fica perto dos GL de um piso, cerca de 250 a 500.
- O RCM puro sobre o grafo com o mestre tende a começar mal, porque o mestre tem grau alto: tratar à parte.
- N nas vigas do diafragma sai nulo ou indeterminado, como no CYPE e no TQS. As vigas são dimensionadas sem N.
- Zonas independentes e vigas fora do diafragma exigem vários mestres por piso.

**Na 2ª ordem:** a matriz geométrica dos pilares também passa por T, e o código atual de `secondorder.ts` serve se a montagem passar por T.

**Penalidade (como a majoração de inércia lateral do TQS IV ou o RIGID = 10⁶ atual).** Prós: zero código novo. Contras:
- Mantém 6 GL por nó: cerca de 2× n e 2× a banda, logo cerca de 8× o custo.
- Perde cerca de 6 dígitos de precisão. Os deslocamentos entre pavimentos e os esforços nas barras penalizadas saem do arredondamento.
- A tolerância de pivô nulo do `BandLDL` (1e-11 × máx(diag)) cresce com a penalidade e pode mascarar mecanismos reais ou acusar falsos.
- Só enrijece onde há barra, e vãos sem viga exigem diagonais fictícias.

**Multiplicadores de Lagrange:** descartados. Tornam a matriz indefinida, o que quebra o LDLᵀ sem pivotamento e a contagem de Sturm.

##### J.2.3 Integração laje-pórtico (V2) por subestruturação
Para um "Modelo VI" sem solver esparso geral: condensar a grelha de cada pavimento (3 GL por nó) nos GL de fronteira, isto é, nós de pilar e vigas de borda mais o mestre, por complemento de Schur. Isso usa o mesmo `BandLDL` por pavimento, e os pavimentos-tipo iguais são condensados uma única vez. O pórtico global então recebe um superelemento por piso.

No P-Δ, só os pilares mudam, e os superelementos ficam fixos. Para vibração, as massas vão para o mestre (aproximação de Guyan aceitável para modos laterais). A memória do CYPE menciona "condensação estática", o que indica abordagem semelhante (não verificado).

##### J.2.4 Malha
- Espaçamento padrão de 50 cm, editável, com opção "fina" de 25 cm (o CYPE usa 25 cm; a literatura indica 15 a 30 cm).
- As linhas da malha passam obrigatoriamente pelos eixos das vigas, pelas faces dos pilares e pelas bordas e vazios. A malha é recortada pelo polígono da laje.
- Barras curtas (menos de 0,3 do espaçamento) são fundidas.
- O teste de convergência entra no CI.

##### J.2.5 Geração de excentricidades (do físico para o analítico)
1. Pilar: polígono no plano. O nó analítico fica no centroide de cada pavimento. Mudança de seção gera *offset* entre o topo de um lance e a base do outro.
2. Viga: eixo em planta e largura. Ao cruzar o polígono de um pilar, a extremidade ganha *offset* rígido do centroide do pilar até a face, ou até face − 0,3h [confirmar], seguindo o eixo da viga. Se o eixo não passa pelo centroide, o braço perpendicular fica no *offset*.
3. Viga sobre viga: nó na interseção dos eixos, sem *offset*.
4. Implementação: matriz de transformação do *offset* rígido (6×6 por extremidade) aplicada a Kₑ e às cargas de barra. Os esforços de cálculo saem na face, e o trecho rígido não é dimensionado (premissa atual).

##### J.2.6 Exemplos que devem ser reproduzidos
Ver "Casos de validação públicos". Prioridades:
- **Analíticos:** placa de Timoshenko; pórtico "shear building"; balanço 3D com torção.
- **Oráculo numérico:** OpenSees `RigidFrame3D.tcl`, que usa diafragma mestre-escravo, e modelos gerados pelo Statikos rodados no OpenSeesPy fora do `npm test`, guardando os números como fixtures.
- **Ordem de grandeza:** γz e quantitativos publicados em TCCs. Os modelos dos programas comerciais não são reproduzíveis exatamente.

---

### K. Saídas

| Item | CYPECAD (observável) | Eberick / TQS | Proposta Statikos | Prioridade | [confirmar] |
|---|---|---|---|---|---|
| **Planta de formas DXF** | Desenhos de obra são citados no material comercial; detalhes de DXF não encontrados (busca, oficial e genérica). | Ambos geram formas em CAD próprio, com exportação DXF/DWG (não verificado). | Estender o `dxf.ts` (R12, escala em metros) com camadas PILARES, VIGAS, LAJES, VAZIOS, TEXTOS, COTAS e EIXOS. Rótulos "V1 15×50", "P1 20×40", "L1 h=10" e nível. Cotas automáticas com o `dims.ts`. Uma folha por pavimento-tipo. | MVP | Camadas, penas e convenção de rótulos (NBR 6492/7191). |
| **Cargas na fundação** | Cargas por pilar e por combinação; fundação integrada ao modelo (busca, oficial). | Padrão Eberick/TQS já adotado: valores característicos por caso, envoltória rara (geotecnia) e ELU (elemento estrutural). | Reações de base por pilar, caso e combinação no mesmo formato de `piles.ts` e `foundation.ts`. Seção do pilar levada ao bloco. Tabela de cargas por pavimento por pilar (cargas acumuladas). | MVP | |
| **Quantitativo de concreto** | Não encontrado em detalhe. | Resumo por pavimento (não verificado). | Volume por tipo de elemento e por pavimento. Desconta interseções: pilar dentro da viga, viga dentro da laje. | MVP | Regra de desconto nas interseções. |
| **Fôrma** | Não encontrado. | Não verificado. | Viga: fundo + 2 laterais − espessura da laje. Laje: fundo, bordas livres. Pilar: perímetro × (pé-direito − altura da viga). Saída também em m²/m³ para conferência contra 9 a 12,6 m²/m³ (CBIC) e 11 a 12 m²/m³ (Botelho & Marchetti, UNIPAMPA). | MVP | Critério de desconto. |
| **Aço por taxa** | Aço detalhado real (fora do escopo de taxa). | Detalhamento real. | **MVP:** kg = taxa × volume, com taxas editáveis por elemento, marcadas "estimativa". **V2:** aço das armaduras calculadas (As × comprimento + ancoragens). | MVP / V2 | Taxas padrão (tabela abaixo). |
| **Memorial** | Memória por norma. | TQS e Eberick: relatórios de estabilidade (γz, FAVt), deslocamentos e cargas. | Novas seções na ordem TQS/ABECE: modelo (IV/separado), diafragma, malha, torção, multiplicador axial, rigidez reduzida, vento por pavimento, γz e P-Δ por direção, deslocamento no topo (H/1700) e entre pavimentos (hi/850), quantitativos. Toda premissa nova listada como "a confirmar". | MVP | Limites de deslocamento (13.3, Tabela 13.3). |

**Taxas de referência de aço publicadas (todas "a confirmar"):**

| Elemento | Faixa (kg/m³) | Fonte |
|---|---|---|
| Lajes | 60–90 | blog Intacta (fonte fraca). U. Porto: lajes vigadas 60–80. |
| Vigas | 80–110 | Intacta |
| Pilares | 100–160 | Intacta |
| Média da superestrutura | 70–120 | Intacta. UNIPAMPA/Jablonski: média de 67,7 kg/m³, 0,156 m³/m², 11,1 m²/m³ em 13 projetos. CBIC: 78–190 kg/m³ no pavimento-tipo (unidade a conferir). |

Sugestão: padrão de 70 kg/m³ para lajes, 100 para vigas e 130 para pilares, editáveis e com fonte citada no memorial [confirmar].

---

### Porte numérico

**Medida feita.** Rodei o algoritmo do `BandLDL` atual (cópia de `src/core/math.ts`) no Node 22, que usa o mesmo V8 do Chrome. A taxa ficou em **0,27 a 0,39 G multiplicação-soma/s**. O custo é de cerca de n·hb²/2 e a memória de n·(hb+1)·8 bytes.

| n | hb | Tempo | Memória |
|---|---|---|---|
| 8.700 | 130 | 0,27 s | 9 MB |
| 34.000 | 250 | 3,1 s | 68 MB |
| 7.300 | 500 | 2,9 s | 29 MB |
| 14.400 | 1.000 | 18,9 s | 115 MB |
| 30.000 | 600 | 13,9 s | 144 MB |

O laço pode ganhar cerca de 2 a 3× guardando L·D por linha (não verificado).

**Hipóteses do edifício:** 20 pavimentos, 40 pilares em malha 5×8 a cerca de 4,5 m, cerca de 600 m² por piso, cerca de 70 vãos de viga e cerca de 80 nós de pórtico por piso.

| Submodelo | GL | Meia banda | Custo estimado |
|---|---|---|---|
| Grelha de um pavimento, malha 50 cm (≈ 2.500 nós × 3) | ≈ 7.500 | ≈ 130 | ≈ 0,3 s. Pavimentos-tipo iguais: uma fatoração, vários RHS. |
| Grelha de um pavimento, malha 25 cm (≈ 9.800 nós × 3) | ≈ 29.000 | ≈ 250 | ≈ 3 s |
| Pórtico 20 pav., mestre-escravo (80 nós × 3 + 3 por piso) | ≈ 4.900 | 250–500 | ≈ 0,2 a 1 s; memória ≈ 20 MB |
| Pórtico 20 pav., penalidade (6 GL por nó) | ≈ 9.600 | 500–1.000 | ≈ 2 a 10 s |
| Integrado direto ("VI") 20 pav., malha 50 cm, em banda | ≈ 150.000 | ≈ 7.500 (um piso) | ≈ 4·10¹² operações: horas e cerca de 9 GB, **inviável** |
| Integrado por subestruturação (J.2.3) | Condensação: 1 grelha por tipo + ≈ 123 RHS; global ≈ 2.500 GL | ≈ 250 | segundos |

Conclusões:
1. **TS/JS dá conta** do MVP (até 10 pavimentos) e também de 20 pavimentos no modelo separado com mestre-escravo, em menos de cerca de 5 s. Rodar num Web Worker para não travar a interface.
2. **P-Δ por combinação refatora o pórtico.** Com 16 combinações ELU × 3 iterações × cerca de 1 s, são cerca de 50 s. Preferir γz como padrão e P-Δ de pavimento linearizado: uma fatoração por família de gravidade, não iterativo.
3. **Modelo integrado só por subestruturação**, ou por solver esparso com nested dissection/AMD. Benchmark público: o milamin-web roda CHOLMOD supernodal em WASM e diz resolver cerca de 10⁶ incógnitas por minuto num celular (alegação do autor; README aberto no GitHub). A licença é **GPL-2.0+** (exigida pelo CHOLMOD), o que impõe restrição de licença ao Statikos. Não achei benchmarks independentes de solvers esparsos em JS ou WASM.

---

### Casos de validação públicos

| # | Caso | O que fornece | URL |
|---|---|---|---|
| 1 | Placas de Timoshenko & Woinowsky-Krieger (livro) | Placa quadrada apoiada, carga uniforme: w = 0,00406·q·a⁴/D, M = 0,0479·q·a² (ν = 0,3). Engastada: w = 0,00126·q·a⁴/D, M centro = 0,0231·q·a², M borda = −0,0513·q·a². Valores de memória, a conferir na edição. Valida malha e J da grelha. | (livro; não aberto) |
| 2 | Analogia de grelha × MEF (UnB, RIPE) | Faixa de J/I (1,5 a 2,5) e espaçamento (15 a 30 cm) que coincidem com o MEF | https://periodicos.unb.br/index.php/ripe/article/download/46843/36273/148676 |
| 3 | Dissertação UFMG, analogia de grelha em lajes maciças | Efeito de malha, torção e apoios | https://repositorio.ufmg.br//bitstreams/fc82f4b0-23a7-4f4d-befa-fb76fcc2b3b3/download |
| 4 | OpenSees `RigidFrame3D.tcl` (aberto) | Pórtico 3D de 3 pavimentos com `rigidDiaphragm` e massa no nó mestre. Rodar no OpenSeesPy (pypi) para obter deslocamentos e períodos de referência. | https://raw.githubusercontent.com/OpenSees/OpenSees/master/EXAMPLES/ExampleScripts/RigidFrame3D.tcl |
| 5 | OpenSees, Exemplo 4 (Gu, Barbato, Conte): pórtico RC 3D de 3 pavimentos com diafragma | Geometria completa; resultados dinâmicos | https://opensees.berkeley.edu/wiki/index.php/Example_4:_3-D_RC_frame_subjected_to_earthquake_base_excitation |
| 6 | Moncayo (2011), EESC-USP | Edifício simétrico com vigas, pilares e lajes maciças; fck 25; g = 2,8 e q = 1,5 kN/m²; rigidez 0,8/0,4. Compara γz, FAVt e P-Δ do TQS. | https://producaocientifica.eesc.usp.br/producao/2011ME_WinstonJuniorZumaetaMoncayo.pdf |
| 7 | Feitosa & Alves (2015), RIEM v.8 n.2 p.196-224, estabilidade de edifícios altos com lajes protendidas (TQS) | γz e P-Δ em função de geometria, espessura de laje, fck e ligação laje-pilar | https://www.scielo.br/j/riem/a/tNqz5vCyfVKL97W9dcHjsNt/?format=pdf&lang=pt |
| 8 | CONTECC 2017: edifícios de 10, 20 e 30 pavimentos com vento NBR 6123 | γz,x ≈ 1,0, 1,103 e 1,25 (do resumo) | https://www.confea.org.br/sites/default/files/antigos/contecc2017/civil/28_adsoeedca.pdf |
| 9 | TCC IFPI (2026), TQS IV × VI | Laje lisa: γz 1,60 (IV) × 1,21 (VI). Com vigas: diferença marginal. Justifica o MVP no modelo IV. | https://bia.ifpi.edu.br/jspui/bitstream/123456789/5268/5/2026_TCC_epnfilho%20%283%29.pdf |
| 10 | TCC UFV (Mesquita, 2020): 7 pavimentos, manual × CYPECAD × Eberick × TQS | Cargas na fundação próximas entre todos; vento coerente; As maiores no Eberick e no TQS | https://ecv.crp.ufv.br/wp-content/uploads/2020/06/Otavio-Leonardo-Mesquita.pdf |
| 11 | TCC UFPE: 10 pavimentos, Eberick × CYPECAD | Aço 24.682 × 25.335 kg; concreto 353,2 × 336,13 m³ (ordem de grandeza dos quantitativos) | https://repositorio.ufpe.br/bitstream/123456789/40481/1/MACEDO%2c%20Jos%c3%a9%20Eloim%20Silva%20de%20%281%29.pdf |
| 12 | TCC UFG: Eberick V6 × CypeCad 2010, γz e P-Δ | γz analítico × programas | https://files.cercomp.ufg.br/weby/up/620/o/TCC_Maiza_Moana_Silva_Lcacerda.pdf |
| 13 | TQS Docs, "Efeito Incremental" | Pórtico plano de 20 pavimentos: sem o multiplicador axial, o negativo sobre o pilar central fica quase nulo. Caso qualitativo para o multiplicador axial. | https://docs.tqs.com.br/Docs/Details?id=3154&language=pt-BR |
| 14 | Huang et al. (2023), *Buildings* 13(2):376 | ETABS com 3, 6 e 12 pavimentos, diafragma rígido × flexível | https://doaj.org/article/5770fc8c59ee4a90bcfcb2406915d0c9 |
| 15 | UNIPAMPA (Jablonski): 13 projetos reais | Índices de concreto, fôrma e aço para conferir quantitativos | https://dspace.unipampa.edu.br/bitstream/riu/1660/1/%C3%8Dndices%20e%20taxas%20de%20consumo%20de%20materiais%20em%20fun%C3%A7%C3%A3o%20da%20tipologia%20estrutural.pdf |

Nenhum caso público achado traz, ao mesmo tempo, geometria completa, cargas e γz e deslocamento de um edifício brasileiro reproduzível. Os casos 6 e 7 são os mais próximos; conferir os PDFs. Recomendo montar um **edifício-exemplo próprio** (10 pavimentos, publicável no repositório) e validá-lo no OpenSeesPy (pórtico) e contra Timoshenko (grelha).

---

### Fontes

**Abertas diretamente:**
- https://raw.githubusercontent.com/dwschmid/milamin-web/main/README.md
- https://raw.githubusercontent.com/OpenSees/OpenSees/master/EXAMPLES/ExampleScripts/RigidFrame3D.tcl

**Lidas só por resumo de busca** (WebFetch falhou com DNS e o curl recebeu 403 em todas):
- **CYPE, oficial:**
  - https://info.cype.com/en/product/cypecad-general-features-of-cypecad/
  - https://info.cype.com/en/product/rigid-diaphragm-at-floor-level-in-cypecad/
  - https://info.cype.com/en/new-feature/elimination-of-the-rigid-diaphragm-assumption-of-walls-and-beams-not-connected-to-floor-slabs/
  - https://info.cype.com/en/product/cypecad-options-in-the-envelopes-menu-in-the-results-tab/
  - https://info.cype.com/en/subject/waffle-slabs/
  - https://info.cype.com/en/new-feature/edit-torsional-stiffness-reduction-coefficients-for-steel-and-timber-beams/
  - https://info.cype.com/en/new-feature/axial-stiffness-coefficients-for-columns-shear-walls-and-walls/
  - https://info.cype.com/en/new-feature/soil-structure-interaction-footings-and-pile-caps-cypecad-module/
  - http://faq.en.cype.com/metal3d/027.htm
  - https://www.cype.net/documents_en/manuals/ccadmu09.pdf
  - https://learning.cype.com/en/document-library/cypecad-calculations-manual/
- **CYPE, terceiros:**
  - https://multiplus.com/cypecad/manual_cypecad/memoria_01.pdf
  - https://multiplus.com/cypecad/Manual_cypecad/Memoria_03.pdf
  - https://www.topinformatica.pt/manuais/cypecad-memoria-de-calculo.pdf
  - http://faq.cype.pt/descargas/faqcypecad.pdf
  - https://multiplus.com/software/cypecad/modulos-e-recursos/lajes/lajes-de-vigotas-pre-fabricadas.html
- **AltoQi:**
  - https://suporte.altoqi.com.br/hc/pt-br/articles/360001391833
  - https://suporte.altoqi.com.br/hc/pt-br/articles/360002163594
  - https://suporte.altoqi.com.br/hc/pt-br/articles/115004786894
  - https://suporte.altoqi.com.br/hc/pt-br/articles/360005077814
  - https://suporte.altoqi.com.br/hc/pt-br/articles/13145832355479
  - https://suporte.altoqi.com.br/hc/pt-br/articles/360000302893
  - https://www.altoqi.com.br/recursos/analise-de-esforcos-e-deslocamentos
- **TQS:**
  - https://docs.tqs.com.br/Docs/Details?id=3150&language=pt-BR (pórtico espacial)
  - https://docs.tqs.com.br/Docs/Details?id=3328&language=pt-BR (modelo IV)
  - https://docs.tqs.com.br/Docs/Details?id=3154&language=pt-BR (efeito incremental)
  - https://www.tqs.com.br/v17/destaques/efeito-incremental.html
  - https://docs.tqs.com.br/Docs/Details?id=3876&language=pt-BR (barras e divisores)
  - https://docs.tqs.com.br/Docs/Details?id=3779&language=pt-br (lajes)
  - https://docs.tqs.com.br/Docs/Details?id=3692&language=pt-BR (plastificação)
  - https://docs.tqs.com.br/Docs/Details?id=3361&language=pt-BR (torção)
  - https://docs.tqs.com.br/Docs/PrintAllReport/3802
  - https://docs.tqs.com.br/Docs/PrintAllReport/3155?language=pt-BR (γz)
  - https://www.tqs.com.br/v13/Pdf/PdeltaTQS.pdf
- **Flexibilização:**
  - https://www.scielo.br/j/riem/a/zkJHP97znR4Hqf5wp4WQrWS/?lang=pt
  - https://repositorio.ufmg.br/server/api/core/bitstreams/72c99b32-fffa-4f3a-b230-3b8174c08dc7/content
- **NBR 6118 (secundárias):**
  - https://wwwp.feb.unesp.br/pbastos/concreto2/Vigas.pdf
  - https://professor.pucgoias.edu.br/SiteDocente/admin/arquivosUpload/3922/material/Alex%20Bandeira_Concreto%20(Apostila%20de%20Lajes%20e%20Vigas).pdf
  - https://revistas.uepg.br/index.php/ret/article/download/12002/209209210173/209209212633
- **Lajes e grelha:**
  - https://confea.org.br/midias/uploads-imce/contecc2016/civil/an%C3%A1lise%20de%20lajes%20maci%C3%A7as%20de%20concreto%20armado%20pela%20analogia%20de%20grelha.pdf
  - https://producaocientifica.eesc.usp.br/producao/1999ME_AlonsoDroppaJunior.pdf
  - https://repositorio.ufu.br/bitstream/123456789/29591/3/An%c3%a1liseComparativaLajes.pdf
- **Comparativos de programas:**
  - https://repositorio.ufpb.br/jspui/bitstream/123456789/35887/1/Compara%c3%a7%c3%a3o%20de%20programas%20computacionais%20de%20c%c3%a1lculo%20estrutural%20para%20dimensionamento%20de%20estruturas%20de%20concreto%20armado%20reticuladas.pdf
  - https://repositorio.utfpr.edu.br/jspui/handle/1/14346
  - https://repositorio.ufrn.br/items/3aba8070-030a-4efb-b7fe-476124cb6150 (pilares-parede)
- **Taxas:**
  - https://intactaengenharia.com.br/qual-a-media-de-taxa-de-aco-de-um-predio/
  - https://cbic.org.br/wp-content/uploads/2017/11/Manual_Basico_de_Indicadores_de_Produtividade_na_Construcao_Civil_2017.pdf
  - https://engucm.wordpress.com/wp-content/uploads/2016/03/lajes.pdf
- **Diafragma e numérica:**
  - https://help.seismosoft.com/seismostruct/2025/en/project_settings/constraints.htm
  - https://www.iitk.ac.in/nicee/wcee/article/WCEE2012_0239.pdf
  - https://communities.bentley.com/products/ram-staad/w/structural_analysis_and_design__wiki/6524/ram-frame-p-delta-tn
  - Wilson & Habibullah (1987), *Earthquake Spectra* 3(2), P-Δ de pavimento (não aberto; referência de memória).
- **Livros, não abertos:** Kimura (2007), *Informática aplicada em estruturas de concreto armado* (PINI); Hambly, *Bridge Deck Behaviour*; Timoshenko & Woinowsky-Krieger, *Theory of Plates and Shells*.

**Pedidas no briefing que não abriram:**
- https://downloads2.cype.com/documents_en/manuals/ccadmc09.pdf (DNS/403)
- https://ecv.crp.ufv.br/wp-content/uploads/2017/08/131.pdf (403; não identifiquei o título pela busca)
- https://riut.utfpr.edu.br/jspui/bitstream/1/8390/1/CT_EPC_2015_2_07.pdf (403; conteúdo não indexado)
- Repositório UFMG, docs.tqs.com.br e suporte.altoqi.com.br (403; só resumos de busca)

---

### [confirmar]: lista consolidada
1. Modelo padrão do MVP: separado/IV (grelha por pavimento + pórtico com diafragma).
2. Diafragma por mestre-escravo. Posição do mestre: centro de massa ou centroide.
3. Trecho rígido até a face ou até face − 0,3h (NBR 6118, 14.6.2.1/Fig. 14.7; número do item a conferir). Excentricidade vertical ignorada no MVP.
4. Itens da NBR 6118:2014 × 2023: ligação viga-pilar (14.6.6.1 em 2014? 14.6.7.1 em 2003); torção 15 % (14.6.6.2 em 2014?); redistribuição e x/d (14.6.4.3); analogia de grelha em 14.7 (item não identificado).
5. Malha padrão (50 cm, opção 25 cm) e fator J/I das barras da grelha (2 × fator de fissuração?).
6. Lajes treliçadas: engastamento padrão nas bordas contínuas, rigidez transversal da capa, negativo mínimo.
7. Multiplicador axial dos pilares: padrão 2 (CYPE), só para G e Q.
8. Torção 15 % no pórtico e na grelha; opção 0 no ELU.
9. Redistribuição: padrão 0 ou 15 %.
10. Vento por pavimento no mestre com excentricidades da NBR 6123.
11. Mola viga-pilar só em V2.
12. Quantitativos: regras de desconto e taxas padrão de aço (70/100/130 kg/m³).
13. Licença: o CHOLMOD em WASM é GPL. Se um dia for usado, verificar a compatibilidade com a licença do Statikos (o repositório não tem arquivo LICENSE).

---

## Seção L — IA e automação, interoperabilidade, dependências e licença

Pesquisa feita em 19/10/2026. O acesso direto a autodesk.com, bentley.com, gnu.org, modelcontextprotocol.io, llmstxt.org e opendesign.com foi bloqueado pelo proxy. Esses sites foram lidos por busca ou pelo código-fonte no GitHub (a seção 5 diz qual fonte foi usada em cada caso). Os tamanhos de bundle foram **medidos aqui**: esbuild com `--bundle --minify` e depois `gzip -9`, nas versões do npm de out/2026. São números de importação do pacote inteiro, salvo indicação. Não é aconselhamento jurídico.

---

### 1. Servidores MCP de software de engenharia

| Ferramenta | O que expõe | Leitura/escrita · granularidade | Confirmação / desfazer / erros / transporte | Lições |
|---|---|---|---|---|
| **Revit Public MCP Server** (Autodesk, oficial, Tech Preview, Revit 2027.2) | Três instaladores separados: **Read-Tools**; **Write-Tools** (leitura + escrita); **Experimental** (tudo + experimentais). Exemplos de ferramentas: selecionar, mostrar e girar elementos, `get_views`, `create_section_view`. | Comandos de alto nível, sem execução de código. O lançamento de abr/2026 era só leitura, com 7 ferramentas; a escrita veio no 2027.2. | Executável local por **stdio**, que configura sozinho o Claude Desktop e o Cursor. Não há documentação de confirmação nem de undo (não verificado). A ajuda avisa que mover elementos pode gerar avisos e erros do Revit. O Autodesk Assistant interno tem outro MCP, que escreve. | O nível de risco é escolhido na **instalação**: o usuário instala só o servidor de leitura. As ferramentas de escrita amadurecem separadas, marcadas como "experimental". |
| **OpenSTAAD MCP** (Bentley, oficial, código no GitHub) | 5 ferramentas: `discover_api`, `read_skills` (guias da API), `list_instances`, `execute_code` e `get_status`. | Granularidade **baixa**: o agente escreve Python contra a API OpenSTAAD. O código passa por análise AST antes de rodar; imports, acesso a arquivos e builtins perigosos são bloqueados. | stdio por padrão. Em HTTP, exige token Bearer e tem proteção contra DNS rebinding (Host, Origin, Sec-Fetch-Site). A E/S de arquivos fica no servidor (CSV/XLSX injetados como `input_data`), com contenção de caminho por roots ou diretórios permitidos e limites (50 MB, 100 mil linhas). Roda local, sem telemetria. Undo e confirmação não são documentados. | Bom: "skills" de documentação servidas como ferramenta e dados volumosos passados por arquivo, não pelo contexto. Ruim: `execute_code` é difícil de auditar, pré-visualizar e desfazer. |
| **etabs-mcp** (comunitário, Apache-2.0) | 71 ferramentas curadas (gerar edifício, sismo, análise, resultados, dimensionamento, render, editar tabela) mais a escotilha `search_api` → `describe_api` → `call_api`/`call_api_batch`, que cobre os 1.293 métodos da OAPI e valida contra a assinatura viva. | Alto nível + API crua tipada. Política em três níveis: leitura, escrita, **destrutiva**. | Ações destrutivas (Delete*, abrir modelo, unlock que apaga resultados) exigem `confirm=true`. Há modo `--read-only`. Os erros trazem **código + dica**. Unidades aceitam "6 m". Jobs longos rodam em segundo plano. `what_changed` detecta edição manual e há **checkpoints** com restore. As chamadas COM são serializadas numa thread só. stdio e streamable HTTP; o token é obrigatório fora do localhost. São 58 testes offline com backend falso, mais E2E ao vivo. | O melhor exemplo de política de risco e diagnóstico. A escotilha tipada (descrever → chamar) é melhor que execução de código. O backend falso permite testar no CI. |
| ETABS-mcp (mdvaleed7), sap2000-mcp (Aaradhya), FEA-MCP | Consulta do modelo, materiais e seções, desenho de barras, análise e resultados. `etabs_call_api` dá acesso a todos os métodos. | Alto nível + escotilha. Só Windows (COM). | O sap2000-mcp tem modo **`--mock`** sem o programa, para CI. Um gateway stdio encaminha para portas HTTP locais. | Ter um mock do backend é barato e destrava os testes. |
| **RevitMCPServer** (KenLP, comunitário, MIT) | 94 ferramentas: 31 de inspeção, criação e edição, `revit_batch` e "receitas" só de leitura. | Alto nível. | Toda escrita vira uma `Transaction` nomeada. O **batch** é atômico: uma entrada de undo e rollback na primeira falha. Há **dry-run**. No modo `preview_required`, a escrita exige `approvalToken` vindo do dry-run: uso único, 300 s, vinculado a comando + parâmetros + documento. Sem token, erro 428; com divergência, 409. O **log de auditoria** é JSONL com hash dos parâmetros. Depois de cada escrita há **releitura** (`verify: passed/failed`) e o resultado traz `affected {created, modified, deleted}`. Perfis de ferramentas reduzem tokens. | É o modelo mais completo de **pré-visualizar → aplicar**. Expor 94 ferramentas "custa tokens e piora a escolha da ferramenta". |
| mcp-servers-for-revit (comunitário, MIT) | CRUD de elementos e `send_code_to_revit` (C#). | Alto nível + código. | Servidor MCP em TS ↔ WebSocket ↔ add-in C#. | Arquitetura em três camadas: servidor, ponte e conjunto de comandos. |
| **Tekla MCP Server** (teknovizier, GPL-3.0) | Ferramentas por provedor (Selection, View, Properties, Components, Operations, Drawings, Modeling) e **resources** de filtros, catálogos de material e armadura, grids e fases. | Alto nível, com nomes de atributo resolvidos por embeddings e LLM. | Tem **modo só leitura** e permite ocultar categorias de ferramentas. | Catálogos expostos como resources; ferramentas ligadas e desligadas por categoria. |
| Speckle (bimgeek/speckle-mcp, comunitário) | Listar e buscar projetos, versões de modelo e propriedades de objetos. | Só leitura. | Token pessoal (PAT). Não achei MCP oficial da Speckle. | Leitura de dados na nuvem com token. |
| **Blender MCP** (ahujasid, MIT) | Informação da cena, screenshot, assets e **execução de Python arbitrário**. | Baixa granularidade. | Socket local (porta 9876). O "safe mode" (opcional) valida o script e devolve o motivo do bloqueio para a IA corrigir. | O padrão é executar tudo; a segurança é opcional. Isso é uma armadilha. |
| **FreeCAD MCP** (neka-nat, MIT) | create/edit/delete_object, get_view (screenshot), `execute_code` (sync, async e headless) e `run_fem_analysis` (CalculiX). | Mista. | Addon com servidor RPC. Jobs assíncronos com estado e traceback. `reload_document` pega mudanças externas. | O screenshot vem junto com o retorno (`include_screenshot`), o que fecha o ciclo visual. |
| **RhinoMCP** (jingcheng-chen, MIT) | Rhino: objetos, camadas, `capture_viewport`, Python/C# e **undo/redo**. Grasshopper: achar componentes, ligar, sliders e resolver, com os avisos de erro devolvidos. | Mista. | stdio → TCP 127.0.0.1:1999 → plugin. `describe_capabilities` confere versões. Uma ferramenta que pede plugin mais novo **falha com instrução** em vez de fazer outra coisa. Só um servidor por vez. | Undo exposto como ferramenta. Checagem de versão explícita. |

**Especificação MCP atual: 2026-07-28 (marcada como "latest")**
- **Ferramentas.** `inputSchema` e `outputSchema` aceitam JSON Schema 2020-12. O resultado vem em `structuredContent`, com texto JSON também, por compatibilidade.
- **Erros.** Há dois tipos. Erro de protocolo (JSON-RPC) é para ferramenta desconhecida ou requisição malformada. Erro de execução volta com `isError: true`, para o modelo se corrigir: validação, regra de negócio.
- **Annotations.** `readOnlyHint` (padrão false), `destructiveHint` (padrão **true**), `idempotentHint` e `openWorldHint`. São **dicas não confiáveis** para o cliente.
- **Confirmação humana.** "SHOULD" ter humano no laço e confirmação em operações sensíveis.
- **Nomes.** De 1 a 128 caracteres, `[A-Za-z0-9_.-]`, por exemplo `admin.tools.list`. A lista deve vir em ordem determinística, por causa do cache.
- **Sem estado.** O protocolo ficou *stateless*: não há mais `initialize`; existe `server/discover`. Quem precisa de estado entre chamadas deve criar um **handle explícito**, que o modelo passa adiante.
- **Elicitation.** Tem modo `form` (dados estruturados com schema; proibido para segredos) e modo `url`. Agora usa o padrão **MRTR**: o servidor responde `input_required` e o cliente repete a chamada com as respostas.
- **Depreciações e extensões.** Roots, Sampling e Logging estão depreciados. Tarefas longas viraram a extensão `io.modelcontextprotocol/tasks`.

**llms.txt (v2, 2026).** É um arquivo `/llms.txt` em Markdown: H1 obrigatório, resumo em blockquote, notas e seções H2 com listas de links. A seção "Optional" é o que se pode pular. Cada página pode ter versão `.md` na mesma URL, com `Link: rel="alternate" type="text/markdown"` e `rel="describedby"`.

**Navegador.** O WebMCP (`document.modelContext.registerTool`, antes `navigator.modelContext`) está em origin trial no Chrome e é rascunho de Community Group do W3C (não verificado nos detalhes).

**Boas práticas que se repetem**
1. Separar leitura, escrita e destrutiva, com modo só leitura.
2. Exigir confirmação explícita em ações destrutivas.
3. Fazer a escrita em lote como transação atômica, com uma entrada de undo.
4. Oferecer dry-run com token de aprovação vinculado aos parâmetros e à versão do modelo.
5. Devolver nos erros código + dica, e no resultado a lista do que foi afetado.
6. Reler o modelo depois de escrever.
7. Manter log de auditoria.
8. Expor catálogos como resources e documentação para o agente se orientar sozinho.
9. Usar perfis ou categorias para não expor dezenas de ferramentas de uma vez.
10. Ter backend falso para CI.

**Armadilhas**
- `execute_code` como interface principal: sem diff, sem undo e de auditoria difícil.
- Annotations tratadas como garantia.
- Ferramentas demais.
- Estado implícito na conexão.
- Servidor HTTP local sem token e sem checagem de Origin (DNS rebinding).
- Undo de N passos sem agrupamento.
- Mudanças manuais feitas fora do agente sem detecção (o etabs-mcp resolve com `what_changed`).

---

### 2. Proposta de arquitetura IA-nativa para o Statikos

**2.1 Registro de comandos (`src/core/commands/`, TS puro, sem React)**
```ts
type Risco = 'leitura' | 'escrita' | 'destrutiva' | 'calculo' | 'io';
interface Comando<I, O> {
  nome: string;            // 'estrutura.barra.adicionar' (casa com [A-Za-z0-9_.-])
  titulo: string; descricao: string;   // pt-BR; vira menu, ajuda, MCP e llms.txt
  risco: Risco; idempotente?: boolean;
  entrada: JSONSchema; saida?: JSONSchema;   // objetos JSON Schema 2020-12 escritos à mão ou TypeBox
  atalho?: string; icone?: string; exemplos?: { entrada: I; descricao: string }[];
  validar(m: Model, e: I): Diagnostico[];                   // puro; 'erro' bloqueia
  aplicar(m: Model, e: I): { saida: O; afetados: Afetados; diag: Diagnostico[] }; // mutação num rascunho immer
}
```
- **Executor único** `executar(nome, entrada, {origem, dryRun, token})`. O fluxo é: validar schema → `validar` → `produceWithPatches` (o immer já é dependência e devolve **patches + patches inversos**) → `afetados` → diagnósticos → entrada no log `{id, ts, origem: ui|atalho|cli|mcp|teste, nome, entrada, patches, inversos, versãoAntes/Depois (hash)}`.
- **Desfazer.** É `applyPatches(inversos)`. Isso troca o `past: Model[]` atual (até 200 cópias do modelo) por patches, que são menores e descrevem a mudança.
- **Lote.** `lote.executar([...passos])` é atômico (rollback na primeira falha) e gera uma entrada de undo.
- **Leitura não entra no histórico.** Os comandos de leitura (`modelo.resumo`, `barra.listar`, `resultado.obter`, `explicar`) também são registrados, mas sem patches.

**2.2 Pré-visualizar → aplicar**
- Com `dryRun: true`, o executor roda no rascunho e devolve:
  - um **diff legível**, por exemplo "barra 12: seção V20×50 → V20×60; 2 nós criados";
  - os `afetados` e os diagnósticos;
  - um `tokenPrevia`, que é o hash de (versão do modelo + nome + entrada canônica).
- **Na interface.** O Canvas desenha o rascunho "fantasma" e o usuário clica Aplicar ou Descartar.
- **No MCP/CLI.** Um modo de política escolhido pelo usuário (`leitura` | `confirmar` | `direto`).
  - Em `confirmar`, escrita sem token devolve `isError` com o código `PREVIA_NECESSARIA`.
  - Token velho, ou modelo que mudou desde a prévia, dá `PREVIA_DIVERGENTE` (concorrência otimista, como os 428/409 do RevitMCPServer).
  - Comandos `destrutiva` sempre pedem `confirmar: true`.
  - Opcionalmente, o servidor pode pedir a confirmação ao humano por **elicitation form**, se o cliente suportar.

**2.3 Diagnósticos estruturados**
```ts
interface Diagnostico {
  codigo: string;          // estável e documentado: 'NBR6118.PILAR.ESBELTEZ_ALTA', 'MODELO.NO_SOLTO', 'FUND.SPT_AUSENTE'
  severidade: 'erro' | 'aviso' | 'info' | 'a_confirmar';
  elemento?: { tipo: 'no'|'barra'|'apoio'|'caso'|'combinacao'|'secao'; id: number };
  mensagem: string;        // pt-BR, com valores e unidades
  sugestao?: { texto: string; comando?: { nome: string; entrada: unknown } };  // correção executável
  ref?: { norma: string; item?: string; status?: 'confirmado'|'a confirmar' };
}
```
A mesma lista alimenta o painel de avisos, o memorial, o `isError` do MCP (o modelo se corrige sozinho) e as asserções dos testes. A severidade `a_confirmar` materializa a regra do projeto "premissa visível".

**2.4 Resultados com origem.** Todo valor de dimensionamento e de fundação sai como
`{valor, unidade, origem: {combinacao: {id, nome, fatores}, formula: 'Md,tot = αb·M1d,A + Nd·le²/10·1/r', item: 'NBR 6118 15.8.3.3.2', premissas: ['alfa_b', ...], entradas: {...}}}`.
O comando `resultado.explicar(elemento, grandeza)` devolve a árvore de derivação, e o Memorial passa a ser uma renderização dessa mesma estrutura. Assim a IA, o memorial e a interface citam a mesma fonte.

**2.5 Um registro, vários consumidores**
- **Interface.** Menus, botões, paleta de comandos (Ctrl+K) e formulários gerados a partir do schema.
- **Atalhos.** Mapa `tecla → nome do comando`.
- **Arquivo `.statikos`.** O log de comandos é gravado e permite **replay**, que serve para reproduzir um erro ou como macro. O histórico atual de atividades vira derivado dele.
- **Testes.** Roteiros JSON de comandos com snapshot do modelo ou dos resultados. Há também uma propriedade genérica: `aplicar` seguido de `inverso` devolve o modelo original, para todo comando.
- **MCP.** `tools/list` é gerado do registro. `risco` vira `readOnlyHint`/`destructiveHint`/`idempotentHint` e `openWorldHint=false`. São perfis de 20 a 40 ferramentas, mais `comandos.buscar`/`comandos.descrever`/`comandos.executar`, uma escotilha **tipada** em vez de execução de código. Catálogos (perfis, bitolas, solos), convenções e códigos de diagnóstico ficam expostos como **resources**.
- **llms.txt.** Gerado no build: `/llms.txt` + `/docs/comandos.md`, `convencoes.md` (unidades, sinais), `diagnosticos.md` e `premissas.md`.

**2.6 Mesmo código no Node e no navegador**
- **O que é compartilhado.** `src/core` e `src/core/commands` continuam puros: sem DOM e sem `localStorage`. A persistência e a E/S ficam em adaptadores. No navegador são localStorage e File System Access; no Node, `fs`.
- **CLI.** É um pacote `cli/`, compilado com esbuild ou modo biblioteca do Vite para `statikos.mjs` (Node ≥ 22). Comandos: `statikos exec modelo.statikos roteiro.json`, `statikos verificar`, `statikos memorial --html` e `statikos mcp` (stdio).
- **MCP.** Usa `@modelcontextprotocol/sdk` (MIT), que só entra no Node e nunca no bundle web. Como o protocolo é stateless, cada ferramenta recebe `arquivo` (caminho) ou um `sessao` (handle devolvido por `modelo.abrir`).
- **Ligação com a aba aberta.** Há três opções, em ordem:
  1. por arquivo: o agente grava o `.statikos` e o app recarrega;
  2. **WebMCP** no Chrome (origin trial), com o mesmo registro exposto na página;
  3. ponte WebSocket local com token de pareamento e checagem de Origin.
- **Solver.** Roda num **Web Worker** no navegador e num `worker_threads` no Node, com o mesmo módulo.

---

### 3. Dependências

| Necessidade | Opção | Licença | Tamanho min+gzip (medido) | Maturidade | Recomendação | [confirmar] |
|---|---|---|---|---|---|---|
| DXF entrada | **Parser próprio** (LINE, LWPOLYLINE c/ bulge, POLYLINE, ARC, CIRCLE, TEXT/MTEXT, INSERT/blocos) | do projeto | ~8–15 KB estimado | — | **Recomendado**: o projeto já escreve DXF R12 à mão. Pontos de atenção: OCS/eixo arbitrário (arcos e INSERT com extrusão), bulge, blocos aninhados, `$DWGCODEPAGE` (ANSI_1252), códigos de formatação do MTEXT e DXF binário. Usar dxf-parser só como oráculo nos testes. | Exemplos reais de DXF dos clientes (sem commitar) |
| | dxf-parser | MIT | 7,8 KB | 26 versões, sem release desde 2022 | Alternativa leve | — |
| | dxf (skymakerolof) | MIT | 27 KB | 79 versões, ativo em 2025 | Alternativa com helpers de polilinha/SVG | — |
| | dxf-json, @mlightcad/dxf-json, @dxfom/dxf | **GPL-3.0** | — | — | Evitar (copyleft) | — |
| DWG | **@node-projects/acad-ts** (porte TS do ACadSharp, MIT) | MIT | 247 KB inteiro; 201 KB só o `DwgReader` | **Novo** (abr/2026, 17 versões). Lê e escreve DWG de AC1009 a AC1032. | **Recomendado como experimental**, carregado sob demanda fora do bundle principal | Qualidade em DWGs reais; licença no repositório (o npm diz MIT; o LICENSE não abriu) |
| | libredwg / @mlightcad/libredwg-web | **GPL-3.0** | WASM 10,8 MB (2,5 MB gz) | Ativo | Não incorporar ao app. Linkar ou chamar funções com estruturas compartilhadas no mesmo espaço de endereço tende a formar "programa combinado" pela FAQ da FSF: o conjunto distribuído teria de ser GPL-3. Carregar sob demanda **não muda claramente** essa análise. Só faz sentido como **ferramenta separada** (conversor DWG→DXF que troca apenas o arquivo DXF), publicada em GPL. | Análise jurídica |
| | dwg2dxf-converter | invólucro MIT + **WASM GPL-3** | WASM 5,9 MB (1,6 MB gz) | 2026 | Não usar. A alegação do README de que o GPL "não contamina" é do autor, não vale como garantia. | — |
| | ODA Drawings SDK | Proprietária | — | Industrial | Inviável num projeto aberto. Exige ser membro da ODA (a partir de US$ 3.000 no 1º ano). O direito de distribuir acaba com a assinatura, e o uso fica restrito a aplicativos de membros. | Preços atuais |
| | Usuário converte (ODA File Converter gratuito, LibreCAD, `dwg2dxf` do LibreDWG) | — | 0 | — | **Fallback documentado** na tela de importação | Termos do ODA File Converter (não verificado) |
| PDF vetorial como máscara | pdf.js (`pdfjs-dist` 6.4) | Apache-2.0 | 130 KB (API) + **375 KB (worker)** ≈ 0,5 MB | Muito madura | Usar sob demanda. `page.getOperatorList()` → op `constructPath` com `[op, [Float32Array com DrawOPS: moveTo 0, lineTo 1, curveTo 2, quadraticCurveTo 3, closePath 4], minMax]`. É preciso rastrear `save/restore/transform` (CTM) para obter as coordenadas da página. | Escala/calibração (2 pontos) na interface |
| IFC leitura | web-ifc | **MPL-2.0** (confirmado) | JS 390 KB + WASM 572 KB ≈ **0,96 MB** | 78 versões, ativo | Sob demanda, se a importação de IFC entrar no escopo. MPL tem copyleft só por arquivo: compatível com MIT/Apache sem modificar os arquivos dela. | — |
| | IfcOpenShell WASM (`ifcopenshell`/`@ifcopenshell/wasm` 0.9) | LGPL-3.0+ | WASM 3,5 MB (702 KB gz) | Pacote npm **novo** (out/2026) | Aguardar amadurecer. A LGPL exige permitir troca da biblioteca: fácil com WASM separado. | — |
| IFC escrita | **Escritor STEP próprio** (IFC4 ou 4.3, P21 texto) | do projeto | ~5–10 KB estimado | — | **Viável e recomendado**: só a saída, com um subconjunto pequeno (IfcProject/Site/Building/Storey; IfcColumn/IfcBeam/IfcSlab com IfcExtrudedAreaSolid; opcional IfcStructuralAnalysisModel). Validar com o validador do IfcOpenShell ou o serviço de validação da buildingSMART. | MVD alvo (Reference View × Structural Analysis View) |
| 3D | Three.js r186 | MIT | 189 KB inteiro; 135 KB num subconjunto típico | Muito madura | Só se o 3D crescer (sombras, seleção rica) | — |
| | OGL | Unlicense | 39 KB | Estável (2025) | Boa opção intermediária | — |
| | regl / twgl.js | MIT | 41 KB / 25 KB | regl parado; twgl ativo | — | — |
| | **WebGL2 próprio** (linhas + barras extrudadas + picking por cor) | do projeto | ~10–25 KB estimado | — | **Recomendado no início**: o pórtico 3D é geometria simples | — |
| Code splitting | vite-plugin-singlefile (Vite 8) | MIT | — | — | O plugin força `codeSplitting:false` (`inlineDynamicImports` antes do Vite 8): **`import()` dinâmico é embutido no HTML** e não reduz o download. Para carregar sob demanda: módulo compilado à parte em `public/vendor/*.mjs` + `import(/* @vite-ignore */ './vendor/x.mjs')`. Funciona no Netlify e no PWA (o SW guarda em cache). No artifact do claude.ai, publicar como `files` ou usar CDN permitida. | Teste no artifact |
| Planta 2D | SVG (atual) × Canvas 2D × WebGL | — | 0 | — | As referências (TU Dresden 2018, yWorks, LogRocket) mostram SVG e Canvas parecidos até alguns milhares de elementos e o SVG degradando acima disso. Canvas se sai melhor com muitas linhas simples; WebGL é estável com centenas de milhares (fraco em texto). **Recomendação**: modelo editável continua em SVG; máscara DXF/PDF (10³–10⁵ entidades) em **Canvas 2D** numa camada abaixo, com cache por zoom (OffscreenCanvas); WebGL só se passar de ~10⁵. | Benchmark próprio com plantas reais |
| Índice espacial | flatbush | ISC | 2,8 KB | Ativo | **Máscara estática** (o mais rápido; reconstruir ao importar) | — |
| | rbush | MIT | 2,2 KB | Estável | Modelo editável (insere e remove) | — |
| | kdbush | ISC | 1,5 KB | Estável | Captura de pontos (nós, extremidades) | — |
| Solver | **Manter TS** (LDLᵀ em banda + RCM, já existe) | do projeto | 0 | Testado | **Recomendado**. Para 3D com mais de ~2×10⁴ GL: Cholesky esparso (perfil/skyline ou supernodal com ordenação AMD/ND) em TS, num Web Worker, `Float64Array`. | Tamanho-alvo de modelo (n.º de GL) |
| | eigen (eigen-js, WASM) | MIT (o Eigen em si é MPL-2.0) | 360 KB | Parado (último 2023) | Não | — |
| | ml-matrix | MIT | 18 KB | Ativo | Só densa; útil em testes | — |
| | SuiteSparse/CHOLMOD WASM | LGPL/GPL por módulo (não verificado) | — | Não achei pacote npm mantido | Não | — |
| Validação de schema | JSON Schema escrito à mão + **@cfworker/json-schema** | MIT | 5,9 KB | Ativo | **Recomendado** (o schema serve direto ao MCP) | — |
| | TypeBox (+Value.Check) | MIT | 25 KB | Ativo | Alternativa com tipos TS inferidos | — |
| | ajv / zod 4 | MIT | 38 KB / 92 KB | Ativos | O ajv gera código via `new Function` (CSP); o zod é grande no navegador | — |
| MCP | @modelcontextprotocol/sdk 1.32 | MIT | só Node | Oficial | Só no pacote CLI/MCP | Suporte à spec 2026-07-28 (não verificado) |

---

### 4. Licença do repositório (hoje sem LICENSE, ou seja, "todos os direitos reservados" por padrão)

Ponto específico do Statikos: o app é **distribuído** a cada visita, porque o JS vai para o navegador. Então GPL e AGPL já obrigam quem publica um fork a oferecer o código. A cláusula de rede da AGPL só acrescenta algo para **partes que rodam no servidor**: um serviço de cálculo em nuvem, o MCP por HTTP, uma biblioteca hospedada.

| Licença | Fork SaaS fechado | Patentes | Open core (núcleo aberto + pago) | Contribuições | Compatibilidade | Exemplos AEC/CAD |
|---|---|---|---|---|---|---|
| **MIT** | Permitido, sem devolver nada | Sem concessão explícita | Simples: os recursos pagos podem ser fechados | DCO basta | Combina com quase tudo. Código MIT pode entrar num conjunto GPL-3 (o conjunto sai GPL). | three.js, RhinoMCP, Blender MCP, That Open components |
| **Apache-2.0** | Permitido | **Concessão explícita + retaliação** se o usuário processar por patente | Simples. Exemplo: **Speckle server** é Apache-2.0 com pastas "Enterprise Edition" sob outra licença. | DCO ou CLA | Compatível com GPL-3 (não com GPL-2). Exige NOTICE. | Speckle, pdf.js, etabs-mcp |
| **MPL-2.0** | Permitido, mas os **arquivos** modificados continuam MPL | Explícita | Bom: copyleft só por arquivo; os módulos pagos ficam em arquivos próprios | DCO | Compatível com GPL/LGPL (cláusula de secundária) | web-ifc, IFC-Lite |
| **GPL-3.0** | O fork que distribui (inclusive JS servido ao navegador) precisa abrir o código | Explícita | Só o titular de **todos** os direitos pode vender licença comercial (dual license) → exige **CLA** | CLA, se quiser dual license | Necessária para embutir libredwg. Incompatível com dependência proprietária. | LibreDWG, QCAD (GPL-3 + QCAD Pro comercial), LibreCAD (GPL-2), pyRevit, Tekla MCP, Bonsai |
| **AGPL-3.0** | Fecha também o uso via rede no servidor | Explícita | Dual license AGPL + comercial (modelo xeokit); exige CLA | CLA | Como a GPL-3. Afasta empresas que proíbem AGPL. | xeokit SDK (AGPL + comercial) |
| LGPL-2.1/3.0 | Permitido usar como biblioteca; modificações na biblioteca abertas | 3.0 explícita | Média | DCO | — | FreeCAD (LGPL-2.1), IfcOpenShell (LGPL-3.0) |
| BSL 1.1 / FSL (*source-available*) | Proibido concorrer por um período, depois vira Apache/MIT | Varia | Forte proteção comercial | CLA | **Não é OSI**: não é "open source", afasta contribuidores e distribuições | (sem exemplo AEC verificado) |
| Licença acadêmica não comercial | Proibido uso comercial | — | — | — | Incompatível com GPL/OSI | **OpenSees** (UC Regents: uso comercial só com licença da universidade) |

**Trade-offs para o Statikos**
1. **Apache-2.0 + CLA leve (ou DCO) + marca registrada "Statikos".** Adoção máxima e patentes resolvidas. Os recursos pagos ficam fora do repositório: serviço, módulos fechados, suporte. Um fork SaaS é possível, e a proteção vem da marca e da velocidade de desenvolvimento.
2. **AGPL-3.0 + CLA (dual license).** Maior proteção contra fork SaaS e permite vender licença comercial a quem quiser fechar. Por outro lado, reduz adoção e contribuição corporativa e exige CLA desde o 1º PR externo.
3. **MPL-2.0.** Meio-termo: melhorias no núcleo voltam à comunidade, e módulos pagos em arquivos separados continuam possíveis.

Pontos práticos:
- Sem **CLA**, não dá para relicenciar depois nem mover código de terceiros para a parte paga. O DCO só certifica a origem.
- Embutir libredwg prende o app distribuído à GPL-3. Por isso a recomendação é manter o DWG via acad-ts (MIT) ou um conversor separado.

---

### 5. Fontes

**Abertas (lidas diretamente)**
- OpenSTAAD MCP README: https://github.com/BentleySystems/openstaad-mcp (raw README)
- etabs-mcp: https://github.com/Moha2005269/etabs-mcp · https://pypi.org/project/etabs-mcp/
- ETABS-mcp: https://github.com/mdvaleed7/ETABS-mcp
- sap2000-mcp: https://github.com/Aaradhya-Dev-Tamrakar/sap2000-mcp
- FEA-MCP: https://github.com/GreatApo/FEA-MCP
- RevitMCPServer (KenLP): https://github.com/KenLP/RevitMCPServer
- mcp-servers-for-revit: https://github.com/mcp-servers-for-revit/mcp-servers-for-revit
- Tekla MCP: https://github.com/teknovizier/tekla_mcp_server
- Blender MCP: https://github.com/ahujasid/blender-mcp
- FreeCAD MCP: https://github.com/neka-nat/freecad-mcp (+ docs/tools.md)
- RhinoMCP: https://github.com/jingcheng-chen/rhinomcp
- Especificação MCP 2026-07-28, lida no GitHub e não no site:
  - https://github.com/modelcontextprotocol/modelcontextprotocol (docs/specification/2026-07-28: server/tools, client/elicitation, changelog; schema/2026-07-28/schema.ts)
  - URL pública: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- llms.txt v2, fonte no GitHub: https://github.com/AnswerDotAI/llms-txt (nbs/index.qmd). Site: https://llmstxt.org/
- vite-plugin-singlefile: https://github.com/richardtallent/vite-plugin-singlefile (README e src/index.ts)
- Licenças conferidas nos arquivos LICENSE/COPYING:
  - FreeCAD (LGPL-2.1): https://github.com/FreeCAD/FreeCAD
  - IfcOpenShell (LGPL-3.0; Bonsai GPL-3.0): https://github.com/IfcOpenShell/IfcOpenShell
  - Speckle server (Apache-2.0 + pastas EE): https://github.com/specklesystems/speckle-server
  - web-ifc (MPL-2.0): https://github.com/ThatOpen/engine_web-ifc
  - xeokit (AGPL-3.0): https://github.com/xeokit/xeokit-sdk
  - LibreCAD (GPL-2): https://github.com/LibreCAD/LibreCAD
  - QCAD (GPL-3 com exceções): https://github.com/qcad/qcad
  - LibreDWG (GPL-3): https://github.com/LibreDWG/libredwg
  - libredwg-web: https://github.com/mlightcad/libredwg-web
  - pyRevit (GPL-3): https://github.com/pyrevitlabs/pyRevit
  - OpenSees (UC Regents, não comercial): https://github.com/OpenSees/OpenSees
  - ACadSharp (MIT): https://github.com/DomCR/ACadSharp
  - three.js (MIT): https://github.com/mrdoob/three.js
  - pdf.js (Apache-2.0): https://github.com/mozilla/pdf.js
  - flatbush (ISC): https://github.com/mourner/flatbush
  - rbush (MIT): https://github.com/mourner/rbush
  - dxf-parser (MIT): https://github.com/gdsestimating/dxf-parser
- Metadados e tamanhos pelo registro npm: https://registry.npmjs.org/ (dxf-parser, dxf, dxf-json, @node-projects/acad-ts, @mlightcad/libredwg-web, dwg2dxf-converter, three, ogl, regl, twgl.js, pdfjs-dist, web-ifc, ifcopenshell, @ifcopenshell/wasm, rbush, flatbush, kdbush, eigen, ml-matrix, ajv, zod, @sinclair/typebox, @cfworker/json-schema, @modelcontextprotocol/sdk)
- mlightcad cad-viewer README: https://github.com/mlightcad/cad-viewer

**Não abriram (bloqueio de rede); usadas por resumo de busca, portanto não verificadas no original**
- https://www.autodesk.com/blogs/aec/2026/06/17/revit-public-mcp-server/
- https://help.autodesk.com/view/ADSKMCP/ENU/?guid=revitmcp_tools e https://help.autodesk.com/view/ADSKMCP/ENU/?guid=ADSKMCP_RevitMcp_revit_mcp_server_html
- https://blog.autodesk.io/revit-mcp-server-update/ · https://blog.autodesk.io/revit-2027-mcp-server-release/
- https://forums.autodesk.com/t5/revit-architecture-forum/mcp-server-for-revit-tech-preview-launch/td-p/14262009
- https://www.bentley.com/en/infrastructure-ai/mcp-servers/ · https://www.bentley.com/news/bentley-systems-wins-gold-stevie-award-for-ai-breakthrough-in-construction-and-civil-engineering-technology/
- https://www.gnu.org/licenses/gpl-faq.html (#GPLPlugins, #MereAggregation): só citações de terceiros
- https://www.opendesign.com/pricing · https://www.opendesign.com/oda-membership · https://www.opendesign.com/products/drawings
- https://developer.chrome.com/docs/ai/webmcp/imperative-api (WebMCP)
- Desempenho de renderização:
  - https://mt.inf.tu-dresden.de/cnt/uploads/Horak-2018-Graph-Performance-Poster.pdf
  - https://www.yworks.com/blog/svg-canvas-webgl
  - https://blog.logrocket.com/when-to-use-html5s-canvas-ce992b100ee8
- Licenças em geral:
  - https://fossa.com/resources/license-compliance-tools/license-compatibility-checker/agpl-3-0-vs-apache-2-0/
  - https://github.com/ryanrborn/arbiter/issues/1868 (CLA × DCO no open core)
- Speckle MCP (comunitário): https://glama.ai/mcp/servers/bimgeek/speckle-mcp. O README no GitHub veio vazio.

**Não verificado:** detalhes de confirmação e undo do Revit oficial; termos do ODA File Converter; licenças por módulo do SuiteSparse; suporte do SDK MCP 1.32 à spec 2026-07-28; status e nome final da API WebMCP; o LICENSE do repositório acad-ts (só o npm foi conferido); a interpretação da GPL para WASM (sem leitura direta da FAQ da FSF).

---

## Ferramenta de desenho do módulo Edifícios: visual, interação, renderização e desempenho

Pesquisa de 19/10/2026 para o lançamento em planta por pavimento (máscara DXF, eixos, pilares, vigas, lajes, cargas).

**Limitação de acesso.** Nesta sessão o proxy recusou quase todos os sites (info.cype.com, learning.cype.com, suporte.altoqi.com.br, docs.tqs.com.br, tldraw.dev, help.autodesk.com, MDN e outros). Só o GitHub abriu inteiro. O restante vem dos trechos que a busca devolveu (WebSearch). A seção 5 diz o que foi aberto e o que é só trecho.

**Rótulos usados no texto:**
- "(trecho)": dado tirado do resumo da busca, sem abrir a página.
- "(não verificado)": observação de uso comum, sem fonte confirmada aqui.
- "(medido)": medido nesta sessão, em Chromium headless 141 com rasterização por software, 4 núcleos, 1600×900 e DPR 2. Os números são pessimistas em relação a uma máquina com GPU.

**Reconstrução limpa.**
- Abaixo se descrevem comportamentos e convenções visuais com palavras próprias.
- Não se copiam ícones, layout de tela nem nomes de comando.
- Nomes do CYPECAD que **não** devem ser reaproveitados como rótulos: "Capturas a plantillas", "Referencias a objetos", "Tenue", "Plantillas DXF-DWG", "Entrada de vigas/pilares", "Paños". Usar termos próprios: "Pontos da máscara", "Rastreio", "Esmaecer máscara", "Lançar pilar", "Lançar laje".

---

### 1. Visual observável

#### 1.1 Tabela

| Elemento | CYPECAD (observável) | Eberick / TQS | Statikos, tema escuro (padrão) | Statikos, tema claro |
|---|---|---|---|---|
| Fundo | Até 3 opções de cor de fundo; ao trocar, as cores dos elementos se ajustam sozinhas (manual Multiplus, trecho). Desde a 2022.a a cor de fundo é configurada por programa (trecho). Vista 3D: branco, cinza, preto ou degradê (trecho). Fundo escuro é usual nos vídeos (não verificado). | Eberick: cor de fundo configurável em Configurações › Desenho › CAD, com efeito no Croqui, na Arquitetura e nos Detalhamentos, junto com o tamanho do cursor (trecho, suporte AltoQi). TQS: cores lógicas por "nível", 256 cores (0 = preto, 7 = branco) e suporte a fundo claro (trecho, TQS Docs). | `#11151A` (grafite azulado, não preto puro) | `#FAFAF7` |
| Máscara DXF | Desenho importado com opção de exibi-lo esmaecido para distingui-lo da estrutura, e camadas liga/desliga (manual antigo, trecho). Cores da máscara editáveis após importar (notas 2005.1, trecho). Desde a 2024.c a visibilidade também fica no painel de vista (trecho). | Eberick: cor de impressão da arquitetura configurável (trecho). TQS: por nível (trecho). | `#5C6672`, traço fino de 1 px, sem preenchimento (contraste 3,1:1). Opção "cor original do DXF esmaecida a 35%". | `#B3B9C0` (1,9:1 de propósito: é referência, não informação). Botão "realçar máscara" leva a `#7A838D` (3,8:1). |
| Eixos / linhas de referência | Ortogonalidade (Ctrl+O) segue o sistema de coordenadas ativo (trecho). Cor (não verificado). | Não confirmado. | `#8FA3B8`, traço-ponto, 1 px, rótulo em balão nas extremidades (7,1:1) | `#5E7085`, traço-ponto (4,9:1) |
| Pilares | Pilares do material selecionado numa lista aparecem em vermelho (exemplo prático, trecho). "INSUF" em texto quando a seção não basta (trecho). Cor padrão (não verificado). | Não confirmado. | Seção cheia `#F2F4F7` (16,6:1) com contorno de 1,5 px. Nome (P1…) ao lado. Pilar que nasce no pavimento: hachura. Pilar que morre: só contorno. | Seção cheia `#1B1F24` (15,8:1) |
| Vigas | Desenhadas em branco ou preto conforme o fundo (notas 2005.1, trecho). Contorno vermelho = erro, amarelo = aviso (CYPE, "Valoração de erros em vigas", trecho). | Não confirmado. | Duas linhas de face `#4FC3F7` (9,1:1), 1,5 px, preenchimento a 12%. Eixo da viga tracejado só quando selecionada. | `#0072B2` (5,0:1) |
| Lajes / painéis | Cada tipo de elemento tem cor diferente (Multiplus, trecho). O painel fica entre vigas ou muros (trecho). | Não confirmado. | Preenchimento `#E6C27A` a 30% (resulta `#514937`), contorno `#E6C27A` de 1 px. Seta da direção das nervuras para laje unidirecional. Rótulo "L3 h=12". | `#B8860B` a 30% (resulta `#E6D7B0`) |
| Paredes / cargas lineares | Não confirmado. | Não confirmado. | `#A1887F`, faixa de 4 px, semitransparente | `#6D4C41` |
| Cargas (pontuais e de área) | Não confirmado. | Não confirmado. | `#FF8FD8` (magenta claro, 8,9:1); setas e valor em kN ou kN/m² | `#B5179E` (5,6:1) |
| Cotas e textos | Não confirmado. | TQS: texto do Windows invertido no fundo claro (trecho). | Cotas `#B8C2CC` (10,1:1); texto `#E6EAEF` (15,2:1) | `#4A5561` (7,3:1) e `#1B1F24` |
| Seleção | Viga com erro realçada em vermelho ao ser escolhida no diálogo de erros (trecho). Cor de seleção (não verificado). | Não confirmado. | `#00E5C8` (ciano-verde, 11,4:1), traço 2,5 px + halo de 6 px a 25% + alças quadradas | `#00897B` (4,1:1) |
| Pré-seleção (hover) | Não verificado. | Não confirmado. | Cor de seleção a 55%, traço 2 px, sem alças | Idem |
| Erro | Vermelho no contorno, por categoria: Erro = vermelho, Aviso = amarelo, Informação = sem cor (CYPE, trecho). | Não confirmado. | `#FF4D4D` (5,6:1), traço 3 px + marcador ⚠ com número; lista clicável | `#A3001B` (7,8:1) |
| Aviso | Amarelo (CYPE, trecho) | Não confirmado. | `#FFC21A` (11,3:1), traço 2 px tracejado + marcador "!" | `#C27C00` (3,3:1) |
| Cursor / mira | Pontos da máscara capturáveis como no AutoCAD; com o pilar, ponto fixo e depois clique no octante para onde a seção cresce (manual, trecho). | Eberick: tamanho do cursor configurável (trecho). | Mira em cruz de 1 px `#E6EAEF` com quadradinho de 8 px; em ferramenta de lançamento, pré-visualização da seção no cursor | Mira `#1B1F24` |
| Glifo de captura | Funciona como os pontos de captura do AutoCAD (trecho). | Não confirmado. | `#C6FF00` (lima, 15,4:1), glifo de 12 px com borda escura de 1 px + rótulo curto | `#2E7D00` (5,0:1) |
| Rastreio / linhas-guia | Extensão, perpendicular e paralelo a partir de elementos e da máscara, desde a 2011.a (trecho) | Não confirmado. | Lima a 60%, pontilhado de 1 px, com distância/ângulo na ponta | Verde a 60% |
| Pré-visualização fantasma | Não verificado. | Não confirmado. | Cor do tipo do elemento a 45%, contorno tracejado | Idem |
| Janela de seleção | (o padrão do AutoCAD é o mais conhecido) | n/a | Esquerda→direita: retângulo contínuo, azul `#4FC3F7` a 15%. Direita→esquerda: tracejado, verde `#00E5C8` a 15%. | Idem com as cores claras |

#### 1.2 Checagem de contraste e daltonismo (medido, script próprio)

**Contraste WCAG.**
- Fórmula de luminância relativa do WCAG 2.x.
- Meta 1.4.11 (elementos gráficos): ≥ 3:1 sobre o fundo. Meta 1.4.3 (texto): ≥ 4,5:1.
- Tema escuro: todos os elementos de informação ficam entre 5,6:1 e 16,6:1. A máscara fica em 3,1:1 por desenho.
- Tema claro: todos ≥ 3,1:1, exceto a máscara (1,9:1, intencional e com botão "realçar"). Lajes têm 3,1:1 no contorno; o preenchimento é só fundo.

**Deuteranopia.**
- Simulação pela matriz de Machado et al. (2009), severidade 1,0, com ΔE CIE76 entre pares.
- Pares críticos no escuro, pior caso: aviso×captura 9,8, eixo×carga 10,4, carga×seleção 11,5. Viga×laje, pilar×viga e erro×aviso ficam > 30.
- No claro, com erro `#A3001B` e aviso `#C27C00`, erro×aviso sobe de 1,2 (primeira tentativa, `#D00000`/`#9A6700`) para > 15.
- Com 10 ou mais categorias não há separação só por matiz para deuteranopes. A paleta foi montada sobre os eixos que sobrevivem (luminância e azul–amarelo).

**Codificação redundante (obrigatória):**
- pilar = área cheia;
- viga = duas linhas paralelas;
- laje = área translúcida com rótulo;
- eixo = traço-ponto;
- erro = traço grosso com ⚠ e número;
- aviso = tracejado com "!";
- seleção = alças;
- captura = forma do glifo.

**Modo preto e branco (impressão e PDF):**

| Elemento | Representação |
|---|---|
| Fundo | branco |
| Máscara | cinza 40%, 0,13 mm |
| Eixos | traço-ponto, 0,18 mm |
| Pilares | cheios em preto (ou hachura a 45°) |
| Vigas | contorno contínuo de 0,35 mm; faces ocultas sob a laje tracejadas, como em planta de fôrma |
| Lajes | sem preenchimento; rótulo com h |
| Cargas | seta preta + valor |
| Cotas | 0,18 mm |
| Erros | nuvem de revisão + ⚠ |

- Espessuras a conferir na NBR 8403 [confirmar].
- Implementação: um terceiro conjunto de tokens `print`, aplicado em `@media print` e no export.

**Edição.**
- Todas as cores são tokens (`--sk-viga`, …) num objeto de tema salvo no arquivo `.statikos` (preferência do usuário, não do modelo).
- Haverá um seletor "Escuro / Claro / Alto contraste / P&B" e a opção "usar cores do DXF".

#### 1.3 Risco de confusão com a identidade do CYPE

- **Baixo risco:** cores funcionais isoladas, como o vermelho/amarelo para erro/aviso, são convenção de qualquer verificador.
- **Risco real:** reproduzir o *conjunto* da tela, ou seja, fundo + cores por elemento + abas de entrada + ícones + nomes de menu + posição dos painéis.
  - A paleta proposta evita isso: viga azul-ciano em vez de branca, laje âmbar translúcida, carga magenta, fundo grafite azulado.
- **Não usar:** a cor institucional do CYPE na interface (o vermelho da marca, não verificado), o arranjo de abas de entrada por tipo de elemento e os nomes de comandos/opções citados acima.

---

### 2. Interação

| Recurso | Referência | Proposta Statikos | Prioridade | [confirmar] |
|---|---|---|---|---|
| Barra mínima + atalhos de uma tecla | Excalidraw: R = retângulo e teclas numéricas para ferramentas (trecho). tldraw: teclas 1…9 selecionam ferramentas da barra (release fev/2024, trecho). | Barra vertical com 8 ferramentas: Selecionar, Eixo, Pilar, Viga, Laje, Carga, Medir, Cota. Teclas: S/Esc, E, P, V, L, C, M, D, e também 1…8. "?" abre a folha de atalhos. | MVP | Mapa de teclas |
| Paleta de comandos (Ctrl+K) | Figma e tldraw têm busca de ações (não verificado). AutoCAD tem linha de comando. | Ctrl+K: busca difusa de comandos, pavimentos e elementos ("P12", "viga V3"). A tecla mostra o atalho ao lado. | MVP | — |
| Entrada dinâmica (valor durante o traço) | AutoCAD: dica perto do cursor com distância e ângulo; Tab alterna os campos e trava o valor (ícone de cadeado); ↑ recupera valores recentes (Autodesk, trecho). SketchUp: digitar sem clicar na caixa e Enter; com vírgula decimal usa-se ";" (trecho). Onshape: digitar número + Enter após a geometria cria a cota (trecho). | Ao começar um traço, digitar já escreve na dica junto ao cursor (sem clicar). Formatos: `3,50` (comprimento na direção do cursor), Tab → ângulo, `@2;1,5` (relativo), `#10;20` (absoluto local). Enter confirma, Esc volta. Vírgula decimal pt-BR, separador ";". Unidade da interface (m/cm) com sufixo opcional. | MVP | Separador ";"; ângulo anti-horário a partir de +x |
| Capturas com glifo + rótulo | AutoCAD: marcador e dica com o nome da captura (Autodesk, trecho). Quadrado = extremidade, triângulo = meio, círculo = centro (Scan2CAD, trecho). X para interseção (não verificado). | □ extremidade, △ meio, ✕ interseção, ○ centro, ⊥ perpendicular, ⧖ mais próximo, ⊕ cruzamento de eixos, ◇ face/canto de pilar. Rótulo curto 300 ms após parar. Tab cicla entre candidatos sobrepostos. Prioridade: modelo > eixos > máscara. Raio de captura de 10 px CSS (16 px no toque). | MVP | Raio; prioridade |
| Rastreio / linhas-guia | AutoCAD: rastreio de captura. CYPE: extensão, perpendicular e paralelo (trecho). Figma: guias vermelhas de alinhamento e espaçamento; S (Win) suspende o snap (fórum, trecho). | Ao parar 250 ms sobre um ponto, ele vira referência. Linhas-guia horizontal, vertical e de extensão a partir dele, com interseção de duas guias capturável. Alt segurado suspende capturas. | MVP (H/V/extensão); V2 (paralelo/perpendicular a elemento) | — |
| Orto / polar | AutoCAD (F8/F10, não verificado). CYPE: Ctrl+O (trecho). | Shift segurado = orto temporário. F8 = orto fixo. Polar de 15° como padrão (configurável 5/15/30/45). Ângulo relativo ao eixo local do pavimento (pavimento girado). | MVP | Passo polar padrão |
| Pré-visualização fantasma | tldraw/Excalidraw: o elemento novo vai num canvas próprio ("NewElementCanvas", medido no código-fonte) | Seção do pilar acompanha o cursor; viga mostra o comprimento ao vivo; laje mostra o contorno fechado detectado sob o cursor antes do clique | MVP | — |
| Zoom no cursor, pan e zoom estendido | Pinça no trackpad chega como `wheel` com `ctrlKey`, precisa de `preventDefault` em listener não passivo; o leitor de PDF do Chromium ancora o zoom no mouse (trecho) | Roda = zoom ancorado no cursor. Pinça = zoom. Dois dedos = pan. Botão do meio ou Espaço+arrastar = pan. Duplo clique do meio ou `Z E` = zoom estendido. `Z J` = zoom janela. `Z A` = zoom anterior. | MVP | — |
| Seleção janela × cruzamento | AutoCAD: esquerda→direita seleciona só o que está inteiro dentro; direita→esquerda inclui o que toca; o cruzamento é tracejado (Autodesk, trecho) | Igual na lógica, com cores próprias (tabela 1.1). Shift soma, Ctrl alterna. Filtro por tipo no painel ("só vigas"). | MVP | — |
| Painel de propriedades contextual | Figma, Onshape (não verificado) | Painel à direita mostra só os campos do tipo selecionado. Multisseleção mostra "vários" nos valores diferentes e edita em lote. Unidade ao lado do campo. | MVP | — |
| Desfazer ilimitado | Todos | Patches do immer (já é dependência). Ctrl+Z/Ctrl+Y sem limite na sessão; histórico persistido no `.statikos` até N passos | MVP | N persistido |
| Erros no desenho | CYPE: contorno vermelho/amarelo por categoria + diálogo com a lista (trecho) | Marcador ⚠ no elemento, contagem na barra de status, lista que dá zoom no elemento. Erros de modelagem (laje aberta, viga sem apoio, pilar duplicado) aparecem já no lançamento. | MVP (modelagem); V2 (dimensionamento) | — |
| Onboarding na barra de status | Excalidraw: dicas com atalhos em destaque (commit "More prominent keyboard shortcuts in hints", trecho) | Uma linha contextual: "Viga: clique no 1º apoio · Tab ângulo · Esc sai". Dica some após 3 usos. | MVP | — |
| Máscara DXF por pavimento | CYPE: importar DXF/DWG como máscara por planta, camadas visíveis, esmaecer (trecho) | Importar DXF, escolher camadas, esmaecer, mover/girar/escalar (2 pontos), origem local automática. Pavimento de baixo como fantasma opcional. | MVP | — |
| Lançamento guiado por eixos | CYPE: pilar com ponto fixo + quadrante de crescimento (trecho) | Pilar no cruzamento de eixos com 1 clique. Teclas 1–9 do teclado numérico escolhem o ponto fixo (cantos/meios/centro). Viga "de pilar a pilar" com cadeia contínua. Laje por clique interno ao contorno fechado. | MVP | Ponto fixo padrão = centro? |
| Copiar entre pavimentos | (comum em CAD estrutural, não verificado) | Copiar seleção para pavimentos (lista com caixas); "pavimento tipo" repetido | V2 | — |
| Toque / tablet / caneta | Pointer Events (não verificado) | Pinça e 2 dedos. Toque longo = menu contextual. Mira deslocada 40 px acima do dedo (lupa) para captura precisa. Botões grandes de "Confirmar/Cancelar" na tela. Caneta = mouse com pressão ignorada. | V2 | — |
| Trackpad × mouse | `wheel` com `ctrlKey` (trecho) | Detectar trackpad (deltas fracionários/pequenos e `deltaMode` 0): 2 dedos = pan, pinça = zoom. Mouse: roda = zoom. Opção para inverter. | MVP | — |
| Medir / régua | AutoCAD DIST, Figma Alt+hover (trecho) | M: medir distância/ângulo, com captura; Alt sobre um elemento mostra a distância aos vizinhos | MVP | — |
| Repetir último comando | AutoCAD: Enter repete (não verificado) | Enter ou clique direito sem menu repete o último | V2 | — |
| Gerar vigas entre pilares alinhados | (assistente comum, não verificado) | Selecionar pilares + "ligar alinhados" | V3 | — |

---

### 3. Tecnologia de renderização

#### 3.1 O que a literatura e os produtos mostram
- **SVG × Canvas × WebGL.** Horak et al. (2018): SVG e Canvas quase empatados, com queda a partir de cerca de 10 mil elementos gráficos; WebGL quase plano, exceto com rótulos de texto (trecho). Benchmark multiplataforma de 2025 (PMC): DOM degrada já com cerca de 500 objetos animados, Canvas aguenta mais, WebGL é o mais estável até 10 mil (trecho).
- **tldraw.** Formas como elementos DOM/SVG com culling (`display:none` fora da tela) e índice espacial (trecho, docs). Na v4.4 os indicadores de seleção/hover passaram de SVG para Canvas 2D ("até 25× mais rápido em alguns cenários"), consultas por R-tree (RBush) em O(log n) e hit-test de hover desligado durante o movimento da câmera (release no GitHub, lido).
- **Excalidraw.** Três canvases separados: `StaticCanvas`, `InteractiveCanvas`, `NewElementCanvas`. Renderizadores `staticScene`, `interactiveScene`, `renderNewElementScene`, `renderSnaps`. O canvas estático é `React.memo` e só redesenha quando mudam zoom, scroll, elementos visíveis ou seleção. A resolução vem de `scale` (DPR): `canvas.width = largura × scale` (código-fonte, lido).
- **Figma.** Renderer próprio em WebGL, migrado para WebGPU (blog oficial, trecho). Motor em C++/WASM (fonte secundária, trecho).
- **Penpot.** Saiu do SVG por desempenho em arquivos grandes. Na 2.16 lançou renderer WebGL (Rust/WASM + Skia, tiles com cache e culling) em beta, com relatos mistos (trecho).
- **Onshape:** exige WebGL (help, trecho).
- **draw.io:** SVG (não verificado).

#### 3.2 Medições desta sessão (Chromium 141 headless, raster por software, 1600×900 CSS, DPR 2 → 3200×1800 px, 20 mil segmentos aleatórios com coordenadas UTM)

| Teste | Resultado |
|---|---|
| Canvas 2D, redesenho completo (1 `Path2D`, 1 `stroke`) | mediana 35,5 ms, p95 80 ms, cerca de 14 fps |
| Canvas 2D, pan sobre bitmap em cache (`drawImage` de OffscreenCanvas) | mediana 21,5 ms, cerca de 43 fps (inclui leitura forçada `getImageData`) |
| SVG com 20 mil `<line>`: criação | 833 ms |
| SVG com 20 mil `<line>`: pan por `transform` no `<g>` | cerca de 10,5 fps |
| SVG com 1 `<path>` de 20 mil segmentos: pan por `transform` | cerca de 56 fps |
| Flatbush, montar índice de 20 mil caixas | 41 ms (com aquecimento do JIT) |
| Captura: busca no índice (raio de 0,15 m, cerca de 13 candidatos) + distância ponto-segmento | **17 µs por consulta** (1000 consultas em 17 ms) |
| Erro de `float32` em x = 7 500 000,123 m | **0,123 m** → origem local é obrigatória para GPU |

**Leitura dos números.**
- Sem GPU, mesmo Canvas não chega a 60 fps redesenhando tudo a cada quadro. Com cache de bitmap durante o gesto, fica perto.
- Com GPU real os tempos caem bastante (não medido aqui).
- SVG com um elemento por segmento é inviável para a máscara (criação de quase 1 s e cerca de 10 fps).
- A captura não é gargalo.

#### 3.3 Recomendação
**Canvas 2D em camadas + DOM para textos editáveis.** Sem WebGL no MVP.

1. **Camada de máscara (estática).**
   - Um `Path2D` por camada do DXF, em coordenadas locais em metros.
   - Durante pan/zoom, desenhar o **bitmap em cache transformado** (translate/scale do snapshot). Ao parar o gesto (cerca de 120 ms) ou ao passar de ±2× de escala desde o último snapshot, redesenhar nítido.
   - Opcional V2: cache em tiles (como o Penpot) para máscaras > 100 mil segmentos.
2. **Camada do modelo.**
   - Pilares, vigas, lajes, cargas e eixos redesenhados quando o modelo ou a vista mudam.
   - Culling pelo índice espacial e agrupamento por estilo: um `Path2D` por tipo × estado, e poucas trocas de `strokeStyle`.
3. **Camada interativa.** Mira, glifos de captura, linhas-guia, fantasma, janela de seleção e realce de hover, redesenhados a cada `pointermove`, com custo pequeno (meta ≤ 2 ms).
4. **Sobreposição DOM.** Dica de entrada dinâmica (campos `<input>`), rótulos de captura, menu contextual. Texto nítido e acessível, sem desenhar texto editável no canvas.
5. **SVG continua para:** memorial, export, impressão (já existe em `drawing.ts`) e o editor de pórtico 2D atual, que tem poucas entidades.

**Renderização sob demanda.**
- Sem laço contínuo de `requestAnimationFrame`. Cada camada tem uma flag "suja", e um único rAF agrupa os pedidos.
- O `pointermove` é tratado fora do React (handlers imperativos lendo o store por `getState()`). React só nos painéis, com seletores do zustand para não re-renderizar a tela inteira.
- Hover não é testado durante o pan, como fez o tldraw.

**Índice espacial (medido localmente: bundle minificado com rolldown + gzip -9).**
- **Flatbush 4.6.2** (ISC): 6,5 KB min / **2,8 KB gz** com a dependência `flatqueue`.
  - É estático, ideal para a máscara (reconstruído na importação), e tem `neighbors()` (kNN).
  - README: indexa 1 milhão de retângulos em 109 ms (M1 Pro).
- **RBush 4.0.1** (MIT): 5,7 KB min / **2,2 KB gz**.
  - É dinâmico (insert/remove), ideal para os elementos do modelo, que mudam a cada edição.
  - Não tem kNN embutido (README).
- Recomendação: os dois, cerca de 5 KB gz no total. Ou só RBush, se a máscara for pequena.

**Hit-testing.**
- Caixa de busca = raio em px / escala. Depois, distância exata ponto-segmento e ponto-polígono em `float64`.
- Ordem de prioridade: tipo, depois distância, depois z-order.
- Lajes: ponto-em-polígono. Pilares: ponto-em-retângulo girado.

**Precisão numérica.**
- Modelo em metros, `float64` (padrão do JS).
- Na importação do DXF, calcular a **origem local**: canto inferior da caixa envolvente arredondado para 100 m. Guardar `origemDXF` no arquivo; coordenadas internas são locais.
- Exportar DXF somando a origem de volta.
- O Canvas 2D também guarda o caminho em precisão simples internamente, no Skia (não verificado). Com origem local, o erro fica < 1 µm em obra de 1 km.
- Para uma eventual GPU: RTC/origem flutuante (Cesium, xeokit, Speckle, trecho).

**HiDPI.**
- Tamanho do buffer = tamanho CSS × `devicePixelRatio`; `setTransform(dpr, …)`.
- Reagir à troca de DPR (mover a janela entre monitores) por `matchMedia('(resolution: Xdppx)')`.
- Espessura de linha em px de tela (`lineWidth = px/escala`). Linhas ortogonais de 1 px alinhadas a meio pixel.
- Limitar o DPR efetivo a 2 em telas grandes, por memória e por limite de área de canvas no iOS (não verificado).

**Trabalho fora da thread principal.**
- Parse do DXF e montagem do índice num Web Worker.
- OffscreenCanvas 2D em worker existe no Safari desde a 16.4 (WebKit bugzilla, trecho).
- Com `vite-plugin-singlefile`, o worker precisa ir inline (`?worker&inline`, blob URL) (não verificado).

**3D sob demanda e o HTML único.**
- O README do `vite-plugin-singlefile` (lido) avisa que *chunks* não inlinados (`import()` dinâmico) podem falhar em `file://` e que outro plugin pode ser mais adequado. A configuração recomendada é aplicada por padrão.
- Na prática, no HTML único o 3D carregado "sob demanda" fica embutido igual. Só a execução é adiada.
- three.js 0.186.1 (subconjunto mínimo: renderer + cena + caixas + linhas, medido): **535 KB min / 130 KB gz**. O bundle atual é de 659 KB, então o HTML quase dobraria.
- Pixi.js 8.22 inteiro: 841 KB min / 237 KB gz (medido).

**Opções para o 3D:**
- **(a)** Visualizador próprio em WebGL de prismas extrudados (pilar, viga, laje = caixas e polígonos extrudados com arestas), cerca de 15–25 KB min (estimativa, não medido). Atende a conferência visual. **Recomendada.**
- **(b)** three.js num chunk separado só no build do Netlify (o service worker faz o cache), com o artifact sem 3D.
- **(c)** Adiar o 3D para V2/V3.

---

### 4. Orçamento de desempenho

**Máquinas de referência:**
- **Ref-A:** notebook com GPU integrada (i5 de 8ª geração, Iris/UHD), Chrome atual, 1920×1080, DPR 1. [confirmar]
- **CI:** Chromium headless sem GPU (o ambiente desta medição).
  - Em CI vale **regressão relativa** (≤ +20% contra a linha de base salva), não o valor absoluto.

| Métrica | Meta Ref-A | Teto em CI (headless, DPR 2) | Como medir |
|---|---|---|---|
| Pan/zoom com 20 mil segmentos de máscara + 2 mil elementos | ≥ 55 fps; p95 do quadro ≤ 20 ms | ≥ 30 fps; p95 ≤ 40 ms | Roteiro Playwright com `mouse.wheel`/`mouse.move` por 3 s; intervalos de rAF |
| Redesenho nítido da máscara após o gesto | ≤ 16 ms | ≤ 50 ms (medido: 35,5) | `performance.measure` em volta do render da camada |
| Camada interativa por `pointermove` | ≤ 2 ms | ≤ 5 ms | idem |
| Captura (consulta + escolha) | média ≤ 0,2 ms, p99 ≤ 2 ms | idem (medido: 0,017 ms) | 1000 consultas em pontos aleatórios |
| Seleção por janela (5 mil elementos) | ≤ 5 ms | ≤ 15 ms | idem |
| Importar DXF de 5 MB (cerca de 20 mil entidades): parse + índice | ≤ 500 ms, sem tarefa longa > 50 ms na thread principal | ≤ 1,5 s | `PerformanceObserver` de `longtask` / `long-animation-frame` |
| Montar índice da máscara (20 mil) | ≤ 20 ms | ≤ 60 ms (medido: 41) | — |
| Desfazer/refazer | ≤ 16 ms | ≤ 40 ms | — |
| Heap com 100 mil segmentos de máscara | ≤ 150 MB | — | `performance.memory` / CDP `HeapProfiler` |
| Bundle do editor de planta (código novo, sem 3D) | ≤ 60 KB gz (cerca de 180 KB min) | — | `gzip -9` do diff do `dist/index.html` no CI |
| Índice espacial | ≤ 6 KB gz | — | medido: 2,8 + 2,2 |
| 3D | ≤ 30 KB gz (opção a) | — | — |

**Como medir (proposta para `e2e/perf.mjs`, fora do `npm test` e do build do Netlify):**
1. Gerador determinístico de cenas (semente fixa): N segmentos de máscara em coordenadas UTM, malha de pilares/vigas/lajes de K pavimentos. Carregado por um gancho de teste (`window.__statikosPerf.load(cena)`).
2. O app expõe `performance.mark/measure` por camada (`render:mascara`, `render:modelo`, `render:interativa`, `snap:query`) e um contador de quadros. O script coleta tudo com `page.evaluate`.
3. Gesto roteirizado: 60 passos de pan e 30 de zoom no cursor. Registra os intervalos de rAF, p50/p95/p99 e as tarefas longas (`PerformanceObserver` para `long-animation-frame`, Chrome ≥ 123, não verificado).
4. Teste de rampa, como recomenda o guia de gráficos do Chrome (trecho): dobrar N até o p95 passar de 16,7 ms e registrar a "capacidade" (segmentos a 60 fps). Isso é mais robusto do que medir fps máximo, que fica preso ao vsync.
5. CPU lenta: `Emulation.setCPUThrottlingRate` (4×) por CDP, para simular máquina fraca.
6. Linha de base em `e2e/perf-baseline.json`. Falha se o p95 piorar > 20% ou se o bundle do editor passar do teto. Opcional: gravar o trace do Chrome (`browser.startTracing`) para investigação.
7. O script de medição usado nesta pesquisa (Playwright + Flatbush) será refeito em `e2e/` na fatia 1, como benchmark do editor.

---

### 5. Fontes

**Abertas e lidas (GitHub, via WebFetch):**
- https://github.com/mourner/flatbush (ISC, estático, `neighbors`, benchmarks)
- https://github.com/mourner/rbush (MIT, dinâmico, benchmarks, sem kNN)
- https://github.com/richardtallent/vite-plugin-singlefile (avisos sobre chunks não inlinados, `useRecommendedBuildConfig`)
- https://github.com/tldraw/tldraw/releases/tag/v4.4.0 (indicadores em canvas, até 25×, RBush, hover desligado no pan)
- https://github.com/excalidraw/excalidraw/tree/master/packages/excalidraw/components/canvases (StaticCanvas, InteractiveCanvas, NewElementCanvas)
- https://github.com/excalidraw/excalidraw/tree/master/packages/excalidraw/renderer (staticScene, interactiveScene, renderSnaps…)
- https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/excalidraw/components/canvases/StaticCanvas.tsx (memo, escala DPR)
- Pacotes npm baixados e medidos localmente: three 0.186.1, flatbush 4.6.2, rbush 4.0.1, pixi.js 8.22.0

**Só trecho da busca (a página não abriu; proxy 403/DNS):**
- CYPE:
  - https://info.cype.com/es/novedad/valoracion-de-errores-en-vigas/
  - https://info.cype.com/en/subject/cypecad-beam-errors/
  - https://info.cype.com/en/new-feature/object-snap-tracking/
  - https://info.cype.com/en/subject/tools-to-assist-with-entering-elements/
  - https://info.cype.com/es/novedad/gestion-de-la-visibilidad-de-las-plantillas-en-la-ventana-de-configuracion-de-la-vista/
  - https://info.cype.com/es/tema/cypecad-mep-vista-3d/
  - https://info.cype.com/en/related_software/cypecad/page/4 (configuração de fundo por programa desde a 2022.a)
  - https://descargas.cype.es/Area_Descarga2005.htm (vigas brancas/pretas conforme o fundo; cores da máscara editáveis)
  - https://www.xyz-studio.com/wp-content/uploads/2018/10/Manual_CYPECAD.pdf (opção de esmaecer a máscara, camadas)
  - https://pdfcoffee.com/cypecad-multiplus-pdf-free.html (3 cores de fundo, cor por elemento)
  - https://www.cype.net/documentos_es/manuales/c3dejem01.pdf (pilares do material selecionado em vermelho)
  - https://learning.cype.com/en/documents/cypecad-user-manual/
  - https://www.youtube.com/shorts/J5A6v3Tzn3c (fundo escuro; só o título)
  - https://www.soloarquitectura.com/foros/threads/solucionar-errores-de-calculo-en-vigas-y-pilares.44301/
- Eberick:
  - https://suporte.altoqi.com.br/hc/pt-br/articles/360046063094 (cor de fundo e tamanho do cursor)
  - https://suporte.altoqi.com.br/hc/pt-br/articles/360043314113
  - https://suporte.altoqi.com.br/hc/pt-br/articles/14914911330071
- TQS:
  - https://docs.tqs.com.br/Docs/Details?id=3522&language=pt-br (cores por nível)
  - https://docs.tqs.com.br/Docs/PrintAllReport/3920?language=pt-BR
- Autodesk:
  - https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-LT/files/GUID-0DD5DA73-9DC5-4424-8FED-7BBE3BE52A4D.htm (janela × cruzamento)
  - https://help.autodesk.com/cloudhelp/2021/ENU/AutoCAD-LT/files/GUID-38EC86CF-D96A-455F-A5DE-2CDA23C28FC4.htm (entrada dinâmica)
  - https://help.autodesk.com/cloudhelp/2021/ENU/AutoCAD-LT/files/GUID-A265C30C-CFD8-405D-BEE2-257B379475E2.htm
  - https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-LT/files/GUID-50383F73-4F23-4F70-B4FC-52D5748D80AF.htm
  - https://www.scan2cad.com/blog/cad/autocad-osnap/ (glifos)
- SketchUp e Onshape:
  - https://forums.sketchup.com/t/cannot-enter-dimensions-into-length-box/70591
  - https://forums.sketchup.com/t/entering-all-dimensions-in-measurements-nee-vcb/37792
  - https://www.onshape.com/en/resource-center/tech-tips/tech-tip-adding-dimensions-while-you-sketch
  - https://cad.onshape.com/help/Content/webgl.htm
- Figma:
  - https://www.figma.com/blog/figma-rendering-powered-by-webgpu/
  - https://forum.figma.com/report-a-problem-6/ctrl-hotkey-not-working-to-disable-smart-guides-and-all-snapping-56373
- tldraw e Excalidraw:
  - https://tldraw.dev/sdk-features/performance (DNS falhou no WebFetch; trecho)
  - https://tldraw.dev/blog/release-notes-20240208
  - https://plus.excalidraw.com/how-to-start
- Penpot:
  - https://community.penpot.app/t/whats-next-for-the-penpot-webgl-renderer/10627
  - https://community.penpot.app/t/new-webgl-rendering-engine/10731
- Desempenho e precisão:
  - https://imld.de/cnt/uploads/Horak-2018-Graph-Performance.pdf
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC12843483/
  - https://developer.chrome.com/blog/how-to-measure-browser-graphics-performance/
  - https://dev.to/moondaeseung/lets-measure-performance-with-playwright-feat-chrome-trace-3ino
  - https://xeokit.io/blog/viewing-double-precision-models
  - https://speckle.systems/blog/speckles-take-on-spatial-jitter-2
  - https://github.com/liwcv/glTF/blob/master/extensions/1.0/Vendor/CESIUM_RTC/README.md
- Navegador e acessibilidade:
  - https://bugs.webkit.org/show_bug.cgi?id=183720 (OffscreenCanvas no Safari)
  - https://www.drupal.org/project/experience_builder/issues/3475749 (pinça = wheel+ctrlKey)
  - https://chromium.googlesource.com/chromium/src/+/lkgr/chrome/browser/resources/pdf/gesture_detector.ts
  - https://www.w3.org/WAI/WCAG22/Techniques/general/G207
  - https://dequeuniversity.com/resources/wcag2.1/1.4.11-non-text-contrast
  - https://cloudsmith.com/navigator/npm/flatbush
  - https://depscope.dev/pkg/npm/rbush

**Não encontrado:** página pública com a paleta padrão do CYPECAD em planta (cores de pilares, lajes, eixos, cotas, seleção e mira). Esses itens ficam "(não verificado)". O caminho é conferir em vídeos oficiais do canal CYPE ou numa instalação de avaliação.

**Matriz de daltonismo.** Machado, Oliveira & Fernandes (2009), *A Physiologically-based Model for Simulation of Color Vision Deficiency*, IEEE TVCG. Usada de memória no script, sem abrir a fonte (não verificado o valor exato da matriz).

---

