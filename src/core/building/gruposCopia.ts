// Cópia de conteúdo entre grupos de pavimentos, união de pavimentos, sugestão de grupos e áreas do grupo (L4).
// Funções puras sobre o modelo (ou o rascunho do immer, nas que mutam). Os comandos ficam em commands/grupos.ts.
import type { Draft } from 'immer';
import { areaPoligono } from '../geom/faces';
import { apoioDoPilar, nomeSobre } from './transicao';
import { contornosDoPP } from './pilarParede';
import { proximaViga } from './vigas';
import {
  centroNoLance, contornoPilar, ehArranque, geoLance, inicioDe, lancesDoPilar, pavimentosDoGrupo, pavimentosOrdenados, secaoNoLance,
  type BuildingModel, type Carga, type CargaPilar, type Laje, type Parede, type Pavimento, type Pilar, type Viga,
} from './types';

/** Tipos de conteúdo que a cópia entre grupos leva, na ordem que preserva as referências. */
export type TipoConteudo = 'pilares' | 'vigas' | 'lajes' | 'cargas' | 'paredes';
export const TIPOS_CONTEUDO: TipoConteudo[] = ['pilares', 'vigas', 'lajes', 'cargas', 'paredes'];
export const ROTULO_CONTEUDO: Record<TipoConteudo, string> = { pilares: 'Pilares', vigas: 'Vigas', lajes: 'Lajes', cargas: 'Cargas', paredes: 'Paredes' };
export type ModoCopia = 'substituir' | 'somar';
export type Contagem = Record<TipoConteudo, number>;
export interface ResumoCopia { criados: Contagem; ignorados: Contagem; removidos: Contagem; mapa: Record<string, string>; avisos: string[] }

const zero = (): Contagem => ({ pilares: 0, vigas: 0, lajes: 0, cargas: 0, paredes: 0 });
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const TOL = 0.01;
type Pt = [number, number];

/** Pavimento do grupo de origem que corresponde ao pavimento q do destino (mesma posição na ordem; sobrando, o último). */
const origemDe = (deP: Pavimento[], paraP: Pavimento[], q: string) => deP[Math.min(paraP.findIndex((x) => x.id === q), deP.length - 1)];

/** Pilares (de lance em pavimento do grupo), vigas, lajes, cargas e paredes que o grupo tem. */
export function conteudoDoGrupo(b: BuildingModel, grupo: string): Contagem {
  const ps = new Set(pavimentosDoGrupo(b, grupo).map((p) => p.id));
  const passa = (e: Pick<Pilar, 'nasce' | 'morre'>) => lancesDoPilar(b, e as Pilar).some((l) => ps.has(l.id));
  return {
    pilares: b.pilares.filter((p) => !ehArranque(p) && passa(p)).length,
    vigas: b.vigas.filter((v) => v.grupo === grupo).length,
    lajes: b.lajes.filter((l) => l.grupo === grupo).length,
    cargas: b.cargas.filter((c) => c.grupo === grupo).length + (b.cargasPilar ?? []).filter((c) => ps.has(c.pavimento)).length,
    paredes: (b.paredes ?? []).filter(passa).length,
  };
}

/** Trechos contíguos (na ordem geral dos pavimentos) do destino que o elemento cobre: só os pavimentos cuja origem ele atravessa e que ainda não estão ocupados. */
function trechos(ordem: Pavimento[], deP: Pavimento[], paraP: Pavimento[], atravessa: Set<string>, ocupados: Set<string>): Pavimento[][] {
  const out: Pavimento[][] = [];
  let atual: Pavimento[] = [], ult = -2;
  for (const q of paraP) {
    const i = ordem.findIndex((x) => x.id === q.id);
    if (!atravessa.has(origemDe(deP, paraP, q.id).id) || ocupados.has(q.id)) { if (atual.length) out.push(atual); atual = []; ult = -2; continue; }
    if (i !== ult + 1 && atual.length) { out.push(atual); atual = []; }
    atual.push(q); ult = i;
  }
  if (atual.length) out.push(atual);
  return out;
}

