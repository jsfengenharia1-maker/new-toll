# Spec — Frente A (autolançamento estrutural: receita de lançamento, métricas, geração de candidatos e ranking)

**Estado: especificada em 23/10/2026; implementação PENDENTE (não iniciar sem ordem do usuário).** A frente não vem dos checklists de paridade (não há item Parcial/Falta dono dela), por isso não entra na tabela "Pendências por frente" de `plano-frentes.md` nem em `checklists.test.ts`.

Origem: conversa de 23/10/2026 sobre uma arquitetura de IA para lançamento estrutural (relatório externo, aproveitado só como direção). Objetivo: a IA (via MCP) ou o próprio engenheiro lança a estrutura de um edifício de concreto armado a partir de um gabarito, calcula, corrige, compara alternativas e entrega uma proposta revisável.

## Princípio

A IA propõe e escolhe entre variantes; o gerador constrói; o motor calcula; o verificador valida; o engenheiro aprova. Nenhuma coordenada, coeficiente ou desigualdade normativa sai de um modelo de linguagem. Tudo passa por comandos já existentes (prévia → aplicar, desfazer, log).

## Decisões do usuário (23/10/2026)

1. Começar por A0–A4 sobre DXF; o IFC (A5) entra depois que o gerador estiver validado.
2. Fluxo de decisão padrão em dados (**receita**), editável e otimizável pelo profissional.
3. Receita padrão inicial com regras de livro-texto, marcadas "a confirmar", revisadas pelo usuário antes de implementar.
4. Receitas pessoais na biblioteca da conta, mais o snapshot da receita usada em cada obra.
5. Exportar e importar receita como arquivo (`.statikos-receita`), para troca entre engenheiros.
6. Escopo inicial: edifício convencional de concreto moldado in loco (pilar, viga, laje maciça ou nervurada). Fora: transição complexa, protensão, contenção.

## Regras de toda a A

- **Receita é dado, não código.** JSON com schema e validação, sem expressões livres nem execução de script (mesma regra do log de comandos). Parâmetros numéricos, listas ordenadas e referências a comandos, geradores e códigos de revisão existentes.
- **Determinismo.** Mesma obra + mesma receita + mesma semente = mesmo resultado. Qualquer sorteio usa semente gravada.
- **Premissa visível.** Toda regra da receita é editável no app, aparece no memorial (seção "Critérios de lançamento") e, sem fonte confirmada, fica "a confirmar". O que depender de norma não verificada vai para `docs/pendencias-usuario.md`.
- **Perfis.** Receita padrão do sistema e receita padrão NBR 6118 (mesmo mecanismo de `perfilOpcoes`); onde divergirem, `padraoNBR` na regra.
- **Nada entra sem prévia.** A execução devolve uma proposta (variantes, diff, métricas); aplicar é um comando composto, um passo no histórico, desfazível.
- **Comandos** `mcp: false`, com schema, `validar`, mensagem e exemplo em `EXEMPLOS` do `commands.test.ts`; acessíveis pelas ferramentas `comandos` e `previa`; `docs/ia.md` cita os fluxos. Ferramenta MCP própria só para `metricas` (somente leitura).
- **Núcleo** em `src/core/lancamentoAuto/` (sem `window`, `document`, `localStorage` nem `navigator`); interface só com `src/app/ui` e `design/global.css`.
- **Modelo e esforço** (CLAUDE.md): núcleo novo numérico/geométrico é Sonnet alto ou Opus, validado contra casos analíticos; código que segue padrão existente pode ser Sonnet. Aceite de toda fatia: tsc, testes do cartão, `npm test`, build, e2e e baselines intactos; a frente termina com auditoria independente.

## Modelo da receita

```ts
interface Receita {
  id: string; nome: string; versao: number; baseadaEm?: { id: string; versao: number };
  perfil: 'sistema' | 'nbr';
  restricoes: {                       // duras: violar reprova a variante
    vaoMaxViga: number;               // m
    ladoMinPilar: number;             // m
    gzMax: number;                    // padrão 1,3
    exigirSemErros: boolean;          // verificar sem erro
    zonasProibidas: string[];         // camadas/regiões do gabarito (aberturas, circulação)
    tipoLaje: 'maciça' | 'nervurada' | 'ambas';
  };
  preDimensionamento: {               // A2; fórmulas de livro-texto, a confirmar
    alturaViga: { relacao: number; arredondarCm: number };   // h ≈ ℓ/relacao
    espessuraLaje: { relacao: number; minimoCm: number };
    secaoPilar: { areaPorTf: number; minimoCm: number };
  };
  etapas: Array<{
    id: 'preDimensionar' | 'gerarPilares' | 'gerarVigas' | 'definirLajes' | 'calcular' | 'corrigir' | 'ranquear';
    ligada: boolean;
    parametros: Record<string, number | string | boolean>;
    parada: boolean;                  // pede aprovação do engenheiro antes de seguir
  }>;
  correcoes: Array<{                  // código de revisão → ações a tentar, em ordem
    codigo: string;
    acoes: Array<{ comando: string; params: Record<string, unknown> }>;
    maxTentativas: number;
  }>;
  objetivo: { pesoCusto: number; pesoGz: number; pesoFlecha: number; pesoKgM3: number; nVariantes: number };
  precos: { concretoM3: number; acoKg: number; formaM2: number } | null;  // editáveis; "a confirmar"
}
```

