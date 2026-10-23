# D3 — cartão 01: estado de interface do Edifício num store, janelas de formulário e casca da Configuração da obra

Classe: Sonnet baixo (refatoração de estado local para store; integra layout).

Motivo: a faixa é renderizada pelo `App`, fora do componente `Edificio`. Os botões dela precisam abrir diálogos e trocar a vista, que hoje são `useState` locais de `Edificio.tsx`. Este cartão passa esse estado para um store zustand (mesmo padrão de `plantaStore.ts`), sem mudar nenhum comportamento.

## Arquivos
- `src/app/edificio/uiStore.ts` (novo)
- `src/app/edificio/Edificio.tsx` (troca de `useState` por store; `export` em `Malha` e `NovoPavimento`; render das janelas novas)
- `src/app/edificio/Configuracao.tsx` (novo; casca)
- `src/app/design/global.css` (classes `.cfg*`)

## `src/app/edificio/uiStore.ts`
```ts
// Estado de interface do módulo Edifício que a faixa de comandos também comanda: vista ativa, diálogos e janelas de formulário (não vai para o arquivo).
import { create } from 'zustand';
import type { DialogoGrupos } from './GruposL4';

export type AbaEdificio = 'planta' | 'vista3d' | 'elevacao' | 'verificacao' | 'analise' | 'deslocamentos' | 'isovalores' | 'dimensionamento' | 'pranchas' | 'premissas';
export type DialogoL1 = null | 'nova' | 'recentes' | 'texto' | 'gerais';
export type DialogoL2 = null | { tipo: 'lancar'; inicial?: string } | { tipo: 'gabaritos' } | { tipo: 'vistas' };
export type DialogoL4 = DialogoGrupos | 'guia';
/** Janelas que mostram um formulário que antes ficava num grupo da coluna esquerda. */
export type JanelaForm = null | 'malha' | 'novoPavimento';

interface UiState {
  aba: AbaEdificio;
  memo: boolean;
  l1: DialogoL1;
  l2: DialogoL2;
  l4: DialogoL4;
  jan: JanelaForm;
  /** Seção aberta da Configuração da obra (id de `SECOES` em Configuracao.tsx); null = fechada. */
  cfg: string | null;
  set(p: Partial<Omit<UiState, 'set'>>): void;
}

export const useEdifUI = create<UiState>((set) => ({ aba: 'planta', memo: false, l1: null, l2: null, l4: null, jan: null, cfg: null, set: (p) => set(p) }));
```

## `src/app/edificio/Edificio.tsx`
1. Import: `import { useEdifUI, type AbaEdificio, type DialogoL1, type DialogoL2, type DialogoL4 } from './uiStore';`; remover `type DialogoGrupos` do import de `GruposL4` se ficar sem uso (o store o importa).
2. Trocar as cinco linhas de `useState` (aba, memo, dialogoL1, dialogoL2, dialogoL4) por:
```tsx
  const ui = useEdifUI();
  const aba = ui.aba, memo = ui.memo, dialogoL1 = ui.l1, dialogoL2 = ui.l2, dialogoL4 = ui.l4;
  const setAba = (a: AbaEdificio) => ui.set({ aba: a });
  const setMemo = (v: boolean) => ui.set({ memo: v });
  const setDialogoL1 = (v: DialogoL1) => ui.set({ l1: v });
  const setDialogoL2 = (v: DialogoL2) => ui.set({ l2: v });
  const setDialogoL4 = (v: DialogoL4) => ui.set({ l4: v });
```
Onde o código usa `typeof aba` (por exemplo `setAba(a as typeof aba)`), o tipo é agora `AbaEdificio`: pode manter.
3. `function NovoPavimento` e `function Malha` passam a `export function`.
4. Antes de `<JanelaElemento />`, acrescentar:
```tsx
      {ui.jan === 'malha' && <Modal titulo="Malha de eixos" onClose={() => ui.set({ jan: null })}><Malha /></Modal>}
      {ui.jan === 'novoPavimento' && <Modal titulo="Novo pavimento" onClose={() => ui.set({ jan: null })}><NovoPavimento b={b} /></Modal>}
      {ui.cfg && <JanelaConfiguracao b={b} />}
```
com `Modal` no import de `'../ui'` e `import { JanelaConfiguracao } from './Configuracao';`.

