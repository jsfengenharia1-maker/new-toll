// Comandos das vigotas completas (frente E3b): edição vigota a vigota (tipo da série, armaduras, parciais, transversal),
// vigotas duplas e triplas, esforços atribuídos (igualação manual), momentos mínimos por tipo de vão e classe de
// exposição por pano. Todos só mexem no dimensionamento (a análise da grelha não muda); `armadura.desbloquear` limpa a edição.
import { vaos } from '../building/lajes';
import { ehNervurada, geometriaNervurada } from '../building/tiposLaje';
import { TIPOS_VAO, type BuildingModel, type EdicaoVigota, type Laje, type TipoVao } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const BITOLA = [6.3, 8, 10, 12.5, 16, 20, 25], BITOLA_T = [5, 6.3, 8, 10, 12.5];
const barras: JsonSchema = { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: {
  n: { type: 'integer', minimum: 0, maximum: 6 }, phi: { type: 'number', enum: BITOLA },
  comprimento: { type: 'number', minimum: 0.1, description: 'comprimento dado (m); a parcial vira percentual do comprimento da vigota' },
  percentual: { type: 'number', exclusiveMinimum: 0, maximum: 100, description: 'percentual do comprimento da vigota' },
} };
const faixaIndices = { id: { type: 'string', description: 'id da laje' }, de: { type: 'integer', minimum: 0, description: 'primeira vigota (0 = a primeira da numeração do pano)' }, ate: { type: 'integer', minimum: 0, description: 'última vigota (padrão = `de`)' }, indices: { type: 'array', items: { type: 'integer', minimum: 0 }, minItems: 1 } } as const;

/** Número de vigotas da laje (largura transversal ÷ intereixo), como o dimensionamento. */
export function vigotasDaLaje(b: BuildingModel, l: Laje): number {
  if (!ehNervurada(l.tipo)) return 0;
  const g = geometriaNervurada(b, l.tipo);
  return Math.max(1, Math.round(vaos(l)[1] / g.intereixo));
}

interface Sel { id: string; de?: number; ate?: number; indices?: number[] }
/** Índices selecionados (de…ate, da primeira à última, ou a lista), sem repetição, em ordem. */
export function selecionadas(p: Sel): number[] {
  if (p.indices?.length) return [...new Set(p.indices)].sort((a, z) => a - z);
  const de = p.de ?? 0, ate = p.ate ?? de;
  return Array.from({ length: Math.max(0, ate - de + 1) }, (_, i) => de + i);
}
function validarSel(b: BuildingModel, p: Sel): { l?: Laje; erros: Diagnostico[] } {
  const l = b.lajes.find((x) => x.id === p.id);
  if (!l) return { erros: err('LAJE_INEXISTENTE', `Laje ${p.id} não existe.`) };
  if (!ehNervurada(l.tipo)) return { l, erros: err('LAJE_NAO_NERVURADA', `${l.nome} não é nervurada unidirecional (vigotas ou moldada).`, [l.id]) };
  if (p.indices?.length && (p.de !== undefined || p.ate !== undefined)) return { l, erros: err('PARAMETRO_INVALIDO', 'Informe `indices` ou `de`/`ate` (um dos dois).') };
  const sel = selecionadas(p), n = vigotasDaLaje(b, l);
  if (!sel.length || (p.ate !== undefined && p.ate < (p.de ?? 0))) return { l, erros: err('PARAMETRO_INVALIDO', 'Seleção de vigotas vazia (`ate` menor que `de`).') };
  const fora = sel.filter((i) => i >= n);
  if (fora.length) return { l, erros: err('VIGOTA_INEXISTENTE', `${l.nome} tem ${n} vigota(s) (índices de 0 a ${n - 1}); inexistente(s): ${fora.join(', ')}.`, [l.id]) };
  return { l, erros: [] };
}
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const vazia = (e: EdicaoVigota) => Object.keys(e).length <= 1;

// ---------------------------------------------------------------- vigota.editar

