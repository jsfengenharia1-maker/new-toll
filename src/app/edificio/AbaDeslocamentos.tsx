// Aba "Deslocamentos" (V3): consulta de deslocamentos por nó e caso, máximos por pano e por pavimento, saída da malha em
// CSV e flecha entre dois pontos de uma laje (perfil em SVG). A matemática vem de src/core/resultados (funções puras).
import { useEffect, useMemo, useState } from 'react';
import { calculoAtual, useBuilding } from './store';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import { hipotesesDisponiveis } from '../../core/resultados/deformada';
import { casosDoPortico, consultaNo, csvDeslocamentos, maximosPilaresCombinados, maximosPorPano, maximosPorRadier, tabelaDeslocamentosMalha } from '../../core/resultados/consultas';
import { flechaDaHipotese, flechaEnvoltoria, flechaMaisDesfavoravel, type FamiliaEnvoltoria, type MedidaFlecha, type ReferenciaFlecha } from '../../core/resultados/flechaPontos';
import { Button, Group, Hint, NumField, Seg, Select, download } from '../ui';
import { TabelaConsultaNo } from './ConsultaNoUI';
import { DeslocamentosVento } from './DeslocamentosVento';
import { useResultados } from './resultadosStore';

const mm = (v: number, d = 2) => (v * 1000).toFixed(d).replace('.', ',');
const num = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const MAIS_DESFAVORAVEL = 'mais-desfavoravel';
const ENV_PREFIXO = 'env:';
const ENVOLTORIAS: { v: FamiliaEnvoltoria; label: string }[] = [
  { v: 'RARA', label: 'Envoltória rara (combinação de maior flecha)' }, { v: 'FREQ', label: 'Envoltória frequente (combinação de maior flecha)' },
  { v: 'QP', label: 'Envoltória quase permanente (combinação de maior flecha)' }, { v: 'ELU', label: 'Envoltória ELU (só informativa)' },
];

