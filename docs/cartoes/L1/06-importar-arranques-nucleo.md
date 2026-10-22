# Cartão L1-06 — Importação de texto de cargas (`importarArranques.ts`)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis.

## Objetivo
Ler arquivo de texto (colunas fixas, vírgula, ponto e vírgula ou tabulação; decimal com vírgula ou ponto) com hipóteses de carga, esforços nos arranques por hipótese e dimensões da base; converter em comandos de uma obra só de arranques. Itens: C1.41, C1.42, C1.43.

## Arquivos
1. `src/core/building/importarArranques.ts` (criar)
2. `src/core/building/importarArranques.test.ts` (criar)
Leia antes: `src/core/commands/lajes.ts` (comandos `carga.pilar` e `caso.criar`) e `src/core/commands/planta.ts` (`pilar.inserir`, arranque = `nasce` e `morre` `'fundacao'`).

## Tipos e funções (assinaturas exatas)
```ts
import type { Cmd } from './assistente';
export type Separador = 'auto' | 'virgula' | 'pontoVirgula' | 'tab' | 'colunas';
export type SepUsado = Exclude<Separador, 'auto'>;
export type CampoArranque = 'pilar' | 'caso' | 'N' | 'Hx' | 'Hy' | 'Mx' | 'My' | 'bx' | 'by' | 'x' | 'y';
/** Índice (0-based) da coluna de cada campo; ausente = coluna não usada. */
export type Mapeamento = Partial<Record<CampoArranque, number>>;
export interface UnidadesTexto {
  forca: 'kN' | 'tf' | 'kgf' | 'N';
  momento: 'kN·m' | 'tf·m' | 'kgf·m' | 'kN·cm' | 'tf·cm' | 'kgf·cm';
  comprimento: 'm' | 'cm' | 'mm';
  /** true: N positivo é compressão (convenção do `carga.pilar`); false: N positivo é tração (o sinal é invertido). */
  compressaoPositiva: boolean;
}
export const UNIDADES_PADRAO: UnidadesTexto = { forca: 'kN', momento: 'kN·m', comprimento: 'cm', compressaoPositiva: true };
export interface Tabela { linhas: string[][]; separador: SepUsado }
export interface HipoteseImp { nome: string; natureza: 'G' | 'Q' | 'W' | 'E' }
export interface CargaImp { caso: string; N: number; Hx: number; Hy: number; Mx: number; My: number }
export interface ArranqueImp { nome: string; x?: number; y?: number; bx: number; by: number; cargas: CargaImp[] }
export interface ResultadoArranques { hipoteses: HipoteseImp[]; arranques: ArranqueImp[]; avisos: string[]; erros: string[] }
export function parseNumero(s: string): number
export function lerTabela(texto: string, opc?: { separador?: Separador; larguras?: number[] }): Tabela
export function sugerirMapeamento(cabecalho: string[]): Mapeamento
export function importarArranques(texto: string, map: Mapeamento, un?: UnidadesTexto, opc?: { separador?: Separador; larguras?: number[]; cabecalho?: boolean }): ResultadoArranques
export function comandosArranques(r: ResultadoArranques, nomeObra: string, seqInicial?: number): Cmd[]
```
Fatores para kN: kN 1; tf 9.80665; kgf 0.00980665; N 0.001. Momento para kN·m: kN·m 1; tf·m 9.80665; kgf·m 0.00980665; kN·cm 0.01; tf·cm 0.0980665; kgf·cm 0.0000980665. Comprimento para m: m 1; cm 0.01; mm 0.001.

