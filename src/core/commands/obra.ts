// Comandos de organização da obra: dados gerais, norma, grupos, pavimentos e eixos.
import type { Draft } from 'immer';
import { COBRIMENTOS, USOS, qDoUso, type BuildingModel, type CategoriaUso, type Norma } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const TOL = 1e-3;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const usoSchema: JsonSchema = { type: 'string', enum: USOS.map((u) => u.v), description: 'Categoria de uso (NBR 6120)' };
const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const pav = (b: BuildingModel, id: string) => b.pavimentos.find((p) => p.id === id);
const grp = (b: BuildingModel, id: string) => b.grupos.find((g) => g.id === id);
const cotaOcupada = (b: BuildingModel, cota: number, exceto?: string) => b.pavimentos.find((p) => p.id !== exceto && Math.abs(p.cota - cota) < TOL);
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');

/** "Tipo 3" → "Tipo 4"; "Térreo" → "Térreo 2". */
function proximoNome(nome: string, k: number) {
  const m = /^(.*?)(\d+)$/.exec(nome.trim());
  return m ? `${m[1]}${+m[2] + k}` : `${nome} ${k + 1}`;
}

// ---- obra e norma ----

registrar<{ nome?: string; cidade?: string; profundidadeFundacao?: number }>({
  nome: 'obra.definir',
  descricao: 'Altera os dados gerais da obra (nome, cidade, profundidade da fundação abaixo do pavimento mais baixo).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, properties: {
    nome: { type: 'string', minLength: 1 }, cidade: { type: 'string' },
    profundidadeFundacao: { type: 'number', exclusiveMinimum: 0, maximum: 30, description: 'm' },
  } },
  aplicar(d, p) {
    if (p.nome !== undefined) d.obra.nome = p.nome.trim();
    if (p.cidade !== undefined) d.obra.cidade = p.cidade;
    if (p.profundidadeFundacao !== undefined) d.obra.profundidadeFundacao = p.profundidadeFundacao;
    return 'Dados da obra alterados.';
  },
});

registrar<{ fck?: number; aco?: Norma['aco']; caa?: Norma['caa']; cobrimento?: Norma['cobrimento'] }>({
  nome: 'norma.definir',
  descricao: 'Define fck, aço, classe de agressividade ambiental e cobrimentos (NBR 6118). Ao mudar a CAA sem informar cobrimentos, aplica os da Tabela 7.2.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, properties: {
    fck: { type: 'number', minimum: 20, maximum: 90, description: 'MPa' },
    aco: { type: 'string', enum: ['CA-50', 'CA-60'] },
    caa: { type: 'string', enum: ['I', 'II', 'III', 'IV'] },
    cobrimento: { type: 'object', additionalProperties: false, required: ['laje', 'viga', 'pilar'], properties: {
      laje: { type: 'number', minimum: 1 }, viga: { type: 'number', minimum: 1 }, pilar: { type: 'number', minimum: 1 },
    }, description: 'cm' },
  } },
  aplicar(d, p) {
    if (p.fck !== undefined) d.norma.fck = p.fck;
    if (p.aco) d.norma.aco = p.aco;
    if (p.caa) { d.norma.caa = p.caa; if (!p.cobrimento) d.norma.cobrimento = { ...COBRIMENTOS[p.caa] }; }
    if (p.cobrimento) d.norma.cobrimento = { ...p.cobrimento };
    return 'Parâmetros de norma alterados.';
  },
});

// ---- grupos ----

registrar<{ nome: string; uso: CategoriaUso; gRev: number; q?: number }>({
  nome: 'grupo.criar',
  descricao: 'Cria um grupo de pavimentos iguais (planta compartilhada), com uso, revestimento e carga variável.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['nome'], properties: {
    nome: { type: 'string', minLength: 1 }, uso: { ...usoSchema, default: 'residencial' },
    gRev: { type: 'number', minimum: 0, default: 1.0, description: 'Revestimento e piso (kN/m²)' },
    q: { type: 'number', minimum: 0, description: 'Carga variável (kN/m²); padrão pelo uso' },
  } },
  aplicar(d, p) {
    d.grupos.push({ id: novoId(d, 'g'), nome: p.nome.trim(), uso: p.uso, gRev: p.gRev, q: p.q ?? qDoUso(p.uso) });
    return `Grupo “${p.nome.trim()}” criado.`;
  },
});

