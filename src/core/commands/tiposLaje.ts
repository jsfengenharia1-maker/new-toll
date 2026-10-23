// Comandos dos tipos de laje nervurada (frente E3a): fichas de vigotas, enchimentos e importação da biblioteca.
// A biblioteca da obra (`b.tiposLaje`) guarda só o que a obra criou, importou ou usa; catálogo interno e exemplos são
// resolvidos por id e copiados para a obra quando uma laje os usa. Fichas de fabricante (somente leitura) não se editam.
import type { Draft } from 'immer';
import {
  enchimentoPor, enchimentoPorOuExemplo, enchimentosCatalogo, errosTipoLaje, fichaPor, fichasDisponiveis, fichaPorGeometria, importarTiposLaje,
  type Enchimento, type FichaVigota, type FonteLajes, type ParamsGeometria,
} from '../building/tiposLaje';
import { concretoDe } from '../building/materiais';
import { validarForma, type FormaLaje } from '../building/nervuradas';
import type { BuildingModel, TipoLaje } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const MATERIAIS = ['concreto', 'ceramica', 'eps', 'generico'];
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Ficha da obra pelo id (editável ou não). */
const daObra = (b: FonteLajes, id: string) => b.tiposLaje?.fichas?.find((f) => f.id === id);
/** Ids de fichas em uso pelas lajes. */
const fichasEmUso = (b: BuildingModel) => new Set(b.lajes.flatMap((l) => (l.tipo.tipo === 'vigotas' ? [l.tipo.ficha] : [])));
/** Ids de enchimentos em uso (séries das fichas da obra, fichas em uso e lajes moldadas). */
const enchimentosEmUso = (b: BuildingModel) => new Set([
  ...(b.tiposLaje?.fichas ?? []).flatMap((f) => f.series.map((s) => s.enchimento)),
  ...b.lajes.flatMap((l) => (l.tipo.tipo === 'moldada' ? [l.tipo.enchimento] : [])),
  ...(b.tiposLaje?.formas ?? []).flatMap((f) => (f.enchimento ? [f.enchimento] : [])),
]);

/** Erros do tipo de laje (existência da ficha, série e enchimento; coerência lógica da ficha). Usado por `laje.*`. */
export const validarTipoLaje = (b: BuildingModel, t: TipoLaje | undefined): Diagnostico[] => errosTipoLaje(b, t).map((x) => ({ codigo: x.codigo, severidade: 'erro' as const, elementos: [], mensagem: x.mensagem }));

/** Copia para a obra a ficha (e os enchimentos de exemplo) que a laje passa a usar; o catálogo interno fica por id. */
export function garantirTipoNaObra(d: Draft<BuildingModel>, t: TipoLaje): void {
  const b = d as BuildingModel;
  if (t.tipo === 'vigotas' && !daObra(b, t.ficha)) {
    const x = fichasDisponiveis(b).find((y) => y.ficha.id === t.ficha);
    if (x && x.fonte === 'exemplo') {
      d.tiposLaje ??= {};
      (d.tiposLaje.fichas ??= []).push(copia(x.ficha));
      for (const s of x.ficha.series) copiarEnchimento(d, s.enchimento);
    }
  }
  if (t.tipo === 'moldada') copiarEnchimento(d, t.enchimento);
}
function copiarEnchimento(d: Draft<BuildingModel>, id: string) {
  const b = d as BuildingModel;
  if (enchimentoPor(b, id)) return;
  const e = enchimentoPorOuExemplo(b, id);
  if (e) { d.tiposLaje ??= {}; (d.tiposLaje.enchimentos ??= []).push(copia(e)); }
}
export const limpar = (d: Draft<BuildingModel>) => {
  const t = d.tiposLaje;
  if (!t) return;
  if (t.fichas && !t.fichas.length) delete t.fichas;
  if (t.enchimentos && !t.enchimentos.length) delete t.enchimentos;
  if (t.formas && !t.formas.length) delete t.formas;
  if (!t.fichas && !t.enchimentos && !t.formas) delete d.tiposLaje;
};
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;

// ---------------------------------------------------------------- esquemas

