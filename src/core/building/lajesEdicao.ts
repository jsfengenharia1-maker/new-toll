// Edição, uniformização e linhas de dobra da armadura das lajes maciças (frente R7e). Funções puras sobre os
// detalhamentos já calculados (`DetalheLaje`): zonas de uniformização (maior taxa e maior comprimento entre as barras
// que passam pela zona), edição bloqueada das posições (n, φ, espaçamento, comprimento, ganchos, emenda construtiva),
// igualação por máximos, emenda nas linhas de dobra e siglas de reforço. O detalhamento base e as opções ficam em
// `detalhamentoLajes.ts`; aqui não há cálculo estrutural novo, só a aplicação das decisões do usuário e a verificação
// delas contra o que o cálculo exige.
import { barArea } from '../concrete';
import type { P } from '../geom/faces';
import type { DetalheLaje, PosicaoLaje, TipoBarraLaje } from './detalhamentoLajes';
import type { OpcoesCalculo } from './opcoes';
import { lancesDoPilar, pavimentosDoGrupo, type BuildingModel, type EdicaoBarraLaje, type Laje, type LinhaDobra, type ZonaUniformizacao, contornoNoLance } from './types';

/** Exigências do cálculo por posição (antes de uniformizar e editar): área necessária (cm²/m), cobertura (m) e comprimento calculado (m). */
export interface Exigencia { As: number; cobertura: number; comprimento: number }
export type Exigencias = Map<string, Exigencia>;

/** Posições que as zonas uniformizam: as calculadas (positivas, reforços e negativos); base, predefinidas, distribuição, bordas e cantos ficam fora. */
export const TIPOS_UNIFORMIZAVEIS: TipoBarraLaje[] = ['positiva', 'reforco', 'negativa', 'negativa-borda'];
/** Posições com sigla de reforço (RI inferior, RS superior): as barras calculadas. */
const TIPOS_REFORCO: TipoBarraLaje[] = ['positiva', 'reforco', 'negativa', 'negativa-borda'];

const ARRED = (x: number, passo: number) => Math.ceil(x / passo - 1e-9) * passo;
const r4 = (x: number) => +x.toFixed(4);
const fmt = (x: number, c = 2) => x.toFixed(c).replace('.', ',');
const taxa = (x: Pick<PosicaoLaje, 'phi' | 's'>) => (x.s > 0 ? barArea(x.phi) / x.s : 0);
/** Assinatura de uma posição: identifica a barra pela face, pelo tipo e pela direção (a numeração pode mudar). */
export const assinaturaPos = (x: Pick<PosicaoLaje, 'face' | 'tipo' | 'dir'>) => `${x.face}|${x.tipo}|${x.dir ?? ''}`;

/** Sigla de reforço da posição (RI: inferior; RS: superior), vazia fora das barras calculadas. */
export function siglaReforco(x: Pick<PosicaoLaje, 'face' | 'tipo'>): string {
  return TIPOS_REFORCO.includes(x.tipo) ? (x.face === 'inf' ? 'RI' : 'RS') : '';
}

// ------------------------------------------------------------------ geometria

/** Polígono convexo da zona (retângulo pelos cantos opostos; linha como faixa centrada no segmento). */
export function poligonoZona(z: Pick<ZonaUniformizacao, 'forma' | 'pontos' | 'largura'>): P[] {
  const [A, B] = z.pontos;
  if (z.forma === 'retangulo') {
    const x0 = Math.min(A[0], B[0]), x1 = Math.max(A[0], B[0]), y0 = Math.min(A[1], B[1]), y1 = Math.max(A[1], B[1]);
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  }
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1e-9, u: P = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n: P = [-u[1], u[0]], w = (z.largura ?? 0.5) / 2;
  return [[A[0] + n[0] * w, A[1] + n[1] * w], [B[0] + n[0] * w, B[1] + n[1] * w], [B[0] - n[0] * w, B[1] - n[1] * w], [A[0] - n[0] * w, A[1] - n[1] * w]];
}

