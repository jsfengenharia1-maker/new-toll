# Statikos: plano de negócio (rascunho de 20/10/2026)

Nome provisório. Números de mercado vêm da pesquisa de 20/10/2026 (fontes no fim). Estimativas próprias estão marcadas "(estimativa)"; preços sem fonte confirmada estão marcados "a confirmar". Nada aqui foi validado com clientes. Repositório público: sem nomes de clientes, pessoas, cidades de obras, projetos de referência ou do escritório do autor; o outro repositório do autor aparece só como "EngStudio (repositório privado do autor)".

## 1. Resumo executivo

- Proposta: **da arquitetura ao projeto calculado**. O Statikos nasce dentro da IA: o usuário envia a planta baixa (DXF/PDF) ou o IFC do Revit, pede "faça o lançamento completo, calcule e dimensione", e o agente conduz tudo no Statikos, do início ao fim, e entrega.
- O Statikos é o motor de cálculo operado por agente (MCP). O valor vendido é o tempo economizado entre receber a arquitetura e ter um modelo estrutural lançado, calculado e dimensionado.
- Complementar, não substituto, dos softwares instalados no início: o engenheiro confere e edita no app ou exporta (IFC, DXF/DWG de formas, memorial) para CYPECAD, Eberick, TQS etc. e finaliza lá. O engenheiro revisa e assina a ART.
- Produto principal: "Projeto automático", cobrado por projeto/edifício. Pro Cloud e Escritório ficam como assinatura com franquia.
- O app web continua grátis, local e sem login. Ele é o canal de aquisição.
- Nicho de entrada recomendado: residências térreas e sobrados de alvenaria/concreto, onde regras padronizáveis rendem mais tempo economizado; depois edifícios (o Statikos já calcula).
- Depois do beta: add-in de Revit com um botão que envia o modelo ao Statikos. Antes dele, a exportação IFC nativa do Revit já serve.
- Linhas B2B (centrais de corte e dobra, orçamento, segunda opinião, universidades) entram depois de validar o núcleo pago.
- Posição de preço: abaixo do Eberick Professional (R$ 247/mês) na assinatura; o argumento é o tempo economizado, a operação por IA e a rastreabilidade (premissas visíveis e log de comandos).

## 2. Proposta de valor e fluxo

Fluxo ponta a ponta (o agente opera; o engenheiro supervisiona):

```
ENTRADA            planta baixa DXF/PDF, IFC do Revit (imagem/PDF raster: risco alto)
   |
LEITURA            DXF/IFC/PDF -> paredes, aberturas, ambientes, níveis, escala calibrada
   |
LANÇAMENTO         regras de lançamento automático -> pilares, vigas, lajes, fundações
AUTOMÁTICO         (parâmetros editáveis, perfil de normas)
   |
PRÉVIA / APLICAR   comando com prévia -> verificação de lançamento -> aplicar (desfazer/refazer)
   |
ANÁLISE            grelha + pórtico 3D, vento, γz, combinações
   |
DIMENSIONAMENTO    vigas, pilares, lajes, fundações, quantitativos
   |
REVISÃO PELO       lista de erros e avisos, relatório de premissas, iteração de seções
AGENTE
   |
ENTREGA            memorial, pranchas (PDF/DXF/DWG), exportação IFC/DXF para outros programas
   |
ENGENHEIRO         confere e edita no app (ou finaliza em CYPECAD/Eberick/TQS) e assina a ART
```

Pontos centrais:

- **Responsabilidade.** O agente propõe; o engenheiro revisa e assina a ART. Revisão humana obrigatória antes da entrega ao cliente final; o relatório de premissas lista o que foi adotado e o que está "a confirmar".
- **Fluxo prévia → aplicar já existente.** O agente nunca altera o modelo sem prévia; toda alteração passa por comando com schema, verificação de lançamento, desfazer e refazer.
- **Rastreabilidade como argumento de confiança.** Cada ação do agente fica no log de comandos (ids determinísticos, replay), e as premissas ficam visíveis no app e no memorial. O engenheiro audita o que foi feito, na ordem em que foi feito.
- **Valor = economia de tempo.** Medir no beta as horas economizadas por projeto (lançamento manual versus agente + revisão); é a base do preço por projeto.
- **Complementaridade.** No início, o Statikos convive com o software que o escritório já tem: entra como acelerador do lançamento e do pré-dimensionamento, e sai com arquivos que os outros programas leem (seção 5).

## 3. Esclarecimento da ideia

O Claude não paga ao Statikos. Quem paga é o usuário final.

