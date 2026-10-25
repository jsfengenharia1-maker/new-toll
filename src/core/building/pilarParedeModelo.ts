// Pilar-parede no pórtico (E1b): nós, cascas, apoios, pesos, viga fictícia do topo e ligações dos lados em barra.
// A geometria e as regras estão em `pilarParede.ts`; aqui só a montagem do modelo do pórtico espacial.
import type { AxialMedio3, Barra3, Caso3, Casca3, V3 } from '../fe3d';
import { chaveXY, ladosDoPP, lancesDoPP, malhaDaGrade, paraT6, pontoDoLado, retanguloDoLado, type ModeloParedes } from './pilarParede';
import { paredeDoPP, paredeTocaLaje, ppDaObra } from './paredesBase';
import type { BuildingModel, Parede } from './types';

type P = [number, number];
const arred = (x: number) => Math.round(x * 1e4) / 1e4;

/** Elemento de casca do pilar-parede: de onde veio e o que ocupa (para os esforços por lado e pavimento). */
export interface InfoCasca {
  /** Índice em `pm.cascas`. */
  k: number;
  pp: string; lado: number; ladoId: string;
  /** Pavimento do topo do lance do painel, espessura total (m), área (m²), abscissa e cota do centroide. */
  lance: string; t: number; area: number; s: number; z: number;
  /** Peso próprio do elemento (kN), aplicado em 1/3 em cada nó do meio dos lados no caso permanente (V7h: cargas próprias nos nós de uma seção). */
  peso: number;
}

/** O que o pórtico guarda dos pilares-parede. */
export interface ParedesNoPortico {
  info: InfoCasca[];
  /** Nós das fatias do topo (apoios das vigas e lajes). */
  nosFatia: { no: number; lado: string; pavimento: string }[];
  /** Nós da base de cada pilar-parede (apoios), para as reações. */
  base: Record<string, number[]>;
  /** Ponto de referência (centroide dos lados) de cada pilar-parede, para os esforços resultantes. */
  centro: Record<string, P>;
  /** Barras fictícias do topo e de ligação criadas. */
  nBarras: number;
  /** Índice do caso permanente (peso próprio) e cargas nodais de empuxo de cada casca (V7h): são as cargas próprias dos elementos nos nós de uma seção. */
  iG: number;
  cargasProprias: { k: number; caso: number; no: number; f: [number, number] }[];
  /** Paredes (E1c): nós dos níveis em que a parede não toca laje (fora do diafragma, K1.2.5 e K1.3.36). */
  foraDiafragma: { no: number; parede: string; pavimento: string }[];
  /** Paredes (E1c): resultante das pressões de empuxo aplicadas, por parede e caso (kN, eixos globais). */
  empuxo: { parede: string; caso: string; F: [number, number] }[];
  /** Avisos da montagem (base em viga sem nó de ligação, FU7c). */
  avisos: string[];
  /**
   * Faixas axiais (E6d, K1.4.30): uma por pilar-parede de concreto e linha da grade (todos os lados juntos), com os gdl uz
   * das linhas inferior e superior, os coeficientes da média ponderada por E·t, EA/Δz da faixa e o fator de cada casca.
   * Só para montar a parcela axial (`axiaisDasFaixas`); não vai para o resultado.
   */
  faixasAxiais?: FaixaAxial[];
}

/** Faixa horizontal de cascas de um pilar-parede (ver `ParedesNoPortico.faixasAxiais`). */
export interface FaixaAxial { pp: string; dofs: number[]; c: number[]; EAporDz: number; cascas: { casca: number; fator: number }[] }

/** Molas de Winkler da base de uma parede (FU7c): k (kN/m³), largura B (m) da sapata e se a base é rotulada (sem molas de giro). */
export interface BaseWinkler { k: number; /** Largura (m); ausente = espessura de cada lado + 2 × `aba`. */ B?: number; aba?: number; rotula: boolean; /** Largura B de cada lado (id do lado) pela sapata calculada (FU7d); tem prioridade sobre `aba`. */ largura?: Map<string, number> }

