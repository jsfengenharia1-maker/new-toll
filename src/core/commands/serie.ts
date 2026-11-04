// Lançamento em série (aba Modificar do Revit como inspiração de comportamento): pilares nos cruzamentos dos eixos,
// vigas nos eixos e matriz (linear e polar) de pilares, vigas, lajes e cargas. Núcleo puro; a interface só monta os parâmetros.
import { centroNoLance, contornoNoLance, pavimentosDoGrupo, pavimentosOrdenados, type Ajuste, type BuildingModel, type Eixo, type Laje, type Pilar, type SecaoPilar, type Viga } from '../building/types';
import { pilaresSobrepostos, refsPilar } from '../building/pilares';
import { pilaresQueChegam, proximaViga } from '../building/vigas';
import type { Diagnostico } from '../building/verify';
import { dentroPoligono } from '../geom/faces';
import { pilarTransformado, rotacao, validarSelecao, type Transf } from './edicao';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

type P = [number, number];
const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const r6 = (v: number) => +v.toFixed(6);
const r9 = (v: number) => +v.toFixed(9);
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const lista: JsonSchema = { type: 'array', items: { type: 'string' } };
const EPS = 1e-9;

// ---------------------------------------------------------------------------------------------------------------
// Geometria dos eixos
// ---------------------------------------------------------------------------------------------------------------

/** Interseção dos segmentos a→b e c→d: parâmetros t (em a→b) e u (em c→d) e o ponto; null se paralelos ou disjuntos. */
function secante(a: P, b: P, c: P, d: P): { t: number; u: number; p: P } | null {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12 * (Math.hypot(rx, ry) * Math.hypot(sx, sy) || 1)) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { t, u, p: [a[0] + t * rx, a[1] + t * ry] };
}

export interface Cruzamento { ponto: P; eixos: string[] }

/** Cruzamentos entre os eixos indicados (ou todos), ordenados por y e depois x; eixos concorrentes no mesmo ponto geram um só. */
export function cruzamentosDosEixos(b: Pick<BuildingModel, 'eixos'>, ids?: string[]): Cruzamento[] {
  const es = ids?.length ? b.eixos.filter((e) => ids.includes(e.id)) : b.eixos;
  const out: Cruzamento[] = [];
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const s = secante(es[i].p1, es[i].p2, es[j].p1, es[j].p2);
    if (!s) continue;
    const p: P = [r6(s.p[0]), r6(s.p[1])];
    const ja = out.find((c) => Math.hypot(c.ponto[0] - p[0], c.ponto[1] - p[1]) < 1e-5);
    if (ja) { for (const id of [es[i].id, es[j].id]) if (!ja.eixos.includes(id)) ja.eixos.push(id); } else out.push({ ponto: p, eixos: [es[i].id, es[j].id] });
  }
  return out.sort((a, z) => a.ponto[1] - z.ponto[1] || a.ponto[0] - z.ponto[0]);
}

// ---------------------------------------------------------------------------------------------------------------
// Pilares nos cruzamentos
// ---------------------------------------------------------------------------------------------------------------

export interface ParamsPilaresNosEixos { eixos?: string[]; secao: SecaoPilar; ajuste?: Ajuste; angulo?: number; nasce?: string; morre?: string }

/** Pilares a criar (id provisório) e cruzamentos pulados porque já há pilar (ou seção sobreposta). */
export function planejarPilaresNosEixos(b: BuildingModel, p: ParamsPilaresNosEixos): { novos: Pilar[]; pulados: P[] } {
  const nasce = p.nasce ?? 'fundacao', morre = p.morre ?? pavimentosOrdenados(b).at(-1)?.id ?? '';
  const novos: Pilar[] = [], pulados: P[] = [];
  let tmp = b;
  for (const c of cruzamentosDosEixos(b, p.eixos)) {
    const q: Pilar = { id: `?${novos.length}`, nome: '?', x: c.ponto[0], y: c.ponto[1], angulo: p.angulo ?? 0, ajuste: p.ajuste ?? 'c', nasce, morre, secao: JSON.parse(JSON.stringify(p.secao)) };
    if (pilaresSobrepostos(tmp, q).length) { pulados.push(c.ponto); continue; }
    novos.push(q);
    tmp = { ...tmp, pilares: [...tmp.pilares, q] };
  }
  return { novos, pulados };
}

