// Verificação das paredes de alvenaria estrutural e de blocos de concreto sobre a análise em casca (E1e).
// Para cada lado em casca, lance e pano (faixa entre aberturas), as forças de membrana e de placa de cada elemento da casca
// em cada combinação ELU viram utilizações contra as tensões-limite da alvenaria (`alvenaria.ts`); o pano atende se a fração
// da área que atende for ao menos o fator de cumprimento (80 % no sistema). Paredes de blocos armadas recebem armadura vertical
// e horizontal por pano; as aberturas das paredes de blocos recebem verga e contraverga; os lados curtos (barras) são
// verificados como pilares de alvenaria; as vigas embutidas em muros de alvenaria têm as espessuras mínimas conferidas.
// Premissas em `premissas.ts` (ids e1e-*).
import { barArea } from '../concrete';
import type { AnaliseEdificio } from './analitico';
import { acoAlvenariaParede, type AcoAlvParede } from './alvenariaAco';
import {
  aberturaModular, BITOLAS_HORIZONTAL, BITOLAS_VERTICAL, blocoDe, desligamentosMuroPilar, ehAlvenaria, ESP_HORIZONTAL_MAX, ESP_VERTICAL_MAX, esbeltezAlvenaria, escolherMalhaBlocos,
  flexaoArmadaFaixa, fvdDe, moduloDoBloco, quantitativoAlvenaria, resistenciaAlvenaria, tipoAlvenariaDe, trechoDaAbertura, utilizacaoElemento,
  type Desligamento, type QuantParede, type ResistenciaAlv,
} from './alvenaria';
import type { CombinacaoEd } from './combinacoes';
import type { ResultadoViga } from './dimensionamento';
import { classificar } from './revisao';
import { acoDe } from './materiais';
import type { OpcoesCalculo } from './opcoes';
import { escolherBarras, esforcosDoLado, extrapolarBordas, faixa, fontesCascas, intervalosDosPanos, type ElementoPano, type ForcasFaixa } from './paredesDim';
import { forcasDe } from './paredesArmadura';
import { furosDaParede, ppDaParede } from './paredesBase';
import type { EsforcoLado } from './paredesLado';
import { geometriaParedes, ladosDoPP, lancesDoPP, type GradeLado } from './pilarParede';
import type { ResultadoPilarParede } from './pilarParedeEsforcos';
import type { AberturaParede, ArmaduraVerga, BuildingModel, TipoBloco } from './types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const pct = (v: number) => `${fmt(v * 100, 1)} %`;
const r4 = (v: number) => +v.toFixed(4);

// ---------------------------------------------------------------- resultados

export interface PontoAlv { s: number; z: number; area: number; motivo: 'compressao' | 'tracao' | 'cisalhamento'; util: number; combo: string }

/** Armadura de um pano de parede de blocos armada: barras verticais (células grauteadas) e horizontais (juntas). */
export interface ArmaduraPanoAlv {
  /** Necessária (cm²/m) e adotada (bitola mm, espaçamento m, área cm²/m). */
  nec: { vert: number; hor: number };
  vert: { phi: number; s: number; As: number } | null; hor: { phi: number; s: number; As: number } | null;
  origem: 'calculada' | 'bloqueada';
}

export interface ResultadoPanoAlv {
  lado: number; nomeLado: string; pavimento: string; nomePav: string; pano: number; panos: number;
  /** Extensão no sistema (s, z) do lado, m; z a partir da base do lance. */
  s0: number; s1: number; z0: number; z1: number; t: number; area: number;
  hef: number; lambda: number; R: number; lambdaMax: number;
  /** Resistências de cálculo (MPa): compressão, tração e cisalhamento sem tensão normal. */
  fd: number; ftd: number; fvd0: number;
  /** Fração da área que atende, a exigida e a maior utilização de cada tipo (compressão, tração, cisalhamento). */
  cumprimento: number; exigido: number;
  util: { comp: number; trac: number; cis: number };
  governa: { combo: string; s: number; z: number; modo: 'compressao' | 'tracao' | 'cisalhamento' } | null;
  pontos: PontoAlv[];
  armadura?: ArmaduraPanoAlv;
  status: 'ok' | 'fail';
  mensagens: string[];
}

