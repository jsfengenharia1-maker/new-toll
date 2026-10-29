# Mapa de migração para o layout BIMCraft

Inventário de 23/10/2026 (Fase 1 da migração). Só leitura do código; nada foi movido. Cada comando, ferramenta, grupo, janela e tecla atual tem destino no layout novo definido em `docs/analises/design-bimcraft.md` e `design-bimcraft-previa.html`. Plano e cartões: `docs/cartoes/D1` a `D6` (resumo em `docs/cartoes/D1/00-plano-D1-a-D6.md`).

## 0. Siglas de destino

| Sigla | Destino |
|---|---|
| **QA** | Barra de acesso rápido (linha superior `.qbar`): marca, desfazer, refazer, salvar, nome da obra, ajuda, tema |
| **MT** | Aba de módulo (`.modtabs`, `role=tab`, `aria-label="Módulo"`): Pórtico, Edifício, Fundações |
| **RB:x** | Aba `x` da faixa de comandos (`aria-label="Faixa de comandos"`): `arquivo`, `lancamento`, `edicao`, `cargas`, `analise`, `dimensionamento`, `fundacoes`, `pranchas`, `vista`; no Edifício (reorganizado por etapas em 29/10/2026, ver fluxo-etapas.md): `obra`, `pilares`, `vigasLajes`, `cargas`, `fundacao`, `calcular`, `resultados`, `pranchas`, `edicao`, `vista`; `ctx` = aba contextual do elemento selecionado (aparece com seleção) |
| **OB** | Barra de opções do comando ativo: a `PlantaBarra` reduzida (classes `planta-barra optbar`), acima do canvas, dentro da vista Planta: pavimento da planta e as opções pequenas da ferramenta ativa (cópias, ângulo, h do radier, punção…) |
| **NAV** | Doca esquerda, paleta Navegador (árvore: Obra, Pavimentos, Grupos, Eixos, Pilares, Vigas, Lajes, Fundação, Cargas, Vistas) |
| **PROP:g** | Doca direita, paleta Propriedades; `g` = grupo recolhível (o `Group` atual, com o mesmo título) |
| **CFG** | Janela "Configuração da obra" (modal larga, índice lateral com os grupos de premissas, abre pela faixa Arquivo); os grupos entram sem mudar de componente |
| **VT** | Aba de vista acima do desenho (`.vtabs`; no Edifício mantém a classe `.edif-tabs`) |
| **SB** | Barra de status (`.statusbar`, mensagem à esquerda; contagens, coordenadas e opções de visualização à direita) |
| **JAN** | Janela/diálogo modal que continua como está (aberta pelo mesmo gatilho, agora em botão da faixa) |
| **DOCA-D** | Doca direita do Pórtico: as 5 abas atuais (Estrutura, Cargas, Resultados, Influência, Dimensionar) permanecem, em `.panel .tabs` |

Regras gerais do mapa: (1) nenhum comando muda de nome, de rótulo acessível (`aria-label`/texto), de `role` nem de tecla; (2) onde a tecla de atalho existe, o botão da faixa mostra `title="<rótulo> (<tecla>)"`; (3) o botão só muda de lugar (um único elemento por comando). Exceção deliberada, para não quebrar fluxos e automações que o acham por papel e nome: onde o comando já tem botão **dentro de uma vista** (abas Análise, Dimensionamento, Pranchas), o botão da vista fica e a faixa ganha um atalho com **rótulo diferente** (ex.: "Calcular obra" no lugar de "Calcular e dimensionar"; "Calcular as fundações" no lugar de "Calcular fundações"; "Memorial da obra" no lugar de "Memorial do edifício"); (4) formulários com campos (Malha de eixos, Novo pavimento, Dados gerais, premissas) nunca ficam na faixa: o botão da faixa abre uma janela (`Modal`) ou a seção correspondente da Configuração da obra; (4) o canvas da planta continua um único elemento `canvas.int` dentro de `.planta-cv`.

## 1. Pórtico (App.tsx, Canvas.tsx, panels/*)

