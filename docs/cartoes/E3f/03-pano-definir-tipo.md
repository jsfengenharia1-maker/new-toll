# E3f — cartão 3: seletor único de tipo de pano, pano a definir e cópia do plano

Executor: Haiku (um grupo novo no padrão dos grupos da doca Propriedades e um aviso na janela de cópia de dados; núcleo pronto). Regras em `00-indice.md`. Depois do cartão 1. **Aplicar depois da D6/D7.** Compila sozinho; usa só núcleo (`TIPOS_PANO`, `fichasAlveolaresDisponiveis`, `formasDisponiveis`), por isso funciona com ou sem os cartões da E3c, E3d e E3e.

## Onde aparece
- Doca **Propriedades**, grupo "Tipo de pano (n)" (logo abaixo de "Lajes"; aparece com panos selecionados na planta, na tabela de lajes ou no Navegador): Select "Tipo de pano" com os tipos de `TIPOS_PANO` (Vigotas, Alveolar, Nervurada bidirecional, Maciça, Pano a definir); Radier e Mista aparecem como "(indisponível)" e, ao escolhê-los, a nota do núcleo vira dica sem mudar nada. Trocar de tipo chama `laje.atribuir` com o tipo do lançamento (grupo "Lajes") se for do mesmo tipo, senão com um tipo padrão. "Pano a definir" mostra "Espessura do pano a definir" (m), "Desnível do pano a definir" (m), "Plano do pano a definir" (Horizontal ou um plano do grupo) e o botão "Aplicar", que chama `laje.aDefinir`; a planta passa a mostrar `?` no pano e o cálculo recusa com `DEFINIR_PANO`.
- Janela **Referências e dados** (L4, grupo "Referências e dados" da doca Propriedades): a caixa "Copiar dado: plano de inclinação" já aparece sozinha com os demais campos de `CAMPOS_COPIA_LAJE`; o que falta é o aviso: antes de copiar, a nota lista o `alerta` de cada destino quando os planos diferem (o usuário desmarca a caixa para manter o plano do destino).

## Núcleo usado (já existe)
`TIPOS_PANO` (`planos.ts`: `{ id, rotulo, disponivel, nota? }`), `CAMPOS_COPIA_LAJE.plano` (`pilarDados.ts`: rótulo "Plano de inclinação" e `alerta(de, para)`), comandos `laje.atribuir { ids, tipo }` e `laje.aDefinir { ids, espessura?, nivel?, plano? }` (`mcp: false`). `laje.criar { definir: true }` (abertura → pano a definir) fica sem botão: as aberturas não são selecionáveis na planta; use o comando de linha (nota para a ferramenta de aberturas da L5).

## Rótulos
"Tipo de pano (n)" (grupo), "Tipo de pano", "Espessura do pano a definir", "Desnível do pano a definir", "Plano do pano a definir", "Aplicar"; nota "Atenção: troca de plano". Atributos de teste: `data-grupo-tipo-pano`, `data-tipo-pano`, `data-pano-a-definir`, `data-alerta-plano-copia`.

