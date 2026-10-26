// Contador único dos contextos WebGL do aplicativo (V6b): quem cria um renderizador adquire, quem o descarta libera.
import { useSyncExternalStore } from 'react';
import { ContadorContextos } from '../../core/vista3d/comparar';

const contador = new ContadorContextos();
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export const contextosWebgl = {
  adquirir(): boolean { const ok = contador.adquirir(); if (ok) avisar(); return ok; },
  liberar(): void { contador.liberar(); avisar(); },
  get ativos() { return contador.ativos; },
  get livres() { return contador.livres; },
  get limite() { return contador.limite; },
};

/** Contextos ativos (re-renderiza quando mudam). */
export function useContextosAtivos(): number {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => contador.ativos);
}
