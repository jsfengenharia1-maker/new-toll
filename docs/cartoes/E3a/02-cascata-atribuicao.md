# E3a — cartão 2: seleção em cascata do tipo de laje (vigotas por ficha e nervurada moldada)

Classe: Haiku (um componente existente ganha dois ramos; sem núcleo novo). Aplicar depois do cartão 1.

## Arquivos (1)
`src/app/edificio/Edificio.tsx`: `TipoLajeCampos` passa a receber `b` e ganha as opções "Vigotas por ficha" (filtro de fabricante, ficha e laje da série por altura e intereixo) e "Nervurada moldada no local" (capa, intereixo, largura da nervura, altura total e enchimento). O resumo de peso e altura já aparece na dica abaixo do seletor (`propriedadesLaje(…, b)`); a ficha incoerente ou ausente é recusada pelos comandos `laje.atribuir`, `laje.criar` e `laje.detectarPanos` (mensagem na barra de status).

## Núcleo usado (já existe)
`fichasDisponiveis(b)` e `enchimentosDisponiveis(b)` de `src/core/building/tiposLaje.ts`; o tipo `{ tipo: 'vigotas', ficha, serie }` e `{ tipo: 'moldada', capa, intereixo, bw, h, enchimento }` (`TipoLaje`). Ficha de exemplo é copiada para a obra ao atribuir.

## Regras
Componentes de `src/app/ui`. Rótulos únicos: "Fabricante (filtro)", "Ficha da laje", "Série da laje", "Capa da moldada", "Intereixo da moldada", "Largura da nervura da moldada", "Altura total da moldada", "Enchimento da moldada" (o "Tipo" do seletor continua com esse rótulo).