registrar<{ id: string; nome?: string; uso?: CategoriaUso; gRev?: number; q?: number }>({
  nome: 'grupo.editar',
  descricao: 'Altera nome, uso, revestimento ou carga variável de um grupo. Ao mudar o uso sem informar q, aplica a carga padrão do uso.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, uso: usoSchema,
    gRev: { type: 'number', minimum: 0 }, q: { type: 'number', minimum: 0 },
  } },
  validar: (b, p) => (grp(b, p.id) ? [] : err('GRUPO_INEXISTENTE', `Grupo ${p.id} não existe.`)),
  aplicar(d, p) {
    const g = d.grupos.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) g.nome = p.nome.trim();
    if (p.uso) { g.uso = p.uso; if (p.q === undefined) g.q = qDoUso(p.uso); }
    if (p.gRev !== undefined) g.gRev = p.gRev;
    if (p.q !== undefined) g.q = p.q;
    return `Grupo “${g.nome}” alterado.`;
  },
});

registrar<{ id: string }>({
  nome: 'grupo.remover',
  descricao: 'Remove um grupo sem pavimentos.',
  risco: 'destrutivo',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar(b, p) {
    if (!grp(b, p.id)) return err('GRUPO_INEXISTENTE', `Grupo ${p.id} não existe.`);
    const n = b.pavimentos.filter((x) => x.grupo === p.id).length;
    return n ? err('GRUPO_EM_USO', `O grupo tem ${n} pavimento(s); mova-os antes de remover.`, [p.id]) : [];
  },
  aplicar(d, p) { d.grupos = d.grupos.filter((g) => g.id !== p.id); return 'Grupo removido.'; },
});

registrar<{ pavimento: string }>({
  nome: 'grupo.desvincular',
  descricao: 'Cria um grupo próprio para o pavimento, copiando uso e cargas do grupo atual (a planta passa a ser independente).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['pavimento'], properties: { pavimento: { type: 'string' } } },
  validar(b, p) {
    const x = pav(b, p.pavimento);
    if (!x) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.pavimento} não existe.`);
    return b.pavimentos.filter((y) => y.grupo === x.grupo).length < 2 ? err('GRUPO_UNICO', `${x.nome} já é o único pavimento do grupo.`, [x.id]) : [];
  },
  aplicar(d, p) {
    const x = d.pavimentos.find((y) => y.id === p.pavimento)!;
    const g = d.grupos.find((y) => y.id === x.grupo)!;
    const id = novoId(d, 'g');
    d.grupos.push({ ...g, id, nome: x.nome });
    x.grupo = id;
    return `${x.nome} desvinculado de “${g.nome}”.`;
  },
});

// ---- pavimentos ----

registrar<{ nome: string; cota: number; grupo?: string; uso: CategoriaUso }>({
  nome: 'pavimento.criar',
  descricao: 'Cria um pavimento na cota do topo da laje estrutural. Sem grupo informado, cria um grupo próprio com o mesmo nome.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['nome', 'cota'], properties: {
    nome: { type: 'string', minLength: 1 }, cota: { type: 'number', description: 'Topo da laje estrutural (m)' },
    grupo: { type: 'string', description: 'Id de um grupo existente' }, uso: { ...usoSchema, default: 'residencial' },
  } },
  validar(b, p) {
    if (p.grupo && !grp(b, p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const o = cotaOcupada(b, p.cota);
    return o ? err('COTA_OCUPADA', `${o.nome} já está na cota ${fmt(p.cota)} m.`, [o.id]) : [];
  },
  aplicar(d, p) {
    let g = p.grupo;
    if (!g) { g = novoId(d, 'g'); d.grupos.push({ id: g, nome: p.nome.trim(), uso: p.uso, gRev: 1.0, q: qDoUso(p.uso) }); }
    d.pavimentos.push({ id: novoId(d, 'pav'), nome: p.nome.trim(), cota: p.cota, grupo: g });
    d.pavimentos.sort((a, z) => a.cota - z.cota);
    return `Pavimento “${p.nome.trim()}” criado na cota ${fmt(p.cota)} m.`;
  },
});

registrar<{ id: string; nome?: string; cota?: number; grupo?: string }>({
  nome: 'pavimento.editar',
  descricao: 'Altera nome, cota ou grupo de um pavimento.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, cota: { type: 'number' }, grupo: { type: 'string' },
  } },
  validar(b, p) {
    if (!pav(b, p.id)) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.id} não existe.`);
    if (p.grupo && !grp(b, p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const o = p.cota !== undefined ? cotaOcupada(b, p.cota, p.id) : undefined;
    return o ? err('COTA_OCUPADA', `${o.nome} já está na cota ${fmt(p.cota!)} m.`, [o.id]) : [];
  },
  aplicar(d, p) {
    const x = d.pavimentos.find((y) => y.id === p.id)!;
    if (p.nome !== undefined) x.nome = p.nome.trim();
    if (p.cota !== undefined) x.cota = p.cota;
    if (p.grupo) x.grupo = p.grupo;
    d.pavimentos.sort((a, z) => a.cota - z.cota);
    return `Pavimento “${x.nome}” alterado.`;
  },
});

