// Pilar com vigas em desnível (E5m, K1.12.4-19): nós intermediários do pilar nas cotas das vigas com `nivel` próprio que
// não se sobrepõem às do nível do pavimento, trechos do lance e comprimento de flambagem por trecho ("mesma metodologia
// para cada trecho em que o pilar fica dividido"). Função pura, sem React.
import { capaLaje } from './tiposLaje';
import { baseDoLance, flambagemLance } from './materiais';
import { opcoesEmUso, perfilDe } from './opcoes';
import { dimsSecao, lancesDoPilar, pavimentosDoGrupo, secaoNoLance, type BuildingModel, type Pilar, type Viga } from './types';
import { vigaTocaPilar } from './vigas';
import { dentroPoligono } from '../geom/faces';

type P = [number, number];

/** Desnível mínimo (m) para a viga contar como em desnível: abaixo disso ela está no nível do pavimento. */
export const DESNIVEL_TOL = 0.005;
/** Distância mínima (m) do nó intermediário às pontas do lance (abaixo dela a viga fica no nó da ponta, com aviso). */
export const DESNIVEL_PONTA = 0.02;

/** Nó intermediário de um pilar na cota de vigas em desnível de um pavimento. */
export interface NoDesnivel {
  pilar: string;
  /** Pavimento das vigas (o topo da laje de referência do desnível). */
  pavimento: string;
  /** Lance que contém o nó (o do pavimento, desnível negativo; o de cima, positivo). */
  lance: string;
  /** Desnível das vigas em relação ao topo do pavimento (m). */
  desnivel: number;
  /** Cota absoluta do nó (m) e altura a partir da base do lance. */
  cota: number; altura: number;
  vigas: string[];
  /** Maior altura das vigas do nó (ℓ0 do trecho de baixo). */
  hViga: number;
  /** Travamento do pilar no nó por direção [u, v]: viga com o eixo a menos de 45° da direção. */
  trava: [boolean, boolean];
}

export interface DesniveisObra {
  nos: NoDesnivel[];
  /** Vigas ligadas a pelo menos um nó intermediário: entram no pórtico na própria cota (as demais, no nível do pavimento). */
  vigas: Set<string>;
  avisos: string[];
}

export const chaveDesnivel = (pilar: string, pavimento: string, desnivel: number) => `${pilar}|${pavimento}|${Math.round(desnivel * 1000)}`;

