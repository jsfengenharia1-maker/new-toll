// Fundações do edifício (frente FU1, interface): grupo "Fundação" da aba Edifício (terreno, estacas, sondagens, parâmetros,
// lançamento e edição do elemento selecionado), janela do elemento (desenhos do módulo Fundações) e o aviso da aba Fundações.
// Toda alteração é comando do registro (`fundacao.*`, `sondagem.*`); o cálculo roda no worker, sem refazer a análise.
import { useMemo } from 'react';
import { useBuilding, fundacaoAtual, calculoAtual } from './store';
import { usePlanta } from './plantaStore';
import { classificar } from '../../core/building/revisao';
import { CargasNoPilar } from './Vinculos';
import { SondagemEditor } from '../SondagemEditor';
import { CaissonDetail, CapDetail, FootingDetail, SolutionDetail } from '../FundacoesDetail';
import { Button, Group, Hint, KV, Modal, Note, NumCell, NumField, OptNumCell, OptNumField, Pill, Select } from '../ui';
import { useStore } from '../store';
import { PARAMS_FUNDACAO } from '../../core/commands';
import { PILE_LABEL, type Boring, type FoundationData, type PileType } from '../../core/piles';
import { isFooting } from '../../core/footings';
import { isCaisson } from '../../core/caissons';
import {
  POSICAO_LABEL, TIPO_FUNDACAO_LABEL, cotaElemento, cotaTerreno, ladoDoAjuste, niveisFundacao, parametrosElemento, parametrosFundacao, secaoBase, type ResultadoFundacao,
} from '../../core/building/fundacao';
import { FUNDACAO_VAZIA, cotaFundacao, dimsSecao, ehArranque, type BuildingModel, type ElementoFundacao, type EstacaTerreno, type PosicaoFundacao, type TipoFundacao } from '../../core/building/types';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const TIPOS = (Object.keys(TIPO_FUNDACAO_LABEL) as TipoFundacao[]).map((v) => ({ v, label: TIPO_FUNDACAO_LABEL[v] }));
const POSICOES = (Object.keys(POSICAO_LABEL) as PosicaoFundacao[]).map((v) => ({ v, label: POSICAO_LABEL[v] }));
const POSICOES_LANCAR: { v: PosicaoFundacao | 'auto'; label: string }[] = [{ v: 'auto', label: 'automática (pelo clique no pilar)' }, ...POSICOES];
const ESTACAS_TIPO = (Object.keys(PILE_LABEL) as PileType[]).map((v) => ({ v, label: PILE_LABEL[v] }));
const cls = (st: string) => (st === 'fail' ? 'bad' : '');

/** Abre a janela do elemento de fundação. */
export const abrirJanelaFundacao = (id: string) => usePlanta.getState().set({ janela: { tipo: 'fundacao', id } });
/** Seleciona o elemento na planta do nível de fundação e pede para centralizá-lo. */
export function irParaFundacao(id: string) { usePlanta.getState().set({ pavimento: 'fundacao', selecao: new Set([id]), foco: { id, n: Date.now() } }); }

/** Lados da divisa/canto nos eixos do elemento. */
const LADOS: Record<'divisa' | 'canto', { v: string; label: string }[]> = {
  divisa: [{ v: '[-1,0]', label: 'face −x' }, { v: '[1,0]', label: 'face +x' }, { v: '[0,-1]', label: 'face −y' }, { v: '[0,1]', label: 'face +y' }],
  canto: [{ v: '[-1,-1]', label: 'canto −x −y' }, { v: '[1,-1]', label: 'canto +x −y' }, { v: '[1,1]', label: 'canto +x +y' }, { v: '[-1,1]', label: 'canto −x +y' }],
};

