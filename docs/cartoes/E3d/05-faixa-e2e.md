# E3d — cartão 5: botão na faixa e fluxo e2e `E3d`

Executor: Haiku. Regras em `0-leia-primeiro.md`. Depois do cartão 4. **Aplicar depois da D7** (toca `FaixaEdificio.tsx`).

## Onde aparece
Faixa de comandos do Edifício, aba **Lançamento**, novo grupo **Ábacos** com o botão **Gerar ábacos nos pilares**: gera nos pilares selecionados na planta ou, sem pilares selecionados, em todos os pilares sem viga das lajes nervuradas; liga a camada "Ábacos" da planta. O botão do grupo “Ábacos” do Propriedades tem rótulo diferente (“Gerar nos pilares”).

## Rótulos
`Gerar ábacos nos pilares` (faixa).

## Edições em `src/app/edificio/FaixaEdificio.tsx`

**Trocar em** `src/app/edificio/FaixaEdificio.tsx`
```text
function Lancamento() {
```
por
```text
/** Ábacos das lajes nervuradas (E3d): gera nos pilares selecionados (ou em todos os pilares sem viga, sem seleção de pilares). */
function Abacos() {
  const { sessao, exec } = useBuilding();
  const pl = usePlanta();
  const b = sessao.modelo;
  const pilares = b.pilares.filter((p) => pl.selecao.has(p.id)).map((p) => p.id);
  return (
    <RibbonGroup label="Ábacos">
      <RibbonButton icon="zona" label="Gerar ábacos nos pilares" title="Gera os ábacos automáticos nos pilares selecionados; sem pilares selecionados, em todos os pilares sem viga das lajes nervuradas" disabled={!b.lajes.some((l) => l.tipo.tipo === 'nervurada' && !l.definir)}
        onClick={() => { const r = exec('abaco.gerar', pilares.length ? { pilares } : {}); if (r.ok) pl.set({ camadaAbacos: true }); else useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Não foi possível gerar os ábacos.' }); }} />
    </RibbonGroup>
  );
}

function Lancamento() {
```

**Trocar em** `src/app/edificio/FaixaEdificio.tsx`
```text
      <RibbonGroup label="Cortes" radios="Ferramenta">
```
por
```text
      <Abacos />
      <RibbonGroup label="Cortes" radios="Ferramenta">
```

## Fluxo e2e `E3d`
Pano 12 × 6 m com um pilar central sem viga e quatro pilares de canto com viga, laje nervurada. Confere: prévia da geração (1 ábaco); "Gerar nos pilares" (1 ábaco automático com a altura da laje, polígono envolvendo o pilar central, tabela e camada ligada); altura do ábaco (45 cm); ábaco retangular manual; armadura base 3φ10 do ábaco manual; "Remover os ábacos automáticos" (o manual fica) e "Gerar ábacos nos pilares" da faixa; cálculo e janela da laje > Punção e cortante com o bloco do ábaco; sem ábaco, o aviso e a ação "Gerar ábaco neste pilar"; memorial com os ábacos.

**Trocar em** `e2e/flows/E-2.mjs`
```text
import { grupoEdif, tab, downloadText, telaDe } from './helpers.mjs';
```
por
```text
import { faixaAba, grupoEdif, tab, downloadText, telaDe } from './helpers.mjs';
```
(Se a linha de import já tiver outros nomes, apenas acrescente `faixaAba` à lista.)

