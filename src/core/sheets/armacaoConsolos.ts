// Desenho dos consolos curtos na prancha de pilares (E2e, C6.108): vista frontal (perfil do consolo na face do pilar, com tirante,
// estribos horizontais de costura e verticais) e vista lateral (seção b × h com o tirante, os estribos e a pegada do aparelho),
// cotadas, com as medidas e as referências do pilar e da viga que apoia. Representação a confirmar com as folhas de referência.
import { estriboComprimento, ganchoNoventa } from '../building/detalhamento';
import type { ResultadoConsolo } from '../building/consolos';
import { acoDe, cobrimentoPilar } from '../building/materiais';
import type { BuildingModel, Consolo } from '../building/types';
import { txt, type Prim } from './prancha';
import { cfgArmacao, cmInt, cotaCm, cotaHorizontal, cotaVertical, nf, phiTxt, ponto, type PosDe } from './armacao';

/** Barras de um consolo: tirante, estribos horizontais de costura e estribos verticais, com quantidade e comprimento (m). */
export interface DetalheConsolo {
  consolo: string; nome: string;
  tirante: { n: number; phi: number; C: number };
  horizontais: { n: number; phi: number; C: number };
  verticais: { n: number; phi: number; s: number; C: number };
}

export function detalharConsolo(b: BuildingModel, c: Consolo, r: ResultadoConsolo): DetalheConsolo {
  const cob = c.cobrimento !== undefined ? c.cobrimento / 100 : cobrimentoPilar(b), a = r.arranjo;
  const Ct = r.ancoragem.lb + c.c - cob + ganchoNoventa(a.tirante.phi);
  const Ch = estriboComprimento(c.c - 2 * cob, c.b - 2 * cob, a.horizontais.phi, 135);
  const nv = Math.max(2, Math.ceil((c.c - 2 * cob) / a.verticais.s) + 1), Cv = estriboComprimento(c.b - 2 * cob, (c.h + c.hp) / 2 - 2 * cob, a.verticais.phi, 135);
  return { consolo: c.id, nome: c.nome, tirante: { n: a.tirante.n, phi: a.tirante.phi, C: Ct }, horizontais: { n: a.horizontais.n, phi: a.horizontais.phi, C: Ch }, verticais: { n: nv, phi: a.verticais.phi, s: a.verticais.s, C: Cv } };
}

/**
 * Bloco do consolo (mm na folha; origem no canto inferior esquerdo do pilar na vista frontal). Vista frontal à esquerda: pilar (faixa
 * com a espessura ao longo da viga), consolo em perfil e armadura; vista lateral à direita.
 */
