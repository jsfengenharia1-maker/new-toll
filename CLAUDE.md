# Statikos — contexto para o Claude Code

Web app de análise estrutural de pórticos planos 2D, com dimensionamento, fundações profundas e memorial. Nasceu de uma conversa no claude.ai (out/2026) com o objetivo de modernizar um analisador de pórticos desktop. "Statikos" é nome provisório.

## Regras do projeto
- **Reconstrução limpa.** A especificação veio só do comportamento observável do programa original (menus e funções). Nunca descompilar, copiar código, textos, ícones ou o nome do programa original. Métodos de livro-texto e normas ABNT podem ser usados livremente.
- **Premissas técnicas visíveis.** O usuário (eng. civil) não aceita premissas silenciosas: toda hipótese de cálculo nova deve ser confirmada com ele antes de implementar e ficar editável no app e escrita no memorial. Valores sem fonte confirmada devem ser marcados "a confirmar".
- **Comunicação.** Português, objetiva, sem saudações nem elogios; propor ideias factíveis de forma proativa.
- **Repositório público.** Não commitar dados de clientes ou de obras reais.
- **Branches/worktrees.** Toda nova branch ou worktree sai do `main` atualizado (`git fetch origin main && git worktree add -b <branch> ../<dir> origin/main`).
- **Plugin ECC** (`affaan-m/ECC`) habilitado em `.claude/settings.json`.

## Comandos
```bash
npm i
npm run dev      # Vite
npm test         # vitest: 228 testes (analíticos, NBR 6118, NBR 8800, fundações, exemplos, arquivo de trabalho, DXF, cotas, caminho, perfis, comandos do edifício, CLI e MCP)
npm run build    # dist/index.html único (vite-plugin-singlefile) + public/ (manifest, sw.js, ícones)
npm run e2e      # testes de interface: build + vite preview numa porta livre (4200–4209) + fluxos Playwright
npx tsc -b       # app + linha de comando (tsconfig.app.json e tsconfig.cli.json)
npm run cli      # dist-cli/statikos.mjs: linha de comando + servidor MCP (Node ≥ 20)
npm run agente   # exemplo de agente pelo MCP (docs/exemplos/agente-mcp.mjs), depois do npm run cli
```
Testes de interface em `e2e/` (`run.mjs` é um runner próprio sobre a lib `playwright`, sem @playwright/test; `flows.mjs` tem os fluxos). Ficam fora do `npm test` e do build do Netlify. Navegador: `PW_CHROMIUM=<caminho>`; sem a variável, o Chromium padrão do Playwright e, na falta dele, /opt/pw-browsers/chromium-1194 (nuvem). `npm run e2e -- --no-build <filtro>` roda só parte dos fluxos.

## Arquitetura
Veja a tabela no `README.md`. Resumo:
- `src/core/`: núcleo puro, sem React e testado.
  - `element.ts`: elemento por flexibilidade, com rótulas por condensação e ligações semirrígidas (1/k somado à flexibilidade).
  - `solver.ts`: rigidez direta (K esparsa, Cuthill-McKee reversa, LDLᵀ em banda em `math.ts`), apoio inclinado exato, molas, recalques, combinações.
  - `influence.ts`: linhas de influência por Müller-Breslau e trem-tipo.
  - `secondorder.ts`: P-Δ (matriz geométrica), flambagem global e vibração livre (iteração em subespaço).
  - `concrete.ts`: NBR 6118.
  - `fiber.ts` + `columnGeneral.ts`: seção poligonal e pilares circulares/poligonais por fibras (flexão oblíqua real).
  - `steel.ts`: NBR 8800.
  - `design.ts`: orquestra combinações, γz, verificações e cargas na fundação.
  - `piles.ts`: Décourt-Quaresma e NBR 6122; modelo de dados das fundações (furos, cargas por apoio, parâmetros).
  - `caps.ts`: blocos de coroamento (bielas e tirantes); `footings.ts`: sapatas; `caissons.ts`: tubulões; `foundation.ts`: fundação por apoio conforme o tipo.
  - `edit.ts`: operações de edição e combinações NBR 8681.
  - `profiles.ts`: perfis W/HP e tubos usuais no Brasil (só dimensões nominais; propriedades calculadas pela geometria, sem raio de concordância).
