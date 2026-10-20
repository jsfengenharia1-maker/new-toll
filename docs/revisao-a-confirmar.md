# Revisão dos itens "a confirmar" — módulo Edifícios (20/10/2026)

Regra do usuário (20/10/2026): seguir o padrão do programa de referência e o das folhas de referência; onde isso define o valor, o item deixa de ser "a confirmar". Fontes usadas: `docs/checklist-manual-calculo-cypecad.md` e `docs/checklist-manual-cypecad.md` (manuais do programa de referência, já extraídos), `docs/pesquisa-edificios.md`, `docs/spec-edificios.md`, `docs/spec-frente-R.md` e o padrão de desenho de um conjunto público de pranchas de referência (fora do repositório). Nada foi copiado das folhas: só valores (escalas, formatos, siglas, hierarquia de penas, notação). Pórtico 2D e Fundações ficaram fora desta revisão.

Status: **resolvido** (sai do "a confirmar"), **parcial** (parte do item resolvida; o restante continua marcado), **mantido** (nenhuma das fontes define o valor). Decisões já tomadas pelo usuário (vírgula decimal, MPa, cargas características e de cálculo) prevalecem sobre as folhas de referência.

## Opções de cálculo (`src/core/building/opcoes.ts`)

| Item | Antes | Depois | Fonte | Status |
|---|---|---|---|---|
| Malha da grelha | 0,25 m | 0,25 m | Programa de referência: malha máxima de 25 cm (K1.3.21) | resolvido |
| Rigidez axial dos pilares | × 2 | × 2 | Programa de referência: padrão 2, faixa 1–99,99 (K1.4.36, K1.4.37) | resolvido |
| Engaste no topo do último lance | 0,3 | 0,3 | Programa de referência: padrão 0,3 (K1.4.9) | resolvido |
| Zonas independentes como diafragmas | ligada | ligada | Programa de referência (K1.2.4, K1.2.6, K1.5.25) | resolvido |
| Wood-Armer com faixa de 1 m | ligada | ligada | Programa de referência (K1.13.2.2-2, -3) | resolvido |
| Fator simplificado da flecha das lajes | 2,5 | 2,5 | Programa de referência: padrão 2,5 (K1.15.4-7) | resolvido |
| Momento positivo mínimo das vigas | 0 (desligado) | 0 | Programa de referência: padrão 0 (K1.4.38) | resolvido |
| Momento negativo mínimo das vigas | 0 (desligado) | 0 | Programa de referência: padrão 0 (K1.4.38) | resolvido |
| Vigotas: momento positivo mínimo | p·ℓ²/16 | p·ℓ²/16 | Programa de referência: ½ do isostático (K1.4.40) | resolvido |
| Vigotas: momento negativo mínimo | p·ℓ²/16 | p·ℓ²/16 | Programa de referência: ½ do isostático (K1.4.40) | resolvido |
| Rigidez à torção das vigas | 15 % | 15 % | NBR 6118 (valor); o programa de referência só diz que é configurável (K1.4.33); número do item da NBR a conferir | mantido |
| Rigidez à torção das lajes | 15 % de 2I | 15 % de 2I | Critério do app; o programa de referência não dá o valor | mantido |
| Rigidez à torção dos pilares | 1 | 1 | Programa de referência aplica um redutor (K1.4.24) sem valor documentado | mantido |
| Bitola da montagem das vigas | φ8 | φ8 | Nenhuma fonte define | mantido |
| Lajes: comprimento mínimo dos negativos | 25 % do vão | 25 % | Programa de referência impõe % mínima sem valor documentado (K1.13.2.4-15) | mantido |
| Lajes: decalagem | 1,5d | 1,5d | NBR 6118 (item a conferir) | mantido |
| Lajes: bitola mínima | 5 mm | 5 mm | Nenhuma fonte define | mantido |
| Lajes: espaçamento mínimo | 10 cm | 10 cm | Nenhuma fonte define | mantido |
| Lajes: armadura superior de canto | ligada | ligada | Nenhuma fonte define | mantido |
| Lajes: pernas nos negativos | ligada | ligada | Programa de referência cita ganchos construtivos sem padrão (K1.4.77) | mantido |
| Vigotas: diferença para igualar | 100 % | 100 % | Programa de referência pede o valor ao usuário | mantido |
| Vigotas: comprimento mínimo dos negativos | 25 % do vão | 25 % | Programa de referência impõe % mínima sem valor documentado | mantido |
| Vigotas: redutor da rigidez à flexão | 1 | 1 | Programa de referência tem a opção (K1.4.82) sem valor documentado | mantido |

## Premissas (`src/core/building/premissas.ts`)

