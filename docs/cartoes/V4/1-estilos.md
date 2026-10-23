# Cartão V4-1 — classes das janelas de isovalores, bandas, isolinhas e extremos

Executor: Haiku. Primeiro da ordem; só `src/app/design/global.css`.

## Comportamento
- `.isov-aba` (contêiner da aba), `.isov-janelas` (grade de janelas lado a lado: `repeat(auto-fit, minmax(min(100%, 460px), 1fr))`), `.isov-janela`, `.isov-barra` (linha de controles que quebra), `.isov-mapa` (SVG do mapa, cursor de mira).
- `.iso-banda` preenche com a classe de token `.iso-<n>` já existente (`fill`) e usa `stroke: currentColor` com `color` igual ao token, para não aparecer costura entre polígonos vizinhos.
- `.iso-linha` (isolinhas), `.iso-contorno` (contorno e furos da laje), `.iso-valor` (valores nos nós, com halo), `.iso-ext-max` e `.iso-ext-min` (marcadores do máximo e do mínimo).
- Não redefine `--iso-*` (já existem, E1d).

## Rótulos
Nenhum (só estilos).

## Diff esperado
```diff
diff --git a/src/app/design/global.css b/src/app/design/global.css
index f577bad..b77ee80 100644
--- a/src/app/design/global.css
+++ b/src/app/design/global.css
@@ -994,3 +994,22 @@ body.ajuda-on { cursor: help; }
 .guia dl { margin: 0; display: grid; gap: 4px; }
 .guia dt { font-weight: 600; color: var(--ink-strong); }
 .guia dd { margin: 0 0 4px; color: var(--ink); }
+/* isovalores (V4): janelas lado a lado, bandas de cor (tokens --iso-0 a --iso-10), isolinhas, extremos e valores */
+.isov-aba { display: flex; flex-direction: column; gap: 12px; padding: 10px; overflow: auto; }
+.isov-aba > .row { align-items: center; flex-wrap: wrap; gap: 8px 12px; }
+.isov-janelas { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap: 12px; align-items: start; }
+.isov-janelas > * { min-width: 0; }
+.isov-barra > .field { min-width: 150px; }
+.isov-janela { display: flex; flex-direction: column; gap: 8px; }
+.isov-barra { align-items: flex-end; flex-wrap: wrap; gap: 8px 12px; }
+.isov-mapa { cursor: crosshair; max-height: 420px; }
+.iso-banda { stroke-width: 0.6px; stroke: currentColor; }
+.iso-banda.iso-0 { color: var(--iso-0); } .iso-banda.iso-1 { color: var(--iso-1); } .iso-banda.iso-2 { color: var(--iso-2); }
+.iso-banda.iso-3 { color: var(--iso-3); } .iso-banda.iso-4 { color: var(--iso-4); } .iso-banda.iso-5 { color: var(--iso-5); }
+.iso-banda.iso-6 { color: var(--iso-6); } .iso-banda.iso-7 { color: var(--iso-7); } .iso-banda.iso-8 { color: var(--iso-8); }
+.iso-banda.iso-9 { color: var(--iso-9); } .iso-banda.iso-10 { color: var(--iso-10); }
+.iso-linha { fill: none; stroke: var(--ink-strong); stroke-width: 0.8px; opacity: 0.75; vector-effect: non-scaling-stroke; }
+.iso-contorno { fill: none; stroke: var(--ink-strong); stroke-width: 1.5px; vector-effect: non-scaling-stroke; }
+.iso-valor { fill: var(--ink-strong); font: 9px var(--font-num); paint-order: stroke; stroke: var(--surface); stroke-width: 2px; }
+.iso-ext { fill: none; stroke-width: 2px; vector-effect: non-scaling-stroke; }
+.iso-ext-max { stroke: var(--ink-strong); } .iso-ext-min { stroke: var(--muted); stroke-dasharray: 3 2; }
```