const proximoPilar = (b: BuildingModel) => Math.max(0, ...b.pilares.map((p) => { const m = /^P(\d+)$/.exec(p.nome); return m ? +m[1] : 0; })) + 1;
const proximaLaje = (b: BuildingModel, g: string) => Math.max(0, ...b.lajes.filter((l) => l.grupo === g).map((l) => { const m = /^L(\d+)$/.exec(l.nome); return m ? +m[1] : 0; })) + 1;
const proximaParede = (b: BuildingModel) => Math.max(0, ...(b.paredes ?? []).map((p) => { const m = /^PA(\d+)$/.exec(p.nome); return m ? +m[1] : 0; })) + 1;
const mesmosContornos = (a: Pt[], z: Pt[]) => a.length === z.length && a.every((p) => z.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= TOL));
const mesmaPolilinha = (a: Pt[], z: Pt[]) => a.length === z.length && a.every((p, i) => Math.hypot(p[0] - z[i][0], p[1] - z[i][1]) <= TOL);

/** Remapeia entradas por pavimento (lances) pelo mapa origem → destino; as sem destino saem. */
function remapear<T extends { pavimento: string }>(xs: T[] | undefined, mapa: Map<string, string>): T[] | undefined {
  const r = (xs ?? []).filter((e) => mapa.has(e.pavimento)).map((e) => ({ ...clone(e), pavimento: mapa.get(e.pavimento)! }));
  return r.length ? r : undefined;
}

/**
 * Copia o conteúdo do grupo `de` para o grupo `para` (C3.25), na ordem pilares, vigas, lajes, cargas e paredes. Os ids
 * novos saem de `d.seq` (replay determinístico). `substituir` apaga antes o que o destino tem dos tipos escolhidos
 * (pilares só os apoiados e contidos no grupo, para não arrancar fundação); `somar` ignora os elementos coincidentes.
 */
