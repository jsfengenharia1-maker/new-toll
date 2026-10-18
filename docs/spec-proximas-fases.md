# Spec — próximas fases do Statikos

Data: 18/10/2026. Status: proposta, aguardando aprovação item a item.

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
- Pendentes de menor impacto: φt ≤ bw/10 e espaçamento entre ramos; cobrimento 45 mm no pilar junto à fundação; pilar-parede (b/h > 5).

## Fase A — Análise estrutural (paridade com analisadores de pórtico 2D)

### A1. Ligações semirrígidas — **feito** (18/10/2026)
- **Objetivo:** mola rotacional entre barra e nó, em cada extremidade (kθ em kN·m/rad). Hoje existe só rótula ideal ou ligação rígida, e mola apenas nos apoios.
- **Método:** a flexibilidade da extremidade entra na matriz do elemento por condensação estática, como as rótulas atuais em `element.ts`. kθ → 0 recupera a rótula e kθ → ∞ recupera a ligação rígida.
- **Interface:** na aba Estrutura, em "Rótulas", a opção "Semirrígida" com campo kθ. No desenho, um símbolo de mola na extremidade.
- **Testes:**
  - viga biengastada com kθ nas extremidades contra a fórmula fechada do fator de fixação;
  - limites kθ → 0 e kθ → ∞.
- **[confirmar]:** se o usuário quer também a rigidez secante a partir de uma curva M-θ ou só linear-elástica. A proposta é só linear-elástica.

### A2. Vínculos de deformação: barra inextensível e barra rígida
- **Objetivo:** marcar barras como axialmente indeformáveis ou totalmente rígidas (trecho rígido de ligação viga-pilar).
- **Método:** relações mestre-escravo entre gdl, ou multiplicadores de Lagrange no solver. Para barra rígida, a proposta é a transformação cinemática, que mantém a matriz positiva definida.
- **Testes:** pórtico com viga inextensível comparado com o mesmo pórtico com EA muito grande; diferença < 1e-6.

### A3. Não linearidade geométrica (2ª ordem)
- **Objetivo:** esforços de 2ª ordem globais por combinação ELU, como alternativa ao γz.
- **Método:** matriz geométrica do elemento (Kg) com N da iteração anterior. Iteração até convergência de deslocamentos (tolerância 1e-4) ou método de dois ciclos (P-Δ simplificado). Divergência sinaliza instabilidade.
- **[confirmar]:**
  - rigidez reduzida (0,4EI/0,8EI) também na análise P-Δ, conforme NBR 6118 15.7.3. Proposta: sim, a mesma do γz;
  - imperfeição geométrica global (desaprumo θ1 da NBR 6118 11.3.3.4.1) aplicada como carga horizontal equivalente. Proposta: sim, editável;
  - convergência: 30 iterações no máximo.
- **Saída:** fator de amplificação por combinação, comparação com γz no memorial e opção "usar esforços P-Δ no dimensionamento".
- **Testes:** pilar engastado-livre com carga axial e horizontal contra a fórmula de amplificação 1/(1−P/Pcr); pórtico de livro-texto.

### A4. Flambagem global (autovalores de estabilidade)
- **Objetivo:** fatores de carga crítica e modos de flambagem por combinação.
- **Método:** problema generalizado (K + λ·Kg)·φ = 0, com N da análise linear da combinação. Resolvido por iteração inversa com deslocamento ou Lanczos, nos primeiros 3 a 5 modos.
- **Interface:** na aba Resultados, "Modos de flambagem", com λcr e desenho do modo. Opção de usar Le = π·√(EI/Ncr) por barra no dimensionamento de pilares, no lugar de L.
- **[confirmar]:** se Le obtido assim pode substituir o comprimento informado por barra. Proposta: opcional, desligado por padrão.
- **Testes:** as 4 condições de Euler; pórtico simples contra valores tabelados.

### A5. Vibração livre (modos naturais)
- **Objetivo:** frequências, modos, fatores de participação e massa modal efetiva.
- **Método:** (K − ω²·M)·φ = 0, com matriz de massa consistente do elemento.
- **[confirmar]:**
  - origem da massa: peso próprio + fração ψ2 dos casos Q (proposta: G + 0,3Q, editável), mais massas nodais adicionais;
  - matriz consistente (proposta) ou concentrada.
- **Saída:** tabela de modos; verificação de conforto de pisos (NBR 6118 23.3: f > 1,2·fcrit) como item opcional **[confirmar valores de fcrit]**.
- **Testes:** viga biapoiada (fₙ = n²π/(2L²)·√(EI/m)) e engastada-livre.

### A6. Linhas de influência de deslocamentos e reações
- **Objetivo:** completar Müller-Breslau, que hoje cobre N, V e M.
- **Método:** reação = deslocamento unitário na direção do vínculo; deslocamento = carga unitária pelo teorema de Maxwell-Betti.
- **Testes:** viga contínua de 2 vãos contra tabela de livro.

