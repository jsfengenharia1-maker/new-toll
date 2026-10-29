// Estado de interface do módulo Edifício que a faixa de comandos também comanda: vista ativa, diálogos e janelas de formulário (não vai para o arquivo).
import { create } from 'zustand';
import type { DialogoGrupos } from './GruposL4';

export type AbaEdificio = 'planta' | 'vista3d' | 'elevacao' | 'verificacao' | 'analise' | 'deslocamentos' | 'isovalores' | 'esforcos' | 'dimensionamento' | 'pranchas' | 'premissas';
export type DialogoL1 = null | 'nova' | 'recentes' | 'texto' | 'gerais' | 'ifc';
export type DialogoL2 = null | { tipo: 'lancar'; inicial?: string } | { tipo: 'gabaritos' } | { tipo: 'vistas' };
export type DialogoL4 = DialogoGrupos | 'guia';
/** Janelas que mostram um formulário que antes ficava num grupo da coluna esquerda. */
export type JanelaForm = null | 'malha' | 'novoPavimento';

interface UiState {
  aba: AbaEdificio;
  memo: boolean;
  l1: DialogoL1;
  l2: DialogoL2;
  l4: DialogoL4;
  jan: JanelaForm;
  /** Seção aberta da Configuração da obra (id de `SECOES` em Configuracao.tsx); null = fechada. */
  cfg: string | null;
  /** Paleta de comandos (Ctrl+K) aberta. */
  paleta: boolean;
  /** Opção da etapa Calcular: calcula a obra sem as fundações lançadas (vale para todo botão Calcular). */
  semFundacao: boolean;
  /** Memória de cálculo detalhada aberta (botão da vista Dimensionamento e da etapa Pranchas e memorial). */
  memoria: boolean;
  set(p: Partial<Omit<UiState, 'set'>>): void;
}

export const useEdifUI = create<UiState>((set) => ({ aba: 'planta', memo: false, l1: null, l2: null, l4: null, jan: null, cfg: null, paleta: false, semFundacao: false, memoria: false, set: (p) => set(p) }));
