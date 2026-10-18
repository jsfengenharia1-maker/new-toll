# Spec — próximas fases do Statikos

Data: 18/10/2026. Status: proposta, aguardando aprovação item a item (C1–C4 feitos em 18/10/2026).

Regras que valem para todos os itens:
- **Premissas visíveis.** Toda hipótese de cálculo marcada **[confirmar]** só é implementada depois do aceite do usuário. Depois disso, fica editável no app e escrita no memorial.
- **Reconstrução limpa.** Métodos de livro-texto e normas ABNT. Nenhum código, texto ou dado de programa de terceiros.
- **Cada item entrega:** função pura em `src/core/` com teste (solução analítica ou exemplo publicado), interface, seção no memorial e entrada no README.
- **Critério de aceite geral:** `npm test`, `tsc` e build limpos. O fluxo novo é verificado no navegador com Playwright.

A ordem segue o ganho por esforço. Cada fase pode ser entregue sozinha.

---

## Conferência NBR 6118 (18/10/2026, a partir do resumo da 6118:2014)
- Corrigido: αb de pilar em balanço; γn só nos esforços finais; combinações com grupos excludentes e principal sozinha; γz com Eci (opção Ecs); ρ' da fluência e t0 editável; Vc = 0 com seção toda tracionada; cortante em pilares; γn1 para 140 < λ ≤ 200; flecha com alvenaria (opção).
- Fundações: Nd,mín da estaca com γf = 1,0 na parcela permanente (ver Fase C).
- Avisos adicionados: φt ≤ bw/10 e espaçamento entre ramos (18.3.3.2); cobrimento 45 mm em pilar junto ao solo/fundação; pilar-parede (b/h > 5) marcado para revisão.

## Fase A — Análise estrutural (paridade com analisadores de pórtico 2D)

### A1. Ligações semirrígidas — **feito** (18/10/2026)
- **Objetivo:** mola rotacional entre barra e nó, em cada extremidade (kθ em kN·m/rad). Hoje existe só rótula ideal ou ligação rígida, e mola apenas nos apoios.
- **Método:** a flexibilidade da extremidade entra na matriz do elemento por condensação estática, como as rótulas atuais em `element.ts`. kθ → 0 recupera a rótula e kθ → ∞ recupera a ligação rígida.
- **Interface:** na aba Estrutura, em "Rótulas", a opção "Semirrígida" com campo kθ. No desenho, um símbolo de mola na extremidade.
- **Testes:**
  - viga biengastada com kθ nas extremidades contra a fórmula fechada do fator de fixação;
  - limites kθ → 0 e kθ → ∞.
- **[confirmar]:** se o usuário quer também a rigidez secante a partir de uma curva M-θ ou só linear-elástica. A proposta é só linear-elástica.

### A2. Vínculos de deformação: barra inextensível e barra rígida — **feito** (18/10/2026) por penalidade (EA e/ou EI × 10⁶) em vez de mestre-escravo; erro relativo ~10⁻⁶; barras rígidas não são dimensionadas.
- **Objetivo:** marcar barras como axialmente indeformáveis ou totalmente rígidas (trecho rígido de ligação viga-pilar).
- **Método:** relações mestre-escravo entre gdl, ou multiplicadores de Lagrange no solver. Para barra rígida, a proposta é a transformação cinemática, que mantém a matriz positiva definida.
- **Testes:** pórtico com viga inextensível comparado com o mesmo pórtico com EA muito grande; diferença < 1e-6.

### A3. Não linearidade geométrica (2ª ordem) — **feito** (18/10/2026): P-Δ iterativo com matriz geométrica consistente, rigidez reduzida 0,4/0,8·Eci·Ic (opção Ecs), desaprumo θa com a regra dos 30% do vento, máx. 30 iterações; opção em Dimensionar › Premissas. P-δ local fica no pilar-padrão.
- **Objetivo:** esforços de 2ª ordem globais por combinação ELU, como alternativa ao γz.
- **Método:** matriz geométrica do elemento (Kg) com N da iteração anterior. Iteração até convergência de deslocamentos (tolerância 1e-4) ou método de dois ciclos (P-Δ simplificado). Divergência sinaliza instabilidade.
- **[confirmar]:**
  - rigidez reduzida (0,4EI/0,8EI) também na análise P-Δ, conforme NBR 6118 15.7.3. Proposta: sim, a mesma do γz;
  - imperfeição geométrica global (desaprumo θ1 da NBR 6118 11.3.3.4.1) aplicada como carga horizontal equivalente. Proposta: sim, editável;
  - convergência: 30 iterações no máximo.
