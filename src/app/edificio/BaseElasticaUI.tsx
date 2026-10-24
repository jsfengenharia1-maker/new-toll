// Base elástica (frente FU6, interface): bloco "Radier e vigas sobre base elástica" do grupo Fundação (ferramentas da
// planta, k padrão e malha, tabela orientativa de k, lista com resultados e edição do selecionado) e a janela do
// elemento (tensões no solo e recalques por nó num mapa simples, armadura e mensagens). Toda alteração é comando
// (`radier.*`, `vigaElastica.*`, `opcoes.definir`); muda a análise da estrutura (recalcular o edifício).
import { useBuilding, calculoAtual } from './store';
import { usePlanta } from './plantaStore';
import { classificar } from '../../core/building/revisao';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import { TABELA_K, radierSemCarga, vigasElasticasEf, type NoResultadoBase, type ResultadoRadier, type ResultadoVigaElastica } from '../../core/building/baseElastica';
import { faixaVigaElastica } from '../../core/sheets/fundacaoRadier';
import { CartaoPuncao } from './Puncao';
import { CampoFormaVF } from './FormaVFUI';
import { centroPilar, contornoPilar, type BuildingModel } from '../../core/building/types';
import { useState } from 'react';
import { Button, Group, Hint, KV, NumField, OptNumField, Pill, TextField } from '../ui';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');

/** Abre a janela do radier ou da viga sobre base elástica (tipo 'fundacao', distinguido pelo id). */
const abrir = (id: string) => usePlanta.getState().set({ janela: { tipo: 'fundacao', id } });
const irPara = (id: string) => usePlanta.getState().set({ pavimento: 'fundacao', selecao: new Set([id]), foco: { id, n: Date.now() } });

/** O id é de um radier ou de uma viga sobre base elástica? */
export const ehBaseElastica = (b: BuildingModel, id: string) => !!(b.fundacao?.radiers?.some((x) => x.id === id) || b.fundacao?.vigasElasticas?.some((x) => x.id === id) || vigasElasticasEf(b).some((x) => x.parede && x.id === id));
/** Nome do radier ou da viga sobre base elástica. */
export const nomeBaseElastica = (b: BuildingModel, id: string) => [...(b.fundacao?.radiers ?? []), ...(b.fundacao?.vigasElasticas ?? []), ...vigasElasticasEf(b).filter((x) => x.parede)].find((x) => x.id === id)?.nome;

function Mensagens({ msgs }: { msgs: string[] }) {
  if (!msgs.length) return <p className="muted small">Sem mensagens.</p>;
  return <ul className="revmsg">{msgs.map((m, i) => { const c = classificar(m); return <li key={i}><Pill tone={c.nivel === 'erro' ? 'bad' : c.nivel === 'aviso' ? 'warn' : 'na'}>{c.codigo}</Pill> {m}</li>; })}</ul>;
}

/**
 * Radier sem carga do nível de fundação (C10.23): define a carga de área (G e Q) na hora, num só comando, e segue o cálculo do
 * edifício. Só aparece quando nenhuma carga do nível de fundação cai sobre o radier.
 */
