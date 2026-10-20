# Spec — Frente FU (fundações integradas ao edifício)

Base: 90 itens Parcial/Falta com frente FU nos dois checklists (67 do manual do usuário, 23 do de cálculo). Regra: paridade de função com o programa de referência, sem copiar nomes, textos ou telas; padrões em dois perfis (sistema × NBR) quando diferirem; premissas sem fonte marcadas "a confirmar". Para aprovação do usuário.

## Objetivo

Hoje a fundação do edifício passa pelo módulo Fundações: as cargas por pilar são importadas (`importarCargasDoEdificio`) e cada apoio é dimensionado isolado, sem posição real na planta. A FU leva a fundação para dentro do edifício: elementos lançados na planta do nível de fundação (sapatas, blocos sobre estacas e tubulões; centrados, de divisa, de canto e associados), vigas de equilíbrio e de travamento, geração automática, cálculo junto com o dimensionamento do edifício, erros na planta, memorial e pranchas de locação e de armadura da fundação. O núcleo existente (`piles.ts`, `caps.ts`, `footings.ts`, `caissons.ts`, `foundation.ts`) é reaproveitado e generalizado, não refeito.

## Fatias

| Fatia | Conteúdo | Itens |
|---|---|---|
| FU1 Elementos por pilar | Lançamento, cálculo e revisão de sapata, bloco e tubulão sob um pilar, inclusive arranques | 19 |
| FU2 Vigas de equilíbrio e de travamento | Lançamento, alavanca, alívio, travamento, cargas sobre as vigas | 22 |
| FU3 Associadas, limites e edição | Vários pilares por sapata, unir/igualar, limites de divisa, dimensões impostas, opções de sapata | 20 |
| FU4 Geração automática | Sapatas, blocos e vigas gerados por parâmetros | 5 |
| FU5 Pranchas e memorial | Planta de fundação, quadros, detalhes de armadura, memorial e quantitativos | 6 |
| FU6 Base elástica | Radier e vigas de fundação sobre molas (Winkler) na análise global | 14 |
| FU7 Sapata corrida | Fundação de muros e paredes; executada depois da E1 | 8 |

Itens divididos entre duas fatias contam nas duas. Duas pendências mudam de dona: C11.26 (cargas de escadas na fundação) vai para a E4, junto com as escadas, e C11.49 (vista 3D da viga de fundação) vai para a V.

### FU1 — Elementos por pilar

- Itens: C1.35, C4.2, C4.4, C4.5, C4.6, C11.8 (sapata armada, bloco), C11.10, C11.12 (dimensionar), C11.13, C11.14, C11.15, C11.59 (sapatas, blocos), C11.61, C11.62, C11.64, K1.1.4 (parte), K1.4.89 (opções gerais), K1.11.2, K1.11.60.
- Núcleo: `src/core/building/fundacao.ts` monta a carga de cada elemento a partir de `an.fundacao`: valores característicos por caso, raras para o solo e ELU para o elemento, como já feito por `cargasParaFundacao`. Chama `designSupport` com a posição relativa pilar/elemento. `footings.ts` passa a aceitar o pilar fora do centro (ex, ey fixos). Divisa e canto sem viga de equilíbrio dão o erro `FUND_EXC_SEM_VIGA`. Cota de assentamento por elemento, com padrão em `cotaFundacao`. Vários níveis de fundação e escolha dos grupos calculados. Três modos: dimensionar tudo, só verificar os impostos, redimensionar só os com erro. Arranque = pilar sem lances (`nasce = morre = 'fundacao'`), com cargas no topo por `cargasPilar`. Sondagens no modelo do edifício. Códigos `FUND_*` em `revisao.ts`. O cálculo entra no worker depois do dimensionamento e fica opcional ("calcular com fundação"), sem invalidar o resto.
- Comandos (`src/core/commands/fundacao.ts`): `fundacao.criar` (pilar, tipo, posição centrada/divisa/canto/livre, ângulo do pilar por padrão), `fundacao.editar`, `fundacao.mover`, `fundacao.girar` (ângulo, dois pontos ou ângulo do pilar), `fundacao.remover`, `sondagem.criar/editar/remover`, `fundacao.opcoes`. Todos com `mcp: false`. A ferramenta `dimensionar` ganha o filtro `fundacao`, e não entra ferramenta nova (limite de 40). `docs/ia.md` atualizado.
- Interface: grupo "Fundação" na aba Edifício. A planta do nível de fundação traz os elementos, uma prévia da posição ao aproximar do pilar e destaque em vermelho para erros. A janela do elemento mostra pressões, estacas, bielas e armaduras, reaproveitando os desenhos do módulo Fundações. O editor de sondagens reaproveita o do módulo, que continua servindo o pórtico 2D.
- Memorial: seção "Fundações" do edifício (materiais, ações, geometria, verificações), reaproveitando o texto do módulo.
- Testes: sapata de divisa e centrada contra cálculo manual; arranque com cargas; exemplos dos comandos; replay; e2e `FU1`.

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
- Interface: lançamento por clique entre elementos; seta curva na ponta equilibrada; editor com verificar/dimensionar e lista das verificações; detalhe longitudinal e transversal (SVG).
- Testes: alavanca de divisa contra cálculo manual (reação, alívio, Md, Vd); travamento de bloco de 1 estaca; e2e `FU2`.

### FU3 — Associadas, limites e edição

- Itens: C11.6, C11.8 (concreto simples), C11.11, C11.12 (impostas), C11.16, C11.17, C11.19–C11.24, C11.32–C11.34, C11.36, C11.37, C11.59 (associadas), C11.65, K1.9.111.
- Núcleo:
  - Sapata rígida com N pilares em qualquer posição, com a resultante levada ao centro. A flexão sai das faixas pelas faces dos pilares, incluindo o negativo entre pilares.
  - Rigidez e balanço verificados pelas relações vão/altura e balanço/altura.
  - Sapata de concreto simples (NBR 6118, cap. 24), com malha superior só quando falha à tração.
  - Opção de permitir descolamento.
  - Dimensões e armadura impostas pelo usuário, só verificadas.
  - Limites poligonais por grupo: aparam a sapata de altura constante, o dimensionamento não os ultrapassa e eles são ignorados (com aviso) quando cortam pilar ou isolam pilar da associada.
  - Sobreposição detectada; eliminá-la gera uma associada.
- Comandos: `fundacao.unir`, `fundacao.igualar`, `fundacao.impor`, `limite.criar/editar/remover` (`mcp: false`).
- Interface: seleção de pilares para a associada com ponto de inserção movível; limites desenhados ou capturados da máscara DXF; editor de dimensões impostas.
- Testes: associada de 2 pilares contra cálculo manual (pressões e momentos), aparo por limite, união e igualação; e2e `FU3`.

### FU4 — Geração automática

- Itens: C11.54–C11.58.
- Núcleo: `gerarFundacoes(b, parametros)` define o tipo padrão por grupo. A posição vem dos pilares "em frente": distância de visão D e ângulo A, com balanço nulo do lado sem pilar, que vira divisa ou canto. Pilares com eixos a menos que a distância máxima (padrão 1 m, máximo 3 m) ou sapatas sobrepostas viram associada. Vigas de equilíbrio onde há excentricidade e vigas de travamento onde a NBR 6122 exige. O resultado é um único comando composto (desfaz em um passo) e todo elemento continua editável.
- Comando `fundacao.gerar`. Janela de parâmetros na interface.
- Testes: edifício de exemplo com pilares de divisa e de canto e com pares próximos; replay determinístico.

### FU5 — Pranchas e memorial

- Itens: C11.67–C11.70, K1.11.52, K1.11.60 (desenho).
- Pranchas (`src/core/sheets/fundacao.ts`):
  - Planta de fundação: elementos, arranques, cotas, eixos, estacas numeradas, quadros de sapatas, blocos, estacas e vigas.
  - Folhas de detalhes: sapata (planta e corte com armadura), bloco (planta com estacas e tirantes, corte), tubulão (fuste e base) e viga de equilíbrio (elevação e seção).
  - Tabela de aço e resumo com perdas pela infraestrutura `armacao.ts`.
  - Sigla FUN no carimbo e entrada no `montarConjunto` depois da locação.
  - A locação existente (`locacao.ts`) ganha o contorno das fundações como opção.
