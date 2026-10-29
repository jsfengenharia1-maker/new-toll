// Fluxos de interface — fluxo do Edifício por etapas (barra de etapas + abas da faixa na ordem da obra).
import assert from 'node:assert/strict';
import { botaoCalcular, comandoFaixa } from './helpers.mjs';

const ETAPAS = [
  ['obra', 'Obra', { button: 'Dados gerais…' }],
  ['pilares', 'Pilares', { radio: 'Pilar' }],
  ['vigasLajes', 'Vigas e lajes', { radio: 'Laje' }],
  ['cargas', 'Cargas', { button: 'Casos de carga' }],
  ['fundacao', 'Fundação', { button: 'Nível de fundação' }],
  ['calcular', 'Calcular', { button: 'Calcular' }],
  ['resultados', 'Resultados', { button: 'Ver Esforços' }],
  ['pranchas', 'Pranchas e memorial', { button: 'Abrir Pranchas' }],
];

const estado = (page, id) => page.locator(`[data-etapa="${id}"]`).getAttribute('data-estado');

export const f_etapas = {
  name: 'etapas: barra de etapas fixa (8 etapas numeradas, estado e próxima), clique abre a aba da etapa, cada aba traz seus comandos, Calcular único, estados reais e abas sem truncar a 1440 px',
  async run({ newPage }) {
    const page = await newPage(undefined, { viewport: { width: 1440, height: 900 } });
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const barra = page.getByRole('navigation', { name: 'Etapas da obra' });
    await barra.waitFor();
    const faixa = page.getByRole('tablist', { name: 'Faixa de comandos' });

    // 1) as 8 etapas, numeradas, na ordem da obra; a barra fica logo abaixo da faixa (acima das docas e do desenho)
    const rotulos = (await barra.locator('.step-l').allTextContents()).map((t) => t.trim());
    assert.deepEqual(rotulos, ETAPAS.map((e) => e[1]));
    assert.deepEqual(await barra.locator('.step').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').split('.')[0])), ['1', '2', '3', '4', '5', '6', '7', '8']);
    const yFaixa = (await page.locator('.ribbon-wrap').boundingBox()), yBarra = await barra.boundingBox(), yDoca = await page.getByRole('complementary', { name: 'painel lateral esquerdo' }).boundingBox();
    assert.ok(yBarra.y >= yFaixa.y + yFaixa.height - 1, 'a barra de etapas fica abaixo da faixa');
    assert.ok(yDoca.y >= yBarra.y + yBarra.height - 1, 'a barra de etapas fica acima das docas');
    // obra vazia de pilares: resultados e pranchas indisponíveis, cálculo pendente
    assert.equal(await estado(page, 'resultados'), 'indisponivel');
    assert.equal(await estado(page, 'pranchas'), 'indisponivel');
    assert.equal(await estado(page, 'calcular'), 'pendente');

    // 2) clicar numa etapa abre a aba de mesmo nome (aba ativa = etapa atual) e a faixa traz os comandos da etapa
    for (const [id, nome, cmd] of ETAPAS) {
      await page.locator(`[data-etapa="${id}"]`).click();
      assert.equal((await faixa.locator('.rtab.on').innerText()).trim(), nome, `aba da etapa ${nome}`);
      assert.equal(await page.locator(`[data-etapa="${id}"]`).getAttribute('aria-current'), 'step');
      const toolbar = page.getByRole('toolbar', { name: new RegExp(`^Comandos: ${nome}`) });
      await toolbar.getByRole('group').first().waitFor();
      const alvo = cmd.radio ? toolbar.getByRole('radio', { name: cmd.radio, exact: true }) : toolbar.getByRole('button', { name: cmd.button, exact: true });
      assert.equal(await alvo.count(), 1, `${cmd.radio ?? cmd.button} na aba ${nome}`);
    }
    // a etapa Resultados abre a vista Dimensionamento; Pranchas abre a vista Pranchas
    await page.locator('[data-etapa="resultados"]').click();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento', exact: true }).getAttribute('aria-selected'), 'true');
    await page.locator('[data-etapa="pranchas"]').click();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas', exact: true }).getAttribute('aria-selected'), 'true');
    await page.locator('[data-etapa="pilares"]').click();
    assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).getAttribute('aria-selected'), 'true');

    // 3) abas utilitárias depois das etapas; um comando de cada uma continua acessível
    const abas = (await faixa.getByRole('tab').allTextContents()).map((t) => t.trim());
    assert.deepEqual(abas.slice(0, 8), ETAPAS.map((e) => e[1]));
    assert.deepEqual(abas.slice(8, 10), ['Edição', 'Vista']);
    for (const [nome, opcoes] of [['Mover', { role: 'radio' }], ['Enquadrar', {}], ['Copiar de outro grupo…', {}], ['Memorial da obra', {}]]) {
      assert.equal(await (await comandoFaixa(page, nome, opcoes)).count(), 1, nome);
    }

    // 4) abas sem truncar a 1440 px: a tira de abas da faixa cabe inteira; nenhum texto de aba (faixa ou vistas) fica cortado
    const rtabs = faixa;
    assert.ok(await rtabs.evaluate((e) => e.scrollWidth <= e.clientWidth + 1), 'tira de abas da faixa precisa rolar a 1440 px');
    assert.ok(await faixa.locator('.rtab').evaluateAll((els) => els.every((e) => e.scrollWidth <= e.clientWidth + 1)), 'texto de aba da faixa cortado');
    assert.ok(await page.locator('.edif-tabs button').evaluateAll((els) => els.every((e) => e.scrollWidth <= e.clientWidth + 1)), 'texto de aba de vista cortado');
    const vt = page.locator('.edif-tabs');
    assert.ok(await vt.evaluate((e) => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).overflowX === 'auto'), 'abas de vista nem cabem nem rolam');
    assert.ok(await barra.locator('.steps').evaluate((e) => e.scrollWidth <= e.clientWidth + 1), 'a barra de etapas precisa rolar a 1440 px');

    // 5) estados reais: lançamento feito etapa a etapa; cargas só contam com carga lançada ou sobrecarga editada
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
    await page.locator('[data-etapa="pilares"][data-estado="feito"]').waitFor();
    assert.equal(await estado(page, 'vigasLajes'), 'pendente');
    await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
    await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
    await page.locator('[data-etapa="vigasLajes"][data-estado="feito"]').waitFor();
    assert.equal(await estado(page, 'cargas'), 'pendente', 'só a sobrecarga padrão das categorias não conta como cargas');
    assert.equal(await page.locator('[data-proxima]').getAttribute('data-proxima'), 'cargas');
    await cmd('carga.area {"grupo": "g_3", "caso": "G", "contorno": [[1, 1], [4, 1], [4, 3], [1, 3]], "valor": 2}');
    await page.locator('[data-etapa="cargas"][data-estado="feito"]').waitFor();
    assert.equal(await estado(page, 'fundacao'), 'pendente');
    assert.equal(await page.locator('[data-etapa="fundacao"]').evaluate((e) => e.classList.contains('proxima')), false, 'a fundação é opcional: não é a próxima etapa');
    assert.equal(await page.locator('[data-proxima]').getAttribute('data-proxima'), 'calcular');

    // 6) UM botão Calcular na faixa: calcula e leva os estados adiante (resultados e pranchas deixam de ser indisponíveis)
    await page.locator('[data-etapa="calcular"]').click();
    const toolbar = page.getByRole('toolbar', { name: /^Comandos: Calcular/ });
    assert.equal(await toolbar.getByRole('button', { name: /calcular/i }).count() > 1, true, 'os parciais (escadas, só fundações) ficam como secundários');
    assert.equal(await toolbar.getByRole('button', { name: 'Calcular', exact: true }).count(), 1);
    await toolbar.getByRole('button', { name: 'Calcular', exact: true }).click();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
    await page.locator('[data-etapa="calcular"][data-estado="feito"]').waitFor();
    assert.ok(['feito', 'erro'].includes(await estado(page, 'resultados')), 'resultados disponíveis depois do cálculo');
    assert.equal(await estado(page, 'pranchas'), 'pendente');
    assert.ok(['resultados', 'pranchas'].includes(await page.locator('[data-proxima]').getAttribute('data-proxima')));
    // a vista Dimensionamento oferece a mesma ação, agora como Recalcular
    await page.locator('[data-etapa="resultados"]').click();
    await botaoCalcular(page).waitFor();
    assert.equal((await botaoCalcular(page).innerText()).trim(), 'Recalcular');
    // mexer no modelo invalida o cálculo: a etapa volta a pendente
    await cmd('pilar.inserir {"x": 9, "y": 9, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}');
    await page.locator('[data-etapa="calcular"][data-estado="pendente"]').waitFor();
    assert.equal(await estado(page, 'resultados'), 'indisponivel');
  },
};
