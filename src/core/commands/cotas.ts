// Comandos das cotas permanentes de planta (L6): criar, editar, remover, travar, mover um elemento pela cota (com propagação
// pelas cotas travadas) e editar o valor de um trecho. Criar, editar, remover e travar só mudam `b.cotas` (não alteram o
// cálculo); mover e editar o valor movem elementos e usam os comandos de mover existentes num `lote` (um passo de desfazer).
import { current, type Draft } from 'immer';
import type { BuildingModel, CotaPlanta, ElemCota, RefCota } from '../building/types';
import { chaveElem, comandosDoMovimento, existeElem, nomeElem, planejarMovimento, planejarValor, resolverRef, rotuloCota, type ErroMovimento } from '../building/cotas';
import type { Diagnostico } from '../building/verify';
import { aplicarComando, comando, registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const TIPOS = ['pilar', 'viga', 'parede', 'abertura', 'fundacao', 'eixo'] as const;
const PARTES = ['faceA', 'faceB', 'eixo', 'centro', 'extremoI', 'extremoJ'] as const;
const elemSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['tipo', 'id'], properties: { tipo: { type: 'string', enum: TIPOS }, id: { type: 'string' }, sub: { type: 'string', description: 'abertura: id da parede' } } };
const refSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['parte'], properties: {
  elem: { ...elemSchema, description: 'elemento a que a referência se liga (ausente = ponto livre em `fixo`)' },
  parte: { type: 'string', enum: PARTES, description: 'faceA/faceB = faces de menor/maior coordenada na direção da cota; eixo e centro; extremoI/extremoJ = pontas do eixo da viga/parede ou bordas da abertura' },
  fixo: ponto,
} };
const linhaSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['angulo', 'offset'], properties: {
  angulo: { type: 'number', description: 'direção da medida em graus (0 = x, 90 = y)' },
  offset: { type: 'number', description: 'posição da linha de cota (m) na normal n = (−sen a, cos a): coordenada absoluta' },
} };

type RefIn = { elem?: ElemCota; parte: RefCota['parte']; fixo?: [number, number] };
const refs: JsonSchema = { type: 'array', items: refSchema, minItems: 2, maxItems: 40 };

function errosRefs(b: BuildingModel, grupo: string, lista: RefIn[], angulo: number): Diagnostico[] {
  for (const [i, r] of lista.entries()) {
    if (!r.elem && !r.fixo) return err('COTA_REFERENCIA', `A referência ${i + 1} não tem elemento nem ponto.`);
    if (r.elem && !existeElem(b, r.elem)) return err('COTA_REFERENCIA', `A referência ${i + 1}: ${r.elem.tipo} ${r.elem.id} não existe.`, [r.elem.id]);
    if (r.elem?.tipo === 'abertura' && !r.elem.sub) return err('COTA_REFERENCIA', `A referência ${i + 1}: abertura exige a parede em \`sub\`.`);
    if (r.elem && !resolverRef(b, grupo, r as RefCota, angulo)) return err('COTA_REFERENCIA', `A referência ${i + 1}: ${nomeElem(b, r.elem)} não tem a parte ${r.parte} (fundação: faces só com dimensões impostas).`, [r.elem.id]);
  }
  return [];
}
const limpa = (r: RefIn): RefCota => ({ parte: r.parte, ...(r.elem ? { elem: { tipo: r.elem.tipo, id: r.elem.id, ...(r.elem.sub ? { sub: r.elem.sub } : {}) } } : {}), ...(r.fixo ? { fixo: [r.fixo[0], r.fixo[1]] as [number, number] } : {}) });

