// Lançamento automático por camada a partir de um gabarito (DXF/DWG) já importado como máscara (L2).
// Cada camada recebe um papel (pilar, viga por eixo ou por faces, contorno, abertura, eixo, ponto fixo...);
// `propostaDeLancamento` devolve uma Proposta revisável (contagens, ambíguos, ignorados, avisos) e nada entra no modelo
// sem o comando `lancamento.aplicar`. Os elementos lançados guardam `origemLancamento` ("dxf:<máscara>:<hash>"), para
// reimportar sem duplicar. Padrões de nome de camada, heurísticas de geometria e limites são próprios e "a confirmar".
import { cadeiasDe, paresParalelos, retanguloDe, simplificarCadeia, type CadeiaL, type Pt } from '../geom/cadeias';
import { areaPoligono, dentroPoligono } from '../geom/faces';
import { sobrepoe } from '../geom/poly';
import { contornoPilar, dimsSecao, mascaraNoGrupo, mascaraParaMundo, type Ajuste, type BuildingModel, type CamadaGeo, type Mascara, type PapelCamada, type RegrasCamadas, type SecaoPilar } from './types';
import { geometriaMascara } from './pilares';

export const PAPEIS: { papel: PapelCamada; rotulo: string }[] = [
  { papel: 'pilar', rotulo: 'Pilares' },
  { papel: 'pilarParede', rotulo: 'Pilares-parede' },
  { papel: 'vigaFaces', rotulo: 'Vigas por faces (pares de linhas)' },
  { papel: 'vigaEixo', rotulo: 'Vigas por eixo' },
  { papel: 'contorno', rotulo: 'Contorno do edifício' },
  { papel: 'abertura', rotulo: 'Aberturas' },
  { papel: 'eixo', rotulo: 'Eixos' },
  { papel: 'pontoFixo', rotulo: 'Ponto fixo dos pilares' },
  { papel: 'texto', rotulo: 'Nomes (textos)' },
  { papel: 'parede', rotulo: 'Paredes' },
  { papel: 'ignorar', rotulo: 'Ignorar' },
];

/** Parâmetros padrão das regras [a confirmar]: seção de viga 15 × 40 cm, faces afastadas de 8 a 60 cm, tolerância de 1 cm. */
export const REGRAS_PADRAO: Omit<RegrasCamadas, 'papeis'> = {
  larguraViga: 0.15, alturaViga: 0.4, vigaFacesMin: 0.08, vigaFacesMax: 0.6, tolerancia: 0.01, pilarMax: 2, raioTexto: 1, lajeH: 0.1,
};

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/** Papel sugerido só pelo nome da camada (padrões comuns em português e inglês), ou null. */
export function papelPeloNome(nome: string): PapelCamada | null {
  const n = semAcento(nome);
  if (/(^|[^A-Z])(FOLHA|COTA|COTAS|DIM|DIMENSION|QUADRO|LEGENDA|CARIMBO|HACH|HATCH|LAJE|SLAB|DEFPOINTS)/.test(n)) return 'ignorar';
  if (/PILAR.?PAREDE|PAREDE.?ESTRUT|SHEAR|CORE/.test(n)) return 'pilarParede';
  if (/PILAR|PILLAR|COLUMN|^COL($|[^A-Z])|^PIL($|[^A-Z])|^P$/.test(n)) return 'pilar';
  if (/VIGA|BEAM|^VG($|[^A-Z])/.test(n)) return /EIXO|AXIS|CENTRO|CENTER/.test(n) ? 'vigaEixo' : null;
  if (/CONTORNO|PERIMETR|OUTLINE|BORDA|FACHADA/.test(n)) return 'contorno';
  if (/ABERTURA|FURO|SHAFT|VOID|OPENING|VAZIO|POCO/.test(n)) return 'abertura';
  if (/PONTO.?FIXO|FIXO|FIXED|^PF($|[^A-Z])/.test(n)) return 'pontoFixo';
  if (/EIXO|AXIS|AXES|GRID|MALHA/.test(n)) return 'eixo';
  if (/PAREDE|ALVENARIA|^WALL|^ALV($|[^A-Z])/.test(n)) return 'parede';
  if (/TEXTO|TEXT|NOME|ANOT|ANNOT|TITULO|NUMERO/.test(n)) return 'texto';
  return null;
}

// ---- geometria da camada no referencial "escalado" (m, sem rotação nem deslocamento) ----

interface GeoM { segs: number[]; arcos: number[]; textos: { x: number; y: number; t: string }[] }
function geoEscalada(g: CamadaGeo | undefined, k: number): GeoM {
  if (!g) return { segs: [], arcos: [], textos: [] };
  return { segs: g.linhas.map((v) => v * k), arcos: g.arcos.map((v, i) => (i % 5 < 3 ? v * k : v)), textos: g.textos.map((t) => ({ x: t.x * k, y: t.y * k, t: t.t.trim() })) };
}

/** Pontos de um arco (graus, anti-horário) a cada `passo` graus. */
export function arcoPontos(cx: number, cy: number, r: number, a0: number, a1: number, passo = 5): Pt[] {
  let sw = a1 - a0;
  while (sw <= 0) sw += 360;
  const n = Math.max(2, Math.ceil(sw / passo));
  return Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + (sw * i) / n) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt; });
}

