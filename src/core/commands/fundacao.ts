// Fundações do edifício (frente FU, fatias FU1 a FU3): elementos sob pilares (sapata, bloco sobre estacas, tubulão;
// centrados, de divisa, de canto ou em posição livre; sapata associada e bloco com vários pilares), unir, igualar e
// impor dimensões, limites poligonais, vigas de equilíbrio e de travamento, dados do terreno (σadm, estacas),
// sondagens, parâmetros do cálculo e níveis calculados.
// Todos sem ferramenta própria no MCP (`mcp: false`) e fora da revisão de cálculo da estrutura (`calculo: 'fundacao'`).
import { current, type Draft } from 'immer';
import { FUNDACAO_VAZIA, type BuildingModel, type ElementoFundacao, type EstacaTerreno, type FundacaoEdificio, type ImpostasFundacao, type LimiteFundacao, type PosicaoFundacao, type TipoFundacao, type VigaFundacao } from '../building/types';
import { nomeVigaFundacao, pontaVF } from '../building/vigasFundacao';
import type { Diagnostico } from '../building/verify';
import { ladoDoAjuste, nomeFundacao } from '../building/fundacao';
import type { FoundationParams, SoilClass } from '../piles';
import { pilaresNaBase, temBaseElastica } from '../building/baseElastica';
import { planejarFundacoes, resumoPlano, type PassoGerar } from '../building/fundacaoGerar';
import { aplicarComando, comando, registrar } from './registry';
import { comDefaults, type JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const lado: JsonSchema = { type: 'array', items: { type: 'integer', minimum: -1, maximum: 1 }, minItems: 2, maxItems: 2, description: 'lado da divisa nos eixos do elemento [x, y]: −1, 0 ou 1 (divisa: um não nulo; canto: os dois)' };
const sondagemSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['modo'], properties: {
  modo: { type: 'string', enum: ['furo', 'media'] }, ids: { type: 'array', items: { type: 'integer', minimum: 1 }, description: 'furo: o primeiro; média: os furos (vazio = todos)' },
} };
const TIPOS = ['sapata', 'bloco', 'tubulao'] as const;
const POSICOES = ['centrada', 'divisa', 'canto', 'livre'] as const;
const fund = (d: Draft<BuildingModel>): Draft<FundacaoEdificio> => (d.fundacao ??= FUNDACAO_VAZIA());

// ---------------- validação comum dos elementos ----------------

interface ElementoIn { pilares?: string[]; tipo?: TipoFundacao; posicao?: PosicaoFundacao; lado?: [number, number]; estaca?: { id: string; n?: number }; sondagem?: { modo: 'furo' | 'media'; ids?: number[] }; simples?: boolean; alturaConstante?: boolean }

function validarElemento(b: BuildingModel, e: Required<Pick<ElementoIn, 'pilares' | 'tipo' | 'posicao'>> & ElementoIn, proprio?: string): Diagnostico[] {
  if (!e.pilares.length) return err('SEM_PILAR', 'Informe ao menos um pilar (`pilar` ou `pilares`).');
  if (new Set(e.pilares).size !== e.pilares.length) return err('PILAR_REPETIDO', 'Pilar repetido na lista.');
  for (const id of e.pilares) {
    const p = b.pilares.find((x) => x.id === id);
    if (!p) return err('PILAR_INEXISTENTE', `Pilar ${id} não existe.`);
    if (p.nasce !== 'fundacao') return err('PILAR_NAO_NASCE_FUNDACAO', `${p.nome} não nasce na fundação.`, [p.id]);
    const naBase = pilaresNaBase(b).find((x) => x.pilar === p.id);
    if (naBase) return err('PILAR_NA_BASE_ELASTICA', `${p.nome} está sobre ${naBase.tipo === 'radier' ? 'o radier' : b.fundacao?.corridas?.some((x) => x.id === naBase.ref) ? 'a sapata corrida' : 'a viga sobre base elástica'} ${(naBase.tipo === 'radier' ? b.fundacao?.radiers : [...(b.fundacao?.vigasElasticas ?? []), ...(b.fundacao?.corridas ?? [])])?.find((x) => x.id === naBase.ref)?.nome ?? naBase.ref} (sem elemento próprio).`, [p.id, naBase.ref]);
    const outro = b.fundacao?.elementos.find((x) => x.id !== proprio && x.pilares.includes(p.id));
    if (outro) return err('PILAR_COM_FUNDACAO', `${p.nome} já tem o elemento ${outro.nome}.`, [p.id, outro.id]);
  }
  if (e.tipo === 'tubulao' && e.posicao !== 'centrada') return err('TUBULAO_CENTRADO', 'Tubulão só centrado sob o pilar (divisa por viga de equilíbrio).');
  if (e.pilares.length > 1) {
    if (e.tipo === 'tubulao') return err('GRUPO_TUBULAO', 'Tubulão só sob um pilar.');
    if (e.posicao === 'divisa' || e.posicao === 'canto') return err('GRUPO_POSICAO', 'Elemento de vários pilares: posição centrada (na resultante dos pilares) ou livre (centro informado); a divisa vem dos limites poligonais.');
  }
  if ((e.simples || e.alturaConstante) && e.tipo !== 'sapata') return err('SO_SAPATA', 'Concreto simples e altura constante valem só para sapatas.');
  if (e.posicao === 'divisa' || e.posicao === 'canto') {
    const l = e.lado ?? [0, 0], nz = l.filter((v) => v !== 0).length;
    if (e.posicao === 'divisa' && nz !== 1) return err('LADO_DIVISA', 'Divisa: informe o lado da divisa com um só valor não nulo em `lado` (ou use um pilar com o ponto fixo numa face).');
    if (e.posicao === 'canto' && nz !== 2) return err('LADO_CANTO', 'Canto: informe os dois lados em `lado` (ou use um pilar com o ponto fixo num canto).');
  }
  if (e.tipo === 'bloco') {
    if (!e.estaca) return err('SEM_ESTACA', 'Bloco: escolha o tipo de estaca do terreno (`estaca.id`).');
    if (!b.fundacao?.terreno.estacas.some((x) => x.id === e.estaca!.id)) return err('ESTACA_INEXISTENTE', `Estaca ${e.estaca.id} não existe no terreno.`);
  }
  const furos = (e.sondagem?.ids ?? []).filter((id) => !b.fundacao?.sondagens.some((s) => s.id === id));
  if (furos.length) return err('SONDAGEM_INEXISTENTE', `Furo(s) ${furos.join(', ')} não existe(m).`);
  if (e.sondagem?.modo === 'furo' && !e.sondagem.ids?.length) return err('SONDAGEM_FURO', 'Modo furo: informe o furo em `ids`.');
  return [];
}

/** Lado padrão pelo ponto fixo do pilar (face ou canto inserido na divisa). */
function ladoPadrao(b: BuildingModel, pilar: string, posicao: PosicaoFundacao, l?: [number, number]): [number, number] | undefined {
  if (posicao !== 'divisa' && posicao !== 'canto') return undefined;
  if (l) return l;
  const p = b.pilares.find((x) => x.id === pilar);
  if (!p) return undefined;
  const a = ladoDoAjuste(p), nz = a.filter((v) => v !== 0).length;
  return (posicao === 'divisa' && nz === 1) || (posicao === 'canto' && nz === 2) ? a : undefined;
}

// ---------------- elementos ----------------

const impostasSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['A', 'B'], description: 'dimensões e armadura impostas (só verificadas): sapata A × B × h (h0), armadura por direção (φ mm, espaçamento s m ou n barras); bloco lx × ly × h e tirantes (φ, n); tubulão base A = B = Db e fuste Df', properties: {
  A: { type: 'number', minimum: 0.3, maximum: 14 }, B: { type: 'number', minimum: 0.3, maximum: 14 }, h: { type: 'number', minimum: 0.15, maximum: 3 }, h0: { type: 'number', minimum: 0.1, maximum: 3 }, Df: { type: 'number', minimum: 0.4, maximum: 3 },
  armadura: { type: 'object', additionalProperties: false, properties: {
    x: { type: 'object', additionalProperties: false, required: ['phi'], properties: { phi: { type: 'number', minimum: 5, maximum: 32 }, s: { type: 'number', minimum: 0.05, maximum: 0.4 }, n: { type: 'integer', minimum: 2, maximum: 80 } } },
    y: { type: 'object', additionalProperties: false, required: ['phi'], properties: { phi: { type: 'number', minimum: 5, maximum: 32 }, s: { type: 'number', minimum: 0.05, maximum: 0.4 }, n: { type: 'integer', minimum: 2, maximum: 80 } } },
  } },
} };
const copiarImpostas = (i: ImpostasFundacao): ImpostasFundacao => ({
  A: i.A, B: i.B, ...(i.h !== undefined ? { h: i.h } : {}), ...(i.h0 !== undefined ? { h0: i.h0 } : {}), ...(i.Df !== undefined ? { Df: i.Df } : {}),
  ...(i.armadura ? { armadura: { ...(i.armadura.x ? { x: { ...i.armadura.x } } : {}), ...(i.armadura.y ? { y: { ...i.armadura.y } } : {}) } } : {}),
});
const listaPilares = (p: { pilar?: string; pilares?: string[] }) => p.pilares ?? (p.pilar ? [p.pilar] : []);

type CriarIn = { pilar?: string; pilares?: string[]; tipo: TipoFundacao; posicao: PosicaoFundacao; lado?: [number, number]; angulo?: number; x?: number; y?: number; cota?: number; sigmaAdm?: number; sondagem?: ElementoFundacao['sondagem']; estaca?: { id: string; n?: number }; nome?: string; simples?: boolean; alturaConstante?: boolean; impostas?: ImpostasFundacao };

registrar<CriarIn>({
  nome: 'fundacao.criar',
  descricao: 'Lança um elemento de fundação sob um ou mais pilares que nascem na fundação: sapata (isolada, ou associada com `pilares` ≥ 2), bloco sobre estacas (tipo de estaca do terreno; com vários pilares as estacas saem da resultante e as bielas e os tirantes de cada pilar) ou tubulão (um pilar, centrado). Posição centrada (com vários pilares, na resultante da combinação de maior carga), de divisa (`lado` [x, y] com um valor ±1: a face do pilar desse lado fica na borda), de canto (os dois) ou livre (centro em x, y; padrão: média dos pilares); divisa e canto só com um pilar (a divisa de associada vem dos limites). Ângulo padrão: o do primeiro pilar. `simples`: sapata de concreto simples; `alturaConstante`: sapata de altura constante (a única aparada por limites). Cota de assentamento, σadm, sondagem e dimensões impostas próprios opcionais. Sem tipo de estaca no bloco, usa o único do terreno.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['tipo'], properties: {
    pilar: { type: 'string' }, pilares: ids, tipo: { type: 'string', enum: TIPOS }, posicao: { type: 'string', enum: POSICOES, default: 'centrada' }, lado,
    angulo: { type: 'number', description: 'graus; padrão: o do primeiro pilar' }, x: { type: 'number' }, y: { type: 'number' },
    cota: { type: 'number', description: 'cota de assentamento (m); padrão: a de fundação da obra' }, sigmaAdm: { type: 'number', exclusiveMinimum: 0, description: 'kN/m²' },
    sondagem: sondagemSchema, estaca: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, n: { type: 'integer', minimum: 1, maximum: 6 } } },
    nome: { type: 'string', minLength: 1 }, simples: { type: 'boolean' }, alturaConstante: { type: 'boolean' }, impostas: impostasSchema,
  } },
  validar(b, p) {
    const pilares = listaPilares(p);
    const est = p.estaca ?? (p.tipo === 'bloco' && b.fundacao?.terreno.estacas.length === 1 ? { id: b.fundacao.terreno.estacas[0].id } : undefined);
    return validarElemento(b, { ...p, pilares, estaca: est, lado: ladoPadrao(b, pilares[0], p.posicao, p.lado) });
  },
  aplicar(d, p) {
    const b = d as BuildingModel, pilares = listaPilares(p), pils = pilares.map((id) => b.pilares.find((x) => x.id === id)!);
    const f = fund(d);
    const nome = p.nome?.trim() || nomeFundacao(b, p.tipo);
    const l = ladoPadrao(b, pilares[0], p.posicao, p.lado);
    const est = p.estaca ?? (p.tipo === 'bloco' ? { id: f.terreno.estacas[0].id } : undefined);
    const mx = pils.reduce((a, q) => a + q.x, 0) / pils.length, my = pils.reduce((a, q) => a + q.y, 0) / pils.length;
    const e: ElementoFundacao = {
      id: novoId(d, 'f'), nome, tipo: p.tipo, pilares: [...pilares], x: p.x ?? +mx.toFixed(6), y: p.y ?? +my.toFixed(6), angulo: p.angulo ?? pils[0].angulo, posicao: p.posicao,
      ...(l ? { lado: [...l] as [number, number] } : {}), ...(p.cota !== undefined ? { cota: p.cota } : {}), ...(p.sigmaAdm !== undefined ? { sigmaAdm: p.sigmaAdm } : {}),
      ...(p.sondagem ? { sondagem: { modo: p.sondagem.modo, ...(p.sondagem.ids ? { ids: [...p.sondagem.ids] } : {}) } } : {}), ...(est ? { estaca: { ...est } } : {}),
      ...(p.simples ? { simples: true } : {}), ...(p.alturaConstante ? { alturaConstante: true } : {}), ...(p.impostas ? { impostas: copiarImpostas(p.impostas) } : {}),
    };
    f.elementos.push(e);
    return `${nome} (${p.tipo}${pilares.length > 1 ? `, ${pilares.length} pilares` : ''}) lançado sob ${pils.map((q) => q.nome).join(', ')}.`;
  },
});

type EditarIn = Omit<Partial<CriarIn>, 'pilar'> & { id: string; limpar?: ('cota' | 'sigmaAdm' | 'sondagem' | 'impostas')[] };

registrar<EditarIn>({
  nome: 'fundacao.editar',
  descricao: 'Altera um elemento de fundação: nome, tipo, pilares apoiados (`pilares` substitui a lista; com vários, sapata associada ou bloco com vários pilares), posição (centrada, divisa, canto, livre) e lado, ângulo, centro (livre), cota de assentamento, σadm próprio, sondagem, estaca, sapata de concreto simples (`simples`), altura constante (`alturaConstante`) e dimensões e armadura impostas (só verificadas). `limpar` volta ao padrão: cota, sigmaAdm, sondagem, impostas.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, tipo: { type: 'string', enum: TIPOS }, pilares: ids, posicao: { type: 'string', enum: POSICOES }, lado,
    angulo: { type: 'number' }, x: { type: 'number' }, y: { type: 'number' }, cota: { type: 'number' }, sigmaAdm: { type: 'number', exclusiveMinimum: 0 },
    sondagem: sondagemSchema, estaca: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, n: { type: 'integer', minimum: 1, maximum: 6 } } },
    impostas: impostasSchema, simples: { type: 'boolean' }, alturaConstante: { type: 'boolean' },
    limpar: { type: 'array', items: { type: 'string', enum: ['cota', 'sigmaAdm', 'sondagem', 'impostas'] } },
  } },
  validar(b, p) {
    const e = b.fundacao?.elementos.find((x) => x.id === p.id);
    if (!e) return err('FUNDACAO_INEXISTENTE', `Elemento de fundação ${p.id} não existe.`);
    const tipo = p.tipo ?? e.tipo, posicao = p.posicao ?? e.posicao, pilares = p.pilares ?? e.pilares;
    return validarElemento(b, {
      pilares, tipo, posicao, lado: ladoPadrao(b, pilares[0], posicao, p.lado ?? (p.posicao ? undefined : e.lado)), estaca: p.estaca ?? e.estaca, sondagem: p.sondagem ?? e.sondagem,
      simples: p.simples ?? e.simples, alturaConstante: p.alturaConstante ?? e.alturaConstante,
    }, e.id);
  },
  aplicar(d, p) {
    const e = d.fundacao!.elementos.find((x) => x.id === p.id)!;
    for (const k of ['nome', 'tipo', 'posicao', 'angulo', 'x', 'y', 'cota', 'sigmaAdm'] as const) if (p[k] !== undefined) (e as Record<string, unknown>)[k] = k === 'nome' ? String(p[k]).trim() : p[k];
    if (p.pilares) { e.pilares = [...p.pilares]; if (p.pilares.length > 1 && (e.posicao === 'divisa' || e.posicao === 'canto')) e.posicao = 'centrada'; }
    if (p.sondagem) e.sondagem = { modo: p.sondagem.modo, ...(p.sondagem.ids ? { ids: [...p.sondagem.ids] } : {}) };
    if (p.estaca) e.estaca = { ...p.estaca };
    if (p.impostas) e.impostas = copiarImpostas(p.impostas);
    if (p.simples !== undefined) { if (p.simples) e.simples = true; else delete e.simples; }
    if (p.alturaConstante !== undefined) { if (p.alturaConstante) e.alturaConstante = true; else delete e.alturaConstante; }
    if (p.tipo === 'bloco' && !e.estaca) e.estaca = { id: d.fundacao!.terreno.estacas[0].id };
    if (e.tipo !== 'bloco') delete e.estaca;
    if (e.tipo !== 'sapata') { delete e.simples; delete e.alturaConstante; }
    const l = ladoPadrao(d as BuildingModel, e.pilares[0], e.posicao, p.lado ?? (p.posicao ? undefined : (e.lado as [number, number] | undefined)));
    if (l) e.lado = [...l] as [number, number]; else delete e.lado;
    for (const k of p.limpar ?? []) delete e[k];
    return `${e.nome} alterado.`;
  },
});

