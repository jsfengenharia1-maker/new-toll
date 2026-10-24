// Todo item Parcial ou Falta dos checklists precisa de dono real: a nota cita ao menos uma fatia que ainda NÃO foi encerrada.
//
// Regra determinística (a mesma de scripts/residuos.mjs):
//  - código de fatia = R7-0, ou N/R/E/V + número + letra opcional, ou FU/L + número + letra opcional (palavra inteira);
//  - fatia ENCERRADA = (a) entrada de docs/historico-fatias.md ("- ...") com o código nos primeiros 70 caracteres
//    (o histórico é escrito ao fim de cada fatia), ou (b) linha da seção "## Andamento" de docs/plano-execucao.md com o
//    código antes da palavra "concluída/concluído" (qualquer flexão);
//  - fatia ABERTA = qualquer outro código citado; ela também tem de constar em docs/plano-execucao.md (tabela de fatias).
// Ao encerrar uma fatia (linha "concluída" no Andamento), os itens que ela deixou Parcial/Falta devem ganhar na nota uma
// fatia de resíduo nova (ex.: V7a) registrada no plano de execução e no plano por frentes.
import { describe, expect, it } from 'vitest';

const docs = import.meta.glob(
  ['/docs/checklist-manual-cypecad.md', '/docs/checklist-manual-calculo-cypecad.md', '/docs/plano-execucao.md', '/docs/historico-fatias.md'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const CHECKLISTS = ['/docs/checklist-manual-cypecad.md', '/docs/checklist-manual-calculo-cypecad.md'];
const CODIGO = /\b(?:R7-0|[NREV]\d{1,2}[a-z]?|FU\d{1,2}[a-z]?|L\d{1,2}[a-z]?)\b/g;
const celulas = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

function fatiasEncerradas(): Set<string> {
  const plano = docs['/docs/plano-execucao.md'].split('\n');
  const i0 = plano.findIndex((l) => l.startsWith('## Andamento'));
  const i1 = plano.findIndex((l, i) => i > i0 && l.startsWith('## '));
  const s = new Set<string>();
  for (const l of docs['/docs/historico-fatias.md'].split('\n'))
    if (l.startsWith('- ')) for (const t of l.slice(2, 72).match(CODIGO) ?? []) s.add(t);
  for (const l of plano.slice(i0, i1 < 0 ? undefined : i1)) {
    const m = /conclu[ií]d[ao]s?/i.exec(l);
    if (m) for (const t of l.slice(0, m.index).match(CODIGO) ?? []) s.add(t);
  }
  return s;
}

/** Linhas Parcial/Falta: id, e fatias citadas na nota (5ª célula). */
function pendentes(arquivo: string) {
  const out: { id: string; fatias: string[]; residuo: string[] }[] = [];
  for (const l of docs[arquivo].split('\n')) {
    if (!l.startsWith('|')) continue;
    const c = celulas(l);
    if (!/^[A-Z]\d/.test(c[0]) || (c[2] !== 'Parcial' && c[2] !== 'Falta')) continue;
    out.push({ id: c[0], fatias: [...new Set(c[4]?.match(CODIGO) ?? [])], residuo: [...(c[4] ?? "").matchAll(/Resíduo \[([^\]]+)\]/g)].map((m) => m[1]) });
  }
  return out;
}

describe('pendências dos checklists têm dono aberto', () => {
  const enc = fatiasEncerradas();

  it('a regra reconhece fatias encerradas conhecidas', () => {
    for (const f of ['V5', 'V4', 'N2a', 'R7a', 'R7b', 'E5e', 'FU7c']) expect(enc.has(f), f).toBe(true);
  });

  for (const arq of CHECKLISTS) {
    it(`${arq}: todo Parcial/Falta cita uma fatia não encerrada`, () => {
      const sem = pendentes(arq).filter((x) => !x.fatias.some((f) => !enc.has(f))).map((x) => x.id);
      expect(sem, 'itens só com fatias encerradas: acrescentar a fatia de resíduo (ex. V7a) na nota').toEqual([]);
    });

    it(`${arq}: as fatias de resíduo citadas ("Resíduo [x]") constam no plano de execução`, () => {
      const plano = docs['/docs/plano-execucao.md'];
      const faltam = new Set<string>();
      for (const x of pendentes(arq)) for (const f of x.residuo) if (!enc.has(f) && !new RegExp(`\\b${f}\\b`).test(plano)) faltam.add(f);
      expect([...faltam]).toEqual([]);
    });
  }
});