- `src/app/`: interface React + zustand (`store.ts`).
  - `Canvas.tsx`: editor SVG.
  - `panels/*`: abas Estrutura, Cargas, Resultados, Influência e Dimensionar.
  - `Fundacoes.tsx`: módulo de fundações.
  - `Memorial.tsx` + `drawing.ts`: memorial de cálculo com figuras SVG estáticas; CSS de impressão A4 e botão Imprimir / PDF.
  - `dxf.ts`: DXF R12 gerado à mão (camadas, escala real em m); `dims.ts`: cotas automáticas; `pathTable.ts`: resultados ao longo de um caminho de barras.
  - `Library.tsx` + `storage.ts`: biblioteca de projetos e características.
  - `workspace.ts` + `history.ts`: arquivo de trabalho `.statikos` (modelo + biblioteca + histórico) e histórico de atividades.
- Unidades internas: kN, m, rad (a interface converte força para tf/kgf/N e comprimento para cm/mm em `src/app/units.ts`; dimensionamento, fundações e memorial ficam em kN). E em kN/m². No cálculo de seção: MN e MPa.
- Convenções de sinal:
  - N > 0 é tração.
  - M > 0 traciona a face y− (local); o diagrama é desenhado no lado tracionado.
  - Eixo local x vai do nó i ao j; y é x girado 90°.
  - Reações seguem os eixos globais.

## Premissas confirmadas com o usuário
**Concreto e estabilidade:**
- Valores padrão: fck 30, CA-50, CAA II (cobrimento 3,0 cm), γc 1,4, γs 1,15. Todos editáveis.
- Pilares: duas verificações.
  - S1, no plano: Md,tot com pilar-padrão de curvatura aproximada.
  - S2, flexão oblíqua: momento real no plano + M1d,mín + M2d fora do plano, com α = 1,2. O comprimento de travamento fora do plano é informado por barra; o padrão é L.
  - λ > 90 marca "revisar".
- γz com rigidez reduzida (0,4·Eci·Ic nas vigas, 0,8·Eci·Ic nos pilares, como na 15.7.3; opção Ecs a favor da segurança; aço 0,8EI). Entre 1,1 e 1,3, o vento (casos W) é majorado por 0,95γz nas combinações ELU.
- Cargas na fundação, seguindo o padrão Eberick/TQS: valores característicos por caso + envoltória das combinações raras para a verificação geotécnica, e envoltória ELU para o dimensionamento estrutural do elemento de fundação.
- Desaprumo global θa (11.3.3.4.1) nas ELU, com a regra dos 30% do vento; opção de 2ª ordem por P-Δ (rigidez reduzida) no lugar do γz.
- Barras inextensíveis/rígidas por penalidade (× 10⁶); trechos rígidos não são dimensionados.
- Vibração: massa = cargas verticais da combinação quase permanente / g, concentrada nos nós.
- Combinações: casos com o mesmo grupo excludente nunca atuam juntos (vento no grupo "vento" por padrão); para cada principal também a combinação sem acompanhantes.
- Fluência: t0 editável (padrão 1 mês, Δξ = 1,32); ρ' = armadura de compressão do vão.
- Memorial na ordem TQS / ABECE 003:2015, exportado em HTML.

