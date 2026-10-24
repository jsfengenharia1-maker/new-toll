// Relatórios e listagens do edifício (frente R7g): dados do pilar na janela (ângulo, engaste, desnível, profundidade do
// apoio, taxa As/Ac), planta de situação com navegação entre pilares, relatório de esforços e armaduras dos pilares
// (HTML e CSV), listagem geral, quantitativos por pano e viga com índices por m² e arquivo de intercâmbio da armadura.
import { useMemo } from 'react';
import { useBuilding } from './store';
import { abrirJanela, ST_TXT } from './Revisao';
import { Button, KV, Pill, download } from '../ui';
import { MEMO_CSS } from '../Memorial';
import { memo } from '../design/tokens';
import { cotaFundacao, contornoNoLance, engasteNoLance, geometriaViga, lancesDoPilar, pavimentosOrdenados, type BuildingModel, type Pilar } from '../../core/building/types';
import type { Dimensionamento, ResultadoPilar } from '../../core/building/dimensionamento';
import { relatorioEscadas, relatorioEscadasCsv, type TabelaRelatorio } from '../../core/building/escadasRelatorio';
import { intercambioArmadura, intercambioCsv, listagemGeral, quantitativosDetalhados, taxaDoPilar, taxasPilares } from '../../core/building/relatorios';

const fmt = (v: number | undefined, d = 2) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d).replace('.', ','));
const AJUSTE_TXT: Record<string, string> = { c: 'centro', n: 'face superior', s: 'face inferior', l: 'face direita', o: 'face esquerda', ne: 'canto superior direito', no: 'canto superior esquerdo', se: 'canto inferior direito', so: 'canto inferior esquerdo' };
const aspas = (x: string) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);
const csv = (lin: string[][]) => '﻿' + lin.map((l) => l.map(aspas).join(';')).join('\r\n') + '\r\n';
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------------------------------------------------------------- dados do pilar na janela (C4.51, C4.45)

/** Ângulo, ponto fixo, engaste por lance, cota da base, desnível e profundidade do apoio do pilar. */
export function DadosDoPilar({ b, p }: { b: BuildingModel; p: Pilar }) {
  const cf = cotaFundacao(b), cota = p.cotaBase ?? cf, ps = pavimentosOrdenados(b), nasce = ps.find((x) => x.id === p.nasce);
  const ls = lancesDoPilar(b, p);
  const apoioCota = nasce ? nasce.cota : ls[0] ? ps.find((x) => x.id === ls[0].id)?.cota ?? cf : cf;
  const eng = ls.map((l) => { const e = engasteNoLance(p, l.id); return `${l.nome}: base ${fmt(e.base)} · topo ${fmt(e.topo)}`; });
  const vb = p.vinculoBase;
  return (
    <div data-dados-pilar={p.id}>
      <KV rows={[
        ['Ângulo (°)', fmt(p.angulo, 1)], ['Ponto fixo', AJUSTE_TXT[p.ajuste] ?? p.ajuste],
        ['Engaste por lance (1 = pleno)', eng.join(' | ') || '—'],
        ['Vínculo da base', vb?.tipo === 'rotula' ? 'rotulada' : vb?.tipo === 'molas' ? 'molas' : p.nasce === 'fundacao' ? 'engastada (fundação)' : 'apoiada no pavimento'],
        ['Cota da base (m)', p.nasce === 'fundacao' ? fmt(cota) : fmt(apoioCota)],
        ['Desnível da base em relação à fundação da obra (m)', p.nasce === 'fundacao' ? fmt(cota - cf) : '—'],
        ['Profundidade do apoio abaixo do 1º pavimento (m)', p.nasce === 'fundacao' ? fmt((ps[0]?.cota ?? 0) - cota) : '—'],
      ]} />
    </div>
  );
}

/** Linha "Taxa As/Ac" de um lance. */
export function TaxaDoLance({ b, x }: { b: BuildingModel; x: ResultadoPilar }) {
  const t = taxaDoPilar(b, x);
  return <span data-taxa-pilar>{t === null ? '—' : `${fmt(t)} %`}</span>;
}

// ---------------------------------------------------------------- planta de situação (C4.52)

