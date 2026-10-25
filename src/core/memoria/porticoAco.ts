// Memória detalhada do pórtico 2D (MD8): barra de aço (NBR 8800:2008). `registrarAco` é chamada por `designSteel` só com a memória
// ligada e traz a cadeia de capacidade (flambagem local, compressão, flexão com FLT, FLM e FLA, cortante e interação) com os
// números do próprio cálculo (MN, m, MPa); `registrarAcoEsforcos` (chamada por `runDesign`) traz os esforços de cálculo por caso e a flecha.
import { P } from '../math';
import { sampleXs } from '../estacoes';
import type { SteelDesign, SteelInput, SteelProps } from '../steel';
import { fm, type Registrador } from './registrador';
import { composicao, flechaElastica, type CtxPortico } from './porticoBase';
import { passosComposicao } from './porticoViga';

const NBR = 'NBR 8800:2008';
type Ch = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;

export interface ItemAco { rot: string; valor: number; ent: Record<string, number> }

export interface DadosAco {
  inp: SteelInput; p: SteelProps; E: number; G: number; rt: number; Qs: number; Qa: number; Q: number;
  Nex: number; Ney: number; Nez: number | null; Ne: number; lambda0: number; chi: number; NcRd: number; NtRd: number; slenderness: number;
  Mpl: number; sr: number; VRd: number; trace: ItemAco[]; design: SteelDesign;
}

