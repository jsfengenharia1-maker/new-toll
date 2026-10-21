# Statikos para agentes de IA (linha de comando e MCP)

O módulo Edifícios foi feito para ser operado por pessoas e por agentes com as mesmas regras. Há três portas para o mesmo núcleo (`src/core`) e o mesmo registro de comandos:

| Porta | Para quê | Onde |
|---|---|---|
| Interface web | lançamento na planta, prévia das pranchas | aba Edifício |
| Linha de comando | lotes, integração contínua, scripts | `node dist-cli/statikos.mjs` |
| Servidor MCP (stdio) | agentes (Claude Code, Claude Desktop, outros clientes MCP) | `node dist-cli/statikos.mjs mcp` |

Toda alteração do edifício é um **comando** com JSON Schema, validação, desfazer e registro no log do arquivo `.statikos`. O log reconstrói o modelo (replay). Não existe execução de código livre.

## Instalar e ligar

```bash
npm i
npm run cli                     # gera dist-cli/statikos.mjs (Node ≥ 20)
node dist-cli/statikos.mjs      # ajuda
```

Claude Code:

```bash
claude mcp add statikos -- node /caminho/para/new-toll/dist-cli/statikos.mjs mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{ "mcpServers": { "statikos": { "command": "node", "args": ["/caminho/para/new-toll/dist-cli/statikos.mjs", "mcp"] } } }
```

O servidor trabalha sobre um edifício em memória. Abra um arquivo com `abrir` ou comece com `novo`, e grave com `salvar`. O DWG usa `public/vendor/nasjidwg-*.mjs`, que precisa estar ao lado de `dist-cli/` (o repositório já o traz).

## Regra de ouro: prévia, depois aplicar

1. A ferramenta de um comando (ex.: `pilar_inserir`) **não altera nada**. Ela devolve `{ ok, diff: { criados, alterados, removidos, resumo }, token, diagnosticos }`.
2. Mostre o `diff.resumo` ao usuário quando a mudança for relevante.
3. `aplicar { token }` executa. O token vale só para a revisão do modelo em que a prévia foi feita.
4. Ferramentas marcadas como destrutivas (`destructiveHint`) removem dados: confirme com o usuário antes de aplicar.
5. `desfazer` e `refazer` estão sempre disponíveis.

Comandos sem ferramenta própria (o limite é de 40 ferramentas) passam pela prévia genérica: `previa { comando: "prancha.definir", params: {...} }`. A lista completa, com schemas, sai da ferramenta `comandos`.

