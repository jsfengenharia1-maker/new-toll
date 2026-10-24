// Fluxos de interface — R (parte 1/2).
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { faixaAba, faixaCtx, grupoEdif, tab, downloadText, num, JPEG_TESTE, telaDe } from './helpers.mjs';

export const f_R1 = {
    name: 'R1: erros na planta, lista clicável, janela do elemento com diagramas, deslocamentos e CSV',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [7, 0], [7, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.19, "h": 0.19}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [7, 0]], [[0, 5], [7, 5]], [[0, 0], [0, 5]], [[7, 0], [7, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.12, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      // lista de erros: contagem e filtro por nível
      const lista = page.locator('[data-lista-erros]');
      const cont = await lista.locator('[data-contagem]').innerText();
      const nErros = parseInt(/(\d+) erro/.exec(cont)?.[1] ?? '0', 10);
      assert.ok(nErros > 0, `esperava erros, veio: ${cont}`);
      const linhasErro = await lista.locator('tbody tr.bad').count();
      assert.equal(linhasErro, nErros);
      await lista.getByLabel('Nível').selectOption('aviso');
      assert.equal(await lista.locator('tbody tr.bad').count(), 0);
      await lista.getByLabel('Nível').selectOption('erro');
      await lista.locator('details summary').click();
      assert.match(await lista.locator('details').innerText(), /BIELA|FLECHA|ARMADURA/);
      // clicar numa linha leva à planta com o elemento selecionado
      const alvo = lista.locator('tbody tr.click').first();
      const nomeAlvo = (await alvo.locator('td').first().innerText()).trim();
      await alvo.click();
      await page.locator('.planta-barra').waitFor();
      await faixaCtx(page);
      assert.equal(await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('button', { name: 'Resultados do elemento' }).isEnabled(), true);
      // a planta marca os reprovados (chave Mostrar erros ligada) e a chave desliga
      await faixaAba(page, 'Vista');
      const chave = page.getByLabel('Mostrar erros');
      assert.equal(await chave.isChecked(), true);
      await chave.uncheck();
      await chave.check();
      // janela do elemento pela planta
      await faixaCtx(page);
      await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('button', { name: 'Resultados do elemento' }).click();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento/ });
      await jan.waitFor();
      assert.match(await jan.getAttribute('aria-label'), new RegExp(nomeAlvo.split(' ').at(-1)));
      const txt = await jan.innerText();
      if (/^Viga/.test(nomeAlvo)) {
        for (const d of ['M', 'V', 'T']) assert.equal(await jan.locator(`svg[data-diagrama="${d}"]`).count(), 1);
        assert.ok(await jan.locator('svg[data-diagrama="M"] [data-extremo]').count() >= 1);
        assert.match(txt, /Combinações determinantes/i);
        assert.match(txt, /Mensagens/i);
      } else {
        assert.match(txt, /Mensagens/i);
      }
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.equal(await jan.count(), 0);
      // duplo clique numa linha da tabela de vigas abre a janela de uma viga, com diagramas e cabeçalhos
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      for (const d of ['M', 'V', 'T']) assert.equal(await jv.locator(`svg[data-diagrama="${d}"]`).count(), 1);
      assert.match(await jv.innerText(), /Momento fletor Md/i);
      await page.keyboard.press('Escape');
      assert.equal(await jv.count(), 0);
      // pilar: tabela das combinações determinantes
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr').first().dblclick();
      const jp = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jp.waitFor();
      const cab = await jp.locator('thead').first().innerText();
      assert.match(cab, /Nd \(kN\)/);
      assert.match(cab, /Md,tot u \/ v/);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // exportar CSV com separador ";" e vírgula decimal
      const csv = await downloadText(page, () => page.getByRole('button', { name: 'Exportar CSV' }).first().click());
      assert.match(csv.name, /listagem-edificio\.csv$/);
      const linhas = csv.text.replace('\ufeff', '').split(/\r?\n/).filter(Boolean);
      assert.match(linhas[0], /^Tipo;Elemento;Pavimento;/);
      assert.ok(linhas.some((l) => l.startsWith('Viga;')) && linhas.some((l) => l.startsWith('Pilar;')) && linhas.some((l) => l.startsWith('Laje;')));
      // deslocamentos na aba Análise
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Análise' }).click();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      const dl = page.locator('[data-deslocamentos]');
      await dl.waitFor({ timeout: 60000 });
      assert.match(await dl.innerText(), /ψ1 = 0,3/);
      assert.match(await dl.innerText(), /Tabela 13\.3/);
      assert.ok(await dl.locator('table[data-direcao]').count() >= 1);
      assert.match(await dl.locator('table').first().locator('thead').innerText(), /Entre pavimentos \(mm\)/);
      assert.ok(await dl.locator('tr[data-topo]').count() >= 1);
      // memorial: deslocamentos e erros e avisos
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Deslocamentos laterais do vento/);
      assert.match(mt, /Erros e avisos/);
      assert.match(mt, new RegExp(`${nErros} ${nErros === 1 ? 'erro' : 'erros'} e`));
    },
  };

