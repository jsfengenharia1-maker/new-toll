// Ponto de entrada da linha de comando (Node ≥ 20). Empacotado por `npm run cli` em dist-cli/statikos.mjs.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { runCli, type Io } from './run';
import { ServidorMcp } from './mcp';
import { VENDOR_DWG, type EscritorDwg } from '../core/sheets/dwg';

/** Escritor de DWG (public/vendor), só quando pedido: --dwg ou o servidor MCP. */
async function carregarDwg(): Promise<EscritorDwg | undefined> {
  const arq = new URL(`../public/${VENDOR_DWG}`, import.meta.url);
  if (!existsSync(arq)) return undefined;
  const m = (await import(/* @vite-ignore */ pathToFileURL(arq.pathname).href)) as { writeDwg2018: EscritorDwg };
  return m.writeDwg2018;
}

const io: Io = {
  ler: (c) => readFileSync(c, 'utf8'),
  gravar: (c, t) => writeFileSync(c, t),
  gravarBytes: (c, d) => writeFileSync(c, d),
  out: (t) => process.stdout.write(`${t}\n`),
  err: (t) => process.stderr.write(`${t}\n`),
};

// saída encerrada pelo leitor (ex.: `| head`) não é erro
process.stdout.on('error', (e: NodeJS.ErrnoException) => { if (e.code === 'EPIPE') process.exit(0); throw e; });

const args = process.argv.slice(2);
if (args[0] === 'mcp' || args.includes('--dwg')) io.dwg = await carregarDwg();
if (args[0] === 'mcp') {
  // stdout é exclusivo do protocolo; mensagens de diagnóstico vão para stderr
  const srv = new ServidorMcp({ ...io, out: io.err });
  const rl = createInterface({ input: process.stdin });
  rl.on('line', (l) => { if (!l.trim()) return; const r = srv.linha(l); if (r) process.stdout.write(`${r}\n`); });
} else {
  process.exitCode = runCli(args, io);
}
