// Memória detalhada (MD fase 2): cadeia da laje maciça do módulo Edifícios. Chamada por `dimensionarLajes` e por
// `detalharLaje` só com a memória ligada, com os mesmos números usados no cálculo (os que já existem e os recalculados
// aqui pelas mesmas funções determinísticas: beamFlexure, crackWidth, bransonFlecha).
import { passoFase1, passosBransonNervura, type DetBransonNerv, type DetFase1 } from './flechaBranson';
import { beamFlexure, type BeamSection, type Concrete } from '../concrete';
import { vcLaje } from '../building/puncao';
import type { ComposicaoEtapas, FlechasElemento, FlechasInstantaneas } from '../building/flechas';
import { cm2, fm, fp, type Registrador } from './registrador';
import { flexao, passosEtapasFlecha, passosFissuracao } from './vigaConcreto';

const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;

export interface CasoF { caso: string; f: number }

/** Wood-Armer num nó da grelha: valores combinados na faixa de 1 m e a decomposição por caso (valores característicos por caso). */
export interface DetNoWA {
  no: number; x: number; y: number; mx: number; my: number; t: number; tx: number; ty: number;
  inf: [number, number]; sup: [number, number];
  porCaso: { caso: string; f: number; mx: number; my: number; tx: number; ty: number }[];
}
/** Barra e ponta que dão o maior momento por metro (sem Wood-Armer), com os valores por caso. */
export interface DetBarra { barra: number; ponta: 0 | 6; larg: number; x: number; y: number; M: number; porCaso: { caso: string; f: number; Mk: number }[] }
export interface ExtremoLaje { face: 'pos' | 'neg'; dir: 0 | 1; valor: number; wa?: DetNoWA; barra?: DetBarra }
export interface MomentosLaje { rotulo: string; fatores: CasoF[]; wa: boolean; extremos: ExtremoLaje[] }

export interface CtxLajeBase {
  nome: string; pavimento: string; h: number; vaos: [number, number]; inclinada: boolean;
  gRev: number; q: number; gammaC: number; gg: number; gq: number;
  c: Concrete; fydInf: number; fydSup: number; acoInf: string; acoSup: string;
  cobInf: number; cobSup: number; dI: number; dS: number; caa: number; wkLim: number;
}

/** Cargas por pano, geometria e materiais. */
export function registrarLajeBase(mem: Registrador, el: string, x: CtxLajeBase) {
  const c = x.c, gc = c.fck / c.fcd, h = x.h;
  const C = (topico: string, p: Chave) => mem.passo({ etapa: 'cargas', elemento: el, topico, ...p });
  const pp = x.gammaC * h, g = pp + x.gRev, pk = g + x.q, pd = x.gg * g + x.gq * x.q;
  const obsInc = x.inclinada ? { observacao: 'Pano inclinado: a grelha usa o peso por área inclinada (1/cos α); os valores abaixo são por área em planta.' } : {};
  C('Cargas por pano', { descricao: `Peso próprio da laje maciça ${x.nome} (${x.pavimento})`, formula: 'pp = γc,conc·h', expressao: `pp = ${fm(x.gammaC)}·${fm(h)} = ${fm(pp)} kN/m²`, resultado: pp, unidade: 'kN/m²', norma: 'NBR 6120:2019', entradas: { gammaConc: x.gammaC, h }, ...obsInc });
  C('Cargas por pano', { descricao: 'Revestimento e demais permanentes de área do grupo', formula: 'grev', expressao: `grev = ${fm(x.gRev)} kN/m²`, resultado: x.gRev, unidade: 'kN/m²', norma: 'NBR 6120:2019', entradas: {} });
  C('Cargas por pano', { descricao: 'Carga permanente total de área', formula: 'g = pp + grev', expressao: `g = ${fm(pp)} + ${fm(x.gRev)} = ${fm(g)} kN/m²`, resultado: g, unidade: 'kN/m²', entradas: { pp, grev: x.gRev }, observacao: 'Paredes, cargas lineares e regiões de carga lançadas na obra entram na grelha à parte (cargas por caso).' });
  C('Cargas por pano', { descricao: 'Sobrecarga de uso do grupo', formula: 'q', expressao: `q = ${fm(x.q)} kN/m²`, resultado: x.q, unidade: 'kN/m²', norma: 'NBR 6120:2019, Tabela 10', entradas: {} });
  C('Cargas por pano', { descricao: 'Carga característica e de cálculo de área (ELU)', formula: 'pk = g + q; pd = γg·g + γq·q', expressao: `pk = ${fm(g)} + ${fm(x.q)} = ${fm(pk)}; pd = ${fm(x.gg)}·${fm(g)} + ${fm(x.gq)}·${fm(x.q)} = ${fm(pd)} kN/m²`, resultado: pd, unidade: 'kN/m²', norma: 'NBR 8681:2003, 5.1.3', entradas: { g, q: x.q, gg: x.gg, gq: x.gq } });
  C('Geometria do pano', { descricao: 'Vãos do pano (menor e maior lado do retângulo envolvente na direção da malha)', formula: 'ℓ0 (direção 0); ℓ1 (direção 1)', expressao: `ℓ0 = ${fm(x.vaos[0])} m; ℓ1 = ${fm(x.vaos[1])} m`, resultado: Math.min(...x.vaos), unidade: 'm', entradas: { l0: x.vaos[0], l1: x.vaos[1] } });
  const tm = 'Materiais e geometria';
  const D = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tm, ...p });
  D({ descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(c.fck)} / ${fm(gc)} = ${fm(c.fcd)}`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: c.fck, gc } });
  D({ descricao: 'Tensão do bloco retangular', formula: 'σcd = αc·ηc·fcd', expressao: `σcd = ${fm(c.sigmaCd / c.fcd)}·${fm(c.fcd)} = ${fm(c.sigmaCd)}`, resultado: c.sigmaCd, unidade: 'MPa', norma: `${NBR}, 17.2.2`, aConfirmar: c.fck > 40, entradas: { fcd: c.fcd, fator: c.sigmaCd / c.fcd } });
  D({ descricao: 'Resistência média e de cálculo à tração', formula: 'fct,m = 0,3·fck^(2/3); fctd = 0,7·fct,m / γc', expressao: `fct,m = ${fm(c.fctm)}; fctd = 0,7·${fm(c.fctm)} / ${fm(gc)} = ${fm(c.fctd)}`, resultado: c.fctd, unidade: 'MPa', norma: `${NBR}, 8.2.5`, entradas: { fctm: c.fctm, gc } });
  D({ descricao: `Resistência de cálculo do aço da armadura inferior (${x.acoInf})`, formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(x.fydInf)} MPa`, resultado: x.fydInf, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: {} });
  D({ descricao: `Resistência de cálculo do aço da armadura superior (${x.acoSup})`, formula: 'fyd = fyk / γs', expressao: `fyd = ${fm(x.fydSup)} MPa`, resultado: x.fydSup, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: {} });
  D({ descricao: 'Altura útil da armadura inferior (φ10 de referência)', formula: 'd = h − c_inf − φ/2', expressao: `d = ${fm(h)} − ${fm(x.cobInf)} − 0,005 = ${fm(x.dI)}`, resultado: x.dI, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h, cinf: x.cobInf } });
  D({ descricao: 'Altura útil da armadura superior (φ10 de referência)', formula: 'd = h − c_sup − φ/2', expressao: `d = ${fm(h)} − ${fm(x.cobSup)} − 0,005 = ${fm(x.dS)}`, resultado: x.dS, unidade: 'm', norma: `${NBR}, 7.4.7.6`, entradas: { h, csup: x.cobSup } });
}

