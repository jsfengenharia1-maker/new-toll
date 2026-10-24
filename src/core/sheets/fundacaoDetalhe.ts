// Desenhos de detalhamento das fundações (FU5), no papel (mm, y para cima): sapatas, blocos sobre estacas (com a
// legenda 1:25), tubulões, vigas de fundação e arranques dos pilares. Cada função devolve as primitivas de um
// elemento ou grupo de elementos iguais ("S1=S2=…") e registra as barras em `posDe` (posições por folha); o
// multiplicador de iguais entra nas quantidades ("3×5 N1 φ6,3 c/9 C=89"). Padrão das folhas de referência onde elas
// definem (planta e corte 1:50, legenda dos blocos 1:25, arranque com elevação 1:50 e seção 1:25); o que elas não
// trazem (tubulão, viga de equilíbrio) segue o padrão das pranchas da R5 e fica "a confirmar".
import { ganchoNoventa } from '../building/detalhamento';
import type { DetalhePilar } from '../building/detalhamentoPilares';
import type { ResultadoPilar } from '../building/dimensionamento';
import type { ResultadoFundacao } from '../building/fundacao';
import { acoDe, cobrimentoFundacao } from '../building/materiais';
import { dimsSecao, secaoNoLance, type BuildingModel, type Pilar } from '../building/types';
import { geometriaVF, meiaFace, type ResultadoVigaFundacao } from '../building/vigasFundacao';
import { isCaisson } from '../caissons';
import { isFooting } from '../footings';
import type { CaissonResult } from '../caissons';
import type { CapResult } from '../caps';
import type { FootingResult } from '../footings';
import type { BarSet } from '../rebar';
import { barrasSecao } from './armacaoPilares';
import { cmInt, cotaCm, cotaHorizontal, cotaVertical, nf, nivel, phiTxt, ponto, qtd, type PosDe } from './armacao';
import { txt, type Prim } from './prancha';

export interface Ctx {
  b: BuildingModel; posDe: PosDe;
  /** Escala (denominador) das plantas e cortes, da legenda dos blocos e das seções. */
  escala: number; escalaLeg: number; escalaSecao: number;
}

// ---------------- acesso ao cálculo ----------------