export function registrarAco(mem: Registrador, el: string, d: DadosAco) {
  const { inp, p, E, G, rt, design: sd } = d, s = inp.shape, fy = inp.fy, g = inp.gammaA1;
  const P_ = (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Ch) => mem.passo({ etapa, elemento: el, topico, ...q });
  const D = (topico: string, q: Ch) => P_('dimensionamento', topico, q);

  // ---- material e seção
  let t = 'Material e seção';
  D(t, { descricao: 'Aço estrutural e módulos de elasticidade', formula: 'fy; γa1; E; G', expressao: `fy = ${fm(fy)} MPa; γa1 = ${fm(g)}; E = ${fm(E)} MPa; G = ${fm(G)} MPa`, resultado: fy, unidade: 'MPa', norma: `${NBR}, 4.5.2.4 e 4.9`, entradas: { fy, gammaA1: g, E, G } });
  D(t, { descricao: `Propriedades geométricas da seção (${s.kind === 'ishape' ? 'perfil I' : s.kind === 'tube' ? 'tubo circular' : 'caixão'}), calculadas pela geometria`, formula: 'A; Ix; Iy; Zx; Wx; rx; ry; J; Cw; Aw', expressao: `A = ${fm(p.A)} m²; Ix = ${fm(p.Ix)} m⁴; Iy = ${fm(p.Iy)} m⁴; Zx = ${fm(p.Zx)} m³; Wx = ${fm(p.Wx)} m³; rx = ${fm(p.rx)} m; ry = ${fm(p.ry)} m; J = ${fm(p.J)} m⁴; Cw = ${fm(p.Cw)} m⁶`, resultado: p.A, unidade: 'm²', entradas: { ...p, ...(s.kind === 'ishape' ? { bf: s.bf, tf: s.tf, tw: s.tw, h: s.h } : s.kind === 'tube' ? { d: s.d, t: s.t } : s.kind === 'box' ? { b: s.b, h: s.h, t: s.t } : {}) } });
  D(t, { descricao: 'Comprimentos: da barra, de flambagem no plano e fora do plano (destravado lateralmente)', formula: 'L; ℓe,in; ℓe,out', expressao: `L = ${fm(inp.L)} m; ℓe,in = ${fm(inp.leIn)} m; ℓe,out = ${fm(inp.leOut)} m`, resultado: inp.L, unidade: 'm', entradas: { L: inp.L, leIn: inp.leIn, leOut: inp.leOut } });

  // ---- flambagem local (Anexo F)
  t = 'Flambagem local (Anexo F)';
  if (s.kind === 'ishape') {
    const bt = s.bf / 2 / s.tf, lim = 0.56 * rt;
    D(t, { descricao: 'Esbeltez da mesa (elemento AL) e limite', formula: 'b/t = (bf/2)/tf; limite 0,56·√(E/fy)', expressao: `b/t = ${fm(bt)}; limite = ${fm(lim)}${bt > lim ? ' → mesa esbelta' : ' → compacta'}`, resultado: bt, unidade: '', norma: `${NBR}, Anexo F (Tabela F.1)`, entradas: { bf: s.bf, tf: s.tf, E, fy } });
    D(t, { descricao: 'Fator de redução da mesa', formula: 'Qs = 1 (b/t ≤ 0,56√(E/fy)); 1,415 − 0,74·(b/t)·√(fy/E) (até 1,03√(E/fy)); 0,69E/(fy·(b/t)²)', expressao: `Qs = ${fm(d.Qs)}`, resultado: d.Qs, unidade: '', norma: `${NBR}, Anexo F`, entradas: { bt, E, fy } });
    const hw = s.h - 2 * s.tf, ht = hw / s.tw;
    D(t, { descricao: 'Esbeltez da alma (elemento AA) e limite', formula: 'h/tw; limite 1,49·√(E/fy)', expressao: `h/tw = ${fm(ht)}; limite = ${fm(1.49 * rt)}`, resultado: ht, unidade: '', norma: `${NBR}, Anexo F (Tabela F.1)`, entradas: { h: s.h, tf: s.tf, tw: s.tw, E, fy } });
    const bef = ht > 1.49 * rt ? Math.min(hw, 1.92 * s.tw * rt * (1 - (0.34 / ht) * rt)) : hw;
    D(t, { descricao: 'Largura efetiva da alma e fator de redução', formula: 'bef = mín(h; 1,92·tw·√(E/fy)·[1 − 0,34/(h/tw)·√(E/fy)]); Qa = (A − (h − bef)·tw)/A', expressao: `bef = ${fm(bef)} m; Qa = ${fm(d.Qa)}`, resultado: d.Qa, unidade: '', norma: `${NBR}, Anexo F`, entradas: { hw, tw: s.tw, ht, bef, A: p.A, E, fy } });
  } else if (s.kind === 'tube') {
    D(t, { descricao: 'Esbeltez do tubo e fator de redução', formula: 'D/t; Qs = 0,038E/(fy·D/t) + 2/3 (D/t > 0,11E/fy)', expressao: `D/t = ${fm(s.d / s.t)}; limite 0,11E/fy = ${fm((0.11 * E) / fy)}; Qs = ${fm(d.Qs)}`, resultado: d.Qs, unidade: '', norma: `${NBR}, Anexo F`, entradas: { d: s.d, t: s.t, E, fy } });
  } else if (s.kind === 'box') {
    D(t, { descricao: 'Largura efetiva das paredes do caixão e fator de redução', formula: 'bef = mín(b; 1,92·t·√(E/fy)·[1 − 0,38/(b/t)·√(E/fy)]); Qa = Aef/A', expressao: `Qa = ${fm(d.Qa)}`, resultado: d.Qa, unidade: '', norma: `${NBR}, Anexo F`, entradas: { b: s.b, h: s.h, t: s.t, E, fy, A: p.A } });
  }
  D(t, { descricao: 'Fator de redução total', formula: 'Q = Qs·Qa', expressao: `Q = ${fm(d.Qs)}·${fm(d.Qa)} = ${fm(d.Q)}`, resultado: d.Q, unidade: '', norma: `${NBR}, Anexo F`, entradas: { Qs: d.Qs, Qa: d.Qa } });

  // ---- compressão
  t = 'Compressão (item 5.3)';
  D(t, { descricao: 'Carga crítica de Euler em torno de x (no plano) e de y (fora do plano)', formula: 'Ne = π²·E·I/ℓe²', expressao: `Nex = π²·${fm(E)}·${fm(p.Ix)}/${fm(inp.leIn)}² = ${fm(d.Nex)} MN; Ney = π²·${fm(E)}·${fm(p.Iy)}/${fm(inp.leOut)}² = ${fm(d.Ney)} MN`, resultado: Math.min(d.Nex, d.Ney), unidade: 'MN', norma: `${NBR}, Anexo E`, entradas: { E, Ix: p.Ix, leIn: inp.leIn, Iy: p.Iy, leOut: inp.leOut } });
  if (d.Nez !== null) D(t, { descricao: 'Carga crítica de flambagem por torção', formula: 'Nez = [π²·E·Cw/ℓe,out² + G·J]/r0², r0² = rx² + ry²', expressao: `Nez = ${fm(d.Nez)} MN`, resultado: d.Nez, unidade: 'MN', norma: `${NBR}, Anexo E`, entradas: { E, G, Cw: p.Cw, J: p.J, leOut: inp.leOut, rx: p.rx, ry: p.ry } });
  D(t, { descricao: 'Índice de esbeltez reduzido e fator χ', formula: 'λ0 = √(Q·A·fy/Ne); χ = 0,658^(λ0²) (λ0 ≤ 1,5) ou 0,877/λ0²', expressao: `Ne = ${fm(d.Ne)} MN; λ0 = ${fm(d.lambda0)}; χ = ${fm(d.chi)}`, resultado: d.chi, unidade: '', norma: `${NBR}, 5.3.3`, entradas: { Q: d.Q, A: p.A, fy, Ne: d.Ne, lambda0: d.lambda0 } });
  D(t, { descricao: 'Resistências de cálculo à compressão e à tração', formula: 'Nc,Rd = χ·Q·A·fy/γa1; Nt,Rd = A·fy/γa1', expressao: `Nc,Rd = ${fm(d.NcRd * 1000)} kN; Nt,Rd = ${fm(d.NtRd * 1000)} kN`, resultado: d.NcRd, unidade: 'MN', norma: `${NBR}, 5.3.2 e 5.2.2`, entradas: { chi: d.chi, Q: d.Q, A: p.A, fy, gammaA1: g, NcRd: d.NcRd, NtRd: d.NtRd } });
  D(t, { descricao: 'Esbeltez da barra comprimida (limite 200)', formula: 'KL/r = máx(ℓe,in/rx; ℓe,out/ry)', expressao: `KL/r = ${fm(d.slenderness)} ${d.slenderness <= 200 ? '≤' : '>'} 200`, resultado: d.slenderness, unidade: '', norma: `${NBR}, 5.3.4.1`, entradas: { leIn: inp.leIn, rx: p.rx, leOut: inp.leOut, ry: p.ry } });

  // ---- flexão
  t = 'Flexão (Anexo G) – combinação determinante';
  D(t, { descricao: 'Momento de plastificação e momento de início de escoamento', formula: 'Mpl = Zx·fy; Mr = (fy − σr)·Wx, σr = 0,30·fy', expressao: `Mpl = ${fm(d.Mpl * 1000)} kN·m; σr = ${fm(d.sr)} MPa`, resultado: d.Mpl, unidade: 'MN·m', norma: `${NBR}, Anexo G`, entradas: { Zx: p.Zx, fy, Wx: p.Wx, sr: d.sr, Mpl: d.Mpl } });
  const chk = sd.check;
  for (const it of d.trace) {
    const nome = it.rot.startsWith('FLT') ? 'FLT (flambagem lateral com torção), Lb = ℓe,out' : it.rot.startsWith('FLM') ? 'FLM (flambagem local da mesa)' : it.rot.startsWith('FLA') ? 'FLA (flambagem local da alma)' : it.rot;
    D(t, { descricao: `${nome}: momento resistente característico`, formula: it.rot.startsWith('FLT') ? 'λ = Lb/ry; MRk = Mpl (λ ≤ λp); Cb·[Mpl − (Mpl − Mr)·(λ − λp)/(λr − λp)] ≤ Mpl (λp < λ ≤ λr); Mcr ≤ Mpl (λ > λr)' : 'MRk = Mpl (λ ≤ λp); interpolação linear até Mr (λp < λ ≤ λr); 0,69·E·Wx/λ² (λ > λr, mesa)', expressao: `λ = ${fm(it.ent.lam)}; λp = ${fm(it.ent.lp)}; λr = ${fm(it.ent.lr)} → MRk = ${fm(it.valor * 1000)} kN·m`, resultado: it.valor, unidade: 'MN·m', norma: `${NBR}, Anexo G (Tabela G.1)`, entradas: it.ent });
  }
  if (chk) D(t, { descricao: 'Momento resistente de cálculo (menor dos estados-limite, limitado a 1,5·Wx·fy)', formula: 'MRd = mín(Mpl; MRk,FLT; MRk,FLM; MRk,FLA; 1,5·Wx·fy)/γa1', expressao: `MRd = ${fm(chk.MRd)} kN·m (Cb = ${fm(chk.Cb)})`, resultado: chk.MRd / 1000, unidade: 'MN·m', norma: `${NBR}, 5.4.2`, entradas: { Mpl: d.Mpl, limite15: 1.5 * p.Wx * fy, gammaA1: g, Cb: chk.Cb, MRd: chk.MRd / 1000, ...Object.fromEntries(d.trace.map((it) => [`MRk_${it.rot.split(' ')[0]}`, it.valor])) } });

  // ---- cortante
  t = 'Cisalhamento (item 5.4.3)';
  D(t, { descricao: 'Força cortante resistente de cálculo', formula: 'Vpl = 0,6·Aw·fy; VRd = Vpl/γa1 (λ ≤ λp), (λp/λ)·Vpl/γa1 (λp < λ ≤ λr), 1,24·(λp/λ)²·Vpl/γa1 (λ > λr)', expressao: `VRd = ${fm(d.VRd * 1000)} kN`, resultado: d.VRd, unidade: 'MN', norma: `${NBR}, 5.4.3`, entradas: { Aw: p.Aw, fy, E, gammaA1: g, VRd: d.VRd, ...(s.kind === 'ishape' ? { lam: (s.h - 2 * s.tf) / s.tw } : s.kind === 'box' ? { lam: (s.h - 3 * s.t) / s.t } : {}) } });

  // ---- combinações e interação
  t = 'Combinações ELU – interação';
  sd.checks.forEach((k, i) => {
    const cb = inp.combos[i];
    D(t, { descricao: `${k.combo}: N = ${fm(k.NSd)} kN (${k.NSd >= 0 ? 'compressão' : 'tração'}), Mmáx = ${fm(Math.abs(cb.Mmax))} kN·m, V = ${fm(k.VSd)} kN, Cb = ${fm(k.Cb)}, B1 = ${fm(k.B1)}`, formula: 'N/NRd ≥ 0,2: N/NRd + 8/9·MSd/MRd ≤ 1; senão N/(2NRd) + MSd/MRd ≤ 1; VSd/VRd ≤ 1', expressao: `interação = ${fm(k.interaction)}; util = ${fm(k.util)}`, resultado: k.util, unidade: '', norma: `${NBR}, 5.5.1.2 e 5.4.3`, entradas: { NSd: k.NSd, NRd: k.NRd, MSd: k.MSd, MRd: k.MRd, VSd: k.VSd, VRd: k.VRd, B1: k.B1, Cb: k.Cb, interaction: k.interaction, util: k.util, Mmax: cb.Mmax } });
  });
  if (chk) {
    const kk = sd.checks.indexOf(chk), cb = inp.combos[kk];
    const Mmax = Math.abs(cb.Mmax) / 1000;
    D(t, { descricao: `Fator de modificação para diagrama de momento não uniforme (combinação determinante ${chk.combo})`, formula: 'Cb = 12,5·Mmáx/(2,5·Mmáx + 3·MA + 4·MB + 3·MC) ≤ 3 (barra sem travamento intermediário); Cb = 1 caso contrário', expressao: `Cb = ${fm(chk.Cb)}`, resultado: chk.Cb, unidade: '', norma: `${NBR}, Anexo G`, entradas: { Mmax: cb.Mmax, MA: cb.MA, MB: cb.MB, MC: cb.MC, semTravamento: inp.leOut >= inp.L - 1e-9 ? 1 : 0, Cb: chk.Cb } });
    if (chk.NSd > 0) {
      const a0 = Math.abs(cb.Mend0), aL = Math.abs(cb.MendL), M2 = Math.max(a0, aL), M1 = Math.min(a0, aL);
      const ratio = M2 > 0 ? (cb.Mend0 * cb.MendL > 0 ? M1 / M2 : -M1 / M2) : 0;
      const Cm = cb.transverse ? 1 : 0.6 - 0.4 * -ratio, Ne1 = (Math.PI ** 2 * E * p.Ix) / inp.L ** 2;
      D(t, { descricao: 'Amplificação dos momentos (efeito P-δ), com Ne1 no plano de flexão e ℓ = L', formula: 'B1 = Cm/(1 − NSd/Ne1) ≥ 1; Cm = 0,6 − 0,4·M1/M2 (carga transversal: 1)', expressao: `Cm = ${fm(Cm)}; Ne1 = ${fm(Ne1)} MN; B1 = ${fm(chk.B1)}; MSd = B1·Mmáx = ${fm(chk.MSd)} kN·m`, resultado: chk.B1, unidade: '', norma: `${NBR}, 5.5.1.2 e Anexo D`, entradas: { Cm, Ne1, N: chk.NSd / 1000, B1: chk.B1, Mend0: cb.Mend0, MendL: cb.MendL, transverse: cb.transverse ? 1 : 0, Mmax, MSd: chk.MSd } });
    } else D(t, { descricao: 'Tração: sem amplificação (B1 = 1)', formula: 'MSd = Mmáx', expressao: `MSd = ${fm(chk.MSd)} kN·m`, resultado: chk.MSd, unidade: 'kN·m', entradas: { Mmax: cb.Mmax } });
    const nr = Math.abs(chk.NSd) / chk.NRd, inter = nr >= 0.2 ? nr + (8 / 9) * (chk.MSd / chk.MRd) : nr / 2 + chk.MSd / chk.MRd, vr = Math.abs(chk.VSd) / chk.VRd;
    D(t, { descricao: 'Equação de interação normal-momento e relação de cisalhamento', formula: nr >= 0.2 ? 'N/NRd + (8/9)·MSd/MRd ≤ 1' : 'N/(2·NRd) + MSd/MRd ≤ 1', expressao: `|N|/NRd = ${fm(nr)}; interação = ${fm(inter)}; VSd/VRd = ${fm(vr)}; util = máx = ${fm(chk.util)}`, resultado: chk.util, unidade: '', norma: `${NBR}, 5.5.1.2`, entradas: { NSd: chk.NSd, NRd: chk.NRd, MSd: chk.MSd, MRd: chk.MRd, VSd: chk.VSd, VRd: chk.VRd, interaction: chk.interaction, util: chk.util } });
  }
  for (const m of sd.messages) D('Observações', { descricao: m, formula: '—', expressao: m, resultado: sd.status, unidade: '', entradas: {} });
}