Opções de cálculo (malha da grelha, torção de vigas, lajes e pilares, rigidez axial dos pilares, trecho rígido, engaste no topo do último lance): `previa { comando: "opcoes.definir", params: { valores: { malha: 0.25 } } }`; `{ padrao: true }` volta tudo ao padrão. Vínculos por elemento: `pilar.engaste { ids, pavimentos?, topo?, base? }` (pela `previa`), `viga_editar` com `engasteIni`, `engasteFim`, `articulacoes`, `torcaoEquilibrio`, `engasteLajes`, `foraDiafragma`, e `laje.editar` com `engasteBordas` (um coeficiente por aresta do contorno). Casos de carga e cargas nos pilares (frente N1c), todos pela `previa`: `caso.criar { nome, natureza: G|Q|W|E, grupo?, simultaneo?, psi? }` (casos com o mesmo `grupo` nunca atuam juntos; `simultaneo` = id do caso que recebe o mesmo fator), `caso.editar { id, ... }` (grupo ou simultâneo vazios limpam), `caso.remover { id }` (remove também as cargas lançadas nele), `carga.pilar { pilar, caso, pavimento?, altura?, N?, Hx?, Hy?, Mx?, My? }` (eixos globais, N de compressão positivo, sem `altura` = topo do lance) e `carga.pilarRemover { ids }`; as cargas da planta (`carga.ponto`, `carga.linha`, `carga.area`) aceitam em `caso` o id de um caso adicional. As combinações geradas (incluindo as excepcionais, de nome "ELU excepcional …") aparecem na aba Análise e podem ser exportadas em CSV. Vento (`vento_definir` ou `vento.definir`): além de `ativo`, `v0`, `s1`, `s3`, `categoria`, `caX`, `caY` e `excentricidade`, aceita `sentido { xp, xn, yp, yn }` (multiplicador da força em cada sentido, padrão 1; edifício abrigado por vizinho), `vizinhanca` (1 a 1,3, NBR 6123, 6.4) e `platibanda` (m, somada à faixa do último pavimento); valor 1 (ou 0 na platibanda) volta ao padrão. Com zonas independentes, o vento do pavimento é repartido entre as zonas por Bi = bi/Σb·B (`forcas[].zona` na análise). Opções novas em `opcoes.definir` (chaves em `valores`): `zonasIndependentes` (0/1), `limiteGamaZ`, `woodArmer` (0/1), `t0Flecha` (meses), `fatorFlechaLaje` (padrão 2,5; 0 = método da NBR), `limiteFlechaTotal` (ℓ/…, padrão 250) e `limiteFlechaSensorial` (ℓ/…, padrão 350). Detalhamento das vigas (frente R3a): `dimensionar` devolve também `resumoAcoVigas` (lista de `{ aco, phi, comprimento, peso, pesoComPerdas }` por aço e bitola, com as repetições dos grupos de pavimentos e as perdas da opção `perdasAco`; o detalhamento barra a barra fica na interface e no memorial, não na ferramenta). Opções novas em `opcoes.definir`: `barraMaxima` (m, padrão 12), `arredondamento` (cm, padrão 5), `perdasAco` (%, padrão 10) e `bitolaMontagem` (mm, padrão 8). Cópia da armadura bloqueada de uma viga para outras (mesmo grupo), pela `previa`: `viga.copiarArmadura { de, para: [ids] }` (a viga de origem precisa ter armadura bloqueada; depois chame `dimensionar` para verificar cada destino). `dimensionar` devolve, por viga, `flecha`, `limite`, `flechaQ` e `limiteQ` (m) e, por laje, `flecha`, `limite`, `flechaQ` e `limiteQ`. Materiais e segurança: `materiais.definir { fck, fckPilarPav, aco, gamas, cobFaces, cobFundacao, padrao }` (`fck.fundacao` e `aco.fundacao` = concreto e aço de sapatas e blocos, padrão os da obra; `cobFundacao` em cm, padrão 5) e flambagem `pilar.flambagem { ids, pavimentos?, au?, av? }` (ambos pela `previa`). O padrão segue a NBR 6118; os valores sem norma são "a confirmar" (ver `statikos://premissas`).

Opções do detalhamento dos pilares (R3b, `opcoes.definir`, em `valores`): `continuidadePilares` (0 ou 1, padrão 1: do penúltimo lance para baixo a armadura e a bitola de canto não diminuem), `pilarBarraMaxima` (m, padrão 8), `pilarUniaoLances` (m, padrão 4: lances consecutivos iguais com barras corridas) e `ancoragemReduzidaTopo` (0 ou 1, padrão 1). O detalhamento completo (`detalhesPilares`) não vai pelo MCP; só o resumo de aço.

Detalhamento das vigas (R7b): opções `viga*` em `opcoes.definir` (`vigaReducaoLb`, `vigaNegativoVao`, `vigaReforcoVao`, `vigaSimetriaNegativos`, `vigaNegativosUnir`, `vigaMontagemContinua`, `vigaMontagemColaborante`, `vigaMontagemGancho`, `vigaMontagemEixo`, `vigaPernaGancho`, `vigaEstriboExtensao`, `vigaEstriboZonaMin`, `vigaEstriboSimetria`, `vigaFatorEmenda`, `vigaDesnivelLimite`; o perfil NBR desliga as que mudam o detalhamento) e comandos `viga.detalhe` (extremos, ganchos e perna por posição, bitola/espaçamento/ramos por zona de estribos, fator de emenda; `remover: true`) e `viga.tramo` (`ids` de vigas consecutivas e alinhadas; `remover`), via `previa`/`comandos`. Erros ESTRIBO_BITOLA e DETALHE_INSUF; avisos DESNIVEL_LONG, TRAMO_IGNORADO e DETALHE_IGNORADO.