export interface ResultadoLadoAlv {
  lado: number; nome: string; pavimento: string; nomePav: string; modelo: 'casca' | 'barra';
  L: number; t: number; lambda: number; util: number; combo: string;
  status: 'ok' | 'fail'; mensagens: string[];
}

export interface ResultadoVerga {
  id: string; tipo: 'porta' | 'janela'; pavimento: string; nomePav: string; lado: number; lance: string;
  s: number; largura: number; peitoril: number; altura: number;
  /** A abertura está nas medidas modulares do bloco. */
  modular: boolean;
  /** Apoio de cada lado (m), fiadas de canaleta e altura da verga (m). */
  apoio: number; fiadas: number; hVerga: number;
  /** Armadura necessária (cm²) da verga e da contraverga, e dos estribos (cm²/m). */
  necessaria: { verga: number; contraverga: number; estribo: number };
  armadura: ArmaduraVerga; origem: 'calculada' | 'bloqueada' | 'padrao';
  cortante: { V: number; VRd: number; VRd2: number; ok: boolean };
  /** Em muro de subsolo a verga é armada sem aviso de tensões excessivas (C5.12). */
  semAviso: boolean;
  status: 'ok' | 'fail'; mensagens: string[];
}

export interface ResultadoVigaMuro {
  viga: string; nome: string; parede: string; nomeParede: string;
  papel: 'coroamento' | 'laje' | 'topoSubsolo';
  /** Armadura opcional neste papel (a de topo do subsolo é sempre armada) e dispensada pela opção. */
  opcional: boolean; dispensada: boolean;
  b: number; h: number;
  status: 'ok' | 'fail'; mensagens: string[];
}

export interface ResultadoAlvenariaParede {
  id: string; nome: string; tipo: 'alvenaria' | 'blocos';
  material: string; nomeMaterial: string; armada: boolean;
  resistencia: ResistenciaAlv;
  panos: ResultadoPanoAlv[]; lados: ResultadoLadoAlv[]; vergas: ResultadoVerga[];
  quantitativo?: QuantParede;
  /** Aço da alvenaria armada (barras verticais, juntas, vergas e estribos) e peso (E6a). */
  aco?: AcoAlvParede;
  status: 'ok' | 'fail'; mensagens: string[];
}

export interface ResultadoAlvenaria {
  paredes: ResultadoAlvenariaParede[];
  desligamentos: Desligamento[];
  vigasMuro: ResultadoVigaMuro[];
  /** Blocos por tipo de bloco, somando as paredes de blocos. */
  resumoBlocos: { bloco: string; nome: string; inteiros: number; meios: number; cantos: number; canaletas: number; total: number; area: number }[];
  /** Resumo do aço da alvenaria armada por aço e bitola (m, kg; sem perdas), somando as paredes (E6a). */
  resumoAco: { aco: string; phi: number; comprimento: number; peso: number }[];
}

// ---------------------------------------------------------------- pano

interface EntradaPanoAlv {
  nome: string; t: number; H: number;
  elementos: ElementoPano[]; combos: string[];
  res: ResistenciaAlv; op: OpcoesCalculo;
  fydV: number; fydH: number;
  /** Armadura bloqueada do tipo de alvenaria e módulos de espaçamento (m): horizontal do bloco e altura da fiada. */
  bloqueio?: { vertical?: { phi: number; s: number }; horizontal?: { phi: number; s: number } };
  passoV: number; passoH: number;
}
type SaidaPanoAlv = Omit<ResultadoPanoAlv, 'lado' | 'nomeLado' | 'pavimento' | 'nomePav' | 'pano' | 'panos' | 's0' | 's1' | 'z0' | 'z1'>;

