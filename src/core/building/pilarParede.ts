// Pilar-parede (E1b): tipos de seção composta, geometria dos lados, modelo de cálculo (casca ou barra por lado) e
// regras de ligação com vigas e lajes. Código próprio; premissas em `premissas.ts` (ids e1b-*).
//
// Modelo (K1.3.28–K1.3.30, K1.4.30, K1.9.34, K1.9.35):
//  - o tipo é uma lista de lados (segmentos do eixo, em coordenadas locais; o primeiro vértice do primeiro lado é o ponto
//    de inserção) com a espessura à esquerda e à direita do eixo por pavimento; a geometria em planta é a mesma em toda a
//    altura e só a espessura varia;
//  - lado com comprimento ≥ `pilarParedeLimite` × a espessura vira casca de 6 nós (casca.ts) no plano do eixo, malha
//    estruturada com os níveis dos pavimentos como linhas da malha; lado mais curto vira barra (pilar) ligado aos
//    vizinhos por trecho rígido (barra de penalidade) nos níveis;
//  - viga fictícia no topo de cada nível do lado casca (largura = espessura, altura `pilarParedeVigaAltura`); vigas e lajes
//    que chegam em qualquer posição ligam-se a ela por "fatias" do topo (pilares virtuais retangulares, um por nó de
//    vértice da malha no nível), cuja associação à grelha é a mesma dos pilares (corpo rígido no contorno da fatia).
import { paraT6, type MalhaTri } from '../geom/malhaTri';
import { contornoNoLance, cotaFundacao, lancesDoPilar, pavimentosOrdenados, type BuildingModel, type Pilar, type PilarParede, type TipoPilarParede } from './types';
import { opcoesEmUso, perfilDe, type OpcoesCalculo } from './opcoes';
import { chegadasNoTrecho, cotasObrigatoriasParedes, furosDaParede, paredeDoPP, ppDaObra, pressoesDaParede, PREFIXO_PAREDE, tipoDaParede, type FuroTrecho, type PressaoParede } from './paredesBase';

type P = [number, number];
export const VERSAO_PAREDES = 1;

const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');
const arred = (x: number) => Math.round(x * 1e4) / 1e4;

// ---------------------------------------------------------------- tipos e lados

export const tipoDoPilarParede = (b: Pick<BuildingModel, 'tiposPilarParede' | 'paredes'>, pp: Pick<PilarParede, 'tipo'>): TipoPilarParede | undefined => {
  if (pp.tipo.startsWith(PREFIXO_PAREDE)) { const w = paredeDoPP(b, pp); return w ? tipoDaParede(w) : undefined; }
  return b.tiposPilarParede?.find((t) => t.id === pp.tipo);
};

/** Pavimentos (topos dos lances) que o pilar-parede atravessa, de baixo para cima. */
export const lancesDoPP = (b: BuildingModel, pp: Pick<PilarParede, 'nasce' | 'morre'>) => lancesDoPilar(b, pp as unknown as Pilar);

/** Lado do pilar-parede no mundo. */
export interface LadoGeo {
  pp: PilarParede; i: number; id: string; nome: string;
  /** Extremidades do eixo no mundo. */
  a: P; z: P;
  L: number; ang: number; angGraus: number;
  /** Direção do eixo e normal à esquerda. */
  u: P; n: P;
  /** Modelado em casca (senão, barra). */
  casca: boolean;
  /** Espessuras à esquerda/direita e total no lance cujo topo é o pavimento. */
  esp(pav: string): { esq: number; dir: number; t: number };
  /** Espessura total máxima entre os lances. */
  tMax: number;
  /** Trecho [s0, s1] do lado existente no lance (recorte das paredes, E6d; padrão [0, L]). */
  ext(pav: string): [number, number];
}

const rot = (p: P, ang: number): P => [p[0] * Math.cos(ang) - p[1] * Math.sin(ang), p[0] * Math.sin(ang) + p[1] * Math.cos(ang)];

