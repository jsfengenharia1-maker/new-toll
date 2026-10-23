// Fluxos de interface — E (parte 2/2).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { grupoEdif, tab, downloadText, telaDe } from './helpers.mjs';

export const f_E2c = {
    name: 'E2c: viga inclinada entre pavimentos (lançamento, ligação, carga, resultados, armadura bloqueada e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.4, "h": 0.4}}}`).join(', ') + ']}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares?.length === 2, null);
      // 1. janela pela paleta (Ctrl+K); lançamento do Tipo 1 ao Tipo 2, de P1 a P2
      const abrir = async () => {
        await page.locator('#edcmd').blur();
        await page.keyboard.press('Control+k');
        await page.getByRole('dialog').getByRole('textbox').fill('Vigas inclinadas');
        await page.keyboard.press('Enter');
        const j = page.getByRole('dialog', { name: 'Vigas inclinadas', exact: true });
        await j.waitFor();
        return j;
      };
      let jan = await abrir();
      await jan.getByLabel(/^Centro do pilar da ponta inicial/).selectOption({ label: 'P1' });
      await jan.getByLabel(/^Centro do pilar da ponta final/).selectOption({ label: 'P2' });
      for (const [rot, v] of [[/^Lançar: largura b/, '25'], [/^Lançar: altura h/, '60']]) { const c = jan.getByLabel(rot); await c.fill(v); await c.press('Enter'); }
      await jan.getByRole('button', { name: 'Lançar viga inclinada', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.length === 1, null);
      let m = await modelo(), vi = m.vigasInclinadas[0];
      assert.equal(vi.nome, 'VI1');
      assert.deepEqual(vi.pIni, [0, 0]);
      assert.deepEqual(vi.pFim, [8, 0]);
      assert.deepEqual(vi.secao, { b: 0.25, h: 0.6 });
      assert.equal(m.pavimentos.find((p) => p.id === vi.pavIni).nome, 'Tipo 1');
      assert.equal(m.pavimentos.find((p) => p.id === vi.pavFim).nome, 'Tipo 2');
      await jan.locator('[data-inclinadas-lista]').getByText('Tipo 1 → Tipo 2', { exact: true }).waitFor();
      // 2. ligação articulada na ponta inicial, desnível e uma carga linear de 20 kN/m
      await jan.getByLabel(/^Ligação da ponta inicial/).selectOption('articulada');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.[0]?.ligIni === 'articulada', null);
      const valor = jan.getByLabel(/^Valor da carga/);
      await valor.fill('20'); await valor.press('Enter');
      await jan.getByRole('button', { name: 'Acrescentar a carga', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.[0]?.cargas?.length === 1, null);
      vi = (await modelo()).vigasInclinadas[0];
      assert.deepEqual([vi.cargas[0].caso, vi.cargas[0].tipo, vi.cargas[0].valor], ['G', 'linear', 20]);
      assert.match(await jan.locator('[data-inclinada-resultados]').innerText(), /Calcule o edifício/);
      await page.keyboard.press('Escape');
      // 3. cálculo e resultados: armadura, esbeltez, desenho e envoltória
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      jan = await abrir();
      const res = jan.locator('[data-inclinada-resultados]');
      await res.locator('[data-inclinada-desenho]').waitFor();
      const txt = await res.innerText();
      assert.match(txt, /Flambagem: ℓe = \d+,\d+ m \(vertical, λ = \d+\)/);
      assert.match(txt, /Armadura: \d+φ[\d,]+ sup \+ \d+φ[\d,]+ inf/);
      assert.match(txt, /ligações articulada \/ engastada/);
      await res.getByRole('button', { name: 'Detalhe das seções de VI1 (Tipo 1 → Tipo 2)', exact: true }).click();
      assert.equal(await res.locator('[data-inclinada-envoltoria] tbody tr').count(), 21);
      await res.getByRole('button', { name: 'Listagem de VI1 (Tipo 1 → Tipo 2)', exact: true }).click();
      const lis = res.locator('[data-inclinada-listagem]');
      await lis.waitFor();
      assert.match(await lis.innerText(), /Materiais: C30, aço CA-50/);
      assert.ok((await lis.locator('tbody tr').count()) === 21);
      // 4. armadura bloqueada (4φ16 em cima, 4φ20 embaixo): a janela passa a mostrar "(bloqueada)"
      for (const [rot, v] of [[/^Barras superiores/, '4'], [/^Barras inferiores/, '4']]) { const c = jan.getByLabel(rot); await c.fill(v); await c.press('Enter'); }
      await jan.getByLabel(/^Bitola das superiores/).selectOption({ label: 'φ16' });
      await jan.getByLabel(/^Bitola das inferiores/).selectOption({ label: 'φ20' });
      await jan.getByRole('button', { name: 'Bloquear a armadura', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.[0]?.armadura?.inf?.phi === 20, null);
      vi = (await modelo()).vigasInclinadas[0];
      assert.deepEqual([vi.armadura.sup, vi.armadura.inf], [{ n: 4, phi: 16 }, { n: 4, phi: 20 }]);
      await res.getByText('(bloqueada)', { exact: false }).waitFor({ timeout: 60000 });
      await jan.getByRole('button', { name: 'Redimensionar esta viga inclinada', exact: true }).click();
      await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigasInclinadas?.[0]?.armadura, null);
      await page.keyboard.press('Escape');
      // 5. memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mi = memo.locator('[data-memorial-inclinadas]');
      await mi.waitFor();
      assert.match(await mi.locator('[data-memorial-inclinadas-tabela="lista"]').innerText(), /VI1[\s\S]*Tipo 1 → Tipo 2[\s\S]*25×60 cm/);
      assert.match(await mi.innerText(), /nós de extremidade/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_E3a = {
    name: 'E3a: tipos de laje (copiar a ficha de exemplo, erro lógico, enchimento, atribuir em cascata, exportar e importar JSON, ficha em uso, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
      await cmd('lote {"comandos": [' + [[0, 0], [5, 0], [0, 4], [5, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      const g = await grupoEdif(page, /^Tipos de laje/);
      // 1) a ficha de exemplo é fictícia e somente leitura; copiar dá uma ficha editável
      await g.getByLabel(/^Ficha de vigotas/).selectOption({ label: 'Armada exemplo (fictícia) · exemplo fictício' });
      assert.match(await g.locator('[data-selos-ficha]').innerText(), /somente leitura/);
      assert.match(await g.locator('[data-selos-ficha]').innerText(), /fictícia/);
      await g.getByRole('button', { name: 'Copiar ficha', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.fichas?.length === 1, null);
      assert.match(await g.locator('[data-selos-ficha]').innerText(), /editável/);
      // 2) erro lógico: Mu positivo abaixo de Mfis
      await g.getByRole('radio', { name: 'Positivo', exact: true }).click();
      const mu = g.getByLabel(/^Mu positivo/);
      assert.equal((await mu.inputValue()).replace(',', '.'), '6');
      await mu.fill('1'); await mu.press('Enter');
      await g.locator('[data-erros-ficha]').waitFor();
      assert.match(await g.locator('[data-erros-ficha]').innerText(), /maior que Mfis/);
      await mu.fill('6'); await mu.press('Enter');
      await g.locator('[data-erros-ficha]').waitFor({ state: 'detached' });
      // 3) enchimento genérico da biblioteca
      await g.getByRole('button', { name: 'Novo enchimento', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.enchimentos?.length === 1, null);
      const pe = g.getByLabel(/^Peso do enchimento genérico/);
      await pe.fill('0,6'); await pe.press('Enter');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.enchimentos?.[0]?.pesoM2 === 0.6, null);
      // 4) atribuir em cascata no grupo Lajes e preencher os panos
      const lj = await grupoEdif(page, /^Lajes/);
      await lj.locator('label.field', { has: page.locator('.flabel', { hasText: /^Tipo$/ }) }).locator('select').selectOption('vigotas');
      await lj.getByLabel(/^Fabricante \(filtro\)/).selectOption('Fictício');
      const copia = (await modelo()).tiposLaje.fichas[0];
      await lj.getByLabel(/^Ficha da laje/).selectOption(copia.id);
      await lj.getByLabel(/^Série da laje/).selectOption('A12');
      await lj.getByRole('button', { name: 'Preencher todos os panos', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.tipo?.tipo === 'vigotas', null);
      assert.equal((await modelo()).lajes[0].tipo.serie, 'A12');
      // 5) a ficha em uso não pode ser removida
      await grupoEdif(page, /^Tipos de laje/);
      await g.getByRole('button', { name: 'Remover ficha', exact: true }).click();
      await g.locator('[data-erros-tipos-laje]').waitFor();
      assert.match(await g.locator('[data-erros-tipos-laje]').innerText(), /usada por lajes/);
      // 6) exportar e importar JSON
      const { name, text } = await downloadText(page, () => g.getByRole('button', { name: 'Exportar tipos de laje', exact: true }).click());
      assert.match(name, /tipos-laje\.json$/);
      const j = JSON.parse(text);
      assert.equal(j.formato, 'statikos-tipos-laje');
      assert.equal(j.fichas.length, 1);
      assert.equal(j.enchimentos.length, 1);
      await g.getByLabel('Importar JSON de tipos de laje', { exact: true }).setInputFiles({ name: 'tipos.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await page.waitForFunction(() => /importados/.test(document.querySelector('.statusbar .msg')?.textContent ?? ''), null, { timeout: 20000 });
      await g.getByLabel('Importar JSON de tipos de laje', { exact: true }).setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{"formato": "outro"}') });
      await g.locator('[data-erros-tipos-laje]').waitFor();
      // 7) cálculo e memorial com a tabela da ficha
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const tab = memo.locator(`[data-memorial-ficha="${copia.id}"]`);
      await tab.waitFor();
      assert.match(await tab.innerText(), /fictícia/);
      assert.match(await tab.innerText(), /A12/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_E2d = {
    name: 'E2d: diagonais de contraventamento (lançamento em X, atribuir, nó no cruzamento, resultados e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.4, "h": 0.4}}}`).join(', ') + ']}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.pilares?.length === 2, null);
      // 1. janela pela paleta (Ctrl+K); primeira diagonal do Tipo 1 ao Tipo 2, de P2 a P1
      const abrir = async () => {
        await page.locator('#edcmd').blur();
        await page.keyboard.press('Control+k');
        await page.getByRole('dialog').getByRole('textbox').fill('Diagonais de contraventamento');
        await page.keyboard.press('Enter');
        const j = page.getByRole('dialog', { name: 'Diagonais de contraventamento', exact: true });
        await j.waitFor();
        return j;
      };
      let jan = await abrir();
      await jan.getByLabel(/^Diagonal: centro do pilar do extremo inicial/).selectOption({ label: 'P2' });
      await jan.getByLabel(/^Diagonal: centro do pilar do extremo final/).selectOption({ label: 'P1' });
      for (const [rot, v] of [[/^Diagonal: largura b/, '25'], [/^Diagonal: altura h/, '40']]) { const c = jan.getByLabel(rot); await c.fill(v); await c.press('Enter'); }
      await jan.getByRole('button', { name: 'Lançar diagonal', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.diagonais?.length === 1, null);
      let m = await modelo(), d1 = m.diagonais[0];
      assert.equal(d1.nome, 'D1');
      assert.deepEqual(d1.pIni, [8, 0]);
      assert.deepEqual(d1.pFim, [0, 0]);
      assert.deepEqual(d1.secao, { b: 0.25, h: 0.4 });
      assert.equal(m.pavimentos.find((p) => p.id === d1.pavIni).nome, 'Tipo 1');
      assert.equal(m.pavimentos.find((p) => p.id === d1.pavFim).nome, 'Tipo 2');
      await jan.locator('[data-diagonais-lista]').getByText('Tipo 1 → Tipo 2', { exact: true }).waitFor();
      // 2. segunda diagonal em sentido oposto (forma o X), com o extremo final articulado
      await jan.getByLabel(/^Diagonal: centro do pilar do extremo inicial/).selectOption({ label: 'P1' });
      await jan.getByLabel(/^Diagonal: centro do pilar do extremo final/).selectOption({ label: 'P2' });
      await jan.getByLabel(/^Diagonal: ligação do extremo final/).selectOption('articulada');
      await jan.getByRole('button', { name: 'Lançar diagonal', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.diagonais?.length === 2, null);
      m = await modelo();
      const d2 = m.diagonais[1];
      assert.equal(d2.nome, 'D2');
      assert.deepEqual([d2.pIni, d2.pFim, d2.ligFim], [[0, 0], [8, 0], 'articulada']);
      // 3. edita a seção da D2 (a recém-lançada está selecionada) e atribui os dados da D1
      const larg = jan.getByLabel(/^Seção da diagonal: largura b/);
      await larg.fill('30'); await larg.press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.diagonais?.[1]?.secao?.b === 0.3, null);
      await jan.getByLabel(/^Dados de outra diagonal/).selectOption({ label: 'D1' });
      await jan.getByRole('button', { name: 'Atribuir os dados da diagonal', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.diagonais?.[1]?.secao?.b === 0.25, null);
      m = await modelo();
      assert.deepEqual(m.diagonais[1].secao, { b: 0.25, h: 0.4 });
      assert.equal(m.diagonais[1].ligFim, undefined);
      assert.match(await jan.locator('[data-diagonal-resultados]').innerText(), /Calcule o edifício/);
      await page.keyboard.press('Escape');
      // 4. cálculo e resultados: nó no cruzamento, flambagem pelo comprimento total, armadura, desenho e envoltória
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'Análise concluída' }).waitFor({ timeout: 120000 });
      jan = await abrir();
      const res = jan.locator('[data-diagonal-resultados]');
      await res.locator('[data-diagonal-desenho]').waitFor();
      const txt = await res.innerText();
      assert.match(txt, /Flambagem: ℓe = \d+,\d+ m \(vertical, λ = \d+\)/);
      assert.match(txt, /Armadura: \d+φ[\d,]+ sup \+ \d+φ[\d,]+ inf/);
      assert.match(await res.locator('[data-diagonal-cruzamento]').innerText(), /nó gerado no cruzamento com outra diagonal/);
      assert.equal(await jan.locator('[data-diagonais-lista] tbody tr').count(), 2);
      await res.getByRole('button', { name: /^Detalhe das seções da diagonal D\d/ }).click();
      assert.ok((await res.locator('[data-diagonal-envoltoria] tbody tr').count()) > 21); // estações dos dois trechos
      await res.getByRole('button', { name: /^Listagem da diagonal D\d/ }).click();
      const lis = res.locator('[data-diagonal-listagem]');
      await lis.waitFor();
      assert.match(await lis.innerText(), /Materiais: C30, aço CA-50/);
      await page.keyboard.press('Escape');
      // 5. memorial
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mi = memo.locator('[data-memorial-diagonais]');
      await mi.waitFor();
      assert.match(await mi.locator('[data-memorial-diagonais-tabela="lista"]').innerText(), /D1[\s\S]*Tipo 1 → Tipo 2[\s\S]*25×40 cm/);
      assert.match(await mi.innerText(), /nós de extremidade/);
      assert.match(await mi.innerText(), /cruzamento/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 6. remover a D2 pela janela
      jan = await abrir();
      await jan.getByRole('button', { name: 'Editar D2', exact: true }).click();
      await jan.getByRole('button', { name: 'Remover a diagonal', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.diagonais?.length === 1, null);
      await page.keyboard.press('Escape');
    },
  };

export const f_E2e = {
    name: 'E2e: consolos curtos (lançar, editar, resultados e relatório, armadura bloqueada), vínculo externo e pré-moldada da viga, memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 180000 });
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 4], [0, 4]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[6, 0], [6, 4]], [[6, 4], [0, 4]], [[0, 4], [0, 0]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('opcoes.definir {"valores": {"modeloGlobal": 0}}');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 1, null);
      const abrir = async () => {
        await page.locator('#edcmd').blur();
        await page.keyboard.press('Control+k');
        await page.getByRole('dialog').getByRole('textbox').fill('Consolos curtos');
        await page.keyboard.press('Enter');
        const j = page.getByRole('dialog', { name: 'Consolos curtos', exact: true });
        await j.waitFor();
        return j;
      };
      const calcular = async () => {
        await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
        await livre();
      };
      // 1. lança o consolo na ponta inicial de V1 (y = 0): o pilar P1 vem sugerido
      let jan = await abrir();
      await jan.getByLabel(/^Consolo: viga apoiada/).selectOption({ label: 'V1' });
      await jan.getByLabel(/^Consolo: ponta da viga/).selectOption('ini');
      await jan.getByRole('button', { name: 'Lançar consolo', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.length === 1, null);
      let m = await modelo();
      const c1 = m.consolos[0];
      assert.equal(c1.nome, 'C1');
      assert.equal(c1.ponta, 'ini');
      assert.equal(m.pilares.find((p) => p.id === c1.pilar).nome, 'P1');
      assert.equal(m.vigas.find((v) => v.id === c1.viga).nome, 'V1');
      await jan.locator('[data-consolos-lista]').getByText('não calculado', { exact: true }).waitFor();
      // 2. edita a altura na face (55 cm) e a distância a (25 cm)
      const alt = jan.getByLabel(/^Geometria do consolo: altura h na face/);
      await alt.fill('55'); await alt.press('Enter');
      await esperar(() => Math.abs(JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.h - 0.55) < 1e-9, null);
      const hpp = jan.getByLabel(/^Geometria do consolo: altura na ponta/);
      await hpp.fill('30'); await hpp.press('Enter');
      await esperar(() => Math.abs(JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.hp - 0.3) < 1e-9, null);
      const da = jan.getByLabel(/^Geometria do consolo: distância a/);
      await da.fill('25'); await da.press('Enter');
      await esperar(() => Math.abs(JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.a - 0.25) < 1e-9, null);
      assert.match(await jan.locator('[data-consolo-resultados]').innerText(), /Calcule o edifício/);
      await page.keyboard.press('Escape');
      // 3. V3 do lado x = 6 com vínculo externo e V4 pré-moldada: editor da viga
      const gvigas = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Vigas — / }) });
      await gvigas.locator(':scope > summary').click();
      await grupoEdif(page, 'Vínculos, flambagem e cobrimento');
      const editor = async (i) => {
        await gvigas.locator('table.quadro tbody tr').nth(i).locator('td').nth(3).click();
        const sv = page.locator('[data-vinculo-premoldada]');
        await sv.waitFor();
        return sv;
      };
      let vp = await editor(2);
      await vp.getByLabel(/^Vínculo externo da viga/).selectOption('articulacao');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V3')?.vinculoExterno === 'articulacao', null);
      vp = await editor(3);
      await vp.getByLabel(/^Viga pré-moldada/).selectOption('armada');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V4')?.premoldada?.tipo === 'armada', null);
      const ic = vp.getByLabel(/^Içamento: distância dos pontos/);
      await ic.fill('80'); await ic.press('Enter');
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas.find((v) => v.nome === 'V4')?.premoldada?.icamento === 0.8, null);
      // 4. cálculo e resultados do consolo
      await calcular();
      jan = await abrir();
      const res = jan.locator('[data-consolo-resultados]');
      await res.locator('[data-consolo-desenho]').waitFor();
      const txt = await res.innerText();
      assert.match(txt, /consolo (curto|muito curto|longo) \(a\/d = \d+,\d+\)/);
      assert.match(txt, /Vd = \d+,\d kN/);
      assert.match(txt, /Tirante: Rst = \d+,\d kN/);
      assert.match(txt, /Contato no aparelho: \d+,\d MPa/);
      await res.getByRole('button', { name: /^Relatório do consolo C1/ }).click();
      const rel = res.locator('[data-consolo-relatorio]');
      await rel.waitFor();
      assert.match(await rel.innerText(), /Consolo C1 \(/);
      // 5. aparelho pequeno reprova (vermelho e erro), armadura bloqueada e redimensionar
      const apl = jan.getByLabel(/^Aparelho do consolo: comprimento l/), apb = jan.getByLabel(/^Aparelho do consolo: largura/);
      await apl.fill('2'); await apl.press('Enter');
      await apb.fill('2'); await apb.press('Enter');
      await esperar(() => { const a = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.aparelho; return a && Math.abs(a.l - 0.02) < 1e-9 && Math.abs(a.b - 0.02) < 1e-9; }, null);
      await page.keyboard.press('Escape');
      await calcular();
      jan = await abrir();
      assert.match(await jan.locator('[data-consolos-lista]').innerText(), /não atende/);
      assert.equal(await jan.locator('[data-consolo-linha].bad').count(), 1);
      assert.match(await jan.locator('[data-consolo-erros]').innerText(), /Consolo: tensão de contato sob o aparelho/);
      await jan.getByLabel(/^Tirante do consolo: barras/).fill('3');
      await jan.getByLabel(/^Tirante do consolo: barras/).press('Enter');
      await jan.getByRole('button', { name: 'Fixar a armadura do consolo', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.armadura?.tirante?.n === 3, null);
      await page.keyboard.press('Escape');
      await calcular();
      jan = await abrir();
      assert.match(await jan.locator('[data-consolo-resultados]').innerText(), /\(bloqueada\)/);
      await jan.getByRole('button', { name: 'Redimensionar o consolo', exact: true }).click();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.armadura === undefined, null);
      await jan.getByLabel(/^Aparelho do consolo: comprimento l/).fill('20'); await jan.getByLabel(/^Aparelho do consolo: comprimento l/).press('Enter');
      await jan.getByLabel(/^Aparelho do consolo: largura/).fill('20'); await jan.getByLabel(/^Aparelho do consolo: largura/).press('Enter');
      await esperar(() => { const a = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.[0]?.aparelho; return a && Math.abs(a.l - 0.2) < 1e-9; }, null);
      await page.keyboard.press('Escape');
      await calcular();
      // 6. memorial: consolos, vínculo externo e pré-moldadas
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mc = memo.locator('[data-memorial-consolos]');
      await mc.waitFor();
      assert.match(await mc.locator('[data-memorial-consolos-tabela="consolos"]').innerText(), /C1[\s\S]*P1 \/ V1/);
      assert.match(await mc.locator('[data-memorial-consolos-tabela="vinculo-externo"]').innerText(), /V3[\s\S]*articulação/);
      assert.match(await mc.locator('[data-memorial-consolos-tabela="premoldadas"]').innerText(), /V4[\s\S]*armada/);
      assert.match(await mc.innerText(), /atrito-cisalhamento/);
      assert.match(await mc.innerText(), /a ser confirmad|a confirmar|ver pendências/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7. remover o consolo pela janela
      jan = await abrir();
      await jan.getByRole('button', { name: 'Remover o consolo', exact: true }).click();
      await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.consolos?.length, null);
      await page.keyboard.press('Escape');
    },
  };

export const f_E3b = {
    name: 'E3b: vigotas por ficha (lista vigota a vigota, painéis, edição das selecionadas, dupla, esforços atribuídos, relatório, erro em vermelho), exposição e momentos mínimos por pano e memorial',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000 });
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [8, 0], [0, 5], [4, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "vigotas", "ficha": "ex:armada", "serie": "A12"}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const cardL = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes/ }) });
      const abrir = async () => {
        await cardL.locator('tbody tr').first().dblclick();
        const j = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
        await j.waitFor();
        await j.getByRole('radio', { name: 'Vigotas', exact: true }).click();
        await j.locator('[data-vigotas-ficha]').waitFor();
        return j;
      };
      let jan = await abrir();
      // 1) vigota a vigota: planta com as vigotas reais e a lista
      const nVig = parseInt(await jan.locator('svg[data-vigotas-individuais]').first().getAttribute('data-n-vigotas'), 10);
      assert.equal(nVig, 10, `vigotas reais ${nVig}`);
      const linhas = jan.locator('table[data-tabela-vigotas] tbody tr');
      assert.equal(await linhas.count(), nVig);
      assert.match(await linhas.first().innerText(), /A1/);
      // painéis da vigota selecionada
      const painel = jan.locator('[data-painel-vigota]');
      assert.match(await painel.innerText(), /Tipo da série\s*A1/);
      await painel.getByRole('radio', { name: 'Negativo', exact: true }).click();
      assert.match(await painel.innerText(), /Mu da seção típica \/ maciça/);
      await painel.getByRole('radio', { name: 'Flecha', exact: true }).click();
      assert.match(await painel.innerText(), /Flecha total/);
      // 2) seleção em intervalo e edição em lote (tipo A2 nas vigotas 2 a 4)
      await linhas.nth(1).click();
      await linhas.nth(3).click({ modifiers: ['Shift'] });
      const ed = jan.locator('[data-editor-vigotas-ficha]');
      assert.match(await ed.innerText(), /Editar as vigotas selecionadas \(3\)/);
      await ed.getByLabel(/^Tipo da série/).selectOption('A2');
      await ed.getByRole('button', { name: 'Aplicar às vigotas selecionadas', exact: true }).click();
      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).some((l) => (l.edicaoVigotas ?? []).length === 3), null);
      await page.waitForFunction(() => document.querySelectorAll('[data-vigota-linha]').length === 10 && /A2/.test(document.querySelectorAll('[data-vigota-linha]')[2].textContent ?? ''), null, { timeout: 60000 });
      assert.match(await linhas.nth(2).innerText(), /✎/);
      // 3) vigota dupla na vigota 7 (a ficha de exemplo admite até a tripla): uma vigota a menos na lista
      await linhas.nth(6).click();
      await ed.getByLabel(/^Vigotas lado a lado/).selectOption('2');
      await ed.getByRole('button', { name: 'Aplicar à primeira vigota selecionada', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('[data-vigota-linha]').length === 9, null, { timeout: 60000 });
      assert.match(await jan.locator('table[data-tabela-vigotas]').innerText(), /dupla/);
      // 4) esforços atribuídos (igualação manual) na vigota 1
      await linhas.first().click();
      const campo = (rot) => ed.getByLabel(new RegExp('^' + rot.replace(/[+()]/g, '\\$&')));
      await campo('Md+ atribuído').fill('3'); await campo('Md+ atribuído').press('Enter');
      await campo('Vsd atribuído (início)').fill('2'); await campo('Vsd atribuído (início)').press('Enter');
      await campo('Vsd atribuído (fim)').fill('2'); await campo('Vsd atribuído (fim)').press('Enter');
      await ed.getByRole('button', { name: 'Atribuir esforços às selecionadas', exact: true }).click();
      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).some((l) => (l.edicaoVigotas ?? []).some((e) => e.momentos?.pos === 3)), null);
      // 5) relatório de esforços da vigota
      await linhas.first().click();
      await jan.getByRole('button', { name: 'Relatório de esforços da vigota', exact: true }).click();
      const rel = page.getByRole('dialog', { name: /Relatório de esforços da vigota 1/ });
      await rel.waitFor();
      await rel.locator('svg[data-diagrama="rel-M"]').waitFor();
      assert.equal(await rel.locator('svg[data-diagrama]').count(), 3);
      assert.equal(await rel.locator('svg[data-croqui-vigota]').count(), 1, 'croqui do grupo e da vigota');
      assert.match(await rel.innerText(), /ELU/);
      await rel.getByRole('button', { name: 'Fechar', exact: true }).click();
      // desbloquear a laje volta aos esforços calculados
      await ed.getByRole('button', { name: 'Desbloquear a laje', exact: true }).click();
      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).every((l) => !(l.edicaoVigotas ?? []).length), null);
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 6) carga alta: vigotas com erro em vermelho na lista, na planta e na lista de erros
      await cmd('carga.area {"grupo": "g_3", "contorno": [[0, 0], [8, 0], [8, 5], [0, 5]], "valor": 25}');
      await page.getByRole('button', { name: 'Recalcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      jan = await abrir();
      assert.equal(await jan.locator('[data-vigotas-com-erro]').count(), 1, 'contagem de vigotas com erro');
      assert.ok(await jan.locator('table[data-tabela-vigotas] tbody tr[data-status="fail"]').count() >= 1, 'vigota com erro em vermelho na lista');
      assert.ok(await jan.locator('svg[data-vigotas-individuais] g[data-status="fail"]').count() >= 1, 'vigota com erro em vermelho na planta');
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      await page.locator('[data-lista-erros] [data-contagem]').waitFor();
      assert.match(await page.locator('[data-lista-erros]').innerText(), /VIGOTA_(POS|CORTANTE|NEG)/);
      // 7) exposição e momentos mínimos por pano (grupo Vínculos e engastes, com a laje selecionada na planta)
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await page.keyboard.press('f');
      await page.waitForTimeout(500);
      const [ax, ay] = await telaDe(page, -0.6, -0.6), [bx, by] = await telaDe(page, 8.6, 5.6);
      await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 8 }); await page.mouse.up();
      const vg = await grupoEdif(page, /^Vínculos, flambagem e cobrimento/);
      const pano = vg.locator('[data-vigotas-pano]');
      await pano.waitFor();
      await pano.getByLabel(/^Classe de agressividade do pano/).selectOption('III');
      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).some((l) => l.exposicao === 'III'), null);
      await pano.getByLabel(/^Tipo de vão dos momentos mínimos/).selectOption('isolado');
      const div = pano.getByLabel(/^Divisor do positivo mínimo/);
      await div.fill('8'); await div.press('Enter');
      await pano.getByRole('button', { name: 'Aplicar os momentos mínimos ao pano', exact: true }).click();
      await esperarModelo(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes ?? []).some((l) => l.momentosMin?.isolado?.pos === 8), null);
      // 8) memorial
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const mv = memo.locator('[data-memorial-vigotas-ficha]');
      await mv.waitFor();
      assert.match(await mv.innerText(), /Armada exemplo \(fictícia\) A12/);
      assert.match(await mv.innerText(), /Tipos: A\d/);
      assert.equal(await mv.locator('[data-memorial-quantitativo-vigotas]').count(), 1, 'quantitativo das vigotas no memorial');
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };
