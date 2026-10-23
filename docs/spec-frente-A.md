# Spec — Frente A (autolançamento estrutural: receita de lançamento, métricas, geração de candidatos e ranking)

**Estado: especificada em 23/10/2026, revisada no mesmo dia; implementação PENDENTE (não iniciar sem ordem do usuário).** Pela decisão de 21/10/2026 (melhorias começam depois de concluir o aplicativo), fica registrada em "Melhorias futuras" de `plano-execucao.md`. A frente não vem dos checklists de paridade (nenhum item Parcial/Falta é dela), por isso fica fora da tabela "Pendências por frente" de `plano-frentes.md` e de `checklists.test.ts`.

Origem: conversa de 23/10/2026 sobre uma arquitetura de IA para lançamento estrutural (relatório externo, usado só como direção). Objetivo: a IA (via MCP) ou o próprio engenheiro lança a estrutura de um edifício de concreto armado a partir da arquitetura, calcula, corrige, compara alternativas e entrega uma proposta revisável.

## Princípio

A IA propõe e escolhe entre variantes; o gerador constrói; o motor calcula; o verificador valida; o engenheiro aprova. Nenhuma coordenada, coeficiente ou desigualdade normativa sai de um modelo de linguagem. Tudo passa por comandos já existentes (prévia → aplicar, desfazer, log com `autor`).

## Decisões do usuário (23/10/2026)

1. Começar por A0–A4 sobre DXF; o IFC (A5) entra depois que o gerador estiver validado.
2. Fluxo de decisão padrão em dados (**receita**), editável e otimizável pelo profissional.
3. Receita de fábrica com regras de livro-texto, marcadas "a confirmar", revisadas pelo usuário antes da A2.
4. Receitas pessoais na biblioteca da conta, mais o snapshot da receita usada em cada obra.
5. Exportar e importar receita como arquivo, para troca entre engenheiros.
6. Escopo inicial: edifício convencional de concreto moldado in loco (pilar, viga, laje maciça ou nervurada). Fora: transição, protensão, contenção, pilar-parede gerado automaticamente.

## O que já existe e será reaproveitado (não refazer)

| Necessidade | Onde já está |
|---|---|
| Quantitativos de concreto, fôrma e aço por pavimento | `quantitativos()` em `building/dimensionamento.ts` (campo `quantitativos` de `Dimensionamento`) |
| Índices da obra (m³, m², kg, kg/m², kg/m³; aço detalhado ou por taxa) | `quantitativosDetalhados()` e `IndicesObra` em `building/relatorios.ts` (flag `acoDetalhado`) |
| Diagnósticos de consistência do modelo, com correção executável | `verificar()` em `building/verify.ts` (`Diagnostico.sugestao: { comando, params, texto }`); só 7 códigos, todos de modelo (pavimentos, grupos, máscara), nenhum estrutural |
| Erros e avisos do dimensionamento por elemento | `revisarEdificio()` e `CODIGOS_REVISAO` em `building/revisao.ts` (`ItemRevisao`: `id`, `codigo`, `nivel`); sugestões **só em texto** em `building/sugestoes.ts` |
| Mínimos normativos de seção | `building/pilares.ts` (`PILAR_SECAO_REDUZIDA`, NBR 6118 13.2.3) e premissa `pilar-min` em `building/premissas.ts` |
| Proposta revisável e aplicação em um passo | `Proposta`, `propostaDeLancamento()` em `building/lancamentoDxf.ts`; comando `lancamento.aplicar` em `commands/lancamento.ts` (L2) |
| Cargas de paredes a partir da arquitetura | comando `carga.alvenariaDaMascara` (a camada com papel `parede` é ignorada pela proposta e lançada como carga) |
| Panos de laje a partir das vigas | comando `laje.detectarPanos` |
| Fundação automática | comando `fundacao.gerar` (FU4, `building/fundacaoGerar.ts`) |
| Edição das seções | `viga.editar`, `pilar.secaoLance`, `pilar.editar`, `laje.editar`, `obra.definir` |
| Autoria das alterações | `Entrada.autor: 'usuario' \| 'ia' \| 'arquivo' \| 'sistema'` em `commands/registry.ts` |
| Perfil sistema/NBR das opções | `perfilDe`, `padraoDe`, `OpcaoInfo.padraoNBR` em `building/opcoes.ts` |
| Exportar/importar dados versionados com validação | `exportarNormas`/`importarNormas`/`validarLinhas` em `src/core/normas/` (N3): modelo a seguir |
| Biblioteca da conta | `LibraryKind` e `saveToLibrary` em `src/app/storage.ts` (limite de 240 KB) |
| Hash estável | `fnv` em `building/lancamentoDxf.ts` (mover para utilitário comum na A0) |
| Obras de exemplo para regressão | `EXEMPLOS_OBRA`/`criarExemplo` em `building/exemplos.ts` (`predio`, `subsolo`, `vigotas`) e `sheets/exemplo.ts` |

