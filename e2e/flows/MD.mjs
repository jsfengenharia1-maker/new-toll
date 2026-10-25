// Fluxos de interface — MD (memória de cálculo detalhada), parte 1/1 (MD1: vigas e pilares; MD2: lajes maciças; MD3: nervuradas e vigotas; MD4: punção; MD5: fundações rasas; MD5b: fundações profundas).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const f_MD1 = {
    name: 'MD1: memória de cálculo detalhada (índice por etapa e elemento, passos da viga e do pilar, filtro, HTML, JSON e ZIP com dados da análise e OpenSees)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      const botao = page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true });
      assert.equal(await botao.isDisabled(), true); // sem cálculo
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      await botao.click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 60000 });
      const t = await doc.innerText();
      for (const s of ['Índice', 'Por elemento', 'Cargas', 'Combinações', 'Análise estrutural', 'Esforços de cálculo', 'Dimensionamento', 'Detalhamento', 'Viga V1', 'Pilar P1 · Tipo 1']) assert.ok(t.includes(s), s);
      assert.match(t, /As = .* cm²/);
      assert.match(t, /VRd2 = 0,27·/);
      assert.match(t, /M1d,mín = /);
      assert.match(t, /lb = \(/);
      assert.match(t, /NBR 6118:2023, 17\.2\.2/);
      const total = await doc.locator('tr[data-passo]').count();
      assert.ok(total > 500, `passos: ${total}`);
      // índice: o link leva à seção do elemento
      assert.equal(await doc.locator('a[href="#md-dimensionamento-viga-v1"]').count(), 2); // índice por etapa e por elemento
      assert.equal(await doc.locator('#md-dimensionamento-viga-v1').count(), 1);
      // filtro por elemento: só os passos globais e os da viga
      await dlg.getByLabel(/^Elemento/).selectOption({ label: 'Viga V2' });
      await page.waitForFunction((n) => document.querySelectorAll('[data-memoria-detalhada] tr[data-passo]').length < n, total);
      const tf = await dlg.locator('[data-memoria-detalhada]').innerText();
      assert.ok(tf.includes('Viga V2') && !tf.includes('Viga V1') && !tf.includes('Pilar P1'));
      // exportações
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: rot, exact: true }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const html = await baixar('Exportar HTML');
      assert.match(html.nome, /^memoria-detalhada-.*\.html$/);
      assert.match(html.dados.toString('utf8'), /^<!doctype html>[\s\S]*data-memoria-detalhada[\s\S]*Viga V2/);
      const json = await baixar('Exportar JSON');
      const mem = JSON.parse(json.dados.toString('utf8'));
      assert.equal(mem.versao, 1);
      assert.ok(mem.passos.length >= total);
      assert.ok(mem.passos.every((p) => p.id && p.etapa && p.formula && p.expressao && p.unidade !== undefined));
      const zip = await baixar('Dados da análise e OpenSees (ZIP)');
      assert.match(zip.nome, /\.zip$/);
      assert.equal(zip.dados.subarray(0, 2).toString('latin1'), 'PK');
      const texto = zip.dados.toString('latin1');
      for (const f of ['analise/nos.csv', 'analise/barras.csv', 'analise/combinacoes.csv', 'analise/reacoes_combinacoes.csv', 'analise/esforcos_combinacoes.csv', 'memoria/memoria.csv', 'opensees/portico.py']) assert.ok(texto.includes(f), f);
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };

