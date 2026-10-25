// Memória detalhada (MD fase 7): alvenaria estrutural e paredes de blocos (NBR 16868, premissas "a confirmar"). Resistências
// do bloco, do prisma e da parede, esbeltez, utilizações por elemento da casca (compressão, tração, cisalhamento), fator de
// cumprimento do pano, armadura vertical e horizontal das paredes de blocos armadas, lado curto (pilar de alvenaria),
// vergas e contravergas, aço (barras) e vigas sobre muros. Chamadas só com a memória ligada, depois do cálculo.
import { barArea } from '../concrete';
import { esbeltezAlvenaria, flexaoArmadaFaixa, fvdDe, utilizacaoElemento, type ResistenciaAlv } from '../building/alvenaria';
import { posicoesBarrasVerticais, pesoLinearAlv, RHO_ACO, type AcoAlvParede } from '../building/alvenariaAco';
import type { EntradaPanoAlv, EntradaVerga, ResultadoAlvenariaParede, ResultadoVerga, ResultadoVigaMuro, SaidaPanoAlv } from '../building/alvenariaDim';
import type { OpcoesCalculo } from '../building/opcoes';
import type { EsforcoLado } from '../building/paredesLado';
import type { TipoAlvenaria, TipoBloco } from '../building/types';
import { fm, type Registrador } from './registrador';
import { mk } from './paredes';

const NBR = 'NBR 16868-1:2020';
const AC = { norma: `${NBR} (a confirmar)`, aConfirmar: true };

export interface CtxResistencias { elemento: string; t: TipoAlvenaria; bl?: TipoBloco; res: ResistenciaAlv; op: OpcoesCalculo }

/** Resistências de cálculo da alvenaria: bloco → prisma → parede → cálculo; tração, cisalhamento e rigidez. */
export function registrarResistenciasAlv(mem: Registrador, x: CtxResistencias) {
  const { t, bl, res, op } = x;
  const P = mk(mem, x.elemento), T = `Resistências da alvenaria (${t.nome})`;
  if (res.modelo === 'blocos') {
    const fbk = res.fbk ?? 0, fpk = res.fpk ?? 0, fk = res.fk ?? 0;
    P('dimensionamento', T, { descricao: `Bloco ${bl?.nome ?? ''} (${bl ? `${fm(bl.comprimento * 100)} × ${fm(bl.largura * 100)} × ${fm(bl.altura * 100)} cm` : ''}): resistência característica na área bruta`, formula: 'fbk (dado do bloco)', expressao: `fbk = ${fm(fbk)} MPa`, resultado: fbk, unidade: 'MPa', ...AC, entradas: { fbk } });
    P('dimensionamento', T, { descricao: t.fpk !== undefined ? 'Resistência característica do prisma informada' : 'Resistência característica do prisma estimada pelo fbk', formula: t.fpk !== undefined ? 'fpk (informado)' : 'fpk = η·fbk (η = relação prisma/bloco das opções)', expressao: `fpk = ${t.fpk !== undefined ? '' : `${fm(op.alvenariaPrisma)}·`}${fm(fbk)}${t.fpk !== undefined ? '' : ` = ${fm(fpk)}`} MPa`, resultado: fpk, unidade: 'MPa', ...AC, entradas: { fbk, eta: op.alvenariaPrisma, fpkInformado: t.fpk ?? 'não', fpk } });
    P('dimensionamento', T, { descricao: 'Resistência característica da parede', formula: 'fk = ξ·fpk (ξ = relação parede/prisma das opções)', expressao: `fk = ${fm(op.alvenariaFkPrisma)}·${fm(fpk)} = ${fm(fk)} MPa`, resultado: fk, unidade: 'MPa', ...AC, entradas: { xi: op.alvenariaFkPrisma, fpk, fk } });
    P('dimensionamento', T, { descricao: 'Resistência de cálculo à compressão', formula: 'fd = fk/γm', expressao: `fd = ${fm(fk)}/${fm(op.alvenariaGamaM)} = ${fm(res.fd)} MPa`, resultado: res.fd, unidade: 'MPa', ...AC, entradas: { fk, gamaM: op.alvenariaGamaM, fd: res.fd } });
  } else P('dimensionamento', T, { descricao: 'Alvenaria genérica: resistência de cálculo à compressão informada', formula: 'fd (informado)', expressao: `fd = ${fm(res.fd)} MPa`, resultado: res.fd, unidade: 'MPa', ...AC, entradas: { fd: res.fd } });
  P('dimensionamento', T, { descricao: t.ftd !== undefined ? 'Resistência de cálculo à tração informada' : 'Resistência de cálculo à tração como fração da compressão', formula: t.ftd !== undefined ? 'ftd (informado)' : 'ftd = p·fd (p = % das opções)', expressao: `ftd = ${t.ftd !== undefined ? '' : `${fm(op.alvenariaTracao / 100)}·${fm(res.fd)} = `}${fm(res.ftd)} MPa`, resultado: res.ftd, unidade: 'MPa', ...AC, entradas: { pTracao: op.alvenariaTracao, fd: res.fd, ftd: res.ftd } });
  if (res.cis.modo === 'blocos') P('dimensionamento', T, { descricao: 'Cisalhamento (blocos): resistência característica inicial, limite e coeficiente', formula: 'fvd(σ) = mín(fv0 + 0,5·σ; fvMáx)/γm', expressao: `fv0 = ${fm(res.cis.fv0)} MPa; fvMáx = ${fm(res.cis.fvMax)} MPa; γm = ${fm(res.cis.gamaM)}; fvd(0) = ${fm(fvdDe(res, 0))} MPa`, resultado: fvdDe(res, 0), unidade: 'MPa', ...AC, entradas: { fv0: res.cis.fv0, fvMax: res.cis.fvMax, gamaM: res.cis.gamaM, fvd0: fvdDe(res, 0) } });
  else P('dimensionamento', T, { descricao: 'Cisalhamento (genérica): resistência de cálculo informada (ou igual à tração)', formula: 'fvd (informado ou ftd)', expressao: `fvd = ${fm(res.cis.fvd)} MPa`, resultado: res.cis.fvd, unidade: 'MPa', ...AC, entradas: { fvd: res.cis.fvd } });
  P('analise', T, { descricao: 'Rigidez da alvenaria na casca: E, G e ν', formula: 'E = mín(800·fpk; 16 000) (ou informado); G = E/(2(1 + ν))', expressao: `E = ${fm(res.E)} MPa; G = ${fm(res.G)} MPa; ν = ${fm(res.nu)}; γ = ${fm(res.gama)} kN/m³`, resultado: res.E, unidade: 'MPa', ...AC, entradas: { E: res.E, G: res.G, nu: res.nu, gama: res.gama } });
}