## Regras de toda a A

- **Receita é dado, não código.** JSON com schema e validação, sem expressões livres nem script (mesma regra do log de comandos). Ações de correção vêm de um vocabulário fechado, traduzido pelo executor em comandos existentes.
- **Determinismo.** Mesma obra (hash) + mesma receita (id e versão) + mesma semente = mesmo resultado. Sem `Math.random` no núcleo da A; sorteio só por gerador com semente gravada.
- **Isolamento.** A receita roda sobre cópias do modelo (variantes guardadas como log de comandos relativo à obra base). A obra só muda quando o engenheiro aplica uma variante, como um comando composto (um passo no histórico, desfazível, `autor: 'ia'` ou `'sistema'`).
- **Premissa visível.** Cada valor da receita tem `fonte` e `aConfirmar`; a receita usada entra em `premissas.ts` e no memorial (seção "Critérios de lançamento"). O que depender de norma não verificada vai para `docs/pendencias-usuario.md`.
- **Sem duplicar a norma.** A receita não repete mínimos normativos: eles continuam nas verificações existentes (`pilares.ts`, `revisao.ts`) e no perfil da obra (`perfilOpcoes`). A receita só tem critérios de concepção (empíricos), que a NBR 6118 não fixa; por isso **não há receita "padrão NBR"**: há uma receita de fábrica e o cálculo segue o perfil da obra.
- **Comandos** `mcp: false`, com schema, `validar`, mensagem e exemplo em `EXEMPLOS` do `commands.test.ts`; acesso pelas ferramentas `comandos` e `previa`. **Nenhuma ferramenta MCP nova** (limite de 20–40): as métricas entram na saída de `dimensionar` e num recurso `statikos://metricas`; `docs/ia.md` cita o recurso e os fluxos (o teste exige).
- **Núcleo** em `src/core/lancamentoAuto/` (sem `window`, `document`, `localStorage` nem `navigator`); interface só com `src/app/ui` e `design/global.css`.
- **Classes de agente** pela tabela de `plano-execucao.md` (H, S1, S2, S3, O). Aceite de toda fatia: tsc, testes do cartão, `npm test`, build, e2e e baselines de regressão intactos (a A não muda resultado de obra existente); a frente termina com auditoria independente.

## Modelo da receita