export const f_MD2 = {
    name: 'MD2: memória de cálculo detalhada das lajes maciças (Wood-Armer por nó, flexão, fissuração, cortante, flecha, negativos; índice por elemento, filtro, HTML, JSON e CSV)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [12, 0], [0, 5], [6, 5], [12, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [12, 0]], [[0, 5], [12, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]], [[12, 0], [12, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.1}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 60000 });
      await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 60000 });
      const t = await doc.innerText();
      for (const s of ['Laje L1', 'Laje L2', 'Cargas por pano', 'Momentos da grelha – ELU', 'Wood-Armer', 'Momento volvente', 'Flexão – armadura positiva, direção 0', 'Fissuração – armadura positiva, direção 0', 'Cortante da laje (19.4)', 'Flecha (ELS-DEF)', 'Negativos – borda com L2', 'Armadura mínima por metro']) assert.ok(t.includes(s), s);
      assert.match(t, /mx = .*γ|mx = .*·/);
      assert.match(t, /VRd1 = 0,25·/);
      assert.match(t, /NBR 6118:2023, 19\.3\.3\.2/);
      // índice por etapa e por elemento: o link leva à seção da laje
      assert.equal(await doc.locator('a[href="#md-esforcos-laje-l1"]').count(), 2);
      assert.equal(await doc.locator('#md-esforcos-laje-l1').count(), 1);
      assert.equal(await doc.locator('#md-dimensionamento-laje-l1').count(), 1);
      assert.equal(await doc.locator('#md-detalhamento-laje-l1').count(), 1);
      const total = await doc.locator('tr[data-passo]').count();
      // filtro por elemento: só a laje L2 (e os passos globais)
      await dlg.getByLabel(/^Elemento/).selectOption({ label: 'Laje L2' });
      await page.waitForFunction((n) => document.querySelectorAll('[data-memoria-detalhada] tr[data-passo]').length < n, total);
      const tf = await dlg.locator('[data-memoria-detalhada]').innerText();
      assert.ok(tf.includes('Laje L2') && !tf.includes('Laje L1 ') && !tf.includes('Viga V1') && tf.includes('Wood-Armer'));
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: rot, exact: true }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const html = await baixar('Exportar HTML');
      assert.match(html.dados.toString('utf8'), /^<!doctype html>[\s\S]*data-memoria-detalhada[\s\S]*Laje L2[\s\S]*Wood-Armer/);
      const json = await baixar('Exportar JSON');
      const mem = JSON.parse(json.dados.toString('utf8'));
      const dosL2 = mem.passos.filter((p) => p.elemento === 'Laje L2');
      assert.ok(dosL2.length > 40, `passos da laje: ${dosL2.length}`);
      assert.ok(dosL2.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
      assert.ok(['cargas', 'esforcos', 'dimensionamento', 'detalhamento'].every((e) => dosL2.some((p) => p.etapa === e)));
      assert.ok(dosL2.some((p) => /^Momento (positivo|negativo) máximo/.test(p.descricao) && typeof p.entradas.mx === 'number'));
      const zip = await baixar('Dados da análise e OpenSees (ZIP)');
      assert.ok(zip.dados.toString('latin1').includes('memoria/memoria.csv'));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };

