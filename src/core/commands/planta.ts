// Comandos da planta: máscara (DXF de referência) e pilares.
import type { Draft } from 'immer';
import { centroPilar, lancesDoPilar, pavimentosOrdenados, type Ajuste, type BuildingModel, type CamadaGeo, type Pilar, type SecaoPilar } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { pilaresSobrepostos, refsPilar } from '../building/pilares';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');

// ---- máscara ----

const mascara = (b: BuildingModel, id: string) => b.mascaras.find((m) => m.id === id);

registrar<{ grupo: string; nome: string; geo: Record<string, CamadaGeo>; escala: number; centralizar: boolean }>({
  nome: 'mascara.importar',
  descricao: 'Importa um desenho de referência (geometria já lida do DXF, por camada) para a planta de um grupo de pavimentos. `escala` = metros por unidade do desenho; `centralizar` leva o canto inferior esquerdo à origem.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'nome', 'geo', 'escala'], properties: {
    grupo: { type: 'string' }, nome: { type: 'string', minLength: 1 },
    geo: { type: 'object', description: 'camada → {linhas: [x1,y1,x2,y2,...], arcos: [cx,cy,r,a0,a1,...], textos: [{x,y,h,rot,t}]}' },
    escala: { type: 'number', exclusiveMinimum: 0, description: 'm por unidade (mm: 0,001; cm: 0,01; m: 1)' },
    centralizar: { type: 'boolean', default: true },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const ruim = Object.entries(p.geo).find(([, c]) => !c || !Array.isArray(c.linhas) || !Array.isArray(c.arcos) || !Array.isArray(c.textos) || c.linhas.length % 4 || c.arcos.length % 5);
    if (ruim) return err('GEOMETRIA_INVALIDA', `Camada “${ruim[0]}” com geometria inválida.`);
    return Object.keys(p.geo).length ? [] : err('GEOMETRIA_VAZIA', 'O desenho não tem entidades lidas.');
  },
  aplicar(d, p) {
    let x0 = Infinity, y0 = Infinity;
    for (const c of Object.values(p.geo)) {
      for (let k = 0; k < c.linhas.length; k += 2) { x0 = Math.min(x0, c.linhas[k]); y0 = Math.min(y0, c.linhas[k + 1]); }
      for (let k = 0; k < c.arcos.length; k += 5) { x0 = Math.min(x0, c.arcos[k] - c.arcos[k + 2]); y0 = Math.min(y0, c.arcos[k + 1] - c.arcos[k + 2]); }
    }
    const ok = p.centralizar && Number.isFinite(x0);
    d.mascaras.push({
      id: novoId(d, 'm'), nome: p.nome.trim(), grupo: p.grupo, escala: p.escala, rotacao: 0,
      dx: ok ? -x0 * p.escala : 0, dy: ok ? -y0 * p.escala : 0,
      camadas: Object.keys(p.geo).sort().map((nome) => ({ nome, visivel: true, capturavel: true })),
      geo: p.geo,
    });
    return `Máscara “${p.nome.trim()}” importada (${Object.keys(p.geo).length} camada(s)).`;
  },
});

registrar<{ id: string; de: [number, number][]; para: [number, number][]; escalar: boolean }>({
  nome: 'mascara.alinhar',
  descricao: 'Alinha a máscara por dois pares de pontos: os pontos `de` (posição atual no mundo) vão para `para`. Gira e desloca; com `escalar`, também ajusta a escala.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id', 'de', 'para'], properties: {
    id: { type: 'string' }, de: { type: 'array', items: ponto, minItems: 2, maxItems: 2 }, para: { type: 'array', items: ponto, minItems: 2, maxItems: 2 },
    escalar: { type: 'boolean', default: false },
  } },
  validar(b, p) {
    if (!mascara(b, p.id)) return err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
    const L = (q: [number, number][]) => Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
    return L(p.de) < 1e-6 || L(p.para) < 1e-6 ? err('PONTOS_COINCIDENTES', 'Os dois pontos de cada par devem ser distintos.') : [];
  },
  aplicar(d, p) {
    const m = d.mascaras.find((x) => x.id === p.id)!;
    const [a1, a2] = p.de, [b1, b2] = p.para;
    const phi = Math.atan2(b2[1] - b1[1], b2[0] - b1[0]) - Math.atan2(a2[1] - a1[1], a2[0] - a1[0]);
    const k = p.escalar ? Math.hypot(b2[0] - b1[0], b2[1] - b1[1]) / Math.hypot(a2[0] - a1[0], a2[1] - a1[1]) : 1;
    const c = Math.cos(phi), s = Math.sin(phi), ux = m.dx - a1[0], uy = m.dy - a1[1];
    m.dx = k * (c * ux - s * uy) + b1[0];
    m.dy = k * (s * ux + c * uy) + b1[1];
    m.rotacao = +(m.rotacao + (phi * 180) / Math.PI).toFixed(9);
    m.escala *= k;
    return `Máscara “${m.nome}” alinhada${p.escalar ? ` (escala × ${fmt(k)})` : ''}.`;
  },
});

