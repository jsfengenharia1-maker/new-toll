# Cartão E2d-3 — memorial das diagonais e fluxo e2e `E2d`

Executor: Haiku. Depende dos cartões 1 e 2 aplicados. Este cartão compila sozinho depois deles.

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2d está pronto e testado em `src/core/building/diagonais.test.ts`; a validação externa é `validation/opensees/diagonal.py`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); **nenhum botão novo na barra da planta** (a janela abre pelo item "Diagonais de contraventamento" da paleta Ctrl+K).
- Os rótulos do cartão 1 são **exatos e únicos**: não os renomeie. No e2e, `getByRole('button', { name, exact: true })` para botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Diagonal: largura b/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `Obra.diagonais?: Diagonal[]`, comandos `diagonal.criar/editar/mover/atribuir/remover`, `resumoDiagonais`, `dim.diagonais` e `dim.detalhesDiagonais` (ver o cartão 1).
- `src/core/building/memorialDiagonais.ts`: `memorialDiagonais(b, dim, kV?, kT?)` devolve `{ tabelas: { id: 'lista' | 'esforcos' | 'armaduras', titulo, colunas, linhas }[], notas: string[] }` (vazio sem diagonais; só a lista sem dimensionamento).

## 1. Criar `src/app/edificio/MemorialDiagonais.tsx` (arquivo novo, cole inteiro)
```tsx
// Memorial das diagonais de contraventamento (E2d): lista (grupos, comprimento real, seção, ligações, flambagem e nós de cruzamento),
// envoltória dos esforços, armaduras e verificações, com o aviso dos nós de extremidade. As tabelas e as notas vêm do núcleo
// (core/building/memorialDiagonais.ts).
import type { ReactNode } from 'react';
import { memorialDiagonais } from '../../core/building/memorialDiagonais';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';

export function MemorialDiagonais({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const op = useBuilding((s) => s.analise?.opcoes);
  const m = memorialDiagonais(b, dim, op?.diagonalFlambagemVertical ?? 1, op?.diagonalFlambagemTransversal ?? 1);
  if (!m.tabelas.length) return null;
  return (
    <>
      {h2('Diagonais de contraventamento')}
      <div data-memorial-diagonais>
        {m.tabelas.map((t) => (
          <div className="avoid" key={t.id} data-memorial-diagonais-tabela={t.id}>
            <h3>{t.titulo}</h3>
            <table>
              <thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead>
              <tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ))}
        <ul>{m.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </div>
    </>
  );
}
```

## 2. Editar `src/app/edificio/MemorialEdificio.tsx`

O capítulo aparece só quando há diagonais.

2.1. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
import { MemorialCortes } from './MemorialCortes';
```

Substitua por:

```tsx
import { MemorialCortes } from './MemorialCortes';
import { MemorialDiagonais } from './MemorialDiagonais';
```

2.2. Localize **exatamente** (uma só ocorrência no arquivo):

```tsx
          <MemorialCortes b={b} dim={dim} h2={h2} />
```

Substitua por:

```tsx
          <MemorialCortes b={b} dim={dim} h2={h2} />
          <MemorialDiagonais b={b} dim={dim} h2={h2} />
```

## 3. Editar `e2e/flows.mjs`

Acrescente o fluxo abaixo no fim da lista de fluxos: o arquivo termina em `];` (a lista `flows`); cole o objeto **antes** desse `];` final, depois do último fluxo (que termina em `  },`).

```js
  {
    name: 'E2d: diagonais de contraventamento (lançamento em X, atribuir, nó no cruzamento, resultados e memorial)',
    async run({ newPage }) {
      const page = await newPage();
      await page.getByRole('tab', { name: 'Edifício', exact: true }).click();
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
  },
```

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde (nenhuma cor literal, classe sem CSS ou estilo inline). `npm run e2e -- E2d` verde (o comando refaz o build; sem `--no-build`). Relate só o resultado.
