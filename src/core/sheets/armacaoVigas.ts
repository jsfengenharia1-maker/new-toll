// Prancha de armação das vigas (R5): por grupo de pavimentos, uma elevação por viga (escala da opção, padrão
// 1:50) com apoios nomeados, cotas dos vãos e das zonas de estribos ("n Nk c/s"), barras em linhas paralelas
// (superiores acima, inferiores e pele abaixo) com "n Nk φx,x C=xxx", pernas (ganchos) desenhadas e cotadas,
// seção transversal e estribo à parte (padrão 1:25). Vigas paginadas nas folhas; posições numeradas por folha
// (barras iguais somadas); tabela de aço e resumo por bitola com perdas, concreto e forma da folha.
import type { AnaliseEdificio } from '../building/analitico';
import { ganchoNoventa, type BarraViga, type DetalheViga } from '../building/detalhamento';
import type { Dimensionamento } from '../building/dimensionamento';
import { acoDe, cobrimentoViga, fckDe } from '../building/materiais';
import { comprimentoPolilinha, pavimentosDoGrupo, pavimentosOrdenados, type BuildingModel, type Viga } from '../building/types';
import { txt, type Prancha, type Prim } from './prancha';
import {
  Chaves, Posicoes, acoDaFolha, areaArmacao, bloco, capacidadeTabela, cfgArmacao, cmInt, cotaCm, cotaHorizontal, empacotar, formatoArmacao, larguraTxt,
  montarFolha, mover, notas, ordemNome, perdasDe, phiTxt, ponto, qtd, resumoAco, tabelaAco, type Bloco, type OpcoesCarimbo, type PosDe,
} from './armacao';

export interface OpcoesArmacao {
  /** Só este grupo (id ou nome). */
  grupo?: string;
  carimbo?: OpcoesCarimbo;
}

/** Pernas (ganchos de 90°) em cm, inteiras, e trecho reto = C − pernas. */
function pernas(x: { ganchos: [boolean, boolean]; phi: number; comprimento: number; perna?: number }) {
  const g = cmInt(ganchoNoventa(x.phi, x.perna ?? 8));
  const L0 = x.ganchos[0] ? g : 0, L1 = x.ganchos[1] ? g : 0, C = cmInt(x.comprimento);
  return { L0, L1, C, reto: C - L0 - L1 };
}

/** Maior soma de barras de uma face numa seção (amostras nas pontas e nos meios das barras). */
function maxBarras(bs: BarraViga[]): number {
  const xs = bs.flatMap((x) => [x.s0 + 1e-3, x.s1 - 1e-3, (x.s0 + x.s1) / 2]);
  return Math.max(0, ...xs.map((s) => bs.filter((x) => x.s0 <= s && x.s1 >= s).reduce((t, x) => t + x.n, 0)));
}

/** Faixas (níveis) para linhas que não podem se sobrepor: intervalos [a, z] em mm. */
function faixas(ints: [number, number][]): number[] {
  const fim: number[] = [], out = new Array<number>(ints.length);
  ints.map((v, i) => [v, i] as const).sort((p, q) => p[0][0] - q[0][0]).forEach(([[a, z], i]) => {
    let k = fim.findIndex((f) => f < a);
    if (k < 0) { k = fim.length; fim.push(z); } else fim[k] = z;
    out[i] = k;
  });
  return out;
}