## Regras
- `parseNumero(s)`: `trim`; remova espaços internos; vazio → `NaN`. Se tem `,` e `.`: o último dos dois é o decimal e o outro é removido. Só `,` → vírgula vira ponto. Só `.` → decimal. Depois `Number(...)`; texto inválido → `NaN`. Ex.: `'1.234,5'` → 1234.5; `'1,234.5'` → 1234.5; `'12,5'` → 12.5; `'-3.2'` → -3.2; `'abc'` → NaN.
- `lerTabela`: ignore linhas vazias. Separador `auto`: olhe a primeira linha não vazia: contém `;` → `pontoVirgula`; senão contém tab → `tab`; senão, se as 5 primeiras linhas não vazias têm o mesmo número ≥ 2 de pedaços ao dividir por `,` → `virgula`; senão `colunas` (divide por `/\s+/`). Com `larguras` (separador `colunas`): fatie cada linha pelos tamanhos em caracteres, `trim` em cada pedaço. Cada célula é aparada; aspas duplas externas são removidas.
- `sugerirMapeamento(cabecalho)`: compare cada título em minúsculas sem acento: `pilar|apoio|no|nó|arranque` → `pilar`; `caso|hipotese|hipótese|carga|acao|ação` → `caso`; `n|fz|normal|axial` → `N`; `hx|fx|h x` → `Hx`; `hy|fy` → `Hy`; `mx` → `Mx`; `my` → `My`; `bx|b|largura|lado x` → `bx`; `by|h|altura|lado y` → `by`; `x` → `x`; `y` → `y`. Primeiro título que casar com o campo vence; campo já atribuído não é sobrescrito.
- `importarArranques`: `cabecalho` padrão `true` (a primeira linha é título e é descartada). `map.pilar`, `map.caso` e `map.N` são obrigatórios: se faltar, `erros` recebe `'Mapeie as colunas Pilar, Caso e N.'` e devolva listas vazias. Para cada linha de dados: `pilar` e `caso` vazios → pule com aviso `` `Linha ${n}: pilar ou caso vazio, ignorada.` `` (n = número da linha no arquivo, 1-based, contando o cabeçalho); valor numérico inválido em coluna mapeada e não vazia → pule com `` `Linha ${n}: número inválido, ignorada.` ``; células vazias de Hx, Hy, Mx, My valem 0; N vazio vale 0. Converta pelas unidades; se `!compressaoPositiva`, `N = -N` (Hx, Hy e momentos não mudam). Linha com N, Hx, Hy, Mx e My todos 0 → aviso `` `Linha ${n}: todos os esforços nulos, ignorada.` ``.
- Agrupe por `pilar` (texto exato, ordem de aparição). `bx`, `by`: primeira linha do pilar com os dois valores; ausentes → 0.30 × 0.30 m e aviso `` `Pilar ${nome}: dimensões da base não informadas, usado 30 × 30 cm [a confirmar].` `` (uma vez por pilar). `x`, `y`: primeira linha com valor; se alguma posição faltar em qualquer pilar, todos os pilares sem posição recebem `x = 5 × índice` (índice 0-based entre os arranques) e `y = 0`, com um único aviso `'Posição dos arranques não informada: lançados em linha, 5 m entre eixos; ajuste na planta.'`.
- Hipóteses: nomes únicos de `caso` na ordem de aparição. Natureza por nome (minúsculo, sem acento): `^g$|perm|peso|^pp|^cp` → `G`; `vent|^w` → `W`; `sism|^e$` → `E`; senão `Q`.
- `comandosArranques(r, nomeObra, seqInicial = 0)` (se `r.erros.length`, devolva `[]`): `seq` local; `novoId(pre) = `${pre}_${(++seq).toString(36)}``. Ordem: `obra.definir { nome: nomeObra.trim(), origem: 'texto' }`; para cada hipótese cujo `nome.toUpperCase()` não é `'G'` nem `'Q'`: `caso.criar { nome, natureza }` e guarde `cs_<id>`; para cada arranque: `pilar.inserir { x, y, secao: { tipo: 'ret', b: bx, h: by }, nasce: 'fundacao', morre: 'fundacao', nome }` (id `p_…`) e, para cada carga com algum esforço ≠ 0, `carga.pilar { pilar: id, caso, N, Hx, Hy, Mx, My }` (id consome 1 `seq`), onde `caso` é `'G'` ou `'Q'` se o nome em maiúsculas for um deles, senão o id `cs_…` da hipótese. Arredonde valores a 6 casas (`+v.toFixed(6)`). Consomem `seq`: `caso.criar`, `pilar.inserir`, `carga.pilar`.

## Testes (`importarArranques.test.ts`)
Defina `const TXT = 'Pilar;Caso;N;Hx;Hy;Mx;My;bx;by\nP1;G;500,5;0;0;0;0;30;40\nP1;Q;100;0;0;0;0;30;40\nP2;Vento1;-20;15;0;0;30;25;25\n'`.
1. `parseNumero`: os cinco exemplos da regra (`'1.234,5'`→1234.5, `'1,234.5'`→1234.5, `'12,5'`→12.5, `'-3.2'`→-3.2, `'abc'`→NaN).
2. `lerTabela(TXT).separador === 'pontoVirgula'` e 4 linhas × 9 colunas; vírgula: `lerTabela('a,b,c\n1,2,3\n4,5,6\n1,2,3\n1,2,3').separador === 'virgula'`; tabulação: `'a\tb\n1\t2'` → `'tab'`; colunas por espaço: `'Pilar Caso N\nP1 G 500'` → `'colunas'`; fixas: `lerTabela('P1  G  500', { separador: 'colunas', larguras: [4, 3, 3] }).linhas[0]` igual a `['P1', 'G', '500']`.
3. `sugerirMapeamento(['Pilar', 'Hipótese', 'N', 'Hx', 'Hy', 'Mx', 'My', 'bx', 'by'])` igual a `{ pilar: 0, caso: 1, N: 2, Hx: 3, Hy: 4, Mx: 5, My: 6, bx: 7, by: 8 }`.
4. `importarArranques(TXT, MAP)` com `MAP` do item 3 e `UNIDADES_PADRAO`: 2 arranques; `P1` com `bx = 0.3`, `by = 0.4` e 2 cargas (`N` 500.5 e 100); `P2` com `bx = 0.25`, `by = 0.25` e uma carga `{ caso: 'Vento1', N: -20, Hx: 15, Hy: 0, Mx: 0, My: 30 }`; hipóteses `[{ nome: 'G', natureza: 'G' }, { nome: 'Q', natureza: 'Q' }, { nome: 'Vento1', natureza: 'W' }]`; `avisos` contém `'Posição dos arranques não informada: lançados em linha, 5 m entre eixos; ajuste na planta.'`; `erros` vazio.
5. Unidades: `tf` e `tf·m` multiplicam por 9.80665 (`N` de 10 tf → 98.0665); `compressaoPositiva: false` inverte o sinal de N.
6. Linha com número inválido (`'P3;G;abc;…'`) e linha com pilar vazio geram os avisos exatos das regras; sem mapear `N` → `erros` com `'Mapeie as colunas Pilar, Caso e N.'`.
7. `comandosArranques(r, 'Obra X')` aplicados numa `Sessao(edificioVazio())` (de `../commands` e `./types`): todos `ok`; `modelo.pilares.length === 2`, todos com `nasce === 'fundacao'` e `morre === 'fundacao'`; `modelo.cargasPilar.length === 3`; `modelo.casos.length === 1` (só `Vento1`; G e Q são fixos); `modelo.obra.nome === 'Obra X'`, `origem === 'texto'`.

## Verificação
```bash
npx tsc -b && npx vitest run src/core/building/importarArranques.test.ts
```
