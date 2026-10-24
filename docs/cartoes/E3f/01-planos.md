# E3f — cartão 1: planos (faixa, Navegador e doca Propriedades)

Executor: Haiku (listas, formulário e janela no padrão dos grupos já aplicados; os dados e o cálculo vêm prontos do núcleo, `src/core/building/planos.ts` e `src/core/commands/planos.ts`). Regras em `00-indice.md`. **Aplicar depois da D6/D7** (o layout novo: faixa com abas, Navegador em árvore e Propriedades em doca). Compila sozinho; independe dos cartões da E3c, E3d e E3e (as âncoras usam só texto estável).

## Onde aparece
- **Faixa de comandos**, aba **Edição**, grupo "Planos" (ao lado do grupo "Lajes"): "Novo plano", "Atribuir plano" e "Retirar plano". "Atribuir plano" age sobre os panos e vigas selecionados na planta e o plano escolhido (Navegador ou grupo Planos); "Retirar plano" volta os selecionados à horizontal.
- **Navegador**: dentro de cada grupo de lajes, o nó "Planos (n)" com um filho por plano do grupo: `<nome> — <i> %` (1 casa, vírgula); clicar escolhe o plano, leva a planta ao pavimento do grupo e abre o grupo "Planos" da doca Propriedades.
- **Propriedades**, grupo "Planos — <grupo> (n)" (abaixo de "Lajes"): "Plano do grupo", nome, cor, definição (três pontos, reta horizontal + inclinação, máxima declividade), pontos (x, y e, em três pontos, z), desnível, inclinação, unidade (% ou graus), a leitura "Inclinação: p % (g°)" com o selo "atribuído" e "Remover plano". Cada alteração chama `plano.editar`.
- **Janela "Novo plano"** com os mesmos campos e o botão "Criar" (`plano.criar`).

## Núcleo usado (já existe)
`coeficientesPlano`, `inclinacaoDoPlano`, `grausDaTangente` e `planoAtribuido` (`planos.ts`); `Plano`/`DefinicaoPlano` (`types.ts`); comandos `plano.criar { grupo, nome?, cor?, tipo, pontos, desnivel?, inclinacao?, unidade? }`, `plano.editar { id, ... }`, `plano.remover { ids }` e `plano.atribuir { plano?, lajes?, vigas? }` (sem `plano`, volta à horizontal; todos com `mcp: false`). Pontos em m; desnível em m relativo ao topo do pavimento; inclinação em % (ou graus, com `unidade`).

## Rótulos
Faixa: "Planos" (grupo), "Novo plano", "Atribuir plano", "Retirar plano". Navegador: "Planos". Doca: "Plano do grupo", "Nome do plano", "Cor do plano", "Definição do plano" (opções "Três pontos", "Reta horizontal + inclinação", "Máxima declividade"), "x1", "y1", "z1", "x2", "y2", "z2", "x3", "y3", "z3", "Desnível do plano", "Inclinação do plano", "Unidade da inclinação", "Remover plano". Janela: "Novo plano", "Criar", "Cancelar". Atributos de teste: `data-grupo-planos`, `data-propriedades-plano`, `data-leitura-plano`, `data-novo-plano`, `data-erros-plano`.

