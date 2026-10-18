// Arquivo de trabalho (.statikos): modelo atual + biblioteca + histórico, num único JSON
// que o usuário guarda no computador e reabre depois. Sem servidor.
import type { Model } from '../core/types';
import { listLibrary, loadFromLibrary, saveToLibrary, type LibraryEntry } from './storage';
import { getHistory, mergeHistory, type Activity } from './history';

export const WORKSPACE_FORMAT = 'statikos-workspace';
export const WORKSPACE_EXT = '.statikos';

export interface Workspace {
  format: typeof WORKSPACE_FORMAT;
  version: 1;
  savedAt: string;
  model: Model;
  library: LibraryEntry[];
  history: Activity[];
}

export function isModel(x: unknown): x is Model {
  const m = x as Model;
  return !!m && m.version === 1 && Array.isArray(m.nodes) && Array.isArray(m.members);
}

export async function buildWorkspace(model: Model): Promise<Workspace> {
  const { items } = await listLibrary();
  const library = (await Promise.all(items.map((i) => loadFromLibrary(i.id)))).filter((e): e is LibraryEntry => !!e);
  return { format: WORKSPACE_FORMAT, version: 1, savedAt: new Date().toISOString(), model, library, history: getHistory() };
}

/** Lê um arquivo de trabalho ou um modelo .json avulso. */
export function parseWorkspace(txt: string): { model: Model; workspace: Workspace | null } {
  const x = JSON.parse(txt);
  if (x?.format === WORKSPACE_FORMAT && isModel(x.model)) return { model: x.model, workspace: x as Workspace };
  if (isModel(x)) return { model: x, workspace: null };
  throw new Error('Arquivo inválido.');
}

/** Une biblioteca e histórico do arquivo aos do navegador. O registro mais recente de cada id prevalece. */
export async function mergeWorkspace(ws: Workspace): Promise<number> {
  const { items } = await listLibrary();
  const have = new Map(items.map((i) => [i.id, i.savedAt]));
  let n = 0;
  for (const e of ws.library ?? []) {
    if (!e?.id || !e.payload) continue;
    const cur = have.get(e.id);
    if (cur && cur >= e.savedAt) continue;
    await saveToLibrary(e.kind, e.name, e.summary, e.payload, e.id, e.savedAt);
    n++;
  }
  mergeHistory(ws.history ?? []);
  return n;
}

// File System Access API (Chrome/Edge): permite "Salvar" no mesmo arquivo sem novo download.
type Handle = { name: string; createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }>; getFile(): Promise<File> };
type Picker = (o: object) => Promise<Handle | Handle[]>;
const win = () => (typeof window === 'undefined' ? {} : window) as { showSaveFilePicker?: Picker; showOpenFilePicker?: Picker };
const types = [{ description: 'Trabalho Statikos', accept: { 'application/json': [WORKSPACE_EXT, '.json'] } }];
let handle: Handle | null = null;

export const canPickFiles = () => typeof win().showSaveFilePicker === 'function' && window.self === window.top;
export const currentFileName = () => handle?.name ?? null;

/** Grava no arquivo já escolhido; pede um arquivo se ainda não houver ou se `saveAs`. */
export async function writeToDisk(name: string, txt: string, saveAs: boolean): Promise<'saved' | 'declined' | 'unsupported'> {
  if (!canPickFiles()) return 'unsupported';
  try {
    if (!handle || saveAs) handle = (await win().showSaveFilePicker!({ suggestedName: name, types })) as Handle;
    const out = await handle.createWritable();
    await out.write(txt);
    await out.close();
    return 'saved';
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return 'declined';
    handle = null;
    return 'unsupported';
  }
}

export async function pickFromDisk(): Promise<string | null | 'unsupported'> {
  if (!canPickFiles() || typeof win().showOpenFilePicker !== 'function') return 'unsupported';
  try {
    const [h] = (await win().showOpenFilePicker!({ types, multiple: false })) as Handle[];
    const txt = await (await h.getFile()).text();
    handle = h;
    return txt;
  } catch (e) {
    return (e as DOMException).name === 'AbortError' ? null : 'unsupported';
  }
}

export function forgetFile() { handle = null; }