Receita de fábrica: `RECEITA_PADRAO_SISTEMA` e `RECEITA_PADRAO_NBR` em `src/core/lancamentoAuto/receitaPadrao.ts`, com cada valor acompanhado de `fonte` e `aConfirmar`. Valores iniciais (a revisar pelo usuário antes da A2): h da viga ≈ ℓ/12 (contínua) e ℓ/10 (biapoiada); espessura da laje ≈ ℓx/40 com mínimo da NBR 6118 (13.2.4.1); pilar com lado mínimo 19 cm (NBR 6118 13.2.3, com γn) e sugestão 14 × 40 só como alternativa; vão máximo de viga 7 m; γz máximo 1,3.

## Fatias

| Fatia | Conteúdo | Classe núcleo | Depende de |
|---|---|---|---|
| A0 | **Contrato de execução e métricas.** `runId`, hash do modelo, versão do motor, perfil de normas, casos e combinações, avisos; `status` (`success`, `invalid_model`, `solver_failure`, `incomplete`, `not_converged`) em que falha do solver nunca vira aprovação. Ferramenta MCP `metricas` (somente leitura): volume de concreto, massa de aço, fôrma, γz, flecha máxima, kg/m³, contagem de erros por código. | S2 | N2 (motor estável) |
| A1 | **Custo e função objetivo.** Quantitativo único (concreto + aço + fôrma + fundação) com preços editáveis, "a confirmar" sem fonte; `custo` e `pontuacao` por variante pelos pesos da receita; memorial com os preços usados. | S2 | A0, FU |
| A2 | **Receita e executor.** Schema, validação, receitas de fábrica (sistema e NBR), pré-dimensionamento, executor determinístico que roda as etapas e o laço corrigir (aplica ações da tabela, reverifica, respeita `maxTentativas`; diagnóstico persistente vira pendência listada, nunca silenciada). Comandos `receita.definir`, `receita.duplicar`, `receita.executar`. Biblioteca da conta, snapshot na obra, exportar/importar `.statikos-receita` (versão do schema; arquivo inválido ou de versão futura recusado com mensagem). Editor na aba Edifício (lista de etapas, regras de correção, pesos, preços) e seção do memorial. | S2 (núcleo), S2 (interface) | A0, A1, L5 |
| A3 | **Gerador de candidatos sobre a máscara DXF.** Pilares (cantos, encontros de paredes, extremidades de eixos, continuidade com o pavimento adjacente, afastamento de aberturas), vigas entre pares de pilares (visibilidade, colisão, vão plausível, painéis fechados), panos de laje. Cada candidato leva origem, motivo e confiança; ambíguos viram pendência. Reaproveita `Proposta` e `lancamento.aplicar` da L2. Etapas `gerarPilares`, `gerarVigas`, `definirLajes` da receita. | Opus ou S2 alto (geometria nova), com testes em plantas de resposta conhecida | A2, L2 |
| A4 | **Variantes e ranking.** O executor gera de 3 a 10 variantes variando parâmetros da receita (passo de malha, regra de vigas principais/secundárias, sentido das lajes, seção de pilar), calcula cada uma e ordena pela pontuação; tela de comparação lado a lado (custo, γz, flecha, kg/m³, erros). Comando `lancamento.alternativas` e prévia da melhor; a IA escolhe e explica, o engenheiro aprova. | S2 | A3 |
| A5 | **Entrada IFC.** Alimenta o mesmo gerador via L3 (web-ifc), com modelo arquitetônico normalizado (objeto, origem, confiança). Só depois de A4 validada em obras reais. | S2 | A4, L3 |
| A6 | **Comparar e aprender.** `receita.comparar` roda duas receitas sobre as obras salvas e mostra custo, γz, erros e tempo. Registro das correções do engenheiro depois da receita (arquivo local, sem dados de cliente no repositório); propostas explícitas de ajuste ("em 7 de 9 obras o pilar de canto foi aumentado; mudar a regra?"); aceitar cria nova versão da receita. O aprendizado nunca altera a receita sozinho. | S2 | A4, 10+ obras salvas |

Ordem: A0 → A1 → A2 → A3 → A4; A5 e A6 depois, independentes entre si.

## Testes de aceite

- **A0:** modelo igual → hash igual; falha forçada do solver → `solver_failure` e nenhuma verificação `pass`; métricas conferidas por conta em exemplo pequeno.
- **A1:** quantitativo do exemplo de `sheets/exemplo.ts` bate com os relatórios existentes; mudar preço muda só custo e pontuação.
- **A2:** receita inválida recusada com a causa; mesma entrada e semente, mesmo resultado; laço de correção termina em `maxTentativas` e lista o que não resolveu; ida e volta de exportar/importar sem perda; baselines de regressão intactos.
- **A3:** plantas de resposta conhecida (retângulo com 4 cantos, em L, com abertura central, com pilar de continuidade): conjunto exato de pilares e vigas esperado; nenhum pilar dentro de zona proibida.
- **A4:** ranking estável com semente fixa; a variante mais barata que viola restrição dura nunca é a primeira; e2e do fluxo gabarito → variantes → aplicar → desfazer.
- **A6:** comparar a mesma receita consigo mesma dá diferença nula.

## Pendências de dados do usuário

- Preços unitários padrão (concreto, aço, fôrma): sem eles ficam editáveis e "a confirmar".
- Revisão da receita padrão (valores de livro-texto acima) antes da A2.
- Obras de referência (sem dados de cliente) para validar a A3 e alimentar a A6.