export function copiarConteudoGrupo(d: Draft<BuildingModel>, de: string, para: string, tipos: TipoConteudo[], modo: ModoCopia): ResumoCopia {
  const b = d as BuildingModel;
  const novoId = (pre: string) => `${pre}_${(++d.seq).toString(36)}`;
  const R: ResumoCopia = { criados: zero(), ignorados: zero(), removidos: zero(), mapa: {}, avisos: [] };
  const quer = (t: TipoConteudo) => tipos.includes(t);
  const deP = pavimentosDoGrupo(b, de), paraP = pavimentosDoGrupo(b, para);
  if (!deP.length || !paraP.length) return R;
  const paraIds = new Set(paraP.map((p) => p.id)), deIds = new Set(deP.map((p) => p.id));
  const ordem = pavimentosOrdenados(b);
  const dentroDestino = (e: Pick<Pilar, 'nasce' | 'morre'>) => { const ls = lancesDoPilar(b, e as Pilar); return ls.length > 0 && ls.every((l) => paraIds.has(l.id)); };

  // ---- substituir: apaga o que o destino tem dos tipos escolhidos ----
  if (modo === 'substituir') {
    if (quer('pilares')) {
      const sai = new Set(d.pilares.filter((p) => !ehArranque(p) && p.nasce !== 'fundacao' && dentroDestino(p)).map((p) => p.id));
      if (sai.size) {
        R.removidos.pilares = sai.size;
        d.pilares = d.pilares.filter((p) => !sai.has(p.id));
        if (d.cargasPilar) { d.cargasPilar = d.cargasPilar.filter((c) => !sai.has(c.pilar)); if (!d.cargasPilar.length) delete d.cargasPilar; }
      }
    }
    if (quer('vigas')) { R.removidos.vigas = d.vigas.filter((v) => v.grupo === para).length; d.vigas = d.vigas.filter((v) => v.grupo !== para); }
    if (quer('lajes')) {
      R.removidos.lajes = d.lajes.filter((l) => l.grupo === para).length; d.lajes = d.lajes.filter((l) => l.grupo !== para);
      if (d.zonasLaje) { d.zonasLaje = d.zonasLaje.filter((z) => z.grupo !== para); if (!d.zonasLaje.length) delete d.zonasLaje; }
      if (d.linhasDobra) { d.linhasDobra = d.linhasDobra.filter((z) => z.grupo !== para); if (!d.linhasDobra.length) delete d.linhasDobra; }
    }
    if (quer('cargas')) {
      R.removidos.cargas = d.cargas.filter((c) => c.grupo === para).length; d.cargas = d.cargas.filter((c) => c.grupo !== para);
      if (d.cargasPilar) {
        const n0 = d.cargasPilar.length;
        d.cargasPilar = d.cargasPilar.filter((c) => !paraIds.has(c.pavimento));
        R.removidos.cargas += n0 - d.cargasPilar.length;
        if (!d.cargasPilar.length) delete d.cargasPilar;
      }
    }
    if (quer('paredes') && d.paredes) {
      const sai = new Set(d.paredes.filter((p) => p.nasce !== 'fundacao' && dentroDestino(p)).map((p) => p.id));
      R.removidos.paredes = sai.size;
      d.paredes = d.paredes.filter((p) => !sai.has(p.id));
      for (const v of d.vigas) if (v.embutida && sai.has(v.embutida)) delete v.embutida;
      if (!d.paredes.length) delete d.paredes;
    }
  }

  // ---- pilares ----
  const novosDe = new Map<string, string[]>(); // pilar de origem → cópias criadas
  if (quer('pilares')) {
    const fonte = clone(b.pilares.filter((p) => !ehArranque(p) && lancesDoPilar(b, p).some((l) => deIds.has(l.id))));
    for (const src of fonte) {
      const atravessa = new Set(lancesDoPilar(b, src).map((l) => l.id).filter((id) => deIds.has(id)));
      const ocupados = new Set<string>();
      for (const q of paraP) {
        const o = origemDe(deP, paraP, q.id);
        if (!atravessa.has(o.id)) continue;
        const c0 = centroNoLance(src, o.id);
        for (const e of d.pilares) {
          const l = lancesDoPilar(b, e).some((x) => x.id === q.id) ? q.id : undefined;
          if (l && Math.hypot(centroNoLance(e as Pilar, l)[0] - c0[0], centroNoLance(e as Pilar, l)[1] - c0[1]) <= TOL) { ocupados.add(q.id); break; }
        }
      }
      const runs = trechos(ordem, deP, paraP, atravessa, ocupados);
      if (!runs.length) { R.ignorados.pilares++; continue; }
      if (ocupados.size) R.avisos.push(`${src.nome}: já existe pilar coincidente em parte dos pavimentos do destino; copiado só nos pavimentos livres.`);
      for (const run of runs) {
        const mapa = new Map<string, string>(); // pavimento de origem → pavimento do destino, só neste trecho
        for (const q of run) { const o = origemDe(deP, paraP, q.id).id; if (!mapa.has(o)) mapa.set(o, q.id); }
        const base = origemDe(deP, paraP, run[0].id).id;
        const g = geoLance(src, base);
        const dx0 = src.secoes?.find((s) => s.pavimento === base)?.dx ?? 0, dy0 = src.secoes?.find((s) => s.pavimento === base)?.dy ?? 0;
        const i0 = ordem.findIndex((x) => x.id === run[0].id);
        const novo: Pilar = { ...clone(src), id: novoId('p'), nome: '?', x: g.p.x, y: g.p.y, angulo: g.p.angulo, ajuste: g.p.ajuste, secao: clone(secaoNoLance(src, base)),
          nasce: i0 > 0 ? ordem[i0 - 1].id : 'fundacao', morre: run.at(-1)!.id };
        for (const k of ['armaduras', 'detalhe', 'origemLancamento', 'inicio', 'vinculoBase', 'cotaBase', 'secoes', 'fck', 'engastes', 'flambagem', 'apoiosIntermediarios'] as const) delete novo[k];
        const secs = (src.secoes ?? []).filter((s) => mapa.has(s.pavimento)).map((s) => {
          const e = { ...clone(s), pavimento: mapa.get(s.pavimento)! };
          if (e.dx !== undefined || e.dy !== undefined || dx0 || dy0) { const ex = +((e.dx ?? 0) - dx0).toFixed(9), ey = +((e.dy ?? 0) - dy0).toFixed(9); if (ex) e.dx = ex; else delete e.dx; if (ey) e.dy = ey; else delete e.dy; }
          return e;
        });
        if (secs.length) novo.secoes = secs;
        const fck = remapear(src.fck, mapa); if (fck) novo.fck = fck;
        const eng = remapear(src.engastes, mapa); if (eng) novo.engastes = eng;
        const fla = remapear(src.flambagem, mapa); if (fla) novo.flambagem = fla;
        const api = remapear(src.apoiosIntermediarios, mapa); if (api) novo.apoiosIntermediarios = api;
        if (novo.nasce === 'fundacao') { if (src.vinculoBase) novo.vinculoBase = clone(src.vinculoBase); if (src.cotaBase !== undefined) novo.cotaBase = src.cotaBase; }
        else if (src.inicio === 'fundacao' && src.nasce === 'fundacao') { /* a cópia acima da fundação nasce apoiada */ }
        const ap = inicioDe(novo) === 'apoiado' && novo.nasce !== 'fundacao' ? apoioDoPilar(b, novo) : null;
        const baixo = ap?.tipo === 'pilar' ? b.pilares.find((q) => q.id === ap.principal) : undefined;
        novo.nome = baixo ? nomeSobre(b, baixo) : `P${proximoPilar(b)}`;
        d.pilares.push(novo);
        R.criados.pilares++;
        (novosDe.get(src.id) ?? novosDe.set(src.id, []).get(src.id)!).push(novo.id);
        if (!R.mapa[src.id]) R.mapa[src.id] = novo.id;
        // cargas do pilar nos lances copiados (com as horizontais e as do topo)
        if (quer('cargas')) for (const c of b.cargasPilar ?? []) {
          if (c.pilar !== src.id || !mapa.has(c.pavimento)) continue;
          (d.cargasPilar ??= []).push({ ...clone(c), id: novoId('cp'), pilar: novo.id, pavimento: mapa.get(c.pavimento)! } as CargaPilar);
          R.criados.cargas++;
        }
      }
    }
  }

  // ---- paredes ----
  const paredesNovas = new Map<string, string>();
  if (quer('paredes')) {
    const fonte = clone((b.paredes ?? []).filter((p) => lancesDoPilar(b, p as unknown as Pilar).some((l) => deIds.has(l.id))));
    for (const src of fonte) {
      const atravessa = new Set(lancesDoPilar(b, src as unknown as Pilar).map((l) => l.id).filter((id) => deIds.has(id)));
      const ocupados = new Set<string>();
      for (const q of paraP) {
        if (!atravessa.has(origemDe(deP, paraP, q.id).id)) continue;
        if ((d.paredes ?? []).some((e) => mesmaPolilinha(e.pontos as Pt[], src.pontos as Pt[]) && lancesDoPilar(b, e as unknown as Pilar).some((x) => x.id === q.id))) ocupados.add(q.id);
      }
      const runs = trechos(ordem, deP, paraP, atravessa, ocupados);
      if (!runs.length) { R.ignorados.paredes++; continue; }
      for (const run of runs) {
        const mapa = new Map<string, string>();
        for (const q of run) { const o = origemDe(deP, paraP, q.id).id; if (!mapa.has(o)) mapa.set(o, q.id); }
        const i0 = ordem.findIndex((x) => x.id === run[0].id);
        const nova: Parede = { ...clone(src), id: novoId('pa'), nome: `PA${proximaParede(b)}`, nasce: i0 > 0 ? ordem[i0 - 1].id : 'fundacao', morre: run.at(-1)!.id };
        for (const k of ['armaduras', 'emendas', 'porPavimento', 'aberturas'] as const) delete nova[k];
        const pp = remapear(src.porPavimento, mapa); if (pp) nova.porPavimento = pp;
        const ab = remapear(src.aberturas, mapa); if (ab) nova.aberturas = ab;
        if (nova.nasce !== 'fundacao') delete nova.base;
        (d.paredes ??= []).push(nova);
        R.criados.paredes++;
        paredesNovas.set(src.id, nova.id);
        if (!R.mapa[src.id]) R.mapa[src.id] = nova.id;
      }
    }
    if (!R.criados.paredes && !R.ignorados.paredes && !fonte.length) { /* nada a copiar */ }
  }
  if (quer('paredes') && (b.pilaresParede ?? []).some((p) => lancesDoPilar(b, p as unknown as Pilar).some((l) => deIds.has(l.id)))) R.avisos.push('Pilares-parede do grupo de origem não são copiados (lance-os no destino).');

  // ---- vigas ----
  const vigasNovas = new Map<string, string>();
  if (quer('vigas')) {
    for (const src of clone(d.vigas.filter((v) => v.grupo === de))) {
      if (modo === 'somar' && d.vigas.some((w) => w.grupo === para && mesmaPolilinha(w.pontos as Pt[], src.pontos as Pt[]) && w.secao.b === src.secao.b && w.secao.h === src.secao.h)) { R.ignorados.vigas++; continue; }
      const nova: Viga = { ...src, id: novoId('v'), grupo: para, nome: `V${proximaViga(b, para)}` };
      delete nova.origemLancamento;
      if (src.articulacoes) {
        const a = src.articulacoes.map((id) => novosDe.get(id)?.[0] ?? (d.pilares.some((p) => p.id === id) ? id : undefined)).filter((x): x is string => !!x);
        if (a.length) nova.articulacoes = a; else delete nova.articulacoes;
      }
      if (src.embutida) { const pa = paredesNovas.get(src.embutida); if (pa) nova.embutida = pa; else delete nova.embutida; }
      d.vigas.push(nova);
      R.criados.vigas++; vigasNovas.set(src.id, nova.id); R.mapa[src.id] = nova.id;
    }
  }

  // ---- lajes (com zonas e linhas de dobra) ----
  if (quer('lajes')) {
    for (const src of clone(d.lajes.filter((l) => l.grupo === de))) {
      if (modo === 'somar' && d.lajes.some((l) => l.grupo === para && mesmosContornos(l.contorno as Pt[], src.contorno as Pt[]))) { R.ignorados.lajes++; continue; }
      const nova: Laje = { ...src, id: novoId('l'), grupo: para, nome: `L${proximaLaje(b, para)}` };
      delete nova.origemLancamento;
      if (src.puncao) {
        const pu = src.puncao.map((g) => ({ ...g, id: novoId('pu'), ...(g.pilar ? { pilar: novosDe.get(g.pilar)?.[0] ?? (d.pilares.some((p) => p.id === g.pilar) ? g.pilar : undefined) } : {}) })).filter((g) => g.pilar || g.ponto);
        if (pu.length) nova.puncao = pu; else delete nova.puncao;
      }
      d.lajes.push(nova);
      R.criados.lajes++; R.mapa[src.id] = nova.id;
    }
    if (R.criados.lajes || modo === 'substituir') {
      const zs = (d.zonasLaje ?? []).filter((z) => z.grupo === de), ls = (d.linhasDobra ?? []).filter((z) => z.grupo === de);
      const zjs = new Set((d.zonasLaje ?? []).filter((z) => z.grupo === para).map((z) => JSON.stringify([z.forma, z.pontos, z.largura, z.face, z.angulo])));
      for (const z of clone(zs)) if (!zjs.has(JSON.stringify([z.forma, z.pontos, z.largura, z.face, z.angulo]))) (d.zonasLaje ??= []).push({ ...z, id: novoId('zu'), grupo: para });
      const ljs = new Set((d.linhasDobra ?? []).filter((z) => z.grupo === para).map((z) => JSON.stringify([z.a, z.z])));
      for (const z of clone(ls)) if (!ljs.has(JSON.stringify([z.a, z.z]))) (d.linhasDobra ??= []).push({ ...z, id: novoId('ld'), grupo: para });
    }
  }

  // ---- cargas do grupo ----
  if (quer('cargas')) {
    for (const src of clone(d.cargas.filter((c) => c.grupo === de))) {
      if (modo === 'somar' && d.cargas.some((c) => c.grupo === para && c.tipo === src.tipo && c.caso === src.caso && c.valor === src.valor && JSON.stringify(c.pontos) === JSON.stringify(src.pontos))) { R.ignorados.cargas++; continue; }
      const nova: Carga = { ...src, id: novoId('c'), grupo: para };
      d.cargas.push(nova);
      R.criados.cargas++; R.mapa[src.id] = nova.id;
    }
  }
  return R;
}

