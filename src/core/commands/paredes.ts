// Comandos das paredes de concreto (E1c): lançamento, edição, aberturas, empuxo, prolongar, atribuir e geração pela
// máscara. Geometria e regras em building/paredes.ts e building/paredesBase.ts.
import type { Draft } from 'immer';
import { diagnosticosAlvenaria, ehAlvenaria } from '../building/alvenaria';
import { paredesDaMascara } from '../building/lajes';
import { diagnosticosParedes, errosProprios, vigaSobreParede } from '../building/paredes';
import { refsPilar } from '../building/pilares';
import { geometriaViga, pavimentosOrdenados, type AberturaParede, type BuildingModel, type EmpuxoParede, type Parede } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

type P = [number, number];
const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const r4 = (v: number) => +v.toFixed(4);
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const espPav: JsonSchema = { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pavimento', 'esq', 'dir'], properties: { pavimento: { type: 'string' }, esq: { type: 'number', minimum: 0, maximum: 3 }, dir: { type: 'number', minimum: 0, maximum: 3 } } }, description: 'espessuras médias próprias por pavimento (topo do lance), m' };
const empuxoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['caso', 'lado'], properties: {
  caso: { type: 'string', description: 'id do caso: H com tipo de empuxo (terra) ou qualquer caso (líquido)' },
  lado: { type: 'string', enum: ['esq', 'dir'], description: 'lado do eixo (a → z) em que fica o terreno ou o líquido' },
  cotaTerreno: { type: 'number', description: 'cota do terreno junto à parede (m); ausente = a do tipo de empuxo' },
  liquido: { type: 'object', additionalProperties: false, required: ['cota'], properties: { cota: { type: 'number' }, gama: { type: 'number', minimum: 1, maximum: 30 } }, description: 'empuxo hidrostático: cota da superfície e γ (kN/m³, padrão 10)' },
} };
const baseSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['tipo'], properties: { tipo: { type: 'string', enum: ['apoio', 'sapataCorrida', 'viga'] }, largura: { type: 'number', minimum: 0.2, maximum: 10 }, altura: { type: 'number', minimum: 0.1, maximum: 3 }, k: { type: 'number', minimum: 1000, maximum: 1000000 } } };

/** Pontos sem repetidos consecutivos, arredondados a 0,1 mm. */
const limpar = (pts: P[]): P[] => { const out: P[] = []; for (const p of pts) if (!out.length || Math.hypot(p[0] - out.at(-1)![0], p[1] - out.at(-1)![1]) > 1e-6) out.push([r4(p[0]), r4(p[1])]); return out; };

const proximoNumero = (b: BuildingModel) => Math.max(0, ...(b.paredes ?? []).map((w) => { const m = /^M(\d+)$/.exec(w.nome); return m ? +m[1] : 0; })) + 1;

/** Erros da parede nova ou alterada: referências, geometria, aberturas, empuxo e sobreposição com outras paredes. */
function errosDaParede(b: BuildingModel, w: Parede): Diagnostico[] {
  const ref = refsPilar(b, w.nasce, w.morre);
  if (ref.length) return ref;
  const proprios = errosProprios(b, w).filter((x) => x.severidade === 'erro');
  if (proprios.length) return proprios;
  const m: BuildingModel = { ...b, paredes: [...(b.paredes ?? []).filter((x) => x.id !== w.id), w] };
  const mat = ehAlvenaria(w) ? diagnosticosAlvenaria(m).filter((x) => x.severidade === 'erro' && x.codigo === 'ALV_MATERIAL' && x.elementos.includes(w.id)) : [];
  if (mat.length) return mat;
  return diagnosticosParedes(m).filter((x) => x.severidade === 'erro' && x.codigo === 'PAREDE_SOBREPOSTA' && x.elementos.includes(w.id));
}

type ParedeIn = { pontos: P[]; tipo?: Parede['tipo']; material?: string; esq?: number; dir?: number; espessura?: number; porPavimento?: Parede['porPavimento']; nasce?: string; morre?: string; nome?: string; vinculoBase?: 'engaste' | 'rotula'; armar?: boolean; base?: Parede['base'] };

