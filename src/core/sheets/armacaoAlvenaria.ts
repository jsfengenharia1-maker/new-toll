// Planta de blocos da alvenaria estrutural (E5i, C5.6; sigla SCM como a das paredes [a confirmar]): uma prancha por lance com as
// paredes de blocos e de alvenaria em planta — contorno, aberturas, esquema das duas primeiras fiadas (peças inteiras, meios blocos,
// canaletas e peças de canto; fiada 1 contínua, fiada 2 tracejada), barras verticais nas células grauteadas das paredes armadas
// e cotas (comprimento do trecho e posição das aberturas) —, quadro de blocos por parede e quadro da armadura por pano.
// As peças vêm da mesma regra do quantitativo (`quantitativoParede`); o aço da alvenaria armada não tem tabela própria na prancha.
import type { AnaliseEdificio } from '../building/analitico';
import { blocoDe, moduloDoBloco, precisaCanto, tipoAlvenariaDe, TOL_MODULO, ehAlvenaria } from '../building/alvenaria';
import type { ResultadoAlvenariaParede } from '../building/alvenariaDim';
import type { Dimensionamento } from '../building/dimensionamento';
import { opcoesEmUso, perfilDe, type OpcoesCalculo } from '../building/opcoes';
import { acumulados, furosDaParede, niveisDaParede, ppDaParede } from '../building/paredesBase';
import { contornoDoLado, ladosDoPP, type LadoGeo } from '../building/pilarParede';
import { ARMACAO_PADRAO, pavimentosOrdenados, type BuildingModel, type Parede, type TipoBloco } from '../building/types';
import { caixa, txt, type P, type Prancha, type Prim } from './prancha';
import { cmInt, montarFolha, nf, notas, plantaNaFolha, type BlocoTabela, type OpcoesCarimbo } from './armacao';

export interface OpcoesAlvenariaPranchas { carimbo?: OpcoesCarimbo }

/** Peça da fiada em planta: posição ao longo do trecho (m, a partir do início do trecho). */
export interface PecaFiada { s0: number; s1: number; tipo: 'inteiro' | 'meio' | 'canaleta'; }

/**
 * Peças da fiada `r` (0 = primeira) do trecho `i` da parede no lance `k`: mesma regra do quantitativo (módulos de meio bloco,
 * um módulo a menos em cada ponta com peça de canto, vãos das aberturas, canaletas de verga e de peitoril, paridade alternada).
 */
export function pecasDaFiada(b: BuildingModel, w: Parede, bl: TipoBloco, op: OpcoesCalculo, k: number, i: number, r: number): PecaFiada[] {
  const { zs } = niveisDaParede(b, w), c = acumulados(w.pontos as [number, number][]), furos = furosDaParede(b, w).porTrecho;
  const { mod, alt } = moduloDoBloco(bl), canto = precisaCanto(bl), nTrechos = w.pontos.length - 1;
  const apoio = Math.ceil(op.alvenariaVergaApoio / 100 / mod - 1e-6), fiadasVerga = Math.round(op.alvenariaVergaFiadas);
  const Li = c[i + 1] - c[i], ini = canto && i > 0 ? mod : 0, cantosI = canto ? (i > 0 ? 1 : 0) + (i < nTrechos - 1 ? 1 : 0) : 0, M = Math.max(0, Math.round(Li / mod) - cantosI);
  const fs = furos[i].filter((f) => f.z0 >= zs[k] - 1e-6 && f.z1 <= zs[k + 1] + 1e-6);
  const base = zs[k] + r * alt, topo = base + alt, estado = new Array<number>(M).fill(0);
  const cobre = (m0: number, m1: number, v: number) => { for (let m = Math.max(0, m0); m < Math.min(M, m1); m++) if (estado[m] !== 1) estado[m] = v; };
  for (const f of fs) {
    const m0 = Math.floor((f.s0 + 1e-6) / mod), m1 = Math.ceil((f.s1 - 1e-6) / mod), r0 = Math.ceil((f.z1 - zs[k] - TOL_MODULO) / alt), ehJanela = f.z0 - zs[k] > TOL_MODULO;
    if (topo > f.z0 + TOL_MODULO && base < f.z1 - TOL_MODULO) cobre(m0, m1, 1);
    else if (r >= r0 && r < r0 + fiadasVerga) cobre(m0 - apoio, m1 + apoio, 2);
    else if (ehJanela && r === Math.floor((f.z0 - zs[k] + TOL_MODULO) / alt) - 1) cobre(m0 - apoio, m1 + apoio, 2);
  }
  const out: PecaFiada[] = [], pos = (m: number) => ini + m * mod;
  for (let m = 0; m < M;) {
    let n = m;
    while (n < M && estado[n] === estado[m]) n++;
    const len = n - m;
    if (estado[m] === 0) {
      // mesma regra de `contarSequencia`: paridade 0 começa com inteiro (meio no fim se ímpar); paridade 1 começa com meio (e termina com meio se par)
      const par = r % 2;
      let a = m;
      if (par === 1) { out.push({ s0: pos(a), s1: pos(a + 1), tipo: 'meio' }); a++; }
      const ints = par === 1 ? (len === 1 ? 0 : len % 2 === 0 ? len / 2 - 1 : (len - 1) / 2) : Math.floor(len / 2);
      for (let j = 0; j < ints; j++) { out.push({ s0: pos(a), s1: pos(a + 2), tipo: 'inteiro' }); a += 2; }
      if (a < n) out.push({ s0: pos(a), s1: pos(a + 1), tipo: 'meio' });
    } else if (estado[m] === 2) {
      for (let a = m; a < n; a += 2) out.push({ s0: pos(a), s1: pos(Math.min(n, a + 2)), tipo: 'canaleta' });
    }
    m = n;
  }
  return out;
}