/** Momentos por metro da grelha (kN·m/m): fatores, valores por nó (Wood-Armer) ou por barra e extremos por direção. */
export function registrarMomentosLaje(mem: Registrador, el: string, m: MomentosLaje) {
  const tp = `Momentos da grelha – ${m.rotulo}`;
  const P = (p: Chave) => mem.passo({ etapa: 'esforcos', elemento: el, topico: tp, ...p });
  const ent: Record<string, number> = {};
  for (const f of m.fatores) ent[`γ_${f.caso}`] = f.f;
  P({ descricao: `Fatores de ponderação por caso (${m.rotulo})`, formula: 'γi por caso de carga', expressao: m.fatores.map((f) => `${f.caso}: ${fm(f.f)}`).join('; ') || '—', resultado: m.rotulo, unidade: '', norma: 'NBR 8681:2003, 5.1.3', entradas: ent });
  const soma = (f: CasoF[], vals: number[]) => f.map((c, i) => `${fm(c.f)}·${fp(vals[i])}`).join(' + ') || '0';
  const vistos = new Set<number>();
  for (const e of m.extremos) {
    const w = e.wa;
    if (!w || vistos.has(w.no)) continue;
    vistos.add(w.no);
    const ic = (k: 'mx' | 'my' | 'tx' | 'ty') => { const o: Record<string, number> = { no: w.no }; w.porCaso.forEach((c) => { o[`γ_${c.caso}`] = c.f; o[`${k}k_${c.caso}`] = c[k]; }); return o; };
    const pos = `nó ${w.no} (x = ${fm(w.x, 3)} m; y = ${fm(w.y, 3)} m)`;
    P({ descricao: `Momento mx no ${pos}: média das barras da direção 0 na faixa de 1 m`, formula: 'mx = Σ γi·mx,k,i', expressao: `mx = ${soma(w.porCaso, w.porCaso.map((c) => c.mx))} = ${fm(w.mx)}`, resultado: w.mx, unidade: 'kN·m/m', norma: 'Wood (1968); Armer (1968)', entradas: ic('mx') });
    P({ descricao: `Momento my no ${pos}: média das barras da direção 1 na faixa de 1 m`, formula: 'my = Σ γi·my,k,i', expressao: `my = ${soma(w.porCaso, w.porCaso.map((c) => c.my))} = ${fm(w.my)}`, resultado: w.my, unidade: 'kN·m/m', norma: 'Wood (1968); Armer (1968)', entradas: ic('my') });
    const ent2: Record<string, number> = { no: w.no };
    w.porCaso.forEach((c) => { ent2[`γ_${c.caso}`] = c.f; ent2[`txk_${c.caso}`] = c.tx; ent2[`tyk_${c.caso}`] = c.ty; });
    P({ descricao: `Momento volvente |mxy| no ${pos}: torção das barras por metro, média nas faixas`, formula: '|mxy| = máx(Σ γi·|txi|; Σ γi·|tyi|)', expressao: `tx = ${soma(w.porCaso, w.porCaso.map((c) => c.tx))} = ${fm(w.tx)}; ty = ${soma(w.porCaso, w.porCaso.map((c) => c.ty))} = ${fm(w.ty)} → |mxy| = ${fm(w.t)}`, resultado: w.t, unidade: 'kN·m/m', norma: 'Wood (1968); Armer (1968)', entradas: ent2 });
  }
  for (const e of m.extremos) {
    const pos = e.face === 'pos', rot = pos ? 'positivo máximo' : 'negativo máximo';
    if (e.wa) {
      const w = e.wa, t = Math.abs(w.t);
      P({ descricao: `Momento ${rot} na direção ${e.dir} (Wood-Armer, nó ${w.no})`, formula: pos ? `m${e.dir ? 'y' : 'x'}* = m${e.dir ? 'y' : 'x'} + |mxy| (se m* < 0 em uma direção, vale 0 e a outra recebe + mxy²/|m|)` : `m${e.dir ? 'y' : 'x'}*′ = m${e.dir ? 'y' : 'x'} − |mxy| (se > 0 em uma direção, vale 0 e a outra recebe − mxy²/|m|)`, expressao: `m* = ${fm(e.dir ? w.my : w.mx)} ${pos ? '+' : '−'} ${fm(t)} → ${fm(e.valor)} kN·m/m`, resultado: e.valor, unidade: 'kN·m/m', norma: 'Wood (1968); Armer (1968)', entradas: { mx: w.mx, my: w.my, mxy: w.t, dir: e.dir, face: pos ? 1 : -1, no: w.no } });
    } else if (e.barra) {
      const b = e.barra;
      const o: Record<string, number> = { barra: b.barra, ponta: b.ponta === 0 ? 0 : 1, larg: b.larg };
      b.porCaso.forEach((c) => { o[`γ_${c.caso}`] = c.f; o[`Mk_${c.caso}`] = c.Mk; });
      P({ descricao: `Momento ${rot} na direção ${e.dir} (barra ${b.barra}, ponta ${b.ponta === 0 ? 'inicial' : 'final'})`, formula: 'm = Σ γi·Mi / largura da faixa da barra', expressao: `m = ${soma(b.porCaso, b.porCaso.map((c) => c.Mk))} = ${fm(e.valor)} kN·m/m`, resultado: e.valor, unidade: 'kN·m/m', norma: 'NBR 6118:2023, 14.7', entradas: o });
    }
  }
}

