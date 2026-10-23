// Comandos das vigas inclinadas entre pavimentos (E2c): criar, editar, mover as pontas, remover, armadura bloqueada e
// redimensionar (solta a armadura bloqueada: o dimensionamento refaz com os esforços do último cálculo).
import type { Draft } from 'immer';
import { barrasDaInclinada, DESNIVEL_MIN, ligacaoDaPonta } from '../building/inclinadas';
import { casosDaObra, type BuildingModel, type CargaInclinada, type LigacaoBarra, type VigaInclinada } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { nivelEdicao } from './tabelas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

type P = [number, number];
export const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>) => `vi_${(++d.seq).toString(36)}`;
export const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
export const secaoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['b', 'h'], properties: { b: { type: 'number', exclusiveMinimum: 0, maximum: 3, description: 'largura (m)' }, h: { type: 'number', exclusiveMinimum: 0, maximum: 3, description: 'altura (m)' } } };
export const ligSchema: JsonSchema = { type: 'string', enum: ['engastada', 'articulada'], description: 'ligação da ponta ao pilar ou à viga (padrão engastada)' };
export const nivelSchema: JsonSchema = { type: 'number', minimum: -10, maximum: 10, description: 'desnível da ponta em relação à cota do pavimento (m)' };
export const flambSchema: JsonSchema = { type: 'object', additionalProperties: false, properties: {
  vertical: { type: 'number', exclusiveMinimum: 0, maximum: 3, description: 'coeficiente de flambagem no plano vertical (ℓe = k·ℓ entre os nós)' },
  transversal: { type: 'number', exclusiveMinimum: 0, maximum: 3, description: 'coeficiente de flambagem no plano transversal' },
} };
const cargaSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['caso', 'tipo', 'valor'], properties: {
  caso: { type: 'string', description: 'caso de carga (G, Q ou caso adicional)' },
  tipo: { type: 'string', enum: ['concentrada', 'linear', 'faixa', 'triangular'] },
  valor: { type: 'number', description: 'kN (concentrada) ou kN/m por metro de barra; na triangular, o valor em `de`' },
  valorFim: { type: 'number', description: 'triangular: kN/m em `ate` (padrão 0)' },
  de: { type: 'number', minimum: 0, description: 'posição (m) a partir da ponta inicial, ao longo da parte flexível' },
  ate: { type: 'number', minimum: 0, description: 'faixa e triangular: fim (m)' },
} };
const barras = (): JsonSchema => ({ type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 2, maximum: 40 }, phi: { type: 'number', enum: [8, 10, 12.5, 16, 20, 25, 32] } } });
export const fmt = (v: number, c = 2) => String(+v.toFixed(c)).replace('.', ',');

type Cargas = { caso: string; tipo: CargaInclinada['tipo']; valor: number; valorFim?: number; de?: number; ate?: number }[];
export const pavNome = (b: BuildingModel, id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;

/** Erros de geometria e de ligação da barra lançada. */
export function validarGeometria(b: BuildingModel, g: Pick<VigaInclinada, 'pavIni' | 'pavFim' | 'pIni' | 'pFim' | 'nivelIni' | 'nivelFim' | 'multipla'> & { id: string; nome: string }, pre: 'INCLINADA' | 'DIAGONAL' = 'INCLINADA'): Diagnostico[] {
  const pi = b.pavimentos.find((p) => p.id === g.pavIni), pf = b.pavimentos.find((p) => p.id === g.pavFim);
  if (!pi) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${g.pavIni} não existe.`);
  if (!pf) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${g.pavFim} não existe.`);
  const dh = Math.hypot(g.pFim[0] - g.pIni[0], g.pFim[1] - g.pIni[1]), dz = Math.abs(pf.cota + (g.nivelFim ?? 0) - (pi.cota + (g.nivelIni ?? 0)));
  if (dz < DESNIVEL_MIN) return err(`${pre}_NIVEL`, `As pontas estão na mesma cota (desnível ${fmt(dz * 100, 0)} cm): lance uma viga comum.`, [g.id]);
  if (dh < 0.05) return err(`${pre}_VERTICAL`, 'As pontas estão uma sobre a outra: lance um pilar.', [g.id]);
  const out: Diagnostico[] = [];
  for (const [pav, p, nome] of [[g.pavIni, g.pIni, 'inicial'], [g.pavFim, g.pFim, 'final']] as const) {
    if (!ligacaoDaPonta(b, pav, p)) out.push({ codigo: `${pre}_SEM_APOIO`, severidade: 'erro', elementos: [g.id], mensagem: `A ponta ${nome} não toca pilar nem viga do pavimento ${pavNome(b, pav)}: leve-a a um pilar ou ao eixo de uma viga.` });
  }
  return out;
}

