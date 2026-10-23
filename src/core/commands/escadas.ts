// Comandos das escadas (frente E4a): escada (dados comuns), lances e tipos de lance. Lançamento na planta, mover, girar e
// copiar ficam para a E4b. Tipos predefinidos (`pre:...`) são copiados para a obra ao serem usados num lance.
import type { Draft } from 'immer';
import { errosTipoLance, nomeSequencial, tipoLanceBloqueado, tipoLancePor, tiposLanceEmUso, TIPOLOGIAS, type ApoioPatamar, type Escada, type LanceEscada, type TipoLance } from '../building/escadas';
import { opcoesEmUso, perfilDe } from '../building/opcoes';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

export const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
export const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
export const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
export const num: JsonSchema = { type: 'number' };
export const pos: JsonSchema = { type: 'number', exclusiveMinimum: 0 };
const blocoSchema: JsonSchema = { type: 'string', enum: ['ceramico', 'concreto'] };

const apoioSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['apoiado'], properties: {
  apoiado: { type: 'boolean' },
  apoios: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['borda', 'tipo', 'largura'], properties: {
    borda: { type: 'string', enum: ['frontal', 'lateral'] }, tipo: { type: 'string', enum: ['tirante', 'alvenaria', 'concreto', 'conector'] }, largura: pos, bloco: blocoSchema, gama: pos } } },
} };
export const lanceCampos: Record<string, JsonSchema> = {
  tipo: { type: 'string', minLength: 1, description: 'id do tipo de lance (da obra ou predefinido `pre:...`)' },
  pavimento: { type: 'string', description: 'pavimento de partida; ausente = o seguinte ao do lance anterior' },
  cotaInicial: { type: 'number', description: 'cota do piso de partida (m); ausente = cota do pavimento' },
  repetir: { type: 'integer', minimum: 1, description: 'lances iguais em pavimentos seguidos' },
  patamares: { type: 'array', items: apoioSchema },
};

/** Garante o tipo de lance na obra: predefinido vira cópia (reaproveitando a já existente); devolve o id na obra. */
export function tipoNaObra(d: Draft<BuildingModel>, id: string): string {
  if (!id.startsWith('pre:')) return id;
  d.tiposLance ??= [];
  const ja = d.tiposLance.find((t) => t.predefinido === id);
  if (ja) return ja.id;
  const pre = tipoLancePor(d as BuildingModel, id)!;
  const novo: TipoLance = { ...copia(pre), id: novoId(d, 'tl'), predefinido: id };
  d.tiposLance.push(novo);
  return novo.id;
}

// ---------------------------------------------------------------- escada.criar / escada.dados

export interface DadosComuns {
  nome?: string; largura?: number; piso?: number; espelho?: number; giro?: 'esq' | 'dir'; ultimoDegrau?: 'patamar' | 'laje'; execucao?: 'concretados' | 'alvenaria';
  bloco?: 'ceramico' | 'concreto'; corrimao?: number; revestimento?: number; sobrecarga?: number; acesso?: 'privado' | 'publico';
}
export const dadosSchema: Record<string, JsonSchema> = {
  nome: { type: 'string', minLength: 1 }, largura: pos, piso: pos, espelho: pos,
  giro: { type: 'string', enum: ['esq', 'dir'] }, ultimoDegrau: { type: 'string', enum: ['patamar', 'laje'] }, execucao: { type: 'string', enum: ['concretados', 'alvenaria'] },
  bloco: blocoSchema, corrimao: { type: 'number', minimum: 0 }, revestimento: { type: 'number', minimum: 0 }, sobrecarga: { type: 'number', minimum: 0 }, acesso: { type: 'string', enum: ['privado', 'publico'] },
};
/** Grava os dados comuns só quando diferem do padrão. */
export function gravarDados(e: Draft<Escada>, p: DadosComuns) {
  if (p.nome !== undefined) e.nome = p.nome;
  if (p.largura !== undefined) e.largura = p.largura;
  if (p.piso !== undefined) e.piso = p.piso;
  if (p.espelho !== undefined) e.espelho = p.espelho;
  if (p.giro !== undefined) { if (p.giro === 'dir') e.giro = 'dir'; else delete e.giro; }
  if (p.ultimoDegrau !== undefined) { if (p.ultimoDegrau === 'laje') e.ultimoDegrau = 'laje'; else delete e.ultimoDegrau; }
  if (p.execucao !== undefined) { if (p.execucao === 'alvenaria') e.execucao = 'alvenaria'; else delete e.execucao; }
  if (p.bloco !== undefined) { if (p.bloco === 'concreto') e.bloco = 'concreto'; else delete e.bloco; }
  if (p.corrimao !== undefined) { if (p.corrimao > 0) e.corrimao = p.corrimao; else delete e.corrimao; }
  if (p.revestimento !== undefined) e.revestimento = p.revestimento;
  if (p.sobrecarga !== undefined) e.sobrecarga = p.sobrecarga;
  if (p.acesso !== undefined) { if (p.acesso === 'publico') e.acesso = 'publico'; else delete e.acesso; }
}