| Elemento | Quem opera | Quem paga |
|---|---|---|
| Raciocínio e conversa (Claude, Haiku/Sonnet/Opus) | Anthropic | Usuário, pela assinatura Claude dele (variante 1) ou o Statikos, pela API (variante 2) |
| Cálculo, dimensionamento, pranchas (ferramentas MCP) | Statikos | Usuário, por plano/créditos do Statikos |
| Conector no diretório | Statikos (servidor), Anthropic (listagem) | Inclusão grátis; sem revenue share encontrado |

Variante 1 (conector): o usuário conecta o conector Statikos ao Claude, como se faz com o Higgsfield, faz login OAuth na conta Statikos e consome créditos do plano. O Higgsfield é exemplo de produto que cobra o uso do MCP dentro do Claude por plano com créditos (US$ 19/47/99 por mês no anual; fonte secundária). O modelo (Haiku, Sonnet ou Opus) é quem chama as ferramentas; o conector é do Statikos e cobra do usuário.

Variante 2 ("Agente Statikos"): o Statikos hospeda o agente que executa o fluxo da seção 2. Haiku 5.5 orquestra e Sonnet 5.5 revisa; o custo de tokens é do Statikos e está embutido no preço por projeto. O MCP connector da Messages API (beta, header `mcp-client-2025-11-20`) chama o MCP remoto direto da API com OAuth Bearer; exige endpoint remoto, stdio não serve.

## 4. Concorrência e posicionamento

| Produto | Modelo / preço | Fonte / observação |
|---|---|---|
| Eberick (AltoQi) | Assinatura anual por membro, 12x: Professional R$ 247/mês; Premium R$ 527; Enterprise R$ 927; Infinity R$ 1.437 | altoqi.com.br/planos/eberick; revendedor anuncia vitalício R$ 836,90 (secundário) |
| CYPECAD | Licença permanente + assinatura; tabela oficial não encontrada | Artigo antigo: R$ 1.788 a R$ 11.988; CJF comprou licenças vitalícias em 2024 (lote R$ 77.062,12); modelo comum: vitalícia + 12 meses de atualização |
| TQS | Perpétua ou assinatura; preço não encontrado | Avaliação grátis de 6 meses só para aprendizado |
| Robot (Autodesk) | Só na AEC Collection: US$ 1.690/ano ou US$ 210/mês | |
| SkyCiv | ~US$ 80/mês (secundário) | |
| ClearCalcs | US$ 35 a 79/mês (fontes conflitantes) | |
| Ftool | Grátis | Só pórticos planos, sem dimensionamento de edifício |

Posicionamento:

- Abaixo do Eberick Professional no plano de entrada, sem exigir licença vitalícia de milhares de reais.
- Diferencial central: o único operável por IA (lançamento por linguagem natural, revisão automática, iteração de seções, fluxo prévia → aplicar com desfazer/refazer).
- Transparência: toda premissa fica visível no app e no memorial, com "a confirmar" onde não há fonte. Isso é argumento de venda para engenheiro que assina ART.
- Complementar aos programas instalados no início: a exportação IFC/DXF e o memorial levam o resultado para eles.
- Risco de posicionamento: concorrentes consolidados têm base instalada, treinamento e confiança. A entrada é por quem já usa IA e quer acelerar lançamento e revisão, não por substituição imediata.


Lançamento automático por IA (pesquisa de 20/10/2026):

| Iniciativa | Situação | Fonte / observação |
|---|---|---|
| Grandes (CYPECAD, Eberick, TQS, Robot) | Nenhum tem lançamento automático por IA em produto | O TQS declara estudo de IA para pré-dimensionamento e pré-lançamento (ainda não é produto) |
| TQS (estudo de IA) | Declaração de intenção | dl.tqs.com.br/tqs-news/JornalTQS_55.pdf |
| Auto RC (app iOS) | Escaneia a planta e lança vigas; maturidade desconhecida | apps.apple.com/us/app/-/id6451228272 |
| Flexlajes | IA para lajes pré-moldadas; fonte não aberta | A confirmar |
| Pesquisa acadêmica | PDF de formas para modelo de elementos finitos (arXiv 2608.17237); artigo na Nature Communications (2026) com normas chinesas | Não é produto |
| Augmenta | Instalações (MEP), não estrutura | Fora do mercado do Statikos |

Conclusão: há uma janela de oportunidade, a validar. Os grandes devem chegar ao tema; a vantagem do Statikos é já ter núcleo, comandos, MCP e pranchas prontos para operação por agente.

## 5. Interoperabilidade (entrada e saída)

### 5.1 Entrada