const num: JsonSchema = { type: 'number' };
const serieSchema: JsonSchema = { type: 'object', additionalProperties: true, required: ['id', 'altura', 'intereixo', 'capa', 'hEnch', 'bwMin', 'enchimento'], properties: {
  id: { type: 'string', minLength: 1 }, tipo: { type: 'string' }, altura: num, intereixo: num, capa: num, hEnch: num, bwMin: num, enchimento: { type: 'string' }, trelica: { type: 'string' }, pesoM2: num,
  positivo: { type: 'object' }, negativo: { type: 'object' }, cortante: { type: 'object' }, protensao: { type: 'object' },
} };
const fichaSchema: JsonSchema = { type: 'object', additionalProperties: true, required: ['nome', 'familia', 'series'], properties: {
  id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, fabricante: { type: 'string' }, referencia: { type: 'string' },
  familia: { type: 'string', enum: ['trelicada', 'armada', 'protendida', 'moldada'] }, series: { type: 'array', items: serieSchema, minItems: 1 },
  bwExtra: num, multipla: { type: 'object' }, relacaoFis: num, nota: { type: 'string' },
} };
const geometriaSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['nome', 'familia', 'capa', 'hEnch', 'intereixo', 'bwMin', 'enchimento'], properties: {
  id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, referencia: { type: 'string' }, familia: { type: 'string', enum: ['armada', 'protendida'] },
  capa: { type: 'number', minimum: 0.03, maximum: 0.2 }, hEnch: { type: 'number', minimum: 0.03, maximum: 0.6 }, intereixo: { type: 'number', minimum: 0.2, maximum: 1.2 }, bwMin: { type: 'number', minimum: 0.05, maximum: 0.4 },
  enchimento: { type: 'string' }, trelica: { type: 'string' }, Mu: { type: 'number', exclusiveMinimum: 0 }, Mfis: { type: 'number', exclusiveMinimum: 0 }, relacaoFis: { type: 'number', exclusiveMinimum: 0, maximum: 1 }, bwExtra: { type: 'number', minimum: 0, maximum: 0.3 },
} };

// ---------------------------------------------------------------- tipoLaje.ficha

interface ParamsFicha { acao: 'criar' | 'editar' | 'copiar' | 'remover'; id?: string; ficha?: FichaVigota; geometria?: ParamsGeometria; de?: string; nome?: string }

/** Ficha pronta para gravar: origem do usuário (ou geometria), id definido, cópia profunda. */
function montar(d: Draft<BuildingModel> | BuildingModel, p: ParamsFicha, id: string): FichaVigota {
  const b = d as BuildingModel;
  if (p.geometria) return fichaPorGeometria(b, concretoDe(b, 'laje'), { ...p.geometria, id });
  return { ...copia(p.ficha!), id, origem: p.ficha!.origem === 'geometria' ? 'geometria' : 'usuario' };
}