/** Verifica (e, na parede armada, arma) um pano: utilizações por elemento, fator de cumprimento, pontos fora e armadura. */
export function verificarPanoAlvenaria(e: EntradaPanoAlv): SaidaPanoAlv {
  const { t, H, res, op } = e, msgs: string[] = [];
  const esb = esbeltezAlvenaria(H, t, op, res.armada), exigido = op.alvenariaCumprimento / 100, fvd0 = fvdDe(res, 0);
  let areaTot = 0, areaOk = 0, uC = 0, uT = 0, uS = 0, nVert = 0, nHor = 0;
  let governa: SaidaPanoAlv['governa'] = null, pior = 0;
  const pontos: PontoAlv[] = [];
  const kFyd = res.armada ? e.fydV : 1;
  for (const el of e.elementos) {
    let w: { u: ReturnType<typeof utilizacaoElemento>; c: number } | null = null;
    el.forcas.forEach((f, c) => {
      const u = utilizacaoElemento(f, t, esb, res, op);
      if (!w || u.max > w.u.max) w = { u, c };
      if (res.armada) {
        const Nc = Math.max(0, -f.ny), M = Math.max(Math.abs(f.my), op.alvenariaExcMin > 0 ? (Nc * esb.hef) / op.alvenariaExcMin : 0);
        const fl = flexaoArmadaFaixa(-f.ny, M, t, res.fd * esb.R, kFyd);
        if (fl.ok) nVert = Math.max(nVert, fl.As);
        const exc = Math.max(0, Math.abs(f.nxy) - fvdDe(res, Math.max(0, -f.ny / (t * 1000))) * t * 1000);
        nHor = Math.max(nHor, ((Math.max(0, f.nx) + exc) / (e.fydH * 1000)) * 1e4);
      }
    });
    if (!w) continue;
    const { u, c } = w as { u: ReturnType<typeof utilizacaoElemento>; c: number };
    areaTot += el.area;
    if (u.max <= 1 + 1e-9) areaOk += el.area; else pontos.push({ s: el.s, z: el.z, area: el.area, motivo: u.modo, util: u.max, combo: e.combos[c] });
    uC = Math.max(uC, u.comp); uT = Math.max(uT, u.trac); uS = Math.max(uS, u.cis);
    if (u.max > pior) { pior = u.max; governa = { combo: e.combos[c], s: el.s, z: el.z, modo: u.modo }; }
  }
  const cumprimento = areaTot > 0 ? areaOk / areaTot : 1;
  let ok = true;
  if (!esb.ok) { ok = false; msgs.push(`Esbeltez λ = ${fmt(esb.lambda, 1)} (hef ${fmt(esb.hef)} m / t ${fmt(t)} m) acima do limite ${fmt(esb.max, 0)} da alvenaria ${res.armada ? 'armada' : 'não armada'}.`); }
  if (cumprimento < exigido - 1e-9) {
    ok = false;
    const modos = (['compressao', 'tracao', 'cisalhamento'] as const).map((m) => [m, pontos.filter((p) => p.motivo === m).reduce((s, p) => s + p.area, 0) / (areaTot || 1)] as const).filter(([, a]) => a > 0)
      .map(([m, a]) => `${m === 'compressao' ? 'compressão' : m === 'tracao' ? 'tração' : 'cisalhamento'} em ${pct(a)} da área`);
    msgs.push(`Fator de cumprimento ${pct(cumprimento)} abaixo do exigido ${pct(exigido)}: ${modos.join(', ')} (utilização máxima ${fmt(pior)}${governa ? ` em ${governa.combo}` : ''}).`);
  } else if (pontos.length) {
    msgs.push(`Pontos fora das tensões-limite em ${pct(1 - cumprimento)} da área, dentro do fator de cumprimento exigido de ${pct(exigido)} (utilização máxima ${fmt(pior)}${governa ? ` em ${governa.combo}` : ''}).`);
  }
  // armadura das paredes de blocos armadas
  let armadura: ArmaduraPanoAlv | undefined;
  if (res.armada) {
    const mínV = (op.alvenariaTaxaVertMin / 100) * t * 1e4, mínH = (op.alvenariaTaxaHorMin / 100) * t * 1e4, necV = Math.max(nVert, mínV), necH = Math.max(nHor, mínH);
    const bq = e.bloqueio;
    let vert = bq?.vertical ? { phi: bq.vertical.phi, s: bq.vertical.s, As: (barArea(bq.vertical.phi) * 1e4) / bq.vertical.s } : escolherMalhaBlocos(necV, BITOLAS_VERTICAL, e.passoV, ESP_VERTICAL_MAX);
    let hor = bq?.horizontal ? { phi: bq.horizontal.phi, s: bq.horizontal.s, As: (barArea(bq.horizontal.phi) * 1e4) / bq.horizontal.s } : escolherMalhaBlocos(necH, BITOLAS_HORIZONTAL, e.passoH, ESP_HORIZONTAL_MAX);
    if (!vert) { ok = false; msgs.push(`Armadura vertical: nenhuma malha de até φ20 c/${fmt(ESP_VERTICAL_MAX * 100, 0)} cm atende ${fmt(necV)} cm²/m.`); }
    if (!hor) { ok = false; msgs.push(`Armadura horizontal: nenhuma malha de até φ10 c/${fmt(ESP_HORIZONTAL_MAX * 100, 0)} cm atende ${fmt(necH)} cm²/m.`); }
    if (bq?.vertical && vert && vert.As + 1e-9 < necV) { ok = false; msgs.push(`Armadura vertical bloqueada com ${fmt(vert.As)} cm²/m abaixo dos ${fmt(necV)} cm²/m necessários.`); }
    if (bq?.horizontal && hor && hor.As + 1e-9 < necH) { ok = false; msgs.push(`Armadura horizontal bloqueada com ${fmt(hor.As)} cm²/m abaixo dos ${fmt(necH)} cm²/m necessários.`); }
    armadura = { nec: { vert: necV, hor: necH }, vert, hor, origem: bq?.vertical || bq?.horizontal ? 'bloqueada' : 'calculada' };
  }
  return {
    t, area: areaTot, hef: esb.hef, lambda: esb.lambda, R: esb.R, lambdaMax: esb.max, fd: res.fd, ftd: res.ftd, fvd0, cumprimento, exigido,
    util: { comp: uC, trac: uT, cis: uS }, governa, pontos: pontos.sort((a, z) => z.area - a.area).slice(0, 200), ...(armadura ? { armadura } : {}),
    status: ok ? 'ok' : 'fail', mensagens: msgs,
  };
}

