// Esforços do pilar por hipótese na janela do pilar (V6d, K1.11.28): seletor de envoltória, combinação ou caso, diagrama
// ao longo da altura e valores de N, M, V e T numa altura escolhida. A matemática vem de src/core/resultados.
import { useMemo, useState } from 'react';
import { calculoAtual, useBuilding } from './store';
import { diagramaPilar, diagramaViga, esforcosPilarEmAltura, hipotesesDeEsforco, type Componente, type HipoteseEsforco } from '../../core/resultados/esforcosCaso';
import { esforcosVigaEmS, filtrarHipoteses, hipoteseSelecionada, type FiltroHipotese } from '../../core/resultados/seletorEsforcos';
import { Diagrama, GRANDEZAS } from './AbaEsforcos';
import { NumField, Select, TextField } from '../ui';

const f2 = (v: number) => v.toFixed(2).replace('.', ',');
const LINHAS: { v: Componente; rot: string; un: string }[] = [
  { v: 'N', rot: 'N (compressão +)', un: 'kN' }, { v: 'Mz', rot: 'M no plano', un: 'kN·m' }, { v: 'My', rot: 'M fora do plano', un: 'kN·m' },
  { v: 'Vy', rot: 'V no plano', un: 'kN' }, { v: 'Vz', rot: 'V fora do plano', un: 'kN' }, { v: 'T', rot: 'Torção T', un: 'kN·m' },
];

const TIPOS_HIP: { v: FiltroHipotese; label: string }[] = [{ v: 'todas', label: 'Todas' }, { v: 'envoltoria', label: 'Envoltórias' }, { v: 'combinacao', label: 'Combinações' }, { v: 'caso', label: 'Casos simples' }];
const rotuloHip = (h: HipoteseEsforco) => (h.tipo === 'caso' ? `Caso ${h.nome}` : h.nome);

/** Estado do seletor de hipótese (V7a): tipo, filtro por texto e hipótese escolhida (a primeira que passa no filtro quando a atual não passa). */
export function useSeletorHipotese(hips: HipoteseEsforco[]) {
  const [tipo, setTipo] = useState<FiltroHipotese>('todas'), [busca, setBusca] = useState(''), [id, setId] = useState('');
  return { hips, tipo, setTipo, busca, setBusca, setId, hip: hipoteseSelecionada(hips, id, tipo, busca) };
}

/** Seletor de hipótese dos esforços (V7a): tipo (envoltória, combinação ou caso), filtro por texto e a hipótese; usado nas janelas do pilar e da viga. */
export function SeletorHipotese({ elemento, s }: { elemento: 'pilar' | 'viga'; s: ReturnType<typeof useSeletorHipotese> }) {
  const lista = filtrarHipoteses(s.hips, s.tipo, s.busca), de = elemento === 'viga' ? 'da viga' : 'do pilar';
  return (
    <>
      <Select label={`Tipo de hipótese dos esforços ${de}`} value={s.tipo} options={TIPOS_HIP} onChange={s.setTipo} />
      <TextField label={`Filtrar hipóteses (${elemento})`} value={s.busca} onChange={s.setBusca} />
      <Select label={`Hipótese dos esforços ${de}`} value={s.hip?.id ?? ''} options={(lista.length ? lista : s.hips).map((h) => ({ v: h.id, label: rotuloHip(h) }))} onChange={s.setId} />
    </>
  );
}

