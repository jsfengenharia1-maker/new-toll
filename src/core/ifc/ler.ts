// Leitura de IFC (L3, C1.22 e C1.23): converte o que o web-ifc entrega (linhas STEP) em dados neutros em metros, sem
// referência ao parser: pavimentos (IfcBuildingStorey), pilares, vigas, lajes, paredes, materiais e relatório de classes.
// O núcleo não importa o web-ifc: recebe um objeto com a interface `ApiIfc` (a classe IfcAPI, já inicializada), carregado
// de public/vendor sob demanda pelo app (src/core/ifc/web.ts) ou da devDependency nos testes.
// IFC2x3 e IFC4. Unidades pelo IfcProject (prefixos SI e unidades convertidas); posicionamento por IfcLocalPlacement aninhados.
import { IDENT, angulo180, areaComSinal, comoRetangulo, direcao, envoltoriaConvexa, inversa, limparPoligono, matrizEixo2, matrizEixo3, mul, ponto, retanguloMinimo, unit, type M4, type P2, type V3 } from './geom';

/** O que o núcleo usa do IfcAPI do web-ifc. */
export interface ApiIfc {
  OpenModel(dados: Uint8Array, configuracao?: Record<string, unknown>): number;
  CloseModel(modelo: number): void;
  GetModelSchema(modelo: number): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GetLine(modelo: number, id: number, achatar?: boolean): any;
  GetLineIDsWithType(modelo: number, tipo: number, incluirHerdados?: boolean): { size(): number; get(i: number): number };
  GetTypeCodeFromName(nome: string): number;
  GetNameFromTypeCode(tipo: number): string;
  GetFlatMesh?(modelo: number, id: number, escala?: boolean): { geometries: { size(): number; get(i: number): { geometryExpressID: number; flatTransformation: number[] } }; delete?(): void };
  GetGeometry?(modelo: number, id: number): { GetVertexData(): number; GetVertexDataSize(): number; delete?(): void };
  GetVertexArray?(ptr: number, tamanho: number): Float32Array;
}

export type SecaoIfc = { tipo: 'ret'; b: number; h: number } | { tipo: 'circ'; d: number };

export interface AvisoIfc { codigo: string; mensagem: string; /** GlobalId do elemento. */ origem?: string }

interface ElementoBase {
  id: number; globalId: string; nome: string; classe: string;
  /** Id (express) do IfcBuildingStorey; null = sem pavimento identificado. */
  pavimento: number | null;
  /** Nomes dos materiais ligados ao elemento (próprios ou do tipo) e classes de resistência lidas de propriedades. */
  materiais: string[];
  /** Geometria obtida da malha triangulada (caixa envolvente), não de uma extrusão: aviso IFC_APROXIMADO. */
  aproximado?: boolean;
}
export interface ColunaIfc extends ElementoBase { tipo: 'coluna'; x: number; y: number; angulo: number; secao: SecaoIfc; z0: number; z1: number }
export interface VigaIfc extends ElementoBase { tipo: 'viga'; pontos: P2[]; b: number; h: number; zTopo: number }
export interface LajeIfc extends ElementoBase { tipo: 'laje'; predefinido: string | null; contorno: P2[]; furos: P2[][]; espessura: number; zTopo: number }
export interface ParedeIfc extends ElementoBase { tipo: 'parede'; pontos: P2[]; espessura: number; z0: number; z1: number }
export interface OutroIfc { id: number; globalId: string; nome: string; classe: string; pavimento: number | null; materiais: string[] }
export interface PavimentoIfc { id: number; globalId: string; nome: string; /** Cota do piso (m). */ cota: number }
export interface MaterialIfc {
  nome: string;
  /** Classe de resistência do concreto lida do nome ou da propriedade (MPa). */
  fck?: number;
  aco?: 'CA-50' | 'CA-60';
  /** Propriedade do arquivo que deu o valor (texto para mostrar ao lado). */
  propriedade?: string;
  /** Elementos que usam o material, por tipo. */
  usos: { coluna: number; viga: number; laje: number; parede: number; outros: number };
}
export interface IfcLido {
  esquema: string;
  /** Metros por unidade de comprimento do arquivo. */
  unidade: number;
  projeto: string | null;
  edificio: string | null;
  pavimentos: PavimentoIfc[];
  colunas: ColunaIfc[];
  vigas: VigaIfc[];
  lajes: LajeIfc[];
  paredes: ParedeIfc[];
  outros: OutroIfc[];
  materiais: MaterialIfc[];
  /** Contagem por classe IFC (inclui subtipos) dos elementos de interesse. */
  classes: Record<string, number>;
  avisos: AvisoIfc[];
}

// ---- utilitários de valor ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;
const ehRef = (x: R) => !!x && typeof x === 'object' && x.type === 5 && typeof x.value === 'number';
export const num = (x: R): number | undefined => {
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
  if (!x || typeof x !== 'object' || ehRef(x)) return undefined;
  if (typeof x._representationValue === 'number') return x._representationValue;
  return typeof x.value === 'number' ? x.value : undefined;
};
export const txt = (x: R): string | undefined => (typeof x === 'string' ? x : x && typeof x === 'object' && typeof x.value === 'string' ? x.value : undefined);
const lista = (x: R): R[] => (Array.isArray(x) ? x : x == null ? [] : [x]);

const PREFIXOS: Record<string, number> = { EXA: 1e18, PETA: 1e15, TERA: 1e12, GIGA: 1e9, MEGA: 1e6, KILO: 1e3, HECTO: 1e2, DECA: 10, DECI: 0.1, CENTI: 0.01, MILLI: 1e-3, MICRO: 1e-6, NANO: 1e-9 };

