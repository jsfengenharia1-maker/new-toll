# L3 — cartão 2: ligação com a janela "Nova obra"

Classe: Haiku. Depende do cartão 1. Três arquivos, edições pequenas.

## `src/app/edificio/uiStore.ts`
Trocar a linha
```ts
export type DialogoL1 = null | 'nova' | 'recentes' | 'texto' | 'gerais';
```
por
```ts
export type DialogoL1 = null | 'nova' | 'recentes' | 'texto' | 'gerais' | 'ifc';
```

## `src/app/edificio/NovaObra.tsx`
1. Na lista `MODOS`, trocar a linha do modo `ifc` por `  { v: 'ifc', label: 'Importação de IFC' },` (sem `desabilitado`).
2. Na assinatura de `NovaObra`, acrescentar `onIfc`: `export function NovaObra({ onClose, onCriada, onTexto, onDxf, onIfc }: { onClose(): void; onCriada(): void; onTexto(): void; onDxf(): void; onIfc(): void }) {`.
3. Depois do bloco `{modo === 'dxf' && ( ... )}` (a linha com o botão "Criar edifício padrão e lançar pelo gabarito…" e o `)}` que o fecha), acrescentar:
```tsx
            {modo === 'ifc' && (
              <>
                <Hint>Lê um arquivo IFC (IFC2x3 ou IFC4): pavimentos, pilares, vigas, lajes com aberturas e paredes de concreto; depois pede os dados do edifício e dos pavimentos e liga os materiais do arquivo aos tipos de elemento.</Hint>
                <div><Button variant="primary" onClick={() => onIfc()}>Importar arquivo IFC…</Button></div>
              </>
            )}
```

## `src/app/edificio/Edificio.tsx`
1. Depois de `import { LancamentoDxf } from './LancamentoDxf';`, acrescentar `import { LancamentoIfc } from './LancamentoIfc';`.
2. Na linha `{dialogoL1 === 'nova' && <NovaObra ... />}`, acrescentar a propriedade `onIfc={() => setDialogoL1('ifc')}` depois de `onDxf={...}` e, logo abaixo, a linha:
```tsx
      {dialogoL1 === 'ifc' && <LancamentoIfc onClose={() => setDialogoL1(null)} onCriada={() => setDialogoL1('gerais')} />}
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design --reporter=dot`.
