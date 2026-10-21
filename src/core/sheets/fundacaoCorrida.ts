// Pranchas das sapatas corridas (FU7a), dentro do tipo `fundacao`: planta de locação das sapatas corridas (contorno da base,
// elemento apoiado, pilares tracejados, eixos e cotas, quadro com largura, alturas, armaduras e tensões) e detalhamento
// por sapata ou grupo de iguais ("SC1=SC2"): planta de um trecho típico e corte transversal com as barras, no padrão das
// folhas de sapata (planta e corte 1:50, cotas em cinza, rótulos "n Nk φ c/s C=xxx" com o multiplicador de iguais). Sob
// pilares, o corte mostra também a armadura longitudinal da viga (inferior, superior, pele e estribos). Sem folha de
// referência para a sapata corrida: segue o padrão da sapata isolada [a confirmar].
import { alfa0t, lbBasico } from '../building/detalhamento';
import type { Dimensionamento } from '../building/dimensionamento';
import { acoDe, cobrimentoFundacao, concretoDe, fckDe } from '../building/materiais';
import { opcoesEmUso, perfilDe } from '../building/opcoes';
import { ladosDaBase, type ResultadoCorrida } from '../building/sapataCorrida';
import { centroPilar, contornoPilar, lancesDoPilar, secaoNoLance, type BuildingModel, type Pilar } from '../building/types';
import { cfgArmacao, cmInt, cotaCm, cotaHorizontal, cotaVertical, montarFolha, nf, notas, phiTxt, plantaNaFolha, ponto, qtd, type BlocoTabela } from './armacao';
import type { Ctx } from './fundacaoDetalhe';
import { caixa, eixosECotas, txt, type P, type Prancha, type Prim } from './prancha';
import type { OpcoesArmacao } from './armacaoVigas';
import type { LinhaQuantitativo } from './fundacao';

const secaoBase = (b: BuildingModel, p: Pilar) => { const l = lancesDoPilar(b, p)[0]; return l ? secaoNoLance(p, l.id) : p.secao; };
const c1 = (v: number) => Math.round(v * 100);

/** Grupos de sapatas corridas iguais (mesma geometria, comprimento, armaduras e modo). */
export interface GrupoCorrida { els: ResultadoCorrida[]; chave: string }
export function agruparCorridas(rs: ResultadoCorrida[]): GrupoCorrida[] {
  const m = new Map<string, GrupoCorrida>();
  for (const r of rs) {
    const t = r.transversal, lg = r.longitudinal?.armadura;
    const bs = (x?: { phi: number; n: number } | null) => (x ? [x.phi, x.n] : null);
    const chave = JSON.stringify([r.modo, r.aba, c1(r.B), c1(r.bw), c1(r.h), c1(r.h0), c1(r.L), t?.barras && [t.barras.phi, c1(t.barras.s)], t?.distribuicao.barras && [t.distribuicao.barras.phi, c1(t.distribuicao.barras.s)],
      lg && [bs(lg.inf.barras), bs(lg.sup.barras), bs(lg.pele), lg.estribo && [lg.estribo.phi, c1(lg.estribo.s)]]]);
    const g = m.get(chave);
    if (g) g.els.push(r); else m.set(chave, { els: [r], chave });
  }
  return [...m.values()].map((g) => ({ ...g, els: g.els.sort((a, z) => a.nome.localeCompare(z.nome, 'pt-BR', { numeric: true })) })).sort((a, z) => a.els[0].nome.localeCompare(z.els[0].nome, 'pt-BR', { numeric: true }));
}

const titulo = (nomes: string[]) => { const ls: string[] = []; for (let i = 0; i < nomes.length; i += 6) ls.push(nomes.slice(i, i + 6).join('=')); return ls.map((l, i) => (i < ls.length - 1 ? `${l}=` : l)); };

