# Memória de cálculo detalhada (frente MD)

Pedido do usuário (24/10/2026): registro completo, em linguagem matemática/estrutural, de todas as etapas do cálculo, do início ao fim, com todos os dados, exportável, para conferência fora do programa. Não substitui o memorial de entrega (ordem TQS/ABECE), que continua.

## Arquitetura

**Registrador por contexto, opt-in** (`src/core/memoria/registrador.ts`):
- `memoriaAtiva()` devolve o registrador em uso ou `null` (padrão). `comMemoria(reg, fn)` liga só durante `fn` e restaura no `finally`.
- As funções de cálculo **não mudam de assinatura**: consultam `memoriaAtiva()` uma vez e só registram (e só refazem contas auxiliares) quando há registrador e o elemento passa no filtro (`reg.aceita(elemento)`). Desligada, o custo é uma comparação com `null` por elemento e o vetor de origem das estações não é criado.
- Cada passo (`PassoMemoria`): `id` sequencial, `etapa` (`cargas | combinacoes | analise | esforcos | dimensionamento | detalhamento`), `elemento`, `topico`, `descricao`, `formula` simbólica, `expressao` com valores substituídos (texto, 4 algarismos significativos, vírgula decimal), `resultado`, `unidade`, `norma` (item; `aConfirmar` quando a numeração ou o critério não foi conferido) e `entradas` com os **números exatos** usados (double, sem arredondamento).
- Regra de exatidão: o registro usa as variáveis do próprio cálculo; quando precisa de um intermediário que o cálculo não guarda (x da linha neutra, σs, MRd da seção), chama a mesma função determinística com os mesmos argumentos. O teste refaz as contas a partir das `entradas` e compara com o resultado do dimensionamento (erro relativo ≤ 1e-9) e confere que o dimensionamento com a memória ligada é idêntico (`toEqual`) ao desligado.
- Orquestração (`src/core/memoria/edificio.ts`): `memoriaDetalhada(b, { an?, elementos? })` registra os passos globais (casos e totais, vento, combinações com os coeficientes, modelo, γz, equilíbrio e deslocamentos) e refaz `dimensionarEdificio` com o registrador ligado (a análise é reaproveitada).

**Saídas**:
- HTML imprimível (`html.ts`, classes do papel `memorial.css`): índice por etapa e por elemento, tabelas por tópico (passo, descrição, fórmula e valores, resultado, unidade, referência).
- JSON (memória inteira) e CSV (um passo por linha, `entradas` em JSON).
- Dados da análise (`dadosAnalise.ts`): CSV (`;`, ponto decimal, número completo) e JSON de nós, barras (propriedades, trechos rígidos, liberações), seções, materiais, apoios, molas, diafragma, cargas por caso, combinações com coeficientes, deslocamentos, reações e esforços por caso e por combinação; ZIP com `src/core/zip.ts`.
- OpenSees (`opensees.ts`): script openseespy do pórtico espacial no padrão de `validation/opensees/*.py` (elasticBeamColumn/ElasticTimoshenkoBeam, `-jntOffset`, `-releasey/-releasez`, `rigidDiaphragm`, molas em zeroLength, cargas nodais, `-beamUniform` e `-beamPoint`), um caso por vez, gravando deslocamentos e reações em JSON. No modelo integrado (lajes condensadas em superelementos) exporta o modelo cheio equivalente com os casos da obra. O que não tem equivalente (liberação de torção, engaste parcial, momento concentrado na barra, cascas) sai como aviso no script e no resultado.
- Interface: botão "Memória de cálculo detalhada" ao lado de "Memorial do edifício" (aba Dimensionamento); MCP: recursos `statikos://memoria`, `statikos://memoria/{elemento}`, `statikos://dados-analise` e `statikos://opensees` (o limite de 40 ferramentas não comporta uma ferramenta nova).

## Fase 1 (feita)

