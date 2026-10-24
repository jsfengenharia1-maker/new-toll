# E3c — cartão 3: grupo "Nervuradas bidirecionais" na doca Propriedades

Executor: Haiku (grupo e janela no padrão de `VigotasPano` e de `RelatorioVigota`; os dados vêm prontos do núcleo). Regras em `0-leia-primeiro.md`. Depois do cartão 2. **Aplicar depois da D7** (toca `Edificio.tsx`).

## Onde aparece
Doca **Propriedades**, logo abaixo do grupo "Lajes" (dentro de `<Propriedades>` em `Edificio.tsx`). O grupo só aparece quando a obra tem lajes nervuradas bidirecionais; os ajustes valem para os panos selecionados na planta (ou na tabela de lajes). A janela "Nervuras da laje L1" é um `Modal`.

## Núcleo usado (já existe)
Comandos `laje.nervurada { ids, passagem?, limparPassagem?, limparZonas?, ... }`, `laje.copiarPanos { de, para, incluirBase? }` e `laje.armaduraBase { ids, inf?, sup?, nervuras?: [{ dir, inf?, sup?, considerar?, remover? }], detalhada?, detalhadaPadrao?, remover? }`; campos `Laje.pontoNervuras`, `Laje.zonasMacicas` e `Laje.baseNervurada`; `nervuradasNoMemorial(b, dim.nervuradas, opcoes)` (`nervuradasDim.ts`), `Mensagens` (`Revisao.tsx`), `Modal` (`ui`) e o estado `camadaNervuras` do cartão 2.

## Rótulos
Grupo "Nervuradas bidirecionais (n)"; "Mostrar nervuras e cubetas na planta", "Ponto de passagem das nervuras X", "Ponto de passagem das nervuras Y", "Aplicar o ponto de passagem", "Voltar ao ponto de inserção", "Limpar as zonas maciças manuais", "Copiar também a armadura base", "Copiar para os demais panos nervurados do grupo", "Nervuras da laje" (botão e janela "Nervuras da laje L1"), "Base inferior das nervuras X (barras)", "φ da base das nervuras X", "Considerar a base das nervuras X no dimensionamento" (e os de Y), "Base das nervuras detalhada (desenhada e medida)", "Aplicar a base das nervuras", "φ da malha base da mesa", "Espaçamento da malha base da mesa", "Aplicar a malha base da mesa", "Remover a armadura base". Atributos de teste: `data-grupo-nervuradas`, `data-base-nervuradas`, `data-nervuras-laje`, `data-tabela-nervuras`, `data-grupo-nervuras`.