registrar<{ id: string; nome?: string; escala?: number; rotacao?: number; dx?: number; dy?: number }>({
  nome: 'mascara.editar',
  descricao: 'Altera nome, escala (m por unidade), rotação (graus) ou deslocamento (m) da máscara.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, escala: { type: 'number', exclusiveMinimum: 0 },
    rotacao: { type: 'number' }, dx: { type: 'number' }, dy: { type: 'number' },
  } },
  validar: (b, p) => (mascara(b, p.id) ? [] : err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`)),
  aplicar(d, p) {
    const m = d.mascaras.find((x) => x.id === p.id)!;
    for (const k of ['nome', 'escala', 'rotacao', 'dx', 'dy'] as const) if (p[k] !== undefined) (m as Record<string, unknown>)[k] = k === 'nome' ? String(p[k]).trim() : p[k];
    return `Máscara “${m.nome}” alterada.`;
  },
});

registrar<{ id: string; camadas: string[]; visivel?: boolean; capturavel?: boolean }>({
  nome: 'mascara.camadas',
  descricao: 'Liga/desliga a visibilidade e a captura de camadas da máscara.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'camadas'], properties: {
    id: { type: 'string' }, camadas: ids, visivel: { type: 'boolean' }, capturavel: { type: 'boolean' },
  } },
  validar(b, p) {
    const m = mascara(b, p.id);
    if (!m) return err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
    const falta = p.camadas.filter((c) => !m.camadas.some((x) => x.nome === c));
    return falta.length ? err('CAMADA_INEXISTENTE', `Camada(s) inexistente(s): ${falta.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const m = d.mascaras.find((x) => x.id === p.id)!;
    for (const c of m.camadas) if (p.camadas.includes(c.nome)) { if (p.visivel !== undefined) c.visivel = p.visivel; if (p.capturavel !== undefined) c.capturavel = p.capturavel; }
    return `${p.camadas.length} camada(s) alterada(s).`;
  },
});

