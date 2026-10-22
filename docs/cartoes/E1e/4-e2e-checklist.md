# Cartão E1e-4 — fluxo e2e `E1e`, linhas dos checklists e registro da fatia

Executor: Haiku. Só e2e e documentação; **não altere nada em `src/core/` nem em `src/app/`** (se um rótulo do fluxo não existir na tela, o defeito está nos cartões 1 a 3: corrija o rótulo no `.tsx` para o que os cartões mandam, nunca o contrário). Depende dos cartões E1e-1, E1e-2 e E1e-3.

## Arquivos
- Editar `e2e/flows.mjs` (fluxo novo).
- Editar `docs/checklist-manual-cypecad.md`, `docs/checklist-manual-calculo-cypecad.md`, `docs/historico-fatias.md`, `docs/plano-execucao.md`, `docs/spec-frente-E1.md` (Andamento).

## 1. Fluxo e2e `E1e` em `e2e/flows.mjs`
Inserir o objeto abaixo no array de fluxos **imediatamente antes** do fluxo que começa com `name: 'R7g:` (logo depois do fluxo `E1d`). Todo `getByLabel` usa `{ exact: true }`. Os helpers (`cmd`, `modelo`, `esperarModelo`) são os mesmos do fluxo `E1d` (copie-os do início dele). O cálculo leva tempo: use os timeouts como estão.

