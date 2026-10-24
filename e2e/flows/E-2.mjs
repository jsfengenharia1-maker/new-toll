// Fluxos de interface — E (parte 2/2).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { faixaAba, grupoEdif, tab, downloadText, telaDe, enquadrarEstavel } from './helpers.mjs';

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
      await enquadrarEstavel(page);
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
export const f_E3c = {
    name: 'E3c: nervuradas bidirecionais (forma do catálogo e da obra, atribuir ao pano, ponto de passagem, base das nervuras, cópia entre panos, janela das nervuras, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
      // dois panos 6 × 6 lado a lado, vigas de 20 × 50
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [12, 0], [0, 6], [6, 6], [12, 6]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [12, 0]], [[0, 6], [12, 6]], [[0, 0], [0, 6]], [[6, 0], [6, 6]], [[12, 0], [12, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      // Tipos de laje fica na Configuração da obra; Lajes e Nervuradas bidirecionais, na doca Propriedades
      const tipos = () => grupoEdif(page, 'Tipos de laje');
      let tl = await tipos();
      // 1) a forma do catálogo é genérica e somente leitura; copiar dá uma forma editável
      await tl.getByLabel(/^Forma da biblioteca/).selectOption({ label: 'Recuperável 60 × 60, h = 30 (genérica) · catálogo' });
      assert.match(await tl.locator('[data-selos-forma]').innerText(), /somente leitura/);
      assert.match(await tl.locator('[data-selos-forma]').innerText(), /genérica, a confirmar/);
      await tl.getByRole('button', { name: 'Copiar forma', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.formas?.length === 1, null);
      assert.match(await tl.locator('[data-selos-forma]').innerText(), /editável/);
      const copia = (await modelo()).tiposLaje.formas[0];
      // 2) resumo da forma: cubeta 50 × 50, volume e peso à mão (mesa de 5 cm: 0,05 + 0,30 × (1 − 0,25/0,36) = 0,142 m³/m²; 25 × 0,14167 = 3,54 kN/m²)
      assert.match(await tl.locator('[data-volume-forma]').innerText(), /^0,142$/);
      assert.match(await tl.locator('[data-pp-forma]').innerText(), /^3,54$/);
      // 3) editar a altura da cubeta; largura da nervura maior que o intereixo é recusada
      const alt = tl.getByLabel(/^Altura da cubeta/);
      await alt.fill('25'); await alt.press('Enter');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.formas?.[0]?.altura === 0.25, null);
      const bwx = tl.getByLabel(/^Largura da nervura da forma em X/);
      await bwx.fill('70'); await bwx.press('Enter');
      await tl.locator('[data-erros-tipos-laje]').waitFor();
      assert.match(await tl.locator('[data-erros-tipos-laje]').innerText(), /incoerente/);
      assert.equal((await modelo()).tiposLaje.formas[0].bw[0], 0.1);
      // 4) atribuir a nervurada bidirecional nos panos do grupo Lajes
      const lj = await grupoEdif(page, /^Lajes/);
      await lj.locator('label.field', { has: page.locator('.flabel', { hasText: /^Tipo$/ }) }).locator('select').selectOption('nervurada');
      await lj.getByLabel(/^Forma da nervurada/).selectOption(copia.id);
      const ht = lj.getByLabel(/^Altura total da nervurada/);
      await ht.fill('30'); await ht.press('Enter');
      await lj.getByRole('button', { name: 'Preencher todos os panos', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 2, null);
      assert.deepEqual((await modelo()).lajes[0].tipo, { tipo: 'nervurada', forma: copia.id, hTotal: 0.3, capa: 0.05 });
      assert.match(await lj.locator('table.loads-ed').innerText(), /nervurada/);
      // 5) grupo Nervuradas bidirecionais: seleciona o pano L1 na tabela e ajusta o ponto de passagem
      const nv = await grupoEdif(page, /^Nervuradas bidirecionais/);
      await nv.getByLabel('Mostrar nervuras e cubetas na planta', { exact: true }).check();
      await lj.locator('table.loads-ed tbody tr').nth(0).click();
      const px = nv.getByLabel(/^Ponto de passagem das nervuras X/);
      await px.fill('0,3'); await px.press('Enter');
      const py = nv.getByLabel(/^Ponto de passagem das nervuras Y/);
      await py.fill('0,3'); await py.press('Enter');
      await nv.getByRole('button', { name: 'Aplicar o ponto de passagem', exact: true }).click();
      await esperarModelo(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]; return Array.isArray(l?.pontoNervuras) && Math.abs(l.pontoNervuras[0] - 0.3) < 1e-9; }, null);
      // 6) base das nervuras: 2φ8 em X, considerada e detalhada
      await nv.getByLabel(/^Base inferior das nervuras X/).fill('2');
      await nv.getByLabel(/^φ da base das nervuras X/).selectOption('8');
      await nv.getByLabel('Considerar a base das nervuras X no dimensionamento', { exact: true }).check();
      await nv.getByLabel('Base das nervuras detalhada (desenhada e medida)', { exact: true }).check();
      await nv.getByRole('button', { name: 'Aplicar a base das nervuras', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.baseNervurada?.detalhada === true, null);
      const bn = (await modelo()).lajes[0].baseNervurada;
      assert.deepEqual(bn.nervuras[0], { inf: { n: 2, phi: 8 }, considerar: true });
      // 7) copiar as características para o outro pano nervurado do grupo (com a base)
      await nv.getByLabel('Copiar também a armadura base', { exact: true }).check();
      await nv.getByRole('button', { name: 'Copiar para os demais panos nervurados do grupo', exact: true }).click();
      await esperarModelo(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[1]; return !!l?.baseNervurada && Array.isArray(l?.pontoNervuras); }, null);
      assert.deepEqual((await modelo()).lajes[1].pontoNervuras, [0.3, 0.3]);
      // 8) a forma em uso não pode ser removida
      tl = await tipos();
      await tl.getByRole('button', { name: 'Remover forma', exact: true }).click();
      await tl.locator('[data-erros-tipos-laje]').waitFor();
      assert.match(await tl.locator('[data-erros-tipos-laje]').innerText(), /usada por lajes/);
      // 9) exportar o JSON leva as formas da obra
      const { name, text } = await downloadText(page, () => tl.getByRole('button', { name: 'Exportar tipos de laje', exact: true }).click());
      assert.match(name, /tipos-laje\.json$/);
      assert.equal(JSON.parse(text).formas.length, 1);
      // 10) cálculo, janela das nervuras e memorial
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await grupoEdif(page, /^Lajes/);
      await lj.locator('table.loads-ed tbody tr').nth(0).click();
      await nv.getByRole('button', { name: 'Nervuras da laje', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Nervuras da laje L1' });
      await jan.locator('[data-tabela-nervuras]').waitFor();
      assert.ok((await jan.locator('[data-grupo-nervuras]').count()) >= 2);
      assert.match(await jan.locator('[data-grupo-nervuras]').first().innerText(), /base 2φ8/);
      assert.match(await jan.innerText(), /Cisalhamento: cisalhamento como laje/);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const tab = memo.locator(`[data-memorial-nervurada="${(await modelo()).lajes[0].id}"]`);
      await tab.waitFor();
      assert.match(await tab.innerText(), /genérica/);
      assert.match(await tab.innerText(), /\(cópia\)/);
      assert.match(await memo.innerText(), /Lajes nervuradas bidirecionais \(nervuras, base e malha da mesa\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_E3d = {
    name: 'E3d: ábacos das nervuradas (prévia, gerar nos pilares, ábaco manual, altura, armadura base, camada na planta, faixa, punção com e sem ábaco, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
      // pano 12 × 6 m com um pilar central sem viga e quatro pilares de canto com viga
      await cmd('lote {"comandos": [' + [[0, 0], [12, 0], [12, 6], [0, 6], [6, 3]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [12, 0]], [[0, 6], [12, 6]], [[0, 0], [0, 6]], [[12, 0], [12, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "nervurada", "forma": "cat:rec-60-30", "hTotal": 0.35, "capa": 0.05}}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 1, null);

      // ---- seleciona o pano e abre o grupo Ábacos (doca Propriedades)
      const lj = await grupoEdif(page, /^Lajes/);
      await lj.locator('table.loads-ed tbody tr').nth(0).click();
      const ab = await grupoEdif(page, /^Ábacos/);
      // 1) prévia: só o pilar central (os de canto têm viga encostada)
      assert.equal(await ab.locator('[data-previa-abacos]').getAttribute('data-previa-abacos'), '1');
      // 2) gerar nos pilares
      await ab.getByRole('button', { name: 'Gerar nos pilares', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 1, null);
      const a1 = (await modelo()).abacos[0];
      assert.equal(a1.automatico, true);
      assert.ok(Math.abs(a1.hAbaco - 0.35) < 1e-9, String(a1.hAbaco));
      const xs = a1.poligono.map((q) => q[0]), ys = a1.poligono.map((q) => q[1]);
      assert.ok(Math.min(...xs) < 6 && Math.max(...xs) > 6 && Math.min(...ys) < 3 && Math.max(...ys) > 3, JSON.stringify(a1.poligono));
      await ab.locator('[data-tabela-abacos="1"]').waitFor();
      assert.equal(await ab.getByLabel('Mostrar ábacos na planta', { exact: true }).isChecked(), true);
      // 3) altura do ábaco
      const alt = ab.getByLabel(/^Altura do ábaco/);
      await alt.fill('45'); await alt.press('Enter');
      await esperarModelo(() => Math.abs((JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.[0]?.hAbaco ?? 0) - 0.45) < 1e-9, null);
      // 4) ábaco retangular manual no meio do vão esquerdo
      const cx = ab.getByLabel(/^Centro X do ábaco/);
      await cx.fill('3'); await cx.press('Enter');
      await ab.getByRole('button', { name: 'Novo ábaco retangular', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 2, null);
      assert.equal((await modelo()).abacos[1].automatico, false);
      // 5) armadura base do ábaco manual: 3φ10 embaixo
      await ab.getByLabel(/^Ábaco da laje/).selectOption({ label: 'AB2' });
      const bi = ab.getByLabel(/^Base inferior do ábaco/);
      await bi.fill('3'); await bi.press('Enter');
      await ab.getByLabel(/^φ da base inferior do ábaco/).selectOption('10');
      await ab.getByRole('button', { name: 'Aplicar a armadura base do ábaco', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.[1]?.base?.inf?.n === 3, null);
      assert.deepEqual((await modelo()).abacos[1].base.inf, { n: 3, phi: 10 });
      assert.match(await ab.locator('[data-base-abaco]').innerText(), /inferior 3φ10/);
      // 6) remover os automáticos e gerar de novo pela faixa (o manual fica)
      await ab.getByRole('button', { name: 'Remover os ábacos automáticos', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 1, null);
      await faixaAba(page, 'Lançamento');
      await page.getByRole('toolbar', { name: /^Comandos: Lançamento/ }).getByRole('button', { name: 'Gerar ábacos nos pilares', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 2, null);
      assert.equal((await modelo()).abacos.filter((a) => a.automatico).length, 1);

      // ---- cálculo, punção com ábaco na janela da laje
      const calcular = async () => {
        await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
        await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
        await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      };
      await calcular();
      const card = page.locator('[data-card-puncao]');
      await card.waitFor();
      await card.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.getByRole('radio', { name: 'Punção e cortante' }).click();
      const blocoAb = jan.locator('[data-puncao-abaco]').first();
      await blocoAb.waitFor();
      assert.match(await blocoAb.innerText(), /h \/ d do ábaco/);
      await jan.getByRole('button', { name: 'Fechar' }).click();

      // ---- sem ábaco: aviso e ação "Gerar ábaco neste pilar"
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      const ab2 = await grupoEdif(page, /^Ábacos/);
      await ab2.getByRole('button', { name: 'Remover os ábacos automáticos', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 1, null);
      await calcular();
      await card.locator('tbody tr').first().dblclick();
      const jan2 = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan2.getByRole('radio', { name: 'Punção e cortante' }).click();
      await jan2.locator('[data-puncao-sem-abaco]').first().waitFor();
      await jan2.getByRole('button', { name: 'Gerar ábaco neste pilar', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.abacos?.length === 2, null);
      await jan2.getByRole('button', { name: 'Fechar' }).click();

      // ---- memorial
      await calcular();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      await memo.locator('[data-memorial-abacos]').waitFor();
      assert.ok((await memo.locator('[data-memorial-abaco]').count()) >= 2);
      assert.match(await memo.locator('[data-memorial-abacos]').innerText(), /armadura base entre nervuras|Armadura base entre nervuras/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_E4a = {
    name: 'E4a: escadas (janela com dados comuns, lances e tipos de lance, prévia em planta e corte, erro de altura em vermelho)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await faixaAba(page, 'Lançamento');
      await page.getByRole('button', { name: 'Escadas…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Escadas', exact: true });
      await jan.waitFor();
      // 1) escada nova com o tipo meia-volta 9 + 9: o espelho padrão (17,5 cm) não fecha os 3 m
      await jan.getByRole('button', { name: 'Criar escada', exact: true }).click();
      await jan.locator('[data-escada-lances]').waitFor();
      await jan.locator('[data-escada-erro="ESCADA_ALTURA"]').waitFor();
      assert.match(await jan.locator('[data-escada-erro="ESCADA_ALTURA"]').innerText(), /18 degraus × 0,175 m = 3,150 m não fecha o desnível de 3,000 m/);
      // 2) dados comuns: espelho de 1/6 m fecha a altura; a prévia em planta e o corte aparecem
      await jan.getByRole('radio', { name: 'Dados comuns', exact: true }).click();
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).fill('0.16667');
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).press('Tab');
      await jan.locator('[data-escada-erro]').waitFor({ state: 'detached' });
      await jan.locator('[data-escada-planta] polygon').first().waitFor();
      assert.equal(await jan.locator('[data-escada-planta] polygon').count(), 3, 'dois lances e um patamar');
      await jan.locator('[data-escada-corte]').waitFor();
      // 3) lances: espessura pré-dimensionada e resumo
      await jan.getByRole('radio', { name: 'Lances', exact: true }).click();
      assert.match(await jan.locator('[data-escada-resumo]').innerText(), /18\s+3,000\s+\d+ \(vão\/30\)/);
      // 4) tipos de lance: o tipo em uso não pode ser removido; criar um tipo novo
      await jan.getByRole('radio', { name: 'Tipos de lance', exact: true }).click();
      const tipo = jan.locator('[data-tipo-lance]').first();
      await tipo.waitFor();
      assert.equal(await tipo.getByRole('button', { name: /^Remover / }).isDisabled(), true);
      await jan.getByLabel('Referência do tipo').last().fill('Reto de 12');
      await jan.getByLabel('Degraus de cada trecho').last().fill('12');
      await jan.getByRole('button', { name: 'Criar tipo de lance', exact: true }).click();
      await jan.locator('[data-tipo-lance="Reto de 12"]').waitFor();
      // desnível inicial menor que 10 cm é recusado
      await jan.getByLabel('Desnível no início do lance').last().fill('0.05');
      await jan.getByLabel('Desnível no início do lance').last().press('Tab');
      await jan.getByRole('button', { name: 'Criar tipo de lance', exact: true }).click();
      await jan.getByText(/o desnível inicial deve ser zero ou pelo menos 10 cm/).waitFor();
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 4b) Navegador: abre o nó Escadas e seleciona E1; as Propriedades mostram a escada e o espelho é editável
      await page.getByRole('treeitem', { name: /^Escadas/ }).click();
      await page.getByRole('treeitem', { name: /^E1/ }).click();
      const jan2 = page.getByRole('dialog', { name: 'Escadas', exact: true });
      await jan2.waitFor();
      await jan2.getByRole('button', { name: 'Fechar', exact: true }).click();
      const prop = page.locator('[data-escada-propriedades]');
      await prop.waitFor();
      assert.match(await page.locator('.typecard').innerText(), /Escada · 1 lance\(s\)/);
      await prop.getByLabel(/^Espelho \(altura do degrau\)/).fill('0.16667');
      await prop.getByLabel(/^Espelho \(altura do degrau\)/).press('Tab');
      // 5) memorial: seção Escadas com os dados, a geometria e as cargas
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const me = memo.locator('[data-memorial-escadas]');
      await me.waitFor();
      assert.match(await me.innerText(), /Largura, piso e espelho/);
      assert.match(await me.innerText(), /18 degraus · 3,000 m para um desnível de 3,000 m/);
      assert.match(await me.innerText(), /\[a confirmar\]/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
};

/** Pórtico 8 × 5 m com vigas e laje no grupo g_3 e a planta aberta e enquadrada (base dos fluxos E4b). */
async function porticoParaEscadas(page) {
  await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
  const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
  await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
  await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
  await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
  await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
  await enquadrarEstavel(page);
  return cmd;
}
const escadasNaPlanta = async (page) => (await page.locator('.planta-cv').getAttribute('data-escadas')) ?? '';
const esperarEscadas = (page, lista) => page.waitForFunction((l) => document.querySelector('.planta-cv')?.getAttribute('data-escadas') === l, lista);
const clicarPlanta = async (page, x, y) => { const [px, py] = await telaDe(page, x, y); await page.mouse.move(px, py); await page.mouse.click(px, py); };

export const f_E4b_inserir = {
    name: 'E4b-inserir: ferramenta Escada (menu, dados da nova escada, dois cliques, inserção repetida, Esc, desfazer e erro de altura)',
    async run({ newPage }) {
      const page = await newPage();
      await porticoParaEscadas(page);
      await faixaAba(page, 'Lançamento');
      await page.getByRole('button', { name: 'Escada', exact: true }).click();
      const menu = page.locator('[data-escada-menu]');
      await menu.waitFor();
      assert.match(await menu.innerText(), /Grupo atual:/);
      // dados da nova escada: espelho de 1/6 m fecha os 3 m com 18 degraus
      await menu.getByRole('button', { name: 'Dados da nova escada…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Nova escada', exact: true });
      await jan.waitFor();
      assert.match(await jan.innerText(), /Grupo:/);
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).fill('0.16667');
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).press('Tab');
      await jan.locator('[data-escada-erro]').waitFor({ state: 'detached' });
      await jan.getByRole('button', { name: 'Lançar na planta', exact: true }).click();
      await jan.waitFor({ state: 'detached' });
      // 1º clique (início) e 2º (direção): E1; a inserção repetida lança E2
      await clicarPlanta(page, 1, 1); await clicarPlanta(page, 1, 4);
      await esperarEscadas(page, 'E1');
      await clicarPlanta(page, 5, 1); await clicarPlanta(page, 5, 4);
      await esperarEscadas(page, 'E1,E2');
      // Esc encerra a inserção repetida: a ferramenta volta a Selecionar
      await page.keyboard.press('Escape');
      await page.locator('canvas.int[data-ferramenta="selecionar"]').waitFor();
      // Ctrl+Z desfaz só E2
      await page.keyboard.press('Control+z');
      await esperarEscadas(page, 'E1');
      // erro geométrico: espelho de 0,20 m não fecha a altura; nada é criado e o código aparece em vermelho
      await page.keyboard.press('Shift+E');
      await menu.waitFor();
      await menu.getByRole('button', { name: 'Dados da nova escada…', exact: true }).click();
      await jan.waitFor();
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).fill('0.2');
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).press('Tab');
      await jan.locator('[data-escada-erro="ESCADA_ALTURA"]').waitFor();
      await jan.getByRole('button', { name: 'Lançar na planta', exact: true }).click();
      await clicarPlanta(page, 5, 1); await clicarPlanta(page, 5, 4);
      await menu.locator('[data-escada-erro="ESCADA_ALTURA"]').waitFor();
      assert.equal(await escadasNaPlanta(page), 'E1');
    },
};

/** Escada E1 (meia-volta 9 + 9, espelho 1/6 m) criada pela linha de comandos: origem (1; 1), subindo em +y. */
const ESCADA_E1 = 'escada.criar {"id": "e1", "grupo": "g_3", "origem": [1, 1], "angulo": 90, "piso": 0.2941176, "espelho": 0.1666667, "lances": [{"tipo": "pre:meia-volta-9-9"}]}';
const modeloEscadas = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? []);
const numero = async (campo) => parseFloat((await campo.inputValue()).replace(',', '.'));

export const f_E4b_editar = {
    name: 'E4b-editar: funções Editar, Mover, Girar, Duplicar lance e Apagar da ferramenta Escada, com desfazer',
    async run({ newPage }) {
      const page = await newPage();
      const cmd = await porticoParaEscadas(page);
      await cmd(ESCADA_E1);
      await esperarEscadas(page, 'E1');
      await faixaAba(page, 'Lançamento');
      await page.getByRole('button', { name: 'Escada', exact: true }).click();
      const menu = page.locator('[data-escada-menu]');
      const funcao = (nome) => menu.getByRole('radio', { name: nome, exact: true }).click();
      // Editar: clicar na escada abre a janela; a largura muda pelo comando de dados
      await funcao('Editar');
      await clicarPlanta(page, 1, 2);
      const jan = page.getByRole('dialog', { name: 'Escadas', exact: true });
      await jan.waitFor();
      const dados = jan.locator('[data-escada-dados]');
      await dados.getByLabel(/^Largura da escada/).fill('1.3');
      await dados.getByLabel(/^Largura da escada/).press('Tab');
      await page.waitForFunction(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? [])[0]?.largura === 1.3);
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // Mover: referência e destino (dx = 2 m)
      await funcao('Mover');
      await clicarPlanta(page, 1, 2); await clicarPlanta(page, 3, 2);
      await page.waitForFunction(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? [])[0]?.origem?.[0] === 3);
      // Girar: clicar na escada e digitar 90 (soma ao sentido atual: 90 + 90 = 180)
      await funcao('Girar');
      await clicarPlanta(page, 3, 2);
      await menu.getByLabel(/^Ângulo do giro/).fill('90');
      await menu.getByLabel(/^Ângulo do giro/).press('Tab');
      await menu.getByRole('button', { name: 'Girar', exact: true }).click();
      await page.waitForFunction(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? [])[0]?.angulo === 180);
      // a janela mostra origem e sentido; Duplicar lance 1 acrescenta um lance
      await funcao('Editar');
      await clicarPlanta(page, 2.8, 1);
      await jan.waitFor();
      assert.equal(await numero(dados.getByLabel(/^Origem x/)), 3);
      assert.equal(await numero(dados.getByLabel(/^Sentido de subida/)), 180);
      await jan.getByRole('radio', { name: 'Lances', exact: true }).click();
      // patamar apoiado com apoio lateral e cota inicial do lance (C8.15, C8.26)
      await jan.getByRole('checkbox', { name: 'Patamar 1 apoiado (lance 1)', exact: true }).check();
      await jan.getByLabel(/^Apoio lateral do patamar 1 \(lance 1\)/).selectOption('alvenaria');
      await page.waitForFunction(() => { const l = (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? [])[0]?.lances?.[0]; return l?.patamares?.[0]?.apoiado && l.patamares[0].apoios.some((x) => x.borda === 'lateral' && x.tipo === 'alvenaria'); });
      await jan.getByLabel(/^Cota inicial do lance 1/).fill('0');
      await jan.getByLabel(/^Cota inicial do lance 1/).press('Enter');
      await page.waitForFunction(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? [])[0]?.lances?.[0]?.cotaInicial === 0);
      await jan.getByRole('button', { name: 'Duplicar lance 1', exact: true }).click();
      await jan.getByRole('button', { name: 'Duplicar lance 2', exact: true }).waitFor();
      await page.waitForFunction(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? [])[0]?.lances?.length === 2);
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // Apagar por clique: E1 some; Ctrl+Z traz de volta
      await funcao('Apagar');
      await clicarPlanta(page, 2.8, 1);
      await esperarEscadas(page, '');
      await page.keyboard.press('Control+z');
      await esperarEscadas(page, 'E1');
      // Apagar por janela (da direita para a esquerda captura as escadas que a janela toca)
      const [ax, ay] = await telaDe(page, 7.9, 4.9), [bx, by] = await telaDe(page, 1.0, 0.5);
      await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 8 }); await page.mouse.up();
      await esperarEscadas(page, '');
    },
};

