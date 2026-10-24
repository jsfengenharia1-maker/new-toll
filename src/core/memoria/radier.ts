// Memória detalhada (MD fase 5c): radier (casca sobre molas de Winkler). Chamada por `dimensionarBaseElastica` (baseElastica.ts) só
// com a memória ligada, depois do cálculo de cada radier e com as variáveis dele: molas e tensões no solo (nó e combinação que dão
// o máximo, o mínimo, o recalque e a razão σ/σadm, com a decomposição por caso), momentos de cálculo por Wood-Armer em cada nó
// governante (reaproveita `registrarMomentosLaje`), flexão por face e direção (reaproveita `flexao`), armadura mínima, armadura
// necessária e fissuração na combinação frequente (reaproveita `registrarLajeFissuracao`). As barras adotadas e o quantitativo são
// registrados por `detalharRadier`. A punção sob os pilares está na MD4 ("Punção P1 · Radier R1"): só é referenciada.
import { beamFlexure, type Concrete } from '../concrete';
import type { DetTensoes, WoodArmerNosFn } from '../building/baseElastica';
import type { GrelhaPavimento } from '../building/analitico';
import { cm2, fm, fp, type Registrador } from './registrador';
import { flexao } from './vigaConcreto';
import { registrarLajeFissuracao, registrarMomentosLaje, type DetNoWA, type ExtremoLaje, type ItemFissuracao, type MomentosLaje } from './lajeMacica';

export type ItemFissRadier = ItemFissuracao;
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR = 'NBR 6118:2023';
const WINKLER = 'Winkler; k × área de influência (a confirmar)';

/**
 * Nó e combinação que dão cada extremo de Wood-Armer (`alvo`: valores com sinal, como `m.pos`/`m.neg` do cálculo), com a decomposição
 * por caso. Uma `MomentosLaje` por combinação governante.
 */
export function momentosRadier<C extends { nome: string }>(wa: WoodArmerNosFn, g: GrelhaPavimento, ref: string, casos: string[], combs: C[],
  fat: (cb: C) => number[], alvo: { pos: [number, number]; neg: [number, number] }, rotulo: string): MomentosLaje[] {
  type T = { face: 'pos' | 'neg'; dir: 0 | 1; valor: number };
  const pend = new Set<T>(([['pos', 0], ['pos', 1], ['neg', 0], ['neg', 1]] as const).map(([face, dir]) => ({ face, dir, valor: alvo[face][dir] })).filter((t) => t.valor !== 0));
  const out: MomentosLaje[] = [];
  for (const cb of combs) {
    if (!pend.size) break;
    const f = fat(cb), nos = wa(g, ref, f);
    const extremos: ExtremoLaje[] = [];
    for (const t of [...pend]) {
      const idx = nos.findIndex((x) => (t.face === 'pos' ? x.inf[t.dir] : x.sup[t.dir]) === t.valor);
      if (idx < 0) continue;
      pend.delete(t);
      const det: { mx: number; my: number; tx: number; ty: number }[] = [];
      wa(g, ref, f, det);
      const porCaso = casos.map((caso, i) => ({ caso, f: f[i] })).filter((q) => q.f !== 0).map((q) => {
        const d: typeof det = [];
        wa(g, ref, casos.map((c) => (c === q.caso ? 1 : 0)), d);
        return { caso: q.caso, f: q.f, mx: d[idx].mx, my: d[idx].my, tx: d[idx].tx, ty: d[idx].ty };
      });
      const n = g.modelo.nos[nos[idx].no], dd = det[idx];
      const w: DetNoWA = { no: nos[idx].no, x: n[0], y: n[1], mx: dd.mx, my: dd.my, t: Math.max(dd.tx, dd.ty), tx: dd.tx, ty: dd.ty, inf: nos[idx].inf, sup: nos[idx].sup, porCaso };
      extremos.push({ face: t.face, dir: t.dir, valor: t.valor, wa: w });
    }
    if (extremos.length) out.push({ rotulo: `${rotulo} · ${cb.nome}`, fatores: casos.map((caso, i) => ({ caso, f: f[i] })).filter((q) => q.f !== 0), wa: true, extremos });
  }
  return out;
}

export interface CtxRadier {
  el: string; nome: string; h: number; k: number; malha: number; area: number; nNos: number; sigmaAdm: number | null;
  c: Concrete; fyd: number; fyk: number; cob: number; d: number; amin: number;
  solo: DetTensoes; resSolo: { max: number; min: number; cMax: string; cMin: string; rec: number };
  momentosELU: MomentosLaje[]; mPos: [number, number]; mNeg: [number, number];
  /** Armadura necessária por face e direção antes da fissuração (cm²/m) e final. */
  asNec: { pos: [number, number]; neg: [number, number] }; As: { pos: [number, number]; neg: [number, number] };
  momentosFreq: MomentosLaje[]; itens: ItemFissuracao[]; wk: number; wkLim: number; caa: 1 | 2 | 3 | 4; rhoMin: number;
}

