# Cartão E2a-3 — memorial e fluxo e2e `E2a`

Executor: Haiku. Depende do núcleo da E2a e dos cartões `1-editor-secao.md` e `2-planta-detalhe.md` (o fluxo e2e usa o editor e o desenho da seção do detalhe).

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2a está pronto e testado em `src/core/building/secaoVigas.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); nenhum botão novo na barra da planta.
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo e mantenha o `aria-label` igual ao rótulo. No e2e, `getByLabel(..., { exact: true })` para `Check` e botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Tipo da seção/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `Viga.mesa?: { tipo: 'T' | 'L'; bf?; hf?; a? }` (m), `Viga.chata`, `Viga.estrutural?: false` e `Viga.amarracao`. Comandos `viga.editar { id, mesa: { tipo: 'ret' | 'T' | 'L', bf?, hf?, a? }, chata, estrutural, amarracao }` (`mesa.tipo = 'ret'` remove a mesa; `chata: true` iguala a altura à da laje que a viga contorna, erro `VIGA_CHATA_SEM_LAJE` se nenhuma laje a toca) e o `lote` para vários.
- `src/core/building/secaoViga.ts`: `mesaDaViga(b, v)` (mesa colaborante automática da NBR 6118 14.6.2.2 ou informada; `null` se retangular ou sem laje; traz `bf`, `hf`, `b1`, `a`, `automatica`, `texto`), `alturaVigaChata(b, v)` (m ou `null`), `contornoSecaoViga(bw, h, mesa, invertida)` (polígono da prévia), `resumoSecoesVigas(b)` (quadro do memorial).
- `DetalheViga.cantosMesa?: { n, phi, s0, s1, comprimento, bf, hf }` (barras de canto da mesa, opção `mesaBarrasCanto`) e as opções `mesaRigidez`, `mesaDimensionamento` (aparecem sozinhas no grupo Opções de cálculo).

## 1. Editar `src/app/edificio/MemorialEdificio.tsx`
1.1. Depois da linha `import { linhasGruposVigotas } from './Vigotas';` acrescente
```tsx
import { resumoSecoesVigas } from '../../core/building/secaoViga';
```
1.2. Depois da linha `  const vinculos = useMemo(() => vinculosAlterados(b), [b]);` acrescente
```tsx
  const secoesEsp = useMemo(() => resumoSecoesVigas(b), [b]);