registrar<{ ids: string[]; dx: number; dy: number }>({
  nome: 'fundacao.mover',
  descricao: 'Move elementos de fundação (dx, dy em m). O elemento passa a ter posição livre (centro informado); o pilar fica excêntrico.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' } } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.fundacao?.elementos.some((x) => x.id === id));
    if (f.length) return err('FUNDACAO_INEXISTENTE', `Elemento(s) de fundação inexistente(s): ${f.join(', ')}.`);
    const t = b.fundacao!.elementos.filter((x) => p.ids.includes(x.id) && x.tipo === 'tubulao');
    return t.length && (p.dx || p.dy) ? err('TUBULAO_CENTRADO', `Tubulão só centrado sob o pilar (${t.map((x) => x.nome).join(', ')}).`, t.map((x) => x.id)) : [];
  },
  aplicar(d, p) {
    for (const e of d.fundacao!.elementos) if (p.ids.includes(e.id)) { e.x += p.dx; e.y += p.dy; e.posicao = 'livre'; delete e.lado; }
    return `${p.ids.length} elemento(s) de fundação movido(s).`;
  },
});

registrar<{ ids: string[]; angulo?: number; pontos?: [number, number][]; doPilar?: boolean }>({
  nome: 'fundacao.girar',
  descricao: 'Gira elementos de fundação em torno do centro: para o `angulo` (graus), para a direção de dois `pontos` [[x1, y1], [x2, y2]] ou para o ângulo do pilar apoiado (`doPilar`; com vários pilares, o do primeiro).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: {
    ids, angulo: { type: 'number' }, pontos: { type: 'array', items: ponto, minItems: 2, maxItems: 2 }, doPilar: { type: 'boolean' },
  } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.fundacao?.elementos.some((x) => x.id === id));
    if (f.length) return err('FUNDACAO_INEXISTENTE', `Elemento(s) de fundação inexistente(s): ${f.join(', ')}.`);
    if ([p.angulo !== undefined, !!p.pontos, !!p.doPilar].filter(Boolean).length !== 1) return err('GIRO', 'Informe um só: angulo, pontos ou doPilar.');
    if (p.pontos && Math.hypot(p.pontos[1][0] - p.pontos[0][0], p.pontos[1][1] - p.pontos[0][1]) < 1e-9) return err('GIRO', 'Os dois pontos coincidem.');
    return [];
  },
  aplicar(d, p) {
    for (const e of d.fundacao!.elementos) {
      if (!p.ids.includes(e.id)) continue;
      const a = p.angulo ?? (p.pontos ? (Math.atan2(p.pontos[1][1] - p.pontos[0][1], p.pontos[1][0] - p.pontos[0][0]) * 180) / Math.PI : d.pilares.find((x) => x.id === e.pilares[0])?.angulo ?? e.angulo);
      e.angulo = +a.toFixed(6);
    }
    return `${p.ids.length} elemento(s) de fundação girado(s).`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'fundacao.remover',
  descricao: 'Remove elementos de fundação.',
  risco: 'destrutivo',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.fundacao?.elementos.some((x) => x.id === id));
    return f.length ? err('FUNDACAO_INEXISTENTE', `Elemento(s) de fundação inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const s = new Set(p.ids), f = d.fundacao!;
    f.elementos = f.elementos.filter((e) => !s.has(e.id));
    for (const e of f.elementos) if (e.igualA && s.has(e.igualA)) delete e.igualA;
    // vigas de fundação com ponta no elemento removido saem junto
    if (f.vigas?.some((v) => s.has(v.ini) || s.has(v.fim))) { f.vigas = f.vigas.filter((v) => !s.has(v.ini) && !s.has(v.fim)); if (!f.vigas.length) delete f.vigas; }
    // cintas das sapatas corridas (FU8a) com a ponta interna no elemento removido saem junto
    for (const c of f.corridas ?? []) if (c.cintas?.some((x) => s.has(x.fim))) { c.cintas = c.cintas.filter((x) => !s.has(x.fim)); if (!c.cintas.length) delete c.cintas; }
    return `${p.ids.length} elemento(s) de fundação removido(s).`;
  },
});

// ---------------- unir, igualar, impor, eliminar sobreposições (FU3) ----------------

/** Elementos pelo id, na ordem dada; erro se faltar algum. */
function elementosPorId(b: BuildingModel, idsEl: string[]) {
  const els = idsEl.map((id) => b.fundacao?.elementos.find((x) => x.id === id));
  const falta = idsEl.filter((_, i) => !els[i]);
  return { els: els as ElementoFundacao[], falta };
}

/** Une sapatas num só elemento (o primeiro): pilares somados, ponto de inserção na média dos pilares, ângulo do primeiro pilar. */
function unirSapatas(b: BuildingModel, idsEl: string[]): Diagnostico[] {
  const { els, falta } = elementosPorId(b, idsEl);
  if (falta.length) return err('FUNDACAO_INEXISTENTE', `Elemento(s) de fundação inexistente(s): ${falta.join(', ')}.`);
  if (new Set(idsEl).size !== idsEl.length || idsEl.length < 2) return err('UNIR_MINIMO', 'Informe ao menos duas sapatas distintas.');
  const naoSapata = els.filter((e) => e.tipo !== 'sapata');
  if (naoSapata.length) return err('UNIR_SO_SAPATAS', `Unir vale só para sapatas (${naoSapata.map((e) => e.nome).join(', ')} não é); o bloco com vários pilares nasce de fundacao.criar com \`pilares\`.`, naoSapata.map((e) => e.id));
  const cotas = new Set(els.map((e) => e.cota ?? 'padrao'));
  if (cotas.size > 1) return err('UNIR_COTAS', 'Sapatas de cotas de assentamento diferentes não podem ser unidas.', idsEl);
  return [];
}