**Arquivo novo** `src/app/edificio/planosUtil.ts`
```ts
// Funções puras da interface dos planos inclinados (frente E3f): rótulo do Navegador, campos de edição e parâmetros dos comandos
// `plano.criar` e `plano.editar`. Sem React; o cálculo é do núcleo (`planos.ts`).
import { coeficientesPlano, inclinacaoDoPlano } from '../../core/building/planos';
import type { DefinicaoPlano, Plano } from '../../core/building/types';

export type TipoDef = DefinicaoPlano['tipo'];
export const TIPOS_DEF: { v: TipoDef; label: string }[] = [
  { v: 'tresPontos', label: 'Três pontos' }, { v: 'retaHorizontal', label: 'Reta horizontal + inclinação' }, { v: 'maximaDeclividade', label: 'Máxima declividade' },
];
export const CORES_PLANO = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => ({ v, label: `Cor ${v + 1}` }));
export const fmtPlano = (x: number, n = 1) => x.toFixed(n).replace('.', ',');

/** Rótulo do nó do Navegador: `<nome> — <inclinação> %` (1 casa, vírgula). */
export function rotuloPlano(pl: Plano): string {
  const c = coeficientesPlano(pl.def);
  return `${pl.nome} — ${fmtPlano(c ? inclinacaoDoPlano(c).percentual : 0)} %`;
}

/** Campos do formulário do plano. `pontos`: três [x, y, desnível] ou dois [x, y] (m); `inclinacao` em `unidade`. */
export interface DadosPlano { nome: string; cor: number; tipo: TipoDef; pontos: number[][]; desnivel: number; inclinacao: number; unidade: '%' | 'graus' }
export const DADOS_PLANO_NOVO: DadosPlano = { nome: '', cor: 0, tipo: 'maximaDeclividade', pontos: [[0, 0], [0, 4]], desnivel: 0, inclinacao: 10, unidade: '%' };

export function dadosDoPlano(pl: Plano): DadosPlano {
  const d = pl.def;
  return d.tipo === 'tresPontos'
    ? { nome: pl.nome, cor: pl.cor ?? 0, tipo: d.tipo, pontos: d.pontos.map((q) => [...q]), desnivel: 0, inclinacao: 0, unidade: '%' }
    : { nome: pl.nome, cor: pl.cor ?? 0, tipo: d.tipo, pontos: d.pontos.map((q) => [...q]), desnivel: d.desnivel, inclinacao: d.inclinacao, unidade: '%' };
}

/** Troca o tipo de definição aproveitando os pontos; de dois para três pontos o terceiro sai perpendicular ao primeiro lado, na mesma cota. */
export function trocaTipoDef(d: DadosPlano, tipo: TipoDef): DadosPlano {
  if (tipo === d.tipo) return d;
  if (tipo === 'tresPontos') {
    const [a, b] = d.pontos;
    return { ...d, tipo, pontos: [[a[0], a[1], d.desnivel], [b[0], b[1], d.desnivel], [a[0] - (b[1] - a[1]), a[1] + (b[0] - a[0]), d.desnivel]] };
  }
  if (d.tipo === 'tresPontos') return { ...d, tipo, pontos: [[d.pontos[0][0], d.pontos[0][1]], [d.pontos[1][0], d.pontos[1][1]]], desnivel: d.pontos[0][2], inclinacao: 0 };
  return { ...d, tipo };
}

/** Parâmetros de `plano.criar` / `plano.editar` (sem `grupo` e `id`) a partir dos campos. */
export function paramsDoPlano(d: DadosPlano): Record<string, unknown> {
  return d.tipo === 'tresPontos'
    ? { tipo: d.tipo, pontos: d.pontos }
    : { tipo: d.tipo, pontos: d.pontos, desnivel: d.desnivel, inclinacao: d.inclinacao, unidade: d.unidade };
}
```