---

## Fase B — Produtividade e saída

### B1. Unidades configuráveis — **feito em parte** (18/10/2026)
- Feito: unidade de força kN, tf, kgf ou N (g = 9,80665), em entradas de carga, trem-tipo, resultados, tabelas/CSV, desenho e ligações. Fica salva no modelo.
- Comprimento continua em metros. Dimensionamento, fundações e memorial continuam em kN, m e MPa, como nas normas.
- Falta, se o usuário quiser: comprimento em cm ou mm (kgf·cm, N·mm).

Proposta original:
- Sistemas: kN·m (atual), tf·m, kgf·cm e N·mm.
- Conversão só na interface e no memorial; o núcleo continua em kN, m e rad.
- Preferência salva no arquivo de trabalho.

### B2. Transformações — **feito** (18/10/2026): copiar ou mover por translação (com cópias em série), rotação e espelhamento; leva cargas e apoios. Escalar ficou de fora.
- Copiar, espelhar, girar, escalar e repetir em série (n cópias com Δx e Δy), com cargas e apoios opcionais.
- Usar `edit.ts`, mantendo a divisão automática em interseções.

### B3. Exportação DXF
- Camadas: geometria, apoios, cargas, cada diagrama, cotas e textos.
- Escala real, em metros. Gerador próprio de DXF R12 em texto, sem dependência externa.

### B4. Exportar resultados ao longo de uma cadeia de barras
- Selecionar uma sequência de barras e gerar CSV com abscissa acumulada × N, V, M, deslocamentos e LI.

### B5. Seção genérica por polígono
- Desenhar ou colar vértices. A, I, centróide e Wsup/Winf são calculados pela fórmula de Green.
- Para concreto, o cálculo de seção por compatibilidade de deformações passa a aceitar polígono, por faixas. Isso também atende pilares em L e circulares (Fase C).

### B6. Cotas no desenho
- Cotas automáticas de vãos e níveis, e cotas manuais entre nós. Saem no SVG e no DXF.

### B7. Memorial em PDF
- Hoje é HTML + "imprimir em PDF" do navegador.
- **Proposta:** CSS `@media print` dedicado (quebras de página, cabeçalho e rodapé com paginação), sem biblioteca de PDF. Mantém o build em arquivo único.

---

## Fase C — Dimensionamento e fundações

| Item | Escopo | [confirmar] |
|---|---|---|
| C1. Blocos de coroamento | Bielas e tirantes para 1 a 6 estacas; armadura principal, de distribuição e de suspensão; verificação das bielas no pilar e na estaca | Limites de tensão nas bielas (Blévot/Fusco/NBR 6118 22.7): qual referência adotar |
| C2. Sapatas | Rígidas e flexíveis, isoladas, com momento em uma direção; tensão no solo; flexão; punção | σadm vindo de sondagem ou informado pelo usuário |
| C3. Tubulões | Fuste e base alargada; tensão admissível na base | Método de σadm por SPT |
| C4. Várias sondagens por obra | Cada apoio associado ao furo mais próximo ou escolhido | — |
| C5. Pilares circulares e em L | Via seção poligonal (B5) | — |
| C6. Fissuração (ELS-W) | wk pela NBR 6118 17.3.3 por barra de viga | Limites por CAA (Tabela 13.4) |
| C7. Perfis metálicos BR | Biblioteca com dados próprios a partir de catálogos públicos dos fabricantes | Quais fabricantes |
| C8. Pré-moldado NBR 9062 | Consolos e dentes Gerber; ligações | Escopo a definir com o usuário |

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

### D2. Funcionamento offline (PWA)
- Manifest + service worker para instalar o app e usar sem internet.
- Combina com "abrir arquivo .statikos com duplo clique" (File Handling API, Chrome).

### D3. Testes de interface no repositório
- Mover os scripts Playwright descartáveis para `e2e/`, com `npm run e2e`.
- Fluxos: desenhar → calcular → dimensionar → memorial; salvar e abrir o arquivo de trabalho.

### D4. Solver esparso
- Matriz em banda ou skyline com renumeração Cuthill-McKee, para modelos com milhares de nós.
- Requisito para A3 a A5 continuarem rápidos.

### D5. Limpeza
- Dois avisos do oxlint em `Canvas.tsx`: setState dentro de effect, e export misto que quebra o fast refresh.

---

## Ordem sugerida
1. **Primeiro:** A1 → B1 → B2 (curtos, alto uso diário).
2. **Depois:** D4 → A3 → A4 → A5 (dependem do solver e dividem a infraestrutura de autovalores).
3. **Em seguida:** B5 → C5 → C1 → C2.
4. **No meio, em paralelo:** B3, B6 e B7.
