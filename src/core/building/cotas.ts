// Cotas permanentes de planta (L6): referências associativas, valores, geometria de desenho, sincronização com a remoção de
// elementos e propagação do movimento pela cadeia de cotas travadas. Núcleo puro (sem React, sem DOM).
import {
  centroPilar, contornoPilar, deslocarPolilinha, geoLance, geometriaViga, lanceNoPavimento, pavimentosDoGrupo, trechosViga,
  type BuildingModel, type CotaPlanta, type ElemCota, type RefCota,
} from './types';

type P = [number, number];
export const TOL_COTA = 1e-6;

/** Vetor unitário da direção da medida (graus; 0 = x, 90 = y) e sua normal à esquerda. */
export const dirCota = (ang: number): P => [Math.cos((ang * Math.PI) / 180), Math.sin((ang * Math.PI) / 180)];
export const normalCota = (ang: number): P => { const u = dirCota(ang); return [-u[1], u[0]]; };
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1];
const r9 = (v: number) => +v.toFixed(9);

/** Posição da linha de cota (coordenada na normal) que passa pelo ponto. */
export const offsetDoPonto = (ang: number, p: P) => r9(dot(normalCota(ang), p));

export const chaveElem = (e: ElemCota) => `${e.tipo}:${e.sub ? `${e.sub}/` : ''}${e.id}`;

/** O elemento existe no modelo? */
export function existeElem(b: BuildingModel, e: ElemCota): boolean {
  switch (e.tipo) {
    case 'pilar': return b.pilares.some((x) => x.id === e.id);
    case 'viga': return b.vigas.some((x) => x.id === e.id);
    case 'parede': return !!b.paredes?.some((x) => x.id === e.id);
    case 'abertura': return !!b.paredes?.find((w) => w.id === e.sub)?.aberturas?.some((a) => a.id === e.id);
    case 'fundacao': return !!b.fundacao?.elementos.some((x) => x.id === e.id);
    case 'eixo': return b.eixos.some((x) => x.id === e.id);
  }
}

/** Nome legível do elemento (P1, V2, PAR1, porta, F1, eixo A). */
export function nomeElem(b: BuildingModel, e: ElemCota): string {
  switch (e.tipo) {
    case 'pilar': return b.pilares.find((x) => x.id === e.id)?.nome ?? e.id;
    case 'viga': return b.vigas.find((x) => x.id === e.id)?.nome ?? e.id;
    case 'parede': return b.paredes?.find((x) => x.id === e.id)?.nome ?? e.id;
    case 'abertura': { const w = b.paredes?.find((x) => x.id === e.sub), a = w?.aberturas?.find((x) => x.id === e.id); return a ? `${a.tipo === 'porta' ? 'porta' : 'janela'} de ${w!.nome}` : e.id; }
    case 'fundacao': return b.fundacao?.elementos.find((x) => x.id === e.id)?.nome ?? e.id;
    case 'eixo': return `eixo ${b.eixos.find((x) => x.id === e.id)?.nome ?? e.id}`;
  }
}

/** Rótulo da cota para mensagens: nomes dos elementos ligados (P1–P2–P3). */
export const rotuloCota = (b: BuildingModel, c: CotaPlanta) => c.refs.map((r) => (r.elem ? nomeElem(b, r.elem) : 'ponto')).join('–');

function pontoAoLongo(pts: P[], s: number): { p: P; t: P } {
  let resto = Math.max(0, s);
  for (let i = 0; i + 1 < pts.length; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (!L) continue;
    const t: P = [(pts[i + 1][0] - pts[i][0]) / L, (pts[i + 1][1] - pts[i][1]) / L];
    if (resto <= L || i + 2 === pts.length) return { p: [pts[i][0] + t[0] * resto, pts[i][1] + t[1] * resto], t };
    resto -= L;
  }
  return { p: pts[0], t: [1, 0] };
}

const meio = (pts: P[]): P => pontoAoLongo(pts, pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0) / 2).p;

/** Ponto sobre a face (menor `A` ou maior `B` coordenada na direção da cota) de um conjunto de vértices, na linha que passa por `c`. */
function naFace(pts: P[], c: P, ang: number, lado: 'A' | 'B'): P {
  const u = dirCota(ang), n = normalCota(ang);
  const ts = pts.map((q) => dot(u, q)), t = lado === 'A' ? Math.min(...ts) : Math.max(...ts), nc = dot(n, c);
  return [u[0] * t + n[0] * nc, u[1] * t + n[1] * nc];
}