| # | Item | Tecla | Origem | Destino | Nota |
|---|---|---|---|---|---|
| P1 | Marca Statikos | | App.tsx `.brand` | QA | |
| P2 | Menu "Arquivo ▾" | | App.tsx `.menuwrap` | RB:arquivo (grupos Arquivo, Exportar, Exemplos) | rótulos dos itens preservados; `fileMenu` do e2e passa a abrir a aba |
| P3 | Novo modelo | | App.tsx menu | RB:arquivo / Arquivo | |
| P4 | Abrir trabalho do computador… | Ctrl+O | App.tsx menu | RB:arquivo / Arquivo; QA (ícone) | |
| P5 | Salvar no computador | Ctrl+S | App.tsx menu e botão "Salvar" | QA (botão "Salvar" fica) e RB:arquivo | um só botão "Salvar" na QA; o item do menu vira "Salvar no computador" na faixa (rótulo do menu preservado) |
| P6 | Salvar como… | Ctrl+Shift+S | App.tsx menu | RB:arquivo / Arquivo | |
| P7 | Biblioteca e histórico… | | App.tsx menu e botão "Biblioteca" | QA (botão) | item do menu = o botão |
| P8 | Só o modelo (.json) | | App.tsx menu | RB:arquivo / Exportar | |
| P9 | Exportar desenho (SVG) | | App.tsx menu | RB:arquivo / Exportar | |
| P10 | Exportar desenho (PNG) | | App.tsx menu | RB:arquivo / Exportar | |
| P11 | Copiar desenho | | App.tsx menu | RB:arquivo / Exportar | |
| P12 | Importar materiais, seções e unidades de outro arquivo… | | App.tsx menu + `<input type=file hidden>` | RB:arquivo / Exportar | |
| P13 | Desenho DXF (CAD) | | App.tsx menu | RB:arquivo / Exportar | |
| P14 | Exemplos (SAMPLES: portico, viga contínua etc.) | | App.tsx menu | RB:arquivo / Exemplos | um botão por exemplo, mesmos rótulos |
| P15 | Nome do modelo (input) | | App.tsx `.mname` | QA | `aria-label="Nome do modelo"` |
| P16 | Desfazer / Refazer | Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) | App.tsx `.tgroup` | QA | |
| P17 | Abas de módulo Pórtico / Edifício / Fundações | | App.tsx `.modsw` | MT | `role=tab`, `aria-label="Módulo"` |
| P18 | Selo de estado (`.status`: N nós, M barras, gdl; Instável) | | App.tsx | SB (direita) | e2e usa `.topbar .status`: vira `.statusbar .status` |
| P19 | Memorial | | App.tsx botão | QA (botão "Memorial") | abre o `Memorial` (JAN) |
| P20 | Modo de ajuda | F1 | ui/Ajuda `BotaoAjuda` | QA | |
| P21 | Tema da interface (Sistema/Escuro/Claro) | | ui `ThemeSelect` | QA | |
| P22 | Painel / Ocultar painel (≤ 860 px) | | App.tsx `.panel-toggle` | QA (só em tela estreita); em tela larga o botão recolher da doca | |
| P23 | Ferramenta Selecionar | S | App.tsx TOOLS / store `tool=select` | RB:lancamento / Seleção | `aria-label="Selecionar"` |
| P24 | Ferramenta Inserir nó | N | TOOLS | RB:lancamento / Elementos | `aria-label="Inserir nó"` |
| P25 | Ferramenta Inserir barra | M | TOOLS | RB:lancamento / Elementos | |
| P26 | Ferramenta Cota (2 pontos e a posição) | D | TOOLS | RB:lancamento / Anotação | |
| P27 | Ferramenta Zoom por janela | Z | TOOLS | RB:vista / Navegação | |
| P28 | Ferramenta Mover vista (pan) | H | TOOLS | RB:vista / Navegação | também botão do meio / Alt+arrastar |
| P29 | Enquadrar | F | TOOLS (fim) | RB:vista / Navegação | |
| P30 | Esc (volta a Selecionar e limpa seleção), Delete/Backspace (remove seleção), botão direito (encerra sequência) | Esc, Del | App.tsx onKey, Canvas.tsx | OB (dica) + teclado inalterado | |
| P31 | Teclas 1–5 (abas do painel) | 1 a 5 | App.tsx onKey | DOCA-D (tecla mantida) | |
| P32 | Entrada por coordenadas (`#coordinput`) | | App.tsx statusbar | SB | |
| P33 | Eixos locais (checkbox) | | statusbar | SB / Vista | |
| P34 | P&B (checkbox) | | statusbar | SB / Vista | |
| P35 | Símbolos (P/M/G) | | statusbar | SB / Vista | |
| P36 | Snap (checkbox) | | statusbar | SB | |
| P37 | Cotas automáticas (checkbox) | | statusbar | SB / Vista | |
| P38 | Grade (0,05 a 2 m) | | statusbar | SB | |
| P39 | Unidades (força e comprimento) | | statusbar | SB | rótulos preservados |
| P40 | Painel Estrutura: Nó, Barra (propriedades do selecionado) | 1 | panels/Estrutura `Nó n`, `Barra n` | DOCA-D → PROP (D5: cartão do tipo + grupos) | |
| P41 | Estrutura: Apoios | 1 | Estrutura | DOCA-D / PROP:Apoios | |
| P42 | Estrutura: Rótulas e ligações | 1 | Estrutura | DOCA-D / PROP:Rótulas e ligações | |
| P43 | Estrutura: Materiais | 1 | Estrutura | DOCA-D / PROP:Materiais | |
| P44 | Estrutura: Seções | 1 | Estrutura | DOCA-D / PROP:Seções | |
| P45 | Estrutura: Opções de análise | 1 | Estrutura | CFG (Pórtico: Opções de análise) e RB:analise | |
| P46 | Estrutura: Dimensionamento das barras | 1 | Estrutura | DOCA-D / PROP | |
| P47 | Estrutura: Transformar seleção (mover, copiar, girar, espelhar; Repetir última) | 1 | Estrutura | RB:edicao / Seleção (botão "Transformar seleção…") e DOCA-D | |
| P48 | Estrutura: Cotas manuais | 1 | Estrutura | DOCA-D / PROP | |
| P49 | Painel Cargas: Casos de carga | 2 | panels/Cargas | RB:cargas / Casos e combinações; DOCA-D | |
| P50 | Cargas: Aplicar carga | 2 | Cargas | RB:cargas / Cargas; DOCA-D | |
| P51 | Cargas: lista “Cargas em <caso>” | 2 | Cargas | DOCA-D | |
| P52 | Cargas: Combinações | 2 | Cargas | RB:cargas / Cargas; DOCA-D | |
| P53 | Painel Resultados: Carregamento, Diagrama, Extremos, Tabelas, Ao longo de um caminho | 3 | panels/Resultados | RB:analise / Resultados; DOCA-D | |
| P54 | Painel Influência: Linha de influência, Trem-tipo, Caminho e envoltória | 4 | panels/Influencia | RB:analise / Influência; DOCA-D | |
| P55 | Painel Dimensionar: Barras, Cargas na fundação, Estabilidade global, Premissas, Barra n | 5 | panels/Dimensionar | RB:dimensionamento; DOCA-D | |
| P56 | Estabilidade e vibração (Modos) | 5 | panels/Modos | RB:analise; DOCA-D | |
| P57 | Memorial (overlay: Imprimir / PDF, Exportar HTML, Fechar) | | Memorial.tsx | JAN | inalterado |
| P58 | Biblioteca (overlay) | | Library.tsx | JAN | inalterado |

## 2. Edifício: barra superior e colunas (Edificio.tsx)