// ---------------------------------------------------------------- lado curto (barra)

/**
 * Lado curto (trecho com comprimento < 5 × a espessura, tratado como pilar de alvenaria) sob as resultantes (N > 0 tração,
 * Mp no plano e Mo fora do plano, em kN e kN·m): compressão σN/(fd·R) + σM/fd e tração σM − σN ≤ ftd. Sem crédito de
 * armadura (a favor da segurança).
 */
export function verificarLadoAlvenaria(L: number, t: number, H: number, es: EsforcoLado[], res: ResistenciaAlv, op: OpcoesCalculo): { util: number; combo: string; lambda: number; ok: boolean } {
  const esb = esbeltezAlvenaria(H, t, op, res.armada), A = L * t;
  let util = 0, combo = '';
  for (const e of es) {
    const sN = -e.N / (A * 1000), Nc = Math.max(0, -e.N);
    const Mo = Math.max(Math.abs(e.Mo), op.alvenariaExcMin > 0 ? (Nc * esb.hef) / op.alvenariaExcMin : 0);
    const sM = (6 * Mo) / (L * t * t * 1000) + (6 * Math.abs(e.Mp)) / (t * L * L * 1000), sMt = (6 * Math.abs(e.Mo)) / (L * t * t * 1000) + (6 * Math.abs(e.Mp)) / (t * L * L * 1000);
    const comp = Math.max(0, sN) / (res.fd * esb.R || 1e-12) + sM / res.fd, trac = res.ftd > 0 ? Math.max(0, sMt - sN) / res.ftd : Math.max(0, sMt - sN) > 1e-9 ? 99 : 0;
    const u = Math.max(comp, trac);
    if (u > util || !combo) { util = u; combo = e.nome; }
  }
  return { util, combo, lambda: esb.lambda, ok: esb.ok && util <= 1 + 1e-9 };
}

// ---------------------------------------------------------------- verga

