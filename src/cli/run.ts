// Linha de comando do Statikos (Node): mesmo núcleo do app, sem navegador.
import { comandosEdificioPadrao, listarComandos, Sessao, type Entrada } from '../core/commands';
import { compactarLog, lerEdificio, WORKSPACE_FORMAT } from '../core/building/file';
import { edificioVazio, ehArranque, pavimentosOrdenados, peDireito, type BuildingModel, type Formato } from '../core/building/types';
import { emptyModel } from '../core/types';
import type { Diagnostico } from '../core/building/verify';
import { analisarEdificio, type AnaliseEdificio } from '../core/building/analitico';
import { resumoAnalise } from '../core/building/resumo';
import { cargasParaFundacao, comFundacao, dimensionarEdificio, type Dimensionamento } from '../core/building/dimensionamento';
import type { FLoad } from '../core/piles';
export { TIPOS_PRANCHA };
import { montarConjunto, PRECISA_CALCULO, tiposDe, TIPOS_PRANCHA, type TipoSaida } from '../core/sheets/conjunto';
import { escreverPdf } from '../core/sheets/pdf';
import { escreverDxf } from '../core/sheets/dxf';
import { desenhoDwg, type EscritorDwg } from '../core/sheets/dwg';

export interface Io {
  ler(caminho: string): string;
  gravar(caminho: string, texto: string): void;
  out(texto: string): void;
  err(texto: string): void;
  /** Grava arquivo binário (pranchas em PDF, DXF e DWG). */
  gravarBytes?(caminho: string, dados: Uint8Array): void;
  /** Escritor de DWG (public/vendor), quando carregado. */
  dwg?: EscritorDwg;
}

export interface OpcoesSaidaPranchas { pdf?: string; dxf?: string; dwg?: string; grupo?: string; formato?: Formato | 'auto'; escala?: number;
  /** formas (padrão) | locacao | fundacao | vigas | pilares | paredes | lajes | todas; armação e cargas calculam o edifício antes. */
  tipo?: TipoSaida | TipoSaida[] }

/**
 * Monta as pranchas do tipo pedido (padrão: formas; 'todas' = conjunto completo, numerado) e grava os arquivos.
 * DXF e DWG: uma prancha por arquivo (sufixo -2, -3...). Armação, locação e cargas calculam e dimensionam antes.
 */
export function gravarPranchas(b: BuildingModel, o: OpcoesSaidaPranchas, io: Io, armaduras?: Record<string, string>) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const tipos = tiposDe(o.tipo);
  if (o.grupo && !b.grupos.some((x) => x.id === o.grupo || x.nome.toLowerCase() === o.grupo!.toLowerCase())) throw new Error(`Grupo ${o.grupo} não existe.`);
  const calc = tipos.some((t) => PRECISA_CALCULO.includes(t) || t === 'locacao');
  const an = calc ? analisarEdificio(b) : null, dim = an && tipos.some((t) => PRECISA_CALCULO.includes(t) || t === 'formas') ? dimensionarEdificio(b, an) : null;
  const cj = montarConjunto(b, an, dim, { tipos, grupo: o.grupo, formato: o.formato, escala: o.escala, armaduras, carimbo: { data: b.prancha?.carimbo.data || hoje } });
  const prs = cj.pranchas;
  if (!prs.length) throw new Error(`Nenhuma prancha: ${cj.avisos.join(' ') || 'lance vigas ou lajes em algum grupo.'}`);
  if (!io.gravarBytes) throw new Error('Gravação de arquivos indisponível.');
  const gravados: string[] = [];
  const nomeN = (base: string, i: number) => (prs.length === 1 || i === 0 ? base : base.replace(/(\.[^.]+)?$/, (ext) => `-${i + 1}${ext}`));
  if (o.pdf) { io.gravarBytes(o.pdf, escreverPdf(prs, { titulo: `${b.obra.nome} — pranchas` })); gravados.push(o.pdf); }
  if (o.dxf) prs.forEach((pr, i) => { const c = nomeN(o.dxf!, i); io.gravarBytes!(c, escreverDxf(pr)); gravados.push(c); });
  if (o.dwg) {
    if (!io.dwg) throw new Error('Escritor de DWG não carregado (public/vendor/nasjidwg-*.mjs).');
    prs.forEach((pr, i) => {
      const r = io.dwg!(desenhoDwg(pr));
      if (r.skipped.length) throw new Error(`DWG: não gravado: ${r.skipped.join(', ')}`);
      const c = nomeN(o.dwg!, i); io.gravarBytes!(c, r.data); gravados.push(c);
    });
  }
  return { pranchas: prs.map((p) => ({ titulo: p.titulo, tipo: p.tipo ?? 'formas', formato: p.formato, escala: p.janela ? `1:${p.escala}` : 'indicada', avisos: p.avisos, ...(p.aco ? { pesoAco: +p.aco.peso.toFixed(2), pesoComPerdas: +p.aco.pesoComPerdas.toFixed(2) } : {}) })), avisos: cj.avisos, gravados };
}