/** Círculos completos (arcos de mesmo centro e raio cujas aberturas somam 360°). */
function circulosDe(arcos: number[], tol: number): { cx: number; cy: number; r: number }[] {
  const m = new Map<string, { cx: number; cy: number; r: number; sw: number }>();
  for (let k = 0; k + 4 < arcos.length; k += 5) {
    let sw = arcos[k + 4] - arcos[k + 3];
    while (sw <= 0) sw += 360;
    const ch = `${Math.round(arcos[k] / tol)},${Math.round(arcos[k + 1] / tol)},${Math.round(arcos[k + 2] / tol)}`;
    const e = m.get(ch) ?? { cx: arcos[k], cy: arcos[k + 1], r: arcos[k + 2], sw: 0 };
    e.sw += sw;
    m.set(ch, e);
  }
  return [...m.values()].filter((c) => c.sw >= 359.5);
}

/** Deslocamento que leva o canto inferior esquerdo do desenho à origem (a importação com `centralizar`), em m. */
export function deslocamentoCentralizado(geo: Record<string, CamadaGeo>, escala: number): { dx: number; dy: number } {
  let x0 = Infinity, y0 = Infinity;
  for (const c of Object.values(geo)) {
    for (let k = 0; k < c.linhas.length; k += 2) { x0 = Math.min(x0, c.linhas[k]); y0 = Math.min(y0, c.linhas[k + 1]); }
    for (let k = 0; k < c.arcos.length; k += 5) { x0 = Math.min(x0, c.arcos[k] - c.arcos[k + 2]); y0 = Math.min(y0, c.arcos[k + 1] - c.arcos[k + 2]); }
  }
  return Number.isFinite(x0) ? { dx: -x0 * escala, dy: -y0 * escala } : { dx: 0, dy: 0 };
}

// ---- sugestão de regras ----

const pares = (segs: number[], r: Omit<RegrasCamadas, 'papeis'>) => {
  const s: [Pt, Pt][] = [];
  for (let k = 0; k + 3 < segs.length; k += 4) s.push([[segs[k], segs[k + 1]], [segs[k + 2], segs[k + 3]]]);
  return s.length > 3000 ? [] : paresParalelos(s, r.vigaFacesMin, r.vigaFacesMax, 0.2);
};

/** Papel sugerido pela geometria da camada (retângulos pequenos fechados = pilar; pares paralelos = viga por faces; polilinha externa = contorno). */
export function papelPelaGeometria(g: CamadaGeo, escala: number, r: Omit<RegrasCamadas, 'papeis'> = REGRAS_PADRAO): PapelCamada {
  const gm = geoEscalada(g, escala);
  const nSeg = gm.segs.length / 4;
  if (!nSeg && !gm.arcos.length) return gm.textos.length ? 'texto' : 'ignorar';
  const circ = circulosDe(gm.arcos, r.tolerancia);
  if (!nSeg && circ.length && circ.every((c) => c.r * 2 <= r.pilarMax && c.r * 2 >= 0.1)) return 'pilar';
  if (nSeg > 20000) return 'ignorar';
  const fechadas = cadeiasDe(gm.segs, r.tolerancia).filter((c) => c.fechada);
  const pequenos = fechadas.filter((c) => { const q = retanguloDe(c.pontos); return q && Math.max(q.b, q.h) <= r.pilarMax && Math.min(q.b, q.h) >= 0.1; });
  if (pequenos.length && pequenos.length >= 0.8 * fechadas.length && pequenos.length * 4 >= 0.6 * nSeg) return 'pilar';
  const np = pares(gm.segs, r).length;
  if (np >= 1 && np * 4 >= nSeg) return 'vigaFaces';
  if (fechadas.length === 1 && Math.abs(areaPoligono(fechadas[0].pontos)) > 4 && nSeg < 400) return 'contorno';
  return nSeg ? 'vigaEixo' : 'ignorar';
}

/** Regras sugeridas para um gabarito: o nome da camada manda; sem nome reconhecido, vale a geometria. */
export function sugerirRegras(geo: Record<string, CamadaGeo>, escala: number, base: Partial<Omit<RegrasCamadas, 'papeis'>> = {}): RegrasCamadas {
  const r = { ...REGRAS_PADRAO, ...base };
  const papeis: Record<string, PapelCamada> = {};
  for (const [nome, g] of Object.entries(geo)) {
    const p = papelPeloNome(nome);
    if (p) papeis[nome] = p;
    else if (/VIGA|BEAM|^VG($|[^A-Z])/.test(semAcento(nome))) { const q = papelPelaGeometria(g, escala, r); papeis[nome] = q === 'vigaFaces' ? 'vigaFaces' : q === 'ignorar' ? 'ignorar' : 'vigaEixo'; }
    else papeis[nome] = papelPelaGeometria(g, escala, r);
  }
  return { ...r, papeis };
}

// ---- proposta ----

export interface PilarProposto { origem: string; nome?: string; x: number; y: number; angulo: number; ajuste: Ajuste; secao: SecaoPilar; papel: 'pilar' | 'pilarParede'; ambiguo?: string }
export interface VigaProposta { origem: string; pontos: Pt[]; secao: { b: number; h: number }; alinhamento: 'centro'; ambiguo?: string }
export interface EixoProposto { origem: string; nome: string; p1: Pt; p2: Pt }
export interface AberturaProposta { origem: string; pontos: Pt[] }
export interface ContornoProposto { origem: string; pontos: Pt[]; area: number; ambiguo?: string }
export interface Ambiguo { origem?: string; codigo: string; mensagem: string }
export interface IgnoradoProposta { camada: string; motivo: string; quantidade: number }

