// Linha de comando do Statikos (Node): mesmo núcleo do app, sem navegador.
import { comandosEdificioPadrao, listarComandos, Sessao, type Entrada } from '../core/commands';
import { compactarLog, lerEdificio, WORKSPACE_FORMAT } from '../core/building/file';
import { edificioVazio, pavimentosOrdenados, peDireito } from '../core/building/types';
import { emptyModel } from '../core/types';
import type { Diagnostico } from '../core/building/verify';

export interface Io {
  ler(caminho: string): string;
  gravar(caminho: string, texto: string): void;
  out(texto: string): void;
  err(texto: string): void;
}

export const AJUDA = `statikos — linha de comando do Statikos (módulo Edifícios)

Uso:
  statikos novo <arquivo.statikos> [--vazio]       cria um trabalho com o edifício padrão (ou vazio)
  statikos info <arquivo.statikos> [--json]        resumo da obra e dos pavimentos
  statikos verificar <arquivo.statikos> [--json]   verificação de lançamento (sai com código 1 se houver erro)
  statikos exec <arquivo.statikos> <comandos.jsonl> [--previa] [--saida <outro.statikos>]
                                                   executa comandos (uma linha JSON por comando: {"nome": ..., "params": {...}})
  statikos comandos [--json]                       lista os comandos e seus parâmetros (JSON Schema)
  statikos mcp                                     servidor MCP em stdio (para agentes de IA)
`;

/** Abre a sessão do edifício de um arquivo de trabalho (sem edifício: começa vazio). */
export function abrirSessao(texto: string): { sessao: Sessao; arquivo: Record<string, unknown> } {
  const arquivo = JSON.parse(texto) as Record<string, unknown>;
  const ed = lerEdificio(arquivo);
  return { sessao: ed ? new Sessao(ed.building, ed.buildingLog) : new Sessao(edificioVazio()), arquivo };
}

/** Grava o edifício no arquivo de trabalho, preservando o resto (pórtico, biblioteca, histórico). */
export function salvarSessao(sessao: Sessao, arquivo: Record<string, unknown> | null): string {
  const base = arquivo && arquivo.format === WORKSPACE_FORMAT ? arquivo : { format: WORKSPACE_FORMAT, model: { ...emptyModel(), name: sessao.modelo.obra.nome }, library: [], history: [] };
  return JSON.stringify({ ...base, version: 2, savedAt: new Date().toISOString(), building: sessao.modelo, buildingLog: compactarLog(sessao.modelo, sessao.log) });
}

export function novoTrabalho(vazio: boolean): Sessao {
  const s = new Sessao();
  if (!vazio) for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}

export function resumo(s: Sessao) {
  const b = s.modelo;
  return {
    obra: b.obra, norma: b.norma,
    pavimentos: pavimentosOrdenados(b).map((p) => ({ id: p.id, nome: p.nome, cota: p.cota, peDireito: +peDireito(b, p.id).toFixed(3), grupo: b.grupos.find((g) => g.id === p.grupo)?.nome ?? p.grupo })),
    grupos: b.grupos, eixos: b.eixos.length, comandosNoLog: s.log.length,
  };
}

const linhaDiag = (d: Diagnostico) => `${d.severidade.toUpperCase().padEnd(5)} ${d.codigo}  ${d.mensagem}${d.sugestao ? `  → ${d.sugestao.texto} (${d.sugestao.comando} ${JSON.stringify(d.sugestao.params)})` : ''}`;

/** Executa a linha de comando; devolve o código de saída. */
export function runCli(args: string[], io: Io): number {
  const [cmd, ...rest] = args;
  const flag = (f: string) => rest.includes(f);
  const pos = rest.filter((a, i) => !a.startsWith('--') && rest[i - 1] !== '--saida');
  const json = flag('--json');
  try {
    switch (cmd) {
      case 'novo': {
        if (!pos[0]) break;
        const s = novoTrabalho(flag('--vazio'));
        io.gravar(pos[0], salvarSessao(s, null));
        io.out(`Criado ${pos[0]} com ${s.modelo.pavimentos.length} pavimento(s).`);
        return 0;
      }
      case 'info': {
        if (!pos[0]) break;
        const r = resumo(abrirSessao(io.ler(pos[0])).sessao);
        if (json) io.out(JSON.stringify(r, null, 1));
        else {
          io.out(`${r.obra.nome} · fck ${r.norma.fck} MPa · CAA ${r.norma.caa} · fundação ${r.obra.profundidadeFundacao} m abaixo do pavimento mais baixo`);
          for (const p of [...r.pavimentos].reverse()) io.out(`  ${p.nome.padEnd(14)} cota ${p.cota.toFixed(2).padStart(7)}  pé-direito ${p.peDireito.toFixed(2)}  grupo ${p.grupo}`);
          io.out(`${r.eixos} eixo(s) · ${r.comandosNoLog} comando(s) no log`);
        }
        return 0;
      }
      case 'verificar': {
        if (!pos[0]) break;
        const d = abrirSessao(io.ler(pos[0])).sessao.verificar();
        if (json) io.out(JSON.stringify(d, null, 1));
        else io.out(d.length ? d.map(linhaDiag).join('\n') : 'Nenhum problema encontrado.');
        return d.some((x) => x.severidade === 'erro') ? 1 : 0;
      }
      case 'exec': {
        if (!pos[0] || !pos[1]) break;
        const { sessao, arquivo } = abrirSessao(io.ler(pos[0]));
        const linhas = io.ler(pos[1]).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
        const previa = flag('--previa');
        const saidas: unknown[] = [];
        for (const [i, l] of linhas.entries()) {
          const c = JSON.parse(l) as Pick<Entrada, 'nome' | 'params'>;
          const r = sessao.executar(c.nome, c.params ?? {}, 'arquivo');
          saidas.push({ linha: i + 1, nome: c.nome, ...r });
          if (!r.ok) {
            io.err(`Linha ${i + 1} (${c.nome}): ${r.erros.map((e) => e.mensagem).join(' ')}`);
            if (json) io.out(JSON.stringify(saidas, null, 1));
            return 2;
          }
          if (!json) io.out(`${i + 1}. ${r.mensagem ?? c.nome}${r.diff?.resumo.length ? `  [${r.diff.resumo.join('; ')}]` : ''}`);
        }
        if (json) io.out(JSON.stringify({ resultados: saidas, diagnosticos: sessao.verificar() }, null, 1));
        if (previa) { io.out('Prévia: nada foi gravado.'); return 0; }
        const destino = rest[rest.indexOf('--saida') + 1] && flag('--saida') ? rest[rest.indexOf('--saida') + 1] : pos[0];
        io.gravar(destino, salvarSessao(sessao, arquivo));
        if (!json) io.out(`Gravado em ${destino}.`);
        return 0;
      }
      case 'comandos': {
        const cs = listarComandos().map((c) => ({ nome: c.nome, risco: c.risco, descricao: c.descricao, schema: c.schema }));
        if (json) io.out(JSON.stringify(cs, null, 1));
        else for (const c of cs) io.out(`${c.nome.padEnd(20)} ${c.risco.padEnd(10)} ${c.descricao}`);
        return 0;
      }
      case undefined: case 'ajuda': case '--help': case '-h':
        io.out(AJUDA);
        return 0;
    }
  } catch (e) {
    io.err(`Erro: ${(e as Error).message}`);
    return 2;
  }
  io.err(AJUDA);
  return 64;
}