export const f_E4b_copiar = {
    name: 'E4b-copiar: "Copiar dados de" outra escada, giro à direita e mesmos lances',
    async run({ newPage }) {
      const page = await newPage();
      const cmd = await porticoParaEscadas(page);
      await cmd(ESCADA_E1);
      await esperarEscadas(page, 'E1');
      await faixaAba(page, 'Lançamento');
      await page.getByRole('button', { name: 'Escada', exact: true }).click();
      const menu = page.locator('[data-escada-menu]');
      await menu.getByLabel('Copiar dados de').selectOption({ label: 'E1' });
      await menu.getByRole('button', { name: 'Dados da nova escada…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Nova escada', exact: true });
      await jan.waitFor();
      assert.ok(Math.abs((await numero(jan.getByLabel(/^Espelho \(altura do degrau\)/))) - 1 / 6) < 1e-3);
      await jan.getByLabel(/^Giro ao subir/).selectOption('dir');
      await jan.getByRole('button', { name: 'Lançar na planta', exact: true }).click();
      await clicarPlanta(page, 5, 1); await clicarPlanta(page, 5, 4);
      await esperarEscadas(page, 'E1,E2');
      await page.waitForFunction(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? []).length === 2);
      const [e1, e2] = await modeloEscadas(page);
      assert.equal(e2.giro, 'dir');
      assert.equal(e1.giro, undefined);
      assert.equal(e2.lances.length, e1.lances.length);
      assert.equal(e2.lances[0].tipo, e1.lances[0].tipo);
    },
};