## `src/app/edificio/Configuracao.tsx` (casca; as seções entram no cartão 07)
```tsx
// Configuração da obra: janela com índice lateral que reúne os grupos de premissas (dados gerais, opções de cálculo, materiais, casos, vento…).
// Cada seção é o componente de grupo que já existia; só o lugar mudou (docs/analises/layout-bimcraft-mapa.md, destino CFG).
import { useEffect, useRef, type ReactNode } from 'react';
import { Button, Modal } from '../ui';
import type { BuildingModel } from '../../core/building/types';
import { DadosGeraisCorpo } from './DadosGerais';
import { useEdifUI } from './uiStore';

export interface SecaoCfg { id: string; titulo: string; corpo: (b: BuildingModel) => ReactNode }
/** Seções na ordem do índice. O cartão 07 acrescenta as demais. */
export const SECOES: SecaoCfg[] = [
  { id: 'dados', titulo: 'Dados gerais', corpo: (b) => <DadosGeraisCorpo b={b} /> },
];

export function JanelaConfiguracao({ b }: { b: BuildingModel }) {
  const cfg = useEdifUI((s) => s.cfg);
  const secao = SECOES.find((s) => s.id === cfg) ?? SECOES[0];
  const corpo = useRef<HTMLDivElement>(null);
  // os grupos nascem recolhidos (<details>): dentro da janela abrem todos
  useEffect(() => { corpo.current?.querySelectorAll('details.group').forEach((d) => { (d as HTMLDetailsElement).open = true; }); }, [secao.id, b]);
  return (
    <Modal titulo="Configuração da obra" larga onClose={() => useEdifUI.getState().set({ cfg: null })}>
      <div className="cfg">
        <nav className="cfg-ind" aria-label="Seções da configuração">
          {SECOES.map((s) => (
            <Button key={s.id} variant="nenhuma" className={`cfg-item${s.id === secao.id ? ' on' : ''}`} aria-current={s.id === secao.id ? 'true' : undefined} onClick={() => useEdifUI.getState().set({ cfg: s.id })}>{s.titulo}</Button>
          ))}
        </nav>
        <div className="cfg-corpo edif-in" ref={corpo}>{secao.corpo(b)}</div>
      </div>
    </Modal>
  );
}
```

## `src/app/design/global.css` (fim)
```css
.cfg { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--sp-4); min-height: 60vh; max-height: 75vh; }
.cfg-ind { display: flex; flex-direction: column; gap: var(--sp-1); overflow-y: auto; border-right: 1px solid var(--line); padding-right: var(--sp-3); }
.cfg-item { height: var(--h-ctl); padding: 0 var(--sp-3); border: 0; border-radius: var(--radius); background: none; color: var(--ink); text-align: left; white-space: nowrap; }
.cfg-item:hover { background: var(--hover); }
.cfg-item.on { background: var(--accent-soft); color: var(--accent-text); }
.cfg-corpo { overflow-y: auto; min-width: 0; }
@media (max-width: 900px) { .cfg { grid-template-columns: 1fr; } .cfg-ind { flex-direction: row; flex-wrap: wrap; border-right: 0; padding-right: 0; } }
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run e2e -- --workers 4` completo (81 verdes: nada mudou de lugar). `npm run mapa`.

## Regras
Nenhum rótulo, `role` nem `aria-label` existente muda. Os diálogos continuam renderizados por `Edificio` (mesmo gatilho, agora também comandável de fora).