registrar<{ id: string }>({
  nome: 'mascara.remover',
  descricao: 'Remove a máscara.',
  risco: 'destrutivo',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar: (b, p) => (mascara(b, p.id) ? [] : err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`)),
  aplicar(d, p) { d.mascaras = d.mascaras.filter((m) => m.id !== p.id); return 'Máscara removida.'; },
});

// ---- pilares ----

const secaoSchema: JsonSchema = { oneOf: [
  { type: 'object', additionalProperties: false, required: ['tipo', 'b', 'h'], properties: { tipo: { const: 'ret' }, b: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'm (local x)' }, h: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'm (local y)' } } },
  { type: 'object', additionalProperties: false, required: ['tipo', 'd'], properties: { tipo: { const: 'circ' }, d: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'diâmetro (m)' } } },
], description: 'Seção: {tipo: "ret", b, h} ou {tipo: "circ", d}, em m' };
const ajusteSchema: JsonSchema = { type: 'string', enum: ['c', 'n', 's', 'l', 'o', 'ne', 'no', 'se', 'so'], description: 'Ponto fixo: centro, faces (n, s, l, o) ou cantos' };

type PilarIn = { x: number; y: number; secao: SecaoPilar; ajuste: Ajuste; angulo: number; nasce: string; morre?: string; nome?: string };

const proximoNumero = (b: BuildingModel) => Math.max(0, ...b.pilares.map((p) => { const m = /^P(\d+)$/.exec(p.nome); return m ? +m[1] : 0; })) + 1;

registrar<PilarIn>({
  nome: 'pilar.inserir',
  descricao: 'Insere um pilar no ponto (x, y) do ponto fixo, com seção, ângulo e os pavimentos em que nasce (padrão: fundação) e morre (padrão: o mais alto).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['x', 'y', 'secao'], properties: {
    x: { type: 'number' }, y: { type: 'number' }, secao: secaoSchema, ajuste: { ...ajusteSchema, default: 'c' },
    angulo: { type: 'number', default: 0, description: 'graus, anti-horário' },
    nasce: { type: 'string', default: 'fundacao', description: '"fundacao" ou id do pavimento' },
    morre: { type: 'string', description: 'id do pavimento mais alto; padrão: o mais alto da obra' },
    nome: { type: 'string', minLength: 1, description: 'padrão: próximo P<n>' },
  } },
  validar(b, p) {
    const morre = p.morre ?? pavimentosOrdenados(b).at(-1)?.id ?? '';
    const r = refsPilar(b, p.nasce, morre);
    if (r.length) return r;
    const novo: Pilar = { id: '?', nome: '?', x: p.x, y: p.y, angulo: p.angulo, ajuste: p.ajuste, nasce: p.nasce, morre, secao: p.secao };
    const sob = pilaresSobrepostos(b, novo);
    return sob.length ? err('PILAR_SOBREPOSTO', `A seção se sobrepõe a ${sob.map((q) => q.nome).join(', ')}.`, sob.map((q) => q.id)) : [];
  },
  aplicar(d, p) {
    const nome = p.nome?.trim() || `P${proximoNumero(d as BuildingModel)}`;
    d.pilares.push({ id: novoId(d, 'p'), nome, x: p.x, y: p.y, angulo: p.angulo, ajuste: p.ajuste, nasce: p.nasce, morre: p.morre ?? pavimentosOrdenados(d as BuildingModel).at(-1)!.id, secao: { ...p.secao } });
    return `${nome} inserido em (${fmt(p.x)}; ${fmt(p.y)}).`;
  },
});

registrar<{ id: string } & Partial<Omit<PilarIn, 'nome'>> & { nome?: string }>({
  nome: 'pilar.editar',
  descricao: 'Altera nome, posição do ponto fixo, seção (de todos os lances sem seção própria), ponto fixo, ângulo, nascimento ou morte de um pilar.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, x: { type: 'number' }, y: { type: 'number' }, secao: secaoSchema,
    ajuste: ajusteSchema, angulo: { type: 'number' }, nasce: { type: 'string' }, morre: { type: 'string' },
  } },
  validar(b, p) {
    const q = b.pilares.find((x) => x.id === p.id);
    if (!q) return err('PILAR_INEXISTENTE', `Pilar ${p.id} não existe.`);
    const n: Pilar = { ...q, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) } as Pilar;
    const r = refsPilar(b, n.nasce, n.morre);
    if (r.length) return r;
    const sob = pilaresSobrepostos(b, n);
    return sob.length ? err('PILAR_SOBREPOSTO', `A seção se sobrepõe a ${sob.map((x) => x.nome).join(', ')}.`, sob.map((x) => x.id)) : [];
  },
  aplicar(d, p) {
    const q = d.pilares.find((x) => x.id === p.id)!;
    for (const k of ['nome', 'x', 'y', 'ajuste', 'angulo', 'nasce', 'morre'] as const) if (p[k] !== undefined) (q as Record<string, unknown>)[k] = k === 'nome' ? String(p[k]).trim() : p[k];
    if (p.secao) q.secao = { ...p.secao };
    return `${q.nome} alterado.`;
  },
});

registrar<{ id: string; pavimento: string; secao?: SecaoPilar }>({
  nome: 'pilar.secaoLance',
  descricao: 'Define a seção de um lance do pilar (o lance que chega ao pavimento indicado). Sem `secao`, o lance volta à seção geral.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'pavimento'], properties: { id: { type: 'string' }, pavimento: { type: 'string' }, secao: secaoSchema } },
  validar(b, p) {
    const q = b.pilares.find((x) => x.id === p.id);
    if (!q) return err('PILAR_INEXISTENTE', `Pilar ${p.id} não existe.`);
    return lancesDoPilar(b, q).some((x) => x.id === p.pavimento) ? [] : err('LANCE_INEXISTENTE', `${q.nome} não tem lance chegando a ${p.pavimento}.`, [q.id]);
  },
  aplicar(d, p) {
    const q = d.pilares.find((x) => x.id === p.id)!;
    q.secoes = (q.secoes ?? []).filter((s) => s.pavimento !== p.pavimento);
    if (p.secao) q.secoes.push({ pavimento: p.pavimento, secao: { ...p.secao } });
    if (!q.secoes.length) delete q.secoes;
    return `Seção do lance de ${q.nome} alterada.`;
  },
});

registrar<{ ids: string[]; dx: number; dy: number }>({
  nome: 'pilar.mover',
  descricao: 'Desloca pilares de (dx, dy) metros.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' } } },
  validar(b, p) {
    const falta = p.ids.filter((id) => !b.pilares.some((x) => x.id === id));
    if (falta.length) return err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${falta.join(', ')}.`);
    const mov = new Set(p.ids);
    for (const id of p.ids) {
      const q = b.pilares.find((x) => x.id === id)!;
      const sob = pilaresSobrepostos(b, { ...q, x: q.x + p.dx, y: q.y + p.dy }, mov);
      if (sob.length) return err('PILAR_SOBREPOSTO', `${q.nome} ficaria sobre ${sob.map((x) => x.nome).join(', ')}.`, [q.id, ...sob.map((x) => x.id)]);
    }
    return [];
  },
  aplicar(d, p) {
    for (const q of d.pilares) if (p.ids.includes(q.id)) { q.x = +(q.x + p.dx).toFixed(9); q.y = +(q.y + p.dy).toFixed(9); }
    return `${p.ids.length} pilar(es) movido(s).`;
  },
});

