// Biblioteca de normas editável (frente N3): alterar, importar e restaurar as tabelas normativas da obra. Só o que difere
// da fábrica vai ao modelo (`BuildingModel.normas`). O nível de cálculo segue a tabela: referência não recalcula nada,
// detalhe só refaz o dimensionamento, fundação só as fundações.
import type { Draft } from 'immer';
import { IDS_NORMAS, igualAFabrica, normaInfo, validarLinhas, type LinhaNorma, type NivelNorma, type NormasModelo } from '../normas';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string): Diagnostico[] => [{ codigo, severidade: 'erro', elementos: [], mensagem }];

interface Entrada { linhas: LinhaNorma[]; edicao?: string; nota?: string }
interface ParamsDefinir { id?: string; linhas?: LinhaNorma[]; edicao?: string; nota?: string; tabelas?: Record<string, Entrada> }

/** Entradas pedidas (uma tabela ou o lote de importação). */
const entradas = (p: ParamsDefinir): [string, Entrada][] =>
  p.tabelas ? Object.entries(p.tabelas) : p.id ? [[p.id, { linhas: p.linhas ?? [], edicao: p.edicao, nota: p.nota }]] : [];

/** Nível de cálculo do conjunto de tabelas: uma classe só mantém o nível; classes misturadas pedem o cálculo pleno. */
export function nivelDasNormas(ids: string[]): boolean | 'detalhe' | 'fundacao' {
  const ns = new Set<NivelNorma>(ids.map((i) => normaInfo(i)?.nivel).filter((n): n is NivelNorma => !!n));
  if (ns.size !== 1) return ns.size === 0 ? false : true;
  const n = [...ns][0];
  return n === 'referencia' ? false : n === 'detalhe' ? 'detalhe' : n === 'fundacao' ? 'fundacao' : true;
}

const limpar = (d: Draft<BuildingModel>) => { if (d.normas && !Object.keys(d.normas).length) delete d.normas; };

registrar<ParamsDefinir>({
  nome: 'norma.tabela.definir',
  descricao: `Altera uma tabela normativa da biblioteca de normas (\`id\` + \`linhas\`, com \`edicao\` e \`nota\` opcionais) ou importa várias de uma vez (\`tabelas\`: id → { linhas, edicao, nota }). As linhas seguem o esquema de colunas da tabela (ids: ${IDS_NORMAS.join(', ')}). Tabela igual à de fábrica e sem edição/nota não é guardada.`,
  risco: 'escrita',
  calculo: (p) => nivelDasNormas(entradas(p as ParamsDefinir).map(([id]) => id)),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'string', enum: IDS_NORMAS }, linhas: { type: 'array', items: { type: 'object' }, minItems: 1 },
    edicao: { type: 'string' }, nota: { type: 'string' },
    tabelas: { type: 'object', description: 'id da tabela → { linhas, edicao?, nota? }' } as JsonSchema,
  } },
  validar(_b, p) {
    if (p.tabelas && (p.id || p.linhas)) return err('PARAMETRO_INVALIDO', 'Informe `id` + `linhas` ou `tabelas`, não os dois.');
    const es = entradas(p);
    if (!es.length) return err('PARAMETRO_INVALIDO', 'Informe `id` + `linhas` ou `tabelas`.');
    if (p.id && !p.linhas) return err('PARAMETRO_INVALIDO', 'Informe `linhas`.');
    for (const [id, e] of es) {
      if (!normaInfo(id)) return err('NORMA_INEXISTENTE', `Tabela normativa "${id}" não existe.`);
      const er = validarLinhas(id, e?.linhas);
      if (er.length) return err('NORMA_INVALIDA', `Tabela "${id}": ${er.join('; ')}.`);
    }
    return [];
  },
  aplicar(d, p) {
    const es = entradas(p);
    d.normas ??= {};
    const n = d.normas as NormasModelo;
    let gravadas = 0;
    for (const [id, e] of es) {
      const u = { linhas: JSON.parse(JSON.stringify(e.linhas)) as LinhaNorma[], ...(e.edicao?.trim() ? { edicao: e.edicao.trim() } : {}), ...(e.nota?.trim() ? { nota: e.nota.trim() } : {}) };
      if (igualAFabrica(id, u)) delete n[id]; else { n[id] = u; gravadas++; }
    }
    limpar(d);
    return es.length === 1 ? `Tabela "${normaInfo(es[0][0])!.titulo}" ${gravadas ? 'gravada' : 'igual à de fábrica'}.` : `${es.length} tabela(s) normativa(s) importada(s), ${gravadas} alterada(s).`;
  },
});

registrar<{ ids?: string[] }>({
  nome: 'norma.tabela.restaurar',
  descricao: 'Volta à versão de fábrica as tabelas normativas indicadas (todas se omitido).',
  risco: 'escrita',
  calculo: (p) => nivelDasNormas((p as { ids?: string[] }).ids ?? IDS_NORMAS),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { ids: { type: 'array', items: { type: 'string', enum: IDS_NORMAS }, minItems: 1 } } },
  aplicar(d, p) {
    let n = 0;
    for (const id of p.ids ?? IDS_NORMAS) if (d.normas?.[id]) { delete d.normas[id]; n++; }
    limpar(d);
    return n ? `${n} tabela(s) normativa(s) restaurada(s) à de fábrica.` : 'Nenhuma tabela normativa alterada.';
  },
});