export function registrarRadier(mem: Registrador, x: CtxRadier): void {
  const el = x.el;
  const T0 = 'Radier · dados';
  if (!mem.aceita(el) || mem.passos.some((p) => p.elemento === el && p.topico === T0)) return;
  const E = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  const { c, fyd, h } = x;
  E('dimensionamento', T0, { descricao: `Radier ${x.nome} sobre base elástica: espessura, área e molas verticais (k × área de influência de cada nó da malha de ${fm(x.malha)} m)`, formula: 'k_mola = k·Ainfl; ΣAinfl = área do radier (contorno − furos)', expressao: `h = ${fm(h)} m; área = ${fm(x.area)} m²; k = ${fm(x.k)} kN/m³; ${x.nNos} nós com mola`, resultado: x.k, unidade: 'kN/m³', norma: WINKLER, aConfirmar: true, entradas: { h, area: x.area, k: x.k, malha: x.malha, nos: x.nNos } });
  E('dimensionamento', T0, { descricao: 'Resistências de cálculo, cobrimento e altura útil (φ10 de referência)', formula: 'fcd = fck/γc; fyd = fyk/γs; d = h − c − 0,01', expressao: `fcd = ${fm(c.fcd)} MPa; fyd = ${fm(fyd)} MPa; d = ${fm(h)} − ${fm(x.cob)} − 0,01 = ${fm(x.d)} m`, resultado: x.d, unidade: 'm', norma: `${NBR}, 12.3.3 e 7.4.7.6`, entradas: { fcd: c.fcd, fctd: c.fctd, fctm: c.fctm, fyd, fyk: x.fyk, h, cob: x.cob, d: x.d } });

  // ---------------------------------------------------------------- solo
  const T1 = 'Radier · tensões no solo';
  const s = x.solo, soma = (n: NonNullable<typeof s.max>) => n.porCaso.map((q) => `${fm(q.f)}·${fp(q.uz * 1000)} mm (${q.caso})`).join(' + ') || '0';
  const linha = (rot: string, n: typeof s.max, unid: string, val: number) => {
    if (!n) { E('dimensionamento', T1, { descricao: `${rot}: sem nós ou sem combinações raras`, formula: 'σ = −k·w', expressao: '0', resultado: 0, unidade: unid, norma: 'NBR 6122:2019', entradas: {} }); return; }
    E('dimensionamento', T1, { descricao: `${rot} (combinação rara ${n.comb}, nó ${n.no} em x = ${fm(n.x, 3)} m, y = ${fm(n.y, 3)} m)`, formula: 'w = Σ f·uz,caso; σ = −k·w', expressao: `w = ${soma(n)}; σ = −${fm(n.k)}·w = ${fm(n.valor)} kPa`, resultado: val, unidade: unid, norma: `NBR 6122:2019; ${WINKLER}`, aConfirmar: true, entradas: { k: n.k, area: n.area, valor: n.valor, combinacao: n.comb, no: n.no, contrib: JSON.stringify(n.porCaso.map((q) => [q.caso, q.f, q.uz])) } });
  };
  linha('Tensão máxima no solo', s.max, 'kPa', x.resSolo.max);
  linha('Tensão mínima no solo (negativa = tração: levantamento)', s.min, 'kPa', x.resSolo.min);
  if (s.rec) E('dimensionamento', T1, { descricao: `Recalque máximo (combinação rara ${s.rec.comb}, nó ${s.rec.no})`, formula: 'recalque = −w', expressao: `recalque = ${fm(x.resSolo.rec * 1000)} mm`, resultado: x.resSolo.rec, unidade: 'm', norma: 'NBR 6122:2019', entradas: { contrib: JSON.stringify(s.rec.porCaso.map((q) => [q.caso, q.f, q.uz])), no: s.rec.no } });
  if (x.sigmaAdm === null) E('dimensionamento', T1, { descricao: 'Tensão admissível do solo não informada', formula: 'σadm', expressao: 'sem σadm', resultado: 'sem σadm', unidade: '', norma: 'NBR 6122:2019', entradas: {} });
  else E('dimensionamento', T1, { descricao: `Verificação da tensão admissível${s.pior?.vento ? ' (combinação com vento: σadm × fator de vento)' : ''}${s.pior ? ` — maior razão σ/σadm na combinação ${s.pior.comb}` : ''}`, formula: 'σmáx ≤ σadm (× fator do vento nas combinações com vento)', expressao: `σmáx = ${fm(x.resSolo.max)} kPa; σadm = ${fm(x.sigmaAdm)} kPa${s.fatorVento !== 1 ? ` (fator de vento ${fm(s.fatorVento)})` : ''}; razão = ${fm(s.pior?.razao ?? 0)} ${(s.pior?.razao ?? 0) <= 1 + 1e-9 ? '(atende)' : '(NÃO atende)'}`, resultado: s.pior?.razao ?? 0, unidade: '', norma: 'NBR 6122:2019, 5.5', entradas: { sigmaAdm: x.sigmaAdm, fatorVento: s.fatorVento, razao: s.pior?.razao ?? 0, limite: s.pior?.lim ?? 0 } });

  // ---------------------------------------------------------------- momentos ELU (Wood-Armer) e flexão
  for (const m of x.momentosELU) registrarMomentosLaje(mem, el, m);
  const sec = { kind: 'rect' as const, bw: 1, h }, fk = { c, sec, taxaMin: 0, b: 1, h };
  for (const face of ['pos', 'neg'] as const) for (const k of [0, 1] as const) {
    const M = face === 'pos' ? x.mPos[k] : x.mNeg[k], nome = face === 'pos' ? 'inferior (positiva)' : 'superior (negativa)', topico = `Flexão – face ${nome}, direção ${k}`;
    const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico, ...p });
    const cb = x.momentosELU.find((mm) => mm.extremos.some((e) => e.face === face && e.dir === k));
    P({ descricao: `Momento de dimensionamento ${face === 'pos' ? 'positivo' : 'negativo'}: extremo entre as combinações ELU (Wood-Armer)${cb ? ` — ${cb.rotulo}` : ' — nulo'}`, formula: face === 'pos' ? 'Md = máx(0; m*) entre as combinações' : 'Md = mín(0; m*′) entre as combinações', expressao: `Md = ${fm(M)} kN·m/m`, resultado: M, unidade: 'kN·m/m', norma: `${NBR}, 14.7; Wood (1968); Armer (1968)`, entradas: { Md: M } });
    if (M) flexao(mem, el, topico, fk, Math.abs(M), x.d, x.cob + 0.01, fyd, false, 0, face === 'pos', { un: 'kN·m/m', semMinimo: true });
    const Asf = M ? beamFlexure(sec, false, Math.abs(M), x.d, x.cob + 0.01, c, fyd).As : 0;
    P({ descricao: 'Armadura mínima por metro (por face e direção)', formula: 'As,mín = ρmín·h', expressao: `As,mín = ${fm(x.rhoMin)}·${fm(h)} = ${cm2(x.amin)}/m`, resultado: x.amin, unidade: 'm²/m', norma: `${NBR}, 19.3.3.2 (Tabela 19.1)`, aConfirmar: true, entradas: { rho: x.rhoMin, h }, observacao: 'ρmín = 0,15 % em cada face e direção (como as lajes maciças).' });
    const nec = x.asNec[face][k];
    P({ descricao: 'Armadura necessária por metro (antes da verificação da fissuração)', formula: 'As = máx(As,mín; As,flexão)', expressao: `As = máx(${cm2(x.amin)}; ${cm2(Asf)}) = ${fm(nec)} cm²/m`, resultado: nec, unidade: 'cm²/m', norma: `${NBR}, 17.3.5.2`, entradas: { amin: x.amin, AsFlexao: Asf } });
  }

  // ---------------------------------------------------------------- fissuração
  for (const m of x.momentosFreq) registrarMomentosLaje(mem, el, m);
  registrarLajeFissuracao(mem, el, { c, sec, h, caa: x.caa, wkLim: x.wkLim, itens: x.itens, wk: x.wk, criterio: 'menor bitola ≥ φ8 com o espaçamento mínimo das opções e s ≤ mín(2h; 20 cm)' });

  // ---------------------------------------------------------------- resumo
  E('dimensionamento', 'Radier · armadura final', { descricao: 'Armadura por metro adotada em cada face e direção (cm²/m): inferior (positiva) e superior (negativa), direções 0 e 1', formula: 'As = As necessária × 1,1^n da fissuração', expressao: `inf = (${fm(x.As.pos[0])}; ${fm(x.As.pos[1])}); sup = (${fm(x.As.neg[0])}; ${fm(x.As.neg[1])}) cm²/m`, resultado: Math.max(...x.As.pos, ...x.As.neg), unidade: 'cm²/m', norma: NBR, entradas: { inf0: x.As.pos[0], inf1: x.As.pos[1], sup0: x.As.neg[0], sup1: x.As.neg[1] } });
}