**Arquivo novo** `src/app/edificio/PlanosUI.tsx`
```tsx
// Planos inclinados (frente E3f): lista e propriedades do plano na doca Propriedades, janela "Novo plano" e a ação da faixa. Os planos
// do grupo têm definição por três pontos, por reta horizontal + inclinação ou por máxima declividade; panos e vigas recebem o plano
// por `plano.atribuir`. Comandos: `plano.criar`, `plano.editar`, `plano.remover` e `plano.atribuir`.
import { useState, type ReactNode } from 'react';
import { coeficientesPlano, grausDaTangente, inclinacaoDoPlano, planoAtribuido } from '../../core/building/planos';
import { pavimentosOrdenados, type BuildingModel, type Plano } from '../../core/building/types';
import { Button, Group, Hint, Modal, NumField, Pill, RibbonButton, RibbonGroup, Select, TextField } from '../ui';
import { useStore } from '../store';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { CORES_PLANO, DADOS_PLANO_NOVO, dadosDoPlano, fmtPlano, paramsDoPlano, rotuloPlano, TIPOS_DEF, trocaTipoDef, type DadosPlano } from './planosUtil';

/** Grupo de pavimentos da planta atual. */
export function grupoDaPlanta(b: BuildingModel, pavimento: string | null) {
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pavimento) ?? ps[Math.min(1, ps.length - 1)];
  return b.grupos.find((g) => g.id === pav?.grupo);
}

/** Campos do plano (nome, cor, definição, pontos, desnível e inclinação); cada alteração devolve os dados novos. */
function CamposPlano({ d, onChange }: { d: DadosPlano; onChange: (n: DadosPlano) => void }) {
  const tres = d.tipo === 'tresPontos';
  const ponto = (k: number, i: number, v: number) => onChange({ ...d, pontos: d.pontos.map((q, j) => (j === k ? q.map((x, m) => (m === i ? v : x)) : q)) });
  const unidade = (u: '%' | 'graus') => onChange({ ...d, unidade: u, inclinacao: u === 'graus' ? +grausDaTangente(d.inclinacao / 100).toFixed(4) : +(Math.tan((d.inclinacao * Math.PI) / 180) * 100).toFixed(4) });
  return (
    <>
      <div className="row wrap">
        <TextField label="Nome do plano" value={d.nome} onChange={(x) => onChange({ ...d, nome: x.trim() })} />
        <Select label="Cor do plano" value={d.cor} options={CORES_PLANO} onChange={(v) => onChange({ ...d, cor: v })} />
        <Select label="Definição do plano" value={d.tipo} options={TIPOS_DEF} onChange={(v) => onChange(trocaTipoDef(d, v))} />
      </div>
      <div className="row wrap">
        {d.pontos.map((q, k) => (
          <span key={k} className="row wrap">
            <NumField label={`x${k + 1}`} unit="m" width={90} value={q[0]} onChange={(v) => ponto(k, 0, v)} />
            <NumField label={`y${k + 1}`} unit="m" width={90} value={q[1]} onChange={(v) => ponto(k, 1, v)} />
            {tres && <NumField label={`z${k + 1}`} unit="m" width={90} value={q[2]} onChange={(v) => ponto(k, 2, v)} />}
          </span>
        ))}
      </div>
      {!tres && (
        <div className="row wrap">
          <NumField label="Desnível do plano" unit="m" width={110} value={d.desnivel} onChange={(v) => onChange({ ...d, desnivel: v })} />
          <NumField label="Inclinação do plano" unit={d.unidade === '%' ? '%' : '°'} width={110} value={d.inclinacao} onChange={(v) => onChange({ ...d, inclinacao: v })} />
          <Select label="Unidade da inclinação" value={d.unidade} options={[{ v: '%', label: '%' }, { v: 'graus', label: 'graus' }]} onChange={unidade} />
        </div>
      )}
    </>
  );
}

/** Propriedades do plano selecionado: cada alteração chama `plano.editar`. */
export function PropriedadesPlano({ pl }: { pl: Plano }) {
  const { exec } = useBuilding();
  const b = useBuilding((s) => s.sessao.modelo);
  const [un, setUn] = useState<'%' | 'graus'>('%');
  const base = dadosDoPlano(pl);
  const d: DadosPlano = un === '%' ? base : { ...base, unidade: 'graus', inclinacao: +grausDaTangente(base.inclinacao / 100).toFixed(4) };
  const c = coeficientesPlano(pl.def), inc = c ? inclinacaoDoPlano(c) : null;
  const muda = (n: DadosPlano) => {
    if (n.unidade !== un) { setUn(n.unidade); return; }
    const r = exec('plano.editar', { id: pl.id, nome: n.nome || pl.nome, cor: n.cor, ...paramsDoPlano(n) });
    if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Plano recusado.' });
  };
  return (
    <div data-propriedades-plano={pl.id}>
      <CamposPlano d={d} onChange={muda} />
      <p className="small">
        <span data-leitura-plano>Inclinação: {inc ? `${fmtPlano(inc.percentual)} % (${fmtPlano(inc.graus)}°)` : '—'}</span>
        {planoAtribuido(b, pl.id) && <> <Pill tone="ok">atribuído</Pill></>}
      </p>
      <div className="row wrap"><Button variant="danger" onClick={() => { exec('plano.remover', { ids: [pl.id] }); usePlanta.getState().set({ planoSel: null }); }}>Remover plano</Button></div>
    </div>
  );
}

/** Lista dos planos do grupo (a escolha vale também para a árvore do Navegador) e as propriedades do escolhido. */
export function ListaPlanos({ b, grupo }: { b: BuildingModel; grupo: string }) {
  const pl = usePlanta();
  const planos = (b.planos ?? []).filter((p) => p.grupo === grupo);
  const atual = planos.find((p) => p.id === pl.planoSel);
  if (!planos.length) return <Hint>Sem planos neste grupo. Use “Novo plano” na faixa (aba Edição, grupo Planos) e atribua depois aos panos e vigas selecionados.</Hint>;
  return (
    <>
      <Select label="Plano do grupo" value={atual?.id ?? ''} options={[{ v: '', label: '— escolha —' }, ...planos.map((p) => ({ v: p.id, label: rotuloPlano(p) }))]} onChange={(v) => pl.set({ planoSel: v || null })} />
      {atual && <PropriedadesPlano key={atual.id} pl={atual} />}
    </>
  );
}

/** Grupo "Planos" da doca Propriedades. */
export function PlanosGrupo({ b }: { b: BuildingModel }) {
  const pl = usePlanta();
  const grupo = grupoDaPlanta(b, pl.pavimento);
  const n = (b.planos ?? []).filter((p) => p.grupo === grupo?.id).length;
  return (
    <div data-grupo-planos>
      <Group title={`Planos — ${grupo?.nome ?? '—'} (${n})`} open={false}>
        {grupo && <ListaPlanos b={b} grupo={grupo.id} />}
        <Hint>Fluxo: lance panos e vigas na horizontal, crie o plano e atribua. O plano muda a cota do topo do pano e da viga (z = a·x + b·y + c); desnível e inclinação em relação ao topo do pavimento.</Hint>
      </Group>
    </div>
  );
}

/** Janela "Novo plano". */
export function CriarPlano({ b, grupo, onClose }: { b: BuildingModel; grupo: string; onClose: () => void }) {
  const { exec } = useBuilding();
  const [d, setD] = useState<DadosPlano>({ ...DADOS_PLANO_NOVO, cor: (b.planos ?? []).filter((p) => p.grupo === grupo).length % 8 });
  const [erro, setErro] = useState('');
  const criar = () => {
    const r = exec('plano.criar', { grupo, ...(d.nome.trim() ? { nome: d.nome.trim() } : {}), cor: d.cor, ...paramsDoPlano(d) });
    if (!r.ok) { setErro(r.erros[0]?.mensagem ?? 'Plano recusado.'); return; }
    const novo = useBuilding.getState().sessao.modelo.planos?.filter((p) => p.grupo === grupo).at(-1);
    usePlanta.getState().set({ planoSel: novo?.id ?? null });
    onClose();
  };
  return (
    <Modal titulo="Novo plano" onClose={onClose}>
      <div data-novo-plano>
        <CamposPlano d={d} onChange={setD} />
        {erro && <p className="small bad" role="alert" data-erros-plano>{erro}</p>}
        <div className="row wrap"><Button variant="primary" onClick={criar}>Criar</Button><Button onClick={onClose}>Cancelar</Button></div>
      </div>
    </Modal>
  );
}

/** Monta a janela "Novo plano" quando aberta pela faixa (colocada uma vez no Edifício). */
export function PlanosHost() {
  const b = useBuilding((s) => s.sessao.modelo);
  const aberta = usePlanta((s) => s.novoPlano), pavimento = usePlanta((s) => s.pavimento);
  const grupo = grupoDaPlanta(b, pavimento);
  return aberta && grupo ? <CriarPlano b={b} grupo={grupo.id} onClose={() => usePlanta.getState().set({ novoPlano: false })} /> : null;
}

/** Grupo "Planos" da faixa (aba Edição): novo plano e atribuir ou retirar o plano dos panos e vigas selecionados da planta. */
export function PlanosFaixa({ children }: { children?: ReactNode }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const { exec } = useBuilding();
  const pl = usePlanta();
  const grupo = grupoDaPlanta(b, pl.pavimento);
  const lajes = b.lajes.filter((l) => pl.selecao.has(l.id) && l.grupo === grupo?.id).map((l) => l.id);
  const vigas = b.vigas.filter((v) => pl.selecao.has(v.id) && v.grupo === grupo?.id).map((v) => v.id);
  const plano = (b.planos ?? []).find((p) => p.id === pl.planoSel && p.grupo === grupo?.id);
  const alvo = { ...(lajes.length ? { lajes } : {}), ...(vigas.length ? { vigas } : {}) };
  const roda = (params: Record<string, unknown>) => { const r = exec('plano.atribuir', params); if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Atribuição recusada.' }); };
  return (
    <RibbonGroup label="Planos">
      <RibbonButton icon="laje" label="Novo plano" title="Cria um plano inclinado no grupo da planta atual (três pontos, reta horizontal + inclinação ou máxima declividade)" disabled={!grupo} onClick={() => pl.set({ novoPlano: true })} />
      <RibbonButton icon="zona" label="Atribuir plano" title="Atribui o plano escolhido no Navegador (ou no grupo Planos) aos panos e vigas selecionados na planta" disabled={!plano || !(lajes.length + vigas.length)} onClick={() => plano && roda({ plano: plano.id, ...alvo })} />
      <RibbonButton icon="dobra" label="Retirar plano" title="Volta os panos e vigas selecionados à horizontal" disabled={!(lajes.length + vigas.length)} onClick={() => roda(alvo)} />
      {children}
    </RibbonGroup>
  );
}
```

