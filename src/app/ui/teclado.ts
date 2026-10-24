// Ganchos de teclado e rolagem dos contêineres de abas e da árvore (D7): tabindex móvel com setas/Home/End e indício de rolagem horizontal.
import { useEffect, type RefObject } from 'react';

const visiveis = (raiz: HTMLElement, sel: string) => [...raiz.querySelectorAll<HTMLElement>(sel)].filter((e) => !e.hasAttribute('disabled') && !e.closest('[hidden]'));

/** Tabindex móvel: só um item do contêiner entra na ordem de Tab (o selecionado, o focado por último ou o primeiro); setas movem o foco
 *  (← → em linha, ↑ ↓ em `vertical`), Home/End vão às pontas. Em `arvore`, → expande e ← recolhe o item com filhos. */
export function useRoving(ref: RefObject<HTMLElement | null>, sel: string, opcoes: { vertical?: boolean; arvore?: boolean } = {}) {
  const { vertical = false, arvore = false } = opcoes;
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    let parada: HTMLElement | null = null;
    const marca = () => {
      const itens = visiveis(raiz, sel);
      if (!itens.length) return;
      if (!parada || !itens.includes(parada)) parada = itens.find((i) => ['aria-selected', 'aria-current', 'aria-checked'].some((a) => i.getAttribute(a) === 'true' || i.getAttribute(a) === 'page')) ?? itens[0];
      for (const i of itens) if (i.tabIndex !== (i === parada ? 0 : -1)) i.tabIndex = i === parada ? 0 : -1;
    };
    const aoFocar = (e: FocusEvent) => { const t = (e.target as HTMLElement | null)?.closest?.(sel) as HTMLElement | null; if (t && raiz.contains(t)) { parada = t; marca(); } };
    const aoTecla = (e: KeyboardEvent) => {
      const alvo = (e.target as HTMLElement).closest(sel) as HTMLElement | null;
      if (!alvo || e.altKey || e.ctrlKey || e.metaKey) return;
      const itens = visiveis(raiz, sel);
      const i = itens.indexOf(alvo);
      const prox = vertical ? 'ArrowDown' : 'ArrowRight', ant = vertical ? 'ArrowUp' : 'ArrowLeft';
      let j = -1;
      if (e.key === prox) j = Math.min(itens.length - 1, i + 1);
      else if (e.key === ant) j = Math.max(0, i - 1);
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = itens.length - 1;
      else if (arvore && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const aberto = alvo.getAttribute('aria-expanded');
        if ((e.key === 'ArrowRight' && aberto === 'false') || (e.key === 'ArrowLeft' && aberto === 'true')) { e.preventDefault(); alvo.click(); }
        return;
      }
      if (j < 0) return;
      e.preventDefault();
      parada = itens[j];
      marca();
      parada.focus();
    };
    marca();
    raiz.addEventListener('focusin', aoFocar);
    raiz.addEventListener('keydown', aoTecla);
    const obs = new MutationObserver(marca);
    obs.observe(raiz, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-current', 'aria-checked', 'hidden'] });
    return () => { raiz.removeEventListener('focusin', aoFocar); raiz.removeEventListener('keydown', aoTecla); obs.disconnect(); };
  }, [ref, sel, vertical, arvore]);
}

/** Marca `data-mais="e"`, `"d"` ou `"e d"` no contêiner que rola na horizontal quando há conteúdo escondido à esquerda e/ou à direita (o CSS desenha o indício). */
export function useIndicioRolagem(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const atualiza = () => {
      const lados = [el.scrollLeft > 1 && 'e', el.scrollLeft + el.clientWidth < el.scrollWidth - 1 && 'd'].filter(Boolean).join(' ');
      if ((el.dataset.mais ?? '') === lados) return;
      if (lados) el.dataset.mais = lados; else delete el.dataset.mais;
    };
    atualiza();
    el.addEventListener('scroll', atualiza, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(atualiza);
    ro?.observe(el);
    const mo = new MutationObserver(atualiza);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => { el.removeEventListener('scroll', atualiza); ro?.disconnect(); mo.disconnect(); };
  }, [ref]);
}