registrar<{ ids: string[]; dx: number; dy: number; vezes: number }>({
  nome: 'pilar.copiar',
  descricao: 'Copia pilares com deslocamento (dx, dy), repetido `vezes` (cópias em série). As cópias recebem os próximos números.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' }, vezes: { type: 'integer', minimum: 1, maximum: 100, default: 1 } } },
  validar(b, p) {
    const falta = p.ids.filter((id) => !b.pilares.some((x) => x.id === id));
    if (falta.length) return err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${falta.join(', ')}.`);
    if (Math.hypot(p.dx, p.dy) < 1e-6) return err('DESLOCAMENTO_NULO', 'Informe um deslocamento.');
    const copias: Pilar[] = [];
    for (let k = 1; k <= p.vezes; k++) for (const id of p.ids) { const q = b.pilares.find((x) => x.id === id)!; copias.push({ ...q, id: `${id}#${k}`, x: q.x + k * p.dx, y: q.y + k * p.dy }); }
    const tmp = { ...b, pilares: [...b.pilares, ...copias] };
    for (const c of copias) { const sob = pilaresSobrepostos(tmp, c); if (sob.length) return err('PILAR_SOBREPOSTO', `Uma cópia ficaria sobre ${sob.map((x) => x.nome.replace(/#.*/, '')).join(', ')}.`); }
    return [];
  },
  aplicar(d, p) {
    let n = proximoNumero(d as BuildingModel);
    const orig = p.ids.map((id) => d.pilares.find((x) => x.id === id)!).map((q) => JSON.parse(JSON.stringify(q)) as Pilar);
    for (let k = 1; k <= p.vezes; k++) for (const q of orig) d.pilares.push({ ...q, id: novoId(d, 'p'), nome: `P${n++}`, x: +(q.x + k * p.dx).toFixed(9), y: +(q.y + k * p.dy).toFixed(9) });
    return `${p.ids.length * p.vezes} cópia(s) criada(s).`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'pilar.remover',
  descricao: 'Remove pilares.',
  risco: 'destrutivo',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) {
    const falta = p.ids.filter((id) => !b.pilares.some((x) => x.id === id));
    return falta.length ? err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${falta.join(', ')}.`) : [];
  },
  aplicar(d, p) { const s = new Set(p.ids); d.pilares = d.pilares.filter((q) => !s.has(q.id)); return `${p.ids.length} pilar(es) removido(s).`; },
});

registrar<{ tolerancia: number }>({
  nome: 'pilar.renumerar',
  descricao: 'Renumera os pilares P1, P2... da esquerda para a direita e de cima para baixo (linhas agrupadas pela tolerância em y, m). Os ids não mudam.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { tolerancia: { type: 'number', minimum: 0, default: 0.3 } } },
  aplicar(d, p) {
    const cs = d.pilares.map((q) => ({ q, c: centroPilar(q, q.secao) })).sort((a, z) => z.c[1] - a.c[1]);
    const linhas: (typeof cs)[] = [];
    for (const it of cs) { const l = linhas.at(-1); if (l && Math.abs(l[0].c[1] - it.c[1]) <= p.tolerancia) l.push(it); else linhas.push([it]); }
    let n = 1;
    for (const l of linhas) for (const it of l.sort((a, z) => a.c[0] - z.c[0])) it.q.nome = `P${n++}`;
    return `${d.pilares.length} pilar(es) renumerado(s).`;
  },
});

