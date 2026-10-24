// Detalhamento das paredes de concreto e dos pilares-parede (E1d): barras das malhas por pano e lance (verticais com
// espera na base e traspasse no topo; horizontais corridas ou em grampos, com ganchos nas pontas), reforços locais,
// armadura das aberturas (verga, peitoril, montantes, cantos), lados curtos como pilares (barras e estribos), emendas
// por traspasse (tracionada × comprimida, ampliação pelo espaçamento, comprimentos editáveis por pavimento) e
// quantitativos (aço, concreto e forma). NBR 6118, cap. 9. Premissas em `premissas.ts` (ids e1d-*).
import { barArea } from '../concrete';
import { alfa0t, estriboComprimento, ganchoNoventa, lbBasico } from './detalhamento';
import { acoDe, cobrimentoPilar, concretoDe } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import type { ResultadoParedeDim } from './paredesDim';
import { ladosDoPP, lancesDoPP } from './pilarParede';
import { ppDaParede } from './paredesBase';
import { cotaFundacao, pavimentosOrdenados, type BuildingModel, type EmendaParede, type Parede, type PilarParede } from './types';

export type TipoBarraParede = 'vertical' | 'horizontal' | 'grampo' | 'reforcoVertical' | 'reforcoHorizontal' | 'verga' | 'estriboVerga' | 'peitoril' | 'montante' | 'canto' | 'ladoCurto' | 'estriboLadoCurto' | 'transversal';

export interface BarraParede {
  tipo: TipoBarraParede; aco: string;
  lado: number; nomeLado: string; pavimento: string; nomePav: string;
  /** Pano (vertical, horizontal e reforços) ou abertura (id) a que a barra pertence. */
  pano?: number; abertura?: string;
  n: number; phi: number;
  /** Comprimento desenvolvido de cada barra (m), com ganchos e ancoragens. */
  comprimento: number;
  /** Espaçamento (m) quando é malha. */
  s?: number;
  descricao: string;
}

export interface EmendaDetalhe {
  lado: number; nomeLado: string; pavimento: string; nomePav: string;
  tipo: 'tracao' | 'compressao'; phi: number;
  /** Comprimento adotado (m), o mínimo normativo e a parcela de ampliação pelo espaçamento. */
  comprimento: number; minimo: number; ampliacao: number; lb: number; alfa0t: number; editada: boolean;
}

export interface DetalheParede {
  id: string; nome: string; tipo: 'parede' | 'pilarParede';
  barras: BarraParede[]; emendas: EmendaDetalhe[];
  /** Concreto (m³) e forma (m², duas faces e topos laterais) da parede, descontadas as aberturas. */
  concreto: number; forma: number;
  peso: number;
  avisos: string[];
}

const ACO_KG_M3 = 7850;
const pesoLinear = (phi: number) => barArea(phi) * ACO_KG_M3;
const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const arred = (x: number, cm: number) => Math.ceil(x * 100 / cm - 1e-9) * cm / 100;

/** Comprimento de emenda por traspasse (m) e suas parcelas. */
export function comprimentoEmenda(phi: number, lb: number, tracionada: boolean, prop: number, folgaLivre: number, ampliar: boolean): { comprimento: number; minimo: number; ampliacao: number; alfa: number } {
  const f = phi / 1000;
  const alfa = tracionada ? alfa0t(prop / 100) : 1;
  const base = alfa * lb, minimo = tracionada ? Math.max(0.3 * alfa * lb, 15 * f, 0.2) : Math.max(0.6 * lb, 15 * f, 0.2);
  const ampliacao = ampliar && folgaLivre > 4 * f ? folgaLivre : 0;
  return { comprimento: Math.max(base, minimo) + ampliacao, minimo, ampliacao, alfa };
}

/**
 * Detalha as paredes e os pilares-parede dimensionados. Cada barra da lista é uma posição (n barras iguais); o resumo de
 * aço soma por bitola. Comprimentos arredondados para cima ao múltiplo de `arredondamento` (cm).
 */
