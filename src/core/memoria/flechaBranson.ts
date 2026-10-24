// Memória detalhada (MD fase 3b): rigidez fissurada (Branson) das nervuras e a fase 1 das alveolares, usadas na flecha das lajes
// nervuradas, de vigotas e alveolares. Os valores são os do cálculo (`fissuracaoGrelha` em `dimensionamento.ts`).
import { fm, type Registrador } from './registrador';

const NBR = 'NBR 6118:2023';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;

/** Nervura (ou faixa de 1 m das alveolares) mais fissurada da laje na combinação quase permanente. */
export interface DetBransonNerv {
  /** Barra da grelha, momento quase permanente `Ma` (kN·m por nervura; + traciona embaixo) e a rigidez do lado (positivo ou negativo). */
  barra: number; Ma: number; pos: boolean; EI: number; EIfis: number; Mfis: number;
  /** Origem do EI fissurado: ficha, relação da ficha, estádio II da seção T, ou ficha da placa alveolar. */
  fonte: string;
  /** Ie/Ic de Branson da barra, número de barras consideradas e delas com Ie < Ic. */
  f: number; n: number; nFiss: number;
  /** Flechas elástica e fissurada da laje (m): κ = máx(1; cr/el). */
  el?: number; cr?: number;
}

/** Fissuração (Branson) da nervura mais fissurada e o fator κ da laje (grelha recomposta com Iz × Ie/Ic). */
export function passosBransonNervura(mem: Registrador, el: string, tf: string, d: DetBransonNerv, kappa: number) {
  const P = (p: Chave) => mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tf, ...p });
  const M = Math.abs(d.Ma), r = M <= d.Mfis ? 1 : (d.Mfis / M) ** 3, EIe = Math.min(d.EI, r * d.EI + (1 - r) * d.EIfis);
  P({ descricao: `Fissuração (Branson) da nervura mais fissurada (barra ${d.barra}, ${d.pos ? 'momento positivo' : 'momento negativo'}; ${d.nFiss} de ${d.n} barras com Ie < Ic; rigidez fissurada: ${d.fonte})`, formula: 'r = (Mfis/|Ma|)³ (1 se |Ma| ≤ Mfis); EIe = mín(EI; r·EI + (1 − r)·EIfis); f = EIe/EI (0,01 a 1)', expressao: `r = ${fm(r)}; EIe = mín(${fm(d.EI)}; ${fm(r)}·${fm(d.EI)} + ${fm(1 - r)}·${fm(d.EIfis)}) = ${fm(EIe)}; Ie/Ic = ${fm(d.f)}`, resultado: d.f, unidade: '', norma: `${NBR}, 17.3.2.1.1`, aConfirmar: true, entradas: { Ma: d.Ma, EI: d.EI, EIfis: d.EIfis, Mfis: d.Mfis, f: d.f, n: d.n, nFiss: d.nFiss, barra: d.barra, pos: d.pos ? 1 : 0 }, observacao: 'EI, EI fissurado e Mfis da ficha do fabricante, da relação informada na ficha ou do estádio II da seção T com a armadura equivalente [a confirmar com o fabricante].' });
  if (d.el !== undefined && d.cr !== undefined) P({ descricao: 'Fator de fissuração da laje: grelha recomposta com Iz × Ie/Ic em cada barra, razão entre a flecha fissurada e a elástica', formula: 'κ = máx(1; δ,fissurada / δ,elástica)', expressao: `κ = máx(1; ${fm(d.cr * 1000)}/${fm(d.el * 1000)}) = ${fm(kappa)}`, resultado: kappa, unidade: '', norma: `${NBR}, 17.3.2.1.1`, aConfirmar: true, entradas: { cr: d.cr, el: d.el, kappa } });
}

export interface DetFase1 { pp: number; vao: number; EI: number; f1: number }
/** Fase 1 do processo de duas fases das alveolares: placa isostática sob o peso próprio. */
export function passoFase1(mem: Registrador, el: string, tf: string, d: DetFase1) {
  mem.passo({ etapa: 'dimensionamento', elemento: el, topico: tf, descricao: 'Flecha da fase 1 do processo de duas fases: placa isostática sob o peso próprio, somada às flechas da grelha contínua (permanentes)', formula: 'f1 = 5·pp·ℓ⁴/(384·EI) por metro', expressao: `f1 = 5·${fm(d.pp)}·${fm(d.vao)}⁴/(384·${fm(d.EI)}) = ${fm(d.f1 * 1000)} mm`, resultado: d.f1, unidade: 'm', norma: 'Critério do programa (processo construtivo)', aConfirmar: true, entradas: { pp: d.pp, vao: d.vao, EI: d.EI, f1: d.f1 } });
}
