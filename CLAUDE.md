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
npm test         # vitest: 84 testes (analíticos, NBR 6118, NBR 8800, fundações, exemplos, arquivo de trabalho)
npm run build    # dist/index.html único (vite-plugin-singlefile)
npx tsc -p tsconfig.app.json --noEmit
```
Testes de interface foram feitos com Playwright (Chromium em /opt/pw-browsers no ambiente de nuvem). Os scripts eram descartáveis e não estão no repositório.

## Arquitetura
Veja a tabela no `README.md`. Resumo:
- `src/core/`: núcleo puro, sem React e testado.
  - `element.ts`: elemento por flexibilidade, com rótulas por condensação e ligações semirrígidas (1/k somado à flexibilidade).
  - `solver.ts`: rigidez direta, apoio inclinado exato, molas, recalques, combinações.
  - `influence.ts`: linhas de influência por Müller-Breslau e trem-tipo.
  - `concrete.ts`: NBR 6118.
  - `steel.ts`: NBR 8800.
  - `design.ts`: orquestra combinações, γz, verificações e cargas na fundação.
  - `piles.ts`: Décourt-Quaresma e NBR 6122; modelo de dados das fundações (furos, cargas por apoio, parâmetros).
  - `caps.ts`: blocos de coroamento (bielas e tirantes); `footings.ts`: sapatas; `caissons.ts`: tubulões; `foundation.ts`: fundação por apoio conforme o tipo.
  - `edit.ts`: operações de edição e combinações NBR 8681.
- `src/app/`: interface React + zustand (`store.ts`).
  - `Canvas.tsx`: editor SVG.
  - `panels/*`: abas Estrutura, Cargas, Resultados, Influência e Dimensionar.
  - `Fundacoes.tsx`: módulo de fundações.
  - `Memorial.tsx` + `drawing.ts`: memorial de cálculo com figuras SVG estáticas.
  - `Library.tsx` + `storage.ts`: biblioteca de projetos e características.
  - `workspace.ts` + `history.ts`: arquivo de trabalho `.statikos` (modelo + biblioteca + histórico) e histórico de atividades.
- Unidades internas: kN, m, rad (a interface converte a força para tf/kgf/N em `src/app/units.ts`; dimensionamento, fundações e memorial ficam em kN). E em kN/m². No cálculo de seção: MN e MPa.
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
- γz com rigidez reduzida (0,4EI nas vigas, 0,8EI nos pilares; aço 0,8EI). Entre 1,1 e 1,3, o vento (casos W) é majorado por 0,95γz nas combinações ELU.
- Cargas na fundação, seguindo o padrão Eberick/TQS: valores característicos por caso + envoltória das combinações raras para a verificação geotécnica, e envoltória ELU para o dimensionamento estrutural do elemento de fundação.
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
- Cargas de catálogo da pré-moldada (SCAC, menor valor da faixa); momento admissível com o fabricante.
- Blocos (C1): limites das bielas K·KR·fcd de Blévot (K 1,4/1,75/2,1 para 2/3/4 estacas; 5 e 6 por extensão do de 4; KR 0,90) e qual referência adotar (Blévot, Fusco ou NBR 6118 22.7); faixa da armadura principal 1,2D; malha 20%; suspensão Nd/(1,5·n·fyd) para s > 3D; pele 0,10% e estribos ρw,mín no bloco de 2 estacas; d′ ≥ máx(10 cm; 0,886D/5); bloco de 1 estaca (h = a; Rst = 0,25·Nd·(a − ap)/a); tirantes com a estaca mais carregada em todas; d ≥ lb do pilar (φ16 padrão).
- Sapatas (C2): σadm pelo SPT ≈ N̄/50 MPa (bulbo 2× o menor lado, N̄ ≤ 20); área comprimida ≥ 2/3 (item da NBR 6122); σmáx ≤ 1,0·σadm; peso próprio = máx(5% de Nk; concreto) com σadm tratada como líquida; h0 ≥ máx(h/3; 20 cm); ρmín 0,15%; A/B ≤ 2,5; lado ≥ 60 cm; cota de apoio 1,5 m.
- Tubulões (C3): σadm pelo SPT ≈ N̄/30 MPa (N̄ ≤ 40); fuste C25 com γc 1,6 (0,85·fck/γc); fuste ≥ 70 cm; H da base ≤ 1,8 m; base ≤ 4 m; peso próprio somado na base; cota automática pelo menor volume entre 3 m e o NA.
- Pilar padrão 30 × 30 cm quando o apoio não informa (na importação, vem da seção retangular da barra mais vertical ligada ao apoio).

## Publicação web (Netlify)
- Sem login e sem banco: decisão do usuário (out/2026). Tudo roda no navegador.
- `netlify.toml` roda `npm test && npm run build` e publica `dist/`. Basta conectar o repositório no Netlify; cada push no `main` publica.
- O trabalho fica no localStorage e o usuário guarda e retoma pelo arquivo `.statikos` (Ctrl+S/Ctrl+O). No Chrome/Edge, o Ctrl+S regrava o mesmo arquivo.
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

## Próximos passos sugeridos
1. Fundações: sapatas associadas e de divisa, cisalhamento de sapatas, recalques, tubulão com carga horizontal e armadura de topo, detalhamento e quantitativos (C1–C4 feitos em 18/10/2026).
2. Não linear geométrico (P-Δ / matriz geométrica).
3. Pilares circulares e em L; pré-moldado NBR 9062 (consolos, ligações); abertura de fissuras.
4. Biblioteca de perfis metálicos BR; exportação DXF/PDF; unidades configuráveis; solver esparso.

## Notas de pesquisa
`docs/pesquisa-memorial.md` e `docs/pesquisa-fundacoes.md` trazem os resumos das pesquisas, com URLs das fontes.
