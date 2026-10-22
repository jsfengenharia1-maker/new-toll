// Edição, uniformização e linhas de dobra da armadura das lajes maciças (frente R7e): painel de edição não modal sob a
// planta do pavimento (fica aberto enquanto se edita; as camadas inferior e superior podem ficar visíveis juntas), tabela
// das posições da laje com edição bloqueada (n, φ, espaçamento, comprimento, ganchos), conjunto da tabela de armadura,
// igualação por máximos, agrupar/desagrupar, emenda construtiva (também na linha de dobra), zonas de uniformização,
// linhas de dobra, geração da armadura só com a geometria e refazer com os esforços da análise.
import { useState } from 'react';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { executarERecalcular } from './Armadura';
import { fmt, phiTxt } from './Detalhamento';
import { TIPO_POS_LAJE } from './DetalhamentoLaje';
import { Button, Dropdown, Hint, Input, Note, NumCell, NumField, Pill, Seg, Select } from '../ui';
import type { DetalheLaje, PosicaoLaje } from '../../core/building/detalhamentoLajes';
import { assinaturaPos, cruzamentosDaBarra, igualarPosicoes, maximosDe, siglaReforco } from '../../core/building/lajesEdicao';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import { linhaLajes, tabelaDe } from '../../core/building/tabelasArmadura';
import type { BuildingModel, Laje } from '../../core/building/types';

const ref = (x: PosicaoLaje) => ({ pos: x.pos, face: x.face, tipo: x.tipo, ...(x.dir !== undefined ? { dir: x.dir } : {}) });
const ESPACAMENTOS = [5, 7.5, 10, 12.5, 15, 17.5, 20, 25, 30, 33];

// ---------------------------------------------------------------- posições da laje

