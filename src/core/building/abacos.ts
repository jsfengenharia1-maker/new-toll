// Ábacos (capitéis) das lajes nervuradas bidirecionais (frente E3d): geração automática nos pilares (dimensão em cada face = fração
// da distância ao pilar mais próximo no cone de busca, com limites em múltiplos da altura do ábaco), validação dos ábacos manuais,
// armadura base entre nervuras (2 barras por vão, de borda a borda) e trechos das nervuras que atravessam cada ábaco. A zona
// maciça no arranjo das cubetas e o rebaixo na grelha estão em `nervuradas.ts` (`abacosEfetivos`, `lajeComAbacos`); a flexão
// negativa sobre o pilar e o cortante estão em `nervuradasDim.ts`; a punção, em `abacosPuncao.ts`. Núcleo puro; kN, m.
import { areaPoligono, dentroPoligono, type P } from '../geom/faces';
import { intersecaoPoligonos } from '../geom/recorte';
import { linhaLajes, tabelaDe } from './tabelasArmadura';
import { cobrimentoLaje } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { abacosEfetivos, direcaoNervurada, geometriaBidirecional, type AbacoEfetivo, type GeometriaBidirecional } from './nervuradas';
import type { Diagnostico } from './verify';
import { vigaTocaPilar } from './vigas';
import { anguloNoLance, centroNoLance, dimsSecao, lancesDoPilar, pavimentosDoGrupo, secaoNoLance, type Abaco, type ArmaduraBaseAbaco, type BarrasNervura, type BuildingModel, type GeradoAbaco, type Laje } from './types';

export type LadoAbaco = 'u+' | 'u-' | 'v+' | 'v-';
export const LADOS_ABACO: LadoAbaco[] = ['u+', 'u-', 'v+', 'v-'];
const OPOSTO: Record<LadoAbaco, LadoAbaco> = { 'u+': 'u-', 'u-': 'u+', 'v+': 'v-', 'v-': 'v+' };

export type OpAbaco = Pick<OpcoesCalculo, 'abacoFracao' | 'abacoCone' | 'abacoExtensao' | 'abacoLimMin' | 'abacoLimMax'>;
/** Parâmetros da geração automática (padrão: as opções `abaco*`). */
export interface ParametrosAbaco { fracao: number; cone: number; extensao: number; limMin: number; limMax: number }
export const parametrosAbaco = (op: OpAbaco, sobre: Partial<ParametrosAbaco> = {}): ParametrosAbaco => ({
  fracao: sobre.fracao ?? op.abacoFracao, cone: sobre.cone ?? op.abacoCone, extensao: sobre.extensao ?? op.abacoExtensao, limMin: sobre.limMin ?? op.abacoLimMin, limMax: sobre.limMax ?? op.abacoLimMax,
});

export interface PilarGrupo { id: string; nome: string; centro: P; c1: number; c2: number; circular: boolean; angulo: number; pavimento: string }
/** Pilares do grupo de pavimentos (geometria do primeiro pavimento do grupo que o pilar atravessa). */
export function pilaresDoGrupo(b: BuildingModel, grupo: string): PilarGrupo[] {
  const pavs = pavimentosDoGrupo(b, grupo), out: PilarGrupo[] = [];
  for (const p of b.pilares) {
    const lances = lancesDoPilar(b, p), pav = pavs.find((x) => lances.some((y) => y.id === x.id));
    if (!pav) continue;
    const s = secaoNoLance(p, pav.id), [w, h] = dimsSecao(s), circular = s.tipo === 'circ';
    out.push({ id: p.id, nome: p.nome, centro: centroNoLance(p, pav.id), c1: w, c2: circular ? w : h, circular, angulo: anguloNoLance(p, pav.id), pavimento: pav.id });
  }
  return out;
}

const eixosDe = (ang: number): [P, P] => { const a = (ang * Math.PI) / 180; return [[Math.cos(a), Math.sin(a)], [-Math.sin(a), Math.cos(a)]]; };
const distBordaContorno = (q: P, c: P[]): number => c.reduce((m, a, i) => {
  const z = c[(i + 1) % c.length], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)) : 0;
  return Math.min(m, Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]));
}, Infinity);