export const sapataDe = (r: ResultadoFundacao): FootingResult | null => { const f = r.projeto?.footing; return f && isFooting(f) ? f : null; };
export const blocoDe = (r: ResultadoFundacao): CapResult | null => r.projeto?.cap ?? null;
export const tubulaoDe = (r: ResultadoFundacao): CaissonResult | null => { const c = r.projeto?.caisson; return c && isCaisson(c) ? c : null; };
/** Estacas do bloco (coordenadas nos eixos do elemento, m), diâmetro (m) e comprimento (m, quando calculado). */
export function estacasDe(r: ResultadoFundacao): { coords: [number, number][]; D: number; L?: number; tipo?: string } | null {
  const p = r.projeto;
  if (!p) return null;
  if (p.pile) return { coords: p.pile.loads.coords, D: p.pile.D, L: p.pile.L, tipo: p.pile.type };
  if (p.pileFixed) return { coords: p.pileFixed.loads.coords, D: p.pileFixed.D / 100, tipo: p.pileFixed.type };
  return null;
}
/** Pilares do elemento nos eixos do elemento (m): centro e seção. */
export function pilaresLocais(r: ResultadoFundacao): { nome: string; x: number; y: number; ap: number; bp: number }[] {
  if (!r.grupo) return [{ nome: r.pilares[0] ?? '', x: r.excentricidade[0], y: r.excentricidade[1], ap: r.ap, bp: r.bp }];
  const a = (-r.angulo * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return r.grupo.pilares.map((q) => { const dx = q.centro[0] - r.centro[0], dy = q.centro[1] - r.centro[1]; return { nome: q.nome, x: dx * c - dy * s, y: dx * s + dy * c, ap: q.ap, bp: q.bp }; });
}

/** Lista de nomes "S1=S2=…" (quebra em linhas de até 6). */
export function titulo(nomes: string[]): string[] {
  const ls: string[] = [];
  for (let i = 0; i < nomes.length; i += 6) ls.push(nomes.slice(i, i + 6).join('='));
  return ls.map((l, i) => (i < ls.length - 1 ? `${l}=` : l));
}
function cabecalho(out: Prim[], nomes: string[], sub: string): number {
  const ls = titulo(nomes);
  ls.forEach((l, i) => out.push(txt('TEXTO', 0, -6 * i, 5, l, 'e', 'topo')));
  const y = -6 * ls.length - 1;
  out.push(txt('TEXTO', 0, y, 2.2, sub, 'e', 'topo'));
  return y - 7;
}

const ang = (dx: number, dy: number) => { let a = (Math.atan2(dy, dx) * 180) / Math.PI; if (a > 90) a -= 180; if (a <= -90) a += 180; return a; };
const sp = (b: BarSet | null) => (b && b.spacing > 0 ? `c/${cmInt(b.spacing)}` : '');
/** Barras ao longo de um comprimento reto (m) com ganchos de 90° nas pontas (0, 1 ou 2). */
const cBarra = (reto: number, phi: number, ganchos: number) => cmInt(reto + ganchos * ganchoNoventa(phi));
const rotulo = (rep: number, n: number, pos: string, phi: number, passo: string, C: number) => `${qtd(rep, n)} ${pos} ${phiTxt(phi)}${passo ? ` ${passo}` : ''} C=${C}`;

// ---------------- sapata ----------------

/** Sapata (ou grupo de iguais): planta e corte com as malhas, cotas e rótulos h0, h1 e df. */
export function desenharSapata(c: Ctx, els: ResultadoFundacao[]): Prim[] {
  const r = els[0], f = sapataDe(r)!, rep = els.length, k = 1000 / c.escala, cob = cobrimentoFundacao(c.b), aco = acoDe(c.b, 'fundacao').aco;
  const out: Prim[] = [];
  let y = cabecalho(out, els.map((e) => e.nome), `Sapata ${cmInt(f.A)}×${cmInt(f.B)}×${cmInt(f.h)} cm${f.simples ? ' · concreto simples' : ''}${rep > 1 ? ` · ${rep} iguais` : ''}`);
  const W = f.A * k, B = f.B * k;
  // ---- planta ----
  out.push(txt('TEXTO', 0, y, 2.4, `PLANTA ESC 1:${c.escala}`, 'e', 'topo'));
  const col = f.grupo ? f.colOffset : f.colOffset;
  const cx = W / 2 + col[0] * k, cy = B / 2 + col[1] * k;
  const yTop = y - 18, yBot = yTop - B;
  const xL = cx - (r.ap * k) / 2, xR = cx + (r.ap * k) / 2;
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[0, yBot], [W, yBot], [W, yTop], [0, yTop]], fechada: true });
  if (!f.grupo) out.push({ t: 'pl', c: 'PILAR', pts: [[xL, yBot + cy - (r.bp * k) / 2], [xR, yBot + cy - (r.bp * k) / 2], [xR, yBot + cy + (r.bp * k) / 2], [xL, yBot + cy + (r.bp * k) / 2]], fechada: true });
  else for (const q of f.grupo.cols) { const px = W / 2 + q.x * k, py = B / 2 + q.y * k; out.push({ t: 'pl', c: 'PILAR', pts: [[px - (q.ap * k) / 2, yBot + py - (q.bp * k) / 2], [px + (q.ap * k) / 2, yBot + py - (q.bp * k) / 2], [px + (q.ap * k) / 2, yBot + py + (q.bp * k) / 2], [px - (q.ap * k) / 2, yBot + py + (q.bp * k) / 2]], fechada: true }); }
  out.push(...cotaHorizontal(yTop + 4, [0, xL, xR, W], [cotaCm(xL / k), cotaCm(r.ap), cotaCm(W / k - xR / k)]));
  out.push(...cotaHorizontal(yTop + 9, [0, W], [cotaCm(f.A)]));
  out.push(...cotaVertical(-4, [yBot, yTop], [cotaCm(f.B)]));
  const textos: string[] = [];
  const dx = f.flex.x.bars, dy = f.flex.y.bars;
  // barras na direção de A (distribuídas na largura B) e na de B (distribuídas em A)
  if (dx && !f.simples) {
    const C = cBarra(f.A - 2 * cob, dx.phi, 0), pos = c.posDe(`SX|${cmInt(f.A)}|${cmInt(dx.spacing)}`, aco, dx.phi, C, rep * dx.n);
    const idx = [...new Set([0, 1, dx.n - 2, dx.n - 1])].filter((i) => i >= 0 && i < dx.n);
    for (const i of idx) { const yy = yBot + (cob + i * dx.spacing) * k; out.push({ t: 'pl', c: 'ARMADURA', pts: [[cob * k, yy], [W - cob * k, yy]] }); }
    out.push(...cotaVertical(W + 5, [yBot + cob * k, yBot + (cob + dx.spacing) * k], [sp(dx).replace('c/', '')], 'COTA', 1.6));
    textos.push(rotulo(rep, dx.n, pos, dx.phi, sp(dx), C));
  }
  if (dy && !f.simples) {
    const C = cBarra(f.B - 2 * cob, dy.phi, 0), pos = c.posDe(`SY|${cmInt(f.B)}|${cmInt(dy.spacing)}`, aco, dy.phi, C, rep * dy.n);
    const idx = [...new Set([0, 1, dy.n - 2, dy.n - 1])].filter((i) => i >= 0 && i < dy.n);
    for (const i of idx) { const xx = (cob + i * dy.spacing) * k; out.push({ t: 'pl', c: 'ARMADURA', pts: [[xx, yBot + cob * k], [xx, yTop - cob * k]] }); }
    out.push(...cotaHorizontal(yBot - 5, [cob * k, (cob + dy.spacing) * k], [sp(dy).replace('c/', '')], 'COTA', 1.6));
    textos.push(rotulo(rep, dy.n, pos, dy.phi, sp(dy), C));
  }
  if (f.simples) textos.push('Concreto simples (sem armadura de flexão)');
  const topo = f.flex.x.top?.needed || f.flex.y.top?.needed;
  if (topo) for (const [d, e] of [[f.flex.x.top, 'A'], [f.flex.y.top, 'B']] as const) if (d?.needed && d.bars) {
    const C = cBarra((e === 'A' ? f.A : f.B) - 2 * cob, d.bars.phi, 0), pos = c.posDe(`ST${e}|${cmInt(e === 'A' ? f.A : f.B)}`, aco, d.bars.phi, C, rep * d.bars.n);
    textos.push(`Malha superior (${e}): ${rotulo(rep, d.bars.n, pos, d.bars.phi, sp(d.bars), C)}`);
  }
  textos.forEach((t, i) => out.push(txt('TEXTO', 0, yBot - 10 - 3.4 * i, 2.2, t, 'e', 'topo')));
  y = yBot - 10 - 3.4 * Math.max(1, textos.length) - 8;
  // ---- corte ----
  out.push(txt('TEXTO', 0, y, 2.4, `CORTE ESC 1:${c.escala}`, 'e', 'topo'));
  const h = f.h * k, h0 = f.h0 * k, yc0 = y - 12 - h - 12;
  const topL = f.simples || f.constH ? 0 : Math.max(0, xL), topR = f.simples || f.constH ? W : Math.min(W, xR);
  out.push({ t: 'pl', c: 'CONCRETO', pts: f.constH || f.simples ? [[0, yc0], [W, yc0], [W, yc0 + h], [0, yc0 + h]] : [[0, yc0], [W, yc0], [W, yc0 + h0], [topR, yc0 + h], [topL, yc0 + h], [0, yc0 + h0]], fechada: true });
  out.push({ t: 'pl', c: 'PILAR', pts: [[xL, yc0 + h], [xL, yc0 + h + 10]] }, { t: 'pl', c: 'PILAR', pts: [[xR, yc0 + h], [xR, yc0 + h + 10]] });
  if (dx && !f.simples) {
    const yb = yc0 + cob * k, yy = yb + (dx.phi / 2000) * k;
    out.push({ t: 'pl', c: 'ARMADURA', pts: [[cob * k, yy], [W - cob * k, yy]] });
    if (dy) for (let i = 0; i < dy.n; i++) out.push(ponto('ARMADURA', (cob + i * dy.spacing) * k, yy + (dx.phi / 2000 + dy.phi / 2000) * k, Math.max((dy.phi / 2000) * k, 0.45)));
  }
  out.push(...cotaHorizontal(yc0 - 5, [0, W], [cotaCm(f.A)]));
  if (!f.simples && !f.constH) out.push(...cotaVertical(W + 6, [yc0, yc0 + h0, yc0 + h], [`h0=${cotaCm(f.h0)}`, `h1=${cotaCm(f.h - f.h0)}`]));
  else out.push(...cotaVertical(W + 6, [yc0, yc0 + h], [`h=${cotaCm(f.h)}`]));
  out.push(...cotaVertical(-6, [yc0, yc0 + r.profundidade * k], [`df=${cotaCm(r.profundidade)}`]));
  out.push({ t: 'pl', c: 'COTA', pts: [[-12, yc0 + r.profundidade * k], [W + 12, yc0 + r.profundidade * k]] }, txt('COTA', W + 14, yc0 + r.profundidade * k, 1.8, 'C.T', 'e', 'meio'));
  out.push(txt('TEXTO', 0, yc0 - 12, 2, `Assentamento: cota ${nf(r.cota)} m · df = ${cotaCm(r.profundidade)} cm`, 'e', 'topo'));
  out.push(txt('TEXTO', 0, yc0 - 16, 2, 'Solo compactado sobre a sapata (γ ≥ 16 kN/m³) [a confirmar]', 'e', 'topo'));
  return out;
}