Detalhamento das lajes maciças (R4): `dimensionar` devolve também `resumoAcoLajes` (mesma forma do das vigas; com as repetições dos grupos e as perdas de `perdasAco`); o detalhamento posição a posição (`detalhesLajes`) fica na interface e no memorial. Opções em `opcoes.definir` (em `valores`): `lajeNegativoVao` (% do maior vão, padrão 25; perfil NBR 0), `lajeNegativoBorda` (% do menor vão, padrão 15), `lajeDecalagem` (× d, padrão 1,5), `lajeBitolaMinima` (mm, padrão 5), `lajeEspacamentoMinimo` (cm, padrão 10), `lajeArmaduraCanto` (0 ou 1, padrão 1) e `lajePernasNegativos` (0 ou 1, padrão 1).

Lajes treliçadas (R6): `dimensionar` devolve `vigotas` (um resumo por laje treliçada: `trelica`, `vigotas`, `grupos` de igualação com `vigotas`, `L`, `mPos`, `mNeg` [início, fim], `v` [início, fim] por nervura em kN·m e kN, `adicional` { n, phi, As } por nervura, `negativos` com barras e comprimento a partir do eixo do apoio, `macico` em m; `distribuicao` da capa, `bloqueada`, `peso` e `pesoTrelica`), `resumoAcoVigotas` (mesma forma dos outros resumos) e `trelicas` (comprimento e peso por tipo de treliça). Os alinhamentos e diagramas por vigota ficam na interface. Erros e avisos das vigotas vão para `mensagens` da laje (códigos VIGOTA_POS, VIGOTA_NEG, VIGOTA_NEG_AS, VIGOTA_CORTANTE, VIGOTA_ALTURA, VIGOTA_CAPA, erros; VIGOTA_MACICO e VIGOTA_APOIO, avisos). Armadura bloqueada das vigotas pela `previa`: `laje.armaduraVigotas { ids, inf: { n (0 a 2), phi }, sup?: { n, phi } }` (bitolas 6.3, 8, 10 e 12.5 mm; por nervura) e `armadura.desbloquear { tipo: "laje" }`. Trocar o modelo e a capa: `laje.atribuir { ids, tipo: { tipo: "trelicada", modelo, capa } }` ou `laje.editar`. Opções em `opcoes.definir` (em `valores`): `vigotaMomentoMinPositivo` e `vigotaMomentoMinNegativo` (p·ℓ²/x, padrão 16; perfil NBR 0), `vigotaIgualacao` (0 desligada, 1 máximo, 2 média), `vigotaIgualacaoDif` (%, padrão 100 = uma armadura por laje), `vigotaNegativoVao` (% do vão, padrão 25; perfil NBR 0) e `vigotaRigidez` (redutor de EI das nervuras na grelha, padrão 1).

