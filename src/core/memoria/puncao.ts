// Memória detalhada (MD fase 4): punção e cortante no entorno do pilar das lajes lisas (maciças, nervuradas com ábaco) e do radier.
// Chamada por `puncaoEdificio`, `puncaoAbacos` e `puncaoRadier` só com a memória ligada, com os mesmos números do cálculo:
// os intermediários que `verificarPuncao` não guarda vêm em `ResultadoVerificacao.det` (ligado por `EntradaPuncao.detalhar`).
// Os contornos entram com todos os segmentos (x0, y0, x1, y1) dentro da laje, para o teste refazer u, centroide, Wp e τSd.
import { barArea, type Concrete } from '../concrete';
import {
  areaDentro, curvaAfastada, propriedadesContorno,
  type DetSolicitacao, type EntradaPuncao, type ParametrosPuncao, type ResultadoVerificacao, type Tensao,
} from '../building/puncao';
import { fm, fp, type Registrador, type ValorMemoria } from './registrador';

const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NOMES_C = ['C', 'C′', 'C″'] as const;

/** Taxa de armadura de flexão: ρ = √(ρx·ρy) ≤ 2 %, com ρi = máx(Asi; Asmín,i)/(bi·d). `viga`: 0,15 % de h (apoio em viga chata). */
export interface RhoDet { h: number; As?: [number, number]; b?: [number, number]; viga?: boolean; faceTexto?: string }

export interface CtxVerif {
  /** Sufixo dos tópicos (região do ábaco). */
  rot?: string;
  c: Concrete; ent: EntradaPuncao; par: ParametrosPuncao; v: ResultadoVerificacao;
  cob: number; fyd: number; limFywd: number; rho: RhoDet;
  /** "pilar" ou "ábaco" (o ábaco faz o papel do pilar na verificação fora dele). */
  apoio?: string;
  /** Origem da carga distribuída qd (varredura de cortante e, no radier, redução de FSd). */
  carga?: { descricao: string; formula: string; expressao: string; entradas: Record<string, ValorMemoria> };
}

const json = (t: Tensao) => JSON.stringify(t.pecas.map(([a, z]) => [a[0], a[1], z[0], z[1]]));

// ------------------------------------------------------------------ solicitação (FSd e momentos)

/** FSd por caso (reação do pilar na grelha) e os momentos que a laje transmite ao pilar, até os eixos u e v do pilar. */
export function registrarSolicitacaoPuncao(mem: Registrador, el: string, s: DetSolicitacao, comb = 'γg·G + γq·Q (ELU)') {
  const tp = 'Solicitação (FSd e momentos)';
  const P = (p: Chave) => mem.passo({ etapa: 'esforcos', elemento: el, topico: tp, ...p });
  const parc = s.casos.filter((q) => q.f !== 0 || q.R !== 0);
  const ent: Record<string, ValorMemoria> = { combinacao: comb };
  parc.forEach((q) => { ent[`γ_${q.caso}`] = q.f; ent[`R_${q.caso}`] = q.R; });
  P({ descricao: `Força de punção de cálculo FSd: reação vertical do pilar na grelha do pavimento, combinação ${comb}`, formula: 'FSd = Σ γi·Ri', expressao: `FSd = ${parc.map((q) => `${fm(q.f)}·${fp(q.R)}`).join(' + ') || '0'} = ${fm(s.F)} kN`, resultado: s.F, unidade: 'kN', norma: `${NBR}, 19.5.2.1`, entradas: ent });
  if (s.molas) {
    const m = s.molas, parcs = (_k: 'rx' | 'ry') => m.casos.filter((q) => q.f !== 0);
    for (const [k, rot, kk] of [['rx', 'x', m.kx], ['ry', 'y', m.ky]] as const) {
      const e: Record<string, ValorMemoria> = { no: m.no, k: kk };
      parcs(k).forEach((q) => { e[`γ_${q.caso}`] = q.f; e[`θ_${q.caso}`] = q[k]; });
      const v = m.resultado[k === 'rx' ? 0 : 1];
      P({ descricao: `Momento transmitido pelo pilar à laje em torno de ${rot} (mola de rotação do nó ${m.no} da grelha, a ${fm(m.dist)} m do centro do pilar), casos somados em módulo`, formula: `M${rot} = Σ |γi·k·θ${rot},i|`, expressao: `M${rot} = ${parcs(k).map((q) => `|${fm(q.f)}·${fm(kk)}·${fp(q[k])}|`).join(' + ') || '0'} = ${fm(v)} kN·m`, resultado: v, unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: e });
    }
  } else if (s.integrado) {
    const g = s.integrado;
    for (const k of [0, 1] as const) {
      const e: Record<string, ValorMemoria> = {};
      g.casos.filter((q) => q.f !== 0).forEach((q) => { e[`γ_${q.caso}`] = q.f; e[`m_${q.caso}`] = q.m[k]; });
      P({ descricao: `Momento ${k === 0 ? 'Mx' : 'My'} que a laje transmite ao pilar (superelemento do modelo integrado), cargas verticais: casos somados em módulo`, formula: `M${k === 0 ? 'x' : 'y'},1 = Σ |γi·mi|`, expressao: `M = ${g.casos.filter((q) => q.f !== 0).map((q) => `|${fm(q.f)}·${fp(q.m[k])}|`).join(' + ') || '0'} = ${fm(g.g1[k])} kN·m`, resultado: g.g1[k], unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: e });
    }
    if (g.g2) {
      for (const k of [0, 1] as const) {
        const e: Record<string, ValorMemoria> = { gq: g.gq, g1: g.g1[k] };
        g.casos.forEach((q) => { if (q.fW !== 0) { e[`γW_${q.caso}`] = q.fW; e[`m_${q.caso}`] = q.m[k]; } });
        g.vento.forEach((q) => { e[`amp_${q.nome}`] = q.amp; e[`mW_${q.nome}`] = q.m[k]; });
        P({ descricao: `Momento ${k === 0 ? 'Mx' : 'My'} com vento: pior de (uso principal + 0,6·vento) e (vento principal + uso reduzido por ψ0); vento ampliado pelo fator do modelo`, formula: `M = máx(M1 + γq·0,6·W; M2 + γq·W), W = máx|amp·mW|; M2 = Σ |γW,i·mi|`, expressao: `W = ${fm(g.W[k])}; M2 = ${fm(g.g2![k])}; M = máx(${fm(g.g1[k])} + ${fm(g.gq)}·0,6·${fm(g.W[k])}; ${fm(g.g2![k])} + ${fm(g.gq)}·${fm(g.W[k])}) = ${fm(g.resultadoVento[k])} kN·m`, resultado: g.resultadoVento[k], unidade: 'kN·m', norma: `${NBR}, 11.8 e 19.5.2.2`, entradas: { ...e, W: g.W[k], M2: g.g2![k] } });
      }
    }
    if (g.desaprumo) {
      const ds = g.desaprumo;
      for (const k of [0, 1] as const) {
        const e: Record<string, ValorMemoria> = { gq: g.gq, thetaA: ds.thetaA };
        g.casos.forEach((q) => { if (q.f !== 0 || q.fW !== 0) e[`m_${q.caso}`] = q.m[k]; if (q.f !== 0) e[`γ_${q.caso}`] = q.f; if (q.fW !== 0) e[`γW_${q.caso}`] = q.fW; });
        Object.entries(ds.md).forEach(([id, v]) => { e[`md_${id}`] = v; });
        Object.entries(ds.M1).forEach(([id, v]) => { e[`M1_${id}`] = v; });
        g.vento.forEach((q) => { e[`amp_${q.nome}`] = q.amp; e[`mW_${q.nome}`] = q.m[k]; });
        for (const [ch, m] of Object.entries(ds.mD)) e[`mD${ch.replace('|', '_')}`] = m[k];
        ds.candidatos.forEach((c, i) => { e[`c${i + 1}_tipo`] = c.tipo; e[`c${i + 1}_dir`] = c.direcao; e[`c${i + 1}_vento`] = c.vento ?? ''; e[`c${i + 1}_decisao`] = c.decisao; e[`c${i + 1}_Mw`] = c.Mw; e[`c${i + 1}_Md`] = c.Md; });
        e.Mvento = g.resultadoVento[k];
        const lin = ds.candidatos.map((c) => `${c.nome} [${c.decisao}]: ${fm(c.base[k])} + ${fm(c.w[k])} + ${fm(c.d[k])} = ${fm(c.M[k])}`);
        P({ descricao: `Momento ${k === 0 ? 'Mx' : 'My'} com desaprumo global (NBR 6118, 11.3.3.4.1, regra dos 30 % do vento): em cada combinação ELU o desaprumo entra conforme Mw (vento) e Md (desaprumo) na base; momentos dos casos D somados em módulo`, formula: `M = máx(M${k === 0 ? 'x' : 'y'},vento; Mbase,i + Mvento,i + Mdes,i), Mdes,i = Σ |γi·mD,i|`, expressao: `${lin.join('; ') || '—'}; M = máx(${fm(g.resultadoVento[k])}; ...) = ${fm(g.resultado[k])} kN·m`, resultado: g.resultado[k], unidade: 'kN·m', norma: `${NBR}, 11.3.3.4.1 e 19.5.2.2`, entradas: e });
      }
    }
  } else P({ descricao: 'Momentos transmitidos ao pilar: nenhum (sem molas de rotação nem superelemento na grelha do pavimento)', formula: 'Mx = My = 0', expressao: 'Mx = 0; My = 0', resultado: 0, unidade: 'kN·m', entradas: {} });
  const a = s.angulo, co = Math.cos((a * Math.PI) / 180), si = Math.sin((a * Math.PI) / 180);
  P({ descricao: 'Momento com excentricidade ao longo de u (eixo de c1 do pilar): componentes de Mx e My nos eixos do pilar, em módulo', formula: 'Meu = |Mx·sen α| + |My·cos α|', expressao: `Meu = |${fm(s.Mx[0])}·${fm(si)}| + |${fm(s.Mx[1])}·${fm(co)}| = ${fm(s.M[0])} kN·m`, resultado: s.M[0], unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: { Mx: s.Mx[0], My: s.Mx[1], angulo: a } });
  P({ descricao: 'Momento com excentricidade ao longo de v (eixo de c2 do pilar)', formula: 'Mev = |Mx·cos α| + |My·sen α|', expressao: `Mev = |${fm(s.Mx[0])}·${fm(co)}| + |${fm(s.Mx[1])}·${fm(si)}| = ${fm(s.M[1])} kN·m`, resultado: s.M[1], unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: { Mx: s.Mx[0], My: s.Mx[1], angulo: a } });
}

