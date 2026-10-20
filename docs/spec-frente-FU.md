# Spec — Frente FU (fundações integradas ao edifício)

Base: 90 itens Parcial/Falta com frente FU nos dois checklists (67 do manual do usuário, 23 do de cálculo). Regra: paridade de função com o programa de referência, sem copiar nomes, textos ou telas; padrões em dois perfis (sistema × NBR) quando diferirem; premissas sem fonte marcadas "a confirmar". Para aprovação do usuário.

## Decisões do usuário, 20/10/2026

1. **Tudo entra nesta frente**, inclusive radier e vigas sobre base elástica (FU6) e a sapata corrida (FU7). A FU7 foi dividida: a parte que não depende de muros entra já (FU7a); a fundação de muros e paredes fica ligada à E1 (FU7b).
2. **Bloco com vários pilares entra** (FU3), junto com a sapata associada.
3. **Organização das fundações igual à do programa de referência.** As fundações passam a ser elementos do modelo do edifício, lançados na planta do nível de fundação e calculados pelo comando "calcular com fundação". Os dados do terreno seguem o mesmo esquema (ver "Dados do terreno"). O núcleo do módulo Fundações (`piles.ts`, `caps.ts`, `footings.ts`, `caissons.ts`, `foundation.ts`) é reaproveitado sem duplicar cálculo (ver "Ligação com o módulo Fundações").
4. **Referência visual de prancha de fundação:** as folhas de referência (projeto-padrão público da pasta do programa de referência no Drive do usuário) já trazem quatro folhas de fundação: locação e planta de cargas com blocos, detalhamento dos blocos, locação e planta de cargas com sapatas e detalhamento das sapatas, além dos arranques. As premissas da FU5 seguem essas folhas (ver FU5). Não há nas folhas viga de equilíbrio, tubulão nem radier; esses desenhos seguem o padrão das pranchas da R5 e ficam "a confirmar".

## Objetivo

Hoje a fundação do edifício passa pelo módulo Fundações: as cargas por pilar são importadas (`importarCargasDoEdificio`) e cada apoio é dimensionado isolado, sem posição real na planta. A FU leva a fundação para dentro do edifício: elementos lançados na planta do nível de fundação (sapatas, blocos sobre estacas e tubulões; centrados, de divisa, de canto e associados, inclusive blocos com vários pilares), vigas de equilíbrio e de travamento, radier e vigas de fundação sobre base elástica, sapata corrida, geração automática, cálculo junto com o dimensionamento do edifício, erros na planta, memorial e pranchas de locação e de armadura da fundação.

## Como o programa de referência organiza a fundação (base da decisão 3)

Pelo que os checklists registram (cap. 11 do manual do usuário; 1.3, 1.9, 1.11 e 1.15 do de cálculo):

- **Dois tipos de comportamento.** Sapatas, blocos e vigas de equilíbrio/travamento são calculados **depois** da estrutura, com os esforços na base dos pilares, que ficam com vínculo externo (C11.63, C4.6). Radier e vigas de fundação são **flutuantes**: entram na análise global sobre molas pelo coeficiente de reação, e o pilar que nasce neles não tem vínculo externo (K1.3.15, K1.3.24, K1.9.31).
- **Tensão admissível.** Para sapatas, é um dado do material da fundação (C11.18), definido nos dados gerais e consultado por elemento. Para radier e viga de fundação, cada pano ou viga recebe o coeficiente de reação e a tensão admissível (K1.9.42, K1.9.89), e a tensão excedida vira erro (K1.11.23). A sapata corrida sob muro tem tensão admissível e coeficiente de reação, com padrão alto de 100 000 kN/m³ para não haver recalque diferencial com pilares de vínculo externo (K1.9.48). Numa fundação toda flutuante, o coeficiente deve ser compatível com o solo e as dimensões (K1.9.49).
- **Estacas.** O bloco recebe o tipo de estaca com seção, capacidade característica e distância entre eixos (C11.9). O programa não usa sondagem.
- **Combinações.** Grupos próprios para "ELU de concreto de fundações" e "tensões no solo" (K1.8.2, K1.9.27).
- **Cargas no nível da fundação** só agem sobre radier, com aviso quando o grupo de fundação não tem carga (C10.22, C10.23). Arranques (pilar de altura zero) com cargas no topo permitem calcular só a fundação (C4.4, C4.5, K1.9.33).

## Dados do terreno no Statikos

Mesmo esquema do programa de referência, com a sondagem do módulo Fundações como opção adicional:

| Dado | Onde | Padrão do sistema | Observação |
|---|---|---|---|
| σadm das sapatas e tubulões (persistente) | global (`FundacaoEdificio.terreno`), sobreponível por elemento | informada | modo "estimada pelo SPT" (N̄/50 e N̄/30, já existentes, "a confirmar") quando há sondagens |
| σadm em combinações com vento | global | 1,0 × σadm | majoração editável; valor da NBR 6122:2019 a confirmar |
| Estaca: tipo, D, capacidade característica, distância entre eixos | global por tipo de estaca, escolhido por bloco | capacidade informada | modo "pela sondagem" (Décourt-Quaresma e NBR 6122, já existentes) |
| Coeficiente de reação k e σadm do radier | por pano de radier | sem padrão (obrigatório) | tabela orientativa por solo "a confirmar" |
| Coeficiente de reação k e σadm da viga de fundação | por viga | sem padrão (obrigatório) | idem |
| Coeficiente de reação da sapata corrida | por sapata corrida | 100 000 kN/m³ | programa de referência |
| Sondagens (furos SPT) | no modelo do edifício | nenhuma | mesmo formato `Boring[]` do módulo; furo ou média por elemento, como hoje |

## Ligação com o módulo Fundações

