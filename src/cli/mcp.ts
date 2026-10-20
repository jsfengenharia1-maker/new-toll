// Servidor MCP (JSON-RPC 2.0, uma mensagem por linha em stdio), sem SDK.
// Cada comando de escrita é exposto como ferramenta que só faz a PRÉVIA (diff + token);
// a alteração acontece em `aplicar`, com o token. Nunca há execução de código livre.
import { comandosEdificioPadrao, listarComandos, Sessao, type Resultado } from '../core/commands';
import { edificioVazio } from '../core/building/types';
import { PREMISSAS } from '../core/building/premissas';
import { abrirSessao, resumo, salvarSessao, type Io } from './run';

export const VERSAO_SERVIDOR = '0.1.0';
const PROTOCOLOS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

interface Req { jsonrpc: '2.0'; id?: number | string | null; method: string; params?: Record<string, unknown> }
type Res = { jsonrpc: '2.0'; id: number | string | null; result?: unknown; error?: { code: number; message: string } };

interface Ferramenta {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: false };
  executar(args: Record<string, unknown>): unknown;
}

const vazio = { type: 'object', properties: {}, additionalProperties: false };
export const nomeFerramenta = (comando: string) => comando.replace(/\./g, '_');

const INSTRUCOES = `Statikos: lançamento de edifícios de concreto armado.
Fluxo: abrir (ou novo) → ferramentas de comando (cada uma devolve só a PRÉVIA: diff e token) → aplicar {token} → verificar → salvar.
Unidades: m, kN, graus. Cotas são do topo da laje estrutural. Ids são estáveis (ex.: pav_4); nomes são só rótulos.
Consulte o recurso statikos://premissas antes de propor valores de cálculo.`;

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
      { name: 'verificar', title: 'Verificar lançamento', description: 'Diagnósticos (código, severidade, elementos, mensagem e correção sugerida executável).', inputSchema: vazio, annotations: ro(), executar: () => ({ diagnosticos: this.sessao.verificar() }) },
      { name: 'aplicar', title: 'Aplicar prévia', description: 'Aplica a alteração de uma prévia pelo token. Falha se o modelo mudou depois da prévia.', inputSchema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } }, additionalProperties: false }, annotations: rw(true),
        executar: (a) => this.saida(this.sessao.aplicar(String(a.token), 'ia')) },
      { name: 'comandos', title: 'Comandos disponíveis', description: 'Lista todos os comandos do registro (nome, risco, descrição e JSON Schema dos parâmetros), inclusive os sem ferramenta própria.', inputSchema: vazio, annotations: ro(),
        executar: () => ({ comandos: listarComandos().map((c) => ({ nome: c.nome, risco: c.risco, descricao: c.descricao, schema: c.schema })) }) },
      { name: 'previa', title: 'Prévia de qualquer comando', description: 'Prévia genérica: {comando, params}. Devolve o diff e um token para a ferramenta aplicar. Use para comandos sem ferramenta própria (veja `comandos`).', inputSchema: { type: 'object', required: ['comando'], properties: { comando: { type: 'string' }, params: { type: 'object' } }, additionalProperties: false }, annotations: ro(),
        executar: (a) => this.saida(this.sessao.previa(String(a.comando), a.params ?? {})) },
      { name: 'desfazer', title: 'Desfazer', description: 'Desfaz o último comando aplicado.', inputSchema: vazio, annotations: rw(false), executar: () => ({ desfeito: this.sessao.desfazer()?.nome ?? null }) },
      { name: 'refazer', title: 'Refazer', description: 'Refaz o último comando desfeito.', inputSchema: vazio, annotations: rw(false), executar: () => ({ refeito: this.sessao.refazer()?.nome ?? null }) },
    ];
    const cmds: Ferramenta[] = listarComandos().filter((c) => c.risco !== 'leitura' && c.mcp !== false).map((c) => ({
      name: nomeFerramenta(c.nome), title: c.nome,
      description: `${c.descricao} PRÉVIA: não altera o modelo; devolve o diff e um token para a ferramenta aplicar.${c.risco === 'destrutivo' ? ' Remove dados: confirme com o usuário antes de aplicar.' : ''}`,
      inputSchema: c.schema, annotations: ro(c.risco === 'destrutivo'),
      executar: (a) => this.saida(this.sessao.previa(c.nome, a)),
    }));
    this.ferramentas = [...base, ...cmds];
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
        return ok({ tools: this.ferramentas.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })) });
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
      case 'resources/read': {
        const uri = String(p.uri);
        const dados = uri === 'statikos://modelo' ? this.sessao.modelo : uri === 'statikos://diagnosticos' ? this.sessao.verificar()
          : uri === 'statikos://premissas' ? PREMISSAS : uri === 'statikos://log' ? this.sessao.log : undefined;
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
];
