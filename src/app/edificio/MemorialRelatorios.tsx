// Seções de relatório do memorial do edifício (frente R7g): listagem geral ampliada, forças de vento por pavimento,
// taxa As/Ac dos pilares, quantitativos por pano e viga com índices por m² e, quando pedido, as verificações ELU por combinação.
import { Fragment, type ReactNode } from 'react';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';
import { listagemGeral, quantitativosDetalhados, taxasPilares, ventoPorPavimento } from '../../core/building/relatorios';
import { tabelaVento, ventoPorPavimento as ventoPorPavimentoV5 } from '../../core/resultados/cargasCaso';

const fmt = (v: number | undefined, d = 2) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d).replace('.', ','));
const AJUSTE_TXT: Record<string, string> = { c: 'centro', n: 'face superior', s: 'face inferior', l: 'face direita', o: 'face esquerda', ne: 'canto sup. dir.', no: 'canto sup. esq.', se: 'canto inf. dir.', so: 'canto inf. esq.' };

/** Listagem geral da obra: pavimentos, pilares (coordenadas, dimensões, vínculos) e lajes (pesos). */
export function MemorialListagemGeral({ b, h2 }: { b: BuildingModel; h2: (c: ReactNode, brk?: boolean) => ReactNode }) {
  const g = listagemGeral(b);
  return (
    <div data-memorial-listagem>
      {h2('Listagem geral')}
      <p>Obra {g.obra.nome || '—'}{g.obra.cidade ? `, ${g.obra.cidade}` : ''}; concreto C{g.materiais.fck}, aço {g.materiais.aco}, CAA {g.materiais.caa}; γc {fmt(g.materiais.gamaC)}, γs {fmt(g.materiais.gamaS)}, γg {fmt(g.materiais.gamaG)}, γq {fmt(g.materiais.gamaQ)}; nível de fundação {fmt(g.obra.profundidadeFundacao)} m abaixo do pavimento mais baixo.</p>
      <table>
        <thead><tr><th>Pavimento</th><th>Cota (m)</th><th>Altura (m)</th><th>Grupo</th><th>Uso</th><th>Revestimento (kN/m²)</th><th>Variável (kN/m²)</th></tr></thead>
        <tbody>{g.pavimentos.map((p) => <tr key={p.id}><td className="l">{p.nome}</td><td>{fmt(p.cota)}</td><td>{fmt(p.altura)}</td><td className="l">{p.grupo}</td><td className="l">{p.uso}</td><td>{fmt(p.gRev)}</td><td>{fmt(p.q)}</td></tr>)}</tbody>
      </table>
      <h3>Pilares: coordenadas, dimensões e vínculos</h3>
      <table>
        <thead><tr><th>Pilar</th><th>Ponto fixo x / y (m)</th><th>Centro x / y (m)</th><th>Ângulo (°)</th><th>Ponto fixo em</th><th>Nasce</th><th>Morre</th><th>Seções por lance (cm)</th><th>Vínculo / engaste</th></tr></thead>
        <tbody>{g.pilares.map((p) => <tr key={p.id}><td className="l">{p.nome}</td><td>{fmt(p.x, 3)} / {fmt(p.y, 3)}</td><td>{fmt(p.cx, 3)} / {fmt(p.cy, 3)}</td><td>{fmt(p.angulo, 1)}</td><td className="l">{AJUSTE_TXT[p.ajuste] ?? p.ajuste}</td><td className="l">{p.nasce}</td><td className="l">{p.morre}</td><td className="l">{p.secoes.map((s) => `${s.pavimento}: ${s.secao}`).join('; ')}</td><td className="l">{p.vinculo}; {p.engaste}</td></tr>)}</tbody>
      </table>
      {g.paredes.length > 0 && (
        <>
          <h3>Paredes e pilares-parede: coordenadas, espessuras e vínculos</h3>
          <table data-listagem-paredes>
            <thead><tr><th>Elemento</th><th>Tipo / material</th><th>Nasce</th><th>Morre</th><th>Vínculo</th><th>Lado</th><th>Início x / y (m)</th><th>Fim x / y (m)</th><th>L (m)</th><th>Ângulo (°)</th><th>Modelo</th><th>Espessura por lance (cm)</th></tr></thead>
            <tbody>{g.paredes.flatMap((w) => w.lados.map((l, i) => <tr key={`${w.id}-${i}`}><td className="l">{w.nome} ({w.categoria}{w.aberturas ? `, ${w.aberturas} abertura(s)` : ''})</td><td className="l">{w.descricao}</td><td className="l">{w.nasce}</td><td className="l">{w.morre}</td><td className="l">{w.vinculo}</td><td className="l">{l.nome}</td><td>{fmt(l.a[0], 3)} / {fmt(l.a[1], 3)}</td><td>{fmt(l.z[0], 3)} / {fmt(l.z[1], 3)}</td><td>{fmt(l.L, 3)}</td><td>{fmt(l.angulo, 1)}</td><td className="l">{l.modelo}</td><td className="l">{l.espessuras.map((e) => `${e.pavimento} ${fmt(e.t * 100, 1)}`).join(' | ')}</td></tr>))}</tbody>
          </table>
        </>
      )}
      <h3>Lajes: geometria e pesos</h3>
      <table>
        <thead><tr><th>Laje</th><th>Grupo</th><th>Pav.</th><th>Tipo</th><th>Área (m²)</th><th>PP (kN/m²)</th><th>Rev. (kN/m²)</th><th>Var. (kN/m²)</th><th>Peso próprio (kN)</th><th>Permanente (kN)</th><th>Variável (kN)</th></tr></thead>
        <tbody>
          {g.lajes.map((l) => <tr key={l.id}><td className="l">{l.nome}</td><td className="l">{l.grupo}</td><td>{l.pavimentos}</td><td className="l">{l.tipo}</td><td>{fmt(l.area)}</td><td>{fmt(l.ppKNm2)}</td><td>{fmt(l.revKNm2)}</td><td>{fmt(l.qKNm2)}</td><td>{fmt(l.pesoProprio, 1)}</td><td>{fmt(l.permanente, 1)}</td><td>{fmt(l.variavel, 1)}</td></tr>)}
          <tr><td className="l" colSpan={8}><b>Total da obra (com as repetições dos pavimentos)</b></td><td><b>{fmt(g.totais.pesoProprio, 0)}</b></td><td><b>{fmt(g.totais.permanente, 0)}</b></td><td><b>{fmt(g.totais.variavel, 0)}</b></td></tr>
        </tbody>
      </table>
      <p>Peso próprio pelo concreto de 25 kN/m³ (treliçadas: capa, nervuras e EPS); permanente = peso próprio + revestimento do grupo; sem alvenaria nem cargas lineares.</p>
    </div>
  );
}