registrar<ParamsFicha>({
  nome: 'tipoLaje.ficha',
  descricao: 'Fichas de vigotas da obra (E3a): `criar` (com `ficha` completa ou `geometria` para o tipo genérico por geometria), `editar` (`id` + `ficha` ou `geometria`), `copiar` (`de` = ficha da obra, do catálogo ou de exemplo; `nome` opcional) e `remover` (`id`; recusado se alguma laje usa a ficha). Fichas de fabricante são somente leitura: copie-as para editar. O programa só confere a coerência lógica (Mu > Mfis, altura ≥ capa + enchimento, séries sem repetição), nunca o dado do fabricante.',
  risco: 'escrita',
  calculo: (p) => ((p as unknown as ParamsFicha).acao === 'criar' || (p as unknown as ParamsFicha).acao === 'copiar' ? false : true),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['criar', 'editar', 'copiar', 'remover'] }, id: { type: 'string' }, ficha: fichaSchema, geometria: geometriaSchema, de: { type: 'string' }, nome: { type: 'string', minLength: 1 },
  } },
  validar(b, p) {
    if (p.acao === 'criar') {
      if (!p.ficha === !p.geometria) return err('PARAMETRO_INVALIDO', 'Informe `ficha` ou `geometria` (um dos dois).');
      const id = p.id ?? p.ficha?.id ?? p.geometria?.id;
      if (id && fichaPor(b, id)) return err('FICHA_EXISTENTE', `Já existe a ficha "${id}".`);
    }
    if (p.acao === 'editar') {
      if (!p.id) return err('PARAMETRO_INVALIDO', 'Informe `id`.');
      const f = daObra(b, p.id);
      if (!f) return err('FICHA_INEXISTENTE', `A ficha "${p.id}" não está na obra.`);
      if (f.origem === 'fabricante') return err('FICHA_SOMENTE_LEITURA', `A ficha "${f.nome}" é do fabricante (somente leitura): copie-a para editar.`);
      if (!p.ficha === !p.geometria) return err('PARAMETRO_INVALIDO', 'Informe `ficha` ou `geometria` (um dos dois).');
    }
    if (p.acao === 'copiar') {
      if (!p.de || !fichaPor(b, p.de)) return err('FICHA_INEXISTENTE', `Ficha de origem "${p.de ?? ''}" não existe.`);
    }
    if (p.acao === 'remover') {
      if (!p.id || !daObra(b, p.id)) return err('FICHA_INEXISTENTE', `A ficha "${p.id ?? ''}" não está na obra.`);
      if (fichasEmUso(b).has(p.id)) return err('FICHA_EM_USO', `A ficha "${daObra(b, p.id)!.nome}" é usada por lajes: atribua outro tipo antes de removê-la.`, b.lajes.filter((l) => l.tipo.tipo === 'vigotas' && l.tipo.ficha === p.id).map((l) => l.id));
    }
    return [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    d.tiposLaje ??= {};
    const lista = (d.tiposLaje.fichas ??= []);
    if (p.acao === 'criar') {
      const id = p.id ?? p.ficha?.id ?? novoId(d, 'f');
      lista.push(montar(d, p, id));
      return `Ficha "${lista.at(-1)!.nome}" criada.`;
    }
    if (p.acao === 'editar') {
      const i = lista.findIndex((f) => f.id === p.id);
      lista[i] = montar(d, p, p.id!);
      return `Ficha "${lista[i].nome}" alterada.`;
    }
    if (p.acao === 'copiar') {
      const o = copia(fichaPor(b, p.de!)!), id = novoId(d, 'f');
      const nova: FichaVigota = { ...o, id, nome: p.nome?.trim() || `${o.nome} (cópia)`, origem: o.origem === 'geometria' ? 'geometria' : 'usuario' };
      lista.push(nova);
      for (const s of nova.series) copiarEnchimento(d, s.enchimento);
      return `Ficha "${nova.nome}" copiada de "${o.nome}".`;
    }
    const i = lista.findIndex((f) => f.id === p.id), nome = lista[i].nome;
    lista.splice(i, 1);
    limpar(d);
    return `Ficha "${nome}" removida.`;
  },
});

// ---------------------------------------------------------------- tipoLaje.enchimento

interface ParamsEnchimento { acao: 'criar' | 'editar' | 'copiar' | 'remover'; id?: string; enchimento?: Enchimento; de?: string; nome?: string }
const checarEnchimento = (e: Enchimento): Diagnostico[] => {
  if (!e.nome?.trim()) return err('PARAMETRO_INVALIDO', 'Enchimento sem nome.');
  if (!MATERIAIS.includes(e.material)) return err('PARAMETRO_INVALIDO', 'Material do enchimento inválido.');
  if ((e.material === 'concreto' || e.material === 'eps') && !(e.gama && e.gama > 0)) return err('ENCHIMENTO_INVALIDO', 'Concreto e EPS pedem o peso específico (kN/m³).');
  if (e.material === 'ceramica' && !(e.pesoPeca && e.pesoPeca > 0 && e.comprimentoPeca && e.comprimentoPeca > 0)) return err('ENCHIMENTO_INVALIDO', 'Cerâmica pede o peso da peça (kN) e o comprimento dela ao longo da vigota (m) [a confirmar com o fabricante].');
  if (e.material === 'generico' && !(e.pesoM2 !== undefined && e.pesoM2 >= 0)) return err('ENCHIMENTO_INVALIDO', 'Enchimento genérico pede o peso por m² de laje (kN/m²).');
  return [];
};

