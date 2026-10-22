# N2g — cartão 1: grupo "Incêndio" na barra lateral do edifício

Classe: Haiku (interface sobre núcleo pronto; segue o padrão de `EtapasFlecha.tsx` e `EstadosLimite.tsx`). Código verificado: compila com `npx tsc -b` e passa em `design.test.ts` como está abaixo.

## Pré-requisitos (núcleo, já no repositório)
`src/core/building/fogo.ts` (`alturaDaEdificacao`, `MATERIAIS_REVESTIMENTO`, `sugestaoTrrf`, `trrfDoGrupo`, tipo `MaterialRevestimento`), `src/core/building/fogoTabelas.ts` (`DIVISOES_OCUPACAO`), `estadoEmUso(b, 'incendio')` em `acoes.ts`, comando `fogo.definir` (ver parâmetros abaixo), opções `fogoTRRF` etc. Nada a criar no núcleo neste cartão.

Parâmetros de `exec('fogo.definir', p)` usados: `{ ativo: boolean }`; `{ ocupacao: 'D-1' }`; `{ altura: 20 }`; `{ trrf: { g_3: 90 } }`; `{ revestimentos: { g_3: { material: 'cal' | 'cimento' | 'protetor', espessura: 15 } } }`; `{ remover: { ocupacao: true, altura: true, trrf: ['g_3'], revestimentos: ['g_3'] } }`. Erros vêm em `r.erros[0].mensagem`.

## Arquivos (2)
1. **Novo** `src/app/edificio/Incendio.tsx` — `export function IncendioGrupo({ b }: { b: BuildingModel })`, com o conteúdo exato abaixo.
2. `src/app/edificio/Edificio.tsx` — duas edições:
   - logo abaixo da linha `import { EtapasFlechaGrupo } from './EtapasFlecha';`, acrescentar `import { IncendioGrupo } from './Incendio';`;
   - logo abaixo da linha `        <EtapasFlechaGrupo b={b} />`, acrescentar `        <IncendioGrupo b={b} />`.

## Componentes de `src/app/ui` (nunca controles crus)
`Button`, `Check`, `Group`, `Hint`, `NumCell`, `NumField`, `OptNumCell`, `Select`. Sem CSS novo: classes existentes `data`, `num`, `tl`, `small`, `row wrap`, `hint bad`. Sem sinal de `noUnusedLocals`: o arquivo abaixo usa todos os imports.

