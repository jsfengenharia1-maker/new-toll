// Estado das janelas de isovalores (V4, C12.17): várias janelas lado a lado, mantidas até fechar o programa.
// Não vai para o arquivo .statikos.
import { create } from 'zustand';
import type { GrandezaIso } from '../../core/resultados/isovalores';

export interface JanelaIso {
  /** Número da janela (nunca reutilizado; entra nos rótulos dos controles). */
  id: number;
  /** Pavimento (grandezas das lajes) ou radier (grandezas do radier). */
  alvo: string;
  grandeza: GrandezaIso;
  /** Id da hipótese (caso ou combinação); vazio = a primeira. */
  hipotese: string;
  /** Número aproximado de níveis automáticos (escala 1-2-5). */
  nNiveis: number;
  /** Níveis definidos, separados por ponto e vírgula; vazio = automáticos. */
  niveisTexto: string;
  min?: number;
  max?: number;
  isolinhas: boolean;
  valores: boolean;
}

interface IsoState {
  janelas: JanelaIso[];
  proximo: number;
  nova: (base?: Partial<JanelaIso>) => void;
  fechar: (id: number) => void;
  mudar: (id: number, p: Partial<JanelaIso>) => void;
}

const padrao = (id: number): JanelaIso => ({ id, alvo: '', grandeza: 'uz', hipotese: '', nNiveis: 10, niveisTexto: '', isolinhas: true, valores: false });

export const useIso = create<IsoState>((set) => ({
  janelas: [padrao(1)],
  proximo: 2,
  nova: (base) => set((s) => {
    // a nova janela copia a configuração da última (para comparar permanente e variável, ou pavimentos)
    const ult = s.janelas.at(-1);
    return { janelas: [...s.janelas, { ...(ult ?? padrao(0)), ...base, id: s.proximo }], proximo: s.proximo + 1 };
  }),
  fechar: (id) => set((s) => ({ janelas: s.janelas.filter((j) => j.id !== id) })),
  mudar: (id, p) => set((s) => ({ janelas: s.janelas.map((j) => (j.id === id ? { ...j, ...p } : j)) })),
}));