**Acrescentar ao fim de** `e2e/flows/E-2.mjs`
```js

export const f_E3d = {
    name: 'E3d: ábacos das nervuradas (prévia, gerar nos pilares, ábaco manual, altura, armadura base, camada na planta, faixa, punção com e sem ábaco, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
      // pano 12 × 6 m com um pilar central sem viga e quatro pilares de canto com viga
      await cmd('lote {"comandos": [' + [[0, 0], [12, 0], [12, 6], [0, 6], [6, 3]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [12, 0]], [[0, 6], [12, 6]], [[0, 0], [0, 6]], [[12, 0], [12, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "nervurada", "forma": "cat:rec-60-30", "hTotal": 0.35, "capa": 0.05}}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 1, null);

      // ---- seleciona o pano e abre o grupo Ábacos (doca Propriedades)
      const lj = await grupoEdif(page, /^Lajes/);
      await lj.locator('table.loads-ed tbody tr').nth(0).click();
      const ab = await grupoEdif(page, /^Ábacos/);
      // 1) prévia: só o pilar central (os de canto têm viga encostada)
      assert.equal(await ab.locator('[data-previa-abacos]').getAttribute('data-previa-abacos'), '1');
      // 2) gerar nos pilares
      await ab.getByRole('button', { name: 'Gerar nos pilares', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 1, null);
      const a1 = (await modelo()).abacos[0];
      assert.equal(a1.automatico, true);
      assert.ok(Math.abs(a1.hAbaco - 0.35) < 1e-9, String(a1.hAbaco));
      const xs = a1.poligono.map((q) => q[0]), ys = a1.poligono.map((q) => q[1]);
      assert.ok(Math.min(...xs) < 6 && Math.max(...xs) > 6 && Math.min(...ys) < 3 && Math.max(...ys) > 3, JSON.stringify(a1.poligono));
      await ab.locator('[data-tabela-abacos="1"]').waitFor();
      assert.equal(await ab.getByLabel('Mostrar ábacos na planta', { exact: true }).isChecked(), true);
      // 3) altura do ábaco
      const alt = ab.getByLabel(/^Altura do ábaco/);
      await alt.fill('45'); await alt.press('Enter');
      await esperarModelo(() => Math.abs((JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.[0]?.hAbaco ?? 0) - 0.45) < 1e-9, null);
      // 4) ábaco retangular manual no meio do vão esquerdo
      const cx = ab.getByLabel(/^Centro X do ábaco/);
      await cx.fill('3'); await cx.press('Enter');
      await ab.getByRole('button', { name: 'Novo ábaco retangular', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 2, null);
      assert.equal((await modelo()).abacos[1].automatico, false);
      // 5) armadura base do ábaco manual: 3φ10 embaixo
      await ab.getByLabel(/^Ábaco da laje/).selectOption({ label: 'AB2' });
      const bi = ab.getByLabel(/^Base inferior do ábaco/);
      await bi.fill('3'); await bi.press('Enter');
      await ab.getByLabel(/^φ da base inferior do ábaco/).selectOption('10');
      await ab.getByRole('button', { name: 'Aplicar a armadura base do ábaco', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.[1]?.base?.inf?.n === 3, null);
      assert.deepEqual((await modelo()).abacos[1].base.inf, { n: 3, phi: 10 });
      assert.match(await ab.locator('[data-base-abaco]').innerText(), /inferior 3φ10/);
      // 6) remover os automáticos e gerar de novo pela faixa (o manual fica)
      await ab.getByRole('button', { name: 'Remover os ábacos automáticos', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 1, null);
      await faixaAba(page, 'Lançamento');
      await page.getByRole('toolbar', { name: /^Comandos: Lançamento/ }).getByRole('button', { name: 'Gerar ábacos nos pilares', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 2, null);
      assert.equal((await modelo()).abacos.filter((a) => a.automatico).length, 1);

      // ---- cálculo, punção com ábaco na janela da laje
      const calcular = async () => {
        await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      };
      await calcular();
      const card = page.locator('[data-card-puncao]');
      await card.waitFor();
      await card.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.getByRole('radio', { name: 'Punção e cortante' }).click();
      const blocoAb = jan.locator('[data-puncao-abaco]').first();
      await blocoAb.waitFor();
      assert.match(await blocoAb.innerText(), /h \/ d do ábaco/);
      await jan.getByRole('button', { name: 'Fechar' }).click();

      // ---- sem ábaco: aviso e ação "Gerar ábaco neste pilar"
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      const ab2 = await grupoEdif(page, /^Ábacos/);
      await ab2.getByRole('button', { name: 'Remover os ábacos automáticos', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 1, null);
      await calcular();
      await card.locator('tbody tr').first().dblclick();
      const jan2 = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan2.getByRole('radio', { name: 'Punção e cortante' }).click();
      await jan2.locator('[data-puncao-sem-abaco]').first().waitFor();
      await jan2.getByRole('button', { name: 'Gerar ábaco neste pilar', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 2, null);
      await jan2.getByRole('button', { name: 'Fechar' }).click();

      // ---- memorial
      await calcular();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      await memo.locator('[data-memorial-abacos]').waitFor();
      assert.ok((await memo.locator('[data-memorial-abaco]').count()) >= 2);
      assert.match(await memo.locator('[data-memorial-abacos]').innerText(), /armadura base entre nervuras|Armadura base entre nervuras/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };
```

**Trocar em** `e2e/flows/index.mjs`
```text
  m_E_2.f_E3c,
```
por
```text
  m_E_2.f_E3c,
  m_E_2.f_E3d,
```

## Verificação
`npx tsc -b`; `npm run e2e -- --workers 1 E3 2>&1 | tail -15`.