function validarCargas(b: BuildingModel, cargas: Cargas | undefined): Diagnostico[] {
  const casos = new Set(casosDaObra(b).map((c) => c.id));
  for (const c of cargas ?? []) {
    if (!casos.has(c.caso)) return err('CASO_INEXISTENTE', `Caso de carga ${c.caso} não existe.`);
    if (c.ate !== undefined && c.de !== undefined && c.ate < c.de) return err('CARGA_INVALIDA', 'O fim da carga em faixa vem antes do início.');
  }
  return [];
}

const comIds = (cargas: Cargas, ate: number): CargaInclinada[] => cargas.map((c, k) => ({ id: `c${ate + k + 1}`, ...c }));
export const limpar = <T extends object>(o: T): T => { for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k]; return o; };
/** A armadura bloqueada sai quando a geometria ou a seção muda (o recálculo gera outra). */
function soltarArmadura(v: { armadura?: unknown }): string {
  const tinha = !!v.armadura;
  delete v.armadura;
  return tinha ? ' A armadura bloqueada saiu: a geometria mudou e o recálculo gera uma nova.' : '';
}

interface ParamsCriar { pavIni: string; pavFim: string; pIni: P; pFim: P; secao: { b: number; h: number }; nome?: string; nivelIni?: number; nivelFim?: number; multipla?: boolean; ligIni?: LigacaoBarra; ligFim?: LigacaoBarra; cargas?: Cargas; flambagem?: { vertical?: number; transversal?: number } }

registrar<ParamsCriar>({
  nome: 'inclinada.criar',
  descricao: 'Lança uma viga inclinada de concreto entre o ponto `pIni` no pavimento `pavIni` e `pFim` em `pavFim` (cotas dos pavimentos, mais o desnível opcional de cada ponta), ligada ao pilar ou à viga que a ponta toca. Barra de 2 nós e 6 gdl, fora do diafragma. `multipla`: repete a barra em cada par de pavimentos de mesma posição dos grupos inicial e final. Ligações `engastada` (padrão) ou `articulada`; cargas próprias (concentrada, linear, faixa, triangular) por caso; coeficientes de flambagem por plano.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['pavIni', 'pavFim', 'pIni', 'pFim', 'secao'], properties: {
    pavIni: { type: 'string', description: 'id do pavimento da ponta inicial' }, pavFim: { type: 'string', description: 'id do pavimento da ponta final' },
    pIni: ponto, pFim: ponto, secao: secaoSchema, nome: { type: 'string', minLength: 1 }, nivelIni: nivelSchema, nivelFim: nivelSchema, multipla: { type: 'boolean' },
    ligIni: ligSchema, ligFim: ligSchema, cargas: { type: 'array', items: cargaSchema }, flambagem: flambSchema,
  } },
  validar(b, p) {
    const e = validarGeometria(b, { ...p, id: '', nome: p.nome ?? 'VI' });
    return e.length ? e : validarCargas(b, p.cargas);
  },
  aplicar(d, p) {
    const lista = (d.vigasInclinadas ??= []);
    const n = Math.max(0, ...lista.map((v) => { const m = /^VI(\d+)$/.exec(v.nome); return m ? +m[1] : 0; })) + 1;
    const v: VigaInclinada = limpar({
      id: novoId(d), nome: p.nome ?? `VI${n}`, pavIni: p.pavIni, pavFim: p.pavFim, pIni: [...p.pIni] as P, pFim: [...p.pFim] as P, nivelIni: p.nivelIni || undefined, nivelFim: p.nivelFim || undefined,
      secao: { ...p.secao }, multipla: p.multipla || undefined, ligIni: p.ligIni === 'articulada' ? 'articulada' : undefined, ligFim: p.ligFim === 'articulada' ? 'articulada' : undefined,
      cargas: p.cargas?.length ? comIds(p.cargas, 0) : undefined, flambagem: p.flambagem && Object.keys(p.flambagem).length ? { ...p.flambagem } : undefined,
    });
    lista.push(v);
    const bs = barrasDaInclinada(d as BuildingModel, v);
    return `Viga inclinada ${v.nome}: ${pavNome(d as BuildingModel, v.pavIni)} → ${pavNome(d as BuildingModel, v.pavFim)}, ${fmt(v.secao.b * 100, 0)}×${fmt(v.secao.h * 100, 0)} cm, ${fmt(bs.find((x) => x.lancada)?.L ?? 0)} m${bs.length > 1 ? `, múltipla (${bs.length} barras)` : ''}.`;
  },
});