/** Barras por peça longitudinal: comprimento total dividido em peças de até `Lmax` com traspasse `l0`. */
function pecas(total: number, Lmax: number, l0: number): { n: number; C: number } {
  if (total <= Lmax + 1e-9) return { n: 1, C: total };
  let n = Math.ceil((total - l0) / (Lmax - l0) - 1e-9);
  for (; n < 50; n++) if ((total + (n - 1) * l0) / n <= Lmax + 1e-9) break;
  return { n, C: (total + (n - 1) * l0) / n };
}

/**
 * Sapata corrida (ou grupo de iguais): planta de um trecho típico e corte transversal com as barras, cotas e rótulos.
 * Registra as posições em `c.posDe` com as quantidades do comprimento total (e o multiplicador de iguais).
 */
export function desenharCorrida(c: Ctx, els: ResultadoCorrida[]): Prim[] {
  const r = els[0], rep = els.length, k = 1000 / c.escala, cob = cobrimentoFundacao(c.b), aco = acoDe(c.b, 'fundacao'), conc = concretoDe(c.b, 'fundacao');
  const op = opcoesEmUso(c.b.opcoes, perfilDe(c.b));
  const out: Prim[] = [];
  const nomes = titulo(els.map((e) => e.nome));
  nomes.forEach((l, i) => out.push(txt('TEXTO', 0, -6 * i, 5, l, 'e', 'topo')));
  let y = -6 * nomes.length - 1;
  out.push(txt('TEXTO', 0, y, 2.2, `Sapata corrida ${cmInt(r.B)}×${cmInt(r.h)}${r.h0 < r.h ? `/${cmInt(r.h0)}` : ''} cm · L = ${nf(r.L)} m · ${r.modo === 'pilares' ? 'sob pilares (viga sobre base elástica)' : 'sob parede'}${rep > 1 ? ` · ${rep} iguais` : ''}`, 'e', 'topo'));
  y -= 7;
  const B = r.B, bw = r.bw, L = r.L, W = B * k, lados = ladosDaBase(r.aba, B, bw);
  const tr = r.transversal, bt = tr?.barras, bd = tr?.distribuicao.barras;
  const Lmax = op.barraMaxima, fyd = aco.fyd, ca60 = aco.aco === 'CA-60';
  const textos: string[] = [];
  const lap = (phi: number) => alfa0t(1) * lbBasico(phi, conc, fyd, true, ca60);
  // ---- planta de um trecho ----
  const Lt = Math.min(L, Math.max(1.5, 3 * (bt?.s ?? 0.15) * 4)), Wt = Lt * k;
  out.push(txt('TEXTO', 0, y, 2.4, `PLANTA (TRECHO) ESC 1:${c.escala}`, 'e', 'topo'));
  const yTop = y - 18 - W, x0 = 0;
  // eixos: x ao longo do comprimento (m→mm), y transversal (esquerda do sentido = para cima)
  const yb = yTop, yt = yTop + W;
  out.push({ t: 'pl', c: 'CONCRETO', pts: [[x0, yb], [x0 + Wt, yb], [x0 + Wt, yt], [x0, yt]], fechada: true });
  const ya = yb + lados.dir * k;
  out.push({ t: 'pl', c: 'PILAR', pts: [[x0, ya - (bw * k) / 2], [x0 + Wt, ya - (bw * k) / 2], [x0 + Wt, ya + (bw * k) / 2], [x0, ya + (bw * k) / 2]], fechada: true });
  if (L > Lt + 1e-9) for (const x of [x0 + Wt]) out.push({ t: 'pl', c: 'CONCRETO', pts: [[x - 1.2, yb - 2], [x + 1.2, yb + 3], [x - 1.2, yt - 3], [x + 1.2, yt + 2]] });
  const mostra = (Lt: number, s: number, ini: number) => { const xs: number[] = []; for (let x = ini; x <= Lt + 1e-9 && xs.length < 5; x += s) xs.push(x); return xs; };
  if (bt && tr) {
    for (const xm of mostra(Lt - cob, bt.s, cob)) out.push({ t: 'pl', c: 'ARMADURA', pts: [[x0 + xm * k, yb + cob * k], [x0 + xm * k, yt - cob * k]] });
    const n = Math.floor((L - 2 * cob) / bt.s + 1e-9) + 1, C = cmInt(B - 2 * cob);
    const pos = c.posDe(`CT|${cmInt(B)}|${bt.phi}|${cmInt(bt.s)}`, aco.aco, bt.phi, C, rep * n);
    out.push(...cotaHorizontal(yt + 5, [x0 + cob * k, x0 + (cob + bt.s) * k], [`${cmInt(bt.s)}`], 'COTA', 1.6));
    textos.push(`${qtd(rep, n)} ${pos} ${phiTxt(bt.phi)} c/${cmInt(bt.s)} C=${C}  (transversal, inferior)`);
  }
  if (bd && tr) {
    const nAc = Math.floor((B - 2 * cob) / bd.s + 1e-9) + 1, total = L - 2 * cob, pc = pecas(total, Lmax, lap(bd.phi));
    for (let i = 0; i < Math.min(nAc, 4); i++) { const yy = yb + (cob + i * bd.s) * k; out.push({ t: 'pl', c: 'ARMADURA', pts: [[x0 + cob * k, yy], [x0 + Wt, yy]] }); }
    const pos = c.posDe(`CD|${cmInt(B)}|${cmInt(L)}|${bd.phi}|${cmInt(bd.s)}`, aco.aco, bd.phi, cmInt(pc.C), rep * nAc * pc.n);
    out.push(...cotaVertical(x0 - 5, [yb + cob * k, yb + (cob + bd.s) * k], [`${cmInt(bd.s)}`], 'COTA', 1.6));
    textos.push(`${qtd(rep, nAc * pc.n)} ${pos} ${phiTxt(bd.phi)} c/${cmInt(bd.s)} C=${cmInt(pc.C)}  (distribuição, longitudinal)`);
  }
  out.push(...cotaVertical(x0 - 11, [yb, ya - (bw * k) / 2, ya + (bw * k) / 2, yt], [cotaCm(lados.dir - bw / 2), cotaCm(bw), cotaCm(lados.esq - bw / 2)], 'COTA', 1.8));
  out.push({ t: 'pl', c: 'EIXO', pts: [[x0 - 3, ya], [x0 + Wt + 3, ya]] });
  // ---- armadura longitudinal sob pilares (viga) ----
  const lg = r.longitudinal?.armadura;
  const barrasLong: { rot: string; n: number; phi: number; face: 'inf' | 'sup' | 'pele' }[] = [];
  if (lg) {
    for (const [face, bs] of [['inf', lg.inf.barras], ['sup', lg.sup.barras], ['pele', lg.pele]] as const) {
      if (!bs) continue;
      const total = L - 2 * cob, pc = pecas(total, Lmax, lap(bs.phi));
      const nome = face === 'inf' ? 'inferior' : face === 'sup' ? 'superior' : 'pele (cada face)';
      const nTot = face === 'pele' ? 2 * bs.n : bs.n;
      const pos = c.posDe(`CL|${face}|${cmInt(L)}|${bs.phi}|${bs.n}`, aco.aco, bs.phi, cmInt(pc.C), rep * nTot * pc.n);
      textos.push(`${qtd(rep, nTot * pc.n)} ${pos} ${phiTxt(bs.phi)} C=${cmInt(pc.C)}  (longitudinal ${nome})`);
      barrasLong.push({ rot: pos, n: bs.n, phi: bs.phi, face });
    }
    if (lg.estribo) {
      const e = lg.estribo, perim = 2 * (bw - 2 * cob + r.h - 2 * cob) + 0.2, n = Math.ceil(L / e.s) + 1;
      const pos = c.posDe(`CE|${cmInt(bw)}|${cmInt(r.h)}|${e.phi}|${cmInt(e.s)}`, aco.aco, e.phi, cmInt(perim), rep * n);
      textos.push(`${qtd(rep, n)} ${pos} ${phiTxt(e.phi)} c/${cmInt(e.s)} C=${cmInt(perim)}  (estribos da nervura)`);
    }
  }
  textos.forEach((t, i) => out.push(txt('TEXTO', 0, yb - 8 - 3.4 * i, 2.2, t, 'e', 'topo')));
  y = yb - 8 - 3.4 * Math.max(1, textos.length) - 8;
  // ---- corte transversal ----
  out.push(txt('TEXTO', 0, y, 2.4, `CORTE TRANSVERSAL ESC 1:${c.escala}`, 'e', 'topo'));
  const h = r.h * k, h0 = r.h0 * k, yc0 = y - 12 - h - 12;
  // esquerda do sentido = esquerda do desenho: a face esquerda da base fica em x = 0
  const xApL = (lados.esq === lados.dir ? (B - bw) / 2 : r.aba === 'esq' ? 0 : B - bw) * k; // x da face esquerda do apoio
  const xApR = xApL + bw * k;
  const tem = { esq: xApL > 1e-6, dir: xApR < W - 1e-6 };
  const pts: P[] = [[0, yc0], [W, yc0]];
  if (r.modo === 'pilares') {
    // T invertido: aba plana de espessura h0 e nervura
    pts.push([W, yc0 + h0]);
    if (tem.dir) pts.push([xApR, yc0 + h0]);
    pts.push([xApR, yc0 + h], [xApL, yc0 + h]);
    if (tem.esq) pts.push([xApL, yc0 + h0]);
    pts.push([0, yc0 + h0]);
  } else {
    if (tem.dir) pts.push([W, yc0 + h0], [xApR, yc0 + h]); else pts.push([W, yc0 + h]);
    pts.push([xApL, yc0 + h]);
    if (tem.esq) pts.push([0, yc0 + h0]);
  }
  out.push({ t: 'pl', c: 'CONCRETO', pts, fechada: true });
  out.push({ t: 'pl', c: 'PILAR', pts: [[xApL, yc0 + h], [xApL, yc0 + h + 10]] }, { t: 'pl', c: 'PILAR', pts: [[xApR, yc0 + h], [xApR, yc0 + h + 10]] });
  if (bt) {
    const yy = yc0 + (cob + bt.phi / 2000) * k;
    out.push({ t: 'pl', c: 'ARMADURA', pts: [[cob * k, yy], [W - cob * k, yy]] });
    if (bd) {
      const nAc = Math.floor((B - 2 * cob) / bd.s + 1e-9) + 1, rr = Math.max((bd.phi / 2000) * k, 0.45), y2 = yy + (bt.phi / 2000 + bd.phi / 2000) * k;
      for (let i = 0; i < nAc; i++) out.push(ponto('ARMADURA', (cob + i * bd.s) * k, y2, rr));
    }
  }
  if (lg && r.longitudinal) {
    // viga: barras inferiores na aba, superiores sob o topo da nervura e estribo
    const inf = lg.inf.barras, sup = lg.sup.barras, rr = (phi: number) => Math.max((phi / 2000) * k, 0.45);
    if (lg.estribo) {
      out.push({ t: 'pl', c: 'ARMADURA', pts: [[xApL + cob * k, yc0 + cob * k], [xApR - cob * k, yc0 + cob * k], [xApR - cob * k, yc0 + h - cob * k], [xApL + cob * k, yc0 + h - cob * k]], fechada: true });
    }
    if (inf) for (let i = 0; i < inf.n; i++) out.push(ponto('ARMADURA', (cob + 0.01 + (inf.n > 1 ? (i * (B - 2 * (cob + 0.01))) / (inf.n - 1) : (B - 2 * cob) / 2)) * k, yc0 + (cob + 0.01 + inf.phi / 2000 + (bt ? bt.phi / 1000 + (bd ? bd.phi / 1000 : 0) : 0)) * k, rr(inf.phi)));
    if (sup) for (let i = 0; i < sup.n; i++) out.push(ponto('ARMADURA', xApL + (cob + 0.01 + (sup.n > 1 ? (i * (bw - 2 * (cob + 0.01))) / (sup.n - 1) : (bw - 2 * cob) / 2)) * k, yc0 + h - (cob + 0.01 + sup.phi / 2000) * k, rr(sup.phi)));
  }
  // cotas
  out.push(...cotaHorizontal(yc0 - 5, [0, xApL, xApR, W].filter((v, i, a) => i === 0 || v > a[i - 1] + 1e-6), [tem.esq ? cotaCm(xApL / k) : '', cotaCm(bw), tem.dir ? cotaCm(B - xApR / k) : ''].filter(Boolean)));
  out.push(...cotaHorizontal(yc0 - 11, [0, W], [cotaCm(B)]));
  if (r.h0 < r.h - 1e-9) out.push(...cotaVertical(W + 6, [yc0, yc0 + h0, yc0 + h], [`h0=${cotaCm(r.h0)}`, `h1=${cotaCm(r.h - r.h0)}`]));
  else out.push(...cotaVertical(W + 6, [yc0, yc0 + h], [`h=${cotaCm(r.h)}`]));
  out.push(...cotaVertical(-6, [yc0, yc0 + r.profundidade * k], [`df=${cotaCm(r.profundidade)}`]));
  out.push(txt('TEXTO', 0, yc0 - 17, 2, `Assentamento: cota ${nf(r.cota)} m · df = ${cotaCm(r.profundidade)} cm`, 'e', 'topo'));
  out.push(txt('TEXTO', 0, yc0 - 21, 2, 'Solo compactado sobre a sapata (γ ≥ 16 kN/m³) [a confirmar]', 'e', 'topo'));
  if (r.aba !== 'ambas') out.push(txt('TEXTO', 0, yc0 - 25, 2, `Aba ${r.aba === 'esq' ? 'à esquerda' : 'à direita'} do sentido do traçado: apoio rente à divisa; vigas de equilíbrio (cintas) absorvem N·e${r.cinta !== undefined ? ` = ${nf(r.cinta, 1)} kN·m/m` : ''}`, 'e', 'topo'));
  return out;
}

