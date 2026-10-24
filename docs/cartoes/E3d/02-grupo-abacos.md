# E3d — cartão 2: grupo "Ábacos" na doca Propriedades

Executor: Haiku (grupo no padrão de `NervuradasGrupo`; os dados vêm prontos do núcleo). Regras em `0-leia-primeiro.md`. Depois do cartão 1. **Aplicar depois da D7** (toca `Edificio.tsx`).

## Onde aparece
Doca **Propriedades**, logo abaixo de "Nervuradas bidirecionais" (dentro de `<Propriedades>` em `Edificio.tsx`). O grupo só aparece quando a obra tem laje nervurada bidirecional. Com um pano nervurado selecionado (Navegador, planta ou tabela de lajes): prévia da geração (quantos ábacos e a extensão por face), tabela de ábacos (nome ABn, pilar, h, área, origem), retângulo manual, editor do ábaco escolhido (altura, "simula viga", retângulo, armadura base) e, depois do cálculo, a tabela por nervura (M−, As, reforço, comprimento, V × VRd1). Sem pano selecionado, “Gerar nos pilares selecionados” serve aos pilares selecionados.

## Núcleo usado (já existe)
Comandos `abaco.gerar { lajes?, pilares?, hAbaco?, ... }`, `abaco.criar { laje, poligono, hAbaco? }`, `abaco.editar { id, poligono?, hAbaco?, comoViga? }`, `abaco.remover { ids?, lajes?, automaticos? }` e `abaco.armaduraBase { ids, inf?, sup?, padrao? }`; `gerarAbacos` e `parametrosAbaco` (prévia, não grava), `baseDoAbaco`, `diagnosticosAbacos` (avisos `ABACO_VIGA`, `ABACO_FORA`, `ABACO_ALTURA`), `arranjoDaLaje(...).abacos`, `nomeAbaco` (`sheets/abacoDesenho.ts`) e `abacosNoMemorial` (linhas por nervura, depois do cálculo).

## Rótulos
Grupo "Ábacos (n)"; "Mostrar ábacos na planta", "Altura dos ábacos gerados", "Gerar nos pilares", "Gerar nos pilares selecionados", "Remover os ábacos automáticos", "Dimensão X do ábaco", "Dimensão Y do ábaco", "Centro X do ábaco", "Centro Y do ábaco", "Novo ábaco retangular", "Ábaco da laje", "Altura do ábaco", "Ábaco simula viga (confirmar)", "Aplicar o retângulo ao ábaco", "Remover ábaco", "Base inferior do ábaco (barras)", "φ da base inferior do ábaco", "Base superior do ábaco (barras)", "φ da base superior do ábaco", "Aplicar a armadura base do ábaco", "Armadura base padrão do ábaco". Atributos de teste: `data-grupo-abacos`, `data-previa-abacos` (nº de ábacos da prévia), `data-tabela-abacos`, `data-abaco-editor`, `data-base-abaco`, `data-tabela-abaco-nervuras`, `data-aviso-abaco`.

