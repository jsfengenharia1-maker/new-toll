// Biblioteca de projetos e "características" salvas.
// Na conta (capability db, subárvore privada do usuário) quando disponível; senão no navegador.
import type { Model } from '../core/types';
import type { FLoad } from '../core/piles';
import type { ListaSituacoes, PerfilMateriais } from '../core/building/acoes';
import type { ModeloPortico } from '../core/building/copiaArmadura';
import type { BuildingFile } from '../core/building/file';

export interface SavedCharacteristics {
  projectName: string;
  savedFrom: string;
  supports: FLoad[]; // cargas características por apoio (para fundações)
  members: { id: number; role: string; section: string; material: string; status: string; summary: string; NdMax?: number }[];
  settings: Record<string, unknown>;
}

export type LibraryKind = 'project' | 'characteristics' | 'materiais' | 'combinacoes' | 'portico' | 'edificio';
/** Conteúdo gravado na biblioteca: projeto, características das fundações, materiais do edifício, situações de projeto (N2a) ou modelo de armadura de pórtico (R7f) ou edifício inteiro (L1). */
export type LibraryPayload = Model | SavedCharacteristics | PerfilMateriais | ListaSituacoes | ModeloPortico | BuildingFile;
export interface LibraryItem { id: string; kind: LibraryKind; name: string; savedAt: string; summary: string }
export interface LibraryEntry extends LibraryItem { payload: LibraryPayload }

type Doc = { exists: boolean; id: string; data(): Record<string, unknown> | undefined };
interface DbLike {
  collection(path: string): { doc(id?: string): { set(d: Record<string, unknown>): Promise<void>; get(): Promise<Doc>; delete(): Promise<void>; id: string }; orderBy(f: string, d?: string): { limit(n: number): { get(): Promise<{ docs: Doc[] }> } } };
}

let backend: Promise<{ mode: 'cloud'; db: DbLike; uid: string } | { mode: 'local' }> | null = null;

function claudeUse(name: string): Promise<unknown> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  return c?.use ? c.use(name).catch(() => null) : Promise.resolve(null);
}

export function storageBackend() {
  backend ??= (async () => {
    const [db, user] = await Promise.all([claudeUse('db'), claudeUse('user')]);
    if (db && user) {
      try {
        const uid = await (user as { id(): Promise<string | null> }).id();
        if (uid) return { mode: 'cloud' as const, db: db as DbLike, uid };
      } catch { /* sem identidade */ }
    }
    return { mode: 'local' as const };
  })();
  return backend;
}

const LOCAL = 'statikos:library';
function localAll(): LibraryEntry[] {
  try { return JSON.parse(localStorage.getItem(LOCAL) ?? '[]'); } catch { return []; }
}
function localPut(list: LibraryEntry[]) {
  try { localStorage.setItem(LOCAL, JSON.stringify(list)); return true; } catch { return false; }
}
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function listLibrary(): Promise<{ mode: 'cloud' | 'local'; items: LibraryItem[] }> {
  const b = await storageBackend();
  if (b.mode === 'cloud') {
    const snap = await b.db.collection(`data/users/${b.uid}`).orderBy('savedAt', 'desc').limit(300).get();
    return { mode: 'cloud', items: snap.docs.map((d) => { const x = d.data()!; return { id: d.id, kind: x.kind as LibraryKind, name: String(x.name), savedAt: String(x.savedAt), summary: String(x.summary ?? '') }; }) };
  }
  return { mode: 'local', items: localAll().map(({ payload: _p, ...rest }) => rest).sort((a, z) => z.savedAt.localeCompare(a.savedAt)) };
}

export async function saveToLibrary(kind: LibraryKind, name: string, summary: string, payload: LibraryPayload, id?: string, savedAt = new Date().toISOString()): Promise<{ id: string; mode: 'cloud' | 'local' }> {
  const b = await storageBackend();
  const body = { kind, name, summary, savedAt, payload: JSON.stringify(payload) };
  if (body.payload.length > 240_000) throw new Error('O projeto passa de 240 KB e não cabe em um registro. Use Exportar .json.');
  if (b.mode === 'cloud') {
    const ref = b.db.collection(`data/users/${b.uid}`).doc(id);
    await ref.set(body);
    return { id: ref.id, mode: 'cloud' };
  }
  const list = localAll();
  const rid = id ?? newId();
  const entry: LibraryEntry = { id: rid, kind, name, summary, savedAt: body.savedAt, payload };
  const k = list.findIndex((x) => x.id === rid);
  if (k >= 0) list[k] = entry; else list.push(entry);
  if (!localPut(list)) throw new Error('O navegador não permitiu salvar. Use Exportar .json.');
  return { id: rid, mode: 'local' };
}

export async function loadFromLibrary(id: string): Promise<LibraryEntry | null> {
  const b = await storageBackend();
  if (b.mode === 'cloud') {
    const d = await b.db.collection(`data/users/${b.uid}`).doc(id).get();
    if (!d.exists) return null;
    const x = d.data()!;
    return { id, kind: x.kind as LibraryKind, name: String(x.name), savedAt: String(x.savedAt), summary: String(x.summary ?? ''), payload: JSON.parse(String(x.payload)) };
  }
  return localAll().find((x) => x.id === id) ?? null;
}

export async function deleteFromLibrary(id: string) {
  const b = await storageBackend();
  if (b.mode === 'cloud') { await b.db.collection(`data/users/${b.uid}`).doc(id).delete(); return; }
  localPut(localAll().filter((x) => x.id !== id));
}

export const LIMITE_EDIFICIO = 240_000;

/** Grava o edifício (modelo + log) na biblioteca. Acima do limite do registro devolve o aviso, sem gravar. */
export async function salvarEdificioNaBiblioteca(nome: string, resumo: string, arquivo: BuildingFile, id?: string): Promise<{ ok: true; id: string } | { ok: false; aviso: string }> {
  if (JSON.stringify(arquivo).length > LIMITE_EDIFICIO) return { ok: false, aviso: 'A obra passa de 240 KB e não cabe na biblioteca. Use Arquivo › Salvar no computador (.statikos), que não tem esse limite.' };
  try { const r = await saveToLibrary('edificio', nome, resumo, arquivo, id); return { ok: true, id: r.id }; }
  catch (e) { return { ok: false, aviso: (e as Error).message }; }
}