export interface EntradaVerga {
  a: AberturaParede; nomePav: string; lado: number; lance: string; t: number; bl: TipoBloco;
  res: ResistenciaAlv; fyd: number; op: OpcoesCalculo;
  /** Altura da faixa acima da abertura (até o topo do lance) e da faixa abaixo (peitoril), m. */
  hVerga: number; hPeitoril: number;
  verga: ForcasFaixa; peitoril: ForcasFaixa;
  modular: boolean; semAviso: boolean;
  bloqueada?: ArmaduraVerga; padrao?: ArmaduraVerga;
}

const ESTRIBOS = [5, 6.3, 8];

/**
 * Verga da abertura em parede de blocos: tração da camada inferior da faixa acima (T = N/2 + M/z, z = 0,9d, d = altura da
 * faixa − 4 cm) e, em janela, da faixa abaixo (contraverga); cortante pelo fvd sem compressão (a favor da segurança) e,
 * acima dele, estribos até o limite 0,25·fd da biela. Barras na canaleta grauteada: n ≥ 2, φ ≥ 8 mm. Armadura bloqueada
 * ou padrão por tipo é verificada contra a necessária.
 */
export function dimensionarVerga(e: EntradaVerga): ResultadoVerga {
  const { a, t, res } = e, msgs: string[] = [], { alt } = moduloDoBloco(e.bl);
  const tracao = (f: ForcasFaixa, h: number) => {
    const z = 0.9 * Math.max(0.05, h - 0.04);
    return Math.max(0, ...f.combos.map((c) => (c.N / 2 + Math.abs(c.M) / z) / (e.fyd * 1000) * 1e4));
  };
  const nV = tracao(e.verga, e.hVerga), nP = a.tipo === 'janela' ? tracao(e.peitoril, e.hPeitoril) : 0;
  const V = Math.max(0, ...e.verga.combos.map((c) => Math.abs(c.V))), d = Math.max(0.05, e.hVerga - 0.04);
  const VRd = fvdDe(res, 0) * 1000 * t * d, VRd2 = 0.25 * res.fd * 1000 * t * d, biela = V <= VRd2 + 1e-9;
  const fywd = e.fyd;
  let estribo: ArmaduraVerga['estribo'];
  let nEst = 0;
  if (V > VRd + 1e-9) {
    nEst = ((V - VRd) / (0.9 * d * fywd * 1000)) * 1e4; // cm²/m, 2 ramos
    outer: for (const phi of ESTRIBOS) for (const s of [3 * alt, 2 * alt, alt]) if ((2 * barArea(phi) * 1e4) / s >= nEst - 1e-9) { estribo = { phi, s }; break outer; }
    if (!estribo) estribo = { phi: 8, s: 0.2 };
  }
  const calc: ArmaduraVerga = { ...escolherBarras(nV, 8, 2, 6), ...(estribo ? { estribo } : {}), ...(a.tipo === 'janela' ? { contraverga: escolherBarras(nP, 8, 2, 6) } : {}) };
  const dado = e.bloqueada ?? e.padrao, adot = dado ?? calc;
  const origem: ResultadoVerga['origem'] = e.bloqueada ? 'bloqueada' : e.padrao ? 'padrao' : 'calculada';
  const prov = (x?: { n: number; phi: number }) => (x ? x.n * barArea(x.phi) * 1e4 : 0);
  let ok = true;
  if (dado) {
    if (prov(adot) < nV - 1e-9) { ok = false; msgs.push(`Verga com ${fmt(prov(adot))} cm² abaixo dos ${fmt(nV)} cm² necessários.`); }
    if (a.tipo === 'janela' && prov(adot.contraverga) < nP - 1e-9) { ok = false; msgs.push(`Contraverga da janela com ${fmt(prov(adot.contraverga))} cm² abaixo dos ${fmt(nP)} cm² necessários.`); }
    if (nEst > 0 && (!adot.estribo || (2 * barArea(adot.estribo.phi) * 1e4) / adot.estribo.s < nEst - 1e-9)) { ok = false; msgs.push('Estribos da verga abaixo do necessário ao cortante.'); }
  }
  if (!biela && !e.semAviso) { ok = false; msgs.push(`Verga: cortante ${fmt(V, 1)} kN acima do limite da biela ${fmt(VRd2, 1)} kN; aumente a altura da verga ou a espessura.`); }
  if (!e.modular) msgs.push('Abertura fora das medidas modulares do bloco: peças cortadas na obra; ajuste à modulação.');
  return {
    id: a.id, tipo: a.tipo, pavimento: a.pavimento, nomePav: e.nomePav, lado: e.lado, lance: e.lance, s: a.s, largura: a.largura, peitoril: a.peitoril, altura: a.altura,
    modular: e.modular, apoio: r4(Math.ceil(e.op.alvenariaVergaApoio / 100 / (e.bl.comprimento / 2) - 1e-6) * (e.bl.comprimento / 2)), fiadas: Math.round(e.op.alvenariaVergaFiadas), hVerga: e.hVerga,
    necessaria: { verga: nV, contraverga: nP, estribo: nEst }, armadura: adot, origem, cortante: { V, VRd, VRd2, ok: biela }, semAviso: e.semAviso,
    status: ok ? 'ok' : 'fail', mensagens: msgs,
  };
}

