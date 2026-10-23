# D1 — cartão 05: `ViewTabs` e `StatusBar`

Classe: Haiku (código validado).

## Arquivos
- `src/app/ui/ViewTabs.tsx` (novo)
- `src/app/ui/index.tsx` (uma linha)

## `src/app/ui/ViewTabs.tsx`
```tsx
// Abas de vista acima do desenho (D1) e barra de status (D1).
import type { ReactNode } from 'react';
import { Button } from './index';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export interface ViewTabDef { id: string; label: string; /** Destaque de problema (aba Verificação com erros). */ bad?: boolean; ajuda?: string }

/** Abas de vista, estilo documento: a ativa se funde com a folha. `className` extra mantém ganchos dos testes (ex.: `edif-tabs`). */
export function ViewTabs({ label, tabs, active, onChange, className }: { label?: string; tabs: ViewTabDef[]; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={cx('vtabs', className)} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <Button variant="nenhuma" key={t.id} role="tab" aria-selected={active === t.id} data-ajuda={t.ajuda} className={cx(active === t.id && 'on', t.bad && 'bad')} onClick={() => onChange(t.id)}>{t.label}</Button>
      ))}
    </div>
  );
}

/** Barra de status: mensagem à esquerda (`.msg`) e os controles de visualização (children) à direita. */
export function StatusBar({ mensagem, children }: { mensagem: ReactNode; children?: ReactNode }) {
  return (
    <footer className="statusbar">
      <span className="msg">{mensagem}</span>
      {children}
    </footer>
  );
}
```

## `src/app/ui/index.tsx` (fim)
```tsx
export { ViewTabs, StatusBar, type ViewTabDef } from './ViewTabs';
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run mapa`.

## Rótulos
`ViewTabs` mantém `role=tab`, `aria-selected` e `data-ajuda` das abas atuais; `StatusBar` mantém `footer.statusbar` e `.msg` (os fluxos usam `.statusbar .msg` mais de 100 vezes).