Núcleo do registrador; cadeia piloto completa no módulo Edifícios:
- **Viga de concreto**: materiais (fcd, σcd, fctm, fctd, fyd, fywd), alturas úteis; combinação determinante de M+, M− e V com Σ γ·Sk por caso na estação e o acréscimo da redistribuição δ; flexão 17.2 (x,lim, linha neutra, domínio, C, As, armadura dupla, Md,mín, As,mín, As,máx); barras adotadas; cortante modelo I (αv2, VRd2, Vc, Asw/s, Asw,mín, smáx, estribo adotado, decalagem aℓ); ancoragem (fbd, lb, ancoragem no apoio extremo); fissuração (estádio II, σs, ρr, w1, w2, wk); flecha (Ecs, Mr, III, flechas imediatas integradas, αf, etapas de carga com Δξ por etapa, total e variável).
- **Pilar** (por lance): Ac, raios de giração, ℓe, λ, γn, método local por direção, e_cc; Nd com Σ γ·Nk por caso; momentos de 1ª ordem; pilar-padrão por direção (M1d,mín, αb, λ1, ν, 1/r, M2d, Md,tot; método geral); flexão oblíqua por fibras (MRd na direção do momento, utilização S1/S2); As,mín, As,máx, armadura adotada; cortante (VRd2, Vc) e estribo.
- Exportação dos dados da análise e do script OpenSees, comparado no teste (`src/core/memoria/memoria.test.ts`) com o Statikos (deslocamentos e reações, erro relativo < 1e-6) quando o openseespy existe.

## Fase 2 (feita)

Lajes maciças (`src/core/memoria/lajeMacica.ts`), um elemento por laje ("Laje L1"; se a grelha do pavimento difere, "Laje L1 · Tipo 2"):
- **Cargas** por pano (pp = γc·h, revestimento, q, pd) e geometria (vãos); materiais e alturas úteis.
- **Esforços**: fatores ELU por caso; momentos por metro da grelha: com Wood-Armer, nó que dá cada extremo (mx, my e |mxy| = média das barras na faixa de 1 m, cada um com a decomposição por caso, e m* pelas fórmulas de Wood-Armer); sem Wood-Armer, barra e ponta. Momento mínimo p·ℓ²/x (opção) e momento de dimensionamento.
- **Dimensionamento**: flexão por face e direção (linha neutra, domínio, C, As), As,mín (ρmín·h), armadura necessária; fissuração (momento frequente refeito com a mesma decomposição, barras da verificação, aumento de 10 % por passo, estádio II, σs, ρr, w1, w2, wk); cortante sem armadura (VSd por caso, ρ1, VRd1, VRd2) e com armadura (Vc, Asw); flecha (elástica da grelha, Branson da barra mais fissurada, κ = δ fissurada/δ elástica, inércia média do vão, fluência, etapas de carga ou fator simplificado, ativa e variável com limites).
- **Detalhamento**: barras pela tabela de armadura, positivas adotadas por direção e negativos sobre as bordas (armadura, ancoragem lb,nec, comprimento de cada lado: cap, % do vão, bw/2 + 10φ, diagrama decalado + ancoragem; comprimento desenvolvido da barra).
- Teste `lajes.test.ts` (exatidão a 1e-9 contra o dimensionamento, `toEqual` com a memória ligada, cobertura dos ramos) e e2e `MD2`. Fora do escopo desta fase: lajes inclinadas (aviso na primeira cargas), nervuradas/vigotas/alveolares (MD3), punção (MD4); os esforços das cargas lineares e paredes sobre a laje entram na grelha como casos (decomposição por caso).

## Fase 3 (parte 1 feita)