export const AJUDA = `statikos — linha de comando do Statikos (módulo Edifícios)

Uso:
  statikos novo <arquivo.statikos> [--vazio]       cria um trabalho com o edifício padrão (ou vazio)
  statikos info <arquivo.statikos> [--json]        resumo da obra e dos pavimentos
  statikos verificar <arquivo.statikos> [--json]   verificação de lançamento (sai com código 1 se houver erro)
  statikos exec <arquivo.statikos> <comandos.jsonl> [--previa] [--saida <outro.statikos>]
                                                   executa comandos (uma linha JSON por comando: {"nome": ..., "params": {...}})
  statikos calc <arquivo.statikos> [--json]        análise (grelhas + pórtico espacial): cargas na fundação, flechas e equilíbrio
  statikos dim <arquivo.statikos> [--json]         dimensionamento NBR 6118 (vigas, pilares, lajes), quantitativos e cargas para Fundações
  statikos prancha <arquivo.statikos> [--pdf <saida.pdf>] [--dxf <saida.dxf>] [--dwg <saida.dwg>] [--tipo formas|locacao|fundacao|vigas|pilares|lajes|todas]
                   [--grupo <nome>] [--formato A0..A4] [--escala 50]
                                                   pranchas (padrão: formas; locação e cargas e armação calculam antes; PDF com todas;
                                                   DXF R2000 e DWG R2018, uma por arquivo)
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

/**
 * Análise + dimensionamento + cargas para o módulo Fundações + fundações lançadas (para a linha de comando e o MCP).
 * Obra só com arranques: calcula só a fundação.
 */
export function dimensionar(b: BuildingModel, an: AnaliseEdificio = analisarEdificio(b)) {
  if (an.erro || !an.portico.res) {
    if (b.pilares.every(ehArranque) && (b.fundacao?.elementos.length || b.fundacao?.corridas?.length))
      return { vigas: [], pilares: [], lajes: [], quantitativos: [], combinacoes: 0, fundacao: cargasParaFundacao(b, an), ...comFundacao(b, an) } as Dimensionamento & { fundacao: FLoad[] };
    return { erro: an.erro ?? 'Análise sem resultado.' };
  }
  return { ...dimensionarEdificio(b, an), fundacao: cargasParaFundacao(b, an) };
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
  const COM_VALOR = ['--saida', '--pdf', '--dxf', '--dwg', '--grupo', '--formato', '--escala'];
  const pos = rest.filter((a, i) => !a.startsWith('--') && !COM_VALOR.includes(rest[i - 1]));
  const valor = (f: string) => (rest.includes(f) ? rest[rest.indexOf(f) + 1] : undefined);
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
      case 'calc': {
        if (!pos[0]) break;
        const { sessao } = abrirSessao(io.ler(pos[0]));
        const r = resumoAnalise(sessao.modelo, analisarEdificio(sessao.modelo));
        if (json) io.out(JSON.stringify(r, null, 1));
        else if (r.erro) io.err(r.erro);
        else {
          io.out(`${r.gdl} gdl em ${r.ms} ms · cargas G ${r.totais.G} kN, Q ${r.totais.Q} kN · equilíbrio ΔG ${r.equilibrio.G} ΔQ ${r.equilibrio.Q}`);
          for (const f of r.fundacao) io.out(`  ${String(f.pilar).padEnd(6)} NG ${String(f.NG).padStart(9)}  NQ ${String(f.NQ).padStart(9)} kN`);
          for (const a of r.avisos) io.out(`aviso: ${a}`);
        }
        return r.erro ? 1 : 0;
      }
      case 'dim': {
        if (!pos[0]) break;
        const { sessao } = abrirSessao(io.ler(pos[0]));
        const r = dimensionar(sessao.modelo);
        if (json) io.out(JSON.stringify(r, null, 1));
        else if ('erro' in r) io.err(r.erro ?? 'Falha.');
        else {
          const linha = (n: string, xs: { status: string }[]) => `${n}: ${xs.filter((x) => x.status === 'ok').length}/${xs.length} ok`;
          io.out([linha('vigas', r.vigas), linha('pilares', r.pilares), linha('lajes', r.lajes)].join(' · '));
          for (const v of r.vigas) io.out(`  ${v.nome.padEnd(6)} ${`${Math.round(v.b * 100)}×${Math.round(v.h * 100)}`.padEnd(7)} inf ${v.barrasInf.padEnd(10)} sup ${v.barrasSup.padEnd(10)} ${v.estribo.padEnd(9)} ${v.status}`);
          for (const p of r.pilares) io.out(`  ${p.nome.padEnd(6)} ${p.pavimento.padEnd(12)} ${p.secao.padEnd(7)} Nd ${p.Nd.toFixed(0).padStart(6)}  ${p.armadura.padEnd(9)} ${p.status}`);
          for (const l of r.lajes) if (l.status !== 'ok') io.out(`  ${l.nome} (${l.pavimento}): ${l.mensagens.join(' ')}`);
          if (r.fundacoes?.length) {
            io.out(linha('fundações', r.fundacoes));
            for (const f of r.fundacoes) io.out(`  ${f.resumo}${f.pilares.length ? ` (${f.pilares.join(', ')})` : ''} · ${f.status}${f.mensagens.length ? ` · ${f.mensagens.join(' ')}` : ''}`);
          }
          if (r.vigasFundacao?.length) {
            io.out(linha('vigas de fundação', r.vigasFundacao));
            for (const v of r.vigasFundacao) io.out(`  ${v.resumo} (${v.ini}–${v.fim}) · ${v.status}${v.mensagens.length ? ` · ${v.mensagens.join(' ')}` : ''}`);
          }
          for (const x of r.corridas ?? []) io.out(`  ${x.resumo} (sapata corrida ${x.modo === 'pilares' ? 'sob pilares' : 'sob parede'})${x.pressao ? ` · σmáx ${x.pressao.sigmaMax.toFixed(1)} kN/m²` : ''} · ${x.status}${x.mensagens.length ? ` · ${x.mensagens.join(' ')}` : ''}`);
          for (const x of r.basesMuros ?? []) io.out(`  ${x.nome}: base do muro B = ${x.B.toFixed(2).replace('.', ',')} m · σmáx ${x.sigmaMax.toFixed(1)}${x.sigmaAdm ? `/${x.sigmaAdm.toFixed(0)}` : ''} kN/m² (${x.sigmaFonte}) · ${x.status}${x.mensagens.length ? ` · ${x.mensagens.join(' ')}` : ''}`);
          for (const x of [...(r.radiers ?? []), ...(r.vigasElasticas ?? [])]) io.out(`  ${x.nome}: σ ${x.sigmaMax.toFixed(1)}${x.sigmaAdm ? `/${x.sigmaAdm.toFixed(0)}` : ''} kN/m², recalque ${(x.recalque * 1000).toFixed(2)} mm · ${x.status}${x.mensagens.length ? ` · ${x.mensagens.join(' ')}` : ''}`);
          for (const a of r.avisosFundacao ?? []) io.out(`  ${a}`);
        }
        return 'erro' in r ? 1 : 0;
      }
      case 'prancha': {
        if (!pos[0] || !(valor('--pdf') || valor('--dxf') || valor('--dwg'))) break;
        const { sessao } = abrirSessao(io.ler(pos[0]));
        const esc = valor('--escala');
        const tp = valor('--tipo');
        if (tp && !tp.split(',').every((x) => (TIPOS_PRANCHA as string[]).includes(x))) { io.err(`Tipo de prancha inválido: ${tp}`); return 2; }
        const r = gravarPranchas(sessao.modelo, { tipo: tp ? (tp.split(',') as TipoSaida[]) : undefined, pdf: valor('--pdf'), dxf: valor('--dxf'), dwg: valor('--dwg'), grupo: valor('--grupo'), formato: valor('--formato') as Formato | undefined, escala: esc ? +esc : undefined }, io);
        if (json) io.out(JSON.stringify(r, null, 1));
        else {
          for (const p of r.pranchas) io.out(`${p.titulo}: ${p.formato} ${p.escala}${p.avisos.length ? ` — ${p.avisos.join(' ')}` : ''}`);
          io.out(`Gravado: ${r.gravados.join(', ')}`);
        }
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
