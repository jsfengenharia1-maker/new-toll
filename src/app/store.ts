import { create } from 'zustand';
import { produce } from 'immer';
import type { Model } from '../core/types';
import { nbrCombinations, type Xform, type XformOptions } from '../core/edit';
import { samplePortico } from './samples';

export type Tool = 'select' | 'node' | 'member' | 'pan' | 'section' | 'dim' | 'zoom';
export type Tab = 'estrutura' | 'cargas' | 'resultados' | 'influencia' | 'dimensionar';
export type Diagram = 'none' | 'N' | 'V' | 'M' | 'deformed';
export type Source =
  | { kind: 'case'; id: number }
  | { kind: 'combo'; id: number }
  | { kind: 'envCases' }
  | { kind: 'envCombos' }
  /** Envoltória dos casos e combinações escolhidos. */
  | { kind: 'envSel'; cases: number[]; combos: number[] };

export interface View { scale: number; ox: number; oy: number }

export interface ILState {
  member: number | null; x: number; effect: 'N' | 'V' | 'M';
  /** Alvo da LI: esforço numa seção (padrão), reação de apoio ou deslocamento de nó. */
  target?: 'section' | 'reaction' | 'disp';
  node?: number; // id do nó
  dir?: 0 | 1 | 2;
}

interface State {
  model: Model;
  past: Model[];
  future: Model[];
  selNodes: Set<number>;
  selMembers: Set<number>;
  tool: Tool;
  tab: Tab;
  view: View;
  grid: number;
  snap: boolean;
  activeCase: number;
  source: Source;
  diagram: Diagram;
  showReactions: boolean;
  showValues: boolean;
  /** Cotas automáticas de vãos e níveis no desenho. */
  showDims: boolean;
  mTension: boolean;
  diagScale: number;
  il: ILState;
  trainId: number | null;
  trainPath: number[];
  trainStatic: Source | null;
  trainResult: { key: string; data: unknown } | null;
  message: string;
  memorialOpen: boolean;
  libraryOpen: boolean;
  module: 'portico' | 'fundacoes' | 'edificio';
  libraryId: string | null;
  /** Modo de flambagem ou de vibração desenhado sobre a estrutura (vetor de deslocamentos global). */
  modeView: { title: string; shape: number[] } | null;
  /** Valores do diagrama em n passos iguais ao longo de cada barra (0 = só extremos e máximos). */
  stepValues: number;
  /** Componente do deslocamento mostrada nos nós da deformada. */
  defComp: 'res' | 'ux' | 'uy' | 'rz';
  showAxes: boolean;
  /** Fator de tamanho dos símbolos (apoios, cargas, textos). */
  glyphScale: number;
  /** Desenho em preto e branco (impressão/exportação). */
  mono: boolean;
  /** Última transformação aplicada (para repetir). */
  lastXform: { t: Xform; o: XformOptions } | null;
  /** Há alterações não gravadas no arquivo de trabalho do computador. */
  unsaved: boolean;
  setUnsaved: (v: boolean) => void;
  commit: (fn: (m: Model) => void, msg?: string) => void;
  setModel: (m: Model, resetHistory?: boolean, fromFile?: boolean) => void;
  undo: () => void;
  redo: () => void;
  set: (p: Partial<State>) => void;
  select: (nodes: number[], members: number[], additive?: boolean) => void;
  clearSel: () => void;
}

function init(): Model {
  const m = samplePortico();
  m.combinations = nbrCombinations(m.cases, 1);
  return m;
}

const STORAGE = 'statikos:model';
function loadSaved(): Model | null {
  try {
    const s = localStorage.getItem(STORAGE);
    if (!s) return null;
    const m = JSON.parse(s);
    return m && m.version === 1 && Array.isArray(m.nodes) ? (m as Model) : null;
  } catch { return null; }
}
export function persist(m: Model) {
  try { localStorage.setItem(STORAGE, JSON.stringify(m)); } catch { /* armazenamento indisponível */ }
}

