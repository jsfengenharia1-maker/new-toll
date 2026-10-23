// Barra de atalhos configurável (L4, C1.6): o usuário põe, tira e reordena os botões; a escolha fica salva no navegador
// (`statikos:barra`, protegida) e "Restaurar padrão" volta à barra original. Catálogo e persistência em src/core/ajuda/atalhos.ts.
import { useEffect, useState } from 'react';
import { alternarAtalho, ATALHOS_CATALOGO, lerBarra, moverAtalho, restaurarBarra, salvarBarra, type Atalho, type ArmazenamentoSimples } from '../../core/ajuda';
import { Button, Check, dataAjuda, Icone, Modal } from '../ui';

const armazenamento = (): ArmazenamentoSimples | null => { try { return window.localStorage; } catch { return null; } };
const porId = (id: string) => ATALHOS_CATALOGO.find((a) => a.id === id);

export function BarraAtalhos({ executar }: { executar: (a: Atalho) => void }) {
  const [lista, setLista] = useState<string[]>(() => lerBarra(armazenamento()));
  const [cfg, setCfg] = useState(false);
  useEffect(() => { salvarBarra(armazenamento(), lista); }, [lista]);
  return (
    <div className="atalhos" role="toolbar" aria-label="Barra de atalhos" {...dataAjuda('barra:atalhos')}>
      {lista.map(porId).filter((a): a is Atalho => !!a).map((a) => (
        <Button key={a.id} title={a.rotulo} aria-label={`Atalho: ${a.rotulo}`} onClick={() => executar(a)}><Icone nome={a.icone} /></Button>
      ))}
      <Button variant="mini" title="Configurar a barra de atalhos" aria-label="Configurar a barra de atalhos" onClick={() => setCfg(true)}>⚙</Button>
      {cfg && (
        <Modal titulo="Configurar atalhos" onClose={() => setCfg(false)} ajuda="barra:atalhos" info="Marque os botões que a barra deve ter e use as setas para mudar a ordem. A escolha fica salva neste navegador.">
          {ATALHOS_CATALOGO.map((a) => {
            const on = lista.includes(a.id);
            return (
              <div key={a.id} className="atalho-linha">
                <Check label={`Atalho ${a.rotulo}`} checked={on} onChange={() => setLista(alternarAtalho(lista, a.id))} />
                {on && <>
                  <Button variant="mini" aria-label={`Subir ${a.rotulo}`} onClick={() => setLista(moverAtalho(lista, a.id, -1))}>↑</Button>
                  <Button variant="mini" aria-label={`Descer ${a.rotulo}`} onClick={() => setLista(moverAtalho(lista, a.id, 1))}>↓</Button>
                </>}
              </div>
            );
          })}
          <div className="row"><Button onClick={() => setLista(restaurarBarra(armazenamento()))}>Restaurar atalhos padrão</Button></div>
        </Modal>
      )}
    </div>
  );
}