export interface EntradaParedes {
  b: BuildingModel; geo: ModeloParedes;
  pm: { nos: V3[]; barras: Barra3[]; apoios: Map<number, number[]>; cascas?: Casca3[]; molas?: { no: number; gdl: number; k: number }[] };
  /** Paredes (id) com a base sobre molas de Winkler (sapata corrida, FU7c): k, B e rótula. */
  baseWinkler?: Record<string, BaseWinkler>;
  /** Paredes (id) com a base em viga de fundação (FU7c): nós da viga (índices em `pm.nos`) que os nós da base da casca reaproveitam. */
  baseViga?: Record<string, number[]>;
  casosV: Caso3[];
  /** Nós dos pilares por `${id}|${pavimento}` (barras dos lados já criados) e `${id}|base`; recebe os das cascas e fatias. */
  noPilar: Map<string, number>;
  /** Módulo Ecs (kN/m²) do concreto do pilar no pavimento, ν, módulo e G das vigas e peso específico do concreto. */
  Ec: (pav: string) => number; Ev: number; Gv: number; nu: number; gama: number;
  /** Seção retangular: A, I (flexão em y local) e J. */
  ret: (b: number, h: number) => { A: number; I: number; J: number };
  /** Peso próprio de um painel (kN): soma em G e no pavimento. */
  peso: (pav: string, kN: number) => void;
  /** Etiqueta da barra do pórtico criada. */
  etiqueta: (ref: string, pav: string) => void;
  /** Material próprio da parede (alvenaria, E1e): E (kN/m²), ν e peso específico (kN/m³); ausente = o do concreto do pilar. */
  materialParede?: (w: Parede) => { E: number; nu: number; gama: number } | undefined;
  /** Altura da viga fictícia (m). */
  hViga: number;
  /** Índice do caso G em `casosV`. */
  iG: number;
  /** Índice de um caso em `casosV` (−1 se não existe); paredes com empuxo (E1c). */
  caso?: (id: string) => number;
}

// regra de Gauss de grau 4 no triângulo (6 pontos; coordenadas de área e pesos que somam 1)
const GA = 0.445948490915965, GB = 0.091576213509771, WA = 0.223381589678011, WB = 0.109951743655322;
const GAUSS6: [number, number, number, number][] = [
  [GA, GA, 1 - 2 * GA, WA], [GA, 1 - 2 * GA, GA, WA], [1 - 2 * GA, GA, GA, WA],
  [GB, GB, 1 - 2 * GB, WB], [GB, 1 - 2 * GB, GB, WB], [1 - 2 * GB, GB, GB, WB],
];
/** Funções de forma do triângulo de 6 nós (vértices 0–2, meios 3 = 0–1, 4 = 1–2, 5 = 2–0) em coordenadas de área. */
const formaT6 = (l1: number, l2: number, l3: number) => [l1 * (2 * l1 - 1), l2 * (2 * l2 - 1), l3 * (2 * l3 - 1), 4 * l1 * l2, 4 * l2 * l3, 4 * l3 * l1];

/** Forças nodais consistentes (6 nós) de uma pressão p(z) normal ao triângulo de vértices (s, z), integrada com 6 pontos. */
export function forcasPressaoT6(c3: [number, number][], p: (z: number) => number): number[] {
  const A = Math.abs((c3[1][0] - c3[0][0]) * (c3[2][1] - c3[0][1]) - (c3[2][0] - c3[0][0]) * (c3[1][1] - c3[0][1])) / 2;
  const f = [0, 0, 0, 0, 0, 0];
  for (const [l1, l2, l3, w] of GAUSS6) {
    const z = l1 * c3[0][1] + l2 * c3[1][1] + l3 * c3[2][1], q = p(z) * w * A, N = formaT6(l1, l2, l3);
    for (let k = 0; k < 6; k++) f[k] += N[k] * q;
  }
  return f;
}

/** Cria nós, cascas, apoios, pesos, vigas fictícias e ligações dos pilares-parede no pórtico. */
export function incluirParedes(e: EntradaParedes): ParedesNoPortico {
  const { b, geo, pm, casosV, noPilar } = e;
  const mapa = new Map<string, number>();
  const no = (p: V3): number => {
    const k = `${Math.round(p[0] * 1e4)}|${Math.round(p[1] * 1e4)}|${Math.round(p[2] * 1e4)}`;
    let i = mapa.get(k);
    if (i === undefined) { i = pm.nos.length; mapa.set(k, i); pm.nos.push([arred(p[0]), arred(p[1]), arred(p[2])]); }
    return i;
  };
  pm.cascas ??= [];
  const out: ParedesNoPortico = { iG: e.iG, cargasProprias: [], info: [], nosFatia: [], base: {}, centro: {}, nBarras: 0, foraDiafragma: [], empuxo: [], avisos: [] };
  const semeadas = new Set<number>(Object.values(e.baseViga ?? {}).flat());
  // centro de cada pilar-parede: centroide das áreas dos lados no primeiro lance
  for (const pp of ppDaObra(b)) {
    const lances = lancesDoPP(b, pp);
    if (!lances.length) continue;
    let A = 0, cx = 0, cy = 0;
    for (const g of ladosDoPP(b, pp)) { const r = retanguloDoLado(g, lances[0].id), a = r.comp * r.t; A += a; cx += a * r.c[0]; cy += a * r.c[1]; }
    out.centro[pp.id] = A ? [cx / A, cy / A] : [pp.x, pp.y];
    out.base[pp.id] = [];
  }
  const rigida = { E: e.Ev * 100, G: e.Gv * 100, A: 10, Iz: 10, Iy: 10, J: 10 };
  // faixas axiais (E6d): por pilar-parede e linha j da grade, pesos E·t·ℓ·φ das arestas das linhas inferior e superior
  const faixas = new Map<string, { pp: string; dz: number; sup: Map<number, number>; inf: Map<number, number>; EAs: number; EAi: number; cascas: { casca: number; Et: number }[] }>();
  for (const gr of geo.grades) {
    const { lado: g, S, Z, nivel } = gr, pp = g.pp, zs = geo.niveisZ[pp.id], lances = lancesDoPP(b, pp);
    const malha = paraT6(malhaDaGrade(S, Z, gr.furos));
    // base em viga de fundação (FU7c): os nós da viga entram no mapa e a casca os reaproveita (mesmas coordenadas)
    for (const nv of e.baseViga?.[pp.id] ?? []) mapa.set(`${Math.round(pm.nos[nv][0] * 1e4)}|${Math.round(pm.nos[nv][1] * 1e4)}|${Math.round(pm.nos[nv][2] * 1e4)}`, nv);
    // só os pontos usados pelos triângulos viram nós (as aberturas deixam pontos soltos na grade)
    const usado = new Uint8Array(malha.pontos.length);
    for (const t of malha.tris) for (const i of t) usado[i] = 1;
    const ids = malha.pontos.map(([s, z], i) => (usado[i] ? no(pontoDoLado(g, s, z)) : -1));
    const parede = paredeDoPP(b, pp), mat = parede ? e.materialParede?.(parede) : undefined;
    const pesoNo = new Map<number, number>();
    for (const t of malha.tris) {
      const c3 = [malha.pontos[t[0]], malha.pontos[t[1]], malha.pontos[t[2]]], zc = (c3[0][1] + c3[1][1] + c3[2][1]) / 3, sc = (c3[0][0] + c3[1][0] + c3[2][0]) / 3;
      let k = 0;
      while (k + 2 < zs.length && zc > zs[k + 1]) k++;
      const lance = lances[k], esp = g.esp(lance.id).t;
      const area = Math.abs((c3[1][0] - c3[0][0]) * (c3[2][1] - c3[0][1]) - (c3[2][0] - c3[0][0]) * (c3[1][1] - c3[0][1])) / 2;
      pm.cascas.push({ nos: t.map((i) => ids[i]) as [number, number, number, number, number, number], E: mat?.E ?? e.Ec(lance.id), nu: mat?.nu ?? e.nu, h: esp, ref: [g.u[0], g.u[1], 0], ...(mat ? { semReducao: true } : {}) });
      if (!mat) {
        let j = 0;
        while (j + 2 < Z.length && zc > Z[j + 1]) j++;
        const chave = `${pp.id}|${j}`, Ec = e.Ec(lance.id);
        let f = faixas.get(chave);
        if (!f) faixas.set(chave, (f = { pp: pp.id, dz: Z[j + 1] - Z[j], sup: new Map(), inf: new Map(), EAs: 0, EAi: 0, cascas: [] }));
        f.cascas.push({ casca: pm.cascas.length - 1, Et: Ec * esp });
        for (const [a, b2, m] of [[0, 1, 3], [1, 2, 4], [2, 0, 5]] as const) {
          const pa = malha.pontos[t[a]], pb = malha.pontos[t[b2]];
          if (Math.abs(pa[1] - pb[1]) > 1e-9) continue;
          const naSup = Math.abs(pa[1] - Z[j + 1]) < 1e-9, naInf = Math.abs(pa[1] - Z[j]) < 1e-9;
          if (!naSup && !naInf) continue;
          const w = Ec * esp * Math.abs(pb[0] - pa[0]), mp = naSup ? f.sup : f.inf;
          if (naSup) f.EAs += w; else f.EAi += w;
          for (const [q, fr] of [[a, 1 / 6], [m, 2 / 3], [b2, 1 / 6]] as const) mp.set(ids[t[q]], (mp.get(ids[t[q]]) ?? 0) + w * fr);
        }
      }
      out.info.push({ k: pm.cascas.length - 1, pp: pp.id, lado: g.i, ladoId: g.id, lance: lance.id, t: esp, area, s: sc, z: zc, peso: 0 });
      // peso próprio: carga consistente de pressão uniforme (vértices 0, meios dos lados 1/3 cada)
      const W = (mat?.gama ?? e.gama) * esp * area;
      out.info[out.info.length - 1].peso = W;
      for (const m of [t[3], t[4], t[5]]) pesoNo.set(ids[m], (pesoNo.get(ids[m]) ?? 0) + W / 3);
      e.peso(lance.id, W);
      // empuxo (E1c): pressão normal ao plano da parede, forças consistentes do T6, no caso do empuxo
      for (const pr of gr.pressoes ?? []) {
        const ic = e.caso?.(pr.empuxo.caso) ?? -1;
        if (ic < 0) continue;
        const fz = forcasPressaoT6(c3 as [number, number][], pr.p);
        let F = 0;
        t.forEach((m, q) => { const v = fz[q] * pr.sinal; if (!v) return; F += v; casosV[ic].nodais.push({ no: ids[m], f: [g.n[0] * v, g.n[1] * v, 0, 0, 0, 0] }); out.cargasProprias.push({ k: pm.cascas!.length - 1, caso: ic, no: ids[m], f: [g.n[0] * v, g.n[1] * v] }); });
        const r = out.empuxo.find((x) => x.parede === pp.id && x.caso === pr.empuxo.caso);
        if (r) { r.F[0] += g.n[0] * F; r.F[1] += g.n[1] * F; } else out.empuxo.push({ parede: pp.id, caso: pr.empuxo.caso, F: [g.n[0] * F, g.n[1] * F] });
      }
    }
    for (const [n, w] of pesoNo) casosV[e.iG].nodais.push({ no: n, f: [0, 0, -w, 0, 0, 0] });
    // base: apoios nos nós do nível 0
    const apoio = pp.vinculoBase === 'rotula' ? [0, 1, 2] : [0, 1, 2, 3, 4, 5];
    const nbase: { i: number; s: number }[] = [];
    malha.pontos.forEach(([s, z], i) => { if (usado[i] && Math.abs(z - Z[0]) < 1e-9) nbase.push({ i, s }); });
    nbase.sort((a, c) => a.s - c.s);
    const wk = e.baseWinkler?.[pp.id], emViga = !!e.baseViga?.[pp.id];
    nbase.forEach((q, j) => {
      const n = ids[q.i];
      if (emViga && semeadas.has(n)) return; // nó da viga de fundação: o apoio é a base elástica
      if (emViga) out.avisos.push(`Parede ${parede?.nome ?? pp.id}: nó da base da casca sem nó da viga de fundação na mesma posição; mantido engastado.`);
      if (wk && !emViga) {
        // molas de Winkler (FU7c): vertical k·B·Lt e giro em torno do eixo da parede k·B³·Lt/12 (diagonal em x e y), Lt = comprimento de influência do nó
        const Lt = ((nbase[j + 1]?.s ?? q.s) - (nbase[j - 1]?.s ?? q.s)) / 2, Bm = wk.largura?.get(g.id) ?? wk.B ?? g.esp(lances[0].id).t + 2 * (wk.aba ?? 0.3), kz = wk.k * Bm * Lt, kr = (wk.k * Bm ** 3 * Lt) / 12;
        pm.apoios.set(n, [0, 1, 5]);
        const ml = (pm.molas ??= []);
        ml.push({ no: n, gdl: 2, k: kz });
        if (!wk.rotula) ml.push({ no: n, gdl: 3, k: kr * g.u[0] ** 2 + 1e-9 * kr }, { no: n, gdl: 4, k: kr * g.u[1] ** 2 + 1e-9 * kr });
      } else pm.apoios.set(n, apoio);
      if (!out.base[pp.id].includes(n)) out.base[pp.id].push(n); // o nó do vértice entre dois lados é um só (V7h: contava a reação duas vezes)
    });
    const meio = (z: number) => { let best = -1, d = Infinity; malha.pontos.forEach(([s, zz], i) => { if (usado[i] && Math.abs(zz - z) < 1e-9 && S.includes(s) && Math.abs(s - g.L / 2) < d) { d = Math.abs(s - g.L / 2); best = i; } }); return ids[best]; };
    noPilar.set(`${g.id}|base`, meio(Z[0]));
    for (let k = 1; k < zs.length; k++) {
      const pav = lances[k - 1].id, zk = Z[nivel[k]];
      noPilar.set(`${g.id}|${pav}`, meio(zk));
      const [e0, e1] = g.ext(pav);
      S.forEach((s, q) => { if (s < e0 - 1e-6 || s > e1 + 1e-6) return; const n = no(pontoDoLado(g, s, zk)); noPilar.set(`${g.id}@${pav}.${q}|${pav}`, n); out.nosFatia.push({ no: n, lado: g.id, pavimento: pav }); });
      // viga fictícia: barras entre os nós consecutivos da linha do nível (vértices e meios)
      const linha = malha.pontos.map(([s, z], i) => ({ s, z, i })).filter((p) => usado[p.i] && Math.abs(p.z - zk) < 1e-9).sort((a, c) => a.s - c.s);
      // parede que não toca laje neste nível fica fora do diafragma (K1.2.5, K1.3.36)
      if (parede && !paredeTocaLaje(b, parede, pav)) for (const p of linha) out.foraDiafragma.push({ no: ids[p.i], parede: pp.id, pavimento: pav });
      const t = g.esp(pav).t, h = e.hViga, bar = e.ret(t, h);
      for (let q = 0; q + 1 < linha.length; q++) {
        // só a rigidez no plano da parede (A e Iz) distribui as cargas; a flexão fora do plano e a torção, já dadas pela placa, entram a 1 %
        pm.barras.push({ i: ids[linha[q].i], j: ids[linha[q + 1].i], E: e.Ev, G: e.Gv, A: bar.A, Iz: bar.I, Iy: (h * t ** 3) / 1200, J: bar.J * 0.01 });
        e.etiqueta(g.id, pav); out.nBarras++;
      }
    }
  }
  out.faixasAxiais = [...faixas.values()].filter((f) => f.EAs > 0 && f.EAi > 0).map((f) => {
    const EA = (f.EAs + f.EAi) / 2, dofs: number[] = [], c: number[] = [];
    for (const [n, w] of f.sup) { dofs.push(n * 6 + 2); c.push(w / f.EAs); }
    for (const [n, w] of f.inf) { dofs.push(n * 6 + 2); c.push(-w / f.EAi); }
    return { pp: f.pp, dofs, c, EAporDz: EA / f.dz, cascas: f.cascas.map((x) => ({ casca: x.casca, fator: x.Et / EA })) };
  });
  // barras dos lados curtos: ligação rígida ao vértice comum em cada nível (a base é engastada)
  for (const p of geo.barras) {
    const pp = ppDaObra(b).find((x) => x.id === p.origem.pp)!, g = ladosDoPP(b, pp).find((l) => l.i === p.origem.lado)!;
    const lances = lancesDoPP(b, pp), zs = geo.niveisZ[pp.id];
    const base = noPilar.get(`${p.id}|base`);
    if (base !== undefined && !out.base[pp.id].includes(base)) out.base[pp.id].push(base);
    for (const v of [g.a, g.z]) {
      const viz = geo.vertices.get(chaveXY(v));
      if (!viz || viz.lados.length < 2) continue;
      for (let k = 1; k < zs.length; k++) {
        const pav = lances[k - 1].id, nb = noPilar.get(`${p.id}|${pav}`);
        if (nb === undefined) continue;
        const hub = no([v[0], v[1], zs[k]]);
        if (hub === nb) continue;
        pm.barras.push({ i: nb, j: hub, ...rigida });
        e.etiqueta(p.id, pav); out.nBarras++;
      }
    }
  }
  return out;
}