/** Dois polígonos convexos (ou segmentos) se cruzam? (eixos separadores dos lados, normais e direções). */
export function convexosSeCruzam(A: P[], B: P[]): boolean {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], dx = q[0] - p[0], dy = q[1] - p[1];
      if (Math.hypot(dx, dy) < 1e-9) continue;
      for (const ax of [[-dy, dx], [dx, dy]] as P[]) {
        const pr = (pts: P[]) => { const v = pts.map((t) => t[0] * ax[0] + t[1] * ax[1]); return [Math.min(...v), Math.max(...v)]; };
        const [a0, a1] = pr(A), [b0, b1] = pr(B), tol = 1e-9 * Math.hypot(ax[0], ax[1]);
        if (a1 < b0 - tol || b1 < a0 - tol) return false;
      }
    }
  }
  return true;
}

/** Faixa coberta por uma posição: a barra representativa deslocada ± metade da linha de distribuição. */
export function areaDaPosicao(x: Pick<PosicaoLaje, 'a' | 'z' | 'faixa'>): P[] {
  const D: P = [(x.faixa[1][0] - x.faixa[0][0]) / 2, (x.faixa[1][1] - x.faixa[0][1]) / 2];
  return [[x.a[0] - D[0], x.a[1] - D[1]], [x.z[0] - D[0], x.z[1] - D[1]], [x.z[0] + D[0], x.z[1] + D[1]], [x.a[0] + D[0], x.a[1] + D[1]]];
}

/** Barras alinhadas com a direção da zona (diferença de até 5°, módulo 180°); sem direção na zona, qualquer uma. */
function mesmaDirecao(x: PosicaoLaje, ang: number | undefined): boolean {
  if (ang === undefined) return true;
  const d = Math.abs((((x.angulo - ang) % 180) + 180) % 180);
  return Math.min(d, 180 - d) <= 5;
}

// ------------------------------------------------------------------ alterações das posições

/** Desloca as pontas da parte reta (centro preservado) e acerta os lados dos negativos e o comprimento. */
function estenderReto(x: PosicaoLaje, dReto: number) {
  if (Math.abs(dReto) < 1e-9) return;
  const L = Math.hypot(x.z[0] - x.a[0], x.z[1] - x.a[1]) || 1, u: P = [(x.z[0] - x.a[0]) / L, (x.z[1] - x.a[1]) / L], m = dReto / 2;
  x.a = [r4(x.a[0] - u[0] * m), r4(x.a[1] - u[1] * m)];
  x.z = [r4(x.z[0] + u[0] * m), r4(x.z[1] + u[1] * m)];
  if (x.lados) x.lados = [r4(x.lados[0] + m), r4(x.lados[1] + m)];
}

/** Define n, φ, s, comprimento e ganchos de uma posição; o número de barras acompanha o espaçamento (cobre a mesma faixa). */
export function ajustarPosicao(x: PosicaoLaje, v: { n?: number; phi?: number; s?: number; comprimento?: number; ganchos?: [number, number] }) {
  if (v.s !== undefined && v.s > 0 && x.s > 0 && Math.abs(v.s - x.s) > 1e-9 && v.n === undefined) x.n = Math.max(1, Math.ceil((x.n * x.s) / v.s - 1e-9));
  if (v.n !== undefined) x.n = Math.max(1, Math.round(v.n));
  if (v.s !== undefined) x.s = v.s;
  if (v.phi !== undefined) x.phi = v.phi;
  const g = v.ganchos ?? x.ganchos, comp = v.comprimento ?? r4(x.comprimento + (g[0] + g[1]) - (x.ganchos[0] + x.ganchos[1]));
  // a geometria acompanha a variação do comprimento (o comprimento é arredondado; a parte reta guarda a folga do arredondamento)
  const reto = Math.hypot(x.z[0] - x.a[0], x.z[1] - x.a[1]), dReto = comp - g[0] - g[1] - (x.comprimento - x.ganchos[0] - x.ganchos[1]);
  estenderReto(x, Math.max(0.05, reto + dReto) - reto);
  x.ganchos = [g[0], g[1]];
  x.comprimento = r4(comp);
}

const recalcularPeso = (d: DetalheLaje) => { d.peso = d.posicoes.reduce((t, x) => t + x.n * x.comprimento * barArea(x.phi) * 7850, 0); };