Perfil dos padrões: `opcoes.definir { perfil: "sistema" | "nbr" }` (padrão do sistema = critério de mercado; nbr = NBR 6118: redistribuição 0, fator de flecha 0 = 1 + αf, engaste no topo do último lance 1, rigidez axial dos pilares 1); ao trocar, os valores iguais ao novo padrão deixam de contar como alteração. Opções da N1e (`opcoes.definir`, em `valores`): `redistribuicao` (% dos negativos das vigas, 0 a 25, padrão 15), `momentoMinPositivo` e `momentoMinNegativo` (p·ℓ²/x com p = (V1 + V2)/ℓ; 0 desliga), `cortanteApoio` (0 parte flexível, 1 a partir da face, padrão) e `cortanteDistancia` (% de d após a face), `verificarTorcao` (0 ou 1) e `limiteFissura` (mm; 0 = pela CAA). Na saída de `dimensionar`, cada viga traz `T` (Td máx., kN·m), `AslTorcao` (m²), `biela` (Vsd/VRd2 + Tsd/TRd2), `delta` (δ da redistribuição; 1 = sem), `AsLateral` (m², longitudinal de torção por face lateral) e `barrasLaterais`, `al` (decalagem, m), `wk` ([inf, sup], mm) e `wkLim` (mm); cada pilar, `Vd` (kN, quando há cortante de cálculo); cada laje maciça, `wk` e `wkLim` (mm). Frente R2 (armadura editada e bloqueada, todos pela `previa`): `viga.armadura { id, inf: { n, phi }, sup?: { n, phi }, estribo: { phi, s }, laterais?: { n, phi } }` (bitolas longitudinais 8, 10, 12.5, 16, 20, 25 e 32 mm; estribos 5, 6.3, 8, 10 e 12.5 mm; `s` em m), `pilar.armadura { id, pavimento, phi, nb, nh | n, estribo: { phi, s } }` (`pavimento` = lance, id do pavimento do topo; `nb` e `nh` = barras por face ao longo de b e de h, com os cantos; `n` no pilar circular) e `armadura.desbloquear { ids?, tipo?: "viga" | "pilar" }` (sem parâmetros, todas). O recálculo não redimensiona a armadura bloqueada, só a verifica; se não atende, a mensagem "Armadura bloqueada insuficiente: …" (código ARM_BLOQ, erro) aparece em `mensagens` e a situação é `fail`; se mudam os lances do pilar ou os vãos da viga, o bloqueio é desconsiderado (aviso BLOQ_IGNORADO). Em `dimensionar`, cada viga e cada lance de pilar traz `bloqueada` (boolean) e `arranjo` (o adotado, calculado ou bloqueado: vigas `{ inf, sup, estribo, laterais }`; pilares `{ phi, nb, nh | n, estribo }` e `pavimentoId`), que servem de base para um `lote` de `viga.armadura` e `pilar.armadura` (é o que faz "Bloquear todos" na interface). Frente R1: cada viga traz também `determinantes` (nome da combinação que dá Mmax, Mmin, V e T); a lista de erros e avisos por elemento (códigos, contagem, janela de resultados com diagramas) é um recurso da interface, calculado a partir das mensagens de `dimensionar`.

