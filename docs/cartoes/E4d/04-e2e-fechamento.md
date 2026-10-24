# E4d — cartão 4: fluxo e2e E4d e fechamento

Classe: Haiku. Depende dos cartões 1 e 3.

## Arquivos (2)
- Alterar `e2e/flows/E-2.mjs`
- Alterar `e2e/flows/index.mjs`

## Comportamento
- Fluxo `E4d` no arquivo da frente (`e2e/flows/E-2.mjs`) e uma linha em `e2e/flows/index.mjs`: janela da armadura (As necessária contra o cálculo à mão ±2 %, φ12,5 c/13, ligações), bloqueio φ16 c/15 e desbloqueio, opção das esperas, memorial e resumo geral.

## Regras de todos os cartões
Componentes de `src/app/ui` (nunca `<button>`, `<input>` ou `<select>` crus). Sem cor literal, sem CSS fora de `src/app/design`, toda classe usada já existe no CSS (as novas `escada-arm`, `a-*` entram no cartão 1). Núcleo e opções já existem (`src/core/building/escadasArmadura.ts`, `escadasArmaduraResumo.ts`, `escadasArmaduraDesenho.ts`); estes cartões só desenham. Pontos de inserção descritos por trecho/âncora (texto a procurar), não por número de linha. Cada cartão compila sozinho, na ordem. Não altere valores esperados de teste. Falhou duas vezes: pare e relate.

## Alterações

### Alterar `e2e/flows/E-2.mjs`

**Acrescentar em `e2e/flows/E-2.mjs` (1/1)** logo antes da linha que contém a âncora `export const f_E3e = {`:
```js
export const f_E4d = {
    name: 'E4d: armadura da escada (janela com seleção do lance, posições contra o cálculo à mão, ligações, bloqueio e opções, resumo geral de aço e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      const nm = (s) => parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
      // pórtico 8 × 5 m com vigas nos eixos y = 0 e y = 5; escada reta de 18 degraus entre elas (origem x = 4, subindo em +y, 17 pisos de 5/17 m), laje de 15 cm
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('tipoLance.criar {"id": "T", "tipo": {"nome": "Reto de 18", "tipologia": "reto", "trechos": [18], "espessura": 0.15}}');
      await cmd('escada.criar {"id": "e1", "grupo": "g_3", "origem": [4, 0], "angulo": 90, "piso": 0.2941176, "espelho": 0.1666667, "lances": [{"tipo": "T"}]}');
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? []).length === 1, null);
      // valores esperados à mão (q·ℓ²/8 por metro e flexão do bloco retangular, fck 30, CA-50, cobrimento 2,5 cm)
      const piso = 0.2941176, esp = 0.1666667, ell = 17 * piso, cosA = piso / Math.hypot(piso, esp), h = 0.15, d = h - 0.025 - 0.005;
      const pg = (25 * h) / cosA + (25 * esp) / 2 + 1, Md = (1.4 * (pg + 2.5) * ell * ell) / 8, sig = ((0.85 * 30) / 1.4) * 1000, fyd = (500 / 1.15) * 1000;
      const lx = d * (1 - Math.sqrt(1 - (2 * Md) / (sig * d * d))), AsMao = (Md / (fyd * (d - lx / 2))) * 1e4;
      // 1) janela da armadura (aba Análise da faixa)
      await faixaAba(page, 'Análise');
      await page.getByRole('button', { name: 'Armadura das escadas…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Armadura da escada', exact: true });
      await jan.waitFor();
      const pos = jan.locator('[data-escada-arm-posicoes]');
      await pos.waitFor({ timeout: 60000 });
      const n1 = pos.locator('[data-escada-posicao="L1-N1"]');
      const tn1 = await n1.innerText();
      assert.match(tn1, /principal/);
      assert.match(tn1, /inferior/);
      assert.match(tn1, /φ12,5 c\/13/);
      const asNec = nm(await n1.locator('td').nth(7).innerText());
      assert.ok(Math.abs(asNec / AsMao - 1) < 0.02, `As nec. ${asNec} ≈ ${AsMao.toFixed(2)} cm²/m (à mão)`);
      assert.equal(await jan.locator('[data-escada-arm-elevacao]').count(), 1);
      assert.equal(await jan.locator('[data-escada-arm-planta]').count(), 1);
      const lig = await jan.locator('[data-escada-arm-ligacoes]').innerText();
      assert.match(lig, /esperas/);
      assert.match(lig, /passadores/);
      assert.match(await jan.locator('[data-escada-arm-verificacoes]').innerText(), /L1/);
      // 2) editar e bloquear a principal inferior: φ16 c/15; a linha passa a "bloqueada" e o modelo guarda o bloqueio
      await n1.getByLabel(/^φ/).selectOption({ label: '16' });
      const s = n1.getByLabel(/^s/); await s.fill('15'); await s.press('Enter');
      await n1.getByRole('button', { name: 'Bloquear', exact: true }).click();
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas?.[0]?.armadura?.bloqueadas ?? []).length === 1, null);
      assert.match(await pos.locator('[data-escada-posicao="L1-N1"]').innerText(), /bloqueada/);
      assert.match(await pos.locator('[data-escada-posicao="L1-N1"]').innerText(), /φ16 c\/15/);
      await jan.getByRole('button', { name: /^Desbloquear tudo/ }).click();
      await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas?.[0]?.armadura, null);
      assert.match(await pos.locator('[data-escada-posicao="L1-N1"]').innerText(), /φ12,5 c\/13/);
      // 3) opção das ligações: sem esperas a linha de esperas some
      await jan.getByText('Opções da armadura', { exact: true }).click();
      await jan.getByLabel('Arranques (esperas) no início', { exact: true }).uncheck();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.opcoes?.escadaEsperas === 0, null);
      assert.doesNotMatch(await jan.locator('[data-escada-arm-ligacoes]').innerText(), /esperas \(arranques\)/);
      await jan.getByLabel('Arranques (esperas) no início', { exact: true }).check();
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 4) dimensionar: o aço das escadas soma ao resumo geral e o memorial traz o capítulo da armadura
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const ma = memo.locator('[data-memorial-escadas-armadura]');
      await ma.waitFor();
      assert.match(await ma.innerText(), /Quinas entre trechos e patamares/);
      assert.match(await ma.innerText(), /Lance 1, L1: N1/);
      assert.match(await ma.innerText(), /\[a confirmar\]/);
      assert.match(await memo.innerText(), /Escadas \(lances e patamares\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
};
```

### Alterar `e2e/flows/index.mjs`

**Acrescentar em `e2e/flows/index.mjs` (1/1)** logo depois da linha que contém a âncora `m_E_2.f_E4c_menu,`:
```js
  m_E_2.f_E4d,
```

## Teste
`npx tsc -b`; `npx vitest run src/app/design/design.test.ts --reporter=dot`; `npm run e2e -- E4` (constrói e roda E4a a E4d: todos ok).
