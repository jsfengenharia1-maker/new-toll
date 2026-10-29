// Fluxos de interface — E (parte 1/2).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { grupoEdif, tab, num, telaDe, reenquadrarAte, downloadText, botaoCalcular } from './helpers.mjs';

export const f_E1a = {
    name: 'E1a: pilar sobre pilar (realce e coordenadas relativas ao pilar de baixo, nome P5a) e pilar sobre viga (transição): janela, viga de transição, memorial e pranchas',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      const sec = (b, h) => `{"tipo": "ret", "b": ${b}, "h": ${h}}`;
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": ${sec(0.6, 0.6)}}}`).join(', ') + ']}');
      // P5 da fundação ao Tipo 3 (admite outro por cima) e P6 nasce no Tipo 3 sobre a viga de y = 0
      await cmd(`pilar.inserir {"x": 3, "y": 2.5, "secao": ${sec(0.3, 0.3)}, "morre": "pav_6"}`);
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.6}}}`).join(', ') + ']}');
      await cmd(`pilar.inserir {"x": 3, "y": 0, "secao": ${sec(0.25, 0.25)}, "nasce": "pav_6"}`);
      // pilar sem apoio embaixo é erro; sobre viga é só informação
      await cmd(`pilar.inserir {"x": 1.5, "y": 3.5, "secao": ${sec(0.25, 0.25)}, "nasce": "pav_6"}`);
      // planta do Tipo 3: pilar da ferramenta passa sobre o pilar de baixo (P5): realce, coordenadas relativas e P5a
      const sel = page.getByLabel('Pavimento da planta');
      await sel.selectOption(await sel.locator('option', { hasText: 'Tipo 3' }).first().getAttribute('value'));
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await page.keyboard.press('p');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'pilar');
      await reenquadrarAte(page, [[0, 0], [6, 0], [6, 5], [0, 5], [3, 2.5]]);
      const [px, py] = await telaDe(page, 3.1, 2.5);
      await page.mouse.move(px, py);
      await page.waitForFunction(() => /sobre P5: Δx/.test(document.querySelector('.planta-st .num')?.textContent ?? ''), null, { timeout: 20000 });
      // um pilar que não admite outro por cima (P1 vai até a cobertura) não mostra a referência
      const [qx, qy] = await telaDe(page, 0, 0);
      await page.mouse.move(qx, qy);
      await page.waitForFunction(() => !/sobre P/.test(document.querySelector('.planta-st .num')?.textContent ?? ''), null, { timeout: 20000 });
      await page.mouse.move(px, py);
      await page.waitForFunction(() => /sobre P5: Δx/.test(document.querySelector('.planta-st .num')?.textContent ?? ''), null, { timeout: 20000 });
      await page.mouse.click(px, py);
      await page.locator('.statusbar .msg', { hasText: /P5a inserido/ }).waitFor({ timeout: 20000 });
      // tabela de pilares: P5a nasce no Tipo 3, sem erro de lançamento em P5a
      await page.keyboard.press('s');
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Pilares \(/ }) });
      await gp.locator(':scope > summary').click();
      assert.equal(await gp.getByLabel('Nasce P5a').inputValue(), 'pav_6');
      // Cobertura: seleciona P6 (sobre a viga) e vê o apoio e o lance
      await sel.selectOption(await sel.locator('option', { hasText: 'Cobertura' }).first().getAttribute('value'));
      await reenquadrarAte(page, [[0, 0], [6, 0], [3, 2.5], [0, 5]]);
      await page.locator('.planta-st').click();
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 3, 0)));
      const gv = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vínculos, flambagem/ }) });
      await gv.locator(':scope > summary').click();
      await gv.locator('[data-apoio="viga"]').waitFor({ timeout: 20000 });
      assert.match(await gv.locator('[data-apoio="viga"]').innerText(), /sobre a viga V1 \(viga de transição\)/);
      await gv.getByLabel('Início do pilar').waitFor();
      // verificação do lançamento: P7 sem apoio é erro; P6 sobre a viga é só informação
      await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).click();
      const ver = await page.locator('.edif-out').innerText();
      assert.match(ver, /P7 nasce em Tipo 3 sem pilar, viga ou laje embaixo/);
      assert.match(ver, /P6 nasce sobre V1 em Tipo 3: viga de transição/);
      // calcula e dimensiona
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      await livre();
      // janela da viga de transição: tabela com o pilar P6, Nd e cortante nas faces
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr', { hasText: 'V1' }).first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      const tr = jv.locator('table[data-transicoes]');
      await tr.waitFor();
      assert.match(await tr.innerText(), /P6/);
      assert.match(await jv.innerText(), /Transição: P6 nasce sobre a viga/);
      await jv.getByRole('button', { name: 'Fechar' }).click();
      // janela do pilar P6: o apoio detectado e o pé ligado ao modelo
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr', { hasText: 'P6' }).first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      assert.match(await jp.locator('[data-apoio="viga"]').innerText(), /Pé ligado ao apoio no modelo/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // memorial: pilares apoiados e vigas de transição
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.innerText();
      assert.match(mt, /Pilares que nascem acima da fundação \(apoiados\)/);
      assert.match(mt, /Vigas de transição \(pilares que nascem sobre vigas\)/);
      assert.ok(await memo.locator('[data-memorial-transicoes] tbody tr').count() >= 1);
      assert.match(mt, /P5a[\s\S]*pilar P5/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // pranchas: pilares com "nasce em ..." e vigas com a carga da transição
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      const prev = page.locator('.prancha-prev');
      await tipo.selectOption({ label: 'Armação de pilares' });
      await prev.locator('svg').waitFor();
      const tp = await prev.textContent();
      assert.match(tp, /nasce em V1/);
      assert.match(tp, /nasce em P5/);
      await tipo.selectOption({ label: 'Armação de vigas' });
      await prev.locator('svg').waitFor();
      assert.match(await prev.textContent(), /P6 nasce aqui · Nd = \d+ kN/);
    },
  };

export const f_E1b = {
    name: 'E1b: pilar-parede (tipo reto criado no grupo, lançamento, planta, janela com esforços por lado, viga apoiada ao longo, memorial e pranchas)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const sec = '{"tipo": "ret", "b": 0.3, "h": 0.3}';
      await cmd('lote {"comandos": [' + [[6, 0], [0, 5], [6, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": ${sec}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [6, 0], [6, 5], [0, 5]], "tipo": {"tipo": "macica", "h": 0.12}}');
      // grupo Pilares-parede: cria o tipo reto de 4 m × 20 cm e lança em (0; 0)
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Pilares-parede/ }) });
      await gp.locator(':scope > summary').click();
      await gp.getByLabel('Novo tipo').fill('Parede 4 m');
      await gp.getByLabel('Comprimento').fill('400');
      await gp.getByLabel('Espessura').first().fill('20');
      await gp.getByRole('button', { name: 'Criar tipo reto' }).click();
      await gp.locator('[data-pp-previa]').waitFor({ timeout: 20000 });
      assert.equal(await gp.locator('table[data-pp-lados] tbody tr').count(), 1);
      assert.match(await gp.locator('table[data-pp-lados] tbody tr').first().innerText(), /casca/);
      await gp.getByRole('button', { name: 'Inserir em (x; y)' }).click();
      await gp.locator('table[data-pp-lista] tbody tr', { hasText: 'PP1' }).waitFor({ timeout: 20000 });
      // a planta desenha o pilar-parede; clique no corpo seleciona; o realce vai para a lista
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await reenquadrarAte(page, [[0, 0], [6, 0], [6, 5], [0, 5], [4, 0]]);
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 2, 0)));
      await gp.locator('table[data-pp-lista] tbody tr[aria-selected="true"]').waitFor({ timeout: 20000 });
      // verificação: nenhum erro de lançamento do pilar-parede
      await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).click();
      assert.doesNotMatch(await page.locator('.edif-out').innerText(), /PPAREDE_APOIO|PPAREDE_SOBREPOSTO/);
      // calcula e dimensiona
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      await livre();
      const cartao = page.locator('[data-pp-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /PP1[\s\S]*casca/);
      // janela com as cargas na base e os esforços por lado e pavimento
      await cartao.getByRole('button', { name: 'Resultados de PP1' }).click();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar-parede PP1/ });
      await jp.waitFor();
      await jp.locator('table[data-pp-base]').waitFor();
      assert.match(await jp.locator('table[data-pp-base]').innerText(), /Nd máx\./);
      const lado = jp.locator('details[data-pp-lado]').first();
      assert.ok(await lado.locator('tbody tr').count() >= 2);
      await jp.getByLabel('Caso').selectOption('G');
      assert.match(await lado.locator('tbody tr').first().innerText(), /-?\d/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // a viga sobre a parede (apoio longitudinal) foi dimensionada e detalhada
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      assert.ok(await cardVigas.locator('tbody tr').count() >= 3);
      // memorial: seção dos pilares-parede com a figura e as tabelas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.innerText();
      assert.match(mt, /Pilares-parede/);
      assert.match(mt, /PP1 — cargas na base e esforços por lado/);
      assert.ok(await memo.locator('[data-memorial-pilares-parede] svg').count() >= 1);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // pranchas: formas e locação trazem PP1
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      const prev = page.locator('.prancha-prev');
      await tipo.selectOption({ label: 'Formas' });
      await prev.locator('svg').waitFor();
      assert.match(await prev.textContent(), /PP1/);
      await tipo.selectOption({ label: 'Locação e cargas' });
      await prev.locator('svg').waitFor();
      assert.match(await prev.textContent(), /PP1/);
    },
  };

export const f_E1c = {
    name: 'E1c: paredes de concreto (traçar na planta, abertura, empuxo de terra, fora do diafragma, janela com empuxo)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('obra.definir {"profundidadeFundacao": 1}');
      await cmd('empuxo.tipo {"nome": "Aterro", "metodo": "repouso", "estratos": [{"espessura": 20, "gama": 18, "phi": 30}], "cotaAterro": 3}');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.empuxos?.length > 0, null, { timeout: 20000 });
      const idEmp = await page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.empuxos[0].id);
      await cmd('caso.criar {"nome": "Empuxo", "natureza": "H", "empuxo": "' + idEmp + '"}');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.casos?.some((c) => c.nome === 'Empuxo'), null, { timeout: 20000 });
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      // grupo Paredes: espessura 20 cm, morre no Tipo 3; traça as duas paredes na planta
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Paredes/ }) });
      await gp.locator(':scope > summary').click();
      await gp.getByLabel('Espessura').first().fill('20');
      await gp.getByLabel('Morre em').selectOption({ label: 'Tipo 3' });
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await reenquadrarAte(page, [[0, 0], [12, 0], [12, 6], [0, 6]]);
      await gp.getByRole('button', { name: 'Traçar na planta' }).click();
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 12, 0)));
      await page.keyboard.press('Enter');
      await gp.getByRole('button', { name: 'Traçar na planta' }).click();
      await page.mouse.click(...(await telaDe(page, 0, 6)));
      await page.mouse.click(...(await telaDe(page, 12, 6)));
      await page.keyboard.press('Enter');
      await gp.locator('table[data-pw-lista] tbody tr').nth(1).waitFor({ timeout: 20000 });
      assert.equal(await gp.locator('table[data-pw-lista] tbody tr').count(), 2);
      assert.match(await gp.locator('table[data-pw-lista]').innerText(), /M1[\s\S]*M2/);
      // M1: abertura de janela na base do Térreo
      await gp.getByRole('button', { name: 'Selecionar M1' }).click();
      const ed = gp.locator('[data-pw-editor]');
      const campo = (t) => ed.locator('label.field', { has: page.locator('.flabel', { hasText: new RegExp('^' + t + '$') }) }).locator('input');
      await ed.getByRole('radio', { name: 'janela' }).click();
      await campo('s').fill('400');
      await campo('Largura').fill('200');
      await campo('Peitoril').fill('50');
      await campo('Altura').fill('200');
      await ed.getByLabel('Pavimento da abertura').selectOption({ label: 'Térreo' });
      await ed.getByRole('button', { name: 'Acrescentar abertura' }).click();
      await gp.locator('table[data-pw-aberturas] tbody tr').waitFor({ timeout: 20000 });
      assert.equal(await gp.locator('table[data-pw-aberturas] tbody tr').count(), 1);
      // empuxo: M1 com o terreno à direita; M2 com o terreno à esquerda
      await ed.getByLabel('Caso do empuxo').selectOption({ label: 'Empuxo' });
      await ed.getByRole('radio', { name: 'terreno à direita' }).click();
      await ed.getByRole('button', { name: 'Aplicar empuxo' }).click();
      await gp.getByRole('button', { name: 'Selecionar M2' }).click();
      await ed.getByLabel('Caso do empuxo').selectOption({ label: 'Empuxo' });
      await ed.getByRole('radio', { name: 'terreno à esquerda' }).click();
      await ed.getByRole('button', { name: 'Aplicar empuxo' }).click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.every((w) => w.empuxos?.length === 1), null, { timeout: 20000 });
      const linhas = gp.locator('table[data-pw-lista] tbody tr');
      assert.match(await linhas.nth(0).innerText(), /sim/);
      assert.match(await linhas.nth(1).innerText(), /sim/);
      // verificação: a parede chega ao Tipo 3 e não há sobreposição nem abertura inválida
      await page.locator('.edif-tabs').getByRole('tab', { name: /^Verificação/ }).click();
      const out = await page.locator('.edif-out').innerText();
      // a tela mostra a mensagem (não o código): fora do diafragma no Térreo; sem sobreposição nem abertura inválida
      assert.match(out, /não toca laje em Térreo: fora do diafragma rígido/);
      assert.doesNotMatch(out, /sobreposta|abertura/i);
      // calcula e dimensiona
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      await livre();
      const cartao = page.locator('[data-pw-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /M1/);
      assert.match(await cartao.innerText(), /M2/);
      // janela de M1: resultante do empuxo (Fy = 810 kN)
      await cartao.getByRole('button', { name: 'Resultados de M1' }).click();
      const jp = page.getByRole('dialog', { name: /M1/ });
      await jp.waitFor();
      const texto = await jp.locator('table[data-pw-empuxo]').innerText();
      assert.match(texto, /810/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_E1d = {
    name: 'E1d: armadura de paredes (janela com panos, bloqueio e desbloqueio, emendas, abertura, isovalores, muro de arrimo, memorial, resumo de aço e prancha de paredes)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t });
      // modelo enxuto: Térreo e Tipo 1, empuxo de terra, duas paredes de 12 m, uma abertura e um muro de arrimo
      await cmd('obra.definir {"profundidadeFundacao": 1}');
      await esperarModelo(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos, null);
      let b0 = await modelo();
      for (const nome of ['Cobertura', 'Tipo 3', 'Tipo 2']) {
        const p = b0.pavimentos.find((x) => x.nome === nome);
        const antes = b0.pavimentos.length;
        await cmd('pavimento.remover {"id": "' + p.id + '"}');
        await esperarModelo((n) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos?.length === n, antes - 1);
        b0 = await modelo();
      }
      assert.equal(b0.pavimentos.length, 2);
      const terreo = b0.pavimentos.find((p) => p.nome === 'Térreo'), tipo1 = b0.pavimentos.find((p) => p.nome === 'Tipo 1');
      await cmd('empuxo.tipo {"nome": "Aterro", "metodo": "repouso", "estratos": [{"espessura": 20, "gama": 18, "phi": 30}], "cotaAterro": 3}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.empuxos?.length > 0, null);
      const idEmp = (await modelo()).empuxos[0].id;
      await cmd('caso.criar {"nome": "Empuxo", "natureza": "H", "empuxo": "' + idEmp + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.casos?.some((c) => c.nome === 'Empuxo'), null);
      const idCaso = (await modelo()).casos.find((c) => c.nome === 'Empuxo').id;
      await cmd('laje.criar {"grupo": "' + tipo1.grupo + '", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "morre": "' + tipo1.id + '"}');
      await cmd('parede.criar {"pontos": [[0, 6], [12, 6]], "espessura": 0.2, "morre": "' + tipo1.id + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 2, null);
      const ws = (await modelo()).paredes;
      const m1 = ws.find((w) => w.nome === 'M1').id, m2 = ws.find((w) => w.nome === 'M2').id;
      await cmd('parede.empuxo {"parede": "' + m1 + '", "empuxos": [{"caso": "' + idCaso + '", "lado": "dir"}]}');
      await cmd('parede.empuxo {"parede": "' + m2 + '", "empuxos": [{"caso": "' + idCaso + '", "lado": "esq"}]}');
      await cmd('parede.abertura {"parede": "' + m1 + '", "s": 5, "largura": 1, "altura": 2.1, "pavimento": "' + terreo.id + '"}');
      await esperarModelo((id) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.find((w) => w.id === id)?.aberturas?.length === 1, m1);
      await cmd('muro.arrimo {"nome": "MA1", "H": 3, "tTopo": 0.2, "tBase": 0.3, "B": 2.6, "ponta": 0.5, "hBase": 0.4, "solo": {"gama": 18, "phi": 30, "metodo": "rankine"}, "sobrecarga": 10, "atrito": 0.6}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.murosArrimo?.length === 1, null);
      // 2. cálculo e grupo de muros na barra lateral
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      await page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const gm = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Muros de arrimo/ }) });
      await gm.locator('table[data-mu-lista]').waitFor({ timeout: 30000 });
      assert.match(await gm.locator('table[data-mu-lista]').innerText(), /MA1/);
      assert.match(await gm.locator('table[data-mu-lista]').innerText(), /atende/);
      // 3. cartão de paredes com as colunas de armadura
      const cartao = page.locator('[data-pw-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /M1/);
      assert.match(await cartao.innerText(), /Cumprimento mín\./);
      await cartao.getByRole('button', { name: 'Resultados de M1' }).click();
      const jp = page.getByRole('dialog', { name: /M1/ });
      await jp.waitFor();
      // 4. panos: malha bloqueada reprova; desbloquear volta à calculada
      assert.equal(await jp.locator('table[data-pw-panos] tbody tr').count(), 3);
      assert.match(await jp.locator('table[data-pw-panos] tbody tr').first().innerText(), /calculada/);
      await jp.locator('table[data-pw-panos] tbody tr').first().click();
      const edMalha = jp.locator('[data-pw-editor-malha]');
      await edMalha.getByLabel('φ vertical').selectOption({ label: '6,3' });
      await edMalha.getByLabel('s vertical').fill('40');
      await edMalha.getByLabel('φ horizontal').selectOption({ label: '6,3' });
      await edMalha.getByLabel('s horizontal').fill('40');
      await edMalha.getByRole('button', { name: 'Bloquear malha' }).click();
      await page.waitForFunction(() => document.querySelector('table[data-pw-panos] tbody tr')?.textContent?.includes('bloqueada'), null, { timeout: 90000 });
      const primeira = await jp.locator('table[data-pw-panos] tbody tr').first().innerText();
      assert.match(primeira, /bloqueada/);
      assert.match(primeira, /não atende/);
      assert.match(await jp.locator('ul[data-pw-mensagens]').innerText(), /Armadura bloqueada/);
      await edMalha.getByRole('button', { name: 'Desbloquear' }).click();
      await page.waitForFunction(() => document.querySelector('table[data-pw-panos] tbody tr')?.textContent?.includes('calculada'), null, { timeout: 90000 });
      // 5. emendas: tração e compressão editadas e depois voltar às calculadas
      assert.ok(await jp.locator('table[data-pw-emendas] tbody tr').count() >= 1);
      const edEm = jp.locator('[data-pw-editor-emendas]');
      await edEm.getByLabel('Tração').fill('20');
      await edEm.getByLabel('Compressão').fill('20');
      await edEm.getByRole('button', { name: 'Aplicar emendas' }).click();
      await jp.locator('table[data-pw-emendas]', { hasText: 'editada' }).waitFor({ timeout: 90000 });
      assert.match(await jp.locator('ul[data-pw-mensagens]').innerText(), /abaixo do mínimo/);
      await edEm.getByRole('button', { name: 'Voltar às calculadas' }).click();
      await jp.locator('table[data-pw-emendas]', { hasText: 'calculada' }).waitFor({ timeout: 90000 });
      // 6. abertura: armadura bloqueada, relatório e limpeza
      const tabAb = jp.locator('table[data-pw-aberturas-arm-lista] tbody tr');
      assert.equal(await tabAb.count(), 1);
      assert.match(await tabAb.first().innerText(), /porta/);
      await tabAb.first().click();
      const edAb = jp.locator('[data-pw-editor-abertura]');
      await edAb.getByLabel('Verga n').fill('4');
      await edAb.getByLabel('Verga φ').selectOption({ label: '16' });
      await edAb.getByLabel('Montante n').fill('6');
      await edAb.getByLabel('Montante φ').selectOption({ label: '16' });
      await jp.getByRole('button', { name: 'Bloquear armadura da abertura' }).click();
      await page.waitForFunction(() => document.querySelector('table[data-pw-aberturas-arm-lista] tbody tr')?.textContent?.includes('bloqueada'), null, { timeout: 90000 });
      await jp.locator('details[data-pw-relatorio-abertura] summary').click();
      const relAb = await jp.locator('details[data-pw-relatorio-abertura]').innerText();
      assert.match(relAb, /Necessária/);
      assert.match(relAb, /Cortante da verga/);
      await jp.getByRole('button', { name: 'Limpar armadura' }).click();
      await page.waitForFunction(() => document.querySelector('table[data-pw-aberturas-arm-lista] tbody tr')?.textContent?.includes('calculada'), null, { timeout: 90000 });
      // 7. isovalores: tensões e deslocamentos com legenda
      const iso = jp.locator('[data-pw-iso-svg] polygon');
      assert.ok(await iso.count() > 10);
      assert.match(await jp.locator('[data-pw-iso-leg]').first().innerText(), /mín\./);
      await jp.getByRole('radio', { name: 'deslocamentos' }).click();
      assert.ok(await iso.count() > 0);
      assert.match(await jp.locator('[data-pw-iso-leg]').first().innerText(), /mm/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // 8. memorial do edifício: armadura das paredes, resumo de aço e muros
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const textoMemo = await memo.textContent();
      assert.match(textoMemo, /Armadura das paredes, pilares-parede e muros de arrimo/);
      assert.match(textoMemo, /Armadura por pano/);
      assert.equal(await memo.locator('[data-memorial-paredes="panos"]').count(), 1);
      assert.match(textoMemo, /Paredes e pilares-parede/);
      assert.match(textoMemo, /Muros de arrimo: estabilidade/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 9. resumo de aço com as paredes
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      assert.match(await page.locator('[data-resumo-aco]').innerText(), /Paredes e pilares-parede/);
      // 10. pranchas de paredes e escala
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Armação de paredes e pilares-parede' });
      await page.locator('.prancha-prev[data-tipo="paredes"] svg').first().waitFor({ timeout: 90000 });
      assert.match(await page.locator('.prancha-prev[data-tipo="paredes"]').innerText(), /SCM/);
      assert.match(await page.locator('.prancha-prev[data-tipo="paredes"]').innerText(), /M1/);
      await page.locator('summary', { hasText: 'Opções de armação e locação' }).click();
      await page.getByLabel('Escala das elevações de paredes').selectOption({ label: '1:75' });
      await page.locator('.prancha-prev[data-tipo="paredes"][data-escala="75"]').waitFor({ timeout: 90000 });
    },
  };

export const f_E1e = {
    name: 'E1e: alvenaria estrutural (blocos e tipos no grupo, paredes de blocos, janela com panos, verga e modulação, quantitativo, cartão, memorial e biblioteca)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t });
      // 1. modelo enxuto: Térreo e Tipo 1 (como no E1d)
      await cmd('obra.definir {"profundidadeFundacao": 1}');
      await esperarModelo(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos, null);
      let b0 = await modelo();
      for (const nome of ['Cobertura', 'Tipo 3', 'Tipo 2']) {
        const p = b0.pavimentos.find((x) => x.nome === nome);
        const antes = b0.pavimentos.length;
        await cmd('pavimento.remover {"id": "' + p.id + '"}');
        await esperarModelo((n) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos?.length === n, antes - 1);
        b0 = await modelo();
      }
      const terreo = b0.pavimentos.find((p) => p.nome === 'Térreo'), tipo1 = b0.pavimentos.find((p) => p.nome === 'Tipo 1');
      // 2. grupo "Alvenaria estrutural": bloco e tipo de blocos pela interface
      const ga = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Alvenaria estrutural/ }) });
      await ga.evaluate((el) => { el.open = true; });
      const eb = ga.locator('[data-alv-editor-bloco]');
      await eb.getByLabel('Bloco: nome', { exact: true }).fill('B20');
      await eb.getByLabel(/^Bloco: comprimento/).fill('40');
      await eb.getByLabel(/^Bloco: largura/).fill('20');
      await eb.getByLabel(/^Bloco: altura/).fill('20');
      await eb.getByLabel(/^Bloco: fbk/).fill('8');
      await eb.getByRole('button', { name: 'Criar bloco', exact: true }).click();
      await ga.locator('table[data-alv-blocos] tbody tr').waitFor({ timeout: 20000 });
      assert.match(await ga.locator('table[data-alv-blocos]').innerText(), /40 × 20 × 20 cm/);
      assert.match(await ga.locator('table[data-alv-blocos]').innerText(), /automático \(não\)/);
      const et = ga.locator('[data-alv-editor-tipo]');
      await et.getByLabel('Tipo de alvenaria: nome', { exact: true }).fill('Blocos B20');
      await et.getByLabel(/^Tipo de alvenaria: peso específico/).fill('14');
      await et.getByRole('button', { name: 'Criar tipo de alvenaria', exact: true }).click();
      await ga.locator('table[data-alv-tipos] tbody tr').waitFor({ timeout: 20000 });
      const linhaTipo = await ga.locator('table[data-alv-tipos] tbody tr').first().innerText();
      assert.match(linhaTipo, /Blocos B20/);
      assert.match(linhaTipo, /2,24/); // fd = 0,7 · (0,8 · 8) / 2
      // edição do tipo: prisma informado de 10 MPa → fd = 3,50 MPa
      await ga.getByRole('button', { name: 'Editar tipo Blocos B20', exact: true }).click();
      await et.getByLabel(/^Tipo de alvenaria: prisma fpk/).fill('10');
      await et.getByRole('button', { name: 'Salvar tipo de alvenaria', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('table[data-alv-tipos] tbody tr')?.textContent?.includes('3,50'), null, { timeout: 20000 });
      // 3. duas paredes de blocos de 12 m com laje maciça e uma porta fora da modulação
      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposAlvenaria?.length ?? 0) > 0, null);
      const mat = (await modelo()).tiposAlvenaria[0].id;
      await cmd('laje.criar {"grupo": "' + tipo1.grupo + '", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "tipo": "blocos", "material": "' + mat + '", "morre": "' + tipo1.id + '"}');
      await cmd('parede.criar {"pontos": [[0, 6], [12, 6]], "espessura": 0.2, "tipo": "blocos", "material": "' + mat + '", "morre": "' + tipo1.id + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 2, null);
      const m1 = (await modelo()).paredes.find((w) => w.nome === 'M1').id;
      await cmd('parede.abertura {"parede": "' + m1 + '", "s": 5.07, "largura": 0.9, "altura": 2.1, "pavimento": "' + terreo.id + '"}');
      await esperarModelo((id) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.find((w) => w.id === id)?.aberturas?.length === 1, m1);
      // o tipo em uso não sai
      await ga.getByRole('button', { name: 'Remover tipo Blocos B20', exact: true }).click();
      assert.match(await ga.locator('[data-alv-msg]').innerText(), /Há paredes com este tipo de alvenaria/);
      // lista de paredes mostra o tipo
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Paredes \(/ }) });
      assert.match(await gp.locator('table[data-pw-lista]').innerText(), /Blocos \(Blocos B20\)/);
      // 4. cálculo e cartões
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await botaoCalcular(page).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 180000 });
      await livre();
      const cartao = page.locator('[data-pw-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /Blocos \(Blocos B20\)/);
      assert.match(await cartao.innerText(), /Cumprimento mín\./);
      const ca = page.locator('[data-alv-cartao]');
      await ca.waitFor({ timeout: 30000 });
      assert.ok(await ca.locator('table[data-alv-resumo-blocos] tbody tr').count() >= 1);
      assert.match(await ca.locator('table[data-alv-resumo-blocos]').innerText(), /B20/);
      // 5. janela de M1: panos, quantitativo, verga e modulação
      await cartao.getByRole('button', { name: 'Resultados de M1' }).click();
      const jp = page.getByRole('dialog', { name: /M1/ });
      await jp.waitFor();
      const raiz = jp.locator('[data-alv-parede]');
      assert.equal(await raiz.locator('table[data-alv-panos] tbody tr').count(), 3);
      assert.match(await raiz.locator('[data-alv-situacao]').innerText(), /Blocos B20.*não armada/);
      assert.match(await raiz.locator('table[data-alv-quant]').innerText(), /Total/);
      assert.equal(await raiz.locator('table[data-alv-vergas] tbody tr').count(), 1);
      assert.match(await raiz.locator('table[data-alv-vergas] tbody tr').first().innerText(), /porta[\s\S]*não/);
      assert.match(await raiz.innerText(), /Nenhum pilar em contato com esta parede/);
      await raiz.getByRole('button', { name: 'Ajustar aberturas à modulação', exact: true }).click();
      await page.waitForFunction(() => /sim/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      assert.match(await raiz.locator('table[data-alv-vergas] tbody tr').first().innerText(), /1,00 × 2,20 m/);
      // verga bloqueada e depois limpa
      await raiz.locator('table[data-alv-vergas] tbody tr').first().click();
      const ev = raiz.locator('[data-alv-editor-verga]');
      await ev.getByLabel(/^Verga: n/).fill('2');
      await ev.getByLabel(/^Verga: φ/).selectOption({ label: '12,5' });
      await raiz.getByRole('button', { name: 'Bloquear verga', exact: true }).click();
      await page.waitForFunction(() => /bloqueada/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      await raiz.getByRole('button', { name: 'Limpar verga', exact: true }).click();
      await page.waitForFunction(() => /calculada/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      assert.ok(await raiz.locator('ul[data-alv-mensagens], p.muted').count() >= 1);
      assert.ok(await jp.locator('[data-pw-iso-svg] polygon').count() > 10);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // 6. memorial do edifício
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const textoMemo = await memo.textContent();
      assert.match(textoMemo, /Alvenaria estrutural e blocos de concreto/);
      assert.match(textoMemo, /Verificação das tensões-limite por pano/);
      assert.equal(await memo.locator('[data-memorial-alvenaria="alv-panos"]').count(), 1);
      assert.equal(await memo.locator('[data-memorial-alvenaria="alv-blocos"]').count(), 1);
      assert.match(textoMemo, /Quantitativo de blocos por parede e pavimento/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7. biblioteca do usuário: gravar e trazer (nada novo na mesma obra)
      await ga.locator('details[data-alv-biblioteca] > summary').click();
      await ga.getByLabel('Nome na biblioteca de alvenaria', { exact: true }).fill('Minha alvenaria');
      await ga.getByLabel('Nome na biblioteca de alvenaria', { exact: true }).press('Enter'); // TextField confirma no Enter/blur
      await ga.getByRole('button', { name: 'Gravar alvenaria da obra', exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('select option')].some((o) => o.textContent?.includes('Minha alvenaria')), null, { timeout: 20000 });
      await ga.getByLabel(/^Alvenaria gravada/).selectOption({ index: 1 }); // índice 0 é “— escolha —”
      await ga.getByRole('button', { name: 'Trazer para a obra', exact: true }).click();
      assert.match(await ga.locator('[data-alv-msg-biblioteca]').innerText(), /Nada novo/);
    },
  };

export const f_E2a = {
    name: 'E2a: seção das vigas (T com mesa colaborante, chata, não estrutural e de amarração), detalhe com barras de canto da mesa e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
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
      await grupoEdif(page, 'Vínculos, flambagem e cobrimento');
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
      await page.getByRole('button', { name: 'Desfazer (Ctrl+Z)', exact: true }).click();
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
      await botaoCalcular(page).click();
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
  };

export const f_E2b = {
    name: 'E2b: viga curva (traçado por três pontos), poliviga, viga comum a dois grupos, ajuste a planos e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares?.length === 2, null);
      // 1. traçado pelo mouse: V, clique no início, R (trecho curvo), clique na passagem, clique no fim e Enter
      await page.locator('.planta-cv[data-vista]').waitFor();
      await reenquadrarAte(page, [[1, 0], [4, 2], [7, 0]]);
      await page.locator('#edcmd').blur(); // o foco sai da linha de comando: as teclas V e R vão para a planta
      await page.getByLabel('Polar 15° (F10)', { exact: true }).uncheck(); // sem polar, os cliques valem a grade de 0,5 m
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('v');
      let [sx, sy] = await telaDe(page, 1, 0);
      await page.mouse.click(sx, sy);
      await page.keyboard.press('r');
      [sx, sy] = await telaDe(page, 4, 2);
      await page.mouse.click(sx, sy);
      await page.locator('.statusbar .msg', { hasText: 'Passagem do arco marcada' }).waitFor();
      [sx, sy] = await telaDe(page, 7, 0);
      await page.mouse.click(sx, sy);
      await page.keyboard.press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 1, null);
      let v = (await modelo()).vigas[0];
      assert.equal(v.arcos.length, 1, 'trecho curvo registrado');
      assert.deepEqual(v.arcos[0], { ini: 0, fim: v.pontos.length - 1 });
      assert.ok(v.pontos.length >= 14, 'poligonal de cordas');
      // corda de 6 m e flecha de 2 m: R = 3,25 m, ângulo 134,8°, comprimento desenvolvido 7,64 m
      await page.keyboard.press('s');
      const gvigas = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vigas — / }) });
      if (!(await gvigas.evaluate((el) => el.open))) await gvigas.locator(':scope > summary').click();
      const gv = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: 'Vínculos, flambagem e cobrimento' }) });
      if (!(await gv.evaluate((el) => el.open))) await gv.locator(':scope > summary').click();
      const linha = async (i) => { await gvigas.locator('table.quadro tbody tr').nth(i).locator('td').nth(3).click(); const e = page.locator('[data-viga-curva-comum]'); await e.waitFor(); return e; };
      let ed = await linha(0);
      await ed.locator('[data-viga-curva]').waitFor();
      assert.match(await ed.locator('[data-viga-curva]').innerText(), /R = 3,25 m, 134,8°, \d+ cordas de até (49|50) cm\. Comprimento desenvolvido 7,64 m\./);
      // 2. a corda máxima da opção refaz a discretização (mesmo círculo) e desfazer devolve
      const n0 = v.pontos.length;
      await cmd('opcoes.definir {"valores": {"curvaSegmento": 20}}');
      await esperar((n) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas[0].pontos.length > n, n0);
      v = (await modelo()).vigas[0];
      assert.deepEqual(v.arcos[0], { ini: 0, fim: v.pontos.length - 1 });
      ed = await linha(0);
      assert.match(await ed.locator('[data-viga-curva]').innerText(), /R = 3,25 m, 134,8°.*cordas de até (19|20) cm/);
      // 3. poliviga: reta + curva + reta, decompor em três vigas pelo editor e compor de novo pelo comando
      await cmd('viga.tracar {"grupo": "g_3", "pontos": [[0, 6], [4, 6], [8, 10], [8, 14]], "passagens": [null, [7.2, 6.8], null], "secao": {"b": 0.2, "h": 0.5}, "nome": "PV"}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 2, null);
      ed = await linha(1);
      await ed.getByRole('button', { name: 'Decompor a viga (trechos retos e curvos)', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 4, null);
      const partes = (await modelo()).vigas.filter((x) => x.nome !== 'V1');
      assert.deepEqual(partes.map((x) => x.arcos?.length ?? 0), [0, 1, 0]);
      await cmd(`viga.compor {"ids": ${JSON.stringify(partes.map((x) => x.id))}}`);
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.length === 2, null);
      assert.equal((await modelo()).vigas.find((x) => x.nome !== 'V1').arcos.length, 1);
      // 4. viga comum: o grupo associado (Rampa) é criado, a viga PV vira comum e a associada aparece no outro grupo
      await cmd('grupo.criar {"nome": "Rampa"}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.grupos?.some((g) => g.nome === 'Rampa'), null);
      const rampa = (await modelo()).grupos.find((g) => g.nome === 'Rampa').id;
      await cmd(`pavimento.criar {"nome": "Rampa 1", "cota": 1.5, "grupo": "${rampa}"}`);
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos?.some((p) => p.nome === 'Rampa 1'), null);
      await page.getByLabel('Pavimento da planta', { exact: true }).selectOption({ label: 'Tipo 1 (3,00)' }); // o pavimento novo vira o atual: volta ao Tipo
      ed = await linha(1);
      await ed.getByLabel(/^Grupo associado/).selectOption({ label: 'Rampa' });
      await ed.getByRole('button', { name: 'Tornar comum a dois grupos', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((x) => x.comumDe), null);
      let m = await modelo();
      const origem = m.vigas.find((x) => x.comum), assoc = m.vigas.find((x) => x.comumDe);
      assert.equal(origem.nome, 'PV');
      assert.equal(assoc.grupo, rampa);
      assert.deepEqual(assoc.pontos, origem.pontos);
      assert.deepEqual(assoc.arcos, origem.arcos);
      assert.match(await page.locator('[data-viga-comum]').innerText(), /Comum ao grupo Rampa: uma barra só no pórtico/);
      // a associada pelo atalho da paleta (Ctrl+K), com o botão para abrir o grupo de origem
      await page.keyboard.press('Control+k');
      await page.getByRole('dialog').getByRole('textbox').fill(assoc.nome + ' Rampa');
      await page.keyboard.press('Enter');
      await page.locator('[data-viga-comum]', { hasText: 'Viga associada de PV (Tipo)' }).waitFor();
      await page.getByRole('button', { name: 'Abrir o grupo de origem', exact: true }).click();
      await page.locator('[data-viga-comum]', { hasText: 'Comum ao grupo Rampa' }).waitFor();
      // 5. memorial com o quadro das vigas curvas e das comuns
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const qc = memo.locator('[data-memorial-vigas-curvas]');
      await qc.waitFor();
      assert.match(await qc.innerText(), /V1[\s\S]*3,25[\s\S]*134,8[\s\S]*7,64/);
      assert.match(await qc.innerText(), /poligonal de cordas de até 20 cm/);
      const qm = memo.locator('[data-memorial-vigas-comuns]');
      assert.match(await qm.innerText(), /PV[\s\S]*Tipo[\s\S]*Rampa/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      // 6. desfazer a viga comum pelo editor: voltam as duas vigas independentes
      await page.getByRole('button', { name: 'Desfazer a viga comum', exact: true }).click();
      await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((x) => x.comum || x.comumDe), null);
      assert.equal((await modelo()).vigas.length, 3);
      // 7. ajuste a planos inclinados: cumeeira em x = 5 (z = 0,3·x e z = 3 − 0,3·x)
      await cmd(`viga.tracar {"grupo": "g_3", "pontos": [[4.8, 0], [5.3, 4], [5.1, 9]], "secao": {"b": 0.2, "h": 0.4}, "nome": "CM"}`);
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((x) => x.nome === 'CM'), null);
      await page.keyboard.press('Escape');
      ed = await linha(2);
      const campo = async (rot, valor) => { const c = ed.getByLabel(rot); await c.fill(String(valor)); await c.press('Enter'); };
      await campo(/^Plano 1, inclinação a/, 0.3);
      await campo(/^Plano 2, inclinação a/, -0.3);
      await campo(/^Plano 2, cota c/, 3);
      await ed.getByRole('button', { name: 'Ajustar a viga aos planos', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.find((x) => x.nome === 'CM')?.pontos.every((p) => Math.abs(p[0] - 5) < 1e-4), null);
    },
  };

// E5i: saídas de paredes e alvenaria — relatório de paredes e muros, listagem geral com paredes, planta de blocos nas pranchas.
export const f_E5i = {
  name: 'E5i: saídas de paredes (relatório de esforços e armaduras, listagem geral com paredes e planta de blocos nas pranchas)',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
    const esperarModelo = (fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t });
    await cmd('obra.definir {"profundidadeFundacao": 1}');
    await esperarModelo(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos, null);
    let b0 = await modelo();
    for (const nome of ['Cobertura', 'Tipo 3', 'Tipo 2']) {
      const p = b0.pavimentos.find((x) => x.nome === nome);
      const antes = b0.pavimentos.length;
      await cmd('pavimento.remover {"id": "' + p.id + '"}');
      await esperarModelo((n) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pavimentos?.length === n, antes - 1);
      b0 = await modelo();
    }
    const tipo1 = b0.pavimentos.find((p) => p.nome === 'Tipo 1');
    await cmd('bloco.tipo {"nome": "B20", "comprimento": 0.4, "largura": 0.2, "altura": 0.2, "fbk": 8}');
    await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.blocos?.length ?? 0) > 0, null);
    const bloco = (await modelo()).blocos[0].id;
    await cmd('alvenaria.tipo {"nome": "Blocos B20", "modelo": "blocos", "bloco": "' + bloco + '", "gama": 14}');
    await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposAlvenaria?.length ?? 0) > 0, null);
    const mat = (await modelo()).tiposAlvenaria[0].id;
    await cmd('laje.criar {"grupo": "' + tipo1.grupo + '", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
    await cmd('parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "tipo": "blocos", "material": "' + mat + '", "morre": "' + tipo1.id + '"}');
    await cmd('parede.criar {"pontos": [[0, 6], [12, 6]], "espessura": 0.2, "tipo": "blocos", "material": "' + mat + '", "morre": "' + tipo1.id + '"}');
    await cmd('parede.criar {"pontos": [[0, 3], [12, 3]], "espessura": 0.2, "morre": "' + tipo1.id + '"}');
    await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 3, null);
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
    await botaoCalcular(page).click();
    await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 180000 });
    // relatório de paredes e muros (CSV e HTML) e listagem geral com as paredes
    const dc = await downloadText(page, () => page.locator('[data-relatorio="paredes-csv"]').click());
    assert.equal(dc.name, 'relatorio-paredes.csv');
    for (const t of ['Esforços resultantes por lado', 'Cargas na base', 'Armadura por pano e verificação de cortante', 'M3']) assert.ok(dc.text.includes(t), `o CSV traz "${t}"`);
    const dh = await downloadText(page, () => page.locator('[data-relatorio="paredes-html"]').click());
    assert.match(dh.text, /Relatório de esforços e armaduras de pilares-parede, paredes e muros/);
    const dl = await downloadText(page, () => page.locator('[data-relatorio="listagem"]').click());
    assert.ok(dl.text.includes('Parede / pilar-parede'), 'a listagem traz as paredes');
    for (const t of ['M1;parede;blocos de concreto (Blocos B20)', 'M3;parede;concreto']) assert.ok(dl.text.includes(t), `a listagem traz "${t}"`);
    // memorial: listagem geral com a tabela das paredes
    await page.getByRole('button', { name: 'Memorial do edifício' }).click();
    const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
    await memo.locator('[data-listagem-paredes]').waitFor({ timeout: 30000 });
    assert.equal(await memo.locator('[data-listagem-paredes] tbody tr').count(), 3);
    await memo.getByRole('button', { name: 'Fechar' }).click();
    // pranchas de paredes: planta de blocos do lance (a de concreto vem antes; a de alvenaria é a última do tipo)
    await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
    await page.getByLabel('Tipo de prancha').selectOption({ label: 'Armação de paredes e pilares-parede' });
    const prev = page.locator('.prancha-prev[data-tipo="paredes"]');
    await prev.locator('svg').first().waitFor({ timeout: 90000 });
    assert.match(await prev.innerText(), /ARMAÇÃO DAS PAREDES/);
    // a planta de blocos é a última folha do tipo (a lista de folhas traz o título)
    const lista = page.locator('table[data-lista-folhas]');
    assert.match(await lista.innerText(), /Alvenaria — planta de blocos · Tipo 1/);
    await lista.locator('tr', { hasText: 'Alvenaria — planta de blocos · Tipo 1' }).click();
    await page.locator('.prancha-prev[data-tipo="paredes"] svg').first().waitFor({ timeout: 90000 });
    const txt = await prev.innerText();
    assert.match(txt, /ALVENARIA ESTRUTURAL — ESQUEMA DOS BLOCOS E DAS ARMADURAS \(TIPO 1\)/);
    assert.match(txt, /BLOCOS — TIPO 1/);
    assert.match(txt, /B20/);
  },
};