export function AbaDeslocamentos({ b }: { b: BuildingModel }) {
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
  const dim = useBuilding((s) => s.dim);
  const ps = useMemo(() => pavimentosOrdenados(b).filter((p) => an?.grelhas.some((g) => g.pavimento === p.id && g.res && !g.res.erro)), [b, an]);
  const [pav, setPav] = useState('');
  const [cx, setCx] = useState(0.5), [cy, setCy] = useState(0.5);
  const [noZ, setNoZ] = useState<number | undefined>(undefined);
  const [fp, setFp] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [ref, setRef] = useState<ReferenciaFlecha>('secante');
  const [medida, setMedida] = useState<MedidaFlecha>('relativaMax');
  const [amp, setAmp] = useState(1);
  const [lim, setLim] = useState(250);
  const [hipF, setHipF] = useState(MAIS_DESFAVORAVEL);

  const hips = useMemo(() => (an ? hipotesesDisponiveis(b, an) : []), [b, an]);
  // pedidos vindos de outras vistas: dois pontos clicados na planta (ferramenta Flecha) e nó clicado na vista 3D
  const pedidoFlecha = useResultados((s) => s.flecha), pedidoNo = useResultados((s) => s.no);
  useEffect(() => {
    if (!pedidoFlecha) return;
    setPav(pedidoFlecha.pavimento); setFp({ x1: pedidoFlecha.x1, y1: pedidoFlecha.y1, x2: pedidoFlecha.x2, y2: pedidoFlecha.y2 });
    useResultados.getState().set({ flecha: null });
  }, [pedidoFlecha]);
  useEffect(() => {
    if (!pedidoNo) return;
    setCx(pedidoNo.x); setCy(pedidoNo.y); setNoZ(pedidoNo.z); if (pedidoNo.pavimento) setPav(pedidoNo.pavimento);
    useResultados.getState().set({ no: null });
  }, [pedidoNo]);
  const pavId = ps.find((p) => p.id === pav)?.id ?? ps[0]?.id ?? '';
  const pavObj = ps.find((p) => p.id === pavId);
  // pontos padrão: linha média da primeira laje do pavimento, de um lado ao outro
  const padrao = useMemo(() => {
    const l = b.lajes.find((x) => x.grupo === pavObj?.grupo);
    if (!l) return { x1: 0, y1: 0, x2: 1, y2: 0 };
    const xs = l.contorno.map((p) => p[0]), ys = l.contorno.map((p) => p[1]);
    const ym = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { x1: Math.min(...xs) + 0.5, y1: ym, x2: Math.max(...xs) - 0.5, y2: ym };
  }, [b, pavObj]);
  const P = fp ?? padrao;

  const consulta = useMemo(() => (an && pavId ? consultaNo(b, an, dim, noZ === undefined ? { x: cx, y: cy, pavimento: pavId } : { x: cx, y: cy, z: noZ }) : null), [b, an, dim, pavId, cx, cy, noZ]);
  const panos = useMemo(() => (an ? maximosPorPano(b, an) : []), [b, an]);
  const radiers = useMemo(() => (an ? maximosPorRadier(b, an) : []), [b, an]);
  const pilares = useMemo(() => (an ? maximosPilaresCombinados(b, an, 'FREQ') : []), [b, an]);
  const flecha = useMemo(() => {
    if (!an || !pavId) return null;
    const a: [number, number] = [P.x1, P.y1], z: [number, number] = [P.x2, P.y2];
    if (Math.hypot(z[0] - a[0], z[1] - a[1]) < 1e-6) return null;
    const o = { referencia: ref, medida, amplificacao: amp, limite: lim };
    if (hipF === MAIS_DESFAVORAVEL) {
      const lista = flechaMaisDesfavoravel(b, an, pavId, a, z, o);
      return lista[0] ?? null;
    }
    if (hipF.startsWith(ENV_PREFIXO)) return flechaEnvoltoria(b, an, hipF.slice(ENV_PREFIXO.length) as FamiliaEnvoltoria, pavId, a, z, o)[0] ?? null;
    const h = hips.find((x) => x.id === hipF);
    return h ? flechaDaHipotese(an, h, pavId, a, z, o) : null;
  }, [b, an, pavId, P.x1, P.y1, P.x2, P.y2, ref, medida, amp, lim, hipF, hips]);

  if (!an) return <div className="card"><h3>Deslocamentos</h3><p className="hint">Calcule a estrutura (aba Dimensionamento) para consultar os deslocamentos.</p></div>;
  const casos = an.casos;

  async function baixarCsv() {
    const t = tabelaDeslocamentosMalha(b, an!);
    await download('deslocamentos-malha.csv', csvDeslocamentos(t.linhas), 'text/csv');
  }

  return (
    <div className="desloc-aba">
      <Group title="Consulta por nó e caso">
        <div className="row">
          <Select label="Pavimento da consulta" value={pavId} options={ps.map((p) => ({ v: p.id, label: p.nome }))} onChange={(v) => { setNoZ(undefined); setPav(v); }} />
          <NumField label="X da consulta" value={cx} unit="m" onChange={(v) => { setNoZ(undefined); setCx(v); }} />
          <NumField label="Y da consulta" value={cy} unit="m" onChange={(v) => { setNoZ(undefined); setCy(v); }} />
        </div>
        {consulta && <TabelaConsultaNo consulta={consulta} />}
      </Group>

      <Group title="Deslocamentos máximos">
        <p className="hint">Deslocamento do nó (não é flecha); uz negativo = para baixo, positivo = levantamento.</p>
        <div className="tablewrap" data-desloc-panos={panos.length}>
          <table className="data quadro">
            <thead><tr><th>Pano</th><th>Pavimento</th>{casos.map((c) => <th key={c}>uz máx. {c} (mm)</th>)}</tr></thead>
            <tbody>
              {panos.map((p) => (
                <tr key={`${p.pavimento}-${p.laje}`}>
                  <td className="tl">{p.nome}</td><td className="tl">{p.pavimentoNome}</td>
                  {casos.map((c) => <td key={c} className="num">{p.casos[c] ? mm(p.casos[c].uz) : '—'}{p.casos[c]?.levantamento ? ' (levantamento)' : ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {radiers.length > 0 && (
          <div className="tablewrap" data-desloc-radiers={radiers.length}>
            <table className="data quadro">
              <thead><tr><th>Radier ou viga elástica</th>{casosDoPortico(an!).map((c) => <th key={c}>uz máx. {c} (mm)</th>)}</tr></thead>
              <tbody>
                {radiers.map((r) => (
                  <tr key={r.id}>
                    <td className="tl">{r.nome}</td>
                    {casosDoPortico(an!).map((c) => <td key={c} className="num">{r.casos[c] ? mm(r.casos[c].uz) : '—'}{r.casos[c]?.levantamento ? ' (levantamento: hipótese inválida)' : ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="tablewrap" data-desloc-pilares={pilares.length}>
          <table className="data quadro">
            <thead><tr><th>Pavimento</th><th>|ux| máx. (mm)</th><th>Combinação em x</th><th>Distorção x</th><th>Pilar e combinação da distorção x</th><th>|uy| máx. (mm)</th><th>Combinação em y</th><th>Distorção y</th><th>Pilar e combinação da distorção y</th></tr></thead>
            <tbody>
              {pilares.map((p) => (
                <tr key={p.pavimento}>
                  <td className="tl">{p.pavimentoNome}</td>
                  <td className="num">{mm(p.x.valor)}</td><td className="tl">{p.x.combinacao}</td><td className="num">{num(p.x.distorcao * 1000, 3)}‰</td><td className="tl">{p.x.pilarDistorcao} · {p.x.combinacaoDistorcao}</td>
                  <td className="num">{mm(p.y.valor)}</td><td className="tl">{p.y.combinacao}</td><td className="num">{num(p.y.distorcao * 1000, 3)}‰</td><td className="tl">{p.y.pilarDistorcao} · {p.y.combinacaoDistorcao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Hint>Topo dos pilares nas combinações frequentes; cada direção tem a sua combinação (não simultâneos). Distorção = deslocamento relativo do lance ÷ altura.</Hint>
        <div className="row"><Button onClick={() => { void baixarCsv(); }}>Baixar CSV dos deslocamentos da malha</Button></div>
      </Group>

      <DeslocamentosVento b={b} an={an} />

      <Group title="Flecha entre dois pontos">
        <div className="row">
          <Select label="Pavimento da flecha" value={pavId} options={ps.map((p) => ({ v: p.id, label: p.nome }))} onChange={(v) => { setPav(v); setFp(null); }} />
          <NumField label="X inicial" value={P.x1} unit="m" onChange={(v) => setFp({ ...P, x1: v })} />
          <NumField label="Y inicial" value={P.y1} unit="m" onChange={(v) => setFp({ ...P, y1: v })} />
          <NumField label="X final" value={P.x2} unit="m" onChange={(v) => setFp({ ...P, x2: v })} />
          <NumField label="Y final" value={P.y2} unit="m" onChange={(v) => setFp({ ...P, y2: v })} />
        </div>
        <div className="row">
          <Select label="Hipótese da flecha" value={hipF} options={[{ v: MAIS_DESFAVORAVEL, label: 'Combinação gravitacional mais desfavorável' }, ...ENVOLTORIAS.map((e) => ({ v: ENV_PREFIXO + e.v, label: e.label })), ...hips.map((h) => ({ v: h.id, label: h.tipo === 'caso' ? `Caso ${h.nome}` : h.nome }))]} onChange={setHipF} />
          <Seg value={ref} options={[{ v: 'secante', label: 'Secante' }, { v: 'tangente', label: 'Tangente no ponto inicial' }]} onChange={setRef} />
          <Select label="Medida da flecha" value={medida} options={[{ v: 'relativaMax', label: 'Máxima relativa' }, { v: 'absolutaMax', label: 'Máxima absoluta' }, { v: 'entrePontos', label: 'Entre os dois pontos' }]} onChange={setMedida} />
          <NumField label="Amplificação da flecha" value={amp} unit="×" onChange={setAmp} min={0.01} />
          <NumField label="Limite da flecha" value={lim} unit="L/n" onChange={setLim} min={1} />
        </div>
        {flecha ? <ResultadoFlecha f={flecha} /> : <p className="hint">Informe dois pontos distintos.</p>}
        <Hint>Casos gravitacionais (peso próprio, permanentes e variável) entre as combinações de flecha do projeto; limite L/250 (secante) ou 2L/250 (tangente) é o padrão, editável [a confirmar para este uso]. As envoltórias (rara, frequente, quase permanente) dão a combinação da família de maior flecha entre os pontos. Os pontos também podem ser clicados na planta (ferramenta Flecha entre dois pontos, no grupo Resultados da faixa Análise).</Hint>
      </Group>
    </div>
  );
}

function ResultadoFlecha({ f }: { f: ReturnType<typeof flechaDaHipotese> }) {
  const r = f.resultado, p = f.perfil;
  const W = 640, H = 220, mx = 40, my = 24;
  const ws = [...p.w, ...p.w.map((_, i) => (r.referencia === 'secante' ? r.w0 + ((r.w1 - r.w0) * p.s[i]) / p.L : r.w0 + r.inclinacaoInicial * p.s[i]))];
  const lo = Math.min(...ws, 0), hi = Math.max(...ws, 1e-6), esc = (H - 2 * my) / Math.max(1e-9, hi - lo);
  const X = (s: number) => mx + (s / p.L) * (W - 2 * mx), Y = (w: number) => my + (w - lo) * esc;
  const curva = p.s.map((s, i) => `${i ? 'L' : 'M'}${X(s).toFixed(1)},${Y(p.w[i]).toFixed(1)}`).join(' ');
  const refPts = `M${X(0).toFixed(1)},${Y(r.w0).toFixed(1)} L${X(p.L).toFixed(1)},${Y(r.referencia === 'secante' ? r.w1 : r.w0 + r.inclinacaoInicial * p.L).toFixed(1)}`;
  return (
    <div data-flecha={JSON.stringify({ L: +r.L.toFixed(3), flechaMm: +(r.flecha * 1000).toFixed(3), razao: Number.isFinite(r.razao) ? +r.razao.toFixed(1) : null, ok: r.ok })}>
      <div className="tablewrap">
        <table className="data quadro">
          <tbody>
            <tr><td className="tl">Hipótese</td><td className="tl">{f.hipotese.nome}</td></tr>
            <tr><td className="tl">Vão L</td><td className="num">{num(r.L)} m</td></tr>
            <tr><td className="tl">Flecha ({r.referencia === 'secante' ? 'secante' : 'tangente'})</td><td className="num">{mm(r.flecha)} mm</td></tr>
            <tr><td className="tl">Flecha relativa</td><td className="num">{Number.isFinite(r.razao) ? `${r.referencia === 'secante' ? 'L' : '2L'}/${num(r.razao, 0)}` : '—'}</td></tr>
            <tr><td className="tl">Limite {r.referencia === 'secante' ? 'L' : '2L'}/n</td><td className="num">{r.erro ? `inválido — ${r.erro}` : `${mm(r.limiteM)} mm — ${r.ok ? 'atende' : 'não atende'}`}</td></tr>
          </tbody>
        </table>
      </div>
      <svg className="flecha-perfil" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Perfil dos deslocamentos verticais entre os dois pontos">
        <line className="fp-eixo" x1={mx} x2={W - mx} y1={Y(0)} y2={Y(0)} />
        <path className="fp-ref" d={refPts} />
        <path className="fp-curva" d={curva} />
        <text className="fp-txt" x={mx} y={H - 6}>0</text>
        <text className="fp-txt" x={W - mx} y={H - 6} textAnchor="end">{num(p.L)} m</text>
        <text className="fp-txt" x={W - mx} y={14} textAnchor="end">deslocamento para baixo ↓ (mm): máx. {mm(Math.max(...p.w))}</text>
      </svg>
    </div>
  );
}
