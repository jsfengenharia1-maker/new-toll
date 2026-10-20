// Comandos de lajes (panos, tipos, aberturas) e de cargas (ponto, linha, área e alvenaria da máscara).
import type { Draft } from 'immer';
import { pavimentosDoGrupo, pavimentosOrdenados, type BuildingModel, type CasoFisico, type TipoLaje } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { BLOCOS, direcaoMenorVao, panosDoGrupo, paredesDaMascara, TRELICADAS } from '../building/lajes';
import { areaPoligono, dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');
const r6 = (v: number) => +v.toFixed(6);
const tipoSchema: JsonSchema = { oneOf: [
  { type: 'object', additionalProperties: false, required: ['tipo', 'h'], properties: { tipo: { const: 'macica' }, h: { type: 'number', minimum: 0.07, maximum: 0.5, description: 'espessura (m)' } } },
  { type: 'object', additionalProperties: false, required: ['tipo', 'modelo', 'capa'], properties: { tipo: { const: 'trelicada' }, modelo: { type: 'string', enum: Object.keys(TRELICADAS) }, capa: { type: 'number', minimum: 0.03, maximum: 0.1, description: 'capa (m)' } } },
], description: 'Maciça {tipo: "macica", h} ou treliçada {tipo: "trelicada", modelo: H8…H25, capa}', default: { tipo: 'macica', h: 0.1 } };
const grupoOk = (b: BuildingModel, g: string) => (b.grupos.some((x) => x.id === g) ? [] : err('GRUPO_INEXISTENTE', `Grupo ${g} não existe.`));
const anti = (p: P[]): P[] => (areaPoligono(p) < 0 ? [...p].reverse() : p).map((q) => [r6(q[0]), r6(q[1])] as P);
const proximaLaje = (b: BuildingModel, grupo: string) => Math.max(0, ...b.lajes.filter((l) => l.grupo === grupo).map((l) => { const m = /^L(\d+)$/.exec(l.nome); return m ? +m[1] : 0; })) + 1;
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const coberto = (b: BuildingModel, grupo: string, q: P, exceto?: string) => b.lajes.find((l) => l.grupo === grupo && l.id !== exceto && dentroPoligono(q, l.contorno));

registrar<{ grupo: string; tipo: TipoLaje }>({
  nome: 'laje.detectarPanos',
  descricao: 'Cria lajes em todas as regiões fechadas pelo eixo das vigas do grupo que ainda não têm laje.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo'], properties: { grupo: { type: 'string' }, tipo: tipoSchema } },
  validar(b, p) {
    const g = grupoOk(b, p.grupo);
    if (g.length) return g;
    const n = panosDoGrupo(b, p.grupo).filter((x) => !coberto(b, p.grupo, pontoInterno(x))).length;
    return n ? [] : err('SEM_PANOS_NOVOS', 'Nenhuma região fechada por vigas sem laje.');
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    const novos = panosDoGrupo(b, p.grupo).filter((x) => !coberto(b, p.grupo, pontoInterno(x)));
    for (const c of novos) {
      const cont = anti(c);
      d.lajes.push({ id: novoId(d, 'l'), nome: `L${proximaLaje(d as BuildingModel, p.grupo)}`, grupo: p.grupo, contorno: cont, tipo: { ...p.tipo }, ...(p.tipo.tipo === 'trelicada' ? { direcao: direcaoMenorVao(cont) } : {}) });
    }
    return `${novos.length} laje(s) criada(s).`;
  },
});

registrar<{ grupo: string; ponto?: P; contorno?: P[]; tipo: TipoLaje; nome?: string; direcao?: number }>({
  nome: 'laje.criar',
  descricao: 'Cria uma laje: no pano fechado por vigas que contém `ponto`, ou com o `contorno` informado (balanços e regiões livres).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo'], properties: {
    grupo: { type: 'string' }, ponto, contorno: { type: 'array', items: ponto, minItems: 3 }, tipo: tipoSchema,
    nome: { type: 'string', minLength: 1 }, direcao: { type: 'number', description: 'graus (vigotas da treliçada)' },
  } },
  validar(b, p) {
    const g = grupoOk(b, p.grupo);
    if (g.length) return g;
    if (!p.ponto === !p.contorno) return err('PARAMETRO_INVALIDO', 'Informe `ponto` ou `contorno` (um dos dois).');
    const c = contornoDe(b, p);
    if (!c) return err('PANO_NAO_ENCONTRADO', 'O ponto não está numa região fechada por vigas; desenhe o contorno.');
    if (Math.abs(areaPoligono(c)) < 0.05) return err('LAJE_PEQUENA', 'Contorno com área menor que 0,05 m².');
    const o = coberto(b, p.grupo, pontoInterno(c));
    return o ? err('LAJE_EXISTENTE', `Já existe ${o.nome} nesse lugar.`, [o.id]) : [];
  },
  aplicar(d, p) {
    const c = anti(contornoDe(d as BuildingModel, p)!);
    const nome = p.nome?.trim() || `L${proximaLaje(d as BuildingModel, p.grupo)}`;
    const direcao = p.direcao ?? (p.tipo.tipo === 'trelicada' ? direcaoMenorVao(c) : undefined);
    d.lajes.push({ id: novoId(d, 'l'), nome, grupo: p.grupo, contorno: c, tipo: { ...p.tipo }, ...(direcao !== undefined ? { direcao } : {}) });
    return `${nome} criada (${fmt(Math.abs(areaPoligono(c)))} m²).`;
  },
});

