// Tabelas de armadura (frente R7a): criar, editar, remover e restaurar as tabelas da obra. A atribuição a um elemento
// é feita por `viga.editar`, `pilar.editar` e `laje.editar` (campo `tabela`). Só o que difere da fábrica vai ao modelo.
import type { Draft } from 'immer';
import type { BuildingModel } from '../building/types';
import { ID_PADRAO, TIPOS_TABELA, normalizarTabela, tabelaDeFabrica, tabelaIgual, tabelasDoTipo, validarTabela, type Tabela, type TipoTabela } from '../building/tabelasArmadura';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const TIPOS = TIPOS_TABELA.map((t) => t.v);

/** Erro se algum id de tabela informado não existe (vazio e "padrao" sempre valem). */
export function tabelaInexistente(b: BuildingModel, pares: [TipoTabela, string | undefined][]): Diagnostico[] {
  for (const [tipo, id] of pares) if (id && id !== ID_PADRAO && !tabelasDoTipo(b, tipo).some((t) => t.id === id)) return err('TABELA_INEXISTENTE', `Tabela "${id}" de ${tipo} não existe.`);
  return [];
}

/** Grava (ou apaga, se vazio ou "padrao") a tabela atribuída a um elemento. */
export function atribuirTabela(el: object, campo: 'tabela' | 'tabelaEstribo', id: string | undefined) {
  if (id === undefined) return;
  const e = el as Record<string, unknown>;
  if (id && id !== ID_PADRAO) e[campo] = id; else delete e[campo];
}

const nums: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 1 };
const tabelaSchema: JsonSchema = { type: 'object', required: ['id', 'nome'], properties: {
  id: { type: 'string', minLength: 1 }, nome: { type: 'string', minLength: 1 },
  linhas: { type: 'array', items: { type: 'object' }, minItems: 1, description: 'vigas: { bAte, hAte, pos, neg, passante }; estribos: { bAte, bitolas, sMin, sMax, ramos }; lajes: { hAte, bitolas, sMin, sMax } (cm, mm)' },
  bitolas: nums, espacamentos: nums, estribos: { type: 'array', items: { type: 'object' } },
  secoes: { type: 'array', items: { type: 'object' }, description: 'pilares (R7g): faixas { ladoMenorAte, ladoMaiorAte (cm), bitolas?, espacamentos?, estribos? } que substituem os campos gerais' },
  grampos: { type: 'array', items: { type: 'object' }, description: 'pilares (R7g): { phiAte (mm), ladoMaiorAte (cm), modo: norma | todas | nenhum }' },
} };

function limpar(d: Draft<BuildingModel>, tipo: TipoTabela) {
  if (d.tabelas && !d.tabelas[tipo]?.length) delete d.tabelas[tipo];
  if (d.tabelas && !Object.keys(d.tabelas).length) delete d.tabelas;
}

/** Elementos que apontam para a tabela deixam de apontar (volta à padrão). */
function desatribuir(d: Draft<BuildingModel>, tipo: TipoTabela, id: string) {
  if (tipo === 'vigas') for (const v of d.vigas) if (v.tabela === id) delete v.tabela;
  if (tipo === 'estribos') for (const v of d.vigas) if (v.tabelaEstribo === id) delete v.tabelaEstribo;
  if (tipo === 'pilares') for (const p of d.pilares) if (p.tabela === id) delete p.tabela;
  if (tipo === 'lajes') for (const l of d.lajes) if (l.tabela === id) delete l.tabela;
}

