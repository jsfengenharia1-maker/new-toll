// Gerador do modelo analítico (função pura): grelha de lajes e vigas por pavimento e pórtico espacial
// com diafragma rígido. Dois modelos (opção `modeloGlobal`, N2b):
// - integrado (padrão do sistema, como no programa de referência): a grelha de cada pavimento vira superelemento do
//   pórtico (condensação estática exata nos nós dos pilares, condensacao.ts); pórtico e lajes resolvidos juntos, com
//   os esforços das vigas e lajes incluindo as ações horizontais;
// - separado (premissa 20, o comportamento anterior): as lajes são resolvidas na grelha com molas nos pilares e as
//   forças que elas passam às vigas viram cargas do pórtico, junto com o peso das vigas, das paredes e dos pilares.
import { baseBarra, elementoBarra, fatorar3, resolver3, rigidezCondensada, type Barra3, type Caso3, type ElementoBarra, type Modelo3, type Resultado3, type V3 } from '../fe3d';
import { condensar, forcaFronteira, recuperarInternos, type Condensado } from '../condensacao';
import { spAdd, type SpRows } from '../math';
import { areaPoligono, dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { GAMA_CONCRETO, eixosDasVigas } from './lajes';
import { capaLaje, ehNervurada, geometriaNervurada, type FonteLajes } from './tiposLaje';
import { abacosEfetivos, alturaAbacoEm, arranjoNervuras, direcaoNervurada, geometriaBidirecional, lajeComAbacos, passoMalhaNervurada, propBarraNervurada, propBarraNervuradaMista } from './nervuradas';
import { cargasDoPano, engasteBordaAlveolar, fatorEngasteAproximado, geometriaAlveolar, processoDoPano } from './alveolares';
import { pilaresCoincidentes, textoPilarCoincidente } from './vinculoExterno';
import { inerciaT, mesaDaViga, propriedadesRigidez } from './secaoViga';
import { ehCurva } from './curvas';
import { cruzamentosDaBarra, DIST_MIN_EXTREMO } from './diagonais';
import { DESNIVEL_MIN, expandirInclinadas, ligacaoDaPonta, pontosDeLigacaoNaViga, saidaDoContorno, type Ligacao } from './inclinadas';
import { pavimentoAlvoComum } from './vigaComum';
import { cotaDaLaje, cotaDaViga, lajeInclinada, planoPor, TOL_INCLINACAO } from './planos';
import { casosVento, type CoefVento, type CasoVento, type Classe, type ZonaVento } from './vento';
import { opcoesEmUso, perfilDe, type OpcoesCalculo } from './opcoes';
import { concretoDe, flambagemLance, gamas } from './materiais';
import { barrasGeo, iterarPDelta, normalMedia } from '../pdelta3';
import { combinacoesDoEstado } from './combinacoes';
import { apoiosDosPilares, pilaresSobre } from './transicao';
import { geometriaParedes } from './pilarParede';
import { ppDaObra } from './paredesBase';
import { blocoDe, ehAlvenaria, resistenciaAlvenaria, tipoAlvenariaDe } from './alvenaria';
import { incluirParedes, reduzirCascas, type ParedesNoPortico } from './pilarParedeModelo';
import { calcularEscadas, comEscadas, type ResultadoEscadas } from './escadasCalculo';
import { avisosBaseElastica, forcaBasePilar, montarBaseElastica, type BaseElasticaAnalise } from './baseElastica';
import { pavimentosDoGrupo, anguloNoLance, centroPilar, contornoNoLance, contornoPilar, cotaFundacao, dimsSecao, ehArranque, engasteNoLance, geoLance, inicioDe, lanceNoPavimento, lancesDoPilar, pavimentosOrdenados, secaoNoLance, casosDaObra, casoUsoDoGrupo, type BuildingModel, type Laje, type Pilar, type SecaoPilar, type Viga, centroNoLance } from './types';

/** Opções de cálculo em uso + coeficiente de Poisson (NBR 6118, 8.2.9). */
export type OpcoesAnalise = OpcoesCalculo & { nu: number };

/** Caso de carga: G, Q ou id de um caso adicional (casosDaObra). */
export type CasoAnalise = string;

// ---------------- malha da laje ----------------

/** Malha de uma laje: linhas paralelas às direções da laje, recortadas pelo contorno. */
export function malhaLaje(contorno: P[], direcao: number, s: number, furos: P[][] = []) {
  const a = (direcao * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  const loc = (p: P): P => [p[0] * c + p[1] * sn, -p[0] * sn + p[1] * c];
  const glob = (p: P): P => [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c];
  const pol = contorno.map(loc);
  const aneis = [pol, ...furos.map((f) => f.map(loc))]; // contorno e aberturas: a regra par-ímpar deixa os furos de fora
  const xs = pol.map((p) => p[0]), ys = pol.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const nx = Math.max(2, Math.round((x1 - x0) / s)), ny = Math.max(2, Math.round((y1 - y0) / s));
  const sx = (x1 - x0) / nx, sy = (y1 - y0) / ny;
  const X = Array.from({ length: nx - 1 }, (_, i) => x0 + (i + 1) * sx), Y = Array.from({ length: ny - 1 }, (_, j) => y0 + (j + 1) * sy);
  /** Trechos internos da reta (coordenada fixa `v` no eixo `eixo`) dentro do polígono. */
  const cortes = (eixo: 0 | 1, v: number): [number, number][] => {
    const t: number[] = [];
    for (const anel of aneis) for (let i = 0; i < anel.length; i++) {
      const p = anel[i], q = anel[(i + 1) % anel.length];
      if ((p[eixo] > v) !== (q[eixo] > v)) t.push(p[1 - eixo] + ((v - p[eixo]) * (q[1 - eixo] - p[1 - eixo])) / (q[eixo] - p[eixo]));
    }
    t.sort((u, w) => u - w);
    const out: [number, number][] = [];
    for (let k = 0; k + 1 < t.length; k += 2) if (t[k + 1] - t[k] > 1e-6) out.push([t[k], t[k + 1]]);
    return out;
  };
  // linhas: dir = 0 → paralela a x local (direção da laje); 1 → paralela a y local
  const linhas: { dir: 0 | 1; largura: number; pontos: P[]; borda: [boolean, boolean] }[] = [];
  for (const y of Y) for (const [a0, a1] of cortes(1, y)) {
    const ps = [a0, ...X.filter((x) => x > a0 + 1e-9 && x < a1 - 1e-9), a1];
    linhas.push({ dir: 0, largura: sy, pontos: ps.map((x) => glob([x, y])), borda: [true, true] });
  }
  for (const x of X) for (const [a0, a1] of cortes(0, x)) {
    const ps = [a0, ...Y.filter((y) => y > a0 + 1e-9 && y < a1 - 1e-9), a1];
    linhas.push({ dir: 1, largura: sx, pontos: ps.map((y) => glob([x, y])), borda: [true, true] });
  }
  // faixas junto ao contorno (meia malha) que as linhas internas não cobrem: área por direção
  const A = Math.abs(areaPoligono(contorno)) - furos.reduce((t, f) => t + Math.abs(areaPoligono(f)), 0);
  const banda = [0, 1].map((d) => Math.max(0, A - linhas.filter((l) => l.dir === d).reduce((s1, l) => s1 + l.largura * comp(l.pontos), 0)));
  // contorno dividido nas pontas das linhas (nós de borda)
  const pontasBorda = linhas.flatMap((l) => [l.pontos[0], l.pontos[l.pontos.length - 1]]);
  const bordas: { a: P; z: P }[] = [];
  for (const anel of [contorno, ...furos]) for (let i = 0; i < anel.length; i++) {
    const a = anel[i], z = anel[(i + 1) % anel.length], L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (L < 1e-9) continue;
    const ts = [0, 1, ...pontasBorda.map((p) => {
      const t = ((p[0] - a[0]) * (z[0] - a[0]) + (p[1] - a[1]) * (z[1] - a[1])) / (L * L);
      const q: P = [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])];
      return t > 1e-9 && t < 1 - 1e-9 && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6 ? t : -1;
    }).filter((t) => t > 0)].sort((u, w) => u - w);
    for (let k = 0; k + 1 < ts.length; k++) if ((ts[k + 1] - ts[k]) * L > 1e-6)
      bordas.push({ a: [a[0] + ts[k] * (z[0] - a[0]), a[1] + ts[k] * (z[1] - a[1])], z: [a[0] + ts[k + 1] * (z[0] - a[0]), a[1] + ts[k + 1] * (z[1] - a[1])] });
  }
  /** Carga por comprimento de cada borda para receber a faixa da direção d (proporcional a |borda · direção|). */
  const u = [[c, sn], [-sn, c]];
  const pesoBorda = [0, 1].map((d) => {
    const soma = bordas.reduce((s1, e) => s1 + Math.abs((e.z[0] - e.a[0]) * u[d][0] + (e.z[1] - e.a[1]) * u[d][1]), 0);
    return bordas.map((e) => { const L = Math.hypot(e.z[0] - e.a[0], e.z[1] - e.a[1]); return soma ? (banda[d] * Math.abs(((e.z[0] - e.a[0]) * u[d][0] + (e.z[1] - e.a[1]) * u[d][1]) / L)) / soma : 0; });
  });
  return { linhas, bordas, pesoBorda, sx, sy };
}
const comp = (ps: P[]) => ps.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - ps[i][0], p[1] - ps[i][1]), 0);

// ---------------- propriedades ----------------

const ret = (b: number, h: number) => ({ A: b * h, I: (b * h ** 3) / 12, J: torcaoRet(b, h) });
/** Constante de torção de retângulo (aproximação de Saint-Venant). */
export function torcaoRet(b: number, h: number) {
  const a = Math.max(b, h), c = Math.min(b, h);
  return a * c ** 3 * (1 / 3 - 0.21 * (c / a) * (1 - c ** 4 / (12 * a ** 4)));
}
/** Fator do EI vertical das vigas de amarração (K1.4.28: o programa de referência usa 10⁻¹⁵) [a confirmar]. */
export const FATOR_EI_AMARRACAO = 1e-15;
/** Penalidade do plano e da área das vigas de amarração (premissa do projeto: × 10⁶). */
const PENALIDADE_AMARRACAO = 1e6;
/** Barra 3D de uma viga: seção (com mesa colaborante, se a opção valer), torção e rigidezes das vigas de amarração. */
function propsBarraViga(b: BuildingModel, v: Viga, op: OpcoesAnalise) {
  const s = ret(v.secao.b, v.secao.h), pr = propriedadesRigidez(v, mesaDaViga(b, v), op);
  const out = { A: pr.A, Iz: pr.Iz, Iy: pr.Iy, J: torcaoDe(v, op) * s.J };
  // viga pré-fabricada de ficha (E2e): rigidez à flexão vertical informada (EI, kN·m²)
  const ei = v.premoldada?.tipo === 'ficha' ? v.premoldada.ficha?.EI : undefined;
  if (ei && ei > 0) out.Iz = ei / (concretoDe(b, 'viga').Ecs * 1000);
  if (v.amarracao) { out.Iz *= FATOR_EI_AMARRACAO; out.A *= PENALIDADE_AMARRACAO; out.Iy *= PENALIDADE_AMARRACAO; }
  // vínculo externo (E2e, K1.4.29): EI × fator, plano e EA rígidos (× 10⁶)
  if (v.vinculoExterno) { out.Iz *= op.vinculoExternoFatorEI; out.A *= PENALIDADE_AMARRACAO; out.Iy *= PENALIDADE_AMARRACAO; }
  return out;
}
/** Peso próprio da viga (kN/m): o da ficha do fabricante (pré-fabricada, E2e) ou o da seção de concreto. */
export const pesoLinearViga = (v: Viga) => (v.premoldada?.tipo === 'ficha' && v.premoldada.ficha?.peso !== undefined ? v.premoldada.ficha.peso : GAMA_CONCRETO * v.secao.b * v.secao.h);

/** Inércias do pilar em torno dos eixos globais X e Y (seção girada de `angulo`). */
export function inerciasPilar(s: SecaoPilar, angulo: number): { Ix: number; Iy: number; Iu: number; Iv: number; A: number; J: number } {
  if (s.tipo === 'circ') { const I = (Math.PI * s.d ** 4) / 64; return { Ix: I, Iy: I, Iu: I, Iv: I, A: (Math.PI * s.d ** 2) / 4, J: 2 * I }; }
  const Iu = (s.h * s.b ** 3) / 12, Iv = (s.b * s.h ** 3) / 12; // Iu: flexão com deslocamento na direção b (local x da seção)
  const a = (angulo * Math.PI) / 180, c2 = Math.cos(2 * a);
  // em torno de X global (deslocamento em Y) e de Y global (deslocamento em X)
  const Iy = (Iu + Iv) / 2 + ((Iu - Iv) / 2) * c2, Ix = (Iu + Iv) / 2 - ((Iu - Iv) / 2) * c2;
  return { Ix, Iy, Iu, Iv, A: s.b * s.h, J: torcaoRet(s.b, s.h) };
}

// ---------------- geometria comum: nós das vigas por pavimento ----------------

interface NoPlanta { p: P; viga: boolean; pilar?: string }
interface TrechoViga { viga: Viga; a: number; z: number } // índices dos nós

/** Divide os eixos das vigas nos pontos dados (interseções, bordas da malha e apoios). */
function dividirVigas(vigas: Viga[], eixos: [P, P][], extras: P[], tol = 0.005) {
  const nos: NoPlanta[] = [];
  const hash = new Map<string, number[]>();
  /** Nó existente a até `tol` de p, ou um novo (marcado como da viga ou só da laje). */
  const achar = (p: P, viga = true) => {
    const gx = Math.round(p[0] / tol), gy = Math.round(p[1] / tol);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const i of hash.get(`${gx + dx}:${gy + dy}`) ?? []) if (Math.hypot(nos[i].p[0] - p[0], nos[i].p[1] - p[1]) <= tol) return i;
    nos.push({ p: [p[0], p[1]], viga });
    const k = `${gx}:${gy}`;
    const l = hash.get(k); if (l) l.push(nos.length - 1); else hash.set(k, [nos.length - 1]);
    return nos.length - 1;
  };
  // eixos já ajustados (pontas no eixo da viga de apoio): uma entrada por trecho de viga, na mesma ordem
  const trechos: TrechoViga[] = [];
  let k = 0;
  for (const v of vigas) for (let i = 0; i + 1 < v.pontos.length; i++) {
    const [a, z] = eixos[k++];
    const L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (L < tol) continue;
    const ts = new Set<number>([0, 1]);
    const marca = (p: P) => {
      const t = ((p[0] - a[0]) * (z[0] - a[0]) + (p[1] - a[1]) * (z[1] - a[1])) / (L * L);
      const q: P = [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])];
      if (t > -1e-9 && t < 1 + 1e-9 && Math.hypot(q[0] - p[0], q[1] - p[1]) <= tol) ts.add(Math.min(1, Math.max(0, t)));
    };
    for (const [c, f] of eixos) { // interseções com outros eixos
      const r = [z[0] - a[0], z[1] - a[1]], sv = [f[0] - c[0], f[1] - c[1]], den = r[0] * sv[1] - r[1] * sv[0];
      if (Math.abs(den) < 1e-12) continue;
      const t = ((c[0] - a[0]) * sv[1] - (c[1] - a[1]) * sv[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
      if (t > -1e-9 && t < 1 + 1e-9 && u > -1e-9 && u < 1 + 1e-9) ts.add(Math.min(1, Math.max(0, t)));
    }
    for (const p of extras) marca(p);
    const lista = [...ts].sort((x, y) => x - y).filter((t, j, arr) => j === 0 || (t - arr[j - 1]) * L > tol);
    const ids = lista.map((t) => achar([a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])]));
    for (let j = 0; j + 1 < ids.length; j++) if (ids[j] !== ids[j + 1]) trechos.push({ viga: v, a: ids[j], z: ids[j + 1] });
  }
  return { nos, trechos, achar };
}

/** Ponto do eixo da viga mais próximo do centro do pilar, se estiver dentro da seção. */
function pontoApoio(trechos: TrechoViga[], nos: NoPlanta[], pil: Pilar, sec: SecaoPilar): P[] {
  const cont = contornoPilar(pil, sec), c = centroPilar(pil, sec);
  const out: P[] = [];
  for (const t of trechos) {
    const a = nos[t.a].p, z = nos[t.z].p, dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
    const u = Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / L2));
    const q: P = [a[0] + u * dx, a[1] + u * dy];
    // o contorno do pilar conta como dentro (tolerância de 1 µm): nó da malha exatamente na face não pode depender do lado (a regra par-ímpar sozinha é assimétrica)
    if (dentroPoligono(q, cont) || Math.hypot(q[0] - c[0], q[1] - c[1]) < 1e-6 || distPoligono(q, cont) < 1e-6) out.push(q);
  }
  return out;
}

// ---------------- análise ----------------

export interface BarraGrelha { tipo: 'laje' | 'viga'; ref: string; dir?: 0 | 1; largura?: number }
export interface GrelhaPavimento {
  pavimento: string;
  modelo: Modelo3;
  barras: BarraGrelha[];
  res: Resultado3 | null;
  /** Reações verticais (kN, para cima) por pilar e caso. */
  reacoes: Record<string, Record<CasoAnalise, number>>;
  carga: Record<CasoAnalise, number>;
  /** Casos verticais da grelha (N2f: recomposição com a rigidez fissurada das lajes). */
  casos?: Caso3[];
  /** Modelo integrado: a grelha foi resolvida junto com o pórtico (superelemento). */
  integrado?: boolean;
  /** Modelo integrado: momentos (Mx, My globais, kN·m) que a laje transmite a cada pilar, por caso (inclusive vento). */
  momentos?: Record<string, Record<string, [number, number]>>;
}

/** Modelo-base da grelha de um grupo (malha, barras, cargas e apoios), comum aos pavimentos com os mesmos pilares. */
interface GrelhaBase {
  m: Modelo3; tags: BarraGrelha[]; casos: Caso3[];
  /** Nó da planta → pilar (apoio das vigas ou nó do pilar sem viga). */
  apoio: Map<number, string>;
  /** Nó da planta → pilar que nasce ali sobre viga ou laje (E1a): nó exposto na grelha integrada, sem apoio. */
  transicao: Map<number, string>;
  /** Nó da planta → nó da grelha. */
  idx: Map<number, number>;
  nos: NoPlanta[]; trechos: TrechoViga[]; grosso: { nos: NoPlanta[]; trechos: TrechoViga[]; achar: (p: P, viga?: boolean) => number };
  carga: Record<CasoAnalise, number>; avisos: string[];
  /** Barra da grelha → trecho de viga (null nas lajes). */
  trechoDe: (TrechoViga | null)[];
  /** Pilares presentes no pavimento. */
  pilares: string[];
  /** Nós da planta sobre vigas associadas de viga comum (E2b): linha de apoio vertical da laje, reação levada à viga de origem. */
  linhaComum: Set<number>;
  /**
   * Panos e vigas inclinados (E3f, só no modelo integrado): barras da grelha que vão ao pórtico como barras 3D (1), cota de
   * cada nó da grelha em relação ao pavimento (m), normal do plano de cada barra de laje inclinada e fator da largura verdadeira.
   */
  inc?: { barra: Uint8Array; z: Float64Array; normal: (V3 | null)[]; fator: Float64Array };
}

/** Grelha do modelo integrado: associação dos nós aos pilares, barras com trecho rígido e a condensação. */
interface IntegradoGrelha {
  erro?: string;
  /** Pilares da fronteira (3 gdl cada: uz, rx, ry) e os centros das suas seções no pavimento. */
  pils: string[]; centros: P[];
  /** Nó da grelha → índice do pilar associado (−1 = nó interno). */
  assoc: Int32Array;
  /** Nó da grelha → índice do nó interno (−1 = associado). */
  interno: Int32Array;
  ni: number;
  barras: Barra3[]; elems: ElementoBarra[];
  cond: Condensado;
  /** Raiz da ligação pelo diafragma (lajes e vigas do diafragma) e nós tocados por lajes. */
  uniao: Int32Array; comLaje: Uint8Array;
  /** Cargas distribuídas por barra, por caso. */
  distDe: Map<number, V3[]>[];
  /** Condensação com a rigidez reduzida do γz (calculada na primeira vez). */
  reduzida: () => Condensado;
  /** A mesma rigidez reduzida com as cargas dos casos condensadas (P-Δ, N2c). */
  reduzidaCargas: () => Condensado;
  /** Por barra, (k·T) restrita aos gdl uz, rx, ry das duas pontas (12 × 6, por linhas). */
  kt: Float64Array[];
  /** E3f: nó da grelha no superelemento (1) ou só nas barras inclinadas (0, vai ao pórtico com 6 gdl). */
  noSE: Uint8Array;
  /** E3f: nó da grelha → índice da junção (nó de fronteira fora de pilar onde barras inclinadas encontram a grelha), ou −1. */
  juncao: Int32Array;
  /** E3f: nó da grelha de cada junção, na ordem da fronteira (depois dos pilares). */
  nosJuncao: number[];
  /** E3f: nó da grelha → índice do pilar em `GrelhaBase.pilares` (todos os nós dentro de um pilar), ou −1. */
  pilarDe: Int32Array;
  /** E3f: desnível do topo dos pilares que só recebem barras inclinadas (o nó do pórtico sobe ao plano). */
  zPilar: Map<string, number>;
  /** Número de barras da grelha no superelemento. */
  nH: number;
}

/** Deslocamentos da grelha (6 por nó; só uz, rx e ry) a partir dos gdl dos pilares da fronteira e do caso (ou sem carga). */
function deslocGrelha(gb: GrelhaBase, ig: IntegradoGrelha, uB: ArrayLike<number>, k?: number, nos?: number[]): Float64Array {
  const nn = gb.m.nos.length, ug = new Float64Array(nn * 6);
  if (nos) {
    // só alguns nós (as pontas das vigas, no vento): linhas de X desses nós
    const c = ig.cond, nb = c.nb;
    for (const n of nos) {
      const a = ig.assoc[n];
      if (a >= 0) { const dx = gb.m.nos[n][0] - ig.centros[a][0], dy = gb.m.nos[n][1] - ig.centros[a][1]; ug[n * 6 + 2] = uB[3 * a] + uB[3 * a + 1] * dy - uB[3 * a + 2] * dx; ug[n * 6 + 3] = uB[3 * a + 1]; ug[n * 6 + 4] = uB[3 * a + 2]; continue; }
      if (ig.juncao[n] >= 0) { const o = 3 * (ig.pils.length + ig.juncao[n]); ug[n * 6 + 2] = uB[o]; ug[n * 6 + 3] = uB[o + 1]; ug[n * 6 + 4] = uB[o + 2]; continue; }
      if (!ig.noSE[n]) continue;
      for (let g = 0; g < 3; g++) { const i = 3 * ig.interno[n] + g; let s = k === undefined ? 0 : c.Z[k][i]; for (let b = 0; b < nb; b++) s -= c.X[i * nb + b] * uB[b]; ug[n * 6 + 2 + g] = s; }
    }
    return ug;
  }
  const uI = recuperarInternos(ig.cond, uB, k);
  for (let n = 0; n < nn; n++) {
    const a = ig.assoc[n];
    // E3f: junção = gdl de fronteira; nó só de barras inclinadas fica para o pórtico
    if (a < 0 && ig.juncao[n] >= 0) { const o = 3 * (ig.pils.length + ig.juncao[n]); ug[n * 6 + 2] = uB[o]; ug[n * 6 + 3] = uB[o + 1]; ug[n * 6 + 4] = uB[o + 2]; continue; }
    if (a < 0 && !ig.noSE[n]) continue;
    if (a < 0) { const o = 3 * ig.interno[n]; ug[n * 6 + 2] = uI[o]; ug[n * 6 + 3] = uI[o + 1]; ug[n * 6 + 4] = uI[o + 2]; continue; }
    const dx = gb.m.nos[n][0] - ig.centros[a][0], dy = gb.m.nos[n][1] - ig.centros[a][1];
    ug[n * 6 + 2] = uB[3 * a] + uB[3 * a + 1] * dy - uB[3 * a + 2] * dx; ug[n * 6 + 3] = uB[3 * a + 1]; ug[n * 6 + 4] = uB[3 * a + 2];
  }
  return ug;
}

