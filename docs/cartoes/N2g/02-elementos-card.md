# N2g — cartão 2: dados por elemento no grupo Incêndio e card "Resistência ao fogo" do Dimensionamento

Classe: Haiku (apresentação; os números vêm prontos de `Dimensionamento.fogo`). Pré-requisito: cartão 1 aplicado (`Incendio.tsx` existe com `IncendioGrupo`). Código verificado: compila com `npx tsc -b` e passa em `design.test.ts`.

## Núcleo usado (já existe)
- `ResultadoFogo` em `src/core/building/fogo.ts`, disponível como `dim.fogo` (`useBuilding().dim?.fogo`, tipo `Dimensionamento`):
  `{ grupos: { grupo, nome, trrf, origem }[]; sugestao?; elementos: FogoElemento[]; resumo: { total, ok, revisar, naoAtende } }`.
- `FogoElemento = { tipo: 'viga' | 'pilar' | 'laje'; id; nome; pavimento?; grupo; trrf; origemTrrf; trf; limiteTabela: boolean; folga; metodo; tabela; exigido; adotado; revestimento; status: 'ok' | 'review' | 'fail'; mensagens: string[] }`.
- `exec('fogo.definir', { elementos: { [id]: { trrf?, revestimento?: { material, espessura }, faces?, muFi?, compartimentadora?, lisa? } } })` grava; `exec('fogo.definir', { remover: { elementos: { [id]: ['trrf'] } } })` remove chaves (lista vazia `[]` remove todos os dados do elemento).
- `LinhaElemento` e `abrirJanela` de `./Revisao` (já exportados), `opcoesEmUso`/`perfilDe` (`op.fogoFacesPilar`, `op.fogoMuFi`, `op.fogoLajeCompartimentadora`).

## Arquivos (3)
1. `src/app/edificio/Incendio.tsx` — três edições (usam só imports que o cartão 1 já trouxe):
   a) logo antes da linha `const OCUPACOES:` acrescentar:
```tsx
type TipoEl = 'viga' | 'pilar' | 'laje';
const TIPOS_EL: { v: TipoEl; label: string }[] = [{ v: 'viga', label: 'Viga' }, { v: 'pilar', label: 'Pilar' }, { v: 'laje', label: 'Laje' }];
```
   b) trocar a linha `      {erro && <span className="hint bad">{erro}</span>}` por:
```tsx
      <h4>Por elemento</h4>
      <IncendioElementos b={b} f={f} />
      {erro && <span className="hint bad">{erro}</span>}
```
   c) acrescentar ao fim do arquivo (depois da função `IncendioGrupo`):