Fundações no edifício (frente FU, fatia FU1), todos pela `previa` (sem ferramenta própria): dados do terreno `fundacao.terreno { sigmaAdm (kN/m²), sigmaModo: "informada" | "sondagem", fatorVento (majoração de σadm com vento, padrão 1), cotaTerreno, estacas: [{ id?, nome?, tipo: helice | escavada | premoldada, D (cm), modo: informada (com capacidade, kN por estaca) | sondagem, s (m entre eixos) }], limpar? }`; sondagens `sondagem.criar { nome, x?, y?, nivelAgua?, impenetravel?, leituras: [{ N, solo: argila | silteArgiloso | silteArenoso | areia, descartada? }] }`, `sondagem.editar { id, ... }` e `sondagem.remover { ids }` (ids numéricos); elementos `fundacao.criar { pilar, tipo: sapata | bloco | tubulao, posicao: centrada | divisa | canto | livre, lado?: [x, y] (−1, 0 ou 1; sem ele, o ponto fixo do pilar), angulo?, x?, y? (centro, na posição livre), cota?, sigmaAdm?, sondagem?: { modo: furo | media, ids? }, estaca?: { id, n? } }`, `fundacao.editar { id, ..., impostas?: { A, B, h? } (sapata, só verificada), limpar? }`, `fundacao.mover { ids, dx, dy }` (vira posição livre), `fundacao.girar { ids, angulo | pontos | doPilar }` e `fundacao.remover { ids }`; parâmetros do cálculo `fundacao.opcoes { valores, padrao? }` (cobrimento, fck, peso próprio, espaçamentos, limites de sapatas e tubulões). Arranque: `pilar_inserir` com `nasce` e `morre` = "fundacao" e as cargas por `carga.pilar` (vão para o topo do arranque). Opção `fundModo` em `opcoes.definir` (0 dimensionar, 1 só verificar, 2 só os com erro). `dimensionar` devolve `fundacoes` (por elemento: `tipo`, `posicao`, `pilares`, `centro`, `cota`, `profundidade`, `dims` { A, B, h, h0 | n, D, estaca, L | Df, Db, H }, `sigmaAdm`, `volume`, `carga` característica nos eixos do elemento, `status`, `mensagens` com os códigos FUND_EXC_SEM_VIGA, FUND_SEM_SOLUCAO, FUND_NAO_ATENDE, FUND_SEM_SIGMA, FUND_SEM_SONDAGEM, FUND_SEM_ESTACA, FUND_SEM_CARGA, FUND_PILAR, FUND_COTA, e `resumo`) e `resumo.fundacoes`; o filtro `fundacao: true` devolve só as fundações e as cargas por pilar. Sapatas e blocos de divisa ou de canto saem com erro FUND_EXC_SEM_VIGA enquanto não houver viga de equilíbrio na direção da divisa.

Vigas de fundação (fatia FU2), pela `previa`: `vigaFundacao.criar { tipo: equilibrio | travamento, ini, fim (id de elemento de fundação ou de pilar que nasce na fundação), equilibrio?: "auto" | { ini, fim }, b?, h? (m; padrão 0,20 × 0,40, cresce até atender), fixa?, nome? }`, `vigaFundacao.editar { id, ... }`, `vigaFundacao.remover { ids }` e `vigaFundacao.igualar { modelo, ids }` (copia a seção e a fixa: as copiadas só são verificadas). A viga de equilíbrio centra a sapata ou o bloco excêntrico da ponta equilibrada (R = N·ℓ/(ℓ − e)) e alivia a outra ponta (50 % no Nk, opção `vigaEqAlivio`; tração com o alívio total = erro). Cargas no nível de fundação: `carga.ponto`, `carga.linha` e `carga.area` com `grupo: "fundacao"` (sobre as vigas, levadas às pontas; sobre os elementos, somadas ao pilar). Níveis calculados: `fundacao.opcoes { niveis: [cotas] }` (vazio = todos). Opções em `opcoes.definir` (só das fundações: não refazem a análise): `vigaEqAlivio` (%), `vigaEqDistribuicao` (0 retangular, 1 trapezoidal), `vigaTravExc` (cm), `vigaFundBMin`, `vigaFundHMin` (cm), `vigaFundEstribosEsperas` (0/1). `dimensionar` devolve também `vigasFundacao` (por viga: `tipo`, `ini`, `fim`, `L`, `secao` adotada, `equilibrio`, `alivio`, `Md`, `Vd`, `status`, `mensagens`, `resumo`), `avisosFundacao` e, nos elementos equilibrados, `alavanca { R, fator, alivios }` e, nos aliviados, `alivio`. Códigos novos: FUND_SEM_TRAVA (aviso: bloco de 1 ou 2 estacas sem travamento), FUND_VIGA_PONTA, FUND_VIGA_ALAVANCA, FUND_VIGA_TRACAO, FUND_VIGA_FLEXAO, FUND_VIGA_CORTANTE (erros), FUND_VIGA_SECAO, FUND_VIGA_SEM_EXC e FUND_CARGA_FORA (avisos).

