# D1 — cartão 02: componentes `Ribbon`, `RibbonTab`, `RibbonGroup`, `RibbonButton`, `RibbonHint`

Classe: Haiku (código validado com `tsc` e `design.test`).

## Arquivos
- `src/app/ui/Ribbon.tsx` (novo)
- `src/app/ui/index.tsx` (uma linha de reexportação)

## `src/app/ui/Ribbon.tsx`
```tsx
// Faixa de comandos (D1): abas por tarefa + grupos rotulados com botões grandes. Estilo em design/global.css (.ribbon-wrap, .rtabs, .rtab, .ribbon, .rgrp, .rbtn).
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './index';
import { Icone } from './Icone';

export interface RibbonTabDef { id: string; label: string; /** Aba contextual (aparece com um elemento selecionado). */ contextual?: boolean; title?: string }

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Faixa de comandos: tira de abas (duplo clique numa aba ou o botão da ponta recolhe) e o corpo da aba ativa em `children`. */
export function Ribbon({ label, tabs, active, onActive, open, onOpen, children }: {
  label: string; tabs: RibbonTabDef[]; active: string; onActive: (id: string) => void; open: boolean; onOpen: (v: boolean) => void; children?: ReactNode;
}) {
  return (
    <div className="ribbon-wrap">
      <div className="rtabs" role="tablist" aria-label={label}>
        {tabs.map((t) => <RibbonTab key={t.id} tab={t} selected={t.id === active} onSelect={() => { onActive(t.id); if (!open) onOpen(true); }} onToggle={() => onOpen(!open)} />)}
        <Button variant="nenhuma" className="rtab-toggle" aria-label={open ? 'Recolher a faixa de comandos' : 'Expandir a faixa de comandos'} aria-expanded={open} title={open ? 'Recolher a faixa (duplo clique numa aba também)' : 'Expandir a faixa'} onClick={() => onOpen(!open)}>{open ? '⌃' : '⌄'}</Button>
      </div>
      {open && <div className="ribbon" role="toolbar" aria-label={`Comandos: ${tabs.find((t) => t.id === active)?.label ?? ''}`}>{children}</div>}
    </div>
  );
}

/** Aba da faixa. `role="tab"`: os testes de interface escopam por `[aria-label="Faixa de comandos"]`. */
export function RibbonTab({ tab, selected, onSelect, onToggle }: { tab: RibbonTabDef; selected: boolean; onSelect: () => void; onToggle: () => void }) {
  return (
    <Button variant="nenhuma" role="tab" aria-selected={selected} className={cx('rtab', selected && 'on', tab.contextual && 'ctx')} title={tab.title} onClick={onSelect} onDoubleClick={onToggle}>{tab.label}</Button>
  );
}

/** Grupo da faixa: botões em linha e o nome do grupo embaixo. `radios` (rótulo) faz do grupo um `radiogroup` (ferramentas). */
export function RibbonGroup({ label, radios, children }: { label: string; radios?: string; children: ReactNode }) {
  return <div className="rgrp" role="group" aria-label={label}><div className="rbtns" role={radios ? 'radiogroup' : undefined} aria-label={radios}>{children}</div><div className="rl">{label}</div></div>;
}

/** Botão grande da faixa: ícone (nome em ui/Icone) em cima, rótulo embaixo. `pressed` marca a ferramenta ativa (botão alternável); ferramentas usam `role="radio"` + `aria-checked`. */
export function RibbonButton({ icon, label, pressed, className, ...rest }: { icon?: string; label: string; pressed?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <Button variant="nenhuma" className={cx('rbtn', className)} aria-pressed={pressed} {...rest}>
      {icon && <Icone nome={icon} />}
      <span className="rbl">{label}</span>
    </Button>
  );
}

/** Texto discreto dentro de um grupo (dica, estado). */
export function RibbonHint({ children }: { children: ReactNode }) {
  return <span className="rhint">{children}</span>;
}
```

## `src/app/ui/index.tsx` (fim do arquivo)
```tsx
export { Ribbon, RibbonTab, RibbonGroup, RibbonButton, RibbonHint, type RibbonTabDef } from './Ribbon';
```

## Verificação
- `npx tsc -b`; `npx vitest run src/app/design`; `npm run mapa` (regenera `docs/mapa-codigo.md`; `src/core/mapa.test.ts` reprova se estiver velho).

## Rótulos e regras
O nome acessível do botão é o texto do `label` (o ícone é `aria-hidden`); `role="radio"` dos botões de ferramenta mantém o mesmo nome de `ROTULO_FERRAMENTA` (os fluxos usam `getByRole('radio', { name: 'Fundação' })`). As abas têm `role="tab"` e vivem em `tablist` de `aria-label="Faixa de comandos"`: por isso os fluxos de e2e escopam as abas de módulo e de vista (D2-01).