```js
  {
    name: 'E1e: alvenaria estrutural (blocos e tipos no grupo, paredes de blocos, janela com panos, verga e modulação, quantitativo, cartão, memorial e biblioteca)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
      const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
      const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
      const esperarModelo = (fn, arg, t = 20000) => page.waitForFunction(fn, arg, { timeout: t });
      // 1. modelo enxuto: Térreo e Tipo 1 (como no E1d)
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
      // 2. grupo "Alvenaria estrutural": bloco e tipo de blocos pela interface
      const ga = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Alvenaria estrutural/ }) });
      await ga.evaluate((el) => { el.open = true; });
      const eb = ga.locator('[data-alv-editor-bloco]');
      await eb.getByLabel('Bloco: nome', { exact: true }).fill('B20');
      await eb.getByLabel('Bloco: comprimento', { exact: true }).fill('40');
      await eb.getByLabel('Bloco: largura', { exact: true }).fill('20');
      await eb.getByLabel('Bloco: altura', { exact: true }).fill('20');
      await eb.getByLabel('Bloco: fbk', { exact: true }).fill('8');
      await eb.getByRole('button', { name: 'Criar bloco', exact: true }).click();
      await ga.locator('table[data-alv-blocos] tbody tr').waitFor({ timeout: 20000 });
      assert.match(await ga.locator('table[data-alv-blocos]').innerText(), /40 × 20 × 20 cm/);
      assert.match(await ga.locator('table[data-alv-blocos]').innerText(), /automático \(não\)/);
      const et = ga.locator('[data-alv-editor-tipo]');
      await et.getByLabel('Tipo de alvenaria: nome', { exact: true }).fill('Blocos B20');
      await et.getByLabel('Tipo de alvenaria: peso específico', { exact: true }).fill('14');
      await et.getByRole('button', { name: 'Criar tipo de alvenaria', exact: true }).click();
      await ga.locator('table[data-alv-tipos] tbody tr').waitFor({ timeout: 20000 });
      const linhaTipo = await ga.locator('table[data-alv-tipos] tbody tr').first().innerText();
      assert.match(linhaTipo, /Blocos B20/);
      assert.match(linhaTipo, /2,24/); // fd = 0,7 · (0,8 · 8) / 2
      // edição do tipo: prisma informado de 10 MPa → fd = 3,50 MPa
      await ga.getByRole('button', { name: 'Editar tipo Blocos B20', exact: true }).click();
      await et.getByLabel('Tipo de alvenaria: prisma fpk', { exact: true }).fill('10');
      await et.getByRole('button', { name: 'Salvar tipo de alvenaria', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('table[data-alv-tipos] tbody tr')?.textContent?.includes('3,50'), null, { timeout: 20000 });
      // 3. duas paredes de blocos de 12 m com laje maciça e uma porta fora da modulação
      const mat = (await modelo()).tiposAlvenaria[0].id;
      await cmd('laje.criar {"grupo": "' + tipo1.grupo + '", "contorno": [[0, 0], [12, 0], [12, 6], [0, 6]], "tipo": {"tipo": "macica", "h": 0.12}}');
      await cmd('parede.criar {"pontos": [[0, 0], [12, 0]], "espessura": 0.2, "tipo": "blocos", "material": "' + mat + '", "morre": "' + tipo1.id + '"}');
      await cmd('parede.criar {"pontos": [[0, 6], [12, 6]], "espessura": 0.2, "tipo": "blocos", "material": "' + mat + '", "morre": "' + tipo1.id + '"}');
      await esperarModelo(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.length === 2, null);
      const m1 = (await modelo()).paredes.find((w) => w.nome === 'M1').id;
      await cmd('parede.abertura {"parede": "' + m1 + '", "s": 5.07, "largura": 0.9, "altura": 2.1, "pavimento": "' + terreo.id + '"}');
      await esperarModelo((id) => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.paredes?.find((w) => w.id === id)?.aberturas?.length === 1, m1);
      // o tipo em uso não sai
      await ga.getByRole('button', { name: 'Remover tipo Blocos B20', exact: true }).click();
      assert.match(await ga.locator('[data-alv-msg]').innerText(), /Há paredes com este tipo de alvenaria/);
      // lista de paredes mostra o tipo
      const gp = page.locator('details.group', { has: page.locator(':scope > summary', { hasText: /^Paredes \(/ }) });
      assert.match(await gp.locator('table[data-pw-lista]').innerText(), /Blocos \(Blocos B20\)/);
      // 4. cálculo e cartões
      await page.locator('.edif-tabs').getByRole('tab', { name: 'Dimensionamento' }).click();
      await page.getByRole('button', { name: /^(Calcular e dimensionar|Recalcular)$/ }).click();
      await page.getByRole('button', { name: 'Recalcular', exact: true }).waitFor({ timeout: 180000 });
      const livre = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Calculando…'), null, { timeout: 180000 });
      await livre();
      const cartao = page.locator('[data-pw-cartao]');
      await cartao.waitFor({ timeout: 30000 });
      assert.match(await cartao.innerText(), /Blocos \(Blocos B20\)/);
      assert.match(await cartao.innerText(), /Cumprimento mín\./);
      const ca = page.locator('[data-alv-cartao]');
      await ca.waitFor({ timeout: 30000 });
      assert.ok(await ca.locator('table[data-alv-resumo-blocos] tbody tr').count() >= 1);
      assert.match(await ca.locator('table[data-alv-resumo-blocos]').innerText(), /B20/);
      // 5. janela de M1: panos, quantitativo, verga e modulação
      await cartao.getByRole('button', { name: 'Resultados de M1' }).click();
      const jp = page.getByRole('dialog', { name: /M1/ });
      await jp.waitFor();
      const raiz = jp.locator('[data-alv-parede]');
      assert.equal(await raiz.locator('table[data-alv-panos] tbody tr').count(), 3);
      assert.match(await raiz.locator('[data-alv-situacao]').innerText(), /Blocos B20.*não armada/);
      assert.match(await raiz.locator('table[data-alv-quant]').innerText(), /Total/);
      assert.equal(await raiz.locator('table[data-alv-vergas] tbody tr').count(), 1);
      assert.match(await raiz.locator('table[data-alv-vergas] tbody tr').first().innerText(), /porta[\s\S]*não/);
      assert.match(await raiz.innerText(), /Nenhum pilar em contato com esta parede/);
      await raiz.getByRole('button', { name: 'Ajustar aberturas à modulação', exact: true }).click();
      await page.waitForFunction(() => /sim/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      assert.match(await raiz.locator('table[data-alv-vergas] tbody tr').first().innerText(), /1,00 × 2,20 m/);
      // verga bloqueada e depois limpa
      await raiz.locator('table[data-alv-vergas] tbody tr').first().click();
      const ev = raiz.locator('[data-alv-editor-verga]');
      await ev.getByLabel('Verga: n', { exact: true }).fill('2');
      await ev.getByLabel('Verga: φ', { exact: true }).selectOption({ label: '12,5' });
      await raiz.getByRole('button', { name: 'Bloquear verga', exact: true }).click();
      await page.waitForFunction(() => /bloqueada/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      await raiz.getByRole('button', { name: 'Limpar verga', exact: true }).click();
      await page.waitForFunction(() => /calculada/.test(document.querySelector('table[data-alv-vergas] tbody tr')?.textContent ?? ''), null, { timeout: 180000 });
      assert.ok(await raiz.locator('ul[data-alv-mensagens], p.muted').count() >= 1);
      assert.ok(await jp.locator('[data-pw-iso-svg] polygon').count() > 10);
      await jp.getByRole('button', { name: 'Fechar' }).click();
      // 6. memorial do edifício
      await page.getByRole('button', { name: 'Memorial do edifício' }).click();
      const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
      const textoMemo = await memo.textContent();
      assert.match(textoMemo, /Alvenaria estrutural e blocos de concreto/);
      assert.match(textoMemo, /Verificação das tensões-limite por pano/);
      assert.equal(await memo.locator('[data-memorial-alvenaria="alv-panos"]').count(), 1);
      assert.equal(await memo.locator('[data-memorial-alvenaria="alv-blocos"]').count(), 1);
      assert.match(textoMemo, /Quantitativo de blocos por parede e pavimento/);
      await memo.getByRole('button', { name: 'Fechar' }).click();
      // 7. biblioteca do usuário: gravar e trazer (nada novo na mesma obra)
      await ga.locator('details[data-alv-biblioteca] > summary').click();
      await ga.getByLabel('Nome na biblioteca de alvenaria', { exact: true }).fill('Minha alvenaria');
      await ga.getByRole('button', { name: 'Gravar alvenaria da obra', exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('select option')].some((o) => o.textContent?.includes('Minha alvenaria')), null, { timeout: 20000 });
      await ga.getByLabel('Alvenaria gravada', { exact: true }).selectOption({ index: 1 }); // índice 0 é “— escolha —”
      await ga.getByRole('button', { name: 'Trazer para a obra', exact: true }).click();
      assert.match(await ga.locator('[data-alv-msg-biblioteca]').innerText(), /Nada novo/);
    },
  },
```
Notas de execução do fluxo: se alguma tabela aparecer com número de linhas diferente do esperado (ex.: 3 panos em M1), confira primeiro a lógica do fluxo E1d (mesma geometria) antes de mudar o número. Não use `waitForTimeout` longo.

