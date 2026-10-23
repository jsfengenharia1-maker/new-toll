#!/usr/bin/env node
// Prova de equivalência: compara a lista antiga (arquivo informado, copiado para e2e/ para resolver 'nasjidwg')
// com e2e/flows/index.mjs: quantidade, nomes, ordem, flags e fn.toString de cada fluxo.
// uso: node scripts/orquestracao/comparar-flows.mjs e2e/.flows-antigo.mjs
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const a = (await import(pathToFileURL(resolve(process.argv[2])))).flows;
const b = (await import(pathToFileURL(resolve('e2e/flows/index.mjs')))).flows;
let erros = 0;
const ruim = (m) => {
  erros++;
  console.log('DIFERENTE:', m);
};
if (a.length !== b.length) ruim(`quantidade ${a.length} != ${b.length}`);
a.forEach((f, i) => {
  const g = b[i];
  if (!g) return ruim(`falta #${i}`);
  if (f.name !== g.name) ruim(`#${i} nome`);
  const ka = Object.keys(f).join();
  const kb = Object.keys(g).join();
  if (ka !== kb) ruim(`#${i} chaves ${ka} != ${kb}`);
  for (const k of Object.keys(f)) {
    const va = typeof f[k] === 'function' ? f[k].toString() : JSON.stringify(f[k]);
    const vb = typeof g[k] === 'function' ? g[k].toString() : JSON.stringify(g[k]);
    if (va !== vb) ruim(`#${i} ${f.name} campo ${k}`);
  }
});
console.log(erros ? `${erros} diferenças` : `equivalente: ${a.length} fluxos, mesma ordem, nomes, flags e fn.toString`);
process.exit(erros ? 1 : 0);