- **Um só cálculo.** `src/core/building/fundacao.ts` é um adaptador: monta a carga de cada elemento (`FLoad`) a partir de `an.fundacao` e da geometria do elemento, como `cargasParaFundacao` já faz, e chama `designSupport` e as funções de `footings.ts`, `caps.ts`, `caissons.ts` e `piles.ts`. As generalizações (pilar fora do centro, vários pilares, dimensões impostas, limites) entram nessas funções e passam a valer também no módulo.
- **Módulo Fundações continua** para o Pórtico 2D e para fundação avulsa (cargas digitadas). Quando o projeto aberto é um edifício com fundação lançada, a aba Fundações mostra os elementos do edifício só para leitura, com o atalho "abrir no Edifício". `importarCargasDoEdificio` continua para quem quer estudar soluções fora do modelo.
- **Sondagens:** mesmo formato nos dois lugares, com "copiar sondagens do edifício" e "copiar para o edifício". Não há sincronização automática.
- **Interface:** os desenhos SVG do módulo (bloco, sapata, tubulão) e o editor de sondagens saem de `Fundacoes.tsx` para componentes compartilhados, usados nas duas telas.

## Fatias

| Fatia | Conteúdo | Depende de | Itens |
|---|---|---|---|
| FU1 Elementos por pilar e dados do terreno | Sapata, bloco e tubulão sob um pilar (centrados, divisa, canto), arranques, terreno global e por elemento, sondagens no edifício | — | 19 |
| FU2 Vigas de equilíbrio e de travamento | Lançamento, alavanca, alívio, travamento, cargas sobre as vigas | FU1 | 22 |
| FU3 Associadas, blocos com vários pilares, limites e edição | Sapata e bloco com N pilares, unir/igualar, limites, impostas, concreto simples, opções | FU1 | 20 |
| FU4 Geração automática | Sapatas, blocos e vigas gerados por parâmetros | FU2, FU3 | 5 |
| FU5 Pranchas e memorial | Locação e planta de cargas, detalhes de blocos, sapatas, tubulões e vigas, arranques, quantitativos | FU1–FU3 | 6 |
| FU6 Base elástica | Radier e vigas de fundação sobre molas na análise global | FU1 | 14 |
| FU7a Sapata corrida sob vigas e alinhamentos | Sapata corrida lançada por polilinha, sob viga de fundação ou alinhamento de pilares | FU6 | 4 |
| FU7b Fundação de muros e paredes | Base do muro definida no lançamento, sapata corrida do muro | E1, FU7a | 6 |

Ordem: FU1 → FU2 → FU3 → FU4 → FU5 → FU6 → FU7a; FU7b junto com a E1. A FU5 cobre os elementos das fatias 1 a 3; a FU6 e a FU7a acrescentam os próprios desenhos (radier pela infraestrutura das lajes da R5, viga de fundação pela das vigas). Itens divididos entre duas fatias contam nas duas. Duas pendências mudam de dona: C11.26 (cargas de escadas na fundação) vai para a E4, junto com as escadas, e C11.49 (vista 3D da viga de fundação) vai para a V.

### FU1 — Elementos por pilar e dados do terreno

- Itens: C1.35, C4.2, C4.4, C4.5, C4.6, C11.8 (sapata armada, bloco), C11.10, C11.12 (dimensionar), C11.13, C11.14, C11.15, C11.59 (sapatas, blocos), C11.61, C11.62, C11.64, K1.1.4 (parte), K1.4.89 (opções gerais), K1.11.2, K1.11.60.
- Núcleo:
  - `src/core/building/fundacao.ts` (adaptador descrito acima): valores característicos por caso, raras para o solo e ELU para o elemento. `footings.ts` aceita o pilar fora do centro (ex, ey fixos); divisa e canto sem viga de equilíbrio dão o erro `FUND_EXC_SEM_VIGA`.
  - Dados do terreno conforme a tabela acima (`terreno` global, sobreposição por elemento, modos informado/sondagem).
  - Cota de assentamento por elemento, com padrão em `cotaFundacao`. Vários níveis de fundação e escolha dos grupos calculados.
  - Três modos: dimensionar tudo, só verificar os impostos, redimensionar só os com erro.
  - Arranque = pilar sem lances (`nasce = morre = 'fundacao'`), com cargas no topo por `cargasPilar`.
  - Códigos `FUND_*` em `revisao.ts`. O cálculo entra no worker depois do dimensionamento e é opcional ("calcular com fundação"), sem invalidar o resto (`revCalculo` próprio da fundação).
- Comandos (`src/core/commands/fundacao.ts`): `fundacao.criar` (pilar, tipo, posição centrada/divisa/canto/livre, ângulo do pilar por padrão), `fundacao.editar`, `fundacao.mover`, `fundacao.girar` (ângulo, dois pontos ou ângulo do pilar), `fundacao.remover`, `sondagem.criar/editar/remover`, `fundacao.terreno`, `fundacao.opcoes`. Todos com `mcp: false`. A ferramenta `dimensionar` ganha o filtro `fundacao`; não entra ferramenta nova (limite de 40). `docs/ia.md` atualizado.
- Interface: grupo "Fundação" na aba Edifício, com dados do terreno e sondagens. A planta do nível de fundação traz os elementos, uma prévia da posição ao aproximar do pilar e destaque em vermelho para erros. A janela do elemento mostra pressões, estacas, bielas e armaduras com os desenhos compartilhados do módulo.
- Memorial: seção "Fundações" do edifício (terreno, materiais, ações, geometria, verificações), reaproveitando o texto do módulo.
- Testes: sapata de divisa e centrada contra cálculo manual; σadm informada × pelo SPT; arranque com cargas; exemplos dos comandos; replay; e2e `FU1`.

### FU2 — Vigas de equilíbrio e de travamento