/** Rótulo, unidade e fator de exibição (valor do núcleo × fator) dos parâmetros editáveis do cálculo. */
const ROTULOS: Record<string, [string, string?, number?]> = {
  cover: ['Cobrimento', 'cm', 100], colPhi: ['φ do pilar (ancoragem)', 'mm'], fckFound: ['fck de sapatas e blocos', 'MPa'], blockWeightPct: ['Peso do bloco', '% de Nk'],
  spacingInSitu: ['Espaçamento, moldadas', '×φ'], spacingPrecast: ['Espaçamento, pré-moldadas', '×φ'], minLength: ['Comprimento mínimo da estaca', 'm'],
  hcMaxDepth: ['Hélice: profundidade máxima', 'm'], precastStopN: ['Pré-moldada: N de parada'], augerStopN: ['Escavada: N do trado'],
  capEdge: ['Borda do bloco além da estaca', 'cm', 100], capThetaMin: ['Biela: θ mínimo', '°'], capThetaMax: ['Biela: θ máximo', '°'],
  ftPP: ['Sapata: peso próprio + solo', '% de Nk'], ftSptDiv: ['Sapata: divisor de N̄ (σadm = N̄/x MPa)'], ftNmaxEst: ['Sapata: N̄ máximo'], ftBulb: ['Sapata: bulbo', '× lado'],
  ftEdgeFactor: ['Sapata: σmáx ≤ fator · σadm'], ftMinCompressed: ['Sapata: área comprimida mínima', '%', 100], ftMaxRatio: ['Sapata: A/B máximo'],
  ftKind: ['Sapata: tipo'], ftMethod: ['Sapata: flexão'], ftRhoMin: ['Sapata: ρ mínimo', '%', 100], ftH0Min: ['Sapata: h0 mínimo', 'cm', 100], gammaSoil: ['γ do solo', 'kN/m³'],
  tbSptDiv: ['Tubulão: divisor de N̄ (σadm = N̄/x MPa)'], tbNmaxEst: ['Tubulão: N̄ máximo'], tbMinDepth: ['Tubulão: cota mínima da base', 'm'], tbDfMin: ['Tubulão: fuste mínimo', 'cm', 100],
  tbFck: ['Tubulão: fck do fuste', 'MPa'], tbGc: ['Tubulão: γc do fuste'], tbDbMax: ['Tubulão: base máxima', 'cm', 100], tbHmax: ['Tubulão: H da base máxima', 'cm', 100], tbRodape: ['Tubulão: rodapé', 'cm', 100],
  sptAvgDepth: ['Média de furos: profundidade'], sptAvgWater: ['Média de furos: nível d’água'],
};
const ENUMS: Record<string, { v: string; label: string }[]> = {
  ftKind: [{ v: 'rigida', label: 'Rígida' }, { v: 'flexivel', label: 'Flexível' }], ftMethod: [{ v: 'ceb70', label: 'CEB-70' }, { v: 'bielas', label: 'Bielas (só rígida)' }],
  sptAvgDepth: [{ v: 'common', label: 'comum a todos os furos' }, { v: 'max', label: 'até o furo mais profundo' }], sptAvgWater: [{ v: 'shallowest', label: 'o mais raso' }, { v: 'mean', label: 'média dos furos' }],
};

/** Item de mensagem de um elemento (código FUND_* e texto). */
function Mensagens({ msgs }: { msgs: string[] }) {
  if (!msgs.length) return <p className="muted small">Sem mensagens.</p>;
  return <ul className="revmsg">{msgs.map((m, i) => { const c = classificar(m); return <li key={i}><Pill tone={c.nivel === 'erro' ? 'bad' : c.nivel === 'aviso' ? 'warn' : 'na'}>{c.codigo}</Pill> {m}</li>; })}</ul>;
}

// ---------------------------------------------------------------- grupo "Fundação" da barra lateral