## 2. Checklists
Rode o script abaixo (Python 3) na raiz do repositório. Ele passa para **Feito** as linhas cuja interface os cartões 1 a 3 entregam e troca o trecho "falta …" da nota pelos arquivos da interface; C5.6 continua **Parcial** (faltam as plantas com esquema dos blocos nas pranchas).
```python
import re
mapa = {
  'docs/checklist-manual-cypecad.md': {
    'C5.1': 'AlvenariaUI.tsx (tipos) e ParedesUI.tsx (tipo e material no lançamento e no editor)',
    'C5.3': 'AlvenariaUI.tsx (blocos e biblioteca do usuário)',
    'C5.4': 'AlvenariaUI.tsx (editor de blocos com peça de canto)',
    'C5.8': 'AlvenariaUI.tsx (editor do tipo de alvenaria genérica)',
    'C5.11': 'ArmaduraAlvenariaUI.tsx (botão Ajustar aberturas à modulação)',
    'C5.12': 'ArmaduraAlvenariaUI.tsx (tabela de vergas)',
    'C5.16': 'ArmaduraAlvenariaUI.tsx (editor da verga: bloquear, copiar, padrão, limpar)',
    'C5.25': 'AlvenariaUI.tsx (resistências do bloco, argamassa, graute e prisma)',
    'C5.29': 'ArmaduraAlvenariaUI.tsx (quantitativo por parede) e AlvenariaResumo.tsx (blocos por tipo)',
  },
  'docs/checklist-manual-calculo-cypecad.md': {
    'K1.9.4': 'AlvenariaUI.tsx (editor do tipo de alvenaria)',
    'K1.9.5': 'AlvenariaUI.tsx (editor de blocos e tipo de blocos)',
  },
}
for arq, itens in mapa.items():
    s = open(arq, encoding='utf-8').read()
    for id_, ui in itens.items():
        m = re.search(r'^\| ' + re.escape(id_) + r' \| (.*?) \| Parcial \| E \| (.*?) \[E1e\] \|$', s, re.M)
        assert m, id_
        nota = re.sub(r'; falta [^\[]*$', '', m.group(2)).rstrip(' ;')
        s = s[:m.start()] + f'| {id_} | {m.group(1)} | Feito | — | {nota}; interface: {ui} [E1e] |' + s[m.end():]
    open(arq, 'w', encoding='utf-8').write(s)
# C5.6: só a nota
arq = 'docs/checklist-manual-cypecad.md'
s = open(arq, encoding='utf-8').read()
s = s.replace('faltam a interface do memorial e as plantas com esquema dos blocos nas pranchas [E1e]', 'memorial e quantitativo na interface (AlvenariaResumo.tsx, ArmaduraAlvenariaUI.tsx); faltam as plantas com esquema dos blocos nas pranchas [E1e]')
open(arq, 'w', encoding='utf-8').write(s)
```
Depois: `npm run checklists` (recontagem). Em cada checklist acrescente ao fim do "Histórico de conferência" uma entrada: `- **22/10/2026 — fatia E1e, interface.** <itens> passam a Feito (…arquivos…).` seguida de `  - Situação: ver o resumo (recontado por \`npm run checklists\`).` e, no do manual do usuário, `  - Pendências por frente: E reduz em 9 itens (manual do usuário).`; no de cálculo, `  - Pendências por frente: E reduz em 2 itens (manual de cálculo).` Confira com `git diff --stat` que as tabelas de resumo e a de `docs/plano-frentes.md` mudaram.