function aplicarUniao(d: Draft<BuildingModel>, idsEl: string[]): string {
  const f = d.fundacao!;
  const els = idsEl.map((id) => f.elementos.find((x) => x.id === id)!);
  const base = els[0];
  const pilares = [...new Set(els.flatMap((e) => e.pilares))];
  const pils = pilares.map((id) => d.pilares.find((x) => x.id === id)!);
  const todosSimples = els.every((e) => e.simples);
  const sai = new Set(idsEl.slice(1));
  base.pilares = pilares;
  base.x = +(pils.reduce((a, q) => a + q.x, 0) / pils.length).toFixed(6);
  base.y = +(pils.reduce((a, q) => a + q.y, 0) / pils.length).toFixed(6);
  base.angulo = pils[0].angulo;
  base.posicao = 'centrada';
  delete base.lado; delete base.impostas; delete base.igualA;
  if (todosSimples) base.simples = true; else delete base.simples;
  f.elementos = f.elementos.filter((e) => !sai.has(e.id));
  for (const e of f.elementos) if (e.igualA && sai.has(e.igualA)) e.igualA = base.id;
  // vigas das pontas removidas passam ao elemento unido; as que ligam o elemento a ele mesmo saem
  if (f.vigas) {
    for (const v of f.vigas) { if (sai.has(v.ini)) v.ini = base.id; if (sai.has(v.fim)) v.fim = base.id; }
    const elemDe = (id: string) => f.elementos.find((e) => e.id === id || e.pilares.includes(id))?.id ?? id;
    f.vigas = f.vigas.filter((v) => elemDe(v.ini) !== elemDe(v.fim));
    if (!f.vigas.length) delete f.vigas;
  }
  for (const c of f.corridas ?? []) for (const x of c.cintas ?? []) if (sai.has(x.fim)) x.fim = base.id;
  return `${base.nome} (${pils.map((q) => q.nome).join(' + ')})`;
}

registrar<{ ids: string[] }>({
  nome: 'fundacao.unir',
  descricao: 'Une sapatas numa só (sapata associada): a primeira da lista fica, com os pilares de todas, ponto de inserção na média dos pilares e ângulo do primeiro pilar; as dimensões impostas se perdem. Só sapatas, da mesma cota de assentamento (blocos não se unem). As vigas de fundação das pontas removidas passam ao elemento unido.',
  risco: 'destrutivo',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 2 } } },
  validar: (b, p) => unirSapatas(b, p.ids),
  aplicar: (d, p) => `Sapatas unidas: ${aplicarUniao(d, p.ids)}.`,
});

registrar<{ grupos: string[][] }>({
  nome: 'fundacao.eliminarSobreposicoes',
  descricao: 'Elimina sobreposições unindo as sapatas de cada grupo de elementos sobrepostos (sapata associada); os grupos vêm do aviso FUND_SOBREPOSTA do cálculo (`gruposSobrepostos`). Cada grupo vale como `fundacao.unir`; blocos e tubulões sobrepostos não se unem (o comando recusa o grupo).',
  risco: 'destrutivo',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['grupos'], properties: { grupos: { type: 'array', minItems: 1, items: { type: 'array', items: { type: 'string' }, minItems: 2 } } } },
  validar(b, p) {
    const vistos = new Set<string>();
    for (const g of p.grupos) {
      const e = unirSapatas(b, g);
      if (e.length) return e;
      for (const id of g) { if (vistos.has(id)) return err('UNIR_REPETIDO', `O elemento ${id} está em mais de um grupo.`); vistos.add(id); }
    }
    return [];
  },
  aplicar(d, p) {
    const r = p.grupos.map((g) => aplicarUniao(d, g));
    return `${r.length} sobreposição(ões) eliminada(s): ${r.join('; ')}.`;
  },
});

registrar<{ modelo: string; ids: string[] }>({
  nome: 'fundacao.igualar',
  descricao: 'Iguala elementos de fundação ao elemento `modelo`: copiam o tipo (sapata ou bloco; sapata simples e altura constante), a estaca e a geometria e a armadura calculadas do modelo, e passam a ser só verificados (ficam com erro se não atenderem). Mesmo número de pilares; o tubulão só se iguala a tubulão. As dimensões impostas anteriores se perdem.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['modelo', 'ids'], properties: { modelo: { type: 'string' }, ids } },
  validar(b, p) {
    const { els, falta } = elementosPorId(b, [p.modelo, ...p.ids]);
    if (falta.length) return err('FUNDACAO_INEXISTENTE', `Elemento(s) de fundação inexistente(s): ${falta.join(', ')}.`);
    const [m, ...alvos] = els;
    if (!alvos.some((e) => e.id !== m.id)) return err('SEM_VALOR', 'Informe elementos além do modelo.');
    for (const e of alvos) {
      if (e.id === m.id) continue;
      if (e.pilares.length !== m.pilares.length) return err('IGUALAR_PILARES', `${e.nome} tem ${e.pilares.length} pilar(es) e o modelo ${m.nome}, ${m.pilares.length}: não se igualam.`, [e.id, m.id]);
      if ((e.tipo === 'tubulao') !== (m.tipo === 'tubulao')) return err('IGUALAR_TUBULAO', 'Tubulão só se iguala a tubulão.', [e.id, m.id]);
    }
    return [];
  },
  aplicar(d, p) {
    const f = d.fundacao!;
    const m = f.elementos.find((x) => x.id === p.modelo)!;
    const raiz = m.igualA ?? m.id;
    let n = 0;
    for (const e of f.elementos) {
      if (!p.ids.includes(e.id) || e.id === m.id) continue;
      e.tipo = m.tipo;
      if (m.simples) e.simples = true; else delete e.simples;
      if (m.alturaConstante) e.alturaConstante = true; else delete e.alturaConstante;
      if (m.estaca) e.estaca = { ...m.estaca }; else delete e.estaca;
      delete e.impostas;
      e.igualA = raiz;
      n++;
    }
    // elementos que eram igualados a um dos alvos passam ao novo modelo
    for (const e of f.elementos) if (e.igualA && p.ids.includes(e.igualA) && e.igualA !== raiz) e.igualA = raiz;
    return `${n} elemento(s) de fundação igualado(s) a ${f.elementos.find((x) => x.id === raiz)!.nome}.`;
  },
});

registrar<{ ids: string[]; impostas?: ImpostasFundacao; limpar?: boolean }>({
  nome: 'fundacao.impor',
  descricao: 'Impõe dimensões e armadura a elementos de fundação (só verificados, não redimensionados): sapata A × B × h (h0) e barras por direção; bloco lx × ly × h e tirantes; tubulão base e fuste. `limpar: true` volta ao dimensionamento automático. Uso típico: "impor as calculadas" com os valores do resultado.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids, impostas: impostasSchema, limpar: { type: 'boolean' } } },
  validar(b, p) {
    const { falta } = elementosPorId(b, p.ids);
    if (falta.length) return err('FUNDACAO_INEXISTENTE', `Elemento(s) de fundação inexistente(s): ${falta.join(', ')}.`);
    return p.impostas || p.limpar ? [] : err('SEM_VALOR', 'Informe `impostas` ou `limpar`.');
  },
  aplicar(d, p) {
    for (const e of d.fundacao!.elementos) if (p.ids.includes(e.id)) {
      if (p.limpar) delete e.impostas;
      else if (p.impostas) { e.impostas = copiarImpostas(p.impostas); delete e.igualA; }
    }
    return p.limpar ? `Dimensões impostas removidas de ${p.ids.length} elemento(s).` : `Dimensões impostas em ${p.ids.length} elemento(s).`;
  },
});

// ---------------- geração automática (FU4) ----------------

/** Resolve as pontas das vigas planejadas (pilares) para o elemento que já os cobre no modelo intermediário. */
function resolverPasso(b: BuildingModel, passo: PassoGerar): Record<string, unknown> {
  if (passo.nome !== 'vigaFundacao.criar') return passo.params;
  const el = (id: unknown) => b.fundacao?.elementos.find((e) => e.pilares.includes(String(id)))?.id ?? String(id);
  return { ...passo.params, ini: el(passo.params.ini), fim: el(passo.params.fim) };
}

type GerarIn = { pilares?: string[]; tipo?: 'auto' | TipoFundacao; estaca?: string; distanciaVisao?: number; anguloVisao?: number; distanciaAssociada?: number; associadas?: boolean; vigasEquilibrio?: boolean; vigasTravamento?: boolean; camadasDivisa?: string[]; cargas?: { pilar: string; Nk: number }[] };