**Arquivo novo** `src/app/edificio/AbacosUI.tsx`
```tsx
// Grupo "Ábacos" da doca Propriedades (frente E3d): ábacos das lajes nervuradas bidirecionais. Gera nos pilares (parâmetros das
// opções `abaco*`, com prévia por face), cria ábacos retangulares à mão, edita altura, retângulo e armadura base, remove, mostra
// a zona efetiva na planta (camada `camadaAbacos`) e a tabela por nervura depois do cálculo. Comandos: `abaco.gerar`, `abaco.criar`,
// `abaco.editar`, `abaco.remover` e `abaco.armaduraBase`; a matemática vem de src/core/building/abacos*.ts.
import { useState } from 'react';
import { abacosNoMemorial } from '../../core/building/abacosMemorial';
import { baseDoAbaco, diagnosticosAbacos, gerarAbacos, parametrosAbaco } from '../../core/building/abacos';
import { arranjoDaLaje } from '../../core/building/nervuradas';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';
import { nomeAbaco } from '../../core/sheets/abacoDesenho';
import { Button, Check, Group, Hint, NumField, Select } from '../ui';
import { useStore } from '../store';
import { fmt } from './Detalhamento';
import { usePlanta } from './plantaStore';
import { dimAtual, useBuilding } from './store';

const BITOLAS = [6.3, 8, 10, 12.5, 16, 20].map((v) => ({ v, label: `φ${String(v).replace('.', ',')}` }));
const cm = (m: number) => +(m * 100).toFixed(1);
const txtBarras = (x: { n: number; phi: number } | null | undefined) => (x ? `${x.n}φ${String(x.phi).replace('.', ',')}` : 'sem');

export function AbacosGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const dim = useBuilding((s) => (dimAtual(s) ? s.dim : null));
  const pl = usePlanta();
  const nervs = b.lajes.filter((l) => l.tipo.tipo === 'nervurada' && !l.definir);
  const sel = nervs.filter((l) => pl.selecao.has(l.id));
  const l0 = sel[0];
  const pilaresSel = b.pilares.filter((p) => pl.selecao.has(p.id)).map((p) => p.id);
  const [hGer, setHGer] = useState<number | undefined>(undefined);
  const [abId, setAbId] = useState('');
  const [inf, setInf] = useState({ n: 2, phi: 8 });
  const [sup, setSup] = useState({ n: 2, phi: 8 });
  const [ret, setRet] = useState<{ cx?: number; cy?: number; dx: number; dy: number }>({ dx: 1.2, dy: 1.2 });
  if (!nervs.length) return null;
  const roda = (nome: string, params: Record<string, unknown>): boolean => {
    const r = exec(nome, params);
    if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Não foi possível aplicar.' });
    return r.ok;
  };
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const arr = l0 ? arranjoDaLaje(b, l0) : null;
  const efs = arr?.abacos ?? [];
  const ef = efs.find((e) => e.abaco.id === abId) ?? efs[0];
  const centro = l0 ? [l0.contorno.reduce((t, q) => t + q[0], 0) / l0.contorno.length, l0.contorno.reduce((t, q) => t + q[1], 0) / l0.contorno.length] : [0, 0];
  const cx = ret.cx ?? centro[0], cy = ret.cy ?? centro[1];
  const poligono = [[cx - ret.dx / 2, cy - ret.dy / 2], [cx + ret.dx / 2, cy - ret.dy / 2], [cx + ret.dx / 2, cy + ret.dy / 2], [cx - ret.dx / 2, cy + ret.dy / 2]];
  const hLaje = l0 && l0.tipo.tipo === 'nervurada' ? l0.tipo.hTotal : 0.3;
  const previa = l0 ? gerarAbacos(b, l0, parametrosAbaco(op), { hAbaco: hGer !== undefined ? hGer / 100 : undefined }) : null;
  const linha = ef && dim?.nervuradas?.length ? abacosNoMemorial(b, dim, op).find((x) => x.id === ef.abaco.id) : undefined;
  const base = ef && l0 ? baseDoAbaco(b, l0, ef.abaco, op) : null;
  const avisos = diagnosticosAbacos(b).filter((d) => d.elementos.some((id) => id === l0?.id || efs.some((e) => e.abaco.id === id)));
  const gerar = (params: Record<string, unknown>) => { if (roda('abaco.gerar', { ...params, ...(hGer !== undefined ? { hAbaco: hGer / 100 } : {}) })) pl.set({ camadaAbacos: true }); };
  return (
    <div data-grupo-abacos>
      <Group title={`Ábacos (${(b.abacos ?? []).length})`} open={false}>
        <Check label="Mostrar ábacos na planta" checked={pl.camadaAbacos} onChange={(c) => pl.set({ camadaAbacos: c })} />
        <div className="row wrap">
          <NumField label="Altura dos ábacos gerados" unit="cm" width={130} value={hGer ?? cm(hLaje)} onChange={(v) => v > 0 && setHGer(v)} />
          <Button disabled={!l0} onClick={() => gerar({ lajes: sel.map((l) => l.id) })}>Gerar nos pilares</Button>
          <Button disabled={!pilaresSel.length} onClick={() => gerar({ pilares: pilaresSel })}>Gerar nos pilares selecionados</Button>
          <Button variant="danger" disabled={!l0 || !(b.abacos ?? []).some((a) => a.automatico && sel.some((l) => l.id === a.laje))} onClick={() => roda('abaco.remover', { lajes: sel.map((l) => l.id), automaticos: true })}>Remover os ábacos automáticos</Button>
        </div>
        {!l0 && <Hint>Selecione na planta (ou no Navegador) um pano nervurado para ver, gerar e editar os ábacos; ou selecione pilares e use “Gerar nos pilares selecionados”.</Hint>}
        {l0 && previa && (
          <div data-previa-abacos={previa.gerados.length}>
            <p className="small"><b>{l0.nome}</b>: a geração automática dá {previa.gerados.length} ábaco(s) (pilares sem viga encostada; fração {fmt(parametrosAbaco(op).fracao, 3)} da distância entre eixos, cone {fmt(parametrosAbaco(op).cone, 0)}°, limites {fmt(parametrosAbaco(op).limMin)} a {fmt(parametrosAbaco(op).limMax)} m).</p>
            {previa.gerados.length > 0 && <ul className="revmsg">{previa.gerados.map((g) => <li key={g.pilar.id}>{g.pilar.nome}: {g.gerado.faces.map((f) => `${f.lado} ${fmt(f.extensao * 100, 0)} cm${f.origem === 'cone' ? ' (cone)' : f.origem === 'oposto' ? ' (oposto)' : ' (mínimo)'}${f.limitado ? ` limitado ao ${f.limitado === 'min' ? 'mínimo' : 'máximo'}` : ''}`).join('; ')}</li>)}</ul>}
            {previa.avisos.length > 0 && <p className="hint">{previa.avisos.join(' ')}</p>}
          </div>
        )}
        {l0 && (
          <>
            <div className="tablewrap">
              <table className="data quadro" data-tabela-abacos={efs.length}>
                <thead><tr><th>Ábaco</th><th>Pilar</th><th>h (cm)</th><th>Área (m²)</th><th>Origem</th></tr></thead>
                <tbody>
                  {efs.length === 0 && <tr><td className="tl" colSpan={5}>Nenhum ábaco nesta laje.</td></tr>}
                  {efs.map((e) => (
                    <tr key={e.abaco.id} data-abaco={e.abaco.id}>
                      <td className="tl">{nomeAbaco(efs, e.abaco.id)}</td>
                      <td className="tl">{b.pilares.find((p) => p.id === e.abaco.pilar)?.nome ?? '—'}</td>
                      <td className="num">{fmt(e.abaco.hAbaco * 100, 0)}</td>
                      <td className="num">{fmt(e.area)}</td>
                      <td className="tl">{e.abaco.automatico ? 'automático' : 'manual'}{e.abaco.comoViga ? ' · como viga' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row wrap">
              <NumField label="Dimensão X do ábaco" unit="m" width={120} value={ret.dx} onChange={(v) => v > 0 && setRet({ ...ret, dx: v })} />
              <NumField label="Dimensão Y do ábaco" unit="m" width={120} value={ret.dy} onChange={(v) => v > 0 && setRet({ ...ret, dy: v })} />
              <NumField label="Centro X do ábaco" unit="m" width={120} value={+cx.toFixed(3)} onChange={(v) => setRet({ ...ret, cx: v })} />
              <NumField label="Centro Y do ábaco" unit="m" width={120} value={+cy.toFixed(3)} onChange={(v) => setRet({ ...ret, cy: v })} />
              <Button onClick={() => { if (roda('abaco.criar', { laje: l0.id, poligono, ...(hGer !== undefined ? { hAbaco: hGer / 100 } : {}) })) pl.set({ camadaAbacos: true }); }}>Novo ábaco retangular</Button>
            </div>
            {ef && (
              <div data-abaco-editor={ef.abaco.id}>
                <div className="row wrap">
                  <Select label="Ábaco da laje" value={ef.abaco.id} options={efs.map((e) => ({ v: e.abaco.id, label: nomeAbaco(efs, e.abaco.id) }))} onChange={setAbId} />
                  <NumField label="Altura do ábaco" unit="cm" width={110} value={cm(ef.abaco.hAbaco)} onChange={(v) => v > 0 && roda('abaco.editar', { id: ef.abaco.id, hAbaco: v / 100 })} />
                  <Check label="Ábaco simula viga (confirmar)" checked={!!ef.abaco.comoViga} onChange={(c) => roda('abaco.editar', { id: ef.abaco.id, comoViga: c })} />
                  <Button onClick={() => roda('abaco.editar', { id: ef.abaco.id, poligono })}>Aplicar o retângulo ao ábaco</Button>
                  <Button variant="danger" onClick={() => { roda('abaco.remover', { ids: [ef.abaco.id] }); setAbId(''); }}>Remover ábaco</Button>
                </div>
                <div className="row wrap">
                  <NumField label="Base inferior do ábaco (barras)" width={130} value={inf.n} onChange={(v) => setInf({ ...inf, n: Math.max(1, Math.min(6, Math.round(v))) })} />
                  <Select label="φ da base inferior do ábaco" value={inf.phi} options={BITOLAS} onChange={(v) => setInf({ ...inf, phi: v })} />
                  <NumField label="Base superior do ábaco (barras)" width={130} value={sup.n} onChange={(v) => setSup({ ...sup, n: Math.max(1, Math.min(6, Math.round(v))) })} />
                  <Select label="φ da base superior do ábaco" value={sup.phi} options={BITOLAS} onChange={(v) => setSup({ ...sup, phi: v })} />
                  <Button onClick={() => roda('abaco.armaduraBase', { ids: [ef.abaco.id], inf, sup })}>Aplicar a armadura base do ábaco</Button>
                  <Button onClick={() => roda('abaco.armaduraBase', { ids: [ef.abaco.id], padrao: true })}>Armadura base padrão do ábaco</Button>
                </div>
                {base && <p className="small" data-base-abaco>Base de {nomeAbaco(efs, ef.abaco.id)}: inferior {txtBarras(base.inf)}, superior {txtBarras(base.sup)}{base.padrao ? ' (padrão)' : ''}, em cada vão entre eixos de nervuras.</p>}
                {linha && linha.nervuras.length > 0 && (
                  <div className="tablewrap">
                    <table className="data quadro" data-tabela-abaco-nervuras={linha.nervuras.length}>
                      <thead><tr><th>Nervura</th><th>Trecho (m)</th><th>M− (kN·m)</th><th>As nec. (cm²)</th><th>As base (cm²)</th><th>Reforço</th><th>C (m)</th><th>V / VRd1 (kN)</th></tr></thead>
                      <tbody>{linha.nervuras.map((n, i) => <tr key={i}><td className="tl">{n.nervura}</td><td className="num">{fmt(n.trecho[0])} a {fmt(n.trecho[1])}</td><td className="num">{fmt(n.Mneg)}</td><td className="num">{fmt(n.AsNec)}</td><td className="num">{fmt(n.AsBase)}</td><td className="tl">{n.reforco}</td><td className="num">{fmt(n.comprimento)}</td><td className="num">{fmt(n.cortante.V, 1)} / {fmt(n.cortante.VRd1, 1)}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
                {!linha && <Hint>Calcule e dimensione a obra para ver, por nervura, o momento negativo, o reforço, o comprimento e o cortante no ábaco.</Hint>}
              </div>
            )}
            {avisos.map((d, i) => <p key={i} className={`hint${d.severidade === 'erro' ? ' bad' : ''}`} data-aviso-abaco={d.codigo}>{d.mensagem}</p>)}
          </>
        )}
        <Hint>O ábaco é zona maciça (cubetas retiradas, ajustada às nervuras inteiras) com a altura total do ábaco, que pode descer abaixo da laje. As opções <i>abaco*</i> (Opções de cálculo) só valem na geração: o polígono gravado não muda sozinho; use “Gerar nos pilares” de novo para refazer (a armadura base por pilar é mantida). A rigidez do rebaixo entra na grelha; flecha e γz usam essa grelha (sem Branson por nervura). Fonte e interpretações a confirmar: docs/pendencias-usuario.md.</Hint>
      </Group>
    </div>
  );
}
```

## Edições em `src/app/edificio/Edificio.tsx`

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
import { NervuradasGrupo } from './NervuradasUI';
```
por
```text
import { NervuradasGrupo } from './NervuradasUI';
import { AbacosGrupo } from './AbacosUI';
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
          <NervuradasGrupo b={b} />
```
por
```text
          <NervuradasGrupo b={b} />
          <AbacosGrupo b={b} />
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3d` (cartão 5) cobre o grupo.
