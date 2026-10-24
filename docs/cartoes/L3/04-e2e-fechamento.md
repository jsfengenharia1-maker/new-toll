# L3 — cartão 4: fluxo e2e `L3` e fechamento

Classe: Haiku. Depende dos cartões 1 a 3. O fluxo usa o arquivo `src/core/ifc/fixtures/edificio.ifc` (fictício, 19 KB) e carrega o web-ifc de `public/vendor` (o `npm run build` copia o vendor para o `dist/`). Se o WASM não carregar no ambiente, o fluxo só verifica a mensagem de indisponível.

## Arquivos (2)
1. `e2e/flows/L.mjs`: inserir o fluxo abaixo imediatamente antes de `export const f_L4 = {`.
2. `e2e/flows/index.mjs`: na lista `flows`, depois de `  m_N.f_N3,`, a linha `  m_L.f_L3,`.

## Fluxo `L3` (filtro `L3`)
```js
export const f_L3 = {
    name: 'L3: importação de IFC (leitor web-ifc sob demanda, pavimentos e grupos, materiais, revisão, aplicação e memorial)',
    async run({ newPage }) {
      const page = await newPage(NO_PICKERS);
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      const arq = new URL('../../src/core/ifc/fixtures/edificio.ifc', import.meta.url).pathname;
      // 1) Nova obra › Importação de IFC
      await fileMenu(page, 'Nova obra…');
      const nova = page.getByRole('dialog', { name: 'Nova obra' });
      await nova.getByRole('button', { name: 'Importação de IFC', exact: true }).click();
      await nova.getByRole('button', { name: 'Importar arquivo IFC…', exact: true }).click();
      const wiz = page.getByRole('dialog', { name: 'Importação de IFC' });
      await wiz.waitFor();
      // 2) passo Arquivo: o leitor vem de vendor/ sob demanda; se o WASM não carregar neste ambiente, vale a mensagem de indisponível
      await wiz.locator('input[type=file]').setInputFiles(arq);
      const resumo = wiz.locator('[data-ifc-resumo]');
      const indisp = wiz.getByText(/IFC indisponível neste ambiente/);
      await Promise.race([resumo.waitFor({ timeout: 60000 }), indisp.waitFor({ timeout: 60000 })]);
      if (await indisp.count()) { console.log('    (L3: WASM do web-ifc indisponível neste ambiente; verificada só a mensagem)'); return; }
      const txt = await resumo.innerText();
      assert.match(txt, /edificio\.ifc/);
      assert.match(txt, /IFC4/);
      assert.match(txt, /IFCCOLUMN\s+9/);
      assert.match(txt, /IFCBEAM\s+8/);
      assert.match(txt, /IFCSLAB\s+2/);
      assert.match(txt, /IFCFOOTING\s+1/);
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // 3) passo Edifício e pavimentos: dois pavimentos de planta idêntica sugeridos como um grupo
      assert.equal(await wiz.getByLabel('Nome da obra', { exact: true }).inputValue(), 'Edificio Ficticio');
      const tab = wiz.locator('[data-ifc-pavimentos]');
      assert.equal(await tab.locator('tbody tr').count(), 2);
      assert.equal(await wiz.getByLabel('Grupo de Pavimento 1', { exact: true }).inputValue(), 'Tipo');
      assert.equal(await wiz.getByLabel('Grupo de Pavimento 2', { exact: true }).inputValue(), 'Tipo');
      assert.equal(await wiz.getByLabel('Cota de Pavimento 2', { exact: true }).inputValue(), '3');
      assert.match(await tab.locator('tbody tr').nth(1).innerText(), /3,00/);
      const nome = wiz.getByLabel('Nome da obra', { exact: true });
      await nome.fill('Obra IFC teste');
      await nome.press('Tab');
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // 4) passo Materiais: concreto e aço do arquivo ligados aos tipos de elemento
      const mats = await wiz.locator('[data-ifc-materiais-arquivo]').innerText();
      assert.match(mats, /Concreto C30\s+fck 30 MPa/);
      assert.match(mats, /CA-50\s+CA-50/);
      assert.equal(await wiz.getByLabel('fck de pilares', { exact: true }).inputValue(), '30');
      assert.equal(await wiz.getByLabel('fck de lajes', { exact: true }).inputValue(), '25');
      assert.equal(await wiz.getByLabel(/^Material de lajes/).inputValue(), 'Concreto C25');
      assert.equal(await wiz.getByLabel(/^Aço de pilares/).inputValue(), 'CA-50');
      await wiz.getByRole('button', { name: 'Avançar', exact: true }).click();
      // 5) revisão: contagens da proposta, ignorados e aplicação
      const rev = await wiz.locator('[data-ifc-revisao]').innerText();
      assert.match(rev, /Pavimentos\s+2/);
      assert.match(rev, /Grupos\s+1/);
      assert.match(rev, /Pilares\s+5/);
      assert.match(rev, /Vigas\s+4/);
      assert.match(rev, /Lajes \(IfcSlab\)\s+1/);
      assert.match(rev, /Paredes de concreto\s+1/);
      assert.match(await wiz.innerText(), /Ignorado: 1 × IFCPILE/);
      await wiz.getByRole('button', { name: 'Importar', exact: true }).click();
      const gerais = page.getByRole('dialog', { name: 'Dados gerais da obra' });
      await gerais.waitFor();
      assert.equal(await gerais.getByLabel('Nome da obra').inputValue(), 'Obra IFC teste');
      await gerais.getByRole('button', { name: 'Concluir' }).click();
      // 6) modelo gerado: pavimentos, grupo, pilares (um com circular, um girado), vigas, laje com abertura, parede, origem
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares ?? []).length === 5, null);
      const m = await page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building')).building);
      assert.equal(m.obra.origem, 'ifc');
      assert.equal(m.pavimentos.length, 2);
      assert.equal(m.grupos.length, 1);
      assert.equal(m.vigas.length, 4);
      assert.equal(m.lajes.length, 1);
      assert.equal(m.lajes[0].furos.length, 1);
      assert.equal(m.paredes.length, 1);
      assert.ok(m.pilares.some((p) => p.secao.tipo === 'circ' && Math.abs(p.secao.d - 0.3) < 1e-9));
      assert.ok(m.pilares.some((p) => p.angulo === 90));
      assert.ok(m.pilares.every((p) => p.origemLancamento.startsWith('ifc:') && p.nasce === 'fundacao'));
      assert.deepEqual(m.norma.fckElem, { laje: 25 });
      // 7) memorial: origem IFC, materiais e relatório
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mi = await memo.locator('[data-memorial-ifc]').innerText();
      assert.match(mi, /Arquivo\s+edificio\.ifc/);
      assert.match(mi, /Esquema\s+IFC4/);
      assert.match(mi, /Lajes\s+Concreto C25\s+25 MPa/);
      assert.match(mi, /Pilares lançados\s+5/);
      assert.match(mi, /Ignorado: 1 × IFCFOOTING/);
      assert.match(await memo.textContent(), /Origem do lançamento.*Importação de IFC/s);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 8) desfazer volta ao estado anterior à importação em um passo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.keyboard.press('Control+z');
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building')).building.pilares ?? []).length === 0, null);
    },
  };
```

## Verificação e fechamento
`npm run build` e `npm run e2e -- --no-build L3` (1 ok); conferir que `dist/index.html` não contém `IfcAPI` do web-ifc além do carregador (o leitor fica em `dist/vendor/web-ifc-0.0.78.mjs`). Os checklists e o histórico já foram atualizados pelo núcleo (C1.22 e C1.23 Feito; C1.15 Feito com a L2).