export function detalharParedes(b: BuildingModel, res: ResultadoParedeDim[], op: OpcoesCalculo): DetalheParede[] {
  const out: DetalheParede[] = [];
  const cob = cobrimentoPilar(b), ps = pavimentosOrdenados(b), zf = cotaFundacao(b);
  const aV = acoDe(b, 'pilarLong'), aH = acoDe(b, 'pilarEstribo');
  for (const r of res) {
    const parede = r.tipo === 'parede' ? b.paredes?.find((x) => x.id === r.id) : undefined;
    const pp: PilarParede | undefined = parede ? ppDaParede(parede) : b.pilaresParede?.find((x) => x.id === r.id);
    if (!pp) continue;
    const editadas: EmendaParede[] = (parede?.emendas ?? (pp as PilarParede).emendas ?? []);
    const lances = lancesDoPP(b, pp), lados = ladosDoPP(b, pp, op.pilarParedeLimite);
    const iNasce = pp.nasce === 'fundacao' ? -1 : ps.findIndex((x) => x.id === pp.nasce);
    const zBase = (k: number) => (k === 0 ? (pp.nasce === 'fundacao' ? zf : ps[iNasce].cota) : lances[k - 1].cota);
    const barras: BarraParede[] = [], emendas: EmendaDetalhe[] = [], avisos: string[] = [];
    const ok = (len: number) => arred(len, op.arredondamento);
    const add = (x: Omit<BarraParede, 'comprimento'> & { comprimento: number }) => barras.push({ ...x, comprimento: ok(x.comprimento) });
    let concreto = 0, forma = 0;
    for (const g of lados) {
      lances.forEach((lance, k) => {
        const H = lance.cota - zBase(k), t = g.esp(lance.id).t, conc = concretoDe(b, 'pilar', lance.id);
        const ultimo = k === lances.length - 1;
        const nomes = { lado: g.i, nomeLado: g.nome, pavimento: lance.id, nomePav: lance.nome };
        const lbDe = (phi: number, boa: boolean, h: boolean) => lbBasico(phi, conc, h ? aH.fyd : aV.fyd, boa, (h ? aH.aco : aV.aco) === 'CA-60');
        const Lc = g.ext(lance.id)[1] - g.ext(lance.id)[0]; // trecho existente no lance (recorte, E6d)
        concreto += Lc * t * H; forma += 2 * Lc * H + 2 * t * H;
        const panos = r.panos.filter((p) => p.lado === g.i && p.pavimento === lance.id);
        const ladoRes = r.lados.find((l) => l.lado === g.i && l.pavimento === lance.id);
        // emenda no topo do lance (com o de cima): tracionada se algum pano traciona junto ao topo
        const vertPano = panos.find((p) => p.vert);
        const phiV = vertPano?.vert?.phi ?? ladoRes?.barra?.vert?.phi ?? 0;
        let lapTopo = 0;
        if (!ultimo && phiV > 0) {
          const trac = panos.some((p) => p.tracaoNoTopo);
          const prox = r.panos.find((p) => p.lado === g.i && p.pavimento === lances[k + 1].id && p.vert);
          const alinhada = prox?.vert && vertPano?.vert && prox.vert.phi === vertPano.vert.phi && Math.abs(prox.vert.s - vertPano.vert.s) < 1e-9;
          const s = Math.min(vertPano?.vert?.s ?? 0.3, prox?.vert?.s ?? vertPano?.vert?.s ?? 0.3);
          const folga = alinhada ? 0 : Math.max(0, s / 2 - phiV / 1000);
          const lb = lbDe(phiV, true, false), cE = comprimentoEmenda(phiV, lb, trac, op.paredeEmendaProp, folga, !!op.paredeEmendaAmpliar);
          const ed = editadas.find((e) => e.pavimento === lance.id), val = trac ? ed?.tracao : ed?.compressao;
          let comp = cE.comprimento;
          if (val !== undefined) {
            if (val < cE.minimo - 1e-9) avisos.push(`${g.nome}, emenda ${trac ? 'tracionada' : 'comprimida'} acima de ${lance.nome}: comprimento editado ${fmt(val * 100, 0)} cm abaixo do mínimo ${fmt(cE.minimo * 100, 0)} cm.`);
            comp = val;
          }
          lapTopo = comp;
          emendas.push({ ...nomes, tipo: trac ? 'tracao' : 'compressao', phi: phiV, comprimento: comp, minimo: cE.minimo, ampliacao: cE.ampliacao, lb, alfa0t: cE.alfa, editada: val !== undefined });
        }
        const esperaBase = k === 0 && phiV > 0 ? lbDe(phiV, true, false) : 0;
        if (!g.casca) {
          const bar = ladoRes?.barra;
          if (bar?.vert) {
            const phi = bar.vert.phi, lbp = lbDe(phi, true, false), e = bar.estribo;
            add({ tipo: 'ladoCurto', aco: aV.aco, ...nomes, n: bar.n, phi, comprimento: H + lapTopo + (k === 0 ? lbp : 0) - (ultimo ? cob : 0), descricao: `Lado curto ${g.nome}: ${bar.n} φ${fmt(phi, 1)} (malha vertical por face c/${fmt(bar.vert.s * 100, 0)})` });
            const nE = Math.floor((H - 0.05) / e.s) + 1;
            add({ tipo: 'estriboLadoCurto', aco: aH.aco, ...nomes, n: nE, phi: e.phi, comprimento: estriboComprimento(g.L - 2 * cob, t - 2 * cob, e.phi, 135), s: e.s, descricao: `Estribos do lado curto ${g.nome}: φ${fmt(e.phi, 1)} c/${fmt(e.s * 100, 0)}` });
          }
          return;
        }
        for (const p of panos) {
          const Lp = p.s1 - p.s0;
          if (p.vert) {
            const nFace = Math.max(2, Math.ceil((Lp - 2 * cob) / p.vert.s - 1e-9) + 1);
            add({ tipo: 'vertical', aco: aV.aco, ...nomes, pano: p.pano, n: 2 * nFace, phi: p.vert.phi, s: p.vert.s, comprimento: H + lapTopo + esperaBase - (ultimo ? cob : 0), descricao: `Pano ${p.pano + 1} de ${g.nome}: ${2 * nFace} φ${fmt(p.vert.phi, 1)} c/${fmt(p.vert.s * 100, 0)} (verticais, duas faces)` });
          }
          if (p.hor) {
            const nRows = Math.max(2, Math.ceil((H - 2 * cob) / p.hor.s - 1e-9) + 1), gan = ganchoNoventa(p.hor.phi);
            const nominal = Lp - 2 * cob + 2 * gan;
            const lbH = lbDe(p.hor.phi, false, true), cE = comprimentoEmenda(p.hor.phi, lbH, true, 50, 0, false);
            const segs = Math.max(1, Math.ceil((nominal - cE.comprimento) / (op.barraMaxima - cE.comprimento)));
            if (op.paredeHorizontalGrampos) {
              add({ tipo: 'grampo', aco: aH.aco, ...nomes, pano: p.pano, n: nRows, phi: p.hor.phi, s: p.hor.s, comprimento: 2 * (Lp - 2 * cob) + (t - 2 * cob) + 2 * gan, descricao: `Pano ${p.pano + 1} de ${g.nome}: ${nRows} grampos φ${fmt(p.hor.phi, 1)} c/${fmt(p.hor.s * 100, 0)} (horizontais)` });
            } else {
              add({ tipo: 'horizontal', aco: aH.aco, ...nomes, pano: p.pano, n: 2 * nRows * segs, phi: p.hor.phi, s: p.hor.s, comprimento: segs === 1 ? nominal : (nominal + (segs - 1) * cE.comprimento) / segs, descricao: `Pano ${p.pano + 1} de ${g.nome}: ${2 * nRows} φ${fmt(p.hor.phi, 1)} c/${fmt(p.hor.s * 100, 0)} (horizontais, duas faces${segs > 1 ? `, ${segs} trechos com traspasse de ${fmt(cE.comprimento * 100, 0)} cm` : ''})` });
            }
          }
          if (p.cortante.grampos) {
            const nG = Math.ceil((Lp * H) / (0.3 * 0.3));
            add({ tipo: 'transversal', aco: aH.aco, ...nomes, pano: p.pano, n: nG, phi: 6.3, comprimento: t - 2 * cob + 2 * ganchoNoventa(6.3), descricao: `Pano ${p.pano + 1} de ${g.nome}: ${nG} grampos φ6,3 entre as faces (cortante fora do plano, c/30 × 30 cm)` });
          }
          for (const rf of p.reforcos) {
            if (rf.direcao === 'vertical') add({ tipo: 'reforcoVertical', aco: aV.aco, ...nomes, pano: p.pano, n: rf.n, phi: rf.phi, comprimento: H + lapTopo + esperaBase - (ultimo ? cob : 0), descricao: `Reforço de borda em ${g.nome} (s de ${fmt(rf.de)} a ${fmt(rf.ate)} m): ${rf.n} φ${fmt(rf.phi, 1)} (${fmt(rf.As)} cm² adicionais)` });
            else add({ tipo: 'reforcoHorizontal', aco: aH.aco, ...nomes, pano: p.pano, n: rf.n, phi: rf.phi, comprimento: Lp - 2 * cob + 2 * ganchoNoventa(rf.phi), descricao: `Reforço horizontal em ${g.nome} (z de ${fmt(rf.de)} a ${fmt(rf.ate)} m): ${rf.n} φ${fmt(rf.phi, 1)} (${fmt(rf.As)} cm² adicionais)` });
          }
        }
      });
    }
    // aberturas
    for (const ab of r.aberturas) {
      const g = lados.find((l) => l.i === ab.lado) ?? lados[0];
      const lance = lances.find((l) => l.id === ab.lance) ?? lances[0];
      const conc = concretoDe(b, 'pilar', lance.id), t = g.esp(lance.id).t;
      const lb = (phi: number) => lbBasico(phi, conc, aV.fyd, true, aV.aco === 'CA-60');
      const nomes = { lado: g.i, nomeLado: g.nome, pavimento: lance.id, nomePav: lance.nome, abertura: ab.id };
      const A = ab.armadura, w = ab.largura, nome = ab.tipo === 'porta' ? 'porta' : 'janela';
      add({ tipo: 'verga', aco: aV.aco, ...nomes, n: A.verga.n, phi: A.verga.phi, comprimento: w + 2 * lb(A.verga.phi), descricao: `Verga da ${nome} (${fmt(w)} m): ${A.verga.n} φ${fmt(A.verga.phi, 1)}, ancoragem de ${fmt(lb(A.verga.phi) * 100, 0)} cm além de cada montante` });
      add({ tipo: 'estriboVerga', aco: aH.aco, ...nomes, n: Math.ceil(w / A.estribo.s) + 1, phi: A.estribo.phi, s: A.estribo.s, comprimento: estriboComprimento(t - 2 * cob, Math.max(0.1, 0.3 - 2 * cob), A.estribo.phi, 135), descricao: `Estribos da verga da ${nome}: φ${fmt(A.estribo.phi, 1)} c/${fmt(A.estribo.s * 100, 0)}` });
      if (A.peitoril) add({ tipo: 'peitoril', aco: aV.aco, ...nomes, n: A.peitoril.n, phi: A.peitoril.phi, comprimento: w + 2 * lb(A.peitoril.phi), descricao: `Peitoril da janela: ${A.peitoril.n} φ${fmt(A.peitoril.phi, 1)}` });
      add({ tipo: 'montante', aco: aV.aco, ...nomes, n: 2 * A.montante.n, phi: A.montante.phi, comprimento: ab.altura + 2 * lb(A.montante.phi), descricao: `Montantes da ${nome}: ${A.montante.n} φ${fmt(A.montante.phi, 1)} em cada lado` });
      if (A.canto) add({ tipo: 'canto', aco: aV.aco, ...nomes, n: 4 * A.canto.n, phi: A.canto.phi, comprimento: 0.6, descricao: `Cantos da ${nome}: ${A.canto.n} φ${fmt(A.canto.phi, 1)} inclinadas a 45° em cada canto (60 cm)` });
    }
    if (parede?.aberturas) concreto -= parede.aberturas.reduce((s, a) => s + a.largura * a.altura * (lados[0]?.esp(lances[0].id).t ?? 0), 0);
    if (parede?.aberturas) forma -= parede.aberturas.reduce((s, a) => s + 2 * a.largura * a.altura, 0);
    const peso = barras.reduce((s, x) => s + x.n * x.comprimento * pesoLinear(x.phi), 0);
    out.push({ id: r.id, nome: r.nome, tipo: r.tipo, barras, emendas, concreto, forma, peso, avisos });
  }
  return out;
}

/** Resumo do aço das paredes por aço e bitola (m, kg) com as perdas (%). */
export function resumoAcoParedes(dets: DetalheParede[], perdas: number): { aco: string; phi: number; comprimento: number; peso: number; pesoComPerdas: number }[] {
  const m = new Map<string, { aco: string; phi: number; comprimento: number }>();
  for (const d of dets) for (const x of d.barras) {
    const k = `${x.aco}|${x.phi}`, e = m.get(k) ?? { aco: x.aco, phi: x.phi, comprimento: 0 };
    e.comprimento += x.n * x.comprimento; m.set(k, e);
  }
  return [...m.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi).map((e) => {
    const peso = e.comprimento * pesoLinear(e.phi);
    return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) };
  });
}

export type { Parede };
