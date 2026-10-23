#!/usr/bin/env node
// Testes de interface do Statikos (fora do `npm test` e do build do Netlify).
//
//   npm run e2e                  build + vite preview numa porta livre + todos os fluxos
//   npm run e2e -- --no-build    reaproveita o dist/ atual
//   npm run e2e -- memorial      só os fluxos cujo nome contém "memorial"
//   npm run e2e -- --workers N  N navegadores em paralelo (padrão mín(4, CPUs/2); 1 = serial)
//   npm run e2e -- --headed      abre o navegador visível
//
// Navegador: PW_CHROMIUM=/caminho/do/chrome usa esse executável; sem a variável, o Chromium
// padrão do Playwright e, se ele não estiver instalado, /opt/pw-browsers/chromium-1194 (ambiente de nuvem).
// Runner próprio, mínimo, sobre a biblioteca `playwright` (sem @playwright/test).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { cpus, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { flows } from './flows/index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const skipBuild = args.includes('--no-build');
const headed = args.includes('--headed');
const iw = args.indexOf('--workers');
const workers = iw >= 0 ? Math.max(1, parseInt(args[iw + 1], 10) || 1) : Math.max(1, Math.min(4, Math.floor(cpus().length / 2)));
const filter = args.find((a, i) => !a.startsWith('--') && !(iw >= 0 && i === iw + 1));
const FALLBACK_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function freePort(p) {
  return new Promise((res) => {
    const s = createServer();
    s.once('error', () => res(false));
    s.listen(p, '127.0.0.1', () => s.close(() => res(true)));
  });
}

async function pickPort() {
  for (let p = 4200; p <= 4209; p++) if (await freePort(p)) return p;
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
}

async function waitHttp(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`servidor não respondeu em ${url}`);
}

/** `webgl`: Chromium com WebGL por software (SwiftShader), para a vista 3D funcionar sem GPU. Fica num navegador à parte porque os flags mudam o tempo de renderização dos demais fluxos. */
async function launch(webgl = false) {
  const opts = { headless: !headed, args: webgl ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] };
  if (process.env.PW_CHROMIUM) return chromium.launch({ ...opts, executablePath: process.env.PW_CHROMIUM });
  try { return await chromium.launch(opts); } catch (e) {
    if (!existsSync(FALLBACK_CHROME)) throw e;
    if (!webgl) console.log(`(Chromium padrão do Playwright indisponível; usando ${FALLBACK_CHROME})`);
    return chromium.launch({ ...opts, executablePath: FALLBACK_CHROME });
  }
}

async function main() {
  if (!skipBuild) {
    const b = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    if (b.status !== 0) { console.error('build falhou'); process.exit(1); }
  }
  if (!existsSync(join(root, 'dist', 'index.html'))) { console.error('dist/index.html não existe: rode sem --no-build'); process.exit(1); }

  const port = await pickPort();
  const baseURL = `http://127.0.0.1:${port}/`;
  const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn(process.execPath, [vite, 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  const stop = () => { if (server.exitCode === null) server.kill('SIGTERM'); };
  process.on('exit', stop);
  process.on('SIGINT', () => { stop(); process.exit(130); });

  const tmp = mkdtempSync(join(tmpdir(), 'statikos-e2e-'));
  const browsers = [];
  let failed = 0;
  try {
    await waitHttp(baseURL);
    const list = flows.filter((f) => !filter || f.name.toLowerCase().includes(filter.toLowerCase()));
    const paralelos = list.filter((f) => !f.serial);
    const seriais = list.filter((f) => f.serial);
    const n = Math.max(1, Math.min(workers, list.length));
    console.log(`\n${list.length} fluxo(s) em ${baseURL} (${n} worker(s))\n`);

    async function runFlow(f, browser, gl) {
      const t0 = Date.now();
      const contexts = [];
      const errors = [];
      // pasta própria por fluxo: nomes fixos de arquivo não colidem entre workers
      const dir = join(tmp, f.name.replace(/\W+/g, '-'));
      mkdirSync(dir, { recursive: true });
      const newPage = async (init, ctxOpts = {}) => {
        const navegador = f.webgl ? await gl() : browser;
        const ctx = await navegador.newContext({ baseURL, acceptDownloads: true, viewport: { width: 1400, height: 1080 }, locale: 'pt-BR', ...ctxOpts });
        contexts.push(ctx);
        if (init) await ctx.addInitScript(init);
        const page = await ctx.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto('./');
        await page.locator('.bname').waitFor();
        return page;
      };
      try {
        await f.run({ newPage, baseURL, tmp: dir });
        if (errors.length) throw new Error(`erro de JavaScript na página: ${errors[0]}`);
        console.log(`  ok    ${f.name} (${Date.now() - t0} ms)`);
      } catch (e) {
        failed++;
        console.log(`  FALHA ${f.name}\n        ${String(e?.message ?? e).split('\n').join('\n        ')}`);
        const page = contexts.at(-1)?.pages().at(-1);
        if (page) { const shot = join(tmp, `${f.name.replace(/\W+/g, '-')}.png`); await page.screenshot({ path: shot }).catch(() => {}); console.log(`        captura: ${shot}`); }
      } finally {
        for (const c of contexts) await c.close().catch(() => {});
      }
    }

    // fila compartilhada: cada worker tem seu navegador (e o de WebGL, sob demanda)
    async function worker(fila) {
      const browser = await launch();
      let browserGL;
      browsers.push(browser);
      const gl = async () => { if (!browserGL) { browserGL = await launch(true); browsers.push(browserGL); } return browserGL; };
      while (fila.length) await runFlow(fila.shift(), browser, gl);
    }
    const fila = [...paralelos];
    await Promise.all(Array.from({ length: n }, () => worker(fila)));
    if (seriais.length) await worker([...seriais]);
    console.log(`\n${list.length - failed} ok, ${failed} falha(s)`);
  } catch (e) {
    failed++;
    console.error(String(e?.message ?? e));
    if (serverLog) console.error(serverLog);
  } finally {
    for (const b of browsers) await b.close().catch(() => {});
    stop();
    if (!failed) rmSync(tmp, { recursive: true, force: true });
  }
  process.exit(failed ? 1 : 0);
}

main();