// ---------------- bloco ----------------

interface BarraBloco { rot: string; desenho?: [[number, number], [number, number]]; chave: string; phi: number; n: number; C: number; sp: string }

/** Barras do bloco (tirantes, malhas, superior, pele, estribos) com comprimento ao cm; `desenho` = eixo em planta (m, eixos do elemento). */
export function barrasDoBloco(cap: CapResult, est: { coords: [number, number][]; D: number } | null, cob: number): BarraBloco[] {
  const out: BarraBloco[] = [];
  const coords = est?.coords ?? [], D = est?.D ?? 0.4;
  cap.ties.forEach((t, i) => {
    if (!t.bars) return;
    const a = coords[t.a], z = coords[t.b];
    if (!a || !z) return;
    const dist = Math.hypot(z[0] - a[0], z[1] - a[1]), C = cBarra(dist + D - 2 * cob, t.bars.phi, 2);
    out.push({ rot: `Tirante ${t.a + 1}–${t.b + 1}`, desenho: [a, z], chave: `BT|${cmInt(dist)}|${t.dir}|${i >= 0 ? '' : ''}`, phi: t.bars.phi, n: t.bars.n, C, sp: '' });
  });
  if (cap.mesh) {
    const mx = cap.mesh.x.bars, my = cap.mesh.y.bars;
    if (mx) out.push({ rot: 'Malha inferior (x)', chave: `BMX|${cmInt(cap.lx)}`, phi: mx.phi, n: mx.n, C: cBarra(cap.lx - 2 * cob, mx.phi, 0), sp: sp(mx) });
    if (my) out.push({ rot: 'Malha inferior (y)', chave: `BMY|${cmInt(cap.ly)}`, phi: my.phi, n: my.n, C: cBarra(cap.ly - 2 * cob, my.phi, 0), sp: sp(my) });
  }
  const tie0 = cap.ties[0], dir0 = tie0?.dir === 'y' ? cap.ly : cap.lx;
  if (cap.top?.bars) out.push({ rot: 'Armadura superior', chave: `BS|${cmInt(dir0)}`, phi: cap.top.bars.phi, n: cap.top.bars.n, C: cBarra(dir0 - 2 * cob, cap.top.bars.phi, 2), sp: sp(cap.top.bars) });
  if (cap.skin?.bars) out.push({ rot: 'Pele (por face)', chave: `BP|${cmInt(dir0)}`, phi: cap.skin.bars.phi, n: 2 * cap.skin.bars.n, C: cBarra(dir0 - 2 * cob, cap.skin.bars.phi, 0), sp: sp(cap.skin.bars) });
  if (cap.stirrups) {
    const w = tie0?.dir === 'y' ? cap.lx : cap.ly, ext = dir0 - 2 * cob, st = cap.stirrups;
    const per = 2 * (w - 2 * cob + cap.h - 2 * cob) + 2 * ganchoNoventa(st.phi);
    out.push({ rot: 'Estribos', chave: `BE|${cmInt(w)}|${cmInt(cap.h)}`, phi: st.phi, n: Math.floor(ext / st.s) + 1, C: cmInt(per), sp: `c/${cmInt(st.s)}` });
  }
  if (cap.single) {
    cap.single.bars.forEach((bs, i) => { if (bs) out.push({ rot: `Armadura (${i === 0 ? 'x' : 'y'})`, chave: `B1|${i}|${cmInt(i === 0 ? cap.lx : cap.ly)}`, phi: bs.phi, n: bs.n, C: cBarra((i === 0 ? cap.lx : cap.ly) - 2 * cob, bs.phi, 2), sp: sp(bs) }); });
  }
  return out;
}