/** Combinação ELU determinante do radier (maior τSd em C′), forças no pé do pilar por caso, reação do solo e rotação aos eixos do pilar. */
export interface DetSolicitacaoRadier {
  combinacao: string; angulo: number;
  casos: { caso: string; f: number; N: number; Mx: number; My: number }[];
  F: number; Mx: number; My: number; Mu: number; Mv: number; M: [number, number];
  nos: { no: number; k: number; q: number }[]; qd: number; tauC2: number;
  candidatas: { nome: string; tau: number }[];
}

/** Radier: FSd e momentos no pé do pilar na combinação ELU determinante, reação do solo e rotação aos eixos do pilar. */
export function registrarSolicitacaoRadier(mem: Registrador, el: string, s: DetSolicitacaoRadier) {
  const tp = 'Solicitação (FSd e momentos)';
  const P = (p: Chave) => mem.passo({ etapa: 'esforcos', elemento: el, topico: tp, ...p });
  P({ descricao: `Combinação ELU determinante: a de maior τSd no contorno C′ entre as ${s.candidatas.length} combinações ELU (τSd em C′, MPa)`, formula: 'combinação de máx τSd,C′', expressao: s.candidatas.map((q) => `${q.nome}: ${fm(q.tau)}`).join('; '), resultado: s.combinacao, unidade: '', norma: `${NBR}, 11.8 e 19.5.2`, entradas: { combinacao: s.combinacao, tauC2: s.tauC2, ...Object.fromEntries(s.candidatas.map((q, i) => [`τ_${i + 1}`, q.tau])) } });
  const ent = (k: 'N' | 'Mx' | 'My') => { const e: Record<string, ValorMemoria> = {}; s.casos.filter((q) => q.f !== 0).forEach((q) => { e[`γ_${q.caso}`] = q.f; e[`${k}_${q.caso}`] = q[k]; }); return e; };
  const soma = (k: 'N' | 'Mx' | 'My') => s.casos.filter((q) => q.f !== 0).map((q) => `${fm(q.f)}·${fp(q[k])}`).join(' + ') || '0';
  P({ descricao: 'Força de punção FSd: normal no pé do pilar na combinação determinante', formula: 'FSd = Σ γi·Ni', expressao: `FSd = ${soma('N')} = ${fm(s.F)} kN`, resultado: s.F, unidade: 'kN', norma: `${NBR}, 19.5.2.1`, entradas: ent('N') });
  P({ descricao: 'Momento no pé do pilar em torno de x', formula: 'Mx = Σ γi·Mx,i', expressao: `Mx = ${soma('Mx')} = ${fm(s.Mx)} kN·m`, resultado: s.Mx, unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: ent('Mx') });
  P({ descricao: 'Momento no pé do pilar em torno de y', formula: 'My = Σ γi·My,i', expressao: `My = ${soma('My')} = ${fm(s.My)} kN·m`, resultado: s.My, unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: ent('My') });
  const co = Math.cos((s.angulo * Math.PI) / 180), si = Math.sin((s.angulo * Math.PI) / 180);
  P({ descricao: 'Momento nos eixos do pilar: componente em torno de u (excentricidade ao longo de v)', formula: 'Mu = Mx·cos α + My·sen α', expressao: `Mu = ${fm(s.Mx)}·${fm(co)} + ${fm(s.My)}·${fm(si)} = ${fm(s.Mu)} kN·m`, resultado: s.Mu, unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: { Mx: s.Mx, My: s.My, angulo: s.angulo } });
  P({ descricao: 'Momento nos eixos do pilar: componente em torno de v (excentricidade ao longo de u)', formula: 'Mv = −Mx·sen α + My·cos α', expressao: `Mv = −${fp(s.Mx)}·${fm(si)} + ${fm(s.My)}·${fm(co)} = ${fm(s.Mv)} kN·m`, resultado: s.Mv, unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: { Mx: s.Mx, My: s.My, angulo: s.angulo } });
  P({ descricao: 'Momentos da verificação (módulos): com excentricidade ao longo de u e ao longo de v', formula: 'Meu = |Mv|; Mev = |Mu|', expressao: `Meu = ${fm(s.M[0])}; Mev = ${fm(s.M[1])} kN·m`, resultado: s.M[0], unidade: 'kN·m', entradas: { Mu: s.Mu, Mv: s.Mv, Meu: s.M[0], Mev: s.M[1] } });
  const e: Record<string, ValorMemoria> = { nNos: s.nos.length };
  s.nos.forEach((n, i) => { e[`q_${i + 1}`] = n.q; });
  P({ descricao: `Reação do solo sob o pilar: pressão ELU k·w nos ${s.nos.length} nós do radier a até c/2 + 3d do centro, na combinação determinante, em média`, formula: 'qd = máx(0; média_nós(Σ −γi·k·wi))', expressao: `qd = máx(0; (${s.nos.map((n) => fp(n.q)).join(' + ') || '0'})/${s.nos.length || 1}) = ${fm(s.qd)} kN/m²`, resultado: s.qd, unidade: 'kN/m²', norma: `${NBR}, 19.5.2.1`, entradas: e, observacao: s.nos.length ? undefined : 'Nenhum nó do radier próximo: reação do solo nula.' });
}

