// Cortes do edifício nas pranchas (V6a, C3.31 e C3.33): marcas de corte nas plantas (formas e locação) e folha de cortes
// (elevação seccionada de cada corte ativo, em escala). A geometria do corte vem de core/vista3d/corte.ts (a mesma da
// janela de cortes da interface); aqui só se desenha em mm de papel. Sigla SCT e representação: a confirmar.
import type { AnaliseEdificio } from '../building/analitico';
import type { Dimensionamento } from '../building/dimensionamento';
import { CORTES_PRANCHA_PADRAO, type BuildingModel, type CorteEdificio } from '../building/types';
import { construirCena } from '../vista3d/cena';
import { desenharCorte } from '../vista3d/corte';
import { areaArmacao, bloco, empacotar, formatoArmacao, cfgArmacao, montarFolha, nf, type Bloco, type BlocoTabela } from './armacao';
import type { OpcoesArmacao } from './armacaoVigas';
import type { P, Prancha, Prim } from './prancha';

/** Escalas oferecidas para a folha de cortes (denominador); 0 = automática. */
export const ESCALAS_CORTES = [20, 25, 50, 75, 100, 125, 200];
/** Escalas tentadas, da maior para a menor, quando a escala é automática. */
const ESCALAS_AUTO = [50, 75, 100, 125, 200];
export const MARCA_CORTE = { min: 4, max: 30 };

/** Cortes ativados nas pranchas, na ordem do modelo (ids que não existem mais são ignorados). */
export function cortesAtivos(b: BuildingModel): CorteEdificio[] {
  const ids = new Set(b.prancha?.cortes?.ids ?? []);
  return (b.cortes ?? []).filter((c) => ids.has(c.id));
}
export const marcaDeCorte = (b: BuildingModel) => b.prancha?.cortes?.marca ?? CORTES_PRANCHA_PADRAO.marca;
export const escalaDeCorte = (b: BuildingModel) => b.prancha?.cortes?.escala ?? CORTES_PRANCHA_PADRAO.escala;

/** Trechos da polilinha dentro do retângulo (Liang-Barsky em cada segmento; segmentos contíguos formam um trecho). */
export function recortarPolilinha(pts: P[], [x0, y0, x1, y1]: [number, number, number, number]): P[][] {
  const runs: P[][] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]] as const) {
      if (Math.abs(p) < 1e-12) { if (q < 0) { ok = false; break; } continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) { ok = false; break; } t0 = Math.max(t0, r); } else { if (r < t0) { ok = false; break; } t1 = Math.min(t1, r); }
    }
    if (!ok || t1 - t0 < 1e-9) continue;
    const a: P = [ax + t0 * dx, ay + t0 * dy], z: P = [ax + t1 * dx, ay + t1 * dy], ult = runs.at(-1);
    if (ult && t0 === 0 && Math.hypot(ult.at(-1)![0] - a[0], ult.at(-1)![1] - a[1]) < 1e-9) ult.push(z); else runs.push([a, z]);
  }
  return runs;
}

/**
 * Marcas dos cortes ativos numa planta (modelo, m; `k` = m por mm do papel): linha traço-ponto, traço grosso e seta de
 * visada nas duas pontas e o nome do corte. `cx` = caixa da geometria da planta; a linha é recortada 12 mm (papel) além
 * dela. `grupo` restringe pelas plantas escolhidas (locação: sem grupo, sempre).
 */