type DadosEdicao = Omit<EdicaoVigota, 'indice'>;
registrar<Sel & DadosEdicao & { limpar?: boolean }>({
  nome: 'vigota.editar',
  descricao: 'Atribui dados às vigotas selecionadas de uma laje nervurada, da primeira à última (`de`/`ate`, ou `indices`): `tipo` da série da ficha (armadas e protendidas), armadura inferior `inf` (adicional em todo o comprimento nas armadas; barras da nervura nas moldadas, até 2) e `adicionalCurta` (segunda parcela do positivo), com `comprimento` (m) ou `percentual` do comprimento (mostrados sempre em percentual), superior sobre os apoios `sup`, armadura `transversal` (estribo φ c/s). `limpar: true` apaga a edição das vigotas. As vigotas editadas ficam à parte da igualação e bloqueadas até `armadura.desbloquear`.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    ...faixaIndices, tipo: { type: 'string', minLength: 1 }, inf: barras, adicionalCurta: barras, sup: barras,
    transversal: { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: BITOLA_T }, s: { type: 'number', minimum: 0.05, maximum: 0.4 }, zona: { type: 'number', minimum: 0 } } },
    limpar: { type: 'boolean' },
  } },
  validar(b, p) {
    const { l, erros } = validarSel(b, p);
    if (erros.length) return erros;
    if (p.tipo !== undefined) {
      if (l!.tipo.tipo !== 'vigotas') return err('VIGOTA_TIPO', `${l!.nome} não é de vigotas por ficha: o tipo da série só vale nas armadas e protendidas.`, [l!.id]);
      const g = geometriaNervurada(b, l!.tipo);
      if (!g.ficha?.series.some((s) => (s.tipo ?? s.id) === p.tipo || s.id === p.tipo)) return err('VIGOTA_TIPO', `A ficha "${g.ficha?.nome ?? ''}" não tem o tipo "${p.tipo}".`, [l!.id]);
    }
    if (p.inf && l!.tipo.tipo === 'moldada' && p.inf.n > 2) return err('PARAMETRO_INVALIDO', 'Nervurada moldada: a armadura inferior da vigota tem no máximo duas barras longitudinais.', [l!.id]);
    if (p.inf && l!.tipo.tipo === 'vigotas' && p.inf.n > 2) return err('PARAMETRO_INVALIDO', 'Vigota armada: o adicional tem no máximo duas barras.', [l!.id]);
    return [];
  },
  aplicar(d, p) {
    const l = d.lajes.find((x) => x.id === p.id)!, sel = selecionadas(p), lista = (l.edicaoVigotas ??= []);
    for (const i of sel) {
      let e = lista.find((x) => x.indice === i);
      if (p.limpar) { if (e) lista.splice(lista.indexOf(e), 1); continue; }
      if (!e) { e = { indice: i }; lista.push(e); }
      if (p.tipo !== undefined) e.tipo = p.tipo;
      if (p.inf) e.inf = copia(p.inf);
      if (p.adicionalCurta) e.adicionalCurta = copia(p.adicionalCurta);
      if (p.sup) e.sup = copia(p.sup);
      if (p.transversal) e.transversal = copia(p.transversal);
    }
    for (let k = lista.length - 1; k >= 0; k--) if (vazia(lista[k])) lista.splice(k, 1);
    lista.sort((a, z) => a.indice - z.indice);
    if (!lista.length) delete l.edicaoVigotas;
    return p.limpar ? `Edição de ${sel.length} vigota(s) de ${l.nome} apagada.` : `${sel.length} vigota(s) de ${l.nome} editada(s) e bloqueada(s).`;
  },
});

// ---------------------------------------------------------------- vigota.momentos

