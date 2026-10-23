# N3 — cartão 2: telas, ocupações e γ lidos da biblioteca de normas na interface

Classe: Haiku (troca mecânica de constantes por leitura da biblioteca; sem componente novo). Depende do cartão 1 só por ordem (compila sozinho).

## Arquivos (4)
`BaseLaje.tsx` (catálogo de telas por `telasDe(modelo)`), `Incendio.tsx` (ocupações por `divisoesOcupacao(b)`), `MemorialAcoes.tsx` e `EstadosLimite.tsx` (γ por origem por `gamasPorOrigem(b)`). Aplicar o diff abaixo (as funções já existem no núcleo: `telasDe` em `building/telasSoldadas.ts`, `divisoesOcupacao` em `building/fogoTabelas.ts`, `gamasPorOrigem` em `building/acoes.ts`).

```diff
diff --git a/src/app/edificio/BaseLaje.tsx b/src/app/edificio/BaseLaje.tsx
index d7db4a8..c3d26a3 100644
--- a/src/app/edificio/BaseLaje.tsx
+++ b/src/app/edificio/BaseLaje.tsx
@@ -7,5 +7,5 @@ import { executarERecalcular } from './Armadura';
 import { Button, Check, NumField, Pill, Select } from '../ui';
 import { linhaLajes, tabelaDe } from '../../core/building/tabelasArmadura';
-import { PAINEL_TELA, TELAS } from '../../core/building/telasSoldadas';
+import { PAINEL_TELA, telasDe } from '../../core/building/telasSoldadas';
 import type { ArmaduraPredefinida, BaseFaceLaje, Laje } from '../../core/building/types';
 import { fmt, phiTxt } from './Detalhamento';
@@ -15,5 +15,5 @@ interface FaceEd { modo: Modo; phi: [number, number]; s: [number, number]; tela:
 const faceInicial = (f: BaseFaceLaje | undefined, phi0: number): FaceEd => ({
   modo: f?.tela ? 'tela' : f?.barras ? 'barras' : 'nenhuma',
-  phi: [f?.barras?.[0]?.phi ?? phi0, f?.barras?.[1]?.phi ?? phi0], s: [f?.barras?.[0]?.s ?? 20, f?.barras?.[1]?.s ?? 20], tela: f?.tela ?? TELAS[4].id, giro: !!f?.giro,
+  phi: [f?.barras?.[0]?.phi ?? phi0, f?.barras?.[1]?.phi ?? phi0], s: [f?.barras?.[0]?.s ?? 20, f?.barras?.[1]?.s ?? 20], tela: f?.tela ?? telasDe()[4].id, giro: !!f?.giro,
 });
 const paraComando = (e: FaceEd) => e.modo === 'tela' ? { tela: e.tela, ...(e.giro ? { giro: true } : {}) } : { barras: [0, 1].map((dir) => ({ dir, phi: e.phi[dir], s: e.s[dir] })) };
@@ -21,4 +21,5 @@ const paraComando = (e: FaceEd) => e.modo === 'tela' ? { tela: e.tela, ...(e.gir
 function FaceEditor({ nome, ed, set, bitolas }: { nome: string; ed: FaceEd; set: (v: FaceEd) => void; bitolas: number[] }) {
   const op = bitolas.map((p) => ({ v: p, label: phiTxt(p) }));
+  const modelo = useBuilding((s) => s.sessao.modelo);
   return (
     <div data-base-face={nome}>
@@ -34,5 +35,5 @@ function FaceEditor({ nome, ed, set, bitolas }: { nome: string; ed: FaceEd; set:
         {ed.modo === 'tela' && (
           <>
-            <Select label="Tela (NBR 7481)" value={ed.tela} options={TELAS.map((t) => ({ v: t.id, label: `${t.id} · ${fmt(t.AsL)} cm²/m` }))} onChange={(v) => set({ ...ed, tela: v })} />
+            <Select label="Tela (NBR 7481)" value={ed.tela} options={telasDe(modelo).map((t) => ({ v: t.id, label: `${t.id} · ${fmt(t.AsL)} cm²/m` }))} onChange={(v) => set({ ...ed, tela: v })} />
             <Check label="Girar os fios" checked={ed.giro} onChange={(v) => set({ ...ed, giro: v })} />
           </>
diff --git a/src/app/edificio/EstadosLimite.tsx b/src/app/edificio/EstadosLimite.tsx
index 9337e5e..55709d0 100644
--- a/src/app/edificio/EstadosLimite.tsx
+++ b/src/app/edificio/EstadosLimite.tsx
@@ -3,5 +3,5 @@
 // colar, importar da norma, biblioteca) com o alerta de responsabilidade.
 import { useEffect, useMemo, useState } from 'react';
-import { alertasSituacoes, comandosDaLista, CONTROLE_INFO, ESTADOS_INFO, estadoEmUso, fatoresDaSituacao, GAMA_ORIGEM, listaDeSituacoes, textosAlertas, type ListaSituacoes } from '../../core/building/acoes';
+import { alertasSituacoes, comandosDaLista, CONTROLE_INFO, ESTADOS_INFO, estadoEmUso, fatoresDaSituacao, gamasPorOrigem, listaDeSituacoes, textosAlertas, type ListaSituacoes } from '../../core/building/acoes';
 import { combinacoesDoEstado, combinacoesEdificio } from '../../core/building/combinacoes';
 import { gamas } from '../../core/building/materiais';
@@ -184,5 +184,5 @@ export function EstadosGrupo({ b }: { b: BuildingModel }) {
         <table className="data quadro">
           <thead><tr><th>Origem</th><th>Normal (desf./fav.)</th><th>Construção / especial</th><th>Excepcional</th></tr></thead>
-          <tbody>{GAMA_ORIGEM.map((l) => <tr key={l.id} title={l.fonte}><td className="tl">{l.origem}{l.aConfirmar ? ' *' : ''}</td>{[l.normal, l.especial, l.excepcional].map((p, i) => <td key={i} className="num">{fmt(p[0], 2)} / {fmt(p[1], 2)}</td>)}</tr>)}</tbody>
+          <tbody>{gamasPorOrigem(b).map((l) => <tr key={l.id} title={l.fonte}><td className="tl">{l.origem}{l.aConfirmar ? ' *' : ''}</td>{[l.normal, l.especial, l.excepcional].map((p, i) => <td key={i} className="num">{fmt(p[0], 2)} / {fmt(p[1], 2)}</td>)}</tr>)}</tbody>
         </table>
         <Hint>NBR 6118, Tabela 11.1 e linhas de empuxo e de ações indiretas da NBR 8681. * valores a confirmar. As combinações geradas usam γg, γq e γh dos materiais; os de construção/especial servem de referência para as situações do usuário.</Hint>
diff --git a/src/app/edificio/Incendio.tsx b/src/app/edificio/Incendio.tsx
index 48d20c1..9fe7231 100644
--- a/src/app/edificio/Incendio.tsx
+++ b/src/app/edificio/Incendio.tsx
@@ -4,5 +4,5 @@ import { useState } from 'react';
 import { estadoEmUso } from '../../core/building/acoes';
 import { alturaDaEdificacao, MATERIAIS_REVESTIMENTO, sugestaoTrrf, trrfDoGrupo, type MaterialRevestimento } from '../../core/building/fogo';
-import { DIVISOES_OCUPACAO } from '../../core/building/fogoTabelas';
+import { divisoesOcupacao } from '../../core/building/fogoTabelas';
 import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
 import type { BuildingModel } from '../../core/building/types';
@@ -15,5 +15,5 @@ const MATERIAIS: { v: Mat; label: string }[] = [{ v: '', label: 'sem revestiment
 type TipoEl = 'viga' | 'pilar' | 'laje';
 const TIPOS_EL: { v: TipoEl; label: string }[] = [{ v: 'viga', label: 'Viga' }, { v: 'pilar', label: 'Pilar' }, { v: 'laje', label: 'Laje' }];
-const OCUPACOES:{ v: string; label: string }[] = [{ v: '', label: '— não informada —' }, ...DIVISOES_OCUPACAO.map((d) => ({ v: d.divisao, label: `${d.divisao} — ${d.ocupacao}` }))];
+const ocupacoesDe = (b: BuildingModel): { v: string; label: string }[] => [{ v: '', label: '— não informada —' }, ...divisoesOcupacao(b).map((d) => ({ v: d.divisao, label: `${d.divisao} — ${d.ocupacao}` }))];
 
 export function IncendioGrupo({ b }: { b: BuildingModel }) {
@@ -33,5 +33,5 @@ export function IncendioGrupo({ b }: { b: BuildingModel }) {
     <Group title={ativo ? 'Incêndio (ligado)' : 'Incêndio'} open={false}>
       <Check label="Verificar resistência ao fogo (NBR 15200)" checked={ativo} onChange={(c) => f({ ativo: c })} />
-      <Select label="Ocupação (NBR 14432 / IT)" value={b.fogo?.ocupacao ?? ''} options={OCUPACOES} onChange={(v) => (v === '' ? f({ remover: { ocupacao: true } }) : f({ ocupacao: v }))} />
+      <Select label="Ocupação (NBR 14432 / IT)" value={b.fogo?.ocupacao ?? ''} options={ocupacoesDe(b)} onChange={(v) => (v === '' ? f({ remover: { ocupacao: true } }) : f({ ocupacao: v }))} />
       <div className="row wrap">
         <NumField label="Altura da edificação" unit="m" value={b.fogo?.altura ?? alturaDaEdificacao(b)} onChange={(v) => f({ altura: v })} />
diff --git a/src/app/edificio/MemorialAcoes.tsx b/src/app/edificio/MemorialAcoes.tsx
index 66b1f26..fc00ce1 100644
--- a/src/app/edificio/MemorialAcoes.tsx
+++ b/src/app/edificio/MemorialAcoes.tsx
@@ -1,5 +1,5 @@
 // Memorial do edifício: ações e combinações da frente N2a (descrição e arranjos dos casos, compatibilidade, estados-limite,
 // controle de execução e γ por origem, situações do usuário com o alerta, empuxo de terra, equilíbrio global, ábacos de vento).
-import { alertasSituacoes, CONTROLE_INFO, ESTADOS_INFO, estadoEmUso, fatoresDaSituacao, GAMA_ORIGEM, textosAlertas } from '../../core/building/acoes';
+import { alertasSituacoes, CONTROLE_INFO, ESTADOS_INFO, estadoEmUso, fatoresDaSituacao, gamasPorOrigem, textosAlertas } from '../../core/building/acoes';
 import { abacoCaPreenchido, abacoVizPreenchido } from '../../core/building/abacosVento';
 import { combinacoesDoEstado, combinacoesEdificio } from '../../core/building/combinacoes';
@@ -49,5 +49,5 @@ export function MemorialAcoes({ b, analise, dim }: { b: BuildingModel; analise:
       <table>
         <thead><tr><th className="l">γ por origem da ação (desfavorável / favorável)</th><th>Normal</th><th>Construção / especial</th><th>Excepcional</th><th className="l">Fonte</th></tr></thead>
-        <tbody>{GAMA_ORIGEM.map((l) => <tr key={l.id}><td className="l">{l.origem}</td>{[l.normal, l.especial, l.excepcional].map((p, i) => <td key={i}>{fmt(p[0])} / {fmt(p[1])}</td>)}<td className="l">{l.fonte}{l.aConfirmar ? '; a confirmar' : ''}</td></tr>)}</tbody>
+        <tbody>{gamasPorOrigem(b).map((l) => <tr key={l.id}><td className="l">{l.origem}</td>{[l.normal, l.especial, l.excepcional].map((p, i) => <td key={i}>{fmt(p[0])} / {fmt(p[1])}</td>)}<td className="l">{l.fonte}{l.aConfirmar ? '; a confirmar' : ''}</td></tr>)}</tbody>
       </table>
 
```

## Verificação
`npx tsc -b && npx vitest run src/app/design/design.test.ts`
