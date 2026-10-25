// Fluxos de interface — layout (parte 1/1).
import assert from 'node:assert/strict';
import { tab } from './helpers.mjs';

export const f_layout = {
    name: 'layout: faixa de comandos por módulo, faixa recolhível, docas recolhíveis e redimensionáveis, largura guardada',
    async run({ newPage }) {
      const page = await newPage();
      const modulo = (n) => page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: n, exact: true });
      await modulo('Edifício').click();
      const abas = page.getByRole('tablist', { name: 'Faixa de comandos' }).getByRole('tab');
      const nomes = async () => (await abas.allTextContents()).map((t) => t.trim());
      const ed = await nomes();
      for (const a of ['Arquivo', 'Lançamento', 'Edição', 'Cargas e ações', 'Análise', 'Dimensionamento', 'Fundações', 'Pranchas', 'Vista']) assert.ok(ed.includes(a), `aba ${a} no Edifício`);
      await modulo('Pórtico').click();
      const po = await nomes();
      for (const a of ['Arquivo', 'Lançamento', 'Edição', 'Análise', 'Vista']) assert.ok(po.includes(a), `aba ${a} no Pórtico`);
      await modulo('Fundações').click();
      const fu = await nomes();
      for (const a of ['Arquivo', 'Lançamento', 'Fundações', 'Vista']) assert.ok(fu.includes(a), `aba ${a} em Fundações`);
      await modulo('Edifício').click();
      // faixa recolhível
      await page.getByRole('button', { name: 'Recolher a faixa de comandos' }).click();
      assert.equal(await page.getByRole('toolbar', { name: /^Comandos:/ }).count(), 0);
      await page.getByRole('button', { name: 'Expandir a faixa de comandos' }).click();
      assert.equal(await page.getByRole('toolbar', { name: /^Comandos:/ }).count(), 1);
      // doca esquerda: recolher, mostrar, redimensionar pelo teclado
      const dock = page.getByRole('complementary', { name: 'painel lateral esquerdo' });
      const w0 = Math.round((await dock.boundingBox()).width);
      await dock.getByRole('button', { name: 'Recolher painel lateral esquerdo' }).click();
      assert.ok((await dock.boundingBox()).width < 40);
      await dock.getByRole('button', { name: 'Mostrar painel lateral esquerdo' }).click();
      await dock.getByRole('separator').focus();
      for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
      assert.equal(Math.round((await dock.boundingBox()).width), w0 + 80);
      // a largura volta ao recarregar
      await page.reload();
      await page.locator('.bname').waitFor();
      await modulo('Edifício').click();
      assert.equal(Math.round((await page.getByRole('complementary', { name: 'painel lateral esquerdo' }).boundingBox()).width), w0 + 80);
    },
  };

const ABAS_ID = { arquivo: 'Arquivo', lancamento: 'Lançamento', edicao: 'Edição', cargas: 'Cargas e ações', analise: 'Análise', dimensionamento: 'Dimensionamento', fundacoes: 'Fundações', pranchas: 'Pranchas', vista: 'Vista' };
const moduloTab = (page, n) => page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: n, exact: true });
const faixaTabs = (page) => page.getByRole('tablist', { name: 'Faixa de comandos' });

export const f_layout_1280 = {
    name: 'layout 1280x800: duas docas no máximo deixam o desenho útil, sem rolagem horizontal, título Propriedades inteiro, faixa de altura estável',
    async run({ newPage }) {
      const page = await newPage(undefined, { viewport: { width: 1280, height: 800 } });
      await moduloTab(page, 'Edifício').click();
      const esq = page.getByRole('complementary', { name: 'painel lateral esquerdo' }), dir = page.getByRole('complementary', { name: 'painel lateral direito' });
      await esq.getByRole('separator').focus();
      for (let i = 0; i < 45; i++) await page.keyboard.press('ArrowRight');
      await dir.getByRole('separator').focus();
      for (let i = 0; i < 45; i++) await page.keyboard.press('ArrowLeft');
      const cv = await page.locator('canvas.int').boundingBox();
      assert.ok(cv.width >= 300, `desenho com ${cv.width}px de largura com as docas no máximo`);
      assert.ok(cv.height >= 300, `desenho com ${cv.height}px de altura`);
      const rolagem = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.ok(rolagem.sw <= rolagem.cw, `rolagem horizontal da página (${rolagem.sw} > ${rolagem.cw})`);
      // título da doca direita visível por inteiro, sem o botão de recolher por cima
      const titulo = dir.locator('.phead span').filter({ hasText: /^Propriedades$/ });
      await titulo.waitFor();
      const t = await titulo.boundingBox(), bt = await dir.getByRole('button', { name: /^Recolher painel lateral direito/ }).boundingBox();
      assert.ok(t.x >= bt.x + bt.width - 0.5, 'o botão de recolher cobre o título Propriedades');
      assert.ok(await titulo.evaluate((e) => e.scrollWidth <= e.clientWidth + 1), 'título Propriedades cortado');
      // a altura da faixa não muda entre as abas
      const alturas = new Map();
      const nomes = (await faixaTabs(page).getByRole('tab').allTextContents()).map((s) => s.trim());
      for (const n of nomes) {
        await faixaTabs(page).getByRole('tab', { name: n, exact: true }).click();
        alturas.set(n, Math.round((await page.locator('.ribbon-wrap').boundingBox()).height));
        assert.ok(await page.locator('.ribbon').evaluate((e) => e.scrollHeight <= e.clientHeight + 1), `aba ${n}: o conteúdo da faixa passa da altura fixa`);
      }
      assert.equal(new Set(alturas.values()).size, 1, `altura da faixa varia entre as abas: ${JSON.stringify([...alturas])}`);
    },
  };

