// Estado do layout (D2): aba ativa da faixa de comandos por módulo, faixa recolhida e largura/recolhimento das docas.
// Fica no navegador (`statikos:layout`, protegido por try/catch) e não vai para o arquivo de trabalho.
import { create } from 'zustand';

export type Modulo = 'portico' | 'edificio' | 'fundacoes';
export interface Doca { w: number; aberta: boolean }
export const DOCA_MIN = 140;
export const DOCA_MAX = 640;
const CHAVE = 'statikos:layout';

interface Salvo { faixaAberta: boolean; aba: Record<string, string>; docas: Record<string, Doca> }
interface LayoutState extends Salvo {
  setFaixaAberta(v: boolean): void;
  setAba(modulo: Modulo, id: string): void;
  setDoca(id: string, p: Partial<Doca>, padrao: number): void;
}

export const limitaDoca = (w: number) => Math.min(DOCA_MAX, Math.max(DOCA_MIN, Math.round(w)));

function ler(): Salvo {
  const vazio: Salvo = { faixaAberta: true, aba: {}, docas: {} };
  try {
    const t = window.localStorage.getItem(CHAVE);
    if (!t) return vazio;
    const j = JSON.parse(t) as Partial<Salvo>;
    return { faixaAberta: j.faixaAberta !== false, aba: j.aba && typeof j.aba === 'object' ? j.aba : {}, docas: j.docas && typeof j.docas === 'object' ? j.docas : {} };
  } catch { return vazio; }
}

export const useLayout = create<LayoutState>((set) => ({
  ...ler(),
  setFaixaAberta: (v) => set({ faixaAberta: v }),
  setAba: (modulo, id) => set((s) => ({ aba: { ...s.aba, [modulo]: id } })),
  setDoca: (id, p, padrao) => set((s) => {
    const atual = s.docas[id] ?? { w: padrao, aberta: true };
    return { docas: { ...s.docas, [id]: { w: p.w === undefined ? atual.w : limitaDoca(p.w), aberta: p.aberta ?? atual.aberta } } };
  }),
}));

useLayout.subscribe((s) => {
  try { window.localStorage.setItem(CHAVE, JSON.stringify({ faixaAberta: s.faixaAberta, aba: s.aba, docas: s.docas })); } catch { /* sem armazenamento: o layout só vale nesta sessão */ }
});