| Formato | Situação | Observação |
|---|---|---|
| DXF | Leitor já existe no Statikos | Camadas, escala e unidade estimadas; conferência pelo agente |
| IFC (Revit etc.) | A fazer | web-ifc (ThatOpen, MPL-2.0): lê e escreve, roda em Node e no navegador. Dependência nova exige aceite do usuário. https://github.com/ThatOpen/engine_web-ifc |
| PDF vetorial | A fazer | O EngStudio (repositório privado do autor) documenta a receita, com calibração de escala por cotas |
| Imagem / PDF raster | Por visão do Claude | Risco alto de precisão; o agente confere por sobreposição do lançamento sobre a imagem |

### 5.2 Saída (sem formato proprietário, regra do projeto)

| Saída | Destino | Observação |
|---|---|---|
| IFC com IfcColumn, IfcBeam, IfcSlab | CYPECAD | O CYPECAD lê IFC gerando pisos e pilares, contornos de laje e paredes como carga. Seção dos elementos na importação: a confirmar. https://info.cype.com/en/subject/cypecad-automatic-entry-of-projects-dxf-dwg-and-cad-bim-models/ |
| DXF/DWG de formas como gabarito | CYPECAD, Eberick, TQS | Os três aceitam DXF/DWG como referência para relançar. Eberick com IFC: sem documentação oficial. O TQS usa plantas 2D como referência e tem plugin de Revit próprio. https://dl.tqs.com.br/files/Projeto_Estrutural_no_Ambiente_BIM_TQSABECE.pdf |
| Memorial com seções e cargas | Qualquer | Complementa o gabarito onde o formato não leva seções |

Conclusão: para o CYPECAD, a exportação IFC economiza o relançamento; para Eberick e TQS, o ganho inicial é o DXF de formas mais o memorial com seções e cargas. Testar com cada programa no beta (a confirmar).

### 5.3 Revit

- **Caminho 1, sem add-in:** exportação IFC nativa do Revit. Custo zero, já serve no MVP (depende do leitor de IFC).
- **Caminho 2, add-in:** botão "enviar ao Statikos". O EngStudio (repositório privado do autor) tem um esqueleto de add-in em C# (Revit 2023-24 em .NET Framework 4.8; 2025-26 em .NET 8; 2027 em .NET 10) que exporta níveis, paredes, ambientes e esquadrias num modelo próprio, nunca compilado; dá para adaptar. Distribuição pela Autodesk App Store: regras de publisher em https://aps.autodesk.com/marketplace/publisher-center/revit-publisher-guidelines; comissão não encontrada.
- Concorrência no mesmo canal: CYPE e TQS já têm plugins de Revit.
- Add-in só depois do beta (decisão pendente).

## 6. Lançamento automático: base de conhecimento

O EngStudio (repositório privado do autor) tem uma competência estrutural funcional, em Python, com piloto aprovado pelo responsável técnico do escritório, para residências térreas de alvenaria. Regras já validadas:

| Tema | Regra |
|---|---|
| Pilares | Em todo encontro de paredes (L, T, X) e em ponta solta; intermediário se o vão passa de 5,0 m |
| Vigas | Sobre todas as paredes, contínuas (lacuna colinear de até 2 m) |
| Tipos de viga | Tabela de 9x30 a 9x60; escolhe-se a mais leve que atende |
| Fundação | Sapata padrão com dimensionamento por bielas; sapata de divisa com viga alavanca e associada; σadm = NSPT/50 |
| Lajes | Treliçada; distribuição por área de influência |
| Vergas e contravergas | Lançadas nas aberturas |
| Cargas | Residenciais (marcadas "conferir") |
| Leitura | Leitor de IFC (ifcopenshell, Python) e detector de encontros de paredes |

Limitações: só planta ortogonal e só térreo; seções de pilar 9x30 e cobrimento de 15 mm estão abaixo do mínimo da NBR 6118, aceitos pelo responsável técnico com ressalva.

Plano:

- Portar as **regras** (não o código Python nem dados de obras) para um módulo TS de lançamento automático no núcleo: comando com prévia, parâmetros editáveis e premissas no memorial.
- Dois perfis: "NBR 6118" (padrão, seções mínimas da norma) e "perfil do escritório" (ressalvas explícitas, marcadas como fora da norma no memorial e na revisão).
- O banco de requisitos da NBR 6118 do EngStudio não vai para o repositório público (texto da ABNT é protegido): só parâmetros e redação própria.
- Nicho de entrada recomendado: residências térreas e sobrados de alvenaria/concreto, onde as regras padronizáveis rendem mais tempo economizado e os softwares grandes são caros para o porte; depois, edifícios.
- Uso interno no escritório do autor como primeiro cliente (dogfooding).

