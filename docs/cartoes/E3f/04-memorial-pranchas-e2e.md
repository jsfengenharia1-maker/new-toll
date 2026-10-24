# E3f — cartão 4: memorial dos planos e e2e `E3f`

Executor: Haiku (seção de memorial no padrão de `MemorialInclinadas` e um fluxo e2e). Regras em `00-indice.md`. Depois dos cartões 1 a 3. **Aplicar depois da D6/D7.** Compila sozinho; independe dos cartões da E3c, E3d e E3e (a âncora do memorial é a listagem geral, que eles deixam intacta; com a E3e aplicada, a seção "Planos inclinados" vem depois da das alveolares).

## Onde aparece
- **Memorial** da obra, seção "Planos inclinados" (só com planos na obra): tabela dos planos (Plano, Grupo, Definição, Inclinação (%), Inclinação (°), Lajes, Vigas; inclinação com 2 casas), tabela dos esforços normais por caso vertical (N mín e N máx, kN, 1 casa) e do empuxo horizontal no topo dos pilares (Hx, Hy por caso) e o texto da premissa `planos` (já marcado "a confirmar" no texto do núcleo).
- **e2e**: fluxo `E3f` em `e2e/flows/E-3.mjs` (arquivo novo), registrado em `e2e/flows/index.mjs`.

## Núcleo usado (já existe)
`planosNoMemorial(b)`, `esforcosDosPlanos(an)` (`planos.ts`), `PREMISSAS` (`premissas.ts`) e a análise do `useBuilding` (`analise`). Opções `planoDiafragma` e `planoCargaProjecao`: aparecem sozinhas na janela de opções (lista gerada de `OPCOES_INFO`, grupo "Opções de cálculo") e em `opcoesAlteradas` do memorial; a revisão `PLANO_SEPARADO`/`PLANO_COTAS` e o exemplo `criarExemplo('telhado')` ("Exemplo: cobertura em duas águas", em Obras recentes) já existem.

## Fora desta entrega (notas)
- Prancha de formas (texto de inclinação junto ao desnível e croqui `croquiPavimento` no canto, com o campo `Croqui (mm)` em `Configuração da prancha`) e prancha de armação (barras superiores com `dobraDaBarra` e `marcaDeDobra`): as pranchas são montadas em `src/core/sheets` (núcleo, que estes cartões não alteram); a interface já recebe os dados prontos do núcleo e o desenho entra numa fatia de núcleo das pranchas.
- Ajuda F1 da ferramenta `plano` (linhas de `SEQUENCIA_PLANOS`): exige entrada em `src/core/ajuda/catalogo.ts` (e o teste de contagem de ferramentas), também núcleo.
- Arrasto das alças dos planos e duplo clique no texto de cota: ver o cartão 2.

## Rótulos
Seção "Planos inclinados"; colunas acima. Atributos de teste: `data-memorial-planos`, `data-tabela-planos`, `data-normais-planos`, `data-empuxos-planos`, `data-premissa-planos`.

**Arquivo novo** `src/app/edificio/MemorialPlanos.tsx`
```tsx
// Memorial dos planos inclinados (frente E3f): tabela dos planos (definição, inclinação, panos e vigas), esforços normais dos panos e
// vigas inclinados e empuxo horizontal no topo dos pilares por caso, e a premissa. As linhas vêm do núcleo (`planosNoMemorial`,
// `esforcosDosPlanos`); sem planos na obra a seção não aparece.
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import type { AnaliseEdificio } from '../../core/building/analitico';
import { esforcosDosPlanos, planosNoMemorial } from '../../core/building/planos';
import { PREMISSAS } from '../../core/building/premissas';
import type { BuildingModel } from '../../core/building/types';

export function MemorialPlanos({ b, an, h2 }: { b: BuildingModel; an: AnaliseEdificio | null; h2: (t: string) => ReactNode }) {
  const linhas = planosNoMemorial(b);
  if (!linhas.length) return null;
  const ef = an ? esforcosDosPlanos(an) : { normais: [], empuxos: [] };
  const premissa = PREMISSAS.find((p) => p.id === 'planos');
  return (
    <>
      {h2('Planos inclinados')}
      <div data-memorial-planos>
        <p>Panos e vigas com plano seguem a cota z(x, y) do plano (desnível em relação ao topo do pavimento); a inclinação do plano é a tangente da máxima declividade. Esforços normais (mínimo e máximo por caso vertical) dos panos e vigas inclinados e empuxo horizontal no topo dos pilares dos pavimentos com planos: do modelo integrado.</p>
        <table data-tabela-planos>
          <thead><tr><th>Plano</th><th>Grupo</th><th>Definição</th><th>Inclinação (%)</th><th>Inclinação (°)</th><th>Lajes</th><th>Vigas</th></tr></thead>
          <tbody>{linhas.map((l) => <tr key={l.plano}><td className="l">{l.nome}</td><td className="l">{l.grupo}</td><td className="l">{l.definicao}</td><td>{fmt(l.percentual)}</td><td>{fmt(l.graus)}</td><td className="l">{l.lajes.join(', ') || '—'}</td><td className="l">{l.vigas.join(', ') || '—'}</td></tr>)}</tbody>
        </table>
        {ef.normais.length > 0 && (
          <table data-normais-planos>
            <thead><tr><th>Elemento</th><th>Tipo</th><th>Caso</th><th>N mín (kN)</th><th>N máx (kN)</th></tr></thead>
            <tbody>{ef.normais.map((n, i) => <tr key={i}><td className="l">{n.ref}</td><td className="l">{n.tipo === 'laje' ? 'pano' : 'viga'}</td><td className="l">{n.caso}</td><td>{fmt(n.Nmin, 1)}</td><td>{fmt(n.Nmax, 1)}</td></tr>)}</tbody>
          </table>
        )}
        {ef.empuxos.length > 0 && (
          <table data-empuxos-planos>
            <thead><tr><th>Pilar</th><th>Pavimento</th><th>Caso</th><th>Hx (kN)</th><th>Hy (kN)</th></tr></thead>
            <tbody>{ef.empuxos.map((n, i) => <tr key={i}><td className="l">{n.pilar}</td><td className="l">{n.pavimento}</td><td className="l">{n.caso}</td><td>{fmt(n.Hx, 1)}</td><td>{fmt(n.Hy, 1)}</td></tr>)}</tbody>
          </table>
        )}
        {premissa && <p data-premissa-planos><i>{premissa.texto}</i></p>}
      </div>
    </>
  );
}
```