/** Posições (m, a partir do início do pano) das barras verticais nas células grauteadas: meio módulo da extremidade e depois a cada `s`. */
export function posicoesBarrasVerticais(s0: number, s1: number, s: number, mod: number): number[] {
  if (s1 - s0 < mod - 1e-9 || s <= 0) return [];
  const n = Math.floor((s1 - s0 - mod) / s + 1e-6) + 1;
  return Array.from({ length: n }, (_, j) => +(s0 + mod / 2 + j * s).toFixed(4));
}

const ptLado = (g: LadoGeo, s: number, off: number): P => [g.a[0] + g.u[0] * s + g.n[0] * off, g.a[1] + g.u[1] * s + g.n[1] * off];

/** Primitivas da parede `w` no lance `k` (planta, em metros do modelo) e as linhas dos quadros. */
function desenhoParede(b: BuildingModel, w: Parede, res: ResultadoAlvenariaParede | undefined, k: number, lanceId: string, kEsc: number, op: OpcoesCalculo) {
  const prims: Prim[] = [], pp = ppDaParede(w), lados = ladosDoPP(b, pp), tipo = tipoAlvenariaDe(b, w), bl = blocoDe(b, tipo);
  const { zs } = niveisDaParede(b, w), c = acumulados(w.pontos as [number, number][]);
  const furos = furosDaParede(b, w).porTrecho;
  const barras: string[][] = [];
  const pontos: P[] = [];
  for (const g of lados) {
    const e = g.esp(lanceId), cont = contornoDoLado(g, lanceId);
    pontos.push(...cont);
    prims.push({ t: 'pl', c: 'PILAR', pts: cont, fechada: true });
    const fs = furos[g.i].filter((f) => f.z0 >= zs[k] - 1e-6 && f.z1 <= zs[k + 1] + 1e-6);
    // aberturas: tracejado na face e rótulo com a largura; cota da posição a partir do início do trecho
    for (const f of fs) {
      prims.push({ t: 'pl', c: 'PILAR-NASCE', pts: [ptLado(g, f.s0, -e.dir), ptLado(g, f.s0, e.esq)] }, { t: 'pl', c: 'PILAR-NASCE', pts: [ptLado(g, f.s1, -e.dir), ptLado(g, f.s1, e.esq)] });
      const m = ptLado(g, (f.s0 + f.s1) / 2, e.esq + 1.6 * kEsc);
      prims.push(txt('COTA', m[0], m[1], 1.6 * kEsc, `${nf((f.s1 - f.s0) * 100, 0)} @ ${nf(f.s0 * 100, 0)}`, 'c', 'base'));
    }
    if (bl) {
      for (const r of [0, 1]) {
        for (const p of pecasDaFiada(b, w, bl, op, k, g.i, r)) {
          const pts: P[] = [ptLado(g, p.s0, -e.dir), ptLado(g, p.s0, e.esq), ptLado(g, p.s1, e.esq), ptLado(g, p.s1, -e.dir)];
          // fiada 1: peça inteira em traço contínuo; fiada 2: só as juntas, tracejadas; canaleta com diagonal
          if (r === 0) prims.push({ t: 'pl', c: 'FORMA-FINA', pts, fechada: true });
          else prims.push({ t: 'pl', c: 'PILAR-NASCE', pts: [pts[0], pts[1]] }, { t: 'pl', c: 'PILAR-NASCE', pts: [pts[2], pts[3]] });
          if (p.tipo === 'canaleta') prims.push({ t: 'pl', c: 'FORMA-FINA', pts: [pts[0], pts[2]] });
        }
      }
    }
    // barras verticais das paredes armadas (uma por célula grauteada)
    for (const p of res?.panos.filter((x) => x.lado === g.i && x.pavimento === lanceId && x.armadura?.vert) ?? []) {
      const v = p.armadura!.vert!, xs = posicoesBarrasVerticais(p.s0, p.s1, v.s, bl ? moduloDoBloco(bl).mod : 0.2);
      for (const s of xs) prims.push({ t: 'circ', c: 'ARMADURA', centro: ptLado(g, s, (e.esq - e.dir) / 2), r: Math.max(v.phi / 2000, 0.5 * kEsc) });
      barras.push([w.nome, g.nome, String(p.pano + 1), `φ${nf(v.phi, 1)} c/${cmInt(v.s)}`, p.armadura!.hor ? `φ${nf(p.armadura!.hor.phi, 1)} c/${cmInt(p.armadura!.hor.s)}` : '—', String(xs.length)]);
    }
    // cota do trecho
    const m = ptLado(g, g.L / 2, -e.dir - 2.4 * kEsc);
    prims.push(txt('COTA', m[0], m[1], 1.8 * kEsc, `${nf(c[g.i + 1] - c[g.i], 2)} m`, 'c', 'topo'));
  }
  const cx = caixa(pontos);
  prims.push(txt('TEXTO', cx[0], cx[3] + 4 * kEsc, 2.5 * kEsc, `${w.nome} · ${bl ? bl.nome : tipo?.nome ?? 'alvenaria'}${res?.armada ? ' · armada' : ''}`, 'e', 'base'));
  return { prims, barras, pontos };
}

