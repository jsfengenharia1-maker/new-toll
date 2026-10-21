// Registro de comandos tipados: toda alteração do modelo do edifício passa por aqui.
// A interface, os atalhos, o arquivo (replay do log), os testes, a linha de comando e o MCP usam o mesmo registro.
import { enablePatches, produceWithPatches, applyPatches, current, type Draft, type Patch } from 'immer';
import { edificioVazio, type BuildingModel } from '../building/types';
import { verificar, type Diagnostico } from '../building/verify';
import { desbloquearObsoletos, mudouEstrutura, temBloqueioDependente } from '../building/desbloqueio';
import { comDefaults, validarSchema, type JsonSchema } from './schema';

enablePatches();

export type Risco = 'leitura' | 'escrita' | 'destrutivo';
export type Autor = 'usuario' | 'ia' | 'arquivo' | 'sistema';

/** O que um comando altera do cálculo: tudo (`true`, padrão), nada (`false`, só prancha), só fundações, só detalhe ou só seções. */
export type NivelCalculo = boolean | 'fundacao' | 'detalhe' | 'secao';

export interface Comando<P = Record<string, unknown>> {
  nome: string;
  descricao: string;
  schema: JsonSchema;
  risco: Risco;
  /** false: sem ferramenta própria no MCP (continua acessível pela ferramenta genérica `previa`). */
  mcp?: boolean;
  /**
   * false: só dados de apresentação (carimbo, formato e escalas das pranchas). Não muda a revisão de cálculo
   * (`Sessao.revCalculo`), então não invalida a análise nem o dimensionamento. Padrão: true.
   * 'fundacao': só dados das fundações (elementos, terreno, sondagens). Não muda `revCalculo` (a estrutura é calculada
   * com vínculo externo na base dos pilares), só `revFundacao`.
   * 'detalhe' (R7f): só dimensionamento e detalhamento (tabelas de armadura, armadura bloqueada, edições de barras,
   * opções de detalhamento). Não muda `revCalculo` nem `revEsforcos`: a análise vale, só o dimensionamento é refeito
   * (`rearmar`), sem nova análise; muda `revDetalhe`.
   * 'secao' (R7f): muda seção de elemento existente (rigidez e peso), sem mudar a topologia. A análise fica
   * desatualizada (`revCalculo`), mas o dimensionamento pode ser refeito com os esforços guardados ("rearmar alterados"),
   * enquanto nenhum comando de cálculo pleno (`true`) vier depois (`revEsforcos` não muda).
   * Função: decide pelos parâmetros e pelo modelo resultante (ex.: carga lançada no nível de fundação só muda as
   * fundações, a menos que haja base elástica, FU6, que entra na análise global).
   */
  calculo?: NivelCalculo | ((p: Record<string, unknown>, b?: BuildingModel) => NivelCalculo);
  /** Regras além do schema (referências, colisões). Diagnósticos de severidade "erro" impedem a aplicação. */
  validar?(b: BuildingModel, p: P): Diagnostico[];
  /** Muta o rascunho; pode devolver uma mensagem para a barra de status. */
  aplicar(d: Draft<BuildingModel>, p: P): string | void;
}

const REGISTRO = new Map<string, Comando>();

export function registrar<P>(c: Comando<P>) {
  if (REGISTRO.has(c.nome)) throw new Error(`Comando duplicado: ${c.nome}`);
  REGISTRO.set(c.nome, c as unknown as Comando);
}
export const comando = (nome: string) => REGISTRO.get(nome);
const calculoDe = (nome: string, params?: Record<string, unknown>, b?: BuildingModel): NivelCalculo => { const c = REGISTRO.get(nome)?.calculo; const v = typeof c === 'function' ? c(params ?? {}, b) : c; return v === undefined ? true : v; };
type Item = { nome: string; params?: Record<string, unknown> };
/** Aplica o teste a cada nível de cálculo do comando (`lote`: algum item atende; comando desconhecido: nível pleno). */
function algum(nome: string, params: Record<string, unknown> | undefined, b: BuildingModel | undefined, f: (n: NivelCalculo) => boolean): boolean {
  if (nome === 'lote') return ((params?.comandos ?? []) as Item[]).some((c) => algum(c.nome, c.params, b, f));
  return f(calculoDe(nome, params, b));
}
/** O comando altera a análise ou o peso/rigidez de algum elemento? (análise e dimensionamento deixam de valer.) */
export const afetaCalculo = (nome: string, params?: Record<string, unknown>, b?: BuildingModel): boolean => algum(nome, params, b, (n) => n === true || n === 'secao');
/** O comando invalida os esforços guardados (qualquer coisa além de seções, detalhe, fundações e prancha)? */
export const afetaEsforcos = (nome: string, params?: Record<string, unknown>, b?: BuildingModel): boolean => algum(nome, params, b, (n) => n === true);
/** O comando altera o cálculo das fundações? (tudo que altera o cálculo, mais os comandos só de fundação.) */
export const afetaFundacao = (nome: string, params?: Record<string, unknown>, b?: BuildingModel): boolean => algum(nome, params, b, (n) => n === true || n === 'secao' || n === 'fundacao');
/** O comando altera o dimensionamento ou o detalhamento da estrutura? (tudo que altera o cálculo, mais os comandos só de detalhe.) */
export const afetaDetalhe = (nome: string, params?: Record<string, unknown>, b?: BuildingModel): boolean => algum(nome, params, b, (n) => n === true || n === 'secao' || n === 'detalhe');
export const listarComandos = () => [...REGISTRO.values()].sort((a, z) => a.nome.localeCompare(z.nome));

