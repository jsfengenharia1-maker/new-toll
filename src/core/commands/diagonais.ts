// Comandos das diagonais de contraventamento (E2d; C6.36 a C6.46): criar, editar, mover os extremos, remover (todos os grupos) e
// atribuir (copiar dados de outra diagonal). Em diagonal múltipla, editar, mover e atribuir valem só no grupo atual (`pavimento`):
// a barra desse grupo sai da múltipla e vira uma diagonal própria (C6.46); remover apaga em todos os grupos (C6.44).
import type { Draft } from 'immer';
import { barrasDaInclinada } from '../building/inclinadas';
import type { BuildingModel, Diagonal, LigacaoBarra } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { nivelEdicao } from './tabelas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';
import { err, flambSchema, fmt, ligSchema, limpar, nivelSchema, pavNome, ponto, secaoSchema, validarGeometria } from './inclinadas';

type P = [number, number];
type Flamb = { vertical?: number; transversal?: number };
const novoId = (d: Draft<BuildingModel>) => `dg_${(++d.seq).toString(36)}`;
const pavSchema: JsonSchema = { type: 'string', description: 'id do pavimento inicial da barra (o grupo atual): em diagonal múltipla, vale só para a barra desse grupo' };
const CAMPOS = ['secao', 'ligacoes', 'flambagem', 'cobrimento'] as const;
type Campo = (typeof CAMPOS)[number];

const achar = (b: BuildingModel, id: string) => b.diagonais?.find((x) => x.id === id);

/** Erros de `pavimento`: a diagonal precisa ter barra que comece nele. */
function validarPavimento(b: BuildingModel, v: Diagonal, pavimento?: string): Diagnostico[] {
  if (pavimento === undefined) return [];
  return barrasDaInclinada(b, v).some((x) => x.pavIni === pavimento) ? [] : err('DIAGONAL_PAVIMENTO', `A diagonal ${v.nome} não tem barra que comece no pavimento ${pavNome(b, pavimento)}.`, [v.id]);
}

/** Geometria da barra que a edição atinge: a do grupo atual, ou a lançada. */
function geometriaAtingida(b: BuildingModel, v: Diagonal, pavimento?: string) {
  const bar = pavimento === undefined ? undefined : barrasDaInclinada(b, v).find((x) => x.pavIni === pavimento);
  return bar && v.multipla ? { ...v, pavIni: bar.pavIni, pavFim: bar.pavFim, multipla: false } : v;
}

/**
 * A diagonal que a edição atinge. Sem `pavimento` ou em diagonal que não é múltipla (ou só com uma barra), é a própria. Em múltipla,
 * a barra do grupo atual sai da múltipla (que a registra em `excluidas`) e vira uma diagonal nova, copiada, que recebe a edição.
 */
function alvoDaEdicao(d: Draft<BuildingModel>, v: Draft<Diagonal>, pavimento?: string): Draft<Diagonal> {
  if (pavimento === undefined || !v.multipla) return v;
  const barras = barrasDaInclinada(d as BuildingModel, v), bar = barras.find((x) => x.pavIni === pavimento);
  if (!bar || barras.length < 2) return v;
  (v.excluidas ??= []).push(bar.pavIni);
  const copia: Diagonal = JSON.parse(JSON.stringify({ ...v, excluidas: undefined, multipla: undefined, id: novoId(d), nome: `${v.nome} (${pavNome(d as BuildingModel, bar.pavIni)})`, pavIni: bar.pavIni, pavFim: bar.pavFim }));
  d.diagonais!.push(copia);
  return d.diagonais![d.diagonais!.length - 1];
}

interface ParamsCriar { pavIni: string; pavFim: string; pIni: P; pFim: P; secao: { b: number; h: number }; nome?: string; nivelIni?: number; nivelFim?: number; multipla?: boolean; ligIni?: LigacaoBarra; ligFim?: LigacaoBarra; flambagem?: Flamb }

