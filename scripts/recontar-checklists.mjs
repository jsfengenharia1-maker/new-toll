#!/usr/bin/env node
// Recontagem dos checklists de paridade: reescreve as tabelas de resumo (por capítulo/seção e por frente, com o Total)
// dos dois checklists e a tabela de pendências de docs/plano-frentes.md a partir das linhas de itens.
// Só os números mudam; rótulos e textos das linhas são preservados. Mesma lógica de src/core/checklists.test.ts.
// Uso: node scripts/recontar-checklists.mjs   (ou npm run checklists)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRENTES = ['N', 'R', 'E', 'FU', 'L', 'V'];
const SIT = ['Feito', 'Parcial', 'Falta', 'Fora'];
const pend = (s) => s === 'Parcial' || s === 'Falta';
const celulas = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

function itens(md) {
  const out = [];
  let secao = '';
  for (const l of md.split('\n')) {
    const h = /^## (\d+(?:\.\d+)?)[. ]/.exec(l);
    if (h) { secao = h[1]; continue; }
    if (l.startsWith('## ')) { secao = ''; continue; }
    if (!l.startsWith('|')) continue;
    const c = celulas(l);
    if (/^[A-Z]\d/.test(c[0])) out.push({ id: c[0], secao, situacao: c[2], frente: c[3] });
  }
  return out;
}

/** Reescreve a primeira tabela abaixo de `## <titulo>`; `valores(rotulo)` devolve os números da linha (ou null para manter). */
function reescreve(md, titulo, valores) {
  const ls = md.split('\n');
  const i0 = ls.findIndex((l) => l.startsWith(`## ${titulo}`));
  if (i0 < 0) throw new Error(`seção "${titulo}" não encontrada`);
  let dentro = false;
  for (let i = i0 + 1; i < ls.length && !ls[i].startsWith('## '); i++) {
    if (!ls[i].startsWith('|')) { if (dentro) break; continue; }
    dentro = true;
    const c = celulas(ls[i]);
    if (/^-+$/.test(c[0]) || c[1] === 'Itens' || c[1] === 'Parcial' || c[1] === 'Manual do usuário') continue;
    const v = valores(c[0]);
    if (!v) continue;
    const negrito = c[0].startsWith('**');
    const novas = v.map((n) => (negrito ? `**${n}**` : String(n)));
    ls[i] = `| ${[c[0], ...novas, ...c.slice(1 + v.length)].join(' | ')} |`;
  }
  return ls.join('\n');
}

const linhasTot = (its) => {
  const t = SIT.map((s) => its.filter((x) => x.situacao === s).length);
  return [its.length, ...t];
};
const pf = (its, f) => {
  const p = its.filter((x) => x.frente === f && x.situacao === 'Parcial').length;
  const a = its.filter((x) => x.frente === f && x.situacao === 'Falta').length;
  return [p, a, p + a];
};

function recontaChecklist(docs, nome, tituloResumo, tituloPend) {
  const arq = (n) => join(docs, n);
  let md = readFileSync(arq(nome), 'utf8');
  const its = itens(md);
  md = reescreve(md, tituloResumo, (rot) => {
    if (rot.includes('Total')) return linhasTot(its);
    const k = /^(\d+(?:\.\d+)?)/.exec(rot)?.[1];
    if (!k) return null;
    const s = its.filter((x) => x.secao === k);
    return linhasTot(s);
  });
  md = reescreve(md, tituloPend, (rot) => {
    if (rot.includes('Total')) {
      const p = its.filter((x) => x.situacao === 'Parcial').length, a = its.filter((x) => x.situacao === 'Falta').length;
      return [p, a, p + a];
    }
    const f = rot.split(' ')[0];
    return FRENTES.includes(f) ? pf(its, f) : null;
  });
  writeFileSync(arq(nome), md);
  return its;
}

/** Recalcula as tabelas de resumo e de pendências de `docs` (padrão: docs/). Devolve a contagem de itens por checklist. */
export function recontar(docs = join(raiz, 'docs')) {
  const u = recontaChecklist(docs, 'checklist-manual-cypecad.md', 'Resumo por capítulo', 'Pendências por frente');
  const k = recontaChecklist(docs, 'checklist-manual-calculo-cypecad.md', 'Resumo por seção', 'Pendências por frente');

  let plano = readFileSync(join(docs, 'plano-frentes.md'), 'utf8');
  plano = reescreve(plano, 'Pendências por frente', (rot) => {
    if (rot.includes('Total')) {
      const a = pf(u, 'N'); void a;
      const tu = u.filter((x) => pend(x.situacao)).length, tk = k.filter((x) => pend(x.situacao)).length;
      return [tu, tk, tu + tk];
    }
    const f = rot.split(' ')[0];
    if (!FRENTES.includes(f)) return null;
    const a = pf(u, f)[2], b = pf(k, f)[2];
    return [a, b, a + b];
  });
  writeFileSync(join(docs, 'plano-frentes.md'), plano);
  return { usuario: u.length, calculo: k.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = recontar();
  console.log(`checklists recontados: manual do usuário ${r.usuario} itens, manual de cálculo ${r.calculo} itens.`);
}