registrar<ParamsEnchimento>({
  nome: 'tipoLaje.enchimento',
  descricao: 'Biblioteca de enchimentos da obra (E3a): `criar` (`enchimento` { nome, material: concreto|ceramica|eps|generico, gama (kN/m³: concreto e EPS), pesoPeca e comprimentoPeca (cerâmica), pesoM2 (genérico) }), `editar` (`id` + `enchimento`), `copiar` (`de`) e `remover` (`id`; recusado se alguma ficha ou laje usa). Peso total da laje = capa + nervuras + enchimento, calculado.',
  risco: 'escrita',
  calculo: (p) => ((p as unknown as ParamsEnchimento).acao === 'criar' || (p as unknown as ParamsEnchimento).acao === 'copiar' ? false : true),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['criar', 'editar', 'copiar', 'remover'] }, id: { type: 'string' }, de: { type: 'string' }, nome: { type: 'string', minLength: 1 },
    enchimento: { type: 'object', additionalProperties: false, required: ['nome', 'material'], properties: {
      id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, material: { type: 'string', enum: MATERIAIS }, gama: { type: 'number', exclusiveMinimum: 0 },
      pesoPeca: { type: 'number', exclusiveMinimum: 0 }, comprimentoPeca: { type: 'number', exclusiveMinimum: 0 }, pesoM2: { type: 'number', minimum: 0 }, nota: { type: 'string' },
    } },
  } },
  validar(b, p) {
    const lista = b.tiposLaje?.enchimentos ?? [];
    if (p.acao === 'criar' || p.acao === 'editar') {
      if (!p.enchimento) return err('PARAMETRO_INVALIDO', 'Informe `enchimento`.');
      const e = checarEnchimento(p.enchimento);
      if (e.length) return e;
    }
    if (p.acao === 'criar') {
      const id = p.id ?? p.enchimento?.id;
      if (id && enchimentoPorOuExemplo(b, id)) return err('ENCHIMENTO_EXISTENTE', `Já existe o enchimento "${id}".`);
    }
    if (p.acao === 'editar' && !lista.some((e) => e.id === p.id)) return err('ENCHIMENTO_INEXISTENTE', `O enchimento "${p.id ?? ''}" não está na obra (os do catálogo se editam na biblioteca de normas).`);
    if (p.acao === 'copiar' && !(p.de && enchimentoPorOuExemplo(b, p.de))) return err('ENCHIMENTO_INEXISTENTE', `Enchimento de origem "${p.de ?? ''}" não existe.`);
    if (p.acao === 'remover') {
      if (!lista.some((e) => e.id === p.id)) return err('ENCHIMENTO_INEXISTENTE', `O enchimento "${p.id ?? ''}" não está na obra.`);
      if (enchimentosEmUso(b).has(p.id!)) return err('ENCHIMENTO_EM_USO', 'O enchimento é usado por fichas ou lajes: troque-o antes de removê-lo.');
    }
    return [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    d.tiposLaje ??= {};
    const lista = (d.tiposLaje.enchimentos ??= []);
    if (p.acao === 'criar') { const e = { ...copia(p.enchimento!), id: p.id ?? p.enchimento!.id ?? novoId(d, 'e') }; lista.push(e); return `Enchimento "${e.nome}" criado.`; }
    if (p.acao === 'editar') { const i = lista.findIndex((e) => e.id === p.id); lista[i] = { ...copia(p.enchimento!), id: p.id! }; return `Enchimento "${lista[i].nome}" alterado.`; }
    if (p.acao === 'copiar') {
      const o = copia(enchimentoPorOuExemplo(b, p.de!)!), e: Enchimento = { ...o, id: novoId(d, 'e'), nome: p.nome?.trim() || `${o.nome} (cópia)` };
      lista.push(e);
      return `Enchimento "${e.nome}" copiado.`;
    }
    const i = lista.findIndex((e) => e.id === p.id), nome = lista[i].nome;
    lista.splice(i, 1);
    limpar(d);
    return `Enchimento "${nome}" removido.`;
  },
});

// ---------------------------------------------------------------- tipoLaje.importar

