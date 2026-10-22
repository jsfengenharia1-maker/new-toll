// Pranchas de fundação (FU5): locação e planta de cargas (uma por nível de fundação), detalhamento das sapatas, dos
// blocos sobre estacas, dos tubulões e das vigas de fundação, com os arranques dos pilares na mesma folha, e a folha
// de quantitativos (concreto, forma, aço e estacas). Infraestrutura da R5 (`armacao.ts`): posições por folha, tabela
// de aço, resumo com perdas, paginação e carimbo. Siglas das folhas de referência: SFN (fundação indireta: blocos e
// tubulões) e SFS (direta: sapatas); mista = SFM [a confirmar].
import type { AnaliseEdificio } from '../building/analitico';
import type { Dimensionamento } from '../building/dimensionamento';
import { cotaTerreno, parametrosFundacao, secaoBase, type ResultadoFundacao } from '../building/fundacao';
import { acoDe, cobrimentoFundacao, fckDe } from '../building/materiais';
import { centroPilar, dimsSecao, secaoNoLance, type BuildingModel, type Pilar, type TipoFundacao } from '../building/types';
import { geometriaVF, type ResultadoVigaFundacao } from '../building/vigasFundacao';
import { cargasDosPilares } from './locacao';
import { montarPranchasBaseElastica } from './fundacaoRadier';
import { agruparCorridas, desenharCorrida, montarPranchaCorridas } from './fundacaoCorrida';
import type { OpcoesArmacao } from './armacaoVigas';
import {
  Chaves, Posicoes, acoDaFolha, areaArmacao, bloco, capacidadeTabela, cfgArmacao, cmInt, empacotar, formatoArmacao, montarFolha, mover, nf, notas, ordemNome, perdasDe,
  plantaNaFolha, resumoAco, tabelaAco, type Bloco, type BlocoTabela,
} from './armacao';
import {
  blocoDe, desenharArranque, desenharBloco, desenharLegendaBloco, desenharSapata, desenharTubulao, desenharViga, estacasDe, pilaresLocais, sapataDe, titulo, tubulaoDe,
  type Ctx, type GrupoArranque,
} from './fundacaoDetalhe';
import { caixa, eixosECotas, type AcoPrancha, type LinhaTabelaAco, type P, type Prancha, type Prim } from './prancha';

const cm = (v: number) => String(Math.round(v * 100));
/** Ângulo (graus) de um texto ao longo de uma direção, sempre legível (−90 a 90). */
const anguloLegivel = (dx: number, dy: number) => { let a = (Math.atan2(dy, dx) * 180) / Math.PI; if (a > 90) a -= 180; if (a <= -90) a += 180; return a; };

// ---------------- siglas e títulos ----------------

/** Sigla pelo conjunto de tipos: só sapatas = SFS (direta); só blocos e/ou tubulões = SFN (indireta/profunda); misto = SFM [a confirmar]. */
export function siglaFundacao(tipos: Iterable<TipoFundacao>): string {
  const t = new Set(tipos), direta = t.has('sapata'), profunda = t.has('bloco') || t.has('tubulao');
  return direta && profunda ? 'SFM' : direta ? 'SFS' : 'SFN';
}
const NOME_SIGLA: Record<string, string> = { SFS: 'FUNDAÇÃO DIRETA', SFN: 'FUNDAÇÃO INDIRETA', SFM: 'FUNDAÇÕES' };

// ---------------- grupos de elementos iguais ----------------

export interface GrupoFund { tipo: TipoFundacao; els: ResultadoFundacao[]; chave: string }

const c1 = (v: number) => Math.round(v * 100);
/** Assinatura geométrica e de armadura (ao cm) de um elemento calculado; null quando o cálculo não gerou desenho. */
export function assinatura(r: ResultadoFundacao): string | null {
  if (r.tipo === 'sapata') {
    const f = sapataDe(r);
    if (!f) return null;
    const bars = (d: { bars: { phi: number; n: number; spacing: number } | null; top?: { needed: boolean; bars: { phi: number; n: number } | null } }) => [d.bars && [d.bars.phi, d.bars.n, c1(d.bars.spacing)], d.top?.needed && d.top.bars && [d.top.bars.phi, d.top.bars.n]];
    return JSON.stringify(['S', c1(f.A), c1(f.B), c1(f.h), c1(f.h0), f.colOffset.map(c1), c1(r.ap), c1(r.bp), bars(f.flex.x), bars(f.flex.y), !!f.simples, !!f.constH, f.grupo ? f.grupo.cols.map((q) => [c1(q.x), c1(q.y), c1(q.ap), c1(q.bp)]) : null]);
  }
  if (r.tipo === 'bloco') {
    const cap = blocoDe(r), est = estacasDe(r);
    if (!cap || !est) return null;
    const bs = (x?: { phi: number; n: number } | null) => (x ? [x.phi, x.n] : null);
    return JSON.stringify(['B', c1(cap.lx), c1(cap.ly), c1(cap.h), c1(est.D), est.coords.map((q) => [c1(q[0]), c1(q[1])]), cap.ties.map((t) => [t.a, t.b, bs(t.bars)]),
      bs(cap.mesh?.x.bars), bs(cap.mesh?.y.bars), bs(cap.top?.bars), bs(cap.skin?.bars), cap.stirrups ? [cap.stirrups.phi, c1(cap.stirrups.s)] : null,
      pilaresLocais(r).map((q) => [c1(q.x), c1(q.y), c1(q.ap), c1(q.bp)]), est.L ?? null]);
  }
  const t = tubulaoDe(r);
  return t ? JSON.stringify(['T', c1(t.Df), c1(t.Db), c1(t.Hcone), c1(t.rodape), c1(t.depth), c1(r.ap), c1(r.bp)]) : null;
}