registrar<{ tipo: TipoTabela; tabela?: Tabela; remover?: string }>({
  nome: 'tabela.definir',
  descricao: 'Cria ou substitui uma tabela de armadura (tipo vigas, estribos, pilares ou lajes) pelo `id`; o id "padrao" altera a tabela padrão da obra. Vigas: linhas { bAte, hAte (cm), pos e neg { bitolas, nMin, camadas }, passante (fração) }; estribos: linhas { bAte, bitolas, sMin, sMax (cm; 0 = norma), ramos 2/4/6 }; pilares: { bitolas, espacamentos (cm), estribos [{ phiAte, phiT, sMax }] }; lajes: linhas { hAte, bitolas, sMin, sMax }. `remover` apaga a tabela criada (a padrão volta à de fábrica) e solta os elementos que a usavam.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['tipo'], properties: { tipo: { type: 'string', enum: TIPOS }, tabela: tabelaSchema, remover: { type: 'string' } } },
  validar(b, p) {
    if (!p.tabela && !p.remover) return err('PARAMETRO_INVALIDO', 'Informe `tabela` ou `remover`.');
    if (p.remover && !(b.tabelas?.[p.tipo] as { id: string }[] | undefined)?.some((t) => t.id === p.remover)) return err('TABELA_INEXISTENTE', `Não há tabela alterada ou criada "${p.remover}" em ${p.tipo}.`);
    if (p.tabela) { const e = validarTabela(p.tipo, p.tabela); if (e.length) return err('TABELA_INVALIDA', `Tabela "${p.tabela.nome}": ${e.join('; ')}.`); }
    return [];
  },
  aplicar(d, p) {
    d.tabelas ??= {};
    const lista = ((d.tabelas as Record<string, Tabela[]>)[p.tipo] ??= []);
    if (p.remover) {
      const i = lista.findIndex((t) => t.id === p.remover);
      if (i >= 0) lista.splice(i, 1);
      desatribuir(d, p.tipo, p.remover);
      limpar(d, p.tipo);
      return `Tabela "${p.remover}" removida.`;
    }
    const t = normalizarTabela(p.tipo, p.tabela!);
    const i = lista.findIndex((x) => x.id === t.id);
    if (t.id === ID_PADRAO && tabelaIgual({ ...t, nome: 'Padrão' }, tabelaDeFabrica(p.tipo))) { if (i >= 0) lista.splice(i, 1); } // igual à de fábrica: não se guarda
    else if (i >= 0) lista[i] = t; else lista.push(t);
    limpar(d, p.tipo);
    return `Tabela "${t.nome}" (${p.tipo}) ${t.id === ID_PADRAO ? 'padrão da obra ' : ''}gravada.`;
  },
});

registrar<{ tipos?: TipoTabela[] }>({
  nome: 'tabela.restaurar',
  descricao: 'Volta às tabelas de fábrica as tabelas padrão dos tipos indicados (todos se omitido). As tabelas criadas pelo usuário ficam.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { tipos: { type: 'array', items: { type: 'string', enum: TIPOS }, minItems: 1 } } },
  aplicar(d, p) {
    const tipos = p.tipos ?? TIPOS;
    let n = 0;
    for (const tipo of tipos) {
      const lista = (d.tabelas as Record<string, Tabela[]> | undefined)?.[tipo];
      const i = lista?.findIndex((t) => t.id === ID_PADRAO) ?? -1;
      if (lista && i >= 0) { lista.splice(i, 1); n++; }
      limpar(d, tipo);
    }
    return n ? `${n} tabela(s) padrão restaurada(s) à de fábrica.` : 'Nenhuma tabela padrão alterada.';
  },
});

/**
 * Nível de cálculo de um comando de edição de elemento (`*.editar`): só campos de dimensionamento e detalhamento
 * (`detalhe`) = 'detalhe'; com `secao` além deles = 'secao' (se o comando aceita rearmar com os esforços guardados);
 * qualquer outro campo = cálculo pleno.
 */
export function nivelEdicao(p: Record<string, unknown>, detalhe: string[], secao?: 'secao'): true | 'detalhe' | 'secao' {
  const ks = Object.keys(p).filter((k) => k !== 'id' && p[k] !== undefined);
  if (!ks.length) return true;
  if (ks.every((k) => detalhe.includes(k))) return 'detalhe';
  if (secao && ks.every((k) => k === 'secao' || detalhe.includes(k))) return 'secao';
  return true;
}
