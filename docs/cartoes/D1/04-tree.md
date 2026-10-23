# D1 — cartão 04: `Tree` e `TreeItem`

Classe: Haiku (código validado).

## Arquivos
- `src/app/ui/Tree.tsx` (novo)
- `src/app/ui/index.tsx` (uma linha)

## `src/app/ui/Tree.tsx`
```tsx
// Árvore navegável (D1): Navegador da obra. Um TreeItem é um botão `role="treeitem"`; os filhos aparecem quando `expanded`.
import type { ReactNode } from 'react';
import { Button } from './index';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Tree({ label, children }: { label: string; children: ReactNode }) {
  return <ul className="tree" role="tree" aria-label={label}>{children}</ul>;
}

/** Item da árvore. `level` 1–5 define o recuo. Sem `expanded` é folha. O clique na seta expande/recolhe (`onToggle`); o clique no rótulo seleciona (`onSelect`) ou, sem `onSelect`, expande. */
export function TreeItem({ level, label, count, icon, expanded, onToggle, selected, onSelect, title, children }: {
  level: number; label: string; count?: number | string; icon?: ReactNode; expanded?: boolean; onToggle?: () => void;
  selected?: boolean; onSelect?: () => void; title?: string; children?: ReactNode;
}) {
  const folha = expanded === undefined;
  return (
    <li className={`l${level}`} role="none">
      <Button variant="nenhuma" className={cx('tn', selected && 'on')} role="treeitem" aria-level={level} aria-expanded={folha ? undefined : expanded} aria-selected={selected} title={title}
        onClick={() => { if (onSelect) onSelect(); else onToggle?.(); }}>
        {folha ? <span className="sp" /> : <span className="chev-w" onClick={(e) => { if (onSelect && onToggle) { e.stopPropagation(); onToggle(); } }}><svg className="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2 L8 6 L4 10" /></svg></span>}
        {icon}
        <span className="tl">{label}</span>
        {count !== undefined && <span className="cnt">{count}</span>}
      </Button>
      {!folha && expanded && children && <ul role="group">{children}</ul>}
    </li>
  );
}
```
(As classes `tn`, `tl`, `sp`, `chev`, `chev-w`, `cnt`, `l1` a `l5` já saem do cartão 01.)

## `src/app/ui/index.tsx` (fim)
```tsx
export { Tree, TreeItem } from './Tree';
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run mapa`.

## Rótulos
`role=tree` (`aria-label` dado por quem usa), `role=treeitem` com `aria-level`, `aria-expanded` e `aria-selected`; o nome acessível do item é o texto do `label` seguido da contagem (se houver).