/** Texto curto do resumo de uma cópia, para a barra de status. */
export function textoResumoCopia(r: ResumoCopia): string {
  const lista = (c: Contagem) => TIPOS_CONTEUDO.filter((t) => c[t]).map((t) => `${c[t]} ${ROTULO_CONTEUDO[t].toLowerCase()}`).join(', ');
  const partes = [lista(r.criados) ? `copiados: ${lista(r.criados)}` : 'nada copiado'];
  if (lista(r.ignorados)) partes.push(`já existiam: ${lista(r.ignorados)}`);
  if (lista(r.removidos)) partes.push(`removidos do destino: ${lista(r.removidos)}`);
  return `${partes.join('; ')}.${r.avisos.length ? ` ${r.avisos.join(' ')}` : ''}`;
}

// ---------------- unir pavimentos num grupo (C3.22) ----------------

export interface ResumoUniao { grupo: string; grupoNovo: boolean; movidos: string[]; gruposEsvaziados: { id: string; nome: string; conteudo: Contagem }[] }

/** O que `pavimento.unir` faz: grupo de destino, pavimentos que mudam e grupos que esvaziam (com a contagem do que se perde). */
export function resumoUniao(b: BuildingModel, ids: string[], grupo?: string): ResumoUniao | null {
  const pavs = ids.map((id) => b.pavimentos.find((p) => p.id === id));
  if (pavs.some((p) => !p)) return null;
  const ordem = (pavs as Pavimento[]).sort((a, z) => a.cota - z.cota);
  const alvo = grupo ?? ordem[0]?.grupo;
  if (!alvo || !b.grupos.some((g) => g.id === alvo)) return null;
  const movidos = ordem.filter((p) => p.grupo !== alvo).map((p) => p.id);
  const sai = new Set(movidos);
  const origens = [...new Set(ordem.filter((p) => p.grupo !== alvo).map((p) => p.grupo))];
  const esvazia = origens.filter((g) => b.pavimentos.every((p) => p.grupo !== g || sai.has(p.id)));
  return { grupo: alvo, grupoNovo: false, movidos, gruposEsvaziados: esvazia.map((g) => ({ id: g, nome: b.grupos.find((x) => x.id === g)?.nome ?? g, conteudo: conteudoDoGrupo(b, g) })) };
}

