// Vigas pré-moldadas e pré-fabricadas (E2e; C6.17, K1.4.66). Armada (NBR 9062): dimensionada como as demais, com γc do controle
// pré-moldado, ligações articuladas por padrão (analitico.ts) e verificação de içamento aqui. Ficha (protendida ou treliçada
// pré-fabricada): propriedades do fabricante (EI, peso, MRd, VRd, TRd) informadas pelo usuário, só verificadas contra a envoltória ELU.
// O texto da NBR 9062 não estava disponível: o coeficiente dinâmico, os pontos de içamento e γf do içamento são opções "a confirmar".
import { barArea } from '../concrete';
import type { AnaliseEdificio } from './analitico';
import type { ResultadoViga } from './dimensionamento';
import { acoDe, concretoDe } from './materiais';
import { pesoLinearViga } from './analitico';
import { classificar } from './revisao';
import type { BuildingModel, FichaPremoldada, Viga } from './types';
import { comprimentoPolilinha } from './types';

/** γf do peso próprio no içamento e no transporte (ELU, ação permanente desfavorável) [a confirmar]. */
export const GAMA_F_ICAMENTO = 1.4;

export interface VerificacaoIcamento {
  /** Distância dos pontos de içamento às extremidades (m), vão (m), peso próprio (kN/m) e carga de cálculo qd = γf · ψdin · q (kN/m). */
  a: number; L: number; peso: number; qd: number;
  /** Momentos de cálculo (kN·m): negativo nos pontos de içamento e positivo no meio do vão. */
  MsdNeg: number; MsdPos: number;
  /** Momentos resistentes (kN·m) das armaduras superior (negativo) e inferior (positivo) adotadas. */
  MRdNeg: number; MRdPos: number;
  util: number;
}

export interface VerificacaoFicha {
  ficha: FichaPremoldada;
  /** Esforços de cálculo da envoltória ELU (kN·m, kN) e utilizações. */
  MsdPos: number; MsdNeg: number; Vsd: number; Tsd: number;
  utilPos: number; utilNeg: number; utilV: number; utilT: number;
  util: number;
}

export interface ResultadoPremoldada {
  viga: string; nome: string; tipo: 'armada' | 'ficha'; L: number;
  icamento?: VerificacaoIcamento; ficha?: VerificacaoFicha;
  /** Ligações das pontas: articuladas por padrão (opção premoldadaArticulada) ou como as demais vigas; engastes informados prevalecem. */
  ligacoes: 'articuladas' | 'como as demais vigas' | 'engaste informado';
  util: number;
  status: 'ok' | 'fail';
  mensagens: string[];
}

const f1 = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Momento resistente (kN·m) de uma seção retangular b × h com armadura As (m²) tracionada, a d da face comprimida (bloco retangular, sem armadura de compressão). */
export function momentoResistente(b: number, d: number, As: number, fcd: number, fyd: number): number {
  if (As <= 0) return 0;
  const x = (As * fyd) / (0.68 * b * fcd); // λ = 0,8 e σcd = 0,85·fcd: C = 0,68·b·x·fcd
  return As * fyd * (d - 0.4 * x) * 1000;
}

/**
 * Verificação de içamento (dois pontos a `a` das extremidades, peso próprio majorado pelo coeficiente dinâmico e por γf): momento
 * negativo nos pontos de içamento e positivo no meio do vão, contra as armaduras superior e inferior adotadas.
 */
export function verificarIcamento(b: BuildingModel, v: Viga, rv: ResultadoViga, an: AnaliseEdificio): VerificacaoIcamento {
  const op = an.opcoes, L = comprimentoPolilinha(v.pontos), a = v.premoldada?.icamento ?? op.premoldadaIcamentoFracao * L;
  const peso = pesoLinearViga(v), qd = GAMA_F_ICAMENTO * op.premoldadaIcamentoDinamico * peso;
  const MsdNeg = (qd * a * a) / 2, MsdPos = Math.max(0, (qd * (L - 2 * a) ** 2) / 8 - (qd * a * a) / 2);
  const c = concretoDe({ ...b, norma: { ...b.norma, controle: 'premoldado' } }, 'viga'), aPos = acoDe(b, 'vigaPos'), aNeg = acoDe(b, 'vigaNeg');
  const cob = (b.norma.cobrimento.viga ?? 3) / 100, dI = v.secao.h - cob - 0.005 - 0.008, dS = v.secao.h - cob - 0.005 - 0.008;
  const AsInf = rv.arranjo.inf ? rv.arranjo.inf.n * barArea(rv.arranjo.inf.phi) : rv.AsInf, AsSup = rv.arranjo.sup ? rv.arranjo.sup.n * barArea(rv.arranjo.sup.phi) : rv.AsSup;
  const MRdPos = momentoResistente(v.secao.b, dI, AsInf, c.fcd, aPos.fyd), MRdNeg = momentoResistente(v.secao.b, dS, AsSup, c.fcd, aNeg.fyd);
  const util = Math.max(MsdNeg / Math.max(MRdNeg, 1e-9), MsdPos / Math.max(MRdPos, 1e-9));
  return { a, L, peso, qd, MsdNeg, MsdPos, MRdNeg, MRdPos, util };
}