/** Bloco sobre estacas (ou grupo de iguais): planta e corte com estacas, tirantes, bielas e estribos. */
export function desenharBloco(c: Ctx, els: ResultadoFundacao[]): Prim[] {
  const r = els[0], cap = blocoDe(r)!, est = estacasDe(r), rep = els.length, k = 1000 / c.escala, cob = cobrimentoFundacao(c.b), aco = acoDe(c.b, 'fundacao').aco;
  const coords = est?.coords ?? [], D = est?.D ?? 0.4;
  const out: Prim[] = [];
  let y = cabecalho(out, els.map((e) => e.nome), `Bloco ${cmInt(cap.lx)}×${cmInt(cap.ly)}×${cmInt(cap.h)} cm · ${coords.length}×ø${cmInt(D)}${rep > 1 ? ` · ${rep} iguais` : ''}`);
  const W = cap.lx * k, B = cap.ly * k;
  out.push(txt('TEXTO', 0, y, 2.4, `PLANTA ESC 1:${c.escala}`, 'e', 'topo'));
  const yTop = y - 18, yBot = yTop - B, ox = W / 2, oy = yBot + B / 2;
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[0, yBot], [W, yBot], [W, yTop], [0, yTop]], fechada: true });
  for (const q of pilaresLocais(r)) {
    const px = ox + q.x * k, py = oy + q.y * k;
    out.push({ t: 'pl', c: 'PILAR', pts: [[px - (q.ap * k) / 2, py - (q.bp * k) / 2], [px + (q.ap * k) / 2, py - (q.bp * k) / 2], [px + (q.ap * k) / 2, py + (q.bp * k) / 2], [px - (q.ap * k) / 2, py + (q.bp * k) / 2]], fechada: true });
  }
  for (const [ex, ey] of coords) {
    const px = ox + ex * k, py = oy + ey * k, rr = (D / 2) * k, d = rr * 0.7;
    out.push({ t: 'circ', c: 'CONCRETO', centro: [px, py], r: rr }, { t: 'pl', c: 'FORMA-FINA', pts: [[px - d, py - d], [px + d, py + d]] }, { t: 'pl', c: 'FORMA-FINA', pts: [[px - d, py + d], [px + d, py - d]] });
  }
  const barras = barrasDoBloco(cap, est, cob), textos: string[] = [];
  for (const bb of barras) {
    const pos = c.posDe(bb.chave, aco, bb.phi, bb.C, rep * bb.n);
    if (bb.desenho) {
      const [a, z] = bb.desenho, p0: [number, number] = [ox + a[0] * k, oy + a[1] * k], p1: [number, number] = [ox + z[0] * k, oy + z[1] * k];
      out.push({ t: 'pl', c: 'ARMADURA', pts: [p0, p1] });
      const dd = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, off = (D / 2) * k + 1.8;
      let nx = -(p1[1] - p0[1]) / dd, ny = (p1[0] - p0[0]) / dd;
      if (ny < 0 || (Math.abs(ny) < 1e-9 && nx < 0)) { nx = -nx; ny = -ny; }
      out.push({ t: 'txt', c: 'TEXTO', p: [(p0[0] + p1[0]) / 2 + nx * off, (p0[1] + p1[1]) / 2 + ny * off], h: 1.8, s: `${qtd(rep, bb.n)} ${pos} ${phiTxt(bb.phi)} C=${bb.C}`, ang: ang(p1[0] - p0[0], p1[1] - p0[1]), ah: 'c', av: 'base' });
    } else textos.push(`${bb.rot}: ${rotulo(rep, bb.n, pos, bb.phi, bb.sp, bb.C)}`);
  }
  // cotas: lados e distâncias entre estacas
  const xs = [-cap.lx / 2, ...[...new Set(coords.map((q) => +q[0].toFixed(3)))].sort((a, z) => a - z), cap.lx / 2];
  const ys = [-cap.ly / 2, ...[...new Set(coords.map((q) => +q[1].toFixed(3)))].sort((a, z) => a - z), cap.ly / 2];
  out.push(...cotaHorizontal(yTop + 4, xs.map((v) => ox + v * k), xs.slice(1).map((v, i) => cotaCm(v - xs[i]))));
  out.push(...cotaVertical(-4, ys.map((v) => oy + v * k), ys.slice(1).map((v, i) => cotaCm(v - ys[i]))));
  textos.forEach((t, i) => out.push(txt('TEXTO', 0, yBot - 10 - 3.4 * i, 2.2, t, 'e', 'topo')));
  y = yBot - 10 - 3.4 * Math.max(1, textos.length) - 8;
  // ---- corte ----
  out.push(txt('TEXTO', 0, y, 2.4, `CORTE ESC 1:${c.escala}`, 'e', 'topo'));
  const h = cap.h * k, yc0 = y - 12 - h - 22;
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[0, yc0], [W, yc0], [W, yc0 + h], [0, yc0 + h]], fechada: true });
  for (const px of [...new Set(coords.map((q) => +q[0].toFixed(3)))]) {
    const x0 = ox + px * k - (D / 2) * k, x1 = ox + px * k + (D / 2) * k;
    out.push({ t: 'pl', c: 'CONCRETO', pts: [[x0, yc0], [x0, yc0 - 14]] }, { t: 'pl', c: 'CONCRETO', pts: [[x1, yc0], [x1, yc0 - 14]] }, { t: 'pl', c: 'CONCRETO', pts: [[x0 - 1.5, yc0 - 11], [x0 + 2, yc0 - 13]] });
  }
  for (const q of pilaresLocais(r)) {
    const px = ox + q.x * k;
    out.push({ t: 'pl', c: 'PILAR', pts: [[px - (q.ap * k) / 2, yc0 + h], [px - (q.ap * k) / 2, yc0 + h + 10]] }, { t: 'pl', c: 'PILAR', pts: [[px + (q.ap * k) / 2, yc0 + h], [px + (q.ap * k) / 2, yc0 + h + 10]] });
  }
  // bielas (do topo do pilar ao centro da estaca, na altura d')
  cap.tops.forEach((t, i) => { const q = coords[i]; if (t && q) out.push({ t: 'pl', c: 'FORMA-FINA', pts: [[ox + t[0] * k, yc0 + h], [ox + q[0] * k, yc0 + cap.dPrime * k]] }); });
  const tx = cap.ties.find((t) => t.bars && t.dir !== 'y') ?? cap.ties.find((t) => t.bars);
  if (tx?.bars) {
    const pl = (cob + tx.bars.phi / 2000) * k, g = ganchoNoventa(tx.bars.phi) * k;
    out.push({ t: 'pl', c: 'ARMADURA', pts: [[cob * k, yc0 + pl + g], [cob * k, yc0 + pl], [W - cob * k, yc0 + pl], [W - cob * k, yc0 + pl + g]] });
  }
  if (cap.stirrups) {
    const n = Math.min(Math.floor((cap.lx - 2 * cob) / cap.stirrups.s) + 1, 40);
    for (let i = 0; i < n; i++) { const xx = (cob + ((cap.lx - 2 * cob) * i) / Math.max(1, n - 1)) * k; out.push({ t: 'pl', c: 'ARMADURA', pts: [[xx, yc0 + cob * k], [xx, yc0 + h - cob * k]] }); }
  }
  out.push(...cotaHorizontal(yc0 - 18, xs.map((v) => ox + v * k), xs.slice(1).map((v, i) => cotaCm(v - xs[i]))));
  out.push(...cotaVertical(W + 6, [yc0, yc0 + h], [`hb=${cotaCm(cap.h)}`]));
  out.push(txt('COTA', W + 10, yc0 + h / 2, 1.8, 'ha=0', 'e', 'meio'));
  out.push(txt('TEXTO', 0, yc0 - 26, 2, `Fundo do bloco: cota ${nf(r.cota)} m`, 'e', 'topo'));
  out.push(txt('TEXTO', 0, yc0 - 30, 2, `CA: ${nf(r.cota)} m (cota de arrasamento das estacas)${est?.L ? ` · estacas ø${cmInt(D)} L=${nf(est.L, 1)} m` : ''}`, 'e', 'topo'));
  return out;
}