function CargaRadier({ b, id }: { b: BuildingModel; id: string }) {
  const { exec, calcular } = useBuilding();
  const [g, setG] = useState(5), [q, setQ] = useState(2);
  const r = b.fundacao?.radiers?.find((x) => x.id === id);
  if (!r || !radierSemCarga(b, r)) return null;
  return (
    <div data-radier-sem-carga={id}>
      <p className="hint bad">Radier sem cargas do nível de fundação (só o peso próprio e os pilares): defina a carga de piso na hora e siga o cálculo.</p>
      <div className="row wrap u-items-end">
        <NumField label="Permanente G" unit="kN/m²" width={130} value={g} onChange={(v) => v >= 0 && setG(v)} />
        <NumField label="Variável Q" unit="kN/m²" width={130} value={q} onChange={(v) => v >= 0 && setQ(v)} />
        <Button variant="primary" data-definir-carga disabled={!(g > 0 || q > 0)} onClick={() => { exec('radier.carga', { id, ...(g > 0 ? { G: g } : {}), ...(q > 0 ? { Q: q } : {}) }); void calcular(); }}>Definir carga e seguir</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- bloco do grupo Fundação

export function BaseElasticaBloco({ b, onPlanta }: { b: BuildingModel; onPlanta: () => void }) {
  const { exec, dim } = useBuilding();
  const velha = useBuilding((s) => !!s.analise && !calculoAtual(s));
  const pl = usePlanta();
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const rads = b.fundacao?.radiers ?? [], ves = b.fundacao?.vigasElasticas ?? [];
  const ferr = (f: 'radier' | 'vigaElastica') => { pl.set({ ferramenta: f, pavimento: 'fundacao', selecao: new Set() }); onPlanta(); };
  const selR = rads.find((x) => pl.selecao.has(x.id)), selV = ves.find((x) => pl.selecao.has(x.id));
  const res = (id: string): ResultadoRadier | ResultadoVigaElastica | undefined => dim?.radiers?.find((x) => x.id === id) ?? dim?.vigasElasticas?.find((x) => x.id === id);
  return (
    <div data-base-elastica>
      <p className="small"><b>Radier e vigas sobre base elástica ({rads.length + ves.length})</b></p>
      <div className="row wrap">
        <Button variant={pl.ferramenta === 'radier' ? 'primary' : 'default'} data-ferramenta-radier onClick={() => ferr('radier')}>Desenhar radier (W)</Button>
        <Button variant={pl.ferramenta === 'vigaElastica' ? 'primary' : 'default'} onClick={() => ferr('vigaElastica')}>Desenhar viga sobre base elástica (X)</Button>
      </div>
      <div className="row wrap u-items-end">
        <NumField label="h do radier lançado" unit="m" width={140} value={pl.hRadier} onChange={(v) => v >= 0.1 && v <= 3 && pl.set({ hRadier: v })} />
        <NumField label="Viga: b" unit="m" width={90} value={pl.secaoVigaElastica.b} onChange={(v) => v >= 0.15 && pl.set({ secaoVigaElastica: { ...pl.secaoVigaElastica, b: v } })} />
        <NumField label="Viga: h" unit="m" width={90} value={pl.secaoVigaElastica.h} onChange={(v) => v >= 0.2 && pl.set({ secaoVigaElastica: { ...pl.secaoVigaElastica, h: v } })} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="k padrão (a confirmar)" unit="kN/m³" width={170} value={op.radierK} onChange={(v) => exec('opcoes.definir', { valores: { radierK: v } })} />
        <NumField label="Malha / divisão" unit="m" width={120} value={op.radierMalha} onChange={(v) => exec('opcoes.definir', { valores: { radierMalha: v } })} />
      </div>
      <Hint>
        Entram na análise global (pórtico espacial): molas de Winkler k × área de influência em cada nó; os pilares que nascem na fundação sobre eles ficam sem vínculo externo e não levam elemento próprio.
        Tensão no solo σ = k·w nas combinações raras contra a σadm (do elemento ou do terreno); mola tracionada é erro (sem iteração). Lançar, editar ou mudar k refaz a análise do edifício.
      </Hint>
      {velha && (rads.length > 0 || ves.length > 0) && <p className="hint bad">A estrutura mudou depois do cálculo: recalcule o edifício (aba Dimensionamento) para atualizar a base elástica.</p>}
      <Group title="Tabela orientativa do coeficiente de reação k (a confirmar)" open={false}>
        <div className="tablewrap">
          <table className="data quadro" data-tabela-k>
            <thead><tr><th>Solo</th><th>k (kN/m³)</th><th /></tr></thead>
            <tbody>{TABELA_K.map((x) => <tr key={x.solo}><td className="tl">{x.solo}</td><td className="num">{fmt(x.min, 0)} – {fmt(x.max, 0)}</td><td><Button variant="mini" onClick={() => exec('opcoes.definir', { valores: { radierK: Math.round((x.min + x.max) / 2000) * 1000 } })}>usar a média</Button></td></tr>)}</tbody>
          </table>
        </div>
        <Hint>Bowles, Foundation Analysis and Design (1996), Tabela 9-1: placa de 30 cm. O k real depende da dimensão da fundação e deve vir do geotécnico.</Hint>
      </Group>
      {(rads.length > 0 || ves.length > 0) && (
        <div className="tablewrap">
          <table className="data loads-ed quadro" data-bases-elasticas>
            <thead><tr><th>Elemento</th><th>Seção</th><th>k (kN/m³)</th><th>σmáx / σadm (kN/m²)</th><th>Recalque (mm)</th><th /></tr></thead>
            <tbody>{[...rads.map((x) => ({ id: x.id, nome: x.nome, sec: `radier h = ${fmt(x.h * 100, 0)} cm`, k: x.k })), ...ves.map((x) => ({ id: x.id, nome: x.nome, sec: `viga ${fmt(x.b * 100, 0)} × ${fmt(x.h * 100, 0)}`, k: x.k }))].map((x) => {
              const r = res(x.id);
              return (
                <tr key={x.id} className={`click ${pl.selecao.has(x.id) ? 'on ' : ''}${r?.status === 'fail' ? 'bad' : ''}`} data-base-id={x.id} onClick={() => irPara(x.id)} onDoubleClick={() => abrir(x.id)} title="Clique: ver na planta. Duplo clique: resultados.">
                  <td className="tl">{x.nome}</td>
                  <td className="tl">{x.sec}</td>
                  <td className="num">{x.k ? fmt(x.k, 0) : <span className="muted">padrão</span>}</td>
                  <td className="num">{r ? `${fmt(r.sigmaMax, 1)} / ${r.sigmaAdm ? fmt(r.sigmaAdm, 0) : '—'}` : <span className="muted">não calculado</span>}</td>
                  <td className="num">{r ? fmt(r.recalque * 1000, 2) : '—'}</td>
                  <td>{r && <Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'ok' : 'erro'}</Pill>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      {selR && (
        <div data-editor-radier={selR.id}>
          <p className="small"><b>Radier {selR.nome}</b></p>
          <div className="row wrap u-items-end">
            <TextField label="Nome" value={selR.nome} onChange={(v) => v.trim() && exec('radier.editar', { id: selR.id, nome: v })} />
            <NumField label="h" unit="m" width={90} value={selR.h} onChange={(v) => exec('radier.editar', { id: selR.id, h: v })} />
            <OptNumField label={`k (vazio = ${fmt(op.radierK, 0)})`} unit="kN/m³" width={170} value={selR.k} onChange={(v) => exec('radier.editar', v === undefined ? { id: selR.id, limpar: ['k'] } : { id: selR.id, k: v })} />
            <OptNumField label="σadm (vazio = terreno)" unit="kN/m²" width={150} value={selR.sigmaAdm} onChange={(v) => exec('radier.editar', v === undefined ? { id: selR.id, limpar: ['sigmaAdm'] } : { id: selR.id, sigmaAdm: v })} />
          </div>
          <CargaRadier b={b} id={selR.id} />
          <div className="row wrap">
            <Button disabled={!res(selR.id)} onClick={() => abrir(selR.id)}>Resultados do radier</Button>
            <Button variant="danger" onClick={() => exec('radier.remover', { ids: [selR.id] })}>Remover</Button>
          </div>
        </div>
      )}
      {selV && (
        <div data-editor-viga-elastica={selV.id}>
          <p className="small"><b>Viga sobre base elástica {selV.nome}</b></p>
          <div className="row wrap u-items-end">
            <TextField label="Nome" value={selV.nome} onChange={(v) => v.trim() && exec('vigaElastica.editar', { id: selV.id, nome: v })} />
            <NumField label="b" unit="m" width={80} value={selV.b} onChange={(v) => exec('vigaElastica.editar', { id: selV.id, b: v })} />
            <NumField label="h" unit="m" width={80} value={selV.h} onChange={(v) => exec('vigaElastica.editar', { id: selV.id, h: v })} />
            <OptNumField label={`k (vazio = ${fmt(op.radierK, 0)})`} unit="kN/m³" width={170} value={selV.k} onChange={(v) => exec('vigaElastica.editar', v === undefined ? { id: selV.id, limpar: ['k'] } : { id: selV.id, k: v })} />
            <OptNumField label="σadm (vazio = terreno)" unit="kN/m²" width={150} value={selV.sigmaAdm} onChange={(v) => exec('vigaElastica.editar', v === undefined ? { id: selV.id, limpar: ['sigmaAdm'] } : { id: selV.id, sigmaAdm: v })} />
          </div>
          <CampoFormaVF forma={selV.forma} bw={selV.b} h={selV.h} mesaPadrao="inferior" soloContato onChange={(f) => exec('vigaElastica.editar', { id: selV.id, forma: f })} />
          <div className="row wrap">
            <Button disabled={!res(selV.id)} onClick={() => abrir(selV.id)}>Resultados da viga</Button>
            <Button variant="danger" onClick={() => exec('vigaElastica.remover', { ids: [selV.id] })}>Remover</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- janela do elemento

/** Faixa de cor (0–4) do valor relativo; acima de 1 = n4. */
const faixa = (t: number) => (t <= 0.2 ? 0 : t <= 0.4 ? 1 : t <= 0.6 ? 2 : t <= 0.8 ? 3 : 4);

/** Mapa simples por nó: contorno do elemento, pilares e um círculo por nó com a cor da faixa (tensão ou recalque). */
function MapaPorNo({ b, id, nos, modo, escala: ref }: { b: BuildingModel; id: string; nos: NoResultadoBase[]; modo: 'tensao' | 'recalque'; escala: number }) {
  const r = b.fundacao?.radiers?.find((x) => x.id === id), v = vigasElasticasEf(b).find((x) => x.id === id && (x.parede || !x.corrida));
  const contorno = r ? r.contorno : v ? faixaVigaElastica(v) : [];
  const xs = [...contorno.map((p) => p[0]), ...nos.map((n) => n.x)], ys = [...contorno.map((p) => p[1]), ...nos.map((n) => n.y)];
  if (!xs.length) return null;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 640, m = 16, esc = Math.min((W - 2 * m) / Math.max(x1 - x0, 0.1), 420 / Math.max(y1 - y0, 0.1)), H = (y1 - y0) * esc + 2 * m;
  const X = (x: number) => (m + (x - x0) * esc).toFixed(1), Y = (y: number) => (H - m - (y - y0) * esc).toFixed(1);
  const pilares = b.pilares.filter((p) => p.nasce === 'fundacao');
  const rr = Math.max(2, Math.min(6, (opcoesEmUso(b.opcoes, perfilDe(b)).radierMalha * esc) / 3));
  return (
    <svg className="det" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label={`Mapa de ${modo === 'tensao' ? 'tensões no solo' : 'recalques'} por nó`} data-mapa-base={id} data-mapa-nos={nos.length}>
      <path d={contorno.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('') + 'Z'} className="det-contorno" />
      {(r?.furos ?? []).map((f, k) => <path key={k} d={f.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('') + 'Z'} className="det-cota" />)}
      {pilares.map((p) => { const c = contornoPilar(p, p.secao); const cc = centroPilar(p, p.secao); return cc[0] >= x0 - 1 && cc[0] <= x1 + 1 && cc[1] >= y0 - 1 && cc[1] <= y1 + 1 ? <path key={p.id} d={c.map((q, i) => `${i ? 'L' : 'M'}${X(q[0])},${Y(q[1])}`).join('') + 'Z'} className="det-pilar" /> : null; })}
      {nos.map((n, k) => { const val = modo === 'tensao' ? n.sigma : n.w, t = val / (ref || 1); return <circle key={k} cx={X(n.x)} cy={Y(n.y)} r={rr} className={n.sigmaMin < 0 ? 'mapa-no tracao' : `mapa-no n${t > 1 ? 4 : faixa(t)}`} />; })}
    </svg>
  );
}

export function JanelaBaseElastica({ id }: { id: string }) {
  const b = useBuilding((s) => s.sessao.modelo), dim = useBuilding((s) => s.dim);
  const atual = useBuilding((s) => calculoAtual(s));
  const modo = usePlanta((s) => (s.mapaBase === 'recalque' ? 'recalque' : 'tensao'));
  const r = dim?.radiers?.find((x) => x.id === id), v = dim?.vigasElasticas?.find((x) => x.id === id);
  const x = r ?? v;
  if (!ehBaseElastica(b, id)) return <p className="muted">O elemento não existe mais.</p>;
  if (!x) return <p className="muted">Calcule o edifício (aba Dimensionamento) para ver os resultados da base elástica.</p>;
  const ref = modo === 'tensao' ? x.sigmaAdm ?? x.sigmaMax : x.recalque;
  const piores = [...x.nos].sort((a, z) => z.sigma - a.sigma).slice(0, 8);
  const det = r ? dim?.detalhesRadier?.find((d) => d.laje === r.id) : undefined;
  return (
    <div data-janela-base={id}>
      {!atual && <p className="hint bad">Os resultados são anteriores a uma alteração: recalcule o edifício.</p>}
      <div className="row wrap u-items-center">
        <Pill tone={x.status === 'ok' ? 'ok' : 'bad'}>{x.status === 'ok' ? 'atende' : 'não atende'}</Pill>
        <Pill tone="na">{r ? `Radier h = ${fmt(r.h * 100, 0)} cm` : v!.forma && v!.forma.tipo !== 'plana' ? `Viga ${v!.forma.tipo} sobre base elástica: alma ${fmt((v!.bw ?? v!.b) * 100, 0)} × ${fmt(v!.h * 100, 0)}, mesa ${fmt(v!.forma.bf * 100, 0)} × ${fmt(v!.forma.hf * 100, 0)} cm` : `Viga sobre base elástica ${fmt(v!.b * 100, 0)} × ${fmt(v!.h * 100, 0)}`}</Pill>
      </div>
      <KV rows={[
        ['k', `${fmt(x.k, 0)} kN/m³`],
        ['σ máxima (raras)', `${fmt(x.sigmaMax, 1)} kN/m² (${x.combMax || '—'})`],
        ['σ mínima (raras)', `${fmt(x.sigmaMin, 1)} kN/m²${x.sigmaMin < 0 ? ' — levantamento' : ''}`],
        ['σadm', x.sigmaAdm ? `${fmt(x.sigmaAdm, 0)} kN/m²` : '—'],
        ['Maior recalque', `${fmt(x.recalque * 1000, 2)} mm`],
        ...(r ? [['As inferior x / y', `${fmt(r.As.pos[0])} / ${fmt(r.As.pos[1])} cm²/m`], ['As superior x / y', `${fmt(r.As.neg[0])} / ${fmt(r.As.neg[1])} cm²/m`], ['md (Wood-Armer) inf. / sup.', `${fmt(Math.max(...r.mPos), 1)} / ${fmt(Math.min(...r.mNeg), 1)} kN·m/m`]] as [string, string][] : []),
        ...(v?.mesaBalanco ? [['Mesa em balanço (laje)', `ℓ = ${fmt(v.mesaBalanco.balanco * 100, 0)} cm; Md = ${fmt(v.mesaBalanco.Md, 1)} kN·m/m; As = ${fmt(v.mesaBalanco.AsAdot)} cm²/m${v.mesaBalanco.barras ? ` (φ${fmt(v.mesaBalanco.barras.phi, 1)} c/${fmt(v.mesaBalanco.barras.s * 100, 0)})` : ''}; distribuição ${v.mesaBalanco.distribuicao.barras ? `φ${fmt(v.mesaBalanco.distribuicao.barras.phi, 1)} c/${fmt(v.mesaBalanco.distribuicao.barras.s * 100, 0)}` : '—'}; Vd = ${fmt(v.mesaBalanco.cortante.Vd, 1)} / VRd1 = ${fmt(v.mesaBalanco.cortante.VRd1, 1)} kN/m`]] as [string, string][] : []),
        ...(v ? [['Md inf. / sup.', `${fmt(v.Md.inf, 1)} / ${fmt(v.Md.sup, 1)} kN·m`], ['Vd', `${fmt(v.Vd, 1)} kN`], ['Armadura', `inf. ${v.armadura.inf.barras ? `${v.armadura.inf.barras.n} φ${fmt(v.armadura.inf.barras.phi, 1)}` : '—'}; sup. ${v.armadura.sup.barras ? `${v.armadura.sup.barras.n} φ${fmt(v.armadura.sup.barras.phi, 1)}` : '—'}${v.armadura.estribo ? `; estribo φ${fmt(v.armadura.estribo.phi, 1)} c/${fmt(v.armadura.estribo.s * 100, 0)}` : ''}`]] as [string, string][] : []),
      ]} />
      {r && <CargaRadier b={b} id={r.id} />}
      <Mensagens msgs={x.mensagens} />
      {!!r?.puncao?.length && (
        <div data-puncao-radier={r.puncao.length}>
          <h4>Punção sob os pilares</h4>
          <p className="small">Combinação ELU de maior τSd em C′ por pilar; a reação do solo (pressão k·w média nos nós vizinhos) é descontada de FSd dentro de cada contorno.</p>
          {r.puncao.map((q) => <CartaoPuncao key={q.id} r={q} semEditor />)}
        </div>
      )}
      <p className="small"><b>{modo === 'tensao' ? 'Tensão no solo por nó (envoltória das raras)' : 'Recalque por nó (envoltória das raras)'}</b> <span className="muted">— troque no seletor “Mapa” da planta de fundação</span></p>
      <MapaPorNo b={b} id={id} nos={x.nos} modo={modo} escala={ref} />
      <div className="mapa-leg">
        {[0, 1, 2, 3, 4].map((k) => <span key={k}><svg width="12" height="12"><circle cx="6" cy="6" r="5" className={`mapa-no n${k}`} /></svg>{k === 4 ? `> ${fmt(0.8 * ref * (modo === 'tensao' ? 1 : 1000), modo === 'tensao' ? 0 : 1)}` : `até ${fmt((k + 1) * 0.2 * ref * (modo === 'tensao' ? 1 : 1000), modo === 'tensao' ? 0 : 1)}`}{modo === 'tensao' ? ' kN/m²' : ' mm'}</span>)}
        <span><svg width="12" height="12"><circle cx="6" cy="6" r="4" className="mapa-no tracao" /></svg>tração (levantamento)</span>
      </div>
      <div className="tablewrap">
        <table className="data quadro" data-nos-base>
          <thead><tr><th>x (m)</th><th>y (m)</th><th>σ máx. (kN/m²)</th><th>σ mín. (kN/m²)</th><th>Recalque (mm)</th></tr></thead>
          <tbody>{piores.map((n, k) => <tr key={k}><td className="num">{fmt(n.x)}</td><td className="num">{fmt(n.y)}</td><td className="num">{fmt(n.sigma, 1)}</td><td className="num">{fmt(n.sigmaMin, 1)}</td><td className="num">{fmt(n.w * 1000, 2)}</td></tr>)}</tbody>
        </table>
      </div>
      <Hint>Os {piores.length} nós de maior tensão de {x.nos.length}. Isovalores contínuos ficam para a vista 3D (frente V).</Hint>
      {det && (<>
        <p className="small"><b>Armadura do radier ({fmt(det.peso, 0)} kg sem perdas)</b></p>
        <div className="tablewrap">
          <table className="data quadro" data-posicoes-radier>
            <thead><tr><th>Pos.</th><th>Face</th><th>Dir.</th><th>φ (mm)</th><th>c/ (cm)</th><th>n</th><th>C (cm)</th></tr></thead>
            <tbody>{det.posicoes.map((p) => <tr key={p.pos}><td className="tl">{p.pos}</td><td className="tl">{p.face === 'inf' ? 'inferior' : 'superior'}</td><td className="num">{p.dir ?? '—'}</td><td className="num">{fmt(p.phi, 1)}</td><td className="num">{fmt(p.s * 100, 0)}</td><td className="num">{p.n}</td><td className="num">{fmt(p.comprimento * 100, 0)}</td></tr>)}</tbody>
          </table>
        </div>
        {det.avisos.map((a, i) => <p key={i} className="hint bad">{a}</p>)}
      </>)}
      {x.notas.map((n, i) => <p key={i} className="muted small">{n}</p>)}
    </div>
  );
}