const secaoPilarSchema: JsonSchema = { type: 'object', description: 'Seção: {tipo: "ret", b, h} ou {tipo: "circ", d}, em m' };

registrar<ParamsPilaresNosEixos>({
  nome: 'pilar.nosEixos',
  descricao: 'Lança um pilar em cada cruzamento dos eixos indicados (padrão: todos os eixos da obra), com a seção, o ponto fixo e o ângulo informados. Cruzamentos onde já há pilar (seção sobreposta) são pulados e contados na mensagem.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['secao'], properties: {
    eixos: { ...lista, description: 'ids dos eixos (mínimo dois); omitido = todos' },
    secao: secaoPilarSchema,
    ajuste: { type: 'string', enum: ['c', 'n', 's', 'l', 'o', 'ne', 'no', 'se', 'so'], default: 'c', description: 'Ponto fixo da seção no cruzamento' },
    angulo: { type: 'number', default: 0, description: 'graus, anti-horário' },
    nasce: { type: 'string', description: '"fundacao" (padrão) ou id do pavimento' },
    morre: { type: 'string', description: 'id do pavimento mais alto; padrão: o mais alto da obra' },
  } },
  validar(b, p) {
    const falta = (p.eixos ?? []).filter((id) => !b.eixos.some((e) => e.id === id));
    if (falta.length) return err('EIXO_INEXISTENTE', `Eixo(s) inexistente(s): ${falta.join(', ')}.`);
    if (p.eixos?.length === 1) return err('EIXOS_INSUFICIENTES', 'Selecione ao menos dois eixos: o pilar nasce no cruzamento entre eles.');
    const nasce = p.nasce ?? 'fundacao', morre = p.morre ?? pavimentosOrdenados(b).at(-1)?.id ?? '';
    const ref = refsPilar(b, nasce, morre);
    if (ref.length) return ref;
    if (!cruzamentosDosEixos(b, p.eixos).length) return err('SEM_CRUZAMENTOS', 'Os eixos não se cruzam (paralelos ou sem interseção).');
    return planejarPilaresNosEixos(b, p).novos.length ? [] : err('CRUZAMENTOS_OCUPADOS', 'Todos os cruzamentos já têm pilar.');
  },
  aplicar(d, p) {
    const { novos, pulados } = planejarPilaresNosEixos(d as BuildingModel, p);
    let n = Math.max(0, ...d.pilares.map((q) => { const m = /^P(\d+)$/.exec(q.nome); return m ? +m[1] : 0; })) + 1;
    for (const q of novos) d.pilares.push({ ...q, id: `p_${(++d.seq).toString(36)}`, nome: `P${n++}` });
    const aviso = pulados.length ? ` ${pulados.length} cruzamento(s) pulado(s) por já haver pilar: ${pulados.map((q) => `(${fmt(q[0])}; ${fmt(q[1])})`).join(', ')}.` : '';
    return `${novos.length} pilar(es) lançado(s) nos cruzamentos dos eixos.${aviso}`;
  },
});

// ---------------------------------------------------------------------------------------------------------------
// Vigas nos eixos
// ---------------------------------------------------------------------------------------------------------------

interface Apoio { t: number; ponto: P; tipo: 'pilar' | 'viga'; id: string; ini: number; fim: number }