- Itens: C11.25, C11.27, C11.35, C11.38–C11.48, C11.50–C11.53, K1.4.74 (vigas de fundação), K1.9.110, K1.9.112, K1.15.5-1.
- Núcleo: viga entre dois elementos (ou elemento e pilar) com tipo equilíbrio ou travamento e equilíbrio ligado por extremidade. "Automático" equilibra as pontas que chegam a sapatas excêntricas.
  - Alavanca: R = N·ℓ/(ℓ − e), com alívio no pilar interno. Várias vigas numa direção repartem o momento pela rigidez.
  - Distribuição sob a sapata: retangular ou trapezoidal.
  - A viga não se apoia no solo. Ela leva as cargas pontuais, lineares e de superfície sobre ela às sapatas e vigas que cruza.
  - A viga é dimensionada como as vigas do edifício (flexão, cortante, mínimos 17.3.5.2.1, ancoragem). Opções: alterar a ancoragem e prolongar os estribos até as esperas do pilar.
  - Erro `FUND_VIGA_*`. Igualar vigas: a viga copiada fica em vermelho se falhar.
  - Blocos de 1 e 2 estacas sem travamento recebem o aviso `FUND_SEM_TRAVA`.
- Comandos: `vigaFundacao.criar/editar/remover/igualar` (`mcp: false`).
- Interface: lançamento por clique entre elementos; seta curva na ponta equilibrada; editor com verificar/dimensionar e lista das verificações; detalhe longitudinal e transversal (SVG, reaproveitando `Detalhamento.tsx`).
- Testes: alavanca de divisa contra cálculo manual (reação, alívio, Md, Vd); travamento de bloco de 1 estaca; e2e `FU2`.

### FU3 — Associadas, blocos com vários pilares, limites e edição

- Itens: C11.6, C11.8 (concreto simples), C11.11, C11.12 (impostas), C11.16, C11.17, C11.19–C11.24, C11.32–C11.34, C11.36, C11.37, C11.59 (associadas), C11.65, K1.9.111.
- Núcleo:
  - Sapata rígida com N pilares em qualquer posição, com a resultante levada ao centro. A flexão sai das faixas pelas faces dos pilares, incluindo o negativo entre pilares.
  - **Bloco com vários pilares** (decisão 2): bloco rígido com a resultante dos pilares no centro do estaqueamento; carga nas estacas por N/n ± Mx·y/Σy² ± My·x/Σx² (já usado no bloco de um pilar); bielas e tirantes por pilar, com o tirante entre o pilar e as estacas que ele carrega e o caso mais desfavorável por estaca; altura pela maior exigência entre os pilares (d ≥ lb de cada um). Método sem roteiro normativo fechado: NBR 6118 22.7 (bielas e tirantes) como base, extensão de Blévot "a confirmar". Unir sapatas não vale para blocos (como no programa de referência); o bloco de vários pilares nasce de `fundacao.criar` com mais de um pilar ou da geração automática.
  - Rigidez e balanço verificados pelas relações vão/altura e balanço/altura.
  - Sapata de concreto simples (NBR 6118, cap. 24), com malha superior só quando falha à tração.
  - Opção de permitir descolamento.
  - Dimensões e armadura impostas pelo usuário, só verificadas.
  - Limites poligonais por grupo: aparam a sapata de altura constante, o dimensionamento não os ultrapassa e eles são ignorados (com aviso) quando cortam pilar ou isolam pilar da associada. Não valem para blocos, vigas e sapatas corridas.
  - Sobreposição detectada; eliminá-la gera uma associada.
- Comandos: `fundacao.unir`, `fundacao.igualar`, `fundacao.impor`, `limite.criar/editar/remover` (`mcp: false`).
- Interface: seleção de pilares para a associada ou para o bloco com ponto de inserção movível; limites desenhados ou capturados da máscara DXF; editor de dimensões impostas.
- Testes: associada de 2 pilares contra cálculo manual (pressões e momentos); bloco de 4 estacas com 2 pilares contra cálculo manual (cargas nas estacas, tirantes); aparo por limite, união e igualação; e2e `FU3`.

### FU4 — Geração automática

- Itens: C11.54–C11.58.
- Núcleo: `gerarFundacoes(b, parametros)` define o tipo padrão por grupo. A posição vem dos pilares "em frente": distância de visão D e ângulo A, com balanço nulo do lado sem pilar, que vira divisa ou canto. Pilares com eixos a menos que a distância máxima (padrão 1 m, máximo 3 m) ou elementos sobrepostos viram associada (sapata) ou bloco com vários pilares (estacas). Vigas de equilíbrio onde há excentricidade e vigas de travamento onde a NBR 6122 exige. O resultado é um único comando composto (desfaz em um passo) e todo elemento continua editável.
- Comando `fundacao.gerar`. Janela de parâmetros na interface.
- Testes: edifício de exemplo com pilares de divisa e de canto e com pares próximos; replay determinístico.

### FU5 — Pranchas e memorial

- Itens: C11.67–C11.70, K1.11.52, K1.11.60 (desenho).
- Pranchas (`src/core/sheets/fundacao.ts`), pelo padrão das folhas de referência:
  - **Locação e planta de cargas** (uma folha por nível de fundação): a locação existente (`locacao.ts`) ganha os elementos de fundação. Eixos de locação com cotas acumuladas e parciais; pilares que chegam tracejados; contorno de sapatas e blocos com estacas; cotas da excentricidade do pilar ao centro do elemento; rótulo por pilar com nome, seção e alturas do elemento ("P8 / 15×50 cm / h0 = 25 cm / h1 = 25 cm / df = 80 cm" na sapata; "ha / hb / n × estaca" no bloco); vigas de equilíbrio e de travamento com rótulo "VF1 20×40". Quadro único por pilar: Pilar (nome, seção, X, Y, cargas, momentos e forças horizontais, características e de cálculo em kN e kN·m, como decidido na R5) + Fundação (lado B, lado H, h0/ha, h1/hb, df) + Bloco (nº de estacas, estaca). Croqui da sapata com h0, h1 e df. "Legenda dos blocos": tipos de bloco iguais (B1=B2=…) cotados. Notas com as premissas em uso (σadm, estacas, método, recomendação de sondagem).
  - **Detalhamento**: por elemento ou grupo de iguais ("S1=S2=…", "B1=B2=…"), planta e corte com armadura; na sapata, malhas "n×q Nk φ6,3 c/9 C=89" com o multiplicador de iguais, cotas em cinza e a nota "solo compactado sobre a sapata"; no bloco, estacas, tirantes, estribos horizontais e verticais desenhados à parte e a cota de arrasamento; **arranques** dos pilares na mesma folha ("NÍVEL 000 – L1": elevação com esperas, gancho no pé e "C=VAR", seção com estribos e grampos). Tubulão (fuste e base) e viga de equilíbrio (elevação e seção, como as vigas da R5) não estão nas folhas: "a confirmar".
  - Por folha: tabela de aço, resumo com perdas (`armacao.ts`), volume de concreto e área de forma.
  - Ordem no `montarConjunto`: locação e planta de cargas, detalhamento da fundação, depois formas, vigas, pilares e lajes.
