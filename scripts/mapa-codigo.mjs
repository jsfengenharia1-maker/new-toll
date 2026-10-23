#!/usr/bin/env node
// Gera docs/mapa-codigo.md: por arquivo de src/, símbolos exportados e quem o importa.
//   node scripts/mapa-codigo.mjs          escreve o arquivo
//   import { gerarMapa } from './mapa-codigo.mjs'   (usado por src/core/mapa.test.ts)
import ts from 'typescript';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXT = ['.ts', '.tsx'];

function listar(dir, out = []) {
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listar(p, out);
    else if (EXT.some((e) => n.endsWith(e)) && !n.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function resolver(de, spec, set) {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(de), spec);
  for (const c of [base, ...EXT.map((e) => base + e), ...EXT.map((e) => join(base, 'index' + e))]) if (set.has(c)) return c;
  return null;
}

export function gerarMapa() {
  const arquivos = listar(join(raiz, 'src'));
  const set = new Set(arquivos);
  const exports = new Map();
  const usadoPor = new Map(arquivos.map((a) => [a, new Set()]));
  for (const f of arquivos) {
    const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const nomes = [];
    const marca = (spec) => { const alvo = resolver(f, spec, set); if (alvo && alvo !== f) usadoPor.get(alvo).add(f); };
    const mods = (n) => (ts.canHaveModifiers(n) ? ts.getModifiers(n) ?? [] : []);
    const tem = (n, k) => mods(n).some((m) => m.kind === k);
    const visita = (n) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) marca(n.moduleSpecifier.text);
      if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) marca(n.arguments[0].text);
      if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) marca(n.argument.literal.text);
      ts.forEachChild(n, visita);
    };
    visita(sf);
    for (const n of sf.statements) {
      if (ts.isExportDeclaration(n)) {
        if (n.exportClause && ts.isNamedExports(n.exportClause)) for (const e of n.exportClause.elements) nomes.push(e.name.text);
        else if (!n.exportClause) nomes.push('*');
      } else if (ts.isExportAssignment(n)) nomes.push('default');
      else if (tem(n, ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(n)) {
          for (const d of n.declarationList.declarations) {
            if (ts.isIdentifier(d.name)) nomes.push(d.name.text);
            else d.name.elements.forEach((e) => ts.isBindingElement(e) && ts.isIdentifier(e.name) && nomes.push(e.name.text));
          }
        } else if (tem(n, ts.SyntaxKind.DefaultKeyword)) nomes.push('default');
        else if (n.name) nomes.push(n.name.text);
      }
    }
    exports.set(f, nomes);
  }
  const rel = (p) => relative(raiz, p).split('\\').join('/');
  const linhas = [
    '# Mapa do código',
    '',
    'Gerado por `npm run mapa` (scripts/mapa-codigo.mjs); não editar à mão. `src/core/mapa.test.ts` reprova se estiver desatualizado.',
    'Uso: consultar por grep (`grep -n "nomeDoSimbolo" docs/mapa-codigo.md`), não ler inteiro. Cada arquivo tem os símbolos exportados e "usado por:" (quem o importa).',
    '',
  ];
  let pasta = null;
  for (const f of arquivos) {
    const d = rel(dirname(f));
    if (d !== pasta) { pasta = d; linhas.push(`## ${d}/`, ''); }
    const usos = [...usadoPor.get(f)].map(rel).sort();
    linhas.push(`- \`${rel(f).slice(d.length + 1)}\`: ${exports.get(f).join(', ') || '(sem exports)'}`);
    linhas.push(`  - usado por: ${usos.length ? usos.map((u) => u.replace(/^src\//, '')).join(', ') : '-'}`);
  }
  return linhas.join('\n') + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const t = gerarMapa();
  writeFileSync(join(raiz, 'docs', 'mapa-codigo.md'), t);
  console.log(`docs/mapa-codigo.md: ${t.split('\n').length} linhas`);
}