- **Saída:** fator de amplificação por combinação, comparação com γz no memorial e opção "usar esforços P-Δ no dimensionamento".
- **Testes:** pilar engastado-livre com carga axial e horizontal contra a fórmula de amplificação 1/(1−P/Pcr); pórtico de livro-texto.

### A4. Flambagem global — **feito** (18/10/2026): iteração em subespaço sobre (K + λ·K_G)φ = 0, até 4 modos, desenho do modo. Uso de Le = π√(EI/Ncr) no dimensionamento não foi implementado (opcional na proposta).
- **Objetivo:** fatores de carga crítica e modos de flambagem por combinação.
- **Método:** problema generalizado (K + λ·Kg)·φ = 0, com N da análise linear da combinação. Resolvido por iteração inversa com deslocamento ou Lanczos, nos primeiros 3 a 5 modos.
- **Interface:** na aba Resultados, "Modos de flambagem", com λcr e desenho do modo. Opção de usar Le = π·√(EI/Ncr) por barra no dimensionamento de pilares, no lugar de L.
- **[confirmar]:** se Le obtido assim pode substituir o comprimento informado por barra. Proposta: opcional, desligado por padrão.
- **Testes:** as 4 condições de Euler; pórtico simples contra valores tabelados.

### A5. Vibração livre — **feito** (18/10/2026): massas concentradas G + ψ2·Q (pela combinação quase permanente) / g, 6 modos, frequência, período e massa modal efetiva X/Y. Matriz de massa consistente e verificação de conforto de pisos (fcrit) ficaram de fora.
- **Objetivo:** frequências, modos, fatores de participação e massa modal efetiva.
- **Método:** (K − ω²·M)·φ = 0, com matriz de massa consistente do elemento.
- **[confirmar]:**
  - origem da massa: peso próprio + fração ψ2 dos casos Q (proposta: G + 0,3Q, editável), mais massas nodais adicionais;
  - matriz consistente (proposta) ou concentrada.
- **Saída:** tabela de modos; verificação de conforto de pisos (NBR 6118 23.3: f > 1,2·fcrit) como item opcional **[confirmar valores de fcrit]**.
- **Testes:** viga biapoiada (fₙ = n²π/(2L²)·√(EI/m)) e engastada-livre.

### A6. Linhas de influência de deslocamentos e reações — **feito** (18/10/2026): reação por recalque unitário (Müller-Breslau/Betti) e deslocamento por Maxwell-Betti, com trem-tipo e soma do estático; envoltória em toda a estrutura continua só para esforços.
- **Objetivo:** completar Müller-Breslau, que hoje cobre N, V e M.
- **Método:** reação = deslocamento unitário na direção do vínculo; deslocamento = carga unitária pelo teorema de Maxwell-Betti.
- **Testes:** viga contínua de 2 vãos contra tabela de livro.

---

## Fase B — Produtividade e saída

### B1. Unidades configuráveis — **feito** (18/10/2026)
- Feito: unidade de força kN, tf, kgf ou N (g = 9,80665), em entradas de carga, trem-tipo, resultados, tabelas/CSV, desenho e ligações. Fica salva no modelo.
- Comprimento continua em metros. Dimensionamento, fundações e memorial continuam em kN, m e MPa, como nas normas.
- Feito também: comprimento em m, cm ou mm (geometria, coordenadas, transformações, LI e trem-tipo; q e M convertidos, ex.: kgf·cm, N·mm).

Proposta original:
- Sistemas: kN·m (atual), tf·m, kgf·cm e N·mm.
- Conversão só na interface e no memorial; o núcleo continua em kN, m e rad.
- Preferência salva no arquivo de trabalho.

