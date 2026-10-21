// Prancha de armação dos pilares (R5): pilares iguais (mesmas seções e armaduras em todos os lances) num só
// desenho com o título "P1=P3=…"; elevação com os níveis (triângulo, nome e cota), barras com texto vertical
// "n Nk φx,x C=xxx" (n = pilares × barras), ganchos, traspasses cotados e estribos por lance ("n Nk c/s");
// seção de cada arranjo distinto (padrão 1:25) com estribo, barras e grampos, e estribo e grampo à parte.
// Quadro de pilares opcional nas últimas folhas. Posições por folha, tabela de aço e resumo como nas vigas.
import type { AnaliseEdificio } from '../building/analitico';
import { ganchoNoventa } from '../building/detalhamento';
import { posicoesEstribos, type DetalhePilar } from '../building/detalhamentoPilares';
import type { Dimensionamento, ResultadoPilar } from '../building/dimensionamento';
import { acoDe, cobrimentoPilar, fckDe } from '../building/materiais';
import { opcoesEmUso, perfilDe } from '../building/opcoes';
import { cotaFundacao, dimsSecao, lancesDoPilar, pavimentosOrdenados, secaoNoLance, type BuildingModel, type Pilar } from '../building/types';
import { LARGURA_LEGENDA, txt, type Prancha, type Prim } from './prancha';
import {
  Chaves, Posicoes, acoDaFolha, areaArmacao, bloco, capacidadeTabela, cfgArmacao, cmInt, colunaDeTabelas, cotaCm, cotaVertical, empacotar, formatoArmacao,
  montarFolha, mover, nf, nivel, notas, ordemNome, perdasDe, phiTxt, ponto, qtd, resumoAco, tabelaAco, type Bloco, type BlocoTabela, type PosDe,
} from './armacao';
import type { OpcoesArmacao } from './armacaoVigas';

const ESCALAS_ELEV = [20, 25, 40, 50, 75, 100, 125, 150, 200, 250];

export interface GrupoPilares { pilares: Pilar[]; det: DetalhePilar; res: (ResultadoPilar | undefined)[] }

const r2 = (x: number) => Math.round(x * 100);

/** Pilares iguais: mesmos lances, seções, arranjos, estribos e barras (cotas e comprimentos ao cm). */
export function gruposDePilares(b: BuildingModel, dim: Dimensionamento): GrupoPilares[] {
  const m = new Map<string, GrupoPilares>();
  for (const det of dim.detalhesPilares ?? []) {
    const p = b.pilares.find((x) => x.id === det.pilar);
    if (!p) continue;
    const res = det.lances.map((l) => dim.pilares.find((r) => r.pilar === p.id && r.pavimentoId === l.pavimento));
    const chave = JSON.stringify([
      det.lances.map((l) => [l.pavimento, r2(l.z0), r2(l.z1), JSON.stringify(secaoNoLance(p, l.pavimento)), l.estribos]),
      res.map((r) => r?.arranjo),
      det.barras.map((x) => [x.tipo, x.n, x.phi, r2(x.comprimento), r2(x.z0), r2(x.z1), x.ganchos]),
    ]);
    const g = m.get(chave);
    if (g) g.pilares.push(p); else m.set(chave, { pilares: [p], det, res });
  }
  return [...m.values()].map((g) => ({ ...g, pilares: g.pilares.sort((a, z) => ordemNome(a.nome, z.nome)) })).sort((a, z) => ordemNome(a.pilares[0].nome, z.pilares[0].nome));
}

