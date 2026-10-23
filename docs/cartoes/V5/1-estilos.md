# Cartão V5-1 — estilos das cargas por caso e dos esforços

Executor: Haiku. Primeiro cartão. Só `src/app/design/global.css`.

## Comportamento
- Tokens `--carga-caso-g`, `-q`, `-w`, `-e`, `-h` e `--carga-caso-adic-0` a `-5` (natureza e casos adicionais) e as classes `carga-caso-*` que `src/core/resultados/cargasCaso.ts` devolve (`classeDoCaso`, `TODAS_CLASSES_CARGA`).
- Classes `esf-*` dos diagramas (`esf-svg`, `esf-eixo`, `esf-curva`, `esf-curva-min`, `esf-area`, `esf-valor`), da seção do concreto (`esf-sec-*`, `esf-barra-aco`, `esf-barra-aco-esc`) e das vigotas (`esf-vig-faixa`, `esf-vig-rot`).
- Reaproveita `isov-janelas`, `isov-janela` e `isov-barra` da V4.

## Rótulos
Nenhum (só estilo).

## Regras desta frente (valem para este cartão)
- Só `src/app/ui` para controles (`Button`, `Check`, `Select`, `NumField`, `TextField`, `Group`, `Hint`); `<button>`, `<select>`, `<input>` crus reprovam em `design.test.ts` (o `<input type="file" hidden>` do cartão 4 é o padrão já usado em `Pranchas.tsx`).
- Nenhuma cor literal em TS/TSX, nenhum CSS fora de `src/app/design`, toda classe usada existe em `global.css`. Estilo inline só para valores calculados.
- Rótulos únicos: cada controle da aba leva o número da janela no nome, por exemplo `Hipótese (janela 1)`. Nos testes e2e, `getByLabel`/`getByRole` com `{ exact: true }`, **exceto** `NumField`, `OptNumField`, `TextField`, `Select` e `Slider`: nesses, regex ancorada no início, por exemplo `getByLabel(/^Hipótese \(janela 1\)/)`.
- Não altere `src/core/`: o núcleo da V5 está pronto e testado.
- O bloco `diff` é o resultado esperado, gerado e validado (tsc, `design.test.ts` e o fluxo e2e `V5`). Salve o bloco num arquivo `.patch` e aplique com `git apply`; se uma âncora não casar, procure o trecho equivalente e não invente código além do diff.

## Diff esperado
```diff
diff --git a/src/app/design/global.css b/src/app/design/global.css
index b77ee80..f6879cc 100644
--- a/src/app/design/global.css
+++ b/src/app/design/global.css
@@ -192,6 +192,9 @@
   --emp-eixo: var(--muted);
   --iso-0: #2b4ba8; --iso-1: #3f6fc4; --iso-2: #5c93d6; --iso-3: #86b6e2; --iso-4: #b3d4ea; --iso-5: #e3ece9;
   --iso-6: #f2dcb4; --iso-7: #eab883; --iso-8: #de8d5c; --iso-9: #c95a3c; --iso-10: #a02a2a;
+  /* cargas por caso (V5, K1.11.11): natureza G, Q, W, E, H e casos adicionais */
+  --carga-caso-g: #2b6cb0; --carga-caso-q: #c05621; --carga-caso-w: #2f855a; --carga-caso-e: #805ad5; --carga-caso-h: #b7791f;
+  --carga-caso-adic-0: #d53f8c; --carga-caso-adic-1: #319795; --carga-caso-adic-2: #718096; --carga-caso-adic-3: #9c4221; --carga-caso-adic-4: #5a67d8; --carga-caso-adic-5: #38a169;
 }
 @media (prefers-color-scheme: light) {
   :root:not([data-theme='dark']) {
@@ -1013,3 +1016,27 @@ body.ajuda-on { cursor: help; }
 .iso-valor { fill: var(--ink-strong); font: 9px var(--font-num); paint-order: stroke; stroke: var(--surface); stroke-width: 2px; }
 .iso-ext { fill: none; stroke-width: 2px; vector-effect: non-scaling-stroke; }
 .iso-ext-max { stroke: var(--ink-strong); } .iso-ext-min { stroke: var(--muted); stroke-dasharray: 3 2; }
+
+/* esforços por hipótese (V5): diagramas de M, V, N e T, seção do concreto e vistas das vigotas */
+.esf-aba { display: flex; flex-direction: column; gap: 12px; padding: 10px; overflow: auto; }
+.esf-barra { align-items: flex-end; flex-wrap: wrap; gap: 8px 12px; }
+.esf-barra > .field { min-width: 150px; }
+.esf-svg { width: 100%; max-height: 300px; background: var(--surface); }
+.esf-eixo { stroke: var(--line-strong); stroke-width: 1px; fill: none; vector-effect: non-scaling-stroke; }
+.esf-curva { fill: none; stroke: var(--accent-text); stroke-width: 1.8px; vector-effect: non-scaling-stroke; }
+.esf-curva-min { fill: none; stroke: var(--muted); stroke-width: 1.4px; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
+.esf-area { fill: var(--accent-soft); stroke: none; opacity: 0.7; }
+.esf-valor { fill: var(--ink-strong); font: 10px var(--font-num); paint-order: stroke; stroke: var(--surface); stroke-width: 2px; }
+.esf-sec-conc { fill: var(--sunken); stroke: var(--ink-strong); stroke-width: 1.2px; vector-effect: non-scaling-stroke; }
+.esf-sec-tens { fill: var(--accent-soft); stroke: var(--accent-text); stroke-width: 1px; vector-effect: non-scaling-stroke; }
+.esf-sec-ln { stroke: var(--ink-strong); stroke-width: 1.2px; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
+.esf-barra-aco { fill: var(--ink-strong); }
+.esf-barra-aco-esc { fill: var(--accent-text); }
+.esf-vig-faixa { stroke: var(--ink); stroke-width: 1px; fill: none; vector-effect: non-scaling-stroke; }
+.esf-vig-rot { fill: var(--ink-strong); font: 11px var(--font-num); paint-order: stroke; stroke: var(--surface); stroke-width: 2px; }
+.carga-caso-g { stroke: var(--carga-caso-g); color: var(--carga-caso-g); } .carga-caso-q { stroke: var(--carga-caso-q); color: var(--carga-caso-q); }
+.carga-caso-w { stroke: var(--carga-caso-w); color: var(--carga-caso-w); } .carga-caso-e { stroke: var(--carga-caso-e); color: var(--carga-caso-e); }
+.carga-caso-h { stroke: var(--carga-caso-h); color: var(--carga-caso-h); }
+.carga-caso-adic-0 { stroke: var(--carga-caso-adic-0); color: var(--carga-caso-adic-0); } .carga-caso-adic-1 { stroke: var(--carga-caso-adic-1); color: var(--carga-caso-adic-1); }
+.carga-caso-adic-2 { stroke: var(--carga-caso-adic-2); color: var(--carga-caso-adic-2); } .carga-caso-adic-3 { stroke: var(--carga-caso-adic-3); color: var(--carga-caso-adic-3); }
+.carga-caso-adic-4 { stroke: var(--carga-caso-adic-4); color: var(--carga-caso-adic-4); } .carga-caso-adic-5 { stroke: var(--carga-caso-adic-5); color: var(--carga-caso-adic-5); }
```
