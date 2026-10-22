# Cartão V2-1 — tokens e classes de estilo

Executor: Haiku. Primeiro da ordem. Só CSS; não altere TS/TSX.

## O que entra
- `src/app/design/global.css`: no `:root`, oito cores de armadura `--v3d-arm-1` … `--v3d-arm-8` e os oito tons de cinza do tema p&b `--v3d-pb-arm-*`; a regra `.v3d[data-tema='pb']` religa `--v3d-arm-n` aos tons de cinza; as classes da elevação (`.corte-folha`, `.corte-svg` e filhas `.corte-sec`, `.corte-s-<tipo>`, `.corte-hach`, `.corte-hachura`, `.corte-visto`, `.corte-nivel`, `.corte-eixo`, `.corte-balao`, `.corte-cota`, `.corte-txt`), a lista (`.corte-lista`, `.corte-item`) e a aba 3D (`.armadura3d`, `.armadura3d-cv`).
- `src/app/design/memorial.css`: o mesmo SVG no papel, escopo `.memo .corte-svg …`, só com tokens `--m-*`.

As classes `corte-*` são as que o SVG de `desenharCorte` / `secaoDoPavimento` já traz; elas só mudam de aparência aqui.

## Diff esperado
```diff
diff --git a/src/app/design/global.css b/src/app/design/global.css
index d9090a5..e9d706c 100644
--- a/src/app/design/global.css
+++ b/src/app/design/global.css
@@ -138,6 +138,9 @@
   --v3d-claro-escada: #717171; --v3d-claro-fundacao: #a0a0a0; --v3d-claro-pendente: #3b63fb; --v3d-claro-linha: #131313; --v3d-claro-selecao: #3b63fb; --v3d-claro-destaque: #131313;
   --v3d-pb-fundo: #FFFFFF; --v3d-pb-pilar: #222222; --v3d-pb-viga: #6A6A6A; --v3d-pb-laje: #BDBDBD; --v3d-pb-parede: #8A8A8A;
   --v3d-pb-escada: #4A4A4A; --v3d-pb-fundacao: #999999; --v3d-pb-pendente: #000000; --v3d-pb-linha: #000000; --v3d-pb-selecao: #000000; --v3d-pb-destaque: #555555;
+  /* armaduras em 3D (V2): oito cores por bitola, tipo ou elemento (ciclo); no tema p&b, oito tons de cinza */
+  --v3d-arm-1: #e4572e; --v3d-arm-2: #2e86ab; --v3d-arm-3: #76b041; --v3d-arm-4: #f5b700; --v3d-arm-5: #8f5bd6; --v3d-arm-6: #17a398; --v3d-arm-7: #d65db1; --v3d-arm-8: #9c8b6e;
+  --v3d-pb-arm-1: #000000; --v3d-pb-arm-2: #333333; --v3d-pb-arm-3: #555555; --v3d-pb-arm-4: #777777; --v3d-pb-arm-5: #222222; --v3d-pb-arm-6: #444444; --v3d-pb-arm-7: #666666; --v3d-pb-arm-8: #888888;
   /* grupos de pavimentos (marca por grupo; classe .grupo-c<i>): tons de cinza e o destaque */
   --grupo-0: #6995fe; --grupo-1: #f2f2f2; --grupo-2: #afafaf; --grupo-3: #8a8a8a;
   --grupo-4: #dbdbdb; --grupo-5: #6d6d6d; --grupo-6: #c4c4c4; --grupo-7: #555555;
@@ -857,6 +860,28 @@ tr.sel td { background: var(--accent-soft); }
 .v3d-iso .v3d-sh3 { filter: brightness(0.58); }
 .v3d-iso .v3d-f.v3d-sel { fill: var(--v3d-selecao); stroke: var(--v3d-selecao); fill-opacity: 1; }
 .v3d-iso .v3d-rotulo { fill: var(--v3d-pendente); font: 700 40px var(--font-ui); }
+/* cortes e seções (V2): elevação em SVG sobre a folha clara; o mesmo SVG vai para o memorial (memorial.css, escopo .memo) */
+.v3d[data-tema='pb'] { --v3d-arm-1: var(--v3d-pb-arm-1); --v3d-arm-2: var(--v3d-pb-arm-2); --v3d-arm-3: var(--v3d-pb-arm-3); --v3d-arm-4: var(--v3d-pb-arm-4); --v3d-arm-5: var(--v3d-pb-arm-5); --v3d-arm-6: var(--v3d-pb-arm-6); --v3d-arm-7: var(--v3d-pb-arm-7); --v3d-arm-8: var(--v3d-pb-arm-8); }
+.corte-folha { background: var(--v3d-claro-fundo); border: 1px solid var(--line); border-radius: var(--radius); overflow: auto; padding: 8px; }
+.corte-svg { display: block; width: 100%; height: auto; max-height: 68vh; }
+.corte-svg .corte-sec { fill: var(--v3d-claro-laje); stroke: var(--v3d-claro-linha); stroke-width: 1.4px; vector-effect: non-scaling-stroke; }
+.corte-svg .corte-s-pilar { fill: var(--v3d-claro-pilar); } .corte-svg .corte-s-viga { fill: var(--v3d-claro-viga); } .corte-svg .corte-s-laje { fill: var(--v3d-claro-laje); }
+.corte-svg .corte-s-parede { fill: var(--v3d-claro-parede); } .corte-svg .corte-s-escada { fill: var(--v3d-claro-escada); } .corte-svg .corte-s-fundacao { fill: var(--v3d-claro-fundacao); }
+.corte-svg .corte-hach { stroke: none; }
+.corte-svg .corte-hachura { stroke: var(--v3d-claro-linha); stroke-width: 1.2px; opacity: 0.5; }
+.corte-svg .corte-visto { fill: none; stroke: var(--v3d-claro-destaque); stroke-width: 0.7px; opacity: 0.6; vector-effect: non-scaling-stroke; }
+.corte-svg .corte-nivel { stroke: var(--v3d-claro-selecao); stroke-width: 1px; stroke-dasharray: 12 6; vector-effect: non-scaling-stroke; }
+.corte-svg .corte-nivel.fundacao { stroke-dasharray: 3 5; }
+.corte-svg .corte-eixo { stroke: var(--v3d-claro-destaque); stroke-width: 0.8px; stroke-dasharray: 16 4 3 4; vector-effect: non-scaling-stroke; }
+.corte-svg .corte-balao { fill: var(--v3d-claro-fundo); stroke: var(--v3d-claro-linha); stroke-width: 1px; vector-effect: non-scaling-stroke; }
+.corte-svg .corte-cota { stroke: var(--v3d-claro-linha); stroke-width: 0.8px; fill: none; vector-effect: non-scaling-stroke; }
+.corte-svg .corte-txt { fill: var(--v3d-claro-linha); font: 22px var(--font-num); }
+.corte-svg .corte-txt.nivel { fill: var(--v3d-claro-selecao); }
+.corte-svg .corte-txt.eixo { font-weight: 700; }
+.armadura3d { flex: none; }
+.armadura3d .armadura3d-cv { flex: none; height: 420px; }
+.corte-lista { display: flex; flex-direction: column; gap: 6px; }
+.corte-item { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--line); }
 
 /* ações e combinações (N2a): situações do usuário, empuxo de terra e ábacos de vento */
 .gp-par { display: inline-flex; flex-direction: column; gap: 2px; }
diff --git a/src/app/design/memorial.css b/src/app/design/memorial.css
index e66c1b1..2ed98c1 100644
--- a/src/app/design/memorial.css
+++ b/src/app/design/memorial.css
@@ -95,3 +95,16 @@ html,body{background:var(--m-paper)!important}
 .memo p{orphans:3;widows:3}
 }
 .memo .avoid{break-inside:avoid}
+
+/* cortes e seções (V2) */
+.memo .corte-svg{display:block;width:100%;height:auto;max-height:420px}
+.memo .corte-svg .corte-sec{fill:var(--m-line);stroke:var(--m-ink);stroke-width:1.2px;vector-effect:non-scaling-stroke}
+.memo .corte-svg .corte-s-pilar{fill:var(--m-muted-fig)}
+.memo .corte-svg .corte-hach{stroke:none}
+.memo .corte-svg .corte-hachura{stroke:var(--m-ink);stroke-width:1px;opacity:.55}
+.memo .corte-svg .corte-visto{fill:none;stroke:var(--m-faint);stroke-width:.6px;vector-effect:non-scaling-stroke}
+.memo .corte-svg .corte-nivel{stroke:var(--m-muted);stroke-width:.8px;stroke-dasharray:12 6;vector-effect:non-scaling-stroke}
+.memo .corte-svg .corte-eixo{stroke:var(--m-muted);stroke-width:.7px;stroke-dasharray:16 4 3 4;vector-effect:non-scaling-stroke}
+.memo .corte-svg .corte-balao{fill:var(--m-paper);stroke:var(--m-ink);stroke-width:.9px;vector-effect:non-scaling-stroke}
+.memo .corte-svg .corte-cota{stroke:var(--m-ink);stroke-width:.7px;fill:none;vector-effect:non-scaling-stroke}
+.memo .corte-svg .corte-txt{fill:var(--m-ink);font:22px var(--m-font-num)}
```

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design/design.test.ts
```
Esperado: 10 testes passam (o teste dos tokens exige que `--v3d-arm-*` estejam no `:root` puro, antes dos blocos de tema).
