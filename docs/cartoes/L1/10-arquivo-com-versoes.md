# Cartão L1-10 — Arquivo com versões e resultados (`file.ts`)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis.

## Objetivo
O `.statikos` pode incluir as últimas versões da obra (pontos de recuperação) e os resultados do último cálculo, com limite de tamanho e aviso. Item: C1.48.

## Arquivos
1. `src/core/building/file.ts` (editar)
2. `src/core/building/file.versoes.test.ts` (criar)
3. `src/app/workspace.ts` (editar, 2 linhas)
Leia antes: `file.ts` inteiro; `replay` e `aplicarComando` em `src/core/commands/registry.ts`.

## `file.ts`
1. Acrescente aos imports: `import { aplicarComando, type Entrada } from '../commands/registry';` (já existe `import type { Entrada }`: troque por este).
2. Antes de `BuildingFile`, acrescente:
```ts
/** Ponto de recuperação: o modelo logo antes de um comando do log. */
export interface VersaoObra { indice: number; t: string; rotulo: string; building: BuildingModel }
/** Resultados do último cálculo guardados no arquivo (o `Dimensionamento` serializado). */
export interface ResultadosGuardados { revisao: number; salvoEm: string; dim: unknown }
export const LIMITE_VERSOES_BYTES = 3_000_000;
export const LIMITE_RESULTADOS_BYTES = 5_000_000;
export const MAX_VERSOES = 20;
```
3. `BuildingFile` ganha `versoes?: VersaoObra[]; resultados?: ResultadosGuardados;`.
4. `lerEdificio`: devolva também `versoes` (lista válida: itens com `building` aceito por `isBuilding`, normalizados com `normalizarEdificio`) e `resultados` (objeto com `dim` definido) quando existirem no arquivo; sem eles, o objeto devolvido não tem as chaves.
5. Funções novas:
```ts
/** Estados anteriores: o modelo logo antes de cada um dos últimos `n` comandos do log (reaplica o log desde `base`), do mais antigo ao mais recente. Para antes de estourar `limiteBytes` (JSON) e avisa. */
export function versoesDoLog(base: BuildingModel, log: Entrada[], n: number, limiteBytes = LIMITE_VERSOES_BYTES): { versoes: VersaoObra[]; aviso?: string }
/** Recupera uma versão: devolve o modelo e o log até aquele ponto. */
export function recuperarVersao(arquivo: BuildingFile, indice: number): BuildingFile | null
/** Monta o conteúdo do arquivo: modelo + log (compactado) e, conforme as opções, versões e resultados (`dim` null = sem cálculo em vigor → resultados omitidos, sem aviso). */
export function arquivoComExtras(modelo: BuildingModel, log: Entrada[], opc: { versoes: number; resultados: boolean }, dim: unknown | null, revisao: number): { arquivo: BuildingFile; avisos: string[] }
/** Serializa os resultados com o limite de tamanho; acima dele devolve `undefined` e o aviso. */
export function resultadosParaArquivo(dim: unknown, revisao: number, limiteBytes = LIMITE_RESULTADOS_BYTES): { resultados?: ResultadosGuardados; aviso?: string }
```
Regras:
- `versoesDoLog(base, log, n, limite)`: `n' = Math.min(n, MAX_VERSOES, log.length)`; se `n' <= 0` devolva `{ versoes: [] }`. Reaplique `log.slice(0, log.length - n')` sobre `base` com `aplicarComando` (entrada que falhar: pare e devolva `{ versoes: [], aviso: 'O histórico não pôde ser reaplicado; versões anteriores não incluídas.' }`). Esse é o estado antes do comando de índice `log.length - n'`. Para cada `i` de `log.length - n'` até `log.length - 1`: registre `{ indice: i, t: log[i].t, rotulo: log[i].nome, building: modelo atual }` e então aplique `log[i]`. Depois percorra as versões da mais recente para a mais antiga somando `JSON.stringify(v).length`; a primeira que fizer a soma passar de `limiteBytes` e todas as mais antigas que ela são descartadas (mantêm-se as mais recentes). Se alguma foi descartada, `aviso` = `` `Versões limitadas a ${k} de ${n'} pelo tamanho do arquivo.` `` (k = quantas ficaram). A lista final fica do mais antigo ao mais recente.
- `arquivoComExtras`: `arquivo = { building: modelo, buildingLog: compactarLog(modelo, log) }`; `avisos = []`. Se `opc.versoes > 0`: `const v = versoesDoLog(edificioVazio(), log, opc.versoes)` (importe `edificioVazio` de `./types`); se `v.versoes.length` coloque em `arquivo.versoes`; `v.aviso` vai para `avisos`. Se `opc.resultados && dim`: `const r = resultadosParaArquivo(dim, revisao)`; `r.resultados` em `arquivo.resultados`, `r.aviso` em `avisos`. Sem as opções, o objeto `arquivo` só tem `building` e `buildingLog`.
- `recuperarVersao(arquivo, indice)`: acha em `arquivo.versoes` a de `indice` igual; `null` se não existir; senão `{ building: v.building, buildingLog: arquivo.buildingLog.slice(0, indice) }` (sem `versoes` nem `resultados`).
- `resultadosParaArquivo`: `txt = JSON.stringify(dim)`; `txt` indefinido ou `txt.length > limiteBytes` → `{ aviso: 'Os resultados do último cálculo passam do limite de tamanho e não foram incluídos.' }`; senão `{ resultados: { revisao, salvoEm: new Date().toISOString(), dim } }`.