- Memorial e quantitativos: concreto, forma, aço e estacas (m e unidades) por elemento e no total.
- CLI `prancha --tipo fundacao` e `tipo` na ferramenta `pranchas`.
- Testes: montagem das folhas (posições, quadros, paginação), DXF auditado e e2e `FU5`.

### FU6 — Base elástica (radier e vigas de fundação)

- Itens: K1.1.4 (radier), K1.3.15, K1.3.24, K1.5.18, K1.9.31, K1.9.42, K1.9.49, K1.9.50, K1.9.89, K1.11.23, K1.13.2.3-2, K1.13.2.4-11, C10.22, C10.23.
- Núcleo:
  - Laje maciça marcada como radier: espessura, coeficiente de reação por pano e σadm.
  - Viga de fundação com coeficiente de reação e σadm.
  - Molas nos nós da grelha e do pórtico pela área de influência. Pilar sobre radier ou viga de fundação sem vínculo externo.
  - Tensões no solo verificadas, com erro quando excedidas.
  - Aviso de apoios mistos (com e sem vínculo). Cargas no nível da fundação só sobre radier, com aviso quando o grupo não tem carga.
  - Armadura do radier pelas regras das lajes maciças (R4) e da viga de fundação pela taxa mínima das vigas.
- Testes: viga sobre base elástica contra a solução de Hetényi e radier contra o OpenSees (`validation/opensees`).

### FU7 — Sapata corrida (depois da E1)

- Itens: C5.28, C11.28–C11.31, K1.9.47, K1.9.48, K1.4.74 (cintas e vigas embutidas em paredes).
- Fundação do muro definida no lançamento: sem vínculo, engastado ou sobre sapata corrida, com aba à esquerda, à direita ou nas duas. A sapata corrida é dimensionada automaticamente e, quando excêntrica, exige vigas de equilíbrio. Sapata isolada equivalente sob cada pilar apoiado no muro. Depende dos muros e paredes da E1.

## Modelo de dados proposto (`types.ts`)

```ts
interface FundacaoEdificio {
  sondagens: Boring[];                       // mesmo formato do módulo Fundações
  params?: Partial<FoundationParams>;         // o que difere do padrão
  elementos: ElementoFundacao[];
  vigas: VigaFundacao[];
  limites: { id: string; grupo: string; pontos: [number, number][] }[];
}
interface ElementoFundacao {
  id: string; nome: string;
  tipo: 'sapata' | 'sapataSimples' | 'bloco' | 'tubulao' | 'corrida';
  pilares: string[];                          // 1 = isolada; > 1 = associada
  x: number; y: number; angulo: number;       // centro e giro
  posicao: 'centrada' | 'divisa' | 'canto' | 'livre';
  cota?: number;                              // assentamento; ausente = cotaFundacao
  sondagem?: { modo: 'furo' | 'media'; ids?: number[] };
  impostas?: { A?: number; B?: number; h?: number; h0?: number; armadura?: unknown }; // só verificadas
  estaca?: { tipo: PileType; D: number; n?: number };
}
interface VigaFundacao {
  id: string; nome: string; tipo: 'equilibrio' | 'travamento' | 'fundacao';
  ini: string; fim: string;                   // ids de elemento ou pilar
  equilibrio: { ini: boolean; fim: boolean } | 'auto';
  b: number; h: number; kReacao?: number; impostas?: unknown;
}
// BuildingModel.fundacao?: FundacaoEdificio; Laje.radier?: { kReacao: number; sigmaAdm: number }
```

As cargas sobre elementos e vigas (C11.25) entram em `cargas` com o grupo de fundação como destino. O módulo Fundações continua com o seu `FoundationData` para o pórtico 2D e ganha "copiar sondagens do edifício".

## Premissas propostas

Ficam valendo as premissas de fundação já confirmadas (CLAUDE.md): Padm, estacas, blocos, sapatas CEB-70, tubulões, combinações raras e ELU, Nd,mín. As novas são:

