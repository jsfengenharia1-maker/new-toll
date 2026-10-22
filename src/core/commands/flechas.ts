// Flechas (frente N2f): etapas de carga do processo construtivo e limites de flecha por tipo de elemento.
// Os limites gerais continuam em `opcoes.definir` (limiteFlechaTotal, limiteFlechaSensorial, limiteFlechaAtiva…);
// `flechas.limites` dá a um tipo de elemento (vigas, maciças, treliçadas) um limite próprio, na forma ℓ/x, ℓ/x + cm ou cm.
import type { Draft } from 'immer';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { TIPOS_ELEMENTO_FLECHA, TIPOS_FLECHA, validarEtapas, type EtapaCarga, type LimiteFlecha, type TipoElementoFlecha, type TipoFlecha } from '../building/flechas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string): Diagnostico[] => [{ codigo, severidade: 'erro', elementos: [], mensagem }];
const ELEMENTOS = TIPOS_ELEMENTO_FLECHA.map((t) => t.v);
const TIPOS = TIPOS_FLECHA.map((t) => t.v);
const fracao: JsonSchema = { type: 'number', minimum: 0, maximum: 1 };
const etapaSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['nome', 'dias'], properties: {
  nome: { type: 'string', minLength: 1 }, dias: { type: 'number', exclusiveMinimum: 0, description: 'idade da aplicação (dias desde a concretagem)' },
  pp: fracao, alvenaria: fracao, revestimento: fracao, variavel: { ...fracao, description: 'fração da parcela quase permanente (ψ2·Q)' },
} };

function limpar(d: Draft<BuildingModel>) {
  const f = d.flechas;
  if (!f) return;
  if (f.etapas && !Object.keys(f.etapas).length) delete f.etapas;
  if (f.limites) for (const k of Object.keys(f.limites) as TipoElementoFlecha[]) if (!Object.keys(f.limites[k] ?? {}).length) delete f.limites[k];
  if (f.limites && !Object.keys(f.limites).length) delete f.limites;
  if (!Object.keys(f).length) delete d.flechas;
}

type EtapaP = Partial<EtapaCarga> & { nome: string; dias: number };
const completa = (e: EtapaP): EtapaCarga => ({ nome: e.nome, dias: e.dias, pp: e.pp ?? 0, alvenaria: e.alvenaria ?? 0, revestimento: e.revestimento ?? 0, variavel: e.variavel ?? 0 });

registrar<{ elemento?: TipoElementoFlecha; etapas?: EtapaP[]; padrao?: boolean }>({
  nome: 'etapas.definir',
  descricao: 'Etapas de carga do processo construtivo para as flechas (NBR 6118, 17.3.2.1.2): lista de { nome, dias, pp, alvenaria, revestimento, variavel } com as frações de cada categoria aplicadas na idade (dias). "elemento" (viga, macica, trelicada; ausente = todos) recebe etapas próprias. "padrao": true volta às etapas padrão (desforma 28 d, alvenaria 60 d, revestimento 120 d, uso 365 d).',
  risco: 'escrita',
  mcp: false,
  calculo: 'detalhe',
  schema: { type: 'object', additionalProperties: false, properties: {
    elemento: { type: 'string', enum: ELEMENTOS }, etapas: { type: 'array', items: etapaSchema, minItems: 1 }, padrao: { type: 'boolean' },
  } },
  validar(b, p) {
    void b;
    if (!p.padrao && !p.etapas) return err('ETAPAS_VAZIAS', 'Informe as etapas ou "padrao": true.');
    if (p.etapas) { const e = validarEtapas(p.etapas.map(completa)); if (e) return err('ETAPAS_INVALIDAS', e); }
    return [];
  },
  aplicar(d, p) {
    const alvo = p.elemento ? [p.elemento] : ELEMENTOS;
    d.flechas ??= {};
    d.flechas.etapas ??= {};
    for (const el of alvo) { if (p.padrao) delete d.flechas.etapas[el]; else d.flechas.etapas[el] = p.etapas!.map(completa); }
    limpar(d);
    return p.padrao ? 'Etapas de carga voltaram ao padrão.' : `Etapas de carga definidas (${p.etapas!.length}) para ${p.elemento ? TIPOS_ELEMENTO_FLECHA.find((t) => t.v === p.elemento)!.rotulo.toLowerCase() : 'todos os elementos'}.`;
  },
});

registrar<{ elemento: TipoElementoFlecha; tipo?: TipoFlecha; limite?: LimiteFlecha; padrao?: boolean }>({
  nome: 'flechas.limites',
  descricao: 'Limite de flecha próprio de um tipo de elemento (viga, macica, trelicada) e de flecha (total, ativa, variavel, instantanea): { rel: x (ℓ/x; 0 = sem), mais: cm somados, abs: cm máximo }. "padrao": true volta ao limite geral das opções (todos os tipos de flecha do elemento quando "tipo" falta).',
  risco: 'escrita',
  mcp: false,
  calculo: 'detalhe',
  schema: { type: 'object', additionalProperties: false, required: ['elemento'], properties: {
    elemento: { type: 'string', enum: ELEMENTOS }, tipo: { type: 'string', enum: TIPOS },
    limite: { type: 'object', additionalProperties: false, required: ['rel'], properties: { rel: { type: 'number', minimum: 0 }, mais: { type: 'number', minimum: 0 }, abs: { type: 'number', minimum: 0 } } },
    padrao: { type: 'boolean' },
  } },
  validar(b, p) {
    void b;
    if (!p.padrao && p.limite === undefined) return err('LIMITE_VAZIO', 'Informe o limite ou "padrao": true.');
    if (p.limite && !p.tipo) return err('LIMITE_SEM_TIPO', 'Informe o tipo de flecha do limite.');
    return [];
  },
  aplicar(d, p) {
    d.flechas ??= {};
    d.flechas.limites ??= {};
    const m = (d.flechas.limites[p.elemento] ??= {});
    if (p.padrao) { if (p.tipo) delete m[p.tipo]; else for (const t of TIPOS) delete m[t]; }
    else m[p.tipo!] = { rel: p.limite!.rel, ...(p.limite!.mais ? { mais: p.limite!.mais } : {}), ...(p.limite!.abs ? { abs: p.limite!.abs } : {}) };
    limpar(d);
    return 'Limite de flecha alterado.';
  },
});
