# Cartão L1-20 — Ligação das janelas e grupos na aba Edifício

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 15 a 19. Não acrescente botões à barra da planta (`PlantaBarra`): tudo entra no painel lateral.

## Objetivo
Ligar `NovaObra`, `ObrasRecentes`, `ImportarTexto`, `DadosGeraisJanela`, `EtapasGrupo` e `ArquivoGrupo` ao componente `Edificio`.

## Arquivos
1. `src/app/edificio/Edificio.tsx` (editar)
Leia antes: o início da função `Edificio()` (linhas ~49 a 75) e o fim do JSX (linhas ~175 a 183).

## Edições (todas em `Edificio.tsx`)
1. **Imports** (junto aos de `./…`): `import { NovaObra } from './NovaObra';` `import { ObrasRecentes } from './ObrasRecentes';` `import { ImportarTexto } from './ImportarTexto';` `import { DadosGeraisCorpo, DadosGeraisJanela } from './DadosGerais';` `import { ArquivoGrupo, EtapasGrupo } from './EtapasObra';` `import type { EtapaId } from '../../core/building/etapas';`.
2. **Estado**: logo depois de `const [memo, setMemo] = useState(false);` acrescente
`const [dialogoL1, setDialogoL1] = useState<null | 'nova' | 'recentes' | 'texto' | 'gerais'>(null);`
3. **Navegação das etapas**: logo depois de `const nErr = …;` acrescente
```ts
  const irEtapa = (id: EtapaId) => {
    if (id === 'obra') { setDialogoL1('gerais'); return; }
    if (id === 'calculo') { setAba('dimensionamento'); return; }
    if (id === 'pavimentos') { setAba('planta'); useStore.getState().set({ message: 'Pavimentos: edite a lista “Pavimentos” do painel (nome, cota, grupo, +1 para repetir).' }); return; }
    const f = ({ gabarito: 'eixo', pilares: 'pilar', pilaresParede: 'pilarParede', vigas: 'viga', lajes: 'laje', cargas: 'carga' } as Partial<Record<EtapaId, Ferramenta>>)[id];
    setAba('planta');
    if (f) usePlanta.getState().set({ ferramenta: f, ...aoEscolher(f) });
  };
```
4. **Grupo Obra**: troque o `aside` do `<Group title="Obra" …>` por
`aside={<span className="row"><Button className="mini" onClick={() => setDialogoL1('nova')}>Nova obra…</Button><Button className="mini" onClick={() => setDialogoL1('recentes')}>Obras recentes…</Button><button type="button" className="mini" onClick={() => novo(false)}>Novo padrão</button><button type="button" className="mini" onClick={() => novo(true)}>Novo vazio</button></span>}`
   (os dois botões antigos ficam como estão: testes de interface existentes os usam). Troque **todo o conteúdo interno** do grupo (do primeiro `<div className="row"><TextField label="Nome da obra" …` até o `<Hint>Cobrimentos (cm) … Tabela 7.2).</Hint>`, inclusive) por `<DadosGeraisCorpo b={b} />`. Depois disso remova do arquivo os imports que ficaram sem uso (o `tsc` aponta; `NumField`, `Select`, `TextField` e `Norma` provavelmente ainda são usados em outros trechos — remova só o que o `tsc` acusar).
5. **Etapas**: imediatamente antes de `<Group title="Obra" …>` insira `<EtapasGrupo b={b} aoIr={irEtapa} />`.
6. **Arquivo e versões**: imediatamente depois de `<VinculosGrupo b={b} />` insira `<ArquivoGrupo />`.
7. **Janelas**: depois da linha `{memo && <MemorialEdificio onClose={() => setMemo(false)} />}` insira
```tsx
      {dialogoL1 === 'nova' && <NovaObra onClose={() => setDialogoL1(null)} onCriada={() => setDialogoL1('gerais')} onTexto={() => setDialogoL1('texto')} />}
      {dialogoL1 === 'recentes' && <ObrasRecentes onClose={() => setDialogoL1(null)} onAberta={() => setDialogoL1(null)} />}
      {dialogoL1 === 'texto' && <ImportarTexto onClose={() => setDialogoL1(null)} onCriada={() => { setDialogoL1(null); useStore.getState().set({ module: 'fundacoes' }); }} />}
      {dialogoL1 === 'gerais' && <DadosGeraisJanela b={b} onClose={() => setDialogoL1(null)} />}
```
   Observação: `NovaObra` chama `onCriada` também para "obra vazia", "padrão" e "exemplo"; nesses casos a janela de dados gerais abre do mesmo jeito (comportamento desejado, C1.24).

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
npm run build
```
O build deve concluir sem erro (o orquestrador mede o tamanho do pacote; não o ajuste aqui).