export interface Proposta {
  /** Nome da máscara de origem (entra na `origemLancamento`). */
  mascara: string;
  pilares: PilarProposto[];
  vigas: VigaProposta[];
  eixos: EixoProposto[];
  aberturas: AberturaProposta[];
  contorno: ContornoProposto | null;
  /** Altura das vigas e espessura das lajes usadas (das regras). */
  lajeH: number;
  ambiguos: Ambiguo[];
  ignorados: IgnoradoProposta[];
  avisos: string[];
  /** Origens já lançadas no modelo (não entram de novo). */
  jaLancados: string[];
  contagens: { pilares: number; vigas: number; eixos: number; aberturas: number; contorno: number; ambiguos: number; ignorados: number; jaLancados: number };
}

const fnv = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
const mm = (v: number) => Math.round(v * 1000);
/** Origem de um elemento: hash da geometria no referencial escalado (m), estável a realinhamentos da máscara. */
export const chaveOrigem = (mascara: string, tipo: string, ...v: (number | string)[]) => `dxf:${mascara}:${fnv([tipo, ...v.map((x) => (typeof x === 'number' ? mm(x) : x))].join('|'))}`;

const NOME_VALIDO = /^[A-Za-z]{1,4}[-\s]?\d{1,4}[A-Za-z]?$/;
const AJUSTES: Ajuste[] = ['c', 'n', 's', 'l', 'o', 'ne', 'no', 'se', 'so'];
const dist = (a: Pt, z: Pt) => Math.hypot(a[0] - z[0], a[1] - z[1]);

/** Ponto do pilar (centro `c`, ângulo, seção) que o `ajuste` indica, no referencial da máscara. */
export function pontoDoAjuste(c: Pt, angulo: number, s: SecaoPilar, ajuste: Ajuste): Pt {
  const [w, h] = dimsSecao(s);
  const sx = ajuste === 'l' || ajuste === 'ne' || ajuste === 'se' ? 1 : ajuste === 'o' || ajuste === 'no' || ajuste === 'so' ? -1 : 0;
  const sy = ajuste.startsWith('n') ? 1 : ajuste.startsWith('s') ? -1 : 0;
  const a = (angulo * Math.PI) / 180, u = (sx * w) / 2, v = (sy * h) / 2;
  return [c[0] + u * Math.cos(a) - v * Math.sin(a), c[1] + u * Math.sin(a) + v * Math.cos(a)];
}

const contornoDe = (p: Pick<PilarProposto, 'x' | 'y' | 'angulo' | 'ajuste' | 'secao'>): Pt[] => contornoPilar(p, p.secao);

function pertoDoContorno(q: Pt, poly: Pt[], tol: number): boolean {
  if (dentroPoligono(q, poly)) return true;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], z = poly[(i + 1) % poly.length], dx = z[0] - a[0], dy = z[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2));
    if (Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]) <= tol) return true;
  }
  return false;
}

type Reg = RegrasCamadas;

/**
 * Proposta de lançamento do gabarito `m` pelas regras `regras` (padrão: as da máscara ou as sugeridas).
 * Pilares em polilinhas fechadas (retângulo orientado ou círculo), vigas por faces (pares de linhas) ou por eixo,
 * contorno, aberturas, eixos e ponto fixo por camada. Coordenadas no mundo (m).
 */