```
1.3. Depois da linha `          {vinculos.length > 0 && <><h3>Vínculos e engastes alterados por elemento</h3><ul>…</ul></>}` (uma só linha; localize por `Vínculos e engastes alterados por elemento`) acrescente, logo abaixo, exatamente:
```tsx
          {secoesEsp.length > 0 && (
            <div data-memorial-secoes-viga>
              <h3>Seções especiais das vigas</h3>
              <table>
                <thead><tr><th>Viga</th><th>Alma (cm)</th><th>Seção</th><th>bf (cm)</th><th>hf (cm)</th><th>a (m)</th><th>Situação</th></tr></thead>
                <tbody>
                  {secoesEsp.map((x) => (
                    <tr key={x.viga}>
                      <td className="l">{x.nome}</td><td>{fmt(x.b, 0)} × {fmt(x.h, 0)}</td><td>{x.tipo === 'ret' ? 'retangular' : x.tipo}</td>
                      <td>{x.bf === undefined ? '—' : fmt(x.bf * 100, 1)}</td><td>{x.hf === undefined ? '—' : fmt(x.hf * 100, 1)}</td><td>{x.a === undefined ? '—' : fmt(x.a, 2)}</td>
                      <td className="l">{[x.tipo !== 'ret' && (x.automatica ? 'mesa colaborante (NBR 6118, 14.6.2.2)' : 'mesa informada'), x.chata && 'chata', !x.estrutural && 'não estrutural (fora do cálculo)', x.amarracao && 'amarração (sem flexão vertical)'].filter(Boolean).join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Largura colaborante: bf = bw + b1 + b3, com b1 ≤ 0,1·a e b1 ≤ 0,5·b2 (a: distância entre pontos de momento nulo pelo número de vãos; b2: distância livre à viga vizinha). A mesa entra na rigidez da análise; a flexão é dimensionada {opc.mesaDimensionamento ? 'na seção T onde a mesa está comprimida' : 'só com a alma'} (a confirmar).</p>
            </div>
          )}
```

## 2. Editar `e2e/flows.mjs`
Acrescente o fluxo abaixo como **último elemento** do array `flows` (depois do `},` que fecha o fluxo anterior e antes do `];` final do arquivo):
```js
  {
    name: 'E2a: seção das vigas (T com mesa colaborante, chata, não estrutural e de amarração), detalhe com barras de canto da mesa e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 2, null);
      // seleciona a viga da linha `i` da tabela (V1 = 0 … V4 = 3) e devolve o editor de seção
      const gvigas = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vigas — / }) });
      await gvigas.locator(':scope > summary').click();
      await page.locator('summary', { hasText: 'Vínculos, flambagem e cobrimento' }).click();
      const editor = async (i) => {
        await gvigas.locator('table.quadro tbody tr').nth(i).locator('td').nth(3).click();
        const sv = page.locator('[data-secao-viga]');
        await sv.waitFor();
        return sv;
      };
      // 1. V4 (x = 5, laje dos dois lados, 1 vão de 4 m): T automática, a = 4 m, b1 = 0,1·a = 40 cm, bf = 20 + 80 = 100 cm
      let sv = await editor(3);
      assert.equal(await sv.locator('svg[data-secao-previa]').getAttribute('data-secao-previa'), 'ret');
      await sv.getByLabel(/^Tipo da seção/).selectOption('T');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.some((v) => v.mesa?.tipo === 'T'), null);
      assert.match(await sv.innerText(), /Seção T: bf = 100 cm \(NBR 6118 14\.6\.2\.2: a = 4 m, abas 40 e 40 cm\), hf = 12 cm/);
      assert.equal(await sv.locator('svg[data-secao-previa]').getAttribute('data-secao-previa'), 'T');
      // bf informada (90 cm) prevalece; vazio volta à colaborante
      await sv.getByLabel(/^Largura da mesa bf/).fill('90');
      await sv.getByLabel(/^Largura da mesa bf/).press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.some((v) => v.mesa?.bf === 0.9), null);
      assert.match(await sv.innerText(), /bf = 90 cm informada/);
      await sv.getByLabel(/^Largura da mesa bf/).fill('');
      await sv.getByLabel(/^Largura da mesa bf/).press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.some((v) => v.mesa && v.mesa.bf === undefined), null);
      // 2. V1 vira viga chata (altura 12 cm da laje) e desfazer devolve os 50 cm
      sv = await editor(0);
      await sv.getByLabel('Viga chata (altura da laje que contorna)', { exact: true }).check();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V1')?.secao.h === 0.12, null);
      await page.getByRole('button', { name: /Desfazer/ }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V1')?.secao.h === 0.5, null);
      // 3. V2 não estrutural e V3 de amarração
      sv = await editor(1);
      await sv.getByLabel('Viga não estrutural (só fecha o contorno do pano)', { exact: true }).check();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V2')?.estrutural === false, null);
      sv = await editor(2);
      await sv.getByLabel('Viga de amarração (sem flexão vertical)', { exact: true }).check();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V3')?.amarracao === true, null);
      // 4. flexão na seção T (opção) e cálculo
      await cmd('opcoes.definir {"valores": {"mesaDimensionamento": 1}}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.opcoes?.mesaDimensionamento === 1, null);
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 180000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      await livre();
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      await cardVigas.waitFor({ timeout: 30000 });
      assert.equal(await cardVigas.locator('tbody tr').count(), 4, 'V2 não estrutural fica fora do dimensionamento');
      assert.equal(await cardVigas.locator('tbody tr', { hasText: 'V2' }).count(), 0);
      // 5. janela de V4: detalhamento com a seção T e as barras de canto da mesa
      await cardVigas.locator('tbody tr', { hasText: 'V4' }).first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const secao = jan.locator('svg[data-secao]');
      await secao.waitFor();
      assert.equal(await secao.locator('[data-mesa-aba]').count(), 2);
      assert.equal(await secao.locator('[data-canto-mesa]').count(), 2);
      assert.match(await secao.textContent(), /bf 100 × hf 12/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // 6. memorial: quadro das seções especiais
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const q = memo.locator('[data-memorial-secoes-viga]');
      await q.waitFor();
      const txt = await q.innerText();
      assert.match(txt, /V4[\s\S]*T[\s\S]*mesa colaborante \(NBR 6118, 14\.6\.2\.2\)/);
      assert.match(txt, /V2[\s\S]*não estrutural/);
      assert.match(txt, /V3[\s\S]*amarração/);
      assert.match(txt, /dimensionada na seção T onde a mesa está comprimida/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  },
```
Rode `npm run e2e -- E2a` (o `npm run e2e` constrói antes). Se um seletor falhar, relate a mensagem e a captura; não mude o fluxo.

## Verificação
`npx tsc -b`, `npx vitest run src/app/design` e `npm run e2e -- E2a` verdes. Relate só o resultado.