- Memorial e quantitativos: concreto, forma, aço e estacas (m e unidades) por elemento e no total.
- CLI `prancha --tipo fundacao` e `tipo` na ferramenta `pranchas`.
- Testes: montagem das folhas (posições, quadros, paginação, iguais), DXF auditado e e2e `FU5`.

### FU6 — Base elástica (radier e vigas de fundação)

- Itens: K1.1.4 (radier), K1.3.15, K1.3.24, K1.5.18, K1.9.31, K1.9.42, K1.9.49, K1.9.50, K1.9.89, K1.11.23, K1.13.2.3-2, K1.13.2.4-11, C10.22, C10.23.
- Modelo: laje maciça com `radier: { k, sigmaAdm }` (espessura = a da laje; k e σadm por pano) e viga de fundação (`Viga.fundacao: { k, sigmaAdm }`, lançada no nível de fundação). Ambos só no grupo de fundação.
- **Análise global** (`analitico.ts`):
  - O nível de fundação flutuante entra **no pórtico espacial** (`fe3d`), não como grelha separada: barras de grelha do radier na malha fina das lajes (mesma rigidez à flexão e torção das lajes) e as vigas de fundação, com molas verticais nos nós (`molas` do `fe3d`) iguais a k × área de influência (radier) ou k × largura × comprimento de influência (viga).
  - O pilar que nasce sobre radier ou viga de fundação não tem vínculo externo: o pé do pilar é um nó dessa malha. Os demais pilares mantêm o vínculo externo e as sapatas/blocos continuam calculados depois.
  - Deslocamentos horizontais dos nós flutuantes restringidos para evitar mecanismo [a confirmar].
  - Análise linear: mola tracionada (levantamento) não é iterada; vira erro `FUND_LEVANTAMENTO`, como no programa de referência.
  - Cargas no nível da fundação só sobre radier; aviso quando há radier e o grupo de fundação não tem carga. Aviso de apoios mistos (pilares com e sem vínculo externo).
- Verificações: tensão no solo σ = k·w por nó nas combinações raras (grupo "tensões no solo") contra σadm, com erro `FUND_RADIER_TENSAO` e mapa de tensões na janela do pano. Armadura do radier pelas regras das lajes maciças (R4, com faces invertidas) e da viga de fundação pelas regras das vigas, com taxa mínima.
- Comandos: `laje.editar` e `viga.editar` ampliados (`radier`, `fundacao`), `mcp: false`.
- Testes: viga sobre base elástica contra a solução de Hetényi; radier contra o OpenSees (`validation/opensees`); edifício com pilares mistos.

### FU7a — Sapata corrida sob vigas e alinhamentos

- Itens: C11.29, C11.59 (corridas), K1.1.4 (corridas), K1.4.74 (cintas).
- Elemento `corrida` lançado por polilinha, sob uma viga de fundação ou um alinhamento de pilares, com aba à esquerda, à direita ou nas duas. Longitudinal: viga de fundação sobre base elástica da FU6 (k padrão 100 000 kN/m³). Transversal: faixa de 1 m dimensionada pela flexão CEB-70 das sapatas. Aba de um lado exige viga de equilíbrio (FU2). Cargas lineares sobre ela (alvenaria do térreo) entram pelo C11.25.
- Testes: sapata corrida com carga uniforme contra cálculo manual; corrida excêntrica com viga de equilíbrio.

### FU7b — Fundação de muros e paredes (com a E1)

- Itens: C5.28, C11.28, C11.30, C11.31, K1.9.47, K1.9.48.
- Na E1, o lançamento do muro define a base: sem vínculo, engastado ou sobre sapata corrida (aba à esquerda, à direita ou nas duas). A sapata corrida do muro usa o elemento da FU7a. Sapata isolada equivalente sob cada pilar apoiado no muro. Atribuir sapata a muro já lançado.

## Modelo de dados proposto (`types.ts`)

```ts
interface FundacaoEdificio {
  terreno: {
    sigmaAdm?: number;                       // kN/m², sapatas e tubulões (modo informado)
    sigmaModo: 'informada' | 'sondagem';     // padrão 'informada'
    fatorVento?: number;                     // majoração de σadm com vento; padrão 1,0
    estacas: { id: string; tipo: PileType; D: number; capacidade?: number; s?: number;
               modo: 'informada' | 'sondagem' }[];
  };
  sondagens: Boring[];                       // mesmo formato do módulo Fundações
  params?: Partial<FoundationParams>;         // o que difere do padrão
  elementos: ElementoFundacao[];
  vigas: VigaFundacao[];
  limites: { id: string; grupo: string; pontos: [number, number][] }[];
}
interface ElementoFundacao {
  id: string; nome: string;
  tipo: 'sapata' | 'sapataSimples' | 'bloco' | 'tubulao' | 'corrida';
  pilares: string[];                          // 1 = isolado; > 1 = associada ou bloco com vários pilares
  x: number; y: number; angulo: number;       // centro e giro
  posicao: 'centrada' | 'divisa' | 'canto' | 'livre';
  cota?: number;                              // assentamento; ausente = cotaFundacao
  sigmaAdm?: number;                          // sobrepõe o global
  sondagem?: { modo: 'furo' | 'media'; ids?: number[] };
  impostas?: { A?: number; B?: number; h?: number; h0?: number; armadura?: unknown }; // só verificadas
  estaca?: { id: string; n?: number };        // tipo do terreno
  linha?: [number, number][]; aba?: 'esq' | 'dir' | 'ambas'; kReacao?: number; // corrida
}
interface VigaFundacao {
  id: string; nome: string; tipo: 'equilibrio' | 'travamento';
  ini: string; fim: string;                   // ids de elemento ou pilar
  equilibrio: { ini: boolean; fim: boolean } | 'auto';
  b: number; h: number; impostas?: unknown;
}
// BuildingModel.fundacao?: FundacaoEdificio
// Laje.radier?: { k: number; sigmaAdm: number }; Viga.fundacao?: { k: number; sigmaAdm: number }
```