/** Elementos iguais (mesmo tipo, geometria e armadura) agrupados, na ordem dos nomes. */
export function agruparFundacoes(rs: ResultadoFundacao[]): { grupos: GrupoFund[]; semDesenho: ResultadoFundacao[] } {
  const m = new Map<string, GrupoFund>(), semDesenho: ResultadoFundacao[] = [];
  for (const r of [...rs].sort((a, z) => ordemNome(a.nome, z.nome))) {
    const chave = assinatura(r);
    if (!chave) { semDesenho.push(r); continue; }
    const g = m.get(chave);
    if (g) g.els.push(r); else m.set(chave, { tipo: r.tipo, els: [r], chave });
  }
  return { grupos: [...m.values()].sort((a, z) => ordemNome(a.els[0].nome, z.els[0].nome)), semDesenho };
}

// ---------------- quantidades ----------------

/** Área de forma (m²) de um elemento: laterais (e inclinadas na sapata); tubulão escavado sem forma [a confirmar]. */
export function formaDe(r: ResultadoFundacao): number {
  if (r.tipo === 'sapata') {
    const f = sapataDe(r);
    if (!f) return 0;
    if (f.simples || f.constH || f.h0 >= f.h - 1e-9) return 2 * (f.A + f.B) * f.h;
    const slB = Math.hypot((f.B - r.bp) / 2, f.h - f.h0), slA = Math.hypot((f.A - r.ap) / 2, f.h - f.h0);
    return 2 * (f.A + f.B) * f.h0 + (f.A + r.ap) * slB + (f.B + r.bp) * slA;
  }
  if (r.tipo === 'bloco') { const cap = blocoDe(r); return cap ? 2 * (cap.lx + cap.ly) * cap.h : 0; }
  return 0;
}
const formaViga = (v: ResultadoVigaFundacao) => (v.bAdot * v.hAdot > 0 ? (2 * v.hAdot * v.volume) / (v.bAdot * v.hAdot) : 0);

export interface LinhaQuantitativo { nomes: string[]; tipo: string; quant: number; concreto: number; forma: number; aco: number }

// ---------------- folhas de detalhamento ----------------

interface DefDesenho { nome: string; elementos: string[]; desenhar: (c: Ctx) => Prim[]; escala?: number }
interface ResultadoFolhas { pranchas: Prancha[]; aco: LinhaTabelaAco[] }

const ctxDe = (b: BuildingModel, posDe: Ctx['posDe']): Ctx => ({ b, posDe, escala: cfgArmacao(b).escalaFundacao, escalaLeg: 25, escalaSecao: cfgArmacao(b).escalaSecao });

/** Paginação dos desenhos em folhas; cada folha tem a tabela de aço e o resumo com perdas. */
function folhasDeDesenhos(b: BuildingModel, o: OpcoesArmacao & { sigla: string; conteudo: string; titulo: string; notas: BlocoTabela; defs: DefDesenho[]; legenda: string; concretoDe: (nomes: string[]) => number; formaDe: (nomes: string[]) => number }): ResultadoFolhas {
  const cfg = cfgArmacao(b), perdas = perdasDe(b), fck = fckDe(b, 'fundacao');
  if (!o.defs.length) return { pranchas: [], aco: [] };
  const blocos: Bloco[] = o.defs.map((d) => { const ch = new Chaves(); return bloco(d.desenhar(ctxDe(b, (k, a, p, cc) => ch.pos(k, a, p, cc))), ch.s, d.nome); });
  const { formato, avisos } = formatoArmacao(cfg.formato, blocos);
  const area = areaArmacao(formato);
  const cap = capacidadeTabela(formato, 64, [o.notas], 8);
  const col = empacotar(blocos, area.x1 - area.x0, area.y1 - area.y0, cap);
  const nFolhas = Math.max(0, ...col.map((c) => c.folha)) + 1;
  const out: Prancha[] = [], todas: LinhaTabelaAco[] = [];
  for (let f = 0; f < nFolhas; f++) {
    const idx = col.map((c, i) => (c.folha === f ? i : -1)).filter((i) => i >= 0);
    const reg = new Posicoes(), desenho: Prim[] = [];
    for (const i of idx) desenho.push(...mover(bloco(o.defs[i].desenhar(ctxDe(b, (k, a, p, cc, q) => reg.pos(k, a, p, cc, q))), new Set(), '').prims, area.x0 + col[i].x, area.y1 - col[i].y));
    const nomes = idx.flatMap((i) => o.defs[i].elementos);
    const aco = acoDaFolha(reg.tabela, perdas, o.concretoDe(nomes), o.formaDe(nomes));
    todas.push(...reg.tabela);
    const suf = nFolhas > 1 ? ` (${f + 1}/${nFolhas})` : '';
    out.push(montarFolha({
      b, formato, tipo: 'fundacao', sigla: o.sigla, titulo: `${o.titulo}${suf}`, conteudo: `${o.conteudo}${suf}`, escala: 'INDICADA', escalaNum: cfg.escalaFundacao, carimbo: o.carimbo,
      desenho, tabelas: [o.notas, tabelaAco(aco.tabela), resumoAco(aco, fck)], legenda: o.legenda, avisos: f === 0 ? avisos : [], aco, elementos: nomes,
    }));
  }
  return { pranchas: out, aco: todas };
}

