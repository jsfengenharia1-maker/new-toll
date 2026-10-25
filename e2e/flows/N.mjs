// Fluxos de interface — N (parte 1/1).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { faixaAba, grupoEdif, tab, downloadText, num, telaDe } from './helpers.mjs';

export const f_N1e = {
    name: 'N1e: redistribuição e limite de fissura nas opções, colunas Td/wk e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await grupoEdif(page, 'Opções de cálculo');
      const red = page.getByLabel('Redistribuição de negativos das vigas');
      await red.fill('20');
      await red.press('Enter');
      const fis = page.getByLabel('Abertura de fissuras máxima');
      await fis.fill('0,2');
      await fis.press('Enter');
      await page.locator('summary', { hasText: 'Opções de cálculo (2 alteradas)' }).waitFor();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      const card = (t) => page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: t }) });
      const cab = await card(/^Vigas$/).locator('thead').textContent();
      assert.match(cab, /Td \(kN·m\)/);
      assert.match(cab, /wk inf \/ sup \/ lim\./);
      assert.match(await card('Pilares (por lance)').locator('thead').textContent(), /Vd \(kN\)/);
      assert.match(await card(/^Lajes$/).locator('thead').textContent(), /wk \/ lim\./);
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const txt = await memo.textContent();
      assert.match(txt, /Redistribuição \(NBR 6118, 14\.6\.4\.3\): 20 %/);
      assert.match(txt, /limite 0,20 mm \(opção\)/);
    },
  };

