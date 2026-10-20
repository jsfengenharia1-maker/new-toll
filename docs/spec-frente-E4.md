# Spec — Frente E4 (escadas)

Base: 80 itens Parcial/Falta com frente E que a E1, a E2 e a E3 não alocaram, conferidos por script em 20/10/2026: 69 do manual do usuário (os 65 do cap. 8, mais C0.1, C1.33, C1.34 e C10.26) e 11 do de cálculo (K1.1.6, K1.2.10, K1.3.37 a K1.3.41, K1.4.78, K1.9.116, K1.10.10 e o geral K1.11.58). Cada id está em exatamente uma fatia abaixo, sem sobra nem repetição (E3 + E4 = os 228 itens E restantes). Nos checklists a frente continua "E" e a nota de cada item leva a fatia, ex. "[E4c]". Pronta para execução direta, sem aprovação por fatia (`plano-execucao.md`, "Regras de execução").

## Regras de toda a E4

- **Paridade de função, nunca de implementação.** Nomes, textos, tabelas, ícones e disposição de tela próprios.
- **Escada como elemento isolado** (decisão do programa de referência, adotada): a escada é calculada à parte, só com os casos gravitacionais (permanente e variável), e entrega reações como cargas lineares e/ou de superfície aos elementos de apoio; não entra na análise global (a influência das ações horizontais sobre ela é grande e fora da prática usual). Os resultados da escada, porém, entram no cálculo da obra antes das demais lajes e vigas.
- **Premissas.** Padrão do sistema = critério do programa de referência onde os checklists ou `pesquisa-edificios.md` o registram; NBR 6118 (lajes, 18 e 19), NBR 6120 (sobrecarga de escadas), NBR 9077 e NBR 9050 (dimensões de degraus e patamares, para avisos) onde não registram (`padraoNBR`/`fonteNBR` quando diferem); sem fonte = "a confirmar". Valores: sobrecarga 2,5 kN/m² (sem acesso público) e 3,0 kN/m² (com acesso público) [NBR 6120, a confirmar], revestimento 1,0 kN/m², concreto 25 kN/m³, alvenaria e concreto de apoio do patamar pelos pesos específicos já usados na obra (`BLOCOS`, 25 kN/m³); corrimão em kN/m informado pelo usuário.
- **Opções** em `opcoes.ts`; **comandos** novos com `mcp: false`, schema, `validar`, mensagem e exemplo em `EXEMPLOS`; nenhuma ferramenta MCP nova (o `dimensionar` ganha o resumo de escadas por lance: reações e armadura; `docs/ia.md` atualizado).
- **Modelo:** `b.escadas[]` e `b.tiposLance[]` em `BuildingModel`, com `normalizarEdificio` e versão do arquivo; só o que difere do padrão é gravado. A biblioteca do usuário (`storage.ts`) ganha o tipo `tiposLance`.
- **Interface** só com `src/app/ui` e `src/app/design/global.css` (tokens novos `--escada-*`); ferramentas e camadas na `Planta.tsx`, estado no `plantaStore`; janelas como as da R1.
- **Revisão:** códigos `ESCADA_*` em `CODIGOS_REVISAO`; `TipoRevisao` ganha `escada`.
- **Aceite de cada fatia:** testes numéricos contra cálculo manual ou OpenSees (casca), regressão do exemplo (`src/core/sheets/exemplo.ts`; sem escada nada muda), e2e próprio (`E4a` … `E4e`), memorial, pranchas e checklists atualizados; `checklists.test.ts` verde.

## Fatias

| Fatia | Conteúdo | Itens | Classe núcleo | Classe interface | Depende de |
|---|---|---|---|---|---|
| E4a | Modelo e tipos: dados comuns, geometria, tipologias, tipos de lance, apoios do patamar, cargas | 26 | S2 | S2 | — |
| E4b | Lançamento, edição e biblioteca: inserção na planta, copiar, mover, girar, apagar, tipos de lance na biblioteca | 20 | S2 | S2 | E4a; L1 (guia de etapas, para C1.33) |
| E4c | Cálculo: casca espessa, apoios, reações como cargas, ordem do cálculo | 15 | S3 | S1 | E4a, E4b; N2b (casca e malha triangular) |
| E4d | Armadura e detalhamento: opções, esperas, passadores, ancoragem na viga chata e na fundação | 11 | S3 | S1 | E4c; R7d (rotinas de armadura de laje) |
| E4e | Relatório, desenhos, conferência 3D, quadros e fechamento da frente E | 8 | S2 | S1 | E4d; V1 (vista 3D), V4 (isovalores), V5 (prancha de cargas) |

