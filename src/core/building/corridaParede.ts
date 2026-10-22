// Sapata corrida de paredes e muros (frente FU, fatia FU7b): vínculo entre a sapata corrida e a parede de concreto (E1c),
// sapata derivada da base da parede (`Parede.base`) e cargas por metro tiradas das reações da base na análise.
// - `corridasEfetivas`: as sapatas corridas do cálculo. As lançadas (FU7a) com `parede` seguem o eixo e a espessura da
//   parede; a parede com `base.tipo = 'sapataCorrida'` e sem sapata lançada ganha uma sapata derivada (`virtual`).
// - `cargasLinearesDaParede` e `cargasDosPilaresSobEixo`: reações dos nós da base da parede (casca) e dos pilares que nascem
//   na fundação sobre o eixo, distribuídas nas janelas ao longo do eixo (kN/m), com o momento fora do plano (kN·m/m) e o
//   cortante normal à parede (kN/m); o pilar espalha a carga pelo lado da sapata isolada equivalente (C5.28).
// Folha de dependências: só tipos e `paredesBase`/`geom` (o cálculo da sapata está em `sapataCorrida.ts`).
import type { Draft } from 'immer';
import type { AnaliseEdificio } from './analitico';
import { niveisDaParede } from './paredesBase';
import { centroPilar, contornoPilar, deslocarPolilinha, FUNDACAO_VAZIA, secaoNoLance, lancesDoPilar, type BuildingModel, type Parede, type Pilar, type SapataCorrida } from './types';
import { dentroPoligono, type P } from '../geom/faces';

/** Sapata corrida do cálculo: a lançada (com o eixo da parede, se vinculada) ou a derivada da base da parede. */
export type CorridaEfetiva = SapataCorrida & {
  /** Derivada de `Parede.base` (nenhuma sapata lançada para a parede): somente leitura; edite com `parede.sapata`. */
  virtual?: boolean;
  /** A parede vinculada não existe mais (a sapata voltou a ser independente). */
  orfa?: boolean;
};

/** Espessuras à esquerda e à direita do eixo no primeiro lance (a base) da parede (m). */
export function espessuraBaseParede(b: BuildingModel, w: Parede): { esq: number; dir: number } {
  const pav = niveisDaParede(b, w).topos[0];
  const e = pav ? w.porPavimento?.find((x) => x.pavimento === pav) : undefined;
  return { esq: e?.esq ?? w.esq, dir: e?.dir ?? w.dir };
}

/** Eixo da sapata sob a parede: o eixo do corpo da parede (a polilinha deslocada de (esq − dir)/2) e a largura total no primeiro lance. */
export function eixoDaBaseParede(b: BuildingModel, w: Parede): { pontos: [number, number][]; bw: number } {
  const t = espessuraBaseParede(b, w), d = (t.esq - t.dir) / 2;
  return { pontos: Math.abs(d) < 1e-9 ? w.pontos.map((p) => [p[0], p[1]] as [number, number]) : deslocarPolilinha(w.pontos as [number, number][], d), bw: Math.max(0.05, t.esq + t.dir) };
}

/** A parede nasce na fundação (única que tem base na fundação)? */
export const paredeNaFundacao = (w: Pick<Parede, 'nasce'>) => w.nasce === 'fundacao';

const memo = new WeakMap<BuildingModel, CorridaEfetiva[]>();

/**
 * Sapatas corridas do cálculo (em cache por modelo): as lançadas, com eixo e largura do apoio da parede quando
 * vinculadas (`parede`), e as derivadas das paredes com `base.tipo = 'sapataCorrida'` que não têm sapata lançada.
 */
export function corridasEfetivas(b: BuildingModel): CorridaEfetiva[] {
  let r = memo.get(b);
  if (r) return r;
  const out: CorridaEfetiva[] = [];
  const ligadas = new Set<string>();
  for (const c of b.fundacao?.corridas ?? []) {
    const w = c.parede ? b.paredes?.find((x) => x.id === c.parede) : undefined;
    if (c.parede && !w) { const { parede: _p, ...resto } = c; void _p; out.push({ ...resto, orfa: true }); continue; }
    if (!w) { out.push(c); continue; }
    ligadas.add(w.id);
    const e = eixoDaBaseParede(b, w);
    out.push({ ...c, pontos: e.pontos, bw: e.bw });
  }
  for (const w of b.paredes ?? []) {
    if (ligadas.has(w.id) || w.base?.tipo !== 'sapataCorrida' || !paredeNaFundacao(w)) continue;
    const e = eixoDaBaseParede(b, w);
    out.push({
      id: `scv_${w.id}`, nome: `SC-${w.nome}`, pontos: e.pontos, aba: 'ambas', bw: e.bw, parede: w.id, virtual: true,
      ...(w.base.largura !== undefined ? { B: w.base.largura } : {}), ...(w.base.altura !== undefined ? { h: w.base.altura } : {}),
    });
  }
  memo.set(b, out);
  return out;
}