// ------------------------------------------------------------------------------------------------ pano

export interface CtxPanoAlv {
  elemento: string; lado: string; lance: string; ip: number; panos: number; s0: number; s1: number;
  e: EntradaPanoAlv; r: SaidaPanoAlv;
}

/** Cadeia de um elemento da casca contra as tensões-limite da alvenaria (a mesma de `utilizacaoElemento`). */
function cadeiaElementoAlv(P: ReturnType<typeof mk>, T: string, f: { nx: number; ny: number; nxy: number; mx: number; my: number; mxy: number }, o: { t: number; res: ResistenciaAlv; op: OpcoesCalculo; esb: ReturnType<typeof esbeltezAlvenaria>; combo: string; s: number; z: number; papel: string }) {
  const { t, res, op, esb } = o;
  const u = utilizacaoElemento({ ...f, qx: 0, qy: 0 }, t, esb, res, op);
  const k = 1 / (t * 1000), Nc = Math.max(0, -f.ny), sN = -f.ny * k;
  const Mmin = op.alvenariaExcMin > 0 ? (Nc * esb.hef) / op.alvenariaExcMin : 0, Md = Math.max(Math.abs(f.my), Mmin);
  const sM = (6 * Md) / (t * t * 1000), sMt = (6 * Math.abs(f.my)) / (t * t * 1000), sH = -f.nx * k, sMh = (6 * Math.abs(f.mx)) / (t * t * 1000), tau = Math.abs(f.nxy) * k;
  P('esforcos', T, { descricao: `Elemento governante (${o.papel}): esforços de cálculo da combinação ${o.combo} no elemento em s = ${fm(o.s)} m, z = ${fm(o.z)} m`, formula: 'ny, nx, nxy (kN/m); my, mx (kN·m/m); compressão < 0', expressao: `nx = ${fm(f.nx)}; ny = ${fm(f.ny)}; nxy = ${fm(f.nxy)}; mx = ${fm(f.mx)}; my = ${fm(f.my)}`, resultado: f.ny, unidade: 'kN/m', norma: 'NBR 8681:2003, 5.1.3', entradas: { combinacao: o.combo, s: o.s, z: o.z, nx: f.nx, ny: f.ny, nxy: f.nxy, mx: f.mx, my: f.my, mxy: f.mxy } });
  P('dimensionamento', T, { descricao: 'Tensões do elemento: compressão vertical, momento fora do plano com excentricidade mínima, compressão horizontal e cisalhamento', formula: 'σN = −ny/t; Mmín = N·hef/exc; Md = máx(|my|; Mmín); σM = 6·Md/t²; σH = −nx/t; σMh = 6·|mx|/t²; τ = |nxy|/t', expressao: `σN = ${fm(sN)}; Mmín = ${fm(Mmin)} kN·m/m; σM = ${fm(sM)}; σH = ${fm(sH)}; σMh = ${fm(sMh)}; τ = ${fm(tau)} MPa`, resultado: sN, unidade: 'MPa', ...AC, entradas: { t, ny: f.ny, nx: f.nx, nxy: f.nxy, my: f.my, mx: f.mx, Nc, hef: esb.hef, exc: op.alvenariaExcMin, Mmin, Md, sN, sM, sMt, sH, sMh, tau } });
  P('dimensionamento', T, { descricao: res.armada ? 'Utilização do elemento (parede armada: a tração fica com a armadura; flexão fora do plano por bloco retangular; cisalhamento até 0,25·fd)' : 'Utilização do elemento: compressão, tração e cisalhamento contra as tensões-limite', formula: res.armada ? 'comp = máx(σN/(fd·R) [se a flexão atende]; σH/fd + σMh/fd); trac = 0; cis = τ/(0,25·fd)' : 'comp = máx(σN/(fd·R) + σM/fd; σH/fd + σMh/fd); trac = máx(σMt − σN; −σH + σMh; 0)/ftd; cis = τ/fvd(σN)', expressao: `comp = ${fm(u.comp)}; trac = ${fm(u.trac)}; cis = ${fm(u.cis)} → máx = ${fm(u.max)} (${u.modo})`, resultado: u.max, unidade: '', ...AC, entradas: { fd: res.fd, R: esb.R, ftd: res.ftd, fvd: fvdDe(res, Math.max(0, sN)), comp: u.comp, trac: u.trac, cis: u.cis, max: u.max, modo: u.modo } });
}

