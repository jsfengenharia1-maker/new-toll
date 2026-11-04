// Fixar e soltar elementos (alfinete). A recusa de mover, girar, espelhar, alinhar, deslocar e apagar elementos fixados
// está em `building/fixacao.ts` e vale para todos os comandos; aqui ficam só os comandos que fixam e soltam.
import { elementoDe, idsEixosEGabaritos } from '../building/fixacao';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
type Tipos = ('eixos' | 'mascaras')[];
type Params = { ids?: string[]; tipos?: Tipos };
const props: Record<string, JsonSchema> = {
  ids: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'ids dos elementos (pilar, viga, laje, carga, parede, eixo, gabarito, fundação…)' },
  tipos: { type: 'array', items: { type: 'string', enum: ['eixos', 'mascaras'] }, minItems: 1, description: 'atalho: todos os eixos e/ou todos os gabaritos (máscaras DXF/DWG) da obra' },
};

const alvos = (b: BuildingModel, p: Params): string[] => [...new Set([...(p.ids ?? []), ...idsEixosEGabaritos(b, p.tipos ?? [])])];

registrar<Params>({
  nome: 'elemento.fixar',
  descricao: 'Fixa elementos (alfinete): eles não podem mais ser movidos, girados, espelhados, alinhados, deslocados nem apagados até serem soltos. Informe `ids` e/ou `tipos` (todos os eixos e gabaritos da obra: o uso mais comum).',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, properties: props },
  validar(b, p) {
    if (!p.ids?.length && !p.tipos?.length) return err('SELECAO_VAZIA', 'Informe `ids` ou `tipos`.');
    const falta = (p.ids ?? []).filter((id) => !elementoDe(b, id));
    if (falta.length) return err('ELEMENTO_INEXISTENTE', `Elemento(s) inexistente(s): ${falta.join(', ')}.`, falta);
    return alvos(b, p).length ? [] : err('SELECAO_VAZIA', 'Não há elementos desses tipos na obra.');
  },
  aplicar(d, p) {
    const novos = alvos(d as BuildingModel, p).filter((id) => !d.fixados?.includes(id));
    if (novos.length) d.fixados = [...(d.fixados ?? []), ...novos];
    return novos.length ? `${novos.length} elemento(s) fixado(s).` : 'Os elementos já estavam fixados.';
  },
});

registrar<Params & { todos?: boolean }>({
  nome: 'elemento.soltar',
  descricao: 'Solta elementos fixados (desfaz o alfinete). Informe `ids`, `tipos` (eixos e/ou gabaritos) ou `todos`.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, properties: { ...props, todos: { type: 'boolean', description: 'solta todos os elementos fixados da obra' } } },
  validar(b, p) {
    if (!p.ids?.length && !p.tipos?.length && !p.todos) return err('SELECAO_VAZIA', 'Informe `ids`, `tipos` ou `todos`.');
    return b.fixados?.length ? [] : err('NENHUM_FIXADO', 'Não há elementos fixados.');
  },
  aplicar(d, p) {
    const sai = p.todos ? new Set(d.fixados ?? []) : new Set(alvos(d as BuildingModel, p));
    const antes = d.fixados?.length ?? 0;
    const resto = (d.fixados ?? []).filter((id) => !sai.has(id));
    if (resto.length) d.fixados = resto; else delete d.fixados;
    return `${antes - resto.length} elemento(s) solto(s).`;
  },
});