export const f_E4b_biblioteca = {
    name: 'E4b-biblioteca: tipos de lance (em uso e bloqueio, desbloquear, copiar com nova referência, exportar, importar e biblioteca do usuário)',
    async run({ newPage }) {
      const page = await newPage();
      const cmd = await porticoParaEscadas(page);
      await cmd(ESCADA_E1);
      await esperarEscadas(page, 'E1');
      const abrirTipos = async (pg) => {
        await faixaAba(pg, 'Lançamento');
        await pg.getByRole('button', { name: 'Escadas…', exact: true }).click();
        const j = pg.getByRole('dialog', { name: 'Escadas', exact: true });
        await j.waitFor();
        await j.getByRole('radio', { name: 'Tipos de lance', exact: true }).click();
        return j;
      };
      const jan = await abrirTipos(page);
      const tipo = jan.locator('[data-tipo-lance]').first();
      await tipo.waitFor();
      assert.match(await tipo.innerText(), /Em uso por 1 lance\(s\)/);
      assert.match(await tipo.innerText(), /Bloqueado: o tipo é usado em outro lance/);
      // campos desabilitados enquanto bloqueado; "Desbloquear" os habilita e a edição vale
      await tipo.getByRole('button', { name: /^Editar / }).click();
      const trechos = tipo.getByLabel('Degraus de cada trecho');
      assert.equal(await trechos.isDisabled(), true);
      await tipo.getByRole('button', { name: 'Salvar alterações do tipo', exact: true }).click();
      await tipo.getByText(/bloqueado para edição/).waitFor();
      await tipo.getByRole('button', { name: /^Desbloquear / }).click();
      await page.waitForFunction(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLance ?? [])[0]?.desbloqueado === true);
      assert.equal(await trechos.isDisabled(), false);
      await trechos.fill('10 + 8');
      await tipo.getByRole('button', { name: 'Salvar alterações do tipo', exact: true }).click();
      await page.waitForFunction(() => JSON.stringify((JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLance ?? [])[0]?.trechos) === '[10,8]');
      // copiar com nova referência: o nome sugerido é "<nome> (cópia)"
      await jan.locator('[data-tipo-lance]').first().getByRole('button', { name: /^Copiar com nova referência/ }).click();
      await jan.getByRole('button', { name: 'Criar a cópia', exact: true }).click();
      await jan.locator('[data-tipo-lance]').filter({ hasText: '(cópia)' }).waitFor();
      // exportar da obra (.json)
      await jan.getByText('Biblioteca de tipos de lance', { exact: true }).click();
      const { name, text } = await downloadText(page, () => jan.getByRole('button', { name: 'Exportar da obra (.json)', exact: true }).click());
      assert.match(name, /tipos-de-lance\.json$/);
      const j = JSON.parse(text);
      assert.equal(j.formato, 'statikos-tipos-lance');
      assert.equal(j.tipos.length, 2);
      // biblioteca do usuário: guardar e trazer (os tipos já existem na obra: nada duplica)
      await jan.getByLabel('Nome na biblioteca do usuário', { exact: true }).fill('Meus tipos');
      await jan.getByLabel('Nome na biblioteca do usuário', { exact: true }).press('Tab');
      await jan.getByRole('button', { name: 'Guardar na biblioteca do usuário', exact: true }).click();
      await jan.getByLabel(/^Tipos de lance guardados/).selectOption({ index: 1 });
      await jan.getByRole('button', { name: 'Trazer da biblioteca do usuário', exact: true }).click();
      await jan.locator('[data-aviso-tipos-lance]').filter({ hasText: /0 tipo\(s\) de lance importado\(s\); 2 já existia/ }).waitFor();
      // importar numa obra nova: entra 1 tipo... (2 tipos distintos), e de novo diz que já existiam
      const page2 = await newPage();
      await page2.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const jan2 = await abrirTipos(page2);
      await jan2.getByText('Biblioteca de tipos de lance', { exact: true }).click();
      await jan2.getByLabel('Importar (.json)', { exact: true }).setInputFiles({ name: 'tipos-de-lance.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await jan2.locator('[data-aviso-tipos-lance]').filter({ hasText: /2 tipo\(s\) de lance importado\(s\); 0 já existia/ }).waitFor();
      await jan2.getByLabel('Importar (.json)', { exact: true }).setInputFiles({ name: 'tipos-de-lance.json', mimeType: 'application/json', buffer: Buffer.from(text) });
      await jan2.locator('[data-aviso-tipos-lance]').filter({ hasText: /0 tipo\(s\) de lance importado\(s\); 2 já existia/ }).waitFor();
      await jan2.getByLabel('Importar (.json)', { exact: true }).setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{"formato": "outro"}') });
      await jan2.locator('.note.bad').first().waitFor();
    },
};

export const f_E4b_guia = {
    name: 'E4b-guia: etapa Escadas do guia (pendente sem escada, feito depois do lançamento na planta)',
    async run({ newPage }) {
      const page = await newPage();
      await porticoParaEscadas(page);
      const etapa = page.locator('[data-etapa="escadas"]');
      await etapa.waitFor();
      assert.match(await etapa.innerText(), /pendente/);
      await faixaAba(page, 'Lançamento');
      await page.getByRole('button', { name: 'Escada', exact: true }).click();
      const menu = page.locator('[data-escada-menu]');
      await menu.getByRole('button', { name: 'Dados da nova escada…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Nova escada', exact: true });
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).fill('0.16667');
      await jan.getByLabel(/^Espelho \(altura do degrau\)/).press('Tab');
      await jan.getByRole('button', { name: 'Lançar na planta', exact: true }).click();
      await clicarPlanta(page, 1, 1); await clicarPlanta(page, 1, 4);
      await esperarEscadas(page, 'E1');
      assert.match(await etapa.innerText(), /feito/);
      assert.match(await etapa.innerText(), /1 escada\(s\)/);
      // Navegador: menu do nó (botão direito) duplica a escada; as Propriedades mostram a posição e giram 90°
      await page.getByRole('treeitem', { name: /^Escadas/ }).click();
      await page.getByRole('treeitem', { name: /^E1 — 1 lance\(s\)/ }).click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Duplicar', exact: true }).click();
      await esperarEscadas(page, 'E1,E2');
      const prop = page.locator('[data-escada-propriedades]');
      await prop.waitFor();
      await prop.getByRole('button', { name: 'Girar 90°', exact: true }).click();
      await page.waitForFunction(() => { const e = (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? []); return e.length === 2 && e[1].angulo === 180 && e[0].angulo === 90; });
      await page.getByRole('treeitem', { name: /^E2 — 1 lance\(s\)/ }).click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Apagar', exact: true }).click();
      await esperarEscadas(page, 'E1');
    },
};

