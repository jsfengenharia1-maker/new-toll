// Fluxos de interface — FU (parte 2/2).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fecharCfg, grupoEdif, tab, telaDe, reenquadrarAte } from './helpers.mjs';

export const f_FU8 = {
    name: 'FU8: cintas da sapata corrida de aba única (lançadas no editor, alavanca, alívio no elemento interno, janela e pranchas), radier sem carga (definir e seguir) e ligação com o módulo Fundações (sondagens nos dois sentidos, abrir no Edifício)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('250');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      // sapatas centradas sob P1 (0; 0) e P2 (7; 0)
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata) lançado sob P1' }).waitFor();
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P2' }).waitFor();
      // sapata corrida de aba à esquerda (+y) sob uma parede a 3,5 m das sapatas, carga linear G = 200 kN/m
      await cmd('carga.linha {"grupo": "fundacao", "pontos": [[0, -3.5], [7, -3.5]], "valor": 200, "caso": "G"}');
      await cmd('corrida.criar {"pontos": [[0, -3.5], [7, -3.5]], "bw": 0.2, "aba": "esq"}');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC1 lançada .*sob parede/ }).waitFor();
      const tab = grupo.locator('table[data-corridas-tabela] tbody tr');
      await tab.first().click();
      const ed = grupo.locator('[data-editor-corrida]');
      await ed.waitFor();
      // cintas pelo editor: a primeira nasce no meio e vai para S1; a segunda vai para S2
      const cintas = ed.locator('[data-cintas]');
      await cintas.getByRole('button', { name: 'Adicionar cinta' }).click();
      await page.locator('.statusbar .msg', { hasText: /Cinta CT1 lançada na sapata corrida SC1/ }).waitFor();
      const linha = (n) => cintas.locator('[data-cinta-id]').nth(n);
      const campoS = (n) => linha(n).locator('label.field', { has: page.locator('.flabel', { hasText: /^s \(0 a/ }) }).locator('input');
      await campoS(0).fill('0');
      await campoS(0).press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Cinta CT1 alterada/ }).waitFor();
      await cintas.getByRole('button', { name: 'Adicionar cinta' }).click();
      await page.locator('.statusbar .msg', { hasText: /Cinta CT2 lançada/ }).waitFor();
      await campoS(1).fill('7');
      await campoS(1).press('Enter');
      await linha(1).locator('select').selectOption({ label: 'S2' });
      await page.locator('.statusbar .msg', { hasText: /Cinta CT2 alterada/ }).waitFor();
      assert.equal(await cintas.locator('[data-cinta-id]').count(), 2);
      // calcular: cintas na janela da sapata corrida, com alavanca e alívio
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const card = page.locator('[data-card-corridas]');
      await card.waitFor();
      await card.locator('tbody tr', { hasText: 'SC1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Sapata corrida SC1/ });
      await jan.waitFor();
      const txt = await jan.innerText();
      assert.match(txt, /Cinta CT1/);
      assert.match(txt, /Cinta CT2/);
      assert.match(txt, /alívio ΔN \d+,\d kN em S1/);
      assert.match(txt, /alívio ΔN \d+,\d kN em S2/);
      assert.doesNotMatch(txt, /FUND_CORRIDA_EXC/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // o elemento interno recebe o alívio (janela da sapata S1)
      const cardF = page.locator('[data-card-fundacoes]');
      if (await cardF.count()) assert.match(await cardF.innerText(), /S1/);
      // pranchas: elevação longitudinal da corrida e cintas nas folhas das vigas de fundação
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao');
      await page.locator('[data-folha-item]', { hasText: /^.*Fundação — sapatas corridas(?! —)/ }).first().click();
      await page.waitForFunction(() => /ELEVAÇÃO LONGITUDINAL/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      const folhas = await page.locator('[data-lista-folhas]').innerText();
      assert.match(folhas, /Fundação — vigas de fundação/);

      // radier sem carga: define a carga na hora e segue o cálculo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await cmd('radier.criar {"contorno": [[10, 0], [14, 0], [14, 4], [10, 4]], "h": 0.3}');
      await page.locator('.statusbar .msg', { hasText: /Radier .* lançado/ }).waitFor();
      await grupo.locator('table[data-bases-elasticas] tbody tr').first().click();
      const semCarga = grupo.locator('[data-radier-sem-carga]');
      await semCarga.waitFor();
      await semCarga.getByRole('button', { name: 'Definir carga e seguir' }).click();
      await grupo.locator('[data-radier-sem-carga]').waitFor({ state: 'detached' });
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });

      // ligação com o módulo Fundações: sondagens nos dois sentidos e atalho para o Edifício
      await cmd('sondagem.criar {"nome": "SP-E1", "x": 1, "y": 1, "nivelAgua": 6, "leituras": [{"N": 5, "solo": "areia"}, {"N": 8, "solo": "areia"}, {"N": 12, "solo": "areia"}, {"N": 18, "solo": "areia"}]}');
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Fundações', exact: true }).click();
      const lig = page.locator('[data-ligacao-edificio]');
      await lig.waitFor();
      assert.match(await lig.innerText(), /1 furo\(s\) de sondagem no edifício/);
      await lig.getByRole('button', { name: 'Copiar sondagens do edifício' }).click();
      await page.locator('.statusbar .msg', { hasText: /1 furo\(s\) de sondagem copiado\(s\) do edifício/ }).waitFor();
      assert.match(await lig.innerText(), /1 neste módulo/);
      await lig.getByRole('button', { name: 'Copiar sondagens para o edifício' }).click();
      await page.locator('.statusbar .msg', { hasText: /1 furo\(s\) de sondagem copiado\(s\) do módulo Fundações \(substituíram os do edifício\)/ }).waitFor();
      assert.match(await lig.innerText(), /1 furo\(s\) de sondagem no edifício/);
      await lig.getByRole('button', { name: /Abrir no Edifício/ }).click();
      await page.locator('.planta-cv').waitFor();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
    },
  };