type ParamsEditar = { id: string; nome?: string; secao?: { b: number; h: number }; multipla?: boolean; ligIni?: LigacaoBarra; ligFim?: LigacaoBarra; nivelIni?: number; nivelFim?: number; cargas?: Cargas; flambagem?: { vertical?: number; transversal?: number }; cobrimento?: number };

registrar<ParamsEditar>({
  nome: 'inclinada.editar',
  descricao: 'Altera nome, seção, múltipla, ligações das pontas, desnível das pontas, cargas próprias (a lista inteira), coeficientes de flambagem por plano e cobrimento (cm; 0 volta ao das vigas) de uma viga inclinada. Mudar a seção ou o desnível solta a armadura bloqueada.',
  risco: 'escrita',
  calculo: (p) => nivelEdicao(p, ['nome', 'cobrimento', 'flambagem']),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, secao: secaoSchema, multipla: { type: 'boolean' }, ligIni: ligSchema, ligFim: ligSchema, nivelIni: nivelSchema, nivelFim: nivelSchema,
    cargas: { type: 'array', items: cargaSchema }, flambagem: flambSchema, cobrimento: { type: 'number', minimum: 0, maximum: 10 },
  } },
  validar(b, p) {
    const v = b.vigasInclinadas?.find((x) => x.id === p.id);
    if (!v) return err('INCLINADA_INEXISTENTE', `Viga inclinada ${p.id} não existe.`);
    const e = validarGeometria(b, { ...v, nivelIni: p.nivelIni ?? v.nivelIni, nivelFim: p.nivelFim ?? v.nivelFim });
    return e.length ? e : validarCargas(b, p.cargas);
  },
  aplicar(d, p) {
    const v = d.vigasInclinadas!.find((x) => x.id === p.id)!;
    let aviso = '';
    if (p.nome !== undefined) v.nome = p.nome;
    if (p.secao) { v.secao = { ...p.secao }; aviso = soltarArmadura(v); }
    if (p.multipla !== undefined) { if (p.multipla) v.multipla = true; else delete v.multipla; }
    for (const k of ['ligIni', 'ligFim'] as const) if (p[k] !== undefined) { if (p[k] === 'articulada') v[k] = 'articulada'; else delete v[k]; }
    for (const k of ['nivelIni', 'nivelFim'] as const) if (p[k] !== undefined) { if (p[k]) v[k] = p[k]; else delete v[k]; aviso = soltarArmadura(v) || aviso; }
    if (p.cargas) { if (p.cargas.length) v.cargas = comIds(p.cargas, 0); else delete v.cargas; }
    if (p.flambagem) { if (Object.keys(p.flambagem).length) v.flambagem = { ...p.flambagem }; else delete v.flambagem; }
    if (p.cobrimento !== undefined) { if (p.cobrimento) v.cobrimento = p.cobrimento; else delete v.cobrimento; }
    return `Viga inclinada ${v.nome} editada.${aviso}`;
  },
});

registrar<{ id: string; ponta: 'ini' | 'fim' | 'ambas'; dx: number; dy: number }>({
  nome: 'inclinada.mover',
  descricao: 'Move a ponta inicial, a final ou as duas de uma viga inclinada (dx, dy em m, em planta). As pontas continuam a tocar um pilar ou uma viga. Solta a armadura bloqueada.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'ponta', 'dx', 'dy'], properties: {
    id: { type: 'string' }, ponta: { type: 'string', enum: ['ini', 'fim', 'ambas'] }, dx: { type: 'number' }, dy: { type: 'number' },
  } },
  validar(b, p) {
    const v = b.vigasInclinadas?.find((x) => x.id === p.id);
    if (!v) return err('INCLINADA_INEXISTENTE', `Viga inclinada ${p.id} não existe.`);
    return validarGeometria(b, { ...v, ...novosPontos(v, p) });
  },
  aplicar(d, p) {
    const v = d.vigasInclinadas!.find((x) => x.id === p.id)!;
    Object.assign(v, novosPontos(v, p));
    const aviso = soltarArmadura(v);
    return `Viga inclinada ${v.nome}: ${p.ponta === 'ambas' ? 'pontas movidas' : `ponta ${p.ponta === 'ini' ? 'inicial' : 'final'} movida`} (${fmt(p.dx)}; ${fmt(p.dy)}) m.${aviso}`;
  },
});

