// Paredes de concreto (E1c): grupo da barra lateral com lançamento por formulário (traçar na planta, máscara), lista,
// aberturas, empuxo, prolongamento e atribuição. Os dados e as regras estão em core/building (paredes, paredesBase)
// e os comandos são parede.* (ver core/commands/paredes.ts).
import { useState } from 'react';
import { Button, Check, Group, Hint, NumField, OptNumField, Pill, Select, Seg } from '../ui';
import { niveisDaParede } from '../../core/building/paredesBase';
import type { EsforcosLado, Resultante } from '../../core/building/pilarParedeEsforcos';
import { casosParaCarga, pavimentosOrdenados, type BuildingModel, type Parede } from '../../core/building/types';
import { useBuilding } from './store';
import { linhasParedes } from './paredesLista';
import { ArmaduraDaParede } from './ArmaduraParedeUI';
import { AberturasArmadura } from './AberturasArmaduraUI';
import { IsovaloresParede } from './IsovaloresParede';
import { resumoCartao } from '../../core/building/paredesLista';
import { AlvenariaDaParede } from './ArmaduraAlvenariaUI';
import { larguraDoMaterialCm, resumoCartaoAlv, rotuloTipoParede, tiposDoTipoParede } from '../../core/building/alvenariaLista';

export { aberturasNaPlanta, linhasParedes } from './paredesLista';
import { usePlanta } from './plantaStore';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const m2cm = (v: number) => +(v * 100).toFixed(2);
const cm2m = (v: number) => +(v / 100).toFixed(4);
const GRANDEZAS: { k: keyof Resultante; rot: string; un: string }[] = [
  { k: 'N', rot: 'N', un: 'kN' }, { k: 'Vp', rot: 'V no plano', un: 'kN' }, { k: 'Mp', rot: 'M no plano', un: 'kN·m' }, { k: 'Vo', rot: 'V fora', un: 'kN' }, { k: 'Mo', rot: 'M fora', un: 'kN·m' },
];