export function primitivasMarcasCorte(b: BuildingModel, k: number, cx: [number, number, number, number], grupo?: string): Prim[] {
  const ativos = cortesAtivos(b), plantas = b.prancha?.cortes?.plantas;
  if (!ativos.length || (grupo && plantas?.length && !plantas.includes(grupo))) return [];
  const m = marcaDeCorte(b) * k, e = 12 * k, caixa: [number, number, number, number] = [cx[0] - e, cx[1] - e, cx[2] + e, cx[3] + e];
  const out: Prim[] = [];
  for (const c of ativos) {
    const runs = recortarPolilinha(c.pontos as P[], caixa);
    if (!runs.length) continue;
    for (const r of runs) out.push({ t: 'pl', c: 'CORTE', pts: r });
    const ini = runs[0], fim = runs.at(-1)!;
    const unit = (a: P, z: P): P => { const d = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1; return [(z[0] - a[0]) / d, (z[1] - a[1]) / d]; };
    // sentido de percurso em cada ponta: a entrada na ponta inicial e a saída na final
    for (const [ponta, d] of [[ini[0], unit(ini[0], ini[1])], [fim.at(-1)!, unit(fim.at(-2)!, fim.at(-1)!)]] as [P, P][]) {
      const n: P = c.sentido === 'esq' ? [-d[1], d[0]] : [d[1], -d[0]];
      const dentro: P = ponta === ini[0] ? d : [-d[0], -d[1]];
      out.push({ t: 'pl', c: 'CORTE-MARCA', pts: [ponta, [ponta[0] + dentro[0] * m, ponta[1] + dentro[1] * m]] });
      const ponta2: P = [ponta[0] + n[0] * m, ponta[1] + n[1] * m], h = 0.3 * m, ca = Math.cos(0.45), sa = Math.sin(0.45);
      out.push({ t: 'pl', c: 'CORTE-MARCA', pts: [ponta, ponta2] });
      for (const s of [1, -1]) out.push({ t: 'pl', c: 'CORTE-MARCA', pts: [ponta2, [ponta2[0] - h * (n[0] * ca - s * n[1] * sa), ponta2[1] - h * (n[1] * ca + s * n[0] * sa)]] });
      out.push({ t: 'txt', c: 'TEXTO', p: [ponta2[0] + n[0] * 2.5 * k, ponta2[1] + n[1] * 2.5 * k], h: 3 * k, s: c.nome, ah: 'c', av: 'meio' });
    }
  }
  return out;
}

/** Bloco de um corte em mm de papel (y para cima): elevação seccionada, níveis, eixos, cotas e título. */
function blocoCorte(b: BuildingModel, c: CorteEdificio, escala: number, cena: ReturnType<typeof construirCena>): { bloco: Bloco; secoes: number } {
  const des = desenharCorte(b, c, { cena }), e = 1000 / escala, L = Math.max(des.cena.comprimento, 1);
  const zLo = Math.min(des.cena.zMin, ...des.niveis.map((n) => n.cota)) - 0.3, zHi = Math.max(des.cena.zMax, ...des.niveis.map((n) => n.cota)) + 0.5;
  const X = (u: number) => u * e, Y = (z: number) => z * e;
  const p: Prim[] = [];
  for (const v of des.cena.vistos) for (let i = 0; i + 3 < v.linhas.length; i += 4) p.push({ t: 'pl', c: 'FORMA-FINA', pts: [[X(v.linhas[i]), Y(v.linhas[i + 1])], [X(v.linhas[i + 2]), Y(v.linhas[i + 3])]] });
  for (const s of des.cena.secoes) { const pts = s.pontos.map(([u, z]) => [X(u), Y(z)] as P); p.push({ t: 'hach', c: 'CONCRETO', pts, g: 0.75 }, { t: 'pl', c: 'CONCRETO', pts, fechada: true }); }
  for (const n of des.niveis) {
    p.push({ t: 'pl', c: 'EIXO', pts: [[X(0) - 30, Y(n.cota)], [X(L) + 10, Y(n.cota)]] });
    p.push({ t: 'txt', c: 'TEXTO', p: [X(0) - 32, Y(n.cota)], h: 2.2, s: `${n.nome} (${n.cota >= 0 ? '+' : ''}${nf(n.cota)})`, ah: 'd', av: 'meio' });
  }
  for (const ex of des.eixos) {
    p.push({ t: 'pl', c: 'EIXO', pts: [[X(ex.u), Y(zLo)], [X(ex.u), Y(zHi) + 4]] }, { t: 'circ', c: 'EIXO', centro: [X(ex.u), Y(zHi) + 7.5], r: 3.5 }, { t: 'txt', c: 'EIXO', p: [X(ex.u), Y(zHi) + 7.5], h: 2.5, s: ex.nome, ah: 'c', av: 'meio' });
  }
  const xc = X(L) + 14;
  for (const ct of des.cotas) {
    p.push({ t: 'pl', c: 'COTA', pts: [[xc, Y(ct.z0)], [xc, Y(ct.z1)]] }, { t: 'pl', c: 'COTA', pts: [[xc - 1.5, Y(ct.z0) - 1.5], [xc + 1.5, Y(ct.z0) + 1.5]] }, { t: 'pl', c: 'COTA', pts: [[xc - 1.5, Y(ct.z1) - 1.5], [xc + 1.5, Y(ct.z1) + 1.5]] },
      { t: 'txt', c: 'COTA', p: [xc + 3, (Y(ct.z0) + Y(ct.z1)) / 2], h: 2, s: nf(ct.valor), ah: 'e', av: 'meio' });
  }
  p.push({ t: 'txt', c: 'TEXTO', p: [X(0), Y(zLo) - 7], h: 3.5, s: c.nome.toUpperCase(), ah: 'e', av: 'base' }, { t: 'txt', c: 'TEXTO', p: [X(0), Y(zLo) - 11], h: 2, s: `ESCALA 1:${escala} · vista para a ${c.sentido === 'esq' ? 'esquerda' : 'direita'} do traçado${c.profundidade ? ` até ${nf(c.profundidade)} m` : ''}`, ah: 'e', av: 'base' });
  return { bloco: bloco(p, new Set(), c.nome), secoes: des.cena.secoes.length };
}