export function blocoConsolo(b: BuildingModel, c: Consolo, r: ResultadoConsolo, posDe: PosDe): Prim[] {
  const cfg = cfgArmacao(b), k = 1000 / cfg.escalaSecao, acoL = acoDe(b, 'pilarLong').aco, acoE = acoDe(b, 'pilarEstribo').aco;
  const det = detalharConsolo(b, c, r), cob = c.cobrimento !== undefined ? c.cobrimento / 100 : cobrimentoPilar(b);
  const pil = b.pilares.find((p) => p.id === c.pilar), vig = b.vigas.find((v) => v.id === c.viga);
  const out: Prim[] = [], pl = (cam: Prim['c'], ...pts: [number, number][]) => out.push({ t: 'pl', c: cam, pts });
  const H = c.h * k, Hp = c.hp * k, C = c.c * k, Wp = 0.3 * k, y0 = 6, x0 = Wp; // pilar de 30 cm de largura de desenho; base do consolo em y0
  // perfil: o pilar à esquerda (interrompido) e o consolo
  pl('CONCRETO', [0, y0 - 4], [0, y0 + H + 6]);
  pl('CONCRETO', [x0, y0 - 4], [x0, y0 + H + 6]);
  pl('CONCRETO', [x0, y0], [x0 + C, y0 + H - Hp], [x0 + C, y0 + H], [x0, y0 + H], [x0, y0]);
  // aparelho de apoio: a e l/2 da face
  const xa = x0 + c.a * k, la = c.aparelho.l * k;
  pl('CONCRETO', [xa - la / 2, y0 + H], [xa - la / 2, y0 + H + 1.6], [xa + la / 2, y0 + H + 1.6], [xa + la / 2, y0 + H]);
  out.push(txt('TEXTO', xa, y0 + H + 2.2, 1.8, 'aparelho', 'c', 'base'));
  // tirante: do interior do pilar até a ponta, com o laço descendo
  const yt = y0 + H - (cob + 0.0063 + r.arranjo.tirante.phi / 2000) * k, ypt = Math.max(0.6, r.arranjo.tirante.phi / 2000 * k);
  const pos = posDe(`CT|${cmInt(det.tirante.C)}`, acoL, det.tirante.phi, cmInt(det.tirante.C), det.tirante.n);
  pl('ARMADURA', [x0 - r.ancoragem.lb * k, yt], [x0 + C - cob * k, yt], [x0 + C - cob * k, yt - 8 * (det.tirante.phi / 1000) * k]);
  out.push(txt('TEXTO', x0 + C / 2, yt + ypt + 0.8, 2, `${det.tirante.n} ${pos} ${phiTxt(det.tirante.phi)} C=${cmInt(det.tirante.C)}`, 'c', 'base'));
  // estribos horizontais de costura em 2/3 de d (linhas no perfil)
  const eH = det.horizontais, posH = posDe(`CH|${cmInt(eH.C)}`, acoE, eH.phi, cmInt(eH.C), eH.n), d = r.d;
  for (let i = 0; i < eH.n; i++) { const y = yt - ((2 / 3) * d * k * (i + 0.5)) / eH.n; pl('ARMADURA', [x0 + cob * k, y], [x0 + C - cob * k, y]); }
  out.push(txt('TEXTO', x0 + C + 2, yt - ((2 / 3) * d * k) / 2, 2, `${eH.n} ${posH} ${phiTxt(eH.phi)} C=${cmInt(eH.C)}`, 'e', 'base'));
  // estribos verticais
  const eV = det.verticais, posV = posDe(`CV|${cmInt(eV.C)}`, acoE, eV.phi, cmInt(eV.C), eV.n);
  for (let i = 0; i < Math.min(eV.n, 40); i++) {
    const x = x0 + cob * k + ((C - 2 * cob * k) * i) / Math.max(1, eV.n - 1), yb = y0 + (H - Hp) * ((x - x0) / C) + cob * k;
    pl('ARMADURA', [x, yb], [x, y0 + H - cob * k]);
  }
  out.push(txt('TEXTO', x0 + C / 2, y0 - 3.4, 2, `${eV.n} ${posV} ${phiTxt(eV.phi)} c/${cmInt(eV.s)} C=${cmInt(eV.C)}`, 'c', 'topo'));
  // cotas da vista frontal
  out.push(...cotaHorizontal(y0 + H + 6, [x0, xa, x0 + C], [cotaCm(c.a), cotaCm(c.c - c.a)]), ...cotaVertical(-3, [y0, y0 + H], [cotaCm(c.h)]), ...cotaVertical(x0 + C + 4, [y0 + H - Hp, y0 + H], [cotaCm(c.hp)]));
  out.push(txt('TEXTO', 0, y0 + H + 14, 5, `Consolo ${c.nome}`, 'e', 'base'));
  out.push(txt('TEXTO', 0, y0 + H + 11, 2, `ESC 1:${cfg.escalaSecao} · pilar ${pil?.nome ?? ''} · apoia a viga ${vig?.nome ?? ''} (ponta ${c.ponta === 'ini' ? 'inicial' : 'final'}) · ${r.tipo} (a/d = ${nf(r.ad, 2)})`, 'e', 'base'));
  // vista lateral: seção b × h
  const xs = x0 + C + 24, W = c.b * k;
  out.push(txt('TEXTO', xs + W / 2, y0 + H + 6, 2.5, 'VISTA LATERAL', 'c', 'base'));
  pl('CONCRETO', [xs, y0], [xs + W, y0], [xs + W, y0 + H], [xs, y0 + H], [xs, y0]);
  const bap = c.aparelho.b * k;
  pl('CONCRETO', [xs + (W - bap) / 2, y0 + H], [xs + (W - bap) / 2, y0 + H - 3], [xs + (W + bap) / 2, y0 + H - 3], [xs + (W + bap) / 2, y0 + H]);
  const n = det.tirante.n, al = (cob + 0.0063 + det.tirante.phi / 2000) * k, rt = Math.max((det.tirante.phi / 2000) * k, 0.5);
  for (let i = 0; i < n; i++) out.push(ponto('ARMADURA', n > 1 ? xs + al + ((W - 2 * al) * i) / (n - 1) : xs + W / 2, yt, rt));
  pl('ARMADURA', [xs + cob * k, y0 + cob * k], [xs + W - cob * k, y0 + cob * k], [xs + W - cob * k, y0 + H - cob * k], [xs + cob * k, y0 + H - cob * k], [xs + cob * k, y0 + cob * k]);
  out.push(...cotaHorizontal(y0 - 5, [xs, xs + W], [cotaCm(c.b)]), ...cotaVertical(xs - 3, [y0, y0 + H], [cotaCm(c.h)]));
  out.push(txt('TEXTO', xs, y0 - 9, 1.8, `aparelho ${cotaCm(c.aparelho.l)} × ${cotaCm(c.aparelho.b)} · Vd ${nf(r.Vd, 0)} kN · Hd ${nf(r.Hd, 0)} kN`, 'e', 'topo'));
  return out;
}
