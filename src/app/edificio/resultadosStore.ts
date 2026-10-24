// Pedidos de consulta que nascem em outra vista (V6d): os dois pontos da flecha clicados na planta e o nó clicado na vista 3D.
// A aba Deslocamentos aplica o pedido ao abrir e o consome. Não vai para o arquivo .statikos.
import { create } from 'zustand';

export interface PontosFlecha { pavimento: string; x1: number; y1: number; x2: number; y2: number }
export interface PedidoNo { x: number; y: number; z?: number; pavimento?: string }

interface ResState {
  /** Pontos da ferramenta Flecha entre dois pontos da planta, ainda não consumidos pela aba Deslocamentos. */
  flecha: PontosFlecha | null;
  /** Nó pedido pelo clique na vista 3D, ainda não consumido pela aba Deslocamentos. */
  no: PedidoNo | null;
  set(p: Partial<Omit<ResState, 'set'>>): void;
}

export const useResultados = create<ResState>((set) => ({ flecha: null, no: null, set: (p) => set(p) }));