/** O pilar está no pano (centro dentro do contorno ou a menos da meia seção da borda) e fora das aberturas? */
export function pilarNoPano(l: Pick<Laje, 'contorno' | 'furos'>, p: PilarGrupo): boolean {
  const cont = l.contorno as P[];
  if (!(dentroPoligono(p.centro, cont) || distBordaContorno(p.centro, cont) <= Math.max(p.c1, p.c2) / 2 + 1e-6)) return false;
  return !(l.furos ?? []).some((f) => dentroPoligono(p.centro, f as P[]));
}

/**
 * Dimensões do ábaco automático de um pilar. Em cada face: o pilar mais próximo (distância entre eixos) dentro do cone (ângulo
 * entre a normal da face e a direção do pilar vizinho, a partir do centro da face, ≤ `cone`) dá a extensão = fração × distância,
 * limitada a [limMin, limMax] × hAbaco; sem pilar no cone (borda) vale a do sentido oposto; sem pilar em nenhum dos dois, o
 * mínimo. A extensão maciça (`extensao`, % da distância) soma-se depois dos limites. Devolve o retângulo (eixos do pilar, m).
 */
export function dimensionarAbacoPilar(p: PilarGrupo, outros: PilarGrupo[], hAbaco: number, par: ParametrosAbaco): { poligono: P[]; faces: GeradoAbaco['faces'] } {
  const [ux, vx] = eixosDe(p.angulo), meia = (l: LadoAbaco) => (l[0] === 'u' ? p.c1 : p.c2) / 2;
  const normal = (l: LadoAbaco): P => { const e = l[0] === 'u' ? ux : vx, s = l[1] === '+' ? 1 : -1; return [e[0] * s, e[1] * s]; };
  const lo = par.limMin * hAbaco, hi = Math.max(lo, par.limMax * hAbaco), cosCone = Math.cos((par.cone * Math.PI) / 180);
  const faces: GeradoAbaco['faces'] = [];
  for (const lado of LADOS_ABACO) {
    const n = normal(lado), f: P = [p.centro[0] + n[0] * meia(lado), p.centro[1] + n[1] * meia(lado)];
    let viz: PilarGrupo | undefined, dist = Infinity;
    for (const q of outros) {
      if (q.id === p.id) continue;
      const v: P = [q.centro[0] - f[0], q.centro[1] - f[1]], dv = Math.hypot(v[0], v[1]);
      if (dv < 1e-6 || (v[0] * n[0] + v[1] * n[1]) / dv < cosCone - 1e-12) continue;
      const dc = Math.hypot(q.centro[0] - p.centro[0], q.centro[1] - p.centro[1]);
      if (dc < dist) { dist = dc; viz = q; }
    }
    if (viz) {
      const bruta = par.fracao * dist, ext = Math.min(hi, Math.max(lo, bruta));
      faces.push({ lado, extensao: ext, origem: 'cone', vizinho: viz.id, distancia: dist, ...(ext > bruta + 1e-9 ? { limitado: 'min' as const } : ext < bruta - 1e-9 ? { limitado: 'max' as const } : {}) });
    } else faces.push({ lado, extensao: NaN, origem: 'minimo' });
  }
  const por = (l: LadoAbaco) => faces.find((x) => x.lado === l)!;
  const copia = faces.map((x) => ({ ...x }));
  for (const f of faces) {
    if (f.origem === 'cone') continue;
    const op = copia.find((x) => x.lado === OPOSTO[f.lado])!;
    if (op.origem === 'cone') { f.extensao = op.extensao; f.origem = 'oposto'; f.vizinho = op.vizinho; f.distancia = op.distancia; if (op.limitado) f.limitado = op.limitado; }
    else { f.extensao = lo; f.origem = 'minimo'; }
  }
  for (const f of faces) if (par.extensao > 0 && f.distancia) f.extensao += (par.extensao / 100) * f.distancia;
  const e = (l: LadoAbaco) => por(l).extensao;
  const u0 = -(p.c1 / 2 + e('u-')), u1 = p.c1 / 2 + e('u+'), v0 = -(p.c2 / 2 + e('v-')), v1 = p.c2 / 2 + e('v+');
  const g = (u: number, v: number): P => [p.centro[0] + u * ux[0] + v * vx[0], p.centro[1] + u * ux[1] + v * vx[1]];
  return { poligono: [g(u0, v0), g(u1, v0), g(u1, v1), g(u0, v1)], faces };
}

export interface AbacoGerado { pilar: PilarGrupo; poligono: P[]; hAbaco: number; gerado: GeradoAbaco }
/**
 * Ábacos automáticos de uma laje nervurada: um por pilar do pano (por padrão só os sem viga encostada), recortados pelo contorno.
 * `pilares` restringe aos pilares dados; `hAbaco` (m) vale a altura total da laje se omitido.
 */
