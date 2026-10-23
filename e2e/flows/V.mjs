// Fluxos de interface — V (parte 1/1).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { grupoEdif, tab, telaDe } from './helpers.mjs';

export const f_V1 = {
    webgl: true,
    name: 'V1: vista 3D — abre a aba, canvas, filtro por pavimento muda data-cena, projeção, caminhar, transparência, seleção sincronizada com a planta e o vendor do three fora do HTML',
    async run({ newPage, baseURL }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await cv.waitFor();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const cena = async () => JSON.parse(await cv.getAttribute('data-cena'));
      const status = await cv.getAttribute('data-status');
      const inicial = await cena();
      console.log(`        (vista 3D em modo ${status}; cena ${JSON.stringify(inicial)})`);
      assert.ok(inicial.total > 0 && inicial.pilar > 0 && inicial.viga > 0 && inicial.laje > 0, JSON.stringify(inicial));
      // o three.js não entra no HTML único: vem de /vendor, sob demanda
      const html = await (await page.request.get(baseURL)).text();
      assert.ok(!html.includes('THREE.WebGLRenderer'), 'o HTML único não pode conter o three.js');
      assert.equal((await page.request.get(baseURL + 'vendor/three-0.186.1.mjs')).status(), 200);

      if (status === 'pronto') {
        assert.equal(await cv.locator('canvas').count(), 1);
        await page.waitForFunction(() => Number(document.querySelector('.v3d-cv')?.getAttribute('data-frame-ms')) >= 0);
        // girar arrastando muda o azimute exibido
        const az = async () => page.locator('.v3d-barra .slider', { hasText: 'Azimute' }).locator('input').inputValue();
        const az0 = await az();
        const box = await cv.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 20, { steps: 6 });
        await page.mouse.up();
        await page.waitForFunction((a) => [...document.querySelectorAll('.slider')].find((l) => l.textContent.startsWith('Azimute')).querySelector('input').value !== a, az0);
        // perspectiva <-> isométrica
        assert.equal(await cv.getAttribute('data-projecao'), 'perspectiva');
        await page.getByRole('radio', { name: 'Isométrica' }).click();
        assert.equal(await cv.getAttribute('data-projecao'), 'isometrica');
        await page.getByRole('radio', { name: 'Perspectiva' }).click();
        assert.equal(await cv.getAttribute('data-projecao'), 'perspectiva');
        // transparência das lajes
        await page.locator('.v3d-barra .slider', { hasText: 'Lajes' }).locator('input').fill('80');
        assert.match(await page.locator('.slider', { hasText: 'Lajes' }).locator('output').innerText(), /80/);
        // caminhar: liga o modo, anda com W e volta
        await page.getByRole('button', { name: 'Caminhar' }).click();
        assert.equal(await cv.getAttribute('data-caminhar'), '1');
        await cv.focus();
        await page.keyboard.down('w');
        await page.waitForTimeout(250);
        await page.keyboard.up('w');
        await page.getByRole('button', { name: 'Caminhar' }).click();
        assert.equal(await cv.getAttribute('data-caminhar'), '0');
      } else {
        // sem WebGL: o isométrico em SVG da mesma cena
        assert.equal(await cv.getAttribute('data-projecao'), 'svg');
        assert.ok(await cv.locator('svg.v3d-iso path').count() > 0);
      }

      // filtro por pavimento: a contagem exposta muda e fica só naquele pavimento
      await page.locator('.v3d-barra').getByLabel('Escopo da vista 3D').selectOption('pavimento');
      const sel = page.locator('.v3d-barra').getByLabel('Pavimento');
      const opcoes = await sel.locator('option').allInnerTexts();
      assert.ok(opcoes.includes('Tipo 2'), opcoes.join(','));
      await sel.selectOption({ label: 'Tipo 2' });
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total < t, inicial.total);
      const um = await cena();
      assert.equal(Object.keys(um.pavimentos).length, 1);
      assert.ok(um.laje >= 1 && um.viga >= 4, JSON.stringify(um));
      // tipo oculto sai da contagem
      await page.getByRole('button', { name: 'Pilares', exact: true }).click();
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).pilar === undefined);
      await page.getByRole('button', { name: 'Pilares', exact: true }).click();
      // edifício completo de volta
      await page.locator('.v3d-barra').getByLabel('Escopo da vista 3D').selectOption('edificio');
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total === t, inicial.total);

      // seleção sincronizada com a planta: o que a planta seleciona aparece na barra de estado da vista
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('s');
      const v = JSON.parse(await page.locator('.planta-cv').getAttribute('data-vista'));
      const caixa = await page.locator('canvas.int').boundingBox();
      await page.mouse.click(caixa.x + v.ox, caixa.y + v.oy);
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      await page.locator('.v3d-sel-info').waitFor();
      assert.match(await page.locator('.v3d-sel-info').innerText(), /Selecionado:\s+P\d/);

      // memorial do edifício: a vista isométrica (mesma geometria) é opcional e sai como figura SVG
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.equal(await memo.locator('figure[data-isometrico]').count(), 0);
      await memo.getByLabel('Incluir vista isométrica').check();
      assert.ok(await memo.locator('figure[data-isometrico] svg path[fill]').count() > 20);
    },
  };