export interface CtxLajeFlexao {
  c: Concrete; sec: BeamSection; h: number; dI: number; dS: number; fydInf: number; fydSup: number;
  taxaUsuario: number; amin: number;
  /** Momentos da grelha (antes dos mínimos) e finais, por direção. */
  grelha: { pos: [number, number]; neg: [number, number] };
  mPos: [number, number]; mNeg: [number, number];
  /** Momentos mínimos p·ℓ²/x (N2e): divisores (0 = desligado), carga e vão. */
  minimos?: { pos: number; neg: number; p: number; vao: number };
  /** Área necessária antes da fissuração (cm²/m). */
  As0: { pos: [number, number]; neg: [number, number] };
}

/** Momento de dimensionamento (com os mínimos), flexão e armadura necessária por face e direção. */
export function registrarLajeFlexao(mem: Registrador, el: string, x: CtxLajeFlexao) {
  const fk = { c: x.c, sec: x.sec, taxaMin: 0, b: 1, h: x.h };
  for (const face of ['pos', 'neg'] as const) for (const k of [0, 1] as const) {
    const M = face === 'pos' ? x.mPos[k] : x.mNeg[k], Mg = face === 'pos' ? x.grelha.pos[k] : x.grelha.neg[k];
    if (face === 'neg' && !(M < 0)) continue;
    const nome = face === 'pos' ? 'positiva' : 'negativa', topico = `Flexão – armadura ${nome}, direção ${k}`;
    const E = (p: Chave) => mem.passo({ etapa: 'esforcos', elemento: el, topico: `Momento de dimensionamento – ${nome}, direção ${k}`, ...p });
    const dv = x.minimos ? (face === 'pos' ? x.minimos.pos : x.minimos.neg) : 0;
    let Mmin = 0;
    if (x.minimos && dv > 0) {
      Mmin = (x.minimos.p * x.minimos.vao * x.minimos.vao) / dv;
      E({ descricao: `Momento mínimo p·ℓ²/${fm(dv)} (opção)`, formula: 'Mmín = pd·ℓ²/x', expressao: `Mmín = ${fm(x.minimos.p)}·${fm(x.minimos.vao)}²/${fm(dv)} = ${fm(Mmin)} kN·m/m`, resultado: Mmin, unidade: 'kN·m/m', norma: 'Opção do programa de referência', aConfirmar: true, entradas: { p: x.minimos.p, vao: x.minimos.vao, x: dv } });
    }
    E({ descricao: `Momento de dimensionamento ${face === 'pos' ? 'positivo' : 'negativo'}`, formula: face === 'pos' ? 'Md = máx(Mgrelha; Mmín)' : 'Md = mín(Mgrelha; −Mmín)', expressao: `Md = ${face === 'pos' ? 'máx' : 'mín'}(${fm(Mg)}; ${fm(face === 'pos' ? Mmin : -Mmin)}) = ${fm(M)} kN·m/m`, resultado: M, unidade: 'kN·m/m', norma: `${NBR}, 14.7`, entradas: { Mgrelha: Mg, Mmin } });
    const inf = face === 'pos', d = inf ? x.dI : x.dS, fyd = inf ? x.fydInf : x.fydSup;
    let Asf = 0;
    if (M) { flexao(mem, el, topico, fk, Math.abs(M), d, 0.02, fyd, false, 0, inf, { un: 'kN·m/m', semMinimo: true }); Asf = beamFlexure(x.sec, false, Math.abs(M), d, 0.02, x.c, fyd).As; }
    const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico, ...p });
    P({ descricao: 'Armadura mínima por metro', formula: 'As,mín = ρmín·h', expressao: `As,mín = ${fm(x.amin / x.h)}·${fm(x.h)} = ${cm2(x.amin)}/m`, resultado: x.amin, unidade: 'm²/m', norma: `${NBR}, 19.3.3.2 (Tabela 19.1)`, aConfirmar: !(x.taxaUsuario > 0), entradas: { rho: x.amin / x.h, h: x.h }, observacao: x.taxaUsuario > 0 ? 'Taxa mínima informada nas opções.' : 'ρmín = 0,15 % (fck ≤ 30); a variação com o fck segue a confirmar.' });
    const nec = x.As0[face][k];
    P({ descricao: 'Armadura necessária por metro (antes da verificação da fissuração)', formula: 'As = máx(As,mín; As,flexão)', expressao: `As = máx(${cm2(x.amin)}; ${cm2(Asf)}) = ${fm(nec)} cm²/m`, resultado: nec, unidade: 'cm²/m', norma: `${NBR}, 17.3.5.2`, entradas: { amin: x.amin, AsFlexao: Asf } });
  }
}