/** Classes consultadas para o relatório (nome IFC → rótulo curto). Subtipos entram pela herança do web-ifc. */
const CLASSES_RELATORIO = ['IFCCOLUMN', 'IFCBEAM', 'IFCSLAB', 'IFCWALL', 'IFCMEMBER', 'IFCSTAIRFLIGHT', 'IFCSTAIR', 'IFCRAMPFLIGHT', 'IFCFOOTING', 'IFCPILE', 'IFCPLATE', 'IFCROOF', 'IFCCURTAINWALL'];
const FCK_NOME = /(?:^|[^A-Za-z0-9])C\s?(\d{2,3})(?:\s?\/\s?\d{2,3})?(?![A-Za-z0-9])/;
const FCK_ROTULO = /fck\s*[=:]?\s*(\d{2,3})/i;
const ACO_NOME = /(?:^|[^A-Za-z0-9])CA\s?-?\s?(50|60)(?![A-Za-z0-9])/i;
/** Classe de concreto de um texto ("Concreto C30", "C30/37", "fck 30"): MPa; fora de 15 a 120 = não reconhecido. */
export function fckDoTexto(t: string): number | undefined {
  const m = FCK_NOME.exec(t) ?? FCK_ROTULO.exec(t);
  const v = m ? +m[1] : NaN;
  return v >= 15 && v <= 120 ? v : undefined;
}
export function acoDoTexto(t: string): 'CA-50' | 'CA-60' | undefined {
  const m = ACO_NOME.exec(t);
  return m ? (`CA-${m[1]}` as 'CA-50' | 'CA-60') : undefined;
}

interface Perfil { pts: P2[]; furos: P2[][]; circ?: { c: P2; r: number }; ret?: boolean }
interface Solido { m: M4; perfil: Perfil; dir: V3; prof: number }
interface Corpo { solidos: Solido[]; eixo: V3[] | null }

class Leitor {
  private cache = new Map<number, R>();
  private lugares = new Map<number, M4>();
  esc = 1;
  avisos: AvisoIfc[] = [];
  readonly api: ApiIfc;
  readonly m: number;
  constructor(api: ApiIfc, m: number) { this.api = api; this.m = m; }

  ent(id: number): R | null {
    if (this.cache.has(id)) return this.cache.get(id);
    let e: R = null;
    try { e = this.api.GetLine(this.m, id, false) ?? null; } catch { e = null; }
    this.cache.set(id, e);
    return e;
  }
  r(x: R): R | null { return ehRef(x) ? this.ent(x.value) : null; }
  rs(x: R): R[] { return lista(x).map((y) => this.r(y)).filter(Boolean); }
  ids(nome: string, herdados = false): number[] {
    const t = this.api.GetTypeCodeFromName(nome);
    if (!t) return [];
    const v = this.api.GetLineIDsWithType(this.m, t, herdados);
    const o: number[] = [];
    for (let i = 0; i < v.size(); i++) o.push(v.get(i));
    return o;
  }
  tipo(e: R): string { try { return String(this.api.GetNameFromTypeCode(e.type)).toUpperCase(); } catch { return ''; } }
  aviso(codigo: string, mensagem: string, origem?: string) { this.avisos.push({ codigo, mensagem, ...(origem ? { origem } : {}) }); }

  // ---- unidades ----
  fatorComprimento(): number {
    const proj = this.ids('IFCPROJECT')[0];
    const p = proj === undefined ? null : this.ent(proj);
    const ua = p ? this.r(p.UnitsInContext) : null;
    for (const un of this.rs(ua?.Units)) {
      const f = this.fatorUnidade(un);
      if (f !== null) return f;
    }
    return 1;
  }
  private fatorUnidade(un: R): number | null {
    const t = this.tipo(un);
    if (t === 'IFCSIUNIT') {
      if (txt(un.UnitType) !== 'LENGTHUNIT') return null;
      return PREFIXOS[txt(un.Prefix) ?? ''] ?? 1;
    }
    if (t === 'IFCCONVERSIONBASEDUNIT') {
      if (txt(un.UnitType) !== 'LENGTHUNIT') return null;
      const mu = this.r(un.ConversionFactor);
      const base = mu ? this.r(mu.UnitComponent) : null;
      return (num(mu?.ValueComponent) ?? 1) * (base ? this.fatorUnidade(base) ?? 1 : 1);
    }
    return null;
  }

