# Cartão L1-03 — Especificação da obra e geração de comandos (`assistente.ts`)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis.

## Objetivo
Função pura que transforma a especificação do assistente numa lista de comandos já existentes, com ids previstos por `seq`. Itens: C1.15, C1.16, K1.9.2.

## Arquivos
1. `src/core/building/assistente.ts` (criar)
2. `src/core/building/assistente.test.ts` (criar)
Leia antes: `src/core/commands/obra.ts` (comandos `obra.definir`, `norma.definir`, `opcoes.definir`, `vento.definir`, `grupo.criar`, `pavimento.criar`, `pavimento.repetir`, `eixo.malha`) e `src/core/building/categoriasUso.ts`.

## Tipos e funções (assinaturas exatas)
```ts
import type { CategoriaVento, Norma, OrigemObra } from './types';
export interface Cmd { nome: string; params: Record<string, unknown> }
export interface PavimentoEspec {
  nome: string;
  /** m. Distância ao pavimento de baixo. No primeiro da lista só vale para as repetições (a cota dele é 0). */
  peDireito: number;
  /** id de `categoriasDeUso()`. */
  categoria: string;
  /** Sobrecarga própria (kN/m²); ausente = a da categoria. */
  q?: number;
  /** 1 = pavimento único; n ≥ 2 = n pavimentos iguais no mesmo grupo (pavimento-tipo). */
  repeticoes: number;
}
export interface EspecificacaoObra {
  nome: string;
  /** Até 2 linhas de até 120 caracteres. */
  descricao?: string[];
  cidade?: string;
  profundidadeFundacao?: number;
  perfil?: 'sistema' | 'nbr';
  norma?: { fck: number; aco: Norma['aco']; caa: Norma['caa'] };
  vento?: { v0: number; categoria: CategoriaVento };
  /** Cota do primeiro pavimento (m); padrão 0. Em obra nova fica 0; o exemplo do comando usa outra para não colidir. */
  cotaBase?: number;
  /** Revestimento e piso (kN/m²) de todos os grupos; padrão 1,0. */
  revestimento?: number;
  /** Sobrecarga editada por categoria (id de `categoriasDeUso()` → kN/m²) nesta obra; vale quando a linha do pavimento não tem `q` próprio. */
  qCategoria?: Record<string, number>;
  /** De baixo para cima. */
  pavimentos: PavimentoEspec[];
  /** Malha de eixos opcional: espaçamentos em m. */
  eixos?: { dx: number[]; dy: number[] };
  origem?: OrigemObra;
}
export const ESPEC_PADRAO: EspecificacaoObra  // ver abaixo
export function validarEspecificacao(e: EspecificacaoObra): string[]
export function gerarObra(e: EspecificacaoObra, seqInicial?: number): { comandos: Cmd[]; erros: string[] }
```
`ESPEC_PADRAO` (exportada): `{ nome: 'Nova obra', perfil: 'sistema', norma: { fck: 30, aco: 'CA-50', caa: 'II' }, profundidadeFundacao: 1.5, revestimento: 1, origem: 'assistente', pavimentos: [ { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 }, { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 3 }, { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 } ] }`.

## `validarEspecificacao` (devolve lista de mensagens; vazia = válida)
A entrada pode vir de JSON sem validação de tipos: trate `nome` ausente como vazio e `pavimentos` ausente como `[]` (use `e.nome ?? ''` e `e.pavimentos ?? []`); nunca lance exceção.
Uma mensagem (texto em português, exatamente) por violação, nesta ordem:
- nome vazio (após `trim`): `'Informe o nome da obra.'`
- `descricao` com mais de 2 linhas: `'A descrição aceita até 2 linhas.'`; linha com mais de 120 caracteres: `'Cada linha da descrição aceita até 120 caracteres.'`
- nenhum pavimento: `'Informe ao menos um pavimento.'`
- para cada pavimento `i` (1-based `n = i + 1`): nome vazio → `` `Pavimento ${n}: informe o nome.` ``; `peDireito` não finito, ≤ 0 ou > 10 → `` `Pavimento ${n}: pé-direito entre 0 e 10 m.` ``; `repeticoes` não inteiro ou fora de 1..60 → `` `Pavimento ${n}: repetições de 1 a 60.` ``; categoria que `categoriaPorId` não conhece → `` `Pavimento ${n}: categoria de uso desconhecida.` ``; `q` informado e < 0 → `` `Pavimento ${n}: sobrecarga negativa.` ``
- `norma.fck` fora de 20..90: `'fck entre 20 e 90 MPa.'`
- `vento.v0` fora de 20..60: `'V0 entre 20 e 60 m/s.'`
- `eixos` com algum espaçamento ≤ 0 ou não finito: `'Espaçamentos dos eixos devem ser positivos.'`
- `profundidadeFundacao` informada fora de (0, 30]: `'Profundidade da fundação entre 0 e 30 m.'`
- algum valor de `qCategoria` negativo ou não finito: `'Sobrecarga de categoria inválida.'`
- `cotaBase` informada e não finita: `'Cota base inválida.'`

