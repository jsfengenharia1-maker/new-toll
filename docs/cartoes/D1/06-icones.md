# D1 — cartão 06: ícones novos da faixa

Classe: Haiku (acrescenta entradas a uma tabela existente, com teste de valores esperados). Ícones próprios, traços simples em 22 × 22 (sem ícone de terceiros nem do programa original).

## Arquivos
- `src/app/ui/Icone.tsx`: acrescentar as entradas abaixo a `TRACOS` e exportar `NOMES_ICONE`.
- `src/app/ui/icone.test.ts` (novo).

## `src/app/ui/Icone.tsx`
Depois da linha `verificacao: 'M4 11 L9 16 L18 5',` (dentro de `TRACOS`) acrescente:
```ts
  abrir: 'M3 7 H9 L11 9 H19 V18 H3 Z',
  salvar: 'M4 4 H16 L18 6 V18 H4 Z M7 4 V9 H14 V4 M7 18 V13 H15 V18',
  novo: 'M5 3 H13 L17 7 V19 H5 Z M13 3 V7 H17 M11 10 V16 M8 13 H14',
  exportar: 'M11 3 V13 M7 7 L11 3 L15 7 M4 13 V19 H18 V13',
  importar: 'M11 13 V3 M7 9 L11 13 L15 9 M4 13 V19 H18 V13',
  biblioteca: 'M4 4 V18 M8 4 V18 M12 4 V18 M15 5 L19 17',
  exemplos: 'M4 4 H18 V18 H4 Z M4 9 H18 M9 9 V18',
  versoes: 'M4 4 H11 V11 H4 Z M8 8 H15 V15 H8 Z M12 12 H19 V19 H12 Z',
  config: 'M11 8 a3 3 0 1 0 0.01 0 M11 2 V5 M11 17 V20 M2 11 H5 M17 11 H20 M5 5 L7 7 M15 15 L17 17 M17 5 L15 7 M5 17 L7 15',
  obra: 'M3 19 H19 M5 19 V8 L11 4 L17 8 V19 M9 19 V13 H13 V19',
  pavimento: 'M3 7 L11 3 L19 7 L11 11 Z M3 11 L11 15 L19 11 M3 15 L11 19 L19 15',
  pilarParede: 'M7 3 H15 V19 H7 Z M7 8 H15 M7 14 H15',
  parede: 'M3 6 H19 V16 H3 Z M3 11 H19 M9 6 V11 M14 11 V16',
  vigaInclinada: 'M3 16 L19 6 M3 19 L19 9',
  malha: 'M3 7 H19 M3 15 H19 M7 3 V19 M15 3 V19',
  cargaLaje: 'M3 17 H19 M5 4 V12 M5 12 L3 9 M5 12 L7 9 M11 4 V12 M11 12 L9 9 M11 12 L13 9 M17 4 V12 M17 12 L15 9 M17 12 L19 9',
  cargaViga: 'M3 16 H19 M4 6 H18 M6 6 V13 M11 6 V13 M16 6 V13',
  importarDxf: 'M5 3 H13 L17 7 V19 H5 Z M8 14 H14 M8 11 H11',
  alinhar: 'M4 4 V18 M4 7 H12 M4 11 H17 M4 15 H9',
  gabarito: 'M3 3 H19 V19 H3 Z M7 7 H15 V15 H7 Z',
  contorno: 'M4 4 H18 V18 H4 Z M7 7 H15 V15 H7 Z',
  abertura: 'M3 4 H19 V18 H3 Z M8 8 H14 V14 H8 Z M8 8 L14 14',
  corte: 'M3 11 H19 M6 5 L3 11 L6 17 M16 5 L19 11 L16 17',
  secao: 'M3 11 H8 M14 11 H19 M11 4 V18 M8 8 L11 4 L14 8',
  dividir: 'M3 11 H8 M14 11 H19 M11 5 V17 M8 8 L14 14',
  unir: 'M3 11 H9 M13 11 H19 M9 7 V15 M13 7 V15',
  prolongar: 'M3 11 H15 M12 7 L16 11 L12 15 M18 5 V17',
  girar: 'M17 11 A6 6 0 1 1 11 5 M8 2 L11 5 L8 8',
  espelhar: 'M11 3 V19 M8 6 L3 16 H8 Z M14 6 L19 16 H14 Z',
  grupos: 'M3 4 H10 V10 H3 Z M12 12 H19 V18 H12 Z M10 7 H14 V12',
  referencia: 'M4 6 H18 M4 11 H12 M4 16 H15 M16 14 L18 16 L16 18',
  contaGotas: 'M15 3 L19 7 L13 13 L9 9 Z M9 9 L4 16 L6 18 L13 13',
  puncao: 'M8 11 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M11 3 V6 M11 16 V19 M3 11 H6 M16 11 H19 M5 5 L7 7 M15 15 L17 17 M17 5 L15 7 M5 17 L7 15',
  zona: 'M3 4 H19 V18 H3 Z M7 8 H15 M7 11 H15 M7 14 H15',
  dobra: 'M3 17 L9 5 L13 5 L19 17 M8 14 H14',
  casos: 'M4 5 H18 M4 9 H18 M4 13 H14 M4 17 H11',
  estados: 'M4 18 V6 M4 18 H18 M7 14 L11 9 L15 12 L18 6',
  vento: 'M3 8 H13 A3 3 0 1 0 10 5 M3 12 H17 A3 3 0 1 1 14 15 M3 16 H9',
  empuxo: 'M16 3 V19 M16 7 H6 M8 5 L5 7 L8 9 M16 12 H8 M10 10 L7 12 L10 14',
  calcular: 'M4 3 H18 V19 H4 Z M7 6 H15 V9 H7 Z M7 12 H9 M11 12 H13 M7 15 H9 M11 15 H13',
  rearmar: 'M17 8 A6 6 0 1 0 17 14 M17 4 V8 H13',
  relatorio: 'M5 3 H17 V19 H5 Z M8 14 V10 M11 14 V7 M14 14 V11',
  memorial: 'M4 3 H16 V19 H4 Z M16 5 H19 V21 H7 M7 7 H13 M7 10 H13',
  fogo: 'M11 3 C14 7 16 9 16 13 A5 5 0 0 1 6 13 C6 10 8 9 8 6 C9 7 10 8 11 3 Z',
  enviar: 'M3 11 H15 M11 6 L16 11 L11 16 M19 4 V18',
  fundacao: 'M6 3 H16 V9 H6 Z M3 9 H19 V13 H3 Z M11 13 V19',
  vigaFund: 'M3 8 H19 V12 H3 Z M6 12 V18 M16 12 V18',
  radier: 'M3 8 H19 V12 H3 Z M3 15 H19 M3 18 H19',
  vigaElastica: 'M3 7 H19 V11 H3 Z M4 14 L6 17 L8 14 L10 17 L12 14 L14 17 L16 14 L18 17',
  corrida: 'M3 9 H19 V13 H3 Z M3 13 V16 M19 13 V16 M11 4 V9',
  limite: 'M4 16 L7 6 L16 4 L18 14 L4 16 Z',
  girarFund: 'M5 15 A7 7 0 0 1 15 5 M12 3 L16 5 L14 9 M4 18 H18',
  pontoIns: 'M11 4 V8 M11 14 V18 M4 11 H8 M14 11 H18 M9 11 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0',
  sondagem: 'M8 3 H14 V19 H8 Z M8 7 H12 M8 11 H12 M8 15 H12',
  pranchas: 'M3 3 H19 V19 H3 Z M3 15 H19 M14 15 V19 M7 7 H15',
  enquadrar: 'M3 8 V3 H8 M14 3 H19 V8 M19 14 V19 H14 M8 19 H3 V14',
  camadas: 'M11 3 L19 8 L11 13 L3 8 Z M3 12 L11 17 L19 12',
  tema: 'M11 3 A8 8 0 1 0 11 19 Z',
  no: 'M7 7 H15 V15 H7 Z M11 2 V5 M11 17 V20 M2 11 H5 M17 11 H20',
  barra: 'M4 17 L18 5 M2 15 H6 V19 H2 Z M16 3 H20 V7 H16 Z',
  cota: 'M3 16 H19 M3 12 V19 M19 12 V19 M6 13 L3 16 L6 19 M16 13 L19 16 L16 19',
  zoom: 'M9 15 A6 6 0 1 0 9 3 A6 6 0 0 0 9 15 M14 14 L19 19 M6 9 H12 M9 6 V12',
  transformar: 'M3 3 H11 V11 H3 Z M11 11 H19 V19 H11 Z M13 5 L17 9',
  remover: 'M5 6 H17 M9 6 V4 H13 V6 M7 6 V18 H15 V6 M10 9 V15 M12 9 V15',
  apoio: 'M11 4 L4 14 H18 Z M3 17 H19',
  resultados: 'M4 18 V6 M4 18 H18 M7 14 L11 9 L15 12 L18 6',
  influencia: 'M3 16 L8 16 L11 5 L14 16 L19 16',
  modos: 'M3 11 Q7 3 11 11 T19 11',
  paleta: 'M9 15 A6 6 0 1 0 9 3 A6 6 0 0 0 9 15 M14 14 L19 19',
```
E ao fim do arquivo (depois da função `Icone`):
```ts
export const NOMES_ICONE = Object.keys(TRACOS);
```

## `src/app/ui/icone.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { NOMES_ICONE } from './Icone';

describe('ícones', () => {
  it('traz os 17 ícones da L4 e os 69 da faixa (86 no total), sem nomes repetidos', () => {
    expect(NOMES_ICONE.length).toBe(86);
    expect(new Set(NOMES_ICONE).size).toBe(86);
  });
  it('nomes que a faixa usa existem', () => {
    for (const n of ['abrir', 'salvar', 'pilar', 'viga', 'laje', 'carga', 'fundacao', 'calcular', 'pranchas', 'enquadrar', 'paleta', 'dividir', 'puncao']) expect(NOMES_ICONE).toContain(n);
  });
});
```
(Se a contagem diferir por erro de digitação ao copiar, a diferença aponta o arquivo: conte as chaves com `node -e` no `TRACOS`; o número esperado vem desta tabela: 17 existentes + 69 novos.)

## Verificação
`npx tsc -b`; `npx vitest run src/app/ui src/app/design`; `npm run mapa`.
