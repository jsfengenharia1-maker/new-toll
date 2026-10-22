# Cartão L1-07 — Comando `obra.importarArranques`

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 01, 04 e 06. `index.ts` já importa `./obraAssistente` (cartão 04).

## Objetivo
Comando composto que cria a obra só de arranques a partir do resultado da importação de texto. Itens: C1.41, C1.42, C1.43.

## Arquivos
1. `src/core/commands/obraAssistente.ts` (editar: acrescentar ao fim)
2. `src/core/commands/commands.test.ts` (editar)
Leia antes: `src/core/building/importarArranques.ts` (tipos `ResultadoArranques`, função `comandosArranques`).

## `obraAssistente.ts`
Acrescente `import { comandosArranques, type ResultadoArranques } from '../building/importarArranques';` aos imports e, ao fim do arquivo:
```ts
registrar<{ nome: string; resultado: ResultadoArranques }>({
  nome: 'obra.importarArranques',
  descricao: 'Cria uma obra só de arranques a partir da importação de um arquivo de texto de cargas: hipóteses (casos), arranques com a dimensão da base e as cargas por hipótese. Em obra existente, acrescenta os arranques.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['nome', 'resultado'], properties: {
    nome: { type: 'string', minLength: 1, description: 'Nome da obra a criar' },
    resultado: { type: 'object', description: 'ResultadoArranques (src/core/building/importarArranques.ts)' },
  } },
  validar(b, p) {
    const r = p.resultado;
    if (!r || !Array.isArray(r.arranques) || !Array.isArray(r.hipoteses) || !Array.isArray(r.erros)) return erroCmd('RESULTADO_INVALIDO', 'Resultado da importação inválido.');
    if (r.erros.length) return erroCmd('IMPORTACAO_COM_ERRO', r.erros[0]);
    if (!r.arranques.length) return erroCmd('SEM_ARRANQUES', 'O arquivo não trouxe nenhum arranque.');
    return validarLista(b, comandosArranques(r, p.nome, b.seq));
  },
  aplicar(d, p) {
    aplicarLista(d, comandosArranques(p.resultado, p.nome, d.seq));
    return `Obra “${p.nome.trim()}” criada com ${p.resultado.arranques.length} arranque(s) e ${p.resultado.hipoteses.length} hipótese(s) de carga.`;
  },
});
```

## `commands.test.ts`
1. Importe `importarArranques` e `UNIDADES_PADRAO` de `../building/importarArranques` (e `edificioVazio` de `../building/types`, se faltar).
2. No `EXEMPLOS` acrescente (posições longe dos pilares do `base()`; as unidades padrão medem posição e base em cm):
`'obra.importarArranques': () => ({ nome: 'Só arranques', resultado: importarArranques('Pilar;Caso;N;x;y\nPA;G;300;9000;9000\nPB;G;200;9500;9000', { pilar: 0, caso: 1, N: 2, x: 3, y: 4 }, UNIDADES_PADRAO) }),`
3. Novo `describe('obra.importarArranques', …)` no fim do arquivo:
   - `it('cria arranques, casos e cargas em um passo')`: `const r = importarArranques('Pilar;Caso;N;Hx\nPA;G;300;0\nPA;Vento1;0;12\nPB;G;200;0', { pilar: 0, caso: 1, N: 2, Hx: 3 }, UNIDADES_PADRAO)`; `const s = new Sessao(edificioVazio())`; `expect(s.executar('obra.importarArranques', { nome: 'Só arranques', resultado: r }).ok).toBe(true)`; `s.modelo.pilares.length === 2`; `s.modelo.cargasPilar!.length === 3`; `s.modelo.casos!.length === 1`; `s.modelo.obra.nome === 'Só arranques'`; `s.modelo.obra.origem === 'texto'`; `s.log.length === 1`; `s.desfazer()` e `expect(s.modelo).toEqual(edificioVazio())`.
   - `it('recusa resultado com erro, sem arranques ou malformado')`: `{ nome: 'X', resultado: { ...r, erros: ['x'] } }` → `ok` false e `erros[0].codigo === 'IMPORTACAO_COM_ERRO'`; `{ nome: 'X', resultado: { ...r, arranques: [] } }` → `'SEM_ARRANQUES'`; `{ nome: 'X', resultado: {} }` → `'RESULTADO_INVALIDO'` (use `as never` no parâmetro para o tsc aceitar).

## Verificação
```bash
npx tsc -b && npx vitest run src/core/commands/commands.test.ts src/core/building/importarArranques.test.ts
```