/** Lados do pilar-parede no mundo (vazio se o tipo não existe). */
export function ladosDoPP(b: BuildingModel, pp: PilarParede, limite = opcoesEmUso(b.opcoes, perfilDe(b)).pilarParedeLimite): LadoGeo[] {
  const tipo = tipoDoPilarParede(b, pp);
  if (!tipo) return [];
  const ang = (pp.angulo * Math.PI) / 180, lances = lancesDoPP(b, pp);
  return tipo.lados.map((l, i) => {
    const wa = rot(l.a, ang), wz = rot(l.z, ang), a: P = [pp.x + wa[0], pp.y + wa[1]], z: P = [pp.x + wz[0], pp.y + wz[1]];
    const L = Math.hypot(z[0] - a[0], z[1] - a[1]), A = Math.atan2(z[1] - a[1], z[0] - a[0]);
    const esp = (pav: string) => { const e = l.porPavimento?.find((x) => x.pavimento === pav); const esq = e?.esq ?? l.esq, dir = e?.dir ?? l.dir; return { esq, dir, t: esq + dir }; };
    const tMax = Math.max(...(lances.length ? lances.map((x) => esp(x.id).t) : [l.esq + l.dir]));
    const ext = (pav: string): [number, number] => { const e = l.porPavimento?.find((x) => x.pavimento === pav); return [Math.max(0, e?.s0 ?? 0), Math.min(L, e?.s1 ?? L)]; };
    return { pp, i, id: `${pp.id}:${i}`, nome: `${pp.nome}.${i + 1}`, a, z, L, ang: A, angGraus: (A * 180) / Math.PI, u: [Math.cos(A), Math.sin(A)], n: [-Math.sin(A), Math.cos(A)], casca: L >= limite * tMax - 1e-9, esp, tMax, ext };
  });
}

/** Centro do retângulo do lado no lance (o plano do eixo deslocado de (esq − dir)/2 para a esquerda), e as dimensões. */
export function retanguloDoLado(g: LadoGeo, pav: string, s0 = g.ext(pav)[0], s1 = g.ext(pav)[1]): { c: P; comp: number; t: number } {
  const e = g.esp(pav), sm = (s0 + s1) / 2, d = (e.esq - e.dir) / 2;
  return { c: [g.a[0] + g.u[0] * sm + g.n[0] * d, g.a[1] + g.u[1] * sm + g.n[1] * d], comp: s1 - s0, t: e.t };
}

/** Pilar virtual de um lado ou de uma fatia do topo (geometria para as regras de apoio das vigas e para o modelo). */
export type PilarVirtual = Pilar & {
  origem: {
    pp: string; lado: number; tipo: 'lado' | 'fatia'; casca: boolean;
    /**
     * Fatia: ponto (x, y) do nó do pórtico (eixo do lado na abscissa do vértice da malha). Difere do centro do retângulo nas
     * fatias das pontas, entre linhas de malha desiguais e em parede excêntrica; é o polo do corpo rígido da fatia no modelo
     * integrado, para a grelha e o pórtico usarem o mesmo ponto (equilíbrio de momento, 24/10/2026).
     */
    no?: P;
  };
};
export const ehVirtual = (p: Pilar): p is PilarVirtual => 'origem' in p;

/** Pilar virtual (retângulo comp × t, eixo local x ao longo do lado) com as seções por lance. */
function pilarVirtualDoLado(g: LadoGeo, id: string, nome: string, nasce: string, morre: string, lancesIds: string[], s0: number | undefined, s1: number | undefined, tipo: 'lado' | 'fatia'): PilarVirtual {
  // s0/s1 ausentes: o trecho do lado existente em cada lance (recorte das paredes, E6d)
  const pav0 = lancesIds[0] ?? '', r0 = retanguloDoLado(g, pav0, s0, s1);
  const secoes: NonNullable<Pilar['secoes']> = [];
  for (const pv of lancesIds.slice(1)) {
    const r = retanguloDoLado(g, pv, s0, s1);
    if (Math.abs(r.t - r0.t) > 1e-9 || Math.abs(r.comp - r0.comp) > 1e-9 || Math.abs(r.c[0] - r0.c[0]) > 1e-9 || Math.abs(r.c[1] - r0.c[1]) > 1e-9) secoes.push({ pavimento: pv, secao: { tipo: 'ret', b: r.comp, h: r.t }, dx: r.c[0] - r0.c[0], dy: r.c[1] - r0.c[1] });
  }
  return {
    id, nome, x: r0.c[0], y: r0.c[1], angulo: g.angGraus, ajuste: 'c', nasce, morre, secao: { tipo: 'ret', b: r0.comp, h: r0.t }, ...(secoes.length ? { secoes } : {}),
    inicio: 'fundacao', ...(g.pp.vinculoBase === 'rotula' && tipo === 'lado' ? { vinculoBase: { tipo: 'rotula' as const } } : {}),
    origem: { pp: g.pp.id, lado: g.i, tipo, casca: g.casca },
  };
}