/** Esforços de extremidade de uma barra da grelha integrada (deslocamentos só fora do plano) e as forças de engastamento. */
function esforcosGrelha(ig: IntegradoGrelha, bi: number, ug: Float64Array, f0?: number[], f = new Float64Array(12)): Float64Array {
  const e = ig.elems[bi], kt = ig.kt[bi], d = e.dofs;
  const u0 = ug[d[2]], u1 = ug[d[3]], u2 = ug[d[4]], u3 = ug[d[8]], u4 = ug[d[9]], u5 = ug[d[10]];
  for (let r = 0; r < 12; r++) { const o = r * 6; f[r] = kt[o] * u0 + kt[o + 1] * u1 + kt[o + 2] * u2 + kt[o + 3] * u3 + kt[o + 4] * u4 + kt[o + 5] * u5 + (f0 ? f0[r] : 0); }
  return f;
}

/**
 * Modelo integrado sem condensação (para os testes e a validação externa): o pórtico resolvido sem as vigas só no plano,
 * mais todas as barras das grelhas, com os nós só de laje escravos do diafragma e os nós associados pelo trecho rígido.
 */
function modeloCheio(pmV: Modelo3, casosV: Caso3[], detalhes: { pav: string; gb: GrelhaBase; ig: IntegradoGrelha; colNo: number[]; noP: Map<number, number>; porRaiz: Map<number, number>; jNo: number[] }[], ps: { id: string; cota: number }[], CASOS: string[]) {
  const m: Modelo3 = { nos: pmV.nos.map((p) => [...p] as V3), barras: [], apoios: new Map(pmV.apoios), escravos: [...(pmV.escravos ?? [])], molas: [...(pmV.molas ?? [])] };
  const casos: Caso3[] = casosV.map((c) => ({ nodais: c.nodais.map((n) => ({ no: n.no, f: [...n.f] })), distribuidas: [], pontuais: [] }));
  const novo = new Map<number, number>();
  pmV.barras.forEach((br, i) => { if (br.soPlano) return; novo.set(i, m.barras.length); const { soPlano: _s, ...rest } = br; m.barras.push(rest); });
  casosV.forEach((c, ic) => {
    for (const d of c.distribuidas) { const k = novo.get(d.barra); if (k !== undefined) casos[ic].distribuidas.push({ barra: k, q: d.q }); }
    for (const p of c.pontuais ?? []) { const k = novo.get(p.barra); if (k !== undefined) casos[ic].pontuais!.push({ ...p, barra: k }); }
  });
  const mestreDe = new Map((pmV.escravos ?? []).map((e) => [e.no, e.mestre]));
  const noGrelha: Record<string, number[]> = {};
  for (const { pav, gb, ig, colNo, noP, porRaiz, jNo } of detalhes) {
    const z = ps.find((p) => p.id === pav)!.cota, nn = gb.m.nos.length, mapa: number[] = [];
    for (let n = 0; n < nn; n++) {
      const k = ig.assoc[n];
      if (k >= 0) { mapa.push(colNo[k]); continue; }
      // E3f: junção (já é nó do pórtico) e nó só das barras inclinadas (já no pórtico, fora da grelha)
      if (ig.juncao[n] >= 0) { mapa.push(jNo[ig.juncao[n]]); continue; }
      if (!ig.noSE[n]) { mapa.push(-1); continue; }
      let j = noP.get(n);
      if (j === undefined) {
        j = m.nos.length;
        m.nos.push([gb.m.nos[n][0], gb.m.nos[n][1], z]);
        const r = porRaiz.get(ig.uniao[n]), mt = r !== undefined ? mestreDe.get(r) : undefined;
        if (mt !== undefined) m.escravos!.push({ no: j, mestre: mt }); else m.apoios.set(j, [0, 1, 5]);
      }
      mapa.push(j);
    }
    noGrelha[pav] = mapa;
    const off = (n: number, o: V3 | undefined): V3 | undefined => { const k = ig.assoc[n]; return k < 0 ? o : [gb.m.nos[n][0] - ig.centros[k][0] + (o?.[0] ?? 0), gb.m.nos[n][1] - ig.centros[k][1] + (o?.[1] ?? 0), 0]; };
    /** Carga vertical (e momentos) num nó da grelha: no nó associado, levada ao nó do pilar com o momento do braço. */
    const carga = (ic: number, n: number, f: number[]) => {
      const k = ig.assoc[n];
      if (k < 0) { casos[ic].nodais.push({ no: mapa[n], f: [0, 0, f[2], f[3], f[4], 0] }); return; }
      const dx = gb.m.nos[n][0] - ig.centros[k][0], dy = gb.m.nos[n][1] - ig.centros[k][1];
      casos[ic].nodais.push({ no: mapa[n], f: [0, 0, f[2], f[3] + dy * f[2], f[4] - dx * f[2], 0] });
    };
    ig.barras.forEach((br, bi) => {
      if (gb.inc?.barra[bi]) return; // E3f: barra inclinada já está no pórtico
      const i = mapa[br.i], j = mapa[br.j], oI = off(br.i, br.offI), oJ = off(br.j, br.offJ);
      const nb: Barra3 = { ...br, i, j };
      delete nb.offI; delete nb.offJ;
      if (oI) nb.offI = oI;
      if (oJ) nb.offJ = oJ;
      if (i === j) { const L = Math.hypot((oJ?.[0] ?? 0) - (oI?.[0] ?? 0), (oJ?.[1] ?? 0) - (oI?.[1] ?? 0)); if (L < 1e-9) return; }
      const k = m.barras.length;
      m.barras.push(nb);
      ig.distDe.forEach((mp, ic) => { for (const q of mp.get(bi) ?? []) casos[ic].distribuidas.push({ barra: k, q }); });
      const t = gb.trechoDe[bi], ig0 = CASOS.indexOf('G');
      if (t && ig0 >= 0) for (const [o2, n] of [[br.offI, br.i], [br.offJ, br.j]] as const) if (o2) carga(ig0, n, [0, 0, -pesoLinearViga(t.viga) * Math.hypot(o2[0], o2[1]), 0, 0, 0]);
    });
    gb.casos.forEach((cs, ic) => { for (const nd of cs.nodais) if (ig.noSE[nd.no]) carga(ic, nd.no, nd.f); });
  }
  return { modelo: m, casos, noGrelha };
}

/** Cópia do modelo sem as funções de recuperação dos superelementos (o resultado vai do worker para a interface). */
const semFuncoes = (m: Modelo3): Modelo3 => (m.superelementos ? { ...m, superelementos: m.superelementos.map(({ dofs, K }) => ({ dofs, K })) } : m);

/** Distância de um ponto ao contorno de um polígono. */
function distPoligono(p: P, c: P[]) {
  let d = Infinity;
  for (let i = 0; i < c.length; i++) d = Math.min(d, distSeg(p, c[i], c[(i + 1) % c.length]));
  return d;
}

/** Zona independente de um pavimento no pórtico: nó de aplicação (mestre, ou o próprio nó isolado) e nós da zona. */
export interface ZonaPortico extends ZonaVento { no: number; nos: number[] }

/**
 * Deslocamentos laterais por direção do vento (NBR 6118, 13.3, Tabela 13.3): combinação frequente ψ1·W,
 * com a rigidez do pórtico (Ecs, seção bruta). Por pavimento, o maior deslocamento dos topos dos pilares
 * na direção do vento (m) e o maior deslocamento relativo entre pavimentos de um mesmo pilar.
 */
export interface DeslocamentosVento {
  direcao: number; caso: string; psi1: number;
  pavimentos: { pavimento: string; z: number; u: number; drift: number; hi: number; limDrift: number }[];
  H: number; topo: number; limTopo: number; ok: boolean;
}

/** Barra do pórtico: viga, pilar ou da base elástica (FU6: radier ou viga sobre base elástica; `pavimento` = 'fundacao'). */
export interface BarraPortico {
  tipo: 'viga' | 'pilar' | 'fundacao' | 'parede' | 'inclinada' | 'diagonal' | 'laje'; ref: string; pavimento: string;
  /** Modelo integrado: barra da divisão fina da viga (esforços da grelha condensada; poucas estações no dimensionamento). */
  fina?: boolean;
  /** Primeiro lance de pilar apoiado (E1a): em que elemento a base se apoia no modelo. */
  transicao?: 'pilar' | 'viga' | 'laje';
}
/** Viga inclinada no pórtico (E2c): barra `bi` de `portico.modelo`, comprimento entre as pontas e da parte flexível, nós e ligações das pontas. */
export interface InclinadaNoPortico { id: string; ref: string; nome: string; pavimento: string; pavimentoFim: string; bi: number; L: number; Lf: number; angulo: number; nos: [number, number]; ligacao: [Ligacao, Ligacao];
  /** Diagonal de contraventamento (E2d). */
  diagonal?: boolean;
  /** Diagonal dividida nos cruzamentos: barras do pórtico em ordem (`bi` é a primeira) e o número de nós gerados; `Lf` é o total. */
  segs?: { bi: number; Lf: number }[]; cruzamentos?: number }
export interface AnaliseEdificio {
  erro?: string;
  avisos: string[];
  opcoes: OpcoesAnalise;
  grelhas: GrelhaPavimento[];
  portico: {
    modelo: Modelo3; barras: BarraPortico[]; mestres: Record<string, number>; zonas: Record<string, ZonaPortico[]>; res: Resultado3 | null; resVento?: Resultado3 | null; casos?: Caso3[]; casosVento?: Caso3[];
    /** P-Δ (N2c): esforços no modelo de cálculo das forças fictícias de 2ª ordem, um caso por combinação ELU (segundaOrdem.combinacoes[].caso). */
    resPDelta?: Resultado3; casosPDelta?: Caso3[];
  };
  /** 2ª ordem global por P-Δ (N2c, opção segundaOrdem = 1): por combinação ELU, iterações, convergência e amplificação dos deslocamentos horizontais. */
  segundaOrdem?: { metodo: 'pDelta'; combinacoes: { nome: string; caso?: string; iteracoes: number; convergiu: boolean; amplificacao: number; erro?: string }[]; amplificacaoMax: number; iteracoesMax: number; ms: number };
  /** Vigas inclinadas (E2c) e diagonais de contraventamento (E2d) que entraram no pórtico. */
  inclinadas?: InclinadaNoPortico[];
  /** Panos e vigas em planos inclinados (E3f) por pavimento: barras do pórtico (3D, fora do diafragma salvo `planoDiafragma`). */
  planos?: { pavimento: string; barras: number[] }[];
  /** Base elástica (FU6): nós com molas, barras do radier e das vigas sobre base elástica e pilares sem vínculo externo. */
  baseElastica?: BaseElasticaAnalise;
  /** Pilares-parede (E1b): cascas, nós das fatias do topo, nós da base e centro de cada um. */
  paredes?: ParedesNoPortico;
  /** Pilares que nascem apoiados (E1a): elemento de apoio detectado e se o pé foi ligado a ele (senão, apoio fixo provisório). */
  apoiados?: Record<string, { apoio: 'pilar' | 'viga' | 'laje' | null; ligado: boolean }>;
  /** Esforços na base de cada pilar por caso (G, Q, W…; kN, kN·m; N > 0 compressão). */
  fundacao: { pilar: string; caso: string; N: number; Vx: number; Vy: number; Mx: number; My: number }[];
  /** Vento (NBR 6123) e estabilidade global (γz por direção, com rigidez reduzida). */
  vento: { classe: Classe; altura: number; ca?: CoefVento; viz?: CoefVento; casos: CasoVento[]; gamaZ: { direcao: number; ventoPrincipal: number; usoPrincipal: number; max: number; ampliacao: number }[]; deslocamentos?: DeslocamentosVento[] } | null;
  /** Carga vertical característica por pavimento (kN), usada no γz. */
  cargasPavimento: Record<string, Record<CasoAnalise, number>>;
  /** Carga vertical total por caso (kN). */
  totais: Record<CasoAnalise, number>;
  /** Ids dos casos analisados, na ordem dos resultados (G, Q e adicionais). */
  casos: CasoAnalise[];
  gdl: number;
  ms: number;
  /** Escadas (E4c): cálculo à parte de cada lance; as reações entram como cargas lineares e de superfície na análise (só com escadas). */
  escadas?: ResultadoEscadas;
  /**
   * Só com `analisarEdificio(b, o, { cheio: true })` (testes e validação externa): o modelo integrado montado sem
   * condensação (todas as barras das grelhas no pórtico) e os casos verticais, para conferir o superelemento.
   */
  cheio?: { modelo: Modelo3; casos: Caso3[]; noGrelha: Record<string, number[]> };
}

/**
 * Cargas dos arranques (pilares que nascem e morrem na fundação) por caso, como reações na base (N > 0 compressão):
 * as cargas lançadas no topo do arranque, com sinal de reação nos esforços horizontais e momentos.
 */
export function reacoesArranques(b: BuildingModel): AnaliseEdificio['fundacao'] {
  const out: AnaliseEdificio['fundacao'] = [];
  const casos = casosDaObra(b).map((c) => c.id);
  for (const p of b.pilares) {
    if (!ehArranque(p)) continue;
    const cps = (b.cargasPilar ?? []).filter((c) => c.pilar === p.id);
    if (!cps.length) continue;
    for (const c of casos) {
      const xs = cps.filter((x) => x.caso === c);
      const s = (k: 'N' | 'Hx' | 'Hy' | 'Mx' | 'My') => xs.reduce((t, x) => t + x[k], 0);
      out.push({ pilar: p.id, caso: c, N: s('N'), Vx: -s('Hx'), Vy: -s('Hy'), Mx: -s('Mx'), My: -s('My') });
    }
  }
  return out;
}

export function analisarEdificio(b: BuildingModel, o: Partial<OpcoesAnalise> = {}, extra: { cheio?: boolean } = {}): AnaliseEdificio {
  // escadas (E4c, C8.52): calculadas primeiro, à parte; as reações viram cargas nos elementos de apoio. Sem escada, nada muda.
  if (!b.escadas?.length) return analisarSemEscadas(b, o, extra);
  const esc = calcularEscadas(b), r = analisarSemEscadas(comEscadas(b, esc), o, extra);
  r.avisos.push(...esc.avisos);
  return { ...r, escadas: esc };
}

