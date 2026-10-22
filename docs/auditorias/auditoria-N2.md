# Auditoria independente da frente N2 (N2a–N2g)

Data: 22/10/2026. Branch `claude/quirky-curie-uqb7br`. Só leitura de código; nada foi alterado além deste documento.
Escopo: `docs/spec-frente-N2.md`, entregas N2 de `docs/historico-fatias.md`, itens Feito com fatia N2x nos dois checklists (102 linhas).

## Método e estado
- `npx vitest run src/core/building`: 53 arquivos passaram, 1 pulado (`prof.test.ts`, só com PERFIL=1); 569 testes passaram, 1 pulado; 161 s. Sem falha.
- Script: todo identificador entre crases e todo arquivo citado nas notas das 102 linhas Feito com N2x existe no código (nenhuma nota aponta função inexistente).
- Não reexecutado: OpenSees (`validation/opensees/*.py`). Os testes comparam com JSON de referência versionado (`integrado.test.ts:103`, `pdelta3.validacao.test.ts:19`); a conferência vale só enquanto o JSON for o do script.
- Premissas: as 20 entradas `n2*` existem em `premissas.ts` (linhas 30–32, 76–87, 99–105), saem no memorial (`MemorialEdificio.tsx:652`) e cada opção nova tem classe de recálculo (teste de `rearmar.test.ts`). Os pontos fracos estão na tabela abaixo.

## Achados
Nenhum bloqueante. O que se aproxima disso é o item 1 (resultado numérico sem causa isolada).

| # | Gravidade | Fatia / item | Evidência | Proposta |
|---|---|---|---|---|
| 1 | Importante | N2b: queda de V2 Mpos −11 % e Mneg −7,6 % com `modeloGlobal`=1, causa "não isolada" | `integrado.test.ts:57` (só o limite de vigas rígidas, tol. 2 %) e `:93` (só γz, qualitativo); nenhum teste fixa a ordem de grandeza da mudança no edifício (`r70.test.ts:243` fixa `modeloGlobal: 0`). Mpos e Mneg caem juntos: com o carregamento total fixo, isso exige que a carga vá para lajes ou pilares, e não só mais engaste | Testes de limite que isolam a causa: (a) espessura da laje → 0 ⇒ integrado = separado; (b) só G, sem vento: conferir se Mpos/Mneg já caem (se sim, não é efeito do vento); (c) balanço Σ reações = carga total e M0 = pℓ²/8 ≈ Mpos + média dos Mneg, por viga. Só depois travar o valor esperado em teste de regressão |
| 2 | Importante | N2c: efeitos locais dos pilares (λ > 90, fluência, método geral) sem valor numérico conferido | `segundaOrdem.test.ts:214-243` só checa ramo (`metodo`), `> 0`, `isFinite`; `metodoGeral.test.ts:24` ("pico abaixo do resistente") é qualitativo; só o caso elástico 1/(1−N/Ncr) é exato (`metodoGeral.test.ts:9`). e_cc (15.8.4, `Ne = 10·Eci·Ic/ℓe²`) e `util` do método geral nunca são comparados a cálculo manual | Um pilar 20×40 com λ ≈ 110: e_cc, Md,tot e taxa por mão (planilha no teste) e um caso 140 < λ ≤ 200 contra solução independente (integração em Python ou OpenSees fibra) |
| 3 | Importante | N2c: padrão do sistema `pilarLancesDesligados` = 1 reprova pilares do térreo do edifício de exemplo | `opcoes.ts:654` (padrão 1); r70 e baselines fixam 0 (`r70.test.ts:243`, `ANTES_N2E`), então nenhum teste cobre o comportamento que o usuário verá no padrão. Histórico já registra "pilares de baixo deixam de atender" | Decidir antes do fechamento: ou o padrão passa a 0, ou o exemplo ganha vigas/lajes no térreo. Teste do edifício de 10 pav. no padrão atual, com o resultado esperado explícito (quem não atende e por quê) |
| 4 | Importante | N2d: Wp de borda e canto "≈ metade da fórmula" (pendência registrada) sem teste que registre a razão | `pendencias-usuario.md:48`; `puncao.test.ts:58-72`: perpendicular à borda compara com integração manual (0,56266), só a direção paralela com a fórmula fechada da NBR; a fórmula na outra direção dá cerca de 1,09 com d = 0,20 (razão ≈ 0,52). O sentido é conservador (Wp menor ⇒ τ maior), mas K de borda/canto (`fatoresK`, `puncao.ts:217`) também é do app. K1.13.2.4-2 está Feito | Teste que grave a razão numérica/fórmula para borda e canto, com o texto "conservador, pendente da norma"; pedir ao usuário a página 19.5.2.3 (já em `pendencias-usuario.md`); K1.13.2.4-2 → Parcial até lá |
| 5 | Importante | N2g: fogo apoiado em fontes secundárias e incompleto; C4.44 Feito | `fogoTabelas.ts:3-15`: tabelas de 2004 de cópia de terceiros; monografia e artigo de congresso para a edição de 2012; não transcritas as tabelas gerais de pilares (2012), lajes e vigas de 180 min; `fogo.ts` não avalia pilar quando as combinações determinantes levam vento (nota do histórico). `pendencias-usuario.md:11,35` ainda diz "ainda sem código" (desatualizado) | C4.44, K1.5.15, K1.9.23 e C10.6 → Parcial; corrigir `pendencias-usuario.md`; fogo de pilar com vento: avaliar, ou emitir aviso explícito por pilar (hoje fica fora sem destaque) |
| 6 | Importante | "A confirmar" que dependem de norma e não estão em `pendencias-usuario.md` | (a) 1,1·σcd do método geral (`metodoGeral.ts:53`, `[a confirmar]`); (b) φ = 2,5 da fluência (`opcoes.ts:656`, Tabela 8.2 não consultada); (c) ΔM = R·t/8 e o item 14.6.3 (`apoios.ts:16`, premissa `n2e-apoios`: divisor e item não conferidos com o texto); (d) ξ com 30 d/mês (`flechas.ts:72`); (e) linhas de empuxo e ações indiretas de `GAMA_ORIGEM` (`acoes.ts:76`; só "0,9/1,4 e 1,4" estão listados) | Acrescentar as 5 linhas em `pendencias-usuario.md` (tabela NBR 6118:2023/8681) com arquivo e valor provisório |
| 7 | Menor | N2f: 1,98 × 1,965 aceito com tolerância 0,02 | `flechasEtapas.test.ts:56-58`: a função dá 1,981 (λ 0,940) e o exemplo registra 1,965 (λ "0,93"); diferença de 0,8 % atribuída a arredondamento do texto, sem prova. K1.15.4-22 está Feito | Reproduzir o 0,93 (ρ′ ou ξ da referência) ou marcar Parcial com a diferença escrita; não aumentar a tolerância |
| 8 | Menor | N2a: ábacos de Ca vazios | `abacosVento.ts` (tabelas vazias); Ca 1,3 vale. Itens K1.5.23, K1.5.27, K1.5.29 corretamente Parcial; teste só com ponto fabricado (`acoes.test.ts:451-487`) | Nada no código; depende dos pontos do usuário (já pendente) |
| 9 | Menor | Desempenho e suíte | `desempenho.test.ts` (13 pav. ≤ 3 s, escalado pela carga) esteve no limite (3,19 s × 3,10 s); suíte do `building` leva 161 s; P-Δ de 13 pav. ≈ +1,1 a 2,6 s | Registrar orçamento por teste; mover o de desempenho para o e2e/CI dedicado se voltar a oscilar |
| 10 | Menor | N2e: X4 (vibração de piso) fora da fatia | Histórico N2e: "X4 não entrou"; está em `checklist-extras.md` | Conferir que X4 não aparece como Feito em nenhum checklist (não aparece nos 102 itens verificados) |

