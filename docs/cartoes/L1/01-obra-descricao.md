# Cartão L1-01 — Descrição e origem da obra (modelo e comando)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Comentários em português.

## Objetivo
`Obra` ganha `descricao` (até 2 linhas) e `origem`; `obra.definir` passa a gravá-las. Itens: K1.9.2, C1.14.

## Arquivos
1. `src/core/building/types.ts` (editar)
2. `src/core/commands/obra.ts` (editar)
3. `src/core/commands/commands.test.ts` (editar)

## Passo 1 — `types.ts`
Imediatamente antes de `export interface Obra {` (linha ~12) insira exatamente:
```ts
/** Como a obra foi lançada (memorial e lista de obras; L1). Ausente = lançamento manual. */
export type OrigemObra = 'vazio' | 'padrao' | 'assistente' | 'dxf' | 'ifc' | 'exemplo' | 'texto';
export const ORIGEM_ROTULO: Record<OrigemObra, string> = {
  vazio: 'Lançamento manual (obra vazia)', padrao: 'Edifício padrão', assistente: 'Assistente de nova obra',
  dxf: 'Lançamento a partir de DXF/DWG', ifc: 'Importação de IFC', exemplo: 'Obra de exemplo', texto: 'Arquivo de texto de cargas (obra só de arranques)',
};
```
Dentro de `interface Obra`, logo depois da linha `cidade?: string;`, acrescente:
```ts
  /** Descrição da obra: até 2 linhas de até 120 caracteres (K1.9.2). */
  descricao?: string[];
  origem?: OrigemObra;
```

## Passo 2 — `obra.ts`
Em `registrar<{ nome?: string; cidade?: string; profundidadeFundacao?: number }>({ nome: 'obra.definir' …` faça:
- troque o tipo genérico por `{ nome?: string; cidade?: string; profundidadeFundacao?: number; descricao?: string[]; origem?: OrigemObra }` e acrescente `OrigemObra` e `ORIGEM_ROTULO` ao `import … from '../building/types'` da linha 4 (o `ORIGEM_ROTULO` é usado no schema).
- `descricao` do comando: `'Altera os dados gerais da obra (nome, cidade, descrição em até 2 linhas, origem do lançamento, profundidade da fundação abaixo do pavimento mais baixo).'`
- no `properties` do schema, depois de `cidade`, acrescente:
  `descricao: { type: 'array', maxItems: 2, items: { type: 'string' }, description: 'Até 2 linhas de até 120 caracteres; lista vazia apaga' },`
  `origem: { type: 'string', enum: Object.keys(ORIGEM_ROTULO), description: 'Origem do lançamento' },`
- acrescente `validar(_b, p)`: se `p.descricao` existe e alguma linha tem `trim().length > 120`, devolva `err('DESCRICAO_LONGA', 'Cada linha da descrição aceita até 120 caracteres.')`; senão `[]`. (`err` já existe no arquivo.)
- em `aplicar`, antes do `return`, acrescente:
```ts
    if (p.descricao !== undefined) { const l = p.descricao.map((x) => x.trim()).filter(Boolean); if (l.length) d.obra.descricao = l; else delete d.obra.descricao; }
    if (p.origem !== undefined) d.obra.origem = p.origem;
```

## Passo 3 — `commands.test.ts`
1. No `EXEMPLOS`, troque a linha de `'obra.definir'` por:
`'obra.definir': () => ({ nome: 'Outro', profundidadeFundacao: 2, descricao: ['Residencial de 5 pavimentos', 'Fase de anteprojeto'], origem: 'assistente' }),`
2. Ao fim do arquivo (dentro de um novo `describe('obra.definir: descrição e origem', () => { … })`) escreva:
   - `it('grava a descrição aparada e a origem')`: `const s = new Sessao(base())`; executar `obra.definir { descricao: ['  A  ', '', 'B'] }` → `s.modelo.obra.descricao` igual a `['A', 'B']`; executar `{ origem: 'texto' }` → `s.modelo.obra.origem === 'texto'`; `{ descricao: [] }` → `s.modelo.obra.descricao` é `undefined`.
   - `it('recusa mais de 2 linhas e linha com mais de 120 caracteres')`: `{ descricao: ['a', 'b', 'c'] }` → `ok` false; `{ descricao: ['x'.repeat(121)] }` → `ok` false e `erros[0].codigo === 'DESCRICAO_LONGA'`; `{ origem: 'xyz' }` → `ok` false.
   (`Sessao` e `base` já existem no arquivo; confira os imports no topo.)

## Premissa
Limites 2 linhas × 120 caracteres: padrão do programa de referência (2 linhas); 120 é critério do app, "a confirmar" (entra na premissa `assistente` do cartão 21).

## Checklist
Não edite checklists aqui (cartão 24).

## Verificação
```bash
npx tsc -b && npx vitest run src/core/commands/commands.test.ts
```
Deve terminar sem erro de tipos e com todos os testes verdes.