### B2. Transformações — **feito** (18/10/2026): copiar ou mover por translação (com cópias em série), rotação e espelhamento; leva cargas e apoios; escalar (mover ou copiar) a partir de um ponto base.
- Copiar, espelhar, girar, escalar e repetir em série (n cópias com Δx e Δy), com cargas e apoios opcionais.
- Usar `edit.ts`, mantendo a divisão automática em interseções.

### B3. Exportação DXF — **feito** (18/10/2026)
- Feito: Arquivo › Desenho DXF (CAD). Gerador próprio de DXF R12 (AC1009) em texto (`src/app/dxf.ts`, com teste), escala real em metros nas coordenadas do modelo. Camadas GEOMETRIA (barras e numeração), NOS, APOIOS (símbolos em linhas), ROTULAS (círculos; ligação semirrígida com k), CARGAS (caso ativo, setas e valores na unidade de exibição), COTAS, TEXTOS (identificação e escala de cada diagrama) e DIAG_N, DIAG_V, DIAG_M, DEFORMADA do resultado ativo, com a mesma escala relativa e convenção do Canvas e valores nos extremos e máximos.
- Ficou de fora: `$INSUNITS` (não existe no R12; as unidades vão escritas na camada TEXTOS), acentos e símbolos (o R12 não tem UTF-8: textos saem em ASCII, com %%p e %%d), hachura dos diagramas, reações e cargas de mais de um caso no mesmo arquivo.

Proposta original:
- Camadas: geometria, apoios, cargas, cada diagrama, cotas e textos.
- Escala real, em metros. Gerador próprio de DXF R12 em texto, sem dependência externa.

### B4. Exportar resultados ao longo de uma cadeia de barras — **feito** (18/10/2026)
- Feito: botão "CSV ao longo do caminho" na aba Resultados (`src/app/pathTable.ts`, com teste). Usa as barras selecionadas em cadeia contínua; sem seleção, o caminho do trem-tipo ou as barras horizontais mais altas. Colunas: s acumulado (m), barra, x local, N, V, M (unidade de exibição), δx, δy (mm); em envoltória, máximos e mínimos de N, V e M. Amostra em 10 divisões por barra mais os pontos de momento extremo. M segue o sentido do caminho (barra percorrida de j para i tem o sinal trocado).
- Ficou de fora: ordenadas de LI no mesmo CSV e deslocamentos em envoltórias.

Proposta original:
- Selecionar uma sequência de barras e gerar CSV com abscissa acumulada × N, V, M, deslocamentos e LI.

### B5. Seção genérica por polígono — **feito** (18/10/2026): vértices em cm ou gerador de L; propriedades por Green; ELU por fibras com flexão oblíqua real (fiber.ts).
- Desenhar ou colar vértices. A, I, centróide e Wsup/Winf são calculados pela fórmula de Green.
- Para concreto, o cálculo de seção por compatibilidade de deformações passa a aceitar polígono, por faixas. Isso também atende pilares em L e circulares (Fase C).

### B6. Cotas no desenho — **feito em parte** (18/10/2026)
- Feito: cotas automáticas (`src/app/dims.ts`, com teste). Vãos entre nós de apoio, nós de pilares e extremidades da estrutura, abaixo do nó mais baixo, mais a cota total; níveis distintos dos nós à esquerda, com marcação de nível (±0,00, +5,00) e altura total. Toggle "Cotas" na barra de status; saem no Canvas, no SVG exportado e no DXF (camada COTAS, sempre).
- Ficou de fora: cotas manuais entre nós.

Proposta original:
- Cotas automáticas de vãos e níveis, e cotas manuais entre nós. Saem no SVG e no DXF.

