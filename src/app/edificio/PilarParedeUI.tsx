// Pilar-parede (E1b): grupo da barra lateral (tipos de seção composta com prévia, lançamento e lista) e janela do elemento
// com os esforços por lado e pavimento. Os tipos e o lançamento usam os comandos pilarParede.*.
import { useState } from 'react';
import { Button, Group, Hint, NumCell, NumField, Pill, Select, TextField } from '../ui';
import { ladosDoPP, contornoDoLado } from '../../core/building/pilarParede';
import type { EsforcosLado, Resultante } from '../../core/building/pilarParedeEsforcos';
import { pavimentosOrdenados, type BuildingModel, type LadoPilarParede, type PilarParede, type TipoPilarParede } from '../../core/building/types';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const m2cm = (v: number) => +(v * 100).toFixed(2);
const cm2m = (v: number) => +(v / 100).toFixed(4);

/** Pilar-parede fictício (só para obter os lados de um tipo, na origem e sem rotação). */
const ficticio = (b: BuildingModel, tipo: string): PilarParede => ({ id: '?', nome: '?', tipo, x: 0, y: 0, angulo: 0, nasce: 'fundacao', morre: pavimentosOrdenados(b).at(-1)?.id ?? '' });

/** Prévia em planta do tipo (retângulos dos lados com o eixo; em casca ou em barra), na espessura do pavimento dado. */
export function PreviaTipo({ b, tipo, pavimento }: { b: BuildingModel; tipo: TipoPilarParede; pavimento?: string }) {
  const lados = ladosDoPP(b, ficticio(b, tipo.id));
  const pav = pavimento ?? pavimentosOrdenados(b)[0]?.id ?? '';
  const cs = lados.map((g) => contornoDoLado(g, pav));
  const xs = [...cs.flat().map((p) => p[0]), ...lados.flatMap((g) => [g.a[0], g.z[0]])], ys = [...cs.flat().map((p) => p[1]), ...lados.flatMap((g) => [g.a[1], g.z[1]])];
  if (!xs.length) return null;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), m = Math.max(0.15, 0.08 * Math.max(x1 - x0, y1 - y0));
  return (
    <svg className="pp-prev" viewBox={`${x0 - m} ${-(y1 + m)} ${x1 - x0 + 2 * m} ${y1 - y0 + 2 * m}`} role="img" aria-label={`Prévia do tipo ${tipo.nome}`} data-pp-previa>
      {cs.map((c, i) => <polygon key={i} className={`pp-lado${lados[i].casca ? '' : ' barra'}`} points={c.map((p) => `${p[0]},${-p[1]}`).join(' ')} />)}
      {lados.map((g, i) => <line key={i} className="pp-eixo" x1={g.a[0]} y1={-g.a[1]} x2={g.z[0]} y2={-g.z[1]} />)}
      <circle className="pp-ins" cx={0} cy={0} r={m / 3} />
    </svg>
  );
}