Ordem: E4a → E4b → E4c → E4d → E4e (onda 5 da lane 1; a E4e roda por último, depois de V1, V4 e V5). A casca da N2b é reaproveitada, então o núcleo da E4c é S3 e não O; sobe para O só pela regra de escalonamento (duas falhas de verificação ou dúvida numérica).

---

### E4a — Modelo e tipos (26 itens)

- **Itens:** C8.3, C8.4, C8.8, C8.9, C8.10, C8.11, C8.12, C8.13, C8.14, C8.15, C8.16, C8.18, C8.19, C8.20, C8.21, C8.22, C8.23, C8.24, C8.25, C8.26, C8.27, C8.28, C8.29, C8.30, C8.31, C8.32.
- **Já existe (não refazer):** `BLOCOS` e pesos de alvenaria (`lajes.ts`), `peDireito`, cotas dos pavimentos e grupos, cargas lineares e de superfície (`carga.linha`, `carga.area`), `concretoDe`/`fckDe` (`materiais.ts`), `normalizarEdificio`, `biblioteca` do usuário (`storage.ts`).
- **Núcleo:** `src/core/building/escadas.ts`.
  - *Escada* (C8.4, C8.8–C8.14): `Escada { id, nome, grupo, origem, angulo, largura, piso, espelho, giro ('esq' | 'dir' ao subir), ultimoDegrau ('patamar' | 'laje'), execucao ('concretados' | 'alvenaria'), corrimao, revestimento, sobrecarga, lances[] }`. Conceitos: escada = conjunto de lances entre pisos de uma circulação vertical; lance = trecho inclinado de degraus contínuos; patamar intermediário = plano horizontal entre dois lances. Os dados comuns valem para todos os lances; partes com dados diferentes (outra carga, por exemplo) viram escadas separadas. Largura = comprimento dos degraus; piso (passo em planta) e espelho; giro ao subir; posição do último degrau (formado pelo patamar ou sobre a laje inclinada); execução dos degraus concretados com a laje ou em alvenaria (afeta o peso próprio e o volume de concreto); peso de corrimãos (total, um ou dois), revestimento e sobrecarga.
  - *Lance e tipo de lance* (C8.15, C8.16, C8.18–C8.25): cada lance tem espessura, cota inicial, tipologia e número de degraus próprios, escolhidos em `TipoLance`: referência (nome); espessura dada ou pré-dimensionada como 1/30 do maior vão real entre apoios (C8.19); desnível no início do lance (≥ 10 cm; ex.: escada que nasce na fundação e atravessa o contrapiso); número de degraus iniciais construídos sobre o piso (gera reação uniforme de superfície, a carga permanente média dos degraus, sem sobrecarga, porque o piso já a tem); tipologia; número de degraus de cada trecho; largura do vão central (poço), só com patamar de meia-volta; número de degraus construídos sobre o patamar intermediário.
  - *Tipologias* (C8.3, C8.22, C8.23): lance reto; dois lances com patamar de meia-volta; três lances com patamares de quarto de volta; dois lances com patamar de volta inteira; dois lances consecutivos com patamar intermediário; n lances com patamares de meia-volta; n lances com patamares de quarto de volta. `geometriaEscada(escada, tipos, b)` gera lances e patamares como polígonos 3D (pontos de início e fim, cotas), contorno em planta, degraus e a altura vencida; erro `ESCADA_ALTURA` quando n degraus × espelho (mais o desnível inicial) não fecha o desnível entre pisos (tolerância 1 mm); avisos `ESCADA_BLONDEL` (63 ≤ 2e + p ≤ 64 cm, NBR 9077 [a confirmar]) e de largura e espelho (NBR 9050 [a confirmar]), configuráveis.
  - *Apoios do patamar* (C8.26–C8.30): patamar apoiado ou livre; apoio frontal, lateral ou ambos, com tipo e largura: tirante pendurado em elemento do piso de cima (a largura serve para somar o peso da alvenaria entre o patamar e o piso superior); parede de alvenaria ou de concreto (peso pela largura dada e pela altura entre o patamar e o piso de baixo, aplicado no elemento sob a borda apoiada); parede entre o patamar e o piso de cima lançada pelo usuário como carga linear (aviso `ESCADA_PAREDE_SUP`); conectores de cisalhamento em viga ou muro, que recebem a reação de extremidade.
  - *Repetição* (C8.31, C8.32): número de lances iguais consecutivos (pavimentos seguidos com o mesmo tipo de lance) e número ilimitado de lances por escada.
  - *Cargas próprias*: peso por m² de superfície inclinada = γc·h + degraus (concretados: triângulo de altura média e/2; em alvenaria: peso da alvenaria), mais revestimento, corrimão e sobrecarga referidos à projeção horizontal para a verificação das reações.
