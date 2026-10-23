# D1 — cartão 01: tokens e estilos novos (só CSS)

Classe: Haiku (CSS pronto, validado com `design.test`).

## Arquivos
- `src/app/design/global.css` (1 arquivo).

## O que fazer
1. No primeiro bloco `:root` (o que tem `--h-ctl-lg: 32px;`), logo depois de `--h-ctl-lg: 32px;`, acrescente a linha `  --h-ribbon: 56px;`. Nenhum outro token novo: faixa, docas, árvore e abas usam os tokens existentes (`--accent-soft`, `--accent-text`, `--surface`, `--line`…). A largura das docas é por doca (guardada no layout), não por token.
2. No fim do arquivo acrescente o bloco abaixo, sem alterar nenhuma regra existente (as trocas de grade de `.app`, `.main`, `.edif` e `.fund` ficam na D2).
3. Na lista de transições (a regra que começa com `.btn, .tbtn, .tool, .chip,`), acrescente `.rtab, .rbtn, .tn, .vtabs button, .modtabs button,` depois de `.tool,`.

```css
/* ---- layout inspirado no BIMCraft (D1): módulos, faixa de comandos, docas, árvore, abas de vista ---- */
.work { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; min-width: 0; }
.qbar { flex-wrap: wrap; row-gap: var(--sp-2); }
.modtabs { display: flex; gap: var(--sp-1); padding: var(--sp-2) var(--sp-3) 0; background: var(--bg); border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: thin; }
.modtabs button { height: var(--h-ctl-lg); padding: 0 var(--sp-5); border: 1px solid transparent; border-bottom: 0; border-radius: var(--radius) var(--radius) 0 0; background: none; color: var(--muted); font-weight: 600; white-space: nowrap; }
.modtabs button:hover { background: var(--hover); color: var(--ink); }
.modtabs button[aria-selected="true"] { background: var(--surface); color: var(--accent-text); border-color: var(--line); margin-bottom: -1px; }
.ribbon-wrap { background: var(--surface); border-bottom: 1px solid var(--line); min-width: 0; }
.rtabs { display: flex; align-items: flex-end; gap: var(--sp-1); padding: 0 var(--sp-3); border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: thin; }
.rtab { height: var(--h-ctl-lg); padding: 0 var(--sp-4); border: 0; border-bottom: 2px solid transparent; background: none; color: var(--muted); font-weight: 600; white-space: nowrap; }
.rtab:hover { background: var(--hover); color: var(--ink); }
.rtab.on { color: var(--accent-text); border-bottom-color: var(--accent); }
.rtab.ctx { color: var(--accent-text); background: var(--accent-soft); }
.rtab-toggle { margin-left: auto; height: var(--h-ctl-lg); padding: 0 var(--sp-3); border: 0; background: none; color: var(--muted); }
.ribbon { display: flex; align-items: stretch; gap: 0; padding: var(--sp-2) var(--sp-3); min-height: calc(var(--h-ribbon) + var(--sp-6)); overflow-x: auto; scrollbar-width: thin; }
.rgrp { display: flex; flex-direction: column; padding: 0 var(--sp-3); border-right: 1px solid var(--line); }
.rgrp:first-child { padding-left: 0; }
.rgrp:last-child { border-right: 0; }
.rbtns { display: flex; gap: var(--sp-1); flex: 1; align-items: stretch; }
.rl { text-align: center; color: var(--faint); font-size: var(--fs-sm); padding-top: var(--sp-1); white-space: nowrap; }
.rbtn { min-width: 52px; height: var(--h-ribbon); padding: var(--sp-2) var(--sp-3); border: 0; border-radius: var(--radius); background: none; color: var(--ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-2); }
.rbtn .icone { width: 22px; height: 22px; }
.rbtn:hover:not(:disabled) { background: var(--hover); }
.rbtn[aria-pressed="true"], .rbtn[aria-checked="true"] { background: var(--accent-soft); color: var(--accent-text); }
.rbl { font-size: var(--fs); white-space: nowrap; }
.rhint { color: var(--faint); font-size: var(--fs); align-self: center; }
.dock { position: relative; display: flex; flex-direction: column; min-width: 0; max-width: 100%; min-height: 0; background: var(--surface); }
.dock.l { border-right: 1px solid var(--line); }
.dock.r { border-left: 1px solid var(--line); }
.dock.off { width: 20px; }
.dock.off .dock-in { display: none; }
.dock-in { flex: 1; min-height: 0; display: flex; flex-direction: column; min-width: 0; }
.dock-in > * { flex: 1; min-height: 0; }
.dock-toggle { position: absolute; top: 0; z-index: 3; width: 18px; height: 18px; padding: 0; border: 0; background: var(--surface-2); color: var(--muted); line-height: 1; border-radius: var(--radius-sm); }
.dock.l .dock-toggle { right: 0; }
.dock.r .dock-toggle { left: 0; }
.dock.off .dock-toggle { left: 1px; right: auto; }
.dock-grip { position: absolute; top: 0; bottom: 0; width: 5px; cursor: col-resize; z-index: 2; touch-action: none; }
.dock.l .dock-grip { right: -3px; }
.dock.r .dock-grip { left: -3px; }
.dock-grip:hover, .dock-grip:focus-visible { background: var(--accent); }
.pal { display: flex; flex-direction: column; min-height: 0; border-bottom: 1px solid var(--line); }
.pal.grow { flex: 1; }
.phead { height: var(--h-ctl-lg); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--sp-4); font-weight: 600; color: var(--ink-strong); border-bottom: 1px solid var(--line); }
.pbody { overflow: auto; min-height: 0; }
.tree { list-style: none; margin: 0; padding: var(--sp-2) 0; }
.tree ul { list-style: none; margin: 0; padding: 0; }
.tn { width: 100%; height: var(--h-ctl); display: flex; align-items: center; gap: var(--sp-2); border: 0; background: none; color: var(--ink); text-align: left; padding-right: var(--sp-3); }
.tn:hover { background: var(--hover); }
.tn[aria-selected="true"] { background: var(--accent-soft); color: var(--accent-text); }
.tn .chev { width: 12px; height: 12px; fill: none; stroke: var(--muted); stroke-width: 1.5; }
.tn[aria-expanded="true"] .chev { transform: rotate(90deg); }
.tn .sp { width: 12px; flex: none; }
.tn .cnt { margin-left: auto; color: var(--faint); font-size: var(--fs-sm); }
.tn .tl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chev-w { display: inline-flex; }
.l1 > .tn { padding-left: var(--sp-3); }
.l2 > .tn { padding-left: var(--sp-6); }
.l3 > .tn { padding-left: calc(var(--sp-6) + var(--sp-5)); }
.l4 > .tn { padding-left: calc(var(--sp-6) + 2 * var(--sp-5)); }
.l5 > .tn { padding-left: calc(var(--sp-6) + 3 * var(--sp-5)); }
.vtabs { display: flex; gap: var(--sp-1); padding: var(--sp-2) var(--sp-3) 0; background: var(--surface); border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: thin; }
.vtabs button { height: var(--h-ctl); padding: 0 var(--sp-4); border: 1px solid transparent; border-bottom: 0; border-radius: var(--radius) var(--radius) 0 0; background: none; color: var(--muted); font-size: var(--fs); font-weight: 600; white-space: nowrap; flex: none; }
.vtabs button:hover { background: var(--hover); color: var(--ink); }
.vtabs button.on, .vtabs button[aria-selected="true"] { background: var(--accent-soft); color: var(--accent-text); }
@media (max-width: 900px) {
  .dock, .dock-in { display: contents; }
  .dock-grip, .dock-toggle { display: none; }
}
```

## Verificação
- `npx vitest run src/app/design` (10 testes verdes: toda classe definida, tokens no `:root`, sem cor literal).
- `npx tsc -b` (nada de TS muda).

## Regras
Sem cor literal, sem `transition: all`, sem `text-transform: uppercase`. Não mexer em `.app`, `.main`, `.edif`, `.fund` nem em `.edif-tabs` (D2). Observação: `.dock` com largura percentual dentro de coluna `auto` do grid zera a coluna vizinha; a largura da doca é sempre em px (cartão 03).