const props = {
  tipo: { type: 'string', enum: ['concreto', 'alvenaria', 'blocos'], description: 'concreto (padrão), alvenaria genérica ou blocos de concreto (alvenaria estrutural, E1e)' },
  material: { type: 'string', description: 'id do tipo de alvenaria (alvenaria.tipo) das paredes de alvenaria e de blocos' },
  esq: { type: 'number', minimum: 0, maximum: 3, description: 'espessura à esquerda do eixo (a → z), m' },
  dir: { type: 'number', minimum: 0, maximum: 3, description: 'espessura à direita do eixo, m' },
  espessura: { type: 'number', minimum: 0.05, maximum: 3, description: 'espessura total centrada no eixo (atalho para esq = dir = e/2)' },
  porPavimento: espPav,
  nasce: { type: 'string', description: '"fundacao" (padrão) ou id do pavimento' }, morre: { type: 'string', description: 'id do pavimento mais alto; padrão: o mais alto' },
  nome: { type: 'string', minLength: 1 }, vinculoBase: { type: 'string', enum: ['engaste', 'rotula'] }, armar: { type: 'boolean' }, base: baseSchema,
} satisfies Record<string, JsonSchema>;

function montar(b: BuildingModel, p: ParedeIn, id: string, nome: string): Parede {
  const ps = pavimentosOrdenados(b), meia = p.espessura !== undefined ? p.espessura / 2 : undefined;
  return {
    id, nome, tipo: p.tipo ?? 'concreto', ...(p.tipo && p.tipo !== 'concreto' && p.material ? { material: p.material } : {}), pontos: limpar(p.pontos), esq: p.esq ?? meia ?? 0.1, dir: p.dir ?? meia ?? 0.1,
    ...(p.porPavimento?.length ? { porPavimento: p.porPavimento.map((e) => ({ ...e })) } : {}),
    nasce: p.nasce ?? 'fundacao', morre: p.morre ?? ps.at(-1)?.id ?? '',
    ...(p.vinculoBase === 'rotula' ? { vinculoBase: 'rotula' as const } : {}), ...(p.armar === false ? { armar: false } : {}), ...(p.base ? { base: { ...p.base } } : {}),
  };
}

registrar<ParedeIn>({
  nome: 'parede.criar',
  descricao: 'Lança uma parede de concreto (E1c) pela polilinha do eixo (m), com a espessura à esquerda e à direita do eixo (ou `espessura` centrada; padrão 10 + 10 cm), espessuras médias por pavimento, pavimentos em que nasce (padrão: fundação) e morre (padrão: o mais alto), vínculo da base (engaste ou rótula), armar (padrão sim) e dados da base para a fundação. Cada trecho com comprimento ≥ 5 × a espessura é modelado em casca; o mais curto, em barra (pilar).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['pontos'], properties: { pontos: { type: 'array', items: ponto, minItems: 2 }, ...props } },
  validar(b, p) { return errosDaParede(b, montar(b, p, '?', '?')); },
  aplicar(d, p) {
    const w = montar(d as BuildingModel, p, novoId(d, 'pw'), p.nome?.trim() || `M${proximoNumero(d as BuildingModel)}`);
    (d.paredes ??= []).push(w);
    return `Parede ${w.nome} lançada (${w.pontos.length - 1} trecho(s)).`;
  },
});

registrar<{ id: string; pontos?: P[] } & Partial<Omit<ParedeIn, 'pontos'>>>({
  nome: 'parede.editar',
  descricao: 'Altera polilinha, espessuras (esq/dir, `espessura` centrada ou por pavimento), pavimentos em que nasce e morre, nome, vínculo da base, armar ou base de uma parede. `porPavimento` vazio remove as espessuras próprias.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, pontos: { type: 'array', items: ponto, minItems: 2 }, ...props } },
  validar(b, p) {
    const w = b.paredes?.find((x) => x.id === p.id);
    if (!w) return err('PAREDE_INEXISTENTE', `Parede ${p.id} não existe.`);
    return errosDaParede(b, editada(w, p));
  },
  aplicar(d, p) {
    const w = d.paredes!.find((x) => x.id === p.id)!;
    const n = editada(w as Parede, p);
    Object.assign(w, n);
    for (const k of ['porPavimento', 'vinculoBase', 'armar', 'base', 'material'] as const) if (n[k] === undefined) delete w[k];
    return `Parede ${w.nome} alterada.`;
  },
});