## 7. Mercado

Dados:

- Confea: ~1,2 milhão de profissionais (censo 2025).
- Engenheiros civis: 183.496 (sem ano informado).
- CNAE 7112-0/00 (serviços de engenharia): ~152.880 empresas (Econodata).
- Número de escritórios de estrutura e ticket médio: não encontrados.

Funil (estimativa, premissas explícitas):

| Nível | Definição | Cálculo | Valor (estimativa) |
|---|---|---|---|
| TAM | Engenheiros civis registrados | dado | 183.496 profissionais (dado) |
| SAM | Escritórios/profissionais que fazem projeto estrutural de edifícios de concreto | 10% das 152.880 empresas do CNAE (premissa a validar) | ~15.000 (estimativa) |
| SOM | Parcela alcançável em 24 meses | 1% do SAM | ~150 escritórios (estimativa) |

O nicho de entrada (residências e sobrados) não tem número próprio levantado: a dimensionar no beta (a confirmar).

Receita potencial do SOM (estimativa): 150 escritórios × R$ 199/mês × 12 = R$ 358.200 por ano. Autônomos e estudantes não entram na conta. O SAM é a premissa mais frágil: pode variar por um fator de 3 para cima ou para baixo.

## 8. Produtos e preços (estimativa, validar)

| Plano | Preço | Conteúdo |
|---|---|---|
| Projeto automático (produto principal) | Por projeto, por faixa de área construída (estimativa; a definir) | Agente conduz da planta/IFC ao modelo calculado, dimensionado, com memorial, pranchas e exportação. O valor está no tempo economizado; medir as horas economizadas no beta antes de fixar a tabela |
| Grátis | R$ 0 | App web local completo + MCP stdio local (sem créditos, sem nuvem) |
| Pro Cloud (assinatura) | ~R$ 149 a 199/mês (estimativa) | MCP remoto, conta, franquia mensal de créditos, armazenamento de projetos |
| Escritório (assinatura) | ~R$ 490/mês (estimativa) | Multiusuário, franquia maior, projetos compartilhados |
| Créditos avulsos | a definir | Pacotes pré-pagos (cobrança por chamada sem cartão por centavos) |
| Agente por projeto (edifício já lançado) | R$ 49 a 149 por edifício (estimativa) | Agente Statikos conduz a revisão, o dimensionamento e as pranchas de um modelo existente |
| Anual | desconto a definir (ex.: 2 meses grátis, estimativa) | Todos os planos pagos |
| Estudante | Grátis | Com marca d'água nas pranchas; validação por e-mail institucional |

Regras de crédito (exemplo, a calibrar com custo real):

- 1 crédito = 1 `dimensionar` de edifício até N pavimentos (N a definir).
- Prancha completa = N créditos (a definir).
- Edição (lançar, aplicar, desfazer, consultar) é grátis, pois não custa compute relevante.
- Os planos Pro e Escritório incluem franquia; não há cobrança por tokens, pois o raciocínio é do Claude do usuário.

Pagamento no Brasil: Pix e cartão via Stripe, Mercado Pago ou Asaas (escolha pendente; taxas a confirmar). Taxa de cartão inviabiliza cobranças abaixo de ~US$ 1 (WorkOS), por isso créditos pré-pagos em vez de cobrança por chamada.

Cobrança por chamada para agentes (opções futuras, não essenciais ao MVP): x402 (Cloudflare Agents `paidTool`), Cloudflare Monetization Gateway (lista de espera, 01/07/2026), Stripe Machine Payments.

## 9. Custos unitários (estimativa)

Preços da API Claude (US$ por milhão de tokens, entrada/saída):

| Modelo | Entrada | Saída | Observação |
|---|---|---|---|
| Haiku 5.5 | 0,10 | 0,50 | Até 100 mil tokens de prompt |
| Sonnet 5.5 | 2 | 10 | |
| Opus 5.5 | 4 | 20 | |

Batch custa cerca da metade; cache de prompt é bem mais barato. Managed Agents: tokens + US$ 0,08 por hora de sessão.

Sessão de agente de referência (estimativa): 2 M tokens de entrada + 200 mil de saída.

| Modelo | Entrada | Saída | Total sem cache (estimativa) |
|---|---|---|---|
| Sonnet 5.5 | 2 × 2 = US$ 4,00 | 0,2 × 10 = US$ 2,00 | ~US$ 6,00; bem menos com cache |
| Haiku 5.5 | 2 × 0,10 = US$ 0,20 | 0,2 × 0,50 = US$ 0,10 | ~US$ 0,30 |