| # | Item | Tecla | Origem | Destino | Nota |
|---|---|---|---|---|---|
| E1 | Nome da obra no cabeçalho | | Edificio `NomeObra` (App.tsx `.mname`) | QA | `aria-label="Nome da obra no cabeçalho"` |
| E2 | Desfazer / Refazer | Ctrl+Z / Ctrl+Y | App.tsx | QA | |
| E3 | Barra de atalhos configurável (⚙, atalhos) | | BarraAtalhos.tsx | QA (segunda linha da `.qbar`, só no Edifício) | catálogo em `src/core/ajuda/atalhos.ts` |
| E4 | Atalho Desfazer / Refazer / Ajuda (F1) / Guia rápido / Copiar de outro grupo / Unir pavimentos | | atalhos.ts | os de ação seguem em E3; Desfazer, Refazer e Ajuda duplicam P16/P20 (ver seção 7) | |
| E5 | Atalho Selecionar / Pilar / Viga / Laje / Carga / Eixo / Mover / Copiar / Medir | S P V L C E M Y D | atalhos.ts | E3 (executam a mesma ferramenta da faixa) | |
| E6 | Atalho aba Dimensionamento / Verificação | | atalhos.ts | E3 | seleciona a VT |
| E7 | Etapas da obra (Dados gerais, Pavimentos, Gabarito, Pilares, Pilares-parede, Vigas, Lajes, Cargas, Cálculo; botão "Ir") | | EtapasObra.tsx `EtapasGrupo` | NAV, paleta "Etapas da obra" fixa abaixo da árvore | rótulo `Ir para <etapa>` preservado |
| E8 | Arquivo e versões (versões no arquivo, resultados, Recuperar versão) | | EtapasObra.tsx `ArquivoGrupo` | RB:arquivo / Arquivo (botão "Versões do arquivo…" → CFG:Arquivo e versões) | |
| E9 | Grupo "Obra" (Nova obra…, Obras recentes…, Dados gerais…, corpo `DadosGeraisCorpo`) | | Edificio.tsx | RB:obra / Obra (botões); CFG:Dados gerais (corpo) | `DadosGeraisJanela` (JAN) continua como a janela do botão "Dados gerais…" |
| E10 | Nova obra (assistente `NovaObra`, passos) | | NovaObra.tsx, NovaObraPassos.tsx | JAN, aberto de RB:obra / Obra | |
| E11 | Obras recentes | | ObrasRecentes.tsx | JAN, RB:obra / Obra | |
| E12 | Importar de texto | | ImportarTexto.tsx | JAN, RB:obra / Obra | |
| E13 | Pavimentos (tabela: nome, grupo, cota, pé-direito, +1, ×; NovoPavimento) | | Edificio.tsx `Pavimentos` + `NovoPavimento` | NAV (nó Pavimentos) e PROP:Pavimento (editor da linha selecionada); RB:obra / Pavimentos e grupos (Novo pavimento, +1 acima, Remover) | `aria-label="Nome de <pav>"`, `Remover <pav>` preservados |
| E14 | Grupos (tabela: nome, uso NBR 6120, rev., q) | | Edificio.tsx `Grupos` | NAV (nó Grupos) e PROP:Grupo | |
| E15 | Grupos: cópia, união e áreas | | GruposL4.tsx `GruposCopiaGrupo` | RB:obra / Pavimentos e grupos (Copiar de outro grupo…, Unir pavimentos…); PROP:Áreas | diálogos `CopiarGrupoDialogo`, `UnirPavimentosDialogo` (JAN) |
| E16 | Eixos (malha, lista, remover todos) | E (ferramenta) | Edificio.tsx `Malha` | NAV (nó Eixos); RB:pilares / Eixos (Malha de eixos…, ferramenta Eixo) | |
| E17 | Linha de comando (`LinhaComando`) | | Edificio.tsx | SB (entrada de comando à esquerda da mensagem; `aria-label` preservado) | |
| E18 | Máscara — <grupo> (Importar DXF…, Alinhar por 2 pontos, Lançar por DXF/DWG…, Gabaritos e vistas…, Vistas por pavimento…, Capturas…, ajustar escala, camadas visíveis/capturáveis, Linha = face/eixo, Viga pelo gabarito) | | Edificio.tsx `MascaraGrupo` | RB:pilares / Gabarito (botões); NAV (nó Gabaritos com as camadas); `<input type=file hidden aria-label="Arquivo DXF da máscara">` vai junto | |
| E19 | Pilares (lista, colar tabela, seção, ajuste, ângulo, arranque) | P | Edificio.tsx `PilaresGrupo` | NAV (nó Pilares); PROP:Pilar (sem seleção: parâmetros da ferramenta Pilar: seção, ajuste, ângulo, arranque); RB:lancamento / Elementos | |
| E20 | Pilares-parede | | PilarParedeUI.tsx | NAV (nó Pilares-parede); PROP; RB:lancamento / Elementos (ferramenta) | `CartaoPilaresParede` fica em RB:dimensionamento (cartão da aba Dimensionamento) |
| E21 | Paredes de concreto | | ParedesUI.tsx | NAV (nó Paredes); PROP; RB:lancamento | `CartaoParedes` idem |
| E22 | Muros de arrimo | | MurosUI.tsx | NAV (nó Muros); PROP | |
| E23 | Alvenaria estrutural | | AlvenariaUI.tsx | NAV (nó Alvenaria); PROP; CFG (tipos de bloco) | |
| E24 | Vigas — <grupo> (lista, seção, alinhamento, passagem/curva, renumerar, detectar) | V | Edificio.tsx `VigasGrupo` | NAV (nó Vigas); PROP:Viga (sem seleção: parâmetros da ferramenta Viga: seção, alinhamento, curva) | |
| E25 | Ferramentas de lançamento (modo simples, deslocamento, contorno retangular, abertura, direção do pano, cargas rápidas) | | LancamentoL5.tsx | PROP (sem seleção: grupo "Ferramentas de lançamento", mantido porque tem muitos campos) e RB:vigasLajes / Lançamento rápido | |
| E26 | Lajes — <grupo> (lista, tipo, detectar panos) | L | Edificio.tsx `LajesGrupo` | NAV (nó Lajes); PROP:Laje (sem seleção: tipo de laje da ferramenta) | |
| E27 | Referências e dados (mover referência, conta-gotas, ponto fixo, dados do pano) | | DadosL4.tsx | RB:edicao / Referências; PROP | |
| E28 | Fundação (grupo, elementos, parâmetros, sapatas, blocos, limites, base elástica, vigas, corridas, radier) | U B K N W X A T Q | Fundacao.tsx `FundacaoGrupo` + FundacaoGrupoUI, VigaFundacao, BaseElasticaUI, CorridaUI | RB:fundacoes (comandos), NAV (nó Fundação > elementos), PROP (elemento), CFG (Parâmetros do cálculo, premissas) | detalhado na seção 4 |
| E29 | Cargas — <grupo> (lista, tipo, caso, valor) | C | Edificio.tsx `CargasGrupo` | NAV (nó Cargas); PROP:Carga (sem seleção: tipo, caso e valor da ferramenta Carga); RB:cargas / Cargas lançadas | |
| E30 | Cortes e seções | | CortesUI.tsx | NAV (nó Cortes); RB:pranchas / Cortes (ferramentas Corte, Seção) | `JanelaCorte` (JAN) |
| E31 | Vento e combinações | | Edificio.tsx `VentoGrupo` | RB:cargas / Vento; CFG:Vento | |
| E32 | Ábacos de vento (NBR 6123) | | AbacosVento.tsx | CFG:Vento | |
| E33 | Casos de carga (+ arranjos) | | Casos.tsx, CasosArranjos.tsx | RB:cargas / Casos e combinações; CFG:Casos de carga | |
| E34 | Estados-limite e combinações | | EstadosLimite.tsx | CFG:Estados-limite | |
| E35 | Empuxo de terra | | Empuxo.tsx | RB:cargas / Outras ações; CFG:Empuxo | |
| E36 | Opções de cálculo (perfis sistema/NBR) | | OpcoesCalculo.tsx | CFG:Opções de cálculo; RB:analise (botão) | |
| E37 | Etapas de carga (flechas) | | EtapasFlecha.tsx | CFG:Etapas de carga | |
| E38 | Incêndio | | Incendio.tsx | RB:cargas / Outras ações; CFG:Incêndio | |
| E39 | Materiais e segurança (+ biblioteca) | | Materiais.tsx, MateriaisBiblioteca.tsx | CFG:Materiais e segurança | |
| E40 | Tabelas de armadura | | TabelasArmadura.tsx | CFG:Tabelas de armadura | `tabelaFoco` (atalho da lista de erros) abre CFG na tabela |
| E41 | Biblioteca de normas | | BibliotecaNormas.tsx | CFG:Biblioteca de normas | |
| E42 | Tipos de laje (+ fichas/enchimentos) | | TiposLaje.tsx | CFG:Tipos de laje; RB:vigasLajes / Lajes | |
| E43 | Vínculos, flambagem e cobrimento (seleção) | | Vinculos.tsx | PROP:Vínculos (elemento selecionado) | |
| E44 | Vigas inclinadas (janela e lista) | | InclinadasUI.tsx, `InclinadasHost` | RB:lancamento / Elementos (botão "Vigas inclinadas"); JAN | também item da paleta Ctrl+K |