function editada(w: Parede, p: { pontos?: P[] } & Partial<Omit<ParedeIn, 'pontos'>>): Parede {
  const meia = p.espessura !== undefined ? p.espessura / 2 : undefined;
  const n: Parede = { ...w, ...(p.tipo ? { tipo: p.tipo } : {}), ...(p.material ? { material: p.material } : {}), ...(p.pontos ? { pontos: limpar(p.pontos) } : {}), esq: p.esq ?? meia ?? w.esq, dir: p.dir ?? meia ?? w.dir, ...(p.nasce ? { nasce: p.nasce } : {}), ...(p.morre ? { morre: p.morre } : {}), ...(p.nome ? { nome: p.nome.trim() } : {}) };
  if (p.porPavimento) { if (p.porPavimento.length) n.porPavimento = p.porPavimento.map((e) => ({ ...e })); else delete n.porPavimento; }
  if (n.tipo === 'concreto') delete n.material;
  if (p.vinculoBase) { if (p.vinculoBase === 'rotula') n.vinculoBase = 'rotula'; else delete n.vinculoBase; }
  if (p.armar !== undefined) { if (p.armar) delete n.armar; else n.armar = false; }
  if (p.base) n.base = { ...p.base };
  return n;
}

/** Vigas embutidas nas paredes dadas. */
const embutidas = (b: BuildingModel, ws: string[]) => b.vigas.filter((v) => v.embutida && ws.includes(v.embutida));

