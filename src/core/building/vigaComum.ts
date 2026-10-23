// Viga comum a dois grupos (E2b, C6.47 a C6.50).
//
// A viga é lançada uma vez, no grupo de origem (`Viga.comum = { grupo }`); no grupo associado existe a viga vinculada
// (`Viga.comumDe` = id da origem), criada e mantida igual à origem (`sincronizarComuns`, no mesmo passo de qualquer
// comando). Na análise é uma barra só: a viga do grupo de origem. A vinculada deixa de ser barra do pórtico e, na grelha
// do grupo associado, é uma linha de apoio vertical das lajes desse grupo; as reações dessa linha são aplicadas à viga de
// origem, no pavimento do grupo de origem que corresponde a cada pavimento do grupo associado (`pavimentoAlvoComum`).
// Armadura, envoltórias e dimensionamento ficam só na origem.
import type { Draft } from 'immer';
import { pavimentosDoGrupo, type BuildingModel, type Pavimento, type Viga } from './types';
import { comprimentoDesenvolvido } from './curvas';
import { proximaViga } from './vigas';

type P = [number, number];

/** Campos de geometria e seção que a viga vinculada copia da origem. */
const CAMPOS_COPIADOS = ['pontos', 'arcos', 'secao', 'alinhamento', 'invertida', 'nivel', 'mesa', 'chata', 'engasteLajes'] as const;

export const temComuns = (b: Pick<BuildingModel, 'vigas'>) => b.vigas.some((v) => v.comum || v.comumDe);
export const ehVinculada = (v: Pick<Viga, 'comumDe'>) => !!v.comumDe;

/**
 * Pavimento do grupo de origem que recebe a reação do pavimento `pavAssociado` do grupo associado: o de menor cota igual ou
 * acima dele (a viga comum fica no topo da laje do grupo associado, ex.: rampa) e, se não houver, o mais alto abaixo [a confirmar].
 */
export function pavimentoAlvoComum(b: BuildingModel, pavAssociado: Pick<Pavimento, 'cota'>, origem: Pick<Viga, 'grupo'>): Pavimento | undefined {
  const pavs = pavimentosDoGrupo(b, origem.grupo);
  return pavs.find((p) => p.cota >= pavAssociado.cota - 1e-6) ?? pavs[pavs.length - 1];
}

const copiar = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/**
 * Mantém as vigas vinculadas em dia com as de origem: cria a que falta, copia geometria e seção, remove a vinculada cuja origem
 * sumiu ou saiu do grupo e solta (sem apagar) a vinculada cuja origem deixou de ser comum (viga comum desfeita).
 * Devolve uma frase por criação ou remoção.
 */
export function sincronizarComuns(d: Draft<BuildingModel>): string[] {
  const msgs: string[] = [];
  const b = d as unknown as BuildingModel;
  // origem sem grupo associado válido deixa de ser comum
  for (const v of d.vigas) {
    if (v.comum && (v.comum.grupo === v.grupo || !d.grupos.some((g) => g.id === v.comum!.grupo))) { delete v.comum; msgs.push(`${v.nome}: o grupo associado não existe mais; a viga deixou de ser comum.`); }
    if (v.comum && v.comumDe) delete v.comum; // vinculada não é origem
  }
  // vinculadas órfãs, soltas ou duplicadas
  const porOrigem = new Map<string, Draft<Viga>[]>();
  for (const w of d.vigas) if (w.comumDe) porOrigem.set(w.comumDe, [...(porOrigem.get(w.comumDe) ?? []), w]);
  const fora = new Set<string>();
  for (const [id, ws] of porOrigem) {
    const o = d.vigas.find((x) => x.id === id);
    if (!o) { for (const w of ws) { fora.add(w.id); msgs.push(`${w.nome} removida: a viga de origem não existe mais.`); } continue; }
    if (!o.comum) { for (const w of ws) delete w.comumDe; continue; } // comum desfeita: a vinculada vira uma viga do grupo
    const fica = ws.find((w) => w.grupo === o.comum!.grupo) ?? ws[0];
    fica.grupo = o.comum.grupo;
    for (const w of ws) if (w !== fica) { fora.add(w.id); msgs.push(`${w.nome} removida: duplicada.`); }
  }
  if (fora.size) d.vigas = d.vigas.filter((w) => !fora.has(w.id));
  for (const o of d.vigas) {
    if (!o.comum) continue;
    let w = d.vigas.find((x) => x.comumDe === o.id);
    if (!w) {
      const nova: Viga = { id: `v_${(++d.seq).toString(36)}`, nome: `V${proximaViga(b, o.comum.grupo)}`, grupo: o.comum.grupo, pontos: copiar(o.pontos), secao: { ...o.secao }, alinhamento: o.alinhamento, comumDe: o.id };
      d.vigas.push(nova);
      w = d.vigas[d.vigas.length - 1];
      msgs.push(`${nova.nome} criada no grupo associado (comum com ${o.nome}).`);
    }
    for (const k of CAMPOS_COPIADOS) {
      const a = o[k], z = (w as Viga)[k];
      if (JSON.stringify(a) === JSON.stringify(z)) continue;
      if (a === undefined) delete (w as Record<string, unknown>)[k]; else (w as Record<string, unknown>)[k] = copiar(a);
    }
  }
  return msgs;
}

export interface LinhaVigaComum {
  origem: string; nomeOrigem: string; grupoOrigem: string;
  associada: string; nomeAssociada: string; grupoAssociado: string;
  comprimento: number;
  /** Pavimento do grupo associado → pavimento do grupo de origem que recebe a reação. */
  pavimentos: { associado: string; origem: string }[];
}

/** Quadro das vigas comuns para o memorial. */
export function resumoVigasComuns(b: BuildingModel): LinhaVigaComum[] {
  const nomeGrupo = (id: string) => b.grupos.find((g) => g.id === id)?.nome ?? id;
  return b.vigas.filter((v) => v.comum).map((o) => {
    const w = b.vigas.find((x) => x.comumDe === o.id);
    return {
      origem: o.id, nomeOrigem: o.nome, grupoOrigem: nomeGrupo(o.grupo),
      associada: w?.id ?? '', nomeAssociada: w?.nome ?? '—', grupoAssociado: nomeGrupo(o.comum!.grupo),
      comprimento: comprimentoDesenvolvido(o),
      pavimentos: pavimentosDoGrupo(b, o.comum!.grupo).map((pa) => ({ associado: pa.nome, origem: pavimentoAlvoComum(b, pa, o)?.nome ?? '—' })),
    };
  });
}

/** Pontos de um conjunto de nós sobre a linha da viga (tolerância em m): utilitário da análise. */
export function pontoSobrePoligonal(p: P, pts: P[], tol = 0.005): boolean {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
    if (Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]) <= tol) return true;
  }
  return false;
}