function novosPontos(v: Pick<VigaInclinada, 'pIni' | 'pFim'>, p: { ponta: 'ini' | 'fim' | 'ambas'; dx: number; dy: number }): { pIni: P; pFim: P } {
  const m = (q: [number, number]): P => [+(q[0] + p.dx).toFixed(6), +(q[1] + p.dy).toFixed(6)];
  return { pIni: p.ponta === 'fim' ? [...v.pIni] as P : m(v.pIni), pFim: p.ponta === 'ini' ? [...v.pFim] as P : m(v.pFim) };
}

registrar<{ ids: string[] }>({
  nome: 'inclinada.remover',
  descricao: 'Remove vigas inclinadas.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const falta = p.ids.find((id) => !b.vigasInclinadas?.some((v) => v.id === id));
    return falta ? err('INCLINADA_INEXISTENTE', `Viga inclinada ${falta} não existe.`) : [];
  },
  aplicar(d, p) {
    const nomes = d.vigasInclinadas!.filter((v) => p.ids.includes(v.id)).map((v) => v.nome);
    d.vigasInclinadas = d.vigasInclinadas!.filter((v) => !p.ids.includes(v.id));
    if (!d.vigasInclinadas.length) delete d.vigasInclinadas;
    return `Removida${nomes.length > 1 ? 's' : ''}: ${nomes.join(', ')}.`;
  },
});

registrar<{ id: string; sup: { n: number; phi: number }; inf: { n: number; phi: number }; laterais?: { n: number; phi: number }; estribo: { phi: number; s: number } }>({
  nome: 'inclinada.armadura',
  descricao: 'Edita e bloqueia a armadura de uma viga inclinada: barras superiores e inferiores { n (com os cantos), phi (mm) }, barras intermediárias em cada face lateral { n, phi } e estribo { phi (mm), s (m) }. O recálculo só verifica essa armadura (flexo-compressão oblíqua e cortante), sem redimensionar.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'sup', 'inf', 'estribo'], properties: {
    id: { type: 'string' }, sup: barras(), inf: barras(),
    laterais: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 20 }, phi: { type: 'number', enum: [8, 10, 12.5, 16, 20, 25, 32] } } },
    estribo: { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: [5, 6.3, 8, 10, 12.5] }, s: { type: 'number', minimum: 0.03, maximum: 0.5, description: 'espaçamento (m)' } } },
  } },
  validar(b, p) { return b.vigasInclinadas?.some((x) => x.id === p.id) ? [] : err('INCLINADA_INEXISTENTE', `Viga inclinada ${p.id} não existe.`); },
  aplicar(d, p) {
    const v = d.vigasInclinadas!.find((x) => x.id === p.id)!;
    v.armadura = { sup: { ...p.sup }, inf: { ...p.inf }, ...(p.laterais ? { laterais: { ...p.laterais } } : {}), estribo: { ...p.estribo } };
    return `Armadura de ${v.nome} editada e bloqueada.`;
  },
});

registrar<{ ids?: string[] }>({
  nome: 'inclinada.redimensionar',
  descricao: 'Redimensiona as vigas inclinadas (todas, ou as de `ids`) com os esforços do último cálculo: solta a armadura bloqueada, e o dimensionamento escolhe outra.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    if (!b.vigasInclinadas?.length) return err('SEM_INCLINADAS', 'A obra não tem vigas inclinadas.');
    const falta = (p.ids ?? []).find((id) => !b.vigasInclinadas!.some((v) => v.id === id));
    return falta ? err('INCLINADA_INEXISTENTE', `Viga inclinada ${falta} não existe.`) : [];
  },
  aplicar(d, p) {
    let n = 0;
    for (const v of d.vigasInclinadas!) if ((!p.ids || p.ids.includes(v.id)) && v.armadura) { delete v.armadura; n++; }
    return n ? `${n} viga(s) inclinada(s) liberada(s) para redimensionar com os esforços do último cálculo.` : 'Nenhuma viga inclinada tinha armadura bloqueada: o dimensionamento já é automático.';
  },
});
