# Spec — Frente N2 (cálculo e normas: verificações complementares)

Base: os 119 itens Parcial/Falta com frente N nos dois checklists (26 do manual do usuário, 93 do de cálculo), conferidos por script em 20/10/2026: cada id está em exatamente uma fatia abaixo, sem sobra nem repetição. Pronta para execução direta, sem aprovação por fatia (`plano-execucao.md`, "Regras de execução").

## Regras de toda a N2

- **Paridade de função, nunca de implementação.** Nomes de comandos, textos, tabelas, ícones e disposição de tela são próprios; nada é transcrito do programa de referência.
- **Premissas.** Padrão do sistema = critério do programa de referência onde os checklists ou `pesquisa-edificios.md` o registram; NBR 6118, 6120, 6122, 6123, 8681, 15200 e 9062 onde não registram (perfil NBR com `padraoNBR`/`fonteNBR` em `OPCOES_INFO` quando diferem); sem fonte = "a confirmar" no app (`premissas.ts`) e no memorial. Onde a NBR é exigência (resistências, contornos de punção, limites de deslocamento), ela prevalece também no perfil do sistema, como já decidido para o trecho rígido e o γz.
- **Opções.** Toda opção nova entra em `opcoes.ts` (padrão, faixa, fonte, "a confirmar") e aparece em `opcoesAlteradas` no memorial; dados por elemento só quando diferem do padrão (arquivo `.statikos` e limite de 240 KB da biblioteca).
- **Comandos novos** com `mcp: false`, schema, `validar`, mensagem e exemplo em `EXEMPLOS` do `commands.test.ts`. Nenhuma ferramenta MCP nova; o `dimensionar` ganha só resumos (contagens de punção, fogo e flechas fora do limite).
- **Interface** só com `src/app/ui` e as classes/tokens de `src/app/design/global.css`; componente novo vai para a biblioteca. Estado de vista no `plantaStore`.
- **Revisão:** códigos novos em `CODIGOS_REVISAO` (`revisao.ts`), erro em vermelho e aviso em amarelo na planta, como na R1.
- **Aceite de cada fatia:** testes numéricos contra cálculo manual ou referência independente (OpenSees em `validation/opensees` quando o modelo muda), regressão do edifício de `src/core/sheets/exemplo.ts` (sem opção nova ligada, os resultados só mudam onde a fatia diz), fluxo e2e próprio (`N2a` … `N2g`), memorial, pranchas e checklists atualizados; `checklists.test.ts` verde.

## Fatias

| Fatia | Conteúdo | Itens | Depende de |
|---|---|---|---|
| N2a | Ações e combinações: categorias de uso como casos, compatibilidade, arranjos, estados-limite, situações do usuário, γ por origem, empuxo (dados), vento (coeficientes) | 25 | — |
| N2b | Modelo integrado (lajes condensadas no pórtico), barra com deformação por cortante, elemento de casca e malha triangular, regra do diafragma | 10 | — |
| N2c | Pilares e 2ª ordem: P-Δ 3D, método geral, excentricidade entre lances, lances desligados, vínculo externo com molas, cargas em pilares completas, cortante por direção | 17 | N2b (nós dos pilares no modelo integrado) |
| N2d | Punção e cortante das lajes, com armadura, marcação na planta e grupos editáveis | 16 | N2b; R4 (armadura das lajes) |
| N2e | Vigas e lajes: arredondamento no apoio, avisos de modelagem, suspensão, carga próxima ao apoio, limites editáveis, rótulas em cruzamentos, aço por posição | 23 | — (K1.4.1 fecha com a R7a) |
| N2f | Flechas: etapas de carga, flecha ativa, limites por tipo, fissuração das lajes, ρ′ real | 23 | N2a (casos por categoria) |
| N2g | Resistência ao fogo (NBR 15200) | 5 | N2a (estados-limite) |

Ordem: N2a → N2b → N2c na onda 2 (a E1 depende das três); N2d → N2e → N2f → N2g na onda 3. N2e não depende de nada e pode subir para a onda 2 se a lane folgar.

---

### N2a — Ações e combinações (25 itens)

