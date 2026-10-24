// Materiais do IFC ligados a tipos de elemento estrutural (L3, C1.23): fck e aço sugeridos pelo material mais usado em cada
// tipo; o usuário troca o material ou digita o valor. Sem material no arquivo, vale o da obra (valor ausente).
import { acoDoTexto, fckDoTexto, type IfcLido, type MaterialIfc } from './ler';

export type TipoElementoIfc = 'pilar' | 'viga' | 'laje' | 'fundacao';
export const TIPOS_ELEMENTO: { v: TipoElementoIfc; rotulo: string }[] = [
  { v: 'pilar', rotulo: 'Pilares' }, { v: 'viga', rotulo: 'Vigas' }, { v: 'laje', rotulo: 'Lajes' }, { v: 'fundacao', rotulo: 'Fundações' },
];

/** Atribuição de material a um tipo de elemento. `material` é o do arquivo que originou os valores (só para mostrar). */
export interface AtribuicaoMaterial { material?: string; fck?: number; aco?: 'CA-50' | 'CA-60' }

/** Faixa de fck aceita por `materiais.definir` (MPa). */
export const FCK_FAIXA: [number, number] = [20, 90];

function maisFrequente(nomes: string[], f: (n: string) => boolean): string | undefined {
  const n = new Map<string, number>();
  for (const x of nomes) if (f(x)) n.set(x, (n.get(x) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
}

/** Concreto (fck) e aço (CA-50/CA-60) lidos de um material do arquivo. */
export function valoresDoMaterial(m: MaterialIfc | undefined): AtribuicaoMaterial {
  if (!m) return {};
  return { material: m.nome, ...(m.fck !== undefined ? { fck: m.fck } : {}), ...(m.aco ? { aco: m.aco } : {}) };
}

/** Material mais usado em cada tipo de elemento: concreto entre os que têm fck e aço entre os que têm CA-50/CA-60. */
export function materiaisSugeridos(l: IfcLido): Record<TipoElementoIfc, AtribuicaoMaterial> {
  const por: Record<TipoElementoIfc, string[]> = {
    pilar: l.colunas.flatMap((c) => c.materiais), viga: l.vigas.flatMap((c) => c.materiais),
    laje: l.lajes.flatMap((c) => c.materiais), fundacao: l.outros.flatMap((c) => c.materiais),
  };
  const out = {} as Record<TipoElementoIfc, AtribuicaoMaterial>;
  for (const t of Object.keys(por) as TipoElementoIfc[]) {
    const concreto = maisFrequente(por[t], (n) => fckDoTexto(n) !== undefined || l.materiais.some((m) => m.nome === n && m.fck !== undefined));
    const aco = maisFrequente(por[t], (n) => acoDoTexto(n) !== undefined || l.materiais.some((m) => m.nome === n && m.aco !== undefined));
    const mc = l.materiais.find((m) => m.nome === concreto), ma = l.materiais.find((m) => m.nome === aco);
    out[t] = { ...(concreto ? { material: concreto } : {}), ...(mc?.fck !== undefined ? { fck: mc.fck } : {}), ...(ma?.aco ? { aco: ma.aco } : {}) };
  }
  return out;
}

/** Texto das duas fontes lado a lado: o valor lido do arquivo e a propriedade que o deu (para a tabela de revisão). */
export function textoMaterial(m: MaterialIfc): string {
  const p = [m.fck !== undefined ? `fck ${m.fck} MPa` : '', m.aco ?? '', m.propriedade ? `propriedade “${m.propriedade}”` : ''].filter(Boolean);
  return p.length ? p.join('; ') : 'sem classe reconhecida';
}