function contornoDe(b: BuildingModel, p: { grupo: string; ponto?: P; contorno?: P[] }): P[] | null {
  if (p.contorno) return p.contorno;
  return panosDoGrupo(b, p.grupo).find((x) => dentroPoligono(p.ponto!, x)) ?? null;
}

registrar<{ id: string; nome?: string; tipo?: TipoLaje; direcao?: number; nivel?: number; contorno?: P[]; furos?: P[][]; engasteBordas?: number[]; cobrimento?: number }>({
  nome: 'laje.editar',
  descricao: 'Altera nome, tipo, direção das vigotas (graus), desnível, contorno, aberturas coeficientes de engaste das bordas (um por aresta do contorno, 0 = articulada, 1 = engastada) ou cobrimento próprio (cm) de uma laje.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, tipo: { ...tipoSchema, default: undefined }, direcao: { type: 'number' },
    nivel: { type: 'number', minimum: -2, maximum: 2 }, contorno: { type: 'array', items: ponto, minItems: 3 }, furos: { type: 'array', items: { type: 'array', items: ponto, minItems: 3 } },
    engasteBordas: { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 }, description: 'coeficiente por aresta do contorno (aresta k vai do vértice k ao k+1); lista vazia = todas engastadas' },
    cobrimento: { type: 'number', minimum: 0, maximum: 10, description: 'cobrimento próprio (cm); 0 volta ao da obra' },
  } },
  validar: (b, p) => (b.lajes.some((l) => l.id === p.id) ? [] : err('LAJE_INEXISTENTE', `Laje ${p.id} não existe.`)),
  aplicar(d, p) {
    const l = d.lajes.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) l.nome = p.nome.trim();
    if (p.tipo) { l.tipo = { ...p.tipo }; if (p.tipo.tipo === 'trelicada' && l.direcao === undefined) l.direcao = direcaoMenorVao(l.contorno as P[]); }
    if (p.direcao !== undefined) l.direcao = ((p.direcao % 180) + 180) % 180;
    if (p.nivel !== undefined) { if (p.nivel) l.nivel = p.nivel; else delete l.nivel; }
    if (p.contorno) l.contorno = anti(p.contorno);
    if (p.furos) { if (p.furos.length) l.furos = p.furos.map(anti); else delete l.furos; }
    if (p.cobrimento !== undefined) { if (p.cobrimento) l.cobrimento = p.cobrimento; else delete l.cobrimento; }
    if (p.engasteBordas) { if (p.engasteBordas.some((a) => a !== 1)) l.engasteBordas = [...p.engasteBordas]; else delete l.engasteBordas; }
    return `${l.nome} alterada.`;
  },
});

