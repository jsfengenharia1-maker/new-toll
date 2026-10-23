# E3c — cartão 2: nervurada bidirecional como tipo de laje na barra lateral e na planta (camada "Nervuras e cubetas")

Classe: Haiku (um ramo novo num componente existente e uma camada no desenho da planta, no padrão da camada de punção).

## Arquivos (3)
1. `src/app/edificio/plantaStore.ts`: campo `camadaNervuras` (não vai para o arquivo; diff abaixo).
2. `src/app/edificio/Planta.tsx`: cubetas inteiras em traço fino (camada opcional) e setas duplas nas duas direções das nervuras (diff abaixo).
3. `src/app/edificio/Edificio.tsx`: `TipoLajeCampos` ganha "Nervurada bidirecional" (forma, altura total e mesa, com o resumo de peso e volume) e a coluna "Dir. (°)" da tabela de lajes passa a editar a direção das nervuradas (diff abaixo).

## Núcleo usado (já existe)
O tipo `{ tipo: 'nervurada', forma, hTotal, capa }` (`TipoLaje`), `formasDisponiveis(b)`, `geometriaBidirecional(b, tipo)` e `arranjoDaLaje(b, laje)` (`{ g, arr }`; `arr.cubetas[].poligono` são os 4 cantos de cada cubeta inteira, em m) de `src/core/building/nervuradas.ts`; `laje.detectarPanos`, `laje.atribuir` e `laje.editar` já aceitam o tipo novo e a direção. A camada é ligada pelo cartão 3 (caixa "Mostrar nervuras e cubetas na planta"); aqui só o estado e o desenho. Nada de botão na barra da planta.

## Regras
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Rótulos únicos na tela. Sem CSS novo, sem cor literal, sem botão na barra da planta. Nos testes de interface (`e2e/flows.mjs`), `getByRole`/`getByLabel` com `{ exact: true }`, exceto `NumField` e `Select`, cujo rótulo vem com texto extra: nesses, regex ancorada (`/^Forma da nervurada/`). O núcleo e os comandos (`forma.tipo`, `laje.nervurada`, `laje.copiarPanos`, `laje.armaduraBase`, `tipoLaje.importar`) já existem e estão testados; não altere nada de `src/core/`.

Rótulos: o "Tipo" do seletor continua com esse rótulo e ganha a opção "Nervurada bidirecional"; novos: "Forma da nervurada", "Altura total da nervurada", "Mesa da nervurada".

## Diff de `src/app/edificio/plantaStore.ts`
```diff
--- a/src/app/edificio/plantaStore.ts
+++ b/src/app/edificio/plantaStore.ts
@@ -72,6 +72,8 @@
   zonaLargura: number;
   /** O que mostrar na elevação do detalhamento das vigas (R7b; não vai para o arquivo). */
   detMostrar: { inf: boolean; sup: boolean; pele: boolean; estribos: boolean; secao: boolean };
+  /** Camada "Nervuras e cubetas" (E3c): cubetas inteiras das lajes nervuradas bidirecionais do pavimento (não vai para o arquivo). */
+  camadaNervuras: boolean;
   /** Camada "Punção e cortante" (N2d): contornos críticos dos pilares do pavimento e a armadura de punção (não vai para o arquivo). */
   camadaPuncao: boolean;
   /** Ferramenta Armadura de punção: adicionar ou apagar grupos ao clicar num pilar, e o grupo lançado (linhas radiais, barras por linha, φ em mm, espaçamento em m). */
@@ -184,6 +186,7 @@
   zonaLargura: 0.5,
   detMostrar: { inf: true, sup: true, pele: true, estribos: true, secao: true },
   vigotasTodas: false,
+  camadaNervuras: false,
   camadaPuncao: false,
   puncaoModo: 'adicionar',
   puncaoGrupo: { linhas: 8, barras: 3, phi: 6.3, s: 0.12 },
```