/** Apoios que o eixo cruza no grupo, em ordem: pilares (ponto = centro projetado no eixo) e vigas transversais (ponto = cruzamento). */
export function apoiosDoEixo(b: BuildingModel, grupo: string, e: Pick<Eixo, 'p1' | 'p2'>): Apoio[] {
  const pav = pavimentosDoGrupo(b, grupo)[0];
  const L = Math.hypot(e.p2[0] - e.p1[0], e.p2[1] - e.p1[1]);
  if (!pav || L < 1e-9) return [];
  const ux = (e.p2[0] - e.p1[0]) / L, uy = (e.p2[1] - e.p1[1]) / L;
  const tDe = (q: P) => ((q[0] - e.p1[0]) * ux + (q[1] - e.p1[1]) * uy) / L;
  const out: Apoio[] = [];
  for (const q of pilaresQueChegam(b, pav.id)) {
    const poly = contornoNoLance(q, pav.id);
    const ts: number[] = [];
    for (let i = 0; i < poly.length; i++) { const s = secante(e.p1, e.p2, poly[i], poly[(i + 1) % poly.length]); if (s) ts.push(s.t); }
    if (dentroPoligono(e.p1, poly)) ts.push(0);
    if (dentroPoligono(e.p2, poly)) ts.push(1);
    if (!ts.length) continue;
    const c = centroNoLance(q, pav.id), t = Math.min(1, Math.max(0, tDe(c)));
    out.push({ t, ponto: [r6(e.p1[0] + t * (e.p2[0] - e.p1[0])), r6(e.p1[1] + t * (e.p2[1] - e.p1[1]))], tipo: 'pilar', id: q.id, ini: Math.min(...ts), fim: Math.max(...ts) });
  }
  const tolT = 0.05 / L;
  for (const v of b.vigas.filter((x) => x.grupo === grupo)) for (let i = 0; i + 1 < v.pontos.length; i++) {
    const s = secante(e.p1, e.p2, v.pontos[i], v.pontos[i + 1]);
    if (!s) continue;
    if (out.some((a) => a.tipo === 'pilar' && s.t >= a.ini - tolT && s.t <= a.fim + tolT)) continue; // a viga chega num pilar já contado
    if (out.some((a) => Math.abs(a.t - s.t) < 1e-7)) continue;
    out.push({ t: s.t, ponto: [r6(s.p[0]), r6(s.p[1])], tipo: 'viga', id: v.id, ini: s.t, fim: s.t });
  }
  return out.sort((a, z) => a.t - z.t);
}

/** O trecho a→z já está coberto por uma viga do grupo paralela ao eixo (o ponto médio cai sobre ela)? */
function trechoCoberto(b: BuildingModel, grupo: string, a: P, z: P): boolean {
  const m: P = [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2], L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1;
  for (const v of b.vigas.filter((x) => x.grupo === grupo)) for (let i = 0; i + 1 < v.pontos.length; i++) {
    const c = v.pontos[i], f = v.pontos[i + 1], sx = f[0] - c[0], sy = f[1] - c[1], S = Math.hypot(sx, sy);
    if (S < 1e-9 || Math.abs(sx * (z[1] - a[1]) - sy * (z[0] - a[0])) / (S * L) > 1e-6) continue; // não paralela
    const u = ((m[0] - c[0]) * sx + (m[1] - c[1]) * sy) / (S * S);
    if (u < -1e-9 || u > 1 + 1e-9) continue;
    if (Math.hypot(c[0] + u * sx - m[0], c[1] + u * sy - m[1]) < 0.02) return true;
  }
  return false;
}

export interface ViganoEixo { eixo: string; pontos: [P, P]; apoios: [string, string] }

