/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

// Nos testes o Vitest entrega .css vazio; o design system (design/*.css?raw) precisa do texto real.
const cssRawNosTestes = {
  name: 'css-raw-nos-testes',
  enforce: 'pre' as const,
  async resolveId(this: { resolve: (s: string, i?: string) => Promise<{ id: string } | null> }, src: string, imp?: string) {
    if (!process.env.VITEST || !src.endsWith('.css?raw')) return null;
    const r = await this.resolve(src.slice(0, -4), imp);
    return r ? `\0css-raw:${r.id}.js` : null; // sem terminar em .css: o Vitest esvaziaria
  },
  load(id: string) {
    if (id.startsWith('\0css-raw:')) return `export default ${JSON.stringify(readFileSync(id.slice(9, -3), 'utf8'))}`;
  },
};

// Worker do cálculo do edifício. Build publicado (Netlify/PWA): arquivo à parte, baixado ao abrir o módulo Edifício.
// Artifact do claude.ai (--mode artifact) e testes: embutido no próprio HTML/módulo (?worker&inline).
const WORKER_CALCULO = fileURLToPath(new URL('./src/app/edificio/calculo.worker.ts', import.meta.url));

/** Lista os arquivos de dist/assets no service worker (pré-cache) e dá à cópia do cache um nome que muda a cada build. */
function precacheDoServiceWorker() {
  let outDir = 'dist';
  return {
    name: 'precache-do-service-worker',
    apply: 'build' as const,
    enforce: 'post' as const,
    configResolved(c: { build: { outDir: string }; root: string }) { outDir = join(c.root, c.build.outDir); },
    closeBundle() {
      const sw = join(outDir, 'sw.js');
      let txt: string;
      try { txt = readFileSync(sw, 'utf8'); } catch { return; }
      const arquivos: string[] = [];
      const varre = (dir: string) => {
        for (const n of readdirSync(dir)) {
          const f = join(dir, n);
          if (statSync(f).isDirectory()) varre(f); else if (!n.endsWith('.map')) arquivos.push('./' + relative(outDir, f).split('\\').join('/'));
        }
      };
      try { varre(join(outDir, 'assets')); } catch { /* build sem assets */ }
      arquivos.sort();
      const h = createHash('sha1');
      for (const a of arquivos) h.update(a);
      h.update(readFileSync(join(outDir, 'index.html')));
      // os marcadores aparecem também no comentário do topo do sw.js: troca só os do código (com colchetes / aspas)
      const novo = txt.replace('[/*__PRECACHE__*/]', `[${arquivos.map((a) => JSON.stringify(a)).join(', ')}]`).replace("'statikos-__BUILD__'", `'statikos-${h.digest('hex').slice(0, 10)}'`);
      if (novo === txt || novo.includes("'statikos-__BUILD__'") || novo.includes('[/*__PRECACHE__*/]')) throw new Error('sw.js: marcadores de pré-cache não encontrados');
      writeFileSync(sw, novo);
    },
  };
}

export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    plugins: [react(), ...(artifact ? [viteSingleFile()] : [precacheDoServiceWorker()]), cssRawNosTestes],
    base: './',
    // artifact: um HTML só, sem public/ (manifest, service worker e vendor não existem lá)
    publicDir: artifact ? false : 'public',
    resolve: { alias: [{ find: /^virtual:calculo-worker$/, replacement: `${WORKER_CALCULO}?worker${artifact || process.env.VITEST ? '&inline' : ''}` }] },
    build: artifact ? { outDir: 'dist-artifact' } : {},
    test: { testTimeout: 30000, hookTimeout: 60000, exclude: ['**/node_modules/**', '.claude/**', 'dist/**', 'dist-artifact/**', 'e2e/**'] },
  };
});