export const f_E4b_formas = {
    name: 'E4b-formas: escadas nas pranchas de formas e de locação e a tabela "Escadas por grupo" do memorial',
    async run({ newPage }) {
      const page = await newPage();
      const cmd = await porticoParaEscadas(page);
      await cmd(ESCADA_E1);
      await esperarEscadas(page, 'E1');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      const prev = page.locator('.prancha-prev');
      await tipo.selectOption({ label: 'Formas' });
      await prev.locator('svg').waitFor();
      assert.match(await prev.textContent(), /E1/);
      await tipo.selectOption({ label: 'Locação e cargas' });
      await prev.locator('svg').waitFor();
      assert.match(await prev.textContent(), /E1/);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const me = memo.locator('[data-memorial-escadas]');
      await me.waitFor();
      assert.match(await me.innerText(), /Escadas por grupo/);
      const tab = me.locator('[data-memorial-escadas-grupo] tbody tr');
      assert.equal(await tab.count(), 1);
      assert.match(await tab.first().innerText(), /E1\s+1,00 ; 1,00\s+90,00\s+1\s+18/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
};

export const f_E4c = {
    name: 'E4c: cálculo das escadas (janela com reações por apoio, esforços, aviso de recálculo e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      const fmt = (v) => v.toFixed(2).replace('.', ',');
      // pórtico 8 × 5 m com vigas nos eixos y = 0 e y = 5; escada reta de 18 degraus entre elas (origem x = 4, subindo em +y, 17 pisos de 5/17 m)
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('tipoLance.criar {"id": "T", "tipo": {"nome": "Reto de 18", "tipologia": "reto", "trechos": [18], "espessura": 0.15}}');
      await cmd('escada.criar {"id": "e1", "grupo": "g_3", "origem": [4, 0], "angulo": 90, "piso": 0.2941176, "espelho": 0.1666667, "lances": [{"tipo": "T"}]}');
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? []).length === 1, null);
      // valores esperados (viga biapoiada inclinada com carga por projeção): R = q·ℓ·largura/2 por apoio
      const piso = 0.2941176, esp = 0.1666667, ell = 17 * piso, w = 1.2, cosA = piso / Math.hypot(piso, esp);
      const pg = (25 * 0.15) / cosA + (25 * esp) / 2 + 1, RG = (pg * ell * w) / 2, RQ = (2.5 * ell * w) / 2;
      // 1) janela do cálculo individual (aba Análise da faixa)
      await faixaAba(page, 'Análise');
      await page.getByRole('button', { name: 'Calcular escadas…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Cálculo das escadas', exact: true });
      await jan.waitFor();
      const lance = jan.locator('[data-escada-lance="E1-1"]');
      await lance.waitFor({ timeout: 60000 });
      const reac = lance.locator('[data-escada-reacoes]');
      const txt = await reac.innerText();
      assert.match(txt, /Apoio inferior/);
      assert.match(txt, /Apoio superior/);
      assert.ok(txt.split(fmt(RG)).length - 1 >= 2, `reação G ${fmt(RG)} kN nos dois apoios`);
      assert.ok(txt.split(fmt(RQ)).length - 1 >= 2, `reação Q ${fmt(RQ)} kN nos dois apoios`);
      assert.ok(txt.includes(fmt(RG / w)), 'carga linear G em kN/m');
      const esf = lance.locator('[data-escada-esforcos]');
      const mxLido = parseFloat((await esf.locator('tbody td').first().innerText()).replace(',', '.'));
      const mxEsperado = (1.4 * (pg + 2.5) * ell * ell) / 8;
      assert.ok(Math.abs(mxLido / mxEsperado - 1) < 0.02, `Mx+ ${mxLido} ≈ 1,4·(G+Q)·ℓ²/8 = ${mxEsperado.toFixed(2)}`);
      assert.equal(await jan.locator('[data-escada-recalcular]').count(), 0, 'sem análise da obra ainda, sem aviso de recálculo');
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 2) calcular a obra: as reações entram nas vigas e o resultado fica guardado; memorial com o capítulo do cálculo
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const me = memo.locator('[data-memorial-escadas-calculo]');
      await me.waitFor();
      assert.match(await me.innerText(), /fora da análise global/);
      assert.match(await me.innerText(), /Lance 1: Apoio inferior/);
      assert.match(await me.innerText(), /\[a confirmar\]/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 3) alterar a escada depois do cálculo: aviso de recálculo na janela; recalcular a obra o remove
      await cmd('escada.editar {"id": "e1", "largura": 1.3}');
      await faixaAba(page, 'Análise');
      await page.getByRole('button', { name: 'Calcular escadas…', exact: true }).click();
      const jan2 = page.getByRole('dialog', { name: 'Cálculo das escadas', exact: true });
      await jan2.locator('[data-escada-recalcular]').waitFor();
      assert.match(await jan2.locator('[data-escada-recalcular]').innerText(), /a escada mudou depois do último cálculo/);
      assert.ok((await jan2.locator('[data-escada-lance="E1-1"] [data-escada-reacoes]').innerText()).includes(fmt((pg * ell * 1.3) / 2)), 'a reação acompanha a largura de 1,30 m');
      await jan2.getByRole('button', { name: 'Calcular obra', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await jan2.locator('[data-escada-recalcular]').waitFor({ state: 'detached' });
      await jan2.getByRole('button', { name: 'Fechar', exact: true }).click();
    },
  };