- **Comandos:** `escada.criar` e `escada.dados` (dados comuns), `lance.criar/editar/remover`, `tipoLance.criar/editar/copiar/remover`.
- **Interface:** janela "Nova escada" com as duas abas, Dados comuns e Lances (C8.6 na E4b), formulários com `NumField`/`Select` do design system, prévia em SVG da planta e do corte longitudinal, mensagens de erro geométrico em vermelho.
- **Memorial:** dados comuns, tipos de lance, geometria resultante e cargas.
- **Pranchas:** nenhuma ainda (E4e).
- **Testes de aceite:** lance reto, dois lances com meia-volta e três com quarto de volta contra o cálculo manual das cotas e dos contornos; espessura 1/30 do maior vão; degraus iniciais geram a carga de superfície; peso próprio concretado × alvenaria; `ESCADA_ALTURA` e `ESCADA_BLONDEL`; tipo bloqueado ao ser usado (E4b); e2e `E4a`.
- **Premissas:** 1/30 do vão, desnível inicial ≥ 10 cm, 2,5/3,0 kN/m², Blondel 63 a 64 cm [a confirmar]; premissa `escadas`.

### E4b — Lançamento, edição e biblioteca (20 itens)

- **Itens:** C1.33, C8.5, C8.6, C8.7, C8.17, C8.33, C8.34, C8.35, C8.36, C8.38, C8.39, C8.40, C8.41, C8.42, C8.43, C8.44, C8.45, C8.46, C8.47, C8.48.
- **Já existe (não refazer):** capturas (`IndiceCaptura`, tipos de captura), modo ortogonal e entrada digitada (`geom/`), máscara DXF por grupo e capturas do gabarito, ferramentas da planta e seu estado (`plantaStore`), `pilar.mover`/`pilar.copiar` como modelo de comandos, janelas de elemento (R1), biblioteca do usuário.
- **Núcleo:**
  - *Comandos de edição* (C8.45–C8.48): `escada.editar`, `escada.mover` (por ponto de referência, com capturas do gabarito), `escada.girar` (em torno do início do lance no grupo atual, por ponto ou ângulo digitado), `escada.remover` (uma ou várias, por clique ou janela de captura), `escada.copiarDe` (copia os dados de uma escada visível no pavimento atual, inclusive os lances, para depois ajustar; ex.: escada simétrica trocando o sentido de giro, C8.39), `lance.duplicar` (o lance duplicado vai para o topo da lista, fisicamente acima dos demais, C8.41).
  - *Tipos de lance* (C8.17, C8.40, C8.42–C8.44): os tipos ficam na biblioteca da obra, reutilizáveis em vários lances e escadas; lista de predefinidos e do usuário, escolhível na janela do lance e na de nova escada; copiar tipo com nova referência; editar tipo bloqueado enquanto usado em outro lance (para evitar alteração involuntária), com desbloqueio manual; biblioteca do usuário (`storage.ts`, tipo `tiposLance`): exportar da obra e importar em outras obras, e importar/exportar `.json`.
  - *Inserção* (C8.7, C8.33–C8.36, C8.38): a escada nova começa no grupo atual (indicado na janela); o primeiro lance acompanha o cursor, o clique fixa o início, a escada gira em torno dele e o segundo clique define a direção; capturas do gabarito DXF/DWG e ortogonal; inserção repetida de escadas iguais com referências numeradas em sequência (botão direito ou Esc encerra); mensagem de erro geométrico na inserção; os dados da última escada lançada ficam como padrão enquanto a obra não muda e o programa não fecha (`plantaStore`).
  - *Menu e janela* (C8.5, C8.6, C1.33): menu flutuante da ferramenta Escada (criar, editar, apagar, mover, girar, ver detalhe de armadura de todos os lances e ver esforços e deslocamentos por isovalores); o passo "escadas" aparece no guia de etapas da obra (L1) com o estado calculado.
