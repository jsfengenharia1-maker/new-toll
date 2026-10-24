// Memória detalhada (MD fase 5c): vigas de fundação de equilíbrio (alavanca) e de travamento (`dimensionarVigaFundacao`,
// vigasFundacao.ts). Chamada no fim do dimensionamento só com a memória ligada, com as variáveis dele: pontas, alavancas e alívio
// vindos da fundação, cargas sobre a viga (peso próprio discretizado em n parcelas + cargas do nível de fundação e reações de
// cruzamento), esforços característicos no ponto governante (alavanca + biapoiada + travamento), ponderação, seção (mínimos,
// verificação da seção dada ou busca crescente; forma T, L ou plana da E5k), flexão por face (reaproveita `flexao`), As,mín,
// cortante (modelo I), pele, ancoragem das barras superiores, cortes da armadura principal (R8b) e quantitativos.
import { beamFlexure, grossProps, type BarChoice, type BeamSection, type Concrete, type ShearResult } from '../concrete';
import type { AlavancaNaViga, ArmaduraVF } from '../building/vigasFundacao';
import type { CortesVF, FaceCortesVF } from '../building/vigaFundacaoCortes';
import type { MesaBalanco } from '../building/secaoVF';
import { cm2, fm, fp, type Registrador, type ValorMemoria } from './registrador';
import { flexao } from './vigaConcreto';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR = 'NBR 6118:2023';
const FU = 'Viga de fundação (alavanca e travamento; critério do programa, a confirmar)';

export interface CtxVigaFundacao {
  el: string; nome: string; tipo: 'equilibrio' | 'travamento'; iniNome: string; fimNome: string; L: number; fi: number; ff: number;
  b0: number; h0: number; fixa: boolean; bMin: number; hMin: number; bw: number; h: number; forma?: string;
  equilibrio: { ini: boolean; fim: boolean }; alavancas: AlavancaNaViga[]; alivio: { ini: number; fim: number }; travamento: { ini: number; fim: number };
  det?: { trav: { ponta: 'ini' | 'fim'; elemento: string; Nk: number; exc: number; nb: number }[]; alav: { ponta: 'ini' | 'fim'; elemento: string; N: number; R: number; fator: number }[] };
  apoios: { caso: string; s: number; R: number; com: string }[];
  xs: number[]; Mlev: number[]; Vlev: number[]; biM: number[]; biV: number[]; Mtr: number; Vtr: number; Msup: number[]; Minf: number[]; V: number[];
  /** Cargas da biapoiada (sem vento): `npp` parcelas de peso próprio de valor `ppP` seguidas das externas e das reações de cruzamento (P < 0). */
  npp: number; ppP: number; areaSecao: number; ext: { caso?: string; s: number; P: number }[]; reacoes: { ini: number; fim: number };
  gf: number; Mk: { sup: number; inf: number }; Vk: number; Md: { sup: number; inf: number }; Vd: number;
  c: Concrete; fyd: number; fyk: number; gs: number; cob: number; d: number;
  secS: BeamSection; secI: BeamSection; fcS: boolean; fcI: boolean; sup: ArmaduraVF; inf: ArmaduraVF; sh: ShearResult;
  pele?: { AsFace: number; barras: BarChoice | null };
  tentativas: number; inicialOk: boolean; inicialMotivo: string;
  lb: number; phiSup: number; boaAderencia: boolean; ancoragem: { ini: number; fim: number; editada: { ini: boolean; fim: boolean } };
  Lc: number; Lest: number; nEst: number; perim: number; cortes?: CortesVF; mesa?: MesaBalanco | null;
  volume: number; aco: number; status: 'ok' | 'fail'; mensagens: string[];
}

const J = (v: unknown) => JSON.stringify(v);