export function blocoViga(b: BuildingModel, det: DetalheViga, v: Viga, posDe: PosDe): Prim[] {
  const cfg = cfgArmacao(b), kE = 1000 / cfg.escalaVigas, kS = 1000 / cfg.escalaSecao;
  const rep = det.repeticoes, acoL = acoDe(b, 'vigaPos').aco, acoE = acoDe(b, 'vigaEstribo').aco;
  const cob = cobrimentoViga(b, v.cobrimento), h = v.secao.h, bw = v.secao.b;
  const [e0, e1] = det.extensao, X = (s: number) => (s - e0) * kE, hb = h * kE, d = 3;
  const out: Prim[] = [];
  const pl = (c: Prim['c'], ...pts: [number, number][]) => out.push({ t: 'pl', c, pts });
  // ---- elevação: faces interrompidas nos apoios, apoios com dentes acima e abaixo ----
  const ap = det.apoios;
  const livres: [number, number][] = [];
  let ini = e0;
  for (const a of ap) { if (a.s0 > ini + 1e-6) livres.push([ini, a.s0]); ini = Math.max(ini, a.s1); }
  if (e1 > ini + 1e-6) livres.push([ini, e1]);
  for (const [a, z] of livres) { pl('CONCRETO', [X(a), hb], [X(z), hb]); pl('CONCRETO', [X(a), 0], [X(z), 0]); }
  for (const a of ap) {
    pl('CONCRETO', [X(a.s0), hb], [X(a.s0), hb + d], [X(a.s1), hb + d], [X(a.s1), hb]);
    pl('CONCRETO', [X(a.s0), 0], [X(a.s0), -d], [X(a.s1), -d], [X(a.s1), 0]);
    const nome = b.pilares.find((p) => p.id === a.pilar)?.nome ?? a.pilar;
    out.push(txt('TEXTO', X((a.s0 + a.s1) / 2), -d - 1.2, 2.2, nome, 'c', 'topo'));
  }
  const apoioEm = (s: number) => ap.some((a) => a.s0 <= s + 1e-6 && a.s1 >= s - 1e-6);
  pl('CONCRETO', [X(e0), apoioEm(e0) ? -d : 0], [X(e0), apoioEm(e0) ? hb + d : hb]);
  pl('CONCRETO', [X(e1), apoioEm(e1) ? -d : 0], [X(e1), apoioEm(e1) ? hb + d : hb]);
  // ---- cotas: apoios e vãos livres; zonas de estribos ----
  const pts = [e0, ...ap.flatMap((a) => [a.s0, a.s1]), e1].sort((p, q) => p - q).filter((s, i, arr) => !i || s - arr[i - 1] > 0.005);
  const y1 = -d - 7.5, y2 = y1 - 8;
  out.push(...cotaHorizontal(y1, pts.map(X), pts.slice(1).map((s, i) => cotaCm(s - pts[i]))));
  // ---- barras em níveis: superiores acima da elevação, inferiores e pele abaixo das cotas ----
  const nomeViga = (id: string) => b.vigas.find((q) => q.id === id)?.nome ?? id;
  const desenhar = (bs: BarraViga[], yBase: number, sobe: boolean) => {
    const its = bs.map((x) => {
      const p = pernas(x), m = (X(x.s0) + X(x.s1)) / 2, w = larguraTxt(`${qtd(rep, x.n)} N99 ${phiTxt(x.phi)} C=${p.C}${x.continuaCom ? ` (contínua com ${nomeViga(x.continuaCom)})` : ''}`, 2.2);
      return [Math.min(X(x.s0) - (p.L0 ? 4 : 0), m - w / 2) - 2, Math.max(X(x.s1) + (p.L1 ? 4 : 0), m + w / 2) + 2] as [number, number];
    });
    const nv = faixas(its);
    bs.forEach((x, i) => {
      const p = pernas(x), y = sobe ? yBase + nv[i] * 9 : yBase - nv[i] * 9, xa = X(x.s0), xz = X(x.s1);
      const sinal = sobe ? -1 : 1; // pernas das superiores descem, das inferiores sobem (para dentro da viga)
      const pos = posDe(`L|${Math.min(p.L0, p.L1)}|${Math.max(p.L0, p.L1)}`, acoL, x.phi, p.C, x.n * rep);
      const linha: [number, number][] = [];
      if (p.L0) linha.push([xa, y + (sinal * p.L0 * kE) / 100]);
      linha.push([xa, y], [xz, y]);
      if (p.L1) linha.push([xz, y + (sinal * p.L1 * kE) / 100]);
      out.push({ t: 'pl', c: x.face === 'sup' ? 'ARMADURA-NEG' : 'ARMADURA', pts: linha });
      out.push(txt('TEXTO', (xa + xz) / 2, y + 0.8, 2.2, `${qtd(rep, x.n)} ${pos} ${phiTxt(x.phi)} C=${p.C}${x.continuaCom ? ` (contínua com ${nomeViga(x.continuaCom)})` : ''}`, 'c', 'base'));
      if (p.L0 || p.L1) out.push(txt('COTA', (xa + xz) / 2, y - 0.8, 1.8, String(p.reto), 'c', 'topo'));
      const ym = (L: number) => y + (sinal * L * kE) / 200;
      if (p.L0) out.push(txt('COTA', xa - 0.8, ym(p.L0), 1.8, String(p.L0), 'd', 'meio'));
      if (p.L1) out.push(txt('COTA', xz + 0.8, ym(p.L1), 1.8, String(p.L1), 'e', 'meio'));
    });
    return nv.length ? Math.max(...nv) + 1 : 0;
  };
  const sup = det.barras.filter((x) => x.face === 'sup').sort((p, q) => p.s0 - q.s0);
  const inf = [...det.barras.filter((x) => x.face === 'inf'), ...det.barras.filter((x) => x.face === 'pele')].sort((p, q) => (p.face === q.face ? p.s0 - q.s0 : p.face === 'inf' ? -1 : 1));
  const nSup = desenhar(sup, hb + d + 8, true);
  desenhar(inf, y2 - 11, false);
  // estribos: uma posição por bitola e comprimento na viga
  const eLarg = bw - 2 * cob.lat, eAlt = h - cob.inf - cob.sup;
  const est = new Map<string, { phi: number; C: number; n: number }>();
  for (const z of det.estribos) { const k = `${z.phi}|${cmInt(z.comprimento)}`; const e = est.get(k) ?? { phi: z.phi, C: cmInt(z.comprimento), n: 0 }; e.n += z.n; est.set(k, e); }
  const posEst = new Map<string, string>();
  for (const [k, e] of est) posEst.set(k, posDe(`E|${cmInt(eLarg)}|${cmInt(eAlt)}`, acoE, e.phi, e.C, e.n * rep));
  for (const z of det.estribos) out.push(...cotaHorizontal(y2, [X(z.s0), X(z.s1)], [`${qtd(rep, z.n)} ${posEst.get(`${z.phi}|${cmInt(z.comprimento)}`)} c/${cmInt(z.s)}`]));
  // ---- título ----
  const yTit = hb + d + 8 + Math.max(0, nSup - 1) * 9 + 9;
  const pavs = pavimentosDoGrupo(b, v.grupo);
  out.push(txt('TEXTO', 0, yTit + 3, 5, v.nome, 'e', 'base'));
  out.push(txt('TEXTO', 0, yTit, 2, `ESC 1:${cfg.escalaVigas} · ${cotaCm(bw)}×${cotaCm(h)}${rep > 1 ? ` · ${rep}× (${pavs[0].nome} a ${pavs.at(-1)!.nome})` : ''}`, 'e', 'base'));
  // ---- seção transversal e estribo à parte ----
  const xs = X(e1) + 14, ws = bw * kS, hs = h * kS, ys = -2;
  out.push(txt('TEXTO', xs + ws / 2, ys + hs + 7, 2.5, 'SEÇÃO', 'c', 'base'), txt('TEXTO', xs + ws / 2, ys + hs + 4, 1.8, `ESC 1:${cfg.escalaSecao}`, 'c', 'base'));
  pl('CONCRETO', [xs, ys], [xs + ws, ys], [xs + ws, ys + hs], [xs, ys + hs], [xs, ys]);
  const cl = cob.lat * kS, ci = cob.inf * kS, cs = cob.sup * kS;
  const phiT = det.estribos[0]?.phi ?? 5;
  pl('ARMADURA', [xs + cl, ys + ci], [xs + ws - cl, ys + ci], [xs + ws - cl, ys + hs - cs], [xs + cl, ys + hs - cs], [xs + cl, ys + ci]);
  pl('ARMADURA', [xs + cl, ys + hs - cs - 1.6], [xs + cl + 1.6, ys + hs - cs]);
  const fila = (n: number, phi: number, y: number, dir: 1 | -1) => {
    if (n <= 0) return;
    const r = Math.max((phi / 2000) * kS, 0.45), a = (cob.lat + phiT / 1000 + phi / 2000) * kS, vao = ws - 2 * a;
    const porCamada = Math.max(2, Math.floor(vao / ((phi / 1000 + 0.02) * kS)) + 1);
    for (let i = 0; i < n; i++) {
      const cam = Math.floor(i / porCamada), k = i % porCamada, nn = Math.min(porCamada, n - cam * porCamada);
      const x = nn > 1 ? xs + a + (vao * k) / (nn - 1) : xs + ws / 2;
      out.push(ponto('ARMADURA', x, y + dir * cam * (phi / 1000 + 0.02) * kS, r));
    }
  };
  const nI = maxBarras(det.barras.filter((x) => x.face === 'inf')), nS = maxBarras(det.barras.filter((x) => x.face === 'sup'));
  const phiI = Math.max(0, ...det.barras.filter((x) => x.face === 'inf').map((x) => x.phi)), phiS = Math.max(0, ...det.barras.filter((x) => x.face === 'sup').map((x) => x.phi));
  fila(nI, phiI || 10, ys + (cob.inf + phiT / 1000 + phiI / 2000) * kS, 1);
  fila(nS, phiS || 10, ys + hs - (cob.sup + phiT / 1000 + phiS / 2000) * kS, -1);
  const pele = det.barras.filter((x) => x.face === 'pele'), nP = Math.round(maxBarras(pele) / 2), phiP = pele[0]?.phi ?? 8;
  for (let i = 1; i <= nP; i++) {
    const y = ys + ci + ((hs - ci - cs) * i) / (nP + 1), r = Math.max((phiP / 2000) * kS, 0.45), a = (cob.lat + phiT / 1000 + phiP / 2000) * kS;
    out.push(ponto('ARMADURA', xs + a, y, r), ponto('ARMADURA', xs + ws - a, y, r));
  }
  out.push(...cotaHorizontal(ys - 3, [xs, xs + ws], [cotaCm(bw)]));
  out.push({ t: 'txt', c: 'COTA', p: [xs - 1.5, ys + hs / 2], h: 1.8, s: cotaCm(h), ang: 90, ah: 'c', av: 'base' });
  // estribo à parte
  const ye = ys - 12 - eAlt * kS, we = eLarg * kS, he = eAlt * kS;
  pl('ARMADURA', [xs, ye], [xs + we, ye], [xs + we, ye + he], [xs, ye + he], [xs, ye]);
  pl('ARMADURA', [xs, ye + he - 1.6], [xs + 1.6, ye + he]);
  out.push(txt('COTA', xs + we / 2, ye - 0.8, 1.8, String(cmInt(eLarg)), 'c', 'topo'), txt('COTA', xs + we + 0.8, ye + he / 2, 1.8, String(cmInt(eAlt)), 'e', 'meio'));
  let yt = ye - 4;
  for (const [k, e] of est) { out.push(txt('TEXTO', xs, yt, 2.2, `${qtd(rep, e.n)} ${posEst.get(k)} ${phiTxt(e.phi)} C=${e.C}`, 'e', 'topo')); yt -= 3.2; }
  return out;
}