function analisarSemEscadas(b: BuildingModel, o: Partial<OpcoesAnalise> = {}, extra: { cheio?: boolean } = {}): AnaliseEdificio {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const op: OpcoesAnalise = { ...opcoesEmUso(b.opcoes, perfilDe(b)), nu: 0.2, ...o };
  // módulo Ecs (kN/m²) por tipo de elemento e, nos pilares, por lance (fck por elemento: materiais.ts)
  const Em = (t: 'laje' | 'viga' | 'pilar', pav?: string, pil?: Pilar) => concretoDe(b, t, pav, pil).Ecs * 1000, Gm = (e: number) => e / (2 * (1 + op.nu));
  const Ev = Em('viga'), Gv = Gm(Ev), El = Em('laje'), Gl = Gm(El);
  const avisos: string[] = [];
  const ps = pavimentosOrdenados(b);
  /** Consolos (E2e): a viga apoiada fica sem momento na face do pilar; vigas pré-moldadas articuladas por padrão. */
  const consolosAtivos = (b.consolos ?? []).filter((c) => b.vigas.some((v) => v.id === c.viga) && b.pilares.some((p) => p.id === c.pilar));
  const ctxPontas: CtxPontas = { consolos: new Set(consolosAtivos.map((c) => `${c.viga}|${c.pilar}`)), pmArt: !!op.premoldadaArticulada };
  const consoloEm = (vigaId: string, pilarId: string) => (op.consoloExcentricidade ? consolosAtivos.find((c) => c.viga === vigaId && c.pilar === pilarId) : undefined);
  /** Pilares apoiados (E1a): apoio detectado de cada um e os pilares que se apoiam em cada pilar. */
  const apoios = apoiosDosPilares(b), sobreDe = pilaresSobre(b, apoios);
  /** Posição e seção do pilar no pavimento: a do lance que chega a ele (no pavimento em que nasce apoiado, a do primeiro lance). */
  const geoEm = (p: Pilar, pavId: string) => geoLance(p, lanceNoPavimento(b, p, pavId) ?? pavId);
  const vazio: AnaliseEdificio = { avisos, opcoes: op, casos: casosDaObra(b).map((c) => c.id), grelhas: [], portico: { modelo: { nos: [], barras: [], apoios: new Map() }, barras: [], mestres: {}, zonas: {}, res: null }, fundacao: [], vento: null, cargasPavimento: {}, totais: { G: 0, Q: 0 }, gdl: 0, ms: 0 };
  if (!ps.length) return { ...vazio, erro: 'A obra não tem pavimentos.', fundacao: reacoesArranques(b) };
  if (!b.pilares.length && !ppDaObra(b).length) return { ...vazio, erro: 'A obra não tem pilares.' };
  const aDefinir = b.lajes.filter((l) => l.definir);
  if (aDefinir.length) return { ...vazio, erro: `DEFINIR_PANO: a obra tem ${aDefinir.length} pano(s) a definir (${aDefinir.slice(0, 5).map((l) => l.nome).join(', ')}${aDefinir.length > 5 ? '…' : ''}); atribua o tipo da laje antes de calcular.` };
  if (b.pilares.length && b.pilares.every(ehArranque) && !ppDaObra(b).length) return { ...vazio, erro: 'A obra só tem arranques: calcule só a fundação.', fundacao: reacoesArranques(b) };
  /** Pilares-parede (E1b): lados em barra viram pilares virtuais; as fatias do topo dos lados em casca são apoios virtuais da grelha. */
  const paredes = geometriaParedes(b, op);
  const pilaresA: Pilar[] = paredes ? [...b.pilares, ...paredes.barras] : b.pilares;
  const pilarPor = new Map<string, Pilar>([...pilaresA, ...(paredes?.fatias ?? [])].map((p) => [p.id, p]));

  // ---- grelhas (uma por pavimento) e geometria das vigas reaproveitada no pórtico ----
  // O modelo-base da grelha (malha, barras, cargas e apoios) depende só do grupo e dos pilares presentes com as suas
  // seções: é montado uma vez e reaproveitado nos pavimentos iguais (só as molas dos pilares mudam por pavimento).
  const grelhas: GrelhaPavimento[] = [];
  /** Pilar apoiado cujo pé entra na grelha do pavimento em que nasce: sobre viga (nó da viga) e, no modelo integrado, sobre laje. */
  const naGrelha = (p: Pilar) => { const a = apoios.get(p.id); return a?.tipo === 'viga' || (a?.tipo === 'laje' && op.modeloGlobal === 1); };
  const geoPav = new Map<string, { nos: NoPlanta[]; grosso: { nos: NoPlanta[]; trechos: TrechoViga[] }; apoio: Map<number, string>; transf: Record<CasoAnalise, Map<number, number[]>>; comuns: Set<number> }>();
  const CASOS = casosDaObra(b).map((c) => c.id), zeros = () => Object.fromEntries(CASOS.map((c) => [c, 0])) as Record<CasoAnalise, number>;
  const totais = zeros();
  const cargasPavimento: Record<string, Record<CasoAnalise, number>> = Object.fromEntries(ps.map((p) => [p.id, zeros()]));
  const cacheGrelha = new Map<string, Resultado3>();
  const transfDe = new WeakMap<Resultado3, Record<CasoAnalise, Map<number, number[]>>>();
  const basesGrelha = new Map<string, GrelhaBase>();
  const integrado = op.modeloGlobal === 1;
  for (const v of b.vigas) if (v.vinculoExterno) for (const p of pilaresCoincidentes(b, v)) avisos.push(textoPilarCoincidente(v, p));
  if (!integrado && b.lajes.some((l) => lajeInclinada(b, l))) avisos.push('Plano: no modelo separado os panos inclinados são calculados na projeção horizontal, no diafragma (só o peso por área inclinada muda); ligue o modelo integrado para os panos fora do diafragma, com esforços normais e empuxos.');
  if (integrado && b.vigas.some((v) => v.vinculoExterno)) avisos.push('Vínculo externo: os apoios contínuos das vigas de muro não entram no modelo integrado (nós da grelha condensados); use o modelo separado.');
  /** Viga associada de uma viga comum cuja origem existe e tem pavimento: sai da análise (a barra é a da origem). */
  const comumEfetiva = (v: Viga) => { const o = v.comumDe ? b.vigas.find((x) => x.id === v.comumDe) : undefined; return !!o && pavimentosDoGrupo(b, o.grupo).length > 0; };
  /** Viga comum a dois grupos (E2b): reações da linha de apoio das vigas associadas (kN, para cima, por caso), a aplicar na viga de origem no pavimento alvo. */
  const comumExtra = new Map<string, { p: P; f: Record<string, number[]> }[]>();
  /** Modelo integrado: cargas a retirar do superelemento da associada (nó da grelha e força por caso). */
  const comumRetirar = new Map<string, { no: number; f: Record<string, number[]> }[]>();
  /** Pavimentos do modelo integrado: modelo-base da grelha e o seu superelemento. */
  const integPav = new Map<string, { gb: GrelhaBase; ig: IntegradoGrelha; gi: number }>();
  const cacheInteg = new Map<GrelhaBase, IntegradoGrelha>();
  /** Modelo-base da grelha de um grupo com os pilares dados (na seção do lance do pavimento). */
  const montarBase = (pav: (typeof ps)[number], grupo: (typeof b.grupos)[number], pilares: Pilar[]): GrelhaBase => {
    const avisosB: string[] = [];
    // viga não estrutural (E2a, C6.21) só fecha o contorno do pano: fora da grelha e do pórtico (a laje fica com borda livre)
    const vigas = b.vigas.filter((v) => v.grupo === grupo.id && v.estrutural !== false);
    const lajes = b.lajes.filter((l) => l.grupo === grupo.id);
    const cargas = b.cargas.filter((c) => c.grupo === grupo.id);
    const malhas = lajes.map((l) => ({ l, m: l.tipo.tipo === 'nervurada'
      ? malhaLaje(l.contorno, direcaoNervurada(l), passoMalhaNervurada(geometriaBidirecional(b, l.tipo), op), l.furos ?? [])
      : l.tipo.tipo === 'alveolar' ? malhaLaje(l.contorno, l.direcao ?? 0, op.alveolarMalha, l.furos ?? [])
      : malhaLaje(l.contorno, ehNervurada(l.tipo) ? l.direcao ?? 0 : direcaoPrincipal(l.contorno), op.malha, l.furos ?? []) }));
    // pontos das bordas das malhas e apoios dos pilares dividem as vigas
    const eixos = eixosDasVigas(b, grupo.id, true) as [P, P][];
    const extras: P[] = [];
    for (const { m } of malhas) for (const ln of m.linhas) extras.push(ln.pontos[0], ln.pontos[ln.pontos.length - 1]);
    // vínculo externo (E2e): nós de discretização a cada `malha` ao longo da viga, na grelha e no pórtico
    const pontosVE = pontosVinculoExterno(vigas, eixos, op.malha);
    extras.push(...pontosVE);
    const pre = dividirVigas(vigas, eixos, extras);
    const apoiosP: P[] = [];
    for (const p of pilares) { const g = geoEm(p, pav.id); apoiosP.push(...pontoApoio(pre.trechos, pre.nos, g.p, g.secao)); }
    const { nos, trechos, achar } = apoiosP.length ? dividirVigas(vigas, eixos, [...extras, ...apoiosP]) : pre;
    // divisão grossa (só cruzamentos e apoios) para o pórtico: as cargas da grelha entram como concentradas nas barras
    const grosso = dividirVigas(vigas, eixos, [...apoiosP, ...pontosDeLigacaoNaViga(b, grupo.id), ...pontosVE]); // E2c: as vigas inclinadas ligadas à viga criam nó nela
    for (const p of pilares) { const g = geoEm(p, pav.id); for (const q of pontoApoio(grosso.trechos, grosso.nos, g.p, g.secao)) grosso.nos[grosso.achar(q)].pilar = p.id; }
    // apoio: nó da viga dentro do pilar (o primeiro recebe as molas de rotação)
    const apoio = new Map<number, string>();
    /** Pilares que nascem no pavimento sobre viga ou laje: nó na grelha, mas sem apoio vertical (o pilar não sustenta a viga). */
    const transicao = new Map<number, string>();
    const semViga: Pilar[] = [];
    const marcar = (i: number, p: Pilar) => { nos[i].pilar = p.id; (lanceNoPavimento(b, p, pav.id) === pav.id ? apoio : transicao).set(i, p.id); };
    for (const p of pilares) {
      const g = geoEm(p, pav.id), pts = pontoApoio(trechos, nos, g.p, g.secao);
      if (!pts.length) { semViga.push(p); continue; }
      for (const q of pts) marcar(achar(q), p);
    }
    // pilares sem viga no pavimento: nó próprio (recebe a laje se estiver dentro dela)
    for (const p of semViga) { const g = geoEm(p, pav.id); marcar(achar(centroPilar(g.p, g.secao), false), p); }

    // modelo da grelha
    const m: Modelo3 = { nos: [], barras: [], apoios: new Map(), molas: [] };
    const tags: BarraGrelha[] = [];
    const idx = new Map<number, number>(); // nó da planta → nó da grelha
    const no = (i: number) => { if (!idx.has(i)) { idx.set(i, m.nos.length); m.nos.push([nos[i].p[0], nos[i].p[1], 0]); } return idx.get(i)!; };
    const casos: Caso3[] = CASOS.map(() => ({ nodais: [], distribuidas: [] }));
    // a carga de uso do grupo (e as lançadas como Q) vai para o caso da classe de uso (Q, QB ou QC)
    const casoQ = casoUsoDoGrupo(b, grupo.id);
    const carregar = (c: CasoAnalise, f: (cs: Caso3) => void) => { const i = CASOS.indexOf(c === 'Q' ? casoQ : c); if (i >= 0) f(casos[i]); };
    const trechoDe: (TrechoViga | null)[] = []; // barra da grelha → trecho de viga (null nas lajes)
    // N2e (K1.4.34): trecho fino dentro de um trecho grosso (cruzamento a cruzamento/apoio) com comprimento ≤ limite
    const curtaNaGrelha = (t: TrechoViga) => { const m: P = [(nos[t.a].p[0] + nos[t.z].p[0]) / 2, (nos[t.a].p[1] + nos[t.z].p[1]) / 2]; return grosso.trechos.some((g) => g.viga === t.viga && Math.hypot(grosso.nos[g.z].p[0] - grosso.nos[g.a].p[0], grosso.nos[g.z].p[1] - grosso.nos[g.a].p[1]) <= op.barraCurtaLimite + 1e-9 && distSeg(m, grosso.nos[g.a].p, grosso.nos[g.z].p) < 1e-3); };
    // viga comum a dois grupos (E2b): a viga associada é uma viga normal da grelha deste grupo (apoia a laje com a sua rigidez), mas
    // sem peso próprio; o que a laje e as cargas lançadas transmitem aos seus nós vai à viga de origem, e ela não é barra do pórtico
    const linhaComum = new Set<number>();
    // E3f: barras inclinadas (pórtico 3D no modelo integrado), cota de cada nó da grelha, normal do plano e fator da largura verdadeira
    const incB: number[] = [], normB: (V3 | null)[] = [], fatB: number[] = [], zNo = new Map<number, number>();
    const marcarInc = (inc: boolean, nrm: V3 | null = null, fat = 1) => { incB.push(inc ? 1 : 0); normB.push(nrm); fatB.push(fat); };
    const cotaNo = (gi: number, z: number) => { const z0 = zNo.get(gi); if (z0 === undefined) zNo.set(gi, z); else if (Math.abs(z0 - z) > 0.01) avisosB.push(`Plano: cotas diferentes no mesmo nó (${m.nos[gi][0].toFixed(2)}; ${m.nos[gi][1].toFixed(2)}): ${(z0 * 100).toFixed(0)} × ${(z * 100).toFixed(0)} cm (viga e pano incoerentes; vale a primeira).`); };
    for (const t of trechos) {
      const v = t.viga, pv = propsBarraViga(b, v, op);
      const associada = comumEfetiva(v);
      if (associada) { linhaComum.add(t.a); linhaComum.add(t.z); }
      const bv: Barra3 = { i: no(t.a), j: no(t.z), E: Ev, G: Gv, ...pv };
      if (op.barraCurtaLimite > 0 && op.barraCurtaFator !== 1 && curtaNaGrelha(t)) { bv.A *= op.barraCurtaFator; bv.Iz *= op.barraCurtaFator; bv.Iy *= op.barraCurtaFator; bv.J *= op.barraCurtaFator; }
      vincularPontas(bv, t, trechos, nos, [5], ctxPontas);
      m.barras.push(bv);
      tags.push({ tipo: 'viga', ref: v.id });
      trechoDe.push(t);
      // E3f: viga num plano inclinado: peso pela extensão verdadeira; no modelo integrado, barra 3D fora da grelha se sai do pavimento
      const plV = v.plano ? planoPor(b, v.plano) : undefined, tV = plV ? Math.hypot(plV.coef.a, plV.coef.b) : 0;
      let fL = 1;
      if (plV && tV > TOL_INCLINACAO) {
        const zf = cotaDaViga(b, v), pa = nos[t.a].p, pz = nos[t.z].p, za = zf(pa), zz = zf(pz), Lh = Math.hypot(pz[0] - pa[0], pz[1] - pa[1]);
        fL = Lh > 1e-9 ? Math.hypot(Lh, zz - za) / Lh : 1;
        const inc = integrado && Math.max(Math.abs(za), Math.abs(zz)) > 1e-3;
        if (inc) { cotaNo(bv.i, za); cotaNo(bv.j, zz); }
        marcarInc(inc);
      } else marcarInc(false);
      const pp = pesoLinearViga(v) * fL;
      if (!associada) carregar('G', (cs) => cs.distribuidas.push({ barra: m.barras.length - 1, q: [0, 0, -pp] }));
    }
    for (const { l, m: mm } of malhas) {
      const prop = propLaje(l, mm.sx, mm.sy, op, b, El, Gl);
      const areaG = lajeG(l, b) + grupo.gRev, areaQ = grupo.q;
      /** Nervurada bidirecional (E3c): barras em zona maciça (faixa junto às vigas e zonas manuais) têm a rigidez e o peso da laje maciça. */
      const nerv = l.tipo.tipo === 'nervurada' ? geometriaBidirecional(b, l.tipo) : null;
      const arrN = nerv ? arranjoNervuras(lajeComAbacos(b, l, nerv), nerv, op.nervuradaMacicoViga) : null;
      const abEf = nerv ? abacosEfetivos(b, l, nerv) : []; // ábacos (E3d): zona maciça e, se rebaixados, com a altura do ábaco
      const areaGMac = nerv ? GAMA_CONCRETO * nerv.h + grupo.gRev : areaG;
      /** Alveolar (E3e): processo construtivo. 1 = engaste das bordas × (1 − pp/carga total); 2 = o peso próprio vai como fase isostática (reações nas pontas), o resto na grelha contínua. */
      const alv = l.tipo.tipo === 'alveolar' ? geometriaAlveolar(b, l.tipo) : null, procAlv = alv ? processoDoPano(l, op) : 0;
      const fProcAlv = alv && procAlv === 1 ? fatorEngasteAproximado(alv.pp, cargasDoPano(b, l, alv).total) : 1, ppFase1 = alv && procAlv === 2 ? alv.pp : 0;
      const uni = ehNervurada(l.tipo) || !!alv;
      // E3f: pano inclinado: peso próprio e revestimento por área inclinada (× 1/cos α); variável e cargas de área pela projeção
      // (opção planoCargaProjecao); no modelo integrado, barras 3D no plano (largura verdadeira e normal do plano)
      const plL = lajeInclinada(b, l) ? planoPor(b, l.plano)! : undefined, kInc = plL ? Math.hypot(1, plL.coef.a, plL.coef.b) : 1;
      const kG = kInc, kQ = plL && !op.planoCargaProjecao ? kInc : 1, inc3 = integrado && !!plL, zl = cotaDaLaje(b, l);
      const nrm: V3 | null = plL ? [-plL.coef.a / kInc, -plL.coef.b / kInc, 1 / kInc] : null;
      /** Fator da largura verdadeira da faixa da barra de a a z (a faixa é perpendicular à barra em planta). */
      const fatLarg = (a: P, z: P) => { if (!plL) return 1; const L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1; return Math.hypot(1, (-(z[1] - a[1]) * plL.coef.a + (z[0] - a[0]) * plL.coef.b) / L); };
      for (const ln of mm.linhas) {
        const k = ln.dir;
        const share = uni ? (k === 0 ? 1 : 0) : 0.5;
        const ids = ln.pontos.map((p) => achar(p, false));
        if (ppFase1 && k === 0 && ids.length > 1) {
          const pa = nos[ids[0]].p, pz = nos[ids[ids.length - 1]].p, R = (ppFase1 * ln.largura * Math.hypot(pz[0] - pa[0], pz[1] - pa[1])) / 2;
          for (const id of [ids[0], ids[ids.length - 1]]) carregar('G', (cs) => cs.nodais.push({ no: no(id), f: [0, 0, -R, 0, 0, 0] }));
        }
        for (let j = 0; j + 1 < ids.length; j++) {
          if (ids[j] === ids[j + 1]) continue;
          const midB: P = [(nos[ids[j]].p[0] + nos[ids[j + 1]].p[0]) / 2, (nos[ids[j]].p[1] + nos[ids[j + 1]].p[1]) / 2];
          const fmB = arrN ? arrN.fracMacica(midB, k, ln.largura) : 0;
          const hAb = abEf.length && fmB ? alturaAbacoEm(abEf, midB) : undefined;
          const pr = nerv ? propBarraNervuradaMista(nerv, k, ln.largura, fmB, op, hAb) : prop[k];
          const bl: Barra3 = { i: no(ids[j]), j: no(ids[j + 1]), E: El, G: Gl, A: pr.A, Iz: pr.I, Iy: pr.A * 0.01, J: pr.J };
          if (op.cortanteBarrasLaje && pr.As) bl.Ay = pr.As; // Timoshenko (K1.3.22)
          // engaste da borda: coeficiente da laje nesta aresta × o da viga de apoio (bordas em pilares ficam engastadas)
          for (const [ponta, id] of [['engI', ids[j]], ['engJ', ids[j + 1]]] as const) {
            let a = nos[id].viga && (!nos[id].pilar || alv) ? engasteBorda(l, nos[id].p, trechos, nos, lajes, op.lajeDesnivelFator, b) : 1;
            if (alv && k === 0 && nos[id].viga) a = engasteBordaAlveolar(l, nos[id].p, a, lajes, !!op.alveolarContinuidade, fProcAlv); // E3e: apoio simples ou contínuo na capa
            // N2e (K1.9.55): vigotas biapoiadas: rotações livres nas bordas da treliçada (extremos das linhas na direção das vigotas)
            if (l.vigotasBiapoiadas && ehNervurada(l.tipo) && k === 0 && nos[id].viga && (ponta === 'engI' ? j === 0 : j + 2 === ids.length)) a = 0;
            if (a < 1) bl[ponta] = [[5, a]];
          }
          m.barras.push(bl);
          const fat = fatLarg(nos[ids[j]].p, nos[ids[j + 1]].p);
          tags.push({ tipo: 'laje', ref: l.id, dir: k, largura: inc3 ? ln.largura * fat : ln.largura });
          trechoDe.push(null);
          marcarInc(inc3, nrm, fat);
          if (inc3) { cotaNo(bl.i, zl(nos[ids[j]].p)); cotaNo(bl.j, zl(nos[ids[j + 1]].p)); }
          const bi = m.barras.length - 1, w = ln.largura * share;
          if (!w) continue;
          // cargas de área: grupo + regiões de carga que contêm o meio da barra
          const mid: P = [(nos[ids[j]].p[0] + nos[ids[j + 1]].p[0]) / 2, (nos[ids[j]].p[1] + nos[ids[j + 1]].p[1]) / 2];
          let g = (fmB ? fmB * (hAb !== undefined && hAb > nerv!.h ? GAMA_CONCRETO * hAb + grupo.gRev : areaGMac) + (1 - fmB) * areaG : areaG) * kG, q = areaQ * kQ;
          if (ppFase1) g = Math.max(0, g - ppFase1 * kG); // fase 1 do processo 2: o peso próprio da placa entra como reações nas pontas
          const outros: Record<string, number> = {}; // cargas de área em casos próprios (QB, QC, adicionais e arranjos)
          for (const c of cargas) if (c.tipo === 'area' && dentroPoligono(mid, c.pontos)) { const cv = c.valor * kQ; if (c.caso === 'G') g += cv; else if (c.caso === 'Q') q += cv; else outros[c.caso] = (outros[c.caso] ?? 0) + cv; }
          carregar('G', (cs) => cs.distribuidas.push({ barra: bi, q: [0, 0, -g * w] }));
          carregar('Q', (cs) => cs.distribuidas.push({ barra: bi, q: [0, 0, -q * w] }));
          for (const [k, v] of Object.entries(outros)) carregar(k, (cs) => cs.distribuidas.push({ barra: bi, q: [0, 0, -v * w] }));
        }
      }
      if (!mm.linhas.length) avisosB.push(`${l.nome}: malha vazia.`);
      // bordas: a faixa junto ao contorno vai para os nós da borda; borda livre (sem viga) ganha barra de meia faixa
      const sobreViga = (p: P) => trechos.some((t) => { const a = nos[t.a].p, z = nos[t.z].p; if (p[0] < Math.min(a[0], z[0]) - 0.02 || p[0] > Math.max(a[0], z[0]) + 0.02 || p[1] < Math.min(a[1], z[1]) - 0.02 || p[1] > Math.max(a[1], z[1]) + 0.02) return false; const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy; const u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0; return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]) < 0.01; });
      mm.bordas.forEach((e, k) => {
        const L = Math.hypot(e.z[0] - e.a[0], e.z[1] - e.a[1]), mid: P = [(e.a[0] + e.z[0]) / 2, (e.a[1] + e.z[1]) / 2];
        const sh = uni ? [1, 0] : [0.5, 0.5];
        const larg = mm.pesoBorda[0][k] * sh[0] + mm.pesoBorda[1][k] * sh[1]; // m² de faixa por m de borda
        if (!larg) return;
        let g = (nerv ? areaGMac : areaG) * kG, q = areaQ * kQ; // nervurada: a borda do pano é faixa maciça
        const outros: Record<string, number> = {};
        for (const c of cargas) if (c.tipo === 'area' && dentroPoligono(mid, c.pontos)) { const cv = c.valor * kQ; if (c.caso === 'G') g += cv; else if (c.caso === 'Q') q += cv; else outros[c.caso] = (outros[c.caso] ?? 0) + cv; }
        const ia = no(achar(e.a, false)), iz = no(achar(e.z, false));
        for (const [cs, v] of [['G', g], ['Q', q], ...Object.entries(outros)] as [string, number][]) carregar(cs, (x) => { x.nodais.push({ no: ia, f: [0, 0, (-v * larg * L) / 2, 0, 0, 0] }, { no: iz, f: [0, 0, (-v * larg * L) / 2, 0, 0, 0] }); });
        if (!sobreViga(mid)) {
          const w = Math.min(mm.sx, mm.sy) / 2, h = capaLaje(b, l.tipo), I = (w * h ** 3) / 12;
          const bb: Barra3 = { i: ia, j: iz, E: El, G: Gl, A: w * h, Iz: I, Iy: I, J: op.torcaoLaje * 2 * I };
          if (op.cortanteBarrasLaje) bb.Ay = (5 / 6) * w * h;
          m.barras.push(bb);
          const fat = fatLarg(e.a, e.z);
          tags.push({ tipo: 'laje', ref: l.id, largura: inc3 ? w * fat : w });
          trechoDe.push(null);
          marcarInc(inc3, nrm, fat);
          if (inc3) { cotaNo(ia, zl(e.a)); cotaNo(iz, zl(e.z)); }
        }
      });
    }
    // cargas de linha (paredes) e de ponto: discretizadas no nó mais próximo da grelha
    const maisProximo = (p: P) => { let best = -1, d = Infinity; for (const [i, gi] of idx) { const dd = Math.hypot(nos[i].p[0] - p[0], nos[i].p[1] - p[1]); if (dd < d) { d = dd; best = gi; } } return best; };
    for (const c of cargas) {
      if (c.tipo === 'area') continue;
      const pts: { p: P; f: number }[] = [];
      if (c.tipo === 'ponto') pts.push({ p: c.pontos[0], f: c.valor });
      else for (let k = 0; k + 1 < c.pontos.length; k++) {
        const a = c.pontos[k], z = c.pontos[k + 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]), n = Math.max(1, Math.ceil(L / (op.malha / 2)));
        for (let s = 0; s < n; s++) { const t = (s + 0.5) / n; pts.push({ p: [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])], f: (c.valor * L) / n }); }
      }
      for (const { p, f } of pts) { const gi = maisProximo(p); if (gi >= 0) carregar(c.caso, (cs) => cs.nodais.push({ no: gi, f: [0, 0, -f, 0, 0, 0] })); }
    }
    // apoios: w preso nos pilares (as molas de rotação dos lances, por pavimento, entram em `molasGrelha`)
    for (let gi = 0; gi < m.nos.length; gi++) m.apoios.set(gi, [0, 1, 5]);
    for (const [i] of apoio) m.apoios.set(no(i), [0, 1, 2, 5]);
    // vínculo externo (E2e): w preso em todos os nós da viga (engaste: também as rotações)
    for (const t of trechos) if (t.viga.vinculoExterno) for (const i of [t.a, t.z]) m.apoios.set(no(i), t.viga.vinculoExterno === 'engaste' ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 5]);
    const carga = zeros();
    casos.forEach((cs, ic) => {
      let s = 0;
      for (const d of cs.distribuidas) { const br = m.barras[d.barra], a = m.nos[br.i], z = m.nos[br.j]; s += -d.q[2] * Math.hypot(z[0] - a[0], z[1] - a[1]); }
      for (const n of cs.nodais) s += -n.f[2];
      carga[CASOS[ic]] = s;
    });
    if (!m.barras.length) avisosB.push('sem vigas nem lajes (só pilares).');
    // E2b: viga que chega à associada de uma viga comum fora de um pilar: a reação dela não é levada à viga de origem
    for (const i of linhaComum) {
      if (apoio.has(i)) continue;
      const w = trechos.find((x) => !x.viga.comumDe && (x.a === i || x.z === i));
      if (w) avisosB.push(`Viga comum: ${w.viga.nome} chega à viga associada de uma viga comum fora de pilar; a reação dela não passa à viga de origem (analise-a apoiada na viga de origem).`);
    }
    const inc = incB.some(Boolean) ? { barra: Uint8Array.from(incB), z: Float64Array.from(m.nos, (_, gi) => zNo.get(gi) ?? 0), normal: normB, fator: Float64Array.from(fatB) } : undefined;
    return { m, tags, casos, apoio, transicao, idx, nos, trechos, grosso, carga, avisos: avisosB, trechoDe, pilares: pilares.map((p) => p.id), linhaComum, ...(inc ? { inc } : {}) };
  };
  /** Molas de rotação dos pilares na grelha do pavimento (4EI/L dos lances de baixo e de cima, com o engaste parcial). */
  const molasGrelha = (gb: GrelhaBase, ip: number, pav: (typeof ps)[number]) => {
    const molas: NonNullable<Modelo3['molas']> = [];
    const comMola = new Set<string>();
    for (const [i, pid] of gb.apoio) {
      const gi = gb.idx.get(i)!;
      if (comMola.has(pid)) continue;
      comMola.add(pid);
      const pil = pilarPor.get(pid)!;
      let kx = 0, ky = 0;
      const abaixo = ip > 0 ? ps[ip - 1].cota : cotaFundacao(b);
      const hBaixo = pav.cota - abaixo, sb = inerciasPilar(secaoNoLance(pil, pav.id), anguloNoLance(pil, pav.id));
      const acima = ps[ip + 1], sobre = (sobreDe.get(pil.id) ?? []).map((id) => b.pilares.find((x) => x.id === id)!), continua = (!!acima && lancesDoPilar(b, pil).some((x) => x.id === acima.id)) || sobre.length > 0;
      // engaste parcial: α·4EI/L (interpolação engaste-engaste × engaste-rótula); topo do lance de baixo e base do de cima
      const aTopo = engasteNoLance(pil, pav.id).topo * (continua ? 1 : op.engasteTopoUltimo);
      const Eb = Em('pilar', pav.id, pil);
      kx += (aTopo * 4 * Eb * sb.Ix) / hBaixo; ky += (aTopo * 4 * Eb * sb.Iy) / hBaixo;
      if (!sobre.length && continua) {
        const sa = inerciasPilar(secaoNoLance(pil, acima.id), anguloNoLance(pil, acima.id)), aBase = engasteNoLance(pil, acima.id).base;
        const Ea = Em('pilar', acima.id, pil);
        kx += (aBase * 4 * Ea * sa.Ix) / (acima.cota - pav.cota); ky += (aBase * 4 * Ea * sa.Iy) / (acima.cota - pav.cota);
      }
      // pilares apoiados neste (E1a): o primeiro lance de cada um trabalha como o lance de cima
      for (const q of sobre) {
        const l0 = lancesDoPilar(b, q)[0];
        if (!l0) continue;
        const sa = inerciasPilar(secaoNoLance(q, l0.id), anguloNoLance(q, l0.id)), aBase = engasteNoLance(q, l0.id).base, Ea = Em('pilar', l0.id, q), hq = l0.cota - pav.cota;
        kx += (aBase * 4 * Ea * sa.Ix) / hq; ky += (aBase * 4 * Ea * sa.Iy) / hq;
      }
      molas.push({ no: gi, gdl: 3, k: kx }, { no: gi, gdl: 4, k: ky });
    }
    // vínculo externo (E2e): rigidez de folga nos giros livres dos nós da viga (evita o modo de corpo rígido em torno do eixo dela)
    const ve = new Set<number>();
    for (const t of gb.trechos) if (t.viga.vinculoExterno && t.viga.vinculoExterno !== 'engaste') for (const i of [t.a, t.z]) ve.add(gb.idx.get(i)!);
    for (const n of ve) for (const gdl of [3, 4]) molas.push({ no: n, gdl, k: K_FOLGA_VINCULO });
    return molas;
  };
  /**
   * Modelo integrado (N2b): a grelha do pavimento (lajes + vigas, gdl uz, rx e ry) vira superelemento ligado aos nós
   * dos pilares. Nós da grelha dentro da seção de um pilar (apoios das vigas, nó do pilar sem viga, chegadas de lajes)
   * ficam associados ao nó do pilar por corpo rígido (K1.3.43: trecho rígido até o eixo); as vigas que saem do pilar
   * têm trecho rígido até a face menos `trechoRigido`·h, como no pórtico. Condensação estática exata dos demais gdl.
   */
  const integrarGrelha = (gb: GrelhaBase, pav: (typeof ps)[number]): IntegradoGrelha => {
    const { m, casos, trechoDe, tags } = gb;
    const nn = m.nos.length;
    const pils = gb.pilares.map((id) => pilarPor.get(id)!);
    const geo = pils.map((pl) => { const g = geoEm(pl, pav.id); return { p: g.p, s: g.secao, cont: contornoPilar(g.p, g.secao), c: centroPilar(g.p, g.secao) }; });
    const gidx = new Map([...gb.idx].map(([i, gi]) => [gi, i]));
    const assoc0 = new Int32Array(nn).fill(-1);
    for (let n = 0; n < nn; n++) {
      const i = gidx.get(n)!, pid = gb.apoio.get(i) ?? gb.transicao.get(i);
      if (pid) { assoc0[n] = gb.pilares.indexOf(pid); continue; }
      const q: P = [m.nos[n][0], m.nos[n][1]];
      const k = geo.findIndex((g) => dentroPoligono(q, g.cont) || distPoligono(q, g.cont) < 1e-3);
      if (k >= 0) assoc0[n] = k;
    }
    // E3f: barras inclinadas ficam fora do superelemento (vão ao pórtico com 6 gdl por nó). Nó só de barras inclinadas sai da
    // grelha; nó com barras dos dois tipos fora de pilar vira junção (fronteira do superelemento, nó do pórtico no diafragma).
    const incB = gb.inc?.barra, ehInc = (bi: number) => !!incB && incB[bi] === 1;
    const noSE = new Uint8Array(nn).fill(1), juncao = new Int32Array(nn).fill(-1), nosJuncao: number[] = [];
    let nH = m.barras.length;
    if (incB) {
      const tH = new Uint8Array(nn), tI = new Uint8Array(nn);
      m.barras.forEach((br, bi) => { const t = ehInc(bi) ? tI : tH; t[br.i] = 1; t[br.j] = 1; });
      nH = m.barras.filter((_, bi) => !ehInc(bi)).length;
      for (let n = 0; n < nn; n++) {
        if (tI[n] && !tH[n]) noSE[n] = 0;
        else if (tI[n] && assoc0[n] < 0) { juncao[n] = nosJuncao.length; nosJuncao.push(n); }
      }
    }
    // pilares que só recebem barras inclinadas: o nó do pórtico sobe à cota média dos nós do plano dentro dele
    const zPilar = new Map<string, number>();
    if (incB) {
      const acc = new Map<number, [number, number]>();
      for (let n = 0; n < nn; n++) if (assoc0[n] >= 0 && !noSE[n]) { const a = acc.get(assoc0[n]) ?? [0, 0]; acc.set(assoc0[n], [a[0] + gb.inc!.z[n], a[1] + 1]); }
      for (let n = 0; n < nn; n++) if (assoc0[n] >= 0 && noSE[n]) acc.delete(assoc0[n]);
      for (const [k, [sz, c]] of acc) if (Math.abs(sz / c) > 1e-6) zPilar.set(gb.pilares[k], sz / c);
    }
    // fronteira: só os pilares com nós associados (no superelemento)
    const usados = [...new Set([...assoc0].filter((k, n) => k >= 0 && noSE[n]))].sort((a, z) => a - z);
    const ren = new Map(usados.map((k, j) => [k, j]));
    const assoc = assoc0.map((k, n) => (k >= 0 && noSE[n] ? ren.get(k)! : -1));
    const g2 = usados.map((k) => geo[k]);
    const interno = new Int32Array(nn).fill(-1);
    let nI = 0;
    for (let n = 0; n < nn; n++) if (assoc[n] < 0 && noSE[n] && juncao[n] < 0) interno[n] = nI++;
    const ni = 3 * nI, nB = 3 * (g2.length + nosJuncao.length);
    // barras da grelha no modelo integrado: vigas com trecho rígido na face dos pilares e liberações nas duas flexões
    const barras: Barra3[] = m.barras.map((br, bi) => {
      const t = trechoDe[bi];
      if (!t) return br;
      const nb: Barra3 = { ...br };
      delete nb.engI; delete nb.engJ;
      vincularPontas(nb, t, gb.trechos, gb.nos, [4, 5], ctxPontas);
      for (const [ponta, a, z] of [['offI', br.i, br.j], ['offJ', br.j, br.i]] as const) {
        const k = assoc[a];
        if (k < 0 && op.vigaApoiadaRigida) {
          const ov = ponta === 'offI' ? offsetApoiadaEmViga(t.a, t.z, t, gb.trechos, gb.nos) : offsetApoiadaEmViga(t.z, t.a, t, gb.trechos, gb.nos);
          if (ov) nb[ponta] = ov;
        }
        if (k < 0 || assoc[z] === k) continue;
        const pa: P = [m.nos[a][0], m.nos[a][1]], pz: P = [m.nos[z][0], m.nos[z][1]];
        const cs = consoloEm(t.viga.id, g2[k].p.id), off = offsetFace(pa, pz, g2[k].p, g2[k].s, cs ? -cs.a : op.trechoRigido * t.viga.secao.h, [pa[0], pa[1], 0]); // consolo (E2e): rígido até o centro do aparelho
        if (off && Math.hypot(off[0], off[1]) > 1e-9) nb[ponta] = off;
      }
      return nb;
    });
    const mZ: Modelo3 = { nos: m.nos, barras, apoios: new Map() };
    const distDe = casos.map((c) => { const mp = new Map<number, V3[]>(); for (const d of c.distribuidas) { const l = mp.get(d.barra); if (l) l.push(d.q); else mp.set(d.barra, [d.q]); } return mp; });
    const elems = barras.map((br, bi) => elementoBarra(mZ, br, distDe.map((mp) => mp.get(bi)), []));
    /** Equações (índice, coeficiente) do gdl g (2 uz, 3 rx, 4 ry) do nó n da grelha. */
    const mapa = (n: number, g: number): [number, number][] => {
      const k = assoc[n];
      if (juncao[n] >= 0) return [[ni + 3 * (g2.length + juncao[n]) + g - 2, 1]];
      if (k < 0) return [[3 * interno[n] + g - 2, 1]];
      const B = ni + 3 * k, dx = m.nos[n][0] - g2[k].c[0], dy = m.nos[n][1] - g2[k].c[1];
      // corpo rígido: uz = uzP + rxP·dy − ryP·dx; rx = rxP; ry = ryP
      return g === 2 ? [[B, 1], [B + 1, dy], [B + 2, -dx]] : [[B + g - 2, 1]];
    };
    const LOC = [2, 3, 4, 8, 9, 10];
    const mapas = barras.map((br) => LOC.map((a) => mapa(a < 6 ? br.i : br.j, a % 6)));
    /** (k·T) nas colunas fora do plano (12 × 6). */
    const ktDe = (k: number[][], T: number[][]) => { const o = new Float64Array(72); for (let r = 0; r < 12; r++) for (let c = 0; c < 6; c++) { let v = 0; for (let a = 0; a < 12; a++) v += k[r][a] * T[a][LOC[c]]; o[r * 6 + c] = v; } return o; };
    const kt = elems.map((e) => ktDe(e.k, e.T));
    const montarK = (fator?: (bi: number) => { kE: number; f: number }) => {
      const K: SpRows = Array.from({ length: ni + nB }, () => new Map<number, number>());
      const Kg = new Float64Array(36);
      barras.forEach((br, bi) => {
        if (ehInc(bi)) return;
        const e = elems[bi];
        let t6 = kt[bi];
        if (fator) { const { kE, f } = fator(bi); t6 = ktDe(rigidezCondensada({ ...br, E: br.E * kE, G: br.G * kE, Iz: br.Iz * f, Iy: br.Iy * f }, e.L), e.T); }
        // bloco fora do plano da rigidez global: Kg = T₆ᵀ·(k·T₆)
        for (let a = 0; a < 6; a++) for (let c = 0; c < 6; c++) { let v = 0; for (let r = 0; r < 12; r++) v += e.T[r][LOC[a]] * t6[r * 6 + c]; Kg[a * 6 + c] = v; }
        const mp = mapas[bi];
        for (let a = 0; a < 6; a++) for (let c = 0; c < 6; c++) {
          const v = Kg[a * 6 + c];
          if (!v) continue;
          for (const [ea, ca] of mp[a]) for (const [ec, cc] of mp[c]) spAdd(K, ea, ec, ca * cc * v);
        }
      });
      return K;
    };
    const K = montarK();
    const Pc = CASOS.map(() => new Float64Array(ni + nB));
    barras.forEach((br, bi) => {
      if (ehInc(bi)) return;
      const e = elems[bi], mp = mapas[bi];
      e.f0s.forEach((f0, ic) => {
        for (let a = 0; a < 6; a++) { let fa = 0; for (let r = 0; r < 12; r++) fa -= e.T[r][LOC[a]] * f0[r]; if (fa) for (const [ea, ca] of mp[a]) Pc[ic][ea] += ca * fa; }
      });
      // peso da viga nos trechos rígidos (a carga distribuída atua só na parte flexível)
      const t = trechoDe[bi];
      if (t) {
        const pp = pesoLinearViga(t.viga), ig = CASOS.indexOf('G');
        for (const [off, n] of [[barras[bi].offI, br.i], [barras[bi].offJ, br.j]] as const) if (off && ig >= 0) for (const [ea, ca] of mapa(n, 2)) Pc[ig][ea] += ca * -pp * Math.hypot(off[0], off[1]);
      }
    });
    casos.forEach((cs, ic) => { for (const nd of cs.nodais) if (noSE[nd.no]) for (const g of [2, 3, 4]) if (nd.f[g]) for (const [ea, ca] of mapa(nd.no, g)) Pc[ic][ea] += ca * nd.f[g]; });
    const cond = condensar(K, ni, Pc);
    // ligação do diafragma: nós unidos por lajes e vigas do diafragma
    const pai = Array.from({ length: nn }, (_, i) => i);
    const raiz = (k: number): number => (pai[k] === k ? k : (pai[k] = raiz(pai[k])));
    const comLaje = new Uint8Array(nn);
    m.barras.forEach((br, bi) => {
      const t = trechoDe[bi];
      if (t?.viga.foraDiafragma || (ehInc(bi) && !op.planoDiafragma)) return;
      pai[raiz(br.i)] = raiz(br.j);
      if (tags[bi].tipo === 'laje') { comLaje[br.i] = 1; comLaje[br.j] = 1; }
    });
    const uniao = Int32Array.from({ length: nn }, (_, i) => raiz(i));
    const kv = (() => { const c = concretoDe(b, 'viga'); return c.Eci / c.Ecs; })(), kl = (() => { const c = concretoDe(b, 'laje'); return c.Eci / c.Ecs; })();
    let condR: Condensado | null = null, condRC: Condensado | null = null;
    const fatorReduzido = (bi: number) => (trechoDe[bi] ? { kE: kv, f: 0.4 } : { kE: kl, f: 0.3 });
    return {
      ...(cond.erro ? { erro: `modelo integrado: ${cond.erro}` } : {}),
      pils: g2.map((g) => g.p.id), centros: g2.map((g) => g.c), assoc, interno, ni, barras, elems, cond, uniao, comLaje, distDe,
      // rigidez reduzida para o γz (NBR 6118, 15.7.3): vigas 0,4·Eci·Ic, lajes 0,3·Eci·Ic
      reduzida: () => (condR ??= condensar(montarK(fatorReduzido), ni, [], cond.ordem)),
      reduzidaCargas: () => (condRC ??= condensar(montarK(fatorReduzido), ni, Pc, cond.ordem)),
      // (k·T) nas colunas fora do plano das duas pontas (uz, rx, ry): esforços da grelha sem a parte no plano (nula)
      kt, noSE, juncao, nosJuncao, pilarDe: assoc0, zPilar, nH,
    };
  };
  /** Forças que as lajes (e as cargas nodais) passam aos nós das vigas e dos pilares da grelha, por caso: cargas do pórtico no modelo separado. */
  const transfDaSolucao = (gb: GrelhaBase, m: Modelo3, res: Resultado3): Record<CasoAnalise, Map<number, number[]>> => {
    const feito = transfDe.get(res);
    if (feito) return feito;
    const { tags, casos, apoio, nos } = gb;
    const transf = Object.fromEntries(CASOS.map((c) => [c, new Map()])) as Record<CasoAnalise, Map<number, number[]>>;
    const gidx = new Map([...gb.idx].map(([i, gi]) => [gi, i]));
    CASOS.forEach((c, ic) => {
      const f = new Map<number, number[]>();
      m.barras.forEach((br, bi) => {
        if (tags[bi].tipo !== 'laje') return;
        const e = res.esforcos[ic][bi];
        for (const [noG, off] of [[br.i, 0], [br.j, 6]] as const) {
          const i = gidx.get(noG)!;
          if (!nos[i].viga && !apoio.has(i)) continue;
          const g = paraGlobal(m, br, e, off); // força que o nó faz na barra
          const acc = f.get(i) ?? [0, 0, 0, 0, 0, 0];
          for (let k = 0; k < 6; k++) acc[k] -= g[k]; // a laje empurra o nó
          f.set(i, acc);
        }
      });
      for (const n of casos[ic].nodais) { const i = gidx.get(n.no)!; if (!nos[i].viga && !apoio.has(i)) continue; const acc = f.get(i) ?? [0, 0, 0, 0, 0, 0]; n.f.forEach((v, k) => (acc[k] += v)); f.set(i, acc); }
      transf[c] = f;
    });
    transfDe.set(res, transf);
    return transf;
  };
  /** Grupo, pilares presentes e modelo-base da grelha do pavimento (montado uma vez por grupo e pilares). */
  const baseDoPav = (pav: (typeof ps)[number]) => {
    const grupo = b.grupos.find((g) => g.id === pav.grupo)!;
    // pilares que chegam ao pavimento e os que nascem nele sobre viga (e sobre laje, no modelo integrado): E1a
    const pilares = [...pilaresA, ...(paredes?.fatias ?? [])].filter((p) => lancesDoPilar(b, p).some((x) => x.id === pav.id) || (p.nasce === pav.id && naGrelha(p)));
    const chaveBase = `${grupo.id}|${pilares.map((p) => { const g = geoEm(p, pav.id), e = p.secoes?.find((x) => x.pavimento === lanceNoPavimento(b, p, pav.id)); return `${p.id}:${JSON.stringify({ s: g.secao, a: e?.ajuste, n: e?.angulo, x: e?.dx, y: e?.dy, t: p.nasce === pav.id })}`; }).join(';')}`;
    let gb = basesGrelha.get(chaveBase);
    if (!gb) { gb = montarBase(pav, grupo, pilares); basesGrelha.set(chaveBase, gb); }
    return { grupo, gb };
  };
  /** Chave da solução da grelha: pavimentos do mesmo grupo têm a mesma grelha e a solução se reaproveita quando apoios e molas coincidem. */
  const chaveGrelha = (grupoId: string, m: Modelo3, extra = '') => `${grupoId}|${m.nos.length}|${m.barras.length}|${[...m.apoios].filter(([, g]) => g.includes(2)).map(([n]) => n).join(',')}|${m.molas!.map((x) => `${x.no}:${x.gdl}:${x.k.toPrecision(12)}`).join(',')}${extra}`;
  /** Viga comum (E2b): pavimento do grupo de origem que recebe a reação do nó `i` da linha de apoio da viga associada neste pavimento. */
  const alvoComum = (gb: GrelhaBase, i: number, pav: (typeof ps)[number]) => {
    const t = gb.trechos.find((x) => (x.a === i || x.z === i) && x.viga.comumDe);
    const o = t ? b.vigas.find((x) => x.id === t.viga.comumDe) : undefined;
    return o ? pavimentoAlvoComum(b, pav, o) : undefined;
  };
  /** Grelha com cargas nodais a mais por caso (as das vigas associadas na viga de origem; o oposto nas associadas do modelo integrado). */
  const comCargasNodais = (gb: GrelhaBase, extras: { no: number; f: Record<string, number[]>; sinal: 1 | -1 }[]): GrelhaBase => {
    const casosX = gb.casos.map((cs) => ({ ...cs, nodais: [...cs.nodais] }));
    for (const x of extras) CASOS.forEach((c, ic) => { const f = x.f[c]; if (f && f.some((v) => v)) casosX[ic].nodais.push({ no: x.no, f: f.map((v) => x.sinal * v) }); });
    return { ...gb, casos: casosX };
  };
  /** Nó da grelha (de viga) mais próximo de um ponto da planta: índice da planta e da grelha; null se não há. */
  const noDeVigaMaisProximo = (gb: GrelhaBase, p: P): { i: number; gi: number } | null => {
    let melhor: { i: number; gi: number } | null = null, dm = Infinity;
    for (const [i, gi] of gb.idx) { if (!gb.nos[i].viga) continue; const d = Math.hypot(gb.nos[i].p[0] - p[0], gb.nos[i].p[1] - p[1]); if (d < dm) { dm = d; melhor = { i, gi }; } }
    return melhor;
  };
  // pré-passo da viga comum (E2b). A viga associada é viga normal da grelha do seu grupo (apoia a laje com a rigidez da viga, sem peso
  // próprio; pilares como molas, como no modelo separado). As forças que a laje e as cargas lançadas passam aos nós dela vão à viga de
  // origem, no pavimento alvo. Dois passos, para a associada flexar como a viga única (com a carga das lajes dos dois grupos):
  // (1) a associada flexa só com a carga do seu grupo; (2) resolve-se o pavimento alvo com as forças do passo 1, pega-se a carga que
  // a viga de origem recebe do seu próprio grupo e a associada é resolvida de novo com ela (a laje vê a flexibilidade da viga única).
  if (b.vigas.some((v) => comumEfetiva(v))) {
    type FNo = Record<string, number[]>;
    const zero6 = () => [0, 0, 0, 0, 0, 0];
    /** Para cada pavimento com associada e cada nó dela (fora dos pilares): forças da laje e das cargas, com `cargaOrigem` (por pavimento e nó da planta) aplicada à associada. */
    const resolverAssociadas = (cargaOrigem?: Map<string, FNo>) => {
      const saida: { pav: (typeof ps)[number]; gi: number; i: number; p: P; pa: NonNullable<ReturnType<typeof alvoComum>>; f: FNo }[] = [];
      for (const [ip, pav] of ps.entries()) {
        const { grupo, gb } = baseDoPav(pav);
        if (!gb.linhaComum.size || !gb.m.barras.length) continue;
        const nodaisX = cargaOrigem ? [...gb.linhaComum].flatMap((i) => { const f = cargaOrigem.get(`${pav.id}|${i}`), gi = gb.idx.get(i); return f && gi !== undefined ? [{ no: gi, f, sinal: 1 as const }] : []; }) : [];
        const gbX = nodaisX.length ? comCargasNodais(gb, nodaisX) : gb;
        const m: Modelo3 = { ...gb.m, molas: molasGrelha(gb, ip, pav) };
        let res: Resultado3;
        if (cargaOrigem) res = resolver3(m, gbX.casos);
        else { const chave = chaveGrelha(grupo.id, m); res = cacheGrelha.get(chave) ?? resolver3(m, gb.casos); cacheGrelha.set(chave, res); }
        if (res.erro) continue; // o laço principal relata
        const tr = transfDaSolucao(gb, m, res); // só as forças da laje e das cargas do próprio grupo (as da viga de origem não entram)
        for (const i of gb.linhaComum) {
          const gi = gb.idx.get(i), pa = gi === undefined || gb.apoio.has(i) ? undefined : alvoComum(gb, i, pav);
          if (!pa || gi === undefined) continue;
          const f: FNo = {};
          for (const c of CASOS) f[c] = tr[c].get(i) ?? zero6();
          saida.push({ pav, gi, i, p: gb.nos[i].p, pa, f });
        }
      }
      return saida;
    };
    const registrarComum = (l: ReturnType<typeof resolverAssociadas>) => {
      comumExtra.clear(); comumRetirar.clear();
      for (const x of l) {
        (comumExtra.get(x.pa.id) ?? comumExtra.set(x.pa.id, []).get(x.pa.id)!).push({ p: x.p, f: x.f });
        // modelo integrado: a laje deste pavimento carrega a associada dentro do superelemento; a carga sai com o oposto
        if (integrado) (comumRetirar.get(x.pav.id) ?? comumRetirar.set(x.pav.id, []).get(x.pav.id)!).push({ no: x.gi, f: x.f });
      }
    };
    const passo1 = resolverAssociadas();
    registrarComum(passo1);
    // carga que a viga de origem recebe do seu próprio grupo: forças do pavimento alvo resolvido com o passo 1, menos as das associadas
    const cargaOrigem = new Map<string, FNo>();
    for (const [paId, extras] of comumExtra) {
      const pavA = ps.find((x) => x.id === paId)!, ipA = ps.indexOf(pavA), { gb: gbA } = baseDoPav(pavA);
      const nodais = extras.flatMap((x) => { const n = noDeVigaMaisProximo(gbA, x.p); return n ? [{ no: n.gi, f: x.f, sinal: 1 as const, i: n.i }] : []; });
      const gbX = comCargasNodais(gbA, nodais);
      const mA: Modelo3 = { ...gbA.m, molas: molasGrelha(gbA, ipA, pavA) };
      const resA = resolver3(mA, gbX.casos);
      if (resA.erro) continue;
      const tr = transfDaSolucao(gbX, mA, resA);
      const nosOrigem = new Set<number>();
      for (const t of gbA.trechos) if (t.viga.comum) { nosOrigem.add(t.a); nosOrigem.add(t.z); }
      for (const x of passo1.filter((y) => y.pa.id === paId)) {
        const n = noDeVigaMaisProximo(gbA, x.p);
        if (!n || !nosOrigem.has(n.i) || gbA.apoio.has(n.i)) continue;
        const f: FNo = {};
        for (const c of CASOS) {
          const total = tr[c].get(n.i) ?? zero6(), asoc = nodais.filter((y) => y.i === n.i).reduce((u, y) => u.map((v, k) => v + (y.f[c]?.[k] ?? 0)), zero6());
          f[c] = total.map((v, k) => v - asoc[k]);
        }
        cargaOrigem.set(`${x.pav.id}|${x.i}`, f);
      }
    }
    if (cargaOrigem.size) registrarComum(resolverAssociadas(cargaOrigem));
  }
  for (const [ip, pav] of ps.entries()) {
    const { grupo, gb: gbBase } = baseDoPav(pav);
    // viga comum: este pavimento é o alvo das cargas de vigas associadas de outros grupos (viga de origem) ou tem viga associada (modelo integrado)
    const extrasComuns = [
      ...(comumExtra.get(pav.id) ?? []).map((x) => ({ no: noDeVigaMaisProximo(gbBase, x.p)?.gi ?? -1, f: x.f, sinal: 1 as const })),
      ...(comumRetirar.get(pav.id) ?? []).map((x) => ({ no: x.no, f: x.f, sinal: -1 as const })),
    ].filter((x) => x.no >= 0);
    const gb = extrasComuns.length ? comCargasNodais(gbBase, extrasComuns) : gbBase;
    for (const a of gb.avisos) avisos.push(a.startsWith('sem vigas') ? `${pav.nome}: ${a}` : a);
    const { m: m0, tags, casos, apoio, nos, grosso, carga } = gb;
    let res: Resultado3 | null = null;
    const reacoes: Record<string, Record<CasoAnalise, number>> = {};
    let transf: Record<CasoAnalise, Map<number, number[]>> = Object.fromEntries(CASOS.map((c) => [c, new Map()]));
    let m: Modelo3 = m0;
    if (integrado && m0.barras.length) {
      // modelo integrado: a grelha vira superelemento do pórtico (resolvida junto com ele mais abaixo)
      let ig = cacheInteg.get(gb);
      if (!ig) { ig = integrarGrelha(gb, pav); cacheInteg.set(gb, ig); }
      if (ig.erro) avisos.push(`${pav.nome}: ${ig.erro}`);
      else integPav.set(pav.id, { gb, ig, gi: grelhas.length });
      m = { ...m0, molas: [] };
    } else if (m0.barras.length) {
      m = { ...m0, molas: molasGrelha(gb, ip, pav) };
      // pavimentos do mesmo grupo têm a mesma grelha; reaproveita a solução quando apoios e molas coincidem
      const chave = chaveGrelha(grupo.id, m, extrasComuns.length ? `|cx${pav.id}` : '');
      res = cacheGrelha.get(chave) ?? resolver3(m, casos);
      cacheGrelha.set(chave, res);
      if (res.erro) avisos.push(`${pav.nome}: ${res.erro}`);
      else {
        for (const [i, pid] of apoio) {
          const r = CASOS.map((_, ic) => res!.reacoes[ic].get(gb!.idx.get(i)!)![2]);
          reacoes[pid] ??= zeros();
          CASOS.forEach((c, ic) => (reacoes[pid][c] += r[ic]));
        }
        // forças das lajes sobre os nós das vigas (e cargas aplicadas nesses nós) → cargas do pórtico
        transf = transfDaSolucao(gb, m, res);
      }
    }
    // viga comum (E2b): os nós da linha de apoio da associada entregam a reação à viga de origem (pré-passo), não ao pórtico deste pavimento
    const comuns = new Set<number>();
    for (const i of gb.linhaComum) if (!apoio.has(i) && gb.idx.has(i) && alvoComum(gb, i, pav)) comuns.add(i);
    for (const c of CASOS) { totais[c] += carga[c]; cargasPavimento[pav.id][c] += carga[c]; }
    grelhas.push({ pavimento: pav.id, modelo: m, barras: tags, res, reacoes, carga, casos });
    geoPav.set(pav.id, { nos, grosso, apoio, transf, comuns });
  }

  // ---- pórtico espacial ----
  const pm: Modelo3 = { nos: [], barras: [], apoios: new Map(), escravos: [], ...(integPav.size ? { condensados: new Set<number>(), superelementos: [] } : {}) };
  /** Superelementos do pórtico (modelo integrado): pavimento, gdl de fronteira e grelha integrada, na ordem de `pm.superelementos`. */
  const seInfo: { pav: string; dofs: number[]; ig: IntegradoGrelha }[] = [];
  /**
   * Vigas do diafragma no modelo integrado: só a parte fora do plano trabalha (no superelemento) e o plano XY é corpo
   * rígido; ficam fora das soluções do pórtico e entram depois, com os esforços tirados da grelha condensada.
   */
  const pendentes = new Map<string, { nb: Barra3; tag: BarraPortico; bi: number; vento: Float64Array[]; pdelta?: Float64Array[] }[]>();
  /** Só para o modelo cheio (testes): dados de cada pavimento integrado. */
  const detalhes: { pav: string; gb: GrelhaBase; ig: IntegradoGrelha; colNo: number[]; noP: Map<number, number>; porRaiz: Map<number, number>; jNo: number[] }[] = [];
  /** E3f: pavimentos com panos ou vigas inclinados: nó do pórtico de cada nó da grelha (−1 = no superelemento), trecho rígido do nó do pórtico ao ponto da grelha e barra do pórtico de cada barra inclinada. */
  const incInfo: { pav: string; gi: number; gb: GrelhaBase; ig: IntegradoGrelha; mapN: Int32Array; offN: (V3 | null)[]; barP: Int32Array }[] = [];
  /** E3f: barras do pórtico dos panos e vigas inclinados. */
  const barrasInc = new Set<number>();
  const ptags: BarraPortico[] = [];
  /** Nós do pórtico das vigas de vínculo externo (E2e) e o tipo de vínculo: viram apoios e saem do diafragma. */
  const veNos = new Map<number, NonNullable<Viga['vinculoExterno']>>();
  const mestres: Record<string, number> = {};
  const zonas: Record<string, ZonaPortico[]> = {};
  const zf = cotaFundacao(b);
  // base elástica (FU6): radiers e vigas sobre molas no nível de fundação; os pilares sobre eles nascem num nó da malha
  const base = montarBaseElastica(b, op, pm, zf, CASOS);
  if (base) { for (let i = ptags.length; i < pm.barras.length; i++) { ptags.push({ tipo: 'fundacao', ref: base.info.barras[i]?.ref ?? '', pavimento: 'fundacao' }); } avisos.push(...base.avisos); }
  const primeiroLance = new Map<string, number>();
  // nós dos pilares por nível (base na fundação)
  const noPilar = new Map<string, number>(); // `${pilar}|${pav ou 'base'}`
  /** Por pavimento (modelo separado): nó do pórtico no ponto do eixo de uma viga (vigas inclinadas, E2c). */
  const nosVigaPav = new Map<string, (p: P) => number | undefined>();
  // pilares apoiados (E1a): o pé liga-se ao elemento de apoio (pilar de baixo, nó da viga ou nó da grelha da laje) quando o
  // modelo o permite; senão fica no apoio fixo provisório, com aviso. Sobre laje, só no modelo integrado.
  const baseLigada = new Map<string, 'pilar' | 'viga' | 'laje'>(), deferidos: Pilar[] = [], offBase = new Map<string, V3>();
  for (const [id, a] of apoios) {
    const pa = b.pilares.find((x) => x.id === id)!;
    if (!a || !lancesDoPilar(b, pa).length) continue;
    if (a.tipo === 'pilar') { baseLigada.set(id, 'pilar'); continue; }
    if (!naGrelha(pa)) continue;
    const ok = op.modeloGlobal === 1 ? integPav.get(pa.nasce)?.ig.pils.includes(id) : geoPav.get(pa.nasce)?.grosso.nos.some((n) => n.pilar === id);
    if (ok) baseLigada.set(id, a.tipo);
  }
  for (const p of pilaresA) {
    const l = lancesDoPilar(b, p);
    if (!l.length) continue;
    const c = centroPilar(p, p.secao);
    const i0 = ps.findIndex((x) => x.id === l[0].id);
    const baseKey = p.nasce === 'fundacao' ? `${p.id}|base` : `${p.id}|${p.nasce}`;
    const flut = p.nasce === 'fundacao' ? base?.info.pilares[p.id] : undefined;
    const lig = baseLigada.get(p.id);
    if (flut) noPilar.set(baseKey, flut.no);
    else if (lig === 'pilar') deferidos.push(p);
    else if (lig) { const cb = centroNoLance(p, l[0].id); noPilar.set(baseKey, pm.nos.length); pm.nos.push([cb[0], cb[1], ps[i0 - 1].cota]); } // sobre viga ou laje: nó livre, ligado pela viga/grelha
    else {
      const nb = pm.nos.length;
      noPilar.set(baseKey, nb); pm.nos.push([c[0], c[1], i0 === 0 ? (p.nasce === 'fundacao' && p.cotaBase !== undefined ? p.cotaBase : zf) : ps[i0 - 1].cota]);
      // vínculo externo (N2c): engaste (padrão), rótula (giros de flexão livres) ou molas por gdl (ausente = preso, 0 = livre)
      const vb = p.nasce === 'fundacao' ? p.vinculoBase : undefined;
      if (!vb || vb.tipo === 'engaste') pm.apoios.set(nb, [0, 1, 2, 3, 4, 5]);
      else if (vb.tipo === 'rotula') pm.apoios.set(nb, [0, 1, 2, 5]);
      else {
        const ks = [vb.kx, vb.ky, vb.kz, vb.krx, vb.kry, vb.krz];
        pm.apoios.set(nb, ks.flatMap((k, g) => (k === undefined ? [g] : [])));
        ks.forEach((k, g) => { if (k) (pm.molas ??= []).push({ no: nb, gdl: g, k }); });
      }
    }
    if (p.nasce !== 'fundacao' && !lig && inicioDe(p) === 'apoiado') {
      const a = apoios.get(p.id), nomePav = ps.find((x) => x.id === p.nasce)?.nome;
      avisos.push(`${p.nome} nasce em ${nomePav}: ${!a ? 'sem pilar, viga ou laje de apoio no modelo' : a.tipo === 'laje' && op.modeloGlobal !== 1 ? 'apoiado em laje, e o modelo separado não liga o pé à laje (use o modelo integrado)' : 'o pé não alcança o eixo da viga de apoio'} (apoio fixo provisório).`);
    }
    for (const x of l) {
      const cx = centroNoLance(p, x.id);
      // E3f: pilar que só recebe barras de pano ou viga inclinados: o topo do lance sobe ao plano
      noPilar.set(`${p.id}|${x.id}`, pm.nos.length); pm.nos.push([cx[0], cx[1], x.cota + (integPav.get(x.id)?.ig.zPilar.get(p.id) ?? 0)]);
    }
  }
  // sobre pilar: o pé é o nó do topo do pilar de baixo; a parte fora da projeção liga-se por trecho rígido (offset da ponta)
  for (const p of deferidos) {
    const a = apoios.get(p.id) as { principal: string }, qn = noPilar.get(`${a.principal}|${p.nasce}`)!;
    noPilar.set(`${p.id}|${p.nasce}`, qn);
    const cb = centroNoLance(p, lancesDoPilar(b, p)[0].id), nq = pm.nos[qn], o: V3 = [cb[0] - nq[0], cb[1] - nq[1], 0];
    if (Math.hypot(o[0], o[1]) > 1e-9) offBase.set(p.id, o);
  }
  const casosV: Caso3[] = CASOS.map(() => ({ nodais: [], distribuidas: [], pontuais: [] }));
  for (const n of base?.nodais ?? []) casosV[CASOS.indexOf(n.caso)].nodais.push({ no: n.no, f: n.f });
  for (const p of pilaresA) {
    const l = lancesDoPilar(b, p);
    let ant = noPilar.get(p.nasce === 'fundacao' ? `${p.id}|base` : `${p.id}|${p.nasce}`);
    const lig = baseLigada.get(p.id);
    for (const x of l) {
      const sx = secaoNoLance(p, x.id), angX = anguloNoLance(p, x.id), inr = inerciasPilar(sx, angX), j = noPilar.get(`${p.id}|${x.id}`)!;
      const a = (angX * Math.PI) / 180;
      // eixo local y = direção b da seção (Iz: deslocamento em y local)
      const Ep = Em('pilar', x.id, p);
      const barra: Barra3 = { i: ant!, j, E: Ep, G: Gm(Ep), A: inr.A, Iz: inr.Iu, Iy: inr.Iv, J: op.torcaoPilar * inr.J, ref: [Math.cos(a), Math.sin(a), 0] };
      // engaste por lance (topo/base); no topo do último lance multiplica o das opções (flexão nas duas direções)
      // com pilar apoiado em cima, o topo é contínuo; na base de pilar sobre viga ou laje, o engaste da transição
      const eg = engasteNoLance(p, x.id), aTopo = eg.topo * (x === l.at(-1) && !sobreDe.has(p.id) ? op.engasteTopoUltimo : 1);
      const aBase = eg.base * (x === l[0] && (lig === 'viga' || lig === 'laje') ? op.engasteTransicao : 1);
      if (aTopo < 1) barra.engJ = [[4, aTopo], [5, aTopo]];
      if (aBase < 1) barra.engI = [[4, aBase], [5, aBase]];
      if (x === l[0] && base?.offsets.has(p.id) && base.info.pilares[p.id]) barra.offI = base.offsets.get(p.id);
      else if (x === l[0] && offBase.has(p.id)) barra.offI = offBase.get(p.id);
      else {
        // excentricidade entre lances (N2c): o nó do pavimento fica no centro da seção de baixo; o lance de cima liga-se
        // a ele por trecho rígido horizontal até o seu centro (N·e transmitido), e a parte flexível fica vertical
        const pi = pm.nos[ant!], dx = pm.nos[j][0] - pi[0], dy = pm.nos[j][1] - pi[1];
        if (Math.hypot(dx, dy) > 1e-9) barra.offI = [dx, dy, 0];
      }
      // comprimento flexível entre faces (opção): trecho rígido vertical no topo, da face inferior da viga mais alta ao nó
      if (op.pilarComprimento === 1) {
        const hT = flambagemLance(b, p, x.id).hTopo, H = pm.nos[j][2] - pm.nos[ant!][2];
        if (hT > 1e-9 && hT < H - 1e-6) barra.offJ = [0, 0, -hT];
      }
      if (x === l[0]) primeiroLance.set(p.id, pm.barras.length);
      pm.barras.push(barra);
      ptags.push({ tipo: 'pilar', ref: p.id, pavimento: x.id, ...(x === l[0] && lig ? { transicao: lig } : {}) });
      // peso próprio do lance no nó de cima
      const [w, h] = dimsSecao(sx), area = sx.tipo === 'circ' ? (Math.PI * w * w) / 4 : w * h;
      const H = pm.nos[j][2] - pm.nos[ant!][2];
      casosV[0].nodais.push({ no: j, f: [0, 0, -GAMA_CONCRETO * area * H, 0, 0, 0] });
      totais.G += GAMA_CONCRETO * area * H;
      cargasPavimento[x.id].G += GAMA_CONCRETO * area * H;
      ant = j;
    }
  }
  // cargas lançadas nos pilares: no topo do lance (nó) ou ao longo dele (concentrada na barra)
  for (const cp of b.cargasPilar ?? []) {
    const ic = CASOS.indexOf(cp.caso), bi = ptags.findIndex((t) => t.tipo === 'pilar' && t.ref === cp.pilar && t.pavimento === cp.pavimento);
    if (ic < 0 || bi < 0) continue;
    const br = pm.barras[bi], H = pm.nos[br.j][2] - pm.nos[br.i][2];
    // eixos locais da seção (N2c): x ao longo de b, y ao longo de h, girados pelo ângulo do pilar
    const pil = b.pilares.find((q) => q.id === cp.pilar)!, ang = cp.eixos === 'local' ? (pil.angulo * Math.PI) / 180 : 0, ca = Math.cos(ang), sa = Math.sin(ang);
    const gl = (x: number, y: number) => [x * ca - y * sa, x * sa + y * ca];
    const [Hx, Hy] = gl(cp.Hx, cp.Hy), [Mx, My] = gl(cp.Mx, cp.My);
    const tipo = cp.tipo ?? 'concentrada';
    if (tipo === 'concentrada') {
      const f = [Hx, Hy, -cp.N, Mx, My, cp.T ?? 0];
      if (cp.altura === undefined || cp.altura >= H - 1e-9) casosV[ic].nodais.push({ no: br.j, f });
      else if (cp.altura <= 1e-9) casosV[ic].nodais.push({ no: br.i, f });
      else (casosV[ic].pontuais ??= []).push({ barra: bi, a: cp.altura, f });
      totais[cp.caso] += cp.N; cargasPavimento[cp.pavimento][cp.caso] += cp.N;
    } else if (tipo === 'uniforme') {
      // por metro da parte flexível (kN/m)
      const Lf = baseBarra(pm, br).L;
      casosV[ic].distribuidas.push({ barra: bi, q: [Hx, Hy, -cp.N] });
      totais[cp.caso] += cp.N * Lf; cargasPavimento[cp.pavimento][cp.caso] += cp.N * Lf;
    } else {
      // faixa de `altura` a `ate`: 20 resultantes concentradas no meio de cada trecho (erro O(1/400) nos momentos)
      const a0 = Math.max(0, Math.min(H, cp.altura ?? 0)), a1 = Math.max(a0, Math.min(H, cp.ate ?? H)), n = 20, d = (a1 - a0) / n;
      if (d > 0) for (let k = 0; k < n; k++) (casosV[ic].pontuais ??= []).push({ barra: bi, a: a0 + (k + 0.5) * d, f: [Hx * d, Hy * d, -cp.N * d, 0, 0, 0] });
      totais[cp.caso] += cp.N * (a1 - a0); cargasPavimento[cp.pavimento][cp.caso] += cp.N * (a1 - a0);
    }
  }
  // pilares-parede (E1b): cascas dos lados longos, viga fictícia no topo e ligação dos lados em barra
  const noParedes: ParedesNoPortico | undefined = paredes ? incluirParedes({
    b, geo: paredes, pm, casosV, noPilar, Ec: (pav) => Em('pilar', pav), Ev, Gv, nu: op.nu, gama: GAMA_CONCRETO, ret, iG: CASOS.indexOf('G'),
    materialParede: (w) => { const t = tipoAlvenariaDe(b, w); if (!t || !ehAlvenaria(w)) return undefined; const r = resistenciaAlvenaria(t, blocoDe(b, t), op); return { E: r.E * 1000, nu: r.nu, gama: r.gama }; },
    hViga: op.pilarParedeVigaAltura / 100, caso: (id) => CASOS.indexOf(id),
    peso: (pav, kN) => { totais.G += kN; cargasPavimento[pav].G += kN; },
    etiqueta: (ref, pav) => ptags.push({ tipo: 'parede', ref, pavimento: pav }),
  }) : undefined;
  // vigas por pavimento (divisão grossa), com trecho rígido até a face do pilar menos 0,3h
  for (const pav of ps) {
    const z = pav.cota;
    /** Vigas que chegam a cada nó: as de fora do diafragma não prendem o nó ao corpo rígido do pavimento. */
    const usoNo = new Map<number, { livre: number; diafragma: number }>();
    /** Modelo integrado: nós do pórtico tocados por lajes (ficam no diafragma) e pares ligados pela grelha. */
    const naLaje = new Set<number>(), ligar: [number, number][] = [];
    /** E3f: nós dos panos inclinados fora do diafragma (opção planoDiafragma = 0) ou levados a ele (= 1). */
    const foraNivel = new Set<number>(), forcaNivel = new Set<number>();
    const ipg = integPav.get(pav.id);
    if (ipg) {
      // grelha condensada (superelemento nos nós dos pilares) + vigas da divisão fina só para os esforços e o plano XY
      const { gb, ig } = ipg;
      const colNo = ig.pils.map((pid) => noPilar.get(`${pid}|${pav.id}`)!);
      const noP = new Map<number, number>(); // nó interno da grelha → nó do pórtico
      // E3f: junções (fronteira do superelemento fora de pilar): nó do pórtico na cota do pavimento, com uz, rx e ry livres
      const jNo = ig.nosJuncao.map((n) => { const j = pm.nos.length; pm.nos.push([gb.m.nos[n][0], gb.m.nos[n][1], z]); return j; });
      const noDe = (n: number) => {
        const k = ig.assoc[n];
        if (k >= 0) return colNo[k];
        if (ig.juncao[n] >= 0) return jNo[ig.juncao[n]];
        let j = noP.get(n);
        if (j === undefined) { j = pm.nos.length; noP.set(n, j); pm.nos.push([gb.m.nos[n][0], gb.m.nos[n][1], z]); for (const g of [2, 3, 4]) pm.condensados!.add(j * 6 + g); }
        return j;
      };
      /** Trecho rígido no pórtico: do nó do pilar até o nó associado, mais o da face (nós internos: o da barra). */
      const offDe = (n: number, off: V3 | undefined): V3 | undefined => {
        const k = ig.assoc[n];
        if (k < 0) return off;
        // mesmo nulo, o trecho rígido marca a ponta no pilar (o corte do cortante na face usa a sua presença)
        return [gb.m.nos[n][0] - ig.centros[k][0] + (off?.[0] ?? 0), gb.m.nos[n][1] - ig.centros[k][1] + (off?.[1] ?? 0), 0];
      };
      gb.trechoDe.forEach((t, bi) => {
        if (!t || comumEfetiva(t.viga) || gb.inc?.barra[bi]) return; // viga associada de viga comum: a barra é a da origem (E2b); inclinada (E3f): adiante
        const br = ig.barras[bi], i0 = noDe(br.i), j0 = noDe(br.j);
        if (i0 === j0) return; // trecho inteiro dentro do pilar: rígido
        const nb: Barra3 = { ...br, i: i0, j: j0, soPlano: true };
        delete nb.offI; delete nb.offJ;
        const oI = offDe(br.i, br.offI), oJ = offDe(br.j, br.offJ);
        if (oI) nb.offI = oI;
        if (oJ) nb.offJ = oJ;
        const tag: BarraPortico = { tipo: 'viga', ref: t.viga.id, pavimento: pav.id, fina: true };
        if (t.viga.foraDiafragma) {
          pm.barras.push(nb);
          ptags.push(tag);
          const k = pm.barras.length - 1;
          ig.distDe.forEach((mp, ic) => { for (const q of mp.get(bi) ?? []) casosV[ic].distribuidas.push({ barra: k, q }); });
        } else (pendentes.get(pav.id) ?? pendentes.set(pav.id, []).get(pav.id)!).push({ nb, tag, bi, vento: [] });
        for (const n of [i0, j0]) { const u = usoNo.get(n) ?? { livre: 0, diafragma: 0 }; u[t.viga.foraDiafragma ? 'livre' : 'diafragma']++; usoNo.set(n, u); }
      });
      // nós só de laje não entram no pórtico: ficam no superelemento e voltam na retrossubstituição
      const se = pm.superelementos!.length, dofs = [...colNo, ...jNo].flatMap((c) => [c * 6 + 2, c * 6 + 3, c * 6 + 4]);
      const internosP = [...noP].map(([n, j]) => [3 * ig.interno[n], j * 6] as const);
      const temSolvidas = internosP.length && gb.trechoDe.some((t) => t?.viga.foraDiafragma);
      pm.superelementos!.push({
        dofs, K: ig.cond.S,
        recuperar: !temSolvidas ? undefined : (u, c) => {
          const uI = recuperarInternos(ig.cond, dofs.map((d) => u[d]), typeof c?.dados === 'number' ? c.dados : undefined);
          for (const [o, j] of internosP) { u[j + 2] = uI[o]; u[j + 3] = uI[o + 1]; u[j + 4] = uI[o + 2]; }
        },
      });
      seInfo.push({ pav: pav.id, dofs, ig });
      CASOS.forEach((_, ic) => (casosV[ic].superelementos ??= []).push({ se, P: ig.cond.Pb[ic], dados: ic }));
      // diafragma: nós do pórtico unidos pela grelha (lajes e vigas do diafragma)
      const porRaiz = new Map<number, number>();
      const reg = (n: number, j: number) => { const r = ig.uniao[n], a = porRaiz.get(r); if (a === undefined) porRaiz.set(r, j); else if (a !== j) ligar.push([a, j]); if (ig.comLaje[n]) naLaje.add(j); };
      for (const [n, j] of noP) reg(n, j);
      ig.nosJuncao.forEach((n, k) => reg(n, jNo[k]));
      for (let n = 0; n < ig.assoc.length; n++) if (ig.assoc[n] >= 0) reg(n, colNo[ig.assoc[n]]);
      if (extra.cheio) detalhes.push({ pav: pav.id, gb, ig, colNo, noP, porRaiz, jNo });
      // ---- E3f: panos e vigas inclinados: barras 3D no pórtico, nós com 6 gdl (fora do diafragma, salvo planoDiafragma = 1) ----
      if (gb.inc) {
        const inc = gb.inc, nn = gb.m.nos.length, mapN = new Int32Array(nn).fill(-1), offN: (V3 | null)[] = new Array(nn).fill(null);
        const pt3 = (n: number): V3 => [gb.m.nos[n][0], gb.m.nos[n][1], z + inc.z[n]];
        /** Nó do pórtico do nó da grelha (junção, pilar da fronteira, pilar só do plano ou nó livre novo) e o trecho rígido até o ponto. */
        const noInc = (n: number) => {
          if (mapN[n] >= 0) return mapN[n];
          let j: number;
          const kp = ig.pilarDe[n], pn = kp >= 0 ? noPilar.get(`${gb.pilares[kp]}|${pav.id}`) : undefined;
          if (ig.juncao[n] >= 0) j = jNo[ig.juncao[n]];
          else if (ig.assoc[n] >= 0) j = colNo[ig.assoc[n]];
          else if (pn !== undefined) j = pn;
          else { j = pm.nos.length; pm.nos.push(pt3(n)); (op.planoDiafragma ? forcaNivel : foraNivel).add(j); }
          if (pn !== undefined && op.planoDiafragma && !ig.noSE[n]) forcaNivel.add(j);
          const P0 = pm.nos[j], G = pt3(n), o: V3 = [G[0] - P0[0], G[1] - P0[1], G[2] - P0[2]];
          offN[n] = Math.hypot(o[0], o[1], o[2]) > 1e-9 ? o : null;
          mapN[n] = j;
          return j;
        };
        const barP = new Int32Array(gb.m.barras.length).fill(-1), iG = CASOS.indexOf('G');
        gb.m.barras.forEach((br0, bi) => {
          if (!inc.barra[bi]) return;
          const t = gb.trechoDe[bi], br = ig.barras[bi], i0 = noInc(br0.i), j0 = noInc(br0.j);
          const GI = pt3(br0.i), GJ = pt3(br0.j), Lh = Math.hypot(GJ[0] - GI[0], GJ[1] - GI[1]), L3 = Math.hypot(Lh, GJ[2] - GI[2]), fq = L3 > 1e-12 ? Lh / L3 : 1;
          const nb: Barra3 = { ...br, i: i0, j: j0 }, rig: number[] = [0, 0];
          delete nb.offI; delete nb.offJ; delete nb.soPlano; delete nb.ref;
          for (const [ponta, n, outro, G, Go] of [['offI', br0.i, br0.j, GI, GJ], ['offJ', br0.j, br0.i, GJ, GI]] as const) {
            const base = offN[n] ?? [0, 0, 0];
            let f: V3 = [0, 0, 0];
            if (t) {
              // viga: trecho rígido até a face do pilar menos trechoRigido·h (na direção da barra, subindo com ela)
              const k = ig.pilarDe[n];
              let f2: V3 | null = null;
              if (k >= 0 && ig.pilarDe[outro] !== k) { const pil = pilarPor.get(gb.pilares[k])!, gp = geoEm(pil, pav.id), cs = consoloEm(t.viga.id, pil.id); f2 = offsetFace([G[0], G[1]], [Go[0], Go[1]], gp.p, gp.secao, cs ? -cs.a : op.trechoRigido * t.viga.secao.h, [G[0], G[1], 0]); }
              else if (k < 0) f2 = (ponta === 'offI' ? br.offI : br.offJ) ?? null;
              if (f2) { f = [f2[0], f2[1], Lh > 1e-12 ? ((Go[2] - G[2]) * Math.hypot(f2[0], f2[1])) / Lh : 0]; rig[ponta === 'offI' ? 0 : 1] = Math.hypot(f[0], f[1], f[2]); }
            }
            const o: V3 = [base[0] + f[0], base[1] + f[1], base[2] + f[2]];
            if (Math.hypot(o[0], o[1], o[2]) > 1e-9 || (t && ig.pilarDe[n] >= 0)) nb[ponta] = o;
          }
          const a3 = pm.nos[i0], z3 = pm.nos[j0], oI = nb.offI ?? [0, 0, 0], oJ = nb.offJ ?? [0, 0, 0];
          if (Math.hypot(z3[0] + oJ[0] - a3[0] - oI[0], z3[1] + oJ[1] - a3[1] - oI[1], z3[2] + oJ[2] - a3[2] - oI[2]) < 1e-6) return; // dentro do pilar: rígido
          if (!t) { const fat = inc.fator[bi], nrm = inc.normal[bi]; nb.A *= fat; nb.Iz *= fat; nb.Iy *= fat; nb.J *= fat; if (nb.Ay) nb.Ay *= fat; if (nrm) nb.ref = nrm; }
          const k = pm.barras.length;
          pm.barras.push(nb);
          barP[bi] = k; barrasInc.add(k);
          ptags.push(t ? { tipo: 'viga', ref: t.viga.id, pavimento: pav.id, fina: true } : { tipo: 'laje', ref: gb.tags[bi].ref, pavimento: pav.id });
          // cargas da grelha por comprimento em planta → por comprimento da barra 3D
          ig.distDe.forEach((mp, ic) => { for (const q of mp.get(bi) ?? []) casosV[ic].distribuidas.push({ barra: k, q: [q[0] * fq, q[1] * fq, q[2] * fq] }); });
          // peso dos trechos rígidos até a face (a carga distribuída atua só na parte flexível)
          if (t && iG >= 0) [i0, j0].forEach((j, e) => { if (rig[e] > 1e-12) casosV[iG].nodais.push({ no: j, f: [0, 0, -pesoLinearViga(t.viga) * rig[e], 0, 0, 0] }); });
          if (op.planoDiafragma) ligar.push([i0, j0]);
        });
        // cargas nodais da grelha nos nós só das barras inclinadas (com o momento do trecho rígido)
        gb.casos.forEach((cs, ic) => { for (const nd of cs.nodais) {
          if (ig.noSE[nd.no]) continue;
          const j = noInc(nd.no), o = offN[nd.no], f = [...nd.f];
          if (o) { f[3] += o[1] * f[2] - o[2] * f[1]; f[4] += o[2] * f[0] - o[0] * f[2]; f[5] += o[0] * f[1] - o[1] * f[0]; }
          casosV[ic].nodais.push({ no: j, f });
        } });
        incInfo.push({ pav: pav.id, gi: ipg.gi, gb, ig, mapN, offN, barP });
      }
    } else {
    const g0 = geoPav.get(pav.id)!, g = g0.grosso;
    const local = new Map<number, number>();
    const noViga = (i: number) => {
      const pid = g.nos[i].pilar;
      if (pid && noPilar.has(`${pid}|${pav.id}`)) return noPilar.get(`${pid}|${pav.id}`)!;
      if (!local.has(i)) { local.set(i, pm.nos.length); pm.nos.push([g.nos[i].p[0], g.nos[i].p[1], z]); }
      return local.get(i)!;
    };
    /** Barra do pórtico de cada trecho grosso: índice, início da parte flexível e direção (para cargas concentradas). */
    const barraDe = new Map<number, { bi: number; ini: P; u: P; L: number } | { no: number }>();
    g.trechos.forEach((t, ti) => {
      if (comumEfetiva(t.viga)) return; // viga associada de viga comum: a barra é a da origem (E2b)
      const v = t.viga, pv = propsBarraViga(b, v, op), pp = pesoLinearViga(v);
      const ni = noViga(t.a), nj = noViga(t.z);
      const Lt = Math.hypot(g.nos[t.z].p[0] - g.nos[t.a].p[0], g.nos[t.z].p[1] - g.nos[t.a].p[1]);
      if (ni === nj) { casosV[0].nodais.push({ no: ni, f: [0, 0, -pp * Lt, 0, 0, 0] }); barraDe.set(ti, { no: ni }); return; } // dentro do pilar
      const barra: Barra3 = { i: ni, j: nj, E: Ev, G: Gv, ...pv };
      if (op.barraCurtaLimite > 0 && op.barraCurtaFator !== 1 && Lt <= op.barraCurtaLimite + 1e-9) { barra.A *= op.barraCurtaFator; barra.Iz *= op.barraCurtaFator; barra.Iy *= op.barraCurtaFator; barra.J *= op.barraCurtaFator; }
      for (const [k, i, outro] of [['I', t.a, t.z], ['J', t.z, t.a]] as const) {
        const pid = g.nos[i].pilar;
        if (!pid) {
          const ov = op.vigaApoiadaRigida ? offsetApoiadaEmViga(i, outro, t, g.trechos, g.nos) : null;
          if (ov) { if (k === 'I') barra.offI = ov; else barra.offJ = ov; }
          continue;
        }
        const pil = pilarPor.get(pid)!;
        const gp = geoEm(pil, pav.id), cs = consoloEm(v.id, pid), off = offsetFace(g.nos[i].p, g.nos[outro].p, gp.p, gp.secao, cs ? -cs.a : op.trechoRigido * v.secao.h, pm.nos[k === 'I' ? ni : nj]); // consolo (E2e): rígido até o centro do aparelho
        if (off) { if (k === 'I') barra.offI = off; else barra.offJ = off; }
      }
      vincularPontas(barra, t, g.trechos, g.nos, [4, 5], ctxPontas);
      pm.barras.push(barra);
      ptags.push({ tipo: 'viga', ref: v.id, pavimento: pav.id });
      for (const n of [ni, nj]) { const u = usoNo.get(n) ?? { livre: 0, diafragma: 0 }; u[v.foraDiafragma ? 'livre' : 'diafragma']++; usoNo.set(n, u); }
      const bi = pm.barras.length - 1;
      casosV[0].distribuidas.push({ barra: bi, q: [0, 0, -pp] });
      if (v.vinculoExterno) for (const n of [ni, nj]) veNos.set(n, v.vinculoExterno);
      // a carga distribuída atua só na parte flexível: o peso dos trechos rígidos vai para o nó do pilar
      const nI = pm.nos[ni], nJ = pm.nos[nj], oI = barra.offI ?? [0, 0, 0], oJ = barra.offJ ?? [0, 0, 0];
      const ini: P = [nI[0] + oI[0], nI[1] + oI[1]], fim: P = [nJ[0] + oJ[0], nJ[1] + oJ[1]];
      const Lflex = Math.hypot(fim[0] - ini[0], fim[1] - ini[1]);
      const rigI = barra.offI ? Math.hypot(oI[0], oI[1]) : 0, rigJ = barra.offJ ? Math.hypot(oJ[0], oJ[1]) : 0;
      const falta = Math.max(0, Lt - Lflex), tot = rigI + rigJ || 1;
      if (falta > 1e-9) { if (rigI) casosV[0].nodais.push({ no: ni, f: [0, 0, (-pp * falta * rigI) / tot, 0, 0, 0] }); if (rigJ) casosV[0].nodais.push({ no: nj, f: [0, 0, (-pp * falta * rigJ) / tot, 0, 0, 0] }); }
      barraDe.set(ti, { bi, ini, u: [(fim[0] - ini[0]) / Lflex, (fim[1] - ini[1]) / Lflex], L: Lflex });
    });
    // forças que as lajes passam às vigas (nós da grelha): no nó grosso, no pilar ou concentradas na barra
    const achaGrosso = (p: P) => g.nos.findIndex((n) => Math.hypot(n.p[0] - p[0], n.p[1] - p[1]) <= 0.005);
    // nó do pórtico num ponto do eixo das vigas (pilar ou nó de viga), para as vigas inclinadas (E2c)
    nosVigaPav.set(pav.id, (p) => { const k = achaGrosso(p); if (k < 0) return undefined; const pid = g.nos[k].pilar; return pid && noPilar.has(`${pid}|${pav.id}`) ? noPilar.get(`${pid}|${pav.id}`) : local.get(k); });
    CASOS.forEach((c, ic) => {
      for (const [i, f] of g0.transf[c]) {
        if (g0.comuns.has(i)) continue; // reação da linha da viga associada: vai à viga de origem (E2b)
        const p = g0.nos[i].p, pid = g0.apoio.get(i);
        if (pid && noPilar.has(`${pid}|${pav.id}`)) { casosV[ic].nodais.push({ no: noPilar.get(`${pid}|${pav.id}`)!, f }); continue; }
        const k = achaGrosso(p);
        if (k >= 0) { casosV[ic].nodais.push({ no: noViga(k), f }); continue; }
        let melhor = -1, dm = Infinity;
        g.trechos.forEach((t, ti) => {
          const a = g.nos[t.a].p, zz = g.nos[t.z].p, dx = zz[0] - a[0], dy = zz[1] - a[1], L2 = dx * dx + dy * dy;
          const u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
          const d = Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
          if (d < dm) { dm = d; melhor = ti; }
        });
        const bd = barraDe.get(melhor);
        if (!bd) continue;
        if ('no' in bd) { casosV[ic].nodais.push({ no: bd.no, f }); continue; }
        const a = (p[0] - bd.ini[0]) * bd.u[0] + (p[1] - bd.ini[1]) * bd.u[1];
        if (a <= 0 || a >= bd.L) { const br = pm.barras[bd.bi]; casosV[ic].nodais.push({ no: a <= 0 ? br.i : br.j, f }); continue; } // no trecho rígido
        (casosV[ic].pontuais ??= []).push({ barra: bd.bi, a, f });
      }
    });
    }
    // vínculo externo (E2e): apoios nos nós das vigas (engaste: tudo; articulação: deslocamentos; deslizante: só o vertical) e rigidez de folga nos gdl livres
    for (const [n, tipo] of veNos) {
      if (pm.apoios.has(n) && (pm.molas ?? []).some((m) => m.no === n && m.k === K_FOLGA_VINCULO)) continue;
      const fixos = tipo === 'engaste' ? [0, 1, 2, 3, 4, 5] : tipo === 'articulacao' ? [0, 1, 2] : [2];
      pm.apoios.set(n, [...new Set([...(pm.apoios.get(n) ?? []), ...fixos])].sort());
      for (let g = 0; g < 6; g++) if (!pm.apoios.get(n)!.includes(g)) (pm.molas ??= []).push({ no: n, gdl: g, k: K_FOLGA_VINCULO });
    }
    // diafragma por zona independente: nós ligados por vigas do diafragma formam uma zona (corpo rígido próprio);
    // nó isolado (pilar sem vigas no nível) é zona sem diafragma. Sem a opção, um diafragma só por pavimento.
    const soLivre = (i: number) => { const u = usoNo.get(i); return !!u && u.livre > 0 && !u.diafragma && !naLaje.has(i); };
    // paredes que não tocam laje no nível ficam fora do diafragma (E1c; K1.2.5, K1.3.36)
    const paredeLivre = new Set((noParedes?.foraDiafragma ?? []).filter((x) => x.pavimento === pav.id && !naLaje.has(x.no)).map((x) => x.no));
    const nivel = pm.nos.map((n, i) => [n, i] as const).filter(([n, i]) => (Math.abs(n[2] - z) < 1e-6 || forcaNivel.has(i)) && !foraNivel.has(i) && !pm.apoios.has(i) && !soLivre(i) && !paredeLivre.has(i));
    const pos = new Map(nivel.map(([, i], k) => [i, k]));
    const pai = nivel.map((_, k) => k);
    const raiz = (k: number): number => (pai[k] === k ? k : (pai[k] = raiz(pai[k])));
    if (op.zonasIndependentes) {
      pm.barras.forEach((br, bi) => {
        const t = ptags[bi];
        if ((t.tipo !== 'viga' && t.tipo !== 'parede') || t.pavimento !== pav.id || (t.tipo === 'viga' && b.vigas.find((v) => v.id === t.ref)?.foraDiafragma) || barrasInc.has(bi)) return;
        const a = pos.get(br.i), c = pos.get(br.j);
        if (a !== undefined && c !== undefined) pai[raiz(a)] = raiz(c);
      });
      for (const [i, j] of ligar) { const a = pos.get(i), c = pos.get(j); if (a !== undefined && c !== undefined) pai[raiz(a)] = raiz(c); }
    } else nivel.forEach((_, k) => (pai[raiz(k)] = raiz(0)));
    const grupos = new Map<number, number[]>();
    nivel.forEach(([, i], k) => grupos.set(raiz(k), [...(grupos.get(raiz(k)) ?? []), i]));
    const lajesPav = b.lajes.filter((l) => l.grupo === pav.grupo);
    const zs: ZonaPortico[] = [];
    for (const nos of [...grupos.values()].sort((a, c) => c.length - a.length)) {
      const xs = nos.map((i) => pm.nos[i][0]), ys = nos.map((i) => pm.nos[i][1]);
      const bb = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      if (nos.length < 2) { zs.push({ ...bb, cx: xs[0], cy: ys[0], no: nos[0], nos }); continue; }
      // mestre no centro geométrico das lajes da zona (ou dos nós)
      let cx = 0, cy = 0, A = 0;
      for (const l of lajesPav) {
        const c = centroide(l.contorno);
        if (c[0] < bb.x0 - 0.01 || c[0] > bb.x1 + 0.01 || c[1] < bb.y0 - 0.01 || c[1] > bb.y1 + 0.01) continue;
        const a = Math.abs(areaPoligono(l.contorno)); cx += c[0] * a; cy += c[1] * a; A += a;
      }
      if (!A) { for (const i of nos) { cx += pm.nos[i][0]; cy += pm.nos[i][1]; } A = nos.length; }
      const mi = pm.nos.length;
      pm.nos.push([cx / A, cy / A, z]);
      pm.apoios.set(mi, [2, 3, 4]);
      for (const i of nos) pm.escravos!.push({ no: i, mestre: mi });
      zs.push({ ...bb, cx: cx / A, cy: cy / A, no: mi, nos });
    }
    zonas[pav.id] = zs;
    const principal = zs.find((x) => x.nos.length > 1);
    if (principal) mestres[pav.id] = principal.no;
  }
  // ---- vigas inclinadas entre pavimentos (E2c) ----
  // Barra de 2 nós e 6 gdl ligada aos nós existentes (pilar: face do pilar menos trechoRigido·h; viga: nó criado no eixo), fora do
  // diafragma (nada a une ao corpo rígido do pavimento). EI bruto nas duas direções, GJ × coeficiente das vigas, EA bruto.
  const inclinadasInfo: InclinadaNoPortico[] = [], nosCruzamento = new Map<string, number>();
  for (const bar of expandirInclinadas(b)) {
    const inc = bar.inc, s = inc.secao, dh = Math.hypot(bar.pFim[0] - bar.pIni[0], bar.pFim[1] - bar.pIni[1]);
    if (dh < 0.05 || Math.abs(bar.zFim - bar.zIni) < DESNIVEL_MIN) { avisos.push(`${bar.rotulo}: barra inclinada ignorada (pontas na mesma cota ou uma sobre a outra).`); continue; }
    const nos: number[] = [], offs: V3[] = [], ligs: Ligacao[] = [];
    let falha = '';
    ([[bar.pavIni, bar.pIni, bar.zIni, bar.pFim, bar.zFim, 'inicial'], [bar.pavFim, bar.pFim, bar.zFim, bar.pIni, bar.zIni, 'final']] as const).forEach(([pv, p, z, q, zq, nome]) => {
      if (falha) return;
      const lig = ligacaoDaPonta(b, pv, p);
      if (!lig) { falha = `a ponta ${nome} não toca pilar nem viga`; return; }
      const dir: P = [q[0] - p[0], q[1] - p[1]], inclin = (zq - z) / dh;
      if (lig.tipo === 'pilar') {
        const n = noPilar.get(`${lig.pilar}|${pv}`), pil = b.pilares.find((x) => x.id === lig.pilar);
        if (n === undefined || !pil) { falha = `o pilar da ponta ${nome} não tem nó no pavimento`; return; }
        const t = Math.max(0, saidaDoContorno(p, dir, contornoNoLance(pil, pv)) - op.trechoRigido * s.h), nd = pm.nos[n];
        offs.push([p[0] + (dir[0] / dh) * t - nd[0], p[1] + (dir[1] / dh) * t - nd[1], z + inclin * t - nd[2]]);
        nos.push(n);
      } else {
        const n = nosVigaPav.get(pv)?.(lig.ponto);
        if (n === undefined) { falha = integrado ? `a ponta ${nome} liga-se a viga, e o modelo integrado só liga as inclinadas a pilares (use o modelo separado ou leve a ponta a um pilar)` : `a ponta ${nome} não encontrou nó na viga`; return; }
        const nd = pm.nos[n];
        offs.push([p[0] - nd[0], p[1] - nd[1], z - nd[2]]);
        nos.push(n);
      }
      ligs.push(lig);
    });
    if (falha || nos[0] === nos[1]) { avisos.push(`${bar.rotulo}: barra inclinada fora do modelo (${falha || 'as duas pontas caem no mesmo nó'}).`); continue; }
    const base3: Omit<Barra3, 'i' | 'j'> = { E: Ev, G: Gv, A: s.b * s.h, Iz: (s.b * s.h ** 3) / 12, Iy: (s.h * s.b ** 3) / 12, J: op.torcaoViga * torcaoRet(s.b, s.h), ref: [0, 0, 1] };
    const pp = GAMA_CONCRETO * s.b * s.h, tag = bar.diagonal ? 'diagonal' : 'inclinada';
    // E2d: nó nos cruzamentos de diagonais (barra dividida; a abscissa é sobre a parte flexível; o comprimento de flambagem continua o total)
    const A0 = pm.nos[nos[0]], B0 = pm.nos[nos[1]], pa: V3 = [A0[0] + offs[0][0], A0[1] + offs[0][1], A0[2] + offs[0][2]], pb: V3 = [B0[0] + offs[1][0], B0[1] + offs[1][1], B0[2] + offs[1][2]];
    const Lflex = Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]);
    const cortes = (bar.diagonal ? cruzamentosDaBarra(b, bar.id) : []).map((c) => ({ c, x: ((c.pos[0] - pa[0]) * (pb[0] - pa[0]) + (c.pos[1] - pa[1]) * (pb[1] - pa[1]) + (c.pos[2] - pa[2]) * (pb[2] - pa[2])) / Lflex }))
      .filter((k) => k.x > DIST_MIN_EXTREMO && Lflex - k.x > DIST_MIN_EXTREMO).sort((p, q) => p.x - q.x);
    const nosSeg = [nos[0], ...cortes.map((k) => { let n = nosCruzamento.get(k.c.chave); if (n === undefined) { n = pm.nos.length; nosCruzamento.set(k.c.chave, n); pm.nos.push([...k.c.pos] as V3); } return n; }), nos[1]];
    const segs: { bi: number; Lf: number }[] = [];
    for (let k = 0; k + 1 < nosSeg.length; k++) {
      const barra: Barra3 = { ...base3, i: nosSeg[k], j: nosSeg[k + 1] };
      if (k === 0) barra.offI = offs[0];
      if (k + 2 === nosSeg.length) barra.offJ = offs[1];
      if (k === 0 && inc.ligIni === 'articulada') barra.libI = [4, 5];
      if (k + 2 === nosSeg.length && inc.ligFim === 'articulada') barra.libJ = [4, 5];
      const bk = pm.barras.length, Lk = baseBarra(pm, barra).L;
      pm.barras.push(barra);
      ptags.push({ tipo: tag, ref: inc.id, pavimento: bar.pavIni });
      casosV[0].distribuidas.push({ barra: bk, q: [0, 0, -pp] }); // peso próprio na parte flexível
      segs.push({ bi: bk, Lf: Lk });
    }
    const bi = segs[0].bi, Lf = segs.reduce((t, x) => t + x.Lf, 0);
    let peso = pp * Lf;
    // o peso dos trechos rígidos vai para os nós
    for (const [off, n] of [[offs[0], nos[0]], [offs[1], nos[1]]] as const) { const w = pp * Math.hypot(off[0], off[1], off[2]); if (w) casosV[0].nodais.push({ no: n, f: [0, 0, -w, 0, 0, 0] }); peso += w; }
    totais.G += peso; cargasPavimento[bar.pavIni].G += peso / 2; cargasPavimento[bar.pavFim].G += peso / 2;
    // cargas próprias (K1.9.114): concentrada, linear, faixa e triangular, verticais, por caso
    for (const c of inc.cargas ?? []) {
      const ic = CASOS.indexOf(c.caso);
      if (ic < 0) { avisos.push(`${bar.rotulo}: carga no caso ${c.caso}, que não existe na obra (ignorada).`); continue; }
      const cs = casosV[ic];
      let total = 0;
      if (c.tipo === 'concentrada') {
        const a = c.de ?? Lf / 2;
        if (a <= 1e-9) cs.nodais.push({ no: nos[0], f: [0, 0, -c.valor, 0, 0, 0] });
        else if (a >= Lf - 1e-9) cs.nodais.push({ no: nos[1], f: [0, 0, -c.valor, 0, 0, 0] });
        else (cs.pontuais ??= []).push({ barra: bi, a, f: [0, 0, -c.valor, 0, 0, 0] });
        total = c.valor;
      } else if (c.tipo === 'linear') { cs.distribuidas.push({ barra: bi, q: [0, 0, -c.valor] }); total = c.valor * Lf; }
      else {
        // faixa e triangular: 20 resultantes concentradas no meio de cada trecho (erro O(1/400) nos momentos)
        const a0 = Math.max(0, Math.min(Lf, c.de ?? 0)), a1 = Math.max(a0, Math.min(Lf, c.ate ?? Lf)), n = 20, d = (a1 - a0) / n;
        for (let k = 0; d > 0 && k < n; k++) {
          const x = a0 + (k + 0.5) * d, v = c.tipo === 'faixa' ? c.valor : c.valor + ((c.valorFim ?? 0) - c.valor) * ((x - a0) / (a1 - a0));
          (cs.pontuais ??= []).push({ barra: bi, a: x, f: [0, 0, -v * d, 0, 0, 0] });
          total += v * d;
        }
      }
      totais[c.caso] += total; cargasPavimento[bar.pavIni][c.caso] += total / 2; cargasPavimento[bar.pavFim][c.caso] += total / 2;
    }
    inclinadasInfo.push({ id: bar.id, ref: inc.id, nome: bar.rotulo, pavimento: bar.pavIni, pavimentoFim: bar.pavFim, bi, L: bar.L, Lf, angulo: bar.angulo, nos: [nos[0], nos[1]], ligacao: [ligs[0], ligs[1]], ...(bar.diagonal ? { diagonal: true } : {}), ...(segs.length > 1 ? { segs, cruzamentos: segs.length - 1 } : {}) });
  }
  // engaste parcial no topo só onde há vigas no nó: sem elas o giro ficaria sem rigidez (mecanismo)
  const nBarras = new Map<number, number>();
  for (const br of pm.barras) { nBarras.set(br.i, (nBarras.get(br.i) ?? 0) + 1); nBarras.set(br.j, (nBarras.get(br.j) ?? 0) + 1); }
  for (const se of pm.superelementos ?? []) for (let a = 0; a < se.dofs.length; a += 3) { const n = (se.dofs[a] - 2) / 6; nBarras.set(n, (nBarras.get(n) ?? 0) + 1); }
  for (const l of pendentes.values()) for (const { nb } of l) { nBarras.set(nb.i, (nBarras.get(nb.i) ?? 0) + 1); nBarras.set(nb.j, (nBarras.get(nb.j) ?? 0) + 1); }
  pm.barras.forEach((br, i) => {
    if (ptags[i].tipo !== 'pilar') return;
    if (br.engJ && (nBarras.get(br.j) ?? 0) < 2 && !pm.apoios.has(br.j)) delete br.engJ;
    if (br.engI && (nBarras.get(br.i) ?? 0) < 2 && !pm.apoios.has(br.i)) delete br.engI;
  });
  // cargas verticais: multiplicador axial dos pilares (premissa 25)
  const pmV: Modelo3 = { ...pm, barras: pm.barras.map((br, i) => (ptags[i].tipo === 'pilar' ? { ...br, A: br.A * op.axialPilares } : br)), ...(pm.cascas ? { cascas: reduzirCascas(pm.cascas, op.axialPilares) } : {}) };
  const res = resolver3(pmV, casosV);
  if (res.erro) return { ...vazio, grelhas, avisos, erro: `Pórtico: ${res.erro}`, portico: { modelo: semFuncoes(pm), barras: ptags, mestres, zonas, res: null } };
  // modelo integrado: deslocamentos e esforços da grelha de cada pavimento por retrossubstituição; reações e momentos
  // que a laje transmite a cada pilar (para a punção) = S·ub − Pb
  const momentosGrelha = new Map<number, Record<string, Record<string, [number, number]>>>();
  for (const { pav, dofs, ig } of seInfo) {
    const { gb, gi } = integPav.get(pav)!;
    const reacoes: Record<string, Record<CasoAnalise, number>> = {}, momentos: Record<string, Record<string, [number, number]>> = {};
    const desloc = CASOS.map((c, ic) => {
      const uB = dofs.map((d) => res.desloc[ic][d]), ug = deslocGrelha(gb, ig, uB, ic);
      const f = forcaFronteira(ig.cond, uB, ic);
      ig.pils.forEach((p, k) => { (reacoes[p] ??= zeros())[c] = f[3 * k]; (momentos[p] ??= {})[c] = [f[3 * k + 1], f[3 * k + 2]]; });
      return ug;
    });
    // um bloco de memória por caso, com uma vista de 12 valores por barra
    const esforcos = desloc.map((ug, ic) => { const buf = new Float64Array(12 * ig.elems.length); return ig.elems.map((e, bi) => esforcosGrelha(ig, bi, ug, e.f0s[ic], buf.subarray(12 * bi, 12 * bi + 12))); });
    grelhas[gi] = { ...grelhas[gi], res: { desloc, esforcos, reacoes: CASOS.map(() => new Map()), neq: ig.ni, hb: ig.cond.hb }, reacoes, momentos, integrado: true };
    momentosGrelha.set(gi, momentos);
  }
  // E3f: deslocamentos dos nós e esforços das barras inclinadas da grelha a partir do pórtico (eixos locais da barra 3D:
  // laje com o eixo y na normal do plano, viga com a seção vertical; Mz = flexão fora do plano como nas barras da grelha)
  for (const x of incInfo) {
    const g = grelhas[x.gi], nn = x.gb.m.nos.length;
    const r0: Resultado3 = g.res ?? { desloc: CASOS.map(() => new Float64Array(nn * 6)), esforcos: CASOS.map(() => x.gb.m.barras.map(() => new Float64Array(12))), reacoes: CASOS.map(() => new Map()), neq: 0, hb: 0 };
    CASOS.forEach((_, ic) => {
      const ug = r0.desloc[ic], ur = res.desloc[ic];
      for (let n = 0; n < nn; n++) {
        if (x.ig.noSE[n] || x.mapN[n] < 0) continue;
        const j = x.mapN[n] * 6, o = x.offN[n] ?? [0, 0, 0], r = [ur[j + 3], ur[j + 4], ur[j + 5]];
        ug[n * 6] = ur[j] + r[1] * o[2] - r[2] * o[1]; ug[n * 6 + 1] = ur[j + 1] + r[2] * o[0] - r[0] * o[2]; ug[n * 6 + 2] = ur[j + 2] + r[0] * o[1] - r[1] * o[0];
        ug[n * 6 + 3] = r[0]; ug[n * 6 + 4] = r[1]; ug[n * 6 + 5] = r[2];
      }
      x.barP.forEach((k, bi) => { if (k >= 0) r0.esforcos[ic][bi] = res.esforcos[ic][k]; });
    });
    grelhas[x.gi] = { ...g, res: r0, integrado: true };
  }
  const fundacao: AnaliseEdificio['fundacao'] = [];
  const bases = b.pilares.map((p) => [p.id, noPilar.get(`${p.id}|base`)] as const).filter((x): x is readonly [string, number] => x[1] !== undefined);
  // pilar sobre base elástica: esforços no pé do pilar (ponta i do primeiro lance), na convenção das reações
  const comMolas = new Set(b.pilares.filter((p) => p.nasce === 'fundacao' && p.vinculoBase?.tipo === 'molas').map((p) => p.id));
  const reacaoBase = (r3: Resultado3, ic: number, pid: string, k: number) => {
    // base elástica ou molas no vínculo externo (N2c): esforços no pé do pilar (a reação nodal das molas não é a da fundação)
    if (base?.info.pilares[pid] || comMolas.has(pid)) { const bi = primeiroLance.get(pid)!; return forcaBasePilar(pm, bi, r3.esforcos[ic][bi]); }
    const r = r3.reacoes[ic].get(k)!; return { N: r[2], Vx: r[0], Vy: r[1], Mx: r[3], My: r[4] };
  };
  for (const [pid, k] of bases) CASOS.forEach((c, ic) => fundacao.push({ pilar: pid, caso: c, ...reacaoBase(res, ic, pid, k) }));
  // pilares-parede: resultante das reações dos nós da base, no centro do pilar-parede (E1b)
  const reacaoParede = (r3: Resultado3, ic: number, pid: string) => {
    const O = noParedes!.centro[pid] ?? [0, 0];
    let N = 0, Vx = 0, Vy = 0, Mx = 0, My = 0;
    for (const n of noParedes!.base[pid] ?? []) {
      const r = r3.reacoes[ic].get(n);
      if (!r) continue;
      const x = pm.nos[n][0] - O[0], y = pm.nos[n][1] - O[1];
      N += r[2]; Vx += r[0]; Vy += r[1]; Mx += (r[3] ?? 0) + y * r[2]; My += (r[4] ?? 0) - x * r[2];
    }
    return { N, Vx, Vy, Mx, My };
  };
  if (noParedes) for (const pid of Object.keys(noParedes.base)) CASOS.forEach((c, ic) => fundacao.push({ pilar: pid, caso: c, ...reacaoParede(res, ic, pid) }));
  fundacao.push(...reacoesArranques(b));

  // rigidez reduzida da NBR 6118, 15.7.3 (γz e P-Δ): vigas 0,4·Eci·Ic, pilares 0,8·Eci·Ic
  const kEci = (t: BarraPortico) => { const c = concretoDe(b, t.tipo === 'parede' || t.tipo === 'inclinada' || t.tipo === 'diagonal' ? 'viga' : t.tipo, t.tipo === 'pilar' ? t.pavimento : undefined); return c.Eci / c.Ecs; };
  const reduzida = (br: Barra3, i: number) => { if (ptags[i].tipo === 'parede') return br; const k = kEci(ptags[i]), f = (ptags[i].tipo === 'pilar' ? 0.8 : ptags[i].tipo === 'laje' ? 0.3 : 0.4) * k; return { ...br, E: br.E * k, G: br.G * k, Iz: br.Iz * f / k, Iy: br.Iy * f / k }; };
  // cascas dos pilares-parede com 0,8·Eci·Ic como os pilares (E1b; a confirmar)
  const cascasR = pm.cascas ? { cascas: reduzirCascas(pm.cascas, (0.8 * concretoDe(b, 'pilar').Eci) / concretoDe(b, 'pilar').Ecs) } : {};
  // ---- vento: forças nos mestres, pórtico com a área real dos pilares ----
  const idsPilares = [...pilaresA.map((p) => p.id), ...(paredes?.grades.map((g) => g.lado.id) ?? [])];
  const ven = casosVento(b, (pav) => zonas[pav] ?? []);
  avisos.push(...ven.avisos);
  let resVento: Resultado3 | null = null, vento: AnaliseEdificio['vento'] = null, casosW: Caso3[] = [];
  if (ven.casos.length) {
    casosW = ven.casos.map((cv) => ({
      nodais: cv.forcas.flatMap((f) => { const zn = zonas[f.pavimento]?.[f.zona]; return zn ? [{ no: zn.no, f: cv.direcao === 0 || cv.direcao === 180 ? [f.F, 0, 0, 0, 0, f.Mz] : [0, f.F, 0, 0, 0, f.Mz] }] : []; }),
      distribuidas: [],
    }));
    resVento = resolver3(pm, casosW);
    if (resVento.erro) avisos.push(`Vento: ${resVento.erro}`);
    else {
      for (const [pid, k] of bases) ven.casos.forEach((cv, ic) => fundacao.push({ pilar: pid, caso: cv.nome, ...reacaoBase(resVento!, ic, pid, k) }));
      if (noParedes) for (const pid of Object.keys(noParedes.base)) ven.casos.forEach((cv, ic) => fundacao.push({ pilar: pid, caso: cv.nome, ...reacaoParede(resVento!, ic, pid) }));
      // momentos que a laje transmite aos pilares no vento (modelo integrado): entram na punção
      // e esforços das vigas do diafragma no vento (grelha condensada, sem cargas)
      for (const { pav, dofs, ig } of seInfo) {
        const mom = momentosGrelha.get(integPav.get(pav)!.gi), pend = pendentes.get(pav) ?? [], gb = integPav.get(pav)!.gb;
        const nosPend = [...new Set(pend.flatMap((pd) => [gb.m.barras[pd.bi].i, gb.m.barras[pd.bi].j]))];
        ven.casos.forEach((cv, iv) => {
          const uB = dofs.map((d) => resVento!.desloc[iv][d]), f = forcaFronteira(ig.cond, uB);
          if (mom) ig.pils.forEach((p, k) => ((mom[p] ??= {})[cv.nome] = [f[3 * k + 1], f[3 * k + 2]]));
          if (pend.length) { const ug = deslocGrelha(gb, ig, uB, undefined, nosPend); for (const pd of pend) pd.vento[iv] = esforcosGrelha(ig, pd.bi, ug); }
        });
      }
    }
    // γz com rigidez reduzida (NBR 6118 15.7.3: vigas 0,4·Eci·Ic, pilares 0,8·Eci·Ic)
    // modelo integrado: superelementos com lajes 0,3·Eci·Ic e vigas 0,4·Eci·Ic; as vigas da divisão fina (só plano XY,
    // escravas do diafragma) não mudam os deslocamentos e ficam de fora, menos as de fora do diafragma
    const foraDiaf = new Set(b.vigas.filter((v) => v.foraDiafragma).map((v) => v.id));
    const pmR: Modelo3 = seInfo.length
      ? { ...pm, barras: pm.barras.map(reduzida).filter((br, i) => !br.soPlano || foraDiaf.has(ptags[i].ref)), superelementos: seInfo.map(({ dofs, ig }) => ({ dofs, K: ig.reduzida().S })), ...cascasR }
      : { ...pm, barras: pm.barras.map(reduzida), ...cascasR };
    const centrados = ven.casos.filter((c) => c.exc === 0);
    const rR = resolver3(pmR, centrados.map((cv) => casosW[ven.casos.indexOf(cv)]));
    const psi0 = b.norma.psiQ?.[0] ?? 0.5;
    const gm = gamas(b), casosOb = casosDaObra(b);
    const gamaZ = rR.erro ? [] : centrados.map((cv, ic) => {
      const ix = cv.direcao === 0 || cv.direcao === 180 ? 0 : 1, sg = cv.direcao === 0 || cv.direcao === 90 ? 1 : -1;
      let M1 = 0, dV = 0, dU = 0;
      for (const f of cv.forcas) M1 += Math.abs(f.F) * f.z;
      for (const p of ps) {
        // deslocamento do pavimento: média dos nós dos pilares ponderada pelas reações verticais da grelha
        // (com zonas independentes cada zona desloca diferente; com um diafragma só, todos iguais)
        const g = grelhas.find((x) => x.pavimento === p.id);
        let sw = 0, sd = 0;
        for (const pid of idsPilares) {
          const k = noPilar.get(`${pid}|${p.id}`);
          if (k === undefined) continue;
          const w = g?.reacoes[pid] ? Object.values(g.reacoes[pid]).reduce((t, x) => t + Math.abs(x), 0) || 1 : 1;
          sw += w; sd += w * rR.desloc[ic][k * 6 + ix];
        }
        if (!sw) continue;
        const d = (sg * sd) / sw, c = cargasPavimento[p.id];
        let G = 0, Q = 0, Qpsi = 0;
        for (const k of casosOb) { const v = c[k.id] ?? 0; if (k.natureza === 'G' || k.natureza === 'H') G += v; else if (k.natureza === 'Q') { Q += v; Qpsi += (k.id === 'Q' ? psi0 : k.psi?.[0] ?? psi0) * v; } }
        dV += (gm.g * G + gm.q * Qpsi) * d; dU += (gm.g * G + gm.q * Q) * d;
      }
      const gz = (r: number) => (r < 1 ? 1 / (1 - r) : Infinity);
      const vp = M1 ? gz(dV / M1) : 1, up = M1 ? gz(dU / M1) : 1, max = Math.max(vp, up);
      return { direcao: cv.direcao, ventoPrincipal: vp, usoPrincipal: up, max, ampliacao: max > 1.1 ? 0.95 * max : 1 };
    });
    // deslocamentos laterais na combinação frequente (ψ1 = 0,3 do vento): topo ≤ H/limite e entre pavimentos ≤ hi/limite
    const psi1W = 0.3, zBase = Math.min(...[...noPilar.entries()].filter(([k]) => k.endsWith('|base')).map(([, n]) => pm.nos[n][2]));
    const deslocamentos: DeslocamentosVento[] = resVento.erro ? [] : centrados.map((cv) => {
      const ic = ven.casos.indexOf(cv), ix = cv.direcao === 0 || cv.direcao === 180 ? 0 : 1;
      const u = (k: number) => Math.abs(resVento!.desloc[ic][k * 6 + ix]) * psi1W;
      const pavs: DeslocamentosVento['pavimentos'] = [];
      let zAnt = zBase;
      for (const p of ps) {
        let um = 0, dm = 0, n = 0;
        for (const pid of idsPilares) {
          const k = noPilar.get(`${pid}|${p.id}`);
          if (k === undefined) continue;
          n++;
          const i = ps.indexOf(p), kb = i === 0 ? noPilar.get(`${pid}|base`) : noPilar.get(`${pid}|${ps[i - 1].id}`) ?? noPilar.get(`${pid}|base`);
          um = Math.max(um, u(k));
          if (kb !== undefined) dm = Math.max(dm, Math.abs(resVento!.desloc[ic][k * 6 + ix] - resVento!.desloc[ic][kb * 6 + ix]) * psi1W);
        }
        if (!n) continue;
        const hi = p.cota - zAnt;
        pavs.push({ pavimento: p.id, z: p.cota - zBase, u: um, drift: dm, hi, limDrift: hi / op.limiteDeslocPavimento });
        zAnt = p.cota;
      }
      const H = pavs.length ? pavs.at(-1)!.z : 0, topo = pavs.length ? pavs.at(-1)!.u : 0, limTopo = H / op.limiteDeslocTopo;
      return { direcao: cv.direcao, caso: cv.nome, psi1: psi1W, pavimentos: pavs, H, topo, limTopo, ok: topo <= limTopo + 1e-12 && pavs.every((x) => x.drift <= x.limDrift + 1e-12) };
    });
    for (const d of deslocamentos) if (!d.ok) avisos.push(`Deslocamento lateral do vento a ${d.direcao}° (frequente, ψ1 = 0,3) acima do limite: topo ${(d.topo * 1000).toFixed(1).replace('.', ',')} mm (H/${op.limiteDeslocTopo} = ${(d.limTopo * 1000).toFixed(1).replace('.', ',')} mm)${d.pavimentos.some((x) => x.drift > x.limDrift) ? '; entre pavimentos acima de hi/' + op.limiteDeslocPavimento : ''}.`);
    for (const g of gamaZ) if (g.max > op.limiteGamaZ) avisos.push(op.segundaOrdem === 1
      ? `γz informado = ${g.max.toFixed(3).replace('.', ',')} na direção ${g.direcao}°, acima do limite ${String(op.limiteGamaZ).replace('.', ',')}: efeitos globais de 2ª ordem pelo P-Δ (opção ativa).`
      : `γz = ${g.max.toFixed(3).replace('.', ',')} na direção ${g.direcao}°: acima do limite ${String(op.limiteGamaZ).replace('.', ',')} das opções (exige análise de 2ª ordem mais rigorosa: ative o P-Δ nas opções de cálculo).`);
    vento = { classe: ven.classe, altura: ven.altura, casos: ven.casos, gamaZ, deslocamentos, ca: ven.ca, viz: ven.viz };
  }
  // ---- 2ª ordem global por P-Δ (N2c, opção segundaOrdem = 1) ----
  // Cada combinação ELU: deslocamentos de 1ª ordem no pórtico com rigidez reduzida (as mesmas do γz; lajes 0,3·Eci·Ic
  // no modelo integrado) e normais dos pilares do modelo de cálculo; iteração P-Δ (matriz geométrica de corpo rígido dos
  // pilares, normais atualizadas); as forças fictícias −K_G·u finais viram um caso por combinação, resolvido no modelo de
  // cálculo e somado com fator 1 só àquela combinação (combinacoes.ts). Sem a ampliação 0,95·γz.
  let segundaOrdem: AnaliseEdificio['segundaOrdem'] = undefined, resPD: Resultado3 | null = null;
  const casosPD: Caso3[] = [];
  if (op.segundaOrdem === 1) {
    const tPD = typeof performance !== 'undefined' ? performance.now() : 0;
    const elu = combinacoesDoEstado(b, { vento, opcoes: op } as AnaliseEdificio, 'concreto').filter((c) => c.tipo === 'ELU');
    const pmRP: Modelo3 = seInfo.length
      ? { ...pm, barras: pm.barras.map(reduzida), superelementos: seInfo.map(({ dofs, ig }) => ({ dofs, K: ig.reduzidaCargas().S })), ...cascasR }
      : { ...pm, barras: pm.barras.map(reduzida), ...cascasR };
    const casosVR: Caso3[] = casosV.map((c, ic) => (c.superelementos ? { ...c, superelementos: c.superelementos.map((cs) => ({ se: cs.se, P: seInfo[cs.se].ig.reduzidaCargas().Pb[ic] })) } : c));
    const rR = resolver3(pmRP, [...casosVR, ...casosW]);
    const pil = ptags.map((t, i) => (t.tipo === 'pilar' && i < pm.barras.length ? i : -1)).filter((i) => i >= 0);
    const fat = fatorar3(pmRP);
    const lista: NonNullable<AnaliseEdificio['segundaOrdem']>['combinacoes'] = [];
    if (rR.erro || fat.erro) avisos.push(`P-Δ: ${rR.erro ?? fat.erro}`);
    else {
      const geo = barrasGeo(pmRP, pil), nomesW = ven.casos.map((c) => c.nome);
      const u1s: Float64Array[] = [], N1s: Float64Array[] = [], validas: typeof elu = [];
      for (const cb of elu) {
        const u = new Float64Array(pm.nos.length * 6), N = new Float64Array(pil.length);
        for (const [nome, f] of Object.entries(cb.fatores)) {
          const ic = CASOS.indexOf(nome), iw = nomesW.indexOf(nome);
          const ur = ic >= 0 ? rR.desloc[ic] : iw >= 0 ? rR.desloc[CASOS.length + iw] : null;
          const ef = ic >= 0 ? res.esforcos[ic] : iw >= 0 && resVento && !resVento.erro ? resVento.esforcos[iw] : null;
          if (!ur || !ef || !f) continue;
          for (let d = 0; d < u.length; d++) u[d] += f * ur[d];
          pil.forEach((bi, k) => (N[k] += f * normalMedia(ef[bi])));
        }
        u1s.push(u); N1s.push(N); validas.push(cb);
      }
      const rs = iterarPDelta(fat, geo, u1s, N1s);
      rs.forEach((r, k) => {
        const caso = r.erro ? undefined : `PΔ ${casosPD.length + 1}`;
        if (caso) casosPD.push({ nodais: r.forcas, distribuidas: [] });
        lista.push({ nome: validas[k].nome, ...(caso ? { caso } : {}), iteracoes: r.iteracoes, convergiu: r.convergiu, amplificacao: r.amplificacao, ...(r.erro ? { erro: r.erro } : {}) });
        if (r.erro) avisos.push(`P-Δ na combinação ${validas[k].nome}: ${r.erro}`);
      });
      if (casosPD.length) {
        resPD = resolver3(pm, casosPD);
        if (resPD.erro) { avisos.push(`P-Δ: ${resPD.erro}`); resPD = null; casosPD.length = 0; for (const c of lista) delete c.caso; }
        else {
          for (const { pav, dofs, ig } of seInfo) {
            const pend = pendentes.get(pav) ?? [];
            if (!pend.length) continue;
            const gb = integPav.get(pav)!.gb, nosPend = [...new Set(pend.flatMap((pd) => [gb.m.barras[pd.bi].i, gb.m.barras[pd.bi].j]))];
            casosPD.forEach((_, k) => { const ug = deslocGrelha(gb, ig, dofs.map((d) => resPD!.desloc[k][d]), undefined, nosPend); for (const pd of pend) (pd.pdelta ??= [])[k] = esforcosGrelha(ig, pd.bi, ug); });
          }
        }
      }
    }
    const ok = lista.filter((c) => c.convergiu);
    segundaOrdem = { metodo: 'pDelta', combinacoes: lista, amplificacaoMax: ok.length ? Math.max(...ok.map((c) => c.amplificacao)) : 1, iteracoesMax: lista.length ? Math.max(...lista.map((c) => c.iteracoes)) : 0, ms: (typeof performance !== 'undefined' ? performance.now() : 0) - tPD };
  }
  // vigas do diafragma do modelo integrado: barras só de resultado, no fim da lista, com os esforços da grelha
  let modeloFinal = semFuncoes(pmV);
  if (pendentes.size) {
    const extras: Barra3[] = [];
    for (const [pav, lista] of pendentes) {
      const g = grelhas[integPav.get(pav)!.gi], ig = integPav.get(pav)!.ig;
      for (const pd of lista) {
        const k = pmV.barras.length + extras.length;
        extras.push(pd.nb);
        ptags.push(pd.tag);
        ig.distDe.forEach((mp, ic) => { for (const q of mp.get(pd.bi) ?? []) casosV[ic].distribuidas.push({ barra: k, q }); });
        CASOS.forEach((_, ic) => res.esforcos[ic].push(g.res!.esforcos[ic][pd.bi]));
        if (resVento && !resVento.erro) ven.casos.forEach((_, iv) => resVento!.esforcos[iv].push(pd.vento[iv] ?? new Float64Array(12)));
        if (resPD) casosPD.forEach((_, k) => resPD!.esforcos[k].push(pd.pdelta?.[k] ?? new Float64Array(12)));
      }
    }
    modeloFinal = { ...modeloFinal, barras: [...modeloFinal.barras, ...extras] };
  }
  const ms = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  if (base) avisos.push(...avisosBaseElastica(b, base.info));
  const cheio = extra.cheio && detalhes.length ? modeloCheio(pmV, casosV, detalhes, ps, CASOS) : undefined;
  return { avisos, opcoes: op, casos: CASOS, grelhas, portico: { modelo: modeloFinal, barras: ptags, mestres, zonas, res, resVento, casos: casosV, casosVento: casosW, ...(resPD ? { resPDelta: resPD, casosPDelta: casosPD } : {}) }, ...(segundaOrdem ? { segundaOrdem } : {}), ...(inclinadasInfo.length ? { inclinadas: inclinadasInfo } : {}), ...(incInfo.length ? { planos: incInfo.map((x) => ({ pavimento: x.pav, barras: [...x.barP].filter((k) => k >= 0) })) } : {}), ...(base ? { baseElastica: base.info } : {}), ...(noParedes ? { paredes: noParedes } : {}), ...(apoios.size ? { apoiados: Object.fromEntries([...apoios].map(([id, a]) => [id, { apoio: a?.tipo ?? null, ligado: baseLigada.has(id) }])) } : {}), fundacao, vento, cargasPavimento, totais, gdl: res.neq + grelhas.reduce((s, g) => s + (g.res?.neq ?? 0), 0), ms, ...(cheio ? { cheio } : {}) };
}