```tsx
/** Dados de incêndio de um elemento (TRRF próprio, revestimento, faces e μfi dos pilares, funções das lajes). */
function IncendioElementos({ b, f }: { b: BuildingModel; f: (p: Record<string, unknown>) => void }) {
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const [tipo, setTipo] = useState<TipoEl>('viga');
  const [id, setId] = useState('');
  const lista = tipo === 'viga' ? b.vigas : tipo === 'pilar' ? b.pilares : b.lajes;
  const el = lista.find((x) => x.id === id) ?? lista[0];
  const c = el ? b.fogo?.elementos?.[el.id] : undefined;
  const rev = c?.revestimento;
  const grava = (p: Record<string, unknown>) => { if (el) f({ elementos: { [el.id]: p } }); };
  const tira = (...chaves: string[]) => { if (el) f({ remover: { elementos: { [el.id]: chaves } } }); };
  return (
    <>
      <div className="row wrap">
        <Select label="Tipo" value={tipo} options={TIPOS_EL} onChange={(t) => { setTipo(t); setId(''); }} />
        <Select label="Elemento" value={el?.id ?? ''} options={lista.map((x) => ({ v: x.id, label: x.nome }))} onChange={setId} />
      </div>
      {!el ? <Hint>Sem elementos deste tipo.</Hint> : (
        <table className="data" data-fogo-elemento>
          <thead><tr><th>Dado</th><th>Valor</th></tr></thead>
          <tbody>
            <tr>
              <td className="tl">TRRF do elemento (min)</td>
              <td className="num"><OptNumCell value={c?.trrf} placeholder="do grupo" onChange={(v) => (v === undefined ? tira('trrf') : grava({ trrf: v }))} /></td>
            </tr>
            <tr>
              <td className="tl">Revestimento de proteção</td>
              <td className="tl"><Select value={(rev?.material ?? '') as Mat} options={MATERIAIS} onChange={(m) => (m === '' ? tira('revestimento') : grava({ revestimento: { material: m, espessura: rev?.espessura ?? 15 } }))} /></td>
            </tr>
            {rev && (
              <tr>
                <td className="tl">Espessura do revestimento (mm)</td>
                <td className="num"><NumCell label="Espessura do revestimento do elemento (mm)" value={rev.espessura} onChange={(v) => grava({ revestimento: { material: rev.material, espessura: v } })} /></td>
              </tr>
            )}
            {tipo === 'pilar' && (
              <>
                <tr>
                  <td className="tl">Faces expostas ao fogo</td>
                  <td className="num"><OptNumCell value={c?.faces} placeholder={String(op.fogoFacesPilar)} onChange={(v) => (v === undefined ? tira('faces') : grava({ faces: v }))} /></td>
                </tr>
                <tr>
                  <td className="tl">μfi do pilar</td>
                  <td className="num"><OptNumCell value={c?.muFi} placeholder={String(op.fogoMuFi)} onChange={(v) => (v === undefined ? tira('muFi') : grava({ muFi: v }))} /></td>
                </tr>
              </>
            )}
            {tipo === 'laje' && (
              <>
                <tr>
                  <td className="tl">Laje compartimentadora</td>
                  <td className="tl"><Check label="Verificar também a espessura mínima" checked={c?.compartimentadora ?? !!op.fogoLajeCompartimentadora} onChange={(v) => grava({ compartimentadora: v })} /></td>
                </tr>
                <tr>
                  <td className="tl">Laje lisa (sem vigas)</td>
                  <td className="tl"><Check label="Tabela das lajes lisas" checked={c?.lisa ?? false} onChange={(v) => (v ? grava({ lisa: true }) : tira('lisa'))} /></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      )}
      <div className="row wrap">
        <Button disabled={!c} onClick={() => tira()}>Limpar dados do elemento</Button>
      </div>
    </>
  );
}
```
2. **Novo** `src/app/edificio/FogoCard.tsx` com o conteúdo exato:
```tsx
// N2g: card "Resistência ao fogo" da aba Dimensionamento: TRRF, TRF atingido e folga por elemento.
import { useState } from 'react';
import { Check, Hint, Pill } from '../ui';
import { abrirJanela, LinhaElemento } from './Revisao';
import { useBuilding } from './store';

const SITUACAO = { ok: { tone: 'ok', txt: 'atende', cls: '' }, review: { tone: 'warn', txt: 'revisar', cls: 'warn' }, fail: { tone: 'bad', txt: 'não atende', cls: 'bad' } } as const;

export function FogoCard({ onIr }: { onIr: (tipo: 'viga' | 'pilar' | 'laje', id: string, pavimento?: string) => void }) {
  const { dim } = useBuilding();
  const [so, setSo] = useState(false);
  const fogo = dim?.fogo;
  if (!fogo) return null;
  const linhas = so ? fogo.elementos.filter((e) => e.status !== 'ok') : fogo.elementos;
  const r = fogo.resumo;
  return (
    <div className="card" data-card-fogo>
      <h3>Resistência ao fogo</h3>
      <p className="small">{r.ok}/{r.total} atendem · {r.revisar} a revisar · {r.naoAtende} não atendem. TRRF: {fogo.grupos.map((g) => `${g.nome} ${g.trrf} min`).join(', ')}.</p>
      <div className="row wrap"><Check label="só o que não atende" checked={so} onChange={setSo} /></div>
      <table className="data quadro">
        <thead><tr><th>Elemento</th><th>Tipo</th><th>Pavimento</th><th>TRRF (min)</th><th>TRF (min)</th><th>Folga (min)</th><th>Método</th><th>Situação</th></tr></thead>
        <tbody>
          {linhas.map((e) => {
            const s = SITUACAO[e.status];
            const trf = e.metodo === 'analítico' ? String(e.trf) : e.trf > 0 ? `${e.limiteTabela ? '≥ ' : ''}${e.trf}` : '< 30';
            return (
              <LinhaElemento key={`${e.tipo}-${e.id}-${e.pavimento ?? ''}`} className={`click ${s.cls}`} title={e.mensagens.join(' ') || `${e.tabela}: exigido ${e.exigido}; adotado ${e.adotado}`} ir={() => onIr(e.tipo, e.id, e.pavimento)} abrir={() => abrirJanela({ tipo: e.tipo, id: e.id, pavimento: e.pavimento })}>
                <td className="tl">{e.nome}</td><td className="tl">{e.tipo}</td><td className="tl">{e.pavimento ?? '—'}</td><td className="num">{e.trrf}</td><td className="num">{trf}</td><td className="num">{e.folga}</td><td className="tl small">{e.metodo}</td><td><Pill tone={s.tone}>{s.txt}</Pill></td>
              </LinhaElemento>
            );
          })}
        </tbody>
      </table>
      <Hint>TRF = maior TRRF tabelado atendido (vigas e lajes, NBR 15200:2004 até 120 min) ou o TRF calculado pelo método analítico (pilares). Passe o mouse na linha para ver o exigido e o adotado; duplo clique abre a janela do elemento.</Hint>
    </div>
  );
}
```
3. `src/app/edificio/Edificio.tsx` — duas edições:
   - logo abaixo de `import { IncendioGrupo } from './Incendio';` acrescentar `import { FogoCard } from './FogoCard';`;
   - na função `DimensionamentoAba`, logo antes da linha `          {!!dim.puncao?.length && (` (a primeira ocorrência, card "Punção das lajes"), inserir a linha `          {!!dim.fogo && <FogoCard onIr={onIr} />}`.

