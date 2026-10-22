# Cartão L1-19 — Grupos "Etapas da obra" e "Arquivo e versões"

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 05, 10, 11 e 12.

## Objetivo
Guia de etapas na lateral do edifício e controles do que o arquivo `.statikos` inclui, com recuperação de versões. Itens: C1.16, C1.28, C1.29, C1.48.

## Arquivos
1. `src/app/edificio/EtapasObra.tsx` (criar)
Leia antes: `src/core/building/etapas.ts`, `src/app/edificio/store.ts` (`opcoesArquivo`, `setOpcoesArquivo`, `versoesArquivo`, `avisosArquivo`, `recuperarVersao`, `calculoAtual`), `Group`, `Pill`, `Check`, `Select`, `NumField`, `Button`, `Hint`, `Note` em `ui`, e um grupo existente como `src/app/edificio/Vinculos.tsx` (`VinculosGrupo`).

## `EtapasGrupo`
```tsx
export function EtapasGrupo({ b, aoIr }: { b: BuildingModel; aoIr(id: EtapaId): void })
```
- `const calculado = useBuilding((s) => calculoAtual(s))` (importe `calculoAtual` de `./store`); `const et = etapasDaObra(b, calculado)`; `const prox = proximaEtapa(et)`.
- `<Group title="Etapas da obra">` com `<div className="etapas">` e, para cada etapa, `<div className={`etapa ${e.estado}`} data-etapa={e.id}>`: `Pill` (`tone`: `feito` → `ok`, `pendente` → `warn`, `indisponivel` → `na`; texto `feito`, `pendente` ou `indisponível`), `<span className="etapa-rotulo">{e.rotulo}</span>`, `<span className="etapa-detalhe">{e.detalhe}</span>` e, quando `e.estado !== 'indisponivel'`, um `Button variant="ghost"` com texto `Ir` e `aria-label={`Ir para ${e.rotulo}`}` → `aoIr(e.id)`.
- Depois da lista, `Hint`: `prox ? `Próxima etapa: ${prox.rotulo}.` : 'Todas as etapas disponíveis estão feitas.'`

## `ArquivoGrupo`
```tsx
export function ArquivoGrupo()
```
- `const { opcoesArquivo, setOpcoesArquivo, versoesArquivo, avisosArquivo, recuperarVersao } = useBuilding();`
- `<Group title="Arquivo e versões" open={false}>`:
  - `NumField` "Versões anteriores no arquivo" (valor `opcoesArquivo.versoes`; ao mudar `setOpcoesArquivo({ versoes: Math.min(20, Math.max(0, Math.round(v))) })`);
  - `Check` "Incluir os resultados do último cálculo" (→ `setOpcoesArquivo({ resultados: v })`);
  - `Hint`: `Vale para o próximo Arquivo › Salvar no computador. Versões = a obra logo antes de cada um dos últimos comandos (até 20); o arquivo cresce com elas (limite de 3 MB para versões e 5 MB para resultados, com aviso).`
  - se `avisosArquivo.length`: um `Note` por aviso.
  - se `versoesArquivo.length`: `<h4>Versões do arquivo aberto</h4>` e uma `Select<number>` rotulada "Recuperar versão" com opções `{ v: v.indice, label: `${v.indice + 1} — antes de ${v.rotulo}` }` (valor inicial: a de maior índice; estado local `escolhida`) e `Button` `Recuperar` → `recuperarVersao(escolhida)`. Sem versões: `Hint` `O arquivo aberto não traz versões anteriores.`

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts src/core/building/etapas.test.ts
```
