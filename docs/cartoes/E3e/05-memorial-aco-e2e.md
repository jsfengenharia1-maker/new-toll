# E3e — cartão 5: memorial, resumo de aço dos negativos e e2e `E3e`

Executor: Haiku (seção de memorial no padrão de `MemorialNervuradas`, linhas de resumo de aço e um fluxo e2e). Regras em `00-leia-primeiro.md`. Depois do cartão 4. **Aplicar depois da D7, da E3c e da E3d.**

## Onde aparece
- **Memorial** da obra, seção "Lajes alveolares" (depois das nervuradas e dos ábacos, antes da listagem geral): quadro das propriedades das placas das fichas usadas (com a marca da ficha), por laje a ficha, a placa adotada e a sugerida, flexão, serviço do ambiente, cortante, negativos na capa, processo construtivo, flecha e mensagens, lista de placas e aço dos negativos.
- **Resumo de aço** (vista Dimensionamento, CSV e memorial): linha "Lajes alveolares (negativos na capa)" e o total geral passam a somá-la.
- **e2e**: fluxo `E3e` em `e2e/flows/E-2.mjs`, registrado em `e2e/flows/index.mjs`.

## Núcleo usado (já existe)
`placasNoMemorial(b)` (`alveolares.ts`), `alveolaresNoMemorial(rs)` e `listaDePlacas(rs)` (`alveolaresDim.ts`), `dim.alveolares` e `dim.resumoAcoAlveolares` (já com as repetições dos pavimentos e as perdas). Os quadros de quantitativos de fôrma/concreto da laje alveolar já saem do núcleo (`quantitativos`): a fôrma é zero.

## Aviso sobre as âncoras do resumo de aço
As edições de `Detalhamento.tsx` e `MemorialEdificio.tsx` abaixo usam o texto que a E3c deixou nessas linhas (`resumoAcoNervuradas`). Se uma âncora não casar, procure a mesma chamada `somarResumosAco(...)` do total geral e acrescente `dim.resumoAcoAlveolares ?? []` como último argumento; não invente outro código.

