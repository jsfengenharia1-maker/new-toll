// Modo de ajuda (L4: C1.8–C1.12, C6.2): F1 ou o botão da barra de título liga o modo; itens com `data-ajuda="<id>"` ficam
// destacados e o clique em um deles mostra a explicação no painel. Desliga com o botão direito, novo clique no botão ou Esc.
// Os textos vêm de `src/core/ajuda` (catálogo próprio do projeto + OPCOES_INFO).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ajudaDe, type Ajuda } from '../../core/ajuda';

interface Ctx { ligada: boolean; item: Ajuda | null; alternar(): void; desligar(): void; mostrar(id: string | null): void }
const AjudaCtx = createContext<Ctx>({ ligada: false, item: null, alternar() {}, desligar() {}, mostrar() {} });
export const useAjuda = () => useContext(AjudaCtx);

/** Atributo que marca um item como tendo ajuda: `<div {...dataAjuda('aba:planta')}>`. */
export const dataAjuda = (id: string) => ({ 'data-ajuda': id });

export function AjudaProvider({ children }: { children: ReactNode }) {
  const [ligada, setLigada] = useState(false);
  const [item, setItem] = useState<Ajuda | null>(null);
  const desligar = useCallback(() => { setLigada(false); setItem(null); }, []);
  const alternar = useCallback(() => { setLigada((v) => { if (v) setItem(null); return !v; }); }, []);
  const mostrar = useCallback((id: string | null) => setItem(id ? ajudaDe(id) ?? null : null), []);

  useEffect(() => {
    document.body.classList.toggle('ajuda-on', ligada);
    return () => document.body.classList.remove('ajuda-on');
  }, [ligada]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); alternar(); return; }
      if (e.key === 'Escape' && ligada) { e.preventDefault(); e.stopPropagation(); desligar(); }
    };
    // captura: o Esc do modo de ajuda vem antes dos de janelas e ferramentas
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [ligada, alternar, desligar]);

  useEffect(() => {
    if (!ligada) return;
    const dentroDoPainel = (t: EventTarget | null) => t instanceof Element && !!t.closest('[data-ajuda-controle]');
    const clique = (e: MouseEvent) => {
      if (dentroDoPainel(e.target)) return;
      e.preventDefault(); e.stopPropagation();
      const alvo = e.target instanceof Element ? e.target.closest('[data-ajuda]') : null;
      const id = alvo?.getAttribute('data-ajuda');
      setItem(id ? ajudaDe(id) ?? null : { id: '', grupo: 'barras', titulo: 'Sem ajuda', texto: 'Este item não tem ajuda própria. Itens destacados com borda tracejada têm.' });
    };
    const direito = (e: MouseEvent) => { e.preventDefault(); desligar(); };
    document.addEventListener('click', clique, true);
    document.addEventListener('contextmenu', direito, true);
    return () => { document.removeEventListener('click', clique, true); document.removeEventListener('contextmenu', direito, true); };
  }, [ligada, desligar]);

  const v = useMemo(() => ({ ligada, item, alternar, desligar, mostrar }), [ligada, item, alternar, desligar, mostrar]);
  return (
    <AjudaCtx.Provider value={v}>
      {children}
      {(ligada || item) && (
        <aside className="ajuda-painel" role="status" aria-label="Ajuda" data-ajuda-controle>
          <div className="ajuda-cab"><b>{item ? item.titulo : 'Modo de ajuda'}</b><button type="button" className="mini" aria-label="Fechar a ajuda" onClick={desligar}>×</button></div>
          <p>{item ? item.texto : 'Clique num item destacado para ver a explicação. Botão direito, Esc ou um novo clique no botão de ajuda saem do modo.'}</p>
          {item?.ver?.length ? <p className="hint">Veja também: {item.ver.map((id) => ajudaDe(id)?.titulo ?? id).join(', ')}.</p> : null}
        </aside>
      )}
    </AjudaCtx.Provider>
  );
}

/** Botão de ajuda da barra de título (liga e desliga o modo de ajuda). */
export function BotaoAjuda({ className = 'tbtn' }: { className?: string }) {
  const { ligada, alternar } = useAjuda();
  return <button type="button" className={`${className}${ligada ? ' on' : ''}`} aria-pressed={ligada} aria-label="Modo de ajuda (F1)" title="Modo de ajuda (F1)" data-ajuda-controle onClick={alternar}>?</button>;
}