/** Verificação da ficha contra a envoltória ELU da viga (positivo traciona embaixo). */
export function verificarFicha(f: FichaPremoldada, rv: ResultadoViga): VerificacaoFicha {
  const pts = rv.envoltoria.pontos;
  const MsdPos = Math.max(0, ...pts.map((p) => p.Mmax)), MsdNeg = Math.max(0, ...pts.map((p) => -p.Mmin));
  const Vsd = Math.max(0, ...pts.map((p) => Math.max(Math.abs(p.Vmax), Math.abs(p.Vmin)))), Tsd = Math.max(0, ...pts.map((p) => p.T));
  const MRdNeg = f.MRdNeg ?? 0;
  const utilPos = MsdPos / f.MRdPos, utilNeg = MsdNeg > 1e-6 ? (MRdNeg > 0 ? MsdNeg / MRdNeg : Infinity) : 0, utilV = Vsd / f.VRd, utilT = f.TRd ? Tsd / f.TRd : 0;
  return { ficha: f, MsdPos, MsdNeg, Vsd, Tsd, utilPos, utilNeg, utilV, utilT, util: Math.max(utilPos, utilNeg, utilV, utilT) };
}

/**
 * Verifica as vigas pré-moldadas (içamento das armadas, ficha das pré-fabricadas) sobre o dimensionamento. As mensagens e a situação
 * entram no resultado da viga; na viga de ficha, os erros de armadura do dimensionamento comum são desconsiderados (a armadura é a do
 * fabricante) e vale a verificação da ficha.
 */
export function verificarPremoldadas(b: BuildingModel, an: AnaliseEdificio, vigas: ResultadoViga[]): ResultadoPremoldada[] {
  const out: ResultadoPremoldada[] = [];
  const op = an.opcoes;
  for (const v of b.vigas) {
    if (!v.premoldada) continue;
    const rv = vigas.find((x) => x.viga === v.id);
    if (!rv) continue;
    const L = comprimentoPolilinha(v.pontos), msgs: string[] = [];
    const engaste = v.engasteIni !== undefined || v.engasteFim !== undefined || v.vinculoIni === 'engaste' || v.vinculoFim === 'engaste';
    const ligacoes: ResultadoPremoldada['ligacoes'] = engaste ? 'engaste informado' : op.premoldadaArticulada ? 'articuladas' : 'como as demais vigas';
    let util = 0, icamento: VerificacaoIcamento | undefined, ficha: VerificacaoFicha | undefined;
    if (v.premoldada.tipo === 'armada') {
      icamento = verificarIcamento(b, v, rv, an);
      util = icamento.util;
      if (icamento.util > 1 + 1e-9) msgs.push(`Pré-moldada: içamento: ${f1(icamento.MsdNeg)} kN·m nos pontos de içamento (a = ${f1(icamento.a * 100, 0)} cm) contra ${f1(icamento.MRdNeg)} kN·m da armadura superior e ${f1(icamento.MsdPos)} kN·m no meio contra ${f1(icamento.MRdPos)} kN·m da inferior; acrescente armadura superior de içamento ou aproxime os pontos de içamento.`);
      if (ligacoes === 'articuladas') msgs.push('Pré-moldada: ligações articuladas por padrão (viga simplesmente apoiada); informe engaste na viga para outro vínculo.');
    } else if (v.premoldada.ficha) {
      ficha = verificarFicha(v.premoldada.ficha, rv);
      util = ficha.util;
      const fx = (nome: string, msd: number, mrd: number, un: string) => `${nome} ${f1(msd)} ${un} contra ${f1(mrd)} ${un}`;
      if (ficha.utilPos > 1 + 1e-9) msgs.push(`Pré-moldada: ficha ${ficha.ficha.nome}: ${fx('momento positivo', ficha.MsdPos, ficha.ficha.MRdPos, 'kN·m')}.`);
      if (ficha.utilNeg > 1 + 1e-9) msgs.push(`Pré-moldada: ficha ${ficha.ficha.nome}: ${fx('momento negativo', ficha.MsdNeg, ficha.ficha.MRdNeg ?? 0, 'kN·m')}.`);
      if (ficha.utilV > 1 + 1e-9) msgs.push(`Pré-moldada: ficha ${ficha.ficha.nome}: ${fx('cortante', ficha.Vsd, ficha.ficha.VRd, 'kN')}.`);
      if (ficha.utilT > 1 + 1e-9) msgs.push(`Pré-moldada: ficha ${ficha.ficha.nome}: ${fx('torçor', ficha.Tsd, ficha.ficha.TRd ?? 0, 'kN·m')}.`);
      if (ligacoes === 'articuladas') msgs.push('Pré-moldada: ligações articuladas por padrão (viga simplesmente apoiada); informe engaste na viga para outro vínculo.');
    }
    const erro = msgs.some((m) => /^Pré-moldada: (içamento|ficha)/.test(m));
    // viga de ficha: a armadura do dimensionamento comum não vale (o fabricante informa); ficam só as mensagens que não são de armadura
    if (v.premoldada.tipo === 'ficha') { rv.mensagens = rv.mensagens.filter((m) => classificar(m).nivel !== 'erro'); rv.status = 'ok'; }
    rv.mensagens.push(...msgs);
    if (erro) rv.status = 'fail';
    out.push({ viga: v.id, nome: v.nome, tipo: v.premoldada.tipo, L, icamento, ficha, ligacoes, util, status: erro ? 'fail' : 'ok', mensagens: msgs });
  }
  return out;
}