export function gerarAbacos(b: BuildingModel, l: Laje, par: ParametrosAbaco, o: { pilares?: string[]; hAbaco?: number; somenteSemViga?: boolean } = {}): { gerados: AbacoGerado[]; avisos: string[] } {
  const gerados: AbacoGerado[] = [], avisos: string[] = [];
  if (l.tipo.tipo !== 'nervurada') return { gerados, avisos };
  const todos = pilaresDoGrupo(b, l.grupo), hAbaco = o.hAbaco ?? l.tipo.hTotal;
  const vigas = b.vigas.filter((v) => v.grupo === l.grupo);
  for (const p of todos) {
    if (o.pilares && !o.pilares.includes(p.id)) continue;
    if (!pilarNoPano(l, p)) continue;
    const pil = b.pilares.find((x) => x.id === p.id)!;
    if (!o.pilares && (o.somenteSemViga ?? true) && vigas.some((v) => vigaTocaPilar(v, pil, p.pavimento))) continue;
    const { poligono, faces } = dimensionarAbacoPilar(p, todos, hAbaco, par);
    const rec = intersecaoPoligonos(poligono, l.contorno as P[]);
    if (rec.length < 3) { avisos.push(`Ábaco: o ábaco de ${p.nome} fica fora de ${l.nome}.`); continue; }
    gerados.push({ pilar: p, poligono: rec.map((q) => [+q[0].toFixed(4), +q[1].toFixed(4)] as P), hAbaco, gerado: { ...par, faces } });
  }
  return { gerados, avisos };
}

/** Ábacos da laje (modelo). */
export const abacosDaLaje = (b: Pick<BuildingModel, 'abacos'>, laje: string): Abaco[] => (b.abacos ?? []).filter((a) => a.laje === laje);

/** Coerência do ábaco (polígono, altura, laje nervurada, interseção com o pano); lista de erros em texto. */
export function validarAbaco(b: BuildingModel, laje: string, poligono: P[] | undefined, hAbaco: number | undefined): string[] {
  const e: string[] = [], l = b.lajes.find((x) => x.id === laje);
  if (!l) return [`Laje ${laje} não existe.`];
  if (l.tipo.tipo !== 'nervurada') return [`${l.nome} não é nervurada bidirecional: só ela tem ábaco.`];
  if (poligono) {
    if (poligono.length < 3 || poligono.some((q) => !Array.isArray(q) || q.length !== 2 || !q.every(Number.isFinite))) e.push('O polígono do ábaco precisa de ao menos 3 vértices [x, y].');
    else if (Math.abs(areaPoligono(poligono)) < 1e-4) e.push('O polígono do ábaco tem área nula.');
    else if (intersecaoPoligonos(poligono, l.contorno as P[]).length < 3) e.push(`O ábaco fica fora de ${l.nome}.`);
  }
  if (hAbaco !== undefined) {
    if (!(hAbaco > 0 && hAbaco <= 1.2)) e.push('A altura do ábaco deve ficar entre 0 e 1,2 m.');
    else if (hAbaco < l.tipo.hTotal - 1e-9) e.push(`A altura do ábaco (${(hAbaco * 100).toFixed(0)} cm) não pode ser menor que a da laje (${(l.tipo.hTotal * 100).toFixed(0)} cm): o ábaco tem a espessura do pano e pode descer abaixo dele.`);
  }
  return e;
}

// ---------------------------------------------------------------- armadura base do ábaco

export interface BaseAbacoResolvida { inf: BarrasNervura | null; sup: BarrasNervura | null; padrao: boolean }
/** Barras por vão do padrão (2 barras da tabela de armadura das lajes para a altura do pano). */
export function barrasBasePadrao(b: Pick<BuildingModel, 'tabelas'>, l: Laje, op: Pick<OpcoesCalculo, 'lajeBitolaMinima'>): BarrasNervura {
  const h = l.tipo.tipo === 'nervurada' ? l.tipo.hTotal : 0.1, linha = linhaLajes(tabelaDe(b, 'lajes', l.tabela), h * 100);
  const phi = linha.bitolas.find((x) => x >= op.lajeBitolaMinima) ?? linha.bitolas.at(-1) ?? 8;
  return { n: 2, phi };
}
/** Armadura base do ábaco: a informada (`null` numa face = sem) ou o padrão (2 barras por vão nas duas faces). */
export function baseDoAbaco(b: Pick<BuildingModel, 'tabelas'>, l: Laje, a: Abaco, op: Pick<OpcoesCalculo, 'lajeBitolaMinima'>): BaseAbacoResolvida {
  const pad = barrasBasePadrao(b, l, op), x: ArmaduraBaseAbaco | undefined = a.base;
  const face = (v: BarrasNervura | null | undefined) => (v === undefined ? pad : v);
  return { inf: face(x?.inf), sup: face(x?.sup), padrao: !x };
}