export function propostaDeLancamento(b: Pick<BuildingModel, 'pilares' | 'vigas' | 'eixos' | 'lajes'>, m: Mascara, regras?: RegrasCamadas): Proposta {
  const R: Reg = regras ?? m.regras ?? sugerirRegras(m.geo, m.escala);
  const k = m.escala, tol = R.tolerancia;
  const W = (p: Pt): Pt => mascaraParaMundo({ escala: 1, rotacao: m.rotacao, dx: m.dx, dy: m.dy }, p[0], p[1]);
  const camadas = (papel: PapelCamada) => Object.entries(R.papeis).filter(([, p]) => p === papel).map(([n]) => n).filter((n) => m.geo[n]).sort();
  const aviso: string[] = [], ambiguos: Ambiguo[] = [], ign = new Map<string, IgnoradoProposta>();
  const ignora = (camada: string, motivo: string, n = 1) => { const c = `${camada}|${motivo}`; const e = ign.get(c) ?? { camada, motivo, quantidade: 0 }; e.quantidade += n; ign.set(c, e); };
  const existentes = new Set<string>([...b.pilares.map((x) => x.origemLancamento), ...b.vigas.map((x) => x.origemLancamento), ...b.eixos.map((x) => x.origemLancamento), ...b.lajes.map((x) => x.origemLancamento)].filter(Boolean) as string[]);
  const jaLancados: string[] = [];
  const novo = (o: string) => { if (existentes.has(o)) { if (!jaLancados.includes(o)) jaLancados.push(o); return false; } return true; };

  // textos de nome
  const textos = [...new Set([...camadas('texto'), ...camadas('pilar'), ...camadas('pilarParede'), ...camadas('eixo')])].flatMap((n) => geoEscalada(m.geo[n], k).textos).filter((t) => t.t);
  const usados = new Set<number>();
  const textoMaisProximo = (pts: Pt[], raio: number, aceita: (t: string) => boolean): string | undefined => {
    let melhor = -1, d = raio;
    textos.forEach((t, i) => { if (usados.has(i) || !aceita(t.t)) return; const dd = Math.min(...pts.map((p) => dist(p, [t.x, t.y]))); if (dd <= d) { d = dd; melhor = i; } });
    if (melhor < 0) return undefined;
    usados.add(melhor);
    return textos[melhor].t;
  };

  // ---- pilares ----
  const pil = new Map<string, PilarProposto & { c: Pt }>();
  for (const papel of ['pilar', 'pilarParede'] as const) for (const nome of camadas(papel)) {
    const g = geoEscalada(m.geo[nome], k);
    for (const cad of cadeiasDe(g.segs, tol)) {
      if (!cad.fechada) { ignora(nome, 'cadeia aberta em camada de pilar'); continue; }
      const q = retanguloDe(simplificarCadeia(cad.pontos, true, tol));
      if (!q) { ignora(nome, papel === 'pilarParede' ? 'pilar-parede não retangular (lançar pelo tipo de pilar-parede)' : 'polígono não retangular'); continue; }
      if (Math.max(q.b, q.h) > (papel === 'pilarParede' ? 5 : R.pilarMax) || Math.min(q.b, q.h) < 0.05) { ignora(nome, `dimensão fora do limite (${q.b.toFixed(2)} × ${q.h.toFixed(2)} m)`); continue; }
      const secao: SecaoPilar = { tipo: 'ret', b: +q.b.toFixed(3), h: +q.h.toFixed(3) };
      const o = chaveOrigem(m.nome, 'pilar', q.cx, q.cy, q.b, q.h, q.angulo);
      pil.set(o, { origem: o, x: q.cx, y: q.cy, c: [q.cx, q.cy], angulo: q.angulo, ajuste: 'c', secao, papel });
    }
    for (const c of circulosDe(g.arcos, tol)) {
      if (c.r * 2 > R.pilarMax || c.r * 2 < 0.1) { ignora(nome, 'círculo fora do limite de pilar'); continue; }
      const o = chaveOrigem(m.nome, 'pilarc', c.cx, c.cy, c.r);
      pil.set(o, { origem: o, x: c.cx, y: c.cy, c: [c.cx, c.cy], angulo: 0, ajuste: 'c', secao: { tipo: 'circ', d: +(2 * c.r).toFixed(3) }, papel });
    }
  }
  let pilares = [...pil.values()].sort((a, z) => a.c[1] - z.c[1] || a.c[0] - z.c[0]);

  // ponto fixo por camada: o ponto da seção dentro do polígono vira o ajuste
  const ajustados = new Set<string>();
  for (const nome of camadas('pontoFixo')) {
    const g = geoEscalada(m.geo[nome], k);
    const polis: Pt[][] = cadeiasDe(g.segs, tol).filter((c) => c.fechada).map((c) => c.pontos);
    for (const c of circulosDe(g.arcos, tol)) polis.push(arcoPontos(c.cx, c.cy, c.r, 0, 360, 15).slice(0, -1));
    const abertas = cadeiasDe(g.segs, tol).filter((c) => !c.fechada).length;
    if (abertas) ignora(nome, 'cadeia aberta em camada de ponto fixo', abertas);
    for (const poli of polis) {
      const cen: Pt = [poli.reduce((s, p) => s + p[0], 0) / poli.length, poli.reduce((s, p) => s + p[1], 0) / poli.length];
      let melhor: { p: (typeof pilares)[number]; aj: Ajuste; q: Pt; d: number } | null = null;
      for (const p of pilares) for (const aj of AJUSTES) {
        if (p.secao.tipo === 'circ' && aj.length === 2) continue;
        const q = pontoDoAjuste(p.c, p.angulo, p.secao, aj);
        if (!dentroPoligono(q, poli)) continue;
        const d = dist(q, cen);
        if (!melhor || d < melhor.d - 1e-12) melhor = { p, aj, q, d };
      }
      if (!melhor) { aviso.push(`Ponto fixo em (${W(cen).map((v) => String(+v.toFixed(2)).replace('.', ',')).join('; ')}) sem pilar correspondente.`); continue; }
      if (ajustados.has(melhor.p.origem)) { aviso.push(`Mais de um ponto fixo para o pilar em (${W(melhor.p.c).map((v) => String(+v.toFixed(2)).replace('.', ',')).join('; ')}); vale o primeiro.`); continue; }
      ajustados.add(melhor.p.origem);
      melhor.p.ajuste = melhor.aj;
      melhor.p.x = melhor.q[0];
      melhor.p.y = melhor.q[1];
    }
  }

  // nomes pelos textos mais próximos e passagem ao mundo
  const nomesVistos = new Set<string>();
  for (const p of pilares) {
    const ct = contornoDe({ ...p, x: p.c[0], y: p.c[1], ajuste: 'c' });
    const raio = R.raioTexto;
    const t = textoMaisProximo([p.c, ...ct], raio, (s) => NOME_VALIDO.test(s));
    if (t && !nomesVistos.has(t)) { p.nome = t; nomesVistos.add(t); }
  }

  // ambíguos entre pilares: um dentro do outro ou sobrepostos
  const porArea = [...pilares].sort((a, z) => Math.abs(areaPoligono(contornoDe({ ...z, x: z.c[0], y: z.c[1], ajuste: 'c' }))) - Math.abs(areaPoligono(contornoDe({ ...a, x: a.c[0], y: a.c[1], ajuste: 'c' }))));
  for (let i = 0; i < porArea.length; i++) for (let j = i + 1; j < porArea.length; j++) {
    const A = porArea[i], B = porArea[j];
    if (B.ambiguo || Math.hypot(A.c[0] - B.c[0], A.c[1] - B.c[1]) > Math.hypot(...dimsSecao(A.secao)) + Math.hypot(...dimsSecao(B.secao))) continue;
    const pa = contornoDe({ ...A, x: A.c[0], y: A.c[1], ajuste: 'c' }), pb = contornoDe({ ...B, x: B.c[0], y: B.c[1], ajuste: 'c' });
    if (!sobrepoe(pa, pb, 1e-4)) continue;
    const dentro = dentroPoligono(B.c, pa);
    B.ambiguo = dentro ? 'PILAR_DENTRO_DE_PILAR' : 'PILAR_SOBREPOSTO';
    ambiguos.push({ origem: B.origem, codigo: B.ambiguo, mensagem: dentro ? 'Pilar desenhado dentro de outro pilar (contorno duplicado ou hachura).' : 'Pilar sobreposto a outro pilar do gabarito.' });
  }

  // ---- vigas ----
  const vigas: VigaProposta[] = [];
  const pilarPolis = pilares.filter((p) => !p.ambiguo).map((p) => contornoDe({ ...p, x: p.c[0], y: p.c[1], ajuste: 'c' }));
  for (const nome of camadas('vigaFaces')) {
    const g = geoEscalada(m.geo[nome], k);
    const segs: [Pt, Pt][] = [];
    for (let i = 0; i + 3 < g.segs.length; i += 4) segs.push([[g.segs[i], g.segs[i + 1]], [g.segs[i + 2], g.segs[i + 3]]]);
    if (segs.length > 6000) { ignora(nome, 'camada grande demais para o pareamento (mais de 6000 segmentos)', segs.length); continue; }
    const pr = paresParalelos(segs, R.vigaFacesMin, R.vigaFacesMax, 0.2);
    const usadoIdx = new Set(pr.flatMap((p) => [p.i, p.j]));
    const soltas = segs.map((_, i) => i).filter((i) => !usadoIdx.has(i) && dist(segs[i][0], segs[i][1]) >= 0.2);
    for (const i of soltas) {
      const meio: Pt = [(segs[i][0][0] + segs[i][1][0]) / 2, (segs[i][0][1] + segs[i][1][1]) / 2];
      ambiguos.push({ codigo: 'LINHA_SOLTA', mensagem: `Linha sem par em “${nome}” perto de (${W(meio).map((v) => String(+v.toFixed(2)).replace('.', ',')).join('; ')}).` });
    }
    if (soltas.length) ignora(nome, 'linha sem par (viga por faces)', soltas.length);
    // une os trechos colineares interrompidos por pilares ou por outra viga
    type Peca = { a: Pt; z: Pt; e: number };
    let pecas: Peca[] = pr.map((p) => ({ a: p.a, z: p.z, e: p.e }));
    const ret = (p: Peca): Pt[] => { const L = dist(p.a, p.z) || 1, nx = (-(p.z[1] - p.a[1]) / L) * (p.e / 2), ny = ((p.z[0] - p.a[0]) / L) * (p.e / 2); return [[p.a[0] + nx, p.a[1] + ny], [p.z[0] + nx, p.z[1] + ny], [p.z[0] - nx, p.z[1] - ny], [p.a[0] - nx, p.a[1] - ny]]; };
    for (let mudou = true; mudou;) {
      mudou = false;
      outer: for (let i = 0; i < pecas.length; i++) for (let j = i + 1; j < pecas.length; j++) {
        const A = pecas[i], B = pecas[j];
        const L = dist(A.a, A.z);
        if (L < 1e-9) continue;
        const ux = (A.z[0] - A.a[0]) / L, uy = (A.z[1] - A.a[1]) / L;
        const LB = dist(B.a, B.z);
        if (LB < 1e-9 || Math.abs(((B.z[0] - B.a[0]) * uy - (B.z[1] - B.a[1]) * ux) / LB) > 1e-3 || Math.abs(A.e - B.e) > 0.01) continue;
        if (Math.abs((B.a[0] - A.a[0]) * -uy + (B.a[1] - A.a[1]) * ux) > tol) continue;
        const s = [A.a, A.z, B.a, B.z].map((q) => (q[0] - A.a[0]) * ux + (q[1] - A.a[1]) * uy);
        const iA = [Math.min(s[0], s[1]), Math.max(s[0], s[1])], iB = [Math.min(s[2], s[3]), Math.max(s[2], s[3])];
        const gap = Math.max(iA[0], iB[0]) - Math.min(iA[1], iB[1]);
        let junta = gap <= tol;
        if (!junta && gap <= 1.5) {
          const t = (Math.min(iA[1], iB[1]) + Math.max(iA[0], iB[0])) / 2;
          const mid: Pt = [A.a[0] + ux * t, A.a[1] + uy * t];
          junta = pilarPolis.some((pp) => pertoDoContorno(mid, pp, 0.05)) || pecas.some((o, q) => q !== i && q !== j && pertoDoContorno(mid, ret(o), 0.05));
        }
        if (!junta) continue;
        const lo = Math.min(iA[0], iB[0]), hi = Math.max(iA[1], iB[1]);
        const nova: Peca = { a: [A.a[0] + ux * lo, A.a[1] + uy * lo], z: [A.a[0] + ux * hi, A.a[1] + uy * hi], e: (A.e + B.e) / 2 };
        pecas = pecas.filter((_, q) => q !== i && q !== j);
        pecas.push(nova);
        mudou = true;
        break outer;
      }
    }
    for (const p of pecas) {
      const e = +p.e.toFixed(3);
      const dir = p.a[0] < p.z[0] - 1e-9 || (Math.abs(p.a[0] - p.z[0]) <= 1e-9 && p.a[1] < p.z[1]) ? [p.a, p.z] : [p.z, p.a];
      const o = chaveOrigem(m.nome, 'viga', dir[0][0], dir[0][1], dir[1][0], dir[1][1], e);
      vigas.push({ origem: o, pontos: [dir[0], dir[1]], secao: { b: e, h: R.alturaViga }, alinhamento: 'centro' });
    }
  }
  for (const nome of camadas('vigaEixo')) {
    const g = geoEscalada(m.geo[nome], k);
    for (const c of cadeiasDe(g.segs, tol)) {
      if (c.fechada) c.pontos.push(c.pontos[0]);
      const rev = c.pontos[0][0] > c.pontos[c.pontos.length - 1][0] + 1e-9 || (Math.abs(c.pontos[0][0] - c.pontos[c.pontos.length - 1][0]) <= 1e-9 && c.pontos[0][1] > c.pontos[c.pontos.length - 1][1]);
      const pts = rev ? [...c.pontos].reverse() : c.pontos;
      if (dist(pts[0], pts[pts.length - 1]) < 0.2 && !c.fechada) { ignora(nome, 'linha de eixo curta demais'); continue; }
      vigas.push({ origem: chaveOrigem(m.nome, 'vigae', ...pts.flat()), pontos: pts, secao: { b: R.larguraViga, h: R.alturaViga }, alinhamento: 'centro' });
    }
    for (let i = 0; i + 4 < g.arcos.length; i += 5) {
      if (circulosDe(g.arcos.slice(i, i + 5), tol).length) { ignora(nome, 'círculo em camada de viga'); continue; }
      const pts = arcoPontos(g.arcos[i], g.arcos[i + 1], g.arcos[i + 2], g.arcos[i + 3], g.arcos[i + 4]);
      vigas.push({ origem: chaveOrigem(m.nome, 'vigaa', g.arcos[i], g.arcos[i + 1], g.arcos[i + 2], g.arcos[i + 3], g.arcos[i + 4]), pontos: pts, secao: { b: R.larguraViga, h: R.alturaViga }, alinhamento: 'centro' });
    }
  }
  // vigas sobrepostas (colineares com trecho comum): a segunda é ambígua
  for (let i = 0; i < vigas.length; i++) for (let j = i + 1; j < vigas.length; j++) {
    const A = vigas[i], B = vigas[j];
    if (A.pontos.length !== 2 || B.pontos.length !== 2 || B.ambiguo) continue;
    const L = dist(A.pontos[0], A.pontos[1]);
    if (L < 1e-9) continue;
    const ux = (A.pontos[1][0] - A.pontos[0][0]) / L, uy = (A.pontos[1][1] - A.pontos[0][1]) / L;
    const LB = dist(B.pontos[0], B.pontos[1]);
    if (LB < 1e-9 || Math.abs(((B.pontos[1][0] - B.pontos[0][0]) * uy - (B.pontos[1][1] - B.pontos[0][1]) * ux) / LB) > 1e-3) continue;
    if (Math.abs((B.pontos[0][0] - A.pontos[0][0]) * -uy + (B.pontos[0][1] - A.pontos[0][1]) * ux) > 0.02) continue;
    const s = B.pontos.map((q) => (q[0] - A.pontos[0][0]) * ux + (q[1] - A.pontos[0][1]) * uy);
    const comum = Math.min(L, Math.max(s[0], s[1])) - Math.max(0, Math.min(s[0], s[1]));
    if (comum > 0.05) { B.ambiguo = 'VIGA_SOBREPOSTA'; ambiguos.push({ origem: B.origem, codigo: 'VIGA_SOBREPOSTA', mensagem: 'Viga sobreposta a outra viga do gabarito.' }); }
  }

  // ---- eixos ----
  const eixos: EixoProposto[] = [];
  for (const nome of camadas('eixo')) {
    const g = geoEscalada(m.geo[nome], k);
    for (const c of cadeiasDe(g.segs, tol)) for (let i = 0; i + 1 < c.pontos.length; i++) {
      const a = c.pontos[i], z = c.pontos[i + 1];
      if (dist(a, z) < 1) { ignora(nome, 'eixo com menos de 1 m'); continue; }
      const t = textoMaisProximo([a, z], R.raioTexto, (s) => s.length <= 12);
      const [p1, p2] = a[0] < z[0] - 1e-9 || (Math.abs(a[0] - z[0]) <= 1e-9 && a[1] < z[1]) ? [a, z] : [z, a];
      eixos.push({ origem: chaveOrigem(m.nome, 'eixo', p1[0], p1[1], p2[0], p2[1]), nome: t ?? `E${eixos.length + 1}`, p1, p2 });
    }
  }

  // alinha o centro dos pilares aos eixos (tolerância de 1 cm)
  for (const p of pilares) for (const e of eixos) {
    const L = dist(e.p1, e.p2), dd = ((p.x - e.p1[0]) * -(e.p2[1] - e.p1[1]) + (p.y - e.p1[1]) * (e.p2[0] - e.p1[0])) / L;
    if (Math.abs(dd) > 1e-6 && Math.abs(dd) <= 0.01) { p.x -= (dd * -(e.p2[1] - e.p1[1])) / L; p.y -= (dd * (e.p2[0] - e.p1[0])) / L; break; }
  }

  // ---- contorno e aberturas ----
  let contorno: ContornoProposto | null = null;
  const contornos: ContornoProposto[] = [];
  for (const nome of camadas('contorno')) {
    const g = geoEscalada(m.geo[nome], k);
    const fech = cadeiasDe(g.segs, tol).filter((c) => c.fechada);
    const abertas = cadeiasDe(g.segs, tol).length - fech.length;
    if (abertas) ignora(nome, 'cadeia aberta em camada de contorno', abertas);
    for (const c of fech) contornos.push({ origem: chaveOrigem(m.nome, 'contorno', ...c.pontos.flat()), pontos: c.pontos, area: Math.abs(areaPoligono(c.pontos)) });
  }
  contornos.sort((a, z) => z.area - a.area);
  if (contornos.length) {
    contorno = contornos[0];
    for (const c of contornos.slice(1)) ambiguos.push({ origem: c.origem, codigo: 'CONTORNO_MULTIPLO', mensagem: `Outro contorno fechado (${String(+c.area.toFixed(1)).replace('.', ',')} m²): vale o maior.` });
  }
  const aberturas: AberturaProposta[] = [];
  for (const nome of camadas('abertura')) {
    const g = geoEscalada(m.geo[nome], k);
    const cs = cadeiasDe(g.segs, tol);
    for (const c of cs) {
      if (!c.fechada) { ignora(nome, 'cadeia aberta em camada de abertura'); continue; }
      aberturas.push({ origem: chaveOrigem(m.nome, 'abertura', ...c.pontos.flat()), pontos: c.pontos });
    }
    for (const c of circulosDe(g.arcos, tol)) aberturas.push({ origem: chaveOrigem(m.nome, 'aberturac', c.cx, c.cy, c.r), pontos: arcoPontos(c.cx, c.cy, c.r, 0, 360, 15).slice(0, -1) });
  }
  for (const nome of camadas('parede')) ignora(nome, 'paredes: lançar pela alvenaria da máscara (carga.alvenariaDaMascara)');

  // ---- saída no mundo, sem o que já foi lançado ----
  const mundo = (pts: Pt[]) => pts.map((q) => W(q).map((v) => +v.toFixed(4)) as Pt);
  const livre = <T extends { origem: string }>(l: T[]) => l.filter((x) => novo(x.origem));
  const outPil: PilarProposto[] = livre(pilares).map((p) => {
    const [x, y] = W([p.x, p.y]);
    const { c: _c, ...resto } = p;
    return { ...resto, x: +x.toFixed(4), y: +y.toFixed(4), angulo: +((((p.angulo + m.rotacao) % 360) + 360) % 360).toFixed(6) };
  });
  const outVig: VigaProposta[] = livre(vigas).map((v) => ({ ...v, pontos: mundo(v.pontos) }));
  const outEix = livre(eixos).map((e) => ({ ...e, p1: W(e.p1).map((v) => +v.toFixed(4)) as Pt, p2: W(e.p2).map((v) => +v.toFixed(4)) as Pt }));
  const outAb = livre(aberturas).map((a) => ({ ...a, pontos: mundo(a.pontos) }));
  const outCont = contorno && novo(contorno.origem) ? { ...contorno, pontos: mundo(contorno.pontos) } : null;
  const origensFora = new Set(jaLancados);
  const ambFinal = ambiguos.filter((a) => !a.origem || !origensFora.has(a.origem));
  const ignorados = [...ign.values()];
  return {
    mascara: m.nome, pilares: outPil, vigas: outVig, eixos: outEix, aberturas: outAb, contorno: outCont, lajeH: R.lajeH,
    ambiguos: ambFinal, ignorados, avisos: aviso, jaLancados,
    contagens: { pilares: outPil.length, vigas: outVig.length, eixos: outEix.length, aberturas: outAb.length, contorno: outCont ? 1 : 0, ambiguos: ambFinal.length, ignorados: ignorados.reduce((s, x) => s + x.quantidade, 0), jaLancados: jaLancados.length },
  };
}