**Arquivo novo** `src/app/edificio/PlanosUI.test.ts`
```ts
// E3f: funções puras da interface dos planos (rótulo do Navegador, campos e parâmetros dos comandos) contra o núcleo.
import { describe, expect, it } from 'vitest';
import { coeficientesPlano, inclinacaoDoPlano } from '../../core/building/planos';
import type { Plano } from '../../core/building/types';
import { comandosEdificioPadrao, Sessao } from '../../core/commands';
import { DADOS_PLANO_NOVO, dadosDoPlano, paramsDoPlano, rotuloPlano, trocaTipoDef } from './planosUtil';

const novaSessao = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };

describe('E3f: interface dos planos', () => {
  it('rótulo da árvore: nome e inclinação com 1 casa e vírgula', () => {
    const pl: Plano = { id: 'p1', nome: 'Plano 1', grupo: 'g', def: { tipo: 'maximaDeclividade', pontos: [[0, 0], [0, 4.5]], desnivel: 0, inclinacao: 30 } };
    expect(rotuloPlano(pl)).toBe('Plano 1 — 30,0 %');
    expect(rotuloPlano({ ...pl, def: { tipo: 'tresPontos', pontos: [[0, 0, 0], [5, 0, 0], [0, 4, 0.8]] } })).toBe('Plano 1 — 20,0 %');
  });
  it('unidade graus: 45 graus criam um plano de 100 %', () => {
    const s = novaSessao(), g = s.modelo.grupos[0].id;
    const r = s.executar('plano.criar', { grupo: g, ...paramsDoPlano({ ...DADOS_PLANO_NOVO, unidade: 'graus', inclinacao: 45 }) });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    const pl = s.modelo.planos![0];
    expect(inclinacaoDoPlano(coeficientesPlano(pl.def)!).percentual).toBeCloseTo(100, 4);
  });
  it('trocar o tipo de definição aproveita os pontos e gera parâmetros aceitos pelo comando', () => {
    const s = novaSessao(), g = s.modelo.grupos[0].id;
    const tres = trocaTipoDef({ ...DADOS_PLANO_NOVO, desnivel: 0.3 }, 'tresPontos');
    expect(tres.pontos).toEqual([[0, 0, 0.3], [0, 4, 0.3], [-4, 0, 0.3]]);
    expect(s.executar('plano.criar', { grupo: g, ...paramsDoPlano(tres) }).ok).toBe(true);
    const d = dadosDoPlano(s.modelo.planos![0]);
    expect(d.tipo).toBe('tresPontos');
    const volta = trocaTipoDef(d, 'retaHorizontal');
    expect(volta.pontos).toEqual([[0, 0], [0, 4]]);
    expect(volta.desnivel).toBeCloseTo(0.3, 12);
  });
});
```