- **Comandos:** os acima, `mcp: false`.
- **Interface:** ferramenta Escada na `Planta.tsx` (atalho a definir sem conflito), prévia do contorno ao acompanhar o cursor, camada de escadas (contorno, setas de subida, degraus em traço fino, referências), seleção, janelas de edição; editor da biblioteca com bloqueio.
- **Memorial:** lista de escadas por grupo.
- **Pranchas:** escadas e setas de subida nas formas e na locação (contorno e sentido).
- **Testes de aceite:** inserir, mover, girar e copiar mantêm a geometria (contornos transformados por rotação e translação, tolerância 1e-9); duplicar lance no topo; tipo bloqueado recusa edição e desbloqueia; exportar e importar a biblioteca; inserção repetida numera em sequência; desfazer em cada passo; e2e `E4b`.
- **Premissas:** atalho da ferramenta e comportamento do botão direito próprios; premissa `escadas` (mesma da E4a).

### E4c — Cálculo (15 itens)

- **Itens:** C8.1, C8.2, C8.50, C8.52, C8.53, C8.56, K1.1.6, K1.2.10, K1.3.37, K1.3.38, K1.3.39, K1.3.40, K1.3.41, K1.9.116, K1.10.10.
- **Já existe (não refazer):** `fe3d.ts` (barras 3D, molas, mestre-escravo), casca de 6 nós, malha triangular e regra do diafragma (N2b), Wood-Armer (`woodArmer`), `calculo.worker.ts` e o cache por `revCalculo`, `Comando.calculo`, cargas por caso, `fckDe` (concreto das lajes).
- **Núcleo:** `src/core/building/escadasCalculo.ts`.
  - *Modelo por elementos finitos* (C8.1, C8.50, K1.2.10, K1.3.37): cada escada é um modelo à parte com 6 gdl por nó, de casca espessa triangular (N2b) nos lances inclinados e nos patamares, com malha triangular dos polígonos da E4a (tamanho alvo editável, `malhaCasca`); hipóteses de peso próprio/permanente e de sobrecarga (casos G e Q); as cargas de superfície vão como pressões sobre a casca e as lineares do corrimão como cargas de borda.
  - *Apoios* (K1.3.38): apoios inicial e final simulados como laje apoiada em viga de rigidez elevada (apoio linear, rigidez penalizada como nas barras rígidas, × 10⁶); apoios intermediários (patamar) por apoios elásticos que representam a alvenaria ou os tirantes (rigidez EA/L ou a da parede); patamar livre sem apoio; conectores de cisalhamento como apoio vertical pontual.
  - *Casos e fora da análise global* (K1.3.39, K1.3.41): só casos gravitacionais; a escada não participa do vento nem da análise espacial (justificativa registrada no memorial: a influência das forças horizontais sobre ela é grande e fora da prática usual).
  - *Reações como cargas* (C8.2, K1.3.40, K1.10.10, K1.1.6): as reações nos apoios inferior, superior e intermediários viram cargas lineares uniformes (kN/m) e/ou de superfície nos casos permanente e variável, aplicadas às ligações no resto da estrutura (viga, laje, parede, fundação) como `carga.linha`/`carga.area` geradas e marcadas com a origem; sem cálculo integrado.
  - *Ordem* (C8.52, C8.53): `calcularEscadas` roda antes da análise do edifício no worker para aplicar as reações; o cálculo individual antes do da obra (botão e menu da planta); aviso `ESCADA_RECALCULAR` quando uma escada muda de forma que altere as reações (`Comando.calculo = true` nos comandos `escada.*` e `lance.*`).
  - *Materiais* (C8.56): concreto da escada igual ao das lajes (`fckDe(b, 'laje')`), com cobrimento e aço da obra.
  - *Documentação* (K1.9.116): o memorial ganha o capítulo "Escadas" próprio.