registrar<ParamsCriar>({
  nome: 'diagonal.criar',
  descricao: 'Lança uma diagonal de contraventamento de concreto entre o ponto `pIni` no pavimento `pavIni` e `pFim` em `pavFim` (podem estar em grupos diferentes, atravessando os intermediários; cotas dos pavimentos mais o desnível opcional de cada ponta), ligada ao pilar ou à viga que a ponta toca. Barra de 2 nós e 6 gdl, fora do diafragma. `multipla`: uma diagonal por par de pavimentos de mesma posição dos grupos inicial e final. Nos cruzamentos com outras diagonais o pórtico ganha um nó, e a flambagem continua pelo comprimento total entre as pontas. Ligações `engastada` (padrão) ou `articulada`; coeficientes de flambagem por plano.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['pavIni', 'pavFim', 'pIni', 'pFim', 'secao'], properties: {
    pavIni: { type: 'string', description: 'id do pavimento da ponta inicial' }, pavFim: { type: 'string', description: 'id do pavimento da ponta final' },
    pIni: ponto, pFim: ponto, secao: secaoSchema, nome: { type: 'string', minLength: 1 }, nivelIni: nivelSchema, nivelFim: nivelSchema, multipla: { type: 'boolean' },
    ligIni: ligSchema, ligFim: ligSchema, flambagem: flambSchema,
  } },
  validar: (b, p) => validarGeometria(b, { ...p, id: '', nome: p.nome ?? 'D' }, 'DIAGONAL'),
  aplicar(d, p) {
    const lista = (d.diagonais ??= []);
    const n = Math.max(0, ...lista.map((v) => { const m = /^D(\d+)$/.exec(v.nome); return m ? +m[1] : 0; })) + 1;
    const v: Diagonal = limpar({
      id: novoId(d), nome: p.nome ?? `D${n}`, pavIni: p.pavIni, pavFim: p.pavFim, pIni: [...p.pIni] as P, pFim: [...p.pFim] as P, nivelIni: p.nivelIni || undefined, nivelFim: p.nivelFim || undefined,
      secao: { ...p.secao }, multipla: p.multipla || undefined, ligIni: p.ligIni === 'articulada' ? 'articulada' : undefined, ligFim: p.ligFim === 'articulada' ? 'articulada' : undefined,
      flambagem: p.flambagem && Object.keys(p.flambagem).length ? { ...p.flambagem } : undefined,
    });
    lista.push(v);
    const bs = barrasDaInclinada(d as BuildingModel, v);
    return `Diagonal ${v.nome}: ${pavNome(d as BuildingModel, v.pavIni)} → ${pavNome(d as BuildingModel, v.pavFim)}, ${fmt(v.secao.b * 100, 0)}×${fmt(v.secao.h * 100, 0)} cm, ${fmt(bs.find((x) => x.lancada)?.L ?? 0)} m${bs.length > 1 ? `, múltipla (${bs.length} barras)` : ''}.`;
  },
});

type ParamsEditar = { id: string; pavimento?: string; nome?: string; secao?: { b: number; h: number }; multipla?: boolean; ligIni?: LigacaoBarra; ligFim?: LigacaoBarra; nivelIni?: number; nivelFim?: number; flambagem?: Flamb; cobrimento?: number };

registrar<ParamsEditar>({
  nome: 'diagonal.editar',
  descricao: 'Altera nome, seção, múltipla, ligações das pontas, desnível das pontas, coeficientes de flambagem por plano e cobrimento (cm; 0 volta ao das vigas) de uma diagonal. Com `pavimento` (o grupo atual) e a diagonal múltipla, vale só para a barra desse grupo, que vira uma diagonal própria; sem ele, vale para todas as barras.',
  risco: 'escrita',
  calculo: (p) => (p.pavimento !== undefined ? true : nivelEdicao(p, ['nome', 'cobrimento', 'flambagem'])), // dividir a múltipla muda as barras da análise
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, pavimento: pavSchema, nome: { type: 'string', minLength: 1 }, secao: secaoSchema, multipla: { type: 'boolean' }, ligIni: ligSchema, ligFim: ligSchema, nivelIni: nivelSchema, nivelFim: nivelSchema,
    flambagem: flambSchema, cobrimento: { type: 'number', minimum: 0, maximum: 10 },
  } },
  validar(b, p) {
    const v = achar(b, p.id);
    if (!v) return err('DIAGONAL_INEXISTENTE', `Diagonal ${p.id} não existe.`);
    const e = validarPavimento(b, v, p.pavimento);
    return e.length ? e : validarGeometria(b, { ...geometriaAtingida(b, v, p.pavimento), nivelIni: p.nivelIni ?? v.nivelIni, nivelFim: p.nivelFim ?? v.nivelFim }, 'DIAGONAL');
  },
  aplicar(d, p) {
    const v = alvoDaEdicao(d, d.diagonais!.find((x) => x.id === p.id)!, p.pavimento);
    if (p.nome !== undefined) v.nome = p.nome;
    if (p.secao) v.secao = { ...p.secao };
    if (p.multipla !== undefined && p.pavimento === undefined) { if (p.multipla) v.multipla = true; else { delete v.multipla; delete v.excluidas; } }
    for (const k of ['ligIni', 'ligFim'] as const) if (p[k] !== undefined) { if (p[k] === 'articulada') v[k] = 'articulada'; else delete v[k]; }
    for (const k of ['nivelIni', 'nivelFim'] as const) if (p[k] !== undefined) { if (p[k]) v[k] = p[k]; else delete v[k]; }
    if (p.flambagem) { if (Object.keys(p.flambagem).length) v.flambagem = { ...p.flambagem }; else delete v.flambagem; }
    if (p.cobrimento !== undefined) { if (p.cobrimento) v.cobrimento = p.cobrimento; else delete v.cobrimento; }
    return `Diagonal ${v.nome} editada${p.pavimento !== undefined ? ` (grupo de ${pavNome(d as BuildingModel, p.pavimento)})` : ''}.`;
  },
});

