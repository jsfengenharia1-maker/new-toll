// Estado de visualização e de ferramenta da planta (não vai para o arquivo).
import { create } from 'zustand';
import type { Ajuste } from '../../core/building/types';
import { TODAS, type TipoCaptura } from '../../core/geom/snap';

export type Ferramenta = 'selecionar' | 'pilar' | 'eixo' | 'mover' | 'medir' | 'alinhar';
export type Tema = 'escuro' | 'claro' | 'pb';
export interface Vista { k: number; ox: number; oy: number } // px por m; tela = (ox + x·k, oy − y·k)

interface PState {
  pavimento: string | null;
  ferramenta: Ferramenta;
  vista: Vista | null;
  selecao: Set<string>;
  orto: boolean;
  polar: boolean;
  capturas: Set<TipoCaptura>;
  inferior: boolean;
  tema: Tema;
  secao: { tipo: 'ret'; b: number; h: number } | { tipo: 'circ'; d: number };
  ajuste: Ajuste;
  angulo: number;
  alinharEscala: boolean;
  set(p: Partial<Omit<PState, 'set'>>): void;
}

function temaSalvo(): Tema {
  try { const t = localStorage.getItem('statikos:tema-planta'); return t === 'claro' || t === 'pb' ? t : 'escuro'; } catch { return 'escuro'; }
}

export const usePlanta = create<PState>((set) => ({
  pavimento: null,
  ferramenta: 'selecionar',
  vista: null,
  selecao: new Set(),
  orto: false,
  polar: true,
  capturas: new Set(TODAS),
  inferior: true,
  tema: temaSalvo(),
  secao: { tipo: 'ret', b: 0.2, h: 0.4 },
  ajuste: 'c',
  angulo: 0,
  alinharEscala: false,
  set(p) {
    if (p.tema) try { localStorage.setItem('statikos:tema-planta', p.tema); } catch { /* sem armazenamento */ }
    set(p);
  },
}));

/** Paleta própria (pesquisa, seção "Ferramenta de desenho"), editável no futuro pelo usuário. */
export const PALETAS: Record<Tema, {
  fundo: string; mascara: string; eixo: string; pilar: string; pilarBorda: string; texto: string; cota: string;
  selecao: string; captura: string; guia: string; erro: string; aviso: string; janela: string; cruzamento: string; fantasma: string;
}> = {
  escuro: { fundo: '#11151A', mascara: '#5C6672', eixo: '#8FA3B8', pilar: '#F2F4F7', pilarBorda: '#F2F4F7', texto: '#E6EAEF', cota: '#B8C2CC', selecao: '#00E5C8', captura: '#C6FF00', guia: 'rgba(198,255,0,0.6)', erro: '#FF4D4D', aviso: '#FFC21A', janela: '#4FC3F7', cruzamento: '#00E5C8', fantasma: 'rgba(242,244,247,0.35)' },
  claro: { fundo: '#FAFAF7', mascara: '#B3B9C0', eixo: '#5E7085', pilar: '#1B1F24', pilarBorda: '#1B1F24', texto: '#1B1F24', cota: '#4A5561', selecao: '#00897B', captura: '#2E7D00', guia: 'rgba(46,125,0,0.6)', erro: '#A3001B', aviso: '#C27C00', janela: '#0072B2', cruzamento: '#00897B', fantasma: 'rgba(27,31,36,0.35)' },
  pb: { fundo: '#FFFFFF', mascara: '#9A9A9A', eixo: '#555555', pilar: '#000000', pilarBorda: '#000000', texto: '#000000', cota: '#333333', selecao: '#000000', captura: '#000000', guia: 'rgba(0,0,0,0.5)', erro: '#000000', aviso: '#000000', janela: '#000000', cruzamento: '#000000', fantasma: 'rgba(0,0,0,0.35)' },
};