/** Planta do pavimento com os pilares coloridos pela situação; o clique passa a outro pilar. */
export function SituacaoPilares({ id, pavimentoNome }: { id: string; pavimentoNome?: string }) {
  const { sessao, dim } = useBuilding();
  const b = sessao.modelo, atual = b.pilares.find((p) => p.id === id);
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.nome === pavimentoNome && atual && lancesDoPilar(b, atual).some((l) => l.id === p.id)) ?? (atual ? ps.find((p) => lancesDoPilar(b, atual).some((l) => l.id === p.id)) : undefined);
  const dados = useMemo(() => {
    if (!pav) return null;
    const pilares = b.pilares.filter((p) => lancesDoPilar(b, p).some((l) => l.id === pav.id)).sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR', { numeric: true }));
    const vigas = b.vigas.filter((v) => v.grupo === pav.grupo);
    const polis = pilares.map((p) => ({ p, c: contornoNoLance(p, pav.id) }));
    const pts = [...polis.flatMap((x) => x.c), ...vigas.flatMap((v) => v.pontos)];
    if (!pts.length) return null;
    const x0 = Math.min(...pts.map((q) => q[0])), x1 = Math.max(...pts.map((q) => q[0])), y0 = Math.min(...pts.map((q) => q[1])), y1 = Math.max(...pts.map((q) => q[1]));
    return { pilares, vigas, polis, x0, x1, y0, y1 };
  }, [b, pav]);
  if (!atual || !pav || !dados) return null;
  const W = 360, m = 14, k = Math.min((W - 2 * m) / Math.max(dados.x1 - dados.x0, 0.1), 240 / Math.max(dados.y1 - dados.y0, 0.1));
  const X = (x: number) => (m + (x - dados.x0) * k).toFixed(1), Y = (y: number) => (m + (dados.y1 - y) * k).toFixed(1);
  const H = (dados.y1 - dados.y0) * k + 2 * m;
  const situacao = (p: Pilar) => {
    const rs = (dim?.pilares ?? []).filter((r) => r.pilar === p.id && r.pavimentoId === pav.id);
    return rs.some((r) => r.status === 'fail' || r.bloqueada) ? (rs.some((r) => r.status === 'fail') ? 'bad' : 'warn') : rs.some((r) => r.status === 'review') ? 'warn' : '';
  };
  const i = dados.pilares.findIndex((p) => p.id === id);
  const ir = (p: Pilar) => abrirJanela({ tipo: 'pilar', id: p.id, pavimento: pav.nome });
  return (
    <div data-situacao-pilares={dados.pilares.length}>
      <div className="row wrap">
        <Button disabled={i <= 0} aria-label="Pilar anterior" onClick={() => ir(dados.pilares[i - 1])}>◀ {dados.pilares[i - 1]?.nome ?? ''}</Button>
        <b data-pilar-atual>{atual.nome}</b>
        <Button disabled={i < 0 || i >= dados.pilares.length - 1} aria-label="Próximo pilar" onClick={() => ir(dados.pilares[i + 1])}>{dados.pilares[i + 1]?.nome ?? ''} ▶</Button>
        <span className="muted small">{pav.nome}: vermelho = não atende; amarelo = revisar ou armadura bloqueada.</span>
      </div>
      <svg className="sit" viewBox={`0 0 ${W} ${H.toFixed(0)}`} role="img" aria-label={`Planta de situação dos pilares do ${pav.nome}`}>
        {dados.vigas.map((v) => { const g = geometriaViga(v); return <polygon key={v.id} className="sit-viga" points={[...g.esq, ...[...g.dir].reverse()].map((q) => `${X(q[0])},${Y(q[1])}`).join(' ')} />; })}
        {dados.polis.map(({ p, c }) => {
          const cx = c.reduce((t, q) => t + q[0], 0) / c.length, cy = c.reduce((t, q) => t + q[1], 0) / c.length;
          return (
            <g key={p.id} className={`sit-pilar ${p.id === id ? 'sel' : ''} ${situacao(p)}`} data-pilar-situacao={p.id} role="button" tabIndex={0} aria-label={`Pilar ${p.nome}`} onClick={() => ir(p)} onKeyDown={(e) => { if (e.key === 'Enter') ir(p); }}>
              <polygon points={c.map((q) => `${X(q[0])},${Y(q[1])}`).join(' ')} />
              <text x={X(cx)} y={(Number(Y(cy)) - 6).toFixed(1)} textAnchor="middle" className="sit-txt">{p.nome}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------- relatório de esforços e armaduras dos pilares (C4.63)

/** Linhas do relatório: uma por combinação determinante de cada lance (esforços, 2ª ordem) com a armadura e o cortante. */
export function relatorioPilaresCsv(b: BuildingModel, dim: Pick<Dimensionamento, 'pilares'>): string {
  const lin: string[][] = [['Pilar', 'Lance', 'Seção (cm)', 'Combinação', 'Nd (kN)', 'Mu base (kN·m)', 'Mu topo (kN·m)', 'Mv base (kN·m)', 'Mv topo (kN·m)', 'Md,tot u (kN·m)', 'Md,tot v (kN·m)', 'Armadura', 'As (cm²)', 'As/Ac (%)', 'Estribo', 'Vsd u (kN)', 'Vc u (kN)', 'VRd2 u (kN)', 'Utilização', 'Situação']];
  for (const r of dim.pilares) {
    const base = [r.nome, r.pavimento, r.secao];
    const fim = [r.armadura, fmt(r.As * 1e4), fmt(taxaDoPilar(b, r) ?? undefined), r.estribo, fmt(r.cortante?.u.Vsd, 1), fmt(r.cortante?.u.Vc, 1), fmt(r.cortante?.u.VRd2, 1), r.util >= 99 ? '> 1' : fmt(r.util), ST_TXT[r.status]];
    if (!r.determinantes?.length) lin.push([...base, '', fmt(r.Nd, 0), '', '', '', '', '', '', ...fim]);
    else for (const c of r.determinantes) lin.push([...base, c.combinacao, fmt(c.Nd, 1), fmt(c.Mu[0], 1), fmt(c.Mu[1], 1), fmt(c.Mv[0], 1), fmt(c.Mv[1], 1), fmt(c.MuTot, 1), fmt(c.MvTot, 1), ...fim]);
  }
  return csv(lin);
}

export function relatorioPilaresHtml(b: BuildingModel, dim: Pick<Dimensionamento, 'pilares'>): string {
  const linhas = dim.pilares.map((r) => {
    const cs = r.determinantes ?? [];
    const dets = cs.length ? cs.map((c) => `<tr><td>${esc(r.nome)}</td><td>${esc(r.pavimento)}</td><td>${esc(c.combinacao)}</td><td>${fmt(c.Nd, 1)}</td><td>${fmt(c.Mu[0], 1)} / ${fmt(c.Mu[1], 1)}</td><td>${fmt(c.Mv[0], 1)} / ${fmt(c.Mv[1], 1)}</td><td>${fmt(c.MuTot, 1)} / ${fmt(c.MvTot, 1)}</td></tr>`).join('') : `<tr><td>${esc(r.nome)}</td><td>${esc(r.pavimento)}</td><td colspan="5">sem combinações determinantes registradas</td></tr>`;
    return dets;
  }).join('');
  const arm = dim.pilares.map((r) => `<tr><td>${esc(r.nome)}</td><td>${esc(r.pavimento)}</td><td>${esc(r.secao)}</td><td>${esc(r.armadura)}</td><td>${fmt(r.As * 1e4)}</td><td>${fmt(taxaDoPilar(b, r) ?? undefined)}</td><td>${esc(r.estribo)}</td><td>${fmt(r.cortante?.u.Vsd, 1)} / ${fmt(r.cortante?.u.Vc, 1)} / ${fmt(r.cortante?.u.VRd2, 1)}</td><td>${r.util >= 99 ? '&gt; 1' : fmt(r.util)}</td><td>${ST_TXT[r.status]}</td></tr>`).join('');
  const titulo = `Relatório de esforços e armaduras dos pilares · ${esc(b.obra.nome || 'Edifício')}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title><style>body{margin:0;background:${memo('paper')}}${MEMO_CSS}</style></head><body><div class="memo"><h1>${titulo}</h1>`
    + `<h2>Esforços das combinações determinantes</h2><p>Nd (kN, compressão +), momentos de 1ª ordem na base / topo por direção e momento de cálculo total com os efeitos locais de 2ª ordem (kN·m). u ao longo de b, v ao longo de h.</p><table><thead><tr><th>Pilar</th><th>Lance</th><th>Combinação</th><th>Nd</th><th>Mu base / topo</th><th>Mv base / topo</th><th>Md,tot u / v</th></tr></thead><tbody>${linhas}</tbody></table>`
    + `<h2>Armaduras e cortante</h2><p>Cortante na direção u: Vsd / Vc / VRd2 (kN). Taxa As/Ac pela seção bruta.</p><table><thead><tr><th>Pilar</th><th>Lance</th><th>Seção (cm)</th><th>Armadura</th><th>As (cm²)</th><th>As/Ac (%)</th><th>Estribo</th><th>Vsd / Vc / VRd2</th><th>Utilização</th><th>Situação</th></tr></thead><tbody>${arm}</tbody></table></div></body></html>`;
}

// ---------------------------------------------------------------- relatório das escadas (E4e, C8.54)

const tabelaHtml = (t: TabelaRelatorio) => (t.linhas.length ? `<h4>${esc(t.titulo)}</h4><table><thead><tr>${t.cabecalho.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.linhas.map((l) => `<tr>${l.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '');
const linhasHtml = (ls: { rotulo: string; valor: string; aConfirmar?: boolean }[]) => `<table><tbody>${ls.map((l) => `<tr><td>${esc(l.rotulo)}</td><td>${esc(l.valor)}${l.aConfirmar ? ' <em>[a confirmar]</em>' : ''}</td></tr>`).join('')}</tbody></table>`;

/** Relatório das escadas em HTML (dados gerais, dados comuns e, por lance, reações, esforços por seção, armaduras e verificações). */
export function relatorioEscadasHtml(b: BuildingModel, dim: Dimensionamento | null): string {
  const r = relatorioEscadas(b, dim), titulo = `Relatório das escadas · ${esc(b.obra.nome || 'Edifício')}`;
  const corpo = r.escadas.map((e) => `<h2>Escada ${esc(e.nome)}</h2><h3>Dados comuns</h3>${linhasHtml(e.comuns)}`
    + e.lances.map((l) => `<h3>${esc(e.nome)} — ${esc(l.titulo)}</h3>${linhasHtml(l.dados)}${tabelaHtml(l.reacoes)}${tabelaHtml(l.esforcos)}${tabelaHtml(l.armaduras)}${l.verificacoes.length ? `<h4>Verificações</h4>${linhasHtml(l.verificacoes)}` : ''}${l.avisos.map((a) => `<p><em>${esc(a)}</em></p>`).join('')}`).join('')).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title><style>body{margin:0;background:${memo('paper')}}${MEMO_CSS}</style></head><body><div class="memo"><h1>${titulo}</h1>`
    + `<h2>Dados gerais</h2>${linhasHtml(r.gerais)}${r.avisos.map((a) => `<p><em>${esc(a)}</em></p>`).join('')}${corpo}</div></body></html>`;
}

// ---------------------------------------------------------------- listagens (K1.11.1, K1.11.44, K1.11.47)

export function listagemGeralCsv(b: BuildingModel): string {
  const g = listagemGeral(b);
  const lin: string[][] = [['Obra', g.obra.nome, g.obra.cidade], ['Materiais', `C${g.materiais.fck}`, g.materiais.aco, `CAA ${g.materiais.caa}`, `γc ${fmt(g.materiais.gamaC)}`, `γs ${fmt(g.materiais.gamaS)}`], [],
    ['Pavimento', 'Cota (m)', 'Altura (m)', 'Grupo', 'Uso', 'Revestimento (kN/m²)', 'Variável (kN/m²)']];
  for (const p of g.pavimentos) lin.push([p.nome, fmt(p.cota), fmt(p.altura), p.grupo, p.uso, fmt(p.gRev), fmt(p.q)]);
  lin.push([], ['Pilar', 'x (m)', 'y (m)', 'Centro x (m)', 'Centro y (m)', 'Ângulo (°)', 'Ponto fixo', 'Nasce', 'Morre', 'Seções', 'Vínculo', 'Engaste']);
  for (const p of g.pilares) lin.push([p.nome, fmt(p.x, 3), fmt(p.y, 3), fmt(p.cx, 3), fmt(p.cy, 3), fmt(p.angulo, 1), AJUSTE_TXT[p.ajuste] ?? p.ajuste, p.nasce, p.morre, p.secoes.map((s) => `${s.pavimento} ${s.secao}`).join(' | '), p.vinculo, p.engaste]);
  lin.push([], ['Laje', 'Grupo', 'Pavimentos', 'Tipo', 'h (m)', 'Área (m²)', 'Peso próprio (kN/m²)', 'Revestimento (kN/m²)', 'Variável (kN/m²)', 'Peso próprio (kN)', 'Permanente (kN)', 'Variável (kN)']);
  for (const l of g.lajes) lin.push([l.nome, l.grupo, String(l.pavimentos), l.tipo, fmt(l.h, 3), fmt(l.area), fmt(l.ppKNm2), fmt(l.revKNm2), fmt(l.qKNm2), fmt(l.pesoProprio, 1), fmt(l.permanente, 1), fmt(l.variavel, 1)]);
  return csv(lin);
}

export function quantitativosCsv(b: BuildingModel, dim: Dimensionamento): string {
  const q = quantitativosDetalhados(b, dim);
  const lin: string[][] = [['Laje', 'Tipo', 'Pavimentos', 'h equiv. (m)', 'Área (m²)', 'Concreto (m³)', 'Fôrma (m²)', 'Peso próprio (kN)', 'Enchimento área (m²)', 'Enchimento volume (m³)', 'Peças (1,00 m)']];
  for (const p of q.panos) lin.push([p.nome, p.tipo, String(p.pavimentos), fmt(p.h, 3), fmt(p.area), fmt(p.volume, 3), fmt(p.forma), fmt(p.pesoProprio, 1), fmt(p.enchimento?.area), fmt(p.enchimento?.volume, 3), p.enchimento ? String(p.enchimento.pecas) : '']);
  lin.push([], ['Viga', 'Pavimentos', 'L (m)', 'b (m)', 'h (m)', 'Concreto (m³)', 'Fôrma (m²)', 'Peso (kN)']);
  for (const v of q.vigas) lin.push([v.nome, String(v.pavimentos), fmt(v.L), fmt(v.b), fmt(v.h), fmt(v.volume, 3), fmt(v.forma), fmt(v.peso, 1)]);
  const i = q.indices;
  lin.push([], ['Índices da obra', 'Área (m²)', 'Concreto (m³)', 'Fôrma (m²)', 'Aço (kg)', 'kg/m²', 'm³/m²', 'm²/m²', 'kg/m³'], ['', fmt(i.area), fmt(i.concreto), fmt(i.forma), fmt(i.aco, 1), fmt(i.kgPorM2), fmt(i.m3PorM2, 3), fmt(i.m2PorM2), fmt(i.kgPorM3, 1)]);
  return csv(lin);
}

/** Cartão "Relatórios e listagens" da aba Dimensionamento. */
export function CartaoRelatorios() {
  const { sessao, dim } = useBuilding();
  const b = sessao.modelo;
  const q = useMemo(() => (dim ? quantitativosDetalhados(b, dim) : null), [b, dim]);
  const taxas = useMemo(() => (dim ? taxasPilares(b, dim) : []), [b, dim]);
  if (!dim || !q) return null;
  const i = q.indices;
  return (
    <div className="card" data-relatorios>
      <h3>Relatórios e listagens</h3>
      <div className="row wrap">
        <Button data-relatorio="pilares-html" onClick={() => download('relatorio-pilares.html', relatorioPilaresHtml(b, dim), 'text/html')}>Relatório dos pilares (HTML)</Button>
        <Button data-relatorio="pilares-csv" onClick={() => download('relatorio-pilares.csv', relatorioPilaresCsv(b, dim), 'text/csv')}>Relatório dos pilares (CSV)</Button>
        {(b.escadas?.length ?? 0) > 0 && <Button data-relatorio="escadas-html" onClick={() => download('relatorio-escadas.html', relatorioEscadasHtml(b, dim), 'text/html')}>Relatório das escadas (HTML)</Button>}
        {(b.escadas?.length ?? 0) > 0 && <Button data-relatorio="escadas-csv" onClick={() => download('relatorio-escadas.csv', relatorioEscadasCsv(relatorioEscadas(b, dim)), 'text/csv')}>Relatório das escadas (CSV)</Button>}
        <Button data-relatorio="listagem" onClick={() => download('listagem-geral.csv', listagemGeralCsv(b), 'text/csv')}>Listagem geral (CSV)</Button>
        <Button data-relatorio="quantitativos" onClick={() => download('quantitativos.csv', quantitativosCsv(b, dim), 'text/csv')}>Quantitativos (CSV)</Button>
        <Button data-relatorio="intercambio-json" onClick={() => download('armadura-intercambio.json', JSON.stringify(intercambioArmadura(b, dim), null, 2), 'application/json')}>Armadura: intercâmbio (JSON)</Button>
        <Button data-relatorio="intercambio-csv" onClick={() => download('armadura-barras.csv', intercambioCsv(intercambioArmadura(b, dim)), 'text/csv')}>Armadura: barras (CSV)</Button>
      </div>
      <table className="data quadro" data-indices>
        <thead><tr><th>Área construída (m²)</th><th>Concreto (m³)</th><th>Fôrma (m²)</th><th>Aço (kg)</th><th>kg/m²</th><th>m³/m²</th><th>m²/m²</th><th>kg/m³</th></tr></thead>
        <tbody><tr><td className="num">{fmt(i.area)}</td><td className="num">{fmt(i.concreto)}</td><td className="num">{fmt(i.forma)}</td><td className="num">{fmt(i.aco, 0)}</td><td className="num">{fmt(i.kgPorM2)}</td><td className="num">{fmt(i.m3PorM2, 3)}</td><td className="num">{fmt(i.m2PorM2)}</td><td className="num">{fmt(i.kgPorM3, 1)}</td></tr></tbody>
      </table>
      <p className="muted small">{i.acoDetalhado ? 'Aço do detalhamento, com perdas.' : 'Aço estimado por taxas (sem detalhamento).'} Área construída = soma das lajes de todos os pavimentos.{q.enchimento.pecas > 0 ? ` Enchimento das treliçadas: ${fmt(q.enchimento.area)} m², ${fmt(q.enchimento.volume, 2)} m³ e ${q.enchimento.pecas} peças de 1,00 m [a confirmar].` : ''}</p>
      <details className="small"><summary>Quantitativos por pano ({q.panos.length}) e por viga ({q.vigas.length})</summary>
        <div className="tablewrap"><table className="data quadro" data-quant-panos>
          <thead><tr><th>Laje</th><th>Tipo</th><th>Pav.</th><th>Área (m²)</th><th>Concreto (m³)</th><th>Peso próprio (kN)</th><th>Enchimento (m²)</th></tr></thead>
          <tbody>{q.panos.map((p) => <tr key={p.laje}><td className="tl">{p.nome}</td><td className="tl">{p.tipo}</td><td className="num">{p.pavimentos}</td><td className="num">{fmt(p.area)}</td><td className="num">{fmt(p.volume, 3)}</td><td className="num">{fmt(p.pesoProprio, 1)}</td><td className="num">{p.enchimento ? fmt(p.enchimento.area) : '—'}</td></tr>)}</tbody>
        </table></div>
        <div className="tablewrap"><table className="data quadro" data-quant-vigas>
          <thead><tr><th>Viga</th><th>Pav.</th><th>L (m)</th><th>b × h (cm)</th><th>Concreto (m³)</th><th>Fôrma (m²)</th></tr></thead>
          <tbody>{q.vigas.map((v) => <tr key={v.viga}><td className="tl">{v.nome}</td><td className="num">{v.pavimentos}</td><td className="num">{fmt(v.L)}</td><td className="num">{Math.round(v.b * 100)}×{Math.round(v.h * 100)}</td><td className="num">{fmt(v.volume, 3)}</td><td className="num">{fmt(v.forma)}</td></tr>)}</tbody>
        </table></div>
      </details>
      <p className="muted small">Pilares com taxa As/Ac calculada: {taxas.length}; maior {fmt(Math.max(0, ...taxas.map((t) => t.taxa)))} %. <Pill tone="na">intercâmbio: formato próprio</Pill></p>
    </div>
  );
}