- **Comandos:** nenhum novo; `escada.*` e `lance.*` passam a invalidar o cálculo.
- **Interface:** botão "Calcular escada" no menu da ferramenta; aviso de recálculo; tabela de reações por apoio e caso (S1).
- **Memorial:** capítulo "Escadas": modelo, malha, apoios, reações, esforços máximos e deslocamentos.
- **Pranchas:** nenhuma ainda (E4e).
- **Testes de aceite:** lance reto biapoiado sob carga uniforme contra a solução analítica (momento q·ℓ²/8 por metro, com ℓ o vão horizontal); escada em L com patamar contra o OpenSees (novo `validation/opensees/escada.py`, casca triangular DKGT ou quadrangular MITC4); equilíbrio global (soma das reações = carga total, erro < 1e-6); apoio intermediário elástico; reações viram cargas nas vigas e a análise do edifício muda como esperado; e2e `E4c`.
- **Premissas:** rigidez penalizada dos apoios, rigidez dos tirantes e das alvenarias [a confirmar]; casca da N2b reaproveitada.

### E4d — Armadura e detalhamento (11 itens)

- **Itens:** C8.49, C8.57, C8.58, C8.59, C8.60, C8.61, C8.62, C8.63, C8.64, C8.65, K1.4.78.
- **Já existe (não refazer):** armadura de lajes maciças por direção da malha (R4), `woodArmer`, bloqueio e edição (R2), comprimentos de ancoragem (`lbBasico`, `lbNecessario`), tabelas de aço (`armacao.ts`), cobrimento por CAA (`cobrimentoLaje`), pilares e vigas de apoio.
- **Núcleo:** `src/core/building/escadasArmadura.ts`.
  - *Armadura do lance* (C8.49): armadura principal na direção do lance e de distribuição, inferior e superior, por lance; Wood-Armer dos momentos da casca; mínimo de 0,15 % (ρmín das lajes); bitolas e espaçamentos pelas opções das lajes; patamar com a mesma lógica; encontro lance-patamar tratado como canto reentrante (as barras tracionadas não podem ser contínuas na quina côncava: duas barras cruzadas e ancoradas ou emenda, NBR 6118 [a confirmar o item]).
  - *Opções* (C8.57–C8.60): aço e tabelas de armadura das escadas (gestão de tabelas como as da R7a); igualar as armaduras superior e inferior pelo maior valor; espaçamentos superior e inferior múltiplos entre si; igualar a armadura de todas as seções do lance (longitudinais e transversais), superior e depois inferior.
  - *Ligações* (C8.61–C8.65, K1.4.78): arranques (esperas) no início do lance; barras de ligação (passadores) no fim da laje; comprimento disponível para ancorar as esperas do primeiro lance em viga chata (se maior que o necessário dobra as barras; a largura da viga prevalece se maior); cobrimento nominal conforme a agressividade; profundidade de fundação para ancorar o início do lance quando não há elemento de fundação sob ele; altura da fundação e ancoragem na laje.
- **Comandos:** `escada.armadura` (editar e bloquear, como a R2), `escada.opcoesArmadura`.
- **Interface:** janela "Armadura da escada" com seleção do lance (calcula na hora se for a primeira vez ou se houve mudança): elevação e planta do lance em SVG, posições, tabelas, edição e bloqueio, igualações; opções das ligações.
- **Memorial:** armaduras por lance, ancoragens, esperas e passadores.
- **Pranchas:** nenhuma ainda (E4e).
- **Testes de aceite:** lance biapoiado: As contra cálculo manual; igualação superior/inferior; espaçamentos múltiplos; ancoragem em viga chata (largura menor que lb gera dobra); fundação sem elemento sob o lance; bloqueio e recálculo; e2e `E4d`.
- **Premissas:** quina côncava e ρmín (premissa `armadura-escadas`); comprimentos de espera e passador [a confirmar].

