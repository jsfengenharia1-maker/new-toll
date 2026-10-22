// Prancha de armação das paredes e dos pilares-parede (E1d; sigla SCM [a confirmar]): para cada parede ou pilar-parede,
// uma elevação por trecho em casca (escala da opção, padrão 1:50) com os níveis dos lances, as aberturas, uma barra
// vertical e uma horizontal representativas de cada pano ("n Nk φx,x C=xxx"), os reforços locais, a verga, os
// montantes e os cantos das aberturas e as cotas; seção esquemática da malha (padrão 1:25) com o estribo do lado curto;
// quadro de armadura por pavimento, emendas e quantitativo aproximado; tabela de aço e resumo por bitola com perdas.
// Posições numeradas por folha (barras iguais somadas). Sem janela: tudo no papel.
import type { AnaliseEdificio } from '../building/analitico';
import type { DetalheParede } from '../building/detalhamentoParedes';
import type { Dimensionamento } from '../building/dimensionamento';
import { acoDe, cobrimentoPilar, fckDe } from '../building/materiais';
import type { ResultadoParedeDim } from '../building/paredesDim';
import { furosDaParede, niveisDaParede, ppDaParede } from '../building/paredesBase';
import { ladosDoPP, lancesDoPP } from '../building/pilarParede';
import type { BuildingModel } from '../building/types';
import { txt, type Prancha, type Prim } from './prancha';
import {
  Chaves, Posicoes, acoDaFolha, areaArmacao, bloco, capacidadeTabela, cfgArmacao, cmInt, cotaHorizontal, empacotar, formatoArmacao, mover, nf, nivel, notas,
  ordemNome, perdasDe, phiTxt, ponto, resumoAco, tabelaAco, montarFolha, type Bloco, type BlocoTabela, type OpcoesCarimbo, type PosDe,
} from './armacao';

export interface OpcoesParedes { carimbo?: OpcoesCarimbo }

const ESCALAS = [20, 25, 40, 50, 75, 100, 125, 150, 200, 250];

interface AlvoParede { res: ResultadoParedeDim; det: DetalheParede }

/** Paredes e pilares-parede com armadura calculada e detalhada, na ordem dos nomes. */
export function alvosDeParedes(dim: Dimensionamento): AlvoParede[] {
  const out: AlvoParede[] = [];
  for (const res of dim.armaduraParedes ?? []) {
    const det = dim.detalhesParedes?.find((d) => d.id === res.id);
    if (det) out.push({ res, det });
  }
  return out.sort((a, z) => ordemNome(a.res.nome, z.res.nome));
}

/** Escala da elevação: a da opção, ou a menor das escalas listadas, a partir dela, em que a parede cabe na altura útil da folha. */
function escalaQueCabe(escala: number, comp: number, altura: number, area: { x0: number; y0: number; x1: number; y1: number }): number {
  return ESCALAS.filter((e) => e >= escala).find((e) => (comp * 1000) / e + 40 <= area.x1 - area.x0 && (altura * 1000) / e + 60 <= area.y1 - area.y0) ?? ESCALAS.at(-1)!;
}