function novosPontos(v: Pick<Diagonal, 'pIni' | 'pFim'>, p: { ponta: 'ini' | 'fim' | 'ambas'; dx: number; dy: number }): { pIni: P; pFim: P } {
  const m = (q: [number, number]): P => [+(q[0] + p.dx).toFixed(6), +(q[1] + p.dy).toFixed(6)];
  return { pIni: p.ponta === 'fim' ? [...v.pIni] as P : m(v.pIni), pFim: p.ponta === 'ini' ? [...v.pFim] as P : m(v.pFim) };
}

registrar<{ id: string; pavimento?: string; ponta: 'ini' | 'fim' | 'ambas'; dx: number; dy: number }>({
  nome: 'diagonal.mover',
  descricao: 'Move o extremo inicial, o final ou os dois de uma diagonal (dx, dy em m, em planta). Os extremos continuam a tocar um pilar ou uma viga. Com `pavimento` (o grupo atual) e a diagonal múltipla, vale só para a barra desse grupo, que vira uma diagonal própria.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'ponta', 'dx', 'dy'], properties: {
    id: { type: 'string' }, pavimento: pavSchema, ponta: { type: 'string', enum: ['ini', 'fim', 'ambas'] }, dx: { type: 'number' }, dy: { type: 'number' },
  } },
  validar(b, p) {
    const v = achar(b, p.id);
    if (!v) return err('DIAGONAL_INEXISTENTE', `Diagonal ${p.id} não existe.`);
    const e = validarPavimento(b, v, p.pavimento);
    return e.length ? e : validarGeometria(b, { ...geometriaAtingida(b, v, p.pavimento), ...novosPontos(v, p) }, 'DIAGONAL');
  },
  aplicar(d, p) {
    const v = alvoDaEdicao(d, d.diagonais!.find((x) => x.id === p.id)!, p.pavimento);
    Object.assign(v, novosPontos(v, p));
    return `Diagonal ${v.nome}: ${p.ponta === 'ambas' ? 'extremos movidos' : `extremo ${p.ponta === 'ini' ? 'inicial' : 'final'} movido`} (${fmt(p.dx)}; ${fmt(p.dy)}) m${p.pavimento !== undefined ? ` (grupo de ${pavNome(d as BuildingModel, p.pavimento)})` : ''}.`;
  },
});

registrar<{ id: string; de: string; pavimento?: string; campos?: Campo[] }>({
  nome: 'diagonal.atribuir',
  descricao: 'Copia para a diagonal `id` os dados de outra diagonal `de`: seção, ligações das pontas, coeficientes de flambagem e cobrimento (todos, ou só os de `campos`). A geometria não muda. Com `pavimento` (o grupo atual) e a diagonal múltipla, vale só para a barra desse grupo, que vira uma diagonal própria.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'de'], properties: {
    id: { type: 'string' }, de: { type: 'string', description: 'id da diagonal de que se copiam os dados' }, pavimento: pavSchema,
    campos: { type: 'array', items: { type: 'string', enum: [...CAMPOS] }, minItems: 1 },
  } },
  validar(b, p) {
    const v = achar(b, p.id);
    if (!v) return err('DIAGONAL_INEXISTENTE', `Diagonal ${p.id} não existe.`);
    if (!achar(b, p.de)) return err('DIAGONAL_INEXISTENTE', `Diagonal ${p.de} não existe.`);
    return validarPavimento(b, v, p.pavimento);
  },
  aplicar(d, p) {
    const o = d.diagonais!.find((x) => x.id === p.de)!, campos = p.campos ?? CAMPOS;
    const v = alvoDaEdicao(d, d.diagonais!.find((x) => x.id === p.id)!, p.pavimento);
    if (campos.includes('secao')) v.secao = { ...o.secao };
    if (campos.includes('ligacoes')) { for (const k of ['ligIni', 'ligFim'] as const) { if (o[k]) v[k] = o[k]; else delete v[k]; } }
    if (campos.includes('flambagem')) { if (o.flambagem) v.flambagem = { ...o.flambagem }; else delete v.flambagem; }
    if (campos.includes('cobrimento')) { if (o.cobrimento) v.cobrimento = o.cobrimento; else delete v.cobrimento; }
    return `Diagonal ${v.nome}: dados de ${o.nome} atribuídos (${campos.join(', ')})${p.pavimento !== undefined ? ` no grupo de ${pavNome(d as BuildingModel, p.pavimento)}` : ''}.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'diagonal.remover',
  descricao: 'Remove diagonais; a múltipla é apagada em todos os grupos de uma vez.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const falta = p.ids.find((id) => !achar(b, id));
    return falta ? err('DIAGONAL_INEXISTENTE', `Diagonal ${falta} não existe.`) : [];
  },
  aplicar(d, p) {
    const nomes = d.diagonais!.filter((v) => p.ids.includes(v.id)).map((v) => v.nome);
    d.diagonais = d.diagonais!.filter((v) => !p.ids.includes(v.id));
    if (!d.diagonais.length) delete d.diagonais;
    return `Removida${nomes.length > 1 ? 's' : ''}: ${nomes.join(', ')}.`;
  },
});