**Arquivo novo** `src/app/edificio/MemorialAlveolares.tsx`
```tsx
// Memorial das lajes alveolares (frente E3e): quadro de propriedades das placas das fichas usadas (com a marca da ficha), por laje a
// ficha, a escolha da placa, flexão, comparação de serviço, cortante, negativos na capa, processo construtivo e flecha, lista de
// placas e aço dos negativos. As linhas vêm do núcleo (`placasNoMemorial`, `alveolaresNoMemorial`, `listaDePlacas`).
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import { placasNoMemorial } from '../../core/building/alveolares';
import { alveolaresNoMemorial, listaDePlacas } from '../../core/building/alveolaresDim';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';

const sd = (ok: boolean | null) => (ok === null ? 'sem dado' : ok ? 'atende' : 'não atende');

export function MemorialAlveolares({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const placas = placasNoMemorial(b);
  const linhas = dim?.alveolares?.length ? alveolaresNoMemorial(dim.alveolares) : [];
  if (!placas.length && !linhas.length) return null;
  const lista = dim?.alveolares?.length ? listaDePlacas(dim.alveolares) : [];
  const aco = dim?.resumoAcoAlveolares ?? [];
  return (
    <>
      {h2('Lajes alveolares')}
      <div data-memorial-alveolares>
        <p>Placas alveolares protendidas pré-moldadas com capa estrutural moldada no local. Análise por grelha unidirecional na direção das placas, com a rigidez EI da ficha; esforços por metro de largura (envoltória ELU de todos os pavimentos do grupo). Os valores resistentes das placas (momentos, cortante, rigidez, negativos) são dados do fabricante, não verificados pelo programa; sem dado na ficha, a verificação correspondente não é feita e aparece como “sem dado”. A resistência ao fogo das alveolares não é verificada.</p>
        {placas.length > 0 && (
          <table data-quadro-placas-alveolares>
            <thead><tr><th>Ficha</th><th>Marca</th><th>Placa</th><th>h (cm)</th><th>Capa (cm)</th><th>Largura (cm)</th><th>Apoio mín / máx (cm)</th><th>Peso próprio (kN/m²)</th><th>Mu (kN·m/m)</th><th>Mfis (kN·m/m)</th><th>VRd (kN/m)</th><th>Negativos</th><th>Usada</th></tr></thead>
            <tbody>
              {placas.map((p) => (
                <tr key={`${p.fichaId}|${p.id}`}>
                  <td className="l">{p.ficha}</td><td className="l">{p.marca}</td><td className="l">{p.id}</td><td>{fmt(p.altura * 100, 0)}</td><td>{fmt(p.capa * 100, 0)}</td><td>{fmt(p.largura * 100, 0)}</td>
                  <td>{fmt(p.apoioMin * 100, 1)} / {fmt(p.apoioMax * 100, 1)}</td><td>{fmt(p.pp)}</td><td>{p.Mu === undefined ? '—' : fmt(p.Mu)}</td><td>{p.Mfis === undefined ? '—' : fmt(p.Mfis)}</td><td>{p.VRd === undefined ? '—' : fmt(p.VRd)}</td><td>{p.negativos}</td><td>{p.usada ? 'sim' : 'não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {linhas.map((l) => (
          <div key={l.laje} className="avoid" data-memorial-alveolar={l.laje}>
            <h3>Laje {l.laje} · {l.ficha}{l.pavimentos.length > 1 ? ` · ${l.pavimentos.length} pavimentos` : ''}</h3>
            <p>Ficha: {l.ficha} ({l.marca}). Placa adotada {l.placa}{l.escolhida && l.escolhida !== l.placa ? `; a verificação sugere a placa ${l.escolhida}` : ''}. Processo construtivo: {l.processo}.</p>
            <p>
              Flexão positiva: Md {fmt(l.flexao.Md)} kN·m/m{l.flexao.Mu === null ? ' (sem Mu na ficha)' : `, Mu ${fmt(l.flexao.Mu)} kN·m/m`} — {sd(l.flexao.ok)}.
              {l.servico ? ` Serviço (protensão ${l.servico.nivel}, CAA ${l.servico.caa}, combinação ${l.servico.combinacao}): Ms ${fmt(l.servico.Ms)} kN·m/m${l.servico.Madm === null ? ' (sem momento admissível na ficha)' : `, Madm ${fmt(l.servico.Madm)} kN·m/m`} — ${sd(l.servico.ok)}.` : ' Serviço: sem momentos de serviço na ficha.'}
              {' '}Cortante: {l.cortante.map((c, i) => `${i === 0 ? 'início' : 'fim'} Vd ${fmt(c.Vd)} kN/m${c.VRd === null ? ' (sem VRd)' : `, VRd ${fmt(c.VRd)} kN/m`} — ${sd(c.VRd === null ? null : c.ok)}`).join('; ')}.
            </p>
            <p>Negativos na capa: {l.negativos.map((n, i) => `${i === 0 ? 'início' : 'fim'}: ${n ?? 'sem negativo de cálculo'}`).join('; ')}.{l.flecha ? ` Flecha: ${l.flecha}.` : ''}</p>
            {l.mensagens.length > 0 && <ul>{l.mensagens.map((m, i) => <li key={i}><i>{m}</i></li>)}</ul>}
          </div>
        ))}
        {lista.length > 0 && (
          <table data-lista-placas-alveolares>
            <thead><tr><th>Placa</th><th>Ficha</th><th>Largura (cm)</th><th>Comprimento (m)</th><th>Quantidade</th><th>Observação</th></tr></thead>
            <tbody>
              {lista.map((x, i) => <tr key={i}><td className="l">{x.placa}</td><td className="l">{x.ficha}</td><td>{fmt(x.largura * 100, 0)}</td><td>{fmt(x.comprimento)}</td><td>{x.quantidade}</td><td className="l">{[x.cortada ? 'borda cortada' : '', x.obliqua ? 'oblíqua' : ''].filter(Boolean).join('; ') || '—'}</td></tr>)}
            </tbody>
          </table>
        )}
        {aco.length > 0 && (
          <table data-aco-alveolares>
            <thead><tr><th>Aço</th><th>φ (mm)</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
            <tbody>{aco.map((a) => <tr key={a.phi}><td className="l">{a.aco}</td><td>{fmt(a.phi, a.phi % 1 ? 1 : 0)}</td><td>{fmt(a.comprimento)}</td><td>{fmt(a.peso)}</td><td>{fmt(a.pesoComPerdas)}</td></tr>)}</tbody>
          </table>
        )}
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
import { MemorialAlveolares } from './MemorialAlveolares';
```

