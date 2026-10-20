// Ponto de entrada da linha de comando (Node ≥ 20). Empacotado por `npm run cli` em dist-cli/statikos.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { runCli, type Io } from './run';
import { ServidorMcp } from './mcp';

const io: Io = {
  ler: (c) => readFileSync(c, 'utf8'),
  gravar: (c, t) => writeFileSync(c, t),
  out: (t) => process.stdout.write(`${t}\n`),
  err: (t) => process.stderr.write(`${t}\n`),
};

// saída encerrada pelo leitor (ex.: `| head`) não é erro
process.stdout.on('error', (e: NodeJS.ErrnoException) => { if (e.code === 'EPIPE') process.exit(0); throw e; });

const args = process.argv.slice(2);
if (args[0] === 'mcp') {
  // stdout é exclusivo do protocolo; mensagens de diagnóstico vão para stderr
  const srv = new ServidorMcp({ ...io, out: io.err });
  const rl = createInterface({ input: process.stdin });
  rl.on('line', (l) => { if (!l.trim()) return; const r = srv.linha(l); if (r) process.stdout.write(`${r}\n`); });
} else {
  process.exitCode = runCli(args, io);
}