## 3. Edifício: planta, ferramentas e teclas (Planta.tsx, plantaStore.ts, Edificio.tsx `PlantaBarra`)

Todas as 40 ferramentas de `Ferramenta` (plantaStore.ts) e a tecla de `TECLA_FERRAMENTA` (Planta.tsx). Botão = `RibbonButton` `role=radio` com o mesmo `ROTULO_FERRAMENTA`, dentro de `radiogroup`.

| # | Ferramenta (rótulo) | Tecla | Origem do botão hoje | Destino |
|---|---|---|---|---|
| T1 | Selecionar | S | PlantaBarra FERRAMENTAS | RB:lancamento / Seleção |
| T2 | Pilar | P | PlantaBarra | RB:lancamento / Elementos |
| T3 | Viga | V (R: trecho reto/curvo; A: alinhamento) | PlantaBarra | RB:lancamento / Elementos |
| T4 | Laje | L | PlantaBarra | RB:lancamento / Elementos |
| T5 | Carga | C | PlantaBarra | RB:cargas / Cargas lançadas |
| T6 | Eixo | E | PlantaBarra | RB:pilares / Eixos |
| T7 | Fundação | U | PlantaBarra (nível de fundação) e grupo Fundação | RB:fundacao / Elementos |
| T8 | Viga de fundação | B | PlantaBarra, Fundacao.tsx | RB:fundacao / Elementos |
| T9 | Girar 2 pontos | K | PlantaBarra, Fundacao.tsx | RB:fundacao / Modificar |
| T10 | Ponto de inserção | N | PlantaBarra, FundacaoGrupoUI | RB:fundacao / Modificar |
| T11 | Limite da fundação | T | PlantaBarra | RB:fundacao / Limites |
| T12 | Limite pela máscara | Q | PlantaBarra | RB:fundacao / Limites |
| T13 | Mover | M | PlantaBarra | RB:edicao / Modificar |
| T14 | Medir | D | PlantaBarra | RB:vista / Navegação |
| T15 | Alinhar máscara | (sem tecla; só com máscara) | MascaraGrupo | RB:pilares / Gabarito |
| T16 | Radier | W | Fundacao.tsx/BaseElasticaUI | RB:fundacao / Elementos |
| T17 | Viga sobre base elástica | X | BaseElasticaUI | RB:fundacao / Elementos |
| T18 | Sapata corrida | A (só no nível de fundação, fora de Viga e Pilar) | CorridaUI | RB:fundacao / Elementos |
| T19 | Dividir viga | I | PlantaBarra EDICAO | RB:edicao / Modificar |
| T20 | Unir vigas | J | PlantaBarra | RB:edicao / Modificar |
| T21 | Prolongar viga | O | PlantaBarra | RB:edicao / Modificar |
| T22 | Copiar | Y | PlantaBarra | RB:edicao / Modificar |
| T23 | Girar | G | PlantaBarra | RB:edicao / Modificar |
| T24 | Espelhar | H | PlantaBarra | RB:edicao / Modificar |
| T25 | Armadura de punção | Z | PlantaBarra (botão "Armadura de punção", só com punção calculada) | RB:resultados / Armaduras |
| T26 | Zona de uniformização | | EdicaoLajes.tsx | RB:resultados / Armaduras |
| T27 | Linha de dobra | | EdicaoLajes.tsx | RB:resultados / Armaduras |
| T28 | Pilar-parede | (R gira 90°) | PilarParedeUI | RB:lancamento / Elementos |
| T29 | Parede de concreto | | ParedesUI | RB:lancamento / Elementos |
| T30 | Corte do edifício | | CortesUI | RB:pranchas / Cortes |
| T31 | Linha de seção | | CortesUI | RB:pranchas / Cortes |
| T32 | Viga pelo gabarito | | MascaraGrupo | RB:vigasLajes / Vigas |
| T33 | Mover referência | | DadosL4 | RB:edicao / Referências |
| T34 | Conta-gotas | | DadosL4 | RB:edicao / Referências |
| T35 | Contorno retangular de vigas | | LancamentoL5 | RB:vigasLajes / Lançamento rápido |
| T36 | Abertura retangular | | LancamentoL5 | RB:vigasLajes / Lançamento rápido |
| T37 | Carga na laje inteira | | LancamentoL5 | RB:cargas / Cargas lançadas |
| T38 | Carga ao longo da viga | | LancamentoL5 | RB:cargas / Cargas lançadas |
| T39 | Direção do pano | | LancamentoL5 | RB:vigasLajes / Lajes |
| T40 | Inserção do pano (vértice) | | LancamentoL5 | RB:vigasLajes / Lajes |
| T41 | Cota em série | | PlantaBarra | RB:lancamento / Anotação (L6; acrescentada após o mapa) |
| T42 | Definir plano na planta | | PlanosUI | RB:vigasLajes / Planos (E3f; acrescentada após o mapa) |
| T43 | Escada | Shift+E | EscadaMenu.tsx, Planta.tsx | RB:lancamento / Elementos (E4b; acrescentada após o mapa) |
| T44 | Flecha entre dois pontos | | Planta.tsx, AbaDeslocamentos.tsx | RB:resultados / Consultas (V6d; acrescentada após o mapa) |
| T45 | Diagonal por dois pontos | | Planta.tsx, MenuFerramentaMouse.tsx | RB:lancamento / Elementos (E5b; acrescentada após o mapa) |
| T46 | Consolo na face do pilar | | Planta.tsx | RB:lancamento / Elementos (E5b; acrescentada após o mapa) |
| T47 | Ábaco | | Planta.tsx, MenuFerramentaMouse.tsx | RB:vigasLajes / Ábacos (E5b; acrescentada após o mapa) |