- **Itens:** C3.13, C3.14, C3.18, C10.8, C10.12, C10.13, C10.14, C10.16, C10.17, C10.18, C10.19, C10.20, K1.5.12, K1.5.13, K1.5.23, K1.5.27, K1.5.29, K1.6.1, K1.7.3, K1.7.4, K1.7.5, K1.8.1, K1.8.3, K1.9.27, K1.9.46.
- **Já existe (não refazer):** casos adicionais G/Q/W/E com grupo de incompatíveis, caso simultâneo e ψ próprio (`CasoAdicional`, `caso.criar/editar/remover`, `Casos.tsx`); combinações ELU, QP, frequentes, raras e excepcionais (`combinacoes.ts`, `nbrCombinations` e `exclusiveChoices` de `edit.ts`); γc, γs, γg, γq editáveis (`Norma.gamas`, `materiais.definir`); ψ da Q (`Norma.psiQ`); categoria de uso e q por grupo (`Grupo.uso`, `CategoriaUso`, NBR 6120); vento com sentido, vizinhança, platibanda e Ca informado (`vento.ts`, `vento.definir`); combinações do usuário no Pórtico 2D (`Combination` em `src/core/types.ts`); lista de combinações visível (N1c).
- **Núcleo:**
  - *Categorias de uso como casos* (C3.13, C3.14, C3.18): com a opção `qPorCategoria` = 1 (padrão do sistema, como na referência), cada categoria presente vira um caso Q próprio (`Q:residencial`, `Q:escritorio`…) que reúne a carga de uso de todos os pavimentos daquela categoria (mesmos coeficientes dentro da categoria) e combina com as outras como variável distinta. ψ pela NBR 6118, Tabela 11.2: residencial 0,5/0,4/0,3; escritório e áreas comuns 0,7/0,6/0,4; garagem 0,8/0,7/0,6; cobertura e serviço 0,5/0,4/0,3 [a confirmar o enquadramento de serviço e cobertura]. Com uma categoria só, o resultado é igual ao de hoje (regressão). Grupo com uso `misto`: sem carga variável geral; cada carga de área recebe a categoria (`Carga.caso` = `Q:<categoria>`).
  - *Descrição do caso* (C10.8): `CasoAdicional.descricao`.
  - *Compatibilidade e arranjos* (C10.13, K1.5.13): tabela par a par entre casos adicionais da mesma natureza (`compativel`, `incompativel`, `simultaneo`), derivada dos campos atuais `grupo`/`simultaneo` e editável; o gerador de combinações usa os componentes incompatíveis como grupos excludentes. Arranjos de um caso = casos filhos (`pai`) incompatíveis entre si; flag `combinarAdicionais` por natureza.
  - *Cargas alternadas e móveis* (C10.12): comando que gera arranjos de Q em xadrez por pano (dois arranjos por direção, incompatíveis entre si) e arranjos de uma carga móvel (ponto ou linha percorrendo uma polilinha com passo dado), como casos filhos.
  - *Estados-limite e grupos de combinações* (C10.14, C10.16, K1.8.1, K1.8.3, K1.9.27): `b.estados?` com os grupos concreto (ELU), fundações (ELU), tensões no solo (raras), deslocamentos (frequente), fissuração (frequente), flecha (quase permanente) e equilíbrio (EQU), cada um ativável e com modo `norma` ou `usuario`. Aço, madeira e alumínio ficam fora (fora do escopo). EQU: tombamento global do edifício (momento instabilizante das ações horizontais × estabilizante das permanentes) com γ da NBR 8681 para equilíbrio [a confirmar os valores].
  - *Controle de execução* (C10.14, K1.7.3): `Norma.controle` = `normal` (γc 1,4) | `desfavoravel` (γc × 1,1, NBR 6118 12.4.1) | `premoldado` (γc 1,3 com controle rigoroso, NBR 9062); preenche o γc padrão, que continua editável.
  - *γ por origem* (K1.7.4): tabela de γ por natureza e tipo de combinação (normal, construção/especial, excepcional) com a NBR 6118, Tabela 11.1 (já em uso) e as linhas de empuxo e de ações indiretas da NBR 8681 [a confirmar os valores das linhas novas].
  - *Situações do usuário* (C10.17–C10.20, K1.7.5): `b.situacoes?` = listas de combinações (nome, tipo, fatores por caso) por grupo de estados; criar, apagar, copiar, editar, gravar e ler na biblioteca (`storage.ts`, tipo `combinacoes`), criar a partir das da norma (importação reproduz exatamente `combinacoesEdificio`). Definição por coeficientes de segurança, ou por coeficientes de segurança e de combinação (γ e ψ separados). Aviso `COMB_USUARIO` quando algum fator fica abaixo do da norma para o mesmo caso (alerta de responsabilidade, também no memorial).
  - *Empuxo* (K1.5.12, K1.9.46): natureza nova `H` (empuxo de terra, permanente nas combinações, γ da linha de empuxo); tipos de empuxo reutilizáveis (`b.empuxos?`): estratos com espessura, peso aparente e submerso, ângulo de atrito interno, coeficiente (repouso K0 = 1 − sen φ, padrão para paredes travadas pelas lajes; ativo de Rankine/Coulomb com talude β [a confirmar o padrão]), cota do aterro, nível d'água (hidrostático abaixo dele), alívio por drenagem (%) e sobrecarga no terreno. `src/core/building/empuxo.ts`: `diagramaEmpuxo(tipo, cotaTopo, cotaBase)` devolve a pressão por cota. Aplicação às paredes na E1c.
  - *Vento* (K1.5.23, K1.5.27, K1.5.29): coeficientes por sentido e fator de vizinhança passam a poder vir de tabelas de pontos (ábacos da NBR 6123) interpoladas, guardadas em `vento.abacos`; platibanda com a largura corrigida b′ = b·(2a + h)/h aplicada à faixa do último pavimento. Ca continua informado (padrão 1,3) enquanto a tabela do ábaco estiver vazia (ver Riscos).
  - *Biblioteca de materiais* (K1.6.1): concretos e aços nomeados gravados na biblioteca (`storage.ts`, tipo `materiais`) e aplicados por `materiais.definir`.