// ---------------- auxiliares ----------------

/** Fator de torção da viga: seção bruta na torção de equilíbrio, senão o redutor das opções. */
/** Rigidez à torção (fração da bruta): plena na torção de equilíbrio, inclusive a da curvatura das vigas curvas (E2b). */
const torcaoDe = (v: Viga, op: OpcoesAnalise) => (v.torcaoEquilibrio || (ehCurva(v) && op.curvaTorcaoEquilibrio) ? 1 : op.torcaoViga);

/** Coeficiente de engaste da ponta inicial e final da viga (prevalece sobre o vínculo; articulado = 0). */
/** Pontos a cada `passo` m ao longo dos eixos das vigas de vínculo externo (E2e), sem as pontas: nós de discretização dos apoios. */
function pontosVinculoExterno(vigas: Viga[], eixos: [P, P][], passo: number): P[] {
  const out: P[] = [];
  let k = 0;
  for (const v of vigas) for (let i = 0; i + 1 < v.pontos.length; i++) {
    const [a, z] = eixos[k++];
    if (!v.vinculoExterno) continue;
    const n = Math.max(1, Math.ceil(Math.hypot(z[0] - a[0], z[1] - a[1]) / Math.max(passo, 0.05) - 1e-9));
    for (let j = 1; j < n; j++) out.push([a[0] + ((z[0] - a[0]) * j) / n, a[1] + ((z[1] - a[1]) * j) / n]);
  }
  return out;
}
/** Rigidez de folga (kN/m e kN·m/rad) nos gdl livres dos nós de vínculo externo: evita o modo de corpo rígido da viga, sem efeito nos resultados. */
const K_FOLGA_VINCULO = 1e4;

