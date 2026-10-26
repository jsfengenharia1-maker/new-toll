// Cortes do edifício e linhas de seção dos pavimentos (V2): só dados de vista que vão para o arquivo e para as pranchas;
// não mudam o cálculo (`calculo: false`).
import type { Draft } from 'immer';
import { CORTES_PRANCHA_PADRAO, PRANCHA_PADRAO, type BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const TOL = 1e-6;
const comp = (pts: [number, number][]) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
const LETRA = (n: number) => String.fromCharCode(65 + ((n - 1) % 26));

registrar<{ nome?: string; pontos: [number, number][]; sentido?: 'esq' | 'dir'; profundidade?: number }>({
  nome: 'corte.criar',
  descricao: 'Cria um corte do edifício pela poligonal traçada na planta (m); o observador olha para o lado `sentido` do traçado (esq ou dir) até a `profundidade` (m; omitida = até o fim do edifício).',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['pontos'], properties: {
    nome: { type: 'string', minLength: 1 }, pontos: { type: 'array', items: ponto, minItems: 2 },
    sentido: { type: 'string', enum: ['esq', 'dir'], default: 'esq' }, profundidade: { type: 'number', exclusiveMinimum: 0 } } },
  validar: (_b, p) => (comp(p.pontos) < TOL ? err('CORTE_DEGENERADO', 'Os pontos do corte coincidem.') : []),
  aplicar(d, p) {
    const n = (d.cortes ??= []).length + 1;
    const nome = p.nome?.trim() || `Corte ${LETRA(n)}${LETRA(n)}`;
    d.cortes.push({ id: novoId(d, 'co'), nome, pontos: p.pontos.map((q) => [q[0], q[1]] as [number, number]), sentido: p.sentido ?? 'esq', ...(p.profundidade ? { profundidade: p.profundidade } : {}) });
    return `${nome} criado.`;
  },
});

registrar<{ id: string; nome?: string; pontos?: [number, number][]; sentido?: 'esq' | 'dir'; profundidade?: number }>({
  nome: 'corte.editar',
  descricao: 'Altera o nome, o traçado, o sentido ou a profundidade (0 = até o fim do edifício) de um corte.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, pontos: { type: 'array', items: ponto, minItems: 2 },
    sentido: { type: 'string', enum: ['esq', 'dir'] }, profundidade: { type: 'number', minimum: 0 } } },
  validar(b, p) {
    const c = b.cortes?.find((x) => x.id === p.id);
    if (!c) return err('CORTE_INEXISTENTE', `Corte ${p.id} não existe.`);
    return comp(p.pontos ?? c.pontos) < TOL ? err('CORTE_DEGENERADO', 'Os pontos do corte coincidem.', [c.id]) : [];
  },
  aplicar(d, p) {
    const c = d.cortes!.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) c.nome = p.nome.trim();
    if (p.pontos) c.pontos = p.pontos.map((q) => [q[0], q[1]] as [number, number]);
    if (p.sentido) c.sentido = p.sentido;
    if (p.profundidade === 0) delete c.profundidade; else if (p.profundidade !== undefined) c.profundidade = p.profundidade;
    return `${c.nome} alterado.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'corte.remover',
  descricao: 'Remove cortes do edifício.',
  risco: 'destrutivo',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) { const f = p.ids.filter((id) => !b.cortes?.some((c) => c.id === id)); return f.length ? err('CORTE_INEXISTENTE', `Corte(s) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) { const s = new Set(p.ids); d.cortes = (d.cortes ?? []).filter((c) => !s.has(c.id)); return `${p.ids.length} corte(s) removido(s).`; },
});