/** Vigas a criar: uma por eixo (contínua do primeiro ao último apoio); trechos já cobertos por viga existente a interrompem. */
export function planejarVigasNosEixos(b: BuildingModel, grupo: string, ids?: string[]): { vigas: ViganoEixo[]; semApoio: string[] } {
  const es = ids?.length ? b.eixos.filter((e) => ids.includes(e.id)) : b.eixos;
  const vigas: ViganoEixo[] = [], semApoio: string[] = [];
  for (const e of es) {
    const ap = apoiosDoEixo(b, grupo, e);
    if (ap.length < 2) { semApoio.push(e.nome); continue; }
    let ini = -1, algum = false;
    for (let i = 0; i < ap.length; i++) {
      const livre = i + 1 < ap.length && !trechoCoberto(b, grupo, ap[i].ponto, ap[i + 1].ponto);
      if (livre && ini < 0) ini = i;
      if (ini >= 0 && (!livre || i + 1 === ap.length)) {
        const fim = livre ? i + 1 : i;
        if (fim > ini && Math.hypot(ap[fim].ponto[0] - ap[ini].ponto[0], ap[fim].ponto[1] - ap[ini].ponto[1]) > 0.05) { vigas.push({ eixo: e.id, pontos: [ap[ini].ponto, ap[fim].ponto], apoios: [ap[ini].id, ap[fim].id] }); algum = true; }
        ini = -1;
      }
    }
    if (!algum) semApoio.push(e.nome);
  }
  return { vigas, semApoio };
}

registrar<{ grupo: string; eixos?: string[]; secao: { b: number; h: number } }>({
  nome: 'viga.nosEixos',
  descricao: 'Lança uma viga por eixo no grupo (planta), contínua do primeiro ao último apoio que o eixo cruza (pilares que chegam ao pavimento e vigas transversais), com alinhamento pelo eixo. Trechos já cobertos por uma viga existente não são repetidos.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'secao'], properties: {
    grupo: { type: 'string' },
    eixos: { ...lista, description: 'ids dos eixos; omitido = todos' },
    secao: { type: 'object', additionalProperties: false, required: ['b', 'h'], properties: { b: { type: 'number', exclusiveMinimum: 0, maximum: 3, description: 'largura (m)' }, h: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'altura (m)' } } },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const falta = (p.eixos ?? []).filter((id) => !b.eixos.some((e) => e.id === id));
    if (falta.length) return err('EIXO_INEXISTENTE', `Eixo(s) inexistente(s): ${falta.join(', ')}.`);
    if (!b.eixos.length) return err('SEM_EIXOS', 'A obra não tem eixos.');
    const { vigas, semApoio } = planejarVigasNosEixos(b, p.grupo, p.eixos);
    return vigas.length ? [] : err('SEM_TRECHOS', `Nenhum trecho livre entre apoios${semApoio.length ? ` (eixos sem dois apoios ou já cobertos: ${semApoio.join(', ')})` : ''}.`);
  },
  aplicar(d, p) {
    const { vigas, semApoio } = planejarVigasNosEixos(d as BuildingModel, p.grupo, p.eixos);
    const nomes: string[] = [];
    for (const v of vigas) {
      const nome = `V${proximaViga(d as BuildingModel, p.grupo)}`;
      d.vigas.push({ id: `v_${(++d.seq).toString(36)}`, nome, grupo: p.grupo, pontos: [[...v.pontos[0]], [...v.pontos[1]]], secao: { ...p.secao }, alinhamento: 'centro' });
      nomes.push(nome);
    }
    return `${nomes.join(', ')} lançada(s) nos eixos.${semApoio.length ? ` Sem trecho livre: ${semApoio.join(', ')}.` : ''}`;
  },
});

// ---------------------------------------------------------------------------------------------------------------
// Matriz linear e polar
// ---------------------------------------------------------------------------------------------------------------

type Selecao = { pilares?: string[]; vigas?: string[]; lajes?: string[]; cargas?: string[] };

export interface ParamsMatriz extends Selecao {
  modo: 'linear' | 'polar';
  /** Linear: ponto base e ponto de direção. `referencia` diz o que o destino representa: o passo entre cópias ou a posição da última cópia. */
  base?: P;
  destino?: P;
  referencia?: 'passo' | 'ultimo';
  /** Polar: centro e ângulo (graus, anti-horário). `tipoAngulo`: total (até a última cópia; 360° ou mais divide o círculo em cópias + 1 posições) ou entre cópias. */
  centro?: P;
  angulo?: number;
  tipoAngulo?: 'total' | 'entre';
  copias?: number;
}

