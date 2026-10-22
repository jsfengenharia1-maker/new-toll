// Comandos do pilar-parede (E1b): tipos de seção composta e lançamento. Geometria e regras em building/pilarParede.ts.
import type { Draft } from 'immer';
import type { BuildingModel, LadoPilarParede, PilarParede, TipoPilarParede } from '../building/types';
import { diagnosticosPilaresParede, lancesDoPP, tipoDoPilarParede } from '../building/pilarParede';
import { refsPilar } from '../building/pilares';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m, no sistema local do tipo (origem = ponto de inserção)' };
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };

const ladoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['a', 'z', 'esq', 'dir'], properties: {
  a: ponto, z: ponto,
  esq: { type: 'number', minimum: 0, maximum: 3, description: 'espessura à esquerda do eixo (a → z), m' },
  dir: { type: 'number', minimum: 0, maximum: 3, description: 'espessura à direita do eixo, m' },
  porPavimento: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pavimento', 'esq', 'dir'], properties: { pavimento: { type: 'string' }, esq: { type: 'number', minimum: 0, maximum: 3 }, dir: { type: 'number', minimum: 0, maximum: 3 } } }, description: 'espessuras próprias por pavimento (topo do lance)' },
} };

/** Lados normalizados: o primeiro vértice do primeiro lado vira a origem (ponto de inserção). */
function normalizar(lados: LadoPilarParede[]): LadoPilarParede[] {
  const o = lados[0].a, r = (v: number) => +v.toFixed(4);
  return lados.map((l) => ({ a: [r(l.a[0] - o[0]), r(l.a[1] - o[1])], z: [r(l.z[0] - o[0]), r(l.z[1] - o[1])], esq: l.esq, dir: l.dir, ...(l.porPavimento?.length ? { porPavimento: l.porPavimento.map((e) => ({ ...e })) } : {}) }));
}

type TipoIn = { id?: string; nome?: string; lados?: LadoPilarParede[]; vertices?: [number, number][]; esq?: number; dir?: number; remover?: boolean };

/** Lados do pedido: lista de lados, ou uma poligonal de vértices com a mesma espessura. */
function ladosDe(p: TipoIn): LadoPilarParede[] | null {
  if (p.lados) return p.lados;
  if (p.vertices && p.vertices.length >= 2) return p.vertices.slice(1).map((v, i) => ({ a: p.vertices![i], z: v, esq: p.esq ?? 0.1, dir: p.dir ?? 0.1 }));
  return null;
}

/** Erros dos lados: comprimento nulo, espessura nula. */
function validarLados(lados: LadoPilarParede[]): Diagnostico[] {
  for (const [i, l] of lados.entries()) {
    if (Math.hypot(l.z[0] - l.a[0], l.z[1] - l.a[1]) < 0.05) return err('PPAREDE_LADO', `Lado ${i + 1}: comprimento menor que 5 cm.`);
    const ts = [l.esq + l.dir, ...(l.porPavimento ?? []).map((e) => e.esq + e.dir)];
    if (ts.some((t) => t < 0.05)) return err('PPAREDE_ESPESSURA', `Lado ${i + 1}: espessura total menor que 5 cm.`);
  }
  return [];
}