// ---- vigas pelo clique no gabarito (C6.63) ----

export interface VigaDoClique { pontos: Pt[]; alinhamento: 'esq' | 'centro' | 'dir'; origem: string }

/**
 * Vigas geradas por um clique no gabarito do grupo: a linha, o arco ou a polilinha mais próxima do clique (até `raio`)
 * vira uma série de vigas, uma por trecho reto (arco: uma viga poligonal). Modo `face`: a linha é a face oposta ao
 * `cursor` (o corpo da viga fica do lado do cursor); modo `eixo`: a linha é o eixo [a confirmar]. Coordenadas do mundo.
 */
export function vigasDoClique(b: Pick<BuildingModel, 'mascaras'>, grupo: string, ponto: Pt, cursor: Pt, modo: 'face' | 'eixo', raio = 0.3): VigaDoClique[] {
  const { segs, arcos } = geometriaMascara(b, grupo, true);
  const n = segs.length / 4;
  let melhorD = raio, tipo: 'seg' | 'arco' | null = null;
  const dSeg = (i: number) => { const ax = segs[4 * i], ay = segs[4 * i + 1], dx = segs[4 * i + 2] - ax, dy = segs[4 * i + 3] - ay, l2 = dx * dx + dy * dy; const t = l2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((ponto[0] - ax) * dx + (ponto[1] - ay) * dy) / l2)); return Math.hypot(ax + t * dx - ponto[0], ay + t * dy - ponto[1]); };
  for (let i = 0; i < n; i++) { const d = dSeg(i); if (d <= melhorD) { melhorD = d; tipo = 'seg'; } }
  let ia = -1;
  const angNoArco = (a: number, a0: number, a1: number) => { let sw = a1 - a0; while (sw <= 0) sw += 360; let dd = a - a0; while (dd < 0) dd += 360; while (dd >= 360) dd -= 360; return dd <= sw; };
  for (let k = 0; k + 4 < arcos.length; k += 5) {
    const ang = (Math.atan2(ponto[1] - arcos[k + 1], ponto[0] - arcos[k]) * 180) / Math.PI;
    if (!angNoArco(ang, arcos[k + 3], arcos[k + 4])) continue;
    const d = Math.abs(Math.hypot(ponto[0] - arcos[k], ponto[1] - arcos[k + 1]) - arcos[k + 2]);
    if (d <= melhorD) { melhorD = d; tipo = 'arco'; ia = k; }
  }
  if (!tipo) return [];
  const lado = (a: Pt, z: Pt): 'esq' | 'centro' | 'dir' => {
    if (modo === 'eixo') return 'centro';
    const cr = (z[0] - a[0]) * (cursor[1] - a[1]) - (z[1] - a[1]) * (cursor[0] - a[0]);
    return cr > 0 ? 'dir' : 'esq'; // cursor à esquerda: a linha é a face direita (o corpo vai para a esquerda)
  };
  const r4 = (p: Pt): Pt => [+p[0].toFixed(4), +p[1].toFixed(4)];
  const saida: VigaDoClique[] = [];
  if (tipo === 'arco') {
    const [cx, cy, r, a0, a1] = [arcos[ia], arcos[ia + 1], arcos[ia + 2], arcos[ia + 3], arcos[ia + 4]];
    const pts = arcoPontos(cx, cy, r, a0, a1).map(r4);
    const fora = Math.hypot(cursor[0] - cx, cursor[1] - cy) > r;
    saida.push({ pontos: pts, alinhamento: modo === 'eixo' ? 'centro' : fora ? 'esq' : 'dir', origem: chaveOrigem('clique', 'arco', cx, cy, r, a0, a1, modo, fora ? 1 : 0) });
    return saida;
  }
  const cad = cadeiaClique(segs, ponto, raio);
  if (!cad) return [];
  const pts = cad.pontos, nn = pts.length;
  const trechos = cad.fechada ? nn : nn - 1;
  for (let i = 0; i < trechos; i++) {
    const a = pts[i], z = pts[(i + 1) % nn];
    if (dist(a, z) < 0.05) continue;
    const al = lado(a, z);
    saida.push({ pontos: [r4(a), r4(z)], alinhamento: al, origem: chaveOrigem('clique', 'seg', a[0], a[1], z[0], z[1], modo, al) });
  }
  return saida;
}