## `workspace.ts`
Na `interface Workspace`, depois de `buildingLog?:`, acrescente `versoes?: BuildingFile['versoes']; resultados?: BuildingFile['resultados'];` (o `buildWorkspace` já espalha `...edificio`, então nada mais muda).

## Testes (`file.versoes.test.ts`)
Importe `Sessao`, `comandosEdificioPadrao` de `../commands`; `edificioVazio` de `./types`; as funções novas e `lerEdificio` de `./file`.
Monte `s = new Sessao(edificioVazio())`, aplique `comandosEdificioPadrao()` (log de 6 comandos) e depois `eixo.malha { dx: [5, 5], dy: [4] }` e `norma.definir { fck: 35 }` (log de 8).
1. `versoesDoLog(edificioVazio(), s.log, 3)`: 3 versões; índices `[5, 6, 7]`; rótulos `['pavimento.criar', 'eixo.malha', 'norma.definir']`; a versão de índice 7 tem `norma.fck === 30` (estado antes do comando) e `eixos.length === 5`; a de índice 6 tem `eixos.length === 0`.
2. `n = 0` → `versoes: []`; `n = 50` → no máximo `MAX_VERSOES` e no máximo `log.length` (8).
3. Limite: `versoesDoLog(edificioVazio(), s.log, 3, 1)` devolve `versoes: []` e `aviso === 'Versões limitadas a 0 de 3 pelo tamanho do arquivo.'`.
4. `recuperarVersao({ building: s.modelo, buildingLog: s.log, versoes }, 7)`: `building.norma.fck === 30`, `buildingLog.length === 7`; índice inexistente → `null`.
5. Ida e volta: `lerEdificio(JSON.parse(JSON.stringify({ building: s.modelo, buildingLog: s.log, versoes, resultados })))` mantém `versoes.length` e `resultados.revisao`; sem esses campos, `Object.keys(resultado)` não contém `'versoes'` nem `'resultados'`.
6. `arquivoComExtras(s.modelo, s.log, { versoes: 2, resultados: true }, { a: 1 }, 9)`: `arquivo.versoes.length === 2`, `arquivo.resultados.revisao === 9`, `avisos` vazio; com `{ versoes: 0, resultados: false }` as chaves `versoes` e `resultados` não existem; com `dim` `null` e `resultados: true`, `resultados` não existe e `avisos` é vazio.
7. `resultadosParaArquivo({ a: 1 }, 4)` → `resultados.revisao === 4`, `dim` igual; com `limiteBytes = 3` → `resultados` indefinido e aviso exato do item acima.

## Verificação
```bash
npx tsc -b && npx vitest run src/core/building/file.versoes.test.ts src/app/workspace.test.ts
```
