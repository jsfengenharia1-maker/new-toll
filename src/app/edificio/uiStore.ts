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
  /** Janela "Antes de calcular" (pendências que impedem o cálculo) aberta. */
  antes: boolean;
  /** Lajes do seletor de tipo de pano aberto numa janela (vem da janela "Antes de calcular"); null = fechado. */
  tipoLajes: string[] | null;
  /** Aviso do último cálculo na vista: concluído sem erros (com erros, abre a vista Verificação). */
  avisoCalculo: 'ok' | null;
  /** Depois de calcular, abre a vista Verificação (com erros) ou a etapa Resultados (sem erros). Salvo no navegador. */
  irAoResultado: boolean;
  set(p: Partial<Omit<UiState, 'set'>>): void;
}

const CHAVE_IR_AO_RESULTADO = 'statikos:ir-ao-resultado';
function lerIrAoResultado(): boolean { try { return localStorage.getItem(CHAVE_IR_AO_RESULTADO) !== '0'; } catch { return true; } }

export const useEdifUI = create<UiState>((set) => ({ aba: 'planta', memo: false, l1: null, l2: null, l4: null, jan: null, cfg: null, paleta: false, semFundacao: false, memoria: false, antes: false, tipoLajes: null, avisoCalculo: null, irAoResultado: lerIrAoResultado(),
  set: (p) => {
    if (p.irAoResultado !== undefined) { try { localStorage.setItem(CHAVE_IR_AO_RESULTADO, p.irAoResultado ? '1' : '0'); } catch { /* sem armazenamento */ } }
    set(p);
  },
}));