/** Grupos de arranque: pilares dos elementos com o mesmo primeiro lance, arranjo, estribos e cota de base. */
export function gruposDeArranque(b: BuildingModel, dim: Dimensionamento, rs: ResultadoFundacao[]): GrupoArranque[] {
  const m = new Map<string, GrupoArranque>();
  for (const r of rs) for (const id of r.pilarIds) {
    const p = b.pilares.find((x) => x.id === id), det = dim.detalhesPilares?.find((d) => d.pilar === id);
    if (!p || !det || !det.lances.length) continue;
    const l0 = det.lances[0], res = dim.pilares.find((x) => x.pilar === id && x.pavimentoId === l0.pavimento);
    const bar = det.barras.find((x) => x.tipo === 'longitudinal' && x.lances.includes(l0.pavimento));
    const chave = JSON.stringify([JSON.stringify(secaoNoLance(p, l0.pavimento)), res?.arranjo, l0.estribos.phi, cmInt(l0.estribos.s), bar && [bar.n, bar.phi], cmInt(r.cota), cmInt(l0.z1)]);
    const g = m.get(chave);
    if (g) g.pilares.push(p); else m.set(chave, { pilares: [p], det, res, zBase: r.cota });
  }
  return [...m.values()].map((g) => ({ ...g, pilares: g.pilares.sort((a, z) => ordemNome(a.nome, z.nome)) })).sort((a, z) => ordemNome(a.pilares[0].nome, z.pilares[0].nome));
}

const nomesDe = (g: { els: { nome: string }[] }) => g.els.map((e) => e.nome);

function notasDetalhe(b: BuildingModel, extra: string[]): BlocoTabela {
  const cob = cobrimentoFundacao(b), fck = fckDe(b, 'fundacao');
  return notas([
    'Medidas em cm; bitolas (φ) em mm; níveis em m.',
    `Concreto C${fck} (fck = ${fck} MPa); aço ${acoDe(b, 'fundacao').aco}. Cobrimento nominal ${nf(cob * 100, 1)} cm (contra o solo; CAA ${b.norma.caa}).`,
    'Quantidades de elementos iguais: "3×5" = 3 elementos × 5 barras. Posições (Nk) numeradas por folha.',
    ...extra,
    'Aço das esperas dos pilares (arranques): nas pranchas de pilares, sem repetir nas quantidades.',
  ], 'NOTAS');
}

// ---------------- locação e planta de cargas ----------------

const secTxt = (b: BuildingModel, p: Pilar) => { const s = secaoBase(b, p); return s.tipo === 'ret' ? `${cm(s.b)}×${cm(s.h)}` : `ø${cm(s.d)}`; };

function rotuloElemento(b: BuildingModel, r: ResultadoFundacao): string[] {
  const ps = r.pilares.join('+');
  const sec = r.pilarIds.length === 1 ? ` / ${secTxt(b, b.pilares.find((p) => p.id === r.pilarIds[0])!)} cm` : '';
  if (r.tipo === 'sapata') { const f = sapataDe(r); return f ? [`${ps}${sec}`, `h0 = ${cm(f.h0)} cm`, `h1 = ${cm(f.h - f.h0)} cm`, `df = ${cm(r.profundidade)} cm`] : [ps]; }
  if (r.tipo === 'bloco') { const cap = blocoDe(r), est = estacasDe(r); return cap && est ? [`${ps}${sec}`, `ha = 0 cm`, `hb = ${cm(cap.h)} cm`, `${est.coords.length}×ø${cm(est.D)}`] : [ps]; }
  const t = tubulaoDe(r);
  return t ? [`${ps}${sec}`, `øf = ${cm(t.Df)} cm`, `øb = ${cm(t.Db)} cm`, `H = ${cm(t.H)} cm`] : [ps];
}

/** Notas da locação: terreno, estacas, método e recomendação de sondagem. */
function notasLocacao(b: BuildingModel, rs: ResultadoFundacao[]): string[] {
  const P = parametrosFundacao(b), t = b.fundacao?.terreno;
  const sig = [...new Set(rs.filter((r) => r.sigmaAdm).map((r) => nf(r.sigmaAdm! / 1000, 2)))];
  const est = [...new Set(rs.filter((r) => r.tipo === 'bloco').map((r) => r.dims.estaca).filter(Boolean))];
  const out = [
    'Medidas em cm; cargas em kN e kN·m (eixos globais); características = combinação rara de maior N; de cálculo = ELU de maior Nd.',
    `Cota do terreno ${nf(cotaTerreno(b))} m; assentamento na cota indicada de cada elemento; df = profundidade abaixo do terreno.`,
  ];
  if (rs.some((r) => r.tipo !== 'bloco')) out.push(`Sapatas e tubulões: σadm ${sig.length ? `${sig.join(' / ')} MPa` : 'estimada pelo SPT'}${t?.sigmaModo === 'sondagem' ? ' (estimada pelo SPT: N̄/50 nas sapatas e N̄/30 nos tubulões [a confirmar])' : ''}; sapatas por ${P.ftMethod === 'bielas' ? 'bielas' : 'flexão CEB-70'}.`);
  if (est.length) out.push(`Estacas: ${est.join(', ')}; blocos rígidos por bielas e tirantes (Blévot) [a confirmar].`);
  out.push('Recalcular a fundação com a sondagem real da obra e o parecer geotécnico antes da execução.');
  return out;
}