export const f_R2 = {
    name: 'R2: edita a armadura de uma viga (2 φ8 reprova), restaura, bloqueia em lote e conta',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const calcular = async (nome) => {
        await page.getByRole('button', { name: nome }).click();
        await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      };
      await calcular('Calcular e dimensionar');
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      const linhaOk = cardVigas.locator('tbody tr', { hasText: /ok$/ }).first();
      assert.ok(await linhaOk.count() >= 1, 'esperava uma viga que atende');
      const nome = (await linhaOk.locator('td').first().innerText()).trim();
      await linhaOk.dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jan.waitFor();
      const ed = jan.locator('[data-editor-armadura="viga"]');
      assert.equal(await ed.locator('[data-bloqueada]').count(), 0);
      // arranjo calculado pré-preenchido (> 2 φ8) e área necessária visível
      const inf = ed.locator('[data-armadura="Inferior"]');
      assert.match(await inf.innerText(), /necessária/);
      await inf.getByLabel('Inferior (nº barras)').fill('2');
      await inf.getByLabel('Inferior (nº barras)').press('Enter');
      await inf.getByLabel('Bitola').selectOption('8');
      assert.match(await inf.locator('[data-as]').innerText(), /As efetiva 1,01 cm²/);
      await ed.getByRole('button', { name: 'Aplicar e bloquear' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await jan.locator('[data-editor-armadura="viga"] [data-bloqueada]').waitFor();
      assert.match(await jan.innerText(), /Armadura bloqueada insuficiente: inferior/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // a lista de erros mostra ARM_BLOQ e a tabela marca "bloq."
      const lista = page.locator('[data-lista-erros]');
      assert.ok(await lista.locator('tbody tr.bad', { hasText: 'ARM_BLOQ' }).count() >= 1);
      assert.ok(await cardVigas.locator('td[data-bloq]', { hasText: 'bloq.' }).count() >= 1);
      assert.match(await page.locator('[data-bloqueadas]').innerText(), /1 viga bloqueada/);
      // restaurar a calculada: volta a atender
      await cardVigas.locator('tbody tr', { hasText: nome }).first().dblclick();
      await jan.waitFor();
      await jan.getByRole('button', { name: 'Restaurar calculada' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await jan.locator('[data-editor-armadura="viga"]').waitFor();
      assert.equal(await jan.locator('[data-bloqueada]').count(), 0);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.equal(await lista.locator('tbody tr.bad', { hasText: 'ARM_BLOQ' }).count(), 0);
      assert.match(await cardVigas.locator('tbody tr', { hasText: nome }).first().innerText(), /ok$/);
      // bloqueio em lote de todos e contagem
      await page.getByRole('button', { name: 'Bloquear todos', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const nVigas = await cardVigas.locator('tbody tr').count();
      const txt = await page.locator('[data-bloqueadas]').innerText();
      assert.match(txt, new RegExp(`${nVigas} vigas bloqueadas`));
      const nLances = await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) }).locator('tbody tr').count();
      assert.match(txt, new RegExp(`${nLances} lances de pilar bloqueados`));
      assert.equal(await cardVigas.locator('td[data-bloq]', { hasText: 'bloq.' }).count(), nVigas);
      // memorial lista as armaduras bloqueadas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.textContent(), /Armaduras bloqueadas/);
      assert.match(await memo.textContent(), /só as verifica/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // desbloquear todos
      await page.getByRole('button', { name: 'Desbloquear todos', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      assert.match(await page.locator('[data-bloqueadas]').innerText(), /0 vigas bloqueadas/);
    },
  };

export const f_R3a = {
    name: 'R3a: detalhamento da viga (elevação, tabela de barras), resumo de aço com CSV e cópia de armadura',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const pronto = () => page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await pronto();
      // resumo de aço: total > 0 e CSV
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.waitFor();
      const totalTxt = await resumo.locator('tr[data-total-aco] td.num').nth(1).innerText();
      assert.ok(num(totalTxt) > 0, `peso total ${totalTxt}`);
      assert.match(await resumo.innerText(), /Perdas de 10,0 %/);
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.name, /\.csv$/);
      assert.match(csv.text, /Resumo de aço das vigas/);
      assert.match(csv.text, /Lista de barras/);
      assert.match(csv.text, /;N1;Passante;/);
      assert.match(csv.text, /Total;;/);
      // janela da viga, aba Detalhamento
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      const nVigas = await cardVigas.locator('tbody tr').count();
      assert.equal(nVigas, 4);
      const nomes = [];
      for (let i = 0; i < nVigas; i++) nomes.push((await cardVigas.locator('tbody tr').nth(i).locator('td').first().innerText()).trim());
      await cardVigas.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const svg = jan.locator('svg[data-detalhe]');
      await svg.waitFor();
      const nb = parseInt(await svg.getAttribute('data-barras'), 10);
      assert.ok(nb >= 2, `barras no desenho: ${nb}`);
      assert.equal(await svg.locator('g[data-barra]').count(), nb);
      assert.ok(parseInt(await svg.getAttribute('data-estribos'), 10) >= 1);
      assert.match(await svg.innerHTML(), /N1 – \d+ φ[\d,]+ – C = \d+,\d\d/);
      assert.ok(await svg.locator('rect[data-apoio]').count() >= 2);
      const tabela = jan.locator('table[data-tabela-barras]');
      assert.match(await tabela.innerText(), /N1/);
      assert.match(await tabela.innerText(), /Passante/);
      assert.match(await tabela.innerText(), /Estribo/);
      assert.ok(await jan.locator('svg[data-secao]').count() === 1);
      assert.ok(parseInt(await jan.locator('svg[data-secao]').getAttribute('data-barras-secao'), 10) >= 2);
      assert.match(await jan.innerText(), /lb inferior \(boa aderência\)\s*\d+ cm/);
      assert.match(await jan.innerText(), /lb superior\s*\d+ cm \((boa|má) aderência\)/);
      assert.ok(await jan.locator('[data-avisos-det]').count() === 1);
      // copiar armadura: bloqueia esta viga e copia para as outras
      await jan.getByRole('radio', { name: 'Resultados e armadura' }).click();
      assert.equal(await jan.locator('[data-copiar-armadura] button', { hasText: 'Copiar para…' }).count(), 0);
      await jan.locator('[data-editor-armadura="viga"]').getByRole('button', { name: 'Aplicar e bloquear' }).click();
      await pronto();
      await jan.locator('[data-editor-armadura="viga"] [data-bloqueada]').waitFor();
      await jan.getByRole('button', { name: 'Copiar para…' }).click();
      const lista = jan.locator('[data-lista-copia]');
      assert.equal(await lista.getByRole('checkbox').count(), 3);
      // R7f: só a viga paralela (mesmo vão) é elegível; as perpendiculares têm vão diferente e mostram o motivo da recusa
      assert.equal(await lista.locator('[data-motivo-copia]').count(), 2);
      assert.match(await lista.locator('[data-motivo-copia]').first().innerText(), /difere em \d+ cm/);
      assert.equal(await lista.locator('input:checked').count(), 1, 'só a elegível do mesmo grupo e seção vem marcada');
      await lista.getByRole('button', { name: /^Copiar para 1 viga$/ }).click();
      await pronto();
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.match(await page.locator('[data-bloqueadas]').innerText(), /2 vigas bloqueadas/);
      assert.equal(await cardVigas.locator('td[data-bloq]', { hasText: 'bloq.' }).count(), 2);
      // memorial: detalhamento das vigas e resumo de aço
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Detalhamento das vigas/);
      assert.match(mt, /Resumo de aço das vigas/);
      assert.match(mt, /detalhamento-vigas|Detalhamento\.\s*Vigas: armadura necessária/);
      assert.match(mt, new RegExp(`Viga ${nomes[0]} —`));
    },
  };

export const f_R3b = {
    name: 'R3b: prédio de 3 pavimentos-tipo, detalhamento do pilar (elevação, tabelas), resumo geral de aço e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('pavimento.repetir {"id": "pav_6", "vezes": 2}');
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      // resumo de aço: vigas, pilares e total geral
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.waitFor();
      const peso = async (m) => num(await resumo.locator(`tr[data-total-aco="${m}"] td.num`).nth(1).innerText());
      const pv = await peso('vigas'), pp = await peso('pilares'), pl = await peso('lajes'), pg = await peso('geral');
      assert.ok(pp > 0, `peso dos pilares ${pp}`);
      assert.ok(Math.abs(pg - (pv + pp + pl)) < 0.03, `geral ${pg} = vigas ${pv} + pilares ${pp} + lajes ${pl}`);
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.text, /Resumo de aço dos pilares/);
      assert.match(csv.text, /Resumo geral de aço/);
      assert.match(csv.text, /Lista de barras dos pilares/);
      // janela do pilar, aba Detalhamento
      const cardP = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: 'Pilares (por lance)' }) });
      await cardP.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Pilar/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const svg = jan.locator('svg[data-detalhe-pilar]');
      await svg.waitFor();
      const nb = parseInt(await svg.getAttribute('data-barras'), 10), nl = parseInt(await svg.getAttribute('data-lances'), 10);
      assert.ok(nb >= 1, `barras no desenho: ${nb}`);
      assert.ok(nl >= 3, `lances: ${nl}`);
      assert.equal(await svg.locator('g[data-barra]').count(), nb);
      assert.equal(await svg.locator('g[data-lance]').count(), nl);
      assert.match(await svg.innerHTML(), /N1 – \d+ φ[\d,]+ – C = \d+,\d\d/);
      assert.equal(await jan.locator('svg[data-barras-secao]').count(), nl);
      const tb = jan.locator('table[data-tabela-barras-pilar]');
      assert.match(await tb.innerText(), /N1/);
      assert.match(await tb.innerText(), /Longitudinal/);
      assert.equal(await jan.locator('table[data-tabela-estribos-pilar] tbody tr').count(), nl + 1);
      assert.match(await jan.innerText(), /lb – .* \(boa aderência\)\s*\d+ cm/);
      assert.ok(await jan.locator('[data-avisos-det]').count() === 1);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Detalhamento dos pilares/);
      assert.match(mt, /Resumo geral de aço/);
      assert.match(mt, /Total geral \(vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares\)/);
      assert.match(mt, /detalhamento-pilares|Detalhamento\.\s*Pilares/);
    },
  };