// ---------------------------------------------------------------- vigas sobre muros

/** Vigas embutidas em muros de alvenaria: papel, armadura opcional ou dispensada e espessuras mínimas (C6.59). */
export function vigasSobreMuros(b: BuildingModel, op: OpcoesCalculo): ResultadoVigaMuro[] {
  const out: ResultadoVigaMuro[] = [];
  for (const v of b.vigas) {
    const w = v.embutida ? b.paredes?.find((x) => x.id === v.embutida) : undefined;
    if (!w || !ehAlvenaria(w)) continue;
    const papel: ResultadoVigaMuro['papel'] = w.empuxos?.length ? 'topoSubsolo' : w.tipo === 'blocos' ? 'coroamento' : 'laje';
    const opcional = papel !== 'topoSubsolo', dispensada = opcional && op.alvenariaVigaArmar === 0, msgs: string[] = [];
    if (v.secao.b < op.alvenariaVigaBMin / 100 - 1e-9 || v.secao.h < op.alvenariaVigaHMin / 100 - 1e-9) msgs.push(`Viga ${v.nome} (${fmt(v.secao.b * 100, 0)} × ${fmt(v.secao.h * 100, 0)} cm) abaixo das dimensões mínimas ${fmt(op.alvenariaVigaBMin, 0)} × ${fmt(op.alvenariaVigaHMin, 0)} cm da viga sobre muro de alvenaria.`);
    if (dispensada) msgs.push(`Viga ${v.nome} sobre ${w.nome}: armadura opcional dispensada (opção "armar sempre" desligada); a viga trabalha como cinta do muro.`);
    out.push({ viga: v.id, nome: v.nome, parede: w.id, nomeParede: w.nome, papel, opcional, dispensada, b: v.secao.b, h: v.secao.h, status: msgs.some((m) => m.includes('abaixo das dimensões')) ? 'fail' : 'ok', mensagens: msgs });
  }
  return out;
}

// ---------------------------------------------------------------- orquestração

/**
 * Verifica as paredes de alvenaria e de blocos da obra (undefined sem elas). `resultantes` = resultantes por lado (E1c) usadas
 * nos lados curtos; as forças das cascas vêm da análise.
 */