function distSeg(p: P, a: P, z: P) {
  const dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** Direção (unitária) do trecho da viga mais próximo do ponto. */
function direcaoPerto(v: Viga, c: P): P {
  let best = Infinity, dir: P = [1, 0];
  for (let i = 0; i + 1 < v.pontos.length; i++) {
    const a = v.pontos[i], z = v.pontos[i + 1], d = distSeg(c, a, z);
    if (d < best) { best = d; const L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1; dir = [(z[0] - a[0]) / L, (z[1] - a[1]) / L]; }
  }
  return dir;
}

/** A viga entra no pórtico como viga em desnível (horizontal, sem plano, estrutural, não associada de viga comum)? */
const candidata = (v: Viga) => Math.abs(v.nivel ?? 0) >= DESNIVEL_TOL && !v.plano && v.estrutural !== false && !v.comumDe;

/**
 * Nós intermediários dos pilares da obra. Critério (padrão do programa de referência [a confirmar]): a viga em desnível
 * divide o pilar quando não se sobrepõe em altura às vigas (ou à laje) do nível do pavimento no pilar: desnível
 * negativo com |d| ≥ altura da viga mais alta do nível (ou espessura da laje que contém o pilar); positivo com d ≥ altura
 * da própria viga. Vigas que se sobrepõem ficam no nó do pavimento (comportamento anterior).
 */
export function desniveisDaObra(b: BuildingModel, ativo?: boolean): DesniveisObra {
  const out: DesniveisObra = { nos: [], vigas: new Set(), avisos: [] };
  const liga = ativo ?? !!opcoesEmUso(b.opcoes, perfilDe(b)).desnivelVigaPilar;
  if (!liga) return out;
  const cand = b.vigas.filter(candidata);
  if (!cand.length) return out;
  const porChave = new Map<string, NoDesnivel>();
  for (const v of cand) {
    const d = v.nivel!;
    for (const pav of pavimentosDoGrupo(b, v.grupo)) {
      for (const p of b.pilares) {
        const ls = lancesDoPilar(b, p), k = ls.findIndex((x) => x.id === pav.id);
        if (k < 0 || !vigaTocaPilar(v, p, pav.id)) continue;
        const c: P = [p.x, p.y];
        // elementos do nível do pavimento no pilar
        const doNivel = b.vigas.filter((x) => x.grupo === v.grupo && x.estrutural !== false && !candidata(x) && vigaTocaPilar(x, p, pav.id));
        const hLaje = Math.max(0, ...b.lajes.filter((x) => x.grupo === v.grupo && Math.abs(x.nivel ?? 0) < DESNIVEL_TOL && dentroPoligono(c, x.contorno)).map((x) => capaLaje(b, x.tipo)));
        const hRef = doNivel.length ? Math.max(...doNivel.map((x) => x.secao.h)) : hLaje;
        if (d < 0 ? -d < hRef - 1e-6 : d < v.secao.h - 1e-6) continue; // sobreposta: fica no nó do pavimento
        const lance = d < 0 ? ls[k] : ls[k + 1];
        if (!lance) { out.avisos.push(`Desnível: ${v.nome} acima do topo de ${p.nome} em ${pav.nome} (o pilar morre no pavimento); a viga fica ligada ao nó do topo por trecho rígido vertical.`); continue; }
        const base = baseDoLance(b, p, lance.id), cota = pav.cota + d, altura = cota - base, H = lance.cota - base;
        if (altura < DESNIVEL_PONTA || altura > H - DESNIVEL_PONTA) { out.avisos.push(`Desnível: ${v.nome} em ${pav.nome} fora do lance de ${p.nome} (cota ${cota.toFixed(2)} m); a viga fica ligada ao nó do pavimento por trecho rígido vertical.`); continue; }
        const key = chaveDesnivel(p.id, pav.id, d);
        let no = porChave.get(key);
        if (!no) { no = { pilar: p.id, pavimento: pav.id, lance: lance.id, desnivel: d, cota, altura, vigas: [], hViga: 0, trava: [false, false] }; porChave.set(key, no); out.nos.push(no); }
        no.vigas.push(v.id);
        no.hViga = Math.max(no.hViga, v.secao.h);
        const a = (p.angulo * Math.PI) / 180, u: P = [Math.cos(a), Math.sin(a)], w: P = [-Math.sin(a), Math.cos(a)], dir = direcaoPerto(v, c);
        if (Math.abs(dir[0] * u[0] + dir[1] * u[1]) >= Math.SQRT1_2 - 1e-9) no.trava[0] = true;
        if (Math.abs(dir[0] * w[0] + dir[1] * w[1]) >= Math.SQRT1_2 - 1e-9) no.trava[1] = true;
        out.vigas.add(v.id);
      }
    }
  }
  return out;
}

/** Trecho de um lance entre dois nós do pilar (alturas a partir da base do lance, m). */
export interface TrechoPilar {
  de: number; ate: number;
  /** Nó intermediário no topo do trecho (ausente = topo do lance). */
  topo?: NoDesnivel;
}

/** Nós intermediários do lance, de baixo para cima (nós a menos de 1 cm um do outro: o primeiro vale). */
export function nosDoLance(des: DesniveisObra, pilar: string, lance: string): NoDesnivel[] {
  const ns = des.nos.filter((n) => n.pilar === pilar && n.lance === lance).sort((a, z) => a.altura - z.altura);
  return ns.filter((n, i) => i === 0 || n.altura - ns[i - 1].altura >= 0.01);
}

/** Nó intermediário que representa o nó dado (o primeiro a menos de 1 cm, na mesma ordem de `nosDoLance`). */
export function representante(des: DesniveisObra, n: NoDesnivel): NoDesnivel {
  const ns = nosDoLance(des, n.pilar, n.lance);
  let r = ns[0];
  for (const x of ns) if (x.altura <= n.altura + 1e-9) r = x;
  return r ?? n;
}

/** Trechos do lance (um só quando não há vigas em desnível). */
export function trechosDoLance(b: BuildingModel, p: Pilar, lance: string, des: DesniveisObra): TrechoPilar[] {
  const H = (lancesDoPilar(b, p).find((x) => x.id === lance)?.cota ?? 0) - baseDoLance(b, p, lance);
  const ns = nosDoLance(des, p.id, lance), out: TrechoPilar[] = [];
  let de = 0;
  for (const n of ns) { out.push({ de, ate: n.altura, topo: n }); de = n.altura; }
  out.push({ de, ate: H });
  return out;
}

/**
 * Comprimento de flambagem do trecho k do lance (NBR 6118, 15.6, a mesma regra do lance): por direção, o trecho vai do
 * nó travado de baixo ao nó travado de cima (nó intermediário trava só na direção das suas vigas; base e topo do lance
 * contam como travados, como no lance inteiro); ℓe = mín(ℓ0 + h; ℓ) × α, ℓ0 = ℓ − altura da viga mais alta do nó de
 * cima (no topo do lance, só as vigas do nível do pavimento). Lance desligado sem nó que trave a direção: vale o do lance.
 */
export function flambagemTrecho(b: BuildingModel, p: Pilar, lance: string, k: number, des: DesniveisObra) {
  const fl = flambagemLance(b, p, lance), trs = trechosDoLance(b, p, lance, des);
  if (trs.length === 1) return { ...fl, de: 0, ate: fl.l, trechos: 1 };
  const [w, h] = dimsSecao(secaoNoLance(p, lance));
  // ℓ0 do topo do lance: só as vigas do nível do pavimento (as em desnível chegam aos nós intermediários)
  const ligadas = new Set(des.nos.filter((n) => n.pilar === p.id).flatMap((n) => n.vigas));
  const ps = b.pavimentos.find((x) => x.id === lance);
  const vigasTopo = ps ? b.vigas.filter((v) => v.grupo === ps.grupo && !ligadas.has(v.id) && v.estrutural !== false && vigaTocaPilar(v, p, lance)) : [];
  const c: P = [p.x, p.y];
  const hLaje = ps ? Math.max(0, ...b.lajes.filter((x) => x.grupo === ps.grupo && dentroPoligono(c, x.contorno)).map((x) => capaLaje(b, x.tipo))) : 0;
  const hTopoLance = vigasTopo.length ? Math.max(...vigasTopo.map((v) => v.secao.h)) : hLaje;
  const le: [number, number] = [fl.leU, fl.leV], ls: [number, number] = [fl.l, fl.l], des2: [number, number] = [fl.desligados[0], fl.desligados[1]];
  const alfa = [fl.aU, fl.aV], dim = [w, h];
  for (const d of [0, 1] as const) {
    let s = k, e = k;
    while (s > 0 && !trs[s - 1].topo!.trava[d]) s--;
    while (e < trs.length - 1 && !trs[e].topo!.trava[d]) e++;
    if (s === 0 && e === trs.length - 1 && fl.desligados[d] > 1) continue; // nenhum nó trava e o lance soma-se a outros: vale o do lance
    const l = trs[e].ate - trs[s].de, hT = trs[e].topo?.hViga ?? hTopoLance, l0 = Math.max(0, l - hT);
    let x = Math.min(l0 + dim[d], l) * alfa[d];
    if (fl.apoio !== undefined && fl.apoio > trs[s].de && fl.apoio < trs[e].ate) {
      const ap = p.apoiosIntermediarios?.find((a) => a.pavimento === lance && Math.abs(a.altura - fl.apoio!) < 1e-9);
      if (!ap?.direcao || ap.direcao === (d === 0 ? 'u' : 'v')) x = Math.min(x, Math.max(fl.apoio - trs[s].de, trs[e].ate - fl.apoio) * alfa[d]);
    }
    le[d] = x; ls[d] = l; des2[d] = 1;
  }
  const tr = trs[k];
  return { ...fl, l: Math.max(ls[0], ls[1]), leU: le[0], leV: le[1], desligados: des2, de: tr.de, ate: tr.ate, trechos: trs.length };
}
