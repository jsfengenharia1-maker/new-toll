# D6 — cartão 01: helpers e seletores dos fluxos (substituição mecânica)

Classe: Haiku (substituições com `sed` conferidas por `grep -c` antes e depois). Falhou duas vezes: sobe para Sonnet baixo.

Os helpers entram junto do cartão D3 que os exige (o `fileMenu` com o D3-02, `ferramenta`/`faixa` com o D3-02/03, `abrirConfiguracao`/`grupoEdif` com o D3-07, `.statusbar .status` com o D3-06); este cartão reúne o texto final e a lista de trocas para quem fecha a fatia D6. Nenhum seletor por **texto de botão** muda (os rótulos foram preservados); mudam só contêineres.

## Arquivos
- `e2e/flows.mjs` (helpers no topo e substituições)
- `e2e/run.mjs` (viewport 1400 × 1080, já feito no D2-01)

## Helpers (colocar logo depois de `openGroup`/`downloadText`, no topo de `flows.mjs`)
```js
const faixaAbas = (page) => page.getByRole('tablist', { name: 'Faixa de comandos' });

/** Abre a aba da faixa (se já não estiver aberta) e devolve a faixa dela. */
async function faixa(page, aba) {
  const t = faixaAbas(page).getByRole('tab', { name: aba, exact: true });
  if ((await t.getAttribute('aria-selected')) !== 'true') await t.click();
  return page.getByRole('toolbar', { name: new RegExp(`^Comandos: ${aba}`) });
}

/** Escolhe uma ferramenta da planta pela faixa (as teclas continuam valendo; use `page.keyboard.press` quando o fluxo já usa tecla). */
async function ferramenta(page, aba, nome) {
  await (await faixa(page, aba)).getByRole('radio', { name: nome, exact: true }).click();
}

async function fileMenu(page, item) {
  await (await faixa(page, 'Arquivo')).getByRole('button', { name: item }).first().click();
}

/** Abre a janela Configuração da obra numa seção do índice (título do índice, não o do grupo). Fecha com `fecharJanela`. */
async function abrirConfiguracao(page, secao) {
  if (!(await page.getByRole('dialog', { name: 'Configuração da obra' }).count())) await (await faixa(page, 'Arquivo')).getByRole('button', { name: 'Configuração da obra…' }).click();
  await page.getByRole('navigation', { name: 'Seções da configuração' }).getByRole('button', { name: secao, exact: true }).click();
}
async function fecharJanela(page, nome) {
  await page.getByRole('dialog', { name: nome }).getByRole('button', { name: 'Fechar', exact: true }).click();
}

/** Título do grupo → seção da Configuração da obra (grupos que saíram da coluna esquerda no D3-07). */
const SECAO_CFG = [
  ['Opções de cálculo', 'Opções de cálculo'], ['Materiais e segurança', 'Materiais e segurança'], ['Tabelas de armadura', 'Tabelas de armadura'],
  ['Biblioteca de normas', 'Biblioteca de normas'], ['Tipos de laje', 'Tipos de laje'], ['Casos de carga', 'Casos de carga'],
  ['Compatibilidade entre casos', 'Casos de carga'], ['Arranjos alternados', 'Casos de carga'], ['Estados-limite', 'Estados-limite e combinações'],
  ['Vento e combinações', 'Vento e combinações'], ['Ábacos de vento', 'Ábacos de vento'], ['Empuxo de terra', 'Empuxo de terra'],
  ['Etapas de carga', 'Etapas de carga'], ['Incêndio', 'Incêndio'], ['Arquivo e versões', 'Arquivo e versões'],
  ['Fundação', 'Fundação (terreno, estacas, sondagens, parâmetros)'], ['Parâmetros das sapatas corridas', 'Fundação (terreno, estacas, sondagens, parâmetros)'],
];

/** Grupo recolhível (`details.group`) do Edifício pelo título, onde estiver: coluna esquerda, Propriedades ou Configuração da obra. Abre o grupo. */
async function grupoEdif(page, titulo) {
  const loc = () => page.locator('.edif-in details.group').filter({ has: page.locator(':scope > summary', { hasText: titulo }) }).first();
  if ((await loc().count()) === 0) {
    const txt = titulo instanceof RegExp ? titulo.source.replace(/^\^/, '') : titulo;
    const s = SECAO_CFG.find(([p]) => txt.startsWith(p));
    if (s) await abrirConfiguracao(page, s[1]);
  }
  const g = loc();
  if (!(await g.evaluate((d) => d.open))) await g.locator(':scope > summary').click();
  return g;
}
```
Nota: `.edif-in` precisa estar também em `.cfg-corpo` (acrescentar `className="cfg-corpo edif-in"` no cartão D3-01: o `edif-in` só tem regra de CSS em `@media (max-width: 900px)`, sem efeito de layout em tela larga).

## Substituições (conferir contagens antes e depois)
| Padrão atual | Contagem (23/10/2026) | Troca |
|---|---|---|
| `page.getByRole('tab', { name: 'Fundações', exact: true })` | 2 | `page.getByRole('tablist', { name: 'Módulo' }).getByRole('tab', …)` (D2-01) |
| `.topbar .status` | 4 | `.statusbar .status` |
| `page.locator('.edif-in details', { has: page.locator('summary', { hasText: T }) }).first()` seguido de abrir se fechado | 21 | `await grupoEdif(page, T)` (apagar as 2 a 3 linhas de abrir) |
| `getByRole('radio', { name: 'Fundação' })`, `'Viga de fundação'`, `'Armadura de punção'` | 8 + 1 + 1 | `await ferramenta(page, 'Fundações', 'Fundação')` etc. (aba conforme o mapa: `Fundações`, `Edição`) |
| `.planta-barra` + `getByRole('button', { name: 'Resultados do elemento' })` | 2 | `(await faixa(page, 'Dimensionamento')).getByRole('button', { name: 'Resultados do elemento' })` (ou a aba contextual) |
| `getByLabel('Armadura das lajes na planta')` | 5 | `await faixa(page, 'Vista')` antes (o controle mora na aba Vista) |
| `.planta-barra` + `Cores` | 3 | idem, aba Vista |
| `masc.getByRole('button', { name: 'Capturas…', exact: true })`, `Importar DXF…`, `Lançar por DXF/DWG…`, `Gabaritos e vistas…`, `Vistas por pavimento…` | 5 | `(await faixa(page, 'Lançamento')).getByRole('button', { name: … })` |
| `getByRole('button', { name: 'Importar do pórtico atual' })`, `'Importar do edifício'` | ver `grep` | faixa do módulo Fundações, aba Lançamento |
| `page.getByRole('button', { name: 'Arquivo ▾' })` e `.menu button` | 1 + 0 | `fileMenu` |

Conferência final: `grep -c "\.menu button\|Arquivo ▾\|\.topbar \.status\|\.planta-barra" e2e/flows.mjs` → só os usos legítimos de `.planta-barra` (opções da ferramenta: `Vários pilares`, `Pavimento da planta`, `Cópias`).

## Verificação
`node --check e2e/flows.mjs`; `npm run e2e -- --workers 4` completo (81 + novos, todos verdes); `npm run e2e -- --workers 1` uma vez (serial) para pegar dependência de ordem.