/** Esforços de cálculo por caso (combinação determinante) e flecha da barra de aço. */
export function registrarAcoEsforcos(mem: Registrador, c: CtxPortico, x: { el: string; k: number; L: number; sd: SteelDesign; viga: boolean; cantilever: boolean; livreJ: boolean; defl?: { f: number; limit: number; ratio: number; combo: string } }) {
  if (!mem.aceita(x.el)) return;
  const te = 'Esforços da combinação determinante';
  const chk = x.sd.check;
  if (chk) {
    const e = c.eluRes.find((y) => y.cb.name === chk.combo);
    if (e) {
      const m = e.r.members[x.k];
      let Mm = 0, xm = 0, V = 0, xv = 0;
      for (const xx of sampleXs(x.L, [m.M])) { const M = Math.abs(P.evaluate(m.M, xx)); if (M > Mm) { Mm = M; xm = xx; } const v = Math.abs(P.evaluate(m.V, xx)); if (v > V) { V = v; xv = xx; } }
      passosComposicao(mem, x.el, te, `Momento máximo (|M|) da barra na combinação ${chk.combo}`, composicao(c, e, x.k, 'M', xm, true), P.evaluate(m.M, xm), 'kN·m', 'M');
      passosComposicao(mem, x.el, te, 'Cortante máximo (|V|)', composicao(c, e, x.k, 'V', xv, true), P.evaluate(m.V, xv), 'kN', 'V');
      passosComposicao(mem, x.el, te, 'Normal na base (nó i)', composicao(c, e, x.k, 'N', 0, true), P.evaluate(m.N, 0), 'kN', 'N');
      passosComposicao(mem, x.el, te, 'Normal no topo (nó j)', composicao(c, e, x.k, 'N', x.L, true), P.evaluate(m.N, x.L), 'kN', 'N');
    }
  }
  if (x.viga && x.defl) {
    const e = c.rareRes.find((y) => y.cb.name === x.defl!.combo);
    if (e) {
      const fe = flechaElastica(e.r, x.k, x.L, x.cantilever, x.livreJ);
      mem.passo({ etapa: 'dimensionamento', elemento: x.el, topico: 'Flecha (ELS-DEF)', descricao: `Flecha elástica na combinação rara determinante ${x.defl.combo} contra L/250 (balanço 2L/250)`, formula: 'f = máx |v(x) − corda|; f ≤ L/250', expressao: `f = ${fm(fe.f * 1000)} mm ${fe.f <= x.defl.limit ? '≤' : '>'} ${fm(x.defl.limit * 1000)} mm`, resultado: fe.f, unidade: 'm', norma: `${NBR}, Anexo C (Tabela C.1)`, entradas: { v0: fe.v0, vL: fe.vL, xm: fe.x, vx: fe.v, L: x.L, balanco: x.cantilever ? 1 : 0, livreJ: x.livreJ ? 1 : 0, limite: x.defl.limit } });
    }
  }
}
