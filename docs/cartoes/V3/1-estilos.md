# Cartão V3-1 — tokens e classes da deformada, da aba Deslocamentos e do perfil da flecha

Executor: Haiku. Primeiro da ordem; só `src/app/design/global.css`.

## Comportamento
- Rampa `--v3d-def-1` (menor |Δ|) a `--v3d-def-5` (maior), azul → ciano → verde → amarelo → vermelho; no tema p/b (`.v3d[data-tema='pb']`), cinzas de claro a escuro (`--v3d-pb-def-*`).
- `.v3d-def-leg` / `.v3d-def-rampa`: legenda no rodapé da vista 3D (degradê da rampa).
- `.desloc-aba`: contêiner da aba Deslocamentos; `.flecha-perfil` e `.fp-*`: SVG do perfil da flecha (cores de `--v3d-claro-*`, como as figuras de corte).

## Rótulos
Nenhum (só estilos).

## Diff esperado
```diff
diff --git a/src/app/design/global.css b/src/app/design/global.css
index 3418b3e..3aa116a 100644
--- a/src/app/design/global.css
+++ b/src/app/design/global.css
@@ -141,6 +141,9 @@
   /* armaduras em 3D (V2): oito cores por bitola, tipo ou elemento (ciclo); no tema p&b, oito tons de cinza */
   --v3d-arm-1: #e4572e; --v3d-arm-2: #2e86ab; --v3d-arm-3: #76b041; --v3d-arm-4: #f5b700; --v3d-arm-5: #8f5bd6; --v3d-arm-6: #17a398; --v3d-arm-7: #d65db1; --v3d-arm-8: #9c8b6e;
   --v3d-pb-arm-1: #000000; --v3d-pb-arm-2: #333333; --v3d-pb-arm-3: #555555; --v3d-pb-arm-4: #777777; --v3d-pb-arm-5: #222222; --v3d-pb-arm-6: #444444; --v3d-pb-arm-7: #666666; --v3d-pb-arm-8: #888888;
+  /* deformada (V3): rampa de |Δ| do menor ao maior deslocamento; no tema p/b, tons de cinza */
+  --v3d-def-1: #2b6cb0; --v3d-def-2: #1fa3a3; --v3d-def-3: #6fbf4a; --v3d-def-4: #f2c230; --v3d-def-5: #d9402b;
+  --v3d-pb-def-1: #e6e6e6; --v3d-pb-def-2: #bdbdbd; --v3d-pb-def-3: #8f8f8f; --v3d-pb-def-4: #5c5c5c; --v3d-pb-def-5: #1a1a1a;
   /* grupos de pavimentos (marca por grupo; classe .grupo-c<i>): tons de cinza e o destaque */
   --grupo-0: #6995fe; --grupo-1: #f2f2f2; --grupo-2: #afafaf; --grupo-3: #8a8a8a;
   --grupo-4: #dbdbdb; --grupo-5: #6d6d6d; --grupo-6: #c4c4c4; --grupo-7: #555555;
@@ -862,6 +865,18 @@ tr.sel td { background: var(--accent-soft); }
 .v3d-iso .v3d-rotulo { fill: var(--v3d-pendente); font: 700 40px var(--font-ui); }
 /* cortes e seções (V2): elevação em SVG sobre a folha clara; o mesmo SVG vai para o memorial (memorial.css, escopo .memo) */
 .v3d[data-tema='pb'] { --v3d-arm-1: var(--v3d-pb-arm-1); --v3d-arm-2: var(--v3d-pb-arm-2); --v3d-arm-3: var(--v3d-pb-arm-3); --v3d-arm-4: var(--v3d-pb-arm-4); --v3d-arm-5: var(--v3d-pb-arm-5); --v3d-arm-6: var(--v3d-pb-arm-6); --v3d-arm-7: var(--v3d-pb-arm-7); --v3d-arm-8: var(--v3d-pb-arm-8); }
+.v3d[data-tema='pb'] { --v3d-def-1: var(--v3d-pb-def-1); --v3d-def-2: var(--v3d-pb-def-2); --v3d-def-3: var(--v3d-pb-def-3); --v3d-def-4: var(--v3d-pb-def-4); --v3d-def-5: var(--v3d-pb-def-5); }
+/* deformada (V3): legenda no rodapé da vista, tabelas de deslocamentos e perfil da flecha */
+.v3d-def-leg { display: flex; gap: 8px; align-items: center; padding: 3px 10px; font-size: 11.5px; border-top: 1px solid var(--line); background: var(--surface); }
+.v3d-def-rampa { flex: 0 0 220px; height: 10px; border-radius: 3px; border: 1px solid var(--line); background: linear-gradient(90deg, var(--v3d-def-1), var(--v3d-def-2), var(--v3d-def-3), var(--v3d-def-4), var(--v3d-def-5)); }
+.v3d-def-leg .num { font-family: var(--font-num); }
+.desloc-aba { display: flex; flex-direction: column; gap: 12px; padding: 10px; overflow: auto; }
+.desloc-aba .row { align-items: flex-end; flex-wrap: wrap; gap: 8px 12px; }
+.flecha-perfil { width: 100%; max-width: 640px; height: auto; background: var(--v3d-claro-fundo); border: 1px solid var(--line); border-radius: var(--radius); }
+.flecha-perfil .fp-eixo { stroke: var(--v3d-claro-linha); stroke-width: 1px; vector-effect: non-scaling-stroke; opacity: 0.5; }
+.flecha-perfil .fp-curva { fill: none; stroke: var(--v3d-claro-selecao); stroke-width: 2px; vector-effect: non-scaling-stroke; }
+.flecha-perfil .fp-ref { fill: none; stroke: var(--v3d-claro-linha); stroke-width: 1.2px; stroke-dasharray: 6 4; vector-effect: non-scaling-stroke; }
+.flecha-perfil .fp-txt { fill: var(--v3d-claro-linha); font: 11px var(--font-num); }
 .corte-folha { background: var(--v3d-claro-fundo); border: 1px solid var(--line); border-radius: var(--radius); overflow: auto; padding: 8px; }
 .corte-svg { display: block; width: 100%; height: auto; max-height: 68vh; }
 .corte-svg .corte-sec { fill: var(--v3d-claro-laje); stroke: var(--v3d-claro-linha); stroke-width: 1.4px; vector-effect: non-scaling-stroke; }
```