## Componentes de `src/app/ui` (nunca controles crus)
`Button`, `Check`, `Hint`, `NumCell`, `OptNumCell`, `Pill` (tons `ok`, `warn`, `bad`), `Select`. Classes existentes `data`, `quadro`, `num`, `tl`, `small`, `card`, `row wrap`, `click`, `warn`, `bad`.

## Observação sobre o escopo
A especificação pede "coluna TRF nas tabelas de vigas, pilares e lajes"; as três tabelas têm cabeçalhos longos e fixos, então o TRRF, o TRF e a folga ficam num card único com a mesma interação das tabelas (um clique leva à planta, duplo clique abre a janela do elemento). Erros de incêndio aparecem na planta pela revisão (códigos `FOGO_*`, sem trabalho de interface).

## Rótulos exatos (o e2e depende deles)
Card `data-card-fogo` com título `Resistência ao fogo`; cabeçalho `Elemento | Tipo | Pavimento | TRRF (min) | TRF (min) | Folga (min) | Método | Situação`; `Pill` `atende`, `revisar` ou `não atende`; caixa `só o que não atende`. Dados por elemento: tabela `data-fogo-elemento` com as linhas `TRRF do elemento (min)`, `Revestimento de proteção`, `Espessura do revestimento (mm)`, `Faces expostas ao fogo`, `μfi do pilar`, `Laje compartimentadora`, `Laje lisa (sem vigas)`; botão `Limpar dados do elemento`.

## e2e
Fluxo `N2g` no cartão 3.

## Checklist
Nenhuma linha muda só com este cartão.

## Verificação
`npx tsc -b && npx vitest run src/app/design/design.test.ts`