/** Vigas detalhadas de um grupo, na ordem dos nomes. */
function vigasDoGrupo(b: BuildingModel, dim: Dimensionamento, grupo: string) {
  return (dim.detalhes ?? []).map((d) => ({ d, v: b.vigas.find((x) => x.id === d.viga)! })).filter((x) => x.v && x.v.grupo === grupo).sort((p, q) => ordemNome(p.v.nome, q.v.nome));
}

/** Grupos na ordem dos pavimentos. */
export const gruposOrdenados = (b: BuildingModel) => [...new Set(pavimentosOrdenados(b).map((p) => p.grupo))];
export const acharGrupo = (b: BuildingModel, g?: string) => (g ? b.grupos.find((x) => x.id === g || x.nome.toLowerCase() === g.toLowerCase())?.id ?? '§' : undefined);

export function montarPranchasVigas(b: BuildingModel, _an: AnaliseEdificio | null, dim: Dimensionamento, o: OpcoesArmacao = {}): Prancha[] {
  const cfg = cfgArmacao(b), perdas = perdasDe(b), fck = fckDe(b, 'viga');
  const acoL = acoDe(b, 'vigaPos').aco, acoE = acoDe(b, 'vigaEstribo').aco, cob = b.norma.cobrimento.viga;
  const out: Prancha[] = [];
  const gSel = acharGrupo(b, o.grupo);
  for (const g of gruposOrdenados(b)) {
    if (gSel && g !== gSel) continue;
    const lista = vigasDoGrupo(b, dim, g);
    if (!lista.length) continue;
    const nomeG = b.grupos.find((x) => x.id === g)?.nome ?? g, pavs = pavimentosDoGrupo(b, g);
    const blocos: Bloco[] = lista.map(({ d, v }) => { const ch = new Chaves(); return bloco(blocoViga(b, d, v, (k, a, p, c) => ch.pos(k, a, p, c)), ch.s, v.nome); });
    const { formato, avisos } = formatoArmacao(cfg.formato, blocos);
    const area = areaArmacao(formato);
    const nts = notas([
      'Medidas em cm; bitolas (φ) em mm; níveis em m.',
      `Concreto C${fck} (fck = ${fck} MPa); aço ${acoL} nas barras longitudinais e ${acoE} nos estribos.`,
      `Cobrimento nominal das vigas: ${cob.toFixed(1).replace('.', ',')} cm (CAA ${b.norma.caa}).`,
      'Quantidades por viga; "3×2" = 3 pavimentos × 2 barras. Pernas: ganchos de 90° (NBR 6118, 9.4.2.3); emendas por traspasse onde as barras se sobrepõem.',
    ]);
    const fc0 = { hLeg: 64 };
    const cap = capacidadeTabela(formato, fc0.hLeg, [nts], 8);
    const col = empacotar(blocos, area.x1 - area.x0, area.y1 - area.y0, cap);
    const nFolhas = Math.max(0, ...col.map((c) => c.folha)) + 1;
    for (let f = 0; f < nFolhas; f++) {
      const idx = col.map((c, i) => (c.folha === f ? i : -1)).filter((i) => i >= 0);
      const reg = new Posicoes(), desenho: Prim[] = [];
      let concreto = 0, forma = 0;
      for (const i of idx) {
        const { d, v } = lista[i], c = col[i];
        const bl = bloco(blocoViga(b, d, v, (k, a, p, cc, q) => reg.pos(k, a, p, cc, q)), new Set(), v.nome);
        desenho.push(...mover(bl.prims, area.x0 + c.x, area.y1 - c.y));
        const L = comprimentoPolilinha(v.pontos);
        concreto += v.secao.b * v.secao.h * L * d.repeticoes; forma += (v.secao.b + 2 * v.secao.h) * L * d.repeticoes;
      }
      const aco = acoDaFolha(reg.tabela, perdas, concreto, forma);
      const sufixo = nFolhas > 1 ? ` (${f + 1}/${nFolhas})` : '';
      out.push(montarFolha({
        b, formato, tipo: 'vigas', titulo: `Armação das vigas — ${nomeG}${sufixo}`, conteudo: `ARMAÇÃO DAS VIGAS — ${nomeG.toUpperCase()}${sufixo}`,
        escala: 'INDICADA', escalaNum: cfg.escalaVigas, carimbo: o.carimbo, desenho, tabelas: [nts, tabelaAco(aco.tabela), resumoAco(aco, fck)],
        legenda: `Elevações 1:${cfg.escalaVigas} · seções 1:${cfg.escalaSecao} · ${pavs.map((p) => p.nome).join(', ')}`, avisos: f === 0 ? avisos : [], aco, elementos: idx.map((i) => lista[i].v.nome),
      }));
    }
  }
  return out;
}