/** Barras da seção retangular (u ao longo de b, v ao longo de h) ou circular, a partir do arranjo. */
export function barrasSecao(w: number, h: number, a: number, circ: boolean, ar: NonNullable<ResultadoPilar['arranjo']>): [number, number][] {
  if (circ) { const n = ar.n ?? 6, r = w / 2 - a; return Array.from({ length: n }, (_, i) => [w / 2 + r * Math.cos((2 * Math.PI * i) / n), h / 2 + r * Math.sin((2 * Math.PI * i) / n)]); }
  const nb = ar.nb ?? 2, nh = ar.nh ?? 2, out: [number, number][] = [], nbS = ar.nbS ?? nb, nhD = ar.nhD ?? nh;
  if (nbS !== nb || nhD !== nh) { // arranjo não simétrico: cada face com o seu número de barras
    const fx = (n: number, i: number) => a + ((w - 2 * a) * i) / Math.max(1, n - 1), fy = (n: number, j: number) => a + ((h - 2 * a) * j) / Math.max(1, n - 1);
    for (let i = 0; i < nb; i++) out.push([fx(nb, i), a]);
    for (let i = 0; i < nbS; i++) out.push([fx(nbS, i), h - a]);
    for (let j = 1; j < nh - 1; j++) out.push([a, fy(nh, j)]);
    for (let j = 1; j < nhD - 1; j++) out.push([w - a, fy(nhD, j)]);
    return out;
  }
  for (let i = 0; i < nb; i++) { const u = a + ((w - 2 * a) * i) / Math.max(1, nb - 1); out.push([u, a], [u, h - a]); }
  for (let j = 1; j < nh - 1; j++) { const v = a + ((h - 2 * a) * j) / (nh - 1); out.push([a, v], [w - a, v]); }
  return out;
}

