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