/** Forças de vento por pavimento e zona, para cada caso (direção e excentricidade). */
export function MemorialVentoPavimentos({ b, analise }: { b: BuildingModel; analise: AnaliseEdificio | null }) {
  const casos = ventoPorPavimento(b, analise);
  if (!casos.length) return null;
  return (
    <div data-memorial-vento-pav>
      <h3>Forças de vento por pavimento</h3>
      <p>Força de vento (NBR 6123) de cada pavimento e zona independente, com a pressão dinâmica q = 0,613·Vk² (N/m²), a largura de fachada e o momento de torção Mz em relação ao ponto de aplicação da zona.</p>
      {casos.map((c) => (
        <table key={c.caso} data-vento-caso={c.caso}>
          <thead><tr><th colSpan={7} className="l">{c.caso} (vento a {c.direcao}°) — resultante {fmt(c.total, 1)} kN</th></tr><tr><th>Pavimento</th><th>Zona</th><th>z (m)</th><th>Largura (m)</th><th>Vk (m/s)</th><th>F (kN)</th><th>Mz (kN·m)</th></tr></thead>
          <tbody>{c.forcas.map((f, i) => <tr key={i}><td className="l">{f.pavimento}</td><td>{f.zona}</td><td>{fmt(f.z)}</td><td>{fmt(f.largura)}</td><td>{fmt(f.vk)}</td><td>{fmt(f.F, 1)}</td><td>{fmt(f.Mz, 1)}</td></tr>)}</tbody>
        </table>
      ))}
    </div>
  );
}