// ---------------- sugestão de grupos (C3.7) ----------------

export interface QuebraGrupo { codigo: 'GRUPO_QUEBRA'; entre: [string, string]; motivo: string; elementos: string[] }
export interface JuncaoGrupo { codigo: 'GRUPO_JUNCAO'; pavimentos: string[]; grupos: string[]; motivo: string }
export interface SugestaoGrupos { grupos: { pavimentos: string[]; atuais: string[] }[]; quebras: QuebraGrupo[]; juncoes: JuncaoGrupo[] }

/** Elementos verticais (pilares, pilares-parede e paredes) que chegam ao pavimento (têm lance que termina nele). */
function verticaisNoPavimento(b: BuildingModel, pav: string): { id: string; nome: string }[] {
  const chega = (e: { id: string; nome: string; nasce: string; morre: string }) => (e.nasce === 'fundacao' && e.morre === 'fundacao' ? false : lancesDoPilar(b, e as unknown as Pilar).some((l) => l.id === pav));
  return [...b.pilares, ...(b.pilaresParede ?? []), ...(b.paredes ?? [])].filter(chega).map((e) => ({ id: e.id, nome: e.nome }));
}

/** Os dois grupos têm a mesma planta (vigas, lajes e dados do grupo)? */
export function plantasIguais(b: BuildingModel, g1: string, g2: string): boolean {
  const a = b.grupos.find((g) => g.id === g1), z = b.grupos.find((g) => g.id === g2);
  if (!a || !z || a.uso !== z.uso || a.q !== z.q || a.gRev !== z.gRev) return false;
  const v1 = b.vigas.filter((v) => v.grupo === g1), v2 = b.vigas.filter((v) => v.grupo === g2);
  const l1 = b.lajes.filter((l) => l.grupo === g1), l2 = b.lajes.filter((l) => l.grupo === g2);
  if (v1.length !== v2.length || l1.length !== l2.length) return false;
  return v1.every((v) => v2.some((w) => mesmaPolilinha(w.pontos as Pt[], v.pontos as Pt[]) && w.secao.b === v.secao.b && w.secao.h === v.secao.h))
    && l1.every((l) => l2.some((m) => mesmosContornos(m.contorno as Pt[], l.contorno as Pt[]) && JSON.stringify(m.tipo) === JSON.stringify(l.tipo)));
}