/** Pano de alvenaria: esbeltez, utilização de cada elemento, fator de cumprimento, armadura (blocos armados) e resultado. */
export function registrarPanoAlv(mem: Registrador, x: CtxPanoAlv) {
  const { e, r } = x;
  const P = mk(mem, x.elemento), T = `Lado ${x.lado} · pano ${x.ip + 1} de ${x.panos} (s de ${fm(x.s0)} a ${fm(x.s1)} m)`;
  const { t, H, res, op } = e;
  const esb = esbeltezAlvenaria(H, t, op, res.armada);
  P('dimensionamento', T, { descricao: `Esbeltez do pano no lance ${x.lance}: altura efetiva hef = c·H, λ = hef/t, redutor R = 1 − (λ/40)³ e limite${res.armada ? ' da alvenaria armada' : ''}`, formula: 'hef = c·H; λ = hef/t; R = 1 − (λ/40)³ ≥ 0; λ ≤ λmáx', expressao: `hef = ${fm(op.alvenariaFlambagem)}·${fm(H)} = ${fm(esb.hef)} m; λ = ${fm(esb.hef)}/${fm(t)} = ${fm(esb.lambda)} ${esb.ok ? '≤' : '>'} ${fm(esb.max)}; R = ${fm(esb.R)}`, resultado: esb.lambda, unidade: '', ...AC, entradas: { c: op.alvenariaFlambagem, H, t, hef: esb.hef, lambda: esb.lambda, R: esb.R, lambdaMax: esb.max } });
  // utilização por elemento e fator de cumprimento (o mesmo laço de verificarPanoAlvenaria)
  let areaTot = 0, areaOk = 0, pior = 0;
  const fat: (number | string)[][] = [];
  let gov: { el: number; c: number } | null = null;
  let nVertMax = -1, nVertEl: { el: number; c: number } | null = null, nHorMax = -1, nHorEl: { el: number; c: number } | null = null;
  const kFyd = res.armada ? e.fydV : 1;
  e.elementos.forEach((el, ie) => {
    let w: { u: ReturnType<typeof utilizacaoElemento>; c: number } | null = null;
    el.forcas.forEach((f, c) => {
      const u = utilizacaoElemento(f, t, esb, res, op);
      if (!w || u.max > w.u.max) w = { u, c };
      if (res.armada) {
        const Nc = Math.max(0, -f.ny), M = Math.max(Math.abs(f.my), op.alvenariaExcMin > 0 ? (Nc * esb.hef) / op.alvenariaExcMin : 0);
        const fl = flexaoArmadaFaixa(-f.ny, M, t, res.fd * esb.R, kFyd);
        if (fl.ok && fl.As > nVertMax) { nVertMax = fl.As; nVertEl = { el: ie, c }; }
        const exc = Math.max(0, Math.abs(f.nxy) - fvdDe(res, Math.max(0, -f.ny / (t * 1000))) * t * 1000);
        const nh = ((Math.max(0, f.nx) + exc) / (e.fydH * 1000)) * 1e4;
        if (nh > nHorMax) { nHorMax = nh; nHorEl = { el: ie, c }; }
      }
    });
    if (!w) return;
    const { u, c } = w as { u: ReturnType<typeof utilizacaoElemento>; c: number };
    areaTot += el.area;
    if (u.max <= 1 + 1e-9) areaOk += el.area;
    if (u.max > pior) { pior = u.max; gov = { el: ie, c }; }
    fat.push([el.s, el.z, el.area, u.comp, u.trac, u.cis, u.max, c]);
  });
  P('dimensionamento', T, { descricao: `Utilização de cada elemento (fatia) do pano: combinação mais desfavorável entre as ${e.combos.length} ELU`, formula: 'por elemento: máx sobre as combinações de máx(comp; trac; cis)', expressao: `${fat.length} elementos; utilização máxima = ${fm(pior)}`, resultado: pior, unidade: '', ...AC, entradas: { combinacoes: JSON.stringify(e.combos), elementos: JSON.stringify(fat) }, observacao: 'elementos = [s, z, área, comp, trac, cis, máx, índice da combinação] de cada elemento.' });
  if (gov) {
    const g = gov as { el: number; c: number }, el = e.elementos[g.el];
    cadeiaElementoAlv(P, T, el.forcas[g.c], { t, res, op, esb, combo: e.combos[g.c], s: el.s, z: el.z, papel: 'maior utilização' });
  }
  const exigido = op.alvenariaCumprimento / 100, cumprimento = areaTot > 0 ? areaOk / areaTot : 1;
  P('dimensionamento', T, { descricao: 'Fator de cumprimento: fração da área do pano cujos elementos atendem às tensões-limite', formula: 'cumprimento = Σ área dos elementos com máx ≤ 1 / Σ área ≥ exigido', expressao: `cumprimento = ${fm(areaOk)}/${fm(areaTot)} = ${fm(cumprimento * 100)} % (exigido ${fm(exigido * 100)} %); ${r.pontos.length} ponto(s) fora`, resultado: cumprimento, unidade: '', ...AC, entradas: { areaTotal: areaTot, areaAtende: areaOk, cumprimento, exigido } });
  if (res.armada && r.armadura) {
    const a = r.armadura;
    const mV = (op.alvenariaTaxaVertMin / 100) * t * 1e4, mH = (op.alvenariaTaxaHorMin / 100) * t * 1e4;
    const chV = nVertEl as { el: number; c: number } | null, chH = nHorEl as { el: number; c: number } | null;
    P('dimensionamento', T, { descricao: 'Armadura vertical necessária (flexo-compressão da faixa de 1 m, bloco retangular com as barras no centro): maior As entre os elementos e mínimo por taxa', formula: 'M = máx(|my|; N·hef/exc); a = (t − √(t² − 8M/f))/2; T = f·a − N; As = T/fyd; As,nec = máx(As; ρv,mín·t)', expressao: `As,flexão = ${fm(Math.max(0, nVertMax))} cm²/m${chV ? ` (elemento s = ${fm(e.elementos[chV.el].s)}, z = ${fm(e.elementos[chV.el].z)}, ${e.combos[chV.c]})` : ''}; mínimo = ${fm(op.alvenariaTaxaVertMin)} %·t = ${fm(mV)}; As,nec = ${fm(a.nec.vert)} cm²/m`, resultado: a.nec.vert, unidade: 'cm²/m', ...AC, entradas: { AsFlexao: Math.max(0, nVertMax), taxaVertMin: op.alvenariaTaxaVertMin, t, minVert: mV, nec: a.nec.vert, fyd: e.fydV, fcRed: res.fd * esb.R, hef: esb.hef, exc: op.alvenariaExcMin, ...(chV ? { combinacao: e.combos[chV.c], ny: e.elementos[chV.el].forcas[chV.c].ny, my: e.elementos[chV.el].forcas[chV.c].my } : {}) } });
    P('dimensionamento', T, { descricao: 'Armadura horizontal necessária: tração horizontal mais o excedente de cisalhamento sobre o fvd(σ)', formula: 'exc = máx(0; |nxy| − fvd(σN)·t·10³); As,h = (máx(0; nx) + exc)/(fyd·1000)·10⁴; As,nec = máx(As,h; ρh,mín·t)', expressao: `As,h = ${fm(Math.max(0, nHorMax))} cm²/m${chH ? ` (${e.combos[chH.c]})` : ''}; mínimo = ${fm(op.alvenariaTaxaHorMin)} %·t = ${fm(mH)}; As,nec = ${fm(a.nec.hor)} cm²/m`, resultado: a.nec.hor, unidade: 'cm²/m', ...AC, entradas: { AsHor: Math.max(0, nHorMax), taxaHorMin: op.alvenariaTaxaHorMin, t, minHor: mH, nec: a.nec.hor, fyd: e.fydH, ...(chH ? { combinacao: e.combos[chH.c], nx: e.elementos[chH.el].forcas[chH.c].nx, nxy: e.elementos[chH.el].forcas[chH.c].nxy, ny: e.elementos[chH.el].forcas[chH.c].ny } : {}) } });
    const fb = (m: { phi: number; s: number; As: number } | null) => (m ? `φ${fm(m.phi)} c/${fm(m.s * 100)} cm (${fm(m.As)} cm²/m)` : 'nenhuma malha atende');
    P('detalhamento', T, { descricao: `Armadura adotada (${a.origem === 'bloqueada' ? 'definida no tipo de alvenaria, só verificada' : 'menor malha que atende, espaçamento múltiplo do módulo do bloco'}): vertical ${fb(a.vert)}; horizontal ${fb(a.hor)}`, formula: 'As = π·φ²/4/s ≥ As,nec', expressao: `vertical ${fm(a.vert?.As ?? 0)} ≥ ${fm(a.nec.vert)}; horizontal ${fm(a.hor?.As ?? 0)} ≥ ${fm(a.nec.hor)} cm²/m`, resultado: a.vert?.As ?? 0, unidade: 'cm²/m', ...AC, entradas: { origem: a.origem, phiV: a.vert?.phi ?? 0, sV: a.vert?.s ?? 0, asV: a.vert?.As ?? 0, phiH: a.hor?.phi ?? 0, sH: a.hor?.s ?? 0, asH: a.hor?.As ?? 0, necV: a.nec.vert, necH: a.nec.hor } });
  }
  P('dimensionamento', T, { descricao: `Resultado do pano: ${r.status === 'ok' ? 'atende' : 'NÃO atende'}`, formula: 'status = ok se esbeltez, cumprimento e armadura atendem', expressao: r.mensagens.length ? r.mensagens.join(' ') : 'sem mensagens', resultado: r.status, unidade: '', entradas: { utilComp: r.util.comp, utilTrac: r.util.trac, utilCis: r.util.cis } });
}

