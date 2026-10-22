# Cartão L1-02 — Categorias de uso por norma (tabela editável)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis.

## Objetivo
Tabela de categorias de uso da NBR 6120 com sobrecarga, que o assistente (cartão 03) e a interface oferecem. Item: C3.12.
Não altere `CategoriaUso`, `USOS`, `qDoUso` nem `CLASSE_DO_USO` de `types.ts`: cada categoria nova aponta para uma das 7 categorias existentes (campo `uso`), que define a classe de ψ.

## Arquivos
1. `src/core/building/categoriasUso.ts` (criar)
2. `src/core/building/categoriasUso.test.ts` (criar)

## `categoriasUso.ts` — conteúdo exato
```ts
// Categorias de uso e sobrecargas por norma (L1, C3.12). Cada categoria aponta para uma `CategoriaUso` do modelo
// (que fixa a classe de ψ). Valores da NBR 6120:2019, Tabela 10, [a confirmar] na conferência com a edição vigente.
import { USOS, type CategoriaUso } from './types';

export type NormaUso = 'NBR6120';
export interface CategoriaUsoInfo {
  /** Identificador estável (gravado na especificação do assistente). */
  id: string;
  rotulo: string;
  /** Sobrecarga (kN/m²). */
  q: number;
  /** Categoria do modelo usada no grupo (define a classe de ψ). */
  uso: CategoriaUso;
  aConfirmar: boolean;
}

/** As 7 categorias do modelo (id = valor de `CategoriaUso`) seguidas das categorias adicionais da NBR 6120. */
const ADICIONAIS: CategoriaUsoInfo[] = [
  { id: 'sala-aula', rotulo: 'Escolas: salas de aula', q: 3.0, uso: 'escritorio', aConfirmar: true },
  { id: 'comercio', rotulo: 'Lojas e comércio', q: 4.0, uso: 'escritorio', aConfirmar: true },
  { id: 'reuniao', rotulo: 'Restaurantes, salões e locais de reunião', q: 3.0, uso: 'escritorio', aConfirmar: true },
  { id: 'auditorio', rotulo: 'Auditórios, cinemas e teatros com plateia fixa', q: 3.0, uso: 'escritorio', aConfirmar: true },
  { id: 'academia', rotulo: 'Academias e salões de dança', q: 4.0, uso: 'escritorio', aConfirmar: true },
  { id: 'hospital', rotulo: 'Hospitais: quartos e enfermarias', q: 2.0, uso: 'residencial', aConfirmar: true },
  { id: 'biblioteca', rotulo: 'Bibliotecas: salas de leitura', q: 3.0, uso: 'garagem', aConfirmar: true },
  { id: 'arquivo', rotulo: 'Arquivos e depósitos de livros', q: 6.0, uso: 'garagem', aConfirmar: true },
  { id: 'arquibancada', rotulo: 'Arquibancadas e tribunas', q: 5.0, uso: 'escritorio', aConfirmar: true },
];

/** Tabela de categorias da norma (cópia nova a cada chamada, para a interface editar à vontade). */
export function categoriasDeUso(norma: NormaUso = 'NBR6120'): CategoriaUsoInfo[] {
  if (norma !== 'NBR6120') return [];
  const base = USOS.map((u): CategoriaUsoInfo => ({ id: u.v, rotulo: u.label, q: u.q, uso: u.v, aConfirmar: true }));
  return [...base, ...ADICIONAIS].map((c) => ({ ...c }));
}

/** Categoria pelo id; desconhecido → `undefined`. */
export const categoriaPorId = (id: string, norma: NormaUso = 'NBR6120'): CategoriaUsoInfo | undefined => categoriasDeUso(norma).find((c) => c.id === id);
```

## Testes (`categoriasUso.test.ts`, vitest)
Importe `describe, expect, it` de `vitest`, `categoriasDeUso`, `categoriaPorId` de `./categoriasUso` e `USOS`, `qDoUso` de `./types`.
1. `it('começa pelas 7 categorias do modelo, com as mesmas sobrecargas')`: `categoriasDeUso().slice(0, 7).map((c) => [c.id, c.q])` igual a `USOS.map((u) => [u.v, qDoUso(u.v)])`.
2. `it('tem 16 categorias, ids únicos e q ≥ 0')`: comprimento 16; `new Set(ids).size === 16`; todo `q >= 0`.
3. `it('toda categoria adicional aponta para uma categoria do modelo')`: para cada `c`, `USOS.some((u) => u.v === c.uso)` é true.
4. `it('devolve cópias independentes')`: `const a = categoriasDeUso(); a[0].q = 99; expect(categoriasDeUso()[0].q).toBe(1.5)`.
5. `it('categoriaPorId')`: `categoriaPorId('comercio')?.q === 4`; `categoriaPorId('nao-existe') === undefined`.

## Premissa
Os valores adicionais são "a confirmar" (conferir na NBR 6120:2019, Tabela 10); as 7 primeiras já têm a premissa `uso`. A tabela é editável no assistente (cartões 13 e 14: sobrecarga por pavimento e por categoria).

## Verificação
```bash
npx tsc -b && npx vitest run src/core/building/categoriasUso.test.ts
```