## Diff de `src/app/edificio/Edificio.tsx`
```diff
--- a/src/app/edificio/Edificio.tsx
+++ b/src/app/edificio/Edificio.tsx
@@ -33,6 +33,7 @@
 import { TabelasGrupo } from './TabelasArmadura';
 import { BibliotecaNormasGrupo } from './BibliotecaNormas';
 import { TiposLajeGrupo } from './TiposLaje';
+import { enchimentosDisponiveis, fichasDisponiveis } from '../../core/building/tiposLaje';
 import { VinculosGrupo } from './Vinculos';
 import { CartaoPilaresParede, PilaresParedeGrupo } from './PilarParedeUI';
 import { CartaoParedes } from './ParedesUI';
@@ -690,13 +691,30 @@
   return b.grupos.find((g) => g.id === pav?.grupo);
 }
 
-function TipoLajeCampos({ tipo, onChange }: { tipo: TipoLaje; onChange: (t: TipoLaje) => void }) {
+function TipoLajeCampos({ b, tipo, onChange }: { b: BuildingModel; tipo: TipoLaje; onChange: (t: TipoLaje) => void }) {
+  const [fab, setFab] = useState('');
+  const todas = fichasDisponiveis(b);
+  const fabricantes = [...new Set(todas.map((x) => x.ficha.fabricante).filter((x): x is string => !!x))];
+  const fichas = todas.filter((x) => !fab || x.ficha.fabricante === fab);
+  const escolher = (id: string) => { const f = todas.find((x) => x.ficha.id === id)?.ficha; if (f) onChange({ tipo: 'vigotas', ficha: id, serie: f.series[0].id }); };
+  const trocaTipo = (v: TipoLaje['tipo']) => onChange(v === 'macica' ? { tipo: 'macica', h: 0.1 } : v === 'trelicada' ? { tipo: 'trelicada', modelo: 'H12', capa: TRELICADAS.H12.capa } : v === 'vigotas' ? { tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' } : { tipo: 'moldada', capa: 0.05, intereixo: 0.6, bw: 0.12, h: 0.25, enchimento: 'eps' });
   return (
     <div className="row wrap">
-      <Select label="Tipo" value={tipo.tipo} options={[{ v: 'macica', label: 'Maciça' }, { v: 'trelicada', label: 'Treliçada (EPS)' }]} onChange={(v) => onChange(v === 'macica' ? { tipo: 'macica', h: 0.1 } : { tipo: 'trelicada', modelo: 'H12', capa: TRELICADAS.H12.capa })} />
+      <Select label="Tipo" value={tipo.tipo} options={[{ v: 'macica', label: 'Maciça' }, { v: 'trelicada', label: 'Treliçada (EPS)' }, { v: 'vigotas', label: 'Vigotas por ficha' }, { v: 'moldada', label: 'Nervurada moldada no local' }]} onChange={trocaTipo} />
       {tipo.tipo === 'macica'
         ? <NumField label="h" unit="cm" width={80} value={+(tipo.h * 100).toFixed(1)} onChange={(v) => v >= 7 && onChange({ tipo: 'macica', h: v / 100 })} />
-        : tipo.tipo !== 'trelicada' ? <Hint>Laje de vigotas por ficha ou nervurada moldada: edite o tipo no grupo “Tipos de laje”.</Hint>
+        : tipo.tipo === 'vigotas' ? <>
+          <Select label="Fabricante (filtro)" value={fab} options={[{ v: '', label: 'todos' }, ...fabricantes.map((f) => ({ v: f, label: f }))]} onChange={setFab} />
+          <Select label="Ficha da laje" value={tipo.ficha} options={fichas.map((x) => ({ v: x.ficha.id, label: x.ficha.nome }))} onChange={escolher} />
+          <Select label="Série da laje" value={tipo.serie} options={(todas.find((x) => x.ficha.id === tipo.ficha)?.ficha.series ?? []).map((s) => ({ v: s.id, label: `${s.id} · h ${Math.round(s.altura * 100)} · i ${Math.round(s.intereixo * 100)}${s.tipo ? ` · ${s.tipo}` : ''}` }))} onChange={(v) => onChange({ ...tipo, serie: v })} />
+        </>
+        : tipo.tipo === 'moldada' ? <>
+          <NumField label="Capa da moldada" unit="cm" width={80} value={+(tipo.capa * 100).toFixed(1)} onChange={(v) => v >= 3 && onChange({ ...tipo, capa: v / 100 })} />
+          <NumField label="Intereixo da moldada" unit="cm" width={80} value={+(tipo.intereixo * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, intereixo: v / 100 })} />
+          <NumField label="Largura da nervura da moldada" unit="cm" width={80} value={+(tipo.bw * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, bw: v / 100 })} />
+          <NumField label="Altura total da moldada" unit="cm" width={80} value={+(tipo.h * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, h: v / 100 })} />
+          <Select label="Enchimento da moldada" value={tipo.enchimento} options={enchimentosDisponiveis(b).map((e) => ({ v: e.id, label: e.nome }))} onChange={(v) => onChange({ ...tipo, enchimento: v })} />
+        </>
         : <>
           <Select label="Enchimento" value={tipo.modelo} options={Object.keys(TRELICADAS).map((k) => ({ v: k, label: k }))} onChange={(v) => onChange({ tipo: 'trelicada', modelo: v, capa: TRELICADAS[v].capa })} />
           <NumField label="Capa" unit="cm" width={80} value={+(tipo.capa * 100).toFixed(1)} onChange={(v) => v >= 3 && onChange({ ...tipo, capa: v / 100 })} />
@@ -714,7 +732,7 @@
   const pp = propriedadesLaje(pl.tipoLaje, b);
   return (
     <Group title={`Lajes — ${grupo?.nome ?? '—'} (${ls.length})`} open={false}>
-      <TipoLajeCampos tipo={pl.tipoLaje} onChange={(t) => pl.set({ tipoLaje: t })} />
+      <TipoLajeCampos b={b} tipo={pl.tipoLaje} onChange={(t) => pl.set({ tipoLaje: t })} />
       <Hint>{pp.descricao}: altura {fmt(pp.h)} m, peso próprio {fmt(pp.pp)} kN/m²{pl.tipoLaje.tipo === 'trelicada' ? ' (catálogo a confirmar com o fabricante)' : ''}.</Hint>
       <div className="row wrap">
         <Button variant={pl.ferramenta === 'laje' ? 'primary' : 'default'} onClick={() => pl.set({ ferramenta: 'laje' })}>Lançar lajes (L)</Button>
```

## Verificação
`npx tsc -b && npx vitest run src/app/design/design.test.ts`
