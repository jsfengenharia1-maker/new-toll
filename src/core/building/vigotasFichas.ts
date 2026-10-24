// Vigotas por ficha e moldadas no local (frente E3b): dimensionamento vigota a vigota das armadas, protendidas, genéricas por
// geometria e nervuradas moldadas, com a escolha do tipo da série pelo momento, momentos de serviço por nível de protensão
// (NBR 6118, Tabela 13.4 [a confirmar]), duas parcelas de negativo, vigotas duplas e triplas, edição por vigota, erros e
// avisos. Reaproveita os alinhamentos, mínimos e igualação de `vigotas.ts`/`vigotasEsforcos.ts`. Unidades: kN, m; cm² nas áreas.
// As treliçadas do catálogo interno continuam em `dimensionarVigotas` (R6).
import { conversaoDaLaje, igualarPorArea } from './vigotasArea';
import { mensagemMontagem, montagemDaLaje } from './vigotasMontagem';
import { comprimentoEstribo } from './vigotasRelatorio';
import { barArea, beamFlexure, beamShear, type BeamSection } from '../concrete';
import type { P } from '../geom/faces';
import { areaPoligono } from '../geom/faces';
import type { AnaliseEdificio } from './analitico';
import { lbBasico } from './detalhamento';
import { RHO_MIN_LAJE } from './detalhamentoLajes';
import type { ResultadoLaje } from './dimensionamento';
import { vaos } from './lajes';
import { acoDe, cobrimentoLaje, concretoDe, gamas } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { conjuntoVigotas, ehNervurada, FAMILIAS_VIGOTA, geometriaNervurada, trelicasDe, type GeometriaNervurada, type SerieFicha } from './tiposLaje';
import { armaduraEquivalente, dadosBranson } from './vigotasFlecha';
import { casosDaObra, pavimentosDoGrupo, type BuildingModel, type EdicaoVigota, type Laje } from './types';
import {
  ADICIONAIS, alcance, arred, faixasDaGrelha, fmt, fphi, listaDeVigotas, momentoLimite, pesoTrelica, prepararVigotas, r3, vrd1, vrd2, deltaMinVigotas,
  type DadosFichaGrupo, type EsforcosVigota, type FaixaVigota, type GrupoVigotas, type NegativoVigota, type ParcelaVigota, type PosicaoVigota, type ResultadoVigotas,
} from './vigotas';
import { esforcosDoGrupo, pontasContinuas, posicionarVigotas, redistribuirNegativos } from './vigotasEsforcos';
import { momentoResistenteT } from './tiposLaje';

export type NivelProtensao = 'parcial' | 'limitada' | 'completa';
/**
 * Nível de protensão da vigota protendida (pré-tração) pela classe de agressividade ambiental, NBR 6118, Tabela 13.4:
 * CAA I protensão parcial, CAA II limitada, CAA III e IV completa [a confirmar: texto da tabela não disponível no ambiente].
 */
export const nivelPorCAA = (caa: 'I' | 'II' | 'III' | 'IV'): NivelProtensao => (caa === 'I' ? 'parcial' : caa === 'II' ? 'limitada' : 'completa');
/** Combinação de serviço do nível (ELS-W/ELS-F): frequente na parcial e na limitada, rara na completa [a confirmar]. */
export const combinacaoDoNivel = (n: NivelProtensao): 'frequente' | 'rara' => (n === 'completa' ? 'rara' : 'frequente');
/** Momento de serviço admissível da série para o nível; sem a coluna, a do nível mais restritivo informado; `null` sem nenhuma. */
export function momentoDoNivel(s: SerieFicha, n: NivelProtensao): number | null {
  const p = s.protensao;
  if (!p) return null;
  return (n === 'parcial' ? p.Mparcial ?? p.Mlimitada ?? p.Mcompleta : n === 'limitada' ? p.Mlimitada ?? p.Mcompleta : p.Mcompleta) ?? null;
}

const FI_MOLDADA = [6.3, 8, 10, 12.5, 16, 20, 25];
/** Combinações de barras negativas fora da tabela (laje genérica e moldada): 1 a 4 barras de φ6,3 a φ25, por área crescente. */
const ADICIONAIS_AMPLA = FI_MOLDADA.flatMap((phi) => [1, 2, 3, 4].map((n) => ({ n, phi, As: n * barArea(phi) * 1e4 }))).sort((a, z) => a.As - z.As || a.n - z.n);
const DMAX = 0.019;

type Msg = { texto: string; erro: boolean };

/** Momento último (kN·m) da seção T com a armadura `As` (m²). */
const MuT = (c: ReturnType<typeof concretoDe>, g: GeometriaNervurada, d: number, As: number, fyd: number) => momentoResistenteT(c, g.intereixo, g.capa, g.bw, d, As, fyd);

function pico(map: Map<string, number>, f: FaixaVigota) { return map.get(String(Math.round(f.t * 1000))) ?? 0; }

/** Picos positivos por alinhamento (kN·m por nervura) na combinação de fatores `fat`, envoltória dos pavimentos do grupo. */
function picosServico(b: BuildingModel, an: AnaliseEdificio, l: Laje, intereixo: number, u: P, fat: number[]): Map<string, number> {
  const out = new Map<string, number>(), pavs = pavimentosDoGrupo(b, l.grupo);
  for (const g of an.grelhas) {
    if (!g.res || !pavs.some((p) => p.id === g.pavimento)) continue;
    for (const f of faixasDaGrelha(g, l, fat, u, intereixo)) {
      const k = String(Math.round(f.t * 1000));
      out.set(k, Math.max(out.get(k) ?? 0, ...f.Mmax));
    }
  }
  return out;
}

/** Escolhe as parcelas "n barras" de uma lista de combinações que cobrem `AsCm2`; null se nenhuma. */
function escolher(lista: { n: number; phi: number; As: number }[], AsCm2: number) {
  if (AsCm2 <= 1e-9) return { n: 0, phi: 0, As: 0 };
  return lista.find((x) => x.As >= AsCm2 - 1e-9) ?? null;
}

const pct = (comp: number, L: number) => Math.round((comp / (L || 1)) * 1000) / 10;

/**
 * Dimensiona as lajes de vigotas por ficha (armadas, protendidas, genéricas) e as nervuradas moldadas. Acrescenta as mensagens
 * à laje em `lajes` e marca 'fail' nos erros. `op` traz os mínimos, a igualação, a redistribuição e os arredondamentos.
 */
