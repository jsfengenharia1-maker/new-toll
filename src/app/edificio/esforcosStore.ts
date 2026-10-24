// Estado das janelas de esforços por hipótese (V5, C12.14): várias janelas lado a lado, mantidas até fechar o programa.
// Não vai para o arquivo .statikos.
import { create } from 'zustand';
import type { Componente } from '../../core/resultados/esforcosCaso';
import type { VistaVigota } from '../../core/resultados/vigotasVista';

import type { Resultante } from '../../core/building/pilarParedeEsforcos';

export type TipoElementoEsforco = 'viga' | 'pilar' | 'diagonal' | 'pilarParede' | 'vigotas' | 'alveolar';

export interface JanelaEsforco {
  /** Número da janela (nunca reutilizado; entra nos rótulos dos controles). */
  id: number;
  tipo: TipoElementoEsforco;
  /** Id do elemento (viga, pilar, diagonal ou laje de vigotas); vazio = o primeiro. */
  elemento: string;
  /** Id da hipótese (envoltória, combinação ou caso); vazio = a primeira. */
  hipotese: string;
  grandeza: Componente;
  /** Pavimento da viga (vazio = o primeiro). */
  pavimento: string;
  /** Vigotas: chave geral de exibição de esforços e vista. */
  esforcos: boolean;
  vista: VistaVigota;
  /** Pilar-parede (V7c): grandeza das resultantes e lado exibido no diagrama ao longo da altura. */
  grandezaPP: keyof Resultante;
  ladoPP: number;
  /** Pilar-parede (V7g): polo do torçor da base (m); indefinido = centroide dos lados. */
  poloPP?: [number, number];
}

interface EsfState {
  janelas: JanelaEsforco[];
  proximo: number;
  nova: (base?: Partial<JanelaEsforco>) => void;
  fechar: (id: number) => void;
  mudar: (id: number, p: Partial<JanelaEsforco>) => void;
}

const padrao = (id: number): JanelaEsforco => ({ id, tipo: 'viga', elemento: '', hipotese: '', grandeza: 'Mz', pavimento: '', esforcos: true, vista: 'momentos', grandezaPP: 'N', ladoPP: 0 });

export const useEsforcos = create<EsfState>((set) => ({
  janelas: [padrao(1)],
  proximo: 2,
  nova: (base) => set((s) => {
    const ult = s.janelas.at(-1);
    return { janelas: [...s.janelas, { ...(ult ?? padrao(0)), ...base, id: s.proximo }], proximo: s.proximo + 1 };
  }),
  fechar: (id) => set((s) => ({ janelas: s.janelas.filter((j) => j.id !== id) })),
  mudar: (id, p) => set((s) => ({ janelas: s.janelas.map((j) => (j.id === id ? { ...j, ...p } : j)) })),
}));