**Arquivo novo** `src/app/edificio/TipoPano.tsx`
```tsx
// Seletor único de tipo de pano e pano a definir (frente E3f, C7.1, C7.15, C7.16): troca o tipo dos panos selecionados entre vigotas,
// alveolar, nervurada bidirecional e maciça, ou os transforma em pano a definir (espessura, desnível e plano; o cálculo recusa
// panos a definir). Radier e laje mista aparecem indisponíveis, com a nota. Comandos: `laje.atribuir` e `laje.aDefinir`.
import { useState } from 'react';
import { fichasAlveolaresDisponiveis } from '../../core/building/alveolares';
import { formasDisponiveis } from '../../core/building/nervuradas';
import { TIPOS_PANO } from '../../core/building/planos';
import type { BuildingModel, Laje, TipoLaje } from '../../core/building/types';
import { Button, Group, Hint, NumField, Select } from '../ui';
import { useStore } from '../store';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

type TipoPanoId = (typeof TIPOS_PANO)[number]['id'];
const idDoTipo = (l: Laje): TipoPanoId => (l.definir ? 'definir' : l.tipo.tipo === 'macica' ? 'macica' : l.tipo.tipo === 'nervurada' ? 'nervurada' : l.tipo.tipo === 'alveolar' ? 'alveolar' : 'vigotas');

/** Tipo de laje inicial ao escolher o tipo de pano: o do lançamento (grupo "Lajes") se for do mesmo tipo; senão um padrão do tipo. */
function tipoPadrao(b: BuildingModel, id: TipoPanoId, tl: TipoLaje, espessura: number): TipoLaje {
  if (id === 'macica') return tl.tipo === 'macica' ? tl : { tipo: 'macica', h: espessura };
  if (id === 'nervurada') return tl.tipo === 'nervurada' ? tl : { tipo: 'nervurada', forma: formasDisponiveis(b)[0]?.id ?? 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 };
  if (id === 'alveolar') {
    if (tl.tipo === 'alveolar') return tl;
    const f = fichasAlveolaresDisponiveis(b)[0]?.ficha;
    return { tipo: 'alveolar', ficha: f?.id ?? 'ex:alveolar', placa: f?.placas[0]?.id ?? '' };
  }
  return tl.tipo === 'vigotas' || tl.tipo === 'trelicada' || tl.tipo === 'moldada' ? tl : { tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' };
}

function Corpo({ b, ls }: { b: BuildingModel; ls: Laje[] }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const l0 = ls[0], ids = ls.map((l) => l.id);
  const [escolha, setEscolha] = useState<TipoPanoId>(idDoTipo(l0));
  const [dica, setDica] = useState('');
  const [espessura, setEspessura] = useState(l0.espessuraDefinir ?? 0.1);
  const [nivel, setNivel] = useState(l0.nivel ?? 0);
  const [plano, setPlano] = useState(l0.plano ?? '');
  const planos = (b.planos ?? []).filter((p) => p.grupo === l0.grupo);
  const aviso = (r: { ok: boolean; erros: { mensagem: string }[] }) => { if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Recusado.' }); };
  const escolher = (id: TipoPanoId) => {
    const t = TIPOS_PANO.find((x) => x.id === id)!;
    if (!t.disponivel) { setDica(`${t.rotulo}: ${t.nota ?? 'indisponível'}.`); return; }
    setDica(''); setEscolha(id);
    if (id !== 'definir') aviso(exec('laje.atribuir', { ids, tipo: tipoPadrao(b, id, pl.tipoLaje, espessura) }));
  };
  return (
    <div data-tipo-pano>
      <p className="small"><b>{ls.length > 1 ? `${ls.length} panos` : l0.nome}</b></p>
      <div className="row wrap">
        <Select label="Tipo de pano" value={escolha} options={TIPOS_PANO.map((t) => ({ v: t.id, label: t.disponivel ? t.rotulo : `${t.rotulo} (indisponível)` }))} onChange={escolher} />
      </div>
      {dica && <Hint>{dica}</Hint>}
      {escolha === 'definir' && (
        <div className="row wrap" data-pano-a-definir>
          <NumField label="Espessura do pano a definir" unit="m" width={120} value={espessura} onChange={(v) => v >= 0.05 && v <= 1.5 && setEspessura(v)} />
          <NumField label="Desnível do pano a definir" unit="m" width={120} value={nivel} onChange={(v) => v >= -10 && v <= 10 && setNivel(v)} />
          <Select label="Plano do pano a definir" value={plano} options={[{ v: '', label: 'Horizontal' }, ...planos.map((p) => ({ v: p.id, label: p.nome }))]} onChange={setPlano} />
          <Button variant="primary" onClick={() => aviso(exec('laje.aDefinir', { ids, espessura, nivel, ...(plano ? { plano } : {}) }))}>Aplicar</Button>
        </div>
      )}
      <Hint>Pano a definir (?): a espessura passa às vigas chatas do contorno; o cálculo recusa panos a definir (erro DEFINIR_PANO) até atribuir o tipo da laje. Radier fecha com a base elástica das fundações; laje mista (aço) fica fora do escopo.</Hint>
    </div>
  );
}

/** Grupo "Tipo de pano" da doca Propriedades: aparece com panos selecionados. */
export function TipoPanoGrupo({ b }: { b: BuildingModel }) {
  const pl = usePlanta();
  const sel = b.lajes.filter((l) => pl.selecao.has(l.id));
  if (!sel.length) return null;
  return (
    <div data-grupo-tipo-pano>
      <Group title={`Tipo de pano (${sel.length})`} open={false}>
        <Corpo key={sel.map((l) => l.id).join(',')} b={b} ls={sel} />
      </Group>
    </div>
  );
}
```

## Edições

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
import { ConsolosHost } from './ConsolosUI';
```
por
```text
import { ConsolosHost } from './ConsolosUI';
import { TipoPanoGrupo } from './TipoPano';
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
          <LajesGrupo b={b} />
```
por
```text
          <LajesGrupo b={b} />
          <TipoPanoGrupo b={b} />
```

**Trocar em** `src/app/edificio/DadosL4.tsx`
```text
          <Hint>O plano de inclinação entra com a E3f; até lá, copie tipo, direção, desnível, engastes, cobrimento, tabela e armadura base.</Hint>
```
por
```text
          {campos.includes('plano') && (() => {
            const alertas = lajesSel.filter((id) => id !== lajeOrigem.id).flatMap((id) => { const z = b.lajes.find((x) => x.id === id); const t = z ? CAMPOS_COPIA_LAJE.plano.alerta?.(lajeOrigem, z) : null; return t ? [t] : []; });
            return alertas.length > 0 ? <Note data-alerta-plano-copia><b>Atenção: troca de plano.</b> {alertas.map((t, i) => <div key={i}>{t}</div>)}</Note> : null;
          })()}
          <Hint>Copie tipo, direção, desnível, plano de inclinação, engastes, cobrimento, tabela e armadura base entre panos do mesmo grupo (o plano de outro grupo não é copiado).</Hint>
```

## Verificação
`npx tsc -b`; `npx vitest run src/app`. O e2e do fluxo `E3f` (cartão 4) cobre o seletor e o pano a definir.