export function registrarVigaFundacao(mem: Registrador, x: CtxVigaFundacao): void {
  const el = x.el;
  const T0 = 'Viga de fundação · dados';
  if (!mem.aceita(el) || mem.passos.some((p) => p.elemento === el && p.topico === T0)) return;
  const E = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  const { c, fyd, L } = x;
  const tipoTxt = x.tipo === 'equilibrio' ? 'de equilíbrio' : 'de travamento';
  E('dimensionamento', T0, { descricao: `Viga ${tipoTxt} ${x.nome} entre ${x.iniNome} e ${x.fimNome}: distância entre os centros dos pilares e meias faces dos elementos das pontas`, formula: 'L = |centro fim − centro ini|; cortante tomado entre as faces', expressao: `L = ${fm(L)} m; faces ${fm(x.fi)} m (ini) e ${fm(x.ff)} m (fim); pontas equilibradas: ini ${x.equilibrio.ini ? 'sim' : 'não'}, fim ${x.equilibrio.fim ? 'sim' : 'não'}`, resultado: L, unidade: 'm', norma: FU, aConfirmar: true, entradas: { L, fi: x.fi, ff: x.ff, eqIni: x.equilibrio.ini ? 1 : 0, eqFim: x.equilibrio.fim ? 1 : 0 } });
  E('dimensionamento', T0, { descricao: 'Resistências de cálculo, cobrimento e coeficientes', formula: 'fcd = fck/γc; fyd = fyk/γs', expressao: `fcd = ${fm(c.fcd)} MPa; fyd = ${fm(fyd)} MPa; cobrimento = ${fm(x.cob * 100)} cm; γf = ${fm(x.gf)}; γs = ${fm(x.gs)}`, resultado: c.fcd, unidade: 'MPa', norma: `${NBR}, 12.3.3`, entradas: { fcd: c.fcd, fctd: c.fctd, fctm: c.fctm, fyd, fyk: x.fyk, cob: x.cob, gf: x.gf, gs: x.gs } });

  // ---------------------------------------------------------------- alavanca, alívio e travamento
  const T1 = 'Viga de fundação · alavanca';
  for (const al of x.alavancas) {
    const a = al.ponta === 'ini' ? x.iniNome : x.fimNome, n = (al.dN * (al.l - al.ei)) / al.ei, r = n + al.dN, s0 = al.ei - al.a / 2, s1 = al.ei + al.a / 2;
    const dd = x.det?.alav.find((q) => q.ponta === al.ponta);
    E('esforcos', T1, { descricao: `Alavanca de ${a}: alívio ΔN na ponta oposta (da carga adotada do elemento${dd ? `: N = ${fm(dd.N)} kN, R = ${fm(dd.R)} kN, fator ${fm(dd.fator, 5)}` : ''}), excentricidade ei do centro do elemento ao eixo do pilar, comprimento a do elemento ao longo da viga e distância ℓ entre os pilares`, formula: 'ΔN = R·g/ℓ (equilíbrio de momentos no centro do elemento)', expressao: `ΔN = ${fm(al.dN)} kN; ei = ${fm(al.ei)} m; a = ${fm(al.a)} m; ℓ = ${fm(al.l)} m`, resultado: al.dN, unidade: 'kN', norma: 'Alavanca (livro-texto); NBR 6122:2019', entradas: { dN: al.dN, ei: al.ei, a: al.a, l: al.l, ponta: al.ponta, ...(dd ? { N: dd.N, R: dd.R, fator: dd.fator } : {}) } });
    E('esforcos', T1, { descricao: `Reação do elemento sobre a viga em ${a}: carga n do pilar na origem, reação r = n + ΔN uniforme sob o elemento (trecho de ${fm(s0)} a ${fm(s1)} m) e ΔN na ponta oposta`, formula: 'n = ΔN·(ℓ − ei)/ei; r = n + ΔN; q = r/a', expressao: `n = ${fm(al.dN)}·(${fm(al.l)} − ${fm(al.ei)})/${fm(al.ei)} = ${fm(n)} kN; r = ${fm(r)} kN; q = ${fm(r / al.a)} kN/m`, resultado: n, unidade: 'kN', norma: 'Alavanca (livro-texto)', entradas: { dN: al.dN, ei: al.ei, a: al.a, l: al.l, n, r, q: r / al.a, s0, s1 } });
  }
  const T2 = 'Viga de fundação · alívio e travamento';
  E('esforcos', T2, { descricao: 'Alívio levado a cada ponta pela alavanca da ponta oposta (característico)', formula: 'alívio = Σ ΔN das alavancas da ponta oposta', expressao: `ini = ${fm(x.alivio.ini)} kN; fim = ${fm(x.alivio.fim)} kN`, resultado: x.alivio.ini + x.alivio.fim, unidade: 'kN', norma: FU, aConfirmar: true, entradas: { ini: x.alivio.ini, fim: x.alivio.fim } });
  for (const t of x.det?.trav ?? []) E('esforcos', T2, { descricao: `Momento de travamento em ${t.elemento}: excentricidade de execução das estacas, repartida entre as ${t.nb} viga(s) da mesma direção`, formula: 'Mtrav = Nk·e/100/nb (e em % do lado, opção)', expressao: `Mtrav = ${fm(t.Nk)}·${fm(t.exc)}/100/${t.nb} = ${fm(t.Nk * t.exc / 100 / t.nb)} kN·m`, resultado: (t.Nk * t.exc) / 100 / t.nb, unidade: 'kN·m', norma: 'NBR 6122:2019 (travamento de blocos de 1 e 2 estacas); percentual a confirmar', aConfirmar: true, entradas: { Nk: t.Nk, exc: t.exc, nb: t.nb, ponta: t.ponta } });
  E('esforcos', T2, { descricao: 'Momento e cortante de travamento somados ao diagrama (maior das duas pontas; cortante = soma dos momentos / L)', formula: 'Mtr = máx(Mtr,ini; Mtr,fim); Vtr = (Mtr,ini + Mtr,fim)/L', expressao: `Mtr = máx(${fm(x.travamento.ini)}; ${fm(x.travamento.fim)}) = ${fm(x.Mtr)} kN·m; Vtr = (${fm(x.travamento.ini)} + ${fm(x.travamento.fim)})/${fm(L)} = ${fm(x.Vtr)} kN`, resultado: x.Mtr, unidade: 'kN·m', norma: FU, aConfirmar: true, entradas: { ini: x.travamento.ini, fim: x.travamento.fim, L, Mtr: x.Mtr, Vtr: x.Vtr } });

  // ---------------------------------------------------------------- cargas
  const T3 = 'Viga de fundação · cargas sobre a viga';
  E('cargas', T3, { descricao: `Peso próprio da viga discretizado em ${x.npp} parcelas concentradas (γ = 25 kN/m³; caso G)`, formula: 'P = 25·A·L/n; parcela k em s = (k + 0,5)·L/n', expressao: `P = 25·${fm(x.areaSecao)}·${fm(L)}/${x.npp} = ${fm(x.ppP)} kN`, resultado: x.ppP, unidade: 'kN', norma: 'NBR 6120:2019', entradas: { A: x.areaSecao, L, n: x.npp, P: x.ppP } });
  E('cargas', T3, { descricao: `Cargas do nível de fundação na faixa da viga e reações de cruzamento (sem os casos de vento): ${x.ext.length} parcela(s); reações da biapoiada nas pontas`, formula: 'RA = ΣP − Σ P·s/L; RB = Σ P·s/L', expressao: `RA = ${fm(x.reacoes.ini)} kN; RB = ${fm(x.reacoes.fim)} kN`, resultado: x.reacoes.ini + x.reacoes.fim, unidade: 'kN', norma: 'Estática', entradas: { ext: J(x.ext.map((q) => [q.caso ?? 'cruzamento', q.s, q.P])), apoios: J(x.apoios.map((q) => [q.caso, q.s, q.R])), RA: x.reacoes.ini, RB: x.reacoes.fim } });

  // ---------------------------------------------------------------- esforços característicos
  const T4 = 'Viga de fundação · esforços característicos';
  const alJ = J(x.alavancas.map((q) => [q.ponta, q.dN, q.ei, q.a, q.l]));
  const base = { L, Mtr: x.Mtr, Vtr: x.Vtr, alavancas: alJ };
  const iS = x.Msup.indexOf(x.Mk.sup), iI = x.Minf.indexOf(x.Mk.inf);
  const iV = x.V.findIndex((v, i) => v === x.Vk && x.xs[i] >= x.fi - 1e-9 && x.xs[i] <= L - x.ff + 1e-9);
  const lin = (rot: string, i: number, tipo: 'sup' | 'inf') => {
    if (i < 0) { E('esforcos', T4, { descricao: `${rot}: nulo`, formula: 'M = alavanca + biapoiada + travamento', expressao: '0', resultado: 0, unidade: 'kN·m', norma: FU, entradas: {} }); return; }
    const ml = x.Mlev[i], mb = x.biM[i], val = tipo === 'sup' ? x.Msup[i] : x.Minf[i];
    E('esforcos', T4, { descricao: `${rot}: máximo ao longo da viga (s = ${fm(x.xs[i])} m)`, formula: tipo === 'sup' ? 'Msup = máx(0; Malav) + máx(0; −Mbi) + Mtr' : 'Minf = máx(0; −Malav) + máx(0; Mbi) + Mtr', expressao: tipo === 'sup' ? `Msup = máx(0; ${fp(ml)}) + máx(0; ${fp(-mb)}) + ${fm(x.Mtr)} = ${fm(val)} kN·m` : `Minf = máx(0; ${fp(-ml)}) + máx(0; ${fp(mb)}) + ${fm(x.Mtr)} = ${fm(val)} kN·m`, resultado: val, unidade: 'kN·m', norma: `${FU}; M > 0 da alavanca traciona a face superior`, aConfirmar: true, entradas: { ...base, x: x.xs[i], Malav: ml, Mbi: mb, valor: val, tipo: tipo === 'sup' ? 1 : -1, npp: x.npp, ppP: x.ppP, ext: J([...x.ext.map((q) => [q.caso ?? 'cruzamento', q.s, q.P])]) } });
  };
  lin('Momento que traciona a face superior', iS, 'sup');
  lin('Momento que traciona a face inferior', iI, 'inf');
  if (iV >= 0) E('esforcos', T4, { descricao: `Cortante: máximo entre as faces dos pilares (s = ${fm(x.xs[iV])} m)`, formula: 'Vk = Σ|Valav| + |Vbi| + Vtr', expressao: `Vk = ${fm(x.Vlev[iV])} + ${fm(Math.abs(x.biV[iV]))} + ${fm(x.Vtr)} = ${fm(x.Vk)} kN`, resultado: x.Vk, unidade: 'kN', norma: FU, aConfirmar: true, entradas: { ...base, x: x.xs[iV], Valav: x.Vlev[iV], Vbi: x.biV[iV], Vk: x.Vk, npp: x.npp, ppP: x.ppP, ext: J(x.ext.map((q) => [q.caso ?? 'cruzamento', q.s, q.P])) } });
  E('esforcos', 'Viga de fundação · esforços de cálculo', { descricao: 'Esforços de cálculo: característicos × γf', formula: 'Md = γf·Mk; Vd = γf·Vk', expressao: `Md,sup = ${fm(x.gf)}·${fm(x.Mk.sup)} = ${fm(x.Md.sup)} kN·m; Md,inf = ${fm(x.gf)}·${fm(x.Mk.inf)} = ${fm(x.Md.inf)} kN·m; Vd = ${fm(x.gf)}·${fm(x.Vk)} = ${fm(x.Vd)} kN`, resultado: x.Vd, unidade: 'kN', norma: 'NBR 6122:2019 (γf do elemento); a confirmar', aConfirmar: true, entradas: { gf: x.gf, MkSup: x.Mk.sup, MkInf: x.Mk.inf, Vk: x.Vk, MdSup: x.Md.sup, MdInf: x.Md.inf, Vd: x.Vd } });

  // ---------------------------------------------------------------- seção
  const T5 = 'Viga de fundação · seção';
  E('dimensionamento', T5, { descricao: `Seção ${x.fixa ? 'informada (fixa)' : 'do modelo, com os mínimos das opções e aumento de 5 em 5 cm até atender'}: ${x.inicialOk ? 'a seção inicial atende' : `a seção inicial não atende (${x.inicialMotivo})`}; ${x.tentativas} verificação(ões)${x.forma ? `; forma ${x.forma}` : ''}`, formula: 'bw ≥ bmín; h ≥ hmín; flexão sem armadura dupla, armadura cabe na largura, Vd ≤ VRd2 e estribo existente', expressao: `modelo ${fm(x.b0 * 100)}×${fm(x.h0 * 100)} cm; mínimo ${fm(x.bMin * 100)}×${fm(x.hMin * 100)} cm → adotada ${fm(x.bw * 100)}×${fm(x.h * 100)} cm; d = ${fm(x.d)} m`, resultado: x.h, unidade: 'm', norma: FU, aConfirmar: true, entradas: { b0: x.b0, h0: x.h0, bMin: x.bMin, hMin: x.hMin, bw: x.bw, h: x.h, d: x.d, cob: x.cob, tentativas: x.tentativas, fixa: x.fixa ? 1 : 0 } });
  const d2 = x.cob + 0.013, geral = (sec: BeamSection) => ({ c, sec, taxaMin: 0, b: x.bw, h: x.h });
  for (const [rot, tp, sec, fc, M, arm] of [['superior (tração em cima)', 'sup', x.secS, x.fcS, x.Md.sup, x.sup], ['inferior (tração embaixo)', 'inf', x.secI, x.fcI, x.Md.inf, x.inf]] as const) {
    const T = `Viga de fundação · flexão ${tp === 'sup' ? 'superior' : 'inferior'}`;
    flexao(mem, el, T, geral(sec), M, x.d, d2, fyd, fc, arm.As, tp === 'inf', { semMinimo: true });
    const g = grossProps(sec), yt = fc ? g.ycb : sec.h - g.ycb, W0 = g.I / yt, Mmin = 0.8 * W0 * c.fctkSup, rm = beamFlexure(sec, fc, Mmin * 1000, x.d, 0.04, c, fyd);
    E('dimensionamento', T, { descricao: 'Armadura mínima da face (momento mínimo da seção)', formula: 'Md,mín = 0,8·W0·fctk,sup; As,mín = máx[As(Md,mín); 0,15 %·Ac]', expressao: `W0 = ${fm(g.I)}/${fm(yt)}; Md,mín = ${fm(Mmin * 1000)} kN·m; As,mín = máx(${cm2(rm.As)}; ${cm2(0.0015 * g.A)}) = ${cm2(arm.AsMin)}`, resultado: arm.AsMin, unidade: 'm²', norma: `${NBR}, 17.3.5.2.1`, entradas: { Ic: g.I, yt, fctkSup: c.fctkSup, AsMd: rm.As, Ac: g.A, AsMin: arm.AsMin } });
    const f = beamFlexure(sec, fc, M, x.d, d2, c, fyd), outra = beamFlexure(tp === 'sup' ? x.secI : x.secS, tp === 'sup' ? x.fcI : x.fcS, tp === 'sup' ? x.Md.inf : x.Md.sup, x.d, d2, c, fyd);
    E('dimensionamento', T, { descricao: `Armadura da face ${rot}: flexão somada à compressão da outra face (se dupla), no mínimo As,mín`, formula: 'As = máx(As,flex + As′(outra face); As,mín)', expressao: `As = máx(${cm2(f.As)} + ${cm2(outra.As2)}; ${cm2(arm.AsMin)}) = ${cm2(arm.As)}`, resultado: arm.As, unidade: 'm²', norma: `${NBR}, 17.3.5.2`, entradas: { AsFlex: f.As, As2Outra: outra.As2, AsMin: arm.AsMin, As: arm.As } });
    E('detalhamento', T, { descricao: `Barras da face ${rot}`, formula: 'menor área com espaçamento mínimo de 2 cm, estribo φ5 e dmáx 19 mm', expressao: arm.barras ? `${arm.barras.n} φ${fm(arm.barras.phi)} (${cm2(arm.barras.As)})` : 'não cabe na largura', resultado: arm.barras ? `${arm.barras.n} φ${fm(arm.barras.phi)}` : 'sem solução', unidade: '', norma: NBR, entradas: arm.barras ? { phi: arm.barras.phi, n: arm.barras.n, As: arm.barras.As } : {} });
  }
  // ---------------------------------------------------------------- cortante
  const T6 = 'Viga de fundação · cortante';
  const sh = x.sh;
  E('dimensionamento', T6, { descricao: 'Resistência da biela comprimida (modelo I, 90°) e parcela do concreto', formula: 'VRd2 = 0,27·αv2·fcd·bw·d; Vc = 0,6·fctd·bw·d', expressao: `VRd2 = ${fm(sh.VRd2)} kN; Vc = ${fm(sh.Vc)} kN; Vd = ${fm(x.Vd)} kN ${x.Vd <= sh.VRd2 + 1e-9 ? '≤' : '>'} VRd2`, resultado: sh.VRd2, unidade: 'kN', norma: `${NBR}, 17.4.2.2`, entradas: { av2: c.av2, fcd: c.fcd, fctd: c.fctd, bw: x.bw, d: x.d, Vd: x.Vd, VRd2: sh.VRd2, Vc: sh.Vc } });
  E('dimensionamento', T6, { descricao: 'Armadura transversal necessária, mínima e espaçamento máximo', formula: 'Asw/s = máx[ρmín·bw; (Vd − Vc)/(0,9·d·fywd)]; smáx = mín(0,6d; 30 cm) se Vd ≤ 0,67 VRd2, senão mín(0,3d; 20 cm)', expressao: `Asw/s = ${fm(sh.aswS * 1e4)} cm²/m (mínima ${fm(sh.aswMin * 1e4)} cm²/m); smáx = ${fm(sh.smax * 100)} cm${sh.stirrup ? `; estribo φ${fm(sh.stirrup.phi)} c/${fm(sh.stirrup.s * 100)} cm (${sh.stirrup.legs} ramos)` : ''}`, resultado: sh.aswS, unidade: 'm²/m', norma: `${NBR}, 17.4.2.2 e 17.4.1.1.1`, entradas: { fctm: c.fctm, fywk: x.fyk, bw: x.bw, d: x.d, Vd: x.Vd, Vc: sh.Vc, VRd2: sh.VRd2, fywd: Math.min(x.fyk / x.gs, 435), aswMin: sh.aswMin, aswS: sh.aswS, smax: sh.smax, ...(sh.stirrup ? { phi: sh.stirrup.phi, s: sh.stirrup.s, legs: sh.stirrup.legs } : {}) } });

  // ---------------------------------------------------------------- pele, ancoragem, mesa
  const T7 = 'Viga de fundação · pele e ancoragem';
  if (x.pele?.barras) E('detalhamento', T7, { descricao: 'Armadura de pele (h > 60 cm): 0,10 % da área da alma, em cada face', formula: 'AsFace = 0,001·bw·h; n = máx(2; ⌈AsFace/Asφ8⌉)', expressao: `AsFace = ${cm2(x.pele.AsFace)} → ${x.pele.barras.n} φ8 por face`, resultado: x.pele.AsFace, unidade: 'm²', norma: `${NBR}, 17.3.5.2.3`, entradas: { bw: x.bw, h: x.h, AsFace: x.pele.AsFace, n: x.pele.barras.n } });
  E('detalhamento', T7, { descricao: `Ancoragem das barras superiores (φ${fm(x.phiSup)}, ${x.boaAderencia ? 'boa' : 'má'} aderência: h ${x.boaAderencia ? '<' : '≥'} 60 cm); além do pilar equilibrado, com gancho${x.ancoragem.editada.ini || x.ancoragem.editada.fim ? '; valor editado pelo usuário em ao menos uma ponta' : ''}`, formula: 'lb = máx[(φ/4)·fyd/fbd; 25φ]; fbd = η1·η2·η3·fctd', expressao: `lb = ${fm(x.lb * 100)} cm; adotado ini = ${fm(x.ancoragem.ini * 100)} cm; fim = ${fm(x.ancoragem.fim * 100)} cm`, resultado: x.lb, unidade: 'm', norma: `${NBR}, 9.4.2.4`, entradas: { phi: x.phiSup, boa: x.boaAderencia ? 1 : 0, fctd: c.fctd, fyd, lb: x.lb, ancIni: x.ancoragem.ini, ancFim: x.ancoragem.fim } });
  if (x.mesa) E('detalhamento', T7, { descricao: `Mesa em balanço (${x.mesa.tipo}, mesa ${x.mesa.mesa}) tratada como laje: pressão líquida do solo é nula (a viga não se apoia no solo); armadura mínima de laje e de distribuição`, formula: 'Md = q·balanço²/2; As = máx(As,mín; As,flexão)', expressao: `balanço = ${fm(x.mesa.balanco)} m; hf = ${fm(x.mesa.hf)} m; q = ${fm(x.mesa.q)} kN/m²; Md = ${fm(x.mesa.Md)} kN·m/m; As adotada = ${fm(x.mesa.AsAdot)} cm²/m`, resultado: x.mesa.AsAdot, unidade: 'cm²/m', norma: 'Mesa como laje (E5k; a confirmar)', aConfirmar: true, entradas: { balanco: x.mesa.balanco, hf: x.mesa.hf, bf: x.mesa.bf, d: x.mesa.d, q: x.mesa.q, Md: x.mesa.Md, AsAdot: x.mesa.AsAdot } });

  // ---------------------------------------------------------------- cortes (R8b)
  if (x.cortes) for (const f of [x.cortes.inf, x.cortes.sup]) registrarCortesFace(mem, el, f, x);

  // ---------------------------------------------------------------- quantitativos
  const T8 = 'Viga de fundação · quantitativos';
  E('detalhamento', T8, { descricao: 'Trecho útil entre as faces dos pilares, estribos (espaçados no trecho, ou em todo o vão se as esperas forem consideradas) e perímetro do estribo', formula: 'Lc = L − fi − ff; nEst = ⌈Lest/s⌉ + 1; perímetro = 2·(bw − 2c + h − 2c) + 0,20', expressao: `Lc = ${fm(x.Lc)} m; Lest = ${fm(x.Lest)} m; estribos = ${x.nEst}; perímetro = ${fm(x.perim)} m`, resultado: x.nEst, unidade: '', norma: NBR, entradas: { Lc: x.Lc, Lest: x.Lest, nEst: x.nEst, perim: x.perim, s: x.sh.stirrup?.s ?? 0 } });
  E('detalhamento', T8, { descricao: 'Volume de concreto (entre as faces dos pilares) e peso de aço (barras corridas ou cortadas, estribos, pele e mesa)', formula: 'V = A·Lc; aço = Σ As·ℓ·7850', expressao: `V = ${fm(x.volume)} m³; aço = ${fm(x.aco)} kg`, resultado: x.volume, unidade: 'm³', norma: NBR, entradas: { V: x.volume, aco: x.aco, Lc: x.Lc } });
  E('detalhamento', T8, { descricao: x.status === 'ok' ? 'Viga de fundação atende' : 'Viga de fundação NÃO atende', formula: 'verificações', expressao: x.mensagens.join(' ') || 'sem mensagens', resultado: x.status === 'ok' ? 'atende' : 'não atende', unidade: '', entradas: {} as Record<string, ValorMemoria> });
}

