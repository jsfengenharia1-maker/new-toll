// Alinhar e travar (L9): translação que leva a face/eixo/centro de um pilar ou viga à referência, e restrições (cadeado) que
// fazem o elemento travado acompanhar a referência quando ela se move por qualquer comando.
import type { Draft } from 'immer';
import { elementoDe, resolverRef, translacaoParaAlinhar, type Pt, type RefAlinh, type RestricaoAlinhamento } from '../geom/referencias';
import type { BuildingModel } from './types';

const r9 = (v: number) => +v.toFixed(9);
const TOL_MOVER = 1e-7;
type Modelo = Pick<BuildingModel, 'pilares' | 'vigas' | 'lajes' | 'eixos' | 'mascaras'>;

/** Chave do alvo travado: um alvo (elemento + parte + trecho) tem no máximo uma restrição. */
const chaveAlvo = (a: RefAlinh) => JSON.stringify(a);

/** O alvo precisa ser pilar ou viga (o que se move); devolve mensagem de erro ou null. */
export function erroDoAlvo(m: Modelo, alvo: RefAlinh): string | null {
  if (alvo.k === 'pilar') {
    const q = m.pilares.find((x) => x.id === alvo.id);
    if (!q) return `Pilar ${alvo.id} não existe.`;
    return null;
  }
  if (alvo.k === 'viga') {
    const v = m.vigas.find((x) => x.id === alvo.id);
    if (!v) return `Viga ${alvo.id} não existe.`;
    if (v.embutida) return `${v.nome} é embutida: ela acompanha a parede.`;
    if (v.arcos?.length) return `${v.nome} tem trechos curvos: alinhe a viga reta ou mova pelo comando de movimento.`;
    return null;
  }
  return 'Só pilares e vigas podem ser alinhados à referência.';
}

/** Translação (dx, dy) do alvo para ficar a `distancia` da referência, ou o motivo da recusa. */
export function translacaoDoAlinhamento(m: Modelo, ref: RefAlinh, alvo: RefAlinh, distancia = 0): { t: Pt } | { erro: string } {
  const e = erroDoAlvo(m, alvo);
  if (e) return { erro: e };
  const r = resolverRef(m, ref), a = resolverRef(m, alvo);
  if (!r) return { erro: 'A referência não existe mais ou é degenerada.' };
  if (!a) return { erro: 'A face ou o eixo escolhido não existe (seção circular não tem face plana: use o centro).' };
  const t = translacaoParaAlinhar(r, a, distancia);
  if (!t) {
    const nome = alvo.k === 'viga' ? m.vigas.find((x) => x.id === alvo.id)!.nome : alvo.k === 'pilar' ? m.pilares.find((x) => x.id === alvo.id)!.nome : '';
    return { erro: `${nome} não é paralelo à referência: alinhamento recusado.` };
  }
  return { t };
}

/** Translada o alvo no rascunho: pilar (x, y); viga reta (todos os pontos) ou, em polilinha, os dois vértices do trecho. */
export function transladarAlvo(d: Draft<BuildingModel>, alvo: RefAlinh, t: Pt): void {
  if (alvo.k === 'pilar') {
    const q = d.pilares.find((x) => x.id === alvo.id)!;
    q.x = r9(q.x + t[0]); q.y = r9(q.y + t[1]);
  } else if (alvo.k === 'viga') {
    const v = d.vigas.find((x) => x.id === alvo.id)!;
    const todos = v.pontos.length === 2;
    v.pontos = v.pontos.map((p, i) => (todos || i === alvo.trecho || i === alvo.trecho + 1 ? [r9(p[0] + t[0]), r9(p[1] + t[1])] as [number, number] : p));
  }
}

/** Adicionar `ref → alvo` formaria um ciclo de restrições (a referência já depende do alvo)? */
export function criaCiclo(rs: RestricaoAlinhamento[], ref: RefAlinh, alvo: RefAlinh): boolean {
  const alvoEl = elementoDe(alvo);
  const visto = new Set<string>();
  const sobe = (el: string): boolean => {
    if (el === alvoEl) return true;
    if (visto.has(el)) return false;
    visto.add(el);
    return rs.some((r) => elementoDe(r.alvo) === el && sobe(elementoDe(r.ref)));
  };
  return sobe(elementoDe(ref));
}