## Edições

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  camadaPuncao: boolean;
```
por
```text
  camadaPuncao: boolean;
  /** Plano escolhido no Navegador ou no grupo "Planos" (E3f), para "Atribuir plano" (não vai para o arquivo). */
  planoSel: string | null;
  /** Janela "Novo plano" aberta pela faixa (E3f). */
  novoPlano: boolean;
```

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  camadaPuncao: false,
```
por
```text
  camadaPuncao: false,
  planoSel: null,
  novoPlano: false,
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
import { ConsolosHost } from './ConsolosUI';
```
por
```text
import { ConsolosHost } from './ConsolosUI';
import { PlanosGrupo, PlanosHost } from './PlanosUI';
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
      <ConsolosHost />
```
por
```text
      <ConsolosHost />
      <PlanosHost />
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
          <LajesGrupo b={b} />
```
por
```text
          <LajesGrupo b={b} />
          <PlanosGrupo b={b} />
```

**Trocar em** `src/app/edificio/FaixaEdificio.tsx`
```text
import { ROTULO_FERRAMENTA, TECLA_FERRAMENTA } from './Planta';
```
por
```text
import { ROTULO_FERRAMENTA, TECLA_FERRAMENTA } from './Planta';
import { PlanosFaixa } from './PlanosUI';
```