/** Elevação de um lado em casca: contorno, níveis, aberturas, barras representativas dos panos e reforços, cotas. Devolve a altura ocupada (mm). */
function elevacaoLado(b: BuildingModel, a: AlvoParede, iLado: number, k: number, posDe: PosDe, y0: number): { prims: Prim[]; altura: number; largura: number } {
  const out: Prim[] = [];
  const parede = b.paredes?.find((w) => w.id === a.res.id), pp = parede ? ppDaParede(parede) : b.pilaresParede!.find((x) => x.id === a.res.id)!;
  const g = ladosDoPP(b, pp)[iLado], lances = lancesDoPP(b, pp), cob = cobrimentoPilar(b);
  const zs = parede ? niveisDaParede(b, parede).zs : (() => { const ps = lances.map((l) => l.cota); const z0 = pp.nasce === 'fundacao' ? Math.min(...ps) - b.obra.profundidadeFundacao : b.pavimentos.find((x) => x.id === pp.nasce)!.cota; return [z0, ...ps]; })();
  const H = zs.at(-1)! - zs[0], X = (s: number) => s * k, Y = (z: number) => y0 + (z - zs[0]) * k;
  const aco = (t: 'vertical' | 'horizontal') => acoDe(b, t === 'vertical' ? 'pilarLong' : 'pilarEstribo').aco;
  const pl = (c: Prim['c'], ...pts: [number, number][]) => out.push({ t: 'pl', c, pts });
  pl('CONCRETO', [0, Y(zs[0])], [X(g.L), Y(zs[0])], [X(g.L), Y(zs.at(-1)!)], [0, Y(zs.at(-1)!)], [0, Y(zs[0])]);
  out.push(txt('TEXTO', 0, Y(zs.at(-1)!) + 6, 3.5, `${a.res.nome}.${iLado + 1} — trecho de ${nf(g.L)} m`, 'e', 'base'));
  // níveis
  zs.forEach((z, i) => {
    if (i > 0 && i < zs.length - 1) pl('COTA', [-4, Y(z)], [X(g.L), Y(z)]);
    const nome = i === 0 ? (pp.nasce === 'fundacao' ? 'Fundação' : b.pavimentos.find((x) => x.id === pp.nasce)?.nome ?? '') : lances[i - 1].nome;
    out.push(...nivel(X(g.L) + 4, Y(z), `${nome} ${z >= 0 ? '+' : ''}${nf(z)}`));
  });
  // aberturas
  const fs = parede ? furosDaParede(b, parede).porTrecho[iLado] ?? [] : [];
  for (const f of fs) {
    pl('CONCRETO', [X(f.s0), Y(f.z0)], [X(f.s1), Y(f.z0)], [X(f.s1), Y(f.z1)], [X(f.s0), Y(f.z1)], [X(f.s0), Y(f.z0)]);
    pl('CONCRETO', [X(f.s0), Y(f.z0)], [X(f.s1), Y(f.z1)]); pl('CONCRETO', [X(f.s0), Y(f.z1)], [X(f.s1), Y(f.z0)]);
  }
  // panos
  const barras = a.det.barras.filter((x) => x.lado === iLado);
  const conv = (c: string, phi: number, cm: number, q: number) => posDe(c, c.startsWith('H') || c.startsWith('G') ? aco('horizontal') : aco('vertical'), phi, cm, q);
  for (const [li, lance] of lances.entries()) {
    const zb = zs[li], zt = zs[li + 1];
    for (const p of a.res.panos.filter((x) => x.lado === iLado && x.pavimento === lance.id)) {
      const v = barras.find((x) => x.pavimento === lance.id && x.pano === p.pano && x.tipo === 'vertical');
      const h = barras.find((x) => x.pavimento === lance.id && x.pano === p.pano && (x.tipo === 'horizontal' || x.tipo === 'grampo'));
      const xv = X(p.s0 + Math.min(0.4, (p.s1 - p.s0) / 3)), yh = Y(zb + (zt - zb) * 0.55);
      if (v) {
        const C = cmInt(v.comprimento), pos = conv(`V|${p.vert!.s}`, v.phi, C, v.n);
        pl('ARMADURA', [xv, Y(zb + cob)], [xv, Y(zt - cob)]);
        out.push({ t: 'txt', c: 'TEXTO', p: [xv - 0.8, Y(zb) + 2], h: 2, s: `${v.n} ${pos} ${phiTxt(v.phi)} c/${cmInt(v.s ?? 0)} C=${C}`, ang: 90, ah: 'e', av: 'base' });
      }
      if (h) {
        const C = cmInt(h.comprimento), pos = conv(`H|${h.tipo}|${p.hor!.s}`, h.phi, C, h.n);
        const xa = X(p.s0 + 0.6), xz = X(p.s1 - 0.1);
        pl('ARMADURA', [xa, yh], [xz, yh]);
        out.push(txt('TEXTO', xa + 1, yh + 0.8, 2, `${h.n} ${pos} ${phiTxt(h.phi)} c/${cmInt(h.s ?? 0)} C=${C}${h.tipo === 'grampo' ? ' (grampos)' : ''}`, 'e', 'base'));
      }
      const tr = barras.find((x) => x.pavimento === lance.id && x.pano === p.pano && x.tipo === 'transversal');
      if (tr) { const C = cmInt(tr.comprimento), pos = conv('G|transversal', tr.phi, C, tr.n); out.push(txt('TEXTO', X(p.s0 + 0.6) + 1, yh - 2.6, 2, `${tr.n} ${pos} ${phiTxt(tr.phi)} C=${C} (grampos entre as faces)`, 'e', 'base')); }
      for (const [ir, r] of barras.filter((x) => x.pavimento === lance.id && x.pano === p.pano && (x.tipo === 'reforcoVertical' || x.tipo === 'reforcoHorizontal')).entries()) {
        const C = cmInt(r.comprimento), pos = conv(`R${r.tipo === 'reforcoVertical' ? 'V' : 'H'}`, r.phi, C, r.n);
        const rf = p.reforcos[ir];
        if (r.tipo === 'reforcoVertical') {
          const xr = X(rf ? (rf.de + rf.ate) / 2 : p.s0 + 0.1);
          pl('ARMADURA-NEG', [xr, Y(zb + cob)], [xr, Y(zt - cob)]);
          out.push({ t: 'txt', c: 'TEXTO', p: [xr + 0.8, Y(zb) + 2], h: 2, s: `${r.n} ${pos} ${phiTxt(r.phi)} C=${C} (reforço)`, ang: 90, ah: 'e', av: 'base' });
        } else {
          const yr = Y(zb + (rf ? (rf.de + rf.ate) / 2 : (zt - zb) / 2));
          pl('ARMADURA-NEG', [X(p.s0 + 0.1), yr], [X(p.s1 - 0.1), yr]);
          out.push(txt('TEXTO', X(p.s0 + 0.6), yr + 0.8, 2, `${r.n} ${pos} ${phiTxt(r.phi)} C=${C} (reforço)`, 'e', 'base'));
        }
      }
    }
  }
  // aberturas: verga, peitoril, montantes e cantos
  for (const f of fs) {
    const ab = a.res.aberturas.find((x) => x.id === f.id);
    if (!ab) continue;
    const bs = a.det.barras.filter((x) => x.abertura === f.id);
    for (const r of bs) {
      const C = cmInt(r.comprimento), pos = conv(`A|${r.tipo}`, r.phi, C, r.n);
      if (r.tipo === 'verga') { const y = Y(f.z1 + 0.1); pl('ARMADURA', [X(f.s0 - 0.3), y], [X(f.s1 + 0.3), y]); out.push(txt('TEXTO', X(f.s0 - 0.3), y + 0.8, 2, `${r.n} ${pos} ${phiTxt(r.phi)} C=${C} (verga)`, 'e', 'base')); }
      if (r.tipo === 'estriboVerga') out.push(txt('TEXTO', X(f.s0), Y(f.z1) + 3.2, 2, `${r.n} ${pos} ${phiTxt(r.phi)} c/${cmInt(r.s ?? 0)} C=${C} (estribos da verga)`, 'e', 'base'));
      if (r.tipo === 'peitoril') { const y = Y(f.z0 - 0.1); pl('ARMADURA', [X(f.s0 - 0.3), y], [X(f.s1 + 0.3), y]); out.push(txt('TEXTO', X(f.s0 - 0.3), y - 0.8, 2, `${r.n} ${pos} ${phiTxt(r.phi)} C=${C} (peitoril)`, 'e', 'topo')); }
      if (r.tipo === 'montante') { const x = X(f.s0 - 0.1); pl('ARMADURA', [x, Y(f.z0 - 0.2)], [x, Y(f.z1 + 0.2)]); out.push({ t: 'txt', c: 'TEXTO', p: [x - 0.8, Y(f.z0)], h: 2, s: `${r.n} ${pos} ${phiTxt(r.phi)} C=${C} (montantes)`, ang: 90, ah: 'e', av: 'base' }); }
      if (r.tipo === 'canto') {
        for (const [cx, cy, sx, sy] of [[f.s0, f.z0, -1, -1], [f.s1, f.z0, 1, -1], [f.s0, f.z1, -1, 1], [f.s1, f.z1, 1, 1]] as const) pl('ARMADURA', [X(cx - 0.3 * sx), Y(cy + 0.3 * sy)], [X(cx + 0.3 * sx), Y(cy - 0.3 * sy)]);
        out.push(txt('TEXTO', X((f.s0 + f.s1) / 2), Y((f.z0 + f.z1) / 2), 1.8, `${r.n} ${pos} ${phiTxt(r.phi)} C=${C} (cantos)`, 'c', 'meio'));
      }
    }
  }
  // cotas: comprimento do trecho com as aberturas
  const xs = [...new Set([0, ...fs.flatMap((f) => [f.s0, f.s1]), g.L])].sort((p, q) => p - q);
  out.push(...cotaHorizontal(Y(zs[0]) - 6, xs.map(X), xs.slice(1).map((s, i) => String(cmInt(s - xs[i])))));
  void H;
  return { prims: out, altura: (H * k) + 28, largura: X(g.L) + 40 };
}