export const f_layout_1024 = {
    name: 'layout 1024: Pórtico e Edifício sem rolagem horizontal da página',
    async run({ newPage }) {
      const page = await newPage(undefined, { viewport: { width: 1024, height: 768 } });
      for (const m of ['Pórtico', 'Edifício', 'Fundações']) {
        await moduloTab(page, m).click();
        const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        assert.ok(r.sw <= r.cw, `${m}: rolagem horizontal da página (${r.sw} > ${r.cw})`);
      }
    },
  };

export const f_layout_teclado = {
    name: 'layout: setas nas abas (tabindex móvel), Configuração leva o foco e o devolve, layout guardado inválido é ignorado',
    async run({ newPage }) {
      const page = await newPage(() => { try { localStorage.setItem('statikos:layout', JSON.stringify({ faixaAberta: true, aba: {}, docas: { 'edificio-esq': { w: 'abc', aberta: true }, 'edificio-dir': { w: 99999, aberta: true } } })); } catch { /* sem armazenamento */ } });
      await moduloTab(page, 'Edifício').click();
      // docas guardadas inválidas: desenho continua com largura útil
      assert.ok((await page.locator('canvas.int').boundingBox()).width >= 300);
      // tabindex móvel na faixa: só a aba ativa entra no Tab; setas movem o foco
      const abas = faixaTabs(page).getByRole('tab');
      const ativa = faixaTabs(page).locator('.rtab.on');
      await ativa.focus();
      const tabIdx = async () => (await abas.evaluateAll((els) => els.map((e) => e.tabIndex)));
      assert.equal((await tabIdx()).filter((v) => v === 0).length, 1);
      const antes = (await ativa.innerText()).trim();
      await page.keyboard.press('ArrowRight');
      const foco = await page.evaluate(() => document.activeElement?.textContent?.trim());
      assert.notEqual(foco, antes, 'ArrowRight não moveu o foco da faixa');
      await page.keyboard.press('Home');
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Arquivo');
      // abas de vista e árvore
      const vtabs = page.locator('.edif-tabs').getByRole('tab');
      await vtabs.first().focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'tab');
      assert.notEqual(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Planta');
      const arvore = page.getByRole('tree', { name: 'Navegador da obra' });
      await arvore.getByRole('treeitem').first().focus();
      await page.keyboard.press('ArrowDown');
      assert.notEqual(await page.evaluate(() => document.activeElement === document.querySelector('[role="tree"] [role="treeitem"]')), true);
      // Configuração: foco entra na janela e volta ao botão da faixa
      await faixaTabs(page).getByRole('tab', { name: 'Arquivo', exact: true }).click();
      const botao = page.getByRole('toolbar', { name: /^Comandos: Arquivo/ }).getByRole('button', { name: 'Configuração da obra…' });
      await botao.click();
      const jan = page.getByRole('dialog', { name: 'Configuração da obra' });
      await jan.waitFor();
      assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), true, 'foco não entrou na Configuração');
      await page.keyboard.press('Escape');
      assert.equal(await jan.count(), 1, 'Esc não fecha a Configuração (decisão registrada)');
      await jan.getByRole('button', { name: 'Fechar', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.textContent?.includes('Configuração da obra'));
    },
  };

export const f_layout_mapa = {
    name: 'layout: todo destino RB:aba / grupo do mapa de migração existe como grupo na faixa de algum módulo',
    async run({ newPage }) {
      const { readFileSync } = await import('node:fs');
      const mapa = readFileSync(new URL('../../docs/analises/layout-bimcraft-mapa.md', import.meta.url), 'utf8');
      const destinos = new Set([...mapa.matchAll(/RB:(\w+) \/ ([^;|(,]+?)\s*(?=[(;|,]|$)/gm)].map((m) => `${m[1]}/${m[2].trim()}`));
      assert.ok(destinos.size > 30, `poucos destinos lidos (${destinos.size})`);
      const page = await newPage();
      const existentes = new Set();
      for (const m of ['Pórtico', 'Edifício', 'Fundações']) {
        await moduloTab(page, m).click();
        const abas = (await faixaTabs(page).getByRole('tab').allTextContents()).map((s) => s.trim());
        for (const [id, rotulo] of Object.entries(ABAS_ID)) {
          if (!abas.includes(rotulo)) continue;
          await faixaTabs(page).getByRole('tab', { name: rotulo, exact: true }).click();
          // a faixa do Edifício e a das Fundações carregam sob demanda: espera o primeiro grupo antes de ler todos
          await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('group').first().waitFor();
          for (const g of await page.getByRole('toolbar', { name: /^Comandos:/ }).getByRole('group').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))) existentes.add(`${id}/${g}`);
        }
      }
      const faltam = [...destinos].filter((d) => !existentes.has(d));
      assert.deepEqual(faltam, [], `destinos do mapa sem grupo na faixa: ${faltam.join('; ')}`);
    },
  };