export function dimensionarVigotasFichas(b: BuildingModel, an: AnaliseEdificio, lajes: ResultadoLaje[], op: OpcoesCalculo): ResultadoVigotas[] {
  const c = concretoDe(b, 'laje'), gm = gamas(b), aI0 = acoDe(b, 'vigotaInf'), aS0 = acoDe(b, 'vigotaSup'), aIN = acoDe(b, 'nervInf'), aSN = acoDe(b, 'nervSup'), aV = acoDe(b, 'lajeCortante');
  const obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((x) => x.id === id)?.natureza ?? 'G');
  const psi1 = an.casos.map((id) => { const x = obra.find((y) => y.id === id); return x?.psi?.[1] ?? b.norma.psiQ?.[1] ?? 0.4; });
  const fFreq = nat.map((n, i) => (n === 'G' || n === 'H' ? 1 : n === 'Q' ? psi1[i] : 0)), fRara = nat.map((n) => (n === 'G' || n === 'H' || n === 'Q' ? 1 : 0));
  const out: ResultadoVigotas[] = [];
  const msgsLaje = (id: string, msgs: string[], erro: boolean) => { for (const r of lajes.filter((x) => x.laje === id)) { r.mensagens.push(...msgs); if (erro) r.status = 'fail'; } };
  for (const l of b.lajes) {
    const g0 = ehNervurada(l.tipo) ? geometriaNervurada(b, l.tipo) : null;
    if (!g0 || g0.familia === 'trelicada' || g0.ausente) continue;
    if (l.armaduraVigotas) msgsLaje(l.id, ['Armadura bloqueada desconsiderada: a laje não é treliçada.'], false);
    const moldada = g0.tipo === 'moldada', ficha = g0.ficha, serie = g0.serie;
    // aço próprio (E5f): nervuradas moldadas seguem as nervuradas; as demais vigotas in loco, as suas posições
    const aI = moldada ? aIN : aI0, aS = moldada ? aSN : aS0;
    const { intereixo, bw, hEnch, capa, h } = g0;
    const conv = conversaoDaLaje(b, l, g0, op);
    const prep = prepararVigotas(b, an, l, intereixo, op, conv);
    if (!prep) continue;
    const { faixas, mins, idxGr, u, nomesPav } = prep, pavs = pavimentosDoGrupo(b, l.grupo);
    const msgs: Msg[] = prep.avisos.map((texto) => ({ texto, erro: false }));
    const erro = (texto: string, v?: number[]) => { msgs.push({ texto, erro: true }); if (v) for (const i of v) { falhas.add(i); porVigota.set(i, [...(porVigota.get(i) ?? []), texto]); } };
    const aviso = (texto: string) => msgs.push({ texto, erro: false });
    const falhas = new Set<number>(), porVigota = new Map<number, string[]>();
    // capa (13.2.4.2)
    const capaMin = Math.max(0.04, (intereixo - bw) / 15), capaOk = capa >= capaMin - 1e-9;
    if (!capaOk) erro(`Vigotas: capa de ${fmt(capa * 100, 1)} cm abaixo do mínimo de ${fmt(capaMin * 100, 1)} cm (NBR 6118, 13.2.4.2: 4 cm e 1/15 da distância entre nervas).`.replace('nervas', 'nervuras'));
    const cob = cobrimentoLaje(b, l.cobrimento), dI = h - cob.inf - 0.005, dS = h - cob.sup - 0.005;
    const AcT = intereixo * capa + bw * hEnch, AsMin = RHO_MIN_LAJE * AcT * 1e4;
    const tee: BeamSection = { kind: 'tee', bw, h, bf: intereixo, hf: capa };
    const lbI = (phi: number) => lbBasico(phi, c, aI.fyd, h - cob.inf <= 0.3 + 1e-9, aI.aco === 'CA-60');
    const lbS = (phi: number) => lbBasico(phi, c, aS.fyd, h - cob.sup <= 0.3 + 1e-9, aS.aco === 'CA-60');
    const B = vaos(l)[1], nTotal = Math.max(1, Math.round(B / intereixo)), mult = ficha?.multipla;
    // duplas e triplas: só se a ficha permite; marcas inválidas viram aviso
    const marcas = (l.vigotasMultiplas ?? []).filter((m) => {
      const ok = !!mult && m.n <= mult.n && m.indice >= 0 && m.indice < nTotal;
      if (!ok) aviso(`Vigotas: a marcação de vigota ${m.n === 3 ? 'tripla' : 'dupla'} na vigota ${m.indice + 1} foi ignorada (${mult ? 'fora do pano ou acima do máximo da ficha' : 'a ficha não admite vigotas duplas'}).`);
      return ok;
    });
    const pos = posicionarVigotas({ ...l, vigotasMultiplas: marcas }, faixas, nTotal, B, u, mult?.n ?? 1);
    const edicoes = new Map<number, EdicaoVigota>();
    for (const e of l.edicaoVigotas ?? []) {
      if (pos.some((p) => p.indice === e.indice)) edicoes.set(e.indice, e);
      else aviso(`Vigotas: a edição da vigota ${e.indice + 1} foi ignorada (a vigota não existe no pano: ${pos.length} vigota(s)).`);
    }
    // série candidata: mesma altura, intereixo e enchimento da laje (tipos da ficha)
    const cand: SerieFicha[] = ficha ? ficha.series.filter((s) => s.positivo && Math.abs(s.altura - g0.h) < 1e-6 && Math.abs(s.intereixo - intereixo) < 1e-6 && Math.abs(s.hEnch - hEnch) < 1e-6).sort((a, z) => a.positivo!.Mu - z.positivo!.Mu) : [];
    const origemFicha = ficha?.origem ?? 'usuario';
    const fabricante = origemFicha === 'fabricante';
    // protensão
    const caa = l.exposicao ?? b.norma.caa, nivel = nivelPorCAA(caa), comb = combinacaoDoNivel(nivel);
    const protendida = ficha?.familia === 'protendida';
    const serv = protendida ? picosServico(b, an, l, intereixo, u, comb === 'rara' ? fRara : fFreq) : new Map<string, number>();
    // grupos de igualação → vigotas
    const grupoDe = new Map<number, number>();
    idxGr.forEach((ids, gi) => ids.forEach((i) => grupoDe.set(i, gi)));
    const crit = op.vigotaIgualacao, ponto = !!op.vigotaIgualacaoPonto && !conv;
    const igualar = conv ? igualarPorArea(conv) : (vs: number[], cr: number, neg = false) => (!vs.length ? 0 : cr === 2 ? vs.reduce((t, v) => t + v, 0) / vs.length : neg ? Math.min(...vs) : Math.max(...vs));
    const eg = idxGr.map((ids) => esforcosDoGrupo(ids, faixas, mins, crit, ponto, igualar));
    const redist = idxGr.map((ids, gi) => {
      if (!op.vigotaRedistribuir) return { esforcos: eg[gi].esforcos, delta: 1, aplicada: false };
      const cont = ids.map((i) => pontasContinuas(faixas[i]));
      return redistribuirNegativos(eg[gi].esforcos, [cont.some((x) => x[0]), cont.some((x) => x[1])], op.redistribuicao, deltaMinVigotas(an));
    });
    for (const [gi, r] of redist.entries()) if (r.aplicada) aviso(`Vigotas: redistribuição dos negativos (grupo ${gi + 1}): δ = ${fmt(r.delta)} (NBR 6118, 14.6.4.3; positivo aumentado de ${fmt(r.esforcos.mPos - eg[gi].esforcos.mPos)} kN·m por nervura).`);
    // unidades de cálculo: um grupo por igualação (vigotas sem edição nem múltipla) e uma unidade por vigota especial
    interface Unidade { gi: number; indices: number[]; especial?: GrupoVigotas['especial']; ed?: EdicaoVigota; n: 1 | 2 | 3 }
    const regulares = new Map<number, number[]>(), especiais: Unidade[] = [];
    for (const p of pos) {
      const gi = grupoDe.get(p.faixa) ?? 0, ed = edicoes.get(p.indice);
      if (p.multipla === 1 && !ed) regulares.set(gi, [...(regulares.get(gi) ?? []), p.indice]);
      else especiais.push({ gi, indices: [p.indice], ed, n: p.multipla, especial: ed?.momentos ? 'manual' : p.multipla === 3 ? 'tripla' : p.multipla === 2 ? 'dupla' : 'editada' });
    }
    const unidades: Unidade[] = [...idxGr.map((_, gi) => ({ gi, indices: regulares.get(gi) ?? [], n: 1 as const })).filter((x) => x.indices.length), ...especiais];
    const posicoes: PosicaoVigota[] = [];
    const nomeTipo = (s: SerieFicha) => s.tipo ?? s.id;
    const lbX = (phi: number) => lbI(phi);
    const grupos: GrupoVigotas[] = unidades.map((un, ui) => {
      const ids = idxGr[un.gi], fs = ids.map((i) => faixas[i]);
      const lg = fs.reduce((t, f) => t + f.largura, 0), L = fs.reduce((t, f) => t + f.L * f.largura, 0) / lg;
      const tag = un.especial ? `vigota ${un.indices[0] + 1}${un.n > 1 ? ` (${un.n === 3 ? 'tripla' : 'dupla'})` : ''}` : `grupo ${ui + 1}`;
      const base = redist[un.gi].esforcos, diag = eg[un.gi].diagrama;
      // esforços da unidade: manuais (igualação manual), do conjunto de vigotas ou do grupo
      let esf: EsforcosVigota = { mPos: base.mPos, mNeg: [...base.mNeg] as [number, number], v: [...base.v] as [number, number] };
      const n = un.n;
      if (un.ed?.momentos) {
        const m = un.ed.momentos;
        esf = { mPos: m.pos, mNeg: [Math.min(0, m.neg[0]), Math.min(0, m.neg[1])], v: [m.v[0], m.v[1]] };
      } else if (n > 1 && ficha) {
        const gg = g0, conj = conjuntoVigotas(b, gg, n), dp = Math.max(0, conj.pesoLinear - gg.pp * intereixo) * gm.g;
        esf = { mPos: (base.mPos + (dp * L * L) / 8) / n, mNeg: [(base.mNeg[0] - (dp * L * L) / 12) / n, (base.mNeg[1] - (dp * L * L) / 12) / n], v: [(base.v[0] + (dp * L) / 2) / n, (base.v[1] + (dp * L) / 2) / n] };
      }
      const nvig = un.indices.length;
      const escala = un.ed?.momentos ? 1 : n;
      const MminDiag = () => diag.x.map((_, j) => -diag.Mmin[j] / escala);
      const Vdiag = diag.V.map((v) => v / escala);
      const xs = diag.x;
      const parcelas: ParcelaVigota[] = [];
      let Mu = 0, MuTotal = 0, Mfis: number | undefined, EI: number | undefined, EIfis: number | undefined, tipoEsc: SerieFicha | null = null;
      let AsNec = 0, AsBase = 0, barrasPos: { n: number; phi: number; As: number } | null = null, compPos = arred(L, op.arredondamento);
      let servico: DadosFichaGrupo['servico'];
      let moldadaInfo: DadosFichaGrupo['moldada'];
      const Md = esf.mPos;
      const fl = beamFlexure(tee, true, Md, dI, 0.03, c, aI.fyd);
      AsNec = Math.max(fl.As * 1e4, Md > 0 ? AsMin : 0);
      if (fl.double) { erro(`Vigotas: altura insuficiente para a flexão positiva (Md = ${fmt(Md)} kN·m por nervura exige armadura de compressão; ${tag}); aumente a altura da laje.`, un.indices); }
      let AsEfInf = 0; // área inferior efetiva (m²) para o cortante
      if (!moldada) {
        // ---- armadas, protendidas e genéricas: tipo da série pelo momento
        if (!cand.length) {
          erro(`Vigotas: ficha incompleta — a ficha "${ficha?.nome ?? ''}" não informa o momento positivo (Mu) da laje ${serie?.id ?? ''}; complete a ficha em "Tipos de laje" (${tag}).`, un.indices);
        } else {
          const atribuido = un.ed?.tipo ? cand.find((s) => nomeTipo(s) === un.ed!.tipo || s.id === un.ed!.tipo) : undefined;
          if (un.ed?.tipo && !atribuido) aviso(`Vigotas: o tipo "${un.ed.tipo}" da vigota ${un.indices[0] + 1} não existe na série; usado o tipo calculado.`);
          const mu = (s: SerieFicha) => s.positivo!.Mu;
          const servOk = (s: SerieFicha) => { if (!protendida) return true; const adm = momentoDoNivel(s, nivel); const Ms = Math.max(...ids.map((i) => pico(serv, faixas[i]))) / escala; return adm === null || Ms <= adm + 1e-9; };
          let esc: SerieFicha | undefined = atribuido;
          if (!esc) esc = cand.find((s) => mu(s) >= Md - 1e-9 && servOk(s));
          let precisaAd = false;
          if (!esc) {
            const soUlt = cand.find((s) => mu(s) >= Md - 1e-9);
            if (protendida && soUlt) {
              esc = cand.at(-1)!;
              const Ms = Math.max(...ids.map((i) => pico(serv, faixas[i]))) / escala, adm = momentoDoNivel(esc, nivel);
              erro(`Vigotas: nenhuma vigota da série atende o serviço — momento de serviço ${fmt(Ms)} kN·m por nervura (combinação ${comb}, protensão ${nivel}, CAA ${caa}) acima do admissível ${adm === null ? '—' : fmt(adm)} kN·m do maior tipo (${tag}); use laje mais alta ou outra série.`, un.indices);
            } else { esc = cand.at(-1)!; precisaAd = !protendida; }
          }
          tipoEsc = esc; Mu = mu(esc); MuTotal = Mu; Mfis = esc.positivo!.Mfis; EI = esc.positivo!.EI; EIfis = esc.positivo!.EIfis;
          AsBase = armaduraEquivalente(c, intereixo, capa, bw, dI, Mu, aI.fyd) * 1e4;
          AsEfInf = AsBase / 1e4;
          // adicional (armadas): editado ou automático
          const ed = un.ed;
          const dado = (x: NonNullable<EdicaoVigota['inf']>, tipo: ParcelaVigota['tipo']): ParcelaVigota => {
            const comp = x.comprimento !== undefined ? Math.min(L, x.comprimento) : x.percentual !== undefined ? (Math.min(100, x.percentual) / 100) * L : L;
            return { n: x.n, phi: x.phi, As: x.n * barArea(x.phi) * 1e4, comprimento: r3(comp), percentual: pct(comp, L), tipo };
          };
          if (!protendida) {
            if (ed?.inf) parcelas.push(dado(ed.inf, 'total'));
            if (ed?.adicionalCurta) parcelas.push(dado(ed.adicionalCurta, 'curta'));
            if (!ed?.inf && !ed?.adicionalCurta && (precisaAd || Md > Mu + 1e-9)) {
              const ad = ADICIONAIS.find((x) => MuT(c, g0, dI, AsBase / 1e4 + x.As / 1e4, aI.fyd) >= Md - 1e-9);
              if (ad) {
                // trecho onde o momento excede o da vigota base: parcela curta (estendida da ancoragem) ou, se longo, total
                const xa = diag.x.filter((_, j) => diag.Mmax[j] / escala > Mu + 1e-9);
                const reg = xa.length ? xa.at(-1)! - xa[0] : L, ext = reg + 2 * (lbX(ad.phi) + dI);
                const curta = ext < 0.7 * L;
                parcelas.push({ n: ad.n, phi: ad.phi, As: ad.As, comprimento: r3(curta ? Math.min(L, arred(ext, op.arredondamento)) : arred(L, op.arredondamento)), percentual: pct(curta ? Math.min(L, ext) : L, L), tipo: curta ? 'curta' : 'total' });
              }
            }
            const AsAdTot = parcelas.reduce((t, p) => t + p.As, 0);
            MuTotal = MuT(c, g0, dI, AsBase / 1e4 + AsAdTot / 1e4, aI.fyd);
            // fora da parcela curta vale só o Mu com a parcela total
            const curta = parcelas.find((p) => p.tipo === 'curta'), totais = parcelas.filter((p) => p.tipo === 'total').reduce((t, p) => t + p.As, 0);
            if (curta) {
              const MuSemCurta = MuT(c, g0, dI, AsBase / 1e4 + totais / 1e4, aI.fyd), folga = (L - curta.comprimento) / 2;
              const fora = diag.x.some((x, j) => (x < folga - 1e-9 || x > L - folga + 1e-9) && diag.Mmax[j] / escala > MuSemCurta + 1e-9);
              if (fora) erro(`Vigotas: momento positivo fora da parcela curta acima do resistente da vigota (${tag}); aumente a armadura parcial.`, un.indices);
            }
            AsEfInf = (AsBase + AsAdTot) / 1e4;
            if (Md > MuTotal + 1e-9) {
              if (fabricante || ed) erro(`Vigotas: momento positivo ${fmt(Md)} kN·m por nervura acima do resistente — nenhuma vigota da série cobre (maior tipo ${nomeTipo(esc)}: ${fmt(Mu)} kN·m; com adicional: ${fmt(MuTotal)} kN·m) (${tag}); use laje mais alta ou vigota dupla.`, un.indices);
              else aviso(`Vigotas: fora da tabela — momento positivo ${fmt(Md)} kN·m por nervura acima do maior tipo da tabela (${nomeTipo(esc)}: ${fmt(Mu)} kN·m; com adicional ${fmt(MuTotal)}): amplie a tabela de tipos da ficha (${tag}); a vigota segue com o maior tipo.`);
            }
          } else if (Md > Mu + 1e-9 && !atribuido) {
            if (fabricante) erro(`Vigotas: momento positivo ${fmt(Md)} kN·m por nervura acima do resistente — nenhuma vigota da série cobre (maior tipo ${nomeTipo(esc)}: ${fmt(Mu)} kN·m) (${tag}); use laje mais alta ou outra série.`, un.indices);
            else aviso(`Vigotas: fora da tabela — momento positivo ${fmt(Md)} kN·m por nervura acima do maior tipo da tabela (${nomeTipo(esc)}: ${fmt(Mu)} kN·m): amplie a tabela de tipos da ficha (${tag}).`);
          } else if (Md > Mu + 1e-9) erro(`Vigotas: momento positivo ${fmt(Md)} kN·m por nervura acima do resistente do tipo ${nomeTipo(esc)} atribuído (${fmt(Mu)} kN·m) (${tag}).`, un.indices);
          if (atribuido && protendida && !servOk(esc)) {
            const Ms = Math.max(...ids.map((i) => pico(serv, faixas[i]))) / escala, adm = momentoDoNivel(esc, nivel);
            erro(`Vigotas: nenhuma vigota da série atende o serviço — tipo ${nomeTipo(esc)} atribuído: momento de serviço ${fmt(Ms)} kN·m acima de ${adm === null ? '—' : fmt(adm)} kN·m (${tag}).`, un.indices);
          }
          if (protendida) {
            const Ms = Math.max(...ids.map((i) => pico(serv, faixas[i]))) / escala, adm = momentoDoNivel(esc, nivel);
            if (adm === null) aviso(`Vigotas: fora da tabela — a ficha não informa o momento de serviço da protensão ${nivel} (CAA ${caa}); a verificação de serviço não foi feita (${tag}).`);
            servico = { nivel, combinacao: comb, Mserv: Ms, Madm: adm, Mdesc: esc.protensao?.Mdesc ?? 0, ok: adm === null || Ms <= adm + 1e-9 };
          }
          barrasPos = parcelas[0] ? { n: parcelas[0].n, phi: parcelas[0].phi, As: parcelas[0].As } : protendida ? null : { n: 0, phi: 0, As: 0 };
          compPos = parcelas[0]?.comprimento ?? compPos;
        }
      } else {
        // ---- moldada no local: armadura inferior (até 2 barras) e transversal verificadas na largura da nervura
        const atrib = un.ed?.inf ?? l.armaduraMoldada?.inf, est = un.ed?.transversal ?? l.armaduraMoldada?.estribo;
        const phiEst = est?.phi ?? 5, cabe = (nb: number, phi: number) => {
          const ah = Math.max(0.02, phi / 1000, 1.2 * DMAX), need = 2 * (cob.inf + phiEst / 1000) + (nb * phi) / 1000 + (nb - 1) * ah;
          return { ok: bw >= need - 1e-9, need };
        };
        let esc: { n: number; phi: number; As: number } | null = null, larguraMin = 0;
        if (atrib) {
          esc = { n: atrib.n, phi: atrib.phi, As: atrib.n * barArea(atrib.phi) * 1e4 };
          const ct = cabe(atrib.n, atrib.phi); larguraMin = ct.need;
          if (esc.As < AsNec - 1e-6) erro(`Armadura bloqueada insuficiente: inferior da nervura ${atrib.n}φ${fphi(atrib.phi)} < ${fmt(AsNec)} cm² por nervura (${tag}).`, un.indices);
          if (!ct.ok) erro(`Vigotas: armadura não cabe na nervura — ${atrib.n}φ${fphi(atrib.phi)} com estribo φ${fphi(phiEst)} e cobrimento ${fmt(cob.inf * 100, 1)} cm pedem nervura de ${fmt(ct.need * 100, 1)} cm (largura ${fmt(bw * 100, 1)} cm) (${tag}); aumente a largura da nervura ou use menos barras.`, un.indices);
        } else if (!fl.double) {
          const ok = ADICIONAIS_AMPLA.filter((x) => x.n <= 2 && x.As >= AsNec - 1e-9);
          const pelaArea = ok.at(0);
          const cabem = ok.find((x) => cabe(x.n, x.phi).ok);
          if (!pelaArea) erro(`Vigotas: momento positivo ${fmt(Md)} kN·m por nervura acima do resistente com 2φ25 (As necessária ${fmt(AsNec)} cm²) (${tag}); aumente a altura da laje.`, un.indices);
          else if (!cabem) { const ct = cabe(pelaArea.n, pelaArea.phi); larguraMin = ct.need; esc = pelaArea; erro(`Vigotas: armadura não cabe na nervura — ${pelaArea.n}φ${fphi(pelaArea.phi)} com estribo φ${fphi(phiEst)} e cobrimento ${fmt(cob.inf * 100, 1)} cm pedem nervura de ${fmt(ct.need * 100, 1)} cm (largura ${fmt(bw * 100, 1)} cm) (${tag}); aumente a altura da laje (menos aço) ou a largura da nervura.`, un.indices); }
          else { esc = cabem; larguraMin = cabe(cabem.n, cabem.phi).need; }
        }
        if (esc) {
          AsEfInf = esc.As / 1e4; AsBase = 0;
          Mu = MuT(c, g0, dI, esc.As / 1e4, aI.fyd); MuTotal = Mu;
          const comp = un.ed?.inf?.comprimento !== undefined ? Math.min(L, un.ed.inf.comprimento) : un.ed?.inf?.percentual !== undefined ? (un.ed.inf.percentual / 100) * L : L;
          parcelas.push({ n: esc.n, phi: esc.phi, As: esc.As, comprimento: r3(arred(comp, op.arredondamento)), percentual: pct(comp, L), tipo: 'total' });
          barrasPos = { n: esc.n, phi: esc.phi, As: esc.As }; compPos = parcelas[0].comprimento;
        }
        moldadaInfo = { bars: esc ?? { n: 0, phi: 0, As: 0 }, AsNec, estribo: est ? { phi: est.phi, s: est.s } : null, larguraMin, bw };
      }
      // ---- negativos por ponta
      const negFicha = serie?.negativo;
      const generica = moldada || !fabricante;
      const negativos = [0, 1].map((k): NegativoVigota | null => {
        const M = -esf.mNeg[k];
        if (M < 0.01) return null;
        const MRdN = negFicha?.Mu ?? momentoLimite(c, bw, dS), MRdM = negFicha?.MuMacico ?? momentoLimite(c, intereixo, dS), fonteLim: 'ficha' | 'calculado' = negFicha ? 'ficha' : 'calculado';
        let macico = 0;
        const pontaTxt = k ? 'fim' : 'início', valdiag = MminDiag();
        if (M > MRdN) {
          macico = alcance(xs, valdiag, MRdN, k as 0 | 1);
          if (M > MRdM) erro(`Vigotas: momento negativo ${fmt(M)} kN·m por nervura acima do máximo ${fonteLim === 'ficha' ? 'da ficha' : 'resistente'} (${fmt(MRdM)} kN·m, seção maciça) (${tag}, ${pontaTxt}); use laje mais alta ou vigota dupla.`, un.indices);
          else erro(`Vigotas: momento negativo ${fmt(M)} kN·m por nervura acima do ${fonteLim === 'ficha' ? 'máximo da ficha' : 'resistente'} da nervura (${fmt(MRdN)} kN·m): maciçar ${fmt(Math.max(macico, 0.01) * 100, 0)} cm junto ao apoio (${tag}, ${pontaTxt}); ou use laje mais alta ou vigota dupla.`, un.indices);
        }
        const fn = beamFlexure({ kind: 'rect', bw: M > MRdN ? intereixo : bw, h }, false, M, dS, 0.03, c, aS.fyd);
        const AsN = Math.max(fn.As * 1e4, AsMin);
        const edS = un.ed?.sup;
        let br = escolher(ADICIONAIS, AsN);
        if (!br && generica) { br = escolher(ADICIONAIS_AMPLA, AsN); if (br) aviso(`Vigotas: fora da tabela — armadura negativa de ${fmt(AsN)} cm² por nervura passa de 2φ12,5 (${tag}, ${pontaTxt}); calculada assim mesmo com ${br.n}φ${fphi(br.phi)}; use laje mais alta ou vigota dupla.`); }
        if (edS) {
          const As = edS.n * barArea(edS.phi) * 1e4;
          if (As < AsN - 1e-6) erro(`Armadura bloqueada insuficiente: negativa da nervura ${edS.n}φ${fphi(edS.phi)} < ${fmt(AsN)} cm² por nervura (${tag}, ${pontaTxt}).`, un.indices);
          br = { n: edS.n, phi: edS.phi, As };
        }
        if (!br) erro(`Vigotas: armadura negativa excessiva no apoio (${fmt(AsN)} cm² por nervura > 2φ12,5) (${tag}, ${pontaTxt}); aumente a altura da laje.`, un.indices);
        const x0 = alcance(xs, valdiag, 0, k as 0 | 1);
        const phi = br?.phi || 12.5, al = op.lajeDecalagem * dS, lb = lbS(phi), lbN = lb * Math.min(1, AsN / (br?.As || AsN));
        const comprimento = Math.min(L, arred(Math.max((op.vigotaNegativoVao / 100) * L, x0 + al + lbN), op.arredondamento));
        const comprimentoEd = edS ? (edS.comprimento !== undefined ? Math.min(L, edS.comprimento) : edS.percentual !== undefined ? (edS.percentual / 100) * L : comprimento) : comprimento;
        // duas parcelas: a longa cobre o diagrama inteiro; a curta (as barras restantes) só onde o momento passa do que a longa resiste
        const ps: ParcelaVigota[] = [];
        if (br && br.n >= 2 && !edS) {
          const nA = Math.ceil(br.n / 2), AsA = nA * barArea(br.phi), MRdA = momentoResistenteT(c, bw, h, bw, dS, AsA, aS.fyd);
          const xB = alcance(xs, valdiag, MRdA, k as 0 | 1), compB = Math.min(comprimento, arred(Math.max(xB + al + lb, 0.1), op.arredondamento));
          ps.push({ n: nA, phi: br.phi, As: nA * barArea(br.phi) * 1e4, comprimento: r3(comprimento), percentual: pct(comprimento, L), tipo: 'longa' });
          ps.push({ n: br.n - nA, phi: br.phi, As: (br.n - nA) * barArea(br.phi) * 1e4, comprimento: r3(compB), percentual: pct(compB, L), tipo: 'curta' });
        } else if (br) ps.push({ n: br.n, phi: br.phi, As: br.As, comprimento: r3(comprimentoEd), percentual: pct(comprimentoEd, L), tipo: 'total' });
        return {
          AsNec: AsN, barras: br, comprimento: edS ? comprimentoEd : comprimento, x0: r3(x0), al: r3(al), lb: r3(lb), MRdNervura: MRdN, macico: r3(macico),
          parcelas: ps, MuMacico: MRdM, fonteLimite: fonteLim, ...(negFicha?.Mfis !== undefined ? { Mfis: negFicha.Mfis } : {}), ...(negFicha?.EI !== undefined ? { EI: negFicha.EI } : {}), ...(negFicha?.EIfis !== undefined ? { EIfis: negFicha.EIfis } : {}),
        };
      }) as [NegativoVigota | null, NegativoVigota | null];
      // ---- cortante
      const cortante = [0, 1].map((k): import('./vigotas').CortanteVigota => {
        const neg = negativos[k], dd = neg ? dS : dI, Vsd = esf.v[k];
        const As1 = neg ? (neg.barras?.As || neg.AsNec) / 1e4 : Math.max(AsEfInf, 2 * barArea(5));
        const calc1 = vrd1(c, bw, dd, As1), V2 = vrd2(c, bw, dd);
        let V1 = calc1, fonte: 'ficha' | 'calculado' = 'calculado';
        const cs = serie?.cortante;
        if (!moldada && cs) {
          fonte = 'ficha'; V1 = cs.VRd1;
          if (protendida && cs.VRd1Descomprimida !== undefined) {
            const Mend = Math.max(...ids.map((i) => (k ? faixas[i].Mmax.at(-1)! : faixas[i].Mmax[0]))) / escala;
            if (Mend <= (serie?.protensao?.Mdesc ?? 0)) V1 = cs.VRd1Descomprimida;
          }
        }
        let est: NonNullable<import('./vigotas').CortanteVigota['estribo']> | undefined;
        if (moldada) {
          const e = un.ed?.transversal ?? l.armaduraMoldada?.estribo;
          if (Vsd > V1 + 1e-9) {
            const sh = beamShear(bw, dd, Vsd, c, aV.fyk, gm.s);
            const prov = e ? (2 * barArea(e.phi)) / e.s : 0;
            if (!sh.ok) erro(`Vigotas: cortante ${fmt(Vsd)} kN por nervura acima de VRd2 = ${fmt(sh.VRd2)} kN (biela comprimida, modelo I) (${tag}, ${k ? 'fim' : 'início'}); aumente a largura da nervura ou a altura.`, un.indices);
            else if (!e) {
              const ch = sh.stirrup;
              if (ch) est = { phi: ch.phi, s: ch.s, zona: 0, barras: 0 };
              else erro(`Vigotas: cortante ${fmt(Vsd)} kN por nervura acima de VRd1 = ${fmt(V1)} kN sem estribo possível (${tag}); aumente a largura da nervura.`, un.indices);
            } else if (prov < sh.aswS - 1e-9) erro(`Armadura bloqueada insuficiente: estribo φ${fphi(e.phi)} c/${fmt(e.s * 100, 0)} < ${fmt(sh.aswS * 1e4)} cm²/m exigidos pelo cortante ${fmt(Vsd)} kN (${tag}, ${k ? 'fim' : 'início'}).`, un.indices);
            else est = { phi: e.phi, s: e.s, zona: 0, barras: 0 };
            if (est) {
              const zona = alcance(xs, Vdiag, V1, k as 0 | 1);
              est = { ...est, zona: r3(Math.min(L, zona)), barras: Math.ceil(Math.min(L, zona) / est.s) + 1 };
            }
          } else if (e) est = { phi: e.phi, s: e.s, zona: 0, barras: 0 };
        } else {
          const tr = un.ed?.transversal;
          if (tr && Vsd > V1) {
            const Vsw = ((2 * barArea(tr.phi)) / tr.s) * 0.9 * dd * Math.min(aV.fyk / gm.s, 435) * 1000, Vc = 0.6 * c.fctd * bw * dd * 1000;
            V1 = Math.max(V1, Vc) + Vsw;
          }
        }
        if (!moldada && Vsd > Math.min(V1, V2) + 1e-9) {
          erro(`Vigotas: cortante ${fmt(Vsd)} kN por nervura acima do resistente ${fonte === 'ficha' ? 'da ficha' : 'calculado'} (${fmt(Math.min(V1, V2))} kN) (${tag}, ${k ? 'fim' : 'início'}); use laje mais alta ou vigota dupla.`, un.indices);
        }
        return { Vsd, VRd1: V1, VRd2: V2, macico: 0, fonte, ...(est ? { estribo: est } : {}) };
      }) as [import('./vigotas').CortanteVigota, import('./vigotas').CortanteVigota];
      const macico = [0, 1].map((k) => negativos[k]?.macico ?? 0) as [number, number];
      for (const [k, mc] of macico.entries()) {
        if (mc > 2 * h) aviso(`Vigotas: maciçamento de ${fmt(mc * 100, 0)} cm (${k ? 'fim' : 'início'}) maior que duas vezes a altura da laje.`);
        if (mc > 0.2 * L) aviso(`Vigotas: maciçamento de ${fmt(mc * 100, 0)} cm (${k ? 'fim' : 'início'}) maior que 20 % do vão.`);
      }
      const pm = (e: EsforcosVigota): EsforcosVigota => ({ mPos: e.mPos / intereixo, mNeg: [e.mNeg[0] / intereixo, e.mNeg[1] / intereixo], v: [e.v[0] / intereixo, e.v[1] / intereixo] });
      // posições para o resumo de aço (por vigota)
      const nv = Math.max(1, nvig) * (n > 1 ? n : 1);
      if (moldada) {
        if (barrasPos?.n) posicoes.push({ tipo: 'inferior', aco: aI.aco, phi: barrasPos.phi, n: barrasPos.n * nv, comprimento: compPos, percentual: pct(compPos, L) });
        for (const ng of negativos) for (const p of ng?.parcelas ?? []) if (p.n) posicoes.push({ tipo: 'superior', aco: aS.aco, phi: p.phi, n: p.n * nv, comprimento: p.comprimento });
        // C7.194: estribo fechado ou em ômega; cortante em todo o comprimento = uma só posição com o espaçamento da ponta mais exigente
        const comprEst = (phi: number) => comprimentoEstribo({ bw, h, cob: cob.inf, phi, omega: !!op.vigotaEstriboOmega, aba: op.vigotaOmegaAba / 100 });
        const comEst = cortante.filter((ct) => ct.estribo && ct.estribo.barras);
        if (op.vigotaCortanteTotal && comEst.length) {
          const ct = comEst.reduce((a, z) => (z.estribo!.s < a.estribo!.s ? z : a));
          for (const k of cortante) if (k.estribo) k.estribo = { ...k.estribo, zona: r3(L), barras: Math.ceil(L / ct.estribo!.s) + 1 };
          posicoes.push({ tipo: 'transversal', aco: aV.aco, phi: ct.estribo!.phi, n: (Math.ceil(L / ct.estribo!.s) + 1) * nv, comprimento: comprEst(ct.estribo!.phi) });
        } else for (const ct of comEst) posicoes.push({ tipo: 'transversal', aco: aV.aco, phi: ct.estribo!.phi, n: ct.estribo!.barras * nv, comprimento: comprEst(ct.estribo!.phi) });
      } else {
        for (const p of parcelas) posicoes.push({ tipo: 'adicional', aco: aI.aco, phi: p.phi, n: p.n * nv, comprimento: p.comprimento, percentual: p.percentual });
        for (const ng of negativos) for (const p of ng?.parcelas ?? []) if (p.n) posicoes.push({ tipo: 'negativa', aco: aS.aco, phi: p.phi, n: p.n * nv, comprimento: p.comprimento, percentual: p.percentual });
      }
      const brd = dadosBranson(g0, c, AsEfInf, dI);
      if (Mfis === undefined) Mfis = brd?.Mfis;
      if (EI === undefined) EI = brd?.EI;
      if (EIfis === undefined) EIfis = brd?.EIfis;
      const dados: DadosFichaGrupo = {
        familia: ficha?.familia ?? 'moldada', origem: ficha ? (fabricante ? 'fabricante' : ficha.origem) : 'moldada',
        positivo: { Md, Mu, MuTotal, ...(Mfis !== undefined ? { Mfis } : {}), ...(EI !== undefined ? { EI } : {}), ...(EIfis !== undefined ? { EIfis } : {}), aprov: MuTotal > 0 ? Md / MuTotal : 0, fonte: !moldada && cand.length ? 'ficha' : 'calculado' },
        parcelas, ...(servico ? { servico } : {}), ...(moldadaInfo ? { moldada: moldadaInfo } : {}),
      };
      return {
        faixas: ids, vigotas: nvig, L: r3(L), esforcos: esf, porMetro: pm(esf), diagrama: diag, indices: un.indices, ...(un.especial ? { especial: un.especial } : {}),
        ...(tipoEsc ? { tipo: nomeTipo(tipoEsc), serie: tipoEsc.id, tipoAtribuido: !!un.ed?.tipo } : {}), ficha: dados, tipoVao: mins[ids[0]].tipo, redistribuicao: { delta: redist[un.gi].delta, aplicada: redist[un.gi].aplicada },
        positiva: { AsNec, AsTrelica: AsBase, AsAdicional: parcelas.reduce((t, p) => t + p.As, 0), barras: barrasPos, comprimento: compPos, duplaNecessaria: fl.double },
        negativos, cortante, macico,
      };
    });
    // alinhamento → grupo: o da unidade regular; sem vigota regular, o da primeira unidade à parte que o usa
    const atribuida = new Set<number>();
    for (const passo of [false, true]) grupos.forEach((g, gi) => { if (!!g.especial !== passo) return; for (const i of g.faixas) if (!atribuida.has(i)) { faixas[i].grupo = gi; atribuida.add(i); } });
    // distribuição na capa (Tabela 19.1) como nas treliçadas
    const AsPrinc = Math.max(0, ...grupos.map((g) => (g.positiva.AsTrelica + g.positiva.AsAdicional) / intereixo)); // cm²/m
    const AsDist = Math.max(0.2 * AsPrinc, 0.9, 0.5 * RHO_MIN_LAJE * capa * 1e4);
    const phiD = aS.aco === 'CA-60' && op.lajeBitolaMinima <= 5 ? 5 : 6.3;
    const sD = Math.max(0.05, Math.min(0.33, Math.floor(((barArea(phiD) * 1e4) / AsDist) * 100 + 1e-9) / 100));
    const A = Math.abs(areaPoligono(l.contorno)) - (l.furos ?? []).reduce((t, f) => t + Math.abs(areaPoligono(f)), 0), Lv = vaos(l)[0];
    posicoes.push({ tipo: 'distribuicao', aco: aS.aco, phi: phiD, n: Math.max(2, Math.ceil(Lv / sD) + 1), comprimento: arred(A / (Lv || 1), op.arredondamento) });
    const peso = posicoes.reduce((t, x) => t + x.n * x.comprimento * barArea(x.phi) * 7850, 0);
    const comprimentoVigotas = grupos.reduce((t, g) => t + g.vigotas * g.L, 0);
    const trNome = g0.trelica && trelicasDe(b)[g0.trelica] ? g0.trelica : '';
    // flechas por vigota (Branson) vindas da laje
    const flechas = new Map<number, NonNullable<ResultadoLaje['flechasVigotas']>[number]>();
    for (const r of lajes.filter((x) => x.laje === l.id)) for (const f of r.flechasVigotas ?? []) { const k = Math.round(f.t * 1000), e = flechas.get(k); if (!e || f.total > e.total) flechas.set(k, f); }
    const lista = listaDeVigotas(pos, faixas, grupos, l, (m) => (m > 1 && ficha ? conjuntoVigotas(b, g0, m).pesoLinear : g0.pp * intereixo));
    for (const v of lista) {
      const f = [...flechas.entries()].find(([k]) => Math.abs(k - Math.round(v.t * 1000)) <= 1) ?? [...flechas.entries()].sort((a, z) => Math.abs(a[0] - v.t * 1000) - Math.abs(z[0] - v.t * 1000))[0];
      if (f) v.flecha = f[1];
    }
    const flechaRuim = lista.filter((v) => v.flecha && v.flecha.status === 'fail');
    if (flechaRuim.length) {
      const w = flechaRuim.reduce((m, v) => (v.flecha!.total > m.total ? v.flecha! : m), flechaRuim[0].flecha!);
      erro(`Vigotas: flecha acima do limite nas vigotas ${flechaRuim.map((v) => v.indice + 1).join(', ')} — total ${fmt(w.total * 1000, 1)} mm (limite ${w.textos.total} = ${fmt(w.limites.total * 1000, 1)} mm), ativa ${fmt(w.ativa * 1000, 1)} mm, variáveis ${fmt(w.variavel * 1000, 1)} mm (Branson, rigidez fissurada); aumente a altura da laje.`, flechaRuim.map((v) => v.indice));
    }
    // situação e mensagens por vigota (C7.101)
    for (const v of lista) {
      if (falhas.has(v.indice)) v.status = 'fail';
      v.mensagens = porVigota.get(v.indice) ?? [];
      const g = grupos.find((x) => x.indices?.includes(v.indice));
      v.armadura = g ? resumoArmadura(g, moldada) : undefined;
    }
    // caa/serviço no memorial; resumo
    const tipos = new Map<string, number>();
    for (const g of grupos) { const k = g.tipo ?? (moldada ? 'moldada' : '—'); tipos.set(k, (tipos.get(k) ?? 0) + g.vigotas); }
    const rotuloFam = FAMILIAS_VIGOTA.find((x) => x.v === (ficha?.familia ?? 'moldada'))?.rotulo ?? 'Moldada no local';
    // E5e (C7.102): flecha de montagem da vigota sobre escoras (não vale para as moldadas no local)
    const montagem = !moldada && op.vigotaMontagem ? montagemDaLaje(c, g0, trNome ? trelicasDe(b)[trNome] : undefined, Math.max(...grupos.map((g) => g.L)), op) : undefined;
    if (montagem && !montagem.ok) erro(mensagemMontagem(montagem));
    const resumo = moldada
      ? `Vigotas moldadas: ${g0.descricao}, ${lista.length} nervura(s) em ${grupos.length} grupo(s); Md+ máx. ${fmt(Math.max(...grupos.map((g) => g.esforcos.mPos)))} kN·m por nervura; inferior ${[...new Set(grupos.map((g) => (g.positiva.barras?.n ? `${g.positiva.barras.n}φ${fphi(g.positiva.barras.phi)}` : '—')))].join(' / ')}.`
      : `Vigotas por ficha: ${g0.descricao} (${rotuloFam}), ${lista.length} vigota(s) em ${grupos.length} grupo(s); tipos ${[...tipos.entries()].map(([k, v]) => `${k} × ${v}`).join(', ')}; Md+ máx. ${fmt(Math.max(...grupos.map((g) => g.esforcos.mPos)))} kN·m por nervura${protendida ? `; protensão ${nivel} (CAA ${caa}, combinação ${comb})` : ''}.`;
    const todas = [...msgs.map((m) => ({ ...m })), { texto: resumo, erro: false }];
    const erros = todas.filter((m) => m.erro).map((m) => m.texto), outras = todas.filter((m) => !m.erro).map((m) => m.texto);
    msgsLaje(l.id, [...erros, ...outras], erros.length > 0);
    out.push({
      laje: l.id, nome: l.nome, grupo: l.grupo, pavimentos: nomesPav, repeticoes: Math.max(1, pavs.length), modelo: serie?.id ?? '', trelica: trNome,
      banzoInf: { n: 2, phi: trNome ? trelicasDe(b)[trNome].inf : 0, As: trNome ? 2 * barArea(trelicasDe(b)[trNome].inf) * 1e4 : 0 },
      intereixo, bw, capa, h, d: { inf: r3(dI), sup: r3(dS) }, vigotas: lista.length, comprimentoVigotas: r3(comprimentoVigotas), faixas, grupos,
      distribuicao: { AsNec: AsDist, aco: aS.aco, phi: phiD, s: sD }, verificacaoCapa: { minima: capaMin, ok: capaOk }, bloqueada: !!(l.edicaoVigotas?.length),
      posicoes, peso, pesoTrelica: trNome ? comprimentoVigotas * pesoTrelica(trNome, b) : 0, status: erros.length ? 'fail' : 'ok', mensagens: [...erros, ...outras],
      ...(montagem ? { montagem } : {}), lista, familia: ficha?.familia ?? 'moldada', ...(ficha ? { ficha: ficha.id, fichaNome: ficha.nome } : {}), ...(serie ? { serie: serie.id } : {}),
      ...(protendida ? { protensao: { caa, nivel, combinacao: comb } } : {}),
    });
  }
  return out;
}

/** Resumo da armadura de um grupo para a lista de vigotas: tipo, adicional e negativos. */
function resumoArmadura(g: GrupoVigotas, moldada: boolean): string {
  const f = (n: number, phi: number) => `${n}φ${fphi(phi)}`;
  const pos = moldada ? (g.positiva.barras?.n ? `inf. ${f(g.positiva.barras.n, g.positiva.barras.phi)}` : '') : [g.tipo ? `tipo ${g.tipo}` : '', ...(g.ficha?.parcelas ?? []).map((p) => `+${f(p.n, p.phi)} ${p.percentual.toFixed(0)}%`)].filter(Boolean).join(' ');
  const neg = g.negativos.map((n) => (n?.barras?.n ? f(n.barras.n, n.barras.phi) : '—')).join('/');
  return [pos, `neg. ${neg}`].filter(Boolean).join('; ');
}