export const f_FU7b = {
    name: 'FU7b: sapata corrida de paredes e muros (base da parede criada no lançamento, cargas das reações da base, momento e deslizamento do empuxo, editor da parede, opção de deslizamento, base do muro de arrimo na fundação, memorial e pranchas)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t });
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const calcular = async () => {
        await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
        await livre();
      };
      // 1. modelo enxuto: Térreo e Tipo 1, empuxo de terra, laje e duas paredes de 12 m com a base em sapata corrida (criadas no lançamento)
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
      await cmd('empuxo.tipo {"nome": "Aterro", "metodo": "repouso", "estratos": [{"espessura": 20, "gama": 18, "phi": 30}], "cotaAterro": 3}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.empuxos?.length > 0, null);
      const idEmp = (await modelo()).empuxos[0].id;
      await cmd('caso.criar {"nome": "Empuxo", "natureza": "H", "empuxo": "' + idEmp + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.casos?.some((c) => c.nome === 'Empuxo'), null);
      const idCaso = (await modelo()).casos.find((c) => c.nome === 'Empuxo').id;
      await cmd('laje.criar {"grupo": "' + tipo1.grupo + '", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('fundacao.terreno {"sigmaAdm": 200}');
      await cmd('parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "morre": "' + tipo1.id + '", "base": {"tipo": "sapataCorrida"}}');
      await cmd('parede.criar {"pontos": [[0, 6], [12, 6]], "espessura": 0.2, "morre": "' + tipo1.id + '", "base": {"tipo": "sapataCorrida"}}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 2, null);
      const ws = (await modelo()).paredes;
      const m1 = ws.find((w) => w.nome === 'M1').id, m2 = ws.find((w) => w.nome === 'M2').id;
      await cmd('parede.empuxo {"parede": "' + m1 + '", "empuxos": [{"caso": "' + idCaso + '", "lado": "dir"}]}');
      await cmd('parede.empuxo {"parede": "' + m2 + '", "empuxos": [{"caso": "' + idCaso + '", "lado": "esq"}]}');
      // a base da parede criou as duas sapatas no mesmo passo (vinculadas às paredes)
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.fundacao?.corridas?.length === 2, null);
      const cs = (await modelo()).fundacao.corridas;
      assert.deepEqual(cs.map((c) => c.nome).sort(), ['SC-M1', 'SC-M2']);
      // este fluxo confere a verificação de cada sapata isolada (o conjunto travado pela laje é testado em sapataParede.test.ts)
      await cmd('opcoes.definir {"valores": {"fundCorridaDeslizGrupo": 0}}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.opcoes?.fundCorridaDeslizGrupo === 0, null);
      assert.equal(cs.find((c) => c.nome === 'SC-M1').parede, m1);
      // 2. cálculo: as sapatas aparecem no cartão com "parede M1" e o deslizamento da base sob o empuxo reprova (FS < 1,5)
      await calcular();
      const card = page.locator('[data-card-corridas]');
      await card.waitFor({ timeout: 30000 });
      assert.match(await card.innerText(), /SC-M1[\s\S]*parede M1/);
      assert.match(await card.innerText(), /SC-M2[\s\S]*parede M2/);
      assert.ok(await page.locator('[data-lista-erros]').locator('.tablewrap tbody tr', { hasText: 'FUND_CORRIDA_DESLIZA' }).count() >= 1, 'deslizamento reprovado');
      // 3. editor da parede M1: base da parede, resultados com momento, cortante e deslizamento
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Paredes \(/ }) });
      if (!(await gp.evaluate((d) => d.open))) await gp.locator('summary').click();
      await gp.getByRole('button', { name: 'Selecionar M1' }).click();
      const base = page.locator('[data-pw-base-parede]');
      await base.waitFor({ timeout: 30000 });
      assert.equal(await base.getByLabel('Base da parede', { exact: true }).inputValue(), 'sapata');
      const txt = await base.innerText();
      assert.match(txt, /SC-M1: B \d+ × h \d+/);
      assert.match(txt, /Momento fora do plano/);
      assert.match(txt, /Cortante normal à parede/);
      assert.match(txt, /Deslizamento[\s\S]*FS 0,4/);
      assert.match(await gp.locator('table[data-pw-lista]').innerText(), /sapata corrida/);
      // atrito da sapata da parede: μ 0,9 (FS sobe, continua abaixo do mínimo); a mensagem do comando aparece na barra
      const atr = base.getByLabel('Atrito base-solo da sapata da parede (vazio = opção)', { exact: true });
      await atr.fill('0,9');
      await atr.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC-M1 da parede M1 alterada/ }).waitFor();
      await calcular();
      await gp.getByRole('button', { name: 'Selecionar M1' }).click();
      assert.match(await page.locator('[data-pw-base-parede]').innerText(), /Deslizamento[\s\S]*μ 0,9/);
      // 4. a opção "Reprovar o deslizamento (parede)" desligada: o erro some e o FS continua informado
      const gf = await grupoEdif(page, /^Fundação \(/);
      const par = gf.locator('details', { has: page.locator(':scope > summary', { hasText: 'Parâmetros das sapatas corridas' }) }).first();
      if (!(await par.evaluate((d) => d.open))) await par.locator(':scope > summary').click();
      await par.getByLabel('Reprovar o deslizamento (parede)', { exact: true }).uncheck();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.opcoes?.fundCorridaDeslizamento === 0, null);
      await calcular();
      assert.equal(await page.locator('[data-lista-erros]').locator('.tablewrap tbody tr', { hasText: 'FUND_CORRIDA_DESLIZA' }).count(), 0);
      // 5. janela da sapata da parede (duplo clique no cartão): dados da parede e deslizamento
      await card.locator('tbody tr', { hasText: 'SC-M1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Sapata corrida SC-M1/ });
      await jan.waitFor();
      const tj = await jan.innerText();
      assert.match(tj, /Parede[\s\S]*M1/);
      assert.match(tj, /Momento fora do plano/);
      assert.match(tj, /Deslizamento/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // 6. trocar a base da parede M2 para apoio direto pelo editor remove a sapata (e a de M1 fica)
      await fecharCfg(page);
      await gp.getByRole('button', { name: 'Selecionar M2' }).click();
      const base2 = page.locator('[data-pw-base-parede]');
      await base2.getByLabel('Base da parede', { exact: true }).selectOption('apoio');
      await page.locator('.statusbar .msg', { hasText: /Sapata da parede M2 removida/ }).waitFor();
      await base2.getByLabel('Aba da sapata da parede', { exact: true }).waitFor({ state: 'detached' });
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.fundacao?.corridas?.length === 1, null);
      assert.deepEqual((await modelo()).fundacao.corridas.map((c) => c.nome), ['SC-M1']);
      // 6b. lançamento pela planta com "Fundação da parede" = sapata corrida: a parede M3 já nasce com a sapata SC-M3
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await reenquadrarAte(page, [[0, 0], [12, 0], [12, 10], [0, 10]]);
      const lanc = gp.locator('[data-pw-lancar]');
      await lanc.getByLabel('Fundação da parede', { exact: true }).selectOption('sapata');
      await lanc.getByRole('button', { name: 'Traçar na planta' }).click();
      await page.mouse.click(...(await telaDe(page, 0, 10)));
      await page.mouse.click(...(await telaDe(page, 12, 10)));
      await page.keyboard.press('Enter');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 3, null);
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.fundacao?.corridas?.length === 2, null);
      assert.deepEqual((await modelo()).fundacao.corridas.map((c) => c.nome).sort(), ['SC-M1', 'SC-M3']);
      // 7. muro de arrimo isolado com comprimento: base na fundação com a σadm do terreno
      await cmd('muro.arrimo {"nome": "MA1", "H": 3, "tTopo": 0.2, "tBase": 0.3, "B": 2.6, "ponta": 0.5, "hBase": 0.4, "solo": {"gama": 18, "phi": 30, "metodo": "rankine"}, "sobrecarga": 10, "atrito": 0.6, "comprimento": 20}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.murosArrimo?.length === 1, null);
      await calcular();
      const gm = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Muros de arrimo/ }) });
      const tb = gm.locator('table[data-mu-base]');
      await tb.waitFor({ timeout: 30000 });
      const tt = await tb.innerText();
      assert.match(tt, /MA1/);
      assert.match(tt, /terreno \(informada\)/);
      assert.match(tt, /20,8/); // concreto da base: 2,6 × 0,4 × 20 m
      const cardM = page.locator('[data-card-bases-muros]');
      await cardM.waitFor();
      assert.match(await cardM.innerText(), /MA1[\s\S]*terreno \(informada\)/);
      await tb.getByRole('button', { name: 'Resultados da base de MA1' }).click();
      const jm = page.getByRole('dialog', { name: /Resultados do elemento — Base do muro MA1/ });
      await jm.waitFor();
      assert.match(await jm.innerText(), /Quantitativos totais/);
      assert.match(await jm.innerText(), /σ máx\. \/ σadm/);
      await jm.getByRole('button', { name: 'Fechar' }).click();
      // 8. memorial do edifício: sapatas de parede e bases dos muros
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const textoMemo = await memo.textContent();
      assert.match(textoMemo, /Sapatas de parede e de muro/);
      assert.equal(await memo.locator('[data-memorial-corridas-parede]').count(), 1);
      assert.match(textoMemo, /Bases dos muros de arrimo na fundação/);
      assert.equal(await memo.locator('[data-memorial-bases-muros]').count(), 1);
      assert.match(textoMemo, /Base de muro de arrimo/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 9. pranchas do tipo Fundação: sapata da parede (momento e deslizamento) e quantitativos com a base do muro
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao', null, { timeout: 90000 });
      await page.locator('[data-folha-item]', { hasText: /^.*Fundação — sapatas corridas(?! —)/ }).first().click();
      await page.waitForFunction(() => /Base da parede M1/.test(document.querySelector('.prancha-prev')?.textContent ?? ''), null, { timeout: 90000 });
      assert.match(await page.locator('.prancha-prev').innerText(), /deslizamento FS/);
      await page.locator('[data-folha-item]', { hasText: /quantitativos/i }).first().click();
      await page.waitForFunction(() => /Base de muro de arrimo/.test(document.querySelector('.prancha-prev')?.textContent ?? ''), null, { timeout: 90000 });
    },
  };
