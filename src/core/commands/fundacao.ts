// Fundações do edifício (frente FU, fatia FU1): elementos sob pilares (sapata, bloco sobre estacas, tubulão; centrados,
// de divisa, de canto ou em posição livre), dados do terreno (σadm, estacas), sondagens e parâmetros do cálculo.
// Todos sem ferramenta própria no MCP (`mcp: false`) e fora da revisão de cálculo da estrutura (`calculo: 'fundacao'`).
import type { Draft } from 'immer';
import { FUNDACAO_VAZIA, type BuildingModel, type ElementoFundacao, type EstacaTerreno, type FundacaoEdificio, type PosicaoFundacao, type TipoFundacao } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { ladoDoAjuste, nomeFundacao } from '../building/fundacao';
import type { FoundationParams, SoilClass } from '../piles';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

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

interface ElementoIn { pilar?: string; tipo?: TipoFundacao; posicao?: PosicaoFundacao; lado?: [number, number]; estaca?: { id: string; n?: number }; sondagem?: { modo: 'furo' | 'media'; ids?: number[] } }

function validarElemento(b: BuildingModel, e: Required<Pick<ElementoIn, 'pilar' | 'tipo' | 'posicao'>> & ElementoIn, proprio?: string): Diagnostico[] {
  const p = b.pilares.find((x) => x.id === e.pilar);
  if (!p) return err('PILAR_INEXISTENTE', `Pilar ${e.pilar} não existe.`);
  if (p.nasce !== 'fundacao') return err('PILAR_NAO_NASCE_FUNDACAO', `${p.nome} não nasce na fundação.`, [p.id]);
  const outro = b.fundacao?.elementos.find((x) => x.id !== proprio && x.pilares.includes(p.id));
  if (outro) return err('PILAR_COM_FUNDACAO', `${p.nome} já tem o elemento ${outro.nome}.`, [p.id, outro.id]);
  if (e.tipo === 'tubulao' && e.posicao !== 'centrada') return err('TUBULAO_CENTRADO', 'Tubulão só centrado sob o pilar (divisa por viga de equilíbrio).');
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

type CriarIn = { pilar: string; tipo: TipoFundacao; posicao: PosicaoFundacao; lado?: [number, number]; angulo?: number; x?: number; y?: number; cota?: number; sigmaAdm?: number; sondagem?: ElementoFundacao['sondagem']; estaca?: { id: string; n?: number }; nome?: string };

registrar<CriarIn>({
  nome: 'fundacao.criar',
  descricao: 'Lança um elemento de fundação sob um pilar que nasce na fundação: sapata, bloco sobre estacas (tipo de estaca do terreno) ou tubulão; posição centrada, de divisa (`lado` [x, y] com um valor ±1: a face do pilar desse lado fica na borda), de canto (os dois) ou livre (centro em x, y). Ângulo padrão: o do pilar. Cota de assentamento, σadm e sondagem próprios opcionais. Sem `lado`, vale o ponto fixo do pilar (face ou canto).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['pilar', 'tipo'], properties: {
    pilar: { type: 'string' }, tipo: { type: 'string', enum: TIPOS }, posicao: { type: 'string', enum: POSICOES, default: 'centrada' }, lado,
    angulo: { type: 'number', description: 'graus; padrão: o do pilar' }, x: { type: 'number' }, y: { type: 'number' },
    cota: { type: 'number', description: 'cota de assentamento (m); padrão: a de fundação da obra' }, sigmaAdm: { type: 'number', exclusiveMinimum: 0, description: 'kN/m²' },
    sondagem: sondagemSchema, estaca: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, n: { type: 'integer', minimum: 1, maximum: 6 } } },
    nome: { type: 'string', minLength: 1 },
  } },
  validar(b, p) {
    const est = p.estaca ?? (p.tipo === 'bloco' && b.fundacao?.terreno.estacas.length === 1 ? { id: b.fundacao.terreno.estacas[0].id } : undefined);
    return validarElemento(b, { ...p, estaca: est, lado: ladoPadrao(b, p.pilar, p.posicao, p.lado) });
  },
  aplicar(d, p) {
    const b = d as BuildingModel, pil = b.pilares.find((x) => x.id === p.pilar)!;
    const f = fund(d);
    const nome = p.nome?.trim() || nomeFundacao(b, p.tipo);
    const l = ladoPadrao(b, p.pilar, p.posicao, p.lado);
    const est = p.estaca ?? (p.tipo === 'bloco' ? { id: f.terreno.estacas[0].id } : undefined);
    const e: ElementoFundacao = {
      id: novoId(d, 'f'), nome, tipo: p.tipo, pilares: [p.pilar], x: p.x ?? pil.x, y: p.y ?? pil.y, angulo: p.angulo ?? pil.angulo, posicao: p.posicao,
      ...(l ? { lado: [...l] as [number, number] } : {}), ...(p.cota !== undefined ? { cota: p.cota } : {}), ...(p.sigmaAdm !== undefined ? { sigmaAdm: p.sigmaAdm } : {}),
      ...(p.sondagem ? { sondagem: { modo: p.sondagem.modo, ...(p.sondagem.ids ? { ids: [...p.sondagem.ids] } : {}) } } : {}), ...(est ? { estaca: { ...est } } : {}),
    };
    f.elementos.push(e);
    return `${nome} (${p.tipo}) lançado sob ${pil.nome}.`;
  },
});

type EditarIn = Omit<Partial<CriarIn>, 'pilar'> & { id: string; impostas?: { A: number; B: number; h?: number }; limpar?: ('cota' | 'sigmaAdm' | 'sondagem' | 'impostas')[] };

