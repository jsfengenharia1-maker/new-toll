/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

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

export default defineConfig({
  plugins: [react(), viteSingleFile(), cssRawNosTestes],
  base: './',
  test: { testTimeout: 30000, exclude: ['**/node_modules/**', '.claude/**', 'dist/**', 'e2e/**'] },
});