/** O modelo tem parede com base em sapata corrida ou sapata corrida vinculada a parede (precisa do passo de sincronização)? */
export const temBasesDeParede = (b: BuildingModel) => !!b.paredes?.some((w) => w.base?.tipo === 'sapataCorrida') || !!b.fundacao?.corridas?.some((c) => c.parede);

const igualPts = (a: [number, number][], z: [number, number][]) => a.length === z.length && a.every((p, i) => Math.abs(p[0] - z[i][0]) < 1e-6 && Math.abs(p[1] - z[i][1]) < 1e-6);

/**
 * Mantém as sapatas corridas de parede em dia com as paredes, no mesmo passo de qualquer comando (desfazer devolve tudo):
 * parede com `base.tipo = 'sapataCorrida'` que nasce na fundação e não tem sapata ganha uma (SC-M1, aba nas duas faces, B e h
 * da base); a sapata vinculada segue o eixo e a espessura da parede; some com a parede ou quando a base da parede deixa de ser
 * sapata corrida. Devolve uma frase por sapata criada ou removida.
 */
export function sincronizarBases(d: Draft<BuildingModel>): string[] {
  const b = d as BuildingModel, msgs: string[] = [], paredes = d.paredes ?? [];
  const f = d.fundacao;
  if (f?.corridas?.length) {
    const fica = f.corridas.filter((c) => {
      if (!c.parede) return true;
      const w = paredes.find((x) => x.id === c.parede);
      const sai = !w ? `a parede vinculada foi removida` : w.base?.tipo !== 'sapataCorrida' || !paredeNaFundacao(w) ? `a parede ${w.nome} não tem mais a base em sapata corrida` : '';
      if (sai) msgs.push(`Sapata corrida ${c.nome} removida: ${sai}.`);
      return !sai;
    });
    if (fica.length !== f.corridas.length) { f.corridas = fica; if (!fica.length) delete f.corridas; }
  }
  for (const w of paredes) {
    if (w.base?.tipo !== 'sapataCorrida' || !paredeNaFundacao(w)) continue;
    const e = eixoDaBaseParede(b, w as unknown as Parede), pts = e.pontos.map((q) => [+q[0].toFixed(6), +q[1].toFixed(6)] as [number, number]);
    const c = d.fundacao?.corridas?.find((x) => x.parede === w.id);
    if (!c) {
      const fe = (d.fundacao ??= FUNDACAO_VAZIA());
      (fe.corridas ??= []).push({ id: `sc_${(++d.seq).toString(36)}`, nome: `SC-${w.nome}`, pontos: pts, aba: 'ambas', bw: +e.bw.toFixed(6), parede: w.id, ...(w.base.largura !== undefined ? { B: w.base.largura } : {}), ...(w.base.altura !== undefined ? { h: w.base.altura } : {}) });
      msgs.push(`Sapata corrida SC-${w.nome} criada sob a parede ${w.nome}.`);
    } else {
      if (!igualPts(c.pontos, pts)) c.pontos = pts;
      if (Math.abs(c.bw - e.bw) > 1e-6) c.bw = +e.bw.toFixed(6);
    }
  }
  return msgs;
}

/** Há sapata corrida a calcular (lançada ou derivada da base de parede)? */
export const temCorridas = (b: BuildingModel) => corridasEfetivas(b).length > 0;

// ---------------------------------------------------------------- cargas por metro

const direcaoEm = (pts: P[], s: number): P => {
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + L + 1e-9 || i + 2 === pts.length) return L > 0 ? [(pts[i + 1][0] - pts[i][0]) / L, (pts[i + 1][1] - pts[i][1]) / L] : [1, 0];
    acc += L;
  }
  return [1, 0];
};