- **Nervuradas bidirecionais** (`src/core/memoria/nervurada.ts`, um elemento por laje, "Laje N1"): base (peso, seção da nervura, mesa mínima, regime de cisalhamento pelo intereixo: ≤ 65 cm laje; ≤ 90 cm com bw ≥ 12 cm laje; ≤ 110 cm viga; acima, mesa como laje maciça), materiais e alturas úteis, fatores ELU e frequente por caso; por nervura: esforços e uniformização do grupo, flexão positiva em T (reaproveita `flexao`: linha neutra na mesa ou na alma), mínimo, concentração, base, barras e largura mínima, fissuração (reaproveita `passosFissuracao`), Mu; negativos por ponta (retângulo, maciça no apoio = intereixo; fissuração do negativo; comprimento); trechos sobre ábacos (banda maciça, reforço descontada a base, borda, comprimento, VRd1/VRd2 e estribos da banda); cortante a cada 0,75·d por regime; mesa (carga, Md, mínimo, barras, malha considerada e complemento); zona maciça por Wood-Armer (mínimos da Tabela 19.1, flexão por face e direção, malha, complemento); quantitativo de aço por posição.
- **Vigotas treliçadas** (`src/core/memoria/vigotas.ts`): base (treliça e banzo equivalente no aço adicional, capa mínima, As,mín, materiais), por grupo de igualação (esforços do grupo, redistribuição δ, flexão em T, adicional, negativos com MRd da nervura e da faixa maciça, ancoragem e comprimento, cortante VRd1/VRd2, maciçamento), montagem sobre escoras (f = 5qL⁴/384EI sem escora; três momentos com escoras), distribuição na capa e aço.
- Testes `nervuradas.test.ts` e `vigotas.test.ts` (contas refeitas das entradas a 1e-9; a linha neutra, por bisseção, a 1e-7) e e2e `MD3`.
- Fica para a continuação: vigotas por ficha (`vigotasFichas.ts`), alveolares (`alveolaresDim.ts`), flecha por alinhamento (`vigotasFlecha.ts`) e a decomposição por caso dos esforços das nervuras. A punção com ábaco (contornos C/C′/C″) é da MD4.

## Rollout (fases seguintes)

Uma fatia por frente, mesmo padrão (contexto de registro + teste de exatidão a 1e-9 + seção no HTML). Estimativas de esforço por fatia (agente Sonnet alto; Haiku só para a seção do HTML quando seguir o padrão):

| Fase | Frente | Conteúdo | Estimativa |
|---|---|---|---|
| MD2 | Lajes maciças | Wood-Armer por nó (mx, my, mxy → m*), As por metro, mínimos, fissuração, flecha (Branson na grelha, fissuração da grelha), cortante sem armadura | 1 fatia média |
| MD3 | Nervuradas e treliçadas | geometria da seção T equivalente, flexão das nervuras, cortante, flecha (Branson por alinhamento), vigotas (ficha) | 1 fatia média |
| MD4 | Punção | perímetros C, C′, C″, τSd com momentos (K), τRd1/τRd2/τRd3, armadura de punção | 1 fatia pequena |
| MD5 | Fundações | sapatas (σ, CEB-70/bielas, cisalhamento), blocos (bielas e tirantes, Blévot), estacas (Décourt-Quaresma por camada, Padm), tubulões, radier/viga em base elástica | 2 fatias (rasas; profundas) |
| MD6 | Escadas | casca espessa do lance (reações por apoio), armadura por trecho, fissuração e flecha | 1 fatia pequena |
| MD7 | Paredes e pilares-parede | esforços por lado/fatia, flexo-compressão, armadura distribuída, alvenaria estrutural | 1 fatia média |
| MD8 | Pórtico 2D | módulo de pórticos planos (esforços por combinação, dimensionamento NBR 6118/8800) com o mesmo registrador | 1 fatia média |
| MD9 | Análise (detalhe) | intermediários do γz (M1, ΔM por pavimento), P-Δ por iteração, vento por pavimento (S2, q, F), cargas das lajes nas vigas | 1 fatia pequena |

Pendências da fase 1: os esforços das cascas não entram na exportação (fase MD7); a memória da torção de vigas registra o Asw/s combinado (a decomposição por estação fica para a MD9).