export function FundacaoGrupo({ b, onPlanta }: { b: BuildingModel; onPlanta: () => void }) {
  const { exec, dim, calculando, calculandoFund, calcularFundacao, idCalculo } = useBuilding();
  const velhaEstrutura = useBuilding((s) => !!s.analise && !calculoAtual(s));
  const atual = useBuilding((s) => fundacaoAtual(s));
  const revFund = useBuilding((s) => s.revFund);
  const pl = usePlanta();
  const fe = b.fundacao ?? FUNDACAO_VAZIA();
  const t = fe.terreno;
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const base = useMemo(() => parametrosFundacao({ ...b, fundacao: undefined }), [b]);
  const em = parametrosFundacao(b);
  const resultados = dim?.fundacoes ?? [];
  const sel = fe.elementos.find((e) => pl.selecao.has(e.id));
  const arranques = b.pilares.filter((p) => ehArranque(p));
  const semElemento = b.pilares.filter((p) => p.nasce === 'fundacao' && !fe.elementos.some((e) => e.pilares.includes(p.id)));
  const estacaSel = pl.estacaFund && t.estacas.some((e) => e.id === pl.estacaFund) ? pl.estacaFund : t.estacas[0]?.id ?? null;
  const setEst = (i: number, patch: Partial<EstacaTerreno>) => {
    const novas = t.estacas.map((e, k) => {
      if (k !== i) return e;
      const n = { ...e, ...patch } as Partial<EstacaTerreno>;
      if (patch.tipo !== undefined || patch.D !== undefined) delete n.nome;
      if (n.modo === 'sondagem') delete n.capacidade;
      return n;
    });
    exec('fundacao.terreno', { estacas: novas });
  };
  const lancarTodos = () => {
    const cmds = semElemento.map((p) => ({ nome: 'fundacao.criar', params: { pilar: p.id, tipo: pl.tipoFund, posicao: 'centrada', ...(pl.tipoFund === 'bloco' && estacaSel ? { estaca: { id: estacaSel } } : {}) } }));
    if (cmds.length) exec('lote', { comandos: cmds });
  };
  const furosEdif: Boring[] = fe.sondagens;
  const leitura = (x: Boring) => x.meters.map((m) => ({ N: m.N, solo: m.soil, ...(m.excluded ? { descartada: true } : {}) }));

  return (
    <Group title={`Fundação (${fe.elementos.length} elemento${fe.elementos.length === 1 ? '' : 's'})`} open={false}>
      <div className="row wrap" data-fundacao-calculo={idCalculo ?? ''} data-fundacao-rev={revFund}>
        <Button variant="primary" onClick={() => { usePlanta.getState().set({ pavimento: 'fundacao', ferramenta: 'fundacao', selecao: new Set() }); onPlanta(); }}>Planta de fundação (U)</Button>
        <Button disabled={!dim || calculando || calculandoFund} title={dim ? 'Calcula só as fundações, com a análise em vigor' : 'Calcule o edifício (aba Dimensionamento) primeiro'} onClick={() => calcularFundacao()}>{calculandoFund ? 'Calculando…' : 'Calcular fundações'}</Button>
      </div>
      {fe.elementos.length > 0 && !dim && <Hint>Calcule o edifício (aba Dimensionamento) para obter as reações dos pilares; depois “Calcular fundações” refaz só as fundações.</Hint>}
      {dim && velhaEstrutura && <p className="hint bad">A estrutura mudou depois do cálculo: recalcule o edifício antes das fundações.</p>}
      {dim && !velhaEstrutura && !atual && fe.elementos.length > 0 && <p className="hint bad" data-fundacao-velha>{dim.fundacoes ? 'Os dados de fundação mudaram depois do cálculo' : 'As fundações não foram calculadas (cálculo sem fundação)'}: “Calcular fundações” (a análise da estrutura não é refeita).</p>}

      <div className="row wrap u-items-end">
        <Select label="Modo de cálculo" value={op.fundModo} options={[{ v: 0, label: 'Dimensionar tudo' }, { v: 1, label: 'Só verificar' }, { v: 2, label: 'Redimensionar só os com erro' }]} onChange={(v) => exec('opcoes.definir', { valores: { fundModo: v } })} />
      </div>
      <Hint>Só verificar: sapatas com dimensões impostas (ou as do cálculo anterior). Redimensionar só os com erro: mantém os elementos que já atendem.</Hint>

      <p className="small"><b>Terreno</b></p>
      <div className="row wrap u-items-end">
        <Select label="σadm de sapatas e tubulões" value={t.sigmaModo} options={[{ v: 'informada', label: 'Informada' }, { v: 'sondagem', label: 'Estimada pelo SPT (a confirmar)' }]} onChange={(v) => exec('fundacao.terreno', { sigmaModo: v })} />
        <NumField label="σadm" unit="kN/m²" width={110} disabled={t.sigmaModo !== 'informada'} value={t.sigmaAdm ?? 0} onChange={(v) => exec('fundacao.terreno', { sigmaAdm: v })} />
      </div>
      <div className="row wrap u-items-end">
        <NumField label="σadm × vento" width={110} value={t.fatorVento ?? 1} onChange={(v) => exec('fundacao.terreno', { fatorVento: v })} />
        <OptNumField label={`Cota do terreno (vazio = ${fmt(cotaTerreno({ ...b, fundacao: undefined }))} m)`} unit="m" width={190} value={t.cotaTerreno} onChange={(v) => exec('fundacao.terreno', v === undefined ? { limpar: ['cotaTerreno'] } : { cotaTerreno: v })} />
      </div>
      <Hint>Cota de assentamento padrão: {fmt(cotaFundacao(b))} m (“Fundação abaixo do mais baixo” da obra), editável por elemento. σadm × vento majora a tensão admissível nas combinações com vento (padrão 1,0; a confirmar). Terreno em {fmt(cotaTerreno(b))} m.</Hint>

      <p className="small"><b>Tipos de estaca ({t.estacas.length})</b></p>
      {t.estacas.length > 0 && (
        <div className="tablewrap">
          <table className="data loads-ed quadro" data-estacas>
            <thead><tr><th>Estaca</th><th>Tipo</th><th>Ø (cm)</th><th>Capacidade</th><th>Capacidade (kN)</th><th>s (m)</th><th /></tr></thead>
            <tbody>{t.estacas.map((e, i) => (
              <tr key={e.id}>
                <td className="tl">{e.nome}</td>
                <td><select aria-label={`Tipo da estaca ${e.nome}`} value={e.tipo} onChange={(ev) => setEst(i, { tipo: ev.target.value as PileType })}>{ESTACAS_TIPO.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select></td>
                <td><NumCell value={e.D} onChange={(v) => setEst(i, { D: v })} /></td>
                <td><select aria-label={`Modo da estaca ${e.nome}`} value={e.modo} onChange={(ev) => setEst(i, { modo: ev.target.value as 'informada' | 'sondagem', ...(ev.target.value === 'informada' && !e.capacidade ? { capacidade: 500 } : {}) })}><option value="sondagem">pela sondagem</option><option value="informada">informada</option></select></td>
                <td>{e.modo === 'informada' ? <NumCell value={e.capacidade ?? 0} onChange={(v) => setEst(i, { capacidade: v })} /> : <span className="muted">—</span>}</td>
                <td><OptNumCell value={e.s} placeholder="padrão" onChange={(v) => { if (v === undefined) { const n = t.estacas.map((x, k) => { if (k !== i) return x; const c = { ...x }; delete c.s; return c; }); exec('fundacao.terreno', { estacas: n }); } else setEst(i, { s: v }); }} /></td>
                <td><button type="button" className="x" aria-label={`Remover estaca ${e.nome}`} onClick={() => exec('fundacao.terreno', { estacas: t.estacas.filter((_, k) => k !== i) })}>×</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="row wrap">
        <button type="button" className="mini" onClick={() => exec('fundacao.terreno', { estacas: [...t.estacas, { tipo: 'helice', D: 40, modo: 'sondagem' }] })}>+ estaca</button>
      </div>
      <Hint>Pela sondagem: capacidade e comprimento pelo SPT (Décourt-Quaresma, NBR 6122); informada: carga admissível característica dada. O bloco usa o tipo escolhido no elemento.</Hint>

      <SondagemEditor
        furos={furosEdif} cutoff={0} podeRemoverUltimo
        onEdit={(i, fn) => {
          const x = JSON.parse(JSON.stringify(furosEdif[i])) as Boring;
          fn(x);
          exec('sondagem.editar', { id: furosEdif[i].id, nome: x.name, impenetravel: x.endImpenetrable, leituras: leitura(x), ...(x.water === null ? { semAgua: true } : { nivelAgua: x.water }), ...(x.x !== undefined ? { x: x.x } : {}), ...(x.y !== undefined ? { y: x.y } : {}) });
        }}
        onAdd={(base0) => exec('sondagem.criar', { nome: `SP-${String(Math.max(0, ...furosEdif.map((f) => f.id ?? 0)) + 1).padStart(2, '0')}`, leituras: base0 ? leitura(base0) : Array.from({ length: 8 }, () => ({ N: 8, solo: 'argila' })), ...(base0?.water != null ? { nivelAgua: base0.water } : {}), impenetravel: false })}
        onRemove={(i) => exec('sondagem.remover', { ids: [furosEdif[i].id] })}
        onMessage={(m) => useStore.getState().set({ message: m })}
        media={{ depth: em.sptAvgDepth, water: em.sptAvgWater, onChange: (p) => exec('fundacao.opcoes', { valores: p }) }}
        hint="Cada elemento usa o furo escolhido (ou o mais próximo do pilar, quando o furo tem coordenadas, senão o primeiro) ou a média dos furos. ⊘ descarta uma leitura fora do padrão. O formato é o do módulo Fundações."
      />

      <p className="small"><b>Lançar elementos</b></p>
      <div className="row wrap u-items-end">
        <Select label="Tipo" value={pl.tipoFund} options={TIPOS} onChange={(v) => pl.set({ tipoFund: v })} />
        <Select label="Posição no pilar" value={pl.tipoFund === 'tubulao' ? 'centrada' : pl.posFund} options={pl.tipoFund === 'tubulao' ? POSICOES.filter((o) => o.v === 'centrada') : POSICOES_LANCAR} onChange={(v) => pl.set({ posFund: v })} />
        {pl.tipoFund === 'bloco' && <Select label="Estaca do bloco" value={estacaSel ?? ''} options={t.estacas.length ? t.estacas.map((e) => ({ v: e.id, label: e.nome })) : [{ v: '', label: '(cadastre uma estaca)' }]} onChange={(v) => pl.set({ estacaFund: v })} />}
      </div>
      <div className="row wrap">
        <Button disabled={!semElemento.length || (pl.tipoFund === 'bloco' && !estacaSel)} onClick={lancarTodos}>Lançar centrados em {semElemento.length} pilar{semElemento.length === 1 ? '' : 'es'} sem elemento</Button>
      </div>
      <Hint>Na planta de fundação, escolha a ferramenta Fundação e clique no pilar: em “automática” o ponto do clique define a posição (perto do centro: centrada; perto de uma face: de divisa; perto de um canto: de canto) e, em divisa e canto, a face ou o canto (nos eixos do pilar). Posição livre: clique no pilar e depois no centro do elemento. Arranque: marque “Arranque” na ferramenta Pilar; ele só aparece na planta de fundação.</Hint>

      {fe.elementos.length > 0 && (
        <div className="tablewrap">
          <table className="data loads-ed quadro" data-fundacoes>
            <thead><tr><th>Elemento</th><th>Pilar</th><th>Posição</th><th>Cota</th><th>Resultado</th><th /></tr></thead>
            <tbody>{fe.elementos.map((e) => {
              const r = resultados.find((x) => x.id === e.id);
              const pil = b.pilares.find((p) => p.id === e.pilares[0]);
              return (
                <tr key={e.id} className={`click ${pl.selecao.has(e.id) ? 'on ' : ''}${r ? cls(r.status) : ''}`} data-fundacao-id={e.id} onClick={() => irParaFundacao(e.id)} onDoubleClick={() => abrirJanelaFundacao(e.id)} title="Clique: ver na planta. Duplo clique: resultados do elemento.">
                  <td className="tl">{e.nome} <span className="muted">{TIPO_FUNDACAO_LABEL[e.tipo]}</span></td>
                  <td className="tl">{pil?.nome ?? '—'}{pil && ehArranque(pil) ? ' (arranque)' : ''}</td>
                  <td className="tl">{POSICAO_LABEL[e.posicao]}</td>
                  <td className="num">{fmt(cotaElemento(b, e))}</td>
                  <td className="tl small">{r ? r.resumo : <span className="muted">não calculado</span>}</td>
                  <td>{r && <Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'ok' : 'erro'}</Pill>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {sel && <ElementoEditor b={b} el={sel} r={resultados.find((x) => x.id === sel.id)} />}

      {(() => {
        const ar = arranques.find((p) => pl.selecao.has(p.id));
        return ar ? <><p className="small"><b>Cargas no arranque {ar.nome}</b></p><CargasNoPilar b={b} p0={ar} pavId="fundacao" pavNome="fundação" /></> : null;
      })()}
      {arranques.length > 0 && !arranques.some((p) => pl.selecao.has(p.id)) && <Hint>{arranques.length} arranque{arranques.length === 1 ? '' : 's'} ({arranques.map((p) => p.nome).join(', ')}): selecione-o na planta de fundação para lançar as cargas.</Hint>}

      <Group title={`Parâmetros do cálculo${b.fundacao?.params && Object.keys(b.fundacao.params).length ? ` (${Object.keys(b.fundacao.params).length} alterado${Object.keys(b.fundacao.params).length === 1 ? '' : 's'})` : ''}`} open={false}>
          {Object.keys(PARAMS_FUNDACAO).map((k) => {
            const [rotulo, unid, fator = 1] = ROTULOS[k] ?? [k];
            const v = (em as unknown as Record<string, number | string>)[k], pad = (base as unknown as Record<string, number | string>)[k];
            const alt = v !== pad;
            const en = ENUMS[k];
            return (
              <div key={k} className="row wrap u-items-end" data-param={k}>
                {en
                  ? <Select label={rotulo} value={String(v)} options={en} onChange={(x) => exec('fundacao.opcoes', { valores: { [k]: x } })} />
                  : <NumField label={rotulo} unit={unid} width={170} value={+(Number(v) * fator).toPrecision(8)} onChange={(x) => exec('fundacao.opcoes', { valores: { [k]: +(x / fator).toPrecision(8) } })} />}
                {alt && <span className="muted small">alterado (padrão {en ? en.find((o) => o.v === pad)?.label : fmt(Number(pad) * fator, 3)})</span>}
              </div>
            );
          })}
          <div className="row wrap">
            <Button disabled={!b.fundacao?.params} onClick={() => exec('fundacao.opcoes', { padrao: true })}>Restaurar os padrões</Button>
          </div>
          <Hint>Parâmetros do módulo Fundações aplicados ao edifício (cobrimento, fck, peso próprio, espaçamento das estacas, limites de sapatas e tubulões, estimativas pelo SPT). Os demais (bielas de Blévot, armadura das estacas) seguem os padrões do módulo; concreto, aço e cobrimento da fundação ficam em “Materiais e segurança”. Estimativas pelo SPT: a confirmar.</Hint>
      </Group>
    </Group>
  );
}

// ---------------------------------------------------------------- edição do elemento selecionado

function ElementoEditor({ b, el, r }: { b: BuildingModel; el: ElementoFundacao; r?: ResultadoFundacao }) {
  const { exec } = useBuilding();
  const fe = b.fundacao!;
  const pil = b.pilares.find((p) => p.id === el.pilares[0]);
  const imp = el.impostas;
  const setImp = (k: 'A' | 'B' | 'h', v: number | undefined) => {
    const n = { ...imp, [k]: v } as { A?: number; B?: number; h?: number };
    if (n.h === undefined) delete n.h;
    if (v === undefined && k !== 'h') { exec('fundacao.editar', { id: el.id, limpar: ['impostas'] }); return; }
    if (n.A && n.B) exec('fundacao.editar', { id: el.id, impostas: { A: n.A, B: n.B, ...(n.h ? { h: n.h } : {}) } });
  };
  const trocarPosicao = (posicao: PosicaoFundacao) => {
    const ladoAjuste = pil ? ladoDoAjuste(pil) : [0, 0];
    const nz = ladoAjuste.filter((x) => x !== 0).length;
    const lado = posicao === 'divisa' ? (nz === 1 ? ladoAjuste : [-1, 0]) : posicao === 'canto' ? (nz === 2 ? ladoAjuste : [-1, -1]) : undefined;
    exec('fundacao.editar', { id: el.id, posicao, ...(lado ? { lado } : {}) });
  };
  const furoVal = !el.sondagem ? 'auto' : el.sondagem.modo === 'media' ? 'media' : `furo:${el.sondagem.ids?.[0]}`;
  const trocarFuro = (v: string) => {
    if (v === 'auto') exec('fundacao.editar', { id: el.id, limpar: ['sondagem'] });
    else if (v === 'media') exec('fundacao.editar', { id: el.id, sondagem: { modo: 'media' } });
    else exec('fundacao.editar', { id: el.id, sondagem: { modo: 'furo', ids: [+v.slice(5)] } });
  };
  return (
    <div className="card" data-editor-fundacao={el.id}>
      <h4>{el.nome} — {TIPO_FUNDACAO_LABEL[el.tipo]}{pil ? ` sob ${pil.nome}` : ''}</h4>
      <div className="row wrap u-items-end">
        <Select label="Tipo" value={el.tipo} options={TIPOS} onChange={(v) => exec('fundacao.editar', { id: el.id, tipo: v, ...(v === 'tubulao' ? { posicao: 'centrada' } : {}) })} />
        <Select label="Posição" value={el.posicao} options={el.tipo === 'tubulao' ? POSICOES.filter((o) => o.v === 'centrada') : POSICOES} onChange={trocarPosicao} />
        {(el.posicao === 'divisa' || el.posicao === 'canto') && (
          <Select label="Lado da divisa" value={JSON.stringify(el.lado ?? [])} options={LADOS[el.posicao]} onChange={(v) => exec('fundacao.editar', { id: el.id, lado: JSON.parse(v) })} />
        )}
      </div>
      <div className="row wrap u-items-end">
        <NumField label="Ângulo" unit="°" width={90} value={el.angulo} onChange={(v) => exec('fundacao.editar', { id: el.id, angulo: v })} />
        <Button onClick={() => exec('fundacao.girar', { ids: [el.id], angulo: el.angulo + 90 })}>Girar 90°</Button>
        <Button onClick={() => exec('fundacao.girar', { ids: [el.id], doPilar: true })}>Ângulo do pilar</Button>
      </div>
      <div className="row wrap u-items-end">
        <OptNumField label={`Cota de assentamento (vazio = ${fmt(cotaFundacao(b))} m)`} unit="m" width={200} value={el.cota} onChange={(v) => exec('fundacao.editar', v === undefined ? { id: el.id, limpar: ['cota'] } : { id: el.id, cota: v })} />
        {el.tipo !== 'bloco' && <OptNumField label="σadm do elemento (vazio = terreno)" unit="kN/m²" width={200} value={el.sigmaAdm} onChange={(v) => exec('fundacao.editar', v === undefined ? { id: el.id, limpar: ['sigmaAdm'] } : { id: el.id, sigmaAdm: v })} />}
      </div>
      <div className="row wrap u-items-end">
        <Select label="Sondagem" value={furoVal} options={[{ v: 'auto', label: 'Automático (mais próximo)' }, ...fe.sondagens.map((s) => ({ v: `furo:${s.id}`, label: s.name })), ...(fe.sondagens.length > 1 ? [{ v: 'media', label: 'Média de todos os furos' }] : [])]} onChange={trocarFuro} />
        {el.tipo === 'bloco' && (<>
          <Select label="Estaca" value={el.estaca?.id ?? ''} options={fe.terreno.estacas.map((e) => ({ v: e.id, label: e.nome }))} onChange={(v) => exec('fundacao.editar', { id: el.id, estaca: { id: v, ...(el.estaca?.n ? { n: el.estaca.n } : {}) } })} />
          <OptNumField label="Nº de estacas (vazio = calculado)" width={170} value={el.estaca?.n} onChange={(v) => el.estaca && exec('fundacao.editar', { id: el.id, estaca: { id: el.estaca.id, ...(v ? { n: Math.round(v) } : {}) } })} />
        </>)}
      </div>
      {el.tipo === 'sapata' && (
        <>
          <div className="row wrap u-items-end">
            <OptNumField label="A imposta" unit="m" width={96} value={imp?.A} onChange={(v) => setImp('A', v)} />
            <OptNumField label="B imposta" unit="m" width={96} value={imp?.B} onChange={(v) => setImp('B', v)} />
            <OptNumField label="h imposta" unit="m" width={96} value={imp?.h} onChange={(v) => setImp('h', v)} />
            <Button disabled={!r?.dims.A || !r?.dims.B} title="Fixa as dimensões calculadas como impostas (para o modo Só verificar)" onClick={() => r && exec('fundacao.editar', { id: el.id, impostas: { A: r.dims.A!, B: r.dims.B!, ...(r.dims.h ? { h: r.dims.h } : {}) } })}>Impor as calculadas</Button>
          </div>
          <Hint>Dimensões impostas são só verificadas (A e B em m, h opcional). Vazio: a sapata é dimensionada.</Hint>
        </>
      )}
      <div className="row wrap">
        <Button disabled={!r} onClick={() => abrirJanelaFundacao(el.id)}>Resultados do elemento</Button>
        <Button variant="danger" onClick={() => exec('fundacao.remover', { ids: [el.id] })}>Remover</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- janela do elemento

/** Conteúdo da janela de um elemento de fundação: resumo, mensagens e os desenhos e verificações do módulo Fundações. */
export function JanelaFundacao({ id }: { id: string }) {
  const b = useBuilding((s) => s.sessao.modelo), dim = useBuilding((s) => s.dim);
  const el = b.fundacao?.elementos.find((x) => x.id === id);
  const r = dim?.fundacoes?.find((x) => x.id === id);
  const atual = useBuilding((s) => fundacaoAtual(s));
  if (!el) return <p className="muted">O elemento não existe mais.</p>;
  if (!r) return <p className="muted">Calcule as fundações (grupo Fundação › Calcular fundações) para ver os resultados do elemento.</p>;
  const P0 = parametrosElemento(parametrosFundacao(b), el, r.profundidade);
  const informada = !!r.sigmaFonte?.startsWith('informada');
  const p = { ...P0, ftSigmaMode: informada ? 'informada' as const : 'spt' as const, tbSigmaMode: informada ? 'informada' as const : 'spt' as const };
  const pr = r.projeto;
  const c = r.carga;
  const sec = (() => { const pil = b.pilares.find((x) => x.id === r.pilarIds[0]); return pil ? dimsSecao(secaoBase(b, pil)) : null; })();
  const f: FoundationData | null = pr ? { boring: pr.boring, borings: [pr.boring], loads: [pr.load], params: p } : null;
  return (
    <div data-janela-fundacao={id}>
      {!atual && <p className="hint bad">Os resultados são anteriores a uma alteração: recalcule as fundações.</p>}
      <div className="row wrap u-items-center">
        <Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'atende' : 'não atende'}</Pill>
        <Pill tone="na">{TIPO_FUNDACAO_LABEL[r.tipo]}</Pill>
        <Pill tone="na">{POSICAO_LABEL[r.posicao]}</Pill>
        {r.mantido && <Pill tone="warn">mantido do cálculo anterior</Pill>}
        <span className="muted">{r.resumo}</span>
      </div>
      <KV rows={[
        ['Pilar', r.pilares.join(', ') + (sec ? ` (${fmt(sec[0] * 100, 0)} × ${fmt(sec[1] * 100, 0)} cm)` : '')],
        ['Cota de assentamento', `${fmt(r.cota)} m (${fmt(r.profundidade)} m abaixo do terreno)`],
        ['Centro do elemento', `x ${fmt(r.centro[0], 3)} m · y ${fmt(r.centro[1], 3)} m · ângulo ${fmt(r.angulo, 1)}°`],
        ['Excentricidade do pilar (eixos do elemento)', `ex ${fmt(r.excentricidade[0], 3)} m · ey ${fmt(r.excentricidade[1], 3)} m`],
        ...(r.sigmaAdm !== undefined ? [['σadm', `${fmt(r.sigmaAdm, 0)} kN/m² (${r.sigmaFonte ?? ''})`] as [string, string]] : []),
        ['Volume de concreto', `${fmt(r.volume, 2)} m³`],
        ...(c ? [['Carga característica no elemento', `Nk ${fmt(c.Nk, 0)} · Nk,mín ${fmt(c.NkMin, 0)} kN · Mx ${fmt(c.Mx, 1)} · My ${fmt(c.My, 1)} kN·m · Hx ${fmt(c.Hx, 1)} · Hy ${fmt(c.Hy, 1)} kN (${c.source ?? ''})`] as [string, string]] : []),
      ]} />
      <h4>Mensagens</h4>
      <Mensagens msgs={r.mensagens} />
      {r.notas.length > 0 && <details className="small"><summary>Observações do cálculo ({r.notas.length})</summary><ul>{r.notas.map((n, i) => <li key={i}>{n}</li>)}</ul></details>}
      {pr && r.tipo === 'sapata' && pr.footing && (isFooting(pr.footing)
        ? <div className="fdetail"><FootingDetail r={pr.footing} ap={pr.ap} bp={pr.bp} p={p} /></div>
        : pr.footing.messages.map((m, i) => <Note tone="bad" key={i}>{m}</Note>))}
      {pr && r.tipo === 'tubulao' && pr.caisson && (isCaisson(pr.caisson)
        ? <div className="fdetail"><CaissonDetail r={pr.caisson} water={pr.boring.water} p={p} /></div>
        : pr.caisson.messages.map((m, i) => <Note tone="bad" key={i}>{m}</Note>))}
      {pr && f && r.tipo === 'bloco' && (
        pr.pile ? <SolutionDetail s={pr.pile} ds={pr} f={f} />
          : pr.pileFixed && pr.cap ? <div className="fdetail"><CapDetail cap={pr.cap} coords={pr.pileFixed.loads.coords} D={pr.pileFixed.D / 100} ap={pr.ap} bp={pr.bp} p={p} /></div>
            : pr.cap ? <div className="fdetail"><CapDetail cap={pr.cap} coords={[]} D={0.4} ap={pr.ap} bp={pr.bp} p={p} /></div> : null
      )}
      <p className="hint">Cálculo do módulo Fundações (NBR 6122, NBR 6118); σadm e demais estimativas pelo SPT são a confirmar. Veja também o memorial do edifício (seção Fundações).</p>
    </div>
  );
}

// ---------------------------------------------------------------- aba Fundações em modo leitura

/** Aviso e lista dos elementos do edifício, no topo da aba Fundações quando o edifício tem fundação lançada. */
export function FundacoesDoEdificio() {
  const b = useBuilding((s) => s.sessao.modelo), dim = useBuilding((s) => s.dim);
  const elementos = b.fundacao?.elementos ?? [];
  const niveis = niveisFundacao(b);
  return (
    <div className="card" data-fundacoes-edificio>
      <p><b>Esta aba está em modo leitura:</b> o edifício tem {elementos.length} elemento{elementos.length === 1 ? '' : 's'} de fundação lançado{elementos.length === 1 ? '' : 's'} ({niveis.length} nível{niveis.length === 1 ? '' : 'is'} de assentamento). O dimensionamento e a edição estão na aba Edifício (grupo Fundação e planta de fundação). Para usar o módulo avulso, remova os elementos de fundação do edifício.</p>
      <table className="data quadro">
        <thead><tr><th>Elemento</th><th>Tipo</th><th>Posição</th><th>Resultado</th></tr></thead>
        <tbody>{elementos.map((e) => {
          const r = dim?.fundacoes?.find((x) => x.id === e.id);
          return <tr key={e.id} className={r ? cls(r.status) : ''}><td className="tl">{e.nome}</td><td className="tl">{TIPO_FUNDACAO_LABEL[e.tipo]}</td><td className="tl">{POSICAO_LABEL[e.posicao]}</td><td className="tl small">{r ? r.resumo : <span className="muted">não calculado</span>}</td></tr>;
        })}</tbody>
      </table>
      <div className="row wrap">
        <Button onClick={() => { usePlanta.getState().set({ pavimento: 'fundacao' }); useStore.getState().set({ module: 'edificio' }); }}>Abrir a planta de fundação do edifício</Button>
      </div>
    </div>
  );
}

// Janela (Modal) do elemento: usada por Revisao.tsx.
export function JanelaDaFundacao({ id, onClose }: { id: string; onClose: () => void }) {
  const nome = useBuilding((s) => s.sessao.modelo.fundacao?.elementos.find((x) => x.id === id)?.nome ?? id);
  return <Modal titulo={`Resultados do elemento — Fundação ${nome}`} onClose={onClose} larga><JanelaFundacao id={id} /></Modal>;
}