/** Apoio com o mesmo resultado de outro pavimento (a grelha do pavimento é a mesma): remete ao elemento já registrado. */
export function registrarPuncaoRepetida(mem: Registrador, el: string, igual: string) {
  mem.passo({ etapa: 'dimensionamento', elemento: el, topico: 'Situação', descricao: `Mesma grelha, mesmo pilar e mesma seção de ${igual}: FSd, momentos, contornos e armadura idênticos`, formula: '—', expressao: `ver ${igual}`, resultado: igual, unidade: '', entradas: {} });
}

// ------------------------------------------------------------------ verificação de um apoio

export function registrarVerificacaoPuncao(mem: Registrador, el: string, x: CtxVerif) {
  const { c, ent, par, v } = x, D = v.det;
  if (!D) return;
  const rot = x.rot ?? '', apoio = x.apoio ?? 'pilar', ap = ent.ap, d = ent.d, h = ent.h;
  const P = (etapa: 'esforcos' | 'dimensionamento' | 'detalhamento', tp: string, p: Chave) => mem.passo({ etapa, elemento: el, topico: tp + rot, ...p });
  const R = (tp: string, p: Chave) => P('dimensionamento', tp, p);
  const gc = c.fck / c.fcd;
  // ---- apoio, altura útil e taxa de armadura
  const ta = 'Apoio, altura útil e taxa de armadura';
  R(ta, { descricao: `Dimensões do ${apoio} nos eixos u (c1) e v (c2) e ângulo do eixo u com x${ap.circular ? ' (seção circular: c1 = c2 = D)' : ''}`, formula: 'c1 × c2; α', expressao: `c1 = ${fm(ap.c1)} m; c2 = ${fm(ap.c2)} m; α = ${fm(ap.angulo)}°`, resultado: `${fm(ap.c1 * 100)} × ${fm(ap.c2 * 100)} cm`, unidade: '', entradas: { c1: ap.c1, c2: ap.c2, angulo: ap.angulo, circular: ap.circular ? 1 : 0 } });
  R(ta, { descricao: 'Altura útil média na região do contorno (c + 1 cm: média das duas camadas de armadura de referência)', formula: 'd = máx(0,05; h − c − 0,01)', expressao: `d = máx(0,05; ${fm(h)} − ${fm(x.cob)} − 0,01) = ${fm(d)} m`, resultado: d, unidade: 'm', norma: `${NBR}, 19.5.2.1`, aConfirmar: true, entradas: { h, c: x.cob }, observacao: 'O desconto fixo de 1 cm aproxima a média das alturas úteis nas duas direções (a confirmar).' });
  const r = x.rho;
  if (r.viga || !r.As || !r.b) {
    R(ta, { descricao: 'Taxa de armadura de flexão do apoio em viga chata: mínima de 0,15 % da altura (a armadura da viga não é lida)', formula: 'ρ = mín(0,02; 0,0015·h/d)', expressao: `ρ = mín(0,02; 0,0015·${fm(r.h)}/${fm(d)}) = ${fm(par.rho)}`, resultado: par.rho, unidade: '', norma: `${NBR}, 19.5.2.1`, aConfirmar: true, entradas: { h: r.h, d } });
  } else {
    const ent2: Record<string, ValorMemoria> = { h: r.h, d, As0: r.As[0], As1: r.As[1], b0: r.b[0], b1: r.b[1] };
    const am = r.b.map((b) => 0.0015 * r.h * b * 1e4);
    R(ta, { descricao: `Taxa de armadura de flexão${r.faceTexto ? ` (${r.faceTexto})` : ''}: média geométrica das direções, com a armadura mínima de 0,15 % de h·b`, formula: 'ρi = máx(Asi; 0,0015·h·bi)/(bi·d); ρ = mín(0,02; √(ρ0·ρ1))', expressao: `ρ0 = máx(${fm(r.As[0])}; ${fm(am[0])})/(10⁴·${fm(r.b[0])}·${fm(d)}); ρ1 = máx(${fm(r.As[1])}; ${fm(am[1])})/(10⁴·${fm(r.b[1])}·${fm(d)}) → ρ = ${fm(par.rho)}`, resultado: par.rho, unidade: '', norma: `${NBR}, 19.5.2.1`, aConfirmar: true, entradas: ent2, observacao: 'As em cm² por faixa de largura b (m); a taxa mínima de 0,15 % é adotada como piso da média (a confirmar).' });
  }
  // ---- tipo de apoio e K
  const tk = 'Tipo de apoio e coeficiente K';
  const livU = v.livres.some((l) => l.startsWith('u')), livV = v.livres.some((l) => l.startsWith('v'));
  R(tk, { descricao: `Lados livres do ${apoio} (borda livre da laje a menos de 0,5d da face) e tipo`, formula: 'interno: 0 lados; de borda: 1; de canto: 2 ou mais', expressao: `lados livres: ${v.livres.length ? v.livres.join(', ') : 'nenhum'} → pilar ${v.tipo}`, resultado: v.tipo, unidade: '', norma: `${NBR}, 19.5.2.3 e 19.5.2.4`, entradas: { nLivres: v.livres.length, livres: v.livres.join(' '), livreU: livU ? 1 : 0, livreV: livV ? 1 : 0 } });
  if (ap.circular) R(tk, { descricao: 'Coeficiente K do pilar circular (nas duas direções)', formula: 'K = 0,6', expressao: 'K = 0,6', resultado: 0.6, unidade: '', norma: `${NBR}, Tabela 19.2`, entradas: { circular: 1 } });
  else for (const k of [0, 1] as const) {
    const rr = k === 0 ? ap.c1 / ap.c2 / (livV ? 2 : 1) : ap.c2 / ap.c1 / (livU ? 2 : 1);
    R(tk, { descricao: `Coeficiente K da direção ${k === 0 ? 'u' : 'v'} (fração do momento transmitida por cisalhamento): C1/C2 com C1 na direção da excentricidade; com borda livre paralela ao eixo, C1/(2·C2)`, formula: 'K = interpolação da Tabela 19.2: C1/C2 = 0,5 → 0,45; 1 → 0,6; 2 → 0,7; 3 → 0,8', expressao: `C1/C2 = ${fm(rr)} → K = ${fm(v.C.K[k])}`, resultado: v.C.K[k], unidade: '', norma: `${NBR}, Tabela 19.2`, entradas: { c1: k === 0 ? ap.c1 : ap.c2, c2: k === 0 ? ap.c2 : ap.c1, bordaParalela: (k === 0 ? livV : livU) ? 1 : 0, razao: rr } });
  }
  // ---- tensões resistentes
  const tr = 'Tensões resistentes';
  R(tr, { descricao: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', expressao: `fcd = ${fm(c.fck)} / ${fm(gc)} = ${fm(c.fcd)}`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fck: c.fck, gc } });
  R(tr, { descricao: 'Fator de compressão diagonal', formula: 'αv2 = 1 − fck/250', expressao: `αv2 = 1 − ${fm(c.fck)}/250 = ${fm(c.av2)}`, resultado: c.av2, unidade: '', norma: `${NBR}, 19.5.3.1`, entradas: { fck: c.fck } });
  R(tr, { descricao: 'Tensão resistente de compressão diagonal do concreto (contorno C)', formula: 'τRd2 = 0,27·αv2·fcd', expressao: `τRd2 = 0,27·${fm(c.av2)}·${fm(c.fcd)} = ${fm(v.tauRd2)} MPa`, resultado: v.tauRd2, unidade: 'MPa', norma: `${NBR}, 19.5.3.1`, entradas: { av2: c.av2, fcd: c.fcd } });
  R(tr, { descricao: 'Tensão resistente de tração diagonal sem armadura (contorno C′)', formula: 'τRd1 = 0,13·(1 + √(20/d))·(100·ρ·fck)^(1/3), d em cm', expressao: `τRd1 = 0,13·(1 + √(20/${fm(d * 100)}))·(100·${fm(par.rho)}·${fm(c.fck)})^(1/3) = ${fm(v.tauRd1)} MPa`, resultado: v.tauRd1, unidade: 'MPa', norma: `${NBR}, 19.5.3.2`, entradas: { d, rho: par.rho, fck: c.fck } });
  R(tr, { descricao: 'Parcela do concreto da tensão resistente com armadura de punção', formula: 'τRd3,c = 0,10·(1 + √(20/d))·(100·ρ·fck)^(1/3), d em cm', expressao: `τRd3,c = 0,10·(1 + √(20/${fm(d * 100)}))·(100·${fm(par.rho)}·${fm(c.fck)})^(1/3) = ${fm(v.tauRd3c)} MPa`, resultado: v.tauRd3c, unidade: 'MPa', norma: `${NBR}, 19.5.3.3`, entradas: { d, rho: par.rho, fck: c.fck } });
  R(tr, { descricao: `Tensão de escoamento de cálculo da armadura de punção (limitada a ${fm(x.limFywd)} MPa)`, formula: 'fywd = mín(fyd; limite)', expressao: `fywd = mín(${fm(x.fyd)}; ${fm(x.limFywd)}) = ${fm(par.fywd)} MPa`, resultado: par.fywd, unidade: 'MPa', norma: `${NBR}, 19.5.3.3`, aConfirmar: true, entradas: { fyd: x.fyd, limite: x.limFywd }, observacao: 'Limites de 250 MPa (estribos) e 300 MPa (conectores) a confirmar.' });
  if (x.carga) R(tr, { descricao: x.carga.descricao, formula: x.carga.formula, expressao: x.carga.expressao, resultado: ent.qd, unidade: 'kN/m²', norma: `${NBR}, 19.5.2.1`, entradas: x.carga.entradas });
  // ---- contornos
  const contornos: [number, Tensao][] = [[0, v.C], [1, v.C2], ...(v.C3 ? [[2, v.C3] as [number, Tensao]] : [])];
  for (const [k, t] of contornos) registrarContorno(mem, el, `Contorno ${NOMES_C[k]}${rot}`, NOMES_C[k], t, x);
  // ---- verificação dos contornos
  const tv = 'Verificação das tensões';
  const lim2 = v.tauRd3 ?? v.tauRd1;
  R(tv, { descricao: 'Compressão diagonal do concreto no contorno C (face do pilar)', formula: 'τSd,C ≤ τRd2', expressao: `${fm(v.C.tau)} ${v.C.tau <= v.tauRd2 + 1e-9 ? '≤' : '>'} ${fm(v.tauRd2)} MPa → ${v.C.tau <= v.tauRd2 + 1e-9 ? 'atende' : 'NÃO atende'}`, resultado: v.C.tau <= v.tauRd2 + 1e-9 ? 'atende' : 'não atende', unidade: '', norma: `${NBR}, 19.5.3.1`, entradas: { tauSd: v.C.tau, tauRd2: v.tauRd2 } });
  if (D.desfecho !== 'biela') {
    R(tv, { descricao: `Tração diagonal no contorno C′ (2d da face): ${v.tauRd3 !== undefined ? 'com armadura, limite τRd3' : 'sem armadura, limite τRd1'}`, formula: v.tauRd3 !== undefined ? 'τSd,C′ ≤ τRd3' : 'τSd,C′ ≤ τRd1', expressao: `${fm(v.C2.tau)} ${v.C2.tau <= lim2 + 1e-9 ? '≤' : '>'} ${fm(lim2)} MPa`, resultado: v.C2.tau <= lim2 + 1e-9 ? 'atende' : 'não atende', unidade: '', norma: `${NBR}, 19.5.3.2 e 19.5.3.3`, entradas: { tauSd: v.C2.tau, limite: lim2, tauRd1: v.tauRd1 } });
  }
  // ---- cortante da laje no entorno do pilar (varredura)
  registrarVarredura(mem, el, x);
  // ---- armadura
  if (D.desfecho !== 'ok' && D.desfecho !== 'biela' && D.desfecho !== 'bielaCortante') registrarArmaduraPuncao(mem, el, x, contornos.length === 3 ? contornos[2][1] : undefined);
  const msg = v.mensagens.join(' ');
  R('Situação', { descricao: `Situação da punção (${apoio}): ${v.status === 'ok' ? 'atende sem armadura' : v.status === 'armadura' ? 'atende com armadura de punção' : 'não atende'}`, formula: '—', expressao: msg || 'sem mensagens', resultado: v.status, unidade: '', entradas: { desfecho: D.desfecho } });
}

/** Perímetro, centroide, excentricidade e*, módulo plástico Wp, momento reduzido e τSd de um contorno. */
function registrarContorno(mem: Registrador, el: string, tp: string, nome: string, t: Tensao, x: CtxVerif) {
  const { ent, v } = x, ap = ent.ap, d = ent.d;
  const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tp, ...p });
  const n = t.pecas.length, pr = propriedadesContorno(t.pecas, ap.angulo);
  const sem = ent.excluir?.length ? ' Trechos sobre cubetas saem (só as nervuras e as zonas maciças resistem).' : '';
  const furos = ent.reg.furos.length ? ' Trechos junto a aberturas a menos de 8d saem (retas tangentes pelo centro do pilar).' : '';
  let fechada = '';
  if (!ap.circular && !x.ent.reg.furos.length && !ent.excluir?.length && v.livres.length === 0) {
    const u = 2 * (ap.c1 + ap.c2) + 2 * Math.PI * t.a;
    fechada = ` Conferência: u = 2·(c1 + c2) + 2π·a = ${fm(u)} m (o cálculo aproxima cada arco por 40 cordas por quadrante).`;
  }
  P({ descricao: `Contorno ${nome} a ${fm(t.a)} m das faces do ${x.apoio ?? 'pilar'}: retângulo de cantos arredondados (raio a), recortado pelas bordas livres da laje.${sem}${furos} Perímetro u`, formula: 'u = Σ ℓ dos trechos do contorno dentro da laje', expressao: `${n} trechos → u = ${fm(t.u)} m`, resultado: t.u, unidade: 'm', norma: `${NBR}, 19.5.2.1 e 19.5.2.2`, entradas: { a: t.a, trechos: n, segmentos: json(t) }, observacao: `Segmentos do contorno em planta (x0, y0, x1, y1), em m, no campo "segmentos".${fechada}` });
  if (t.u < 1e-6 || pr.u < 1e-6) {
    P({ descricao: `Contorno ${nome} sem trecho dentro da laje: τSd = 0`, formula: 'u = 0', expressao: 'u = 0', resultado: 0, unidade: 'MPa', entradas: {} });
    return;
  }
  // FSd no contorno (radier: reação do solo descontada)
  let Fa = ent.F;
  if (ent.descontar) {
    const A = areaDentro(curvaAfastada(ap, t.a), ent.reg);
    Fa = Math.max(0, ent.F - ent.qd * A);
    P({ descricao: `FSd no contorno ${nome}: a carga distribuída (reação do solo) dentro do contorno é descontada`, formula: 'FSd,a = máx(0; FSd − qd·A)', expressao: `FSd,a = máx(0; ${fm(ent.F)} − ${fm(ent.qd)}·${fm(A)}) = ${fm(Fa)} kN`, resultado: Fa, unidade: 'kN', norma: `${NBR}, 19.5.2.1`, entradas: { F: ent.F, qd: ent.qd, A } });
  }
  const ex = ['u', 'v'] as const, M = ap.circular ? ([Math.hypot(ent.M[0], ent.M[1]), 0] as [number, number]) : ent.M;
  if (ap.circular) P({ descricao: 'Momento resultante do pilar circular (flexão em qualquer direção)', formula: 'M = √(Meu² + Mev²)', expressao: `M = √(${fm(ent.M[0])}² + ${fm(ent.M[1])}²) = ${fm(M[0])} kN·m`, resultado: M[0], unidade: 'kN·m', norma: `${NBR}, 19.5.2.2`, entradas: { Meu: ent.M[0], Mev: ent.M[1] } });
  for (const k of [0, 1] as const) {
    P({ descricao: `Excentricidade e*${ex[k]}: distância do centroide do contorno ao centro do ${x.apoio ?? 'pilar'}, projetada em ${ex[k]}`, formula: `e*${ex[k]} = |(centroide − centro)·${ex[k]}|`, expressao: `centroide = (${fm(pr.centroide[0])}; ${fm(pr.centroide[1])}); e*${ex[k]} = ${fm(t.e[k])} m`, resultado: t.e[k], unidade: 'm', norma: `${NBR}, 19.5.2.3`, entradas: { cx: pr.centroide[0], cy: pr.centroide[1], px: ap.centro[0], py: ap.centro[1], angulo: ap.angulo, eixo: ex[k] } });
  }
  for (const k of [0, 1] as const) {
    P({ descricao: `Módulo de resistência plástica Wp${ex[k]} do contorno (momento estático do contorno em torno do centroide)`, formula: `Wp${ex[k]} = ∫ |e| dℓ`, expressao: `Wp${ex[k]} = ${fm(t.Wp[k])} m²`, resultado: t.Wp[k], unidade: 'm²', norma: `${NBR}, 19.5.2.2`, entradas: { cx: pr.centroide[0], cy: pr.centroide[1], angulo: ap.angulo, eixo: ex[k] }, observacao: 'Integrado sobre os segmentos do contorno (passo do perímetro), em torno do seu centroide.' });
  }
  for (const k of [0, 1] as const) {
    P({ descricao: `Momento transmitido por cisalhamento na direção ${ex[k]}: o momento do pilar menos o efeito da excentricidade do contorno (borda e canto)`, formula: `MSd1,${ex[k]} = máx(0; MSd,${ex[k]} − FSd·e*${ex[k]})`, expressao: `MSd1,${ex[k]} = máx(0; ${fm(M[k])} − ${fm(Fa)}·${fm(t.e[k])}) = ${fm(t.M1[k])} kN·m`, resultado: t.M1[k], unidade: 'kN·m', norma: `${NBR}, 19.5.2.3 e 19.5.2.4`, entradas: { M: M[k], F: Fa, e: t.e[k] } });
  }
  const tF = Fa / (t.u * d) / 1000;
  P({ descricao: 'Parcela da força normal da tensão solicitante', formula: 'τF = FSd / (u·d)', expressao: `τF = ${fm(Fa)} / (${fm(t.u)}·${fm(d)}) / 1000 = ${fm(tF)} MPa`, resultado: tF, unidade: 'MPa', norma: `${NBR}, 19.5.2.1`, entradas: { F: Fa, u: t.u, d } });
  const tM: number[] = [];
  for (const k of [0, 1] as const) {
    const val = t.Wp[k] > 1e-9 ? (t.K[k] * t.M1[k]) / (t.Wp[k] * d) / 1000 : 0;
    tM.push(val);
    P({ descricao: `Parcela do momento na direção ${ex[k]} da tensão solicitante`, formula: `τM,${ex[k]} = K${ex[k]}·MSd1,${ex[k]} / (Wp${ex[k]}·d)`, expressao: t.Wp[k] > 1e-9 ? `τM,${ex[k]} = ${fm(t.K[k])}·${fm(t.M1[k])} / (${fm(t.Wp[k])}·${fm(d)}) / 1000 = ${fm(val)} MPa` : `Wp${ex[k]} ≈ 0 → τM,${ex[k]} = 0`, resultado: val, unidade: 'MPa', norma: `${NBR}, 19.5.2.2`, entradas: { K: t.K[k], M1: t.M1[k], Wp: t.Wp[k], d } });
  }
  P({ descricao: `Tensão solicitante de cálculo no contorno ${nome}`, formula: 'τSd = FSd/(u·d) + ΣK·MSd1/(Wp·d)', expressao: `τSd = ${fm(tF)} + ${fm(tM[0])} + ${fm(tM[1])} = ${fm(t.tau)} MPa`, resultado: t.tau, unidade: 'MPa', norma: `${NBR}, 19.5.2.2`, entradas: { tauF: tF, tauMu: tM[0], tauMv: tM[1] } });
}