Sapatas associadas, blocos com vários pilares, limites e edição (fatia FU3), pela `previa`: `fundacao.criar { pilares: [ids] }` (≥ 2 pilares: sapata associada ou bloco com vários pilares, posição centrada na resultante ou livre; `simples`: concreto simples; `alturaConstante`: a única aparada por limites), `fundacao.editar { pilares, simples, alturaConstante, impostas: { A, B, h?, h0?, Df?, armadura?: { x?, y?: { phi, s? | n? } } } }`, `fundacao.unir { ids }` (sapatas da mesma cota viram uma associada), `fundacao.igualar { modelo, ids }` (cópias só verificadas; ficam em erro se não atenderem), `fundacao.impor { ids, impostas | limpar }`, `fundacao.eliminarSobreposicoes { grupos: [[ids]] }` (une as sapatas de cada grupo de elementos sobrepostos; os grupos vêm do aviso FUND_SOBREPOSTA) e os limites `limite.criar { pontos, fechado?, cota?, nome? }`, `limite.editar { id, pontos?, ... }` e `limite.remover { ids }`. Opções em `opcoes.definir` (só das fundações): `fundDescolamento` (0/1), `fundVaoAltura`, `fundBalancoAltura`, `fundSimplesGamma`, `fundReducaoTaxa` (0/1). `dimensionar` devolve nas fundações também `grupo { pilares, referencia, limitesUsados, limitesIgnorados }`, `simples`, `alturaConstante`, `igualA` e, nas vigas de fundação, `cruzamentos [{ com, papel: apoiada | apoio, s, R }]`. Códigos novos: FUND_SOBREPOSTA, FUND_LIMITE_IGNORADO e FUND_VIGA_CRUZA (avisos) e FUND_IGUAL_MODELO (erro).

Geração automática das fundações (fatia FU4), pela `previa`: `fundacao.gerar { pilares?, tipo?: auto | sapata | bloco | tubulao, estaca?, distanciaVisao?, anguloVisao?, distanciaAssociada?, associadas?, vigasEquilibrio?, vigasTravamento?, camadasDivisa?, cargas?: [{ pilar, Nk }] }`. Gera num passo só (um desfazer) os elementos dos pilares que nascem na fundação sem elemento: tipo pela σadm (bloco se menor que a opção `gerarSigmaMin`, 150 kN/m², e houver estaca), posição de divisa ou de canto pelo lado sem pilar "em frente" (desalinhamento menor que D, opção `gerarDistVisao` 3 m, dentro do cone A, `gerarAnguloVisao` 30°) ou por limite a menos de `gerarDistLimite` (0,5 m), sapata associada ou bloco com vários pilares quando as bordas estão a menos de `gerarDistAssociada` (1 m, máximo 3 m) ou os elementos estimados se sobrepõem (precisa de `cargas`, Nk característicos da última análise), vigas de equilíbrio até o pilar em frente do lado oposto e vigas de travamento dos blocos de 1 e 2 estacas (estimados por `cargas` e capacidade informada). Sem pilar a gerar: erro `NADA_A_GERAR`. Os elementos gerados são editáveis pelos comandos `fundacao.*` e `vigaFundacao.*`; depois, `dimensionar` com o filtro `fundacao` devolve o resultado.

