# Cartão L2-02 — Classes do lançamento por camada e dos gabaritos

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões anteriores na ordem do índice; o núcleo da L2 (`lancamentoDxf.ts`, `commands/lancamento.ts`, `dwgLeitor.ts`, comandos `mascara.*`) já está no repositório. Não edite o núcleo.

## Objetivo
Classes de `global.css` usadas pelo assistente, pelo gerenciador e pela prévia de camadas (a regra do projeto é CSS só em `src/app/design`). Itens: C1.19, C2.11. Classe sugerida: Haiku, esforço baixo.

## Arquivos
1. `src/app/design/global.css` (editar)

Leia antes: `src/app/design/global.css` (bloco `.nova-obra`, linha ~900, como modelo).

## Editar `src/app/design/global.css`
Faça as trocas abaixo, na ordem. Em cada uma, o trecho “Procure” aparece uma única vez no arquivo (copie-o exatamente, com os espaços); substitua-o pelo trecho “Coloque”.

### Troca 1
**Procure:**
````css
.nova-obra table.data input { min-width: 0; }
````
**Coloque:**
````css
.nova-obra table.data input { min-width: 0; }
/* L2: lançamento por camada, gabaritos e vistas */
.lanc { display: grid; gap: 10px; min-height: 300px; align-content: start; }
.lanc-corpo { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 12px; align-items: start; }
.lanc-rodape { display: flex; gap: 8px; align-items: center; justify-content: flex-end; padding-top: 6px; border-top: 1px solid var(--line); }
.lanc-amb { display: grid; gap: 4px; }
.lanc table.data input[type='color'] { width: 34px; padding: 0; }
.vistas-pav { min-width: 90px; }
.edif table.data tr.lancado td:first-child { box-shadow: inset 2px 0 0 var(--accent); }
.prev-cv { width: 100%; height: 280px; background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius); }
.prev-cv { stroke: var(--faint); }
.prev-ln { fill: none; stroke-width: 1; vector-effect: non-scaling-stroke; }
.prev-ln.papel-texto, .prev-ln.papel-parede, .prev-ln.papel-ignorar { stroke: var(--faint); }
.prev-ln.papel-pilar, .prev-ln.papel-pilarParede { stroke: var(--ink-strong); stroke-width: 2; }
.prev-ln.papel-vigaFaces, .prev-ln.papel-vigaEixo { stroke: var(--accent-text); stroke-width: 1.4; }
.prev-ln.papel-contorno { stroke: var(--warn); }
.prev-ln.papel-abertura { stroke: var(--bad); }
.prev-ln.papel-eixo { stroke: var(--muted); stroke-dasharray: 6 3; }
.prev-ln.papel-pontoFixo { stroke: var(--ok); stroke-width: 2; }
````

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```

## Pontos de atenção
- `design.test.ts` reprova cor literal e classe sem definição: as cores usam só os tokens (`--ink-strong`, `--accent-text`, `--warn`, `--bad`, `--ok`, `--muted`, `--faint`, `--paper`, `--line`).