## Diff de `src/app/edificio/Planta.tsx`
```diff
--- a/src/app/edificio/Planta.tsx
+++ b/src/app/edificio/Planta.tsx
@@ -2,6 +2,7 @@
 // Toda alteração vira comando do registro; a planta só calcula pontos (capturas, ortogonal/polar, digitação).
 import { faixasVisiveis, larguraGrupo } from './vigotasFaixas';
 import { ehNervurada, rotuloLaje } from '../../core/building/tiposLaje';
+import { arranjoDaLaje } from '../../core/building/nervuradas';
 import { useEffect, useMemo, useRef, useState } from 'react';
 import { useBuilding } from './store';
 import { useRevisao } from './revisao';
@@ -327,6 +328,8 @@
   // punção e cortante (N2d): contornos críticos e armadura dos pilares do pavimento (camada opcional)
   const dimPuncao = useBuilding((st) => st.dim?.puncao);
   const puncaoPlanta = useMemo(() => (pl.camadaPuncao && dimPuncao && pav ? dimPuncao.filter((r) => r.pavimentoId === pav.id) : []), [dimPuncao, pav?.id, pl.camadaPuncao]);
+  // nervuradas bidirecionais (E3c): cubetas inteiras do arranjo (camada opcional)
+  const cubetasPlanta = useMemo(() => (pl.camadaNervuras ? lajes.flatMap(({ l }) => (arranjoDaLaje(b, l)?.arr.cubetas ?? []).map((cb) => cb.poligono)) : []), [b, lajes, pl.camadaNervuras]);
   const bloqueados = useMemo(() => idsBloqueados({ vigas: b.vigas, pilares: b.pilares } as BuildingModel), [b.vigas, b.pilares]);
   const comAviso = useMemo(() => new Set(pl.mostrarErros ? [...niveisRev.a].filter((i) => !comErro.has(i)) : []), [niveisRev, comErro, pl.mostrarErros]);
 
@@ -501,6 +504,16 @@
       if (textosVis.includes('nomes')) ctx.fillText(`${l.nome}${l.definir ? ' ?' : ''}${erro ? ' ⚠' : avi ? ' !' : ''}`, tx + lx, ty - 8 + ly);
       ctx.font = '10px system-ui, sans-serif'; if (textosVis.includes('secoes')) ctx.fillText(l.definir ? 'a definir' : l.tipo.tipo === 'macica' ? `h=${Math.round(l.tipo.h * 100)}` : l.tipo.tipo === 'trelicada' ? `${l.tipo.modelo}+${Math.round(l.tipo.capa * 100)}` : rotuloLaje(b, l.tipo), tx + lx, ty + 6 + ly);
       if (l.insercao !== undefined && l.contorno[l.insercao]) { const [ix, iy] = paraTela(l.contorno[l.insercao][0], l.contorno[l.insercao][1]); ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ix, iy, 5, 0, 2 * Math.PI); ctx.stroke(); } // ponto de inserção do pano (L5)
+      if (l.tipo.tipo === 'nervurada' && !l.definir) { // nervurada bidirecional: setas duplas nas duas direções das nervuras
+        const a0 = ((l.direcao ?? 0) * Math.PI) / 180, L = 16, cy = ty + 22;
+        ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.2; ctx.beginPath();
+        for (const ang of [a0, a0 + Math.PI / 2]) {
+          const ux = Math.cos(ang), uy = -Math.sin(ang);
+          ctx.moveTo(tx - ux * L, cy - uy * L); ctx.lineTo(tx + ux * L, cy + uy * L);
+          for (const sgn of [1, -1]) { const ex = tx + sgn * ux * L, ey = cy + sgn * uy * L; ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 6 - uy * 3.5), ey - sgn * (uy * 6 + ux * 3.5)); ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 6 + uy * 3.5), ey - sgn * (uy * 6 - ux * 3.5)); }
+        }
+        ctx.stroke();
+      }
       if (ehNervurada(l.tipo) && !l.definir) { // seta dupla na direção das vigotas
         const a = ((l.direcao ?? 0) * Math.PI) / 180, L = 22, ux = Math.cos(a), uy = -Math.sin(a), cy = ty + 18 + Math.abs(uy) * L;
         ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.2; ctx.beginPath();
@@ -508,6 +521,16 @@
         for (const sgn of [1, -1]) { const ex = tx + sgn * ux * L, ey = cy + sgn * uy * L; ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 7 - uy * 4), ey - sgn * (uy * 7 + ux * 4)); ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 7 + uy * 4), ey - sgn * (uy * 7 - ux * 4)); }
         ctx.stroke();
       }
+    }
+    // nervuradas bidirecionais (E3c): cubetas inteiras em traço fino (camada opcional)
+    if (cubetasPlanta.length) {
+      ctx.strokeStyle = cores.laje; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.9;
+      for (const poli of cubetasPlanta) {
+        ctx.beginPath();
+        poli.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
+        ctx.closePath(); ctx.stroke();
+      }
+      ctx.globalAlpha = 1;
     }
     // painéis de tela soldada da base detalhada (retângulo com diagonais e designação)
     if (painelLajes.length) {
```

