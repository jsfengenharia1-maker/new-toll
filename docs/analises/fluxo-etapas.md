# Fluxo do Edifício por etapas (29/10/2026)

Decisão do usuário: reorganizar o módulo Edifício na ordem da obra. A faixa de comandos passa a ter uma aba por etapa; uma barra de etapas fixa, logo abaixo da faixa, mostra o estado de cada etapa e destaca a próxima. Todos os comandos e opções continuam; só mudam de lugar (tabela da seção 3).

Diagnóstico que motivou a mudança: a faixa era organizada por tipo de comando (Lançamento misturava eixos, pilares, vigas, lajes, cargas, DXF, ábacos, cortes e pavimentos; "Cargas e ações" só configurava); o cálculo aparecia em 5 lugares com 3 nomes; os botões "Ver …" da Análise duplicavam as abas de vista; o quadro "Etapas da obra" ficava escondido sob o navegador; `etapas.ts` marcava "Cargas" como feita sem nenhuma carga e mandava o "Cálculo" para a aba errada.

## 1. As 8 etapas

| # | Etapa (aba da faixa) | Conteúdo | Vista ao entrar |
|---|---|---|---|
| 1 | Obra | dados gerais, normas e materiais, pavimentos e grupos, arquivo da obra (nova, recentes, abrir, salvar, importar) | Planta |
| 2 | Pilares | eixos e malha, gabarito (DXF, DWG), pilares, pilares-parede, arranques | Planta |
| 3 | Vigas e lajes | vigas, muros e paredes, lajes e tipos de laje, ábacos, escadas, planos | Planta |
| 4 | Cargas | cargas lançadas e casos, estados-limite, vento, empuxo, etapas de carga, incêndio | Planta |
| 5 | Fundação | elementos, vigas, radier, limites, nível de fundação, configuração | Planta |
| 6 | Calcular | UM botão "Calcular" (caixa "Com fundações"); 2ª ordem, opções de cálculo, escadas e só as fundações como secundários | (mantém) |
| 7 | Resultados | esforços, deslocamentos, isovalores, verificação, dimensionamento, flecha entre pontos, armaduras, resultados do elemento | Dimensionamento |
| 8 | Pranchas e memorial | pranchas, estilo, cortes nas pranchas, memorial do edifício, memória detalhada | Pranchas |

Depois das etapas ficam as abas utilitárias **Edição** (mover, copiar, girar, espelhar, dividir, unir, prolongar, referências) e **Vista**; a aba contextual do elemento selecionado continua no fim. A aba Arquivo deixa de existir no Edifício (o arquivo da obra está na etapa 1); Pórtico e Fundações mantêm a deles.

## 2. Estado de cada etapa (`src/core/building/etapas.ts`)

Estados: `feito`, `pendente`, `erro`, `indisponivel`. Nada é guardado: sai do modelo e do último cálculo. A "próxima" é a primeira etapa obrigatória pendente ou com erro (Fundação é opcional: não é a próxima; a obra pode ser calculada sem ela).

| Etapa | feito quando | erro quando | indisponível quando |
|---|---|---|---|
| Obra | a obra tem nome (diferente de "Edifício sem nome") e pelo menos um pavimento | n/a | n/a |
| Pilares | há pilar (arranques não contam) ou pilar-parede | n/a | n/a |
| Vigas e lajes | há viga E laje (paredes, muros e escadas são opcionais e aparecem no detalhe) | n/a | n/a |
| Cargas | há carga lançada (área, linha, ponto ou em pilar) OU a sobrecarga `q` de algum grupo difere do padrão da categoria de uso (NBR 6120, Tabela 10) | n/a | n/a |
| Fundação (opcional) | há elemento de fundação, radier, viga sobre base elástica ou sapata corrida | n/a | n/a |
| Calcular | há cálculo válido para o modelo atual | a análise falhou, ou há erro de lançamento na Verificação | n/a |
| Resultados | calculado e nenhum elemento reprovado | calculado e há elemento reprovado (status `fail`) | não calculado |
| Pranchas e memorial | calculado e o carimbo tem algum campo preenchido | n/a | não calculado |

Decisão sobre **Cargas** (a mais discutível): o guia antigo marcava a etapa como feita se existisse qualquer grupo, ou seja, sempre. Agora só conta o que o usuário fez: lançar uma carga ou mudar de propósito a sobrecarga de um grupo. Com os padrões das categorias de uso a etapa fica pendente, porque o app não sabe se a sobrecarga foi revisada; basta lançar uma carga (paredes, por exemplo) ou ajustar a sobrecarga de um grupo para um valor diferente do padrão da categoria (voltar ao padrão desfaz a marca). Se o usuário preferir uma confirmação explícita ("sobrecarga revisada"), é uma opção a acrescentar à Configuração da obra.

