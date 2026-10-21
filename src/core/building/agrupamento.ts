// Agrupamento de pórticos (R7f). Agrupar não verifica condições; o cálculo é que diz se vale:
//  - efetivo: todas as vigas têm o mesmo número de vãos e a mesma seção. A armadura de todas passa a ser a do pórtico
//    que governa (maior área inferior, superior, laterais e estribos entre os membros), isto é, a envoltória do grupo;
//  - não efetivo: aviso AGRUP_IGNORADO com o motivo, e cada viga segue dimensionada sozinha.
// Uma mudança num membro vale para todos (comandos de armadura e detalhe) e o grupo sai num só desenho nas pranchas
// quando a geometria dos membros é idêntica.
import { barArea } from '../concrete';
import { apoiosDaViga } from './detalhamento';
import type { ResultadoViga } from './dimensionamento';
import type { AgrupamentoPorticos, ArmaduraViga, BuildingModel, Viga } from './types';
import { vaosDaViga } from './vigas';

/** Diferença máxima (m) entre vãos e comprimentos para a geometria ser tida como idêntica no desenho. */
export const TOL_GEOMETRIA = 0.01;

export interface InfoAgrupamento {
  id: string; nome: string;
  /** Vigas do agrupamento que existem no modelo. */
  vigas: string[];
  efetivo: boolean;
  /** Motivo de não valer (agrupamento não efetivo). */
  motivo?: string;
  /** Viga cuja armadura governa e foi aplicada às demais. */
  referencia?: string;
  /** Membros com armadura bloqueada própria: ficam fora da equalização. */
  fora: string[];
  /** Subconjuntos de membros com geometria idêntica: um desenho por subconjunto (ids na ordem do agrupamento). */
  desenhos: string[][];
}

const viga = (b: BuildingModel, id: string) => b.vigas.find((v) => v.id === id);
const vaosEixo = (b: BuildingModel, v: Viga) => {
  const ap = apoiosDaViga(b, v), c = ap.map((a) => (a.s0 + a.s1) / 2);
  return c.slice(1).map((x, i) => x - c[i]);
};
const comp = (v: Viga) => v.pontos.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - v.pontos[i][0], p[1] - v.pontos[i][1]), 0);

/** Geometria idêntica para o desenho: mesma seção, mesmo comprimento e os mesmos vãos (eixo a eixo). */
export function geometriaIdentica(b: BuildingModel, a: Viga, z: Viga): boolean {
  if (a.secao.b !== z.secao.b || a.secao.h !== z.secao.h || Math.abs(comp(a) - comp(z)) > TOL_GEOMETRIA) return false;
  const va = vaosEixo(b, a), vz = vaosEixo(b, z);
  return va.length === vz.length && va.every((x, i) => Math.abs(x - vz[i]) <= TOL_GEOMETRIA);
}

/** Motivo de um conjunto de vigas não poder ser equalizado (nenhum = pode). Não verifica a existência da armadura. */
export function motivoAgrupamento(b: BuildingModel, ids: string[]): string | null {
  const vs = ids.map((id) => viga(b, id)).filter((v): v is Viga => !!v);
  if (vs.length < 2) return 'o agrupamento tem menos de duas vigas';
  const n = vs.map((v) => vaosDaViga(b, v));
  if (new Set(n).size > 1) return `número de vãos diferente (${vs.map((v, i) => `${v.nome}: ${n[i]}`).join('; ')})`;
  const s = vs.map((v) => `${Math.round(v.secao.b * 100)}×${Math.round(v.secao.h * 100)}`);
  if (new Set(s).size > 1) return `seção diferente (${vs.map((v, i) => `${v.nome}: ${s[i]}`).join('; ')})`;
  return null;
}

const areaInf = (r: ResultadoViga) => (r.arranjo.inf ? r.arranjo.inf.n * barArea(r.arranjo.inf.phi) : 0);
const areaSup = (r: ResultadoViga) => (r.arranjo.sup ? r.arranjo.sup.n * barArea(r.arranjo.sup.phi) : 0);
const areaLat = (r: ResultadoViga) => (r.arranjo.laterais ? r.arranjo.laterais.n * barArea(r.arranjo.laterais.phi) : 0);
const asw = (r: ResultadoViga) => (r.arranjo.estribo ? ((r.arranjo.estribo.legs ?? 2) * barArea(r.arranjo.estribo.phi)) / r.arranjo.estribo.s : 0);
const maior = <T>(xs: ResultadoViga[], f: (r: ResultadoViga) => number, g: (r: ResultadoViga) => T) => g(xs.reduce((m, r) => (f(r) > f(m) + 1e-12 ? r : m), xs[0]));