registrar<GerarIn>({
  nome: 'fundacao.gerar',
  descricao: 'Gera as fundações dos pilares que nascem na fundação e ainda não têm elemento (ou só dos `pilares` indicados), num passo só (um desfazer); tudo continua editável. Tipo: `tipo` (sapata, bloco, tubulao) ou "auto" (bloco se a σadm do terreno, informada ou pelo SPT, for menor que a opção gerarSigmaMin e houver estaca; senão sapata). Posição: o pilar "em frente" de cada face é o que tem o eixo desalinhado menos que a distância de visão D (opção gerarDistVisao, 3 m) e está dentro do cone de abertura A (gerarAnguloVisao, 30°); a face sem pilar em frente (ou com limite poligonal / camada de divisa a menos de gerarDistLimite) tem balanço nulo: elemento de divisa (uma face) ou de canto (duas). Pilares com bordas a menos de `distanciaAssociada` (gerarDistAssociada, 1 m, máximo 3 m), ou com elementos estimados sobrepostos (pelas `cargas`), viram sapata associada ou bloco com vários pilares (`associadas`). Vigas de equilíbrio (`vigasEquilibrio`) dos elementos de divisa e de canto até o pilar em frente mais próximo do lado oposto; vigas de travamento (`vigasTravamento`) dos blocos de 1 e 2 estacas, estimadas por `cargas` ([{ pilar, Nk }] característicos, da última análise) e pela capacidade informada da estaca. `camadasDivisa`: camadas das máscaras tratadas como divisa. Reaproveita fundacao.criar e vigaFundacao.criar.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, properties: {
    pilares: ids, tipo: { type: 'string', enum: ['auto', ...TIPOS], default: 'auto' }, estaca: { type: 'string', description: 'id da estaca do terreno para os blocos; padrão: a primeira' },
    distanciaVisao: { type: 'number', minimum: 0.5, maximum: 10, description: 'm; padrão: opção gerarDistVisao' }, anguloVisao: { type: 'number', minimum: 5, maximum: 180, description: 'graus; padrão: opção gerarAnguloVisao' },
    distanciaAssociada: { type: 'number', minimum: 0, maximum: 3, description: 'm; padrão: opção gerarDistAssociada' },
    associadas: { type: 'boolean', default: true }, vigasEquilibrio: { type: 'boolean', default: true }, vigasTravamento: { type: 'boolean', default: true },
    camadasDivisa: { type: 'array', items: { type: 'string' } },
    cargas: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pilar', 'Nk'], properties: { pilar: { type: 'string' }, Nk: { type: 'number', minimum: 0 } } } },
  } },
  validar(b, p) {
    const falta = (p.pilares ?? []).filter((id) => !b.pilares.some((x) => x.id === id));
    if (falta.length) return err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${falta.join(', ')}.`);
    const nao = (p.pilares ?? []).map((id) => b.pilares.find((x) => x.id === id)!).filter((q) => q.nasce !== 'fundacao');
    if (nao.length) return err('PILAR_NAO_NASCE_FUNDACAO', `${nao.map((q) => q.nome).join(', ')} não nasce(m) na fundação.`, nao.map((q) => q.id));
    const pl = planejarFundacoes(b, p);
    if (!pl.passos.length) return err('NADA_A_GERAR', 'Nenhum pilar sem fundação: todos os pilares que nascem na fundação já têm elemento (ou nenhum nasce nela).');
    let m = b;
    for (const [i, passo] of pl.passos.entries()) {
      const r = aplicarComando(m, passo.nome, resolverPasso(m, passo));
      if (!r.ok) return r.erros.map((e) => ({ ...e, mensagem: `Passo ${i + 1} (${passo.nome}): ${e.mensagem}` }));
      m = r.modelo;
    }
    return [];
  },
  aplicar(d, p) {
    const pl = planejarFundacoes(current(d) as BuildingModel, p);
    for (const passo of pl.passos) {
      const c = comando(passo.nome)!;
      c.aplicar(d, comDefaults(c.schema, resolverPasso(current(d) as BuildingModel, passo)) as Record<string, unknown>);
    }
    return resumoPlano(pl);
  },
});

// ---------------- limites poligonais (FU3) ----------------

const polilinha: JsonSchema = { type: 'array', items: ponto, minItems: 2, description: 'vértices [x, y] em m' };

registrar<{ pontos: [number, number][]; fechado?: boolean; cota?: number; nome?: string }>({
  nome: 'limite.criar',
  descricao: 'Cria um limite poligonal (divisa, poço de elevador, reservatório): as sapatas de altura constante do nível não o invadem. A sapata é aparada pelo limite e fica a parte com o(s) pilar(es); o dimensionamento nunca o ultrapassa. O limite é ignorado, com aviso, se cortar um pilar, isolar um pilar da sapata associada ou cortar sapata de altura variável. Não vale para blocos, tubulões nem vigas. Polilinha aberta (divisa) ou `fechado`; `cota` restringe a um nível (cota de assentamento, m).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['pontos'], properties: { pontos: polilinha, fechado: { type: 'boolean' }, cota: { type: 'number' }, nome: { type: 'string', minLength: 1 } } },
  validar: (_b, p) => (p.fechado && p.pontos.length < 3 ? err('LIMITE_FECHADO', 'Limite fechado exige ao menos 3 vértices.') : []),
  aplicar(d, p) {
    const f = fund(d);
    const l: LimiteFundacao = { id: novoId(d, 'lim'), nome: p.nome?.trim() || nomeLimite(f.limites), pontos: p.pontos.map((q) => [q[0], q[1]] as [number, number]), ...(p.fechado ? { fechado: true } : {}), ...(p.cota !== undefined ? { cota: p.cota } : {}) };
    (f.limites ??= []).push(l);
    return `Limite ${l.nome} criado (${l.pontos.length} vértices).`;
  },
});

const nomeLimite = (ls?: LimiteFundacao[]) => `L${Math.max(0, ...(ls ?? []).map((l) => { const m = /^L(\d+)$/.exec(l.nome); return m ? +m[1] : 0; })) + 1}`;

registrar<{ id: string; pontos?: [number, number][]; fechado?: boolean; cota?: number; nome?: string; limpar?: 'cota'[] }>({
  nome: 'limite.editar',
  descricao: 'Altera um limite poligonal: vértices (`pontos` substitui a polilinha: mover, inserir vértice ou eliminar trecho), aberto ou fechado, nível (`cota`; `limpar: ["cota"]` vale a todos) e nome.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, pontos: polilinha, fechado: { type: 'boolean' }, cota: { type: 'number' }, nome: { type: 'string', minLength: 1 }, limpar: { type: 'array', items: { type: 'string', enum: ['cota'] } } } },
  validar(b, p) {
    const l = b.fundacao?.limites?.find((x) => x.id === p.id);
    if (!l) return err('LIMITE_INEXISTENTE', `Limite ${p.id} não existe.`);
    const n = (p.pontos ?? l.pontos).length, fechado = p.fechado ?? l.fechado;
    return fechado && n < 3 ? err('LIMITE_FECHADO', 'Limite fechado exige ao menos 3 vértices.') : [];
  },
  aplicar(d, p) {
    const l = d.fundacao!.limites!.find((x) => x.id === p.id)!;
    if (p.nome) l.nome = p.nome.trim();
    if (p.pontos) l.pontos = p.pontos.map((q) => [q[0], q[1]] as [number, number]);
    if (p.fechado !== undefined) { if (p.fechado) l.fechado = true; else delete l.fechado; }
    if (p.cota !== undefined) l.cota = p.cota;
    if (p.limpar?.includes('cota')) delete l.cota;
    return `Limite ${l.nome} alterado.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'limite.remover',
  descricao: 'Remove limites poligonais.',
  risco: 'destrutivo',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.fundacao?.limites?.some((x) => x.id === id));
    return f.length ? err('LIMITE_INEXISTENTE', `Limite(s) inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const s = new Set(p.ids), f = d.fundacao!;
    f.limites = f.limites!.filter((l) => !s.has(l.id));
    if (!f.limites.length) delete f.limites;
    return `${p.ids.length} limite(s) removido(s).`;
  },
});

// ---------------- terreno ----------------

type EstacaIn = Omit<EstacaTerreno, 'id' | 'nome'> & { id?: string; nome?: string };

registrar<{ sigmaAdm?: number; sigmaModo?: 'informada' | 'sondagem'; fatorVento?: number; cotaTerreno?: number; estacas?: EstacaIn[]; limpar?: ('sigmaAdm' | 'fatorVento' | 'cotaTerreno')[] }>({
  nome: 'fundacao.terreno',
  descricao: 'Dados do terreno: σadm de sapatas e tubulões (kN/m²; modo "informada", padrão, ou "sondagem" = estimada pelo SPT), majoração de σadm nas combinações com vento (`fatorVento`, padrão 1,0), cota do terreno (boca dos furos; padrão: a do pavimento mais baixo) e a lista de tipos de estaca (substitui a atual): { tipo: helice | escavada | premoldada, D (cm), modo: informada (com `capacidade` kN por estaca) | sondagem, s (m, entre eixos) }.',
  risco: 'escrita',
  mcp: false,
  calculo: (_p, b) => (b && temBaseElastica(b) ? true : 'fundacao'), // σadm e fator de vento entram na verificação da base elástica (FU6)
  schema: { type: 'object', additionalProperties: false, properties: {
    sigmaAdm: { type: 'number', exclusiveMinimum: 0, maximum: 10000, description: 'kN/m²' }, sigmaModo: { type: 'string', enum: ['informada', 'sondagem'] },
    fatorVento: { type: 'number', minimum: 1, maximum: 1.5 }, cotaTerreno: { type: 'number' },
    estacas: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['tipo', 'D', 'modo'], properties: {
      id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, tipo: { type: 'string', enum: ['helice', 'escavada', 'premoldada'] }, D: { type: 'number', minimum: 15, maximum: 150, description: 'cm' },
      modo: { type: 'string', enum: ['informada', 'sondagem'] }, capacidade: { type: 'number', exclusiveMinimum: 0, description: 'kN por estaca (característica)' }, s: { type: 'number', exclusiveMinimum: 0, maximum: 6, description: 'm entre eixos' },
    } } },
    limpar: { type: 'array', items: { type: 'string', enum: ['sigmaAdm', 'fatorVento', 'cotaTerreno'] } },
  } },
  validar(b, p) {
    if (p.estacas) {
      const sem = p.estacas.filter((e) => e.modo === 'informada' && !e.capacidade);
      if (sem.length) return err('ESTACA_SEM_CAPACIDADE', 'Estaca informada exige `capacidade` (kN).');
      const novos = new Set(p.estacas.map((e) => e.id).filter(Boolean));
      const usadas = (b.fundacao?.elementos ?? []).filter((e) => e.estaca && !novos.has(e.estaca.id));
      if (usadas.length) return err('ESTACA_EM_USO', `Tipo de estaca em uso em ${usadas.map((e) => e.nome).join(', ')}: mantenha o id na lista.`, usadas.map((e) => e.id));
      const ids = p.estacas.map((e) => e.id).filter(Boolean);
      if (new Set(ids).size !== ids.length) return err('ESTACA_DUPLICADA', 'Ids de estaca repetidos.');
    }
    return Object.keys(p).length ? [] : err('SEM_VALOR', 'Informe ao menos um dado do terreno.');
  },
  aplicar(d, p) {
    const t = fund(d).terreno;
    if (p.sigmaAdm !== undefined) t.sigmaAdm = p.sigmaAdm;
    if (p.sigmaModo) t.sigmaModo = p.sigmaModo;
    if (p.fatorVento !== undefined) { if (p.fatorVento === 1) delete t.fatorVento; else t.fatorVento = p.fatorVento; }
    if (p.cotaTerreno !== undefined) t.cotaTerreno = p.cotaTerreno;
    if (p.estacas) t.estacas = p.estacas.map((e) => {
      const id = e.id ?? novoId(d, 'e');
      const nome = e.nome?.trim() || `${e.tipo === 'helice' ? 'Hélice' : e.tipo === 'escavada' ? 'Escavada' : 'Pré-moldada'} φ${e.D}`;
      return { id, nome, tipo: e.tipo, D: e.D, modo: e.modo, ...(e.capacidade !== undefined ? { capacidade: e.capacidade } : {}), ...(e.s !== undefined ? { s: e.s } : {}) };
    });
    for (const k of p.limpar ?? []) delete t[k];
    return 'Dados do terreno alterados.';
  },
});

// ---------------- parâmetros do cálculo (opções gerais de sapatas, blocos e tubulões) ----------------

/** Parâmetros editáveis pelo comando (os do módulo Fundações), com faixa. */
export const PARAMS_FUNDACAO: Partial<Record<keyof FoundationParams, JsonSchema>> = {
  colPhi: { type: 'number', minimum: 10, maximum: 32, description: 'bitola do pilar para a ancoragem (mm)' },
  blockWeightPct: { type: 'number', minimum: 0, maximum: 20, description: 'peso do bloco (% de Nk)' },
  spacingInSitu: { type: 'number', minimum: 2, maximum: 5, description: '× D (moldadas)' },
  spacingPrecast: { type: 'number', minimum: 2, maximum: 5, description: '× D (pré-moldadas)' },
  minLength: { type: 'number', minimum: 1, maximum: 20, description: 'comprimento mínimo da estaca (m)' },
  hcMaxDepth: { type: 'number', minimum: 5, maximum: 40 }, precastStopN: { type: 'number', minimum: 10, maximum: 60 }, augerStopN: { type: 'number', minimum: 10, maximum: 80 },
  capEdge: { type: 'number', minimum: 0.1, maximum: 0.5 }, capThetaMin: { type: 'number', minimum: 30, maximum: 60 }, capThetaMax: { type: 'number', minimum: 45, maximum: 70 },
  ftPP: { type: 'number', minimum: 0, maximum: 20, description: 'peso próprio da sapata (% de Nk)' },
  ftSptDiv: { type: 'number', minimum: 20, maximum: 100 }, ftNmaxEst: { type: 'number', minimum: 5, maximum: 50 }, ftBulb: { type: 'number', minimum: 1, maximum: 3 },
  ftEdgeFactor: { type: 'number', minimum: 1, maximum: 1.5 }, ftMinCompressed: { type: 'number', minimum: 0.5, maximum: 1 }, ftMaxRatio: { type: 'number', minimum: 1, maximum: 4 },
  ftKind: { type: 'string', enum: ['rigida', 'flexivel'] }, ftMethod: { type: 'string', enum: ['ceb70', 'bielas'] },
  ftRhoMin: { type: 'number', minimum: 0.0005, maximum: 0.005 }, ftH0Min: { type: 'number', minimum: 0.15, maximum: 0.5 }, gammaSoil: { type: 'number', minimum: 12, maximum: 22 },
  tbSptDiv: { type: 'number', minimum: 15, maximum: 60 }, tbNmaxEst: { type: 'number', minimum: 10, maximum: 60 }, tbMinDepth: { type: 'number', minimum: 1, maximum: 20 },
  tbDfMin: { type: 'number', minimum: 0.5, maximum: 2 }, tbFck: { type: 'number', minimum: 15, maximum: 40 }, tbGc: { type: 'number', minimum: 1.4, maximum: 2 },
  tbDbMax: { type: 'number', minimum: 1, maximum: 6 }, tbHmax: { type: 'number', minimum: 1, maximum: 3 }, tbRodape: { type: 'number', minimum: 0.1, maximum: 0.4 },
  sptAvgDepth: { type: 'string', enum: ['common', 'max'] }, sptAvgWater: { type: 'string', enum: ['shallowest', 'mean'] },
};

registrar<{ valores?: Record<string, number | string>; padrao?: boolean | string[]; niveis?: number[] }>({
  nome: 'fundacao.opcoes',
  descricao: 'Opções gerais do cálculo de sapatas, blocos e tubulões (parâmetros do módulo Fundações: peso próprio, espaçamento das estacas, limites das sapatas e tubulões, estimativas pelo SPT). `valores` altera; `padrao: true` (ou lista de chaves) volta ao padrão. `niveis`: cotas de assentamento (m) dos níveis de fundação calculados (os demais mantêm o cálculo anterior); lista vazia = todos. fck, aço e cobrimento das fundações ficam nos materiais (materiais.definir); γ é o da obra.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, properties: {
    valores: { type: 'object', additionalProperties: false, properties: PARAMS_FUNDACAO as Record<string, JsonSchema> },
    padrao: { oneOf: [{ type: 'boolean' }, { type: 'array', items: { type: 'string', enum: Object.keys(PARAMS_FUNDACAO) } }] },
    niveis: { type: 'array', items: { type: 'number' }, description: 'cotas de assentamento (m) calculadas; vazia = todas' },
  } },
  validar(_b, p) { return p.valores && Object.keys(p.valores).length || p.padrao || p.niveis ? [] : err('SEM_VALOR', 'Informe `valores`, `padrao` ou `niveis`.'); },
  aplicar(d, p) {
    const f = fund(d);
    if (p.niveis) { if (p.niveis.length) f.niveis = [...new Set(p.niveis.map((z) => +z.toFixed(3)))].sort((a, z) => a - z); else delete f.niveis; }
    if (p.padrao === true) delete f.params;
    else if (Array.isArray(p.padrao) && f.params) for (const k of p.padrao) delete (f.params as Record<string, unknown>)[k];
    if (p.valores && Object.keys(p.valores).length) f.params = { ...f.params, ...p.valores } as Partial<FoundationParams>;
    if (f.params && !Object.keys(f.params).length) delete f.params;
    return 'Opções das fundações alteradas.';
  },
});

// ---------------- sondagens ----------------

const SOLOS = ['argila', 'silteArgiloso', 'silteArenoso', 'areia'] as const;
const leituras: JsonSchema = { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['N', 'solo'], properties: {
  N: { type: 'number', minimum: 0, maximum: 100 }, solo: { type: 'string', enum: SOLOS }, descartada: { type: 'boolean' },
} }, description: 'uma leitura por metro, a partir de 1 m' };
type LeituraIn = { N: number; solo: SoilClass; descartada?: boolean };
const metros = (ls: LeituraIn[]) => ls.map((l) => ({ N: l.N, soil: l.solo, ...(l.descartada ? { excluded: true } : {}) }));

registrar<{ nome: string; x?: number; y?: number; nivelAgua?: number; impenetravel: boolean; leituras: LeituraIn[] }>({
  nome: 'sondagem.criar',
  descricao: 'Cria um furo de sondagem SPT no edifício (mesmo formato do módulo Fundações): nome, posição (m), nível d’água (m de profundidade; ausente = não encontrado), leituras metro a metro { N, solo: argila | silteArgiloso | silteArenoso | areia, descartada? } e se terminou impenetrável.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['nome', 'leituras'], properties: {
    nome: { type: 'string', minLength: 1 }, x: { type: 'number' }, y: { type: 'number' }, nivelAgua: { type: 'number', minimum: 0 },
    impenetravel: { type: 'boolean', default: false }, leituras,
  } },
  aplicar(d, p) {
    const f = fund(d);
    const id = Math.max(0, ...f.sondagens.map((s) => s.id ?? 0)) + 1;
    f.sondagens.push({ id, name: p.nome.trim(), water: p.nivelAgua ?? null, meters: metros(p.leituras), endImpenetrable: p.impenetravel, ...(p.x !== undefined && p.y !== undefined ? { x: p.x, y: p.y } : {}) });
    return `Sondagem ${p.nome} criada (${p.leituras.length} m).`;
  },
});

registrar<{ id: number; nome?: string; x?: number; y?: number; nivelAgua?: number; semAgua?: boolean; impenetravel?: boolean; leituras?: LeituraIn[] }>({
  nome: 'sondagem.editar',
  descricao: 'Altera um furo de sondagem: nome, posição, nível d’água (`semAgua` = não encontrado), impenetrável e leituras (substituem as atuais).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'integer', minimum: 1 }, nome: { type: 'string', minLength: 1 }, x: { type: 'number' }, y: { type: 'number' }, nivelAgua: { type: 'number', minimum: 0 },
    semAgua: { type: 'boolean' }, impenetravel: { type: 'boolean' }, leituras,
  } },
  validar(b, p) { return b.fundacao?.sondagens.some((s) => s.id === p.id) ? [] : err('SONDAGEM_INEXISTENTE', `Furo ${p.id} não existe.`); },
  aplicar(d, p) {
    const s = d.fundacao!.sondagens.find((x) => x.id === p.id)!;
    if (p.nome) s.name = p.nome.trim();
    if (p.x !== undefined) s.x = p.x;
    if (p.y !== undefined) s.y = p.y;
    if (p.nivelAgua !== undefined) s.water = p.nivelAgua;
    if (p.semAgua) s.water = null;
    if (p.impenetravel !== undefined) s.endImpenetrable = p.impenetravel;
    if (p.leituras) s.meters = metros(p.leituras);
    return `Sondagem ${s.name} alterada.`;
  },
});

registrar<{ furos: { name: string; water?: number | null; meters: { N: number; soil: SoilClass; excluded?: boolean }[]; endImpenetrable: boolean; x?: number; y?: number }[]; substituir?: boolean }>({
  nome: 'sondagem.copiar',
  descricao: 'Copia furos de sondagem do módulo Fundações para o edifício (formato do módulo: name, water [ausente = não encontrado], meters { N, soil, excluded }, endImpenetrable, x, y). Acrescenta aos existentes ou, com `substituir`, troca todos (as escolhas de furo dos elementos de fundação voltam ao automático).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['furos'], properties: {
    furos: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['name', 'meters', 'endImpenetrable'], properties: {
      name: { type: 'string', minLength: 1 }, water: { type: 'number', minimum: 0, description: 'nível d’água (m de profundidade); ausente = não encontrado' }, endImpenetrable: { type: 'boolean' }, x: { type: 'number' }, y: { type: 'number' },
      meters: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['N', 'soil'], properties: { N: { type: 'number', minimum: 0, maximum: 100 }, soil: { type: 'string', enum: SOLOS }, excluded: { type: 'boolean' } } } },
    } } },
    substituir: { type: 'boolean', description: 'troca os furos do edifício em vez de acrescentar' },
  } },
  aplicar(d, p) {
    const f = fund(d);
    if (p.substituir) {
      f.sondagens = [];
      for (const e of f.elementos) delete e.sondagem;
    }
    let id = Math.max(0, ...f.sondagens.map((s) => s.id ?? 0));
    for (const x of p.furos) f.sondagens.push({ id: ++id, name: x.name.trim(), water: x.water ?? null, meters: x.meters.map((m) => ({ N: m.N, soil: m.soil, ...(m.excluded ? { excluded: true } : {}) })), endImpenetrable: x.endImpenetrable, ...(x.x !== undefined && x.y !== undefined ? { x: x.x, y: x.y } : {}) });
    return `${p.furos.length} furo(s) de sondagem copiado(s) do módulo Fundações${p.substituir ? ' (substituíram os do edifício)' : ''}.`;
  },
});

registrar<{ ids: number[] }>({
  nome: 'sondagem.remover',
  descricao: 'Remove furos de sondagem (e as referências a eles nos elementos de fundação).',
  risco: 'destrutivo',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'integer', minimum: 1 }, minItems: 1 } } },
  validar(b, p) { const f = p.ids.filter((id) => !b.fundacao?.sondagens.some((s) => s.id === id)); return f.length ? err('SONDAGEM_INEXISTENTE', `Furo(s) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) {
    const f = d.fundacao!, s = new Set(p.ids);
    f.sondagens = f.sondagens.filter((x) => !s.has(x.id!));
    for (const e of f.elementos) if (e.sondagem) {
      const ids = (e.sondagem.ids ?? []).filter((id) => !s.has(id));
      if (e.sondagem.modo === 'furo' && !ids.length) delete e.sondagem;
      else if (e.sondagem.ids) e.sondagem.ids = ids;
    }
    return `${p.ids.length} furo(s) de sondagem removido(s).`;
  },
});