/** Registro das alterações de uma laje, para o memorial e a interface. */
function infoEdicao(d: DetalheLaje): NonNullable<DetalheLaje['edicao']> {
  return (d.edicao ??= { editadas: 0, uniformizadas: 0, semCalculo: false, emendasDobra: 0, media: false });
}

// ------------------------------------------------------------------ uniformização

/** Zonas retangulares automáticas junto aos pilares do grupo (opção `lajeUniformizarPilares`): face superior, qualquer direção. */
export function zonasDosPilares(b: BuildingModel, grupo: string, op: OpcoesCalculo): ZonaUniformizacao[] {
  if (!op.lajeUniformizarPilares) return [];
  const ref = pavimentosDoGrupo(b, grupo)[0];
  if (!ref) return [];
  const folga = op.lajeUniformizarPilaresLargura / 100;
  return b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === ref.id)).map((p) => {
    const c = contornoNoLance(p, ref.id), xs = c.map((q) => q[0]), ys = c.map((q) => q[1]);
    return { id: `auto_${p.id}`, grupo, forma: 'retangulo' as const, pontos: [[Math.min(...xs) - folga, Math.min(...ys) - folga], [Math.max(...xs) + folga, Math.max(...ys) + folga]] as [[number, number], [number, number]], face: 'sup' as const };
  });
}

/** Posições (de todas as lajes do grupo) que passam pela zona. */
export function posicoesDaZona(b: BuildingModel, dets: DetalheLaje[], z: ZonaUniformizacao): { d: DetalheLaje; x: PosicaoLaje }[] {
  const poly = poligonoZona(z), out: { d: DetalheLaje; x: PosicaoLaje }[] = [];
  for (const d of dets) {
    if (b.lajes.find((l) => l.id === d.laje)?.grupo !== z.grupo) continue;
    for (const x of d.posicoes) if (x.face === z.face && TIPOS_UNIFORMIZAVEIS.includes(x.tipo) && mesmaDirecao(x, z.angulo) && convexosSeCruzam(areaDaPosicao(x), poly)) out.push({ d, x });
  }
  return out;
}

/**
 * Valores iguais ao máximo entre as posições: φ e espaçamento da de maior As/m e o maior comprimento (por face e
 * direção das barras, dentro do conjunto dado). Base para a uniformização e para a igualação manual.
 */
export function maximosDe(xs: Pick<PosicaoLaje, 'phi' | 's' | 'comprimento'>[]): { phi: number; s: number; comprimento: number } {
  let melhor = xs[0];
  for (const x of xs) if (taxa(x) > taxa(melhor) + 1e-12) melhor = x;
  return { phi: melhor.phi, s: melhor.s, comprimento: Math.max(...xs.map((x) => x.comprimento)) };
}

/**
 * Uniformiza as zonas do modelo (e as automáticas dos pilares) nos detalhamentos: as barras que passam por cada zona,
 * da face e da direção dadas, ficam com a maior taxa e o maior comprimento entre elas. Devolve, por zona, as posições
 * atingidas (zona sem barras ou com uma só vira aviso do grupo).
 */
export function uniformizarLajes(b: BuildingModel, dets: DetalheLaje[], op: OpcoesCalculo): { zona: string; auto: boolean; posicoes: { laje: string; pos: string }[] }[] {
  const grupos = [...new Set(b.lajes.map((l) => l.grupo))];
  const zonas = [...(b.zonasLaje ?? []).map((z) => ({ z, auto: false })), ...grupos.flatMap((g) => zonasDosPilares(b, g, op).map((z) => ({ z, auto: true })))];
  const out: { zona: string; auto: boolean; posicoes: { laje: string; pos: string }[] }[] = [];
  for (const { z, auto } of zonas) {
    const mem = posicoesDaZona(b, dets, z);
    out.push({ zona: z.id, auto, posicoes: mem.map(({ d, x }) => ({ laje: d.laje, pos: x.pos })) });
    if (mem.length < 2) continue;
    const m = maximosDe(mem.map((e) => e.x));
    for (const { d, x } of mem) {
      if (Math.abs(x.phi - m.phi) < 1e-9 && Math.abs(x.s - m.s) < 1e-9 && Math.abs(x.comprimento - m.comprimento) < 1e-9) continue;
      ajustarPosicao(x, { phi: m.phi, s: m.s, comprimento: Math.max(x.comprimento, m.comprimento) });
      x.uniforme = z.id;
      infoEdicao(d).uniformizadas++;
    }
  }
  for (const d of dets) recalcularPeso(d);
  return out;
}