/** Pontos das estacas no sistema global (m). */
function estacasGlobais(r: ResultadoFundacao): { c: P; D: number }[] {
  const est = estacasDe(r);
  if (!est) return [];
  const a = (r.angulo * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  return est.coords.map(([x, y]) => ({ c: [r.centro[0] + x * co - y * si, r.centro[1] + x * si + y * co] as P, D: est.D }));
}

export function montarLocacaoFundacao(b: BuildingModel, an: AnaliseEdificio | null, dim: Dimensionamento, nivelCota: number, rs: ResultadoFundacao[], o: OpcoesArmacao & { sigla: string }): Prancha | null {
  const els = rs.filter((r) => r.contorno.length);
  if (!els.length) return null;
  const cfg = { escala: cfgArmacao(b).escalaLocacao || b.prancha?.escala || 0, formato: b.prancha?.formato ?? 'auto' };
  const vigas = (dim.vigasFundacao ?? []).filter((v) => rs.some((r) => r.nome === v.ini || r.nome === v.fim) || rs.some((r) => r.pilares.includes(v.ini) || r.pilares.includes(v.fim)));
  const faixa = (v: ResultadoVigaFundacao): P[] | null => {
    const vm = b.fundacao?.vigas?.find((x) => x.id === v.id), g = vm && geometriaVF(b, vm);
    if (!g || g.erro) return null;
    const nx = -g.u[1] * (v.bAdot / 2), ny = g.u[0] * (v.bAdot / 2);
    return [[g.a[0] + nx, g.a[1] + ny], [g.z[0] + nx, g.z[1] + ny], [g.z[0] - nx, g.z[1] - ny], [g.a[0] - nx, g.a[1] - ny]];
  };
  const pilaresEl = els.flatMap((r) => r.pilarIds.map((id) => ({ r, p: b.pilares.find((x) => x.id === id)! }))).filter((x) => x.p);
  const todosPts: P[] = [...els.flatMap((r) => r.contorno as P[]), ...vigas.flatMap((v) => faixa(v) ?? [])];
  const cx = caixa(todosPts);
  const pl = plantaNaFolha(cx, cfg.formato, cfg.escala, 40);
  const k = pl.escala / 1000;
  const modelo: Prim[] = [];
  for (const r of els) {
    modelo.push({ t: 'pl', c: 'FUNDACAO', pts: r.contorno as P[], fechada: true });
    for (const e of estacasGlobais(r)) modelo.push({ t: 'circ', c: 'FUNDACAO', centro: e.c, r: e.D / 2 }, { t: 'pl', c: 'FORMA-FINA', pts: [[e.c[0] - 0.35 * e.D, e.c[1] - 0.35 * e.D], [e.c[0] + 0.35 * e.D, e.c[1] + 0.35 * e.D]] }, { t: 'pl', c: 'FORMA-FINA', pts: [[e.c[0] - 0.35 * e.D, e.c[1] + 0.35 * e.D], [e.c[0] + 0.35 * e.D, e.c[1] - 0.35 * e.D]] });
    const [x0, , , y1] = caixa(r.contorno as P[]);
    rotuloElemento(b, r).forEach((l, i) => modelo.push({ t: 'txt', c: 'TEXTO', p: [x0, y1 + (4.2 - i) * 3.2 * k + 0.6 * k], h: 2.2 * k, s: i === 0 ? `${r.nome} · ${l}` : l, av: 'base' }));
  }
  const centros: P[] = [];
  for (const { r, p } of pilaresEl) {
    const s = secaoBase(b, p), c = centroPilar(p, s);
    centros.push(c);
    modelo.push({ t: 'pl', c: 'PILAR-NASCE', pts: contornoDoPilar(b, p), fechada: true });
    const dx = c[0] - r.centro[0], dy = c[1] - r.centro[1];
    if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) {
      const m: P = [c[0], r.centro[1]];
      modelo.push({ t: 'pl', c: 'COTA', pts: [r.centro as P, m, c] });
      if (Math.abs(dx) > 0.005) modelo.push({ t: 'txt', c: 'COTA', p: [(r.centro[0] + m[0]) / 2, m[1] - 0.5 * k], h: 1.8 * k, s: cm(Math.abs(dx)), ah: 'c', av: 'topo' });
      if (Math.abs(dy) > 0.005) modelo.push({ t: 'txt', c: 'COTA', p: [m[0] + 0.5 * k, (m[1] + c[1]) / 2], h: 1.8 * k, s: cm(Math.abs(dy)), ah: 'e', av: 'meio' });
    }
  }
  for (const v of vigas) {
    const f = faixa(v);
    if (!f) continue;
    modelo.push({ t: 'pl', c: 'FUNDACAO', pts: f, fechada: true });
    const mx = (f[0][0] + f[2][0]) / 2, my = (f[0][1] + f[2][1]) / 2;
    modelo.push({ t: 'txt', c: 'TEXTO', p: [mx, my], h: 2.2 * k, s: `${v.nome} ${cm(v.bAdot)}×${cm(v.hAdot)}`, ang: anguloLegivel(f[1][0] - f[0][0], f[1][1] - f[0][1]), ah: 'c', av: 'base' });
  }
  eixosECotas(modelo, b.eixos, centros, caixa(todosPts), k);
  // tabelas: pilar (cargas) e fundação (elemento, bloco), mesma ordem
  const cs = an ? new Map(cargasDosPilares(b, an).map((c) => [c.pilar, c])) : new Map<string, ReturnType<typeof cargasDosPilares>[number]>();
  const linhas = [...pilaresEl].sort((a, z) => ordemNome(a.p.nome, z.p.nome));
  const v = (x: number) => nf(x);
  const w = 12;
  const tabs: BlocoTabela[] = [notas(notasLocacao(b, rs), 'NOTAS')];
  tabs.push({
    titulo: 'PILARES E CARGAS — k CARACT. (RARA), d CÁLCULO (ELU) — kN, kN·m',
    cols: [{ w: 12, rot: 'PILAR' }, { w: 15, rot: 'SEÇÃO' }, { w: 12, rot: 'X' }, { w: 12, rot: 'Y' }, ...['Nk,máx', 'Nk,mín', 'Mxk', 'Myk', 'Hxk', 'Hyk', 'Nd,máx', 'Mxd', 'Myd'].map((rot) => ({ w, rot }))],
    linhas: linhas.map(({ p }) => { const c = cs.get(p.nome), cc = centroPilar(p, secaoBase(b, p)); return [p.nome, secTxt(b, p), cm(cc[0]), cm(cc[1]), ...(c ? [v(c.k.Nmax), v(c.k.Nmin), v(c.k.Mx), v(c.k.My), v(c.k.Hx), v(c.k.Hy), v(c.d.Nmax), v(c.d.Mx), v(c.d.My)] : Array(9).fill('—'))]; }),
  });
  tabs.push({
    titulo: 'FUNDAÇÃO E BLOCO (cm)',
    cols: [{ w: 12, rot: 'PILAR' }, { w: 13, rot: 'ELEM.' }, { w: 20, rot: 'TIPO' }, { w: 12, rot: 'B' }, { w: 12, rot: 'H' }, { w: 14, rot: 'h0/ha' }, { w: 14, rot: 'h1/hb' }, { w: 12, rot: 'df' }, { w: 12, rot: 'ne' }, { w: 32, rot: 'ESTACA' }],
    linhas: linhas.map(({ r, p }) => {
      const f = sapataDe(r), cap = blocoDe(r), est = estacasDe(r), t = tubulaoDe(r);
      if (f) return [p.nome, r.nome, r.pilarIds.length > 1 ? 'sapata associada' : 'sapata', cm(f.A), cm(f.B), cm(f.h0), cm(f.h - f.h0), cm(r.profundidade), '—', '—'];
      if (cap) return [p.nome, r.nome, r.pilarIds.length > 1 ? 'bloco (vários pilares)' : 'bloco', cm(cap.lx), cm(cap.ly), '0', cm(cap.h), cm(r.profundidade), String(est?.coords.length ?? '—'), r.dims.estaca ?? '—'];
      if (t) return [p.nome, r.nome, `tubulão ø${cm(t.Df)}/${cm(t.Db)}`, cm(t.Db), cm(t.Db), cm(t.rodape), cm(t.H), cm(r.profundidade), '—', '—'];
      return [p.nome, r.nome, r.tipo, '—', '—', '—', '—', cm(r.profundidade), '—', '—'];
    }),
  });
  // elementos iguais (legenda dos blocos e das sapatas)
  const { grupos } = agruparFundacoes(rs);
  const iguais = grupos.filter((g) => g.els.length > 1 || g.tipo === 'bloco');
  if (iguais.length) tabs.push({
    titulo: 'ELEMENTOS IGUAIS', cols: [{ w: 100, rot: 'ELEMENTOS', ah: 'e' }, { w: 40, rot: 'DIMENSÕES (cm)' }, { w: 30, rot: 'ESTACAS' }],
    linhas: iguais.map((g) => { const r = g.els[0], f = sapataDe(r), cap = blocoDe(r), est = estacasDe(r), t = tubulaoDe(r); return [titulo(nomesDe(g)).join(''), f ? `${cm(f.A)}×${cm(f.B)}×${cm(f.h)}` : cap ? `${cm(cap.lx)}×${cm(cap.ly)}×${cm(cap.h)}` : t ? `ø${cm(t.Df)}/${cm(t.Db)}` : '—', est ? `${est.coords.length}×ø${cm(est.D)}` : '—']; }),
  });
  const avisos = [...pl.avisos];
  if (!an) avisos.push('Sem análise: a tabela de cargas sai depois de calcular o edifício.');
  const nivelTxt = nf(nivelCota);
  return montarFolha({
    b, formato: pl.formato, tipo: 'fundacao', sigla: o.sigla, titulo: `Fundação — locação (${nivelTxt} m)`, conteudo: `${NOME_SIGLA[o.sigla]} — LOCAÇÃO DE OBRA E PLANTA DE CARGAS`, escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo,
    desenho: [], tabelas: tabs, legenda: `ESCALA 1:${pl.escala} · cotas em cm · assentamento ${nivelTxt} m · cargas em kN e kN·m`, avisos, modelo, janela: pl.janela, elementos: els.map((r) => r.nome),
  });
}