// ------------------------------------------------------------------------------------------------ lado curto

export interface CtxLadoAlv { elemento: string; lado: string; lance: string; L: number; t: number; H: number; es: EsforcoLado[]; res: ResistenciaAlv; op: OpcoesCalculo; r: { util: number; combo: string; lambda: number; ok: boolean } }

/** Lado curto (pilar de alvenaria): compressão σN/(fd·R) + σM/fd e tração σM − σN contra ftd, sem crédito de armadura. */
export function registrarLadoAlv(mem: Registrador, x: CtxLadoAlv) {
  const P = mk(mem, x.elemento), T = `Lado curto ${x.lado} (pilar de alvenaria)`;
  const { L, t, H, res, op } = x, esb = esbeltezAlvenaria(H, t, op, res.armada), A = L * t;
  P('dimensionamento', T, { descricao: 'Esbeltez e redutor do lado curto, tratado como pilar de alvenaria (sem crédito de armadura, a favor da segurança)', formula: 'hef = c·H; λ = hef/t; R = 1 − (λ/40)³; A = L·t', expressao: `hef = ${fm(esb.hef)} m; λ = ${fm(esb.lambda)} (limite ${fm(esb.max)}); R = ${fm(esb.R)}; A = ${fm(A)} m²`, resultado: esb.lambda, unidade: '', ...AC, entradas: { c: op.alvenariaFlambagem, H, L, t, A, hef: esb.hef, lambda: esb.lambda, R: esb.R, lambdaMax: esb.max } });
  let util = 0, combo = '';
  for (const e of x.es) {
    const sN = -e.N / (A * 1000), Nc = Math.max(0, -e.N);
    const Mo = Math.max(Math.abs(e.Mo), op.alvenariaExcMin > 0 ? (Nc * esb.hef) / op.alvenariaExcMin : 0);
    const sM = (6 * Mo) / (L * t * t * 1000) + (6 * Math.abs(e.Mp)) / (t * L * L * 1000), sMt = (6 * Math.abs(e.Mo)) / (L * t * t * 1000) + (6 * Math.abs(e.Mp)) / (t * L * L * 1000);
    const comp = Math.max(0, sN) / (res.fd * esb.R || 1e-12) + sM / res.fd, trac = res.ftd > 0 ? Math.max(0, sMt - sN) / res.ftd : Math.max(0, sMt - sN) > 1e-9 ? 99 : 0;
    const u = Math.max(comp, trac);
    if (u > util || !combo) { util = u; combo = e.nome; }
    P('dimensionamento', T, { descricao: `Combinação ${e.nome}: tensões e utilizações`, formula: 'σN = −N/A; Mo,d = máx(|Mo|; N·hef/exc); σM = 6·Mo,d/(L·t²) + 6·|Mp|/(t·L²); comp = σN/(fd·R) + σM/fd; trac = (σMt − σN)/ftd', expressao: `N = ${fm(e.N)} kN; Mp = ${fm(e.Mp)}; Mo = ${fm(e.Mo)} kN·m → σN = ${fm(sN)}; σM = ${fm(sM)}; σMt = ${fm(sMt)} MPa; comp = ${fm(comp)}; trac = ${fm(trac)}`, resultado: u, unidade: '', ...AC, entradas: { combinacao: e.nome, N: e.N, Mp: e.Mp, Mo: e.Mo, Mod: Mo, A, L, t, hef: esb.hef, exc: op.alvenariaExcMin, fd: res.fd, ftd: res.ftd, R: esb.R, sN, sM, sMt, comp, trac } });
  }
  P('dimensionamento', T, { descricao: `Utilização do lado curto (combinação ${combo})${x.r.ok ? '' : ': NÃO atende'}`, formula: 'util = máx(util_i); atende se util ≤ 1 e λ ≤ λmáx', expressao: `util = ${fm(util)}; λ = ${fm(esb.lambda)}`, resultado: util, unidade: '', ...AC, entradas: { util, combinacao: combo, lambda: esb.lambda } });
}