const translacao = (dx: number, dy: number): Transf => ({ ponto: ([x, y]) => [r9(x + dx), r9(y + dy)], angulo: (a) => a, reflete: false });

/** Passo angular (graus) entre cópias consecutivas da matriz polar. */
export function passoPolar(angulo: number, tipo: 'total' | 'entre', copias: number): number {
  if (tipo === 'entre') return angulo;
  return Math.abs(angulo) >= 360 - 1e-9 ? angulo / (copias + 1) : angulo / copias;
}

/** Transformação de cada cópia (k = 1..copias) da matriz. */
export function transformacoesMatriz(p: ParamsMatriz): Transf[] {
  const n = Math.max(1, Math.round(p.copias ?? 1)), out: Transf[] = [];
  if (p.modo === 'linear') {
    const b = p.base ?? [0, 0], z = p.destino ?? [0, 0];
    const f = p.referencia === 'ultimo' ? n : 1, dx = (z[0] - b[0]) / f, dy = (z[1] - b[1]) / f;
    for (let k = 1; k <= n; k++) out.push(translacao(k * dx, k * dy));
  } else {
    const passo = passoPolar(p.angulo ?? 0, p.tipoAngulo ?? 'total', n);
    for (let k = 1; k <= n; k++) out.push(rotacao(p.centro ?? [0, 0], k * passo));
  }
  return out;
}

const total = (p: Selecao) => (p.pilares?.length ?? 0) + (p.vigas?.length ?? 0) + (p.lajes?.length ?? 0) + (p.cargas?.length ?? 0);
const proximaLaje = (b: BuildingModel, g: string) => Math.max(0, ...b.lajes.filter((l) => l.grupo === g).map((l) => { const m = /^L(\d+)$/.exec(l.nome); return m ? +m[1] : 0; })) + 1;
/** Dados de projeto da laje que a cópia leva; armadura editada, punção, planos e vínculos a outros elementos ficam de fora. */
const CAMPOS_LAJE = ['definir', 'furosBorda', 'nivel', 'vigotasBiapoiadas', 'cobrimento', 'opcoes', 'tabela', 'exposicao', 'momentosMin', 'insercao', 'espessuraDefinir'] as const;