### B7. Memorial em PDF — **feito** (18/10/2026)
- Feito: CSS de impressão dedicado no memorial (também no HTML exportado). `@page` A4 com margens de 20/15/18/20 mm, cabeçalho com o nome do modelo e a obra, rodapé com revisão, data e "Página n de N" (caixas de margem do `@page`); quebra de página antes de Modelo estrutural, Ações, Resultados, Dimensionamento e Fundações profundas; sem quebra dentro de figuras, tabelas, fórmulas e quadros; cabeçalho de tabela repetido. Botão "Imprimir / PDF" abre a impressão só com o memorial (iframe oculto); Ctrl+P com o memorial aberto também imprime só o memorial.
- Ficou de fora: cabeçalho e paginação no Firefox (não implementa as caixas de margem do `@page`; o conteúdo sai certo, sem cabeçalho e numeração). Dentro do artifact do claude.ai a impressão depende de o sandbox permitir `print()`; se não permitir, usar Exportar HTML e imprimir no navegador. O memorial do módulo Fundações não foi alterado.

Proposta original:
- Hoje é HTML + "imprimir em PDF" do navegador.
- **Proposta:** CSS `@media print` dedicado (quebras de página, cabeçalho e rodapé com paginação), sem biblioteca de PDF. Mantém o build em arquivo único.

---

## Fase C — Dimensionamento e fundações

| Item | Escopo | [confirmar] |
|---|---|---|
| C1. Blocos de coroamento — **feito** (18/10/2026) | Bielas e tirantes para 1 a 6 estacas; armadura principal, de distribuição e de suspensão; verificação das bielas no pilar e na estaca | Limites de tensão nas bielas (Blévot/Fusco/NBR 6118 22.7): qual referência adotar |
| C2. Sapatas — **feito** (18/10/2026) | Rígidas e flexíveis, isoladas, com momento em uma direção; tensão no solo; flexão; punção | σadm vindo de sondagem ou informado pelo usuário |
| C3. Tubulões — **feito** (18/10/2026) | Fuste e base alargada; tensão admissível na base | Método de σadm por SPT |
| C4. Várias sondagens por obra — **feito** (18/10/2026) | Cada apoio associado ao furo mais próximo ou escolhido | — |
| C5. Pilares circulares e em L — **feito** (18/10/2026) | Fibras com linha neutra inclinada; mín. 6 barras na circular; esbeltez pelos eixos centroidais | Cortante em circular com bw = D, d = 0,8·D (a confirmar); cortante de seção poligonal não verificado |
| C6. Fissuração (ELS-W) — **feito** (18/10/2026) | wk por face de viga na combinação frequente, σs no estádio II (αe = 15) | Acr = bw·mín(h − d + 7,5φ, h/2), a confirmar |
| C7. Perfis metálicos BR — **feito** (18/10/2026) | Ver abaixo | Conferir propriedades com o catálogo do fabricante |
| C8. Pré-moldado NBR 9062 — **não iniciado** | Consolos e dentes Gerber; ligações | Escopo a definir com o usuário |

### C1–C4 — o que foi feito (18/10/2026)
- **Correção prévia (estacas):** Nd,mín = 1,0·(Gk + Wb)/n − 1,4·[(Gk − Nk,mín)/n + ΔN]; Td = máx(0, −Nd,mín). Gk (soma dos casos G) vem do pórtico no novo campo "N perm"; sem ele, Gk = Nk (a favor da segurança). γf editáveis.
- **C1 (`src/core/caps.ts`):** bloco rígido sobre 1 a 6 estacas nas disposições de `blockCoords`. Biela parte do centróide da parte da seção do pilar voltada para cada estaca; d entre os limites de 45° e 55° e ≥ lb das barras do pilar; tirantes sobre as estacas por equilíbrio dos nós (estaca mais carregada em todas); malha (20%), armadura superior, pele e estribos no bloco de 2 estacas, suspensão para s > 3D; tensões nas bielas junto ao pilar e à estaca contra K·KR·fcd; bloco de 1 estaca por fendilhamento. Croqui em planta e corte.
- **C2 (`src/core/footings.ts`):** planta em passos de 5 cm pela menor área com balanços iguais; base sem tração (núcleo central ou equilíbrio com área comprimida, uni e biaxial); σmáx ≤ σadm e área comprimida ≥ 2/3; rígida h ≥ (a − ap)/3 e lb; flexível pela punção; flexão CEB-70 (padrão) ou bielas; punção em C e C′; peso próprio = máx(5% de Nk; concreto calculado).
- **C3 (`src/core/caissons.ts`):** fuste de concreto simples (0,85·fck/γc), base alargada por σadm na base, H = 0,866·(Db − Df) + rodapé de 20 cm, base acima do NA, cota automática pelo menor volume ou informada.
- **C4:** `borings[]` no modelo (o antigo `boring` continua como o primeiro furo, retrocompatível); cada apoio escolhe o furo ou usa o mais próximo pelas coordenadas.
- **Interface e memorial:** tipo de fundação, furo, pilar e coordenadas por apoio; "Adotar esta estaca" para o bloco; grupos de premissas com selos "a confirmar"; capítulo de fundações do memorial com fórmulas, croquis e a lista de premissas a confirmar.