Mapa das 11 etapas antigas para as 8: Obra + Pavimentos → 1; Gabarito e eixos + Pilares + Pilares-parede → 2; Muros e paredes + Vigas + Lajes + Escadas → 3; Cargas → 4; (nova) Fundação → 5; Cálculo → 6 (aponta para a etapa Calcular, não mais para a aba Dimensionamento); (novas) Resultados → 7 e Pranchas e memorial → 8.

## 3. Cálculo: um só botão

Todo botão de cálculo chama a mesma ação (`useBuilding.calcular()`) com o rótulo **Calcular** (nas vistas Análise e Dimensionamento, "Recalcular" quando já há resultado; mesma ação). A opção "Com fundações" da etapa Calcular (estado `semFundacao` em `uiStore`) vale para todo botão: desmarcada, a obra é analisada e dimensionada sem as fundações lançadas. Removidos: "Calcular obra" (duas vezes na faixa), "Calcular obra sem fundações", "Calcular sem fundação" (da vista Dimensionamento), "Calcular e dimensionar", "Refazer a análise" e o "Calcular obra" da janela de cálculo das escadas (todos viraram "Calcular"). Continuam como ações parciais, com nome próprio: "Calcular escadas…" e "Recalcular só as fundações" (etapa Calcular, grupo Parciais).

## 4. Tabela comando → onde estava → onde ficou

| Comando | Onde estava | Onde ficou |
|---|---|---|
| Nova obra…, Obras recentes…, Novo padrão, Novo vazio, Importar de texto… | Arquivo › Obra | Obra › Obra |
| Importar IFC | Nova obra… (diálogo) | igual (Obra › Nova obra…) |
| Dados gerais…, Configuração da obra… | Arquivo › Obra | Obra › Dados e normas |
| Materiais e segurança…, Biblioteca de normas…, Tabelas de armadura… | só dentro da Configuração da obra | Obra › Dados e normas (atalhos para as seções) e continuam na Configuração |
| Abrir trabalho do computador…, Salvar no computador, Salvar como…, Biblioteca e histórico… | Arquivo › Arquivo | Obra › Arquivo da obra |
| Versões do arquivo… | Arquivo › Arquivo | Obra › Arquivo da obra |
| Novo modelo | Arquivo › Arquivo (criava modelo de pórtico) | saiu do Edifício; continua em Pórtico e Fundações › Arquivo |
| Só o modelo (.json), Exportar desenho (SVG, PNG), Copiar desenho, Desenho DXF (CAD), Importar materiais, seções e unidades | Arquivo › Exportar (operavam sobre o pórtico) | saíram do Edifício; continuam em Pórtico › Arquivo. O DXF e o DWG do edifício estão na vista Pranchas (etapa 8) |
| Exemplos (pórtico) | Arquivo › Exemplos | saíram do Edifício; os exemplos do edifício continuam em Obra › Obras recentes… e Nova obra… |
| Novo pavimento… | Lançamento › Pavimentos | Obra › Pavimentos e grupos |
| Copiar de outro grupo…, Unir pavimentos… | Edição › Grupos | Obra › Pavimentos e grupos |
| Seleção | Lançamento › Seleção | primeiro grupo das etapas 2, 3, 4 e 5 |
| Eixo, Malha de eixos… | Lançamento › Eixos | Pilares › Eixos |
| Importar DXF…, Alinhar, Lançar por DXF/DWG…, Gabaritos e vistas…, Vistas por pavimento…, Capturas… | Lançamento › Gabarito | Pilares › Gabarito |
| Pilar, Pilar-parede | Lançamento › Elementos | Pilares › Pilares |
| Pilar como arranque (novo atalho; espelha a opção Arranque da ferramenta Pilar) | só na barra da planta | Pilares › Pilares |
| Viga, Diagonal, Consolo, Vigas inclinadas | Lançamento › Elementos | Vigas e lajes › Vigas |
| Viga pelo gabarito | Lançamento › Gabarito | Vigas e lajes › Vigas |
| Parede | Lançamento › Elementos | Vigas e lajes › Muros e paredes |
| Laje | Lançamento › Elementos | Vigas e lajes › Lajes |
| Tipos de laje…, Direção do pano, Inserção do pano | Edição › Lajes | Vigas e lajes › Lajes |
| Contorno retangular, Abertura retangular | Lançamento › Lançamento rápido | Vigas e lajes › Lançamento rápido |
| Ábaco, Gerar ábacos nos pilares | Lançamento › Ábacos | Vigas e lajes › Ábacos |
| Escada, Escadas… | Lançamento › Elementos | Vigas e lajes › Escadas |
| Novo plano, Atribuir plano, Retirar plano, Definir plano na planta | Edição › Planos | Vigas e lajes › Planos |
| Carga, Carga na laje, Carga na viga | Lançamento › Cargas | Cargas › Cargas lançadas |
| Casos de carga, Estados-limite e combinações | Cargas e ações › Casos e combinações | Cargas › Casos e combinações |
| Vento e combinações, Ábacos de vento (NBR 6123) | Cargas e ações › Vento | Cargas › Vento |
| Empuxo de terra, Etapas de carga (flechas), Incêndio | Cargas e ações › Outras ações | Cargas › Outras ações |
| Resistência ao fogo… | Dimensionamento › Proteção ao fogo (mesma janela do Incêndio) | fundido com Cargas › Outras ações › Incêndio |
| Fundação, Viga de fundação, Radier, Viga sobre base elástica, Sapata corrida | Fundações › Elementos | Fundação › Elementos |
| Girar 2 pontos, Ponto de inserção | Fundações › Modificar | Fundação › Modificar |
| Limite da fundação, Limite pela máscara | Fundações › Limites | Fundação › Limites |
| Nível de fundação, Configuração das fundações… | Fundações › Cálculo | Fundação › Nível e dados |
| Cargas para o módulo Fundações | Dimensionamento › Fundações | Fundação › Módulo Fundações |
| Calcular obra | Análise › Cálculo e Dimensionamento › Calcular | Calcular › Calcular (um só botão) |
| Calcular obra sem fundações | Dimensionamento › Calcular | Calcular › caixa "Com fundações" desmarcada |
| 2ª ordem global…, Opções de cálculo… | Análise › Cálculo / Opções | Calcular › Análise |
| Calcular escadas… | Análise › Cálculo | Calcular › Parciais |
| Calcular as fundações | Fundações › Cálculo | Calcular › Parciais (como "Recalcular só as fundações") |
| Ver Análise, Ver Deslocamentos, Ver Isovalores, Ver Esforços, Ver Verificação | Análise › Resultados | Resultados › Vistas (atalhos para as abas de vista; só nesta etapa) |
| Ver Dimensionamento | Dimensionamento › Calcular | Resultados › Vistas |
| Flecha entre dois pontos | Análise › Consultas | Resultados › Consultas |
| Armadura de punção, Zona de uniformização, Linha de dobra, Editar armaduras das lajes | Edição › Lajes | Resultados › Armaduras |
| Armadura das escadas… | Análise › Cálculo | Resultados › Armaduras |
| Resultados do elemento | Dimensionamento › Relatórios (e aba contextual) | Resultados › Relatórios (e aba contextual) |
| Abrir Pranchas, Opções de armação e locação… | Pranchas › Folhas | Pranchas e memorial › Folhas |
| Estilo de desenho e símbolos… | Pranchas › Estilo | Pranchas e memorial › Estilo |
| Corte, Seção (linhas de corte) | Lançamento › Cortes | Pranchas e memorial › Cortes |
| Memorial da obra | Dimensionamento › Relatórios | Pranchas e memorial › Memorial |
| Memória detalhada… (atalho; o botão da vista Dimensionamento continua) | só na vista Dimensionamento | Pranchas e memorial › Memorial |
| Mover, Copiar, Girar, Espelhar, Dividir, Unir, Prolongar, Mover referência, Conta-gotas | Edição | Edição (igual) |
| Enquadrar, Medir, Paleta de comandos, Guia rápido, Camadas | Vista | Vista (igual) |