export const f_V1_2 = {
    name: 'V1: sem o three.js (artifact do claude.ai) a vista 3D cai para o isométrico em SVG, com barras de rotação e seleção',
    async run({ newPage }) {
      // sem service worker para a rota abortar o vendor de verdade (o worker responderia por ele)
      const page = await newPage(undefined, { serviceWorkers: 'block' });
      await page.context().route('**/vendor/three-*', (r) => r.abort());
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') === 'sem-vendor');
      assert.equal(await cv.getAttribute('data-projecao'), 'svg');
      assert.match(await page.locator('.v3d-aviso').first().innerText(), /three\.js não está disponível/);
      assert.ok(await cv.locator('svg.v3d-iso path').count() > 20);
      assert.equal(await cv.locator('canvas').count(), 0);
      // as barras de azimute e elevação refazem o desenho
      const antes = await cv.locator('svg.v3d-iso').innerHTML();
      await page.locator('.v3d-barra .slider', { hasText: 'Azimute' }).locator('input').fill('40');
      assert.notEqual(await cv.locator('svg.v3d-iso').innerHTML(), antes);
      // o filtro por tipo vale no fallback
      const total = JSON.parse(await cv.getAttribute('data-cena')).total;
      await page.getByRole('button', { name: 'Lajes', exact: true }).click();
      await page.waitForFunction((t) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-cena')).total < t, total);
      await page.getByRole('button', { name: 'Lajes', exact: true }).click();
      // clique no desenho seleciona o elemento (o mesmo estado da planta)
      await cv.locator('svg.v3d-iso path[data-id^="pilar:"]').first().click({ force: true });
      await page.locator('.v3d-sel-info').waitFor();
      assert.match(await page.locator('.v3d-sel-info').innerText(), /Selecionado:\s+P\d/);
    },
  };

export const f_V2 = {
    webgl: true,
    name: 'V2: cortes e linhas de seção (traçar, janela, renomear, profundidade, memorial, apagar) e armaduras em 3D (vista do edifício e aba 3D da viga, do pilar e da laje)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });

      // ---- corte traçado na planta: a janela abre sozinha com a elevação hachurada
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await page.locator('.planta-cv[data-vista]').waitFor();
      await grupoEdif(page, /^Cortes e seções/);
      await page.getByRole('button', { name: 'Traçar corte na planta', exact: true }).click();
      await page.waitForTimeout(300);
      const [ax, ay] = await telaDe(page, -1, 2.5), [bx, by] = await telaDe(page, 7, 2.5);
      await page.mouse.click(ax, ay);
      await page.mouse.click(bx, by);
      await page.keyboard.press('Enter');
      const jc = page.getByRole('dialog', { name: /^Corte — Corte AA/ });
      await jc.waitFor();
      const svg = jc.locator('svg.corte-svg');
      assert.ok(Number(await svg.getAttribute('data-secoes')) >= 3, await svg.getAttribute('data-secoes'));
      assert.ok(await svg.locator('polygon.corte-sec').count() >= 3);
      assert.match(await jc.innerText(), /Fundação .*Térreo/);
      await page.keyboard.press('Escape');
      assert.equal(await jc.count(), 0);

      // ---- lista: renomear, profundidade, reabrir
      const nome = page.getByLabel('Nome do corte Corte AA', { exact: true });
      await nome.fill('Longitudinal');
      await nome.press('Enter');
      await page.getByLabel('Nome do corte Longitudinal', { exact: true }).waitFor();
      await page.getByLabel(/^Profundidade de Longitudinal/).fill('1');
      await page.getByLabel(/^Profundidade de Longitudinal/).press('Enter');
      await page.getByRole('button', { name: 'Abrir Longitudinal', exact: true }).click();
      const jc2 = page.getByRole('dialog', { name: /^Corte — Longitudinal/ });
      await jc2.waitFor();
      assert.match(await jc2.innerText(), /até 1,00 m/);
      await page.keyboard.press('Escape');

      // ---- linha de seção: dois cliques e a janela abre sozinha com os vãos
      await page.getByRole('button', { name: 'Traçar linha de seção na planta', exact: true }).click();
      await page.waitForTimeout(300);
      const [cx, cy] = await telaDe(page, -1, 2.5), [dx, dy] = await telaDe(page, 7, 2.5);
      await page.mouse.click(cx, cy);
      await page.mouse.click(dx, dy);
      const js = page.getByRole('dialog', { name: /^Seção — Seção 1/ });
      await js.waitFor();
      assert.ok(await js.locator('[data-secao-vaos] tbody tr').count() >= 1);
      assert.match(await js.locator('[data-secao-vaos]').innerText(), /5,85/); // 6 m de eixo a eixo − 15 cm de viga
      assert.ok(await js.locator('svg.corte-svg rect.corte-sec').count() >= 3);
      await js.getByLabel(/^Pavimento da seção/).selectOption({ label: 'Tipo 2' });
      await js.getByText(/em Tipo 2/).waitFor();
      await page.keyboard.press('Escape');

      // ---- memorial: uma figura por corte e por seção
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.equal(await memo.locator('figure[data-memorial-corte] svg.corte-svg').count(), 1);
      assert.equal(await memo.locator('figure[data-memorial-secao] svg.corte-svg').count(), 1);
      await memo.getByRole('button', { name: 'Fechar' }).click();

      // ---- armaduras na vista 3D do edifício
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv').first();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const status = await cv.getAttribute('data-status');
      console.log(`        (V2: vista 3D em modo ${status})`);
      assert.equal(await cv.getAttribute('data-armaduras'), '0');
      await page.getByLabel('Armaduras', { exact: true }).check();
      await page.waitForFunction(() => { const a = document.querySelector('.v3d-cv')?.getAttribute('data-armaduras'); return !!a && a !== '0' && JSON.parse(a).barras > 0; });
      const arm = JSON.parse(await cv.getAttribute('data-armaduras'));
      assert.ok(arm.segmentos > 100 && arm.camadas >= 2 && !arm.truncado, JSON.stringify(arm));
      await page.locator('.v3d-barra').getByLabel('Colorir armaduras por', { exact: true }).selectOption('elemento');
      await page.waitForFunction((n) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-armaduras')).camadas !== n, arm.camadas);
      if (status === 'pronto') {
        await page.getByLabel('Barras como tubos', { exact: true }).check();
        await page.locator('.v3d-barra .slider', { hasText: 'Espessura das barras' }).locator('input').fill('10');
        await page.waitForFunction(() => Number(document.querySelector('.v3d-cv')?.getAttribute('data-frame-ms')) >= 0);
      }
      // escopo de um pavimento: menos barras
      await page.locator('.v3d-barra').getByLabel('Escopo da vista 3D').selectOption('pavimento');
      await page.locator('.v3d-barra').getByLabel('Pavimento', { exact: true }).selectOption({ label: 'Tipo 2' });
      await page.waitForFunction((n) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-armaduras')).segmentos < n, arm.segmentos);

      // ---- aba 3D das janelas de armadura
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const card = (t) => page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: t }) });
      for (const [titulo, dialogo, tipo] of [[/^Vigas$/, /Resultados do elemento — Viga/, 'viga'], ['Pilares (por lance)', /Resultados do elemento — Pilar/, 'pilar'], [/^Lajes$/, /Resultados do elemento — Laje/, 'laje']]) {
        await card(titulo).locator('tbody tr').first().dblclick();
        const j = page.getByRole('dialog', { name: dialogo });
        await j.waitFor();
        await j.getByRole('radio', { name: '3D', exact: true }).click();
        const a3 = j.locator('[data-armadura3d]');
        await a3.waitFor();
        const info = JSON.parse(await a3.getAttribute('data-armadura3d'));
        assert.equal(info.tipo, tipo);
        assert.ok(info.barras > 0 && info.segmentos > 0, JSON.stringify(info));
        if (status === 'pronto') {
          await j.locator('.armadura3d-cv[data-status="pronto"] canvas').waitFor();
          await page.waitForFunction(() => Number(document.querySelector('.armadura3d-cv')?.getAttribute('data-frame-ms')) >= 0);
        } else {
          assert.equal(await j.locator('.armadura3d-cv canvas').count(), 0);
        }
        await page.keyboard.press('Escape');
      }

      // ---- apagar corte e seção
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta', exact: true }).click();
      await page.getByRole('button', { name: 'Apagar Longitudinal', exact: true }).click();
      await page.getByRole('button', { name: 'Apagar Seção 1', exact: true }).click();
      assert.equal(await page.locator('[data-cortes-lista]').count(), 0);
      assert.equal(await page.locator('[data-secoes-lista]').count(), 0);
    },
  };

