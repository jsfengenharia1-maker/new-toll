// Fundação de vários pilares, limites e edição (frente FU3, interface): associar pilares (sapata associada, bloco com
// vários pilares), unir, igualar, impor dimensões e armadura, concreto simples e altura constante, opções das sapatas,
// limites poligonais e eliminação de sobreposições. Toda alteração é comando do registro (`fundacao.*`, `limite.*`).
import { useEffect, useState } from 'react';
import { useBuilding, fundacaoAtual } from './store';
import { usePlanta } from './plantaStore';
import { planoGrupo, sobreposicoesDe } from './fundacaoGrupo';
import { Button, Check, Hint, NumCell, NumField, OptNumField, Pill, Select, TextField } from '../ui';
import { impostasDoResultado, TIPO_FUNDACAO_LABEL, type ResultadoFundacao } from '../../core/building/fundacao';
import { ehArranque, type BuildingModel, type ElementoFundacao, type ImpostasFundacao, type LimiteFundacao, type TipoFundacao } from '../../core/building/types';
import { OPCOES_INFO, opcoesEmUso, padraoDe, perfilDe } from '../../core/building/opcoes';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const nomePilar = (b: BuildingModel, id: string) => b.pilares.find((p) => p.id === id)?.nome ?? id;

// ---------------------------------------------------------------- associar pilares e unir sapatas

/** Pilares que nascem na fundação escolhidos na planta; cria a associada / o bloco com vários pilares ou une as sapatas escolhidas. */
export function AssociarPilares({ b, estaca }: { b: BuildingModel; estaca: string | null }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const fe = b.fundacao;
  const pilares = b.pilares.filter((p) => pl.selecao.has(p.id) && p.nasce === 'fundacao');
  const sapatas = (fe?.elementos ?? []).filter((e) => pl.selecao.has(e.id) && e.tipo === 'sapata');
  const plano = planoGrupo(b, pilares.map((p) => p.id), pl.tipoFund, estaca ?? undefined);
  return (
    <div data-associar-pilares>
      <p className="small"><b>Vários pilares: sapata associada e bloco</b></p>
      <div className="row wrap u-items-center">
        <Check label="Escolher na planta (clique em cada pilar; Enter cria)" checked={pl.multiFund} onChange={(v) => pl.set({ multiFund: v, pilaresFund: [], ...(v ? { ferramenta: 'fundacao' as const, pavimento: 'fundacao' } : {}) })} />
        {pl.multiFund && <span className="muted small">{pl.pilaresFund.length} pilar(es) escolhido(s)</span>}
      </div>
      <div className="row wrap">
        <Button disabled={pilares.length < 2} title={plano.erro ?? plano.resumo} onClick={() => { const r = exec('lote', { comandos: plano.cmds }); if (r.ok) pl.set({ selecao: new Set() }); }}>
          {pl.tipoFund === 'bloco' ? 'Bloco' : 'Sapata associada'} com os {pilares.length} pilares selecionados
        </Button>
        <Button disabled={sapatas.length < 2} title="Une as sapatas selecionadas numa só (a primeira fica, com os pilares de todas)" onClick={() => { const r = exec('fundacao.unir', { ids: sapatas.map((e) => e.id) }); if (r.ok) pl.set({ selecao: new Set([sapatas[0].id]) }); }}>Unir as {sapatas.length} sapatas selecionadas</Button>
      </div>
      {pilares.length >= 2 && plano.erro && <p className="hint bad">{plano.erro}</p>}
      <Hint>Selecione os pilares na planta de fundação (ferramenta Selecionar, janela ou Shift) e use o tipo escolhido acima: sapata associada (uma base rígida sob todos, resultante no centro, com o negativo entre pilares) ou bloco sobre estacas com vários pilares (estacas pela resultante, bielas e tirantes por pilar). Pilares que já têm elemento passam ao novo (o elemento antigo é removido; sapatas são unidas). Unir vale só para sapatas de mesma cota. Método de bielas e tirantes por pilar e relação vão/altura: a confirmar.</Hint>
    </div>
  );
}

// ---------------------------------------------------------------- opções das sapatas