/** Varredura de cortante da laje a cada passo·d a partir de C′ (19.4.1) e a armadura transversal que as superfícies reprovadas exigem (19.4.2). */
function registrarVarredura(mem: Registrador, el: string, x: CtxVerif) {
  const { c, ent, par, v } = x, D = v.det!, d = ent.d, h = ent.h, rot = x.rot ?? '';
  const tp = `Cortante da laje no entorno do pilar (19.4.1)${rot}`;
  const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tp, ...p });
  P({ descricao: 'Resistência ao cortante sem armadura transversal por metro de largura (ρ1 = ρ, bw = 1 m)', formula: 'VRd1 = 0,25·fctd·k·(1,2 + 40·ρ1)·bw·d, k = máx(1; 1,6 − d)', expressao: `VRd1 = 0,25·${fm(c.fctd)}·${fm(Math.max(1, 1.6 - d))}·(1,2 + 40·${fm(Math.min(0.02, par.rho))})·1·${fm(d)}·1000 = ${fm(D.vR1)} kN/m`, resultado: D.vR1, unidade: 'kN/m', norma: `${NBR}, 19.4.1`, entradas: { fctd: c.fctd, rho: par.rho, d } });
  P({ descricao: 'Compressão diagonal do cortante da laje por metro de largura', formula: 'VRd2 = 0,27·αv2·fcd·d', expressao: `VRd2 = 0,27·${fm(c.av2)}·${fm(c.fcd)}·1000·${fm(d)} = ${fm(D.vRd2)} kN/m`, resultado: D.vRd2, unidade: 'kN/m', norma: `${NBR}, 19.4.2`, entradas: { av2: c.av2, fcd: c.fcd, d } });
  P({ descricao: 'Parcela do concreto na laje com armadura transversal: VRd1 até h = 15 cm; 0,6·fctd·d (viga) a partir de h = 35 cm; interpolação entre os dois', formula: 'Vc = VRd1 (h ≤ 0,15); 0,6·fctd·d (h ≥ 0,35); linear entre', expressao: `Vc = ${fm(D.vc)} kN/m (h = ${fm(h)} m)`, resultado: D.vc, unidade: 'kN/m', norma: `${NBR}, 19.4.2`, aConfirmar: true, entradas: { h, vR1: D.vR1, fctd: c.fctd, d }, observacao: 'A interpolação entre 15 e 35 cm é uma simplificação do programa (a confirmar).' });
  const sup = v.cortante.superficies;
  if (par.passoCortante <= 0 || ent.F <= 0) {
    P({ descricao: 'Varredura de cortante não executada (opção desligada ou FSd ≤ 0)', formula: '—', expressao: '—', resultado: 0, unidade: '', entradas: { passo: par.passoCortante, F: ent.F } });
    return;
  }
  P({ descricao: `Superfícies de verificação a cada ${fm(par.passoCortante)}·d = ${fm(par.passoCortante * d)} m, a partir de C′ (2d), enquanto u ≥ 0,05 m e V > 0`, formula: 'a_k = 2d + k·passo·d', expressao: `${sup.length} superfícies`, resultado: sup.length, unidade: '', norma: `${NBR}, 19.4.1`, entradas: { passo: par.passoCortante, d } });
  sup.forEach((s, i) => {
    P({ descricao: `Superfície ${i + 1} a ${fm(s.a)} m das faces: cortante por metro v = V/u, com V = FSd − qd·A (carga dentro da superfície descontada)`, formula: 'V = FSd − qd·A; v = V/u ≤ VRd1', expressao: `V = ${fm(ent.F)} − ${fm(ent.qd)}·${fm(s.A)} = ${fm(s.V)} kN; v = ${fm(s.V)}/${fm(s.u)} = ${fm(s.v)} kN/m ${s.ok ? '≤' : '>'} ${fm(s.vRd1)} → ${s.ok ? 'atende' : 'excede VRd1'}`, resultado: s.v, unidade: 'kN/m', norma: `${NBR}, 19.4.1`, entradas: { a: s.a, F: ent.F, qd: ent.qd, A: s.A, u: s.u, V: s.V, vRd1: s.vRd1 } });
    if (!s.ok) P({ descricao: `Superfície ${i + 1}: armadura transversal por anel (cm²) para o cortante acima de Vc·u`, formula: 'Asw = (V − Vc·u)·sr / (0,9·d·fywd)', expressao: `Asw = (${fm(s.V)} − ${fm(D.vc)}·${fm(s.u)})·${fm(D.sr)}·10⁴ / (0,9·${fm(d)}·${fm(par.fywd)}·1000) = ${fm(s.Asw)} cm²`, resultado: s.Asw, unidade: 'cm²', norma: `${NBR}, 19.4.2`, entradas: { V: s.V, vc: D.vc, u: s.u, sr: D.sr, d, fywd: par.fywd } });
  });
}

