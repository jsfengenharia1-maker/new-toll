# Pendências do usuário: material de norma a enviar

Decisão do usuário (22/10/2026): item "a confirmar" sem texto de norma disponível segue o padrão do CYPECAD e a execução continua. O que depende de tabela, ábaco ou item de norma que não foi possível verificar fica listado aqui (norma, edição, tabela ou item, onde é usado no código). O usuário envia o material e o valor é transcrito depois. Toda fatia acrescenta o que precisar.

| Fatia | Norma e edição | Tabela ou item | O que falta conferir | Onde é usado no código |
|---|---|---|---|---|
| E1d | NBR 6118:2014 (e 2023) | 18.4 e 18.5 (pilares-parede), 15.9 | Taxas mínima e máxima da armadura vertical e horizontal, espaçamentos e bitola máxima das malhas de paredes e pilares-parede; ℓe do processo aproximado por faixas | opções `paredeTaxaVertMin/Max`, `paredeTaxaHorMin`, `paredeHorFracVert`, `paredeEspMin/Max`, `paredeBitolaMax`, `paredeFlambagem` em `opcoes.ts`; `paredesArmadura.ts` (`listaMalhas`, `minimosPano`, `requisitosElemento`) |
| E1d | NBR 16055:2012 | armadura mínima e de aberturas | Paredes de concreto moldadas no local: armadura mínima, reforço de aberturas (verga, peitoril, montantes, cantos) | `paredesDim.ts` (`dimensionarAbertura`, `CANTO_PADRAO`) |
| E1d | NBR 6118:2014 | 19.4.1 e 19.4.2 | Espessura de 35 cm para armadura transversal de cortante em lajes, estendida às paredes (cortante fora do plano) | `paredesArmadura.ts` (`atende`, `cortanteTransversal`) e `paredesDim.ts` (`dimensionarPano`) |
| E1d | NBR 6118:2014 | 9.5.2 (emendas por traspasse) e Tabela 9.4 (α0t) | Item do acréscimo da distância livre entre barras emendadas (> 4φ) e proporção de barras emendadas por seção em paredes | `detalhamentoParedes.ts` (`comprimentoEmenda`), opções `paredeEmendaProp` e `paredeEmendaAmpliar` |
| E1d | NBR 6118:2014 | 24 (concreto simples) | Limites de tração e compressão do concreto simples (γc × 1,2 usado como nas fundações) | `paredesArmadura.ts` (`verificaConcretoSimples`), `Parede.armar === false` |
| E1d | EN 1992-2 (referência) e NBR 6118:2014 | Annex F e Annex LL (sanduíche); 17.2 | Equivalência do modelo sanduíche com z = 0,9d e das camadas de concreto (t/2 sem tração, t/3 com tração) aos critérios da NBR 6118 para chapas | `paredesArmadura.ts` (`membrana`, `camadas`, `requisitosElemento`) |
| E1d | NBR 11682:2009 | 5 (muros de arrimo) | Fatores de segurança ao tombamento e ao deslizamento, empuxo passivo e dente; dispensa de estribos no fuste e na base | `muroArrimo.ts`, `muroArrimoDim.ts` |
