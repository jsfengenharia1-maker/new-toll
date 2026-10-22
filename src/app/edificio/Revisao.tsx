// Revisão de resultados do edifício (frente R1): lista de erros e avisos, janela de resultados por elemento
// (diagramas de envoltória das vigas, combinações determinantes dos pilares, lajes), deslocamentos laterais e listagem em CSV.
import { JanelaPilarParede } from './PilarParedeUI';
import type { Origem } from '../../core/building/origem';
import { useRef, useState } from 'react';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';
import { useRevisao } from './revisao';
import { Button, download, Modal, Pill, Select, Seg, KV } from '../ui';
import { CODIGOS_REVISAO, classificar, type TipoRevisao } from '../../core/building/revisao';
import { sugestaoDe } from '../../core/building/sugestoes';
import { capacidadeViga, taxaDoPilar, type PontoCapacidade } from '../../core/building/relatorios';
import { DadosDoPilar, SituacaoPilares } from './RelatoriosUI';
import { inicioDe, pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import { apoioDoPilar, excentricidadeApoio } from '../../core/building/transicao';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { DimEdificio } from './calculo';
import { EditorArmaduraPilar, EditorArmaduraViga } from './Armadura';
import { CopiarArmadura, DetalheDaViga } from './Detalhamento';
import { DetalheDoPilar } from './DetalhamentoPilar';
import { SegundaOrdemPilar } from './SegundaOrdem';
import { DetalheDaLaje } from './DetalhamentoLaje';
import { JanelaVigotas } from './Vigotas';
import { TabelaFlechas } from './FlechasTabela';
import { JanelaPuncao } from './Puncao';
import { envoltoriaLajes } from '../../core/building/puncao';
import { JanelaFundacao } from './Fundacao';
import { JanelaBaseElastica, ehBaseElastica } from './BaseElasticaUI';
import { JanelaCorrida, ehCorrida } from './CorridaUI';
import { JanelaVigaFundacao } from './VigaFundacao';
import { limiteDaMensagem, sobreposicoesDe } from './fundacaoGrupo';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
export const ST_TXT = { ok: 'ok', fail: 'não atende', review: 'revisar' } as const;
const TIPO_TXT: Record<TipoRevisao, string> = { viga: 'Viga', pilar: 'Pilar', laje: 'Laje', fundacao: 'Fundação', obra: 'Obra', pilarParede: 'Pilar-parede' };

export type Alvo = { tipo: 'viga' | 'pilar' | 'laje' | 'fundacao' | 'pilarParede'; id: string; pavimento?: string };

/** Abre a janela de resultados do elemento. */
export const abrirJanela = (a: Alvo) => usePlanta.getState().set({ janela: a });

/**
 * Seleciona o elemento na planta e pede para centralizá-lo. Pilares e lajes vão para o pavimento do resultado;
 * vigas valem para o grupo (mantém o pavimento atual se ele for do grupo da viga).
 */
export function irParaElemento(b: BuildingModel, tipo: 'viga' | 'pilar' | 'laje' | 'fundacao' | 'pilarParede', id: string, pavimentoNome?: string) {
  const P = usePlanta.getState(), ps = pavimentosOrdenados(b);
  let pav = P.pavimento;
  if (tipo === 'fundacao') {
    pav = 'fundacao';
  } else if (tipo === 'pilar' && !pavimentoNome) {
    // pilar que nasce na fundação sem elemento lançado (aviso FUND_PILAR_SEM_ELEMENTO): vai para a planta de fundação
    const q = b.pilares.find((x) => x.id === id);
    if (q?.nasce === 'fundacao' && b.fundacao?.elementos.length && !b.fundacao.elementos.some((e) => e.pilares.includes(id))) pav = 'fundacao';
  } else if (tipo === 'viga') {
    const v = b.vigas.find((x) => x.id === id);
    const atual = ps.find((p) => p.id === pav);
    if (v && atual?.grupo !== v.grupo) pav = ps.find((p) => p.grupo === v.grupo)?.id ?? pav;
  } else {
    const p = ps.find((x) => x.nome === pavimentoNome);
    if (p) pav = p.id;
  }
  P.set({ pavimento: pav, selecao: new Set([id]), foco: { id, n: Date.now() } });
}

/** Um clique (após uma pequena espera) e duplo clique de uma linha, sem que o primeiro dispare antes do segundo. */
export function useCliqueDuplo(umClique: () => void, duplo: () => void) {
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return {
    onClick: () => { clearTimeout(t.current); t.current = setTimeout(umClique, 230); },
    onDoubleClick: () => { clearTimeout(t.current); duplo(); },
  };
}

/** Linha de tabela clicável: um clique leva à planta, duplo clique abre a janela de resultados. */
export function LinhaElemento({ className, title, ir, abrir, children }: { className: string; title?: string; ir: () => void; abrir: () => void; children: React.ReactNode }) {
  const h = useCliqueDuplo(ir, abrir);
  return <tr className={className} title={title} {...h}>{children}</tr>;
}

/** Abre o grupo Tabelas de armadura na tabela que o elemento usa (atalho dos erros FORA_TABELA e ARM_MANUAL). */
function abrirTabela(b: BuildingModel, tipo: TipoRevisao, id: string, codigo: string, mensagem: string) {
  const v = tipo === 'viga' ? b.vigas.find((x) => x.id === id) : undefined, p = tipo === 'pilar' ? b.pilares.find((x) => x.id === id) : undefined, l = tipo === 'laje' ? b.lajes.find((x) => x.id === id) : undefined;
  const estribo = codigo === 'FORA_TABELA' && /\(estribos\)/.test(mensagem);
  const alvo = tipo === 'viga' ? { tipo: estribo ? 'estribos' as const : 'vigas' as const, id: (estribo ? v?.tabelaEstribo : v?.tabela) ?? 'padrao' }
    : tipo === 'pilar' ? { tipo: 'pilares' as const, id: p?.tabela ?? 'padrao' } : { tipo: 'lajes' as const, id: l?.tabela ?? 'padrao' };
  usePlanta.getState().set({ tabelaFoco: { ...alvo, n: (usePlanta.getState().tabelaFoco?.n ?? 0) + 1 } });
}

// ---------------------------------------------------------------- lista de erros e avisos

export function ListaErros({ onIr }: { onIr: (tipo: 'viga' | 'pilar' | 'laje' | 'fundacao' | 'pilarParede', id: string, pavimento?: string) => void }) {
  const rev = useRevisao();
  const analise = useBuilding((s) => s.analise), dim = useBuilding((s) => s.dim);
  const { exec } = useBuilding();
  const modelo = useBuilding((s) => s.sessao.modelo);
  const [nivel, setNivel] = useState<'todos' | 'erro' | 'aviso'>('todos');
  const [tipo, setTipo] = useState<'todos' | TipoRevisao>('todos');
  if (!analise && !dim) return null;
  const itens = rev.itens.filter((i) => (nivel === 'todos' || i.nivel === nivel) && (tipo === 'todos' || i.tipo === tipo));
  return (
    <div className="card" data-lista-erros>
      <h3>Erros e avisos</h3>
      <p className="small" data-contagem>
        <b className={rev.erros ? 'bad' : ''}>{rev.erros} {rev.erros === 1 ? 'erro' : 'erros'}</b> · <b className={rev.avisos ? 'warn' : ''}>{rev.avisos} {rev.avisos === 1 ? 'aviso' : 'avisos'}</b>
      </p>
      <div className="row wrap">
        <Select label="Nível" value={nivel} options={[{ v: 'todos', label: 'Todos' }, { v: 'erro', label: 'Só erros' }, { v: 'aviso', label: 'Só avisos' }]} onChange={setNivel} />
        <Select label="Tipo" value={tipo} options={[{ v: 'todos', label: 'Todos' }, { v: 'viga', label: 'Vigas' }, { v: 'pilar', label: 'Pilares' }, { v: 'laje', label: 'Lajes' }, { v: 'fundacao', label: 'Fundações' }, { v: 'obra', label: 'Obra' }]} onChange={setTipo} />
      </div>
      {itens.length === 0
        ? <p className="muted small">{rev.itens.length ? 'Nenhum item neste filtro.' : 'Nenhum erro ou aviso.'}</p>
        : (
          <div className="tablewrap">
            <table className="data quadro">
              <thead><tr><th>Elemento</th><th>Pavimento</th><th>Código</th><th>Mensagem</th><th /></tr></thead>
              <tbody>
                {itens.map((i, k) => {
                  const el = i.tipo !== 'obra' && i.id ? { tipo: i.tipo, id: i.id } : null;
                  return (
                    <LinhaElemento key={k} className={`${el ? 'click' : ''} ${i.nivel === 'erro' ? 'bad' : 'warn'}`} title={el ? 'Clique: ver na planta. Duplo clique: resultados do elemento.' : undefined}
                      ir={() => el && onIr(el.tipo, el.id, i.pavimento)} abrir={() => el && abrirJanela({ ...el, pavimento: i.pavimento })}>
                      <td className="tl">{TIPO_TXT[i.tipo]} {i.nome}</td><td className="tl">{i.pavimento ?? '—'}</td>
                      <td><Pill tone={i.nivel === 'erro' ? 'bad' : 'warn'}>{i.codigo}</Pill></td><td className="tl">{i.mensagem}{i.sugestao && <div className="small muted" data-sugestao={i.codigo}>Sugestão: {i.sugestao}</div>}</td>
                      <td>
                        {el && <button type="button" className="mini" onClick={(e) => { e.stopPropagation(); abrirJanela({ ...el, pavimento: i.pavimento }); }}>resultados</button>}
                        {el && i.codigo === 'FUND_SOBREPOSTA' && <button type="button" className="mini" data-acao-unir title="Une as sapatas sobrepostas numa sapata associada" onClick={(e) => { e.stopPropagation(); const g = sobreposicoesDe(dim?.fundacoes).find((x) => x.includes(el.id)); if (g) exec('fundacao.eliminarSobreposicoes', { grupos: [g] }); }}>unir sapatas</button>}
                        {i.codigo === 'FUND_LIMITE_IGNORADO' && <button type="button" className="mini" data-acao-limite title="Mostra o limite na planta de fundação" onClick={(e) => { e.stopPropagation(); const l = modelo.fundacao?.limites?.find((x) => x.nome === limiteDaMensagem(i.mensagem)); if (l) usePlanta.getState().set({ pavimento: 'fundacao', selecao: new Set([l.id]), foco: { id: l.id, n: Date.now() } }); }}>ver limite</button>}
                        {el && i.codigo === 'FUND_IGUAL_MODELO' && <button type="button" className="mini" data-acao-modelo title="Vai ao elemento modelo da igualdade" onClick={(e) => { e.stopPropagation(); const m = modelo.fundacao?.elementos.find((x) => x.id === el.id)?.igualA; if (m) irParaElemento(modelo, 'fundacao', m); }}>ver modelo</button>}
                        {el && /^(FORA_TABELA|ARM_MANUAL)/.test(i.codigo) && <button type="button" className="mini" data-atalho-tabela onClick={(e) => { e.stopPropagation(); abrirTabela(modelo, el.tipo, el.id, i.codigo, i.mensagem); }}>tabela</button>}
                      </td>
                    </LinhaElemento>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      <details className="small">
        <summary>Legenda dos códigos</summary>
        <table className="data quadro">
          <thead><tr><th>Código</th><th>Nível</th><th>Motivo</th><th>Sugestão</th></tr></thead>
          <tbody>{CODIGOS_REVISAO.map((c) => <tr key={c.codigo}><td className="tl">{c.codigo}</td><td className="tl">{c.nivel === 'erro' ? 'erro' : c.nivel === 'aviso' ? 'aviso' : 'informação (não listada)'}</td><td className="tl">{c.descricao}</td><td className="tl small">{sugestaoDe(c.codigo)}</td></tr>)}</tbody>
        </table>
        <p className="hint">Erro = o elemento não atende ao cálculo (vermelho na planta); aviso = atende, mas pede atenção (amarelo). Mensagens sem regra conhecida entram como AVISO.</p>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------- janela de resultados por elemento

export function Mensagens({ msgs }: { msgs: string[] }) {
  if (!msgs.length) return <p className="muted small">Sem mensagens.</p>;
  return (
    <ul className="revmsg">
      {msgs.map((m, i) => { const c = classificar(m); return <li key={i}><Pill tone={c.nivel === 'erro' ? 'bad' : c.nivel === 'aviso' ? 'warn' : 'na'}>{c.codigo}</Pill> {m}{sugestaoDe(c.codigo) && <span className="small muted" data-sugestao={c.codigo}> — Sugestão: {sugestaoDe(c.codigo)}</span>}</li>; })}
    </ul>
  );
}

interface Serie { ys: number[]; rot: string; alt?: boolean }

/** Passo "redondo" do eixo s (m) com no máximo ~8 marcas. */
function passoEixo(L: number) {
  for (const p of [0.25, 0.5, 1, 2, 5, 10, 20, 50]) if (L / p <= 8) return p;
  return 100;
}

/** Diagrama SVG ao longo de s. `baixo`: valores positivos desenhados para baixo (momento, lado tracionado). */
export function Diagrama({ id, titulo, unid, xs, L, series, baixo, cor, refs, curvas }: { id: string; titulo: string; unid: string; xs: number[]; L: number; series: Serie[]; baixo?: boolean; cor: 'dg-m' | 'dg-v' | 'dg-t'; refs?: { v: number; rot: string }[]; curvas?: { xs: number[]; ys: number[]; rot: string }[] }) {
  const W = 640, H = 170, ml = 54, mr = 16, mt = 28, mb = 30, hh = H - mt - mb, ww = W - ml - mr;
  const todos = [...series.flatMap((s) => s.ys), ...(refs ?? []).map((r) => r.v), ...(curvas ?? []).flatMap((c) => c.ys)];
  const vmax = Math.max(0, ...todos), vmin = Math.min(0, ...todos), span = Math.max(vmax - vmin, 1e-9);
  const X = (s: number) => ml + (L > 0 ? s / L : 0) * ww;
  const Y = (v: number) => mt + (baixo ? (v - vmin) / span : (vmax - v) / span) * hh;
  const y0 = Y(0), passo = passoEixo(L);
  const marcas: number[] = [];
  for (let s = 0; s <= L + 1e-9; s += passo) marcas.push(+s.toFixed(3));
  return (
    <svg className={`dg ${cor}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Diagrama de ${titulo}`} data-diagrama={id}>
      <text x={ml} y={11} className="dg-txt dg-titulo">{titulo} ({unid})</text>
      {marcas.map((s) => <g key={s}><line x1={X(s)} x2={X(s)} y1={mt} y2={H - mb} className="dg-grade" /><text x={X(s)} y={H - 8} textAnchor="middle" className="dg-txt">{fmt(s, passo < 1 ? 2 : 0)}</text></g>)}
      <text x={ml - 8} y={H - 8} textAnchor="end" className="dg-txt">s (m)</text>
      <text x={ml - 4} y={Y(vmax) + 4} textAnchor="end" className="dg-txt">{fmt(vmax, 1)}</text>
      {vmin < 0 && <text x={ml - 4} y={Y(vmin) + 4} textAnchor="end" className="dg-txt">{fmt(vmin, 1)}</text>}
      {series.map((sr, k) => {
        const d = xs.map((s, i) => `${i ? 'L' : 'M'}${X(s).toFixed(1)},${Y(sr.ys[i]).toFixed(1)}`).join('');
        const imax = sr.ys.reduce((m, v, i) => (Math.abs(v) > Math.abs(sr.ys[m]) ? i : m), 0), v = sr.ys[imax] ?? 0;
        const acima = baixo ? v < 0 : v >= 0;
        return (
          <g key={k}>
            <path d={`M${X(xs[0] ?? 0).toFixed(1)},${y0.toFixed(1)}${d.replace(/^M/, 'L')}L${X(xs.at(-1) ?? 0).toFixed(1)},${y0.toFixed(1)}Z`} className={`dg-area${sr.alt ? ' alt' : ''}`} />
            {Math.abs(v) >= 0.05 && <text x={Math.min(Math.max(X(xs[imax]), ml + 18), W - mr - 18)} y={Y(v) + (acima ? -4 : 11)} textAnchor="middle" className="dg-txt dg-val" data-extremo={sr.rot}>{fmt(v, 1)}</text>}
          </g>
        );
      })}
      {(curvas ?? []).map((c, k) => (
        <g key={`c${k}`} data-curva={c.rot}>
          <path d={c.xs.map((s, i) => `${i ? 'L' : 'M'}${X(s).toFixed(1)},${Y(c.ys[i]).toFixed(1)}`).join('')} className="dg-cap" />
          <text x={X(c.xs[Math.floor(c.xs.length / 2)] ?? 0)} y={Y(c.ys[Math.floor(c.ys.length / 2)] ?? 0) + (c.ys[Math.floor(c.ys.length / 2)] >= 0 === !baixo ? -4 : 11)} textAnchor="middle" className="dg-txt dg-captxt">{c.rot}</text>
        </g>
      ))}
      {(refs ?? []).map((r, k) => (
        <g key={`r${k}`} data-ref={r.rot}>
          <line x1={ml} x2={W - mr} y1={Y(r.v)} y2={Y(r.v)} className="dg-ref" />
          <text x={W - mr - 2} y={Y(r.v) + (baixo ? (r.v < 0 ? -3 : 10) : (r.v >= 0 ? -3 : 10))} textAnchor="end" className="dg-txt dg-reftxt">{r.rot} = {fmt(r.v, 1)}</text>
        </g>
      ))}
      <line x1={ml} x2={W - mr} y1={y0} y2={y0} className="dg-eixo" />
    </svg>
  );
}

/** Origem de cada grandeza: combinação determinante, fórmula e item da NBR 6118. */
export function Origens({ o }: { o?: Origem[] }) {
  if (!o?.length) return null;
  return (
    <>
      <h4>Origem dos resultados</h4>
      <div className="tablewrap">
        <table className="data quadro" data-origens={o.length}>
          <thead><tr><th>Grandeza</th><th>Combinação</th><th>Fórmula</th><th>Item</th></tr></thead>
          <tbody>{o.map((x, i) => <tr key={i}><td className="tl">{x.grandeza}</td><td className="tl small">{x.combinacao}</td><td className="tl small">{x.formula}</td><td className="tl small">{x.item}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

function AbasDetalhe({ aba, onChange }: { aba: 'resultados' | 'detalhamento'; onChange: (a: 'resultados' | 'detalhamento') => void }) {
  return <Seg value={aba} onChange={onChange} options={[{ v: 'resultados', label: 'Resultados e armadura' }, { v: 'detalhamento', label: 'Detalhamento' }]} />;
}

/** Capacidade resistente (MRd+ e MRd−) da viga pela armadura detalhada, ou null sem detalhamento. */
function capacidadeDaViga(b: BuildingModel, id: string, dim: DimEdificio): PontoCapacidade[] | null {
  const v = b.vigas.find((x) => x.id === id), det = dim.detalhes?.find((x) => x.viga === id), r = dim.vigas.find((x) => x.viga === id);
  if (!v || !det || !r) return null;
  try { return capacidadeViga(b, v, det, r); } catch { return null; }
}

function JanelaViga({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim)!, b = useBuilding((s) => s.sessao.modelo);
  const [aba, setAba] = useState<'resultados' | 'detalhamento'>('resultados');
  const v = dim.vigas.find((x) => x.viga === id);
  if (!v) return <p className="muted">Viga sem resultado.</p>;
  if (aba === 'detalhamento') return <><AbasDetalhe aba={aba} onChange={setAba} /><DetalheDaViga id={id} /></>;
  const { pontos, determinantes: d } = v.envoltoria;
  const xs = pontos.map((p) => p.s), L = Math.max(v.L, xs.at(-1) ?? 0, 0.01);
  const cap = capacidadeDaViga(b, id, dim);
  return (
    <>
      <AbasDetalhe aba={aba} onChange={setAba} />
      <p className="small">Envoltória das combinações ELU em todos os pavimentos do grupo, em faixas de 0,25 m. Momento positivo desenhado para baixo (lado tracionado); abscissa s ao longo do traçado.</p>
      {pontos.length === 0 ? <p className="muted">Sem envoltória (viga sem vãos dimensionados).</p> : (
        <>
          <Diagrama id="M" titulo="Momento fletor Md" unid="kN·m" xs={xs} L={L} baixo cor="dg-m" series={[{ ys: pontos.map((p) => p.Mmax), rot: 'Mmax' }, { ys: pontos.map((p) => p.Mmin), rot: 'Mmin', alt: true }]} curvas={cap ? [{ xs: cap.map((c) => c.s), ys: cap.map((c) => c.MRdPos), rot: 'MRd+' }, { xs: cap.map((c) => c.s), ys: cap.map((c) => -c.MRdNeg), rot: 'MRd−' }] : undefined} />
          <Diagrama id="V" titulo="Cortante Vd" unid="kN" xs={xs} L={L} cor="dg-v" series={[{ ys: pontos.map((p) => p.Vmax), rot: 'Vmax' }, { ys: pontos.map((p) => p.Vmin), rot: 'Vmin', alt: true }]} />
          <Diagrama id="T" titulo="Torção |Td|" unid="kN·m" xs={xs} L={L} cor="dg-t" series={[{ ys: pontos.map((p) => p.T), rot: 'T' }]} />
          <h4>Combinações determinantes</h4>
          <KV rows={[['Mmax (positivo)', d.Mmax || '—'], ['Mmin (negativo)', d.Mmin || '—'], ['Cortante', d.V || '—'], ['Torção', d.T || '—']]} />
        </>
      )}
      {v.facesPilar?.length > 0 && (
        <>
          <h4>Momento na face dos pilares</h4>
          <div className="tablewrap">
            <table className="data quadro" data-faces={v.facesPilar.length}>
              <thead><tr><th>Pilar</th><th>s (m)</th><th>M− (kN·m)</th><th>Combinação</th><th>M+ (kN·m)</th><th>Combinação</th></tr></thead>
              <tbody>{v.facesPilar.map((f, i) => <tr key={i}><td className="tl">{f.nomePilar || '—'}</td><td className="num">{fmt(f.s)}</td><td className="num">{fmt(Math.min(0, f.Mmin), 1)}</td><td className="tl small">{f.Mmin < 0 ? f.combinacaoMin : '—'}</td><td className="num">{fmt(Math.max(0, f.Mmax), 1)}</td><td className="tl small">{f.Mmax > 0 ? f.combinacaoMax : '—'}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="muted small">Valores na face do pilar (o cálculo usa o trecho rígido até a face − 0,3h, opção “Trecho rígido”), com a mesma redistribuição dos negativos.</p>
        </>
      )}
      {v.transicoes?.length ? (
        <>
          <h4>Pilares que nascem sobre a viga (transição)</h4>
          <div className="tablewrap">
            <table className="data quadro" data-transicoes={v.transicoes.length}>
              <thead><tr><th>Pilar</th><th>s (m)</th><th>Nd (kN)</th><th>Combinação</th><th>Vd nas faces (kN)</th><th>VRd3 / VRd2 (kN)</th><th>Situação</th></tr></thead>
              <tbody>{v.transicoes.map((t) => <tr key={t.pilar}><td className="tl">{t.nome}</td><td className="num">{fmt(t.s)}</td><td className="num">{fmt(t.Nd, 1)}</td><td className="tl small">{t.combinacao}</td><td className="num">{fmt(t.Vfaces[0], 1)} / {fmt(t.Vfaces[1], 1)}</td><td className="num">{fmt(t.VRd3, 1)} / {fmt(t.VRd2, 1)}</td><td className="tl"><Pill tone={t.status === 'ok' ? 'ok' : 'bad'}>{ST_TXT[t.status === 'ok' ? 'ok' : 'fail']}</Pill></td></tr>)}</tbody>
            </table>
          </div>
          <p className="muted small">A carga do pilar entra concentrada no nó do pé (o pé não apoia a viga); os estribos atendem o maior cortante da cadeia, inclusive junto às faces do pilar.</p>
        </>
      ) : null}
      <Origens o={v.origens} />
      {v.flechas && <><h4>Flechas</h4><TabelaFlechas f={v.flechas} /></>}
      <h4>Resumo</h4>
      <KV rows={[
        ['Seção b × h (cm)', `${Math.round(v.b * 100)} × ${Math.round(v.h * 100)}`], ['Comprimento (m)', fmt(v.L)],
        ['M+ / M− (kN·m)', `${fmt(v.Mpos, 1)} / ${fmt(v.Mneg, 1)}`], ['V (kN)', fmt(v.V, 1)], ['Td (kN·m)', fmt(v.T, 1)],
        ['Armadura inferior', `${v.barrasInf} (As ${fmt(v.AsInf * 1e4)} cm²)`], ['Armadura superior', `${v.barrasSup} (As ${fmt(v.AsSup * 1e4)} cm²)`],
        ['Estribo', v.estribo], ['Laterais (torção)', v.barrasLaterais || '—'], ['Decalagem aℓ (cm)', fmt(v.al * 100, 1)],
        ['Redistribuição δ', v.delta < 1 ? fmt(v.delta, 2) : '—'], ['Biela (Vsd/VRd2 + Tsd/TRd2)', fmt(v.biela)],
        ['wk inf / sup / limite (mm)', `${fmt(v.wk[0], 2)} / ${fmt(v.wk[1], 2)} / ${fmt(v.wkLim, 2)}`],
        ['Flecha total / limite (mm)', `${fmt(v.flecha * 1000, 1)} / ${fmt(v.limite * 1000, 1)}`], ['Flecha das variáveis / limite (mm)', `${fmt(v.flechaQ * 1000, 1)} / ${fmt(v.limiteQ * 1000, 1)}`],
        ['Situação', ST_TXT[v.status]],
      ]} />
      <h4>Mensagens</h4>
      <Mensagens msgs={v.mensagens} />
      <EditorArmaduraViga key={`${v.viga}|${v.bloqueada}|${JSON.stringify(v.arranjo)}`} v={v} />
      <CopiarArmadura v={v} />
    </>
  );
}

/** Onde o pilar nasce quando não é na fundação: elemento de apoio, excentricidade e como o pé entrou no modelo (E1a). */
export function ApoioDoPilar({ id }: { id: string }) {
  const { sessao, analise } = useBuilding();
  const b = sessao.modelo, p = b.pilares.find((x) => x.id === id);
  if (!p || p.nasce === 'fundacao') return null;
  const nomePav = b.pavimentos.find((x) => x.id === p.nasce)?.nome ?? p.nasce;
  if (inicioDe(p) === 'fundacao') return <p className="small" data-apoio="fundacao">Nasce em {nomePav} com início na fundação: vínculo externo (apoio fixo) no pavimento.</p>;
  const ap = apoioDoPilar(b, p), q = ap?.tipo === 'pilar' ? b.pilares.find((x) => x.id === ap.principal) : undefined, e = q ? excentricidadeApoio(b, p, q) : null;
  const onde = !ap ? 'sem pilar, viga ou laje embaixo' : ap.tipo === 'pilar' ? `sobre o pilar ${q?.nome}${e && Math.hypot(e[0], e[1]) > 1e-3 ? ` (excentricidade ${fmt(Math.hypot(e[0], e[1]) * 100, 1)} cm: momento N·e)` : ''}` : ap.tipo === 'viga' ? `sobre a viga ${ap.vigas.map((v) => b.vigas.find((x) => x.id === v)?.nome).join(', ')} (viga de transição)` : `sobre a laje ${b.lajes.find((l) => l.id === ap.laje)?.nome}`;
  const lig = analise?.apoiados?.[id]?.ligado;
  return <p className="small" data-apoio={ap?.tipo ?? 'nenhum'}>Nasce em {nomePav} {onde}. {analise ? (lig ? 'Pé ligado ao apoio no modelo.' : 'Pé em apoio fixo provisório (o modelo não alcançou o apoio).') : ''}</p>;
}

function JanelaPilar({ id, pavimento }: { id: string; pavimento?: string }) {
  const dim = useBuilding((s) => s.dim)!, b = useBuilding((s) => s.sessao.modelo);
  const [aba, setAba] = useState<'resultados' | 'detalhamento'>('resultados');
  const lances = dim.pilares.filter((x) => x.pilar === id);
  if (!lances.length) return <p className="muted">Pilar sem resultado.</p>;
  if (aba === 'detalhamento') return <><AbasDetalhe aba={aba} onChange={setAba} /><DetalheDoPilar id={id} /></>;
  return (
    <>
      <AbasDetalhe aba={aba} onChange={setAba} />
      <ApoioDoPilar id={id} />
      <SituacaoPilares id={id} pavimentoNome={pavimento} />
      {b.pilares.find((q) => q.id === id) && <DadosDoPilar b={b} p={b.pilares.find((q) => q.id === id)!} />}
      <p className="small">Combinações determinantes por lance: Nd (compressão +), momentos de 1ª ordem na base e no topo em cada direção (u ao longo de b, v ao longo de h) e momento de cálculo total com os efeitos locais de 2ª ordem (Md,tot).</p>
      {lances.map((x) => (
        <section key={x.pavimento} className="rev-lance" data-lance={x.pavimento}>
          <h4>Lance {x.pavimento} · {x.secao} cm · <Pill tone={x.status === 'ok' ? 'ok' : x.status === 'fail' ? 'bad' : 'warn'}>{ST_TXT[x.status]}</Pill>{x.bloqueada && <> <Pill tone="warn">bloqueada</Pill></>}</h4>
          {x.determinantes?.length ? (
            <div className="tablewrap">
              <table className="data quadro">
                <thead><tr><th>Combinação</th><th>Nd (kN)</th><th>Mu base / topo (kN·m)</th><th>Mv base / topo (kN·m)</th><th>Md,tot u / v (kN·m)</th><th>Tração</th></tr></thead>
                <tbody>{x.determinantes.map((c, i) => <tr key={i}><td className="tl">{c.combinacao}</td><td className="num">{fmt(c.Nd, 1)}</td><td className="num">{fmt(c.Mu[0], 1)} / {fmt(c.Mu[1], 1)}</td><td className="num">{fmt(c.Mv[0], 1)} / {fmt(c.Mv[1], 1)}</td><td className="num">{fmt(c.MuTot, 1)} / {fmt(c.MvTot, 1)}</td><td>{c.tracao ? 'sim' : 'não'}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className="muted small">Sem combinações determinantes registradas para este lance.</p>}
          <KV rows={[
            ['ℓe u / v (m)', `${fmt(x.le[0])} / ${fmt(x.le[1])}`], ['λ u / v', `${fmt(x.lambda[0], 0)} / ${fmt(x.lambda[1], 0)}`], ['Utilização', x.util >= 99 ? '> 1' : fmt(x.util)],
            ['Vd (kN)', x.Vd === undefined ? '—' : fmt(x.Vd, 1)], ['Armadura', `${x.armadura} (As ${fmt(x.As * 1e4)} cm²)`], ['Taxa As/Ac (%)', ((t) => (t === null ? '—' : fmt(t)))(taxaDoPilar(b, x))], ['Estribo', x.estribo],
          ]} />
          <SegundaOrdemPilar x={x} />
          <Origens o={x.origens} />
          <Mensagens msgs={x.mensagens} />
          <EditorArmaduraPilar key={`${x.pavimentoId}|${x.bloqueada}|${JSON.stringify(x.arranjo)}`} p={x} />
        </section>
      ))}
    </>
  );
}

function ResultadoDaLaje({ x }: { x: DimEdificio['lajes'][number] }) {
  return (
    <section className="rev-lance" data-lance={x.pavimento}>
      <h4>{x.pavimento} · {x.tipo} · h = {fmt(x.h * 100, 0)} cm · <Pill tone={x.status === 'ok' ? 'ok' : 'bad'}>{ST_TXT[x.status]}</Pill></h4>
      <KV rows={[
        ['md+ (kN·m/m)', `${fmt(x.mPos[0], 1)} / ${fmt(x.mPos[1], 1)}`], ['md− (kN·m/m)', `${fmt(x.mNeg[0], 1)} / ${fmt(x.mNeg[1], 1)}`],
        ['As+ (cm²/m)', `${fmt(x.As.pos[0])} / ${fmt(x.As.pos[1])}`], ['As− (cm²/m)', `${fmt(x.As.neg[0])} / ${fmt(x.As.neg[1])}`],
        ['Flecha total / limite (mm)', `${fmt(x.flecha * 1000, 1)} / ${fmt(x.limite * 1000, 1)}`], ['Flecha das variáveis / limite (mm)', `${fmt(x.flechaQ * 1000, 1)} / ${fmt(x.limiteQ * 1000, 1)}`],
        ['wk / limite (mm)', `${fmt(x.wk, 2)} / ${fmt(x.wkLim, 2)}`],
        ...(x.cortante ? [['Cortante nos apoios em vigas: VSd / VRd1 (kN/m)', `${fmt(x.cortante.VSd[0], 1)} / ${fmt(x.cortante.VRd1[0], 1)} · ${fmt(x.cortante.VSd[1], 1)} / ${fmt(x.cortante.VRd1[1], 1)}`] as [string, string], ...(x.cortante.Asw > 0 ? [['Armadura transversal (cm²/m²)', fmt(x.cortante.Asw)] as [string, string]] : [])] : []),
      ]} />
      {x.flechas && <TabelaFlechas f={x.flechas} />}
      <Origens o={x.origens} />
      <Mensagens msgs={x.mensagens} />
    </section>
  );
}

function JanelaLajeResultados({ ls }: { ls: DimEdificio['lajes'] }) {
  const [modo, setModo] = useState<'pavimento' | 'envoltoria'>('pavimento');
  const env = ls.length > 1 ? envoltoriaLajes(ls) : null;
  return (
    <>
      <p className="small">Momentos de cálculo por metro nas duas direções da malha (x / y).</p>
      {env && <Seg value={modo} onChange={setModo} options={[{ v: 'pavimento', label: 'Por pavimento' }, { v: 'envoltoria', label: 'Envoltória do grupo' }]} />}
      {modo === 'envoltoria' && env ? <div data-envoltoria-laje><ResultadoDaLaje x={env} /></div> : ls.map((x) => <ResultadoDaLaje key={x.pavimento} x={x} />)}
    </>
  );
}

function JanelaLaje({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim)!;
  const [aba, setAba] = useState<'resultados' | 'detalhamento' | 'vigotas' | 'puncao'>('resultados');
  const ls = dim.lajes.filter((x) => x.laje === id);
  if (!ls.length) return <p className="muted">Laje sem resultado.</p>;
  const temDetalhe = !!dim.detalhesLajes?.some((x) => x.laje === id);
  const temVigotas = !!dim.vigotas?.some((x) => x.laje === id);
  const temPuncao = !!dim.puncao?.some((x) => x.laje === id);
  const abas = [
    { v: 'resultados' as const, label: temVigotas ? 'Resultados' : 'Resultados e armadura' },
    ...(temVigotas ? [{ v: 'vigotas' as const, label: 'Vigotas' }] : temDetalhe ? [{ v: 'detalhamento' as const, label: 'Detalhamento' }] : []),
    ...(temPuncao ? [{ v: 'puncao' as const, label: 'Punção e cortante' }] : []),
  ];
  const atual = abas.some((x) => x.v === aba) ? aba : 'resultados';
  return (
    <>
      {abas.length > 1 && <Seg value={atual} onChange={setAba} options={abas} />}
      {atual === 'vigotas' ? <JanelaVigotas id={id} /> : atual === 'detalhamento' ? <DetalheDaLaje id={id} /> : atual === 'puncao' ? <JanelaPuncao id={id} /> : <JanelaLajeResultados ls={ls} />}
    </>
  );
}

/** Janela de resultados do elemento aberto (estado em plantaStore.janela). */
export function JanelaElemento() {
  const j = usePlanta((s) => s.janela), dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  if (!j) return null;
  const fechar = () => usePlanta.getState().set({ janela: null });
  // viga de fundação (FU2) usa o tipo 'fundacao', distinguida pelo id
  const ehVF = j.tipo === 'fundacao' && !!b.fundacao?.vigas?.some((x) => x.id === j.id);
  const ehBE = j.tipo === 'fundacao' && ehBaseElastica(b, j.id);
  const ehSC = j.tipo === 'fundacao' && ehCorrida(b, j.id);
  const nome = (j.tipo === 'viga' ? b.vigas : j.tipo === 'pilar' ? b.pilares : j.tipo === 'pilarParede' ? (b.pilaresParede ?? []) : j.tipo === 'fundacao' ? [...(b.fundacao?.elementos ?? []), ...(b.fundacao?.vigas ?? []), ...(b.fundacao?.radiers ?? []), ...(b.fundacao?.vigasElasticas ?? []), ...(b.fundacao?.corridas ?? [])] : b.lajes).find((x) => x.id === j.id)?.nome ?? j.id;
  return (
    <Modal titulo={`Resultados do elemento — ${ehVF ? 'Viga de fundação' : ehSC ? 'Sapata corrida' : ehBE ? (b.fundacao?.radiers?.some((x) => x.id === j.id) ? 'Radier' : 'Viga sobre base elástica') : TIPO_TXT[j.tipo]} ${nome}`} onClose={fechar} larga>
      {!dim ? <p className="muted">Calcule o dimensionamento para ver os resultados do elemento.</p>
        : j.tipo === 'pilarParede' ? <JanelaPilarParede id={j.id} /> : j.tipo === 'viga' ? <JanelaViga id={j.id} /> : j.tipo === 'pilar' ? <JanelaPilar id={j.id} pavimento={j.pavimento} /> : j.tipo === 'fundacao' ? (ehVF ? <JanelaVigaFundacao id={j.id} /> : ehSC ? <JanelaCorrida id={j.id} /> : ehBE ? <JanelaBaseElastica id={j.id} /> : <JanelaFundacao id={j.id} />) : <JanelaLaje id={j.id} />}
    </Modal>
  );
}

// ---------------------------------------------------------------- deslocamentos laterais

/** Deslocamentos do vento por direção e pavimento (combinação frequente, ψ1 = 0,3; NBR 6118, Tabela 13.3). */
export function Deslocamentos({ b, analise }: { b: BuildingModel; analise: AnaliseEdificio }) {
  const ds = analise.vento?.deslocamentos ?? [];
  if (!ds.length) return null;
  const nomePav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  const mm = (v: number) => fmt(v * 1000, 1);
  const lt = analise.opcoes.limiteDeslocTopo, lp = analise.opcoes.limiteDeslocPavimento;
  return (
    <div data-deslocamentos>
      <h4>Deslocamentos laterais do vento</h4>
      <p className="small">Combinação frequente, ψ1 = 0,3 (NBR 6118, Tabela 13.3): topo ≤ H/{fmt(lt, 0)} e deslocamento entre pavimentos ≤ hi/{fmt(lp, 0)}. Limites editáveis nas opções de cálculo.</p>
      {ds.map((d) => (
        <details key={d.direcao} className="small" open>
          <summary>Vento a {d.direcao}° ({d.caso}){d.ok ? '' : ' — acima do limite'}</summary>
          <table className="data quadro" data-direcao={d.direcao}>
            <thead><tr><th>Pavimento</th><th>z (m)</th><th>u (mm)</th><th>Entre pavimentos (mm)</th><th>Limite hi/{fmt(lp, 0)} (mm)</th></tr></thead>
            <tbody>
              {d.pavimentos.map((p) => <tr key={p.pavimento} className={p.drift > p.limDrift + 1e-12 ? 'bad' : ''}><td className="tl">{nomePav(p.pavimento)}</td><td className="num">{fmt(p.z)}</td><td className="num">{mm(p.u)}</td><td className="num">{mm(p.drift)}</td><td className="num">{mm(p.limDrift)}</td></tr>)}
              <tr className={d.topo > d.limTopo + 1e-12 ? 'bad' : ''} data-topo><td className="tl"><b>Topo</b> (H = {fmt(d.H)} m)</td><td className="num">{fmt(d.H)}</td><td className="num"><b>{mm(d.topo)}</b></td><td className="tl" colSpan={2}>limite H/{fmt(lt, 0)} = {mm(d.limTopo)} mm</td></tr>
            </tbody>
          </table>
        </details>
      ))}
      <p className="hint">Fonte: NBR 6118, Tabela 13.3 (deslocamentos-limite, aceitabilidade sensorial e efeitos em elementos não estruturais). z a partir do pavimento mais baixo; u máximo entre os pilares do pavimento.</p>
    </div>
  );
}

// ---------------------------------------------------------------- listagem em CSV

const aspas = (x: string) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);

/** Listagem de vigas, pilares e lajes (separador ";", vírgula decimal). */
export function listagemCsv(dim: DimEdificio): string {
  const f = (v: number | undefined, d = 2) => (v === undefined || !Number.isFinite(v) ? '' : fmt(v, d));
  const cab = ['Tipo', 'Elemento', 'Pavimento', 'Seção (cm)', 'Nd (kN)', 'M+ (kN·m)', 'M− (kN·m)', 'V (kN)', 'Td (kN·m)', 'Armadura inferior / principal', 'Armadura superior', 'As (cm²)', 'Estribo', 'Flecha (mm)', 'Flecha limite (mm)', 'wk (mm)', 'wk limite (mm)', 'Utilização', 'Situação', 'Mensagens'];
  const lin: string[][] = [cab];
  for (const x of dim.vigas) lin.push(['Viga', x.nome, '', `${Math.round(x.b * 100)}x${Math.round(x.h * 100)}`, '', f(x.Mpos, 1), f(x.Mneg, 1), f(x.V, 1), f(x.T, 1), x.barrasInf, x.barrasSup, f(x.AsInf * 1e4), x.estribo, f(x.flecha * 1000, 1), f(x.limite * 1000, 1), f(Math.max(x.wk[0], x.wk[1])), f(x.wkLim), '', ST_TXT[x.status], x.mensagens.join(' | ')]);
  for (const x of dim.pilares) lin.push(['Pilar', x.nome, x.pavimento, x.secao, f(x.Nd, 0), '', '', f(x.Vd, 1), '', x.armadura, '', f(x.As * 1e4), x.estribo, '', '', '', '', x.util >= 99 ? '> 1' : f(x.util), ST_TXT[x.status], x.mensagens.join(' | ')]);
  for (const x of dim.lajes) lin.push(['Laje', x.nome, x.pavimento, `${x.tipo} h=${Math.round(x.h * 100)}`, '', `${f(x.mPos[0], 1)} / ${f(x.mPos[1], 1)}`, `${f(x.mNeg[0], 1)} / ${f(x.mNeg[1], 1)}`, '', '', `As+ ${f(x.As.pos[0])} / ${f(x.As.pos[1])} cm²/m`, `As− ${f(x.As.neg[0])} / ${f(x.As.neg[1])} cm²/m`, '', '', f(x.flecha * 1000, 1), f(x.limite * 1000, 1), f(x.wk), f(x.wkLim), '', ST_TXT[x.status], x.mensagens.join(' | ')]);
  return '﻿' + lin.map((l) => l.map(aspas).join(';')).join('\r\n') + '\r\n';
}

export function BotaoExportar({ dim }: { dim: DimEdificio }) {
  return <Button onClick={() => download('listagem-edificio.csv', listagemCsv(dim), 'text/csv')}>Exportar CSV</Button>;
}