## `gerarObra` — regras (nesta ordem de comandos)
Se `validarEspecificacao` não for vazia, devolva `{ comandos: [], erros }`. Senão, `seq` local começa em `seqInicial ?? 0`; `novoId(pre) = `${pre}_${(++seq).toString(36)}``.
1. `obra.definir` com `{ nome: e.nome.trim(), cidade?, profundidadeFundacao?, descricao?, origem: e.origem ?? 'assistente' }` (omita chaves ausentes; `descricao` só se tiver linha não vazia).
2. `norma.definir` com `e.norma` (se existir).
3. `opcoes.definir { perfil: 'nbr' }` somente se `e.perfil === 'nbr'`.
4. `vento.definir { ativo: true, v0, categoria }` se `e.vento`.
5. Pavimentos, em ordem; `cota = e.cotaBase ?? 0` para o primeiro; `rev = e.revestimento ?? 1`. Para cada linha `r`:
   - `nomeBase = /\d+$/.test(r.nome.trim()) ? r.nome.trim() : r.repeticoes > 1 ? `${r.nome.trim()} 1` : r.nome.trim()`.
   - `nomeGrupo = r.nome.trim().replace(/\s*\d+$/, '').trim() || r.nome.trim()`.
   - `cat = categoriaPorId(r.categoria)`; `q = r.q ?? e.qCategoria?.[cat.id] ?? cat.q`.
   - se não é a primeira linha, `cota = +(cota + r.peDireito).toFixed(6)`.
   - `const g = novoId('g')` e `grupo.criar { nome: nomeGrupo, uso: cat.uso, gRev: rev, q }`; depois `const p = novoId('pav')` e `pavimento.criar { nome: nomeBase, cota, grupo: g }`.
   - se `r.repeticoes > 1`: `pavimento.repetir { id: p, vezes: r.repeticoes - 1, peDireito: r.peDireito }`, `seq += r.repeticoes - 1` e `cota = +(cota + (r.repeticoes - 1) * r.peDireito).toFixed(6)`.
6. `eixo.malha { origem: [0, 0], dx, dy }` se `e.eixos` e (`dx.length + dy.length > 0`).
Regra de seq: `grupo.criar`, `pavimento.criar` e cada cópia de `pavimento.repetir` consomem 1; `obra.definir`, `norma.definir`, `opcoes.definir`, `vento.definir` e `eixo.malha` não consomem (o teste 2 confere).

## Testes (`assistente.test.ts`)
Importe de `../commands` `Sessao`; de `./assistente` o que precisar; de `./types` `edificioVazio`.
1. `validarEspecificacao(ESPEC_PADRAO)` é `[]`; nome `' '` → inclui `'Informe o nome da obra.'`; `pavimentos: []` → inclui `'Informe ao menos um pavimento.'`; `repeticoes: 0` → inclui `'Pavimento 1: repetições de 1 a 60.'`.
2. **Mesmo modelo que a sequência manual:** `const { comandos, erros } = gerarObra(ESPEC_PADRAO)`; `erros` é `[]`. `A = new Sessao(edificioVazio())` executa cada comando com autor `'sistema'`, exigindo `ok`. `B = new Sessao(edificioVazio())` executa à mão, exigindo `ok`, exatamente esta lista: `obra.definir { nome: 'Nova obra', profundidadeFundacao: 1.5, origem: 'assistente' }`; `norma.definir { fck: 30, aco: 'CA-50', caa: 'II' }`; `grupo.criar { nome: 'Térreo', uso: 'comum', gRev: 1, q: 3 }`; `pavimento.criar { nome: 'Térreo', cota: 0, grupo: 'g_1' }`; `grupo.criar { nome: 'Tipo', uso: 'residencial', gRev: 1, q: 1.5 }`; `pavimento.criar { nome: 'Tipo 1', cota: 3, grupo: 'g_3' }`; `pavimento.repetir { id: 'pav_4', vezes: 2, peDireito: 3 }`; `grupo.criar { nome: 'Cobertura', uso: 'cobertura', gRev: 1, q: 1 }`; `pavimento.criar { nome: 'Cobertura', cota: 12, grupo: 'g_7' }`. `expect(A.modelo).toEqual(B.modelo)`. Confira também `A.modelo.pavimentos.map((p) => [p.nome, p.cota])` igual a `[['Térreo', 0], ['Tipo 1', 3], ['Tipo 2', 6], ['Tipo 3', 9], ['Cobertura', 12]]` e `A.modelo.seq === 8`. Se algo divergir, o erro está no código de `gerarObra` (não ajuste o teste).
3. Ids a partir de `seqInicial`: `gerarObra(ESPEC_PADRAO, 5).comandos.find((c) => c.nome === 'pavimento.criar')!.params.grupo === 'g_6'`; aplicar os comandos sobre `new Sessao({ ...edificioVazio(), seq: 5 })` dá `ok` em todos e `modelo.seq === 13`.
4. Pavimento sem repetição e nome sem número mantém o nome (`Térreo`); com `repeticoes: 3` e nome `Tipo` o primeiro vira `Tipo 1`.
5. `cotaBase: 100` dá cota 100 ao primeiro pavimento e 103 ao segundo.
6. `qCategoria: { comum: 4 }` dá `q = 4` ao grupo `Térreo` do `ESPEC_PADRAO` (categoria `comum`) e mantém 1,5 no `Tipo`; um `q: 2` na linha `Tipo` vence o `qCategoria`.
7. `perfil: 'nbr'` gera `opcoes.definir { perfil: 'nbr' }` e `modelo.perfilOpcoes === 'nbr'`; `eixos: { dx: [5, 5], dy: [4] }` gera 3 + 2 eixos.

## Verificação
```bash
npx tsc -b && npx vitest run src/core/building/assistente.test.ts
```