export const f_R4 = {
    name: 'R4: duas lajes contínuas, detalhamento da laje (planta SVG, tabela de posições), resumo geral de aço com lajes e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 4], [8, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]], [[8, 0], [8, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      // resumo de aço com lajes
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.waitFor();
      const peso = async (m) => num(await resumo.locator(`tr[data-total-aco="${m}"] td.num`).nth(1).innerText());
      const pv = await peso('vigas'), pp = await peso('pilares'), pl = await peso('lajes'), pg = await peso('geral');
      assert.ok(pl > 0, `peso das lajes ${pl}`);
      assert.ok(Math.abs(pg - (pv + pp + pl)) < 0.03, `geral ${pg} = ${pv} + ${pp} + ${pl}`);
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.text, /Resumo de aço das lajes/);
      assert.match(csv.text, /Resumo geral de aço \(vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares\)/);
      assert.match(csv.text, /Lista de posições das lajes/);
      // janela da laje, aba Detalhamento
      const cardL = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes/ }) });
      assert.ok(await cardL.locator('tbody tr').count() >= 2);
      await cardL.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Detalhamento' }).click();
      const svg = jan.locator('svg[data-detalhe-laje]');
      await svg.waitFor();
      const np = parseInt(await svg.getAttribute('data-posicoes'), 10);
      assert.ok(np >= 3, `posições no desenho: ${np}`);
      assert.equal(await svg.locator('g[data-pos]').count(), np);
      assert.ok(await svg.locator('g[data-pos][data-tipo="positiva"]').count() >= 2);
      assert.ok(await svg.locator('g[data-pos][data-tipo="negativa"]').count() >= 1, 'negativa sobre a borda contínua');
      assert.match(await svg.innerHTML(), /N1 – \d+ φ[\d,]+ c\/\d+ – C = \d+,\d\d/);
      assert.ok(await svg.locator('g[data-borda="continua"]').count() >= 1);
      const tb = jan.locator('table[data-tabela-posicoes-laje]');
      assert.match(await tb.innerText(), /Positiva/);
      assert.match(await tb.innerText(), /Negativa/);
      assert.equal(await tb.locator('tbody tr').count(), np + 1);
      // camadas: desligar as superiores deixa só as inferiores
      await jan.getByLabel('Superiores (negativas)').uncheck();
      assert.equal(await svg.locator('g[data-face="sup"]').count(), 0);
      assert.equal(parseInt(await svg.getAttribute('data-posicoes'), 10), await svg.locator('g[data-face="inf"]').count());
      await jan.getByLabel('Superiores (negativas)').check();
      assert.match(await jan.innerText(), /lb inferior \(boa aderência\)\s*\d+ cm/);
      assert.ok(await jan.locator('table[data-tabela-positivas-laje] tbody tr').count() === 2);
      assert.ok(await jan.locator('[data-avisos-det]').count() === 1);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // camada de armadura das lajes na planta
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await faixaAba(page, 'Vista');
      const camada = page.getByLabel('Armadura das lajes na planta');
      await camada.selectOption('inf');
      await page.waitForTimeout(300);
      await camada.selectOption('sup');
      await page.waitForTimeout(300);
      assert.ok(parseFloat(await page.locator('[data-frame-ms]').first().getAttribute('data-frame-ms')) < 50, 'quadro da planta com a camada de armadura');
      await camada.selectOption('nenhuma');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      // memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Detalhamento das lajes/);
      assert.match(mt, /Total geral \(vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares\)/);
      assert.match(mt, /detalhamento-lajes|Detalhamento\.\s*Lajes/);
    },
  };