const memoLados = new WeakMap<BuildingModel, { lados: LadoGeo[]; virtuais: PilarVirtual[]; todos: Pilar[] }>();
function cacheLados(b: BuildingModel) {
  let c = memoLados.get(b);
  if (c) return c;
  const lados: LadoGeo[] = [], virtuais: PilarVirtual[] = [];
  for (const pp of ppDaObra(b)) {
    const ls = lancesDoPP(b, pp).map((x) => x.id);
    for (const g of ladosDoPP(b, pp)) { lados.push(g); virtuais.push(pilarVirtualDoLado(g, g.id, g.nome, pp.nasce, pp.morre, ls, undefined, undefined, 'lado')); }
  }
  c = { lados, virtuais, todos: virtuais.length ? [...b.pilares, ...virtuais] : b.pilares };
  memoLados.set(b, c);
  return c;
}
/** Lados de todos os pilares-parede da obra (em cache por modelo). */
export const todosLados = (b: BuildingModel): LadoGeo[] => (ppDaObra(b).length ? cacheLados(b).lados : []);
/** Pilares da obra e os lados dos pilares-parede como pilares virtuais retangulares: para as regras de apoio das vigas (K1.3.59). */
export const todosPilares = (b: BuildingModel): Pilar[] => (ppDaObra(b).length ? cacheLados(b).todos : b.pilares);
/** Só os pilares virtuais dos lados (casca ou barra). */
export const pilaresVirtuaisDosLados = (b: BuildingModel): PilarVirtual[] => (ppDaObra(b).length ? cacheLados(b).virtuais : []);

/** Contorno (retângulo no mundo) do lado no lance. */
export function contornoDoLado(g: LadoGeo, pav: string): P[] {
  // trecho existente no lance (recorte das paredes, E6d)
  const [s0, s1] = g.ext(pav), A: P = s0 > 0 ? [g.a[0] + g.u[0] * s0, g.a[1] + g.u[1] * s0] : g.a, Z: P = s1 < g.L ? [g.a[0] + g.u[0] * s1, g.a[1] + g.u[1] * s1] : g.z;
  const e = g.esp(pav), a: P = [A[0] + g.n[0] * e.esq, A[1] + g.n[1] * e.esq], z: P = [Z[0] + g.n[0] * e.esq, Z[1] + g.n[1] * e.esq];
  const a2: P = [A[0] - g.n[0] * e.dir, A[1] - g.n[1] * e.dir], z2: P = [Z[0] - g.n[0] * e.dir, Z[1] - g.n[1] * e.dir];
  return [a2, z2, z, a];
}

/** Contornos da seção composta do pilar-parede no lance (um retângulo por lado). */
export function contornosDoPP(b: BuildingModel, pp: PilarParede, pav: string): P[][] {
  return ladosDoPP(b, pp).map((g) => contornoDoLado(g, pav));
}

/** Pavimento cuja espessura vale para o desenho em planta: o primeiro lance (ou o único). */
export const pavimentoDeDesenho = (b: BuildingModel, pp: PilarParede) => lancesDoPP(b, pp)[0]?.id ?? '';

// ---------------------------------------------------------------- validação

export interface DiagnosticoPP { codigo: string; severidade: 'erro' | 'aviso' | 'info'; elementos: string[]; mensagem: string }

/**
 * Regras de lançamento (K1.9.35): não nasce em pilar nem apoia pilar (PPAREDE_APOIO, erro); lado tratado como barra
 * (PPAREDE_LADO_CURTO, informação); pilar-parede sem pavimentos, sobreposto a pilar ou a outro pilar-parede, ou com
 * tipo inexistente (erros).
 */