```ts
interface Receita {
  formato: 'statikos-receita'; schema: 1;            // versão do formato (migração na importação)
  id: string; nome: string; versao: number;           // versão do conteúdo (edições do usuário)
  baseadaEm?: { id: string; versao: number };
  restricoes: {                                       // duras: violar reprova a variante
    vaoMaxViga: number;                               // m
    vaoMaxLaje: number;                               // m (menor vão do pano)
    semTransicao: boolean;                            // pilar sem continuidade até a fundação reprova
    gzMax: number | null;                             // null = limite já usado pela obra
    tipoLaje: 'macica' | 'nervurada' | 'ambas';
  };
  zonas: Array<{                                      // da máscara (camada) ou polígono desenhado
    origem: { camada: string } | { poligono: [number, number][]; grupo: string };
    regra: 'proibida' | 'evitar';                     // proibida = dura; evitar = penalidade
    penalidade?: number;                              // R$ por pilar/viga na zona (só 'evitar')
  }>;
  preDimensionamento: {                               // critérios empíricos [a confirmar]
    alturaViga: { continua: number; biapoiada: number; balanco: number; arredondarCm: number; hMinCm: number };
    espessuraLaje: { relacao: number; arredondarCm: number };   // mínimo normativo vem da verificação existente
    pilar: { tensaoMediaMPa: number; ladoMinCm: number; arredondarCm: number }; // Ac ≈ Nk·majoração/σ
  };
  etapas: Array<{
    id: 'preDimensionar' | 'gerarPilares' | 'gerarVigas' | 'definirLajes' | 'cargas' | 'fundacao' | 'calcular' | 'corrigir' | 'ranquear';
    ligada: boolean;
    parametros: Record<string, number | string | boolean>;
    parada: boolean;                                  // suspende e pede aprovação (ver "Execução")
  }>;
  correcoes: Array<{
    codigo: string;                                   // de CODIGOS_REVISAO ou de verificar()
    acoes: AcaoCorrecao[];                            // tentadas em ordem
    maxTentativas: number;
  }>;
  objetivo: {
    criterio: 'custo';                                // único número que ordena
    desempate: Array<'gz' | 'flechaMax' | 'nPilares' | 'kgPorM3'>;
    nVariantes: number;                               // 1 a 10
  };
  orcamento: { maxCalculos: number; maxSegundos: number };   // por execução
  precos: { concretoM3: number; acoKg: number; formaM2: number; fundacaoM3?: number } | null;  // [a confirmar]
}

type AcaoCorrecao =                                   // sempre sobre o elemento do diagnóstico (ItemRevisao.id)
  | { acao: 'aumentarAlturaViga'; passoCm: number; hMaxCm: number }
  | { acao: 'aumentarLarguraViga'; passoCm: number; bMaxCm: number }
  | { acao: 'aumentarSecaoPilar'; passoCm: number; ladoMaxCm: number; direcao: 'menor' | 'maior' | 'ambas' }
  | { acao: 'aumentarEspessuraLaje'; passoCm: number; hMaxCm: number }
  | { acao: 'inserirPilarIntermediario' }            // A3 em diante
  | { acao: 'perguntar' };                            // vira pendência para o engenheiro
```

Exemplos de correção (a confirmar): `FLECHA` → aumentar h da viga em 5 cm até 90 cm, depois inserir pilar intermediário; `BIELA` e `LARGURA` → aumentar a largura da viga; `PILAR_SECAO_REDUZIDA` → aumentar a menor dimensão do pilar. Todo `codigo` usado numa receita precisa existir em `CODIGOS_REVISAO` ou nos códigos de `verificar()` (teste).

Receita de fábrica em `src/core/lancamentoAuto/receitaPadrao.ts`. Valores iniciais, **todos a confirmar pelo usuário antes da A2**: h da viga ℓ/12 (contínua), ℓ/10 (biapoiada), ℓ/5 (balanço), h mínimo 30 cm, arredondar a 5 cm; laje ℓx/40 arredondada a 1 cm; pilar por área de influência com σ média de 10 MPa no pré-dimensionamento e lado mínimo 19 cm (o mesmo da premissa `pilar-min`); vão máximo de viga 7 m e de laje 6 m; γz pelo limite da obra.

## Execução