Sapata corrida (fatia FU7a), pela `previa`: `corrida.criar { pontos: [[x, y], ...] (eixo), bw? (largura do apoio, padrão 0,20 m), aba?: ambas | esq | dir, B?, h?, h0? (m; ausentes = calculados), alvenaria?, equilibrio? (aba de um lado: cintas até sapatas internas), k?, sigmaAdm?, cota?, nome? }`, `corrida.editar { id, ..., limpar? }` e `corrida.remover { ids }`. Sem pilares sobre o eixo é a sapata sob parede: as cargas `carga.linha`, `carga.ponto` e `carga.area` com `grupo: "fundacao"` que caem sobre ela (largura do apoio ± 5 cm) dão a carga por metro; largura pela σadm, altura rígida, flexão transversal CEB-70 e armadura de distribuição. Com pilares sobre o eixo ela entra na análise global como viga sobre base elástica (k padrão `radierK`; largura e altura padrão nas opções `corridaBPadrao` e `corridaHPadrao`). Opções em `opcoes.definir`: `corridaBMin`, `corridaBPadrao`, `corridaHPadrao`, `corridaRefConcreto`, `corridaRefAlvenaria` (% de bw), `corridaDistribuicao` (%), `corridaJanela` (m). `dimensionar` (com `fundacao: true`) devolve `corridas` (por sapata: `modo`, `B`, `h`, `h0`, `carga_kN_m`, `transversal { metodo, Md_kNm_m, As_cm2_m, barras, distribuicao }`, `longitudinal` sob pilares, `cinta_kNm_m`, `status`, `mensagens`). Códigos: FUND_CORRIDA_SEM_CARGA, FUND_CORRIDA_SEM_SOLUCAO, FUND_CORRIDA_EXC, FUND_CORRIDA_FLEXAO (erros), FUND_CORRIDA_FLEXIVEL e FUND_CORRIDA_LARGURA (avisos); sob pilares valem também FUND_LEVANTAMENTO e FUND_RADIER_TENSAO.

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| `abrir`, `novo`, `salvar` | arquivo de trabalho `.statikos` (o `salvar` preserva pórtico, biblioteca e histórico do arquivo aberto) |
| `resumo`, `modelo` | leitura do edifício |
| `verificar` | diagnósticos de lançamento, com correção sugerida executável (`sugestao: { comando, params }`) |
| `calcular` | análise: grelha por pavimento + pórtico espacial, vento NBR 6123, γz, cargas na fundação, flechas, equilíbrio |
| `dimensionar` | NBR 6118: vigas, pilares por lance, lajes; quantitativos; cargas para Fundações; `resumo.foraDeTabela` (elementos com armadura fora das tabelas de armadura, R7a), `resumoAcoVigas`, `resumoAcoPilares`, `resumoAcoLajes` e `resumoAcoVigotas` (aço, φ, comprimento, peso e peso com perdas, kg); `vigotas` (resumo por laje treliçada) e `trelicas`; `fundacoes` (elementos de fundação lançados), `vigasFundacao` (vigas de equilíbrio e de travamento) e `corridas` (sapatas corridas). Filtros `pavimento`, `so_problemas` e `fundacao` |
| `pranchas` | por `tipo`: `formas` (padrão, uma por grupo), `locacao` (eixos, pilares e cargas características e de cálculo por pilar), `fundacao` (fundações lançadas: locação e planta de cargas por nível, detalhamento de sapatas SFS, de blocos e tubulões SFN, vigas de fundação e quantitativos; arranques na mesma folha), `vigas`, `pilares` (com quadro de pilares) e `lajes` (armação: posições "n Nk φ C=", tabela de aço e resumo com perdas por folha) ou `todas` (conjunto numerado "folha n de N"); PDF (todas), DXF R2000 e DWG R2018 (uma por arquivo). Opções de armação (escalas, folhas de lajes, quadro) pelo comando `prancha.definir` (`armacao`) |
| `aplicar`, `previa`, `comandos`, `desfazer`, `refazer` | fluxo de alteração |
| `obra_definir`, `norma_definir`, `vento_definir` | dados da obra, materiais e CAA, vento |
| `grupo_criar`, `grupo_editar` | grupos de pavimentos iguais (uso e cargas) |
| `pavimento_criar`, `pavimento_editar`, `pavimento_remover`, `pavimento_repetir` | pavimentos (cota = topo da laje) |
| `eixo_malha` | malha de eixos |
| `mascara_importar` | DXF de arquitetura como máscara de um grupo |
| `pilar_inserir`, `pilar_editar`, `pilar_remover` | pilares (seção por lance, ponto fixo, nascimento e morte) |
| `viga_tracar`, `viga_editar`, `viga_remover`, `viga_copiarParaGrupos` | vigas por polilinha, com alinhamento pelo eixo ou por uma face |
| `viga_alinharFace` | loca vigas pela face dos pilares (contorno na face externa, ou face esquerda/direita) |
| `laje_detectarPanos`, `laje_criar` | lajes maciças e treliçadas |
| `carga_ponto`, `carga_linha`, `carga_area`, `carga_alvenariaDaMascara` | cargas adicionais e alvenaria lida da máscara |
| `lote` | vários comandos como um passo só (um desfazer); para no primeiro erro |