export function dimensionarAlvenaria(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[], resultantes: ResultadoPilarParede[] | undefined, op: OpcoesCalculo): ResultadoAlvenaria | undefined {
  const paredes = (b.paredes ?? []).filter(ehAlvenaria);
  if (!paredes.length) return undefined;
  const quant = quantitativoAlvenaria(b, op), saida: ResultadoAlvenariaParede[] = [];
  const geo = an.paredes && an.portico.res ? geometriaParedes(b, op) : null;
  const fontes = an.paredes && an.portico.res ? fontesCascas(an) : new Map<string, Float64Array[]>(), combos = elu.map((c) => c.nome);
  const comp = elu.map((cb) => Object.entries(cb.fatores).filter(([n, f]) => f && fontes.has(n)).map(([n, f]) => [fontes.get(n)!, f] as const));
  const aV = acoDe(b, 'alvenariaVert'), aH = acoDe(b, 'alvenariaHor');
  for (const w of paredes) {
    const t = tipoAlvenariaDe(b, w), bl = blocoDe(b, t);
    if (!t || (t.modelo === 'blocos' && !bl)) continue; // o lançamento acusa (ALV_MATERIAL)
    const res = resistenciaAlvenaria(t, bl, op), pp = ppDaParede(w), lances = lancesDoPP(b, pp), zs = geo?.niveisZ[pp.id];
    const r: ResultadoAlvenariaParede = { id: w.id, nome: w.nome, tipo: w.tipo as 'alvenaria' | 'blocos', material: t.id, nomeMaterial: t.nome, armada: res.armada, resistencia: res, panos: [], lados: [], vergas: [], status: 'ok', mensagens: [] };
    const q = quant.find((x) => x.id === w.id);
    if (q) r.quantitativo = q;
    if (geo && zs && lances.length) {
      const lados = ladosDoPP(b, pp, op.pilarParedeLimite), furos = furosDaParede(b, w).porTrecho, res0 = resultantes?.find((x) => x.id === w.id);
      const semAviso = !!w.empuxos?.length;
      for (const g of lados) for (const [k, lance] of lances.entries()) {
        const tt = g.esp(lance.id).t, H = zs[k + 1] - zs[k], es = esforcosDoLado(res0, g.i, lance.id, elu);
        if (!g.casca) {
          const v = verificarLadoAlvenaria(g.L, tt, H, es, res, op);
          r.lados.push({ lado: g.i, nome: g.nome, pavimento: lance.id, nomePav: lance.nome, modelo: 'barra', L: g.L, t: tt, lambda: v.lambda, util: v.util, combo: v.combo, status: v.ok ? 'ok' : 'fail', mensagens: v.ok ? [] : [`Lado curto (pilar de alvenaria): utilização ${fmt(v.util)}${v.combo ? ` em ${v.combo}` : ''}${v.lambda > op.alvenariaLambdaMax ? `, esbeltez ${fmt(v.lambda, 1)}` : ''}.`] });
          continue;
        }
        const gr = geo.grades.find((x) => x.lado.id === g.id) as GradeLado;
        const z0 = zs[k], fs = (furos[g.i] ?? []).filter((f) => f.z0 >= z0 - 1e-6 && f.z1 <= zs[k + 1] + 1e-6);
        const elementos: ElementoPano[] = an.paredes!.info.filter((x) => x.ladoId === g.id && x.lance === lance.id).map((x) => ({
          s: x.s, z: x.z - z0, area: x.area,
          forcas: comp.map((cs) => { const v = new Float64Array(8); for (const [arr, f] of cs) { const a = arr[x.k]; if (a) for (let i = 0; i < 8; i++) v[i] += f * a[i]; } return forcasDe(v); }),
        }));
        const intervalos = intervalosDosPanos(g.L, fs), colunasGrade = gr.S;
        const { mod, alt } = bl ? moduloDoBloco(bl) : { mod: 0.2, alt: 0.2 };
        intervalos.forEach(([a, z], ip) => {
          const dentro0 = elementos.filter((x) => x.s >= a && x.s < z);
          if (!dentro0.length) return;
          const dentro = [...dentro0, ...extrapolarBordas(dentro0, colunasGrade, H)];
          const s = verificarPanoAlvenaria({ nome: `${g.nome} ${lance.nome}`, t: tt, H, elementos: dentro, combos, res, op, fydV: aV.fyd, fydH: aH.fyd, bloqueio: t.armadura, passoV: mod, passoH: alt });
          r.panos.push({ ...s, lado: g.i, nomeLado: g.nome, pavimento: lance.id, nomePav: lance.nome, pano: ip, panos: intervalos.length, s0: a, s1: z, z0: 0, z1: H });
        });
        r.lados.push({ lado: g.i, nome: g.nome, pavimento: lance.id, nomePav: lance.nome, modelo: 'casca', L: g.L, t: tt, lambda: esbeltezAlvenaria(H, tt, op, res.armada).lambda, util: Math.max(0, ...r.panos.filter((p) => p.lado === g.i && p.pavimento === lance.id).map((p) => Math.max(p.util.comp, p.util.trac, p.util.cis))), combo: '', status: r.panos.filter((p) => p.lado === g.i && p.pavimento === lance.id).some((p) => p.status === 'fail') ? 'fail' : 'ok', mensagens: [] });
        // vergas das paredes de blocos (a alvenaria genérica não leva verga: sem aviso de tensões excessivas)
        if (bl) for (const f of fs) {
          const ab = w.aberturas?.find((x) => x.id === f.id);
          if (!ab) continue;
          const tr = trechoDaAbertura(w, ab);
          const col = (lo: number, hi: number) => faixa(elementos, f, lo, hi, true, comp.length, 0, gr);
          r.vergas.push(dimensionarVerga({
            a: ab, nomePav: lance.nome, lado: g.i, lance: lance.id, t: tt, bl, res, fyd: aV.fyd, op, hVerga: Math.max(H - (f.z1 - z0), 0.05), hPeitoril: Math.max(f.z0 - z0, 0.05),
            verga: col(f.z1 - z0, H), peitoril: col(0, f.z0 - z0), modular: tr ? aberturaModular(ab, tr.s0, bl) : true, semAviso,
            ...(ab.verga ? { bloqueada: ab.verga } : {}), ...(b.vergasPadrao?.[ab.tipo] ? { padrao: b.vergasPadrao[ab.tipo] } : {}),
          }));
        }
      }
    }
    // utilização do lado = a pior dos panos e das utilizações; mensagens do lado curto sobem para a parede
    if (bl && (r.panos.some((p) => p.armadura) || r.vergas.length)) { const m = moduloDoBloco(bl); r.aco = acoAlvenariaParede(r, m.mod, m.alt, aV.aco, op); }
    r.status = [...r.panos, ...r.lados, ...r.vergas].some((x) => x.status === 'fail') ? 'fail' : 'ok';
    saida.push(r);
  }
  // resumo de blocos por tipo de bloco
  const resumo = new Map<string, ResultadoAlvenaria['resumoBlocos'][number]>();
  for (const q of quant) {
    const x = resumo.get(q.bloco) ?? { bloco: q.bloco, nome: q.nomeBloco, inteiros: 0, meios: 0, cantos: 0, canaletas: 0, total: 0, area: 0 };
    x.inteiros += q.totais.inteiros; x.meios += q.totais.meios; x.cantos += q.totais.cantos; x.canaletas += q.totais.canaletas; x.total += q.totais.total; x.area = r4(x.area + q.totais.area);
    resumo.set(q.bloco, x);
  }
  const ac = new Map<string, { aco: string; phi: number; comprimento: number; peso: number }>();
  for (const p of saida) for (const x of p.aco?.barras ?? []) {
    const e = ac.get(`${x.aco}|${x.phi}`) ?? { aco: x.aco, phi: x.phi, comprimento: 0, peso: 0 };
    e.comprimento += x.quant * x.comprimento; e.peso += x.peso; ac.set(`${x.aco}|${x.phi}`, e);
  }
  const resumoAco = [...ac.values()].sort((a, z) => a.aco.localeCompare(z.aco) || a.phi - z.phi);
  return { paredes: saida, desligamentos: desligamentosMuroPilar(b), vigasMuro: vigasSobreMuros(b, op), resumoBlocos: [...resumo.values()], resumoAco };
}

/**
 * Vigas com armadura opcional dispensada (opção "armar sempre" desligada): os erros do dimensionamento da viga deixam de
 * valer (a viga trabalha como cinta do muro), ficam os avisos e a nota da dispensa. Muda os resultados no lugar.
 */
export function aplicarDispensaVigasMuro(vigas: ResultadoViga[], vm: ResultadoVigaMuro[]): void {
  for (const m of vm) {
    if (!m.dispensada) continue;
    const r = vigas.find((x) => x.viga === m.viga);
    if (!r) continue;
    r.mensagens = r.mensagens.filter((x) => classificar(x).nivel !== 'erro');
    r.status = 'ok';
  }
}