  // ---- posicionamento ----
  private coord(e: R): V3 {
    const c = lista(e?.Coordinates).map(num);
    return [(c[0] ?? 0) * this.esc, (c[1] ?? 0) * this.esc, (c[2] ?? 0) * this.esc];
  }
  private dirv(e: R): V3 | null {
    const c = lista(e?.DirectionRatios).map(num);
    return c.length >= 2 ? [c[0] ?? 0, c[1] ?? 0, c[2] ?? 0] : null;
  }
  eixo3(e: R | null): M4 {
    if (!e) return IDENT;
    if (this.tipo(e) === 'IFCAXIS2PLACEMENT2D') return this.eixo2(e);
    return matrizEixo3(this.coord(this.r(e.Location)), this.dirv(this.r(e.Axis)), this.dirv(this.r(e.RefDirection)));
  }
  eixo2(e: R | null): M4 {
    if (!e) return IDENT;
    const c = this.coord(this.r(e.Location));
    const d = this.dirv(this.r(e.RefDirection));
    return matrizEixo2([c[0], c[1]], d ? [d[0], d[1]] : null);
  }
  lugar(id: number | null, profundidade = 0): M4 {
    if (id === null || profundidade > 40) return IDENT;
    const c = this.lugares.get(id);
    if (c) return c;
    const e = this.ent(id);
    let m = IDENT;
    if (e && this.tipo(e) === 'IFCLOCALPLACEMENT') {
      const rel = ehRef(e.PlacementRelTo) ? e.PlacementRelTo.value : null;
      m = mul(this.lugar(rel, profundidade + 1), this.eixo3(this.r(e.RelativePlacement)));
    } else if (e) this.aviso('IFC_POSICAO_NAO_SUPORTADA', `Posicionamento ${this.tipo(e)} não suportado; assumida a origem.`);
    this.lugares.set(id, m);
    return m;
  }
  /** Operador de transformação cartesiano (IfcMappedItem.MappingTarget). */
  private operador(e: R | null): M4 {
    if (!e) return IDENT;
    const o = this.coord(this.r(e.LocalOrigin));
    const e1 = this.dirv(this.r(e.Axis1)), e3 = this.dirv(this.r(e.Axis3));
    const s = num(e.Scale) ?? 1;
    const m = matrizEixo3(o, e3, e1);
    return [m[0] * s, m[1] * s, m[2] * s, m[3], m[4] * s, m[5] * s, m[6] * s, m[7], m[8] * s, m[9] * s, m[10] * s, m[11], 0, 0, 0, 1];
  }

  // ---- curvas e perfis ----
  curva(c: R | null): P2[] | null {
    if (!c) return null;
    const t = this.tipo(c);
    if (t === 'IFCPOLYLINE') {
      const p = this.rs(c.Points).map((q) => { const v = this.coord(q); return [v[0], v[1]] as P2; });
      return p.length >= 2 ? p : null;
    }
    if (t === 'IFCINDEXEDPOLYCURVE') {
      const l = this.r(c.Points);
      const cl = lista(l?.CoordList).map((q) => lista(q).map(num));
      if (!cl.length) return null;
      return cl.map((q) => [(q[0] ?? 0) * this.esc, (q[1] ?? 0) * this.esc] as P2);
    }
    return null;
  }
  perfil(p: R | null): Perfil | null {
    if (!p) return null;
    const t = this.tipo(p);
    const pos = p.Position ? this.eixo2(this.r(p.Position)) : IDENT;
    const ap = (q: P2): P2 => { const w = ponto(pos, [q[0], q[1], 0]); return [w[0], w[1]]; };
    if (t === 'IFCRECTANGLEPROFILEDEF' || t === 'IFCROUNDEDRECTANGLEPROFILEDEF' || t === 'IFCRECTANGLEHOLLOWPROFILEDEF') {
      const x = (num(p.XDim) ?? 0) * this.esc / 2, y = (num(p.YDim) ?? 0) * this.esc / 2;
      if (x <= 0 || y <= 0) return null;
      return { pts: ([[-x, -y], [x, -y], [x, y], [-x, y]] as P2[]).map(ap), furos: [], ret: true };
    }
    if (t === 'IFCCIRCLEPROFILEDEF' || t === 'IFCCIRCLEHOLLOWPROFILEDEF') {
      const r = (num(p.Radius) ?? 0) * this.esc;
      if (r <= 0) return null;
      const c = ap([0, 0]);
      const pts: P2[] = [];
      for (let i = 0; i < 32; i++) { const a = (2 * Math.PI * i) / 32; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
      return { pts, furos: [], circ: { c, r } };
    }
    if (t === 'IFCARBITRARYCLOSEDPROFILEDEF' || t === 'IFCARBITRARYPROFILEDEFWITHVOIDS') {
      const ext = this.curva(this.r(p.OuterCurve));
      if (!ext) return null;
      const furos = t === 'IFCARBITRARYPROFILEDEFWITHVOIDS' ? this.rs(p.InnerCurves).map((c) => this.curva(c)).filter((c): c is P2[] => !!c).map((c) => limparPoligono(c.map(ap))) : [];
      const pts = limparPoligono(ext.map(ap));
      return pts.length >= 3 ? { pts, furos: furos.filter((f) => f.length >= 3) } : null;
    }
    return null;
  }

  // ---- representação ----
  private itens(it: R | null, M: M4, saida: Corpo, prof = 0): void {
    if (!it || prof > 12) return;
    const t = this.tipo(it);
    if (t === 'IFCEXTRUDEDAREASOLID' || t === 'IFCEXTRUDEDAREASOLIDTAPERED') {
      const pf = this.perfil(this.r(it.SweptArea));
      const d = this.dirv(this.r(it.ExtrudedDirection)) ?? [0, 0, 1];
      const pos = it.Position ? this.eixo3(this.r(it.Position)) : IDENT;
      if (pf) saida.solidos.push({ m: mul(M, pos), perfil: pf, dir: d, prof: (num(it.Depth) ?? 0) * this.esc });
      else this.aviso('IFC_PERFIL_NAO_SUPORTADO', `Perfil ${this.tipo(this.r(it.SweptArea) ?? {})} não suportado; usada a malha triangulada.`);
    } else if (t === 'IFCMAPPEDITEM') {
      const fonte = this.r(it.MappingSource);
      const origem = fonte?.MappingOrigin ? this.eixo3(this.r(fonte.MappingOrigin)) : IDENT;
      const alvo = this.operador(this.r(it.MappingTarget));
      const rep = this.r(fonte?.MappedRepresentation);
      for (const i of this.rs(rep?.Items)) this.itens(i, mul(M, mul(alvo, inversa(origem))), saida, prof + 1);
    } else if (t === 'IFCBOOLEANCLIPPINGRESULT' || t === 'IFCBOOLEANRESULT') {
      this.itens(this.r(it.FirstOperand), M, saida, prof + 1);
    }
  }
  corpo(el: R): Corpo {
    const saida: Corpo = { solidos: [], eixo: null };
    const def = this.r(el.Representation);
    const W = this.lugar(ehRef(el.ObjectPlacement) ? el.ObjectPlacement.value : null);
    for (const rep of this.rs(def?.Representations)) {
      const id = txt(rep.RepresentationIdentifier);
      if (id === 'Axis') {
        for (const i of this.rs(rep.Items)) {
          const c = this.curva(i);
          if (c && !saida.eixo) saida.eixo = c.map((q) => ponto(W, [q[0], q[1], this.coordZ(i)]));
        }
      } else if (id === 'Body' || id === undefined || id === 'Facetation') {
        for (const i of this.rs(rep.Items)) this.itens(i, W, saida);
      }
    }
    return saida;
  }
  private coordZ(curva: R): number {
    if (this.tipo(curva) !== 'IFCPOLYLINE') return 0;
    const p = this.r(lista(curva.Points)[0]);
    return p ? this.coord(p)[2] : 0;
  }

  /** Vértices da malha triangulada do elemento no mundo (m); vazio se o web-ifc não gerar geometria. */
  malha(id: number): V3[] {
    const a = this.api;
    if (!a.GetFlatMesh || !a.GetGeometry || !a.GetVertexArray) return [];
    const saida: V3[] = [];
    try {
      const fm = a.GetFlatMesh(this.m, id, true);
      for (let i = 0; i < fm.geometries.size(); i++) {
        const pg = fm.geometries.get(i);
        const g = a.GetGeometry(this.m, pg.geometryExpressID);
        const v = a.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize());
        const t = pg.flatTransformation;
        for (let k = 0; k + 5 < v.length; k += 6) {
          const x = v[k], y = v[k + 1], z = v[k + 2];
          // o web-ifc entrega a malha com Y para cima (x, z, -y): volta ao referencial do IFC (z para cima)
          const X = t[0] * x + t[4] * y + t[8] * z + t[12], Y = t[1] * x + t[5] * y + t[9] * z + t[13], Z = t[2] * x + t[6] * y + t[10] * z + t[14];
          saida.push([X, -Z, Y]);
        }
        g.delete?.();
      }
      fm.delete?.();
    } catch { return []; }
    return saida;
  }
}