export interface ItemFissuracao { face: 'pos' | 'neg'; dir: 0 | 1; As0: number; AsFinal: number; iteracoes: number; Mk: number; d: number; phi: number; s: number; AsEf: number; smax: number; wk: number }
export interface CtxLajeFissuracao { c: Concrete; sec: BeamSection; h: number; caa: 1 | 2 | 3 | 4; wkLim: number; itens: ItemFissuracao[]; wk: number }

/** Fissuração na combinação frequente: aumento da armadura e abertura wk por face e direção. */
export function registrarLajeFissuracao(mem: Registrador, el: string, x: CtxLajeFissuracao) {
  const ent: Record<string, number> = { wkLim: x.wkLim };
  for (const it of x.itens) {
    const nome = it.face === 'pos' ? 'positiva' : 'negativa', topico = `Fissuração – armadura ${nome}, direção ${it.dir}`;
    const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico, ...p });
    P({ descricao: 'Barras consideradas na verificação (menor bitola com espaçamento ≥ 10 cm, s ≤ mín(2h; 20 cm))', formula: 's = mín(smáx; π·φ²/4 / As); As,ef = π·φ²/4 / s', expressao: `φ${fm(it.phi)} c/${fm(it.s * 100, 3)} cm → As,ef = ${fm(it.AsEf * 1e4)} cm²/m (As = ${fm(it.AsFinal)} cm²/m)`, resultado: it.AsEf, unidade: 'm²/m', norma: `${NBR}, 20.1 e 17.3.3.2`, entradas: { phi: it.phi, s: it.s, As: it.AsFinal / 1e4, smax: it.smax } });
    if (it.iteracoes > 0) P({ descricao: `Aumento da armadura para limitar wk (${it.iteracoes} passos de 10 %)`, formula: 'As ← 1,1·As até wk ≤ wk,lim (no máximo 20 passos)', expressao: `As = ${fm(it.As0)}·1,1^${it.iteracoes} = ${fm(it.AsFinal)} cm²/m`, resultado: it.AsFinal, unidade: 'cm²/m', norma: `${NBR}, 17.3.3.2`, entradas: { As0: it.As0, passos: it.iteracoes, fator: 1.1, wkLim: x.wkLim } });
    passosFissuracao(mem, el, topico, { sec: x.sec, fc: false, As: it.AsEf, phi: it.phi, d: it.d, Mk: it.Mk, c: x.c, caa: x.caa, h: x.h, b: 1, wkLim: x.wkLim, wk: it.wk });
    ent[`wk_${it.face}${it.dir}`] = it.wk;
  }
  mem.passo({ etapa: 'dimensionamento', elemento: el, topico: 'Fissuração – resumo', descricao: 'Maior abertura característica de fissuras da laje', formula: 'wk = máx(wk de cada face e direção) ≤ wk,lim', expressao: `wk = ${fm(x.wk)} mm ${x.wk <= x.wkLim + 1e-9 ? '≤' : '>'} ${fm(x.wkLim)} mm`, resultado: x.wk, unidade: 'mm', norma: `${NBR}, 13.4.2 (Tabela 13.4)`, entradas: ent });
}

export interface DetCortante { barra: number; no: number; ponta: 1 | 7; larg: number; porCaso: { caso: string; f: number; Vk: number }[] }
export interface CtxLajeCortante {
  c: Concrete; h: number; dI: number; fywd: number; amin: number; AsPos: [number, number]; rhoC: [number, number];
  VSd: [number, number]; VRd1: [number, number]; VRd2: number; Asw: number; comArmadura: boolean; det: (DetCortante | undefined)[];
}