/** Multiplicador só da rigidez axial (E5j, K1.4.30): E_y da membrana × fator; EI, cisalhamento no plano e placa brutos. */
export const axialCascas = (cascas: Casca3[] | undefined, fator: number): Casca3[] | undefined => cascas?.map((c) => (c.semReducao ? c : { ...c, fAxial: fator }));

/**
 * Parcela axial das paredes nas cargas verticais (E6d, K1.4.30): faixa com k = (fator − 1)·EA/Δz sobre o alongamento
 * médio, de modo que o modo uniforme fique com fator·EA e a flexão no plano, o cisalhamento e a placa fiquem brutos.
 */
export const axiaisDasFaixas = (faixas: FaixaAxial[] | undefined, fator: number): AxialMedio3[] =>
  fator === 1 ? [] : (faixas ?? []).map((f) => ({ dofs: f.dofs, c: f.c, k: (fator - 1) * f.EAporDz, cascas: f.cascas }));

/** Rigidez reduzida das cascas no γz e no P-Δ (pilares: 0,8·Eci·Ic; NBR 6118, 15.7.3). */
export const reduzirCascas = (cascas: Casca3[] | undefined, fator: number): Casca3[] | undefined => cascas?.map((c) => (c.semReducao ? c : { ...c, E: c.E * fator }));

/**
 * Posições (x, y) dos nós da base das cascas de cada parede (id) na cota da fundação, na mesma malha de `incluirParedes`:
 * a viga de fundação da base da parede (FU7c) cria seus nós nelas para a casca e a viga compartilharem os nós.
 */
export function pontosBaseDasParedes(b: BuildingModel, geo: ModeloParedes): Record<string, [number, number][]> {
  const out: Record<string, [number, number][]> = {};
  for (const gr of geo.grades) {
    const { lado: g, S, Z } = gr, malha = paraT6(malhaDaGrade(S, Z, gr.furos));
    const usado = new Uint8Array(malha.pontos.length);
    for (const t of malha.tris) for (const i of t) usado[i] = 1;
    const l = (out[g.pp.id] ??= []);
    malha.pontos.forEach(([s, z], i) => { if (usado[i] && Math.abs(z - Z[0]) < 1e-9) { const p = pontoDoLado(g, s, z); l.push([p[0], p[1]]); } });
  }
  void b;
  return out;
}