/** Cortes da armadura principal de uma face (R8b): barras passantes, reforços escalonados e economia de comprimento. */
function registrarCortesFace(mem: Registrador, el: string, f: FaceCortesVF, x: CtxVigaFundacao) {
  const T = `Viga de fundação · cortes da armadura ${f.face === 'inf' ? 'inferior' : 'superior'}`;
  const Ab = (Math.PI * (f.phi / 1000) ** 2) / 4, cheia = Math.max(0, x.L - 2 * x.cob);
  mem.passo({ etapa: 'detalhamento', elemento: el, topico: T, descricao: `Face ${f.face === 'inf' ? 'inferior' : 'superior'} (${f.papel}, convenção invertida: a face de maior momento de cálculo faz o papel dos negativos): ${f.n} φ${fm(f.phi)}; ${f.passantes} corrida(s) de ponta a ponta${f.grupos.length ? ` e ${f.grupos.length} grupo(s) cortado(s) onde a armadura necessária decalada de aℓ = d passa da capacidade das passantes` : ' (sem escalonamento: não economiza barra)'}`, formula: 'nP = mín(n; máx(2; ⌈n·fração passante⌉; ⌈As,mín/Ab⌉)); comprimento corrido = L − 2c; total = nP·ℓ + Σ n·ℓgrupo', expressao: `${f.passantes} × ${fm(f.comprimentoPassante)} m${f.grupos.map((g) => ` + ${g.n} × ${fm(g.comprimento)} m (de ${fm(g.s0)} a ${fm(g.s1)} m)`).join('')} = ${fm(f.comprimentoTotal)} m (sem cortes: ${fm(f.comprimentoSemCortes)} m)`, resultado: f.comprimentoTotal, unidade: 'm', norma: 'NBR 6118:2023, 17.4.2.2 (aℓ = d) e 9.4; lb em cada lado; critério do programa (R8b, a confirmar)', aConfirmar: true, entradas: { n: f.n, phi: f.phi, Ab, passantes: f.passantes, ell: f.comprimentoPassante, cheia, total: f.comprimentoTotal, semCortes: f.comprimentoSemCortes, grupos: J(f.grupos.map((g) => [g.n, g.s0, g.s1, g.comprimento])) } });
}
