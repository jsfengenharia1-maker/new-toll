// Ponte para o store do módulo Edifícios. O store puxa os comandos, o cálculo e os exemplos do edifício (mais de 2 MB
// minificados), por isso fica fora do pacote de abertura: carrega ao entrar no módulo, ao salvar ou ao abrir um arquivo
// de trabalho. Este arquivo é pequeno e só importa o store como tipo.
import { useSyncExternalStore } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';

type ModuloStore = typeof import('./store');
/** Estado do store do edifício. */
export type EstadoEdificio = ReturnType<ModuloStore['useBuilding']['getState']>;

let carregado: ModuloStore | null = null;
let promessa: Promise<ModuloStore> | null = null;
const ouvintes = new Set<() => void>();

/** Carrega o store do edifício (uma vez) e devolve o módulo. */
export function carregarEdificio(): Promise<ModuloStore> {
  promessa ??= import('./store').then((m) => { carregado = m; ouvintes.forEach((f) => f()); return m; });
  return promessa;
}

/** O módulo do store, se já carregado. */
export const edificioCarregado = (): ModuloStore | null => carregado;

const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };
const vazio = createStore<EstadoEdificio>(() => ({}) as EstadoEdificio);

/** Lê uma parte do store do edifício; devolve `antes` enquanto ele não foi carregado. Seletor com resultado primitivo ou estável. */
export function useEdificio<T>(seletor: (s: EstadoEdificio) => T, antes: T): T {
  const m = useSyncExternalStore(assinar, edificioCarregado);
  const api: StoreApi<EstadoEdificio> = m ? m.useBuilding : vazio;
  return useStore(api, (s) => (m ? seletor(s) : antes));
}