export interface BarrasBaseAbaco {
  abaco: string; dir: 0 | 1; face: 'inf' | 'sup';
  /** Vãos entre eixos de nervuras cobertos na transversal, barras por vão, φ (mm), total de barras e comprimento de cada uma (m, borda a borda menos os cobrimentos). */
  vaos: number; porVao: number; phi: number; total: number; comprimento: number;
}
/** Bordo do retângulo envolvente do ábaco efetivo nos eixos das nervuras (x ao longo da direção 0 da laje). */
export function retanguloLocal(l: Pick<Laje, 'contorno' | 'direcao'>, poligono: P[]): { x0: number; x1: number; y0: number; y1: number } {
  const a = (direcaoNervurada(l) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), q = poligono.map((p): P => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c]);
  return { x0: Math.min(...q.map((p) => p[0])), x1: Math.max(...q.map((p) => p[0])), y0: Math.min(...q.map((p) => p[1])), y1: Math.max(...q.map((p) => p[1])) };
}
/**
 * Barras da armadura base de um ábaco: em cada direção e face, `n` barras em cada vão entre eixos de nervuras (a transversal do
 * retângulo envolvente do ábaco efetivo ÷ intereixo), de borda a borda. O programa de referência não as desenha nem quantifica;
 * o Statikos as quantifica (resumo de aço) e as desenha na prancha. [Comprimento e vãos do ábaco irregular pelo retângulo envolvente: a confirmar.]
 */