/**
 * Sugere onde separar e onde juntar grupos: só é preciso separar onde um elemento vertical (pilar, pilar-parede, parede)
 * nasce ou morre entre dois pavimentos consecutivos (viga inclinada: não modelada, fica de fora). Quebra: pavimentos de
 * um mesmo grupo com elementos verticais diferentes. Junção: pavimentos consecutivos de grupos distintos, com os mesmos
 * elementos verticais e a mesma planta.
 */
export function sugerirGrupos(b: BuildingModel): SugestaoGrupos {
  const ps = pavimentosOrdenados(b);
  const assin = ps.map((p) => verticaisNoPavimento(b, p.id));
  const chave = (i: number) => assin[i].map((x) => x.id).sort().join('|');
  const quebras: QuebraGrupo[] = [], juncoes: JuncaoGrupo[] = [];
  const cortes: boolean[] = []; // corte entre i e i+1
  for (let i = 0; i + 1 < ps.length; i++) {
    const iguais = chave(i) === chave(i + 1);
    const novos = assin[i + 1].filter((x) => !assin[i].some((y) => y.id === x.id)), somem = assin[i].filter((x) => !assin[i + 1].some((y) => y.id === x.id));
    cortes.push(!iguais);
    if (ps[i].grupo === ps[i + 1].grupo && !iguais) {
      quebras.push({ codigo: 'GRUPO_QUEBRA', entre: [ps[i].id, ps[i + 1].id], elementos: [...novos, ...somem].map((x) => x.id),
        motivo: `${somem.length ? `${somem.map((x) => x.nome).join(', ')} morre(m) em ${ps[i].nome}` : ''}${somem.length && novos.length ? '; ' : ''}${novos.length ? `${novos.map((x) => x.nome).join(', ')} nasce(m) acima de ${ps[i].nome}` : ''}: separe ${ps[i].nome} e ${ps[i + 1].nome} em grupos diferentes.` });
    } else if (ps[i].grupo !== ps[i + 1].grupo && iguais && plantasIguais(b, ps[i].grupo, ps[i + 1].grupo)) {
      juncoes.push({ codigo: 'GRUPO_JUNCAO', pavimentos: [ps[i].id, ps[i + 1].id], grupos: [ps[i].grupo, ps[i + 1].grupo], motivo: `${ps[i].nome} e ${ps[i + 1].nome} têm os mesmos elementos verticais e a mesma planta: podem formar um grupo.` });
    }
  }
  const grupos: SugestaoGrupos['grupos'] = [];
  let atual: Pavimento[] = [];
  ps.forEach((p, i) => { atual.push(p); if (i === ps.length - 1 || cortes[i]) { grupos.push({ pavimentos: atual.map((x) => x.id), atuais: [...new Set(atual.map((x) => x.grupo))] }); atual = []; } });
  return { grupos, quebras, juncoes };
}

