// Relatórios do edifício (frente R7g): taxa As/Ac dos pilares, diagrama de capacidade resistente das vigas pela armadura
// colocada, arquivo de intercâmbio da armadura (JSON e CSV de barras), quantitativos por pano e por viga com blocos de
// enchimento e índices por m², listagem geral (coordenadas, dimensões, vínculos e pesos) e forças de vento por pavimento.
// Funções puras sobre o modelo e o dimensionamento; nenhuma muda o cálculo.
import { barArea, momentCapacity, type Bar } from '../concrete';
import type { AnaliseEdificio } from './analitico';
import type { DetalheViga } from './detalhamento';
import type { Dimensionamento, ResultadoPilar, ResultadoViga } from './dimensionamento';
import { acoDe, cobrimentoViga, concretoDe, fckDe, gamas } from './materiais';
import { areaLaje, propriedadesLaje } from './lajes';
import { ehNervurada, espessuraConcreto, geometriaNervurada } from './tiposLaje';
import {
  centroPilar, comprimentoPolilinha, dimsSecao, lancesDoPilar, pavimentosDoGrupo, pavimentosOrdenados, peDireito, secaoNoLance,
  type BuildingModel, type Pilar, type Viga,
} from './types';

const r2 = (x: number, c = 2) => +x.toFixed(c);

// ---------------------------------------------------------------- taxa As/Ac dos pilares (C4.45)

export interface TaxaPilar { pilar: string; nome: string; pavimento: string; secao: string; As: number; Ac: number; taxa: number }

/** Área da seção (cm²) do pilar no lance do resultado. */
function areaSecaoCm2(p: Pilar, pavimentoId: string): number {
  const s = secaoNoLance(p, pavimentoId), [w, h] = dimsSecao(s);
  return (s.tipo === 'circ' ? (Math.PI * w * w) / 4 : w * h) * 1e4;
}

/** Taxa geométrica As/Ac (%) por lance de pilar: As do resultado (m²) sobre a seção bruta. */
export function taxasPilares(b: BuildingModel, dim: Pick<Dimensionamento, 'pilares'>): TaxaPilar[] {
  const out: TaxaPilar[] = [];
  for (const r of dim.pilares) {
    const p = b.pilares.find((x) => x.id === r.pilar);
    if (!p || !(r.As > 0)) continue;
    const lance = lancesDoPilar(b, p).find((l) => l.id === r.pavimentoId) ?? lancesDoPilar(b, p).find((l) => l.nome === r.pavimento);
    if (!lance) continue;
    const Ac = areaSecaoCm2(p, lance.id), As = r.As * 1e4;
    out.push({ pilar: r.pilar, nome: r.nome, pavimento: r.pavimento, secao: r.secao, As: r2(As), Ac: r2(Ac), taxa: r2((As / Ac) * 100) });
  }
  return out;
}
/** Taxa As/Ac (%) de um resultado de pilar; null sem armadura calculada. */
export const taxaDoPilar = (b: BuildingModel, r: ResultadoPilar): number | null => taxasPilares(b, { pilares: [r] })[0]?.taxa ?? null;

// ---------------------------------------------------------------- capacidade resistente das vigas (K1.11.46)

export interface PontoCapacidade { s: number; MRdPos: number; MRdNeg: number }

/**
 * Momento resistente de projeto (kN·m) positivo e negativo ao longo da viga, a cada `passo` m, pela armadura colocada
 * no detalhamento: barras inferiores, superiores e de montagem, cada uma efetiva a partir do extremo (com gancho ou na
 * ponta da viga) ou depois de lb,mín além do corte (máx(0,3·lb; 10φ; 10 cm)). Seção retangular, Nd = 0, parábola-retângulo.
 */