/** Cortante da laje sem armadura transversal (19.4.1) e, se preciso, com armadura (19.4.2). */
export function registrarLajeCortante(mem: Registrador, el: string, x: CtxLajeCortante) {
  const c = x.c, d = x.dI, tp = 'Cortante da laje (19.4)';
  const P = (etapa: 'esforcos' | 'dimensionamento', p: Chave, topico = tp) => mem.passo({ etapa, elemento: el, topico, ...p });
  P('dimensionamento', { descricao: 'Resistência da biela comprimida por metro de largura', formula: 'VRd2 = 0,27·αv2·fcd·d (bw = 1 m)', expressao: `VRd2 = 0,27·${fm(c.av2)}·${fm(c.fcd)}·${fm(d)}·1000 = ${fm(x.VRd2)} kN/m`, resultado: x.VRd2, unidade: 'kN/m', norma: `${NBR}, 19.4.2`, entradas: { av2: c.av2, fcd: c.fcd, d } });
  let Asw = 0;
  for (const k of [0, 1] as const) {
    const dt = x.det[k], V = x.VSd[k];
    if (dt) {
      const o: Record<string, number> = { barra: dt.barra, no: dt.no, larg: dt.larg };
      dt.porCaso.forEach((q) => { o[`γ_${q.caso}`] = q.f; o[`Vk_${q.caso}`] = q.Vk; });
      P('esforcos', { descricao: `Cortante de cálculo na direção ${k}: maior valor nas pontas das barras apoiadas em vigas (barra ${dt.barra}, nó ${dt.no})`, formula: 'VSd = |Σ γi·Vi| / largura da faixa da barra', expressao: `VSd = |${dt.porCaso.map((q) => `${fm(q.f)}·${fp(q.Vk)}`).join(' + ') || '0'}| = ${fm(V)} kN/m`, resultado: V, unidade: 'kN/m', norma: `${NBR}, 19.4`, entradas: o }, `Cortante da laje – direção ${k}`);
    } else P('esforcos', { descricao: `Cortante de cálculo na direção ${k}: nenhum apoio em viga fora do entorno de pilares`, formula: 'VSd', expressao: 'VSd = 0', resultado: 0, unidade: 'kN/m', norma: `${NBR}, 19.4`, entradas: {} }, `Cortante da laje – direção ${k}`);
    P('dimensionamento', { descricao: `Taxa de armadura de flexão positiva da direção ${k}`, formula: 'ρ1 = mín(0,02; máx(As; As,mín) / (b·d))', expressao: `ρ1 = mín(0,02; ${fm(Math.max(x.AsPos[k], x.amin))}/(10⁴·${fm(d)})) = ${fm(x.rhoC[k])}`, resultado: x.rhoC[k], unidade: '', norma: `${NBR}, 19.4.1`, entradas: { As: x.AsPos[k], amin: x.amin, d } }, `Cortante da laje – direção ${k}`);
    const k1 = Math.max(1, 1.6 - d);
    P('dimensionamento', { descricao: `Resistência sem armadura transversal, direção ${k}`, formula: 'VRd1 = τRd·k·(1,2 + 40·ρ1)·bw·d; τRd = 0,25·fctd; k = máx(1; 1,6 − d)', expressao: `VRd1 = 0,25·${fm(c.fctd)}·${fm(k1)}·(1,2 + 40·${fm(x.rhoC[k])})·1·${fm(d)}·1000 = ${fm(x.VRd1[k])} kN/m`, resultado: x.VRd1[k], unidade: 'kN/m', norma: `${NBR}, 19.4.1`, entradas: { fctd: c.fctd, k: k1, rho: x.rhoC[k], d } }, `Cortante da laje – direção ${k}`);
    if (V <= x.VRd1[k] + 1e-9) continue;
    if (V > x.VRd2 || !x.comArmadura) {
      P('dimensionamento', { descricao: V > x.VRd2 ? `VSd > VRd2 na direção ${k}: biela comprimida não atende` : `VSd > VRd1 na direção ${k} e h < 15 cm: a laje não leva armadura transversal`, formula: 'VSd ≤ VRd2; armadura transversal só para h ≥ 15 cm', expressao: `VSd = ${fm(V)} kN/m`, resultado: V, unidade: 'kN/m', norma: `${NBR}, 19.4.2`, entradas: { VRd2: x.VRd2, VRd1: x.VRd1[k], h: x.h } }, `Cortante da laje – direção ${k}`);
      continue;
    }
    const vc = vcLaje(c, x.h, d, x.rhoC[k]), a = (Math.max(0, V - vc) * 1e4) / (0.9 * d * x.fywd * 1000);
    Asw = Math.max(Asw, a);
    P('dimensionamento', { descricao: `Parcela do concreto com armadura transversal, direção ${k}: VRd1 até h = 15 cm e 0,6·fctd·d a partir de 35 cm (interpolação linear)`, formula: 'Vc = VRd1 (h ≤ 15 cm); Vc = 0,6·fctd·d·1000 (h ≥ 35 cm); linear entre eles', expressao: `Vc = ${fm(vc)} kN/m`, resultado: vc, unidade: 'kN/m', norma: `${NBR}, 19.4.2`, aConfirmar: true, entradas: { h: x.h, VRd1: x.VRd1[k], V0: 0.6 * c.fctd * d * 1000 } }, `Cortante da laje – direção ${k}`);
    P('dimensionamento', { descricao: `Armadura transversal necessária, direção ${k}`, formula: 'Asw = (VSd − Vc) / (0,9·d·fywd)', expressao: `Asw = (${fm(V)} − ${fm(vc)})·10⁴/(0,9·${fm(d)}·${fm(x.fywd)}·1000) = ${fm(a)} cm²/m²`, resultado: a, unidade: 'cm²/m²', norma: `${NBR}, 19.4.2`, entradas: { VSd: V, Vc: vc, d, fywd: x.fywd } }, `Cortante da laje – direção ${k}`);
  }
  P('dimensionamento', { descricao: 'Armadura transversal da laje (máximo das direções)', formula: 'Asw = máx(Asw,k)', expressao: `Asw = ${fm(x.Asw)} cm²/m²`, resultado: x.Asw, unidade: 'cm²/m²', norma: `${NBR}, 19.4.2`, entradas: { Asw } });
}

export interface DetFiss { barra: number; dir: 0 | 1; face: 'pos' | 'neg'; M: number; As: number; d: number; Mr: number; Ie: number; I1: number; III: number; f: number; n: number; nFiss: number; media?: { neg: number; pos: number; f: number }[]; el?: number; cr?: number }
export interface CtxLajeFlecha {
  c: Concrete; h?: number; metodo: 'simplificado' | 'etapas' | 'fator'; fatorSimplificado: number; homogeneizada: boolean;
  /** Fichas e nervuradas (MD3b): tópico próprio, Branson da nervura mais fissurada e a fase 1 das alveolares. */
  topico?: string; fissN?: DetBransonNerv; fase1?: DetFase1;
  flQP: number; dG: number; dQ: number; dQqp: number; kappa: number; af: number; fiss?: DetFiss;
  f: FlechasElemento; comp: ComposicaoEtapas; inst: FlechasInstantaneas; qInst: 'total' | 'qp';
  fatA: number; fatC: number; total: number; ativa: number; variavel: number; lim: number; limQ: number;
}