registrar<{ ids: string[]; dx: number; dy: number }>({
  nome: 'parede.mover',
  descricao: 'Desloca paredes em (dx, dy) metros; as vigas embutidas nelas vão junto.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' } } },
  validar(b, p) {
    const falta = p.ids.find((id) => !b.paredes?.some((w) => w.id === id));
    if (falta) return err('PAREDE_INEXISTENTE', `Parede ${falta} não existe.`);
    const movidas = b.paredes!.map((w) => (p.ids.includes(w.id) ? { ...w, pontos: w.pontos.map(([x, y]) => [x + p.dx, y + p.dy] as P) } : w));
    for (const w of movidas.filter((x) => p.ids.includes(x.id))) { const e = errosDaParede({ ...b, paredes: movidas }, w); if (e.length) return e; }
    return [];
  },
  aplicar(d, p) {
    for (const w of d.paredes!) if (p.ids.includes(w.id)) w.pontos = w.pontos.map(([x, y]) => [r4(x + p.dx), r4(y + p.dy)]);
    const vs = embutidas(d as BuildingModel, p.ids);
    for (const v of d.vigas) if (vs.some((x) => x.id === v.id)) v.pontos = v.pontos.map(([x, y]) => [r4(x + p.dx), r4(y + p.dy)]);
    return `${p.ids.length} parede(s) movida(s)${vs.length ? `, com ${vs.length} viga(s) embutida(s)` : ''}.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'parede.remover',
  descricao: 'Remove paredes; as vigas embutidas nelas deixam de ser embutidas (ficam como vigas comuns).',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) { const falta = p.ids.find((id) => !b.paredes?.some((w) => w.id === id)); return falta ? err('PAREDE_INEXISTENTE', `Parede ${falta} não existe.`) : []; },
  aplicar(d, p) {
    d.paredes = d.paredes!.filter((w) => !p.ids.includes(w.id));
    if (!d.paredes.length) delete d.paredes;
    for (const v of d.vigas) if (v.embutida && p.ids.includes(v.embutida)) delete v.embutida;
    return `${p.ids.length} parede(s) removida(s).`;
  },
});

type AberturaIn = { parede: string; id?: string; remover?: boolean; tipo?: 'porta' | 'janela'; s?: number; largura?: number; peitoril?: number; altura?: number; pavimento?: string };
registrar<AberturaIn>({
  nome: 'parede.abertura',
  descricao: 'Cria (sem id), edita (com id) ou remove (`remover`) uma abertura (porta ou janela) numa parede: `s` = distância ao longo do eixo do primeiro vértice até a borda inicial (m), largura, peitoril (a partir da base do lance; porta = 0) e altura (m). `pavimento` = o de baixo dos dois entre os quais a abertura fica ("fundacao" ou id; padrão: a base da parede). A abertura cabe num só trecho e deixa trecho de parede acima (lintel ≥ 5 cm).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['parede'], properties: {
    parede: { type: 'string' }, id: { type: 'string' }, remover: { type: 'boolean' }, tipo: { type: 'string', enum: ['porta', 'janela'] },
    s: { type: 'number', minimum: 0 }, largura: { type: 'number', minimum: 0.1, maximum: 50 }, peitoril: { type: 'number', minimum: 0, maximum: 20 }, altura: { type: 'number', minimum: 0.1, maximum: 20 }, pavimento: { type: 'string' },
  } },
  validar(b, p) {
    const w = b.paredes?.find((x) => x.id === p.parede);
    if (!w) return err('PAREDE_INEXISTENTE', `Parede ${p.parede} não existe.`);
    const a = p.id ? w.aberturas?.find((x) => x.id === p.id) : undefined;
    if (p.id && !a) return err('ABERTURA_INEXISTENTE', `Abertura ${p.id} não existe em ${w.nome}.`);
    if (p.remover) return p.id ? [] : err('ABERTURA_INEXISTENTE', 'Informe o id da abertura a remover.');
    if (!a && (p.s === undefined || p.largura === undefined || p.altura === undefined)) return err('ABERTURA_DADOS', 'Informe s, largura e altura da abertura.');
    const nova = abertura(w, p, a, p.id ?? '?');
    return errosProprios(b, { ...w, aberturas: [...(w.aberturas ?? []).filter((x) => x.id !== nova.id), nova] }).filter((x) => x.codigo === 'PAREDE_ABERTURA');
  },
  aplicar(d, p) {
    const w = d.paredes!.find((x) => x.id === p.parede)!;
    if (p.remover) { w.aberturas = w.aberturas!.filter((x) => x.id !== p.id); if (!w.aberturas.length) delete w.aberturas; return `Abertura removida de ${w.nome}.`; }
    const a = p.id ? w.aberturas!.find((x) => x.id === p.id) : undefined;
    const nova = abertura(w as Parede, p, a as AberturaParede | undefined, p.id ?? novoId(d, 'ab'));
    if (a) Object.assign(a, nova); else (w.aberturas ??= []).push(nova);
    return `${nova.tipo === 'porta' ? 'Porta' : 'Janela'} ${a ? 'alterada' : 'criada'} em ${w.nome}.`;
  },
});

function abertura(w: Parede, p: AberturaIn, a: AberturaParede | undefined, id: string): AberturaParede {
  const tipo = p.tipo ?? a?.tipo ?? (p.peitoril ? 'janela' : 'porta');
  return { id, tipo, s: r4(p.s ?? a!.s), largura: r4(p.largura ?? a!.largura), peitoril: r4(p.peitoril ?? a?.peitoril ?? 0), altura: r4(p.altura ?? a!.altura), pavimento: p.pavimento ?? a?.pavimento ?? w.nasce };
}

registrar<{ parede: string; empuxos: EmpuxoParede[] }>({
  nome: 'parede.empuxo',
  descricao: 'Define os empuxos de uma parede (lista vazia remove): para terra, caso H com tipo de empuxo (empuxo.tipo e caso.criar com `empuxo`), lado do terreno (esq/dir do eixo a → z) e cota do terreno própria; para líquido (reservatório), `liquido` com a cota da superfície e γ. As pressões entram nas cascas como cargas do caso.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['parede', 'empuxos'], properties: { parede: { type: 'string' }, empuxos: { type: 'array', items: empuxoSchema } } },
  validar(b, p) {
    const w = b.paredes?.find((x) => x.id === p.parede);
    if (!w) return err('PAREDE_INEXISTENTE', `Parede ${p.parede} não existe.`);
    return errosProprios(b, { ...w, empuxos: p.empuxos }).filter((x) => x.codigo === 'PAREDE_EMPUXO');
  },
  aplicar(d, p) {
    const w = d.paredes!.find((x) => x.id === p.parede)!;
    if (p.empuxos.length) w.empuxos = p.empuxos.map((e) => ({ ...e, ...(e.liquido ? { liquido: { ...e.liquido } } : {}) })); else delete w.empuxos;
    return p.empuxos.length ? `${p.empuxos.length} empuxo(s) em ${w.nome}.` : `Empuxos removidos de ${w.nome}.`;
  },
});

type Alvo = { parede?: string; viga?: string; eixo?: string; ponto?: P };
registrar<{ id: string; extremidade: 'ini' | 'fim'; ate: Alvo }>({
  nome: 'parede.prolongar',
  descricao: 'Prolonga ou apara a extremidade da parede, na direção do trecho, até o eixo de outra parede, de uma viga, um eixo de referência ou a projeção de um ponto. A parede é uma só em todos os pavimentos e grupos em que existe; as vigas embutidas com ponta na mesma extremidade acompanham.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'extremidade', 'ate'], properties: {
    id: { type: 'string' }, extremidade: { type: 'string', enum: ['ini', 'fim'] },
    ate: { type: 'object', additionalProperties: false, properties: { parede: { type: 'string' }, viga: { type: 'string' }, eixo: { type: 'string' }, ponto } },
  } },
  validar(b, p) {
    const w = b.paredes?.find((x) => x.id === p.id);
    if (!w) return err('PAREDE_INEXISTENTE', `Parede ${p.id} não existe.`);
    const q = novaPonta(b, w, p.extremidade, p.ate);
    if (!q) return err('SEM_INTERSECAO', 'A direção da parede não encontra o alvo.', [w.id]);
    const pts = [...w.pontos] as P[];
    if (p.extremidade === 'ini') pts[0] = q; else pts[pts.length - 1] = q;
    return errosDaParede(b, { ...w, pontos: limpar(pts) });
  },
  aplicar(d, p) {
    const w = d.paredes!.find((x) => x.id === p.id)!;
    const k = p.extremidade === 'ini' ? 0 : w.pontos.length - 1, velho = [...w.pontos[k]] as P;
    const q = novaPonta(d as BuildingModel, w as Parede, p.extremidade, p.ate)!;
    w.pontos[k] = q;
    w.pontos = limpar(w.pontos as P[]);
    let n = 0;
    for (const v of d.vigas) if (v.embutida === w.id) for (const j of [0, v.pontos.length - 1]) if (Math.hypot(v.pontos[j][0] - velho[0], v.pontos[j][1] - velho[1]) < 1e-3) { v.pontos[j] = [q[0], q[1]]; n++; }
    return `${w.nome} ajustada${n ? ` (${n} ponta(s) de viga embutida)` : ''}.`;
  },
});

function novaPonta(b: BuildingModel, w: Parede, ext: 'ini' | 'fim', ate: Alvo): P | null {
  const pts = w.pontos as P[], n = pts.length;
  const [a, z] = ext === 'fim' ? [pts[n - 2], pts[n - 1]] : [pts[1], pts[0]];
  const dx = z[0] - a[0], dy = z[1] - a[1];
  if (ate.ponto) { const L2 = dx * dx + dy * dy, t = ((ate.ponto[0] - a[0]) * dx + (ate.ponto[1] - a[1]) * dy) / L2; return t > 0 ? [r4(a[0] + t * dx), r4(a[1] + t * dy)] : null; }
  const linhas: [P, P][] = [];
  const o = ate.parede ? b.paredes?.find((x) => x.id === ate.parede && x.id !== w.id) : undefined, v = ate.viga ? b.vigas.find((x) => x.id === ate.viga) : undefined, e = ate.eixo ? b.eixos.find((x) => x.id === ate.eixo) : undefined;
  if (o) for (let i = 0; i + 1 < o.pontos.length; i++) linhas.push([o.pontos[i] as P, o.pontos[i + 1] as P]);
  if (v) { const ex = geometriaViga(v).eixo; for (let i = 0; i + 1 < ex.length; i++) linhas.push([ex[i] as P, ex[i + 1] as P]); }
  if (e) linhas.push([e.p1 as P, e.p2 as P]);
  let best: P | null = null, tb = Infinity;
  for (const [c, f] of linhas) {
    const ex = f[0] - c[0], ey = f[1] - c[1], den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / den, u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / den;
    if (t > 1e-6 && (e ? true : u >= -1e-6 && u <= 1 + 1e-6) && Math.abs(t - 1) < tb) { tb = Math.abs(t - 1); best = [r4(a[0] + t * dx), r4(a[1] + t * dy)]; }
  }
  return best;
}

const CAMPOS = ['esq', 'dir', 'porPavimento', 'nasce', 'morre', 'vinculoBase', 'armar', 'base', 'empuxos', 'tipo', 'material'] as const;
type Campo = (typeof CAMPOS)[number];
registrar<{ ids: string[]; de?: string; valores?: Partial<Pick<Parede, Campo>>; campos?: Campo[] }>({
  nome: 'parede.atribuir',
  descricao: 'Atribui a paredes (uma a uma ou as de uma janela de seleção) as propriedades de outra parede (`de`) ou valores dados (`valores`): espessuras (esq, dir, por pavimento), pavimentos em que nasce e morre, vínculo da base, armar, base, empuxos e o tipo de parede com o tipo de alvenaria (`tipo`, `material`, E1e). `campos` limita o que é copiado (padrão: as espessuras, armar e o vínculo da base).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: {
    ids, de: { type: 'string' },
    valores: { type: 'object', additionalProperties: false, properties: { tipo: props.tipo, material: props.material, esq: props.esq, dir: props.dir, porPavimento: espPav, nasce: props.nasce, morre: props.morre, vinculoBase: props.vinculoBase, armar: props.armar, base: baseSchema, empuxos: { type: 'array', items: empuxoSchema } } },
    campos: { type: 'array', items: { type: 'string', enum: [...CAMPOS] }, minItems: 1 },
  } },
  validar(b, p) {
    const falta = p.ids.find((id) => !b.paredes?.some((w) => w.id === id));
    if (falta) return err('PAREDE_INEXISTENTE', `Parede ${falta} não existe.`);
    if (!p.de && !p.valores) return err('ATRIBUIR_SEM_FONTE', 'Informe `de` (parede de origem) ou `valores`.');
    if (p.de && !b.paredes!.some((w) => w.id === p.de)) return err('PAREDE_INEXISTENTE', `Parede ${p.de} não existe.`);
    const novas = b.paredes!.map((w) => (p.ids.includes(w.id) ? atribuida(b, w, p) : w));
    for (const w of novas.filter((x) => p.ids.includes(x.id))) { const e = errosDaParede({ ...b, paredes: novas }, w); if (e.length) return e; }
    return [];
  },
  aplicar(d, p) {
    for (const w of d.paredes!) if (p.ids.includes(w.id)) {
      const n = atribuida(d as BuildingModel, w as Parede, p);
      Object.assign(w, n);
      for (const k of CAMPOS) if (n[k] === undefined) delete (w as Partial<Parede>)[k];
    }
    return `Propriedades atribuídas a ${p.ids.length} parede(s).`;
  },
});

function atribuida(b: BuildingModel, w: Parede, p: { de?: string; valores?: Partial<Pick<Parede, Campo>>; campos?: Campo[] }): Parede {
  const fonte = (p.de ? b.paredes!.find((x) => x.id === p.de)! : p.valores!) as Partial<Parede>;
  const campos = p.campos ?? (p.de ? ['esq', 'dir', 'porPavimento', 'armar', 'vinculoBase'] : (Object.keys(p.valores!) as Campo[]));
  const n = { ...w } as unknown as Record<string, unknown>;
  for (const k of campos) { const v = fonte[k]; if (v === undefined) { if (k !== 'esq' && k !== 'dir' && k !== 'nasce' && k !== 'morre' && k !== 'tipo') delete n[k]; } else n[k] = JSON.parse(JSON.stringify(v)); }
  return n as unknown as Parede;
}

registrar<{ grupo: string; camada: string; nasce?: string; morre?: string; emin?: number; emax?: number; tipo?: Parede['tipo']; material?: string }>({
  nome: 'parede.daMascara',
  descricao: 'Gera paredes de concreto a partir de uma camada da máscara de um grupo: cada par de linhas paralelas com afastamento entre `emin` e `emax` (padrão 5 a 35 cm) vira uma parede no eixo do par, com essa espessura, entre os pavimentos dados (padrão: da fundação ao mais alto).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'camada'], properties: { grupo: { type: 'string' }, camada: { type: 'string' }, nasce: props.nasce, morre: props.morre, tipo: props.tipo, material: props.material, emin: { type: 'number', minimum: 0.03, maximum: 1 }, emax: { type: 'number', minimum: 0.05, maximum: 2 } } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const ws = paredesDaMascara(b, p.grupo, p.camada, p.emin ?? 0.05, p.emax ?? 0.35);
    if (!ws.length) return err('SEM_PAREDES', `Nenhuma parede (par de linhas paralelas) na camada “${p.camada}”.`);
    const ps = pavimentosOrdenados(b);
    if (p.tipo && p.tipo !== 'concreto') {
      const w0 = montar(b, { pontos: [[0, 0], [1, 0]], tipo: p.tipo, material: p.material }, '?', '?');
      const e = diagnosticosAlvenaria({ ...b, paredes: [...(b.paredes ?? []), w0] }).filter((x) => x.severidade === 'erro' && x.codigo === 'ALV_MATERIAL' && x.elementos.includes('?'));
      if (e.length) return e;
    }
    return refsPilar(b, p.nasce ?? 'fundacao', p.morre ?? ps.at(-1)?.id ?? '');
  },
  aplicar(d, p) {
    const ws = paredesDaMascara(d as BuildingModel, p.grupo, p.camada, p.emin ?? 0.05, p.emax ?? 0.35);
    for (const x of ws) {
      const w = montar(d as BuildingModel, { pontos: [x.a, x.z], espessura: x.e, nasce: p.nasce, morre: p.morre, tipo: p.tipo, material: p.material }, novoId(d, 'pw'), `M${proximoNumero(d as BuildingModel)}`);
      (d.paredes ??= []).push(w);
    }
    return `${ws.length} parede(s) gerada(s) da camada “${p.camada}”.`;
  },
});

registrar<{ viga: string; parede?: string }>({
  nome: 'viga.embutir',
  descricao: 'Marca a viga como embutida ou de coroamento numa parede (C5.23): aparece sobre a parede, é movida e removida com ela. Sem `parede`, desfaz a marcação.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['viga'], properties: { viga: { type: 'string' }, parede: { type: 'string' } } },
  validar(b, p) {
    const v = b.vigas.find((x) => x.id === p.viga);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.viga} não existe.`);
    if (!p.parede) return v.embutida ? [] : err('VIGA_NAO_EMBUTIDA', `${v.nome} não está embutida em parede.`);
    const w = b.paredes?.find((x) => x.id === p.parede);
    if (!w) return err('PAREDE_INEXISTENTE', `Parede ${p.parede} não existe.`);
    return vigaSobreParede(v.pontos as P[], w) ? [] : err('VIGA_EMBUTIDA', `${v.nome} não corre sobre o eixo de ${w.nome}.`, [v.id, w.id]);
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.viga)!;
    if (p.parede) v.embutida = p.parede; else delete v.embutida;
    return p.parede ? `${v.nome} embutida na parede.` : `${v.nome} deixou de ser embutida.`;
  },
});