registrar<{ grupo: string; refs: RefIn[]; linha: { angulo: number; offset: number }; estilo?: 'serie' | 'baseline'; travada?: boolean }>({
  nome: 'cota.criar',
  descricao: 'Cria uma cota permanente de planta (L6): série de referências associativas (pilar, viga, parede, abertura, fundação, eixo ou ponto livre) medidas na direção `linha.angulo`, com a linha de cota em `linha.offset`. As referências seguem os elementos; se um elemento for removido a referência vira ponto livre no último valor, com aviso. `estilo` "serie" (padrão: trechos consecutivos) ou "baseline" (a partir da primeira). Só apresentação: não altera o cálculo.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'refs', 'linha'], properties: {
    grupo: { type: 'string', description: 'grupo de pavimentos da planta em que a cota aparece' }, refs, linha: linhaSchema,
    estilo: { type: 'string', enum: ['serie', 'baseline'], default: 'serie' }, travada: { type: 'boolean' },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    return errosRefs(b, p.grupo, p.refs, p.linha.angulo);
  },
  aplicar(d, p) {
    const id = novoId(d, 'ct');
    (d.cotas ??= []).push({ id, grupo: p.grupo, estilo: p.estilo ?? 'serie', refs: p.refs.map(limpa), linha: { angulo: p.linha.angulo, offset: p.linha.offset }, ...(p.travada ? { travada: true } : {}) });
    return `Cota ${rotuloCota(d as BuildingModel, d.cotas.at(-1) as CotaPlanta)} criada.`;
  },
});

registrar<{ id: string; refs?: RefIn[]; linha?: { angulo: number; offset: number }; estilo?: 'serie' | 'baseline' }>({
  nome: 'cota.editar',
  descricao: 'Altera as referências, a linha (direção e posição) ou o estilo de uma cota permanente de planta (L6). Só apresentação: não altera o cálculo.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, refs, linha: linhaSchema, estilo: { type: 'string', enum: ['serie', 'baseline'] } } },
  validar(b, p) {
    const c = b.cotas?.find((x) => x.id === p.id);
    if (!c) return err('COTA_INEXISTENTE', `Cota ${p.id} não existe.`);
    return p.refs ? errosRefs(b, c.grupo, p.refs, p.linha?.angulo ?? c.linha.angulo) : [];
  },
  aplicar(d, p) {
    const c = d.cotas!.find((x) => x.id === p.id)!;
    if (p.refs) c.refs = p.refs.map(limpa);
    if (p.linha) c.linha = { angulo: p.linha.angulo, offset: p.linha.offset };
    if (p.estilo) c.estilo = p.estilo;
    return `Cota ${rotuloCota(d as BuildingModel, c as CotaPlanta)} alterada.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'cota.remover',
  descricao: 'Remove cotas permanentes de planta (L6). Só apresentação: não altera o cálculo.',
  risco: 'destrutivo',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.cotas?.some((c) => c.id === id));
    return f.length ? err('COTA_INEXISTENTE', `Cota(s) inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    d.cotas = d.cotas!.filter((c) => !p.ids.includes(c.id));
    if (!d.cotas.length) delete d.cotas;
    return `${p.ids.length} cota(s) removida(s).`;
  },
});

registrar<{ id: string; travada: boolean }>({
  nome: 'cota.travar',
  descricao: 'Trava ou destrava uma cota permanente de planta (L6). Cota travada mantém a distância: mover um elemento ligado a ela arrasta os outros da cadeia de cotas travadas, num só passo de desfazer; conflito ou ciclo recusa o movimento, dizendo qual cota impede. O valor de uma cota travada não é editado. Só apresentação: não altera o cálculo.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'travada'], properties: { id: { type: 'string' }, travada: { type: 'boolean' } } },
  validar: (b, p) => (b.cotas?.some((c) => c.id === p.id) ? [] : err('COTA_INEXISTENTE', `Cota ${p.id} não existe.`)),
  aplicar(d, p) {
    const c = d.cotas!.find((x) => x.id === p.id)!;
    if (p.travada) c.travada = true; else delete c.travada;
    return `Cota ${rotuloCota(d as BuildingModel, c as CotaPlanta)} ${p.travada ? 'travada' : 'destravada'}.`;
  },
});

// ---- mover pela cota ----

const diag = (e: ErroMovimento): Diagnostico[] => err(e.codigo, e.mensagem, e.cota ? [e.cota] : []);
const cmTxt = (v: number) => String(Math.round(v * 1000) / 10).replace('.', ',');