- **Comandos:** `caso.criar/editar` ampliados (`descricao`, natureza `H`, `pai`, `empuxo`), `caso.compatibilidade`, `caso.arranjos` (xadrez e móvel), `empuxo.tipo` (criar/editar/remover), `estados.definir`, `situacao.criar/editar/remover/importar`, `norma.definir` ampliado (`controle`), `vento.definir` ampliado (`abacos`).
- **Interface:** `Casos.tsx` com categorias, tabela de compatibilidade e gerador de arranjos; janela "Estados-limite e combinações" (lista de grupos, ativo, modo, editor de situações em tabela com colagem, botão de importar da norma, alerta); editor de tipos de empuxo com diagrama SVG; tabela de pontos dos ábacos no grupo Vento.
- **Memorial:** casos por categoria com ψ e fonte; compatibilidade; situações do usuário destacadas com o alerta; estados ativos; γ por origem; controle de execução; diagrama de empuxo; EQU.
- **Pranchas:** notas gerais (`notasGerais` em `locacao.ts`) com as categorias de uso e as cargas variáveis por uso.
- **Testes de aceite:** ψ e contagem de combinações com duas categorias contra montagem manual; regressão com uma categoria; xadrez e móvel (número de arranjos e incompatibilidade); importação da norma idêntica a `combinacoesEdificio`; alerta com fator menor; K0 e Ka com NA e sobrecarga contra cálculo manual; EQU de um edifício esbelto; e2e `N2a`.

### N2b — Modelo integrado e elemento de casca (10 itens)

- **Itens:** C0.2, K1.2.1, K1.2.5, K1.3.1, K1.3.22, K1.3.34, K1.3.35, K1.3.36, K1.3.43, K1.9.106.
- **Já existe (não refazer):** `fe3d.ts` (barras 3D, trechos rígidos, liberações, engaste parcial, molas, mestre-escravo); grelha por pavimento + pórtico espacial em `analitico.ts`; cache de grelhas idênticas por grupo; zonas independentes (N1c); `Viga.foraDiafragma` (N1a); `malhaLaje` com furos; redutor de torção das lajes (`torcaoLaje`); validação do pórtico contra o OpenSees (`validation/opensees/portico3d.py`).
- **Núcleo:**
  - *Barra com deformação por cortante* (K1.3.22): `Barra3.Ay/Az` (áreas de cisalhamento, Timoshenko); usada nas barras de laje (área = largura × h × 5/6). Opção `cortanteLajes` (1 = considera, padrão do sistema pela referência).
  - *Modelo integrado* (C0.2, K1.2.1, K1.3.1): opção `modeloGlobal` = `integrado` (padrão do sistema, como a referência) | `separado` (o modelo atual). No integrado, a grelha de cada pavimento (lajes + vigas) vira um superelemento: condensação estática exata (complemento de Schur) dos gdl internos (uz, rx, ry) para os nós de ligação com pilares, paredes e pilares-parede; o plano segue o diafragma. O pórtico monta só pilares, elementos verticais e superelementos; os deslocamentos internos saem por retrossubstituição, e os esforços das vigas e lajes passam a incluir as ações horizontais. Cache por grupo como hoje. γz e deslocamentos com rigidez reduzida 0,3·EcIc nas lajes (NBR 6118, 15.7.3), além de 0,4 nas vigas e 0,8 nos pilares.
  - *Nós associados* (K1.3.43): no integrado, barras de laje que chegam à face de viga ou pilar ligam-se ao nó por trecho rígido até o eixo, em vez de prender w dentro do pilar.
  - *Casca espessa* (K1.3.34): `src/core/casca.ts`, triângulo de 6 nós (vértices e meios dos lados), 6 gdl por nó: membrana de deformação linear + placa de Mindlin com interpolação mista contra travamento por cortante, rigidez de giro no plano pequena; integrado ao `fe3d` como `Casca3`.
  - *Malha triangular* (K1.3.35): `src/core/geom/malhaTri.ts`, Delaunay restrita com refinamento em cantos, bordas e aberturas, pontos obrigatórios (chegadas de vigas e lajes) e tamanho alvo editável (`malhaCasca`, padrão 0,5 m [a confirmar]). Código próprio, sem dependência.
  - *Diafragma* (K1.2.5, K1.3.36): nós de elementos verticais de casca só são escravos no nível em que tocam laje. *Aberturas grandes* (K1.9.106): aviso `DIAFRAGMA_ABERTURA` quando uma zona fechada por vigas tem abertura interna acima de um limite (padrão 1/3 da área da zona [a confirmar]), sugerindo vigas fora do diafragma.
- **Comandos:** nenhum novo (opções por `opcoes.definir`).
- **Interface:** opções `modeloGlobal`, `cortanteLajes` e `malhaCasca` no grupo Opções; tempo da análise e número de gdl na aba Análise.
- **Memorial:** descrição do modelo (integrado ou separado, condensação, Timoshenko, casca) e das rigidezes reduzidas.
- **Pranchas:** nenhuma.
- **Testes de aceite:** superelemento igual ao modelo cheio (erro relativo < 1e-9); integrado × separado num pavimento com vigas muito rígidas (diferença < 2 %); edifício de exemplo contra o OpenSees com lajes (novo `validation/opensees/integrado.py`); patch tests da casca (membrana e placa), placa quadrada apoiada contra a solução de Mindlin e parede em balanço contra viga de Timoshenko; regra do diafragma num modelo sintético do `fe3d`; desempenho: exemplo em até 1,5 × o tempo atual. K1.2.5 e K1.3.36 fecham no checklist quando a E1c ligar as paredes (até lá Parcial com a nota).