## Itens marcados Feito que deveriam ser Parcial
| Item | Motivo |
|---|---|
| C4.44 (checklist do usuário) | Pilar ao fogo: método tabular só de 2004 (até 120 min) e analítico da 2012 a partir de fonte secundária; sem avaliação quando o vento é determinante (achado 5) |
| K1.5.15 e C10.6 | Verificação de fogo opcional: tabelas de lajes e vigas só 2004; 180 min fora (achado 5) |
| K1.9.23 | Incêndio por grupo/elemento: TRRF sugerido por IT estadual (CBMMG), não pela NBR 14432 (`fogoTabelas.ts`, fonte [D]) |
| K1.13.2.4-2 | Tensão de punção de borda e canto depende do Wp e do K sem confirmação (achado 4) |
| K1.15.4-22 | Valor registrado 1,965·δi; a função dá 1,981·δi (achado 7) |
| Itens do método geral e da fluência do pilar (λ > 90; ex.: K1.9.36, K1.9.37 se citarem esses ramos) | Sem teste numérico do e_cc e do método geral no pilar (achado 2); manter Feito só se o texto da nota se limitar ao que o teste cobre |

Observação: K1.15.4-13 e K1.14-8 usam a NBR 6118 no lugar da fórmula do manual de referência; isso é permitido pela regra de 20/10/2026 ("NBR onde é exigência") e a nota já diz; não é rebaixamento.

## As 3 correções mais importantes
1. **Isolar a causa da queda de 8–11 % nos momentos das vigas (N2b, achado 1).** Os limites (laje de espessura nula, só G, equilíbrio de reações e de M0 por viga) separam efeito físico de erro de acoplamento antes de o modelo integrado ser o padrão do sistema. Hoje a única prova é "vigas rígidas ≈ separado" e a igualdade com o OpenSees na mesma discretização, que valida a mecânica, não a escolha de acoplar tudo.
2. **Cobrir com número os efeitos locais dos pilares e decidir o padrão dos lances desligados (N2c, achados 2 e 3).** e_cc, pilar-padrão com fluência e método geral precisam de uma conta manual no teste; e o padrão `pilarLancesDesligados`=1 muda o veredito do exemplo sem que nenhum teste o exercite.
3. **Corrigir o estado declarado de fogo e punção (achados 4–6).** Rebaixar para Parcial os itens do quadro acima, atualizar `pendencias-usuario.md` (fogo "sem código" desatualizado; 5 premissas de norma ausentes) e gravar em teste a razão do Wp de borda/canto, para que a pendência do usuário feche com um número, não com uma frase.