const saved = loadSaved();
const initial = saved ?? init();
const UNSAVED = 'statikos:unsaved';
function flagUnsaved(v: boolean) {
  try { if (v) localStorage.setItem(UNSAVED, '1'); else localStorage.removeItem(UNSAVED); } catch { /* armazenamento indisponível */ }
}
function readUnsaved() {
  try { return localStorage.getItem(UNSAVED) === '1'; } catch { return false; }
}

export const useStore = create<State>((set, get) => ({
  model: initial,
  past: [],
  future: [],
  selNodes: new Set(),
  selMembers: new Set(),
  tool: 'select',
  tab: 'estrutura',
  view: { scale: 60, ox: 200, oy: 500 },
  grid: 0.5,
  snap: true,
  activeCase: initial.cases[0]?.id ?? 1,
  source: { kind: 'case', id: initial.cases[0]?.id ?? 1 },
  diagram: 'M',
  showReactions: true,
  showValues: true,
  showDims: false,
  mTension: true,
  diagScale: 1,
  il: { member: null, x: 0, effect: 'M' },
  trainId: initial.trains[0]?.id ?? null,
  trainPath: [],
  trainStatic: null,
  trainResult: null,
  memorialOpen: false,
  libraryOpen: false,
  module: 'portico',
  libraryId: null,
  modeView: null,
  stepValues: 0,
  defComp: 'res',
  showAxes: false,
  glyphScale: 1,
  mono: false,
  lastXform: null,
  unsaved: readUnsaved(),
  setUnsaved: (v) => { flagUnsaved(v); set({ unsaved: v }); },
  message: saved
    ? 'Trabalho anterior recuperado deste navegador. Para guardar uma cópia, use Arquivo › Salvar no computador (Ctrl+S).'
    : 'Exemplo carregado. O trabalho fica neste navegador; use Arquivo › Salvar no computador (Ctrl+S) para guardar uma cópia e Abrir (Ctrl+O) para retomar.',
  commit: (fn, msg) => {
    const cur = get().model;
    const next = produce(cur, fn);
    if (next === cur) return;
    persist(next);
    flagUnsaved(true);
    set({ modeView: null, unsaved: true, model: next, past: [...get().past.slice(-199), cur], future: [], trainResult: null, ...(msg ? { message: msg } : {}) });
  },
  setModel: (m, resetHistory = true, fromFile = false) => {
    persist(m);
    flagUnsaved(!fromFile);
    set({
      unsaved: !fromFile,
      modeView: null,
      model: m,
      past: resetHistory ? [] : [...get().past, get().model],
      future: [],
      selNodes: new Set(),
      selMembers: new Set(),
      activeCase: m.cases[0]?.id ?? 1,
      source: { kind: 'case', id: m.cases[0]?.id ?? 1 },
      trainId: m.trains[0]?.id ?? null,
      trainPath: [],
      trainResult: null,
      il: { member: null, x: 0, effect: 'M' },
    });
  },
  undo: () => {
    const { past, model, future } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    persist(prev);
    flagUnsaved(true);
    set({ unsaved: true, model: prev, past: past.slice(0, -1), future: [model, ...future], message: 'Desfeito.', trainResult: null });
  },
  redo: () => {
    const { past, model, future } = get();
    if (!future.length) return;
    persist(future[0]);
    flagUnsaved(true);
    set({ unsaved: true, model: future[0], past: [...past, model], future: future.slice(1), message: 'Refeito.', trainResult: null });
  },
  set: (p) => set(p),
  select: (nodes, members, additive) => {
    const s = get();
    const n = new Set(additive ? s.selNodes : []);
    const mm = new Set(additive ? s.selMembers : []);
    for (const id of nodes) { if (additive && n.has(id)) n.delete(id); else n.add(id); }
    for (const id of members) { if (additive && mm.has(id)) mm.delete(id); else mm.add(id); }
    set({ selNodes: n, selMembers: mm });
  },
  clearSel: () => set({ selNodes: new Set(), selMembers: new Set() }),
}));