**Fundações:**
- Padm = mín[(Rp+Rl)/2 ; Rp/4 + Rl/1,3].
- Escavada e hélice: Rp ≤ Rl. Escavada: Padm ≤ 1,25·Rl, regra de 2010 mantida a favor da segurança.
- Bloco rígido com 1 a 6 estacas. Momento vira binário nas estacas; carga horizontal por Miche (Mmáx = 0,79·H·T).
- Nd,mín da estaca = 1,0·(Gk + Wb)/n − 1,4·[(Gk − Nk,mín)/n + ΔN] (NBR 6118 Tab. 11.1); Td = máx(0, −Nd,mín). Gk = soma dos casos G ("N perm"); sem dado, Gk = Nk.
- Fase C (spec autorizada pelo usuário com as propostas): tipo de fundação por apoio (estacas + bloco, sapata, tubulão), várias sondagens por obra, sapata com flexão CEB-70 por padrão (bielas como opção).
- Armadura por bitola de φ6,3 a φ25, mínimo de 3 barras. A lista para na primeira bitola que resolve com 3 barras. Estribo espiral φ5 c/20, por pedido do usuário; o app avisa quando conflita com a NBR 6118.
- Tipos: hélice contínua, escavada mecânica sem fluido e pré-moldada.
- Diâmetros: 25, 30, 40, 50, 60, 80 e 100 cm para moldadas; para pré-moldada, os diâmetros do catálogo SCAC (26, 33, 38, 42, 50, 60, 70, 80).
- Limites de profundidade:
  - escavada: até o nível d'água (ou N ≥ 50 no trado);
  - hélice: até 24 m;
  - pré-moldada: até N ≥ 30, estimativa da nega.
- Biblioteca salva na conta do usuário. Mais detalhes em "Publicação" abaixo.

## A confirmar (sinalizado no app e no memorial)
- Números de item da NBR 6118 citados (numeração de 2014) e ηc = (40/fck)^(1/3) para fck > 40 na edição de 2023.
- NBR 6122:2019, Tabela 4 (classe/γc, σ sem armar, comprimento mínimo da armadura, As,mín 0,4%): veio do projeto de revisão de 2018.
- Critério de nega pelo SPT para pré-moldadas: não há critério normativo encontrado. N = 30 é ajustável.
- Estimativas: nh de argila média/rija (0,5 MN/m³); comprimento armado até 4T com carga horizontal; tração admissível Rl/2 + 0,9W; volume do bloco (usado só para ranquear soluções).
- Flecha com alvenaria (opção): parcela após a parede tomada como a diferida αf·f0, limite ℓ/500 e 10 mm.
- Cortante de pilar circular: bw = D, d = 0,8·D.
- Fissuração: Acr = bw·mín(h − d + 7,5φ, h/2) (simplificação da região de 7,5φ).
- Cargas de catálogo da pré-moldada (SCAC, menor valor da faixa); momento admissível com o fabricante.
- Blocos (C1): limites das bielas K·KR·fcd de Blévot (K 1,4/1,75/2,1 para 2/3/4 estacas; 5 e 6 por extensão do de 4; KR 0,90) e qual referência adotar (Blévot, Fusco ou NBR 6118 22.7); faixa da armadura principal 1,2D; malha 20%; suspensão Nd/(1,5·n·fyd) para s > 3D; pele 0,10% e estribos ρw,mín no bloco de 2 estacas; d′ ≥ máx(10 cm; 0,886D/5); bloco de 1 estaca (h = a; Rst = 0,25·Nd·(a − ap)/a); tirantes com a estaca mais carregada em todas; d ≥ lb do pilar (φ16 padrão).
- Sapatas (C2): σadm pelo SPT ≈ N̄/50 MPa (bulbo 2× o menor lado, N̄ ≤ 20); área comprimida ≥ 2/3 (item da NBR 6122); σmáx ≤ 1,0·σadm; peso próprio = máx(5% de Nk; concreto) com σadm tratada como líquida; h0 ≥ máx(h/3; 20 cm); ρmín 0,15%; A/B ≤ 2,5; lado ≥ 60 cm; cota de apoio 1,5 m.
- Tubulões (C3): σadm pelo SPT ≈ N̄/30 MPa (N̄ ≤ 40); fuste C25 com γc 1,6 (0,85·fck/γc); fuste ≥ 70 cm; H da base ≤ 1,8 m; base ≤ 4 m; peso próprio somado na base; cota automática pelo menor volume entre 3 m e o NA.
- SPT: por apoio, um furo (automático ou escolhido) ou a sondagem média de todos/alguns furos; leitura descartada (⊘) fica fora da média e, no furo isolado, é interpolada entre as vizinhas. Média: N médio das leituras válidas; solo mais frequente (empate: o menos favorável); profundidade comum (ou até o mais profundo); NA mais raso (ou médio).
- Pilar padrão 30 × 30 cm quando o apoio não informa (na importação, vem da seção retangular da barra mais vertical ligada ao apoio).