/** Flechas imediatas, fissuração (Branson), diferida e totais, ativa e das variáveis. */
export function registrarLajeFlecha(mem: Registrador, el: string, x: CtxLajeFlecha) {
  const tf = x.topico ?? 'Flecha (ELS-DEF)', c = x.c, f = x.f;
  const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tf, ...p });
  P({ descricao: 'Módulo secante do concreto', formula: 'Ecs = αi·Eci, αi = 0,8 + 0,2·fck/80 ≤ 1', expressao: `Ecs = ${fm(c.Ecs)}`, resultado: c.Ecs, unidade: 'MPa', norma: `${NBR}, 8.2.8`, entradas: { Eci: c.Eci, fck: c.fck } });
  P({ descricao: 'Flechas elásticas da grelha relativas aos apoios (maior flecha entre as linhas da malha da laje)', formula: 'f(qp): quase permanente; f(G): permanentes; f(Q): variáveis; f(ψ2·Q)', expressao: `f(qp) = ${fm(x.flQP * 1000)} mm; f(G) = ${fm(x.dG * 1000)} mm; f(Q) = ${fm(x.dQ * 1000)} mm; f(ψ2·Q) = ${fm(x.dQqp * 1000)} mm`, resultado: x.flQP, unidade: 'm', norma: `${NBR}, 17.3.2.1`, entradas: { flQP: x.flQP, dG: x.dG, dQ: x.dQ, dQqp: x.dQqp }, observacao: 'f(G), f(Q) e f(ψ2·Q) só são calculadas quando o método da NBR (etapas ou fissuração) está em uso.' });
  if (x.fase1) passoFase1(mem, el, tf, x.fase1);
  if (x.fissN) passosBransonNervura(mem, el, tf, x.fissN, x.kappa);
  const fi = x.fiss;
  if (fi) {
    P({ descricao: `Fissuração (Branson) da barra mais fissurada da malha (barra ${fi.barra}, direção ${fi.dir}, armadura ${fi.face === 'pos' ? 'positiva' : 'negativa'}; ${fi.nFiss} de ${fi.n} barras com Ie < Ic)`, formula: 'Mr = α·fct,m·Ic/yt; Ie = (Mr/Ma)³·Ic + [1 − (Mr/Ma)³]·III ≤ Ic; f = Ie/Ic', expressao: `Mr = ${fm(fi.Mr)} kN·m/m; Ma = ${fm(fi.M)} kN·m/m; Ic = ${fm(fi.I1)}; III = ${fm(fi.III)} → Ie = ${fm(fi.Ie)} m⁴/m; Ie/Ic = ${fm(fi.f)}`, resultado: fi.f, unidade: '', norma: `${NBR}, 17.3.1 e 17.3.2.1.1`, aConfirmar: true, entradas: { Mr: fi.Mr, Ma: fi.M, Ic: fi.I1, III: fi.III, Ie: fi.Ie, h: x.h ?? 0, As: fi.As, d: fi.d, homogeneizada: x.homogeneizada ? 1 : 0 }, observacao: x.homogeneizada ? 'Estádio I com a seção homogeneizada (opção).' : 'Estádio I com a seção bruta.' });
    if (fi.media) for (const m of fi.media) P({ descricao: 'Inércia média do vão (opção): [(Ie,apoio + Ie,apoio)/2 + Ie,centro]/2 em Ie/Ic', formula: 'f = [(fneg + fneg)/2 + fpos]/2', expressao: `f = [(${fm(m.neg)} + ${fm(m.neg)})/2 + ${fm(m.pos)}]/2 = ${fm(m.f)}`, resultado: m.f, unidade: '', norma: `${NBR}, 17.3.2.1.1`, aConfirmar: true, entradas: { neg: m.neg, pos: m.pos } });
    if (fi.el !== undefined && fi.cr !== undefined) P({ descricao: 'Fator de fissuração da laje: grelha recomposta com Iz × Ie/Ic em cada barra, razão entre a flecha fissurada e a elástica', formula: 'κ = máx(1; δ,fissurada / δ,elástica)', expressao: `κ = máx(1; ${fm(fi.cr * 1000)}/${fm(fi.el * 1000)}) = ${fm(x.kappa)}`, resultado: x.kappa, unidade: '', norma: `${NBR}, 17.3.2.1.1`, aConfirmar: true, entradas: { cr: fi.cr, el: fi.el } });
  }
  P({ descricao: 'Coeficiente de fluência (ρ′ = 0)', formula: 'αf = Δξ/(1 + 50·ρ′), Δξ = ξ(∞) − ξ(t0)', expressao: `αf = ${fm(x.af)}/(1 + 50·0) = ${fm(x.af)}`, resultado: x.af, unidade: '', norma: `${NBR}, 17.3.2.1.2`, entradas: { dxi: x.af, rho: 0 } });
  if (x.metodo === 'simplificado') P({ descricao: 'Flecha total pelo fator simplificado (opção)', formula: 'f∞ = fator·f(qp)', expressao: `f∞ = ${fm(x.fatorSimplificado)}·${fm(x.flQP * 1000)} = ${fm(x.total * 1000)} mm ${x.total <= x.lim ? '≤' : '>'} ${f.textos.total} = ${fm(x.lim * 1000)} mm`, resultado: x.total, unidade: 'm', norma: `${NBR}, 13.3 e 17.3.2.1.2`, aConfirmar: true, entradas: { fator: x.fatorSimplificado, flQP: x.flQP, limite: x.lim } });
  else if (x.metodo === 'fator') P({ descricao: 'Flecha total (quase permanente com fissuração e fluência)', formula: 'f∞ = f(qp)·κ·(1 + αf) ≤ limite', expressao: `f∞ = ${fm(x.flQP * 1000)}·${fm(x.kappa)}·(1 + ${fm(x.af)}) = ${fm(x.total * 1000)} mm ${x.total <= x.lim ? '≤' : '>'} ${f.textos.total} = ${fm(x.lim * 1000)} mm`, resultado: x.total, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3) e 17.3.2.1.2`, entradas: { flQP: x.flQP, kappa: x.kappa, afR: x.af, limite: x.lim } });
  else passosEtapasFlecha(mem, el, tf, { comp: x.comp, inst: x.inst, rho: 0, qInst: x.qInst, total: x.total, limite: x.lim, limiteTxt: f.textos.total });
  P({ descricao: 'Flecha ativa (após a execução das paredes)', formula: x.fatA > 0 ? 'fa = (f(G) + f(Q))·fator' : 'fa = flecha ativa por etapas', expressao: `fa = ${fm(x.ativa * 1000)} mm ${x.ativa <= f.limites.ativa ? '≤' : '>'} ${f.textos.ativa} = ${fm(f.limites.ativa * 1000)} mm`, resultado: x.ativa, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3)`, aConfirmar: true, entradas: { dG: x.dG, dQ: x.dQ, fator: x.fatA, limite: f.limites.ativa } });
  P({ descricao: 'Flecha das cargas variáveis (vibrações)', formula: x.fatC > 0 ? 'fQ = f(Q)·fator ≤ limite' : 'fQ = f(Q)·κ ≤ limite', expressao: `fQ = ${fm(x.variavel * 1000)} mm ${x.variavel <= x.limQ ? '≤' : '>'} ${f.textos.variavel} = ${fm(x.limQ * 1000)} mm`, resultado: x.variavel, unidade: 'm', norma: `${NBR}, 13.3 (Tabela 13.3)`, entradas: { dQ: x.dQ, fator: x.fatC, kappa: x.kappa, limiteQ: x.limQ } });
}