/** Editor de um tipo: lados (vértices, espessuras) e espessuras próprias por pavimento. */
function EditorTipo({ b, tipo }: { b: BuildingModel; tipo: TipoPilarParede }) {
  const { exec } = useBuilding();
  const ps = pavimentosOrdenados(b);
  const [pav, setPav] = useState(ps[0]?.id ?? '');
  const [iLado, setILado] = useState(0);
  const lados = tipo.lados, lado = lados[Math.min(iLado, lados.length - 1)];
  const salvar = (novos: LadoPilarParede[]) => exec('pilarParede.tipo', { id: tipo.id, lados: novos });
  const mudar = (i: number, f: (l: LadoPilarParede) => LadoPilarParede) => salvar(lados.map((l, k) => (k === i ? f(l) : l)));
  const g = ladosDoPP(b, ficticio(b, tipo.id));
  const prop = lado?.porPavimento?.find((e) => e.pavimento === pav);
  const base = lado ? { esq: prop?.esq ?? lado.esq, dir: prop?.dir ?? lado.dir } : { esq: 0, dir: 0 };
  const grava = (esq: number, dir: number) => mudar(iLado, (l) => ({ ...l, porPavimento: [...(l.porPavimento ?? []).filter((e) => e.pavimento !== pav), { pavimento: pav, esq, dir }] }));
  return (
    <div data-pp-tipo={tipo.id}>
      <table className="data quadro pp-lados" data-pp-lados>
        <thead><tr><th>Lado</th><th>x ini (cm)</th><th>y ini (cm)</th><th>x fim (cm)</th><th>y fim (cm)</th><th>Esq. (cm)</th><th>Dir. (cm)</th><th>Modelo</th><th /></tr></thead>
        <tbody>
          {lados.map((l, i) => (
            <tr key={i} aria-selected={i === iLado} onClick={() => setILado(i)}>
              <td>{i + 1}</td>
              <td><NumCell label={`Lado ${i + 1} x inicial`} value={m2cm(l.a[0])} onChange={(v) => mudar(i, (q) => ({ ...q, a: [cm2m(v), q.a[1]] }))} /></td>
              <td><NumCell label={`Lado ${i + 1} y inicial`} value={m2cm(l.a[1])} onChange={(v) => mudar(i, (q) => ({ ...q, a: [q.a[0], cm2m(v)] }))} /></td>
              <td><NumCell label={`Lado ${i + 1} x final`} value={m2cm(l.z[0])} onChange={(v) => mudar(i, (q) => ({ ...q, z: [cm2m(v), q.z[1]] }))} /></td>
              <td><NumCell label={`Lado ${i + 1} y final`} value={m2cm(l.z[1])} onChange={(v) => mudar(i, (q) => ({ ...q, z: [q.z[0], cm2m(v)] }))} /></td>
              <td><NumCell label={`Lado ${i + 1} espessura à esquerda`} value={m2cm(l.esq)} onChange={(v) => mudar(i, (q) => ({ ...q, esq: cm2m(v) }))} /></td>
              <td><NumCell label={`Lado ${i + 1} espessura à direita`} value={m2cm(l.dir)} onChange={(v) => mudar(i, (q) => ({ ...q, dir: cm2m(v) }))} /></td>
              <td>{g[i] ? <Pill tone={g[i].casca ? 'ok' : 'warn'}>{g[i].casca ? 'casca' : 'barra'}</Pill> : null}</td>
              <td><Button variant="ghost" aria-label={`Remover o lado ${i + 1}`} disabled={lados.length < 2} onClick={() => salvar(lados.filter((_, k) => k !== i))}>×</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row wrap">
        <Button onClick={() => { const u = lados.at(-1)!; salvar([...lados, { a: u.z, z: [cm2m(m2cm(u.z[0]) + 100), u.z[1]], esq: u.esq, dir: u.dir }]); setILado(lados.length); }}>Acrescentar lado</Button>
      </div>
      {lado && ps.length > 0 && (
        <div className="row wrap" data-pp-espessura>
          <Select label={`Espessura própria do lado ${Math.min(iLado, lados.length - 1) + 1} em`} value={pav} options={ps.map((p) => ({ v: p.id, label: p.nome }))} onChange={setPav} />
          <NumField label="Esquerda" unit="cm" width={88} value={m2cm(base.esq)} onChange={(v) => grava(cm2m(v), base.dir)} />
          <NumField label="Direita" unit="cm" width={88} value={m2cm(base.dir)} onChange={(v) => grava(base.esq, cm2m(v))} />
          <Button disabled={!prop} onClick={() => mudar(iLado, (l) => { const r = (l.porPavimento ?? []).filter((e) => e.pavimento !== pav); const { porPavimento: _p, ...resto } = l; return r.length ? { ...resto, porPavimento: r } : resto; })}>Voltar à padrão</Button>
        </div>
      )}
      <PreviaTipo b={b} tipo={tipo} pavimento={pav} />
    </div>
  );
}

/** Grupo "Pilares-parede" da barra lateral: tipos, lançamento por coordenadas ou pela planta e lista dos lançados. */
export function PilaresParedeGrupo({ b, onPlanta }: { b: BuildingModel; onPlanta?: () => void }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const tipos = b.tiposPilarParede ?? [], lancados = b.pilaresParede ?? [], ps = pavimentosOrdenados(b);
  const [tipoId, setTipoId] = useState('');
  const tipo = tipos.find((t) => t.id === tipoId) ?? tipos[0];
  const [novo, setNovo] = useState({ nome: '', comp: 400, esp: 20 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [nasce, setNasce] = useState('fundacao');
  const [morre, setMorre] = useState('');
  const [vinc, setVinc] = useState<'engaste' | 'rotula'>('engaste');
  const morreEf = morre && ps.some((p) => p.id === morre) ? morre : ps.at(-1)?.id ?? '';
  const params = { tipo: tipo?.id ?? '', angulo: pl.ppAngulo, nasce, morre: morreEf, vinculoBase: vinc };
  return (
    <Group title={`Pilares-parede (${lancados.length})`} open={lancados.length > 0 || tipos.length > 0}>
      <div className="row wrap" data-pp-novo-tipo>
        <TextField label="Novo tipo" value={novo.nome} onChange={(v) => setNovo({ ...novo, nome: v })} />
        <NumField label="Comprimento" unit="cm" width={96} value={novo.comp} onChange={(v) => setNovo({ ...novo, comp: v })} />
        <NumField label="Espessura" unit="cm" width={90} value={novo.esp} onChange={(v) => setNovo({ ...novo, esp: v })} />
        <Button onClick={() => { const r = exec('pilarParede.tipo', { nome: novo.nome.trim() || undefined, vertices: [[0, 0], [cm2m(novo.comp), 0]], esq: cm2m(novo.esp / 2), dir: cm2m(novo.esp / 2) }); if (r.ok) { setNovo({ ...novo, nome: '' }); setTipoId(''); } }}>Criar tipo reto</Button>
      </div>
      {tipos.length > 0 && (
        <>
          <div className="row wrap">
            <Select label="Tipo" value={tipo?.id ?? ''} options={tipos.map((t) => ({ v: t.id, label: `${t.nome} (${t.lados.length} lado${t.lados.length > 1 ? 's' : ''})` }))} onChange={setTipoId} />
            <TextField label="Nome do tipo" value={tipo?.nome ?? ''} onChange={(v) => v.trim() && tipo && exec('pilarParede.tipo', { id: tipo.id, nome: v })} />
            <Button variant="danger" disabled={!tipo || lancados.some((q) => q.tipo === tipo.id)} onClick={() => tipo && exec('pilarParede.tipo', { id: tipo.id, remover: true })}>Remover tipo</Button>
          </div>
          {tipo && <EditorTipo b={b} tipo={tipo} />}
          <div className="row wrap" data-pp-lancar>
            <NumField label="x" unit="m" width={84} value={pos.x} onChange={(v) => setPos({ ...pos, x: v })} />
            <NumField label="y" unit="m" width={84} value={pos.y} onChange={(v) => setPos({ ...pos, y: v })} />
            <NumField label="Ângulo" unit="°" width={84} value={pl.ppAngulo} onChange={(v) => pl.set({ ppAngulo: v })} />
            <Select label="Nasce em" value={nasce} options={[{ v: 'fundacao', label: 'fundação' }, ...ps.slice(0, -1).map((p) => ({ v: p.id, label: p.nome }))]} onChange={setNasce} />
            <Select label="Morre em" value={morreEf} options={ps.map((p) => ({ v: p.id, label: p.nome }))} onChange={setMorre} />
            <Select label="Base" value={vinc} options={[{ v: 'engaste', label: 'engastada' }, { v: 'rotula', label: 'rotulada' }]} onChange={setVinc} />
          </div>
          <div className="row wrap">
            <Button variant="primary" disabled={!tipo || !ps.length} onClick={() => tipo && exec('pilarParede.inserir', { ...params, x: pos.x, y: pos.y })}>Inserir em (x; y)</Button>
            <Button disabled={!tipo || !ps.length} onClick={() => { pl.set({ ferramenta: 'pilarParede', ppTipo: tipo?.id ?? null, ppParams: params }); onPlanta?.(); }}>Lançar na planta</Button>
          </div>
        </>
      )}
      {lancados.length > 0 && (
        <table className="data quadro" data-pp-lista>
          <thead><tr><th>Pilar-parede</th><th>Tipo</th><th>Ponto (m)</th><th>Âng.</th><th>Nasce</th><th>Morre</th><th /></tr></thead>
          <tbody>
            {lancados.map((q) => (
              <tr key={q.id} data-id={q.id} aria-selected={pl.selecao.has(q.id)}>
                <td className="tl"><b>{q.nome}</b></td>
                <td className="tl">{tipos.find((t) => t.id === q.tipo)?.nome ?? q.tipo}</td>
                <td className="num">{fmt(q.x)}; {fmt(q.y)}</td>
                <td className="num">{fmt(q.angulo, 0)}°</td>
                <td className="tl">{q.nasce === 'fundacao' ? 'fundação' : ps.find((p) => p.id === q.nasce)?.nome}</td>
                <td className="tl">{ps.find((p) => p.id === q.morre)?.nome}</td>
                <td><Button variant="ghost" aria-label={`Selecionar ${q.nome}`} onClick={() => { pl.set({ selecao: new Set([q.id]), foco: { id: q.id, n: (pl.foco?.n ?? 0) + 1 } }); onPlanta?.(); }}>ir</Button><Button variant="ghost" aria-label={`Remover ${q.nome}`} onClick={() => exec('pilarParede.remover', { ids: [q.id] })}>×</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Hint>Tipo = lados (segmentos do eixo, em cm a partir do ponto de inserção) com a espessura à esquerda e à direita do eixo; a espessura por pavimento difere da padrão. Lado com comprimento ≥ 5 × a espessura é modelado em casca; o mais curto, em barra (opção em Opções de cálculo). Premissas e1b-* a confirmar.</Hint>
    </Group>
  );
}

const GRANDEZAS: { k: keyof Resultante; rot: string; un: string }[] = [
  { k: 'N', rot: 'N', un: 'kN' }, { k: 'Vp', rot: 'V no plano', un: 'kN' }, { k: 'Mp', rot: 'M no plano', un: 'kN·m' }, { k: 'Vo', rot: 'V fora', un: 'kN' }, { k: 'Mo', rot: 'M fora', un: 'kN·m' },
];

/** Janela do pilar-parede: modelo de cada lado, cargas na base e esforços por lado e pavimento (casos e extremos ELU). */
export function JanelaPilarParede({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const pp = b.pilaresParede?.find((q) => q.id === id), r = dim?.pilaresParede?.find((q) => q.id === id);
  const [caso, setCaso] = useState('ELU');
  if (!pp) return null;
  if (!r) return <p className="muted">Calcule o dimensionamento para ver os esforços do pilar-parede.</p>;
  const casos = Object.keys(r.base);
  const lados = r.lados;
  const nomesLado = [...new Set(lados.map((l) => l.nome))];
  const linhas = (nome: string) => lados.filter((l) => l.nome === nome).sort((a, z) => pavimentosOrdenados(b).findIndex((p) => p.id === a.pavimento) - pavimentosOrdenados(b).findIndex((p) => p.id === z.pavimento));
  const celula = (l: EsforcosLado, k: keyof Resultante) => {
    if (caso === 'ELU') return `${fmt(l.elu[k].min, 1)} / ${fmt(l.elu[k].max, 1)}`;
    return fmt(l.casos[caso]?.[k] ?? 0, 1);
  };
  return (
    <div data-janela-pp={id}>
      <p className="small">Tipo <b>{r.nomeTipo}</b> · modelo: {r.modelo === 'casca' ? 'todos os lados em casca' : r.modelo === 'barra' ? 'todos os lados em barra' : `${r.nCascas} lado(s) em casca e ${r.ladosBarra} em barra`}. N &gt; 0 é tração nos esforços dos lados; nas cargas da base, compressão.</p>
      <h4>Cargas na base (no centroide {fmt(r.centro[0])}; {fmt(r.centro[1])} m)</h4>
      <table className="data quadro" data-pp-base>
        <thead><tr><th>Caso</th><th>N (kN)</th><th>Vx (kN)</th><th>Vy (kN)</th><th>Mx (kN·m)</th><th>My (kN·m)</th></tr></thead>
        <tbody>
          {casos.map((c) => <tr key={c}><td className="tl">{c}</td>{(['N', 'Vx', 'Vy', 'Mx', 'My'] as const).map((k) => <td key={k} className="num">{fmt(r.base[c][k], 1)}</td>)}</tr>)}
          <tr><td className="tl"><b>ELU</b></td><td className="num" colSpan={5}>Nd máx. {fmt(r.baseElu.Nmax, 1)} kN ({r.baseElu.cNmax}) · Nd mín. {fmt(r.baseElu.Nmin, 1)} kN ({r.baseElu.cNmin})</td></tr>
        </tbody>
      </table>
      <h4>Esforços por lado e pavimento</h4>
      <div className="row wrap"><Select label="Caso" value={caso} options={[{ v: 'ELU', label: 'ELU (mínimo / máximo)' }, ...Object.keys(lados[0]?.casos ?? {}).map((c) => ({ v: c, label: c }))]} onChange={setCaso} /></div>
      {nomesLado.map((n) => (
        <details key={n} open className="small" data-pp-lado={n}>
          <summary>{n} — {linhas(n)[0]?.modelo === 'casca' ? 'casca' : 'barra'}, {fmt((linhas(n)[0]?.L ?? 0) * 100, 0)} cm</summary>
          <table className="data quadro">
            <thead><tr><th>Pavimento</th><th>t (cm)</th>{GRANDEZAS.map((g) => <th key={g.k}>{g.rot} ({g.un})</th>)}</tr></thead>
            <tbody>{linhas(n).map((l) => <tr key={l.pavimento}><td className="tl">{l.nomePav}</td><td className="num">{fmt(l.t * 100, 0)}</td>{GRANDEZAS.map((g) => <td key={g.k} className="num">{celula(l, g.k)}</td>)}</tr>)}</tbody>
          </table>
        </details>
      ))}
      <Hint>Lado em casca: médias sobre a altura do painel dos esforços de membrana e de placa (N = ∫Ny ds, V = ∫Nxy ds, M = ∫Ny·s ds no plano; ∫Qy ds e ∫My ds fora do plano). Lado em barra: extremo do lance. Tensões e armaduras na frente E1d.</Hint>
    </div>
  );
}

/** Cartão da aba Dimensionamento: pilares-parede com o modelo, a carga máxima na base e atalhos para a planta e a janela. */
export function CartaoPilaresParede({ onIr }: { onIr: (id: string) => void }) {
  const dim = useBuilding((s) => s.dim);
  const lista = dim?.pilaresParede ?? [];
  if (!lista.length) return null;
  return (
    <div className="card" data-pp-cartao>
      <h4>Pilares-parede</h4>
      <table className="data quadro">
        <thead><tr><th>Pilar-parede</th><th>Tipo</th><th>Modelo</th><th>Nd máx. (kN)</th><th>Combinação</th><th /></tr></thead>
        <tbody>
          {lista.map((r) => (
            <tr key={r.id} data-id={r.id}>
              <td className="tl"><b>{r.nome}</b></td><td className="tl">{r.nomeTipo}</td>
              <td className="tl">{r.modelo === 'casca' ? 'casca' : r.modelo === 'barra' ? 'barra' : `${r.nCascas} casca(s) + ${r.ladosBarra} barra(s)`}</td>
              <td className="num">{fmt(r.baseElu.Nmax, 1)}</td><td className="tl">{r.baseElu.cNmax}</td>
              <td><Button variant="ghost" onClick={() => onIr(r.id)}>planta</Button><Button variant="ghost" aria-label={`Resultados de ${r.nome}`} onClick={() => usePlanta.getState().set({ janela: { tipo: 'pilarParede', id: r.id } })}>resultados</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
