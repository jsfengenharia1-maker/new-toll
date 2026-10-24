#!/usr/bin/env node
// Lista os itens Parcial/Falta dos checklists e as fatias citadas nas notas, marcando as encerradas.
// Regra de "encerrada" (a mesma de src/core/checklists.test.ts): a fatia consta como concluída quando alguma linha de
// (a) uma entrada de docs/historico-fatias.md ("- ...") traz o código da fatia nos primeiros 70 caracteres, ou
// (b) uma linha da seção "Andamento" de docs/plano-execucao.md traz o código antes da palavra "concluída/concluído".
// Uso: node scripts/residuos.mjs [--json]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (f) => readFileSync(fileURLToPath(new URL(`../docs/${f}`, import.meta.url)), 'utf8');
export const TOKEN = /\b(?:R7-0|[NREV]\d{1,2}[a-z]?|FU\d{1,2}[a-z]?|L\d{1,2}[a-z]?)\b/g;
const cel = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

export function fatiasEncerradas() {
  const plano = ler('plano-execucao.md').split('\n');
  const i0 = plano.findIndex((l) => l.startsWith('## Andamento'));
  const i1 = plano.findIndex((l, i) => i > i0 && l.startsWith('## '));
  const s = new Set();
  // Histórico: entrada "- ..." cujo início (70 caracteres) traz o código da fatia = entregue.
  for (const l of ler('historico-fatias.md').split('\n'))
    if (l.startsWith('- ')) for (const t of l.slice(2, 72).match(TOKEN) ?? []) s.add(t);
  // Andamento: códigos que aparecem antes da primeira palavra "concluída/concluído".
  for (const l of plano.slice(i0, i1 < 0 ? undefined : i1)) {
    const m = /conclu[ií]d[ao]s?/i.exec(l);
    if (m) for (const t of l.slice(0, m.index).match(TOKEN) ?? []) s.add(t);
  }
  return s;
}

export function pendentes() {
  const out = [];
  for (const a of ['checklist-manual-cypecad.md', 'checklist-manual-calculo-cypecad.md'])
    for (const l of ler(a).split('\n')) {
      if (!l.startsWith('|')) continue;
      const c = cel(l);
      if (!/^[A-Z]\d/.test(c[0]) || (c[2] !== 'Parcial' && c[2] !== 'Falta')) continue;
      out.push({ id: c[0], arquivo: a, situacao: c[2], frente: c[3], nota: c[4], fatias: [...new Set(c[4].match(TOKEN) ?? [])] });
    }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const enc = fatiasEncerradas(), p = pendentes();
  const sem = p.filter((x) => !x.fatias.some((f) => !enc.has(f)));
  if (process.argv.includes('--json')) console.log(JSON.stringify(sem, null, 1));
  else {
    console.log(`pendentes: ${p.length}; sem dono aberto: ${sem.length}`);
    for (const x of sem) console.log(`${x.id}\t${x.arquivo.includes('calculo') ? 'K' : 'U'}\t${x.situacao}\t${x.frente}\t[${x.fatias.join(',')}]\t${x.nota.slice(0, 170)}`);
  }
}