function contornoDoPilar(b: BuildingModel, p: Pilar): P[] {
  const [w, h] = dimsSecao(secaoBase(b, p)), c = centroPilar(p, secaoBase(b, p)), a = (p.angulo * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  return ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as P[]).map(([x, y]) => [c[0] + x * co - y * si, c[1] + x * si + y * co] as P);
}

// ---------------- quantitativos ----------------

function folhaQuantitativos(b: BuildingModel, sigla: string, linhas: LinhaQuantitativo[], estacas: { nome: string; quant: number; L: number }[], tab: LinhaTabelaAco[], o: OpcoesArmacao): Prancha {
  const cfg = cfgArmacao(b), perdas = perdasDe(b), fck = fckDe(b, 'fundacao');
  const concreto = linhas.reduce((s, l) => s + l.concreto, 0), forma = linhas.reduce((s, l) => s + l.forma, 0);
  const aco: AcoPrancha = acoDaFolha(tab, perdas, concreto, forma);
  const f = cfg.formato === 'auto' ? 'A3' : cfg.formato;
  const nome = (l: LinhaQuantitativo) => { const s = titulo(l.nomes).join(''); return s.length > 22 ? `${l.nomes[0]}…${l.nomes.at(-1)}` : s; };
  const tabs: BlocoTabela[] = [{
    titulo: 'QUANTITATIVOS POR ELEMENTO', cols: [{ w: 42, rot: 'ELEMENTOS', ah: 'e' }, { w: 22, rot: 'TIPO' }, { w: 14, rot: 'QUANT' }, { w: 24, rot: 'CONCRETO (m³)' }, { w: 22, rot: 'FORMA (m²)' }, { w: 22, rot: 'AÇO (kg)' }],
    linhas: linhas.map((l) => [nome(l), l.tipo, String(l.quant), nf(l.concreto), nf(l.forma), nf(l.aco)]),
    rodape: [`TOTAL: concreto ${nf(concreto)} m³ · forma ${nf(forma)} m² · aço ${nf(linhas.reduce((s, l) => s + l.aco, 0))} kg`],
  }];
  if (estacas.length) tabs.push({
    titulo: 'ESTACAS', cols: [{ w: 60, rot: 'TIPO / DIÂMETRO', ah: 'e' }, { w: 24, rot: 'QUANT' }, { w: 30, rot: 'L (m)' }, { w: 34, rot: 'TOTAL (m)' }],
    linhas: estacas.map((e) => [e.nome, String(e.quant), e.L ? nf(e.L, 1) : '—', e.L ? nf(e.L * e.quant, 1) : '—']),
    rodape: [`TOTAL: ${estacas.reduce((s, e) => s + e.quant, 0)} estacas · ${nf(estacas.reduce((s, e) => s + e.L * e.quant, 0), 1)} m`],
  });
  tabs.push(resumoAco(aco, fck));
  tabs.push(notas(['Concreto: volumes dos elementos e das vigas de fundação (entre as faces dos pilares).', 'Forma: laterais (e inclinadas nas sapatas); tubulões escavados sem forma; fundo apoiado no lastro [a confirmar].', `Aço: soma das folhas de detalhamento, com ${nf(perdas, 0)} % de perdas no resumo.`, 'Comprimento das estacas: o calculado; estacas com capacidade informada sem comprimento aparecem sem metragem.'], 'NOTAS'));
  return montarFolha({
    b, formato: f, tipo: 'fundacao', sigla, titulo: 'Fundação — quantitativos', conteudo: `${NOME_SIGLA[sigla]} — QUANTITATIVOS`, escala: '—', escalaNum: cfg.escalaFundacao, carimbo: o.carimbo,
    desenho: [], tabelas: tabs, legenda: 'Concreto, forma, aço e estacas da fundação', avisos: [], aco, elementos: linhas.flatMap((l) => l.nomes),
  });
}