export const f_N2a = {
    name: 'N2a: compatibilidade e arranjos em xadrez, estados-limite, situações do usuário com alerta, empuxo (caso H), ábacos de vento e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [0, 5, 10].flatMap((x) => [0, 4, 8].map((y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`)).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 8], [10, 8]], [[0, 0], [0, 8]], [[5, 0], [5, 8]], [[10, 0], [10, 8]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      const msg = (t) => page.locator('.statusbar .msg', { hasText: t }).waitFor();
      const grupo = (t) => page.locator('details.group', { has: page.locator(':scope > summary', { hasText: t }) });

      // ---- casos: compatibilidade e arranjos ----
      await grupoEdif(page, /^Casos de carga/);
      const casos = grupo(/^Casos de carga/);
      for (const n of ['Água', 'Vazio']) {
        await casos.getByLabel('Novo caso').fill(n);
        await casos.getByLabel('Novo caso').press('Enter');
        await casos.getByRole('button', { name: 'Criar caso' }).click();
        await msg(`Caso ${n} (Q) criado`);
      }
      await casos.locator('summary', { hasText: 'Compatibilidade entre casos' }).click();
      await casos.getByLabel('Relação entre Água e Vazio').selectOption('incompativel');
      await msg('Água e Vazio: incompativel');
      assert.equal(await casos.getByLabel('Relação entre Água e Vazio').inputValue(), 'incompativel');
      await casos.locator('summary', { hasText: 'Arranjos alternados e móveis' }).click();
      await casos.getByLabel('Nome do caso', { exact: true }).fill('Uso alternado');
      await casos.getByLabel('Nome do caso', { exact: true }).press('Enter');
      await casos.getByRole('button', { name: 'Gerar arranjos' }).click();
      await msg('2 arranjos em xadrez');
      assert.equal(await casos.getByLabel('Natureza de Uso alternado A').inputValue(), 'Q');
      assert.match(await casos.innerText(), /arranjo de Uso alternado/);

      // ---- estados-limite ----
      await grupoEdif(page, /^Estados-limite e combinações/);
      const est = grupo(/^Estados-limite e combinações/);
      assert.equal(await est.getByLabel('Ativar Concreto armado (ELU)').isDisabled(), true);
      await est.getByLabel('Ativar Flechas (quase permanentes)').uncheck();
      await msg('Estados-limite alterados');
      await page.locator('summary', { hasText: /^Estados-limite e combinações \(alterados\)/ }).waitFor();
      await est.getByLabel('Ativar Flechas (quase permanentes)').check();
      await est.getByLabel('Controle de execução').selectOption('premoldado');
      await msg('Parâmetros de norma alterados');

      // ---- análise e situações do usuário ----
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await msg('Análise concluída');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await est.getByRole('button', { name: 'Situações do usuário…' }).click();
      const jan = page.getByRole('dialog', { name: 'Situações do usuário' });
      await jan.getByRole('button', { name: 'Importar da norma' }).click();
      await msg('situação(ões) importada(s) da norma em Concreto armado (ELU)');
      const linhas = await jan.locator('tbody tr').count();
      assert.ok(linhas >= 8, `${linhas} situações importadas`);
      assert.equal(await jan.locator('.alert').count(), 0, 'importada da norma: sem alerta');
      // modo usuário num grupo com situação de fator menor que o da norma: alerta de responsabilidade
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await est.getByLabel('Modo de Tensões no solo (raras)').selectOption('usuario');
      await msg('Estados-limite alterados');
      await est.getByRole('button', { name: 'Situações do usuário…' }).click();
      await jan.getByLabel('Grupo de estados').selectOption({ label: 'Tensões no solo (raras)' });
      await jan.getByLabel('Nome da nova situação').fill('Baixa');
      await jan.getByLabel('Nome da nova situação').press('Enter');
      await jan.getByRole('button', { name: 'Nova situação' }).click();
      await jan.getByLabel('Nome da situação Baixa').waitFor();
      const q = jan.getByLabel('Fator de Q em Baixa');
      await q.fill('0,5');
      await q.press('Enter');
      await jan.locator('.alert').first().waitFor();
      assert.match(await jan.locator('.alert').first().innerText(), /Combinações do usuário \(Tensões no solo \(raras\)\):.*fator máximo de Q = 0,5, abaixo de 1 da norma/s);
      // colagem de uma situação própria
      await jan.locator('summary', { hasText: 'Colar tabela' }).click();
      await jan.getByLabel('Tabela colada').fill('\tG\tQ\nPrópria\t1\t0,8');
      await jan.getByRole('button', { name: 'Criar situações da colagem' }).click();
      await jan.getByLabel('Nome da situação Própria').waitFor();
      await jan.getByRole('button', { name: 'Fechar' }).click();

      // ---- empuxo de terra e caso H ----
      await grupoEdif(page, /^Empuxo de terra/);
      const emp = grupo(/^Empuxo de terra/);
      await emp.getByLabel('Novo tipo de empuxo').fill('Subsolo');
      await emp.getByLabel('Novo tipo de empuxo').press('Enter');
      await emp.getByRole('button', { name: 'Criar tipo' }).click();
      await msg('Empuxo “Subsolo” (repouso, K = 0,5)');
      const caixa = emp.locator('.emp-box');
      const R0 = parseFloat(await caixa.getAttribute('data-resultante'));
      const na = emp.getByLabel('Cota do nível d\'água');
      await na.fill('-0,5'); // dentro da parede (cota da base −1,5 m)
      await na.press('Enter');
      await page.waitForFunction((r) => parseFloat(document.querySelector('.emp-box').getAttribute('data-resultante')) > r, R0);
      assert.ok(await caixa.locator('svg.emp-fig polygon.emp-agua').count() >= 1, 'a água entra no diagrama');
      await grupoEdif(page, /^Casos de carga/);
      await casos.getByLabel('Novo caso').fill('Empuxo do subsolo');
      await casos.getByLabel('Novo caso').press('Enter');
      await casos.locator('label.field', { has: page.locator('.flabel', { hasText: /^Natureza$/ }) }).locator('select').selectOption('H');
      await casos.getByRole('button', { name: 'Criar caso' }).click();
      await msg('Caso Empuxo do subsolo (H) criado');
      await casos.getByLabel('Empuxo de Empuxo do subsolo').selectOption({ label: 'Subsolo' });
      await msg('Caso Empuxo do subsolo alterado');

      // ---- ábacos de vento ----
      await grupoEdif(page, /^Ábacos de vento/);
      const ab = grupo(/^Ábacos de vento/);
      assert.deepEqual(await ab.getByLabel('Coeficiente de arrasto Ca').locator('option').allInnerTexts(), ['Informado (Ca em X e Y)']);
      await ab.locator('summary', { hasText: /^Ca, baixa turbulência/ }).click();
      await ab.getByLabel('Ca, baixa turbulência: pontos da curva 1').fill('0,2; 1,04\n5; 1,04');
      await ab.getByRole('button', { name: 'Aplicar ca, baixa turbulência' }).click();
      await msg('Vento alterado');
      await ab.getByLabel('Coeficiente de arrasto Ca').selectOption('1');
      await msg('Vento alterado');
      await page.locator('summary', { hasText: /^Ábacos de vento \(NBR 6123\) \(em uso\)/ }).waitFor();

      // ---- memorial ----
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('text=O modelo mudou depois do cálculo').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const t = await memo.textContent();
      assert.match(t, /Categorias de uso, arranjos e compatibilidade/);
      assert.match(t, /Uso alternado.*Uso alternado A; Uso alternado B/s);
      assert.match(t, /Estados-limite e coeficientes/);
      assert.match(t, /Pré-moldado com controle rigoroso/);
      assert.match(t, /Situações de projeto do usuário/);
      assert.match(t, /Combinações do usuário \(Tensões no solo \(raras\)\): fator máximo de Q = 0,8, abaixo de 1 da norma/);
      assert.match(t, /Empuxo de terra.*Subsolo.*método de repouso/s);
      assert.ok(await memo.locator('figure svg').count() >= 1);
      assert.match(t, /Equilíbrio global \(tombamento\)/);
      assert.match(t, /Ca pelo ábaco de baixa turbulência/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2d = {
    name: 'N2d: punção das lajes (contornos C, C′ e C″, armadura calculada, grupos informados, camada e ferramenta na planta, envoltória do grupo, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      await cmd('grupo.editar {"id": "g_3", "q": 14}');
      // laje lisa de 12 × 12 m, h = 16 cm, em 3 × 3 pilares 50 × 50 (1 interno, 4 de borda e 4 de canto)
      await cmd('lote {"comandos": [' + [0.25, 6, 11.75].flatMap((x) => [0.25, 6, 11.75].map((y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.5, "h": 0.5}}}`)).join(', ') + ']}');
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [12, 0], [12, 12], [0, 12]], "tipo": {"tipo": "macica", "h": 0.16}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      await livre();
      // cartão de punção: 9 pilares por pavimento do grupo; o interno leva armadura, os de borda e de canto reprovam na biela
      const card = page.locator('[data-card-puncao]');
      await card.waitFor();
      assert.equal(await card.locator('tbody tr').count(), 27);
      assert.ok(await card.locator('tbody tr', { hasText: 'com armadura' }).count() >= 1);
      assert.ok(await card.locator('tbody tr.bad', { hasText: 'não atende' }).count() >= 1);
      assert.ok(await page.locator('[data-lista-erros]').getByText('PUNCAO_BIELA').first().isVisible());
      // janela da laje, aba Punção e cortante
      await card.locator('tbody tr', { hasText: 'com armadura' }).first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Punção e cortante' }).click();
      const cartao = jan.locator('section[data-status="armadura"]').first();
      await cartao.waitFor();
      assert.equal(await cartao.getAttribute('data-tipo-apoio'), 'interno');
      assert.ok(await cartao.locator('svg[data-puncao-fig] [data-contorno="C″"]').count() > 0);
      assert.ok(await cartao.locator('svg circle[data-barra]').count() >= 4);
      assert.match(await cartao.locator('table[data-contornos-puncao]').innerText(), /τRd3/);
      assert.match(await cartao.innerText(), /armadura de punção calculada/i);
      // grupo informado soma-se à calculada e pode ser apagado
      await cartao.getByRole('button', { name: 'Adicionar grupo' }).click();
      await livre();
      await jan.locator('[data-grupos-puncao="1"]').waitFor();
      await cartao.getByRole('button', { name: 'Apagar os grupos do pilar' }).click();
      await livre();
      await jan.locator('[data-grupos-puncao]').waitFor({ state: 'detached' });
      // envoltória dos pavimentos do grupo (C3.4)
      await jan.getByRole('radio', { name: 'Resultados e armadura' }).click();
      await jan.getByRole('radio', { name: 'Envoltória do grupo' }).click();
      await jan.locator('[data-envoltoria-laje]').waitFor();
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // camada na planta (Tipo 1): contornos dos 9 pilares
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await faixaAba(page, 'Vista');
      await page.getByLabel('Armadura das lajes na planta').selectOption('puncao');
      await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-puncao') === '9', null, { timeout: 15000 });
      // ferramenta: um clique no pilar interno lança o grupo informado; no modo Apagar, remove
      await faixaAba(page, 'Edição');
      await page.getByRole('radio', { name: 'Armadura de punção', exact: true }).click();
      await page.keyboard.press('f');
      const [px, py] = await telaDe(page, 6, 6);
      await page.mouse.click(px, py);
      await page.waitForTimeout(500);
      await livre();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await card.locator('tbody tr', { hasText: 'informada' }).first().waitFor({ timeout: 30000 });
      // radier sob os 9 pilares (FU6): punção do radier na janela e no memorial
      await cmd('radier.criar {"contorno": [[0, 0], [12, 0], [12, 12], [0, 12]], "h": 0.3, "k": 40000, "sigmaAdm": 400}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      const cardBase = page.locator('[data-card-base-elastica]');
      await cardBase.waitFor({ timeout: 60000 });
      await cardBase.locator('tbody tr').first().dblclick();
      const janR = page.getByRole('dialog', { name: /Resultados do elemento/ });
      await janR.locator('[data-puncao-radier="9"]').waitFor();
      assert.equal(await janR.locator('[data-puncao-radier] section[data-puncao]').count(), 9);
      assert.equal(await janR.locator('[data-puncao-radier] [data-editor-puncao]').count(), 0);
      await janR.getByRole('button', { name: 'Fechar' }).click();
      // memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const t = await memo.textContent();
      assert.ok(await memo.locator('[data-memorial-puncao-radier]').count() > 0);
      assert.match(t, /Punção e cortante das lajes/);
      assert.match(t, /Punção por pilar/);
      assert.match(t, /Cortante das lajes nos apoios em vigas/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2b = {
    name: 'N2b: modelo integrado (lajes condensadas no pórtico) em uso, opção no grupo Opções e volta ao modelo separado',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      // opção no grupo Opções de cálculo, ligada por padrão (padrão do sistema)
      await grupoEdif(page, 'Opções de cálculo');
      const opcao = page.getByLabel('Modelo integrado (lajes no pórtico)');
      assert.equal(await opcao.isChecked(), true);
      assert.equal(await page.getByLabel('Deformação por cortante nas barras de laje').isChecked(), true);
      assert.equal(await page.getByLabel('Malha das cascas (tamanho alvo)').inputValue(), '1');
      // análise: indicação do modelo em uso, gdl e tempo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      const linha = page.locator('[data-modelo]');
      await linha.waitFor();
      assert.equal(await linha.getAttribute('data-modelo'), 'integrado');
      assert.match(await linha.textContent(), /Modelo integrado \(\d+ pavimento\(s\) condensados no pórtico\) · \d+ gdl em \d+ ms/);
      assert.match(await page.locator('.edif-out').textContent(), /superelemento/);
      // desliga: volta ao modelo separado (comportamento anterior)
      await opcao.uncheck();
      await page.locator('summary', { hasText: 'Opções de cálculo (1 alterada)' }).waitFor();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-modelo]')?.getAttribute('data-modelo') === 'separado', null, { timeout: 120000 });
      assert.match(await page.locator('[data-modelo]').textContent(), /Modelo separado/);
      // memorial descreve o modelo em uso
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.textContent(), /modelo separado/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2c = {
    name: 'N2c: vínculo externo com molas, carga uniforme no pilar, P-Δ na aba Análise, 2ª ordem local e cortante por direção na janela do pilar, memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      // vínculo externo: molas na base do P1 (giros) e carga uniforme no lance
      await grupoEdif(page, 'Pilares (4)');
      await page.locator('table.quadro tbody tr').first().click();
      await grupoEdif(page, 'Vínculos, flambagem e cobrimento');
      const vinc = page.locator('[data-vinculo-externo]');
      await vinc.waitFor();
      await vinc.getByLabel('Vínculo da base').selectOption({ label: 'molas' });
      await page.locator('.statusbar .msg', { hasText: 'Vínculo de 1 pilar(es) alterado' }).waitFor();
      const kx = vinc.getByLabel('kθx');
      await kx.fill('50000');
      await kx.press('Enter');
      await page.waitForFunction(() => [...document.querySelectorAll('[data-vinculo-externo] label.field')].find((l) => l.textContent.startsWith('kθx'))?.querySelector('input')?.value === '50000');
      await page.locator('select', { has: page.locator('option', { hasText: 'em faixa' }) }).selectOption({ label: 'uniforme' });
      const hx = page.getByLabel('Hx (kN/m)');
      await hx.fill('2');
      await hx.press('Enter');
      await page.getByRole('button', { name: 'Adicionar carga no lance' }).click();
      await page.locator('tr[data-carga-pilar="uniforme"]').waitFor();
      // P-Δ na aba Análise
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      const card = page.locator('[data-card-2ordem]');
      await card.getByLabel('P-Δ no pórtico 3D (no lugar do γz)').check();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      const pd = card.locator('[data-segunda-ordem="pDelta"]');
      await pd.waitFor({ timeout: 60000 });
      assert.ok(parseInt(await pd.getAttribute('data-pdelta-combinacoes'), 10) > 0);
      assert.match(await pd.textContent(), /P-Δ.*sem a ampliação 0,95·γz/s);
      // janela do pilar: método local por direção, diagrama de 1ª e 2ª ordem e cortante por direção
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      const cardP = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) });
      await cardP.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jan.waitFor();
      assert.match(await jan.locator('[data-pilar-2ordem]').first().getAttribute('data-pilar-2ordem'), /^(curvatura|curvaturaFluencia|geral)\|/);
      assert.match(await jan.textContent(), /2ª ordem local u \(b\)/);
      await jan.locator('svg[data-diagrama="M2"]').first().waitFor();
      assert.ok(await jan.locator('table[data-cortante-direcao="2"]').count() >= 1);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // memorial: método global P-Δ, efeitos locais, cortante por direção e vínculo com molas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      await memo.locator('[data-memorial-2ordem="pDelta"]').waitFor();
      assert.match(await memo.textContent(), /processo P-Δ/);
      assert.match(await memo.textContent(), /Pilar P1: base sobre molas/);
      await memo.locator('table[data-memorial-cortante]').waitFor();
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2h = {
    name: 'Desaprumo global (11.3.3.4.1): opção no card de 2ª ordem, θa exibido, ligar e desligar, memorial com a premissa',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      const card = page.locator('[data-card-2ordem]');
      const chk = card.getByLabel('Desaprumo global nas combinações ELU (11.3.3.4.1)');
      assert.equal(await chk.isChecked(), true); // padrão ligado
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      const info = card.locator('[data-desaprumo]');
      await info.waitFor({ timeout: 60000 });
      assert.match(await info.textContent(), /θa = 1\/\d+/);
      assert.match(await info.textContent(), /regra dos 30 % do vento/);
      // desligar: sem o resumo depois de recalcular
      await chk.uncheck();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      await page.waitForFunction(() => !document.querySelector('[data-card-2ordem] [data-desaprumo]'));
      await chk.check();
      // memorial: a premissa do desaprumo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 120000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      await memo.waitFor();
      assert.match(await memo.textContent(), /Desaprumo global \(NBR 6118, 11\.3\.3\.4\.1/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2e = {
    name: 'N2e: apoios, limites e avisos de modelagem (suspensão no cruzamento, arredondamento, viga-parede, opções e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      // vigas A (y = 0) e C (y = 4) de 6 m em pilares nas pontas; B (x = 3) apoia-se nelas; e uma viga curta e alta (viga-parede)
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [0, 4], [6, 4], [10, 0], [11, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0], 0.15, 0.4], [[0, 4], [6, 4], 0.15, 0.4], [[3, 0], [3, 4], 0.15, 0.4], [[10, 0], [11, 0], 0.15, 0.6]].map(([a, z, b, h]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, z])}, "secao": {"b": ${b}, "h": ${h}}}}`).join(', ') + ']}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await livre();
      // lista de erros e avisos: a viga curta e alta é viga-parede
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /VIGA_PAREDE/);
      // opções novas no grupo Opções de cálculo, com a fonte e o padrão por perfil
      const g = await grupoEdif(page, 'Opções de cálculo');
      const t = await g.innerText();
      assert.match(t, /Arredondamento do diagrama no apoio/);
      assert.match(t, /Vigas: armadura de suspensão nos apoios em vigas/);
      assert.match(t, /Desnível entre panos: limite da continuidade/);
      // memorial: critério de arredondamento, tabela de suspensão (A e C recebem a reação de B) e avisos
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const ap = await memo.locator('[data-memorial-apoios]').innerText();
      assert.match(ap, /parábola cúbica M\(x\) = a·x³/);
      assert.match(ap, /Armadura de suspensão \(NBR 6118, 18\.3\.6\)/);
      assert.equal(await memo.locator('[data-memorial-suspensao] tbody tr').count(), 2);
      assert.match(await memo.innerText(), /VIGA_PAREDE/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // perfil NBR: ΔM = R·t/8
      await cmd('opcoes.definir {"perfil": "nbr"}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo2 = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo2.locator('[data-memorial-apoios]').innerText(), /ΔM = R·t\/8/);
      await memo2.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2f = {
    name: 'N2f: flechas por etapas (etapas, limites por elemento, janela da viga, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      // 4 pilares 20×40 nos cantos; vigas 15×50 no contorno (grupo g_3); laje maciça de 12 cm nos painéis
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map(([a, b]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, b])}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await livre();
      // 1) grupo Etapas de carga (flechas): quatro etapas padrão
      const etapas = await grupoEdif(page, 'Etapas de carga (flechas)');
      assert.equal(await etapas.locator('[data-etapas] tbody tr').count(), 4);
      assert.equal(await etapas.locator('[data-etapas] tbody tr').first().locator('input').first().inputValue(), 'Desforma (peso próprio)');
      // colagem de uma etapa única: a lista vira uma linha
      await etapas.locator('textarea[aria-label="Etapas coladas"]').fill('A\t30\t1\t1\t1\t1');
      await etapas.getByRole('button', { name: 'Aplicar colagem' }).click();
      await livre();
      assert.equal(await etapas.locator('[data-etapas] tbody tr').count(), 1);
      await etapas.getByRole('button', { name: 'Voltar ao padrão' }).click();
      await livre();
      // 2) opções de cálculo com os limites de flecha
      const g = await grupoEdif(page, 'Opções de cálculo');
      const t = await g.innerText();
      assert.match(t, /Limite da flecha ativa \(vão \/ …\)/);
      assert.match(t, /Fator simplificado da flecha ativa \(maciças\)/);
      // 3) limite de flecha ativa impossível para as vigas: erro FLECHA_ATIVA na lista
      await cmd('flechas.limites {"elemento": "viga", "tipo": "ativa", "limite": {"rel": 100000}}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /FLECHA_ATIVA/);
      // 4) janela da viga: tabela de flechas com quatro linhas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const janela = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await janela.waitFor();
      assert.equal(await janela.locator('[data-flechas] tbody tr').count(), 4);
      assert.match(await janela.innerText(), /Ativa \(após as paredes\)/);
      await page.keyboard.press('Escape');
      // 5) memorial: etapas de carga e limites
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.locator('[data-memorial-flechas]').innerText(), /Desforma \(peso próprio\)/);
      assert.match(await memo.locator('[data-memorial-flechas]').innerText(), /ℓ\/500 e 1 cm/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2g = {
    name: 'N2g: resistência ao fogo (grupo Incêndio, TRRF, revestimento, card do Dimensionamento, erros e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const calcular = async () => {
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await livre();
      };
      await cmd('vento.definir {"ativo": false}');
      // 4 pilares 20×40 nos cantos; vigas 15×50 no contorno (grupo g_3); laje maciça de 12 cm nos painéis
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map(([a, b]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, b])}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await calcular();
      // sem a verificação ligada: nenhum card de fogo
      assert.equal(await page.locator('[data-card-fogo]').count(), 0);
      // 1) grupo Incêndio: liga a verificação e informa ocupação e altura (sugestão pela IT)
      const g = await grupoEdif(page, 'Incêndio');
      await g.getByLabel('Verificar resistência ao fogo (NBR 15200)').check();
      await g.getByLabel('Ocupação (NBR 14432 / IT)').selectOption('D-1');
      assert.match(await g.innerText(), /Sugestão: TRRF de \d+ min/);
      assert.ok((await g.locator('[data-fogo-grupos] tbody tr').count()) >= 1);
      // 2) TRRF de 120 min no grupo g_3 (linha de comando) reprova as vigas: erro FOGO_TRRF
      await cmd('fogo.definir {"trrf": {"g_3": 120}}');
      await calcular();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /FOGO_TRRF/);
      // 3) card do Dimensionamento: elementos com TRRF, TRF e folga; as vigas não atendem
      const card = page.locator('[data-card-fogo]');
      await card.waitFor();
      assert.match(await card.innerText(), /TRRF \(min\)/);
      assert.ok((await card.locator('tbody tr', { hasText: 'viga' }).filter({ hasText: 'não atende' }).count()) >= 1);
      // 4) revestimento de 60 mm de argamassa de cimento e areia no grupo: as vigas passam a atender
      await cmd('fogo.definir {"revestimentos": {"g_3": {"material": "cimento", "espessura": 60}}}');
      await calcular();
      assert.equal(await card.locator('tbody tr', { hasText: 'viga' }).filter({ hasText: 'não atende' }).count(), 0);
      // 5) janela da viga pelo duplo clique no card
      await card.locator('tbody tr', { hasText: 'viga' }).first().dblclick();
      await page.getByRole('dialog', { name: /Resultados do elemento — Viga/ }).waitFor();
      await page.keyboard.press('Escape');
      // 6) memorial: seção Resistência ao fogo com a tabela por elemento
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mf = await memo.locator('[data-memorial-fogo]').innerText();
      assert.match(mf, /NBR 15200/);
      assert.match(mf, /Tabela 9 \(vigas contínuas ou de pórtico\)|Tabela 8 \(vigas biapoiadas\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7) desligar a verificação: o card some
      await g.getByLabel('Verificar resistência ao fogo (NBR 15200)').uncheck();
      await calcular();
      assert.equal(await page.locator('[data-card-fogo]').count(), 0);
    },
  };

export const f_N2e_2 = {
    name: 'N2e: apoios, limites e avisos de modelagem (suspensão no cruzamento, arredondamento, viga-parede, opções e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      // vigas A (y = 0) e C (y = 4) de 6 m em pilares nas pontas; B (x = 3) apoia-se nelas; e uma viga curta e alta (viga-parede)
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [0, 4], [6, 4], [10, 0], [11, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0], 0.15, 0.4], [[0, 4], [6, 4], 0.15, 0.4], [[3, 0], [3, 4], 0.15, 0.4], [[10, 0], [11, 0], 0.15, 0.6]].map(([a, z, b, h]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, z])}, "secao": {"b": ${b}, "h": ${h}}}}`).join(', ') + ']}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await livre();
      // lista de erros e avisos: a viga curta e alta é viga-parede
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /VIGA_PAREDE/);
      // opções novas no grupo Opções de cálculo, com a fonte e o padrão por perfil
      const g = await grupoEdif(page, 'Opções de cálculo');
      const t = await g.innerText();
      assert.match(t, /Arredondamento do diagrama no apoio/);
      assert.match(t, /Vigas: armadura de suspensão nos apoios em vigas/);
      assert.match(t, /Desnível entre panos: limite da continuidade/);
      // memorial: critério de arredondamento, tabela de suspensão (A e C recebem a reação de B) e avisos
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const ap = await memo.locator('[data-memorial-apoios]').innerText();
      assert.match(ap, /parábola cúbica M\(x\) = a·x³/);
      assert.match(ap, /Armadura de suspensão \(NBR 6118, 18\.3\.6\)/);
      assert.equal(await memo.locator('[data-memorial-suspensao] tbody tr').count(), 2);
      assert.match(await memo.innerText(), /VIGA_PAREDE/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // perfil NBR: ΔM = R·t/8
      await cmd('opcoes.definir {"perfil": "nbr"}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo2 = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo2.locator('[data-memorial-apoios]').innerText(), /ΔM = R·t\/8/);
      await memo2.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2f_2 = {
    name: 'N2f: flechas por etapas (etapas, limites por elemento, janela da viga, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      await cmd('vento.definir {"ativo": false}');
      // 4 pilares 20×40 nos cantos; vigas 15×50 no contorno (grupo g_3); laje maciça de 12 cm nos painéis
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map(([a, b]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, b])}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await livre();
      // 1) grupo Etapas de carga (flechas): quatro etapas padrão
      const etapas = await grupoEdif(page, 'Etapas de carga (flechas)');
      assert.equal(await etapas.locator('[data-etapas] tbody tr').count(), 4);
      assert.equal(await etapas.locator('[data-etapas] tbody tr').first().locator('input').first().inputValue(), 'Desforma (peso próprio)');
      // colagem de uma etapa única: a lista vira uma linha
      await etapas.locator('textarea[aria-label="Etapas coladas"]').fill('A\t30\t1\t1\t1\t1');
      await etapas.getByRole('button', { name: 'Aplicar colagem' }).click();
      await livre();
      assert.equal(await etapas.locator('[data-etapas] tbody tr').count(), 1);
      await etapas.getByRole('button', { name: 'Voltar ao padrão' }).click();
      await livre();
      // 2) opções de cálculo com os limites de flecha
      const g = await grupoEdif(page, 'Opções de cálculo');
      const t = await g.innerText();
      assert.match(t, /Limite da flecha ativa \(vão \/ …\)/);
      assert.match(t, /Fator simplificado da flecha ativa \(maciças\)/);
      // 3) limite de flecha ativa impossível para as vigas: erro FLECHA_ATIVA na lista
      await cmd('flechas.limites {"elemento": "viga", "tipo": "ativa", "limite": {"rel": 100000}}');
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await livre();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /FLECHA_ATIVA/);
      // 4) janela da viga: tabela de flechas com quatro linhas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const janela = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await janela.waitFor();
      assert.equal(await janela.locator('[data-flechas] tbody tr').count(), 4);
      assert.match(await janela.innerText(), /Ativa \(após as paredes\)/);
      await page.keyboard.press('Escape');
      // 5) memorial: etapas de carga e limites
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.locator('[data-memorial-flechas]').innerText(), /Desforma \(peso próprio\)/);
      assert.match(await memo.locator('[data-memorial-flechas]').innerText(), /ℓ\/500 e 1 cm/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_N2g_2 = {
    name: 'N2g: resistência ao fogo (grupo Incêndio, TRRF, revestimento, card do Dimensionamento, erros e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 120000 });
      const calcular = async () => {
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await livre();
      };
      await cmd('vento.definir {"ativo": false}');
      // 4 pilares 20×40 nos cantos; vigas 15×50 no contorno (grupo g_3); laje maciça de 12 cm nos painéis
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 5]], [[6, 5], [0, 5]], [[0, 5], [0, 0]]].map(([a, b]) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify([a, b])}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await calcular();
      // sem a verificação ligada: nenhum card de fogo
      assert.equal(await page.locator('[data-card-fogo]').count(), 0);
      // 1) grupo Incêndio: liga a verificação e informa ocupação e altura (sugestão pela IT)
      const g = await grupoEdif(page, 'Incêndio');
      await g.getByLabel('Verificar resistência ao fogo (NBR 15200)').check();
      await g.getByLabel('Ocupação (NBR 14432 / IT)').selectOption('D-1');
      assert.match(await g.innerText(), /Sugestão: TRRF de \d+ min/);
      assert.ok((await g.locator('[data-fogo-grupos] tbody tr').count()) >= 1);
      // 2) TRRF de 120 min no grupo g_3 (linha de comando) reprova as vigas: erro FOGO_TRRF
      await cmd('fogo.definir {"trrf": {"g_3": 120}}');
      await calcular();
      const lista = page.locator('[data-lista-erros]');
      await lista.locator('[data-contagem]').waitFor();
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /FOGO_TRRF/);
      // 3) card do Dimensionamento: elementos com TRRF, TRF e folga; as vigas não atendem
      const card = page.locator('[data-card-fogo]');
      await card.waitFor();
      assert.match(await card.innerText(), /TRRF \(min\)/);
      assert.ok((await card.locator('tbody tr', { hasText: 'viga' }).filter({ hasText: 'não atende' }).count()) >= 1);
      // 4) revestimento de 60 mm de argamassa de cimento e areia no grupo: as vigas passam a atender
      await cmd('fogo.definir {"revestimentos": {"g_3": {"material": "cimento", "espessura": 60}}}');
      await calcular();
      assert.equal(await card.locator('tbody tr', { hasText: 'viga' }).filter({ hasText: 'não atende' }).count(), 0);
      // 5) janela da viga pelo duplo clique no card
      await card.locator('tbody tr', { hasText: 'viga' }).first().dblclick();
      await page.getByRole('dialog', { name: /Resultados do elemento — Viga/ }).waitFor();
      await page.keyboard.press('Escape');
      // 6) memorial: seção Resistência ao fogo com a tabela por elemento
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mf = await memo.locator('[data-memorial-fogo]').innerText();
      assert.match(mf, /NBR 15200/);
      assert.match(mf, /Tabela 9 \(vigas contínuas ou de pórtico\)|Tabela 8 \(vigas biapoiadas\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7) desligar a verificação: o card some
      await g.getByLabel('Verificar resistência ao fogo (NBR 15200)').uncheck();
      await calcular();
      assert.equal(await page.locator('[data-card-fogo]').count(), 0);
    },
  };

export const f_N3 = {
    name: 'N3: biblioteca de normas (editar uma linha da tabela de TRRF, ver o resultado no grupo Incêndio, valor inválido, exportar e importar JSON, restaurar, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const g = await grupoEdif(page, 'Biblioteca de normas');
      await grupoEdif(page, 'Biblioteca de normas');
      await g.getByLabel(/^Norma/).selectOption('NBR 14432 / IT 06');
      const tabela = g.locator('table[data-tabela-norma="nbr14432.trrf-ocupacao"]');
      await tabela.waitFor();
      assert.match(await g.locator('[data-selos-norma]').innerText(), /de fábrica/);
      assert.match(await g.locator('[data-selos-norma]').innerText(), /a confirmar/);
      const inc = await grupoEdif(page, 'Incêndio');
      await grupoEdif(page, 'Incêndio');
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial(?! N3)/);
      // 1) altera a ocupação da primeira linha: selo "alterada" e a opção do grupo Incêndio muda
      await grupoEdif(page, 'Biblioteca de normas');
      const cel = g.getByLabel('Ocupação da linha 1', { exact: true });
      await cel.fill('Residencial N3'); await cel.press('Enter');
      await page.waitForFunction(() => /alterada pela obra/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      assert.match(await g.locator('summary').first().innerText(), /\(1 alterada\)/);
      await grupoEdif(page, 'Incêndio');
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial N3/);
      // 2) valor inválido num número: mensagem e nada gravado
      await grupoEdif(page, 'Biblioteca de normas');
      const num = g.getByLabel('S2 (subsolo > 10 m) da linha 1', { exact: true });
      await num.fill('abc'); await num.press('Enter');
      await g.locator('[data-erros-normas]').waitFor();
      assert.match(await g.locator('summary').first().innerText(), /\(1 alterada\)/);
      // 3) exporta a tabela, restaura e importa de volta
      const { name, text } = await downloadText(page, () => g.getByRole('button', { name: 'Exportar esta tabela', exact: true }).click());
      assert.match(name, /norma-nbr14432\.trrf-ocupacao\.json$/);
      const j = JSON.parse(text);
      assert.equal(j.formato, 'statikos-normas');
      assert.equal(j.tabelas['nbr14432.trrf-ocupacao'].linhas[0].ocupacao, 'Residencial N3');
      await g.getByRole('button', { name: 'Restaurar tabela de fábrica', exact: true }).click();
      await page.waitForFunction(() => /de fábrica/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      await grupoEdif(page, 'Incêndio');
      assert.match(await inc.getByLabel('Ocupação (NBR 14432 / IT)').innerText(), /A-1 — Residencial(?! N3)/);
      await grupoEdif(page, 'Biblioteca de normas');
      await g.getByLabel('Arquivo de normas').setInputFiles({ name: 'normas.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await page.waitForFunction(() => /alterada pela obra/.test(document.querySelector('[data-selos-norma]')?.textContent ?? ''));
      // arquivo inválido: mensagem
      await g.getByLabel('Arquivo de normas').setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{"formato": "outro"}') });
      await g.locator('[data-erros-normas]').waitFor();
      // 4) memorial lista a tabela como alterada pelo usuário
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mn = await memo.locator('[data-memorial-normas]').innerText();
      assert.match(mn, /TRRF por ocupação e altura[\s\S]*alterada pelo usuário/);
      assert.match(mn, /Catálogo SCAC|Estacas pré-moldadas/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 5) restaura a biblioteca toda
      await g.getByRole('button', { name: 'Restaurar toda a biblioteca', exact: true }).click();
      assert.doesNotMatch(await g.locator('summary').first().innerText(), /alterada/);
    },
  };