/**
 * Igualação por máximos de posições de uma laje (edição manual): para cada posição informada, φ e espaçamento da
 * de maior As/m e o maior comprimento. Devolve as edições (para o comando `laje.barras`) das que mudam.
 */
export function igualarPosicoes(d: DetalheLaje, pos: string[]): EdicaoBarraLaje[] {
  const xs = d.posicoes.filter((x) => pos.includes(x.pos));
  if (xs.length < 2) return [];
  const m = maximosDe(xs);
  return xs.filter((x) => Math.abs(x.phi - m.phi) > 1e-9 || Math.abs(x.s - m.s) > 1e-9 || Math.abs(x.comprimento - m.comprimento) > 1e-9)
    .map((x) => ({ pos: x.pos, assinatura: assinaturaPos(x), phi: m.phi, s: m.s, comprimento: m.comprimento }));
}

// ------------------------------------------------------------------ linhas de dobra

/**
 * Pontos em que a linha de dobra cruza o eixo da barra, como distância ao início da parte reta (m): candidatos para
 * a emenda construtiva depois do cálculo.
 */
export function cruzamentosDaBarra(x: Pick<PosicaoLaje, 'a' | 'z'>, linhas: Pick<LinhaDobra, 'id' | 'a' | 'z'>[]): { linha: string; em: number }[] {
  const L = Math.hypot(x.z[0] - x.a[0], x.z[1] - x.a[1]);
  if (L < 1e-9) return [];
  const u: P = [(x.z[0] - x.a[0]) / L, (x.z[1] - x.a[1]) / L], out: { linha: string; em: number }[] = [];
  for (const ln of linhas) {
    const dx = ln.z[0] - ln.a[0], dy = ln.z[1] - ln.a[1], den = u[0] * dy - u[1] * dx;
    if (Math.abs(den) < 1e-9) continue;
    const wx = ln.a[0] - x.a[0], wy = ln.a[1] - x.a[1], em = (wx * dy - wy * dx) / den, t = (wx * u[1] - wy * u[0]) / den;
    if (t >= -1e-9 && t <= 1 + 1e-9 && em > 1e-6 && em < L - 1e-6) out.push({ linha: ln.id, em: r4(em) });
  }
  return out;
}

// ------------------------------------------------------------------ edição bloqueada

/** Corta a posição em `em` (m a partir de a), com traspasse `tr`: a posição fica com o início e a nova (devolvida) com o fim. */
function cortar(d: DetalheLaje, x: PosicaoLaje, em: number, tr: number, passo: number): PosicaoLaje | null {
  const Ls = Math.hypot(x.z[0] - x.a[0], x.z[1] - x.a[1]);
  if (em - tr / 2 < 0.1 || Ls - em - tr / 2 < 0.1) return null;
  const u: P = [(x.z[0] - x.a[0]) / Ls, (x.z[1] - x.a[1]) / Ls], pt = (t: number): P => [r4(x.a[0] + u[0] * t), r4(x.a[1] + u[1] * t)];
  const n = d.posicoes.reduce((m, y) => Math.max(m, +y.pos.slice(1) || 0), 0) + 1;
  const mid0 = Ls / 2, mid1 = (em + tr / 2) / 2, mid2 = (em - tr / 2 + Ls) / 2;
  const desloca = (f: [P, P], t: number): [P, P] => [[r4(f[0][0] + u[0] * (t - mid0)), r4(f[0][1] + u[1] * (t - mid0))], [r4(f[1][0] + u[0] * (t - mid0)), r4(f[1][1] + u[1] * (t - mid0))]];
  const g1 = x.ganchos[1], fim = { ...x, pos: `N${n}`, a: pt(em - tr / 2), z: x.z, ganchos: [0, g1] as [number, number], comprimento: r4(ARRED(Ls - em + tr / 2 + g1, passo)), faixa: desloca(x.faixa, mid2), editada: true as const };
  delete fim.lados;
  x.z = pt(em + tr / 2);
  x.faixa = desloca(x.faixa, mid1);
  x.comprimento = r4(ARRED(em + tr / 2 + x.ganchos[0], passo));
  x.ganchos = [x.ganchos[0], 0];
  delete x.lados;
  d.posicoes.push(fim);
  return fim;
}

