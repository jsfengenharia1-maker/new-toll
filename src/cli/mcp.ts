// Servidor MCP (JSON-RPC 2.0, uma mensagem por linha em stdio), sem SDK.
// Cada comando de escrita é exposto como ferramenta que só faz a PRÉVIA (diff + token);
// a alteração acontece em `aplicar`, com o token. Nunca há execução de código livre.
import { comandosEdificioPadrao, listarComandos, Sessao, type Resultado } from '../core/commands';
import { edificioVazio, pavimentosOrdenados, type BuildingModel } from '../core/building/types';
import { PREMISSAS } from '../core/building/premissas';
import { analisarEdificio, type AnaliseEdificio } from '../core/building/analitico';
import { resumoFundacao, type ResultadoFundacao } from '../core/building/fundacao';
import { comFundacao } from '../core/building/dimensionamento';
import { resumoVigaFundacao, type ResultadoVigaFundacao } from '../core/building/vigasFundacao';
import { resumoAnalise } from '../core/building/resumo';
import { resumoVigotas } from '../core/building/vigotas';
import { abrirSessao, dimensionar, gravarPranchas, resumo, TIPOS_PRANCHA, salvarSessao, type Io, type OpcoesSaidaPranchas } from './run';

export const VERSAO_SERVIDOR = '0.1.0';
const PROTOCOLOS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

interface Req { jsonrpc: '2.0'; id?: number | string | null; method: string; params?: Record<string, unknown> }
type Res = { jsonrpc: '2.0'; id: number | string | null; result?: unknown; error?: { code: number; message: string } };

interface Ferramenta {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  outputSchema?: object;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: false };
  executar(args: Record<string, unknown>): unknown;
}

const vazio = { type: 'object', properties: {}, additionalProperties: false };
export const nomeFerramenta = (comando: string) => comando.replace(/\./g, '_');

const INSTRUCOES = `Statikos: lançamento de edifícios de concreto armado.
Fluxo: abrir (ou novo) → ferramentas de comando (cada uma devolve só a PRÉVIA: diff e token) → aplicar {token} → verificar → salvar.
Unidades: m, kN, graus. Cotas são do topo da laje estrutural. Ids são estáveis (ex.: pav_4); nomes são só rótulos.
Consulte o recurso statikos://premissas antes de propor valores de cálculo; itens "a confirmar" não são norma conferida.
Resultados: dimensionar (filtros pavimento, so_problemas e fundacao) ou statikos://resultados/{pavimento}. Guia: docs/ia.md.`;

export class ServidorMcp {
  sessao = new Sessao(edificioVazio());
  arquivo: string | null = null;
  private bruto: Record<string, unknown> | null = null;
  private ferramentas: Ferramenta[];
  private io: Io;