/** Seção esquemática de um trecho de 60 cm (escala da seção): malha vertical, horizontal nas faces e estribo/grampo. */
function secaoEsquema(b: BuildingModel, a: AlvoParede, iLado: number, ks: number, x0: number, y0: number): Prim[] {
  const out: Prim[] = [], cob = cobrimentoPilar(b);
  const pano = a.res.panos.find((p) => p.lado === iLado && p.vert);
  const lado = a.res.lados.find((l) => l.lado === iLado && l.modelo === 'barra');
  const parede = b.paredes?.find((w) => w.id === a.res.id), pp = parede ? ppDaParede(parede) : b.pilaresParede!.find((x) => x.id === a.res.id)!;
  const g = ladosDoPP(b, pp)[iLado], lance = lancesDoPP(b, pp)[0], t = g.esp(lance.id).t, W = 0.6;
  const pl = (c: Prim['c'], ...pts: [number, number][]) => out.push({ t: 'pl', c, pts });
  pl('CONCRETO', [x0, y0], [x0 + W * ks, y0], [x0 + W * ks, y0 + t * ks], [x0, y0 + t * ks], [x0, y0]);
  const s = pano?.vert?.s ?? lado?.barra?.vert?.s ?? 0.2, phi = pano?.vert?.phi ?? lado?.barra?.vert?.phi ?? 8;
  const r = Math.max((phi / 2000) * ks, 0.5), c = (cob + 0.01) * ks;
  for (let xx = 0.05; xx < W; xx += s) { out.push(ponto('ARMADURA', x0 + xx * ks, y0 + c, r), ponto('ARMADURA', x0 + xx * ks, y0 + t * ks - c, r)); }
  pl('ARMADURA', [x0 + cob * ks, y0 + cob * ks], [x0 + (W - cob) * ks, y0 + cob * ks]); pl('ARMADURA', [x0 + cob * ks, y0 + t * ks - cob * ks], [x0 + (W - cob) * ks, y0 + t * ks - cob * ks]);
  out.push(txt('COTA', x0 + (W * ks) / 2, y0 + t * ks + 1, 1.8, String(cmInt(t)), 'c', 'base'));
  out.push(txt('TEXTO', x0, y0 - 3.5, 2, `Seção 1:${Math.round(1000 / ks)} — ${phiTxt(phi)} c/${cmInt(s)} nas duas faces`, 'e', 'topo'));
  return out;
}

