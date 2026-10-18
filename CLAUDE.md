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
npm test         # vitest: 100 testes (analíticos, NBR 6118, NBR 8800, fundações, exemplos, arquivo de trabalho, DXF, cotas, caminho, perfis)
npm run build    # dist/index.html único (vite-plugin-singlefile) + public/ (manifest, sw.js, ícones)
npm run e2e      # testes de interface: build + vite preview numa porta livre (4200–4209) + fluxos Playwright
npx tsc -p tsconfig.app.json --noEmit
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
  - `piles.ts`: Décourt-Quaresma e NBR 6122.
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
1. Blocos de coroamento (bielas e tirantes) a partir das estacas escolhidas; sapatas; tubulões; várias sondagens por obra.
3. Pré-moldado NBR 9062 (consolos, ligações).
4. Perfis metálicos: conferir as propriedades calculadas contra o catálogo do fabricante; perfis soldados (CS/CVS/VS).

## Notas de pesquisa
`docs/pesquisa-memorial.md` e `docs/pesquisa-fundacoes.md` trazem os resumos das pesquisas, com URLs das fontes.