/**
 * Ponto de uma referência na planta do grupo, para a direção `ang` da cota (as faces dependem da direção: A = lado de menor
 * coordenada, B = lado de maior). Elemento removido ou sem elemento: o ponto livre `fixo`. `null` se a parte não existe no elemento.
 * Eixo estrutural: ponto médio do eixo (só serve como referência quando perpendicular à direção da cota); fundação: centro (as
 * faces só com dimensões impostas).
 */
export function resolverRef(b: BuildingModel, grupo: string, ref: RefCota, ang: number): P | null {
  const e = ref.elem;
  if (!e || !existeElem(b, e)) return ref.fixo ? [...ref.fixo] : null;
  const face = (pts: P[], c: P): P | null => (ref.parte === 'faceA' ? naFace(pts, c, ang, 'A') : ref.parte === 'faceB' ? naFace(pts, c, ang, 'B') : null);
  switch (e.tipo) {
    case 'pilar': {
      const p = b.pilares.find((x) => x.id === e.id)!;
      const pav = pavimentosDoGrupo(b, grupo)[0];
      const lance = pav ? lanceNoPavimento(b, p, pav.id) : undefined;
      const g = lance ? geoLance(p, lance) : { p, secao: p.secao };
      const c = centroPilar(g.p, g.secao);
      if (ref.parte !== 'faceA' && ref.parte !== 'faceB') return c;
      if (g.secao.tipo === 'circ') { const u = dirCota(ang), t = dot(u, c) + (ref.parte === 'faceA' ? -1 : 1) * g.secao.d / 2, n = normalCota(ang), nc = dot(n, c); return [u[0] * t + n[0] * nc, u[1] * t + n[1] * nc]; }
      return face(contornoPilar(g.p, g.secao), c);
    }
    case 'viga': {
      const v = b.vigas.find((x) => x.id === e.id)!;
      const eixo = geometriaViga(v).eixo as P[];
      if (ref.parte === 'extremoI') return eixo[0];
      if (ref.parte === 'extremoJ') return eixo[eixo.length - 1];
      if (ref.parte === 'faceA' || ref.parte === 'faceB') { const pts = trechosViga(v).flat() as P[]; return face(pts, meio(eixo)); }
      return meio(eixo);
    }
    case 'parede': {
      const w = b.paredes!.find((x) => x.id === e.id)!;
      if (ref.parte === 'extremoI') return w.pontos[0];
      if (ref.parte === 'extremoJ') return w.pontos[w.pontos.length - 1];
      if (ref.parte === 'faceA' || ref.parte === 'faceB') { const pts = [...deslocarPolilinha(w.pontos, w.esq), ...deslocarPolilinha(w.pontos, -w.dir)] as P[]; return face(pts, meio(w.pontos)); }
      return meio(w.pontos);
    }
    case 'abertura': {
      const w = b.paredes!.find((x) => x.id === e.sub)!, a = w.aberturas!.find((x) => x.id === e.id)!;
      const s = ref.parte === 'faceA' || ref.parte === 'extremoI' ? a.s : ref.parte === 'faceB' || ref.parte === 'extremoJ' ? a.s + a.largura : a.s + a.largura / 2;
      return pontoAoLongo(w.pontos as P[], s).p;
    }
    case 'fundacao': {
      const f = b.fundacao!.elementos.find((x) => x.id === e.id)!;
      if (ref.parte === 'faceA' || ref.parte === 'faceB') {
        if (!f.impostas) return null;
        const a = (f.angulo * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a), hx = f.impostas.A / 2, hy = f.impostas.B / 2;
        const pts = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([i, j]) => [f.x + i * hx * cs - j * hy * sn, f.y + i * hx * sn + j * hy * cs] as P);
        return face(pts, [f.x, f.y]);
      }
      return [f.x, f.y];
    }
    case 'eixo': {
      const x = b.eixos.find((q) => q.id === e.id)!;
      return [(x.p1[0] + x.p2[0]) / 2, (x.p1[1] + x.p2[1]) / 2];
    }
  }
}

export interface TrechoCota {
  /** Índices das referências nas pontas do trecho. */
  ia: number; iz: number;
  a: P; z: P;
  /** Diferença assinada das coordenadas na direção da cota (z − a) e seu módulo (m). */
  assinado: number; valor: number;
}