| Item | Antes | Depois | Fonte | Status |
|---|---|---|---|---|
| pilar-parede | lado > 5 × o menor | igual | Programa de referência usa o mesmo limite (K1.3.29) | resolvido |
| vinculos | coeficientes 0–1, padrão 1 | igual | Programa de referência (K1.4.11, K1.4.14–K1.4.17, K1.4.35) | resolvido |
| grelha | malha, torção, molas 4EI/L | igual | Malha pelo programa de referência; torção das lajes e molas continuam critério do app | parcial |
| diafragma | zonas, EA × 2, trecho rígido, mestre | igual | Zonas, pilar isolado e EA × 2 pelo programa de referência; trecho rígido pela NBR; mestre no centro geométrico continua a confirmar | parcial |
| opcoes | sempre "a confirmar" | marcada só enquanto houver opção a confirmar | Calculado de `OPCOES_INFO` | parcial |
| vento | coeficiente por sentido e vizinhança "critério do app" | por sentido e zonas pelo programa de referência; vizinhança pela NBR 6123, 6.4 | Programa de referência (K1.5.21, K1.5.25) | parcial (tabelas da NBR 6123 e Ca 1,3 mantidos) |
| dim-lajes | Wood-Armer e faixa de 1 m "critério do app" | pelo programa de referência | K1.13.2.2 | parcial (ρmín para qualquer fck e bitola da fissuração mantidos) |
| pedireito (2,2 m), uso (NBR 6120), pilar-min, renumerar (0,3 m), unidade-dxf, viga-apoio, viga-face (5 cm), trelicada (catálogo), alvenaria, material, casos (γ excepcionais), dim-vigas (he, Acr, ρ′), detalhamento-vigas/pilares/lajes, dim-pilares (N = Nd/γg), vigotas (catálogo TR), quantitativos (taxas) | — | sem mudança | Nenhuma das fontes define o valor | mantido (18) |

## Pranchas (`src/core/sheets/*`, `ConfigArmacao` em `types.ts`)

| Item | Antes | Depois | Fonte | Status |
|---|---|---|---|---|
| Escala da elevação das vigas | 1:50 | **1:75** | Folhas de referência | resolvido |
| Escala da elevação dos pilares | 1:50 (sobe 1:75…) | **1:40** (sobe 1:50, 1:75…) | Folhas de referência | resolvido |
| Escala das seções e estribos | 1:25 | 1:25 | Folhas de referência | resolvido |
| Formato das armações | A1 (A0 quando não cabe) | igual | Folhas de referência (A1 e A0) | resolvido |
| Escala automática das plantas (formas, locação, lajes) | a partir de 1:50 | **a partir de 1:75** (1:50 só quando escolhida) | Folhas de referência | resolvido |
| Siglas | LOC, FOR, ARV, ARP, ARL | **SFN, SCF, SCV, SCP**, SCL | Folhas de referência (lajes por extensão) | resolvido; SCL mantido |
| Cotas na prancha | cor amarela (ACI 2) | **cinza (ACI 8)** | Folhas de referência (cotas e chamadas finas em cinza) | resolvido |
| Hierarquia das penas | concreto 0,50 / barras 0,35 / fundo 0,18 | igual | Folhas de referência confirmam a hierarquia; valores em mm (NBR 16861) | parcial |
| Rótulo das vigas nas formas | "V1 (15×50)" | **"V1 15×50"** | Folhas de referência | resolvido |
| Pilares que chegam hachurados | sim | sim | Folhas de referência | resolvido |
| Alturas de texto da armação | título 5 mm, "ESC" 2 mm, barras 2 mm | igual | Folhas de referência (5–6 / 2 / 2–2,5 mm) | resolvido |
| Legenda (carimbo) | 178 mm | 178 mm | Folhas de referência (coluna de 175–180 mm) e NBR 16752 | parcial (margens e dobras mantidas) |
| Cotas na planta de formas; alturas dos textos da planta | cotas entre pilares; 2–3 mm | igual | As folhas de referência não cotam a planta; nenhuma fonte para as alturas | mantido |
| Representação das lajes | barra representativa | igual | As folhas de referência não têm armação de lajes | mantido |

## Resumo

- Resolvidos: 10 opções, 2 premissas e 10 itens de pranchas (22).
- Parciais: 9 (as premissas grelha, diafragma, opcoes, vento, dim-lajes, prancha-folha, prancha-penas, prancha-convencoes e pranchas-armacao continuam marcadas pelo que sobrou).
- Mantidos: 13 opções, 18 premissas e 4 itens de pranchas.
- Mudanças de resultado: só nas pranchas (escalas, siglas, cor das cotas, rótulo das vigas); nenhum valor de cálculo mudou. Testes ajustados: `prancha.test.ts` (formato/escala automáticos A2 1:75 e rótulo), `armacao.test.ts` (siglas; o teste de paginação passa a fixar 1:50, já que 1:75 virou o padrão), `commands.test.ts` (exemplo de `prancha.definir` com escala diferente do padrão) e o fluxo e2e das pranchas (siglas e troca de escala).
