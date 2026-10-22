# Cartão L1-16 — Dados gerais da obra (corpo reutilizável e janela)

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões 01 e 11.

## Objetivo
Extrair o conteúdo do grupo "Obra" para um componente usado no painel e, ao fim da criação de uma obra, numa janela "Dados gerais da obra". Itens: C1.24, C1.14, K1.9.2.

## Arquivos
1. `src/app/edificio/DadosGerais.tsx` (criar)
Leia antes: `src/app/edificio/Edificio.tsx` (corpo do `<Group title="Obra" …>`, linhas ~60 a 72) e `OpcoesCalculo.tsx` (como chama `useBuilding`).

## Conteúdo
```tsx
// Dados gerais da obra (L1): nome, descrição, cidade, fundação, norma e perfil de padrões. O mesmo corpo serve ao painel e à janela.
import { useBuilding } from './store';
import { Button, Hint, Modal, NumField, Select, Seg, Spacer, TextField } from '../ui';
import { ORIGEM_ROTULO, type BuildingModel, type Norma } from '../../core/building/types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

export function DadosGeraisCorpo({ b }: { b: BuildingModel }) { … }
export function DadosGeraisJanela({ b, onClose }: { b: BuildingModel; onClose(): void }) { … }
```
### `DadosGeraisCorpo`
`const exec = useBuilding((s) => s.exec);` e, em fragmento, na ordem (rótulos exatos; os quatro primeiros e os de norma já existem hoje no painel e os testes de interface os usam, **não renomeie**):
- `<div className="row"><TextField label="Nome da obra" value={b.obra.nome} onChange={(v) => exec('obra.definir', { nome: v })} /></div>`
- `<div className="row"><TextField label="Descrição (linha 1)" … /><TextField label="Descrição (linha 2)" … /></div>`: valores `b.obra.descricao?.[0] ?? ''` e `[1]`; ao mudar uma linha: `exec('obra.definir', { descricao: [l1, l2] })` com a outra linha preservada.
- `<div className="row wrap"><TextField label="Cidade" value={b.obra.cidade ?? ''} onChange={(v) => exec('obra.definir', { cidade: v })} /><NumField label="Fundação abaixo do mais baixo" unit="m" width={150} value={b.obra.profundidadeFundacao} onChange={(v) => exec('obra.definir', { profundidadeFundacao: v })} /></div>`
- `<div className="row wrap">`: `NumField` `fck` unit `MPa` width 92 → `exec('norma.definir', { fck: v })`; `Select` `Aço` (CA-50, CA-60) → `{ aco: v }`; `Select` `CAA` (I a IV, tipo `Norma['caa']`) → `{ caa: v }`.
- `Seg` do perfil: opções `{ v: 'sistema', label: 'Padrão do sistema' }`, `{ v: 'nbr', label: 'Padrão NBR 6118' }`, valor `b.perfilOpcoes ?? 'sistema'`, → `exec('opcoes.definir', { perfil: v })`.
- `Hint`: `Cobrimentos (cm): laje {…} · viga {…} · pilar {…} (NBR 6118, Tabela 7.2).` com `fmt(b.norma.cobrimento.laje, 1)` etc.
- `Hint`: `Origem do lançamento: {ORIGEM_ROTULO[b.obra.origem ?? 'vazio']}.`

### `DadosGeraisJanela`
```tsx
export function DadosGeraisJanela({ b, onClose }: { b: BuildingModel; onClose(): void }) {
  return (
    <Modal titulo="Dados gerais da obra" onClose={onClose}>
      <Hint>Confira as normas e os materiais da obra recém-criada. Tudo continua editável no painel Obra; materiais por elemento ficam no grupo Materiais.</Hint>
      <DadosGeraisCorpo b={b} />
      <div className="row"><Spacer /><Button variant="primary" onClick={onClose}>Concluir</Button></div>
    </Modal>
  );
}
```
O pai (`Edificio.tsx`, cartão 20) passa `b = sessao.modelo`, que ele já obtém de `useBuilding()` sem seletor e por isso se atualiza a cada alteração.

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```