// ---------------- vigas de equilíbrio e de travamento (FU2) ----------------

const equilibrioSchema: JsonSchema = { oneOf: [{ type: 'string', enum: ['auto'] }, { type: 'object', additionalProperties: false, required: ['ini', 'fim'], properties: { ini: { type: 'boolean' }, fim: { type: 'boolean' } } }],
  description: '"auto" (padrão) = as pontas em sapata ou bloco excêntrico; ou { ini, fim } explícito' };
const TIPOS_VF = ['equilibrio', 'travamento'] as const;
type VFIn = { tipo: VigaFundacao['tipo']; ini: string; fim: string; equilibrio?: VigaFundacao['equilibrio']; b?: number; h?: number; fixa?: boolean; nome?: string; ancoragem?: { ini?: number; fim?: number } };

function validarVF(b: BuildingModel, v: Pick<VigaFundacao, 'ini' | 'fim'>, proprio?: string): Diagnostico[] {
  const a = pontaVF(b, v.ini), z = pontaVF(b, v.fim);
  if (!a || !z) return err('PONTA_INVALIDA', `Ponta ${!a ? v.ini : v.fim} não é elemento de fundação nem pilar que nasce na fundação.`);
  if (a.pilar.id === z.pilar.id) return err('PONTA_INVALIDA', 'As duas pontas são o mesmo pilar.');
  const par = [a.pilar.id, z.pilar.id].sort().join('|');
  const dup = b.fundacao?.vigas?.find((x) => x.id !== proprio && [x.ini, x.fim].map((id) => pontaVF(b, id)?.pilar.id).sort().join('|') === par);
  if (dup) return err('VIGA_DUPLICADA', `Já existe a viga ${dup.nome} entre ${a.nome} e ${z.nome}.`, [dup.id]);
  return [];
}