registrar<EditarIn>({
  nome: 'fundacao.editar',
  descricao: 'Altera um elemento de fundação: nome, tipo, posição (centrada, divisa, canto, livre) e lado, ângulo, centro (livre), cota de assentamento, σadm próprio, sondagem, estaca e dimensões impostas da sapata (A, B e h em m, só verificadas). `limpar` volta ao padrão: cota, sigmaAdm, sondagem, impostas.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, tipo: { type: 'string', enum: TIPOS }, posicao: { type: 'string', enum: POSICOES }, lado,
    angulo: { type: 'number' }, x: { type: 'number' }, y: { type: 'number' }, cota: { type: 'number' }, sigmaAdm: { type: 'number', exclusiveMinimum: 0 },
    sondagem: sondagemSchema, estaca: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, n: { type: 'integer', minimum: 1, maximum: 6 } } },
    impostas: { type: 'object', additionalProperties: false, required: ['A', 'B'], properties: { A: { type: 'number', minimum: 0.3, maximum: 10 }, B: { type: 'number', minimum: 0.3, maximum: 10 }, h: { type: 'number', minimum: 0.15, maximum: 3 } } },
    limpar: { type: 'array', items: { type: 'string', enum: ['cota', 'sigmaAdm', 'sondagem', 'impostas'] } },
  } },
  validar(b, p) {
    const e = b.fundacao?.elementos.find((x) => x.id === p.id);
    if (!e) return err('FUNDACAO_INEXISTENTE', `Elemento de fundação ${p.id} não existe.`);
    const tipo = p.tipo ?? e.tipo, posicao = p.posicao ?? e.posicao;
    if (p.impostas && tipo !== 'sapata') return err('IMPOSTAS_SAPATA', 'Dimensões impostas: só sapatas nesta versão.', [e.id]);
    return validarElemento(b, { pilar: e.pilares[0], tipo, posicao, lado: ladoPadrao(b, e.pilares[0], posicao, p.lado ?? (p.posicao ? undefined : e.lado)), estaca: p.estaca ?? e.estaca, sondagem: p.sondagem ?? e.sondagem }, e.id);
  },
  aplicar(d, p) {
    const e = d.fundacao!.elementos.find((x) => x.id === p.id)!;
    for (const k of ['nome', 'tipo', 'posicao', 'angulo', 'x', 'y', 'cota', 'sigmaAdm'] as const) if (p[k] !== undefined) (e as Record<string, unknown>)[k] = k === 'nome' ? String(p[k]).trim() : p[k];
    if (p.sondagem) e.sondagem = { modo: p.sondagem.modo, ...(p.sondagem.ids ? { ids: [...p.sondagem.ids] } : {}) };
    if (p.estaca) e.estaca = { ...p.estaca };
    if (p.impostas) e.impostas = { ...p.impostas };
    if (p.tipo === 'bloco' && !e.estaca) e.estaca = { id: d.fundacao!.terreno.estacas[0].id };
    if (e.tipo !== 'bloco') delete e.estaca;
    if (e.tipo !== 'sapata') delete e.impostas;
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
  aplicar(d, p) { const s = new Set(p.ids); d.fundacao!.elementos = d.fundacao!.elementos.filter((e) => !s.has(e.id)); return `${p.ids.length} elemento(s) de fundação removido(s).`; },
});

// ---------------- terreno ----------------

type EstacaIn = Omit<EstacaTerreno, 'id' | 'nome'> & { id?: string; nome?: string };

registrar<{ sigmaAdm?: number; sigmaModo?: 'informada' | 'sondagem'; fatorVento?: number; cotaTerreno?: number; estacas?: EstacaIn[]; limpar?: ('sigmaAdm' | 'fatorVento' | 'cotaTerreno')[] }>({
  nome: 'fundacao.terreno',
  descricao: 'Dados do terreno: σadm de sapatas e tubulões (kN/m²; modo "informada", padrão, ou "sondagem" = estimada pelo SPT), majoração de σadm nas combinações com vento (`fatorVento`, padrão 1,0), cota do terreno (boca dos furos; padrão: a do pavimento mais baixo) e a lista de tipos de estaca (substitui a atual): { tipo: helice | escavada | premoldada, D (cm), modo: informada (com `capacidade` kN por estaca) | sondagem, s (m, entre eixos) }.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
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

registrar<{ valores?: Record<string, number | string>; padrao?: boolean | string[] }>({
  nome: 'fundacao.opcoes',
  descricao: 'Opções gerais do cálculo de sapatas, blocos e tubulões (parâmetros do módulo Fundações: peso próprio, espaçamento das estacas, limites das sapatas e tubulões, estimativas pelo SPT). `valores` altera; `padrao: true` (ou lista de chaves) volta ao padrão. fck, aço e cobrimento das fundações ficam nos materiais (materiais.definir); γ é o da obra.',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, properties: {
    valores: { type: 'object', additionalProperties: false, properties: PARAMS_FUNDACAO as Record<string, JsonSchema> },
    padrao: { oneOf: [{ type: 'boolean' }, { type: 'array', items: { type: 'string', enum: Object.keys(PARAMS_FUNDACAO) } }] },
  } },
  validar(_b, p) { return p.valores && Object.keys(p.valores).length || p.padrao ? [] : err('SEM_VALOR', 'Informe `valores` ou `padrao`.'); },
  aplicar(d, p) {
    const f = fund(d);
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