/** Tabela das posições de uma laje com edição bloqueada e as ações sobre as selecionadas. */
export function EdicaoPosicoes({ l, d }: { l: Laje; d: DetalheLaje }) {
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [conj, setConj] = useState<{ phi: number; s: number }>({ phi: 0, s: 0 });
  const [emCm, setEmCm] = useState(0);
  const linha = linhaLajes(tabelaDe(b, 'lajes', l.tabela), d.h);
  const bitolas = linha.bitolas.filter((p) => p >= 5);
  const espac = ESPACAMENTOS.filter((s) => (!linha.sMin || s >= linha.sMin - 1e-9) && (!linha.sMax || s <= linha.sMax + 1e-9));
  const phiC = conj.phi || bitolas[0] || 8, sC = conj.s || espac[2] || espac[0] || 15;
  const op = opcoesEmUso(b.opcoes, perfilDe(b)), sigla = op.lajeSiglaReforco === 1;
  const escolhidas = d.posicoes.filter((x) => sel.has(x.pos));
  const linhasDobra = (b.linhasDobra ?? []).filter((x) => x.grupo === l.grupo);
  const editar = (x: PosicaoLaje, v: Record<string, unknown>) => executarERecalcular('laje.barras', { id: l.id, acao: 'editar', barras: [{ ...ref(x), ...v }] });
  const alvo = escolhidas.length === 1 ? escolhidas[0] : null;
  const cruz = alvo ? cruzamentosDaBarra(alvo, linhasDobra) : [];
  const nomeLinha = (id: string) => `LD${linhasDobra.findIndex((x) => x.id === id) + 1}`;
  const alternar = (pos: string, on: boolean) => setSel((s) => { const n = new Set(s); if (on) n.add(pos); else n.delete(pos); return n; });
  const editaveis = d.posicoes.filter((x) => x.tipo !== 'predefinida' && x.tipo !== 'base');
  const grupoDeSel = (l.edicao?.grupos ?? []).some((g) => escolhidas.some((x) => g.some((m) => m.pos === x.pos && m.assinatura === assinaturaPos(x))));
  const e = l.edicao;
  return (
    <div data-edicao-posicoes={l.id}>
      <div className="row wrap u-items-end">
        <b>{l.nome}</b>
        {l.semCalculo && <Pill tone="warn" data-sem-calculo>gerada sem cálculo</Pill>}
        {e && <Pill tone="warn" data-edicao-bloqueada>{e.barras.length} {e.barras.length === 1 ? 'posição editada' : 'posições editadas'}</Pill>}
        <Button disabled={calculando || (!l.edicao && !l.semCalculo)} title="Descarta a edição e a geração sem cálculo desta laje e refaz a armadura com os esforços da análise; zonas de uniformização e linhas de dobra ficam" onClick={() => void executarERecalcular('laje.barras', { acao: 'refazer', ids: [l.id] })} data-refazer-laje>Refazer com os esforços</Button>
      </div>
      <div className="tablewrap">
        <table className="data quadro" data-tabela-edicao-laje>
          <thead><tr><th /><th>Pos.</th><th>Face</th><th>Tipo</th><th>Quant.</th><th>φ (mm)</th><th>Espaç. (cm)</th><th>C (m)</th><th>Gancho 1 (cm)</th><th>Gancho 2 (cm)</th><th>Situação</th></tr></thead>
          <tbody>
            {editaveis.map((x) => {
              const bs = bitolas.includes(x.phi) ? bitolas : [...bitolas, x.phi].sort((a, z) => a - z);
              const sg = sigla ? siglaReforco(x) : '';
              return (
                <tr key={x.pos} data-pos-edicao={x.pos} data-tipo={x.tipo} data-face={x.face} className={sel.has(x.pos) ? 'on' : ''}>
                  <td><Input type="checkbox" aria-label={`Selecionar ${x.pos}`} checked={sel.has(x.pos)} onChange={(ev) => alternar(x.pos, ev.target.checked)} /></td>
                  <td className="tl">{x.pos}</td>
                  <td className="tl">{x.face === 'inf' ? 'inferior' : 'superior'}{sg ? ` · ${sg}` : ''}</td>
                  <td className="tl">{TIPO_POS_LAJE[x.tipo]}</td>
                  <td className="num"><NumCell label={`Quantidade de ${x.pos}`} value={x.n} onChange={(v) => { if (v >= 1) void editar(x, { n: Math.round(v) }); }} /></td>
                  <td><Dropdown aria-label={`Bitola de ${x.pos}`} value={x.phi} disabled={calculando} onChange={(ev) => void editar(x, { phi: +ev.target.value })}>{bs.map((p) => <option key={p} value={p}>{phiTxt(p)}</option>)}</Dropdown></td>
                  <td className="num">{x.s > 0 ? <NumCell label={`Espaçamento de ${x.pos}`} value={+(x.s * 100).toFixed(1)} onChange={(v) => { if (v >= 5 && v <= 33) void editar(x, { s: +(v / 100).toFixed(4) }); }} /> : '—'}</td>
                  <td className="num"><NumCell label={`Comprimento de ${x.pos}`} value={x.comprimento} onChange={(v) => { if (v >= 0.2) void editar(x, { comprimento: +v.toFixed(3) }); }} /></td>
                  {[0, 1].map((k) => <td key={k} className="num"><NumCell label={`Gancho ${k + 1} de ${x.pos}`} value={Math.round(x.ganchos[k] * 100)} onChange={(v) => { if (v >= 0 && v <= 100) void editar(x, { ganchos: k ? [x.ganchos[0], v / 100] : [v / 100, x.ganchos[1]] }); }} /></td>)}
                  <td className="tl small">{x.editada && <Pill tone="warn">editada</Pill>} {x.uniforme && <Pill tone="na" title={`Uniformizada pela zona ${x.uniforme}`}>uniforme</Pill>} {x.grupo !== undefined && <Pill tone="na">grupo {x.grupo}</Pill>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="row wrap u-items-end" data-acoes-posicoes>
        <Select label="Conjunto da tabela: φ" value={phiC} options={bitolas.map((p) => ({ v: p, label: phiTxt(p) }))} onChange={(v) => setConj({ phi: v, s: sC })} />
        <Select label="c/ (cm)" value={sC} options={espac.map((s) => ({ v: s, label: fmt(s, s % 1 ? 1 : 0) }))} onChange={(v) => setConj({ phi: phiC, s: v })} />
        <Button disabled={calculando || !escolhidas.length} title="Aplica φ e espaçamento da tabela de armadura da laje às posições marcadas" onClick={() => void executarERecalcular('laje.barras', { id: l.id, acao: 'conjunto', barras: escolhidas.map(ref), conjunto: { phi: phiC, s: sC / 100 } })} data-aplicar-conjunto>Aplicar conjunto às marcadas</Button>
        <Button disabled={calculando || escolhidas.length < 2} title="φ, espaçamento e comprimento iguais aos da posição de maior taxa e ao maior comprimento" onClick={() => {
          const barras = igualarPosicoes(d, escolhidas.map((x) => x.pos)).flatMap((e) => { const x = d.posicoes.find((y) => y.pos === e.pos); return x ? [{ ...ref(x), phi: e.phi, s: e.s, comprimento: e.comprimento }] : []; });
          if (barras.length) void executarERecalcular('laje.barras', { id: l.id, acao: 'editar', barras });
        }} data-igualar>Igualar por máximos</Button>
        <Button disabled={calculando || escolhidas.length < 2} title="Junta as posições marcadas (mesmos máximos): editar uma altera todas" onClick={() => { const m = maximosDe(escolhidas); void executarERecalcular('laje.barras', { id: l.id, acao: 'agrupar', barras: escolhidas.map(ref), valores: m }); }} data-agrupar>Agrupar</Button>
        <Button disabled={calculando || !grupoDeSel} onClick={() => void executarERecalcular('laje.barras', { id: l.id, acao: 'desagrupar', barras: escolhidas.map(ref) })} data-desagrupar>Desagrupar</Button>
        <Button disabled={calculando || !escolhidas.length} title="Volta as posições marcadas ao calculado" onClick={() => void executarERecalcular('laje.barras', { id: l.id, acao: 'reverter', barras: escolhidas.map(ref) })}>Reverter marcadas</Button>
      </div>
      <div className="row wrap u-items-end" data-emenda>
        <NumField label="Emenda construtiva a (cm do início)" width={190} value={emCm} onChange={(v) => setEmCm(Math.max(0, v))} />
        {cruz.length > 0 && <Select label="ou na linha de dobra" value={-1} options={[{ v: -1, label: '—' }, ...cruz.map((c) => ({ v: c.em, label: `${nomeLinha(c.linha)} (${fmt(c.em * 100, 0)} cm)` }))]} onChange={(v) => { if (v >= 0) setEmCm(Math.round(v * 100)); }} />}
        <Button disabled={calculando || !alvo || emCm <= 0} title={`Corta a posição marcada no ponto, com traspasse de ${op.lajeEmendaConstrutiva} cm (opção), sem recalcular`} onClick={() => alvo && void executarERecalcular('laje.barras', { id: l.id, acao: 'emendar', barras: [ref(alvo)], em: emCm / 100 })} data-emendar>Emendar a posição marcada</Button>
      </div>
      <Hint>Edição bloqueada: o recálculo confere a área exigida, a faixa coberta e o comprimento calculado (ARM_BLOQ) e desconsidera a edição se a numeração mudar. Posições agrupadas editam juntas. Base e predefinidas têm editor próprio.</Hint>
    </div>
  );
}

// ---------------------------------------------------------------- zonas e linhas de dobra

/** Zonas de uniformização e linhas de dobra do grupo: lista, criação por coordenadas e ferramentas da planta. */
export function ZonasELinhas({ b, grupo, laje }: { b: BuildingModel; grupo: string; laje?: Laje }) {
  const pl = usePlanta(), calculando = useBuilding((s) => s.calculando);
  const zonas = (b.zonasLaje ?? []).map((z, i) => ({ z, n: i + 1 })).filter((x) => x.z.grupo === grupo);
  const linhas = (b.linhasDobra ?? []).map((x, i) => ({ x, n: i + 1 })).filter((x) => x.x.grupo === grupo);
  const [p, setP] = useState({ x1: 0, y1: 0, x2: 4, y2: 0 });
  const [aresta, setAresta] = useState(0);
  const pts = [[p.x1, p.y1], [p.x2, p.y2]];
  const k = Math.min(aresta, Math.max(0, (laje?.contorno.length ?? 1) - 1));
  // retângulo que cobre as lajes do grupo (uniformização do pavimento inteiro)
  const contornos = b.lajes.filter((x) => x.grupo === grupo && x.tipo.tipo === 'macica').flatMap((x) => x.contorno);
  const caixa = contornos.length ? [[Math.min(...contornos.map((q) => q[0])) - 0.1, Math.min(...contornos.map((q) => q[1])) - 0.1], [Math.max(...contornos.map((q) => q[0])) + 0.1, Math.max(...contornos.map((q) => q[1])) + 0.1]] : [[0, 0], [1, 1]];
  return (
    <div data-zonas-linhas={grupo}>
      <h4>Zonas de uniformização</h4>
      <p className="small">As barras calculadas da face (e da direção, quando dada) que passam pela zona recebem a maior taxa e o maior comprimento entre elas. Valem em todo detalhamento (antes ou depois do cálculo).</p>
      {zonas.length > 0 && (
        <div className="tablewrap">
          <table className="data quadro" data-tabela-zonas>
            <thead><tr><th>Zona</th><th>Forma</th><th>Face</th><th>Direção</th><th>Pontos (m)</th><th /></tr></thead>
            <tbody>{zonas.map(({ z, n }) => (
              <tr key={z.id} data-zona={z.id}>
                <td className="tl">Z{n}</td><td className="tl">{z.forma === 'linha' ? `linha (${fmt(z.largura ?? 0.5)} m)` : 'retângulo'}</td><td className="tl">{z.face === 'inf' ? 'inferior' : 'superior'}</td>
                <td className="tl">{z.angulo === undefined ? 'qualquer' : `${fmt(z.angulo, 0)}°`}</td><td className="num">{fmt(z.pontos[0][0])} ; {fmt(z.pontos[0][1])} → {fmt(z.pontos[1][0])} ; {fmt(z.pontos[1][1])}</td>
                <td><Button variant="danger" disabled={calculando} onClick={() => void executarERecalcular('laje.uniformizacao', { acao: 'remover', zona: z.id })}>Remover</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="row wrap u-items-end" data-zona-form>
        <Seg value={pl.zonaForma} options={[{ v: 'linha', label: 'Linha' }, { v: 'retangulo', label: 'Retângulo' }]} onChange={(v) => pl.set({ zonaForma: v })} small />
        <Select label="Face" value={pl.zonaFace} options={[{ v: 'inf', label: 'inferior' }, { v: 'sup', label: 'superior' }]} onChange={(v) => pl.set({ zonaFace: v })} />
        <Select label="Direção" value={pl.zonaAngulo === null ? -1 : pl.zonaAngulo} options={[{ v: -1, label: 'qualquer' }, { v: 0, label: '0° (x)' }, { v: 90, label: '90° (y)' }]} onChange={(v) => pl.set({ zonaAngulo: v < 0 ? null : v })} />
        {pl.zonaForma === 'linha' && <NumField label="Largura (m)" width={90} value={pl.zonaLargura} onChange={(v) => v >= 0.05 && pl.set({ zonaLargura: v })} />}
        <Button variant={pl.ferramenta === 'zonaLaje' ? 'primary' : 'default'} title="Dois cliques na planta: a zona vale para o grupo do pavimento aberto" onClick={() => pl.set({ ferramenta: 'zonaLaje' })} data-ferramenta-zona>Lançar zona na planta</Button>
      </div>
      <div className="row wrap u-items-end">
        <NumField label="x1" width={70} value={p.x1} onChange={(v) => setP({ ...p, x1: v })} />
        <NumField label="y1" width={70} value={p.y1} onChange={(v) => setP({ ...p, y1: v })} />
        <NumField label="x2" width={70} value={p.x2} onChange={(v) => setP({ ...p, x2: v })} />
        <NumField label="y2" width={70} value={p.y2} onChange={(v) => setP({ ...p, y2: v })} />
        <Button disabled={calculando} data-criar-zona onClick={() => void executarERecalcular('laje.uniformizacao', { acao: 'criar', grupo, forma: pl.zonaForma, pontos: pts, face: pl.zonaFace, ...(pl.zonaForma === 'linha' ? { largura: pl.zonaLargura } : {}), ...(pl.zonaAngulo !== null ? { angulo: pl.zonaAngulo } : {}) })}>Criar zona</Button>
        <Button disabled={calculando} data-criar-linha onClick={() => void executarERecalcular('laje.linhaDobra', { acao: 'criar', grupo, a: pts[0], z: pts[1] })}>Criar linha de dobra</Button>
      </div>
      <div className="row wrap u-items-end" data-uniformizar-pavimento>
        {(['inf', 'sup'] as const).map((face) => (
          <Button key={face} disabled={calculando || !contornos.length} title="Uniformiza as barras da face em todo o pavimento (grupo): duas zonas sobre as lajes, uma por direção (0° e 90°)" data-uniformizar-face={face}
            onClick={() => void executarERecalcular('lote', { comandos: [0, 90].map((angulo) => ({ nome: 'laje.uniformizacao', params: { acao: 'criar', grupo, forma: 'retangulo', pontos: caixa, face, angulo } })) })}>
            Uniformizar a face {face === 'inf' ? 'inferior' : 'superior'} do pavimento
          </Button>
        ))}
      </div>
      <h4>Linhas de dobra</h4>
      <p className="small">Locais de negativo máximo e de emenda preferencial da armadura inferior (acima da barra máxima); o mínimo em % do vão dos negativos usa o vão até a linha seguinte.</p>
      {linhas.length > 0 && (
        <div className="tablewrap">
          <table className="data quadro" data-tabela-linhas-dobra>
            <thead><tr><th>Linha</th><th>Pontos (m)</th><th /></tr></thead>
            <tbody>{linhas.map(({ x, n }) => (
              <tr key={x.id} data-linha-dobra={x.id}>
                <td className="tl">LD{n}</td><td className="num">{fmt(x.a[0])} ; {fmt(x.a[1])} → {fmt(x.z[0])} ; {fmt(x.z[1])}</td>
                <td><Button variant="danger" disabled={calculando} onClick={() => void executarERecalcular('laje.linhaDobra', { acao: 'remover', linha: x.id })}>Remover</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="row wrap u-items-end">
        <Button variant={pl.ferramenta === 'linhaDobra' ? 'primary' : 'default'} title="Dois cliques na planta" onClick={() => pl.set({ ferramenta: 'linhaDobra' })} data-ferramenta-dobra>Lançar linha de dobra na planta</Button>
        {laje && (
          <>
            <Select label={`Pela aresta de ${laje.nome}`} value={k} options={laje.contorno.map((_, i) => ({ v: i, label: `${i + 1}` }))} onChange={setAresta} />
            <Button disabled={calculando} title="Linha de dobra ao longo da aresta (direção do apoio) da laje" onClick={() => void executarERecalcular('laje.linhaDobra', { acao: 'criar', grupo, a: laje.contorno[k], z: laje.contorno[(k + 1) % laje.contorno.length] })}>Criar pela aresta</Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- geração sem cálculo

/** Gera a armadura das lajes maciças só com a geometria (apaga a edição existente): pede confirmação. */
export function GerarArmadura({ b }: { b: BuildingModel }) {
  const calculando = useBuilding((s) => s.calculando);
  const [pedido, setPedido] = useState(false);
  const mac = b.lajes.filter((l) => l.tipo.tipo === 'macica');
  const comEdicao = mac.filter((l) => l.edicao || l.predefinidas?.length).length;
  return (
    <div data-gerar-armadura>
      <Button disabled={calculando || !mac.length} title="Gera a armadura só com a geometria (mínimos e base), sem os esforços, para edição manual" onClick={() => setPedido(true)} data-gerar>Gerar armadura sem cálculo…</Button>
      {pedido && (
        <Note tone="bad" data-confirmar-gerar>
          Gera a armadura de {mac.length} {mac.length === 1 ? 'laje maciça' : 'lajes maciças'} só com mínimos e base, sem os esforços da análise, e apaga a edição e as armaduras predefinidas existentes ({comEdicao} {comEdicao === 1 ? 'laje' : 'lajes'}). Desfazer volta ao estado anterior.
          <div className="row wrap">
            <Button variant="danger" disabled={calculando} data-confirmar-gerar-ok onClick={() => { setPedido(false); void executarERecalcular('lajes.gerarArmadura', {}); }}>Gerar e apagar a existente</Button>
            <Button onClick={() => setPedido(false)}>Cancelar</Button>
          </div>
        </Note>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- painel não modal sob a planta

/** Painel de edição da armadura das lajes do pavimento aberto: não modal, fica aberto enquanto se edita. */
export function PainelEdicaoLajes() {
  const pl = usePlanta(), b = useBuilding((s) => s.sessao.modelo), dim = useBuilding((s) => s.dim);
  if (!pl.painelLajes) return null;
  const pav = b.pavimentos.find((p) => p.id === pl.pavimento) ?? b.pavimentos[Math.min(1, b.pavimentos.length - 1)];
  const grupo = pav?.grupo ?? '';
  const lajes = b.lajes.filter((l) => l.grupo === grupo && l.tipo.tipo === 'macica');
  const selecionada = lajes.find((l) => pl.selecao.has(l.id)) ?? lajes[0];
  const det = selecionada ? dim?.detalhesLajes?.find((x) => x.laje === selecionada.id) : undefined;
  return (
    <section className="painel-edicao" data-painel-edicao-lajes aria-label="Edição da armadura das lajes">
      <div className="row wrap u-items-end">
        <b>Armadura das lajes — edição</b>
        <Seg value={pl.armaduraLajes === 'nenhuma' ? 'ambas' : pl.armaduraLajes} options={[{ v: 'inf', label: 'Inferior' }, { v: 'sup', label: 'Superior' }, { v: 'ambas', label: 'Ambas' }]} onChange={(v) => pl.set({ armaduraLajes: v, camadaPuncao: false })} small />
        {lajes.length > 1 && <Select label="Laje" value={selecionada?.id ?? ''} options={lajes.map((l) => ({ v: l.id, label: l.nome }))} onChange={(v) => pl.set({ selecao: new Set([v]) })} />}
        <GerarArmadura b={b} />
        <Button variant="ghost" onClick={() => pl.set({ painelLajes: false })} data-fechar-painel-lajes>Fechar painel</Button>
      </div>
      {!lajes.length ? <Hint>O grupo não tem lajes maciças.</Hint> : !det ? <Hint>Calcule o dimensionamento (aba Dimensionamento) para editar as posições; zonas e linhas de dobra podem ser lançadas antes.</Hint> : <EdicaoPosicoes l={selecionada} d={det} />}
      <details>
        <summary>Zonas de uniformização e linhas de dobra</summary>
        <ZonasELinhas b={b} grupo={grupo} laje={selecionada} />
      </details>
    </section>
  );
}

// ---------------------------------------------------------------- rótulos nas pranchas

/** Reposiciona os rótulos das barras das lajes nas pranchas (deslocamento no papel, mm). */
export function RotulosLajes() {
  const b = useBuilding((s) => s.sessao.modelo), dim = useBuilding((s) => s.dim), calculando = useBuilding((s) => s.calculando);
  const itens = (dim?.detalhesLajes ?? []).flatMap((d) => d.posicoes.map((x) => ({ chave: `${d.laje}|${x.pos}`, nome: `${d.nome} · ${x.pos}` })));
  const [chave, setChave] = useState('');
  const [passo, setPasso] = useState(5);
  const c = itens.find((x) => x.chave === chave) ? chave : itens[0]?.chave ?? '';
  const off = b.prancha?.rotulos?.[c] ?? [0, 0];
  const mover = (dx: number, dy: number) => void useBuilding.getState().exec('prancha.rotulo', { chave: c, dx: +(off[0] + dx).toFixed(2), dy: +(off[1] + dy).toFixed(2) });
  const reposicionados = Object.entries(b.prancha?.rotulos ?? {});
  return (
    <div data-rotulos-lajes>
      <p className="small">Desloca o rótulo "n Nk φ c/s C=xxx" de uma barra de laje na prancha de armação das lajes (milímetros no papel; um traço fino liga o rótulo à barra). Dado de prancha: não refaz o cálculo.</p>
      {!itens.length ? <Hint>Calcule o dimensionamento para listar as barras das lajes.</Hint> : (
        <>
          <div className="row wrap u-items-end">
            <Select label="Barra" value={c} options={itens.map((x) => ({ v: x.chave, label: x.nome }))} onChange={setChave} />
            <NumField label="Passo (mm)" width={90} value={passo} onChange={(v) => v > 0 && setPasso(v)} />
            <Button disabled={calculando} onClick={() => mover(-passo, 0)} aria-label="Rótulo à esquerda">←</Button>
            <Button disabled={calculando} onClick={() => mover(0, passo)} aria-label="Rótulo para cima">↑</Button>
            <Button disabled={calculando} onClick={() => mover(0, -passo)} aria-label="Rótulo para baixo">↓</Button>
            <Button disabled={calculando} onClick={() => mover(passo, 0)} aria-label="Rótulo à direita">→</Button>
            <Button disabled={calculando || !b.prancha?.rotulos?.[c]} onClick={() => void useBuilding.getState().exec('prancha.rotulo', { chave: c, remover: true })}>Voltar ao automático</Button>
            <span className="small" data-rotulo-deslocamento>{fmt(off[0], 1)} ; {fmt(off[1], 1)} mm</span>
          </div>
          {reposicionados.length > 0 && <p className="small" data-rotulos-reposicionados>{reposicionados.length} {reposicionados.length === 1 ? 'rótulo reposicionado' : 'rótulos reposicionados'}.</p>}
        </>
      )}
    </div>
  );
}

