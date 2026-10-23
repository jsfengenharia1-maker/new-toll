// Barra de atalhos configurável (C1.6): catálogo de botões e persistência protegida. O núcleo não toca no navegador:
// o armazenamento entra como parâmetro (`localStorage` no app).

export interface Atalho {
  id: string;
  rotulo: string;
  /** Nome do ícone próprio na biblioteca `src/app/ui`. */
  icone: string;
  /** `ferramenta` = escolhe a ferramenta da planta; `acao` = ação do aplicativo (desfazer, refazer, ajuda, guia…); `aba` = vai à aba. */
  tipo: 'ferramenta' | 'acao' | 'aba';
  alvo: string;
}

export const ATALHOS_CATALOGO: Atalho[] = [
  { id: 'desfazer', rotulo: 'Desfazer', icone: 'desfazer', tipo: 'acao', alvo: 'desfazer' },
  { id: 'refazer', rotulo: 'Refazer', icone: 'refazer', tipo: 'acao', alvo: 'refazer' },
  { id: 'ajuda', rotulo: 'Ajuda (F1)', icone: 'ajuda', tipo: 'acao', alvo: 'ajuda' },
  { id: 'guia', rotulo: 'Guia rápido', icone: 'guia', tipo: 'acao', alvo: 'guia' },
  { id: 'copiarGrupo', rotulo: 'Copiar de outro grupo', icone: 'copiarGrupo', tipo: 'acao', alvo: 'copiarGrupo' },
  { id: 'unirPavimentos', rotulo: 'Unir pavimentos', icone: 'unirPavimentos', tipo: 'acao', alvo: 'unirPavimentos' },
  { id: 'selecionar', rotulo: 'Selecionar', icone: 'selecionar', tipo: 'ferramenta', alvo: 'selecionar' },
  { id: 'pilar', rotulo: 'Pilar', icone: 'pilar', tipo: 'ferramenta', alvo: 'pilar' },
  { id: 'viga', rotulo: 'Viga', icone: 'viga', tipo: 'ferramenta', alvo: 'viga' },
  { id: 'laje', rotulo: 'Laje', icone: 'laje', tipo: 'ferramenta', alvo: 'laje' },
  { id: 'carga', rotulo: 'Carga', icone: 'carga', tipo: 'ferramenta', alvo: 'carga' },
  { id: 'eixo', rotulo: 'Eixo', icone: 'eixo', tipo: 'ferramenta', alvo: 'eixo' },
  { id: 'mover', rotulo: 'Mover', icone: 'mover', tipo: 'ferramenta', alvo: 'mover' },
  { id: 'copiar', rotulo: 'Copiar', icone: 'copiar', tipo: 'ferramenta', alvo: 'copiar' },
  { id: 'medir', rotulo: 'Medir', icone: 'medir', tipo: 'ferramenta', alvo: 'medir' },
  { id: 'abaDimensionamento', rotulo: 'Dimensionamento', icone: 'dimensionamento', tipo: 'aba', alvo: 'dimensionamento' },
  { id: 'abaVerificacao', rotulo: 'Verificação', icone: 'verificacao', tipo: 'aba', alvo: 'verificacao' },
];

export const BARRA_PADRAO: string[] = ['desfazer', 'refazer', 'ajuda', 'guia'];
export const CHAVE_BARRA = 'statikos:barra';
const IDS = new Set(ATALHOS_CATALOGO.map((a) => a.id));

/** Lista válida: só ids do catálogo, sem repetir, na ordem dada. */
export function normalizarBarra(x: unknown): string[] {
  if (!Array.isArray(x)) return [...BARRA_PADRAO];
  const vistos = new Set<string>(), out: string[] = [];
  for (const v of x) if (typeof v === 'string' && IDS.has(v) && !vistos.has(v)) { vistos.add(v); out.push(v); }
  return out;
}
/** Põe o atalho no fim da barra ou o tira, se já estiver. */
export const alternarAtalho = (lista: string[], id: string): string[] => (!IDS.has(id) ? lista : lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);
/** Move o atalho `delta` posições (negativo = para o início). */
export function moverAtalho(lista: string[], id: string, delta: number): string[] {
  const i = lista.indexOf(id);
  if (i < 0) return lista;
  const j = Math.max(0, Math.min(lista.length - 1, i + delta));
  const r = [...lista];
  r.splice(i, 1); r.splice(j, 0, id);
  return r;
}

/** O mínimo de `Storage` que a barra usa (testável sem navegador). */
export interface ArmazenamentoSimples { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void }
/** Barra salva; sem armazenamento, JSON inválido ou erro de acesso: a padrão. */
export function lerBarra(st: ArmazenamentoSimples | null | undefined): string[] {
  try {
    const t = st?.getItem(CHAVE_BARRA);
    return t ? normalizarBarra(JSON.parse(t)) : [...BARRA_PADRAO];
  } catch { return [...BARRA_PADRAO]; }
}
/** Salva a barra; devolve false se o armazenamento recusou. */
export function salvarBarra(st: ArmazenamentoSimples | null | undefined, lista: string[]): boolean {
  try { st?.setItem(CHAVE_BARRA, JSON.stringify(normalizarBarra(lista))); return !!st; } catch { return false; }
}
/** Volta à barra padrão e apaga a salva. */
export function restaurarBarra(st: ArmazenamentoSimples | null | undefined): string[] {
  try { st?.removeItem?.(CHAVE_BARRA); } catch { /* sem armazenamento */ }
  return [...BARRA_PADRAO];
}