/** Distâncias, número de linhas e anéis, área por anel, escolha da bitola e a disposição final da armadura de punção. */
function registrarArmaduraPuncao(mem: Registrador, el: string, x: CtxVerif, C3?: Tensao) {
  const { c, ent, par, v } = x, D = v.det!, d = ent.d, rot = x.rot ?? '';
  const ts = `Armadura de punção – dimensionamento${rot}`, td = `Armadura de punção – disposição${rot}`;
  const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: ts, ...p });
  const sup = v.cortante.superficies;
  const arred = (q: number) => Math.floor(q / 0.005 + 1e-9) * 0.005;
  P({ descricao: 'Distância da primeira linha de armadura à face (≤ 0,5d) e entre linhas (≤ 0,75d), arredondadas para baixo a múltiplos de 5 mm', formula: 's0 = máx(0,02; ⌊s0f·d⌋₅ₘₘ); sr = máx(0,03; ⌊srf·d⌋₅ₘₘ)', expressao: `s0 = ${fm(D.s0)} m (${fm(par.s0f)}·${fm(d)}); sr = ${fm(D.sr)} m (${fm(par.srf)}·${fm(d)})`, resultado: D.sr, unidade: 'm', norma: `${NBR}, 19.5.3.5`, entradas: { s0f: par.s0f, srf: par.srf, d, s0: D.s0, sr: D.sr, s0Arred: Math.max(0.02, arred(par.s0f * d)), srArred: Math.max(0.03, arred(par.srf * d)) } });
  if (D.precisaPunc) {
    P({ descricao: `A tensão em C′ excede τRd1: precisa de armadura de punção (${fm(v.C2.tau)} > ${fm(v.tauRd1)} MPa)`, formula: 'τSd,C′ > τRd1', expressao: `${fm(v.C2.tau)} > ${fm(v.tauRd1)}`, resultado: 'sim', unidade: '', norma: `${NBR}, 19.5.3.2`, entradas: { tauSd: v.C2.tau, tauRd1: v.tauRd1 } });
    for (const t of D.tentativas) P({ descricao: `Busca do número de anéis: contorno C″ com ${t.n} anel(éis), a = s0 + (n−1)·sr + 2d = ${fm(t.a)} m`, formula: 'τSd,C″ ≤ τRd1 para dispensar mais anéis', expressao: `u = ${fm(t.u)} m; τSd = ${fm(t.tau)} ${t.tau <= v.tauRd1 + 1e-9 ? '≤' : '>'} ${fm(v.tauRd1)} MPa`, resultado: t.tau, unidade: 'MPa', norma: `${NBR}, 19.5.3.5`, entradas: { n: t.n, a: t.a, u: t.u, tauSd: t.tau, tauRd1: v.tauRd1 } });
    if (D.desfecho === 'semSolucaoC3' && !D.nb) return;
    if (D.nb) P({ descricao: 'Número de anéis exigido pela punção (primeiro n em que C″ dispensa armadura)', formula: 'nb = mín{n : τSd,C″(n) ≤ τRd1}', expressao: `nb = ${D.nb}`, resultado: D.nb, unidade: '', norma: `${NBR}, 19.5.3.5`, entradas: { nb: D.nb } });
    P({ descricao: 'Área de armadura por anel exigida pela punção', formula: 'AswP = (τSd,C′ − τRd3,c)·u·sr / (1,5·fywd)', expressao: `AswP = (${fm(v.C2.tau)} − ${fm(v.tauRd3c)})·${fm(v.C2.u)}·${fm(D.sr)}·10⁴ / (1,5·${fm(par.fywd)}) = ${fm(D.AswPunc)} cm²`, resultado: D.AswPunc, unidade: 'cm²', norma: `${NBR}, 19.5.3.3`, entradas: { tauSd: v.C2.tau, tauRd3c: v.tauRd3c, u: v.C2.u, sr: D.sr, fywd: par.fywd } });
  }
  if (v.cortante.falha) {
    const falhas = sup.filter((s) => !s.ok);
    const e: Record<string, ValorMemoria> = { s0: D.s0, sr: D.sr, aFalha: v.cortante.aFalha };
    falhas.forEach((s, i) => { e[`Asw_${i + 1}`] = s.Asw; });
    P({ descricao: 'Cortante da laje: armadura transversal exigida (maior entre as superfícies reprovadas) e número de anéis até a última superfície reprovada', formula: 'AswC = máx Asw_k; nbC = máx(1; ⌈(aF − s0)/sr⌉ + 1)', expressao: `AswC = ${fm(D.AswCort)} cm²; nbC = ⌈(${fm(v.cortante.aFalha)} − ${fm(D.s0)})/${fm(D.sr)}⌉ + 1 = ${D.nbCort}`, resultado: D.AswCort, unidade: 'cm²', norma: `${NBR}, 19.4.2`, entradas: e });
  }
  P({ descricao: 'Anéis e área por anel necessários (maior entre punção e cortante)', formula: 'nbMax = máx(nb; nbC); AswReq = máx(AswP; AswC)', expressao: `nbMax = máx(${D.nb}; ${D.nbCort}) = ${D.nbMax}; AswReq = máx(${fm(D.AswPunc)}; ${fm(D.AswCort)}) = ${fm(D.AswReq)} cm²`, resultado: D.AswReq, unidade: 'cm²', norma: `${NBR}, 19.5.3.5`, entradas: { nb: D.nb, nbC: D.nbCort, AswP: D.AswPunc, AswC: D.AswCort, nbMax: D.nbMax } });
  if (D.desfecho === 'semSolucaoCortante') return;
  // reverificação do contorno C″ na posição final (19.5.3.4): acrescenta anéis até τSd,C″ ≤ τRd1
  for (const t of D.verifC3) P({ descricao: `Reverificação do contorno C″ a 2d da última linha com ${t.n} anéis, a = s0 + (n−1)·sr + 2d = ${fm(t.a)} m`, formula: 'τSd,C″ ≤ τRd1; se não atende, n = n + 1 (até 14)', expressao: `u = ${fm(t.u)} m; τSd = ${fm(t.tau)} ${t.tau <= v.tauRd1 + 1e-9 ? '≤' : '>'} ${fm(v.tauRd1)} MPa → ${t.tau <= v.tauRd1 + 1e-9 ? 'atende' : 'NÃO atende'}`, resultado: t.tau, unidade: 'MPa', norma: `${NBR}, 19.5.3.4`, entradas: { n: t.n, a: t.a, u: t.u, tauSd: t.tau, tauRd1: v.tauRd1 } });
  if (D.verifC3.length) P({ descricao: D.desfecho === 'semSolucaoC3' ? 'Número final de anéis: C″ não atende a τRd1 nem com 14 anéis (sem solução)' : 'Número final de anéis após a reverificação de C″ (anéis acrescentados até C″ atender a τRd1)', formula: 'nbTot = nbMax + acréscimo', expressao: `nbTot = ${D.nbMax} + ${D.nbTot - D.nbMax} = ${D.nbTot}`, resultado: D.nbTot, unidade: '', norma: `${NBR}, 19.5.3.4`, entradas: { nbMax: D.nbMax, acrescimo: D.nbTot - D.nbMax, nbTot: D.nbTot } });
  if (D.desfecho === 'semSolucaoC3') return;
  P({ descricao: `Armadura informada pelo usuário no apoio (capacidade por anel e número de anéis)${D.manAsw ? '' : ': nenhuma'}; se cobre todos os anéis exigidos, só falta a diferença`, formula: 'AswA = AswReq − AswInf, se anéis informados ≥ nbTot; senão AswReq', expressao: `AswInf = ${fm(D.manAsw)} cm²; anéis informados = ${D.manAneis}; AswA = ${fm(D.AswAuto)} cm²`, resultado: D.AswAuto, unidade: 'cm²', norma: `${NBR}, 19.5.3.5`, entradas: { AswReq: D.AswReq, AswInf: D.manAsw, aneisInf: D.manAneis, nbTot: D.nbTot } });
  if (D.desfecho === 'vcCobre') {
    P({ descricao: 'A parcela Vc da laje com armadura transversal cobre o cortante: nenhuma armadura necessária e nenhuma informada', formula: 'AswA ≤ 0', expressao: 'sem armadura', resultado: 0, unidade: 'cm²', norma: `${NBR}, 19.4.2`, entradas: {} });
    return;
  }
  if (D.desfecho === 'informadaAtende') {
    P({ descricao: 'A armadura informada atende; nenhuma armadura calculada é acrescentada. Tensão resistente em C′ com a armadura informada', formula: 'τRd3 = τRd3,c + 1,5·AswInf·fywd/(sr·u·10⁴)', expressao: `τRd3 = ${fm(v.tauRd3c)} + 1,5·${fm(D.manAsw)}·${fm(par.fywd)}/(${fm(D.sr)}·${fm(v.C2.u)}·10⁴) = ${fm(v.tauRd3 ?? 0)} MPa`, resultado: v.tauRd3 ?? 0, unidade: 'MPa', norma: `${NBR}, 19.5.3.3`, entradas: { tauRd3c: v.tauRd3c, Asw: D.manAsw, fywd: par.fywd, sr: D.sr, u: v.C2.u } });
    return;
  }
  P({ descricao: 'Espaçamento tangencial máximo no contorno C′ (2d se τSd,C ≤ 0,63·τRd2; senão 1,5d), número mínimo de barras por anel e máximo que cabe no primeiro anel (≥ 5 cm entre barras)', formula: 'sT = 2d ou 1,5d; nMin = máx(2; ⌈u(C′)/sT⌉); nCap = máx(nMin; ⌊u1/0,05⌋)', expressao: `sT = ${fm(D.sT)} m; nMin = ⌈${fm(v.C2.u)}/${fm(D.sT)}⌉ → ${D.nMinT}; u1 = ${fm(D.u1)} m → nCap = ${D.nCap}`, resultado: D.nMinT, unidade: '', norma: `${NBR}, 19.5.3.5`, aConfirmar: true, entradas: { tauC: v.C.tau, tauRd2: v.tauRd2, d, uC2: v.C2.u, u1: D.u1, sT: D.sT, nMin: D.nMinT, nCap: D.nCap }, observacao: 'O espaçamento tangencial de 2d / 1,5d e o mínimo de 5 cm entre barras são critérios do programa (a confirmar).' });
  const pernas = D.pernas;
  for (const b of D.bitolas) P({ descricao: `Barras por anel com φ${fm(b.phi)} mm (${pernas} perna${pernas > 1 ? 's' : ''} por barra)`, formula: 'n = máx(nMin; ⌈AswA/(pernas·As,φ)⌉)', expressao: `n = máx(${D.nMinT}; ⌈${fm(D.AswAuto)}/(${pernas}·${fm(barArea(b.phi) * 1e4)})⌉) = ${b.n}`, resultado: b.n, unidade: '', norma: `${NBR}, 19.5.3.5`, entradas: { phi: b.phi, AswA: D.AswAuto, pernas, areaCm2: barArea(b.phi) * 1e4, nMin: D.nMinT, n: b.n } });
  if (D.escolha) P({ descricao: D.escolha.poucasLinhas ? `Bitola adotada: a menor com no máximo máx(nMin; 16) = ${D.limiteLinhas} barras por anel` : `Nenhuma bitola resolve com até ${D.limiteLinhas} barras por anel: a maior bitola permitida que cabe no primeiro anel (n ≤ ${D.nCap})`, formula: D.escolha.poucasLinhas ? 'φ = mín{φ : n(φ) ≤ máx(nMin; 16)}' : 'φ = máx{φ : n(φ) ≤ nCap}', expressao: `φ${fm(D.escolha.phi)} mm, ${D.escolha.n} barras por anel`, resultado: D.escolha.phi, unidade: 'mm', norma: `${NBR}, 19.5.3.5`, aConfirmar: true, entradas: { phi: D.escolha.phi, n: D.escolha.n, limite: D.limiteLinhas, nCap: D.nCap, poucasLinhas: D.escolha.poucasLinhas ? 1 : 0 } });
  const arm = v.armadura;
  if (!arm || !D.escolha) return;
  const somaInf = D.manAneis >= D.nbTot ? D.manAsw : 0;
  P({ descricao: 'Área efetiva por anel adotada (mais a armadura informada, se cobre todos os anéis)', formula: 'Asw,ef = n·pernas·As,φ + AswInf', expressao: `Asw,ef = ${arm.linhas}·${arm.pernas}·${fm(barArea(arm.phi) * 1e4)} + ${fm(somaInf)} = ${fm(arm.AswAnel)} cm²`, resultado: arm.AswAnel, unidade: 'cm²', norma: `${NBR}, 19.5.3.5`, entradas: { n: arm.linhas, pernas: arm.pernas, areaCm2: barArea(arm.phi) * 1e4, AswInf: somaInf } });
  P({ descricao: 'Tensão resistente em C′ com a armadura de punção adotada', formula: 'τRd3 = τRd3,c + 1,5·Asw,ef·fywd / (sr·u·10⁴)', expressao: `τRd3 = ${fm(v.tauRd3c)} + 1,5·${fm(arm.AswAnel)}·${fm(par.fywd)} / (${fm(D.sr)}·${fm(v.C2.u)}·10⁴) = ${fm(v.tauRd3 ?? 0)} MPa`, resultado: v.tauRd3 ?? 0, unidade: 'MPa', norma: `${NBR}, 19.5.3.3`, entradas: { tauRd3c: v.tauRd3c, Asw: arm.AswAnel, fywd: par.fywd, sr: D.sr, u: v.C2.u } });
  if (C3) P({ descricao: `Verificação fora da armadura: contorno C″ a 2d da última linha (a = s0 + (nbTot − 1)·sr + 2d = ${fm(C3.a)} m)`, formula: 'τSd,C″ ≤ τRd1', expressao: `${fm(C3.tau)} ${C3.tau <= v.tauRd1 + 1e-9 ? '≤' : '>'} ${fm(v.tauRd1)} MPa → ${C3.tau <= v.tauRd1 + 1e-9 ? 'atende' : 'NÃO atende'}`, resultado: C3.tau <= v.tauRd1 + 1e-9 ? 'atende' : 'não atende', unidade: '', norma: `${NBR}, 19.5.3.5`, entradas: { s0: D.s0, sr: D.sr, nbTot: D.nbTot, d, a: C3.a, tauSd: C3.tau, tauRd1: v.tauRd1 } });
  const T = (p: Chave) => mem.passo({ etapa: 'detalhamento', elemento: el, topico: td, ...p });
  T({ descricao: `Disposição: ${arm.linhas} linhas radiais com ${arm.barras} ${arm.tipo === 'estribo' ? 'estribos (grampos, 2 pernas)' : 'conectores (1 perna)'} cada, φ${fm(arm.phi)} mm; a primeira a ${fm(arm.s0 * 100)} cm da face e entre barras a ${fm(arm.sr * 100)} cm`, formula: 'linhas × barras; s0; sr', expressao: `${arm.linhas} × ${arm.barras} = ${arm.total} barras de φ${fm(arm.phi)} mm`, resultado: arm.total, unidade: 'un', norma: `${NBR}, 19.5.3.5`, entradas: { linhas: arm.linhas, barras: arm.barras, phi: arm.phi, s0: arm.s0, sr: arm.sr, pernas: arm.pernas, total: arm.total, AswAnel: arm.AswAnel, posicoes: JSON.stringify(arm.posicoes) } });
  void c;
}