Opções e botões da `PlantaBarra` (barra da planta hoje, `.planta-barra`):

| # | Item | Tecla | Destino |
|---|---|---|---|
| B1 | Pavimento da planta (select, inclui "Fundação") | | OB (fixo à esquerda da barra de opções; `aria-label="Pavimento da planta"` preservado) e nó ativo do NAV |
| B2 | Copiar: Cópias; Girar: Ângulo; Espelhar: manter originais | | OB (opção da ferramenta ativa) |
| B3 | Fundação: Vários pilares (Enter cria) | Enter | OB |
| B4 | Radier: h do radier; Sapata corrida: bw, aba, cintas; Viga elástica: b, h | | OB |
| B5 | Mapa da base elástica (nenhum/tensão/recalque) | | RB:vista / Camadas |
| B6 | Limite fechado | | OB |
| B7 | Orto | F8 | SB (alternadores) e tecla mantida |
| B8 | Polar 15° | F10 | SB e tecla |
| B9 | Capturas (janela de modos; liga/desliga) | F3 | SB (botão "Capturas…") e tecla; `JanelaCapturas` (JAN) |
| B10 | Inferior | | RB:vista / Camadas |
| B11 | Mostrar erros | | RB:vista / Camadas |
| B12 | Armadura das lajes na planta (não/inferior/superior/ambas/editar/punção) | | RB:vista / Camadas (`aria-label="Armadura das lajes na planta"` preservado) |
| B13 | Armadura de punção (modo adicionar/apagar, linhas, barras/linha, φ, espaçamento, Apagar punção da seleção) | Z | OB |
| B14 | Mostrar todas as faixas de vigotas | | RB:vista / Camadas |
| B15 | Calcular fundações (nível de fundação) | | RB:calcular / Parciais |
| B16 | Girar 90° / Ao pilar / Remover (elementos de fundação selecionados) | R / Del | RB:ctx (aba "Fundação") e teclado inalterado |
| B17 | Resultados do elemento | | RB:ctx (qualquer elemento) e RB:dimensionamento |
| B18 | Tema da planta (Escuro/Claro/P&B) | | RB:vista / Camadas |
| B19 | Cores (`CoresPlanta`, popover) | | RB:vista / Camadas |
| B20 | Painel de edição de armadura das lajes (`PainelEdicaoLajes`, sob a planta; gerar, zonas, linhas) | | permanece sob a planta (dentro do centro); aberto por RB:resultados / Armaduras |
| B21 | Linha de estado da planta (`.planta-st`: coordenadas, passo, tecla) | | permanece (classe `.planta-st` mantida); a SB não duplica |
| B22 | Ajuda da ferramenta ativa (`AjudaFerramenta`) | F1 | permanece sobre o canvas |