**Trocar em** `src/app/edificio/FaixaEdificio.tsx`
```text
      <RibbonGroup label="Lajes" radios="Ferramenta">
```
por
```text
      <PlanosFaixa />
      <RibbonGroup label="Lajes" radios="Ferramenta">
```

**Trocar em** `src/app/edificio/arvore.ts`
```text
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
```
por
```text
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import { rotuloPlano } from './planosUtil';
```

**Trocar em** `src/app/edificio/arvore.ts`
```text
| 'corte' | 'sondagem';
```
por
```text
| 'corte' | 'sondagem' | 'plano';
```

**Trocar em** `src/app/edificio/arvore.ts`
```text
filhos: doGrupo.map((x) => folha(tipo, 4, x, tipo)) };
```
por
```text
filhos: [...doGrupo.map((x) => folha(tipo, 4, x, tipo)), ...noPlanos(b, raiz, g.id)] };
```

**Trocar em** `src/app/edificio/arvore.ts`
```text
/** Nós de grupo (Tipo, Cobertura…) com as vigas ou lajes de cada um; só grupos que têm elementos. */
```
por
```text
/** Nó "Planos" do grupo (E3f), dentro das lajes: um filho por plano, com a inclinação no rótulo; ausente sem planos. */
function noPlanos(b: BuildingModel, raiz: 'vigas' | 'lajes', grupo: string): NoArvore[] {
  const planos = raiz === 'lajes' ? (b.planos ?? []).filter((p) => p.grupo === grupo) : [];
  return planos.length ? [{ id: `planos:${grupo}`, rotulo: 'Planos', nivel: 4, contagem: planos.length, filhos: planos.map((p) => ({ id: `plano:${p.id}`, rotulo: rotuloPlano(p), nivel: 5, alvo: { tipo: 'plano' as const, id: p.id } })) }] : [];
}

/** Nós de grupo (Tipo, Cobertura…) com as vigas ou lajes de cada um; só grupos que têm elementos. */
```

**Trocar em** `src/app/edificio/Navegador.tsx`
```text
  const pavAtual = usePlanta((s) => s.pavimento);
```
por
```text
  const pavAtual = usePlanta((s) => s.pavimento);
  const planoSel = usePlanta((s) => s.planoSel);
  useEffect(() => {
    if (!planoSel) return;
    const c = caminhoAte(arvore, `plano:${planoSel}`);
    if (c.length) setAbertos((a) => new Set([...a, ...c.slice(0, -1)]));
  }, [planoSel, arvore]);
```

**Trocar em** `src/app/edificio/Navegador.tsx`
```text
    return selecao.has(n.alvo.id);
```
por
```text
    if (n.alvo.tipo === 'plano') return planoSel === n.alvo.id;
    return selecao.has(n.alvo.id);
```

**Trocar em** `src/app/edificio/Navegador.tsx`
```text
    if (a.tipo === 'eixo') {
```
por
```text
    if (a.tipo === 'plano') {
      const plano = (b.planos ?? []).find((x) => x.id === a.id), pav = pavimentosOrdenados(b).find((p) => p.grupo === plano?.grupo);
      P.set({ planoSel: a.id, ...(pav ? { pavimento: pav.id } : {}) });
      abrirGrupo('Planos');
      return;
    }
    if (a.tipo === 'eixo') {
```

## Verificação
`npx tsc -b`; `npx vitest run src/app`. O e2e do fluxo `E3f` (cartão 4) cobre os planos.