export interface Entrada { t: string; nome: string; params: Record<string, unknown>; autor: Autor }

export interface Diff { criados: string[]; alterados: string[]; removidos: string[]; resumo: string[] }

export interface Aplicacao {
  ok: boolean;
  erros: Diagnostico[];
  modelo: BuildingModel;
  params?: Record<string, unknown>;
  patches?: Patch[];
  inversos?: Patch[];
  diff?: Diff;
  mensagem?: string;
}

const erro = (codigo: string, mensagem: string): Diagnostico => ({ codigo, severidade: 'erro', elementos: [], mensagem });

/** Aplica um comando sem efeitos colaterais: devolve o modelo novo, os patches e o inverso. */
export function aplicarComando(b: BuildingModel, nome: string, params: unknown): Aplicacao {
  const c = REGISTRO.get(nome);
  if (!c) return { ok: false, modelo: b, erros: [erro('COMANDO_DESCONHECIDO', `Comando desconhecido: ${nome}.`)] };
  const raw = params ?? {};
  const se = validarSchema(c.schema, raw);
  if (se.length) return { ok: false, modelo: b, erros: se.map((e) => erro('PARAMETRO_INVALIDO', `${nome}: ${e.caminho} ${e.mensagem}.`)) };
  const p = comDefaults(c.schema, raw) as Record<string, unknown>;
  const ve = (c.validar?.(b, p) ?? []).filter((d) => d.severidade === 'erro');
  if (ve.length) return { ok: false, modelo: b, erros: ve, params: p };
  let mensagem: string | undefined;
  let [modelo, patches, inversos] = produceWithPatches(b, (d) => { mensagem = c.aplicar(d, p) ?? undefined; });
  // armadura bloqueada e detalhe editado que não valem mais (vãos ou lances mudaram) saem no mesmo passo (R7f)
  if (mudouEstrutura(b, modelo) && temBloqueioDependente(modelo)) {
    let avisos: string[] = [];
    const [m2, p2, i2] = produceWithPatches(modelo, (d) => { avisos = desbloquearObsoletos(d); });
    if (p2.length) { modelo = m2; patches = [...patches, ...p2]; inversos = [...i2, ...inversos]; mensagem = [mensagem, ...avisos].filter(Boolean).join(' '); }
  }
  return { ok: true, erros: [], modelo, params: p, patches, inversos, diff: diffModelos(b, modelo), mensagem };
}

type ComId = { id: string; nome?: string };
const COLECOES: { k: keyof BuildingModel; rot: string }[] = [
  { k: 'pavimentos', rot: 'pavimento' }, { k: 'grupos', rot: 'grupo' }, { k: 'eixos', rot: 'eixo' },
  { k: 'mascaras', rot: 'máscara' }, { k: 'pilares', rot: 'pilar' }, { k: 'vigas', rot: 'viga' }, { k: 'lajes', rot: 'laje' }, { k: 'cargas', rot: 'carga' },
];