Teclas da planta (Planta.tsx, `onKey`; só no módulo Edifício, com foco fora de campos): todas permanecem.

| # | Tecla | Efeito | Destino |
|---|---|---|---|
| K1 | S P V L C E M D U B K N T Q W X I J O Y G H Z | escolhem a ferramenta (tabela T) | atalho no `title` do botão da faixa |
| K2 | A | corrida no nível de fundação; alinhamento da viga (ferramenta Viga); ajuste do pilar (ferramenta Pilar) | OB (dica) |
| K3 | R | gira pilar, pilar-parede, elementos de fundação selecionados; trecho curvo da viga | OB |
| K4 | F | enquadra | RB:vista / Navegação |
| K5 | F3 / F8 / F10 | capturas / orto / polar | SB |
| K6 | Tab | alterna a captura sob o cursor | OB (dica) |
| K7 | Enter | termina polilinha; cria grupo (fundação vários pilares); contorno retangular; repete o último comando | OB (dica) |
| K8 | Esc | cancela a sequência | inalterado |
| K9 | Backspace / Delete | apaga último ponto da viga / remove seleção | inalterado |
| K10 | Espaço | pan temporário | inalterado |
| K11 | dígitos, `@ - + . , ; <` | entrada numérica (campo "Valor digitado") | inalterado |
| K12 | Ctrl+K | Paleta de comandos | QA (botão de busca "Comandos…") e tecla |
| K13 | F1 | Modo de ajuda | QA |
| K14 | Ctrl+Z / Ctrl+Y | desfazer/refazer | QA |
| K15 | Ctrl+S / Ctrl+O / Ctrl+Shift+S | salvar / abrir | QA |
| K16 | W A S D, setas, Shift (vista 3D, "caminhar") | controles.ts | permanece na VT 3D |

## 4. Edifício: fundação, vistas, dimensionamento e janelas

| # | Item | Origem | Destino |
|---|---|---|---|
| F1 | Fundação: "Planta de fundação (U)" (botão primário) | Fundacao.tsx | RB:fundacao / Elementos |
| F2 | Fundação: Calcular fundações / Calcular sem fundação | Fundacao.tsx, Edificio `DimensionamentoAba`, Pranchas | RB:calcular / Parciais (um botão; as outras ocorrências, ver seção 7) |
| F3 | Fundação: Modo de cálculo (Dimensionar tudo / Só verificar / Redimensionar só erros) | Fundacao.tsx | RB:fundacao / Nível e dados (select) e PROP |
| F4 | Fundação: Terreno (σadm, σadm × vento, cota do terreno) | Fundacao.tsx | CFG:Terreno |
| F5 | Fundação: Tipos de estaca (+ estaca) | Fundacao.tsx | CFG:Tipos de estaca |
| F6 | Fundação: Sondagens SPT (+ furo) | SondagemEditor.tsx | CFG:Sondagens SPT |
| F7 | Fundação: lista de elementos e editor (`ElementoGrupoEditor`: tipo, posição, dimensões impostas, estaca, associar pilares) | Fundacao.tsx, FundacaoGrupoUI | NAV (Fundação > elementos); PROP:Elemento de fundação |
| F8 | Fundação: Opções de sapatas, Limites do bloco, Sobreposição | FundacaoGrupoUI | CFG:Sapatas; RB:fundacao / Limites |
| F9 | Fundação: Vigas de fundação (equilíbrio, travamento) | Fundacao.tsx, VigaFundacao.tsx | NAV; PROP:Viga de fundação |
| F10 | Fundação: Base elástica (radier, viga elástica, tabela de k) | BaseElasticaUI.tsx | CFG:Base elástica (tabela de k); PROP |
| F11 | Fundação: Sapatas corridas (parâmetros) | CorridaUI.tsx | CFG:Sapatas corridas |
| F12 | Fundação: Parâmetros do cálculo | Fundacao.tsx | CFG:Parâmetros do cálculo da fundação |
| F13 | Janela do elemento de fundação / viga / base elástica / corrida / muro (`JanelaElemento`) | Revisao.tsx, Fundacao.tsx | JAN (aberta pela PROP e pela lista) |
| V1 | VT Planta | Edificio.tsx | VT |
| V2 | VT 3D (vista 3D e controles: escopo, grupo, pavimentos, tipos, projeção, transparências, azimute, elevação, caminhar, textura, detalhe, armaduras, deformada, Enquadrar, Capturar PNG) | Vista3D.tsx | VT; os controles ficam num painel dentro da vista (classe própria); "Enquadrar" duplica F (ver seção 7) |
| V3 | VT Elevação | Edificio.tsx `Elevacao` | VT |
| V4 | VT Verificação (contagem; classe `bad` com erros) | Edificio.tsx `Diagnosticos` | VT |
| V5 | VT Análise (Calcular; 2ª ordem global; vento e estabilidade; cargas na fundação; lajes por pavimento; combinações) | Edificio.tsx `Analise`, SegundaOrdem.tsx | VT (conteúdo inalterado); botão Calcular repetido em RB:analise |
| V6 | VT Deslocamentos | AbaDeslocamentos.tsx | VT |
| V7 | VT Isovalores (várias janelas) | AbaIsovalores.tsx | VT |
| V8 | VT Dimensionamento (Calcular e dimensionar, Recalcular, Calcular sem fundação, Enviar cargas ao módulo Fundações, Memorial do edifício, exportar, só o que não atende; Rearmar, Relatórios, cartões, Lista de erros, Bloqueio, Agrupamentos, Cópia de lajes; tabelas Vigas, Pilares, Lajes, Punção, Fundações, Quantitativos) | Edificio.tsx `DimensionamentoAba` | VT (conteúdo); os botões de ação principais sobem para RB:dimensionamento |
| V9 | VT Pranchas (Tipo, Grupo, Formato, Escala, Calcular fundações, folhas, PDF, DXF, DWG, zips; Opções de armação e locação; Rótulos das barras; Ancoragem das vigas de fundação; Carimbo, logo) | Pranchas.tsx | VT (conteúdo); RB:pranchas traz atalhos (Ir para Pranchas, PDF (todas), DXF, DWG) |
| V10 | VT Premissas (lista PREMISSAS) | Edificio.tsx | VT |
| W1 | Janela do elemento (viga, pilar, laje, pilar-parede, parede, fundação: diagramas, armadura, detalhamento, 3D) | Revisao.tsx `JanelaElemento` | JAN; abre pelo PROP ("Resultados do elemento") |
| W2 | Memorial do edifício | MemorialEdificio.tsx | JAN; RB:pranchas / Memorial |
| W3 | Paleta de comandos (Ctrl+K): ferramentas, ações, comandos sem parâmetros, abas, pavimentos, pilares, vigas, lajes | PaletaComandos.tsx | JAN; os itens "Aba" passam a mudar também a VT; itens de ferramenta mantêm os rótulos |
| W4 | Guia rápido; Configurar atalhos; Painel de ajuda; ajuda por ferramenta | GuiaRapido.tsx, BarraAtalhos, ui/Ajuda | JAN |
| W5 | Janela de capturas, Gerenciador de gabaritos, Vistas por pavimento, Lançamento por DXF/DWG | Gabaritos.tsx, LancamentoDxf.tsx | JAN |
| W6 | Janela do corte / seção | CortesUI.tsx | JAN |
| W7 | Seleção para bloqueio | Rearmar.tsx | JAN |
| W8 | Cartões: Rearmar, Agrupamentos, Cópia de lajes, Relatórios, Fogo, Bloqueio em lote | Rearmar.tsx, RelatoriosUI.tsx, FogoCard.tsx, Armadura.tsx | VT:Dimensionamento (cartões); botões de abertura em RB:dimensionamento |

