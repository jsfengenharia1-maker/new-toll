// Exemplo de agente sobre o servidor MCP do Statikos: lança um edifício, verifica, calcula, revisa os pilares
// que não passam (aumenta a seção e recalcula), loca o contorno na face externa e gera as pranchas.
// É um roteiro determinístico, para mostrar o protocolo; um agente de IA faria as mesmas chamadas.
//
// Uso: npm run cli && node docs/exemplos/agente-mcp.mjs [pasta-de-saida]
// O mesmo roteiro roda nos testes (src/cli/agente.test.ts) contra o servidor no próprio processo.

/** Roteiro. `chamar(ferramenta, args)` devolve o structuredContent ou lança o erro da ferramenta. */
export async function agente(chamar, { saida = '.', log = console.log } = {}) {
  // toda alteração em dois passos: a ferramenta do comando devolve a prévia; `aplicar` usa o token
  const fazer = async (ferramenta, args) => {
    const pv = await chamar(ferramenta, args);
    const r = await chamar('aplicar', { token: pv.token });
    log(`  ${r.mensagem ?? ferramenta}`);
    return r;
  };
  const comando = (nome, params) => fazer('previa', { comando: nome, params });

  log('1. Edifício padrão (térreo, 3 tipos, cobertura) e dados da obra');
  await chamar('novo', { modelo: 'padrao' });
  await fazer('obra_definir', { nome: 'Edifício exemplo', cidade: 'Cidade exemplo' });
  await fazer('eixo_malha', { dx: [5, 5], dy: [4.5] });

  log('2. Pilares 15 × 30 (pequenos de propósito), vigas pelos eixos e lajes maciças no Tipo');
  const xs = [0, 5, 10], ys = [0, 4.5];
  await fazer('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.15, h: 0.3 } } }))) });
  const viga = (pontos) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos, secao: { b: 0.15, h: 0.45 } } });
  await fazer('lote', { comandos: [...ys.map((y) => viga([[0, y], [10, y]])), ...xs.map((x) => viga([[x, 0], [x, 4.5]]))] });
  await fazer('laje_detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });

  log('3. Verificação de lançamento');
  const { diagnosticos } = await chamar('verificar', {});
  const erros = diagnosticos.filter((d) => d.severidade === 'erro');
  for (const d of diagnosticos) log(`  ${d.severidade}: ${d.mensagem}`);
  if (erros.length) throw new Error('Há erros de lançamento; o agente para aqui.');

  log('4. Cálculo e dimensionamento; revisão dos pilares');
  let rodada = 0, dim;
  for (;;) {
    dim = await chamar('dimensionar', {});
    const r = dim.resumo;
    log(`  rodada ${rodada}: pilares ${r.pilares.ok}/${r.pilares.total} ok, vigas ${r.vigas.ok}/${r.vigas.total}, lajes ${r.lajes.ok}/${r.lajes.total}`);
    const ruins = [...new Set(dim.pilares.filter((p) => p.status !== 'ok').map((p) => p.pilar))];
    if (!ruins.length || rodada === 3) break;
    const modelo = await chamar('modelo', {});
    await fazer('lote', { comandos: ruins.map((id) => {
      const s = modelo.pilares.find((p) => p.id === id).secao;
      return { nome: 'pilar.editar', params: { id, secao: { tipo: 'ret', b: +(s.b + 0.05).toFixed(2), h: +(s.h + 0.05).toFixed(2) } } };
    }) });
    rodada++;
  }

  log('5. Contorno locado na face externa dos pilares');
  await fazer('viga_alinharFace', { grupo: 'g_3', lado: 'externa' });

  log('6. Carimbo e pranchas');
  await comando('prancha.definir', { carimbo: { empresa: 'Escritório exemplo', responsavel: 'Eng. exemplo', etapa: 'Exemplo' } });
  const pr = await chamar('pranchas', { pdf: `${saida}/exemplo.pdf`, dxf: `${saida}/exemplo.dxf` });
  log(`  ${pr.gravados.join(', ')}`);
  await chamar('salvar', { arquivo: `${saida}/exemplo.statikos` });
  return { dim, rodadas: rodada, pranchas: pr };
}

// ---------- execução direta: servidor em stdio (node dist-cli/statikos.mjs mcp) ----------
async function main() {
  const { spawn } = await import('node:child_process');
  const { createInterface } = await import('node:readline');
  const { fileURLToPath } = await import('node:url');
  const cli = fileURLToPath(new URL('../../dist-cli/statikos.mjs', import.meta.url));
  const srv = spawn(process.execPath, [cli, 'mcp'], { stdio: ['pipe', 'pipe', 'inherit'] });
  const pend = new Map();
  let id = 0;
  createInterface({ input: srv.stdout }).on('line', (l) => { const m = JSON.parse(l); pend.get(m.id)?.(m); pend.delete(m.id); });
  const rpc = (method, params) => new Promise((ok) => { pend.set(++id, ok); srv.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`); });
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'agente-exemplo', version: '1' } });
  srv.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  const chamar = async (name, args) => {
    const r = (await rpc('tools/call', { name, arguments: args })).result;
    if (r.isError) throw new Error(`${name}: ${r.structuredContent.erros.map((e) => e.mensagem).join(' ')}`);
    return r.structuredContent;
  };
  try { await agente(chamar, { saida: process.argv[2] ?? '.' }); } finally { srv.stdin.end(); }
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