| Premissa | Padrão do sistema | Padrão NBR (`padraoNBR`) | Fonte / situação |
|---|---|---|---|
| Alívio pela viga de equilíbrio | 50 % do alívio no pilar interno; tração no aliviado = erro | igual | NBR 6122:2019 (item a confirmar) |
| Distribuição sob sapata equilibrada | retangular (equilíbrio perfeito) | igual | a confirmar; trapezoidal como opção |
| Vigas de fundação apoiadas no solo | não | igual | programa de referência |
| Travamento de bloco de 1 e de 2 estacas | obrigatório (2 direções; 1 direção) | igual | NBR 6122 (item a confirmar) |
| Momento na viga de travamento | excentricidade de execução da estaca × Nd, mais as cargas sobre a viga | igual | a confirmar (valor da excentricidade) |
| Seção mínima de viga de fundação | 20 × 40 cm | igual | a confirmar |
| Descolamento da sapata | não permitido (área comprimida ≥ 2/3, regra atual) | igual | a confirmar (já sinalizado) |
| Relação vão/altura da associada rígida; balanço/altura | balanço: h ≥ (a − ap)/3 (22.6.1); vão: 2 × h | igual | vão: a confirmar |
| Concreto simples | malha superior só se falhar à tração (fctd) | igual | NBR 6118 cap. 24; programa de referência |
| Distância máxima para gerar associada | 1 m (até 3 m) | — (NBR não fixa) | programa de referência |
| Distância D e ângulo A de visão na geração | 3 m e 30° | — | a confirmar |
| Coeficiente de reação da sapata corrida sob muro | 100 000 kN/m³ | — | programa de referência |
| Coeficiente de reação do radier e da viga de fundação | sem padrão (obrigatório informar); tabela orientativa por solo | — | a confirmar (tabela de literatura) |
| Escala da planta de fundação e das folhas de detalhe | 1:50 (planta = formas), detalhes 1:25 | — | a confirmar, como na R5 |

Nenhuma premissa nova diverge da NBR. Por isso nenhuma precisa de `padraoNBR`, e os dois perfis mostram o mesmo valor. A redução da taxa mínima de flexão (C11.32) não tem equivalente na NBR 6118, então fica desligada e só aparece como opção "a confirmar".

## Fora desta frente

- Placas de base (aço, decidido).
- Tubulão de divisa com base em falsa elipse. O tubulão entra só centrado; a divisa é resolvida por viga de equilíbrio.
- Bloco com vários pilares (ver a pergunta 2).
- Recalques, interação solo-estrutura além do Winkler, estaca com carga horizontal na análise global.
- Fundações de escadas (E4) e vista 3D (V).

## Riscos

- Limite de 40 ferramentas MCP. Os comandos novos ficam com `mcp: false`, e a fundação entra pelos filtros de `dimensionar` e pelo `tipo` de `pranchas`.
- Pacote em 1.293 KB e o worker inline. O cálculo de fundação vai para o worker e duplica `piles.ts` e companhia (~60 KB). Medir em cada fatia.
- Duas fontes de sondagem (edifício e módulo). Mitigação: formato único e cópia explícita.
- FU6 muda a análise global (molas, pilar sem vínculo, convergência com descolamento). Precisa de validação externa e pode ficar para depois.
- Pranchas de fundação sem referência visual do padrão brasileiro do usuário.

## Aceite por fatia

Testes numéricos contra cálculo manual (alavanca, associada, divisa, travamento); exemplo em `EXEMPLOS` para cada comando novo, com replay; fluxo e2e por fatia; memorial e os dois checklists atualizados; nenhuma regressão no módulo Fundações nem nos resultados das frentes N e R.

## Perguntas abertas

1. **Radier e vigas sobre base elástica (FU6):** entram nesta frente, depois da FU5, ou ficam para depois da E1/N2? Elas mudam a análise global.
2. **Bloco com vários pilares:** incluir na FU3 (resultante no centro, estacas por rigidez, bielas por pilar — sem método normativo fechado, "a confirmar") ou deixar só a sapata associada?
3. **Fonte das sondagens e cargas:** as fundações do edifício passam a ter sondagens próprias no modelo do edifício, e o módulo Fundações fica só para o pórtico 2D, com cópia de sondagens. Pode ser assim, ou o módulo Fundações deve virar a tela das fundações do edifício?
4. **Referência visual:** há exemplo de prancha de fundação (planta de fundação com quadros, detalhes de sapata, bloco e viga de equilíbrio) para a FU5? Sem ele, a FU5 segue o padrão das pranchas da R5.