registrar<{ id: string }>({
  nome: 'pavimento.remover',
  descricao: 'Remove um pavimento. O grupo que ficar sem pavimentos também é removido (com suas máscaras); pilares que nasciam ou morriam nele passam ao pavimento de baixo.',
  risco: 'destrutivo',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar: (b, p) => (pav(b, p.id) ? [] : err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.id} não existe.`)),
  aplicar(d, p) {
    const ps = [...d.pavimentos].sort((a, z) => a.cota - z.cota);
    const i = ps.findIndex((y) => y.id === p.id);
    const x = ps[i], abaixo = i > 0 ? ps[i - 1].id : 'fundacao';
    d.pavimentos = d.pavimentos.filter((y) => y.id !== p.id);
    if (!d.pavimentos.some((y) => y.grupo === x.grupo)) {
      d.grupos = d.grupos.filter((g) => g.id !== x.grupo);
      d.mascaras = d.mascaras.filter((m) => m.grupo !== x.grupo);
    }
    // pilares: quem nascia no pavimento passa a nascer no de baixo; quem morria nele morre no de baixo (ou some)
    const removidos: string[] = [];
    d.pilares = d.pilares.filter((q) => {
      if (q.nasce === p.id) q.nasce = abaixo;
      if (q.morre === p.id) {
        if (abaixo === 'fundacao' || abaixo === q.nasce) { removidos.push(q.nome); return false; }
        q.morre = abaixo;
      }
      if (q.secoes) { q.secoes = q.secoes.filter((s) => s.pavimento !== p.id); if (!q.secoes.length) delete q.secoes; }
      return true;
    });
    return `Pavimento “${x.nome}” removido${removidos.length ? `; pilares sem lance removidos: ${removidos.join(', ')}` : ''}.`;
  },
});

registrar<{ id: string; vezes: number; peDireito?: number }>({
  nome: 'pavimento.repetir',
  descricao: 'Insere cópias do pavimento logo acima dele, no mesmo grupo (pavimento-tipo). Os pavimentos de cima sobem o necessário.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id', 'vezes'], properties: {
    id: { type: 'string' }, vezes: { type: 'integer', minimum: 1, maximum: 60 },
    peDireito: { type: 'number', exclusiveMinimum: 0, description: 'm; padrão: o pé-direito do pavimento' },
  } },
  validar(b, p) {
    const x = pav(b, p.id);
    if (!x) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.id} não existe.`);
    const ps = [...b.pavimentos].sort((a, z) => a.cota - z.cota);
    const i = ps.findIndex((y) => y.id === p.id);
    const h = p.peDireito ?? (i > 0 ? x.cota - ps[i - 1].cota : 0);
    return h > 0 ? [] : err('PE_DIREITO_INDEFINIDO', `Informe o pé-direito: ${x.nome} é o pavimento mais baixo.`, [x.id]);
  },
  aplicar(d, p) {
    const ps = [...d.pavimentos].sort((a, z) => a.cota - z.cota);
    const i = ps.findIndex((y) => y.id === p.id);
    const x = ps[i];
    const h = p.peDireito ?? x.cota - ps[i - 1].cota;
    const sobe = p.vezes * h;
    for (const y of ps.slice(i + 1)) y.cota = +(y.cota + sobe).toFixed(6);
    for (let k = 1; k <= p.vezes; k++) d.pavimentos.push({ id: novoId(d, 'pav'), nome: proximoNome(x.nome, k), cota: +(x.cota + k * h).toFixed(6), grupo: x.grupo });
    d.pavimentos.sort((a, z) => a.cota - z.cota);
    return `${p.vezes} cópia(s) de “${x.nome}” inseridas (pé-direito ${fmt(h)} m).`;
  },
});

// ---- eixos ----

registrar<{ nome: string; p1: [number, number]; p2: [number, number] }>({
  nome: 'eixo.criar',
  descricao: 'Cria um eixo de referência pela reta p1–p2 (m).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['nome', 'p1', 'p2'], properties: { nome: { type: 'string', minLength: 1 }, p1: ponto, p2: ponto } },
  validar: (_b, p) => (Math.hypot(p.p2[0] - p.p1[0], p.p2[1] - p.p1[1]) < TOL ? err('EIXO_DEGENERADO', 'Os dois pontos do eixo coincidem.') : []),
  aplicar(d, p) { d.eixos.push({ id: novoId(d, 'e'), nome: p.nome.trim(), p1: [...p.p1], p2: [...p.p2] }); return `Eixo ${p.nome.trim()} criado.`; },
});

