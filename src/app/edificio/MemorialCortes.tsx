// Cortes do edifício e linhas de seção no memorial (V2): uma figura SVG por corte e por seção, a partir da mesma
// geometria da tela (core/vista3d/corte.ts), com o estilo do papel (memorial.css, escopo .memo).
import { useMemo, type ReactNode } from 'react';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { construirCena } from '../../core/vista3d/cena';
import { desenharCorte, secaoDoPavimento } from '../../core/vista3d/corte';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

export function MemorialCortes({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const cs = b.cortes ?? [], ss = b.secoes ?? [];
  const figs = useMemo(() => {
    if (!cs.length && !ss.length) return null;
    const cena = construirCena(b, { fundacoes: dim?.fundacoes, vigasFundacao: dim?.vigasFundacao });
    const ps = pavimentosOrdenados(b);
    return {
      cortes: cs.map((c) => ({ c, d: desenharCorte(b, c, { cena, idSvg: `m-${c.id}` }) })),
      secoes: ss.map((s) => ({ s, d: secaoDoPavimento(b, s, s.pavimento ?? ps[0]?.id) })),
    };
  }, [b, dim, cs, ss]);
  if (!figs) return null;
  return (
    <>
      {h2('Cortes e seções')}
      {figs.cortes.map(({ c, d }) => (
        <figure key={c.id} data-memorial-corte={c.id}>
          <div dangerouslySetInnerHTML={{ __html: d.svg }} />
          <figcaption>{c.nome}: observador olhando para a {c.sentido === 'esq' ? 'esquerda' : 'direita'} do traçado, {c.profundidade ? `até ${fmt(c.profundidade)} m além do plano` : 'até o fim do edifício'}; polígonos hachurados = elementos seccionados; linhas finas = elementos vistos.</figcaption>
        </figure>
      ))}
      {figs.secoes.map(({ s, d }) => (
        <figure key={s.id} data-memorial-secao={s.id}>
          <div dangerouslySetInnerHTML={{ __html: d.svg }} />
          <figcaption>{s.nome} — {d.pavimentoNome}: linha de {fmt(d.comprimento)} m; vãos livres {d.vaos.length ? d.vaos.map((v) => `${v.apoioIni}–${v.apoioFim} ${fmt(v.livre)} m`).join('; ') : 'nenhum entre apoios'}.</figcaption>
        </figure>
      ))}
    </>
  );
}