/** Legenda dos blocos (1:25): contorno cotado com as estacas. */
export function desenharLegendaBloco(c: Ctx, els: ResultadoFundacao[]): Prim[] {
  const r = els[0], cap = blocoDe(r)!, est = estacasDe(r), k = 1000 / c.escalaLeg, coords = est?.coords ?? [], D = est?.D ?? 0.4;
  const out: Prim[] = [];
  out.push(txt('TEXTO', 0, 0, 2.4, `LEGENDA DOS BLOCOS ESC 1:${c.escalaLeg}`, 'e', 'topo'));
  const ls = titulo(els.map((e) => e.nome));
  ls.forEach((l, i) => out.push(txt('TEXTO', 0, -5 - 4.5 * i, 3.2, i === 0 ? `(${coords.length}×ø${cmInt(D)}) ${l}` : l, 'e', 'topo')));
  const W = cap.lx * k, B = cap.ly * k, yTop = -5 - 4.5 * ls.length - 12, yBot = yTop - B, ox = W / 2, oy = yBot + B / 2;
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[0, yBot], [W, yBot], [W, yTop], [0, yTop]], fechada: true });
  for (const [ex, ey] of coords) {
    const px = ox + ex * k, py = oy + ey * k, rr = (D / 2) * k, d = rr * 0.7;
    out.push({ t: 'circ', c: 'CONCRETO', centro: [px, py], r: rr }, { t: 'pl', c: 'FORMA-FINA', pts: [[px - d, py - d], [px + d, py + d]] }, { t: 'pl', c: 'FORMA-FINA', pts: [[px - d, py + d], [px + d, py - d]] });
  }
  const xs = [-cap.lx / 2, ...[...new Set(coords.map((q) => +q[0].toFixed(3)))].sort((a, z) => a - z), cap.lx / 2];
  const ys = [-cap.ly / 2, ...[...new Set(coords.map((q) => +q[1].toFixed(3)))].sort((a, z) => a - z), cap.ly / 2];
  out.push(...cotaHorizontal(yTop + 4, xs.map((v) => ox + v * k), xs.slice(1).map((v, i) => cotaCm(v - xs[i]))));
  out.push(...cotaVertical(-4, ys.map((v) => oy + v * k), ys.slice(1).map((v, i) => cotaCm(v - ys[i]))));
  return out;
}

// ---------------- tubulão ----------------

/** Tubulão (ou grupo de iguais): planta (fuste e base) e corte com as marcas C.T, C.A e C.T.B. */
export function desenharTubulao(c: Ctx, els: ResultadoFundacao[], cotaTerreno: number, cutoff: number): Prim[] {
  const r = els[0], t = tubulaoDe(r)!, rep = els.length, k = 1000 / c.escala;
  const out: Prim[] = [];
  let y = cabecalho(out, els.map((e) => e.nome), `Tubulão a céu aberto · fuste ø${cmInt(t.Df)} · base ø${cmInt(t.Db)} cm${rep > 1 ? ` · ${rep} iguais` : ''}`);
  out.push(txt('TEXTO', 0, y, 2.4, `PLANTA ESC 1:${c.escala}`, 'e', 'topo'));
  const Rb = (t.Db / 2) * k, cx = Rb, cy = y - 14 - Rb;
  out.push({ t: 'circ', c: 'CONCRETO', centro: [cx, cy], r: Rb }, { t: 'circ', c: 'CONCRETO', centro: [cx, cy], r: (t.Df / 2) * k });
  out.push({ t: 'pl', c: 'PILAR', pts: [[cx - (r.ap * k) / 2, cy - (r.bp * k) / 2], [cx + (r.ap * k) / 2, cy - (r.bp * k) / 2], [cx + (r.ap * k) / 2, cy + (r.bp * k) / 2], [cx - (r.ap * k) / 2, cy + (r.bp * k) / 2]], fechada: true });
  out.push(...cotaHorizontal(cy + Rb + 4, [0, 2 * Rb], [`ø${cotaCm(t.Db)}`]), ...cotaHorizontal(cy - Rb - 5, [cx - (t.Df / 2) * k, cx + (t.Df / 2) * k], [`ø${cotaCm(t.Df)}`]));
  y = cy - Rb - 20;
  out.push(txt('TEXTO', 0, y, 2.4, `CORTE ESC 1:${c.escala}`, 'e', 'topo'));
  const L = Math.max(t.depth - cutoff, t.H), Lf = Math.max(0, L - t.Hcone - t.rodape);
  const top = y - 14, rf = (t.Df / 2) * k;
  const yF = top - Lf * k, yC = yF - t.Hcone * k, yB = yC - t.rodape * k;
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[cx - rf, top], [cx - rf, yF], [cx - Rb, yC], [cx - Rb, yB], [cx + Rb, yB], [cx + Rb, yC], [cx + rf, yF], [cx + rf, top]] });
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[cx - rf, top], [cx + rf, top]] });
  out.push({ t: 'pl', c: 'PILAR', pts: [[cx - (r.ap * k) / 2, top], [cx - (r.ap * k) / 2, top + 10]] }, { t: 'pl', c: 'PILAR', pts: [[cx + (r.ap * k) / 2, top], [cx + (r.ap * k) / 2, top + 10]] });
  out.push(...cotaHorizontal(yB - 5, [cx - Rb, cx + Rb], [`ø${cotaCm(t.Db)}`]), ...cotaHorizontal(top + 14, [cx - rf, cx + rf], [`ø${cotaCm(t.Df)}`]));
  out.push(...cotaVertical(cx + Rb + 6, [yB, yC, yF, top], [`${cotaCm(t.rodape)}`, `Hc=${cotaCm(t.Hcone)}`, `fuste ${cotaCm(Lf)}`]));
  // marcas de nível: C.T (terreno), C.A (arrasamento: topo do tubulão) e C.T.B (topo da base)
  const xm = -6 - 10;
  if (cutoff > 0.01) out.push({ t: 'pl', c: 'COTA', pts: [[xm, top + (cutoff * k)], [cx - rf, top + (cutoff * k)]] }, ...nivel(xm, top + cutoff * k, `C.T ${nf(cotaTerreno)}`), ...nivel(xm, top, `C.A ${nf(cotaTerreno - cutoff)}`));
  else out.push(...nivel(xm, top, `C.T = C.A ${nf(cotaTerreno)}`));
  out.push(...nivel(xm, yF, `C.T.B ${nf(r.cota + t.H)}`));
  out.push(txt('TEXTO', 0, yB - 12, 2, 'C.T: cota do terreno · C.A: arrasamento · C.T.B: topo da base [a confirmar]', 'e', 'topo'));
  out.push(txt('TEXTO', 0, yB - 16, 2, 'Tubulão a céu aberto não armado (concreto simples); esperas do pilar nas pranchas de pilares.', 'e', 'topo'));
  return out;
}