### E4e — Relatório, desenhos, conferência 3D e fechamento da frente E (8 itens)

- **Itens:** C8.37, C8.51, C8.54, C8.55, C0.1, C1.34, C10.26, K1.11.58.
- **Já existe (não refazer):** infraestrutura de pranchas e tabelas de aço (`armacao.ts`, R5), quadro de pilares agrupado (R3b, R5), carimbo com sigla, memorial HTML e `MEMO_CSS`, prancha de locação com cargas dos pilares (`cargasDosPilares`).
- **Núcleo:**
  - *Relatório* (C8.54): dados gerais (materiais, norma), dados comuns (geometria, cargas) e por lance (reações, armaduras e esforços em cada seção).
  - *Desenho de detalhe* (C8.55): `montarPranchasEscadas` com cortes longitudinais e transversais de cada escada, quadro de propriedades por lance (geometria, cargas, materiais) e quadros de aço por escada, por lance e total; sigla de carimbo própria [a confirmar, SCE]; entra no `montarConjunto` depois das lajes; DXF/DWG pelo mesmo caminho.
  - *Conferência 3D e isovalores* (C8.37, C8.51): a vista 3D do edifício e do pavimento mostra a escada (forma e interferências) pelo gerador de malhas da V1; a vista do lance com isovalores de esforços e deslocamentos usa o componente de isovalores da V4 (planta do lance desdobrada e vista 3D).
  - *Cargas especiais por grupo* (C10.26): a prancha de cargas da V5 passa a incluir as reações das escadas e as cargas permanentes e variáveis por grupo; nos demais desenhos as cargas só aparecem se o usuário configurar (`prancha.cargas`).
  - *Itens gerais de fechamento da frente E* (C0.1, C1.34, K1.11.58): auditoria da frente contra o código. C0.1 (programa para edifícios com análise espacial, dimensionamento, edição de armaduras e desenhos) passa a Feito com a nota "aço fora"; K1.11.58 (quadro de pilares e placas de base) passa a Feito com a nota "placas de base: aço fora; quadro de pilares de concreto feito (R3b, R5, E1d)"; C1.34 (estruturas 3D integradas no módulo de barras metálicas 3D) passa a Fora, pelo escopo já decidido (aço no edifício). Os resumos dos dois checklists e `plano-frentes.md` são recontados.
- **Comandos:** `prancha.definir` ampliado (`escadas`, `cargas`), sem comando novo de cálculo.
- **Interface:** abas e botões de relatório da escada na janela do elemento, tipo de prancha "escadas" em Pranchas, vista 3D e isovalores abertos pelo menu da ferramenta.
- **Memorial:** capítulo de escadas completo, tabela de aço de escadas no resumo geral.
- **Pranchas:** prancha de escadas (cortes, quadro de propriedades e aço), escadas nas formas, reações na prancha de cargas.
- **Testes de aceite:** prancha de escadas (montagem, tabela de aço somando com o resumo, DXF auditado por `validation/dxf/auditar.py`); relatório com as três seções; escada visível na cena 3D (contagem de objetos); isovalores do lance; contagens dos checklists após a reclassificação; e2e `E4e`.
- **Premissas:** sigla da prancha, representação dos cortes [a confirmar]; não há folha de referência de escadas entre as pranchas do usuário.

---

## Riscos e pontos que exigiriam o usuário

- **Prancha de escadas:** sem folha de referência do usuário; o desenho segue o padrão da R5 e fica "a confirmar" (como tubulão e radier na FU). Um exemplo fecharia o ponto.
- **Casca da N2b:** a E4c espera a casca espessa triangular; se ela não estiver pronta, a E4a e a E4b seguem e a E4c aguarda, sem bloquear as outras lanes.
- **Apoios elásticos e tirantes:** valores de rigidez sem fonte; ficam editáveis e "a confirmar".
- **E4e depende de V1, V4 e V5:** o orquestrador roda a E4e depois delas.
- Nenhuma dependência nova.