const CHAVES_SAPATA = ['fundDescolamento', 'fundVaoAltura', 'fundBalancoAltura', 'fundSimplesGamma', 'fundReducaoTaxa'] as const;

/** Opções de cálculo das sapatas (opcoes.definir): descolamento, rigidez, concreto simples e taxa mínima reduzida. */
export function OpcoesSapatas({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const perfil = perfilDe(b), op = opcoesEmUso(b.opcoes, perfil);
  return (
    <div data-opcoes-sapatas>
      <p className="small"><b>Opções das sapatas</b></p>
      {CHAVES_SAPATA.map((k) => {
        const o = OPCOES_INFO.find((x) => x.chave === k)!, pad = padraoDe(o, perfil);
        return (
          <div key={k} className="row wrap u-items-end" data-opcao-fundacao={k}>
            {o.booleana
              ? <Check label={o.rotulo} checked={!!op[k]} onChange={(c) => exec('opcoes.definir', { valores: { [k]: c ? 1 : 0 } })} />
              : <NumField label={o.rotulo} unit={o.unidade} width={190} value={op[k]} onChange={(v) => exec('opcoes.definir', { valores: { [k]: v } })} />}
            <span className="muted small" title={o.descricao}>padrão {o.booleana ? (pad ? 'sim' : 'não') : fmt(pad, 2)}{o.aConfirmar ? ' · a confirmar' : ''}{op[k] !== pad && <> · <b>alterada</b></>}</span>
          </div>
        );
      })}
      <Hint>Descolamento: aceita a sapata com área comprimida menor que o mínimo da NBR 6122 (a tensão máxima segue limitada). Rigidez: a sapata associada é rígida se o maior vão entre pilares ≤ fator × h e o balanço ≤ fator × h. Concreto simples: γc majorado pelo fator (cap. 24 da NBR 6118). Taxa mínima reduzida: As,mín = 4/3·As,calc quando menor que a mínima.</Hint>
    </div>
  );
}

// ---------------------------------------------------------------- sobreposições

/** Aviso FUND_SOBREPOSTA com o botão que une as sapatas sobrepostas (sapata associada). */
export function SobreposicaoBloco({ b, apenas }: { b: BuildingModel; apenas?: string }) {
  const { exec } = useBuilding();
  const dim = useBuilding((s) => s.dim);
  const atual = useBuilding((s) => fundacaoAtual(s));
  const grupos = (atual ? sobreposicoesDe(dim?.fundacoes) : []).filter((g) => !apenas || g.includes(apenas));
  if (!grupos.length) return null;
  const els = b.fundacao?.elementos ?? [];
  const nome = (id: string) => els.find((e) => e.id === id)?.nome ?? id;
  const unem = grupos.filter((g) => g.every((id) => els.find((e) => e.id === id)?.tipo === 'sapata'));
  return (
    <div className="card" data-sobreposicao>
      <p className="hint warn"><Pill tone="warn">FUND_SOBREPOSTA</Pill> Elementos sobrepostos em planta: {grupos.map((g) => g.map(nome).join(' + ')).join('; ')}.</p>
      <div className="row wrap">
        <Button disabled={!unem.length} title="Une as sapatas de cada grupo sobreposto numa sapata associada" onClick={() => exec('fundacao.eliminarSobreposicoes', { grupos: unem })}>Eliminar sobreposições (unir {unem.length} grupo{unem.length === 1 ? '' : 's'})</Button>
      </div>
      {unem.length < grupos.length && <Hint>Blocos e tubulões sobrepostos não se unem (só sapatas): afaste-os, mude o tipo ou crie um bloco com vários pilares.</Hint>}
    </div>
  );
}

// ---------------------------------------------------------------- limites

/** Lista, ferramentas e editor de vértices dos limites poligonais (divisa, poço de elevador, reservatório). */
export function LimitesBloco({ b, onPlanta }: { b: BuildingModel; onPlanta: () => void }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const dim = useBuilding((s) => s.dim);
  const ls = b.fundacao?.limites ?? [];
  const sel = ls.find((l) => pl.selecao.has(l.id));
  const ignorados = new Map<string, string[]>();
  for (const r of dim?.fundacoes ?? []) for (const x of r.grupo?.limitesIgnorados ?? []) ignorados.set(x.id, [...(ignorados.get(x.id) ?? []), `${r.nome}: ${x.motivo}`]);
  const ferr = (f: 'limite' | 'limiteMascara') => { pl.set({ ferramenta: f, pavimento: 'fundacao', selecao: new Set() }); onPlanta(); };
  return (
    <div data-limites-fundacao>
      <p className="small"><b>Limites ({ls.length})</b></p>
      <div className="row wrap u-items-center">
        <Button variant={pl.ferramenta === 'limite' ? 'primary' : 'default'} onClick={() => ferr('limite')}>Desenhar limite (T)</Button>
        <Button variant={pl.ferramenta === 'limiteMascara' ? 'primary' : 'default'} disabled={!b.mascaras.length} title={b.mascaras.length ? 'Clique numa linha da máscara DXF: a polilinha ligada a ela vira o limite' : 'Importe uma máscara DXF primeiro'} onClick={() => ferr('limiteMascara')}>Capturar da máscara (Q)</Button>
        <Check label="fechado" checked={pl.limiteFechado} onChange={(v) => pl.set({ limiteFechado: v })} />
      </div>
      {ls.length > 0 && (
        <div className="tablewrap">
          <table className="data loads-ed quadro" data-limites-tabela>
            <thead><tr><th>Limite</th><th>Vértices</th><th>Tipo</th><th>Nível (cota)</th><th>Situação</th><th /></tr></thead>
            <tbody>{ls.map((l) => (
              <tr key={l.id} className={`click ${pl.selecao.has(l.id) ? 'on ' : ''}${ignorados.has(l.id) ? 'warn' : ''}`} data-limite-id={l.id} onClick={() => { pl.set({ pavimento: 'fundacao', selecao: new Set([l.id]), foco: { id: l.id, n: Date.now() } }); onPlanta(); }} title="Clique: ver na planta e editar os vértices.">
                <td className="tl">{l.nome}</td><td className="num">{l.pontos.length}</td><td className="tl">{l.fechado ? 'fechado' : 'aberto'}</td><td className="num">{l.cota !== undefined ? fmt(l.cota) : 'todos'}</td>
                <td className="tl small">{ignorados.has(l.id) ? <span className="warn">ignorado: {ignorados.get(l.id)!.join('; ')}</span> : dim?.fundacoes ? <span className="muted">em uso</span> : <span className="muted">não calculado</span>}</td>
                <td><Button variant="x" aria-label={`Remover limite ${l.nome}`} onClick={(e) => { e.stopPropagation(); exec('limite.remover', { ids: [l.id] }); }}>×</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {sel && <LimiteEditor l={sel} />}
      <Hint>O limite apara as sapatas de altura constante do nível: a sapata não o invade e fica com a parte onde está o pilar. É ignorado, com aviso, se cortar um pilar, isolar um pilar da associada ou se a sapata tiver altura variável. Não vale para blocos, vigas e tubulões. Selecione na planta (clique na linha) para editar os vértices; Del remove.</Hint>
    </div>
  );
}

function LimiteEditor({ l }: { l: LimiteFundacao }) {
  const { exec } = useBuilding();
  const ed = (patch: Record<string, unknown>) => exec('limite.editar', { id: l.id, ...patch });
  const pts = l.pontos as [number, number][];
  const set = (i: number, k: 0 | 1, v: number) => ed({ pontos: pts.map((q, j) => (j === i ? (k === 0 ? [v, q[1]] : [q[0], v]) : q)) });
  const inserir = (i: number) => {
    const a = pts[i], z = pts[(i + 1) % pts.length];
    const m: [number, number] = [+((a[0] + z[0]) / 2).toFixed(4), +((a[1] + z[1]) / 2).toFixed(4)];
    ed({ pontos: [...pts.slice(0, i + 1), m, ...pts.slice(i + 1)] });
  };
  const minimo = l.fechado ? 3 : 2;
  return (
    <div className="card" data-editor-limite={l.id}>
      <h4>{l.nome} — limite {l.fechado ? 'fechado' : 'aberto'}</h4>
      <div className="row wrap u-items-end">
        <TextField label="Nome" value={l.nome} onChange={(t) => t.trim() && t.trim() !== l.nome && ed({ nome: t.trim() })} />
        <Check label="Fechado" checked={!!l.fechado} onChange={(v) => ed({ fechado: v })} />
        <OptNumField label="Cota do nível (vazio = todos)" unit="m" width={190} value={l.cota} onChange={(v) => (v === undefined ? ed({ limpar: ['cota'] }) : ed({ cota: v }))} />
      </div>
      <div className="tablewrap">
        <table className="data loads-ed quadro" data-vertices-limite>
          <thead><tr><th>#</th><th>x (m)</th><th>y (m)</th><th /></tr></thead>
          <tbody>{pts.map((q, i) => (
            <tr key={i}>
              <td className="num">{i + 1}</td>
              <td><NumCell value={q[0]} onChange={(v) => set(i, 0, v)} /></td>
              <td><NumCell value={q[1]} onChange={(v) => set(i, 1, v)} /></td>
              <td>
                <Button variant="mini" aria-label={`Inserir vértice depois do ${i + 1}`} disabled={!l.fechado && i === pts.length - 1} onClick={() => inserir(i)}>+</Button>
                <Button variant="x" aria-label={`Remover vértice ${i + 1}`} disabled={pts.length <= minimo} onClick={() => ed({ pontos: pts.filter((_, j) => j !== i) })}>×</Button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- edição do elemento: pilares, concreto simples, ponto de inserção, igualar e impor

interface Rascunho { A?: number; B?: number; h?: number; h0?: number; Df?: number; xphi?: number; xs?: number; xn?: number; yphi?: number; ys?: number }

const rascunhoDe = (i?: ImpostasFundacao): Rascunho => ({
  A: i?.A, B: i?.B, h: i?.h, h0: i?.h0, Df: i?.Df,
  xphi: i?.armadura?.x?.phi, xs: i?.armadura?.x?.s !== undefined ? +(i.armadura.x.s * 100).toFixed(2) : undefined, xn: i?.armadura?.x?.n,
  yphi: i?.armadura?.y?.phi, ys: i?.armadura?.y?.s !== undefined ? +(i.armadura.y.s * 100).toFixed(2) : undefined,
});

/** Impostas a partir do rascunho (m, mm, s em cm → m); nulo enquanto faltar a base A × B. */
export function montarImpostas(tipo: TipoFundacao, d: Rascunho): ImpostasFundacao | null {
  if (!d.A || !d.B) return null;
  const imp: ImpostasFundacao = { A: d.A, B: d.B };
  if (d.h) imp.h = d.h;
  if (tipo === 'sapata' && d.h0) imp.h0 = d.h0;
  if (tipo === 'tubulao' && d.Df) imp.Df = d.Df;
  const dir = (phi?: number, s?: number, n?: number) => (phi ? { phi, ...(s ? { s: +(s / 100).toFixed(4) } : {}), ...(n ? { n: Math.round(n) } : {}) } : undefined);
  const x = tipo === 'bloco' ? dir(d.xphi, undefined, d.xn) : tipo === 'sapata' ? dir(d.xphi, d.xs) : undefined;
  const y = tipo === 'sapata' ? dir(d.yphi, d.ys) : undefined;
  if (x || y) imp.armadura = { ...(x ? { x } : {}), ...(y ? { y } : {}) };
  return imp;
}

/** Dimensões e armadura impostas (só verificadas) de sapata, bloco ou tubulão. */
function ImpostasEditor({ el, r }: { el: ElementoFundacao; r?: ResultadoFundacao }) {
  const { exec } = useBuilding();
  const chave = JSON.stringify(el.impostas ?? null);
  const [d, setD] = useState<Rascunho>(() => rascunhoDe(el.impostas));
  useEffect(() => setD(rascunhoDe(el.impostas)), [el.id, chave]); // eslint-disable-line react-hooks/exhaustive-deps
  const calc = r ? impostasDoResultado(r) : undefined;
  const mudar = (k: keyof Rascunho, v: number | undefined) => {
    const n = { ...d, [k]: v };
    setD(n);
    const imp = montarImpostas(el.tipo, n);
    if (imp) exec('fundacao.impor', { ids: [el.id], impostas: imp });
  };
  const F = (k: keyof Rascunho, label: string, unit: string, width = 92) => <OptNumField key={k} label={label} unit={unit} width={width} value={d[k]} onChange={(v) => mudar(k, v)} />;
  const tit = el.tipo === 'sapata' ? ['A', 'B'] : el.tipo === 'bloco' ? ['lx', 'ly'] : ['Base Db', ''];
  return (
    <div data-impostas-fundacao={el.id}>
      <p className="small"><b>Dimensões e armadura impostas</b> {el.impostas ? <Pill tone="warn">só verificadas</Pill> : <span className="muted">(vazio: dimensionado)</span>}</p>
      <div className="row wrap u-items-end">
        {F('A', `${tit[0]} imposta`, 'm')}
        {el.tipo !== 'tubulao' ? F('B', `${tit[1]} imposta`, 'm') : <span className="muted small">base circular: Db = A = B</span>}
        {el.tipo !== 'tubulao' && F('h', 'h imposta', 'm')}
        {el.tipo === 'sapata' && F('h0', 'h0 imposta', 'm')}
        {el.tipo === 'tubulao' && F('Df', 'Fuste Df', 'm')}
      </div>
      {el.tipo === 'sapata' && (
        <div className="row wrap u-items-end">
          {F('xphi', 'Barras // A: φ', 'mm')}{F('xs', 'c/', 'cm')}
          {F('yphi', 'Barras // B: φ', 'mm')}{F('ys', 'c/', 'cm')}
        </div>
      )}
      {el.tipo === 'bloco' && (
        <div className="row wrap u-items-end">
          {F('xphi', 'Tirante: φ', 'mm')}{F('xn', 'nº de barras', '', 110)}
        </div>
      )}
      <div className="row wrap">
        <Button disabled={!calc} title="Fixa as dimensões e a armadura calculadas como impostas (para o modo Só verificar e para soltar um elemento igualado)" onClick={() => calc && exec('fundacao.impor', { ids: [el.id], impostas: calc })}>Impor as calculadas</Button>
        <Button disabled={!el.impostas} onClick={() => exec('fundacao.impor', { ids: [el.id], limpar: true })}>Remover a imposição</Button>
      </div>
      <Hint>Elemento com dimensões impostas é só verificado (não é redimensionado): informe a base ({el.tipo === 'bloco' ? 'lx × ly' : el.tipo === 'tubulao' ? 'Db' : 'A × B'}) e, se quiser, a altura e a armadura. {el.tipo === 'bloco' ? 'Tirantes: bitola e número de barras da maior faixa. ' : ''}Sem armadura imposta, a armadura é calculada para as dimensões dadas.</Hint>
    </div>
  );
}

/** Pilares apoiados, concreto simples, altura constante, ponto de inserção, igualar e impostas do elemento. */
export function ElementoGrupoEditor({ b, el, r, onPlanta }: { b: BuildingModel; el: ElementoFundacao; r?: ResultadoFundacao; onPlanta: () => void }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const fe = b.fundacao!;
  const livres = b.pilares.filter((p) => p.nasce === 'fundacao' && !fe.elementos.some((e) => e.pilares.includes(p.id)));
  const compat = (e: ElementoFundacao) => e.id !== el.id && e.pilares.length === el.pilares.length && (e.tipo === 'tubulao') === (el.tipo === 'tubulao');
  const candidatos = fe.elementos.filter(compat);
  const [modelo, setModelo] = useState('');
  const modeloEf = candidatos.some((e) => e.id === modelo) ? modelo : candidatos[0]?.id ?? '';
  const selecionados = fe.elementos.filter((e) => pl.selecao.has(e.id) && compat(e));
  const igual = el.igualA ? fe.elementos.find((e) => e.id === el.igualA) : undefined;
  const ed = (patch: Record<string, unknown>) => exec('fundacao.editar', { id: el.id, ...patch });
  const centroTxt = r ? `${fmt(r.centro[0], 3)} ; ${fmt(r.centro[1], 3)}` : `${fmt(el.x, 3)} ; ${fmt(el.y, 3)}`;
  return (
    <div data-elemento-grupo={el.id}>
      <p className="small"><b>Pilares apoiados ({el.pilares.length})</b></p>
      <div className="row wrap u-items-center">
        {el.pilares.map((id) => (
          <span key={id} className="chip on" data-pilar-do-elemento={id}>{nomePilar(b, id)}{ehArranque(b.pilares.find((p) => p.id === id)!) ? ' (arranque)' : ''}
            {el.pilares.length > 1 && <Button variant="x" aria-label={`Retirar o pilar ${nomePilar(b, id)}`} onClick={() => ed({ pilares: el.pilares.filter((x) => x !== id) })}>×</Button>}
          </span>
        ))}
        {el.tipo !== 'tubulao' && livres.length > 0 && <Select label="Juntar pilar" value="" options={[{ v: '', label: '—' }, ...livres.map((p) => ({ v: p.id, label: p.nome }))]} onChange={(v) => v && ed({ pilares: [...el.pilares, v] })} />}
      </div>
      {el.pilares.length > 1 && <Hint>Elemento de vários pilares: a posição é a resultante dos pilares (centrada) ou o centro informado (livre). Retirar o pilar até sobrar um volta à sapata isolada / bloco simples.</Hint>}
      <div className="row wrap u-items-end">
        <NumField label="Centro x" unit="m" width={110} value={+(r?.centro[0] ?? el.x).toFixed(4)} onChange={(v) => ed({ x: v, y: r?.centro[1] ?? el.y, posicao: 'livre' })} />
        <NumField label="Centro y" unit="m" width={110} value={+(r?.centro[1] ?? el.y).toFixed(4)} onChange={(v) => ed({ x: r?.centro[0] ?? el.x, y: v, posicao: 'livre' })} />
        <Button title="Na planta: clique no elemento e depois no novo centro (N)" onClick={() => { pl.set({ ferramenta: 'insFund', pavimento: 'fundacao', selecao: new Set([el.id]) }); onPlanta(); }}>Mover o ponto de inserção (N)</Button>
        <span className="muted small">centro atual {centroTxt} m — posição {el.posicao}</span>
      </div>
      {el.tipo === 'sapata' && (
        <div className="row wrap u-items-center">
          <Check label="Concreto simples (sem armadura de flexão)" checked={!!el.simples} onChange={(v) => ed({ simples: v })} />
          <Check label="Altura constante (h0 = h; só ela é aparada por limites)" checked={!!el.alturaConstante} onChange={(v) => ed({ alturaConstante: v })} />
        </div>
      )}
      <div className="row wrap u-items-end">
        <Select label="Igualar a" value={modeloEf} options={candidatos.length ? candidatos.map((e) => ({ v: e.id, label: `${e.nome} (${TIPO_FUNDACAO_LABEL[e.tipo]})` })) : [{ v: '', label: '(sem outro elemento compatível)' }]} onChange={setModelo} />
        <Button disabled={!candidatos.length} title="Copia o tipo, a geometria e a armadura calculados do modelo; este elemento passa a ser só verificado" onClick={() => exec('fundacao.igualar', { modelo: modeloEf, ids: [el.id] })}>Igualar este ao modelo</Button>
        <Button disabled={!selecionados.length} title="Copia deste elemento para os outros selecionados na planta (mesmo número de pilares)" onClick={() => exec('fundacao.igualar', { modelo: el.id, ids: selecionados.map((e) => e.id) })}>Igualar os {selecionados.length} selecionados a este</Button>
      </div>
      {igual && (
        <p className="hint" data-igualado-a={igual.id}>
          <Pill tone="warn">igualado</Pill> a {igual.nome}: copia a geometria e a armadura calculadas do modelo e é só verificado; fica com erro (FUND_IGUAL_MODELO / FUND_NAO_ATENDE) se não atender.
          {' '}<Button disabled={!r || !impostasDoResultado(r)} title="Fixa o resultado atual como imposto e solta a igualdade" onClick={() => r && exec('fundacao.impor', { ids: [el.id], impostas: impostasDoResultado(r)! })}>Soltar (impor as calculadas)</Button>
        </p>
      )}
      <ImpostasEditor el={el} r={r} />
      {!r && <Hint>Calcule as fundações para ver as dimensões calculadas e poder fixá-las.</Hint>}
    </div>
  );
}

