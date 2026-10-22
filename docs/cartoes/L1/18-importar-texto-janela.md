# Cartão L1-18 — Janela "Importar cargas de texto"

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 06, 07, 11 e 12.

## Objetivo
Fluxo: nome da obra a criar, escolha do arquivo (ou texto colado), mapeamento de colunas, prévia e criação da obra só de arranques seguida do cálculo das fundações. Itens: C1.41, C1.42, C1.43.

## Arquivos
1. `src/app/edificio/ImportarTexto.tsx` (criar)
Leia antes: `src/core/building/importarArranques.ts` (tipos e funções), `src/app/edificio/store.ts` (`novaObraArranques`, `calcular`), `FilePick`, `TextArea`, `TextField`, `Select`, `Check`, `Modal`, `Alert`, `Note`, `Hint`, `Button`, `Pill` em `ui`, e `src/app/edificio/Fundacao.tsx` (obra só de arranques, FU1).

## Contrato
```tsx
export function ImportarTexto({ onClose, onCriada }: { onClose(): void; onCriada(): void })
```

## Estado
- `nome` (`'Obra de arranques'`), `texto` (`''`), `arquivo` (`''`, nome do arquivo escolhido), `separador: Separador` (`'auto'`), `larguras` (`''`), `cabecalho` (`true`), `map: Mapeamento` (`{}`), `un: UnidadesTexto` (`{ ...UNIDADES_PADRAO }`).
- `larguraNums = larguras.split(/[;,\s]+/).filter(Boolean).map(Number).filter((n) => n > 0)`.
- `tabela = useMemo(() => lerTabela(texto, { separador, larguras: separador === 'colunas' && larguraNums.length ? larguraNums : undefined }), [...])` (vazia quando `texto.trim() === ''`: `{ linhas: [], separador: 'colunas' }`).
- `res = useMemo(() => (texto.trim() ? importarArranques(texto, map, un, { separador, larguras: …, cabecalho }) : null), [...])`.
- `aoCarregar(t: string, nomeArq: string)`: `setTexto(t); setArquivo(nomeArq);` e `setMap(sugerirMapeamento(lerTabela(t, { separador }).linhas[0] ?? []))`. Também quando o usuário colar texto no `TextArea`, chame `aoCarregar(v, '')`.

## Estrutura (JSX) — `<Modal titulo="Importar cargas de texto" onClose={onClose} larga>`
1. `Hint`: `Arquivo de texto (ASCII) em colunas, ou separado por vírgula, ponto e vírgula ou tabulação, com decimal em vírgula ou ponto. Gera uma obra só de arranques para calcular as fundações.`
2. Linha 1: `TextField` "Nome da obra a criar" (→ `setNome`).
3. Linha 2: `FilePick` `label="Escolher arquivo…"` `accept=".txt,.csv,.asc,.prn,text/plain,text/csv"` `onFile={(f) => f.text().then((t) => aoCarregar(t, f.name))}`; `Hint` com `arquivo ? `Arquivo: ${arquivo}` : 'Nenhum arquivo escolhido.'`. Em seguida `TextArea` "Ou cole o texto aqui" (`rows={6}`, valor `texto`, `onChange={(v) => aoCarregar(v, '')}`).
4. Linha 3 (`row wrap`): `Select` "Separador" com opções `auto` "Detectar", `pontoVirgula` "Ponto e vírgula", `virgula` "Vírgula", `tab` "Tabulação", `colunas` "Espaços ou colunas fixas"; se `separador === 'colunas'`, `TextField` "Larguras das colunas (caracteres)" (vazio = separar por espaços); `Check` "Primeira linha é o título" (→ `cabecalho`).
5. Se há `tabela.linhas.length`: `<h4>Mapeamento das colunas</h4>` e uma `row wrap` de `Select<number>` — um por campo, nesta ordem e com estes rótulos: `Coluna: Pilar` (pilar), `Coluna: Caso (hipótese)` (caso), `Coluna: N`, `Coluna: Hx`, `Coluna: Hy`, `Coluna: Mx`, `Coluna: My`, `Coluna: Base bx`, `Coluna: Base by`, `Coluna: Posição x`, `Coluna: Posição y`. Opções: `{ v: -1, label: '(não usar)' }` e, para cada índice `k` das colunas da primeira linha, `{ v: k, label: `${k + 1} — ${tabela.linhas[0][k]}` }`. Valor `map[campo] ?? -1`; ao mudar: `-1` remove o campo do `map`, senão grava o índice.
6. Linha de unidades (`row wrap`), `Select` cada: `Força` (`kN`, `tf`, `kgf`, `N`), `Momento` (`kN·m`, `tf·m`, `kgf·m`, `kN·cm`, `tf·cm`, `kgf·cm`), `Comprimento (base e posição)` (`m`, `cm`, `mm`); `Check` `N positivo é compressão`.
7. Prévia (só com `res`): se `res.erros.length`, `Alert` com a primeira mensagem; senão `Pill tone="ok"` `${res.arranques.length} arranque(s), ${res.hipoteses.length} hipótese(s)`; `res.avisos` num `Note` (um parágrafo por aviso, no máximo 6, e `... e mais n avisos` se houver mais); tabela `<table className="data">` com as 8 primeiras linhas da `tabela.linhas` (as demais omitidas, com `Hint` `Mostrando 8 de N linhas.`) e, abaixo, tabela dos arranques: `Pilar | Base (cm) | Cargas | N total (kN)` (base `bx×by` em cm, número de cargas, soma dos `N`), com vírgula decimal e 1 casa.
8. Rodapé `<div className="nova-obra-rodape">`: `Button variant="ghost"` `Cancelar`; `Spacer`; `Button variant="primary"` `Criar obra e calcular fundações`, `disabled={!res || res.erros.length > 0 || !res.arranques.length || !nome.trim()}` →
```ts
const r = useBuilding.getState().novaObraArranques(nome.trim(), res!);
if (r.ok) { void useBuilding.getState().calcular(); onCriada(); }
```

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts src/core/building/importarArranques.test.ts
```
O fluxo completo (colar texto, mapear, criar, ver as fundações calculadas) é o e2e `L1` do cartão 23.
