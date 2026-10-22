# Cartão V2-3 — cortes e seções no memorial do edifício

Executor: Haiku. Depende dos cartões 1 e 2 (classes `corte-*` e `b.cortes`).

## Comportamento
Seção "Cortes e seções" do memorial do edifício (some quando não há cortes nem seções), com uma `<figure>` por corte
(`data-memorial-corte`) e por seção (`data-memorial-secao`): o mesmo SVG da tela, no estilo do papel (`memorial.css`), e uma
legenda com lado visto, profundidade e vãos livres. Entra logo antes da listagem geral do memorial.

## Diff esperado
```diff
diff --git a/src/app/edificio/MemorialCortes.tsx b/src/app/edificio/MemorialCortes.tsx
new file mode 100644
index 0000000..ebc9fd3
--- /dev/null
+++ b/src/app/edificio/MemorialCortes.tsx
@@ -0,0 +1,40 @@
+// Cortes do edifício e linhas de seção no memorial (V2): uma figura SVG por corte e por seção, a partir da mesma
+// geometria da tela (core/vista3d/corte.ts), com o estilo do papel (memorial.css, escopo .memo).
+import { useMemo, type ReactNode } from 'react';
+import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
+import type { Dimensionamento } from '../../core/building/dimensionamento';
+import { construirCena } from '../../core/vista3d/cena';
+import { desenharCorte, secaoDoPavimento } from '../../core/vista3d/corte';
+
+const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
+
+export function MemorialCortes({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
+  const cs = b.cortes ?? [], ss = b.secoes ?? [];
+  const figs = useMemo(() => {
+    if (!cs.length && !ss.length) return null;
+    const cena = construirCena(b, { fundacoes: dim?.fundacoes, vigasFundacao: dim?.vigasFundacao });
+    const ps = pavimentosOrdenados(b);
+    return {
+      cortes: cs.map((c) => ({ c, d: desenharCorte(b, c, { cena, idSvg: `m-${c.id}` }) })),
+      secoes: ss.map((s) => ({ s, d: secaoDoPavimento(b, s, s.pavimento ?? ps[0]?.id) })),
+    };
+  }, [b, dim, cs, ss]);
+  if (!figs) return null;
+  return (
+    <>
+      {h2('Cortes e seções')}
+      {figs.cortes.map(({ c, d }) => (
+        <figure key={c.id} data-memorial-corte={c.id}>
+          <div dangerouslySetInnerHTML={{ __html: d.svg }} />
+          <figcaption>{c.nome}: observador olhando para a {c.sentido === 'esq' ? 'esquerda' : 'direita'} do traçado, {c.profundidade ? `até ${fmt(c.profundidade)} m além do plano` : 'até o fim do edifício'}; polígonos hachurados = elementos seccionados; linhas finas = elementos vistos.</figcaption>
+        </figure>
+      ))}
+      {figs.secoes.map(({ s, d }) => (
+        <figure key={s.id} data-memorial-secao={s.id}>
+          <div dangerouslySetInnerHTML={{ __html: d.svg }} />
+          <figcaption>{s.nome} — {d.pavimentoNome}: linha de {fmt(d.comprimento)} m; vãos livres {d.vaos.length ? d.vaos.map((v) => `${v.apoioIni}–${v.apoioFim} ${fmt(v.livre)} m`).join('; ') : 'nenhum entre apoios'}.</figcaption>
+        </figure>
+      ))}
+    </>
+  );
+}
diff --git a/src/app/edificio/MemorialEdificio.tsx b/src/app/edificio/MemorialEdificio.tsx
index 53e3e6d..94c6595 100644
--- a/src/app/edificio/MemorialEdificio.tsx
+++ b/src/app/edificio/MemorialEdificio.tsx
@@ -3,6 +3,7 @@
 import { MemorialPilaresParede } from './MemorialPilarParede';
 import { MemorialParedes } from './MemorialParedes';
 import { MemorialAlvenaria } from './AlvenariaResumo';
+import { MemorialCortes } from './MemorialCortes';
 import { PAINEL_TELA } from '../../core/building/telasSoldadas';
 import { useMemo, useRef, useState, type ReactNode } from 'react';
 import { calculoAtual, dimAtual, useBuilding } from './store';
@@ -169,6 +170,7 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
 
           {(() => { const fig = iso ? svgIsometrico(b, { fundacoes: dim?.fundacoes, vigasFundacao: dim?.vigasFundacao }) : ''; return fig ? <figure data-isometrico><div dangerouslySetInnerHTML={{ __html: fig }} /><figcaption>Vista isométrica do edifício, gerada da geometria lançada (pilares, vigas, lajes{dim?.fundacoes?.length ? ' e fundações' : ''}); cores por tipo de elemento.</figcaption></figure> : null; })()}
 
+          <MemorialCortes b={b} dim={dim} h2={h2} />
           <MemorialListagemGeral b={b} h2={h2} />
           {h2('Ações')}
           <table>
```

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design/design.test.ts
```