// ------------------------------------------------------------------------------------------------ verga

export interface CtxVergaAlv { elemento: string; lado: string; lance: string; e: EntradaVerga; r: ResultadoVerga }

/** Verga e contraverga da abertura em parede de blocos: tração, cortante, estribos, barras na canaleta e modulação. */
export function registrarVergaAlv(mem: Registrador, x: CtxVergaAlv) {
  const { e, r } = x;
  const P = mk(mem, x.elemento), T = `Verga ${e.a.tipo === 'porta' ? 'da porta' : 'da janela'} ${e.a.id} (lado ${x.lado})`;
  const tracao = (f: EntradaVerga['verga'], h: number, nome: string, nec: number) => {
    const z = 0.9 * Math.max(0.05, h - 0.04);
    let melhor = 0, ic = 0;
    f.combos.forEach((c, i) => { const v = (c.N / 2 + Math.abs(c.M) / z) / (e.fyd * 1000) * 1e4; if (v > melhor) { melhor = v; ic = i; } });
    const c = f.combos[ic];
    P('dimensionamento', T, { descricao: `Armadura da ${nome}: tração da camada inferior da faixa de ${fm(h)} m (normal e momento integrados; combinação ${ic + 1} determinante)`, formula: 'z = 0,9·(h − 4 cm); T = N/2 + |M|/z; As = T/(fyd·1000)·10⁴', expressao: `z = ${fm(z)}; N = ${fm(c?.N ?? 0)} kN; M = ${fm(c?.M ?? 0)} kN·m → As = ${fm(nec)} cm²`, resultado: nec, unidade: 'cm²', ...AC, entradas: { h, z, fyd: e.fyd, N: c?.N ?? 0, M: c?.M ?? 0, indice: ic, combos: JSON.stringify(f.combos.map((q) => [q.N, q.M, q.V])) } });
  };
  tracao(e.verga, e.hVerga, 'verga', r.necessaria.verga);
  if (e.a.tipo === 'janela') tracao(e.peitoril, e.hPeitoril, 'contraverga', r.necessaria.contraverga);
  const V = Math.max(0, ...e.verga.combos.map((c) => Math.abs(c.V))), d = Math.max(0.05, e.hVerga - 0.04);
  const VRd = fvdDe(e.res, 0) * 1000 * e.t * d, VRd2 = 0.25 * e.res.fd * 1000 * e.t * d;
  P('dimensionamento', T, { descricao: 'Cortante da verga: resistência da alvenaria sem compressão (a favor da segurança), estribos pelo excedente e limite da biela', formula: 'VRd = fvd(0)·t·d; VRd2 = 0,25·fd·t·d; Asw/s = (V − VRd)/(0,9·d·fywd)', expressao: `V = ${fm(V)} kN; VRd = ${fm(VRd)}; VRd2 = ${fm(VRd2)} kN; Asw/s = ${fm(r.necessaria.estribo)} cm²/m`, resultado: VRd, unidade: 'kN', ...AC, entradas: { t: e.t, d, V, fvd0: fvdDe(e.res, 0), fd: e.res.fd, VRd, VRd2, fywd: e.fyd, nEst: r.necessaria.estribo } });
  const a = r.armadura, fb = (b?: { n: number; phi: number }) => (b ? `${b.n} φ${fm(b.phi)}` : '—');
  P('detalhamento', T, { descricao: `Armadura adotada (${r.origem === 'calculada' ? 'calculada: barras na canaleta grauteada, n ≥ 2 e φ ≥ 8 mm' : r.origem === 'bloqueada' ? 'bloqueada pelo usuário' : 'padrão por tipo de abertura'}): verga ${fb(a)}${a.estribo ? `, estribo φ${fm(a.estribo.phi)} c/${fm(a.estribo.s * 100)} cm` : ''}${a.contraverga ? `, contraverga ${fb(a.contraverga)}` : ''}; apoio ${fm(r.apoio)} m de cada lado; ${r.fiadas} fiada(s) de canaleta`, formula: 'As adotada = n·π·φ²/4 ≥ As necessária; apoio = ⌈apoio mín./(meio bloco)⌉·meio bloco', expressao: `verga ${fm(a.n * barArea(a.phi) * 1e4)} cm² ≥ ${fm(r.necessaria.verga)}${r.modular ? '' : '; abertura fora da modulação do bloco'}`, resultado: a.n * barArea(a.phi) * 1e4, unidade: 'cm²', ...AC, entradas: { origem: r.origem, n: a.n, phi: a.phi, ...(a.contraverga ? { contravergaN: a.contraverga.n, contravergaPhi: a.contraverga.phi } : {}), ...(a.estribo ? { estriboPhi: a.estribo.phi, estriboS: a.estribo.s } : {}), apoio: r.apoio, fiadas: r.fiadas, modular: r.modular ? 1 : 0, semAviso: r.semAviso ? 1 : 0 }, observacao: r.mensagens.join(' ') || undefined });
}