## 5. Módulo Fundações (Fundacoes.tsx, FundacoesDetail.tsx, SondagemEditor.tsx, MemorialFundacoes.tsx)

| # | Item | Destino |
|---|---|---|
| M1 | Ligação com o edifício (`LigacaoEdificio`) e `FundacoesDoEdificio` (modo leitura) | faixa de aviso acima do centro (inalterada) |
| M2 | Sondagens SPT (editor, + furo, média) | NAV (Sondagens > furos); PROP:Sondagem; CFG não se aplica |
| M3 | Cargas por apoio: Importar do pórtico atual, Importar do edifício, Características salvas, tabela, + apoio, Remover apoio | RB:lancamento / Cargas por apoio (botões); NAV (Apoios); PROP:Apoio |
| M4 | Cards de apoio (SupportCard: soluções, ver bloco, adotar, Voltar à recomendada) e detalhes (CapDetail, FootingDetail, CaissonDetail, SolutionDetail) | VT "Apoios" (centro, inalterado) |
| M5 | Premissas — estacas, pilar e concreto, blocos, sapatas, tubulões; Restaurar padrões | CFG (mesmos grupos) e RB:fundacoes |
| M6 | Memorial de fundações | JAN (pelo botão Memorial da QA) |

## 6. Barra de status e demais componentes

| # | Item | Destino |
|---|---|---|
| S1 | Mensagem (`.msg`, `st.message`) | SB esquerda |
| S2 | Selo de estado (N nós / pavimentos e erros) | SB direita |
| S3 | Entrada por coordenadas, Eixos, P&B, Símbolos, Snap, Cotas, Grade, Unidades | SB (só módulo Pórtico) |
| S4 | Orto, Polar, Capturas (Edifício) | SB (só módulo Edifício) |
| S5 | `.planta-st` (coordenadas da planta, passo, tecla) | inalterada |
| S6 | Toast do canvas (Pórtico) | inalterado |

## 7. Duplicados hoje (cada um vira um só destino)

| Duplicado | Ocorrências atuais | Destino único |
|---|---|---|
| Desfazer / Refazer | topbar; atalhos (BarraAtalhos); paleta Ctrl+K; teclas | botões na QA; atalhos de E3 são removidos do catálogo padrão (continuam no catálogo para quem configurar) |
| Modo de ajuda | `BotaoAjuda` (topbar); atalho "Ajuda (F1)"; botão ? dos modais | QA |
| Salvar / Biblioteca | botões da topbar e itens do menu Arquivo | QA (botões); itens do menu somem (mesmos rótulos nos botões) |
| Calcular e dimensionar | VT Dimensionamento; VT Análise ("Calcular"); paleta; atalhos de aba | botões das VT ficam (rótulos atuais); RB:dimensionamento ganha o atalho "Calcular obra" (rótulo distinto, mesma ação) |
| Calcular fundações | PlantaBarra; Fundacao.tsx; Pranchas; DimensionamentoAba ("Calcular sem fundação") | botões da OB (nível de fundação), da VT Pranchas e da VT Dimensionamento ficam (rótulos atuais); RB:fundacoes ganha o atalho "Calcular as fundações" |
| Ferramentas de planta | PlantaBarra; BarraAtalhos; paleta; botões dos grupos (Fundação, Máscara, L5, Cortes, Paredes etc.) | RB (um botão por ferramenta); os botões dos grupos viram links "Ir para a faixa" só na ajuda; a paleta e os atalhos continuam executando |
| Abas de vista | `.edif-tabs`; atalhos de aba; paleta ("Aba"); botão "Ir" das etapas | VT (os demais apenas mudam a VT) |
| Memorial | botão Memorial (QA, pórtico/fundações) e "Memorial do edifício" (aba Dimensionamento) | os dois ficam (conteúdos diferentes); o do edifício vai a RB:pranchas / Memorial |
| Nome da obra | `NomeObra` no cabeçalho e campo "Nome da obra" no corpo de Dados gerais | QA (o campo do corpo permanece em CFG:Dados gerais, mesma ação `obra.definir`) |
| Dados gerais | grupo "Obra" e `DadosGeraisJanela` (etapa "obra") | CFG:Dados gerais + janela do botão |
| Enquadrar | tecla F; item da paleta; botão do 3D; botão do Pórtico | RB:vista / Navegação |
| Premissas | grupo Premissas do Dimensionar (Pórtico); VT Premissas; OpcoesCalculo | VT Premissas (lista) e CFG (editáveis) |
| Resultados do elemento | botão da planta; duplo clique nas listas; janela do 3D | RB:ctx; os duplos cliques continuam |