## Módulo Edifícios (Fase 2 concluída em 20/10/2026: fatias 0 a 7; aguardando aprovação do usuário)
- Pesquisa (Fase 0): `docs/pesquisa-edificios.md`. Spec (Fase 1, aprovada): `docs/spec-edificios.md`.
- Código:
  - `src/core/building/`: modelo físico, verificação de lançamento e premissas em uso (`premissas.ts`, que alimenta a interface e o MCP);
  - `src/core/commands/`: registro de comandos (toda alteração do edifício é um comando com schema, desfazer e log; ids determinísticos por `seq`, para o replay);
  - `src/cli/`: linha de comando e MCP;
  - `src/core/dxf/read.ts`: leitor de DXF; `src/core/geom/`: capturas (Flatbush), entrada digitada, polígonos;
  - `src/app/edificio/`: aba Edifício; `Planta.tsx` em Canvas 2D com três camadas (máscara em cache durante o gesto, modelo, interação); `plantaStore.ts` guarda vista, ferramenta e tema (não vão para o arquivo).
- A planta publica `data-vista`, `data-frame-ms`, `data-mascara-ms`, `data-snap-ms` e `data-segmentos` no contêiner, para os testes de interface.
- Dependência aprovada em uso: `flatbush` (ISC). O `rbush` da spec não foi necessário (o índice do modelo é refeito a cada alteração, barato).
- MCP: comandos com `mcp: false` não têm ferramenta própria (limite de 20–40 ferramentas); ficam acessíveis pelas ferramentas `comandos` e `previa`.
- Comando novo exige: schema, `validar` para referências, mensagem, exemplo em `EXEMPLOS` do `commands.test.ts` (o teste genérico confere aplicar + inverso) e ferramenta no MCP (automática).
- O núcleo não pode usar `window`, `document`, `localStorage` nem `navigator` (há teste).
- Fatia 6b: `src/core/sheets/` — `prancha.ts` (montagem pura: modelo em m, papel em mm, janela), `papel.ts` (modelo → papel com recorte), `pdf.ts`, `dxf.ts` (R2000; handles, CLASSES, BLOCK_RECORD, LAYOUT e VIEWPORT 1/2), `dwg.ts` (adaptador para o `Drawing` do nasjidwg), `svg.ts` (prévia); `exemplo.ts` é o edifício fictício dos testes. Carimbo e formato/escala no modelo (`prancha?`, comando `prancha.definir`, sem ferramenta MCP própria; `mascara.remover` também saiu do MCP para caber a ferramenta `pranchas`). Interface em `src/app/edificio/Pranchas.tsx`.
- DWG: `nasjidwg@0.18.0` (MIT) é devDependency fixa; `node scripts/vendor-nasjidwg.mjs` gera `public/vendor/nasjidwg-0.18.0.mjs` só com o escritor (192 KB, 54 KB gz) e copia LICENSE/NOTICE. O app importa por URL (`import(/* @vite-ignore */ …)`), a CLI pelo caminho relativo a `dist-cli/`. Os leitores do pacote só entram nos testes. No artifact do claude.ai o vendor não existe: o botão avisa e sugere o DXF.
- Downloads no artifact: a capability `downloads` só aceita algumas extensões (pdf, html, svg, csv, json, zip…); `download()` em `src/app/ui.tsx` empacota as outras num `.zip` (escritor próprio em `src/core/zip.ts`, sem compressão).
- Validação externa do DXF: `validation/dxf/auditar.py` (ezdxf, fora do npm test). Validação manual pendente com o usuário: abrir DXF e DWG no AutoCAD, AUDIT e aviso de arquivo não Autodesk.
- Fatia 7: MCP com `outputSchema` em todas as ferramentas, `dimensionar` com filtros (`pavimento`, `so_problemas`) e cache por revisão, recursos `statikos://resultados` e o modelo `statikos://resultados/{pavimento}` (`resources/templates/list`). Guia `docs/ia.md` (um teste exige que ele cite toda ferramenta e recurso do servidor) e `public/llms.txt` (vai para a raiz do site). Exemplo de agente `docs/exemplos/agente-mcp.mjs` (stdio; o mesmo roteiro roda em `src/cli/agente.test.ts`). Ferramenta nova ou renomeada exige atualizar `docs/ia.md`.
- Ajustes pedidos após a 6b (20/10/2026): carimbo com ART/RRT e etapa (todos os campos editáveis na aba Pranchas › Carimbo, comando `prancha.definir`; data de hoje quando vazia); comando `viga.alinharFace` (lado `externa` = contorno pela face externa dos pilares, ou `esq`/`dir` do traçado; a linha traçada vira essa face, então mudar a largura mantém a face). `viga.ajustarFaces` saiu do MCP. O aviso VIGA_FORA_FACE não dispara quando uma face da viga já coincide com a do pilar.
- Fatia 6b, premissas a confirmar: margens (esq. 20 mm; 10 mm A0/A1; 7 mm A2–A4) e legenda de 178 mm (NBR 16752); marcas de dobra (NBR 13142); penas por camada (NBR 16861: pilar 0,50, viga 0,35, texto 0,25, cota 0,18, eixo 0,13); alturas de texto 2–3 mm; cotas em cm; pilares que chegam hachurados e que nascem tracejados; seções do pavimento de referência (o primeiro do grupo); logo do carimbo ainda não suportado.
- Fatia 6a: `src/core/building/dimensionamento.ts` (esforços ao longo da barra, vigas, pilares, lajes, quantitativos, cargas para Fundações); roda no worker junto com a análise (`calculo.worker.ts` devolve `{ r, dim }`). Interface: aba Dimensionamento e `MemorialEdificio.tsx` (reaproveita `MEMO_CSS`, `memoPrintCss`, `APP_PRINT_CSS` e `printHtmlDoc` do memorial do pórtico). `importarCargasDoEdificio` em `Fundacoes.tsx`. CLI `dim` e ferramenta MCP `dimensionar` (`grupo.desvincular` saiu do MCP para caber no limite de 40 ferramentas). Pilares: só as combinações determinantes (Nd máx./mín., maiores momentos em cada direção, maior soma relativa) e um quadrante (seção e armadura duplamente simétricas), malha de fibras 16 (24 no círculo).
- Fatia 6a, premissas a confirmar: comprimento de flambagem = altura do lance; d das vigas = h − c − 1,3 cm; torção das vigas não verificada; ρmín das lajes 0,15 % para qualquer fck; flecha das lajes = elástica (G + ψ2Q)·(1 + 1,32), sem fissuração, deslocamento total (inclui o das vigas), limite L/250 do menor vão; armadura dos pilares φ10 a φ25 (φ ≤ menor lado/8), espaçamento até 30 cm, As entre máx(0,15Nd/fyd; 0,4 %) e 4 %; estribo φ5 ou φ6,3 c/ mín(20 cm; menor lado; 12φ); taxas de aço 70/100/130 kg/m³ nos quantitativos.
- Pacote: orçamento do `dist/index.html` único elevado para 1 MB pelo usuário (20/10/2026); 950 KB na fatia 6b (o worker inline duplica `concrete.ts` e `fiber.ts`). Pesados (DWG etc.) em `public/vendor`, sob demanda.
- Fatia 5: `src/core/building/vento.ts` (NBR 6123), γz em `analitico.ts` (modelo com rigidez reduzida), `combinacoes.ts` (reaproveita `nbrCombinations` do pórtico). Premissas a confirmar: Tabela 1 de S2, Ca padrão 1,3 (ábaco não digitalizado), z medido a partir do pavimento mais baixo, edição da NBR 6123 (1988).
- Fatia 4: `src/core/fe3d.ts` (barras 3D, diafragma, cargas concentradas na barra) e `src/core/building/analitico.ts` (grelha + pórtico, função pura). O pórtico usa a divisão "grossa" das vigas (cruzamentos e apoios) e recebe as forças das lajes como cargas concentradas; a grelha usa a divisão fina (pontos da malha). A análise roda num Web Worker inline (`calculo.worker.ts`); o código de cálculo só existe dentro dele. Validação contra o OpenSees: `python3 validation/opensees/portico3d.py` regenera o JSON de referência.
- Fatia 4, premissas a confirmar: torção das lajes 15 % de 2I e das vigas 15 %; molas 4EI/L dos pilares na grelha; mestre no centro geométrico das lajes; área dos pilares × 2 nas verticais; Ecs e ν = 0,2; peso das vigas b × h sem descontar a laje.
- Fatia 3, premissas a confirmar: catálogo das treliçadas (H8–H25, intereixo, nervura, capa, γ do EPS 0,2 kN/m³); alvenaria (γ 13/14 kN/m³ com revestimento, altura até o pavimento de cima menos a viga, 0,5 m sem vigas, platibanda 1,0 m, aberturas não descontadas). Panos e alvenaria em `src/core/building/lajes.ts`; faces em `src/core/geom/faces.ts`.
- Fatia 2, premissas a confirmar: apoio da viga (pilar que chega ao pavimento e toca o corpo, ou viga cruzada/encostada, folga 1 cm); um apoio só = aviso de balanço; aviso de face da viga a até 5 cm da face do pilar quando a viga não está centrada. Regras em `src/core/building/vigas.ts`.
- Fatia 1, premissas a confirmar: seção mínima de pilar 19 cm (14 cm com γn; área ≥ 360 cm²) e pilar-parede com lado > 5 × o menor, com os itens da NBR 6118 a conferir; unidade do DXF sem $INSUNITS estimada pelo tamanho do desenho; tolerância de 0,3 m na renumeração. Atalhos da planta: S, P, E, M, D (medir), F, Tab, F8, F10, A (ponto fixo), R (girar 90°), Del.
- Fatia 0, premissas a confirmar: pé-direito mínimo para aviso 2,2 m; cargas variáveis por uso da NBR 6120 (residencial 1,5; serviço 2,0; áreas comuns 3,0; escritório 2,5; garagem 3,0; cobertura 1,0 kN/m²); revestimento padrão 1,0 kN/m².
- **Regra geral (decisão do usuário, 20/10/2026): seguir o CYPECAD em funcionalidade e opções.** Onde ele tem um critério padrão com opção de editar/configurar, o Statikos faz o mesmo: padrão configurado para a NBR 6118 e o valor editável. As divergências de premissa do `docs/checklist-manual-calculo-cypecad.md` seguem essa regra na frente N1.
- Pós-Fase 2: checklists `docs/checklist-manual-cypecad.md` (manual do usuário, 763 itens) e `docs/checklist-manual-calculo-cypecad.md` (manual de cálculo, 661 itens) e `docs/plano-frentes.md` (frentes 0, N1, R, FU, E1–E4, N2, L, V). Cada item pendente tem uma frente dona; atualizar o checklist a cada fatia. Frente 0 feita em 20/10/2026: fyk do aço da obra, pilar tracionado verificado, furos na grelha, bitolas de pilar até φ25.
- Referências visuais de pranchas: os PDFs de exemplo no Drive do usuário só dão texto pelo conector (textos convertidos em curvas no CAD); para ver como imagem é preciso liberar `drive.usercontent.google.com` na rede do ambiente ou receber prints na conversa. Não commitar material de obras reais.
- O usuário aceitou os padrões dos itens 1–48 da pesquisa em 20/10/2026; a tabela "Premissas adotadas" da spec é a referência. Valores sem fonte aberta continuam "a confirmar".
- Regras extras do módulo:
  - paridade de funcionalidade com o CYPECAD, nunca de implementação (sem nomes de comandos, ícones, layout ou formatos proprietários);
  - dependência nova só com aceite (licença, tamanho, alternativa);
  - parar para aprovação ao fim de cada fase.

