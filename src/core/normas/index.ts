// Biblioteca de normas editável (frente N3): registro `NORMAS`, leitura `tabelaNorma(b, id)`, validação por esquema de
// colunas e exportação/importação em JSON. Núcleo puro.
import { NORMAS_FOGO } from './fogo';
import { NORMAS_FUNDACOES } from './fundacoes';
import { NORMAS_GERAIS } from './gerais';
import type { CelulaNorma, FonteNormas, LinhaNorma, NormasModelo, TabelaNormaInfo, TabelaNormaUsuario } from './tipos';

export * from './tipos';

export const NORMAS: TabelaNormaInfo[] = [...NORMAS_GERAIS, ...NORMAS_FUNDACOES, ...NORMAS_FOGO];
const POR_ID = new Map(NORMAS.map((t) => [t.id, t]));

export const normaInfo = (id: string): TabelaNormaInfo | undefined => POR_ID.get(id);
export const IDS_NORMAS = NORMAS.map((t) => t.id);

const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
export const linhasIguais = (a: LinhaNorma[], z: LinhaNorma[]) => JSON.stringify(a) === JSON.stringify(z);

/** Versão do usuário da tabela, se houver. */
export const normaDoUsuario = (b: FonteNormas | undefined, id: string): TabelaNormaUsuario | undefined => b?.normas?.[id];

/** Linhas em uso: as do usuário se ele alterou a tabela, senão as de fábrica (mesma referência, não alterar). */
export function tabelaNorma(b: FonteNormas | undefined, id: string): LinhaNorma[] {
  const u = b?.normas?.[id];
  if (u) return u.linhas;
  const info = POR_ID.get(id);
  if (!info) throw new Error(`Tabela normativa desconhecida: ${id}`);
  return info.linhas;
}

export interface NormaEmUso { info: TabelaNormaInfo; linhas: LinhaNorma[]; alterada: boolean; edicao: string; nota?: string }
export function normaEmUso(b: FonteNormas | undefined, id: string): NormaEmUso {
  const info = POR_ID.get(id);
  if (!info) throw new Error(`Tabela normativa desconhecida: ${id}`);
  const u = b?.normas?.[id];
  return { info, linhas: u?.linhas ?? info.linhas, alterada: !!u, edicao: u?.edicao || info.edicao, ...(u?.nota ? { nota: u.nota } : {}) };
}
/** Todas as tabelas com a versão em uso (memorial e interface). */
export const normasEmUso = (b: FonteNormas | undefined): NormaEmUso[] => NORMAS.map((t) => normaEmUso(b, t.id));

/** Armazenável: igual à de fábrica e sem edição/nota própria não precisa ser guardada. */
export const igualAFabrica = (id: string, u: TabelaNormaUsuario) => (!u.edicao || u.edicao === POR_ID.get(id)!.edicao) && !u.nota && linhasIguais(u.linhas, POR_ID.get(id)!.linhas);

const eNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Erros das linhas contra o esquema da tabela (lista vazia = válida). */
export function validarLinhas(id: string, linhas: unknown): string[] {
  const info = POR_ID.get(id);
  if (!info) return [`tabela "${id}" não existe`];
  if (!Array.isArray(linhas) || !linhas.length) return ['sem linhas'];
  const e: string[] = [];
  const vistas = new Set<string>();
  linhas.forEach((l, i) => {
    const n = `linha ${i + 1}`;
    if (!l || typeof l !== 'object' || Array.isArray(l)) { e.push(`${n}: não é um objeto`); return; }
    const r = l as Record<string, unknown>;
    for (const k of Object.keys(r)) if (!info.colunas.some((c) => c.chave === k)) e.push(`${n}: coluna desconhecida "${k}"`);
    for (const c of info.colunas) {
      const v = r[c.chave];
      if (v === undefined) { e.push(`${n}: falta "${c.rotulo}"`); continue; }
      if (c.tipo === 'numero') { if (!(eNum(v) || (v === null && c.nulo))) e.push(`${n}: "${c.rotulo}" deve ser número${c.nulo ? ' ou nulo' : ''}`); }
      else if (c.tipo === 'texto') { if (typeof v !== 'string' || !v.trim()) e.push(`${n}: "${c.rotulo}" deve ser texto não vazio`); }
      else if (!Array.isArray(v) || !v.every(eNum)) e.push(`${n}: "${c.rotulo}" deve ser lista de números`);
      else if (c.pares && (v.length === 0 || v.length % 2)) e.push(`${n}: "${c.rotulo}" deve ter pares (quantidade par)`);
    }
    const k = String(r[info.chave]);
    if (vistas.has(k)) e.push(`${n}: chave "${k}" repetida`); else vistas.add(k);
  });
  if (info.chavesFixas) {
    const falta = info.chavesFixas.filter((k) => !vistas.has(String(k)));
    const sobra = [...vistas].filter((k) => !info.chavesFixas!.some((x) => String(x) === k));
    if (falta.length) e.push(`faltam as linhas ${falta.join(', ')}`);
    if (sobra.length) e.push(`linhas fora do conjunto da tabela: ${sobra.join(', ')}`);
  }
  return e;
}

/** Linha em branco do esquema (editor: nova linha). */
export const linhaVazia = (id: string): LinhaNorma => {
  const info = POR_ID.get(id)!;
  return Object.fromEntries(info.colunas.map((c) => [c.chave, c.tipo === 'numero' ? 0 : c.tipo === 'texto' ? 'novo' : []])) as LinhaNorma;
};
export const linhasDeFabrica = (id: string): LinhaNorma[] => copia(POR_ID.get(id)!.linhas);

// ---------------------------------------------------------------- exportar / importar

export const FORMATO_NORMAS = 'statikos-normas';
export interface ArquivoNormas { formato: typeof FORMATO_NORMAS; versao: 1; tabelas: Record<string, { edicao: string; nota?: string; linhas: LinhaNorma[] }> }

/** JSON da versão em uso de uma tabela, de várias ou da biblioteca toda (sem ids: todas). */
export function exportarNormas(b: FonteNormas | undefined, ids?: string[]): string {
  const out: ArquivoNormas = { formato: FORMATO_NORMAS, versao: 1, tabelas: {} };
  for (const id of ids ?? IDS_NORMAS) {
    const u = normaEmUso(b, id);
    out.tabelas[id] = { edicao: u.edicao, ...(u.nota ? { nota: u.nota } : {}), linhas: copia(u.linhas) };
  }
  return JSON.stringify(out, null, 2);
}

/** Lê um JSON exportado e valida cada tabela contra o esquema; erro de uma tabela recusa tudo. */
export function importarNormas(texto: string): { ok: true; tabelas: NormasModelo } | { ok: false; erros: string[] } {
  let j: unknown;
  try { j = JSON.parse(texto); } catch { return { ok: false, erros: ['JSON inválido'] }; }
  const a = j as Partial<ArquivoNormas> | null;
  if (!a || a.formato !== FORMATO_NORMAS || !a.tabelas || typeof a.tabelas !== 'object') return { ok: false, erros: [`Arquivo não é uma biblioteca de normas do Statikos (formato "${FORMATO_NORMAS}").`] };
  const erros: string[] = [], tabelas: NormasModelo = {};
  for (const [id, t] of Object.entries(a.tabelas)) {
    const er = validarLinhas(id, t?.linhas);
    if (er.length) { erros.push(`${id}: ${er.join('; ')}`); continue; }
    tabelas[id] = { linhas: copia(t.linhas), ...(t.edicao ? { edicao: String(t.edicao) } : {}), ...(t.nota ? { nota: String(t.nota) } : {}) };
  }
  return erros.length ? { ok: false, erros } : { ok: true, tabelas };
}

/** Valor da célula como texto para o editor / memorial. */
export const celulaTexto = (v: CelulaNorma | undefined): string => (v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v));
