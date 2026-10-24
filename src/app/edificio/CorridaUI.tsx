// Sapata corrida (frente FU7a, interface): bloco "Sapatas corridas" do grupo Fundação (ferramenta da planta, parâmetros do
// lançamento e das opções, lista com resultados e edição da selecionada) e a janela do elemento (corte transversal com as
// barras, pressão, flexão transversal, armadura de distribuição e, sob pilares, a viga sobre base elástica). Toda alteração é
// comando (`corrida.*`, `opcoes.definir`); sob pilares muda a análise da estrutura, sob parede só as fundações.
import { useBuilding, calculoAtual } from './store';
import { usePlanta } from './plantaStore';
import { classificar } from '../../core/building/revisao';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import { corridaEfetiva, pilaresDaCorrida } from '../../core/building/baseElastica';
import { comprimentoCorrida, modoCorrida, type ResultadoCorrida } from '../../core/building/sapataCorrida';
import { secaoCinta } from '../../core/building/cintasCorrida';
import type { AbaCorrida, BuildingModel, SapataCorrida } from '../../core/building/types';
import { Button, Check, Group, Hint, KV, NumField, OptNumField, Pill, Select, TextField } from '../ui';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const cm = (v: number) => Math.round(v * 100);
const ABAS: { v: AbaCorrida; label: string }[] = [{ v: 'ambas', label: 'Abas dos dois lados' }, { v: 'esq', label: 'Aba à esquerda (apoio na divisa à direita)' }, { v: 'dir', label: 'Aba à direita (apoio na divisa à esquerda)' }];

/** Abre a janela da sapata corrida (tipo 'fundacao', distinguido pelo id). */
const abrir = (id: string) => usePlanta.getState().set({ janela: { tipo: 'fundacao', id } });
const irPara = (id: string) => usePlanta.getState().set({ pavimento: 'fundacao', selecao: new Set([id]), foco: { id, n: Date.now() } });

/** O id é de uma sapata corrida? */
export const ehCorrida = (b: BuildingModel, id: string) => !!b.fundacao?.corridas?.some((x) => x.id === id);

export function Mensagens({ msgs }: { msgs: string[] }) {
  if (!msgs.length) return <p className="muted small">Sem mensagens.</p>;
  return <ul className="revmsg">{msgs.map((m, i) => { const c = classificar(m); return <li key={i}><Pill tone={c.nivel === 'erro' ? 'bad' : c.nivel === 'aviso' ? 'warn' : 'na'}>{c.codigo}</Pill> {m}</li>; })}</ul>;
}

// ---------------------------------------------------------------- bloco do grupo Fundação

export function CorridaBloco({ b, onPlanta }: { b: BuildingModel; onPlanta: () => void }) {
  const { exec, dim } = useBuilding();
  const velha = useBuilding((s) => !!s.analise && !calculoAtual(s));
  const pl = usePlanta();
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const cs = b.fundacao?.corridas ?? [];
  const sel = cs.find((x) => pl.selecao.has(x.id));
  const lanc = pl.corridaLanc, setL = (p: Partial<typeof lanc>) => pl.set({ corridaLanc: { ...lanc, ...p } });
  const res = (id: string) => dim?.corridas?.find((x) => x.id === id);
  const opc = (chave: string, v: number) => exec('opcoes.definir', { valores: { [chave]: v } });
  return (
    <div data-corridas>
      <p className="small"><b>Sapatas corridas ({cs.length})</b></p>
      <div className="row wrap">
        <Button variant={pl.ferramenta === 'corrida' ? 'primary' : 'default'} data-ferramenta-corrida onClick={() => { pl.set({ ferramenta: 'corrida', pavimento: 'fundacao', selecao: new Set() }); onPlanta(); }}>Desenhar sapata corrida (A)</Button>
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Largura do apoio (bw)" unit="m" width={150} value={lanc.bw} onChange={(v) => v >= 0.1 && v <= 2 && setL({ bw: v })} />
        <Select label="Aba" value={lanc.aba} options={ABAS} onChange={(v) => setL({ aba: v })} />
        <NumField label="Largura B (0 = pela σadm)" unit="m" width={170} value={lanc.B} onChange={(v) => v >= 0 && setL({ B: v })} />
      </div>
      <div className="row wrap">
        <Check label="Apoio de alvenaria" checked={lanc.alvenaria} onChange={(v) => setL({ alvenaria: v })} />
        <Check label="Aba de um lado: equilibrada por cintas" checked={lanc.equilibrio} onChange={(v) => setL({ equilibrio: v })} />
      </div>
      <Hint>
        Sob parede (sem pilares sobre o eixo): a carga por metro vem das cargas lineares, pontuais e de área lançadas no nível de fundação sobre o eixo; largura pela σadm, altura rígida, flexão transversal CEB-70 e armadura de distribuição.
        Com pilares sobre o eixo: viga sobre base elástica na análise global (k padrão do grupo Radier; largura e altura padrão abaixo). Aba de um lado exige cintas (vigas de equilíbrio).
      </Hint>
      {velha && cs.length > 0 && <p className="hint bad">A estrutura mudou depois do cálculo: recalcule o edifício (aba Dimensionamento) para atualizar as sapatas corridas sob pilares.</p>}
      <Group title="Parâmetros das sapatas corridas (a confirmar)" open={false}>
        <div className="row wrap u-items-end">
          <NumField label="Largura mínima B" unit="m" width={130} value={op.corridaBMin} onChange={(v) => opc('corridaBMin', v)} />
          <NumField label="Sob pilares: B padrão" unit="m" width={140} value={op.corridaBPadrao} onChange={(v) => opc('corridaBPadrao', v)} />
          <NumField label="Sob pilares: h padrão" unit="m" width={140} value={op.corridaHPadrao} onChange={(v) => opc('corridaHPadrao', v)} />
        </div>
        <div className="row wrap u-items-end">
          <NumField label="Seção de referência (concreto)" unit="% bw" width={190} value={op.corridaRefConcreto} onChange={(v) => opc('corridaRefConcreto', v)} />
          <NumField label="Seção de referência (alvenaria)" unit="% bw" width={190} value={op.corridaRefAlvenaria} onChange={(v) => opc('corridaRefAlvenaria', v)} />
          <NumField label="Distribuição mínima" unit="% da principal" width={170} value={op.corridaDistribuicao} onChange={(v) => opc('corridaDistribuicao', v)} />
          <NumField label="Janela da carga linear" unit="m" width={150} value={op.corridaJanela} onChange={(v) => opc('corridaJanela', v)} />
        </div>
        <div className="row wrap u-items-end" data-corrida-deslizamento>
          <NumField label="μ da base da parede (a confirmar)" width={190} value={op.fundCorridaAtrito} onChange={(v) => opc('fundCorridaAtrito', v)} />
          <NumField label="FS mínimo ao deslizamento (parede)" width={190} value={op.fundCorridaFSDesliz} onChange={(v) => opc('fundCorridaFSDesliz', v)} />
          <Check label="Reprovar o deslizamento (parede)" checked={op.fundCorridaDeslizamento === 1} onChange={(v) => opc('fundCorridaDeslizamento', v ? 1 : 0)} />
        </div>
        <div className="row wrap u-items-end" data-corrida-mola-parede>
          <NumField label="k das molas da base da parede (0 = engaste; a confirmar)" unit="kN/m³" width={230} value={op.fundParedeK} onChange={(v) => opc('fundParedeK', v)} />
          <NumField label="Balanço de cada lado das molas da parede (B não informada)" unit="cm" width={230} value={op.fundParedeAba} onChange={(v) => opc('fundParedeAba', v)} />
          <Check label="Vigas embutidas em parede de concreto: armadura própria (mínimos)" checked={op.paredeVigaEmbutida === 1} onChange={(v) => opc('paredeVigaEmbutida', v ? 1 : 0)} />
        </div>
        <Hint>O k das sapatas sob pilares é o do grupo Radier e vigas sobre base elástica (padrão 100 000 kN/m³, a confirmar). Mudar B, h ou k sob pilares refaz a análise do edifício. A base da parede e do pilar-parede sobre sapata corrida entra na análise com molas de Winkler (k alto, vertical k·B e giro k·B³/12 por metro, FU7c); k = 0 volta ao engaste.</Hint>
      </Group>
      {cs.length > 0 && (
        <div className="tablewrap">
          <table className="data loads-ed quadro" data-corridas-tabela>
            <thead><tr><th>Sapata</th><th>Modo</th><th>B × h / h0 (cm)</th><th>Armadura</th><th>σmáx / σadm (kN/m²)</th><th /></tr></thead>
            <tbody>{cs.map((c) => {
              const r = res(c.id), g = corridaEfetiva(b, c, op), modo = modoCorrida(b, c);
              return (
                <tr key={c.id} className={`click ${pl.selecao.has(c.id) ? 'on ' : ''}${r?.status === 'fail' ? 'bad' : ''}`} data-corrida-id={c.id} onClick={() => irPara(c.id)} onDoubleClick={() => abrir(c.id)} title="Clique: ver na planta. Duplo clique: resultados.">
                  <td className="tl">{c.nome}</td>
                  <td className="tl">{modo === 'pilares' ? 'sob pilares' : c.parede ? `parede ${b.paredes?.find((q) => q.id === c.parede)?.nome ?? ''}` : 'sob parede'}</td>
                  <td className="num">{r ? `${cm(r.B)} × ${cm(r.h)} / ${cm(r.h0)}` : `${cm(g.B)}${c.B === undefined ? '*' : ''} × ${c.h !== undefined ? cm(c.h) : '—'}`}</td>
                  <td className="tl small">{r?.transversal?.barras ? `φ${fmt(r.transversal.barras.phi, 1)} c/${cm(r.transversal.barras.s)}` : <span className="muted">não calculada</span>}</td>
                  <td className="num">{r?.pressao ? `${fmt(r.pressao.sigmaMax, 1)} / ${r.sigmaAdm ? fmt(r.sigmaAdm, 0) : '—'}` : '—'}</td>
                  <td>{r && <Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'ok' : 'erro'}</Pill>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      {sel && <CorridaEditor b={b} c={sel} r={res(sel.id)} />}
    </div>
  );
}

function CorridaEditor({ b, c, r }: { b: BuildingModel; c: SapataCorrida; r?: ResultadoCorrida }) {
  const { exec } = useBuilding();
  const ed = (p: Record<string, unknown>) => exec('corrida.editar', { id: c.id, ...p });
  const nPil = pilaresDaCorrida(b, c).length;
  return (
    <div data-editor-corrida={c.id}>
      <p className="small"><b>Sapata corrida {c.nome}</b> — {nPil ? `${nPil} pilar(es) sobre o eixo: viga sobre base elástica` : 'sob parede'}</p>
      <div className="row wrap u-items-end">
        <TextField label="Nome" value={c.nome} onChange={(v) => v.trim() && ed({ nome: v })} />
        {c.parede ? <p className="muted small" data-corrida-parede={c.parede}>Sapata da parede {b.paredes?.find((q) => q.id === c.parede)?.nome ?? ''}: o eixo e a largura do apoio seguem a parede (edite a base em Paredes).</p> : <NumField label="bw" unit="m" width={80} value={c.bw} onChange={(v) => ed({ bw: v })} />}
        <Select label="Aba" value={c.aba} options={ABAS} onChange={(v) => ed({ aba: v })} />
      </div>
      <div className="row wrap u-items-end">
        <OptNumField label={nPil ? 'B (vazio = padrão)' : 'B (vazio = pela σadm)'} unit="m" width={150} value={c.B} onChange={(v) => ed(v === undefined ? { limpar: ['B'] } : { B: v })} />
        <OptNumField label="h (vazio = calculada)" unit="m" width={150} value={c.h} onChange={(v) => ed(v === undefined ? { limpar: ['h'] } : { h: v })} />
        <OptNumField label="h0 (vazio = calculada)" unit="m" width={150} value={c.h0} onChange={(v) => ed(v === undefined ? { limpar: ['h0'] } : { h0: v })} />
      </div>
      <div className="row wrap u-items-end">
        <OptNumField label="σadm (vazio = terreno)" unit="kN/m²" width={150} value={c.sigmaAdm} onChange={(v) => ed(v === undefined ? { limpar: ['sigmaAdm'] } : { sigmaAdm: v })} />
        {nPil > 0 && <OptNumField label="k (vazio = padrão)" unit="kN/m³" width={150} value={c.k} onChange={(v) => ed(v === undefined ? { limpar: ['k'] } : { k: v })} />}
        <OptNumField label="Cota de assentamento" unit="m" width={150} value={c.cota} onChange={(v) => ed(v === undefined ? { limpar: ['cota'] } : { cota: v })} />
      </div>
      <div className="row wrap">
        <Check label="Apoio de alvenaria" checked={!!c.alvenaria} onChange={(v) => ed({ alvenaria: v })} />
        <Check label="Aba de um lado: equilibrada por cintas" checked={!!c.equilibrio} onChange={(v) => ed({ equilibrio: v })} />
      </div>
      <CintasEditor b={b} c={c} r={r} nPil={nPil} />
      <div className="row wrap">
        <Button disabled={!r} onClick={() => abrir(c.id)}>Resultados da sapata corrida</Button>
        <Button variant="danger" onClick={() => exec('corrida.remover', { ids: [c.id] })}>Remover</Button>
      </div>
    </div>
  );
}

/** Cintas (FU8a): vigas de equilíbrio da aba de um lado só, do eixo da corrida a elementos internos (só sob parede). */
function CintasEditor({ b, c, r, nPil }: { b: BuildingModel; c: SapataCorrida; r?: ResultadoCorrida; nPil: number }) {
  const { exec } = useBuilding();
  if (c.aba === 'ambas' || nPil > 0) return <p className="muted small" data-cintas-nao>Cintas: só sapata corrida sob parede com aba de um lado (apoio rente à divisa).</p>;
  const pontas = [
    ...(b.fundacao?.elementos ?? []).map((e) => ({ v: e.id, label: e.nome })),
    ...b.pilares.filter((p) => p.nasce === 'fundacao' && !b.fundacao?.elementos.some((e) => e.pilares.includes(p.id))).map((p) => ({ v: p.id, label: `pilar ${p.nome}` })),
  ];
  const L = comprimentoCorrida(c.pontos), cs = c.cintas ?? [];
  const res = (id: string) => r?.cintas?.find((x) => x.id === id);
  return (
    <div data-cintas={c.id}>
      <p className="small"><b>Cintas ({cs.length})</b> — vigas de equilíbrio até sapatas internas; cada cinta toma o momento N·e do seu trecho e alivia o elemento da ponta.</p>
      {cs.map((ct) => {
        const x = res(ct.id), ed = (p: Record<string, unknown>) => exec('cinta.editar', { id: ct.id, ...p });
        return (
          <div key={ct.id} className="row wrap u-items-end" data-cinta-id={ct.id}>
            <TextField label="Nome" value={ct.nome} onChange={(v) => v.trim() && ed({ nome: v })} />
            <NumField label={`s (0 a ${fmt(L)})`} unit="m" width={110} value={ct.s} onChange={(v) => v >= 0 && v <= L && ed({ s: v })} />
            <Select label="Ponta interna" value={ct.fim} options={pontas.some((q) => q.v === ct.fim) ? pontas : [{ v: ct.fim, label: ct.fim }, ...pontas]} onChange={(v) => ed({ fim: v })} />
            <NumField label="b" unit="m" width={80} value={ct.b} onChange={(v) => v >= 0.1 && ed({ b: v })} />
            <NumField label="h" unit="m" width={80} value={ct.h} onChange={(v) => v >= 0.2 && ed({ h: v })} />
            <Check label="Seção fixa" checked={!!ct.fixa} onChange={(v) => ed({ fixa: v })} />
            {x && <Pill tone={x.status === 'ok' ? 'ok' : 'bad'}>{secaoCinta(x)} · ΔN {fmt(x.dN, 0)} kN</Pill>}
            <Button variant="danger" onClick={() => exec('cinta.remover', { ids: [ct.id] })}>Remover</Button>
          </div>
        );
      })}
      <div className="row wrap">
        <Button data-add-cinta disabled={!pontas.length} onClick={() => exec('cinta.criar', { corrida: c.id, s: +(cs.length ? Math.min(L, Math.max(...cs.map((q) => q.s)) + 2) : L / 2).toFixed(2), fim: pontas[0].v })}>Adicionar cinta</Button>
      </div>
      {!pontas.length && <p className="hint">Lance antes uma sapata (ou arranque) interna para servir de ponta.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- janela do elemento

/** Corte transversal esquemático: perfil, barras transversais e de distribuição, cotas (altura exagerada só pela escala única). */
function CorteCorrida({ r }: { r: ResultadoCorrida }) {
  const W = 420, m = 26, esc = Math.min((W - 2 * m) / r.B, 160 / Math.max(r.h, 0.2)), hS = r.h * esc, H = hS + 2 * m + 18;
  const X = (x: number) => (m + x * esc).toFixed(1), Y = (y: number) => (m + hS - y * esc).toFixed(1); // y para cima, a partir do fundo
  const xL = r.aba === 'ambas' ? (r.B - r.bw) / 2 : r.aba === 'esq' ? 0 : r.B - r.bw, xR = xL + r.bw;
  const temEsq = xL > 1e-6, temDir = xR < r.B - 1e-6;
  const pts: [number, number][] = r.modo === 'pilares'
    ? [[0, 0], [r.B, 0], [r.B, r.h0], ...(temDir ? [[xR, r.h0] as [number, number]] : []), [xR, r.h], [xL, r.h], ...(temEsq ? [[xL, r.h0] as [number, number]] : []), [0, r.h0]]
    : [[0, 0], [r.B, 0], ...(temDir ? [[r.B, r.h0], [xR, r.h]] as [number, number][] : [[r.B, r.h]] as [number, number][]), [xL, r.h], ...(temEsq ? [[0, r.h0]] as [number, number][] : [])];
  const t = r.transversal, bt = t?.barras, bd = t?.distribuicao.barras, cob = 0.05;
  const nAc = bd ? Math.floor((r.B - 2 * cob) / bd.s + 1e-9) + 1 : 0;
  const rr = (phi: number) => Math.max(1.6, (phi / 2000) * esc);
  return (
    <svg className="det det-secao" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label={`Corte transversal da sapata corrida ${r.nome}`} data-corte-corrida={r.id}>
      <path d={pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0])},${Y(q[1])}`).join('') + 'Z'} className="det-contorno" />
      <path d={`M${X(xL)},${Y(r.h)}L${X(xL)},${(m - 10).toFixed(1)}M${X(xR)},${Y(r.h)}L${X(xR)},${(m - 10).toFixed(1)}`} className="det-nivel" />
      {bt && <path d={`M${X(cob)},${Y(cob + bt.phi / 2000)}L${X(r.B - cob)},${Y(cob + bt.phi / 2000)}`} className="det-barra inf" />}
      {bd && Array.from({ length: Math.min(nAc, 40) }, (_, i) => <circle key={i} cx={X(cob + i * bd.s)} cy={Y(cob + (bt ? bt.phi / 1000 : 0.01) + bd.phi / 2000)} r={rr(bd.phi)} className="det-pt inf" />)}
      <path d={`M${X(0)},${(H - 16).toFixed(1)}L${X(r.B)},${(H - 16).toFixed(1)}`} className="det-cota" />
      <text x={X(r.B / 2)} y={H - 4} textAnchor="middle" className="det-txt cota">B = {cm(r.B)} cm · bw = {cm(r.bw)} cm · h = {cm(r.h)}{r.h0 < r.h ? ` / h0 = ${cm(r.h0)}` : ''} cm</text>
      {bt && <text x={X(r.B / 2)} y={(m + hS + 12).toFixed(1)} textAnchor="middle" className="det-txt inf">φ{fmt(bt.phi, 1)} c/{cm(bt.s)} (transversal){bd ? ` · φ${fmt(bd.phi, 1)} c/${cm(bd.s)} (distribuição)` : ''}</text>}
    </svg>
  );
}

export function JanelaCorrida({ id }: { id: string }) {
  const b = useBuilding((s) => s.sessao.modelo), dim = useBuilding((s) => s.dim);
  const atual = useBuilding((s) => calculoAtual(s));
  const r = dim?.corridas?.find((x) => x.id === id);
  if (!ehCorrida(b, id)) return <p className="muted">O elemento não existe mais.</p>;
  if (!r) return <p className="muted">Calcule o edifício (aba Dimensionamento) para ver os resultados da sapata corrida.</p>;
  const t = r.transversal, lg = r.longitudinal;
  return (
    <div data-janela-corrida={id}>
      {!atual && <p className="hint bad">Os resultados são anteriores a uma alteração: recalcule o edifício.</p>}
      <div className="row wrap u-items-center">
        <Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'atende' : 'não atende'}</Pill>
        <Pill tone="na">{r.modo === 'pilares' ? 'Sob pilares (viga sobre base elástica)' : 'Sob parede (rígida)'}</Pill>
        <Pill tone="na">{r.aba === 'ambas' ? 'abas dos dois lados' : r.aba === 'esq' ? 'aba à esquerda' : 'aba à direita'}{r.equilibrio ? ' · cintas' : ''}</Pill>
      </div>
      <KV rows={[
        ['Base B × bw', `${cm(r.B)} × ${cm(r.bw)} cm${r.fixa ? ' (imposta)' : ''}`],
        ['Altura h / aba h0', `${cm(r.h)} / ${cm(r.h0)} cm · rígida ≥ ${cm(r.hRigido)} cm: ${r.rigida ? 'sim' : 'não (flexível)'}`],
        ['Comprimento', `${fmt(r.L)} m · cota ${fmt(r.cota)} m (df = ${fmt(r.profundidade)} m)`],
        ...(r.carga ? [['Carga por metro', `Nk ${fmt(r.carga.Nk, 1)} · Nd ${fmt(r.carga.Nd, 1)} · peso próprio ${fmt(r.carga.W, 1)} kN/m (${r.carga.comb})`]] as [string, string][] : []),
        ...(r.parede ? [
          ['Parede', `${r.parede.nome}${r.parede.virtual ? ' (sapata derivada da base da parede)' : ''} · cargas ${r.parede.origem === 'reacoes' ? 'das reações da base na análise' : 'só as lançadas no nível de fundação'}`],
          ['Momento fora do plano', `${fmt(r.parede.M, 1)} kN·m/m · excentricidade M/N ${fmt(r.parede.eM * 100, 0)} cm`],
          ['Cortante normal à parede', `${fmt(r.parede.H, 1)} kN/m`],
          ...(r.parede.deslizamento ? [['Deslizamento', `FS ${fmt(r.parede.deslizamento.FS)} (mín. ${fmt(r.parede.deslizamento.FSmin, 1)}; μ ${fmt(r.parede.deslizamento.mu)}) em ${r.parede.deslizamento.comb}`]] as [string, string][] : []),
          ...(r.parede.pilaresEq ?? []).map((q): [string, string] => [`Pilar ${q.pilar} sobre a parede`, `Nk ${fmt(q.Nk, 0)} kN → sapata isolada equivalente ${fmt(q.a)} × ${fmt(q.a)} m (${q.rege ? 'coberta pela largura B' : 'B menor: aumente B'})`]),
        ] as [string, string][] : []),
        ...(r.pressao ? [['σ máx. / mín. (raras)', `${fmt(r.pressao.sigmaMax, 1)} / ${fmt(r.pressao.sigmaMin, 1)} kN/m² · σadm ${r.sigmaAdm ? fmt(r.sigmaAdm, 0) : '—'} kN/m²`]] as [string, string][] : []),
        ...(t ? [
          ['Flexão transversal', `${t.metodo === 'bielas' ? 'bielas' : 'CEB-70'}: balanço ${fmt(t.balanco)} m, seção a ${fmt(t.l)} m da borda, Md = ${fmt(t.Md, 1)} kN·m/m`],
          ['As transversal', `${fmt(t.As)} calc. · ${fmt(t.AsMin)} mín. · ${fmt(t.AsAdot)} cm²/m → ${t.barras ? `φ${fmt(t.barras.phi, 1)} c/${cm(t.barras.s)}` : 'não coube'}`],
          ['Distribuição (longitudinal)', `${fmt(t.distribuicao.As)} cm²/m → ${t.distribuicao.barras ? `φ${fmt(t.distribuicao.barras.phi, 1)} c/${cm(t.distribuicao.barras.s)}` : '—'}`],
          ...(t.cortante ? [['Cortante a d da face', `Vd ${fmt(t.cortante.Vd, 1)} · VRd1 ${fmt(t.cortante.VRd1, 1)} kN/m`]] as [string, string][] : []),
        ] as [string, string][] : []),
        ...(r.cinta !== undefined ? [['Momento das cintas', `${fmt(r.cinta, 1)} kN·m por metro (N·e)${r.cintas?.length ? '' : ' — sem cintas lançadas'}`]] as [string, string][] : []),
        ...((r.cintas ?? []).flatMap((x) => [
          [`Cinta ${x.nome}`, `${secaoCinta(x)} cm · ℓ ${fmt(x.L)} m · trecho s ${fmt(x.tributario[0])}–${fmt(x.tributario[1])} m: N ${fmt(x.N, 1)} → R ${fmt(x.R, 1)} kN (×${fmt(x.fator, 3)}) · alívio ΔN ${fmt(x.dN, 1)} kN em ${x.fim}`],
          [`Cinta ${x.nome}: armadura`, `Md ${fmt(x.Md.sup, 1)} (sup.) / ${fmt(x.Md.inf, 1)} (inf.) kN·m · Vd ${fmt(x.Vd, 1)} kN · ${x.resumo}`],
        ]) as [string, string][]),
        ...(lg ? [
          ['Viga: Md inf. / sup.', `${fmt(lg.Md.inf, 1)} / ${fmt(lg.Md.sup, 1)} kN·m · Vd ${fmt(lg.Vd, 1)} kN`],
          ['Viga: armadura', `inf. ${lg.armadura.inf.barras ? `${lg.armadura.inf.barras.n} φ${fmt(lg.armadura.inf.barras.phi, 1)}` : '—'}; sup. ${lg.armadura.sup.barras ? `${lg.armadura.sup.barras.n} φ${fmt(lg.armadura.sup.barras.phi, 1)}` : '—'}${lg.armadura.estribo ? `; estribo φ${fmt(lg.armadura.estribo.phi, 1)} c/${cm(lg.armadura.estribo.s)}` : ''}`],
          ['Maior recalque', `${fmt(lg.recalque * 1000, 2)} mm`],
        ] as [string, string][] : []),
        ['Concreto / forma / aço', `${fmt(r.volume, 2)} m³ · ${fmt(r.forma, 1)} m² · ${fmt(r.aco, 0)} kg (sem perdas)`],
      ]} />
      <Mensagens msgs={r.mensagens} />
      <p className="small"><b>Corte transversal</b></p>
      <CorteCorrida r={r} />
      {r.notas.map((n, i) => <p key={i} className="muted small">{n}</p>)}
    </div>
  );
}
