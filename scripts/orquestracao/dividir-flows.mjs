#!/usr/bin/env node
// Divide e2e/flows.mjs em e2e/flows/<grupo>[-N].mjs + helpers.mjs + index.mjs (uso único, já executado).
// uso: node scripts/orquestracao/dividir-flows.mjs [flows.mjs de origem]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const origem = process.argv[2] ?? join(raiz, 'e2e', 'flows.mjs');
const saida = join(raiz, 'e2e', 'flows');
const LIMITE = 60 * 1024;
const src = readFileSync(origem, 'utf8');
const marca = 'export const flows = [\n';
const ini = src.indexOf(marca);
const cabecalho = src.slice(0, ini);
const corpo = src.slice(ini + marca.length, src.lastIndexOf('];'));

// helpers: declarações de topo do cabeçalho passam a ser exportadas
const importLinhas = cabecalho.split('\n').filter((l) => l.startsWith('import '));
const nomesHelpers = [...cabecalho.matchAll(/^(?:async function|function|const|let) (\w+)/gm)].map((m) => m[1]);
const helpers = cabecalho.replace(/^(async function|function|const|let) (\w+)/gm, (m, k, n) => `export ${k} ${n}`);
mkdirSync(saida, { recursive: true });
writeFileSync(join(saida, 'helpers.mjs'), helpers);

// fluxos: cada um começa numa linha "{" (0 a 2 espaços) seguida de "    name:"
const ls = corpo.split('\n');
const starts = [];
for (let i = 0; i < ls.length - 1; i++) if (/^ {0,2}\{$/.test(ls[i]) && /^ {4}(name|webgl|serial): /.test(ls[i + 1])) starts.push(i);
const blocos = starts.map((s, k) => ls.slice(s, k + 1 < starts.length ? starts[k + 1] : ls.length).join('\n'));
const nBlocos = (corpo.match(/^ {4}name: /gm) ?? []).length;
if (blocos.length !== nBlocos) throw new Error(`blocos ${blocos.length} != nomes ${nBlocos}`);

const fluxos = blocos.map((b) => {
  const nome = /^ {4}name: (['"`])(.*?)\1,?$/m.exec(b)[2];
  const obj = b.slice(b.indexOf('{'), b.lastIndexOf('}') + 1); // do "{" ao "}" final, sem a vírgula
  return { nome, obj, tamanho: b.length };
});

const BASE = ['desenho', 'exemplo', 'salvar', 'estabilidade', 'exportar', 'perfil', 'PWA'];
function grupo(nome) {
  const m = /^([A-Z]+)\d/.exec(nome);
  if (m) return m[1];
  const w = nome.split(/[\s:]/)[0];
  if (BASE.includes(w)) return 'portico';
  if (w === 'layout') return 'layout';
  return 'edificio-geral';
}
const ids = new Set();
function ident(nome) {
  let base = /^([A-Z]+\d+[a-z]?):/.exec(nome)?.[1] ?? nome.normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[:(]/)[0].replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  base = 'f_' + base;
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}_${n}`;
  ids.add(id);
  return id;
}
const arquivos = new Map(); // grupo -> partes
const lista = fluxos.map((f) => ({ ...f, g: grupo(f.nome), id: ident(f.nome) }));
for (const f of lista) {
  const partes = arquivos.get(f.g) ?? [];
  let p = partes[partes.length - 1];
  if (!p || (p.tam + f.tamanho > LIMITE && p.itens.length)) partes.push((p = { itens: [], tam: 0 }));
  p.itens.push(f);
  p.tam += f.tamanho;
  arquivos.set(f.g, partes);
}
const arqDe = new Map();
for (const [g, partes] of arquivos) {
  partes.forEach((p, i) => {
    const nomeArq = partes.length > 1 ? `${g}-${i + 1}` : g;
    const uso = p.itens.map((f) => f.obj).join('\n');
    const usados = nomesHelpers.filter((n) => new RegExp(`\\b${n}\\b`).test(uso));
    const imps = importLinhas.filter((l) => {
      const nomes = [...l.matchAll(/\{([^}]*)\}|\* as (\w+)|import (\w+) from/g)].flatMap((m) =>
        (m[1] ?? m[2] ?? m[3]).split(',').map((s) => s.trim().split(' as ').pop()).filter(Boolean));
      return nomes.some((n) => new RegExp(`\\b${n}\\b`).test(uso));
    });
    let t = `// Fluxos de interface — ${g} (parte ${i + 1}/${partes.length}).\n`;
    t += imps.join('\n') + (imps.length ? '\n' : '');
    if (usados.length) t += `import { ${usados.join(', ')} } from './helpers.mjs';\n`;
    t += '\n' + p.itens.map((f) => `export const ${f.id} = ${f.obj};\n`).join('\n');
    writeFileSync(join(saida, nomeArq + '.mjs'), t);
    for (const f of p.itens) arqDe.set(f.id, nomeArq);
  });
}
const alias = (a) => 'm_' + a.replace(/-/g, '_');
const arqs = [...new Set(arqDe.values())];
let idx = '// Índice dos fluxos de interface. A ORDEM da lista é a ordem de execução.\n// Fluxo novo = exportar no arquivo da frente + uma linha aqui.\n';
for (const a of arqs) idx += `import * as ${alias(a)} from './${a}.mjs';\n`;
idx += '\nexport const flows = [\n' + lista.map((f) => `  ${alias(arqDe.get(f.id))}.${f.id},`).join('\n') + '\n];\n';
writeFileSync(join(saida, 'index.mjs'), idx);
console.log(`${lista.length} fluxos em ${arqs.length} arquivos`);