/**
 * Aplica a edição bloqueada de uma laje e a verifica contra o que o cálculo exige (mensagens "Armadura bloqueada
 * insuficiente…", código ARM_BLOQ): área da bitola e espaçamento ≥ necessária, cobertura da faixa e comprimento ≥ o
 * calculado. Edição de posição que mudou (numeração ou assinatura) é desconsiderada com aviso. A emenda construtiva
 * corta a barra no ponto com o traspasse das opções, sem recalcular.
 */
export function aplicarEdicoes(l: Laje, d: DetalheLaje, ex: Exigencias, op: OpcoesCalculo): void {
  const ed = l.edicao;
  if (!ed?.barras.length) return;
  const passo = op.arredondamento / 100, Lmax = op.barraMaxima, tr = op.lajeEmendaConstrutiva / 100;
  const pre = new Map(d.posicoes.map((x) => [x.pos, { n: x.n, s: x.s }]));
  for (const e of ed.barras) {
    const x = d.posicoes.find((y) => y.pos === e.pos);
    if (!x || assinaturaPos(x) !== e.assinatura) { d.avisos.push(`Armadura bloqueada desconsiderada (laje ${l.nome}, ${e.pos}): a posição mudou depois do bloqueio.`); continue; }
    ajustarPosicao(x, { n: e.n, phi: e.phi, s: e.s, comprimento: e.comprimento, ganchos: e.ganchos });
    x.editada = true;
    const info = infoEdicao(d);
    info.editadas++;
    const req = ex.get(e.pos), ant = pre.get(e.pos);
    if (req && x.s > 0) {
      const Aef = (barArea(x.phi) / x.s) * 1e4;
      if (Aef + 1e-6 < req.As) d.avisos.push(`Armadura bloqueada insuficiente (laje ${l.nome}, ${x.pos}): ${fmt(Aef)} cm²/m < ${fmt(req.As)} cm²/m necessários.`);
      if (ant && req.cobertura > 0 && x.n * x.s + 1e-6 < req.cobertura) d.avisos.push(`Armadura bloqueada insuficiente (laje ${l.nome}, ${x.pos}): ${x.n} barras c/${fmt(x.s * 100, 0)} cobrem ${fmt(x.n * x.s)} m < ${fmt(req.cobertura)} m da faixa.`);
    }
    if (req && !l.semCalculo && e.comprimento !== undefined && x.comprimento + 1e-6 < req.comprimento) d.avisos.push(`Armadura bloqueada insuficiente (laje ${l.nome}, ${x.pos}): comprimento ${fmt(x.comprimento)} m < ${fmt(req.comprimento)} m calculado (diagrama, decalagem e ancoragem).`);
    if (x.comprimento > Lmax + 1e-9) d.avisos.push(`Posição editada ${x.pos} (laje ${l.nome}) com ${fmt(x.comprimento)} m > barra máxima ${fmt(Lmax, 1)} m.`);
    if (e.emenda) {
      const nova = cortar(d, x, e.emenda.em, tr, passo);
      if (!nova) d.avisos.push(`Armadura bloqueada desconsiderada (laje ${l.nome}, ${e.pos}): emenda fora da barra (traspasse de ${fmt(tr * 100, 0)} cm não cabe no ponto).`);
      else {
        for (const y of [x, nova]) if (y.comprimento > Lmax + 1e-9) d.avisos.push(`Posição editada ${y.pos} (laje ${l.nome}) com ${fmt(y.comprimento)} m > barra máxima ${fmt(Lmax, 1)} m.`);
      }
    }
  }
  // grupos: numera as posições agrupadas
  (ed.grupos ?? []).forEach((g, i) => { for (const m of g) { const x = d.posicoes.find((y) => y.pos === m.pos && assinaturaPos(y) === m.assinatura); if (x) x.grupo = i + 1; } });
  recalcularPeso(d);
}