As cargas sobre elementos e vigas (C11.25) entram em `cargas` com o grupo de fundação como destino.

## Premissas

Ficam valendo as premissas de fundação já confirmadas (CLAUDE.md): Padm, estacas, blocos, sapatas CEB-70, tubulões, combinações raras e ELU, Nd,mín. As novas são:

| Premissa | Padrão do sistema | Padrão NBR (`padraoNBR`) | Fonte / situação |
|---|---|---|---|
| σadm das sapatas e capacidade das estacas | informadas pelo usuário; SPT como opção | igual | programa de referência |
| Majoração de σadm com vento | 1,0 | igual | a confirmar (NBR 6122:2019) |
| Combinações com vento quando σadm é majorada | raras sem vento com σadm e raras com vento com σadm × fator, verificadas em separado; adotado o maior elemento | igual | programa de referência (decisão do usuário, 20/10/2026) |
| Cota do terreno (boca dos furos, profundidade dos elementos) | a do pavimento mais baixo, editável (`fundacao.terreno`) | igual | programa de referência (decisão do usuário, 20/10/2026) |
| Excentricidade do pilar sem viga de equilíbrio | momento N·e somado em módulo ao do pilar | igual | programa de referência (decisão do usuário, 20/10/2026) |
| Concreto, aço e cobrimento da fundação | próprios, por material (`materiais.definir`: fck e aço = os da obra; cobrimento 5 cm); fuste do tubulão nas opções das fundações | igual | programa de referência (materiais por tipo de elemento, K1.9.3; decisão do usuário, 20/10/2026); cobrimento: padrão do módulo Fundações |
| Alívio pela viga de equilíbrio | 50 % do alívio no pilar interno; tração no aliviado = erro | igual | NBR 6122:2019 (item a confirmar) |
| Distribuição sob sapata equilibrada | retangular (equilíbrio perfeito); trapezoidal como opção | igual | programa de referência |
| Vigas de equilíbrio e travamento apoiadas no solo | não | igual | programa de referência |
| Travamento de bloco de 1 e de 2 estacas | obrigatório (2 direções; 1 direção) | igual | NBR 6122 (item a confirmar) |
| Momento na viga de travamento | excentricidade de execução da estaca × Nd, mais as cargas sobre a viga | igual | a confirmar (valor da excentricidade) |
| Seção mínima de viga de fundação | 20 × 40 cm | igual | a confirmar |
| Descolamento da sapata | não permitido (área comprimida ≥ 2/3, regra atual) | igual | programa de referência (opção de permitir) |
| Relação vão/altura da associada rígida; balanço/altura | balanço: h ≥ (a − ap)/3 (22.6.1); vão: 2 × h | igual | vão: a confirmar |
| Bloco com vários pilares | NBR 6118 22.7 (bielas e tirantes por pilar), estacas pela resultante | igual | a confirmar (extensão de Blévot) |
| Concreto simples | malha superior só se falhar à tração (fctd) | igual | NBR 6118 cap. 24; programa de referência |
| Distância máxima para gerar associada | 1 m (até 3 m) | — (NBR não fixa) | programa de referência |
| Distância D e ângulo A de visão na geração | 3 m e 30° | — | a confirmar |
| Coeficiente de reação da sapata corrida | 100 000 kN/m³ | — | programa de referência |
| Coeficiente de reação do radier e da viga de fundação | sem padrão (obrigatório informar); tabela orientativa por solo | — | programa de referência; tabela a confirmar |
| Nós flutuantes | horizontais restringidos; levantamento = erro, sem iteração | igual | levantamento: programa de referência; restrição horizontal a confirmar |
| Escala da locação e planta de cargas | 1:75 | — | folhas de referência |
| Escalas do detalhamento | planta e corte de sapata e bloco 1:50; legenda dos blocos 1:25; arranque: elevação 1:50, seção 1:25 | — | folhas de referência |
| Escalas de viga de equilíbrio, tubulão e radier | viga 1:75 + seção 1:25 (como as vigas); tubulão 1:50; radier = escala das lajes | — | a confirmar (fora das folhas) |
| Sigla da folha | SFN para fundação indireta (blocos, estacas, tubulões) e para a locação com fundação mista; SFS para fundação direta (sapatas, corridas, radier) | — | folhas de referência (radier por extensão, a confirmar) |
| Títulos | "Fundação indireta/direta — locação de obra e planta de cargas" e "— detalhamento dos blocos/sapatas" | — | folhas de referência |
| Nomes dos elementos | S (sapatas), B (blocos), T (tubulões), VF (vigas de fundação), numeração própria; iguais "S1=S2=…" | — | folhas de referência (T e VF a confirmar) |
| Nota da sapata | "solo compactado sobre a sapata, peso específico ≥ 16 kN/m³" (editável) | — | folhas de referência |

Nenhuma premissa nova diverge da NBR. Por isso nenhuma precisa de `padraoNBR`, e os dois perfis mostram o mesmo valor. A redução da taxa mínima de flexão (C11.32) não tem equivalente na NBR 6118, então fica desligada e só aparece como opção "a confirmar". Unidades e decimais seguem a decisão da R5 (kN, MPa, vírgula), não as das folhas.

## Fora desta frente

