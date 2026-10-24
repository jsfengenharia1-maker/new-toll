// Vigas embutidas em paredes de concreto (frente FU, fatia FU7c; K1.4.74): armadura própria.
// A viga de coroamento ou cinta que corre sobre o eixo de uma parede de concreto (`Viga.embutida`) é apoiada pela parede em
// todo o comprimento: não vence vão, e a carga vai para a parede (casca). Com a opção `paredeVigaEmbutida` ligada, a
// armadura é a mínima da norma (longitudinal As,mín da NBR 6118, 17.3.5.2.1, ou a taxa mínima das opções; estribo ρsw,mín =
// 0,2·fctm/fywk, 17.4.1.1.1, espaçamento até mín(0,6d; 30 cm)) em vez do dimensionamento de viga comum com apoio ao longo da
// parede; os erros de flexão, cortante e flecha dessa viga deixam de valer. Desligada, nada muda. Alvenaria é outro caso
// (`alvenariaDim.ts`). Premissa a confirmar: critério do programa de referência (taxas mínimas), `docs/pendencias-usuario.md`.
import { beamAsMin, beamShear, chooseBars, type BeamSection } from '../concrete';
import type { ResultadoViga } from './dimensionamento';
import { acoDe, cobrimentoViga, concretoDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { classificar } from './revisao';
import type { BuildingModel } from './types';

const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Viga embutida em parede de concreto com armadura própria (mínima). */
export interface ResultadoVigaEmbutida {
  viga: string; nome: string; parede: string; nomeParede: string;
  b: number; h: number;
  /** As,mín longitudinal (m²), armadura adotada em cada face (superior e inferior) e estribo. */
  AsMin: number; barras: string; estribo: string;
  /** Armadura bloqueada pelo usuário: só verificada, não substituída. */
  bloqueada: boolean;
  mensagens: string[];
}

/**
 * Aplica a armadura própria às vigas embutidas em paredes de concreto (muda `vigas` no lugar) e devolve uma linha por viga
 * (vazio com a opção desligada). Viga com armadura bloqueada fica como está.
 */
export function aplicarVigasEmbutidas(b: BuildingModel, op: OpcoesCalculo, vigas: ResultadoViga[]): ResultadoVigaEmbutida[] {
  const out: ResultadoVigaEmbutida[] = [];
  if (!op.paredeVigaEmbutida) return out;
  const c = concretoDe(b, 'viga'), aPos = acoDe(b, 'vigaPos'), aEst = acoDe(b, 'vigaEstribo'), gs = gamas(b).s;
  for (const v of b.vigas) {
    const w = v.embutida ? b.paredes?.find((x) => x.id === v.embutida) : undefined;
    if (!w || w.tipo !== 'concreto') continue;
    const r = vigas.find((x) => x.viga === v.id);
    if (!r) continue;
    const base = { viga: v.id, nome: v.nome, parede: w.id, nomeParede: w.nome, b: v.secao.b, h: v.secao.h };
    if (r.bloqueada) { out.push({ ...base, AsMin: 0, barras: r.barrasInf, estribo: r.estribo, bloqueada: true, mensagens: [`Viga ${v.nome} embutida em ${w.nome}: armadura bloqueada pelo usuário, só verificada.`] }); continue; }
    const cob = cobrimentoViga(b, v.cobrimento), d = v.secao.h - cob.inf - 0.005 - 0.008;
    const sec: BeamSection = { kind: 'rect', bw: v.secao.b, h: v.secao.h };
    const AsMin = op.vigaTaxaMin > 0 ? (op.vigaTaxaMin / 100) * v.secao.b * v.secao.h : beamAsMin(sec, false, d, c, aPos.fyd);
    const bars = chooseBars(AsMin, v.secao.b, cob.inf, 0.005, 0.019);
    const sh = beamShear(v.secao.b, d, 0, c, aEst.fyk, gs); // Vsd = 0: Asw/s = ρsw,mín·bw, espaçamento até mín(0,6d; 30 cm)
    const msgs: string[] = [];
    if (!bars) msgs.push(`Viga ${v.nome} embutida em ${w.nome}: a armadura mínima não cabe na largura de ${fmt(v.secao.b * 100, 0)} cm.`);
    if (!sh.stirrup) msgs.push(`Viga ${v.nome} embutida em ${w.nome}: estribo mínimo não encontrado.`);
    const txt = bars ? `${bars.n} φ${String(bars.phi).replace('.', ',')}${bars.layers > 1 ? ` (${bars.layers} camadas)` : ''}` : '—';
    const est = sh.stirrup, estTxt = est ? `φ${String(est.phi).replace('.', ',')} c/${Math.round(est.s * 100)}` : '—';
    r.AsInf = bars?.As ?? AsMin; r.AsSup = bars?.As ?? AsMin; r.AsNec = [AsMin, AsMin];
    r.barrasInf = txt; r.barrasSup = txt; r.estribo = estTxt;
    r.arranjo = { ...r.arranjo, inf: bars ? { n: bars.n, phi: bars.phi } : null, sup: bars ? { n: bars.n, phi: bars.phi } : null, estribo: est ? { phi: est.phi, s: est.s } : null };
    // a parede leva a carga: os erros da viga comum (flexão, cortante, flecha, fissuração) deixam de valer; ficam os avisos
    r.mensagens = r.mensagens.filter((m) => classificar(m).nivel !== 'erro');
    r.mensagens.push(...msgs);
    r.status = msgs.length ? 'fail' : 'ok';
    out.push({
      ...base, AsMin, barras: txt, estribo: estTxt, bloqueada: false,
      mensagens: [
        `Viga ${v.nome} embutida em ${w.nome}: apoiada pela parede em todo o comprimento; armadura mínima ${txt} em cada face (As,mín = ${fmt(AsMin * 1e4, 2)} cm²) e estribo ${estTxt} (ρsw,mín = 0,2·fctm/fywk, espaçamento máximo ${fmt(Math.min(0.6 * d, 0.3) * 100, 0)} cm).`,
      ],
    });
  }
  return out;
}