registrar<ParamsMatriz>({
  nome: 'editar.matriz',
  descricao: 'Matriz de cópias de pilares, vigas, lajes e cargas. Linear: de `base` a `destino`, com `copias` cópias; `referencia` "passo" = o vetor base→destino é o passo entre cópias, "ultimo" = é a posição da última cópia (cópias igualmente espaçadas). Polar: em torno de `centro`, com `angulo` total (até a última cópia) ou entre cópias; as cópias giram junto. Os originais ficam; as cópias recebem os próximos números. Lajes levam tipo e dados de cálculo (sem armadura editada).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['modo'], properties: {
    pilares: lista, vigas: lista, lajes: lista, cargas: lista,
    modo: { type: 'string', enum: ['linear', 'polar'] },
    base: ponto, destino: ponto,
    referencia: { type: 'string', enum: ['passo', 'ultimo'], default: 'passo' },
    centro: ponto,
    angulo: { type: 'number', minimum: -3600, maximum: 3600, description: 'graus, anti-horário' },
    tipoAngulo: { type: 'string', enum: ['total', 'entre'], default: 'total' },
    copias: { type: 'integer', minimum: 1, maximum: 100, default: 1 },
  } },
  validar(b, p) {
    const e = validarSelecao(b, p);
    if (e.length) return e;
    if (p.modo === 'linear') {
      if (!p.base || !p.destino) return err('MATRIZ_PONTOS', 'A matriz linear precisa de `base` e `destino`.');
      if (Math.hypot(p.destino[0] - p.base[0], p.destino[1] - p.base[1]) < 1e-6) return err('DESLOCAMENTO_NULO', 'Informe um deslocamento.');
    } else {
      if (!p.centro) return err('MATRIZ_CENTRO', 'A matriz polar precisa de `centro`.');
      if (p.angulo === undefined || Math.abs(p.angulo) < 1e-9) return err('ANGULO_NULO', 'Informe um ângulo diferente de zero.');
    }
    const ts = transformacoesMatriz(p), ids = p.pilares ?? [];
    if (!ids.length) return [];
    const novos: Pilar[] = [];
    ts.forEach((t, k) => ids.forEach((id) => novos.push({ ...pilarTransformado(b.pilares.find((x) => x.id === id)!, t), id: `${id}#${k + 1}` })));
    const tmp = { ...b, pilares: [...b.pilares, ...novos] };
    for (const n of novos) {
      const sob = pilaresSobrepostos(tmp, n);
      if (sob.length) return err('PILAR_SOBREPOSTO', `Uma cópia de ${n.nome} ficaria sobre ${sob.map((x) => x.nome.replace(/#.*/, '')).join(', ')}.`, [n.id.replace(/#\d+$/, ''), ...sob.map((x) => x.id)]);
    }
    return [];
  },
  aplicar(d, p) {
    const ts = transformacoesMatriz(p);
    const clone = <T,>(x: T) => JSON.parse(JSON.stringify(x)) as T;
    const pils = (p.pilares ?? []).map((id) => clone(d.pilares.find((x) => x.id === id)!));
    const vgs = (p.vigas ?? []).map((id) => clone(d.vigas.find((x) => x.id === id)!));
    const ljs = (p.lajes ?? []).map((id) => clone(d.lajes.find((x) => x.id === id)!));
    const cgs = (p.cargas ?? []).map((id) => clone(d.cargas.find((x) => x.id === id)!));
    let num = Math.max(0, ...d.pilares.map((q) => { const m = /^P(\d+)$/.exec(q.nome); return m ? +m[1] : 0; })) + 1;
    for (const t of ts) {
      for (const q of pils) { const n: Pilar = { ...pilarTransformado(q, t), id: `p_${(++d.seq).toString(36)}`, nome: `P${num++}` }; delete n.armaduras; d.pilares.push(n); }
      for (const v of vgs) {
        const nova: Viga = { ...v, id: `v_${(++d.seq).toString(36)}`, nome: `V${proximaViga(d as BuildingModel, v.grupo)}`, pontos: v.pontos.map((q) => t.ponto(q as P)) };
        delete nova.comum; delete nova.comumDe;
        d.vigas.push(nova);
      }
      for (const l of ljs) {
        const nova: Laje = { id: `l_${(++d.seq).toString(36)}`, nome: `L${proximaLaje(d as BuildingModel, l.grupo)}`, grupo: l.grupo, contorno: l.contorno.map((q) => t.ponto(q as P)), tipo: clone(l.tipo) };
        for (const c of CAMPOS_LAJE) if (l[c] !== undefined) (nova as unknown as Record<string, unknown>)[c] = clone(l[c]);
        if (l.furos) nova.furos = l.furos.map((f) => f.map((q) => t.ponto(q as P)));
        if (l.direcao !== undefined) nova.direcao = t.angulo(l.direcao);
        if (l.engasteBordas) nova.engasteBordas = [...l.engasteBordas];
        d.lajes.push(nova);
      }
      for (const c of cgs) {
        const nova = { ...c, id: `c_${(++d.seq).toString(36)}`, pontos: c.pontos.map((q) => t.ponto(q as P)) };
        delete nova.origem; delete nova.escada;
        d.cargas.push(nova);
      }
    }
    return `${total(p) * ts.length} cópia(s) criada(s) na matriz ${p.modo === 'linear' ? 'linear' : 'polar'}.`;
  },
});