## Diff de `src/app/edificio/Edificio.tsx`
```diff
--- a/src/app/edificio/Edificio.tsx
+++ b/src/app/edificio/Edificio.tsx
@@ -36,6 +36,7 @@
 import { BibliotecaNormasGrupo } from './BibliotecaNormas';
 import { TiposLajeGrupo } from './TiposLaje';
 import { enchimentosDisponiveis, fichasDisponiveis } from '../../core/building/tiposLaje';
+import { formasDisponiveis, geometriaBidirecional } from '../../core/building/nervuradas';
 import { VinculosGrupo } from './Vinculos';
 import { CartaoPilaresParede, PilaresParedeGrupo } from './PilarParedeUI';
 import { CartaoParedes } from './ParedesUI';
@@ -703,10 +704,10 @@
   const fabricantes = [...new Set(todas.map((x) => x.ficha.fabricante).filter((x): x is string => !!x))];
   const fichas = todas.filter((x) => !fab || x.ficha.fabricante === fab);
   const escolher = (id: string) => { const f = todas.find((x) => x.ficha.id === id)?.ficha; if (f) onChange({ tipo: 'vigotas', ficha: id, serie: f.series[0].id }); };
-  const trocaTipo = (v: TipoLaje['tipo']) => onChange(v === 'macica' ? { tipo: 'macica', h: 0.1 } : v === 'trelicada' ? { tipo: 'trelicada', modelo: 'H12', capa: TRELICADAS.H12.capa } : v === 'vigotas' ? { tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' } : { tipo: 'moldada', capa: 0.05, intereixo: 0.6, bw: 0.12, h: 0.25, enchimento: 'eps' });
+  const trocaTipo = (v: TipoLaje['tipo']) => onChange(v === 'macica' ? { tipo: 'macica', h: 0.1 } : v === 'trelicada' ? { tipo: 'trelicada', modelo: 'H12', capa: TRELICADAS.H12.capa } : v === 'vigotas' ? { tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' } : v === 'nervurada' ? { tipo: 'nervurada', forma: formasDisponiveis(b)[0]?.id ?? 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } : { tipo: 'moldada', capa: 0.05, intereixo: 0.6, bw: 0.12, h: 0.25, enchimento: 'eps' });
   return (
     <div className="row wrap">
-      <Select label="Tipo" value={tipo.tipo} options={[{ v: 'macica', label: 'Maciça' }, { v: 'trelicada', label: 'Treliçada (EPS)' }, { v: 'vigotas', label: 'Vigotas por ficha' }, { v: 'moldada', label: 'Nervurada moldada no local' }]} onChange={trocaTipo} />
+      <Select label="Tipo" value={tipo.tipo} options={[{ v: 'macica', label: 'Maciça' }, { v: 'trelicada', label: 'Treliçada (EPS)' }, { v: 'vigotas', label: 'Vigotas por ficha' }, { v: 'moldada', label: 'Nervurada moldada no local' }, { v: 'nervurada', label: 'Nervurada bidirecional' }]} onChange={trocaTipo} />
       {tipo.tipo === 'macica'
         ? <NumField label="h" unit="cm" width={80} value={+(tipo.h * 100).toFixed(1)} onChange={(v) => v >= 7 && onChange({ tipo: 'macica', h: v / 100 })} />
         : tipo.tipo === 'vigotas' ? <>
@@ -721,6 +722,12 @@
           <NumField label="Altura total da moldada" unit="cm" width={80} value={+(tipo.h * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, h: v / 100 })} />
           <Select label="Enchimento da moldada" value={tipo.enchimento} options={enchimentosDisponiveis(b).map((e) => ({ v: e.id, label: e.nome }))} onChange={(v) => onChange({ ...tipo, enchimento: v })} />
         </>
+        : tipo.tipo === 'nervurada' ? <>
+          <Select label="Forma da nervurada" value={tipo.forma} options={formasDisponiveis(b).map((f) => ({ v: f.id, label: f.nome }))} onChange={(v) => onChange({ ...tipo, forma: v })} />
+          <NumField label="Altura total da nervurada" unit="cm" width={80} value={+(tipo.hTotal * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, hTotal: v / 100 })} />
+          <NumField label="Mesa da nervurada" unit="cm" width={80} value={+(tipo.capa * 100).toFixed(1)} onChange={(v) => v >= 3 && onChange({ ...tipo, capa: v / 100 })} />
+          <Hint>{(() => { const g = geometriaBidirecional(b, tipo); return `Zona aliviada: peso ${fmt(g.pp)} kN/m², concreto ${fmt(g.volume, 3)} m³/m², cubeta de ${Math.round(g.forma.altura * 100)} cm (${g.recuperavel ? 'forma recuperável' : 'forma perdida'}).`; })()}</Hint>
+        </>
         : tipo.tipo !== 'trelicada' ? <Hint>Laje de vigotas por ficha ou nervurada moldada: edite o tipo no grupo “Tipos de laje”.</Hint>
         : <>
           <Select label="Enchimento" value={tipo.modelo} options={Object.keys(TRELICADAS).map((k) => ({ v: k, label: k }))} onChange={(v) => onChange({ tipo: 'trelicada', modelo: v, capa: TRELICADAS[v].capa })} />
@@ -759,7 +766,7 @@
                   <td className="tl small">{propriedadesLaje(l.tipo, b).descricao}</td>
                   <td className="num">{fmt(areaLaje(l))}</td>
                   <td className="num">{fmt(v1)} × {fmt(v2)}</td>
-                  <td>{ehNervurada(l.tipo) ? <TextCell value={fmt(l.direcao ?? 0, 0)} num label={`Direção de ${l.nome}`} onCommit={(t) => { const a = num(t); if (Number.isFinite(a)) exec('laje.editar', { id: l.id, direcao: a }); }} /> : <span className="muted">—</span>}</td>
+                  <td>{ehNervurada(l.tipo) || l.tipo.tipo === 'nervurada' ? <TextCell value={fmt(l.direcao ?? 0, 0)} num label={`Direção de ${l.nome}`} onCommit={(t) => { const a = num(t); if (Number.isFinite(a)) exec('laje.editar', { id: l.id, direcao: a }); }} /> : <span className="muted">—</span>}</td>
                 </tr>
               );
             })}
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3c` (cartão 4) cobre a atribuição e a camada.