export const f_MD3 = {
    name: 'MD3: memória de cálculo detalhada das nervuradas, das vigotas (treliçadas e por ficha), da flecha por alinhamento e das alveolares (HTML, JSON e CSV)',
    async run({ newPage }) {
      const montar = async (tipo, opcoes) => {
        const page = await newPage();
        await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
        const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
        await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [12, 0], [0, 5], [6, 5], [12, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
        await cmd('lote {"comandos": [' + [[[0, 0], [12, 0]], [[0, 5], [12, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]], [[12, 0], [12, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.45}}}`).join(', ') + ']}');
        await cmd(`laje.detectarPanos {"grupo": "g_3", "tipo": ${tipo}}`);
        if (opcoes) await cmd(`opcoes.definir {"valores": ${opcoes}}`);
        await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
        await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
        await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
        await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
        const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
        const doc = dlg.locator('[data-memoria-detalhada]');
        await doc.waitFor({ timeout: 90000 });
        return { page, dlg, doc };
      };
      const baixar = async (page, dlg, rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: rot, exact: true }).click()]);
        return readFileSync(await dl.path()).toString('utf8');
      };
      // nervuradas bidirecionais
      {
        const { page, dlg, doc } = await montar('{"tipo": "nervurada", "forma": "cat:rec-60-30", "hTotal": 0.35, "capa": 0.05}');
        const t = await doc.innerText();
        for (const s of ['Laje L1', 'Laje L2', 'Seção da nervura', 'Regime de cisalhamento e da mesa', 'Nervura X1 – esforços', 'Nervura X1 – flexão positiva', 'Linha neutra', 'Armadura mínima da nervura', 'Nervura X1 – cortante', 'Seções de verificação', 'Carga de cálculo da mesa', 'Quantitativo de aço', 'Peso total do aço da laje']) assert.ok(t.includes(s), `falta "${s}" na memória das nervuradas`);
        assert.match(t, /VRd1 = 0,25·/);
        assert.ok(await doc.locator('a[href="#md-dimensionamento-laje-l1"]').count() >= 1);
        const html = await baixar(page, dlg, 'Exportar HTML');
        assert.match(html, /^<!doctype html>[\s\S]*data-memoria-detalhada[\s\S]*Nervura X1/);
        const mem = JSON.parse(await baixar(page, dlg, 'Exportar JSON'));
        const dosL1 = mem.passos.filter((p) => p.elemento === 'Laje L1');
        assert.ok(dosL1.length > 60, `passos da nervurada: ${dosL1.length}`);
        assert.ok(dosL1.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
        assert.ok(dosL1.some((p) => p.topico === 'Mesa'));
        const zip = await baixar(page, dlg, 'Dados da análise e OpenSees (ZIP)');
        assert.ok(zip.includes('memoria/memoria.csv') && zip.includes('Nervura X1'));
        await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
        await dlg.waitFor({ state: 'detached' });
      }
      // vigotas treliçadas
      {
        const { page, dlg, doc } = await montar('{"tipo": "trelicada", "modelo": "H12", "capa": 0.04}', '{"vigotaMontagem": 1, "vigotaEscoraDist": 1.2}');
        const t = await doc.innerText();
        for (const s of ['Laje L1', 'Banzo inferior da treliça', 'Capa mínima', 'Grupo 1 – esforços', 'Grupo 1 – flexão positiva', 'Grupo 1 – cortante na ponta inicial', 'Faixa maciçada necessária', 'Montagem sobre escoras', 'Distribuição na capa', 'Quantitativo de aço']) assert.ok(t.includes(s), `falta "${s}" na memória das vigotas`);
        const mem = JSON.parse(await baixar(page, dlg, 'Exportar JSON'));
        const dosL1 = mem.passos.filter((p) => p.elemento === 'Laje L1');
        assert.ok(dosL1.length > 40 && dosL1.every((p) => p.id && p.formula && p.expressao));
        assert.ok(dosL1.some((p) => p.topico === 'Montagem sobre escoras' && typeof p.entradas.q === 'number'));
        await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
        await dlg.waitFor({ state: 'detached' });
      }
      // vigotas por ficha (armada): ficha, tipo da série e flecha de cada alinhamento (Branson)
      {
        const { page, dlg, doc } = await montar('{"tipo": "vigotas", "ficha": "ex:armada", "serie": "A12"}');
        const t = await doc.innerText();
        for (const s of ['Laje L1', 'Ficha e série', 'Grupo 1 – esforços', 'Grupo 1 – flexão positiva', 'Grupo 1 – cortante na ponta inicial', 'Distribuição na capa', 'Flecha do alinhamento 1']) assert.ok(t.includes(s), `falta "${s}" nas vigotas por ficha`);
        assert.match(t, /Tipo da série/);
        const mem = JSON.parse(await baixar(page, dlg, 'Exportar JSON'));
        const dosL1 = mem.passos.filter((p) => p.elemento === 'Laje L1');
        assert.ok(dosL1.length > 60 && dosL1.every((p) => p.id && p.formula && p.expressao));
        assert.ok(dosL1.some((p) => p.topico === 'Ficha e série' && typeof p.entradas.nCandidatos === 'number'));
        assert.ok(dosL1.some((p) => /^Flecha do alinhamento \d+/.test(p.topico) && /^Alinhamento \d+/.test(p.descricao) && typeof p.entradas.kappa === 'number'));
        await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
        await dlg.waitFor({ state: 'detached' });
      }
      // lajes alveolares: placa, envoltória por metro, escolha da placa, apoios
      {
        const { page, dlg, doc } = await montar('{"tipo": "alveolar", "ficha": "ex:alveolar", "placa": "A25-3"}');
        const t = await doc.innerText();
        for (const s of ['Laje L1', 'Placa e cargas', 'Esforços por metro', 'Escolha da placa', 'Placas e apoios', 'Quantitativo']) assert.ok(t.includes(s), `falta "${s}" nas alveolares`);
        const mem = JSON.parse(await baixar(page, dlg, 'Exportar JSON'));
        const dosL1 = mem.passos.filter((p) => p.elemento === 'Laje L1');
        assert.ok(dosL1.length > 20 && dosL1.every((p) => p.id && p.formula && p.expressao));
        assert.ok(dosL1.some((p) => p.topico === 'Esforços por metro' && /^Placa \d+/.test(p.descricao) && typeof p.entradas.r_mPos === 'number'));
        await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
        await dlg.waitFor({ state: 'detached' });
      }
    },
  };

export const f_MD4 = {
    name: 'MD4: memória de cálculo detalhada da punção (FSd e momentos, K, contornos C, C′ e C″ com u, Wp e τSd, varredura de cortante, armadura de punção; filtro, HTML, JSON e CSV)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('vento.definir {"ativo": false}');
      await cmd('grupo.editar {"id": "g_3", "q": 14}');
      const xs = [0.25, 6, 11.75];
      await cmd('lote {"comandos": [' + xs.flatMap((x) => xs.map((y) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.5, "h": 0.5}}}`)).join(', ') + ']}');
      await cmd('laje.criar {"grupo": "g_3", "contorno": [[0, 0], [12, 0], [12, 12], [0, 12]], "tipo": {"tipo": "macica", "h": 0.16}}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 90000 });
      const t = await doc.innerText();
      for (const s of ['Punção P5 · Tipo 1', 'Punção P1 · Tipo 1', 'Solicitação (FSd e momentos)', 'Tipo de apoio e coeficiente K', 'Tensões resistentes', 'Contorno C', 'Contorno C′', 'Cortante da laje no entorno do pilar (19.4.1)', 'Armadura de punção – dimensionamento', 'Armadura de punção – disposição']) assert.ok(t.includes(s), `falta "${s}"`);
      assert.match(t, /τRd2 = 0,27·/);
      assert.match(t, /τSd = .* MPa/);
      assert.match(t, /NBR 6118:2023, 19\.5\.3\.1/);
      assert.equal(await doc.locator('#md-dimensionamento-puncao-p5-tipo-1').count(), 1);
      const total = await doc.locator('tr[data-passo]').count();
      // filtro por elemento: só o pilar interno P5 (e os passos globais)
      await dlg.getByLabel(/^Elemento/).selectOption({ label: 'Punção P5 · Tipo 1' });
      await page.waitForFunction((n) => document.querySelectorAll('[data-memoria-detalhada] tr[data-passo]').length < n, total);
      const tf = await dlg.locator('[data-memoria-detalhada]').innerText();
      assert.ok(tf.includes('Punção P5 · Tipo 1') && !tf.includes('Punção P1 · Tipo 1') && !tf.includes('Viga V1') && tf.includes('Contorno C′'));
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: rot, exact: true }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      const html = await baixar('Exportar HTML');
      assert.match(html.dados.toString('utf8'), /^<!doctype html>[\s\S]*data-memoria-detalhada[\s\S]*Punção P5 · Tipo 1[\s\S]*Contorno C′/);
      const json = await baixar('Exportar JSON');
      const mem = JSON.parse(json.dados.toString('utf8'));
      const dosP5 = mem.passos.filter((p) => p.elemento === 'Punção P5 · Tipo 1');
      assert.ok(dosP5.length > 60, `passos da punção: ${dosP5.length}`);
      assert.ok(dosP5.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
      assert.ok(['esforcos', 'dimensionamento', 'detalhamento'].every((e) => dosP5.some((p) => p.etapa === e)));
      // o contorno traz todos os segmentos (x0, y0, x1, y1) e u é a soma dos comprimentos
      const pu = dosP5.find((p) => p.topico === 'Contorno C′' && p.descricao.startsWith('Contorno C′ a'));
      const segs = JSON.parse(pu.entradas.segmentos);
      assert.equal(segs.length, pu.entradas.trechos);
      const u = segs.reduce((s, [x0, y0, x1, y1]) => s + Math.hypot(x1 - x0, y1 - y0), 0);
      assert.ok(Math.abs(u - pu.resultado) < 1e-9 * u);
      assert.ok(dosP5.some((p) => p.topico === 'Armadura de punção – disposição' && typeof p.entradas.total === 'number'));
      const zip = await baixar('Dados da análise e OpenSees (ZIP)');
      assert.ok(zip.dados.toString('latin1').includes('memoria/memoria.csv'));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };

export const f_MD5 = {
    name: 'MD5: memória de cálculo detalhada das fundações rasas (cargas na fundação, sapata isolada com σadm, tensões, altura, flexão e punção; sapata corrida; filtro, HTML, JSON e ZIP)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('vento.definir {"ativo": false}');
      await cmd('lote {"comandos": [' + [0, 4, 8].flatMap((x) => [0, 4, 8].map((y) => [x, y])).map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      const leituras = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35].map((N) => `{"N": ${N}, "solo": "silteArenoso"}`).join(', ');
      await cmd(`sondagem.criar {"nome": "SP-01", "x": 2, "y": 2, "nivelAgua": 12, "leituras": [${leituras}]}`);
      await cmd('fundacao.terreno {"sigmaAdm": 250}');
      await cmd('fundacao.gerar {"tipo": "sapata", "associadas": false, "vigasEquilibrio": false, "vigasTravamento": false}');
      await cmd('corrida.criar {"pontos": [[0, 20], [6, 20]], "bw": 0.2}');
      await cmd('carga.linha {"grupo": "fundacao", "pontos": [[0, 20], [6, 20]], "valor": 150, "caso": "G"}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 90000 });
      const t = await doc.innerText();
      for (const s of ['Sapata corrida SC1', 'Cargas características por caso', 'Combinações raras (verificação geotécnica)', 'Envoltória das combinações raras', 'Carga adotada no elemento', 'Tensão admissível do solo', 'Peso próprio e dimensões em planta', 'Altura e ancoragem do pilar', 'Esforços de cálculo na base', 'Compressão diagonal e punção', 'Flexão transversal da aba (por metro)']) assert.ok(t.includes(s), `falta "${s}" na memória das fundações`);
      assert.match(t, /σadm = .* kPa/);
      assert.match(t, /NBR 6122:2019/);
      const total = await doc.locator('tr[data-passo]').count();
      const baixar = async (rot) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: rot, exact: true }).click()]);
        return { nome: dl.suggestedFilename(), dados: readFileSync(await dl.path()) };
      };
      // só a sapata do pilar central tem solução (as de divisa e de canto pedem viga de equilíbrio): a cadeia dela
      const mem0 = JSON.parse((await baixar('Exportar JSON')).dados.toString('utf8'));
      const el = mem0.passos.find((p) => p.topico === 'Peso próprio e dimensões em planta')?.elemento;
      assert.match(el, /^Sapata S\d+$/);
      const outra = mem0.passos.find((p) => /^Sapata S\d+$/.test(p.elemento) && p.elemento !== el)?.elemento;
      assert.equal(await doc.locator('#md-dimensionamento-' + el.toLowerCase().replace(' ', '-')).count(), 1);
      // filtro por elemento: só essa sapata (e os passos globais)
      await dlg.getByLabel(/^Elemento/).selectOption({ label: el });
      await page.waitForFunction((n) => document.querySelectorAll('[data-memoria-detalhada] tr[data-passo]').length < n, total);
      const tf = await dlg.locator('[data-memoria-detalhada]').innerText();
      assert.ok(tf.includes(el), `filtro: falta ${el}`);
      assert.ok(!tf.includes(outra + ' '), `filtro: sobrou ${outra}`);
      assert.ok(!tf.includes('Viga V1'), 'filtro: sobrou viga');
      assert.ok(tf.includes('Tensões no solo'), 'filtro: falta Tensões no solo');
      const html = await baixar('Exportar HTML');
      assert.match(html.dados.toString('utf8'), /^<!doctype html>[\s\S]*data-memoria-detalhada[\s\S]*Tensões no solo/);
      await dlg.getByLabel(/^Elemento/).selectOption({ label: 'Todos' });
      await page.waitForFunction((n) => document.querySelectorAll('[data-memoria-detalhada] tr[data-passo]').length >= n, total);
      const json = await baixar('Exportar JSON');
      const mem = JSON.parse(json.dados.toString('utf8'));
      const s1 = mem.passos.filter((p) => p.elemento === el);
      assert.ok(s1.length > 50, `passos da sapata: ${s1.length}`);
      assert.ok(s1.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
      assert.ok(['cargas', 'combinacoes', 'esforcos', 'dimensionamento', 'detalhamento'].every((e) => s1.some((p) => p.etapa === e)));
      // as tensões na base trazem as entradas exatas: σmáx refeita de A, B, N, ex, ey
      const pr = s1.find((p) => p.topico.startsWith('Tensões no solo') && p.descricao.startsWith('Tensões na base'));
      assert.ok(typeof pr.entradas.A === 'number' && typeof pr.entradas.N === 'number' && typeof pr.resultado === 'number');
      const sc = mem.passos.filter((p) => p.elemento === 'Sapata corrida SC1');
      assert.ok(sc.length > 20 && sc.some((p) => p.topico === 'Flexão transversal da aba (por metro)' && /^Momento fletor por metro/.test(p.descricao) && typeof p.entradas.s0 === 'number'));
      const zip = await baixar('Dados da análise e OpenSees (ZIP)');
      assert.ok(zip.dados.toString('latin1').includes('memoria/memoria.csv'));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };

// MD5b: fundações profundas (blocos sobre estacas, estacas, tubulões)
async function prepararProfundas(page, tipo, terreno) {
  await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
  const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
  await cmd('vento.definir {"ativo": false}');
  await cmd('lote {"comandos": [' + [0, 4, 8].flatMap((x) => [0, 4].map((y) => [x, y])).map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
  const leituras = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35].map((N) => `{"N": ${N}, "solo": "silteArenoso"}`).join(', ');
  await cmd(`sondagem.criar {"nome": "SP-01", "x": 2, "y": 2, "nivelAgua": 12, "leituras": [${leituras}]}`);
  await cmd(`fundacao.terreno ${terreno}`);
  await cmd(`fundacao.gerar {"tipo": "${tipo}", ${tipo === 'bloco' ? '"estaca": "e_hc", ' : ''}"associadas": false, "vigasEquilibrio": false, "vigasTravamento": false}`);
  await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
  await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
  await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
  const doc = dlg.locator('[data-memoria-detalhada]');
  await doc.waitFor({ timeout: 90000 });
  return { dlg, doc };
}
async function baixarJson(page, dlg) {
  const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'Exportar JSON', exact: true }).click()]);
  return JSON.parse(readFileSync(await dl.path()).toString('utf8'));
}

export const f_MD5b = {
    name: 'MD5b: memória de cálculo detalhada dos blocos sobre estacas e das estacas (Décourt-Quaresma por camada, Padm, Nd,mín, Miche; bielas e tirantes; filtro e JSON)',
    async run({ newPage }) {
      const page = await newPage();
      const { dlg, doc } = await prepararProfundas(page, 'bloco', '{"sigmaAdm": 250, "estacas": [{"id": "e_hc", "tipo": "helice", "D": 40, "modo": "sondagem"}, {"id": "e_es", "tipo": "escavada", "D": 50, "modo": "sondagem"}]}');
      const t = await doc.innerText();
      for (const s of ['Bloco sobre estacas B1', 'Sondagem de cálculo', 'Limites de profundidade', 'Capacidade de carga', 'Cargas nas estacas', 'Materiais e parâmetros do bloco']) assert.ok(t.includes(s), `falta "${s}"`);
      assert.match(t, /Padm = mín/);
      assert.match(t, /Décourt-Quaresma/);
      const mem = await baixarJson(page, dlg);
      const el = mem.passos.find((p) => /^Bloco sobre estacas B\d+$/.test(p.elemento) && p.topico.startsWith('Capacidade de carga'))?.elemento;
      assert.ok(el, 'bloco com estaca calculada pela sondagem');
      const ps = mem.passos.filter((p) => p.elemento === el);
      assert.ok(ps.length > 40, `passos do bloco: ${ps.length}`);
      assert.ok(ps.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
      // Padm refeito das entradas registradas: mín[(Rp + Rl)/2; Rp/4 + Rl/1,3]
      const pa = ps.find((p) => p.descricao.startsWith('Carga admissível'));
      const { RpUsed, Rl, pGlobal, pParcial } = pa.entradas;
      assert.ok(Math.abs(Math.min((RpUsed + Rl) / 2, RpUsed / 4 + Rl / 1.3) - Math.min(pGlobal, pParcial)) < 1e-9);
      assert.ok(ps.filter((p) => p.descricao.startsWith('Camada do metro')).length >= 3);
      assert.ok(ps.some((p) => p.topico === 'Cargas nas estacas' && p.descricao.startsWith('Nd,mín')));
      // filtro por elemento
      await dlg.getByLabel(/^Elemento/).selectOption({ label: el });
      await page.waitForFunction(() => !document.querySelector('[data-memoria-detalhada]').innerText.includes('Viga V1'));
      const tf = await dlg.locator('[data-memoria-detalhada]').innerText();
      assert.ok(tf.includes('Capacidade de carga') && tf.includes(el));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };

export const f_MD5c = {
    name: 'MD5c: memória de cálculo detalhada dos tubulões (MD5b) (fuste, cota de apoio, σadm pelo SPT, base alargada e tensões)',
    async run({ newPage }) {
      const page = await newPage();
      const { dlg, doc } = await prepararProfundas(page, 'tubulao', '{"sigmaAdm": 250}');
      const t = await doc.innerText();
      for (const s of ['Tubulão T1', 'Fuste', 'Cota de apoio', 'Base alargada']) assert.ok(t.includes(s), `falta "${s}"`);
      const mem = await baixarJson(page, dlg);
      const ps = mem.passos.filter((p) => /^Tubulão T\d+$/.test(p.elemento));
      assert.ok(ps.length > 30);
      const tb = ps.find((p) => p.descricao.startsWith('Tensão limite'));
      assert.ok(Math.abs(0.85 * tb.entradas.fck / tb.entradas.gc - tb.entradas.lim) < 1e-9);
      assert.ok(ps.some((p) => p.topico === 'Base alargada' && p.descricao.startsWith('Tensões na base circular')));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };

// MD5c (radier e vigas de fundação)
export const f_MD5d = {
    name: 'MD5c: memória de cálculo detalhada do radier (tensões no solo por caso, Wood-Armer por nó, flexão por face e direção, fissuração, barras e referência à punção)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('vento.definir {"ativo": false}');
      await cmd('lote {"comandos": [' + [[1, 1], [7, 1], [7, 6], [1, 6]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[1, 1], [7, 1]], [[1, 6], [7, 6]], [[1, 1], [1, 6]], [[7, 1], [7, 6]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.5}}}`).join(', ') + ']}');
      await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('caso.criar {"nome": "Piso", "natureza": "Q"}');
      await cmd('radier.criar {"contorno": [[0, 0], [8, 0], [8, 7], [0, 7]], "h": 0.4, "k": 40000, "sigmaAdm": 300}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 90000 });
      const t = await doc.innerText();
      for (const s of ['Radier R1', 'Radier · tensões no solo', 'Wood-Armer', 'Flexão – face inferior (positiva)', 'Radier · punção']) assert.ok(t.includes(s), `falta "${s}"`);
      const mem = await baixarJson(page, dlg);
      const ps = mem.passos.filter((p) => p.elemento === 'Radier R1');
      assert.ok(ps.length > 40, `passos do radier: ${ps.length}`);
      assert.ok(ps.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
      // σmáx = −k·Σ f·uz refeita da decomposição por caso
      const sm = ps.find((p) => p.topico === 'Radier · tensões no solo' && p.descricao.startsWith('Tensão máxima'));
      const w = JSON.parse(sm.entradas.contrib).reduce((a, [, f, uz]) => a + f * uz, 0);
      assert.ok(Math.abs(-sm.entradas.k * w - sm.resultado) < 1e-9 * Math.max(1, Math.abs(sm.resultado)));
      assert.ok(ps.some((p) => /^Momentos da grelha – ELU/.test(p.topico) && p.descricao.startsWith('Momento mx')));
      assert.ok(mem.passos.some((p) => /^Punção P\d+ · Radier R1$/.test(p.elemento)));
      await dlg.getByLabel(/^Elemento/).selectOption({ label: 'Radier R1' });
      await page.waitForFunction(() => !document.querySelector('[data-memoria-detalhada]').innerText.includes('Viga V1'));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };

export const f_MD5e = {
    name: 'MD5c: memória de cálculo detalhada das vigas de fundação (alavanca, travamento, esforços no ponto governante, seção, flexão, cortante e quantitativos)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('vento.definir {"ativo": false}');
      await cmd('lote {"comandos": [' + [0, 4, 8].flatMap((x) => [0, 4].map((y) => [x, y])).map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
      await cmd('fundacao.terreno {"sigmaAdm": 250}');
      await cmd('fundacao.gerar {"tipo": "sapata", "associadas": false, "vigasEquilibrio": true, "vigasTravamento": true}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 90000 });
      const mem = await baixarJson(page, dlg);
      const els = [...new Set(mem.passos.map((p) => p.elemento).filter((e) => /^Viga de fundação VF\d+$/.test(e)))];
      assert.ok(els.length >= 1, 'vigas de fundação na memória');
      const ps = mem.passos.filter((p) => p.elemento === els[0]);
      assert.ok(ps.length > 20, `passos da viga: ${ps.length}`);
      assert.ok(ps.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
      const ec = ps.find((p) => p.topico === 'Viga de fundação · esforços de cálculo');
      assert.ok(Math.abs(ec.entradas.gf * ec.entradas.Vk - ec.entradas.Vd) < 1e-9 * Math.max(1, ec.entradas.Vd));
      assert.ok(ps.some((p) => p.topico === 'Viga de fundação · cortante' && p.descricao.startsWith('Resistência da biela')));
      const t = await doc.innerText();
      assert.ok(t.includes(els[0]) && t.includes('Viga de fundação · seção'));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };

export const f_MD6 = {
    name: 'MD6: memória de cálculo detalhada das escadas (cargas e reações como cargas lineares, Wood-Armer por faixa, flexão, fissuração, cortante, flecha, ancoragens, barras e peso; filtro e JSON)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.25, "h": 0.25}}}`).join(', ') + ']}');
      await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.15, "h": 0.4}}}`).join(', ') + ']}');
      await cmd('tipoLance.criar {"id": "T", "tipo": {"nome": "T", "tipologia": "reto", "trechos": [18], "espessura": 0.15}}');
      await cmd('escada.criar {"id": "e1", "grupo": "g_3", "origem": [0.5, 1], "angulo": 0, "piso": 0.2967, "espelho": 0.16666667, "lances": [{"tipo": "T"}]}');
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: 'Calcular e dimensionar', exact: true }).click();
      await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 90000 });
      await page.getByRole('button', { name: 'Memória de cálculo detalhada', exact: true }).click();
      const dlg = page.getByRole('dialog', { name: 'Memória de cálculo detalhada' });
      const doc = dlg.locator('[data-memoria-detalhada]');
      await doc.waitFor({ timeout: 90000 });
      const t = await doc.innerText();
      for (const s of ['Escada E1 · Lance 1', 'Cargas do lance', 'Reações como cargas lineares', 'Esforços do trecho L1', 'Wood-Armer', 'Flexão – trecho L1', 'Fissuração – trecho L1', 'Cortante – trecho L1', 'Ancoragem – trecho L1', 'Flecha (ELS-DEF)', 'Barras – trecho L1', 'Quantitativo do lance']) assert.ok(t.includes(s), `falta "${s}"`);
      assert.match(t, /Carga vertical total do caso G/);
      const mem = await baixarJson(page, dlg);
      const el = 'Escada E1 · Lance 1';
      const ps = mem.passos.filter((p) => p.elemento === el);
      assert.ok(ps.length > 100, `passos da escada: ${ps.length}`);
      assert.ok(ps.every((p) => p.id && p.etapa && p.formula && p.expressao && p.entradas && typeof p.entradas === 'object'));
      // carga total refeita das parcelas registradas
      const tot = ps.find((p) => p.descricao.startsWith('Carga vertical total do caso G'));
      const soma = Object.keys(tot.entradas).filter((k) => k.startsWith('parcela')).reduce((s, k) => s + tot.entradas[k], 0);
      assert.ok(Math.abs(soma - tot.resultado) < 1e-9 * Math.max(1, Math.abs(tot.resultado)));
      // reação como carga linear: q = R/ℓ + pp
      const q = ps.find((p) => p.topico === 'Reações como cargas lineares' && p.descricao.includes('caso G'));
      assert.ok(Math.abs(q.entradas.R / q.entradas.comprimento + q.entradas.pesoProprio - q.resultado) < 1e-9);
      // lance reto biapoiado da E4d: As da faixa de maior momento ≈ 9,3 cm²/m (q·ℓ²/8: Md = 44,01 kN·m/m)
      const as = ps.find((p) => p.topico.includes('faixa de maior momento') && p.topico.includes('armadura inferior, direção x') && p.descricao.startsWith('Armadura de tração'));
      const As = as.entradas.C / as.entradas.fyd * 1e4;
      assert.ok(As > 9.2 && As < 9.4, `As = ${As}`);
      const md = ps.find((p) => p.topico.startsWith('Esforços do trecho L1') && /armadura inferior na direção x/.test(p.descricao) && p.resultado > 44);
      assert.ok(md && md.resultado > 44 && md.resultado < 44.5, `Md = ${md?.resultado}`);
      // filtro por elemento
      await dlg.getByLabel(/^Elemento/).selectOption({ label: el });
      await page.waitForFunction(() => !document.querySelector('[data-memoria-detalhada]').innerText.includes('Viga V1'));
      const tf = await dlg.locator('[data-memoria-detalhada]').innerText();
      assert.ok(tf.includes('Reações como cargas lineares') && tf.includes(el));
      await dlg.getByRole('button', { name: 'Fechar', exact: true }).click();
      await dlg.waitFor({ state: 'detached' });
    },
  };