// ---------------- viga de fundação ----------------

/** Viga de fundação (ou grupo de iguais): elevação (barras, estribos, ancoragem), seção A-A e rótulos das posições. */
export function desenharViga(c: Ctx, vs: ResultadoVigaFundacao[], escala: number): Prim[] {
  const v = vs[0], rep = vs.length, k = 1000 / escala, kS = 1000 / c.escalaSecao, cob = cobrimentoFundacao(c.b), aco = acoDe(c.b, 'fundacao').aco;
  const vm = c.b.fundacao?.vigas?.find((x) => x.id === v.id), g = vm ? geometriaVF(c.b, vm) : null;
  const fi = v.faces?.ini ?? (g?.ini ? meiaFace(c.b, g.ini.pilar, g.u) : 0.1), ff = v.faces?.fim ?? (g?.fim ? meiaFace(c.b, g.fim.pilar, [-g.u[0], -g.u[1]]) : 0.1);
  const a = v.armadura, h = v.hAdot, bw = v.bAdot, out: Prim[] = [];
  let y = cabecalho(out, vs.map((e) => e.nome), `${'corrida' in v ? 'Cinta da sapata corrida' : v.tipo === 'equilibrio' ? 'Viga de equilíbrio' : 'Viga de travamento'} ${cmInt(bw)}×${cmInt(h)} cm · ${v.ini} — ${v.fim} · L=${cmInt(v.L)} cm${rep > 1 ? ` · ${rep} iguais` : ''}`);
  out.push(txt('TEXTO', 0, y, 2.4, `ELEVAÇÃO ESC 1:${escala}`, 'e', 'topo'));
  const x0 = Math.max(a.ancoragem.ini - fi, 0.05) * k + 6, yTop = y - 26, yBot = yTop - h * k;
  const xi = x0, xf = x0 + v.L * k, xFi = xi + fi * k, xFf = xf - ff * k;
  // pilares das pontas e viga
  for (const [xc, mf] of [[xi, fi], [xf, ff]] as const) {
    out.push({ t: 'pl', c: 'PILAR', pts: [[xc - mf * k, yTop + 8], [xc - mf * k, yBot - 8]] }, { t: 'pl', c: 'PILAR', pts: [[xc + mf * k, yTop + 8], [xc + mf * k, yBot - 8]] }, { t: 'pl', c: 'FORMA-FINA', pts: [[xc, yTop + 10], [xc, yBot - 10]] });
  }
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[xFi, yTop], [xFf, yTop], [xFf, yBot], [xFi, yBot]], fechada: true });
  const rotulos: string[] = [];
  const barra = (bs: { phi: number; n: number } | null, tipo: 'sup' | 'inf', yy: number, texto: string) => {
    if (!bs) return;
    // cortes da armadura principal (R8b): n corridas e os grupos escalonados, cada um numa posição (linhas empilhadas para dentro da viga)
    const ct = a.cortes?.[tipo], nPas = ct?.grupos.length ? ct.passantes : bs.n;
    const Lreta = tipo === 'sup' ? v.L - fi - ff + a.ancoragem.ini + a.ancoragem.fim : v.L - fi - ff + 2 * 0.1;
    const C = cBarra(Lreta, bs.phi, 2), pos = c.posDe(`V${tipo}|${cmInt(Lreta)}`, aco, bs.phi, C, rep * nPas);
    const xa = tipo === 'sup' ? xFi - a.ancoragem.ini * k : xFi - 0.1 * k, xz = tipo === 'sup' ? xFf + a.ancoragem.fim * k : xFf + 0.1 * k, gk = ganchoNoventa(bs.phi) * k * (tipo === 'sup' ? 1 : 1);
    const dir = tipo === 'sup' ? -1 : 1;
    out.push({ t: 'pl', c: 'ARMADURA', pts: [[xa, yy + dir * gk], [xa, yy], [xz, yy], [xz, yy + dir * gk]] });
    out.push(txt('TEXTO', (xFi + xFf) / 2, yy + (tipo === 'sup' ? 1.2 : -1.2), 2, `${rotulo(rep, nPas, pos, bs.phi, '', C)} ${texto}`, 'c', tipo === 'sup' ? 'base' : 'topo'));
    rotulos.push(`${tipo === 'sup' ? 'Superior' : 'Inferior'}: ${rotulo(rep, nPas, pos, bs.phi, '', C)}`);
    if (ct?.grupos.length) ct.grupos.forEach((gr, gi) => {
      const yg = yy + (tipo === 'sup' ? -1 : 1) * (gi + 1) * 2.4, Cg = cBarra(gr.comprimento, bs.phi, 0), pg = c.posDe(`V${tipo}c|${cmInt(gr.comprimento)}`, aco, bs.phi, Cg, rep * gr.n);
      out.push({ t: 'pl', c: 'ARMADURA', pts: [[xi + gr.s0 * k, yg], [xi + gr.s1 * k, yg]] });
      out.push(txt('TEXTO', xi + ((gr.s0 + gr.s1) / 2) * k, yg + (tipo === 'sup' ? 1 : -1) * 0.1, 1.8, rotulo(rep, gr.n, pg, bs.phi, '', Cg), 'c', tipo === 'sup' ? 'base' : 'topo'));
      rotulos.push(`${tipo === 'sup' ? 'Superior' : 'Inferior'} (corte): ${rotulo(rep, gr.n, pg, bs.phi, '', Cg)}`);
    });
  };
  barra(a.sup.barras, 'sup', yTop - cob * k, '(sup.)');
  barra(a.inf.barras, 'inf', yBot + cob * k, '(inf.)');
  if (a.pele?.barras) {
    const bs = a.pele.barras, Lp = v.L - fi - ff - 2 * cob, C = cBarra(Lp, bs.phi, 0), pos = c.posDe(`Vpele|${cmInt(Lp)}`, aco, bs.phi, C, rep * 2 * bs.n);
    out.push({ t: 'pl', c: 'ARMADURA', pts: [[xFi + cob * k, (yTop + yBot) / 2], [xFf - cob * k, (yTop + yBot) / 2]] });
    rotulos.push(`Pele: ${rotulo(rep, 2 * bs.n, pos, bs.phi, '', C)}`);
  }
  let nEst = 0, posE = '';
  if (a.estribo) {
    const e = a.estribo, Lest = c.b.fundacao && vm ? v.L - fi - ff : v.L, n = Math.ceil(Lest / e.s) + 1, per = 2 * (bw - 2 * cob + h - 2 * cob) + 2 * ganchoNoventa(e.phi);
    nEst = n; posE = c.posDe(`Vest|${cmInt(bw)}|${cmInt(h)}`, aco, e.phi, cmInt(per), rep * n);
    const passo = Math.max(e.s * k, 0.8), nd = Math.min(n, Math.floor((v.L - fi - ff) * k / passo) + 1);
    for (let i = 0; i < nd; i++) { const xx = xFi + cob * k + ((xFf - xFi - 2 * cob * k) * i) / Math.max(1, nd - 1); out.push({ t: 'pl', c: 'ARMADURA', pts: [[xx, yTop - cob * k], [xx, yBot + cob * k]] }); }
    rotulos.push(`Estribos: ${rotulo(rep, n, posE, e.phi, `c/${cmInt(e.s)}`, cmInt(per))}`);
  }
  void nEst;
  out.push(...cotaHorizontal(yTop + 14, [xi, xf], [cotaCm(v.L)]));
  out.push(...cotaHorizontal(yTop + 8, [xFi - a.ancoragem.ini * k, xFi, xFf, xFf + a.ancoragem.fim * k], [cotaCm(a.ancoragem.ini), cotaCm(v.L - fi - ff), cotaCm(a.ancoragem.fim)]));
  out.push(...cotaVertical(xf + mfMax(ff, k) + 6, [yBot, yTop], [cotaCm(h)]));
  // seção A-A
  const W = bw * kS, H = h * kS, c0 = cob * kS, xs = 0, ys = yBot - 40 - H;
  out.push(txt('TEXTO', 0, yBot - 24, 2.4, `SEÇÃO A-A ESC 1:${c.escalaSecao}`, 'e', 'topo'));
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[xs, ys], [xs + W, ys], [xs + W, ys + H], [xs, ys + H]], fechada: true });
  out.push({ t: 'pl', c: 'ARMADURA', pts: [[xs + c0, ys + c0], [xs + W - c0, ys + c0], [xs + W - c0, ys + H - c0], [xs + c0, ys + H - c0]], fechada: true });
  const camadas = (bs: { phi: number; n: number; layers: number } | null, yBase: number, sinal: 1 | -1) => {
    if (!bs) return;
    const por = Math.ceil(bs.n / Math.max(1, bs.layers)); let resto = bs.n;
    for (let l = 0; l < bs.layers && resto > 0; l++) {
      const nl = Math.min(por, resto); resto -= nl;
      for (let i = 0; i < nl; i++) out.push(ponto('ARMADURA', xs + c0 + (bs.phi / 2000) * kS + ((W - 2 * c0 - (bs.phi / 1000) * kS) * i) / Math.max(1, nl - 1), yBase + sinal * (l * 2 * (bs.phi / 1000) * kS + (bs.phi / 2000) * kS), Math.max((bs.phi / 2000) * kS, 0.5)));
    }
  };
  camadas(a.sup.barras, ys + H - c0 - (a.estribo?.phi ?? 5) / 1000 * kS, -1);
  camadas(a.inf.barras, ys + c0 + (a.estribo?.phi ?? 5) / 1000 * kS, 1);
  if (a.pele?.barras) for (const lado of [0, 1]) for (let i = 0; i < a.pele.barras.n; i++) out.push(ponto('ARMADURA', xs + c0 + lado * (W - 2 * c0), ys + H / 2 + (i - (a.pele.barras.n - 1) / 2) * 3, 0.5));
  out.push(...cotaHorizontal(ys - 5, [xs, xs + W], [cotaCm(bw)]), ...cotaVertical(xs + W + 5, [ys, ys + H], [cotaCm(h)]));
  rotulos.forEach((t, i) => out.push(txt('TEXTO', W + 22, ys + H - 4 - 3.4 * i, 2.2, t, 'e', 'topo')));
  out.push(txt('TEXTO', W + 22, ys + H - 4 - 3.4 * rotulos.length - 3, 2, `Ancoragem das barras superiores: ${cmInt(a.ancoragem.ini)} cm / ${cmInt(a.ancoragem.fim)} cm além das faces (lb = ${cmInt(a.lb)} cm${a.ancoragem.editada.ini || a.ancoragem.editada.fim ? '; editada' : ''})`, 'e', 'topo'));
  return out;
}
const mfMax = (mf: number, k: number) => mf * k;

