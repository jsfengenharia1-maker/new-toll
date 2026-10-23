# L4 — cartão 05: Memorial: áreas por grupo e anexo do guia rápido

Classe: Haiku (interface sobre núcleo pronto; código validado).

## Arquivos
- `src/app/edificio/MemorialGrupos.tsx` (novo): `MemorialAreasGrupos` (tabela `[data-memorial-areas]`) e `MemorialGuia`
- `src/app/edificio/MemorialEdificio.tsx`: tabela de áreas depois da lista de pavimentos e check "Incluir guia rápido (anexo)"

## Núcleo usado (já existe)
Núcleo: `areasDoGrupo` e `guiaRapido`.

## Aplicação
`git apply docs/cartoes/L4/patches/05-memorial.patch` (ou aplique o bloco `diff` abaixo, trecho a trecho).

## Verificação
- `npx tsc -b`
- `npx vitest run src/app/design`

## Rótulos e regras
Check `Incluir guia rápido (anexo)`; tabela `[data-memorial-areas]`; bloco `[data-guia-rapido]`. Rótulos únicos: não repita o texto de outro botão da tela (o e2e usa `{ exact: true }`). Sem botões novos na barra da planta.

## Patch
```diff
diff --git a/src/app/edificio/MemorialEdificio.tsx b/src/app/edificio/MemorialEdificio.tsx
index 275ab7c..488a356 100644
--- a/src/app/edificio/MemorialEdificio.tsx
+++ b/src/app/edificio/MemorialEdificio.tsx
@@ -23,6 +23,7 @@ import { PREMISSAS, TAXAS } from '../../core/building/premissas';
 import { cotaFundacao, inicioDe, lancesDoPilar, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO, ORIGEM_ROTULO } from '../../core/building/types';
 import { apoioDoPilar, excentricidadeApoio } from '../../core/building/transicao';
 import { svgIsometrico, svgPlantaGrupo } from './desenhoMemorial';
+import { MemorialAreasGrupos, MemorialGuia } from './MemorialGrupos';
 import { MemorialGabaritos } from './MemorialGabaritos';
 import { casosDaObra } from '../../core/building/types';
 import { combinacoesEdificio } from '../../core/building/combinacoes';
@@ -53,6 +54,7 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
   const [today] = useState(() => new Date().toLocaleDateString('pt-BR'));
   const [iso, setIso] = useState(false);
   const [eluDet, setEluDet] = useState(false);
+  const [guia, setGuia] = useState(false);
   const r = useMemo(() => (analise ? resumoAnalise(b, analise) : null), [b, analise]);
   const velha = !!analise && (!calculoAtual(estado) || !dimAtual(estado));
   const perfil = perfilDe(b);
@@ -115,6 +117,7 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
         <Spacer />
         <Check label="Incluir vista isométrica" checked={iso} onChange={setIso} />
         <Check label="ELU por combinação" checked={eluDet} onChange={setEluDet} />
+        <Check label="Incluir guia rápido (anexo)" checked={guia} onChange={setGuia} />
         <Button variant="primary" onClick={() => { printHtmlDoc(html()); st.set({ message: 'Impressão do memorial: escolha “Salvar como PDF”.' }); }}>Imprimir / PDF</Button>
         <Button onClick={exportar}>Exportar HTML</Button>
         <Button onClick={onClose}>Fechar</Button>
@@ -153,6 +156,7 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
             <tbody>{[...ps].reverse().map((p) => <tr key={p.id}><td className="l">{p.nome}</td><td>{fmt(p.cota)}</td><td>{fmt(peDireito(b, p.id))}</td><td className="l">{b.grupos.find((g) => g.id === p.grupo)?.nome ?? '—'}</td></tr>)}</tbody>
           </table>
           <p>Fundação na cota {fmt(cotaFundacao(b))} m. {b.pilares.length} pilares{b.pilaresParede?.length ? `, ${b.pilaresParede.length} pilar(es)-parede` : ''}, {b.vigas.length} vigas e {b.lajes.length} lajes lançadas.</p>
+          <MemorialAreasGrupos b={b} />
           <MemorialGabaritos b={b} />
           {apoiados.length > 0 && <>
             <h3>Pilares que nascem acima da fundação (apoiados)</h3>
@@ -697,6 +701,7 @@ export function MemorialEdificio({ onClose }: { onClose: () => void }) {
 
           {h2('Premissas', true)}
           <ul>{PREMISSAS.map((p) => <li key={p.id}><b>{p.tema}.</b> {p.texto} <i>({p.fonte}{p.aConfirmar ? '; a confirmar' : ''})</i></li>)}</ul>
+          {guia && <MemorialGuia h2={h2} />}
           <p className="small">Resultados de ferramenta de apoio ao projeto: a responsabilidade pela concepção, verificação e detalhamento é do engenheiro responsável.</p>
         </div>
       </div>
diff --git a/src/app/edificio/MemorialGrupos.tsx b/src/app/edificio/MemorialGrupos.tsx
new file mode 100644
index 0000000..d7fbe1c
--- /dev/null
+++ b/src/app/edificio/MemorialGrupos.tsx
@@ -0,0 +1,30 @@
+// Memorial (L4): áreas por grupo de pavimentos e anexo opcional com o guia rápido.
+import type { ReactNode } from 'react';
+import { areasDoGrupo } from '../../core/building/gruposCopia';
+import type { BuildingModel } from '../../core/building/types';
+import { GuiaConteudo } from './GuiaRapido';
+
+const fmt = (v: number) => v.toFixed(2).replace('.', ',');
+
+export function MemorialAreasGrupos({ b }: { b: BuildingModel }) {
+  if (!b.grupos.length) return null;
+  return (
+    <>
+      <h3>Áreas por grupo de pavimentos</h3>
+      <table data-memorial-areas>
+        <thead><tr><th className="l">Grupo</th><th>Pavimentos</th><th>Lajes (m²)</th><th>Vigas (m²)</th><th>Pilares (m²)</th><th>Muros (m²)</th><th>Total da planta (m²)</th><th>Total do grupo (m²)</th></tr></thead>
+        <tbody>{b.grupos.map((g) => { const a = areasDoGrupo(b, g.id); return <tr key={g.id}><td className="l">{g.nome}</td><td>{a.pavimentos}</td><td>{fmt(a.lajes)}</td><td>{fmt(a.vigas)}</td><td>{fmt(a.pilares)}</td><td>{fmt(a.muros)}</td><td>{fmt(a.total)}</td><td>{fmt(a.totalGrupo)}</td></tr>; })}</tbody>
+      </table>
+      <p className="small">Áreas da planta de um pavimento: lajes sem furos, vigas (comprimento × largura), pilares e muros que chegam ao pavimento; somadas sem descontar a sobreposição do contorno da laje com as vigas [a confirmar].</p>
+    </>
+  );
+}
+
+export function MemorialGuia({ h2 }: { h2: (c: ReactNode, brk?: boolean) => ReactNode }) {
+  return (
+    <>
+      {h2('Anexo: guia rápido', true)}
+      <GuiaConteudo />
+    </>
+  );
+}
```