export function diagnosticosPilaresParede(b: BuildingModel): DiagnosticoPP[] {
  const d: DiagnosticoPP[] = [];
  for (const pp of b.pilaresParede ?? []) {
    if (!tipoDoPilarParede(b, pp)) { d.push({ codigo: 'PPAREDE_TIPO', severidade: 'erro', elementos: [pp.id], mensagem: `${pp.nome}: o tipo ${pp.tipo} não existe.` }); continue; }
    const lances = lancesDoPP(b, pp);
    if (!lances.length) { d.push({ codigo: 'PPAREDE_SEM_LANCE', severidade: 'erro', elementos: [pp.id], mensagem: `${pp.nome}: a parede precisa morrer acima do pavimento em que nasce.` }); continue; }
    const ladosPP = ladosDoPP(b, pp);
    for (const g of ladosPP) {
      if (!g.casca) d.push({ codigo: 'PPAREDE_LADO_CURTO', severidade: 'info', elementos: [pp.id], mensagem: `${g.nome}: lado de ${fmt(g.L * 100)} cm com espessura até ${fmt(g.tMax * 100)} cm (< ${fmt(opcoesEmUso(b.opcoes, perfilDe(b)).pilarParedeLimite)} × a espessura) tratado como pilar (barra).` });
    }
    // nasce em pilar ou apoia pilar: pilar real que nasce no pavimento em que a parede morre, ou que morre onde ela nasce, com contorno sobreposto
    for (const q of b.pilares) {
      for (const g of ladosPP) for (const lq of lancesDoPilar(b, q)) {
        const lp = lances.find((x) => x.id === lq.id);
        if (!lp) continue;
        const cp = contornoDoLado(g, lp.id), cq = contornoQ(q, lq.id);
        if (cruzaPoligonos(cp, cq)) { d.push({ codigo: 'PPAREDE_SOBREPOSTO', severidade: 'erro', elementos: [pp.id, q.id], mensagem: `${pp.nome} se sobrepõe a ${q.nome} em ${b.pavimentos.find((x) => x.id === lp.id)?.nome ?? lp.id}.` }); break; }
      }
      const nascePilar = pp.nasce !== 'fundacao' && q.morre === pp.nasce && ladosPP.some((g) => cruzaPoligonos(contornoDoLado(g, lances[0].id), contornoQ(q, q.morre)));
      const apoiaPilar = q.nasce === pp.morre && ladosPP.some((g) => cruzaPoligonos(contornoDoLado(g, lances.at(-1)!.id), contornoQ(q, lancesDoPilar(b, q)[0]?.id ?? q.morre)));
      if (nascePilar || apoiaPilar) d.push({ codigo: 'PPAREDE_APOIO', severidade: 'erro', elementos: [pp.id, q.id], mensagem: `${pp.nome} ${nascePilar ? `nasce sobre o pilar ${q.nome}` : `apoia o pilar ${q.nome}`}: o pilar-parede não nasce em pilar nem apoia pilar.` });
    }
  }
  const pps = b.pilaresParede ?? [];
  for (let i = 0; i < pps.length; i++) for (let j = i + 1; j < pps.length; j++) {
    const li = lancesDoPP(b, pps[i]), lj = lancesDoPP(b, pps[j]), comum = li.find((x) => lj.some((y) => y.id === x.id));
    if (!comum) continue;
    const gi = ladosDoPP(b, pps[i]), gj = ladosDoPP(b, pps[j]);
    if (gi.some((a) => gj.some((c) => cruzaPoligonos(contornoDoLado(a, comum.id), contornoDoLado(c, comum.id))))) d.push({ codigo: 'PPAREDE_SOBREPOSTO', severidade: 'erro', elementos: [pps[i].id, pps[j].id], mensagem: `${pps[i].nome} e ${pps[j].nome} se sobrepõem.` });
  }
  return d;
}

const contornoQ = (q: Pilar, lance: string): P[] => contornoNoLance(q, lance);