/** Diferenças legíveis entre dois modelos (por id nas coleções e por bloco nos dados gerais). */
export function diffModelos(a: BuildingModel, z: BuildingModel): Diff {
  const d: Diff = { criados: [], alterados: [], removidos: [], resumo: [] };
  for (const { k, rot } of COLECOES) {
    const A = new Map((a[k] as ComId[]).map((x) => [x.id, x])), Z = new Map((z[k] as ComId[]).map((x) => [x.id, x]));
    for (const [id, x] of Z) {
      const old = A.get(id);
      if (!old) { d.criados.push(id); d.resumo.push(`+ ${rot} ${x.nome ?? id}`); }
      else if (old !== x && JSON.stringify(old) !== JSON.stringify(x)) { d.alterados.push(id); d.resumo.push(`~ ${rot} ${x.nome ?? id}`); }
    }
    for (const [id, x] of A) if (!Z.has(id)) { d.removidos.push(id); d.resumo.push(`− ${rot} ${x.nome ?? id}`); }
  }
  for (const k of ['obra', 'norma', 'vento', 'prancha', 'opcoes', 'perfilOpcoes', 'casos', 'compat', 'estados', 'situacoes', 'empuxos', 'cargasPilar', 'fundacao', 'tabelas', 'tramos', 'zonasLaje', 'linhasDobra', 'agrupamentos', 'copiasLaje'] as const)
    if (a[k] !== z[k] && JSON.stringify(a[k]) !== JSON.stringify(z[k])) { d.alterados.push(k); d.resumo.push(`~ ${k}`); }
  return d;
}

/** Vários comandos como um passo só (um desfazer). Valida cada um no estado intermediário. */
registrar<{ comandos: { nome: string; params?: Record<string, unknown> }[] }>({
  nome: 'lote',
  descricao: 'Executa uma lista de comandos como um passo só (um único desfazer). Para no primeiro erro, sem alterar nada.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['comandos'], properties: {
    comandos: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['nome'], properties: { nome: { type: 'string' }, params: { type: 'object' } } } },
  } },
  validar(b, p) {
    let m = b;
    for (const [i, c] of p.comandos.entries()) {
      if (c.nome === 'lote') return [erro('LOTE_ANINHADO', 'Lote dentro de lote não é permitido.')];
      const r = aplicarComando(m, c.nome, c.params ?? {});
      if (!r.ok) return r.erros.map((e) => ({ ...e, mensagem: `Item ${i + 1} (${c.nome}): ${e.mensagem}` }));
      m = r.modelo;
    }
    return [];
  },
  aplicar(d, p) {
    const msgs: string[] = [];
    for (const c of p.comandos) {
      const cmd = REGISTRO.get(c.nome)!;
      const par = comDefaults(cmd.schema, c.params ?? {}) as Record<string, unknown>;
      cmd.validar?.(current(d) as BuildingModel, par);
      const m = cmd.aplicar(d, par);
      if (m) msgs.push(m);
    }
    return msgs.length > 3 ? `${p.comandos.length} comandos aplicados.` : msgs.join(' ');
  },
});

export interface Resultado { ok: boolean; erros: Diagnostico[]; diff?: Diff; mensagem?: string; token?: string }

interface Passo { entrada: Entrada; patches: Patch[]; inversos: Patch[]; calculo: boolean; fundacao: boolean; detalhe: boolean; esforcos: boolean }

/** Estado de edição: modelo atual, desfazer/refazer, log e prévias pendentes. */
export class Sessao {
  modelo: BuildingModel;
  /** Revisão: muda a cada alteração; uma prévia só pode ser aplicada na revisão em que foi feita. */
  rev = 0;
  /**
   * Revisão de cálculo: muda só com os comandos que alteram o cálculo (e com o desfazer/refazer deles). Análise,
   * dimensionamento e caches comparam esta revisão; mudar só dados de prancha não os invalida.
   */
  revCalculo = 0;
  /** Revisão do cálculo das fundações: muda com tudo que muda `revCalculo` e com os comandos só de fundação. */
  revFundacao = 0;
  /**
   * Revisão do dimensionamento e do detalhamento: muda com tudo que muda `revCalculo` e com os comandos só de detalhe
   * (tabelas, armadura bloqueada, opções de detalhamento). Só `revDetalhe` mudou = a análise vale e basta rearmar.
   */
  revDetalhe = 0;
  /**
   * Revisão dos esforços: muda só com os comandos de cálculo pleno. Quando só `revCalculo` mudou (seções alteradas),
   * os esforços da última análise ainda servem para "rearmar" os elementos alterados (com aviso ESFORCO_ANTIGO).
   */
  revEsforcos = 0;
  log: Entrada[];
  private feitos: Passo[] = [];
  private desfeitos: Passo[] = [];
  private previas = new Map<string, { nome: string; params: Record<string, unknown>; rev: number }>();
  static readonly LIMITE_DESFAZER = 200;