- Placas de base (aço, decidido).
- Tubulão de divisa com base em falsa elipse. O tubulão entra só centrado; a divisa é resolvida por viga de equilíbrio.
- Recalques de sapatas e blocos, interação solo-estrutura além do Winkler, estaca com carga horizontal na análise global.
- Fundações de escadas (E4) e vista 3D (V). Mapa de tensões do radier por isovalores (C12.11) fica na V; a FU6 só traz a tabela e o mapa simples por nó.

## Riscos

- Limite de 40 ferramentas MCP. Os comandos novos ficam com `mcp: false`, e a fundação entra pelos filtros de `dimensionar` e pelo `tipo` de `pranchas`.
- Pacote em 1.293 KB e o worker inline. O cálculo de fundação vai para o worker e duplica `piles.ts` e companhia (~60 KB). Medir em cada fatia.
- Duas fontes de sondagem (edifício e módulo). Mitigação: formato único e cópia explícita.
- FU6 muda a análise global (molas, pilar sem vínculo, nível de fundação no pórtico). Validação externa obrigatória (Hetényi e OpenSees) antes de ligar por padrão.
- Bloco com vários pilares sem método normativo fechado: resultados marcados "a confirmar" no memorial.

## Aceite por fatia

Testes numéricos contra cálculo manual (alavanca, associada, bloco com vários pilares, divisa, travamento, corrida) e externos (Hetényi, OpenSees); exemplo em `EXEMPLOS` para cada comando novo, com replay; fluxo e2e por fatia; memorial e os dois checklists atualizados; nenhuma regressão no módulo Fundações nem nos resultados das frentes N e R.

## Andamento

