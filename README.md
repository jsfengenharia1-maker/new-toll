# Statikos — análise de pórticos planos (web)

Reconstrução limpa de um analisador de pórticos 2D. A especificação veio do comportamento observável (menus e funções), sem uso de código de terceiros. Nome provisório.

## Rodar

```bash
npm i
npm run dev        # desenvolvimento
npm test           # 100 testes (soluções analíticas, NBR 6118, NBR 8800, fundações, exemplos, arquivo de trabalho, DXF, cotas, caminho, perfis)
npm run build      # gera dist/index.html único + manifest, service worker e ícones (public/)
npm run e2e        # testes de interface (Playwright): build, vite preview numa porta livre e fluxos de e2e/flows.mjs
```

## Publicar

Site estático: conecte o repositório no Netlify (o `netlify.toml` já define build e pasta). Não há servidor nem login; o usuário salva o trabalho em um arquivo `.statikos` (Arquivo › Salvar no computador, Ctrl+S) e o reabre depois (Ctrl+O). O arquivo leva o modelo, a biblioteca e o histórico.

Instalável (PWA): no Chrome/Edge, "Instalar Statikos" na barra de endereço. Depois da primeira visita, abre sem internet; com o app instalado, um `.statikos` abre com duplo clique (Chrome/Edge no desktop) e Ctrl+S grava no mesmo arquivo. O service worker busca sempre a versão publicada quando há rede.

Próximas fases: [`docs/spec-proximas-fases.md`](docs/spec-proximas-fases.md).

## Arquitetura

| Camada | Arquivo | Papel |
|---|---|---|
| Modelo | `src/core/types.ts` | JSON versionado (nós, barras, materiais, seções, casos, combinações, trens-tipo) |
| Elemento | `src/core/element.ts` | Pórtico plano por flexibilidade: Euler-Bernoulli/Timoshenko, rótulas por condensação, cargas lineares, temperatura, deformação inicial concentrada |
| Solver | `src/core/solver.ts` | Rigidez direta, apoio inclinado exato (rotação de gdl), molas, recalques, detecção de hipostaticidade, superposição |
| Influência | `src/core/influence.ts` | LI por Müller-Breslau (uma solução por seção), trem-tipo com q/q′, impacto, dois sentidos, envoltória + estático |
| Edição | `src/core/edit.ts` | Inserção com divisão automática em interseções, união de barras, combinações NBR 8681 |
| Concreto | `src/core/concrete.ts` | NBR 6118:2023: materiais, seção por compatibilidade de deformações (parábola-retângulo), pilares (M1d,mín, λ/λ1, pilar-padrão com curvatura aproximada, flexão oblíqua α = 1,2, escolha automática de armadura), vigas (flexão retangular/T, armadura dupla, As,mín, cisalhamento modelo I, Branson) |
| Aço | `src/core/steel.ts` | NBR 8800: Q (flambagem local), χ, FLT/FLM/FLA, cortante, interação N+M com B1 |
| Projeto | `src/core/design.ts` | Combinações ELU/QP/raras, γz com rigidez reduzida e 0,95γz, verificação de todas as barras, sugestão de seção até 100×100, cargas na fundação |
| Memorial | `src/app/Memorial.tsx`, `drawing.ts` | Memorial padrão (ordem TQS/ABECE 003) com figuras, tabelas, fórmulas e conclusão; exportação HTML |
| Fundações | `src/core/piles.ts`, `src/app/Fundacoes.tsx` | Décourt-Quaresma (α/β 1996) metro a metro, limites executivos (NA, nega estimada, profundidade de equipamento), blocos de 1 a 6 estacas, Miche, NBR 6122 Tabela 4, armadura por bitola e estribo espiral |
| Biblioteca | `src/app/storage.ts`, `Library.tsx` | Projetos e características salvos na conta (capability db, subárvore privada do usuário) ou no navegador |
| Interface | `src/app/*` | Editor SVG (snap, janela/cruzamento, arrastar nós, coordenadas), painéis, tabelas, exportação SVG/CSV/JSON |
| Perfis | `src/core/profiles.ts` | Perfis I laminados W e HP, tubos circulares e retangulares usuais no Brasil: só dimensões nominais; A, I, Z etc. calculados pela geometria, sem raio de concordância |
| PWA | `public/manifest.webmanifest`, `public/sw.js` | Instalação, funcionamento offline (rede primeiro, cache como reserva), abertura de `.statikos` pelo sistema (File Handling API) |
| Testes de interface | `e2e/run.mjs`, `e2e/flows.mjs` | Runner próprio sobre `playwright`: desenho, memorial, salvar/abrir, modos, DXF, perfis, PWA |
| Saída | `src/app/dxf.ts`, `dims.ts`, `pathTable.ts` | DXF R12 próprio com camadas, cotas automáticas de vãos e níveis, CSV ao longo de uma cadeia de barras |