/** Coeficiente de engaste da ponta da viga (E2e: a pré-moldada é articulada por padrão, salvo engaste informado). */
const engastePonta = (v: Viga, fim: boolean, pmArt = false) => {
  const e = fim ? v.engasteFim : v.engasteIni, vin = fim ? v.vinculoFim : v.vinculoIni;
  if (e !== undefined) return e;
  if (vin === 'articulado') return 0;
  return pmArt && v.premoldada && vin !== 'engaste' ? 0 : 1;
};
/** Contexto das pontas das vigas: consolos (`viga|pilar` em que a ponta é desligada da face) e pré-moldadas articuladas. */
interface CtxPontas { consolos: Set<string>; pmArt: boolean }

/**
 * Pontas do trecho de viga: engaste parcial nas pontas da viga e rótula nos pilares de `articulacoes`.
 * `gdl`: rotações locais afetadas (pórtico: 4 e 5; grelha: só a flexão vertical, 5). Viga apoiada em consolo (E2e) fica sem momento no pilar.
 */
function vincularPontas(br: Barra3, t: TrechoViga, trechos: TrechoViga[], nos: NoPlanta[], gdl: number[], ctx?: CtxPontas) {
  // trechos inteiros dentro de um pilar (poligonal que começa dentro do pilar, como a viga curva) não contam como ponta da viga
  const dentroDoPilar = (x: TrechoViga) => { const pid = nos[x.a].pilar; return !!pid && pid === nos[x.z].pilar; };
  const v = t.viga, daViga = trechos.filter((x) => x.viga === v && !dentroDoPilar(x));
  for (const [ponta, no, extremo, fim] of [['engI', t.a, t === daViga[0], false], ['engJ', t.z, t === daViga.at(-1), true]] as const) {
    let a = extremo ? engastePonta(v, fim, ctx?.pmArt) : 1;
    const pid = nos[no].pilar;
    if (pid && (v.articulacoes?.includes(pid) || (extremo && ctx?.consolos.has(`${v.id}|${pid}`)))) a = 0;
    // N2e (K1.9.41): rótula no cruzamento com viga listada em `articulacoes` (o nó é de uma trecho dela)
    else if (!pid && v.articulacoes?.length && trechos.some((x) => x.viga !== v && v.articulacoes!.includes(x.viga.id) && (x.a === no || x.z === no))) a = 0;
    if (a < 1) br[ponta] = gdl.map((g) => [g, a] as [number, number]);
  }
}

