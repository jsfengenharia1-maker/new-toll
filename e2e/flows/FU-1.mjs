// Fluxos de interface — FU (parte 1/2).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileMenu, faixaAba, faixaCtx, grupoEdif, tab, num, telaDe, reenquadrarAte, importarMascara } from './helpers.mjs';

export const f_FU1 = {
    name: 'FU1: fundação no edifício — divisa e centrada lançadas na planta, cálculo, janela do elemento, FUND_EXC_SEM_VIGA, σadm sem refazer a análise e aba Fundações em leitura',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      // arranque (nasce e morre na fundação): linha da tabela de pilares e opção "fundação (arranque)" do seletor "Morre"
      await cmd('pilar.inserir {"x": 3.5, "y": 2.5, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}, "nasce": "fundacao", "morre": "fundacao"}');
      await grupoEdif(page, 'Pilares (');
      const linhaArr = page.locator('tr', { has: page.locator('select[aria-label^="Morre"]') }).last();
      assert.match(await linhaArr.innerText(), /arranque/);
      assert.equal(await linhaArr.locator('select[aria-label^="Morre"] option[value="fundacao"]').count(), 1);

      // grupo Fundação: terreno (σadm informada) e planta do nível de fundação
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      // P1 (0;0): sapata de divisa, clicando na face −x do pilar; P2 (7;0): sapata centrada
      await grupo.getByLabel('Posição no pilar').selectOption('divisa');
      const [x1, y1] = await telaDe(page, -0.07, 0);
      await page.mouse.click(x1, y1);
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata) lançado sob P1' }).waitFor();
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      const [x2, y2] = await telaDe(page, 7, 0);
      await page.mouse.click(x2, y2);
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P2' }).waitFor();
      const linhas = grupo.locator('table[data-fundacoes] tbody tr');
      assert.equal(await linhas.count(), 2);
      assert.match(await linhas.first().innerText(), /de divisa/);
      assert.match(await linhas.nth(1).innerText(), /centrada/);
      // desfazer e refazer pelo histórico do edifício (um passo por lançamento)
      await page.keyboard.press('Control+z');
      await page.locator('.statusbar .msg', { hasText: 'Desfeito: fundacao.criar' }).waitFor();
      assert.equal(await linhas.count(), 1);
      await page.keyboard.press('Control+y');
      await page.locator('.statusbar .msg', { hasText: 'Refeito: fundacao.criar' }).waitFor();
      assert.equal(await linhas.count(), 2);

      // calcular o edifício (as fundações vão junto) e ver os erros: divisa sem viga de equilíbrio
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const lista = page.locator('[data-lista-erros]');
      await lista.getByLabel('Tipo').selectOption('fundacao');
      const erroDivisa = lista.locator('.tablewrap tbody tr', { hasText: 'FUND_EXC_SEM_VIGA' });
      assert.equal(await erroDivisa.count(), 1);
      assert.match(await erroDivisa.innerText(), /Fundação S1/);
      assert.equal(await lista.locator('.tablewrap tbody tr', { hasText: /Fundação S2/ }).count(), 0, 'a sapata centrada atende');
      const cardF = page.locator('[data-card-fundacoes]');
      assert.equal(await cardF.locator('tbody tr').count(), 2);
      // um clique leva à planta de fundação com o elemento selecionado; "Resultados do elemento" abre a janela
      await erroDivisa.click();
      await page.locator('.planta-barra').waitFor();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      await faixaCtx(page);
      assert.equal(await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('button', { name: 'Resultados do elemento' }).isEnabled(), true);
      await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('button', { name: 'Resultados do elemento' }).click();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S1/ });
      await jan.waitFor();
      const jt = await jan.innerText();
      assert.match(jt, /FUND_EXC_SEM_VIGA/);
      assert.match(jt, /de divisa/);
      assert.match(jt, /Excentricidade do pilar/);
      assert.match(jt, /FUND_SEM_SOLUCAO/, 'sapata de divisa sem viga de equilíbrio não tem solução');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // sapata centrada: janela pelo duplo clique na tabela do dimensionamento
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await cardF.locator('tbody tr', { hasText: 'S2' }).dblclick();
      const jan2 = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S2/ });
      await jan2.waitFor();
      assert.match(await jan2.innerText(), /σadm.*300/);
      assert.ok(await jan2.locator('.fsketch svg').count() >= 1, 'desenho da sapata do módulo Fundações');
      assert.match(await jan2.innerText(), /Dimensionamento da sapata|Armadura|Flexão/i);
      await jan2.getByRole('button', { name: 'Fechar' }).click();

      // muda σadm: as fundações ficam desatualizadas e a análise NÃO é refeita ao recalcular só as fundações
      const bloco = grupo.locator('[data-fundacao-calculo]');
      const idAntes = await bloco.getAttribute('data-fundacao-calculo');
      assert.ok(idAntes);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      // o arranque aparece na planta de fundação; selecionado, o grupo oferece as cargas no arranque
      await page.keyboard.press('s');
      const [x5, y5] = await telaDe(page, 3.5, 2.5);
      await page.mouse.click(x5, y5);
      await grupo.getByText('Cargas no arranque P5').waitFor();
      await sigma.fill('250');
      await sigma.press('Enter');
      await grupo.locator('[data-fundacao-velha]').waitFor();
      await grupo.getByRole('button', { name: 'Calcular fundações' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Fundações calculadas' }).waitFor({ timeout: 60000 });
      assert.match(await page.locator('.statusbar .msg').innerText(), /a análise da estrutura não foi refeita/);
      assert.equal(await bloco.getAttribute('data-fundacao-calculo'), idAntes, 'o cálculo da estrutura (worker) não mudou');
      assert.equal(await grupo.locator('[data-fundacao-velha]').count(), 0);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await cardF.locator('tbody tr', { hasText: 'S2' }).dblclick();
      const jan3 = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S2/ });
      await jan3.waitFor();
      assert.match(await jan3.innerText(), /σadm.*250/);
      await jan3.getByRole('button', { name: 'Fechar' }).click();

      // aba Fundações em leitura: aviso, elementos do edifício listados e controles desabilitados
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Fundações', exact: true }).click();
      const aviso = page.locator('[data-fundacoes-edificio]');
      await aviso.waitFor();
      assert.match(await aviso.innerText(), /modo leitura/);
      assert.equal(await aviso.locator('tbody tr').count(), 2);
      assert.equal(await page.locator('[data-somente-leitura]').evaluate((f) => f.disabled), true);
      assert.equal(await page.getByRole('button', { name: '+ furo' }).isDisabled(), true);
    },
  };