**Arquivo novo** `src/app/edificio/NervuradasUI.tsx`
```tsx
// Grupo "Nervuradas bidirecionais" da barra lateral (frente E3c): camada "Nervuras e cubetas" da planta, ponto de passagem das
// nervuras, zonas maciças, cópia entre panos do grupo, armadura base (malha da mesa e barras nas nervuras, por direção) e a
// janela "Nervuras da laje" com a tabela por grupo de nervuras (reforço, base, cortante) e os avisos. Comandos: `laje.nervurada`,
// `laje.copiarPanos` e `laje.armaduraBase`.
import { useState } from 'react';
import { nervuradasNoMemorial } from '../../core/building/nervuradasDim';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel, Laje } from '../../core/building/types';
import { Button, Check, Group, Hint, Modal, NumField, Select } from '../ui';
import { Mensagens } from './Revisao';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

const f2 = (x: number, n = 2) => String(+x.toFixed(n)).replace('.', ',');
const BITOLAS = [6.3, 8, 10, 12.5, 16, 20, 25].map((v) => ({ v, label: `φ${String(v).replace('.', ',')}` }));

/** Janela com a tabela por grupo de nervuras da laje (esforços por nervura, armaduras, cortante) e as mensagens. */
function NervurasDaLaje({ b, l, onClose }: { b: BuildingModel; l: Laje; onClose: () => void }) {
  const dim = useBuilding((s) => s.dim);
  const r = dim?.nervuradas?.find((x) => x.laje === l.id);
  const linha = r ? nervuradasNoMemorial(b, [r], opcoesEmUso(b.opcoes, perfilDe(b)))[0] : undefined;
  return (
    <Modal titulo={`Nervuras da laje ${l.nome}`} onClose={onClose} larga>
      {!linha ? <p className="muted">Sem resultado para esta laje: calcule e dimensione o edifício (aba Dimensionamento).</p> : (
        <div data-nervuras-laje={l.id}>
          <p className="small">{linha.forma.nome} ({linha.forma.tipo}) · h {f2(linha.geometria.h * 100, 0)} cm · mesa {f2(linha.geometria.capa * 100, 0)} cm · intereixo {f2(linha.geometria.intereixo[0] * 100, 0)} × {f2(linha.geometria.intereixo[1] * 100, 0)} cm · peso médio {f2(linha.peso.medio)} kN/m² · {linha.peso.cubetas} cubetas.</p>
          <p className="small">Cisalhamento: {linha.verificacoes.regime[0]} (X) e {linha.verificacoes.regime[1]} (Y). Mesa mínima {f2(linha.verificacoes.capaMin * 100, 1)} cm.{linha.mesa.exigida ? ` Flexão da mesa: Md ${f2(linha.mesa.Md)} kN·m/m, As ${f2(linha.mesa.AsNec)} cm²/m.` : ''}</p>
          <table className="data quadro" data-tabela-nervuras>
            <thead><tr><th>Grupo</th><th>Nervuras</th><th>L (m)</th><th>M+ (kN·m)</th><th>M− início / fim</th><th>V máx (kN)</th><th>Inferior</th><th>Superior (início / fim)</th><th>Estribos</th></tr></thead>
            <tbody>
              {linha.grupos.map((g) => (
                <tr key={g.nome} data-grupo-nervuras={g.nome}>
                  <td className="l">{g.nome}</td><td className="l">{g.nervuras}</td><td>{f2(g.L)}</td><td>{f2(g.mPos)}</td><td>{f2(g.mNeg[0])} / {f2(g.mNeg[1])}</td><td>{f2(g.Vmax)}</td>
                  <td className="l">{g.inf}</td><td className="l">{g.sup}</td><td className="l">{g.estribo}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">Base das nervuras: {linha.base.nervuras.join('; ')}. Base da mesa: {linha.base.mesa}.</p>
          <Mensagens msgs={linha.mensagens} />
        </div>
      )}
    </Modal>
  );
}

/** Armadura base: malha da mesa (φ e espaçamento, as duas direções) e barras corridas nas nervuras de cada direção. */
function BaseNervuras({ ls }: { ls: Laje[] }) {
  const { exec } = useBuilding();
  const l0 = ls[0], ids = ls.map((l) => l.id), bn = l0.baseNervurada;
  const [inf, setInf] = useState<[{ n: number; phi: number }, { n: number; phi: number }]>([bn?.nervuras?.[0]?.inf ?? { n: 2, phi: 8 }, bn?.nervuras?.[1]?.inf ?? { n: 2, phi: 8 }]);
  const [cons, setCons] = useState<[boolean, boolean]>([!!bn?.nervuras?.[0]?.considerar, !!bn?.nervuras?.[1]?.considerar]);
  const [det, setDet] = useState(!!bn?.detalhada);
  const [mesa, setMesa] = useState<{ phi: number; s: number }>(bn?.mesa?.inf?.barras?.[0] ?? { phi: 6.3, s: 20 });
  const aplicarNervuras = () => exec('laje.armaduraBase', { ids, detalhada: det, nervuras: ([0, 1] as const).map((dir) => ({ dir, ...(inf[dir].n > 0 ? { inf: inf[dir] } : {}), considerar: cons[dir] })) });
  const aplicarMesa = () => exec('laje.armaduraBase', { ids, inf: { barras: [{ dir: 0, phi: mesa.phi, s: mesa.s }, { dir: 1, phi: mesa.phi, s: mesa.s }] } });
  return (
    <div data-base-nervuradas>
      <p className="small"><b>Armadura base</b> — {ls.length > 1 ? `${ls.length} lajes` : l0.nome}</p>
      <div className="row wrap">
        {([0, 1] as const).map((d) => (
          <span key={d} className="row wrap">
            <NumField label={`Base inferior das nervuras ${d === 0 ? 'X' : 'Y'} (barras)`} width={130} value={inf[d].n} onChange={(v) => setInf((p) => (d === 0 ? [{ ...p[0], n: Math.max(0, Math.round(v)) }, p[1]] : [p[0], { ...p[1], n: Math.max(0, Math.round(v)) }]))} />
            <Select label={`φ da base das nervuras ${d === 0 ? 'X' : 'Y'}`} value={inf[d].phi} options={BITOLAS} onChange={(v) => setInf((p) => (d === 0 ? [{ ...p[0], phi: v }, p[1]] : [p[0], { ...p[1], phi: v }]))} />
            <Check label={`Considerar a base das nervuras ${d === 0 ? 'X' : 'Y'} no dimensionamento`} checked={cons[d]} onChange={(c) => setCons((p) => (d === 0 ? [c, p[1]] : [p[0], c]))} />
          </span>
        ))}
        <Check label="Base das nervuras detalhada (desenhada e medida)" checked={det} onChange={setDet} />
        <Button onClick={aplicarNervuras}>Aplicar a base das nervuras</Button>
      </div>
      <div className="row wrap">
        <Select label="φ da malha base da mesa" value={mesa.phi} options={BITOLAS} onChange={(v) => setMesa({ ...mesa, phi: v })} />
        <NumField label="Espaçamento da malha base da mesa" unit="cm" width={110} value={mesa.s} onChange={(v) => v >= 5 && v <= 33 && setMesa({ ...mesa, s: v })} />
        <Button onClick={aplicarMesa}>Aplicar a malha base da mesa</Button>
        <Button variant="danger" disabled={!bn} onClick={() => exec('laje.armaduraBase', { ids, nervuras: [{ dir: 0, remover: true }, { dir: 1, remover: true }], remover: ['inf', 'sup'], detalhadaPadrao: true })}>Remover a armadura base</Button>
      </div>
      <Hint>A base das nervuras só entra no dimensionamento quando marcada (por direção). Detalhada, é desenhada e medida; senão aparece só como descrição geral na listagem. A malha da mesa é descrita e desenhada, sem entrar no dimensionamento da mesa.</Hint>
    </div>
  );
}

export function NervuradasGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const nervs = b.lajes.filter((l) => l.tipo.tipo === 'nervurada');
  const sel = nervs.filter((l) => pl.selecao.has(l.id));
  const l0 = sel[0];
  const [janela, setJanela] = useState<string | null>(null);
  const [px, setPx] = useState<number | undefined>(undefined);
  const [py, setPy] = useState<number | undefined>(undefined);
  const [comBase, setComBase] = useState(false);
  if (!nervs.length) return null;
  const ref = l0 ? l0.pontoNervuras ?? (l0.contorno[l0.insercao ?? 0] as [number, number]) : [0, 0];
  const outros = l0 ? nervs.filter((l) => l.grupo === l0.grupo && l.id !== l0.id) : [];
  return (
    <div data-grupo-nervuradas>
      <Group title={`Nervuradas bidirecionais (${nervs.length})`} open={false}>
        <Check label="Mostrar nervuras e cubetas na planta" checked={pl.camadaNervuras} onChange={(c) => pl.set({ camadaNervuras: c })} />
        {!l0 && <Hint>Selecione na planta um ou mais panos nervurados para ajustar o ponto de passagem das nervuras, as zonas maciças, a cópia entre panos e a armadura base.</Hint>}
        {l0 && (<>
          <p className="small"><b>{sel.length > 1 ? `${sel.length} panos nervurados` : l0.nome}</b></p>
          <div className="row wrap">
            <NumField label="Ponto de passagem das nervuras X" unit="m" width={130} value={+(px ?? ref[0]).toFixed(3)} onChange={setPx} />
            <NumField label="Ponto de passagem das nervuras Y" unit="m" width={130} value={+(py ?? ref[1]).toFixed(3)} onChange={setPy} />
            <Button onClick={() => exec('laje.nervurada', { ids: sel.map((l) => l.id), passagem: [px ?? ref[0], py ?? ref[1]] })}>Aplicar o ponto de passagem</Button>
            <Button disabled={!sel.some((l) => l.pontoNervuras)} onClick={() => exec('laje.nervurada', { ids: sel.map((l) => l.id), limparPassagem: true })}>Voltar ao ponto de inserção</Button>
            <Button disabled={!sel.some((l) => l.zonasMacicas?.length)} onClick={() => exec('laje.nervurada', { ids: sel.map((l) => l.id), limparZonas: true })}>Limpar as zonas maciças manuais</Button>
          </div>
          {sel.length === 1 && (
            <div className="row wrap">
              <Check label="Copiar também a armadura base" checked={comBase} onChange={setComBase} />
              <Button disabled={!outros.length} onClick={() => exec('laje.copiarPanos', { de: l0.id, para: outros.map((l) => l.id), incluirBase: comBase })}>Copiar para os demais panos nervurados do grupo</Button>
              <Button onClick={() => setJanela(l0.id)}>Nervuras da laje</Button>
            </div>
          )}
          <BaseNervuras key={sel.map((l) => l.id).join(',')} ls={sel} />
        </>)}
        {janela && nervs.find((l) => l.id === janela) && <NervurasDaLaje b={b} l={nervs.find((l) => l.id === janela)!} onClose={() => setJanela(null)} />}
        <Hint>O arranjo das nervuras passa pelo ponto de passagem (senão, pelo ponto de inserção do pano) e só admite cubetas inteiras: o resto, junto às vigas, fica maciço. Direção e engaste das bordas: tabela de lajes e grupo “Vínculos, flambagem e cobrimento”.</Hint>
      </Group>
    </div>
  );
}
```

## Edições em `src/app/edificio/Edificio.tsx`

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
import { VinculosGrupo } from './Vinculos';
```
por
```text
import { NervuradasGrupo } from './NervuradasUI';
import { VinculosGrupo } from './Vinculos';
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
          <LajesGrupo b={b} />
```
por
```text
          <LajesGrupo b={b} />
          <NervuradasGrupo b={b} />
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3c` (cartão 4) cobre o grupo e a janela.