const projecao = (pts: P[], p: P): { d: number; s: number } => {
  let melhor = { d: Infinity, s: 0 }, s0 = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy, L = Math.sqrt(L2);
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
    const d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    if (d < melhor.d - 1e-12) melhor = { d, s: s0 + t * L };
    s0 += L;
  }
  return melhor;
};

/** Pilares que nascem na fundação com o centro (ou a seção) sobre o eixo da sapata corrida da parede. */
export function pilaresSobEixo(b: BuildingModel, pontos: P[], bw: number): Pilar[] {
  const out: Pilar[] = [];
  for (const p of b.pilares) {
    if (p.nasce !== 'fundacao') continue;
    const l = lancesDoPilar(b, p)[0], sec = l ? secaoNoLance(p, l.id) : p.secao, ct = centroPilar(p, sec);
    const pr = projecao(pontos, ct);
    if (pr.d <= bw / 2 + 0.05 || dentroPoligono(ct, contornoPilar(p, sec))) out.push(p);
  }
  return out;
}

/**
 * Espalha as cargas de pontos do eixo em `nJan` janelas de `wj` metros, cada uma pela célula do seu ponto (Voronoi 1D: até
 * a metade da distância aos vizinhos, limitada a [0, L]) ou, com `larg`, por um comprimento dado centrado no ponto (deslocado
 * para caber em [0, L]); devolve kN/m por janela. A soma ponderada pelo comprimento (valor × wj) conserva a carga.
 */
function espalhar(itens: { s: number; v: number; larg?: number }[], L: number, nJan: number, wj: number): number[] {
  const out = new Array<number>(nJan).fill(0);
  if (!itens.length) return out;
  const ss = [...new Set(itens.filter((x) => x.larg === undefined).map((x) => +x.s.toFixed(6)))].sort((a, z) => a - z);
  const meia = (i: number, lado: -1 | 1) => { const j = i + lado; return j < 0 || j >= ss.length ? (ss.length > 1 ? Math.abs(ss[Math.min(ss.length - 1, Math.max(0, i - lado))] - ss[i]) / 2 : 0) : Math.abs(ss[j] - ss[i]) / 2; };
  for (const it of itens) {
    let lo: number, hi: number;
    if (it.larg !== undefined) { const l = Math.min(L, Math.max(it.larg, 0)); lo = Math.min(Math.max(0, it.s - l / 2), L - l); hi = lo + l; }
    else { const i = ss.indexOf(+it.s.toFixed(6)); lo = Math.max(0, ss[i] - meia(i, -1)); hi = Math.min(L, ss[i] + meia(i, 1)); }
    if (hi - lo < 1e-9) { out[Math.min(nJan - 1, Math.max(0, Math.floor(it.s / wj)))] += it.v / wj; continue; }
    for (let j = 0; j < nJan; j++) {
      const ov = Math.max(0, Math.min(hi, (j + 1) * wj) - Math.max(lo, j * wj));
      if (ov > 0) out[j] += (it.v * (ov / (hi - lo))) / wj;
    }
  }
  return out;
}

type Item = { s: number; N: number; M: number; H: number; larg?: number };

/** Acumulador de cargas por caso e janela. */
function acumulador(L: number, nJan: number, wj: number) {
  const N = new Map<string, number[]>(), M = new Map<string, number[]>(), H = new Map<string, number[]>();
  let total = 0;
  const soma = (mp: Map<string, number[]>, caso: string, v: number[]) => { const a = mp.get(caso); mp.set(caso, a ? a.map((x, j) => x + v[j]) : v); };
  return {
    N, M, H, get total() { return total; },
    add(caso: string, itens: Item[]) {
      if (!itens.length) return;
      soma(N, caso, espalhar(itens.map((i) => ({ s: i.s, v: i.N, larg: i.larg })), L, nJan, wj));
      soma(M, caso, espalhar(itens.map((i) => ({ s: i.s, v: i.M, larg: i.larg })), L, nJan, wj));
      soma(H, caso, espalhar(itens.map((i) => ({ s: i.s, v: i.H, larg: i.larg })), L, nJan, wj));
      total += itens.reduce((t, i) => t + i.N, 0);
    },
  };
}