/**
 * Trecho rígido da viga apoiada em viga (N2e, K1.3.46): do eixo da viga de apoio até a face dela, medido ao longo da
 * viga apoiada. Só nas pontas da viga, em nó sem pilar por onde passa outra viga (dois trechos dela) a mais de 10° da
 * direção. Devolve o vetor do nó ao início da parte flexível, ou null.
 */
function offsetApoiadaEmViga(i: number, outro: number, t: TrechoViga, trechos: TrechoViga[], nos: NoPlanta[]): V3 | null {
  if (nos[i].pilar) return null;
  const v = t.viga, daViga = trechos.filter((x) => x.viga === v);
  if (!((t === daViga[0] && i === t.a) || (t === daViga.at(-1) && i === t.z))) return null;
  const P = nos[i].p, Q = nos[outro].p, ux = Q[0] - P[0], uy = Q[1] - P[1], L = Math.hypot(ux, uy);
  if (!L) return null;
  for (const v2 of new Set(trechos.map((x) => x.viga))) {
    if (v2 === v) continue;
    const ts = trechos.filter((x) => x.viga === v2 && (x.a === i || x.z === i));
    if (ts.length < 2) continue;
    const A = nos[ts[0].a].p, Z = nos[ts[0].z].p, wx = Z[0] - A[0], wy = Z[1] - A[1], sin = Math.abs(ux * wy - uy * wx) / (L * (Math.hypot(wx, wy) || 1));
    if (sin < 0.17) continue;
    const dd = Math.min(v2.secao.b / 2 / sin, 0.9 * L);
    return [(ux / L) * dd, (uy / L) * dd, 0];
  }
  return null;
}