export function blocoPilares(b: BuildingModel, g: GrupoPilares, escala: number, posDe: PosDe): Prim[] {
  const cfg = cfgArmacao(b), kP = 1000 / escala, kS = 1000 / cfg.escalaSecao, n = g.pilares.length, p = g.pilares[0], det = g.det;
  const acoL = acoDe(b, 'pilarLong').aco, acoE = acoDe(b, 'pilarEstribo').aco, cob = cobrimentoPilar(b, p.cobrimento);
  const ps = pavimentosOrdenados(b);
  const zmin = Math.min(...det.lances.map((l) => l.z0), ...det.barras.map((x) => x.z0)), Y = (z: number) => (z - zmin) * kP;
  const out: Prim[] = [];
  const pl = (c: Prim['c'], ...pts: [number, number][]) => out.push({ t: 'pl', c, pts });
  const wMax = Math.max(...det.lances.map((l) => dimsSecao(secaoNoLance(p, l.pavimento))[0])) * kP;
  // concreto por lance
  for (const l of det.lances) {
    const w = dimsSecao(secaoNoLance(p, l.pavimento))[0] * kP, x0 = (wMax - w) / 2;
    pl('CONCRETO', [x0, Y(l.z0)], [x0, Y(l.z1)]); pl('CONCRETO', [x0 + w, Y(l.z0)], [x0 + w, Y(l.z1)]);
  }
  // barras em faixas verticais à direita
  const xb0 = wMax + 10;
  const bs = [...det.barras].sort((a, z) => a.z0 - z.z0);
  const fim: number[] = [], faixa: number[] = [];
  for (const x of bs) { let k = fim.findIndex((f) => f < Y(x.z0) - 3); if (k < 0) { k = fim.length; fim.push(0); } fim[k] = Y(x.z1); faixa.push(k); }
  const xBar = (k: number) => xb0 + k * 9;
  bs.forEach((x, i) => {
    const xx = xBar(faixa[i]), gc = cmInt(ganchoNoventa(x.phi)), L0 = x.ganchos[0] ? gc : 0, L1 = x.ganchos[1] ? gc : 0, C = cmInt(x.comprimento);
    const pos = posDe(`L|${x.tipo}|${Math.min(L0, L1)}|${Math.max(L0, L1)}`, acoL, x.phi, C, x.n * n);
    const pts: [number, number][] = [];
    if (L0) pts.push([xx - (L0 * kP) / 100, Y(x.z0)]);
    pts.push([xx, Y(x.z0)], [xx, Y(x.z1)]);
    if (L1) pts.push([xx - (L1 * kP) / 100, Y(x.z1)]);
    out.push({ t: 'pl', c: 'ARMADURA', pts });
    out.push({ t: 'txt', c: 'TEXTO', p: [xx - 0.8, (Y(x.z0) + Y(x.z1)) / 2], h: 2, s: `${qtd(n, x.n)} ${pos} ${phiTxt(x.phi)} C=${C}`, ang: 90, ah: 'c', av: 'base' });
    if (L0) out.push(txt('COTA', xx - (L0 * kP) / 200, Y(x.z0) - 0.8, 1.6, String(L0), 'c', 'topo'));
    if (L1) out.push(txt('COTA', xx - (L1 * kP) / 200, Y(x.z1) + 0.8, 1.6, String(L1), 'c', 'base'));
  });
  // traspasses: sobreposição de barras consecutivas
  const longs = bs.filter((x) => x.tipo === 'longitudinal');
  const xMaxBar = xBar(Math.max(0, ...faixa));
  for (let i = 1; i < bs.length; i++) {
    const prev = bs.slice(0, i).filter((x) => x.z1 > bs[i].z0 + 0.01).at(-1);
    if (!prev) continue;
    const z0 = bs[i].z0, z1 = Math.min(prev.z1, bs[i].z1);
    if (z1 - z0 > 0.01) out.push(...cotaVertical(xMaxBar + 4, [Y(z0), Y(z1)], [cotaCm(z1 - z0)]));
  }
  void longs;
  // estribos por lance
  const xe = xMaxBar + 12;
  const posEst = det.lances.map((l) => {
    const s = secaoNoLance(p, l.pavimento), [w, h] = dimsSecao(s), e = l.estribos;
    const pe = posDe(`E|${s.tipo}|${cmInt(w - 2 * cob)}|${cmInt(h - 2 * cob)}`, acoE, e.phi, cmInt(e.comprimento), e.n * n);
    const pg = e.grampos ? posDe(`G|${cmInt(Math.max(w, h) - 2 * cob)}`, acoE, e.phi, cmInt(e.comprimentoGrampo), e.grampos * e.n * n) : '';
    const zs = e.ad ? posicoesEstribos(l.z0, l.z1, e.s, e.ad) : [], hAd = e.ad?.h ?? 0;
    const nBase = zs.filter((z) => z < l.z0 + hAd).length, nTopo = zs.filter((z) => z > l.z1 - hAd).length;
    if (e.ad && 2 * hAd < l.z1 - l.z0 - 0.01 && nBase + nTopo < e.n) // adensamento: base, trecho corrente e topo
      out.push(...cotaVertical(xe, [Y(l.z0), Y(l.z0 + hAd), Y(l.z1 - hAd), Y(l.z1)], [`${qtd(n, nBase)} ${pe} c/${cmInt(e.ad.s)}`, `${qtd(n, e.n - nBase - nTopo)} ${pe} c/${cmInt(e.s)}`, `${qtd(n, nTopo)} ${pe} c/${cmInt(e.ad.s)}`]));
    else out.push(...cotaVertical(xe, [Y(l.z0), Y(l.z1)], [`${qtd(n, e.n)} ${pe} c/${cmInt(e.ad && 2 * hAd >= l.z1 - l.z0 - 0.01 ? e.ad.s : e.s)}`]));
    return { pe, pg };
  });
  // níveis
  const xn1 = xe + 4;
  const niveis = [{ z: det.lances[0].z0, nome: p.nasce === 'fundacao' ? 'Fundação' : ps.find((x) => x.id === p.nasce)?.nome ?? '' }, ...det.lances.map((l) => ({ z: l.z1, nome: l.nome }))];
  if (p.nasce === 'fundacao') niveis[0].z = Math.max(niveis[0].z, cotaFundacao(b));
  for (const nv of niveis) {
    pl('COTA', [-6, Y(nv.z)], [xn1, Y(nv.z)]);
    out.push(...nivel(xn1 + 3, Y(nv.z), `${nv.nome} ${nv.z >= 0 ? '+' : ''}${nf(nv.z)}`));
  }
  // título
  const yTop = Math.max(...niveis.map((x) => Y(x.z)), ...bs.map((x) => Y(x.z1))) + 10;
  const nomes = g.pilares.map((x) => x.nome);
  const linhasTit: string[] = [];
  for (let i = 0; i < nomes.length; i += 6) linhasTit.push(nomes.slice(i, i + 6).join('='));
  linhasTit.forEach((l, i) => out.push(txt('TEXTO', 0, yTop + 4 + (linhasTit.length - 1 - i) * 6, 5, i < linhasTit.length - 1 ? `${l}=` : l, 'e', 'base')));
  out.push(txt('TEXTO', 0, yTop, 2, `Elevação 1:${escala} · seções 1:${cfg.escalaSecao}${n > 1 ? ` · ${n} pilares` : ''}`, 'e', 'base'));
  // seções distintas (seção + arranjo + estribo), de cima para baixo
  const xs0 = xn1 + 32;
  const distintas = new Map<string, { idx: number[] }>();
  det.lances.forEach((l, i) => { const e = l.estribos, k = JSON.stringify([secaoNoLance(p, l.pavimento), g.res[i]?.arranjo, e.phi, e.s, e.comprimento, e.grampos, e.comprimentoGrampo]); const d = distintas.get(k) ?? { idx: [] }; d.idx.push(i); distintas.set(k, d); });
  let ys = yTop, xs = xs0;
  const hMax = Math.max(yTop, 120);
  for (const { idx } of [...distintas.values()].reverse()) {
    const i0 = idx[0], l = det.lances[i0], s = secaoNoLance(p, l.pavimento), [w, h] = dimsSecao(s), ar = g.res[i0]?.arranjo, e = l.estribos;
    const W = w * kS, H = h * kS, c = cob * kS, circ = s.tipo === 'circ';
    const altura = 10 + H + 8 + (H - 2 * c) + 14;
    if (ys - altura < 0 && ys < yTop) { xs += Math.max(W + 34, 60); ys = yTop; }
    void hMax;
    const nomesL = idx.map((k) => det.lances[k].nome);
    out.push(txt('TEXTO', xs, ys - 2.5, 2.2, nomesL.length > 1 ? `${nomesL[0]} a ${nomesL.at(-1)}` : nomesL[0], 'e', 'topo'));
    const y0 = ys - 8 - H;
    if (circ) {
      const pts = (r: number) => Array.from({ length: 36 }, (_, k) => [xs + W / 2 + r * Math.cos((k * Math.PI) / 18), y0 + H / 2 + r * Math.sin((k * Math.PI) / 18)] as [number, number]);
      out.push({ t: 'pl', c: 'CONCRETO', pts: pts(W / 2), fechada: true }, { t: 'pl', c: 'ARMADURA', pts: pts(W / 2 - c), fechada: true });
    } else {
      pl('CONCRETO', [xs, y0], [xs + W, y0], [xs + W, y0 + H], [xs, y0 + H], [xs, y0]);
      pl('ARMADURA', [xs + c, y0 + c], [xs + W - c, y0 + c], [xs + W - c, y0 + H - c], [xs + c, y0 + H - c], [xs + c, y0 + c]);
      pl('ARMADURA', [xs + c, y0 + H - c - 1.6], [xs + c + 1.6, y0 + H - c]);
    }
    if (ar) {
      const a = cob + e.phi / 1000 + ar.phi / 2000, bars = barrasSecao(w, h, a, circ, ar), r = Math.max((ar.phi / 2000) * kS, 0.5);
      for (const [u, v] of bars) out.push(ponto('ARMADURA', xs + u * kS, y0 + v * kS, r));
      // grampos: barras intermediárias das faces (horizontais nas faces de h, verticais nas de b), até o número calculado
      let restam = Math.round(e.grampos / 2);
      const nh = ar.nh ?? 2, nb = ar.nb ?? 2;
      for (let j = 1; j < nh - 1 && restam > 0; j++, restam--) { const v = (a + ((h - 2 * a) * j) / (nh - 1)) * kS; pl('ARMADURA', [xs + c - 0.8, y0 + v + 0.8], [xs + c, y0 + v], [xs + W - c, y0 + v], [xs + W - c + 0.8, y0 + v - 0.8]); }
      for (let i = 1; i < nb - 1 && restam > 0; i++, restam--) { const u = (a + ((w - 2 * a) * i) / (nb - 1)) * kS; pl('ARMADURA', [xs + u - 0.8, y0 + c - 0.8], [xs + u, y0 + c], [xs + u, y0 + H - c], [xs + u + 0.8, y0 + H - c + 0.8]); }
    }
    out.push(txt('COTA', xs + W / 2, y0 + H + 0.8, 1.8, cotaCm(w), 'c', 'base'), { t: 'txt', c: 'COTA', p: [xs - 0.8, y0 + H / 2], h: 1.8, s: cotaCm(h), ang: 90, ah: 'c', av: 'base' });
    // estribo e grampo à parte
    const ye = y0 - 6 - (H - 2 * c), we = W - 2 * c, he = H - 2 * c;
    if (circ) out.push({ t: 'pl', c: 'ARMADURA', pts: Array.from({ length: 36 }, (_, k) => [xs + W / 2 + (we / 2) * Math.cos((k * Math.PI) / 18), ye + he / 2 + (he / 2) * Math.sin((k * Math.PI) / 18)] as [number, number]), fechada: true });
    else { pl('ARMADURA', [xs + c, ye], [xs + c + we, ye], [xs + c + we, ye + he], [xs + c, ye + he], [xs + c, ye]); pl('ARMADURA', [xs + c, ye + he - 1.6], [xs + c + 1.6, ye + he]); }
    out.push(txt('COTA', xs + c + we / 2, ye - 0.8, 1.6, String(cmInt(w - 2 * cob)), 'c', 'topo'), txt('COTA', xs + c + we + 0.8, ye + he / 2, 1.6, String(cmInt(h - 2 * cob)), 'e', 'meio'));
    const nEst = idx.reduce((t, k) => t + det.lances[k].estribos.n, 0);
    const { pe, pg } = posEst[i0];
    let yt = ye - 4;
    out.push(txt('TEXTO', xs, yt, 2, `${qtd(n, nEst)} ${pe} ${phiTxt(e.phi)} C=${cmInt(e.comprimento)}`, 'e', 'topo'));
    if (e.grampos && pg) {
      yt -= 3;
      out.push(txt('TEXTO', xs, yt, 2, `${qtd(n, nEst * e.grampos)} ${pg} ${phiTxt(e.phi)} C=${cmInt(e.comprimentoGrampo)} (grampo)`, 'e', 'topo'));
    }
    ys = yt - 8;
  }
  return out;
}

