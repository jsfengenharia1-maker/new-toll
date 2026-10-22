# Cartão L1-09 — Obras recentes (localStorage) e edifício na biblioteca

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende do cartão 01.

## Objetivo
Registro de obras abertas (6 últimas, histórico completo, busca) e gravação do edifício na biblioteca do usuário. Itens: C1.40, C1.45 (e a base de C1.44).

## Arquivos
1. `src/app/edificio/recentes.ts` (criar)
2. `src/app/edificio/recentes.test.ts` (criar)
3. `src/app/storage.ts` (editar)
Leia antes: `src/app/storage.ts` (`saveToLibrary`, limite de 240 000 caracteres) e `src/app/history.ts` (modelo de uso protegido do `localStorage`).

## `recentes.ts` — conteúdo
```ts
// Obras abertas (L1): só metadados, em localStorage ('statikos:recentes'); leitura e escrita protegidas.
import type { OrigemObra } from '../../core/building/types';

export type OrigemRecente = OrigemObra | 'arquivo' | 'biblioteca';
export interface ObraRecente { nome: string; descricao: string; abertaEm: string; origem: OrigemRecente; pavimentos: number }
export const CHAVE_RECENTES = 'statikos:recentes';
export const LIMITE_HISTORICO = 500;
export const ULTIMAS = 6;

/** Histórico completo, do mais recente ao mais antigo. Armazenamento indisponível ou corrompido → lista vazia. */
export function lerRecentes(): ObraRecente[]
/** Acrescenta uma abertura no início (`abertaEm` = agora, ISO) e grava; guarda no máximo `LIMITE_HISTORICO`. Falha de gravação é ignorada. Devolve a lista nova. */
export function registrarRecente(o: Omit<ObraRecente, 'abertaEm'> & { abertaEm?: string }): ObraRecente[]
/** As `n` últimas obras distintas pelo nome (a abertura mais recente de cada nome). */
export function ultimasObras(lista: ObraRecente[], n = ULTIMAS): ObraRecente[]
/** Filtra por palavra no nome ou na descrição (sem acento nem maiúsculas); termo vazio → a lista inteira. Várias palavras: todas devem aparecer. */
export function buscarRecentes(lista: ObraRecente[], termo: string): ObraRecente[]
/** Apaga o histórico. */
export function limparRecentes(): void
```
Regras: `lerRecentes` faz `JSON.parse` e descarta itens sem `nome` string; tudo em `try/catch`. A normalização da busca é `s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`. A descrição do item é a de `Obra.descricao` unida por `' · '`.

## `storage.ts`
1. Importe o tipo: `import type { BuildingFile } from '../core/building/file';`.
2. `LibraryKind` passa a `'project' | 'characteristics' | 'materiais' | 'combinacoes' | 'portico' | 'edificio'`; `LibraryPayload` ganha `| BuildingFile`; atualize o comentário acima do tipo (acrescente "ou edifício inteiro (L1)").
3. Ao fim do arquivo:
```ts
export const LIMITE_EDIFICIO = 240_000;

/** Grava o edifício (modelo + log) na biblioteca. Acima do limite do registro devolve o aviso, sem gravar. */
export async function salvarEdificioNaBiblioteca(nome: string, resumo: string, arquivo: BuildingFile, id?: string): Promise<{ ok: true; id: string } | { ok: false; aviso: string }> {
  if (JSON.stringify(arquivo).length > LIMITE_EDIFICIO) return { ok: false, aviso: 'A obra passa de 240 KB e não cabe na biblioteca. Use Arquivo › Salvar no computador (.statikos), que não tem esse limite.' };
  try { const r = await saveToLibrary('edificio', nome, resumo, arquivo, id); return { ok: true, id: r.id }; }
  catch (e) { return { ok: false, aviso: (e as Error).message }; }
}
```
4. Confira com `npx tsc -b` que nenhum `switch`/`Record` sobre `LibraryKind` quebrou; se quebrar, acrescente o caso `'edificio'` ali com o rótulo `'Obra (edifício)'` e relate.

## Testes (`recentes.test.ts`)
`vitest` roda em Node; defina um `localStorage` falso no início (`globalThis.localStorage = { getItem, setItem, removeItem, clear, key, length }` sobre um `Map`) num `beforeEach`, e `delete` no `afterEach`.
1. Vazio: `lerRecentes()` é `[]`; JSON corrompido (`setItem(CHAVE_RECENTES, '{x')`) também.
2. `registrarRecente` 3 vezes (nomes `A`, `B`, `A`, com `abertaEm` explícitos crescentes): `lerRecentes().map((o) => o.nome)` é `['A', 'B', 'A']` (mais recente primeiro); `ultimasObras(lista).map((o) => o.nome)` é `['A', 'B']`.
3. `ultimasObras` com 8 nomes distintos devolve 6, e `n = 3` devolve 3.
4. `buscarRecentes`: item `{ nome: 'Edifício Açaí', descricao: 'Fase de anteprojeto' }`: termo `'acai'` acha; `'ANTEPROJETO'` acha; `'acai fase'` acha; `'acai xyz'` não; termo `''` devolve tudo.
5. Limite: 505 chamadas de `registrarRecente` deixam `lerRecentes().length === 500`.
6. `localStorage.setItem` que lança erro: `registrarRecente` não lança e devolve a lista em memória (com o item novo).
7. Limite da biblioteca (importe `salvarEdificioNaBiblioteca` de `../storage`; a checagem de tamanho vem antes de qualquer acesso a `window`): com `arquivo = { building: edificioVazio(), buildingLog: Array.from({ length: 30000 }, () => ({ t: '', nome: 'x', params: {}, autor: 'usuario' as const })) }`, `await salvarEdificioNaBiblioteca('X', 'r', arquivo)` devolve `{ ok: false, aviso: … }` com `aviso` contendo `'240 KB'`.

## Verificação
```bash
npx tsc -b && npx vitest run src/app/edificio/recentes.test.ts
```