Leitura de planta por visão (imagem/PDF raster) aumenta os tokens de entrada por projeto, pois cada página vira imagem e o agente confere o lançamento por sobreposição (estimativa; medir). DXF e IFC são texto estruturado e custam bem menos.

Para a variante 1 o custo de tokens não é do Statikos. Para a variante 2, uma sessão Haiku-orquestra com revisão Sonnet pontual deve ficar entre US$ 0,30 e US$ 6 por projeto, conforme a fração em Sonnet (estimativa). Com preço de R$ 49 a 149 por edifício, a margem é positiva em qualquer caso, mas o cenário Sonnet puro sem cache consome parte relevante do preço mais baixo. A medir antes de fixar o preço.

Outros custos (estimativa, a medir):

- Compute do `dimensionar` e das pranchas: centavos por execução (núcleo puro TS; o worker já roda no navegador; em servidor, CPU de segundos).
- Armazenamento dos `.statikos`: desprezível por projeto (R2/S3).
- Autenticação (provedor pronto), e-mail transacional, domínio, observabilidade: custo fixo mensal baixo, a cotar.
- Meta: margem bruta acima de 80% (estimativa de meta, não resultado).

## 10. Arquitetura mínima para cobrar

Hoje o servidor MCP (`src/cli/mcp.ts`, JSON-RPC sem SDK) só roda por stdio, um modelo por processo, lendo `.statikos` do disco. Tem 17 ferramentas base e ~25 geradas do registro de comandos, fluxo prévia → aplicar com token e recursos `statikos://modelo`, `diagnosticos`, `premissas`, `log`, `resultados` e `resultados/{pavimento}`. Não há autenticação, medição nem telemetria.

| Componente | Decisão proposta |
|---|---|
| Transporte | Streamable HTTP (exigido pelo diretório) |
| Autenticação | OAuth 2.1 com PKCE; provedor pronto (WorkOS, Auth0, Clerk, Stytch) ou Cloudflare `workers-oauth-provider`. O diretório não aceita `client_credentials` |
| Sessão | Por usuário e projeto: Durable Objects (Workers) ou Node + Redis |
| Hospedagem | Núcleo é TS puro sem DOM, roda em Node/Lambda. Workers: CPU de `dimensionar` e `pranchas` a medir |
| Armazenamento | `.statikos` em R2/S3; `abrir` precisa aceitar conteúdo inline ou upload (hoje lê do disco) |
| Medição | Por ferramenta: créditos debitados em `dimensionar` e `pranchas`; edição grátis |
| Anotações | `readOnly` / `destructive` em cada ferramenta (exigência do diretório) |
| Downloads | PDF, DXF e DWG por URL assinada com expiração |
| Segurança | Rate limit por conta; logs sem dados de cliente |
| Documentação | Política de privacidade, docs públicos (base: `docs/ia.md`), conta de teste, canal de suporte |

Observação: isso cria um backend e revê a decisão "sem login, sem banco" apenas para a camada paga. O app web segue sem login e local. A decisão precisa de aceite explícito do usuário (item 1 das decisões pendentes).

Diretório de conectores da Anthropic: inclusão grátis, não é pay-to-play, sem revenue share encontrado. Exige MCP remoto em produção, OAuth 2.0, Streamable HTTP, anotações por ferramenta, política de privacidade, documentação pública, conta de teste e suporte. A cobrança é do próprio produto (conta + plano + login OAuth no servidor do Statikos).

## 11. Licença e proteção

Situação: Apache-2.0, repositório público, CLA previsto, marca "Statikos" não licenciada. Apache-2.0 permite que qualquer pessoa hospede um MCP concorrente com o mesmo código, inclusive vendendo.

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| (a) Manter tudo aberto | Competir por marca, serviço, validação e hospedagem | Confiança máxima, contribuições, divulgação | Cópia hospedada sem custo de desenvolvimento; só a marca protege |
| (b) Open core | Núcleo de cálculo aberto; camada cloud (OAuth, medição, sessões), agente e pranchas avançadas fechadas | Núcleo auditável (argumento de confiança em cálculo estrutural); o que gera receita fica protegido | Exige separar o que é aberto e o que é fechado; manter dois repositórios ou módulos |
| (c) Licença restritiva no código novo | AGPL ou BSL no código novo, usando o CLA | Dificulta hospedagem concorrente | Afasta contribuidores e empresas; AGPL/BSL não são mais "abertas" como a Apache-2.0; código já publicado em Apache-2.0 continua livre |

Recomendação: (b) mais registro da marca no INPI antes do lançamento.

