// Grupo "Empuxo de terra" (frente N2a): tipos de empuxo reutilizáveis (estratos, nível d'água, drenagem, talude,
// sobrecarga) com o diagrama de pressões. Os tipos são usados pelos casos de natureza H (Casos de carga).
import { useEffect, useState } from 'react';
import { diagramaEmpuxo, kDoTipo } from '../../core/building/empuxo';
import { cotaFundacao, type BuildingModel, type EstratoEmpuxo, type TipoEmpuxo } from '../../core/building/types';
import { Button, Group, Hint, NumField, OptNumField, Select, TextCell, TextField } from '../ui';
import { svgEmpuxo } from './empuxoFig';
import { useBuilding } from './store';

const fmt = (v: number, d = 2) => String(+v.toFixed(d)).replace('.', ',');
const num = (t: string) => parseFloat(t.replace(',', '.'));
const METODOS = [{ v: 'repouso', label: 'Repouso (K0 = 1 − sen φ)' }, { v: 'rankine', label: 'Ativo, Rankine' }, { v: 'coulomb', label: 'Ativo, Coulomb' }] as const;

function Editor({ b, t }: { b: BuildingModel; t: TipoEmpuxo }) {
  const { exec } = useBuilding();
  const def = (p: Record<string, unknown>) => exec('empuxo.tipo', { id: t.id, ...p });
  const total = t.estratos.reduce((s, e) => s + e.espessura, 0);
  const [topo, setTopo] = useState(t.cotaAterro);
  const [base, setBase] = useState(Math.min(cotaFundacao(b), t.cotaAterro - 1));
  useEffect(() => { setTopo(t.cotaAterro); }, [t.cotaAterro]);
  const d = diagramaEmpuxo(t, topo, base);
  const estrato = (i: number, p: Partial<EstratoEmpuxo>) => def({ estratos: t.estratos.map((e, k) => (k === i ? { ...e, ...p } : e)) });
  const ks = t.estratos.map((e) => kDoTipo(t, e.phi));
  return (
    <>
      <div className="row wrap">
        <Select label="Método" value={t.metodo} options={METODOS.map((m) => ({ v: m.v, label: m.label }))} onChange={(v) => def({ metodo: v })} />
        <NumField label="Cota do topo do aterro" unit="m" width={140} value={t.cotaAterro} onChange={(v) => def({ cotaAterro: v })} />
        <OptNumField label="Cota do nível d'água" unit="m" width={140} value={t.nivelAgua} onChange={(v) => (v === undefined ? def({ semAgua: true }) : def({ nivelAgua: v }))} />
      </div>
      <div className="row wrap">
        <NumField label="Alívio da água por drenagem" unit="%" width={160} value={t.alivio ?? 0} onChange={(v) => def({ alivio: v })} />
        <NumField label="Sobrecarga no terreno" unit="kN/m²" width={140} value={t.sobrecarga ?? 0} onChange={(v) => def({ sobrecarga: v })} />
        {t.metodo !== 'repouso' && <NumField label="Talude β" unit="°" width={90} value={t.talude ?? 0} onChange={(v) => def({ talude: v })} />}
        {t.metodo === 'coulomb' && <NumField label="Atrito solo-parede δ" unit="°" width={140} value={t.delta ?? 0} onChange={(v) => def({ delta: v })} />}
        <OptNumField label="K informado" width={100} value={t.k} onChange={(v) => def({ k: v ?? 0 })} />
      </div>
      <table className="data quadro">
        <thead><tr><th>Estrato</th><th>Espessura (m)</th><th>γ (kN/m³)</th><th>γ submerso</th><th>φ (°)</th><th>K</th><th /></tr></thead>
        <tbody>
          {t.estratos.map((e, i) => (
            <tr key={i}>
              <td className="tl">{i + 1}{i === t.estratos.length - 1 ? ' (até a base)' : ''}</td>
              <td><TextCell num label={`Espessura do estrato ${i + 1}`} value={fmt(e.espessura)} onCommit={(v) => num(v) > 0 && estrato(i, { espessura: num(v) })} /></td>
              <td><TextCell num label={`Peso aparente do estrato ${i + 1}`} value={fmt(e.gama)} onCommit={(v) => num(v) > 0 && estrato(i, { gama: num(v) })} /></td>
              <td><TextCell num label={`Peso submerso do estrato ${i + 1}`} value={fmt(e.gamaSub ?? e.gama - 10)} onCommit={(v) => num(v) > 0 && estrato(i, { gamaSub: num(v) })} /></td>
              <td><TextCell num label={`Ângulo de atrito do estrato ${i + 1}`} value={fmt(e.phi)} onCommit={(v) => num(v) >= 0 && estrato(i, { phi: num(v) })} /></td>
              <td className="num">{ks[i] === null ? '—' : fmt(ks[i]!, 3)}</td>
              <td>{t.estratos.length > 1 && <Button variant="danger" aria-label={`Remover estrato ${i + 1}`} onClick={() => def({ estratos: t.estratos.filter((_, k) => k !== i) })}>×</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row wrap">
        <Button onClick={() => def({ estratos: [...t.estratos, { ...t.estratos[t.estratos.length - 1], espessura: 3 }] })}>Adicionar estrato</Button>
        <Button variant="danger" onClick={() => exec('empuxo.tipo', { id: t.id, remover: true })}>Remover tipo</Button>
        <span className="hint">Estratos: {fmt(total)} m</span>
      </div>
      <div className="row wrap">
        <NumField label="Cota do topo da parede" unit="m" width={140} value={topo} onChange={setTopo} />
        <NumField label="Cota da base da parede" unit="m" width={140} value={base} onChange={setBase} />
      </div>
      <div className="emp-box" data-resultante={d.resultante.toFixed(3)} dangerouslySetInnerHTML={{ __html: svgEmpuxo(t, topo, base, 'app') }} />
      <p className="small">Resultante {fmt(d.resultante)} kN/m a {fmt(d.cotaResultante)} m (pressão na base {fmt(d.pontos.at(-1)?.total ?? 0)} kPa).{d.avisos.length ? ` ${d.avisos.join(' ')}` : ''}</p>
    </>
  );
}

export function EmpuxoGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const tipos = b.empuxos ?? [];
  const [sel, setSel] = useState(tipos[0]?.id ?? '');
  const [nome, setNome] = useState('');
  const t = tipos.find((x) => x.id === sel) ?? tipos[0];
  useEffect(() => { if (!tipos.some((x) => x.id === sel)) setSel(tipos[0]?.id ?? ''); }, [tipos, sel]);
  const criar = () => { if (nome.trim() && exec('empuxo.tipo', { nome: nome.trim() }).ok) { setNome(''); } };
  return (
    <Group title={`Empuxo de terra (${tipos.length})`} open={false}>
      <div className="row wrap">
        {tipos.length > 0 && <Select label="Tipo de empuxo" value={t?.id ?? ''} options={tipos.map((x) => ({ v: x.id, label: x.nome }))} onChange={setSel} />}
        <TextField label="Novo tipo de empuxo" value={nome} onChange={setNome} />
        <Button disabled={!nome.trim()} onClick={criar}>Criar tipo</Button>
      </div>
      {t && <Editor key={t.id} b={b} t={t} />}
      <Hint>Empuxo de repouso (K0 = 1 − sen φ, Jaky) é o usual em paredes travadas pelas lajes; o ativo (Rankine ou Coulomb, com talude β) vale para muros livres [padrão a confirmar]. Acima do nível d'água usa o peso aparente; abaixo, o submerso (padrão aparente − 10) e a pressão hidrostática, reduzida pelo alívio da drenagem. A sobrecarga do terreno soma K·q em toda a altura. Para usar, crie um caso de natureza H em Casos de carga e escolha o tipo; a aplicação automática às paredes de subsolo vem com as paredes (frente E1c) — por ora lance as cargas do empuxo no caso H.</Hint>
    </Group>
  );
}