registrar<{ nome?: string; a: [number, number]; b: [number, number]; pavimento?: string }>({
  nome: 'secao.criar',
  descricao: 'Cria uma linha de seção do pavimento pelos pontos a–b (m), em qualquer direção.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['a', 'b'], properties: { nome: { type: 'string', minLength: 1 }, a: ponto, b: ponto, pavimento: { type: 'string' } } },
  validar(b, p) {
    if (Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) < TOL) return err('SECAO_DEGENERADA', 'Os dois pontos da seção coincidem.');
    return p.pavimento && !b.pavimentos.some((x) => x.id === p.pavimento) ? err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.pavimento} não existe.`) : [];
  },
  aplicar(d, p) {
    const n = (d.secoes ??= []).length + 1;
    const nome = p.nome?.trim() || `Seção ${n}`;
    d.secoes.push({ id: novoId(d, 'se'), nome, a: [p.a[0], p.a[1]], b: [p.b[0], p.b[1]], ...(p.pavimento ? { pavimento: p.pavimento } : {}) });
    return `${nome} criada.`;
  },
});

registrar<{ id: string; nome?: string; a?: [number, number]; b?: [number, number]; pavimento?: string }>({
  nome: 'secao.editar',
  descricao: 'Altera o nome, os pontos ou o pavimento de uma linha de seção.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, a: ponto, b: ponto, pavimento: { type: 'string' } } },
  validar(b, p) {
    const s = b.secoes?.find((x) => x.id === p.id);
    if (!s) return err('SECAO_INEXISTENTE', `Seção ${p.id} não existe.`);
    const a = p.a ?? s.a, z = p.b ?? s.b;
    return Math.hypot(z[0] - a[0], z[1] - a[1]) < TOL ? err('SECAO_DEGENERADA', 'Os dois pontos da seção coincidem.', [s.id]) : [];
  },
  aplicar(d, p) {
    const s = d.secoes!.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) s.nome = p.nome.trim();
    if (p.a) s.a = [p.a[0], p.a[1]];
    if (p.b) s.b = [p.b[0], p.b[1]];
    if (p.pavimento !== undefined) s.pavimento = p.pavimento;
    return `${s.nome} alterada.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'secao.remover',
  descricao: 'Remove linhas de seção.',
  risco: 'destrutivo',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) { const f = p.ids.filter((id) => !b.secoes?.some((c) => c.id === id)); return f.length ? err('SECAO_INEXISTENTE', `Seção(ões) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) { const s = new Set(p.ids); d.secoes = (d.secoes ?? []).filter((c) => !s.has(c.id)); return `${p.ids.length} seção(ões) removida(s).`; },
});

const ESCALAS_FOLHA_CORTES = [0, 20, 25, 50, 75, 100, 125, 200];
registrar<{ ids?: string[]; todos?: boolean; plantas?: string[]; escala?: number; marca?: number; padrao?: boolean }>({
  nome: 'prancha.cortes',
  descricao: 'Ativa cortes do edifício nas pranchas (V6a): `ids` = cortes ativados (substitui a lista; [] desativa todos) ou `todos` (true ativa todos os cortes; false desativa); `plantas` = grupos cujas plantas levam as marcas de corte (formas e locação; [] = todos); `escala` = denominador da folha de cortes (0 = automática: a maior em que todos cabem numa folha); `marca` = tamanho da marca de corte nas plantas (mm no papel, 4 a 30); `padrao` volta tudo ao padrão. Os cortes ativos saem como marcas nas plantas e como a folha "cortes" (SCT, a confirmar) do conjunto.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    ids: { type: 'array', items: { type: 'string' } }, todos: { type: 'boolean' }, plantas: { type: 'array', items: { type: 'string' }, description: 'ids de grupos' },
    escala: { type: 'number', enum: ESCALAS_FOLHA_CORTES }, marca: { type: 'number', minimum: 4, maximum: 30 }, padrao: { type: 'boolean' } } },
  validar(b, p) {
    const fc = (p.ids ?? []).filter((id) => !b.cortes?.some((c) => c.id === id));
    if (fc.length) return err('CORTE_INEXISTENTE', `Corte(s) inexistente(s): ${fc.join(', ')}.`);
    const fg = (p.plantas ?? []).filter((id) => !b.grupos.some((g) => g.id === id));
    return fg.length ? err('GRUPO_INEXISTENTE', `Grupo(s) inexistente(s): ${fg.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    d.prancha ??= { ...PRANCHA_PADRAO, carimbo: {} };
    const c = p.padrao ? {} : { ...(d.prancha.cortes ?? {}) };
    if (p.todos !== undefined) { if (p.todos) c.ids = (d.cortes ?? []).map((x) => x.id); else delete c.ids; }
    if (p.ids) { if (p.ids.length) c.ids = [...new Set(p.ids)]; else delete c.ids; }
    if (p.plantas) { if (p.plantas.length) c.plantas = [...new Set(p.plantas)]; else delete c.plantas; }
    if (p.escala !== undefined) { if (p.escala === CORTES_PRANCHA_PADRAO.escala) delete c.escala; else c.escala = p.escala; }
    if (p.marca !== undefined) { if (p.marca === CORTES_PRANCHA_PADRAO.marca) delete c.marca; else c.marca = p.marca; }
    if (Object.keys(c).length) d.prancha.cortes = c; else delete d.prancha.cortes;
    return `${c.ids?.length ?? 0} corte(s) ativo(s) nas pranchas.`;
  },
});
