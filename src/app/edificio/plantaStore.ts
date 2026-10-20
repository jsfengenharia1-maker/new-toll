// Estado de visualização e de ferramenta da planta (não vai para o arquivo).
import { create } from 'zustand';
import type { Ajuste, Alinhamento, TipoLaje } from '../../core/building/types';
import { TODAS, type TipoCaptura } from '../../core/geom/snap';
import { cssVar } from '../design/tokens';

export type Ferramenta = 'selecionar' | 'pilar' | 'viga' | 'laje' | 'carga' | 'eixo' | 'mover' | 'medir' | 'alinhar';
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
  secaoViga: { b: number; h: number };
  alinhamento: Alinhamento;
  invertida: boolean;
  tipoLaje: TipoLaje;
  tipoCarga: 'ponto' | 'linha' | 'area';
  /** G, Q ou id de caso adicional. */
  caso: string;
  valorCarga: number;
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
  secaoViga: { b: 0.15, h: 0.4 },
  alinhamento: 'centro',
  invertida: false,
  tipoLaje: { tipo: 'macica', h: 0.1 },
  tipoCarga: 'area',
  caso: 'Q',
  valorCarga: 2,
  set(p) {
    if (p.tema) try { localStorage.setItem('statikos:tema-planta', p.tema); } catch { /* sem armazenamento */ }
    set(p);
  },
}));

/** Cores da planta por tema; os valores ficam em design/global.css (--pl-<tema>-<chave>). */
export type Paleta = {
  fundo: string; mascara: string; eixo: string; viga: string; laje: string; carga: string; parede: string; pilar: string; pilarBorda: string; texto: string; cota: string;
  selecao: string; captura: string; guia: string; erro: string; aviso: string; janela: string; cruzamento: string; fantasma: string;
};
const CHAVES = ['fundo', 'mascara', 'eixo', 'viga', 'laje', 'carga', 'parede', 'pilar', 'pilarBorda', 'texto', 'cota', 'selecao', 'captura', 'guia', 'erro', 'aviso', 'janela', 'cruzamento', 'fantasma'] as const;
const cache = new Map<Tema, Paleta>();
export function paleta(t: Tema): Paleta {
  let p = cache.get(t);
  if (!p) {
    p = Object.fromEntries(CHAVES.map((k) => [k, cssVar(`pl-${t}-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`)])) as Paleta;
    if (p.fundo) cache.set(t, p);
  }
  return p;
}
