import { describe, expect, it } from 'vitest';
import { runCli, type Io } from './run';
import { nomeFerramenta, ServidorMcp } from './mcp';
import { listarComandos, replay } from '../core/commands';

function memIo(files: Record<string, string> = {}) {
  const out: string[] = [], err: string[] = [], bin: Record<string, Uint8Array> = {};
  const io: Io = {
    ler: (c) => { if (!(c in files)) throw new Error(`não encontrado: ${c}`); return files[c]; },
    gravar: (c, t) => { files[c] = t; },
    gravarBytes: (c, d) => { bin[c] = d; },
    out: (t) => out.push(t), err: (t) => err.push(t),
  };
  return { io, files, out, err, bin };
}

describe('linha de comando', () => {
  it('novo → exec → verificar → info, preservando o arquivo', () => {
    const m = memIo({ 'cmds.jsonl': [
      '# comentário',
      JSON.stringify({ nome: 'pavimento.repetir', params: { id: 'pav_6', vezes: 2 } }),
      JSON.stringify({ nome: 'eixo.malha', params: { dx: [5, 5], dy: [4] } }),
    ].join('\n') });
    expect(runCli(['novo', 'a.statikos'], m.io)).toBe(0);
    const f0 = JSON.parse(m.files['a.statikos']);
    expect(f0.format).toBe('statikos-workspace');
    expect(f0.version).toBe(2);
    expect(f0.model.version).toBe(1); // o app abre (pórtico vazio)

    expect(runCli(['exec', 'a.statikos', 'cmds.jsonl', '--previa'], m.io)).toBe(0);
    expect(m.files['a.statikos']).toBe(JSON.stringify(f0)); // prévia não grava

    expect(runCli(['exec', 'a.statikos', 'cmds.jsonl'], m.io)).toBe(0);
    const f1 = JSON.parse(m.files['a.statikos']);
    expect(f1.building.pavimentos).toHaveLength(7);
    expect(f1.building.eixos).toHaveLength(5);
    expect(replay(f1.buildingLog)).toEqual(f1.building);

    expect(runCli(['verificar', 'a.statikos'], m.io)).toBe(0);
    expect(m.out.at(-1)).toBe('Nenhum problema encontrado.');
    expect(runCli(['info', 'a.statikos', '--json'], m.io)).toBe(0);
    expect(JSON.parse(m.out.at(-1)!).pavimentos.at(-1)).toMatchObject({ nome: 'Cobertura', cota: 18, peDireito: 3 });
  });

  it('erro de comando para na linha e não grava; verificar sai com 1 se houver erro', () => {
    const m = memIo({ 'c.jsonl': JSON.stringify({ nome: 'pavimento.editar', params: { id: 'pav_6', cota: 9.4 } }) + '\n' + JSON.stringify({ nome: 'pavimento.criar', params: { nome: 'X', cota: 3 } }) });
    runCli(['novo', 'a.statikos'], m.io);
    const antes = m.files['a.statikos'];
    expect(runCli(['exec', 'a.statikos', 'c.jsonl'], m.io)).toBe(2);
    expect(m.err.at(-1)).toMatch(/^Linha 2 \(pavimento\.criar\): .*cota 3 m/);
    expect(m.files['a.statikos']).toBe(antes);
    m.files['c.jsonl'] = m.files['c.jsonl'].split('\n')[0];
    expect(runCli(['exec', 'a.statikos', 'c.jsonl', '--saida', 'b.statikos'], m.io)).toBe(0);
    expect(m.files['a.statikos']).toBe(antes);
    expect(runCli(['verificar', 'b.statikos'], m.io)).toBe(1);
    expect(m.out.at(-1)).toMatch(/GRUPO_PE_DIREITO/);
  });

  it('calc: análise do edifício em JSON, com equilíbrio', () => {
    const m = memIo({ 'c.jsonl': [
      JSON.stringify({ nome: 'lote', params: { comandos: [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.2 } } })) } }),
      JSON.stringify({ nome: 'lote', params: { comandos: [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) } }),
      JSON.stringify({ nome: 'laje.detectarPanos', params: { grupo: 'g_3' } }),
    ].join('\n') });
    runCli(['novo', 'a.statikos'], m.io);
    expect(runCli(['exec', 'a.statikos', 'c.jsonl'], m.io)).toBe(0);
    expect(runCli(['calc', 'a.statikos', '--json'], m.io)).toBe(0);
    const r = JSON.parse(m.out.at(-1)!);
    expect(r.fundacao).toHaveLength(4);
    expect(Math.abs(r.equilibrio.G)).toBeLessThan(1e-3);
    expect(r.totais.Q).toBeCloseTo(1.5 * 20 * 3, 1);
    expect(runCli(['dim', 'a.statikos', '--json'], m.io)).toBe(0);
    const d = JSON.parse(m.out.at(-1)!);
    expect(d.vigas).toHaveLength(4);
    expect(d.fundacao).toHaveLength(4);
    expect(d.pilares.every((p: { armadura: string }) => /φ/.test(p.armadura))).toBe(true);
    expect(runCli(['prancha', 'a.statikos', '--pdf', 'f.pdf', '--dxf', 'f.dxf', '--escala', '50'], m.io)).toBe(0);
    expect(m.out.at(-1)).toBe('Gravado: f.pdf, f.dxf');
    expect(new TextDecoder().decode(m.bin['f.pdf'].slice(0, 8))).toBe('%PDF-1.5');
    expect(new TextDecoder().decode(m.bin['f.dxf'])).toContain('AC1015');
    expect(runCli(['prancha', 'a.statikos', '--tipo', 'todas', '--pdf', 't.pdf', '--json'], m.io)).toBe(0);
    const pt = JSON.parse(m.out.at(-1)!);
    expect(pt.pranchas.map((p: { tipo: string }) => p.tipo)).toEqual(['locacao', 'formas', 'vigas', 'pilares', 'pilares', 'lajes', 'lajes']);
    expect(pt.pranchas[2].pesoAco).toBeGreaterThan(0);
    expect(runCli(['prancha', 'a.statikos', '--tipo', 'xyz', '--pdf', 'x.pdf'], m.io)).toBe(2);
    expect(runCli(['prancha', 'a.statikos', '--dwg', 'f.dwg'], m.io)).toBe(2);
    expect(m.err.at(-1)).toMatch(/DWG não carregado/);
  });

  it('uso inválido devolve 64 e a ajuda', () => {
    const m = memIo();
    expect(runCli(['xyz'], m.io)).toBe(64);
    expect(m.err[0]).toMatch(/^statikos/);
  });
});