/**
 * Armadura única de um grupo de vigas já dimensionadas: por componente, o arranjo do membro que governa
 * (área inferior, superior, laterais e armadura de estribo por metro).
 */
export function armaduraDoGrupo(rs: ResultadoViga[], vaos: number): ArmaduraViga | null {
  const inf = maior(rs, areaInf, (r) => r.arranjo.inf);
  const estribo = maior(rs, asw, (r) => r.arranjo.estribo);
  if (!inf || !estribo) return null;
  const sup = maior(rs, areaSup, (r) => r.arranjo.sup), lat = maior(rs, areaLat, (r) => r.arranjo.laterais);
  return { inf: { ...inf }, ...(sup ? { sup: { ...sup } } : {}), estribo: { ...estribo }, ...(lat ? { laterais: { ...lat } } : {}), vaos };
}

/**
 * Resolve os agrupamentos do modelo contra os resultados individuais: armadura de cada grupo efetivo (a aplicar como
 * bloqueio transitório aos membros sem armadura própria) e a descrição de cada agrupamento. Membros que não existem
 * mais são ignorados.
 */
export function resolverAgrupamentos(b: BuildingModel, rs: ResultadoViga[]): { transientes: Map<string, ArmaduraViga>; infos: InfoAgrupamento[]; avisos: Map<string, string[]> } {
  const transientes = new Map<string, ArmaduraViga>(), infos: InfoAgrupamento[] = [], avisos = new Map<string, string[]>();
  const aviso = (id: string, m: string) => avisos.set(id, [...(avisos.get(id) ?? []), m]);
  for (const g of b.agrupamentos ?? []) {
    const ids = g.vigas.filter((id) => viga(b, id));
    const info: InfoAgrupamento = { id: g.id, nome: g.nome, vigas: ids, efetivo: false, fora: [], desenhos: [] };
    infos.push(info);
    const motivo = motivoAgrupamento(b, ids);
    if (motivo) { info.motivo = motivo; for (const id of ids) aviso(id, `Agrupamento ${g.nome} desconsiderado: ${motivo}; a viga foi dimensionada sozinha.`); continue; }
    const proprias = ids.filter((id) => viga(b, id)!.armadura);
    info.fora = proprias;
    const livres = ids.filter((id) => !proprias.includes(id));
    // com armadura própria bloqueada, ela entra na envoltória do grupo como o arranjo que é; só as livres recebem
    const vaos = vaosDaViga(b, viga(b, ids[0])!);
    const membros = ids.map((id) => rs.find((r) => r.viga === id)).filter((r): r is ResultadoViga => !!r);
    const arm = membros.length === ids.length ? armaduraDoGrupo(membros, vaos) : null;
    if (!arm) { info.motivo = 'armadura sem solução em algum membro'; for (const id of ids) aviso(id, `Agrupamento ${g.nome} desconsiderado: ${info.motivo}.`); continue; }
    info.efetivo = true;
    info.referencia = membros.find((r) => JSON.stringify(r.arranjo) === JSON.stringify({ inf: arm.inf, sup: arm.sup ?? null, estribo: arm.estribo, laterais: arm.laterais ?? null }))?.viga ?? maior(membros, (r) => areaInf(r) + areaSup(r), (r) => r.viga);
    if (livres.length) for (const id of proprias) aviso(id, `Agrupamento ${g.nome}: a armadura bloqueada de ${viga(b, id)!.nome} fica fora da equalização (o bloqueio prevalece).`);
    for (const id of livres) transientes.set(id, { ...arm, inf: { ...arm.inf }, ...(arm.sup ? { sup: { ...arm.sup } } : {}), estribo: { ...arm.estribo } });
    // desenhos: subconjuntos de membros com geometria idêntica (o primeiro de cada subconjunto representa os demais)
    const dese: string[][] = [];
    for (const id of ids) {
      const v = viga(b, id)!, alvo = dese.find((d) => geometriaIdentica(b, viga(b, d[0])!, v));
      if (alvo) alvo.push(id); else dese.push([id]);
    }
    info.desenhos = dese;
  }
  return { transientes, infos, avisos };
}

/** Agrupamento a que a viga pertence. */
export const agrupamentoDe = (b: BuildingModel, id: string): AgrupamentoPorticos | undefined => b.agrupamentos?.find((g) => g.vigas.includes(id));