### N2c — Pilares e 2ª ordem (17 itens)

- **Itens:** C4.10, C4.23, C4.33, C4.41, C4.42, C10.2, K1.3.3, K1.3.4, K1.5.17, K1.5.19, K1.5.56, K1.9.13, K1.9.32, K1.9.36, K1.9.37, K1.12.4-7, K1.12.4-18.
- **Já existe (não refazer):** γz com rigidez reduzida e ampliação 0,95·γz (`analitico.ts`, `combinacoes.ts`); P-Δ, flambagem e vibração só no Pórtico 2D (`secondorder.ts`: `geometricLocal`, `pDelta`, `buckling`); pilar-padrão com curvatura aproximada (`designColumn`) e fibras (`fiber.ts`, `columnGeneral.ts`); λ > 90 aviso e λ > 200 recusa; ℓe por lance e direção (`flambagemLance`, `Pilar.flambagem`, `Pavimento.alfaFlambagem`); engaste de base e topo por lance (`Pilar.engastes`); `carga.pilar` com N, Hx, Hy, Mx, My a uma altura, eixos globais; Vd por pilar com Vc por flexo-compressão; taxa mínima fixa; nó de cada lance no centro da sua seção.
- **Núcleo:**
  - *P-Δ 3D* (C10.2, K1.5.56): matriz geométrica da barra 3D no `fe3d` e iteração por combinação ELU com rigidez reduzida (0,4/0,8/0,3), como o `pDelta` do Pórtico 2D. Opção `segundaOrdem` = `gamaZ` (padrão; a referência recomenda o P-Δ como alternativa) | `pDelta`; com P-Δ não há ampliação 0,95·γz, e o γz continua informado.
  - *Excentricidade entre lances* (C4.23, K1.3.3): nó do pavimento no centro da seção de baixo; o lance de cima liga-se por trecho rígido horizontal até o seu centro (momento N·e transmitido).
  - *Comprimento entre faces* (K1.3.4): opção `pilarComprimento` = 0 (entre cotas, hoje) | 1 (parte flexível entre a face inferior da viga mais alta e o topo da laje de baixo, com trechos rígidos verticais); padrão 0 [a confirmar].
  - *Lances desligados* (K1.9.13): lance sem viga nem laje que o trave numa direção soma-se ao de cima ou de baixo; ℓ0 = máx(αi) × soma dos lances desligados, por direção.
  - *Vínculo externo e desnível* (C4.10, K1.9.32): `Pilar.vinculoBase` = engaste | rótula | molas (kx, ky, kz, krx, kry, krz → `molas` do `fe3d`); `Pilar.cotaBase` (pé em cota própria) e `alturaApoio` (travamento a uma altura do lance, que divide o lance em dois trechos para a flambagem).
  - *Cargas em pilares* (K1.5.17, K1.5.19, K1.9.36, K1.9.37): `CargaPilar` ganha torção T, tipo concentrada | uniforme | faixa (alturas a e b) e eixos global | local.
  - *Método geral* (K1.12.4-7): 90 < λ ≤ 140 com pilar-padrão de rigidez/curvatura aproximada e fluência (NBR 6118, 15.8.4); 140 < λ ≤ 200 pelo método geral (integração da curvatura com a relação M–N–1/r das fibras, 15.8.3.2) com fluência; φ padrão 2,5 [a confirmar], editável. O aviso "λ > 90" passa a informar o método usado.
  - *Seções intermediárias* (K1.12.4-18): com carga horizontal no lance, verificação também na seção da carga e no máximo do diagrama.
  - *Taxas e estribos* (C4.33, C4.42): opção `pilarTaxaMin` (%; 0 = da norma); aviso `ESTRIBO_TABELA` quando o arranjo de estribos e grampos não cabe na tabela (com a R7a; antes dela, na regra geradora) e só um estribo foi colocado.
  - *Cortante por direção* (C4.41): `ResultadoPilar.cortante` = { x, y } com Vsd, Vc, VRd2, Asw/s e As longitudinal considerada.
- **Comandos:** `pilar.vinculo` (molas, cota da base, altura de apoio), `carga.pilar` ampliado.
- **Interface:** `Vinculos.tsx` com molas e desnível; editor de carga no pilar (tipo, eixos, T); janela do pilar com cortante por direção, método de 2ª ordem e diagrama de M de 1ª e 2ª ordem; opção de 2ª ordem no grupo Opções.
- **Memorial:** método global (γz ou P-Δ, iterações e convergência), método local por pilar, fluência, cortante por direção, vínculos com molas.
- **Pranchas:** quadro de pilares sem mudança; nota com o método de 2ª ordem nas notas gerais.
- **Testes de aceite:** P-Δ 3D de um pórtico plano igual ao `pDelta` do Pórtico 2D; P-Δ × γz no exemplo (ampliação dos momentos ≈ γz ± 5 %); N·e na mudança de seção contra cálculo manual; método geral com material elástico linear reproduz 1/(1 − N/Ncr); molas na base contra solução analítica; carga uniforme no pilar contra viga engastada; e2e `N2c`.

### N2d — Punção e cortante das lajes (16 itens)