// ---------------- conjunto das folhas de fundação ----------------

export function montarPranchasFundacao(b: BuildingModel, an: AnaliseEdificio | null, dim: Dimensionamento, o: OpcoesArmacao = {}): Prancha[] {
  return montarFundacao(b, an, dim, o).pranchas;
}

/**
 * Quantitativos da fundação (concreto, forma e aço por grupo de elementos iguais, vigas de fundação, radiers e vigas
 * sobre base elástica; estacas por tipo), os mesmos da folha de quantitativos: para o memorial.
 */
export function quantitativosFundacao(b: BuildingModel, an: AnaliseEdificio | null, dim: Dimensionamento): { linhas: LinhaQuantitativo[]; estacas: { nome: string; quant: number; L: number }[] } {
  const r = montarFundacao(b, an, dim, {});
  return { linhas: r.quant, estacas: r.estacas };
}

function montarFundacao(b: BuildingModel, an: AnaliseEdificio | null, dim: Dimensionamento, o: OpcoesArmacao = {}): { pranchas: Prancha[]; quant: LinhaQuantitativo[]; estacas: { nome: string; quant: number; L: number }[] } {
  const rs = (dim.fundacoes ?? []).filter((r) => r.contorno.length);
  const temBase = !!(dim.radiers?.length || dim.vigasElasticas?.length);
  const cors = (dim.corridas ?? []).filter((r) => r.contorno.length);
  // bases dos muros de arrimo isolados com comprimento (FU7b): só quantitativos (o desenho está na folha do muro)
  const muros = (dim.basesMuros ?? []).filter((m) => m.total);
  if (!rs.length && !temBase && !cors.length && !muros.length) return { pranchas: [], quant: [], estacas: [] };
  // radier, viga sobre base elástica e sapata corrida = fundação direta (sigla das sapatas) [a confirmar]
  const sigla = siglaFundacao([...rs.map((r) => r.tipo), ...(temBase || cors.length || muros.length ? ['sapata' as const] : [])]);
  const oa = { carimbo: o.carimbo }, cfg = cfgArmacao(b);
  const out: Prancha[] = [], tabAco: LinhaTabelaAco[] = [], quant: LinhaQuantitativo[] = [];
  const avisos: string[] = [];
  // 1) locação e planta de cargas, uma por nível de fundação
  const niveis = [...new Set(rs.map((r) => +r.cota.toFixed(3)))].sort((a, z) => a - z);
  for (const n of niveis) { const pr = montarLocacaoFundacao(b, an, dim, n, rs.filter((r) => Math.abs(r.cota - n) < 1e-3), { ...oa, sigla }); if (pr) out.push(pr); }
  // 2) detalhamento por tipo
  const { grupos, semDesenho } = agruparFundacoes(rs);
  for (const r of semDesenho) avisos.push(`${r.nome}: sem desenho (cálculo incompleto).`);
  const regQuant = (nomes: string[], tipo: string, qt: number, concreto: number, forma: number, desenhar: (c: Ctx) => Prim[]) => {
    const reg = new Posicoes(); desenhar(ctxDe(b, (k, a, p, cc, q) => reg.pos(k, a, p, cc, q)));
    const kg = reg.tabela.reduce((s, l) => s + l.cTotal * (Math.PI * (l.phi / 2000) ** 2) * 7850, 0);
    quant.push({ nomes, tipo, quant: qt, concreto, forma, aco: kg });
  };
  const porTipo = (t: TipoFundacao) => grupos.filter((g) => g.tipo === t);
  const somaVol = (g: GrupoFund) => g.els.reduce((s, e) => s + e.volume, 0);
  const somaForma = (g: GrupoFund) => g.els.reduce((s, e) => s + formaDe(e), 0);
  const arranquesDe = (t: TipoFundacao) => gruposDeArranque(b, dim, rs.filter((r) => r.tipo === t));
  const defsArranque = (gs: GrupoArranque[]): DefDesenho[] => gs.map((g) => ({ nome: g.pilares.map((p) => p.nome).join('='), elementos: g.pilares.map((p) => p.nome), desenhar: (c) => desenharArranque(c, g) }));
  const mapConc = (gs: GrupoFund[]) => (nomes: string[]) => gs.filter((g) => g.els.some((e) => nomes.includes(e.nome))).reduce((s, g) => s + g.els.filter((e) => nomes.includes(e.nome)).reduce((t, e) => t + e.volume, 0), 0);
  const mapForma = (gs: GrupoFund[]) => (nomes: string[]) => gs.reduce((s, g) => s + g.els.filter((e) => nomes.includes(e.nome)).reduce((t, e) => t + formaDe(e), 0), 0);
  const detalhe = (tipo: TipoFundacao, rotulo: string, extra: string[], def: (g: GrupoFund) => DefDesenho[], conteudo: string, legenda: string, sg: string) => {
    const gs = porTipo(tipo);
    if (!gs.length) return;
    const defs: DefDesenho[] = [];
    for (const g of gs) {
      const ds = def(g);
      defs.push(...ds);
      regQuant(nomesDe(g), rotulo, g.els.length, somaVol(g), somaForma(g), (c) => (tipo === 'sapata' ? desenharSapata(c, g.els) : tipo === 'bloco' ? desenharBloco(c, g.els) : desenharTubulao(c, g.els, cotaTerreno(b), parametrosFundacao(b).cutoff)));
    }
    defs.push(...defsArranque(arranquesDe(tipo)));
    const r = folhasDeDesenhos(b, { ...oa, sigla: sg, conteudo, titulo: `Fundação — ${rotulo === 'Tubulão' ? 'tubulões' : rotulo.toLowerCase() + 's'}`, notas: notasDetalhe(b, extra), defs, legenda, concretoDe: mapConc(gs), formaDe: mapForma(gs) });
    out.push(...r.pranchas); tabAco.push(...r.aco);
  };
  detalhe('sapata', 'Sapata', ['h0 = altura da borda; h1 = altura do tronco; df = profundidade do assentamento abaixo do terreno.', 'Solo compactado sobre a sapata (γ ≥ 16 kN/m³) [a confirmar].', 'Barras retas, sem ganchos; ancoragem pelo balanço [a confirmar].'],
    (g) => [{ nome: nomesDe(g).join('='), elementos: nomesDe(g), desenhar: (c) => desenharSapata(c, g.els) }], `${NOME_SIGLA.SFS} — DETALHAMENTO DAS SAPATAS`, `Planta e corte 1:${cfg.escalaFundacao} · arranques 1:${cfg.escalaFundacao}, seções 1:${cfg.escalaSecao}`, 'SFS');
  detalhe('bloco', 'Bloco', ['Tirantes sobre as estacas com ganchos de 90°; bielas em linha fina no corte; ha = 0 (bloco de altura constante).', 'CA: cota de arrasamento das estacas. Estacas cravadas/moldadas conforme a legenda dos blocos (1:25).'],
    (g) => [{ nome: nomesDe(g).join('='), elementos: nomesDe(g), desenhar: (c) => desenharBloco(c, g.els) }, { nome: `${nomesDe(g).join('=')}-leg`, elementos: [], desenhar: (c) => desenharLegendaBloco(c, g.els) }],
    `${NOME_SIGLA.SFN} — DETALHAMENTO DOS BLOCOS`, `Planta e corte 1:${cfg.escalaFundacao} · legenda dos blocos 1:25 · arranques 1:${cfg.escalaFundacao}`, 'SFN');
  const cotaT = cotaTerreno(b), cut = parametrosFundacao(b).cutoff;
  detalhe('tubulao', 'Tubulão', ['Tubulão a céu aberto de concreto simples, sem armadura; marcas C.T (cota do terreno), C.A (arrasamento) e C.T.B (topo da base) [a confirmar].', 'Padrão R5 de desenho, sem folha de referência para o tubulão [a confirmar].'],
    (g) => [{ nome: nomesDe(g).join('='), elementos: nomesDe(g), desenhar: (c) => desenharTubulao(c, g.els, cotaT, cut) }], `${NOME_SIGLA.SFN} — DETALHAMENTO DOS TUBULÕES`, `Planta e corte 1:${cfg.escalaFundacao} · arranques 1:${cfg.escalaFundacao}`, 'SFN');
  // 3) vigas de fundação (equilíbrio e travamento)
  // as cintas das sapatas corridas (FU8a) são vigas de equilíbrio detalhadas junto com as vigas de fundação
  const vs = [...(dim.vigasFundacao ?? []), ...cors.flatMap((r) => r.cintas ?? [])].filter((v) => v.L > 0 && (v.armadura.sup.barras || v.armadura.inf.barras));
  if (vs.length) {
    const gv = new Map<string, ResultadoVigaFundacao[]>();
    for (const v of vs) {
      const a = v.armadura, bs = (x?: { phi: number; n: number; layers: number } | null) => (x ? [x.phi, x.n, x.layers] : null);
      const k = JSON.stringify(['corrida' in v, v.tipo, c1(v.bAdot), c1(v.hAdot), c1(v.L), bs(a.sup.barras), bs(a.inf.barras), bs(a.pele?.barras), a.estribo && [a.estribo.phi, c1(a.estribo.s)], c1(a.ancoragem.ini), c1(a.ancoragem.fim)]);
      (gv.get(k) ?? gv.set(k, []).get(k)!).push(v);
    }
    const area = areaArmacao('A1'), larg = area.x1 - area.x0;
    const grupos = [...gv.values()].map((g) => g.sort((a, z) => ordemNome(a.nome, z.nome))).sort((a, z) => ordemNome(a[0].nome, z[0].nome));
    const esc = (v: ResultadoVigaFundacao) => [cfg.escalaFundacao, 25, 50, 75, 100, 125, 150, 200].filter((e, i, arr) => arr.indexOf(e) === i).sort((a, z) => a - z).filter((e) => e >= cfg.escalaFundacao).find((e) => (v.L * 1000) / e + 60 <= larg) ?? 200;
    const defs: DefDesenho[] = grupos.map((g) => ({ nome: g.map((v) => v.nome).join('='), elementos: g.map((v) => v.nome), desenhar: (c) => desenharViga(c, g, esc(g[0])) }));
    for (const g of grupos) regQuant(g.map((v) => v.nome), 'corrida' in g[0] ? 'Cinta de sapata corrida' : g[0].tipo === 'equilibrio' ? 'Viga de equilíbrio' : 'Viga de travamento', g.length, g.reduce((s, v) => s + v.volume, 0), g.reduce((s, v) => s + formaViga(v), 0), (c) => desenharViga(c, g, esc(g[0])));
    const nomesV = (nomes: string[]) => grupos.flat().filter((v) => nomes.includes(v.nome));
    const r = folhasDeDesenhos(b, {
      ...oa, sigla, conteudo: `${NOME_SIGLA[sigla]} — DETALHAMENTO DAS VIGAS DE FUNDAÇÃO`, titulo: 'Fundação — vigas de fundação',
      notas: notasDetalhe(b, ['Barras superiores ancoradas além da face do pilar (comprimento editável por viga; padrão lb) com gancho de 90°; inferiores com gancho nos pilares das pontas.', 'Estribos de ponta a ponta ou entre as faces, conforme a opção das esperas; escala da elevação ajustada ao comprimento [a confirmar].', 'Padrão R5 de desenho, sem folha de referência para viga de equilíbrio [a confirmar].']),
      defs, legenda: `Elevação 1:${[...new Set(grupos.map((g) => esc(g[0])))].join(', 1:')} · seção A-A 1:${cfg.escalaSecao}`,
      concretoDe: (nomes) => nomesV(nomes).reduce((s, v) => s + v.volume, 0), formaDe: (nomes) => nomesV(nomes).reduce((s, v) => s + formaViga(v), 0),
    });
    out.push(...r.pranchas); tabAco.push(...r.aco);
  }
  // 3b) base elástica (FU6): radiers e vigas sobre base elástica
  if (temBase) {
    const r = montarPranchasBaseElastica(b, dim, { ...oa, sigla, conteudo: NOME_SIGLA[sigla] });
    out.push(...r.pranchas); tabAco.push(...r.aco); quant.push(...r.quant);
  }
  // 3c) sapatas corridas (FU7a): locação e detalhamento (planta de um trecho e corte transversal)
  if (cors.length) {
    const pl = montarPranchaCorridas(b, dim, { ...oa, sigla, conteudo: NOME_SIGLA[sigla] });
    if (pl) out.push(pl);
    const gc = agruparCorridas(cors), nomesC = (g: { els: { nome: string }[] }) => g.els.map((e) => e.nome);
    for (const g of gc) regQuant(nomesC(g), 'Sapata corrida', g.els.length, g.els.reduce((t, e) => t + e.volume, 0), g.els.reduce((t, e) => t + e.forma, 0), (c) => desenharCorrida(c, g.els));
    const r = folhasDeDesenhos(b, {
      ...oa, sigla, conteudo: `${NOME_SIGLA[sigla]} — DETALHAMENTO DAS SAPATAS CORRIDAS`, titulo: 'Fundação — sapatas corridas',
      notas: notasDetalhe(b, ['Planta de um trecho típico e corte transversal; a armadura transversal vai de borda a borda da aba e a de distribuição corre ao longo da sapata, com emenda por traspasse acima da barra máxima [a confirmar].', 'Sob pilares, armadura longitudinal e estribos da viga sobre base elástica; aba de um lado exige vigas de equilíbrio (cintas), detalhadas nas folhas das vigas de fundação. A elevação longitudinal mostra o corte pelo eixo.']),
      defs: gc.map((g) => ({ nome: nomesC(g).join('='), elementos: nomesC(g), desenhar: (c: Ctx) => desenharCorrida(c, g.els) })),
      legenda: `Planta e corte 1:${cfg.escalaFundacao} · elevação longitudinal · sapatas corridas`,
      concretoDe: (nomes) => cors.filter((e) => nomes.includes(e.nome)).reduce((t, e) => t + e.volume, 0), formaDe: (nomes) => cors.filter((e) => nomes.includes(e.nome)).reduce((t, e) => t + e.forma, 0),
    });
    out.push(...r.pranchas); tabAco.push(...r.aco);
  }
  // 3d) bases dos muros de arrimo isolados (FU7b): concreto, forma e aço da ponta, do talão e da distribuição
  for (const m of muros) quant.push({ nomes: [m.nome], tipo: 'Base de muro de arrimo', quant: 1, concreto: m.total!.concreto, forma: m.total!.forma, aco: m.total!.aco });
  // 4) quantitativos
  const estacas = new Map<string, { nome: string; quant: number; L: number }>();
  for (const g of porTipo('bloco')) for (const e of g.els) { const est = estacasDe(e); if (!est) continue; const nome = e.dims.estaca ?? `ø${cm(est.D)}`, k = `${nome}|${est.L ?? 0}`, x = estacas.get(k) ?? { nome, quant: 0, L: est.L ?? 0 }; x.quant += est.coords.length; estacas.set(k, x); }
  const q = folhaQuantitativos(b, sigla, quant, [...estacas.values()], tabAco, oa);
  q.avisos.push(...avisos);
  out.push(q);
  return { pranchas: out, quant, estacas: [...estacas.values()] };
}