/** Comandos do movimento do elemento (com a propagação); erro como diagnóstico. */
function planoDe(b: BuildingModel, alvo: ElemCota, delta: [number, number], fixos: ElemCota[], junto: ElemCota[] = []) {
  const pl = planejarMovimento(b, alvo, delta, fixos, junto);
  if (pl.erro) return { erro: diag(pl.erro) };
  if (!pl.movimentos.length) return { erro: err('DESLOCAMENTO_NULO', 'O deslocamento é nulo.') };
  const cs = comandosDoMovimento(b, pl.movimentos);
  if (cs.erro) return { erro: diag(cs.erro) };
  const r = aplicarComando(b, 'lote', { comandos: cs.comandos });
  if (!r.ok) return { erro: r.erros };
  return { comandos: cs.comandos, movimentos: pl.movimentos };
}

function executar(d: Draft<BuildingModel>, b: BuildingModel, alvo: ElemCota, delta: [number, number], fixos: ElemCota[], junto: ElemCota[] = []): string {
  const pl = planoDe(b, alvo, delta, fixos, junto);
  comando('lote')!.aplicar(d, { comandos: pl.comandos });
  const outros = pl.movimentos!.filter((m) => chaveElem(m.elem) !== chaveElem(alvo));
  const dist = Math.hypot(delta[0], delta[1]);
  return `${nomeElem(b, alvo)} movido ${cmTxt(dist)} cm${outros.length ? `; acompanham por cota travada: ${outros.map((m) => nomeElem(b, m.elem)).join(', ')}` : ''}.`;
}

registrar<{ alvo: ElemCota; junto?: ElemCota[]; delta: [number, number]; fixos?: ElemCota[] }>({
  nome: 'cota.mover',
  descricao: 'Move um elemento (pilar, viga, parede, abertura, fundação ou eixo) de `delta` (m) pelos comandos de mover existentes, num só passo de desfazer, propagando o movimento pela cadeia de cotas travadas (L6): o vizinho ligado por cota travada anda a componente do deslocamento na direção da cota. `junto` = outros elementos da seleção que andam o mesmo `delta`; `fixos` = elementos de referência que não podem andar. Conflito, ciclo ou ponto livre numa cota travada recusam o movimento e dizem qual cota impede. Usada pelas cotas temporárias.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['alvo', 'delta'], properties: { alvo: elemSchema, junto: { type: 'array', items: elemSchema }, delta: ponto, fixos: { type: 'array', items: elemSchema } } },
  validar(b, p) { return planoDe(b, p.alvo, p.delta, p.fixos ?? [], p.junto ?? []).erro ?? []; },
  aplicar(d, p) { return executar(d, current(d) as BuildingModel, p.alvo, p.delta, p.fixos ?? [], p.junto ?? []); },
});

registrar<{ id: string; indice: number; valor: number; mover?: 'inicio' | 'fim' }>({
  nome: 'cota.valor',
  descricao: 'Edita o valor (m) de um trecho de uma cota permanente de planta (L6): o elemento da referência final do trecho (`mover` "fim", padrão) ou da inicial ("inicio") anda e a outra fica parada. O movimento propaga pelas cotas travadas; a própria cota travada não tem o valor editado. Um passo de desfazer.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'indice', 'valor'], properties: {
    id: { type: 'string' }, indice: { type: 'integer', minimum: 0, description: 'trecho (0 = entre a 1ª e a 2ª referência)' },
    valor: { type: 'number', minimum: 0, description: 'novo valor do trecho (m)' }, mover: { type: 'string', enum: ['inicio', 'fim'], default: 'fim' },
  } },
  validar(b, p) {
    const c = b.cotas?.find((x) => x.id === p.id);
    if (!c) return err('COTA_INEXISTENTE', `Cota ${p.id} não existe.`);
    const v = planejarValor(b, c, p.indice, p.valor, p.mover);
    if (v.erro) return diag(v.erro);
    return planoDe(b, v.alvo, v.delta, v.fixos).erro ?? [];
  },
  aplicar(d, p) {
    const b = current(d) as BuildingModel, c = b.cotas!.find((x) => x.id === p.id)!;
    const v = planejarValor(b, c, p.indice, p.valor, p.mover);
    return executar(d, b, v.alvo, v.delta, v.fixos);
  },
});