- **Itens:** C3.4, C7.139, C7.140, C7.141, K1.6.7, K1.9.8, K1.11.21, K1.12.1-19, K1.13.2.4-1, K1.13.2.4-2, K1.13.2.4-4, K1.13.2.4-5, K1.13.2.4-6, K1.13.2.4-8, K1.13.2.4-9, K1.13.2.4-10.
- **Já existe (não refazer):** punção das sapatas flexíveis (`footings.ts`, `punching`: τSd, τRd1, τRd2); cortante das nervuras treliçadas (`vrd1`, `vrd2` em `vigotas.ts`); esforços das barras da grelha (cortantes e momentos por barra); armadura das lajes maciças pela envoltória do grupo (R4, `detalhamentoLajes.ts`); aço por posição `lajeInf`/`lajeSup` (`acoPos`).
- **Núcleo:** `src/core/building/puncao.ts`.
  - *Punção* (K1.11.21, K1.13.2.4-1, -2, -4, -5): contornos da NBR 6118, 19.5 (C na face, C′ a 2d, C″ além da última linha de armadura), que prevalecem sobre as superfícies a 0,5d da referência por serem exigência normativa; τSd = FSd/(u·d) + K·MSd/(Wp·d) para pilar interno, de borda e de canto (19.5.2), com momentos desbalanceados da análise e furos a menos de 8d descontando o contorno; tensões interpoladas a partir dos cortantes das barras vizinhas no perímetro; τRd1, τRd2 e τRd3 (com armadura) com ρ = √(ρx·ρy) da armadura detalhada numa faixa de 3d. Também em pilares-parede, paredes (com a E1) e vigas chatas largas (K1.12.1-19: largura maior que o apoio + h, aviso e verificação).
  - *Armadura de punção* (K1.13.2.4-5, -6): conectores ou estribos verticais em linhas radiais, primeira a ≤ 0,5d da face e entre linhas ≤ 0,75d (19.5.3.3), entre as armaduras superior e inferior; saída com número de linhas, barras por linha, φ e espaçamento.
  - *Cortante* (K1.13.2.4-8, -9, -10): varredura a partir do contorno de punção em superfícies paralelas a cada 0,75d (procedimento da referência), com VRd1 da NBR 6118, 19.4.1, e armadura transversal pela 19.4.2 (interpolação pela espessura); sai o mesmo tipo de armadura da punção.
  - *Grupos editáveis* (C7.139, C7.140, C7.141): `Laje.puncao?` = grupos { pilar ou ponto, linhas, φ, s, n } somados aos calculados; apagar um a um ou por janela. Nervuras que chegam a um ábaco entram quando a E3 criar as nervuradas.
  - *Aço próprio* (K1.6.7, K1.9.8): `acoPos.lajePuncao` e `acoPos.lajeCortante`.
  - *Envoltória do grupo* (C3.4): resultados das lajes na tela também pela envoltória dos pavimentos do grupo (seletor por pavimento | envoltória), como já é a armadura.
  - Códigos `PUNCAO_BIELA` (τRd2, erro), `PUNCAO_ARMADURA` (aviso com armadura), `PUNCAO_SEM_SOLUCAO` (erro), `CORTANTE_LAJE` (erro/aviso).
- **Comandos:** `laje.puncao` (adicionar/remover grupos), `materiais.definir` ampliado.
- **Interface:** aba Punção e cortante na janela da laje (contornos em SVG, τ × resistências, armadura); camada da planta "Punção e cortante" com linhas vermelhas nos contornos e superfícies que falham; ferramenta para adicionar e apagar grupos; seletor pavimento/envoltória.
- **Memorial:** tabela por pilar (FSd, MSd, u, τSd, τRd, armadura) e cortante das lajes.
- **Pranchas:** na prancha de lajes, armadura de punção em planta (linhas radiais) com detalhe típico e posições na tabela de aço (`armacaoLajes.ts`).
- **Testes de aceite:** pilar interno, de borda e de canto com momento contra cálculo manual; furo próximo; τRd3 com armadura; cortante 19.4.1; viga chata larga; regressão do exemplo (sem punção excedida, nada muda nas armaduras); e2e `N2d`.

### N2e — Vigas e lajes: apoios, limites e avisos de modelagem (23 itens)