/** Resumo do vento por pavimento e direção (V6e, K1.5.32): força e momento de torção resultantes, sem excentricidade, e a soma na base. */
export function MemorialVentoResumo({ b, analise }: { b: BuildingModel; analise: AnaliseEdificio | null }) {
  if (!analise?.vento) return null;
  const t = tabelaVento(ventoPorPavimentoV5(b, analise));
  if (!t.cabecalho.length) return null;
  return (
    <div data-memorial-vento-resumo={t.linhas.length}>
      <h3>Resumo do vento por pavimento e direção</h3>
      <table>
        <thead>
          <tr><th rowSpan={2}>Pavimento</th>{t.cabecalho.map((c) => <th key={c} colSpan={2}>{c}</th>)}</tr>
          <tr>{t.cabecalho.map((c) => <Fragment key={c}><th>F (kN)</th><th>Mz (kN·m)</th></Fragment>)}</tr>
        </thead>
        <tbody>
          {t.linhas.map((l) => <tr key={l.pavimento}><td className="l">{l.pavimento}</td>{l.valores.map((v, i) => <Fragment key={i}><td>{fmt(v.F, 1)}</td><td>{fmt(v.Mz, 1)}</td></Fragment>)}</tr>)}
          <tr><td className="l"><b>Soma na base</b></td>{t.base.map((v, i) => <Fragment key={i}><td><b>{fmt(v.F, 1)}</b></td><td><b>{fmt(v.Mz, 1)}</b></td></Fragment>)}</tr>
        </tbody>
      </table>
      <p>Somas das zonas de cada pavimento nos casos sem excentricidade; F com o sinal do sentido positivo do eixo da direção (x para 0° e 180°, y para 90° e 270°). As setas por zona aparecem na planta (camada Vento na planta).</p>
    </div>
  );
}

