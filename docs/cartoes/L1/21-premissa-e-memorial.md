# Cartão L1-21 — Premissa `assistente` e descrição/origem no memorial

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 01 e 02.

## Objetivo
Registrar as premissas da L1 (visíveis no app, no MCP e no memorial) e mostrar descrição e origem do lançamento na capa do memorial do edifício. Itens: C1.14, K1.9.2.

## Arquivos
1. `src/core/building/premissas.ts` (editar)
2. `src/app/edificio/MemorialEdificio.tsx` (editar)
Leia antes: o fim da lista `PREMISSAS` em `premissas.ts` (última entrada `n2e-cargas`) e o bloco `<dl className="id">` em `MemorialEdificio.tsx` (~linha 120).

## `premissas.ts`
1. Acrescente aos imports de `./types`: nada além do que já há; importe `categoriasDeUso` de `./categoriasUso`: `import { categoriasDeUso } from './categoriasUso';`.
2. Antes do `];` que fecha `PREMISSAS`, acrescente a entrada:
```ts
  { id: 'assistente', tema: 'Obra', texto: `Assistente de nova obra (L1): descrição de até 2 linhas de 120 caracteres; primeiro pavimento na cota 0 e cada pavimento seguinte a um pé-direito do anterior; "repetições" cria pavimentos-tipo no mesmo grupo (nome com número); um grupo por linha de pavimentos, com revestimento único (padrão 1,0 kN/m²); a obra gerada sai de um comando único (um passo no histórico). Sobrecargas por categoria de uso (NBR 6120:2019, Tabela 10): ${categoriasDeUso().map((c) => `${c.rotulo.split(' (')[0].toLowerCase()} ${String(c.q).replace('.', ',')}`).join('; ')} kN/m²; as categorias além das 7 do modelo apontam para uma delas (classe de ψ) e têm os valores a conferir na edição vigente. Importação de texto de cargas: decimal com vírgula ou ponto; sem dimensão da base, arranque de 30 × 30 cm; sem posição, arranques em linha a cada 5 m. Obras recentes: 6 últimas (nome distinto) e histórico de até 500 aberturas, só metadados em localStorage; edifício na biblioteca até 240 KB; arquivo com até 20 versões (3 MB) e resultados (5 MB). Lançamento por DXF/DWG e por IFC, muros e escadas ficam indisponíveis até as frentes L2, L3, E1c e E4.`, fonte: 'Programa de referência (assistente, 6 obras recentes, 2 linhas de descrição); NBR 6120:2019, Tabela 10; critérios do app nos limites', aConfirmar: true },
```

## `MemorialEdificio.tsx`
1. Acrescente `ORIGEM_ROTULO` ao import de `'../../core/building/types'` da linha 19 (mesma linha: `… USOS, VENTO_PADRAO, ORIGEM_ROTULO }`).
2. No `<dl className="id">`, depois da linha `<dt>Obra</dt><dd>{b.obra.nome || '—'}</dd>`, insira:
`{b.obra.descricao?.length ? <><dt>Descrição</dt><dd>{b.obra.descricao.join(' · ')}</dd></> : null}`
e, depois da linha do `Local`, insira:
`<dt>Origem do lançamento</dt><dd>{ORIGEM_ROTULO[b.obra.origem ?? 'vazio']}</dd>`
3. Se o HTML exportado (função `html()`) usa o mesmo `docRef` do conteúdo, nada mais muda; se montar um cabeçalho próprio com `b.obra.nome`, repita as duas linhas ali.

## Verificação
```bash
npx tsc -b && npx vitest run src/core/building src/core/checklists.test.ts
```
Nenhum teste existente deve quebrar (há testes que listam premissas e que cobrem o memorial por e2e; se algum teste de premissas reclamar de texto longo ou duplicado, relate sem alterar a premissa).