export const f_R5 = {
    name: 'R5: pranchas de armação (vigas, pilares, lajes), locação com cargas e conjunto numerado; aviso sem cálculo; PDF',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 4], [8, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]], [[8, 0], [8, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('eixo.malha {"dx": [4, 4], "dy": [4]}');
      // sem cálculo: aviso claro nas pranchas de armação
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      await tipo.selectOption({ label: 'Armação de vigas' });
      await page.locator('[data-aviso-calculo="sem"]').waitFor();
      assert.equal(await page.locator('[data-lista-folhas]').count(), 0);
      // calcular e dimensionar
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const prev = page.locator('.prancha-prev');
      const lista = page.locator('[data-lista-folhas]');
      const peso = async () => parseFloat(await page.locator('[data-aco-folha]').getAttribute('data-aco-peso'));
      // armação de vigas
      await tipo.selectOption({ label: 'Armação de vigas' });
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-tipo'), 'vigas');
      assert.match(await prev.textContent(), /N1/);
      assert.ok((await peso()) > 0, 'peso de aço da folha de vigas');
      assert.match(await lista.innerText(), /SCV/);
      // armação de pilares
      await tipo.selectOption({ label: 'Armação de pilares' });
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-tipo'), 'pilares');
      assert.match(await prev.textContent(), /N1/);
      assert.match(await lista.innerText(), /SCP/);
      assert.ok((await peso()) > 0, 'peso de aço da folha de pilares');
      // armação de lajes
      await tipo.selectOption({ label: 'Armação de lajes' });
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-tipo'), 'lajes');
      assert.match(await prev.textContent(), /N1/);
      assert.match(await lista.innerText(), /SCL/);
      // locação e cargas
      await tipo.selectOption({ label: 'Locação e cargas' });
      await prev.locator('svg').waitFor();
      assert.equal(await prev.getAttribute('data-tipo'), 'locacao');
      assert.match(await prev.textContent(), /kN/);
      assert.match(await lista.innerText(), /SLP/);
      // opção de armação: escala das vigas muda a folha
      await page.locator('summary', { hasText: 'Opções de armação e locação' }).click();
      await tipo.selectOption({ label: 'Armação de vigas' });
      await page.getByLabel('Escala das vigas').selectOption({ label: '1:50' });
      await page.waitForFunction(() => /1:50/.test(document.querySelector('[data-lista-folhas]')?.textContent ?? ''));
      await page.getByLabel('Escala das vigas').selectOption({ label: '1:75' });
      // conjunto completo, numerado
      await tipo.selectOption({ label: 'Conjunto completo' });
      await prev.locator('svg').waitFor();
      const n = parseInt(await prev.getAttribute('data-total'), 10);
      assert.ok(n >= 5, `folhas do conjunto: ${n}`);
      assert.equal(await page.locator('[data-folha-item]').count(), n);
      assert.match(await prev.textContent(), /01\//);
      for (const sg of ['SLP', 'SCF', 'SCV', 'SCP', 'SCL']) assert.match(await lista.innerText(), new RegExp(sg));
      await page.getByRole('button', { name: 'Próxima folha' }).click();
      assert.equal(await prev.getAttribute('data-folha'), '2');
      assert.match(await prev.textContent(), /02\//);
      // exportar
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: rot }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const pdf = await baixar('PDF da folha');
      assert.match(pdf.nome, /-SCF-02\.pdf$/);
      assert.equal(pdf.dados.subarray(0, 5).toString('latin1'), '%PDF-');
      const todas = await baixar('PDF (todas)');
      assert.match(todas.nome, /-conjunto\.pdf$/);
      assert.ok(todas.dados.length > pdf.dados.length);
      const dxf = await baixar('DXF (zip de todas)');
      assert.match(dxf.nome, /-dxf\.zip$/);
      assert.equal(dxf.dados.subarray(0, 2).toString('latin1'), 'PK');
      // só dados de prancha: a revisão de cálculo não muda e as folhas de armação continuam
      await cmd('prancha.definir {"carimbo": {"responsavel": "Eng. Z"}}');
      await tipo.selectOption({ label: 'Armação de lajes' });
      await prev.getByText('Eng. Z').waitFor();
      assert.equal(await page.locator('[data-aviso-calculo]').count(), 0);
      assert.equal(await prev.getAttribute('data-tipo'), 'lajes');
      // modelo alterado: dimensionamento desatualizado, aviso
      await cmd('eixo.malha {"dx": [4, 4, 1], "dy": [4]}');
      await tipo.selectOption({ label: 'Armação de lajes' });
      await page.locator('[data-aviso-calculo="desatualizado"]').waitFor();
    },
  };

export const f_R6 = {
    name: 'R6: duas lajes treliçadas H12 contínuas, janela Vigotas (planta SVG, diagramas, tabela de grupos), bloqueio da armadura, resumo de aço com treliças e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 4], [8, 4]], [[0, 0], [0, 4]], [[4, 0], [4, 4]], [[8, 0], [8, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "trelicada", "modelo": "H12", "capa": 0.04}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      // resumo de aço: vigotas e treliças
      const resumo = page.locator('[data-resumo-aco]');
      await resumo.waitFor();
      const peso = async (m) => num(await resumo.locator(`tr[data-total-aco="${m}"] td.num`).nth(1).innerText());
      const pv = await peso('vigas'), pp = await peso('pilares'), pl = await peso('lajes'), pz = await peso('vigotas'), pg = await peso('geral');
      assert.ok(pz > 0, `peso das vigotas ${pz}`);
      assert.ok(Math.abs(pg - (pv + pp + pl + pz)) < 0.05, `geral ${pg} = ${pv} + ${pp} + ${pl} + ${pz}`);
      const tre = resumo.locator('table[data-tabela-trelicas]');
      assert.match(await tre.innerText(), /TR 12645/);
      assert.ok(num(await tre.locator('tr[data-total-trelicas] td.num').nth(0).innerText()) > 10, 'comprimento de treliça');
      assert.ok(num(await tre.locator('tr[data-total-trelicas] td.num').nth(1).innerText()) > 5, 'peso da treliça');
      const csv = await downloadText(page, () => resumo.getByRole('button', { name: 'Exportar CSV do aço' }).click());
      assert.match(csv.text, /Treliças eletrossoldadas por tipo/);
      assert.match(csv.text, /Resumo de aço das lajes treliçadas/);
      assert.match(csv.text, /Lajes treliçadas por grupo de igualação/);
      // janela da laje, aba Vigotas
      const cardL = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes/ }) });
      assert.ok(await cardL.locator('tbody tr').count() >= 2);
      await cardL.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Vigotas' }).click();
      const svg = jan.locator('svg[data-vigotas-laje]');
      await svg.waitFor();
      const nf = parseInt(await svg.getAttribute('data-faixas'), 10), ng = parseInt(await svg.getAttribute('data-grupos'), 10);
      assert.ok(nf >= 3, `faixas no desenho: ${nf}`);
      assert.ok(ng >= 1 && ng <= nf);
      // padrão: uma faixa representativa por grupo; a chave mostra todas
      assert.equal(parseInt(await svg.getAttribute('data-faixas-visiveis'), 10), ng, 'uma faixa por grupo');
      assert.equal(await svg.locator('g[data-faixa]').count(), ng);
      assert.ok(await svg.locator('[data-largura-grupo]').count() >= 1, 'largura do grupo indicada');
      assert.equal(await svg.locator('text[data-rotulo-grupo]').count(), ng);
      await jan.getByLabel('Mostrar todas as faixas').check();
      assert.equal(parseInt(await svg.getAttribute('data-faixas-visiveis'), 10), nf);
      assert.equal(await svg.locator('g[data-faixa]').count(), nf);
      assert.equal(await svg.locator('text[data-rotulo-grupo]').count(), ng);
      assert.ok(await svg.locator('line.vig-neg').count() >= 1, 'negativos sobre o apoio contínuo');
      const tb = jan.locator('table[data-tabela-grupos-vigotas]');
      assert.equal(await tb.locator('tbody tr').count(), ng);
      assert.match(await tb.innerText(), /G1/);
      // diagramas da vigota selecionada
      await svg.locator('g[data-faixa="1"]').click();
      const dg = jan.locator('[data-diagrama-vigota="1"]');
      await dg.waitFor();
      assert.equal(await dg.locator('svg[data-diagrama]').count(), 2);
      assert.ok(await dg.locator('g[data-ref="VRd1"]').count() >= 1, 'linha de VRd1');
      assert.match(await dg.innerText(), /VRd1 = \d+,\d/);
      assert.match(await jan.innerText(), /Peso da treliça \(por pavimento\)\s*\d+,\d\d kg/);
      assert.match(await jan.innerText(), /Distribuição na capa\s*φ[\d,]+ c\/\d+ cm/);
      // bloqueio com armadura adicional insuficiente reprova; desbloquear volta
      const ed = jan.locator('[data-editor-armadura="vigotas"]');
      const adicional = await tb.locator('tbody tr').first().locator('td').nth(10).innerText();
      await ed.getByRole('button', { name: 'Aplicar e bloquear' }).click();
      await jan.locator('[data-bloqueada]').first().waitFor({ timeout: 90000 });
      await ed.getByRole('button', { name: 'Desbloquear' }).click();
      await page.waitForFunction(() => !document.querySelector('[data-editor-armadura="vigotas"] [data-bloqueada]'), null, { timeout: 90000 });
      assert.ok(adicional.length > 0);
      // bloquear com 0 barras adicionais: ou atende (treliça basta) ou reprova com código na lista de erros
      const nInf = ed.locator('[data-armadura="Inferior"] input').first();
      await nInf.fill('0'); await nInf.press('Enter');
      await ed.getByRole('button', { name: 'Aplicar e bloquear' }).click();
      await jan.locator('[data-bloqueada]').first().waitFor({ timeout: 90000 });
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('[data-lista-erros] [data-contagem]').waitFor();
      const lista = await page.locator('[data-lista-erros]').innerText();
      const reprovou = /ARM_BLOQ|VIGOTA_POS/.test(lista);
      // desbloquear de novo
      await cardL.locator('tbody tr').first().dblclick();
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Vigotas' }).click();
      await jan.locator('[data-editor-armadura="vigotas"]').getByRole('button', { name: 'Desbloquear' }).click();
      await page.waitForFunction(() => !document.querySelector('[data-editor-armadura="vigotas"] [data-bloqueada]'), null, { timeout: 90000 });
      await jan.getByRole('button', { name: 'Fechar' }).click();
      assert.ok(reprovou, 'bloqueio com 0 barras adicionais deve reprovar (ARM_BLOQ ou VIGOTA_POS) na lista de erros');
      // camada de armadura das lajes na planta (inclui as treliçadas)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await faixaAba(page, 'Vista');
      const camada = page.getByLabel('Armadura das lajes na planta');
      await camada.selectOption('inf');
      await page.waitForTimeout(300);
      await camada.selectOption('sup');
      await page.waitForTimeout(300);
      assert.ok(parseFloat(await page.locator('[data-frame-ms]').first().getAttribute('data-frame-ms')) < 50, 'quadro da planta com a camada de armadura');
      await camada.selectOption('nenhuma');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      // memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mt = await memo.textContent();
      assert.match(mt, /Lajes treliçadas/);
      assert.match(mt, /Treliças eletrossoldadas \(por tipo\)/);
      assert.match(mt, /Total geral \(vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares\)/);
    },
  };