- **Estado retomável.** `receita.executar` devolve `{ execucao, situacao: 'concluida' | 'aguardando' | 'esgotada' | 'falhou', variantes, pendencias }`. Etapa com `parada` deixa a execução em `aguardando`; o engenheiro (ou a IA, com aprovação dele) segue com `receita.continuar { execucao, decisao }`. A execução fica na sessão (não vai para o arquivo).
- **Laço de correção sem oscilação.** Ordem fixa por tipo de elemento (pilares, vigas, lajes); cada ação só é aceita se a soma ponderada de erros cai (erro > aviso); hash do modelo a cada passo, e estado repetido encerra o laço; elemento já no limite da ação passa à ação seguinte; o que sobrar vira pendência listada, nunca silenciada.
- **Respeito ao engenheiro.** Elementos criados ou editados com `autor: 'usuario'` e armaduras bloqueadas não são alterados pela receita; viram pendência se precisarem mudar.
- **Orçamento.** Antes do cálculo completo, cada variante passa por filtro barato (restrições geométricas: vãos, zonas, continuidade). O cálculo completo para em `maxCalculos` ou `maxSegundos`, com `situacao: 'esgotada'` e as variantes já avaliadas. Na interface roda em worker; na CLI, direto.
- **Status de análise.** Falha do solver ou modelo inválido nunca vira aprovação: a variante sai como `falhou` com a causa.

## Fatias

| Fatia | Conteúdo | Classe núcleo / interface | Depende de |
|---|---|---|---|
| A0 | **Contrato de execução e métricas.** `metricasDaObra(b, dim)` sobre `quantitativosDetalhados` (não recalcular): concreto, fôrma, aço (com `acoDetalhado`), índices, γz, flecha máxima, contagem por código de revisão; `hashModelo` (fnv do JSON canônico, utilitário comum), versão do motor e perfil; `status` (`ok`, `modeloInvalido`, `falhaSolver`, `incompleto`). Exposto em `dimensionar` (bloco `metricas`) e no recurso `statikos://metricas`. | S2 / — | — |
| A1 | **Custo.** `custoDaObra(metricas, precos)` com concreto, aço, fôrma e fundação (volumes da fundação já calculados pelo dimensionamento); preços editáveis e "a confirmar"; memorial com os preços usados. Variantes só são comparadas no mesmo regime de aço (todas detalhadas ou todas por taxa) e com fundação gerada pelo mesmo critério (`fundacao.gerar`) ou sem fundação em todas. | S2 / S1 | A0, FU4 |
| A2 | **Receita e executor.** Schema, validação, receita de fábrica, pré-dimensionamento, executor determinístico das etapas com o laço de correção e a execução retomável. Comandos `receita.definir`, `receita.duplicar`, `receita.executar`, `receita.continuar`. `LibraryKind` novo `receita`; snapshot da receita na obra (campo novo no `BuildingModel`, com migração em `building/file.ts`); exportar/importar como `.json` com `formato: 'statikos-receita'` (no artifact do claude.ai a capability `downloads` aceita `.json`; extensão própria seria empacotada em `.zip`), recusando formato desconhecido ou `schema` futuro, no padrão da N3. Editor na aba Edifício e seção do memorial. | S3 / S2 | A0, A1 |
| A3 | **Gerador de candidatos sobre a máscara DXF da arquitetura.** Entrada: camadas com papel `parede`, `abertura`, `contorno`, `eixo` e zonas. Pilares candidatos (cantos e encontros de paredes, extremidades de eixos, afastados de aberturas), seleção pela malha e pelos vãos máximos; vigas entre pilares sob paredes ou alinhamentos (sem colisão com aberturas, vão plausível); panos por `laje.detectarPanos`; cargas por `carga.alvenariaDaMascara`. **Vários grupos:** gera primeiro o grupo-tipo e propaga a malha de pilares para os outros grupos, com continuidade obrigatória (`semTransicao`); pilar que não cabe num grupo vira pendência. Cada candidato leva origem, motivo e confiança; ambíguos viram pendência. Saída como `Proposta` + `lancamento.aplicar` (L2). | O / S2 | A2, L2 (interface), L5 |
| A4 | **Variantes e ranking.** Variantes pelos parâmetros da receita (passo da malha, regra de vigas principais e secundárias, sentido das lajes, tipo de laje), cada uma com cálculo, correção e custo; ordenação por custo e desempates; restrição dura violada nunca fica à frente. Tela de comparação (custo, γz, flecha, kg/m³, pendências). Comando `lancamento.alternativas`; aplicar a escolhida. | S3 / S2 | A3 |
| A5 | **Entrada IFC.** Alimenta o mesmo gerador via L3 (web-ifc), com modelo arquitetônico normalizado (objeto, origem, confiança). Só depois da A4 validada em obras de referência. | S2 / S2 | A4, L3 |
| A6 | **Comparar e aprender.** `receita.comparar` roda duas receitas sobre as obras salvas e mostra custo, γz, pendências e tempo. Aprendizado a partir do log: diferença entre a variante aplicada e o modelo final, separada por `autor` (o que o engenheiro mudou depois da receita); propostas explícitas de ajuste só com amostra mínima (ex.: a mesma correção em ≥ 5 obras) ("em 7 de 9 obras o pilar de canto foi aumentado; mudar a regra?"); aceitar cria nova versão da receita. Dados só no navegador e na biblioteca do usuário, nunca no repositório. | S2 / S2 | A4 |