registrar<Sel & { pos?: number; neg?: [number, number]; v?: [number, number]; limpar?: boolean }>({
  nome: 'vigota.momentos',
  descricao: 'Igualação manual (vigota genérica de concreto): atribui às vigotas selecionadas o momento positivo `pos`, os negativos das duas pontas `neg` (≤ 0, kN·m por nervura) e os cortantes das pontas `v` (kN por nervura), no lugar dos esforços calculados. `limpar: true` volta aos esforços calculados.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    ...faixaIndices, pos: { type: 'number', minimum: 0 }, neg: { type: 'array', items: { type: 'number', maximum: 0 }, minItems: 2, maxItems: 2 }, v: { type: 'array', items: { type: 'number', minimum: 0 }, minItems: 2, maxItems: 2 }, limpar: { type: 'boolean' },
  } },
  validar(b, p) {
    const { erros } = validarSel(b, p);
    if (erros.length) return erros;
    if (!p.limpar && (p.pos === undefined || !p.neg || !p.v)) return err('PARAMETRO_INVALIDO', 'Informe `pos`, `neg` e `v` (ou `limpar`).');
    return [];
  },
  aplicar(d, p) {
    const l = d.lajes.find((x) => x.id === p.id)!, sel = selecionadas(p), lista = (l.edicaoVigotas ??= []);
    for (const i of sel) {
      let e = lista.find((x) => x.indice === i);
      if (p.limpar) { if (e) delete e.momentos; continue; }
      if (!e) { e = { indice: i }; lista.push(e); }
      e.momentos = { pos: p.pos!, neg: [...p.neg!] as [number, number], v: [...p.v!] as [number, number] };
    }
    for (let k = lista.length - 1; k >= 0; k--) if (vazia(lista[k])) lista.splice(k, 1);
    lista.sort((a, z) => a.indice - z.indice);
    if (!lista.length) delete l.edicaoVigotas;
    return p.limpar ? `Esforços atribuídos a ${sel.length} vigota(s) de ${l.nome} apagados.` : `Esforços atribuídos a ${sel.length} vigota(s) de ${l.nome} (igualação manual).`;
  },
});

// ---------------------------------------------------------------- vigota.multipla

registrar<{ id: string; indice: number; n: 1 | 2 | 3 }>({
  nome: 'vigota.multipla',
  descricao: 'Vigota dupla ou tripla (C7.14): `n` = 2 ou 3 faz da vigota `indice` um conjunto com as vigotas seguintes, que são apagadas (o peso, a rigidez e os esforços do conjunto entram no cálculo); `n` = 1 apaga a marcação. Só em fichas que informam vigota múltipla (máximo da ficha).',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'indice', 'n'], properties: { id: { type: 'string' }, indice: { type: 'integer', minimum: 0 }, n: { type: 'integer', enum: [1, 2, 3] } } },
  validar(b, p) {
    const { l, erros } = validarSel(b, { id: p.id, de: p.indice });
    if (erros.length) return erros;
    if (p.n > 1) {
      if (l!.tipo.tipo !== 'vigotas') return err('VIGOTA_MULTIPLA', `${l!.nome} não é de vigotas por ficha: só as fichas com vigota múltipla admitem dupla ou tripla.`, [l!.id]);
      const g = geometriaNervurada(b, l!.tipo), max = g.ficha?.multipla?.n ?? 1;
      if (max < p.n) return err('VIGOTA_MULTIPLA', max > 1 ? `A ficha "${g.ficha!.nome}" admite no máximo ${max} vigotas lado a lado.` : `A ficha "${g.ficha?.nome ?? ''}" não admite vigotas duplas ou triplas.`, [l!.id]);
      const n = vigotasDaLaje(b, l!);
      if (p.indice + p.n > n) return err('VIGOTA_MULTIPLA', `O conjunto de ${p.n} vigotas a partir da vigota ${p.indice + 1} passa da última (${n}).`, [l!.id]);
    }
    return [];
  },
  aplicar(d, p) {
    const l = d.lajes.find((x) => x.id === p.id)!, lista = (l.vigotasMultiplas ??= []);
    // o conjunto apaga as vigotas seguintes: marcas dentro dele saem; a nova substitui a da mesma vigota
    const novas = lista.filter((m) => m.indice !== p.indice && !(p.n > 1 && m.indice > p.indice && m.indice < p.indice + p.n) && !(m.indice < p.indice && m.indice + m.n > p.indice));
    if (p.n > 1) novas.push({ indice: p.indice, n: p.n as 2 | 3 });
    novas.sort((a, z) => a.indice - z.indice);
    if (novas.length) l.vigotasMultiplas = novas; else delete l.vigotasMultiplas;
    return p.n > 1 ? `Vigota ${p.indice + 1} de ${l.nome} passa a ${p.n === 3 ? 'tripla' : 'dupla'}.` : `Marcação de vigota múltipla da vigota ${p.indice + 1} de ${l.nome} apagada.`;
  },
});