export const f_R7_0 = {
    name: 'R7-0: dividir, unir e prolongar viga pela planta e desfazer; copiar e espelhar; quadro de vigas colado; Ctrl+K e Enter repete; cores da planta; janela da viga com origem e face do pilar; logo no carimbo',
    async run({ newPage, tmp }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [10, 0], [0, 4], [5, 4], [10, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [10, 0]], [[0, 4], [10, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]], [[10, 0], [10, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await page.locator('.planta-cv[data-vista]').waitFor();
      const solta = () => page.evaluate(() => document.activeElement?.blur?.());
      const abrir = (t) => grupoEdif(page, t);
      await (await abrir('Ferramentas de lançamento')).getByLabel('Criar o pano a definir (?) ao fechar um contorno por vigas').uncheck(); // L7: este fluxo calcula sem definir panos
      await solta();
      const vigas = (n) => page.locator('summary', { hasText: new RegExp(`^Vigas — Tipo \\(${n}\\)`) }).waitFor();
      const clicar = async (x, y) => { const [sx, sy] = await telaDe(page, x, y); await page.mouse.click(sx, sy); };
      await vigas(5);
      // dividir a viga de 10 m no meio (tecla I) e desfazer/refazer
      await page.keyboard.press('i');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'dividir');
      await clicar(2.5, 0.02);
      await vigas(6);
      await page.keyboard.press('Control+z');
      await vigas(5);
      await page.keyboard.press('Control+y');
      await vigas(6);
      // unir as duas metades (tecla J): primeira e segunda viga
      await page.keyboard.press('j');
      await clicar(2, 0.02);
      await clicar(8, 0.02);
      await vigas(5);
      // prolongar (tecla O): viga de 4 m em y = 6 até x = 10 (ponto), e desfazer
      await cmd('viga.tracar {"grupo": "g_3", "pontos": [[0, 6], [4, 6]], "secao": {"b": 0.15, "h": 0.4}}');
      await vigas(6);
      await solta();
      await page.keyboard.press('o');
      await clicar(3.9, 6.02);
      await clicar(10, 6.5);
      await page.locator('.statusbar .msg', { hasText: 'ajustada' }).waitFor();
      const g = await abrir('Vigas — Tipo');
      const ultima = g.locator('table.quadro tbody tr').last();
      assert.equal((await ultima.locator('td.num').first().innerText()).trim(), '10,00');
      await solta();
      await page.keyboard.press('Control+z');
      await page.waitForFunction(() => [...document.querySelectorAll('details.group table.quadro tbody tr')].some((tr) => tr.textContent.includes('4,00')));
      // copiar o pilar P1 (tecla Y) com deslocamento digitado
      await page.keyboard.press('Escape');
      await abrir('Pilares');
      await page.getByLabel('x de P1').click();
      await solta();
      await page.keyboard.press('y');
      await page.keyboard.type('0;0'); await page.keyboard.press('Enter');
      await page.keyboard.type('@0;8'); await page.keyboard.press('Enter');
      await page.locator('summary', { hasText: 'Pilares (7)' }).waitFor();
      // espelhar (tecla H) o pilar selecionado pelo eixo x = 20: vai para x = 40
      await page.keyboard.press('h');
      await page.keyboard.type('20;0'); await page.keyboard.press('Enter');
      await page.keyboard.type('20;1'); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('input[aria-label="x de P1"]')?.value === '40,000');
      await page.keyboard.press('Control+z');
      await page.waitForFunction(() => document.querySelector('input[aria-label="x de P1"]')?.value === '0,000');
      // quadro de vigas colado do Excel (Tab entre colunas): uma nova e a V1 atualizada
      await page.getByLabel('Colar vigas do Excel').fill('V20\t15\t50\t0\t9\t10\t9\nV1\t20\t50\t0\t0\t10\t0');
      await page.getByRole('button', { name: 'Aplicar quadro de vigas' }).click();
      await vigas(7);
      assert.equal(await page.getByLabel('Seção de V1').inputValue(), '20x50');
      await solta();
      // Ctrl+K: ferramenta Pilar pela paleta; Esc volta a Selecionar; Enter repete a última
      await page.locator('canvas.int').hover();
      await page.keyboard.press('Control+k');
      const pal = page.getByRole('dialog', { name: 'Paleta de comandos' });
      await pal.waitFor();
      await pal.getByLabel('Buscar comando, pavimento ou elemento').fill('ferramenta pilar');
      await pal.getByLabel('Buscar comando, pavimento ou elemento').press('Enter');
      await pal.waitFor({ state: 'detached' });
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'pilar');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'selecionar');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('canvas.int').getAttribute('data-ferramenta'), 'pilar');
      await page.keyboard.press('Escape');
      // Ctrl+K executa um comando: detectar as lajes do grupo
      await page.keyboard.press('Control+k');
      await pal.getByLabel('Buscar comando, pavimento ou elemento').fill('detectar lajes');
      await pal.getByLabel('Buscar comando, pavimento ou elemento').press('Enter');
      await page.locator('summary', { hasText: /^Lajes — Tipo \([1-9]/ }).waitFor();
      // cores da planta editáveis (tema atual) e restaurar
      await faixaAba(page, 'Vista');
      await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('button', { name: /^Cores/ }).click();
      const cores = page.getByRole('dialog', { name: /Cores da planta/ });
      await cores.getByLabel('Cor: Vigas').fill('#ff0000');
      await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('button', { name: 'Cores (1)' }).waitFor();
      await cores.getByRole('button', { name: 'Restaurar as cores do tema' }).click();
      await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('button', { name: 'Cores', exact: true }).waitFor();
      await cores.getByRole('button', { name: 'Fechar' }).click();
      // remove as vigas soltas (y > 5) e a cópia do pilar por janela de cruzamento antes do cálculo
      await solta();
      await page.keyboard.press('s');
      const [ax, ay] = await telaDe(page, 12, 9.6), [zx, zy] = await telaDe(page, -1, 5.5);
      await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(zx, zy, { steps: 4 }); await page.mouse.up();
      await page.locator('.statusbar .msg', { hasText: '3 elemento(s) selecionado(s)' }).waitFor();
      await page.keyboard.press('Delete');
      await vigas(5);
      // janela da viga: origem dos resultados e momento na face dos pilares
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) }).locator('tbody tr').first().dblclick();
      const jv = page.getByRole('dialog', { name: /Resultados do elemento — Viga/ });
      await jv.waitFor();
      assert.ok(+(await jv.locator('[data-origens]').first().getAttribute('data-origens')) >= 4);
      assert.match(await jv.locator('[data-origens]').first().innerText(), /17\.2\.2/);
      assert.ok(+(await jv.locator('[data-faces]').getAttribute('data-faces')) >= 2);
      await page.keyboard.press('Escape');
      // logo no carimbo: aparece na prévia e vai no PDF como imagem JPEG
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const logo = join(tmp, 'logo.jpg');
      writeFileSync(logo, Buffer.from(JPEG_TESTE, 'base64'));
      await page.setInputFiles('input[aria-label="Imagem do logo"]', logo);
      await page.locator('[data-logo]:not([data-logo=""])').waitFor();
      await page.locator('.prancha-prev[data-estado="pronto"] svg image').waitFor();
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF da folha' }).click()]);
      assert.match(readFileSync(await dl.path()).toString('latin1'), /\/Filter \/DCTDecode[\s\S]*\/Logo Do/);
      const [dz] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'DXF R2000' }).click()]);
      assert.match(dz.suggestedFilename(), /\.zip$/); // DXF + logo.jpg
      await page.getByRole('button', { name: 'Remover logo' }).click();
      await page.locator('[data-logo=""]').waitFor();
    },
  };

