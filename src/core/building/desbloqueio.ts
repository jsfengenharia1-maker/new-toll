// Desbloqueio gravado (R7f): a armadura editada e o detalhamento editado de uma viga valem para um número de vãos, e os
// de um pilar para um número de lances. Quando um comando muda esse número (unir, dividir, mover ou inserir pilar,
// repetir pavimento…), o bloqueio sai do modelo no mesmo passo — desfazer devolve a armadura. Modelos de arquivos
// antigos podem ainda trazer bloqueio fora de uso: o dimensionamento o desconsidera com aviso (BLOQ_IGNORADO).
import type { Draft } from 'immer';
import { lancesDoPilar, type BuildingModel, type Pilar, type Viga } from './types';
import { vaosDaViga } from './vigas';

/** Algum elemento carrega bloqueio ou edição de detalhe que depende do número de vãos ou de lances? */
export function temBloqueioDependente(b: BuildingModel): boolean {
  return b.vigas.some((v) => v.armadura || v.detalhe) || b.pilares.some((p) => p.armaduras?.length || p.detalhe) || !!b.agrupamentos?.length;
}

/** O comando pode ter mudado o número de vãos ou de lances? (as listas de vigas, pilares, pavimentos ou grupos mudaram.) */
export const mudouEstrutura = (a: BuildingModel, z: BuildingModel) => a.vigas !== z.vigas || a.pilares !== z.pilares || a.pavimentos !== z.pavimentos || a.grupos !== z.grupos;

/**
 * Remove do rascunho a armadura bloqueada e o detalhe editado que não valem mais (vãos ou lances mudaram).
 * Devolve uma frase por elemento atingido.
 */
export function desbloquearObsoletos(d: Draft<BuildingModel>): string[] {
  const b = d as BuildingModel, msgs: string[] = [];
  for (const v of d.vigas) {
    if (!v.armadura && !v.detalhe) continue;
    const n = vaosDaViga(b, v as Viga), partes: string[] = [];
    if (v.armadura && v.armadura.vaos !== n) { delete v.armadura; partes.push('armadura bloqueada'); }
    if (v.detalhe && v.detalhe.vaos !== n) { delete v.detalhe; partes.push('detalhe editado'); }
    if (partes.length) msgs.push(`${v.nome}: ${partes.join(' e ')} desbloqueado${partes.length > 1 ? 's' : ''} (o número de vãos mudou).`);
  }
  for (const p of d.pilares) {
    if (!p.armaduras?.length && !p.detalhe) continue;
    const n = lancesDoPilar(b, p as Pilar).length, partes: string[] = [];
    if (p.armaduras?.length) {
      const ficam = p.armaduras.filter((x) => x.lances === n);
      if (ficam.length !== p.armaduras.length) { if (ficam.length) p.armaduras = ficam; else delete p.armaduras; partes.push('armadura bloqueada'); }
    }
    if (p.detalhe && p.detalhe.lances !== n) { delete p.detalhe; partes.push('detalhe editado'); }
    if (partes.length) msgs.push(`${p.nome}: ${partes.join(' e ')} desbloqueado${partes.length > 1 ? 's' : ''} (o número de lances mudou).`);
  }
  // agrupamentos de pórticos: membros removidos saem; com menos de duas vigas o agrupamento se desfaz
  if (d.agrupamentos?.length) {
    const existem = new Set(d.vigas.map((v) => v.id));
    for (const g of d.agrupamentos) {
      const ficam = g.vigas.filter((id) => existem.has(id));
      if (ficam.length !== g.vigas.length) { g.vigas = ficam; msgs.push(`Agrupamento ${g.nome}: vigas removidas saíram do grupo.`); }
    }
    const antes = d.agrupamentos.length;
    d.agrupamentos = d.agrupamentos.filter((g) => g.vigas.length >= 2);
    if (d.agrupamentos.length !== antes) msgs.push('Agrupamento com menos de duas vigas desfeito.');
    if (!d.agrupamentos.length) delete d.agrupamentos;
  }
  return msgs;
}