interface ParamsImportar { texto?: string; fichas?: FichaVigota[]; enchimentos?: Enchimento[]; formas?: FormaLaje[]; substituir?: boolean }
const lerImport = (p: ParamsImportar) => (p.texto !== undefined ? importarTiposLaje(p.texto) : ({ ok: true, fichas: p.fichas ?? [], enchimentos: p.enchimentos ?? [], formas: p.formas ?? [] } as const));

registrar<ParamsImportar>({
  nome: 'tipoLaje.importar',
  descricao: 'Importa fichas e enchimentos para a biblioteca da obra (E3a): `texto` = JSON exportado (formato statikos-tipos-laje) ou `fichas`/`enchimentos` já lidos. Id já existente na obra é recusado, salvo `substituir`: true (fichas em uso por lajes são substituídas no lugar). Fichas de fabricante do arquivo ficam somente leitura.',
  risco: 'escrita',
  calculo: (p) => !!(p as unknown as ParamsImportar).substituir,
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    texto: { type: 'string' }, fichas: { type: 'array', items: fichaSchema }, enchimentos: { type: 'array', items: { type: 'object' } }, formas: { type: 'array', items: { type: 'object' } }, substituir: { type: 'boolean' },
  } },
  validar(b, p) {
    if (p.texto === undefined && !p.fichas?.length && !p.enchimentos?.length && !p.formas?.length) return err('PARAMETRO_INVALIDO', 'Informe `texto` ou `fichas`/`enchimentos`/`formas`.');
    const r = lerImport(p);
    if (!r.ok) return err('TIPOLAJE_IMPORTACAO', `Arquivo recusado: ${r.erros.join('; ')}.`);
    for (const e of r.enchimentos) { const c = checarEnchimento(e); if (c.length) return c; }
    for (const fm of r.formas) { const c = validarForma(fm, b); if (c.length) return err('FORMA_INCOERENTE', `Forma "${fm.nome}" incoerente: ${c.join(' ')}`); }
    const repetidos = [
      ...r.fichas.filter((f) => !p.substituir && daObra(b, f.id)).map((f) => `ficha ${f.id}`),
      ...r.enchimentos.filter((e) => !p.substituir && b.tiposLaje?.enchimentos?.some((x) => x.id === e.id)).map((e) => `enchimento ${e.id}`),
      ...r.enchimentos.filter((e) => enchimentosCatalogo(b).some((x) => x.id === e.id)).map((e) => `enchimento ${e.id} (id reservado do catálogo)`),
      ...r.fichas.filter((f) => f.id.startsWith('cat:') || f.id.startsWith('ex:')).map((f) => `ficha ${f.id} (id reservado)`),
      ...r.formas.filter((f) => !p.substituir && b.tiposLaje?.formas?.some((x) => x.id === f.id)).map((f) => `forma ${f.id}`),
      ...r.formas.filter((f) => f.id.startsWith('cat:')).map((f) => `forma ${f.id} (id reservado do catálogo)`),
    ];
    if (repetidos.length) return err('TIPOLAJE_EXISTENTE', `Já existem na obra: ${repetidos.join(', ')}. Use \`substituir\` para trocar.`);
    return [];
  },
  aplicar(d, p) {
    const r = lerImport(p) as { ok: true; fichas: FichaVigota[]; enchimentos: Enchimento[]; formas: FormaLaje[] };
    d.tiposLaje ??= {};
    const fs = (d.tiposLaje.fichas ??= []), es = (d.tiposLaje.enchimentos ??= []), fms = (d.tiposLaje.formas ??= []);
    for (const f of r.formas) { const i = fms.findIndex((x) => x.id === f.id); if (i >= 0) fms[i] = copia(f); else fms.push(copia(f)); }
    for (const e of r.enchimentos) { const i = es.findIndex((x) => x.id === e.id); if (i >= 0) es[i] = copia(e); else es.push(copia(e)); }
    for (const f of r.fichas) { const i = fs.findIndex((x) => x.id === f.id); if (i >= 0) fs[i] = copia(f); else fs.push(copia(f)); }
    limpar(d);
    return `${r.fichas.length} ficha(s), ${r.enchimentos.length} enchimento(s) e ${r.formas.length} forma(s) importados.`;
  },
});