- **Itens:** K1.3.46, K1.3.47, K1.3.51, K1.3.53, K1.3.54, K1.3.55, K1.4.1, K1.4.7, K1.4.34, K1.4.71, K1.4.81, K1.6.6, K1.9.7, K1.9.41, K1.9.55, K1.9.85, K1.12.2, K1.12.1-10, K1.12.1-13, K1.12.1-15, K1.12.1-17, K1.12.1-18, K1.12.1-20.
- **Já existe (não refazer):** trecho rígido face − 0,3h (`trechoRigido`); redistribuição na parte flexível; momentos mínimos das vigas (N1e) e das vigotas (R6); `cortanteApoio`/`cortanteDistancia`; torção 17.5 somada ao estribo (`torsionRect`); articulações em pilares intermediários (`Viga.articulacoes`); engaste por borda (`Laje.engasteBordas`); desnível guardado (`Laje.nivel`, sem efeito no cálculo); treliçadas sempre contínuas; `acoPos` de vigas (positiva, negativa, estribos); opções editáveis de bitola e espaçamento das lajes, barra máxima e arredondamento.
- **Núcleo:**
  - *Arredondamento no apoio* (K1.3.51, K1.3.54, K1.4.7): opção `arredondamentoApoio` = 0 (sem) | 1 (parábola cúbica entre as faces com M e V das faces; padrão do sistema, referência) | 2 (ΔM = R·t/8, NBR 6118 14.6.3, Fig. 14.7; `padraoNBR`). A redistribuição atua nos momentos das faces e o trecho dentro do apoio é recalculado depois.
  - *Momento mínimo na face* (K1.3.55): opção `momentoFaceMin` (% do momento no eixo; padrão 0 nos dois perfis, critério do EC2 registrado pela referência, disponível como opção).
  - *Viga apoiada em viga* (K1.3.46): trecho rígido da viga apoiada até a face da viga de apoio, na grelha e no pórtico.
  - *Avisos de modelagem* (K1.3.47, K1.3.53, K1.12.1-17, K1.12.1-18): `VIGA_PAREDE` (ℓ/h < 2 biapoiada ou < 3 contínua, NBR 6118 22.4.1), `NAO_LINEAR` (comprimento < 3 × a maior dimensão da seção, 14.4.1; registro da referência: vão > 1/3 da altura média e > 4 × a largura média), `VIGA_PLACA` (largura > 2 × vão), `PILAR_CURTO` e `CONSOLO` (aviso de elemento a tratar à parte).
  - *Carga próxima ao apoio* (K1.12.1-13): redução da cortante de cargas a ≤ 2d do apoio (17.4.1.2.1) e aviso `CARGA_PROXIMA_APOIO` (biela-tirante, armadura horizontal manual) quando a ≤ d.
  - *Suspensão e vigas mestras* (K1.12.1-20, K1.4.81): armadura de suspensão nos apoios indiretos e cargas penduradas (18.3.6), força = reação de cálculo da viga apoiada (redução por h1/h2 [a confirmar]), estribos de suspensão no detalhamento (`detalhamento.ts`) e na prancha. Momentos mínimos nas lajes maciças: `lajeMomentoMinPositivo/Negativo` (p·ℓ²/x; padrão 0 [a confirmar, sem valor registrado para maciças]).
  - *Envoltória de cortante* (K1.4.71): opção `envoltoriaCortante` = 0 (contínua, hoje) | 1 (descontínua por zona de estribos); padrão 0 [a confirmar].
  - *Barras curtas* (K1.4.34): opções `barraCurtaLimite` (m) e `barraCurtaFator` (multiplicador de rigidez) [a confirmar os padrões].
  - *Torção: mínimos* (K1.12.1-10): ρsw,mín de torção (17.5.1.2), estribo fechado e espaçamento máximo verificados à parte e informados.
  - *Estribos com armadura comprimida* (K1.12.1-15): barras comprimidas de vigas travadas como nos pilares (s ≤ mín(20 cm; b; 12φ CA-50 / 24φ CA-25); φt ≥ φℓ/4; NBR 6118 18.2.4 aplicada às vigas [a confirmar]).
  - *Rótulas em cruzamentos* (K1.9.41): `Viga.articulacoes` aceita ids de vigas cruzadas.
  - *Vigotas biapoiadas* (K1.9.55): `Laje.vigotasBiapoiadas` libera as rotações nas bordas da treliçada; copiar o pano copia a continuidade.
  - *Desnível entre panos* (K1.9.85): desnível maior que a metade da menor espessura torna a borda sem continuidade [a confirmar o limite]; abaixo, vale o engaste da borda.
  - *Limites editáveis* (K1.12.2, K1.4.1): taxas mínimas por elemento (`vigaTaxaMin`, `lajeTaxaMin`; 0 = norma) e espaçamentos mínimos/máximos das vigas; K1.4.1 fecha quando a R7a entregar as tabelas de armadura.
  - *Aço por posição* (K1.6.6, K1.9.7): `acoPos.vigaMontagem` e `acoPos.vigaPele`.
- **Comandos:** `viga.editar` ampliado (articulações em cruzamentos), `laje.editar` ampliado (`vigotasBiapoiadas`), `materiais.definir` ampliado; o resto por `opcoes.definir`.
- **Interface:** opções novas no grupo Opções; diagrama arredondado e estribos de suspensão na janela da viga; avisos na planta.
- **Memorial:** critério de arredondamento, suspensão por cruzamento, avisos de modelagem listados.
- **Pranchas:** estribos de suspensão na elevação da viga (`armacaoVigas.ts`) com posição própria na tabela de aço.
- **Testes de aceite:** parábola cúbica com M e V das faces contra cálculo manual; ΔM = R·t/8; suspensão de um cruzamento; avisos com vigas-parede, curtas e placas; carga a d/2 do apoio; vigotas biapoiadas contra isostática; regressão (opções no padrão atual não mudam o exemplo, exceto o arredondamento, cuja diferença é medida e registrada); e2e `N2e`.

### N2f — Flechas: etapas de carga e flecha ativa (23 itens)