export function barrasBaseAbaco(b: Pick<BuildingModel, 'tabelas' | 'norma'>, l: Laje, ef: AbacoEfetivo, g: Pick<GeometriaBidirecional, 'i'>, base: BaseAbacoResolvida): BarrasBaseAbaco[] {
  const r = retanguloLocal(l, ef.poligono), cob = cobrimentoLaje(b as never, l.cobrimento).sup, out: BarrasBaseAbaco[] = [];
  for (const dir of [0, 1] as const) {
    // direção 0: barras ao longo de x local, uma por vão em y (intereixo g.i[0]); direção 1: ao longo de y, vão em x (g.i[1])
    const ao = dir === 0 ? r.x1 - r.x0 : r.y1 - r.y0, trans = dir === 0 ? r.y1 - r.y0 : r.x1 - r.x0, passo = dir === 0 ? g.i[0] : g.i[1];
    const vaos = Math.max(1, Math.round(trans / passo - 1e-9)), comprimento = Math.max(0.1, ao - 2 * cob);
    for (const face of ['inf', 'sup'] as const) {
      const bb = base[face];
      if (bb && bb.n > 0) out.push({ abaco: ef.abaco.id, dir, face, vaos, porVao: bb.n, phi: bb.phi, total: vaos * bb.n, comprimento: +comprimento.toFixed(3) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- nervuras que atravessam o ábaco

/** Trechos (distâncias ao longo de a→z, m) do segmento que estão dentro do polígono. */
export function trechosDentro(a: P, z: P, poly: P[]): [number, number][] {
  const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  if (L < 1e-9) return [];
  const ts = [0, 1];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], rx = z[0] - a[0], ry = z[1] - a[1], sx = q[0] - p[0], sy = q[1] - p[1], den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-14) continue;
    const t = ((p[0] - a[0]) * sy - (p[1] - a[1]) * sx) / den, u = ((p[0] - a[0]) * ry - (p[1] - a[1]) * rx) / den;
    if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < ts.length; k++) {
    if (ts[k + 1] - ts[k] < 1e-9) continue;
    const m = (ts[k] + ts[k + 1]) / 2;
    if (!dentroPoligono([a[0] + m * (z[0] - a[0]), a[1] + m * (z[1] - a[1])], poly)) continue;
    const ult = out.at(-1), t0 = ts[k] * L, t1 = ts[k + 1] * L;
    if (ult && Math.abs(ult[1] - t0) < 1e-7) ult[1] = t1; else out.push([t0, t1]);
  }
  return out;
}

/** Ábaco efetivo que contém o ponto, inclusive sobre a borda (o centro de um pilar de borda cai na borda do ábaco recortado); o de maior altura. */
export function abacoDoPonto(efs: AbacoEfetivo[], p: P): AbacoEfetivo | undefined {
  let melhor: AbacoEfetivo | undefined;
  for (const e of efs) if ((dentroPoligono(p, e.poligono) || distBordaContorno(p, e.poligono) < 1e-6) && (!melhor || e.abaco.hAbaco > melhor.abaco.hAbaco)) melhor = e;
  return melhor;
}

/** Resumo de um ábaco para a ferramenta `dimensionar`, o memorial e a janela da laje. */
export interface ResumoAbaco { id: string; laje: string; pilar?: string; automatico: boolean; hAbaco: number; area: number; largura: number; altura: number; rebaixo: number }
export function resumoAbaco(l: Laje, g: GeometriaBidirecional, ef: AbacoEfetivo): ResumoAbaco {
  const r = retanguloLocal(l, ef.poligono);
  return { id: ef.abaco.id, laje: l.id, ...(ef.abaco.pilar ? { pilar: ef.abaco.pilar } : {}), automatico: ef.abaco.automatico, hAbaco: ef.abaco.hAbaco, area: ef.area, largura: r.x1 - r.x0, altura: r.y1 - r.y0, rebaixo: Math.max(0, ef.abaco.hAbaco - g.h) };
}

// ---------------------------------------------------------------- diagnósticos

/** Esbeltez (lado maior ÷ lado menor do retângulo envolvente) a partir da qual um ábaco manual parece simular uma viga. */
export const ESBELTEZ_ABACO_VIGA = 4;

/**
 * Diagnósticos estáticos dos ábacos: ábaco em laje inexistente ou que não é nervurada bidirecional (`ABACO_FORA`, sem efeito), fora do
 * pano, altura menor que a da laje (`ABACO_ALTURA`) e ábaco manual comprido e estreito que parece simular uma viga (`ABACO_VIGA`;
 * confirme com `comoViga`): defina vigas em vez de ábacos; use o ábaco sempre em bordas livres.
 */
export function diagnosticosAbacos(b: BuildingModel): Diagnostico[] {
  const out: Diagnostico[] = [];
  for (const a of b.abacos ?? []) {
    const l = b.lajes.find((x) => x.id === a.laje);
    if (!l || l.tipo.tipo !== 'nervurada') { out.push({ codigo: 'ABACO_FORA', severidade: 'aviso', elementos: [a.id], mensagem: `Ábaco ${a.id}: a laje ${l ? l.nome : a.laje} ${l ? 'não é nervurada bidirecional' : 'não existe'}; o ábaco não tem efeito.` }); continue; }
    const g = geometriaBidirecional(b, l.tipo), ef = abacosEfetivos(b, l, g).find((x) => x.abaco.id === a.id);
    if (!ef) { out.push({ codigo: 'ABACO_FORA', severidade: 'aviso', elementos: [a.id, l.id], mensagem: `Ábaco ${a.id}: fica fora de ${l.nome}; não tem efeito.` }); continue; }
    if (a.hAbaco < l.tipo.hTotal - 1e-9) out.push({ codigo: 'ABACO_ALTURA', severidade: 'erro', elementos: [a.id, l.id], mensagem: `Ábaco ${a.id} de ${l.nome}: altura de ${(a.hAbaco * 100).toFixed(0)} cm menor que a da laje (${(l.tipo.hTotal * 100).toFixed(0)} cm); o ábaco tem a espessura do pano e pode descer abaixo dele.` });
    if (!a.automatico && !a.comoViga) {
      const r = retanguloLocal(l, ef.poligono), lado = [r.x1 - r.x0, r.y1 - r.y0];
      if (Math.max(...lado) >= ESBELTEZ_ABACO_VIGA * Math.min(...lado)) out.push({ codigo: 'ABACO_VIGA', severidade: 'aviso', elementos: [a.id, l.id], mensagem: `Ábaco ${a.id} de ${l.nome}: ${lado.map((x) => (x * 100).toFixed(0)).join(' × ')} cm, comprido e estreito. Não use ábaco para simular viga: defina a viga. Use o ábaco sempre em bordas livres (confirme com comoViga no ábaco se é de propósito).` });
    }
  }
  return out;
}