registrar<{ ids: string[]; tipo: TipoLaje }>({
  nome: 'laje.atribuir',
  descricao: 'Aplica o mesmo tipo (maciça ou treliçada) a várias lajes.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'tipo'], properties: { ids, tipo: { ...tipoSchema, default: undefined } } },
  validar(b, p) { const f = p.ids.filter((id) => !b.lajes.some((l) => l.id === id)); return f.length ? err('LAJE_INEXISTENTE', `Laje(s) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) {
    for (const l of d.lajes) if (p.ids.includes(l.id)) { l.tipo = { ...p.tipo }; if (p.tipo.tipo === 'trelicada' && l.direcao === undefined) l.direcao = direcaoMenorVao(l.contorno as P[]); }
    return `${p.ids.length} laje(s) alterada(s).`;
  },
});

registrar<{ id: string; contorno: P[] }>({
  nome: 'laje.abertura',
  descricao: 'Abre um furo (shaft, escada) dentro da laje.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'contorno'], properties: { id: { type: 'string' }, contorno: { type: 'array', items: ponto, minItems: 3 } } },
  validar(b, p) {
    const l = b.lajes.find((x) => x.id === p.id);
    if (!l) return err('LAJE_INEXISTENTE', `Laje ${p.id} não existe.`);
    return p.contorno.every((q) => dentroPoligono(q, l.contorno)) ? [] : err('ABERTURA_FORA', 'A abertura precisa ficar dentro da laje.', [l.id]);
  },
  aplicar(d, p) { const l = d.lajes.find((x) => x.id === p.id)!; l.furos = [...(l.furos ?? []), anti(p.contorno)]; return `Abertura em ${l.nome}.`; },
});

registrar<{ ids: string[] }>({
  nome: 'laje.remover',
  descricao: 'Remove lajes.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) { const f = p.ids.filter((id) => !b.lajes.some((l) => l.id === id)); return f.length ? err('LAJE_INEXISTENTE', `Laje(s) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) { const s = new Set(p.ids); d.lajes = d.lajes.filter((l) => !s.has(l.id)); return `${p.ids.length} laje(s) removida(s).`; },
});

registrar<{ grupo: string; tolerancia: number }>({
  nome: 'laje.renumerar',
  descricao: 'Renumera as lajes do grupo L1, L2... da esquerda para a direita e de cima para baixo (pelo ponto interno).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo'], properties: { grupo: { type: 'string' }, tolerancia: { type: 'number', minimum: 0, default: 0.5 } } },
  validar: (b, p) => grupoOk(b, p.grupo),
  aplicar(d, p) {
    const ls = d.lajes.filter((l) => l.grupo === p.grupo).map((l) => ({ l, c: pontoInterno(l.contorno as P[]) })).sort((a, z) => z.c[1] - a.c[1]);
    const linhas: (typeof ls)[] = [];
    for (const it of ls) { const u = linhas.at(-1); if (u && Math.abs(u[0].c[1] - it.c[1]) <= p.tolerancia) u.push(it); else linhas.push([it]); }
    let n = 1;
    for (const u of linhas) for (const it of u.sort((a, z) => a.c[0] - z.c[0])) it.l.nome = `L${n++}`;
    return `${ls.length} laje(s) renumerada(s).`;
  },
});

// ---- cargas ----

const casoSchema = (padrao: CasoFisico): JsonSchema => ({ type: 'string', enum: ['G', 'Q'], default: padrao, description: 'G permanente, Q variável' });

registrar<{ grupo: string; ponto: P; valor: number; caso: CasoFisico }>({
  nome: 'carga.ponto',
  descricao: 'Carga concentrada vertical (kN, para baixo) na planta do grupo.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'ponto', 'valor'], properties: { grupo: { type: 'string' }, ponto, valor: { type: 'number', description: 'kN' }, caso: casoSchema('Q') } },
  validar: (b, p) => grupoOk(b, p.grupo),
  aplicar(d, p) { d.cargas.push({ id: novoId(d, 'c'), grupo: p.grupo, caso: p.caso, tipo: 'ponto', valor: p.valor, pontos: [[r6(p.ponto[0]), r6(p.ponto[1])]] }); return `Carga de ${fmt(p.valor)} kN (${p.caso}).`; },
});

registrar<{ grupo: string; pontos: P[]; valor: number; caso: CasoFisico }>({
  nome: 'carga.linha',
  descricao: 'Carga linear vertical (kN/m) ao longo de uma polilinha da planta do grupo.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'pontos', 'valor'], properties: { grupo: { type: 'string' }, pontos: { type: 'array', items: ponto, minItems: 2 }, valor: { type: 'number', description: 'kN/m' }, caso: casoSchema('G') } },
  validar: (b, p) => grupoOk(b, p.grupo),
  aplicar(d, p) { d.cargas.push({ id: novoId(d, 'c'), grupo: p.grupo, caso: p.caso, tipo: 'linha', valor: p.valor, pontos: p.pontos.map((q) => [r6(q[0]), r6(q[1])] as P) }); return `Carga linear de ${fmt(p.valor)} kN/m (${p.caso}).`; },
});

registrar<{ grupo: string; contorno: P[]; valor: number; caso: CasoFisico }>({
  nome: 'carga.area',
  descricao: 'Carga superficial (kN/m²) numa região da planta do grupo, além das cargas do grupo (revestimento e uso).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'contorno', 'valor'], properties: { grupo: { type: 'string' }, contorno: { type: 'array', items: ponto, minItems: 3 }, valor: { type: 'number', description: 'kN/m²' }, caso: casoSchema('Q') } },
  validar: (b, p) => { const g = grupoOk(b, p.grupo); return g.length ? g : Math.abs(areaPoligono(p.contorno)) < 1e-4 ? err('AREA_NULA', 'Contorno sem área.') : []; },
  aplicar(d, p) { d.cargas.push({ id: novoId(d, 'c'), grupo: p.grupo, caso: p.caso, tipo: 'area', valor: p.valor, pontos: anti(p.contorno) }); return `Carga de ${fmt(p.valor)} kN/m² (${p.caso}) em ${fmt(Math.abs(areaPoligono(p.contorno)))} m².`; },
});