/** Engaste da laje no ponto p da sua borda: coeficiente da aresta do contorno × o da viga paralela a ela. */
function engasteBorda(l: Laje, p: P, trechos: TrechoViga[], nos: NoPlanta[], lajes: Laje[] = [], fatorDesnivel = 0, fl?: FonteLajes) {
  const c = l.contorno, n = c.length;
  let k = -1, dm = 0.01;
  for (let i = 0; i < n; i++) { const d = distSeg(p, c[i], c[(i + 1) % n]); if (d < dm) { dm = d; k = i; } }
  if (k < 0) return 1;
  const a = c[k], z = c[(k + 1) % n], ux = z[0] - a[0], uy = z[1] - a[1], L = Math.hypot(ux, uy) || 1;
  let cv = 1;
  for (const t of trechos) {
    if ((t.viga.engasteLajes ?? 1) >= cv) continue; // não muda o mínimo
    const pa = nos[t.a].p, pz = nos[t.z].p, vx = pz[0] - pa[0], vy = pz[1] - pa[1], Lv = Math.hypot(vx, vy) || 1;
    if (distSeg(p, pa, pz) < 0.01 && Math.abs(ux * vy - uy * vx) / (L * Lv) < 0.05) cv = Math.min(cv, t.viga.engasteLajes ?? 1);
  }
  // N2e (K1.9.85): desnível entre panos maior que fator × a menor espessura: a borda perde a continuidade
  if (fatorDesnivel > 0) {
    const h = (x: Laje) => (x.tipo.tipo === 'macica' ? x.tipo.h : x.tipo.tipo === 'nervurada' ? x.tipo.hTotal : x.tipo.tipo === 'alveolar' ? geometriaAlveolar(fl, x.tipo).h : geometriaNervurada(fl, x.tipo).h);
    for (const l2 of lajes) {
      if (l2 === l || !(l2.contorno as P[]).some((q, i, c2) => { const q2 = c2[(i + 1) % c2.length]; return (Math.hypot(q[0] - z[0], q[1] - z[1]) < 0.02 && Math.hypot(q2[0] - a[0], q2[1] - a[1]) < 0.02); })) continue;
      if (Math.abs((l.nivel ?? 0) - (l2.nivel ?? 0)) > fatorDesnivel * Math.min(h(l), h(l2)) + 1e-9) return 0;
    }
  }
  return (l.engasteBordas?.[k] ?? 1) * cv;
}

