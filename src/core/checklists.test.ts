// Checklists de paridade (docs/checklist-manual-*.md) e plano por frentes: as tabelas de resumo têm de bater com as
// linhas dos itens, e todo item Parcial ou Falta precisa de frente dona. Assim nenhuma fatia esquece de atualizá-los.
import { describe, expect, it } from 'vitest';

const docs = import.meta.glob(['/docs/checklist-manual-cypecad.md', '/docs/checklist-manual-calculo-cypecad.md', '/docs/plano-frentes.md'], {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

const SITUACOES = ['Feito', 'Parcial', 'Falta', 'Fora'] as const;
type Situacao = (typeof SITUACOES)[number];
const FRENTES = ['N', 'R', 'E', 'FU', 'L', 'V'] as const;
const PENDENTE = (s: string) => s === 'Parcial' || s === 'Falta';

const celulas = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const numero = (c: string) => Number(c.replace(/\*/g, ''));

interface Item { id: string; secao: string; situacao: string; frente: string; colunas: number; linha: number }

/** Itens (linhas cuja 1ª célula é um código como C4.3 ou K1.12.4-16) com a seção numerada em que estão. */
function itens(md: string): Item[] {
  const out: Item[] = [];
  let secao = '';
  md.split('\n').forEach((l, i) => {
    const h = /^## (\d+(?:\.\d+)?)[. ]/.exec(l);
    if (h) { secao = h[1]; return; }
    if (l.startsWith('## ')) { secao = ''; return; }
    if (!l.startsWith('|')) return;
    const c = celulas(l);
    if (/^[A-Z]\d/.test(c[0])) out.push({ id: c[0], secao, situacao: c[2], frente: c[3], colunas: c.length, linha: i + 1 });
  });
  return out;
}

/** Linhas de dados da primeira tabela logo abaixo do título `## <titulo>…`. */
function tabela(md: string, titulo: string): string[][] {
  const ls = md.split('\n'), i0 = ls.findIndex((l) => l.startsWith(`## ${titulo}`));
  expect(i0, `seção "${titulo}"`).toBeGreaterThanOrEqual(0);
  const out: string[][] = [];
  let dentro = false;
  for (let i = i0 + 1; i < ls.length && !ls[i].startsWith('## '); i++) {
    if (!ls[i].startsWith('|')) { if (dentro) break; continue; }
    dentro = true;
    const c = celulas(ls[i]);
    if (/^-+$/.test(c[0]) || c[1] === 'Itens' || c[1] === 'Parcial' || c[1] === 'Manual do usuário') continue;
    out.push(c);
  }
  return out;
}

const CHECKLISTS = [
  { arquivo: '/docs/checklist-manual-cypecad.md', resumo: 'Resumo por capítulo', itens: 763 },
  { arquivo: '/docs/checklist-manual-calculo-cypecad.md', resumo: 'Resumo por seção', itens: 661 },
];

describe('checklists de paridade', () => {
  for (const ck of CHECKLISTS) {
    describe(ck.arquivo, () => {
      const md = docs[ck.arquivo];
      const its = itens(md);

      it('cada item tem 5 colunas, situação válida, id único e seção', () => {
        expect(md).toBeTruthy();
        expect(its.length).toBe(ck.itens);
        for (const x of its) {
          expect(x.colunas, `${x.id} (linha ${x.linha}): 5 colunas (sem "|" no texto)`).toBe(5);
          expect(SITUACOES, `${x.id}: situação "${x.situacao}"`).toContain(x.situacao);
          expect(x.secao, `${x.id} fora de seção numerada`).not.toBe('');
        }
        expect(new Set(its.map((x) => x.id)).size).toBe(its.length);
      });

      it('todo item Parcial ou Falta tem frente dona; Feito e Fora levam "—"', () => {
        const sem = its.filter((x) => PENDENTE(x.situacao) && !(FRENTES as readonly string[]).includes(x.frente)).map((x) => x.id);
        expect(sem, 'pendentes sem frente').toEqual([]);
        const comFrente = its.filter((x) => !PENDENTE(x.situacao) && x.frente !== '—').map((x) => x.id);
        expect(comFrente, 'Feito/Fora com frente').toEqual([]);
      });

      it('o resumo por seção bate com as linhas', () => {
        const conta = new Map<string, Record<Situacao, number>>();
        for (const x of its) {
          const r = conta.get(x.secao) ?? { Feito: 0, Parcial: 0, Falta: 0, Fora: 0 };
          r[x.situacao as Situacao]++;
          conta.set(x.secao, r);
        }
        const linhas = tabela(md, ck.resumo);
        const total = linhas.find((c) => c[0].includes('Total'));
        expect(total, 'linha de total').toBeTruthy();
        const secoes = linhas.filter((c) => c !== total);
        expect(secoes.map((c) => /^(\d+(?:\.\d+)?)/.exec(c[0])?.[1]).sort()).toEqual([...conta.keys()].sort());
        for (const c of secoes) {
          const k = /^(\d+(?:\.\d+)?)/.exec(c[0])![1], r = conta.get(k)!;
          const esperado = [r.Feito + r.Parcial + r.Falta + r.Fora, r.Feito, r.Parcial, r.Falta, r.Fora];
          expect(c.slice(1, 6).map(numero), `resumo da seção ${k}`).toEqual(esperado);
        }
        const t = SITUACOES.map((s) => its.filter((x) => x.situacao === s).length);
        expect(total!.slice(1, 6).map(numero), 'total do resumo').toEqual([its.length, ...t]);
      });

      it('as pendências por frente batem com as linhas', () => {
        const linhas = tabela(md, 'Pendências por frente');
        const total = linhas.find((c) => c[0].includes('Total'));
        const fr = linhas.filter((c) => c !== total);
        expect(fr.map((c) => c[0].split(' ')[0]).sort()).toEqual([...FRENTES].sort());
        for (const c of fr) {
          const f = c[0].split(' ')[0];
          const p = its.filter((x) => x.frente === f && x.situacao === 'Parcial').length, a = its.filter((x) => x.frente === f && x.situacao === 'Falta').length;
          expect(c.slice(1, 4).map(numero), `frente ${f}`).toEqual([p, a, p + a]);
        }
        if (total) {
          const p = its.filter((x) => x.situacao === 'Parcial').length, a = its.filter((x) => x.situacao === 'Falta').length;
          expect(total.slice(1, 4).map(numero), 'total das pendências').toEqual([p, a, p + a]);
        }
      });
    });
  }

  it('o plano por frentes soma as pendências dos dois checklists', () => {
    const [u, k] = CHECKLISTS.map((ck) => itens(docs[ck.arquivo]));
    const pend = (its: Item[], f: string) => its.filter((x) => x.frente === f && PENDENTE(x.situacao)).length;
    const linhas = tabela(docs['/docs/plano-frentes.md'], 'Pendências por frente');
    expect(linhas.map((c) => c[0].split(' ')[0]).sort()).toEqual([...FRENTES].sort());
    for (const c of linhas) {
      const f = c[0].split(' ')[0];
      expect(c.slice(1, 4).map(numero), `plano, frente ${f}`).toEqual([pend(u, f), pend(k, f), pend(u, f) + pend(k, f)]);
    }
  });
});