function escalaQueCabe(b: BuildingModel, g: GrupoPilares, altUtil: number) {
  const cfg = cfgArmacao(b), det = g.det;
  const H = Math.max(...det.lances.map((l) => l.z1), ...det.barras.map((x) => x.z1)) - Math.min(...det.lances.map((l) => l.z0), ...det.barras.map((x) => x.z0));
  return ESCALAS_ELEV.filter((e) => e >= cfg.escalaPilares).find((e) => (H * 1000) / e + 30 <= altUtil) ?? ESCALAS_ELEV.at(-1)!;
}

/** Quadro de pilares: uma linha por pilar e lance (seção, armadura longitudinal, estribos e grampos). */
export function linhasQuadroPilares(dim: Dimensionamento, b?: BuildingModel): string[][] {
  const out: string[][] = [];
  const dets = [...(dim.detalhesPilares ?? [])].sort((a, z) => ordemNome(a.nome, z.nome));
  for (const d of dets) for (const l of d.lances) {
    const bar = d.barras.find((x) => x.tipo === 'longitudinal' && x.lances.includes(l.pavimento));
    const e = l.estribos;
    out.push([d.nome, l.nome, l.secao.replace('×', ' × '), bar ? `${bar.n} ${phiTxt(bar.phi)}` : '—', `${phiTxt(e.phi)} c/${cmInt(e.s)}${e.ad ? ` (ad. c/${cmInt(e.ad.s)})` : ''}`, e.grampos ? `${e.grampos} ${phiTxt(e.phi)}` : '—']);
  }
  // pilares com seção insuficiente (sem armadura que atenda): listados sem desenho (K1.11.34)
  const com = new Set(dets.map((d) => d.pilar));
  const sem = !b || !opcoesEmUso(b.opcoes, perfilDe(b)).pilarInsuficienteSemDesenho ? [] : dim.pilares.filter((r) => !com.has(r.pilar) && r.mensagens.some((m) => /^(Não atende com até 4|Armadura manual necessária|Nenhuma armadura|Biela comprimida|λ > 200)/.test(m)));
  for (const r of [...sem].sort((a, z) => ordemNome(a.nome, z.nome))) out.push([r.nome, r.pavimento, r.secao.replace('×', ' × '), 'seção insuficiente', 'sem desenho', '—']);
  return out;
}

