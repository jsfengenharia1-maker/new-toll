// Gera, em public/vendor, dois módulos ES minificados carregados sob demanda pelo app (fora do HTML único) e pela linha de comando:
// nasjidwg-<versão>.mjs (só o escritor de DWG R2018) e nasjidwg-leitor-<versão>.mjs (L2: leitor de DWG + escritor de DXF,
// que converte o DWG lido em texto para o leitor próprio de DXF). Os demais leitores ficam na devDependency, para os testes.
import { build } from 'vite';
import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(`${raiz}node_modules/nasjidwg/package.json`, 'utf8'));
const entrada = `${raiz}node_modules/.vendor-nasjidwg.js`;
writeFileSync(entrada, "export { writeDwg2018 } from 'nasjidwg';\n");
mkdirSync(`${raiz}public/vendor`, { recursive: true });
await build({
  configFile: false, logLevel: 'warn', publicDir: false,
  build: {
    outDir: `${raiz}public/vendor`, emptyOutDir: false, minify: true, copyPublicDir: false,
    lib: { entry: entrada, formats: ['es'], fileName: () => `nasjidwg-${pkg.version}.mjs` },
  },
});
const entradaLeitor = `${raiz}node_modules/.vendor-nasjidwg-leitor.js`;
writeFileSync(entradaLeitor, "export { readDwg, writeDxf } from 'nasjidwg';\n");
await build({
  configFile: false, logLevel: 'warn', publicDir: false,
  build: {
    outDir: `${raiz}public/vendor`, emptyOutDir: false, minify: true, copyPublicDir: false,
    lib: { entry: entradaLeitor, formats: ['es'], fileName: () => `nasjidwg-leitor-${pkg.version}.mjs` },
  },
});
copyFileSync(`${raiz}node_modules/nasjidwg/LICENSE`, `${raiz}public/vendor/nasjidwg-LICENSE.txt`);
copyFileSync(`${raiz}node_modules/nasjidwg/NOTICE`, `${raiz}public/vendor/nasjidwg-NOTICE.txt`);
console.log(`public/vendor/nasjidwg-${pkg.version}.mjs`);
console.log(`public/vendor/nasjidwg-leitor-${pkg.version}.mjs`);