- Engenheiro precisa auditar o cálculo; núcleo aberto é prova de confiança e a suíte de validação publicada reforça isso.
- O que um concorrente não copia facilmente é a conta, o histórico, a hospedagem confiável, o suporte, a marca e a camada de agente; é isso que fica fechado e é o que se cobra.
- O CLA permite relicenciar código novo se necessário; manter a opção (c) aberta como plano B para trechos específicos.
- Nome ainda provisório: definir o nome definitivo antes de pedir o registro (decisão pendente). Busca de anterioridade no INPI a fazer.

## 12. Ideias B2B factíveis

| Ideia | Aproveita o que já existe | Esforço (estimativa) |
|---|---|---|
| Integração com centrais de corte e dobra | Resumo de aço por posição já gerado; exportar lista de corte e dobra e quantitativo por prancha | Baixo a médio; formato de cada central a levantar |
| API para construtechs e orçamento | Quantitativos de concreto, forma e aço do dimensionamento | Médio; depende da camada cloud |
| "Segunda opinião" | Importação de projetos de terceiros, verificação independente por IA com memorial | Médio a alto; exige cuidado de responsabilidade técnica |
| Licenças para universidades | Ensino com MCP; plano estudante já previsto | Baixo |
| White-label para escritórios grandes | Marca própria do escritório sobre a camada cloud | Alto; só após o núcleo pago estabilizar |
| Treinamentos e cursos "cálculo estrutural com IA" | Guia `docs/ia.md` e exemplo de agente | Baixo; gera caixa e aquisição |

Ordem sugerida: centrais de corte e dobra e universidades primeiro (reaproveitam o que já existe), segunda opinião e API depois.

