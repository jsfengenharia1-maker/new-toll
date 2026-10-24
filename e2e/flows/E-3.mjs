// Fluxos de interface — E (parte 3/3): planos inclinados, rampas e desníveis (E3f).
import assert from 'node:assert/strict';
import { faixaAba, fileMenu, grupoEdif } from './helpers.mjs';

export const f_E3f = {
  name: 'E3f: planos inclinados (novo plano, árvore, atribuir, propriedades, vigas incoerentes, tipo de pano e pano a definir, cobertura em duas águas, memorial, diafragma)',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
    const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
    const aba = (nome) => page.locator('.edif-tabs').getByRole('tab', { name: nome });
    const calcular = async () => { await aba('Dimensionamento').click(); await page.getByRole('button', { name: 'Calcular e dimensionar' }).click(); };
    // um pano 6 × 4,5 m, vigas de 20 × 50
    await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 4.5], [0, 4.5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
    await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 4.5], [6, 4.5]], [[0, 0], [0, 4.5]], [[6, 0], [6, 4.5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
    await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 1, null);
    // 1) novo plano: máxima declividade de (0; 0) a (0; 4,5), desnível 0, 30 %; a árvore do Navegador mostra o plano
    await faixaAba(page, 'Edição');
    await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'Novo plano' });
    const y2 = dlg.getByLabel(/^y2/); await y2.fill('4,5'); await y2.press('Enter');
    const inc = dlg.getByLabel(/^Inclinação do plano/); await inc.fill('30'); await inc.press('Enter');
    await dlg.getByRole('button', { name: 'Criar', exact: true }).click();
    await dlg.waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 1, null);
    let m = await modelo();
    assert.equal(m.planos.length, 1);
    assert.equal(m.planos[0].nome, 'Plano 1');
    await page.getByRole('treeitem', { name: /Plano 1 — 30,0 %/ }).waitFor();
    // 2) atribuir o plano ao pano selecionado: a planta o desenha com a cor, a seta e o texto de inclinação
    const lj = await grupoEdif(page, /^Lajes —/);
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await page.getByRole('button', { name: 'Atribuir plano', exact: true }).click();
    await esperar(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.plano, null);
    await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-planos-na-planta') === '1', null, { timeout: 20000 });
    // 3) propriedades do plano: leitura da inclinação e edição para 40 %; as vigas do contorno ficam incoerentes e a correção copia o plano do pano
    const gp = await grupoEdif(page, /^Planos —/);
    assert.match(await gp.locator('[data-leitura-plano]').innerText(), /30,0 %/);
    assert.match(await gp.innerText(), /atribuído/);
    const i40 = gp.getByLabel(/^Inclinação do plano/); await i40.fill('40'); await i40.press('Enter');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.[0]?.def?.inclinacao === 40, null);
    assert.match(await gp.locator('[data-leitura-plano]').innerText(), /40,0 %/);
    await gp.locator('[data-vigas-incoerentes]').waitFor();
    await gp.getByRole('button', { name: 'Selecionar as vigas incoerentes', exact: true }).click();
    await gp.getByRole('button', { name: 'Copiar inclinação do pano', exact: true }).click();
    await gp.locator('[data-vigas-incoerentes]').waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((v) => !!v.plano), null);
    m = await modelo();
    assert.ok(m.vigas.some((v) => v.plano === m.planos[0].id));
    // 4) retirar o plano do pano
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await page.getByRole('button', { name: 'Retirar plano', exact: true }).click();
    await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.plano, null);
    // 5) tipo de pano: pano a definir com 12 cm (o cálculo recusa) e de volta a maciça
    const tp = await grupoEdif(page, /^Tipo de pano/);
    await tp.getByLabel(/^Tipo de pano/).selectOption({ label: 'Pano a definir' });
    const esp = tp.getByLabel(/^Espessura do pano a definir/); await esp.fill('0,12'); await esp.press('Enter');
    await tp.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await esperar(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]; return l?.definir === true && l?.espessuraDefinir === 0.12; }, null);
    await calcular();
    await page.locator('.statusbar .msg', { hasText: 'DEFINIR_PANO' }).waitFor({ timeout: 60000 });
    await aba('Planta').click();
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await (await grupoEdif(page, /^Tipo de pano/)).getByLabel(/^Tipo de pano/).selectOption({ label: 'Maciça' });
    await esperar(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]; return !l?.definir && l?.tipo?.tipo === 'macica'; }, null);
    // 6) exemplo "cobertura em duas águas": cálculo sem erro, planos no memorial e a opção do diafragma
    await fileMenu(page, 'Obras recentes…');
    const rec = page.getByRole('dialog', { name: 'Obras recentes' });
    await rec.getByRole('button', { name: /Abrir exemplo Exemplo: cobertura em duas águas/ }).click();
    await rec.waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 2, null);
    assert.deepEqual((await modelo()).planos.map((p) => p.nome).sort(), ['Água norte', 'Água sul']);
    await calcular();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 240000 });
    await page.getByRole('button', { name: 'Memorial do edifício' }).click();
    const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
    const sec = memo.locator('[data-memorial-planos]');
    await sec.waitFor();
    assert.match(await sec.locator('[data-tabela-planos]').innerText(), /Água sul/);
    assert.match(await sec.locator('[data-tabela-planos]').innerText(), /30,00/);
    await memo.getByRole('button', { name: 'Fechar' }).click();
    // opção do diafragma: liga e desliga (recalcular o exemplo com a opção ligada não terminou em 9 min: pendência de núcleo, ver o índice da E3f)
    await grupoEdif(page, 'Opções de cálculo');
    const dia = page.getByLabel('Panos inclinados no diafragma do pavimento');
    await dia.check();
    assert.equal(await dia.isChecked(), true);
    await dia.uncheck();
    assert.equal(await dia.isChecked(), false);
  },
};