## Conteúdo exato de `src/app/edificio/Incendio.tsx`
```tsx
// N2g: grupo "Incêndio" na barra lateral do edifício: verificação (estado-limite), ocupação, altura, TRRF e
// revestimento por grupo de pavimentos.
import { useState } from 'react';
import { estadoEmUso } from '../../core/building/acoes';
import { alturaDaEdificacao, MATERIAIS_REVESTIMENTO, sugestaoTrrf, trrfDoGrupo, type MaterialRevestimento } from '../../core/building/fogo';
import { DIVISOES_OCUPACAO } from '../../core/building/fogoTabelas';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';
import { Button, Check, Group, Hint, NumCell, NumField, OptNumCell, Select } from '../ui';
import { useBuilding } from './store';

const ORIGEM = { elemento: 'do elemento', grupo: 'do grupo', ocupacao: 'da ocupação', padrao: 'padrão (opções)' } as const;
type Mat = MaterialRevestimento | '';
const MATERIAIS: { v: Mat; label: string }[] = [{ v: '', label: 'sem revestimento' }, ...MATERIAIS_REVESTIMENTO.map((m) => ({ v: m.v as Mat, label: m.rotulo }))];
const OCUPACOES: { v: string; label: string }[] = [{ v: '', label: '— não informada —' }, ...DIVISOES_OCUPACAO.map((d) => ({ v: d.divisao, label: `${d.divisao} — ${d.ocupacao}` }))];

export function IncendioGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [erro, setErro] = useState('');
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const ativo = estadoEmUso(b, 'incendio').ativo;
  const sug = sugestaoTrrf(b);
  const f = (p: Record<string, unknown>) => {
    const r = exec('fogo.definir', p);
    setErro(r.ok ? '' : r.erros[0]?.mensagem ?? 'Não foi possível alterar os dados de incêndio.');
  };
  const grupos = [...new Set(b.pavimentos.map((p) => p.grupo))];
  const nomeGrupo = (g: string) => b.grupos.find((x) => x.id === g)?.nome ?? g;

  return (
    <Group title={ativo ? 'Incêndio (ligado)' : 'Incêndio'} open={false}>
      <Check label="Verificar resistência ao fogo (NBR 15200)" checked={ativo} onChange={(c) => f({ ativo: c })} />
      <Select label="Ocupação (NBR 14432 / IT)" value={b.fogo?.ocupacao ?? ''} options={OCUPACOES} onChange={(v) => (v === '' ? f({ remover: { ocupacao: true } }) : f({ ocupacao: v }))} />
      <div className="row wrap">
        <NumField label="Altura da edificação" unit="m" value={b.fogo?.altura ?? alturaDaEdificacao(b)} onChange={(v) => f({ altura: v })} />
        <Button disabled={b.fogo?.altura === undefined} onClick={() => f({ remover: { altura: true } })}>Altura pelos pavimentos</Button>
      </div>
      <Hint>
        {sug
          ? `Sugestão: TRRF de ${sug.trrf === null ? 'consultar o corpo técnico' : `${sug.trrf} min`} (classe ${sug.classe}; ${sug.ocupacao}). ${sug.aviso ?? ''} ${sug.fonte}.`
          : 'Informe a ocupação para sugerir o TRRF pela altura da edificação.'}
      </Hint>
      <table className="data" data-fogo-grupos>
        <thead>
          <tr><th>Grupo</th><th>TRRF (min)</th><th>Origem</th><th>Revestimento</th><th>Espessura (mm)</th></tr>
        </thead>
        <tbody>
          {grupos.map((g) => {
            const rev = b.fogo?.revestimentos?.[g];
            const t = trrfDoGrupo(b, op, g);
            return (
              <tr key={g}>
                <td className="tl">{nomeGrupo(g)}</td>
                <td className="num">
                  <OptNumCell value={b.fogo?.trrf?.[g]} placeholder={String(t.trrf)} onChange={(v) => (v === undefined ? f({ remover: { trrf: [g] } }) : f({ trrf: { [g]: v } }))} />
                </td>
                <td className="tl small">{ORIGEM[t.origem]}</td>
                <td className="tl">
                  <Select value={(rev?.material ?? '') as Mat} options={MATERIAIS} onChange={(m) => (m === '' ? f({ remover: { revestimentos: [g] } }) : f({ revestimentos: { [g]: { material: m, espessura: rev?.espessura ?? 15 } } }))} />
                </td>
                <td className="num">
                  {rev ? <NumCell label="Espessura do revestimento (mm)" value={rev.espessura} onChange={(v) => f({ revestimentos: { [g]: { material: rev.material, espessura: v } } })} /> : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {erro && <span className="hint bad">{erro}</span>}
      <Hint>
        TRRF em branco usa a sugestão da ocupação ou o padrão das opções de cálculo (60 min). Método tabular da NBR 15200 (edição de 2004, até 120 min) em vigas e lajes; pilares pelo método analítico. O revestimento soma a c1 (e às dimensões de vigas e lajes) pela eficiência do material. TRRF, método dos pilares e μfi padrão ficam em Opções de cálculo.
      </Hint>
    </Group>
  );
}
```

## Rótulos exatos (o fluxo e2e `N2g` depende deles)
Título do grupo `Incêndio` (`Incêndio (ligado)` com a verificação ativa); caixa `Verificar resistência ao fogo (NBR 15200)`; seletor `Ocupação (NBR 14432 / IT)`; campo `Altura da edificação`; botão `Altura pelos pavimentos`; tabela `data-fogo-grupos` com cabeçalho `Grupo | TRRF (min) | Origem | Revestimento | Espessura (mm)`; sugestão em `Hint` começando por `Sugestão: TRRF de`.

## e2e
Fluxo `N2g` no cartão 3 (não escrever aqui).

## Checklist
Nenhuma linha muda só com este cartão.

## Verificação
`npx tsc -b && npx vitest run src/app/design/design.test.ts`
