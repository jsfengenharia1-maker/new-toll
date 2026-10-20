// Build da linha de comando e do servidor MCP (Node), com o núcleo embutido num único arquivo.
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'src/cli/statikos.ts',
    outDir: 'dist-cli',
    target: 'node20',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'statikos.mjs', banner: '#!/usr/bin/env node' } },
  },
  ssr: { noExternal: true },
});