// ---- interpretação ----

const mundo = (s: Solido, p: P2): V3 => ponto(s.m, [p[0], p[1], 0]);
const xy = (p: V3): P2 => [p[0], p[1]];
const dedup = (p: P2[]): P2[] => { const o: P2[] = []; for (const q of p) if (!o.length || Math.hypot(q[0] - o.at(-1)![0], q[1] - o.at(-1)![1]) > 1e-6) o.push(q); return o; };

/** Resultado geométrico de um elemento a partir dos sólidos (ou da malha) antes de virar coluna, viga, laje ou parede. */
function colunaDe(s: Solido, base: ElementoBase, av: (c: string, m: string) => void): ColunaIfc | null {
  const dw = unit(direcao(s.m, s.dir));
  if (Math.abs(dw[2]) < 0.7) { av('IFC_PILAR_NAO_VERTICAL', `Pilar ${base.nome} não é vertical (extrusão fora do eixo Z); ignorado.`); return null; }
  const z0 = ponto(s.m, [0, 0, 0])[2], z1 = z0 + dw[2] * s.prof;
  const zmin = Math.min(z0, z1), zmax = Math.max(z0, z1);
  const c: Omit<ColunaIfc, 'x' | 'y' | 'angulo' | 'secao'> = { ...base, tipo: 'coluna', z0: zmin, z1: zmax };
  if (s.perfil.circ) {
    const ce = xy(mundo(s, s.perfil.circ.c));
    return { ...c, x: ce[0], y: ce[1], angulo: 0, secao: { tipo: 'circ', d: 2 * s.perfil.circ.r } };
  }
  const pw = s.perfil.pts.map((q) => xy(mundo(s, q)));
  const ret = comoRetangulo(pw);
  if (ret) {
    // perfil retangular: b = XDim ao longo do eixo local x (fiel ao arquivo); polígono qualquer: b no lado que faz o menor
    // ângulo com x (módulo 90°), como no lançamento por DXF
    let { l1: b, l2: h, angulo: ang } = ret;
    if (!s.perfil.ret) {
      const q = Math.round(ang / 90);
      ang -= 90 * q;
      if (Math.abs(q) % 2 === 1) [b, h] = [h, b];
    }
    return { ...c, x: ret.centro[0], y: ret.centro[1], angulo: +angulo180(ang).toFixed(9), secao: { tipo: 'ret', b, h } };
  }
  const mr = retanguloMinimo(pw);
  if (!mr) return null;
  av('IFC_APROXIMADO', `Seção do pilar ${base.nome} substituída pelo retângulo envolvente (${(mr.a * 100).toFixed(1)} × ${(mr.b * 100).toFixed(1)} cm).`);
  return { ...c, aproximado: true, x: mr.centro[0], y: mr.centro[1], angulo: angulo180(mr.angulo), secao: { tipo: 'ret', b: mr.a, h: mr.b } };
}

