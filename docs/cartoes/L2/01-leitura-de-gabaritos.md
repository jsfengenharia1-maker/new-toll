# Cartão L2-01 — Leitura de gabaritos DXF e DWG no navegador

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões anteriores na ordem do índice; o núcleo da L2 (`lancamentoDxf.ts`, `commands/lancamento.ts`, `dwgLeitor.ts`, comandos `mascara.*`) já está no repositório. Não edite o núcleo.

## Objetivo
Módulo que lê um arquivo DXF (texto) ou DWG (leitor do nasjidwg carregado de `public/vendor` sob demanda) e devolve as camadas, a unidade e os avisos; a unidade e a estimativa de unidade saem de `Edificio.tsx` para ele. Itens: C1.18, C2.6. Classe sugerida: Haiku, esforço baixo (arquivo dado por inteiro).

## Arquivos
1. `src/app/edificio/lancamentoLeitura.ts` (criar)
2. `src/app/edificio/Edificio.tsx` (editar)

Leia antes: `src/core/dxf/read.ts` (`lerDxf`, `metrosPorUnidade`); `src/core/dxf/dwgLeitor.ts` (`lerDwg`, `VENDOR_DWG_LEITOR`, `LeitorDwg`; já existe); `src/app/edificio/Pranchas.tsx` (função `carregarDwg`, o mesmo padrão de carga sob demanda).

## Criar `src/app/edificio/lancamentoLeitura.ts`
Crie o arquivo com exatamente este conteúdo.

````ts
// Leitura de gabaritos DXF e DWG no navegador (L2): o DXF é lido direto; o DWG pelo leitor do nasjidwg, carregado de
// public/vendor sob demanda (fora do HTML único). Sem o vendor (artifact do claude.ai), o DWG avisa e sugere o DXF.
import { lerDxf, metrosPorUnidade, type DxfLido } from '../../core/dxf/read';
import { lerDwg, VENDOR_DWG_LEITOR, type LeitorDwg } from '../../core/dxf/dwgLeitor';

export const UNIDADES = [{ v: 1, label: 'm' }, { v: 0.01, label: 'cm' }, { v: 0.001, label: 'mm' }];

/** Unidade provável do desenho quando o DXF não informa (maior dimensão do desenho) [a confirmar]. */
export function unidadeProvavel(bbox: [number, number, number, number] | null): number {
  if (!bbox) return 1;
  const D = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  return D > 5000 ? 0.001 : D > 300 ? 0.01 : 1;
}

export interface GabaritoLido {
  nome: string;
  arquivo: { nome: string; tipo: 'dxf' | 'dwg' };
  lido: DxfLido;
  /** Metros por unidade do desenho. */
  escala: number;
  /** Unidade vinda de $INSUNITS (true) ou estimada pelo tamanho do desenho (false). */
  porHeader: boolean;
  avisos: string[];
}

let leitor: Promise<LeitorDwg> | null = null;
/** Carrega o leitor de DWG de public/vendor (fora do HTML único). */
export function carregarLeitorDwg(): Promise<LeitorDwg> {
  leitor ??= import(/* @vite-ignore */ new URL(VENDOR_DWG_LEITOR, document.baseURI).href)
    .then((m: LeitorDwg) => m)
    .catch((e) => { leitor = null; throw e; });
  return leitor;
}

/** Lê um arquivo DXF ou DWG. Lança Error com a mensagem para o usuário. */
export async function lerGabarito(f: File): Promise<GabaritoLido> {
  const dwg = /\.dwg$/i.test(f.name);
  let lido: DxfLido;
  const avisos: string[] = [];
  if (dwg) {
    let lib: LeitorDwg;
    try { lib = await carregarLeitorDwg(); } catch { throw new Error('DWG indisponível neste ambiente (o leitor fica em vendor/, fora do arquivo único). Salve o desenho como DXF no AutoCAD e importe o DXF.'); }
    const r = lerDwg(new Uint8Array(await f.arrayBuffer()), lib);
    avisos.push(...r.avisos);
    lido = r;
  } else lido = lerDxf(await f.text());
  const h = metrosPorUnidade(lido.insunits);
  const ign = Object.entries(lido.ignoradas).map(([k, n]) => `${n} ${k}`).join(', ');
  if (ign) avisos.push(`Entidades não lidas: ${ign}.`);
  return {
    nome: f.name.replace(/\.(dxf|dwg)$/i, ''), arquivo: { nome: f.name, tipo: dwg ? 'dwg' : 'dxf' }, lido,
    escala: h ?? unidadeProvavel(lido.bbox), porHeader: h !== null, avisos,
  };
}
````

## Editar `src/app/edificio/Edificio.tsx`
Faça as trocas abaixo, na ordem. Em cada uma, o trecho “Procure” aparece uma única vez no arquivo (copie-o exatamente, com os espaços); substitua-o pelo trecho “Coloque”.

### Troca 1
**Procure:**
````tsx
import { lerDxf, metrosPorUnidade } from '../../core/dxf/read';
````
**Coloque:**
````tsx
import { lerDxf, metrosPorUnidade } from '../../core/dxf/read';
import { UNIDADES, unidadeProvavel } from './lancamentoLeitura';
````

### Troca 2
**Procure:**
````tsx
const UNIDADES = [{ v: 1, label: 'm' }, { v: 0.01, label: 'cm' }, { v: 0.001, label: 'mm' }];

/** Unidade provável do desenho quando o DXF não informa (maior dimensão do desenho) [a confirmar]. */
export function unidadeProvavel(bbox: [number, number, number, number] | null): number {
  if (!bbox) return 1;
  const D = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  return D > 5000 ? 0.001 : D > 300 ? 0.01 : 1;
}
````
**Coloque (apague o trecho, sem nada no lugar):**


## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```

## Pontos de atenção
- `UNIDADES` e `unidadeProvavel` passam a vir de `lancamentoLeitura.ts`; `Edificio.tsx` só os importa (nenhum outro arquivo os usava).
- Sem o arquivo `public/vendor/nasjidwg-leitor-0.18.0.mjs` (artifact do claude.ai), `lerGabarito` de um DWG lança o erro em português que sugere o DXF.