export const f_V3 = {
    webgl: true,
    name: 'V3: deformada 3D (hipótese, escala, eixos, animação, legenda), consulta de deslocamentos por nó, máximos por pano e pavimento, CSV e flecha entre dois pontos da laje',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');

      // ---- sem cálculo: aviso na aba
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Deslocamentos', exact: true }).click();
      await page.getByText('Calcule a estrutura (aba Dimensionamento) para consultar os deslocamentos.').waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });

      // ---- deformada na vista 3D
      await page.locator('.edif-tabs').getByRole('tab', { name: '3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await cv.waitFor();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const status = await cv.getAttribute('data-status');
      console.log(`        (V3: vista 3D em modo ${status})`);
      assert.equal(await cv.getAttribute('data-deformada'), '0');
      await page.getByLabel('Deformada', { exact: true }).check();
      await page.waitForFunction(() => { const a = document.querySelector('.v3d-cv')?.getAttribute('data-deformada'); return !!a && a !== '0'; });
      const def = async () => JSON.parse(await cv.getAttribute('data-deformada'));
      const d0 = await def();
      assert.equal(d0.modo, 'completa');
      assert.ok(d0.dmaxMm > 0.01 && d0.escala > 1 && d0.objetos > 5, JSON.stringify(d0));
      if (status === 'pronto') {
        const leg = page.locator('.v3d-def-leg');
        await leg.waitFor();
        assert.match(await leg.innerText(), /mm/);
        assert.equal(await leg.getByRole('img', { name: 'Legenda da deformada', exact: true }).count(), 1);
      }
      // troca a hipótese: o máximo muda
      const lista = page.locator('.v3d-barra').getByLabel('Hipótese da deformada', { exact: true });
      const valores = await lista.locator('option').evaluateAll((os) => os.map((o) => o.value));
      assert.ok(valores.includes('caso:G') && valores.includes('caso:Q') && valores.length > 4, valores.join(','));
      await lista.selectOption('caso:Q');
      await page.waitForFunction((n) => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).dmaxMm !== n, d0.dmaxMm);
      const dq = await def();
      assert.ok(dq.dmaxMm > 0 && dq.dmaxMm < d0.dmaxMm, `${dq.dmaxMm} < ${d0.dmaxMm}`);
      // escala manual e de volta à automática
      await page.getByLabel('Escala automática', { exact: true }).uncheck();
      await page.locator('.v3d-barra .slider', { hasText: 'Escala da deformada' }).locator('input').fill('100');
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).escala === 100);
      await page.getByLabel('Escala automática', { exact: true }).check();
      // estrutura simplificada (eixos)
      await page.getByLabel('Só eixos das barras', { exact: true }).check();
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).modo === 'eixos');
      await page.getByLabel('Só eixos das barras', { exact: true }).uncheck();
      await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).modo === 'completa');
      // animação (só com WebGL): liga, ajusta o período, desliga
      if (status === 'pronto') {
        await page.getByLabel('Animar', { exact: true }).check();
        await page.waitForFunction(() => JSON.parse(document.querySelector('.v3d-cv').getAttribute('data-deformada')).animando === true);
        await page.locator('.v3d-barra .slider', { hasText: 'Período da animação' }).locator('input').fill('4');
        await page.waitForFunction(() => Number(document.querySelector('.v3d-cv')?.getAttribute('data-frame-ms')) >= 0);
        await page.getByLabel('Animar', { exact: true }).uncheck();
      }
      await page.getByLabel('Deformada', { exact: true }).uncheck();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-deformada') === '0');

      // ---- aba Deslocamentos: consulta por nó
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Deslocamentos', exact: true }).click();
      await page.getByLabel(/^X da consulta/).fill('3');
      await page.getByLabel(/^X da consulta/).press('Enter');
      await page.getByLabel(/^Y da consulta/).fill('2,5');
      await page.getByLabel(/^Y da consulta/).press('Enter');
      const consulta = page.locator('[data-consulta-no]');
      await consulta.waitFor();
      assert.ok((await consulta.locator('tbody tr').count()) > 5);
      const linhaG = consulta.locator('tbody tr', { hasText: /^Caso G/ }).first();
      const uzG = parseFloat((await linhaG.locator('td').nth(3).innerText()).replace(',', '.'));
      assert.ok(uzG < -0.01, `uz de G no meio da laje: ${uzG} mm`);
      // máximos por pano e por pavimento
      assert.ok(Number(await page.locator('[data-desloc-panos]').getAttribute('data-desloc-panos')) >= 1);
      assert.ok(Number(await page.locator('[data-desloc-pilares]').getAttribute('data-desloc-pilares')) >= 3);
      // CSV da malha
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar CSV dos deslocamentos da malha', exact: true }).click()]);
      assert.equal(dl.suggestedFilename(), 'deslocamentos-malha.csv');

      // ---- flecha entre dois pontos: combinação mais desfavorável (padrão), secante e tangente
      const flecha = async () => JSON.parse(await page.locator('[data-flecha]').getAttribute('data-flecha'));
      await page.locator('[data-flecha]').waitFor();
      const f0 = await flecha();
      assert.ok(f0.L > 4 && f0.flechaMm > 0.01 && f0.razao > 1, JSON.stringify(f0));
      await page.getByLabel(/^X inicial/).fill('1');
      await page.getByLabel(/^X inicial/).press('Enter');
      await page.waitForFunction((L) => JSON.parse(document.querySelector('[data-flecha]').getAttribute('data-flecha')).L !== L, f0.L);
      const f1 = await flecha();
      assert.ok(f1.L < f0.L);
      await page.getByRole('radio', { name: 'Tangente no ponto inicial', exact: true }).click();
      await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-flecha]').getAttribute('data-flecha')).flechaMm !== v, f1.flechaMm);
      await page.getByRole('radio', { name: 'Secante', exact: true }).click();
      await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-flecha]').getAttribute('data-flecha')).flechaMm === v, f1.flechaMm);
      await page.getByLabel(/^Amplificação da flecha/).fill('2');
      await page.getByLabel(/^Amplificação da flecha/).press('Enter');
      await page.waitForFunction((v) => Math.abs(JSON.parse(document.querySelector('[data-flecha]').getAttribute('data-flecha')).flechaMm - 2 * v) < 0.01, f1.flechaMm);
      await page.getByLabel(/^Hipótese da flecha/).selectOption('caso:G');
      assert.equal(await page.locator('svg.flecha-perfil path.fp-curva').count(), 1);
    },
  };

