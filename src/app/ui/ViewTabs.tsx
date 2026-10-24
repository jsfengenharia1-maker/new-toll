// Abas de vista acima do desenho (D1) e barra de status (D1).
import { useRef, type ReactNode } from 'react';
import { useIndicioRolagem, useRoving } from './teclado';
import { Button } from './index';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export interface ViewTabDef { id: string; label: string; /** Destaque de problema (aba Verificação com erros). */ bad?: boolean; ajuda?: string }

/** Abas de vista, estilo documento: a ativa se funde com a folha. `className` extra mantém ganchos dos testes (ex.: `edif-tabs`). */
export function ViewTabs({ label, tabs, active, onChange, className }: { label?: string; tabs: ViewTabDef[]; active: string; onChange: (id: string) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useRoving(ref, '[role="tab"]');
  useIndicioRolagem(ref);
  return (
    <div className={cx('vtabs', className)} role="tablist" aria-label={label} ref={ref}>
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