export const f_E4c_menu = {
    name: 'E4c-menu: cálculo das escadas pelo menu da ferramenta, marca "recalcular" no Navegador e reações nas Propriedades',
    async run({ newPage }) {
      const page = await newPage();
      const cmd = await porticoParaEscadas(page);
      await cmd('tipoLance.criar {"id": "T", "tipo": {"nome": "Reto de 18", "tipologia": "reto", "trechos": [18], "espessura": 0.15}}');
      await cmd('escada.criar {"id": "e1", "grupo": "g_3", "origem": [4, 0], "angulo": 90, "piso": 0.2941176, "espelho": 0.1666667, "lances": [{"tipo": "T"}]}');
      await esperarEscadas(page, 'E1');
      // menu da ferramenta: "Ver esforços e deslocamentos" abre a janela do cálculo
      await faixaAba(page, 'Lançamento');
      await page.getByRole('button', { name: 'Escada', exact: true }).click();
      const menu = page.locator('[data-escada-menu]');
      await menu.getByRole('button', { name: 'Ver esforços e deslocamentos', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Cálculo das escadas', exact: true });
      await jan.locator('[data-escada-lance="E1-1"]').waitFor({ timeout: 60000 });
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // "Calcular escada" do menu abre a mesma janela
      await menu.getByRole('button', { name: 'Calcular escada', exact: true }).click();
      await jan.locator('[data-escada-lance="E1-1"]').waitFor({ timeout: 60000 });
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // sem a obra calculada: sem marca no Navegador e reações "—" nas Propriedades
      await page.getByRole('treeitem', { name: /^Escadas/ }).click();
      const no = page.getByRole('treeitem', { name: /^E1 — 1 lance/ });
      await no.waitFor();
      assert.equal(await no.getByText('recalcular', { exact: true }).count(), 0);
      // calcula a obra: as Propriedades mostram as reações; alterar a escada põe a marca "recalcular" no nó
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      await no.click();
      await page.getByRole('dialog', { name: 'Escadas', exact: true }).getByRole('button', { name: 'Fechar', exact: true }).click();
      const prop = page.locator('[data-escada-propriedades]');
      await prop.waitFor();
      await prop.getByText('Cálculo', { exact: true }).click();
      assert.match(await prop.innerText(), /Reações \(G \/ Q\)\s*\d+,\d{2} \/ \d+,\d{2} kN/);
      await cmd('escada.editar {"id": "e1", "largura": 1.3}');
      await no.getByText('recalcular', { exact: true }).waitFor();
      await prop.getByRole('button', { name: 'Calcular escada…', exact: true }).click();
      await jan.locator('[data-escada-recalcular]').waitFor();
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
    },
};
export const f_E4d = {
    name: 'E4d: armadura da escada (janela com seleção do lance, posições contra o cálculo à mão, ligações, bloqueio e opções, resumo geral de aço e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const esperar = (fn, arg, t = 30000) => page.waitForFunction(fn, arg, { timeout: t });
      const nm = (s) => parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
      // pórtico 8 × 5 m com vigas nos eixos y = 0 e y = 5; escada reta de 18 degraus entre elas (origem x = 4, subindo em +y, 17 pisos de 5/17 m), laje de 15 cm
      await cmd('lote {"comandos": [' + [[0, 0], [8, 0], [0, 5], [8, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [8, 0]], [[0, 5], [8, 5]], [[0, 0], [0, 5]], [[8, 0], [8, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('tipoLance.criar {"id": "T", "tipo": {"nome": "Reto de 18", "tipologia": "reto", "trechos": [18], "espessura": 0.15}}');
      await cmd('escada.criar {"id": "e1", "grupo": "g_3", "origem": [4, 0], "angulo": 90, "piso": 0.2941176, "espelho": 0.1666667, "lances": [{"tipo": "T"}]}');
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas ?? []).length === 1, null);
      // valores esperados à mão (q·ℓ²/8 por metro e flexão do bloco retangular, fck 30, CA-50, cobrimento 2,5 cm)
      const piso = 0.2941176, esp = 0.1666667, ell = 17 * piso, cosA = piso / Math.hypot(piso, esp), h = 0.15, d = h - 0.025 - 0.005;
      const pg = (25 * h) / cosA + (25 * esp) / 2 + 1, Md = (1.4 * (pg + 2.5) * ell * ell) / 8, sig = ((0.85 * 30) / 1.4) * 1000, fyd = (500 / 1.15) * 1000;
      const lx = d * (1 - Math.sqrt(1 - (2 * Md) / (sig * d * d))), AsMao = (Md / (fyd * (d - lx / 2))) * 1e4;
      // 1) janela da armadura (aba Análise da faixa)
      await faixaAba(page, 'Análise');
      await page.getByRole('button', { name: 'Armadura das escadas…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Armadura da escada', exact: true });
      await jan.waitFor();
      const pos = jan.locator('[data-escada-arm-posicoes]');
      await pos.waitFor({ timeout: 60000 });
      const n1 = pos.locator('[data-escada-posicao="L1-N1"]');
      const tn1 = await n1.innerText();
      assert.match(tn1, /principal/);
      assert.match(tn1, /inferior/);
      assert.match(tn1, /φ12,5 c\/13/);
      const asNec = nm(await n1.locator('td').nth(7).innerText());
      assert.ok(Math.abs(asNec / AsMao - 1) < 0.02, `As nec. ${asNec} ≈ ${AsMao.toFixed(2)} cm²/m (à mão)`);
      assert.equal(await jan.locator('[data-escada-arm-elevacao]').count(), 1);
      assert.equal(await jan.locator('[data-escada-arm-planta]').count(), 1);
      const lig = await jan.locator('[data-escada-arm-ligacoes]').innerText();
      assert.match(lig, /esperas/);
      assert.match(lig, /passadores/);
      assert.match(await jan.locator('[data-escada-arm-verificacoes]').innerText(), /L1/);
      // 2) editar e bloquear a principal inferior: φ16 c/15; a linha passa a "bloqueada" e o modelo guarda o bloqueio
      await n1.getByLabel(/^φ/).selectOption({ label: '16' });
      const s = n1.getByLabel(/^s/); await s.fill('15'); await s.press('Enter');
      await n1.getByRole('button', { name: 'Bloquear', exact: true }).click();
      await esperar(() => (JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas?.[0]?.armadura?.bloqueadas ?? []).length === 1, null);
      assert.match(await pos.locator('[data-escada-posicao="L1-N1"]').innerText(), /bloqueada/);
      assert.match(await pos.locator('[data-escada-posicao="L1-N1"]').innerText(), /φ16 c\/15/);
      await jan.getByRole('button', { name: /^Desbloquear tudo/ }).click();
      await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.escadas?.[0]?.armadura, null);
      assert.match(await pos.locator('[data-escada-posicao="L1-N1"]').innerText(), /φ12,5 c\/13/);
      // 3) opção das ligações: sem esperas a linha de esperas some
      await jan.getByText('Opções da armadura', { exact: true }).click();
      await jan.getByLabel('Arranques (esperas) no início', { exact: true }).uncheck();
      await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.opcoes?.escadaEsperas === 0, null);
      assert.doesNotMatch(await jan.locator('[data-escada-arm-ligacoes]').innerText(), /esperas \(arranques\)/);
      await jan.getByLabel('Arranques (esperas) no início', { exact: true }).check();
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 4) dimensionar: o aço das escadas soma ao resumo geral e o memorial traz o capítulo da armadura
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const ma = memo.locator('[data-memorial-escadas-armadura]');
      await ma.waitFor();
      assert.match(await ma.innerText(), /Quinas entre trechos e patamares/);
      assert.match(await ma.innerText(), /Lance 1, L1: N1/);
      assert.match(await ma.innerText(), /\[a confirmar\]/);
      assert.match(await memo.innerText(), /Escadas \(lances e patamares\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
};
export const f_E3e = {
    name: 'E3e: lajes alveolares (ficha da obra e erro lógico, atribuir ao pano, placa insuficiente e sugerida, placas na planta e borda cortada, negativo e processo, arquivo .json, memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
      const nm = (s) => parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
      // dois panos 5,5 × 4,8 m empilhados (placas de 4,8 m de vão em y, apoio comum em y = 4,8), vigas de 20 × 50, carga permanente de 10 kN/m²
      await cmd('vento.definir {"ativo": false}');
      await cmd('lote {"comandos": [' + [[0, 0], [5.5, 0], [0, 4.8], [5.5, 4.8], [0, 9.6], [5.5, 9.6]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [5.5, 0]], [[0, 4.8], [5.5, 4.8]], [[0, 9.6], [5.5, 9.6]], [[0, 0], [0, 9.6]], [[5.5, 0], [5.5, 9.6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('carga.area {"grupo": "g_3", "caso": "G", "contorno": [[-0.3, -0.3], [5.8, -0.3], [5.8, 9.9], [-0.3, 9.9]], "valor": 10}');
      // 1) a ficha de exemplo é fictícia e somente leitura; copiar dá uma ficha editável
      const tipos = () => grupoEdif(page, 'Tipos de laje');
      let tl = await tipos();
      let fa = tl.locator('[data-fichas-alveolares]');
      await fa.getByLabel(/^Ficha alveolar da biblioteca/).selectOption({ label: 'Alveolar exemplo (fictícia) · exemplo fictício' });
      assert.match(await fa.locator('[data-selos-alveolar]').innerText(), /somente leitura/);
      assert.match(await fa.locator('[data-selos-alveolar]').innerText(), /ficha fictícia \(demonstração\)/);
      await fa.getByRole('button', { name: 'Copiar ficha alveolar', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.alveolares?.length === 1, null);
      assert.match(await fa.locator('[data-selos-alveolar]').innerText(), /editável/);
      const copia = (await modelo()).tiposLaje.alveolares[0];
      assert.equal(copia.placas[0].id, 'A25-1');
      // 2) Mu menor que Mfis é incoerente: o comando recusa e a mensagem aparece em vermelho; Mu coerente é aceito
      await fa.getByRole('radio', { name: 'Positivo', exact: true }).click();
      const mu = fa.getByLabel(/^Mu positivo da placa alveolar/);
      await mu.fill('20'); await mu.press('Enter');
      await tl.locator('[data-erros-tipos-laje]').waitFor();
      assert.match(await tl.locator('[data-erros-tipos-laje]').innerText(), /incoerente/);
      assert.equal((await modelo()).tiposLaje.alveolares[0].placas[0].positivo.Mu, 40);
      await mu.fill('41'); await mu.press('Enter');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.alveolares?.[0]?.placas?.[0]?.positivo?.Mu === 41, null);
      await tl.locator('[data-erros-tipos-laje]').waitFor({ state: 'detached' });
      await fa.getByRole('radio', { name: 'Resumo', exact: true }).click();
      assert.match(await fa.locator('[data-pp-alveolar]').innerText(), /^4,05$/);
      // 3) atribuir "Alveolar" (ficha da obra, placa A25-1) a todos os panos
      let lj = await grupoEdif(page, /^Lajes —/);
      await lj.locator('label.field', { has: page.locator('.flabel', { hasText: /^Tipo$/ }) }).locator('select').selectOption('alveolar');
      await lj.getByLabel(/^Ficha alveolar do tipo/).selectOption(copia.id);
      await lj.getByLabel(/^Placa alveolar do tipo/).selectOption('A25-1');
      assert.match(await lj.locator('[data-resumo-tipo-alveolar]').innerText(), /Mu 41 kN·m\/m/);
      await lj.getByRole('button', { name: 'Preencher todos os panos', exact: true }).click();
      await esperarModelo(() => { const m = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building; return m?.lajes?.length === 2 && m.lajes.every((l) => l.tipo.tipo === 'alveolar' && l.tipo.placa === 'A25-1'); }, null);
      // 4) cálculo; a placa A25-1 não resiste: janela com a lista da série e a sugestão A25-2; "adotar a sugerida" zera o erro
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      lj = await grupoEdif(page, /^Lajes —/);
      const av = await grupoEdif(page, /^Lajes alveolares/);
      await av.getByLabel('Mostrar placas alveolares na planta', { exact: true }).check();
      await lj.locator('table.loads-ed tbody tr').nth(0).click();
      const abrir = async () => { await av.getByRole('button', { name: 'Janela da laje alveolar', exact: true }).click(); const j = page.getByRole('dialog', { name: 'Laje alveolar L1' }); await j.locator('[data-tabela-candidatas]').waitFor(); return j; };
      let jan = await abrir();
      assert.match(await jan.locator('[data-candidata="A25-1"]').innerText(), /insuficiente/);
      assert.match(await jan.locator('[data-candidata="A25-2"]').innerText(), /sugerida/);
      assert.match(await jan.innerText(), /ALVEOLAR_PLACA/);
      assert.match(await jan.locator('[data-ficha-janela-alveolar]').innerText(), /ficha fictícia \(demonstração\)/);
      await jan.getByRole('button', { name: 'Adotar a placa sugerida', exact: true }).click();
      await page.waitForFunction(() => { const j = document.querySelector('[data-janela-alveolar]'); return !!j && /Placa adotada A25-2/.test(j.textContent ?? '') && !/ALVEOLAR_PLACA/.test(j.textContent ?? ''); }, null, { timeout: 90000 });
      assert.equal((await modelo()).lajes[0].tipo.placa, 'A25-2');
      assert.equal((await modelo()).lajes[0].alveolar.fixa, true);
      // 5) planta: 5 placas por pano (a última, de borda, cortada de 70 cm)
      assert.match(await jan.locator('[data-placa-alveolar]', { hasText: 'borda cortada' }).innerText(), /70/);
      assert.equal(await jan.locator('[data-placa-alveolar]').count(), 5);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-placas-alveolares') === '10', null, { timeout: 20000 });
      // 6) apoio comum: negativo de cálculo numa só ponta; "duas fases" reduz o momento negativo
      jan = await abrir();
      const negativo = async (j) => {
        const linhas = j.locator('[data-tabela-negativos-alveolar] tbody tr');
        for (let i = 0; i < await linhas.count(); i++) {
          const t = await linhas.nth(i).innerText();
          if (!/sem negativo/.test(t)) { const c = t.split('\t'); return { ponta: c[0].trim(), Md: nm(c[1]), texto: t }; }
        }
        return null;
      };
      const n1 = await negativo(jan);
      assert.ok(n1 && n1.Md > 0, 'negativo no apoio comum');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await av.getByLabel(/^Processo construtivo do pano alveolar/).selectOption('2');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.alveolar?.processo === 2, null);
      jan = await abrir();
      await page.waitForFunction(() => /em duas fases/.test(document.querySelector('[data-janela-alveolar]')?.textContent ?? ''), null, { timeout: 90000 });
      const n2 = await negativo(jan);
      assert.ok(n2 && n2.Md < n1.Md, `negativo cai com duas fases (${n1?.Md} -> ${n2?.Md})`);
      await jan.getByRole('button', { name: 'Fechar' }).click();
      // 7) negativo editado na ponta comum: φ16 c/20, comprimento mínimo de 25 % do vão; editado fica na janela e é desbloqueável
      await av.getByLabel(/^Ponta do negativo editado/).selectOption({ label: n1.ponta });
      await av.getByRole('button', { name: 'Aplicar o negativo na ponta', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.alveolar?.negativos?.some((n) => !!n), null);
      const ed = (await modelo()).lajes[0].alveolar.negativos.find((n) => !!n);
      assert.deepEqual({ phi: ed.phi, s: ed.s, percentual: ed.percentual }, { phi: 16, s: 0.2, percentual: 25 });
      jan = await abrir();
      await page.waitForFunction(() => /editado/.test(document.querySelector('[data-tabela-negativos-alveolar]')?.textContent ?? ''), null, { timeout: 90000 });
      const n3 = await negativo(jan);
      assert.match(n3.texto, /φ16 c\/20/);
      assert.ok(nm(n3.texto.split('\t')[4]) >= 0.25 * 4.8 - 0.01, 'comprimento mínimo de 25 % do vão');
      await jan.getByRole('button', { name: 'Fechar' }).click();
      await av.getByRole('button', { name: 'Desbloquear a armadura da laje alveolar', exact: true }).click();
      await esperarModelo(() => { const a = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.alveolar; return !a?.negativos && !a?.fixa; }, null);
      // 8) exportar a ficha para .json, importar como outra ficha e remover (a da obra em uso não sai)
      tl = await tipos();
      fa = tl.locator('[data-fichas-alveolares]');
      const { name, text } = await downloadText(page, () => fa.getByRole('button', { name: 'Exportar fichas alveolares', exact: true }).click());
      assert.match(name, /fichas-alveolares\.json$/);
      const arq = JSON.parse(text);
      assert.equal(arq.fichas.length, 1);
      arq.fichas[0].id = 'fa_importada'; arq.fichas[0].nome = 'Ficha importada';
      await fa.locator('input[type="file"]').setInputFiles({ name: 'fichas-alveolares.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(arq)) });
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.alveolares?.length === 2, null);
      await fa.getByLabel(/^Ficha alveolar da biblioteca/).selectOption({ label: 'Ficha importada · da obra' });
      await fa.getByRole('button', { name: 'Remover ficha alveolar', exact: true }).click();
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.tiposLaje?.alveolares?.length === 1, null);
      await fa.getByLabel(/^Ficha alveolar da biblioteca/).selectOption({ label: copia.nome + ' · da obra' });
      await fa.getByRole('button', { name: 'Remover ficha alveolar', exact: true }).click();
      await tl.locator('[data-erros-tipos-laje]').waitFor();
      assert.match(await tl.locator('[data-erros-tipos-laje]').innerText(), /usada por lajes/);
      // 9) memorial: quadro das placas com a marca da ficha, laje a laje, lista de placas e resumo de aço
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const sec = memo.locator('[data-memorial-alveolares]');
      await sec.waitFor();
      await sec.locator('[data-memorial-alveolar]').first().waitFor({ timeout: 90000 });
      assert.equal(await sec.locator('[data-memorial-alveolar]').count(), 2);
      assert.match(await sec.locator('[data-quadro-placas-alveolares]').innerText(), /ficha fictícia \(demonstração\)/);
      assert.match(await sec.locator('[data-quadro-placas-alveolares]').innerText(), /A30-1/);
      await sec.locator('[data-lista-placas-alveolares]').waitFor();
      await sec.locator('[data-aco-alveolares]').waitFor();
      assert.match(await memo.innerText(), /Lajes alveolares \(negativos na capa\)/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
    },
  };

export const f_E4e = {
    name: 'E4e: escada na vista 3D (menu da ferramenta), isovalores do lance, relatório das escadas, prancha de detalhe (SCE) e reações das escadas na prancha de cargas',
    async run({ newPage }) {
      const page = await newPage();
      const cmd = await porticoParaEscadas(page);
      await cmd(ESCADA_E1);
      await esperarEscadas(page, 'E1');
      // 1) conferência na vista 3D pelo menu da ferramenta Escada
      await faixaAba(page, 'Lançamento');
      await page.getByRole('button', { name: 'Escada', exact: true }).click();
      await page.getByRole('button', { name: 'Conferir na vista 3D', exact: true }).click();
      const cv = page.locator('.v3d-cv');
      await cv.waitFor();
      await page.waitForFunction(() => document.querySelector('.v3d-cv')?.getAttribute('data-status') !== 'carregando');
      const cena = JSON.parse(await cv.getAttribute('data-cena'));
      assert.ok(cena.escada >= 1, `a escada aparece na cena 3D: ${JSON.stringify(cena)}`);
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).click();
      // 2) isovalores do lance na janela do cálculo: planta e vista 3D, troca de grandeza
      await faixaAba(page, 'Análise');
      await page.getByRole('button', { name: 'Calcular escadas…', exact: true }).click();
      const jan = page.getByRole('dialog', { name: 'Cálculo das escadas', exact: true });
      await jan.locator('[data-escada-lance="E1-1"]').waitFor({ timeout: 60000 });
      await jan.locator('[data-escada-iso-botao]').click();
      const iso = jan.locator('[data-escada-iso]');
      await iso.waitFor({ timeout: 60000 });
      assert.ok((await iso.locator('[data-escada-iso-svg="planta"] polygon').count()) > 50, 'triângulos na planta do lance');
      assert.ok((await iso.locator('[data-escada-iso-svg="3d"] polygon').count()) > 50, 'triângulos na vista 3D do lance');
      assert.equal(await iso.locator('[data-escada-iso-leg] .iso-cel').count(), 11);
      assert.match(await iso.locator('[data-escada-iso-titulo]').innerText(), /Deslocamento vertical/);
      await iso.getByLabel(/^Grandeza/).selectOption({ label: 'Mx (sentido da subida) (kN·m/m)' });
      assert.match(await iso.locator('[data-escada-iso-titulo]').innerText(), /Mx \(sentido da subida\), γg·G \+ γq·Q \(ELU\)/);
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      // 3) dimensionar; relatório das escadas (CSV e HTML) com os três níveis
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const dl = await downloadText(page, () => page.locator('[data-relatorio="escadas-csv"]').click());
      assert.equal(dl.name, 'relatorio-escadas.csv');
      for (const t of ['DADOS GERAIS', 'ESCADA E1', 'Reações dos apoios', 'Esforços de cálculo em cada seção', 'Armaduras', 'Peso de aço (sem perdas)']) assert.ok(dl.text.includes(t), `o CSV traz "${t}"`);
      const dh = await downloadText(page, () => page.locator('[data-relatorio="escadas-html"]').click());
      assert.match(dh.text, /Relatório das escadas/);
      assert.match(dh.text, /Dados comuns/);
      // 4) prancha de detalhe das escadas e prancha de cargas com as reações
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Pranchas' }).click();
      const tipo = page.getByLabel('Tipo de prancha');
      const prev = page.locator('.prancha-prev');
      await tipo.selectOption({ label: 'Detalhamento das escadas' });
      await prev.locator('svg').waitFor({ timeout: 60000 });
      const tp = await prev.textContent();
      assert.match(tp, /CORTE A-A/);
      assert.match(tp, /PROPRIEDADES DOS LANCES/);
      assert.match(tp, /TOTAL DAS ESCADAS DA OBRA/);
      assert.match(await page.locator('[data-lista-folhas]').innerText(), /SCE/);
      await tipo.selectOption({ label: 'Cargas por caso e grupo' });
      await prev.locator('svg').waitFor({ timeout: 60000 });
      assert.match(await prev.textContent(), /\(E1\)/);
    },
};

export const f_E5e = {
    name: 'E5e: vista dos textos das vigotas moldadas (armadura inferior indisponível com os esforços ligados)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [4, 0], [0, 5], [4, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [4, 0]], [[0, 5], [4, 5]], [[0, 0], [0, 5]], [[4, 0], [4, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "moldada", "capa": 0.05, "intereixo": 0.5, "bw": 0.12, "h": 0.25, "enchimento": "eps"}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar' }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      const cardL = page.locator('.edif-out .card').filter({ has: page.locator('h3', { hasText: /^Lajes/ }) });
      await cardL.locator('tbody tr').first().dblclick();
      const jan = page.getByRole('dialog', { name: /Resultados do elemento — Laje/ });
      await jan.waitFor();
      await jan.getByRole('radio', { name: 'Vigotas', exact: true }).click();
      await jan.locator('[data-vigotas-ficha]').waitFor();
      const vista = jan.locator('[data-vista-vigotas]');
      const rot = jan.locator('svg[data-vigotas-individuais] text[data-rotulo-vigota]');
      assert.equal(await rot.count(), 0, 'sem texto por padrão');
      await vista.getByRole('radio', { name: 'Armadura inferior', exact: true }).click();
      assert.ok(await rot.count() >= 1, 'textos da armadura inferior');
      assert.match(await rot.first().textContent(), /^φ\d+(,\d)? c=\d+,\d\d m$/);
      // com a exibição de esforços ligada a vista da armadura inferior não existe
      await vista.getByRole('checkbox', { name: 'Exibir esforços' }).check();
      assert.equal(await rot.count(), 0, 'armadura inferior indisponível com esforços');
      assert.match(await vista.innerText(), /indisponível/);
      assert.equal(await vista.getAttribute('data-vista-esforcos'), 'sim');
      // momentos com esforços: M⁺ por metro
      await vista.getByRole('radio', { name: 'Momentos / tipo', exact: true }).click();
      assert.match(await rot.first().textContent(), /^M = \d+,\d\d kN·m\/m$/);
    },
};
