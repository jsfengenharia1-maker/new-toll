# Cartão E2a-2 — traço próprio na planta e seção T/L no detalhe da viga

Executor: Haiku. Depende do núcleo da E2a e do cartão `1-editor-secao.md` (não há dependência de código, só de ordem).

## Regras (valem para todo o cartão)
- Só interface. **Não altere nada em `src/core/`** (o núcleo da E2a está pronto e testado em `src/core/building/secaoVigas.test.ts`). Componentes só de `src/app/ui` (nunca controles crus); sem cor literal, sem CSS novo, sem estilo inline (as classes usadas já existem em `global.css`); nenhum botão novo na barra da planta.
- Os rótulos abaixo são **exatos e únicos** no escopo em que o e2e os procura: não os renomeie, não acrescente `unit` aos campos que já o trazem no rótulo e mantenha o `aria-label` igual ao rótulo. No e2e, `getByLabel(..., { exact: true })` para `Check` e botões; para `NumField`, `OptNumField` e `Select` (o nome acessível inclui valor ou unidade) use regex ancorada no início, como `getByLabel(/^Tipo da seção/)`.
- Aplique as edições na ordem. Se um texto a localizar não existir (outro agente mexeu no arquivo), pare e descreva o que encontrou: não improvise.

## O que o núcleo já entrega (não reimplemente)
- `Viga.mesa?: { tipo: 'T' | 'L'; bf?; hf?; a? }` (m), `Viga.chata`, `Viga.estrutural?: false` e `Viga.amarracao`. Comandos `viga.editar { id, mesa: { tipo: 'ret' | 'T' | 'L', bf?, hf?, a? }, chata, estrutural, amarracao }` (`mesa.tipo = 'ret'` remove a mesa; `chata: true` iguala a altura à da laje que a viga contorna, erro `VIGA_CHATA_SEM_LAJE` se nenhuma laje a toca) e o `lote` para vários.
- `src/core/building/secaoViga.ts`: `mesaDaViga(b, v)` (mesa colaborante automática da NBR 6118 14.6.2.2 ou informada; `null` se retangular ou sem laje; traz `bf`, `hf`, `b1`, `a`, `automatica`, `texto`), `alturaVigaChata(b, v)` (m ou `null`), `contornoSecaoViga(bw, h, mesa, invertida)` (polígono da prévia), `resumoSecoesVigas(b)` (quadro do memorial).
- `DetalheViga.cantosMesa?: { n, phi, s0, s1, comprimento, bf, hf }` (barras de canto da mesa, opção `mesaBarrasCanto`) e as opções `mesaRigidez`, `mesaDimensionamento` (aparecem sozinhas no grupo Opções de cálculo).

## 1. Editar `src/app/edificio/Planta.tsx` (laço `// vigas`, três linhas distintas)
1.1. Substitua
```tsx
      ctx.fillStyle = cor; ctx.globalAlpha = 0.12;
      for (const r of t) {
```
por
```tsx
      ctx.fillStyle = cor; ctx.globalAlpha = v.estrutural === false ? 0.04 : 0.12;
      for (const r of t) {
```
1.2. Substitua a linha
```tsx
      if (v.invertida) ctx.setLineDash([6, 3]);
```
por
```tsx
      if (v.estrutural === false) ctx.setLineDash([2, 4]); else if (v.invertida) ctx.setLineDash([6, 3]);
```
1.3. Na linha do `ctx.fillText(` do rótulo da viga, troque o trecho `${v.invertida ? ' inv.' : ''}${erro ? ' ⚠' : avi ? ' !' : ''}` por
```tsx
${v.invertida ? ' inv.' : ''}${v.mesa ? ` ${v.mesa.tipo}` : ''}${v.chata ? ' chata' : ''}${v.estrutural === false ? ' n.est.' : ''}${v.amarracao ? ' amar.' : ''}${erro ? ' ⚠' : avi ? ' !' : ''}
```
(o resto da linha, `${bloqueados.has(v.id) ? ' ▣' : ''}`, fica igual).