function vigaDe(s: Solido, eixo: V3[] | null, base: ElementoBase, av: (c: string, m: string) => void): VigaIfc | null {
  const dw = unit(direcao(s.m, s.dir));
  if (Math.abs(dw[2]) > 0.7) { av('IFC_VIGA_VERTICAL', `Viga ${base.nome} com extrusão vertical; ignorada.`); return null; }
  const cs = s.perfil.pts.map((q) => mundo(s, q));
  const c0 = cs.reduce((a, q) => [a[0] + q[0] / cs.length, a[1] + q[1] / cs.length, a[2] + q[2] / cs.length] as V3, [0, 0, 0] as V3);
  const h = Math.hypot(dw[0], dw[1]);
  const n: P2 = [-dw[1] / h, dw[0] / h];
  const lat = cs.map((q) => q[0] * n[0] + q[1] * n[1]);
  const ver = cs.map((q) => q[2]);
  const b = Math.max(...lat) - Math.min(...lat), alt = Math.max(...ver) - Math.min(...ver);
  const area = Math.abs(areaComSinal(s.perfil.pts));
  const retoAlinhado = Math.abs(area - b * alt) <= 0.02 * Math.max(area, 1e-9);
  const p1: V3 = [c0[0], c0[1], c0[2]];
  const p2: V3 = [p1[0] + dw[0] * s.prof, p1[1] + dw[1] * s.prof, p1[2] + dw[2] * s.prof];
  const pontos = dedup((eixo && eixo.length >= 2 ? eixo : [p1, p2]).map(xy));
  if (pontos.length < 2) return null;
  const zTopo = Math.max(...ver, ...ver.map((v) => v + dw[2] * s.prof));
  if (!retoAlinhado) av('IFC_APROXIMADO', `Seção da viga ${base.nome} substituída pelo retângulo envolvente (${(b * 100).toFixed(1)} × ${(alt * 100).toFixed(1)} cm).`);
  return { ...base, ...(retoAlinhado ? {} : { aproximado: true }), tipo: 'viga', pontos, b, h: alt, zTopo };
}

function lajeDe(s: Solido, base: ElementoBase, predefinido: string | null, av: (c: string, m: string) => void): LajeIfc | null {
  const dw = unit(direcao(s.m, s.dir));
  if (Math.abs(dw[2]) < 0.7) { av('IFC_LAJE_NAO_HORIZONTAL', `Laje ${base.nome} com extrusão fora da vertical; ignorada.`); return null; }
  const orienta = (p: P2[], antihor: boolean) => (areaComSinal(p) < 0 === antihor ? [...p].reverse() : p);
  const contorno = orienta(limparPoligono(s.perfil.pts.map((q) => xy(mundo(s, q)))), true);
  if (contorno.length < 3) return null;
  const z0 = ponto(s.m, [0, 0, 0])[2];
  return {
    ...base, tipo: 'laje', predefinido, contorno,
    furos: s.perfil.furos.map((f) => orienta(limparPoligono(f.map((q) => xy(mundo(s, q)))), false)),
    espessura: Math.abs(dw[2]) * s.prof, zTopo: Math.max(z0, z0 + dw[2] * s.prof),
  };
}

