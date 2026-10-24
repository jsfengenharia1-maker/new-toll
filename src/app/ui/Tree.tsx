// Árvore navegável (D1): Navegador da obra. Um TreeItem é um botão `role="treeitem"`; os filhos aparecem quando `expanded`.
import { useRef, type ReactNode } from 'react';
import { useRoving } from './teclado';
import { Button } from './index';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Tree({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  useRoving(ref, '[role="treeitem"]', { vertical: true, arvore: true });
  return <ul className="tree" role="tree" aria-label={label} ref={ref}>{children}</ul>;
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