// ------------------------------------------------------------------------------------------------ aço e vigas sobre muros

/** Barras de aço da parede de blocos armada: quantidade, comprimento, peso (a fonte única da tabela de aço da prancha). */
export function registrarAcoAlv(mem: Registrador, elemento: string, r: ResultadoAlvenariaParede, aco: AcoAlvParede, modulo: number, alturaBloco: number, op: OpcoesCalculo, lance: string) {
  const P = mk(mem, elemento), T = 'Aço da alvenaria armada';
  const barras = aco.barras.filter((b) => b.pavimento === lance);
  for (const b of barras) {
    const tipo = { vertical: 'barras verticais nas células grauteadas', horizontal: 'barras horizontais de junta', verga: 'verga', contraverga: 'contraverga', estribo: 'estribos da verga' }[b.tipo];
    const p = b.pano !== undefined ? r.panos.find((q) => q.lado === b.lado && q.pavimento === b.pavimento && q.pano === b.pano) : undefined;
    const ent: Record<string, number | string> = { tipo: b.tipo, aco: b.aco, phi: b.phi, quant: b.quant, comprimento: b.comprimento, area: barArea(b.phi), rho: RHO_ACO, pesoLinear: pesoLinearAlv(b.phi), peso: b.peso };
    let formula = 'peso = quantidade·comprimento·(π·φ²/4)·7850', expr = '';
    if (b.tipo === 'vertical' && p?.armadura?.vert) {
      const pos = posicoesBarrasVerticais(p.s0, p.s1, p.armadura.vert.s, modulo);
      Object.assign(ent, { s0: p.s0, s1: p.s1, sV: p.armadura.vert.s, modulo, alturaLance: p.z1 - p.z0, transpasse: op.alvenariaTranspasse });
      formula = 'quantidade = ⌊(s1 − s0 − módulo)/s⌋ + 1; comprimento = H + transpasse·φ; ' + formula;
      expr = `${pos.length} barras de ${fm(b.comprimento)} m`;
    } else if (b.tipo === 'horizontal' && p?.armadura?.hor) {
      Object.assign(ent, { s0: p.s0, s1: p.s1, sH: p.armadura.hor.s, alturaLance: p.z1 - p.z0 });
      formula = 'quantidade = ⌊H/s⌋; comprimento = s1 − s0; ' + formula;
      expr = `${b.quant} barras de ${fm(b.comprimento)} m`;
    } else { Object.assign(ent, { alturaBloco }); formula = tipo === 'estribos da verga' ? 'quantidade = (⌊vão/s⌋ + 1)·(2 se há contraverga); comprimento = perímetro da canaleta (cobrimento 2 cm); ' + formula : 'comprimento = vão + 2·apoio; ' + formula; expr = `${b.quant} × ${fm(b.comprimento)} m`; }
    P('detalhamento', T, { descricao: `${tipo[0].toUpperCase()}${tipo.slice(1)} φ${fm(b.phi)} (${b.nomePav}, lado ${b.nomeLado}${b.pano !== undefined ? `, pano ${b.pano + 1}` : ''}${b.abertura ? `, abertura ${b.abertura}` : ''})`, formula, expressao: `${expr}; peso = ${b.quant}·${fm(b.comprimento)}·${fm(pesoLinearAlv(b.phi))} = ${fm(b.peso)} kg`, resultado: b.peso, unidade: 'kg', ...AC, entradas: ent, observacao: 'Sem ganchos, dobras ou perdas (as perdas entram no resumo da folha).' });
  }
  const pesoLance = barras.reduce((s, b) => s + b.peso, 0);
  P('detalhamento', T, { descricao: `Peso total de aço do lance ${lance}`, formula: 'Σ peso das barras', expressao: `${barras.length} posições; ${fm(pesoLance)} kg`, resultado: pesoLance, unidade: 'kg', entradas: { posicoes: barras.length, peso: pesoLance } });
}

