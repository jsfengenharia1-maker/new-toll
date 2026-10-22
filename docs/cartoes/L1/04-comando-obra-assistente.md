# Cartão L1-04 — Comando `obra.assistente`

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 01 e 03.

## Objetivo
Comando composto (um passo no histórico, desfazível) que aplica a lista de comandos de `gerarObra`. Itens: C1.15, C1.16, C1.24.

## Arquivos
1. `src/core/commands/obraAssistente.ts` (criar)
2. `src/core/commands/index.ts` (editar)
3. `src/core/commands/commands.test.ts` (editar)
Leia antes: `registrar('lote')` em `src/core/commands/registry.ts` (é o modelo deste comando), `src/core/building/assistente.ts`.

## `obraAssistente.ts` — conteúdo
```ts
// Comandos compostos de nova obra (L1): o assistente e a importação de arranques. Cada um expande para comandos
// existentes e os aplica no mesmo passo (um desfazer), como o `lote`.
import type { Draft } from 'immer';
import { gerarObra, type Cmd, type EspecificacaoObra } from '../building/assistente';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { aplicarComando, comando, registrar } from './registry';
import { comDefaults } from './schema';

export const erroCmd = (codigo: string, mensagem: string): Diagnostico[] => [{ codigo, severidade: 'erro', elementos: [], mensagem }];

/** Valida a lista passo a passo sobre o modelo evoluindo; devolve os erros do primeiro passo que falhar. */
export function validarLista(b: BuildingModel, lista: Cmd[]): Diagnostico[] {
  let m = b;
  for (const [i, c] of lista.entries()) {
    const r = aplicarComando(m, c.nome, c.params);
    if (!r.ok) return r.erros.map((e) => ({ ...e, mensagem: `Passo ${i + 1} (${c.nome}): ${e.mensagem}` }));
    m = r.modelo;
  }
  return [];
}

/** Aplica a lista sobre o rascunho (já validada). */
export function aplicarLista(d: Draft<BuildingModel>, lista: Cmd[]): void {
  for (const c of lista) {
    const cmd = comando(c.nome)!;
    cmd.aplicar(d, comDefaults(cmd.schema, c.params) as Record<string, unknown>);
  }
}
```
Depois, no mesmo arquivo, registre (use `registrar<{ espec: EspecificacaoObra }>`):
- `nome: 'obra.assistente'`
- `descricao: 'Gera a obra a partir da especificação do assistente (dados gerais, norma, perfil de opções, vento, grupos e pavimentos com repetições, malha de eixos) como um passo só. Em obra com pavimentos, acrescenta os novos a partir de `cotaBase`.'`
- `risco: 'escrita'`, `mcp: false`
- `schema: { type: 'object', additionalProperties: false, required: ['espec'], properties: { espec: { type: 'object', description: 'EspecificacaoObra (src/core/building/assistente.ts)' } } }`
- `validar(b, p)`: `const g = gerarObra(p.espec, b.seq)`; se `g.erros.length` devolva `g.erros.map((m) => erroCmd('ESPEC_INVALIDA', m)).flat()`; senão `validarLista(b, g.comandos)`.
- `aplicar(d, p)`: `aplicarLista(d, gerarObra(p.espec, d.seq).comandos)`; devolva `` `Obra “${p.espec.nome.trim()}” gerada: ${d.pavimentos.length} pavimento(s) em ${d.grupos.length} grupo(s).` ``

## `index.ts`
Acrescente `import './obraAssistente';` logo depois de `import './pilarParede';`. (O cartão 07 acrescenta o segundo comando no mesmo arquivo.)

## `commands.test.ts`
1. No `EXEMPLOS` acrescente (depois de `'obra.definir'`):
`'obra.assistente': () => ({ espec: { nome: 'Assistente', cotaBase: 100, perfil: 'nbr', pavimentos: [{ nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 }, { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 2 }], eixos: { dx: [5], dy: [] } } }),`
2. Novo `describe('obra.assistente', …)` no fim do arquivo:
   - `it('um passo no histórico: desfazer volta ao modelo vazio')`: `const s = new Sessao(edificioVazio())` (importe `edificioVazio` de `../building/types` se faltar); `expect(s.executar('obra.assistente', { espec: ESPEC_PADRAO }).ok).toBe(true)` (importe `ESPEC_PADRAO` de `../building/assistente`); `s.modelo.pavimentos.length === 5`; `s.log.length === 1`; `s.desfazer()`; `expect(s.modelo).toEqual(edificioVazio())`; `s.refazer()`; `pavimentos.length === 5` de novo.
   - `it('replay do log reproduz a obra')`: `expect(replay(s.log, edificioVazio())).toEqual(s.modelo)` (`replay` vem de `./registry` ou `.`; veja os imports do arquivo).
   - `it('especificação inválida é recusada sem alterar o modelo')`: `{ espec: { ...ESPEC_PADRAO, nome: ' ' } }` → `ok` false, `erros[0].codigo === 'ESPEC_INVALIDA'`, modelo igual ao anterior.
   - `it('mesmo modelo que o edifício padrão antigo')`: sessão A com `comandosEdificioPadrao()`; sessão B com `obra.assistente` e `espec: { nome: 'Edifício residencial', profundidadeFundacao: 1.5, pavimentos: [{ nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 }, { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 3 }, { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 }] }`. Compare só `pavimentos.map((p) => [p.nome, p.cota])` e `grupos.map((g) => [g.nome, g.uso, g.q])` (A e B devem coincidir: ambos Térreo 0, Tipo 1..3 em 3/6/9, Cobertura 12).

## Verificação
```bash
npx tsc -b && npx vitest run src/core/commands/commands.test.ts src/core/building/assistente.test.ts
```