// ---------------- áreas do grupo (C3.27) ----------------

export interface AreasGrupo {
  /** Pavimentos do grupo (as áreas valem para a planta de um pavimento; `totalGrupo` multiplica pelo número deles). */
  pavimentos: number;
  lajes: number; vigas: number; pilares: number; muros: number;
  /** Soma de lajes, vigas, pilares e muros da planta de um pavimento (m²). */
  total: number;
  totalGrupo: number;
}

/** Áreas da planta do grupo (m²): lajes (descontados os furos), vigas (comprimento × largura), pilares e pilares-parede que chegam ao pavimento e paredes. */
export function areasDoGrupo(b: BuildingModel, grupo: string): AreasGrupo {
  const ps = pavimentosDoGrupo(b, grupo);
  const n = ps.length, ref = ps[0];
  const lajes = b.lajes.filter((l) => l.grupo === grupo).reduce((s, l) => s + Math.abs(areaPoligono(l.contorno as Pt[])) - (l.furos ?? []).reduce((t, f) => t + Math.abs(areaPoligono(f as Pt[])), 0), 0);
  const vigas = b.vigas.filter((v) => v.grupo === grupo).reduce((s, v) => s + v.pontos.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - v.pontos[i][0], p[1] - v.pontos[i][1]), 0) * v.secao.b, 0);
  let pilares = 0, muros = 0;
  if (ref) {
    for (const p of b.pilares) {
      if (ehArranque(p)) continue;
      const l = lancesDoPilar(b, p).find((x) => x.id === ref.id);
      if (!l) continue;
      const g = geoLance(p, l.id);
      pilares += Math.abs(areaPoligono(contornoPilar(g.p, g.secao) as Pt[]));
    }
    for (const pp of b.pilaresParede ?? []) {
      if (!lancesDoPilar(b, pp as unknown as Pilar).some((x) => x.id === ref.id)) continue;
      for (const c of contornosDoPP(b, pp, ref.id)) pilares += Math.abs(areaPoligono(c as Pt[]));
    }
    for (const pa of b.paredes ?? []) {
      if (pa.tipo === 'alvenaria' || !lancesDoPilar(b, pa as unknown as Pilar).some((x) => x.id === ref.id)) continue;
      const e = pa.porPavimento?.find((x) => x.pavimento === ref.id) ?? pa;
      const comp = pa.pontos.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - pa.pontos[i][0], p[1] - pa.pontos[i][1]), 0);
      muros += comp * (e.esq + e.dir);
    }
  }
  const total = lajes + vigas + pilares + muros;
  return { pavimentos: n, lajes, vigas, pilares, muros, total, totalGrupo: total * n };
}