## 2. Editar `src/app/edificio/Detalhamento.tsx` (função `Secao`, seção transversal)
2.1. Troque a assinatura
```tsx
function Secao({ d, b, h, cob, phiT }: { d: DetalheViga; b: number; h: number; cob: { inf: number; sup: number; lat: number }; phiT: number }) {
```
por
```tsx
function Secao({ d, b, h, cob, phiT, tipoMesa, invertida }: { d: DetalheViga; b: number; h: number; cob: { inf: number; sup: number; lat: number }; phiT: number; tipoMesa?: 'T' | 'L'; invertida?: boolean }) {
```
2.2. Troque a linha
```tsx
  const esc = 190 / Math.max(h, b), m = 18, wS = b * esc, hS = h * esc, W = wS + 2 * m, H = hS + 2 * m + 18;
```
por
```tsx
  // seção T ou L (E2a): as abas da mesa ficam fora da alma; origem deslocada pela aba da esquerda
  const cm = d.cantosMesa, bT = cm ? cm.bf - b : 0, aEsq = cm ? (tipoMesa === 'L' ? bT : bT / 2) : 0, aDir = cm ? bT - aEsq : 0;
  const esc = 190 / Math.max(h, b + bT), m = 18, wS = b * esc, hS = h * esc, W = wS + (aEsq + aDir) * esc + 2 * m, H = hS + 2 * m + 18, x0 = m + aEsq * esc;
```
2.3. Troque a linha
```tsx
  const P = (v: number) => (m + v * esc).toFixed(1);
```
por
```tsx
  const P = (v: number) => (x0 + v * esc).toFixed(1);
  const Py = (v: number) => (m + v * esc).toFixed(1);
```
2.4. No `return (<svg ...>` de `Secao`, substitua as linhas desde `<rect x={m} y={m} width={wS} height={hS} className="det-contorno" />` até o `<text x={m + wS / 2} y={H - 4} ...>…</text>` (inclusive, antes de `</svg>`) por exatamente:
```tsx
      <rect x={x0} y={m} width={wS} height={hS} className="det-contorno" />
      {cm && aEsq > 0 && <rect x={m} y={invertida ? m + (h - cm.hf) * esc : m} width={aEsq * esc} height={cm.hf * esc} className="det-contorno" data-mesa-aba="esq" />}
      {cm && aDir > 0 && <rect x={x0 + wS} y={invertida ? m + (h - cm.hf) * esc : m} width={aDir * esc} height={cm.hf * esc} className="det-contorno" data-mesa-aba="dir" />}
      <rect x={P(cob.lat)} y={Py(cob.sup)} width={((b - 2 * cob.lat) * esc).toFixed(1)} height={((h - cob.sup - cob.inf) * esc).toFixed(1)} rx={4} className="det-estribo-sec" />
      {pS.map((c, i) => <circle key={`s${i}`} cx={P(c.x)} cy={Py(c.y)} r={R(c.r)} className="det-pt sup" />)}
      {pI.map((c, i) => <circle key={`i${i}`} cx={P(c.x)} cy={Py(c.y)} r={R(c.r)} className="det-pt inf" />)}
      {pP.map((c, i) => <circle key={`p${i}`} cx={P(c.x)} cy={Py(c.y)} r={R(c.r)} className="det-pt pele" />)}
      {cm && (aEsq > 0 || cm.n === 2) && <circle cx={P(-aEsq + (cob.sup + cm.phi / 2000))} cy={Py(invertida ? h - cob.inf - cm.phi / 2000 : cob.sup + cm.phi / 2000)} r={R(cm.phi / 2000)} className="det-pt sup" data-canto-mesa />}
      {cm && (aDir > 0 || cm.n === 2) && <circle cx={P(b + aDir - (cob.sup + cm.phi / 2000))} cy={Py(invertida ? h - cob.inf - cm.phi / 2000 : cob.sup + cm.phi / 2000)} r={R(cm.phi / 2000)} className="det-pt sup" data-canto-mesa />}
      <text x={x0 + wS / 2} y={H - 4} textAnchor="middle" className="det-txt cota">{fmt(b * 100, 0)} × {fmt(h * 100, 0)} cm{cm ? ` · bf ${fmt(cm.bf * 100, 0)} × hf ${fmt(cm.hf * 100, 0)}` : ''} · s = {fmt(sSec)} m · cobr. {fmt(cob.inf * 100, 1)} cm</text>
```
2.5. Na chamada de `Secao` em `DetalheDaViga`, troque `<Secao d={d} b={v.secao.b} h={v.secao.h} cob={cob} phiT={phiT} />` por
```tsx
<Secao d={d} b={v.secao.b} h={v.secao.h} cob={cob} phiT={phiT} tipoMesa={v.mesa?.tipo} invertida={v.invertida} />
```

## Verificação
`npx tsc -b` sem erros e `npx vitest run src/app/design` verde. Viga retangular continua igual (sem `cantosMesa`, `aEsq = aDir = 0` e `x0 = m`). Relate só o resultado.