interface ParamsCriar extends DadosComuns { id?: string; grupo: string; origem: [number, number]; angulo?: number; lances?: (Omit<LanceEscada, 'id'>)[] }
export function validarLances(b: BuildingModel, lances: Omit<LanceEscada, 'id'>[]): Diagnostico[] {
  for (const l of lances) {
    if (!tipoLancePor(b, l.tipo)) return err('TIPO_LANCE_INEXISTENTE', `Tipo de lance "${l.tipo}" não existe.`);
    if (l.pavimento && !b.pavimentos.some((p) => p.id === l.pavimento)) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${l.pavimento} não existe.`);
  }
  return [];
}

registrar<ParamsCriar>({
  nome: 'escada.criar',
  descricao: 'Cria uma escada (E4a) no grupo: `origem` (centro da borda de partida) e `angulo` (sentido de subida, graus), dados comuns (`largura`, `piso`, `espelho` em m; `giro` esq|dir; `ultimoDegrau` patamar|laje; `execucao` concretados|alvenaria; `bloco`; `corrimao` kN/m; `revestimento` e `sobrecarga` kN/m²; `acesso` privado|publico) e `lances` [{ tipo, pavimento?, cotaInicial?, repetir?, patamares? }]. Padrões: largura 1,20, piso 0,28, espelho 0,175, giro à esquerda.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'origem'], properties: {
    id: { type: 'string' }, grupo: { type: 'string' }, origem: { type: 'array', items: num, minItems: 2, maxItems: 2 }, angulo: num, ...dadosSchema,
    lances: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['tipo'], properties: lanceCampos } },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    if (p.id && b.escadas?.some((e) => e.id === p.id)) return err('ESCADA_EXISTENTE', `Já existe a escada ${p.id}.`);
    return validarLances(b, p.lances ?? []);
  },
  aplicar(d, p) {
    d.escadas ??= [];
    const id = p.id ?? novoId(d, 'es');
    const e: Escada = { id, nome: nomeSequencial(d as BuildingModel), grupo: p.grupo, origem: [p.origem[0], p.origem[1]], angulo: p.angulo ?? 0, largura: 1.2, piso: 0.28, espelho: 0.175, lances: [] };
    gravarDados(e as Draft<Escada>, p);
    for (const l of p.lances ?? []) e.lances.push({ ...copia(l), id: novoId(d, 'ln'), tipo: tipoNaObra(d, l.tipo) });
    d.escadas.push(e);
    return `Escada ${e.nome} criada.`;
  },
});

interface ParamsDados extends DadosComuns { id: string; limpar?: ('revestimento' | 'sobrecarga')[] }
registrar<ParamsDados>({
  nome: 'escada.dados',
  descricao: 'Altera os dados comuns da escada (E4a): `nome`, `largura`, `piso`, `espelho`, `giro`, `ultimoDegrau`, `execucao`, `bloco`, `corrimao`, `revestimento`, `sobrecarga`, `acesso`; `limpar` volta revestimento/sobrecarga ao padrão das opções.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, ...dadosSchema, limpar: { type: 'array', items: { type: 'string', enum: ['revestimento', 'sobrecarga'] } } } },
  validar(b, p) {
    if (!b.escadas?.some((e) => e.id === p.id)) return err('ESCADA_INEXISTENTE', `Escada ${p.id} não existe.`);
    const { id: _id, limpar, ...resto } = p;
    return Object.keys(resto).length || limpar?.length ? [] : err('SEM_EDICAO', 'Informe ao menos um campo a alterar.');
  },
  aplicar(d, p) {
    const e = d.escadas!.find((x) => x.id === p.id)!;
    gravarDados(e, p);
    for (const c of p.limpar ?? []) delete e[c];
    return `Escada ${e.nome} alterada.`;
  },
});

// ---------------------------------------------------------------- lance.*

interface ParamsLanceCriar extends Omit<LanceEscada, 'id'> { escada: string; posicao?: number }
registrar<ParamsLanceCriar>({
  nome: 'lance.criar',
  descricao: 'Acrescenta um lance à escada (E4a): `tipo`, `pavimento`, `cotaInicial`, `repetir` (lances iguais em pavimentos seguidos) e `patamares` [{ apoiado, apoios[] { borda frontal|lateral, tipo tirante|alvenaria|concreto|conector, largura, bloco?, gama? } }]; `posicao` insere na lista (padrão no fim). Número de lances ilimitado.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['escada', 'tipo'], properties: { escada: { type: 'string' }, posicao: { type: 'integer', minimum: 0 }, ...lanceCampos } },
  validar(b, p) {
    if (!b.escadas?.some((e) => e.id === p.escada)) return err('ESCADA_INEXISTENTE', `Escada ${p.escada} não existe.`);
    return validarLances(b, [p]);
  },
  aplicar(d, p) {
    const e = d.escadas!.find((x) => x.id === p.escada)!;
    const { escada: _e, posicao, ...resto } = p;
    const l: LanceEscada = { ...copia(resto), id: novoId(d, 'ln'), tipo: tipoNaObra(d, p.tipo) };
    if (l.repetir === 1) delete l.repetir;
    e.lances.splice(posicao === undefined ? e.lances.length : Math.min(posicao, e.lances.length), 0, l);
    return `Lance ${e.lances.indexOf(l as never) + 1} acrescentado à escada ${e.nome}.`;
  },
});

interface ParamsLanceEditar { escada: string; lance: string; tipo?: string; pavimento?: string | null; cotaInicial?: number | null; repetir?: number; patamares?: ApoioPatamar[] }
registrar<ParamsLanceEditar>({
  nome: 'lance.editar',
  descricao: 'Altera um lance da escada (E4a): `tipo`, `pavimento`, `cotaInicial` e `repetir` (null volta ao padrão em pavimento e cotaInicial) e `patamares`.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['escada', 'lance'], properties: {
    escada: { type: 'string' }, lance: { type: 'string' }, tipo: lanceCampos.tipo, pavimento: { type: 'string' }, cotaInicial: num, repetir: lanceCampos.repetir, patamares: lanceCampos.patamares,
    padrao: { type: 'array', items: { type: 'string', enum: ['pavimento', 'cotaInicial'] }, description: 'campos a voltar ao padrão' },
  } },
  validar(b, p) {
    const e = b.escadas?.find((x) => x.id === p.escada);
    if (!e) return err('ESCADA_INEXISTENTE', `Escada ${p.escada} não existe.`);
    if (!e.lances.some((l) => l.id === p.lance)) return err('LANCE_INEXISTENTE', `Lance ${p.lance} não existe na escada ${e.nome}.`);
    if (p.tipo !== undefined || p.pavimento) return validarLances(b, [{ tipo: p.tipo ?? e.lances.find((l) => l.id === p.lance)!.tipo, pavimento: p.pavimento ?? undefined }]);
    return [];
  },
  aplicar(d, p) {
    const e = d.escadas!.find((x) => x.id === p.escada)!, l = e.lances.find((x) => x.id === p.lance)!;
    if (p.tipo !== undefined) l.tipo = tipoNaObra(d, p.tipo);
    if (typeof p.pavimento === 'string') l.pavimento = p.pavimento;
    if (typeof p.cotaInicial === 'number') l.cotaInicial = p.cotaInicial;
    for (const c of (p as unknown as { padrao?: ('pavimento' | 'cotaInicial')[] }).padrao ?? []) delete l[c];
    if (p.repetir !== undefined) { if (p.repetir > 1) l.repetir = p.repetir; else delete l.repetir; }
    if (p.patamares !== undefined) { if (p.patamares.length) l.patamares = copia(p.patamares); else delete l.patamares; }
    return `Lance alterado na escada ${e.nome}.`;
  },
});

registrar<{ escada: string; lance: string }>({
  nome: 'lance.remover',
  descricao: 'Remove um lance da escada (E4a).',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['escada', 'lance'], properties: { escada: { type: 'string' }, lance: { type: 'string' } } },
  validar(b, p) {
    const e = b.escadas?.find((x) => x.id === p.escada);
    if (!e) return err('ESCADA_INEXISTENTE', `Escada ${p.escada} não existe.`);
    return e.lances.some((l) => l.id === p.lance) ? [] : err('LANCE_INEXISTENTE', `Lance ${p.lance} não existe na escada ${e.nome}.`);
  },
  aplicar(d, p) {
    const e = d.escadas!.find((x) => x.id === p.escada)!;
    e.lances = e.lances.filter((l) => l.id !== p.lance);
    return `Lance removido da escada ${e.nome}.`;
  },
});

// ---------------------------------------------------------------- tipoLance.*

export type CamposTipo = Omit<TipoLance, 'id' | 'predefinido' | 'desbloqueado'>;
export const tipoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['nome', 'tipologia', 'trechos'], properties: {
  nome: { type: 'string', minLength: 1 }, tipologia: { type: 'string', enum: TIPOLOGIAS.map((t) => t.v) }, trechos: { type: 'array', items: { type: 'integer', minimum: 1 }, minItems: 1 },
  espessura: { type: 'number', description: 'm; ausente = vão / 30' }, desnivelInicial: { type: 'number', minimum: 0 }, degrausIniciais: { type: 'integer', minimum: 0 },
  poco: { type: 'number', minimum: 0 }, degrausPatamar: { type: 'integer', minimum: 0 },
} };
export const limpo = (t: CamposTipo): CamposTipo => {
  const o = { ...copia(t) };
  for (const k of ['espessura', 'desnivelInicial', 'degrausIniciais', 'poco', 'degrausPatamar'] as const) if (!o[k]) delete o[k];
  return o;
};
export const errosDoTipo = (b: BuildingModel, t: CamposTipo) => {
  const e = errosTipoLance({ ...t, id: 'x' }, opcoesEmUso(b.opcoes, perfilDe(b)));
  return e.length ? err('TIPO_LANCE_INVALIDO', `Tipo de lance "${t.nome}": ${e.join('; ')}.`) : [];
};

registrar<{ id?: string; tipo: CamposTipo }>({
  nome: 'tipoLance.criar',
  descricao: 'Cria um tipo de lance na obra (E4a): `nome` (referência), `tipologia` (reto, meiaVolta2, quartoVolta3, voltaInteira2, consecutivos2, meiaVoltaN, quartoVoltaN), `trechos` (degraus de cada trecho inclinado), `espessura` (m; ausente = vão/30), `desnivelInicial` (0 ou ≥ 10 cm), `degrausIniciais` (sobre o piso), `poco` (m, só meia-volta) e `degrausPatamar`.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['tipo'], properties: { id: { type: 'string' }, tipo: tipoSchema } },
  validar(b, p) {
    if (p.id && (p.id.startsWith('pre:') || tipoLancePor(b, p.id))) return err('TIPO_LANCE_EXISTENTE', `O id ${p.id} já existe ou é reservado.`);
    return errosDoTipo(b, p.tipo);
  },
  aplicar(d, p) {
    d.tiposLance ??= [];
    d.tiposLance.push({ ...limpo(p.tipo), id: p.id ?? novoId(d, 'tl') });
    return `Tipo de lance "${p.tipo.nome}" criado.`;
  },
});

registrar<{ id: string; tipo: Partial<CamposTipo> }>({
  nome: 'tipoLance.editar',
  descricao: 'Altera campos de um tipo de lance da obra (E4a). Tipo em uso por lance fica bloqueado até o desbloqueio manual (E4b).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'tipo'], properties: { id: { type: 'string' }, tipo: { ...tipoSchema, required: [] } } },
  validar(b, p) {
    const t = b.tiposLance?.find((x) => x.id === p.id);
    if (!t) return err('TIPO_LANCE_INEXISTENTE', `Tipo de lance ${p.id} não existe na obra.`);
    if (tipoLanceBloqueado(b, p.id)) return err('TIPO_LANCE_BLOQUEADO', `O tipo de lance "${t.nome}" está em uso por lances de escada e bloqueado para edição; desbloqueie-o (tipoLance.desbloquear) ou copie-o com nova referência.`);
    return errosDoTipo(b, { ...t, ...p.tipo });
  },
  aplicar(d, p) {
    const t = d.tiposLance!.find((x) => x.id === p.id)!;
    const novo = limpo({ ...copia(t), ...p.tipo } as CamposTipo);
    for (const k of Object.keys(t)) if (k !== 'id' && k !== 'predefinido') delete (t as unknown as Record<string, unknown>)[k];
    Object.assign(t, novo);
    return `Tipo de lance "${t.nome}" alterado.`;
  },
});

registrar<{ de: string; nome?: string }>({
  nome: 'tipoLance.copiar',
  descricao: 'Copia um tipo de lance (da obra ou predefinido) com nova referência (E4a).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['de'], properties: { de: { type: 'string' }, nome: { type: 'string', minLength: 1 } } },
  validar: (b, p) => (tipoLancePor(b, p.de) ? [] : err('TIPO_LANCE_INEXISTENTE', `Tipo de lance ${p.de} não existe.`)),
  aplicar(d, p) {
    const o = copia(tipoLancePor(d as BuildingModel, p.de)!);
    delete o.predefinido;
    delete o.desbloqueado;
    d.tiposLance ??= [];
    const novo: TipoLance = { ...o, id: novoId(d, 'tl'), nome: p.nome?.trim() || `${o.nome} (cópia)` };
    d.tiposLance.push(novo);
    return `Tipo de lance "${novo.nome}" copiado.`;
  },
});

registrar<{ id: string }>({
  nome: 'tipoLance.remover',
  descricao: 'Remove um tipo de lance da obra (E4a); não pode estar em uso por um lance.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar(b, p) {
    if (!b.tiposLance?.some((t) => t.id === p.id)) return err('TIPO_LANCE_INEXISTENTE', `Tipo de lance ${p.id} não existe na obra.`);
    return tiposLanceEmUso(b).has(p.id) ? err('TIPO_LANCE_EM_USO', 'O tipo de lance está em uso por um lance de escada; troque o tipo do lance antes.') : [];
  },
  aplicar(d, p) {
    const i = d.tiposLance!.findIndex((t) => t.id === p.id), nome = d.tiposLance![i].nome;
    d.tiposLance!.splice(i, 1);
    if (!d.tiposLance!.length) delete d.tiposLance;
    return `Tipo de lance "${nome}" removido.`;
  },
});