export function blocoParede(b: BuildingModel, a: AlvoParede, escala: number, ks: number, posDe: PosDe): Prim[] {
  const k = 1000 / escala, out: Prim[] = [];
  const parede = b.paredes?.find((w) => w.id === a.res.id), pp = parede ? ppDaParede(parede) : b.pilaresParede!.find((x) => x.id === a.res.id)!;
  const lados = ladosDoPP(b, pp);
  let y = 0;
  const secoes: Prim[] = [];
  let xSec = 0;
  lados.forEach((g, i) => {
    if (!g.casca) return;
    const e = elevacaoLado(b, a, i, k, posDe, y);
    out.push(...e.prims);
    y += e.altura + 14;
    xSec = Math.max(xSec, e.largura);
  });
  // seções esquemáticas à direita, uma por trecho em casca
  let ys = 0;
  lados.forEach((g, i) => { if (!g.casca) return; secoes.push(...secaoEsquema(b, a, i, ks, xSec, ys + 10)); ys += 40; });
  // lados curtos: seção do pilar (barras e estribo) abaixo
  lados.forEach((g, i) => {
    if (g.casca) return;
    const lance = lancesDoPP(b, pp)[0], t = g.esp(lance.id).t, cob = cobrimentoPilar(b);
    const bars = a.det.barras.filter((x) => x.lado === i && x.tipo === 'ladoCurto'), ests = a.det.barras.filter((x) => x.lado === i && x.tipo === 'estriboLadoCurto'), est = ests[0];
    const W = g.L * ks, Hh = t * ks, x0 = xSec, y0 = ys + 10;
    secoes.push({ t: 'pl', c: 'CONCRETO', pts: [[x0, y0], [x0 + W, y0], [x0 + W, y0 + Hh], [x0, y0 + Hh], [x0, y0]] });
    if (est) secoes.push({ t: 'pl', c: 'ARMADURA', pts: [[x0 + cob * ks, y0 + cob * ks], [x0 + W - cob * ks, y0 + cob * ks], [x0 + W - cob * ks, y0 + Hh - cob * ks], [x0 + cob * ks, y0 + Hh - cob * ks], [x0 + cob * ks, y0 + cob * ks]] });
    const nb = bars[0]?.n ?? 0, r = Math.max(((bars[0]?.phi ?? 10) / 2000) * ks, 0.5), a1 = (cob + 0.01) * ks;
    for (let q = 0; q < nb / 2; q++) { const xx = x0 + a1 + ((W - 2 * a1) * q) / Math.max(1, nb / 2 - 1); secoes.push(ponto('ARMADURA', xx, y0 + a1, r), ponto('ARMADURA', xx, y0 + Hh - a1, r)); }
    // todas as posições dos lances entram na tabela; o texto cita a do primeiro lance
    const posE = ests.map((e) => posDe(`E|${i}`, acoDe(b, 'pilarEstribo').aco, e.phi, cmInt(e.comprimento), e.n));
    const posLs = bars.map((x) => posDe(`LC|${i}`, acoDe(b, 'pilarLong').aco, x.phi, cmInt(x.comprimento), x.n));
    const pos = posE[0] ?? '', posL = [...new Set(posLs)].join('/');
    secoes.push(txt('TEXTO', x0, y0 - 3.5, 2, `${g.nome} (pilar) 1:${Math.round(1000 / ks)} — ${nb} ${posL} ${phiTxt(bars[0]?.phi ?? 0)}${est ? `; ${est.n} ${pos} ${phiTxt(est.phi)} c/${cmInt(est.s ?? 0)}` : ''}`, 'e', 'topo'));
    ys += Hh + 24;
  });
  out.push(...secoes);
  out.push(txt('TEXTO', 0, -8, 3, a.res.nome, 'e', 'topo'));
  return out;
}