/** Viga embutida em muro de alvenaria: papel, armadura opcional/dispensada e dimensões mínimas (C6.59). */
export function registrarVigaMuro(mem: Registrador, v: ResultadoVigaMuro, op: OpcoesCalculo) {
  const el = `Viga ${v.nome}`;
  if (!mem.aceita(el)) return;
  const P = mk(mem, el);
  P('dimensionamento', 'Viga sobre muro de alvenaria', { descricao: `Viga sobre ${v.nomeParede}: papel ${v.papel === 'coroamento' ? 'de coroamento (cinta) do muro de blocos' : v.papel === 'laje' ? 'de apoio de laje no muro de alvenaria' : 'de topo do muro de subsolo (sempre armada)'}${v.dispensada ? '; armadura opcional dispensada (opção "armar sempre" desligada): a viga trabalha como cinta do muro' : ''}`, formula: 'b ≥ bmín; h ≥ hmín (dimensões mínimas da viga sobre muro de alvenaria)', expressao: `${fm(v.b * 100)} × ${fm(v.h * 100)} cm; mínimas ${fm(op.alvenariaVigaBMin)} × ${fm(op.alvenariaVigaHMin)} cm`, resultado: v.status, unidade: '', ...AC, entradas: { b: v.b, h: v.h, bMin: op.alvenariaVigaBMin / 100, hMin: op.alvenariaVigaHMin / 100, opcional: v.opcional ? 1 : 0, dispensada: v.dispensada ? 1 : 0, armar: op.alvenariaVigaArmar, papel: v.papel }, observacao: v.mensagens.join(' ') || undefined });
}