**Ficou de fora:** blocos sobre mais de 6 estacas e blocos com pilares excêntricos; chanfros do bloco de 3 estacas (contorno retangular envolvente); verificação do peso real do bloco na distribuição de cargas (só aviso); cisalhamento unidirecional e ancoragem das barras de sapatas; sapatas associadas e de divisa; recalques e efeito de grupo; carga horizontal e armadura de topo do tubulão; tubulão a ar comprimido; detalhamento final (comprimentos, dobras, emendas e quantitativos).

### C7. Perfis metálicos BR — **feito** (18/10/2026)
- Feito: `src/core/profiles.ts` (com teste). Perfis I laminados de abas paralelas W150×13,0 a W610×174,0 e HP200×53,0 a HP310×125,0 (série métrica ASTM A6 usual no Brasil), tubos circulares Ø33,4 a Ø323,8 (diâmetros e espessuras nominais ASME B36.10, Sch 40/80) e tubos quadrados/retangulares 50×50 a 300×200 em medidas comerciais usuais. Só as dimensões nominais (d, bf, tw, tf; D, t; h, b, t) estão registradas; A, I, Z, W, r, J e Cw são calculados pela geometria em `section.ts`/`steel.ts`. Na aba Estrutura › Seções, "Perfil de catálogo" (família + perfil) cria a seção (ou reaproveita) e aplica às barras selecionadas, avisando quando o material não é aço estrutural. A seção guarda a designação (`catalog`); editar as dimensões remove a marca. Massa linear pela geometria (ρ = 7850 kg/m³) no painel.
- Premissa visível (app e memorial): "propriedades calculadas pela geometria nominal, sem raio de concordância (a confirmar com o catálogo do fabricante)". Tubos retangulares com cantos vivos e espessura uniforme.
- Teste: A e Ix de W310×38,7, HP310×125,0, W610×174,0, Ø114,3×6,02 e TR 200×100×6,3 contra as fórmulas fechadas; massa geométrica entre 90 % e 102 % da massa da designação em todos os W/HP (confere os dados digitados).
- Ficou de fora: perfis soldados (CS, CVS, VS), cantoneiras, U e perfis formados a frio; perfil girado (eixo fraco no plano); propriedades de catálogo com concordância.

---

## Fase D — Plataforma

### D1. Publicação web (feito nesta etapa)
- `netlify.toml`: roda testes, gera build e publica `dist/`. O site é estático; todo o cálculo roda no navegador.
- **Arquivo de trabalho `.statikos`:**
  - conteúdo: modelo atual, biblioteca e histórico, em JSON;
  - Ctrl+S salva. No Chrome/Edge, grava sempre no mesmo arquivo (File System Access API); nos demais navegadores, baixa o arquivo;
  - Ctrl+O abre. Ao abrir, a biblioteca e o histórico do arquivo se juntam aos do navegador, e o registro mais recente prevalece;
  - o botão "Salvar" na barra superior marca "●" quando há alterações não gravadas no computador.
- **Histórico:** registra novo modelo, abrir, salvar, biblioteca, características e memorial. Até 1000 eventos, visíveis na Biblioteca.

