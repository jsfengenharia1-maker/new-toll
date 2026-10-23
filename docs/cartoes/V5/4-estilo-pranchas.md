# Cartão V5-4 — estilo de desenho, símbolos e saídas em Pranchas

Executor: Haiku. Depois do cartão 3. `src/app/edificio/EstiloPranchas.tsx` (novo) e `Pranchas.tsx`.

## Comportamento
- Bloco `data-estilo-pranchas` na aba Pranchas: símbolos do pilar que passa, nasce e morre (hachura, contorno tracejado, cruz, preenchido, contorno) e "Símbolos padrão"; tabela de camadas (camada, nome, cor ACI, pena em mm), fator de tamanho de texto por tipo, "Voltar ao estilo padrão", salvar e abrir o estilo em arquivo JSON; importar DXF como detalhe da folha ou como modelo de moldura (posição X e Y em mm e escala) e remover os importados.
- Tudo pelo comando `prancha.definir` (`simbolos`, `estilo`, `estiloPadrao`, `moldura`, `removerMoldura`, `detalhe`, `removerDetalhes`).
- As folhas "Cargas por caso e grupo" e "Perspectiva axonométrica" aparecem na lista de tipos (o núcleo e o rótulo já estão no código); "todas" não as inclui.

## Rótulos
`Símbolo do pilar que passa`, `Símbolo do pilar que nasce`, `Símbolo do pilar que morre`, `Símbolos padrão`, `Camada do estilo`, `Nome da camada`, `Cor ACI da camada`, `Pena da camada`, `Tipo de texto`, `Fator do tamanho do texto`, `Voltar ao estilo padrão`, `Salvar estilo em arquivo`, `Abrir estilo de arquivo`, `DXF importado como`, `Posição X do DXF na folha`, `Posição Y do DXF na folha`, `Escala do DXF`, `Importar DXF`, `Remover DXF importados`.

## Regras desta frente (valem para este cartão)
- Só `src/app/ui` para controles (`Button`, `Check`, `Select`, `NumField`, `TextField`, `Group`, `Hint`); `<button>`, `<select>`, `<input>` crus reprovam em `design.test.ts` (o `<input type="file" hidden>` do cartão 4 é o padrão já usado em `Pranchas.tsx`).
- Nenhuma cor literal em TS/TSX, nenhum CSS fora de `src/app/design`, toda classe usada existe em `global.css`. Estilo inline só para valores calculados.
- Rótulos únicos: cada controle da aba leva o número da janela no nome, por exemplo `Hipótese (janela 1)`. Nos testes e2e, `getByLabel`/`getByRole` com `{ exact: true }`, **exceto** `NumField`, `OptNumField`, `TextField`, `Select` e `Slider`: nesses, regex ancorada no início, por exemplo `getByLabel(/^Hipótese \(janela 1\)/)`.
- Não altere `src/core/`: o núcleo da V5 está pronto e testado.
- O bloco `diff` é o resultado esperado, gerado e validado (tsc, `design.test.ts` e o fluxo e2e `V5`). Salve o bloco num arquivo `.patch` e aplique com `git apply`; se uma âncora não casar, procure o trecho equivalente e não invente código além do diff.