export const f_R7a = {
    name: 'R7a: tabelas de armadura (bitola restrita muda a viga, tabela impossível gera FORA_TABELA com atalho, restaurar, exportar e importar JSON, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [5, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const calcular = async () => {
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 90000 });
        await page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 90000 });
      };
      await calcular();
      const cardVigas = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Vigas$/ }) });
      const antes = await cardVigas.locator('tbody tr').first().innerText();
      assert.ok(!/φ25/.test(antes), `esperava a viga sem φ25 antes da tabela: ${antes}`);
      // grupo Tabelas de armadura (fechado) e a aba de vigas
      const g = await grupoEdif(page, 'Tabelas de armadura');
      const tabela = g.locator('table[data-tabela="vigas"]');
      await tabela.waitFor();
      const chips = (rot) => g.getByRole('group', { name: rot });
      const so = async (rot, phi) => {
        const grupo = chips(rot);
        for (const t of ['8', '10', '12,5', '16', '20', '25', '32']) {
          const b = grupo.getByRole('button', { name: t, exact: true });
          const ligado = (await b.getAttribute('aria-pressed')) === 'true';
          if (ligado !== (t === phi)) await b.click();
        }
      };
      // só φ25 nos positivos e nos negativos do grupo 1 (b ≤ 20 cm): a viga passa a usar φ25
      await so('Positivos do grupo 1', '25');
      await so('Negativos do grupo 1', '25');
      assert.match(await g.locator('[data-tabelas-alteradas]').innerText(), /Vigas \(barras\): Padrão \(padrão alterada\)|Padrão/);
      await calcular();
      const depois = await cardVigas.locator('tbody tr').first().innerText();
      assert.match(depois, /φ25/);
      // tabela impossível (só φ8, 6 barras em uma camada): erro FORA_TABELA na lista e atalho que abre a tabela
      await so('Positivos do grupo 1', '8');
      const cam = g.getByLabel('Camadas positivos do grupo 1'), nmin = g.getByLabel('n mínimo positivos do grupo 1');
      await cam.fill('1'); await cam.press('Enter');
      await nmin.fill('6'); await nmin.press('Enter'); // 6 φ8 não cabem em uma camada de 20 cm
      await calcular();
      const lista = page.locator('[data-lista-erros]');
      const linhaErro = lista.locator('tbody tr.bad', { hasText: 'FORA_TABELA' }).first();
      await linhaErro.waitFor();
      assert.match(await linhaErro.innerText(), /Fora de tabela \(barras\)/);
      await g.locator('summary').click(); // fecha o grupo para ver o atalho abrir
      await linhaErro.locator('[data-atalho-tabela]').click();
      await page.waitForFunction(() => document.querySelector('[data-grupo-tabelas] details')?.open === true);
      assert.equal(await g.locator('table[data-tabela="vigas"]').count(), 1);
      // restaurar a padrão de fábrica: some o erro e a lista de alteradas
      await g.getByRole('button', { name: 'Restaurar a padrão de fábrica' }).click();
      assert.equal(await g.locator('[data-tabelas-alteradas]').count(), 0);
      await calcular();
      assert.equal(await lista.locator('tbody tr.bad, tbody tr.warn', { hasText: 'FORA_TABELA' }).count(), 0);
      assert.ok(!/φ25/.test(await cardVigas.locator('tbody tr').first().innerText()));
      // altera de novo, exporta o JSON, restaura e importa de volta
      await so('Positivos do grupo 1', '20');
      const { name, text } = await downloadText(page, () => g.getByRole('button', { name: 'Exportar JSON' }).click());
      assert.match(name, /tabelas-armadura.*\.json$/);
      const j = JSON.parse(text);
      assert.equal(j.formato, 'statikos-tabelas-armadura');
      assert.equal(j.tabelas[0].tipo, 'vigas');
      assert.deepEqual(j.tabelas[0].tabela.linhas[0].pos.bitolas, [20]);
      await g.getByRole('button', { name: 'Restaurar a padrão de fábrica' }).click();
      assert.equal(await g.locator('[data-tabelas-alteradas]').count(), 0);
      await g.getByLabel('Arquivo de tabelas de armadura').setInputFiles({ name: 'tabelas.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await g.locator('[data-tabelas-alteradas]').waitFor();
      // arquivo inválido: mensagem e nada importado
      await g.getByLabel('Arquivo de tabelas de armadura').setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{"formato": "outro"}') });
      await g.locator('[data-erros-importacao]').waitFor();
      // duplicar como nova tabela, remover e as abas dos outros elementos
      await g.getByRole('button', { name: 'Duplicar como nova tabela' }).click();
      assert.match(await g.locator('select').first().innerText(), /\(cópia\)/);
      await g.getByRole('button', { name: 'Remover tabela' }).click();
      for (const [aba, t] of [['Estribos de vigas', 'estribos'], ['Pilares', 'pilares'], ['Lajes', 'lajes']]) {
        await g.getByRole('radio', { name: aba, exact: true }).click();
        await g.locator(`[data-tabela="${t}"]`).waitFor();
      }
      // memorial: seção das tabelas alteradas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      assert.match(await memo.textContent(), /Tabelas de armadura/);
      assert.match(await memo.textContent(), /Tolerância de simetria da armadura dos pilares: 0 %/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };
