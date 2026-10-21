// Armadura base e armaduras predefinidas de uma laje maciça (frente R7d): editor na aba Detalhamento da janela da laje.
// Aplica `laje.armaduraBase` (barras por direção da tabela da laje ou tela soldada da NBR 7481) e
// `laje.armaduraPredefinida` (face, ponto, direção, comprimento, bitola, espaçamento e número de barras).
import { useState } from 'react';
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';
import { Button, Check, NumField, Pill, Select } from '../ui';
import { linhaLajes, tabelaDe } from '../../core/building/tabelasArmadura';
import { PAINEL_TELA, TELAS } from '../../core/building/telasSoldadas';
import type { ArmaduraPredefinida, BaseFaceLaje, Laje } from '../../core/building/types';
import { fmt, phiTxt } from './Detalhamento';

type Modo = 'nenhuma' | 'barras' | 'tela';
interface FaceEd { modo: Modo; phi: [number, number]; s: [number, number]; tela: string; giro: boolean }
const faceInicial = (f: BaseFaceLaje | undefined, phi0: number): FaceEd => ({
  modo: f?.tela ? 'tela' : f?.barras ? 'barras' : 'nenhuma',
  phi: [f?.barras?.[0]?.phi ?? phi0, f?.barras?.[1]?.phi ?? phi0], s: [f?.barras?.[0]?.s ?? 20, f?.barras?.[1]?.s ?? 20], tela: f?.tela ?? TELAS[4].id, giro: !!f?.giro,
});
const paraComando = (e: FaceEd) => e.modo === 'tela' ? { tela: e.tela, ...(e.giro ? { giro: true } : {}) } : { barras: [0, 1].map((dir) => ({ dir, phi: e.phi[dir], s: e.s[dir] })) };

function FaceEditor({ nome, ed, set, bitolas }: { nome: string; ed: FaceEd; set: (v: FaceEd) => void; bitolas: number[] }) {
  const op = bitolas.map((p) => ({ v: p, label: phiTxt(p) }));
  return (
    <div data-base-face={nome}>
      <b className="small">Face {nome === 'inf' ? 'inferior' : 'superior'}</b>
      <div className="row wrap u-items-end">
        <Select label="Armadura base" value={ed.modo} options={[{ v: 'nenhuma', label: 'sem base' }, { v: 'barras', label: 'barras' }, { v: 'tela', label: 'tela soldada' }]} onChange={(v) => set({ ...ed, modo: v as Modo })} />
        {ed.modo === 'barras' && [0, 1].map((k) => (
          <span key={k} className="row wrap u-items-end">
            <Select label={`Direção ${k} φ`} value={ed.phi[k]} options={op} onChange={(v) => set({ ...ed, phi: k ? [ed.phi[0], v] : [v, ed.phi[1]] })} />
            <NumField label={`c/ (cm)`} width={80} value={ed.s[k]} onChange={(v) => set({ ...ed, s: k ? [ed.s[0], v] : [v, ed.s[1]] })} />
          </span>
        ))}
        {ed.modo === 'tela' && (
          <>
            <Select label="Tela (NBR 7481)" value={ed.tela} options={TELAS.map((t) => ({ v: t.id, label: `${t.id} · ${fmt(t.AsL)} cm²/m` }))} onChange={(v) => set({ ...ed, tela: v })} />
            <Check label="Girar os fios" checked={ed.giro} onChange={(v) => set({ ...ed, giro: v })} />
          </>
        )}
      </div>
    </div>
  );
}

export function BaseLaje({ l }: { l: Laje }) {
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const h = l.tipo.tipo === 'macica' ? l.tipo.h : 0.12, bitolas = linhaLajes(tabelaDe(b, 'lajes', l.tabela), h).bitolas.filter((p) => p >= 5);
  const phi0 = bitolas.includes(8) ? 8 : bitolas[0] ?? 8;
  const chave = JSON.stringify(l.base ?? null);
  const [inf, setInf] = useState(() => faceInicial(l.base?.inf, phi0)), [sup, setSup] = useState(() => faceInicial(l.base?.sup, phi0));
  const [det, setDet] = useState<'opcao' | 'sim' | 'nao'>(l.base?.detalhada === undefined ? 'opcao' : l.base.detalhada ? 'sim' : 'nao');
  const [todas, setTodas] = useState(false), [vista, setVista] = useState(chave);
  if (vista !== chave) { setVista(chave); setInf(faceInicial(l.base?.inf, phi0)); setSup(faceInicial(l.base?.sup, phi0)); setDet(l.base?.detalhada === undefined ? 'opcao' : l.base.detalhada ? 'sim' : 'nao'); }
  const ids = todas ? b.lajes.filter((x) => x.tipo.tipo === 'macica' && x.grupo === l.grupo).map((x) => x.id) : [l.id];
  const aplicar = () => executarERecalcular('laje.armaduraBase', {
    ids,
    ...(inf.modo !== 'nenhuma' ? { inf: paraComando(inf) } : {}), ...(sup.modo !== 'nenhuma' ? { sup: paraComando(sup) } : {}),
    remover: [...(inf.modo === 'nenhuma' ? ['inf'] : []), ...(sup.modo === 'nenhuma' ? ['sup'] : [])],
    ...(det === 'opcao' ? { detalhadaPadrao: true } : { detalhada: det === 'sim' }),
  });
  return (
    <section data-base-laje={l.id}>
      <h4>Armadura base {l.base && <Pill tone="warn" data-base-definida>definida</Pill>}</h4>
      <p className="small">Malha de barras ou tela soldada (painéis de {fmt(PAINEL_TELA.largura)} × {fmt(PAINEL_TELA.comprimento)} m) nas faces. A base é sempre colaborante: o reforço é a armadura necessária menos a base; onde a base basta, não há reforço nem negativo. Direção 0 = maior aresta do pano. Não detalhada, só a indicação (φ c/ s ou a tela) vai ao desenho e fora do quantitativo.</p>
      <FaceEditor nome="inf" ed={inf} set={setInf} bitolas={bitolas} />
      <FaceEditor nome="sup" ed={sup} set={setSup} bitolas={bitolas} />
      <div className="row wrap u-items-end">
        <Select label="Detalhar a base" value={det} options={[{ v: 'opcao', label: 'conforme as opções' }, { v: 'sim', label: 'sim (desenhar e medir)' }, { v: 'nao', label: 'não (só indicar)' }]} onChange={setDet} />
        <Check label="Aplicar às lajes maciças do pavimento" checked={todas} onChange={setTodas} />
        <Button variant="primary" disabled={calculando} onClick={aplicar} data-base-aplicar>Aplicar base</Button>
        <Button disabled={calculando || !l.base} onClick={() => executarERecalcular('laje.armaduraBase', { ids, remover: ['inf', 'sup'], detalhadaPadrao: true })}>Remover base</Button>
      </div>
      <Predefinidas l={l} bitolas={bitolas} />
    </section>
  );
}