/**
 * Folha de cortes (V6a): a elevação seccionada de cada corte ativado, em escala (a da obra ou a maior em que todos cabem
 * numa folha), com quadro dos cortes; mais folhas quando não cabem. Sem cálculo: usa a cena 3D do modelo (e as fundações
 * do dimensionamento, quando houver).
 */
export function montarPranchasCortes(b: BuildingModel, _an: AnaliseEdificio | null, dim: Dimensionamento | null, o: OpcoesArmacao = {}): Prancha[] {
  const ativos = cortesAtivos(b);
  if (!ativos.length) return [];
  const cena = construirCena(b, { fundacoes: dim?.fundacoes, vigasFundacao: dim?.vigasFundacao });
  const monta = (escala: number) => ativos.map((c) => blocoCorte(b, c, escala, cena));
  const cfg = cfgArmacao(b), pedida = escalaDeCorte(b);
  let escala = pedida || ESCALAS_AUTO.at(-1)!, blocos = monta(escala);
  const cabeUma = (bs: Bloco[]) => { const { formato } = formatoArmacao(cfg.formato, bs), a = areaArmacao(formato); return Math.max(...empacotar(bs, a.x1 - a.x0, a.y1 - a.y0, 999).map((x) => x.folha)) === 0 && bs.every((x) => x.w <= a.x1 - a.x0 && x.h <= a.y1 - a.y0); };
  if (!pedida) for (const e of ESCALAS_AUTO) { const bs = monta(e); if (cabeUma(bs.map((x) => x.bloco))) { escala = e; blocos = bs; break; } }
  const bls = blocos.map((x) => x.bloco), { formato, avisos } = formatoArmacao(cfg.formato, bls), area = areaArmacao(formato);
  const col = empacotar(bls, area.x1 - area.x0, area.y1 - area.y0, 999);
  const nFolhas = Math.max(...col.map((c) => c.folha)) + 1, out: Prancha[] = [];
  for (let f = 0; f < nFolhas; f++) {
    const idx = col.map((c, i) => (c.folha === f ? i : -1)).filter((i) => i >= 0), desenho: Prim[] = [];
    for (const i of idx) desenho.push(...moverPrims(bls[i].prims, area.x0 + col[i].x, area.y1 - col[i].y));
    const tab: BlocoTabela = {
      titulo: 'CORTES NA FOLHA', cols: [{ w: 40, rot: 'CORTE' }, { w: 22, rot: 'COMPR. (m)' }, { w: 22, rot: 'VISTA' }, { w: 22, rot: 'PROF. (m)' }, { w: 18, rot: 'POLÍG.' }],
      linhas: idx.map((i) => { const c = ativos[i]; return [c.nome, nf(comprimento(c)), c.sentido === 'esq' ? 'esquerda' : 'direita', c.profundidade ? nf(c.profundidade) : 'total', String(blocos[i].secoes)]; }),
    };
    const aviso = [...avisos, ...idx.filter((i) => !blocos[i].secoes).map((i) => `${ativos[i].nome}: o plano não seccionou nenhum elemento.`)];
    out.push(montarFolha({
      b, formato, tipo: 'cortes', titulo: nFolhas > 1 ? `Cortes — folha ${f + 1}` : 'Cortes', conteudo: 'CORTES DO EDIFÍCIO', escala: `1:${escala}`, escalaNum: escala, carimbo: o.carimbo,
      desenho, tabelas: [tab], legenda: `ESCALA 1:${escala} · cotas e níveis em m · concreto seccionado hachurado`, avisos: aviso, elementos: idx.map((i) => ativos[i].nome),
    } as Parameters<typeof montarFolha>[0]));
  }
  return out;
}

const comprimento = (c: CorteEdificio) => c.pontos.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - c.pontos[i][0], q[1] - c.pontos[i][1]), 0);
function moverPrims(ps: Prim[], dx: number, dy: number): Prim[] {
  const mv = (q: P): P => [q[0] + dx, q[1] + dy];
  return ps.map((q) => (q.t === 'circ' ? { ...q, centro: mv(q.centro) } : q.t === 'txt' ? { ...q, p: mv(q.p) } : { ...q, pts: q.pts.map(mv) }));
}