## 8. Contagem

- Pórtico: 58 itens (P1 a P58).
- Edifício, colunas e grupos: 44 itens (E1 a E44).
- Ferramentas da planta: 42 (T1 a T42; T42 Escada, E4b); opções da barra da planta: 22 (B1 a B22); teclas: 16 (K1 a K16).
- Fundação, vistas e janelas: 13 (F1 a F13) + 10 vistas (V1 a V10) + 8 janelas (W1 a W8) = 31.
- Módulo Fundações: 6 (M1 a M6). Barra de status: 6 (S1 a S6).
- Total: 58 + 44 + 43 + 22 + 16 + 31 + 6 + 6 = **226 itens**, sem item sem destino; 13 duplicados resolvidos (seção 7).

## 9. Faixa de comandos por módulo (resumo dos grupos)

**Edifício** (9 abas + contextual):
- **Arquivo**: Obra (Nova obra…, Obras recentes…, Dados gerais…, Configuração da obra…); Arquivo (Abrir…, Salvar no computador, Salvar como…, Biblioteca e histórico…, Versões do arquivo…); Importar (Importar de texto…); Exportar (Só o modelo (.json), Exportar desenho (SVG/PNG), Copiar desenho, Importar materiais, seções e unidades…, Desenho DXF (CAD)); Exemplos.
- **Lançamento**: Seleção (Selecionar); Elementos (Pilar, Pilar-parede, Viga, Laje, Parede de concreto, Vigas inclinadas); Eixos (Eixo, Malha de eixos…); Cargas (Carga, Carga na laje inteira, Carga ao longo da viga); Gabarito (Importar DXF…, Alinhar máscara, Lançar por DXF/DWG…, Gabaritos e vistas…, Vistas por pavimento…, Capturas…, Viga pelo gabarito); Lançamento rápido (Contorno retangular de vigas, Abertura retangular); Cortes (Corte do edifício, Linha de seção); Pavimentos (Novo pavimento, +1 acima).
- **Edição**: Modificar (Mover, Copiar, Girar, Espelhar, Dividir viga, Unir vigas, Prolongar viga); Grupos (Copiar de outro grupo…, Unir pavimentos…); Referências (Mover referência, Conta-gotas); Lajes (Armadura de punção, Zona de uniformização, Linha de dobra, Direção do pano, Inserção do pano, Editar armaduras das lajes); Histórico (Desfazer, Refazer).
- **Cargas e ações**: Casos e combinações (Casos de carga, Estados-limite); Vento (Vento e combinações, Ábacos de vento); Empuxo; Etapas de carga.
- **Análise**: Cálculo (Calcular; P-Δ global); Vistas (Análise, Deslocamentos, Isovalores, Verificação); Opções (Opções de cálculo…).
- **Dimensionamento**: Calcular (Calcular e dimensionar, Recalcular, Calcular sem fundação); Armadura (Rearmar, Bloqueio em lote, Seleção para bloqueio…); Relatórios (Memorial do edifício, Exportar listagem, Relatórios); Incêndio; Enviar cargas ao módulo Fundações.
- **Fundações**: Elementos (Fundação, Viga de fundação, Radier, Viga sobre base elástica, Sapata corrida); Modificar (Girar 2 pontos, Ponto de inserção, Girar 90°, Ao pilar, Remover); Limites (Limite da fundação, Limite pela máscara); Cálculo (Planta de fundação, Calcular fundações, Modo de cálculo).
- **Pranchas**: Folhas (Ir para Pranchas, PDF (todas), DXF R2000, DWG R2018); Opções (Opções de armação e locação…).
- **Vista**: Vistas (Planta, 3D, Elevação, Premissas); Navegação (Enquadrar, Medir, Pavimento); Camadas (Tema da planta, Cores, Armadura das lajes, Mostrar erros, Inferior, Vigotas, Mapa da base elástica); Janelas (Paleta de comandos, Guia rápido).
- **Contextual** (com seleção na planta): Pilar, Viga, Laje, Fundação, Parede: Resultados do elemento, Editar tipo, Girar 90°, Remover etc. (por tipo).

**Pórtico** (8 abas): Arquivo (P2 a P14); Lançamento (Selecionar, Inserir nó, Inserir barra, Cota); Edição (Transformar seleção, Desfazer, Refazer, Remover); Cargas e ações (abre Cargas da DOCA-D); Análise (Resultados, Influência, Estabilidade e vibração, Opções de análise); Dimensionamento (Dimensionar, Cargas na fundação, Estabilidade global); Fundações (Enviar ao módulo Fundações); Vista (Zoom, Mover vista, Enquadrar, Eixos locais, P&B, Cotas, Símbolos).

**Fundações** (5 abas): Arquivo; Lançamento (Importar do pórtico atual, Importar do edifício, Características salvas, + apoio, + furo); Dimensionamento (Premissas, Restaurar padrões); Fundações (Memorial de fundações); Vista.