// ---------------- arranque ----------------

export interface GrupoArranque { pilares: Pilar[]; det: DetalhePilar; res?: ResultadoPilar; zBase: number }

/** Arranque (ou grupo de pilares iguais): elevação com as esperas, traspasse e estribos; seção do pilar. Sem posições (aço nas pranchas de pilares). */
export function desenharArranque(c: Ctx, g: GrupoArranque): Prim[] {
  const p = g.pilares[0], det = g.det, l0 = det.lances[0], rep = g.pilares.length, k = 1000 / c.escala, kS = 1000 / c.escalaSecao;
  const s = secaoNoLance(p, l0.pavimento), [w, hh] = dimsSecao(s), circ = s.tipo === 'circ';
  const out: Prim[] = [];
  let y = cabecalho(out, g.pilares.map((x) => x.nome), `Arranque · ${l0.secao.replace('×', ' × ')} cm${rep > 1 ? ` · ${rep} pilares` : ''}`);
  out.push(txt('TEXTO', 0, y, 2.4, `NÍVEL ${nf(l0.z1)} — ${l0.nome} · ESC 1:${c.escala}`, 'e', 'topo'));
  const lb = det.lb[l0.pavimento] ?? 0.5, zTop = l0.z1 + lb, hTot = Math.max(0.3, zTop - g.zBase);
  const yb = y - 10 - hTot * k, W = w * k, cob = 0.03;
  const Y = (z: number) => yb + (z - g.zBase) * k;
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[0, Y(g.zBase)], [0, Y(l0.z1)]] }, { t: 'pl', c: 'CONCRETO', pts: [[W, Y(g.zBase)], [W, Y(l0.z1)]] });
  out.push({ t: 'pl', c: 'FORMA-FINA', pts: [[0, Y(l0.z1)], [0, Y(zTop)]] }, { t: 'pl', c: 'FORMA-FINA', pts: [[W, Y(l0.z1)], [W, Y(zTop)]] });
  const bar = det.barras.find((x) => x.tipo === 'longitudinal' && x.lances.includes(l0.pavimento));
  if (bar) {
    const gk = ganchoNoventa(bar.phi) * k, xs = [cob * k + 1, W - cob * k - 1];
    xs.forEach((xx, i) => out.push({ t: 'pl', c: 'ARMADURA', pts: [i === 0 ? [xx + gk, Y(g.zBase) + cob * k] : [xx - gk, Y(g.zBase) + cob * k], [xx, Y(g.zBase) + cob * k], [xx, Y(zTop)]] }));
    out.push({ t: 'txt', c: 'TEXTO', p: [W + 4, (Y(g.zBase) + Y(zTop)) / 2], h: 2, s: `${qtd(rep, bar.n)} φ${nf(bar.phi, 1).replace('φ', '')} C=VAR`, ang: 90, ah: 'c', av: 'base' });
    out.push(txt('COTA', W / 2, Y(g.zBase) - 3.5, 1.6, String(cmInt(ganchoNoventa(bar.phi))), 'c', 'topo'));
  }
  out.push(...cotaVertical(-6, [Y(l0.z1), Y(zTop)], [`${cotaCm(lb)}`]));
  out.push(...cotaVertical(-12, [Y(g.zBase), Y(l0.z1)], [`${cotaCm(l0.z1 - g.zBase)}`]));
  out.push({ t: 'pl', c: 'COTA', pts: [[-16, Y(l0.z1)], [W + 3, Y(l0.z1)]] }, ...nivel(W + 8, Y(l0.z1), `${nf(l0.z1)}`));
  out.push(txt('TEXTO', 0, Y(g.zBase) - 8, 2, `Estribos φ${nf(l0.estribos.phi, 1).replace(',0', ',0')} c/${cmInt(l0.estribos.s)} · traspasse ${cmInt(lb)} cm [a confirmar]`, 'e', 'topo'));
  // seção
  const xs = Math.max(W + 40, 78), H = hh * kS, Ws = w * kS, ys = y - 10 - H, c0 = cob * kS;
  out.push(txt('TEXTO', xs, y, 2.4, `SEÇÃO ESC 1:${c.escalaSecao}`, 'e', 'topo'));
  if (circ) {
    const pts = (r: number) => Array.from({ length: 36 }, (_, i) => [xs + Ws / 2 + r * Math.cos((i * Math.PI) / 18), ys + H / 2 + r * Math.sin((i * Math.PI) / 18)] as [number, number]);
    out.push({ t: 'pl', c: 'CONCRETO', pts: pts(Ws / 2), fechada: true }, { t: 'pl', c: 'ARMADURA', pts: pts(Ws / 2 - c0), fechada: true });
  } else {
    out.push({ t: 'pl', c: 'CONCRETO', pts: [[xs, ys], [xs + Ws, ys], [xs + Ws, ys + H], [xs, ys + H]], fechada: true });
    out.push({ t: 'pl', c: 'ARMADURA', pts: [[xs + c0, ys + c0], [xs + Ws - c0, ys + c0], [xs + Ws - c0, ys + H - c0], [xs + c0, ys + H - c0]], fechada: true });
  }
  if (g.res?.arranjo) {
    const ar = g.res.arranjo, a = cob + l0.estribos.phi / 1000 + ar.phi / 2000;
    for (const [u, v] of barrasSecao(w, hh, a, circ, ar)) out.push(ponto('ARMADURA', xs + u * kS, ys + v * kS, Math.max((ar.phi / 2000) * kS, 0.5)));
  }
  out.push(...cotaHorizontal(ys - 5, [xs, xs + Ws], [cotaCm(w)]), ...cotaVertical(xs + Ws + 5, [ys, ys + H], [cotaCm(hh)]));
  return out;
}