## Inventário funcional

**Feito (fase 1)**
- Nós, barras, divisão automática, mover nó, inverter orientação, unir barras, entrada por coordenadas
- Transformar seleção: copiar ou mover por translação (cópias em série), rotação, espelhamento e escala, levando cargas e apoios
- Apoios fixos, livres ou com mola em X/Y/θ; apoio inclinado; recalques e rotações prescritas
- Rótulas por extremidade ou em todas as barras de um nó; ligações semirrígidas (mola rotacional linear-elástica k por extremidade); barras inextensíveis e trechos rígidos
- Materiais; seções retangular, T, I/H, caixão, circular, tubo, poligonal (ex.: L) e genérica
- Pilares de concreto circulares e poligonais por fibras, com flexão oblíqua real
- Cargas nodais, distribuídas lineares (global, projetada, local), momentos de extremidade, temperatura (fibras y+/y−), peso próprio
- Casos (G/Q/W com ψ), combinações livres e NBR 8681 automáticas, envoltórias de casos e combinações
- Diagramas N, V, M (M no lado tracionado ou comprimido), deformada exata, reações, leitura no ponto ao passar o mouse
- Linhas de influência de N, V e M, de reações de apoio e de deslocamentos de nó; trem-tipo com envoltória em toda a estrutura
- 2ª ordem global por P-Δ (opção ao γz), desaprumo global (11.3.3.4.1), flambagem global (modos e fatores de carga crítica) e vibração livre (frequências e massas modais)
- Unidades de exibição: força kN, tf, kgf ou N e comprimento m, cm ou mm (cálculo sempre em kN e m)
- Tabelas (reações, deslocamentos, esforços) com CSV; exportação SVG; desfazer/refazer; salvamento automático local
- Exportação DXF R12 em metros com camadas (geometria, nós, apoios, rótulas, cargas, cotas, textos, N, V, M e deformada do resultado ativo)
- Cotas automáticas de vãos e níveis (toggle "Cotas"), no desenho, no SVG e no DXF
- CSV de resultados ao longo de uma cadeia de barras (s acumulado, N, V, M, δx, δy)

**Feito (fase 2)**
- Dimensionamento NBR 6118 de vigas (retangular e T, com fissuração ELS-W) e pilares retangulares, com sugestão de seção e aplicação em um clique
- Verificação NBR 8800 de perfis I, tubos e caixões
- γz, cargas na fundação (características e de cálculo), flechas com Branson e fluência
- Biblioteca rápida de seções retangulares de 12 cm a 1,50 m; materiais por classe (C20–C90) e aços comerciais
- Perfis metálicos de catálogo (W150×13,0 a W610×174,0, HP200×53,0 a HP310×125,0, tubos circulares Ø33,4 a Ø323,8 e tubos quadrados/retangulares 50×50 a 300×200): propriedades pela geometria nominal, sem raio de concordância (a confirmar com o catálogo do fabricante)
- Memorial de cálculo padrão exportável em HTML e impresso em PDF (A4, cabeçalho, rodapé com paginação, quebras por seção)

**Plataforma**
- PWA: instalação, uso offline, abertura de `.statikos` com duplo clique (Chrome/Edge instalado)
- Testes de interface no repositório (`npm run e2e`)

**Feito (fase 3)**
- Biblioteca: salvar/abrir projetos e "características" do dimensionamento na conta do usuário
- Módulo de fundações profundas: SPT, cargas do pórtico ou salvas, hélice contínua, escavada e pré-moldada, Ø25–100 (pré-moldada nos diâmetros de catálogo), comprimento, número de estacas, armadura por bitola e memorial

**Próximas fases**
- Blocos de coroamento (bielas e tirantes), sapatas e tubulões; várias sondagens por obra
- Pilares circulares e em L, pré-moldado (NBR 9062: consolos, ligações), abertura de fissuras
- Perfis soldados (CS, CVS, VS) e conferência das propriedades calculadas com o catálogo do fabricante
- Cotas manuais entre nós