/** Quadro de armadura por pavimento: uma linha por pano e por lado curto. */
export function quadroArmadura(a: AlvoParede): string[][] {
  const linhas: string[][] = [];
  for (const p of a.res.panos) linhas.push([p.nomeLado, p.nomePav, String(p.pano + 1), p.vert ? `${phiTxt(p.vert.phi)} c/${cmInt(p.vert.s)}` : '—', p.hor ? `${phiTxt(p.hor.phi)} c/${cmInt(p.hor.s)}` : '—', `${nf(p.cumprimento * 100, 0)} %`]);
  for (const l of a.res.lados.filter((x) => x.modelo === 'barra' && x.barra?.vert)) linhas.push([l.nome, l.nomePav, 'pilar', `${l.barra!.n} ${phiTxt(l.barra!.vert!.phi)}`, `${phiTxt(l.barra!.estribo.phi)} c/${cmInt(l.barra!.estribo.s)}`, '—']);
  return linhas;
}

export function montarPranchasParedes(b: BuildingModel, _an: AnaliseEdificio | null, dim: Dimensionamento, o: OpcoesParedes = {}): Prancha[] {
  const cfg = cfgArmacao(b), perdas = perdasDe(b), fck = fckDe(b, 'pilar');
  const acoL = acoDe(b, 'pilarLong').aco, acoE = acoDe(b, 'pilarEstribo').aco;
  const alvos = alvosDeParedes(dim);
  if (!alvos.length) return [];
  const nts = notas([
    'Medidas em cm; bitolas (φ) em mm; níveis em m.',
    `Concreto C${fck} (fck = ${fck} MPa); aço ${acoL} nas barras e ${acoE} nos estribos e grampos.`,
    `Cobrimento nominal: ${nf(b.norma.cobrimento.pilar, 1)} cm (CAA ${b.norma.caa}). Malhas iguais nas duas faces; uma barra vertical e uma horizontal representam cada pano.`,
    'Reforços (linha tracejada grossa) são adicionais à malha, nas faixas em que a malha uniforme não atende. Emendas e ancoragens conforme o quadro de emendas.',
  ]);
  const f0 = cfg.formato === 'auto' ? 'A1' : cfg.formato, a0 = areaArmacao(f0);
  const escalas = alvos.map((a) => {
    const comp = Math.max(...ladosDoPP(b, a.res.tipo === 'parede' ? ppDaParede(b.paredes!.find((w) => w.id === a.res.id)!) : b.pilaresParede!.find((x) => x.id === a.res.id)!).map((g) => g.L));
    const H = lancesDoPP(b, a.res.tipo === 'parede' ? ppDaParede(b.paredes!.find((w) => w.id === a.res.id)!) : b.pilaresParede!.find((x) => x.id === a.res.id)!).length * 3.5;
    return escalaQueCabe(cfg.escalaParedes, comp + 4, H, a0);
  });
  const ks = 1000 / cfg.escalaSecao;
  const blocos: Bloco[] = alvos.map((a, i) => { const ch = new Chaves(); return bloco(blocoParede(b, a, escalas[i], ks, (kk, ac, p, c) => ch.pos(kk, ac, p, c)), ch.s, a.res.nome); });
  const { formato, avisos } = formatoArmacao(cfg.formato, blocos);
  const area = areaArmacao(formato);
  const cap = capacidadeTabela(formato, 64, [nts], 8);
  const col = empacotar(blocos, area.x1 - area.x0, area.y1 - area.y0, cap);
  const nFolhas = Math.max(0, ...col.map((c) => c.folha)) + 1;
  const out: Prancha[] = [];
  for (let f = 0; f < nFolhas; f++) {
    const idx = col.map((c, i) => (c.folha === f ? i : -1)).filter((i) => i >= 0);
    const reg = new Posicoes(), desenho: Prim[] = [];
    let concreto = 0, forma = 0;
    const quadro: string[][] = [], emendas: string[][] = [], quant: string[][] = [];
    for (const i of idx) {
      const a = alvos[i], c = col[i];
      desenho.push(...mover(bloco(blocoParede(b, a, escalas[i], ks, (kk, ac, p, cc, q) => reg.pos(kk, ac, p, cc, q)), new Set(), '').prims, area.x0 + c.x, area.y1 - c.y));
      concreto += a.det.concreto; forma += a.det.forma;
      for (const l of quadroArmadura(a)) quadro.push([a.res.nome, ...l]);
      for (const e of a.det.emendas) emendas.push([a.res.nome, e.nomeLado, e.nomePav, e.tipo === 'tracao' ? 'tração' : 'compressão', phiTxt(e.phi), String(cmInt(e.comprimento)), e.editada ? 'editada' : '']);
      quant.push([a.res.nome, nf(a.det.concreto), nf(a.det.forma), nf(a.det.peso), nf(a.det.concreto ? a.det.peso / a.det.concreto : 0, 1)]);
    }
    const aco = acoDaFolha(reg.tabela, perdas, concreto, forma);
    const tabs: BlocoTabela[] = [nts,
      { titulo: 'ARMADURA POR PAVIMENTO', cols: [{ w: 16, rot: 'PAREDE' }, { w: 20, rot: 'TRECHO' }, { w: 26, rot: 'LANCE' }, { w: 14, rot: 'PANO' }, { w: 30, rot: 'VERTICAL' }, { w: 30, rot: 'HORIZONTAL' }, { w: 20, rot: 'CUMPR.' }], linhas: quadro },
      ...(emendas.length ? [{ titulo: 'EMENDAS (cm)', cols: [{ w: 16, rot: 'PAREDE' }, { w: 20, rot: 'TRECHO' }, { w: 26, rot: 'ACIMA DE' }, { w: 24, rot: 'TIPO' }, { w: 18, rot: 'φ' }, { w: 22, rot: 'C' }, { w: 22, rot: '' }], linhas: emendas }] : []),
      { titulo: 'QUANTITATIVO APROXIMADO', cols: [{ w: 20, rot: 'PAREDE' }, { w: 30, rot: 'CONCRETO (m³)' }, { w: 30, rot: 'FORMA (m²)' }, { w: 30, rot: 'AÇO (kg)' }, { w: 40, rot: 'kg/m³' }], linhas: quant },
      tabelaAco(aco.tabela), resumoAco(aco, fck)];
    const sufixo = nFolhas > 1 ? ` (${f + 1}/${nFolhas})` : '';
    out.push(montarFolha({
      b, formato, tipo: 'paredes', titulo: `Armação das paredes${sufixo}`, conteudo: `ARMAÇÃO DAS PAREDES E PILARES-PAREDE${sufixo}`, escala: 'INDICADA', escalaNum: cfg.escalaParedes, carimbo: o.carimbo,
      desenho, tabelas: tabs, legenda: `Elevações 1:${[...new Set(idx.map((i) => escalas[i]))].join(', 1:')} · seções 1:${cfg.escalaSecao}`,
      avisos: f === 0 ? avisos : [], aco, elementos: idx.map((i) => alvos[i].res.nome),
    }));
  }
  return out;
}

export type { OpcoesCarimbo };
