# E4c — cartão 3: fluxo e2e `E4c` e fechamento dos checklists

Classe: Haiku. Depende dos cartões 1 e 2. O fluxo cria o pórtico e a escada pela linha de comandos (`#edcmd`), sem depender da janela da E4a nem da ferramenta da E4b.

## Arquivos (2)
1. `e2e/flows/E-2.mjs`: no `import { ... } from './helpers.mjs';` do topo, acrescentar `faixaAba` à lista (se ainda não estiver); acrescentar ao fim do arquivo, depois do último `export const f_...`, o fluxo abaixo.
2. `e2e/flows/index.mjs`: na lista `flows`, depois de `m_E_2.f_E3b,`, a linha `m_E_2.f_E4c,`.

## Fluxo `E4c` (filtro `E4c`)
```js
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
```
O que o fluxo confere: o pórtico 8 × 5 m com vigas em y = 0 e y = 5 e uma escada reta de 18 degraus entre elas; a janela mostra as duas reações G e Q iguais a q·ℓ·largura/2 (viga biapoiada inclinada com carga por projeção) e o momento de cálculo 1,4·(G+Q)·ℓ²/8 com tolerância de 2 %; sem análise da obra não há aviso de recálculo; o capítulo do memorial traz "fora da análise global", "Lance 1: Apoio inferior" e "[a confirmar]"; depois de `escada.editar` (largura 1,30 m) o aviso `ESCADA_RECALCULAR` aparece, a reação acompanha a largura e "Calcular obra" o remove.

## Verificação (depois dos cartões 1 e 2)
`npx tsc -b`; `npx vitest run src/app/design/design.test.ts src/core/building/escadasCalculo.test.ts --reporter=dot`; `npm run e2e -- --no-build E4c` (ou `npm run e2e -- E4c`); depois o e2e completo `npm run e2e -- --workers 4`.

## Fechamento dos checklists (depois de e2e e testes verdes)
```
npm run checklist -- set C8.53 --situacao Feito --frente "—" --nota "[E4c] `calcularEscadas` (cálculo individual), janela \"Calcular escadas…\" (`EscadaCalculoUI.tsx`), aviso `ESCADA_RECALCULAR` (`diagnosticoRecalcular`) e e2e E4c"
npm run checklist -- set K1.9.116 --arquivo calculo --situacao Feito --frente "—" --nota "escadas [E4c] capítulo \"Escadas: cálculo\" do memorial (`MemorialEscadasCalculo.tsx`, `escadasCalculoNoMemorial`)"
```
(C8.1 continua Parcial até a E4d, que arma a escada.) Depois `npm run checklists`, `npm run mapa`, a linha do Andamento de `docs/plano-execucao.md` e a de `docs/historico-fatias.md` (`npm run checklist -- historico "..."`) dizendo que os cartões da E4c foram aplicados.