describe('servidor MCP', () => {
  const rpc = (s: ServidorMcp, method: string, params?: object, id = 1) => JSON.parse(s.linha(JSON.stringify({ jsonrpc: '2.0', id, method, params }))!);
  const call = (s: ServidorMcp, name: string, args: object = {}) => rpc(s, 'tools/call', { name, arguments: args }).result;

  it('initialize, lista de ferramentas com annotations e schemas', () => {
    const s = new ServidorMcp(memIo().io);
    const init = rpc(s, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } }).result;
    expect(init.protocolVersion).toBe('2025-06-18');
    expect(init.serverInfo.name).toBe('statikos');
    expect(s.linha(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }))).toBeNull();
    const tools = rpc(s, 'tools/list').result.tools;
    expect(tools.length).toBeGreaterThanOrEqual(20);
    expect(tools.length).toBeLessThanOrEqual(40);
    for (const c of listarComandos().filter((x) => x.mcp !== false)) {
      const t = tools.find((x: { name: string }) => x.name === nomeFerramenta(c.nome));
      expect(t, c.nome).toBeDefined();
      expect(t.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
      expect(t.annotations.readOnlyHint).toBe(true); // ferramentas de comando só fazem prévia
      expect(t.annotations.destructiveHint).toBe(c.risco === 'destrutivo');
    }
    expect(tools.find((x: { name: string }) => x.name === 'aplicar').annotations.readOnlyHint).toBe(false);
    // comandos sem ferramenta própria: pela prévia genérica
    const s2 = call(s, 'novo');
    expect(s2.isError).toBeUndefined();
    const pv = call(s, 'previa', { comando: 'pilar.renumerar', params: {} });
    expect(pv.structuredContent.ok).toBe(true);
    expect(call(s, 'comandos').structuredContent.comandos.length).toBe(listarComandos().length);
  });

  it('prévia → aplicar → verificar → desfazer; erros vêm como isError', () => {
    const s = new ServidorMcp(memIo().io);
    call(s, 'novo');
    const pv = call(s, 'pavimento_criar', { nome: 'Ático', cota: 15 });
    expect(pv.structuredContent.diff.resumo).toEqual(['+ pavimento Ático', '+ grupo Ático']);
    expect(s.sessao.modelo.pavimentos).toHaveLength(5); // prévia não altera
    const ap = call(s, 'aplicar', { token: pv.structuredContent.token });
    expect(ap.isError).toBeUndefined();
    expect(s.sessao.modelo.pavimentos).toHaveLength(6);
    expect(s.sessao.log.at(-1)!.autor).toBe('ia');
    expect(call(s, 'aplicar', { token: pv.structuredContent.token }).isError).toBe(true);
    const bad = call(s, 'pavimento_criar', { nome: 'Y', cota: 'alta' });
    expect(bad.isError).toBe(true);
    expect(bad.structuredContent.erros[0].codigo).toBe('PARAMETRO_INVALIDO');
    expect(call(s, 'desfazer').structuredContent.desfeito).toBe('pavimento.criar');
    expect(s.sessao.modelo.pavimentos).toHaveLength(5);
  });

  it('abrir e salvar arquivo; recursos; método desconhecido', () => {
    const m = memIo();
    runCli(['novo', 'o.statikos'], m.io);
    const s = new ServidorMcp(m.io);
    expect(call(s, 'abrir', { arquivo: 'o.statikos' }).structuredContent.pavimentos).toHaveLength(5);
    const pv = call(s, 'eixo_malha', { dx: [4], dy: [4] });
    call(s, 'aplicar', { token: pv.structuredContent.token });
    call(s, 'salvar');
    expect(JSON.parse(m.files['o.statikos']).building.eixos).toHaveLength(4);
    const res = rpc(s, 'resources/list').result.resources.map((r: { uri: string }) => r.uri);
    expect(res).toContain('statikos://premissas');
    const prem = JSON.parse(rpc(s, 'resources/read', { uri: 'statikos://premissas' }).result.contents[0].text);
    expect(prem.some((p: { aConfirmar: boolean }) => p.aConfirmar)).toBe(true);
    expect(rpc(s, 'xyz').error.code).toBe(-32601);
    expect(JSON.parse(s.linha('{x')!).error.code).toBe(-32700);
  });
});