## Recursos

| URI | Conteúdo |
|---|---|
| `statikos://modelo` | modelo físico |
| `statikos://diagnosticos` | verificação de lançamento |
| `statikos://premissas` | premissas de cálculo em uso, com fonte e marca "a confirmar" |
| `statikos://log` | log de comandos |
| `statikos://resultados` | dimensionamento do edifício (recalcula se o modelo mudou) |
| `statikos://resultados/{pavimento}` | recorte por pavimento (id ou nome) |

## Convenções

- **Unidades:** m, kN, kN/m², graus. Seções de pilar e viga em m (`{ tipo: "ret", b: 0.2, h: 0.4 }`). Os resultados de armadura vêm em texto ("4 φ12,5"); as áreas, em m² (vigas e pilares) ou cm²/m (lajes).
- **Ids** são estáveis e determinísticos (`pav_4`, `g_3`, `v_1a`); nomes (`P1`, `V3`) são rótulos e podem mudar na renumeração.
- **Grupo × pavimento:** vigas, lajes e cargas pertencem a um grupo (pavimentos iguais); pilares atravessam pavimentos (`nasce`, `morre`, seção por lance).
- **Viga:** a polilinha traçada é o eixo (`alinhamento: "centro"`) ou uma face (`"esq"`/`"dir"`, olhando do primeiro ao último ponto).
- **Situação no dimensionamento:** `ok`, `review` (revisar: método mais refinado ou conferência manual) e `fail` (não atende).
- **Premissas:** consulte `statikos://premissas` antes de propor valores. Itens "a confirmar" ainda não têm fonte normativa conferida: não os apresente como norma.

## Linha de comando

```bash
statikos novo obra.statikos
statikos exec obra.statikos comandos.jsonl [--previa] [--saida outra.statikos]
statikos verificar obra.statikos            # código de saída 1 se houver erro
statikos calc obra.statikos --json
statikos dim obra.statikos --json
statikos prancha obra.statikos --pdf p.pdf --dxf p.dxf --dwg p.dwg [--grupo Tipo] [--formato A1] [--escala 50]
statikos comandos --json                    # todos os comandos com schema
```

`comandos.jsonl`: uma linha JSON por comando, `{"nome": "pilar.inserir", "params": {"x": 0, "y": 0, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`. Linhas com `#` são comentários.

## Exemplo de agente

`docs/exemplos/agente-mcp.mjs` liga o servidor por stdio e segue o roteiro de um agente:

1. Edifício padrão e eixos.
2. Pilares propositalmente pequenos, vigas e lajes.
3. Verificação.
4. Dimensionamento em rodadas, aumentando a seção dos pilares que não passam.
5. Contorno locado na face externa.
6. Carimbo e pranchas.

```bash
npm run cli && npm run agente -- ./saida
```

O mesmo roteiro roda no `npm test` (`src/cli/agente.test.ts`).

## Limites desta versão

- Análise linear com γz; sem P-Δ 3D.
- Pranchas de armação sem detalhes de blocos/sapatas, sem corte A-A por trecho e com as barras das lajes por barra representativa.
- Pilar-parede só é sinalizado.
- Máscara só em DXF.
- No artifact do claude.ai não há DWG (o escritor fica fora do arquivo único).