/** Cargas por janela ao longo do eixo (cada array tem uma posição por janela), por caso. */
export interface CargasLinhaParede {
  /** Normal (kN/m), momento fora do plano da parede (kN·m/m, em torno do eixo) e cortante normal à parede (kN/m). */
  N: Map<string, number[]>; M: Map<string, number[]>; H: Map<string, number[]>;
  /** Soma das normais por caso (kN) e mensagens (sem reações da base). */
  total: number; avisos: string[];
}

/**
 * Cargas por metro da parede `w` na sapata corrida de eixo `pontos`: reações dos nós da base na análise, por caso (G, Q,
 * adicionais e vento), em janelas de `wj` metros. Momento em torno do eixo e cortante normal à parede somados com o sinal do
 * modelo (o sinal vale só dentro de uma combinação; a verificação usa o módulo).
 */
export function cargasLinearesDaParede(b: BuildingModel, an: AnaliseEdificio, w: Parede, pontos: P[], L: number, nJan: number, wj: number): CargasLinhaParede {
  const ac = acumulador(L, nJan, wj), avisos: string[] = [];
  void b;
  const nos = an.paredes?.base?.[w.id] ?? [], res = an.portico.res, md = an.portico.modelo;
  if (!nos.length || !res) avisos.push(`a parede ${w.nome} não tem reações na base da análise (calcule a estrutura; só paredes que nascem na fundação transmitem a carga da base)`);
  else {
    const casosV = an.vento?.casos ?? [], resV = an.portico.resVento && !an.portico.resVento.erro ? an.portico.resVento : null;
    const leitura = (r3: NonNullable<typeof res>, ic: number) => {
      const itens: Item[] = [];
      for (const n of nos) {
        const r = r3.reacoes[ic]?.get(n);
        if (!r) continue;
        const pr = projecao(pontos, [md.nos[n][0], md.nos[n][1]]), u = direcaoEm(pontos, pr.s);
        itens.push({ s: pr.s, N: r[2], M: (r[3] ?? 0) * u[0] + (r[4] ?? 0) * u[1], H: r[0] * -u[1] + r[1] * u[0] });
      }
      return itens;
    };
    an.casos.forEach((c, ic) => ac.add(c, leitura(res, ic)));
    if (resV) casosV.forEach((c, iv) => ac.add(c.nome, leitura(resV, iv)));
  }
  return { N: ac.N, M: ac.M, H: ac.H, total: ac.total, avisos };
}

/** Reação de um pilar na base por caso (kN, kN·m; N > 0 compressão), da análise. */
export function reacoesDoPilar(an: AnaliseEdificio, pilar: string): Map<string, { N: number; Vx: number; Vy: number; Mx: number; My: number }> {
  const m = new Map<string, { N: number; Vx: number; Vy: number; Mx: number; My: number }>();
  for (const f of an.fundacao) if (f.pilar === pilar) { const a = m.get(f.caso); m.set(f.caso, a ? { N: a.N + f.N, Vx: a.Vx + f.Vx, Vy: a.Vy + f.Vy, Mx: a.Mx + f.Mx, My: a.My + f.My } : { N: f.N, Vx: f.Vx, Vy: f.Vy, Mx: f.Mx, My: f.My }); }
  return m;
}

/**
 * Cargas dos pilares que nascem na fundação sobre o eixo: a reação de cada pilar por caso, projetada no eixo e espalhada por
 * `larg(pilar)` metros (a sapata isolada equivalente) em torno da projeção.
 */
export function cargasDosPilaresSobEixo(b: BuildingModel, an: AnaliseEdificio, pilares: Pilar[], pontos: P[], L: number, nJan: number, wj: number, larg: (p: Pilar) => number): CargasLinhaParede {
  const ac = acumulador(L, nJan, wj);
  for (const p of pilares) {
    const l = lancesDoPilar(b, p)[0], sec = l ? secaoNoLance(p, l.id) : p.secao, ct = centroPilar(p, sec), pr = projecao(pontos, ct), u = direcaoEm(pontos, pr.s);
    for (const [caso, f] of reacoesDoPilar(an, p.id)) ac.add(caso, [{ s: pr.s, N: f.N, M: f.Mx * u[0] + f.My * u[1], H: f.Vx * -u[1] + f.Vy * u[0], larg: larg(p) }]);
  }
  return { N: ac.N, M: ac.M, H: ac.H, total: ac.total, avisos: [] };
}
