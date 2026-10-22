// Obras abertas (L1): só metadados, em localStorage ('statikos:recentes'); leitura e escrita protegidas.
import type { OrigemObra } from '../../core/building/types';

export type OrigemRecente = OrigemObra | 'arquivo' | 'biblioteca';
export interface ObraRecente { nome: string; descricao: string; abertaEm: string; origem: OrigemRecente; pavimentos: number }
export const CHAVE_RECENTES = 'statikos:recentes';
export const LIMITE_HISTORICO = 500;
export const ULTIMAS = 6;

const normaBusca = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Histórico completo, do mais recente ao mais antigo. Armazenamento indisponível ou corrompido → lista vazia. */
export function lerRecentes(): ObraRecente[] {
  try {
    const bruto = globalThis.localStorage?.getItem(CHAVE_RECENTES);
    if (!bruto) return [];
    const lista = JSON.parse(bruto);
    if (!Array.isArray(lista)) return [];
    return lista.filter((o): o is ObraRecente => !!o && typeof o.nome === 'string');
  } catch {
    return [];
  }
}

/** Acrescenta uma abertura no início (`abertaEm` = agora, ISO) e grava; guarda no máximo `LIMITE_HISTORICO`. Falha de gravação é ignorada. Devolve a lista nova. */
export function registrarRecente(o: Omit<ObraRecente, 'abertaEm'> & { abertaEm?: string }): ObraRecente[] {
  const item: ObraRecente = { nome: o.nome, descricao: o.descricao, origem: o.origem, pavimentos: o.pavimentos, abertaEm: o.abertaEm ?? new Date().toISOString() };
  const lista = [item, ...lerRecentes()].slice(0, LIMITE_HISTORICO);
  try {
    globalThis.localStorage?.setItem(CHAVE_RECENTES, JSON.stringify(lista));
  } catch {
    // gravação indisponível: a lista segue só em memória
  }
  return lista;
}

/** As `n` últimas obras distintas pelo nome (a abertura mais recente de cada nome). */
export function ultimasObras(lista: ObraRecente[], n = ULTIMAS): ObraRecente[] {
  const vistos = new Set<string>();
  const out: ObraRecente[] = [];
  for (const o of lista) {
    if (vistos.has(o.nome)) continue;
    vistos.add(o.nome);
    out.push(o);
    if (out.length >= n) break;
  }
  return out;
}

/** Filtra por palavra no nome ou na descrição (sem acento nem maiúsculas); termo vazio → a lista inteira. Várias palavras: todas devem aparecer. */
export function buscarRecentes(lista: ObraRecente[], termo: string): ObraRecente[] {
  const palavras = normaBusca(termo).split(/\s+/).filter(Boolean);
  if (!palavras.length) return lista;
  return lista.filter((o) => {
    const texto = normaBusca(`${o.nome} ${o.descricao}`);
    return palavras.every((p) => texto.includes(p));
  });
}

/** Apaga o histórico. */
export function limparRecentes(): void {
  try {
    globalThis.localStorage?.removeItem(CHAVE_RECENTES);
  } catch {
    // indisponível: nada a apagar
  }
}