registrar<VFIn>({
  nome: 'vigaFundacao.criar',
  descricao: 'Lança uma viga de fundação entre dois elementos de fundação (ou elemento e pilar que nasce na fundação): de equilíbrio (alavanca que centra a sapata ou o bloco excêntrico da ponta equilibrada e alivia a outra; `equilibrio` "auto" ou { ini, fim }) ou de travamento (blocos de 1 e 2 estacas). Não se apoia no solo: leva peso próprio e cargas do nível de fundação (grupo "fundacao") às pontas. Seção b × h (m; padrão 20 × 40 cm, cresce até atender) ou `fixa` (só verificada).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['tipo', 'ini', 'fim'], properties: {
    tipo: { type: 'string', enum: TIPOS_VF }, ini: { type: 'string', description: 'id do elemento de fundação ou do pilar' }, fim: { type: 'string' },
    equilibrio: equilibrioSchema, b: { type: 'number', minimum: 0.1, maximum: 1.5, default: 0.2 }, h: { type: 'number', minimum: 0.2, maximum: 3, default: 0.4 },
    fixa: { type: 'boolean' }, nome: { type: 'string', minLength: 1 },
  } },
  validar: (b, p) => validarVF(b, p),
  aplicar(d, p) {
    const f = fund(d);
    const nome = p.nome?.trim() || nomeVigaFundacao(d as BuildingModel);
    const v: VigaFundacao = {
      id: novoId(d, 'vf'), nome, tipo: p.tipo, ini: p.ini, fim: p.fim, b: p.b ?? 0.2, h: p.h ?? 0.4,
      ...(p.tipo === 'equilibrio' && p.equilibrio && p.equilibrio !== 'auto' ? { equilibrio: { ...p.equilibrio } } : {}), ...(p.fixa ? { fixa: true } : {}),
    };
    (f.vigas ??= []).push(v);
    return `${nome} (${p.tipo === 'equilibrio' ? 'equilíbrio' : 'travamento'}) lançada.`;
  },
});