/** Dois polígonos convexos se sobrepõem com área (SAT, tolerância de 1 mm)? */
export function cruzaPoligonos(A: P[], B: P[], tol = 1e-3): boolean {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], nx = q[1] - p[1], ny = p[0] - q[0], L = Math.hypot(nx, ny) || 1;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const v of A) { const d = (v[0] * nx + v[1] * ny) / L; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
      for (const v of B) { const d = (v[0] * nx + v[1] * ny) / L; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
      if (a1 <= b0 + tol || b1 <= a0 + tol) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------- malha

/** Divisões uniformes de [0, L] com pontos obrigatórios (junções), descartando divisões a menos de h/4 deles. */
export function abscissasDoLado(L: number, h: number, obrigatorias: number[] = []): number[] {
  const n = Math.max(1, Math.ceil(L / h - 1e-9)), base = Array.from({ length: n + 1 }, (_, k) => (L * k) / n);
  const obr = [...new Set(obrigatorias.map(arred).filter((s) => s > 1e-6 && s < L - 1e-6))].sort((x, y) => x - y);
  const ok = base.filter((s, k) => k === 0 || k === n || obr.every((o) => Math.abs(o - s) > h / 4));
  return [...new Set([...ok, ...obr].map(arred))].sort((x, y) => x - y);
}

/** Alturas da grade de um lado: as cotas dos níveis (base e topos dos lances), cada painel dividido em ≈ h. */
export function cotasDaGrade(zs: number[], h: number, extras: number[] = []): { Z: number[]; nivel: number[] } {
  const Z: number[] = [zs[0]], nivel: number[] = [0];
  for (let k = 0; k + 1 < zs.length; k++) {
    // cotas obrigatórias dentro do painel (aberturas, mudanças do empuxo; E1c): cada subintervalo dividido em ≈ h
    const cortes = [zs[k], ...[...new Set(extras.map(arred))].filter((z) => z > zs[k] + 1e-3 && z < zs[k + 1] - 1e-3).sort((a, c) => a - c), zs[k + 1]];
    for (let j = 0; j + 1 < cortes.length; j++) {
      const z0 = cortes[j], z1 = cortes[j + 1], n = Math.max(1, Math.ceil((z1 - z0) / h - 1e-9));
      for (let q = 1; q <= n; q++) Z.push(z0 + ((z1 - z0) * q) / n);
    }
    nivel.push(Z.length - 1);
  }
  return { Z, nivel };
}

/** Malha estruturada de triângulos (anti-horários em (s, z)) sobre a grade S × Z, diagonais alternadas; sem as células dentro dos furos (E1c). */
export function malhaDaGrade(S: number[], Z: number[], furos: Pick<FuroTrecho, 's0' | 's1' | 'z0' | 'z1'>[] = []): MalhaTri {
  const pontos: P[] = [], tris: [number, number, number][] = [], id = (i: number, j: number) => j * S.length + i;
  for (let j = 0; j < Z.length; j++) for (let i = 0; i < S.length; i++) pontos.push([S[i], Z[j]]);
  for (let j = 0; j + 1 < Z.length; j++) for (let i = 0; i + 1 < S.length; i++) {
    const sc = (S[i] + S[i + 1]) / 2, zc = (Z[j] + Z[j + 1]) / 2;
    if (furos.some((f) => sc > f.s0 && sc < f.s1 && zc > f.z0 && zc < f.z1)) continue;
    const p00 = id(i, j), p10 = id(i + 1, j), p11 = id(i + 1, j + 1), p01 = id(i, j + 1);
    if ((i + j) % 2) tris.push([p00, p10, p11], [p00, p11, p01]); else tris.push([p00, p10, p01], [p10, p11, p01]);
  }
  return { pontos, tris };
}

export { paraT6 };

// ---------------------------------------------------------------- geometria de cálculo (antes do pórtico)

/** Grade e fatias de um lado em casca. */
export interface GradeLado {
  lado: LadoGeo;
  S: number[]; Z: number[];
  /** Índice em Z de cada nível: 0 = base; k = topo do lance k (pavimento `lances[k-1]`). */
  nivel: number[];
  /** Paredes (E1c): aberturas do trecho no plano (s, z) e pressões de empuxo. */
  furos?: FuroTrecho[];
  pressoes?: PressaoParede[];
}

export interface ModeloParedes {
  /** Cotas dos níveis: base e topos dos lances, por pilar-parede. */
  niveisZ: Record<string, number[]>;
  grades: GradeLado[];
  /** Lados em barra, como pilares virtuais para as rotinas de pilar do pórtico (nós no centro, barra por lance). */
  barras: PilarVirtual[];
  /** Fatias do topo dos lados em casca, uma por nó de vértice da malha em cada nível: pilares virtuais da grelha. */
  fatias: PilarVirtual[];
  /** Vértices comuns (hubs): chave de posição → lados que chegam. */
  vertices: Map<string, { p: P; lados: string[] }>;
}

export const chaveXY = (p: P) => `${Math.round(p[0] * 1e4)}|${Math.round(p[1] * 1e4)}`;

/** Geometria de cálculo dos pilares-parede (nada se a obra não tem nenhum). */
export function geometriaParedes(b: BuildingModel, op: Pick<OpcoesCalculo, 'malhaCasca' | 'pilarParedeLimite'>): ModeloParedes | null {
  const pps = ppDaObra(b);
  if (!pps.length) return null;
  const ps = pavimentosOrdenados(b), zf = cotaFundacao(b);
  const niveisZ: Record<string, number[]> = {}, grades: GradeLado[] = [], barras: PilarVirtual[] = [], fatias: PilarVirtual[] = [];
  const vertices = new Map<string, { p: P; lados: string[] }>();
  for (const pp of pps) {
    const lances = lancesDoPP(b, pp);
    if (!lances.length || !tipoDoPilarParede(b, pp)) continue;
    const parede = paredeDoPP(b, pp), furos = parede ? furosDaParede(b, parede).porTrecho : [];
    const ladosPP = ladosDoPP(b, pp, op.pilarParedeLimite);
    const iNasce = pp.nasce === 'fundacao' ? -1 : ps.findIndex((x) => x.id === pp.nasce);
    const z0 = pp.nasce === 'fundacao' ? zf : ps[iNasce].cota;
    const zs = [z0, ...lances.map((x) => x.cota)];
    niveisZ[pp.id] = zs;
    const pressoes = parede ? pressoesDaParede(b, parede, zs[0], zs.at(-1)!) : [];
    const grupos = [...new Set(lances.map((x) => x.grupo))];
    for (const g of ladosPP) for (const v of [g.a, g.z]) { const k = chaveXY(v), e = vertices.get(k); if (e) e.lados.push(g.id); else vertices.set(k, { p: v, lados: [g.id] }); }
    const lancesIds = lances.map((x) => x.id);
    for (const g of ladosPP) {
      if (!g.casca) { barras.push(pilarVirtualDoLado(g, g.id, g.nome, pp.nasce, pp.morre, lancesIds, undefined, undefined, 'lado')); continue; }
      // junções: vértices de outros lados do mesmo pilar-parede sobre o eixo deste (T e cruz)
      const obr: number[] = [];
      for (const o of ladosPP) if (o.id !== g.id) for (const v of [o.a, o.z]) {
        const dx = v[0] - g.a[0], dy = v[1] - g.a[1], s = dx * g.u[0] + dy * g.u[1], d = Math.abs(-dx * g.u[1] + dy * g.u[0]);
        if (d < 1e-3 && s > 1e-3 && s < g.L - 1e-3) obr.push(s);
      }
      // paredes (E1c): bordas das aberturas, chegadas de vigas e lajes e mudanças do empuxo viram linhas da malha
      const fs = parede ? furos[g.i] ?? [] : [];
      if (parede) obr.push(...fs.flatMap((f) => [f.s0, f.s1]), ...chegadasNoTrecho(b, grupos, g.a, g.z, g.tMax / 2));
      const zExtras = parede ? cotasObrigatoriasParedes(b) : [];
      const S = abscissasDoLado(g.L, op.malhaCasca, obr), { Z, nivel } = cotasDaGrade(zs, op.malhaCasca, zExtras);
      grades.push({ lado: g, S, Z, nivel, ...(fs.length ? { furos: fs } : {}), ...(pressoes.length ? { pressoes } : {}) });
      // fatias do topo de cada nível (lances 1..n): uma por vértice da malha, cobrindo o lado inteiro
      for (let k = 1; k < zs.length; k++) {
        const pav = lancesIds[k - 1], nasce = k === 1 ? pp.nasce : lancesIds[k - 2];
        const [e0, e1] = g.ext(pav);
        S.forEach((s, q) => {
          if (s < e0 - 1e-6 || s > e1 + 1e-6) return; // recorte do lance (E6d): sem parede, sem fatia
          const s0 = q === 0 || Math.abs(s - e0) < 1e-6 ? e0 : (S[q - 1] + s) / 2, s1 = q === S.length - 1 || Math.abs(s - e1) < 1e-6 ? e1 : (s + S[q + 1]) / 2;
          const f = pilarVirtualDoLado(g, `${g.id}@${pav}.${q}`, `${g.nome}@${q}`, nasce, pav, [pav], s0, s1, 'fatia');
          const pn = pontoDoLado(g, s, 0);
          f.origem.no = [pn[0], pn[1]];
          f.engastes = [{ pavimento: pav, topo: 0, base: 0 }];
          fatias.push(f);
        });
      }
    }
  }
  return { niveisZ, grades, barras, fatias, vertices };
}

/** Posição no mundo do ponto (s, z) do lado, sobre o eixo. */
export const pontoDoLado = (g: LadoGeo, s: number, z: number): [number, number, number] => [arred(g.a[0] + g.u[0] * s), arred(g.a[1] + g.u[1] * s), z];