/** Trechos da cota com os pontos resolvidos e os avisos (referência sem ponto, elemento removido). */
export function trechosCota(b: BuildingModel, c: CotaPlanta): { pontos: (P | null)[]; trechos: TrechoCota[]; avisos: string[] } {
  const u = dirCota(c.linha.angulo);
  const pontos = c.refs.map((r) => resolverRef(b, c.grupo, r, c.linha.angulo));
  const avisos: string[] = [];
  c.refs.forEach((r, i) => {
    if (r.removido) avisos.push(`A referência ${i + 1} era um elemento removido: ficou o ponto livre.`);
    else if (!pontos[i]) avisos.push(`A referência ${i + 1} não tem ponto (${r.elem ? nomeElem(b, r.elem) : 'sem elemento'}).`);
  });
  const trechos: TrechoCota[] = [];
  for (let i = 0; i + 1 < c.refs.length; i++) {
    const ia = c.estilo === 'baseline' ? 0 : i, iz = i + 1;
    const a = pontos[ia], z = pontos[iz];
    if (!a || !z) continue;
    const assinado = r9(dot(u, z) - dot(u, a));
    trechos.push({ ia, iz, a, z, assinado, valor: Math.abs(assinado) });
  }
  return { pontos, trechos, avisos };
}

/** Texto do valor da cota: centímetros inteiros, como as cotas automáticas das pranchas. */
export const textoCota = (valor: number) => String(Math.round(valor * 100));

export interface GeometriaCota {
  /** Linhas de chamada (da referência à linha de cota). */
  chamadas: [P, P][];
  /** Linha de cota de cada trecho. */
  linhas: [P, P][];
  /** Pontos das marcas (traço oblíquo) na linha de cota, um por referência com ponto. */
  marcas: P[];
  textos: { p: P; s: string; ang: number }[];
}

/** Geometria de desenho da cota (m, eixos da planta). `ext` = prolongamento da chamada além da linha de cota. */
export function geometriaCota(b: BuildingModel, c: CotaPlanta, ext = 0.05): GeometriaCota {
  const { pontos, trechos } = trechosCota(b, c);
  const u = dirCota(c.linha.angulo), n = normalCota(c.linha.angulo);
  const sobre = (p: P): P => { const t = dot(u, p); return [u[0] * t + n[0] * c.linha.offset, u[1] * t + n[1] * c.linha.offset]; };
  const chamadas: [P, P][] = [], marcas: P[] = [];
  const lado = (p: P) => (c.linha.offset >= dot(n, p) ? 1 : -1);
  pontos.forEach((p) => {
    if (!p) return;
    const q = sobre(p);
    chamadas.push([p, [q[0] + n[0] * ext * lado(p), q[1] + n[1] * ext * lado(p)]]);
    marcas.push(q);
  });
  let ang = c.linha.angulo % 180;
  if (ang > 90) ang -= 180; else if (ang <= -90) ang += 180;
  const linhas = trechos.map((t) => [sobre(t.a), sobre(t.z)] as [P, P]);
  const textos = trechos.map((t, i) => ({ p: [(linhas[i][0][0] + linhas[i][1][0]) / 2, (linhas[i][0][1] + linhas[i][1][1]) / 2] as P, s: textoCota(t.valor), ang }));
  return { chamadas, linhas, marcas, textos };
}

// ---------------------------------------------------------------------------------------------------------------------------
// sincronização com a remoção de elementos

/** Há cotas no modelo? */
export const temCotas = (b: BuildingModel) => !!b.cotas?.length;

/**
 * Chamada depois de cada comando (no mesmo passo de desfazer): a referência cujo elemento deixou de existir vira ponto livre no
 * último valor (calculado no modelo `antes`) e a cota recebe aviso; a cota de um grupo que deixou de existir é removida.
 */
export function sincronizarCotas(d: { cotas?: CotaPlanta[] } & Record<string, unknown>, antes: BuildingModel): string[] {
  const m = d as unknown as BuildingModel;
  const avisos: string[] = [];
  if (!d.cotas) return avisos;
  const manter: CotaPlanta[] = [];
  for (const c of d.cotas) {
    if (!m.grupos.some((g) => g.id === c.grupo)) { avisos.push(`Cota ${c.id} removida: o grupo não existe mais.`); continue; }
    c.refs.forEach((r, i) => {
      if (!r.elem || existeElem(m, r.elem)) return;
      const nome = nomeElem(antes, r.elem);
      const antigo = existeElem(antes, r.elem) ? resolverRef(antes, c.grupo, r, c.linha.angulo) : null;
      const ponto: P = antigo ?? r.fixo ?? [0, 0];
      avisos.push(`Cota ${rotuloCota(antes, c as CotaPlanta)}: ${nome} foi removido; a referência ${i + 1} ficou no ponto (${ponto[0].toFixed(3).replace('.', ',')}; ${ponto[1].toFixed(3).replace('.', ',')}).`);
      delete r.elem;
      r.fixo = [r9(ponto[0]), r9(ponto[1])];
      r.removido = true;
    });
    manter.push(c);
  }
  if (manter.length !== d.cotas.length) d.cotas = manter;
  if (!d.cotas.length) delete d.cotas;
  return avisos;
}