/** Forma lateral (m²) já calculada no resultado. */
export const formaCorrida = (r: ResultadoCorrida) => r.forma;

const nomeModo = (r: ResultadoCorrida) => (r.modo === 'pilares' ? 'sob pilares' : 'sob parede');

/**
 * Folha de locação das sapatas corridas: base e apoio em planta, pilares tracejados, eixos e cotas, rótulos e quadro com
 * a largura, as alturas, as armaduras e as tensões. O aço fica nas folhas de detalhamento.
 */
export function montarPranchaCorridas(b: BuildingModel, dim: Dimensionamento, o: OpcoesArmacao & { sigla: string; conteudo: string }): Prancha | null {
  const rs = (dim.corridas ?? []).filter((r) => r.contorno.length);
  if (!rs.length) return null;
  const cfg = cfgArmacao(b), fck = fckDe(b, 'fundacao'), aco = acoDe(b, 'fundacao').aco, cob = cobrimentoFundacao(b);
  const pilares = b.pilares.filter((p) => p.nasce === 'fundacao');
  const geo: P[] = rs.flatMap((r) => r.contorno);
  const cx = caixa(geo);
  const pl = plantaNaFolha(cx, b.prancha?.formato ?? 'auto', cfg.escalaLocacao || b.prancha?.escala || 0);
  const k = pl.escala / 1000;
  const modelo: Prim[] = [];
  for (const r of rs) {
    modelo.push({ t: 'pl', c: 'FUNDACAO', pts: r.contorno, fechada: true });
    modelo.push({ t: 'pl', c: 'PILAR', pts: r.apoio, fechada: true });
    const a = r.pontos[0], z = r.pontos[r.pontos.length - 1];
    let ang = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI;
    if (ang > 90.01) ang -= 180; else if (ang <= -89.99) ang += 180;
    const rad = (ang * Math.PI) / 180, nn: P = [-Math.sin(rad), Math.cos(rad)];
    const mid: P = [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2], t = r.transversal;
    const lados = ladosDaBase(r.aba, r.B, r.bw), off = (Math.max(lados.esq, lados.dir) + 1.5 * k);
    modelo.push({ t: 'txt', c: 'TEXTO', p: [mid[0] + nn[0] * off, mid[1] + nn[1] * off], h: 2.2 * k, s: `${r.nome} ${cmInt(r.B)}×${cmInt(r.h)}${r.h0 < r.h ? `/${cmInt(r.h0)}` : ''}${t?.barras ? ` ${phiTxt(t.barras.phi)} c/${cmInt(t.barras.s)}` : ''}`, ang, ah: 'c', av: 'base' });
  }
  const centros: P[] = [];
  for (const p of pilares) { const s = secaoBase(b, p); centros.push(centroPilar(p, s)); modelo.push({ t: 'pl', c: 'PILAR-NASCE', pts: contornoPilar(p, s) as P[], fechada: true }); }
  eixosECotas(modelo, b.eixos, centros, cx, k);
  const tab: BlocoTabela = {
    titulo: 'SAPATAS CORRIDAS', cols: [{ w: 14, rot: 'SAPATA' }, { w: 20, rot: 'MODO' }, { w: 14, rot: 'L (m)' }, { w: 16, rot: 'B (cm)' }, { w: 14, rot: 'bw (cm)' }, { w: 18, rot: 'h / h0 (cm)' }, { w: 22, rot: 'TRANSVERSAL' }, { w: 22, rot: 'DISTRIBUIÇÃO' }, { w: 20, rot: 'σ / σadm (MPa)' }],
    linhas: rs.map((r) => { const t = r.transversal; return [r.nome, nomeModo(r), nf(r.L), String(cmInt(r.B)), String(cmInt(r.bw)), `${cmInt(r.h)} / ${cmInt(r.h0)}`, t?.barras ? `${phiTxt(t.barras.phi)} c/${cmInt(t.barras.s)}` : '—', t?.distribuicao.barras ? `${phiTxt(t.distribuicao.barras.phi)} c/${cmInt(t.distribuicao.barras.s)}` : '—', r.pressao ? `${nf(r.pressao.sigmaMax / 1000)} / ${r.sigmaAdm ? nf(r.sigmaAdm / 1000) : '—'}` : '—']; }),
  };
  const nts = notas([
    'Medidas em cm; bitolas (φ) em mm; tensões em MPa. Eixo e apoio (parede, viga ou nervura) em planta; aço nas folhas de detalhamento.',
    `Concreto C${fck} (fck = ${fck} MPa); aço ${aco}; cobrimento ${nf(cob * 100, 1)} cm.`,
    'Sob parede: largura pela σadm, altura rígida (balanço ≤ 1,5h), flexão transversal da aba (CEB-70) por metro e armadura de distribuição. Sob pilares: viga sobre base elástica na análise global.',
    ...(rs.some((r) => r.aba !== 'ambas') ? ['Aba de um lado: apoio rente à divisa; o momento N·e é absorvido por vigas de equilíbrio (cintas) até sapatas internas (não detalhadas aqui) [a confirmar].'] : []),
    'Desenho pelo padrão da sapata isolada, sem folha de referência para sapata corrida [a confirmar].',
  ]);
  return montarFolha({
    b, formato: pl.formato, tipo: 'fundacao', sigla: o.sigla, titulo: 'Fundação — sapatas corridas — locação', conteudo: `${o.conteudo} — SAPATAS CORRIDAS — LOCAÇÃO`,
    escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo, desenho: [], tabelas: [nts, tab], legenda: `ESCALA 1:${pl.escala} · sapatas corridas`, avisos: pl.avisos, modelo, janela: pl.janela, elementos: rs.map((r) => r.nome),
  });
}

/** Quantitativo (concreto, forma) por grupo de iguais; o aço entra pelo registro das posições. */
export function linhaQuantitativoCorrida(g: GrupoCorrida, aco: number): LinhaQuantitativo {
  return { nomes: g.els.map((e) => e.nome), tipo: 'Sapata corrida', quant: g.els.length, concreto: g.els.reduce((t, e) => t + e.volume, 0), forma: g.els.reduce((t, e) => t + e.forma, 0), aco };
}