  constructor(io: Io) {
    this.io = io;
    const ro = (destructive = false) => ({ readOnlyHint: true, destructiveHint: destructive, idempotentHint: true, openWorldHint: false as const });
    const rw = (destructive: boolean) => ({ readOnlyHint: false, destructiveHint: destructive, idempotentHint: false, openWorldHint: false as const });
    const base: Ferramenta[] = [
      { name: 'abrir', title: 'Abrir trabalho', description: 'Abre um arquivo .statikos e carrega o edifício (descarta o estado atual do servidor, não do disco).', inputSchema: { type: 'object', required: ['arquivo'], properties: { arquivo: { type: 'string' } }, additionalProperties: false }, annotations: rw(false),
        executar: (a) => { const t = this.io.ler(String(a.arquivo)); const r = abrirSessao(t); this.sessao = r.sessao; this.bruto = r.arquivo; this.arquivo = String(a.arquivo); return resumo(this.sessao); } },
      { name: 'novo', title: 'Novo edifício', description: 'Começa um edifício novo: "padrao" (térreo, 3 tipos e cobertura) ou "vazio".', inputSchema: { type: 'object', properties: { modelo: { type: 'string', enum: ['padrao', 'vazio'], default: 'padrao' } }, additionalProperties: false }, annotations: rw(false),
        executar: (a) => { this.sessao = new Sessao(); this.bruto = null; this.arquivo = null; if (a.modelo !== 'vazio') for (const c of comandosEdificioPadrao()) this.sessao.executar(c.nome, c.params, 'sistema'); return resumo(this.sessao); } },
      { name: 'salvar', title: 'Salvar trabalho', description: 'Grava o edifício no arquivo .statikos (sobrescreve; preserva pórtico, biblioteca e histórico do arquivo aberto).', inputSchema: { type: 'object', properties: { arquivo: { type: 'string' } }, additionalProperties: false }, annotations: rw(true),
        executar: (a) => { const destino = (a.arquivo as string | undefined) ?? this.arquivo; if (!destino) throw new Error('Informe o arquivo.'); this.io.gravar(destino, salvarSessao(this.sessao, this.bruto)); this.arquivo = destino; return { gravado: destino }; } },
      { name: 'resumo', title: 'Resumo da obra', description: 'Obra, norma, pavimentos (com pé-direito e grupo), grupos e contagens.', inputSchema: vazio, annotations: ro(), executar: () => resumo(this.sessao) },
      { name: 'modelo', title: 'Modelo completo', description: 'O modelo físico do edifício em JSON.', inputSchema: vazio, annotations: ro(), executar: () => this.sessao.modelo },
      { name: 'verificar', title: 'Verificar lançamento', description: 'Diagnósticos (código, severidade, elementos, mensagem e correção sugerida executável).', inputSchema: vazio, outputSchema: { type: 'object', properties: { diagnosticos: { type: 'array', items: DIAG } } }, annotations: ro(), executar: () => ({ diagnosticos: this.sessao.verificar() }) },
      { name: 'calcular', title: 'Calcular o edifício', description: 'Análise do modelo atual: grelha de lajes e vigas por pavimento + pórtico espacial com diafragma rígido (casos G, Q e vento NBR 6123; γz). Devolve cargas na fundação por pilar, flechas elásticas das lajes, equilíbrio e avisos.', inputSchema: vazio, annotations: ro(),
        executar: () => resumoAnalise(this.sessao.modelo, analisarEdificio(this.sessao.modelo)) },
      { name: 'dimensionar', title: 'Dimensionar o edifício', description: 'Analisa e dimensiona pela NBR 6118: vigas (flexão e cortante), pilares por lance (pilar-padrão + flexão oblíqua por fibras), lajes maciças (As por metro e flecha) e treliçadas (resumo das vigotas por laje: grupos, adicional, negativos, maciçamento; aço e treliças); quantitativos por pavimento e cargas características por pilar para o módulo Fundações; fundações lançadas no edifício (sapatas, blocos sobre estacas, tubulões: dimensões, σadm, volume, situação e mensagens FUND_*). Filtros opcionais: um pavimento (id ou nome), só os elementos que não atendem ou pedem revisão e só a fundação. status: ok | review (revisar) | fail (não atende).',
        inputSchema: { type: 'object', additionalProperties: false, properties: { pavimento: { type: 'string', description: 'id ou nome do pavimento' }, so_problemas: { type: 'boolean', default: false }, fundacao: { type: 'boolean', default: false, description: 'só as fundações lançadas (resumo por elemento, vigas de equilíbrio e de travamento) e as cargas por pilar' } } },
        outputSchema: SAIDA_DIM, annotations: ro(),
        executar: (a) => filtrarDim(this.sessao.modelo, this.resultados(), a.pavimento as string | undefined, !!a.so_problemas, !!a.fundacao) },
      { name: 'pranchas', title: 'Gerar pranchas', description: 'Gera pranchas pelo tipo: formas (padrão; uma por grupo), locacao (eixos, pilares e tabela de cargas características e de cálculo), fundacao (locação e planta de cargas por nível, detalhamento de sapatas, blocos, tubulões e vigas de fundação com arranques, e quantitativos; siglas SFS direta e SFN indireta), vigas, pilares (com o quadro de pilares) e lajes (armação, com tabela de aço e resumo com perdas por folha) ou todas (conjunto numerado). Armação e cargas calculam e dimensionam o edifício antes. PDF com todas as páginas, DXF R2000 e DWG R2018 (uma prancha por arquivo). Carimbo e opções das pranchas de armação pelo comando prancha.definir. Grava nos caminhos informados (sobrescreve).',
        inputSchema: { type: 'object', additionalProperties: false, properties: {
          pdf: { type: 'string' }, dxf: { type: 'string' }, dwg: { type: 'string' }, grupo: { type: 'string', description: 'id ou nome do grupo (padrão: todos)' },
          tipo: { type: 'string', enum: TIPOS_PRANCHA, default: 'formas', description: 'formas | locacao | fundacao | vigas | pilares | lajes | todas' },
          formato: { type: 'string', enum: ['auto', 'A0', 'A1', 'A2', 'A3', 'A4'] }, escala: { type: 'number', enum: [0, 20, 25, 50, 75, 100, 125, 200, 250] },
        } }, outputSchema: { type: 'object', properties: { pranchas: { type: 'array', items: { type: 'object', properties: { titulo: { type: 'string' }, tipo: { type: 'string' }, formato: { type: 'string' }, escala: { type: 'string' }, avisos: { type: 'array', items: { type: 'string' } }, pesoAco: { type: 'number' }, pesoComPerdas: { type: 'number' } } } }, avisos: { type: 'array', items: { type: 'string' } }, gravados: { type: 'array', items: { type: 'string' } } } }, annotations: rw(true),
        executar: (a) => gravarPranchas(this.sessao.modelo, a as OpcoesSaidaPranchas, this.io) },
      { name: 'aplicar', title: 'Aplicar prévia', description: 'Aplica a alteração de uma prévia pelo token. Falha se o modelo mudou depois da prévia.', inputSchema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } }, additionalProperties: false }, outputSchema: SAIDA_ALTERACAO, annotations: rw(true),
        executar: (a) => this.saida(this.sessao.aplicar(String(a.token), 'ia')) },
      { name: 'comandos', title: 'Comandos disponíveis', description: 'Lista todos os comandos do registro (nome, risco, descrição e JSON Schema dos parâmetros), inclusive os sem ferramenta própria.', inputSchema: vazio, annotations: ro(),
        executar: () => ({ comandos: listarComandos().map((c) => ({ nome: c.nome, risco: c.risco, descricao: c.descricao, schema: c.schema })) }) },
      { name: 'previa', title: 'Prévia de qualquer comando', description: 'Prévia genérica: {comando, params}. Devolve o diff e um token para a ferramenta aplicar. Use para comandos sem ferramenta própria (veja `comandos`).', inputSchema: { type: 'object', required: ['comando'], properties: { comando: { type: 'string' }, params: { type: 'object' } }, additionalProperties: false }, outputSchema: SAIDA_ALTERACAO, annotations: ro(),
        executar: (a) => this.saida(this.sessao.previa(String(a.comando), a.params ?? {})) },
      { name: 'desfazer', title: 'Desfazer', description: 'Desfaz o último comando aplicado.', inputSchema: vazio, annotations: rw(false), executar: () => ({ desfeito: this.sessao.desfazer()?.nome ?? null }) },
      { name: 'refazer', title: 'Refazer', description: 'Refaz o último comando desfeito.', inputSchema: vazio, annotations: rw(false), executar: () => ({ refeito: this.sessao.refazer()?.nome ?? null }) },
    ];
    const cmds: Ferramenta[] = listarComandos().filter((c) => c.risco !== 'leitura' && c.mcp !== false).map((c) => ({
      name: nomeFerramenta(c.nome), title: c.nome,
      description: `${c.descricao} PRÉVIA: não altera o modelo; devolve o diff e um token para a ferramenta aplicar.${c.risco === 'destrutivo' ? ' Remove dados: confirme com o usuário antes de aplicar.' : ''}`,
      inputSchema: c.schema, outputSchema: SAIDA_ALTERACAO, annotations: ro(c.risco === 'destrutivo'),
      executar: (a) => this.saida(this.sessao.previa(c.nome, a)),
    }));
    this.ferramentas = [...base, ...cmds];
  }

  private cache: { sessao: Sessao; revCalculo: number; revFundacao: number; an: AnaliseEdificio; dim: ReturnType<typeof dimensionar> } | null = null;
  /**
   * Dimensionamento do modelo atual: refeito só se a revisão de cálculo mudou (dados de prancha não contam); se só a
   * fundação mudou, recalcula só as fundações com a análise guardada.
   */
  private resultados() {
    const s = this.sessao, c = this.cache;
    if (!c || c.sessao !== s || c.revCalculo !== s.revCalculo) { const an = analisarEdificio(s.modelo); this.cache = { sessao: s, revCalculo: s.revCalculo, revFundacao: s.revFundacao, an, dim: dimensionar(s.modelo, an) }; }
    else if (c.revFundacao !== s.revFundacao) {
      const dim = 'erro' in c.dim ? dimensionar(s.modelo, c.an) : { ...c.dim, vigasFundacao: undefined, avisosFundacao: undefined, ...comFundacao(s.modelo, c.an) };
      this.cache = { ...c, revFundacao: s.revFundacao, dim };
    }
    return this.cache!.dim;
  }

  private saida(r: Resultado) {
    if (!r.ok) throw new ErroFerramenta(r);
    return { ...r, diagnosticos: this.sessao.verificar() };
  }

  /** Trata uma mensagem; devolve a resposta (null para notificações). */
  handle(m: Req): Res | null {
    const id = m.id ?? null;
    const ok = (result: unknown): Res => ({ jsonrpc: '2.0', id, result });
    const fail = (code: number, message: string): Res => ({ jsonrpc: '2.0', id, error: { code, message } });
    if (m.id === undefined) return null; // notificação
    const p = m.params ?? {};
    switch (m.method) {
      case 'initialize': {
        const pedido = String(p.protocolVersion ?? '');
        return ok({
          protocolVersion: PROTOCOLOS.includes(pedido) ? pedido : '2025-06-18',
          capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
          serverInfo: { name: 'statikos', title: 'Statikos', version: VERSAO_SERVIDOR },
          instructions: INSTRUCOES,
        });
      }
      case 'ping': return ok({});
      case 'tools/list':
        return ok({ tools: this.ferramentas.map(({ name, title, description, inputSchema, outputSchema, annotations }) => ({ name, title, description, inputSchema, outputSchema: outputSchema ?? SAIDA_LIVRE, annotations })) });
      case 'tools/call': {
        const f = this.ferramentas.find((x) => x.name === p.name);
        if (!f) return fail(-32602, `Ferramenta desconhecida: ${String(p.name)}`);
        try {
          const r = f.executar((p.arguments as Record<string, unknown>) ?? {});
          return ok({ content: [{ type: 'text', text: JSON.stringify(r) }], structuredContent: r });
        } catch (e) {
          const r = e instanceof ErroFerramenta ? { ok: false, erros: e.r.erros } : { ok: false, erros: [{ codigo: 'FALHA', severidade: 'erro', elementos: [], mensagem: (e as Error).message }] };
          return ok({ content: [{ type: 'text', text: JSON.stringify(r) }], structuredContent: r, isError: true });
        }
      }
      case 'resources/list':
        return ok({ resources: RECURSOS.map(([uri, name, description]) => ({ uri, name, description, mimeType: 'application/json' })) });
      case 'resources/templates/list':
        return ok({ resourceTemplates: [{ uriTemplate: 'statikos://resultados/{pavimento}', name: 'resultados-pavimento', description: 'Dimensionamento de um pavimento (id ou nome): vigas do grupo, lances de pilar que chegam a ele, lajes e quantitativos', mimeType: 'application/json' }] });
      case 'resources/read': {
        const uri = String(p.uri);
        const dados = uri === 'statikos://modelo' ? this.sessao.modelo : uri === 'statikos://diagnosticos' ? this.sessao.verificar()
          : uri === 'statikos://premissas' ? PREMISSAS : uri === 'statikos://log' ? this.sessao.log
          : uri === 'statikos://resultados' ? filtrarDim(this.sessao.modelo, this.resultados())
          : uri.startsWith('statikos://resultados/') ? filtrarDim(this.sessao.modelo, this.resultados(), decodeURIComponent(uri.slice('statikos://resultados/'.length))) : undefined;
        if (dados === undefined) return fail(-32002, `Recurso desconhecido: ${uri}`);
        return ok({ contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(dados) }] });
      }
      default: return fail(-32601, `Método não suportado: ${m.method}`);
    }
  }

  /** Trata uma linha recebida em stdio; devolve a linha de resposta (ou null). */
  linha(l: string): string | null {
    let m: Req;
    try { m = JSON.parse(l); } catch { return JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }); }
    const r = this.handle(m);
    return r ? JSON.stringify(r) : null;
  }
}