// ---------------------------------------------------------------- laje.momentosMin

registrar<{ ids: string[]; tipo: TipoVao; pos?: number; neg?: number; limpar?: boolean }>({
  nome: 'laje.momentosMin',
  descricao: 'Momentos mínimos das vigotas por pano (C7.10, K1.12.5-9): divisor de p·ℓ² do positivo `pos` e do negativo `neg` (0 desliga) para um `tipo` de vão (extremo, intermediario, isolado ou balanco) nas lajes `ids`. Sem valor próprio, vale o da obra (`vigotaMomentoMin*`). `limpar: true` volta ao da obra para o tipo.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'tipo'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, tipo: { type: 'string', enum: TIPOS_VAO.map((t) => t.v) },
    pos: { type: 'number', minimum: 0, maximum: 50 }, neg: { type: 'number', minimum: 0, maximum: 50 }, limpar: { type: 'boolean' },
  } },
  validar(b, p) {
    const sem = p.ids.filter((id) => !b.lajes.some((x) => x.id === id));
    if (sem.length) return err('LAJE_INEXISTENTE', `Laje ${sem.join(', ')} não existe.`);
    const mac = b.lajes.filter((x) => p.ids.includes(x.id) && !ehNervurada(x.tipo) && x.tipo.tipo !== 'alveolar');
    if (mac.length) return err('LAJE_NAO_NERVURADA', `${mac.map((x) => x.nome).join(', ')} não é nervurada nem alveolar.`, mac.map((x) => x.id));
    if (!p.limpar && p.pos === undefined && p.neg === undefined) return err('PARAMETRO_INVALIDO', 'Informe `pos` e/ou `neg` (ou `limpar`).');
    return [];
  },
  aplicar(d, p) {
    for (const l of d.lajes) {
      if (!p.ids.includes(l.id)) continue;
      const m = (l.momentosMin ??= {});
      if (p.limpar) delete m[p.tipo];
      else m[p.tipo] = { ...m[p.tipo], ...(p.pos !== undefined ? { pos: p.pos } : {}), ...(p.neg !== undefined ? { neg: p.neg } : {}) };
      if (!Object.keys(m).length) delete l.momentosMin;
    }
    return p.limpar ? `Momentos mínimos (${p.tipo}) de ${p.ids.length} laje(s) voltaram aos da obra.` : `Momentos mínimos (${p.tipo}) definidos em ${p.ids.length} laje(s).`;
  },
});

// ---------------------------------------------------------------- laje.exposicao

registrar<{ ids?: string[]; grupo?: string; caa: 'I' | 'II' | 'III' | 'IV' | 'obra' }>({
  nome: 'laje.exposicao',
  descricao: 'Classe de agressividade ambiental por pano (C7.11): `caa` I a IV nas lajes `ids` ou em todas as do `grupo` de pavimentos; define o nível de protensão das vigotas protendidas (NBR 6118, Tabela 13.4: I parcial, II limitada, III e IV completa [a confirmar]). `caa: "obra"` volta à classe da obra.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['caa'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, grupo: { type: 'string' }, caa: { type: 'string', enum: ['I', 'II', 'III', 'IV', 'obra'] },
  } },
  validar(b, p) {
    if (!p.ids === !p.grupo) return err('PARAMETRO_INVALIDO', 'Informe `ids` ou `grupo` (um dos dois).');
    if (p.grupo && !b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const sem = (p.ids ?? []).filter((id) => !b.lajes.some((x) => x.id === id));
    return sem.length ? err('LAJE_INEXISTENTE', `Laje ${sem.join(', ')} não existe.`) : [];
  },
  aplicar(d, p) {
    let n = 0;
    for (const l of d.lajes) {
      if (!(p.ids ? p.ids.includes(l.id) : l.grupo === p.grupo)) continue;
      n++;
      if (p.caa !== 'obra') l.exposicao = p.caa; else delete l.exposicao;
    }
    return p.caa !== 'obra' ? `Classe de agressividade ${p.caa} atribuída a ${n} laje(s).` : `${n} laje(s) voltaram à classe de agressividade da obra.`;
  },
});