const PRE0 = { face: 'sup' as 'inf' | 'sup', x: 0, y: 0, angulo: 0, comprimento: 2, phi: 8, s: 15, n: 5 };

function Predefinidas({ l, bitolas }: { l: Laje; bitolas: number[] }) {
  const calculando = useBuilding((s) => s.calculando);
  const [f, setF] = useState(() => { const xs = l.contorno.map((p) => p[0]), ys = l.contorno.map((p) => p[1]); return { ...PRE0, x: +((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(2), y: +((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(2) }; });
  const [edit, setEdit] = useState<string | undefined>();
  const lista = l.predefinidas ?? [];
  const carregar = (x: ArmaduraPredefinida) => { setEdit(x.id); setF({ face: x.face, x: x.a[0], y: x.a[1], angulo: x.angulo, comprimento: x.comprimento, phi: x.phi, s: +(x.s * 100).toFixed(1), n: x.n }); };
  const params = () => ({ id: l.id, face: f.face, a: [f.x, f.y], angulo: f.angulo, comprimento: f.comprimento, phi: f.phi, s: f.s / 100, n: Math.max(1, Math.round(f.n)) });
  return (
    <div data-predefinidas-laje={l.id}>
      <h4>Armaduras predefinidas</h4>
      <p className="small">Barra representativa a partir do ponto (m, planta) na direção dada (graus, 0 = +x), com o comprimento total; as demais barras ficam à esquerda, espaçadas de s. A faixa de influência é n × s: nela o reforço calculado é reduzido do que a predefinida fornece. É medida como lançada.</p>
      {lista.length > 0 && (
        <div className="tablewrap">
          <table className="data quadro" data-tabela-predefinidas>
            <thead><tr><th>Face</th><th>Ponto (m)</th><th>Ângulo</th><th>C (m)</th><th>Barras</th><th /></tr></thead>
            <tbody>{lista.map((x) => (
              <tr key={x.id} data-predefinida={x.id}>
                <td className="tl">{x.face === 'inf' ? 'inferior' : 'superior'}</td><td className="num">{fmt(x.a[0])} ; {fmt(x.a[1])}</td><td className="num">{fmt(x.angulo, 0)}°</td><td className="num">{fmt(x.comprimento)}</td>
                <td className="tl">{x.n} {phiTxt(x.phi)} c/{fmt(x.s * 100, 0)}</td>
                <td><Button variant="ghost" onClick={() => carregar(x)}>Editar</Button> <Button variant="danger" disabled={calculando} onClick={() => { if (edit === x.id) setEdit(undefined); void executarERecalcular('laje.armaduraPredefinida', { id: l.id, acao: 'remover', predefinida: x.id }); }}>Remover</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="row wrap u-items-end" data-predefinida-form>
        <Select label="Face" value={f.face} options={[{ v: 'inf', label: 'inferior' }, { v: 'sup', label: 'superior' }]} onChange={(v) => setF({ ...f, face: v })} />
        <NumField label="x (m)" width={80} value={f.x} onChange={(v) => setF({ ...f, x: v })} />
        <NumField label="y (m)" width={80} value={f.y} onChange={(v) => setF({ ...f, y: v })} />
        <NumField label="Ângulo (°)" width={80} value={f.angulo} onChange={(v) => setF({ ...f, angulo: v })} />
        <NumField label="Comprimento (m)" width={100} value={f.comprimento} onChange={(v) => setF({ ...f, comprimento: Math.max(0.2, v) })} />
        <Select label="φ" value={f.phi} options={bitolas.map((p) => ({ v: p, label: phiTxt(p) }))} onChange={(v) => setF({ ...f, phi: v })} />
        <NumField label="c/ (cm)" width={70} value={f.s} onChange={(v) => setF({ ...f, s: Math.max(5, Math.min(33, v)) })} />
        <NumField label="Nº de barras" width={90} value={f.n} onChange={(v) => setF({ ...f, n: Math.max(1, Math.round(v)) })} />
        <Button variant="primary" disabled={calculando} data-predefinida-aplicar onClick={() => { void executarERecalcular('laje.armaduraPredefinida', edit ? { ...params(), acao: 'editar', predefinida: edit } : { ...params(), acao: 'criar' }); setEdit(undefined); }}>{edit ? 'Salvar predefinida' : 'Adicionar predefinida'}</Button>
        {edit && <Button variant="ghost" onClick={() => setEdit(undefined)}>Cancelar edição</Button>}
      </div>
    </div>
  );
}