## Diff esperado
```diff
diff --git a/src/app/edificio/EstiloPranchas.tsx b/src/app/edificio/EstiloPranchas.tsx
new file mode 100644
index 0000000..1fd8e93
--- /dev/null
+++ b/src/app/edificio/EstiloPranchas.tsx
@@ -0,0 +1,75 @@
+// Estilo de desenho, símbolos dos pilares e saídas das pranchas (V5, K1.4.57, K1.4.90, K1.11.54): tabela de camadas
+// (nome, cor ACI, pena), tamanho de texto por tipo, símbolos do pilar que passa, nasce ou morre, detalhes e modelo de
+// moldura importados de DXF. Os comandos são `prancha.definir`; a matemática vem de src/core/sheets.
+import { useRef, useState } from 'react';
+import { useBuilding } from './store';
+import { useStore } from '../store';
+import { Button, Group, Hint, NumField, Select, TextField } from '../ui';
+import { PRANCHA_PADRAO, SIMBOLOS_PADRAO } from '../../core/building/types';
+import { CAMADAS, type Camada } from '../../core/sheets/prancha';
+import { camadaEstilo, resolverEstilo, salvarEstilo, abrirEstilo, TIPOS_TEXTO, type TipoTexto } from '../../core/sheets/estilo';
+import { SIMBOLOS, simbolosEmUso } from '../../core/sheets/simbolos';
+import { download } from '../ui';
+
+const CAMADAS_OPC = (Object.keys(CAMADAS) as Camada[]).map((c) => ({ v: c, label: c }));
+const TEXTOS_OPC = (Object.keys(TIPOS_TEXTO) as TipoTexto[]).map((t) => ({ v: t, label: TIPOS_TEXTO[t].rotulo }));
+
+export function EstiloPranchas() {
+  const { sessao, exec } = useBuilding();
+  const msg = (m: string) => useStore.getState().set({ message: m });
+  const cfg = { ...PRANCHA_PADRAO, ...(sessao.modelo.prancha ?? {}) };
+  const simb = simbolosEmUso(cfg.simbolos), est = resolverEstilo(cfg.estilo);
+  const [camada, setCamada] = useState<Camada>('PILAR');
+  const [texto, setTexto] = useState<TipoTexto>('cotas');
+  const ce = camadaEstilo({ estilo: est }, camada);
+  const refEstilo = useRef<HTMLInputElement>(null), refDxf = useRef<HTMLInputElement>(null);
+  const [alvoDxf, setAlvoDxf] = useState<'detalhe' | 'moldura'>('detalhe');
+  const [pos, setPos] = useState({ x: 10, y: 10, escala: 1 });
+  const ok = (r: { ok: boolean; erros: { mensagem: string }[] }) => { if (!r.ok) msg(r.erros[0]?.mensagem ?? 'Não foi possível aplicar.'); };
+  const camadaPatch = (p: { nome?: string; cor?: number; pena?: number }) => ok(exec('prancha.definir', { estilo: { camadas: { [camada]: p } } }));
+  const dxf = async (f: File) => {
+    const t = await f.text();
+    ok(exec('prancha.definir', alvoDxf === 'moldura' ? { moldura: { dxf: t, nome: f.name, ...pos, modo: 'moldura' } } : { detalhe: { dxf: t, nome: f.name, ...pos } }));
+  };
+  return (
+    <Group title="Estilo de desenho, símbolos e saídas">
+      <div data-estilo-pranchas>
+        <div className="row wrap">
+          <Select label="Símbolo do pilar que passa" value={simb.passa} options={SIMBOLOS.map((s) => ({ v: s.v, label: s.rotulo }))} onChange={(v) => ok(exec('prancha.definir', { simbolos: { passa: v } }))} />
+          <Select label="Símbolo do pilar que nasce" value={simb.nasce} options={SIMBOLOS.map((s) => ({ v: s.v, label: s.rotulo }))} onChange={(v) => ok(exec('prancha.definir', { simbolos: { nasce: v } }))} />
+          <Select label="Símbolo do pilar que morre" value={simb.morre} options={SIMBOLOS.map((s) => ({ v: s.v, label: s.rotulo }))} onChange={(v) => ok(exec('prancha.definir', { simbolos: { morre: v } }))} />
+          <Button onClick={() => ok(exec('prancha.definir', { simbolos: { ...SIMBOLOS_PADRAO } }))}>Símbolos padrão</Button>
+        </div>
+        <div className="row wrap">
+          <Select label="Camada do estilo" value={camada} options={CAMADAS_OPC} onChange={setCamada} />
+          <TextField label="Nome da camada" value={ce.nome} onChange={(v) => camadaPatch({ nome: v.trim().toUpperCase() })} />
+          <NumField label="Cor ACI da camada" value={ce.cor} step="1" onChange={(v) => camadaPatch({ cor: Math.round(v) })} />
+          <NumField label="Pena da camada" unit="mm" value={ce.pena} onChange={(v) => camadaPatch({ pena: v })} />
+        </div>
+        <div className="row wrap">
+          <Select label="Tipo de texto" value={texto} options={TEXTOS_OPC} onChange={setTexto} />
+          <NumField label="Fator do tamanho do texto" value={est.textos[texto]} onChange={(v) => ok(exec('prancha.definir', { estilo: { textos: { [texto]: v } } }))} />
+          <Button onClick={() => ok(exec('prancha.definir', { estiloPadrao: true }))}>Voltar ao estilo padrão</Button>
+          <Button onClick={() => { void download('estilo-de-desenho.json', salvarEstilo('Estilo', cfg.estilo ?? {}), 'application/json'); }}>Salvar estilo em arquivo</Button>
+          <Button onClick={() => refEstilo.current?.click()}>Abrir estilo de arquivo</Button>
+          <input ref={refEstilo} type="file" accept=".json" hidden aria-label="Arquivo de estilo" onChange={async (e) => {
+            const f = e.target.files?.[0]; e.target.value = '';
+            if (!f) return;
+            const r = abrirEstilo(await f.text());
+            if ('erro' in r) msg(r.erro); else ok(exec('prancha.definir', { estiloPadrao: true, estilo: r.estilo }));
+          }} />
+        </div>
+        <div className="row wrap">
+          <Select label="DXF importado como" value={alvoDxf} options={[{ v: 'detalhe', label: 'Detalhe na folha' }, { v: 'moldura', label: 'Modelo de moldura' }]} onChange={setAlvoDxf} />
+          <NumField label="Posição X do DXF na folha" unit="mm" value={pos.x} onChange={(x) => setPos({ ...pos, x })} />
+          <NumField label="Posição Y do DXF na folha" unit="mm" value={pos.y} onChange={(y) => setPos({ ...pos, y })} />
+          <NumField label="Escala do DXF" value={pos.escala} onChange={(escala) => setPos({ ...pos, escala: escala > 0 ? escala : 1 })} />
+          <Button onClick={() => refDxf.current?.click()}>Importar DXF</Button>
+          <input ref={refDxf} type="file" accept=".dxf" hidden aria-label="Arquivo DXF" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) await dxf(f); }} />
+          <Button disabled={!cfg.moldura && !cfg.detalhes?.length} onClick={() => ok(exec('prancha.definir', { removerMoldura: true, removerDetalhes: (cfg.detalhes ?? []).map((d) => d.id) }))}>Remover DXF importados</Button>
+        </div>
+        <Hint>Estilo padrão: NBR 16861. {cfg.detalhes?.length ?? 0} detalhe(s) DXF{cfg.moldura ? ' e modelo de moldura' : ''} na obra. Penas e cores fora do padrão: a confirmar.</Hint>
+      </div>
+    </Group>
+  );
+}
diff --git a/src/app/edificio/Pranchas.tsx b/src/app/edificio/Pranchas.tsx
index b4ee365..3841970 100644
--- a/src/app/edificio/Pranchas.tsx
+++ b/src/app/edificio/Pranchas.tsx
@@ -7,6 +7,7 @@ import { Button, Check, download, Group, Hint, NumField, Select, TextField } fro
 import { PRECISA_CALCULO, TIPOS_PRANCHA, tiposDe, type TipoSaida } from '../../core/sheets/conjunto';
 import { siglaDe } from '../../core/sheets/prancha';
 import { RotulosLajes } from './EdicaoLajes';
+import { EstiloPranchas } from './EstiloPranchas';
 import { nf } from '../../core/sheets/armacao';
 import { zip } from '../../core/zip';
 import { ARQUIVO_LOGO, base64Bytes, LIMITE_LOGO } from '../../core/sheets/logo';
@@ -156,6 +157,7 @@ export function Pranchas() {
             </>
           )}
         </div>
+        <EstiloPranchas />
         {precisa && !dim && <Hint><span data-aviso-calculo="sem">As pranchas de armação e a tabela de cargas da locação exigem o cálculo. Calcule e dimensione o edifício na aba Dimensionamento.</span></Hint>}
         {precisa && dim && !atual && <p className="hint bad" data-aviso-calculo="desatualizado">O dimensionamento é de uma revisão anterior do modelo. Recalcule na aba Dimensionamento para gerar as pranchas de armação e a locação com cargas.</p>}
         {(tipo === 'fundacao' || tipo === 'todas') && atual && !fundAtual && !!b.fundacao?.elementos.length && (
```