- **Itens:** C7.83, K1.4.85, K1.4.86, K1.11.4, K1.12.5-12, K1.14-1, K1.14-2, K1.14-4, K1.14-5, K1.14-7, K1.14-8, K1.14-9, K1.14-10, K1.14-11, K1.15.1-1, K1.15.4-13, K1.15.4-15, K1.15.4-16, K1.15.4-18, K1.15.4-20, K1.15.4-21, K1.15.4-22, K1.15.4-33.
- **Já existe (não refazer):** `flechasViga` (Branson por seção com a armadura calculada e integração da curvatura); αf = Δξ(t0) com ρ′ = 0 no edifício (`t0Flecha`); limites ℓ/250 e ℓ/350 (`limiteFlechaTotal`, `limiteFlechaSensorial`); lajes elásticas × (1 + αf) relativas aos apoios e `fatorFlechaLaje` (2,5; NBR 0); Mr da 17.3.1 e `bransonRatio` no Pórtico 2D; parcela após a alvenaria ≈ αf·f0 no Pórtico 2D.
- **Núcleo:** `src/core/building/flechas.ts` (as funções de flecha saem de `dimensionamento.ts`).
  - *Etapas de carga* (K1.4.86, K1.14-5, K1.14-10, K1.15.4-20, K1.15.4-21): `b.etapas?` = lista { nome, idade em dias, frações de G (peso próprio, alvenaria, revestimento) e de Q (ψ2) }; padrão do sistema pelo exemplo registrado: peso próprio aos 28 dias, alvenaria aos 60, revestimento aos 120, uso quase permanente após 1 ano. ξ(t) pela NBR 6118, Tabela 17.1; ξ médio ponderado pelas cargas → αf = Δξ/(1 + 50ρ′). Coeficientes separados para G e Q.
  - *Flechas por tipo* (K1.14-1, K1.14-4, K1.14-9, K1.14-11, K1.11.4): instantânea por caso (peso próprio, alvenaria, revestimento, variável), diferida, total a longo prazo e ativa (após o elemento danificável, as paredes): fA = αg·fg + αq·fq; total = ativa + a parcela ocorrida antes das paredes.
  - *Limites* (K1.14-2, K1.4.85, C7.83, K1.12.5-12): por tipo de flecha e de elemento (vigas, maciças, treliçadas; nervuradas e alveolares quando a E3 as criar), na forma ℓ/x, ℓ/x + cm ou absoluto em cm. Padrões NBR 6118, Tabela 13.3: total ℓ/250, variável ℓ/350, ativa ℓ/500 e 10 mm (efeito em paredes). Vigotas protendidas ficam com a E3.
  - *Fissuração das lajes* (K1.15.4-13, K1.15.4-15, K1.15.4-16, K1.15.1-1): Mr pela NBR 6118, 17.3.1 (exigência normativa, no lugar do fct,m,fl da referência); rigidez de cada barra da grelha por Branson com a armadura detalhada (R4/R6) e um recálculo da grelha com as rigidezes fissuradas (combinação quase permanente); inércia média do vão [(Ie,esq + Ie,dir)/2 + Ie,centro]/2 como opção (`inerciaMediaVao`), integração por seção como padrão (como nas vigas). Treliçadas e maciças com opções de etapas próprias.
  - *Inércia homogeneizada e rotações* (K1.14-7, K1.14-8): estádio I com a seção homogeneizada (αe = Es/Ecs) e rotações por caso na integração; Ecs mantido.
  - *ρ′ real* (K1.15.4-18): armadura de compressão do detalhamento (R3a/R4) no lugar de ρ′ = 0.
  - *Fatores simplificados* (K1.15.4-22, K1.15.4-33): além de `fatorFlechaLaje` (total, 2,5 decidido na N1e), `fatorFlechaAtiva` e `fatorFlechaConforto` pela tabela-resumo registrada (maciça 2,0 e 1,5; nervurada/treliçada 1,75 e 1,25; NBR 0 = método por etapas). A tabela registra 3,0 para a total da maciça: anotado para a revisão final dos "a confirmar", sem mudar a decisão da N1e.
  - Códigos `FLECHA_ATIVA` (erro) e `FLECHA_INST` (aviso).
- **Comandos:** `etapas.definir` (lista de etapas; `padrao: true` volta ao padrão); limites por `opcoes.definir`.
- **Interface:** tabela de etapas no grupo Opções (com colagem); tabela de flechas por tipo na janela da viga e da laje, com limites; flecha ativa na lista de erros.
- **Memorial:** etapas, ξ e αf calculados, flechas por tipo e por elemento contra os limites.
- **Pranchas:** nenhuma (contraflecha fica fora: não está nos checklists).
- **Testes de aceite:** composição do exemplo registrado (ξ médio ≈ 1,05, fator total 3,00·δi e ativa 1,965·δi com Ke = 1,5) contra a função de etapas; Mr e Branson de uma laje contra cálculo manual; viga biapoiada fissurada contra integração manual; regressão com etapas desligadas; e2e `N2f`.

### N2g — Resistência ao fogo, NBR 15200 (5 itens)