function distSeg(p: P, a: P, z: P) {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
  const u = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(a[0] + u * dx - p[0], a[1] + u * dy - p[1]);
}

/** Direção principal da laje maciça (a da maior aresta), para alinhar a malha. */
export function direcaoPrincipal(c: P[]) {
  let best = 0, L = 0;
  for (let i = 0; i < c.length; i++) { const a = c[i], z = c[(i + 1) % c.length], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (l > L) { L = l; best = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI; } }
  return best;
}

function centroide(p: P[]): P {
  const A = areaPoligono(p);
  if (!A) return pontoInterno(p);
  let cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], z = p[(i + 1) % p.length], c = a[0] * z[1] - z[0] * a[1]; cx += (a[0] + z[0]) * c; cy += (a[1] + z[1]) * c; }
  return [cx / (6 * A), cy / (6 * A)];
}

/** Peso próprio da laje (kN/m²). */
function lajeG(l: Laje, fl?: FonteLajes) {
  if (l.tipo.tipo === 'macica') return GAMA_CONCRETO * l.tipo.h;
  if (l.tipo.tipo === 'nervurada') return geometriaBidirecional(fl, l.tipo).pp;
  if (l.tipo.tipo === 'alveolar') return geometriaAlveolar(fl, l.tipo).pp;
  return geometriaNervurada(fl, l.tipo).pp;
}

/** Propriedades das barras de laje nas duas direções da malha (0: direção da laje; 1: transversal). */
/** Propriedades de uma barra de laje: área, inércia, torção e área de cisalhamento (Timoshenko, 5/6 da alma). */
type PropBarraLaje = { A: number; I: number; J: number; As: number };
function propLaje(l: Laje, sx: number, sy: number, op: OpcoesAnalise, fl: FonteLajes | undefined, El: number, Gl: number): [PropBarraLaje, PropBarraLaje] {
  if (l.tipo.tipo === 'macica') {
    const h = l.tipo.h;
    return [sy, sx].map((w) => { const I = (w * h ** 3) / 12; return { A: w * h, I, J: op.torcaoLaje * 2 * I, As: (5 / 6) * w * h }; }) as [PropBarraLaje, PropBarraLaje];
  }
  if (l.tipo.tipo === 'nervurada') { const gb = geometriaBidirecional(fl, l.tipo); return [propBarraNervurada(gb, 0, sy, false, op), propBarraNervurada(gb, 1, sx, false, op)]; }
  if (l.tipo.tipo === 'alveolar') {
    // E3e: unidirecional; EI da ficha por metro (plano rígido, EA grande), torção reduzida pelo fator das lajes; na transversal só a capa
    const g = geometriaAlveolar(fl, l.tipo), Ia = sy * (g.EI / El), Ic = (sx * g.capa ** 3) / 12;
    return [{ A: sy * g.h, I: Ia, J: op.torcaoLaje * 2 * Ia, As: (5 / 6) * sy * g.h }, { A: sx * g.capa, I: Ic, J: op.torcaoLaje * 2 * Ic, As: (5 / 6) * sx * g.capa }];
  }
  const g = geometriaNervurada(fl, l.tipo), c = { hEnch: g.hEnch, intereixo: g.intereixo, bw: g.bw }, capa = g.capa, h = g.h;
  const IT = inerciaT(c.intereixo, capa, g.bwRigidez, h);
  // rigidez das fichas (K1.15.1-2): EI e GJ da ficha no lugar da inércia calculada (opção vigotaRigidezFicha)
  const daFicha = op.vigotaRigidezFicha && g.EI !== undefined;
  const Inerv = daFicha ? g.EI! / El : IT, GJficha = daFicha && g.GJ !== undefined ? g.GJ / Gl : undefined;
  const nerv = { A: (sy / c.intereixo) * (c.intereixo * capa + c.bw * c.hEnch), I: (sy / c.intereixo) * Inerv * (op.vigotaRigidez ?? 1), J: GJficha !== undefined ? (sy / c.intereixo) * GJficha : op.torcaoLaje * 2 * (sy / c.intereixo) * IT, As: (5 / 6) * (sy / c.intereixo) * c.bw * h };
  const Icapa = (sx * capa ** 3) / 12;
  return [nerv, { A: sx * capa, I: Icapa, J: op.torcaoLaje * 2 * Icapa, As: (5 / 6) * sx * capa }];
}

/** Esforços de extremidade (locais) → forças globais que o nó faz na barra (6 componentes). */
function paraGlobal(m: Modelo3, br: Barra3, f: Float64Array, off: 0 | 6): number[] {
  const a = m.nos[br.i], z = m.nos[br.j], L = Math.hypot(z[0] - a[0], z[1] - a[1], z[2] - a[2]);
  const ex: V3 = [(z[0] - a[0]) / L, (z[1] - a[1]) / L, (z[2] - a[2]) / L];
  const ref: V3 = [0, 0, 1];
  const ez0: V3 = [ex[1] * ref[2] - ex[2] * ref[1], ex[2] * ref[0] - ex[0] * ref[2], ex[0] * ref[1] - ex[1] * ref[0]];
  const Lz = Math.hypot(...ez0), ez: V3 = [ez0[0] / Lz, ez0[1] / Lz, ez0[2] / Lz];
  const ey: V3 = [ez[1] * ex[2] - ez[2] * ex[1], ez[2] * ex[0] - ez[0] * ex[2], ez[0] * ex[1] - ez[1] * ex[0]];
  const R = [ex, ey, ez];
  const out = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 3; k++) for (let r = 0; r < 3; r++) { out[k] += R[r][k] * f[off + r]; out[3 + k] += R[r][k] * f[off + 3 + r]; }
  return out;
}

/** Trecho rígido do nó do pilar até o ponto da viga a `recuo` para dentro da face do pilar. */
function offsetFace(pNo: P, pOutro: P, pil: Pilar, sec: SecaoPilar, recuo: number, noPilar: V3): V3 | null {
  const cont = contornoPilar(pil, sec);
  const dx = pOutro[0] - pNo[0], dy = pOutro[1] - pNo[1], L = Math.hypot(dx, dy);
  if (!L) return null;
  const ux = dx / L, uy = dy / L;
  // saída do eixo da viga pela face do pilar (a partir do ponto do apoio, em direção ao outro nó)
  let tFace = 0;
  for (let i = 0; i < cont.length; i++) {
    const a = cont[i], z = cont[(i + 1) % cont.length], ex = z[0] - a[0], ey = z[1] - a[1], den = ux * ey - uy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - pNo[0]) * ey - (a[1] - pNo[1]) * ex) / den, u = ((a[0] - pNo[0]) * uy - (a[1] - pNo[1]) * ux) / den;
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) tFace = Math.max(tFace, t);
  }
  const t = Math.min(Math.max(0, tFace - recuo), 0.9 * L);
  const q: P = [pNo[0] + ux * t, pNo[1] + uy * t];
  return [q[0] - noPilar[0], q[1] - noPilar[1], 0];
}