// ------------------------------------------------------------------ nervuradas com ábaco

export interface CtxAbaco {
  hAbaco: number; hLaje: number; dAbaco: number; dLaje: number; rhoAbaco: number; rhoLaje: number;
  extensaoMin: number; c2NoAbaco: boolean; temAbaco: boolean; cob: number;
  /** Retângulo envolvente do ábaco (c1 × c2) e extensões da face do pilar à borda, por lado. */
  retangulo?: { c1: number; c2: number; angulo: number };
  extensoes?: { lado: string; ext: number }[];
  nome: string;
}

/** Geometria do ábaco e a escolha da região que cada contorno usa. */
export function registrarAbacoPuncao(mem: Registrador, el: string, a: CtxAbaco) {
  const tp = 'Ábaco e regiões da verificação';
  const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tp, ...p });
  if (!a.temAbaco) {
    P({ descricao: `Pilar sem ábaco na laje nervurada ${a.nome}: verificado nas nervuras com a altura da laje`, formula: 'h = hlaje', expressao: `h = ${fm(a.hLaje)} m; d = ${fm(a.dLaje)} m`, resultado: a.hLaje, unidade: 'm', entradas: { hLaje: a.hLaje, dLaje: a.dLaje }, observacao: 'Gere o ábaco (abaco.gerar) ou lance um manual.' });
    return;
  }
  P({ descricao: 'Alturas e alturas úteis: ábaco (contornos C e C′) e laje (contorno C″ fora do ábaco)', formula: 'dAb = máx(0,05; hAb − c − 0,01); dLaje = máx(0,05; h − c − 0,01)', expressao: `hAb = ${fm(a.hAbaco)} m → dAb = ${fm(a.dAbaco)} m; h = ${fm(a.hLaje)} m → dLaje = ${fm(a.dLaje)} m`, resultado: a.dAbaco, unidade: 'm', norma: `${NBR}, 19.5.2`, aConfirmar: true, entradas: { hAbaco: a.hAbaco, hLaje: a.hLaje, c: a.cob, dAbaco: a.dAbaco, dLaje: a.dLaje } });
  for (const q of a.extensoes ?? []) P({ descricao: `Extensão do ábaco, lado ${q.lado}, da face do pilar à borda do ábaco (lados livres da laje não contam)`, formula: 'ext = distância face–borda', expressao: `ext = ${fm(q.ext)} m`, resultado: q.ext, unidade: 'm', entradas: { ext: q.ext } });
  P({ descricao: 'O contorno C′ (a 2·dAb da face) cai dentro do ábaco? Se sim, a região interna usa a altura do ábaco; senão, a da laje', formula: 'extmín ≥ 2·dAb', expressao: `extmín = ${fm(a.extensaoMin)} m ${a.c2NoAbaco ? '≥' : '<'} 2·${fm(a.dAbaco)} = ${fm(2 * a.dAbaco)} m → ${a.c2NoAbaco ? 'usa o ábaco' : 'usa a laje'}`, resultado: a.c2NoAbaco ? 'ábaco' : 'laje', unidade: '', norma: `${NBR}, 19.5.2 (item a confirmar)`, aConfirmar: true, entradas: { extMin: a.extensaoMin, dAbaco: a.dAbaco } });
  if (a.retangulo) P({ descricao: 'Fora do ábaco: o retângulo envolvente do ábaco faz o papel do pilar; C″ a 2·dLaje da sua borda, com a altura da laje', formula: 'c1 × c2 do ábaco', expressao: `${fm(a.retangulo.c1)} × ${fm(a.retangulo.c2)} m`, resultado: `${fm(a.retangulo.c1 * 100)} × ${fm(a.retangulo.c2 * 100)} cm`, unidade: '', entradas: { c1: a.retangulo.c1, c2: a.retangulo.c2, angulo: a.retangulo.angulo } });
}