function paredeDe(s: Solido, eixo: V3[] | null, base: ElementoBase, av: (c: string, m: string) => void): ParedeIfc | null {
  const dw = unit(direcao(s.m, s.dir));
  if (Math.abs(dw[2]) < 0.7) { av('IFC_PAREDE_NAO_VERTICAL', `Parede ${base.nome} com extrusão fora da vertical; ignorada.`); return null; }
  const mr = retanguloMinimo(s.perfil.pts.map((q) => xy(mundo(s, q))));
  if (!mr) return null;
  const z0 = ponto(s.m, [0, 0, 0])[2], z1 = z0 + dw[2] * s.prof;
  const c = Math.cos(mr.angulo * Math.PI / 180), sn = Math.sin(mr.angulo * Math.PI / 180);
  const pontos: P2[] = eixo && eixo.length >= 2 ? dedup(eixo.map(xy)) : [[mr.centro[0] - c * mr.a / 2, mr.centro[1] - sn * mr.a / 2], [mr.centro[0] + c * mr.a / 2, mr.centro[1] + sn * mr.a / 2]];
  return { ...base, tipo: 'parede', pontos, espessura: mr.b, z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
}

/** Geometria pela malha: retângulo envolvente em planta e extensão vertical. */
function porMalha(v: V3[]) {
  if (v.length < 3) return null;
  const pl = v.map(xy);
  const mr = retanguloMinimo(pl);
  const z = v.map((q) => q[2]);
  return mr ? { mr, hull: envoltoriaConvexa(pl), zmin: Math.min(...z), zmax: Math.max(...z) } : null;
}

const NOME_PAVIMENTO = (e: R, i: number) => txt(e.Name) || txt(e.LongName) || `Pavimento ${i + 1}`;

export function lerIfc(api: ApiIfc, dados: Uint8Array): IfcLido {
  const modelo = api.OpenModel(dados);
  if (typeof modelo !== 'number' || modelo < 0) throw new Error('Não foi possível abrir o arquivo IFC (formato inválido).');
  try { return interpretar(new Leitor(api, modelo)); } finally { try { api.CloseModel(modelo); } catch { /* modelo já fechado */ } }
}

function interpretar(L: Leitor): IfcLido {
  const esquema = L.api.GetModelSchema(L.m) || 'IFC4';
  L.esc = L.fatorComprimento();
  const projEnt = L.ids('IFCPROJECT')[0];
  const projeto = projEnt === undefined ? null : txt(L.ent(projEnt)?.Name) ?? null;
  const bldEnt = L.ids('IFCBUILDING')[0];
  const edificio = bldEnt === undefined ? null : txt(L.ent(bldEnt)?.Name) ?? null;

  // pavimentos
  const pavs: PavimentoIfc[] = L.ids('IFCBUILDINGSTOREY').map((id, i) => {
    const e = L.ent(id)!;
    const el = num(e.Elevation);
    const cota = el !== undefined ? el * L.esc : ponto(L.lugar(ehRef(e.ObjectPlacement) ? e.ObjectPlacement.value : null), [0, 0, 0])[2];
    return { id, globalId: txt(e.GlobalId) ?? `#${id}`, nome: NOME_PAVIMENTO(e, i), cota: +cota.toFixed(6) };
  }).sort((a, b) => a.cota - b.cota || a.id - b.id);
  const pavIds = new Set(pavs.map((p) => p.id));

  // contenção espacial e decomposição
  const contido = new Map<number, number>();
  for (const id of L.ids('IFCRELCONTAINEDINSPATIALSTRUCTURE')) {
    const rel = L.ent(id)!;
    const alvo = ehRef(rel.RelatingStructure) ? rel.RelatingStructure.value : -1;
    if (!pavIds.has(alvo)) continue;
    for (const x of lista(rel.RelatedElements)) if (ehRef(x)) contido.set(x.value, alvo);
  }
  const pai = new Map<number, number>();
  for (const id of L.ids('IFCRELAGGREGATES')) {
    const rel = L.ent(id)!;
    const o = ehRef(rel.RelatingObject) ? rel.RelatingObject.value : -1;
    for (const x of lista(rel.RelatedObjects)) if (ehRef(x)) pai.set(x.value, o);
  }
  const pavimentoDe = (id: number): number | null => {
    for (let k = 0, x: number | undefined = id; x !== undefined && k < 12; k++, x = pai.get(x)) { const p = contido.get(x); if (p !== undefined) return p; if (pavIds.has(x)) return x; }
    return null;
  };

  // vazios (aberturas das lajes)
  const vazios = new Map<number, number[]>();
  for (const id of L.ids('IFCRELVOIDSELEMENT')) {
    const rel = L.ent(id)!;
    if (ehRef(rel.RelatingBuildingElement) && ehRef(rel.RelatedOpeningElement)) {
      const k = rel.RelatingBuildingElement.value;
      vazios.set(k, [...(vazios.get(k) ?? []), rel.RelatedOpeningElement.value]);
    }
  }

  // materiais e propriedades
  const nomesMat = (m: R | null, prof = 0): string[] => {
    if (!m || prof > 6) return [];
    const t = L.tipo(m);
    if (t === 'IFCMATERIAL') return [txt(m.Name) ?? ''].filter(Boolean);
    if (t === 'IFCMATERIALLIST') return L.rs(m.Materials).flatMap((x) => nomesMat(x, prof + 1));
    if (t === 'IFCMATERIALLAYER' || t === 'IFCMATERIALPROFILE' || t === 'IFCMATERIALCONSTITUENT') return nomesMat(L.r(m.Material), prof + 1);
    if (t === 'IFCMATERIALLAYERSETUSAGE') return nomesMat(L.r(m.ForLayerSet), prof + 1);
    if (t === 'IFCMATERIALLAYERSET') return L.rs(m.MaterialLayers).flatMap((x) => nomesMat(x, prof + 1));
    if (t === 'IFCMATERIALPROFILESETUSAGE') return nomesMat(L.r(m.ForProfileSet), prof + 1);
    if (t === 'IFCMATERIALPROFILESET') return L.rs(m.MaterialProfiles).flatMap((x) => nomesMat(x, prof + 1));
    if (t === 'IFCMATERIALCONSTITUENTSET') return L.rs(m.MaterialConstituents).flatMap((x) => nomesMat(x, prof + 1));
    return [];
  };
  const materialDe = new Map<number, string[]>();
  for (const id of L.ids('IFCRELASSOCIATESMATERIAL')) {
    const rel = L.ent(id)!;
    const nomes = nomesMat(L.r(rel.RelatingMaterial));
    for (const x of lista(rel.RelatedObjects)) if (ehRef(x) && nomes.length) materialDe.set(x.value, [...(materialDe.get(x.value) ?? []), ...nomes]);
  }
  const tipoDe = new Map<number, number>();
  for (const id of L.ids('IFCRELDEFINESBYTYPE')) {
    const rel = L.ent(id)!;
    if (!ehRef(rel.RelatingType)) continue;
    for (const x of lista(rel.RelatedObjects)) if (ehRef(x)) tipoDe.set(x.value, rel.RelatingType.value);
  }
  // propriedades que informam a resistência: do elemento (Pset) e do material
  const lePropriedades = (props: R[]): string[] => {
    const o: string[] = [];
    for (const p of props) {
      const nome = (txt(p.Name) ?? '').toLowerCase();
      const v = p.NominalValue;
      if (nome === 'strengthclass' && txt(v)) o.push(txt(v)!);
      else if (nome === 'compressivestrength' && num(v) !== undefined) { const x = num(v)!; o.push(`fck ${Math.round(x >= 1e5 ? x / 1e6 : x)}`); }
      else if (nome === 'reinforcementstrengthclass' && txt(v)) o.push(txt(v)!);
    }
    return o;
  };
  const propsDe = new Map<number, string[]>();
  for (const id of L.ids('IFCRELDEFINESBYPROPERTIES')) {
    const rel = L.ent(id)!;
    const def = L.r(rel.RelatingPropertyDefinition);
    if (!def || L.tipo(def) !== 'IFCPROPERTYSET') continue;
    const l = lePropriedades(L.rs(def.HasProperties));
    if (l.length) for (const x of lista(rel.RelatedObjects)) if (ehRef(x)) propsDe.set(x.value, [...(propsDe.get(x.value) ?? []), ...l]);
  }
  const propMaterial = new Map<string, string[]>();
  for (const nome of ['IFCMATERIALPROPERTIES', 'IFCEXTENDEDMATERIALPROPERTIES']) for (const id of L.ids(nome)) {
    const e = L.ent(id)!;
    const mat = L.r(e.Material);
    const nm = mat ? txt(mat.Name) : undefined;
    const l = lePropriedades(L.rs(e.Properties ?? e.ExtendedProperties));
    if (nm && l.length) propMaterial.set(nm, [...(propMaterial.get(nm) ?? []), ...l]);
  }
  const materiaisDe = (id: number): string[] => {
    const proprios = materialDe.get(id) ?? (tipoDe.has(id) ? materialDe.get(tipoDe.get(id)!) : undefined) ?? [];
    return [...new Set([...proprios, ...(propsDe.get(id) ?? [])])];
  };

  // elementos
  const avisos = L.avisos;
  const cabecalho = (id: number, e: R, classe: string, pavFixo?: number | null): ElementoBase => ({
    id, globalId: txt(e.GlobalId) ?? `#${id}`, nome: txt(e.Name) ?? txt(e.Tag) ?? `${classe} #${id}`, classe,
    pavimento: pavFixo !== undefined ? pavFixo : pavimentoDe(id), materiais: materiaisDe(id),
  });
  const av = (origem: string) => (c: string, m: string) => L.aviso(c, m, origem);
  const colunas: ColunaIfc[] = [], vigas: VigaIfc[] = [], lajes: LajeIfc[] = [], paredes: ParedeIfc[] = [];

  for (const id of L.ids('IFCCOLUMN', true)) {
    const e = L.ent(id)!;
    const base = cabecalho(id, e, L.tipo(e));
    const cp = L.corpo(e);
    let c: ColunaIfc | null = null;
    if (cp.solidos.length) {
      if (cp.solidos.length > 1) L.aviso('IFC_VARIOS_SOLIDOS', `Pilar ${base.nome} tem ${cp.solidos.length} sólidos; usado o primeiro.`, base.globalId);
      c = colunaDe(cp.solidos[0], base, av(base.globalId));
    } else {
      const m = porMalha(L.malha(id));
      if (m) {
        L.aviso('IFC_APROXIMADO', `Pilar ${base.nome} sem extrusão: seção pelo retângulo envolvente da malha (${(m.mr.a * 100).toFixed(1)} × ${(m.mr.b * 100).toFixed(1)} cm).`, base.globalId);
        c = { ...base, aproximado: true, tipo: 'coluna', x: m.mr.centro[0], y: m.mr.centro[1], angulo: angulo180(m.mr.angulo), secao: { tipo: 'ret', b: m.mr.a, h: m.mr.b }, z0: m.zmin, z1: m.zmax };
      } else L.aviso('IFC_SEM_REPRESENTACAO', `Pilar ${base.nome} sem geometria utilizável; ignorado.`, base.globalId);
    }
    if (c) colunas.push(c);
  }
  for (const id of L.ids('IFCBEAM', true)) {
    const e = L.ent(id)!;
    const base = cabecalho(id, e, L.tipo(e));
    const cp = L.corpo(e);
    let v: VigaIfc | null = null;
    if (cp.solidos.length) v = vigaDe(cp.solidos[0], cp.eixo, base, av(base.globalId));
    else {
      const m = porMalha(L.malha(id));
      if (m) {
        const an = m.mr.angulo * Math.PI / 180, c = Math.cos(an), s = Math.sin(an);
        L.aviso('IFC_APROXIMADO', `Viga ${base.nome} sem extrusão: eixo e seção pela caixa envolvente da malha.`, base.globalId);
        const pts: P2[] = cp.eixo && cp.eixo.length >= 2 ? dedup(cp.eixo.map(xy)) : [[m.mr.centro[0] - c * m.mr.a / 2, m.mr.centro[1] - s * m.mr.a / 2], [m.mr.centro[0] + c * m.mr.a / 2, m.mr.centro[1] + s * m.mr.a / 2]];
        v = { ...base, aproximado: true, tipo: 'viga', pontos: pts, b: m.mr.b, h: m.zmax - m.zmin, zTopo: m.zmax };
      } else L.aviso('IFC_SEM_REPRESENTACAO', `Viga ${base.nome} sem geometria utilizável; ignorada.`, base.globalId);
    }
    if (v) vigas.push(v);
  }
  for (const id of L.ids('IFCSLAB', true)) {
    const e = L.ent(id)!;
    const base = cabecalho(id, e, L.tipo(e));
    const pre = txt(e.PredefinedType) ?? null;
    const cp = L.corpo(e);
    let l: LajeIfc | null = null;
    if (cp.solidos.length) {
      l = lajeDe(cp.solidos[0], base, pre, av(base.globalId));
      if (l) {
        // aberturas: IfcOpeningElement ligado por IfcRelVoidsElement
        for (const oid of vazios.get(id) ?? []) {
          const o = L.ent(oid);
          if (!o) continue;
          const oc = L.corpo(o);
          const poli = oc.solidos[0] ? limparPoligono(oc.solidos[0].perfil.pts.map((q) => xy(mundo(oc.solidos[0], q)))) : (() => { const m = porMalha(L.malha(oid)); return m ? m.hull : []; })();
          if (poli.length >= 3) l.furos.push(areaComSinal(poli) > 0 ? [...poli].reverse() : poli);
        }
      }
    } else {
      const m = porMalha(L.malha(id));
      if (m && m.hull.length >= 3) {
        L.aviso('IFC_APROXIMADO', `Laje ${base.nome} sem extrusão: contorno pela envoltória convexa da malha.`, base.globalId);
        l = { ...base, aproximado: true, tipo: 'laje', predefinido: pre, contorno: areaComSinal(m.hull) < 0 ? [...m.hull].reverse() : m.hull, furos: [], espessura: m.zmax - m.zmin, zTopo: m.zmax };
      } else L.aviso('IFC_SEM_REPRESENTACAO', `Laje ${base.nome} sem geometria utilizável; ignorada.`, base.globalId);
    }
    if (l) lajes.push(l);
  }
  for (const id of L.ids('IFCWALL', true)) {
    const e = L.ent(id)!;
    const base = cabecalho(id, e, L.tipo(e));
    const cp = L.corpo(e);
    let w: ParedeIfc | null = null;
    if (cp.solidos.length) w = paredeDe(cp.solidos[0], cp.eixo, base, av(base.globalId));
    else {
      const m = porMalha(L.malha(id));
      if (m) {
        const an = m.mr.angulo * Math.PI / 180, c = Math.cos(an), s = Math.sin(an);
        L.aviso('IFC_APROXIMADO', `Parede ${base.nome} sem extrusão: eixo e espessura pela caixa envolvente da malha.`, base.globalId);
        w = { ...base, aproximado: true, tipo: 'parede', pontos: [[m.mr.centro[0] - c * m.mr.a / 2, m.mr.centro[1] - s * m.mr.a / 2], [m.mr.centro[0] + c * m.mr.a / 2, m.mr.centro[1] + s * m.mr.a / 2]], espessura: m.mr.b, z0: m.zmin, z1: m.zmax };
      } else L.aviso('IFC_SEM_REPRESENTACAO', `Parede ${base.nome} sem geometria utilizável; ignorada.`, base.globalId);
    }
    if (w) paredes.push(w);
  }

  // outros (só relatório; materiais das fundações para o mapeamento)
  const outros: OutroIfc[] = [];
  for (const nome of ['IFCFOOTING', 'IFCPILE']) for (const id of L.ids(nome, true)) {
    const e = L.ent(id)!;
    outros.push({ id, globalId: txt(e.GlobalId) ?? `#${id}`, nome: txt(e.Name) ?? `${nome} #${id}`, classe: nome, pavimento: pavimentoDe(id), materiais: materiaisDe(id) });
  }

  // elementos sem pavimento: o de maior cota que não passa da base do elemento (tolerância de 5 cm)
  const porZ = (z: number): number | null => { let r: number | null = null; for (const p of pavs) if (p.cota <= z + 0.05) r = p.id; return r ?? (pavs[0]?.id ?? null); };
  for (const c of colunas) if (c.pavimento === null) c.pavimento = porZ(c.z0);
  for (const v of vigas) if (v.pavimento === null) v.pavimento = porZ(v.zTopo);
  for (const l of lajes) if (l.pavimento === null) l.pavimento = porZ(l.zTopo);
  for (const w of paredes) if (w.pavimento === null) w.pavimento = porZ(w.z0);
  for (const x of [...colunas, ...vigas, ...lajes, ...paredes]) if (x.pavimento === null) L.aviso('IFC_SEM_PAVIMENTO', `${x.classe} ${x.nome} sem pavimento identificado.`, x.globalId);

  // materiais agregados
  const mats = new Map<string, MaterialIfc>();
  const usar = (nomes: string[], k: keyof MaterialIfc['usos']) => {
    for (const n of nomes) {
      let m = mats.get(n);
      if (!m) {
        const props = propMaterial.get(n) ?? [];
        const comProp = (f: (t: string) => unknown) => props.find((t) => f(t));
        const fckProp = comProp(fckDoTexto), acoProp = comProp(acoDoTexto);
        m = { nome: n, usos: { coluna: 0, viga: 0, laje: 0, parede: 0, outros: 0 } };
        const fck = fckDoTexto(n) ?? (fckProp ? fckDoTexto(fckProp) : undefined), aco = acoDoTexto(n) ?? (acoProp ? acoDoTexto(acoProp) : undefined);
        if (fck !== undefined) m.fck = fck;
        if (aco) m.aco = aco;
        if (fckDoTexto(n) === undefined && fckProp) m.propriedade = fckProp;
        mats.set(n, m);
      }
      m.usos[k]++;
    }
  };
  for (const c of colunas) usar(c.materiais, 'coluna');
  for (const v of vigas) usar(v.materiais, 'viga');
  for (const l of lajes) usar(l.materiais, 'laje');
  for (const w of paredes) usar(w.materiais, 'parede');
  for (const o of outros) usar(o.materiais, 'outros');

  const classes: Record<string, number> = {};
  for (const n of CLASSES_RELATORIO) { const q = L.ids(n, true).length; if (q) classes[n] = q; }

  const ord = <T extends { id: number }>(a: T[]) => a.sort((x, y) => x.id - y.id);
  return arredondar({
    esquema, unidade: L.esc, projeto, edificio, pavimentos: pavs,
    colunas: ord(colunas), vigas: ord(vigas), lajes: ord(lajes), paredes: ord(paredes), outros: ord(outros),
    materiais: [...mats.values()], classes, avisos,
  });
}

/** Arredonda todos os números a 1 µm (ruído de ponto flutuante das matrizes) e devolve a mesma estrutura. */
function arredondar<T>(x: T): T {
  if (typeof x === 'number') return (Number.isInteger(x) ? x : +x.toFixed(6)) as T;
  if (Array.isArray(x)) return x.map(arredondar) as T;
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, arredondar(v)])) as T;
  return x;
}