/** Grupo "Paredes" da barra lateral: lançamento (planta ou máscara), lista e editor da parede selecionada. */
export function ParedesGrupo({ b, onPlanta }: { b: BuildingModel; onPlanta?: () => void }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const ws = b.paredes ?? [], ps = pavimentosOrdenados(b);
  const ultimo = ps.at(-1)?.id ?? '';
  const [esp, setEsp] = useState(20);
  const [nasce, setNasce] = useState('fundacao');
  const [morre, setMorre] = useState('');
  const [vinc, setVinc] = useState<'engaste' | 'rotula'>('engaste');
  const [tipoP, setTipoP] = useState<'concreto' | 'alvenaria' | 'blocos'>('concreto');
  const [mat, setMat] = useState('');
  const tiposMat = tipoP === 'concreto' ? [] : tiposDoTipoParede(b, tipoP);
  const matEf = tiposMat.some((t) => t.id === mat) ? mat : tiposMat[0]?.id ?? '';
  const morreEf = morre && ps.some((p) => p.id === morre) ? morre : ultimo;
  const nasceOpcoes = [{ v: 'fundacao', label: 'fundação' }, ...ps.slice(0, -1).map((p) => ({ v: p.id, label: p.nome }))];
  const grupoAtivo = ps.find((p) => p.id === pl.pavimento)?.grupo ?? ps[0]?.grupo ?? '';
  const mascaras = (b.mascaras ?? []).filter((m) => m.grupo === grupoAtivo);
  const camadas = mascaras.flatMap((m) => m.camadas.map((c) => c.nome));
  const [camada, setCamada] = useState('');
  const camadaEf = camada && camadas.includes(camada) ? camada : camadas[0] ?? '';
  const sel = ws.find((w) => pl.selecao.has(w.id));
  const nomePav = (id: string) => (id === 'fundacao' ? 'fundação' : ps.find((p) => p.id === id)?.nome ?? id);
  return (
    <Group title={`Paredes (${ws.length})`} open={ws.length > 0}>
      <div className="row wrap" data-pw-lancar>
        <NumField label="Espessura" unit="cm" width={90} value={esp} onChange={setEsp} />
        <Select label="Nasce em" value={nasce} options={nasceOpcoes} onChange={setNasce} />
        <Select label="Morre em" value={morreEf} options={ps.map((p) => ({ v: p.id, label: p.nome }))} onChange={setMorre} />
        <Select label="Base" value={vinc} options={[{ v: 'engaste', label: 'engastada' }, { v: 'rotula', label: 'rotulada' }]} onChange={setVinc} />
        <Select label="Tipo de parede" value={tipoP} options={[{ v: 'concreto', label: 'concreto' }, { v: 'alvenaria', label: 'alvenaria genérica' }, { v: 'blocos', label: 'blocos de concreto' }]} onChange={setTipoP} />
        {tipoP !== 'concreto' && (
          <Select label="Material da parede" value={matEf} options={tiposMat.length ? tiposMat.map((t) => ({ v: t.id, label: t.nome })) : [{ v: '', label: '(crie em Alvenaria estrutural)' }]} onChange={(v) => { setMat(v); const c = larguraDoMaterialCm(b, v); if (c !== undefined) setEsp(c); }} />
        )}
        <Button disabled={tipoP !== 'concreto' && !matEf} onClick={() => { usePlanta.getState().set({ ferramenta: 'parede', pwParams: { espessura: cm2m(esp), nasce, morre: morreEf, vinculoBase: vinc, ...(tipoP !== 'concreto' ? { tipo: tipoP, material: matEf } : {}) } }); onPlanta?.(); }}>Traçar na planta</Button>
      </div>
      <div className="row wrap">
        <Select label="Camada da máscara" value={camadaEf} options={camadas.map((c) => ({ v: c, label: c }))} onChange={setCamada} />
        <Button disabled={!camadaEf || (tipoP !== 'concreto' && !matEf)} onClick={() => exec('parede.daMascara', { grupo: grupoAtivo, camada: camadaEf, nasce, morre: morreEf, ...(tipoP !== 'concreto' ? { tipo: tipoP, material: matEf } : {}) })}>Gerar da máscara</Button>
      </div>
      {ws.length > 0 && (
        <table className="data quadro" data-pw-lista>
          <thead><tr><th>Parede</th><th>Tipo</th><th>Trechos</th><th>Comprimento (m)</th><th>e (cm)</th><th>Nasce</th><th>Morre</th><th>Aberturas</th><th>Empuxo</th><th /></tr></thead>
          <tbody>
            {linhasParedes(b).map((l) => {
              const w = ws.find((q) => q.id === l.id)!;
              return (
                <tr key={l.id} data-id={l.id} aria-selected={pl.selecao.has(l.id)}>
                  <td className="tl"><b>{l.nome}</b></td>
                  <td className="tl">{rotuloTipoParede(b, w)}</td>
                  <td className="num">{l.trechos}</td>
                  <td className="num">{fmt(l.comprimento)}</td>
                  <td className="num">{fmt(l.e, 0)}</td>
                  <td className="tl">{nomePav(w.nasce)}</td>
                  <td className="tl">{nomePav(w.morre)}</td>
                  <td className="num">{l.nAberturas}</td>
                  <td className="tl">{l.empuxo ? 'sim' : '—'}</td>
                  <td>
                    <Button variant="ghost" aria-label={`Selecionar ${l.nome}`} onClick={() => { pl.set({ selecao: new Set([l.id]), foco: { id: l.id, n: (pl.foco?.n ?? 0) + 1 } }); onPlanta?.(); }}>ir</Button>
                    <Button variant="ghost" aria-label={`Remover ${l.nome}`} onClick={() => exec('parede.remover', { ids: [l.id] })}>×</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {sel && <EditorParede b={b} w={sel} />}
      <Hint>Polilinha do eixo; espessura à esquerda e à direita do eixo (a → z). Trecho com comprimento ≥ 5 × a espessura vai em casca; o mais curto, em barra. Aberturas: lance no pavimento de baixo dos dois entre os quais ficam. Premissas e1c-* a confirmar.</Hint>
    </Group>
  );
}

/** Editor da parede selecionada: espessuras, armação, aberturas, empuxo, prolongamento e atribuição. */
function EditorParede({ b, w }: { b: BuildingModel; w: Parede }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const ws = b.paredes ?? [], ps = pavimentosOrdenados(b);
  const nomePav = (id: string) => (id === 'fundacao' ? 'fundação' : ps.find((p) => p.id === id)?.nome ?? id);
  const niveis = niveisDaParede(b, w);
  const opcoesPav = [...(w.nasce === 'fundacao' ? [{ v: 'fundacao', label: 'fundação' }] : []), ...niveis.bases.filter((id) => id !== 'fundacao').map((id) => ({ v: id, label: nomePav(id) }))];
  const casos = b.casos?.filter((c) => c.natureza === 'H' && c.empuxo) ?? [];
  const todosCasos = casosParaCarga(b);
  const [ab, setAb] = useState({ tipo: 'porta' as 'porta' | 'janela', s: 0, largura: 90, peitoril: 0, altura: 210, pavimento: '' });
  const [emp, setEmp] = useState({ caso: '', lado: 'dir' as 'esq' | 'dir', cota: undefined as number | undefined, liquido: false, cotaLiq: 0 });
  const [ext, setExt] = useState<'ini' | 'fim'>('ini');
  const [alvo, setAlvo] = useState('');
  const [de, setDe] = useState('');
  const outras = ws.filter((q) => q.id !== w.id);
  const selecionadas = ws.filter((q) => pl.selecao.has(q.id));
  const casoEf = emp.caso || (emp.liquido ? todosCasos[0]?.id : casos[0]?.id) || '';
  const pavEf = ab.pavimento && opcoesPav.some((o) => o.v === ab.pavimento) ? ab.pavimento : opcoesPav[0]?.v ?? '';
  return (
    <div data-pw-editor>
      <h4>Parede {w.nome}</h4>
      <div className="row wrap" data-pw-tipo>
        <Select label="Tipo desta parede" value={w.tipo ?? 'concreto'} options={[{ v: 'concreto', label: 'concreto' }, { v: 'alvenaria', label: 'alvenaria genérica' }, { v: 'blocos', label: 'blocos de concreto' }]} onChange={(v) => {
          const m = v === 'concreto' ? undefined : tiposDoTipoParede(b, v)[0]?.id;
          if (v !== 'concreto' && !m) return;
          exec('parede.editar', { id: w.id, tipo: v, ...(m ? { material: m } : {}) });
        }} />
        {w.tipo !== undefined && w.tipo !== 'concreto' && (
          <Select label="Material desta parede" value={w.material ?? ''} options={tiposDoTipoParede(b, w.tipo).map((t) => ({ v: t.id, label: t.nome }))} onChange={(v) => exec('parede.editar', { id: w.id, material: v })} />
        )}
      </div>
      <div className="row wrap">
        <NumField label="Esquerda" unit="cm" width={90} value={m2cm(w.esq)} onChange={(v) => exec('parede.editar', { id: w.id, esq: cm2m(v) })} />
        <NumField label="Direita" unit="cm" width={90} value={m2cm(w.dir)} onChange={(v) => exec('parede.editar', { id: w.id, dir: cm2m(v) })} />
        {(w.tipo ?? 'concreto') === 'concreto' && <Check label="Armar a parede" checked={w.armar !== false} onChange={(v) => exec('parede.editar', { id: w.id, armar: v })} />}
      </div>
      <h4>Aberturas</h4>
      {(w.aberturas ?? []).length > 0 && (
        <table className="data quadro" data-pw-aberturas>
          <thead><tr><th>Tipo</th><th>s (cm)</th><th>Largura (cm)</th><th>Peitoril (cm)</th><th>Altura (cm)</th><th>Pavimento</th><th /></tr></thead>
          <tbody>
            {(w.aberturas ?? []).map((a, i) => (
              <tr key={a.id}>
                <td className="tl">{a.tipo}</td><td className="num">{fmt(m2cm(a.s), 0)}</td><td className="num">{fmt(m2cm(a.largura), 0)}</td>
                <td className="num">{fmt(m2cm(a.peitoril), 0)}</td><td className="num">{fmt(m2cm(a.altura), 0)}</td><td className="tl">{nomePav(a.pavimento)}</td>
                <td><Button variant="ghost" aria-label={`Remover abertura ${i + 1}`} onClick={() => exec('parede.abertura', { parede: w.id, id: a.id, remover: true })}>×</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="row wrap">
        <Seg value={ab.tipo} options={[{ v: 'porta', label: 'porta' }, { v: 'janela', label: 'janela' }]} onChange={(v) => setAb({ ...ab, tipo: v })} />
        <NumField label="s" unit="cm" width={80} value={ab.s} onChange={(v) => setAb({ ...ab, s: v })} />
        <NumField label="Largura" unit="cm" width={90} value={ab.largura} onChange={(v) => setAb({ ...ab, largura: v })} />
        <NumField label="Peitoril" unit="cm" width={90} value={ab.peitoril} onChange={(v) => setAb({ ...ab, peitoril: v })} />
        <NumField label="Altura" unit="cm" width={90} value={ab.altura} onChange={(v) => setAb({ ...ab, altura: v })} />
        <Select label="Pavimento da abertura" value={pavEf} options={opcoesPav} onChange={(v) => setAb({ ...ab, pavimento: v })} />
        <Button onClick={() => exec('parede.abertura', { parede: w.id, tipo: ab.tipo, s: cm2m(ab.s), largura: cm2m(ab.largura), peitoril: cm2m(ab.peitoril), altura: cm2m(ab.altura), pavimento: pavEf })}>Acrescentar abertura</Button>
      </div>
      <h4>Empuxo</h4>
      {casos.length === 0 && !emp.liquido ? <Hint>Crie um tipo de empuxo e um caso H com ele em Casos de carga.</Hint> : null}
      <div className="row wrap">
        <Check label="Líquido (reservatório)" checked={emp.liquido} onChange={(v) => setEmp({ ...emp, liquido: v, caso: '' })} />
        <Select label="Caso do empuxo" value={casoEf} options={(emp.liquido ? todosCasos : casos).map((c) => ({ v: c.id, label: c.nome }))} onChange={(v) => setEmp({ ...emp, caso: v })} />
        <Seg value={emp.lado} options={[{ v: 'esq', label: 'terreno à esquerda' }, { v: 'dir', label: 'terreno à direita' }]} onChange={(v) => setEmp({ ...emp, lado: v })} />
        {emp.liquido
          ? <NumField label="Cota do líquido" unit="m" width={96} value={emp.cotaLiq} onChange={(v) => setEmp({ ...emp, cotaLiq: v })} />
          : <OptNumField label="Cota do terreno" unit="m" width={96} value={emp.cota} onChange={(v) => setEmp({ ...emp, cota: v })} />}
        <Button disabled={!casoEf} onClick={() => exec('parede.empuxo', { parede: w.id, empuxos: [{ caso: casoEf, lado: emp.lado, ...(emp.liquido ? { liquido: { cota: emp.cotaLiq } } : emp.cota !== undefined ? { cotaTerreno: emp.cota } : {}) }] })}>Aplicar empuxo</Button>
        <Button onClick={() => exec('parede.empuxo', { parede: w.id, empuxos: [] })}>Remover empuxo</Button>
      </div>
      <h4>Prolongar</h4>
      <div className="row wrap">
        <Seg value={ext} options={[{ v: 'ini', label: 'início' }, { v: 'fim', label: 'fim' }]} onChange={setExt} />
        <Select label="Até a parede" value={alvo && outras.some((q) => q.id === alvo) ? alvo : outras[0]?.id ?? ''} options={outras.map((q) => ({ v: q.id, label: q.nome }))} onChange={setAlvo} />
        <Button disabled={!outras.length} onClick={() => exec('parede.prolongar', { id: w.id, extremidade: ext, ate: { parede: alvo && outras.some((q) => q.id === alvo) ? alvo : outras[0]?.id } })}>Prolongar</Button>
      </div>
      <h4>Atribuir</h4>
      <div className="row wrap">
        <Select label="Copiar de" value={de && outras.some((q) => q.id === de) ? de : outras[0]?.id ?? ''} options={outras.map((q) => ({ v: q.id, label: q.nome }))} onChange={setDe} />
        <Button disabled={!selecionadas.length || !outras.length} onClick={() => exec('parede.atribuir', { ids: selecionadas.map((q) => q.id), de: de && outras.some((q) => q.id === de) ? de : outras[0]?.id })}>Atribuir às selecionadas</Button>
      </div>
    </div>
  );
}

/** Janela da parede: modelo de cada lado, cargas na base, esforços por lado e pavimento e o empuxo aplicado por caso. */
export function JanelaParede({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo), an = useBuilding((s) => s.analise);
  const w = b.paredes?.find((q) => q.id === id), r = dim?.paredes?.find((q) => q.id === id);
  const [caso, setCaso] = useState('ELU');
  if (!w) return null;
  if (!r) return <p className="muted">Calcule o dimensionamento para ver os esforços da parede.</p>;
  const casos = Object.keys(r.base);
  const lados = r.lados;
  const nomesLado = [...new Set(lados.map((l) => l.nome))];
  const ps = pavimentosOrdenados(b);
  const linhas = (nome: string) => lados.filter((l) => l.nome === nome).sort((a, z) => ps.findIndex((p) => p.id === a.pavimento) - ps.findIndex((p) => p.id === z.pavimento));
  const celula = (l: EsforcosLado, k: keyof Resultante) => {
    if (caso === 'ELU') return `${fmt(l.elu[k].min, 1)} / ${fmt(l.elu[k].max, 1)}`;
    return fmt(l.casos[caso]?.[k] ?? 0, 1);
  };
  const nomeCaso = (c: string) => b.casos?.find((x) => x.id === c)?.nome ?? c;
  const empuxos = an?.paredes?.empuxo.filter((e) => e.parede === id) ?? [];
  return (
    <div data-janela-pw={id}>
      <p className="small">Parede ({rotuloTipoParede(b, w)}) · {r.nCascas} trecho(s) em casca e {r.ladosBarra} em barra. N &gt; 0 é tração nos esforços dos lados; nas cargas da base, compressão.</p>
      {w.tipo === 'concreto' || w.tipo === undefined ? <ArmaduraDaParede id={id} tipo="parede" /> : <AlvenariaDaParede id={id} />}
      {(w.tipo === 'concreto' || w.tipo === undefined) && w.aberturas?.length ? <AberturasArmadura id={id} /> : null}
      <IsovaloresParede id={id} tipo="parede" />
      <h4>Cargas na base (no centroide {fmt(r.centro[0])}; {fmt(r.centro[1])} m)</h4>
      <table className="data quadro" data-pw-base>
        <thead><tr><th>Caso</th><th>N (kN)</th><th>Vx (kN)</th><th>Vy (kN)</th><th>Mx (kN·m)</th><th>My (kN·m)</th></tr></thead>
        <tbody>
          {casos.map((c) => <tr key={c}><td className="tl">{c}</td>{(['N', 'Vx', 'Vy', 'Mx', 'My'] as const).map((k) => <td key={k} className="num">{fmt(r.base[c][k], 1)}</td>)}</tr>)}
          <tr><td className="tl"><b>ELU</b></td><td className="num" colSpan={5}>Nd máx. {fmt(r.baseElu.Nmax, 1)} kN ({r.baseElu.cNmax}) · Nd mín. {fmt(r.baseElu.Nmin, 1)} kN ({r.baseElu.cNmin})</td></tr>
        </tbody>
      </table>
      <h4>Esforços por lado e pavimento</h4>
      <div className="row wrap"><Select label="Caso" value={caso} options={[{ v: 'ELU', label: 'ELU (mínimo / máximo)' }, ...Object.keys(lados[0]?.casos ?? {}).map((c) => ({ v: c, label: c }))]} onChange={setCaso} /></div>
      {nomesLado.map((n) => (
        <details key={n} open className="small" data-pw-lado={n}>
          <summary>{n} — {linhas(n)[0]?.modelo === 'casca' ? 'casca' : 'barra'}, {fmt((linhas(n)[0]?.L ?? 0) * 100, 0)} cm</summary>
          <table className="data quadro">
            <thead><tr><th>Pavimento</th><th>t (cm)</th>{GRANDEZAS.map((g) => <th key={g.k}>{g.rot} ({g.un})</th>)}</tr></thead>
            <tbody>{linhas(n).map((l) => <tr key={l.pavimento}><td className="tl">{l.nomePav}</td><td className="num">{fmt(l.t * 100, 0)}</td>{GRANDEZAS.map((g) => <td key={g.k} className="num">{celula(l, g.k)}</td>)}</tr>)}</tbody>
          </table>
        </details>
      ))}
      {empuxos.length > 0 && (
        <>
          <h4>Empuxo aplicado</h4>
          <table className="data quadro" data-pw-empuxo>
            <thead><tr><th>Caso</th><th>Fx (kN)</th><th>Fy (kN)</th></tr></thead>
            <tbody>{empuxos.map((e, i) => <tr key={i}><td className="tl">{nomeCaso(e.caso)}</td><td className="num">{fmt(e.F[0], 1)}</td><td className="num">{fmt(e.F[1], 1)}</td></tr>)}</tbody>
          </table>
        </>
      )}
      <Hint>Lado em casca: médias sobre a altura do painel dos esforços de membrana e de placa. Lado em barra: extremo do lance.</Hint>
    </div>
  );
}

/** Cartão da aba Dimensionamento: paredes com o modelo, a carga máxima na base e atalhos para a planta e a janela. */
export function CartaoParedes({ onIr }: { onIr: (id: string) => void }) {
  const dim = useBuilding((s) => s.dim);
  const b = useBuilding((s) => s.sessao.modelo);
  const lista = dim?.paredes ?? [];
  if (!lista.length) return null;
  return (
    <div className="card" data-pw-cartao>
      <h4>Paredes</h4>
      <table className="data quadro">
        <thead><tr><th>Parede</th><th>Tipo</th><th>Modelo</th><th>Nd máx. (kN)</th><th>Combinação</th><th>Armadura</th><th>Cumprimento mín.</th><th>Situação</th><th /></tr></thead>
        <tbody>
          {lista.map((r) => {
            const a = dim?.armaduraParedes?.find((x) => x.id === r.id);
            const rc = a ? resumoCartao(a) : null;
            const w = b.paredes?.find((q) => q.id === r.id);
            const al = w && w.tipo !== undefined && w.tipo !== 'concreto' ? dim?.alvenaria?.paredes.find((x) => x.id === r.id) : undefined;
            const ra = al ? resumoCartaoAlv(al) : null;
            return (
            <tr key={r.id} data-id={r.id}>
              <td className="tl"><b>{r.nome}</b></td>
              <td className="tl">{w ? rotuloTipoParede(b, w) : '—'}</td>
              <td className="tl">{r.modelo === 'casca' ? 'casca' : r.modelo === 'barra' ? 'barra' : `${r.nCascas} casca(s) + ${r.ladosBarra} barra(s)`}</td>
              <td className="num">{fmt(r.baseElu.Nmax, 1)}</td><td className="tl">{r.baseElu.cNmax}</td>
              <td className="tl">{ra ? `${ra.material} · ${ra.armada}` : rc?.armadura ?? '—'}</td><td className="num">{ra ? ra.cumprimentoMin : rc?.cumprimentoMin ?? '—'}</td><td className="tl">{ra ? <Pill tone={ra.status === 'ok' ? 'ok' : 'bad'}>{ra.situacao}</Pill> : rc ? <Pill tone={rc.status === 'ok' ? 'ok' : 'bad'}>{rc.situacao}</Pill> : '—'}</td>
              <td><Button variant="ghost" onClick={() => onIr(r.id)}>planta</Button><Button variant="ghost" aria-label={`Resultados de ${r.nome}`} onClick={() => usePlanta.getState().set({ janela: { tipo: 'parede', id: r.id } })}>resultados</Button></td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