export interface CtxLajeBarras { face: 'pos' | 'neg'; dir: 0 | 1; nec: number; h: number; smax: number; smin: number; phiMin: number; tabela: string; phi: number; s: number; As: number; cabe: boolean }
/** Bitola e espaçamento da armadura necessária pela tabela de armadura (menor bitola com espaçamento dentro dos limites). */
export function registrarLajeBarras(mem: Registrador, el: string, x: CtxLajeBarras) {
  const nome = x.face === 'pos' ? 'positiva' : 'negativa';
  mem.passo({ etapa: 'detalhamento', elemento: el, topico: `Barras – armadura ${nome}, direção ${x.dir}`, descricao: `Barras adotadas (tabela "${x.tabela}"): menor bitola ≥ φ${fm(x.phiMin)} com espaçamento ≥ ${fm(x.smin * 100)} cm e ≤ ${fm(x.smax * 100)} cm${x.cabe ? '' : ' — não cabe'}`, formula: 's = ⌊mín(smáx; π·φ²/4 / As)⌋ (cm); As,ef = π·φ²/4 / s ≥ As', expressao: `φ${fm(x.phi)} c/${fm(x.s * 100, 3)} cm → As,ef = ${fm(x.As * 1e4)} cm²/m ${x.As >= x.nec - 1e-12 ? '≥' : '<'} ${fm(x.nec * 1e4)} cm²/m`, resultado: x.As, unidade: 'm²/m', norma: 'NBR 6118:2023, 20.1 e 18.3.2.2', entradas: { phi: x.phi, s: x.s, As: x.nec, smax: x.smax, smin: x.smin, cabe: x.cabe ? 1 : 0 } });
}

export interface LadoNegativo { rotulo: string; x0: number; pct: number; vao: number; minViga: number; cap: number; diag: number; valor: number }
export interface CtxLajeNegativo {
  tipo: 'continua' | 'borda'; borda: string; AsCalc: number; base: number; AsRef: number; phi: number; s: number; AsEf: number;
  lb: number; lbn: number; aL: number; perna: number; passo: number; lados: LadoNegativo[]; comp: number;
  /** Negativo de borda: gancho (m) e parcela do lado de fora (m). */
  gancho?: number; fora?: number;
}