export function montarPranchasAlvenaria(b: BuildingModel, _an: AnaliseEdificio | null, dim: Dimensionamento, o: OpcoesAlvenariaPranchas = {}): Prancha[] {
  const al = dim.alvenaria;
  if (!al?.paredes.length) return [];
  const op = opcoesEmUso(b.opcoes, perfilDe(b)), cfg = { ...ARMACAO_PADRAO, ...(b.prancha?.armacao ?? {}) };
  const out: Prancha[] = [];
  const walls = (b.paredes ?? []).filter(ehAlvenaria);
  const ps = pavimentosOrdenados(b);
  for (const pav of ps) {
    const doLance = walls.map((w) => ({ w, k: niveisDaParede(b, w).topos.indexOf(pav.id), res: al.paredes.find((r) => r.id === w.id) })).filter((x) => x.k >= 0);
    if (!doLance.length) continue;
    // escala e formato pela caixa de todas as paredes do lance
    const todos: P[] = doLance.flatMap(({ w }) => ladosDoPP(b, ppDaParede(w)).flatMap((g) => contornoDoLado(g, pav.id)));
    const cx = caixa(todos), pl = plantaNaFolha(cx, b.prancha?.formato ?? cfg.formato, cfg.escalaLocacao || b.prancha?.escala || 0, 34), kEsc = pl.escala / 1000;
    const modelo: Prim[] = [], quadroArm: string[][] = [], quadroBlocos: string[][] = [];
    for (const { w, k, res } of doLance) {
      const d = desenhoParede(b, w, res, k, pav.id, kEsc, op);
      modelo.push(...d.prims);
      quadroArm.push(...d.barras);
      const q = res?.quantitativo?.lances.find((l) => l.pavimento === pav.id);
      if (q && res?.quantitativo) quadroBlocos.push([w.nome, res.quantitativo.nomeBloco, String(q.fiadas), String(q.inteiros), String(q.meios), String(q.cantos), String(q.canaletas), String(q.total), nf(q.area)]);
    }
    const tabelas: BlocoTabela[] = [notas([
      'Medidas em cm (cotas das aberturas: largura @ posição a partir do início do trecho); comprimentos dos trechos em m.',
      'Fiada 1 em traço contínuo (peças inteiras e meios blocos); fiada 2 tracejada (juntas), com a paridade alternada; canaleta com diagonal; peça de canto na junção dos trechos quando o bloco pede.',
      'Barras verticais (círculos) nas células grauteadas das paredes armadas: a partir de meio módulo da extremidade do pano, no espaçamento do quadro [a confirmar]. Barras horizontais nas juntas, conforme o quadro.',
      'Quantidades de blocos por parede e lance iguais às do quantitativo da alvenaria (memorial).',
    ])];
    if (quadroBlocos.length) tabelas.push({ titulo: `BLOCOS — ${pav.nome.toUpperCase()}`, cols: [{ w: 16, rot: 'PAREDE' }, { w: 40, rot: 'BLOCO' }, { w: 16, rot: 'FIADAS' }, { w: 18, rot: 'INTEIROS' }, { w: 14, rot: 'MEIOS' }, { w: 14, rot: 'CANTO' }, { w: 18, rot: 'CANALETAS' }, { w: 14, rot: 'TOTAL' }, { w: 18, rot: 'ÁREA (m²)' }], linhas: quadroBlocos });
    if (quadroArm.length) tabelas.push({ titulo: `ARMADURA POR PANO — ${pav.nome.toUpperCase()}`, cols: [{ w: 16, rot: 'PAREDE' }, { w: 20, rot: 'TRECHO' }, { w: 14, rot: 'PANO' }, { w: 34, rot: 'VERTICAL' }, { w: 34, rot: 'HORIZONTAL' }, { w: 24, rot: 'Nº BARRAS V.' }], linhas: quadroArm });
    out.push(montarFolha({
      b, formato: pl.formato, tipo: 'paredes', titulo: `Alvenaria — planta de blocos · ${pav.nome}`, conteudo: `ALVENARIA ESTRUTURAL — ESQUEMA DOS BLOCOS E DAS ARMADURAS (${pav.nome.toUpperCase()})`, escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo,
      desenho: [], tabelas, legenda: `ESCALA 1:${pl.escala} · duas primeiras fiadas`, avisos: [...pl.avisos], modelo, janela: pl.janela, elementos: doLance.map(({ w }) => w.nome),
    }));
  }
  return out;
}