- **FU1 no núcleo (20/10/2026).** Modelo: `BuildingModel.fundacao` (`FundacaoEdificio`: `terreno` com σadm informada ou pelo SPT, `fatorVento`, `cotaTerreno` e tipos de estaca; `sondagens` no formato `Boring`; `params` do módulo; `elementos`), `ElementoFundacao` (sapata, bloco, tubulão; centrada, divisa, canto, livre; `lado`, `cota`, `sigmaAdm`, `sondagem`, `estaca`, `impostas`) e arranque (`ehArranque`: nasce e morre "fundacao", aceito sem pavimentos; `carga.pilar` vai para o topo). Adaptador `src/core/building/fundacao.ts` (`calcularFundacoes`, `cargasPorPilar`, `parametrosFundacao`, `niveisFundacao`, `resumoFundacao`): carga rara por pilar nos eixos do elemento, σadm × `fatorVento` nas raras com vento, profundidade = cota do terreno − assentamento, e chama `designSupport`. Generalizações no módulo: `FootingInput.offset/edge/fixed` e `columnOffset` (`footings.ts`: pilar fora do centro, divisa e canto, dimensões impostas; balanços reais no CEB-70, contorno C sem a face da divisa, bielas só centrada), `FLoad.offset/edge/fixed` e `pile.capacity/spacing/n` com `pilesByCapacity` (`piles.ts`, `foundation.ts`). Bloco de divisa ou canto: excentricidade pelo tamanho do bloco, por iteração. Tubulão só centrado. Resultados em `Dimensionamento.fundacoes` (`dimensionarEdificio(b, an, { fundacao })`); revisão própria `Sessao.revFundacao` (comandos com `calculo: 'fundacao'`). Códigos FUND_EXC_SEM_VIGA, FUND_SEM_SOLUCAO, FUND_NAO_ATENDE, FUND_SEM_SIGMA, FUND_SEM_SONDAGEM, FUND_SEM_ESTACA, FUND_SEM_CARGA, FUND_PILAR, FUND_COTA (erros) e FUND_PILAR_SEM_ELEMENTO (aviso) em `revisao.ts`. Comandos (`src/core/commands/fundacao.ts`, todos `mcp: false`): `fundacao.criar/editar/mover/girar/remover`, `fundacao.terreno`, `fundacao.opcoes` (`PARAMS_FUNDACAO`), `sondagem.criar/editar/remover`. Opção `fundModo` (0 dimensionar, 1 só verificar, 2 só os com erro). Premissa `fundacoes-edificio`. MCP: `dimensionar` devolve `fundacoes` (resumo) e aceita o filtro `fundacao`; cache recalcula só a fundação quando só ela muda. CLI `dim` lista as fundações. Memorial: seção "Fundações" com terreno e tabela por elemento. Testes: `src/core/building/fundacao.test.ts` (divisa e canto contra cálculo manual, coerência com o módulo para sapata, bloco e tubulão, σadm informada × SPT, arranque, modos, vento, comandos e revisão).
- **FU1, interface (20/10/2026).** Grupo "Fundação" da aba Edifício (`src/app/edificio/Fundacao.tsx`: terreno com σadm informada ou pelo SPT, σadm × vento, cota do terreno, tipos de estaca, sondagens com o editor compartilhado `src/app/SondagemEditor.tsx` — o mesmo do módulo Fundações, que passou a usá-lo —, modo de cálculo `fundModo`, parâmetros do cálculo, lançamento e edição do elemento selecionado: tipo, posição e lado, ângulo, cota, σadm, sondagem, estaca e dimensões impostas). Planta do nível de fundação (`Planta.tsx`, `plantaStore.ts`; `pavimento: 'fundacao'` no seletor, `data-nivel` no contêiner): ferramenta Fundação (U) com prévia ao aproximar do pilar, posição automática pelo ponto do clique (centrada, divisa com a face realçada, canto) ou escolhida (livre = clique no pilar e depois no centro), contornos do resultado (sapata, bloco com as estacas, tubulão), centro, excentricidade e erros em vermelho; selecionar, mover, girar (R), remover (Del); arranques hachurados. Janela do elemento (`JanelaFundacao`, aberta por `abrirJanela({ tipo: 'fundacao' })`, duplo clique, botão da barra e lista de erros): resumo, mensagens FUND_* e os desenhos e verificações do módulo Fundações (`FootingDetail`, `CaissonDetail`, `CapDetail` e `SolutionDetail`, que saiu de `Fundacoes.tsx` para `FundacoesDetail.tsx`); aba Dimensionamento com a tabela de fundações. Cálculo no worker: o pedido `fundacao` usa a análise em vigor (`calcularFundacoesNoWorker`, `store.calcularFundacao`, `revFund` × `Sessao.revFundacao`; `fundacaoAtual`), então mudar só dados de fundação não refaz a análise; "Calcular e dimensionar" inclui as fundações, "Calcular sem fundação" deixa-as de fora, e obra só com arranques calcula só a fundação. Arranque: opção "Arranque" da ferramenta Pilar, opção "fundação (arranque)" no seletor "Morre" e cargas no arranque (`CargasNoPilar`, extraído de `Vinculos.tsx`). Aba Fundações em leitura (`fieldset disabled`) com aviso e lista dos elementos do edifício quando há fundação lançada. e2e `FU1` (dois fluxos: divisa e centrada, janela, FUND_EXC_SEM_VIGA, σadm sem refazer a análise, aba Fundações em leitura; obra vazia só com arranques). A confirmar: posição automática (limiar de 50 % do meio lado), clique define face/canto nos eixos do pilar, bloco sem solução de divisa só pela FU2. Pacote 1.409 KB. Pendências da FU1 na interface: giro por dois pontos, escolha dos níveis calculados, verificação de blocos e tubulões com dimensões impostas (FU3).
- **FU1: materiais da fundação e itens "a confirmar" (20/10/2026).** Concreto da fundação como material próprio, igual ou diferente do da obra (decisão do usuário, como no programa de referência): `Norma.fckElem.fundacao`, `acoPos.fundacao` e `Norma.cobFundacao` (cm), lidos por `fckDe(b, 'fundacao')`, `acoDe(b, 'fundacao')` e `cobrimentoFundacao` (`materiais.ts`) e levados ao núcleo por `parametrosFundacao` (fckFound, fyk, cover); padrão fck e aço da obra e cobrimento de 5 cm (antes: fck da obra, editável só em `fundacao.opcoes`); `fckFound` e `cover` saíram de `fundacao.opcoes` (valores antigos ainda lidos até a definição nos materiais). Comando `materiais.definir` com `fck.fundacao`, `aco.fundacao` e `cobFundacao`; campos no grupo "Materiais e segurança" (`Materiais.tsx`), linha no memorial e nas notas da locação. Conferidos contra os checklists (cap. 11; 1.9 e 1.15) e a pesquisa, sem registro do programa de referência em contrário: cota do terreno = pavimento mais baixo, N·e somado em módulo e raras sem e com vento verificadas em separado passam a padrão do sistema (fonte "programa de referência"); nenhum difere da NBR, sem `padraoNBR`. Segue "a confirmar" o valor da majoração de σadm com vento (NBR 6122:2019) e as estimativas pelo SPT. Teste em `fundacao.test.ts` (materiais da fundação).
- **FU2 no núcleo (20/10/2026).** Modelo: `FundacaoEdificio.vigas` (`VigaFundacao`: tipo equilíbrio ou travamento, pontas = elemento ou pilar que nasce na fundação, `equilibrio` "auto" ou { ini, fim }, seção b × h, `fixa`) e `FundacaoEdificio.niveis` (níveis calculados); `Carga.grupo = 'fundacao'` (cargas no nível de fundação). Núcleo `src/core/building/vigasFundacao.ts`: `pontaVF`, `geometriaVF`, `pontasEquilibradas` (auto: sapata ou bloco de divisa, canto ou livre), `alavanca` (Σ ΔNᵢ·ℓᵢ·uᵢ = R·e; uma viga R = N·ℓ/(ℓ − e); duas ortogonais R = N/(1 − ex/ℓx − ey/ℓy); várias pela rigidez EI/ℓ; a componente não equilibrada fica no elemento; Σe/ℓ ≥ 0,9 = alavanca impossível), `diagramaAlavanca` (reação uniforme sob o elemento; momento máximo no cortante nulo), cargas da faixa da viga (`parcelasDaCarga`, `abscissaNaViga`, `cargasDaViga` com peso próprio 25·b·h, `reacoesBiapoiada`, `diagramaBiapoiada`) e `dimensionarVigaFundacao` (envoltória alavanca + biapoiada + travamento, cortante a partir das faces, ELU 1,4 ×; `beamFlexure`/`beamAsMin`/`chooseBars`/`beamShear` de `concrete.ts`, pele 0,10 % com h > 60 cm, lb das barras superiores por `lbBasico`; seção mínima 20 × 40 cm, altura e depois largura crescentes, ou fixa só verificada; volume e aço estimado). Integração em `fundacao.ts`: `calcularFundacaoEdificio` (`calcularFundacoes` continua devolvendo só os elementos): cargas do grupo "fundacao" primeiro nas vigas e as reações por caso somadas aos pilares das pontas (`cargasPorPilar` soma reações do mesmo caso), depois sobre os elementos (contorno do primeiro cálculo); elementos equilibrados calculados primeiro, centrados com a reação da alavanca (iteração tamanho ↔ excentricidade, ciclo resolvido pelas maiores dimensões); alívio no pilar oposto (opção `vigaEqAlivio` 50 % no Nk, total na carga mínima e na permanente; tração = FUND_VIGA_TRACAO; elemento também equilibrado não é reduzido); `FUND_EXC_SEM_VIGA` só sem viga ou na direção da divisa sem equilíbrio; travamento obrigatório (FUND_SEM_TRAVA: bloco de 1 estaca em duas direções, de 2 estacas na perpendicular à linha das estacas) e momento Nk × `vigaTravExc` (10 cm) por ponta, repartido entre as vigas da mesma direção. `ResultadoFundacao.alavanca/alivio/cargaDireta`; `Dimensionamento.vigasFundacao/avisosFundacao` (`comFundacao`); worker, MCP (`dimensionar` com `vigasFundacao`, `avisosFundacao`, `alavanca` e `alivio` no resumo, filtro `fundacao`) e CLI `dim`. Comandos `vigaFundacao.criar/editar/remover/igualar` (`mcp: false`, `calculo: 'fundacao'`); `fundacao.remover` e `pilar.remover` levam junto as vigas das pontas; `fundacao.opcoes { niveis }`; `carga.ponto/linha/area` com grupo "fundacao" só mudam `revFundacao`; `opcoes.definir` só com opções das fundações também (`Comando.calculo` aceita função dos parâmetros). Opções `vigaEqAlivio` (50 %), `vigaEqDistribuicao` (0 retangular; 1 trapezoidal = equilíbrio só além do núcleo central), `vigaTravExc` (10 cm), `vigaFundBMin`/`vigaFundHMin` (20/40 cm), `vigaFundEstribosEsperas` (1); nenhuma difere da NBR (sem `padraoNBR`). Códigos FUND_SEM_TRAVA, FUND_VIGA_SECAO, FUND_VIGA_SEM_EXC, FUND_CARGA_FORA (avisos) e FUND_VIGA_PONTA, FUND_VIGA_ALAVANCA, FUND_VIGA_TRACAO, FUND_VIGA_FLEXAO, FUND_VIGA_CORTANTE (erros). Premissa `vigas-fundacao`; memorial com a tabela das vigas de fundação. Pendências da FU1 no núcleo: giro por dois pontos já existia (`fundacao.girar { pontos }`); escolha dos níveis calculados persistida em `fundacao.niveis` (os não calculados mantêm o resultado anterior). Testes `src/core/building/vigasFundacao.test.ts` (alavanca de uma viga, de canto e de vigas paralelas; diagrama contra o cálculo manual; sapata de divisa com viga: R, alívio de 50 %, Mk no cortante nulo e Vk na face do pilar; tração no aliviado; trapezoidal; alavanca impossível; travamento de bloco de 1 estaca; cargas no nível de fundação; igualar; níveis). A confirmar: excentricidade de execução de 10 cm, seção mínima 20 × 40 cm, padrão dos estribos até as esperas, apoio da alavanca no pilar oposto com as duas pontas equilibradas, momentos do pilar no elemento, cargas sobre o elemento sem momento (contorno do primeiro cálculo), item da NBR 6122 do alívio de 50 % e do travamento. Pendente para a interface: lançamento por clique entre elementos, seta curva na ponta equilibrada, editor (verificar/dimensionar, lista das verificações, igualar), detalhe longitudinal e transversal, cargas no nível de fundação na planta, escolha dos níveis calculados, giro por dois pontos; ancoragem editável (C11.45) e desenho (C11.48) com a FU5; cruzamento de vigas (C11.53).
- **FU2, interface (20/10/2026).** Ferramenta Viga de fundação (tecla B, só no nível de fundação; `Ferramenta` `vigaFund`, tipo e seção em `plantaStore`): clique no primeiro e no segundo elemento (ou pilar de arranque; sobre o pilar de um elemento vale o elemento), prévia do alvo e da linha, cria `vigaFundacao.criar` com o tipo e a seção do grupo Fundação; a viga é desenhada como faixa entre os pilares das pontas (tracejada no travamento), com rótulo "VF1 20x40 eq." (seção adotada), vermelho/amarelo da revisão, seleção por clique, janela de seleção, Del, duplo clique para a janela e seta curva (anel aberto sobre o pilar) em cada ponta equilibrada. Ferramenta Girar 2 pontos (K, `girarFund`; G ficou com o Girar da seleção, R7-0): os elementos selecionados giram para a direção de dois pontos (`fundacao.girar { pontos }`), também pelo botão do editor do elemento. Cargas no nível de fundação: a ferramenta Carga na planta de fundação lança no grupo "fundacao" (`grupoCarga` na planta; cargas desse grupo desenhadas e selecionáveis) e o grupo Fundação traz o bloco "Cargas no nível de fundação" (tipo, caso, valor, contagem). Grupo Fundação (`Fundacao.tsx`): "Níveis de fundação calculados" (Check por cota de assentamento; `fundacao.opcoes { niveis }`, lista vazia = todos; só com 2 níveis ou mais), bloco "Vigas de fundação" (tipo, b × h, lançar, tabela e editor `VigaFundacaoEditor`: nome, tipo, pontas, "Pontas equilibradas" automático/só uma/as duas/nenhuma, b × h, "Seção fixa", "Impor a seção calculada", igualar a um modelo e igualar as selecionadas a esta, verificações e observações, abrir janela, remover). Janela da viga (`VigaFundacao.tsx`, `JanelaVigaFundacao`; aberta por `abrirJanela({ tipo: 'fundacao', id })` com o id da viga, distinguida de elemento pelo id): resumo, ações (alívio, cargas, travamento, Mk/Md, Vk/Vd), armadura e estribos, mensagens e notas, detalhe longitudinal em SVG (pilares das pontas, barras superiores com lb além do pilar equilibrado, inferiores, estribos entre as faces, diagramas de momento superior/inferior e de cortante) e seção transversal (barras em camadas, pele, estribo); classes `det-diag` no `global.css`. Janela do elemento: bloco "Viga de equilíbrio, alívio e cargas do nível" (R/N, excentricidade equilibrada e não equilibrada, distribuição, alívio por viga, alívio recebido, cargas diretas; botões para abrir as vigas). Dimensionamento: card "Vigas de fundação" com avisos gerais; erros FUND_VIGA_* aparecem na lista de revisão como Fundação e levam à planta/janela da viga. e2e `FU2` (sapata de divisa S1 + viga de equilíbrio até S2 pela planta, duplicata recusada, calcula, FUND_EXC_SEM_VIGA some, janela da viga com detalhes, alavanca em S1, alívio em S2, duplo clique na planta, giro por 2 pontos e carga linear do nível). Pendente: cruzamento de vigas (C11.53/C11.27), ancoragem editável (C11.45) e desenho nas pranchas (FU5). Pacote 1.481 KB.