registrar<TipoIn>({
  nome: 'pilarParede.tipo',
  descricao: 'Cria, edita ou remove um tipo de pilar-parede (seção composta de retângulos, reutilizável). Informe `lados` ({ a, z, esq, dir, porPavimento? }: segmentos do eixo em coordenadas locais, m, com a espessura à esquerda e à direita do eixo; o primeiro vértice do primeiro lado é o ponto de inserção) ou `vertices` (poligonal) com `esq` e `dir`. Sem `id`, cria; com `id`, edita (ou remove com `remover`). A geometria em planta é a mesma em toda a altura; só a espessura varia por pavimento.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, lados: { type: 'array', items: ladoSchema, minItems: 1 },
    vertices: { type: 'array', items: ponto, minItems: 2 }, esq: { type: 'number', minimum: 0, maximum: 3 }, dir: { type: 'number', minimum: 0, maximum: 3 }, remover: { type: 'boolean' },
  } },
  validar(b, p) {
    const t = p.id ? b.tiposPilarParede?.find((x) => x.id === p.id) : undefined;
    if (p.id && !t) return err('TIPO_PPAREDE_INEXISTENTE', `Tipo de pilar-parede ${p.id} não existe.`);
    if (p.remover) return (b.pilaresParede ?? []).some((q) => q.tipo === p.id) ? err('TIPO_PPAREDE_EM_USO', 'Há pilares-parede deste tipo: remova-os ou troque o tipo antes.') : [];
    const lados = ladosDe(p);
    if (!p.id && !lados) return err('PPAREDE_LADO', 'Informe `lados` ou `vertices` (mínimo de 2).');
    if (lados) {
      const e = validarLados(lados);
      if (e.length) return e;
      // pavimentos citados existem
      const pav = new Set(b.pavimentos.map((x) => x.id));
      const ruim = lados.flatMap((l) => l.porPavimento ?? []).find((e2) => !pav.has(e2.pavimento));
      if (ruim) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${ruim.pavimento} não existe.`);
      if (p.id) {
        const novo = { ...b, tiposPilarParede: b.tiposPilarParede!.map((x) => (x.id === p.id ? { ...x, lados: normalizar(lados) } : x)) };
        const ruins = diagnosticosPilaresParede(novo).filter((d) => d.severidade === 'erro' && d.elementos.some((id) => b.pilaresParede?.some((q) => q.id === id && q.tipo === p.id)));
        if (ruins.length) return err('PPAREDE_SOBREPOSTO', `O novo desenho do tipo causaria erro em pilar-parede lançado: ${ruins[0].mensagem}`, ruins[0].elementos);
      }
    }
    return [];
  },
  aplicar(d, p) {
    d.tiposPilarParede ??= [];
    if (p.remover) { d.tiposPilarParede = d.tiposPilarParede.filter((x) => x.id !== p.id); if (!d.tiposPilarParede.length) delete d.tiposPilarParede; return 'Tipo de pilar-parede removido.'; }
    const lados = ladosDe(p);
    if (p.id) {
      const t = d.tiposPilarParede.find((x) => x.id === p.id)!;
      if (p.nome) t.nome = p.nome.trim();
      if (lados) t.lados = normalizar(lados);
      return `Tipo ${t.nome} alterado.`;
    }
    const n = d.tiposPilarParede.length + 1;
    const novo: TipoPilarParede = { id: novoId(d, 'tp'), nome: p.nome?.trim() || `Tipo ${n}`, lados: normalizar(lados!) };
    d.tiposPilarParede.push(novo);
    return `Tipo ${novo.nome} criado (${novo.lados.length} lado(s)).`;
  },
});

type PPIn = { tipo: string; x: number; y: number; angulo?: number; nasce?: string; morre?: string; nome?: string; vinculoBase?: 'engaste' | 'rotula' };

const proximoNumero = (b: BuildingModel) => Math.max(0, ...(b.pilaresParede ?? []).map((p) => { const m = /^PP(\d+)$/.exec(p.nome); return m ? +m[1] : 0; })) + 1;

/** Erros do pilar-parede novo ou alterado (referências, sobreposição, apoio em pilar). */
function errosDoPP(b: BuildingModel, novo: PilarParede): Diagnostico[] {
  if (!tipoDoPilarParede(b, novo)) return err('TIPO_PPAREDE_INEXISTENTE', `Tipo de pilar-parede ${novo.tipo} não existe.`);
  const ref = refsPilar(b, novo.nasce, novo.morre);
  if (ref.length) return ref;
  if (!lancesDoPP(b, novo).length) return err('PILAR_SEM_LANCE', 'O pilar-parede precisa morrer acima do pavimento em que nasce.');
  const outros = (b.pilaresParede ?? []).filter((q) => q.id !== novo.id);
  const m: BuildingModel = { ...b, pilaresParede: [...outros, novo] };
  const e = diagnosticosPilaresParede(m).filter((d) => d.severidade === 'erro' && d.elementos.includes(novo.id));
  return e.map((d) => ({ codigo: d.codigo, severidade: 'erro' as const, elementos: d.elementos, mensagem: d.mensagem }));
}

registrar<PPIn>({
  nome: 'pilarParede.inserir',
  descricao: 'Insere um pilar-parede de um tipo no ponto (x, y) — o primeiro vértice do tipo —, com ângulo (graus, anti-horário), pavimentos em que nasce (padrão: fundação) e morre (padrão: o mais alto) e vínculo externo da base (engaste, padrão, ou rótula). Não nasce em pilar nem apoia pilar. Lado com comprimento ≥ 5 × a espessura é modelado em casca; o mais curto, em barra.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['tipo', 'x', 'y'], properties: {
    tipo: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, angulo: { type: 'number' },
    nasce: { type: 'string', description: '"fundacao" (padrão) ou id do pavimento' }, morre: { type: 'string', description: 'id do pavimento mais alto; padrão: o mais alto da obra' },
    nome: { type: 'string', minLength: 1 }, vinculoBase: { type: 'string', enum: ['engaste', 'rotula'] },
  } },
  validar(b, p) {
    const ps = [...b.pavimentos].sort((a, z) => a.cota - z.cota);
    return errosDoPP(b, { id: '?', nome: '?', tipo: p.tipo, x: p.x, y: p.y, angulo: p.angulo ?? 0, nasce: p.nasce ?? 'fundacao', morre: p.morre ?? ps.at(-1)?.id ?? '' });
  },
  aplicar(d, p) {
    const ps = [...d.pavimentos].sort((a, z) => a.cota - z.cota);
    const nome = p.nome?.trim() || `PP${proximoNumero(d as BuildingModel)}`;
    const novo: PilarParede = { id: novoId(d, 'pp'), nome, tipo: p.tipo, x: p.x, y: p.y, angulo: p.angulo ?? 0, nasce: p.nasce ?? 'fundacao', morre: p.morre ?? ps.at(-1)!.id, ...(p.vinculoBase && p.vinculoBase !== 'engaste' ? { vinculoBase: p.vinculoBase } : {}) };
    (d.pilaresParede ??= []).push(novo);
    return `${nome} inserido em (${fmt(p.x)}; ${fmt(p.y)}).`;
  },
});

registrar<{ id: string } & Partial<PPIn>>({
  nome: 'pilarParede.editar',
  descricao: 'Altera nome, tipo, ponto de inserção, ângulo, pavimentos em que nasce e morre ou o vínculo externo da base (engaste ou rótula) de um pilar-parede.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, tipo: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, angulo: { type: 'number' },
    nasce: { type: 'string' }, morre: { type: 'string' }, nome: { type: 'string', minLength: 1 }, vinculoBase: { type: 'string', enum: ['engaste', 'rotula'] },
  } },
  validar(b, p) {
    const q = b.pilaresParede?.find((x) => x.id === p.id);
    if (!q) return err('PPAREDE_INEXISTENTE', `Pilar-parede ${p.id} não existe.`);
    return errosDoPP(b, { ...q, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) } as PilarParede);
  },
  aplicar(d, p) {
    const q = d.pilaresParede!.find((x) => x.id === p.id)!;
    for (const k of ['tipo', 'x', 'y', 'angulo', 'nasce', 'morre'] as const) if (p[k] !== undefined) (q as unknown as Record<string, unknown>)[k] = p[k];
    if (p.nome) q.nome = p.nome.trim();
    if (p.vinculoBase !== undefined) { if (p.vinculoBase === 'engaste') delete q.vinculoBase; else q.vinculoBase = p.vinculoBase; }
    return `${q.nome} alterado.`;
  },
});

registrar<{ ids: string[]; dx: number; dy: number }>({
  nome: 'pilarParede.mover',
  descricao: 'Desloca pilares-parede em (dx, dy) metros.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' } } },
  validar(b, p) {
    const falta = p.ids.find((id) => !b.pilaresParede?.some((q) => q.id === id));
    if (falta) return err('PPAREDE_INEXISTENTE', `Pilar-parede ${falta} não existe.`);
    const movidos = (b.pilaresParede ?? []).map((q) => (p.ids.includes(q.id) ? { ...q, x: q.x + p.dx, y: q.y + p.dy } : q));
    for (const q of movidos.filter((x) => p.ids.includes(x.id))) {
      const e = errosDoPP({ ...b, pilaresParede: movidos }, q);
      if (e.length) return e;
    }
    return [];
  },
  aplicar(d, p) { for (const q of d.pilaresParede!) if (p.ids.includes(q.id)) { q.x = +(q.x + p.dx).toFixed(4); q.y = +(q.y + p.dy).toFixed(4); } return `${p.ids.length} pilar(es)-parede movido(s).`; },
});

registrar<{ ids: string[] }>({
  nome: 'pilarParede.remover',
  descricao: 'Remove pilares-parede (os tipos ficam).',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) { const falta = p.ids.find((id) => !b.pilaresParede?.some((q) => q.id === id)); return falta ? err('PPAREDE_INEXISTENTE', `Pilar-parede ${falta} não existe.`) : []; },
  aplicar(d, p) { d.pilaresParede = d.pilaresParede!.filter((q) => !p.ids.includes(q.id)); if (!d.pilaresParede.length) delete d.pilaresParede; return `${p.ids.length} pilar(es)-parede removido(s).`; },
});