// ---------------------------------------------------------------------------------------------------------------------------
// movimento pela cota, com propagação pelas cotas travadas

export interface Movimento { elem: ElemCota; delta: P }
export interface ErroMovimento { codigo: string; mensagem: string; cota?: string }
export interface PlanoMovimento { movimentos: Movimento[]; erro?: ErroMovimento }

/**
 * Plano de movimento do elemento `alvo` por `delta` (m). Cada cota travada que liga o elemento a outro mantém a distância:
 * o vizinho anda a componente de `delta` na direção da cota, e assim por diante pela cadeia. Os elementos `fixos` (a
 * referência da cota editada) não podem andar. Conflito (ponto livre, elemento fixo ou deslocamentos incompatíveis, inclusive
 * ciclo) recusa, dizendo qual cota impede.
 */
export function planejarMovimento(b: BuildingModel, alvo: ElemCota, delta: P, fixos: ElemCota[] = [], junto: ElemCota[] = []): PlanoMovimento {
  for (const e of [alvo, ...junto]) if (!existeElem(b, e)) return { movimentos: [], erro: { codigo: 'ELEMENTO_INEXISTENTE', mensagem: `Elemento ${e.id} não existe.` } };
  const mov = new Map<string, Movimento>();
  const imoveis = new Set(fixos.map(chaveElem));
  const travadas = (b.cotas ?? []).filter((c) => c.travada);
  if (Math.hypot(delta[0], delta[1]) < TOL_COTA) return { movimentos: [] };
  for (const e of [alvo, ...junto]) if (imoveis.has(chaveElem(e))) return { movimentos: [], erro: { codigo: 'COTA_ELEMENTO_FIXO', mensagem: `${nomeElem(b, e)} é a referência da cota e não pode andar.` } };
  const fila: string[] = [];
  for (const e of [alvo, ...junto]) { const k = chaveElem(e); if (!mov.has(k)) { mov.set(k, { elem: e, delta }); fila.push(k); } }
  const recusa = (codigo: string, mensagem: string, cota: string): PlanoMovimento => ({ movimentos: [], erro: { codigo, mensagem, cota } });
  while (fila.length) {
    const k = fila.shift()!;
    const atual = mov.get(k)!;
    for (const c of travadas) {
      const u = dirCota(c.linha.angulo), rot = rotuloCota(b, c), du = dot(u, atual.delta);
      for (let i = 0; i < c.refs.length; i++) {
        const r = c.refs[i];
        if (!r.elem || chaveElem(r.elem) !== k) continue;
        const vizinhos = c.estilo === 'baseline' ? (i === 0 ? c.refs.map((_, j) => j).filter((j) => j > 0) : [0]) : [i - 1, i + 1].filter((j) => j >= 0 && j < c.refs.length);
        for (const j of vizinhos) {
          const rv = c.refs[j];
          if (!rv.elem) {
            if (Math.abs(du) > TOL_COTA) return recusa('COTA_TRAVADA_PONTO', `A cota travada ${rot} liga ${nomeElem(b, r.elem)} a um ponto livre e impede o movimento.`, c.id);
            continue;
          }
          const kv = chaveElem(rv.elem);
          if (kv === k) continue;
          const ex = mov.get(kv);
          if (ex) {
            if (Math.abs(dot(u, ex.delta) - du) > TOL_COTA) return recusa('COTA_TRAVADA_CONFLITO', `A cota travada ${rot} impede: ${nomeElem(b, rv.elem)} já anda ${cm(dot(u, ex.delta))} cm nessa direção e ${nomeElem(b, r.elem)} anda ${cm(du)} cm.`, c.id);
            continue;
          }
          if (Math.abs(du) <= TOL_COTA) continue;
          if (imoveis.has(kv)) return recusa('COTA_TRAVADA_CONFLITO', `A cota travada ${rot} impede: ${nomeElem(b, rv.elem)} é a referência da cota editada e ficaria deslocado ${cm(du)} cm.`, c.id);
          mov.set(kv, { elem: rv.elem, delta: [u[0] * du, u[1] * du] });
          fila.push(kv);
        }
      }
    }
  }
  // vigas embutidas numa parede que anda vão com ela
  const paredes = new Set([...mov.values()].filter((m) => m.elem.tipo === 'parede').map((m) => m.elem.id));
  const lista = [...mov.values()].filter((m) => !(m.elem.tipo === 'viga' && paredes.has(b.vigas.find((v) => v.id === m.elem.id)?.embutida ?? '')));
  return { movimentos: lista };
}
const cm = (v: number) => (Math.round(v * 1000) / 10).toString().replace('.', ',');