## 13. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Responsabilidade técnica por erro de cálculo | Termos de uso claros; engenheiro assina a ART (Res. Confea 1.137/2023, a conferir); memorial com todas as premissas; suíte de validação contra OpenSees e exemplos publicada como prova; seguro de responsabilidade civil profissional a avaliar |
| Propriedade intelectual (CYPE) | Reconstrução limpa documentada: especificação só do comportamento observável, sem código, textos, ícones ou nome do original; registrar o processo |
| Confiança do mercado em ferramenta nova | Beta fechado com engenheiros, validação publicada, comparação de resultados com programas conhecidos, premissas expostas |
| Dependência de plataforma (Anthropic, diretório) | Manter o MCP aberto a qualquer cliente MCP (outros assistentes e ambientes de desenvolvimento), sem depender só do diretório; app web e CLI continuam funcionando sem a nuvem |
| Custo de IA na variante 2 | Haiku como orquestrador, Sonnet só na revisão, cache, limite por projeto, medir antes de fixar preço |
| LGPD | A verificar: dados pessoais do cliente e do engenheiro, projetos de terceiros; política de privacidade, minimização, retenção e exclusão; logs sem dados de cliente |
| Tributário | NFS-e com IBS/CBS a partir de out-dez/2026; enquadramento e emissão a confirmar com contador |
| Cópia hospedada do código aberto | Opção (b) de licença, marca registrada, serviço e confiança |
| Precisão da leitura de planta por IA (cotas, escala, paredes) | DXF/IFC como entrada preferencial; calibração de escala por cotas; conferência por sobreposição; revisão humana obrigatória |
| Erro de lançamento automático | Prévia antes de aplicar; verificação de lançamento existente; revisão obrigatória pelo engenheiro; relatório de premissas; log de comandos |
| Formatos de terceiros mudarem (IFC, DXF/DWG, API do Revit) | Bibliotecas abertas e testes de regressão com arquivos fictícios; versões do Revit suportadas explícitas |
| Responsabilidade técnica pelo uso de IA | Não foi encontrada resolução do Confea/CREA específica sobre IA; vale a ART do engenheiro responsável. O CREA-SC recomenda uso ético e responsável (https://portal.crea-sc.org.br/profissionais-debatem-aplicacoes-praticas-da-inteligencia-artificial-na-engenharia/). Termos de uso e revisão humana documentada |
| Repositório público | Nunca commitar dados de clientes ou de obras reais |

## 14. Roteiro em fases (prazos estimados)

| Fase | Conteúdo | Prazo (estimativa) | Critério de saída |
|---|---|---|---|
| F0 | Decisões: licença, marca, nome, CNPJ/enquadramento, provedor de pagamento e de OAuth, web-ifc, nicho | 2 semanas | Decisões 1 a 6 e 11 a 14 da seção 17 respondidas; pedido de marca protocolado ou pesquisa de anterioridade feita |
| FA | Lançamento automático + IFC: porte das regras (módulo TS com prévia, dois perfis), leitor de IFC, exportação IFC e DXF de formas; uso interno no escritório do autor (dogfooding) | 6 a 10 semanas (estimativa) | Residência térrea de referência (fictícia, para o repositório) lançada e dimensionada de ponta a ponta pelo agente; comparação de tempo com o fluxo manual |
| F1 | MCP remoto MVP: Streamable HTTP, OAuth, sessão, armazenamento, medição, anotações, URLs assinadas | 4 a 6 semanas | Agente de exemplo (`docs/exemplos/agente-mcp.mjs`) roda ponta a ponta contra o servidor remoto, com conta e créditos debitados |
| F2 | Beta fechado: 10 a 20 engenheiros, grátis; coletar métricas, horas economizadas e teste de importação nos outros programas | 6 a 8 semanas | Meta de ativação atingida (ex.: metade dos convidados dimensiona o primeiro projeto); lista de falhas de cálculo, de lançamento e de usabilidade tratada; custo de IA e de compute por projeto medido |
| F3 | Cobrança ligada; submissão ao diretório de conectores da Anthropic | 4 a 6 semanas | Primeiros pagantes reais; checklist de submissão completo; NFS-e emitindo |
| F4 | Add-in de Revit (depois do beta), agente embutido (variante 2) e B2B | contínuo | Preço por projeto validado com margem; add-in publicado ou em distribuição direta; ao menos um contrato B2B piloto |

A FA pode andar em paralelo com a F1. Os prazos são de desenvolvimento de uma pessoa com apoio de agentes; não incluem tempo de aprovação do diretório nem de registro de marca.

## 15. Métricas

| Métrica | Definição | Uso |
|---|---|---|
| Ativação | Usuário dimensiona o primeiro edifício | Saída da F2 |
| Créditos por usuário | Créditos consumidos por mês por usuário ativo | Calibrar franquia e preço |
| Conversão grátis → pago | Pagantes / usuários ativos no grátis | Saúde do funil |
| Churn | Cancelamentos mensais / pagantes | Retenção |
| Custo de IA por projeto | Tokens + sessão (variante 2) por edifício | Margem do agente |
| Custo de compute por projeto | CPU e armazenamento por `dimensionar` e prancha | Margem do cloud |
| NPS | Pesquisa trimestral aos pagantes | Qualidade percebida |
| Horas economizadas por projeto | Tempo do fluxo manual menos tempo do agente + revisão | Base do preço do Projeto automático |
| Taxa de correção por revisão | Quantos edifícios o agente corrige sem intervenção humana | Qualidade do agente |

Telemetria hoje não existe: precisa de decisão e aviso de privacidade antes de coletar (item da LGPD).

## 16. Projeção de 24 meses (estimativa)

Todas as cifras são hipóteses, não previsões. Receita mensal = pagantes × ARPU (receita média por pagante). Não inclui B2B, impostos nem custos.

| Cenário | Pagantes no mês 24 | ARPU mensal | Receita mensal no mês 24 |
|---|---|---|---|
| Conservador | 40 | R$ 170 | R$ 6.800 |
| Base | 150 | R$ 200 | R$ 30.000 |
| Otimista | 500 | R$ 230 | R$ 115.000 |

Hipóteses:

- Conservador: o produto fica nicho de entusiastas de IA; conversão baixa; sem entrada no diretório.
- Base: coincide com o SOM da seção 7 (~150 escritórios); mix de Pro Cloud e Escritório; diretório ajuda na descoberta.
- Otimista: boca a boca e conteúdo (cursos) geram crescimento; parte relevante vem de Escritório e agente por projeto.
- ARPU depende do mix de planos; a faixa R$ 149 a 199 do Pro e R$ 490 do Escritório são estimativas.
- Receita anual do cenário base no mês 24: R$ 30.000 × 12 = R$ 360.000 (run-rate, estimativa).
- Receita não é lucro: faltam custos fixos, IA, pagamentos (taxas a confirmar), impostos e suporte.

## 17. Decisões pendentes do usuário

1. Aceitar um backend só para a camada paga (revisão da decisão "sem login").
2. Escolher a estratégia de licença: recomendação (b) open core + marca.
3. Definir o nome definitivo e iniciar a pesquisa de anterioridade no INPI.
4. Abrir CNPJ ou definir o enquadramento fiscal (com contador, incluindo NFS-e com IBS/CBS).
5. Escolher provedor de OAuth (WorkOS, Auth0, Clerk, Stytch ou Cloudflare) e de hospedagem (Workers ou Node).
6. Escolher o processador de pagamento (Stripe, Mercado Pago ou Asaas).
7. Aprovar a hipótese de preços (seção 8) para o beta.
8. Decidir se a variante 2 (Agente Statikos) entra já na F1 ou só na F4.
9. Definir o que é aberto e o que é fechado no open core.
10. Definir o beta: quem convidar (10 a 20 engenheiros) e a política de telemetria.
11. Aceitar o web-ifc (ThatOpen, MPL-2.0) como dependência para ler e escrever IFC.
12. Definir o nicho de entrada (recomendação: residências térreas e sobrados).
13. Autorizar o porte das regras do EngStudio e definir o perfil do escritório (ressalvas fora da norma, marcadas no memorial).
14. Decidir se o add-in de Revit entra agora ou depois do beta (recomendação: depois; IFC nativo serve no MVP).

## 18. Fontes

- Eberick (planos): https://www.altoqi.com.br/planos/eberick
- Confea, censo 2025 (~1,2 milhão de profissionais): https://www.confea.org.br/node/232061
- Confea, engenheiros civis (183.496): https://www.confea.org.br/node/116116
- Econodata, CNAE 7112-0/00 (~152.880 empresas): https://www.econodata.com.br/consulta-cnae/M7112000-SERVICOS-DE-ENGENHARIA
- Diretório de conectores, submissão: https://claude.com/docs/connectors/building/submission
- Diretório de conectores, FAQ (não é pay-to-play): https://claude.com/docs/connectors/building/partnership-faq
- Diretório de conectores, política: https://support.claude.com/en/articles/11697096-anthropic-mcp-directory-policy
- API Claude, preços: https://platform.claude.com/docs/en/about-claude/pricing
- MCP connector da Messages API: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
- Cloudflare x402 / `paidTool`: https://developers.cloudflare.com/agents/tools/payments/x402/charge-for-mcp-tools/
- Cloudflare Monetization Gateway: https://blog.cloudflare.com/monetization-gateway/
- WorkOS, x402 vs Stripe MPP (taxa de cartão): https://workos.com/blog/x402-vs-stripe-mpp-how-to-choose-payment-infrastructure-for-ai-agents-and-mcp-tools-in-2026
- MCPize (fonte única, secundária): https://www.getchatads.com/blog/tools-for-monetizing-mcp-servers/
- Higgsfield MCP, preços (secundária): https://creatify.ai/blog/what-is-higgsfield-mcp-what-it-does-what-it-costs-and-how-to-use-it
- Robot / AEC Collection: https://www.autodesk.com/robot
- CYPECAD, compra do CJF 2024: https://cjf.jus.br/cjf/transparencia-publica-1/licitacoes-e-contratos/editais/2024/cjf-app-pregao-7/documentos/02-anexo-i-do-edital-termo-de-referencia-pe-90-007-2024.pdf
- CYPECAD, revendedor (secundária): https://brasilsistemas.com/software/cypecad/
- TQS, avaliação gratuita: https://www.tqs.com.br/systems/tqs-avaliacao-gratuita/a3jl66mpqc
- Eberick, revendedor (secundária): https://voltsoftwares.com/produto/eberick-2026/
- SkyCiv (secundária): https://www.softwaresuggest.com/skyciv/pricing
- ClearCalcs: G2 e TrustRadius, valores conflitantes; confirmar no site
- TQS News 55 (estudo de IA para pré-lançamento): https://dl.tqs.com.br/tqs-news/JornalTQS_55.pdf
- Auto RC (app iOS): https://apps.apple.com/us/app/-/id6451228272
- arXiv 2608.17237 (PDF de formas para modelo de elementos finitos); Nature Communications 2026 (normas chinesas): fontes acadêmicas; Flexlajes: fonte não aberta
- web-ifc (ThatOpen, MPL-2.0): https://github.com/ThatOpen/engine_web-ifc
- CYPECAD, entrada automática (DXF, DWG, BIM/IFC): https://info.cype.com/en/subject/cypecad-automatic-entry-of-projects-dxf-dwg-and-cad-bim-models/
- TQS, projeto estrutural no ambiente BIM: https://dl.tqs.com.br/files/Projeto_Estrutural_no_Ambiente_BIM_TQSABECE.pdf
- Autodesk App Store, regras de publisher do Revit: https://aps.autodesk.com/marketplace/publisher-center/revit-publisher-guidelines
- CREA-SC, IA na engenharia: https://portal.crea-sc.org.br/profissionais-debatem-aplicacoes-praticas-da-inteligencia-artificial-na-engenharia/
- Interno: `docs/ia.md`, `docs/exemplos/agente-mcp.mjs`, `src/cli/mcp.ts`
