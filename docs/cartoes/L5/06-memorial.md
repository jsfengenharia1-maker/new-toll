# L5 — cartão 06: Memorial: aberturas com viga de borda e panos a definir

Classe: Haiku (interface sobre núcleo pronto; código validado).

## Arquivos
- `src/app/edificio/MemorialL5.tsx` (novo)
- `src/app/edificio/MemorialEdificio.tsx`

## O que faz
`MemorialL5.tsx` (tabela `data-memorial-aberturas`) montado em `MemorialEdificio.tsx` depois das áreas por grupo.

## Núcleo usado (já existe)
Comandos e funções da L5 listados em `00-indice.md`; sem núcleo novo.

## Aplicação
`git apply docs/cartoes/L5/patches/06-memorial.patch` (ou aplique o bloco `diff` abaixo, trecho a trecho).

## Verificação
- `npx tsc -b`; `npx vitest run src/app`

## Rótulos e regras
Sem texto novo fora do memorial.

## Patch
```diff
diff --git a/src/app/edificio/MemorialEdificio.tsx b/src/app/edificio/MemorialEdificio.tsx
index 79f2cd8..1443bd5 100644
--- a/src/app/edificio/MemorialEdificio.tsx
+++ b/src/app/edificio/MemorialEdificio.tsx
@@ -26,6 +26,7 @@ import { apoioDoPilar, excentricidadeApoio } from '../../core/building/transicao
 import { svgIsometrico, svgPlantaGrupo } from './desenhoMemorial';
 import { MemorialAreasGrupos, MemorialGuia } from './MemorialGrupos';
 import { MemorialGabaritos } from './MemorialGabaritos';
+import { MemorialAberturas } from './MemorialL5';
 import { casosDaObra } from '../../core/building/types';
 import { combinacoesEdificio } from '../../core/building/combinacoes';
 import { cotaTerreno, POSICAO_LABEL, TIPO_FUNDACAO_LABEL } from '../../core/building/fundacao';
@@ -162,6 +163,7 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
           </table>
           <p>Fundação na cota {fmt(cotaFundacao(b))} m. {b.pilares.length} pilares{b.pilaresParede?.length ? `, ${b.pilaresParede.length} pilar(es)-parede` : ''}, {b.vigas.length} vigas e {b.lajes.length} lajes lançadas.</p>
           <MemorialAreasGrupos b={b} />
+          <MemorialAberturas b={b} />
           <MemorialGabaritos b={b} />
           {apoiados.length > 0 && <>
             <h3>Pilares que nascem acima da fundação (apoiados)</h3>
diff --git a/src/app/edificio/MemorialL5.tsx b/src/app/edificio/MemorialL5.tsx
new file mode 100644
index 0000000..5594ad1
--- /dev/null
+++ b/src/app/edificio/MemorialL5.tsx
@@ -0,0 +1,24 @@
+// Memorial (L5): aberturas das lajes com a viga de borda e panos a definir.
+import { aberturasDoModelo, panosADefinir } from '../../core/building/lancamentoL5';
+import type { BuildingModel } from '../../core/building/types';
+
+const fmt = (v: number) => v.toFixed(2).replace('.', ',');
+const BORDA = { nenhuma: 'sem viga de borda', chata: 'viga chata (altura da laje)', alta: 'viga alta' } as const;
+
+export function MemorialAberturas({ b }: { b: BuildingModel }) {
+  const ab = aberturasDoModelo(b), dd = panosADefinir(b);
+  if (!ab.length && !dd.length) return null;
+  return (
+    <>
+      <h3>Aberturas das lajes e panos a definir</h3>
+      {ab.length > 0 && (
+        <table data-memorial-aberturas>
+          <thead><tr><th className="l">Laje</th><th className="l">Grupo</th><th>Abertura</th><th>Área (m²)</th><th className="l">Borda</th></tr></thead>
+          <tbody>{ab.map((a) => <tr key={`${a.laje}-${a.abertura}`}><td className="l">{a.laje}</td><td className="l">{a.grupo}</td><td>{a.abertura}</td><td>{fmt(a.area)}</td><td className="l">{BORDA[a.borda]}</td></tr>)}</tbody>
+        </table>
+      )}
+      {dd.length > 0 && <p className="small">Panos ainda a definir (a obra não calcula até o tipo ser atribuído): {dd.join(', ')}.</p>}
+      <p className="small">Largura e altura padrão das vigas de borda de abertura: 15 × 40 cm [a confirmar]; a viga chata tem a altura da laje.</p>
+    </>
+  );
+}
```