**Trocar em** `src/app/edificio/MemorialEdificio.tsx`
```text
          <MemorialListagemGeral b={b} h2={h2} />
```
por
```text
          <MemorialAlveolares b={b} dim={dim} h2={h2} />
          <MemorialListagemGeral b={b} h2={h2} />
```

**Trocar em** `src/app/edificio/MemorialEdificio.tsx`
```text
['Total geral (vigas, pilares, paredes, lajes, vigotas e nervuradas)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [])]
```
por
```text
['Lajes alveolares (negativos na capa)', dim.resumoAcoAlveolares ?? []], ['Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [], dim.resumoAcoAlveolares ?? [])]
```

**Trocar em** `src/app/edificio/MemorialEdificio.tsx`
```text
dim.resumoAcoNervuradas ?? [])), 1)
```
por
```text
dim.resumoAcoNervuradas ?? [], dim.resumoAcoAlveolares ?? [])), 1)
```

## Edições em `Detalhamento.tsx`

**Trocar em** `src/app/edificio/Detalhamento.tsx`
```text
      <TabelaAco titulo="Lajes maciças" res={resL} marca="lajes" />
```
por
```text
      <TabelaAco titulo="Lajes maciças" res={resL} marca="lajes" />
      {(dim.resumoAcoAlveolares?.length ?? 0) > 0 && <TabelaAco titulo="Lajes alveolares (negativos na capa)" res={dim.resumoAcoAlveolares ?? []} marca="alveolares" />}
```

**Trocar em** `src/app/edificio/Detalhamento.tsx`
```text
  const perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL, resV, resN));
```
por
```text
  const perdas = perdasDoResumo(somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? []));
```

**Trocar em** `src/app/edificio/Detalhamento.tsx`
```text
      <TabelaAco titulo="Total geral (vigas, pilares, paredes, lajes, vigotas e nervuradas)" res={somarResumosAco(res, resP, resPar, resL, resV, resN)} marca="geral" />
```
por
```text
      <TabelaAco titulo="Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)" res={somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? [])} marca="geral" />
```

**Trocar em** `src/app/edificio/Detalhamento.tsx`
```text
...tabela('Resumo geral de aço (vigas, pilares, paredes, lajes, vigotas e nervuradas)', somarResumosAco(res, resP, resPar, resL, resV, resN))];
```
por
```text
...tabela('Resumo de aço das lajes alveolares (negativos na capa)', dim.resumoAcoAlveolares ?? []), ...tabela('Resumo geral de aço (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)', somarResumosAco(res, resP, resPar, resL, resV, resN, dim.resumoAcoAlveolares ?? []))];
```

## e2e

Registro do fluxo e conteúdo do fluxo `E3e`. Rótulos exatos: ver os cartões 1 a 4. Os helpers `grupoEdif` e `downloadText` já são importados em `E-2.mjs`.

**Trocar em** `e2e/flows/index.mjs`
```text
  m_layout.f_layout,
```
por
```text
  m_E_2.f_E3e,
  m_layout.f_layout,
```

**Acrescentar ao fim de** `e2e/flows/E-2.mjs`
```js
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
```

## Verificação
```bash
npx tsc -b
npx vitest run src/app/design src/core/building
npm run e2e -- --workers 1 E3e
```