## 3. Registro da fatia
- `docs/historico-fatias.md`: acrescentar ao fim uma linha `- 22/10/2026: E1e, interface: \`AlvenariaUI.tsx\` (blocos, tipos de alvenaria e biblioteca do usuário, kind 'alvenaria' em \`storage.ts\`), \`ArmaduraAlvenariaUI.tsx\` (panos, pontos, trechos curtos, modulação, vergas, quantitativo, desligamentos, vigas sobre muros), \`AlvenariaResumo.tsx\` (cartão do Dimensionamento e memorial), tipo/material no lançamento e no editor de \`ParedesUI.tsx\`; e2e \`E1e\`. Frente E1e: prancha de blocos (C5.6) e armadura de alvenaria armada no resumo de aço ficam para a prancha de alvenaria.`
- `docs/plano-execucao.md`, seção Andamento: acrescentar `- 22/10/2026: E1e, interface concluída (cartões \`docs/cartoes/E1e/\`); e2e \`E1e\` verde. Próximo: FU7b (fundação de muros e paredes) e E2.`
- `docs/spec-frente-E1.md`, seção Andamento: acrescentar `- 22/10/2026: E1e, interface concluída (ver historico-fatias.md).`

## Verificação (todas têm de passar; cole o resumo no relatório)
```bash
npx tsc -b
npm test
npm run build
npm run e2e -- E1e
npm run e2e -- --no-build E1d
npm run e2e -- --no-build E1c
```
(O primeiro `npm run e2e` faz o build; os outros dois reaproveitam. Se um fluxo antigo (E1c ou E1d) quebrar, a causa está nas edições de `ParedesUI.tsx`: corrija lá, sem mudar o fluxo antigo.)

## Checklist (marcar ao terminar)
- [ ] Fluxo `E1e` inserido e verde.
- [ ] Linhas dos dois checklists atualizadas, `npm run checklists` rodado, `checklists.test.ts` verde (`npm test`).
- [ ] `historico-fatias.md`, `plano-execucao.md` e `spec-frente-E1.md` atualizados.
- [ ] `npx tsc -b`, `npm test`, `npm run build` e os três e2e verdes.
