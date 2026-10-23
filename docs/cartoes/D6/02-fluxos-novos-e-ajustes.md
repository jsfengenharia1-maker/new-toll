# D6 — cartão 02: fluxos novos (casca e navegador) e ajustes por aba

Classe: Sonnet baixo (escreve fluxos novos e corrige os que quebram por contexto de tela).

## Arquivos
- `e2e/flows.mjs`

## 1. Fluxo novo: faixa e docas (D2)
Os testes abaixo seguem o padrão dos fluxos existentes (`name`, `async run({ newPage })`) e **ainda não foram executados** (a validação medida na D2 só cobriu os 81 fluxos existentes): rodar com `npm run e2e -- --no-build "layout:"` e ajustar o que o app real mostrar.
```js
  {
    name: 'layout: faixa de comandos por módulo, faixa recolhível, docas recolhíveis e redimensionáveis, largura guardada',
    async run({ newPage }) {
      const page = await newPage();
      const modulo = (n) => page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: n, exact: true });
      await modulo('Edifício').click();
      const abas = page.getByRole('tablist', { name: 'Faixa de comandos' }).getByRole('tab');
      assert.deepEqual(await abas.allTextContents(), ['Arquivo', 'Lançamento', 'Edição', 'Cargas e ações', 'Análise', 'Dimensionamento', 'Fundações', 'Pranchas', 'Vista']);
      await modulo('Pórtico').click();
      assert.deepEqual(await abas.allTextContents(), ['Arquivo', 'Lançamento', 'Edição', 'Cargas e ações', 'Análise', 'Dimensionamento', 'Fundações', 'Vista']);
      await modulo('Fundações').click();
      assert.deepEqual(await abas.allTextContents(), ['Arquivo', 'Lançamento', 'Dimensionamento', 'Fundações', 'Vista']);
      await modulo('Edifício').click();
      // faixa recolhível
      await page.getByRole('button', { name: 'Recolher a faixa de comandos' }).click();
      assert.equal(await page.getByRole('toolbar', { name: /^Comandos:/ }).count(), 0);
      await page.getByRole('button', { name: 'Expandir a faixa de comandos' }).click();
      assert.equal(await page.getByRole('toolbar', { name: /^Comandos:/ }).count(), 1);
      // doca esquerda
      const dock = page.getByRole('complementary', { name: 'painel lateral esquerdo' });
      const w0 = Math.round((await dock.boundingBox()).width);
      await dock.getByRole('button', { name: 'Recolher painel lateral esquerdo' }).click();
      assert.ok((await dock.boundingBox()).width < 40);
      await dock.getByRole('button', { name: 'Mostrar painel lateral esquerdo' }).click();
      const sep = dock.getByRole('separator');
      await sep.focus();
      for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight'); // 16 px por seta
      assert.equal(Math.round((await dock.boundingBox()).width), w0 + 80);
      // a largura volta ao recarregar
      await page.reload();
      await page.locator('.bname').waitFor();
      await modulo('Edifício').click();
      assert.equal(Math.round((await page.getByRole('complementary', { name: 'painel lateral esquerdo' }).boundingBox()).width), w0 + 80);
    },
  },
```

## 2. Fluxo novo: Navegador (D4)
```js
  {
    name: 'D4: navegador em árvore sincronizado com a planta (pavimento, pilar, vista)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
      // montar uma obra pequena por comando (linha de comando do edifício)
      const cmd = async (t) => { await page.getByLabel('Linha de comando do edifício').fill(t); await page.keyboard.press('Enter'); };
      await cmd('pavimento.criar {"nome": "Térreo", "cota": 3}');
      await cmd('grupo.criar {"nome": "Tipo"}'); // ajustar ao nome real do comando do registro (listarComandos)
      const arvore = page.getByRole('tree', { name: 'Navegador da obra' });
      await arvore.getByRole('treeitem', { name: /^Pavimentos/ }).waitFor();
      const pil = arvore.getByRole('treeitem', { name: /^Pilares/ });
      assert.equal(await pil.getAttribute('aria-expanded'), 'false');
      await pil.click();
      assert.equal(await pil.getAttribute('aria-expanded'), 'true');
      await arvore.getByRole('treeitem', { name: /^Vistas/ }).click();
      await arvore.getByRole('treeitem', { name: 'Elevação' }).click();
      assert.equal(await page.locator('.edif-tabs').getByRole('tab', { name: 'Elevação' }).getAttribute('aria-selected'), 'true');
      // elemento: criar um pilar por comando, achar na árvore, clicar e ver a seleção na planta
      await cmd('pilar.inserir {"x": 0, "y": 0, "secao": {"tipo": "ret", "b": 0.2, "h": 0.4}, "nome": "P1"}');
      const p1 = arvore.getByRole('treeitem', { name: /^P1/ });
      await p1.click();
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Planta' }).waitFor();
      assert.equal(await p1.getAttribute('aria-selected'), 'true');
    },
  },
```
(Os comandos `grupo.criar` e `pilar.inserir`: conferir nome e parâmetros com `listarComandos()` ou `docs/ia.md`; um fluxo existente que monta obra por comando, como `edifício: pavimentos por comando…`, serve de modelo.)

## 3. Ajustes por contexto de tela (depois do D6-01)
Procurar por causa, não por sintoma. Causas já medidas ou previstas:
1. **Altura do canvas** (medida na D2): viewport 1400 × 1080 (D2-01). Se a fatia D5 estreitar o centro e algum fluxo clicar em coordenadas fixas (`page.mouse.click(` com número literal), trocar por `telaDe`.
2. **Controle escondido por aba da faixa**: controles que só existem com a aba aberta (o `input` do DXF da máscara, os rádios de ferramenta, a camada de armadura das lajes). A aba padrão é Lançamento; quem precisar de outra chama `faixa(page, '<aba>')` antes.
3. **Janela Configuração da obra cobre a tela**: depois de usar um grupo dela, `await fecharJanela(page, 'Configuração da obra')` antes de voltar à planta.
4. **Nomes repetidos**: item da árvore e texto do elemento (`P1`): escopar `getByText('P1')` por `.edif-tabs`/planta/diálogo; `getByRole('button', { name: 'Recolher' })` (casa `Recolher painel lateral esquerdo`): usar `exact: true`.
5. **Dois contêineres `.edif-in`** (esquerda e Propriedades): `page.locator('.edif-in')` sem filtro vira ambíguo: filtrar por `details` e título (já feito por `grupoEdif`).

## Verificação
`npm run e2e -- --workers 4` completo e `npm run e2e -- --workers 1` completo, ambos verdes; registrar no relatório quantos fluxos mudaram, por causa (lista acima) e o tempo total (linha de base: 81 fluxos em 3 min 24 s).
