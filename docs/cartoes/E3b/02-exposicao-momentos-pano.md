# E3b — cartão 2: exposição e momentos mínimos por pano (grupo "Vínculos, flambagem e cobrimento")

Classe: Haiku (campos novos no grupo que já edita os engastes das lajes selecionadas na planta; padrão de `Vinculos.tsx`).

## Arquivos (2)
1. **Novo** `src/app/edificio/VigotasPano.tsx` com o conteúdo exato abaixo.
2. `src/app/edificio/Vinculos.tsx`: importar `VigotasPano` e mostrá-lo logo abaixo da caixa "Vigotas biapoiadas" (diff abaixo).

## Núcleo usado (já existe)
Comandos `laje.exposicao { ids? | grupo?, caa: I | II | III | IV | obra }` (classe de agressividade do pano; define o nível de protensão das protendidas, NBR 6118 Tabela 13.4 a confirmar) e `laje.momentosMin { ids, tipo: extremo | intermediario | isolado | balanco, pos?, neg?, limpar? }` (divisores de p·ℓ² por tipo de vão; 0 desliga; sem valor, o da obra), campos `Laje.exposicao` e `Laje.momentosMin`, `TIPOS_VAO` (`types.ts`).

## Regras
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Rótulos únicos na tela. Sem CSS novo, sem cor literal, sem botão na barra da planta. Nos testes de interface (`e2e/flows.mjs`), `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select`, cujo rótulo vem com texto extra: nesses, regex ancorada (`/^Tipo da série/`). O núcleo e os comandos (`vigota.*`, `laje.exposicao`, `laje.momentosMin`, `armadura.desbloquear`) já existem e estão testados; não altere nada de `src/core/`.

Rótulos: "Classe de agressividade do pano", "Estender a classe a todos os panos do grupo", "Tipo de vão dos momentos mínimos", "Divisor do positivo mínimo (p·ℓ² / …)", "Divisor do negativo mínimo (p·ℓ² / …)", "Aplicar os momentos mínimos ao pano", "Voltar aos momentos mínimos da obra". Atributo de teste: `data-vigotas-pano`.

## Conteúdo de `src/app/edificio/VigotasPano.tsx`
```tsx
// Vigotas por pano (frente E3b): classe de agressividade ambiental do pano (nível de protensão das vigotas protendidas,
// NBR 6118, Tabela 13.4 a confirmar) e momentos mínimos por tipo de vão. Usado no grupo "Vínculos e engastes" para as lajes
// nervuradas selecionadas na planta. Os comandos são `laje.exposicao` e `laje.momentosMin`.
import { useState } from 'react';
import { useBuilding } from './store';
import { Button, Hint, NumField, Select } from '../ui';
import { TIPOS_VAO, type Laje, type TipoVao } from '../../core/building/types';
import { OPCOES_PADRAO_CALCULO } from '../../core/building/opcoes';

type Caa = 'obra' | 'I' | 'II' | 'III' | 'IV';
const CAA: { v: Caa; label: string }[] = [{ v: 'obra', label: 'a da obra' }, { v: 'I', label: 'I (fraca)' }, { v: 'II', label: 'II (moderada)' }, { v: 'III', label: 'III (forte)' }, { v: 'IV', label: 'IV (muito forte)' }];

/** Divisores dos momentos mínimos do tipo de vão (campos reiniciados ao trocar o tipo ou a laje pela `key` do chamador). */
function MomentosMinimos({ lajes, tipo }: { lajes: Laje[]; tipo: TipoVao }) {
  const { exec } = useBuilding();
  const ids = lajes.map((l) => l.id), atual = lajes[0].momentosMin?.[tipo];
  const [pos, setPos] = useState(atual?.pos ?? OPCOES_PADRAO_CALCULO.vigotaMomentoMinPositivo);
  const [neg, setNeg] = useState(atual?.neg ?? OPCOES_PADRAO_CALCULO.vigotaMomentoMinNegativo);
  return (
    <>
      <div className="row wrap">
        <NumField label="Divisor do positivo mínimo (p·ℓ² / …)" width={210} value={pos} onChange={(v) => setPos(Math.max(0, Math.min(50, v)))} />
        <NumField label="Divisor do negativo mínimo (p·ℓ² / …)" width={210} value={neg} onChange={(v) => setNeg(Math.max(0, Math.min(50, v)))} />
      </div>
      <div className="row wrap">
        <Button onClick={() => exec('laje.momentosMin', { ids, tipo, pos, neg })}>Aplicar os momentos mínimos ao pano</Button>
        <Button disabled={!atual} onClick={() => exec('laje.momentosMin', { ids, tipo, limpar: true })}>Voltar aos momentos mínimos da obra</Button>
      </div>
    </>
  );
}

export function VigotasPano({ lajes }: { lajes: Laje[] }) {
  const { exec } = useBuilding();
  const ids = lajes.map((l) => l.id), l0 = lajes[0];
  const [tipo, setTipo] = useState<TipoVao>('isolado');
  return (
    <div data-vigotas-pano>
      <div className="row wrap">
        <Select label="Classe de agressividade do pano" value={(l0.exposicao ?? 'obra') as Caa} options={CAA} onChange={(c: Caa) => exec('laje.exposicao', { ids, caa: c })} />
        <Button onClick={() => exec('laje.exposicao', { grupo: l0.grupo, caa: l0.exposicao ?? 'obra' })}>Estender a classe a todos os panos do grupo</Button>
        <Select label="Tipo de vão dos momentos mínimos" value={tipo} options={TIPOS_VAO.map((t) => ({ v: t.v, label: t.rotulo }))} onChange={setTipo} />
      </div>
      <MomentosMinimos key={`${ids.join(',')}|${tipo}|${JSON.stringify(l0.momentosMin?.[tipo] ?? null)}`} lajes={lajes} tipo={tipo} />
      <Hint>0 desliga o momento mínimo do tipo de vão. Sem valor do pano vale o da obra (opções “Vigotas: momento positivo/negativo mínimo”). A classe do pano define o nível de protensão das vigotas protendidas.</Hint>
    </div>
  );
}
```

## Diff de `src/app/edificio/Vinculos.tsx`
```diff
diff --git a/src/app/edificio/Vinculos.tsx b/src/app/edificio/Vinculos.tsx
index bae023f..5bb2064 100644
--- a/src/app/edificio/Vinculos.tsx
+++ b/src/app/edificio/Vinculos.tsx
@@ -10,6 +10,7 @@ import { useBuilding } from './store';
 import { LanceDoPilar } from './Transicao';
 import { SecaoDaViga } from './SecaoVigaUI';
 import { VigaCurvaComum } from './VigaCurvaComumUI';
+import { VigotasPano } from './VigotasPano';
 
 const fmt = (v: number) => String(+v.toFixed(2)).replace('.', ',');
 /** O traçado de uma viga toca o da outra (cruzamento ou apoio) sem serem colineares? */
@@ -207,6 +208,7 @@ export function VinculosGrupo({ b }: { b: BuildingModel }) {
               onChange={(c) => lote(lajes.filter((l) => ehNervurada(l.tipo)).map((l) => ({ nome: 'laje.editar', params: { id: l.id, vigotasBiapoiadas: c } })))} />
           </div>
         )}
+        {lajes.some((l) => ehNervurada(l.tipo)) && <VigotasPano lajes={lajes.filter((l) => ehNervurada(l.tipo))} />}
         <Hint>Bordas numeradas a partir do primeiro vértice do contorno, no sentido anti-horário. Bordas que tocam pilares ficam sempre engastadas.</Hint>
       </>)}
     </Group>
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3b` (cartão 3) cobre este grupo.
