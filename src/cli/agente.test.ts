import { describe, expect, it } from 'vitest';
import { ServidorMcp } from './mcp';
import type { Io } from './run';

// o mesmo roteiro de docs/exemplos/agente-mcp.mjs, contra o servidor no próprio processo
const exemplo = import.meta.glob('/docs/exemplos/agente-mcp.mjs');
const docs = import.meta.glob(['/docs/ia.md', '/public/llms.txt'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('documentação para IA', () => {
  it('docs/ia.md cita todas as ferramentas e recursos do servidor; llms.txt aponta para ela', () => {
    const s = new ServidorMcp({ ler: () => '', gravar: () => {}, out: () => {}, err: () => {} });
    const rpc = (method: string) => JSON.parse(s.linha(JSON.stringify({ jsonrpc: '2.0', id: 1, method }))!).result;
    const md = docs['/docs/ia.md'];
    for (const t of rpc('tools/list').tools) expect(md, t.name).toContain(`\`${t.name}\``);
    for (const r of rpc('resources/list').resources) expect(md, r.uri).toContain(r.uri);
    for (const r of rpc('resources/templates/list').resourceTemplates) expect(md).toContain(r.uriTemplate);
    expect(docs['/public/llms.txt']).toMatch(/^# Statikos\n\n> /);
    expect(docs['/public/llms.txt']).toContain('docs/ia.md');
  });
});

describe('agente de exemplo pelo MCP', () => {
  it('lança, verifica, calcula, revisa os pilares, loca o contorno e gera as pranchas', async () => {
    const files: Record<string, string> = {}, bin: Record<string, Uint8Array> = {};
    const io: Io = { ler: (c) => files[c], gravar: (c, t) => { files[c] = t; }, gravarBytes: (c, d) => { bin[c] = d; }, out: () => {}, err: () => {} };
    const srv = new ServidorMcp(io);
    let n = 0;
    const chamar = async (name: string, args: object) => {
      const r = JSON.parse(srv.linha(JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name, arguments: args } }))!).result;
      if (r.isError) throw new Error(`${name}: ${r.structuredContent.erros.map((e: { mensagem: string }) => e.mensagem).join(' ')}`);
      return r.structuredContent;
    };
    const { agente } = (await Object.values(exemplo)[0]()) as { agente: (c: typeof chamar, o: object) => Promise<{ dim: { resumo: { pilares: { total: number; ok: number } } }; rodadas: number }> };
    const linhas: string[] = [];
    const r = await agente(chamar, { saida: 'out', log: (l: string) => linhas.push(l) });
    expect(r.rodadas).toBeGreaterThan(0); // os pilares de 15 × 30 precisaram de revisão
    expect(r.dim.resumo.pilares.ok).toBe(r.dim.resumo.pilares.total);
    expect(Object.keys(bin).sort()).toEqual(['out/exemplo.dxf', 'out/exemplo.pdf']);
    expect(JSON.parse(files['out/exemplo.statikos']).building.prancha.carimbo.empresa).toBe('Escritório exemplo');
    expect(srv.sessao.log.filter((e) => e.autor === 'ia')).toHaveLength(7 + r.rodadas);
    expect(linhas.join('\n')).toMatch(/rodada 0: pilares \d+\/30 ok/);
    // recurso de resultados por pavimento
    const res = JSON.parse(srv.linha(JSON.stringify({ jsonrpc: '2.0', id: 999, method: 'resources/read', params: { uri: 'statikos://resultados/Tipo 1' } }))!).result;
    const dados = JSON.parse(res.contents[0].text);
    expect(dados.pavimento.nome).toBe('Tipo 1');
    expect(dados.pilares).toHaveLength(6);
    expect(dados.fundacao).toBeUndefined();
  }, 60000);
});