registrar<{ id: string; nome?: string; p1?: [number, number]; p2?: [number, number] }>({
  nome: 'eixo.editar',
  descricao: 'Altera o nome ou os pontos de um eixo.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, p1: ponto, p2: ponto } },
  validar(b, p) {
    const e = b.eixos.find((x) => x.id === p.id);
    if (!e) return err('EIXO_INEXISTENTE', `Eixo ${p.id} não existe.`);
    const a = p.p1 ?? e.p1, z = p.p2 ?? e.p2;
    return Math.hypot(z[0] - a[0], z[1] - a[1]) < TOL ? err('EIXO_DEGENERADO', 'Os dois pontos do eixo coincidem.', [e.id]) : [];
  },
  aplicar(d, p) {
    const e = d.eixos.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) e.nome = p.nome.trim();
    if (p.p1) e.p1 = [...p.p1];
    if (p.p2) e.p2 = [...p.p2];
    return `Eixo ${e.nome} alterado.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'eixo.remover',
  descricao: 'Remove eixos de referência.',
  risco: 'destrutivo',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const falta = p.ids.filter((id) => !b.eixos.some((e) => e.id === id));
    return falta.length ? err('EIXO_INEXISTENTE', `Eixo(s) inexistente(s): ${falta.join(', ')}.`) : [];
  },
  aplicar(d, p) { const s = new Set(p.ids); d.eixos = d.eixos.filter((e) => !s.has(e.id)); return `${p.ids.length} eixo(s) removido(s).`; },
});

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letra = (i: number) => (i < 26 ? LETRAS[i] : LETRAS[Math.floor(i / 26) - 1] + LETRAS[i % 26]);

registrar<{ origem: [number, number]; dx: number[]; dy: number[]; angulo: number; substituir: boolean; balanco: number }>({
  nome: 'eixo.malha',
  descricao: 'Cria uma malha de eixos: verticais numerados (1, 2, 3...) com os espaçamentos dx e horizontais com letras (A, B, C...) com os espaçamentos dy, a partir da origem e girada de `angulo` graus.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, properties: {
    origem: { ...ponto, default: [0, 0] },
    dx: { type: 'array', items: { type: 'number', exclusiveMinimum: 0 }, default: [], description: 'Espaçamentos entre eixos verticais (m)' },
    dy: { type: 'array', items: { type: 'number', exclusiveMinimum: 0 }, default: [], description: 'Espaçamentos entre eixos horizontais (m)' },
    angulo: { type: 'number', default: 0, description: 'graus, anti-horário' },
    substituir: { type: 'boolean', default: false, description: 'Apaga os eixos existentes antes' },
    balanco: { type: 'number', minimum: 0, default: 1, description: 'Prolongamento dos eixos além da malha (m)' },
  } },
  validar: (_b, p) => (p.dx.length + p.dy.length === 0 ? err('MALHA_VAZIA', 'Informe ao menos um espaçamento em dx ou dy.') : []),
  aplicar(d, p) {
    if (p.substituir) d.eixos = [];
    const xs = [0], ys = [0];
    for (const v of p.dx) xs.push(xs[xs.length - 1] + v);
    for (const v of p.dy) ys.push(ys[ys.length - 1] + v);
    const a = (p.angulo * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const T = (u: number, v: number): [number, number] => [+(p.origem[0] + u * c - v * s).toFixed(6), +(p.origem[1] + u * s + v * c).toFixed(6)];
    const e = p.balanco, x0 = -e, x1 = xs[xs.length - 1] + e, y0 = -e, y1 = ys[ys.length - 1] + e;
    if (p.dx.length) xs.forEach((u, i) => d.eixos.push({ id: novoId(d, 'e'), nome: String(i + 1), p1: T(u, y0), p2: T(u, y1) }));
    if (p.dy.length) ys.forEach((v, i) => d.eixos.push({ id: novoId(d, 'e'), nome: letra(i), p1: T(x0, v), p2: T(x1, v) }));
    return `Malha com ${p.dx.length ? xs.length : 0} eixo(s) vertical(is) e ${p.dy.length ? ys.length : 0} horizontal(is).`;
  },
});

/** Sequência de comandos do edifício padrão (Térreo, 3 tipos, cobertura), usada em "Novo edifício". */
export function comandosEdificioPadrao(): { nome: string; params: Record<string, unknown> }[] {
  return [
    { nome: 'obra.definir', params: { nome: 'Edifício residencial' } },
    { nome: 'pavimento.criar', params: { nome: 'Térreo', cota: 0, uso: 'comum' } },
    { nome: 'grupo.criar', params: { nome: 'Tipo', uso: 'residencial' } },
    { nome: 'pavimento.criar', params: { nome: 'Tipo 1', cota: 3, grupo: 'g_3' } },
    { nome: 'pavimento.repetir', params: { id: 'pav_4', vezes: 2 } },
    { nome: 'pavimento.criar', params: { nome: 'Cobertura', cota: 12, uso: 'cobertura' } },
  ];
}
