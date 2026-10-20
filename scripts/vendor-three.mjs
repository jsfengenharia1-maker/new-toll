// Gera public/vendor/three-<versão>.mjs só com as classes usadas pela vista 3D (renderizador WebGL, câmeras, malhas,
// luzes, raycaster, textura de canvas): módulo ES minificado, com tree-shaking, carregado sob demanda pelo app
// (fora do HTML único). Os controles de câmera são próprios (sem addons). Copia a licença do pacote.
import { build } from 'vite';
import { copyFileSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(`${raiz}node_modules/three/package.json`, 'utf8'));
const CLASSES = [
  'WebGLRenderer', 'Scene', 'Group', 'Object3D', 'PerspectiveCamera', 'OrthographicCamera',
  'BufferGeometry', 'Float32BufferAttribute', 'Uint32BufferAttribute', 'Mesh', 'LineSegments', 'LineBasicMaterial', 'LineDashedMaterial',
  'MeshLambertMaterial', 'MeshBasicMaterial', 'Sprite', 'SpriteMaterial', 'AmbientLight', 'HemisphereLight', 'DirectionalLight',
  'Raycaster', 'Vector2', 'Vector3', 'Color', 'CanvasTexture', 'RepeatWrapping', 'DoubleSide', 'FrontSide', 'SRGBColorSpace',
];
const entrada = `${raiz}node_modules/.vendor-three.js`;
writeFileSync(entrada, `export { ${CLASSES.join(', ')} } from 'three';\nexport const REVISION = '${pkg.version}';\n`);
mkdirSync(`${raiz}public/vendor`, { recursive: true });
const saida = `three-${pkg.version}.mjs`;
await build({
  configFile: false, logLevel: 'warn', publicDir: false,
  build: {
    outDir: `${raiz}public/vendor`, emptyOutDir: false, minify: true, copyPublicDir: false,
    lib: { entry: entrada, formats: ['es'], fileName: () => saida },
  },
});
copyFileSync(`${raiz}node_modules/three/LICENSE`, `${raiz}public/vendor/three-LICENSE.txt`);
console.log(`public/vendor/${saida} (${Math.round(statSync(`${raiz}public/vendor/${saida}`).size / 1024)} KB)`);
