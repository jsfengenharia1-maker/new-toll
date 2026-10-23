// Cartão do tipo da paleta Propriedades (D5): ícone, nome do elemento, tipo, contagem da seleção e "Editar tipo".
import type { ReactNode } from 'react';
import { Button } from './index';
import { Icone } from './Icone';

export function TypeCard({ icone, nome, tipo, contagem, onEditarTipo, children }: { icone: string; nome: string; tipo: string; contagem?: string; onEditarTipo?: () => void; children?: ReactNode }) {
  return (
    <>
      <div className="typecard"><div className="ico"><Icone nome={icone} /></div><div><b>{nome}</b><span>{tipo}</span></div></div>
      {(contagem || onEditarTipo) && (
        <div className="psel"><span>{contagem}</span>{onEditarTipo && <Button variant="mini" onClick={onEditarTipo}>Editar tipo</Button>}</div>
      )}
      {children}
    </>
  );
}