registrar<{ id: string; valor?: number; caso?: CasoFisico; pontos?: P[] }>({
  nome: 'carga.editar',
  descricao: 'Altera valor, caso ou geometria de uma carga.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, valor: { type: 'number' }, caso: { type: 'string', enum: ['G', 'Q'] }, pontos: { type: 'array', items: ponto, minItems: 1 } } },
  validar: (b, p) => (b.cargas.some((c) => c.id === p.id) ? [] : err('CARGA_INEXISTENTE', `Carga ${p.id} não existe.`)),
  aplicar(d, p) {
    const c = d.cargas.find((x) => x.id === p.id)!;
    if (p.valor !== undefined) c.valor = p.valor;
    if (p.caso) c.caso = p.caso;
    if (p.pontos) c.pontos = p.pontos.map((q) => [r6(q[0]), r6(q[1])] as P);
    delete c.origem; // editada à mão: deixa de ser regenerada
    return 'Carga alterada.';
  },
});

registrar<{ ids: string[] }>({
  nome: 'carga.remover',
  descricao: 'Remove cargas.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) { const f = p.ids.filter((id) => !b.cargas.some((c) => c.id === id)); return f.length ? err('CARGA_INEXISTENTE', `Carga(s) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) { const s = new Set(p.ids); d.cargas = d.cargas.filter((c) => !s.has(c.id)); return `${p.ids.length} carga(s) removida(s).`; },
});

/** Altura padrão da alvenaria do grupo: do pavimento até o seguinte, menos a viga mais comum do grupo de cima (m). */
export function alturaAlvenaria(b: BuildingModel, grupo: string): number {
  const ps = pavimentosOrdenados(b), p = pavimentosDoGrupo(b, grupo)[0];
  const i = p ? ps.findIndex((x) => x.id === p.id) : -1;
  if (i < 0 || i === ps.length - 1) return 1.0; // cobertura: platibanda [a confirmar]
  const acima = ps[i + 1];
  const hs = b.vigas.filter((v) => v.grupo === acima.grupo).map((v) => v.secao.h);
  const moda = hs.length ? [...hs].sort((a, z) => hs.filter((x) => x === z).length - hs.filter((x) => x === a).length)[0] : 0.5;
  return +(acima.cota - p.cota - moda).toFixed(3);
}

registrar<{ grupo: string; camada: string; bloco: string; altura?: number; espessura?: number }>({
  nome: 'carga.alvenariaDaMascara',
  descricao: 'Gera cargas lineares de alvenaria (G) a partir das paredes (pares de linhas paralelas) de uma camada da máscara do grupo. Peso = γ do bloco × espessura (afastamento das linhas, ou `espessura`) × altura (padrão: até o pavimento de cima menos a viga). Substitui as cargas geradas antes pela mesma camada.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'camada'], properties: {
    grupo: { type: 'string' }, camada: { type: 'string' }, bloco: { type: 'string', enum: Object.keys(BLOCOS), default: 'ceramico' },
    altura: { type: 'number', exclusiveMinimum: 0, maximum: 10, description: 'm' }, espessura: { type: 'number', exclusiveMinimum: 0, maximum: 0.6, description: 'm (padrão: afastamento das linhas)' },
  } },
  validar(b, p) {
    const g = grupoOk(b, p.grupo);
    if (g.length) return g;
    if (!b.mascaras.some((m) => m.grupo === p.grupo && m.geo[p.camada])) return err('CAMADA_INEXISTENTE', `A máscara do grupo não tem a camada “${p.camada}”.`);
    return paredesDaMascara(b, p.grupo, p.camada).length ? [] : err('SEM_PAREDES', `Nenhuma parede (par de linhas paralelas a 5–35 cm) na camada “${p.camada}”.`);
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    const ws = paredesDaMascara(b, p.grupo, p.camada), H = p.altura ?? alturaAlvenaria(b, p.grupo), gama = BLOCOS[p.bloco].gama;
    d.cargas = d.cargas.filter((c) => !(c.grupo === p.grupo && c.origem?.tipo === 'alvenaria' && c.origem.camada === p.camada));
    let L = 0;
    for (const w of ws) {
      const e = p.espessura ?? w.e;
      d.cargas.push({ id: novoId(d, 'c'), grupo: p.grupo, caso: 'G', tipo: 'linha', valor: +(gama * e * H).toFixed(3), pontos: [w.a, w.z], origem: { tipo: 'alvenaria', camada: p.camada, bloco: p.bloco, espessura: e, altura: H } });
      L += Math.hypot(w.z[0] - w.a[0], w.z[1] - w.a[1]);
    }
    return `${ws.length} trecho(s) de alvenaria (${fmt(L)} m, altura ${fmt(H)} m).`;
  },
});