export function EsforcosDoPilar({ id }: { id: string }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
  const sel = useSeletorHipotese(useMemo(() => (an ? hipotesesDeEsforco(b, an) : []), [b, an]));
  const [g, setG] = useState<Componente>('Mz');
  const [alt, setAlt] = useState(0);
  const hip = sel.hip;
  const d = useMemo(() => (an && hip ? diagramaPilar(an, id, hip) : null), [an, hip, id]);
  if (!an || !hip) return <p className="muted small">Calcule a estrutura (aba Dimensionamento) para ver os esforços do pilar por hipótese.</p>;
  if (!d) return <p className="muted small">Este pilar não tem barras no pórtico espacial.</p>;
  const e = esforcosPilarEmAltura(d, alt), info = GRANDEZAS.find((x) => x.v === g)!;
  const dados = JSON.stringify({ hipotese: hip.id, grandeza: g, altura: +e.altura.toFixed(3), N: +e.max.N.toFixed(3), Mz: +e.max.Mz.toFixed(3), V: +e.max.Vy.toFixed(3), T: +e.max.T.toFixed(3), pontos: d.pontos.length });
  return (
    <section className="rev-esforcos" data-esf-pilar={dados}>
      <h4>Esforços por hipótese ao longo da altura</h4>
      <div className="row">
        <SeletorHipotese elemento="pilar" s={sel} />
        <Select label="Grandeza do diagrama do pilar" value={g} options={GRANDEZAS.map((x) => ({ v: x.v, label: x.label }))} onChange={setG} />
        <NumField label="Altura acima da base" value={alt} unit="m" min={0} onChange={setAlt} />
      </div>
      <Diagrama n="pilar" d={d} g={g} us={d.altura} unidade={info.unidade} />
      <div className="tablewrap">
        <table className="data quadro">
          <thead><tr><th>Esforço a {f2(e.altura)} m ({e.lance})</th><th>Máximo</th><th>Mínimo</th></tr></thead>
          <tbody>{LINHAS.map((l) => <tr key={l.v}><td className="tl">{l.rot} ({l.un})</td><td className="num">{f2(e.max[l.v])}</td><td className="num">{f2(e.min[l.v])}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="hint small">Envoltória: extremos entre as combinações da família; caso ou combinação: valor único. Altura fora do pilar fica no extremo mais próximo.</p>
    </section>
  );
}

const LINHAS_VIGA: { v: Componente; rot: string; un: string }[] = [
  { v: 'Mz', rot: 'M no plano', un: 'kN·m' }, { v: 'Vy', rot: 'V no plano', un: 'kN' }, { v: 'T', rot: 'Torção T', un: 'kN·m' },
  { v: 'N', rot: 'N (tração +)', un: 'kN' }, { v: 'My', rot: 'M fora do plano', un: 'kN·m' }, { v: 'Vz', rot: 'V fora do plano', un: 'kN' },
];

/** Esforços da viga por hipótese na janela da viga (V7a, C6.105): seletor de envoltória, combinação ou caso, diagrama e valores numa abscissa. */
export function EsforcosDaViga({ id }: { id: string }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
  const sel = useSeletorHipotese(useMemo(() => (an ? hipotesesDeEsforco(b, an) : []), [b, an]));
  const [g, setG] = useState<Componente>('Mz');
  const [pavId, setPavId] = useState('');
  const [s, setS] = useState(0);
  const hip = sel.hip;
  const dv = useMemo(() => (an && hip ? diagramaViga(b, an, id, hip) : []), [b, an, hip, id]);
  if (!an || !hip) return <p className="muted small">Calcule a estrutura (aba Dimensionamento) para ver os esforços da viga por hipótese.</p>;
  if (!dv.length) return <p className="muted small">Esta viga não tem barras no pórtico espacial.</p>;
  const d = dv.find((x) => x.pavimento === pavId) ?? dv[0], info = GRANDEZAS.find((x) => x.v === g)!, e = esforcosVigaEmS(d, s);
  const dados = JSON.stringify({ hipotese: hip.id, grandeza: g, pavimento: d.pavimento, s: +e.s.toFixed(3), M: +e.max.Mz.toFixed(3), V: +e.max.Vy.toFixed(3), T: +e.max.T.toFixed(3), pontos: d.pontos.length, envoltoria: hip.tipo === 'envoltoria' });
  return (
    <section className="rev-esforcos" data-esf-viga={dados}>
      <h4>Esforços por hipótese ao longo da viga</h4>
      <div className="row">
        <SeletorHipotese elemento="viga" s={sel} />
        <Select label="Grandeza do diagrama da viga" value={g} options={GRANDEZAS.map((x) => ({ v: x.v, label: x.label }))} onChange={setG} />
        {dv.length > 1 && <Select label="Pavimento dos esforços da viga" value={d.pavimento} options={dv.map((x) => ({ v: x.pavimento, label: b.pavimentos.find((p) => p.id === x.pavimento)?.nome ?? x.pavimento }))} onChange={setPavId} />}
        <NumField label="Abscissa s ao longo da viga" value={s} unit="m" min={0} onChange={setS} />
      </div>
      <Diagrama n="viga" d={d} g={g} us={d.s} unidade={info.unidade} />
      <div className="tablewrap">
        <table className="data quadro">
          <thead><tr><th>Esforço a s = {f2(e.s)} m</th><th>Máximo</th><th>Mínimo</th></tr></thead>
          <tbody>{LINHAS_VIGA.map((l) => <tr key={l.v}><td className="tl">{l.rot} ({l.un})</td><td className="num">{f2(e.max[l.v])}</td><td className="num">{f2(e.min[l.v])}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="hint small">Envoltória: extremos entre as combinações da família; caso ou combinação: valor único. Abscissa fora da viga fica no extremo mais próximo. Sismo dinâmico (escolha do modo de vibração) não faz parte do programa.</p>
    </section>
  );
}