Ordem: A0 → A1 → A2 → A3 → A4; A5 e A6 depois, independentes entre si.

## Testes de aceite

- **A0:** modelo igual → hash igual, e qualquer alteração por comando → hash diferente; métricas iguais às de `quantitativosDetalhados` nos três exemplos de `exemplos.ts`; falha forçada do solver → `falhaSolver` e nenhum elemento `ok`.
- **A1:** custo conferido à mão no exemplo `predio`; mudar preço muda só o custo; variantes com regimes de aço diferentes são recusadas na comparação.
- **A2:** receita inválida recusada com a causa (código de revisão inexistente, ação fora do vocabulário, `schema` futuro); mesma entrada e semente → mesmo resultado; laço termina por tentativa, por estado repetido e por orçamento; elemento do usuário intocado; ida e volta exportar/importar sem perda; obra antiga abre sem a receita (migração); baselines intactos.
- **A3:** testes por **invariantes**, não por resposta única: nenhum pilar em zona proibida; todo vão ≤ máximo; todos os panos fechados; toda viga apoiada; continuidade vertical em todos os grupos; determinismo. Mais 4 plantas sintéticas (retângulo, em L, com abertura central, com balanço) com resultado de referência revisado pelo usuário e fixado como baseline.
- **A4:** ranking estável com semente fixa; a variante mais barata que viola restrição dura nunca é a primeira; e2e do fluxo gabarito → variantes → aplicar → desfazer.
- **A6:** comparar a receita consigo mesma dá diferença nula; abaixo da amostra mínima, nenhuma proposta.

## Riscos conhecidos

- **Custo de cálculo:** 10 variantes × laço de correção podem levar minutos num edifício grande. Mitigação: filtro barato, orçamento, worker; medir na A4 com o exemplo `predio` antes de liberar 10 variantes.
- **Gerador heurístico:** não há "resposta certa"; a validação depende das plantas de referência revisadas pelo usuário. Sem elas, a A3 não fecha.
- **Arquitetura ruim no DXF** (camadas misturadas, paredes sem fechar): o gerador lista o problema como pendência e não inventa geometria.
- **Classificação por regex:** `CODIGOS_REVISAO` classifica mensagens por expressão regular; mudar o texto de uma mensagem quebra a correção. A A2 inclui teste que gera cada código usado na receita de fábrica.

## Pendências de dados do usuário

- Preços unitários padrão (concreto, aço, fôrma, fundação). Sem eles ficam editáveis e "a confirmar".
- Revisão dos valores da receita de fábrica e das regras de correção antes da A2.
- Plantas de referência sem dados de cliente (o projeto-padrão público da pasta CYPECAD no Drive serve de primeira) e o resultado esperado de cada uma, para a A3.