- **Itens:** C4.44, C10.6, K1.5.15, K1.9.10, K1.9.23.
- **Já existe (não refazer):** cobrimentos por elemento e por face (`Norma.cobFaces`, `cobrimento` por elemento); seções e armaduras detalhadas (R3/R4); estados-limite ativáveis (N2a).
- **Núcleo:** `src/core/building/fogo.ts`, opcional (padrão desligado, como na referência).
  - TRRF por grupo (`b.fogo.trrf`), com sugestão pela NBR 14432 (ocupação e altura) [a confirmar a tabela digitada].
  - Método tabular da NBR 15200 para lajes (h mínima e c1 por TRRF e tipo: apoiada, contínua, nervurada), vigas (pares bmín/c1, biapoiadas e contínuas) e pilares (método analítico com μfi e tabular) [a confirmar os números dos itens e as tabelas digitadas].
  - Revestimento de proteção por elemento ou grupo (espessura e material, equivalência em cobrimento) e laje compartimentadora (exige também a espessura de isolamento).
  - Resultado por elemento: TRF atingido, folga e código `FOGO_*` (erro quando TRF < TRRF).
- **Comandos:** `fogo.definir` (ativo, TRRF por grupo, revestimentos, lajes compartimentadoras).
- **Interface:** grupo "Incêndio" na aba Edifício; coluna TRF nas tabelas de vigas, pilares e lajes; erros na planta.
- **Memorial:** seção "Resistência ao fogo" (TRRF, método, tabela por elemento).
- **Pranchas:** TRRF e revestimentos nas notas gerais.
- **Testes de aceite:** casos de cada tabela (laje, viga, pilar) nos limites; revestimento reduzindo c1 exigido; desligado não muda nada; e2e `N2g`.

---

## Riscos e pontos que exigiriam o usuário

- **Desempenho do modelo integrado (N2b) e do P-Δ por combinação (N2c).** A condensação por pavimento mantém o custo perto do atual, mas o P-Δ resolve uma vez por combinação ELU. Se o teste de desempenho do fechamento (13 pavimentos ≤ 3 s) falhar com `segundaOrdem = pDelta`, o P-Δ fica só como opção (já é o padrão) e o relato da frente informa o tempo.
- **Tabelas normativas digitadas** (NBR 15200, NBR 14432, NBR 8681 para equilíbrio e empuxo, ábacos da NBR 6123): sem o texto da norma no ambiente, entram marcadas "a confirmar". Os ábacos de Ca e de vizinhança da NBR 6123 exigem os pontos da figura da norma (dado externo): até o usuário fornecer, a tabela de pontos fica vazia e vale o Ca informado.
- **Mudança de resultados por padrão novo:** `modeloGlobal = integrado` e `arredondamentoApoio = 1` mudam os esforços de todos os edifícios; a regressão registra as diferenças do exemplo, e o perfil `separado`/0 reproduz o comportamento anterior.
- Nenhuma dependência nova.

## Andamento

- 21/10/2026: N2a concluída (núcleo, interface e e2e `N2a`; testes em `src/core/building/acoes.test.ts`). Fora do escopo por falta de dado ou de fatia: pontos dos ábacos da NBR 6123 (tabelas vazias, Ca automático desativado), aplicação do empuxo às paredes (E1c), grupos de aço, madeira e alumínio. Estado-limite "usuário" vale nos grupos concreto, tensões no solo e fissuração; fundações, deslocamentos, flechas e equilíbrio usam fatores próprios. Detalhes no Andamento de `plano-execucao.md`.
- 21/10/2026: N2d concluída (núcleo, interface e e2e `N2d`; testes em `src/core/building/puncao.test.ts`). Fora do escopo por depender de outras fatias: punção em nervuras e ábacos (E3d), paredes (E1), momento do vento em laje lisa (modelo integrado, N2b); a redução de FSd pela carga dentro do contorno não é considerada (a favor da segurança). Detalhes no Andamento de `plano-execucao.md`.
- 21/10/2026: N2b concluída (núcleo, interface e e2e `N2b`; testes em `src/core/casca.test.ts` e `src/core/building/integrado.test.ts`; validação `validation/opensees/integrado.py`). Modelo integrado como padrão do sistema (`modeloGlobal` 1; perfil NBR e opção 0 reproduzem o modelo separado anterior, bit a bit). Vigas do diafragma ficam fora da solução do pórtico (plano XY rígido) e recebem os esforços da grelha condensada; a punção usa os momentos laje → pilar com o vento (pendência da N2d resolvida). Fora do escopo por depender da E1c: cascas nas paredes e pilares-parede (K1.2.5 e K1.3.36 seguem Parcial); a flexão das lajes segue com as combinações verticais. Detalhes e diferenças de esforços no Andamento de `plano-execucao.md`.
- 21/10/2026: N2c concluída (núcleo, interface e e2e `N2c`; testes em `src/core/building/segundaOrdem.test.ts`, `src/core/pdelta3.test.ts`, `src/core/pdelta3.validacao.test.ts` e `src/core/metodoGeral.test.ts`; validação `validation/opensees/pdelta3d.py`). P-Δ por iteração com a rigidez linear fatorada (forças fictícias por combinação) em vez de refatorar K + K_G; matriz geométrica de corpo rígido no edifício (a P-δ fica com os efeitos locais) e consistente disponível para a comparação com o Pórtico 2D. Lances desligados com `padraoNBR` 0 (o perfil NBR reproduz o comportamento anterior). Fora do escopo: P-Δ nas barras da base elástica (radier e vigas sobre base elástica usam os esforços de 1ª ordem) e nas cargas da fundação por caso. Detalhes no Andamento de `plano-execucao.md`.