export const f_FU1_2 = {
    name: 'FU1: obra vazia só com arranques — arranque pela planta de fundação, cargas, sapata e cálculo só da fundação',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      await fileMenu(page, 'Novo vazio');
      assert.match(await page.locator('.statusbar .status').innerText(), /^0 pavimentos/);
      // ferramenta Pilar com "Arranque": a planta vai para o nível de fundação e o pilar nasce e morre na fundação
      await grupoEdif(page, 'Pilares (');
      await page.getByLabel('Arranque (pilar de altura zero, só leva cargas à fundação)').check();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('eixo.criar {"nome": "A", "p1": [0, 0], "p2": [6, 0]}');
      await page.locator('.planta-st').click();
      await page.keyboard.press('f');
      const [x1, y1] = await telaDe(page, 2, 0.6);
      await page.mouse.click(x1, y1);
      await page.locator('select[aria-label="Morre P1"]').waitFor();
      assert.match(await page.locator('tr', { has: page.locator('select[aria-label^="Morre"]') }).last().innerText(), /arranque/);
      // terreno, sapata automática (clique no centro do pilar = centrada) e cargas no arranque
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('250');
      await sigma.press('Enter');
      await page.keyboard.press('u');
      const [x2, y2] = await telaDe(page, 2, 0.6);
      await page.mouse.click(x2, y2);
      await page.locator('.statusbar .msg', { hasText: /S1 \(sapata\) lançado sob P1/ }).waitFor();
      assert.match(await grupo.locator('table[data-fundacoes] tbody tr').first().innerText(), /centrada/);
      await page.keyboard.press('s');
      await page.mouse.click(x2, y2);
      await grupo.getByText('Cargas no arranque P1').waitFor();
      await grupo.getByLabel('N (kN)').fill('400');
      await grupo.getByLabel('N (kN)').press('Enter');
      await grupo.getByRole('button', { name: 'Adicionar carga no lance' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Carga no pilar P1' }).waitFor();
      // sem estrutura para analisar, o cálculo traz só as fundações
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Obra só com arranques: 1 fundação' }).waitFor({ timeout: 60000 });
      const cardF = page.locator('[data-card-fundacoes]');
      assert.equal(await cardF.locator('tbody tr').count(), 1);
      assert.match(await cardF.innerText(), /S1: \d,\d\d × \d,\d\d m/);
      // as duas formas de calcular: sem fundação e com fundação
      await page.getByRole('button', { name: 'Calcular sem fundação' }).click();
      await page.locator('.statusbar .msg', { hasText: /Análise|Obra só/ }).waitFor();
    },
  };

export const f_FU2 = {
    name: 'FU2: sapata de divisa + viga de equilíbrio até um pilar interno — lançada pela planta, cálculo, FUND_EXC_SEM_VIGA some, janela da viga, giro por 2 pontos e cargas do nível',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      // P1 (0;0): sapata de divisa pela face −x; P2 (7;0): sapata centrada
      await grupo.getByLabel('Posição no pilar').selectOption('divisa');
      const [x1, y1] = await telaDe(page, -0.07, 0);
      await page.mouse.click(x1, y1);
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata) lançado sob P1' }).waitFor();
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      const [x2, y2] = await telaDe(page, 7, 0);
      await page.mouse.click(x2, y2);
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P2' }).waitFor();
      // as ferramentas de viga de fundação e de giro só existem no nível de fundação
      assert.equal(await page.getByRole('radio', { name: 'Viga de fundação' }).count(), 1);
      // viga de equilíbrio: clique em S1 e depois em S2 (ferramenta Viga de fundação, tecla B)
      await page.locator('.planta-st').click();
      await page.keyboard.press('b');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'vigaFund');
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: 'VF1 (equilíbrio) lançada' }).waitFor();
      const tabV = grupo.locator('table[data-vigas-fundacao-tabela] tbody tr');
      assert.equal(await tabV.count(), 1);
      assert.match(await tabV.first().innerText(), /VF1.*equilíbrio.*S1 — S2/s);
      // um segundo clique igual duplica: a viga entre os mesmos pilares é recusada
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: /Já existe a viga VF1/ }).waitFor();
      assert.equal(await tabV.count(), 1);
      // selecionada na planta (clique no meio da viga): editor com tipo, pontas equilibradas, seção e igualar
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 3.5, 0)));
      const ed = grupo.locator('[data-editor-viga-fundacao]');
      await ed.waitFor();
      assert.equal(await ed.getByLabel('Pontas equilibradas').inputValue(), 'auto');
      assert.equal(await ed.getByRole('button', { name: 'Igualar esta ao modelo' }).isDisabled(), true, 'sem outra viga para igualar');

      // calcular: a divisa passa a ter viga de equilíbrio
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const lista = page.locator('[data-lista-erros]');
      await lista.getByLabel('Tipo').selectOption('fundacao');
      assert.equal(await lista.locator('.tablewrap tbody tr', { hasText: 'FUND_EXC_SEM_VIGA' }).count(), 0, 'o erro FUND_EXC_SEM_VIGA some com a viga de equilíbrio');
      const cardV = page.locator('[data-card-vigas-fundacao]');
      await cardV.waitFor();
      assert.equal(await cardV.locator('tbody tr').count(), 1);
      assert.match(await cardV.innerText(), /VF1.*equilíbrio.*S1 — S2/s);
      // janela da viga pelo duplo clique: ações, detalhe longitudinal e transversal
      await cardV.locator('tbody tr', { hasText: 'VF1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga de fundação VF1/ });
      await jan.waitFor();
      const jt = await jan.innerText();
      assert.match(jt, /Alívio levado a cada ponta/);
      assert.match(jt, /Armadura superior/);
      assert.match(jt, /Estribo/);
      assert.equal(await jan.locator('svg[data-detalhe-vf]').count(), 1, 'detalhe longitudinal');
      assert.equal(await jan.locator('svg[data-secao-vf]').count(), 1, 'seção transversal');
      assert.ok(await jan.locator('[data-diagrama-vf]').count() >= 3, 'diagramas de momento e cortante');
      assert.ok(await jan.locator('[data-ponta-vf]').count() === 2, 'pilares das pontas');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // janela do elemento equilibrado: alavanca e alívio
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const cardF = page.locator('[data-card-fundacoes]');
      await cardF.locator('tbody tr', { hasText: 'S1' }).dblclick();
      const jan1 = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S1/ });
      await jan1.waitFor();
      assert.match(await jan1.innerText(), /Alavanca: carga do pilar/);
      await jan1.getByRole('button', { name: 'Fechar' }).click();
      await cardF.locator('tbody tr', { hasText: 'S2' }).dblclick();
      const jan2 = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S2/ });
      await jan2.waitFor();
      assert.match(await jan2.innerText(), /Alívio recebido de vigas de equilíbrio/);
      await jan2.getByRole('button', { name: 'Fechar' }).click();

      // planta: a viga aparece selecionável e abre a janela pelo duplo clique
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('s');
      const [mx, my] = await telaDe(page, 3.5, 0);
      await page.mouse.dblclick(mx, my);
      await page.getByRole('dialog', { name: /Viga de fundação VF1/ }).waitFor();
      await page.getByRole('dialog', { name: /Viga de fundação VF1/ }).getByRole('button', { name: 'Fechar' }).click();

      // giro por dois pontos: S2 selecionada gira para a direção de (2;1) a (2;3) = 90°
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 7.3, 0.3)));
      await page.keyboard.press('k');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'girarFund');
      await page.mouse.click(...(await telaDe(page, 2, 1)));
      await page.mouse.click(...(await telaDe(page, 2, 3)));
      await page.locator('.statusbar .msg', { hasText: /girado/ }).waitFor();
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'selecionar');

      // cargas no nível de fundação: parede sobre a viga (linha, grupo "fundação")
      await grupo.locator('[data-cargas-fundacao]').getByLabel('Tipo').selectOption('linha');
      await page.locator('.planta-st').click();
      await page.keyboard.press('c');
      await page.mouse.click(...(await telaDe(page, 2, 0)));
      await page.mouse.click(...(await telaDe(page, 5, 0)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Carga linear de/ }).waitFor();
      assert.match(await grupo.locator('[data-cargas-fundacao]').innerText(), /Cargas no nível de fundação \(1\)/);
    },
  };

