# N2f — cartão 3: memorial, fluxo e2e `N2f` e checklist

Classe: Haiku (memorial com dados prontos; e2e no padrão do fluxo `N2e`).

## Arquivos (3)
1. `src/app/edificio/MemorialEdificio.tsx`
2. `e2e/flows.mjs` (fluxo novo no fim do array, depois do `N2e`)
3. `docs/checklist-manual-cypecad.md` (linha C7.83) e depois `npm run checklists`

## Memorial
- Importar `import { memorialFlechas, linhasFlechas } from '../../core/building/flechas';`.
- Trocar o parágrafo das vigas que começa com `<p>Flecha das vigas por vão entre pilares:` (hoje fala só de `× (1 + αf)` e ρ′ = 0) por:
  `<p>Flecha das vigas por vão entre pilares: rigidez de Branson em cada seção ({opc.inerciaHomogeneizada ? 'estádio I homogeneizado, αe = Es/Ecs' : 'seção bruta'}) com a armadura calculada, curvatura integrada ao longo do vão{opc.flechaRotacaoBalanco ? ', giro do apoio somado nos balanços' : ''}; {opc.flechaEtapas ? 'flecha diferida por etapas de carga (ver tabela de etapas)' : `flecha total = imediata × (1 + αf), αf = Δξ(t0) = ${fmt(deltaXi(opc.t0Flecha))}`}, ρ′ {opc.flechaRhoLinha ? 'das barras de montagem' : '= 0'} (a confirmar).</p>`
- Logo depois desse parágrafo, inserir a seção:
  ```tsx
  <div data-memorial-flechas>
    <p><b>Etapas de carga e limites de flecha</b> (N2f; NBR 6118, 17.3.2.1.2 e Tabela 13.3).</p>
    {memorialFlechas(b, opc).map((m) => (
      <table key={m.tipo}>
        <caption>{m.rotulo}{m.proprias ? ' (etapas próprias)' : ''} — paredes aos {m.tParedes} dias; limites: total {m.limites.total}, ativa {m.limites.ativa}, variável {m.limites.variavel}, instantânea {m.limites.instantanea}</caption>
        <thead><tr><th>Etapa</th><th>Idade (dias)</th><th>pp</th><th>Alvenaria</th><th>Revestimento</th><th>ψ2·Q</th><th>ξ(t)</th><th>Δξ</th><th>Δξ após as paredes</th></tr></thead>
        <tbody>{m.etapas.map((e) => <tr key={e.nome}><td className="l">{e.nome}</td><td>{e.dias}</td><td>{fmt(e.pp)}</td><td>{fmt(e.alvenaria)}</td><td>{fmt(e.revestimento)}</td><td>{fmt(e.variavel)}</td><td>{fmt(e.xi)}</td><td>{fmt(e.dXi)}</td><td>{fmt(e.dXiAtiva)}</td></tr>)}</tbody>
      </table>
    ))}
  </div>
  ```
- Na tabela de vigas do memorial (cabeçalho com `Flecha / lim. (mm)`), acrescentar a coluna `Ativa / lim. (mm)` depois de `Flecha Q / lim. (mm)`, com `x.flechas ? `${fmt(x.flechas.ativa * 1000, 1)} / ${fmt(x.flechas.limites.ativa * 1000, 1)}` : '—'` e `className="bad"` quando `x.flechas && x.flechas.ativa > x.flechas.limites.ativa + 1e-9`. O mesmo na tabela de lajes (`Flecha Q / lim. (mm)` → nova coluna `Ativa / lim. (mm)`).
- No parágrafo das lajes que começa com `<p>Lajes maciças: momentos por`, trocar o trecho do fator por: `{opc.fatorFlechaLaje ? `fator simplificado ${fmt(opc.fatorFlechaLaje, 1)} × elástica (ativa ${fmt(opc.fatorFlechaAtiva, 2)}/${fmt(opc.fatorFlechaAtivaTrelicada, 2)} e variável ${fmt(opc.fatorFlechaConforto, 2)}/${fmt(opc.fatorFlechaConfortoTrelicada, 2)} × elástica, maciça/treliçada)` : `método por etapas${opc.fissuracaoLajes ? ' com a grelha fissurada (Branson por barra, Mr da 17.3.1)' : ', sem fissuração'}`}`.
- Não use `linhasFlechas` aqui se não precisar (o import é opcional; remova-o se ficar sem uso, senão o `tsc` reprova).

## Fluxo e2e `N2f` (copiar a estrutura do fluxo `N2e`: `newPage`, `cmd`, `livre`)
```js
{
  name: 'N2f: flechas por etapas (etapas, limites por elemento, janela da viga, memorial)',
  async run({ newPage }) {
    // aba Edifício, cmd e livre como no N2e
    // modelo: 4 pilares 20×40 em (0,0) (6,0) (6,5) (0,5); vigas 15×50 no contorno (grupo g_3); laje.detectarPanos {"grupo": "g_3", "tipo": {"tipo": "macica", "h": 0.12}}
    // calcular (botão /^(Calcular e dimensionar|Recalcular)$/) e esperar livre()
    // 1) grupo "Etapas de carga (flechas)": [data-etapas] tbody tr = 4; texto contém "Desforma (peso próprio)"
    // 2) grupo "Opções de cálculo": texto contém "Limite da flecha ativa (vão / …)" e "Fator simplificado da flecha ativa (maciças)"
    // 3) cmd('flechas.limites {"elemento": "viga", "tipo": "ativa", "limite": {"rel": 100000}}'), recalcular, livre();
    //    lista de erros ([data-lista-erros] details summary, clicar) contém "FLECHA_ATIVA"
    // 4) aba Dimensionamento → duplo clique na 1ª linha do card "Vigas" → dialog /Resultados do elemento — Viga/:
    //    [data-flechas] tbody tr = 4 e texto "Ativa (após as paredes)"; Escape
    // 5) botão "Memorial do edifício" → dialog "Memorial do edifício": [data-memorial-flechas] contém "Desforma (peso próprio)" e "ℓ/500 e 1 cm"; Fechar
  },
},
```
Escrever com `assert.match`/`assert.equal` como no `N2e`. Rodar só ele: `npm run e2e -- N2f` (ou `--no-build N2f` depois de um build).

## Checklist
- `docs/checklist-manual-cypecad.md`, linha `C7.83`: situação `Feito`, frente `—`, nota `N2f: limites próprios das treliçadas por tipo de flecha (`flechas.limites`, grupo "Etapas de carga (flechas)" em `EtapasFlecha.tsx`), ativa ℓ/500 e 10 mm e fator 1,75; e2e N2f`.
- Acrescentar ao "Histórico de conferência" do mesmo arquivo: `- **dd/mm/2026 — fatia N2f, interface.** C7.83 passa a Feito (EtapasFlecha.tsx, FlechasTabela.tsx, memorial, e2e N2f).`
- Rodar `npm run checklists`.

## Verificação
`npx tsc -b && npx vitest run src/core/checklists.test.ts src/app/design/design.test.ts && npm run e2e -- N2f`