export const f_V4 = {
    name: 'V4: isovalores da laje (grandeza, hipótese, níveis, limites, isolinhas e valores), várias janelas independentes, clique abrindo a janela da laje e saídas SVG, PNG, DXF e CSV',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');

      // ---- sem cálculo: aviso
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Isovalores', exact: true }).click();
      await page.getByText('Calcule a estrutura (aba Dimensionamento) para ver os mapas de isovalores.').waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Isovalores', exact: true }).click();

      const dados = async (n) => JSON.parse(await page.locator(`[data-isov-janela="${n}"]`).getAttribute('data-iso'));
      // ---- janela 1: deslocamento vertical do primeiro caso (negativo para baixo), mínimo no centro da laje
      await page.locator('[data-isov-janela="1"]').waitFor();
      let d1 = await dados(1);
      assert.equal(d1.grandeza, 'uz');
      assert.ok(d1.min < -0.01 && d1.bandas >= 3 && d1.isolinhas >= 2, JSON.stringify(d1));
      assert.ok(Math.abs(d1.minPos[0] - 3) < 0.6 && Math.abs(d1.minPos[1] - 2.5) < 0.6, JSON.stringify(d1.minPos));
      assert.equal(await page.locator('[data-isov-janela="1"] svg.isov-mapa').count(), 1);
      assert.ok((await page.locator('[data-isov-janela="1"] svg.isov-mapa polygon.iso-banda').count()) >= 3);
      // isolinhas e valores ligam e desligam
      await page.getByLabel('Isolinhas (janela 1)', { exact: true }).uncheck();
      assert.equal(await page.locator('[data-isov-janela="1"] polyline.iso-linha').count(), 0);
      await page.getByLabel('Isolinhas (janela 1)', { exact: true }).check();
      assert.ok((await page.locator('[data-isov-janela="1"] polyline.iso-linha').count()) >= 2);
      await page.getByLabel('Valores (janela 1)', { exact: true }).check();
      assert.ok((await page.locator('[data-isov-janela="1"] text.iso-valor').count()) >= 1);
      await page.getByLabel('Valores (janela 1)', { exact: true }).uncheck();

      // ---- grandeza de cálculo e área de aço
      await page.getByLabel(/^Grandeza \(janela 1\)/).selectOption('MxInf');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).grandeza === 'MxInf');
      d1 = await dados(1);
      assert.ok(d1.max > 1 && d1.min >= 0, JSON.stringify(d1));
      await page.getByLabel(/^Grandeza \(janela 1\)/).selectOption('AsInfX');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).grandeza === 'AsInfX');
      const asMax = (await dados(1)).max, asMin = (await dados(1)).min;
      assert.ok(asMax > 0.5 && asMax > asMin + 0.2, `As máx. ${asMax}, mín. ${asMin}`);

      // ---- limite mínimo restringe a faixa: o mínimo passa a ser o do limite
      const meio = +((asMax + asMin) / 2).toFixed(3);
      await page.getByLabel(/^Limite mínimo \(janela 1\)/).fill(String(meio).replace('.', ','));
      await page.getByLabel(/^Limite mínimo \(janela 1\)/).press('Enter');
      await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).min >= v - 1e-3, meio);
      assert.ok(Math.abs((await dados(1)).max - asMax) < 1e-3);
      await page.getByLabel(/^Limite mínimo \(janela 1\)/).fill('');
      await page.getByLabel(/^Limite mínimo \(janela 1\)/).press('Enter');
      await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).min < v - 1e-3, meio);

      // ---- níveis definidos
      await page.getByLabel(/^Níveis definidos \(janela 1\)/).fill('1; 2; 3');
      await page.getByLabel(/^Níveis definidos \(janela 1\)/).press('Tab');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-isov-janela="1"]').getAttribute('data-iso')).niveis === 3);
      await page.getByLabel(/^Níveis definidos \(janela 1\)/).fill('');
      await page.getByLabel(/^Níveis definidos \(janela 1\)/).press('Tab');

      // ---- várias janelas independentes
      await page.getByRole('button', { name: 'Nova janela de isovalores', exact: true }).click();
      await page.locator('[data-isov-janela="2"]').waitFor();
      assert.equal(await page.locator('[data-isov-janelas]').getAttribute('data-isov-janelas'), '2');
      await page.getByLabel(/^Grandeza \(janela 2\)/).selectOption('uz');
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-isov-janela="2"]').getAttribute('data-iso')).grandeza === 'uz');
      assert.equal((await dados(1)).grandeza, 'AsInfX');
      const opcoes = await page.getByLabel(/^Hipótese \(janela 2\)/).evaluate((el) => [...el.options].map((o) => ({ v: o.value, t: o.textContent })));
      const casoG = opcoes.find((o) => /Caso G/.test(o.t)).v, casoQ = opcoes.find((o) => /Caso Q/.test(o.t))?.v;
      await page.getByLabel(/^Hipótese \(janela 2\)/).selectOption(casoG);
      const uzG = (await dados(2)).min;
      if (casoQ) {
        await page.getByLabel(/^Hipótese \(janela 2\)/).selectOption(casoQ);
        await page.waitForFunction((v) => JSON.parse(document.querySelector('[data-isov-janela="2"]').getAttribute('data-iso')).min !== v, uzG);
      }
      assert.equal((await dados(1)).grandeza, 'AsInfX');

      // ---- clique no mapa abre a janela da laje
      await page.locator('[data-isov-janela="2"] svg.isov-mapa').scrollIntoViewIfNeeded();
      const caixa = await page.locator('[data-isov-janela="2"] svg.isov-mapa').boundingBox();
      await page.mouse.click(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
      await page.locator('.modal, [role="dialog"]').first().waitFor({ timeout: 5000 });
      await page.keyboard.press('Escape');

      // ---- saídas
      const baixar = async (rot, ext) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: rot, exact: true }).click()]);
        assert.ok(dl.suggestedFilename().endsWith(ext), dl.suggestedFilename());
      };
      await baixar('Baixar SVG (janela 1)', '.svg');
      await baixar('Baixar PNG (janela 1)', '.png');
      await baixar('Baixar DXF das isolinhas (janela 1)', '.dxf');
      await baixar('Baixar CSV x, y, valor (janela 1)', '.csv');

      // ---- fechar a janela 2 não mexe na 1
      await page.getByRole('button', { name: 'Fechar janela 2', exact: true }).click();
      assert.equal(await page.locator('[data-isov-janelas]').getAttribute('data-isov-janelas'), '1');
      assert.equal((await dados(1)).grandeza, 'AsInfX');
    },
  };