class ErroFerramenta extends Error {
  r: Resultado;
  constructor(r: Resultado) { super(r.erros.map((e) => e.mensagem).join(' ')); this.r = r; }
}

const RECURSOS: [string, string, string][] = [
  ['statikos://modelo', 'modelo', 'Modelo físico do edifício'],
  ['statikos://diagnosticos', 'diagnosticos', 'Verificação de lançamento'],
  ['statikos://premissas', 'premissas', 'Premissas de cálculo em uso (fonte e "a confirmar")'],
  ['statikos://log', 'log', 'Log de comandos (reproduz o modelo)'],
  ['statikos://resultados', 'resultados', 'Dimensionamento de todo o edifício (calcula se o modelo mudou)'],
];

/** Recorte do dimensionamento por pavimento (id ou nome) e/ou só o que não atende. */
export function filtrarDim(b: BuildingModel, d: ReturnType<typeof dimensionar>, pavimento?: string, soProblemas = false, soFundacao = false) {
  if ('erro' in d) return d;
  const fprob = (xs: ResultadoFundacao[]) => (soProblemas ? xs.filter((x) => x.status !== 'ok') : xs).map(resumoFundacao);
  const vprob = (xs: ResultadoVigaFundacao[]) => (soProblemas ? xs.filter((x) => x.status !== 'ok') : xs).map(resumoVigaFundacao);
  // vigas de equilíbrio e de travamento (FU2): resumo sem diagramas; avisos gerais das fundações
  const vigasF = () => ({ ...(d.vigasFundacao?.length ? { vigasFundacao: vprob(d.vigasFundacao) } : {}), ...(d.avisosFundacao?.length ? { avisosFundacao: d.avisosFundacao } : {}) });
  if (soFundacao) return { fundacoes: fprob(d.fundacoes ?? []), ...vigasF(), fundacao: d.fundacao, resumo: { fundacoes: contaStatus(d.fundacoes ?? []), ...(d.vigasFundacao?.length ? { vigasFundacao: contaStatus(d.vigasFundacao) } : {}) } };
  const pav = pavimento ? b.pavimentos.find((p) => p.id === pavimento || p.nome.toLowerCase() === pavimento.toLowerCase()) : undefined;
  if (pavimento && !pav) throw new Error(`Pavimento ${pavimento} não existe.`);
  const prob = <T extends { status: string }>(xs: T[]) => (soProblemas ? xs.filter((x) => x.status !== 'ok') : xs);
  const maisBaixo = pavimentosOrdenados(b)[0]?.id;
  return {
    ...(pav ? { pavimento: { id: pav.id, nome: pav.nome, cota: pav.cota } } : {}),
    // envoltórias ao longo da viga e combinações dos pilares ficam fora (volume); a combinação determinante da viga fica
    vigas: prob(pav ? d.vigas.filter((v) => v.grupo === pav.grupo) : d.vigas).map(({ envoltoria, ...v }) => ({ ...v, determinantes: envoltoria.determinantes })),
    pilares: prob(pav ? d.pilares.filter((p) => p.pavimento === pav.nome) : d.pilares).map(({ determinantes: _d, ...p }) => p),
    lajes: prob(pav ? d.lajes.filter((l) => l.pavimento === pav.nome) : d.lajes),
    quantitativos: pav ? d.quantitativos.filter((q) => q.pavimento === pav.nome) : d.quantitativos,
    ...(!pav || pav.id === maisBaixo ? { fundacao: d.fundacao, ...(d.fundacoes?.length ? { fundacoes: fprob(d.fundacoes) } : {}), ...vigasF() } : {}),
    combinacoes: d.combinacoes,
    ...(d.resumoAcoVigas ? { resumoAcoVigas: d.resumoAcoVigas } : {}),
    ...(d.resumoAcoPilares ? { resumoAcoPilares: d.resumoAcoPilares } : {}),
    ...(d.resumoAcoLajes ? { resumoAcoLajes: d.resumoAcoLajes } : {}),
    // treliçadas: só o resumo por laje (sem os alinhamentos e diagramas) e o aço/treliças
    ...(d.vigotas?.length ? { vigotas: prob(pav ? d.vigotas.filter((v) => v.pavimentos.includes(pav.nome)) : d.vigotas).map(resumoVigotas) } : {}),
    ...(d.resumoAcoVigotas?.length ? { resumoAcoVigotas: d.resumoAcoVigotas, trelicas: d.trelicas } : {}),
    resumo: { vigas: contaStatus(d.vigas), pilares: contaStatus(d.pilares), lajes: contaStatus(d.lajes), ...(foraTabela(d) ? { foraDeTabela: foraTabela(d) } : {}), ...(d.fundacoes?.length ? { fundacoes: contaStatus(d.fundacoes) } : {}), ...(d.vigasFundacao?.length ? { vigasFundacao: contaStatus(d.vigasFundacao) } : {}) },
  };
}
/** Elementos com armadura fora das tabelas de armadura (R7a): fora de tabela ou armadura manual necessária. */
const foraTabela = (d: { vigas: { mensagens: string[] }[]; pilares: { mensagens: string[] }[]; lajes: { mensagens: string[] }[] }) =>
  [...d.vigas, ...d.pilares, ...d.lajes].filter((x) => x.mensagens.some((m) => /^(Fora de tabela|Armadura manual necessária)/.test(m))).length;
