// Gera, em public/vendor, o leitor de IFC carregado sob demanda pelo app (fora do HTML único) e pela linha de comando (L3):
// web-ifc-<versão>.mjs (só a classe IfcAPI, minificada), web-ifc-<versão>.wasm (o módulo de análise, de um único fio),
// web-ifc-LICENSE.txt (MPL-2.0) e web-ifc-NOTICE.txt (origem do código-fonte; sem modificações).
import { build } from 'vite';
import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(`${raiz}node_modules/web-ifc/package.json`, 'utf8'));
const entrada = `${raiz}node_modules/.vendor-web-ifc.js`;
writeFileSync(entrada, "export { IfcAPI } from 'web-ifc';\n");
mkdirSync(`${raiz}public/vendor`, { recursive: true });
await build({
  configFile: false, logLevel: 'warn', publicDir: false,
  build: {
    outDir: `${raiz}public/vendor`, emptyOutDir: false, minify: true, copyPublicDir: false,
    lib: { entry: entrada, formats: ['es'], fileName: () => `web-ifc-${pkg.version}.mjs` },
  },
});
copyFileSync(`${raiz}node_modules/web-ifc/web-ifc.wasm`, `${raiz}public/vendor/web-ifc-${pkg.version}.wasm`);
copyFileSync(`${raiz}node_modules/web-ifc/LICENSE.md`, `${raiz}public/vendor/web-ifc-LICENSE.txt`);
writeFileSync(`${raiz}public/vendor/web-ifc-NOTICE.txt`, `web-ifc ${pkg.version}
Licença: MPL-2.0 (web-ifc-LICENSE.txt).
Origem do código-fonte: https://github.com/ThatOpen/engine_web-ifc (pacote npm "web-ifc@${pkg.version}", versão fixa na devDependency).
Os arquivos web-ifc-${pkg.version}.mjs (minificação do web-ifc-api.js do pacote) e web-ifc-${pkg.version}.wasm (web-ifc.wasm do pacote, cópia byte a byte)
são distribuídos sem modificação do código-fonte. Carregados só quando o usuário escolhe um arquivo IFC; não fazem parte do dist/index.html.
`);
console.log(`public/vendor/web-ifc-${pkg.version}.mjs`);
console.log(`public/vendor/web-ifc-${pkg.version}.wasm`);