## Edições em `MemorialEdificio.tsx`

**Trocar em** `src/app/edificio/MemorialEdificio.tsx`
```text
import { fichasNoMemorial } from '../../core/building/tiposLaje';
```
por
```text
import { fichasNoMemorial } from '../../core/building/tiposLaje';
import { MemorialPlanos } from './MemorialPlanos';
```

**Trocar em** `src/app/edificio/MemorialEdificio.tsx`
```text
          <MemorialListagemGeral b={b} h2={h2} />
```
por
```text
          <MemorialPlanos b={b} an={analise} h2={h2} />
          <MemorialListagemGeral b={b} h2={h2} />
```

## e2e

**Arquivo novo** `e2e/flows/E-3.mjs`
```js
// Fluxos de interface — E (parte 3/3): planos inclinados, rampas e desníveis (E3f).
import assert from 'node:assert/strict';
import { faixaAba, fileMenu, grupoEdif } from './helpers.mjs';

export const f_E3f = {
  name: 'E3f: planos inclinados (novo plano, árvore, atribuir, propriedades, vigas incoerentes, tipo de pano e pano a definir, cobertura em duas águas, memorial, diafragma)',
  async run({ newPage }) {
    const page = await newPage();
    await page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', { name: 'Edifício', exact: true }).click();
    const cmd = async (t) => { await page.locator('#edcmd').fill(t); await page.locator('#edcmd').press('Enter'); };
    const modelo = () => page.evaluate(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building);
    const esperar = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 });
    const aba = (nome) => page.locator('.edif-tabs').getByRole('tab', { name: nome });
    const calcular = async () => { await aba('Dimensionamento').click(); await page.getByRole('button', { name: 'Calcular e dimensionar' }).click(); };
    // um pano 6 × 4,5 m, vigas de 20 × 50
    await cmd('lote {"comandos": [' + [[0, 0], [6, 0], [6, 4.5], [0, 4.5]].map(([x, y]) => `{"nome": "pilar.inserir", "params": {"x": ${x}, "y": ${y}, "secao": {"tipo": "ret", "b": 0.3, "h": 0.3}}}`).join(', ') + ']}');
    await cmd('lote {"comandos": [' + [[[0, 0], [6, 0]], [[0, 4.5], [6, 4.5]], [[0, 0], [0, 4.5]], [[6, 0], [6, 4.5]]].map((p) => `{"nome": "viga.tracar", "params": {"grupo": "g_3", "pontos": ${JSON.stringify(p)}, "secao": {"b": 0.2, "h": 0.5}}}`).join(', ') + ']}');
    await cmd('laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.length === 1, null);
    // 1) novo plano: máxima declividade de (0; 0) a (0; 4,5), desnível 0, 30 %; a árvore do Navegador mostra o plano
    await faixaAba(page, 'Edição');
    await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'Novo plano' });
    const y2 = dlg.getByLabel(/^y2/); await y2.fill('4,5'); await y2.press('Enter');
    const inc = dlg.getByLabel(/^Inclinação do plano/); await inc.fill('30'); await inc.press('Enter');
    await dlg.getByRole('button', { name: 'Criar', exact: true }).click();
    await dlg.waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 1, null);
    let m = await modelo();
    assert.equal(m.planos.length, 1);
    assert.equal(m.planos[0].nome, 'Plano 1');
    await page.getByRole('treeitem', { name: /Plano 1 — 30,0 %/ }).waitFor();
    // 2) atribuir o plano ao pano selecionado: a planta o desenha com a cor, a seta e o texto de inclinação
    const lj = await grupoEdif(page, /^Lajes —/);
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await page.getByRole('button', { name: 'Atribuir plano', exact: true }).click();
    await esperar(() => !!JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.plano, null);
    await page.waitForFunction(() => document.querySelector('.planta-cv')?.getAttribute('data-planos-na-planta') === '1', null, { timeout: 20000 });
    // 3) propriedades do plano: leitura da inclinação e edição para 40 %; as vigas do contorno ficam incoerentes e a correção copia o plano do pano
    const gp = await grupoEdif(page, /^Planos —/);
    assert.match(await gp.locator('[data-leitura-plano]').innerText(), /30,0 %/);
    assert.match(await gp.innerText(), /atribuído/);
    const i40 = gp.getByLabel(/^Inclinação do plano/); await i40.fill('40'); await i40.press('Enter');
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.[0]?.def?.inclinacao === 40, null);
    assert.match(await gp.locator('[data-leitura-plano]').innerText(), /40,0 %/);
    await gp.locator('[data-vigas-incoerentes]').waitFor();
    await gp.getByRole('button', { name: 'Selecionar as vigas incoerentes', exact: true }).click();
    await gp.getByRole('button', { name: 'Copiar inclinação do pano', exact: true }).click();
    await gp.locator('[data-vigas-incoerentes]').waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.vigas?.some((v) => !!v.plano), null);
    m = await modelo();
    assert.ok(m.vigas.some((v) => v.plano === m.planos[0].id));
    // 4) retirar o plano do pano
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await page.getByRole('button', { name: 'Retirar plano', exact: true }).click();
    await esperar(() => !JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]?.plano, null);
    // 5) tipo de pano: pano a definir com 12 cm (o cálculo recusa) e de volta a maciça
    const tp = await grupoEdif(page, /^Tipo de pano/);
    await tp.getByLabel(/^Tipo de pano/).selectOption({ label: 'Pano a definir' });
    const esp = tp.getByLabel(/^Espessura do pano a definir/); await esp.fill('0,12'); await esp.press('Enter');
    await tp.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await esperar(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]; return l?.definir === true && l?.espessuraDefinir === 0.12; }, null);
    await calcular();
    await page.locator('.statusbar .msg', { hasText: 'DEFINIR_PANO' }).waitFor({ timeout: 60000 });
    await aba('Planta').click();
    await lj.locator('table.loads-ed tbody tr').nth(0).click();
    await (await grupoEdif(page, /^Tipo de pano/)).getByLabel(/^Tipo de pano/).selectOption({ label: 'Maciça' });
    await esperar(() => { const l = JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.lajes?.[0]; return !l?.definir && l?.tipo?.tipo === 'macica'; }, null);
    // 6) exemplo "cobertura em duas águas": cálculo sem erro, planos no memorial e a opção do diafragma
    await fileMenu(page, 'Obras recentes…');
    const rec = page.getByRole('dialog', { name: 'Obras recentes' });
    await rec.getByRole('button', { name: /Abrir exemplo Exemplo: cobertura em duas águas/ }).click();
    await rec.waitFor({ state: 'detached' });
    await esperar(() => JSON.parse(localStorage.getItem('statikos:building') ?? 'null')?.building?.planos?.length === 2, null);
    assert.deepEqual((await modelo()).planos.map((p) => p.nome).sort(), ['Água norte', 'Água sul']);
    await calcular();
    await page.locator('.statusbar .msg', { hasText: 'dimensionamento em' }).waitFor({ timeout: 240000 });
    await page.getByRole('button', { name: 'Memorial do edifício' }).click();
    const memo = page.getByRole('dialog', { name: 'Memorial do edifício' });
    const sec = memo.locator('[data-memorial-planos]');
    await sec.waitFor();
    assert.match(await sec.locator('[data-tabela-planos]').innerText(), /Água sul/);
    assert.match(await sec.locator('[data-tabela-planos]').innerText(), /30,00/);
    await memo.getByRole('button', { name: 'Fechar' }).click();
    // opção do diafragma: liga e desliga (recalcular o exemplo com a opção ligada não terminou em 9 min: pendência de núcleo, ver o índice da E3f)
    await grupoEdif(page, 'Opções de cálculo');
    const dia = page.getByLabel('Panos inclinados no diafragma do pavimento');
    await dia.check();
    assert.equal(await dia.isChecked(), true);
    await dia.uncheck();
    assert.equal(await dia.isChecked(), false);
  },
};
```

**Trocar em** `e2e/flows/index.mjs`
```text
import * as m_L from './L.mjs';
```
por
```text
import * as m_L from './L.mjs';
import * as m_E_3 from './E-3.mjs';
```

**Trocar em** `e2e/flows/index.mjs`
```text
  m_layout.f_layout,
```
por
```text
  m_E_3.f_E3f,
  m_layout.f_layout,
```

## Verificação
`npx tsc -b`; `npx vitest run src/app`; `npm run e2e -- --workers 1 E3f`.