registrar<Partial<VFIn> & { id: string }>({
  nome: 'vigaFundacao.editar',
  descricao: 'Altera uma viga de fundação: nome, tipo, pontas, pontas equilibradas ("auto" ou { ini, fim }), seção b × h (m), `fixa` (seção só verificada) e `ancoragem` (comprimento reto das barras superiores além da face do pilar de cada ponta, m; 0 = o lb calculado).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, tipo: { type: 'string', enum: TIPOS_VF }, ini: { type: 'string' }, fim: { type: 'string' },
    equilibrio: equilibrioSchema, b: { type: 'number', minimum: 0.1, maximum: 1.5 }, h: { type: 'number', minimum: 0.2, maximum: 3 }, fixa: { type: 'boolean' },
    ancoragem: { type: 'object', additionalProperties: false, properties: { ini: { type: 'number', minimum: 0, maximum: 3 }, fim: { type: 'number', minimum: 0, maximum: 3 } } },
  } },
  validar(b, p) {
    const v = b.fundacao?.vigas?.find((x) => x.id === p.id);
    if (!v) return err('VIGA_FUNDACAO_INEXISTENTE', `Viga de fundação ${p.id} não existe.`);
    return validarVF(b, { ini: p.ini ?? v.ini, fim: p.fim ?? v.fim }, v.id);
  },
  aplicar(d, p) {
    const v = d.fundacao!.vigas!.find((x) => x.id === p.id)!;
    if (p.nome) v.nome = p.nome.trim();
    for (const k of ['tipo', 'ini', 'fim', 'b', 'h'] as const) if (p[k] !== undefined) (v as Record<string, unknown>)[k] = p[k];
    if (p.fixa !== undefined) { if (p.fixa) v.fixa = true; else delete v.fixa; }
    if (p.equilibrio !== undefined) { if (p.equilibrio === 'auto') delete v.equilibrio; else v.equilibrio = { ...p.equilibrio }; }
    if (v.tipo !== 'equilibrio') delete v.equilibrio;
    if (p.ancoragem) {
      const a = { ...(v.ancoragem ?? {}) };
      for (const k of ['ini', 'fim'] as const) { const x = p.ancoragem[k]; if (x === undefined) continue; if (x > 0) a[k] = x; else delete a[k]; }
      if (Object.keys(a).length) v.ancoragem = a; else delete v.ancoragem;
    }
    return `${v.nome} alterada.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'vigaFundacao.remover',
  descricao: 'Remove vigas de fundação.',
  risco: 'destrutivo',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.fundacao?.vigas?.some((x) => x.id === id));
    return f.length ? err('VIGA_FUNDACAO_INEXISTENTE', `Viga(s) de fundação inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const s = new Set(p.ids), f = d.fundacao!;
    f.vigas = f.vigas!.filter((v) => !s.has(v.id));
    if (!f.vigas.length) delete f.vigas;
    return `${p.ids.length} viga(s) de fundação removida(s).`;
  },
});

registrar<{ modelo: string; ids: string[] }>({
  nome: 'vigaFundacao.igualar',
  descricao: 'Iguala vigas de fundação à viga `modelo`: copia a seção (b × h) e a fixa nas copiadas, que passam a ser só verificadas (ficam com erro se não atenderem).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['modelo', 'ids'], properties: { modelo: { type: 'string' }, ids } },
  validar(b, p) {
    const vs = b.fundacao?.vigas ?? [];
    if (!vs.some((x) => x.id === p.modelo)) return err('VIGA_FUNDACAO_INEXISTENTE', `Viga de fundação ${p.modelo} não existe.`);
    const f = p.ids.filter((id) => !vs.some((x) => x.id === id));
    if (f.length) return err('VIGA_FUNDACAO_INEXISTENTE', `Viga(s) de fundação inexistente(s): ${f.join(', ')}.`);
    return p.ids.every((id) => id === p.modelo) ? err('SEM_VALOR', 'Informe vigas além do modelo.') : [];
  },
  aplicar(d, p) {
    const vs = d.fundacao!.vigas!, m = vs.find((x) => x.id === p.modelo)!;
    let n = 0;
    for (const v of vs) if (p.ids.includes(v.id) && v.id !== m.id) { v.b = m.b; v.h = m.h; v.fixa = true; n++; }
    return `${n} viga(s) de fundação igualada(s) a ${m.nome} (${Math.round(m.b * 100)}×${Math.round(m.h * 100)}).`;
  },
});