export const f_FU4 = {
    name: 'FU4: Gerar fundações — diálogo, 4 sapatas de canto com as vigas de equilíbrio num passo só, cálculo sem FUND_EXC_SEM_VIGA e um desfazer',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      // diálogo de parâmetros com os valores das opções (D = 3 m, A = 30°, associação a 1 m)
      await grupo.locator('[data-gerar-fundacoes]').click();
      const dlg = page.getByRole('dialog', { name: 'Gerar fundações' });
      await dlg.waitFor();
      assert.equal(await dlg.getByLabel('Distância de visão D').inputValue(), '3');
      assert.equal(await dlg.getByLabel('Ângulo de visão A').inputValue(), '30');
      assert.match(await dlg.innerText(), /Sem análise em vigor/);
      await dlg.locator('[data-gerar-confirmar]').click();
      await page.locator('.statusbar .msg', { hasText: /Fundações geradas: 4 sapatas \(4 de canto\); vigas: 4 de equilíbrio/ }).waitFor();
      assert.equal(await grupo.locator('table[data-fundacoes] tbody tr').count(), 4);
      assert.equal(await grupo.locator('table[data-vigas-fundacao-tabela] tbody tr').count(), 4);
      // sem elemento a gerar, o botão fica desligado
      assert.equal(await grupo.locator('[data-gerar-fundacoes]').isDisabled(), true);
      // calcular: nenhum elemento fica excêntrico sem viga
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const lista = page.locator('[data-lista-erros]');
      await lista.getByLabel('Tipo').selectOption('fundacao');
      assert.equal(await lista.locator('.tablewrap tbody tr', { hasText: 'FUND_EXC_SEM_VIGA' }).count(), 0);
      assert.equal(await page.locator('[data-card-vigas-fundacao] tbody tr').count(), 4);
      // um desfazer remove elementos e vigas
      await page.getByRole('button', { name: 'Desfazer (Ctrl+Z)', exact: true }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      assert.match(await grupo.locator('summary').first().innerText(), /Fundação \(0 elementos\)/i);
    },
  };