const contaStatus = (xs: { status: string }[]) => ({ total: xs.length, ok: xs.filter((x) => x.status === 'ok').length, revisar: xs.filter((x) => x.status === 'review').length, naoAtende: xs.filter((x) => x.status === 'fail').length });

const SAIDA_LIVRE = { type: 'object' };
const DIAG = { type: 'object', properties: { codigo: { type: 'string' }, severidade: { type: 'string', enum: ['erro', 'aviso', 'info'] }, elementos: { type: 'array', items: { type: 'string' } }, mensagem: { type: 'string' }, sugestao: { type: 'object' } } };
const SAIDA_ALTERACAO = { type: 'object', properties: {
  ok: { type: 'boolean' }, mensagem: { type: 'string' }, token: { type: 'string', description: 'passe para a ferramenta aplicar' },
  diff: { type: 'object', properties: { criados: { type: 'array', items: { type: 'string' } }, alterados: { type: 'array', items: { type: 'string' } }, removidos: { type: 'array', items: { type: 'string' } }, resumo: { type: 'array', items: { type: 'string' } } } },
  erros: { type: 'array', items: DIAG }, diagnosticos: { type: 'array', items: DIAG },
} };
const ELEM = { type: 'array', items: { type: 'object', properties: { nome: { type: 'string' }, status: { type: 'string', enum: ['ok', 'review', 'fail'] }, mensagens: { type: 'array', items: { type: 'string' } } } } };
const SAIDA_DIM = { type: 'object', properties: {
  vigas: ELEM, pilares: ELEM, lajes: ELEM, vigotas: { type: 'array' }, resumoAcoVigotas: { type: 'array' }, trelicas: { type: 'array' }, quantitativos: { type: 'array' }, fundacao: { type: 'array' }, fundacoes: ELEM, vigasFundacao: ELEM, avisosFundacao: { type: 'array', items: { type: 'string' } }, combinacoes: { type: 'number' },
  resumo: { type: 'object' }, erro: { type: 'string' },
} };