/** Taxa geométrica As/Ac por lance dos pilares. */
export function MemorialTaxasPilares({ b, dim }: { b: BuildingModel; dim: Dimensionamento }) {
  const t = taxasPilares(b, dim);
  if (!t.length) return null;
  return (
    <div data-memorial-taxas>
      <h3>Taxa de armadura dos pilares</h3>
      <table>
        <thead><tr><th>Pilar</th><th>Lance</th><th>Seção (cm)</th><th>As (cm²)</th><th>Ac (cm²)</th><th>As/Ac (%)</th></tr></thead>
        <tbody>{t.map((x) => <tr key={`${x.pilar}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td>{x.secao}</td><td>{fmt(x.As)}</td><td>{fmt(x.Ac, 0)}</td><td>{fmt(x.taxa)}</td></tr>)}</tbody>
      </table>
      <p>Limites da NBR 6118 (17.3.5.3): mínima 0,4 % (ou 0,15·Nd/fyd) e máxima 4 % da seção bruta (8 % só nas emendas).</p>
    </div>
  );
}

/** Quantitativos por pano e por viga, enchimento das treliçadas e índices por m² da obra. */
export function MemorialQuantitativosDetalhados({ b, dim }: { b: BuildingModel; dim: Dimensionamento }) {
  const q = quantitativosDetalhados(b, dim), i = q.indices;
  return (
    <div data-memorial-quant-det>
      <h3>Quantitativos por pano e por viga</h3>
      <table>
        <thead><tr><th>Laje</th><th>Tipo</th><th>Pav.</th><th>Área (m²)</th><th>Concreto (m³)</th><th>Fôrma (m²)</th><th>Enchimento (m² / m³ / peças)</th></tr></thead>
        <tbody>{q.panos.map((p) => <tr key={p.laje}><td className="l">{p.nome}</td><td className="l">{p.tipo}</td><td>{p.pavimentos}</td><td>{fmt(p.area)}</td><td>{fmt(p.volume, 3)}</td><td>{fmt(p.forma)}</td><td>{p.enchimento ? `${fmt(p.enchimento.area)} / ${fmt(p.enchimento.volume, 3)} / ${p.enchimento.pecas}` : '—'}</td></tr>)}</tbody>
      </table>
      <table>
        <thead><tr><th>Viga</th><th>Pav.</th><th>L (m)</th><th>b × h (cm)</th><th>Concreto (m³)</th><th>Fôrma (m²)</th></tr></thead>
        <tbody>{q.vigas.map((v) => <tr key={v.viga}><td className="l">{v.nome}</td><td>{v.pavimentos}</td><td>{fmt(v.L)}</td><td>{Math.round(v.b * 100)}×{Math.round(v.h * 100)}</td><td>{fmt(v.volume, 3)}</td><td>{fmt(v.forma)}</td></tr>)}</tbody>
      </table>
      {q.enchimento.pecas > 0 && <p>Enchimento das lajes treliçadas: {fmt(q.enchimento.area)} m², {fmt(q.enchimento.volume, 2)} m³ e {q.enchimento.pecas} peças de 1,00 m, sem descontar os maciçamentos (a confirmar).</p>}
      <h3>Índices da obra</h3>
      <table data-memorial-indices>
        <thead><tr><th>Área construída (m²)</th><th>Concreto (m³)</th><th>Fôrma (m²)</th><th>Aço (kg)</th><th>kg/m²</th><th>m³/m²</th><th>m²/m²</th><th>kg/m³</th></tr></thead>
        <tbody><tr><td>{fmt(i.area)}</td><td>{fmt(i.concreto)}</td><td>{fmt(i.forma, 1)}</td><td>{fmt(i.aco, 0)}</td><td>{fmt(i.kgPorM2)}</td><td>{fmt(i.m3PorM2, 3)}</td><td>{fmt(i.m2PorM2)}</td><td>{fmt(i.kgPorM3, 1)}</td></tr></tbody>
      </table>
      <p>Área construída = soma das áreas das lajes de todos os pavimentos (com as repetições dos grupos). {i.acoDetalhado ? 'Aço do detalhamento, com perdas.' : 'Aço estimado por taxas.'}</p>
    </div>
  );
}

/** Verificações ELU por combinação: pilares (combinações determinantes) e vigas (extremos da envoltória e faces dos pilares). */
export function MemorialEluPorCombinacao({ dim, h2 }: { dim: Dimensionamento; h2: (c: ReactNode, brk?: boolean) => ReactNode }) {
  return (
    <div data-memorial-elu-comb>
      {h2('Verificações ELU por combinação')}
      <h3>Pilares: combinações determinantes</h3>
      <table>
        <thead><tr><th>Pilar</th><th>Lance</th><th>Combinação</th><th>Nd (kN)</th><th>Mu base / topo (kN·m)</th><th>Mv base / topo (kN·m)</th><th>Md,tot u / v (kN·m)</th></tr></thead>
        <tbody>{dim.pilares.flatMap((x) => (x.determinantes ?? []).map((c, i) => <tr key={`${x.pilar}-${x.pavimento}-${i}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td className="l">{c.combinacao}</td><td>{fmt(c.Nd, 1)}</td><td>{fmt(c.Mu[0], 1)} / {fmt(c.Mu[1], 1)}</td><td>{fmt(c.Mv[0], 1)} / {fmt(c.Mv[1], 1)}</td><td>{fmt(c.MuTot, 1)} / {fmt(c.MvTot, 1)}</td></tr>))}</tbody>
      </table>
      <h3>Vigas: combinação que dá cada extremo</h3>
      <table>
        <thead><tr><th>Viga</th><th>Mmax (kN·m)</th><th>Combinação</th><th>Mmin (kN·m)</th><th>Combinação</th><th>Cortante (kN)</th><th>Combinação</th><th>Torção (kN·m)</th><th>Combinação</th></tr></thead>
        <tbody>{dim.vigas.map((v) => {
          const p = v.envoltoria.pontos, d = v.envoltoria.determinantes;
          return <tr key={v.viga}><td className="l">{v.nome}</td><td>{fmt(Math.max(0, ...p.map((q) => q.Mmax)), 1)}</td><td className="l">{d.Mmax || '—'}</td><td>{fmt(Math.min(0, ...p.map((q) => q.Mmin)), 1)}</td><td className="l">{d.Mmin || '—'}</td><td>{fmt(Math.max(0, ...p.map((q) => Math.max(Math.abs(q.Vmax), Math.abs(q.Vmin)))), 1)}</td><td className="l">{d.V || '—'}</td><td>{fmt(Math.max(0, ...p.map((q) => q.T)), 1)}</td><td className="l">{d.T || '—'}</td></tr>;
        })}</tbody>
      </table>
      <p>Cada linha traz a combinação ELU que dá o extremo; as origens completas (fórmula e item da NBR) estão na janela de resultados de cada elemento.</p>
    </div>
  );
}
