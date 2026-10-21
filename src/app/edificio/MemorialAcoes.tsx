// Memorial do edifício: ações e combinações da frente N2a (descrição e arranjos dos casos, compatibilidade, estados-limite,
// controle de execução e γ por origem, situações do usuário com o alerta, empuxo de terra, equilíbrio global, ábacos de vento).
import { alertasSituacoes, CONTROLE_INFO, ESTADOS_INFO, estadoEmUso, fatoresDaSituacao, GAMA_ORIGEM, textosAlertas } from '../../core/building/acoes';
import { abacoCaPreenchido, abacoVizPreenchido } from '../../core/building/abacosVento';
import { combinacoesDoEstado, combinacoesEdificio } from '../../core/building/combinacoes';
import { diagramaEmpuxo, kDoTipo } from '../../core/building/empuxo';
import type { AnaliseEdificio } from '../../core/building/analitico';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { gamas } from '../../core/building/materiais';
import { casosDaObra, cotaFundacao, relacaoEfetiva, type BuildingModel } from '../../core/building/types';
import { svgEmpuxo } from './empuxoFig';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const TIPO = { normal: 'normal', especial: 'construção / especial', excepcional: 'excepcional' } as const;

export function MemorialAcoes({ b, analise, dim }: { b: BuildingModel; analise: AnaliseEdificio | null; dim: Dimensionamento | null }) {
  const casos = casosDaObra(b), adicionais = b.casos ?? [];
  const nome = (id: string) => casos.find((c) => c.id === id)?.nome ?? adicionais.find((c) => c.id === id)?.nome ?? id;
  const normativas = analise ? combinacoesEdificio(b, analise) : [];
  const g = gamas(b);
  const comDescricao = adicionais.filter((c) => c.descricao);
  const pais = adicionais.filter((c) => adicionais.some((x) => x.pai === c.id));
  const incompat = casos.filter((c) => c.natureza === 'Q' || c.natureza === 'W').flatMap((a, i, l) => l.slice(i + 1).filter((z) => z.natureza === a.natureza).map((z) => ({ a, z, rel: relacaoEfetiva(casos, a.id, z.id) }))).filter((x) => x.rel !== 'compativel');
  const naoCombinam = Object.entries(b.norma.combinarAdicionais ?? {}).filter(([, v]) => v === false).map(([n]) => n);
  const alertas = alertasSituacoes(b, normativas);
  const v = b.vento, ab = v?.abacos;
  const empuxos = b.empuxos ?? [];
  const eq = dim?.equilibrio ?? [];
  return (
    <>
      <h3>Categorias de uso, arranjos e compatibilidade</h3>
      <p>Carga variável por categoria de uso (NBR 6120): {b.grupos.filter((x) => b.pavimentos.some((p) => p.grupo === x.id)).map((x) => `${x.nome} ${fmt(x.q, 1)} kN/m²`).join('; ')}. Cada categoria com caso próprio (Q, QB, QC) combina com as demais como ação variável distinta, com o ψ da sua classe (NBR 6118, Tabela 11.2).</p>
      {comDescricao.length > 0 && <ul>{comDescricao.map((c) => <li key={c.id}><b>{c.nome}</b>: {c.descricao}.</li>)}</ul>}
      {pais.length > 0 && (
        <table>
          <thead><tr><th className="l">Caso-pai</th><th className="l">Arranjos (incompatíveis entre si)</th></tr></thead>
          <tbody>{pais.map((p) => <tr key={p.id}><td className="l">{p.nome}</td><td className="l">{adicionais.filter((x) => x.pai === p.id).map((x) => x.nome).join('; ')}</td></tr>)}</tbody>
        </table>
      )}
      {incompat.length > 0 && <p>Compatibilidade entre casos (diferente de “compatível”): {incompat.map((x) => `${x.a.nome} × ${x.z.nome}: ${x.rel === 'simultaneo' ? 'simultâneos' : 'incompatíveis'}`).join('; ')}.</p>}
      {naoCombinam.length > 0 && <p>Casos adicionais de natureza {naoCombinam.join(', ')} não se combinam entre si (mutuamente excludentes).</p>}

      <h3>Estados-limite e coeficientes</h3>
      <table>
        <thead><tr><th className="l">Grupo de combinações</th><th>Ativo</th><th>Modo</th><th>Combinações</th><th className="l">Fonte</th></tr></thead>
        <tbody>{ESTADOS_INFO.map((e) => { const c = estadoEmUso(b, e.id); return <tr key={e.id}><td className="l">{e.rotulo}</td><td className={c.ativo ? undefined : 'warn'}>{c.ativo ? 'sim' : 'não'}</td><td>{c.modo === 'usuario' ? 'usuário' : 'norma'}</td><td>{!e.lista ? '—' : analise ? combinacoesDoEstado(b, analise, e.id, normativas).length : '—'}</td><td className="l">{e.fonte}</td></tr>; })}</tbody>
      </table>
      <p>Controle de execução: <b>{CONTROLE_INFO[b.norma.controle ?? 'normal'].rotulo}</b> (γc padrão {fmt(CONTROLE_INFO[b.norma.controle ?? 'normal'].gamaC)}; em uso {fmt(g.c)}) — {CONTROLE_INFO[b.norma.controle ?? 'normal'].fonte}. γs {fmt(g.s)}, γg {fmt(g.g)}, γq {fmt(g.q)}, γh (empuxo) {fmt(g.h)}.</p>
      <table>
        <thead><tr><th className="l">γ por origem da ação (desfavorável / favorável)</th><th>Normal</th><th>Construção / especial</th><th>Excepcional</th><th className="l">Fonte</th></tr></thead>
        <tbody>{GAMA_ORIGEM.map((l) => <tr key={l.id}><td className="l">{l.origem}</td>{[l.normal, l.especial, l.excepcional].map((p, i) => <td key={i}>{fmt(p[0])} / {fmt(p[1])}</td>)}<td className="l">{l.fonte}{l.aConfirmar ? '; a confirmar' : ''}</td></tr>)}</tbody>
      </table>

      {(b.situacoes?.length ?? 0) > 0 && (
        <>
          <h3>Situações de projeto do usuário</h3>
          {ESTADOS_INFO.filter((e) => b.situacoes!.some((s) => s.estado === e.id)).map((e) => {
            const sits = b.situacoes!.filter((s) => s.estado === e.id), cols = [...new Set(sits.flatMap((s) => Object.keys(fatoresDaSituacao(s))))];
            return (
              <div key={e.id}>
                <p>{e.rotulo}: {estadoEmUso(b, e.id).modo === 'usuario' ? 'situações do usuário em uso' : 'situações cadastradas, mas o grupo está no modo norma (não usadas)'}.</p>
                <table>
                  <thead><tr><th className="l">Situação</th><th className="l">Tipo</th><th className="l">Definição</th>{cols.map((c) => <th key={c}>{nome(c)}</th>)}</tr></thead>
                  <tbody>{sits.map((s) => { const f = fatoresDaSituacao(s); return <tr key={s.id}><td className="l">{s.nome}</td><td className="l">{TIPO[s.situacao]}</td><td className="l">{s.modo === 'gamapsi' ? 'γ · ψ' : 'fator final'}</td>{cols.map((c) => <td key={c}>{f[c] ? fmt(f[c], 3) : '—'}</td>)}</tr>; })}</tbody>
                </table>
              </div>
            );
          })}
          {textosAlertas(b, alertas).map((t, i) => <p key={i} className="warn">{t}</p>)}
        </>
      )}

      {empuxos.length > 0 && (
        <>
          <h3>Empuxo de terra</h3>
          {empuxos.map((t) => {
            const topo = t.cotaAterro, base = Math.min(cotaFundacao(b), topo - 1), d = diagramaEmpuxo(t, topo, base);
            return (
              <div key={t.id}>
                <p><b>{t.nome}</b> — método {t.metodo === 'repouso' ? 'de repouso (K0 = 1 − sen φ)' : t.metodo === 'rankine' ? 'ativo de Rankine' : 'ativo de Coulomb'}; aterro na cota {fmt(t.cotaAterro)} m{t.nivelAgua !== undefined ? `; nível d'água na cota ${fmt(t.nivelAgua)} m${t.alivio ? ` com alívio de ${fmt(t.alivio, 0)} % por drenagem` : ''}` : ''}{t.sobrecarga ? `; sobrecarga ${fmt(t.sobrecarga)} kN/m²` : ''}{t.talude ? `; talude β = ${fmt(t.talude, 1)}°` : ''}. Casos H que o usam: {adicionais.filter((c) => c.empuxo === t.id).map((c) => c.nome).join(', ') || 'nenhum'}.</p>
                <table>
                  <thead><tr><th>Estrato</th><th>Espessura (m)</th><th>γ (kN/m³)</th><th>γ submerso</th><th>φ (°)</th><th>K</th></tr></thead>
                  <tbody>{t.estratos.map((e, i) => { const k = kDoTipo(t, e.phi); return <tr key={i}><td>{i + 1}</td><td>{fmt(e.espessura)}</td><td>{fmt(e.gama, 1)}</td><td>{fmt(e.gamaSub ?? e.gama - 10, 1)}</td><td>{fmt(e.phi, 1)}</td><td>{k === null ? '—' : fmt(k, 3)}</td></tr>; })}</tbody>
                </table>
                <figure><div dangerouslySetInnerHTML={{ __html: svgEmpuxo(t, topo, base, 'papel') }} /><figcaption>Pressões horizontais de {t.nome} entre as cotas {fmt(topo)} e {fmt(base)} m: resultante {fmt(d.resultante)} kN/m na cota {fmt(d.cotaResultante)} m.</figcaption></figure>
              </div>
            );
          })}
        </>
      )}

      {eq.length > 0 && (
        <>
          <h3>Equilíbrio global (tombamento)</h3>
          <table>
            <thead><tr><th>Vento</th><th>Momento estabilizante (kN·m)</th><th>Momento instabilizante (kN·m)</th><th>Mest / Minst</th><th>Situação</th></tr></thead>
            <tbody>{eq.map((e) => <tr key={e.direcao}><td>{e.direcao}°</td><td>{fmt(e.Mest, 0)}</td><td>{fmt(e.Minst, 0)}</td><td>{Number.isFinite(e.FS) ? fmt(e.FS) : '∞'}</td><td className={e.ok ? undefined : 'warn'}>{e.ok ? 'atende' : 'NÃO ATENDE'}</td></tr>)}</tbody>
          </table>
          <p>Permanentes minoradas por {fmt(analise?.opcoes.equGamaFav ?? 0.9)} e vento majorado por {fmt(analise?.opcoes.equGamaVento ?? 1.4)} (NBR 8681; valores a confirmar), em relação à aresta de sotavento da base. Carga permanente total {fmt(eq[0].W, 0)} kN. Não considera a profundidade da fundação, o solo sobre as sapatas nem o empuxo.</p>
        </>
      )}

      {v && (v.caAuto || v.vizAuto || ab || v.platibanda) && (
        <>
          <h3>Ábacos de vento</h3>
          <p>
            {v.caAuto ? `Ca pelo ábaco de ${v.caAuto === 1 ? 'baixa' : 'alta'} turbulência${abacoCaPreenchido(ab, v.caAuto === 1 ? 1 : 2) ? '' : ' (tabela vazia: vale o Ca informado)'}` : 'Ca informado'}
            {analise?.vento?.ca ? ` — em uso: X ${fmt(analise.vento.ca.x)}, Y ${fmt(analise.vento.ca.y)}` : ''}.
            {' '}{v.vizAuto ? `Fator de vizinhança pelo ábaco para d = ${fmt(v.vizDist ?? 0)} m${abacoVizPreenchido(ab) ? '' : ' (tabela vazia: vale o informado)'}` : `Fator de vizinhança informado (${fmt(v.vizinhanca ?? 1)})`}.
            {v.platibanda ? ` Platibanda de ${fmt(v.platibanda)} m: largura corrigida b′ = b·(2a + h)/h na meia faixa do último pavimento.` : ''}
            {' '}Tabelas de pontos digitadas pelo usuário a partir das figuras da NBR 6123 (a confirmar); interpolação linear.
          </p>
        </>
      )}
      {dim?.avisosAcoes?.map((a, i) => <p key={i} className="warn">{a}</p>)}
    </>
  );
}
