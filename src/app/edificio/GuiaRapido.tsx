// Guia rápido (L4, C1.13): reúne as ajudas das abas, ferramentas, barras e opções, gerado do catálogo de ajuda
// (src/core/ajuda); as ajudas dos diálogos ficam de fora. Imprimível em A4 (mesmo CSS de impressão do memorial).
import { useRef, type ReactNode } from 'react';
import { guiaRapido } from '../../core/ajuda';
import { memo } from '../design/tokens';
import { MEMO_CSS, memoPrintCss, printHtmlDoc } from '../Memorial';
import { useStore } from '../store';
import { Button, Modal } from '../ui';

/** Conteúdo do guia (usado na janela e como anexo opcional do memorial). */
export function GuiaConteudo({ h2 }: { h2?: (t: string) => ReactNode }) {
  const secoes = guiaRapido();
  return (
    <div data-guia-rapido>
      {secoes.map((s) => (
        <section key={s.grupo}>
          {h2 ? h2(s.rotulo) : <h3>{s.rotulo}</h3>}
          <dl className="id">
            {s.itens.map((a) => <div key={a.id}><dt>{a.titulo}</dt><dd>{a.texto}</dd></div>)}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function GuiaRapidoDialogo({ onClose, obra }: { onClose: () => void; obra: string }) {
  const doc = useRef<HTMLDivElement>(null);
  const imprimir = () => {
    const css = memoPrintCss({ title: 'Guia rápido', obra, rev: 'R00', date: new Date().toLocaleDateString('pt-BR') }).replace('Memorial de cálculo · ', '');
    printHtmlDoc(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Guia rápido</title><style>body{margin:0;background:${memo('paper')}}${MEMO_CSS}${css}</style></head><body><div class="memo"><h1>Guia rápido</h1>${doc.current?.innerHTML ?? ''}</div></body></html>`);
    useStore.getState().set({ message: 'Impressão do guia rápido: escolha “Salvar como PDF”.' });
  };
  return (
    <Modal titulo="Guia rápido" larga onClose={onClose} ajuda="barra:ajuda" info="Reúne as ajudas das abas, das ferramentas, das barras e das opções de cálculo. As ajudas dos diálogos não entram.">
      <div className="row"><Button variant="primary" onClick={imprimir}>Imprimir guia rápido</Button></div>
      <div ref={doc} className="guia"><GuiaConteudo /></div>
    </Modal>
  );
}
