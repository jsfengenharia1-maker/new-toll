# Cartão L1-08 — Obras de exemplo completas (`exemplos.ts`)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 01 e 04.

## Objetivo
Três obras fictícias completas que a tela de obras recentes abre: prédio residencial, prédio com subsolo e prédio com lajes treliçadas. Item: C1.44. Sem dado real de obra.
As lajes nervuradas do spec ficam fora: o tipo de laje nervurada ainda não existe no modelo (nota no checklist, cartão 24).

## Arquivos
1. `src/core/building/exemplos.ts` (criar)
2. `src/core/building/exemplos.test.ts` (criar)
Leia antes: `src/core/sheets/exemplo.ts` (`edificioExemplo`, modelo deste cartão), `src/core/building/assistente.ts`, `src/core/commands/lajes.ts` (`laje.detectarPanos`, `tipoSchema`).

## `exemplos.ts` — conteúdo
```ts
// Obras de exemplo (fictícias) da tela de obras recentes (L1, C1.44). Cada uma devolve uma Sessao pronta.
import { Sessao } from '../commands';
import { edificioExemplo } from '../sheets/exemplo';
import { ESPEC_PADRAO, gerarObra, type EspecificacaoObra } from './assistente';
import { edificioVazio } from './types';

export type IdExemplo = 'predio' | 'subsolo' | 'vigotas';
export interface ExemploObra { id: IdExemplo; nome: string; descricao: string[]; resumo: string }

export const EXEMPLOS_OBRA: ExemploObra[] = [
  { id: 'predio', nome: 'Exemplo: residencial de 5 pavimentos', descricao: ['Obra fictícia: térreo, 3 tipos e cobertura', 'Pórtico 3 × 2 vãos, lajes maciças de 12 cm'], resumo: '5 pavimentos, 12 pilares, lajes maciças' },
  { id: 'subsolo', nome: 'Exemplo: com subsolo de garagem', descricao: ['Obra fictícia: subsolo, térreo, 2 tipos e cobertura', 'Mesmo pórtico 3 × 2 vãos em todos os pavimentos'], resumo: '5 pavimentos, 12 pilares, subsolo como garagem' },
  { id: 'vigotas', nome: 'Exemplo: lajes treliçadas', descricao: ['Obra fictícia: térreo, 2 tipos e cobertura', 'Lajes dos tipos em vigotas treliçadas H16, demais maciças'], resumo: '4 pavimentos, 12 pilares, treliçadas H16 nos tipos' },
];
```
Funções auxiliares (não exportadas):
```ts
const XS = [0, 5, 10, 15], YS = [0, 4.5, 9];
/** Lança a malha de pilares e as vigas/lajes em cada grupo. `tipoLaje(nomeGrupo)` devolve o `tipo` de `laje.detectarPanos`. */
function lancar(s: Sessao, tipoLaje: (grupo: string) => Record<string, unknown>) { … }
```
`lancar` faz, com `ok(nome, params)` que executa `s.executar` e **lança `Error` com a mensagem dos erros** se `!r.ok`:
1. `lote` com um `pilar.inserir { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } }` para cada `x` de `XS` e `y` de `YS` (12 pilares).
2. Para cada grupo `g` de `s.modelo.grupos` (em ordem): `lote` com 3 `viga.tracar { grupo: g.id, pontos: [[0, y], [15, y]], secao: { b: 0.15, h: 0.5 } }` (um por `y`) e 4 com `pontos: [[x, 0], [x, 9]]` (um por `x`); depois `laje.detectarPanos { grupo: g.id, tipo: tipoLaje(g.nome) }`.
3. `eixo.malha { dx: [5, 5, 5], dy: [4.5, 4.5] }`.

Função exportada:
```ts
export function criarExemplo(id: IdExemplo): Sessao
```
- `'predio'`: `const s = edificioExemplo()` (já lança tudo); depois `obra.definir { nome, descricao, origem: 'exemplo' }` com os dados da entrada `EXEMPLOS_OBRA`. Devolve `s`.
- `'subsolo'`: `const s = new Sessao(edificioVazio())`; `obra.assistente { espec }` com `espec: EspecificacaoObra = { ...ESPEC_PADRAO, nome, descricao, origem: 'exemplo', pavimentos: [ { nome: 'Subsolo', peDireito: 3, categoria: 'garagem', repeticoes: 1 }, { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 }, { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 2 }, { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 } ] }`; depois `lancar(s, () => ({ tipo: 'macica', h: 0.12 }))`.
- `'vigotas'`: igual, com pavimentos `Térreo` (comum), `Tipo` (residencial, 2 repetições), `Cobertura`; `lancar(s, (g) => g === 'Tipo' ? { tipo: 'trelicada', modelo: 'H16', capa: 0.04 } : { tipo: 'macica', h: 0.12 })`.
`nome`/`descricao` vêm de `EXEMPLOS_OBRA.find(...)`. Todos os comandos entram no log do `Sessao` (autor padrão `'usuario'`).

## Testes (`exemplos.test.ts`, vitest; use `{ timeout: 120000 }` nos testes que calculam)
Importe `Sessao`, `replay` de `../commands`; `analisarEdificio` de `./analitico`; `dimensionarEdificio` de `./dimensionamento`; `revisarEdificio` de `./revisao`; `verificar` de `./verify`; `edificioVazio` de `./types`.
1. Para cada `id` de `EXEMPLOS_OBRA`: `const s = criarExemplo(id)`; `s.modelo.obra.origem === 'exemplo'`; `s.modelo.obra.descricao` tem 2 linhas; `s.modelo.pilares.length === 12`; `verificar(s.modelo).filter((d) => d.severidade === 'erro')` é `[]`.
2. Contagens: `predio` → `pavimentos.length === 5`; `subsolo` → 5 e o primeiro pavimento (menor cota) se chama `Subsolo`; `vigotas` → 4 e as lajes do grupo `Tipo` são todas `tipo.tipo === 'trelicada'` (6) e as dos demais `'macica'`.
3. Cálculo e revisão (um teste por exemplo): `const an = analisarEdificio(s.modelo)`; `an.erro` é `undefined`; `const dim = dimensionarEdificio(s.modelo, an)`; `revisarEdificio(s.modelo, an, dim).itens.filter((i) => i.nivel === 'erro')` é `[]`. **Se algum exemplo falhar aqui, não altere a expectativa nem enfraqueça o teste: pare e relate a mensagem do primeiro erro ao orquestrador.**
4. Replay: para cada `id`, `replay(s.log, edificioVazio())` é igual a `s.modelo` (`s = criarExemplo(id)`).
5. Independência: duas chamadas de `criarExemplo('predio')` dão modelos `toEqual` e instâncias diferentes.

## Verificação
```bash
npx tsc -b && npx vitest run src/core/building/exemplos.test.ts
```