/** Cadeia da geometria `segs` (mundo) que contém o segmento mais próximo de `p`. */
function cadeiaClique(segs: number[], p: Pt, raio: number): CadeiaL | null {
  const cads = cadeiasDe(segs, 0.002);
  let melhor: { c: CadeiaL; d: number } | null = null;
  for (const c of cads) {
    const nn = c.pontos.length, tr = c.fechada ? nn : nn - 1;
    for (let i = 0; i < tr; i++) {
      const a = c.pontos[i], z = c.pontos[(i + 1) % nn], dx = z[0] - a[0], dy = z[1] - a[1], l2 = dx * dx + dy * dy;
      const t = l2 < 1e-18 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
      const d = Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
      if (d <= raio && (!melhor || d < melhor.d)) melhor = { c, d };
    }
  }
  return melhor?.c ?? null;
}

// ---- gabaritos e vistas (C2.5 a C2.19) ----

/** Vistas (máscaras) que aparecem no pavimento: as do grupo dele, visíveis ou não. */
export const vistasDoGrupo = (b: Pick<BuildingModel, 'mascaras'>, grupo: string) => b.mascaras.filter((m) => mascaraNoGrupo(m, grupo));

/** Configuração de camadas de uma máscara, no formato do arquivo `.json` salvo e reaberto (C2.13). */
export interface ConfiguracaoCamadas {
  versao: 1;
  camadas: { nome: string; visivel: boolean; capturavel: boolean; cor?: string; apelido?: string; espessura?: number; textos?: boolean }[];
  regras?: RegrasCamadas;
}
export function configuracaoDaMascara(m: Pick<Mascara, 'camadas' | 'regras'>): ConfiguracaoCamadas {
  return { versao: 1, camadas: m.camadas.map((c) => ({ ...c })), ...(m.regras ? { regras: JSON.parse(JSON.stringify(m.regras)) as RegrasCamadas } : {}) };
}
/** Texto JSON da configuração é válido? Devolve a configuração ou a mensagem de erro. */
export function lerConfiguracao(texto: string): ConfiguracaoCamadas | string {
  let o: unknown;
  try { o = JSON.parse(texto); } catch { return 'O arquivo não é um JSON válido.'; }
  const c = o as ConfiguracaoCamadas;
  if (!c || c.versao !== 1 || !Array.isArray(c.camadas)) return 'Arquivo de configuração de camadas inválido (versão 1 esperada).';
  if (c.camadas.some((x) => !x || typeof x.nome !== 'string' || typeof x.visivel !== 'boolean' || typeof x.capturavel !== 'boolean')) return 'Camada inválida na configuração.';
  return c;
}