  constructor(modelo: BuildingModel = edificioVazio(), log: Entrada[] = []) {
    this.modelo = modelo;
    this.log = [...log];
  }

  executar(nome: string, params: unknown, autor: Autor = 'usuario'): Resultado {
    const r = aplicarComando(this.modelo, nome, params);
    if (!r.ok) return { ok: false, erros: r.erros };
    if (REGISTRO.get(nome)!.risco === 'leitura') return { ok: true, erros: [], mensagem: r.mensagem };
    const entrada: Entrada = { t: new Date().toISOString(), nome, params: r.params!, autor };
    this.modelo = r.modelo;
    const calculo = afetaCalculo(nome, r.params, r.modelo), fundacao = afetaFundacao(nome, r.params, r.modelo), detalhe = afetaDetalhe(nome, r.params, r.modelo), esforcos = afetaEsforcos(nome, r.params, r.modelo);
    this.rev++;
    if (calculo) this.revCalculo++;
    if (fundacao) this.revFundacao++;
    if (detalhe) this.revDetalhe++;
    if (esforcos) this.revEsforcos++;
    this.log.push(entrada);
    this.feitos = [...this.feitos.slice(-(Sessao.LIMITE_DESFAZER - 1)), { entrada, patches: r.patches!, inversos: r.inversos!, calculo, fundacao, detalhe, esforcos }];
    this.desfeitos = [];
    this.previas.clear();
    return { ok: true, erros: [], diff: r.diff, mensagem: r.mensagem };
  }

  /** Calcula o efeito sem aplicar; devolve o diff e um token para `aplicar`. */
  previa(nome: string, params: unknown): Resultado {
    const r = aplicarComando(this.modelo, nome, params);
    if (!r.ok) return { ok: false, erros: r.erros };
    const token = `${this.rev}-${(this.previas.size + 1).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.previas.set(token, { nome, params: r.params!, rev: this.rev });
    return { ok: true, erros: [], diff: r.diff, mensagem: r.mensagem, token };
  }

  aplicar(token: string, autor: Autor = 'ia'): Resultado {
    const p = this.previas.get(token);
    if (!p) return { ok: false, erros: [erro('PREVIA_INVALIDA', 'Prévia desconhecida ou já usada.')] };
    if (p.rev !== this.rev) return { ok: false, erros: [erro('PREVIA_DESATUALIZADA', 'O modelo mudou depois da prévia; refaça a prévia.')] };
    return this.executar(p.nome, p.params, autor);
  }

  get podeDesfazer() { return this.feitos.length > 0; }
  get podeRefazer() { return this.desfeitos.length > 0; }

  /** Desfaz o último comando; o log acompanha (o replay do log sempre reproduz o modelo atual). */
  desfazer(): Entrada | null {
    const p = this.feitos.pop();
    if (!p) return null;
    this.modelo = applyPatches(this.modelo, p.inversos);
    this.log.pop();
    this.desfeitos.push(p);
    this.rev++;
    if (p.calculo) this.revCalculo++;
    if (p.fundacao) this.revFundacao++;
    if (p.detalhe) this.revDetalhe++;
    if (p.esforcos) this.revEsforcos++;
    this.previas.clear();
    return p.entrada;
  }

  refazer(): Entrada | null {
    const p = this.desfeitos.pop();
    if (!p) return null;
    this.modelo = applyPatches(this.modelo, p.patches);
    this.log.push(p.entrada);
    this.feitos.push(p);
    this.rev++;
    if (p.calculo) this.revCalculo++;
    if (p.fundacao) this.revFundacao++;
    if (p.detalhe) this.revDetalhe++;
    if (p.esforcos) this.revEsforcos++;
    this.previas.clear();
    return p.entrada;
  }

  verificar(): Diagnostico[] { return verificar(this.modelo); }
}

/** Reconstrói o modelo a partir do log. Lança erro no primeiro comando que falhar. */
export function replay(log: Entrada[], base: BuildingModel = edificioVazio()): BuildingModel {
  let b = base;
  log.forEach((e, i) => {
    const r = aplicarComando(b, e.nome, e.params);
    if (!r.ok) throw new Error(`Replay parou no comando ${i + 1} (${e.nome}): ${r.erros.map((x) => x.mensagem).join(' ')}`);
    b = r.modelo;
  });
  return b;
}