## 5. Barra de etapas

`BarraEtapas.tsx` (componente `StepBar` em `src/app/ui`, classes `.stepbar`, `.step` em `global.css`): 8 botões numerados com marca de estado (✓ feito, ! erro, número nos demais), a etapa da aba aberta com `aria-current="step"`, a próxima com destaque e o texto "Próximo: …" no fim. O detalhe de cada etapa está no `title`. A barra rola na horizontal (com indício) em janelas estreitas; a 1440 px cabe inteira, assim como a tira de abas da faixa. As abas de vista (11) rolam com indício em 1440 px e nenhum rótulo é cortado. O antigo quadro "Etapas da obra" do painel esquerdo foi removido (a barra o substitui); o grupo "Arquivo e versões" continua na Configuração da obra.

## 6. Testes

- `src/core/building/etapas.test.ts`: ordem e rótulos, estados com valores esperados (obra vazia, edifício padrão, cargas por carga lançada ou por sobrecarga editada, calculado, erro de análise/lançamento/reprovados, arranques, fundação opcional, paredes no detalhe).
- `e2e/flows/etapas.mjs`: percorre as 8 etapas pela barra (aba ativa, comando de cada etapa, vistas), estados reais após lançar e calcular, um só botão Calcular, abas sem truncar a 1440 px.
- `e2e/flows/helpers.mjs`: `comandoFaixa`/`clicarComando` (acha o comando em qualquer aba), `botaoCalcular`, `fileMenu` (Arquivo ou Obra).