## Publicação web (Netlify)
- Sem login e sem banco: decisão do usuário (out/2026). Tudo roda no navegador.
- `netlify.toml` roda `npm test && npm run build` e publica `dist/`. Basta conectar o repositório no Netlify; cada push no `main` publica.
- O trabalho fica no localStorage e o usuário guarda e retoma pelo arquivo `.statikos` (Ctrl+S/Ctrl+O). No Chrome/Edge, o Ctrl+S regrava o mesmo arquivo.
- PWA: `public/manifest.webmanifest` (file_handlers para `.statikos`), `public/sw.js` (rede primeiro, cache como reserva; registrado só no build, em https/localhost e fora de iframe). O `netlify.toml` põe `Cache-Control: no-cache` em `/`, `/index.html`, `/sw.js` e no manifest.
- Spec das próximas fases: `docs/spec-proximas-fases.md`.

## Publicação como artifact do claude.ai
- O app foi publicado como artifact privado do usuário: https://claude.ai/artifact/EG1GFPozyKaHddVko8BzAw (versão 4).
- Capabilities declaradas: `db`, `user`, `downloads`.
- Para republicar:
  1. Rodar `npm run build`.
  2. Gerar um HTML sem `<!doctype>`, `<html>`, `<head>` e `<body>`: manter `<title>`, links de fonte, `<style>`, o `<script type="module">` e `<div id="root">`.
  3. Publicar com o mesmo URL (é preciso ler o artifact antes, numa sessão nova).
- Downloads usam `window.claude.use('downloads')` quando existe; senão, link com blob (`src/app/ui.tsx`).
- Biblioteca: documentos em `data/users/<uid>` (privado por usuário) com `{kind, name, summary, savedAt, payload: JSON string}`. Limite de 256 KiB por documento; o app recusa acima de 240 KB. Fora do claude.ai, usa localStorage (`statikos:library`).
- O modelo é salvo automaticamente em localStorage (`statikos:model`).
- O service worker (PWA) não é registrado dentro do artifact (iframe); no republish, o `<head>` com manifest e ícones some, como já acontece.

## Próximos passos sugeridos
1. Fundações: sapatas associadas e de divisa, cisalhamento de sapatas, recalques, tubulão com carga horizontal e armadura de topo, detalhamento e quantitativos (C1–C4 feitos em 18/10/2026).
2. Pré-moldado NBR 9062 (consolos, ligações) — escopo a definir.
3. Perfis metálicos: conferir as propriedades calculadas contra o catálogo do fabricante; perfis soldados (CS/CVS/VS).

## Notas de pesquisa
`docs/pesquisa-memorial.md` e `docs/pesquisa-fundacoes.md` trazem os resumos das pesquisas, com URLs das fontes.
