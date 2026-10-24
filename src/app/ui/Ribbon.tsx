// Faixa de comandos (D1): abas por tarefa + grupos rotulados com botões grandes. Estilo em design/global.css (.ribbon-wrap, .rtabs, .rtab, .ribbon, .rgrp, .rbtn).
import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useIndicioRolagem, useRoving } from './teclado';
import { Button } from './index';
import { Icone } from './Icone';

export interface RibbonTabDef { id: string; label: string; /** Aba contextual (aparece com um elemento selecionado). */ contextual?: boolean; title?: string }

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Faixa de comandos: tira de abas (duplo clique numa aba ou o botão da ponta recolhe) e o corpo da aba ativa em `children`. */
export function Ribbon({ label, tabs, active, onActive, open, onOpen, children }: {
  label: string; tabs: RibbonTabDef[]; active: string; onActive: (id: string) => void; open: boolean; onOpen: (v: boolean) => void; children?: ReactNode;
}) {
  const abas = useRef<HTMLDivElement>(null), corpo = useRef<HTMLDivElement>(null);
  useRoving(abas, '[role="tab"]');
  useIndicioRolagem(abas);
  useIndicioRolagem(corpo);
  return (
    <div className="ribbon-wrap">
      <div className="rtabs-wrap">
        <div className="rtabs" role="tablist" aria-label={label} ref={abas}>
          {tabs.map((t) => <RibbonTab key={t.id} tab={t} selected={t.id === active} onSelect={() => { onActive(t.id); if (!open) onOpen(true); }} onToggle={() => onOpen(!open)} />)}
        </div>
        <Button variant="nenhuma" className="rtab-toggle" aria-label={open ? 'Recolher a faixa de comandos' : 'Expandir a faixa de comandos'} aria-expanded={open} title={open ? 'Recolher a faixa (duplo clique numa aba também)' : 'Expandir a faixa'} onClick={() => onOpen(!open)}>{open ? '⌃' : '⌄'}</Button>
      </div>
      {open && <div className="ribbon" ref={corpo} role="toolbar" aria-label={`Comandos: ${tabs.find((t) => t.id === active)?.label ?? ''}`}>{children}</div>}
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