/** Comandos existentes que realizam o plano (um `lote`: um passo de desfazer). */
export function comandosDoMovimento(b: BuildingModel, movs: Movimento[]): { comandos: { nome: string; params: Record<string, unknown> }[]; erro?: ErroMovimento } {
  const comandos: { nome: string; params: Record<string, unknown> }[] = [];
  for (const m of movs) {
    const [dx, dy] = [r9(m.delta[0]), r9(m.delta[1])];
    const e = m.elem;
    switch (e.tipo) {
      case 'pilar': comandos.push({ nome: 'pilar.mover', params: { ids: [e.id], dx, dy } }); break;
      case 'viga': comandos.push({ nome: 'viga.mover', params: { ids: [e.id], dx, dy } }); break;
      case 'parede': comandos.push({ nome: 'parede.mover', params: { ids: [e.id], dx, dy } }); break;
      case 'fundacao': comandos.push({ nome: 'fundacao.mover', params: { ids: [e.id], dx, dy } }); break;
      case 'eixo': {
        const x = b.eixos.find((q) => q.id === e.id)!;
        comandos.push({ nome: 'eixo.editar', params: { id: e.id, p1: [r9(x.p1[0] + dx), r9(x.p1[1] + dy)], p2: [r9(x.p2[0] + dx), r9(x.p2[1] + dy)] } });
        break;
      }
      case 'abertura': {
        const w = b.paredes!.find((q) => q.id === e.sub)!, a = w.aberturas!.find((q) => q.id === e.id)!;
        const t = pontoAoLongo(w.pontos as P[], a.s + a.largura / 2).t;
        const ao = dx * t[0] + dy * t[1], perp = -dx * t[1] + dy * t[0];
        if (Math.abs(perp) > 1e-4) return { comandos: [], erro: { codigo: 'COTA_ABERTURA_TRANSVERSAL', mensagem: `A ${nomeElem(b, e)} só anda ao longo da parede.` } };
        comandos.push({ nome: 'parede.abertura', params: { parede: w.id, id: a.id, s: r9(a.s + ao) } });
        break;
      }
    }
  }
  return { comandos };
}

export interface PlanoValor { alvo: ElemCota; delta: P; fixos: ElemCota[]; erro?: ErroMovimento }

/**
 * Edição do valor de um trecho da cota: `mover` 'fim' (padrão) anda o elemento da referência final do trecho e 'inicio' o da
 * inicial; a outra fica parada. Cota travada não tem o valor editado (destrave antes).
 */
export function planejarValor(b: BuildingModel, c: CotaPlanta, indice: number, valor: number, mover: 'inicio' | 'fim' = 'fim'): PlanoValor {
  const vazio = { alvo: { tipo: 'pilar', id: '' } as ElemCota, delta: [0, 0] as P, fixos: [] as ElemCota[] };
  const falha = (codigo: string, mensagem: string): PlanoValor => ({ ...vazio, erro: { codigo, mensagem, cota: c.id } });
  const { trechos } = trechosCota(b, c);
  const t = trechos.find((x) => x.iz === indice + 1);
  if (!t) return falha('COTA_TRECHO_INEXISTENTE', `A cota ${rotuloCota(b, c)} não tem o trecho ${indice + 1} resolvido.`);
  if (c.travada) return falha('COTA_TRAVADA', `A cota ${rotuloCota(b, c)} está travada: destrave para alterar o valor.`);
  const ra = c.refs[t.ia], rz = c.refs[t.iz];
  const alvoRef = mover === 'fim' ? rz : ra, fixaRef = mover === 'fim' ? ra : rz;
  if (!alvoRef.elem) return falha('COTA_PONTO_LIVRE', `A referência ${mover === 'fim' ? t.iz + 1 : t.ia + 1} é um ponto livre: não há elemento para mover.`);
  if (fixaRef.elem && chaveElem(fixaRef.elem) === chaveElem(alvoRef.elem)) return falha('COTA_MESMO_ELEMENTO', 'As duas referências do trecho são do mesmo elemento.');
  const novo = (t.assinado < 0 ? -1 : 1) * valor;
  const d = novo - t.assinado; // variação de z − a
  const sentido = mover === 'fim' ? 1 : -1;
  const u = dirCota(c.linha.angulo);
  return { alvo: alvoRef.elem, delta: [r9(u[0] * d * sentido), r9(u[1] * d * sentido)], fixos: fixaRef.elem ? [fixaRef.elem] : [] };
}
