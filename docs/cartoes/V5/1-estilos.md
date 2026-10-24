# Cartão V5-1 — estilos das cargas por caso e dos esforços

Executor: Haiku. Primeiro cartão. Só `src/app/design/global.css`. Regras em `0-leia-primeiro.md`.

## Comportamento
- Tokens `--carga-caso-g`, `-q`, `-w`, `-e`, `-h` e `--carga-caso-adic-0` a `-5` e as classes `carga-caso-*` que `src/core/resultados/cargasCaso.ts` devolve (`classeDoCaso`).
- Classes `esf-*` dos diagramas, da seção do concreto e das vigotas. Reaproveita `isov-janelas`, `isov-janela` da V4.

## Rótulos
Nenhum (só estilo).

## Edições

**Trocar em** `src/app/design/global.css`
```text
--iso-9: #c95a3c; --iso-10: #a02a2a;
```
por
```text
--iso-9: #c95a3c; --iso-10: #a02a2a;
  /* cargas por caso (V5, K1.11.11): natureza G, Q, W, E, H e casos adicionais */
  --carga-caso-g: #2b6cb0; --carga-caso-q: #c05621; --carga-caso-w: #2f855a; --carga-caso-e: #805ad5; --carga-caso-h: #b7791f;
  --carga-caso-adic-0: #d53f8c; --carga-caso-adic-1: #319795; --carga-caso-adic-2: #718096; --carga-caso-adic-3: #9c4221; --carga-caso-adic-4: #5a67d8; --carga-caso-adic-5: #38a169;
```

**Trocar em** `src/app/design/global.css`
```text
.iso-ext-max { stroke: var(--ink-strong); } .iso-ext-min { stroke: var(--muted); stroke-dasharray: 3 2; }
```
por
```text
.iso-ext-max { stroke: var(--ink-strong); } .iso-ext-min { stroke: var(--muted); stroke-dasharray: 3 2; }

/* esforços por hipótese (V5): diagramas de M, V, N e T, seção do concreto e vistas das vigotas */
.esf-aba { display: flex; flex-direction: column; gap: 12px; padding: 10px; overflow: auto; }
.esf-barra { align-items: flex-end; flex-wrap: wrap; gap: 8px 12px; }
.esf-barra > .field { min-width: 150px; }
.esf-svg { width: 100%; max-height: 300px; background: var(--surface); }
.esf-eixo { stroke: var(--line-strong); stroke-width: 1px; fill: none; vector-effect: non-scaling-stroke; }
.esf-curva { fill: none; stroke: var(--accent-text); stroke-width: 1.8px; vector-effect: non-scaling-stroke; }
.esf-curva-min { fill: none; stroke: var(--muted); stroke-width: 1.4px; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
.esf-area { fill: var(--accent-soft); stroke: none; opacity: 0.7; }
.esf-valor { fill: var(--ink-strong); font: 10px var(--font-num); paint-order: stroke; stroke: var(--surface); stroke-width: 2px; }
.esf-sec-conc { fill: var(--sunken); stroke: var(--ink-strong); stroke-width: 1.2px; vector-effect: non-scaling-stroke; }
.esf-sec-tens { fill: var(--accent-soft); stroke: var(--accent-text); stroke-width: 1px; vector-effect: non-scaling-stroke; }
.esf-sec-ln { stroke: var(--ink-strong); stroke-width: 1.2px; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
.esf-barra-aco { fill: var(--ink-strong); }
.esf-barra-aco-esc { fill: var(--accent-text); }
.esf-vig-faixa { stroke: var(--ink); stroke-width: 1px; fill: none; vector-effect: non-scaling-stroke; }
.esf-vig-rot { fill: var(--ink-strong); font: 11px var(--font-num); paint-order: stroke; stroke: var(--surface); stroke-width: 2px; }
.carga-caso-g { stroke: var(--carga-caso-g); color: var(--carga-caso-g); } .carga-caso-q { stroke: var(--carga-caso-q); color: var(--carga-caso-q); }
.carga-caso-w { stroke: var(--carga-caso-w); color: var(--carga-caso-w); } .carga-caso-e { stroke: var(--carga-caso-e); color: var(--carga-caso-e); }
.carga-caso-h { stroke: var(--carga-caso-h); color: var(--carga-caso-h); }
.carga-caso-adic-0 { stroke: var(--carga-caso-adic-0); color: var(--carga-caso-adic-0); } .carga-caso-adic-1 { stroke: var(--carga-caso-adic-1); color: var(--carga-caso-adic-1); }
.carga-caso-adic-2 { stroke: var(--carga-caso-adic-2); color: var(--carga-caso-adic-2); } .carga-caso-adic-3 { stroke: var(--carga-caso-adic-3); color: var(--carga-caso-adic-3); }
.carga-caso-adic-4 { stroke: var(--carga-caso-adic-4); color: var(--carga-caso-adic-4); } .carga-caso-adic-5 { stroke: var(--carga-caso-adic-5); color: var(--carga-caso-adic-5); }
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`.