export const f_FU3 = {
    name: 'FU3: sapata associada de 2 pilares pela planta, limite que apara, altura constante, igualar, impor as calculadas e eliminar sobreposição',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      // P1 (0;0) e P2 (3;0) formam a associada; P3 (7;0) e P4 (8;0), a 1 m um do outro, se sobrepõem; P5 e P6 fecham o pórtico
      await cmd('lote {"comandos": [' + [[0, 0], [3, 0], [7, 0], [8, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('120');
      await sigma.press('Enter');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      await grupo.getByLabel('Posição no pilar').selectOption('centrada');
      // as ferramentas novas só existem no nível de fundação
      for (const n of ['Limite da fundação', 'Limite pela máscara', 'Ponto de inserção']) assert.equal(await page.getByRole('radio', { name: n }).count(), 1, n);

      // associada: ferramenta Fundação em modo "vários pilares" (clique em cada pilar, Enter cria)
      await page.getByLabel('Vários pilares (Enter cria)').check();
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 3, 0)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'S1 (sapata, 2 pilares) lançado sob P1, P2' }).waitFor();
      await page.getByLabel('Vários pilares (Enter cria)').uncheck();
      // sapatas isoladas de P3 e P4
      await page.mouse.click(...(await telaDe(page, 7, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S2 (sapata) lançado sob P3' }).waitFor();
      await page.mouse.click(...(await telaDe(page, 8, 0)));
      await page.locator('.statusbar .msg', { hasText: 'S3 (sapata) lançado sob P4' }).waitFor();
      const linhas = grupo.locator('table[data-fundacoes] tbody tr');
      assert.equal(await linhas.count(), 3);

      // limite: divisa vertical a 15 cm do eixo de P1 (com o modelo integrado a resultante P1 + P2 fica mais perto de P2 e a sapata, mais curta à esquerda), à esquerda dele (tecla T)
      await page.locator('.planta-st').click();
      await page.keyboard.press('t');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'limite');
      await page.mouse.click(...(await telaDe(page, -0.15, 0.9)));
      await page.mouse.click(...(await telaDe(page, -0.15, -0.2)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'Limite L1 criado (2 vértices)' }).waitFor();
      const tabL = grupo.locator('table[data-limites-tabela] tbody tr');
      assert.equal(await tabL.count(), 1);
      assert.match(await tabL.first().innerText(), /L1.*2.*aberto/s);
      // o limite selecionado abre o editor de vértices
      await tabL.first().click();
      const edL = grupo.locator('[data-editor-limite]');
      await edL.waitFor();
      assert.equal(await edL.locator('table[data-vertices-limite] tbody tr').count(), 2);

      // altura constante na associada (só ela é aparada por limites) pelo editor do elemento
      await linhas.first().click();
      const ed = grupo.locator('[data-editor-fundacao]');
      await ed.waitFor();
      assert.match(await ed.locator('h4').innerText(), /sob 2 pilares \(P1, P2\)/i);
      await ed.getByLabel('Altura constante (h0 = h; só ela é aparada por limites)').check();
      assert.equal(await ed.getByLabel('Altura constante (h0 = h; só ela é aparada por limites)').isChecked(), true);

      // calcular o edifício (as fundações vão junto)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const cardF = page.locator('[data-card-fundacoes]');
      await cardF.waitFor();
      assert.equal(await cardF.locator('tbody tr').count(), 3);
      // janela da associada: pilares, limite que apara, quadro por pilar e croqui com o contorno
      await cardF.locator('tbody tr', { hasText: 'S1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Fundação S1/ });
      await jan.waitFor();
      const jt = await jan.innerText();
      assert.match(jt, /Pilares do elemento.*P1.*P2/s);
      assert.match(jt, /Ponto de referência \(resultante\)/);
      assert.match(jt, /Limites que aparam o elemento\s*L1/);
      assert.match(jt, /altura constante/);
      assert.ok(await jan.locator('[data-grupo-sapata]').count() === 1, 'quadro da sapata de vários pilares');
      assert.ok(await jan.locator('.fsketch svg polygon').count() >= 2, 'contorno poligonal no croqui');
      assert.ok(await jan.locator('[data-malha-superior]').count() >= 1, 'negativo entre pilares / malha superior nas duas direções');
      await jan.getByRole('button', { name: 'Fechar' }).click();

      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();

      // impor as calculadas em S2 (sapata isolada): fica só verificada
      await linhas.nth(1).click();
      await ed.waitFor();
      const imp = grupo.locator('[data-impostas-fundacao]');
      await imp.waitFor();
      await imp.getByRole('button', { name: 'Impor as calculadas' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Dimensões impostas em 1 elemento' }).waitFor();
      await grupo.locator('[data-impostas-fundacao] .pill', { hasText: 'só verificadas' }).waitFor();
      await imp.getByRole('button', { name: 'Remover a imposição' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Dimensões impostas removidas' }).waitFor();

      // igualar S3 (pilar P4) a S2 (pilar P3)
      await linhas.nth(2).click();
      await ed.waitFor();
      await ed.getByLabel('Igualar a').selectOption({ label: 'S2 (Sapata)' });
      await ed.getByRole('button', { name: 'Igualar este ao modelo' }).click();
      await page.locator('.statusbar .msg', { hasText: 'igualado(s) a S2' }).waitFor();
      await grupo.locator('[data-igualado-a]').waitFor();

      // recalcular só as fundações: S2 e S3 se sobrepõem (1 m entre os pilares) e o aviso oferece unir
      await grupo.getByRole('button', { name: 'Calcular fundações' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Fundações calculadas' }).waitFor({ timeout: 60000 });
      const sob = grupo.locator('[data-sobreposicao]');
      await sob.waitFor();
      assert.match(await sob.innerText(), /FUND_SOBREPOSTA.*S2 \+ S3|FUND_SOBREPOSTA.*S3 \+ S2/s);
      // a revisão mostra o aviso e a ação de unir
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const lista = page.locator('[data-lista-erros]');
      await lista.getByLabel('Tipo').selectOption('fundacao');
      assert.ok(await lista.locator('.tablewrap tbody tr', { hasText: 'FUND_SOBREPOSTA' }).count() >= 1);
      assert.ok(await lista.locator('[data-acao-unir]').count() >= 1, 'botão que une as sapatas sobrepostas');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await sob.getByRole('button', { name: /Eliminar sobreposições/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'sobreposição(ões) eliminada(s)' }).waitFor();
      assert.equal(await linhas.count(), 2, 'S2 e S3 viraram uma só (associada)');
      assert.match(await linhas.nth(1).innerText(), /S2/);
      await linhas.nth(1).click();
      assert.match(await ed.locator('h4').innerText(), /sob 2 pilares \(P3, P4\)/i);
      // desfazer a união é um passo só
      await page.keyboard.press('Control+z');
      await page.locator('.statusbar .msg', { hasText: 'Desfeito: fundacao.eliminarSobreposicoes' }).waitFor();
      assert.equal(await linhas.count(), 3);
    },
  };

export const f_FU3_2 = {
    name: 'FU3: limite capturado da máscara DXF — a polilinha ligada ao clique vira um limite fechado e o editor de vértices o altera',
    async run({ newPage, tmp }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      // o nível de fundação mostra a máscara do grupo do pavimento mais baixo (Térreo)
      const sel = page.getByLabel('Pavimento da planta');
      await sel.selectOption(await sel.locator('option', { hasText: 'Térreo' }).first().getAttribute('value'));
      await importarMascara(page, tmp);
      await page.getByRole('radio', { name: 'Fundação' }).click();
      assert.equal(await page.locator('.planta-cv').getAttribute('data-nivel'), 'fundacao');
      await page.locator('.planta-cv[data-vista]').waitFor();
      await page.locator('.planta-st').click();
      await page.keyboard.press('q');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'limiteMascara');
      // parede externa (retângulo 15 × 10 m): clique no meio do lado inferior
      await page.mouse.click(...(await telaDe(page, 7.5, 0)));
      await page.locator('.statusbar .msg', { hasText: 'Limite L1 criado (4 vértices)' }).waitFor();
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const linha = grupo.locator('table[data-limites-tabela] tbody tr');
      assert.equal(await linha.count(), 1);
      assert.match(await linha.first().innerText(), /L1\s+4\s+fechado/);
      // seleção na planta (clique na linha do limite) abre o editor; remover um vértice deixa 3 (mínimo de um limite fechado)
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 7.5, 0)));
      const ed = grupo.locator('[data-editor-limite]');
      await ed.waitFor();
      assert.equal(await ed.locator('table[data-vertices-limite] tbody tr').count(), 4);
      await ed.getByRole('button', { name: 'Remover vértice 4' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Limite L1 alterado' }).waitFor();
      assert.equal(await ed.locator('table[data-vertices-limite] tbody tr').count(), 3);
      assert.equal(await ed.getByRole('button', { name: 'Remover vértice 1' }).isDisabled(), true);
      // Del remove o limite selecionado
      await page.locator('.planta-st').click();
      await page.keyboard.press('Delete');
      await page.locator('.statusbar .msg', { hasText: 'limite(s) removido(s)' }).waitFor();
      assert.equal(await linha.count(), 0);
    },
  };

export const f_FU3_3 = {
    name: 'FU3: bloco sobre estacas com 2 pilares — escolhido na planta, cálculo, bielas por pilar na janela e pilar retirado volta ao bloco simples',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [2, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      // estaca de capacidade informada (500 kN)
      await grupo.getByRole('button', { name: '+ estaca' }).click();
      await grupo.locator('table[data-estacas] select[aria-label^="Modo da estaca"]').selectOption('informada');
      await grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^Tipo$/ }) }).first().locator('select').selectOption('bloco');
      await page.getByRole('radio', { name: 'Fundação' }).click();
      await page.getByLabel('Vários pilares (Enter cria)').check();
      await page.mouse.click(...(await telaDe(page, 0, 0)));
      await page.mouse.click(...(await telaDe(page, 2, 0)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'B1 (bloco, 2 pilares) lançado sob P1, P2' }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const cardF = page.locator('[data-card-fundacoes]');
      await cardF.waitFor();
      await cardF.locator('tbody tr', { hasText: 'B1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Fundação B1/ });
      await jan.waitFor();
      const jt = await jan.innerText();
      assert.match(jt, /Pilares do elemento.*P1.*P2/s);
      assert.ok(await jan.locator('[data-bielas-por-pilar] tbody tr').count() === 2, 'uma linha de verificação por pilar');
      assert.ok(await jan.locator('.fsketch svg').count() >= 1, 'croqui do bloco com os dois pilares');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // retirar um pilar pelo editor: o elemento volta a ter um pilar só
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await grupo.locator('table[data-fundacoes] tbody tr').first().click();
      await grupo.getByRole('button', { name: 'Retirar o pilar P2' }).click();
      await page.locator('.statusbar .msg', { hasText: 'B1 alterado' }).waitFor();
      assert.match(await grupo.locator('[data-editor-fundacao] h4').innerText(), /sob P1/i);
    },
  };

export const f_FU5 = {
    name: 'FU5: pranchas de fundação — tipo Fundação, locação com rótulos e cargas, detalhamento das sapatas (SFS), vigas, quantitativos, ancoragem editável e conjunto numerado',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('eixo.malha {"dx": [7], "dy": [5]}');
      // pilares 19 × 19 não atendem: sem esta opção (R7c) ficariam fora da prancha de pilares do conjunto
      await cmd('opcoes.definir {"valores": {"pilarInsuficienteSemDesenho": 0}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      await grupo.locator('[data-gerar-fundacoes]').click();
      const dlg = page.getByRole('dialog', { name: 'Gerar fundações' });
      await dlg.waitFor();
      await dlg.locator('[data-gerar-confirmar]').click();
      await page.locator('.statusbar .msg', { hasText: /Fundações geradas: 4 sapatas/ }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      await tipo.selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      // sem cálculo: aviso claro
      await page.locator('[data-aviso-calculo="sem"]').waitFor();
      assert.equal(await page.locator('[data-lista-folhas]').count(), 0);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const prev = page.locator('.prancha-prev');
      const lista = page.locator('[data-lista-folhas]');
      await tipo.selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao');
      await prev.locator('svg').waitFor();
      // locação, detalhamento das sapatas, vigas de fundação e quantitativos
      assert.ok((await page.locator('[data-folha-item]').count()) >= 4, await lista.innerText());
      const itens = await lista.innerText();
      assert.match(itens, /SFS/);
      assert.match(itens, /locação/);
      assert.match(itens, /sapatas/);
      assert.match(itens, /vigas de fundação/);
      assert.match(itens, /quantitativos/);
      const texto = await prev.textContent();
      assert.match(texto, /h0 = \d+ cm/);
      assert.match(texto, /df = \d+ cm/);
      assert.match(texto, /Nk,máx/);
      // detalhamento das sapatas: planta e corte 1:50 e peso de aço
      await page.locator('[data-folha-item]', { hasText: /sapatas/ }).click();
      await page.waitForFunction(() => /PLANTA ESC 1:50/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      assert.ok(parseFloat(await page.locator('[data-aco-folha]').getAttribute('data-aco-peso')) > 0, 'peso de aço da folha de sapatas');
      // quantitativos
      await page.locator('[data-folha-item]', { hasText: /quantitativos/ }).click();
      await page.waitForFunction(() => /QUANTITATIVOS POR ELEMENTO/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      // ancoragem editável: muda o desenho depois de calcular as fundações
      await page.locator('summary', { hasText: 'Ancoragem das vigas de fundação' }).click();
      const anc = page.locator('[data-ancoragem-vf] tbody tr').first().locator('input').first();
      await anc.fill('120');
      await anc.press('Enter');
      await page.locator('[data-aviso-fundacao="desatualizada"]').waitFor();
      await page.locator('[data-aviso-fundacao="desatualizada"]').getByRole('button', { name: 'Calcular fundações' }).click();
      await page.locator('[data-aviso-fundacao="desatualizada"]').waitFor({ state: 'detached' });
      await page.locator('[data-folha-item]', { hasText: /vigas de fundação/ }).click();
      await page.waitForFunction(() => /Ancoragem das barras superiores: 120 cm/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      // conjunto completo: locação dos pilares (SLP), fundação (SFS) e as demais, numerado
      await tipo.selectOption({ label: 'Conjunto completo' });
      await prev.locator('svg').waitFor();
      const todos = await lista.innerText();
      for (const sg of ['SLP', 'SFS', 'SCF', 'SCV', 'SCP']) assert.match(todos, new RegExp(sg));
      const n = parseInt(await prev.getAttribute('data-total'), 10);
      assert.equal(await page.locator('[data-folha-item]').count(), n);
    },
  };

export const f_FU6 = {
    name: 'FU6: radier sobre base elástica — lançado pela planta, pilares sem vínculo, cálculo, mapa por nó na janela, viga sobre base elástica e pranchas da base elástica',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('300');
      await sigma.press('Enter');
      // ferramenta Radier (W) no nível de fundação: contorno por 4 vértices e Enter
      await page.getByRole('radio', { name: 'Fundação' }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('w');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'radier');
      const vertRad = [[-0.4, -0.4], [7.4, -0.4], [7.4, 5.4], [-0.4, 5.4]];
      await reenquadrarAte(page, vertRad);
      for (const [x, y] of vertRad) await page.mouse.click(...(await telaDe(page, x, y)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Radier R1 lançado .*4 pilar\(es\) sobre ele/ }).waitFor();
      const tab = grupo.locator('table[data-bases-elasticas] tbody tr');
      assert.equal(await tab.count(), 1);
      assert.match(await tab.first().innerText(), /R1.*radier h = 30/s);
      // pilares sobre o radier não pedem elemento próprio: "Lançar centrados" sem pilares
      assert.match(await grupo.getByRole('button', { name: /Lançar centrados em/ }).innerText(), /em 0 pilares/);
      // seleção na planta (clique dentro do radier): editor com h, k e σadm
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 3.5, 2.5)));
      const ed = grupo.locator('[data-editor-radier]');
      await ed.waitFor();
      const k = ed.locator('label.field', { has: page.locator('.flabel', { hasText: /^k \(vazio/ }) }).locator('input');
      await k.fill('40000');
      await k.press('Enter');
      await page.locator('.statusbar .msg', { hasText: 'Radier R1 alterado' }).waitFor();
      // carga do piso sobre o radier (nível de fundação)
      await cmd('carga.area {"grupo": "fundacao", "contorno": [[-0.4, -0.4], [7.4, -0.4], [7.4, 5.4], [-0.4, 5.4]], "valor": 5, "caso": "Q"}');
      // calcular: card da base elástica, sem FUND_PILAR_SEM_ELEMENTO
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const card = page.locator('[data-card-base-elastica]');
      await card.waitFor();
      assert.match(await card.innerText(), /R1.*radier h = 30.*40000/s);
      assert.equal(await page.locator('[data-lista-erros]').locator('.tablewrap tbody tr', { hasText: 'FUND_PILAR_SEM_ELEMENTO' }).count(), 0);
      // janela: mapa por nó, nós de maior tensão e posições da armadura
      await card.locator('tbody tr', { hasText: 'R1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Radier R1/ });
      await jan.waitFor();
      assert.ok(parseInt(await jan.locator('svg[data-mapa-base]').getAttribute('data-mapa-nos'), 10) > 50, 'mapa com os nós da malha');
      assert.ok(await jan.locator('.mapa-no').count() > 50);
      assert.match(await jan.innerText(), /σ máxima \(raras\)/);
      assert.ok(await jan.locator('table[data-posicoes-radier] tbody tr').count() >= 4, 'malhas inferior e superior nas duas direções');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // planta: mapa de tensões e viga sobre base elástica (X)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await faixaAba(page, 'Vista');
      await page.getByLabel('Mapa da base elástica').selectOption('tensao');
      await page.locator('.planta-st').click();
      await page.keyboard.press('x');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'vigaElastica');
      await reenquadrarAte(page, [[-0.3, 5.9], [7.3, 5.9]]);
      await page.mouse.click(...(await telaDe(page, -0.3, 5.9)));
      await page.mouse.click(...(await telaDe(page, 7.3, 5.9)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /VE1 \(50×80, sobre base elástica\) lançada/ }).waitFor();
      assert.equal(await tab.count(), 2);
      // pranchas do tipo Fundação: folhas da base elástica e quantitativos
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Recalcular' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      // a mensagem “dimensionamento em” da primeira rodada ainda pode estar na barra: espera o estado (VE1 no card) em vez do texto transitório
      await page.waitForFunction(() => /VE1/.test(document.querySelector('[data-card-base-elastica]')?.textContent ?? ''), null, { timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao');
      const itens = await page.locator('[data-lista-folhas]').innerText();
      assert.match(itens, /base elástica — malha inferior/);
      assert.match(itens, /base elástica — malha superior/);
      assert.match(itens, /quantitativos/);
      await page.locator('[data-folha-item]', { hasText: /malha inferior/ }).click();
      await page.waitForFunction(() => /RADIERS — TENSÕES NO SOLO/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      assert.ok(parseFloat(await page.locator('[data-aco-folha]').getAttribute('data-aco-peso')) > 0, 'peso de aço da malha inferior');
    },
  };

export const f_FU7a = {
    name: 'FU7a: sapata corrida — lançada pela planta (A) sob parede, cálculo rígido por metro, janela com corte transversal, edição, sob pilares na análise global e pranchas',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      // estrutura (para a análise) em y = 0 a 6; a parede da sapata SC1 fica entre x = 2 e 6 em y = 0 (longe dos pilares); os pilares de y = 6 ficam sobre a SC2
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [8, 6], [0, 6]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 6], [8, 6]], [[0, 0], [0, 6]], [[8, 0], [8, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const grupo = await grupoEdif(page, /^Fundação \(/);
      const sigma = grupo.locator('label.field', { has: page.locator('.flabel', { hasText: /^σadm$/ }) }).locator('input');
      await sigma.fill('200');
      await sigma.press('Enter');
      // carga linear da parede (nível de fundação): G 250 + Q 100 kN/m
      await cmd('carga.linha {"grupo": "fundacao", "pontos": [[2, 0], [6, 0]], "valor": 250, "caso": "G"}');
      await cmd('carga.linha {"grupo": "fundacao", "pontos": [[2, 0], [6, 0]], "valor": 100, "caso": "Q"}');
      // ferramenta Sapata corrida (A) no nível de fundação: eixo por 2 pontos e Enter
      await page.getByRole('radio', { name: 'Fundação' }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('a');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'corrida');
      await page.keyboard.press('f');
      await page.mouse.click(...(await telaDe(page, 2, 0)));
      await page.mouse.click(...(await telaDe(page, 6, 0)));
      await page.keyboard.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC1 lançada .*sob parede/ }).waitFor();
      const tab = grupo.locator('table[data-corridas-tabela] tbody tr');
      assert.equal(await tab.count(), 1);
      assert.match(await tab.first().innerText(), /SC1.*sob parede/s);
      const idSC1 = await tab.first().getAttribute('data-corrida-id');
      // seleção na planta (clique sobre o eixo): editor
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 4, 0)));
      const ed = grupo.locator('[data-editor-corrida]');
      await ed.waitFor();
      // sob pilares: SC2 pelo comando, ao longo de y = 6 (passa pelos dois pilares): B e h informadas
      await cmd('corrida.criar {"pontos": [[0, 6], [8, 6]], "bw": 0.3, "B": 1.2, "h": 0.5}');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC2 lançada .*2 pilar\(es\) sobre ela/ }).waitFor();
      assert.equal(await tab.count(), 2);
      // calcular: card das sapatas corridas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const card = page.locator('[data-card-corridas]');
      await card.waitFor();
      assert.match(await card.innerText(), /SC1.*sob parede.*185 × 55 \/ 20/s);
      assert.match(await card.innerText(), /SC2.*sob pilares/s);
      // janela da SC1: corte transversal, flexão transversal CEB-70 e armadura
      await card.locator('tbody tr', { hasText: 'SC1' }).dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Sapata corrida SC1/ });
      await jan.waitFor();
      await jan.locator('svg[data-corte-corrida]').waitFor();
      assert.match(await jan.innerText(), /CEB-70.*Md = 96,8/s);
      assert.match(await jan.innerText(), /φ12,5 c\/14/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // janela da SC2 (sob pilares): viga sobre base elástica
      await card.locator('tbody tr', { hasText: 'SC2' }).dblclick();
      const jan2 = page.getByRole('dialog', { name: /Resultados do elemento — Sapata corrida SC2/ });
      await jan2.waitFor();
      assert.match(await jan2.innerText(), /Viga: Md inf\. \/ sup\./);
      await jan2.getByRole('button', { name: 'Fechar' }).click();
      // editar a SC1 (B imposta pequena): erro FUND_CORRIDA_SEM_SOLUCAO na lista de revisão após recalcular
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.locator('.planta-st').click();
      await page.keyboard.press('s');
      await page.mouse.click(...(await telaDe(page, 4, 0)));
      const ed2 = grupo.locator('[data-editor-corrida]').first();
      await ed2.waitFor();
      const bf = ed2.locator('label.field', { has: page.locator('.flabel', { hasText: /^B \(vazio/ }) }).locator('input');
      await bf.fill('0.5');
      await bf.press('Enter');
      await page.locator('.statusbar .msg', { hasText: /Sapata corrida SC1 alterada/ }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Recalcular' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      assert.ok(await page.locator('[data-lista-erros]').locator('.tablewrap tbody tr', { hasText: 'FUND_CORRIDA_SEM_SOLUCAO' }).count() >= 1, 'erro da largura imposta');
      // volta ao cálculo pela σadm e abre as pranchas do tipo Fundação
      await cmd('corrida.editar {"id": "' + idSC1 + '", "limpar": ["B"]}');
      await page.getByRole('button', { name: 'Recalcular' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      await page.getByLabel('Tipo de prancha').selectOption({ label: 'Fundação (locação, detalhes e quantitativos)' });
      await page.waitForFunction(() => document.querySelector('.prancha-prev')?.getAttribute('data-tipo') === 'fundacao');
      const itens = await page.locator('[data-lista-folhas]').innerText();
      assert.match(itens, /sapatas corridas — locação/);
      assert.match(itens, /Fundação — sapatas corridas/);
      await page.locator('[data-folha-item]', { hasText: /^.*Fundação — sapatas corridas(?! —)/ }).first().click();
      await page.waitForFunction(() => /CORTE TRANSVERSAL/.test(document.querySelector('.prancha-prev')?.textContent ?? ''));
      assert.ok(parseFloat(await page.locator('[data-aco-folha]').getAttribute('data-aco-peso')) > 0, 'peso de aço das sapatas corridas');
    },
  };