export function montarPranchasPilares(b: BuildingModel, _an: AnaliseEdificio | null, dim: Dimensionamento, o: OpcoesArmacao = {}): Prancha[] {
  const cfg = cfgArmacao(b), perdas = perdasDe(b), fck = fckDe(b, 'pilar');
  const acoL = acoDe(b, 'pilarLong').aco, acoE = acoDe(b, 'pilarEstribo').aco;
  const grupos = gruposDePilares(b, dim);
  if (!grupos.length) return [];
  const nts = notas([
    'Medidas em cm; bitolas (φ) em mm; níveis em m.',
    `Concreto C${fck} (fck = ${fck} MPa); aço ${acoL} nas barras longitudinais e ${acoE} nos estribos e grampos.`,
    `Cobrimento nominal dos pilares: ${nf(b.norma.cobrimento.pilar, 1)} cm (CAA ${b.norma.caa}).`,
    'Quantidades do conjunto de pilares iguais: "4×6" = 4 pilares × 6 barras. Emendas por traspasse cotadas entre as barras; espera na fundação com gancho.',
  ]);
  // escala por grupo pela altura útil do maior formato possível
  const f0 = cfg.formato === 'auto' ? 'A1' : cfg.formato, a0 = areaArmacao(f0);
  const escalas = grupos.map((g) => escalaQueCabe(b, g, a0.y1 - a0.y0));
  const blocos: Bloco[] = grupos.map((g, i) => { const ch = new Chaves(); return bloco(blocoPilares(b, g, escalas[i], (k, a, p, c) => ch.pos(k, a, p, c)), ch.s, g.pilares.map((x) => x.nome).join('=')); });
  const { formato, avisos } = formatoArmacao(cfg.formato, blocos);
  const area = areaArmacao(formato);
  const cap = capacidadeTabela(formato, 64, [nts], 8);
  const col = empacotar(blocos, area.x1 - area.x0, area.y1 - area.y0, cap);
  const nFolhas = Math.max(0, ...col.map((c) => c.folha)) + 1;
  const out: Prancha[] = [];
  const ps = pavimentosOrdenados(b);
  for (let f = 0; f < nFolhas; f++) {
    const idx = col.map((c, i) => (c.folha === f ? i : -1)).filter((i) => i >= 0);
    const reg = new Posicoes(), desenho: Prim[] = [];
    let concreto = 0, forma = 0;
    for (const i of idx) {
      const g = grupos[i], c = col[i];
      desenho.push(...mover(bloco(blocoPilares(b, g, escalas[i], (k, a, p, cc, q) => reg.pos(k, a, p, cc, q)), new Set(), '').prims, area.x0 + c.x, area.y1 - c.y));
      for (const p of g.pilares) for (const pav of lancesDoPilar(b, p)) {
        const k = ps.findIndex((x) => x.id === pav.id), hl = k > 0 ? pav.cota - ps[k - 1].cota : b.obra.profundidadeFundacao;
        const s = secaoNoLance(p, pav.id), [w, h] = dimsSecao(s), circ = s.tipo === 'circ';
        concreto += (circ ? (Math.PI * w * w) / 4 : w * h) * hl; forma += (circ ? Math.PI * w : 2 * (w + h)) * hl;
      }
    }
    const aco = acoDaFolha(reg.tabela, perdas, concreto, forma);
    const sufixo = nFolhas > 1 ? ` (${f + 1}/${nFolhas})` : '';
    out.push(montarFolha({
      b, formato, tipo: 'pilares', titulo: `Armação dos pilares${sufixo}`, conteudo: `ARMAÇÃO DOS PILARES${sufixo}`, escala: 'INDICADA', escalaNum: cfg.escalaPilares, carimbo: o.carimbo,
      desenho, tabelas: [nts, tabelaAco(aco.tabela), resumoAco(aco, fck)], legenda: `Elevações 1:${[...new Set(idx.map((i) => escalas[i]))].join(', 1:')} · seções 1:${cfg.escalaSecao}`,
      avisos: f === 0 ? avisos : [], aco, elementos: idx.flatMap((i) => grupos[i].pilares.map((x) => x.nome)),
    }));
  }
  // quadro de pilares nas últimas folhas
  if (cfg.quadroPilares) {
    const linhas = linhasQuadroPilares(dim, b);
    const cols = [{ w: 22, rot: 'PILAR' }, { w: 34, rot: 'LANCE' }, { w: 28, rot: 'SEÇÃO (cm)' }, { w: 34, rot: 'ARMADURA' }, { w: 32, rot: 'ESTRIBOS' }, { w: 28, rot: 'GRAMPOS' }];
    const nCols = Math.max(1, Math.floor((area.x1 - area.x0 + 4) / (LARGURA_LEGENDA + 4)));
    const porCol = Math.max(1, Math.floor((area.y1 - area.y0 - 2 * 4.5 - 3) / 4.5));
    const porFolha = nCols * porCol, nQ = Math.ceil(linhas.length / porFolha);
    for (let q = 0; q < nQ; q++) {
      const fatia = linhas.slice(q * porFolha, (q + 1) * porFolha);
      const blocosQ: BlocoTabela[] = [];
      for (let c = 0; c < nCols && c * porCol < fatia.length; c++) blocosQ.push({ titulo: 'QUADRO DE PILARES', cols, linhas: fatia.slice(c * porCol, (c + 1) * porCol) });
      // colunas da direita para a esquerda dentro da área: um bloco por coluna
      const desenho: Prim[] = [];
      blocosQ.forEach((t, c) => {
        const x1 = area.x0 + (c + 1) * (LARGURA_LEGENDA + 4) - 4;
        desenho.push(...colunaDeTabelas({ x0: area.x0, y0: area.y0, x1, y1: area.y1 + 2 }, 0, [t]).prims);
      });
      const suf = nQ > 1 ? ` (${q + 1}/${nQ})` : '';
      out.push(montarFolha({ b, formato, tipo: 'pilares', titulo: `Quadro de pilares${suf}`, conteudo: `QUADRO DE PILARES${suf}`, escala: '—', escalaNum: cfg.escalaPilares, carimbo: o.carimbo, desenho, tabelas: [nts], legenda: 'Seção, armadura longitudinal e estribos por pilar e lance', avisos: [] }));
    }
  }
  return out;
}