export const temRestricoes = (b: Pick<BuildingModel, 'restricoes'>) => !!b.restricoes?.length;

/** Cria (ou substitui a do mesmo alvo) a restrição no rascunho. */
export function travar(d: Draft<BuildingModel>, ref: RefAlinh, alvo: RefAlinh, distancia: number): string {
  const lista = (d.restricoes ??= []);
  const k = chaveAlvo(alvo);
  const antiga = lista.findIndex((r) => chaveAlvo(r.alvo as RefAlinh) === k);
  const id = antiga >= 0 ? lista[antiga].id : `al_${(++d.seq).toString(36)}`;
  const nova: RestricaoAlinhamento = { id, ref: JSON.parse(JSON.stringify(ref)), alvo: JSON.parse(JSON.stringify(alvo)), distancia: r9(distancia) };
  if (antiga >= 0) lista[antiga] = nova; else lista.push(nova);
  return id;
}

/** Remove a restrição do alvo (ou a de id dado); devolve quantas saíram. */
export function destravar(d: Draft<BuildingModel>, quem: { alvo?: RefAlinh; id?: string }): number {
  const n = d.restricoes?.length ?? 0;
  if (!n) return 0;
  const k = quem.alvo ? chaveAlvo(quem.alvo) : '';
  d.restricoes = d.restricoes!.filter((r) => !(quem.id ? r.id === quem.id : chaveAlvo(r.alvo as RefAlinh) === k));
  const sobra = d.restricoes.length;
  if (!sobra) delete d.restricoes;
  return n - sobra;
}

/**
 * Faz cumprir as restrições depois de um comando: o elemento travado volta a ficar à distância da referência (que pode ter
 * se movido). Restrições cujo elemento deixou de existir saem, com aviso; as que perderam o paralelismo ficam, com aviso.
 */
export function sincronizarRestricoes(d: Draft<BuildingModel>): string[] {
  const avisos: string[] = [];
  if (!d.restricoes?.length) return avisos;
  const m = d as unknown as BuildingModel;
  const nome = (a: RefAlinh) => (a.k === 'pilar' ? m.pilares.find((x) => x.id === a.id)?.nome : a.k === 'viga' ? m.vigas.find((x) => x.id === a.id)?.nome : a.k) ?? '?';
  // restrições órfãs
  const manter = d.restricoes.filter((r) => {
    const ok = !!resolverRef(m, r.ref as RefAlinh) && !erroDoAlvo(m, r.alvo as RefAlinh) && !!resolverRef(m, r.alvo as RefAlinh);
    if (!ok) avisos.push(`Trava de alinhamento de ${nome(r.alvo as RefAlinh)} removida: o elemento ou a referência não existe mais.`);
    return ok;
  });
  if (manter.length !== d.restricoes.length) { d.restricoes = manter; if (!manter.length) { delete d.restricoes; return avisos; } }
  const naoParalelas = new Set<string>();
  // cadeias (A segue B, B segue C): até n+1 passadas, na ordem de criação
  for (let passada = 0; passada <= d.restricoes.length; passada++) {
    let mudou = false;
    for (const r of d.restricoes) {
      const res = translacaoDoAlinhamento(m, r.ref as RefAlinh, r.alvo as RefAlinh, r.distancia);
      if ('erro' in res) { naoParalelas.add(r.id); continue; }
      naoParalelas.delete(r.id);
      if (Math.hypot(res.t[0], res.t[1]) <= TOL_MOVER) continue;
      transladarAlvo(d, r.alvo as RefAlinh, res.t);
      avisos.push(`${nome(r.alvo as RefAlinh)} acompanhou a referência travada (${(Math.round(res.t[0] * 1000) / 1000).toString().replace('.', ',')}; ${(Math.round(res.t[1] * 1000) / 1000).toString().replace('.', ',')} m).`);
      mudou = true;
    }
    if (!mudou) break;
  }
  for (const id of naoParalelas) { const r = d.restricoes.find((x) => x.id === id)!; avisos.push(`${nome(r.alvo as RefAlinh)} deixou de ser paralelo à referência: a trava não se aplica até voltar.`); }
  return [...new Set(avisos)];
}