### D2. Funcionamento offline (PWA) — **feito** (18/10/2026)
- Feito: `public/manifest.webmanifest` (nome "Statikos", ícones SVG/PNG próprios de 192 e 512 px e maskable, `file_handlers` para `.statikos`) e `public/sw.js` com estratégia rede primeiro: a página vem sempre da rede quando há conexão (novas publicações aparecem na hora) e a cópia em cache só é usada sem rede ou com rede lenta (> 6 s). Fontes do Google em cache à parte. O Vite copia `public/` para `dist/`, ao lado do `index.html` único.
- Registro do service worker em `src/main.tsx` só no build, em https ou localhost e fora de iframe (no artifact do claude.ai não registra).
- File Handling API: com o app instalado no Chrome/Edge (desktop), duplo clique num `.statikos` abre o trabalho pela mesma rotina de Arquivo › Abrir (`window.launchQueue`), e Ctrl+S grava de volta no mesmo arquivo.
- `netlify.toml`: `Cache-Control: no-cache` em `/`, `/index.html`, `/sw.js` e no manifest (este também com `Content-Type: application/manifest+json`).
- Limitações: Firefox e Safari não têm File Handling API (lá o arquivo abre por Arquivo › Abrir); a primeira visita precisa de internet; sem rede, as fontes só aparecem se já estiverem em cache (senão, fonte do sistema). O ícone `favicon.svg` substituiu o do modelo do Vite, e o `icons.svg` não usado foi removido.

Proposta original:
- Manifest + service worker para instalar o app e usar sem internet.
- Combina com "abrir arquivo .statikos com duplo clique" (File Handling API, Chrome).

### D3. Testes de interface no repositório — **feito** (18/10/2026)
- Feito: `e2e/run.mjs` (runner próprio sobre a lib `playwright`, já instalada; sem @playwright/test) e `e2e/flows.mjs`. `npm run e2e` faz o build, sobe `vite preview` em 127.0.0.1 numa porta livre (4200–4209, senão qualquer uma), roda os fluxos, cada um em contexto novo, e derruba o servidor. Opções: `--no-build`, `--headed` e um filtro por nome. Em falha, salva uma captura de tela e sai com código 1.
- Navegador: `PW_CHROMIUM=<caminho>`; sem a variável, o Chromium padrão do Playwright e, se não estiver instalado, /opt/pw-browsers/chromium-1194 (ambiente de nuvem).
- Fluxos (8): barra por coordenadas → engaste → carga → diagrama de momento (confere qL²/24 e −qL²/12); exemplo do pórtico → Dimensionar → Memorial; salvar no computador (download, sem File System Access API) e abrir em contexto novo conferindo o nome; Resultados › Estabilidade e vibração › Calcular modos; DXF começando por `0`/`SECTION` (depois do comentário 999 do cabeçalho) e terminando em `EOF`; perfil de catálogo; PWA (manifest, service worker e recarga sem rede); `.statikos` recebido pela `launchQueue` simulada, com Ctrl+S gravando no mesmo arquivo.
- Fora do `npm test` (o vitest ignora `e2e/`) e do build do Netlify.

Proposta original:
- Mover os scripts Playwright descartáveis para `e2e/`, com `npm run e2e`.
- Fluxos: desenhar → calcular → dimensionar → memorial; salvar e abrir o arquivo de trabalho.

### D4. Solver esparso — **feito** (18/10/2026): K esparsa por linhas, renumeração Cuthill-McKee reversa e LDLᵀ em banda; pórtico de 961 nós/1830 barras em ~0,4 s.
- Matriz em banda ou skyline com renumeração Cuthill-McKee, para modelos com milhares de nós.
- Requisito para A3 a A5 continuarem rápidos.

### D5. Limpeza — **feito** (18/10/2026): `npm run lint` sem avisos; componentes criados durante a renderização e chamadas impuras corrigidos; regras de fast refresh e de sincronização de estado local desligadas no .oxlintrc com justificativa.
- Dois avisos do oxlint em `Canvas.tsx`: setState dentro de effect, e export misto que quebra o fast refresh.

---

## Ordem sugerida
1. **Primeiro:** A1 → B1 → B2 (curtos, alto uso diário).
2. **Depois:** D4 → A3 → A4 → A5 (dependem do solver e dividem a infraestrutura de autovalores).
3. **Em seguida:** B5 → C5 → C1 → C2.
4. **No meio, em paralelo:** B3, B6 e B7.