/** Negativos sobre uma borda: armadura, ancoragem, comprimentos de cada lado do eixo do apoio e comprimento da barra. */
export function registrarLajeNegativo(mem: Registrador, el: string, x: CtxLajeNegativo) {
  const tp = `Negativos – ${x.borda}`, N = (p: Chave) => mem.passo({ etapa: 'detalhamento', elemento: el, topico: tp, ...p });
  const cont = x.tipo === 'continua';
  N({ descricao: cont ? 'Armadura negativa necessária sobre a borda contínua (maior das duas lajes; ρmín da laje mais alta)' : 'Armadura negativa de borda sem continuidade (19.3.3.2): máx(0,67·ρmín·h; armadura do momento da grelha junto à borda)', formula: cont ? 'As = máx(ρmín·hmáx; As,neg,A; As,neg,B)' : 'As = máx(0,67·ρmín·h; As(Mmín da grelha junto à borda))', expressao: `As = ${fm(x.AsCalc * 1e4)} cm²/m`, resultado: x.AsCalc, unidade: 'm²/m', norma: `${NBR}, 19.3.3.2 (Tabela 19.1)`, entradas: { rhoMin: 0.0015 } });
  if (x.base > 0) N({ descricao: 'Armadura de reforço sobre a base superior', formula: 'As,ref = As − As,base', expressao: `As,ref = ${fm(x.AsCalc * 1e4)} − ${fm(x.base * 1e4)} = ${fm(x.AsRef * 1e4)} cm²/m`, resultado: x.AsRef, unidade: 'm²/m', norma: `${NBR}, 19.3`, entradas: { As: x.AsCalc, Asbase: x.base } });
  N({ descricao: 'Barras adotadas', formula: 'As,ef = π·φ²/4 / s', expressao: `φ${fm(x.phi)} c/${fm(x.s * 100, 3)} cm → As,ef = ${fm(x.AsEf * 1e4)} cm²/m`, resultado: x.AsEf, unidade: 'm²/m', norma: `${NBR}, 20.1`, entradas: { phi: x.phi, s: x.s, AsRef: x.AsRef } });
  N({ descricao: 'Comprimento de ancoragem necessário', formula: 'lb,nec = máx(lb·As,calc/As,ef; 0,3·lb; 10φ; 10 cm)', expressao: `lb,nec = máx(${fm(x.lb)}·${fm(x.AsRef * 1e4)}/${fm(x.AsEf * 1e4)}; 0,3·${fm(x.lb)}; ${fm(10 * x.phi / 1000)}; 0,1) = ${fm(x.lbn)} m`, resultado: x.lbn, unidade: 'm', norma: `${NBR}, 9.4.2.5`, entradas: { lb: x.lb, AsCalc: x.AsRef, AsEf: x.AsEf, phi: x.phi } });
  for (const l of x.lados) {
    if (cont) N({ descricao: `Comprimento do negativo do lado ${l.rotulo}: limitado ao pano, no mínimo a porcentagem do vão, a metade da viga + 10φ e o diagrama decalado mais a ancoragem`, formula: 'ℓ = mín(cap; máx(pct·vão; bw/2 + 10φ; x0 + aℓ + lb,nec)), x0 > 0', expressao: `ℓ = mín(${fm(l.cap)}; máx(${fm(l.pct)}·${fm(l.vao)}; ${fm(l.minViga)}; ${fm(l.diag)})) = ${fm(l.valor)} m`, resultado: l.valor, unidade: 'm', norma: `${NBR}, 9.4.2.5 e 19.4`, aConfirmar: true, entradas: { cap: l.cap, pct: l.pct, vao: l.vao, minViga: l.minViga, diag: l.diag, x0: l.x0, aL: x.aL, lbn: x.lbn } });
    else N({ descricao: 'Comprimento do negativo para dentro da laje: a metade da viga mais a porcentagem do menor vão, ou o diagrama decalado mais a ancoragem, limitado ao pano', formula: 'ℓ = mín(cap; máx(bw/2 + pct·vão; x0 + aℓ + lb,nec))', expressao: `ℓ = mín(${fm(l.cap)}; máx(${fm(l.minViga)} + ${fm(l.pct)}·${fm(l.vao)}; ${fm(l.diag)})) = ${fm(l.valor)} m`, resultado: l.valor, unidade: 'm', norma: `${NBR}, 19.3.3.2 e 9.4.2.5`, aConfirmar: true, entradas: { cap: l.cap, pct: l.pct, vao: l.vao, bw2: l.minViga, diag: l.diag, x0: l.x0, aL: x.aL, lbn: x.lbn } });
  }
  const somaL = x.lados.reduce((t, l) => t + l.valor, 0);
  if (cont) N({ descricao: 'Comprimento desenvolvido da barra (arredondado para cima)', formula: 'C = ⌈ℓ1 + ℓ2 + 2·perna⌉', expressao: `C = ⌈${fm(somaL)} + 2·${fm(x.perna)}⌉ = ${fm(x.comp)} m`, resultado: x.comp, unidade: 'm', norma: `${NBR}, 9.4`, entradas: { l1: x.lados[0].valor, l2: x.lados[1].valor, perna: x.perna, passo: x.passo } });
  else N({ descricao: 'Comprimento desenvolvido da barra (arredondado para cima)', formula: 'C = ⌈ℓ + fora + perna + gancho⌉', expressao: `C = ⌈${fm(somaL)} + ${fm(x.fora ?? 0)} + ${fm(x.perna)} + ${fm(x.gancho ?? 0)}⌉ = ${fm(x.comp)} m`, resultado: x.comp, unidade: 'm', norma: `${NBR}, 9.4`, entradas: { dentro: x.lados[0].valor, fora: x.fora ?? 0, perna: x.perna, gancho: x.gancho ?? 0, passo: x.passo } });
}

export interface CtxLajePositiva { dir: 0 | 1; phi: number; s: number; As: number; AsNec: number; secundaria: boolean }
/** Armadura positiva adotada por direção (malha sobre o pano). */
export function registrarLajePositivas(mem: Registrador, el: string, pos: CtxLajePositiva[]) {
  for (const p of pos) mem.passo({ etapa: 'detalhamento', elemento: el, topico: 'Positivas – malha', descricao: `Armadura positiva adotada na direção ${p.dir}${p.secundaria ? ' (secundária, s ≤ 33 cm)' : ''}`, formula: 'As,ef = π·φ²/4 / s ≥ As,nec (máximo dos pavimentos do grupo)', expressao: `φ${fm(p.phi)} c/${fm(p.s * 100, 3)} cm → As,ef = ${fm(p.As)} cm²/m ${p.As >= p.AsNec - 1e-3 ? '≥' : '<'} ${fm(p.AsNec)} cm²/m`, resultado: p.As, unidade: 'cm²/m', norma: `${NBR}, 20.1`, entradas: { phi: p.phi, s: p.s, AsNec: p.AsNec } });
}