export function capacidadeViga(b: BuildingModel, v: Viga, det: DetalheViga, r: Pick<ResultadoViga, 'arranjo'>, passo = 0.25): PontoCapacidade[] {
  const c = concretoDe(b, 'viga'), aPos = acoDe(b, 'vigaPos'), aNeg = acoDe(b, 'vigaNeg');
  const cob = cobrimentoViga(b, v.cobrimento), bw = v.secao.b, h = v.secao.h, phiT = (r.arranjo.estribo?.phi ?? 5) / 1000;
  const [e0, e1] = det.extensao, c0 = e0 + cob.lat, c1 = e1 - cob.lat;
  const lbMin = (lb: number, phi: number) => Math.max(0.3 * lb, (10 * phi) / 1000, 0.1);
  const out: PontoCapacidade[] = [];
  const cache = new Map<string, number>();
  const n = Math.max(1, Math.round((e1 - e0) / passo));
  for (let i = 0; i <= n; i++) {
    const s = Math.min(e1, e0 + i * passo);
    // armadura efetiva por face e bitola neste ponto
    const efetivas = (face: 'inf' | 'sup') => {
      const g = new Map<number, number>();
      for (const x of det.barras) {
        if (x.face !== face) continue;
        const sh = lbMin(face === 'inf' ? det.lb.inf : det.lb.sup, x.phi);
        const a = x.ganchos[0] || x.s0 <= c0 + 1e-6 ? x.s0 : x.s0 + sh, z = x.ganchos[1] || x.s1 >= c1 - 1e-6 ? x.s1 : x.s1 - sh;
        if (s >= a - 1e-9 && s <= z + 1e-9) g.set(x.phi, (g.get(x.phi) ?? 0) + x.n);
      }
      return [...g.entries()].sort((p, q) => q[0] - p[0]);
    };
    const barrasDa = (grupos: [number, number][], doTopo: boolean): Bar[] => {
      // camadas a partir da face tracionada; n por camada pela largura útil
      const bars: Bar[] = [];
      let k0 = 0;
      for (const [phi, nb] of grupos) {
        const f = phi / 1000, esp = Math.max(0.02, f), nl = Math.max(1, Math.floor((bw - 2 * cob.lat - 2 * phiT + esp) / (f + esp)));
        const camadas = Math.ceil(nb / nl), cobFace = doTopo ? cob.sup : cob.inf;
        for (let k = 0; k < camadas; k++) {
          const nk = Math.min(nl, nb - k * nl), y = cobFace + phiT + f / 2 + (k0 + k) * (f + esp);
          bars.push({ y: doTopo ? y : h - y, A: nk * barArea(phi) });
        }
        k0 += camadas;
      }
      return bars;
    };
    const inf = efetivas('inf'), sup = efetivas('sup');
    const mrd = (trac: [number, number][], comp: [number, number][], positivo: boolean, fyd: number) => {
      if (!trac.length) return 0;
      const key = `${positivo}|${trac.join(',')}|${comp.join(',')}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      // momento positivo: tração embaixo; negativo: seção espelhada (as barras superiores passam a ser as de baixo)
      const bars = positivo ? [...barrasDa(trac, false), ...barrasDa(comp, true)] : [...barrasDa(trac, true), ...barrasDa(comp, false)].map((q) => ({ y: h - q.y, A: q.A }));
      const m = momentCapacity(bw, h, bars, 0, c, fyd);
      const val = m === null ? 0 : m * 1000;
      cache.set(key, val);
      return val;
    };
    out.push({ s: r2(s, 3), MRdPos: r2(mrd(inf, sup, true, aPos.fyd), 1), MRdNeg: r2(mrd(sup, inf, false, aNeg.fyd), 1) });
  }
  return out;
}

// ---------------------------------------------------------------- arquivo de intercâmbio da armadura (K1.11.46)

export const FORMATO_INTERCAMBIO = 'statikos-armadura';

export interface BarraIntercambio {
  /** Elemento ('viga' | 'pilar' | 'laje'), id e nome. */
  elemento: 'viga' | 'pilar' | 'laje'; id: string; nome: string;
  /** Posição (N1…), tipo (barra, estribo, grampo, reforço…), aço, bitola (mm), quantidade por pavimento, comprimento unitário (m) e repetições (pavimentos). */
  pos: string; tipo: string; aco: string; phi: number; quant: number; comprimento: number; repeticoes: number;
  /** Trecho ao longo do elemento (m) ou cotas, quando houver. */
  trecho?: [number, number];
  /** Espaçamento (m) quando distribuída. */
  s?: number;
}
export interface Intercambio { formato: typeof FORMATO_INTERCAMBIO; versao: 1; obra: string; barras: BarraIntercambio[] }

/** Barras de todos os elementos detalhados, em formato próprio (comprimentos em m, bitolas em mm). */
export function intercambioArmadura(b: BuildingModel, dim: Dimensionamento): Intercambio {
  const barras: BarraIntercambio[] = [];
  const acoFace = (face: string) => (face === 'inf' ? acoDe(b, 'vigaPos') : acoDe(b, 'vigaNeg')).aco;
  for (const d of dim.detalhes ?? []) {
    for (const x of d.barras) barras.push({ elemento: 'viga', id: d.viga, nome: d.nome, pos: x.pos, tipo: x.tipo, aco: acoFace(x.face), phi: x.phi, quant: x.n, comprimento: r2(x.comprimento), repeticoes: d.repeticoes, trecho: [r2(x.s0), r2(x.s1)] });
    d.estribos.forEach((z, i) => barras.push({ elemento: 'viga', id: d.viga, nome: d.nome, pos: `E${i + 1}`, tipo: z.u ? 'estribo em U' : 'estribo', aco: acoDe(b, 'vigaEstribo').aco, phi: z.phi, quant: z.n, comprimento: r2(z.comprimento), repeticoes: d.repeticoes, trecho: [r2(z.s0), r2(z.s1)], s: z.s }));
  }
  for (const d of dim.detalhesPilares ?? []) {
    for (const x of d.barras) barras.push({ elemento: 'pilar', id: d.pilar, nome: d.nome, pos: x.pos, tipo: x.tipo === 'arranque' ? 'arranque' : 'longitudinal', aco: acoDe(b, 'pilarLong').aco, phi: x.phi, quant: x.n, comprimento: r2(x.comprimento), repeticoes: 1, trecho: [r2(x.z0), r2(x.z1)] });
    for (const l of d.lances) {
      const e = l.estribos, aco = acoDe(b, 'pilarEstribo').aco;
      barras.push({ elemento: 'pilar', id: d.pilar, nome: d.nome, pos: `E ${l.nome}`, tipo: 'estribo', aco, phi: e.phi, quant: e.n, comprimento: r2(e.comprimento), repeticoes: 1, trecho: [r2(l.z0), r2(l.z1)], s: e.s });
      if (e.grampos > 0) barras.push({ elemento: 'pilar', id: d.pilar, nome: d.nome, pos: `G ${l.nome}`, tipo: 'grampo', aco, phi: e.phi, quant: e.n * e.grampos, comprimento: r2(e.comprimentoGrampo), repeticoes: 1, trecho: [r2(l.z0), r2(l.z1)], s: e.s });
    }
  }
  for (const d of dim.detalhesLajes ?? []) {
    for (const x of d.posicoes) barras.push({ elemento: 'laje', id: d.laje, nome: d.nome, pos: x.pos, tipo: x.tipo, aco: (x.face === 'inf' ? acoDe(b, 'lajeInf') : acoDe(b, 'lajeSup')).aco, phi: x.phi, quant: x.n, comprimento: r2(x.comprimento), repeticoes: d.repeticoes, ...(x.s > 0 ? { s: x.s } : {}) });
  }
  return { formato: FORMATO_INTERCAMBIO, versao: 1, obra: b.obra.nome || '', barras };
}

/** CSV (ponto e vírgula, vírgula decimal) das barras do intercâmbio, com o peso linear e total. */
export function intercambioCsv(i: Intercambio): string {
  const n = (x: number, c = 2) => x.toFixed(c).replace('.', ',');
  const lin = ['elemento;nome;posicao;tipo;aco;phi_mm;quantidade;comprimento_m;repeticoes;espacamento_m;trecho_ini;trecho_fim;peso_kg'];
  for (const x of i.barras) {
    const peso = x.quant * x.comprimento * x.repeticoes * barArea(x.phi) * 7850;
    lin.push([x.elemento, x.nome, x.pos, x.tipo, x.aco, n(x.phi, 1), String(x.quant), n(x.comprimento), String(x.repeticoes), x.s !== undefined ? n(x.s) : '', x.trecho ? n(x.trecho[0]) : '', x.trecho ? n(x.trecho[1]) : '', n(peso)].join(';'));
  }
  return lin.join('\n');
}

// ---------------------------------------------------------------- quantitativos por pano e por viga, blocos e índices (K1.11.47)

export interface QuantPano {
  laje: string; nome: string; grupo: string; pavimentos: number; tipo: string;
  /** Espessura equivalente (m), área (m²), volume de concreto e fôrma (por pavimento) e peso próprio (kN). */
  h: number; area: number; volume: number; forma: number; pesoProprio: number;
  /** Treliçadas: enchimento (EPS) em área, volume e número de peças de 1,00 m [a confirmar]. */
  enchimento?: { area: number; volume: number; pecas: number };
}
export interface QuantViga { viga: string; nome: string; grupo: string; pavimentos: number; L: number; b: number; h: number; volume: number; forma: number; peso: number }
export interface IndicesObra {
  /** Área construída (soma das lajes de todos os pavimentos, m²), concreto (m³), fôrma (m²) e aço (kg, com perdas). */
  area: number; concreto: number; forma: number; aco: number;
  /** Índices: kg/m², m³/m², m²/m² e kg/m³. */
  kgPorM2: number; m3PorM2: number; m2PorM2: number; kgPorM3: number;
  /** Aço vem do detalhamento (true) ou da estimativa por taxas (false). */
  acoDetalhado: boolean;
}
export interface QuantitativosDetalhados { panos: QuantPano[]; vigas: QuantViga[]; enchimento: { area: number; volume: number; pecas: number }; indices: IndicesObra }

/** Espessura equivalente de concreto (m) da laje (treliçada: capa + nervuras). */

export function quantitativosDetalhados(b: BuildingModel, dim: Pick<Dimensionamento, 'quantitativos' | 'resumoAcoVigas' | 'resumoAcoPilares' | 'resumoAcoLajes' | 'resumoAcoVigotas'>): QuantitativosDetalhados {
  const panos: QuantPano[] = b.lajes.map((l) => {
    const rep = Math.max(1, pavimentosDoGrupo(b, l.grupo).length), area = areaLaje(l), pr = propriedadesLaje(l.tipo, b), t = espessuraConcreto(b, l.tipo);
    let ench: QuantPano['enchimento'];
    if (ehNervurada(l.tipo)) {
      const k = geometriaNervurada(b, l.tipo), ae = (area * (k.intereixo - k.bw)) / k.intereixo;
      ench = { area: r2(ae), volume: r2(ae * k.hEnch, 3), pecas: Math.ceil(ae / (k.intereixo - k.bw) - 1e-9) };
    }
    return { laje: l.id, nome: l.nome, grupo: l.grupo, pavimentos: rep, tipo: pr.descricao, h: r2(t, 3), area: r2(area), volume: r2(area * t, 3), forma: r2(area), pesoProprio: r2(pr.pp * area, 1), ...(ench ? { enchimento: ench } : {}) };
  });
  const vigas: QuantViga[] = b.vigas.map((v) => {
    const rep = Math.max(1, pavimentosDoGrupo(b, v.grupo).length), L = comprimentoPolilinha(v.pontos);
    return { viga: v.id, nome: v.nome, grupo: v.grupo, pavimentos: rep, L: r2(L), b: v.secao.b, h: v.secao.h, volume: r2(v.secao.b * v.secao.h * L, 3), forma: r2((v.secao.b + 2 * v.secao.h) * L), peso: r2(25 * v.secao.b * v.secao.h * L, 1) };
  });
  const enchimento = panos.reduce((t, p) => ({ area: t.area + (p.enchimento?.area ?? 0) * p.pavimentos, volume: t.volume + (p.enchimento?.volume ?? 0) * p.pavimentos, pecas: t.pecas + (p.enchimento?.pecas ?? 0) * p.pavimentos }), { area: 0, volume: 0, pecas: 0 });
  const area = panos.reduce((t, p) => t + p.area * p.pavimentos, 0);
  const concreto = dim.quantitativos.reduce((t, q) => t + q.concreto.lajes + q.concreto.vigas + q.concreto.pilares, 0);
  const forma = dim.quantitativos.reduce((t, q) => t + q.forma.lajes + q.forma.vigas + q.forma.pilares, 0);
  const detalhado = !!(dim.resumoAcoVigas || dim.resumoAcoPilares || dim.resumoAcoLajes || dim.resumoAcoVigotas);
  const soma = (rs?: { pesoComPerdas: number }[]) => (rs ?? []).reduce((t, x) => t + x.pesoComPerdas, 0);
  const aco = detalhado ? soma(dim.resumoAcoVigas) + soma(dim.resumoAcoPilares) + soma(dim.resumoAcoLajes) + soma(dim.resumoAcoVigotas) : dim.quantitativos.reduce((t, q) => t + q.aco, 0);
  return {
    panos, vigas, enchimento: { area: r2(enchimento.area), volume: r2(enchimento.volume, 3), pecas: enchimento.pecas },
    indices: { area: r2(area), concreto: r2(concreto), forma: r2(forma), aco: r2(aco, 1), kgPorM2: area > 0 ? r2(aco / area, 2) : 0, m3PorM2: area > 0 ? r2(concreto / area, 3) : 0, m2PorM2: area > 0 ? r2(forma / area, 2) : 0, kgPorM3: concreto > 0 ? r2(aco / concreto, 1) : 0, acoDetalhado: detalhado },
  };
}

// ---------------------------------------------------------------- listagem geral (K1.11.44)

export interface ListagemPilar {
  id: string; nome: string; x: number; y: number; cx: number; cy: number; angulo: number; ajuste: string;
  nasce: string; morre: string; secoes: { pavimento: string; secao: string; b: number; h: number }[]; vinculo: string; engaste: string;
}
export interface ListagemLaje { id: string; nome: string; grupo: string; pavimentos: number; tipo: string; h: number; area: number; ppKNm2: number; revKNm2: number; qKNm2: number; pesoProprio: number; permanente: number; variavel: number }
export interface ListagemGeral {
  obra: { nome: string; cidade: string; profundidadeFundacao: number };
  materiais: { fck: number; aco: string; caa: string; gamaC: number; gamaS: number; gamaG: number; gamaQ: number };
  pavimentos: { id: string; nome: string; cota: number; altura: number; grupo: string; uso: string; gRev: number; q: number }[];
  pilares: ListagemPilar[]; lajes: ListagemLaje[];
  /** Peso próprio, permanente e variável de todas as lajes (kN), já com as repetições dos pavimentos. */
  totais: { pesoProprio: number; permanente: number; variavel: number };
}

export function listagemGeral(b: BuildingModel): ListagemGeral {
  const ps = pavimentosOrdenados(b), g = gamas(b);
  const nomePav = (id: string) => (id === 'fundacao' ? 'Fundação' : b.pavimentos.find((p) => p.id === id)?.nome ?? id);
  const pilares: ListagemPilar[] = b.pilares.map((p) => {
    const ls = lancesDoPilar(b, p), vb = p.vinculoBase;
    const [cx, cy] = centroPilar(p, p.secao);
    const vinculo = vb?.tipo === 'rotula' ? 'base rotulada' : vb?.tipo === 'molas' ? 'base sobre molas' : p.nasce === 'fundacao' ? 'engastado na fundação' : 'apoiado em elemento do pavimento';
    const eng = (p.engastes ?? []).map((e) => `${nomePav(e.pavimento)}: ${[e.base !== undefined && `base ${String(e.base).replace('.', ',')}`, e.topo !== undefined && `topo ${String(e.topo).replace('.', ',')}`].filter(Boolean).join(', ')}`).join('; ');
    return {
      id: p.id, nome: p.nome, x: r2(p.x, 3), y: r2(p.y, 3), cx: r2(cx, 3), cy: r2(cy, 3), angulo: p.angulo, ajuste: p.ajuste, nasce: nomePav(p.nasce), morre: nomePav(p.morre),
      secoes: ls.map((l) => { const s = secaoNoLance(p, l.id), [w, h] = dimsSecao(s); return { pavimento: l.nome, secao: s.tipo === 'circ' ? `ø${Math.round(s.d * 100)}` : `${Math.round(w * 100)}×${Math.round(h * 100)}`, b: w, h }; }),
      vinculo, engaste: eng || 'engaste pleno',
    };
  });
  const lajes: ListagemLaje[] = b.lajes.map((l) => {
    const gr = b.grupos.find((x) => x.id === l.grupo), rep = Math.max(1, pavimentosDoGrupo(b, l.grupo).length), area = areaLaje(l), pr = propriedadesLaje(l.tipo, b);
    const rev = gr?.gRev ?? 0, q = gr?.q ?? 0;
    return { id: l.id, nome: l.nome, grupo: gr?.nome ?? l.grupo, pavimentos: rep, tipo: pr.descricao, h: r2(pr.h, 3), area: r2(area), ppKNm2: r2(pr.pp), revKNm2: rev, qKNm2: q, pesoProprio: r2(pr.pp * area, 1), permanente: r2((pr.pp + rev) * area, 1), variavel: r2(q * area, 1) };
  });
  const tot = lajes.reduce((t, l) => ({ pesoProprio: t.pesoProprio + l.pesoProprio * l.pavimentos, permanente: t.permanente + l.permanente * l.pavimentos, variavel: t.variavel + l.variavel * l.pavimentos }), { pesoProprio: 0, permanente: 0, variavel: 0 });
  return {
    obra: { nome: b.obra.nome, cidade: b.obra.cidade ?? '', profundidadeFundacao: b.obra.profundidadeFundacao },
    materiais: { fck: fckDe(b, 'viga'), aco: b.norma.aco, caa: b.norma.caa, gamaC: g.c, gamaS: g.s, gamaG: g.g, gamaQ: g.q },
    pavimentos: ps.map((p) => { const gr = b.grupos.find((x) => x.id === p.grupo); return { id: p.id, nome: p.nome, cota: p.cota, altura: r2(peDireito(b, p.id), 3), grupo: gr?.nome ?? p.grupo, uso: gr?.uso ?? '', gRev: gr?.gRev ?? 0, q: gr?.q ?? 0 }; }),
    pilares, lajes, totais: { pesoProprio: r2(tot.pesoProprio, 1), permanente: r2(tot.permanente, 1), variavel: r2(tot.variavel, 1) },
  };
}

// ---------------------------------------------------------------- forças de vento por pavimento (K1.11.51)

export interface VentoPavimento { caso: string; direcao: number; forcas: { pavimento: string; zona: number; z: number; largura: number; vk: number; q: number; F: number; Mz: number }[]; total: number }

/** Forças de vento por caso, pavimento e zona (kN; momento de torção em kN·m). */
export function ventoPorPavimento(b: BuildingModel, an: Pick<AnaliseEdificio, 'vento'> | null): VentoPavimento[] {
  const nome = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  return (an?.vento?.casos ?? []).map((c) => ({
    caso: c.nome, direcao: c.direcao,
    forcas: c.forcas.map((f) => ({ pavimento: nome(f.pavimento), zona: f.zona + 1, z: r2(f.z), largura: r2(f.largura), vk: r2(f.vk), q: r2(f.q, 3), F: r2(f.F, 1), Mz: r2(f.Mz, 1) })),
    total: r2(c.forcas.reduce((t, f) => t + f.F, 0), 1),
  }));
}
